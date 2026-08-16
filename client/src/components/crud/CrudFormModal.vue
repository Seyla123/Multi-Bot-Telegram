<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
    <!-- Overlay -->
    <div class="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity backdrop-blur-sm" @click="close"></div>
    
    <!-- Modal panel -->
    <div class="relative w-full max-w-lg mx-auto my-6 z-50 px-4">
      <div class="relative flex flex-col w-full bg-white border-0 rounded-xl shadow-2xl outline-none focus:outline-none overflow-hidden">
        
        <!-- Header -->
        <div class="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ isEditing ? 'Edit Item' : 'Create Item' }}
          </h3>
          <button class="p-1 ml-auto text-gray-400 hover:text-gray-600 transition-colors outline-none focus:outline-none" @click="close">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="relative flex-auto p-6 bg-white">
          <form @submit.prevent="submit" class="space-y-5">
            <div v-for="field in fields" :key="field.name" class="flex flex-col">
              
              <!-- Checkbox (different label layout) -->
              <div v-if="field.type === 'checkbox'" class="flex items-center">
                <input 
                  type="checkbox"
                  :id="field.name"
                  v-model="formData[field.name]"
                  class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                >
                <label :for="field.name" class="ml-2 text-sm font-medium text-gray-700 cursor-pointer select-none">
                  {{ field.label }}
                </label>
              </div>

              <!-- Other inputs -->
              <template v-else>
                <label :for="field.name" class="mb-1.5 text-sm font-medium text-gray-700">
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
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                >
                
                <!-- Textarea -->
                <textarea 
                  v-else-if="field.type === 'textarea'"
                  :id="field.name"
                  v-model="formData[field.name]"
                  :required="field.required"
                  :placeholder="field.placeholder"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                  rows="3"
                ></textarea>
                
                <!-- Select -->
                <select 
                  v-else-if="field.type === 'select'"
                  :id="field.name"
                  v-model="formData[field.name]"
                  :required="field.required"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm bg-white"
                >
                  <option disabled value="">Please select one</option>
                  <option v-for="opt in field.options" :key="String(opt.value)" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </template>

            </div>
            
            <!-- Footer -->
            <div class="flex items-center justify-end pt-4 border-t border-gray-200 mt-6 gap-3">
              <button 
                type="button"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                @click="close"
              >
                Cancel
              </button>
              <button 
                type="submit"
                class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-sm"
              >
                {{ isEditing ? 'Update' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { CrudField } from '../../types/crud';

const props = defineProps<{
  fields: CrudField[];
  modelValue: Record<string, any>;
  isOpen: boolean;
  isEditing: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', payload: Record<string, any>): void;
  (e: 'close'): void;
}>();

const formData = ref<Record<string, any>>({});

// Initialize form data when modal opens
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    formData.value = { ...props.modelValue };
    
    // Set default values if needed
    if (!props.isEditing) {
      props.fields.forEach(field => {
        if (field.type === 'checkbox' && formData.value[field.name] === undefined) {
          formData.value[field.name] = false;
        } else if (field.type === 'select' && formData.value[field.name] === undefined) {
          formData.value[field.name] = ''; // Start empty for "Please select one"
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
