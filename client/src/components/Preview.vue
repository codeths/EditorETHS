<template>
  <div class="flex-1 flex flex-col overflow-hidden bg-base-100">
    <!-- Preview Header -->
    <div class="bg-base-200 border-b border-base-300 px-4 py-2 flex justify-between items-center">
      <div class="flex items-center gap-2">
        <span class="font-semibold text-sm">Preview</span>

        <!-- 🛡️ OPTIONAL: Shows loading state, gracefully hidden if not working -->
        <span v-if="isLoadingPackages" class="loading loading-spinner loading-xs"></span>

        <!-- 🛡️ OPTIONAL: Shows loaded packages, gracefully hidden if none -->
        <span v-if="loadedPackages.length > 0" class="badge badge-xs badge-success" :title="loadedPackages.join(', ')">
          {{ loadedPackages.length }} package{{ loadedPackages.length !== 1 ? 's' : '' }}
        </span>
      </div>
      <div class="flex gap-2">
        <button
          @click="runCode"
          class="btn btn-xs btn-primary"
          title="Run Code (Ctrl+Enter)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-4 h-4"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
            />
          </svg>
          Run
        </button>
        <button
          @click="openInNewWindow"
          class="btn btn-xs btn-ghost"
          title="Open in New Window"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-4 h-4"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- 🛡️ OPTIONAL: Warning banner - only shows if there are errors -->
    <div v-if="packageErrors.length > 0" class="bg-warning text-warning-content px-4 py-2 text-sm">
      <strong>Package Warnings:</strong>
      <ul class="list-disc list-inside">
        <li v-for="(error, i) in packageErrors" :key="i">{{ error }}</li>
      </ul>
    </div>

    <!-- Preview Frame -->
    <div class="flex-1 bg-white overflow-hidden">
      <iframe
        ref="previewFrame"
        class="w-full h-full border-0"
        sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
        @load="onIframeLoad"
      ></iframe>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useEditorStore } from '../stores/editor'
import { useUIStore } from '../stores/ui'
import { npmLoader } from '../composables/useNpmPackages'

const editorStore = useEditorStore()
const uiStore = useUIStore()

const previewFrame = ref(null)
const autoRunTimer = ref(null)
const iframeReady = ref(false)

// npm package loading state (optional - fails gracefully)
const isLoadingPackages = ref(false)
const packageErrors = ref([])
const loadedPackages = ref([])

// Auto-run code when it changes (with debounce)
watch(
  [
    () => editorStore.htmlCode,
    () => editorStore.cssCode,
    () => editorStore.jsCode
  ],
  () => {
    scheduleAutoRun()
  }
)

function onIframeLoad() {
  iframeReady.value = true
}

function scheduleAutoRun() {
  if (autoRunTimer.value) {
    clearTimeout(autoRunTimer.value)
  }

  autoRunTimer.value = setTimeout(() => {
    runCode()
  }, 1000)
}

