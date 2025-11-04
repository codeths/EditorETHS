import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useEditorStore } from './editor'

export const useFileSystemStore = defineStore('fileSystem', () => {
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
  function createFile(path, content = '', binary = false) {
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
  }

  // Create a new directory
  function createDirectory(path) {
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
  }

  // Update file content
  function updateFile(path, content) {
    const file = getFile(path)
    if (!file) {
      throw new Error('File not found')
    }

    file.content = content
    file.modified = true
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

    const htmlFile = getFile('/index.html')
    const cssFile = getFile('/styles.css')
    const jsFile = getFile('/script.js')

    if (htmlFile !== null) editorStore.setCode('html', htmlFile.content)
    if (cssFile !== null) editorStore.setCode('css', cssFile.content)
    if (jsFile !== null) editorStore.setCode('js', jsFile.content)
  }

  // Delete file or directory
  function deleteItem(path) {
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
  }

  // Rename file or directory
  function renameItem(oldPath, newPath) {
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

  return {
    // State
    fileTree,
    activeFilePath,
    expandedDirs,

    // Computed
    activeFileContent,
    activeFileName,
    activeFileExtension,

    // Actions
    getFile,
    getDirectory,
    createFile,
    createDirectory,
    updateFile,
    updateActiveFile,
    deleteItem,
    renameItem,
    getAllFiles,
    isFileModified,
    markFileSaved,
    toggleDirectory,
    isDirectoryExpanded,
    collapseAll,
    resetFileSystem,
    syncWithEditorStore
  }
})
