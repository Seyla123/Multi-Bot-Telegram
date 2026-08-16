<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../composables/useAuth';

const { setSession, authLoading } = useAuth();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const errorMsg = ref('');

const handleLogin = async () => {
  errorMsg.value = '';
  if (!email.value || !password.value) {
    errorMsg.value = 'Email and password are required';
    return;
  }

  authLoading.value = true;
  try {
    const response = await apiFetch<any>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value,
        password: password.value,
      }),
    });

    // Set token and agent
    if (response.data && response.data.accessToken) {
      setSession(response.data.accessToken, response.data.agent);

      const redirectTarget =
        typeof route.query.redirect === 'string' &&
        route.query.redirect.startsWith('/')
          ? route.query.redirect
          : '';
      const defaultTarget =
        response.data.agent?.role === 'ADMIN' ? '/admin' : '/';
      const nextRoute =
        redirectTarget &&
        (response.data.agent?.role === 'ADMIN' ||
          !redirectTarget.startsWith('/admin'))
          ? redirectTarget
          : defaultTarget;

      await router.replace(nextRoute);
    } else {
      throw new Error('Invalid response format from server');
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to login';
  } finally {
    authLoading.value = false;
  }
};
</script>

<template>
  <div
    class="flex h-[100dvh] w-full items-center justify-center bg-bg-dark px-4"
  >
    <div
      class="w-full max-w-md bg-bg-chat rounded-2xl shadow-xl border border-border p-8"
    >
      <div class="text-center mb-8">
        <div
          class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <svg
            class="w-8 h-8 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-text-main">Agent Login</h1>
        <p class="text-text-muted mt-2">Sign in to manage support chats</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div
          v-if="errorMsg"
          class="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg flex items-center gap-2"
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
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{{ errorMsg }}</span>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1"
              >Email</label
            >
            <input
              v-model="email"
              type="email"
              class="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-main focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-text-muted/50"
              placeholder="agent@support.com"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1"
              >Password</label
            >
            <input
              v-model="password"
              type="password"
              class="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 text-text-main focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-text-muted/50"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          :disabled="authLoading"
          class="w-full bg-primary hover:bg-primary-hover text-white rounded-xl px-4 py-3 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <svg
            v-if="authLoading"
            class="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
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
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span v-else>Sign In</span>
        </button>
      </form>
    </div>
  </div>
</template>
