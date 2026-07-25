<script setup lang="ts">
import type { Message } from '../../services/telegramService'
import BaseIconButton from '../core/BaseIconButton.vue'

defineProps<{
  message: Message
}>()

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'unpin'): void
}>()
</script>

<template>
  <div class="px-5 py-2 bg-bg-sidebar/90 backdrop-blur-sm border-b border-white/5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors" @click="emit('click')">
    <div class="flex items-center gap-3 overflow-hidden">
      <div class="w-1 h-8 bg-accent rounded-full shrink-0"></div>
      <div class="flex flex-col overflow-hidden">
        <span class="text-accent text-sm font-medium">Pinned Message</span>
        <span class="text-text-muted text-[13px] truncate">{{ message.text || 'Media Message' }}</span>
      </div>
    </div>
    <BaseIconButton title="Unpin message" @click.stop="emit('unpin')">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
    </BaseIconButton>
  </div>
</template>
