/**
 * useSettings Composable
 * Advanced settings management with form handling, validation, and bulk operations
 * 
 * Features:
 * - Form management with change tracking
 * - Validation with detailed error reporting
 * - Bulk operations for settings updates
 * - Import/Export functionality  
 * - Operation mode management
 * - Settings reset and restoration
 * - Real-time validation
 * - TypeScript strict mode compatibility
 */

import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useNotifications } from './useNotifications'
import type { 
  SystemConfig, 
  UpdateConfigData, 
  GlobalConfiguration 
} from '@/types/api'

export interface FormData {
  general: {
    defaultLeadTimeMinutes: number
    operationMode: 'automatic' | 'manual'
  }
  display: {
    refreshSeconds: number
    showVenues: boolean
    showCapacity: boolean
  }
  venue: {
    openTime: string
    closeTime: string
  }
  alerts: {
    retentionDays: number
    maxConcurrentOverrides: number
  }
}

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

export interface ChangeTracker {
  key: string
  section: keyof FormData
  oldValue: any
  newValue: any
}

export interface UseSettingsOptions {
  autoValidate?: boolean
  trackChanges?: boolean
  persistDraft?: boolean
}

export interface UseSettingsReturn {
  // State
  configs: ComputedRef<SystemConfig[]>
  globalConfig: ComputedRef<GlobalConfiguration | null>
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>
  
  // Form Management
  formData: Ref<FormData>
  hasChanges: ComputedRef<boolean>
  isDirty: ComputedRef<boolean>
  
  // Computed
  settingsByCategory: ComputedRef<Record<string, SystemConfig[]>>
  editableSettings: ComputedRef<SystemConfig[]>
  operationMode: ComputedRef<'automatic' | 'manual'>
  leadTimeMinutes: ComputedRef<number>
  
  // Form Operations
  resetForm: () => void
  getChangedFields: () => ChangeTracker[]
  validateForm: () => ValidationResult
  
  // Settings Operations
  updateSingleSetting: (key: string, value: string | number | boolean) => Promise<SystemConfig | null>
  saveAllSettings: () => Promise<{ updated: number; errors: string[] } | null>
  
  // Operation Mode
  toggleOperationMode: () => Promise<boolean>
  setOperationMode: (mode: 'automatic' | 'manual') => Promise<boolean>
  
  // Bulk Operations
  resetSetting: (key: string) => Promise<boolean>
  resetAllSettings: () => Promise<number>
  
  // Import/Export
  exportSettings: () => Promise<SystemConfig[]>
  importSettings: (configData: SystemConfig[]) => Promise<{ imported: number; updated: number; errors: string[] } | null>
  
  // Validation
  validateSettings: () => Promise<{ valid: boolean; errors: string[]; warnings: string[] } | null>
  
  // Utility
  refreshData: () => Promise<void>
  clearError: () => void
}

