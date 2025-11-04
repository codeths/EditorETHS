import JSZip from 'jszip'

/**
 * Export selected files to a ZIP archive
 * @param {Object} fileTree - The file tree structure
 * @param {Set} selectedPaths - Set of file paths to export
 * @param {String} projectName - Name for the ZIP file
 */
export async function exportFilesToZip(fileTree, selectedPaths, projectName = 'project') {
  const zip = new JSZip()

  // Helper function to add files recursively
  function addToZip(node, currentPath, zipFolder) {
    if (node.type === 'file') {
      // Check if this file is selected
      if (selectedPaths.has(currentPath)) {
        // Remove leading slash for zip paths
        const zipPath = currentPath.substring(1)
        if (node.binary) {
          // For binary files, assume content is base64 or Blob
          zip.file(zipPath, node.content, { binary: true })
        } else {
          zip.file(zipPath, node.content)
        }
      }
    } else if (node.type === 'directory' && node.children) {
      // Process children
      for (const [name, child] of Object.entries(node.children)) {
        const childPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`
        addToZip(child, childPath, zipFolder)
      }
    }
  }

  // Start adding files from root
  addToZip(fileTree, '/', zip)

  // Generate ZIP file
  const blob = await zip.generateAsync({ type: 'blob' })

  // Trigger download
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${projectName}.zip`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return true
}

/**
 * Get all file paths from the file tree
 * @param {Object} fileTree - The file tree structure
 * @param {String} basePath - Base path for recursion
 * @returns {Array} - Array of file paths
 */
export function getAllFilePaths(fileTree, basePath = '/') {
  const paths = []

  function traverse(node, currentPath) {
    if (node.type === 'file') {
      paths.push(currentPath)
    } else if (node.type === 'directory' && node.children) {
      for (const [name, child] of Object.entries(node.children)) {
        const childPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`
        traverse(child, childPath)
      }
    }
  }

  traverse(fileTree, basePath)
  return paths
}

/**
 * Import files from a ZIP archive
 * @param {File} zipFile - The ZIP file to import
 * @returns {Object} - File tree structure
 */
export async function importFilesFromZip(zipFile) {
  const zip = new JSZip()
  const loadedZip = await zip.loadAsync(zipFile)

  const fileTree = {
    type: 'directory',
    children: {}
  }

  // Process each file in the ZIP
  const files = []
  loadedZip.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir) {
      files.push({ path: relativePath, entry: zipEntry })
    }
  })

  // Read all files
  for (const { path, entry } of files) {
    const content = await entry.async('string')

    // Create directory structure
    const parts = path.split('/')
    let current = fileTree

    // Create directories
    for (let i = 0; i < parts.length - 1; i++) {
      const dirName = parts[i]
      if (!current.children[dirName]) {
        current.children[dirName] = {
          type: 'directory',
          children: {}
        }
      }
      current = current.children[dirName]
    }

    // Add file
    const fileName = parts[parts.length - 1]
    current.children[fileName] = {
      type: 'file',
      content,
      binary: false,
      modified: false
    }
  }

  return fileTree
}

/**
 * Get file tree preview from ZIP (without actually importing)
 * @param {File} zipFile - The ZIP file
 * @returns {Array} - Array of file paths with metadata
 */
export async function getZipPreview(zipFile) {
  const zip = new JSZip()
  const loadedZip = await zip.loadAsync(zipFile)

  const files = []
  loadedZip.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir) {
      files.push({
        path: '/' + relativePath,
        size: zipEntry._data?.uncompressedSize || 0,
        date: zipEntry.date
      })
    }
  })

  return files
}
