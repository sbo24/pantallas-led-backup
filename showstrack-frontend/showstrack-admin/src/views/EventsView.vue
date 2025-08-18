<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useNotifications } from '@/composables'
import { useAuthStore } from '@/stores/auth'
import BaseButton from '@/components/BaseButton.vue'
import BaseTable from '@/components/BaseTable.vue'
import type { TableColumn } from '@/components/BaseTable.vue'
import { ExclamationTriangleIcon, ClockIcon, CheckCircleIcon, EyeIcon } from '@heroicons/vue/24/outline'

// Composables y stores
const { showSuccessToast, showErrorToast, showWarningToast } = useNotifications()
const authStore = useAuthStore()

// Estado reactivo
const loading = ref(false)
const historyLoading = ref(false)
const syncInProgress = ref(false)
const eventsLoading = ref(false)
const operationMode = ref<'automatic' | 'manual'>('manual')
const pendingChanges = ref<any[]>([])
const importHistory = ref<any[]>([])
const todayEvents = ref<any[]>([])
const lastSyncTime = ref<string | null>(null)
const showOverrideModal = ref(false)
const selectedEvent = ref<any>(null)
const overrideReason = ref('')
const overrideStatus = ref<'CERRADO' | 'CANCELADO'>('CERRADO')
const showPreviewModal = ref(false)
const selectedChange = ref<any>(null)
let refreshInterval: NodeJS.Timeout | null = null
const selectedChanges = ref<Set<string>>(new Set())
const selectiveActionInProgress = ref(false)

// Computed properties
const hasPendingSync = computed(() => pendingChanges.value.length > 0)
const pendingChangesCount = computed(() => pendingChanges.value.length)
const selectedChangesCount = computed(() => selectedChanges.value.size)
const hasSelectedChanges = computed(() => selectedChanges.value.size > 0)
const allChangesSelected = computed(() => 
  pendingChanges.value.length > 0 && selectedChanges.value.size === pendingChanges.value.length
)

// Colonnes pour BaseTable - Historique d'importations
const importHistoryColumns: TableColumn[] = [
  {
    key: 'timestamp',
    label: 'Fecha/Hora',
    sortable: true
  },
  {
    key: 'source',
    label: 'Fuente',
    sortable: true
  },
  {
    key: 'eventsCount',
    label: 'Eventos',
    sortable: true,
    align: 'center'
  },
  {
    key: 'status',
    label: 'Estado',
    sortable: true,
    align: 'center'
  },
  {
    key: 'applied',
    label: 'Aplicados',
    sortable: true,
    align: 'center',
    formatter: (value: any, row: any) => {
      const applied = row.appliedCount || 0
      const total = row.eventsCount || 0
      const errors = row.errorCount || 0
      let result = `${applied} / ${total}`
      if (errors > 0) {
        result += ` (${errors} errores)`
      }
      return result
    }
  }
]

// Colonnes pour BaseTable - Eventos de Hoy
const eventsColumns: TableColumn[] = [
  {
    key: 'show.name',
    label: 'Espectáculo',
    sortable: true
  },
  {
    key: 'start_time',
    label: 'Hora',
    sortable: true,
    align: 'center'
  },
  {
    key: 'calculated_status',
    label: 'Estado',
    sortable: true,
    align: 'center'
  },
  {
    key: 'actions',
    label: 'Overrides',
    sortable: false,
    align: 'center'
  }
]

// Colonnes pour BaseTable - Cambios Pendientes
const pendingChangesColumns: TableColumn[] = [
  {
    key: 'select',
    label: '',
    sortable: false,
    align: 'center'
  },
  {
    key: 'type',
    label: 'Tipo',
    sortable: true,
    align: 'center'
  },
  {
    key: 'showName',
    label: 'Espectáculo',
    sortable: true
  },
  {
    key: 'eventDate',
    label: 'Fecha',
    sortable: true,
    align: 'center'
  },
  {
    key: 'startTime',
    label: 'Hora',
    sortable: true,
    align: 'center'
  },
  {
    key: 'description',
    label: 'Descripción',
    sortable: false
  },
  {
    key: 'preview',
    label: 'Preview',
    sortable: false,
    align: 'center'
  }
]

