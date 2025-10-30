import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useEditorStore = defineStore('editor', () => {
  // State
  const htmlCode = ref('')
  const cssCode = ref('')
  const jsCode = ref('')
  const activeTab = ref('html')
  const consoleMessages = ref([])
  const syntaxErrors = ref({
    html: null,
    css: null,
    js: null
  })

  // Computed
  const currentCode = computed(() => {
    switch (activeTab.value) {
      case 'html': return htmlCode.value
      case 'css': return cssCode.value
      case 'js': return jsCode.value
      default: return ''
    }
  })

  // Actions
  function setCode(type, code) {
    switch (type) {
      case 'html':
        htmlCode.value = code
        break
      case 'css':
        cssCode.value = code
        break
      case 'js':
        jsCode.value = code
        break
    }
  }

  function switchTab(tab) {
    activeTab.value = tab
  }

  function addConsoleMessage(level, message) {
    consoleMessages.value.push({
      level,
      message,
      timestamp: new Date().toLocaleTimeString()
    })
  }

  function clearConsole() {
    consoleMessages.value = []
  }

  function setSyntaxError(type, error) {
    syntaxErrors.value[type] = error
  }

  function resetCode() {
    htmlCode.value = ''
    cssCode.value = ''
    jsCode.value = ''
    consoleMessages.value = []
    syntaxErrors.value = {
      html: null,
      css: null,
      js: null
    }
  }

  return {
    htmlCode,
    cssCode,
    jsCode,
    activeTab,
    consoleMessages,
    syntaxErrors,
    currentCode,
    setCode,
    switchTab,
    addConsoleMessage,
    clearConsole,
    setSyntaxError,
    resetCode
  }
})
