<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { User } from '../App.vue'
import SidebarHeader from './feature/SidebarHeader.vue'
import ChatFilterTabs from './feature/ChatFilterTabs.vue'
import ChatList from './feature/ChatList.vue'
import { useTelegramUsers } from '../composables/useTelegramUsers'

defineProps<{
  activeUserId?: string
}>()

const emit = defineEmits<{
  (e: 'select', user: User): void
}>()

const {
  filteredUsers,
  loading,
  error,
  searchQuery,
  fetchUsers
} = useTelegramUsers()

const activeTab = ref('Main Bot')

// Dummy counts for visual
const tabCounts = {
  'Main Bot': 285
}

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="w-[350px] bg-bg-sidebar border-r border-border flex flex-col shrink-0 h-full">
    <SidebarHeader v-model="searchQuery" />
    <ChatFilterTabs v-model:activeTab="activeTab" :counts="tabCounts" />
    <ChatList 
      :users="filteredUsers" 
      :loading="loading" 
      :error="error" 
      :activeUserId="activeUserId" 
      @select="u => emit('select', u)" 
    />
  </div>
</template>
