// Shows Store - ShowsTrack Frontend
// Pinia Setup Store for shows management

import { defineStore } from 'pinia'
import { ref, computed, type ComputedRef } from 'vue'
import ShowsApiService from '@/services/api/shows'
import type { Show, ShowsListParams, CreateShowData, PaginatedResponse } from '@/types/api'

export const useShowsStore = defineStore('shows', () => {
  // State
  const shows = ref<Show[]>([])
  const currentShow = ref<Show | null>(null)
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })
  const filters = ref<ShowsListParams>({
    page: 1,
    limit: 20,
    search: '',
    isActive: undefined,
    venue: ''
  })
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // Computed
  const activeShows: ComputedRef<Show[]> = computed(() => 
    shows.value.filter(show => show.is_visible)
  )
  
  const inactiveShows: ComputedRef<Show[]> = computed(() => 
    shows.value.filter(show => !show.is_visible)
  )
  
  const venues: ComputedRef<string[]> = computed(() => 
    [...new Set(shows.value.map(show => 'Venue por defecto'))].sort()
  )
  
  const totalShows: ComputedRef<number> = computed(() => shows.value.length)
  
  const showsStats: ComputedRef<{
    total: number
    active: number
    inactive: number
    venues: string[]
  }> = computed(() => ({
    total: totalShows.value,
    active: activeShows.value.length,
    inactive: inactiveShows.value.length,
    venues: venues.value
  }))

  // Actions
  const fetchShows = async (params?: ShowsListParams): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const mergedParams = { ...filters.value, ...params }
      const response = await ShowsApiService.getShows(mergedParams)
      
      if (response.data) {
        shows.value = response.data.items || []
        pagination.value = {
          page: response.data.page || 1,
          limit: response.data.size || 20,
          total: response.data.total || 0,
          pages: response.data.pages || 1
        }
        filters.value = mergedParams
        return true
      }
      
      return false
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al cargar espectáculos'
      console.error('[Shows Store] Fetch shows error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchShow = async (showId: string): Promise<Show | null> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await ShowsApiService.getShow(showId)
      
      if (response.data) {
        currentShow.value = response.data
        
        // Update show in list if exists
        const index = shows.value.findIndex(s => s.id === showId)
        if (index !== -1) {
          shows.value[index] = response.data
        }
        
        return response.data
      }
      
      return null
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al cargar espectáculo'
      console.error('[Shows Store] Fetch show error:', apiError)
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  const createShow = async (showData: CreateShowData): Promise<Show | null> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await ShowsApiService.createShow(showData)
      
      if (response.data) {
        // Add to beginning of list
        shows.value.unshift(response.data)
        pagination.value.total++
        
        return response.data
      }
      
      return null
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al crear espectáculo'
      console.error('[Shows Store] Create show error:', apiError)
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  const updateShow = async (showId: string, showData: Partial<CreateShowData>): Promise<Show | null> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await ShowsApiService.updateShow(showId, showData)
      
      if (response.data) {
        // Update in list
        const index = shows.value.findIndex(s => s.id === showId)
        if (index !== -1) {
          shows.value[index] = response.data
        }
        
        // Update current show if it's the same
        if (currentShow.value?.id === showId) {
          currentShow.value = response.data
        }
        
        return response.data
      }
      
      return null
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al actualizar espectáculo'
      console.error('[Shows Store] Update show error:', apiError)
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  const deleteShow = async (showId: string): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      await ShowsApiService.deleteShow(showId)
      
      // Remove from list
      const index = shows.value.findIndex(s => s.id === showId)
      if (index !== -1) {
        shows.value.splice(index, 1)
        pagination.value.total--
      }
      
      // Clear current show if it's the same
      if (currentShow.value?.id === showId) {
        currentShow.value = null
      }
      
      return true
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al eliminar espectáculo'
      console.error('[Shows Store] Delete show error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const toggleShowStatus = async (showId: string, isActive: boolean): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await ShowsApiService.toggleShowStatus(showId, isActive)
      
      if (response.data) {
        // Update in list
        const index = shows.value.findIndex(s => s.id === showId)
        if (index !== -1) {
          shows.value[index] = response.data
        }
        
        // Update current show if it's the same
        if (currentShow.value?.id === showId) {
          currentShow.value = response.data
        }
        
        return true
      }
      
      return false
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al cambiar estado del espectáculo'
      console.error('[Shows Store] Toggle status error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const updateShowsOrder = async (showsOrder: Array<{ id: string; displayOrder: number }>): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      await ShowsApiService.updateShowsOrder(showsOrder)
      
      // Update local order
      showsOrder.forEach(({ id, displayOrder }) => {
        const show = shows.value.find(s => s.id === id)
        if (show) {
          show.displayOrder = displayOrder
        }
      })
      
      // Re-sort shows by display order
      shows.value.sort((a, b) => a.displayOrder - b.displayOrder)
      
      return true
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al actualizar orden de espectáculos'
      console.error('[Shows Store] Update order error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const importShows = async (source: 'puy_du_fou' | 'manual'): Promise<{ imported: number; updated: number } | null> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await ShowsApiService.importShows(source)
      
      if (response.data) {
        // Refresh shows list after import
        await fetchShows()
        
        return response.data
      }
      
      return null
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al importar espectáculos'
      console.error('[Shows Store] Import shows error:', apiError)
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  const refreshStats = async (): Promise<void> => {
    try {
      const response = await ShowsApiService.getShowsStats()
      // Stats are computed, so this is mainly for side effects
    } catch (error) {
      console.warn('[Shows Store] Failed to refresh stats:', error)
    }
  }
  
  // Utility actions
  const clearError = (): void => {
    error.value = null
  }
  
  const clearCurrentShow = (): void => {
    currentShow.value = null
  }
  
  const setFilters = (newFilters: Partial<ShowsListParams>): void => {
    filters.value = { ...filters.value, ...newFilters }
  }
  
  const resetFilters = (): void => {
    filters.value = {
      page: 1,
      limit: 20,
      search: '',
      isActive: undefined,
      venue: ''
    }
  }
  
  // Find shows by criteria
  const findShowsByVenue = (venue: string): Show[] => {
    return shows.value.filter(show => show.venue === venue)
  }
  
  const findShowsByName = (searchTerm: string): Show[] => {
    return shows.value.filter(show => 
      show.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  return {
    // State
    shows,
    currentShow,
    pagination,
    filters,
    isLoading,
    error,
    
    // Computed
    activeShows,
    inactiveShows,
    venues,
    totalShows,
    showsStats,
    
    // Actions
    fetchShows,
    fetchShow,
    createShow,
    updateShow,
    deleteShow,
    toggleShowStatus,
    updateShowsOrder,
    importShows,
    refreshStats,
    
    // Utility actions
    clearError,
    clearCurrentShow,
    setFilters,
    resetFilters,
    findShowsByVenue,
    findShowsByName
  }
})