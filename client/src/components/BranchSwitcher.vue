<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" @click.self="close">
    <div class="bg-base-100 rounded-lg shadow-xl w-full max-w-md m-4">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-base-300">
        <h3 class="text-lg font-semibold">Branches</h3>
        <button @click="close" class="btn btn-sm btn-ghost btn-circle">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="px-6 py-4 space-y-4">
        <!-- Create New Branch -->
        <div class="flex gap-2">
          <input
            v-model="newBranchName"
            type="text"
            placeholder="New branch name..."
            class="input input-sm input-bordered flex-1"
            @keydown.enter="handleCreateBranch"
          />
          <button
            @click="handleCreateBranch"
            :disabled="!newBranchName.trim()"
            class="btn btn-sm btn-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <!-- Branch List -->
        <div class="space-y-1 max-h-96 overflow-y-auto">
          <div
            v-for="branch in gitStore.branches"
            :key="branch"
            @click="switchBranch(branch)"
            class="flex items-center gap-2 px-3 py-2 rounded hover:bg-base-200 cursor-pointer"
            :class="{ 'bg-primary text-primary-content': branch === gitStore.currentBranch }"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span class="flex-1 font-mono text-sm">{{ branch }}</span>
            <svg
              v-if="branch === gitStore.currentBranch"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="gitStore.branches.length === 0" class="text-center py-8 opacity-70">
          <p class="text-sm">No branches found</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 px-6 py-4 border-t border-base-300">
        <button @click="close" class="btn btn-sm">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useGitStore } from '../stores/git'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const gitStore = useGitStore()
const newBranchName = ref('')

watch(() => props.visible, async (newVal) => {
  if (newVal) {
    await gitStore.loadBranches()
  } else {
    newBranchName.value = ''
  }
})

onMounted(async () => {
  if (props.visible && gitStore.isInitialized) {
    await gitStore.loadBranches()
  }
})

async function handleCreateBranch() {
  if (!newBranchName.value.trim()) return

  const result = await gitStore.createBranch(newBranchName.value.trim())
  if (result.success) {
    newBranchName.value = ''
  }
}

async function switchBranch(branchName) {
  if (branchName === gitStore.currentBranch) return

  await gitStore.checkout(branchName)
}

function close() {
  emit('close')
}
</script>
