<script setup lang="ts">
import BaseBadge from '../core/BaseBadge.vue'
import type { Bot } from '../../services/telegramService'

const props = defineProps<{
  activeTab: string | number
  bots: Bot[]
  counts?: Record<number, number>
}>()

const emit = defineEmits<{
  (e: 'update:activeTab', tab: string | number): void
  (e: 'add-bot'): void
}>()
</script>

<template>
  <div class="px-2 pb-1 flex gap-1 overflow-x-auto scrollbar-hide shrink-0 border-b border-border">
    <button 
      @click="emit('update:activeTab', 'all')"
      class="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 shrink-0 transition-colors"
      :class="activeTab === 'all' ? 'bg-white/10 text-text-main' : 'text-text-muted hover:bg-white/5'"
    >
      All Bots
    </button>
    
    <button 
      v-for="bot in bots" 
      :key="bot.id"
      @click="emit('update:activeTab', bot.id)"
      class="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 shrink-0 transition-colors"
      :class="activeTab === bot.id ? 'bg-white/10 text-text-main' : 'text-text-muted hover:bg-white/5'"
    >
      {{ bot.name }} 
      <BaseBadge 
        v-if="counts && counts[bot.id]" 
        :count="counts[bot.id]" 
        :color="activeTab === bot.id ? 'bg-accent' : 'bg-white/20 text-white'" 
      />
    </button>

    <button 
      @click="emit('add-bot')"
      class="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 shrink-0 transition-colors text-text-muted hover:bg-white/5 border border-dashed border-border"
    >
      + Add Bot
    </button>
  </div>
</template>
