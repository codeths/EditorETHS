<template>
  <div v-if="visible" class="modal modal-open">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg mb-4">Export Files</h3>

      <!-- Select All / Deselect All -->
      <div class="flex justify-between items-center mb-4 pb-3 border-b border-base-300">
        <div class="flex gap-2">
          <button @click="selectAll" class="btn btn-sm btn-ghost">
            Select All
          </button>
          <button @click="deselectAll" class="btn btn-sm btn-ghost">
            Deselect All
          </button>
        </div>
        <span class="text-sm opacity-70">
          {{ selectedFiles.size }} of {{ allFiles.length }} selected
        </span>
      </div>

      <!-- File List -->
      <div class="max-h-96 overflow-y-auto">
        <div
          v-for="filePath in allFiles"
          :key="filePath"
          class="flex items-center gap-2 px-2 py-2 hover:bg-base-200 rounded cursor-pointer"
          @click="toggleFile(filePath)"
        >
          <input
            type="checkbox"
            :checked="selectedFiles.has(filePath)"
            @change="toggleFile(filePath)"
            class="checkbox checkbox-sm checkbox-primary"
            @click.stop
          />
          <span class="text-sm font-mono">{{ filePath }}</span>
        </div>
        <div v-if="allFiles.length === 0" class="text-center py-8 text-base-content opacity-50">
          No files to export
        </div>
      </div>

      <!-- Project Name -->
      <div class="form-control mt-4">
        <label class="label">
          <span class="label-text">Export filename</span>
        </label>
        <input
          v-model="exportName"
          type="text"
          placeholder="my-project"
          class="input input-bordered w-full"
        />
        <label class="label">
          <span class="label-text-alt">Will be exported as {{ exportName }}.zip</span>
        </label>
      </div>

      <!-- Actions -->
      <div class="modal-action">
        <button @click="cancel" class="btn btn-ghost">Cancel</button>
        <button
          @click="exportFiles"
          :disabled="selectedFiles.size === 0 || isExporting"
          class="btn btn-primary"
        >
          <span v-if="isExporting" class="loading loading-spinner loading-sm"></span>
          <span v-else>Export {{ selectedFiles.size }} file{{ selectedFiles.size !== 1 ? 's' : '' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useFileSystemStore } from '../stores/fileSystem'
import { getAllFilePaths, exportFilesToZip } from '../composables/useFileExport'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'export'])

const fsStore = useFileSystemStore()

const selectedFiles = ref(new Set())
const exportName = ref('project')
const isExporting = ref(false)

// Get all file paths from the file tree
const allFiles = computed(() => {
  return getAllFilePaths(fsStore.fileTree)
})

// Select all files when dialog opens
watch(() => props.visible, (visible) => {
  if (visible) {
    selectAll()
  }
})

function selectAll() {
  selectedFiles.value = new Set(allFiles.value)
}

function deselectAll() {
  selectedFiles.value = new Set()
}

function toggleFile(filePath) {
  if (selectedFiles.value.has(filePath)) {
    selectedFiles.value.delete(filePath)
  } else {
    selectedFiles.value.add(filePath)
  }
  // Force reactivity
  selectedFiles.value = new Set(selectedFiles.value)
}

async function exportFiles() {
  if (selectedFiles.value.size === 0) return

  isExporting.value = true
  try {
    await exportFilesToZip(fsStore.fileTree, selectedFiles.value, exportName.value)
    emit('export', { count: selectedFiles.value.size, name: exportName.value })
    cancel()
  } catch (error) {
    console.error('Export failed:', error)
    alert('Export failed: ' + error.message)
  } finally {
    isExporting.value = false
  }
}

function cancel() {
  emit('close')
}
</script>
