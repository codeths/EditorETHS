import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useEditorStore } from './editor'

export const useProjectStore = defineStore('project', () => {
  // State
  const currentProjectId = ref(null)
  const currentProjectName = ref('Untitled Project')
  const projects = ref([])
  const isMenuOpen = ref(false)
  const showNewProjectModal = ref(false)

  // Actions
  function loadProjects() {
    try {
      const saved = localStorage.getItem('eths_projects')
      if (saved) {
        projects.value = JSON.parse(saved)
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
      projects.value = []
    }
  }

  function saveProjects() {
    try {
      localStorage.setItem('eths_projects', JSON.stringify(projects.value))
    } catch (error) {
      console.error('Failed to save projects:', error)
    }
  }

  function saveCurrentProject() {
    const editorStore = useEditorStore()

    if (!currentProjectId.value) {
      // Create new project
      const newProject = {
        id: Date.now().toString(),
        name: currentProjectName.value,
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
        project.html = editorStore.htmlCode
        project.css = editorStore.cssCode
        project.js = editorStore.jsCode
        project.lastModified = new Date().toISOString()
        project.name = currentProjectName.value
      }
    }

    saveProjects()
  }

  function loadProject(projectId) {
    const project = projects.value.find(p => p.id === projectId)
    if (project) {
      const editorStore = useEditorStore()
      editorStore.setCode('html', project.html || '')
      editorStore.setCode('css', project.css || '')
      editorStore.setCode('js', project.js || '')
      currentProjectId.value = project.id
      currentProjectName.value = project.name
      isMenuOpen.value = false
    }
  }

  function deleteProject(projectId) {
    projects.value = projects.value.filter(p => p.id !== projectId)
    saveProjects()

    if (currentProjectId.value === projectId) {
      createNewProject()
    }
  }

  function createNewProject() {
    const editorStore = useEditorStore()
    editorStore.resetCode()
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
