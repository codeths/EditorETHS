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
import { computed, onMounted } from 'vue'
import { useUIStore } from './stores/ui'
import { useProjectStore } from './stores/project'

const uiStore = useUIStore()
const projectStore = useProjectStore()

const notifications = computed(() => uiStore.notifications)

onMounted(() => {
  // Load saved projects on app start
  projectStore.loadProjects()
})
</script>
