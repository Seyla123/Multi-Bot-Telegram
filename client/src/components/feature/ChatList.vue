<script setup lang="ts">
import { ref } from 'vue'
import BaseAvatar from '../core/BaseAvatar.vue'
import type { User } from '../../App.vue'

defineProps<{
  users: User[]
  activeUserId?: string
  loading?: boolean
  error?: string | null
  hasMore?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', user: User): void
  (e: 'loadMore'): void
}>()

const scrollContainer = ref<HTMLElement | null>(null)

const handleScroll = () => {
  if (!scrollContainer.value) return;
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;
  if (scrollHeight - scrollTop - clientHeight < 50) {
    emit('loadMore');
  }
}

const formatTime = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const getPreviewText = (user: User) => {
  const msg = user.lastMessage;
  if (!msg) return `@${user.username || user.telegramId}`;
  
  if (msg.messageType === 'text') return msg.text || '';
  if (msg.messageType === 'photo') return '📷 Photo';
  if (msg.messageType === 'video') return '📹 Video';
  if (msg.messageType === 'voice') return '🎤 Voice message';
  if (msg.messageType === 'document') return '📁 Document';
  return '📎 Media';
}

</script>

<template>
  <div class="flex-1 overflow-y-auto px-2 mt-1" ref="scrollContainer" @scroll="handleScroll">


    <!-- Error State -->
    <div v-if="error" class="p-4 text-red-400 text-sm">
      {{ error }}
    </div>
    
    <!-- User List -->
    <template v-else>
      <div v-if="users.length === 0 && !loading" class="p-4 text-text-muted text-sm text-center">
        No chats available.
      </div>
      <div 
        v-for="user in users" 
        :key="user.id"
        @click="emit('select', user)"
        class="flex items-center gap-3 p-2 mb-1 rounded-xl cursor-pointer transition-colors"
        :class="activeUserId === user.id ? 'bg-accent' : 'hover:bg-white/5'"
      >
        <BaseAvatar :name="user.firstName + ' ' + (user.lastName || '')" :id="user.id" :size="48" />
        
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-baseline mb-0.5">
            <span class="font-medium text-[15px] truncate pr-2" :class="activeUserId === user.id ? 'text-white' : 'text-text-main'">
              {{ user.firstName }} {{ user.lastName || '' }}
            </span>
            <span v-if="user.lastMessage" class="text-[12px] shrink-0" :class="activeUserId === user.id ? 'text-white/70' : 'text-text-muted'">
              {{ formatTime(user.lastMessage.createdAt) }}
            </span>
          </div>
          <div class="flex justify-between items-center gap-2">
            <div class="text-[14px] truncate" :class="activeUserId === user.id ? 'text-white/80' : 'text-text-muted'">
              <span v-if="user.lastMessage && user.lastMessage.status === 'sent'" class="mr-1 text-accent">You:</span>
              {{ getPreviewText(user) }}
            </div>
            <div v-if="user.unreadCount && user.unreadCount > 0" 
                 class="bg-blue-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shrink-0">
              {{ user.unreadCount > 99 ? '99+' : user.unreadCount }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Loading Indicator -->
      <div v-if="loading" class="p-2 space-y-3">
        <div v-for="i in 3" :key="'loading-'+i" class="animate-pulse flex items-center gap-3">
          <div class="w-12 h-12 bg-white/10 rounded-full shrink-0"></div>
          <div class="flex-1 space-y-2 py-1">
            <div class="h-4 bg-white/10 rounded w-3/4"></div>
            <div class="h-3 bg-white/10 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
