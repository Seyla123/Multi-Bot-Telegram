<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      <!-- Backdrop -->
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
        />
      </Transition>

      <div class="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <!-- Slide-over panel -->
        <Transition
          enter-active-class="transform transition ease-in-out duration-300"
          enter-from-class="translate-x-full"
          enter-to-class="translate-x-0"
          leave-active-class="transform transition ease-in-out duration-200"
          leave-from-class="translate-x-0"
          leave-to-class="translate-x-full"
          appear
        >
          <div class="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200/80">
            <!-- Header -->
            <div class="px-6 py-5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between shrink-0">
              <div>
                <h3 class="text-base font-bold text-slate-900">
                  {{ isEditing ? 'Edit Record' : 'Create New Record' }}
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  {{ isEditing ? 'Update the fields below and save.' : 'Fill out the fields below to create a new record.' }}
                </p>
              </div>
              <button
                type="button"
                @click="close"
                aria-label="Close drawer"
                class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Scrollable Form Body -->
            <div class="flex-1 overflow-y-auto p-6">
              <form id="crud-drawer-form" @submit.prevent="submit" class="space-y-5">
                <div v-for="field in fields" :key="field.name" class="space-y-1.5">

                  <!-- Checkbox: inline label -->
                  <div v-if="field.type === 'checkbox'" class="flex items-center gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      :id="`f-${field.name}`"
                      v-model="formData[field.name]"
                      class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                    <label :for="`f-${field.name}`" class="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      {{ field.label }}
                    </label>
                    <p v-if="field.description" class="text-[11px] text-slate-400 ml-1">{{ field.description }}</p>
                  </div>

                  <!-- All other field types -->
                  <template v-else>
                    <label :for="`f-${field.name}`" class="block text-xs font-semibold text-slate-700">
                      {{ field.label }}
                      <span v-if="field.required" class="text-red-500 ml-0.5">*</span>
                    </label>

                    <!-- text -->
                    <input
                      v-if="field.type === 'text'"
                      type="text"
                      :id="`f-${field.name}`"
                      v-model="formData[field.name]"
                      :required="field.required"
                      :placeholder="field.placeholder ?? ''"
                      autocomplete="off"
                      class="w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg shadow-xs
                             placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500
                             transition-all duration-150"
                    >

                    <!-- email -->
                    <input
                      v-else-if="field.type === 'email'"
                      type="email"
                      :id="`f-${field.name}`"
                      v-model="formData[field.name]"
                      :required="field.required"
                      :placeholder="field.placeholder ?? ''"
                      autocomplete="email"
                      class="w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg shadow-xs
                             placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500
                             transition-all duration-150"
                    >

                    <!-- password — NEVER pre-filled from backend -->
                    <input
                      v-else-if="field.type === 'password'"
                      type="password"
                      :id="`f-${field.name}`"
                      v-model="formData[field.name]"
                      :required="field.required"
                      :placeholder="field.placeholder ?? (isEditing ? 'Leave blank to keep unchanged' : '••••••••')"
                      autocomplete="new-password"
                      class="w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg shadow-xs
                             placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500
                             transition-all duration-150"
                    >

                    <!-- number -->
                    <input
                      v-else-if="field.type === 'number'"
                      type="number"
                      :id="`f-${field.name}`"
                      v-model.number="formData[field.name]"
                      :required="field.required"
                      :placeholder="field.placeholder ?? ''"
                      class="w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg shadow-xs
                             placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500
                             transition-all duration-150"
                    >

                    <!-- date -->
                    <input
                      v-else-if="field.type === 'date'"
                      type="date"
                      :id="`f-${field.name}`"
                      v-model="formData[field.name]"
                      :required="field.required"
                      class="w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg shadow-xs
                             focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500
                             transition-all duration-150"
                    >

                    <!-- textarea -->
                    <textarea
                      v-else-if="field.type === 'textarea'"
                      :id="`f-${field.name}`"
                      v-model="formData[field.name]"
                      :required="field.required"
                      :placeholder="field.placeholder ?? ''"
                      rows="3"
                      class="w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg shadow-xs
                             placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500
                             transition-all duration-150 resize-y"
                    />

                    <!-- select -->
                    <select
                      v-else-if="field.type === 'select'"
                      :id="`f-${field.name}`"
                      v-model="formData[field.name]"
                      :required="field.required"
                      class="w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg shadow-xs
                             focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500
                             transition-all duration-150 cursor-pointer"
                    >
                      <option disabled value="">— Select {{ field.label }} —</option>
                      <option
                        v-for="opt in field.options"
                        :key="String(opt.value)"
                        :value="opt.value"
                      >{{ opt.label }}</option>
                    </select>

                    <p v-if="field.description" class="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {{ field.description }}
                    </p>
                  </template>
                </div>
              </form>
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                @click="close"
                class="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg
                       hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400
                       transition-all duration-150 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="crud-drawer-form"
                :disabled="isSubmitting"
                class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600
                       border border-transparent rounded-lg shadow-xs hover:bg-blue-700
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
              >
                <svg
                  v-if="isSubmitting"
                  class="animate-spin -ml-0.5 h-3.5 w-3.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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

