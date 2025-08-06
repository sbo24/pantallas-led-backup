// Config Store Tests - ShowsTrack Frontend
// Tests for system configuration store functionality

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConfigStore } from '../config'
import ConfigApiService from '@/services/api/config'
import type { SystemConfig, ApiResponse } from '@/types/api'

// Mock API service
vi.mock('@/services/api/config')
const mockConfigApiService = ConfigApiService as {
  getConfig: MockedFunction<any>
  updateConfig: MockedFunction<any>
  resetConfig: MockedFunction<any>
  validateConfig: MockedFunction<any>
  getConfigHistory: MockedFunction<any>
  getConfigBackup: MockedFunction<any>
  restoreConfigBackup: MockedFunction<any>
  exportConfig: MockedFunction<any>
  importConfig: MockedFunction<any>
  getSystemInfo: MockedFunction<any>
  getSystemHealth: MockedFunction<any>
  getSystemMetrics: MockedFunction<any>
  getSystemLogs: MockedFunction<any>
}

describe('Config Store', () => {
  let mockConfig: SystemConfig

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    mockConfig = {
      id: 'config-1',
      leadTimeMinutes: 30,
      sessionTimeoutMinutes: 30,
      maxConcurrentUsers: 10,
      enableRealTimeSync: true,
      syncIntervalSeconds: 60,
      enableWeatherIntegration: true,
      defaultVenue: 'Main Theater',
      emergencyContactEmail: 'emergency@showstrack.com',
      emergencyContactPhone: '+1-555-0123',
      displayRefreshSeconds: 30,
      alertRetentionDays: 30,
      logRetentionDays: 90,
      backupFrequencyHours: 6,
      enableNotifications: true,
      notificationChannels: ['email', 'sms'],
      timeZone: 'Europe/Madrid',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24',
      language: 'es',
      theme: 'light',
      enableAuditLog: true,
      maxFileUploadSizeMB: 10,
      allowedFileTypes: ['pdf', 'jpg', 'png'],
      enableMaintenanceMode: false,
      maintenanceMessage: '',
      version: '1.0.0',
      environment: 'development',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z'
    }
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useConfigStore()
      
      expect(store.config).toBeNull()
      expect(store.configHistory).toEqual([])
      expect(store.systemInfo).toBeNull()
      expect(store.systemHealth).toBeNull()
      expect(store.systemMetrics).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.lastSyncTime).toBeNull()
    })

    it('should compute configuration status correctly', () => {
      const store = useConfigStore()
      
      // No config loaded
      expect(store.hasConfig).toBe(false)
      expect(store.isConfigured).toBe(false)
      
      // Config loaded
      store.config = mockConfig
      expect(store.hasConfig).toBe(true)
      expect(store.isConfigured).toBe(true)
    })
  })

  describe('Configuration Management', () => {
    it('should fetch config successfully', async () => {
      const store = useConfigStore()
      
      mockConfigApiService.getConfig.mockResolvedValueOnce({
        data: mockConfig,
        status: 200
      } as ApiResponse<SystemConfig>)
      
      const result = await store.fetchConfig()
      
      expect(result).toEqual(mockConfig)
      expect(store.config).toEqual(mockConfig)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.lastSyncTime).toBeInstanceOf(Date)
    })

    it('should handle fetch config failure', async () => {
      const store = useConfigStore()
      
      mockConfigApiService.getConfig.mockRejectedValueOnce({
        message: 'Failed to fetch config',
        status: 500
      })
      
      const result = await store.fetchConfig()
      
      expect(result).toBeNull()
      expect(store.config).toBeNull()
      expect(store.error).toBe('Failed to fetch config')
      expect(store.isLoading).toBe(false)
    })

    it('should update config successfully', async () => {
      const store = useConfigStore()
      store.config = mockConfig
      
      const updateData = {
        leadTimeMinutes: 45,
        enableRealTimeSync: false
      }
      
      const updatedConfig = { ...mockConfig, ...updateData }
      
      mockConfigApiService.updateConfig.mockResolvedValueOnce({
        data: updatedConfig,
        status: 200
      } as ApiResponse<SystemConfig>)
      
      const result = await store.updateConfig(updateData)
      
      expect(result).toEqual(updatedConfig)
      expect(store.config).toEqual(updatedConfig)
      expect(store.error).toBeNull()
    })

    it('should handle update config failure', async () => {
      const store = useConfigStore()
      
      mockConfigApiService.updateConfig.mockRejectedValueOnce({
        message: 'Invalid configuration',
        status: 400
      })
      
      const result = await store.updateConfig({ leadTimeMinutes: -5 })
      
      expect(result).toBeNull()
      expect(store.error).toBe('Invalid configuration')
    })

    it('should reset config successfully', async () => {
      const store = useConfigStore()
      
      const defaultConfig = { ...mockConfig, leadTimeMinutes: 30, enableRealTimeSync: true }
      
      mockConfigApiService.resetConfig.mockResolvedValueOnce({
        data: defaultConfig,
        status: 200
      } as ApiResponse<SystemConfig>)
      
      const result = await store.resetConfig()
      
      expect(result).toEqual(defaultConfig)
      expect(store.config).toEqual(defaultConfig)
      expect(store.error).toBeNull()
    })
  })

  describe('Configuration Validation', () => {
    it('should validate config successfully', async () => {
      const store = useConfigStore()
      
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: []
      }
      
      mockConfigApiService.validateConfig.mockResolvedValueOnce({
        data: validationResult,
        status: 200
      })
      
      const result = await store.validateConfig(mockConfig)
      
      expect(result).toEqual(validationResult)
      expect(store.error).toBeNull()
    })

    it('should handle validation failure', async () => {
      const store = useConfigStore()
      
      const validationResult = {
        isValid: false,
        errors: ['leadTimeMinutes must be positive'],
        warnings: ['Large session timeout may affect performance']
      }
      
      mockConfigApiService.validateConfig.mockResolvedValueOnce({
        data: validationResult,
        status: 200
      })
      
      const result = await store.validateConfig({ ...mockConfig, leadTimeMinutes: -5 })
      
      expect(result).toEqual(validationResult)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('leadTimeMinutes must be positive')
    })
  })

  describe('Configuration History', () => {
    it('should fetch config history successfully', async () => {
      const store = useConfigStore()
      
      const historyData = [
        {
          id: 'history-1',
          configSnapshot: mockConfig,
          changedBy: 'admin',
          changeReason: 'Updated lead time',
          createdAt: '2024-01-01T12:00:00Z'
        }
      ]
      
      mockConfigApiService.getConfigHistory.mockResolvedValueOnce({
        data: historyData,
        status: 200
      })
      
      const result = await store.fetchConfigHistory()
      
      expect(result).toEqual(historyData)
      expect(store.configHistory).toEqual(historyData)
      expect(store.error).toBeNull()
    })
  })

  describe('Configuration Backup and Restore', () => {
    it('should create config backup successfully', async () => {
      const store = useConfigStore()
      
      const backupData = {
        id: 'backup-1',
        config: mockConfig,
        createdAt: '2024-01-01T12:00:00Z'
      }
      
      mockConfigApiService.getConfigBackup.mockResolvedValueOnce({
        data: backupData,
        status: 200
      })
      
      const result = await store.createConfigBackup()
      
      expect(result).toEqual(backupData)
      expect(store.error).toBeNull()
    })

    it('should restore config backup successfully', async () => {
      const store = useConfigStore()
      
      const restoredConfig = { ...mockConfig, leadTimeMinutes: 60 }
      
      mockConfigApiService.restoreConfigBackup.mockResolvedValueOnce({
        data: restoredConfig,
        status: 200
      } as ApiResponse<SystemConfig>)
      
      const result = await store.restoreConfigBackup('backup-1')
      
      expect(result).toEqual(restoredConfig)
      expect(store.config).toEqual(restoredConfig)
      expect(store.error).toBeNull()
    })
  })

  describe('Configuration Import/Export', () => {
    it('should export config successfully', async () => {
      const store = useConfigStore()
      
      const exportData = {
        config: mockConfig,
        exportedAt: '2024-01-01T12:00:00Z',
        version: '1.0.0'
      }
      
      mockConfigApiService.exportConfig.mockResolvedValueOnce({
        data: exportData,
        status: 200
      })
      
      const result = await store.exportConfig()
      
      expect(result).toEqual(exportData)
      expect(store.error).toBeNull()
    })

    it('should import config successfully', async () => {
      const store = useConfigStore()
      
      const importedConfig = { ...mockConfig, leadTimeMinutes: 40 }
      const importData = {
        config: importedConfig,
        importedAt: '2024-01-01T12:00:00Z'
      }
      
      mockConfigApiService.importConfig.mockResolvedValueOnce({
        data: importedConfig,
        status: 200
      } as ApiResponse<SystemConfig>)
      
      const result = await store.importConfig(importData)
      
      expect(result).toEqual(importedConfig)
      expect(store.config).toEqual(importedConfig)
      expect(store.error).toBeNull()
    })
  })

  describe('System Information', () => {
    it('should fetch system info successfully', async () => {
      const store = useConfigStore()
      
      const systemInfo = {
        version: '1.0.0',
        environment: 'development',
        uptime: '2 days, 4 hours',
        platform: 'linux',
        nodeVersion: '18.17.0',
        memory: {
          used: '512MB',
          total: '2GB'
        },
        database: {
          status: 'connected',
          version: '15.3'
        }
      }
      
      mockConfigApiService.getSystemInfo.mockResolvedValueOnce({
        data: systemInfo,
        status: 200
      })
      
      const result = await store.fetchSystemInfo()
      
      expect(result).toEqual(systemInfo)
      expect(store.systemInfo).toEqual(systemInfo)
      expect(store.error).toBeNull()
    })

    it('should fetch system health successfully', async () => {
      const store = useConfigStore()
      
      const systemHealth = {
        status: 'healthy',
        services: {
          database: 'healthy',
          cache: 'healthy',
          external_api: 'degraded'
        },
        lastChecked: '2024-01-01T12:00:00Z'
      }
      
      mockConfigApiService.getSystemHealth.mockResolvedValueOnce({
        data: systemHealth,
        status: 200
      })
      
      const result = await store.fetchSystemHealth()
      
      expect(result).toEqual(systemHealth)
      expect(store.systemHealth).toEqual(systemHealth)
      expect(store.error).toBeNull()
    })

    it('should fetch system metrics successfully', async () => {
      const store = useConfigStore()
      
      const systemMetrics = {
        cpu: {
          usage: 45.5,
          cores: 4
        },
        memory: {
          used: 67.2,
          available: 32.8
        },
        disk: {
          used: 23.1,
          available: 76.9
        },
        network: {
          inbound: '150 Mbps',
          outbound: '75 Mbps'
        },
        requests: {
          total: 15420,
          errors: 12,
          avgResponseTime: 245
        }
      }
      
      mockConfigApiService.getSystemMetrics.mockResolvedValueOnce({
        data: systemMetrics,
        status: 200
      })
      
      const result = await store.fetchSystemMetrics()
      
      expect(result).toEqual(systemMetrics)
      expect(store.systemMetrics).toEqual(systemMetrics)
      expect(store.error).toBeNull()
    })
  })

  describe('System Monitoring', () => {
    it('should compute system health status', () => {
      const store = useConfigStore()
      
      // No health data
      expect(store.isSystemHealthy).toBe(false)
      
      // Healthy system
      store.systemHealth = {
        status: 'healthy',
        services: { database: 'healthy', cache: 'healthy' },
        lastChecked: '2024-01-01T12:00:00Z'
      }
      expect(store.isSystemHealthy).toBe(true)
      
      // Degraded system
      store.systemHealth = {
        status: 'degraded',
        services: { database: 'healthy', cache: 'unhealthy' },
        lastChecked: '2024-01-01T12:00:00Z'
      }
      expect(store.isSystemHealthy).toBe(false)
    })

    it('should check if config needs sync', () => {
      const store = useConfigStore()
      
      // No sync time - needs sync
      expect(store.needsSync).toBe(true)
      
      // Recent sync - doesn't need sync
      store.lastSyncTime = new Date()
      expect(store.needsSync).toBe(false)
      
      // Old sync - needs sync
      const oldDate = new Date()
      oldDate.setHours(oldDate.getHours() - 2)
      store.lastSyncTime = oldDate
      expect(store.needsSync).toBe(true)
    })
  })

  describe('Utility Functions', () => {
    it('should clear error', () => {
      const store = useConfigStore()
      
      store.error = 'Some error'
      expect(store.error).toBe('Some error')
      
      store.clearError()
      expect(store.error).toBeNull()
    })

    it('should initialize config', async () => {
      const store = useConfigStore()
      
      mockConfigApiService.getConfig.mockResolvedValueOnce({
        data: mockConfig,
        status: 200
      })
      
      await store.initializeConfig()
      
      expect(mockConfigApiService.getConfig).toHaveBeenCalled()
      expect(store.config).toEqual(mockConfig)
    })

    it('should refresh all data', async () => {
      const store = useConfigStore()
      
      mockConfigApiService.getConfig.mockResolvedValueOnce({
        data: mockConfig,
        status: 200
      })
      
      const systemInfo = { version: '1.0.0', environment: 'test' }
      mockConfigApiService.getSystemInfo.mockResolvedValueOnce({
        data: systemInfo,
        status: 200
      })
      
      const systemHealth = { status: 'healthy', services: {}, lastChecked: '2024-01-01T12:00:00Z' }
      mockConfigApiService.getSystemHealth.mockResolvedValueOnce({
        data: systemHealth,
        status: 200
      })
      
      await store.refreshAll()
      
      expect(store.config).toEqual(mockConfig)
      expect(store.systemInfo).toEqual(systemInfo)
      expect(store.systemHealth).toEqual(systemHealth)
    })
  })

  describe('Configuration Getters', () => {
    beforeEach(() => {
      const store = useConfigStore()
      store.config = mockConfig
    })

    it('should get configuration values', () => {
      const store = useConfigStore()
      
      expect(store.getConfigValue('leadTimeMinutes')).toBe(30)
      expect(store.getConfigValue('enableRealTimeSync')).toBe(true)
      expect(store.getConfigValue('nonExistentKey')).toBeUndefined()
    })

    it('should get configuration values with defaults', () => {
      const store = useConfigStore()
      
      expect(store.getConfigValue('leadTimeMinutes', 60)).toBe(30)
      expect(store.getConfigValue('nonExistentKey', 'default')).toBe('default')
    })

    it('should check if maintenance mode is enabled', () => {
      const store = useConfigStore()
      
      expect(store.isMaintenanceMode).toBe(false)
      
      store.config = { ...mockConfig, enableMaintenanceMode: true }
      expect(store.isMaintenanceMode).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const store = useConfigStore()
      
      mockConfigApiService.updateConfig.mockRejectedValueOnce({
        message: 'Validation failed',
        status: 400
      })
      
      const result = await store.updateConfig({ leadTimeMinutes: -1 })
      
      expect(result).toBeNull()
      expect(store.error).toBe('Validation failed')
    })

    it('should handle network errors', async () => {
      const store = useConfigStore()
      
      mockConfigApiService.getConfig.mockRejectedValueOnce({
        message: 'Network error',
        status: undefined
      })
      
      const result = await store.fetchConfig()
      
      expect(result).toBeNull()
      expect(store.error).toBe('Network error')
    })
  })
})