<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <Header />

    <div class="flex-1 flex overflow-hidden">
      <!-- Project Menu Sidebar -->
      <ProjectMenu />

      <!-- Main Editor Area -->
      <div class="flex-1 flex overflow-hidden">
        <CodeEditor />
        <Preview />
      </div>

      <!-- Collaboration Panel -->
      <CollaborationPanel />
    </div>
  </div>
</template>

<script setup>
import Header from '../components/Header.vue'
import CodeEditor from '../components/CodeEditor.vue'
import Preview from '../components/Preview.vue'
import CollaborationPanel from '../components/CollaborationPanel.vue'
import ProjectMenu from '../components/ProjectMenu.vue'
</script>
