<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" @click.self="close">
    <div class="bg-base-100 rounded-lg shadow-xl w-full max-w-2xl m-4">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-base-300">
        <h3 class="text-lg font-semibold">Clone Repository</h3>
        <button @click="close" class="btn btn-sm btn-ghost btn-circle">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="px-6 py-4 space-y-4">
        <div>
          <label class="label">
            <span class="label-text font-semibold">Repository URL</span>
          </label>
          <input
            v-model="repoUrl"
            type="text"
            placeholder="https://github.com/username/repo.git"
            class="input input-bordered w-full"
            :disabled="cloning"
            @keydown.enter="handleClone"
          />
          <label class="label">
            <span class="label-text-alt opacity-70">Enter a GitHub or GitLab repository URL</span>
          </label>
        </div>

        <!-- Quick Examples -->
        <div>
          <label class="label">
            <span class="label-text font-semibold">Examples</span>
          </label>
          <div class="space-y-2">
            <button
              v-for="example in examples"
              :key="example.url"
              @click="repoUrl = example.url"
              class="btn btn-sm btn-outline w-full justify-start"
              :disabled="cloning"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <div class="text-left flex-1">
                <div class="font-semibold">{{ example.name }}</div>
                <div class="text-xs opacity-60">{{ example.url }}</div>
              </div>
            </button>
          </div>
        </div>

        <!-- Progress -->
        <div v-if="cloning" class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="loading loading-spinner loading-sm"></span>
            <span class="text-sm">{{ progressMessage }}</span>
          </div>
          <progress v-if="progressPercent > 0" class="progress progress-primary w-full" :value="progressPercent" max="100"></progress>
        </div>

        <!-- Error -->
        <div v-if="error" class="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{{ error }}</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 px-6 py-4 border-t border-base-300">
        <button @click="close" class="btn btn-ghost" :disabled="cloning">Cancel</button>
        <button @click="handleClone" class="btn btn-primary" :disabled="!repoUrl || cloning">
          <svg v-if="!cloning" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Clone
        </button>
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

const emit = defineEmits(['close', 'cloned'])

const gitStore = useGitStore()

const repoUrl = ref('')
const cloning = ref(false)
const progressMessage = ref('')
const progressPercent = ref(0)
const error = ref('')

const examples = [
  {
    name: 'Vue 3 Starter',
    url: 'https://github.com/vuejs/create-vue.git'
  },
  {
    name: 'React Starter',
    url: 'https://github.com/facebook/create-react-app.git'
  },
  {
    name: 'Simple Web Page',
    url: 'https://github.com/github/personal-website.git'
  }
]

watch(() => props.visible, (newVal) => {
  if (!newVal) {
    // Reset state when dialog closes
    repoUrl.value = ''
    cloning.value = false
    progressMessage.value = ''
    progressPercent.value = 0
    error.value = ''
  }
})

async function handleClone() {
  if (!repoUrl.value || cloning.value) return

  cloning.value = true
  error.value = ''
  progressMessage.value = 'Initializing clone...'
  progressPercent.value = 0

  try {
    const result = await gitStore.clone(repoUrl.value, (progress) => {
      if (progress.phase === 'Receiving objects') {
        progressMessage.value = `Receiving objects: ${progress.loaded}/${progress.total}`
        progressPercent.value = (progress.loaded / progress.total) * 100
      } else if (progress.phase === 'Resolving deltas') {
        progressMessage.value = `Resolving deltas: ${progress.loaded}/${progress.total}`
        progressPercent.value = (progress.loaded / progress.total) * 100
      } else {
        progressMessage.value = progress.phase || 'Cloning...'
      }
    })

    if (result.success) {
      progressMessage.value = 'Clone complete!'
      progressPercent.value = 100

      // Wait a moment to show completion
      setTimeout(() => {
        emit('cloned', result)
        close()
      }, 500)
    } else {
      error.value = result.error || 'Clone failed'
      cloning.value = false
    }
  } catch (err) {
    error.value = err.message || 'Clone failed'
    cloning.value = false
  }
}

function close() {
  if (!cloning.value) {
    emit('close')
  }
}
</script>
