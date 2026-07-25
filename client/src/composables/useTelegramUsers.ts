import { ref, computed } from 'vue';
import type { User } from '../App.vue';
import { TelegramService } from '../services/telegramService';

export function useTelegramUsers() {
  const users = ref<User[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const searchQuery = ref('');

  const fetchUsers = async () => {
    loading.value = true;
    error.value = null;
    try {
      users.value = await TelegramService.getUsers();
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch users';
    } finally {
      loading.value = false;
    }
  };

  const filteredUsers = computed(() => {
    const query = searchQuery.value.toLowerCase().trim();
    if (!query) return users.value;
    
    return users.value.filter(u => {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      const username = (u.username || u.telegramId || '').toLowerCase();
      return name.includes(query) || username.includes(query);
    });
  });

  return {
    users,
    filteredUsers,
    loading,
    error,
    searchQuery,
    fetchUsers,
  };
}
