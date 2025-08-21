import { ref, computed, onUnmounted } from 'vue'
import { useNotifications } from './useNotifications'
import * as eventsService from '@/services/eventsService'

export function useEventsView() {
  const { showSuccessToast, showErrorToast, showWarningToast } = useNotifications()

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
  const selectedChanges = ref<Set<string>>(new Set())
  const selectiveActionInProgress = ref(false)
  let refreshInterval: NodeJS.Timeout | null = null

  // Computed properties
  const hasPendingSync = computed(() => pendingChanges.value.length > 0)
  const pendingChangesCount = computed(() => pendingChanges.value.length)
  const selectedChangesCount = computed(() => selectedChanges.value.size)
  const hasSelectedChanges = computed(() => selectedChanges.value.size > 0)
  const allChangesSelected = computed(() => 
    pendingChanges.value.length > 0 && selectedChanges.value.size === pendingChanges.value.length
  )

  // Data transformers
  const transformPendingChanges = (data: any) => {
    return data.pending_changes?.map((change: any) => {
      const changeType = change.action?.toUpperCase() || 'CREATE'
      const entityType = change.entity_type || 'event'
      const externalId = change.external_id || change.entity_id || 'unknown'
      const eventData = change.new_data || {}
      const showName = eventData.show_name || 'Show desconocido'
      const eventDate = eventData.event_date || new Date().toISOString().split('T')[0]
      const startTime = eventData.start_time || '00:00'
      
      let description = `${entityType}`
      if (showName !== 'Show desconocido') description += `: ${showName}`
      if (startTime !== '00:00') description += ` - ${startTime}`
      if (showName === 'Show desconocido') description += ` (ID: ${externalId})`
      
      return {
        id: change.change_id || change.id,
        type: changeType,
        description,
        showName,
        eventDate,
        startTime
      }
    }) || []
  }

  const transformImportHistory = (data: any) => {
    return data.items?.map((import_: any) => {
      let timestamp = 'Fecha no disponible'
      const dateFields = ['import_timestamp', 'created_at', 'timestamp', 'import_date', 'date']
      
      for (const field of dateFields) {
        if (import_[field]) {
          try {
            const dateValue = import_[field]
            if (typeof dateValue === 'string' && dateValue.includes('/')) {
              timestamp = dateValue
              break
            }
            const date = new Date(dateValue)
            if (!isNaN(date.getTime())) {
              timestamp = date.toLocaleString('es-ES', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
              })
              break
            }
          } catch (e) {}
        }
      }
      
      return {
        id: import_.id,
        timestamp,
        source: import_.source || 'puy_du_fou_api',
        eventsCount: import_.total_events || 0,
        status: import_.status?.toUpperCase() || 'COMPLETED',
        appliedCount: import_.applied_events || import_.successful_events || 0,
        errorCount: import_.failed_events || import_.error_count || 0
      }
    }) || []
  }

  // API functions
  const loadOperationMode = async () => {
    try {
      const data = await eventsService.fetchOperationMode()
      operationMode.value = data.current_mode
      if (data.last_changed_at) {
        lastSyncTime.value = new Date(data.last_changed_at).toLocaleString()
      }
    } catch (error) {
      showErrorToast('Error al obtener modo de operación')
    }
  }

  const loadPendingChanges = async () => {
    loading.value = true
    try {
      const data = await eventsService.fetchPendingChanges()
      pendingChanges.value = transformPendingChanges(data)
      
      if (pendingChanges.value.length === 0) {
        selectedChanges.value.clear()
      } else {
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

  const loadImportHistory = async () => {
    historyLoading.value = true
    try {
      const data = await eventsService.fetchImportHistory()
      importHistory.value = transformImportHistory(data)
      
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

  const loadTodayEvents = async () => {
    eventsLoading.value = true
    try {
      const data = await eventsService.fetchTodayEvents()
      todayEvents.value = data.items || []
    } catch (error) {
      showErrorToast('Error al cargar eventos de hoy')
      todayEvents.value = []
    } finally {
      eventsLoading.value = false
    }
  }

  const executeSyncManual = async () => {
    if (!hasPendingSync.value) {
      showWarningToast('No hay cambios pendientes para sincronizar')
      return
    }
    
    syncInProgress.value = true
    try {
      const result = await eventsService.executeSyncManual()
      const appliedCount = result.changes_applied || 0
      const failedCount = result.changes_failed || 0
      const skippedCount = result.changes_skipped || 0
      
      if (appliedCount > 0) {
        showSuccessToast(`Sincronización completada: ${appliedCount} aplicados`)
      } else if (failedCount > 0) {
        showWarningToast(`${failedCount} cambios fallaron - Los eventos ya existen en la base de datos`)
      } else if (skippedCount > 0) {
        showWarningToast(`${skippedCount} cambios omitidos (duplicados detectados)`)
      } else {
        showWarningToast('Sincronización completada sin cambios')
      }
      
      await Promise.all([loadPendingChanges(), loadImportHistory()])
    } catch (error: any) {
      // Detectar errores de contrainte unique
      if (error.message?.includes('unique constraint') && error.message?.includes('external_event_id')) {
        showWarningToast('Los eventos ya existen en la base de datos. No se crearon duplicados.')
      } else {
        showErrorToast(`Error durante la sincronización: ${error.message || 'Error desconocido'}`)
      }
    } finally {
      syncInProgress.value = false
    }
  }

  const cleanSkippedChanges = async () => {
    try {
      const result = await eventsService.cleanSkippedChanges()
      const appliedCount = result.changes_applied || 0
      const skippedCount = result.changes_skipped || 0
      
      if (appliedCount > 0) {
        showSuccessToast(`Forzado completado: ${appliedCount} aplicados`)
      } else if (skippedCount > 0) {
        showWarningToast(`${skippedCount} cambios aún omitidos. Problema persiste.`)
      } else {
        showSuccessToast('Todos los cambios fueron procesados')
      }
      
      await loadPendingChanges()
    } catch (error) {
      showErrorToast('Error al forzar limpieza')
    }
  }

  const changeOperationMode = async (newMode: 'automatic' | 'manual') => {
    try {
      await eventsService.changeOperationMode(newMode)
      operationMode.value = newMode
      showSuccessToast(`Modo cambiado a: ${newMode}`)
      
      if (newMode === 'automatic' && hasPendingSync.value) {
        await executeSyncManual()
      }
    } catch (error) {
      showErrorToast('Error al cambiar modo de operación')
    }
  }

  const createOverride = async (event: any, status: 'CERRADO' | 'CANCELADO', reason: string) => {
    if (reason.length < 10) {
      showErrorToast('La razón debe tener al menos 10 caracteres')
      return false
    }
    
    try {
      await eventsService.createOverride(event.id, status, reason)
      showSuccessToast(`Override ${status} aplicado correctamente`)
      await loadTodayEvents()
      return true
    } catch (error: any) {
      if (error.message?.includes('duplicate key')) {
        showErrorToast('Error de sincronización de base de datos. Contacte al administrador para reiniciar la secuencia.')
      } else {
        showErrorToast(`Error al aplicar override: ${error.message}`)
      }
      return false
    }
  }

  // Selection functions
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
      pendingChanges.value.forEach(change => selectedChanges.value.add(change.id))
    }
  }

  const applySelectedChanges = async () => {
    if (!hasSelectedChanges.value) {
      showWarningToast('No hay cambios seleccionados')
      return
    }
    
    selectiveActionInProgress.value = true
    try {
      const result = await eventsService.applySelectedChanges(Array.from(selectedChanges.value))
      const appliedCount = result.affected_changes || result.applied_count || 0
      
      if (appliedCount > 0) {
        showSuccessToast(`${appliedCount} cambios aplicados exitosamente`)
      } else {
        showWarningToast('No se aplicaron cambios - Los eventos ya existen en la base de datos')
      }
      
      selectedChanges.value.clear()
      await Promise.all([loadPendingChanges(), loadImportHistory()])
    } catch (error: any) {
      // Detectar errores de contrainte unique y mostrar mensaje claro
      if (error.message?.includes('unique constraint') && error.message?.includes('external_event_id')) {
        showWarningToast('Los eventos seleccionados ya existen en la base de datos. No se crearon duplicados.')
      } else if (error.message?.includes('duplicate key')) {
        showWarningToast('Eventos duplicados detectados - No se crearon duplicados en la base de datos')
      } else {
        showErrorToast(`Error al aplicar cambios: ${error.message || 'Error desconocido'}`)
      }
    } finally {
      selectiveActionInProgress.value = false
    }
  }

  const discardSelectedChanges = async () => {
    if (!hasSelectedChanges.value) {
      showWarningToast('No hay cambios seleccionados')
      return
    }
    
    selectiveActionInProgress.value = true
    try {
      const result = await eventsService.discardSelectedChanges(Array.from(selectedChanges.value))
      const discardedCount = result.affected_changes || result.discarded_count || 0
      showSuccessToast(`${discardedCount} cambios descartados exitosamente`)
      selectedChanges.value.clear()
      await loadPendingChanges()
    } catch (error) {
      showErrorToast('Error al descartar cambios seleccionados')
    } finally {
      selectiveActionInProgress.value = false
    }
  }

  // Auto-refresh
  const startAutoRefresh = () => {
    refreshInterval = setInterval(async () => {
      try {
        await Promise.all([loadPendingChanges(), loadTodayEvents()])
        // automatic mode sync
        if(operationMode.value === 'automatic' && hasPendingSync.value && !syncInProgress.value) {
          await executeSyncManual()
        }
      } catch (error) {
        console.error('Auto-refresh error:', error)
      }
    }, 30000)
  }

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }

  // Cleanup
  onUnmounted(() => {
    stopAutoRefresh()
  })

  return {
    // State
    loading, historyLoading, syncInProgress, eventsLoading,
    operationMode, pendingChanges, importHistory, todayEvents,
    lastSyncTime, selectedChanges, selectiveActionInProgress,
    
    // Computed
    hasPendingSync, pendingChangesCount, selectedChangesCount,
    hasSelectedChanges, allChangesSelected,
    
    // Methods
    loadOperationMode, loadPendingChanges, loadImportHistory, loadTodayEvents,
    executeSyncManual, cleanSkippedChanges, changeOperationMode, createOverride,
    toggleChangeSelection, toggleAllChanges, applySelectedChanges, discardSelectedChanges,
    startAutoRefresh, stopAutoRefresh
  }
}