<script setup lang="ts">
import BaseIconButton from '../core/BaseIconButton.vue'

defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
}>()
</script>

<template>
  <div class="px-4 py-3 flex items-center gap-3">
    <!-- Hamburger Icon -->
    <BaseIconButton title="Menu" class="!p-1">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <line x1="3" y1="12" x2="21" y2="12" stroke-width="2" stroke-linecap="round"></line>
        <line x1="3" y1="6" x2="21" y2="6" stroke-width="2" stroke-linecap="round"></line>
        <line x1="3" y1="18" x2="21" y2="18" stroke-width="2" stroke-linecap="round"></line>
      </svg>
    </BaseIconButton>
    
    <!-- Search Bar -->
    <div class="relative flex-1">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg class="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
      <input 
        type="text" 
        :value="modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @keydown.escape.prevent="emit('update:modelValue', '')"
        class="w-full bg-black/20 text-text-main text-[14px] rounded-full pl-10 pr-10 py-2 outline-none border border-white/5 focus:border-accent/50 focus:bg-black/30 transition-all shadow-inner"
        placeholder="Search"
      />
      <!-- Clear Search Button -->
      <button 
        v-if="modelValue"
        @click="emit('update:modelValue', '')"
        class="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-white transition-colors"
        aria-label="Clear search"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  </div>
</template>
