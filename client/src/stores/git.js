import { defineStore } from 'pinia'
import { ref } from 'vue'
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/web'
import FS from '@isomorphic-git/lightning-fs'
import { useFileSystemStore } from './fileSystem'
import { useUIStore } from './ui'

// Initialize file system for git
const fs = new FS('git-fs')
const pfs = fs.promises
const dir = '/repo'

export const useGitStore = defineStore('git', () => {
  const isInitialized = ref(false)
  const currentBranch = ref('main')
  const branches = ref([])
  const status = ref([])
  const commits = ref([])
  const remoteUrl = ref('')
  const author = ref({
    name: 'EditorETHS User',
    email: 'user@editorths.local'
  })

  // Initialize git repository
  async function init() {
    try {
      await git.init({ fs: pfs, dir })
      isInitialized.value = true
      return { success: true }
    } catch (error) {
      console.error('Git init error:', error)
      return { success: false, error: error.message }
    }
  }

  // Clone a repository
  async function clone(url, onProgress = null) {
    const uiStore = useUIStore()
    try {
      // Clean up any existing repository
      await pfs.rmdir(dir, { recursive: true }).catch(() => {})
      await pfs.mkdir(dir).catch(() => {})

      // Extract repo name from URL
      const repoName = url.split('/').pop().replace('.git', '')

      // Clone the repository
      await git.clone({
        fs: pfs,
        http,
        dir,
        url,
        corsProxy: 'https://cors.isomorphic-git.org',
        singleBranch: true,
        depth: 1,
        onProgress: (progress) => {
          if (onProgress) {
            onProgress(progress)
          }
        }
      })

      remoteUrl.value = url
      isInitialized.value = true

      // Get current branch
      currentBranch.value = await git.currentBranch({ fs: pfs, dir, fullname: false })

      // Load branches
      await loadBranches()

      // Load commits
      await loadCommits()

      // Sync files to file system store
      await syncFilesToFileSystem()

      uiStore.showNotification(`Cloned ${repoName} successfully`, 'success')
      return { success: true, repoName }
    } catch (error) {
      console.error('Git clone error:', error)
      uiStore.showNotification(`Clone failed: ${error.message}`, 'error')
      return { success: false, error: error.message }
    }
  }

  // Get repository status
  async function getStatus() {
    if (!isInitialized.value) return []

    try {
      const FILE = 0, WORKDIR = 2, STAGE = 3

      const statusMatrix = await git.statusMatrix({ fs: pfs, dir })

      const statusList = statusMatrix.map(([filepath, head, workdir, stage]) => {
        let state = 'unmodified'

        if (head === 1 && workdir === 2 && stage === 2) state = 'modified'
        else if (head === 0 && workdir === 2 && stage === 0) state = 'untracked'
        else if (head === 1 && workdir === 0 && stage === 0) state = 'deleted'
        else if (head === 1 && workdir === 2 && stage === 3) state = 'modified'
        else if (head === 0 && workdir === 2 && stage === 3) state = 'added'
        else if (head === 1 && workdir === 0 && stage === 3) state = 'deleted'

        return {
          filepath,
          state,
          staged: stage !== workdir,
          head,
          workdir,
          stage
        }
      }).filter(item => item.state !== 'unmodified')

      status.value = statusList
      return statusList
    } catch (error) {
      console.error('Git status error:', error)
      return []
    }
  }

  // Stage a file
  async function add(filepath) {
    try {
      await git.add({ fs: pfs, dir, filepath })
      await getStatus()
      return { success: true }
    } catch (error) {
      console.error('Git add error:', error)
      return { success: false, error: error.message }
    }
  }

  // Unstage a file
  async function reset(filepath) {
    try {
      await git.reset({ fs: pfs, dir, filepaths: [filepath] })
      await getStatus()
      return { success: true }
    } catch (error) {
      console.error('Git reset error:', error)
      return { success: false, error: error.message }
    }
  }

  // Commit staged changes
  async function commit(message) {
    const uiStore = useUIStore()
    try {
      const sha = await git.commit({
        fs: pfs,
        dir,
        message,
        author: {
          name: author.value.name,
          email: author.value.email
        }
      })

      await loadCommits()
      await getStatus()
      uiStore.showNotification('Committed successfully', 'success')
      return { success: true, sha }
    } catch (error) {
      console.error('Git commit error:', error)
      uiStore.showNotification(`Commit failed: ${error.message}`, 'error')
      return { success: false, error: error.message }
    }
  }

  // Load commit history
  async function loadCommits(count = 20) {
    if (!isInitialized.value) return []

    try {
      const logs = await git.log({ fs: pfs, dir, depth: count })
      commits.value = logs.map(log => ({
        sha: log.oid,
        message: log.commit.message,
        author: log.commit.author,
        date: new Date(log.commit.author.timestamp * 1000)
      }))
      return commits.value
    } catch (error) {
      console.error('Git log error:', error)
      return []
    }
  }

  // Load branches
  async function loadBranches() {
    if (!isInitialized.value) return []

    try {
      const branchList = await git.listBranches({ fs: pfs, dir })
      branches.value = branchList
      return branchList
    } catch (error) {
      console.error('Git branches error:', error)
      return []
    }
  }

  // Create a new branch
  async function createBranch(branchName) {
    const uiStore = useUIStore()
    try {
      await git.branch({ fs: pfs, dir, ref: branchName })
      await loadBranches()
      uiStore.showNotification(`Created branch ${branchName}`, 'success')
      return { success: true }
    } catch (error) {
      console.error('Git branch error:', error)
      uiStore.showNotification(`Branch creation failed: ${error.message}`, 'error')
      return { success: false, error: error.message }
    }
  }

  // Switch to a different branch
  async function checkout(branchName) {
    const uiStore = useUIStore()
    try {
      await git.checkout({ fs: pfs, dir, ref: branchName })
      currentBranch.value = branchName

      // Sync files after checkout
      await syncFilesToFileSystem()
      await getStatus()

      uiStore.showNotification(`Switched to ${branchName}`, 'success')
      return { success: true }
    } catch (error) {
      console.error('Git checkout error:', error)
      uiStore.showNotification(`Checkout failed: ${error.message}`, 'error')
      return { success: false, error: error.message }
    }
  }

  // Push to remote
  async function push() {
    const uiStore = useUIStore()
    try {
      if (!remoteUrl.value) {
        throw new Error('No remote URL configured')
      }

      await git.push({
        fs: pfs,
        http,
        dir,
        remote: 'origin',
        ref: currentBranch.value,
        corsProxy: 'https://cors.isomorphic-git.org'
      })

      uiStore.showNotification('Pushed successfully', 'success')
      return { success: true }
    } catch (error) {
      console.error('Git push error:', error)
      uiStore.showNotification(`Push failed: ${error.message}`, 'error')
      return { success: false, error: error.message }
    }
  }

  // Pull from remote
  async function pull() {
    const uiStore = useUIStore()
    try {
      if (!remoteUrl.value) {
        throw new Error('No remote URL configured')
      }

      await git.pull({
        fs: pfs,
        http,
        dir,
        ref: currentBranch.value,
        corsProxy: 'https://cors.isomorphic-git.org',
        author: {
          name: author.value.name,
          email: author.value.email
        }
      })

      await syncFilesToFileSystem()
      await getStatus()
      await loadCommits()

      uiStore.showNotification('Pulled successfully', 'success')
      return { success: true }
    } catch (error) {
      console.error('Git pull error:', error)
      uiStore.showNotification(`Pull failed: ${error.message}`, 'error')
      return { success: false, error: error.message }
    }
  }

  // Sync git files to file system store
  async function syncFilesToFileSystem() {
    const fsStore = useFileSystemStore()

    try {
      // Clear current file tree
      fsStore.clearFileTree()

      // Read all files from git repository
      await readDirRecursive(dir, '')

      async function readDirRecursive(basePath, relativePath) {
        const fullPath = relativePath ? `${basePath}/${relativePath}` : basePath
        const entries = await pfs.readdir(fullPath)

        for (const entry of entries) {
          // Skip .git directory
          if (entry === '.git') continue

          const entryPath = relativePath ? `${relativePath}/${entry}` : entry
          const fullEntryPath = `${basePath}/${entryPath}`

          const stats = await pfs.stat(fullEntryPath)

          if (stats.isDirectory()) {
            // Create directory in file system
            fsStore.createDirectory(`/${entryPath}`)
            // Recursively read subdirectory
            await readDirRecursive(basePath, entryPath)
          } else {
            // Read file content
            const content = await pfs.readFile(fullEntryPath, { encoding: 'utf8' })
            // Create file in file system
            fsStore.createFile(`/${entryPath}`, content)
          }
        }
      }
    } catch (error) {
      console.error('Sync files error:', error)
    }
  }

  // Sync file system store changes to git
  async function syncFileSystemToGit() {
    const fsStore = useFileSystemStore()

    try {
      // Write all files from file system store to git
      await writeDirRecursive(fsStore.fileTree.children, '')

      async function writeDirRecursive(children, parentPath) {
        for (const [name, item] of Object.entries(children)) {
          const itemPath = parentPath ? `${parentPath}/${name}` : name
          const fullPath = `${dir}/${itemPath}`

          if (item.type === 'directory') {
            // Create directory
            await pfs.mkdir(fullPath).catch(() => {})
            // Recursively write subdirectory
            await writeDirRecursive(item.children, itemPath)
          } else {
            // Write file content
            await pfs.writeFile(fullPath, item.content, { encoding: 'utf8' })
          }
        }
      }

      // Update status after sync
      await getStatus()
    } catch (error) {
      console.error('Sync to git error:', error)
    }
  }

  // Set author information
  function setAuthor(name, email) {
    author.value = { name, email }
  }

  return {
    // State
    isInitialized,
    currentBranch,
    branches,
    status,
    commits,
    remoteUrl,
    author,

    // Actions
    init,
    clone,
    getStatus,
    add,
    reset,
    commit,
    loadCommits,
    loadBranches,
    createBranch,
    checkout,
    push,
    pull,
    syncFilesToFileSystem,
    syncFileSystemToGit,
    setAuthor
  }
})
