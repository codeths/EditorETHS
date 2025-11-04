<template>
  <div class="flex-1 flex flex-col border-r border-base-300 overflow-hidden">
    <!-- File Path Display -->
    <div class="bg-base-200 rounded-none border-b border-base-300 px-4 py-2 flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span class="text-sm font-mono">
        {{ fsStore.activeFilePath || 'No file selected' }}
      </span>
      <span v-if="fsStore.activeFilePath && fsStore.isFileModified(fsStore.activeFilePath)" class="ml-auto text-xs text-warning">
        Modified
      </span>
    </div>

    <!-- Editor Area with 2-Layer System -->
    <div :style="{ height: editorHeight + 'px' }" class="overflow-hidden bg-[#1e1e1e] flex flex-shrink-0">
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
          class="block m-0 p-0 border-0 bg-transparent font-mono whitespace-pre"
          style="font-size: 14px; line-height: 1.6;"
          v-html="highlightedCode"
        ></code></pre>

        <!-- Textarea (Top) -->
        <textarea
          ref="editorTextarea"
          v-model="currentCode"
          @input="handleCodeChange"
          @scroll="handleScroll"
          @keydown="handleKeyDown"
          @click="emitCursorPosition"
          @select="emitCursorPosition"
          class="absolute inset-0 w-full h-full p-5 m-0 border-0 bg-transparent resize-none overflow-auto z-[2] whitespace-pre focus:outline-none"
          style="color: transparent; caret-color: white; font-family: 'Consolas', 'Monaco', monospace; font-size: 14px; line-height: 1.6; tab-size: 4; -moz-tab-size: 4;"
          :placeholder="`Enter code here...`"
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

        <!-- Remote Cursors -->
        <div
          v-for="(cursor, userId) in remoteCursorsForCurrentTab"
          :key="userId"
          class="absolute pointer-events-none z-[4]"
          :style="getCursorStyle(cursor)"
        >
          <!-- Cursor line -->
          <div
            class="w-0.5 h-5 animate-pulse"
            :style="{ backgroundColor: cursor.color }"
          ></div>
          <!-- Name label -->
          <div
            class="absolute top-0 left-1 px-2 py-1 rounded text-xs text-white whitespace-nowrap shadow-lg"
            :style="{ backgroundColor: cursor.color }"
          >
            {{ cursor.name }}
          </div>
        </div>
      </div>
    </div>

    <!-- Console Resize Handle -->
    <div
      @mousedown="startConsoleResize"
      class="h-1 bg-base-300 hover:bg-primary cursor-row-resize transition-colors"
      title="Drag to resize console"
    ></div>

    <!-- Console -->
    <div class="border-t border-base-300 bg-base-200 flex flex-col flex-shrink-0" :style="{ height: consoleHeight + 'px' }">
      <div class="flex justify-between items-center px-4 py-2 border-b border-base-300 flex-shrink-0">
        <span class="font-semibold text-sm">Console</span>
        <button @click="clearConsole" class="btn btn-xs btn-ghost">Clear</button>
      </div>
      <div class="flex-1 overflow-y-auto px-4 py-2 font-mono text-xs">
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
import { useFileSystemStore } from '../stores/fileSystem'
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
const fsStore = useFileSystemStore()

const editorTextarea = ref(null)
const highlightLayer = ref(null)
const highlightCode = ref(null)
const lineNumbers = ref(null)
const syntaxCheckTimer = ref(null)
const highlightedCode = ref('')
const totalLines = ref(1)

// Scroll position tracking for cursor positioning
const scrollPosition = ref({ top: 0, left: 0 })

// Resizable editor and console
const editorHeight = ref(400) // Default editor height
const consoleHeight = ref(128) // Default console height (h-32 = 128px)
let isResizingConsole = false
let consoleResizeStartY = 0
let consoleResizeStartHeight = 0

// Emoji autocomplete
const emojiSuggestions = ref([])
const selectedEmojiIndex = ref(0)
const emojiPopupPos = ref({ x: 0, y: 0 })

const consoleMessages = computed(() => editorStore.consoleMessages)
const currentSyntaxError = computed(() => {
  const ext = fsStore.activeFileExtension
  return editorStore.syntaxErrors[ext] || null
})

// Remote cursors for collaboration
const remoteCursorsForCurrentTab = computed(() => {
  const cursors = {}
  const currentExt = fsStore.activeFileExtension
  for (const [userId, cursor] of Object.entries(collabStore.remoteCursors)) {
    if (cursor.editorType === currentExt) {
      cursors[userId] = cursor
    }
  }
  return cursors
})

const currentCode = computed({
  get() {
    return fsStore.activeFileContent
  },
  set(value) {
    fsStore.updateActiveFile(value)
  }
})

function getLanguageClass() {
  const ext = fsStore.activeFileExtension
  if (ext === 'js' || ext === 'jsx') return 'javascript'
  if (ext === 'html') return 'xml'
  if (ext === 'css' || ext === 'scss') return 'css'
  if (ext === 'ts' || ext === 'tsx') return 'javascript' // For now, treat TypeScript as JavaScript
  return 'javascript' // Default fallback
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

  // Update scroll position for cursor tracking
  scrollPosition.value = {
    top: event.target.scrollTop,
    left: event.target.scrollLeft
  }
}

function startConsoleResize(e) {
  isResizingConsole = true
  consoleResizeStartY = e.clientY
  consoleResizeStartHeight = consoleHeight.value
  document.body.style.cursor = 'row-resize'
  document.body.style.userSelect = 'none'

  document.addEventListener('mousemove', handleConsoleResize)
  document.addEventListener('mouseup', stopConsoleResize)
}

