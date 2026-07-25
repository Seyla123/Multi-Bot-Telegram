<script setup lang="ts">
import BaseBadge from '../core/BaseBadge.vue'
const tabs = ['Main Bot', '+ Add Bot']
defineProps<{
  activeTab: string
  counts?: Record<string, number>
}>()

const emit = defineEmits<{
  (e: 'update:activeTab', tab: string): void
}>()
</script>

<template>
  <div class="px-2 pb-1 flex gap-1 overflow-x-auto scrollbar-hide shrink-0 border-b border-border">
    <button 
      v-for="tab in tabs" 
      :key="tab"
      @click="emit('update:activeTab', tab)"
      class="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 shrink-0 transition-colors"
      :class="activeTab === tab ? 'bg-white/10 text-text-main' : 'text-text-muted hover:bg-white/5'"
    >
      {{ tab }} 
      <BaseBadge 
        v-if="counts && counts[tab]" 
        :count="counts[tab]" 
        :color="activeTab === tab ? 'bg-accent' : 'bg-white/20 text-white'" 
      />
    </button>
  </div>
</template>
