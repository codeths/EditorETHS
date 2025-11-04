<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" @click.self="close">
    <div class="bg-base-100 rounded-lg shadow-xl w-full max-w-4xl m-4 flex flex-col" style="max-height: 80vh;">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-base-300">
        <h3 class="text-lg font-semibold">Commit History</h3>
        <button @click="close" class="btn btn-sm btn-ghost btn-circle">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-12">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <!-- Commits List -->
        <div v-else-if="gitStore.commits.length > 0" class="space-y-3">
          <div
            v-for="commit in gitStore.commits"
            :key="commit.sha"
            class="border border-base-300 rounded-lg p-4 hover:bg-base-200 transition-colors"
          >
            <!-- Commit Header -->
            <div class="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mt-1 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <div class="flex-1 min-w-0">
                <!-- Commit Message -->
                <div class="font-semibold mb-1">{{ commit.message }}</div>

                <!-- Commit Meta -->
                <div class="flex flex-wrap gap-3 text-xs opacity-70">
                  <span class="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {{ commit.author.name }}
                  </span>
                  <span class="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {{ formatDate(commit.date) }}
                  </span>
                  <span class="font-mono">{{ commit.sha.substring(0, 7) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="flex flex-col items-center justify-center py-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm opacity-70">No commits yet</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-between items-center px-6 py-4 border-t border-base-300">
        <button @click="loadMore" class="btn btn-sm btn-ghost" :disabled="loading">
          Load More
        </button>
        <button @click="close" class="btn btn-sm">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useGitStore } from '../stores/git'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const gitStore = useGitStore()
const loading = ref(false)
const commitCount = ref(20)

watch(() => props.visible, async (newVal) => {
  if (newVal) {
    await loadCommits()
  }
})

async function loadCommits() {
  if (!gitStore.isInitialized) return

  loading.value = true
  try {
    await gitStore.loadCommits(commitCount.value)
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  commitCount.value += 20
  await loadCommits()
}

function formatDate(date) {
  const now = new Date()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) {
    return date.toLocaleDateString()
  } else if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else {
    return 'Just now'
  }
}

function close() {
  emit('close')
}
</script>
