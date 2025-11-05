import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useEditorStore } from './editor'
import { useCollaborationStore } from './collaboration'

export const useFileSystemStore = defineStore('fileSystem', () => {
  // Get collaboration store (lazy initialization to avoid circular dependencies)
  let collabStore = null
  function getCollabStore() {
    if (!collabStore) {
      collabStore = useCollaborationStore()
    }
    return collabStore
  }

  // Virtual file tree structure
  const fileTree = ref({
    type: 'directory',
    children: {
      'index.html': {
        type: 'file',
        content: '',
        binary: false,
        modified: false
      },
      'styles.css': {
        type: 'file',
        content: '',
        binary: false,
        modified: false
      },
      'script.js': {
        type: 'file',
        content: '',
        binary: false,
        modified: false
      }
    }
  })

  // Active file tracking
  const activeFilePath = ref('/index.html')

  // Preview file tracking
  const previewHtmlFile = ref('/index.html')
  const previewCssFile = ref('/styles.css')
  const previewJsFile = ref('/script.js')

  // Expanded directories tracking
  const expandedDirs = ref(new Set(['/']))

  // Computed: Get active file content
  const activeFileContent = computed(() => {
    const file = getFile(activeFilePath.value)
    return file ? file.content : ''
  })

  // Computed: Get active file name
  const activeFileName = computed(() => {
    if (!activeFilePath.value) return ''
    return activeFilePath.value.split('/').pop()
  })

  // Computed: Get file extension
  const activeFileExtension = computed(() => {
    const name = activeFileName.value
    return name.includes('.') ? name.split('.').pop().toLowerCase() : ''
  })

  // Computed: Get preview file contents
  const previewHtmlContent = computed(() => {
    const file = getFile(previewHtmlFile.value)
    return file ? file.content : ''
  })

  const previewCssContent = computed(() => {
    const file = getFile(previewCssFile.value)
    return file ? file.content : ''
  })

  const previewJsContent = computed(() => {
    const file = getFile(previewJsFile.value)
    return file ? file.content : ''
  })

  // Watch for active file changes and broadcast to collaborators
  watch(activeFilePath, (newPath, oldPath) => {
    const collab = getCollabStore()
    if (collab.inCollabSession && newPath !== oldPath) {
      // Broadcast active file change
      if (collab.socket) {
        collab.socket.emit('file-operation', {
          roomCode: collab.roomCode,
          operation: 'active-file-changed',
          data: { path: newPath }
        })
      }
    }
  })

  // Helper: Navigate to file in tree
  function getFile(path) {
    if (!path || path === '/') return null

    const parts = path.split('/').filter(p => p)
    let current = fileTree.value

    for (let i = 0; i < parts.length; i++) {
      if (!current.children || !current.children[parts[i]]) {
        return null
      }
      current = current.children[parts[i]]
    }

    return current.type === 'file' ? current : null
  }

  // Helper: Navigate to directory in tree
  function getDirectory(path) {
    if (path === '/') return fileTree.value

    const parts = path.split('/').filter(p => p)
    let current = fileTree.value

    for (let i = 0; i < parts.length; i++) {
      if (!current.children || !current.children[parts[i]]) {
        return null
      }
      current = current.children[parts[i]]
    }

    return current.type === 'directory' ? current : null
  }

  // Helper: Get parent directory path
  function getParentPath(path) {
    const parts = path.split('/').filter(p => p)
    if (parts.length <= 1) return '/'
    parts.pop()
    return '/' + parts.join('/')
  }

  // Helper: Get item name from path
  function getItemName(path) {
    const parts = path.split('/').filter(p => p)
    return parts[parts.length - 1] || ''
  }

  // Create a new file
  function createFile(path, content = '', binary = false, skipBroadcast = false) {
    const parentPath = getParentPath(path)
    const fileName = getItemName(path)
    const parent = getDirectory(parentPath)

    if (!parent) {
      throw new Error('Parent directory does not exist')
    }

    if (parent.children[fileName]) {
      throw new Error('File already exists')
    }

    parent.children[fileName] = {
      type: 'file',
      content,
      binary,
      modified: false
    }

    // Broadcast to collaborators (unless this came from a remote event)
    if (!skipBroadcast) {
      const collab = getCollabStore()
      if (collab.inCollabSession) {
        collab.emitFileCreated(path, content, binary)
      }
    }
  }

  // Create a new directory
  function createDirectory(path, skipBroadcast = false) {
    const parentPath = getParentPath(path)
    const dirName = getItemName(path)
    const parent = getDirectory(parentPath)

    if (!parent) {
      throw new Error('Parent directory does not exist')
    }

    if (parent.children[dirName]) {
      throw new Error('Directory already exists')
    }

    parent.children[dirName] = {
      type: 'directory',
      children: {}
    }

    // Auto-expand the parent directory
    expandedDirs.value.add(parentPath)

    // Broadcast to collaborators (unless this came from a remote event)
    if (!skipBroadcast) {
      const collab = getCollabStore()
      if (collab.inCollabSession) {
        collab.emitDirectoryCreated(path)
      }
    }
  }

  // Update file content
  function updateFile(path, content, skipBroadcast = false) {
    const file = getFile(path)
    if (!file) {
      throw new Error('File not found')
    }

    file.content = content
    file.modified = true

    // Broadcast to collaborators (unless this came from a remote event)
    if (!skipBroadcast) {
      const collab = getCollabStore()
      if (collab.inCollabSession) {
        collab.emitFileUpdated(path, content)
      }
    }
  }

  // Update active file content
  function updateActiveFile(content) {
    if (activeFilePath.value) {
      updateFile(activeFilePath.value, content)
      // Sync with legacy editor store for preview compatibility
      syncWithEditorStore()
    }
  }

  // Sync specific files with the legacy editor store (for preview and backward compatibility)
  function syncWithEditorStore() {
    const editorStore = useEditorStore()

    const htmlFile = getFile(previewHtmlFile.value)
    const cssFile = getFile(previewCssFile.value)
    const jsFile = getFile(previewJsFile.value)

    if (htmlFile !== null) editorStore.setCode('html', htmlFile.content)
    if (cssFile !== null) editorStore.setCode('css', cssFile.content)
    if (jsFile !== null) editorStore.setCode('js', jsFile.content)
  }

  // Set preview files
  function setPreviewHtmlFile(path, skipBroadcast = false) {
    previewHtmlFile.value = path
    syncWithEditorStore()

    // Emit to collaborators
    if (!skipBroadcast) {
      const collab = getCollabStore()
      if (collab && collab.inCollabSession) {
        collab.emitFileTreeSync()
      }
    }
  }

  function setPreviewCssFile(path, skipBroadcast = false) {
    previewCssFile.value = path
    syncWithEditorStore()

    // Emit to collaborators
    if (!skipBroadcast) {
      const collab = getCollabStore()
      if (collab && collab.inCollabSession) {
        collab.emitFileTreeSync()
      }
    }
  }

  function setPreviewJsFile(path, skipBroadcast = false) {
    previewJsFile.value = path
    syncWithEditorStore()

    // Emit to collaborators
    if (!skipBroadcast) {
      const collab = getCollabStore()
      if (collab && collab.inCollabSession) {
        collab.emitFileTreeSync()
      }
    }
  }

  // Delete file or directory
  function deleteItem(path, skipBroadcast = false) {
    const parentPath = getParentPath(path)
    const itemName = getItemName(path)
    const parent = getDirectory(parentPath)

    if (!parent || !parent.children[itemName]) {
      throw new Error('Item not found')
    }

    // If deleting active file, switch to another file
    if (path === activeFilePath.value) {
      // Find another file to switch to
      const files = getAllFiles()
      const otherFile = files.find(f => f !== path)
      activeFilePath.value = otherFile || null
    }

    delete parent.children[itemName]

    // Broadcast to collaborators (unless this came from a remote event)
    if (!skipBroadcast) {
      const collab = getCollabStore()
      if (collab.inCollabSession) {
        collab.emitFileDeleted(path)
      }
    }
  }

  // Rename file or directory
  function renameItem(oldPath, newPath, skipBroadcast = false) {
    const parentPath = getParentPath(oldPath)
    const oldName = getItemName(oldPath)
    const newName = getItemName(newPath)
    const parent = getDirectory(parentPath)

    if (!parent || !parent.children[oldName]) {
      throw new Error('Item not found')
    }

    if (parent.children[newName]) {
      throw new Error('An item with that name already exists')
    }

    // Move the item
    parent.children[newName] = parent.children[oldName]
    delete parent.children[oldName]

    // Update active file path if needed
    if (activeFilePath.value === oldPath) {
      activeFilePath.value = newPath
    }

    // Broadcast to collaborators (unless this came from a remote event)
    if (!skipBroadcast) {
      const collab = getCollabStore()
      if (collab.inCollabSession) {
        collab.emitFileRenamed(oldPath, newPath)
      }
    }
  }

  // Move file or directory to a new parent
  function moveItem(oldPath, newPath, skipBroadcast = false) {
    const item = getFile(oldPath) || getDirectory(oldPath)
    if (!item) {
      throw new Error('Item not found')
    }

    const oldParentPath = getParentPath(oldPath)
    const oldName = getItemName(oldPath)
    const oldParent = getDirectory(oldParentPath)

    const newParentPath = getParentPath(newPath)
    const newName = getItemName(newPath)
    const newParent = getDirectory(newParentPath)

    if (!oldParent) {
      throw new Error('Source parent not found')
    }

    if (!newParent) {
      throw new Error('Destination not found')
    }

    if (newParent.children[newName]) {
      throw new Error('An item with that name already exists in the destination')
    }

    // Copy item to new location (deep clone)
    newParent.children[newName] = JSON.parse(JSON.stringify(item))

    // Remove from old location
    delete oldParent.children[oldName]

    // Update active file path if needed (handle both files and moved folders)
    if (activeFilePath.value === oldPath) {
      activeFilePath.value = newPath
    } else if (activeFilePath.value.startsWith(oldPath + '/')) {
      // Update paths of files inside moved folders
      activeFilePath.value = activeFilePath.value.replace(oldPath, newPath)
    }

    // Broadcast to collaborators (unless this came from a remote event)
    if (!skipBroadcast) {
      const collab = getCollabStore()
      if (collab.inCollabSession) {
        collab.emitFileRenamed(oldPath, newPath)
      }
    }
  }

  // Get all file paths (recursive)
  function getAllFiles(dirPath = '/', dir = fileTree.value) {
    const files = []

    if (dir.children) {
      for (const [name, item] of Object.entries(dir.children)) {
        const itemPath = dirPath === '/' ? `/${name}` : `${dirPath}/${name}`
        if (item.type === 'file') {
          files.push(itemPath)
        } else if (item.type === 'directory') {
          files.push(...getAllFiles(itemPath, item))
        }
      }
    }

    return files
  }

  // Check if file is modified
  function isFileModified(path) {
    const file = getFile(path)
    return file ? file.modified : false
  }

  // Mark file as saved (not modified)
  function markFileSaved(path) {
    const file = getFile(path)
    if (file) {
      file.modified = false
    }
  }

  // Toggle directory expansion
  function toggleDirectory(path) {
    if (expandedDirs.value.has(path)) {
      expandedDirs.value.delete(path)
    } else {
      expandedDirs.value.add(path)
    }
  }

  // Check if directory is expanded
  function isDirectoryExpanded(path) {
    return expandedDirs.value.has(path)
  }

  // Collapse all directories
  function collapseAll() {
    expandedDirs.value.clear()
    expandedDirs.value.add('/') // Keep root expanded
  }

  // Reset file system
  function resetFileSystem() {
    fileTree.value = {
      type: 'directory',
      children: {
        'index.html': {
          type: 'file',
          content: '',
          binary: false,
          modified: false
        },
        'styles.css': {
          type: 'file',
          content: '',
          binary: false,
          modified: false
        },
        'script.js': {
          type: 'file',
          content: '',
          binary: false,
          modified: false
        }
      }
    }
    activeFilePath.value = '/index.html'
    expandedDirs.value = new Set(['/'])
  }

  // Auto-detect preview files based on common naming conventions
  function autoDetectPreviewFiles() {
    const allFiles = getAllFiles()

    // Find HTML file (prefer index.html, main.html, or first .html)
    const htmlFiles = allFiles.filter(path => path.endsWith('.html') || path.endsWith('.htm'))
    if (htmlFiles.length > 0) {
      const indexFile = htmlFiles.find(p => p.includes('index.html'))
      const mainFile = htmlFiles.find(p => p.includes('main.html'))
      previewHtmlFile.value = indexFile || mainFile || htmlFiles[0]
    }

    // Find CSS file (prefer styles.css, style.css, main.css, or first .css)
    const cssFiles = allFiles.filter(path =>
      path.endsWith('.css') || path.endsWith('.scss')
    )
    if (cssFiles.length > 0) {
      const stylesFile = cssFiles.find(p => p.includes('styles.css') || p.includes('style.css'))
      const mainFile = cssFiles.find(p => p.includes('main.css'))
      previewCssFile.value = stylesFile || mainFile || cssFiles[0]
    }

    // Find JS file (prefer script.js, main.js, app.js, or first .js)
    const jsFiles = allFiles.filter(path =>
      path.endsWith('.js') && !path.includes('node_modules')
    )
    if (jsFiles.length > 0) {
      const scriptFile = jsFiles.find(p => p.includes('script.js'))
      const mainFile = jsFiles.find(p => p.includes('main.js'))
      const appFile = jsFiles.find(p => p.includes('app.js'))
      previewJsFile.value = scriptFile || mainFile || appFile || jsFiles[0]
    }

    // Sync after detection
    syncWithEditorStore()
  }

  return {
    // State
    fileTree,
    activeFilePath,
    expandedDirs,
    previewHtmlFile,
    previewCssFile,
    previewJsFile,

    // Computed
    activeFileContent,
    activeFileName,
    activeFileExtension,
    previewHtmlContent,
    previewCssContent,
    previewJsContent,

    // Actions
    getFile,
    getDirectory,
    createFile,
    createDirectory,
    updateFile,
    updateActiveFile,
    deleteItem,
    renameItem,
    moveItem,
    getAllFiles,
    isFileModified,
    markFileSaved,
    toggleDirectory,
    isDirectoryExpanded,
    collapseAll,
    resetFileSystem,
    syncWithEditorStore,
    setPreviewHtmlFile,
    setPreviewCssFile,
    setPreviewJsFile,
    autoDetectPreviewFiles
  }
})