// API Base URL
const API_BASE_URL = 'http://localhost:8000'

// Helper para headers con JWT
const getAuthHeaders = () => {
  const token = authStore.tokens?.accessToken
  
  if (!token) {
    throw new Error('No authentication token available')
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

// API calls reales
const fetchOperationMode = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/config/operation-mode`, {
      headers: getAuthHeaders()
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    operationMode.value = data.current_mode
    
    if (data.last_changed_at) {
      lastSyncTime.value = new Date(data.last_changed_at).toLocaleString()
    }
  } catch (error) {
    console.error('Error fetching operation mode:', error)
    showErrorToast('Error al obtener modo de operación')
  }
}

const fetchPendingChanges = async () => {
  loading.value = true
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/sync/pending?limit=50`, {
      headers: getAuthHeaders()
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Transformar datos de la API al formato esperado por la UI
    pendingChanges.value = data.pending_changes?.map((change: any) => {
      
      // Extraer información del cambio
      const changeType = change.action?.toUpperCase() || 'CREATE'
      const entityType = change.entity_type || 'event'
      const externalId = change.external_id || change.entity_id || 'unknown'
      
      // Los datos están en new_data según la API
      const eventData = change.new_data || {}
      const showName = eventData.show_name || 'Show desconocido'
      const eventDate = eventData.event_date || new Date().toISOString().split('T')[0]
      const startTime = eventData.start_time || '00:00'
      
      // Crear descripción más informativa
      let description = `${entityType}`
      if (showName !== 'Show desconocido') {
        description += `: ${showName}`
      }
      if (startTime !== '00:00') {
        description += ` - ${startTime}`
      }
      if (showName === 'Show desconocido') {
        description += ` (ID: ${externalId})`
      }
      
      return {
        id: change.change_id || change.id,
        type: changeType,
        description: description,
        showName: showName,
        eventDate: eventDate,
        startTime: startTime
      }
    }) || []
    
    // Limpiar selección si no hay cambios O si los IDs han cambiado
    if (pendingChanges.value.length === 0) {
      selectedChanges.value.clear()
    } else {
      // Filtrar IDs que ya no existen en los nuevos cambios
      const currentIds = new Set(pendingChanges.value.map(change => change.id))
      const validSelectedIds = Array.from(selectedChanges.value).filter(id => currentIds.has(id))
      selectedChanges.value.clear()
      validSelectedIds.forEach(id => selectedChanges.value.add(id))
    }
    
  } catch (error) {
    showErrorToast('Error al cargar cambios pendientes')
    pendingChanges.value = []
  } finally {
    loading.value = false
  }
}

const fetchImportHistory = async () => {
  historyLoading.value = true
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/import/history?page=1&size=10`, {
      headers: getAuthHeaders()
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Transformar datos de la API al formato esperado por la UI
    importHistory.value = data.items?.map((import_: any) => {
      
      // Gestión segura de fechas - múltiples formatos
      let timestamp = 'Fecha no disponible'
      
      const dateFields = ['import_timestamp', 'created_at', 'timestamp', 'import_date', 'date']
      
      for (const field of dateFields) {
        if (import_[field]) {
          try {
            const dateValue = import_[field]
            
            // Si c'est déjà une string de date formatée
            if (typeof dateValue === 'string' && dateValue.includes('/')) {
              timestamp = dateValue
              break
            }
            
            // Parser les formats ISO (2025-08-15T09:40:00.448594)
            const date = new Date(dateValue)
            if (!isNaN(date.getTime())) {
              timestamp = date.toLocaleString('es-ES', {
                year: 'numeric',
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })
              break
            }
          } catch (e) {
            // Silently continue to next field
          }
        }
      }
      
      // Mapeo de status
      let status = 'COMPLETED'
      if (import_.status) {
        status = import_.status.toUpperCase()
      }
      
      return {
        id: import_.id,
        timestamp: timestamp,
        source: import_.source || 'puy_du_fou_api',
        eventsCount: import_.total_events || 0,
        status: status,
        appliedCount: import_.applied_events || import_.successful_events || 0,
        errorCount: import_.failed_events || import_.error_count || 0
      }
    }) || []
    
    // Obtener última sincronización exitosa
    const lastSuccessful = importHistory.value.find(imp => 
      imp.status === 'SUCCESS' || imp.status === 'COMPLETED'
    )
    if (lastSuccessful && !lastSyncTime.value) {
      lastSyncTime.value = lastSuccessful.timestamp
    }
    
  } catch (error) {
    showErrorToast('Error al cargar historial de importaciones')
    importHistory.value = []
  } finally {
    historyLoading.value = false
  }
}

const executeSyncManual = async () => {
  if (!hasPendingSync.value) {
    showWarningToast('No hay cambios pendientes para sincronizar')
    return
  }
  
  syncInProgress.value = true
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/sync/execute`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        force: false,
        reason: 'Sincronización manual desde EventsView'
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    const appliedCount = result.changes_applied || 0
    const skippedCount = result.changes_skipped || 0
    const failedCount = result.changes_failed || 0
    
    if (appliedCount > 0) {
      showSuccessToast(`Sincronización completada: ${appliedCount} aplicados`)
    } else if (skippedCount > 0) {
      showWarningToast(`${skippedCount} cambios omitidos (duplicados detectados)`)
    } else {
      showWarningToast('Sincronización completada sin cambios')
    }
    
    // Recargar datos
    await Promise.all([
      fetchPendingChanges(),
      fetchImportHistory()
    ])
  } catch (error) {
    showErrorToast('Error durante la sincronización')
  } finally {
    syncInProgress.value = false
  }
}

