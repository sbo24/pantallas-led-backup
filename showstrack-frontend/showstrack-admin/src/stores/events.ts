// Events Store - ShowsTrack Frontend
// Pinia Setup Store for events and schedules management

import { defineStore } from 'pinia'
import { ref, computed, type ComputedRef } from 'vue'
import EventsApiService from '@/services/api/events'
import type { Event, EventsListParams, CreateEventData, EventOverrideData, PaginatedResponse } from '@/types/api'

export const useEventsStore = defineStore('events', () => {
  // State
  const events = ref<Event[]>([])
  const currentEvent = ref<Event | null>(null)
  const todayEvents = ref<Event[]>([])
  const pagination = ref({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  })
  const filters = ref<EventsListParams>({
    page: 1,
    limit: 50,
    date: '',
    showId: '',
    status: '',
    venue: ''
  })
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // Computed
  const eventsByStatus: ComputedRef<Record<string, Event[]>> = computed(() => {
    return events.value.reduce((acc, event) => {
      const status = event.status
      if (!acc[status]) acc[status] = []
      acc[status].push(event)
      return acc
    }, {} as Record<string, Event[]>)
  })
  
  const activeEvents: ComputedRef<Event[]> = computed(() => 
    events.value.filter(event => event.status === 'ABIERTO')
  )
  
  const upcomingEvents: ComputedRef<Event[]> = computed(() => 
    events.value.filter(event => event.status === 'PROGRAMADO')
  )
  
  const eventsWithOverrides: ComputedRef<Event[]> = computed(() => 
    events.value.filter(event => event.hasOverride)
  )
  
  const currentlyRunningEvents: ComputedRef<Event[]> = computed(() => {
    const now = new Date()
    return events.value.filter(event => {
      const eventStart = new Date(`${event.date}T${event.startTime}`)
      const eventEnd = new Date(`${event.date}T${event.endTime}`)
      return now >= eventStart && now <= eventEnd
    })
  })
  
  const nextEvents: ComputedRef<Event[]> = computed(() => {
    const now = new Date()
    return events.value
      .filter(event => {
        const eventStart = new Date(`${event.date}T${event.startTime}`)
        return eventStart > now
      })
      .sort((a, b) => {
        const timeA = new Date(`${a.date}T${a.startTime}`).getTime()
        const timeB = new Date(`${b.date}T${b.startTime}`).getTime()
        return timeA - timeB
      })
      .slice(0, 5)
  })
  
  const eventsStats: ComputedRef<{
    total: number
    byStatus: Record<string, number>
    withOverrides: number
    upcomingToday: number
  }> = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    const upcomingToday = events.value.filter(event => 
      event.date === today && event.status === 'PROGRAMADO'
    )
    
    return {
      total: events.value.length,
      byStatus: Object.fromEntries(
        Object.entries(eventsByStatus.value).map(([status, events]) => [status, events.length])
      ),
      withOverrides: eventsWithOverrides.value.length,
      upcomingToday: upcomingToday.length
    }
  })

  // Actions
  const fetchEvents = async (params?: EventsListParams): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const mergedParams = { ...filters.value, ...params }
      const response = await EventsApiService.getEvents(mergedParams)
      
      if (response.data) {
        events.value = response.data.items || []
        pagination.value = {
          page: response.data.page || 1,
          limit: response.data.size || 50,
          total: response.data.total || 0,
          pages: response.data.pages || 1
        }
        filters.value = mergedParams
        return true
      }
      
      return false
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al cargar eventos'
      console.error('[Events Store] Fetch events error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchEvent = async (eventId: string): Promise<Event | null> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await EventsApiService.getEvent(eventId)
      
      if (response.data) {
        currentEvent.value = response.data
        
        // Update event in list if exists
        const index = events.value.findIndex(e => e.id === eventId)
        if (index !== -1) {
          events.value[index] = response.data
        }
        
        return response.data
      }
      
      return null
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al cargar evento'
      console.error('[Events Store] Fetch event error:', apiError)
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchTodaySchedule = async (): Promise<boolean> => {
    try {
      const response = await EventsApiService.getTodaySchedule()
      
      if (response.data) {
        todayEvents.value = response.data
        return true
      }
      
      return false
    } catch (apiError: any) {
      console.error('[Events Store] Fetch today schedule error:', apiError)
      return false
    }
  }
  
  const createEvent = async (eventData: CreateEventData): Promise<Event | null> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await EventsApiService.createEvent(eventData)
      
      if (response.data) {
        // Add to beginning of list
        events.value.unshift(response.data)
        pagination.value.total++
        
        return response.data
      }
      
      return null
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al crear evento'
      console.error('[Events Store] Create event error:', apiError)
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  const updateEvent = async (eventId: string, eventData: Partial<CreateEventData>): Promise<Event | null> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await EventsApiService.updateEvent(eventId, eventData)
      
      if (response.data) {
        // Update in list
        const index = events.value.findIndex(e => e.id === eventId)
        if (index !== -1) {
          events.value[index] = response.data
        }
        
        // Update current event if it's the same
        if (currentEvent.value?.id === eventId) {
          currentEvent.value = response.data
        }
        
        return response.data
      }
      
      return null
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al actualizar evento'
      console.error('[Events Store] Update event error:', apiError)
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  const deleteEvent = async (eventId: string): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      await EventsApiService.deleteEvent(eventId)
      
      // Remove from list
      const index = events.value.findIndex(e => e.id === eventId)
      if (index !== -1) {
        events.value.splice(index, 1)
        pagination.value.total--
      }
      
      // Remove from today events
      const todayIndex = todayEvents.value.findIndex(e => e.id === eventId)
      if (todayIndex !== -1) {
        todayEvents.value.splice(todayIndex, 1)
      }
      
      // Clear current event if it's the same
      if (currentEvent.value?.id === eventId) {
        currentEvent.value = null
      }
      
      return true
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al eliminar evento'
      console.error('[Events Store] Delete event error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const applyEventOverride = async (eventId: string, overrideData: EventOverrideData): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await EventsApiService.applyEventOverride(eventId, overrideData)
      
      if (response.data) {
        // Update in list
        const index = events.value.findIndex(e => e.id === eventId)
        if (index !== -1) {
          events.value[index] = response.data
        }
        
        // Update in today events
        const todayIndex = todayEvents.value.findIndex(e => e.id === eventId)
        if (todayIndex !== -1) {
          todayEvents.value[todayIndex] = response.data
        }
        
        // Update current event if it's the same
        if (currentEvent.value?.id === eventId) {
          currentEvent.value = response.data
        }
        
        return true
      }
      
      return false
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al aplicar override'
      console.error('[Events Store] Apply override error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const removeEventOverride = async (eventId: string): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await EventsApiService.removeEventOverride(eventId)
      
      if (response.data) {
        // Update in list
        const index = events.value.findIndex(e => e.id === eventId)
        if (index !== -1) {
          events.value[index] = response.data
        }
        
        // Update in today events
        const todayIndex = todayEvents.value.findIndex(e => e.id === eventId)
        if (todayIndex !== -1) {
          todayEvents.value[todayIndex] = response.data
        }
        
        // Update current event if it's the same
        if (currentEvent.value?.id === eventId) {
          currentEvent.value = response.data
        }
        
        return true
      }
      
      return false
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al remover override'
      console.error('[Events Store] Remove override error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchEventsByDateRange = async (startDate: string, endDate: string): Promise<Event[]> => {
    try {
      const response = await EventsApiService.getEventsByDateRange(startDate, endDate)
      return response.data || []
    } catch (apiError: any) {
      console.error('[Events Store] Fetch events by date range error:', apiError)
      return []
    }
  }
  
  const importEvents = async (
    source: 'puy_du_fou' | 'manual',
    dateRange?: { startDate: string; endDate: string }
  ): Promise<{ imported: number; updated: number; errors: string[] } | null> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await EventsApiService.importEvents(source, dateRange)
      
      if (response.data) {
        // Refresh events list after import
        await fetchEvents()
        await fetchTodaySchedule()
        
        return response.data
      }
      
      return null
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al importar eventos'
      console.error('[Events Store] Import events error:', apiError)
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  const recalculateStatuses = async (): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await EventsApiService.recalculateStatuses()
      
      if (response.data) {
        // Refresh events after recalculation
        await fetchEvents()
        await fetchTodaySchedule()
        
        return true
      }
      
      return false
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al recalcular estados'
      console.error('[Events Store] Recalculate statuses error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  // Utility actions
  const clearError = (): void => {
    error.value = null
  }
  
  const clearCurrentEvent = (): void => {
    currentEvent.value = null
  }
  
  const setFilters = (newFilters: Partial<EventsListParams>): void => {
    filters.value = { ...filters.value, ...newFilters }
  }
  
  const resetFilters = (): void => {
    filters.value = {
      page: 1,
      limit: 50,
      date: '',
      showId: '',
      status: '',
      venue: ''
    }
  }
  
  // Find events by criteria
  const findEventsByShow = (showId: string): Event[] => {
    return events.value.filter(event => event.showId === showId)
  }
  
  const findEventsByDate = (date: string): Event[] => {
    return events.value.filter(event => event.date === date)
  }
  
  const findEventsByVenue = (venue: string): Event[] => {
    return events.value.filter(event => event.venue === venue)
  }
  
  const findEventsByStatus = (status: string): Event[] => {
    return events.value.filter(event => event.status === status)
  }

  return {
    // State
    events,
    currentEvent,
    todayEvents,
    pagination,
    filters,
    isLoading,
    error,
    
    // Computed
    eventsByStatus,
    activeEvents,
    upcomingEvents,
    eventsWithOverrides,
    currentlyRunningEvents,
    nextEvents,
    eventsStats,
    
    // Actions
    fetchEvents,
    fetchEvent,
    fetchTodaySchedule,
    createEvent,
    updateEvent,
    deleteEvent,
    applyEventOverride,
    removeEventOverride,
    fetchEventsByDateRange,
    importEvents,
    recalculateStatuses,
    
    // Utility actions
    clearError,
    clearCurrentEvent,
    setFilters,
    resetFilters,
    findEventsByShow,
    findEventsByDate,
    findEventsByVenue,
    findEventsByStatus
  }
})