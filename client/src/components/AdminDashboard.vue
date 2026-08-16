<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  AdminService,
  type AdminBot,
  type AdminAgent,
  type AdminQueryParams,
} from '../services/adminService';

const router = useRouter();

// Navigation Tabs
type Tab = 'bots' | 'agents' | 'users' | 'messages' | 'videos';
const activeTab = ref<Tab>('bots');

// List State
const items = ref<any[]>([]);
const totalItems = ref(0);
const totalPages = ref(1);
const currentPage = ref(1);
const limitPerPage = ref(15);
const searchQuery = ref('');
const filterStatus = ref('');
const filterBotId = ref('');
const filterAgentId = ref('');
const filterMsgType = ref('');

const loading = ref(false);
const errorMsg = ref<string | null>(null);
const successMsg = ref<string | null>(null);

// Dropdown Helper Lists
const availableBots = ref<AdminBot[]>([]);
const availableAgents = ref<AdminAgent[]>([]);

// Selection / Modal States
const isDetailOpen = ref(false);
const isFormOpen = ref(false);
const isConfirmOpen = ref(false);

const selectedItem = ref<any | null>(null);
const actionTargetId = ref<any | null>(null);

// Form Fields
const formBot = ref({
  botId: '',
  botToken: '',
  name: '',
  username: '',
  isActive: true,
});

const formAgent = ref({
  name: '',
  email: '',
  password: '',
  role: 'AGENT',
});

const formUser = ref({
  firstName: '',
  lastName: '',
  username: '',
  phoneNumber: '',
  status: 'active',
  conversationStatus: 'OPEN',
  assignedAgentId: '',
});

const formVideo = ref({
  title: '',
  originalFileName: '',
  status: 'pending',
});

// Load Dropdowns
const loadDropdowns = async () => {
  try {
    const [botsRes, agentsRes] = await Promise.all([
      AdminService.listBots({ limit: 100 }),
      AdminService.listAgents({ limit: 100 }),
    ]);
    availableBots.value = botsRes.data || [];
    availableAgents.value = agentsRes.data || [];
  } catch (e) {
    console.error('Failed to load filters metadata', e);
  }
};

// Main Load Data Function
const loadData = async () => {
  loading.value = true;
  errorMsg.value = null;
  items.value = [];

  const params: AdminQueryParams = {
    page: currentPage.value,
    limit: limitPerPage.value,
    search: searchQuery.value || undefined,
    status: filterStatus.value || undefined,
    botId: filterBotId.value || undefined,
    agentId: filterAgentId.value || undefined,
    messageType: filterMsgType.value || undefined,
    conversationStatus:
      activeTab.value === 'users' && filterStatus.value ? undefined : undefined,
  };

  // Status mapping for user conversationStatus filter
  if (activeTab.value === 'users' && filterStatus.value) {
    if (filterStatus.value === 'OPEN' || filterStatus.value === 'RESOLVED') {
      params.conversationStatus = filterStatus.value;
      params.status = undefined;
    } else {
      params.status = filterStatus.value;
      params.conversationStatus = undefined;
    }
  }

  try {
    let res: any;
    if (activeTab.value === 'bots') {
      res = await AdminService.listBots(params);
    } else if (activeTab.value === 'agents') {
      res = await AdminService.listAgents(params);
    } else if (activeTab.value === 'users') {
      res = await AdminService.listTelegramUsers(params);
    } else if (activeTab.value === 'messages') {
      res = await AdminService.listTelegramMessages(params);
    } else if (activeTab.value === 'videos') {
      res = await AdminService.listVideos(params);
    }

    if (res && res.status) {
      items.value = res.data || [];
      if (res.meta) {
        totalItems.value = res.meta.total;
        totalPages.value = res.meta.totalPages;
        currentPage.value = res.meta.page;
      }
    }
  } catch (e: any) {
    errorMsg.value = e.message || 'Failed to retrieve records.';
  } finally {
    loading.value = false;
  }
};

