import { ref, onUnmounted } from 'vue';
import { TelegramService, type Message } from '../services/telegramService';
import { getPusherChannel } from '../services/pusherService';
import type { User } from '../App.vue';

export function useTelegramMessages(activeUser: () => User | null) {
  const messages = ref<Message[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isSending = ref(false);

  let onMessagesUpdatedCb: (() => void) | null = null;

  const handleNewMessage = (data: Message) => {
    console.log('[Pusher] Received new_message:', data);
    const user = activeUser();
    console.log('[Pusher] Active user:', user);
    if (!user || data.telegramUserId !== user.id) {
      console.log('[Pusher] Dropped message due to user mismatch');
      return;
    }
    
    // Check if message already exists (optimistic update from sendMessage)
    const exists = messages.value.some(m => m.id === data.id);
    if (!exists) {
      messages.value.push(data);
      if (onMessagesUpdatedCb) onMessagesUpdatedCb();
    } else {
      // Update existing message (e.g. filePath added)
      const index = messages.value.findIndex(m => m.id === data.id);
      messages.value[index] = data;
      if (onMessagesUpdatedCb) onMessagesUpdatedCb();
    }
  };

  const handleMessageDeleted = (data: { messageId: string }) => {
    messages.value = messages.value.filter(m => m.id !== data.messageId);
    if (onMessagesUpdatedCb) onMessagesUpdatedCb();
  };

  const handleMessagePinned = (_data: { messageId: string }) => {
    // Optionally handle pinned state if we add it to UI
  };

  const setupRealtime = () => {
    const channel = getPusherChannel();
    if (!channel) return;
    
    channel.bind('new_message', handleNewMessage);
    channel.bind('message_deleted', handleMessageDeleted);
    channel.bind('message_pinned', handleMessagePinned);
  };

  const teardownRealtime = () => {
    const channel = getPusherChannel();
    if (!channel) return;
    
    channel.unbind('new_message', handleNewMessage);
    channel.unbind('message_deleted', handleMessageDeleted);
    channel.unbind('message_pinned', handleMessagePinned);
  };

  const fetchMessages = async (showLoading = false) => {
    const user = activeUser();
    if (!user) return;

    if (showLoading) loading.value = true;
    try {
      messages.value = await TelegramService.getMessages(user.id);
      if (onMessagesUpdatedCb) onMessagesUpdatedCb();
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch messages';
    } finally {
      if (showLoading) loading.value = false;
    }
  };

  const onMessagesUpdated = (cb: () => void) => {
    onMessagesUpdatedCb = cb;
  };

  const sendMessage = async (text: string, file?: File | null, replyToId?: string) => {
    const user = activeUser();
    if (!user) return;
    if (!text && !file) return;

    isSending.value = true;
    try {
      await TelegramService.sendMessage({
        userId: user.id,
        text,
        telegramId: user.telegramId,
        replyToId,
        file
      });
      // Removed fetchMessages() because Pusher will sync it
    } catch (err: any) {
      alert("Failed to send message: " + (err.message || 'Unknown error'));
      throw err;
    } finally {
      isSending.value = false;
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      // Optimistic UI
      messages.value = messages.value.filter(m => m.id !== messageId);
      await TelegramService.deleteMessage(messageId);
    } catch (err: any) {
      alert("Failed to delete message: " + (err.message || 'Unknown error'));
      fetchMessages(false); // Revert UI
    }
  };

  const togglePin = async (messageId: string) => {
    try {
      await TelegramService.togglePin(messageId);
    } catch (err: any) {
      alert("Failed to pin message: " + (err.message || 'Unknown error'));
    }
  };

  onUnmounted(() => {
    teardownRealtime();
  });

  return {
    messages,
    loading,
    error,
    isSending,
    fetchMessages,
    sendMessage,
    deleteMessage,
    togglePin,
    setupRealtime,
    teardownRealtime,
    onMessagesUpdated
  };
}
