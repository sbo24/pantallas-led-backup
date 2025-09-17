<template>
  <div class="flex flex-1 flex-col bg-white border-r border-gray-200">
    <!-- Logo area -->
    <div class="flex h-16 flex-shrink-0 items-center px-4 bg-indigo-600">
      <h1 class="text-xl font-bold text-white">ShowsTrack</h1>
    </div>

    <!-- Navigation -->
    <nav class="mt-6 flex-1 space-y-2 px-3">
      <!-- Dashboard -->
      <router-link
        to="/dashboard"
        class="group flex items-center px-3 py-2.5 text-sm font-medium rounded-md"
        :class="isCurrentRoute('/dashboard') ? activeClasses : inactiveClasses"
      >
        <HomeIcon class="mr-3 h-5 w-5 flex-shrink-0" />
        Dashboard
      </router-link>

      <!-- Shows Section -->
      <Disclosure as="div" class="space-y-1" v-slot="{ open }">
        <DisclosureButton
          class="group w-full flex items-center pl-3 pr-2 py-2.5 text-left text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          :class="isCurrentRoute('/shows') || isCurrentRoute('/events') ? activeClasses : inactiveClasses"
        >
          <PlayIcon class="mr-3 h-5 w-5 flex-shrink-0" />
          <span class="flex-1">Espectáculos</span>
          <ChevronRightIcon
            class="ml-2 h-4 w-4 flex-shrink-0 transform group-hover:text-gray-400 transition-colors ease-in-out duration-150"
            :class="open ? 'rotate-90' : ''"
          />
        </DisclosureButton>
        <DisclosurePanel class="space-y-2 mt-2">
          <router-link
            to="/shows"
            class="group w-full flex items-center pl-12 pr-3 py-2 text-sm font-medium rounded-md"
            :class="isCurrentRoute('/shows') ? activeClasses : inactiveClasses"
          >
            Gestión de Shows
          </router-link>
          <router-link
            to="/events"
            class="group w-full flex items-center pl-12 pr-3 py-2 text-sm font-medium rounded-md"
            :class="isCurrentRoute('/events') ? activeClasses : inactiveClasses"
          >
            Eventos y Horarios
          </router-link>
        </DisclosurePanel>
      </Disclosure>

      <!-- Alerts -->
      <router-link
        to="/alerts"
        class="group flex items-center px-3 py-2.5 text-sm font-medium rounded-md"
        :class="isCurrentRoute('/alerts') ? activeClasses : inactiveClasses"
      >
        <ExclamationTriangleIcon class="mr-3 h-5 w-5 flex-shrink-0" />
        <span class="flex-1">Centro de Alertas</span>
        <span 
          v-if="alertsStore.unreadCount > 0"
          class="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800"
        >
          {{ alertsStore.unreadCount }}
        </span>
      </router-link>

      <!-- Operator View -->
      <router-link
        to="/operator"
        class="group flex items-center px-3 py-2.5 text-sm font-medium rounded-md"
        :class="isCurrentRoute('/operator') ? activeClasses : inactiveClasses"
      >
        <ComputerDesktopIcon class="mr-3 h-5 w-5 flex-shrink-0" />
        Vista de Operador
      </router-link>

      <!-- Settings -->
      <router-link
        to="/settings"
        class="group flex items-center px-3 py-2.5 text-sm font-medium rounded-md"
        :class="isCurrentRoute('/settings') ? activeClasses : inactiveClasses"
      >
        <Cog6ToothIcon class="mr-3 h-5 w-5 flex-shrink-0" />
        Configuración
      </router-link>
    </nav>

    <!-- User info at bottom -->
    <div class="flex-shrink-0 border-t border-gray-200">
      <div class="p-4">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center">
              <UserIcon class="h-4 w-4 text-white" />
            </div>
          </div>
          <div class="ml-4 min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900 truncate">
              {{ authStore.user?.username || 'Usuario' }}
            </p>
            <p class="text-xs text-gray-500 truncate">
              {{ authStore.user?.roles?.[0] || 'admin' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// import { computed } from 'vue' // No usado por ahora
import { useRoute } from 'vue-router'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import {
  HomeIcon,
  PlayIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  UserIcon,
  ChevronRightIcon,
  ComputerDesktopIcon
} from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/stores/auth'
import { useAlertsStore } from '@/stores/alerts'

defineEmits<{
  closeSidebar: []
}>()

const route = useRoute()
const authStore = useAuthStore()
const alertsStore = useAlertsStore()

// Check if current route matches
const isCurrentRoute = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}

// CSS classes for active and inactive states
const activeClasses = 'bg-indigo-100 text-indigo-900'
const inactiveClasses = 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
</script>