// Tab switching
watch(activeTab, () => {
  currentPage.value = 1;
  searchQuery.value = '';
  filterStatus.value = '';
  filterBotId.value = '';
  filterAgentId.value = '';
  filterMsgType.value = '';
  loadData();
});

// Watch parameters
watch([filterStatus, filterBotId, filterAgentId, filterMsgType], () => {
  currentPage.value = 1;
  loadData();
});

// Actions
const handleSearch = () => {
  currentPage.value = 1;
  loadData();
};

const handlePage = (dir: 'next' | 'prev') => {
  if (dir === 'next' && currentPage.value < totalPages.value) {
    currentPage.value++;
    loadData();
  } else if (dir === 'prev' && currentPage.value > 1) {
    currentPage.value--;
    loadData();
  }
};

// Details Modal
const openDetails = async (item: any) => {
  errorMsg.value = null;
  try {
    if (activeTab.value === 'bots') {
      const res = await AdminService.getBot(item.id);
      selectedItem.value = res.data;
    } else if (activeTab.value === 'agents') {
      const res = await AdminService.getAgent(item.id);
      selectedItem.value = res.data;
    } else if (activeTab.value === 'users') {
      const res = await AdminService.getTelegramUser(item.id);
      selectedItem.value = res.data;
    } else if (activeTab.value === 'messages') {
      selectedItem.value = item;
    } else if (activeTab.value === 'videos') {
      const res = await AdminService.getVideo(item.id);
      selectedItem.value = res.data;
    }
    isDetailOpen.value = true;
  } catch (e: any) {
    errorMsg.value = e.message || 'Failed to load details.';
  }
};

// Form Open/Edit
const openForm = (item: any = null) => {
  errorMsg.value = null;
  selectedItem.value = item;

  if (activeTab.value === 'bots') {
    if (item) {
      formBot.value = {
        botId: item.botId,
        botToken: '********', // Mask token
        name: item.name,
        username: item.username || '',
        isActive: item.isActive,
      };
    } else {
      formBot.value = {
        botId: '',
        botToken: '',
        name: '',
        username: '',
        isActive: true,
      };
    }
  } else if (activeTab.value === 'agents') {
    if (item) {
      formAgent.value = {
        name: item.name,
        email: item.email,
        password: '', // blank to leave unchanged
        role: item.role || 'AGENT',
      };
    } else {
      formAgent.value = { name: '', email: '', password: '', role: 'AGENT' };
    }
  } else if (activeTab.value === 'users') {
    if (item) {
      formUser.value = {
        firstName: item.firstName,
        lastName: item.lastName || '',
        username: item.username || '',
        phoneNumber: item.phoneNumber || '',
        status: item.status || 'active',
        conversationStatus: item.conversationStatus || 'OPEN',
        assignedAgentId: item.assignedAgentId || '',
      };
    }
  } else if (activeTab.value === 'videos') {
    if (item) {
      formVideo.value = {
        title: item.title,
        originalFileName: item.originalFileName,
        status: item.status || 'pending',
      };
    } else {
      formVideo.value = { title: '', originalFileName: '', status: 'pending' };
    }
  }

  isFormOpen.value = true;
};

// Form Submit
const submitForm = async () => {
  errorMsg.value = null;
  successMsg.value = null;
  loading.value = true;

  try {
    if (activeTab.value === 'bots') {
      if (selectedItem.value) {
        await AdminService.updateBot(selectedItem.value.id, formBot.value);
        showSuccess('Bot configurations updated successfully.');
      } else {
        await AdminService.createBot(formBot.value);
        showSuccess('New Telegram Bot registered successfully.');
      }
    } else if (activeTab.value === 'agents') {
      if (selectedItem.value) {
        await AdminService.updateAgent(selectedItem.value.id, formAgent.value);
        showSuccess('Agent configurations updated successfully.');
      } else {
        await AdminService.createAgent(formAgent.value);
        showSuccess('New Support Operator registered successfully.');
      }
    } else if (activeTab.value === 'users') {
      if (selectedItem.value) {
        await AdminService.updateTelegramUser(
          selectedItem.value.id,
          formUser.value,
        );
        showSuccess('Telegram User assignment/status updated.');
      }
    } else if (activeTab.value === 'videos') {
      if (selectedItem.value) {
        await AdminService.updateVideo(selectedItem.value.id, formVideo.value);
        showSuccess('Video configurations updated.');
      } else {
        await AdminService.createVideo(formVideo.value);
        showSuccess('Video record queued successfully.');
      }
    }

    isFormOpen.value = false;
    loadData();
    loadDropdowns();
  } catch (e: any) {
    errorMsg.value = e.message || 'Operation failed. Please review your input.';
  } finally {
    loading.value = false;
  }
};

