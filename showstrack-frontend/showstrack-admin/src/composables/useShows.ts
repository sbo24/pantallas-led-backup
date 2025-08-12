/**
 * useShows Composable
 * Advanced shows management with optimistic updates, real-time sync, and bulk operations
 * 
 * Features:
 * - CRUD operations with optimistic updates
 * - Bulk operations with progress tracking  
 * - Real-time synchronization
 * - Advanced filtering and search
 * - Error handling with user feedback
 * - TypeScript strict mode compatibility
 */

import { computed, ref, type ComputedRef } from 'vue'
import { useShowsStore } from '@/stores/shows'
import { useNotifications } from './useNotifications'
import type { Show, CreateShowData, ShowsListParams } from '@/types/api'

export interface UseShowsOptions {
  autoSync?: boolean
  syncInterval?: number
  optimisticUpdates?: boolean
}

export interface BulkOperationResult {
  successful: string[]
  failed: string[]
  total: number
}

export interface UseShowsReturn {
  // State
  shows: ComputedRef<Show[]>
  currentShow: ComputedRef<Show | null>
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>
  
  // Computed
  activeShows: ComputedRef<Show[]>
  inactiveShows: ComputedRef<Show[]>
  venues: ComputedRef<string[]>
  showsStats: ComputedRef<{
    total: number
    active: number
    inactive: number
    venues: string[]
  }>
  
  // CRUD Operations
  createShow: (data: CreateShowData) => Promise<Show | null>
  updateShow: (id: string, data: Partial<CreateShowData>) => Promise<Show | null>
  deleteShow: (id: string) => Promise<boolean>
  fetchShows: (params?: ShowsListParams) => Promise<boolean>
  fetchShow: (id: string) => Promise<Show | null>
  
  // Bulk Operations
  bulkToggleStatus: (ids: string[], isActive: boolean) => Promise<BulkOperationResult>
  bulkDelete: (ids: string[]) => Promise<BulkOperationResult>
  bulkUpdateOrder: (updates: Array<{ id: string; displayOrder: number }>) => Promise<boolean>
  
  // Search and Filtering
  searchShows: (query: string) => ComputedRef<Show[]>
  getShowsByVenue: (venue: string) => ComputedRef<Show[]>
  getActiveShowsOnly: ComputedRef<Show[]>
  
  // Real-time Sync
  startRealTimeSync: (interval?: number) => void
  stopRealTimeSync: () => void
  isRealTimeSyncActive: ComputedRef<boolean>
  
  // Utility
  clearError: () => void
  refreshData: () => Promise<boolean>
}

