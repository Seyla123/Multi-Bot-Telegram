import { ref, computed } from 'vue';
import type { User } from '../types/app';
import {
  TelegramService,
  type Message,
  type ConversationFilter,
} from '../services/telegramService';
import { getPusherChannel } from '../services/pusherService';

export function useTelegramUsers(activeUserId?: () => string | undefined) {
  const users = ref<User[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const searchQuery = ref('');
  const activeBotId = ref<number | undefined>(undefined);
  const activeFilter = ref<ConversationFilter>('all');
  const page = ref(1);
  const limit = ref(50);
  const hasMore = ref(true);

  const handleNewMessage = (data: Message) => {
    const userIndex = users.value.findIndex(
      (u) => u.id === data.telegramUserId,
    );
    if (userIndex !== -1) {
      const user = users.value[userIndex];
      user.lastMessage = data;

      const currentActiveId = activeUserId ? activeUserId() : undefined;
      if (currentActiveId !== user.id) {
        user.unreadCount = (user.unreadCount || 0) + 1;
      }

      // Move to top
      users.value.splice(userIndex, 1);
      users.value.unshift(user);
    } else {
      // New user we haven't seen, re-fetch list
      fetchUsers();
    }
  };

  const handleMessagesRead = (data: { telegramUserId: string }) => {
    const userIndex = users.value.findIndex(
      (u) => u.id === data.telegramUserId,
    );
    if (userIndex !== -1) {
      users.value[userIndex].unreadCount = 0;
    }
  };

  /**
   * Handle conversation_assigned or conversation_unassigned events.
   * Immediately update the user in the local list without refetching.
   * If the current filter no longer matches, remove the user from list.
   */
  const handleConversationAssignment = (data: {
    telegramUserId: string;
    conversationStatus: string;
    assignedAgentId: string | null;
    assignedAgent: { id: string; name: string } | null;
  }) => {
    const userIndex = users.value.findIndex(
      (u) => u.id === data.telegramUserId,
    );
    if (userIndex !== -1) {
      users.value[userIndex].assignedAgentId = data.assignedAgentId;
      users.value[userIndex].assignedAgent = data.assignedAgent;
      users.value[userIndex].conversationStatus = data.conversationStatus;

      // Remove from list if the filter no longer matches
      if (!matchesCurrentFilter(users.value[userIndex])) {
        users.value.splice(userIndex, 1);
      }
    }
    // Note: if the user is not in the list but should be (e.g. filter=mine and I just got assigned),
    // we do a targeted refetch to bring it in.
    else if (shouldBringIntoList(data)) {
      fetchUsers();
    }
  };

  /**
   * Handle conversation_resolved or conversation_reopened events.
   */
  const handleConversationStatus = (data: {
    telegramUserId: string;
    conversationStatus: string;
    assignedAgentId: string | null;
    assignedAgent: { id: string; name: string } | null;
  }) => {
    const userIndex = users.value.findIndex(
      (u) => u.id === data.telegramUserId,
    );
    if (userIndex !== -1) {
      users.value[userIndex].conversationStatus = data.conversationStatus;
      users.value[userIndex].assignedAgentId = data.assignedAgentId;
      users.value[userIndex].assignedAgent = data.assignedAgent;

      if (!matchesCurrentFilter(users.value[userIndex])) {
        users.value.splice(userIndex, 1);
      }
    }
  };

  const matchesCurrentFilter = (user: User): boolean => {
    switch (activeFilter.value) {
      case 'mine':
        return (
          user.assignedAgentId !== null && user.assignedAgentId !== undefined
        );
      case 'unassigned':
        return !user.assignedAgentId && user.conversationStatus !== 'RESOLVED';
      case 'resolved':
        return user.conversationStatus === 'RESOLVED';
      default:
        return true;
    }
  };

  const shouldBringIntoList = (data: {
    assignedAgentId: string | null;
    conversationStatus: string;
  }) => {
    switch (activeFilter.value) {
      case 'mine':
        return !!data.assignedAgentId;
      case 'unassigned':
        return !data.assignedAgentId && data.conversationStatus !== 'RESOLVED';
      case 'resolved':
        return data.conversationStatus === 'RESOLVED';
      default:
        return true;
    }
  };

  const setupRealtime = () => {
    const channel = getPusherChannel();
    if (!channel) return;
    channel.bind('new_message', handleNewMessage);
    channel.bind('messages_read', handleMessagesRead);
    channel.bind('conversation_assigned', handleConversationAssignment);
    channel.bind('conversation_unassigned', handleConversationAssignment);
    channel.bind('conversation_resolved', handleConversationStatus);
    channel.bind('conversation_reopened', handleConversationStatus);
  };

  const teardownRealtime = () => {
    const channel = getPusherChannel();
    if (!channel) return;
    channel.unbind('new_message', handleNewMessage);
    channel.unbind('messages_read', handleMessagesRead);
    channel.unbind('conversation_assigned', handleConversationAssignment);
    channel.unbind('conversation_unassigned', handleConversationAssignment);
    channel.unbind('conversation_resolved', handleConversationStatus);
    channel.unbind('conversation_reopened', handleConversationStatus);
  };

  const fetchUsers = async (loadMore = false) => {
    if (loading.value && loadMore) return; // prevent duplicate fetching
    if (loadMore && !hasMore.value) return; // prevent fetching if no more pages

    if (!loadMore) {
      page.value = 1;
      loading.value = true;
    } else {
      page.value += 1;
    }

    error.value = null;
    try {
      const response = await TelegramService.getUsers(
        page.value,
        limit.value,
        '',
        activeBotId.value,
        activeFilter.value,
      );
      if (loadMore) {
        users.value = [...users.value, ...response.data];
      } else {
        users.value = response.data;
      }
      hasMore.value = page.value < response.meta.totalPages;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch users';
      if (loadMore) page.value -= 1; // rollback page
    } finally {
      loading.value = false;
    }
  };

  const filteredUsers = computed(() => {
    if (!searchQuery.value) return users.value;
    const q = searchQuery.value.toLowerCase();
    return users.value.filter((u) => {
      const msgText =
        u.lastMessage?.messageType === 'text'
          ? u.lastMessage.text?.toLowerCase()
          : '';
      return (
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.telegramId?.toLowerCase().includes(q) ||
        (msgText && msgText.includes(q))
      );
    });
  });

  return {
    users,
    filteredUsers,
    loading,
    error,
    searchQuery,
    activeBotId,
    activeFilter,
    fetchUsers,
    hasMore,
    setupRealtime,
    teardownRealtime,
  };
}
