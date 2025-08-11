// Configuration API Service - ShowsTrack Frontend
// System configuration endpoints implementation

import { apiGet, apiPost, apiPut } from './client'
import type { SystemConfig, UpdateConfigData, GlobalConfiguration, ApiResponse } from '@/types/api'

export class ConfigApiService {
  // Get all system configuration
  static async getAllConfig(): Promise<ApiResponse<SystemConfig[]>> {
    return apiGet<SystemConfig[]>('/api/admin/config')
  }

  // Get configuration by category
  static async getConfigByCategory(category: string): Promise<ApiResponse<SystemConfig[]>> {
    return apiGet<SystemConfig[]>(`/api/admin/config/category/${category}`)
  }

  // Get single configuration value
  static async getConfig(configKey: string): Promise<ApiResponse<SystemConfig>> {
    return apiGet<SystemConfig>(`/api/admin/config/${configKey}`)
  }

  // Update configuration value
  static async updateConfig(configKey: string, updateData: UpdateConfigData): Promise<ApiResponse<SystemConfig>> {
    return apiPut<SystemConfig>(`/api/admin/config/${configKey}`, updateData)
  }

  // Get global configuration object
  static async getGlobalConfig(): Promise<ApiResponse<GlobalConfiguration>> {
    return apiGet<GlobalConfiguration>('/api/admin/config/global')
  }

  // Update multiple configuration values
  static async bulkUpdateConfig(updates: Array<{
    key: string
    value: string | number | boolean
  }>): Promise<ApiResponse<{ updated: number; errors: string[] }>> {
    return apiPost<{ updated: number; errors: string[] }>('/api/admin/config/bulk-update', {
      updates
    })
  }

  // Reset configuration to defaults
  static async resetConfig(configKey: string): Promise<ApiResponse<SystemConfig>> {
    return apiPost<SystemConfig>(`/api/admin/config/${configKey}/reset`)
  }

  // Reset all configuration to defaults
  static async resetAllConfig(): Promise<ApiResponse<{ reset: number }>> {
    return apiPost<{ reset: number }>('/api/admin/config/reset-all')
  }

  // Get system operation mode
  static async getOperationMode(): Promise<ApiResponse<{ mode: 'automatic' | 'manual' }>> {
    return apiGet<{ mode: 'automatic' | 'manual' }>('/api/admin/config/operation-mode')
  }

  // Set system operation mode
  static async setOperationMode(mode: 'automatic' | 'manual'): Promise<ApiResponse<SystemConfig>> {
    return apiPut<SystemConfig>('/api/admin/config/operation-mode', { mode })
  }

  // Get lead time configuration
  static async getLeadTimeConfig(): Promise<ApiResponse<{ defaultLeadTimeMinutes: number }>> {
    return apiGet<{ defaultLeadTimeMinutes: number }>('/api/admin/config/lead-time')
  }

  // Update lead time configuration
  static async updateLeadTime(minutes: number): Promise<ApiResponse<SystemConfig>> {
    return apiPut<SystemConfig>('/api/admin/config/lead-time', {
      value: minutes
    })
  }

  // Get display refresh settings
  static async getDisplaySettings(): Promise<ApiResponse<{
    refreshSeconds: number
    showVenues: boolean
    showCapacity: boolean
  }>> {
    return apiGet<{
      refreshSeconds: number
      showVenues: boolean
      showCapacity: boolean
    }>('/api/admin/config/display')
  }

  // Update display settings
  static async updateDisplaySettings(settings: {
    refreshSeconds?: number
    showVenues?: boolean
    showCapacity?: boolean
  }): Promise<ApiResponse<{ updated: number }>> {
    return apiPut<{ updated: number }>('/api/admin/config/display', settings)
  }

  // Get venue operating hours
  static async getVenueHours(): Promise<ApiResponse<{
    openTime: string
    closeTime: string
  }>> {
    return apiGet<{
      openTime: string
      closeTime: string
    }>('/api/admin/config/venue-hours')
  }

  // Update venue operating hours
  static async updateVenueHours(openTime: string, closeTime: string): Promise<ApiResponse<{ updated: number }>> {
    return apiPut<{ updated: number }>('/api/admin/config/venue-hours', {
      open_time: openTime,
      close_time: closeTime
    })
  }

  // Validate configuration
  static async validateConfig(): Promise<ApiResponse<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }>> {
    return apiGet<{
      valid: boolean
      errors: string[]
      warnings: string[]
    }>('/api/admin/config/validate')
  }

  // Export configuration
  static async exportConfig(): Promise<ApiResponse<SystemConfig[]>> {
    return apiGet<SystemConfig[]>('/api/admin/config/export')
  }

  // Import configuration
  static async importConfig(configData: SystemConfig[]): Promise<ApiResponse<{
    imported: number
    updated: number
    errors: string[]
  }>> {
    return apiPost<{
      imported: number
      updated: number
      errors: string[]
    }>('/api/admin/config/import', { config: configData })
  }
}

export default ConfigApiService