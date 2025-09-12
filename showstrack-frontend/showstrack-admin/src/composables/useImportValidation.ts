import { ref, computed } from 'vue'
import { useNotifications } from './useNotifications'
import { ImportApiService } from '@/services/api/import'
import type { 
  ImportData, 
  ImportPreview, 
  ImportResponse,
  ImportConflict
} from '@/types/api'

export function useImportValidation() {
  const { showSuccessToast, showErrorToast, showWarningToast } = useNotifications()

  // Estado reactivo
  const isValidating = ref(false)
  const isImporting = ref(false)
  const validationResults = ref<ImportPreview | null>(null)
  const importResults = ref<ImportResponse | null>(null)
  const validationError = ref<string | null>(null)

  // Computed properties
  const hasValidationResults = computed(() => validationResults.value !== null)
  const validationStatus = computed(() => {
    if (!validationResults.value) return 'unknown'
    const result = validationResults.value.validation_result
    if (!result) return 'errors'
    
    // Si hay errores, mostrar errors
    if (result.errors && result.errors.length > 0) return 'errors'
    
    // Si is_valid es false, mostrar errors
    if (result.is_valid === false) return 'errors'
    
    // Si hay warnings, mostrar warnings
    if (result.warnings && result.warnings.length > 0) return 'warnings'
    
    // Si todo está bien, mostrar valid
    return 'valid'
  })
  const hasErrors = computed(() => validationStatus.value === 'errors')
  const hasWarnings = computed(() => validationStatus.value === 'warnings')
  const isValid = computed(() => validationStatus.value === 'valid')
  const canImport = computed(() => 
    hasValidationResults.value && 
    !hasErrors.value && 
    !isImporting.value &&
    !isValidating.value
  )

  // Validation statistics
  const validationStats = computed(() => {
    if (!validationResults.value) return null
    
    const result = validationResults.value.validation_result
    if (!result) return null
    
    return {
      totalEvents: result.total_events || 0,
      newEvents: result.new_events || 0,
      updatedEvents: result.updated_events || 0,
      conflictsCount: (result.conflicts && result.conflicts.length) || 0,
      errorsCount: (result.errors && result.errors.length) || 0,
      warningsCount: (result.warnings && result.warnings.length) || 0
    }
  })

  // Conflicts by type
  const conflictsByType = computed(() => {
    if (!validationResults.value?.validation_result?.conflicts) return {}
    
    return validationResults.value.validation_result.conflicts.reduce((acc, conflict) => {
      acc[conflict.type] = (acc[conflict.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  })

  // Validate import data
  const validateImport = async (data: ImportData): Promise<boolean> => {
    if (isValidating.value) return false
    
    isValidating.value = true
    validationError.value = null
    validationResults.value = null
    
    try {
      const response = await ImportApiService.validateImport(data)
      validationResults.value = response.data
      
      // Show appropriate notification
      const result = validationResults.value.validation_result
      if (result.is_valid && result.warnings.length === 0) {
        showSuccessToast(`Validation successful: ${result.total_events} events ready to import`)
      } else if (result.is_valid && result.warnings.length > 0) {
        showWarningToast(`Validation completed with ${result.warnings.length} warnings`)
      } else {
        showErrorToast(`Validation failed with ${result.errors.length} errors`)
      }
      
      return result.is_valid
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation failed'
      validationError.value = message
      showErrorToast(message)
      return false
    } finally {
      isValidating.value = false
    }
  }

  // Execute import
  const executeImport = async (data: ImportData): Promise<boolean> => {
    if (!canImport.value) return false
    
    isImporting.value = true
    importResults.value = null
    
    try {
      const response = await ImportApiService.importData(data)
      importResults.value = response.data
      
      const results = importResults.value
      const stats = results.validation_result
      
      if (results.status === 'success') {
        showSuccessToast(
          `Importación exitosa: ${stats.new_events} nuevos, ${stats.updated_events} actualizados`
        )
      } else if (results.status === 'partial') {
        showWarningToast(
          `Importación parcial: ${stats.new_events} nuevos, ${stats.updated_events} actualizados, ${stats.errors.length} errores`
        )
      } else {
        showErrorToast(`Importación fallida: ${results.message}`)
      }
      
      return results.status !== 'failed'
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed'
      showErrorToast(message)
      return false
    } finally {
      isImporting.value = false
    }
  }

  // Get conflict details
  const getConflictDetails = (conflict: ImportConflict) => {
    switch (conflict.type) {
      case 'duplicate':
        return {
          title: 'Duplicate Event',
          description: 'This event already exists in the system',
          severity: 'warning' as const,
          icon: '⚠️'
        }
      case 'override_conflict':
        return {
          title: 'Manual Override Exists',
          description: 'This event has manual overrides that may be affected',
          severity: 'error' as const,
          icon: '🔒'
        }
      case 'invalid_data':
        return {
          title: 'Invalid Data',
          description: 'The event data format is invalid or incomplete',
          severity: 'error' as const,
          icon: '❌'
        }
      default:
        return {
          title: 'Unknown Conflict',
          description: 'An unknown conflict was detected',
          severity: 'warning' as const,
          icon: '❓'
        }
    }
  }

  // Format validation summary
  const getValidationSummary = () => {
    if (!validationResults.value) return null
    
    const result = validationResults.value.validation_result
    const summary = []
    
    if (result.total_events > 0) {
      summary.push(`${result.total_events} events total`)
    }
    
    if (result.new_events > 0) {
      summary.push(`${result.new_events} new`)
    }
    
    if (result.updated_events > 0) {
      summary.push(`${result.updated_events} updates`)
    }
    
    if (result.conflicts.length > 0) {
      summary.push(`${result.conflicts.length} conflicts`)
    }
    
    if (result.warnings.length > 0) {
      summary.push(`${result.warnings.length} warnings`)
    }
    
    if (result.errors.length > 0) {
      summary.push(`${result.errors.length} errors`)
    }
    
    return summary.join(', ')
  }

  // Clear validation results
  const clearValidation = () => {
    validationResults.value = null
    importResults.value = null
    validationError.value = null
  }

  // Reset state
  const reset = () => {
    isValidating.value = false
    isImporting.value = false
    validationResults.value = null
    importResults.value = null
    validationError.value = null
  }

  return {
    // State
    isValidating: computed(() => isValidating.value),
    isImporting: computed(() => isImporting.value),
    validationResults: computed(() => validationResults.value),
    importResults: computed(() => importResults.value),
    validationError: computed(() => validationError.value),
    
    // Computed properties
    hasValidationResults,
    validationStatus,
    hasErrors,
    hasWarnings,
    isValid,
    canImport,
    validationStats,
    conflictsByType,
    
    // Methods
    validateImport,
    executeImport,
    getConflictDetails,
    getValidationSummary,
    clearValidation,
    reset
  }
}