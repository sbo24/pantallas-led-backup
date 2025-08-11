<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppLayout from './components/AppLayout.vue'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const authStore = useAuthStore()

// Routes that don't need the layout (login, etc.)
const routesWithoutLayout = ['/login', '/unauthorized', '/404']

const showLayout = computed(() => {
  // For development testing - show layout for all routes except login-specific ones
  return !routesWithoutLayout.includes(route.path)
  // TODO: Restore auth check when ready: && authStore.isAuthenticated
})

// Initialize auth check on app mount
onMounted(() => {
  // authStore.checkAuth() // TODO: Enable when not using mock data
})
</script>

<template>
  <div id="app">
    <!-- Show layout for authenticated routes -->
    <AppLayout v-if="showLayout">
      <RouterView />
    </AppLayout>
    
    <!-- Show router view directly for non-layout routes -->
    <RouterView v-else />
  </div>
</template>

<style>
/* Global styles */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
}
</style>
