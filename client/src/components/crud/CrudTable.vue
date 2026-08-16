<template>
  <div class="space-y-4">
    <!-- Top Header & Actions Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 v-if="title" class="text-xl font-bold text-slate-900 tracking-tight">{{ title }}</h2>
        <p v-if="subtitle" class="text-xs text-slate-500 mt-0.5">{{ subtitle }}</p>
      </div>
      
      <div class="flex items-center gap-3">
        <!-- Search Input -->
        <div class="relative flex-1 sm:w-72">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input 
            type="text" 
            v-model="internalSearch"
            @input="onSearch"
            placeholder="Search records..." 
            aria-label="Search records"
            class="w-full pl-9 pr-12 py-2 text-xs bg-white border border-slate-200 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
          />
          <div class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
            <kbd class="px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded">⌘K</kbd>
          </div>
        </div>

        <!-- Add New Button -->
        <button 
          @click="$emit('create')"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 whitespace-nowrap cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add New
        </button>
      </div>
    </div>

    <!-- Table Card Container -->
    <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden transition-all duration-200">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50/80 border-b border-slate-200/80">
              <th 
                v-for="col in columns" 
                :key="col.name"
                class="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none"
              >
                {{ col.label }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <!-- Skeleton Loader -->
            <template v-if="isLoading">
              <tr v-for="n in 4" :key="n" class="animate-pulse">
                <td v-for="col in columns" :key="col.name" class="px-6 py-4">
                  <div class="h-4 bg-slate-200/60 rounded-md w-2/3"></div>
                </td>
              </tr>
            </template>

            <!-- Empty State -->
            <tr v-else-if="items.length === 0">
              <td :colspan="columns.length" class="px-6 py-14 text-center">
                <div class="max-w-sm mx-auto flex flex-col items-center">
                  <div class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 shadow-xs">
                    <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 class="text-sm font-bold text-slate-900">No records found</h3>
                  <p class="text-xs text-slate-500 mt-1 mb-4">Start managing your database by creating your first entry.</p>
                  <button 
                    @click="$emit('create')" 
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Create record
                  </button>
                </div>
              </td>
            </tr>

            <!-- Table Rows -->
            <tr 
              v-else 
              v-for="item in items" 
              :key="item.id || item._id" 
              class="hover:bg-slate-50/80 transition-colors duration-150 group"
            >
              <td v-for="col in columns" :key="col.name" class="px-6 py-4 whitespace-nowrap text-xs text-slate-700">
                <!-- Text -->
                <template v-if="col.type === 'text'">
                  <span class="font-semibold text-slate-900">
                    {{ col.formatter ? col.formatter(item[col.name], item) : item[col.name] }}
                  </span>
                </template>

                <!-- Date -->
                <template v-else-if="col.type === 'date'">
                  <span class="text-slate-500 font-mono text-[11px]">
                    {{ item[col.name] ? new Date(item[col.name]).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-' }}
                  </span>
                </template>

                <!-- Badge -->
                <template v-else-if="col.type === 'badge'">
                  <span 
                    class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize"
                    :class="getBadgeClasses(col, item[col.name])"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {{ item[col.name] }}
                  </span>
                </template>

                <!-- Boolean -->
                <template v-else-if="col.type === 'boolean'">
                  <span 
                    class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
                    :class="item[col.name] ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="item[col.name] ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                    {{ item[col.name] ? 'Active' : 'Inactive' }}
                  </span>
                </template>

                <!-- Actions -->
                <template v-else-if="col.type === 'actions'">
                  <div class="flex items-center justify-end gap-1">
                    <button 
                      @click="$emit('edit', item)"
                      aria-label="Edit record"
                      title="Edit record"
                      class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button 
                      @click="$emit('delete', item.id || item._id)"
                      aria-label="Delete record"
                      title="Delete record"
                      class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { CrudColumn } from '../../types/crud';

const props = defineProps<{
  title?: string;
  subtitle?: string;
  columns: CrudColumn[];
  items: any[];
  isLoading: boolean;
  searchQuery?: string;
}>();

const emit = defineEmits<{
  (e: 'create'): void;
  (e: 'edit', item: any): void;
  (e: 'delete', id: any): void;
  (e: 'update:searchQuery', value: string): void;
}>();

const internalSearch = ref(props.searchQuery || '');

watch(() => props.searchQuery, (newVal) => {
  if (newVal !== undefined) internalSearch.value = newVal;
});

const onSearch = () => {
  emit('update:searchQuery', internalSearch.value);
};

const getBadgeClasses = (col: CrudColumn, val: any) => {
  if (col.badgeStyle) return col.badgeStyle(val);
  const v = String(val).toLowerCase();
  if (v === 'production' || v === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (v === 'staging' || v === 'internal') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (v === 'development' || v === 'external') return 'bg-purple-50 text-purple-700 border-purple-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};
</script>
