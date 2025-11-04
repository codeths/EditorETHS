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
      <span class="text-base">{{ getIcon() }}</span>

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
          class="w-full px-4 py-2 text-left hover:bg-base-300 text-sm flex items-center gap-2"
        >
          <span>📂</span> Open
        </button>
        <button
          @click="rename"
          class="w-full px-4 py-2 text-left hover:bg-base-300 text-sm flex items-center gap-2"
        >
          <span>✏️</span> Rename
        </button>
        <button
          v-if="!isDirectory"
          @click="duplicate"
          class="w-full px-4 py-2 text-left hover:bg-base-300 text-sm flex items-center gap-2"
        >
          <span>📋</span> Duplicate
        </button>
        <div class="divider my-1"></div>
        <button
          @click="deleteItem"
          class="w-full px-4 py-2 text-left hover:bg-error hover:text-error-content text-sm flex items-center gap-2 text-error"
        >
          <span>🗑️</span> Delete
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useFileSystemStore } from '../stores/fileSystem'

const props = defineProps({
  name: String,
  item: Object,
  path: String,
  depth: { type: Number, default: 0 }
})

const fsStore = useFileSystemStore()

const expanded = ref(fsStore.isDirectoryExpanded(props.path))
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

const isDirectory = computed(() => props.item.type === 'directory')
const isActive = computed(() => !isDirectory.value && fsStore.activeFilePath === props.path)
const isModified = computed(() => fsStore.isFileModified(props.path))

function getIcon() {
  if (isDirectory.value) {
    return expanded.value ? '📂' : '📁'
  }

  const ext = props.name.split('.').pop()?.toLowerCase()
  const icons = {
    'ts': '🔷',
    'tsx': '⚛️',
    'js': '📜',
    'jsx': '⚛️',
    'html': '🌐',
    'css': '🎨',
    'scss': '🎨',
    'json': '📋',
    'md': '📝',
    'png': '🖼️',
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'gif': '🖼️',
    'svg': '🎨',
    'mp4': '🎥',
    'webm': '🎥',
    'mp3': '🎵',
    'wav': '🎵'
  }
  return icons[ext] || '📄'
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
