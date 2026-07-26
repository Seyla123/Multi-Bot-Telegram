<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { User } from '../App.vue'
import SidebarHeader from './feature/SidebarHeader.vue'
import ChatFilterTabs from './feature/ChatFilterTabs.vue'
import ChatList from './feature/ChatList.vue'
import AddBotModal from './feature/AddBotModal.vue'
import { useTelegramUsers } from '../composables/useTelegramUsers'
import { TelegramService, type Bot } from '../services/telegramService'

const props = defineProps<{
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
  activeBotId,
  fetchUsers,
  hasMore,
  setupRealtime,
  teardownRealtime
} = useTelegramUsers(() => props.activeUserId)

const activeTab = ref<string | number>('all')
const bots = ref<Bot[]>([])
const showAddBot = ref(false)

// Dummy counts for visual
const tabCounts = ref<Record<number, number>>({})

const loadBots = async () => {
  try {
    const res = await TelegramService.getBots()
    bots.value = res.data
  } catch (e) {
    console.error('Failed to load bots:', e)
  }
}

const handleAddBot = async (payload: { name: string, botToken: string, username?: string }) => {
  try {
    await TelegramService.createBot(payload)
    showAddBot.value = false
    await loadBots()
  } catch (e) {
    console.error('Failed to create bot:', e)
    alert('Failed to add bot. Ensure token is valid.')
  }
}

watch(activeTab, (newTab) => {
  activeBotId.value = newTab === 'all' ? undefined : Number(newTab)
  fetchUsers()
})

onMounted(async () => {
  await loadBots()
  await fetchUsers()
  setupRealtime()

  const urlParams = new URLSearchParams(window.location.search)
  const savedId = urlParams.get('chat')
  
  if (savedId && !props.activeUserId) {
    const userToRestore = filteredUsers.value.find(u => u.id === savedId)
    if (userToRestore) {
      emit('select', userToRestore)
    }
  }
})

onUnmounted(() => {
  teardownRealtime()
})
</script>

<template>
  <div class="w-[350px] bg-bg-sidebar border-r border-border flex flex-col shrink-0 h-full relative">
    <SidebarHeader v-model="searchQuery" />
    <ChatFilterTabs 
      v-model:activeTab="activeTab" 
      :bots="bots"
      :counts="tabCounts" 
      @add-bot="showAddBot = true"
    />
    <ChatList 
      :users="filteredUsers" 
      :loading="loading" 
      :error="error" 
      :activeUserId="activeUserId" 
      :hasMore="hasMore"
      @select="u => emit('select', u)" 
      @loadMore="() => fetchUsers(true)"
    />

    <AddBotModal 
      v-if="showAddBot" 
      @close="showAddBot = false" 
      @add="handleAddBot" 
    />
  </div>
</template>
