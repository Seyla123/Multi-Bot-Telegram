<template>
  <div class="min-h-screen bg-slate-50/50 p-6 md:p-10">
    <div class="max-w-7xl mx-auto space-y-6">
      
      <!-- Table Component -->
      <CrudTable
        title="Telegram Bots"
        subtitle="Manage connected Telegram bot tokens and message webhook dispatchers."
        :columns="columns"
        :items="items"
        :is-loading="isLoading"
        v-model:searchQuery="searchQuery"
        @create="openCreateDrawer"
        @edit="openEditDrawer"
        @delete="handleDelete"
      />

      <!-- Form Drawer -->
      <CrudFormDrawer
        :is-open="isDrawerOpen"
        :is-editing="isEditing"
        :is-submitting="isSubmitting"
        :fields="fields"
        :model-value="currentFormItem"
        @close="closeDrawer"
        @submit="handleSubmit"
      />

      <!-- Toast Feedback -->
      <Transition
        enter-active-class="transform transition duration-300 ease-out"
        enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
        enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div 
          v-if="toast"
          class="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-white rounded-xl shadow-lg border border-slate-200 p-4 flex items-start gap-3"
        >
          <div 
            class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            :class="toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'"
          >
            <svg v-if="toast.type === 'success'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div class="flex-1">
            <h4 class="text-xs font-bold text-slate-900">{{ toast.title }}</h4>
            <p v-if="toast.message" class="text-[11px] text-slate-500 mt-0.5">{{ toast.message }}</p>
          </div>
        </div>
      </Transition>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { CrudColumn, CrudField } from '../../types/crud';
import { useCrud } from '../../composables/useCrud';
import CrudTable from '../../components/crud/CrudTable.vue';
import CrudFormDrawer from '../../components/crud/CrudFormDrawer.vue';

const columns: CrudColumn[] = [
  { name: 'name', label: 'Bot Name', type: 'text' },
  { 
    name: 'botToken', 
    label: 'Bot Token', 
    type: 'text',
    formatter: (val) => val ? `${val.substring(0, 10)}••••••••` : '-'
  },
  { 
    name: 'status', 
    label: 'Status', 
    type: 'badge',
    badgeStyle: (val) => String(val).toUpperCase() === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
  },
  { name: 'createdAt', label: 'Created', type: 'date' },
  { name: 'actions', label: '', type: 'actions' },
];

const fields: CrudField[] = [
  { name: 'name', label: 'Bot Display Name', type: 'text', required: true, placeholder: 'e.g. Support Notification Bot' },
  { 
    name: 'botToken', 
    label: 'Bot API Token', 
    type: 'text', 
    required: true, 
    placeholder: '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ',
    description: 'Obtain this API token from @BotFather on Telegram.'
  },
  { 
    name: 'status', 
    label: 'Status', 
    type: 'select', 
    required: true,
    defaultValue: 'ACTIVE',
    options: [
      { label: 'Active', value: 'ACTIVE' },
      { label: 'Inactive / Paused', value: 'INACTIVE' }
    ]
  }
];

const { 
  items, 
  isLoading, 
  isSubmitting, 
  searchQuery, 
  currentFormItem,
  toast,
  fetchItems, 
  createItem, 
  updateItem, 
  deleteItem 
} = useCrud('/admin/bots');

const isDrawerOpen = ref(false);
const isEditing = ref(false);

const openCreateDrawer = () => {
  isEditing.value = false;
  currentFormItem.value = { status: 'ACTIVE' };
  isDrawerOpen.value = true;
};

const openEditDrawer = (item: any) => {
  isEditing.value = true;
  currentFormItem.value = { ...item };
  isDrawerOpen.value = true;
};

const closeDrawer = () => {
  isDrawerOpen.value = false;
};

const handleSubmit = async (payload: any) => {
  let success = false;
  if (isEditing.value) {
    success = await updateItem(payload.id || payload._id, payload);
  } else {
    success = await createItem(payload);
  }
  if (success) {
    closeDrawer();
  }
};

const handleDelete = async (id: number | string) => {
  if (confirm('Are you sure you want to disconnect and delete this Telegram bot?')) {
    await deleteItem(id);
  }
};

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
