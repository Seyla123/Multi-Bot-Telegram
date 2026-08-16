<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps<{
  x: number
  y: number
  actions: { label: string; icon?: string; action: () => void; danger?: boolean }[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const menuRef = ref<HTMLElement | null>(null)
const adjustedX = ref(props.x)
const adjustedY = ref(props.y)
const focusedIndex = ref(-1)

const calculatePosition = async () => {
  await nextTick()
  if (!menuRef.value) return
  
  const menuRect = menuRef.value.getBoundingClientRect()
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  let newX = props.x
  let newY = props.y

  // Prevent overflow on right
  if (newX + menuRect.width > windowWidth - 10) {
    newX = windowWidth - menuRect.width - 10
  }
  // Prevent overflow on bottom
  if (newY + menuRect.height > windowHeight - 10) {
    newY = windowHeight - menuRect.height - 10
  }

  // Ensure it doesn't go off-screen top/left
  if (newX < 10) newX = 10
  if (newY < 10) newY = 10

  adjustedX.value = newX
  adjustedY.value = newY
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('close')
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    focusedIndex.value = (focusedIndex.value + 1) % props.actions.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    focusedIndex.value = (focusedIndex.value - 1 + props.actions.length) % props.actions.length
  } else if (e.key === 'Enter' && focusedIndex.value !== -1) {
    e.preventDefault()
    props.actions[focusedIndex.value].action()
    emit('close')
  }
}

const handleClickOutside = (e: MouseEvent | TouchEvent) => {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    emit('close')
  }
}

onMounted(() => {
  calculatePosition()
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('touchstart', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
  // Focus the menu wrapper for keyboard navigation
  menuRef.value?.focus()
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('touchstart', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="fixed inset-0 z-[100] pointer-events-none">
    <div 
      ref="menuRef"
      tabindex="-1"
      class="absolute bg-[#2C2F33] border border-white/10 shadow-2xl rounded-xl py-1.5 min-w-[180px] pointer-events-auto outline-none transition-opacity"
      :style="{ top: `${adjustedY}px`, left: `${adjustedX}px` }"
      role="menu"
    >
      <button 
        v-for="(action, index) in actions" 
        :key="index"
        @click.stop="action.action(); emit('close')"
        @mouseenter="focusedIndex = index"
        class="w-full text-left px-4 py-2 text-[14px] flex items-center gap-3 transition-colors outline-none"
        :class="[
          action.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-200 hover:bg-white/5',
          focusedIndex === index ? (action.danger ? 'bg-red-500/10' : 'bg-white/5') : ''
        ]"
        role="menuitem"
      >
        <span v-if="action.icon" v-html="action.icon" class="w-4 h-4 opacity-70 flex items-center justify-center"></span>
        {{ action.label }}
      </button>
    </div>
  </div>
</template>
