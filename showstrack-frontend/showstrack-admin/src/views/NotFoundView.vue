<script setup lang="ts">
// NotFoundView - Página no encontrada (404)
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full text-center">
      <div class="mb-8">
        <h1 class="text-9xl font-bold text-indigo-600">404</h1>
      </div>

      <h2 class="text-3xl font-bold text-gray-900 mb-4">Página no encontrada</h2>
      <p class="text-gray-600 mb-8">
        Lo sentimos, la página que estás buscando no existe.
      </p>

      <div class="space-y-4">
        <router-link
          to="/"
          class="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Ir al Inicio
        </router-link>

        <div>
          <button
            @click="$router.go(-1)"
            class="text-indigo-600 hover:text-indigo-500 text-sm"
          >
            ← Volver atrás
          </button>
        </div>
      </div>
    </div>
  </div>
</template>