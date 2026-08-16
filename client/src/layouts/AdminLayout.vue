<template>
  <div class="min-h-screen bg-gray-50/60 font-sans text-gray-900 antialiased selection:bg-blue-500 selection:text-white flex flex-col">
    <!-- Backpack Top Navigation Header -->
    <AdminHeader />

    <!-- Main View Content Area -->
    <main class="flex-1">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import AdminHeader from '../components/admin/AdminHeader.vue';
</script>
