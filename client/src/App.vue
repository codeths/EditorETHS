<template>
  <div id="app" class="bg-base-300 text-base-content">
    <RouterView />

    <!-- Notifications -->
    <div class="toast toast-top toast-end z-50">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="[
          'alert',
          notification.type === 'success' && 'alert-success',
          notification.type === 'error' && 'alert-error',
          notification.type === 'warning' && 'alert-warning',
          notification.type === 'info' && 'alert-info'
        ]"
      >
        <span>{{ notification.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import { computed, onMounted, onUnmounted, watch, ref } from 'vue'
import { useUIStore } from './stores/ui'
import { useProjectStore } from './stores/project'
import { useEditorStore } from './stores/editor'

const uiStore = useUIStore()
const projectStore = useProjectStore()
const editorStore = useEditorStore()

const notifications = computed(() => uiStore.notifications)

// Auto-save functionality
let saveTimeout = null
let saveInterval = null

async function autoSave() {
  try {
    await projectStore.saveCurrentProject()
    console.log('Auto-saved at', new Date().toLocaleTimeString())
  } catch (error) {
    console.error('Auto-save failed:', error)
  }
}

// Debounced save on code change (1 second after typing stops)
watch(
  [
    () => editorStore.htmlCode,
    () => editorStore.cssCode,
    () => editorStore.jsCode
  ],
  () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }
    saveTimeout = setTimeout(autoSave, 1000)
  }
)

onMounted(async () => {
  // Load saved projects on app start
  await projectStore.loadProjects()

  // Auto-save every 3 seconds
  saveInterval = setInterval(autoSave, 3000)
})

onUnmounted(() => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  if (saveInterval) {
    clearInterval(saveInterval)
  }
})
</script>
