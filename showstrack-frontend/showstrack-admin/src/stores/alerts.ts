// Alerts Store - ShowsTrack Frontend
// Pinia Setup Store for global alerts and notifications management

import { defineStore } from 'pinia'
import { ref, computed, type ComputedRef } from 'vue'
import AlertsApiService from '@/services/api/alerts'
import type { GlobalAlert, CreateAlertData } from '@/types/api'

export const useAlertsStore = defineStore('alerts', () => {
  // State - Empty arrays for real data from backend
  const alerts = ref<GlobalAlert[]>([])
  const activeAlerts = ref<GlobalAlert[]>([])
  const currentAlert = ref<GlobalAlert | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // UI Notifications state
  const uiNotifications = ref<Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
    timeout?: number
    persistent?: boolean
    createdAt: Date
  }>>([])
  
  // Computed
  const alertsByType: ComputedRef<Record<string, GlobalAlert[]>> = computed(() => {
    return alerts.value.reduce((acc, alert) => {
      const type = alert.type
      if (!acc[type]) acc[type] = []
      acc[type].push(alert)
      return acc
    }, {} as Record<string, GlobalAlert[]>)
  })
  
  const unreadCount: ComputedRef<number> = computed(() => {
    return activeAlerts.value.length
  })
  
  const alertsByPriority: ComputedRef<Record<string, GlobalAlert[]>> = computed(() => {
    return alerts.value.reduce((acc, alert) => {
      const priority = alert.priority
      if (!acc[priority]) acc[priority] = []
      acc[priority].push(alert)
      return acc
    }, {} as Record<string, GlobalAlert[]>)
  })
  
  const criticalAlerts: ComputedRef<GlobalAlert[]> = computed(() => 
    activeAlerts.value.filter(alert => alert.priority === 'critical')
  )
  
  const highPriorityAlerts: ComputedRef<GlobalAlert[]> = computed(() => 
    activeAlerts.value.filter(alert => alert.priority === 'high')
  )
  
  const expiringSoonAlerts: ComputedRef<GlobalAlert[]> = computed(() => {
    const soon = new Date()
    soon.setHours(soon.getHours() + 2) // Next 2 hours
    
    return activeAlerts.value.filter(alert => {
      if (!alert.endTime) return false
      const endTime = new Date(alert.endTime)
      return endTime <= soon && endTime > new Date()
    })
  })
  
  const alertsStats: ComputedRef<{
    total: number
    active: number
    byType: Record<string, number>
    byPriority: Record<string, number>
    expiringSoon: number
  }> = computed(() => ({
    total: alerts.value.length,
    active: activeAlerts.value.length,
    byType: Object.fromEntries(
      Object.entries(alertsByType.value).map(([type, alerts]) => [type, alerts.length])
    ),
    byPriority: Object.fromEntries(
      Object.entries(alertsByPriority.value).map(([priority, alerts]) => [priority, alerts.length])
    ),
    expiringSoon: expiringSoonAlerts.value.length
  }))

  // Actions
  const fetchAlerts = async (): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await AlertsApiService.getAlerts()
      
      if (response.data) {
        alerts.value = response.data
        return true
      }
      
      return false
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al cargar alertas'
      console.error('[Alerts Store] Fetch alerts error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchActiveAlerts = async (): Promise<boolean> => {
    try {
      const response = await AlertsApiService.getActiveAlerts()
      
      if (response.data) {
        activeAlerts.value = response.data
        return true
      }
      
      return false
    } catch (apiError: any) {
      console.error('[Alerts Store] Fetch active alerts error:', apiError)
      return false
    }
  }
  
  const fetchAlert = async (alertId: string): Promise<GlobalAlert | null> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await AlertsApiService.getAlert(alertId)
      
      if (response.data) {
        currentAlert.value = response.data
        
        // Update alert in lists if exists
        const alertIndex = alerts.value.findIndex(a => a.id === alertId)
        if (alertIndex !== -1) {
          alerts.value[alertIndex] = response.data
        }
        
        const activeIndex = activeAlerts.value.findIndex(a => a.id === alertId)
        if (activeIndex !== -1) {
          activeAlerts.value[activeIndex] = response.data
        }
        
        return response.data
      }
      
      return null
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al cargar alerta'
      console.error('[Alerts Store] Fetch alert error:', apiError)
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  const createAlert = async (alertData: CreateAlertData): Promise<GlobalAlert | null> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await AlertsApiService.createAlert(alertData)
      
      if (response.data) {
        // Add to beginning of list
        alerts.value.unshift(response.data)
        
        // Add to active alerts if active
        if (response.data.isActive) {
          activeAlerts.value.unshift(response.data)
        }
        
        // Show UI notification
        showNotification('success', 'Alerta Creada', 'La alerta ha sido creada exitosamente')
        
        return response.data
      }
      
      return null
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al crear alerta'
      console.error('[Alerts Store] Create alert error:', apiError)
      showNotification('error', 'Error', error.value || 'Error desconocido')
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  const updateAlert = async (alertId: string, alertData: Partial<CreateAlertData>): Promise<GlobalAlert | null> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await AlertsApiService.updateAlert(alertId, alertData)
      
      if (response.data) {
        // Update in alerts list
        const alertIndex = alerts.value.findIndex(a => a.id === alertId)
        if (alertIndex !== -1) {
          alerts.value[alertIndex] = response.data
        }
        
        // Update in active alerts
        const activeIndex = activeAlerts.value.findIndex(a => a.id === alertId)
        if (activeIndex !== -1) {
          if (response.data.isActive) {
            activeAlerts.value[activeIndex] = response.data
          } else {
            activeAlerts.value.splice(activeIndex, 1)
          }
        } else if (response.data.isActive) {
          activeAlerts.value.push(response.data)
        }
        
        // Update current alert if it's the same
        if (currentAlert.value?.id === alertId) {
          currentAlert.value = response.data
        }
        
        showNotification('success', 'Alerta Actualizada', 'La alerta ha sido actualizada exitosamente')
        
        return response.data
      }
      
      return null
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al actualizar alerta'
      console.error('[Alerts Store] Update alert error:', apiError)
      showNotification('error', 'Error', error.value || 'Error desconocido')
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  const deleteAlert = async (alertId: string): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      await AlertsApiService.deleteAlert(alertId)
      
      // Remove from alerts list
      const alertIndex = alerts.value.findIndex(a => a.id === alertId)
      if (alertIndex !== -1) {
        alerts.value.splice(alertIndex, 1)
      }
      
      // Remove from active alerts
      const activeIndex = activeAlerts.value.findIndex(a => a.id === alertId)
      if (activeIndex !== -1) {
        activeAlerts.value.splice(activeIndex, 1)
      }
      
      // Clear current alert if it's the same
      if (currentAlert.value?.id === alertId) {
        currentAlert.value = null
      }
      
      showNotification('success', 'Alerta Eliminada', 'La alerta ha sido eliminada exitosamente')
      
      return true
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al eliminar alerta'
      console.error('[Alerts Store] Delete alert error:', apiError)
      showNotification('error', 'Error', error.value || 'Error desconocido')
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const activateAlert = async (alertId: string): Promise<boolean> => {
    try {
      const response = await AlertsApiService.activateAlert(alertId)
      
      if (response.data) {
        // Update in alerts list
        const alertIndex = alerts.value.findIndex(a => a.id === alertId)
        if (alertIndex !== -1) {
          alerts.value[alertIndex] = response.data
        }
        
        // Add to active alerts
        const activeIndex = activeAlerts.value.findIndex(a => a.id === alertId)
        if (activeIndex === -1) {
          activeAlerts.value.push(response.data)
        }
        
        showNotification('success', 'Alerta Activada', 'La alerta ha sido activada')
        
        return true
      }
      
      return false
    } catch (apiError: any) {
      const errorMsg = apiError.message || 'Error al activar alerta'
      console.error('[Alerts Store] Activate alert error:', apiError)
      showNotification('error', 'Error', errorMsg)
      return false
    }
  }
  
  const deactivateAlert = async (alertId: string): Promise<boolean> => {
    try {
      const response = await AlertsApiService.deactivateAlert(alertId)
      
      if (response.data) {
        // Update in alerts list
        const alertIndex = alerts.value.findIndex(a => a.id === alertId)
        if (alertIndex !== -1) {
          alerts.value[alertIndex] = response.data
        }
        
        // Remove from active alerts
        const activeIndex = activeAlerts.value.findIndex(a => a.id === alertId)
        if (activeIndex !== -1) {
          activeAlerts.value.splice(activeIndex, 1)
        }
        
        showNotification('success', 'Alerta Desactivada', 'La alerta ha sido desactivada')
        
        return true
      }
      
      return false
    } catch (apiError: any) {
      const errorMsg = apiError.message || 'Error al desactivar alerta'
      console.error('[Alerts Store] Deactivate alert error:', apiError)
      showNotification('error', 'Error', errorMsg)
      return false
    }
  }
  
  const createEmergencyAlert = async (title: string, message: string, displayScreens: string[] = ['all']): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await AlertsApiService.createEmergencyAlert(title, message, displayScreens)
      
      if (response.data) {
        // Add to both lists
        alerts.value.unshift(response.data)
        activeAlerts.value.unshift(response.data)
        
        showNotification('warning', 'Alerta de Emergencia Creada', 'Se ha creado una alerta de emergencia')
        
        return true
      }
      
      return false
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al crear alerta de emergencia'
      console.error('[Alerts Store] Create emergency alert error:', apiError)
      showNotification('error', 'Error', error.value || 'Error desconocido')
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const clearAllAlerts = async (): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await AlertsApiService.clearAllAlerts()
      
      if (response.data) {
        activeAlerts.value = []
        
        // Update alerts to inactive
        alerts.value = alerts.value.map(alert => ({
          ...alert,
          isActive: false
        }))
        
        showNotification('info', 'Alertas Limpiadas', `Se han desactivado ${response.data.cleared} alertas`)
        
        return true
      }
      
      return false
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al limpiar alertas'
      console.error('[Alerts Store] Clear all alerts error:', apiError)
      showNotification('error', 'Error', error.value || 'Error desconocido')
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  // UI Notification actions
  const showNotification = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    options?: { timeout?: number; persistent?: boolean }
  ): string => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const notification = {
      id,
      type,
      title,
      message,
      timeout: options?.timeout || (type === 'error' ? 8000 : 5000),
      persistent: options?.persistent || false,
      createdAt: new Date()
    }
    
    uiNotifications.value.push(notification)
    
    // Auto-dismiss if not persistent
    if (!notification.persistent) {
      setTimeout(() => {
        dismissNotification(id)
      }, notification.timeout)
    }
    
    return id
  }
  
  const dismissNotification = (notificationId: string): void => {
    const index = uiNotifications.value.findIndex(n => n.id === notificationId)
    if (index !== -1) {
      uiNotifications.value.splice(index, 1)
    }
  }
  
  const dismissAllNotifications = (): void => {
    uiNotifications.value = []
  }
  
  // Utility actions
  const clearError = (): void => {
    error.value = null
  }
  
  const clearCurrentAlert = (): void => {
    currentAlert.value = null
  }
  
  // Refresh data
  const refreshAll = async (): Promise<void> => {
    await Promise.all([
      fetchAlerts(),
      fetchActiveAlerts()
    ])
  }

  return {
    // State
    alerts,
    activeAlerts,
    currentAlert,
    isLoading,
    error,
    uiNotifications,
    
    // Computed
    alertsByType,
    alertsByPriority,
    criticalAlerts,
    highPriorityAlerts,
    unreadCount,
    expiringSoonAlerts,
    alertsStats,
    
    // Actions
    fetchAlerts,
    fetchActiveAlerts,
    fetchAlert,
    createAlert,
    updateAlert,
    deleteAlert,
    activateAlert,
    deactivateAlert,
    createEmergencyAlert,
    clearAllAlerts,
    
    // UI Notification actions
    showNotification,
    dismissNotification,
    dismissAllNotifications,
    
    // Utility actions
    clearError,
    clearCurrentAlert,
    refreshAll
  }
})