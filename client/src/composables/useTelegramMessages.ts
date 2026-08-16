import { ref, onUnmounted } from 'vue';
import { TelegramService, type Message } from '../services/telegramService';
import { getPusherChannel } from '../services/pusherService';
import type { User } from '../types/app';

export function useTelegramMessages(activeUser: () => User | null) {
  const messages = ref<Message[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isSending = ref(false);

  const pendingMessages = ref<Message[]>([]);

  const page = ref(1);
  const limit = ref(10);
  const hasMore = ref(true);

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
    const exists = messages.value.some((m) => m.id === data.id);
    if (!exists) {
      // If it's an incoming message and the chat is open, immediately mark as read
      if (data.status === 'unread') {
        data.status = 'read';
        TelegramService.markAsRead(user.id).catch(() => {});
      }
      messages.value.push(data);
      if (onMessagesUpdatedCb) onMessagesUpdatedCb();
    } else {
      // Update existing message (e.g. filePath added)
      const index = messages.value.findIndex((m) => m.id === data.id);
      messages.value[index] = data;
      if (onMessagesUpdatedCb) onMessagesUpdatedCb();
    }
  };

  const handleMessageDeleted = (data: { messageId: string }) => {
    messages.value = messages.value.filter((m) => m.id !== data.messageId);
    if (onMessagesUpdatedCb) onMessagesUpdatedCb();
  };

  const handleMessagePinned = (_data: { messageId: string }) => {
    // Optionally handle pinned state if we add it to UI
  };

  const handleMessagesRead = (data: { telegramUserId: string }) => {
    const user = activeUser();
    if (!user || data.telegramUserId !== user.id) return;

    // Update all unread incoming messages to read
    let updated = false;
    messages.value.forEach((m) => {
      if (m.status === 'unread') {
        m.status = 'read';
        updated = true;
      }
    });

    if (updated && onMessagesUpdatedCb) {
      onMessagesUpdatedCb();
    }
  };

  const setupRealtime = () => {
    const channel = getPusherChannel();
    if (!channel) return;

    channel.bind('new_message', handleNewMessage);
    channel.bind('message_deleted', handleMessageDeleted);
    channel.bind('message_pinned', handleMessagePinned);
    channel.bind('messages_read', handleMessagesRead);
  };

  const teardownRealtime = () => {
    const channel = getPusherChannel();
    if (!channel) return;

    channel.unbind('new_message', handleNewMessage);
    channel.unbind('message_deleted', handleMessageDeleted);
    channel.unbind('message_pinned', handleMessagePinned);
    channel.unbind('messages_read', handleMessagesRead);
  };

  const fetchMessages = async (loadMore = false) => {
    const user = activeUser();
    if (!user) return;

    if (loading.value && loadMore) return; // prevent duplicate loadMore
    if (loadMore && !hasMore.value) return;

    const fetchUserId = user.id;

    if (!loadMore) {
      page.value = 1;
      messages.value = []; // Clear immediately for new user
    } else {
      page.value += 1;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await TelegramService.getMessages(
        fetchUserId,
        page.value,
        limit.value,
      );

      // Abort if user switched during fetch
      if (activeUser()?.id !== fetchUserId) return;

      if (loadMore) {
        // Deduplicate using Set for performance
        const existingIds = new Set(messages.value.map((m) => m.id));
        const newMessages = response.data.filter(
          (m: Message) => !existingIds.has(m.id),
        );
        messages.value = [...newMessages, ...messages.value];
      } else {
        messages.value = response.data;
      }
      hasMore.value = page.value < response.meta.totalPages;
      if (onMessagesUpdatedCb) onMessagesUpdatedCb();
    } catch (err: any) {
      if (activeUser()?.id !== fetchUserId) return;
      error.value = err.message || 'Failed to fetch messages';
      if (loadMore) page.value -= 1; // rollback
    } finally {
      if (activeUser()?.id === fetchUserId) {
        loading.value = false;
      }
    }
  };

  const onMessagesUpdated = (cb: () => void) => {
    onMessagesUpdatedCb = cb;
  };

  const getMessageType = (file?: File | null) => {
    if (!file) return 'text';
    if (file.type.startsWith('image/')) return 'photo';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'voice';
    return 'document';
  };

  const sendMessage = async (
    text: string,
    file?: File | null,
    replyToId?: string,
  ) => {
    const user = activeUser();
    if (!user) return;
    if (!text && !file) return;

    isSending.value = true;

    const tempId = crypto.randomUUID();
    const pendingMsg: Message = {
      id: tempId,
      telegramUserId: user.id,
      text,
      messageType: getMessageType(file) as any,
      createdAt: new Date().toISOString(),
      status: 'sending',
      replyToId,
      file: file || undefined,
      progress: file ? 0 : undefined,
      error: null,
    };

    pendingMessages.value.push(pendingMsg);

    try {
      const response = await TelegramService.sendMessage({
        userId: user.id,
        text,
        telegramId: user.telegramId,
        replyToId,
        file,
        onProgress: file
          ? (percent) => {
              const p = pendingMessages.value.find((m) => m.id === tempId);
              if (p) p.progress = percent;
            }
          : undefined,
      });

      pendingMessages.value = pendingMessages.value.filter(
        (m) => m.id !== tempId,
      );

      if (response && response.id) {
        const exists = messages.value.some((m) => m.id === response.id);
        if (!exists) {
          messages.value.push(response);
          if (onMessagesUpdatedCb) onMessagesUpdatedCb();
        }
      }
    } catch (err: any) {
      const p = pendingMessages.value.find((m) => m.id === tempId);
      if (p) {
        p.status = 'failed';
        p.error = err.message || 'Send failed';
      }
      throw err;
    } finally {
      isSending.value = false;
    }
  };

  const removePendingMessage = (id: string) => {
    pendingMessages.value = pendingMessages.value.filter((m) => m.id !== id);
  };

  const retryPendingMessage = async (id: string) => {
    const p = pendingMessages.value.find((m) => m.id === id);
    if (!p || p.status !== 'failed') return;

    p.status = 'sending';
    p.error = null;
    p.progress = p.file ? 0 : undefined;

    const user = activeUser();
    if (!user) return;

    try {
      const response = await TelegramService.sendMessage({
        userId: user.id,
        text: p.text,
        telegramId: user.telegramId,
        replyToId: p.replyToId,
        file: p.file,
        onProgress: p.file
          ? (percent) => {
              p.progress = percent;
            }
          : undefined,
      });

      pendingMessages.value = pendingMessages.value.filter((m) => m.id !== id);

      if (response && response.id) {
        const exists = messages.value.some((m) => m.id === response.id);
        if (!exists) {
          messages.value.push(response);
          if (onMessagesUpdatedCb) onMessagesUpdatedCb();
        }
      }
    } catch (err: any) {
      p.status = 'failed';
      p.error = err.message || 'Send failed';
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      // Optimistic UI
      messages.value = messages.value.filter((m) => m.id !== messageId);
      await TelegramService.deleteMessage(messageId);
    } catch (err: any) {
      alert('Failed to delete message: ' + (err.message || 'Unknown error'));
      fetchMessages(false); // Revert UI
    }
  };

  const togglePin = async (messageId: string) => {
    try {
      await TelegramService.togglePin(messageId);
    } catch (err: any) {
      alert('Failed to pin message: ' + (err.message || 'Unknown error'));
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
    hasMore,
    sendMessage,
    deleteMessage,
    togglePin,
    setupRealtime,
    teardownRealtime,
    onMessagesUpdated,
    pendingMessages,
    removePendingMessage,
    retryPendingMessage,
  };
}