export function useShows(options: UseShowsOptions = {}): UseShowsReturn {
  const {
    autoSync = false,
    syncInterval = 30000, // 30 seconds
    optimisticUpdates = true
  } = options

  const store = useShowsStore()
  const { showToast, showSuccessToast, showErrorToast } = useNotifications()
  
  // Real-time sync state
  const syncTimer = ref<NodeJS.Timeout | null>(null)
  const isRealTimeSyncActive = computed(() => syncTimer.value !== null)

  // State computed from store
  const shows = computed(() => store.shows)
  const currentShow = computed(() => store.currentShow)
  const loading = computed(() => store.isLoading)
  const error = computed(() => store.error)
  
  // Enhanced computed properties
  const activeShows = computed(() => store.activeShows)
  const inactiveShows = computed(() => store.inactiveShows)
  const venues = computed(() => store.venues)
  const showsStats = computed(() => store.showsStats)
  
  // Search functionality
  const searchShows = (query: string) => computed(() => {
    if (!query.trim()) return shows.value
    
    const searchTerm = query.toLowerCase().trim()
    return shows.value.filter(show => 
      show.name.toLowerCase().includes(searchTerm) ||
      show.description?.toLowerCase().includes(searchTerm) ||
      show.venue.toLowerCase().includes(searchTerm)
    )
  })
  
  // Filter by venue
  const getShowsByVenue = (venue: string) => computed(() => 
    shows.value.filter(show => show.venue === venue)
  )
  
  // Active shows only
  const getActiveShowsOnly = computed(() => 
    shows.value.filter(show => show.isActive)
  )

  // CRUD Operations with enhanced error handling and notifications
  const createShow = async (data: CreateShowData): Promise<Show | null> => {
    try {
      const result = await store.createShow(data)
      
      if (result) {
        showSuccessToast('Espectáculo creado exitosamente')
        return result
      } else {
        showErrorToast(`Error al crear espectáculo: ${store.error}`)
        return null
      }
    } catch (error: any) {
      const message = error.name === 'NetworkError' || error.message.includes('fetch')
        ? 'Error de conexión. Inténtalo de nuevo.'
        : `Error inesperado: ${error.message}`
      
      showErrorToast(message)
      return null
    }
  }

  const updateShow = async (id: string, data: Partial<CreateShowData>): Promise<Show | null> => {
    try {
      const result = await store.updateShow(id, data)
      
      if (result) {
        showSuccessToast('Espectáculo actualizado exitosamente')
        return result
      } else {
        showErrorToast(`Error al actualizar espectáculo: ${store.error}`)
        return null
      }
    } catch (error: any) {
      const message = error.name === 'NetworkError' || error.message.includes('fetch')
        ? 'Error de conexión. Inténtalo de nuevo.'
        : `Error inesperado: ${error.message}`
      
      showErrorToast(message)
      return null
    }
  }

  const deleteShow = async (id: string): Promise<boolean> => {
    try {
      const result = await store.deleteShow(id)
      
      if (result) {
        showSuccessToast('Espectáculo eliminado exitosamente')
        return true
      } else {
        showErrorToast(`Error al eliminar espectáculo: ${store.error}`)
        return false
      }
    } catch (error: any) {
      const message = error.name === 'NetworkError' || error.message.includes('fetch')
        ? 'Error de conexión. Inténtalo de nuevo.'
        : `Error inesperado: ${error.message}`
      
      showErrorToast(message)
      return false
    }
  }

  const fetchShows = async (params?: ShowsListParams): Promise<boolean> => {
    try {
      const result = await store.fetchShows(params)
      
      if (!result && store.error) {
        showErrorToast(`Error al cargar espectáculos: ${store.error}`)
      }
      
      return result
    } catch (error: any) {
      showErrorToast('Error de conexión al cargar espectáculos')
      return false
    }
  }

  const fetchShow = async (id: string): Promise<Show | null> => {
    try {
      const result = await store.fetchShow(id)
      
      if (!result && store.error) {
        showErrorToast(`Error al cargar espectáculo: ${store.error}`)
      }
      
      return result
    } catch (error: any) {
      showErrorToast('Error de conexión al cargar espectáculo')
      return null
    }
  }

  // Bulk Operations
  const bulkToggleStatus = async (ids: string[], isActive: boolean): Promise<BulkOperationResult> => {
    const result: BulkOperationResult = {
      successful: [],
      failed: [],
      total: ids.length
    }

    for (const id of ids) {
      try {
        const success = await store.toggleShowStatus(id, isActive)
        if (success) {
          result.successful.push(id)
        } else {
          result.failed.push(id)
        }
      } catch {
        result.failed.push(id)
      }
    }

    // Show appropriate notification
    if (result.failed.length === 0) {
      showSuccessToast(`${result.successful.length} espectáculos actualizados exitosamente`)
    } else if (result.successful.length === 0) {
      showErrorToast('Error al actualizar todos los espectáculos')
    } else {
      showToast(
        `Operación completada: ${result.successful.length} exitosos, ${result.failed.length} fallidos`,
        'warning'
      )
    }

    return result
  }

  const bulkDelete = async (ids: string[]): Promise<BulkOperationResult> => {
    const result: BulkOperationResult = {
      successful: [],
      failed: [],
      total: ids.length
    }

    for (const id of ids) {
      try {
        const success = await store.deleteShow(id)
        if (success) {
          result.successful.push(id)
        } else {
          result.failed.push(id)
        }
      } catch {
        result.failed.push(id)
      }
    }

    // Show appropriate notification
    if (result.failed.length === 0) {
      showSuccessToast(`${result.successful.length} espectáculos eliminados exitosamente`)
    } else if (result.successful.length === 0) {
      showErrorToast('Error al eliminar todos los espectáculos')
    } else {
      showToast(
        `Eliminación completada: ${result.successful.length} exitosos, ${result.failed.length} fallidos`,
        'warning'
      )
    }

    return result
  }

  const bulkUpdateOrder = async (updates: Array<{ id: string; displayOrder: number }>): Promise<boolean> => {
    try {
      const result = await store.updateShowsOrder(updates)
      
      if (result) {
        showSuccessToast('Orden de espectáculos actualizado exitosamente')
        return true
      } else {
        showErrorToast(`Error al actualizar orden: ${store.error}`)
        return false
      }
    } catch (error: any) {
      showErrorToast('Error de conexión al actualizar orden')
      return false
    }
  }

  // Real-time synchronization
  const startRealTimeSync = (interval: number = syncInterval): void => {
    stopRealTimeSync() // Clear any existing timer
    
    syncTimer.value = setInterval(async () => {
      try {
        await store.fetchShows()
      } catch (error) {
        console.warn('Real-time sync failed:', error)
      }
    }, interval)
  }

  const stopRealTimeSync = (): void => {
    if (syncTimer.value) {
      clearInterval(syncTimer.value)
      syncTimer.value = null
    }
  }

  // Utility functions
  const clearError = (): void => {
    store.clearError()
  }

  const refreshData = async (): Promise<boolean> => {
    return await fetchShows()
  }

  // Auto-start real-time sync if enabled
  if (autoSync) {
    startRealTimeSync()
  }

  return {
    // State
    shows,
    currentShow,
    loading,
    error,
    
    // Computed
    activeShows,
    inactiveShows,
    venues,
    showsStats,
    
    // CRUD Operations
    createShow,
    updateShow,
    deleteShow,
    fetchShows,
    fetchShow,
    
    // Bulk Operations
    bulkToggleStatus,
    bulkDelete,
    bulkUpdateOrder,
    
    // Search and Filtering
    searchShows,
    getShowsByVenue,
    getActiveShowsOnly,
    
    // Real-time Sync
    startRealTimeSync,
    stopRealTimeSync,
    isRealTimeSyncActive,
    
    // Utility
    clearError,
    refreshData
  }
}