// ─── 1. Local reactive form state ────────────────────────────────────────────
// Using ref<Record> so that re-assigning `.value` to a new plain object
// replaces the entire object atomically and updates all v-model bindings.
const formData = ref<Record<string, any>>({});

// ─── 2. Initialise / reset formData whenever the drawer opens ────────────────
watch(
  () => props.isOpen,
  (opened) => {
    if (!opened) return;

    if (props.isEditing) {
      // EDIT: deep-clone the incoming record so we never mutate the prop.
      // Password / sensitive fields are intentionally left blank.
      const clone: Record<string, any> = {};
      props.fields.forEach((field) => {
        if (field.type === 'password' || field.sensitive) {
          clone[field.name] = '';
          return;
        }

        const raw = props.modelValue[field.name];

        if (raw === undefined || raw === null) {
          // Use the field default, or an appropriate empty value
          clone[field.name] = field.defaultValue !== undefined
            ? field.defaultValue
            : defaultEmptyFor(field.type);
        } else if (field.type === 'date' && typeof raw === 'string' && raw.includes('T')) {
          // Convert ISO datetime to YYYY-MM-DD for <input type="date">
          clone[field.name] = raw.split('T')[0];
        } else {
          clone[field.name] = raw;
        }
      });
      // Atomically replace → every v-model binding gets fresh, correct values
      formData.value = clone;
    } else {
      // CREATE: start from modelValue defaults (parent may pre-seed some keys)
      // then fill the rest from field definitions.
      const blank: Record<string, any> = {};
      props.fields.forEach((field) => {
        if (props.modelValue[field.name] !== undefined) {
          blank[field.name] = props.modelValue[field.name];
        } else if (field.defaultValue !== undefined) {
          blank[field.name] = field.defaultValue;
        } else {
          blank[field.name] = defaultEmptyFor(field.type);
        }
      });
      formData.value = blank;
    }
  },
  { immediate: false },
);

// Also re-init when the parent swaps which record is being edited
// (e.g. user clicks Edit on row A, then Edit on row B without closing)
watch(
  () => props.modelValue,
  () => {
    if (props.isOpen && props.isEditing) {
      // Trigger the same init logic by re-using the isOpen watcher body
      const clone: Record<string, any> = {};
      props.fields.forEach((field) => {
        if (field.type === 'password' || field.sensitive) {
          clone[field.name] = '';
          return;
        }
        const raw = props.modelValue[field.name];
        if (raw === undefined || raw === null) {
          clone[field.name] = field.defaultValue !== undefined ? field.defaultValue : defaultEmptyFor(field.type);
        } else if (field.type === 'date' && typeof raw === 'string' && raw.includes('T')) {
          clone[field.name] = raw.split('T')[0];
        } else {
          clone[field.name] = raw;
        }
      });
      formData.value = clone;
    }
  },
  { deep: true },
);

// Re-init when field list changes (e.g. computed fields that toggle based on isEditing)
watch(
  () => props.fields,
  () => {
    if (props.isOpen) {
      // Add any newly-declared fields that aren't in formData yet
      props.fields.forEach((field) => {
        if (formData.value[field.name] === undefined) {
          formData.value[field.name] = field.defaultValue !== undefined
            ? field.defaultValue
            : defaultEmptyFor(field.type);
        }
      });
    }
  },
  { deep: true },
);

function defaultEmptyFor(type: string): any {
  if (type === 'checkbox') return false;
  if (type === 'number') return '';
  return '';
}

// ─── Keyboard Esc ────────────────────────────────────────────────────────────
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) close();
};
onMounted(() => window.addEventListener('keydown', handleKeyDown));
onUnmounted(() => window.removeEventListener('keydown', handleKeyDown));

// ─── Actions ─────────────────────────────────────────────────────────────────
const close = () => emit('close');

// ─── 4. Emit LOCAL state on save ─────────────────────────────────────────────
const submit = () => {
  // Spread to send a plain object (not the reactive ref proxy)
  emit('submit', { ...formData.value });
};
</script>
