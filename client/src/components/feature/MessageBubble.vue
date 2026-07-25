<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { Message } from '../../services/telegramService'

const props = defineProps<{
  msg: Message
}>()

const emit = defineEmits<{
  (e: 'media-click', url: string): void
  (e: 'reply'): void
  (e: 'pin'): void
  (e: 'delete'): void
}>()

const formatTime = (isoString: string) => {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const parseMessageContent = (msg: Message) => {
  let text = msg.text || ''
  if (text.startsWith('{')) {
    try {
      const payload = JSON.parse(text)
      return payload.caption || ''
    } catch {
      // Not JSON
    }
  }
  return text
}

const parsedText = computed(() => parseMessageContent(props.msg))
const isPhoto = computed(() => props.msg.messageType === 'photo' || (props.msg.filePath && props.msg.filePath.match(/\.(jpg|jpeg|png|gif)$/i)))
const isVideo = computed(() => props.msg.messageType === 'video' || (props.msg.filePath && props.msg.filePath.match(/\.(mp4|mov)$/i)))
const isVoice = computed(() => props.msg.messageType === 'voice' || props.msg.messageType === 'audio' || (props.msg.filePath && props.msg.filePath.match(/\.(ogg|wav|mp3|m4a|webm)$/i)))
const isDocument = computed(() => props.msg.filePath && !isPhoto.value && !isVideo.value && !isVoice.value)

const mediaUrl = computed(() => props.msg.filePath ? `/${props.msg.filePath}` : '')

// Audio Player State
const audioRef = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const audioProgress = ref(0)
const audioDuration = ref('0:00')

const togglePlay = () => {
  if (!audioRef.value) return
  if (isPlaying.value) {
    audioRef.value.pause()
  } else {
    audioRef.value.play()
  }
}

const handleTimeUpdate = () => {
  if (!audioRef.value) return
  const current = audioRef.value.currentTime
  const total = audioRef.value.duration || 1
  audioProgress.value = (current / total) * 100
}

const handleLoadedMetadata = () => {
  if (!audioRef.value) return
  const total = audioRef.value.duration
  if (isFinite(total)) {
    const m = Math.floor(total / 60)
    const s = Math.floor(total % 60).toString().padStart(2, '0')
    audioDuration.value = `${m}:${s}`
  }
}

onMounted(() => {
  if (audioRef.value) {
    audioRef.value.addEventListener('play', () => isPlaying.value = true)
    audioRef.value.addEventListener('pause', () => isPlaying.value = false)
    audioRef.value.addEventListener('ended', () => {
      isPlaying.value = false
      audioProgress.value = 0
    })
  }
})
</script>

<template>
  <div class="max-w-[70%] flex text-[15px] group w-fit" :class="msg.status === 'sent' ? 'self-end' : 'self-start'">
    
    <!-- Context Menu (Hover) - Sent Side -->
    <div v-if="msg.status === 'sent'" class="opacity-0 group-hover:opacity-100 flex items-center gap-1 mr-2 transition-opacity shrink-0 self-center">
      <button @click="emit('reply')" class="p-1.5 text-text-muted hover:text-white bg-black/20 rounded-full" title="Reply">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
      </button>
      <button @click="emit('pin')" class="p-1.5 text-text-muted hover:text-white bg-black/20 rounded-full" title="Pin">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
      </button>
      <button @click="emit('delete')" class="p-1.5 text-text-muted hover:text-red-400 bg-black/20 rounded-full" title="Delete">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
      </button>
    </div>

    <div 
      class="relative shadow-sm break-words min-w-[75px] flex flex-col"
      :class="[
        msg.status === 'sent' 
          ? 'bg-msg-out text-msg-out-text rounded-2xl rounded-br-sm' 
          : 'bg-msg-in text-text-main rounded-2xl rounded-bl-sm border border-white/5',
        (!parsedText && isPhoto) ? 'p-0.5' : 'px-3 py-2'
      ]"
    >
      <template v-if="msg.filePath">
        <!-- PHOTO -->
        <template v-if="isPhoto">
          <div class="relative cursor-pointer max-w-[300px]" @click="emit('media-click', mediaUrl)">
            <img 
              :src="mediaUrl" 
              class="w-full h-auto object-cover"
              :class="parsedText ? 'rounded-lg mb-1' : 'rounded-[14px]'"
              alt="Media attachment"
            />
            <!-- Overlay Timestamp if NO text -->
            <div v-if="!parsedText" class="absolute bottom-2 right-2 bg-black/40 text-white rounded-full px-1.5 py-0.5 text-[11px] flex items-center gap-1 select-none pointer-events-none shadow-sm backdrop-blur-sm shrink-0">
              {{ formatTime(msg.createdAt) }}
              <svg v-if="msg.status === 'sent'" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          </div>
        </template>
        <!-- VIDEO -->
        <template v-else-if="isVideo">
          <div class="relative max-w-[300px]">
            <video 
              :src="mediaUrl" 
              controls
              class="w-full h-auto bg-black/20"
              :class="parsedText ? 'rounded-lg mb-1' : 'rounded-[14px]'"
            ></video>
            <!-- Overlay Timestamp if NO text -->
            <div v-if="!parsedText" class="absolute bottom-6 right-2 bg-black/40 text-white rounded-full px-1.5 py-0.5 text-[11px] flex items-center gap-1 select-none pointer-events-none shadow-sm backdrop-blur-sm shrink-0">
              {{ formatTime(msg.createdAt) }}
              <svg v-if="msg.status === 'sent'" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          </div>
        </template>
        <!-- VOICE / AUDIO -->
        <template v-else-if="isVoice">
          <div class="flex items-center gap-3 mb-1 p-2 bg-black/10 rounded-xl min-w-[240px]">
            <audio ref="audioRef" :src="mediaUrl" @timeupdate="handleTimeUpdate" @loadedmetadata="handleLoadedMetadata" class="hidden"></audio>
            
            <button @click="togglePlay" class="w-12 h-12 bg-accent rounded-full flex items-center justify-center shrink-0 hover:bg-accent-hover transition-colors shadow-sm text-white">
              <svg v-if="!isPlaying" class="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
              <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            </button>
            <div class="flex-1 min-w-0">
              <div class="h-1 bg-black/20 rounded-full w-full overflow-hidden">
                <div class="h-full bg-accent transition-all duration-75" :style="{ width: `${audioProgress}%` }"></div>
              </div>
              <div class="flex items-center justify-between mt-1.5 px-0.5">
                <span class="text-[11px] font-medium opacity-80">{{ audioDuration }}</span>
                <span class="text-[11px] opacity-60">Voice Message</span>
              </div>
            </div>
          </div>
        </template>
        <!-- DOCUMENT -->
        <template v-else-if="isDocument">
          <a :href="mediaUrl" target="_blank" class="flex flex-col gap-1 mb-1 p-3 bg-black/10 rounded-xl hover:bg-black/20 transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-accent rounded-full flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <span class="truncate text-sm font-medium">Download File</span>
            </div>
          </a>
        </template>
      </template>
      
      <!-- Text & Inline Timestamp using flex-wrap strategy -->
      <div v-if="parsedText" class="flex flex-wrap items-end justify-between gap-x-2">
        <div class="whitespace-pre-wrap break-words leading-[1.3] text-[15px]" :class="msg.filePath ? '' : 'pt-0.5'">
          {{ parsedText }}
        </div>
        <div class="text-[11px] opacity-60 flex items-center gap-1 ml-auto shrink-0 pb-[1px]" :class="msg.status === 'sent' ? 'text-msg-out-text' : 'text-text-muted'">
          {{ formatTime(msg.createdAt) }}
          <svg v-if="msg.status === 'sent'" class="w-3.5 h-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      </div>
      
      <!-- Fallback Timestamp for media without text (Voice/Document) -->
      <div v-if="!parsedText && (isVoice || isDocument)" class="flex justify-end mt-0.5">
        <div class="text-[11px] opacity-60 flex items-center gap-1" :class="msg.status === 'sent' ? 'text-msg-out-text' : 'text-text-muted'">
          {{ formatTime(msg.createdAt) }}
          <svg v-if="msg.status === 'sent'" class="w-3.5 h-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      </div>
    </div>

    <!-- Context Menu (Hover) - Received side -->
    <div v-if="msg.status === 'received'" class="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-2 transition-opacity shrink-0 self-center">
      <button @click="emit('reply')" class="p-1.5 text-text-muted hover:text-white bg-black/20 rounded-full" title="Reply">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
      </button>
      <button @click="emit('pin')" class="p-1.5 text-text-muted hover:text-white bg-black/20 rounded-full" title="Pin">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
      </button>
      <button @click="emit('delete')" class="p-1.5 text-text-muted hover:text-red-400 bg-black/20 rounded-full" title="Delete">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
      </button>
    </div>

  </div>
</template>
