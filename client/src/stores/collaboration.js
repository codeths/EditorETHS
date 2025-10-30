import { defineStore } from 'pinia'
import { ref } from 'vue'
import { io } from 'socket.io-client'

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
      // Will be handled by editor store
    })

    socket.value.on('cursor-update', (data) => {
      remoteCursors.value[data.userId] = data
    })

    socket.value.on('new-host', (data) => {
      if (socket.value.id === data.hostId) {
        isHost.value = true
      }
    })
  }

  function createRoom() {
    if (!socket.value) initializeSocket()

    return new Promise((resolve) => {
      socket.value.emit('create-room', { name: userName.value }, (response) => {
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
    hideRoomCode,
    showRoomCode
  }
})
