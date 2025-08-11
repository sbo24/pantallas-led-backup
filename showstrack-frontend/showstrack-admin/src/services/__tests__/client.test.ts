// API Client Tests - ShowsTrack Frontend
// Tests for base API client functionality, JWT handling, and interceptors

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import axios from 'axios'
import { apiRequest, apiGet, apiPost, apiPut, apiPatch, apiDelete, tokenStorage } from '../api/client'

// Mock axios
vi.mock('axios')
const mockedAxios = axios as any

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Mock window location for redirect tests
const mockLocation = {
  href: ''
}
Object.defineProperty(window, 'location', {
  value: mockLocation
})

describe('API Client', () => {
  let mockAxiosInstance: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.clear()
    mockLocation.href = ''
    
    // Create mock axios instance
    mockAxiosInstance = {
      create: vi.fn().mockReturnThis(),
      request: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn()
        },
        response: {
          use: vi.fn()
        }
      }
    }
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance)
    mockedAxios.post.mockResolvedValue({
      data: {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token'
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Token Storage', () => {
    it('should store and retrieve access token', () => {
      expect(tokenStorage.getAccessToken()).toBeNull()
      
      tokenStorage.setTokens('access-token', 'refresh-token')
      
      expect(tokenStorage.getAccessToken()).toBe('access-token')
      expect(tokenStorage.getRefreshToken()).toBe('refresh-token')
    })

    it('should clear tokens', () => {
      tokenStorage.setTokens('access-token', 'refresh-token')
      expect(tokenStorage.getAccessToken()).toBe('access-token')
      
      tokenStorage.clearTokens()
      
      expect(tokenStorage.getAccessToken()).toBeNull()
      expect(tokenStorage.getRefreshToken()).toBeNull()
    })
  })

  describe('API Request Wrapper', () => {
    it('should make successful API request', async () => {
      const responseData = { message: 'success' }
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: responseData,
        status: 200
      })
      
      const result = await apiRequest({
        method: 'GET',
        url: '/api/test'
      })
      
      expect(result).toEqual({
        data: responseData,
        status: 200,
        message: undefined
      })
    })

    it('should handle API request with message in response', async () => {
      const responseData = { message: 'Operation successful', data: [] }
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: responseData,
        status: 200
      })
      
      const result = await apiRequest({
        method: 'GET',
        url: '/api/test'
      })
      
      expect(result).toEqual({
        data: responseData,
        status: 200,
        message: 'Operation successful'
      })
    })

    it('should handle API request failure', async () => {
      const apiError = {
        status: 400,
        message: 'Bad request',
        details: { field: 'required' },
        code: 'VALIDATION_ERROR'
      }
      
      mockAxiosInstance.request.mockRejectedValueOnce(apiError)
      
      await expect(apiRequest({
        method: 'GET',
        url: '/api/test'
      })).rejects.toEqual(apiError)
    })
  })

  describe('HTTP Method Helpers', () => {
    beforeEach(() => {
      mockAxiosInstance.request.mockResolvedValue({
        data: { success: true },
        status: 200
      })
    })

    it('should make GET request', async () => {
      await apiGet('/api/test', { param: 'value' })
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/test',
        params: { param: 'value' }
      })
    })

    it('should make POST request', async () => {
      const data = { name: 'test' }
      await apiPost('/api/test', data)
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/test',
        data
      })
    })

    it('should make PUT request', async () => {
      const data = { id: 1, name: 'updated' }
      await apiPut('/api/test/1', data)
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/api/test/1',
        data
      })
    })

    it('should make PATCH request', async () => {
      const data = { name: 'patched' }
      await apiPatch('/api/test/1', data)
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'PATCH',
        url: '/api/test/1',
        data
      })
    })

    it('should make DELETE request', async () => {
      await apiDelete('/api/test/1')
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/api/test/1'
      })
    })
  })

  describe('Request Interceptor', () => {
    it('should add authorization header when token exists', () => {
      tokenStorage.setTokens('test-token', 'refresh-token')
      
      // Get the interceptor function
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0]
      
      const config = {
        headers: {}
      }
      
      const result = requestInterceptor(config)
      
      expect(result.headers.Authorization).toBe('Bearer test-token')
    })

    it('should not add authorization header when no token', () => {
      tokenStorage.clearTokens()
      
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0]
      
      const config = {
        headers: {}
      }
      
      const result = requestInterceptor(config)
      
      expect(result.headers.Authorization).toBeUndefined()
    })

    it('should add development metadata in dev environment', () => {
      // Mock development environment
      Object.defineProperty(import.meta, 'env', {
        value: { DEV: true },
        configurable: true
      })
      
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0]
      
      const config = {
        headers: {}
      }
      
      const result = requestInterceptor(config)
      
      expect(result.metadata).toBeDefined()
      expect(result.metadata.startTime).toBeInstanceOf(Date)
    })
  })

  describe('Response Interceptor - Token Refresh', () => {
    let responseInterceptor: any

    beforeEach(() => {
      // Get the response interceptor error handler
      responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1]
    })

    it('should refresh token on 401 error', async () => {
      tokenStorage.setTokens('old-access-token', 'old-refresh-token')
      
      const originalRequest = {
        headers: {},
        _retry: false
      }
      
      const error = {
        response: { status: 401 },
        config: originalRequest
      }
      
      // Mock successful token refresh
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token'
        }
      })
      
      // Mock successful retry request
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: { success: true },
        status: 200
      })
      
      const result = await responseInterceptor(error)
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/refresh'),
        { refresh_token: 'old-refresh-token' }
      )
      
      expect(tokenStorage.getAccessToken()).toBe('new-access-token')
      expect(tokenStorage.getRefreshToken()).toBe('new-refresh-token')
      
      expect(originalRequest.headers.Authorization).toBe('Bearer new-access-token')
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(originalRequest)
    })

    it('should redirect to login on refresh token failure', async () => {
      tokenStorage.setTokens('old-access-token', 'old-refresh-token')
      
      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: false }
      }
      
      // Mock failed token refresh
      mockedAxios.post.mockRejectedValueOnce(new Error('Refresh failed'))
      
      try {
        await responseInterceptor(error)
      } catch (e) {
        // Expected to throw
      }
      
      expect(tokenStorage.getAccessToken()).toBeNull()
      expect(tokenStorage.getRefreshToken()).toBeNull()
      expect(mockLocation.href).toBe('/login')
    })

    it('should not retry request that already failed retry', async () => {
      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: true }
      }
      
      const result = responseInterceptor(error)
      
      await expect(result).rejects.toEqual(expect.objectContaining({
        status: 401,
        message: expect.any(String)
      }))
    })

    it('should handle non-401 errors correctly', async () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        },
        config: { url: '/api/test', method: 'GET' },
        message: 'Request failed'
      }
      
      const result = responseInterceptor(error)
      
      await expect(result).rejects.toEqual({
        status: 500,
        message: 'Internal server error',
        details: { message: 'Internal server error' },
        code: undefined
      })
    })
  })

  describe('Response Interceptor - Success', () => {
    it('should log response time in development', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      // Mock development environment
      Object.defineProperty(import.meta, 'env', {
        value: { DEV: true },
        configurable: true
      })
      
      const successInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][0]
      
      const response = {
        config: {
          method: 'GET',
          url: '/api/test',
          metadata: {
            startTime: new Date(Date.now() - 100) // 100ms ago
          }
        }
      }
      
      const result = successInterceptor(response)
      
      expect(result).toBe(response)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[API Response] GET /api/test')
      )
      
      consoleLogSpy.mockRestore()
    })

    it('should pass through response without dev logging', () => {
      // Mock production environment
      Object.defineProperty(import.meta, 'env', {
        value: { DEV: false },
        configurable: true
      })
      
      const successInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][0]
      
      const response = {
        config: { method: 'GET', url: '/api/test' }
      }
      
      const result = successInterceptor(response)
      
      expect(result).toBe(response)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = {
        message: 'Network Error',
        code: 'NETWORK_ERROR'
      }
      
      mockAxiosInstance.request.mockRejectedValueOnce(networkError)
      
      await expect(apiRequest({
        method: 'GET',
        url: '/api/test'
      })).rejects.toEqual({
        status: 500,
        message: 'Network Error',
        details: undefined,
        code: 'NETWORK_ERROR'
      })
    })

    it('should handle timeout errors', async () => {
      const timeoutError = {
        message: 'timeout of 30000ms exceeded',
        code: 'ECONNABORTED'
      }
      
      mockAxiosInstance.request.mockRejectedValueOnce(timeoutError)
      
      await expect(apiRequest({
        method: 'GET',
        url: '/api/test'
      })).rejects.toEqual({
        status: 500,
        message: 'timeout of 30000ms exceeded',
        details: undefined,
        code: 'ECONNABORTED'
      })
    })

    it('should handle server errors with custom format', async () => {
      const serverError = {
        response: {
          status: 422,
          data: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            errors: [
              { field: 'name', message: 'Name is required' }
            ]
          }
        },
        message: 'Request failed with status code 422',
        code: undefined
      }
      
      mockAxiosInstance.request.mockRejectedValueOnce(serverError)
      
      await expect(apiRequest({
        method: 'POST',
        url: '/api/test',
        data: {}
      })).rejects.toEqual({
        status: 422,
        message: 'Validation failed',
        details: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: [
            { field: 'name', message: 'Name is required' }
          ]
        },
        code: 'VALIDATION_ERROR'
      })
    })
  })

  describe('Concurrent Token Refresh', () => {
    it('should queue concurrent requests during token refresh', async () => {
      tokenStorage.setTokens('old-access-token', 'old-refresh-token')
      
      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1]
      
      // Mock slow token refresh
      let refreshResolve: any
      const refreshPromise = new Promise((resolve) => {
        refreshResolve = resolve
      })
      
      mockedAxios.post.mockImplementation(() => refreshPromise)
      
      // Create two simultaneous 401 errors
      const error1 = {
        response: { status: 401 },
        config: { headers: {}, _retry: false, url: '/api/test1' }
      }
      
      const error2 = {
        response: { status: 401 },
        config: { headers: {}, _retry: false, url: '/api/test2' }
      }
      
      // Start both refresh attempts
      const promise1 = responseInterceptor(error1)
      const promise2 = responseInterceptor(error2)
      
      // Mock successful retry requests
      mockAxiosInstance.request.mockResolvedValue({
        data: { success: true },
        status: 200
      })
      
      // Complete the token refresh
      setTimeout(() => {
        refreshResolve({
          data: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token'
          }
        })
      }, 10)
      
      // Both should succeed
      const [result1, result2] = await Promise.all([promise1, promise2])
      
      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
      
      // Token refresh should only be called once
      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
    })
  })
})