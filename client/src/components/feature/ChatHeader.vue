<script setup lang="ts">
import BaseAvatar from '../core/BaseAvatar.vue'
import BaseIconButton from '../core/BaseIconButton.vue'
import type { User } from '../../App.vue'

defineProps<{
  user: User
}>()

const emit = defineEmits<{
  (e: 'search'): void
  (e: 'more'): void
}>()
</script>

<template>
  <div class="px-5 py-3 border-b border-border bg-bg-sidebar flex items-center justify-between shrink-0 shadow-sm z-10">
    <div class="flex items-center gap-4">
      <BaseAvatar :name="user.firstName + ' ' + (user.lastName || '')" :id="user.id" :size="40" />
      <div class="flex flex-col">
        <span class="font-semibold text-text-main text-base leading-tight">
          {{ user.firstName }} {{ user.lastName || '' }}
        </span>
        <span class="text-xs text-accent">last seen recently</span>
      </div>
    </div>
    <div class="flex items-center gap-1">
      <BaseIconButton title="Search" @click="emit('search')">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </BaseIconButton>
      <BaseIconButton title="More options" @click="emit('more')">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
      </BaseIconButton>
    </div>
  </div>
</template>
