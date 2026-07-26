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
  (e: 'view-logs'): void
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

    <!-- View Logs Button -->
    <div class="p-4 border-t border-slate-700/50">
      <button 
        @click="emit('view-logs')"
        class="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all duration-200 border border-slate-700/50 font-medium text-sm flex items-center justify-center gap-2 shadow-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        System Logs
      </button>
    </div>

    <!-- Modals -->
    <AddBotModal 
      v-if="showAddBot" 
      @close="showAddBot = false" 
      @add="handleAddBot" 
    />
  </div>
</template>