async function runCode() {
  const iframe = previewFrame.value
  if (!iframe) return

  try {
    let html = editorStore.htmlCode
    const css = editorStore.cssCode
    let js = editorStore.jsCode

    // 🛡️ SAFE: Try npm transformation, fall back to original on failure
    try {
      isLoadingPackages.value = true
      packageErrors.value = []
      loadedPackages.value = []

      const detectedPackages = npmLoader.parseImports(js)

      if (detectedPackages.length > 0) {
        console.log('🔍 Detected npm packages:', detectedPackages.map(p => p.name))

        // Transform imports to ESM.sh URLs
        const transformedJs = npmLoader.transformImports(js)

        // Preload packages for better error handling
        try {
          await npmLoader.preloadPackages(editorStore.jsCode)
          loadedPackages.value = detectedPackages.map(p => p.name)
          js = transformedJs // Only use transformed code if preload succeeds
          console.log('✅ npm packages loaded successfully')
        } catch (error) {
          console.warn('⚠️ Package preload failed, using original code:', error)
          packageErrors.value.push(error.message)
          // Don't transform - keep original code
        }
      }

      isLoadingPackages.value = false
    } catch (npmError) {
      // 🛡️ CRITICAL: If npm support fails, continue with original code
      console.warn('⚠️ npm loader failed, continuing without it:', npmError)
      isLoadingPackages.value = false
      packageErrors.value = []
      // js remains unchanged - original code will run
    }

    // 🛡️ Everything below this point works EXACTLY as before
    // Add loop protection
    js = addLoopProtection(js)

    // Check if user provided full HTML document
    const hasDoctype = html.toLowerCase().includes('<!doctype')
    const hasHtmlTag = html.toLowerCase().includes('<html')
    const hasBodyTag = html.toLowerCase().includes('<body')

    let fullHTML

    if (hasDoctype || (hasHtmlTag && hasBodyTag)) {
      // User provided full HTML structure
      const consoleScript = createConsoleScript()

      // 🛡️ IMPORTANT: Use type="module" for npm imports, but it won't break normal code
      const userScript = `<script type="module">try{${js}}catch(error){console.error('Runtime Error: '+error.message)}<\/script>`

      if (html.toLowerCase().includes('</body>')) {
        fullHTML = html.replace(/<\/body>/i, `${consoleScript}${userScript}</body>`)
      } else if (html.toLowerCase().includes('</html>')) {
        fullHTML = html.replace(/<\/html>/i, `${consoleScript}${userScript}</html>`)
      } else {
        fullHTML = html + consoleScript + userScript
      }

      // Inject CSS
      if (css && html.toLowerCase().includes('</head>')) {
        fullHTML = fullHTML.replace(/<\/head>/i, `<style>${css}</style></head>`)
      } else if (css && html.toLowerCase().includes('<head>')) {
        fullHTML = fullHTML.replace(/<head>/i, `<head><style>${css}</style>`)
      }
    } else {
      // User provided HTML fragments
      fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${css}</style>
</head>
<body>
  ${html}
  ${createConsoleScript()}
  <script type="module">try{${js}}catch(error){console.error('Runtime Error: '+error.message)}<\/script>
</body>
</html>`
    }

    iframe.srcdoc = fullHTML
  } catch (error) {
    // 🛡️ EXISTING ERROR HANDLER - unchanged
    console.error('Error running code:', error)
    editorStore.addConsoleMessage('error', 'Preview error: ' + error.message)
  }
}

// 🛡️ Helper function for console script
function createConsoleScript() {
  return `<script>(function(){const originalConsole={log:console.log,error:console.error,warn:console.warn,info:console.info};function sendToParent(type,args){try{window.parent.postMessage({type:'console',level:type,message:Array.from(args).map(arg=>{try{return typeof arg==='object'?JSON.stringify(arg,null,2):String(arg)}catch(e){return String(arg)}}).join(' ')},'*')}catch(e){}}console.log=function(...args){originalConsole.log.apply(console,args);sendToParent('log',args)};console.error=function(...args){originalConsole.error.apply(console,args);sendToParent('error',args)};console.warn=function(...args){originalConsole.warn.apply(console,args);sendToParent('warn',args)};console.info=function(...args){originalConsole.info.apply(console,args);sendToParent('info',args)};window.onerror=function(message,source,lineno,colno,error){sendToParent('error',[message+' (Line '+lineno+')']);return false};window.onunhandledrejection=function(event){sendToParent('error',['Unhandled Promise Rejection: '+event.reason])}})();<\/script>`
}

function addLoopProtection(code) {
  if (!code || !code.trim()) return code

  try {
    // Add loop protection by instrumenting while/for loops
    let protectedCode = code

    // Protect while loops
    protectedCode = protectedCode.replace(
      /while\s*\([^)]+\)\s*{/g,
      (match) => {
        return match + '\nlet __loopCounter = 0; const __maxLoops = 100000;'
      }
    )

    protectedCode = protectedCode.replace(
      /while\s*\([^)]+\)\s*{([^}]*?)}/gs,
      (match, body) => {
        if (!body.includes('__loopCounter++')) {
          return match.replace(
            '{',
            '{\nlet __loopCounter = 0; const __maxLoops = 100000;\nif (++__loopCounter > __maxLoops) throw new Error("Infinite loop detected!");'
          )
        }
        return match
      }
    )

    // Protect for loops
    protectedCode = protectedCode.replace(
      /for\s*\([^)]+\)\s*{([^}]*?)}/gs,
      (match, body) => {
        if (!body.includes('__loopCounter++')) {
          return match.replace(
            '{',
            '{\nlet __loopCounter = 0; const __maxLoops = 100000;\nif (++__loopCounter > __maxLoops) throw new Error("Infinite loop detected!");'
          )
        }
        return match
      }
    )

    return protectedCode
  } catch (error) {
    // If instrumentation fails, return original code
    console.warn('Loop protection failed:', error)
    return code
  }
}

function openInNewWindow() {
  const html = editorStore.htmlCode
  const css = editorStore.cssCode
  const js = editorStore.jsCode

  const fullHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${css}</style>
</head>
<body>
  ${html}
  <script>${js}<\/script>
</body>
</html>
  `

  const newWindow = window.open('', '_blank')
  if (newWindow) {
    newWindow.document.open()
    newWindow.document.write(fullHTML)
    newWindow.document.close()
    uiStore.showNotification('Opened in new window', 'info')
  } else {
    uiStore.showNotification('Failed to open new window - check popup blocker', 'error')
  }
}

// Listen for console messages from iframe
function handleMessage(event) {
  if (event.data && event.data.type === 'console') {
    editorStore.addConsoleMessage(event.data.level, event.data.message)
  }
}

onMounted(() => {
  window.addEventListener('message', handleMessage)

  // Wait for next tick to ensure iframe is in DOM
  nextTick(() => {
    // Run code after a short delay to ensure iframe is ready
    setTimeout(() => {
      runCode()
    }, 100)
  })

  // Keyboard shortcut for running code
  const handleKeyDown = (event) => {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault()
      runCode()
    }
  }
  window.addEventListener('keydown', handleKeyDown)

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
  if (autoRunTimer.value) {
    clearTimeout(autoRunTimer.value)
  }
})
</script>
