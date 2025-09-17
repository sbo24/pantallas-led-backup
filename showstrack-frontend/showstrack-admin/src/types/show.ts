/**
 * Show Types
 * Definitions for Show entities and related types
 */

export type ShowStatus = 'PROGRAMADO' | 'ABIERTO' | 'CERRADO' | 'CANCELADO'

export interface EventPass {
  start_time: string
  status: ShowStatus
  status_color: string
  event_date: string
}

export interface Show {
  id: number
  name: string
  description?: string | null
  duration_estimated?: number | null
  is_visible: boolean
  display_order: number
  custom_lead_time_access_minutes?: number | null
  custom_lead_time_finalized_minutes?: number | null
  selected_icon_filename?: string | null
  created_at?: string
  updated_at?: string
  current_events_count?: number
  // Campos adicionales para compatibilidad con API pública
  current_pass?: EventPass | null
  next_pass?: EventPass | null
  venue?: string
  capacity?: number
  leadTimeMinutes?: number
  createdAt?: string
  updatedAt?: string
}

export interface Event {
  id: string
  showId: string
  scheduledTime: string
  actualStartTime?: string
  actualEndTime?: string
  status: EventStatus
  capacity?: number
}

export type EventStatus = 'SCHEDULED' | 'STARTED' | 'ENDED' | 'CANCELLED'

export interface ShowOverride {
  id: string
  showId: string
  overrideType: OverrideType
  targetStatus: ShowStatus
  activeFrom: string
  activeTo?: string
  reason: string
  createdBy: string
  createdAt: string
}

export type OverrideType = 'MANUAL' | 'SCHEDULED' | 'TEMPORARY'

export interface ShowFilters {
  status?: ShowStatus[]
  venue?: string[]
  capacity?: {
    min?: number
    max?: number
  }
  dateRange?: {
    start?: string
    end?: string
  }
  search?: string
}

export interface CreateShowRequest {
  name: string
  venue: string
  capacity: number
  leadTimeMinutes: number
  description?: string
}

export interface UpdateShowRequest {
  name?: string
  venue?: string
  capacity?: number
  leadTimeMinutes?: number
  description?: string
}

export interface ShowResponse {
  show: Show
  message?: string
}

export interface ShowListResponse {
  items: Show[]
  total: number
  page: number
  size: number
  pages: number
}