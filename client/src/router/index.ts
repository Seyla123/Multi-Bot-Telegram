import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from 'vue-router';
import { useAuth } from '../composables/useAuth';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiresAdmin?: boolean;
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/MainWorkspace.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../components/feature/Login.vue'),
  },
  {
    path: '/admin',
    component: () => import('../layouts/AdminLayout.vue'),
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', name: 'admin-dashboard', component: () => import('../views/admin/AdminDashboard.vue') },
      { path: 'users', name: 'admin-users', component: () => import('../views/admin/UsersView.vue') },
      { path: 'bots', name: 'admin-bots', component: () => import('../views/admin/TelegramBotsView.vue') },
      { path: 'messages', name: 'admin-messages', component: () => import('../views/admin/TelegramMessagesView.vue') },
      { path: 'clients', name: 'admin-clients', component: () => import('../views/admin/ClientsCrudView.vue') },
      { path: 'settings', name: 'admin-settings', component: () => import('../views/admin/SettingsView.vue') },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const { token, currentAgent, restoreSession } = useAuth();

  if (!token.value && !currentAgent.value) {
    restoreSession();
  }

  const isAuthenticated = !!token.value;
  const isAdmin = currentAgent.value?.role === 'ADMIN';

  if (to.meta.requiresAuth && !isAuthenticated) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    };
  }

  if (to.meta.requiresAdmin && !isAdmin) {
    return { name: 'home' };
  }

  if (to.name === 'login' && isAuthenticated) {
    return { name: isAdmin ? 'admin' : 'home' };
  }

  return true;
});

export default router;
