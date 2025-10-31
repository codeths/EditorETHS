<template>
  <div
    v-if="inCollabSession && showParticipantsPanel"
    class="w-64 bg-base-200 border-l border-base-300 flex flex-col"
  >
    <!-- Room Code Display -->
    <div v-if="showRoomCodeDisplay" class="bg-base-300 p-4 border-b border-base-300">
      <div class="mb-2">
        <span class="text-xs opacity-70">Room Code</span>
      </div>
      <div class="flex items-center gap-2">
        <code class="flex-1 bg-base-100 px-3 py-2 rounded font-mono text-lg">
          {{ roomCode }}
        </code>
        <button
          @click="copyRoomCode"
          class="btn btn-sm btn-square btn-ghost"
          title="Copy Room Code"
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
              d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
            />
          </svg>
        </button>
      </div>
      <button
        @click="hideRoomCode"
        class="btn btn-xs btn-ghost w-full mt-2"
        title="Hide Room Code and Participants"
      >
        Hide
      </button>
    </div>

    <!-- Participants List -->
    <div class="flex-1 overflow-y-auto p-4">
      <h3 class="font-semibold mb-3 text-sm">
        Participants ({{ participants.length }})
      </h3>
      <div class="space-y-2">
        <div
          v-for="participant in participants"
          :key="participant.id"
          class="flex items-center gap-2 p-2 rounded bg-base-100"
        >
          <div
            class="w-2 h-2 rounded-full"
            :class="participant.isHost ? 'bg-success' : 'bg-primary'"
          ></div>
          <span class="flex-1 text-sm">{{ participant.name }}</span>
          <span v-if="participant.isHost" class="badge badge-xs badge-success">
            Host
          </span>
        </div>
      </div>
    </div>

    <!-- Show Button (when hidden) -->
  </div>

  <!-- Show Button (when panel is hidden but in collab session) -->
  <button
    v-if="inCollabSession && !showParticipantsPanel"
    @click="showPanel"
    class="absolute top-32 right-4 btn btn-sm btn-primary z-10"
    title="Show Collaboration Panel"
  >
    Show Panel
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useCollaborationStore } from '../stores/collaboration'
import { useUIStore } from '../stores/ui'

const collabStore = useCollaborationStore()
const uiStore = useUIStore()

const inCollabSession = computed(() => collabStore.inCollabSession)
const roomCode = computed(() => collabStore.roomCode)
const participants = computed(() => collabStore.participants)
const showRoomCodeDisplay = computed(() => collabStore.showRoomCodeDisplay)
const showParticipantsPanel = computed(() => collabStore.showParticipantsPanel)

function copyRoomCode() {
  navigator.clipboard.writeText(collabStore.roomCode)
  uiStore.showNotification('Room code copied!', 'success')
}

function hideRoomCode() {
  collabStore.hideRoomCode()
}

function showPanel() {
  collabStore.showRoomCode()
}
</script>