const cleanSkippedChanges = async () => {
  try {
    // Usar force: true para forzar la aplicación o limpieza
    const response = await fetch(`${API_BASE_URL}/api/admin/sync/execute`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        force: true,
        reason: 'Forzar limpieza de duplicados desde EventsView'
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    const appliedCount = result.changes_applied || 0
    const skippedCount = result.changes_skipped || 0
    
    if (appliedCount > 0) {
      showSuccessToast(`Forzado completado: ${appliedCount} aplicados`)
    } else if (skippedCount > 0) {
      showWarningToast(`${skippedCount} cambios aún omitidos. Problema persiste.`)
    } else {
      showSuccessToast('Todos los cambios fueron procesados')
    }
    
    await fetchPendingChanges()
  } catch (error) {
    showErrorToast('Error al forzar limpieza')
  }
}

const changeOperationMode = async (newMode: 'automatic' | 'manual') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/config/operation-mode`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        mode: newMode,
        reason: `Cambio manual desde panel admin`
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    operationMode.value = newMode
    showSuccessToast(`Modo cambiado a: ${newMode}`)
    
    // Si cambiamos a automático, ejecutar sync
    if (newMode === 'automatic' && hasPendingSync.value) {
      await executeSyncManual()
    }
  } catch (error) {
    showErrorToast('Error al cambiar modo de operación')
  }
}

const fetchTodayEvents = async () => {
  eventsLoading.value = true
  
  try {
    const today = new Date().toISOString().split('T')[0]
    const response = await fetch(`${API_BASE_URL}/api/admin/events?date_from=${today}&date_to=${today}&page=1&size=50`, {
      headers: getAuthHeaders()
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    todayEvents.value = data.items || []
    
  } catch (error) {
    showErrorToast('Error al cargar eventos de hoy')
    todayEvents.value = []
  } finally {
    eventsLoading.value = false
  }
}

const openOverrideModal = (event: any, status: 'CERRADO' | 'CANCELADO') => {
  selectedEvent.value = event
  overrideStatus.value = status
  overrideReason.value = ''
  showOverrideModal.value = true
}

const confirmOverride = async () => {
  if (!selectedEvent.value || overrideReason.value.length < 10) {
    showErrorToast('La razón debe tener al menos 10 caracteres')
    return
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/events/${selectedEvent.value.id}/override`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'create',
        status: overrideStatus.value,
        reason: overrideReason.value
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }))
      
      // Handle specific sequence error
      if (response.status === 500 && errorData.detail?.includes('duplicate key')) {
        showErrorToast('Error de sincronización de base de datos. Contacte al administrador para reiniciar la secuencia.')
      } else {
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
      }
      return
    }
    
    showSuccessToast(`Override ${overrideStatus.value} aplicado correctamente`)
    showOverrideModal.value = false
    await fetchTodayEvents()
    
  } catch (error) {
    console.error('Override error:', error)
    showErrorToast(`Error al aplicar override: ${error.message}`)
  }
}

