<template>
  <div class="min-h-screen bg-gray-50/50 p-6 md:p-10">
    <div class="max-w-7xl mx-auto space-y-6">
      
      <!-- Table Component -->
      <CrudTable
        title="API Clients"
        subtitle="Manage developer applications, environment access keys, and rate limit configs."
        :columns="columns"
        :items="items"
        :is-loading="isLoading"
        v-model:searchQuery="searchQuery"
        @create="openCreateDrawer"
        @edit="openEditDrawer"
        @delete="handleDelete"
      />

      <!-- Slide-Over Form Drawer -->
      <CrudFormDrawer
        :is-open="isDrawerOpen"
        :is-editing="isEditing"
        :is-submitting="isSubmitting"
        :fields="fields"
        :model-value="currentFormItem"
        @close="closeDrawer"
        @submit="handleSubmit"
      />

      <!-- Toast Feedback Notification -->
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
          class="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex items-start gap-3"
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
            <h4 class="text-sm font-semibold text-gray-900">{{ toast.title }}</h4>
            <p v-if="toast.message" class="text-xs text-gray-500 mt-0.5">{{ toast.message }}</p>
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

// 1. Column Configurations
const columns: CrudColumn[] = [
  { name: 'name', label: 'Client Name', type: 'text' },
  { 
    name: 'environment', 
    label: 'Environment', 
    type: 'badge',
    badgeStyle: (val) => String(val).toUpperCase() === 'LIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
  },
  { name: 'type', label: 'Type', type: 'text' },
  { 
    name: 'rateLimitPerMin', 
    label: 'Rate Limit', 
    type: 'text',
    formatter: (val) => `${val?.toLocaleString() || 60} req/min`
  },
  { 
    name: 'status', 
    label: 'Status', 
    type: 'badge',
    badgeStyle: (val) => String(val).toUpperCase() === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
  },
  { name: 'createdAt', label: 'Created', type: 'date' },
  { name: 'actions', label: '', type: 'actions' },
];

// 2. Form Field Configurations (Strictly matching CreateAdminClientDto)
const fields: CrudField[] = [
  { 
    name: 'name', 
    label: 'Application Name', 
    type: 'text', 
    required: true, 
    placeholder: 'e.g. Stripe Billing Integration',
    description: 'A recognizable name for this API client token.'
  },
  { 
    name: 'description', 
    label: 'Description', 
    type: 'textarea', 
    placeholder: 'Briefly explain the purpose of this client...',
    description: 'Internal documentation for team context.'
  },
  { 
    name: 'type', 
    label: 'Client Type', 
    type: 'select', 
    required: true,
    defaultValue: 'CLIENT',
    options: [
      { label: 'Client Token', value: 'CLIENT' },
      { label: 'Personal Access Token', value: 'PERSONAL' }
    ]
  },
  { 
    name: 'environment', 
    label: 'Target Environment', 
    type: 'select', 
    required: true,
    defaultValue: 'LIVE',
    options: [
      { label: 'Live Production', value: 'LIVE' },
      { label: 'Test Sandbox', value: 'TEST' }
    ]
  },
  { 
    name: 'rateLimitPerMin', 
    label: 'Rate Limit (Requests per minute)', 
    type: 'number', 
    required: false, 
    defaultValue: 60,
    placeholder: '60'
  }
];

// 3. Composable Setup
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
} = useCrud('/admin/clients');

// 4. Drawer & Action Handlers
const isDrawerOpen = ref(false);
const isEditing = ref(false);

const openCreateDrawer = () => {
  isEditing.value = false;
  currentFormItem.value = {
    rateLimitPerMin: 60,
    type: 'CLIENT',
    environment: 'LIVE'
  };
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
  // Clean up payload properties for CreateAdminClientDto validation
  const cleanPayload = { ...payload };
  delete cleanPayload.status; // status is server-managed
  delete cleanPayload.createdAt;
  delete cleanPayload.updatedAt;
  delete cleanPayload.preview;
  delete cleanPayload.tokenHash;

  let success = false;
  if (isEditing.value) {
    success = await updateItem(cleanPayload.id || cleanPayload._id, cleanPayload);
  } else {
    success = await createItem(cleanPayload);
  }
  if (success) {
    closeDrawer();
  }
};

const handleDelete = async (id: number | string) => {
  if (confirm('Are you sure you want to delete this API client? Access keys will be revoked.')) {
    await deleteItem(id);
  }
};

// Initial Data Fetch & Debounced Search Watcher
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
