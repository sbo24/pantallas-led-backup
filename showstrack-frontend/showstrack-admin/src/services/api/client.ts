// API Client - ShowsTrack Frontend
// Axios base configuration with JWT interceptors and error handling

import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios'
import type { ApiError, ApiResponse } from '@/types/api'

// Environment configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const API_TIMEOUT = 30000 // 30 seconds

// Token storage keys
const ACCESS_TOKEN_KEY = 'showstrack_access_token'
const REFRESH_TOKEN_KEY = 'showstrack_refresh_token'

// Token management utilities
export const tokenStorage = {
  getAccessToken: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  },
  clearTokens: (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

// Create Axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// Request interceptor - Add JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = tokenStorage.getAccessToken()
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add request timestamp for debugging
    if (import.meta.env.DEV) {
      ;(config as any).metadata = { startTime: new Date() }
    }
    
    return config
  },
  (error: AxiosError): Promise<AxiosError> => {
    console.error('[API Request Error]:', error)
    return Promise.reject(error)
  }
)

// Flag to prevent multiple refresh attempts
let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

// Add refresh subscriber
const subscribeTokenRefresh = (callback: (token: string) => void): void => {
  refreshSubscribers.push(callback)
}

// Process refresh queue
const onRefreshToken = (token: string): void => {
  refreshSubscribers.forEach(callback => callback(token))
  refreshSubscribers = []
}

// Token refresh function
const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = tokenStorage.getRefreshToken()
    
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }
    
    const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
      refresh_token: refreshToken
    })
    
    const { access_token, refresh_token: newRefreshToken } = response.data
    
    // Update stored tokens
    tokenStorage.setTokens(access_token, newRefreshToken)
    
    return access_token
  } catch (error) {
    console.error('[Token Refresh Error]:', error)
    tokenStorage.clearTokens()
    
    // Redirect to login if in browser environment
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    
    return null
  }
}

// Response interceptor - Handle token refresh and errors
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    // Log response time in development
    if (import.meta.env.DEV && (response.config as any).metadata?.startTime) {
      const duration = new Date().getTime() - (response.config as any).metadata.startTime.getTime()
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`)
    }
    
    return response
  },
  async (error: AxiosError): Promise<AxiosResponse | Promise<never>> => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    
    // Handle 401 Unauthorized - Token refresh logic
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, wait for new token
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            resolve(apiClient(originalRequest))
          })
        })
      }
      
      originalRequest._retry = true
      isRefreshing = true
      
      try {
        const newToken = await refreshAccessToken()
        
        if (newToken) {
          isRefreshing = false
          onRefreshToken(newToken)
          
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
          }
          
          return apiClient(originalRequest)
        }
      } catch (refreshError) {
        isRefreshing = false
        tokenStorage.clearTokens()
        return Promise.reject(refreshError)
      }
    }
    
    // Handle other HTTP errors
    const apiError: ApiError = {
      status: error.response?.status || 500,
      message: (error.response?.data as any)?.message || error.message || 'Unknown API error',
      details: error.response?.data,
      code: (error.response?.data as any)?.code || error.code
    }
    
    // Log error in development
    if (import.meta.env.DEV) {
      console.error('[API Error]:', {
        status: apiError.status,
        message: apiError.message,
        url: originalRequest.url,
        method: originalRequest.method,
        details: apiError.details
      })
    }
    
    return Promise.reject(apiError)
  }
)

// API response wrapper
export const apiRequest = async <T>(
  config: Parameters<typeof apiClient.request>[0]
): Promise<ApiResponse<T>> => {
  try {
    const response = await apiClient.request<T>(config)
    
    return {
      data: response.data,
      status: response.status,
      message: response.data && typeof response.data === 'object' && 'message' in response.data 
        ? (response.data as any).message 
        : undefined
    }
  } catch (error) {
    // Re-throw ApiError for consistent error handling
    throw error as ApiError
  }
}

// HTTP method helpers
export const apiGet = async <T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> => {
  return apiRequest<T>({ method: 'GET', url, params })
}

export const apiPost = async <T>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
  return apiRequest<T>({ method: 'POST', url, data })
}

export const apiPut = async <T>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
  return apiRequest<T>({ method: 'PUT', url, data })
}

export const apiPatch = async <T>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
  return apiRequest<T>({ method: 'PATCH', url, data })
}

export const apiDelete = async <T>(url: string): Promise<ApiResponse<T>> => {
  return apiRequest<T>({ method: 'DELETE', url })
}

// Export configured client for advanced usage
export default apiClient