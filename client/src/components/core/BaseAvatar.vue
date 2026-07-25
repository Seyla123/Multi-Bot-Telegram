<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  id: string | number
  size?: number
}>()

// Telegram uses a deterministic set of gradients for avatars
const gradients = [
  'linear-gradient(135deg, #FF7B7C 0%, #E03537 100%)', // Red
  'linear-gradient(135deg, #FFB94C 0%, #F57D2C 100%)', // Orange
  'linear-gradient(135deg, #C27BEA 0%, #894CD0 100%)', // Purple
  'linear-gradient(135deg, #74DB7A 0%, #30A638 100%)', // Green
  'linear-gradient(135deg, #57CAEA 0%, #2998CC 100%)', // Cyan
  'linear-gradient(135deg, #62A4F5 0%, #3275D7 100%)', // Blue
  'linear-gradient(135deg, #F186AD 0%, #DE4E81 100%)', // Pink
]

const backgroundGradient = computed(() => {
  // Simple hash function based on ID to select a consistent gradient
  const hash = String(props.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return gradients[hash % gradients.length]
})

const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].substring(0, 1).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
})

const sizeClass = computed(() => {
  const sz = props.size || 48
  return {
    width: `${sz}px`,
    height: `${sz}px`,
    fontSize: `${sz * 0.4}px`
  }
})
</script>

<template>
  <div 
    class="rounded-full flex items-center justify-center text-white font-medium shrink-0 shadow-sm select-none"
    :style="{ background: backgroundGradient, ...sizeClass }"
  >
    {{ initials }}
  </div>
</template>
