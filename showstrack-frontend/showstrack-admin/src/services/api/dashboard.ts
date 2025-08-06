// Dashboard API Service - ShowsTrack Frontend
// Dashboard metrics and system health endpoints implementation

import { apiGet, apiPost } from './client'
import type { DashboardMetrics, SystemHealth, ApiResponse } from '@/types/api'

export class DashboardApiService {
  // Get main dashboard metrics
  static async getDashboardMetrics(): Promise<ApiResponse<DashboardMetrics>> {
    return apiGet<DashboardMetrics>('/api/admin/dashboard/metrics')
  }

  // Get system health status
  static async getSystemHealth(): Promise<ApiResponse<SystemHealth>> {
    return apiGet<SystemHealth>('/api/admin/dashboard/health')
  }

  // Get real-time events summary
  static async getRealTimeEvents(): Promise<ApiResponse<{
    currentEvents: Array<{
      id: string
      showName: string
      status: string
      startTime: string
      venue: string
    }>
    upcomingEvents: Array<{
      id: string
      showName: string
      startTime: string
      venue: string
    }>
    recentOverrides: Array<{
      id: string
      showName: string
      status: string
      reason: string
      timestamp: string
    }>
  }>> {
    return apiGet<{
      currentEvents: Array<{
        id: string
        showName: string
        status: string
        startTime: string
        venue: string
      }>
      upcomingEvents: Array<{
        id: string
        showName: string
        startTime: string
        venue: string
      }>
      recentOverrides: Array<{
        id: string
        showName: string
        status: string
        reason: string
        timestamp: string
      }>
    }>('/api/admin/dashboard/real-time-events')
  }

  // Get alerts summary for dashboard
  static async getAlertsSummary(): Promise<ApiResponse<{
    activeAlerts: number
    criticalAlerts: number
    recentAlerts: Array<{
      id: string
      title: string
      type: string
      priority: string
      createdAt: string
    }>
  }>> {
    return apiGet<{
      activeAlerts: number
      criticalAlerts: number
      recentAlerts: Array<{
        id: string
        title: string
        type: string
        priority: string
        createdAt: string
      }>
    }>('/api/admin/dashboard/alerts-summary')
  }

  // Get system performance metrics
  static async getPerformanceMetrics(): Promise<ApiResponse<{
    apiResponseTime: number
    databaseConnections: number
    memoryUsage: number
    cpuUsage: number
    activeUsers: number
    requestsPerMinute: number
  }>> {
    return apiGet<{
      apiResponseTime: number
      databaseConnections: number
      memoryUsage: number
      cpuUsage: number
      activeUsers: number
      requestsPerMinute: number
    }>('/api/admin/dashboard/performance')
  }

  // Get venue statistics
  static async getVenueStats(): Promise<ApiResponse<Array<{
    venue: string
    totalShows: number
    activeEvents: number
    upcomingEvents: number
    status: 'operational' | 'warning' | 'error'
  }>>> {
    return apiGet<Array<{
      venue: string
      totalShows: number
      activeEvents: number
      upcomingEvents: number
      status: 'operational' | 'warning' | 'error'
    }>>('/api/admin/dashboard/venue-stats')
  }

  // Get activity log for dashboard
  static async getActivityLog(limit: number = 20): Promise<ApiResponse<Array<{
    id: string
    action: string
    target: string
    user: string
    timestamp: string
    details?: string
  }>>> {
    return apiGet<Array<{
      id: string
      action: string
      target: string
      user: string
      timestamp: string
      details?: string
    }>>('/api/admin/dashboard/activity-log', { limit })
  }

  // Get sync status with external systems
  static async getSyncStatus(): Promise<ApiResponse<{
    lastSyncTime: string
    nextSyncTime: string
    syncStatus: 'healthy' | 'warning' | 'error'
    externalSystems: Array<{
      name: string
      status: 'connected' | 'disconnected' | 'error'
      lastSync: string
    }>
  }>> {
    return apiGet<{
      lastSyncTime: string
      nextSyncTime: string
      syncStatus: 'healthy' | 'warning' | 'error'
      externalSystems: Array<{
        name: string
        status: 'connected' | 'disconnected' | 'error'
        lastSync: string
      }>
    }>('/api/admin/dashboard/sync-status')
  }

  // Force data refresh
  static async forceRefresh(): Promise<ApiResponse<{ refreshed: boolean; timestamp: string }>> {
    return apiPost<{ refreshed: boolean; timestamp: string }>('/api/admin/dashboard/refresh')
  }

  // Get system statistics summary
  static async getSystemStats(): Promise<ApiResponse<{
    uptime: number
    totalRequests: number
    totalErrors: number
    errorRate: number
    averageResponseTime: number
    peakConcurrentUsers: number
  }>> {
    return apiGet<{
      uptime: number
      totalRequests: number
      totalErrors: number
      errorRate: number
      averageResponseTime: number
      peakConcurrentUsers: number
    }>('/api/admin/dashboard/system-stats')
  }

  // Get historical data for charts
  static async getHistoricalData(
    metric: 'events' | 'overrides' | 'alerts' | 'users',
    period: 'hour' | 'day' | 'week' | 'month'
  ): Promise<ApiResponse<Array<{
    timestamp: string
    value: number
  }>>> {
    return apiGet<Array<{
      timestamp: string
      value: number
    }>>(`/api/admin/dashboard/historical/${metric}`, { period })
  }

  // Test system connectivity
  static async testConnectivity(): Promise<ApiResponse<{
    database: boolean
    externalApi: boolean
    redis: boolean
    overallHealth: 'healthy' | 'warning' | 'error'
  }>> {
    return apiPost<{
      database: boolean
      externalApi: boolean
      redis: boolean
      overallHealth: 'healthy' | 'warning' | 'error'
    }>('/api/admin/dashboard/test-connectivity')
  }
}

export default DashboardApiService