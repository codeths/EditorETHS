<template>
  <div>
    <!-- File/Folder Row -->
    <div
      @click="handleClick"
      @contextmenu.prevent="showContextMenu"
      :class="[
        'flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-base-300 transition-colors',
        isActive && 'bg-primary text-primary-content',
        'text-sm'
      ]"
      :style="{ paddingLeft: (depth * 12 + 8) + 'px' }"
    >
      <!-- Expand arrow for directories -->
      <button
        v-if="isDirectory"
        @click.stop="toggleExpand"
        class="w-4 h-4 flex items-center justify-center hover:bg-base-100 rounded"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-3 h-3 transition-transform"
          :class="expanded && 'rotate-90'"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <span v-else class="w-4"></span>

      <!-- Icon -->
      <component :is="getIcon()" class="w-4 h-4 flex-shrink-0" />

      <!-- Name -->
      <span class="flex-1 truncate">{{ name }}</span>

      <!-- Modified indicator -->
      <span v-if="!isDirectory && isModified" class="w-2 h-2 rounded-full bg-warning"></span>
    </div>

    <!-- Children (if directory and expanded) -->
    <div v-if="isDirectory && expanded">
      <FileTreeItem
        v-for="(child, childName) in item.children"
        :key="childName"
        :name="childName"
        :item="child"
        :path="path + '/' + childName"
        :depth="depth + 1"
      />
    </div>

    <!-- Context Menu -->
    <Teleport to="body">
      <div
        v-if="contextMenuVisible"
        class="fixed bg-base-200 border border-base-300 rounded shadow-lg z-[100] py-1 min-w-[180px]"
        :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
        @click="hideContextMenu"
      >
        <button
          v-if="!isDirectory"
          @click="openFile"
          class="w-full px-4 py-2 text-left hover:bg-base-300 text-sm"
        >
          Open
        </button>
        <button
          @click="rename"
          class="w-full px-4 py-2 text-left hover:bg-base-300 text-sm"
        >
          Rename
        </button>
        <button
          v-if="!isDirectory"
          @click="duplicate"
          class="w-full px-4 py-2 text-left hover:bg-base-300 text-sm"
        >
          Duplicate
        </button>
        <div class="divider my-1"></div>
        <button
          @click="deleteItem"
          class="w-full px-4 py-2 text-left hover:bg-error hover:text-error-content text-sm text-error"
        >
          Delete
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useFileSystemStore } from '../stores/fileSystem'
import { useCollaborationStore } from '../stores/collaboration'

const props = defineProps({
  name: String,
  item: Object,
  path: String,
  depth: { type: Number, default: 0 }
})

const fsStore = useFileSystemStore()
const collabStore = useCollaborationStore()

const expanded = ref(fsStore.isDirectoryExpanded(props.path))
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

const isDirectory = computed(() => props.item.type === 'directory')
const isActive = computed(() => !isDirectory.value && fsStore.activeFilePath === props.path)
const isModified = computed(() => fsStore.isFileModified(props.path))

function getIcon() {
  if (isDirectory.value) {
    // Folder icon
    return {
      template: `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      `
    }
  }

  const ext = props.name.split('.').pop()?.toLowerCase()

  // Code files
  if (['js', 'jsx', 'ts', 'tsx', 'json'].includes(ext)) {
    return {
      template: `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      `
    }
  }

  // Style files
  if (['css', 'scss', 'sass', 'less'].includes(ext)) {
    return {
      template: `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
        </svg>
      `
    }
  }

  // HTML files
  if (ext === 'html' || ext === 'htm') {
    return {
      template: `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      `
    }
  }

  // Markdown files
  if (ext === 'md' || ext === 'markdown') {
    return {
      template: `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      `
    }
  }

  // Image files
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(ext)) {
    return {
      template: `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      `
    }
  }

  // Video files
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) {
    return {
      template: `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" />
        </svg>
      `
    }
  }

  // Default file icon
  return {
    template: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    `
  }
}

function toggleExpand() {
  if (isDirectory.value) {
    expanded.value = !expanded.value
    fsStore.toggleDirectory(props.path)
  }
}

function handleClick() {
  if (isDirectory.value) {
    toggleExpand()
  } else {
    fsStore.activeFilePath = props.path
  }
}

function showContextMenu(e) {
  contextMenuX.value = e.clientX
  contextMenuY.value = e.clientY
  contextMenuVisible.value = true
}

function hideContextMenu() {
  contextMenuVisible.value = false
}

function openFile() {
  if (!isDirectory.value) {
    fsStore.activeFilePath = props.path
  }
  hideContextMenu()
}

function rename() {
  const newName = prompt('New name:', props.name)
  if (newName && newName !== props.name) {
    try {
      const newPath = props.path.replace(props.name, newName)
      fsStore.renameItem(props.path, newPath)

      // Emit collaboration event
      collabStore.emitFileRenamed(props.path, newPath)
    } catch (error) {
      alert(error.message)
    }
  }
  hideContextMenu()
}

function duplicate() {
  if (!isDirectory.value) {
    const file = fsStore.getFile(props.path)
    if (file) {
      const baseName = props.name.replace(/\.[^.]+$/, '')
      const ext = props.name.match(/\.[^.]+$/)?.[0] || ''
      const newName = `${baseName}-copy${ext}`
      const dirPath = props.path.substring(0, props.path.lastIndexOf('/'))
      const newPath = `${dirPath}/${newName}`

      try {
        fsStore.createFile(newPath, file.content, file.binary)

        // Emit collaboration event
        collabStore.emitFileCreated(newPath, file.content, file.binary)
      } catch (error) {
        alert(error.message)
      }
    }
  }
  hideContextMenu()
}

function deleteItem() {
  const confirmMsg = isDirectory.value
    ? `Delete folder "${props.name}" and all its contents?`
    : `Delete "${props.name}"?`

  if (confirm(confirmMsg)) {
    try {
      fsStore.deleteItem(props.path)

      // Emit collaboration event
      collabStore.emitFileDeleted(props.path)
    } catch (error) {
      alert(error.message)
    }
  }
  hideContextMenu()
}

// Close context menu on outside click
function handleOutsideClick(e) {
  if (contextMenuVisible.value) {
    hideContextMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>
