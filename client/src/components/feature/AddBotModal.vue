<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'add', payload: { name: string, botToken: string, username?: string }): void
}>()

const name = ref('')
const botToken = ref('')
const username = ref('')

const handleSubmit = () => {
  if (!name.value || !botToken.value) return
  emit('add', { name: name.value, botToken: botToken.value, username: username.value })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="emit('close')">
    <div class="bg-bg-sidebar border border-border rounded-xl p-6 w-full max-w-md shadow-2xl">
      <h2 class="text-xl font-bold text-white mb-4">Add a New Bot</h2>
      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">Bot Name</label>
          <input 
            v-model="name" 
            type="text" 
            required
            class="w-full bg-black/20 border border-border rounded-lg px-3 py-2 text-white placeholder-text-muted focus:outline-none focus:border-accent"
            placeholder="e.g. My Support Bot"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">Bot Token</label>
          <input 
            v-model="botToken" 
            type="password" 
            required
            class="w-full bg-black/20 border border-border rounded-lg px-3 py-2 text-white placeholder-text-muted focus:outline-none focus:border-accent"
            placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">Username (Optional)</label>
          <input 
            v-model="username" 
            type="text" 
            class="w-full bg-black/20 border border-border rounded-lg px-3 py-2 text-white placeholder-text-muted focus:outline-none focus:border-accent"
            placeholder="@MySupportBot"
          />
        </div>
        <div class="flex justify-end gap-3 mt-4">
          <button 
            type="button" 
            @click="emit('close')"
            class="px-4 py-2 rounded-lg text-text-muted hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            class="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
          >
            Add Bot
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
