<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon
} from '@heroicons/vue/24/outline'
import BaseButton from '@/components/BaseButton.vue'
import BaseModal from '@/components/BaseModal.vue'
import { useAlertsStore } from '@/stores/alerts'
import { useDashboardStore } from '@/stores/dashboard'
import { useAuthStore } from '@/stores/auth'

// Stores
const alertsStore = useAlertsStore()
const dashboardStore = useDashboardStore()
const authStore = useAuthStore()

// Modal state
const isModalOpen = ref(false)
const isConfirmModalOpen = ref(false)
const isLoading = ref(false)

// Demo functions
const openModal = () => {
  isModalOpen.value = true
}

const openConfirmModal = () => {
  isConfirmModalOpen.value = true
}

const handleConfirm = async () => {
  isLoading.value = true
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 2000))
  isLoading.value = false
  isConfirmModalOpen.value = false
  
  // Show toast notification
  // @ts-ignore
  window.showToast?.success('Operación completada', 'La acción se realizó correctamente')
}

const handleCancel = () => {
  isConfirmModalOpen.value = false
}

const closeModal = () => {
  isModalOpen.value = false
}

// Cargar datos reales al montar el componente
onMounted(async () => {
  // Inicializar autenticación (cargar desde localStorage si existe)
  await authStore.initializeAuth()
  
  // Cargar métricas del dashboard
  await dashboardStore.fetchDashboardMetrics()
  await dashboardStore.fetchSystemHealth()
  
  // Cargar alertas activas
  await alertsStore.fetchActiveAlerts()
})
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
                  <span v-if="dashboardStore.isLoading">...</span>
                  <span v-else>{{ dashboardStore.metrics?.activeShows || 0 }}</span>
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
                  <span v-if="dashboardStore.isLoading">...</span>
                  <span v-else>{{ dashboardStore.metrics?.todayEvents || 0 }}</span>
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
                  <span v-if="alertsStore.isLoading">...</span>
                  <span v-else>{{ alertsStore.unreadCount }}</span>
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
                <dd class="text-xl font-semibold text-gray-900">{{ dashboardStore.metrics?.activeOverrides || 0 }}</dd>
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
                'bg-green-400': dashboardStore.systemHealth?.database === 'healthy' && 
                               dashboardStore.systemHealth?.apiResponse === 'healthy',
                'bg-yellow-400': dashboardStore.systemHealth?.database === 'warning' || 
                                dashboardStore.systemHealth?.apiResponse === 'warning',
                'bg-red-400': dashboardStore.systemHealth?.database === 'error' || 
                             dashboardStore.systemHealth?.apiResponse === 'error',
                'bg-gray-400': !dashboardStore.systemHealth
              }"
            ></div>
          </div>
          <div>
            <p class="text-sm text-gray-600">
              <template v-if="!dashboardStore.systemHealth">
                Cargando estado del sistema...
              </template>
              <template v-else-if="dashboardStore.systemHealth.database === 'healthy' && 
                                   dashboardStore.systemHealth.apiResponse === 'healthy'">
                Sistema operativo - Todos los servicios funcionando correctamente
              </template>
              <template v-else-if="dashboardStore.systemHealth.database === 'error' || 
                                   dashboardStore.systemHealth.apiResponse === 'error'">
                Sistema con errores - Revisar conexiones de base de datos y API
              </template>
              <template v-else>
                Sistema en advertencia - Algunos servicios requieren atención
              </template>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Demo de Componentes Base -->
    <div class="bg-white shadow-sm rounded-xl border" style="margin: 25px 0;">
      <div class="p-6 lg:p-8 space-y-6">
        <h3 class="text-lg font-semibold text-gray-900">Demo - Componentes Base</h3>
        <p class="text-sm text-gray-600 leading-relaxed">Ejemplos de BaseButton y BaseModal funcionando</p>
        
        <!-- Botones de ejemplo -->
        <div>
          <div class="flex flex-wrap gap-x-5 gap-y-4 items-center" style="margin: 20px 0;">
            <BaseButton variant="primary" :left-icon="PlusIcon">
              Crear Nuevo
            </BaseButton>
            
            <BaseButton variant="secondary" @click="openModal">
              Abrir Modal
            </BaseButton>
            
            <BaseButton variant="danger" :left-icon="ExclamationTriangleIcon" @click="openConfirmModal">
              Acción Crítica
            </BaseButton>
            
            <BaseButton variant="success" :left-icon="CheckCircleIcon">
              Confirmar
            </BaseButton>
            
            <BaseButton variant="ghost" size="sm">
              Ghost Button
            </BaseButton>
            
            <BaseButton variant="link">
              Enlace
            </BaseButton>
          </div>

          <!-- Botones con estados -->
          <div class="flex flex-wrap gap-x-5 gap-y-4 items-center" style="margin: 20px 0;">
            <BaseButton variant="primary" loading>
              Cargando...
            </BaseButton>
            
            <BaseButton variant="secondary" disabled>
              Deshabilitado
            </BaseButton>
            
            <BaseButton variant="primary" size="xs">
              Extra Small
            </BaseButton>
            
            <BaseButton variant="primary" size="lg" block>
              Botón de Bloque
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal básico -->
    <BaseModal
      :is-open="isModalOpen"
      title="Modal de Ejemplo"
      size="md"
      @close="closeModal"
    >
      <p class="mb-4">
        Este es un ejemplo de BaseModal. Puedes poner cualquier contenido aquí.
      </p>
      <p>
        El modal incluye transiciones suaves y se puede cerrar haciendo clic fuera 
        del contenido o presionando la X.
      </p>
      
      <template #footer>
        <div class="flex space-x-3">
          <BaseButton variant="secondary" @click="closeModal">
            Cerrar
          </BaseButton>
          <BaseButton variant="primary" @click="closeModal">
            Entendido
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Modal de confirmación -->
    <BaseModal
      :is-open="isConfirmModalOpen"
      title="¿Estás seguro?"
      :icon="ExclamationTriangleIcon"
      variant="danger"
      size="sm"
      show-default-actions
      confirm-text="Sí, continuar"
      cancel-text="Cancelar"
      confirm-variant="danger"
      :loading="isLoading"
      @close="handleCancel"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    >
      <p>
        Esta acción no se puede deshacer. ¿Estás seguro de que quieres continuar?
      </p>
    </BaseModal>
  </div>
</template>