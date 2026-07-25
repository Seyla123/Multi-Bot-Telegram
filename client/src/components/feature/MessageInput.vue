<script setup lang="ts">
import { ref } from 'vue'
import type { Message } from '../../services/telegramService'
import { useAudioRecorder } from '../../composables/useAudioRecorder'
import BaseIconButton from '../core/BaseIconButton.vue'

defineProps<{
  isSending: boolean
  replyingTo?: Message | null
}>()

const emit = defineEmits<{
  (e: 'send', text: string, file: File | null): void
  (e: 'cancel-reply'): void
}>()

const inputText = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const selectedFileUrl = ref<string | null>(null)

const {
  isRecording,
  recordingDuration,
  audioBlob,
  formatDuration,
  startRecording,
  stopRecording,
  cancelRecording
} = useAudioRecorder()

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
    if (selectedFileUrl.value) URL.revokeObjectURL(selectedFileUrl.value)
    selectedFileUrl.value = URL.createObjectURL(target.files[0])
  }
}

const clearSelectedFile = () => {
  selectedFile.value = null
  if (selectedFileUrl.value) {
    URL.revokeObjectURL(selectedFileUrl.value)
    selectedFileUrl.value = null
  }
  if (fileInput.value) fileInput.value.value = ''
}

const handleSubmit = () => {
  if (isRecording.value) {
    stopRecording()
    // Small delay to let blob generate
    setTimeout(() => {
      if (audioBlob.value) {
        const file = new File([audioBlob.value], `VoiceMessage_${Date.now()}.webm`, { type: 'audio/webm' })
        emit('send', '', file)
        cancelRecording()
      }
    }, 100)
    return
  }

  const text = inputText.value.trim()
  if (!text && !selectedFile.value) return
  
  emit('send', text, selectedFile.value)
  
  inputText.value = ''
  clearSelectedFile()
}

const toggleRecording = () => {
  if (isRecording.value) {
    cancelRecording() // Only cancel if explicitly clicked on the mic again
  } else {
    startRecording()
  }
}
</script>

