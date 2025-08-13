/**
 * Types Index
 * Exports all types for easy importing
 * Uses named exports to avoid conflicts between API and frontend types
 */

// Export API types with explicit names to avoid conflicts
export type {
  User,
  LoginCredentials,
  AuthTokens,
  AuthResponse,
  Show as ApiShow,
  ShowsListParams,
  CreateShowData,
  Event as ApiEvent,
  EventsListParams,
  CreateEventData,
  EventOverrideData,
  GlobalAlert,
  CreateAlertData,
  SystemConfig,
  UpdateConfigData,
  GlobalConfiguration,
  DashboardMetrics,
  SystemHealth,
  ApiResponse,
  PaginatedResponse,
  ApiError,
  ApiMethod,
  ApiRequestConfig
} from './api'

// Export Show/Event types as primary frontend types
export * from './show'