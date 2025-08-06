// Events Store Tests - ShowsTrack Frontend  
// Tests for events management store functionality

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEventsStore } from '../events'
import EventsApiService from '@/services/api/events'
import type { Event, EventsListParams, CreateEventData, UpdateEventData, ApiResponse } from '@/types/api'

// Mock API service
vi.mock('@/services/api/events')
const mockEventsApiService = EventsApiService as {
  getEvents: MockedFunction<any>
  getEvent: MockedFunction<any>
  createEvent: MockedFunction<any>
  updateEvent: MockedFunction<any>
  deleteEvent: MockedFunction<any>
  bulkUpdateEventStatus: MockedFunction<any>
  setEventOverride: MockedFunction<any>
  clearEventOverride: MockedFunction<any>
}

describe('Events Store', () => {
  let mockEvent: Event

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    mockEvent = {
      id: 'event-1',
      showId: 'show-1',
      showName: 'Test Show',
      date: '2024-12-25',
      time: '20:00:00',
      scheduledStart: '2024-12-25T20:00:00Z',
      scheduledEnd: '2024-12-25T21:30:00Z',
      status: 'PROGRAMADO',
      calculatedStatus: 'PROGRAMADO',
      hasOverride: false,
      overrideStatus: null,
      overrideReason: null,
      leadTimeMinutes: 30,
      venue: 'Main Theater',
      maxCapacity: 2000,
      estimatedAttendance: 1800,
      weatherDependent: false,
      isActive: true,
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z'
    }
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useEventsStore()
      
      expect(store.events).toEqual([])
      expect(store.currentEvent).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.pagination).toEqual({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      })
      expect(store.activeFilters).toEqual({})
    })

    it('should compute stats correctly', () => {
      const store = useEventsStore()
      
      // Initially empty
      expect(store.eventsStats).toEqual({
        total: 0,
        today: 0,
        upcoming: 0,
        byStatus: {},
        withOverrides: 0,
        avgAttendance: 0
      })
      
      // Add events
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      store.events = [
        { ...mockEvent, date: today, status: 'ABIERTO', estimatedAttendance: 1500 },
        { ...mockEvent, id: 'event-2', date: tomorrow, status: 'PROGRAMADO', hasOverride: true, estimatedAttendance: 2000 },
        { ...mockEvent, id: 'event-3', date: tomorrow, status: 'CERRADO', estimatedAttendance: 1800 }
      ]
      
      const stats = store.eventsStats
      expect(stats.total).toBe(3)
      expect(stats.today).toBe(1)
      expect(stats.upcoming).toBe(2)
      expect(stats.byStatus.ABIERTO).toBe(1)
      expect(stats.byStatus.PROGRAMADO).toBe(1)
      expect(stats.byStatus.CERRADO).toBe(1)
      expect(stats.withOverrides).toBe(1)
      expect(stats.avgAttendance).toBe(1766) // (1500 + 2000 + 1800) / 3
    })
  })

  describe('Events Fetching', () => {
    it('should fetch events successfully', async () => {
      const store = useEventsStore()
      const mockEvents = [mockEvent]
      
      mockEventsApiService.getEvents.mockResolvedValueOnce({
        data: {
          events: mockEvents,
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1
        },
        status: 200
      } as ApiResponse<{
        events: Event[]
        total: number
        page: number
        limit: number
        totalPages: number
      }>)
      
      const result = await store.fetchEvents()
      
      expect(result).toBe(true)
      expect(store.events).toEqual(mockEvents)
      expect(store.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      })
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should handle fetch events failure', async () => {
      const store = useEventsStore()
      
      mockEventsApiService.getEvents.mockRejectedValueOnce({
        message: 'Failed to fetch events',
        status: 500
      })
      
      const result = await store.fetchEvents()
      
      expect(result).toBe(false)
      expect(store.events).toEqual([])
      expect(store.error).toBe('Failed to fetch events')
      expect(store.isLoading).toBe(false)
    })

    it('should fetch events with filters and update active filters', async () => {
      const store = useEventsStore()
      const filters: EventsListParams = {
        date: '2024-12-25',
        status: 'ABIERTO',
        showId: 'show-1',
        page: 1,
        limit: 20
      }
      
      mockEventsApiService.getEvents.mockResolvedValueOnce({
        data: {
          events: [mockEvent],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1
        },
        status: 200
      })
      
      await store.fetchEvents(filters)
      
      expect(mockEventsApiService.getEvents).toHaveBeenCalledWith(filters)
      expect(store.activeFilters).toEqual(filters)
    })

    it('should fetch single event successfully', async () => {
      const store = useEventsStore()
      
      mockEventsApiService.getEvent.mockResolvedValueOnce({
        data: mockEvent,
        status: 200
      } as ApiResponse<Event>)
      
      const result = await store.fetchEvent('event-1')
      
      expect(result).toEqual(mockEvent)
      expect(store.currentEvent).toEqual(mockEvent)
      expect(store.error).toBeNull()
    })
  })

  describe('Event Management', () => {
    it('should create event successfully', async () => {
      const store = useEventsStore()
      const createData: CreateEventData = {
        showId: 'show-1',
        date: '2024-12-26',
        time: '19:00:00',
        leadTimeMinutes: 30,
        estimatedAttendance: 1500,
        weatherDependent: false
      }
      
      const createdEvent = { ...mockEvent, ...createData, id: 'event-new' }
      
      mockEventsApiService.createEvent.mockResolvedValueOnce({
        data: createdEvent,
        status: 201
      } as ApiResponse<Event>)
      
      const result = await store.createEvent(createData)
      
      expect(result).toEqual(createdEvent)
      expect(store.events).toContain(createdEvent)
      expect(store.error).toBeNull()
    })

    it('should update event successfully', async () => {
      const store = useEventsStore()
      store.events = [mockEvent]
      
      const updateData: UpdateEventData = {
        time: '19:30:00',
        estimatedAttendance: 1900
      }
      
      const updatedEvent = { ...mockEvent, ...updateData }
      
      mockEventsApiService.updateEvent.mockResolvedValueOnce({
        data: updatedEvent,
        status: 200
      } as ApiResponse<Event>)
      
      const result = await store.updateEvent('event-1', updateData)
      
      expect(result).toEqual(updatedEvent)
      expect(store.events[0]).toEqual(updatedEvent)
      expect(store.error).toBeNull()
    })

    it('should delete event successfully', async () => {
      const store = useEventsStore()
      store.events = [mockEvent]
      store.currentEvent = mockEvent
      
      mockEventsApiService.deleteEvent.mockResolvedValueOnce({
        data: { message: 'Event deleted' },
        status: 200
      })
      
      const result = await store.deleteEvent('event-1')
      
      expect(result).toBe(true)
      expect(store.events).toEqual([])
      expect(store.currentEvent).toBeNull()
      expect(store.error).toBeNull()
    })
  })

  describe('Event Status Override', () => {
    it('should set event override successfully', async () => {
      const store = useEventsStore()
      store.events = [mockEvent]
      
      const overrideData = {
        status: 'CANCELADO' as const,
        reason: 'Technical issues'
      }
      
      const overriddenEvent = {
        ...mockEvent,
        hasOverride: true,
        overrideStatus: 'CANCELADO' as const,
        overrideReason: 'Technical issues'
      }
      
      mockEventsApiService.setEventOverride.mockResolvedValueOnce({
        data: overriddenEvent,
        status: 200
      } as ApiResponse<Event>)
      
      const result = await store.setEventOverride('event-1', overrideData.status, overrideData.reason)
      
      expect(result).toEqual(overriddenEvent)
      expect(store.events[0].hasOverride).toBe(true)
      expect(store.events[0].overrideStatus).toBe('CANCELADO')
      expect(store.events[0].overrideReason).toBe('Technical issues')
    })

    it('should clear event override successfully', async () => {
      const store = useEventsStore()
      const eventWithOverride = {
        ...mockEvent,
        hasOverride: true,
        overrideStatus: 'CANCELADO' as const,
        overrideReason: 'Technical issues'
      }
      store.events = [eventWithOverride]
      
      const clearedEvent = {
        ...mockEvent,
        hasOverride: false,
        overrideStatus: null,
        overrideReason: null
      }
      
      mockEventsApiService.clearEventOverride.mockResolvedValueOnce({
        data: clearedEvent,
        status: 200
      } as ApiResponse<Event>)
      
      const result = await store.clearEventOverride('event-1')
      
      expect(result).toEqual(clearedEvent)
      expect(store.events[0].hasOverride).toBe(false)
      expect(store.events[0].overrideStatus).toBeNull()
      expect(store.events[0].overrideReason).toBeNull()
    })
  })

  describe('Bulk Operations', () => {
    it('should perform bulk status update successfully', async () => {
      const store = useEventsStore()
      const event1 = { ...mockEvent, id: 'event-1', isActive: true }
      const event2 = { ...mockEvent, id: 'event-2', isActive: true }
      store.events = [event1, event2]
      
      const eventIds = ['event-1', 'event-2']
      const updatedEvents = [
        { ...event1, isActive: false },
        { ...event2, isActive: false }
      ]
      
      mockEventsApiService.bulkUpdateEventStatus.mockResolvedValueOnce({
        data: {
          updated: 2,
          events: updatedEvents
        },
        status: 200
      })
      
      const result = await store.bulkUpdateStatus(eventIds, false)
      
      expect(result).toBe(true)
      expect(store.events[0].isActive).toBe(false)
      expect(store.events[1].isActive).toBe(false)
      expect(store.error).toBeNull()
    })
  })

  describe('Filtering and Search', () => {
    beforeEach(() => {
      const store = useEventsStore()
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      store.events = [
        { ...mockEvent, id: 'event-1', date: today, status: 'ABIERTO', showName: 'Magic Show' },
        { ...mockEvent, id: 'event-2', date: tomorrow, status: 'PROGRAMADO', showName: 'Dance Performance' },
        { ...mockEvent, id: 'event-3', date: tomorrow, status: 'CERRADO', showName: 'Magic Show Evening', hasOverride: true }
      ]
    })

    it('should filter events by status', () => {
      const store = useEventsStore()
      
      const openEvents = store.getEventsByStatus('ABIERTO')
      const scheduledEvents = store.getEventsByStatus('PROGRAMADO')
      const closedEvents = store.getEventsByStatus('CERRADO')
      
      expect(openEvents).toHaveLength(1)
      expect(scheduledEvents).toHaveLength(1)
      expect(closedEvents).toHaveLength(1)
    })

    it('should filter events by date', () => {
      const store = useEventsStore()
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const todayEvents = store.getEventsByDate(today)
      const tomorrowEvents = store.getEventsByDate(tomorrow)
      
      expect(todayEvents).toHaveLength(1)
      expect(tomorrowEvents).toHaveLength(2)
    })

    it('should get events with overrides', () => {
      const store = useEventsStore()
      
      const eventsWithOverrides = store.eventsWithOverrides
      
      expect(eventsWithOverrides).toHaveLength(1)
      expect(eventsWithOverrides[0].hasOverride).toBe(true)
    })

    it('should search events by show name', () => {
      const store = useEventsStore()
      
      const magicShows = store.getFilteredEvents('Magic')
      
      expect(magicShows).toHaveLength(2)
      expect(magicShows.every(event => event.showName.includes('Magic'))).toBe(true)
    })

    it('should get today events', () => {
      const store = useEventsStore()
      
      const todayEvents = store.todayEvents
      
      expect(todayEvents).toHaveLength(1)
    })

    it('should get upcoming events', () => {
      const store = useEventsStore()
      
      const upcomingEvents = store.upcomingEvents
      
      expect(upcomingEvents).toHaveLength(2)
    })
  })

  describe('Utility Functions', () => {
    it('should clear error', () => {
      const store = useEventsStore()
      
      store.error = 'Some error'
      expect(store.error).toBe('Some error')
      
      store.clearError()
      expect(store.error).toBeNull()
    })

    it('should clear current event', () => {
      const store = useEventsStore()
      
      store.currentEvent = mockEvent
      expect(store.currentEvent).toEqual(mockEvent)
      
      store.clearCurrentEvent()
      expect(store.currentEvent).toBeNull()
    })

    it('should clear filters', () => {
      const store = useEventsStore()
      
      store.activeFilters = { date: '2024-12-25', status: 'ABIERTO' }
      expect(store.activeFilters).toEqual({ date: '2024-12-25', status: 'ABIERTO' })
      
      store.clearFilters()
      expect(store.activeFilters).toEqual({})
    })

    it('should refresh all data', async () => {
      const store = useEventsStore()
      const filters = { date: '2024-12-25' }
      store.activeFilters = filters
      
      mockEventsApiService.getEvents.mockResolvedValueOnce({
        data: {
          events: [mockEvent],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1
        },
        status: 200
      })
      
      await store.refreshAll()
      
      expect(mockEventsApiService.getEvents).toHaveBeenCalledWith(filters)
      expect(store.events).toEqual([mockEvent])
    })
  })

  describe('Computed Properties', () => {
    it('should check if events are available', () => {
      const store = useEventsStore()
      
      expect(store.hasEvents).toBe(false)
      
      store.events = [mockEvent]
      expect(store.hasEvents).toBe(true)
    })

    it('should check if filters are active', () => {
      const store = useEventsStore()
      
      expect(store.hasActiveFilters).toBe(false)
      
      store.activeFilters = { status: 'ABIERTO' }
      expect(store.hasActiveFilters).toBe(true)
    })

    it('should get active events', () => {
      const store = useEventsStore()
      store.events = [
        { ...mockEvent, id: 'event-1', isActive: true },
        { ...mockEvent, id: 'event-2', isActive: false }
      ]
      
      const activeEvents = store.activeEvents
      
      expect(activeEvents).toHaveLength(1)
      expect(activeEvents[0].isActive).toBe(true)
    })
  })
})