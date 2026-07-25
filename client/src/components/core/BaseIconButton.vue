<script setup lang="ts">
defineProps<{
  title?: string
  disabled?: boolean
}>()
</script>

<template>
  <button 
    type="button"
    :title="title"
    :disabled="disabled"
    class="p-2 rounded-full transition-colors flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed text-text-muted hover:text-text-main hover:bg-white/10"
  >
    <slot></slot>
  </button>
</template>
