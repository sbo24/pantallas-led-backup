// Auth API Service - ShowsTrack Frontend
// Authentication endpoints implementation

import { apiPost, apiGet } from './client'
import type { LoginCredentials, AuthResponse, User, ApiResponse } from '@/types/api'

export class AuthApiService {
  // Login with username/password
  static async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    return apiPost<AuthResponse>('/api/auth/login', credentials)
  }

  // Logout (invalidate tokens)
  static async logout(refreshToken: string): Promise<ApiResponse<null>> {
    return apiPost<null>('/api/auth/logout', {
      refresh_token: refreshToken
    })
  }

  // Refresh access token
  static async refreshToken(refreshToken: string): Promise<ApiResponse<AuthResponse>> {
    return apiPost<AuthResponse>('/api/auth/refresh', {
      refresh_token: refreshToken
    })
  }

  // Get current user profile
  static async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiGet<User>('/api/auth/me')
  }

  // Update user profile
  static async updateProfile(profileData: Partial<User>): Promise<ApiResponse<User>> {
    return apiPost<User>('/api/auth/profile', profileData)
  }

  // Change password
  static async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<null>> {
    return apiPost<null>('/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    })
  }

  // Verify token validity
  static async verifyToken(): Promise<ApiResponse<{ valid: boolean }>> {
    return apiGet<{ valid: boolean }>('/api/auth/verify')
  }
}

export default AuthApiService