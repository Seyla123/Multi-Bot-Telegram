<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import ChatArea from './components/ChatArea.vue'
import LogsViewer from './components/LogsViewer.vue'

export interface User {
  id: string
  telegramId: string
  firstName: string
  lastName: string | null
  username: string | null
  unreadCount?: number
  lastMessage?: any | null
}

const activeUser = ref<User | null>(null)
const viewMode = ref<'chat' | 'logs'>('chat')

const handleUserSelected = (user: User) => {
  activeUser.value = user
  viewMode.value = 'chat'
  const url = new URL(window.location.href)
  url.searchParams.set('chat', user.id)
  window.history.pushState({}, '', url)
}

const handleToggleLogs = () => {
  viewMode.value = 'logs'
}
</script>

<template>
  <div class="flex h-screen w-full bg-bg-dark">
    <Sidebar :activeUserId="activeUser?.id" @select="handleUserSelected" @view-logs="handleToggleLogs" />
    
    <template v-if="viewMode === 'logs'">
      <LogsViewer />
    </template>
    
    <template v-else>
      <ChatArea v-if="activeUser" :user="activeUser" />
      <div v-else class="flex-1 flex items-center justify-center text-slate-400 text-lg">
        Select a chat to start messaging
      </div>
    </template>
  </div>
</template>
