/**
 * Safe npm package loader using ESM.sh
 * Fails gracefully without breaking the editor
 */

// ESM.sh CDN configuration
const ESM_CDN = 'https://esm.sh'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Cache for loaded packages to avoid redundant network requests
const packageCache = new Map()

/**
 * Parse npm imports from JavaScript code
 * @param {string} code - JavaScript code to parse
 * @returns {Array} Array of detected packages with { name, version, full }
 */
function parseImports(code) {
  if (!code || typeof code !== 'string') {
    return []
  }

  const packages = []

  try {
    // Match various import patterns
    const importPatterns = [
      // import x from "package"
      /import\s+(?:[\w*{}\s,]+)\s+from\s+['"]([^'"]+)['"]/g,
      // import("package")
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      // export ... from "package"
      /export\s+(?:[\w*{}\s,]+)\s+from\s+['"]([^'"]+)['"]/g,
    ]

    for (const pattern of importPatterns) {
      let match
      while ((match = pattern.exec(code)) !== null) {
        const importPath = match[1]

        // Only handle npm packages (not relative/absolute paths)
        if (!importPath.startsWith('.') && !importPath.startsWith('/') && !importPath.startsWith('http')) {
          // Parse package name and version
          const parts = importPath.split('@')
          let name, version

          if (importPath.startsWith('@')) {
            // Scoped package like @org/package@version
            name = `@${parts[1]}`
            version = parts[2] || 'latest'
          } else {
            // Regular package like package@version
            name = parts[0]
            version = parts[1] || 'latest'
          }

          // Avoid duplicates
          if (!packages.some(p => p.full === importPath)) {
            packages.push({
              name,
              version,
              full: importPath
            })
          }
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to parse imports:', error)
  }

  return packages
}

/**
 * Transform npm imports to ESM.sh URLs
 * @param {string} code - JavaScript code with npm imports
 * @returns {string} Transformed code with ESM.sh URLs
 */
function transformImports(code) {
  if (!code || typeof code !== 'string') {
    return code
  }

  try {
    let transformed = code

    // Transform import statements
    transformed = transformed.replace(
      /import\s+((?:[\w*{}\s,]+)\s+from\s+)?['"]([^'"]+)['"]/g,
      (match, importClause, packageName) => {
        // Only transform npm packages (not relative/absolute paths)
        if (!packageName.startsWith('.') &&
            !packageName.startsWith('/') &&
            !packageName.startsWith('http')) {
          return `import ${importClause || ''}'${ESM_CDN}/${packageName}'`
        }
        return match
      }
    )

    // Transform dynamic imports
    transformed = transformed.replace(
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      (match, packageName) => {
        if (!packageName.startsWith('.') &&
            !packageName.startsWith('/') &&
            !packageName.startsWith('http')) {
          return `import('${ESM_CDN}/${packageName}')`
        }
        return match
      }
    )

    // Transform export from statements
    transformed = transformed.replace(
      /export\s+((?:[\w*{}\s,]+)\s+from\s+)?['"]([^'"]+)['"]/g,
      (match, exportClause, packageName) => {
        if (!packageName.startsWith('.') &&
            !packageName.startsWith('/') &&
            !packageName.startsWith('http')) {
          return `export ${exportClause || ''}'${ESM_CDN}/${packageName}'`
        }
        return match
      }
    )

    return transformed
  } catch (error) {
    console.warn('⚠️ Failed to transform imports:', error)
    return code // Return original code on error
  }
}

/**
 * Preload packages to check if they're available
 * @param {string} code - JavaScript code with npm imports
 * @returns {Promise<Array>} Promise that resolves with loaded packages or rejects with errors
 */
async function preloadPackages(code) {
  const packages = parseImports(code)

  if (packages.length === 0) {
    return []
  }

  const errors = []
  const loaded = []

  // Try to load each package
  await Promise.allSettled(
    packages.map(async (pkg) => {
      try {
        // Check cache first
        const cacheKey = pkg.full
        const cached = packageCache.get(cacheKey)

        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          loaded.push(pkg.name)
          return
        }

        // Fetch package info from ESM.sh
        const url = `${ESM_CDN}/${pkg.full}`
        const response = await fetch(url, {
          method: 'HEAD',
          cache: 'force-cache'
        })

        if (!response.ok) {
          throw new Error(`Package "${pkg.name}" not found (HTTP ${response.status})`)
        }

        // Cache the result
        packageCache.set(cacheKey, {
          timestamp: Date.now(),
          success: true
        })

        loaded.push(pkg.name)
      } catch (error) {
        errors.push({
          package: pkg.name,
          message: error.message
        })
      }
    })
  )

  // If there are errors, throw them
  if (errors.length > 0) {
    const error = new Error(`Failed to load packages: ${errors.map(e => e.package).join(', ')}`)
    error.details = errors
    throw error
  }

  return loaded
}

/**
 * Clear the package cache
 */
function clearCache() {
  packageCache.clear()
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return {
    size: packageCache.size,
    entries: Array.from(packageCache.keys())
  }
}

// Export the npm loader
export const npmLoader = {
  parseImports,
  transformImports,
  preloadPackages,
  clearCache,
  getCacheStats,
  ESM_CDN
}

export default npmLoader
