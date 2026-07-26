<script setup lang="ts">
import { ref, onMounted } from 'vue'

const logFiles = ref<string[]>([])
const activeFile = ref<string | null>(null)
const logContent = ref<any[]>([])
const loading = ref(false)

const fetchLogFiles = async () => {
  try {
    const res = await fetch('/logs')
    const data = await res.json()
    if (data.status) {
      logFiles.value = data.data
      if (logFiles.value.length > 0 && !activeFile.value) {
        selectFile(logFiles.value[0])
      }
    }
  } catch (e) {
    console.error('Failed to fetch log files', e)
  }
}

const selectFile = async (filename: string) => {
  activeFile.value = filename
  await fetchLogContent(filename)
}

const fetchLogContent = async (filename: string) => {
  loading.value = true
  logContent.value = []
  try {
    const res = await fetch(`/logs/${filename}`)
    const data = await res.json()
    if (data.status) {
      logContent.value = data.data
    }
  } catch (e) {
    console.error('Failed to fetch log content', e)
  } finally {
    loading.value = false
  }
}

const refreshLogs = () => {
  if (activeFile.value) {
    fetchLogContent(activeFile.value)
  } else {
    fetchLogFiles()
  }
}

onMounted(() => {
  fetchLogFiles()
})
</script>

<template>
  <div class="flex-1 flex flex-col h-screen bg-bg-dark text-white border-l border-slate-700/50 relative">
    
    <!-- Header -->
    <div class="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-slate-700/50 bg-slate-800/20 backdrop-blur-md">
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
          System Logs
        </h2>
      </div>
      <button 
        @click="refreshLogs"
        class="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-xl transition-colors duration-200 text-sm font-medium"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh
      </button>
    </div>

    <!-- Main Content -->
    <div class="flex flex-1 overflow-hidden">
      
      <!-- File Selector Sidebar -->
      <div class="w-64 border-r border-slate-700/50 flex flex-col bg-slate-900/50">
        <div class="p-4 border-b border-slate-700/50 font-medium text-slate-300">
          Log Files
        </div>
        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          <button
            v-for="file in logFiles"
            :key="file"
            @click="selectFile(file)"
            class="w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 truncate"
            :class="[
              activeFile === file 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
            ]"
          >
            {{ file }}
          </button>
        </div>
      </div>

      <!-- Log Content Display -->
      <div class="flex-1 flex flex-col bg-slate-950 relative overflow-hidden">
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-10">
          <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div v-if="logContent.length === 0 && !loading" class="flex-1 flex items-center justify-center text-slate-500">
          No logs found in this file.
        </div>

        <div v-else class="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
          <div 
            v-for="(log, idx) in logContent" 
            :key="idx"
            class="p-3 rounded-lg border border-slate-800/80 bg-slate-900/80 hover:border-slate-700 transition-colors"
          >
            <!-- Structured Winston JSON Log -->
            <div v-if="log.timestamp && log.level" class="flex flex-col gap-2">
              <div class="flex items-center gap-3">
                <span class="text-slate-500">{{ new Date(log.timestamp).toLocaleTimeString() }}</span>
                <span 
                  class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                  :class="{
                    'bg-red-500/20 text-red-400': log.level === 'error',
                    'bg-yellow-500/20 text-yellow-400': log.level === 'warn',
                    'bg-blue-500/20 text-blue-400': log.level === 'info',
                    'bg-slate-700 text-slate-300': !['error', 'warn', 'info'].includes(log.level)
                  }"
                >
                  {{ log.level }}
                </span>
                <span v-if="log.context" class="text-indigo-400 font-semibold">[{{ log.context }}]</span>
              </div>
              <div class="text-slate-300 break-words whitespace-pre-wrap">
                {{ log.message }}
              </div>
              
              <!-- Stack Trace Display -->
              <div v-if="log.stack" class="mt-2 p-3 bg-slate-950 rounded border border-red-900/30 overflow-x-auto">
                <pre class="text-red-400/80 text-[11px] leading-relaxed m-0">{{ Array.isArray(log.stack) ? log.stack.join('\n') : log.stack }}</pre>
              </div>
            </div>

            <!-- Fallback for unparsed or flat logs -->
            <div v-else class="text-slate-400 break-words whitespace-pre-wrap">
              {{ JSON.stringify(log) }}
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
