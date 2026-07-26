<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { User } from '../App.vue'
import { TelegramService, type Message } from '../services/telegramService'
import { useTelegramMessages } from '../composables/useTelegramMessages'

import ChatHeader from './feature/ChatHeader.vue'
import PinnedBanner from './feature/PinnedBanner.vue'
import MessageList from './feature/MessageList.vue'
import MessageInput from './feature/MessageInput.vue'
import BaseLightbox from './core/BaseLightbox.vue'

const props = defineProps<{
  user: User
}>()

const {
  messages,
  loading,
  error,
  isSending,
  hasMore,
  fetchMessages,
  sendMessage,
  deleteMessage,
  togglePin,
  setupRealtime
} = useTelegramMessages(() => props.user)

const activeLightbox = ref<string | null>(null)
const replyingTo = ref<Message | null>(null)
const pinnedMessage = ref<Message | null>(null)

const markAsRead = () => {
  if (props.user.unreadCount && props.user.unreadCount > 0) {
    props.user.unreadCount = 0
    TelegramService.markAsRead(props.user.id).catch(err => {
      console.error('Failed to mark as read', err)
    })
  }
}

watch(() => props.user.id, () => {
  replyingTo.value = null
  fetchMessages(false)
  markAsRead()
})

onMounted(() => {
  fetchMessages(false)
  setupRealtime()
  markAsRead()
})

const handleSend = async (text: string, file: File | null) => {
  await sendMessage(text, file, replyingTo.value?.id)
  replyingTo.value = null
}
</script>

<template>
  <div class="flex flex-col flex-1 bg-bg-chat min-w-0 h-full relative chat-bg-pattern">
    <ChatHeader :user="user" @search="() => {}" @more="() => {}" />
    
    <PinnedBanner 
      v-if="pinnedMessage" 
      :message="pinnedMessage" 
      @unpin="pinnedMessage = null" 
      @click="() => {}" 
    />

    <MessageList 
      :messages="messages" 
      :loading="loading" 
      :error="error"
      :hasMore="hasMore"
      @loadMore="() => fetchMessages(true)"
      @media-click="url => activeLightbox = url"
      @reply="msg => replyingTo = msg"
      @pin="async (msg) => { pinnedMessage = msg; await togglePin(msg.id) }"
      @delete="async (msg) => { await deleteMessage(msg.id); if (pinnedMessage?.id === msg.id) pinnedMessage = null }"
    />

    <MessageInput 
      :isSending="isSending"
      :replyingTo="replyingTo"
      @send="handleSend"
      @cancel-reply="replyingTo = null"
    />

    <!-- Media Lightbox Modal -->
    <BaseLightbox 
      v-if="activeLightbox" 
      :src="activeLightbox" 
      @close="activeLightbox = null" 
    />
  </div>
</template>
