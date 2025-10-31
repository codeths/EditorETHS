<template>
  <div class="flex-1 flex flex-col border-r border-base-300 overflow-hidden">
    <!-- Tabs -->
    <div class="tabs tabs-boxed bg-base-200 rounded-none border-b border-base-300 px-2 py-2">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="switchTab(tab.id)"
        :class="[
          'tab',
          activeTab === tab.id && 'tab-active'
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Editor Area with 2-Layer System -->
    <div class="flex-1 overflow-hidden bg-[#1e1e1e] flex">
      <!-- Line Numbers -->
      <div
        ref="lineNumbers"
        class="line-numbers bg-[#1e1e1e] text-[#858585] font-mono text-sm leading-[1.6] text-right select-none overflow-hidden border-r border-[#3e3e42] whitespace-pre px-3 py-5"
        style="min-width: 50px;"
      >
        <div v-for="lineNum in totalLines" :key="lineNum">{{ lineNum }}</div>
      </div>

      <!-- Editor Wrapper -->
      <div class="flex-1 relative overflow-hidden bg-[#1e1e1e]">
        <!-- Highlight Layer (Bottom) -->
        <pre
          ref="highlightLayer"
          class="absolute inset-0 m-0 p-5 border-0 overflow-hidden pointer-events-none z-[1] bg-transparent"
          style="scrollbar-width: none; -ms-overflow-style: none;"
        ><code
          ref="highlightCode"
          :class="`language-${getLanguageClass()}`"
          class="block m-0 p-0 border-0 bg-transparent font-mono text-sm leading-[1.6] whitespace-pre"
          v-html="highlightedCode"
        ></code></pre>

        <!-- Textarea (Top) -->
        <textarea
          ref="editorTextarea"
          v-model="currentCode"
          @input="handleCodeChange"
          @scroll="handleScroll"
          @keydown="handleKeyDown"
          class="absolute inset-0 w-full h-full p-5 m-0 border-0 bg-transparent resize-none overflow-auto z-[2] whitespace-pre focus:outline-none"
          style="color: transparent; caret-color: white; font-family: 'Consolas', 'Monaco', monospace; font-size: 14px; line-height: 1.6; tab-size: 4; -moz-tab-size: 4;"
          :placeholder="`Enter ${activeTab.toUpperCase()} code here...`"
          spellcheck="false"
        ></textarea>

        <!-- Emoji Autocomplete -->
        <div
          v-if="emojiSuggestions.length > 0"
          class="absolute bg-[#2d2d2d] border border-[#3e3e42] rounded shadow-lg z-[3] max-h-64 overflow-y-auto"
          :style="{ left: emojiPopupPos.x + 'px', top: emojiPopupPos.y + 'px' }"
        >
          <div
            v-for="(suggestion, index) in emojiSuggestions"
            :key="suggestion[0]"
            @click="selectEmoji(suggestion[0])"
            @mouseenter="selectedEmojiIndex = index"
            :class="[
              'px-3 py-2 cursor-pointer flex items-center gap-2',
              selectedEmojiIndex === index && 'bg-[#3e3e42]'
            ]"
          >
            <span class="text-xl">{{ suggestion[1] }}</span>
            <span class="text-sm text-[#dcdcdc]">:{{ suggestion[0] }}:</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Console -->
    <div class="border-t border-base-300 bg-base-200">
      <div class="flex justify-between items-center px-4 py-2 border-b border-base-300">
        <span class="font-semibold text-sm">Console</span>
        <button @click="clearConsole" class="btn btn-xs btn-ghost">Clear</button>
      </div>
      <div class="h-32 overflow-y-auto px-4 py-2 font-mono text-xs">
        <div
          v-for="(msg, index) in consoleMessages"
          :key="index"
          :class="[
            'py-1',
            msg.level === 'error' && 'text-error',
            msg.level === 'warn' && 'text-warning',
            msg.level === 'info' && 'text-info'
          ]"
        >
          <span class="opacity-50">{{ msg.timestamp }}</span>
          <span class="ml-2">{{ msg.message }}</span>
        </div>
        <div v-if="consoleMessages.length === 0" class="text-base-content opacity-50">
          Console output will appear here...
        </div>
      </div>
    </div>

    <!-- Syntax Error Display -->
    <div
      v-if="currentSyntaxError"
      class="bg-error text-error-content px-4 py-2 text-sm"
    >
      <strong>Syntax Error:</strong> {{ currentSyntaxError }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useEditorStore } from '../stores/editor'
