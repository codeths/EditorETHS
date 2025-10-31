<template>
  <div class="flex-1 flex flex-col overflow-hidden bg-base-100">
    <!-- Preview Header -->
    <div class="bg-base-200 border-b border-base-300 px-4 py-2 flex justify-between items-center">
      <span class="font-semibold text-sm">Preview</span>
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

const editorStore = useEditorStore()
const uiStore = useUIStore()

const previewFrame = ref(null)
const autoRunTimer = ref(null)
const iframeReady = ref(false)

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

function runCode() {
  const iframe = previewFrame.value
  if (!iframe) return

  try {
    let html = editorStore.htmlCode
    const css = editorStore.cssCode
    const js = addLoopProtection(editorStore.jsCode)

    // Check if user provided full HTML document
    const hasDoctype = html.toLowerCase().includes('<!doctype')
    const hasHtmlTag = html.toLowerCase().includes('<html')
    const hasBodyTag = html.toLowerCase().includes('<body')

    let fullHTML

    if (hasDoctype || (hasHtmlTag && hasBodyTag)) {
      // User provided full HTML structure - inject our scripts into their document
      const consoleScript = `<script>(function(){const originalConsole={log:console.log,error:console.error,warn:console.warn,info:console.info};function sendToParent(type,args){try{window.parent.postMessage({type:'console',level:type,message:Array.from(args).map(arg=>{try{return typeof arg==='object'?JSON.stringify(arg,null,2):String(arg)}catch(e){return String(arg)}}).join(' ')},'*')}catch(e){}}console.log=function(...args){originalConsole.log.apply(console,args);sendToParent('log',args)};console.error=function(...args){originalConsole.error.apply(console,args);sendToParent('error',args)};console.warn=function(...args){originalConsole.warn.apply(console,args);sendToParent('warn',args)};console.info=function(...args){originalConsole.info.apply(console,args);sendToParent('info',args)};window.onerror=function(message,source,lineno,colno,error){sendToParent('error',[message+' (Line '+lineno+')']);return false};window.onunhandledrejection=function(event){sendToParent('error',['Unhandled Promise Rejection: '+event.reason])}})();<\/script>`
      const userScript = `<script>try{${js}}catch(error){console.error('Runtime Error: '+error.message)}<\/script>`

      // Try to inject before </body>, or before </html>, or at the end
      if (html.toLowerCase().includes('</body>')) {
        fullHTML = html.replace(/<\/body>/i, `${consoleScript}${userScript}</body>`)
      } else if (html.toLowerCase().includes('</html>')) {
        fullHTML = html.replace(/<\/html>/i, `${consoleScript}${userScript}</html>`)
      } else {
        fullHTML = html + consoleScript + userScript
      }

      // Inject CSS into head if possible
      if (css && html.toLowerCase().includes('</head>')) {
        fullHTML = fullHTML.replace(/<\/head>/i, `<style>${css}</style></head>`)
      } else if (css && html.toLowerCase().includes('<head>')) {
        fullHTML = fullHTML.replace(/<head>/i, `<head><style>${css}</style>`)
      }
    } else {
      // User provided HTML fragments - wrap in our structure
      fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${css}</style>
</head>
<body>
  ${html}
  <script>(function(){const originalConsole={log:console.log,error:console.error,warn:console.warn,info:console.info};function sendToParent(type,args){try{window.parent.postMessage({type:'console',level:type,message:Array.from(args).map(arg=>{try{return typeof arg==='object'?JSON.stringify(arg,null,2):String(arg)}catch(e){return String(arg)}}).join(' ')},'*')}catch(e){}}console.log=function(...args){originalConsole.log.apply(console,args);sendToParent('log',args)};console.error=function(...args){originalConsole.error.apply(console,args);sendToParent('error',args)};console.warn=function(...args){originalConsole.warn.apply(console,args);sendToParent('warn',args)};console.info=function(...args){originalConsole.info.apply(console,args);sendToParent('info',args)};window.onerror=function(message,source,lineno,colno,error){sendToParent('error',[message+' (Line '+lineno+')']);return false};window.onunhandledrejection=function(event){sendToParent('error',['Unhandled Promise Rejection: '+event.reason])}})();<\/script>
  <script>try{${js}}catch(error){console.error('Runtime Error: '+error.message)}<\/script>
</body>
</html>`
    }

    iframe.srcdoc = fullHTML
  } catch (error) {
    console.error('Error running code:', error)
    editorStore.addConsoleMessage('error', 'Preview error: ' + error.message)
  }
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
