<script setup lang="ts">
// UnauthorizedView - Página de acceso denegado
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full text-center">
      <div class="mb-8">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636A9 9 0 015.636 18.364m12.728 0A9 9 0 015.636 5.636" />
          </svg>
        </div>
      </div>
      
      <h1 class="text-3xl font-bold text-gray-900 mb-4">Acceso Denegado</h1>
      <p class="text-gray-600 mb-8">
        No tienes permisos para acceder a esta página.
      </p>
      
      <router-link 
        to="/dashboard" 
        class="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
      >
        Volver al Dashboard
      </router-link>
    </div>
  </div>
</template>