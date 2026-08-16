<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { Message } from '../../services/telegramService'

const props = defineProps<{
  msg: Message
  repliedMessage?: Message | null
}>()

const emit = defineEmits<{
  (e: 'media-click', url: string): void
  (e: 'contextmenu', event: MouseEvent | TouchEvent): void
  (e: 'remove-pending'): void
  (e: 'retry-pending'): void
  (e: 'media-load'): void
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

const tempMediaUrl = ref<string>('')

const cleanPath = computed(() => tempMediaUrl.value || (props.msg.filePath ? props.msg.filePath.split('?')[0] : ''))
const isPhoto = computed(() => props.msg.messageType === 'photo' || (props.msg.file?.type.startsWith('image/')) || cleanPath.value.match(/\.(jpg|jpeg|png|gif|webp)$/i))
const isVideo = computed(() => props.msg.messageType === 'video' || (props.msg.file?.type.startsWith('video/')) || cleanPath.value.match(/\.(mp4|mov|webm)$/i))
const isVoice = computed(() => props.msg.messageType === 'voice' || props.msg.messageType === 'audio' || (props.msg.file?.type.startsWith('audio/')) || cleanPath.value.match(/\.(ogg|wav|mp3|m4a|webm)$/i))
const isDocument = computed(() => (props.msg.filePath || props.msg.file) && !isPhoto.value && !isVideo.value && !isVoice.value)

const mediaUrl = computed(() => tempMediaUrl.value || (props.msg.filePath ? `/${props.msg.filePath}` : ''))

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

import { onUnmounted } from 'vue'

onMounted(() => {
  if (props.msg.file) {
    tempMediaUrl.value = URL.createObjectURL(props.msg.file)
  }
  if (audioRef.value) {
    audioRef.value.addEventListener('play', () => isPlaying.value = true)
    audioRef.value.addEventListener('pause', () => isPlaying.value = false)
    audioRef.value.addEventListener('ended', () => {
      isPlaying.value = false
      audioProgress.value = 0
    })
  }
})

onUnmounted(() => {
  if (tempMediaUrl.value) {
    URL.revokeObjectURL(tempMediaUrl.value)
  }
})

// Long Press Logic
let longPressTimer: ReturnType<typeof setTimeout> | null = null
let touchStartY = 0
let touchStartX = 0

const onTouchStart = (e: TouchEvent) => {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  longPressTimer = setTimeout(() => {
    emit('contextmenu', e)
  }, 500)
}

const onTouchMove = (e: TouchEvent) => {
  if (!longPressTimer) return
  const currentX = e.touches[0].clientX
  const currentY = e.touches[0].clientY
  // Cancel if moved more than 10px
  if (Math.abs(currentX - touchStartX) > 10 || Math.abs(currentY - touchStartY) > 10) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

const onTouchEnd = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

const onContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  emit('contextmenu', e)
}

const scrollToOriginal = () => {
  if (!props.msg.replyToId) return
  const el = document.getElementById(`msg-${props.msg.replyToId}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('bg-white/20', 'transition-colors', 'duration-500')
    setTimeout(() => el.classList.remove('bg-white/20'), 1500)
  }
}
</script>

<template>
  <div 
    :id="`msg-${msg.id}`"
    class="max-w-[85%] md:max-w-[70%] flex flex-col text-[15px] group w-fit" 
    :class="msg.status === 'sent' || msg.status === 'sending' || msg.status === 'failed' ? 'self-end' : 'self-start'"
  >


    <div 
      class="relative shadow-sm break-words min-w-[75px] flex flex-col transition-transform active:scale-[0.99] rounded-[18px]"
      @contextmenu="onContextMenu"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
      style="-webkit-touch-callout: none;"
      :class="[
        msg.status === 'sent' || msg.status === 'sending' || msg.status === 'failed'
          ? 'bg-msg-out text-msg-out-text rounded-br-[4px]' 
          : 'bg-msg-in text-text-main rounded-bl-[4px] border border-white/5',
        (!parsedText && isPhoto) ? 'p-0.5' : 'px-2.5 py-1.5',
        msg.status === 'failed' ? 'opacity-80 border border-red-500/50' : ''
      ]"
    >
      <!-- Agent Name (if outgoing) -->
      <div v-if="(msg.status === 'sent' || msg.status === 'sending' || msg.status === 'failed') && msg.agent" class="text-[12px] font-medium text-msg-out-text opacity-90 mb-0.5 px-0.5 flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        {{ msg.agent.name }}
      </div>

      <!-- Reply Preview Box -->
      <div 
        v-if="msg.replyToId" 
        @click="scrollToOriginal"
        class="mb-1.5 pl-2.5 pr-3 py-1 flex flex-col border-l-[3px] rounded-r-md cursor-pointer hover:bg-black/10 transition-colors"
        :class="msg.status === 'sent' ? 'border-[#a8d3a8] bg-[#dcf8c6]/10' : 'border-accent bg-accent/10'"
      >
        <template v-if="repliedMessage">
          <span class="text-[13px] font-medium" :class="msg.status === 'sent' ? 'text-[#3c823c]' : 'text-accent'">
            {{ repliedMessage.status === 'sent' ? 'You' : 'User' }}
          </span>
          <span class="text-[13px] truncate opacity-80">
            {{ repliedMessage.text || (repliedMessage.messageType !== 'text' ? 'Media message' : '') }}
          </span>
        </template>
        <template v-else>
          <span class="text-[13px] opacity-70 italic">Original message unavailable</span>
        </template>
      </div>
      <template v-if="msg.filePath || msg.file">
        <!-- PHOTO -->
        <template v-if="isPhoto">
          <div class="relative cursor-pointer max-w-[300px]" @click="emit('media-click', mediaUrl)">
            <img 
              :src="mediaUrl" 
              @load="emit('media-load')"
              class="w-full h-auto object-cover"
              :class="parsedText ? 'rounded-lg mb-1' : 'rounded-[14px]'"
              alt="Media attachment"
            />
            <!-- Overlay Timestamp if NO text -->
            <div v-if="!parsedText" class="absolute bottom-2 right-2 bg-black/40 text-white rounded-full px-1.5 py-0.5 text-[11px] flex items-center gap-1 select-none pointer-events-none shadow-sm backdrop-blur-sm shrink-0">
              <template v-if="msg.status === 'sending'">
                <span v-if="msg.progress !== undefined" class="mr-1">{{ msg.progress }}%</span>
                <svg class="w-3.5 h-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </template>
              <template v-else-if="msg.status === 'failed'">
                <span class="text-red-400 font-medium">Failed</span>
              </template>
              <template v-else>
                {{ formatTime(msg.createdAt) }}
                <svg v-if="msg.status === 'sent'" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </template>
            </div>
          </div>
        </template>
        <!-- VIDEO -->
        <template v-else-if="isVideo">
          <div class="relative max-w-[300px]">
            <video 
              :src="mediaUrl" 
              controls
              @loadeddata="emit('media-load')"
              class="w-full h-auto bg-black/20"
              :class="parsedText ? 'rounded-lg mb-1' : 'rounded-[14px]'"
            ></video>
            <!-- Overlay Timestamp if NO text -->
            <div v-if="!parsedText" class="absolute bottom-6 right-2 bg-black/40 text-white rounded-full px-1.5 py-0.5 text-[11px] flex items-center gap-1 select-none pointer-events-none shadow-sm backdrop-blur-sm shrink-0">
              <template v-if="msg.status === 'sending'">
                <span v-if="msg.progress !== undefined" class="mr-1">{{ msg.progress }}%</span>
                <svg class="w-3.5 h-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </template>
              <template v-else-if="msg.status === 'failed'">
                <span class="text-red-400 font-medium">Failed</span>
              </template>
              <template v-else>
                {{ formatTime(msg.createdAt) }}
                <svg v-if="msg.status === 'sent'" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </template>
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
        <div class="whitespace-pre-wrap break-words leading-[1.3] text-[15px]" :class="msg.filePath || msg.file ? '' : 'pt-0.5'">
          {{ parsedText }}
        </div>
        <div class="text-[11px] flex items-center gap-1 ml-auto shrink-0 pb-[1px]" :class="msg.status === 'sent' || msg.status === 'sending' || msg.status === 'failed' ? 'text-msg-out-text' : 'text-text-muted opacity-60'">
          <template v-if="msg.status === 'sending'">
            <span v-if="msg.progress !== undefined" class="mr-0.5 opacity-80">Uploading {{ msg.progress }}%</span>
            <span v-else class="mr-0.5 opacity-80">Sending...</span>
            <svg class="w-3.5 h-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </template>
          <template v-else-if="msg.status === 'failed'">
            <span class="text-red-400 font-medium">Failed</span>
          </template>
          <template v-else>
            <span class="opacity-80">{{ formatTime(msg.createdAt) }}</span>
            <svg v-if="msg.status === 'sent'" class="w-3.5 h-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </template>
        </div>
      </div>
      
      <!-- Fallback Timestamp for media without text (Voice/Document) -->
      <div v-if="!parsedText && (isVoice || isDocument)" class="flex justify-end mt-0.5">
        <div class="text-[11px] flex items-center gap-1" :class="msg.status === 'sent' || msg.status === 'sending' || msg.status === 'failed' ? 'text-msg-out-text' : 'text-text-muted opacity-60'">
          <template v-if="msg.status === 'sending'">
            <span v-if="msg.progress !== undefined" class="mr-0.5 opacity-80">Uploading {{ msg.progress }}%</span>
            <span v-else class="mr-0.5 opacity-80">Sending...</span>
            <svg class="w-3.5 h-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </template>
          <template v-else-if="msg.status === 'failed'">
            <span class="text-red-400 font-medium">Failed</span>
          </template>
          <template v-else>
            <span class="opacity-80">{{ formatTime(msg.createdAt) }}</span>
            <svg v-if="msg.status === 'sent'" class="w-3.5 h-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </template>
        </div>
      </div>
    </div>
    
    <!-- Failed Actions below bubble -->
    <div v-if="msg.status === 'failed'" class="flex items-center gap-2 mt-1 self-end mr-1 text-[13px]">
      <span v-if="msg.error" class="text-text-muted max-w-[150px] truncate text-xs">{{ msg.error }}</span>
      <button @click.stop="emit('remove-pending')" class="text-text-muted hover:text-white transition-colors" title="Delete">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
      <button @click.stop="emit('retry-pending')" class="text-red-400 hover:text-red-300 font-medium flex items-center gap-1 transition-colors" title="Retry">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
        Retry
      </button>
    </div>
  </div>
</template>
