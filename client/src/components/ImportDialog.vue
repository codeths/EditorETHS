<template>
  <div v-if="visible" class="modal modal-open">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg mb-4">Import Files</h3>

      <!-- Step 1: File Selection -->
      <div v-if="!previewFiles.length">
        <div class="border-2 border-dashed border-base-300 rounded-lg p-8 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-12 h-12 mx-auto mb-4 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p class="mb-4 text-sm opacity-70">
            Select a ZIP file to import files into your project
          </p>
          <input
            ref="fileInput"
            type="file"
            accept=".zip"
            @change="handleFileSelect"
            class="hidden"
          />
          <button @click="$refs.fileInput.click()" class="btn btn-primary">
            Choose ZIP File
          </button>
        </div>
      </div>

      <!-- Step 2: Preview and Confirm -->
      <div v-else>
        <div class="alert alert-info mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="stroke-current shrink-0 w-6 h-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <div>
            <h4 class="font-bold">Import Mode</h4>
            <div class="text-sm">
              Choose how to import these files
            </div>
          </div>
        </div>

        <!-- Import Mode Selection -->
        <div class="flex gap-2 mb-4">
          <label class="label cursor-pointer flex-1 border rounded-lg p-3" :class="importMode === 'merge' && 'border-primary bg-primary/10'">
            <span class="label-text flex-1">
              <div class="font-semibold">Merge</div>
              <div class="text-xs opacity-70">Add files, keep existing</div>
            </span>
            <input
              type="radio"
              value="merge"
              v-model="importMode"
              class="radio radio-primary"
            />
          </label>
          <label class="label cursor-pointer flex-1 border rounded-lg p-3" :class="importMode === 'replace' && 'border-primary bg-primary/10'">
            <span class="label-text flex-1">
              <div class="font-semibold">Replace</div>
              <div class="text-xs opacity-70">Clear all, import only these</div>
            </span>
            <input
              type="radio"
              value="replace"
              v-model="importMode"
              class="radio radio-primary"
            />
          </label>
        </div>

        <!-- File Preview -->
        <div class="bg-base-200 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="font-semibold text-sm">Files to import:</span>
            <span class="text-sm opacity-70">{{ previewFiles.length }} files</span>
          </div>
          <div class="max-h-64 overflow-y-auto">
            <div
              v-for="file in previewFiles"
              :key="file.path"
              class="flex items-center justify-between px-2 py-1 text-sm font-mono hover:bg-base-300 rounded"
            >
              <span>{{ file.path }}</span>
              <span class="text-xs opacity-50">{{ formatFileSize(file.size) }}</span>
            </div>
          </div>
        </div>

        <!-- Warning for replace mode -->
        <div v-if="importMode === 'replace'" class="alert alert-warning mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>This will delete all existing files and folders!</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-action">
        <button @click="cancel" class="btn btn-ghost">Cancel</button>
        <button
          v-if="previewFiles.length"
          @click="back"
          class="btn btn-ghost"
        >
          Back
        </button>
        <button
          v-if="previewFiles.length"
          @click="confirmImport"
          :disabled="isImporting"
          class="btn btn-primary"
        >
          <span v-if="isImporting" class="loading loading-spinner loading-sm"></span>
          <span v-else>Import {{ previewFiles.length }} files</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useFileSystemStore } from '../stores/fileSystem'
import { getZipPreview, importFilesFromZip } from '../composables/useFileExport'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'import'])

const fsStore = useFileSystemStore()

const fileInput = ref(null)
const selectedFile = ref(null)
const previewFiles = ref([])
const importMode = ref('merge')
const isImporting = ref(false)

// Reset when dialog opens/closes
watch(() => props.visible, (visible) => {
  if (!visible) {
    reset()
  }
})

function reset() {
  selectedFile.value = null
  previewFiles.value = []
  importMode.value = 'merge'
  isImporting.value = false
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function handleFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  selectedFile.value = file

  try {
    // Get preview of files in ZIP
    previewFiles.value = await getZipPreview(file)
  } catch (error) {
    console.error('Failed to read ZIP:', error)
    alert('Failed to read ZIP file: ' + error.message)
    reset()
  }
}

function back() {
  previewFiles.value = []
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function confirmImport() {
  if (!selectedFile.value) return

  isImporting.value = true
  try {
    // Import the file tree from ZIP
    const importedTree = await importFilesFromZip(selectedFile.value)

    if (importMode.value === 'replace') {
      // Replace entire file tree
      fsStore.fileTree = importedTree
      fsStore.activeFilePath = '/index.html' // Default to index.html if it exists
    } else {
      // Merge with existing tree
      mergeFileTree(fsStore.fileTree, importedTree)
    }

    // Auto-detect preview files after import
    fsStore.autoDetectPreviewFiles()

    emit('import', {
      count: previewFiles.value.length,
      mode: importMode.value
    })
    cancel()
  } catch (error) {
    console.error('Import failed:', error)
    alert('Import failed: ' + error.message)
  } finally {
    isImporting.value = false
  }
}

function mergeFileTree(target, source) {
  // Merge source tree into target tree
  if (source.type === 'directory' && source.children) {
    if (!target.children) {
      target.children = {}
    }

    for (const [name, child] of Object.entries(source.children)) {
      if (target.children[name]) {
        if (target.children[name].type === 'directory' && child.type === 'directory') {
          // Recursively merge directories
          mergeFileTree(target.children[name], child)
        } else {
          // Replace file/directory
          target.children[name] = JSON.parse(JSON.stringify(child))
        }
      } else {
        // Add new file/directory
        target.children[name] = JSON.parse(JSON.stringify(child))
      }
    }
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function cancel() {
  emit('close')
  reset()
}
</script>
