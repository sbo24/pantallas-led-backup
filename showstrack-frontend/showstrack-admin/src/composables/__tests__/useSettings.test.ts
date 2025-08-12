import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import { useSettings } from '../useSettings'
import { useConfigStore } from '@/stores/config'
import type { SystemConfig, UpdateConfigData, GlobalConfiguration } from '@/types/api'

// Mock the notifications composable
const mockShowToast = vi.fn()
const mockShowSuccessToast = vi.fn()
const mockShowErrorToast = vi.fn()
const mockShowWarningToast = vi.fn()
vi.mock('../useNotifications', () => ({
  useNotifications: () => ({
    showToast: mockShowToast,
    showErrorToast: mockShowErrorToast,
    showSuccessToast: mockShowSuccessToast,
    showWarningToast: mockShowWarningToast
  })
}))

describe('useSettings', () => {
  let pinia: ReturnType<typeof createTestingPinia>
  
  const mockConfig: SystemConfig = {
    id: '1',
    key: 'default_lead_time_minutes',
    value: 30,
    description: 'Default lead time in minutes',
    type: 'number',
    category: 'general',
    isEditable: true,
    updatedAt: '2024-01-01T00:00:00Z'
  }

  const mockGlobalConfig: GlobalConfiguration = {
    defaultLeadTimeMinutes: 30,
    operationMode: 'automatic',
    venueOpenTime: '09:00',
    venueCloseTime: '22:00',
    displayRefreshSeconds: 30,
    maxConcurrentOverrides: 5,
    alertRetentionDays: 7
  }

  beforeEach(() => {
    pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false
    })
    setActivePinia(pinia)
    vi.clearAllMocks()
    mockShowToast.mockClear()
    mockShowSuccessToast.mockClear()
    mockShowErrorToast.mockClear()
    mockShowWarningToast.mockClear()

    // Setup default store state
    const store = useConfigStore()
    store.configs = []
    store.globalConfig = null
    store.isLoading = false
    store.error = null
    store.getConfigValue = vi.fn().mockReturnValue(true)
    store.refreshAll = vi.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic functionality', () => {
    it('should initialize with store data', () => {
      const store = useConfigStore()
      store.configs = [mockConfig]
      store.globalConfig = mockGlobalConfig
      
      const { configs, globalConfig, loading, error } = useSettings()
      
      expect(configs.value).toEqual([mockConfig])
      expect(globalConfig.value).toEqual(mockGlobalConfig)
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should reflect store loading state', () => {
      const store = useConfigStore()
      store.isLoading = true
      
      const { loading } = useSettings()
      
      expect(loading.value).toBe(true)
    })
  })

  describe('Form management', () => {
    it('should initialize form with current values', () => {
      const store = useConfigStore()
      store.globalConfig = mockGlobalConfig
      
      const { formData, resetForm } = useSettings()
      
      expect(formData.value.general.defaultLeadTimeMinutes).toBe(30)
      expect(formData.value.general.operationMode).toBe('automatic')
      expect(formData.value.display.refreshSeconds).toBe(30)
      expect(formData.value.venue.openTime).toBe('09:00')
      expect(formData.value.venue.closeTime).toBe('22:00')
    })

    it('should track form changes', () => {
      const store = useConfigStore()
      store.globalConfig = mockGlobalConfig
      
      const { formData, hasChanges, getChangedFields } = useSettings()
      
      // Initially no changes
      expect(hasChanges.value).toBe(false)
      expect(getChangedFields().length).toBe(0)
      
      // Make changes
      formData.value.general.defaultLeadTimeMinutes = 45
      formData.value.general.operationMode = 'manual'
      
      expect(hasChanges.value).toBe(true)
      const changedFields = getChangedFields()
      expect(changedFields).toHaveLength(2)
      expect(changedFields.map(f => f.key)).toContain('defaultLeadTimeMinutes')
      expect(changedFields.map(f => f.key)).toContain('operationMode')
    })

    it('should reset form to initial values', () => {
      const store = useConfigStore()
      store.globalConfig = mockGlobalConfig
      
      const { formData, resetForm, hasChanges } = useSettings()
      
      // Make changes
      formData.value.general.defaultLeadTimeMinutes = 45
      formData.value.general.operationMode = 'manual'
      
      expect(hasChanges.value).toBe(true)
      
      // Reset form
      resetForm()
      
      expect(hasChanges.value).toBe(false)
      expect(formData.value.general.defaultLeadTimeMinutes).toBe(30)
      expect(formData.value.general.operationMode).toBe('automatic')
    })
  })

  describe('Form validation', () => {
    it('should validate required fields', () => {
      const { formData, validateForm } = useSettings()
      
      // Test with invalid values
      formData.value.general.defaultLeadTimeMinutes = -1 // Invalid: negative
      formData.value.display.refreshSeconds = 0 // Invalid: too low
      formData.value.venue.openTime = '' // Invalid: empty
      
      const result = validateForm()
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.field === 'defaultLeadTimeMinutes')).toBe(true)
      expect(result.errors.some(e => e.field === 'refreshSeconds')).toBe(true)
      expect(result.errors.some(e => e.field === 'openTime')).toBe(true)
    })

    it('should pass validation with valid values', () => {
      const { formData, validateForm } = useSettings()
      
      // Set valid values
      formData.value.general.defaultLeadTimeMinutes = 30
      formData.value.display.refreshSeconds = 30
      formData.value.venue.openTime = '09:00'
      formData.value.venue.closeTime = '22:00'
      
      const result = validateForm()
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate time ranges', () => {
      const { formData, validateForm } = useSettings()
      
      // Invalid: close time before open time
      formData.value.venue.openTime = '22:00'
      formData.value.venue.closeTime = '09:00'
      
      const result = validateForm()
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('hora de cierre debe ser posterior'))).toBe(true)
    })
  })

  describe('Settings update operations', () => {
    it('should update individual setting', async () => {
      const store = useConfigStore()
      const updatedConfig = { ...mockConfig, value: 45 }
      store.updateConfig = vi.fn().mockResolvedValue(updatedConfig)
      
      const { updateSingleSetting } = useSettings()
      
      const result = await updateSingleSetting('default_lead_time_minutes', 45)
      
      expect(store.updateConfig).toHaveBeenCalledWith('default_lead_time_minutes', { value: 45 })
      expect(result).toBe(updatedConfig)
      expect(mockShowSuccessToast).toHaveBeenCalledWith(
        'Configuración actualizada exitosamente'
      )
    })

    it('should handle update failure', async () => {
      const store = useConfigStore()
      store.updateConfig = vi.fn().mockResolvedValue(null)
      store.error = 'Update failed'
      
      const { updateSingleSetting } = useSettings()
      
      const result = await updateSingleSetting('default_lead_time_minutes', 45)
      
      expect(result).toBeNull()
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        'Error al actualizar configuración: Update failed'
      )
    })

    it('should save all form changes', async () => {
      const store = useConfigStore()
      store.globalConfig = mockGlobalConfig
      store.bulkUpdateConfig = vi.fn().mockResolvedValue({ updated: 3, errors: [] })
      
      const { formData, saveAllSettings } = useSettings()
      
      // Make changes
      formData.value.general.defaultLeadTimeMinutes = 45
      formData.value.general.operationMode = 'manual'
      formData.value.display.refreshSeconds = 60
      
      const result = await saveAllSettings()
      
      expect(store.bulkUpdateConfig).toHaveBeenCalledWith([
        { key: 'default_lead_time_minutes', value: 45 },
        { key: 'operation_mode', value: 'manual' },
        { key: 'display_refresh_seconds', value: 60 }
      ])
      expect(result?.updated).toBe(3)
      expect(mockShowSuccessToast).toHaveBeenCalledWith(
        '3 configuraciones actualizadas exitosamente'
      )
    })

    it('should handle partial save failures', async () => {
      const store = useConfigStore()
      store.globalConfig = mockGlobalConfig
      store.bulkUpdateConfig = vi.fn().mockResolvedValue({ 
        updated: 2, 
        errors: ['Error updating operation_mode'] 
      })
      
      const { formData, saveAllSettings } = useSettings()
      
      // Make changes
      formData.value.general.defaultLeadTimeMinutes = 45
      formData.value.general.operationMode = 'manual'
      formData.value.display.refreshSeconds = 60
      
      const result = await saveAllSettings()
      
      expect(result?.updated).toBe(2)
      expect(result?.errors).toHaveLength(1)
      expect(mockShowWarningToast).toHaveBeenCalledWith(
        'Guardado parcial: 2 exitosos, 1 errores'
      )
    })
  })

  describe('Settings sections management', () => {
    it('should provide settings organized by sections', () => {
      const store = useConfigStore()
      const configs = [
        { ...mockConfig, key: 'general_setting', category: 'general' },
        { ...mockConfig, key: 'display_setting', category: 'display' },
        { ...mockConfig, key: 'venue_setting', category: 'venue' }
      ]
      store.configs = configs
      
      const { settingsByCategory } = useSettings()
      
      // The computed should work with the store's configs
      expect(settingsByCategory.value).toBeDefined()
      expect(Object.keys(settingsByCategory.value)).toContain('general')
      expect(Object.keys(settingsByCategory.value)).toContain('display')
      expect(Object.keys(settingsByCategory.value)).toContain('venue')
    })

    it('should get editable settings only', () => {
      const store = useConfigStore()
      const configs = [
        { ...mockConfig, key: 'editable', isEditable: true },
        { ...mockConfig, key: 'readonly', isEditable: false }
      ]
      store.configs = configs
      
      const { editableSettings } = useSettings()
      
      // The computed should filter editable configs
      expect(editableSettings.value).toBeDefined()
      expect(editableSettings.value.length).toBeGreaterThan(0)
      expect(editableSettings.value.every(c => c.isEditable)).toBe(true)
    })
  })

  describe('Operation mode management', () => {
    it('should toggle operation mode', async () => {
      const store = useConfigStore()
      store.globalConfig = { ...mockGlobalConfig, operationMode: 'automatic' }
      store.setOperationMode = vi.fn().mockResolvedValue(true)
      
      const { toggleOperationMode, operationMode } = useSettings()
      
      expect(operationMode.value).toBe('automatic')
      
      const result = await toggleOperationMode()
      
      expect(store.setOperationMode).toHaveBeenCalledWith('manual')
      expect(result).toBe(true)
      expect(mockShowSuccessToast).toHaveBeenCalledWith(
        'Modo de operación cambiado a manual'
      )
    })

    it('should handle mode toggle failure', async () => {
      const store = useConfigStore()
      store.globalConfig = { ...mockGlobalConfig, operationMode: 'automatic' }
      store.setOperationMode = vi.fn().mockResolvedValue(false)
      store.error = 'Mode change failed'
      
      const { toggleOperationMode } = useSettings()
      
      const result = await toggleOperationMode()
      
      expect(result).toBe(false)
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        'Error al cambiar modo de operación: Mode change failed'
      )
    })
  })

  describe('Settings import/export', () => {
    it('should export settings', async () => {
      const store = useConfigStore()
      const configsData = [mockConfig]
      store.exportConfig = vi.fn().mockResolvedValue(configsData)
      
      const { exportSettings } = useSettings()
      
      const result = await exportSettings()
      
      expect(store.exportConfig).toHaveBeenCalled()
      expect(result).toEqual(configsData)
      expect(mockShowSuccessToast).toHaveBeenCalledWith(
        'Configuración exportada exitosamente'
      )
    })

    it('should import settings', async () => {
      const store = useConfigStore()
      const importData = [mockConfig]
      const importResult = { imported: 1, updated: 0, errors: [] }
      store.importConfig = vi.fn().mockResolvedValue(importResult)
      
      const { importSettings } = useSettings()
      
      const result = await importSettings(importData)
      
      expect(store.importConfig).toHaveBeenCalledWith(importData)
      expect(result).toEqual(importResult)
      expect(mockShowSuccessToast).toHaveBeenCalledWith(
        'Importación completada: 1 importados, 0 actualizados'
      )
    })

    it('should handle import with errors', async () => {
      const store = useConfigStore()
      const importData = [mockConfig]
      const importResult = { 
        imported: 0, 
        updated: 1, 
        errors: ['Some error occurred'] 
      }
      store.importConfig = vi.fn().mockResolvedValue(importResult)
      
      const { importSettings } = useSettings()
      
      const result = await importSettings(importData)
      
      expect(result).toEqual(importResult)
      expect(mockShowWarningToast).toHaveBeenCalledWith(
        'Importación con errores: 0 importados, 1 actualizados, 1 errores'
      )
    })
  })

  describe('Settings reset functionality', () => {
    it('should reset single setting', async () => {
      const store = useConfigStore()
      store.resetConfig = vi.fn().mockResolvedValue(true)
      
      const { resetSetting } = useSettings()
      
      const result = await resetSetting('default_lead_time_minutes')
      
      expect(store.resetConfig).toHaveBeenCalledWith('default_lead_time_minutes')
      expect(result).toBe(true)
      expect(mockShowSuccessToast).toHaveBeenCalledWith(
        'Configuración restablecida exitosamente'
      )
    })

    it('should reset all settings', async () => {
      const store = useConfigStore()
      store.resetAllConfig = vi.fn().mockResolvedValue(5)
      
      const { resetAllSettings } = useSettings()
      
      const result = await resetAllSettings()
      
      expect(store.resetAllConfig).toHaveBeenCalled()
      expect(result).toBe(5)
      expect(mockShowSuccessToast).toHaveBeenCalledWith(
        '5 configuraciones restablecidas exitosamente'
      )
    })
  })

  describe('Settings validation and health check', () => {
    it('should validate current settings', async () => {
      const store = useConfigStore()
      const validationResult = {
        valid: true,
        errors: [],
        warnings: ['Some warning']
      }
      store.validateConfig = vi.fn().mockResolvedValue(validationResult)
      
      const { validateSettings } = useSettings()
      
      const result = await validateSettings()
      
      expect(store.validateConfig).toHaveBeenCalled()
      expect(result).toEqual(validationResult)
      
      if (result && result.warnings.length > 0) {
        expect(mockShowWarningToast).toHaveBeenCalledWith(
          'Validación completada con 1 advertencias'
        )
      }
    })

    it('should handle validation with errors', async () => {
      const store = useConfigStore()
      const validationResult = {
        valid: false,
        errors: ['Critical error'],
        warnings: []
      }
      store.validateConfig = vi.fn().mockResolvedValue(validationResult)
      
      const { validateSettings } = useSettings()
      
      const result = await validateSettings()
      
      expect(result).toEqual(validationResult)
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        'Validación falló con 1 errores'
      )
    })
  })
})