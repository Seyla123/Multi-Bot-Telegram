<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  src: string
  alt?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center" @click="emit('close')">
    <button class="absolute top-4 right-4 text-white hover:text-white/70 p-2 transition-colors z-[101]" @click.stop="emit('close')">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
    </button>
    <img :src="src" :alt="alt" class="max-w-[90vw] max-h-[90vh] object-contain shadow-2xl rounded-sm" @click.stop />
  </div>
</template>