// Delete Actions
const triggerDelete = (item: any) => {
  errorMsg.value = null;
  selectedItem.value = item;
  actionTargetId.value = item.id;
  isConfirmOpen.value = true;
};

const executeDelete = async () => {
  errorMsg.value = null;
  successMsg.value = null;
  isConfirmOpen.value = false;

  try {
    if (activeTab.value === 'bots') {
      await AdminService.deleteBot(actionTargetId.value);
      showSuccess('Bot registration removed successfully.');
    } else if (activeTab.value === 'agents') {
      await AdminService.deleteAgent(actionTargetId.value);
      showSuccess('Agent profile removed successfully.');
    } else if (activeTab.value === 'users') {
      await AdminService.deleteTelegramUser(actionTargetId.value);
      showSuccess('Telegram User record removed.');
    } else if (activeTab.value === 'messages') {
      await AdminService.deleteTelegramMessage(actionTargetId.value);
      showSuccess('Chat message record deleted.');
    } else if (activeTab.value === 'videos') {
      await AdminService.deleteVideo(actionTargetId.value);
      showSuccess('Video record deleted.');
    }
    loadData();
    loadDropdowns();
  } catch (e: any) {
    errorMsg.value =
      e.message ||
      'Failed to delete record. Active foreign dependencies may exist.';
  }
};

const showSuccess = (msg: string) => {
  successMsg.value = msg;
  setTimeout(() => {
    successMsg.value = null;
  }, 4000);
};

onMounted(() => {
  loadData();
  loadDropdowns();
});
</script>

