// Dashboard Store Tests - ShowsTrack Frontend
// Tests for dashboard metrics and analytics store functionality

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDashboardStore } from '../dashboard'
import DashboardApiService from '@/services/api/dashboard'
import type { DashboardMetrics, SystemStatus, ApiResponse } from '@/types/api'

// Mock API service
vi.mock('@/services/api/dashboard')
const mockDashboardApiService = DashboardApiService as {
  getDashboardMetrics: MockedFunction<any>
  getSystemStatus: MockedFunction<any>
  getRealtimeMetrics: MockedFunction<any>
  getPerformanceMetrics: MockedFunction<any>
  getEventsSummary: MockedFunction<any>
  getShowsSummary: MockedFunction<any>
  getAlertsSummary: MockedFunction<any>
  getUpcomingEvents: MockedFunction<any>
  getRecentActivity: MockedFunction<any>
}

describe('Dashboard Store', () => {
  let mockMetrics: DashboardMetrics
  let mockSystemStatus: SystemStatus

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    mockMetrics = {
      totalShows: 25,
      activeShows: 18,
      totalEvents: 142,
      todayEvents: 8,
      upcomingEvents: 34,
      activeAlerts: 3,
      criticalAlerts: 1,
      totalUsers: 12,
      activeUsers: 5,
      systemUptime: '15 days, 3 hours',
      lastSyncTime: '2024-12-25T14:30:00Z',
      avgResponseTime: 245,
      successRate: 99.2,
      errorRate: 0.8,
      cacheHitRate: 87.5,
      databaseConnections: 8,
      memoryUsage: 67.3,
      cpuUsage: 34.2,
      diskUsage: 23.8,
      networkTraffic: {
        inbound: 125.4,
        outbound: 89.7
      },
      eventsByStatus: {
        PROGRAMADO: 45,
        ABIERTO: 12,
        CERRADO: 78,
        CANCELADO: 7
      },
      alertsByPriority: {
        critical: 1,
        high: 2,
        medium: 5,
        low: 8
      },
      recentActivity: [
        {
          id: 'activity-1',
          type: 'event_created',
          message: 'New event created: Magic Show',
          timestamp: '2024-12-25T14:15:00Z',
          userId: 'user-1',
          userName: 'Admin User'
        }
      ],
      generatedAt: '2024-12-25T14:30:00Z'
    }
    
    mockSystemStatus = {
      status: 'healthy',
      services: {
        database: 'healthy',
        cache: 'healthy',
        external_api: 'degraded',
        auth_service: 'healthy'
      },
      lastChecked: '2024-12-25T14:30:00Z',
      responseTime: 156,
      version: '1.0.0',
      environment: 'production',
      uptime: '15 days, 3 hours'
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useDashboardStore()
      
      expect(store.metrics).toBeNull()
      expect(store.systemStatus).toBeNull()
      expect(store.realtimeMetrics).toBeNull()
      expect(store.performanceMetrics).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.lastUpdateTime).toBeNull()
      expect(store.autoRefreshEnabled).toBe(true)
      expect(store.refreshInterval).toBe(30000)
    })

    it('should compute dashboard status correctly', () => {
      const store = useDashboardStore()
      
      // No data
      expect(store.hasDashboardData).toBe(false)
      expect(store.isSystemHealthy).toBe(false)
      
      // With data
      store.metrics = mockMetrics
      store.systemStatus = mockSystemStatus
      expect(store.hasDashboardData).toBe(true)
      expect(store.isSystemHealthy).toBe(true)
      
      // Unhealthy system
      store.systemStatus = { ...mockSystemStatus, status: 'unhealthy' }
      expect(store.isSystemHealthy).toBe(false)
    })
  })

  describe('Metrics Fetching', () => {
    it('should fetch dashboard metrics successfully', async () => {
      const store = useDashboardStore()
      
      mockDashboardApiService.getDashboardMetrics.mockResolvedValueOnce({
        data: mockMetrics,
        status: 200
      } as ApiResponse<DashboardMetrics>)
      
      const result = await store.fetchDashboardMetrics()
      
      expect(result).toEqual(mockMetrics)
      expect(store.metrics).toEqual(mockMetrics)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.lastUpdateTime).toBeInstanceOf(Date)
    })

    it('should handle fetch metrics failure', async () => {
      const store = useDashboardStore()
      
      mockDashboardApiService.getDashboardMetrics.mockRejectedValueOnce({
        message: 'Failed to fetch metrics',
        status: 500
      })
      
      const result = await store.fetchDashboardMetrics()
      
      expect(result).toBeNull()
      expect(store.metrics).toBeNull()
      expect(store.error).toBe('Failed to fetch metrics')
      expect(store.isLoading).toBe(false)
    })

    it('should fetch system status successfully', async () => {
      const store = useDashboardStore()
      
      mockDashboardApiService.getSystemStatus.mockResolvedValueOnce({
        data: mockSystemStatus,
        status: 200
      } as ApiResponse<SystemStatus>)
      
      const result = await store.fetchSystemStatus()
      
      expect(result).toEqual(mockSystemStatus)
      expect(store.systemStatus).toEqual(mockSystemStatus)
      expect(store.error).toBeNull()
    })

    it('should fetch realtime metrics successfully', async () => {
      const store = useDashboardStore()
      
      const realtimeMetrics = {
        currentUsers: 8,
        activeConnections: 24,
        requestsPerSecond: 45.2,
        averageResponseTime: 267,
        errorCount: 3,
        memoryUsage: 72.1,
        cpuUsage: 38.9,
        timestamp: '2024-12-25T14:35:00Z'
      }
      
      mockDashboardApiService.getRealtimeMetrics.mockResolvedValueOnce({
        data: realtimeMetrics,
        status: 200
      })
      
      const result = await store.fetchRealtimeMetrics()
      
      expect(result).toEqual(realtimeMetrics)
      expect(store.realtimeMetrics).toEqual(realtimeMetrics)
      expect(store.error).toBeNull()
    })

    it('should fetch performance metrics successfully', async () => {
      const store = useDashboardStore()
      
      const performanceMetrics = {
        responseTimeTrend: [
          { timestamp: '2024-12-25T14:00:00Z', value: 234 },
          { timestamp: '2024-12-25T14:15:00Z', value: 267 },
          { timestamp: '2024-12-25T14:30:00Z', value: 245 }
        ],
        errorRateTrend: [
          { timestamp: '2024-12-25T14:00:00Z', value: 0.5 },
          { timestamp: '2024-12-25T14:15:00Z', value: 1.2 },
          { timestamp: '2024-12-25T14:30:00Z', value: 0.8 }
        ],
        throughputTrend: [
          { timestamp: '2024-12-25T14:00:00Z', value: 52.3 },
          { timestamp: '2024-12-25T14:15:00Z', value: 48.7 },
          { timestamp: '2024-12-25T14:30:00Z', value: 45.2 }
        ],
        resourceUsage: {
          cpu: [{ timestamp: '2024-12-25T14:30:00Z', value: 34.2 }],
          memory: [{ timestamp: '2024-12-25T14:30:00Z', value: 67.3 }],
          disk: [{ timestamp: '2024-12-25T14:30:00Z', value: 23.8 }]
        }
      }
      
      mockDashboardApiService.getPerformanceMetrics.mockResolvedValueOnce({
        data: performanceMetrics,
        status: 200
      })
      
      const result = await store.fetchPerformanceMetrics()
      
      expect(result).toEqual(performanceMetrics)
      expect(store.performanceMetrics).toEqual(performanceMetrics)
      expect(store.error).toBeNull()
    })
  })

  describe('Summary Data', () => {
    it('should fetch events summary successfully', async () => {
      const store = useDashboardStore()
      
      const eventsSummary = {
        total: 142,
        today: 8,
        thisWeek: 45,
        upcoming: 34,
        byStatus: mockMetrics.eventsByStatus,
        recentlyCreated: 5,
        recentlyUpdated: 12
      }
      
      mockDashboardApiService.getEventsSummary.mockResolvedValueOnce({
        data: eventsSummary,
        status: 200
      })
      
      const result = await store.fetchEventsSummary()
      
      expect(result).toEqual(eventsSummary)
      expect(store.error).toBeNull()
    })

    it('should fetch shows summary successfully', async () => {
      const store = useDashboardStore()
      
      const showsSummary = {
        total: 25,
        active: 18,
        inactive: 7,
        byType: {
          performance: 12,
          tour: 8,
          special: 5
        },
        avgDuration: 95,
        totalEvents: 142
      }
      
      mockDashboardApiService.getShowsSummary.mockResolvedValueOnce({
        data: showsSummary,
        status: 200
      })
      
      const result = await store.fetchShowsSummary()
      
      expect(result).toEqual(showsSummary)
      expect(store.error).toBeNull()
    })

    it('should fetch alerts summary successfully', async () => {
      const store = useDashboardStore()
      
      const alertsSummary = {
        total: 16,
        active: 3,
        byPriority: mockMetrics.alertsByPriority,
        resolved: 13,
        avgResolutionTime: '15 minutes'
      }
      
      mockDashboardApiService.getAlertsSummary.mockResolvedValueOnce({
        data: alertsSummary,
        status: 200
      })
      
      const result = await store.fetchAlertsSummary()
      
      expect(result).toEqual(alertsSummary)
      expect(store.error).toBeNull()
    })
  })

  describe('Activity Data', () => {
    it('should fetch upcoming events successfully', async () => {
      const store = useDashboardStore()
      
      const upcomingEvents = [
        {
          id: 'event-1',
          showName: 'Magic Show',
          date: '2024-12-26',
          time: '20:00:00',
          status: 'PROGRAMADO',
          venue: 'Main Theater'
        },
        {
          id: 'event-2',
          showName: 'Dance Performance',
          date: '2024-12-26',
          time: '21:30:00',
          status: 'PROGRAMADO',
          venue: 'Studio A'
        }
      ]
      
      mockDashboardApiService.getUpcomingEvents.mockResolvedValueOnce({
        data: upcomingEvents,
        status: 200
      })
      
      const result = await store.fetchUpcomingEvents()
      
      expect(result).toEqual(upcomingEvents)
      expect(store.error).toBeNull()
    })

    it('should fetch recent activity successfully', async () => {
      const store = useDashboardStore()
      
      const recentActivity = [
        {
          id: 'activity-1',
          type: 'event_created',
          message: 'New event created: Magic Show',
          timestamp: '2024-12-25T14:15:00Z',
          userId: 'user-1',
          userName: 'Admin User'
        },
        {
          id: 'activity-2',
          type: 'alert_resolved',
          message: 'Alert resolved: System maintenance complete',
          timestamp: '2024-12-25T13:45:00Z',
          userId: 'user-2',
          userName: 'Operator'
        }
      ]
      
      mockDashboardApiService.getRecentActivity.mockResolvedValueOnce({
        data: recentActivity,
        status: 200
      })
      
      const result = await store.fetchRecentActivity()
      
      expect(result).toEqual(recentActivity)
      expect(store.error).toBeNull()
    })
  })

  describe('Auto-refresh Functionality', () => {
    it('should start auto-refresh', () => {
      const store = useDashboardStore()
      
      mockDashboardApiService.getDashboardMetrics.mockResolvedValue({
        data: mockMetrics,
        status: 200
      })
      
      store.startAutoRefresh()
      
      expect(store.autoRefreshEnabled).toBe(true)
      
      // Fast-forward time to trigger refresh
      vi.advanceTimersByTime(30000)
      
      expect(mockDashboardApiService.getDashboardMetrics).toHaveBeenCalled()
    })

    it('should stop auto-refresh', () => {
      const store = useDashboardStore()
      
      store.startAutoRefresh()
      expect(store.autoRefreshEnabled).toBe(true)
      
      store.stopAutoRefresh()
      expect(store.autoRefreshEnabled).toBe(false)
      
      // Fast-forward time - should not trigger refresh
      vi.advanceTimersByTime(30000)
      
      expect(mockDashboardApiService.getDashboardMetrics).not.toHaveBeenCalled()
    })

    it('should update refresh interval', () => {
      const store = useDashboardStore()
      
      expect(store.refreshInterval).toBe(30000)
      
      store.setRefreshInterval(60000)
      expect(store.refreshInterval).toBe(60000)
      
      // Should not allow invalid intervals
      store.setRefreshInterval(-1000)
      expect(store.refreshInterval).toBe(60000)
      
      store.setRefreshInterval(500)
      expect(store.refreshInterval).toBe(60000)
    })

    it('should initialize dashboard with auto-refresh', async () => {
      const store = useDashboardStore()
      
      mockDashboardApiService.getDashboardMetrics.mockResolvedValueOnce({
        data: mockMetrics,
        status: 200
      })
      
      mockDashboardApiService.getSystemStatus.mockResolvedValueOnce({
        data: mockSystemStatus,
        status: 200
      })
      
      await store.initializeDashboard()
      
      expect(store.metrics).toEqual(mockMetrics)
      expect(store.systemStatus).toEqual(mockSystemStatus)
      expect(store.autoRefreshEnabled).toBe(true)
    })
  })

  describe('Data Processing', () => {
    it('should calculate dashboard statistics', () => {
      const store = useDashboardStore()
      store.metrics = mockMetrics
      
      const stats = store.dashboardStats
      
      expect(stats).toEqual({
        totalShows: 25,
        activeShows: 18,
        totalEvents: 142,
        todayEvents: 8,
        upcomingEvents: 34,
        activeAlerts: 3,
        criticalAlerts: 1,
        successRate: 99.2,
        avgResponseTime: 245,
        systemUptime: '15 days, 3 hours'
      })
    })

    it('should get performance indicators', () => {
      const store = useDashboardStore()
      store.metrics = mockMetrics
      
      const indicators = store.performanceIndicators
      
      expect(indicators).toEqual({
        responseTime: { value: 245, status: 'good', threshold: 500 },
        errorRate: { value: 0.8, status: 'good', threshold: 5 },
        successRate: { value: 99.2, status: 'excellent', threshold: 95 },
        memoryUsage: { value: 67.3, status: 'warning', threshold: 80 },
        cpuUsage: { value: 34.2, status: 'good', threshold: 70 }
      })
    })

    it('should get system health indicators', () => {
      const store = useDashboardStore()
      store.systemStatus = mockSystemStatus
      
      const healthIndicators = store.systemHealthIndicators
      
      expect(healthIndicators).toEqual({
        overall: 'healthy',
        services: {
          database: 'healthy',
          cache: 'healthy',
          external_api: 'degraded',
          auth_service: 'healthy'
        },
        unhealthyServices: ['external_api']
      })
    })
  })

  describe('Utility Functions', () => {
    it('should clear error', () => {
      const store = useDashboardStore()
      
      store.error = 'Some error'
      expect(store.error).toBe('Some error')
      
      store.clearError()
      expect(store.error).toBeNull()
    })

    it('should refresh all data', async () => {
      const store = useDashboardStore()
      
      mockDashboardApiService.getDashboardMetrics.mockResolvedValueOnce({
        data: mockMetrics,
        status: 200
      })
      
      mockDashboardApiService.getSystemStatus.mockResolvedValueOnce({
        data: mockSystemStatus,
        status: 200
      })
      
      const realtimeMetrics = { currentUsers: 8, timestamp: '2024-12-25T14:35:00Z' }
      mockDashboardApiService.getRealtimeMetrics.mockResolvedValueOnce({
        data: realtimeMetrics,
        status: 200
      })
      
      await store.refreshAll()
      
      expect(store.metrics).toEqual(mockMetrics)
      expect(store.systemStatus).toEqual(mockSystemStatus)
      expect(store.realtimeMetrics).toEqual(realtimeMetrics)
    })

    it('should cleanup resources', () => {
      const store = useDashboardStore()
      
      store.startAutoRefresh()
      expect(store.autoRefreshEnabled).toBe(true)
      
      store.cleanup()
      expect(store.autoRefreshEnabled).toBe(false)
    })
  })

  describe('Computed Properties', () => {
    it('should check if data is stale', () => {
      const store = useDashboardStore()
      
      // No update time - is stale
      expect(store.isDataStale).toBe(true)
      
      // Recent update - not stale
      store.lastUpdateTime = new Date()
      expect(store.isDataStale).toBe(false)
      
      // Old update - is stale
      const oldDate = new Date()
      oldDate.setMinutes(oldDate.getMinutes() - 6)
      store.lastUpdateTime = oldDate
      expect(store.isDataStale).toBe(true)
    })

    it('should format last update time', () => {
      const store = useDashboardStore()
      
      // No update time
      expect(store.lastUpdateFormatted).toBe('Never')
      
      // With update time
      const updateTime = new Date('2024-12-25T14:30:00Z')
      store.lastUpdateTime = updateTime
      expect(store.lastUpdateFormatted).toBe('25/12/2024, 14:30:00')
    })
  })

  describe('Error Handling', () => {
    it('should handle multiple API failures gracefully', async () => {
      const store = useDashboardStore()
      
      mockDashboardApiService.getDashboardMetrics.mockRejectedValueOnce({
        message: 'Metrics API down',
        status: 503
      })
      
      mockDashboardApiService.getSystemStatus.mockRejectedValueOnce({
        message: 'Status API down',
        status: 503
      })
      
      await store.refreshAll()
      
      expect(store.metrics).toBeNull()
      expect(store.systemStatus).toBeNull()
      expect(store.error).toBe('Metrics API down') // First error is stored
    })

    it('should handle network timeouts', async () => {
      const store = useDashboardStore()
      
      mockDashboardApiService.getDashboardMetrics.mockRejectedValueOnce({
        message: 'Request timeout',
        status: undefined
      })
      
      const result = await store.fetchDashboardMetrics()
      
      expect(result).toBeNull()
      expect(store.error).toBe('Request timeout')
    })
  })
})