import { useCollaborationStore } from '../stores/collaboration'
import { checkAutocompletePattern } from '../composables/useAutocomplete'
import { searchEmojis, getEmojiTrigger, insertEmoji } from '../composables/useEmoji'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import 'highlight.js/styles/vs2015.css'

// Register languages
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('css', css)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)

const editorStore = useEditorStore()
const collabStore = useCollaborationStore()

const editorTextarea = ref(null)
const highlightLayer = ref(null)
const highlightCode = ref(null)
const lineNumbers = ref(null)
const syntaxCheckTimer = ref(null)
const highlightedCode = ref('')
const totalLines = ref(1)

// Emoji autocomplete
const emojiSuggestions = ref([])
const selectedEmojiIndex = ref(0)
const emojiPopupPos = ref({ x: 0, y: 0 })

const tabs = [
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'js', label: 'JavaScript' }
]

const activeTab = computed(() => editorStore.activeTab)
const consoleMessages = computed(() => editorStore.consoleMessages)
const currentSyntaxError = computed(() => editorStore.syntaxErrors[activeTab.value])

const currentCode = computed({
  get() {
    switch (activeTab.value) {
      case 'html': return editorStore.htmlCode
      case 'css': return editorStore.cssCode
      case 'js': return editorStore.jsCode
      default: return ''
    }
  },
  set(value) {
    editorStore.setCode(activeTab.value, value)
  }
})

function getLanguageClass() {
  if (activeTab.value === 'js') return 'javascript'
  if (activeTab.value === 'html') return 'xml'
  return activeTab.value
}

function updateHighlighting() {
  const code = currentCode.value || ''

  // Update line numbers
  const lines = code.split('\n')
  totalLines.value = Math.max(lines.length, 1)

  // Apply syntax highlighting
  try {
    const language = getLanguageClass()
    const highlighted = hljs.highlight(code, { language }).value
    highlightedCode.value = highlighted
  } catch (error) {
    // If highlighting fails, just show the plain code
    highlightedCode.value = escapeHtml(code)
  }
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function handleScroll(event) {
  // Sync scroll between textarea and highlight layer
  if (highlightLayer.value) {
    highlightLayer.value.scrollTop = event.target.scrollTop
    highlightLayer.value.scrollLeft = event.target.scrollLeft
  }
  if (lineNumbers.value) {
    lineNumbers.value.scrollTop = event.target.scrollTop
  }
}

function switchTab(tab) {
  editorStore.switchTab(tab)
  nextTick(() => {
    updateHighlighting()
  })
}

function handleCodeChange() {
  // Update syntax highlighting
  updateHighlighting()

  // Check for emoji autocomplete
  checkEmojiAutocomplete()

  // Emit code change to collaboration if in session
  if (collabStore.inCollabSession) {
    collabStore.emitCodeChange(activeTab.value, currentCode.value)
  }

  // Schedule syntax check
  scheduleSyntaxCheck()
}

function scheduleSyntaxCheck() {
  if (syntaxCheckTimer.value) {
    clearTimeout(syntaxCheckTimer.value)
  }

  syntaxCheckTimer.value = setTimeout(() => {
    checkSyntax()
  }, 1000)
}

function checkSyntax() {
  const type = activeTab.value
  const code = currentCode.value

  if (!code.trim()) {
    editorStore.setSyntaxError(type, null)
    return
  }

  try {
    if (type === 'html') {
      checkHTMLSyntax(code)
    } else if (type === 'css') {
      checkCSSSyntax(code)
    } else if (type === 'js') {
      checkJSSyntax(code)
    }
  } catch (error) {
    console.error('Syntax check error:', error)
  }
}

function checkHTMLSyntax(code) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(code, 'text/html')
  const parserError = doc.querySelector('parsererror')

  if (parserError) {
    editorStore.setSyntaxError('html', parserError.textContent)
  } else {
    editorStore.setSyntaxError('html', null)
  }
}

function checkCSSSyntax(code) {
  // Basic CSS syntax check
  let braceCount = 0
  let inString = false
  let stringChar = ''

  for (let i = 0; i < code.length; i++) {
    const char = code[i]
    const prevChar = i > 0 ? code[i - 1] : ''

    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (inString && stringChar === char) {
        inString = false
      } else if (!inString) {
        inString = true
        stringChar = char
      }
    }

    if (!inString) {
      if (char === '{') braceCount++
      if (char === '}') braceCount--
    }

    if (braceCount < 0) {
      editorStore.setSyntaxError('css', 'Unexpected closing brace')
      return
    }
  }

  if (braceCount !== 0) {
    editorStore.setSyntaxError('css', 'Mismatched braces')
  } else {
    editorStore.setSyntaxError('css', null)
  }
}

