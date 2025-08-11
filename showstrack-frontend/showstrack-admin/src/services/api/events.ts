// Events API Service - ShowsTrack Frontend
// Events management endpoints implementation

import { apiGet, apiPost, apiPut, apiDelete } from './client'
import type { Event, EventsListParams, CreateEventData, EventOverrideData, ApiResponse, PaginatedResponse } from '@/types/api'

export class EventsApiService {
  // Get paginated list of events
  static async getEvents(params?: EventsListParams): Promise<ApiResponse<PaginatedResponse<Event>>> {
    return apiGet<PaginatedResponse<Event>>('/api/admin/events', params)
  }

  // Get single event by ID
  static async getEvent(eventId: string): Promise<ApiResponse<Event>> {
    return apiGet<Event>(`/api/admin/events/${eventId}`)
  }

  // Create new event
  static async createEvent(eventData: CreateEventData): Promise<ApiResponse<Event>> {
    return apiPost<Event>('/api/admin/events', eventData)
  }

  // Update existing event
  static async updateEvent(eventId: string, eventData: Partial<CreateEventData>): Promise<ApiResponse<Event>> {
    return apiPut<Event>(`/api/admin/events/${eventId}`, eventData)
  }

  // Delete event
  static async deleteEvent(eventId: string): Promise<ApiResponse<null>> {
    return apiDelete<null>(`/api/admin/events/${eventId}`)
  }

  // Apply manual override to event
  static async applyEventOverride(eventId: string, overrideData: EventOverrideData): Promise<ApiResponse<Event>> {
    return apiPost<Event>(`/api/admin/events/${eventId}/override`, overrideData)
  }

  // Remove override from event
  static async removeEventOverride(eventId: string): Promise<ApiResponse<Event>> {
    return apiDelete<Event>(`/api/admin/events/${eventId}/override`)
  }

  // Get events for public display (no auth required)
  static async getPublicEvents(date?: string, showId?: string): Promise<ApiResponse<Event[]>> {
    const params: Record<string, string> = {}
    if (date) params.date = date
    if (showId) params.show_id = showId
    
    return apiGet<Event[]>('/api/public/events', params)
  }

  // Get today's schedule for public display
  static async getTodaySchedule(): Promise<ApiResponse<Event[]>> {
    return apiGet<Event[]>('/api/public/schedule/today')
  }

  // Get events by date range
  static async getEventsByDateRange(startDate: string, endDate: string): Promise<ApiResponse<Event[]>> {
    return apiGet<Event[]>('/api/admin/events/range', {
      start_date: startDate,
      end_date: endDate
    })
  }

  // Get events with active overrides
  static async getEventsWithOverrides(): Promise<ApiResponse<Event[]>> {
    return apiGet<Event[]>('/api/admin/events/overrides')
  }

  // Bulk update events
  static async bulkUpdateEvents(updates: Array<{
    eventId: string
    data: Partial<CreateEventData>
  }>): Promise<ApiResponse<{ updated: number; errors: string[] }>> {
    return apiPost<{ updated: number; errors: string[] }>('/api/admin/events/bulk-update', {
      updates
    })
  }

  // Import events from external source
  static async importEvents(
    source: 'puy_du_fou' | 'manual',
    dateRange?: { startDate: string; endDate: string }
  ): Promise<ApiResponse<{ imported: number; updated: number; errors: string[] }>> {
    return apiPost<{ imported: number; updated: number; errors: string[] }>('/api/admin/events/import', {
      source,
      date_range: dateRange
    })
  }

  // Get events statistics
  static async getEventsStats(date?: string): Promise<ApiResponse<{
    total: number
    byStatus: Record<string, number>
    withOverrides: number
    upcomingToday: number
  }>> {
    return apiGet<{
      total: number
      byStatus: Record<string, number>
      withOverrides: number
      upcomingToday: number
    }>('/api/admin/events/stats', date ? { date } : undefined)
  }

  // Force recalculation of event statuses
  static async recalculateStatuses(): Promise<ApiResponse<{ updated: number }>> {
    return apiPost<{ updated: number }>('/api/admin/events/recalculate-statuses')
  }
}

export default EventsApiService