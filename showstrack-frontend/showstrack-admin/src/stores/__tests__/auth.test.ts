// Auth Store Tests - ShowsTrack Frontend
// Tests for authentication store functionality

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { useAuthStore } from '../auth'
import AuthApiService from '@/services/api/auth'
import type { LoginCredentials, User, AuthTokens, ApiResponse } from '@/types/api'

// Mock API service
vi.mock('@/services/api/auth')
const mockAuthApiService = AuthApiService as {
  login: MockedFunction<any>
  refreshToken: MockedFunction<any>
  getProfile: MockedFunction<any>
  logout: MockedFunction<any>
}

// Mock token storage
const mockTokenStorage = {
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  setTokens: vi.fn(),
  clearTokens: vi.fn()
}

vi.mock('@/services/api/client', () => ({
  tokenStorage: mockTokenStorage
}))

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // Reset localStorage mock
    localStorage.clear()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useAuthStore()
      
      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.lastActivity).toBeNull()
    })

    it('should compute authentication status correctly', () => {
      const store = useAuthStore()
      
      // Initially not authenticated
      expect(store.isAuthenticated).toBe(false)
      
      // Set user - should be authenticated
      store.user = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        role: 'admin'
      }
      
      expect(store.isAuthenticated).toBe(true)
    })
  })

  describe('Authentication Actions', () => {
    it('should login successfully', async () => {
      const store = useAuthStore()
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      }
      
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        role: 'admin'
      }
      
      const mockTokens: AuthTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        tokenType: 'Bearer',
        expiresIn: 3600
      }
      
      mockAuthApiService.login.mockResolvedValueOnce({
        data: { user: mockUser, tokens: mockTokens },
        status: 200
      } as ApiResponse<{ user: User; tokens: AuthTokens }>)
      
      const result = await store.login(credentials)
      
      expect(result).toBe(true)
      expect(store.user).toEqual(mockUser)
      expect(store.isAuthenticated).toBe(true)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(mockTokenStorage.setTokens).toHaveBeenCalledWith(
        mockTokens.accessToken,
        mockTokens.refreshToken
      )
    })

    it('should handle login failure', async () => {
      const store = useAuthStore()
      const credentials: LoginCredentials = {
        email: 'wrong@example.com',
        password: 'wrongpassword'
      }
      
      mockAuthApiService.login.mockRejectedValueOnce({
        message: 'Invalid credentials',
        status: 401
      })
      
      const result = await store.login(credentials)
      
      expect(result).toBe(false)
      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBe('Invalid credentials')
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled()
    })

    it('should logout successfully', async () => {
      const store = useAuthStore()
      
      // Set initial authenticated state
      store.user = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        role: 'admin'
      }
      
      mockAuthApiService.logout.mockResolvedValueOnce({
        data: { message: 'Logged out successfully' },
        status: 200
      } as ApiResponse<{ message: string }>)
      
      await store.logout()
      
      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(store.error).toBeNull()
      expect(mockTokenStorage.clearTokens).toHaveBeenCalled()
    })

    it('should refresh token successfully', async () => {
      const store = useAuthStore()
      
      const mockTokens: AuthTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        tokenType: 'Bearer',
        expiresIn: 3600
      }
      
      mockTokenStorage.getRefreshToken.mockReturnValueOnce('old-refresh-token')
      mockAuthApiService.refreshToken.mockResolvedValueOnce({
        data: mockTokens,
        status: 200
      } as ApiResponse<AuthTokens>)
      
      const result = await store.refreshToken()
      
      expect(result).toBe(true)
      expect(mockTokenStorage.setTokens).toHaveBeenCalledWith(
        mockTokens.accessToken,
        mockTokens.refreshToken
      )
    })

    it('should handle refresh token failure', async () => {
      const store = useAuthStore()
      
      // Set initial authenticated state
      store.user = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        role: 'admin'
      }
      
      mockTokenStorage.getRefreshToken.mockReturnValueOnce(null)
      
      const result = await store.refreshToken()
      
      expect(result).toBe(false)
      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(mockTokenStorage.clearTokens).toHaveBeenCalled()
    })
  })

  describe('Profile Management', () => {
    it('should fetch profile successfully', async () => {
      const store = useAuthStore()
      
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        role: 'admin'
      }
      
      mockAuthApiService.getProfile.mockResolvedValueOnce({
        data: mockUser,
        status: 200
      } as ApiResponse<User>)
      
      const result = await store.fetchProfile()
      
      expect(result).toEqual(mockUser)
      expect(store.user).toEqual(mockUser)
      expect(store.error).toBeNull()
    })

    it('should handle profile fetch failure', async () => {
      const store = useAuthStore()
      
      mockAuthApiService.getProfile.mockRejectedValueOnce({
        message: 'Profile not found',
        status: 404
      })
      
      const result = await store.fetchProfile()
      
      expect(result).toBeNull()
      expect(store.error).toBe('Profile not found')
    })
  })

  describe('Authentication Initialization', () => {
    it('should initialize with existing valid tokens', async () => {
      const store = useAuthStore()
      
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        role: 'admin'
      }
      
      mockTokenStorage.getAccessToken.mockReturnValueOnce('valid-access-token')
      mockAuthApiService.getProfile.mockResolvedValueOnce({
        data: mockUser,
        status: 200
      } as ApiResponse<User>)
      
      await store.initializeAuth()
      
      expect(store.user).toEqual(mockUser)
      expect(store.isAuthenticated).toBe(true)
    })

    it('should handle initialization with invalid tokens', async () => {
      const store = useAuthStore()
      
      mockTokenStorage.getAccessToken.mockReturnValueOnce('invalid-token')
      mockAuthApiService.getProfile.mockRejectedValueOnce({
        message: 'Unauthorized',
        status: 401
      })
      
      await store.initializeAuth()
      
      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(mockTokenStorage.clearTokens).toHaveBeenCalled()
    })

    it('should handle initialization without tokens', async () => {
      const store = useAuthStore()
      
      mockTokenStorage.getAccessToken.mockReturnValueOnce(null)
      
      await store.initializeAuth()
      
      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(mockAuthApiService.getProfile).not.toHaveBeenCalled()
    })
  })

  describe('Session Management', () => {
    it('should update activity timestamp', () => {
      const store = useAuthStore()
      const beforeUpdate = store.lastActivity
      
      store.updateActivity()
      
      expect(store.lastActivity).not.toBe(beforeUpdate)
      expect(store.lastActivity).toBeInstanceOf(Date)
    })

    it('should check if session is expired', () => {
      const store = useAuthStore()
      
      // No activity - should not be expired
      expect(store.isSessionExpired()).toBe(false)
      
      // Recent activity - should not be expired
      store.updateActivity()
      expect(store.isSessionExpired()).toBe(false)
      
      // Old activity - should be expired
      const oldDate = new Date()
      oldDate.setTime(oldDate.getTime() - 31 * 60 * 1000) // 31 minutes ago
      store.lastActivity = oldDate
      expect(store.isSessionExpired()).toBe(true)
    })

    it('should clear error state', () => {
      const store = useAuthStore()
      
      store.error = 'Some error'
      expect(store.error).toBe('Some error')
      
      store.clearError()
      expect(store.error).toBeNull()
    })
  })

  describe('User Permissions', () => {
    it('should check if user has role', () => {
      const store = useAuthStore()
      
      // No user - should return false
      expect(store.hasRole('admin')).toBe(false)
      
      // User with admin role
      store.user = {
        id: '1',
        email: 'admin@example.com',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        role: 'admin'
      }
      
      expect(store.hasRole('admin')).toBe(true)
      expect(store.hasRole('operator')).toBe(false)
    })

    it('should check admin permissions', () => {
      const store = useAuthStore()
      
      // No user
      expect(store.isAdmin).toBe(false)
      
      // Regular user
      store.user = {
        id: '1',
        email: 'user@example.com',
        username: 'user',
        firstName: 'Regular',
        lastName: 'User',
        isActive: true,
        role: 'operator'
      }
      expect(store.isAdmin).toBe(false)
      
      // Admin user
      store.user = {
        id: '1',
        email: 'admin@example.com',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        role: 'admin'
      }
      expect(store.isAdmin).toBe(true)
    })
  })
})