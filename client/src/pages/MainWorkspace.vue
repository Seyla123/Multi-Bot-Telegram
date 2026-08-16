<script setup lang="ts">
import { ref } from 'vue';
import Sidebar from '../components/Sidebar.vue';
import ChatArea from '../components/ChatArea.vue';
import LogsViewer from '../components/LogsViewer.vue';
import type { User } from '../types/app';

const activeUser = ref<User | null>(null);
const viewMode = ref<'chat' | 'logs'>('chat');

const handleUserSelected = (user: User) => {
  activeUser.value = user;
  viewMode.value = 'chat';
  const url = new URL(window.location.href);
  url.searchParams.set('chat', user.id);
  window.history.pushState({}, '', url);
};

const handleToggleLogs = () => {
  viewMode.value = 'logs';
};

const handleBack = () => {
  activeUser.value = null;
  viewMode.value = 'chat';
  const url = new URL(window.location.href);
  url.searchParams.delete('chat');
  window.history.pushState({}, '', url);
};

const handleConversationUpdated = (payload: {
  assignedAgentId: string | null;
  assignedAgent: { id: string; name: string } | null;
  conversationStatus: string;
}) => {
  if (activeUser.value) {
    activeUser.value = { ...activeUser.value, ...payload };
  }
};
</script>

<template>
  <div
    class="flex h-[100dvh] w-full bg-bg-dark overflow-hidden pb-[env(safe-area-inset-bottom)]"
  >
    <div
      class="w-full md:w-[350px] lg:w-[400px] shrink-0 h-full border-r border-border transition-transform duration-300 md:translate-x-0 absolute md:relative z-20"
      :class="[
        activeUser
          ? '-translate-x-full md:-translate-x-0 hidden md:block'
          : 'translate-x-0 block',
      ]"
    >
      <Sidebar
        :activeUserId="activeUser?.id"
        @select="handleUserSelected"
        @view-logs="handleToggleLogs"
      />
    </div>

    <div
      class="flex-1 flex flex-col h-full bg-bg-chat w-full absolute md:relative z-10 transition-transform duration-300 md:translate-x-0"
      :class="[
        activeUser || viewMode === 'logs'
          ? 'translate-x-0 block'
          : 'translate-x-full md:translate-x-0 hidden md:flex',
      ]"
    >
      <template v-if="viewMode === 'logs'">
        <LogsViewer @back="handleBack" />
      </template>

      <template v-else>
        <ChatArea
          v-if="activeUser"
          :user="activeUser"
          @back="handleBack"
          @conversation-updated="handleConversationUpdated"
        />

        <div
          v-else
          class="flex-1 hidden md:flex items-center justify-center bg-bg-chat chat-bg-pattern select-none"
        >
          <div
            class="bg-black/30 backdrop-blur-sm px-6 py-2.5 rounded-full shadow-sm flex items-center gap-2"
          >
            <span class="text-text-main text-[15px] font-medium opacity-80"
              >Select a chat to start messaging</span
            >
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
