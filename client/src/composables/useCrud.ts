import { ref, reactive } from 'vue';
import { apiFetch } from '../services/api';
import type { ToastNotification } from '../types/crud';

export function useCrud<T extends Record<string, any>>(endpoint: string) {
  const items = ref<T[]>([]);
  const isLoading = ref(false);
  const isSubmitting = ref(false);
  const searchQuery = ref('');
  const currentFormItem = ref<Partial<T>>({});
  
  const toast = ref<ToastNotification | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    toast.value = { id, type, title, message };
    setTimeout(() => {
      if (toast.value?.id === id) {
        toast.value = null;
      }
    }, 4500);
  };

  const pagination = reactive({
    page: 1,
    perPage: 10,
    total: 0,
  });

  const fetchItems = async () => {
    isLoading.value = true;
    try {
      const url = `${endpoint}?page=${pagination.page}&limit=${pagination.perPage}${searchQuery.value ? `&search=${encodeURIComponent(searchQuery.value)}` : ''}`;
      const response = await apiFetch<any>(url);

      if (Array.isArray(response)) {
        items.value = response;
        pagination.total = response.length;
      } else if (response && Array.isArray(response.data)) {
        items.value = response.data;
        if (response.meta) {
          pagination.total = response.meta.total || response.data.length;
          pagination.page = response.meta.page || pagination.page;
        } else {
          pagination.total = response.data.length;
        }
      } else if (response && typeof response === 'object') {
        const list = response.items || response.records || response.clients || response.users || response.agents || response.bots || response.messages || [];
        items.value = Array.isArray(list) ? list : [];
        pagination.total = response.total || items.value.length;
      } else {
        items.value = [];
        pagination.total = 0;
      }
    } catch (err: any) {
      items.value = [];
      pagination.total = 0;
      console.error(`[useCrud API Failure] Endpoint: ${endpoint}`, err);
      showToast(
        'error', 
        'Backend Endpoint Error', 
        err.message?.includes('404') 
          ? `Missing NestJS API route: ${endpoint}. Please verify controller route in backend.` 
          : err.message || `Failed to fetch records from backend route: ${endpoint}`
      );
    } finally {
      isLoading.value = false;
    }
  };

  const createItem = async (payload: Partial<T>) => {
    isSubmitting.value = true;
    try {
      await apiFetch<T>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showToast('success', 'Success', 'Record created in database.');
      await fetchItems();
      return true;
    } catch (err: any) {
      console.error(`[useCrud API Create Error] Endpoint: ${endpoint}`, err);
      showToast('error', 'Creation Error', err.message || `Failed POST request to ${endpoint}`);
      return false;
    } finally {
      isSubmitting.value = false;
    }
  };

  const updateItem = async (id: string | number, payload: Partial<T>) => {
    isSubmitting.value = true;
    try {
      try {
        await apiFetch<T>(`${endpoint}/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } catch (patchErr: any) {
        // Fall back to PUT if NestJS controller handler uses @Put()
        await apiFetch<T>(`${endpoint}/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }

      showToast('success', 'Success', 'Record updated in database.');
      await fetchItems();
      return true;
    } catch (err: any) {
      console.error(`[useCrud API Update Error] Endpoint: ${endpoint}/${id}`, err);
      showToast('error', 'Update Error', err.message || `Failed PATCH/PUT request to ${endpoint}/${id}`);
      return false;
    } finally {
      isSubmitting.value = false;
    }
  };

  const deleteItem = async (id: string | number) => {
    isLoading.value = true;
    try {
      await apiFetch(`${endpoint}/${id}`, {
        method: 'DELETE',
      });
      showToast('success', 'Success', 'Record deleted from database.');
      await fetchItems();
    } catch (err: any) {
      console.error(`[useCrud API Delete Error] Endpoint: ${endpoint}/${id}`, err);
      showToast('error', 'Deletion Error', err.message || `Failed DELETE request to ${endpoint}/${id}`);
    } finally {
      isLoading.value = false;
    }
  };

  return {
    items,
    isLoading,
    isSubmitting,
    searchQuery,
    currentFormItem,
    pagination,
    toast,
    showToast,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
  };
}
