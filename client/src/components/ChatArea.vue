<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { User } from '../types/app';
import { TelegramService, type Message } from '../services/telegramService';
import { useTelegramMessages } from '../composables/useTelegramMessages';

import ChatHeader from './feature/ChatHeader.vue';
import PinnedBanner from './feature/PinnedBanner.vue';
import MessageList from './feature/MessageList.vue';
import MessageInput from './feature/MessageInput.vue';
import BaseLightbox from './core/BaseLightbox.vue';

const props = defineProps<{
  user: User;
}>();

const emit = defineEmits<{
  (e: 'back'): void;
  (
    e: 'conversation-updated',
    payload: {
      assignedAgentId: string | null;
      assignedAgent: { id: string; name: string } | null;
      conversationStatus: string;
    },
  ): void;
}>();

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
  setupRealtime,
  pendingMessages,
  removePendingMessage,
  retryPendingMessage,
} = useTelegramMessages(() => props.user);

const activeLightbox = ref<string | null>(null);
const replyingTo = ref<Message | null>(null);
const pinnedMessage = ref<Message | null>(null);

const markAsRead = () => {
  if (props.user.unreadCount && props.user.unreadCount > 0) {
    props.user.unreadCount = 0;
    TelegramService.markAsRead(props.user.id).catch((err) => {
      console.error('Failed to mark as read', err);
    });
  }
};

watch(
  () => props.user.id,
  () => {
    replyingTo.value = null;
    fetchMessages(false);
    markAsRead();
  },
);

onMounted(() => {
  fetchMessages(false);
  setupRealtime();
  markAsRead();
});

const handleSend = async (text: string, file: File | null) => {
  await sendMessage(text, file, replyingTo.value?.id);
  replyingTo.value = null;
};

const handleLoadMore = () => fetchMessages(true);
const handleMediaClick = (url: string) => (activeLightbox.value = url);
const handleReply = (msg: Message) => (replyingTo.value = msg);
const handlePin = async (msg: Message) => {
  pinnedMessage.value = msg;
  await togglePin(msg.id);
};
const handleDelete = async (msg: Message) => {
  await deleteMessage(msg.id);
  if (pinnedMessage.value?.id === msg.id) pinnedMessage.value = null;
};
const cancelReply = () => (replyingTo.value = null);
</script>

<template>
  <div
    class="flex flex-col flex-1 bg-bg-chat min-w-0 min-h-0 h-full relative chat-bg-pattern"
  >
    <ChatHeader
      :user="user"
      @search="() => {}"
      @more="() => {}"
      @back="emit('back')"
      @conversation-updated="(payload) => emit('conversation-updated', payload)"
    />

    <PinnedBanner
      v-if="pinnedMessage"
      :message="pinnedMessage"
      @unpin="pinnedMessage = null"
      @click="() => {}"
    />

    <MessageList
      :messages="messages"
      :pendingMessages="pendingMessages"
      :loading="loading"
      :error="error"
      :hasMore="hasMore"
      @loadMore="handleLoadMore"
      @media-click="handleMediaClick"
      @reply="handleReply"
      @pin="handlePin"
      @delete="handleDelete"
      @retry-pending="retryPendingMessage"
      @remove-pending="removePendingMessage"
    />

    <MessageInput
      :isSending="isSending"
      :replyingTo="replyingTo"
      @send="handleSend"
      @cancel-reply="cancelReply"
    />

    <!-- Media Lightbox Modal -->
    <BaseLightbox
      v-if="activeLightbox"
      :src="activeLightbox"
      @close="activeLightbox = null"
    />
  </div>
</template>
