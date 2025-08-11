import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Initialize auth store
import { useAuthStore } from './stores/auth'

// Wait for app to be mounted before initializing auth
app.mount('#app')

// Initialize authentication after mount
const authStore = useAuthStore()
authStore.initializeAuth()
