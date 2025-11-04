<template>
  <div class="w-64 flex flex-col border-r border-base-300 bg-base-100 flex-shrink-0">
    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-base-300 bg-base-200">
      <span class="font-semibold text-sm">Files</span>
      <div class="flex gap-1">
        <button
          @click="showNewFileDialog"
          class="btn btn-xs btn-ghost"
          title="New File (Ctrl+N)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
        <button
          @click="showNewFolderDialog"
          class="btn btn-xs btn-ghost"
          title="New Folder"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
        </button>
        <button
          @click="collapseAll"
          class="btn btn-xs btn-ghost"
          title="Collapse All"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
    </div>

    <!-- File Tree -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden py-2">
      <FileTreeItem
        v-for="(child, childName) in fsStore.fileTree.children"
        :key="childName"
        :name="childName"
        :item="child"
        :path="'/' + childName"
        :depth="0"
      />
    </div>

    <!-- New File Dialog -->
    <div v-if="newFileDialogVisible" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">New File</h3>
        <div class="form-control">
          <label class="label">
            <span class="label-text">File name</span>
          </label>
          <input
            ref="newFileInput"
            v-model="newFileName"
            @keyup.enter="createNewFile"
            @keyup.escape="hideNewFileDialog"
            type="text"
            placeholder="example.js"
            class="input input-bordered w-full"
          />
        </div>
        <div class="modal-action">
          <button @click="hideNewFileDialog" class="btn btn-ghost">Cancel</button>
          <button @click="createNewFile" class="btn btn-primary">Create</button>
        </div>
      </div>
    </div>

    <!-- New Folder Dialog -->
    <div v-if="newFolderDialogVisible" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">New Folder</h3>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Folder name</span>
          </label>
          <input
            ref="newFolderInput"
            v-model="newFolderName"
            @keyup.enter="createNewFolder"
            @keyup.escape="hideNewFolderDialog"
            type="text"
            placeholder="components"
            class="input input-bordered w-full"
          />
        </div>
        <div class="modal-action">
          <button @click="hideNewFolderDialog" class="btn btn-ghost">Cancel</button>
          <button @click="createNewFolder" class="btn btn-primary">Create</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useFileSystemStore } from '../stores/fileSystem'
import FileTreeItem from './FileTreeItem.vue'

const fsStore = useFileSystemStore()

// Dialog state
const newFileDialogVisible = ref(false)
const newFolderDialogVisible = ref(false)
const newFileName = ref('')
const newFolderName = ref('')

// Refs for auto-focus
const newFileInput = ref(null)
const newFolderInput = ref(null)

function showNewFileDialog() {
  newFileDialogVisible.value = true
  newFileName.value = ''
  nextTick(() => {
    newFileInput.value?.focus()
  })
}

function hideNewFileDialog() {
  newFileDialogVisible.value = false
  newFileName.value = ''
}

function createNewFile() {
  if (!newFileName.value.trim()) {
    alert('Please enter a file name')
    return
  }

  try {
    const path = '/' + newFileName.value.trim()
    fsStore.createFile(path, '')
    fsStore.activeFilePath = path
    hideNewFileDialog()
  } catch (error) {
    alert(error.message)
  }
}

function showNewFolderDialog() {
  newFolderDialogVisible.value = true
  newFolderName.value = ''
  nextTick(() => {
    newFolderInput.value?.focus()
  })
}

function hideNewFolderDialog() {
  newFolderDialogVisible.value = false
  newFolderName.value = ''
}

function createNewFolder() {
  if (!newFolderName.value.trim()) {
    alert('Please enter a folder name')
    return
  }

  try {
    const path = '/' + newFolderName.value.trim()
    fsStore.createDirectory(path)
    hideNewFolderDialog()
  } catch (error) {
    alert(error.message)
  }
}

function collapseAll() {
  fsStore.collapseAll()
}

// Keyboard shortcuts
function handleKeyDown(e) {
  // Ctrl+N or Cmd+N for new file
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault()
    showNewFileDialog()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>
