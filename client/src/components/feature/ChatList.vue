<script setup lang="ts">
import { ref } from 'vue';
import BaseAvatar from '../core/BaseAvatar.vue';
import type { User } from '../../types/app';

const props = defineProps<{
  users: User[];
  activeUserId?: string;
  loading?: boolean;
  error?: string | null;
  hasMore?: boolean;
  searchQuery?: string;
  currentAgentId?: string;
}>();

const emit = defineEmits<{
  (e: 'select', user: User): void;
  (e: 'loadMore'): void;
}>();

const scrollContainer = ref<HTMLElement | null>(null);

const handleScroll = () => {
  if (!scrollContainer.value) return;
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;
  if (scrollHeight - scrollTop - clientHeight < 50) {
    emit('loadMore');
  }
};

const formatTime = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const getPreviewText = (user: User) => {
  const msg = user.lastMessage;
  if (!msg) return `@${user.username || user.telegramId}`;

  if (msg.messageType === 'text') return msg.text || '';
  if (msg.messageType === 'photo') return '📷 Photo';
  if (msg.messageType === 'video') return '📹 Video';
  if (msg.messageType === 'voice') return '🎤 Voice message';
  if (msg.messageType === 'document') return '📁 Document';
  return '📎 Media';
};

const getAssignmentLabel = (user: User): string | null => {
  if (!user.assignedAgent) return null;
  if (user.assignedAgent.id === props.currentAgentId) return 'Mine';
  return user.assignedAgent.name;
};
</script>

<template>
  <div
    class="flex-1 overflow-y-auto px-2 mt-1"
    ref="scrollContainer"
    @scroll="handleScroll"
  >
    <!-- Error State -->
    <div v-if="error" class="p-4 text-red-400 text-sm">
      {{ error }}
    </div>

    <!-- User List -->
    <template v-else>
      <div
        v-if="searchQuery"
        class="px-4 py-2 text-[12px] text-accent text-center font-medium bg-accent/10 rounded-md mx-2 mb-2"
      >
        Searching currently loaded users
      </div>

      <div
        v-if="users.length === 0 && !loading"
        class="p-4 text-text-muted text-sm text-center mt-4"
      >
        {{ searchQuery ? 'No chats found' : 'No chats available' }}
      </div>
      <div
        v-for="user in users"
        :key="user.id"
        @click="emit('select', user)"
        class="flex items-center gap-3 px-3 py-2.5 mx-2 mb-1 rounded-xl cursor-pointer transition-colors active:scale-[0.98]"
        :class="
          activeUserId === user.id ? 'bg-accent shadow-sm' : 'hover:bg-white/5'
        "
      >
        <div class="relative shrink-0">
          <BaseAvatar
            :name="user.firstName + ' ' + (user.lastName || '')"
            :id="user.id"
            :size="48"
          />
          <!-- Resolved indicator -->
          <span
            v-if="user.conversationStatus === 'RESOLVED'"
            class="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-bg-sidebar rounded-full flex items-center justify-center"
            title="Resolved"
          >
            <svg
              class="w-2.5 h-2.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="3"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </span>
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-baseline mb-0.5">
            <span
              class="font-medium text-[15px] truncate pr-2"
              :class="
                activeUserId === user.id ? 'text-white' : 'text-text-main'
              "
            >
              {{ user.firstName }} {{ user.lastName || '' }}
            </span>
            <span
              v-if="user.lastMessage"
              class="text-[12px] shrink-0"
              :class="
                activeUserId === user.id ? 'text-white/70' : 'text-text-muted'
              "
            >
              {{ formatTime(user.lastMessage.createdAt) }}
            </span>
          </div>
          <div class="flex justify-between items-center gap-2">
            <div
              class="text-[14px] truncate"
              :class="
                activeUserId === user.id ? 'text-white/90' : 'text-text-muted'
              "
            >
              <span
                v-if="user.lastMessage && user.lastMessage.status === 'sent'"
                class="mr-1"
                :class="activeUserId === user.id ? 'text-white' : 'text-accent'"
                >You:</span
              >
              {{ getPreviewText(user) }}
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <!-- Assignment badge -->
              <span
                v-if="getAssignmentLabel(user)"
                class="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                :class="[
                  activeUserId === user.id
                    ? 'bg-white/20 text-white'
                    : user.assignedAgent?.id === currentAgentId
                      ? 'bg-accent/20 text-accent'
                      : 'bg-white/10 text-text-muted',
                ]"
              >
                {{ getAssignmentLabel(user) }}
              </span>
              <!-- Unread count -->
              <div
                v-if="user.unreadCount && user.unreadCount > 0"
                class="text-[12px] font-bold px-1.5 py-0.5 rounded-full min-w-[22px] h-[22px] text-center shrink-0 flex items-center justify-center shadow-sm"
                :class="
                  activeUserId === user.id
                    ? 'bg-white text-accent'
                    : 'bg-accent text-white'
                "
              >
                {{ user.unreadCount > 99 ? '99+' : user.unreadCount }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading Indicator -->
      <div v-if="loading" class="mt-1 space-y-1">
        <div
          v-for="i in 5"
          :key="'loading-' + i"
          class="animate-pulse flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl"
        >
          <div class="w-12 h-12 bg-white/10 rounded-full shrink-0"></div>
          <div class="flex-1 space-y-2.5 py-1">
            <div class="h-3.5 bg-white/10 rounded-full w-2/3"></div>
            <div class="h-3 bg-white/10 rounded-full w-1/2"></div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
