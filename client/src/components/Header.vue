<template>
  <div class="bg-base-200 border-b border-base-300 px-5 py-3">
    <div class="flex justify-between items-center">
      <!-- Left Section -->
      <div class="flex items-center gap-4">
        <button
          @click="toggleMenu"
          class="btn btn-sm btn-square btn-ghost"
          title="Projects Menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-6 h-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>

        <input
          v-model="editableProjectName"
          @blur="updateProjectName"
          @keyup.enter="$event.target.blur()"
          type="text"
          class="text-lg font-semibold bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-primary rounded px-2 py-1 -ml-2"
          placeholder="Project Name"
          maxlength="50"
        />
      </div>

      <!-- Right Section -->
      <div class="flex items-center gap-2">
        <button
          @click="openCollabMenu"
          class="btn btn-sm btn-ghost"
          :class="{ 'btn-success': inCollabSession }"
          title="Collaboration"
        >
          {{ inCollabSession ? 'In Session' : 'Collaborate' }}
        </button>

        <button
          @click="toggleFullscreen"
          class="btn btn-sm btn-ghost"
          title="Fullscreen (F11)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5 h-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Collaboration Menu Modal -->
    <div v-if="showCollabMenu" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Collaboration</h3>

        <div v-if="!inCollabSession" class="space-y-4">
          <!-- Name Input -->
          <div>
            <label class="label">
              <span class="label-text">Your Name</span>
            </label>
            <input
              v-model="userName"
              type="text"
              placeholder="Enter your name"
              class="input input-bordered w-full"
              maxlength="20"
            />
          </div>

          <button @click="createRoom" class="btn btn-primary w-full">
            Create Collaboration Room
          </button>

          <div class="divider">OR</div>

          <div>
            <input
              v-model="joinRoomCode"
              type="text"
              placeholder="Enter room code"
              class="input input-bordered w-full"
              @keyup.enter="joinRoom"
            />
            <button @click="joinRoom" class="btn btn-primary w-full mt-2">
              Join Room
            </button>
          </div>
        </div>

        <div v-else class="space-y-4">
          <div class="alert alert-success">
            <span>Connected to room: {{ roomCode }}</span>
          </div>

          <button @click="copyRoomCode" class="btn btn-ghost w-full">
            Copy Room Code
          </button>

          <button @click="leaveRoom" class="btn btn-error w-full">
            Leave Room
          </button>
        </div>

        <div class="modal-action">
          <button @click="closeCollabMenu" class="btn">Close</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '../stores/project'
import { useCollaborationStore } from '../stores/collaboration'
import { useUIStore } from '../stores/ui'
import { useEditorStore } from '../stores/editor'
import { useFileSystemStore } from '../stores/fileSystem'

const projectStore = useProjectStore()
const collabStore = useCollaborationStore()
const uiStore = useUIStore()
const editorStore = useEditorStore()
const fsStore = useFileSystemStore()

const joinRoomCode = ref('')
const userName = ref('')
const editableProjectName = ref('')

const currentProjectName = computed(() => projectStore.currentProjectName)
const inCollabSession = computed(() => collabStore.inCollabSession)
const showCollabMenu = computed(() => uiStore.showCollabMenu)
const roomCode = computed(() => collabStore.roomCode)

// Initialize editable project name
editableProjectName.value = currentProjectName.value

// Watch for project changes
watch(currentProjectName, (newName) => {
  editableProjectName.value = newName
})

function toggleMenu() {
  projectStore.toggleMenu()
}

function toggleFullscreen() {
  uiStore.toggleFullscreen()
}

function updateProjectName() {
  const newName = editableProjectName.value.trim()
  if (newName && newName !== projectStore.currentProjectName) {
    projectStore.currentProjectName = newName
    // Auto-save will trigger automatically via the watcher in App.vue
  } else if (!newName) {
    // Reset to current name if empty
    editableProjectName.value = projectStore.currentProjectName
  }
}

function openCollabMenu() {
  uiStore.openCollabMenu()
}

function closeCollabMenu() {
  uiStore.closeCollabMenu()
}

async function createRoom() {
  // Set user name (use default if empty)
  if (userName.value.trim()) {
    collabStore.userName = userName.value.trim()
  } else {
    collabStore.userName = 'Guest'
  }

  // Get current code state to share with room
  // Send entire file tree instead of just 3 files
  const currentState = {
    html: editorStore.htmlCode,
    css: editorStore.cssCode,
    js: editorStore.jsCode,
    fileTree: fsStore.fileTree // Send entire file tree to collaborators
  }

  const response = await collabStore.createRoom(currentState)
  if (response.success) {
    uiStore.showNotification('Room created!', 'success')
  } else {
    uiStore.showNotification('Failed to create room', 'error')
  }
}

async function joinRoom() {
  if (!joinRoomCode.value) return

  // Set user name (use default if empty)
  if (userName.value.trim()) {
    collabStore.userName = userName.value.trim()
  } else {
    collabStore.userName = 'Guest'
  }

  const response = await collabStore.joinRoom(joinRoomCode.value)
  if (response.success) {
    uiStore.showNotification('Joined room!', 'success')
    joinRoomCode.value = ''
  } else {
    uiStore.showNotification(response.error || 'Failed to join room', 'error')
  }
}

function leaveRoom() {
  collabStore.leaveRoom()
  uiStore.showNotification('Left collaboration session', 'info')
  closeCollabMenu()
}

function copyRoomCode() {
  navigator.clipboard.writeText(collabStore.roomCode)
  uiStore.showNotification('Room code copied!', 'success')
}
</script>
