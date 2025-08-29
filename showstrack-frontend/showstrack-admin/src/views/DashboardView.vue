<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAlertsStore } from '@/stores/alerts'
import { useDashboardStore } from '@/stores/dashboard'
import { useAuthStore } from '@/stores/auth'
import { useShowsStore } from '@/stores/shows'
import { useEventsStore } from '@/stores/events'

// Stores
const alertsStore = useAlertsStore()
const dashboardStore = useDashboardStore()
const authStore = useAuthStore()
const showsStore = useShowsStore()
const eventsStore = useEventsStore()

// Computed properties
const activeShowsCount = computed(() => 
  (showsStore.shows || []).filter(show => show.is_visible).length
)

const todayEventsCount = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return (eventsStore.events || []).filter(event => 
    event.event_date === today
  ).length
})

const activeAlertsCount = computed(() => {
  return alertsStore.activeAlert ? 1 : 0
})

const activeOverridesCount = computed(() => {
  return (eventsStore.events || []).filter(event => 
    event.override && (event.calculated_status === 'CANCELADO' || event.calculated_status === 'CERRADO')
  ).length
})

interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'error'
  message?: string
}
// System health state
const systemHealth = ref<SystemHealth | null>(null)

// Cargar datos reales al montar el componente
onMounted(async () => {
  // Inicializar autenticación (cargar desde localStorage si existe)
  await authStore.initializeAuth()
  
  // Cargar shows para calcular shows activos
  await showsStore.fetchShows()
  
  // Cargar eventos para calcular eventos de hoy
  await eventsStore.fetchEvents()
  
  // Cargar alertas para calcular alertas activas
  await alertsStore.fetchActiveAlerts()
  
  // Cargar estado del sistema
  await fetchSystemHealth()
})

const fetchSystemHealth = async () => {
  try {
    const apiUrl = import.meta.env.VITE_SHOWSTRACK_API_URL
    if (!apiUrl) {
      console.error('VITE_SHOWSTRACK_API_URL is not defined')
      systemHealth.value = { status: 'error', message: 'API URL not configured' }
      return
    }
    const response = await fetch(`${apiUrl}/health`)
    systemHealth.value = await response.json()
  } catch (error) {
    console.error('Error fetching system health:', error)
    systemHealth.value = { status: 'error' }
  }
}
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p class="mt-2 text-sm text-gray-600 leading-relaxed">Panel de control principal de ShowsTrack</p>
    </div>

    <!-- Métricas rápidas -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 xl:gap-10" style="margin: 25px 0;">
      <div class="bg-white overflow-hidden shadow-sm rounded-xl border">
        <div class="p-6 lg:p-8">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                <span class="text-white text-sm font-semibold">S</span>
              </div>
            </div>
            <div class="w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Shows Activos</dt>
                <dd class="text-xl font-semibold text-gray-900">
                  {{ activeShowsCount }}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white overflow-hidden shadow-sm rounded-xl border">
        <div class="p-6 lg:p-8">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <span class="text-white text-sm font-semibold">E</span>
              </div>
            </div>
            <div class="w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Eventos Hoy</dt>
                <dd class="text-xl font-semibold text-gray-900">
                  {{ todayEventsCount }}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white overflow-hidden shadow-sm rounded-xl border">
        <div class="p-6 lg:p-8">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                <span class="text-white text-sm font-semibold">A</span>
              </div>
            </div>
            <div class="w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Alertas</dt>
                <dd class="text-xl font-semibold text-gray-900">
                  {{ activeAlertsCount }}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white overflow-hidden shadow-sm rounded-xl border">
        <div class="p-6 lg:p-8">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                <span class="text-white text-sm font-semibold">O</span>
              </div>
            </div>
            <div class="w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Overrides</dt>
                <dd class="text-xl font-semibold text-gray-900">{{ activeOverridesCount }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Estado del sistema -->
    <div class="bg-white shadow-sm rounded-xl border" style="margin: 25px 0;">
      <div class="p-6 lg:p-8 space-y-6">
        <h3 class="text-lg font-semibold text-gray-900">Estado del Sistema</h3>
        <div class="flex items-center gap-3">
          <div class="flex-shrink-0">
            <div 
              class="w-3 h-3 rounded-full"
              :class="{
                'bg-green-400': systemHealth?.status === 'healthy',
                'bg-red-400': systemHealth?.status === 'unhealthy' || systemHealth?.status === 'error',
                'bg-gray-400': !systemHealth
              }"
            ></div>
          </div>
          <div>
            <p class="text-sm text-gray-600">
              <template v-if="!systemHealth">
                Cargando estado del sistema...
              </template>
              <template v-else-if="systemHealth.status === 'healthy'">
                Sistema operativo - Todos los servicios funcionando correctamente
              </template>
              <template v-else>
                Sistema con problemas - Revisar servicios
              </template>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>