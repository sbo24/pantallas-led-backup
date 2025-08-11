// Alerts Store Tests - ShowsTrack Frontend
// Tests for alerts management store functionality

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAlertsStore } from '../alerts'
import AlertsApiService from '@/services/api/alerts'
import type { GlobalAlert, CreateAlertData, ApiResponse } from '@/types/api'

// Mock API service
vi.mock('@/services/api/alerts')
const mockAlertsApiService = AlertsApiService as {
  getAlerts: MockedFunction<any>
  getActiveAlerts: MockedFunction<any>
  getAlert: MockedFunction<any>
  createAlert: MockedFunction<any>
  updateAlert: MockedFunction<any>
  deleteAlert: MockedFunction<any>
  activateAlert: MockedFunction<any>
  deactivateAlert: MockedFunction<any>
  createEmergencyAlert: MockedFunction<any>
  clearAllAlerts: MockedFunction<any>
}

describe('Alerts Store', () => {
  let mockAlert: GlobalAlert

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // Clear any timers
    vi.clearAllTimers()
    
    mockAlert = {
      id: 'alert-1',
      type: 'system',
      title: 'Test Alert',
      message: 'This is a test alert',
      priority: 'high',
      isActive: true,
      displayScreens: ['all'],
      startTime: '2024-12-25T10:00:00Z',
      endTime: '2024-12-25T18:00:00Z',
      createdAt: '2024-12-25T09:00:00Z',
      updatedAt: '2024-12-25T09:00:00Z'
    }
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useAlertsStore()
      
      expect(store.alerts).toEqual([])
      expect(store.activeAlerts).toEqual([])
      expect(store.currentAlert).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.uiNotifications).toEqual([])
    })

    it('should compute alert stats correctly', () => {
      const store = useAlertsStore()
      
      // Initially empty
      expect(store.alertsStats).toEqual({
        total: 0,
        active: 0,
        byType: {},
        byPriority: {},
        expiringSoon: 0
      })
      
      // Add alerts
      store.alerts = [
        mockAlert,
        { ...mockAlert, id: 'alert-2', type: 'weather', priority: 'critical', isActive: false },
        { ...mockAlert, id: 'alert-3', type: 'system', priority: 'low' }
      ]
      store.activeAlerts = [mockAlert, { ...mockAlert, id: 'alert-3', type: 'system', priority: 'low' }]
      
      const stats = store.alertsStats
      expect(stats.total).toBe(3)
      expect(stats.active).toBe(2)
      expect(stats.byType.system).toBe(2)
      expect(stats.byType.weather).toBe(1)
      expect(stats.byPriority.high).toBe(1)
      expect(stats.byPriority.critical).toBe(1)
      expect(stats.byPriority.low).toBe(1)
    })
  })

  describe('Alerts Fetching', () => {
    it('should fetch alerts successfully', async () => {
      const store = useAlertsStore()
      const mockAlerts = [mockAlert]
      
      mockAlertsApiService.getAlerts.mockResolvedValueOnce({
        data: mockAlerts,
        status: 200
      } as ApiResponse<GlobalAlert[]>)
      
      const result = await store.fetchAlerts()
      
      expect(result).toBe(true)
      expect(store.alerts).toEqual(mockAlerts)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should handle fetch alerts failure', async () => {
      const store = useAlertsStore()
      
      mockAlertsApiService.getAlerts.mockRejectedValueOnce({
        message: 'Failed to fetch alerts',
        status: 500
      })
      
      const result = await store.fetchAlerts()
      
      expect(result).toBe(false)
      expect(store.alerts).toEqual([])
      expect(store.error).toBe('Failed to fetch alerts')
      expect(store.isLoading).toBe(false)
    })

    it('should fetch active alerts successfully', async () => {
      const store = useAlertsStore()
      const mockActiveAlerts = [mockAlert]
      
      mockAlertsApiService.getActiveAlerts.mockResolvedValueOnce({
        data: mockActiveAlerts,
        status: 200
      } as ApiResponse<GlobalAlert[]>)
      
      const result = await store.fetchActiveAlerts()
      
      expect(result).toBe(true)
      expect(store.activeAlerts).toEqual(mockActiveAlerts)
    })

    it('should fetch single alert successfully', async () => {
      const store = useAlertsStore()
      store.alerts = [mockAlert]
      
      mockAlertsApiService.getAlert.mockResolvedValueOnce({
        data: mockAlert,
        status: 200
      } as ApiResponse<GlobalAlert>)
      
      const result = await store.fetchAlert('alert-1')
      
      expect(result).toEqual(mockAlert)
      expect(store.currentAlert).toEqual(mockAlert)
      expect(store.error).toBeNull()
    })
  })

  describe('Alert Management', () => {
    it('should create alert successfully', async () => {
      const store = useAlertsStore()
      const createData: CreateAlertData = {
        type: 'system',
        title: 'New Alert',
        message: 'This is a new alert',
        priority: 'medium',
        displayScreens: ['screen1', 'screen2'],
        startTime: '2024-12-25T12:00:00Z',
        endTime: '2024-12-25T16:00:00Z'
      }
      
      const createdAlert = { ...mockAlert, ...createData, id: 'alert-new', isActive: true }
      
      mockAlertsApiService.createAlert.mockResolvedValueOnce({
        data: createdAlert,
        status: 201
      } as ApiResponse<GlobalAlert>)
      
      const result = await store.createAlert(createData)
      
      expect(result).toEqual(createdAlert)
      expect(store.alerts[0]).toEqual(createdAlert)
      expect(store.activeAlerts[0]).toEqual(createdAlert)
      expect(store.error).toBeNull()
    })

    it('should update alert successfully', async () => {
      const store = useAlertsStore()
      store.alerts = [mockAlert]
      store.activeAlerts = [mockAlert]
      
      const updateData = {
        title: 'Updated Alert',
        priority: 'critical' as const
      }
      
      const updatedAlert = { ...mockAlert, ...updateData }
      
      mockAlertsApiService.updateAlert.mockResolvedValueOnce({
        data: updatedAlert,
        status: 200
      } as ApiResponse<GlobalAlert>)
      
      const result = await store.updateAlert('alert-1', updateData)
      
      expect(result).toEqual(updatedAlert)
      expect(store.alerts[0]).toEqual(updatedAlert)
      expect(store.activeAlerts[0]).toEqual(updatedAlert)
      expect(store.error).toBeNull()
    })

    it('should delete alert successfully', async () => {
      const store = useAlertsStore()
      store.alerts = [mockAlert]
      store.activeAlerts = [mockAlert]
      store.currentAlert = mockAlert
      
      mockAlertsApiService.deleteAlert.mockResolvedValueOnce({
        data: { message: 'Alert deleted' },
        status: 200
      })
      
      const result = await store.deleteAlert('alert-1')
      
      expect(result).toBe(true)
      expect(store.alerts).toEqual([])
      expect(store.activeAlerts).toEqual([])
      expect(store.currentAlert).toBeNull()
      expect(store.error).toBeNull()
    })
  })

  describe('Alert Status Management', () => {
    it('should activate alert successfully', async () => {
      const store = useAlertsStore()
      const inactiveAlert = { ...mockAlert, isActive: false }
      store.alerts = [inactiveAlert]
      store.activeAlerts = []
      
      const activatedAlert = { ...mockAlert, isActive: true }
      
      mockAlertsApiService.activateAlert.mockResolvedValueOnce({
        data: activatedAlert,
        status: 200
      } as ApiResponse<GlobalAlert>)
      
      const result = await store.activateAlert('alert-1')
      
      expect(result).toBe(true)
      expect(store.alerts[0].isActive).toBe(true)
      expect(store.activeAlerts).toContain(activatedAlert)
    })

    it('should deactivate alert successfully', async () => {
      const store = useAlertsStore()
      store.alerts = [mockAlert]
      store.activeAlerts = [mockAlert]
      
      const deactivatedAlert = { ...mockAlert, isActive: false }
      
      mockAlertsApiService.deactivateAlert.mockResolvedValueOnce({
        data: deactivatedAlert,
        status: 200
      } as ApiResponse<GlobalAlert>)
      
      const result = await store.deactivateAlert('alert-1')
      
      expect(result).toBe(true)
      expect(store.alerts[0].isActive).toBe(false)
      expect(store.activeAlerts).toEqual([])
    })

    it('should create emergency alert successfully', async () => {
      const store = useAlertsStore()
      
      const emergencyAlert = {
        ...mockAlert,
        id: 'emergency-1',
        type: 'emergency' as const,
        title: 'Emergency Alert',
        message: 'Emergency situation',
        priority: 'critical' as const,
        isActive: true
      }
      
      mockAlertsApiService.createEmergencyAlert.mockResolvedValueOnce({
        data: emergencyAlert,
        status: 201
      } as ApiResponse<GlobalAlert>)
      
      const result = await store.createEmergencyAlert('Emergency Alert', 'Emergency situation', ['all'])
      
      expect(result).toBe(true)
      expect(store.alerts[0]).toEqual(emergencyAlert)
      expect(store.activeAlerts[0]).toEqual(emergencyAlert)
    })

    it('should clear all alerts successfully', async () => {
      const store = useAlertsStore()
      store.alerts = [mockAlert, { ...mockAlert, id: 'alert-2' }]
      store.activeAlerts = [mockAlert, { ...mockAlert, id: 'alert-2' }]
      
      mockAlertsApiService.clearAllAlerts.mockResolvedValueOnce({
        data: { cleared: 2, message: 'All alerts cleared' },
        status: 200
      })
      
      const result = await store.clearAllAlerts()
      
      expect(result).toBe(true)
      expect(store.activeAlerts).toEqual([])
      expect(store.alerts.every(alert => !alert.isActive)).toBe(true)
    })
  })

  describe('Alert Filtering and Grouping', () => {
    beforeEach(() => {
      const store = useAlertsStore()
      const now = new Date()
      const soonExpiring = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
      
      store.alerts = [
        { ...mockAlert, id: 'alert-1', type: 'system', priority: 'high' },
        { ...mockAlert, id: 'alert-2', type: 'weather', priority: 'critical' },
        { ...mockAlert, id: 'alert-3', type: 'system', priority: 'low', endTime: soonExpiring.toISOString() }
      ]
      store.activeAlerts = [
        { ...mockAlert, id: 'alert-1', type: 'system', priority: 'high' },
        { ...mockAlert, id: 'alert-2', type: 'weather', priority: 'critical' },
        { ...mockAlert, id: 'alert-3', type: 'system', priority: 'low', endTime: soonExpiring.toISOString() }
      ]
    })

    it('should group alerts by type', () => {
      const store = useAlertsStore()
      
      const byType = store.alertsByType
      
      expect(byType.system).toHaveLength(2)
      expect(byType.weather).toHaveLength(1)
    })

    it('should group alerts by priority', () => {
      const store = useAlertsStore()
      
      const byPriority = store.alertsByPriority
      
      expect(byPriority.high).toHaveLength(1)
      expect(byPriority.critical).toHaveLength(1)
      expect(byPriority.low).toHaveLength(1)
    })

    it('should get critical alerts', () => {
      const store = useAlertsStore()
      
      const critical = store.criticalAlerts
      
      expect(critical).toHaveLength(1)
      expect(critical[0].priority).toBe('critical')
    })

    it('should get high priority alerts', () => {
      const store = useAlertsStore()
      
      const highPriority = store.highPriorityAlerts
      
      expect(highPriority).toHaveLength(1)
      expect(highPriority[0].priority).toBe('high')
    })

    it('should get expiring soon alerts', () => {
      const store = useAlertsStore()
      
      const expiringSoon = store.expiringSoonAlerts
      
      expect(expiringSoon).toHaveLength(1)
    })
  })

  describe('UI Notifications', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should show notification successfully', () => {
      const store = useAlertsStore()
      
      const notificationId = store.showNotification('success', 'Test Title', 'Test message')
      
      expect(store.uiNotifications).toHaveLength(1)
      expect(store.uiNotifications[0]).toMatchObject({
        id: notificationId,
        type: 'success',
        title: 'Test Title',
        message: 'Test message',
        timeout: 5000,
        persistent: false
      })
    })

    it('should auto-dismiss non-persistent notifications', () => {
      const store = useAlertsStore()
      
      const notificationId = store.showNotification('info', 'Test', 'Test message')
      
      expect(store.uiNotifications).toHaveLength(1)
      
      // Fast-forward time
      vi.advanceTimersByTime(5000)
      
      expect(store.uiNotifications).toHaveLength(0)
    })

    it('should not auto-dismiss persistent notifications', () => {
      const store = useAlertsStore()
      
      const notificationId = store.showNotification('warning', 'Persistent', 'Test message', {
        persistent: true
      })
      
      expect(store.uiNotifications).toHaveLength(1)
      
      // Fast-forward time
      vi.advanceTimersByTime(10000)
      
      expect(store.uiNotifications).toHaveLength(1)
    })

    it('should dismiss specific notification', () => {
      const store = useAlertsStore()
      
      const id1 = store.showNotification('info', 'Test 1', 'Message 1', { persistent: true })
      const id2 = store.showNotification('info', 'Test 2', 'Message 2', { persistent: true })
      
      expect(store.uiNotifications).toHaveLength(2)
      
      store.dismissNotification(id1)
      
      expect(store.uiNotifications).toHaveLength(1)
      expect(store.uiNotifications[0].id).toBe(id2)
    })

    it('should dismiss all notifications', () => {
      const store = useAlertsStore()
      
      store.showNotification('info', 'Test 1', 'Message 1', { persistent: true })
      store.showNotification('info', 'Test 2', 'Message 2', { persistent: true })
      
      expect(store.uiNotifications).toHaveLength(2)
      
      store.dismissAllNotifications()
      
      expect(store.uiNotifications).toHaveLength(0)
    })
  })

  describe('Utility Functions', () => {
    it('should clear error', () => {
      const store = useAlertsStore()
      
      store.error = 'Some error'
      expect(store.error).toBe('Some error')
      
      store.clearError()
      expect(store.error).toBeNull()
    })

    it('should clear current alert', () => {
      const store = useAlertsStore()
      
      store.currentAlert = mockAlert
      expect(store.currentAlert).toEqual(mockAlert)
      
      store.clearCurrentAlert()
      expect(store.currentAlert).toBeNull()
    })

    it('should refresh all data', async () => {
      const store = useAlertsStore()
      
      mockAlertsApiService.getAlerts.mockResolvedValueOnce({
        data: [mockAlert],
        status: 200
      })
      
      mockAlertsApiService.getActiveAlerts.mockResolvedValueOnce({
        data: [mockAlert],
        status: 200
      })
      
      await store.refreshAll()
      
      expect(mockAlertsApiService.getAlerts).toHaveBeenCalled()
      expect(mockAlertsApiService.getActiveAlerts).toHaveBeenCalled()
      expect(store.alerts).toEqual([mockAlert])
      expect(store.activeAlerts).toEqual([mockAlert])
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const store = useAlertsStore()
      
      mockAlertsApiService.createAlert.mockRejectedValueOnce({
        message: 'Validation error',
        status: 400
      })
      
      const result = await store.createAlert({
        type: 'system',
        title: '',
        message: 'Invalid alert',
        priority: 'low',
        displayScreens: []
      })
      
      expect(result).toBeNull()
      expect(store.error).toBe('Validation error')
      expect(store.uiNotifications).toHaveLength(1)
      expect(store.uiNotifications[0].type).toBe('error')
    })

    it('should handle network errors', async () => {
      const store = useAlertsStore()
      
      mockAlertsApiService.getAlerts.mockRejectedValueOnce({
        message: 'Network error',
        status: undefined
      })
      
      const result = await store.fetchAlerts()
      
      expect(result).toBe(false)
      expect(store.error).toBe('Network error')
    })
  })
})