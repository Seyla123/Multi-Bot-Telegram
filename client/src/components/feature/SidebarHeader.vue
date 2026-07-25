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
        class="w-full bg-[#2c2c2c] text-text-main text-[15px] rounded-full pl-10 pr-4 py-1.5 outline-none border-2 border-transparent focus:border-accent transition-colors"
        placeholder="Search"
      />
    </div>
  </div>
</template>
