// Auth Store - ShowsTrack Frontend
// Pinia Setup Store for JWT authentication management

import { defineStore } from 'pinia'
import { ref, computed, type ComputedRef } from 'vue'
import { apiPost } from '@/services/api/client'
import { tokenStorage } from '@/services/api/client'
import type { User, LoginCredentials, AuthResponse, AuthTokens } from '@/types/api'

export const useAuthStore = defineStore('auth', () => {
  // State
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
      
      const response = await apiPost<AuthResponse>('/api/auth/login', credentials)
      
      if (response.data) {
        user.value = response.data.user
        tokens.value = response.data.tokens
        
        // Persist tokens
        tokenStorage.setTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
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
        await apiPost('/api/auth/logout', {
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
      
      const response = await apiPost<User>('/api/auth/me')
      
      if (response.data) {
        user.value = response.data
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
      
      if (!storedAccessToken || !storedRefreshToken) {
        return false
      }
      
      // Try to fetch user data with stored token
      const success = await refreshUserData()
      
      if (success && storedAccessToken && storedRefreshToken) {
        tokens.value = {
          accessToken: storedAccessToken,
          refreshToken: storedRefreshToken,
          expiresIn: 0, // Will be updated on next refresh
          tokenType: 'Bearer'
        }
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('[Auth Store] Auth status check error:', error)
      await logout()
      return false
    }
  }
  
  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      await apiPost('/api/auth/change-password', {
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
      
      const response = await apiPost<User>('/api/auth/profile', profileData)
      
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
    changePassword,
    updateProfile,
    clearError,
    initializeAuth
  }
})