import { defineStore } from 'pinia'
import { ref } from 'vue'
import { io } from 'socket.io-client'
import { useEditorStore } from './editor'
import { useFileSystemStore } from './fileSystem'

export const useCollaborationStore = defineStore('collaboration', () => {
  // State
  const socket = ref(null)
  const isConnected = ref(false)
  const inCollabSession = ref(false)
  const roomCode = ref('')
  const participants = ref([])
  const isHost = ref(false)
  const userName = ref('Guest')
  const showRoomCodeDisplay = ref(true)
  const showParticipantsPanel = ref(true)
  const remoteCursors = ref({})

  // Actions
  function initializeSocket() {
    if (socket.value) return

    socket.value = io(window.location.origin, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    })

    socket.value.on('connect', () => {
      isConnected.value = true
      console.log('Socket connected')
    })

    socket.value.on('disconnect', () => {
      isConnected.value = false
      console.log('Socket disconnected')
    })

    socket.value.on('participant-joined', (participant) => {
      participants.value.push(participant)
    })

    socket.value.on('participant-left', (data) => {
      participants.value = participants.value.filter(p => p.id !== data.userId)
      delete remoteCursors.value[data.userId]
    })

    socket.value.on('code-update', (data) => {
      if (!inCollabSession.value) return

      console.log('Received code update:', data.editorType, 'from user:', data.userId)

      // Update the editor store with the received code
      const editorStore = useEditorStore()
      editorStore.setCode(data.editorType, data.content)

      // The Preview.vue watcher will automatically trigger runCode() after 1 second
    })

    socket.value.on('cursor-update', (data) => {
      remoteCursors.value[data.userId] = data
    })

    socket.value.on('new-host', (data) => {
      if (socket.value.id === data.hostId) {
        isHost.value = true
      }
    })

    // File operation events
    socket.value.on('file-created', (data) => {
      if (!inCollabSession.value) return
      console.log('File created by remote user:', data.path)

      const fsStore = useFileSystemStore()
      try {
        // skipBroadcast=true to prevent infinite loops
        fsStore.createFile(data.path, data.content || '', data.binary || false, true)
      } catch (error) {
        console.error('Failed to create remote file:', error)
      }
    })

    socket.value.on('file-updated', (data) => {
      if (!inCollabSession.value) return
      console.log('File updated by remote user:', data.path)

      const fsStore = useFileSystemStore()
      try {
        // skipBroadcast=true to prevent infinite loops
        fsStore.updateFile(data.path, data.content, true)
      } catch (error) {
        console.error('Failed to update remote file:', error)
      }
    })

    socket.value.on('file-deleted', (data) => {
      if (!inCollabSession.value) return
      console.log('File deleted by remote user:', data.path)

      const fsStore = useFileSystemStore()
      try {
        // skipBroadcast=true to prevent infinite loops
        fsStore.deleteItem(data.path, true)
      } catch (error) {
        console.error('Failed to delete remote file:', error)
      }
    })

    socket.value.on('file-renamed', (data) => {
      if (!inCollabSession.value) return
      console.log('File renamed by remote user:', data.oldPath, '->', data.newPath)

      const fsStore = useFileSystemStore()
      try {
        // skipBroadcast=true to prevent infinite loops
        fsStore.renameItem(data.oldPath, data.newPath, true)
      } catch (error) {
        console.error('Failed to rename remote file:', error)
      }
    })

    socket.value.on('directory-created', (data) => {
      if (!inCollabSession.value) return
      console.log('Directory created by remote user:', data.path)

      const fsStore = useFileSystemStore()
      try {
        // skipBroadcast=true to prevent infinite loops
        fsStore.createDirectory(data.path, true)
      } catch (error) {
        console.error('Failed to create remote directory:', error)
      }
    })

    socket.value.on('file-tree-sync', (data) => {
      if (!inCollabSession.value) return
      console.log('File tree synced from remote')

      const fsStore = useFileSystemStore()
      try {
        // Deep clone to trigger reactivity
        fsStore.fileTree = JSON.parse(JSON.stringify(data.fileTree))

        // Sync preview file selections if provided
        if (data.previewHtmlFile) {
          fsStore.previewHtmlFile = data.previewHtmlFile
        }
        if (data.previewCssFile) {
          fsStore.previewCssFile = data.previewCssFile
        }
        if (data.previewJsFile) {
          fsStore.previewJsFile = data.previewJsFile
        }

        // Validate active file path still exists
        const files = fsStore.getAllFiles()
        if (!files.includes(fsStore.activeFilePath)) {
          // Active file was deleted, switch to first available
          fsStore.activeFilePath = files[0] || null
        }

        // Force re-sync with editor
        fsStore.syncWithEditorStore()

        // Force Vue to re-render the file tree
        fsStore.expandedDirs = new Set(fsStore.expandedDirs)
      } catch (error) {
        console.error('Failed to sync file tree:', error)
      }
    })

    socket.value.on('file-operation', (data) => {
      if (!inCollabSession.value) return

      if (data.operation === 'active-file-changed') {
        console.log('Remote user switched to file:', data.data.path)
        // Optional: You could show a notification here
        // For now, just log it - you could add UI indicators later
      }
    })
  }

  function createRoom(currentState) {
    if (!socket.value) initializeSocket()

    const fsStore = useFileSystemStore()
    const stateToSend = currentState || {
      html: '',
      css: '',
      js: '',
      fileTree: fsStore.fileTree,
      activeFilePath: fsStore.activeFilePath,
      previewHtmlFile: fsStore.previewHtmlFile,
      previewCssFile: fsStore.previewCssFile,
      previewJsFile: fsStore.previewJsFile
    }

    return new Promise((resolve) => {
      socket.value.emit('create-room', {
        name: userName.value,
        state: stateToSend
      }, (response) => {
        if (response.success) {
          roomCode.value = response.roomCode
          participants.value = [{ ...response.participant, isHost: true }]
          inCollabSession.value = true
          isHost.value = true
          showRoomCodeDisplay.value = true
          showParticipantsPanel.value = true
        }
        resolve(response)
      })
    })
  }

  function joinRoom(code) {
    if (!socket.value) initializeSocket()

    return new Promise((resolve) => {
      socket.value.emit('join-room', { roomCode: code, name: userName.value }, (response) => {
        if (response.success) {
          roomCode.value = code
          participants.value = response.participants.map(p => ({
            ...p,
            isHost: false
          }))
          inCollabSession.value = true
          isHost.value = false
          showRoomCodeDisplay.value = true
          showParticipantsPanel.value = true

          // Load room state (current code and file tree)
          if (response.state) {
            const editorStore = useEditorStore()
            const fsStore = useFileSystemStore()

            // Load file tree if available
            if (response.state.fileTree) {
              fsStore.fileTree = JSON.parse(JSON.stringify(response.state.fileTree))
              fsStore.activeFilePath = response.state.activeFilePath || '/index.html'

              // Sync preview file selections from host
              if (response.state.previewHtmlFile) {
                fsStore.previewHtmlFile = response.state.previewHtmlFile
              }
              if (response.state.previewCssFile) {
                fsStore.previewCssFile = response.state.previewCssFile
              }
              if (response.state.previewJsFile) {
                fsStore.previewJsFile = response.state.previewJsFile
              }

              fsStore.syncWithEditorStore()
            } else {
              // Legacy format
              editorStore.setCode('html', response.state.html || '')
              editorStore.setCode('css', response.state.css || '')
              editorStore.setCode('js', response.state.js || '')
            }
            // The Preview.vue watcher will automatically trigger runCode()
          }
        } else {
          resolve({ success: false, error: response.message })
        }
        resolve(response)
      })
    })
  }

  function leaveRoom() {
    if (socket.value && inCollabSession.value) {
      socket.value.emit('leave-room', roomCode.value)
      inCollabSession.value = false
      roomCode.value = ''
      participants.value = []
      isHost.value = false
      remoteCursors.value = {}
    }
  }

  function emitCodeChange(type, code) {
    if (socket.value && inCollabSession.value) {
      socket.value.emit('code-change', {
        roomCode: roomCode.value,
        editorType: type,
        content: code
      })
    }
  }

  function emitCursorMove(type, position) {
    if (socket.value && inCollabSession.value) {
      socket.value.emit('cursor-move', {
        roomCode: roomCode.value,
        editorType: type,
        position: position
      })
    }
  }

  // File operation emitters
  function emitFileCreated(path, content = '', binary = false) {
    if (socket.value && inCollabSession.value) {
      socket.value.emit('file-operation', {
        roomCode: roomCode.value,
        operation: 'file-created',
        data: { path, content, binary }
      })
    }
  }

  function emitFileUpdated(path, content) {
    if (socket.value && inCollabSession.value) {
      socket.value.emit('file-operation', {
        roomCode: roomCode.value,
        operation: 'file-updated',
        data: { path, content }
      })
    }
  }

  function emitFileDeleted(path) {
    if (socket.value && inCollabSession.value) {
      socket.value.emit('file-operation', {
        roomCode: roomCode.value,
        operation: 'file-deleted',
        data: { path }
      })
    }
  }

  function emitFileRenamed(oldPath, newPath) {
    if (socket.value && inCollabSession.value) {
      socket.value.emit('file-operation', {
        roomCode: roomCode.value,
        operation: 'file-renamed',
        data: { oldPath, newPath }
      })
    }
  }

  function emitDirectoryCreated(path) {
    if (socket.value && inCollabSession.value) {
      socket.value.emit('file-operation', {
        roomCode: roomCode.value,
        operation: 'directory-created',
        data: { path }
      })
    }
  }

  function emitFileTreeSync() {
    if (socket.value && inCollabSession.value) {
      const fsStore = useFileSystemStore()
      socket.value.emit('file-operation', {
        roomCode: roomCode.value,
        operation: 'file-tree-sync',
        data: {
          fileTree: fsStore.fileTree,
          previewHtmlFile: fsStore.previewHtmlFile,
          previewCssFile: fsStore.previewCssFile,
          previewJsFile: fsStore.previewJsFile
        }
      })
    }
  }

  function hideRoomCode() {
    showRoomCodeDisplay.value = false
    showParticipantsPanel.value = false
  }

  function showRoomCode() {
    showRoomCodeDisplay.value = true
    showParticipantsPanel.value = true
  }

  return {
    socket,
    isConnected,
    inCollabSession,
    roomCode,
    participants,
    isHost,
    userName,
    showRoomCodeDisplay,
    showParticipantsPanel,
    remoteCursors,
    initializeSocket,
    createRoom,
    joinRoom,
    leaveRoom,
    emitCodeChange,
    emitCursorMove,
    emitFileCreated,
    emitFileUpdated,
    emitFileDeleted,
    emitFileRenamed,
    emitDirectoryCreated,
    emitFileTreeSync,
    hideRoomCode,
    showRoomCode
  }
})