<template>
  <div
    class="flex-1 flex flex-col h-screen bg-bg-dark text-white border-l border-slate-700/50 relative"
  >
    <!-- Header -->
    <header
      class="h-16 px-6 border-b border-border flex items-center justify-between shrink-0 bg-slate-900/40 backdrop-blur-md"
    >
      <div class="flex items-center gap-3">
        <button
          @click="router.push('/')"
          class="p-2 hover:bg-white/5 text-text-muted hover:text-white rounded-lg transition-colors flex items-center justify-center"
          title="Back to support inbox"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <h1
          class="text-lg font-bold tracking-tight text-white flex items-center gap-2"
        >
          <span>Admin Control Center</span>
          <span
            class="text-xs px-2.5 py-0.5 rounded-full bg-accent/20 text-accent font-semibold uppercase tracking-wider border border-accent/20"
            >Admin Privileges</span
          >
        </h1>
      </div>
      <button
        @click="router.push('/admin/clients')"
        class="px-3 py-2 text-xs font-semibold rounded-lg border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
      >
        API Clients
      </button>
    </header>

    <!-- Success / Error Alert banners -->
    <div class="px-6 pt-4 space-y-2 shrink-0">
      <div
        v-if="successMsg"
        class="p-3.5 bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-xl flex items-center gap-2"
      >
        <svg
          class="w-5 h-5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{{ successMsg }}</span>
      </div>
      <div
        v-if="errorMsg"
        class="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center gap-2"
      >
        <svg
          class="w-5 h-5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span>{{ errorMsg }}</span>
      </div>
    </div>

    <!-- Inner tabs navigation -->
    <div class="px-6 pt-3 flex gap-2 overflow-x-auto shrink-0">
      <button
        v-for="t in ['bots', 'agents', 'users', 'messages', 'videos'] as Tab[]"
        :key="t"
        @click="activeTab = t"
        class="px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all border"
        :class="
          activeTab === t
            ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20'
            : 'bg-slate-800/40 border-slate-700/50 text-text-muted hover:bg-slate-800 hover:text-white'
        "
      >
        {{
          t === 'users'
            ? 'Telegram Users'
            : t === 'messages'
              ? 'Audit Messages'
              : t === 'videos'
                ? 'Video Jobs'
                : t
        }}
      </button>
    </div>

    <!-- Toolbar / Search and Filters -->
    <div
      class="px-6 py-4 flex flex-wrap gap-3 items-center justify-between shrink-0 bg-slate-900/10 border-b border-slate-800/30"
    >
      <div class="flex flex-wrap gap-2 items-center flex-1 max-w-2xl">
        <div class="relative flex-1 min-w-[200px]">
          <input
            type="text"
            v-model="searchQuery"
            @keyup.enter="handleSearch"
            placeholder="Search records..."
            class="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <button
          @click="handleSearch"
          class="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Search
        </button>

        <!-- Dynamic filters based on active tab -->
        <select
          v-if="activeTab === 'bots' || activeTab === 'videos'"
          v-model="filterStatus"
          class="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent text-text-main"
        >
          <option value="">All Statuses</option>
          <template v-if="activeTab === 'bots'">
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </template>
          <template v-else-if="activeTab === 'videos'">
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </template>
        </select>

        <select
          v-if="activeTab === 'users'"
          v-model="filterStatus"
          class="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent text-text-main"
        >
          <option value="">All Statuses</option>
          <option value="active">Active Profiles</option>
          <option value="blocked">Blocked Profiles</option>
          <option value="OPEN">Conversation OPEN</option>
          <option value="RESOLVED">Conversation RESOLVED</option>
        </select>

        <select
          v-if="activeTab === 'users' || activeTab === 'messages'"
          v-model="filterBotId"
          class="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent text-text-main max-w-[150px]"
        >
          <option value="">All Bots</option>
          <option v-for="b in availableBots" :key="b.id" :value="b.id">
            {{ b.name }}
          </option>
        </select>

        <select
          v-if="activeTab === 'users' || activeTab === 'messages'"
          v-model="filterAgentId"
          class="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent text-text-main max-w-[150px]"
        >
          <option value="">All Agents</option>
          <option value="null">Unassigned</option>
          <option v-for="a in availableAgents" :key="a.id" :value="a.id">
            {{ a.name }}
          </option>
        </select>

        <select
          v-if="activeTab === 'messages'"
          v-model="filterMsgType"
          class="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent text-text-main"
        >
          <option value="">All Types</option>
          <option value="text">Text</option>
          <option value="photo">Photo</option>
          <option value="video">Video</option>
          <option value="voice">Voice</option>
          <option value="document">Document</option>
        </select>
      </div>

      <!-- Add New button -->
      <button
        v-if="activeTab !== 'users' && activeTab !== 'messages'"
        @click="openForm()"
        class="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-md shadow-accent/10 shrink-0"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4.5 w-4.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.5"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add New
      </button>
    </div>

    <!-- Main Table Area -->
    <div class="flex-1 overflow-y-auto px-6 pb-6">
      <div
        v-if="loading"
        class="flex flex-col items-center justify-center h-64 text-text-muted gap-2"
      >
        <svg
          class="animate-spin h-8 w-8 text-accent"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span class="text-sm font-medium">Fetching database logs...</span>
      </div>

      <div
        v-else-if="items.length === 0"
        class="flex flex-col items-center justify-center h-64 text-text-muted"
      >
        <svg
          class="w-12 h-12 opacity-30 mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <span class="text-sm font-medium"
          >No matching database records found.</span
        >
      </div>

      <div
        v-else
        class="bg-slate-900/30 border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md"
      >
        <table class="w-full text-left border-collapse">
          <thead>
            <tr
              class="border-b border-slate-800 bg-slate-900/60 text-xs font-bold text-text-muted uppercase tracking-wider"
            >
              <template v-if="activeTab === 'bots'">
                <th class="px-5 py-4">Name</th>
                <th class="px-5 py-4">Username</th>
                <th class="px-5 py-4">Real Bot ID</th>
                <th class="px-5 py-4">Status</th>
                <th class="px-5 py-4 text-right">Actions</th>
              </template>
              <template v-else-if="activeTab === 'agents'">
                <th class="px-5 py-4">Name</th>
                <th class="px-5 py-4">Email</th>
                <th class="px-5 py-4">Access Role</th>
                <th class="px-5 py-4 text-right">Actions</th>
              </template>
              <template v-else-if="activeTab === 'users'">
                <th class="px-5 py-4">Telegram ID</th>
                <th class="px-5 py-4">Name</th>
                <th class="px-5 py-4">Origin Bot</th>
                <th class="px-5 py-4">Assigned Agent</th>
                <th class="px-5 py-4">Chat Status</th>
                <th class="px-5 py-4 text-right">Actions</th>
              </template>
              <template v-else-if="activeTab === 'messages'">
                <th class="px-5 py-4">Msg ID</th>
                <th class="px-5 py-4">Sender</th>
                <th class="px-5 py-4">Type</th>
                <th class="px-5 py-4">Content</th>
                <th class="px-5 py-4">Timestamp</th>
                <th class="px-5 py-4 text-right">Actions</th>
              </template>
              <template v-else-if="activeTab === 'videos'">
                <th class="px-5 py-4">Title</th>
                <th class="px-5 py-4">Filename</th>
                <th class="px-5 py-4">Queue Status</th>
                <th class="px-5 py-4 text-right">Actions</th>
              </template>
            </tr>
          </thead>
          <tbody class="text-sm divide-y divide-slate-800/50">
            <tr
              v-for="item in items"
              :key="item.id"
              class="hover:bg-white/5 transition-colors"
            >
              <template v-if="activeTab === 'bots'">
                <td class="px-5 py-3.5 font-medium text-white">
                  {{ item.name }}
                </td>
                <td class="px-5 py-3.5 text-text-muted">
                  @{{ item.username || 'N/A' }}
                </td>
                <td class="px-5 py-3.5 font-mono text-xs text-text-muted">
                  {{ item.botId }}
                </td>
                <td class="px-5 py-3.5">
                  <span
                    class="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full"
                    :class="
                      item.isActive
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    "
                  >
                    {{ item.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
              </template>
              <template v-else-if="activeTab === 'agents'">
                <td class="px-5 py-3.5 font-medium text-white">
                  {{ item.name }}
                </td>
                <td class="px-5 py-3.5 text-text-muted">{{ item.email }}</td>
                <td class="px-5 py-3.5">
                  <span
                    class="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full"
                    :class="
                      item.role === 'admin'
                        ? 'bg-accent/10 text-accent border border-accent/20'
                        : 'bg-slate-700/20 text-slate-400'
                    "
                  >
                    {{ item.role }}
                  </span>
                </td>
              </template>
              <template v-else-if="activeTab === 'users'">
                <td class="px-5 py-3.5 font-mono text-xs text-text-muted">
                  {{ item.telegramId }}
                </td>
                <td class="px-5 py-3.5 font-medium text-white">
                  {{ item.firstName }} {{ item.lastName || '' }}
                </td>
                <td class="px-5 py-3.5 text-text-muted">
                  {{ item.bot?.name || 'N/A' }}
                </td>
                <td class="px-5 py-3.5 text-text-muted">
                  {{ item.assignedAgent?.name || 'Unassigned' }}
                </td>
                <td class="px-5 py-3.5">
                  <span
                    class="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full"
                    :class="
                      item.conversationStatus === 'OPEN'
                        ? 'bg-accent/10 text-accent'
                        : 'bg-slate-700/20 text-slate-400'
                    "
                  >
                    {{ item.conversationStatus }}
                  </span>
                </td>
              </template>
              <template v-else-if="activeTab === 'messages'">
                <td class="px-5 py-3.5 font-mono text-xs text-text-muted">
                  {{ item.messageId }}
                </td>
                <td class="px-5 py-3.5 text-text-main font-medium">
                  {{
                    item.agent
                      ? `Operator: ${item.agent.name}`
                      : `${item.telegramUser?.firstName || 'User'}`
                  }}
                </td>
                <td class="px-5 py-3.5">
                  <span
                    class="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-800 text-slate-300"
                  >
                    {{ item.messageType }}
                  </span>
                </td>
                <td class="px-5 py-3.5 text-text-muted truncate max-w-[200px]">
                  {{ item.text || 'Media attachment' }}
                </td>
                <td class="px-5 py-3.5 text-xs text-text-muted">
                  {{ new Date(item.createdAt).toLocaleString() }}
                </td>
              </template>
              <template v-else-if="activeTab === 'videos'">
                <td class="px-5 py-3.5 font-medium text-white">
                  {{ item.title }}
                </td>
                <td class="px-5 py-3.5 text-text-muted text-xs font-mono">
                  {{ item.originalFileName }}
                </td>
                <td class="px-5 py-3.5">
                  <span
                    class="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full"
                    :class="{
                      'bg-green-500/10 text-green-400':
                        item.status === 'completed',
                      'bg-amber-500/10 text-amber-400':
                        item.status === 'processing',
                      'bg-slate-700/20 text-slate-400':
                        item.status === 'pending',
                      'bg-red-500/10 text-red-400': item.status === 'failed',
                    }"
                  >
                    {{ item.status }}
                  </span>
                </td>
              </template>

              <!-- Actions column -->
              <td class="px-5 py-3.5 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    @click="openDetails(item)"
                    class="p-1.5 hover:bg-white/5 text-text-muted hover:text-white rounded-lg transition-colors"
                    title="View Details"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </button>
                  <button
                    v-if="activeTab !== 'messages'"
                    @click="openForm(item)"
                    class="p-1.5 hover:bg-white/5 text-text-muted hover:text-amber-400 rounded-lg transition-colors"
                    title="Edit Record"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    @click="triggerDelete(item)"
                    class="p-1.5 hover:bg-white/5 text-text-muted hover:text-red-400 rounded-lg transition-colors"
                    title="Delete Record"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Server-side Pagination footer -->
        <div
          class="px-5 py-4 border-t border-slate-800 bg-slate-900/20 flex items-center justify-between text-xs text-text-muted shrink-0"
        >
          <span
            >Showing page {{ currentPage }} of {{ totalPages }} ({{
              totalItems
            }}
            total records)</span
          >
          <div class="flex items-center gap-2">
            <button
              @click="handlePage('prev')"
              :disabled="currentPage === 1"
              class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 border border-slate-700/50 rounded-lg transition-colors font-medium text-white"
            >
              Previous
            </button>
            <button
              @click="handlePage('next')"
              :disabled="currentPage === totalPages"
              class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 border border-slate-700/50 rounded-lg transition-colors font-medium text-white"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────────────────────
         MODALS
         ──────────────────────────────────────────────────────────────────────── -->

    <!-- DETAILS MODAL -->
    <div
      v-if="isDetailOpen"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        class="bg-bg-dark border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in"
      >
        <header
          class="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60"
        >
          <h3
            class="text-sm font-bold uppercase tracking-wider text-text-muted"
          >
            Entity Detailed Audit Log
          </h3>
          <button
            @click="isDetailOpen = false"
            class="text-text-muted hover:text-white transition-colors"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </header>
        <div class="p-6 space-y-4 text-sm max-h-[70vh] overflow-y-auto">
          <div
            v-for="(val, key) in selectedItem"
            :key="key"
            class="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-800/40"
          >
            <span class="font-semibold text-text-muted capitalize"
              >{{ String(key).replace(/([A-Z])/g, ' $1') }}:</span
            >
            <span
              class="col-span-2 text-white font-mono text-xs break-all whitespace-pre-wrap"
              >{{ val }}</span
            >
          </div>
        </div>
        <footer
          class="px-6 py-4 bg-slate-900/20 border-t border-slate-800 flex justify-end"
        >
          <button
            @click="isDetailOpen = false"
            class="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </footer>
      </div>
    </div>

    <!-- CREATE/EDIT FORM MODAL -->
    <div
      v-if="isFormOpen"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        class="bg-bg-dark border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <header
          class="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60"
        >
          <h3
            class="text-sm font-bold uppercase tracking-wider text-text-muted"
          >
            {{ selectedItem ? 'Edit Configuration' : 'Register New Entity' }}
          </h3>
          <button
            @click="isFormOpen = false"
            class="text-text-muted hover:text-white transition-colors"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </header>
        <form @submit.prevent="submitForm">
          <div class="p-6 space-y-4 text-sm">
            <!-- BOT FORM -->
            <template v-if="activeTab === 'bots'">
              <div class="space-y-1.5">
                <label class="block font-semibold text-text-muted"
                  >Bot Name</label
                >
                <input
                  type="text"
                  v-model="formBot.name"
                  required
                  class="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-2 focus:outline-none focus:border-accent text-white"
                />
              </div>
              <div class="space-y-1.5">
                <label class="block font-semibold text-text-muted"
                  >Username (@bot)</label
                >
                <input
                  type="text"
                  v-model="formBot.username"
                  class="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-2 focus:outline-none focus:border-accent text-white"
                />
              </div>
              <div class="space-y-1.5">
                <label class="block font-semibold text-text-muted"
                  >Telegram Real Bot ID</label
                >
                <input
                  type="text"
                  v-model="formBot.botId"
                  :disabled="!!selectedItem"
                  required
                  class="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-2 focus:outline-none focus:border-accent text-white disabled:opacity-50"
                />
              </div>
              <div class="space-y-1.5">
                <label class="block font-semibold text-text-muted"
                  >Bot Token (Secret)</label
                >
                <input
                  type="password"
                  v-model="formBot.botToken"
                  required
                  placeholder="Token key..."
                  class="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-2 focus:outline-none focus:border-accent text-white"
                />
                <span class="text-xs text-text-muted" v-if="selectedItem"
                  >Leave field as '********' to preserve current token.</span
                >
              </div>
              <div class="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  v-model="formBot.isActive"
                  class="rounded border-slate-700 text-accent focus:ring-accent"
                />
                <label class="font-semibold text-text-muted"
                  >Mark Bot as Active</label
                >
              </div>
            </template>

            <!-- AGENT FORM -->
            <template v-if="activeTab === 'agents'">
              <div class="space-y-1.5">
                <label class="block font-semibold text-text-muted"
                  >Operator Name</label
                >
                <input
                  type="text"
                  v-model="formAgent.name"
                  required
                  class="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-2 focus:outline-none focus:border-accent text-white"
                />
              </div>
              <div class="space-y-1.5">
                <label class="block font-semibold text-text-muted"
                  >Email Address</label
                >
                <input
                  type="email"
                  v-model="formAgent.email"
                  required
                  class="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-2 focus:outline-none focus:border-accent text-white"
                />
              </div>
              <div class="space-y-1.5">
                <label class="block font-semibold text-text-muted"
                  >Access Role</label
                >
                <select
                  v-model="formAgent.role"
                  class="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2 focus:outline-none focus:border-accent text-text-main"
                >
                  <option value="AGENT">Support Agent</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="block font-semibold text-text-muted"
                  >Password</label
                >
                <input
                  type="password"
                  v-model="formAgent.password"
                  :required="!selectedItem"
                  placeholder="Password value..."
                  class="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-2 focus:outline-none focus:border-accent text-white"
                />
                <span class="text-xs text-text-muted" v-if="selectedItem"
                  >Leave blank to keep the current password.</span
                >
              </div>
            </template>

            <!-- TELEGRAM USER FORM -->
            <template v-if="activeTab === 'users'">
              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-1.5">
                  <label class="block font-semibold text-text-muted"
                    >First Name</label
                  >
                  <input
                    type="text"
                    v-model="formUser.firstName"
                    required
                    class="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-2 focus:outline-none focus:border-accent text-white"
                  />
                </div>
                <div class="space-y-1.5">
                  <label class="block font-semibold text-text-muted"
                    >Last Name</label
                  >
                  <input
                    type="text"
                    v-model="formUser.lastName"
                    class="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-2 focus:outline-none focus:border-accent text-white"
                  />
                </div>
              </div>
              <div class="space-y-1.5">
                <label class="block font-semibold text-text-muted"
                  >Phone Number</label
                >
                <input
                  type="text"
                  v-model="formUser.phoneNumber"
                  class="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-2 focus:outline-none focus:border-accent text-white"
                />
              </div>
              <div class="space-y-1.5">
                <label class="block font-semibold text-text-muted"
                  >Assigned Operator</label
                >
                <select
                  v-model="formUser.assignedAgentId"
                  class="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2 focus:outline-none focus:border-accent text-text-main"
                >
                  <option value="">Unassigned</option>
                  <option
                    v-for="a in availableAgents"
                    :key="a.id"
                    :value="a.id"
                  >
                    {{ a.name }}
                  </option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-1.5">
                  <label class="block font-semibold text-text-muted"
                    >Status</label
                  >
                  <select
                    v-model="formUser.status"
                    class="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2 focus:outline-none focus:border-accent text-text-main"
                  >
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
                <div class="space-y-1.5">
                  <label class="block font-semibold text-text-muted"
                    >Conv Status</label
                  >
                  <select
                    v-model="formUser.conversationStatus"
                    class="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2 focus:outline-none focus:border-accent text-text-main"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </div>
              </div>
            </template>

            <!-- VIDEO FORM -->
            <template v-if="activeTab === 'videos'">
              <div class="space-y-1.5">
                <label class="block font-semibold text-text-muted"
                  >Video Title</label
                >
                <input
                  type="text"
                  v-model="formVideo.title"
                  required
                  class="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-2 focus:outline-none focus:border-accent text-white"
                />
              </div>
              <div class="space-y-1.5">
                <label class="block font-semibold text-text-muted"
                  >Original Filename</label
                >
                <input
                  type="text"
                  v-model="formVideo.originalFileName"
                  required
                  class="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-2 focus:outline-none focus:border-accent text-white"
                />
              </div>
              <div class="space-y-1.5">
                <label class="block font-semibold text-text-muted"
                  >Processing Status</label
                >
                <select
                  v-model="formVideo.status"
                  class="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2 focus:outline-none focus:border-accent text-text-main"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </template>
          </div>
          <footer
            class="px-6 py-4 bg-slate-900/20 border-t border-slate-800 flex justify-end gap-2"
          >
            <button
              type="button"
              @click="isFormOpen = false"
              class="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Save Changes
            </button>
          </footer>
        </form>
      </div>
    </div>

    <!-- DELETION CONFIRMATION DIALOG -->
    <div
      v-if="isConfirmOpen"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        class="bg-bg-dark border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-fade-in"
      >
        <header
          class="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-red-500/10"
        >
          <h3
            class="text-sm font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Danger: Confirm Deletion
          </h3>
        </header>
        <div class="p-6 text-sm text-text-muted space-y-2">
          <p>
            Are you sure you want to permanently delete this record? This action
            cannot be undone.
          </p>
          <div
            class="bg-black/35 rounded-xl p-3 border border-slate-800 text-xs font-mono break-all text-white"
          >
            ID: {{ actionTargetId }}
          </div>
        </div>
        <footer
          class="px-6 py-4 bg-slate-900/20 border-t border-slate-800 flex justify-end gap-2"
        >
          <button
            @click="isConfirmOpen = false"
            class="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            @click="executeDelete"
            class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Confirm Delete
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>
