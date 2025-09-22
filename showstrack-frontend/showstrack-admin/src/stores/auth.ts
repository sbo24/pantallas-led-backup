// Auth Store - ShowsTrack Frontend
// Pinia Setup Store for JWT authentication management

import { defineStore } from 'pinia'
import { ref, computed, type ComputedRef } from 'vue'
import { apiPost, apiGet } from '@/services/api/client'
import { tokenStorage } from '@/services/api/client'
import { getApiBaseUrl } from '@/utils/api'
import type { User, LoginCredentials, AuthResponse, AuthTokens } from '@/types/api'

export const useAuthStore = defineStore('auth', () => {
  // State - Start with null, will be populated from localStorage or login
  const user = ref<User | null>(null)
  const tokens = ref<AuthTokens | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // Computed
  const isAuthenticated: ComputedRef<boolean> = computed(() => 
    !!user.value && !!tokens.value?.accessToken
  )
  
  const hasRole = computed(() => (role: string): boolean => {
    return user.value?.roles?.includes(role) ?? false
  })
  
  const isAdmin: ComputedRef<boolean> = computed(() => 
    hasRole.value('admin')
  )
  
  const userDisplayName: ComputedRef<string> = computed(() => 
    user.value?.username || user.value?.email || 'Usuario'
  )

  // Actions
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      // Create form data for backend (expects application/x-www-form-urlencoded)
      const formData = new URLSearchParams()
      formData.append('username', credentials.username)
      formData.append('password', credentials.password)
      
      // Make request with form data using our configured API client
      const response = await fetch(`${getApiBaseUrl()}/api/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.access_token && data.user) {
        // Adapt backend user format to frontend format
        const backendUser = data.user as any // Backend format
        user.value = {
          ...backendUser,
          roles: [backendUser.role] // Convert single role string to array
        }
        tokens.value = {
          accessToken: data.access_token,
          refreshToken: data.access_token, // Use access token as refresh token
          expiresIn: data.expires_in,
          tokenType: data.token_type
        }
        
        // Persist tokens
        tokenStorage.setTokens(
          data.access_token,
          data.access_token // Store access token as refresh token
        )
        
        return true
      }
      
      return false
    } catch (apiError: any) {
      error.value = apiError.message || 'Error de autenticación'
      console.error('[Auth Store] Login error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const logout = async (): Promise<void> => {
    try {
      isLoading.value = true
      
      // Optional: Call logout endpoint to invalidate server-side session
      if (tokens.value?.refreshToken) {
        await apiPost('/api/admin/auth/logout', {
          refresh_token: tokens.value.refreshToken
        }).catch(error => {
          // Continue with local logout even if server call fails
          console.warn('[Auth Store] Server logout failed:', error)
        })
      }
    } catch (apiError: any) {
      console.error('[Auth Store] Logout error:', apiError)
    } finally {
      // Always clear local state
      user.value = null
      tokens.value = null
      error.value = null
      tokenStorage.clearTokens()
      isLoading.value = false
    }
  }
  
  const refreshUserData = async (): Promise<boolean> => {
    try {
      if (!isAuthenticated.value) {
        return false
      }
      
      isLoading.value = true
      
      const response = await apiGet<User>('/api/admin/auth/me')
      
      if (response.data) {
        // Adapt backend user format to frontend format
        const backendUser = response.data as any // Backend format
        user.value = {
          ...backendUser,
          roles: [backendUser.role] // Convert single role string to array
        }
        return true
      }
      
      return false
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al obtener datos de usuario'
      console.error('[Auth Store] User data refresh error:', apiError)
      
      // If unauthorized, logout
      if (apiError.status === 401) {
        await logout()
      }
      
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const checkAuthStatus = async (): Promise<boolean> => {
    try {
      const storedAccessToken = tokenStorage.getAccessToken()
      const storedRefreshToken = tokenStorage.getRefreshToken()
      
      if (!storedAccessToken) {
        return false
      }
      
      // Set tokens from storage
      tokens.value = {
        accessToken: storedAccessToken,
        refreshToken: storedRefreshToken || storedAccessToken,
        expiresIn: 0,
        tokenType: 'Bearer'
      }
      
      // Try to fetch user data with stored token
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/admin/auth/me`, {
          headers: {
            'Authorization': `Bearer ${storedAccessToken}`
          }
        })
        
        if (response.ok) {
          const userData = await response.json()
          user.value = {
            ...userData,
            roles: [userData.role] // Convert single role to array
          }
          return true
        } else if (response.status === 401 && storedRefreshToken) {
          // Token expired, try to refresh
          console.log('[Auth Store] Token expired, trying to refresh...')
          return await refreshToken()
        } else {
          // Token invalid, clear storage
          tokenStorage.clearTokens()
          return false
        }
      } catch (error) {
        console.error('[Auth Store] User data fetch error:', error)
        // Try refresh if we have a refresh token
        if (storedRefreshToken) {
          return await refreshToken()
        }
        tokenStorage.clearTokens()
        return false
      }
    } catch (error) {
      console.error('[Auth Store] Auth status check error:', error)
      await logout()
      return false
    }
  }
  
  const refreshToken = async (): Promise<boolean> => {
    try {
      const storedRefreshToken = tokenStorage.getRefreshToken()
      
      if (!storedRefreshToken) {
        return false
      }
      
      console.log('[Auth Store] Refreshing token...')
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/admin/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${storedRefreshToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Update tokens
        tokens.value = {
          accessToken: data.access_token,
          refreshToken: data.access_token, // Use new access token as refresh token
          expiresIn: data.expires_in,
          tokenType: data.token_type
        }
        
        // Persist new tokens
        tokenStorage.setTokens(
          data.access_token,
          data.access_token
        )
        
        console.log('[Auth Store] Token refreshed successfully')
        
        // Try to get user data with new token
        return await checkAuthStatus()
      } else {
        console.log('[Auth Store] Token refresh failed')
        tokenStorage.clearTokens()
        return false
      }
    } catch (error) {
      console.error('[Auth Store] Token refresh error:', error)
      tokenStorage.clearTokens()
      return false
    }
  }
  
  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      await apiPost('/api/admin/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      })
      
      return true
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al cambiar la contraseña'
      console.error('[Auth Store] Password change error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const updateProfile = async (profileData: Partial<User>): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await apiPost<User>('/api/admin/auth/profile', profileData)
      
      if (response.data) {
        user.value = { ...user.value!, ...response.data }
        return true
      }
      
      return false
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al actualizar el perfil'
      console.error('[Auth Store] Profile update error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const clearError = (): void => {
    error.value = null
  }
  
  // Initialize auth state on store creation
  const initializeAuth = async (): Promise<void> => {
    await checkAuthStatus()
  }

  return {
    // State
    user,
    tokens,
    isLoading,
    error,
    
    // Computed
    isAuthenticated,
    hasRole,
    isAdmin,
    userDisplayName,
    
    // Actions
    login,
    logout,
    refreshUserData,
    checkAuthStatus,
    refreshToken,
    changePassword,
    updateProfile,
    clearError,
    initializeAuth
  }
})