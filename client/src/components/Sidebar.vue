<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import type { User } from '../types/app';
import SidebarHeader from './feature/SidebarHeader.vue';
import ChatList from './feature/ChatList.vue';
import AddBotModal from './feature/AddBotModal.vue';
import { useTelegramUsers } from '../composables/useTelegramUsers';
import {
  TelegramService,
  type Bot,
  type ConversationFilter,
} from '../services/telegramService';
import { useAuth } from '../composables/useAuth';
import { useRouter } from 'vue-router';

const { clearSession, currentAgent } = useAuth();
const router = useRouter();

const props = defineProps<{
  activeUserId?: string;
}>();

const emit = defineEmits<{
  (e: 'select', user: User): void;
  (e: 'view-logs'): void;
}>();

const isAdmin = computed(() => currentAgent.value?.role === 'ADMIN');

const {
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
} = useTelegramUsers(() => props.activeUserId);

const activeTab = ref<string | number>('all');
const activeConvFilter = ref<ConversationFilter>('all');
const bots = ref<Bot[]>([]);
const showAddBot = ref(false);

const convFilters: { key: ConversationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'mine', label: 'Mine' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'resolved', label: 'Resolved' },
];

const loadBots = async () => {
  try {
    const res = await TelegramService.getBots();
    bots.value = res.data;
  } catch (e) {
    console.error('Failed to load bots:', e);
  }
};

const handleAddBot = async (payload: {
  name: string;
  botToken: string;
  username?: string;
}) => {
  try {
    await TelegramService.createBot(payload);
    showAddBot.value = false;
    await loadBots();
  } catch (e) {
    console.error('Failed to create bot:', e);
    alert('Failed to add bot. Ensure token is valid.');
  }
};

watch(activeTab, (newTab) => {
  activeBotId.value = newTab === 'all' ? undefined : Number(newTab);
  fetchUsers();
});

watch(activeConvFilter, (f) => {
  activeFilter.value = f;
  fetchUsers();
});

onMounted(async () => {
  await loadBots();
  await fetchUsers();
  setupRealtime();

  const urlParams = new URLSearchParams(window.location.search);
  const savedId = urlParams.get('chat');

  if (savedId && !props.activeUserId) {
    const userToRestore = filteredUsers.value.find((u) => u.id === savedId);
    if (userToRestore) {
      emit('select', userToRestore);
    }
  }
});

onUnmounted(() => {
  teardownRealtime();
});
</script>

<template>
  <div
    class="w-full bg-bg-sidebar border-r border-border flex flex-col shrink-0 h-full relative"
  >
    <SidebarHeader v-model="searchQuery" />

    <!-- Bot Filter Tabs -->
    <div
      class="px-2 pb-1 flex gap-1 overflow-x-auto scrollbar-hide shrink-0 border-b border-border"
    >
      <button
        @click="activeTab = 'all'"
        class="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 shrink-0 transition-colors"
        :class="
          activeTab === 'all'
            ? 'bg-white/10 text-text-main'
            : 'text-text-muted hover:bg-white/5'
        "
      >
        All Bots
      </button>

      <button
        v-for="bot in bots"
        :key="bot.id"
        @click="activeTab = bot.id"
        class="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 shrink-0 transition-colors"
        :class="
          activeTab === bot.id
            ? 'bg-white/10 text-text-main'
            : 'text-text-muted hover:bg-white/5'
        "
      >
        {{ bot.name }}
      </button>

      <button
        @click="showAddBot = true"
        class="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 shrink-0 transition-colors text-text-muted hover:bg-white/5 border border-dashed border-border"
      >
        + Add Bot
      </button>
    </div>

    <!-- Conversation Status Filter -->
    <div class="px-2 pt-1.5 pb-1 flex gap-1 shrink-0">
      <button
        v-for="f in convFilters"
        :key="f.key"
        @click="activeConvFilter = f.key"
        class="px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0"
        :class="
          activeConvFilter === f.key
            ? 'bg-accent text-white shadow-sm'
            : 'text-text-muted hover:bg-white/5 border border-border'
        "
      >
        {{ f.label }}
      </button>
    </div>

    <ChatList
      :users="filteredUsers"
      :loading="loading"
      :error="error"
      :activeUserId="activeUserId"
      :hasMore="hasMore"
      :searchQuery="searchQuery"
      :currentAgentId="currentAgent?.id"
      @select="(u) => emit('select', u)"
      @loadMore="() => fetchUsers(true)"
    />

    <!-- View Logs Button -->
    <div class="p-4 border-t border-slate-700/50 space-y-2">
      <button
        v-if="isAdmin"
        @click="router.push('/admin')"
        class="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover text-white rounded-xl transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2 shadow-lg mb-1"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Admin Panel
      </button>

      <button
        @click="emit('view-logs')"
        class="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all duration-200 border border-slate-700/50 font-medium text-sm flex items-center justify-center gap-2 shadow-lg"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        System Logs
      </button>

      <div
        class="flex items-center justify-between bg-black/20 rounded-xl p-3 border border-border"
      >
        <div class="flex items-center gap-2 overflow-hidden">
          <div
            class="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0"
          >
            {{ currentAgent?.name?.charAt(0).toUpperCase() || 'A' }}
          </div>
          <div class="text-sm truncate">
            <div class="text-text-main font-medium truncate">
              {{ currentAgent?.name }}
            </div>
            <div class="text-text-muted text-xs truncate">
              {{ currentAgent?.email }}
            </div>
          </div>
        </div>
        <button
          @click="clearSession"
          class="p-2 hover:bg-white/5 text-text-muted hover:text-red-400 rounded-lg transition-colors"
          title="Logout"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Modals -->
    <AddBotModal
      v-if="showAddBot"
      @close="showAddBot = false"
      @add="handleAddBot"
    />
  </div>
</template>
