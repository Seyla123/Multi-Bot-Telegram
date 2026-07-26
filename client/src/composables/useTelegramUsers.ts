import { ref, computed, watch } from 'vue';
import type { User } from '../App.vue';
import { TelegramService, type Message } from '../services/telegramService';
import { getPusherChannel } from '../services/pusherService';

export function useTelegramUsers(activeUserId?: () => string | undefined) {
  const users = ref<User[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const searchQuery = ref('');
  const activeBotId = ref<number | undefined>(undefined);
  const page = ref(1);
  const limit = ref(50);
  const hasMore = ref(true);

  const handleNewMessage = (data: Message) => {
    const userIndex = users.value.findIndex(u => u.id === data.telegramUserId);
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

  const setupRealtime = () => {
    const channel = getPusherChannel();
    if (!channel) return;
    channel.bind('new_message', handleNewMessage);
  };

  const teardownRealtime = () => {
    const channel = getPusherChannel();
    if (!channel) return;
    channel.unbind('new_message', handleNewMessage);
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
      const response = await TelegramService.getUsers(page.value, limit.value, searchQuery.value, activeBotId.value);
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

  let debounceTimer: any;
  watch(searchQuery, () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      fetchUsers(false);
    }, 300);
  });

  const filteredUsers = computed(() => users.value);

  return {
    users,
    filteredUsers,
    loading,
    error,
    searchQuery,
    activeBotId,
    fetchUsers,
    hasMore,
    setupRealtime,
    teardownRealtime
  };
}
