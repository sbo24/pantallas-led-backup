<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Mobile sidebar overlay -->
    <div 
      v-if="sidebarOpen" 
      class="fixed inset-0 z-40 flex md:hidden"
    >
      <div 
        class="fixed inset-0 bg-gray-600 bg-opacity-75" 
        @click="sidebarOpen = false"
      ></div>
      
      <div class="relative flex w-full max-w-xs flex-1 flex-col bg-white">
        <div class="absolute top-0 right-0 -mr-12 pt-2">
          <button
            type="button"
            class="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            @click="sidebarOpen = false"
          >
            <XMarkIcon class="h-6 w-6 text-white" />
          </button>
        </div>
        <AppSidebar @close-sidebar="sidebarOpen = false" />
      </div>
    </div>

    <!-- Static sidebar for desktop -->
    <div class="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
      <AppSidebar />
    </div>

    <!-- Main content area -->
    <div class="flex flex-1 flex-col md:pl-64">
      <!-- Top header -->
      <AppHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" />

      <!-- Main content -->
      <main class="flex-1">
        <div class="py-6">
          <div class="w-full px-4 sm:px-6 lg:px-8 space-y-8 lg:space-y-10">
            <slot />
          </div>
        </div>
      </main>
    </div>

    <!-- Toast notifications container -->
    <AppToastContainer />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import AppToastContainer from './AppToastContainer.vue'

// Mobile sidebar state
const sidebarOpen = ref(false)
</script>