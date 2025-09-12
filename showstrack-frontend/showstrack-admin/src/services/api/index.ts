// API Services Index - ShowsTrack Frontend
// Centralized exports for all API services

export { default as AuthApiService } from './auth'
export { default as ShowsApiService } from './shows'
export { default as EventsApiService } from './events'
export { default as AlertsApiService } from './alerts'
export { default as ConfigApiService } from './config'
export { default as DashboardApiService } from './dashboard'
export { default as ImportApiService } from './import'

// Re-export client utilities
export { 
  apiGet, 
  apiPost, 
  apiPut, 
  apiPatch, 
  apiDelete, 
  apiRequest,
  tokenStorage 
} from './client'

// Re-export types
export type * from '@/types/api'