function checkJSSyntax(code) {
  try {
    new Function(code)
    editorStore.setSyntaxError('js', null)
  } catch (error) {
    editorStore.setSyntaxError('js', error.message)
  }
}

function clearConsole() {
  editorStore.clearConsole()
}

function checkEmojiAutocomplete() {
  const textarea = editorTextarea.value
  if (!textarea) return

  const cursorPos = textarea.selectionStart
  const trigger = getEmojiTrigger(currentCode.value, cursorPos)

  if (trigger && trigger.query.length > 0) {
    // Search for matching emojis
    const matches = searchEmojis(trigger.query)
    emojiSuggestions.value = matches
    selectedEmojiIndex.value = 0

    // Position the popup near the cursor
    if (matches.length > 0) {
      const coords = getCaretCoordinates()
      emojiPopupPos.value = {
        x: coords.left,
        y: coords.top + 20
      }
    }
  } else {
    emojiSuggestions.value = []
  }
}

function selectEmoji(emojiName) {
  const textarea = editorTextarea.value
  if (!textarea) return

  const cursorPos = textarea.selectionStart
  const result = insertEmoji(currentCode.value, cursorPos, emojiName)

  if (result) {
    currentCode.value = result.newValue
    emojiSuggestions.value = []

    nextTick(() => {
      textarea.selectionStart = textarea.selectionEnd = result.newPos
      textarea.focus()
    })
  }
}

function getCaretCoordinates() {
  const textarea = editorTextarea.value
  if (!textarea) return { left: 0, top: 0 }

  // Simple approximation - position relative to textarea
  const rect = textarea.getBoundingClientRect()
  return {
    left: rect.left + 100, // Offset from left
    top: rect.top + 100 // Offset from top
  }
}

function handleKeyDown(event) {
  const textarea = editorTextarea.value
  if (!textarea) return

  // Handle emoji autocomplete navigation
  if (emojiSuggestions.value.length > 0) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      selectedEmojiIndex.value = (selectedEmojiIndex.value + 1) % emojiSuggestions.value.length
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      selectedEmojiIndex.value = (selectedEmojiIndex.value - 1 + emojiSuggestions.value.length) % emojiSuggestions.value.length
      return
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      const selected = emojiSuggestions.value[selectedEmojiIndex.value]
      if (selected) {
        selectEmoji(selected[0])
      }
      return
    }
    if (event.key === 'Escape') {
      emojiSuggestions.value = []
      return
    }
  }

  // Check for autocomplete patterns on specific keys
  const triggerKeys = ['>', ')', '}', ' ']
  if (triggerKeys.includes(event.key)) {
    setTimeout(() => {
      const cursorPos = textarea.selectionStart
      const result = checkAutocompletePattern(currentCode.value, cursorPos, event.key)

      if (result) {
        currentCode.value = result.newValue
        nextTick(() => {
          textarea.selectionStart = textarea.selectionEnd = result.newPos
        })
      }
    }, 0)
  }

  // Tab key handling
  if (event.key === 'Tab' && emojiSuggestions.value.length === 0) {
    event.preventDefault()
    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    // Insert tab at cursor position
    const newValue = currentCode.value.substring(0, start) + '  ' + currentCode.value.substring(end)
    currentCode.value = newValue

    // Move cursor after the inserted tab
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 2
    }, 0)
  }

  // Ctrl+S to save
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault()
    // Save handled by parent/header component
  }
}

// Watch for code changes from collaboration or other sources
watch(() => currentCode.value, () => {
  updateHighlighting()
})

// Listen for code updates from collaboration
onMounted(() => {
  updateHighlighting()

  if (collabStore.socket) {
    collabStore.socket.on('code-update', (data) => {
      editorStore.setCode(data.editorType, data.content)
    })
  }
})

onUnmounted(() => {
  if (syntaxCheckTimer.value) {
    clearTimeout(syntaxCheckTimer.value)
  }
})
</script>

<style scoped>
/* Hide scrollbar for highlight layer */
.highlight-layer::-webkit-scrollbar {
  display: none;
}

/* Ensure textarea text is transparent to show highlighting */
textarea {
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
}

/* Placeholder text should be visible but subtle */
textarea::placeholder {
  color: rgba(255, 255, 255, 0.3) !important;
  -webkit-text-fill-color: rgba(255, 255, 255, 0.3) !important;
}

/* Selection styling for textarea */
textarea::selection {
  background: rgba(38, 79, 120, 0.6);
}

textarea::-moz-selection {
  background: rgba(38, 79, 120, 0.6);
}

/* Ensure line numbers stay aligned */
.line-numbers {
  box-sizing: border-box;
}
</style>
