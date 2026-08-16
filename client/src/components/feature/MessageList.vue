<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import type { Message } from '../../services/telegramService'
import MessageBubble from './MessageBubble.vue'
import ContextMenu from '../core/ContextMenu.vue'

const props = defineProps<{
  messages: Message[]
  pendingMessages?: Message[]
  loading?: boolean
  error?: string | null
  hasMore?: boolean
}>()

const emit = defineEmits<{
  (e: 'media-click', url: string): void
  (e: 'reply', msg: Message): void
  (e: 'pin', msg: Message): void
  (e: 'delete', msg: Message): void
  (e: 'copy', text: string): void
  (e: 'loadMore'): void
  (e: 'remove-pending', id: string): void
  (e: 'retry-pending', id: string): void
}>()

// Efficient Map for reply lookups without N+1 requests
const messageMap = computed(() => {
  const map = new Map<string, Message>()
  for (const msg of props.messages) {
    map.set(msg.id, msg)
  }
  return map
})

// Date separator formatting
const formatDateSeparator = (dateStr: string) => {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })
  }
}

// Interleave date separators
const processedItems = computed(() => {
  const items: ({ type: 'date'; id: string; label: string } | { type: 'message'; id: string; message: Message; pending?: boolean })[] = []
  let lastDateLabel = ''

  const allMessages = [
    ...props.messages.map(m => ({ ...m, pending: false })),
    ...(props.pendingMessages || []).map(m => ({ ...m, pending: true }))
  ]

  for (const msg of allMessages) {
    const dateLabel = formatDateSeparator(msg.createdAt)
    if (dateLabel !== lastDateLabel) {
      items.push({ type: 'date', id: `date-${dateLabel}`, label: dateLabel })
      lastDateLabel = dateLabel
    }
    items.push({ type: 'message', id: msg.id, message: msg })
  }
  return items
})

// Context Menu State
const contextMenu = ref<{
  visible: boolean
  x: number
  y: number
  actions: { label: string; icon?: string; action: () => void; danger?: boolean }[]
}>({
  visible: false,
  x: 0,
  y: 0,
  actions: []
})

const copyText = (text: string) => {
  navigator.clipboard.writeText(text).catch(err => {
    console.error('Failed to copy', err)
  })
}

const handleContextMenu = (e: MouseEvent | TouchEvent, msg: Message) => {
  e.preventDefault()
  
  // Extract coordinates for desktop (MouseEvent) or mobile (TouchEvent)
  let x = 0
  let y = 0
  
  if (window.TouchEvent && e instanceof TouchEvent) {
    x = e.changedTouches[0].clientX
    y = e.changedTouches[0].clientY
  } else {
    x = (e as MouseEvent).clientX
    y = (e as MouseEvent).clientY
  }

  const actions = []

  // Always allow Reply and Copy (if it has text/content)
  actions.push({
    label: 'Reply',
    icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>`,
    action: () => emit('reply', msg)
  })

  if (msg.text) {
    actions.push({
      label: 'Copy Text',
      icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>`,
      action: () => {
        copyText(msg.text)
        emit('copy', msg.text)
      }
    })
  }

  actions.push({
    label: msg.isPinned ? 'Unpin' : 'Pin',
    icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>`,
    action: () => emit('pin', msg)
  })

  // Own message specific actions
  if (msg.status === 'sent') {
    actions.push({
      label: 'Delete',
      danger: true,
      icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`,
      action: () => emit('delete', msg)
    })
  }

  contextMenu.value = {
    visible: true,
    x,
    y,
    actions
  }
}

const container = ref<HTMLElement | null>(null)
const messageWrapper = ref<HTMLElement | null>(null)
const userHasScrolledUp = ref(false)
const showScrollButton = ref(false)
const unreadCount = ref(0)

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  
  const isScrolledUp = target.scrollHeight - target.clientHeight > target.scrollTop + 50
  userHasScrolledUp.value = isScrolledUp
  
  if (!isScrolledUp) {
    showScrollButton.value = false
    unreadCount.value = 0
  }
  
  if (target.scrollTop < 50 && props.hasMore && !props.loading) {
    emit('loadMore')
  }
}

const forceScrollToBottom = async () => {
  await nextTick()
  if (container.value) {
    container.value.scrollTop = container.value.scrollHeight
  }
  showScrollButton.value = false
  unreadCount.value = 0
}



let prevFirstMsgId: string | undefined
let prevLastMsgId: string | undefined
let oldScrollHeight = 0
let oldScrollTop = 0
let isPaginationUpdate = false

