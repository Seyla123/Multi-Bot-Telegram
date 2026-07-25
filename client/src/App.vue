<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import ChatArea from './components/ChatArea.vue'

export interface User {
  id: string
  telegramId: string
  firstName: string
  lastName: string | null
  username: string | null
}

const activeUser = ref<User | null>(null)

const handleUserSelected = (user: User) => {
  activeUser.value = user
}
</script>

<template>
  <div class="flex h-screen w-full bg-bg-dark">
    <Sidebar :activeUserId="activeUser?.id" @select="handleUserSelected" />
    <ChatArea v-if="activeUser" :user="activeUser" />
    <div v-else class="flex-1 flex items-center justify-center text-slate-400 text-lg">
      Select a chat to start messaging
    </div>
  </div>
</template>
