<template>
  <div
    v-if="visible"
    class="absolute top-0 right-0 z-[10] bg-base-200 border border-base-300 rounded-lg shadow-xl m-4"
    style="width: 400px;"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-2 border-b border-base-300">
      <span class="font-semibold text-sm">Find & Replace</span>
      <button @click="close" class="btn btn-xs btn-ghost btn-circle">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Find Input -->
    <div class="p-4 space-y-3">
      <div class="flex gap-2">
        <div class="relative flex-1">
          <input
            ref="findInput"
            v-model="findText"
            @input="handleFindInput"
            @keydown.enter="findNext"
            @keydown.esc="close"
            type="text"
            placeholder="Find..."
            class="input input-sm input-bordered w-full pr-16"
          />
          <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs opacity-60">
            <span v-if="findText">{{ currentMatchIndex + 1 }}/{{ totalMatches }}</span>
          </div>
        </div>
        <button
          @click="findPrevious"
          :disabled="!findText || totalMatches === 0"
          class="btn btn-sm btn-ghost"
          title="Previous match (Shift+Enter)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          @click="findNext"
          :disabled="!findText || totalMatches === 0"
          class="btn btn-sm btn-ghost"
          title="Next match (Enter)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <!-- Replace Input (shown when expanded) -->
      <div v-if="showReplace" class="space-y-2">
        <input
          v-model="replaceText"
          @keydown.enter="replaceNext"
          @keydown.esc="close"
          type="text"
          placeholder="Replace..."
          class="input input-sm input-bordered w-full"
        />
        <div class="flex gap-2">
          <button
            @click="replaceNext"
            :disabled="!findText || totalMatches === 0"
            class="btn btn-sm btn-primary flex-1"
          >
            Replace
          </button>
          <button
            @click="replaceAll"
            :disabled="!findText || totalMatches === 0"
            class="btn btn-sm btn-primary flex-1"
          >
            Replace All
          </button>
        </div>
      </div>

      <!-- Options -->
      <div class="flex items-center gap-4 text-xs">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            v-model="matchCase"
            @change="handleFindInput"
            type="checkbox"
            class="checkbox checkbox-xs checkbox-primary"
          />
          <span>Match Case</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            v-model="matchWholeWord"
            @change="handleFindInput"
            type="checkbox"
            class="checkbox checkbox-xs checkbox-primary"
          />
          <span>Whole Word</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            v-model="useRegex"
            @change="handleFindInput"
            type="checkbox"
            class="checkbox checkbox-xs checkbox-primary"
          />
          <span>Regex</span>
        </label>
        <button
          @click="toggleReplace"
          class="ml-auto btn btn-xs btn-ghost"
        >
          {{ showReplace ? 'Hide' : 'Replace' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  content: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'find', 'replace', 'replaceAll'])

const findInput = ref(null)
const findText = ref('')
const replaceText = ref('')
const showReplace = ref(false)
const matchCase = ref(false)
const matchWholeWord = ref(false)
const useRegex = ref(false)

const matches = ref([])
const currentMatchIndex = ref(-1)
const totalMatches = ref(0)

watch(() => props.visible, (newVal) => {
  if (newVal) {
    nextTick(() => {
      findInput.value?.focus()
    })
  } else {
    // Reset state when closed
    findText.value = ''
    replaceText.value = ''
    matches.value = []
    currentMatchIndex.value = -1
    totalMatches.value = 0
  }
})

function toggleReplace() {
  showReplace.value = !showReplace.value
}

function handleFindInput() {
  if (!findText.value) {
    matches.value = []
    currentMatchIndex.value = -1
    totalMatches.value = 0
    emit('find', { matches: [], currentIndex: -1 })
    return
  }

  // Find all matches
  const searchMatches = findAllMatches(props.content, findText.value)
  matches.value = searchMatches
  totalMatches.value = searchMatches.length
  currentMatchIndex.value = searchMatches.length > 0 ? 0 : -1

  emit('find', {
    matches: searchMatches,
    currentIndex: currentMatchIndex.value
  })
}

function findAllMatches(content, searchText) {
  if (!searchText) return []

  const allMatches = []
  let flags = 'g'
  if (!matchCase.value) flags += 'i'

  let pattern = searchText
  if (!useRegex.value) {
    // Escape special regex characters
    pattern = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  if (matchWholeWord.value) {
    pattern = `\\b${pattern}\\b`
  }

  try {
    const regex = new RegExp(pattern, flags)
    let match

    while ((match = regex.exec(content)) !== null) {
      allMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0]
      })
      // Prevent infinite loop on zero-width matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++
      }
    }
  } catch (error) {
    console.error('Regex error:', error)
  }

  return allMatches
}

function findNext() {
  if (matches.value.length === 0) return

  currentMatchIndex.value = (currentMatchIndex.value + 1) % matches.value.length
  emit('find', {
    matches: matches.value,
    currentIndex: currentMatchIndex.value
  })
}

function findPrevious() {
  if (matches.value.length === 0) return

  currentMatchIndex.value = (currentMatchIndex.value - 1 + matches.value.length) % matches.value.length
  emit('find', {
    matches: matches.value,
    currentIndex: currentMatchIndex.value
  })
}

function replaceNext() {
  if (matches.value.length === 0 || currentMatchIndex.value < 0) return

  emit('replace', {
    match: matches.value[currentMatchIndex.value],
    replaceText: replaceText.value
  })

  // After replace, re-search to update matches
  setTimeout(() => {
    handleFindInput()
  }, 50)
}

function replaceAll() {
  if (matches.value.length === 0) return

  emit('replaceAll', {
    matches: matches.value,
    replaceText: replaceText.value
  })

  // After replace all, re-search
  setTimeout(() => {
    handleFindInput()
  }, 50)
}

function close() {
  emit('close')
}

// Expose methods for parent component
defineExpose({
  focus: () => findInput.value?.focus()
})
</script>
