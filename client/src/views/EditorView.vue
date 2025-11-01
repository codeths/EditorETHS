<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <Header />

    <div class="flex-1 flex overflow-hidden">
      <!-- Project Menu Sidebar -->
      <ProjectMenu />

      <!-- Main Editor Area -->
      <div ref="mainEditorContainer" class="flex-1 flex overflow-hidden relative">
        <div :style="{ width: editorWidth + '%' }" class="flex overflow-hidden">
          <CodeEditor />
        </div>

        <!-- Resize Handle -->
        <div
          @mousedown="startResize"
          class="w-1 bg-base-300 hover:bg-primary cursor-col-resize flex-shrink-0 transition-colors"
          title="Drag to resize"
        ></div>

        <div :style="{ width: (100 - editorWidth) + '%' }" class="flex overflow-hidden">
          <Preview />
        </div>
      </div>

      <!-- Collaboration Panel -->
      <CollaborationPanel />
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import Header from '../components/Header.vue'
import CodeEditor from '../components/CodeEditor.vue'
import Preview from '../components/Preview.vue'
import CollaborationPanel from '../components/CollaborationPanel.vue'
import ProjectMenu from '../components/ProjectMenu.vue'

// Resizable editor width
const editorWidth = ref(50) // Default 50%
const mainEditorContainer = ref(null)
let isResizing = false
let startX = 0
let startWidth = 0
let containerWidth = 0

function startResize(e) {
  isResizing = true
  startX = e.clientX
  startWidth = editorWidth.value

  // Get container width at start of resize
  if (mainEditorContainer.value) {
    containerWidth = mainEditorContainer.value.offsetWidth
  }

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

function handleResize(e) {
  if (!isResizing || !containerWidth) return

  const deltaX = e.clientX - startX
  const deltaPercent = (deltaX / containerWidth) * 100

  // Constrain between 20% and 80%
  const newWidth = Math.min(80, Math.max(20, startWidth + deltaPercent))
  editorWidth.value = newWidth
}

function stopResize() {
  isResizing = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''

  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>
