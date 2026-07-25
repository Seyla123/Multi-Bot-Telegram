<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { Message } from '../../services/telegramService'
import MessageBubble from './MessageBubble.vue'

const props = defineProps<{
  messages: Message[]
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'media-click', url: string): void
  (e: 'reply', msg: Message): void
  (e: 'pin', msg: Message): void
  (e: 'delete', msg: Message): void
}>()

const container = ref<HTMLElement | null>(null)
let userHasScrolledUp = false

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  userHasScrolledUp = target.scrollHeight - target.clientHeight > target.scrollTop + 50
}

const scrollToBottom = async () => {
  await nextTick()
  if (container.value && !userHasScrolledUp) {
    container.value.scrollTop = container.value.scrollHeight
  }
}

watch(() => props.messages, () => {
  scrollToBottom()
}, { deep: true })

defineExpose({
  scrollToBottom
})
</script>

<template>
  <div 
    class="flex-1 p-6 overflow-y-auto flex flex-col gap-4" 
    ref="container"
    @scroll="handleScroll"
  >
    <div v-if="loading" class="flex items-center justify-center h-full">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
    </div>
    
    <div v-else-if="error" class="text-red-400 text-center mt-4">
      {{ error }}
    </div>
    
    <div v-else-if="messages.length === 0" class="text-slate-400 text-center mt-8">
      No messages yet. Say hi!
    </div>
    
    <template v-else>
      <div class="flex flex-col gap-2 max-w-3xl mx-auto w-full mt-auto">
        <!-- Optional: Date dividers could be computed and injected here -->
        <MessageBubble 
          v-for="msg in messages" 
          :key="msg.id" 
          :msg="msg" 
          @media-click="url => emit('media-click', url)"
          @reply="emit('reply', msg)"
          @pin="emit('pin', msg)"
          @delete="emit('delete', msg)"
        />
      </div>
    </template>
  </div>
</template>
