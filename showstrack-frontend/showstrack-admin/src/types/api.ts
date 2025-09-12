// API Types - ShowsTrack Frontend
// Generated from backend specification

// ==========================================
// AUTHENTICATION TYPES
// ==========================================

export interface User {
  id: string
  username: string
  email: string
  roles: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

export interface AuthResponse {
  user: User
  tokens: AuthTokens
}

// ==========================================
// SHOWS TYPES
// ==========================================

export interface Show {
  id: string
  name: string
  description?: string
  duration: number
  capacity: number
  venue: string
  isActive: boolean
  leadTimeMinutes: number
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface ShowsListParams {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
  venue?: string
  [key: string]: unknown
}

export interface CreateShowData {
  name: string
  description?: string
  duration: number
  capacity: number
  venue: string
  isActive?: boolean
  leadTimeMinutes?: number
  displayOrder?: number
}

// ==========================================
// EVENTS TYPES
// ==========================================

export interface Event {
  id: string
  showId: string
  showName: string
  date: string
  startTime: string
  endTime: string
  status: 'PROGRAMADO' | 'ABIERTO' | 'CERRADO' | 'CANCELADO'
  calculatedStatus: 'PROGRAMADO' | 'ABIERTO' | 'CERRADO' | 'CANCELADO'
  hasOverride: boolean
  overrideStatus?: string
  overrideReason?: string
  capacity: number
  venue: string
  createdAt: string
  updatedAt: string
}

export interface EventsListParams {
  page?: number
  limit?: number
  date?: string
  showId?: string
  status?: string
  venue?: string
  [key: string]: unknown
}

export interface CreateEventData {
  showId: string
  date: string
  startTime: string
  endTime: string
  capacity?: number
}

export interface EventOverrideData {
  status: 'PROGRAMADO' | 'ABIERTO' | 'CERRADO' | 'CANCELADO'
  reason: string
}

// ==========================================
// ALERTS TYPES
// ==========================================

export interface GlobalAlert {
  id: number
  message: string
  alert_type: 'emergency' | 'warning' | 'info'
  is_active: boolean
  activated_at: string
  deactivated_at?: string
  created_by: string
  created_at: string
}

export interface CreateAlertData {
  message: string
  alert_type?: 'emergency' | 'warning' | 'info'
}

// ==========================================
// CONFIGURATION TYPES
// ==========================================

export interface SystemConfig {
  id: string
  key: string
  value: string | number | boolean
  description: string
  type: 'string' | 'number' | 'boolean' | 'json'
  category: string
  isEditable: boolean
  updatedAt: string
}

export interface UpdateConfigData {
  value: string | number | boolean
}

export interface GlobalConfiguration {
  defaultLeadTimeMinutes: number
  operationMode: 'automatic' | 'manual'
  venueOpenTime: string
  venueCloseTime: string
  displayRefreshSeconds: number
  maxConcurrentOverrides: number
  alertRetentionDays: number
}

// ==========================================
// DASHBOARD TYPES
// ==========================================

export interface DashboardMetrics {
  totalShows: number
  activeShows: number
  todayEvents: number
  activeOverrides: number
  activeAlerts: number
  systemStatus: 'operational' | 'warning' | 'error'
  lastSyncTime: string
}

export interface SystemHealth {
  database: 'healthy' | 'warning' | 'error'
  apiResponse: 'healthy' | 'warning' | 'error'
  externalSync: 'healthy' | 'warning' | 'error'
  uptime: number
}

// ==========================================
// GENERIC API TYPES
// ==========================================

export interface ApiResponse<T> {
  data: T
  status: number
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface ApiError {
  status: number
  message: string
  details?: unknown
  code?: string
}

// ==========================================
// REQUEST/RESPONSE HELPERS
// ==========================================

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface ApiRequestConfig {
  method: ApiMethod
  url: string
  data?: unknown
  params?: Record<string, unknown>
  headers?: Record<string, string>
}

// ==========================================
// IMPORT/ETL TYPES
// ==========================================

export interface ImportEvent {
  external_event_id: string
  show_name: string
  event_date: string
  start_time: string
  end_time: string
  duration_minutes: number
  event_type: 'show' | 'system'
}

export interface ImportMetadata {
  extraction_time: string
  total_events: number
  source: 'manual_upload' | 'puy_du_fou_api' | 'external'
  extraction_summary: {
    events_by_show: Record<string, number>
    events_by_type: Record<string, number>
    unique_shows: number
  }
}

export interface ImportData {
  metadata: ImportMetadata
  events: ImportEvent[]
}

export interface ImportResponse {
  import_id: string
  status: 'success' | 'partial' | 'failed'
  imported: number
  updated: number
  errors: string[]
  warnings: string[]
  processing_time_ms: number
}

export interface ImportPreview {
  validation_result: {
    is_valid: boolean
    total_events: number
    new_events: number
    updated_events: number
    conflicted_events: number
    skipped_events: number
    conflicts: ImportConflict[]
    warnings: string[]
    errors: string[]
  }
  preview_summary: {
    total_events: number
    new_events: number
    updated_events: number
    conflicted_events: number
    operation_mode: 'automatic' | 'manual'
  }
  would_be_applied: boolean
  estimated_execution_time: number
}

export interface ImportConflict {
  external_event_id: string
  type: string
  message: string
  current_status?: string
  show_name: string
}

export interface ImportHistory {
  id: string
  import_date: string
  source: string
  status: 'success' | 'partial' | 'failed'
  imported_count: number
  updated_count: number
  error_count: number
  filename?: string
  user_id: string
  processing_time_ms: number
}

export interface FileUploadState {
  isDragOver: boolean
  isUploading: boolean
  uploadProgress: number
  selectedFile: File | null
  validationResults: ImportPreview | null
  error: string | null
}