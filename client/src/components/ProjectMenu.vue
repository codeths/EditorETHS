<template>
  <!-- Menu Overlay -->
  <div
    v-if="isMenuOpen"
    @click="closeMenu"
    class="fixed inset-0 bg-black bg-opacity-50 z-40"
  ></div>

  <!-- Sidebar Menu -->
  <div
    :class="[
      'fixed top-0 left-0 h-full w-80 bg-base-200 border-r border-base-300 z-50 transition-transform duration-300',
      isMenuOpen ? 'translate-x-0' : '-translate-x-full'
    ]"
  >
    <div class="flex flex-col h-full">
      <!-- Menu Header -->
      <div class="bg-base-300 p-4 border-b border-base-300 flex justify-between items-center">
        <h2 class="font-bold text-lg">Projects</h2>
        <button @click="closeMenu" class="btn btn-sm btn-square btn-ghost">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5 h-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- New Project Button -->
      <div class="p-4 border-b border-base-300">
        <button @click="openNewProjectModal" class="btn btn-primary w-full">
          + New Project
        </button>
      </div>

      <!-- Projects List -->
      <div class="flex-1 overflow-y-auto p-4">
        <div v-if="projects.length === 0" class="text-center text-base-content opacity-50 py-8">
          No saved projects yet
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="project in sortedProjects"
            :key="project.id"
            class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div class="card-body p-4">
              <div class="flex justify-between items-start">
                <div class="flex-1 cursor-pointer" @click="loadProject(project.id)">
                  <h3 class="font-semibold text-sm">{{ project.name }}</h3>
                  <p class="text-xs opacity-70 mt-1">
                    {{ formatDate(project.lastModified) }}
                  </p>
                </div>
                <button
                  @click="deleteProject(project.id)"
                  class="btn btn-xs btn-ghost btn-square text-error"
                  title="Delete Project"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="w-4 h-4"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- New Project Modal -->
  <div v-if="showNewProjectModal" class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">Create New Project</h3>
      <p class="text-sm opacity-70 mb-4">
        This will clear your current work. Make sure to save first!
      </p>
      <div class="modal-action">
        <button @click="closeNewProjectModal" class="btn btn-ghost">
          Cancel
        </button>
        <button @click="confirmNewProject" class="btn btn-primary">
          Create New Project
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useProjectStore } from '../stores/project'
import { useUIStore } from '../stores/ui'

const projectStore = useProjectStore()
const uiStore = useUIStore()

const isMenuOpen = computed(() => projectStore.isMenuOpen)
const showNewProjectModal = computed(() => projectStore.showNewProjectModal)
const projects = computed(() => projectStore.projects)

const sortedProjects = computed(() => {
  return [...projects.value].sort((a, b) => {
    return new Date(b.lastModified) - new Date(a.lastModified)
  })
})

function closeMenu() {
  projectStore.closeMenu()
}

function openNewProjectModal() {
  projectStore.openNewProjectModal()
}

function closeNewProjectModal() {
  projectStore.closeNewProjectModal()
}

function confirmNewProject() {
  projectStore.createNewProject()
  uiStore.showNotification('New project created', 'success')
}

function loadProject(projectId) {
  projectStore.loadProject(projectId)
  uiStore.showNotification('Project loaded', 'success')
}

function deleteProject(projectId) {
  if (confirm('Are you sure you want to delete this project?')) {
    projectStore.deleteProject(projectId)
    uiStore.showNotification('Project deleted', 'success')
  }
}

function formatDate(isoString) {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

  return date.toLocaleDateString()
}
</script>
