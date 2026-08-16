<template>
  <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
    <!-- Top Bar -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        
        <!-- Left: Logo & Brand -->
        <div class="flex items-center gap-8">
          <RouterLink to="/admin/dashboard" class="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1">
            <div class="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-semibold text-base shadow-sm group-hover:bg-blue-600 transition-colors duration-200">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div class="flex flex-col">
              <span class="font-bold text-slate-900 leading-none text-base tracking-tight group-hover:text-blue-600 transition-colors">Admin Console</span>
              <span class="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-0.5">Schema CRUD Engine</span>
            </div>
          </RouterLink>

          <!-- Top Navigation Menu (Desktop) -->
          <nav class="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
            <RouterLink 
              v-for="item in navItems" 
              :key="item.path" 
              :to="item.path"
              class="px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              :class="isCurrentRoute(item.path) 
                ? 'bg-blue-50 text-blue-700 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'"
            >
              <component :is="item.iconComponent" class="w-4 h-4 shrink-0" />
              <span>{{ item.label }}</span>
            </RouterLink>
          </nav>
        </div>

        <!-- Right: Profile & Actions -->
        <div class="flex items-center gap-3">
          <!-- Profile Badge -->
          <div class="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-100/80 border border-slate-200/80 select-none">
            <div class="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold">
              {{ userNameInitials }}
            </div>
            <span class="text-xs font-medium text-slate-700 hidden sm:inline-block">{{ userName }}</span>
          </div>

          <!-- Logout Button -->
          <button 
            @click="handleLogout"
            aria-label="Log out"
            title="Log out"
            class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Sub-Header: Breadcrumbs Bar -->
    <div class="bg-slate-50/80 border-t border-slate-200/60 py-2 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
      <div class="max-w-7xl mx-auto flex items-center gap-2">
        <RouterLink to="/admin/dashboard" class="hover:text-blue-600 transition-colors font-medium">Admin</RouterLink>
        <svg class="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <span class="font-semibold text-slate-800 capitalize tracking-wide">{{ currentBreadcrumb }}</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '../../composables/useAuth';

const route = useRoute();
const router = useRouter();

// SVG Icons as functional render helpers (Heroicons style)
const DashboardIcon = {
  render: () => h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' })
  ])
};

const UsersIcon = {
  render: () => h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' })
  ])
};

const BotIcon = {
  render: () => h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' })
  ])
};

const MessagesIcon = {
  render: () => h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' })
  ])
};

const KeyIcon = {
  render: () => h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' })
  ])
};

const SettingsIcon = {
  render: () => h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }),
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' })
  ])
};

const navItems = [
  { label: 'Dashboard', path: '/admin/dashboard', iconComponent: DashboardIcon },
  { label: 'Users', path: '/admin/users', iconComponent: UsersIcon },
  { label: 'Telegram Bots', path: '/admin/bots', iconComponent: BotIcon },
  { label: 'Messages', path: '/admin/messages', iconComponent: MessagesIcon },
  { label: 'API Clients', path: '/admin/clients', iconComponent: KeyIcon },
  { label: 'Settings', path: '/admin/settings', iconComponent: SettingsIcon },
];

const isCurrentRoute = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/');
};

const currentBreadcrumb = computed(() => {
  const segment = route.path.split('/').filter(Boolean).pop() || 'Dashboard';
  return segment.replace('-', ' ');
});

const { currentAgent, clearSession } = useAuth();

const userName = computed(() => currentAgent.value?.name || 'Administrator');
const userNameInitials = computed(() => userName.value.charAt(0).toUpperCase());

const handleLogout = () => {
  clearSession();
  router.push('/login');
};
</script>
