// Alerts API Service - ShowsTrack Frontend
// Global alerts management endpoints implementation

import { apiGet, apiPost, apiPut, apiDelete } from './client'
import type { GlobalAlert, CreateAlertData, ApiResponse } from '@/types/api'

export class AlertsApiService {
  // Get all alerts
  static async getAlerts(): Promise<ApiResponse<GlobalAlert[]>> {
    return apiGet<GlobalAlert[]>('/api/admin/alerts')
  }

  // Get active alerts only
  static async getActiveAlerts(): Promise<ApiResponse<GlobalAlert[]>> {
    return apiGet<GlobalAlert[]>('/api/admin/alerts/global')
  }

  // Get single alert by ID
  static async getAlert(alertId: string): Promise<ApiResponse<GlobalAlert>> {
    return apiGet<GlobalAlert>(`/api/admin/alerts/${alertId}`)
  }

  // Create new alert
  static async createAlert(alertData: CreateAlertData): Promise<ApiResponse<GlobalAlert>> {
    return apiPost<GlobalAlert>('/api/admin/alerts/global', alertData)
  }

  // Update existing alert
  static async updateAlert(alertId: string, alertData: Partial<CreateAlertData>): Promise<ApiResponse<GlobalAlert>> {
    return apiPut<GlobalAlert>(`/api/admin/alerts/${alertId}`, alertData)
  }

  // Delete alert
  static async deleteAlert(alertId: string): Promise<ApiResponse<null>> {
    return apiDelete<null>(`/api/admin/alerts/${alertId}`)
  }

  // Activate alert
  static async activateAlert(alertId: string): Promise<ApiResponse<GlobalAlert>> {
    return apiPost<GlobalAlert>(`/api/admin/alerts/${alertId}/activate`)
  }

  // Deactivate alert
  static async deactivateAlert(alertId: string): Promise<ApiResponse<GlobalAlert>> {
    return apiDelete<GlobalAlert>('/api/admin/alerts/global')
  }

  // Get alerts for public display (no auth required)
  static async getPublicAlerts(screenId?: string): Promise<ApiResponse<GlobalAlert[]>> {
    const params = screenId ? { screen_id: screenId } : undefined
    return apiGet<GlobalAlert[]>('/api/public/alerts', params)
  }

  // Get critical alerts for emergency display
  static async getCriticalAlerts(): Promise<ApiResponse<GlobalAlert[]>> {
    return apiGet<GlobalAlert[]>('/api/public/alerts/critical')
  }

  // Bulk activate/deactivate alerts
  static async bulkUpdateAlerts(
    alertIds: string[],
    action: 'activate' | 'deactivate'
  ): Promise<ApiResponse<{ updated: number; errors: string[] }>> {
    return apiPost<{ updated: number; errors: string[] }>('/api/admin/alerts/bulk-action', {
      alert_ids: alertIds,
      action
    })
  }

  // Get alerts statistics
  static async getAlertsStats(): Promise<ApiResponse<{
    total: number
    active: number
    byType: Record<string, number>
    byPriority: Record<string, number>
    expiringSoon: number
  }>> {
    return apiGet<{
      total: number
      active: number
      byType: Record<string, number>
      byPriority: Record<string, number>
      expiringSoon: number
    }>('/api/admin/alerts/stats')
  }

  // Create emergency alert (simplified interface)
  static async createEmergencyAlert(
    title: string,
    message: string,
    displayScreens: string[] = ['all']
  ): Promise<ApiResponse<GlobalAlert>> {
    return apiPost<GlobalAlert>('/api/admin/alerts/emergency', {
      title,
      message,
      type: 'error',
      priority: 'critical',
      display_screens: displayScreens
    })
  }

  // Clear all alerts (emergency function)
  static async clearAllAlerts(): Promise<ApiResponse<{ cleared: number }>> {
    return apiPost<{ cleared: number }>('/api/admin/alerts/clear-all')
  }

  // Test alert system
  static async testAlertSystem(): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiPost<{ success: boolean; message: string }>('/api/admin/alerts/test')
  }
}

export default AlertsApiService