function handleConsoleResize(e) {
  if (!isResizingConsole) return

  const deltaY = consoleResizeStartY - e.clientY // Inverted because console grows upward
  const newHeight = consoleResizeStartHeight + deltaY

  // Constrain between 80px and 400px
  consoleHeight.value = Math.min(400, Math.max(80, newHeight))

  // Adjust editor height accordingly
  updateEditorHeight()
}

function stopConsoleResize() {
  isResizingConsole = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''

  document.removeEventListener('mousemove', handleConsoleResize)
  document.removeEventListener('mouseup', stopConsoleResize)
}

function updateEditorHeight() {
  // Calculate available height (component height minus console height and resize handle)
  const component = editorTextarea.value?.closest('.flex-1.flex.flex-col')
  if (component) {
    const componentHeight = component.offsetHeight
    const tabsHeight = 48 // Approximate height of tabs
    const resizeHandleHeight = 4
    const availableHeight = componentHeight - consoleHeight.value - tabsHeight - resizeHandleHeight
    editorHeight.value = Math.max(200, availableHeight)
  }
}

// Watch for active file changes
watch(() => fsStore.activeFilePath, () => {
  nextTick(() => {
    updateHighlighting()
  })
})

function handleCodeChange() {
  // Update syntax highlighting
  updateHighlighting()

  // CRITICAL: Ensure textarea and highlight layers stay synced
  nextTick(() => {
    if (editorTextarea.value && highlightLayer.value) {
      highlightLayer.value.scrollTop = editorTextarea.value.scrollTop
      highlightLayer.value.scrollLeft = editorTextarea.value.scrollLeft
    }
  })

  // Check for emoji autocomplete
  checkEmojiAutocomplete()

  // Emit code change to collaboration if in session
  if (collabStore.inCollabSession) {
    collabStore.emitCodeChange(fsStore.activeFileExtension, currentCode.value)
    // Also emit cursor position
    emitCursorPosition()
  }

  // Schedule syntax check
  scheduleSyntaxCheck()
}

function emitCursorPosition() {
  if (!collabStore.inCollabSession || !editorTextarea.value) return

  const position = editorTextarea.value.selectionStart
  collabStore.emitCursorMove(fsStore.activeFileExtension, position)
}

function getCursorStyle(cursor) {
  if (!editorTextarea.value || !cursor.position) {
    return { display: 'none' }
  }

  const textarea = editorTextarea.value
  const text = currentCode.value
  const position = Math.min(cursor.position, text.length)

  // Calculate line and column from position
  const before = text.substring(0, position)
  const lines = before.split('\n')
  const lineNumber = lines.length - 1
  const column = lines[lineNumber].length

  // Get actual computed styles from the textarea
  const computedStyle = window.getComputedStyle(textarea)
  const lineHeight = parseFloat(computedStyle.lineHeight)
  const paddingTop = parseFloat(computedStyle.paddingTop)
  const paddingLeft = parseFloat(computedStyle.paddingLeft)

  // Create a temporary span to measure actual character width
  const measureSpan = document.createElement('span')
  measureSpan.style.font = computedStyle.font
  measureSpan.style.fontSize = computedStyle.fontSize
  measureSpan.style.fontFamily = computedStyle.fontFamily
  measureSpan.style.position = 'absolute'
  measureSpan.style.visibility = 'hidden'
  measureSpan.style.whiteSpace = 'pre'

  // Measure the actual width of the text up to the cursor position on current line
  measureSpan.textContent = lines[lineNumber].substring(0, column)
  document.body.appendChild(measureSpan)
  const actualWidth = measureSpan.offsetWidth
  document.body.removeChild(measureSpan)

  // Account for scroll position
  const left = paddingLeft + actualWidth - scrollPosition.value.left
  const top = paddingTop + (lineNumber * lineHeight) - scrollPosition.value.top

  return {
    left: `${left}px`,
    top: `${top}px`
  }
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
  const ext = fsStore.activeFileExtension
  const code = currentCode.value

  if (!code.trim()) {
    editorStore.setSyntaxError(ext, null)
    return
  }

  try {
    if (ext === 'html') {
      checkHTMLSyntax(code)
    } else if (ext === 'css' || ext === 'scss') {
      checkCSSSyntax(code)
    } else if (ext === 'js' || ext === 'jsx' || ext === 'ts' || ext === 'tsx') {
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
}

// Watch for code changes from collaboration or other sources
watch(() => currentCode.value, () => {
  updateHighlighting()

  // Force scroll sync between textarea and highlight layers
  nextTick(() => {
    if (editorTextarea.value) {
      scrollPosition.value = {
        top: editorTextarea.value.scrollTop,
        left: editorTextarea.value.scrollLeft
      }

      // Ensure highlight layer stays synced
      if (highlightLayer.value) {
        highlightLayer.value.scrollTop = editorTextarea.value.scrollTop
        highlightLayer.value.scrollLeft = editorTextarea.value.scrollLeft
      }
    }
  })
})

// Listen for code updates from collaboration
onMounted(() => {
  updateHighlighting()

  if (collabStore.socket) {
    collabStore.socket.on('code-update', (data) => {
      editorStore.setCode(data.editorType, data.content)
    })
  }

  // Initialize editor height and scroll position
  nextTick(() => {
    updateEditorHeight()

    // Initialize scroll position for cursor tracking
    if (editorTextarea.value) {
      scrollPosition.value = {
        top: editorTextarea.value.scrollTop,
        left: editorTextarea.value.scrollLeft
      }
    }
  })

  // Update heights on window resize
  window.addEventListener('resize', updateEditorHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateEditorHeight)
  document.removeEventListener('mousemove', handleConsoleResize)
  document.removeEventListener('mouseup', stopConsoleResize)
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