// Función para mostrar preview detallado
const showChangePreview = (change: any) => {
  selectedChange.value = change
  showPreviewModal.value = true
}

// Auto-refresh function
const startAutoRefresh = () => {
  refreshInterval = setInterval(async () => {
    try {
      await Promise.all([
        fetchPendingChanges(),
        fetchTodayEvents()
      ])
    } catch (error) {
      console.error('Auto-refresh error:', error)
    }
  }, 30000) // 30 segundos
}

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

// Funciones de selección
const toggleChangeSelection = (changeId: string) => {
  if (selectedChanges.value.has(changeId)) {
    selectedChanges.value.delete(changeId)
  } else {
    selectedChanges.value.add(changeId)
  }
}

const toggleAllChanges = () => {
  if (allChangesSelected.value) {
    selectedChanges.value.clear()
  } else {
    selectedChanges.value.clear()
    pendingChanges.value.forEach(change => {
      selectedChanges.value.add(change.id)
    })
  }
}

// Aplicar cambios seleccionados
const applySelectedChanges = async () => {
  if (!hasSelectedChanges.value) {
    showWarningToast('No hay cambios seleccionados')
    return
  }
  
  selectiveActionInProgress.value = true
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/sync/apply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        change_ids: Array.from(selectedChanges.value),
        reason: `Aplicación selectiva de ${selectedChanges.value.size} cambios desde EventsView`
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    const appliedCount = result.applied_count || 0
    
    showSuccessToast(`${appliedCount} cambios aplicados exitosamente`)
    selectedChanges.value.clear()
    
    // Recargar datos
    await Promise.all([
      fetchPendingChanges(),
      fetchImportHistory()
    ])
  } catch (error) {
    showErrorToast('Error al aplicar cambios seleccionados')
  } finally {
    selectiveActionInProgress.value = false
  }
}

