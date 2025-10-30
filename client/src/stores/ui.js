import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  // State
  const isFullscreen = ref(false)
  const showCollabMenu = ref(false)
  const showInstructions = ref(false)
  const previewWindow = ref(null)
  const notifications = ref([])

  // Actions
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      isFullscreen.value = true
    } else {
      document.exitFullscreen()
      isFullscreen.value = false
    }
  }

  function openCollabMenu() {
    showCollabMenu.value = true
  }

  function closeCollabMenu() {
    showCollabMenu.value = false
  }

  function toggleInstructions() {
    showInstructions.value = !showInstructions.value
  }

  function closeInstructions() {
    showInstructions.value = false
  }

  function showNotification(message, type = 'info') {
    const notification = {
      id: Date.now(),
      message,
      type
    }
    notifications.value.push(notification)

    // Auto remove after 3 seconds
    setTimeout(() => {
      notifications.value = notifications.value.filter(n => n.id !== notification.id)
    }, 3000)
  }

  function removeNotification(id) {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  return {
    isFullscreen,
    showCollabMenu,
    showInstructions,
    previewWindow,
    notifications,
    toggleFullscreen,
    openCollabMenu,
    closeCollabMenu,
    toggleInstructions,
    closeInstructions,
    showNotification,
    removeNotification
  }
})
