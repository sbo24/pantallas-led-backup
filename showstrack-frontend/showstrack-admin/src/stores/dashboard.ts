// Dashboard Store - ShowsTrack Frontend
// Pinia Setup Store for dashboard metrics and system health

import { defineStore } from 'pinia'
import { ref, computed, type ComputedRef } from 'vue'
import DashboardApiService from '@/services/api/dashboard'
import type { DashboardMetrics, SystemHealth } from '@/types/api'

export const useDashboardStore = defineStore('dashboard', () => {
  // State
  const metrics = ref<DashboardMetrics | null>(null)
  const systemHealth = ref<SystemHealth | null>(null)
  const realTimeData = ref<{
    currentEvents: Array<{
      id: string
      showName: string
      status: string
      startTime: string
      venue: string
    }>
    upcomingEvents: Array<{
      id: string
      showName: string
      startTime: string
      venue: string
    }>
    recentOverrides: Array<{
      id: string
      showName: string
      status: string
      reason: string
      timestamp: string
    }>
  } | null>(null)
  const venueStats = ref<Array<{
    venue: string
    totalShows: number
    activeEvents: number
    upcomingEvents: number
    status: 'operational' | 'warning' | 'error'
  }>>([])
  const activityLog = ref<Array<{
    id: string
    action: string
    target: string
    user: string
    timestamp: string
    details?: string
  }>>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastRefresh = ref<Date | null>(null)
  
  // Auto-refresh settings
  const autoRefreshEnabled = ref(true)
  const refreshInterval = ref(30000) // 30 seconds
  const refreshTimer = ref<number | null>(null)
  
  // Computed
  const isSystemHealthy: ComputedRef<boolean> = computed(() => {
    if (!systemHealth.value) return false
    return systemHealth.value.database === 'healthy' && 
           systemHealth.value.apiResponse === 'healthy' && 
           systemHealth.value.externalSync === 'healthy'
  })
  
  const systemStatusColor: ComputedRef<'green' | 'yellow' | 'red'> = computed(() => {
    if (!metrics.value) return 'red'
    switch (metrics.value.systemStatus) {
      case 'operational': return 'green'
      case 'warning': return 'yellow'
      case 'error': return 'red'
      default: return 'red'
    }
  })
  
  const currentEventsCount: ComputedRef<number> = computed(() => 
    realTimeData.value?.currentEvents.length || 0
  )
  
  const upcomingEventsCount: ComputedRef<number> = computed(() => 
    realTimeData.value?.upcomingEvents.length || 0
  )
  
  const recentOverridesCount: ComputedRef<number> = computed(() => 
    realTimeData.value?.recentOverrides.length || 0
  )
  
  const venueStatusSummary: ComputedRef<{
    operational: number
    warning: number
    error: number
  }> = computed(() => {
    return venueStats.value.reduce((acc, venue) => {
      acc[venue.status]++
      return acc
    }, { operational: 0, warning: 0, error: 0 })
  })

  // Actions
  const fetchDashboardMetrics = async (): Promise<boolean> => {
    try {
      const response = await DashboardApiService.getDashboardMetrics()
      
      if (response.data) {
        metrics.value = response.data
        return true
      }
      
      return false
    } catch (apiError: any) {
      console.error('[Dashboard Store] Fetch metrics error:', apiError)
      return false
    }
  }
  
  const fetchSystemHealth = async (): Promise<boolean> => {
    try {
      const response = await DashboardApiService.getSystemHealth()
      
      if (response.data) {
        systemHealth.value = response.data
        return true
      }
      
      return false
    } catch (apiError: any) {
      console.error('[Dashboard Store] Fetch system health error:', apiError)
      return false
    }
  }
  
  const fetchRealTimeEvents = async (): Promise<boolean> => {
    try {
      const response = await DashboardApiService.getRealTimeEvents()
      
      if (response.data) {
        realTimeData.value = response.data
        return true
      }
      
      return false
    } catch (apiError: any) {
      console.error('[Dashboard Store] Fetch real-time events error:', apiError)
      return false
    }
  }
  
  const fetchVenueStats = async (): Promise<boolean> => {
    try {
      const response = await DashboardApiService.getVenueStats()
      
      if (response.data) {
        venueStats.value = response.data
        return true
      }
      
      return false
    } catch (apiError: any) {
      console.error('[Dashboard Store] Fetch venue stats error:', apiError)
      return false
    }
  }
  
  const fetchActivityLog = async (limit: number = 20): Promise<boolean> => {
    try {
      const response = await DashboardApiService.getActivityLog(limit)
      
      if (response.data) {
        activityLog.value = response.data
        return true
      }
      
      return false
    } catch (apiError: any) {
      console.error('[Dashboard Store] Fetch activity log error:', apiError)
      return false
    }
  }
  
  const fetchAlertsSummary = async (): Promise<{
    activeAlerts: number
    criticalAlerts: number
    recentAlerts: Array<{
      id: string
      title: string
      type: string
      priority: string
      createdAt: string
    }>
  } | null> => {
    try {
      const response = await DashboardApiService.getAlertsSummary()
      return response.data || null
    } catch (apiError: any) {
      console.error('[Dashboard Store] Fetch alerts summary error:', apiError)
      return null
    }
  }
  
  const fetchPerformanceMetrics = async (): Promise<{
    apiResponseTime: number
    databaseConnections: number
    memoryUsage: number
    cpuUsage: number
    activeUsers: number
    requestsPerMinute: number
  } | null> => {
    try {
      const response = await DashboardApiService.getPerformanceMetrics()
      return response.data || null
    } catch (apiError: any) {
      console.error('[Dashboard Store] Fetch performance metrics error:', apiError)
      return null
    }
  }
  
  const fetchSyncStatus = async (): Promise<{
    lastSyncTime: string
    nextSyncTime: string
    syncStatus: 'healthy' | 'warning' | 'error'
    externalSystems: Array<{
      name: string
      status: 'connected' | 'disconnected' | 'error'
      lastSync: string
    }>
  } | null> => {
    try {
      const response = await DashboardApiService.getSyncStatus()
      return response.data || null
    } catch (apiError: any) {
      console.error('[Dashboard Store] Fetch sync status error:', apiError)
      return null
    }
  }
  
  const forceRefresh = async (): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await DashboardApiService.forceRefresh()
      
      if (response.data?.refreshed) {
        // Refresh all dashboard data after force refresh
        await refreshAll()
        return true
      }
      
      return false
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al forzar actualización'
      console.error('[Dashboard Store] Force refresh error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const testConnectivity = async (): Promise<{
    database: boolean
    externalApi: boolean
    redis: boolean
    overallHealth: 'healthy' | 'warning' | 'error'
  } | null> => {
    try {
      const response = await DashboardApiService.testConnectivity()
      return response.data || null
    } catch (apiError: any) {
      console.error('[Dashboard Store] Test connectivity error:', apiError)
      return null
    }
  }
  
  const getHistoricalData = async (
    metric: 'events' | 'overrides' | 'alerts' | 'users',
    period: 'hour' | 'day' | 'week' | 'month'
  ): Promise<Array<{ timestamp: string; value: number }>> => {
    try {
      const response = await DashboardApiService.getHistoricalData(metric, period)
      return response.data || []
    } catch (apiError: any) {
      console.error('[Dashboard Store] Get historical data error:', apiError)
      return []
    }
  }
  
  // Auto-refresh functionality
  const startAutoRefresh = (): void => {
    if (refreshTimer.value) {
      clearInterval(refreshTimer.value)
    }
    
    if (autoRefreshEnabled.value) {
      refreshTimer.value = window.setInterval(() => {
        refreshAll(false) // Silent refresh
      }, refreshInterval.value)
    }
  }
  
  const stopAutoRefresh = (): void => {
    if (refreshTimer.value) {
      clearInterval(refreshTimer.value)
      refreshTimer.value = null
    }
  }
  
  const setAutoRefresh = (enabled: boolean, interval?: number): void => {
    autoRefreshEnabled.value = enabled
    
    if (interval) {
      refreshInterval.value = interval
    }
    
    if (enabled) {
      startAutoRefresh()
    } else {
      stopAutoRefresh()
    }
  }
  
  // Comprehensive refresh
  const refreshAll = async (showLoading: boolean = true): Promise<void> => {
    try {
      if (showLoading) {
        isLoading.value = true
        error.value = null
      }
      
      await Promise.all([
        fetchDashboardMetrics(),
        fetchSystemHealth(),
        fetchRealTimeEvents(),
        fetchVenueStats(),
        fetchActivityLog()
      ])
      
      lastRefresh.value = new Date()
    } catch (apiError: any) {
      if (showLoading) {
        error.value = apiError.message || 'Error al actualizar dashboard'
      }
      console.error('[Dashboard Store] Refresh all error:', apiError)
    } finally {
      if (showLoading) {
        isLoading.value = false
      }
    }
  }
  
  // Utility actions
  const clearError = (): void => {
    error.value = null
  }
  
  const getTimeSinceLastRefresh = (): string => {
    if (!lastRefresh.value) return 'Nunca'
    
    const now = new Date()
    const diff = now.getTime() - lastRefresh.value.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (seconds < 60) return `${seconds}s`
    if (minutes < 60) return `${minutes}m`
    return `${hours}h`
  }
  
  // Initialize dashboard
  const initializeDashboard = async (): Promise<void> => {
    await refreshAll()
    startAutoRefresh()
  }
  
  // Cleanup when store is destroyed
  const cleanup = (): void => {
    stopAutoRefresh()
  }

  return {
    // State
    metrics,
    systemHealth,
    realTimeData,
    venueStats,
    activityLog,
    isLoading,
    error,
    lastRefresh,
    autoRefreshEnabled,
    refreshInterval,
    
    // Computed
    isSystemHealthy,
    systemStatusColor,
    currentEventsCount,
    upcomingEventsCount,
    recentOverridesCount,
    venueStatusSummary,
    
    // Actions
    fetchDashboardMetrics,
    fetchSystemHealth,
    fetchRealTimeEvents,
    fetchVenueStats,
    fetchActivityLog,
    fetchAlertsSummary,
    fetchPerformanceMetrics,
    fetchSyncStatus,
    forceRefresh,
    testConnectivity,
    getHistoricalData,
    
    // Auto-refresh
    startAutoRefresh,
    stopAutoRefresh,
    setAutoRefresh,
    
    // Utility
    refreshAll,
    clearError,
    getTimeSinceLastRefresh,
    initializeDashboard,
    cleanup
  }
})