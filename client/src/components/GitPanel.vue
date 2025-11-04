<template>
  <div class="flex flex-col h-full bg-base-100">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-base-300 bg-base-200">
      <div class="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <span class="font-semibold">Git</span>
      </div>
      <div class="flex gap-1">
        <button @click="refreshStatus" class="btn btn-xs btn-ghost" title="Refresh">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button @click="$emit('close')" class="btn btn-xs btn-ghost btn-circle">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Not Initialized State -->
    <div v-if="!gitStore.isInitialized" class="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      <h3 class="text-lg font-semibold mb-2">No Git Repository</h3>
      <p class="text-sm opacity-70 mb-4">Clone a repository or initialize a new one</p>
      <div class="flex gap-2">
        <button @click="$emit('clone')" class="btn btn-primary btn-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Clone Repository
        </button>
        <button @click="initRepo" class="btn btn-outline btn-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Initialize
        </button>
      </div>
    </div>

    <!-- Initialized State -->
    <div v-else class="flex-1 flex flex-col overflow-hidden">
      <!-- Branch Info -->
      <div class="px-4 py-2 border-b border-base-300 flex items-center justify-between">
        <button @click="$emit('branches')" class="btn btn-xs btn-ghost gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          {{ gitStore.currentBranch }}
        </button>
        <div class="flex gap-1">
          <button @click="syncToGit" class="btn btn-xs btn-ghost" title="Sync changes">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Changes List -->
      <div class="flex-1 overflow-y-auto">
        <!-- No Changes -->
        <div v-if="!gitStore.status || gitStore.status.length === 0" class="p-4 text-center text-sm opacity-70">
          No changes
        </div>

        <!-- Changes -->
        <div v-else class="divide-y divide-base-300">
          <div
            v-for="file in gitStore.status"
            :key="file.filepath"
            class="px-4 py-2 hover:bg-base-200 flex items-center gap-2 group"
          >
            <!-- Status Icon -->
            <span
              class="badge badge-xs"
              :class="{
                'badge-success': file.state === 'added',
                'badge-warning': file.state === 'modified',
                'badge-error': file.state === 'deleted',
                'badge-ghost': file.state === 'untracked'
              }"
            >
              {{ getStatusLabel(file.state) }}
            </span>

            <!-- Filename -->
            <span class="flex-1 font-mono text-sm truncate">{{ file.filepath }}</span>

            <!-- Actions -->
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                v-if="!file.staged"
                @click="stageFile(file.filepath)"
                class="btn btn-xs btn-ghost"
                title="Stage"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                v-else
                @click="unstageFile(file.filepath)"
                class="btn btn-xs btn-ghost"
                title="Unstage"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Commit Section -->
      <div class="border-t border-base-300 p-4 space-y-3">
        <textarea
          v-model="commitMessage"
          placeholder="Commit message..."
          class="textarea textarea-bordered w-full text-sm"
          rows="3"
        ></textarea>
        <div class="flex gap-2">
          <button
            @click="handleCommit"
            :disabled="!commitMessage.trim() || !hasStagedFiles"
            class="btn btn-primary btn-sm flex-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Commit
          </button>
          <button @click="$emit('history')" class="btn btn-outline btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useGitStore } from '../stores/git'

defineEmits(['close', 'clone', 'branches', 'history'])

const gitStore = useGitStore()
const commitMessage = ref('')

const hasStagedFiles = computed(() => {
  return gitStore.status.some(file => file.staged)
})

onMounted(() => {
  if (gitStore.isInitialized) {
    refreshStatus()
  }
})

async function initRepo() {
  await gitStore.init()
  refreshStatus()
}

async function refreshStatus() {
  if (gitStore.isInitialized) {
    await gitStore.getStatus()
  }
}

async function syncToGit() {
  await gitStore.syncFileSystemToGit()
  await refreshStatus()
}

async function stageFile(filepath) {
  await gitStore.add(filepath)
}

async function unstageFile(filepath) {
  await gitStore.reset(filepath)
}

async function handleCommit() {
  if (!commitMessage.value.trim() || !hasStagedFiles.value) return

  const result = await gitStore.commit(commitMessage.value)
  if (result.success) {
    commitMessage.value = ''
  }
}

function getStatusLabel(state) {
  const labels = {
    added: 'A',
    modified: 'M',
    deleted: 'D',
    untracked: 'U'
  }
  return labels[state] || '?'
}
</script>
