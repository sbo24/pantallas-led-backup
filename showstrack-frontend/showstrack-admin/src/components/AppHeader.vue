<template>
  <div class="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white shadow-sm border-b border-gray-200">
    <!-- Mobile menu button -->
    <button
      type="button"
      class="border-r border-gray-200 px-4 text-gray-500 hover:text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors duration-200 md:hidden"
      @click="$emit('toggleSidebar')"
    >
      <Bars3Icon class="h-6 w-6" />
    </button>

    <!-- Header content -->
    <div class="flex flex-1 justify-between items-center px-4 sm:px-6 lg:px-8">
      <!-- Page title -->
      <div class="flex flex-1 items-center">
        <h1 class="text-lg font-semibold text-gray-900">
          {{ pageTitle }}
        </h1>
      </div>

      <!-- Header actions -->
      <div class="ml-4 flex items-center space-x-3">
        <!-- Refresh button -->
        <button
          type="button"
          class="rounded-full bg-white p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
          @click="handleRefresh"
          :disabled="isRefreshing"
        >
          <ArrowPathIcon 
            class="h-5 w-5"
            :class="{ 'animate-spin': isRefreshing }"
          />
        </button>

        <!-- Notifications dropdown -->
        <Menu as="div" class="relative">
          <MenuButton class="relative rounded-full bg-white p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200">
            <BellIcon class="h-5 w-5" />
            <!-- Notification badge -->
            <span 
              v-if="alertsStore.unreadCount > 0"
              class="absolute -top-0.5 -right-0.5 block h-4 w-4 rounded-full bg-red-500 text-xs font-bold text-white flex items-center justify-center"
            >
              {{ alertsStore.unreadCount > 9 ? '9+' : alertsStore.unreadCount }}
            </span>
          </MenuButton>

          <transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
          >
            <MenuItems class="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div class="px-4 py-2 border-b border-gray-200">
                <h3 class="text-sm font-semibold text-gray-900">Notificaciones</h3>
              </div>
              
              <!-- Recent alerts preview -->
              <div class="max-h-64 overflow-y-auto">
                <MenuItem 
                  v-for="alert in recentAlerts" 
                  :key="alert.id"
                  v-slot="{ active }"
                >
                  <div
                    class="px-4 py-3 text-sm border-b border-gray-100 last:border-b-0"
                    :class="active ? 'bg-gray-50' : ''"
                  >
                    <div class="flex items-start">
                      <div 
                        class="flex-shrink-0 w-2 h-2 mt-2 rounded-full"
                        :class="{
                          'bg-red-400': alert.priority === 'critical',
                          'bg-yellow-400': alert.priority === 'high',  
                          'bg-blue-400': alert.priority === 'medium',
                          'bg-gray-400': alert.priority === 'low'
                        }"
                      ></div>
                      <div class="ml-3 flex-1">
                        <p class="text-gray-900 font-medium">{{ alert.title }}</p>
                        <p class="text-gray-600 text-xs mt-1">{{ formatTime(alert.createdAt) }}</p>
                      </div>
                    </div>
                  </div>
                </MenuItem>
                
                <div v-if="recentAlerts.length === 0" class="px-4 py-6 text-center text-gray-500 text-sm">
                  No hay notificaciones recientes
                </div>
              </div>
              
              <div class="px-4 py-2 border-t border-gray-200">
                <router-link 
                  to="/alerts"
                  class="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                >
                  Ver todas las alertas
                </router-link>
              </div>
            </MenuItems>
          </transition>
        </Menu>

        <!-- User dropdown -->
        <Menu as="div" class="relative">
          <MenuButton class="flex max-w-xs items-center rounded-full bg-white text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200 p-1">
            <div class="h-7 w-7 rounded-full bg-indigo-500 flex items-center justify-center">
              <UserIcon class="h-4 w-4 text-white" />
            </div>
          </MenuButton>

          <transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
          >
            <MenuItems class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <MenuItem v-slot="{ active }">
                <div 
                  class="px-4 py-2 text-sm border-b border-gray-100"
                  :class="active ? 'bg-gray-50' : ''"
                >
                  <p class="font-medium text-gray-900">{{ authStore.user?.username }}</p>
                  <p class="text-gray-600 text-xs">{{ authStore.user?.roles?.[0] || 'user' }}</p>
                </div>
              </MenuItem>
              
              <MenuItem v-slot="{ active }">
                <router-link
                  to="/settings"
                  class="block px-4 py-2 text-sm text-gray-700"
                  :class="active ? 'bg-gray-100' : ''"
                >
                  Configuración
                </router-link>
              </MenuItem>
              
              <MenuItem v-slot="{ active }">
                <button
                  @click="handleLogout"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700"
                  :class="active ? 'bg-gray-100' : ''"
                >
                  Cerrar Sesión
                </button>
              </MenuItem>
            </MenuItems>
          </transition>
        </Menu>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import {
  Bars3Icon,
  BellIcon,
  UserIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/stores/auth'
import { useAlertsStore } from '@/stores/alerts'
import { useDashboardStore } from '@/stores/dashboard'

defineEmits<{
  toggleSidebar: []
}>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const alertsStore = useAlertsStore()
const dashboardStore = useDashboardStore()

const isRefreshing = ref(false)

// Page title mapping
const pageTitleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/shows': 'Gestión de Shows',
  '/events': 'Eventos y Horarios',
  '/alerts': 'Centro de Alertas',
  '/settings': 'Configuración'
}

const pageTitle = computed(() => {
  return pageTitleMap[route.path] || 'ShowsTrack Admin'
})

// Recent alerts for notifications dropdown
const recentAlerts = computed(() => {
  return alertsStore.alerts.slice(0, 5)
})

// Handle refresh action
const handleRefresh = async () => {
  if (isRefreshing.value) return
  
  isRefreshing.value = true
  try {
    // Refresh data based on current page
    if (route.path === '/dashboard') {
      // await dashboardStore.fetchDashboardData() // TODO: Enable when not using mock data
    } else if (route.path === '/alerts') {
      // await alertsStore.fetchAlerts() // TODO: Enable when not using mock data  
    }
    // Add more refresh logic as needed
  } catch (error) {
    console.error('Error refreshing data:', error)
  } finally {
    isRefreshing.value = false
  }
}

// Handle logout
const handleLogout = async () => {
  try {
    await authStore.logout()
    router.push('/login')
  } catch (error) {
    console.error('Error during logout:', error)
  }
}

// Format time for notifications
const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Hace un momento'
  } else if (diffInSeconds < 3600) {
    return `Hace ${Math.floor(diffInSeconds / 60)} min`
  } else if (diffInSeconds < 86400) {
    return `Hace ${Math.floor(diffInSeconds / 3600)} h`
  } else {
    return date.toLocaleDateString()
  }
}
</script>