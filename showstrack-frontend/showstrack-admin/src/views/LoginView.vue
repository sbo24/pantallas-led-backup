<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// Reactive form data
const formData = ref({
  username: '',
  password: ''
})

const isLoading = ref(false)
const errorMessage = ref('')

const handleLogin = async (event: Event) => {
  event.preventDefault()
  
  if (!formData.value.username || !formData.value.password) {
    errorMessage.value = 'Por favor ingresa usuario y contraseña'
    return
  }
  
  try {
    isLoading.value = true
    errorMessage.value = ''
    
    const success = await authStore.login({
      username: formData.value.username,
      password: formData.value.password
    })
    
    if (success) {
      // Redirect to dashboard on successful login
      router.push('/dashboard')
    } else {
      errorMessage.value = authStore.error || 'Error al iniciar sesión'
    }
  } catch (error) {
    errorMessage.value = 'Error de conexión. Verifica que el servidor esté funcionando.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          ShowsTrack Admin
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Iniciar sesión en el panel de administración
        </p>
      </div>
      <form @submit="handleLogin" class="mt-8 space-y-6">
        <!-- Error message display -->
        <div v-if="errorMessage" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {{ errorMessage }}
        </div>

        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="username" class="sr-only">Usuario</label>
            <input 
              id="username" 
              v-model="formData.username"
              name="username" 
              type="text" 
              required 
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
              placeholder="Usuario"
            />
          </div>
          <div>
            <label for="password" class="sr-only">Contraseña</label>
            <input 
              id="password" 
              v-model="formData.password"
              name="password" 
              type="password" 
              required 
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
              placeholder="Contraseña"
            />
          </div>
        </div>

        <div>
          <button 
            type="submit" 
            :disabled="isLoading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isLoading">Iniciando sesión...</span>
            <span v-else>Iniciar Sesión</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>