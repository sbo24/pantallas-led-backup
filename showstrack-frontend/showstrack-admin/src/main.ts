import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Async initialization function
async function initializeApp() {
  const app = createApp(App)
  
  app.use(createPinia())
  
  // Initialize auth store BEFORE router
  const { useAuthStore } = await import('./stores/auth')
  const authStore = useAuthStore()
  
  // Initialize auth state from localStorage before routing
  await authStore.initializeAuth()
  
  app.use(router)
  app.mount('#app')
}

// Start the app
initializeApp().catch(console.error)