<template>
  <div>
    <!-- Send Photo Modal Overlay -->
    <div v-if="selectedFile" class="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div class="bg-bg-sidebar w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/10 m-4">
        <div class="flex items-center justify-between px-4 py-3 border-b border-border">
          <div class="flex items-center gap-3">
            <button @click="clearSelectedFile" class="text-text-muted hover:text-white transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <span class="font-semibold text-text-main">Send Media</span>
          </div>
        </div>
        
        <div class="bg-black/40 flex-1 flex items-center justify-center min-h-[300px] p-4">
          <img v-if="selectedFileUrl && selectedFile.type.startsWith('image/')" :src="selectedFileUrl" class="max-h-[50vh] max-w-full rounded-xl object-contain shadow-md" alt="Preview" />
          <video v-else-if="selectedFileUrl && selectedFile.type.startsWith('video/')" :src="selectedFileUrl" class="max-h-[50vh] max-w-full rounded-xl shadow-md" controls></video>
          <div v-else class="text-text-muted flex flex-col items-center">
            <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <span class="text-sm font-medium">{{ selectedFile.name }}</span>
            <span class="text-xs mt-1">{{ (selectedFile.size / 1024).toFixed(1) }} KB</span>
          </div>
        </div>
        
        <div class="p-4 bg-bg-sidebar">
          <form @submit.prevent="handleSubmit" class="flex gap-3 items-end w-full">
            <div class="flex-1 bg-black/30 border border-white/5 rounded-2xl flex items-end shadow-inner">
              <textarea 
                v-model="inputText"
                @keydown.enter.exact.prevent="handleSubmit"
                placeholder="Add a caption..."
                class="flex-1 bg-transparent border-none py-3.5 px-4 focus:outline-none text-text-main placeholder-text-muted text-[15px] resize-none min-h-[50px] max-h-[120px] overflow-y-auto"
                rows="1"
                :disabled="isSending"
                autofocus
              ></textarea>
            </div>
            <button 
              type="submit" 
              class="w-[50px] h-[50px] rounded-full bg-accent hover:bg-accent-hover text-white flex items-center justify-center shrink-0 transition-all shadow-md"
              :disabled="isSending"
            >
              <svg v-if="!isSending" class="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- Main Input Area (Hidden when modal is open) -->
    <div v-show="!selectedFile" class="px-4 py-3 flex flex-col gap-2 shrink-0 max-w-4xl mx-auto w-full z-10 bg-bg-chat">
      <!-- Reply Preview Banner -->
      <div v-if="replyingTo" class="flex items-center justify-between px-3 py-2 border-l-[3px] border-accent bg-black/20 rounded-r-lg mb-1">
        <div class="flex flex-col min-w-0">
          <span class="text-accent text-sm font-medium">Reply to Message</span>
          <span class="text-text-muted text-[13px] truncate">{{ replyingTo.text || 'Media Message' }}</span>
        </div>
        <BaseIconButton title="Cancel reply" @click="emit('cancel-reply')" class="!p-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </BaseIconButton>
      </div>

      <form @submit.prevent="handleSubmit" class="flex gap-2 items-end w-full relative">
        <input type="file" ref="fileInput" @change="handleFileChange" class="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx" />
        
        <div class="flex-1 bg-bg-sidebar border border-white/5 rounded-3xl flex items-end shadow-sm relative overflow-hidden">
          
          <!-- Recording Overlay -->
          <div v-if="isRecording" class="absolute inset-0 bg-bg-sidebar flex items-center justify-between px-4 z-10">
            <div class="flex items-center gap-3">
              <div class="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
              <span class="font-mono text-white tracking-wider">{{ formatDuration(recordingDuration) }}</span>
            </div>
            <button type="button" @click="cancelRecording" class="text-text-muted hover:text-red-400 text-sm font-medium uppercase tracking-wider transition-colors">
              Cancel
            </button>
          </div>

          <button 
            type="button" 
            @click="fileInput?.click()" 
            class="text-text-muted hover:text-accent transition-colors p-3.5 shrink-0 ml-1"
            title="Attach File"
          >
            <svg class="w-[22px] h-[22px] transform -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
          </button>
          
          <textarea 
            v-model="inputText"
            @keydown.enter.exact.prevent="handleSubmit"
            placeholder="Write a message..."
            class="flex-1 bg-transparent border-none py-[14px] focus:outline-none text-text-main placeholder-text-muted text-[15px] resize-none min-h-[50px] max-h-[150px] overflow-y-auto"
            rows="1"
            :disabled="isSending || isRecording"
          ></textarea>
          
          <div class="p-3.5 shrink-0 text-text-muted hover:text-accent transition-colors cursor-pointer mr-1">
            <!-- Emoji Icon placeholder -->
            <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
        </div>

        <button 
          v-if="!isRecording"
          type="submit" 
          class="w-[50px] h-[50px] rounded-full bg-accent hover:bg-accent-hover disabled:bg-bg-sidebar disabled:text-text-muted text-white flex items-center justify-center shrink-0 transition-colors shadow-sm"
          :disabled="isSending"
        >
          <!-- Show Send arrow if text is entered -->
          <svg v-if="inputText.trim().length > 0" class="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          <!-- Show Microphone if empty -->
          <svg v-else @click.prevent="toggleRecording" class="w-[22px] h-[22px] cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2"></line></svg>
        </button>

        <button 
          v-else
          type="button"
          @click="handleSubmit"
          class="w-[50px] h-[50px] rounded-full bg-accent hover:bg-accent-hover text-white flex items-center justify-center shrink-0 transition-colors shadow-sm"
        >
          <!-- Send Audio Arrow -->
          <svg class="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
        </button>
      </form>
    </div>
  </div>
</template>
