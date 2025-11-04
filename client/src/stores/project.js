import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useEditorStore } from './editor'
import { useFileSystemStore } from './fileSystem'
import { loadProjectsFromOPFS, saveProjectsToOPFS } from '../composables/useOPFS'

export const useProjectStore = defineStore('project', () => {
  // State
  const currentProjectId = ref(null)
  const currentProjectName = ref('Untitled Project')
  const projects = ref([])
  const isMenuOpen = ref(false)
  const showNewProjectModal = ref(false)
  const isSaving = ref(false)
  const lastSaveTime = ref(null)

  // Actions
  async function loadProjects() {
    try {
      projects.value = await loadProjectsFromOPFS()
    } catch (error) {
      console.error('Failed to load projects:', error)
      projects.value = []
    }
  }

  async function saveProjects() {
    try {
      isSaving.value = true
      await saveProjectsToOPFS(projects.value)
      lastSaveTime.value = new Date()
    } catch (error) {
      console.error('Failed to save projects:', error)
    } finally {
      isSaving.value = false
    }
  }

  async function saveCurrentProject() {
    const editorStore = useEditorStore()
    const fsStore = useFileSystemStore()

    if (!currentProjectId.value) {
      // Create new project
      const newProject = {
        id: Date.now().toString(),
        name: currentProjectName.value,
        // Save entire file tree (new format)
        fileTree: JSON.parse(JSON.stringify(fsStore.fileTree)),
        activeFilePath: fsStore.activeFilePath,
        // Keep legacy format for backward compatibility
        html: editorStore.htmlCode,
        css: editorStore.cssCode,
        js: editorStore.jsCode,
        lastModified: new Date().toISOString()
      }
      projects.value.push(newProject)
      currentProjectId.value = newProject.id
    } else {
      // Update existing project
      const project = projects.value.find(p => p.id === currentProjectId.value)
      if (project) {
        project.fileTree = JSON.parse(JSON.stringify(fsStore.fileTree))
        project.activeFilePath = fsStore.activeFilePath
        project.html = editorStore.htmlCode
        project.css = editorStore.cssCode
        project.js = editorStore.jsCode
        project.lastModified = new Date().toISOString()
        project.name = currentProjectName.value
      }
    }

    await saveProjects()
  }

  function loadProject(projectId) {
    const project = projects.value.find(p => p.id === projectId)
    if (project) {
      const editorStore = useEditorStore()
      const fsStore = useFileSystemStore()

      // Load new format (file tree)
      if (project.fileTree) {
        fsStore.fileTree = JSON.parse(JSON.stringify(project.fileTree))
        fsStore.activeFilePath = project.activeFilePath || '/index.html'

        // Sync with legacy editor store for backward compatibility
        fsStore.syncWithEditorStore()
      } else {
        // Load old format (HTML/CSS/JS only) - backward compatibility
        editorStore.setCode('html', project.html || '')
        editorStore.setCode('css', project.css || '')
        editorStore.setCode('js', project.js || '')

        // Create file tree from old format
        fsStore.fileTree = {
          type: 'directory',
          children: {
            'index.html': {
              type: 'file',
              content: project.html || '',
              binary: false,
              modified: false
            },
            'styles.css': {
              type: 'file',
              content: project.css || '',
              binary: false,
              modified: false
            },
            'script.js': {
              type: 'file',
              content: project.js || '',
              binary: false,
              modified: false
            }
          }
        }
        fsStore.activeFilePath = '/index.html'
      }

      currentProjectId.value = project.id
      currentProjectName.value = project.name
      isMenuOpen.value = false
    }
  }

  async function deleteProject(projectId) {
    projects.value = projects.value.filter(p => p.id !== projectId)
    await saveProjects()

    if (currentProjectId.value === projectId) {
      createNewProject()
    }
  }

  function createNewProject() {
    const editorStore = useEditorStore()
    const fsStore = useFileSystemStore()
    editorStore.resetCode()
    fsStore.resetFileSystem()
    currentProjectId.value = null
    currentProjectName.value = 'Untitled Project'
    isMenuOpen.value = false
    showNewProjectModal.value = false
  }

  function toggleMenu() {
    isMenuOpen.value = !isMenuOpen.value
  }

  function closeMenu() {
    isMenuOpen.value = false
  }

  function openNewProjectModal() {
    showNewProjectModal.value = true
  }

  function closeNewProjectModal() {
    showNewProjectModal.value = false
  }

  return {
    currentProjectId,
    currentProjectName,
    projects,
    isMenuOpen,
    showNewProjectModal,
    isSaving,
    lastSaveTime,
    loadProjects,
    saveProjects,
    saveCurrentProject,
    loadProject,
    deleteProject,
    createNewProject,
    toggleMenu,
    closeMenu,
    openNewProjectModal,
    closeNewProjectModal
  }
})
