/**
 * OPFS (Origin Private File System) composable for auto-saving projects
 * Provides persistent storage using the File System Access API
 */

const PROJECTS_FILE = 'projects.json'

/**
 * Get the OPFS root directory
 */
async function getOPFSRoot() {
  try {
    return await navigator.storage.getDirectory()
  } catch (error) {
    console.error('OPFS not supported:', error)
    return null
  }
}

/**
 * Check if OPFS is supported
 */
export function isOPFSSupported() {
  return 'storage' in navigator && 'getDirectory' in navigator.storage
}

/**
 * Save projects to OPFS
 */
export async function saveProjectsToOPFS(projects) {
  try {
    const root = await getOPFSRoot()
    if (!root) {
      // Fallback to localStorage
      localStorage.setItem('eths_projects', JSON.stringify(projects))
      return
    }

    const fileHandle = await root.getFileHandle(PROJECTS_FILE, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(projects, null, 2))
    await writable.close()

    console.log('Projects saved to OPFS')
  } catch (error) {
    console.error('Failed to save to OPFS:', error)
    // Fallback to localStorage
    try {
      localStorage.setItem('eths_projects', JSON.stringify(projects))
    } catch (e) {
      console.error('Failed to save to localStorage:', e)
    }
  }
}

/**
 * Load projects from OPFS
 */
export async function loadProjectsFromOPFS() {
  try {
    const root = await getOPFSRoot()
    if (!root) {
      // Fallback to localStorage
      const saved = localStorage.getItem('eths_projects')
      return saved ? JSON.parse(saved) : []
    }

    try {
      const fileHandle = await root.getFileHandle(PROJECTS_FILE)
      const file = await fileHandle.getFile()
      const text = await file.text()
      return text ? JSON.parse(text) : []
    } catch (error) {
      if (error.name === 'NotFoundError') {
        // File doesn't exist yet, try localStorage migration
        const saved = localStorage.getItem('eths_projects')
        if (saved) {
          const projects = JSON.parse(saved)
          // Migrate to OPFS
          await saveProjectsToOPFS(projects)
          return projects
        }
        return []
      }
      throw error
    }
  } catch (error) {
    console.error('Failed to load from OPFS:', error)
    // Fallback to localStorage
    try {
      const saved = localStorage.getItem('eths_projects')
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      console.error('Failed to load from localStorage:', e)
      return []
    }
  }
}

/**
 * Delete a project file from OPFS
 */
export async function deleteProjectFromOPFS(projectId, allProjects) {
  const updatedProjects = allProjects.filter(p => p.id !== projectId)
  await saveProjectsToOPFS(updatedProjects)
  return updatedProjects
}

/**
 * Clear all projects from OPFS
 */
export async function clearOPFS() {
  try {
    const root = await getOPFSRoot()
    if (!root) {
      localStorage.removeItem('eths_projects')
      return
    }

    await root.removeEntry(PROJECTS_FILE)
    console.log('OPFS cleared')
  } catch (error) {
    if (error.name !== 'NotFoundError') {
      console.error('Failed to clear OPFS:', error)
    }
    localStorage.removeItem('eths_projects')
  }
}
