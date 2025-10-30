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

    <!-- Editor Area -->
    <div class="flex-1 overflow-hidden bg-base-100">
      <textarea
        ref="editorTextarea"
        v-model="currentCode"
        @input="handleCodeChange"
        @keydown="handleKeyDown"
        class="w-full h-full p-4 bg-base-100 text-base-content font-mono text-sm resize-none focus:outline-none"
        :placeholder="`Enter ${activeTab.toUpperCase()} code here...`"
        spellcheck="false"
      ></textarea>
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '../stores/editor'
import { useCollaborationStore } from '../stores/collaboration'

const editorStore = useEditorStore()
const collabStore = useCollaborationStore()

const editorTextarea = ref(null)
const syntaxCheckTimer = ref(null)

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

function switchTab(tab) {
  editorStore.switchTab(tab)
}

function handleCodeChange() {
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

function handleKeyDown(event) {
  // Tab key handling
  if (event.key === 'Tab') {
    event.preventDefault()
    const textarea = editorTextarea.value
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

// Listen for code updates from collaboration
onMounted(() => {
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
