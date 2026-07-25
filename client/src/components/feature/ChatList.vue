<script setup lang="ts">
import BaseAvatar from '../core/BaseAvatar.vue'
import type { User } from '../../App.vue'

defineProps<{
  users: User[]
  activeUserId?: string
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'select', user: User): void
}>()
</script>

<template>
  <div class="flex-1 overflow-y-auto px-2 mt-1">
    <!-- Loading Skeleton -->
    <div v-if="loading" class="p-2 space-y-3">
      <div v-for="i in 5" :key="i" class="animate-pulse flex items-center gap-3">
        <div class="w-12 h-12 bg-white/10 rounded-full shrink-0"></div>
        <div class="flex-1 space-y-2 py-1">
          <div class="h-4 bg-white/10 rounded w-3/4"></div>
          <div class="h-3 bg-white/10 rounded w-1/2"></div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-4 text-red-400 text-sm">
      {{ error }}
    </div>
    
    <!-- User List -->
    <template v-else>
      <div v-if="users.length === 0" class="p-4 text-text-muted text-sm text-center">
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
            <span class="font-medium text-[15px] truncate" :class="activeUserId === user.id ? 'text-white' : 'text-text-main'">
              {{ user.firstName }} {{ user.lastName || '' }}
            </span>
          </div>
          <div class="text-[14px] truncate" :class="activeUserId === user.id ? 'text-white/80' : 'text-text-muted'">
            @{{ user.username || user.telegramId }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