export function useSettings(options: UseSettingsOptions = {}): UseSettingsReturn {
  const {
    autoValidate = true,
    trackChanges = true,
    persistDraft = false
  } = options

  const store = useConfigStore()
  const { showSuccessToast, showErrorToast, showWarningToast } = useNotifications()
  
  // State from store
  const configs = computed(() => store.configs)
  const globalConfig = computed(() => store.globalConfig)
  const loading = computed(() => store.isLoading)
  const error = computed(() => store.error)
  
  // Enhanced computed properties
  const settingsByCategory = computed(() => store.configsByCategory)
  const editableSettings = computed(() => store.editableConfigs)
  const operationMode = computed(() => store.operationMode)
  const leadTimeMinutes = computed(() => store.leadTimeMinutes)
  
  // Form data initialization
  const initializeFormData = (): FormData => {
    const config = globalConfig.value
    return {
      general: {
        defaultLeadTimeMinutes: config?.defaultLeadTimeMinutes || 30,
        operationMode: config?.operationMode || 'automatic'
      },
      display: {
        refreshSeconds: config?.displayRefreshSeconds || 30,
        showVenues: store.getConfigValue('show_venues') as boolean || true,
        showCapacity: store.getConfigValue('show_capacity') as boolean || true
      },
      venue: {
        openTime: config?.venueOpenTime || '09:00',
        closeTime: config?.venueCloseTime || '22:00'
      },
      alerts: {
        retentionDays: config?.alertRetentionDays || 7,
        maxConcurrentOverrides: config?.maxConcurrentOverrides || 5
      }
    }
  }
  
  // Form data
  const formData = ref<FormData>(initializeFormData())
  const initialFormData = ref<FormData>(initializeFormData())
  
  // Watch for global config changes to update form
  watch(globalConfig, (newConfig) => {
    if (newConfig) {
      const newFormData = initializeFormData()
      formData.value = newFormData
      initialFormData.value = JSON.parse(JSON.stringify(newFormData))
    }
  }, { immediate: true })
  
  // Change tracking
  const hasChanges = computed(() => {
    return JSON.stringify(formData.value) !== JSON.stringify(initialFormData.value)
  })
  
  const isDirty = computed(() => hasChanges.value)
  
  const getChangedFields = (): ChangeTracker[] => {
    const changes: ChangeTracker[] = []
    const current = formData.value
    const initial = initialFormData.value
    
    // Check each section
    Object.keys(current).forEach(sectionKey => {
      const section = sectionKey as keyof FormData
      const currentSection = current[section]
      const initialSection = initial[section]
      
      Object.keys(currentSection).forEach(fieldKey => {
        const currentValue = (currentSection as any)[fieldKey]
        const initialValue = (initialSection as any)[fieldKey]
        
        if (currentValue !== initialValue) {
          changes.push({
            key: fieldKey,
            section,
            oldValue: initialValue,
            newValue: currentValue
          })
        }
      })
    })
    
    return changes
  }
  
  // Form validation
  const validateForm = (): ValidationResult => {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    
    const data = formData.value
    
    // General section validation
    if (data.general.defaultLeadTimeMinutes < 0 || data.general.defaultLeadTimeMinutes > 120) {
      errors.push({
        field: 'defaultLeadTimeMinutes',
        message: 'El tiempo de anticipación debe estar entre 0 y 120 minutos',
        severity: 'error'
      })
    }
    
    // Display section validation
    if (data.display.refreshSeconds < 5 || data.display.refreshSeconds > 300) {
      errors.push({
        field: 'refreshSeconds',
        message: 'El intervalo de refresco debe estar entre 5 y 300 segundos',
        severity: 'error'
      })
    }
    
    // Venue section validation
    if (!data.venue.openTime) {
      errors.push({
        field: 'openTime',
        message: 'La hora de apertura es obligatoria',
        severity: 'error'
      })
    }
    
    if (!data.venue.closeTime) {
      errors.push({
        field: 'closeTime',
        message: 'La hora de cierre es obligatoria',
        severity: 'error'
      })
    }
    
    // Validate time range
    if (data.venue.openTime && data.venue.closeTime) {
      const openTime = new Date(`2000-01-01T${data.venue.openTime}:00`)
      const closeTime = new Date(`2000-01-01T${data.venue.closeTime}:00`)
      
      if (closeTime <= openTime) {
        errors.push({
          field: 'closeTime',
          message: 'La hora de cierre debe ser posterior a la hora de apertura',
          severity: 'error'
        })
      }
    }
    
    // Alerts section validation
    if (data.alerts.retentionDays < 1 || data.alerts.retentionDays > 365) {
      errors.push({
        field: 'retentionDays',
        message: 'Los días de retención deben estar entre 1 y 365',
        severity: 'error'
      })
    }
    
    if (data.alerts.maxConcurrentOverrides < 1 || data.alerts.maxConcurrentOverrides > 50) {
      errors.push({
        field: 'maxConcurrentOverrides',
        message: 'El máximo de overrides concurrentes debe estar entre 1 y 50',
        severity: 'error'
      })
    }
    
    // Warnings
    if (data.display.refreshSeconds < 15) {
      warnings.push({
        field: 'refreshSeconds',
        message: 'Un intervalo muy bajo puede impactar el rendimiento',
        severity: 'warning'
      })
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  // Form operations
  const resetForm = (): void => {
    formData.value = JSON.parse(JSON.stringify(initialFormData.value))
  }
  
  // Settings operations
  const updateSingleSetting = async (key: string, value: string | number | boolean): Promise<SystemConfig | null> => {
    try {
      const result = await store.updateConfig(key, { value })
      
      if (result) {
        showSuccessToast('Configuración actualizada exitosamente')
        return result
      } else {
        showErrorToast(`Error al actualizar configuración: ${store.error}`)
        return null
      }
    } catch (error: any) {
      showErrorToast('Error de conexión al actualizar configuración')
      return null
    }
  }
  
  const saveAllSettings = async (): Promise<{ updated: number; errors: string[] } | null> => {
    const validation = validateForm()
    if (!validation.isValid) {
      showErrorToast('Por favor corrige los errores de validación antes de guardar')
      return null
    }
    
    const changes = getChangedFields()
    if (changes.length === 0) {
      showWarningToast('No hay cambios para guardar')
      return null
    }
    
    // Map form fields to config keys
    const keyMapping: Record<string, string> = {
      defaultLeadTimeMinutes: 'default_lead_time_minutes',
      operationMode: 'operation_mode',
      refreshSeconds: 'display_refresh_seconds',
      showVenues: 'show_venues',
      showCapacity: 'show_capacity',
      openTime: 'venue_open_time',
      closeTime: 'venue_close_time',
      retentionDays: 'alert_retention_days',
      maxConcurrentOverrides: 'max_concurrent_overrides'
    }
    
    const updates = changes.map(change => ({
      key: keyMapping[change.key] || change.key,
      value: change.newValue
    }))
    
    try {
      const result = await store.bulkUpdateConfig(updates)
      
      if (result) {
        if (result.errors.length === 0) {
          showSuccessToast(`${result.updated} configuraciones actualizadas exitosamente`)
          // Update initial form data after successful save
          initialFormData.value = JSON.parse(JSON.stringify(formData.value))
        } else {
          showWarningToast(`Guardado parcial: ${result.updated} exitosos, ${result.errors.length} errores`)
        }
        return result
      } else {
        showErrorToast(`Error al guardar configuraciones: ${store.error}`)
        return null
      }
    } catch (error: any) {
      showErrorToast('Error de conexión al guardar configuraciones')
      return null
    }
  }
  
  // Operation mode management
  const toggleOperationMode = async (): Promise<boolean> => {
    const currentMode = operationMode.value
    const newMode = currentMode === 'automatic' ? 'manual' : 'automatic'
    return await setOperationMode(newMode)
  }
  
  const setOperationMode = async (mode: 'automatic' | 'manual'): Promise<boolean> => {
    try {
      const result = await store.setOperationMode(mode)
      
      if (result) {
        showSuccessToast(`Modo de operación cambiado a ${mode === 'automatic' ? 'automático' : 'manual'}`)
        // Update form data
        formData.value.general.operationMode = mode
        return true
      } else {
        showErrorToast(`Error al cambiar modo de operación: ${store.error}`)
        return false
      }
    } catch (error: any) {
      showErrorToast('Error de conexión al cambiar modo de operación')
      return false
    }
  }
  
  // Reset operations
  const resetSetting = async (key: string): Promise<boolean> => {
    try {
      const result = await store.resetConfig(key)
      
      if (result) {
        showSuccessToast('Configuración restablecida exitosamente')
        return true
      } else {
        showErrorToast(`Error al restablecer configuración: ${store.error}`)
        return false
      }
    } catch (error: any) {
      showErrorToast('Error de conexión al restablecer configuración')
      return false
    }
  }
  
  const resetAllSettings = async (): Promise<number> => {
    try {
      const result = await store.resetAllConfig()
      
      if (result > 0) {
        showSuccessToast(`${result} configuraciones restablecidas exitosamente`)
        // Reinitialize form data
        formData.value = initializeFormData()
        initialFormData.value = JSON.parse(JSON.stringify(formData.value))
      }
      
      return result
    } catch (error: any) {
      showErrorToast('Error de conexión al restablecer configuraciones')
      return 0
    }
  }
  
  // Import/Export
  const exportSettings = async (): Promise<SystemConfig[]> => {
    try {
      const result = await store.exportConfig()
      
      if (result.length > 0) {
        showSuccessToast('Configuración exportada exitosamente')
      }
      
      return result
    } catch (error: any) {
      showErrorToast('Error al exportar configuración')
      return []
    }
  }
  
  const importSettings = async (configData: SystemConfig[]): Promise<{ imported: number; updated: number; errors: string[] } | null> => {
    try {
      const result = await store.importConfig(configData)
      
      if (result) {
        if (result.errors.length === 0) {
          showSuccessToast(`Importación completada: ${result.imported} importados, ${result.updated} actualizados`)
        } else {
          showWarningToast(`Importación con errores: ${result.imported} importados, ${result.updated} actualizados, ${result.errors.length} errores`)
        }
        
        // Refresh form data after import
        await refreshData()
        return result
      } else {
        showErrorToast(`Error al importar configuración: ${store.error}`)
        return null
      }
    } catch (error: any) {
      showErrorToast('Error de conexión al importar configuración')
      return null
    }
  }
  
  // Validation
  const validateSettings = async (): Promise<{ valid: boolean; errors: string[]; warnings: string[] } | null> => {
    try {
      const result = await store.validateConfig()
      
      if (result) {
        if (!result.valid) {
          showErrorToast(`Validación falló con ${result.errors.length} errores`)
        } else if (result.warnings.length > 0) {
          showWarningToast(`Validación completada con ${result.warnings.length} advertencias`)
        } else {
          showSuccessToast('Validación completada sin errores')
        }
        
        return result
      }
      
      return null
    } catch (error: any) {
      showErrorToast('Error al validar configuración')
      return null
    }
  }
  
  // Utility functions
  const refreshData = async (): Promise<void> => {
    await store.refreshAll()
  }
  
  const clearError = (): void => {
    store.clearError()
  }
  
  // Auto-validation if enabled
  if (autoValidate) {
    watch(formData, () => {
      validateForm()
    }, { deep: true })
  }
  
  return {
    // State
    configs,
    globalConfig,
    loading,
    error,
    
    // Form Management
    formData,
    hasChanges,
    isDirty,
    
    // Computed
    settingsByCategory,
    editableSettings,
    operationMode,
    leadTimeMinutes,
    
    // Form Operations
    resetForm,
    getChangedFields,
    validateForm,
    
    // Settings Operations
    updateSingleSetting,
    saveAllSettings,
    
    // Operation Mode
    toggleOperationMode,
    setOperationMode,
    
    // Bulk Operations
    resetSetting,
    resetAllSettings,
    
    // Import/Export
    exportSettings,
    importSettings,
    
    // Validation
    validateSettings,
    
    // Utility
    refreshData,
    clearError
  }
}