// Descartar cambios seleccionados
const discardSelectedChanges = async () => {
  if (!hasSelectedChanges.value) {
    showWarningToast('No hay cambios seleccionados')
    return
  }
  
  selectiveActionInProgress.value = true
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/sync/discard`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        change_ids: Array.from(selectedChanges.value),
        reason: `Descarte selectivo de ${selectedChanges.value.size} cambios desde EventsView`
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    const discardedCount = result.discarded_count || 0
    
    showSuccessToast(`${discardedCount} cambios descartados exitosamente`)
    selectedChanges.value.clear()
    
    // Recargar datos
    await fetchPendingChanges()
  } catch (error) {
    showErrorToast('Error al descartar cambios seleccionados')
  } finally {
    selectiveActionInProgress.value = false
  }
}

// Cargar datos al montar el componente
onMounted(async () => {
  await Promise.all([
    fetchOperationMode(),
    fetchPendingChanges(),
    fetchImportHistory(),
    fetchTodayEvents()
  ])
  
  // Iniciar auto-refresh
  startAutoRefresh()
})

// Limpiar interval al desmontar
onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-7xl mx-auto space-y-8">
      <!-- Header -->
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900">Gestión de Eventos</h1>
        <p class="mt-2 text-lg text-gray-600">Sincronización y gestión de eventos del sistema</p>
      </div>

      <!-- Estado del Sistema - Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Modo de Operación -->
        <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div class="flex justify-between items-center">
            <div :class="[
              'w-4 h-4 rounded-full',
              operationMode === 'automatic' ? 'bg-green-500' : 'bg-yellow-500'
            ]"></div>
            <div class="text-right">
              <h3 class="text-lg font-semibold text-gray-900">Modo de Operación</h3>
              <p class="text-2xl font-bold capitalize" :class="[
                operationMode === 'automatic' ? 'text-green-600' : 'text-yellow-600'
              ]">{{ operationMode }}</p>
            </div>
          </div>
        </div>

        <!-- Cambios Pendientes -->
        <div class="bg-white rounded-xl shadow-lg p-6 border-l-4" :class="[
          hasPendingSync ? 'border-yellow-500' : 'border-gray-300'
        ]">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <ExclamationTriangleIcon :class="[
                'w-8 h-8',
                hasPendingSync ? 'text-yellow-500' : 'text-gray-400'
              ]" />
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-semibold text-gray-900">Cambios Pendientes</h3>
              <p class="text-2xl font-bold" :class="[
                hasPendingSync ? 'text-yellow-600' : 'text-gray-400'
              ]">{{ pendingChangesCount }}</p>
            </div>
          </div>
        </div>

        <!-- Última Sincronización -->
        <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-gray-300">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <ClockIcon class="w-8 h-8 text-gray-400" />
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-semibold text-gray-900">Última Sincronización</h3>
              <p class="text-sm font-medium text-gray-600">{{ lastSyncTime || 'Nunca' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Acciones -->
      <div class="bg-white rounded-xl shadow-lg p-6">
        <!-- Acciones Globales -->
        <div class="flex flex-wrap gap-4 justify-center mb-4">
          <BaseButton
            v-if="hasPendingSync"
            @click="executeSyncManual"
            :loading="syncInProgress"
            variant="primary"
            class="px-6 py-3 text-lg"
          >
            <CheckCircleIcon class="w-5 h-5 mr-2" />
            Aplicar Todos ({{ pendingChangesCount }})
          </BaseButton>
          
          <BaseButton
            @click="changeOperationMode(operationMode === 'automatic' ? 'manual' : 'automatic')"
            variant="outline"
            class="px-6 py-3"
          >
            Cambiar a {{ operationMode === 'automatic' ? 'Manual' : 'Automático' }}
          </BaseButton>
          
          <BaseButton
            v-if="hasPendingSync"
            @click="cleanSkippedChanges"
            variant="outline"
            class="px-6 py-3"
          >
            Forzar Aplicación
          </BaseButton>
        </div>
        
        <!-- Acciones Selectivas -->
        <div v-if="hasPendingSync" class="border-t pt-4">
          <div class="flex flex-wrap gap-3 justify-center">
            <BaseButton
              v-if="hasSelectedChanges"
              @click="applySelectedChanges"
              :loading="selectiveActionInProgress"
              variant="primary"
              size="sm"
              class="bg-green-600 hover:bg-green-700"
            >
              ✓ Aplicar Seleccionados ({{ selectedChangesCount }})
            </BaseButton>
            
            <BaseButton
              v-if="hasSelectedChanges"
              @click="discardSelectedChanges"
              :loading="selectiveActionInProgress"
              variant="outline"
              size="sm"
              class="text-red-600 border-red-300 hover:bg-red-50"
            >
              × Descartar Seleccionados ({{ selectedChangesCount }})
            </BaseButton>
            
            <BaseButton
              v-if="!hasSelectedChanges && hasPendingSync"
              @click="toggleAllChanges"
              variant="outline"
              size="sm"
            >
              Seleccionar Todos
            </BaseButton>
            
            <BaseButton
              v-if="hasSelectedChanges"
              @click="selectedChanges.clear()"
              variant="outline"
              size="sm"
            >
              Limpiar Selección
            </BaseButton>
          </div>
          
          <p v-if="hasSelectedChanges" class="text-center text-sm text-gray-600 mt-2">
            {{ selectedChangesCount }} de {{ pendingChangesCount }} cambios seleccionados
          </p>
        </div>
      </div>

      <!-- Cambios Pendientes - Table -->
      <div class="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
        <div class="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-xl font-bold text-gray-900">Cambios Pendientes</h2>
              <p class="text-sm text-gray-600">Selecciona cambios individuales para aplicar o descartar</p>
            </div>
            <div v-if="hasPendingSync" class="flex items-center gap-2">
              <input
                type="checkbox"
                :checked="allChangesSelected"
                @change="toggleAllChanges"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label class="text-sm font-medium text-gray-700">
                Seleccionar Todos
              </label>
            </div>
          </div>
        </div>
        
        <BaseTable
          :columns="pendingChangesColumns"
          :data="pendingChanges"
          :loading="loading"
          :show-actions="false"
          empty-message="No hay cambios pendientes"
        >
          <template #cell-select="{ row }">
            <input
              type="checkbox"
              :checked="selectedChanges.has(row.id)"
              @change="toggleChangeSelection(row.id)"
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </template>
          
          <template #cell-type="{ row }">
            <span :class="[
              'px-3 py-1 text-xs font-bold rounded-full',
              row.type === 'CREATE' ? 'bg-blue-100 text-blue-800' :
              row.type === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            ]">
              {{ row.type }}
            </span>
          </template>
          
          <template #cell-preview="{ row }">
            <BaseButton
              @click="showChangePreview(row)"
              variant="outline"
              size="sm"
              class="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <EyeIcon class="w-4 h-4 mr-1" />
              Ver Detalles
            </BaseButton>
          </template>
        </BaseTable>
      </div>

      <!-- Historial de Importaciones -->
      <div class="bg-white rounded-xl shadow-lg overflow-hidden mt-8">
        <div class="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b">
          <h2 class="text-xl font-bold text-gray-900">Historial de Importaciones</h2>
          <p class="text-sm text-gray-600">Registro de sincronizaciones anteriores</p>
        </div>
        
        <BaseTable
          :columns="importHistoryColumns"
          :data="importHistory"
          :loading="historyLoading"
          :show-actions="false"
          empty-message="No hay historial de importaciones"
        >
          <template #cell-status="{ row }">
            <span :class="[
              'px-3 py-1 text-xs font-bold rounded-full',
              row.status === 'SUCCESS' || row.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
              row.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
              row.status === 'FAILED' ? 'bg-red-100 text-red-800' :
              row.status === 'PENDING' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            ]">
              {{ row.status }}
            </span>
          </template>
        </BaseTable>
      </div>

      <!-- Eventos de Hoy con Overrides -->
      <div class="bg-white rounded-xl shadow-lg overflow-hidden mt-8">
        <div class="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b">
          <h2 class="text-xl font-bold text-gray-900">Eventos de Hoy - Overrides Manuales</h2>
          <p class="text-sm text-gray-600">Forzar estados CERRADO/CANCELADO para contingencias</p>
        </div>
        
        <BaseTable
          :columns="eventsColumns"
          :data="todayEvents"
          :loading="eventsLoading"
          :show-actions="false"
          empty-message="No hay eventos programados para hoy"
        >
          <template #cell-calculated_status="{ row }">
            <span :class="[
              'px-3 py-1 text-xs font-bold rounded-full',
              row.calculated_status === 'ABIERTO' ? 'bg-green-100 text-green-800' :
              row.calculated_status === 'CERRADO' ? 'bg-red-100 text-red-800' :
              row.calculated_status === 'CANCELADO' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            ]">
              {{ row.calculated_status || 'PROGRAMADO' }}
            </span>
          </template>
          
          <template #cell-actions="{ row }">
            <div class="flex gap-2">
              <BaseButton
                @click="openOverrideModal(row, 'CERRADO')"
                variant="outline"
                size="sm"
                class="text-red-600 border-red-300 hover:bg-red-50"
              >
                Forzar CERRADO
              </BaseButton>
              <BaseButton
                @click="openOverrideModal(row, 'CANCELADO')"
                variant="outline"
                size="sm"
                class="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
              >
                Forzar CANCELADO
              </BaseButton>
            </div>
          </template>
        </BaseTable>
      </div>
    </div>
  </div>

  <!-- Modal Override -->
  <div v-if="showOverrideModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-bold mb-4">Override Manual de Estado</h3>
      
      <div class="mb-4 p-4 bg-gray-50 rounded">
        <p><strong>Espectáculo:</strong> {{ selectedEvent?.show?.name }}</p>
        <p><strong>Hora:</strong> {{ selectedEvent?.start_time }}</p>
        <p><strong>Estado Actual:</strong> {{ selectedEvent?.calculated_status }}</p>
        <p><strong>Nuevo Estado:</strong> <span class="font-bold text-red-600">{{ overrideStatus }}</span></p>
      </div>

      <div class="mb-4">
        <label class="block text-sm font-medium mb-2">
          Razón (mínimo 10 caracteres):
        </label>
        <textarea 
          v-model="overrideReason" 
          class="w-full p-3 border rounded-lg"
          rows="3"
          placeholder="Explique el motivo del override (ej: problema técnico, mal tiempo, etc.)"
        />
        <p class="text-xs text-gray-500 mt-1">{{ overrideReason.length }}/10 caracteres mínimos</p>
      </div>

      <div class="flex gap-3">
        <BaseButton
          @click="showOverrideModal = false"
          variant="outline"
          class="flex-1"
        >
          Cancelar
        </BaseButton>
        <BaseButton
          @click="confirmOverride"
          variant="primary"
          :disabled="overrideReason.length < 10"
          class="flex-1 bg-red-600 hover:bg-red-700"
        >
          Confirmar Override
        </BaseButton>
      </div>
    </div>
  </div>

  <!-- Modal Preview Detallado -->
  <div v-if="showPreviewModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold">Preview Detallado del Cambio</h3>
        <BaseButton
          @click="showPreviewModal = false"
          variant="outline"
          size="sm"
        >
          ×
        </BaseButton>
      </div>
      
      <div v-if="selectedChange" class="space-y-4">
        <!-- Información General -->
        <div class="p-4 bg-blue-50 rounded-lg">
          <h4 class="font-semibold text-blue-900 mb-2">🔄 Información del Cambio</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Tipo:</strong> 
              <span :class="[
                'px-2 py-1 text-xs font-bold rounded ml-2',
                selectedChange.type === 'CREATE' ? 'bg-blue-100 text-blue-800' :
                selectedChange.type === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              ]">
                {{ selectedChange.type }}
              </span>
            </div>
            <div><strong>ID:</strong> {{ selectedChange.id }}</div>
            <div><strong>Espectáculo:</strong> {{ selectedChange.showName }}</div>
            <div><strong>Fecha:</strong> {{ selectedChange.eventDate }}</div>
          </div>
        </div>

        <!-- Detalles del Evento -->
        <div class="p-4 bg-green-50 rounded-lg">
          <h4 class="font-semibold text-green-900 mb-2">🎭 Detalles del Evento</h4>
          <div class="text-sm space-y-2">
            <div><strong>Hora de Inicio:</strong> {{ selectedChange.startTime }}</div>
            <div><strong>Descripción:</strong> {{ selectedChange.description }}</div>
          </div>
        </div>

        <!-- Impacto del Cambio -->
        <div class="p-4 bg-yellow-50 rounded-lg">
          <h4 class="font-semibold text-yellow-900 mb-2">⚠️ Impacto del Cambio</h4>
          <div class="text-sm space-y-1">
            <div v-if="selectedChange.type === 'CREATE'">
              • Se creará un nuevo evento para "{{ selectedChange.showName }}"
            </div>
            <div v-if="selectedChange.type === 'UPDATE'">
              • Se actualizará el evento existente de "{{ selectedChange.showName }}"
            </div>
            <div v-if="selectedChange.type === 'DELETE'">
              • Se eliminará el evento de "{{ selectedChange.showName }}"
            </div>
            <div>• Las pantallas públicas mostrarán este cambio inmediatamente</div>
            <div>• Los overrides manuales existentes se preservarán</div>
          </div>
        </div>

        <!-- Acción Recomendada -->
        <div class="p-4 bg-gray-50 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-2">📝 Acción Recomendada</h4>
          <p class="text-sm text-gray-700">
            Este cambio se aplicará automáticamente cuando uses "Aplicar Cambios" o cambies a modo automático.
            Revisa que la información sea correcta antes de proceder.
          </p>
        </div>
      </div>

      <div class="flex justify-end mt-6">
        <BaseButton
          @click="showPreviewModal = false"
          variant="primary"
        >
          Cerrar Preview
        </BaseButton>
      </div>
    </div>
  </div>
</template>