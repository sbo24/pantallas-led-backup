/**
 * Show Types
 * Definitions for Show entities and related types
 */

export type ShowStatus = 'PROGRAMADO' | 'ABIERTO' | 'CERRADO' | 'CANCELADO'

export interface Show {
  id: string
  name: string
  status: ShowStatus
  venue: string
  capacity: number
  leadTimeMinutes: number
  description?: string
  createdAt: string
  updatedAt: string
  nextEvent?: string
  events?: Event[]
  overrides?: ShowOverride[]
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
  shows: Show[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}