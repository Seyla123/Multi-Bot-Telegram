<template>
  <div class="min-h-screen bg-slate-50/50 p-6 md:p-10">
    <div class="max-w-7xl mx-auto space-y-6">
      
      <!-- Table Component (Read-Only) -->
      <CrudTable
        title="Telegram Messages Log"
        subtitle="Audit history of messages, webhooks, and notifications dispatched via Telegram bots."
        :columns="columns"
        :items="items"
        :is-loading="isLoading"
        v-model:searchQuery="searchQuery"
      />

    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import type { CrudColumn } from '../../types/crud';
import { useCrud } from '../../composables/useCrud';
import CrudTable from '../../components/crud/CrudTable.vue';

const columns: CrudColumn[] = [
  { name: 'botName', label: 'Bot Sender', type: 'text' },
  { name: 'targetChatId', label: 'Target Chat / Channel', type: 'text' },
  { name: 'previewText', label: 'Message Payload', type: 'text' },
  { 
    name: 'status', 
    label: 'Delivery Status', 
    type: 'badge',
    badgeStyle: (val) => {
      const v = String(val).toUpperCase();
      if (v === 'DELIVERED' || v === 'SENT') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      if (v === 'FAILED') return 'bg-red-50 text-red-700 border-red-200';
      return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  },
  { name: 'sentAt', label: 'Sent Timestamp', type: 'date' },
];

const { 
  items, 
  isLoading, 
  searchQuery, 
  fetchItems 
} = useCrud('/admin/messages');

onMounted(() => {
  fetchItems();
});

let debounceTimer: any = null;
watch(searchQuery, () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchItems();
  }, 300);
});
</script>