watch(() => props.messages, async (msgs) => {
  if (!container.value) return

  const currentFirstId = msgs[0]?.id
  const currentLastId = msgs[msgs.length - 1]?.id
  
  const isPrepend = prevFirstMsgId && currentFirstId && currentFirstId !== prevFirstMsgId
  const isAppend = prevLastMsgId && currentLastId && currentLastId !== prevLastMsgId
  const isInitial = !prevFirstMsgId && msgs.length > 0

  if (isPrepend) {
    oldScrollHeight = messageWrapper.value ? messageWrapper.value.scrollHeight : container.value.scrollHeight
    oldScrollTop = container.value.scrollTop
    isPaginationUpdate = true
  } 

  prevFirstMsgId = currentFirstId
  prevLastMsgId = currentLastId

  await nextTick()

  if (isPaginationUpdate) {
    const newScrollHeight = messageWrapper.value ? messageWrapper.value.scrollHeight : container.value.scrollHeight
    container.value.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight)
    isPaginationUpdate = false
  } else if (isAppend) {
    if (userHasScrolledUp.value) {
      showScrollButton.value = true
      unreadCount.value += 1
    } else {
      forceScrollToBottom()
    }
  } else if (isInitial) {
    forceScrollToBottom()
  }
}, { deep: true, flush: 'pre' })

watch(() => props.pendingMessages, async (newPending, oldPending) => {
  if (!newPending || newPending.length === 0) return;
  // Only trigger on new additions
  if (oldPending && newPending.length <= oldPending.length) return;
  
  await nextTick()
  if (!userHasScrolledUp.value) {
    forceScrollToBottom()
  }
}, { deep: true })

// Auto-fill mechanism for when the fetched messages don't fill the screen (preventing scroll events)
const checkFillContainer = async () => {
  if (!container.value || props.loading || !props.hasMore || props.messages.length === 0) return
  
  // If the content is smaller than or just barely larger than the container, 
  // there is no scrollbar (or barely one), so the user cannot scroll up.
  if (container.value.scrollHeight <= container.value.clientHeight + 50) {
    emit('loadMore')
  }
}

const handleMediaLoad = () => {
  if (!userHasScrolledUp.value) {
    forceScrollToBottom()
  }
}

watch(() => props.loading, async (isLoading) => {
  if (!isLoading) {
    await nextTick()
    checkFillContainer()
  }
})

defineExpose({
  scrollToBottom: forceScrollToBottom
})
</script>

<template>
  <div 
    class="flex-1 min-h-0 p-6 overflow-y-auto flex flex-col gap-4" 
    style="overflow-anchor: none;"
    ref="container"
    @scroll="handleScroll"
  >
    <div v-if="loading && !messages.length" class="flex items-center justify-center h-full">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
    </div>
    
    <div v-else-if="error" class="text-red-400 text-center mt-4">
      {{ error }}
    </div>
    
    <div v-else-if="messages.length === 0" class="flex items-center justify-center h-full select-none">
      <div class="bg-black/30 backdrop-blur-sm px-5 py-2 rounded-full text-white/80 text-[14px] font-medium shadow-sm">
        No messages here yet...
      </div>
    </div>

    <template v-else>
      <!-- Top loading indicator for pagination (doesn't destroy messages) -->
      <div v-if="loading && messages.length > 0" class="flex items-center justify-center py-2 shrink-0">
        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-accent"></div>
      </div>
      
      <!-- Spacer to push messages to bottom without clipping top when overflowing -->
      <div class="flex-1 min-h-0 pointer-events-none"></div>
      <div class="flex flex-col gap-2 max-w-3xl mx-auto w-full" ref="messageWrapper">
        <template v-for="item in processedItems" :key="item.id">
          <!-- Date Separator -->
          <div v-if="item.type === 'date'" class="flex justify-center my-3 select-none">
            <span class="bg-black/20 text-text-muted text-[12px] font-medium px-3 py-1 rounded-full shadow-sm backdrop-blur-sm">
              {{ item.label }}
            </span>
          </div>

          <!-- Message Bubble -->
          <MessageBubble 
            v-else
            :msg="item.message"
            :repliedMessage="item.message.replyToId ? messageMap.get(item.message.replyToId) : undefined"
            @media-click="url => emit('media-click', url)"
            @reply="emit('reply', item.message)"
            @pin="emit('pin', item.message)"
            @delete="emit('delete', item.message)"
            @contextmenu="e => handleContextMenu(e, item.message)"
            @retry-pending="emit('retry-pending', item.message.id)"
            @remove-pending="emit('remove-pending', item.message.id)"
            @media-load="handleMediaLoad"
          />
        </template>
      </div>
    </template>
    
    <ContextMenu 
      v-if="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :actions="contextMenu.actions"
      @close="contextMenu.visible = false"
    />

    <!-- Scroll to Bottom Button -->
    <transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="transform translate-y-10 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform translate-y-10 opacity-0"
    >
      <button 
        v-if="showScrollButton"
        @click="forceScrollToBottom"
        class="absolute bottom-6 right-6 md:bottom-8 md:right-10 w-12 h-12 bg-bg-sidebar border border-white/10 rounded-full shadow-2xl flex items-center justify-center text-text-muted hover:text-accent hover:bg-black/40 transition-all z-20"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
        <!-- Unread Badge -->
        <span v-if="unreadCount > 0" class="absolute -top-1 -right-1 bg-accent text-white text-[11px] font-bold px-1.5 min-w-[20px] h-[20px] rounded-full flex items-center justify-center shadow-sm border border-bg-chat">
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </button>
    </transition>
  </div>
</template>
