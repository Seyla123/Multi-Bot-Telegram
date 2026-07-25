<script setup lang="ts">
defineProps<{
  count: number | string
  color?: string // e.g. 'bg-accent' or 'bg-white/20'
}>()
</script>

<template>
  <span 
    v-if="count !== 0 && count !== '0'"
    class="text-[11px] font-bold px-1.5 min-w-[20px] h-[20px] flex items-center justify-center rounded-full text-white"
    :class="color || 'bg-accent'"
  >
    {{ count }}
  </span>
</template>
