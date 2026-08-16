<template>
  <Teleport to="body">
    <!-- Backdrop & Drawer Container -->
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      <!-- Dark backdrop with fade transition -->
      <Transition
        enter-active-class="transition-opacity ease-linear duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity ease-linear duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
        appear
      >
        <div 
          class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
          @click="close"
        ></div>
      </Transition>

      <div class="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <!-- Slide-over panel transition -->
        <Transition
          enter-active-class="transform transition ease-in-out duration-300 sm:duration-300"
          enter-from-class="translate-x-full"
          enter-to-class="translate-x-0"
          leave-active-class="transform transition ease-in-out duration-200 sm:duration-200"
          leave-from-class="translate-x-0"
          leave-to-class="translate-x-full"
          appear
        >
          <div class="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-slate-200/80">
            <!-- Header -->
            <div class="px-6 py-5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
              <div>
                <h3 class="text-base font-bold text-slate-900">
                  {{ isEditing ? 'Edit Record' : 'Create New Record' }}
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">Fill out the fields below to update database state.</p>
              </div>
              <button 
                @click="close"
                aria-label="Close drawer"
                class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Form Body -->
            <div class="flex-1 overflow-y-auto p-6 space-y-5">
              <form id="crud-drawer-form" @submit.prevent="submit" class="space-y-5">
                <div v-for="field in fields" :key="field.name" class="space-y-1.5">
                  
                  <!-- Checkbox layout -->
                  <div v-if="field.type === 'checkbox'" class="flex items-center pt-2">
                    <input 
                      type="checkbox"
                      :id="field.name"
                      v-model="formData[field.name]"
                      class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500/20 focus:ring-2 cursor-pointer transition-colors"
                    >
                    <label :for="field.name" class="ml-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      {{ field.label }}
                    </label>
                  </div>

                  <!-- Standard Inputs -->
                  <template v-else>
                    <label :for="field.name" class="block text-xs font-semibold text-slate-700">
                      {{ field.label }} <span v-if="field.required" class="text-red-500">*</span>
                    </label>
                    
                    <!-- Text / Email / Number -->
                    <input 
                      v-if="['text', 'email', 'number'].includes(field.type)"
                      :type="field.type"
                      :id="field.name"
                      v-model="formData[field.name]"
                      :required="field.required"
                      :placeholder="field.placeholder"
                      class="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150"
                    >
                    
                    <!-- Textarea -->
                    <textarea 
                      v-else-if="field.type === 'textarea'"
                      :id="field.name"
                      v-model="formData[field.name]"
                      :required="field.required"
                      :placeholder="field.placeholder"
                      class="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150"
                      rows="3"
                    ></textarea>
                    
                    <!-- Select -->
                    <select 
                      v-else-if="field.type === 'select'"
                      :id="field.name"
                      v-model="formData[field.name]"
                      :required="field.required"
                      class="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150 cursor-pointer"
                    >
                      <option disabled value="">Select {{ field.label }}</option>
                      <option v-for="opt in field.options" :key="String(opt.value)" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>

                    <p v-if="field.description" class="text-[11px] text-slate-400 mt-1">{{ field.description }}</p>
                  </template>

                </div>
              </form>
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-end gap-3">
              <button 
                type="button"
                @click="close"
                class="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-all duration-150 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="crud-drawer-form"
                :disabled="isSubmitting"
                class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 border border-transparent rounded-lg shadow-xs hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 transition-all duration-150 cursor-pointer"
              >
                <svg v-if="isSubmitting" class="animate-spin -ml-1 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isEditing ? 'Save Changes' : 'Create Record' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import type { CrudField } from '../../types/crud';

const props = defineProps<{
  fields: CrudField[];
  modelValue: Record<string, any>;
  isOpen: boolean;
  isEditing: boolean;
  isSubmitting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', payload: Record<string, any>): void;
  (e: 'close'): void;
}>();

const formData = ref<Record<string, any>>({});

// Keyboard Esc to close
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    close();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    formData.value = { ...props.modelValue };
    if (!props.isEditing) {
      props.fields.forEach(field => {
        if (formData.value[field.name] === undefined) {
          formData.value[field.name] = field.defaultValue !== undefined 
            ? field.defaultValue 
            : (field.type === 'checkbox' ? false : '');
        }
      });
    }
  }
});

const close = () => {
  emit('close');
};

const submit = () => {
  emit('submit', { ...formData.value });
};
</script>
