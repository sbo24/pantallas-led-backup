// Config Store - ShowsTrack Frontend
// Pinia Setup Store for system configuration management

import { defineStore } from 'pinia'
import { ref, computed, type ComputedRef } from 'vue'
import ConfigApiService from '@/services/api/config'
import type { SystemConfig, UpdateConfigData, GlobalConfiguration } from '@/types/api'

export const useConfigStore = defineStore('config', () => {
  // State
  const configs = ref<SystemConfig[]>([])
  const globalConfig = ref<GlobalConfiguration | null>(null)
  const currentConfig = ref<SystemConfig | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // Computed
  const configsByCategory: ComputedRef<Record<string, SystemConfig[]>> = computed(() => {
    return configs.value.reduce((acc, config) => {
      const category = config.category
      if (!acc[category]) acc[category] = []
      acc[category].push(config)
      return acc
    }, {} as Record<string, SystemConfig[]>)
  })
  
  const editableConfigs: ComputedRef<SystemConfig[]> = computed(() => 
    configs.value.filter(config => config.isEditable)
  )
  
  const categories: ComputedRef<string[]> = computed(() => 
    [...new Set(configs.value.map(config => config.category))].sort()
  )
  
  const operationMode: ComputedRef<'automatic' | 'manual'> = computed(() => 
    globalConfig.value?.operationMode || 'automatic'
  )
  
  const leadTimeMinutes: ComputedRef<number> = computed(() => 
    globalConfig.value?.defaultLeadTimeMinutes || 30
  )
  
  const displayRefreshSeconds: ComputedRef<number> = computed(() => 
    globalConfig.value?.displayRefreshSeconds || 30
  )

  // Actions
  const fetchAllConfigs = async (): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await ConfigApiService.getAllConfig()
      
      if (response.data) {
        configs.value = response.data
        return true
      }
      
      return false
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al cargar configuración'
      console.error('[Config Store] Fetch configs error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchConfigsByCategory = async (category: string): Promise<SystemConfig[]> => {
    try {
      const response = await ConfigApiService.getConfigByCategory(category)
      
      if (response.data) {
        // Update configs for this category
        const otherConfigs = configs.value.filter(c => c.category !== category)
        configs.value = [...otherConfigs, ...response.data]
        
        return response.data
      }
      
      return []
    } catch (apiError: any) {
      console.error('[Config Store] Fetch configs by category error:', apiError)
      return []
    }
  }
  
  const fetchConfig = async (configKey: string): Promise<SystemConfig | null> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await ConfigApiService.getConfig(configKey)
      
      if (response.data) {
        currentConfig.value = response.data
        
        // Update config in list if exists
        const index = configs.value.findIndex(c => c.key === configKey)
        if (index !== -1) {
          configs.value[index] = response.data
        }
        
        return response.data
      }
      
      return null
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al cargar configuración'
      console.error('[Config Store] Fetch config error:', apiError)
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  const updateConfig = async (configKey: string, updateData: UpdateConfigData): Promise<SystemConfig | null> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await ConfigApiService.updateConfig(configKey, updateData)
      
      if (response.data) {
        // Update config in list
        const index = configs.value.findIndex(c => c.key === configKey)
        if (index !== -1) {
          configs.value[index] = response.data
        }
        
        // Update current config if it's the same
        if (currentConfig.value?.key === configKey) {
          currentConfig.value = response.data
        }
        
        // Refresh global config if it's a global setting
        if (['default_lead_time_minutes', 'operation_mode', 'display_refresh_seconds'].includes(configKey)) {
          await fetchGlobalConfig()
        }
        
        return response.data
      }
      
      return null
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al actualizar configuración'
      console.error('[Config Store] Update config error:', apiError)
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchGlobalConfig = async (): Promise<boolean> => {
    try {
      const response = await ConfigApiService.getGlobalConfig()
      
      if (response.data) {
        globalConfig.value = response.data
        return true
      }
      
      return false
    } catch (apiError: any) {
      console.error('[Config Store] Fetch global config error:', apiError)
      return false
    }
  }
  
  const setOperationMode = async (mode: 'automatic' | 'manual'): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await ConfigApiService.setOperationMode(mode)
      
      if (response.data) {
        // Update global config
        if (globalConfig.value) {
          globalConfig.value.operationMode = mode
        }
        
        // Update in configs list
        const index = configs.value.findIndex(c => c.key === 'operation_mode')
        if (index !== -1) {
          configs.value[index] = response.data
        }
        
        return true
      }
      
      return false
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al cambiar modo de operación'
      console.error('[Config Store] Set operation mode error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const updateLeadTime = async (minutes: number): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await ConfigApiService.updateLeadTime(minutes)
      
      if (response.data) {
        // Update global config
        if (globalConfig.value) {
          globalConfig.value.defaultLeadTimeMinutes = minutes
        }
        
        // Update in configs list
        const index = configs.value.findIndex(c => c.key === 'default_lead_time_minutes')
        if (index !== -1) {
          configs.value[index] = response.data
        }
        
        return true
      }
      
      return false
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al actualizar tiempo de anticipación'
      console.error('[Config Store] Update lead time error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const updateDisplaySettings = async (settings: {
    refreshSeconds?: number
    showVenues?: boolean
    showCapacity?: boolean
  }): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await ConfigApiService.updateDisplaySettings(settings)
      
      if (response.data) {
        // Update global config
        if (globalConfig.value && settings.refreshSeconds) {
          globalConfig.value.displayRefreshSeconds = settings.refreshSeconds
        }
        
        // Refresh configs to get updated values
        await fetchAllConfigs()
        
        return true
      }
      
      return false
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al actualizar configuración de pantalla'
      console.error('[Config Store] Update display settings error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const updateVenueHours = async (openTime: string, closeTime: string): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await ConfigApiService.updateVenueHours(openTime, closeTime)
      
      if (response.data) {
        // Update global config
        if (globalConfig.value) {
          globalConfig.value.venueOpenTime = openTime
          globalConfig.value.venueCloseTime = closeTime
        }
        
        // Refresh configs to get updated values
        await fetchAllConfigs()
        
        return true
      }
      
      return false
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al actualizar horarios del venue'
      console.error('[Config Store] Update venue hours error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const bulkUpdateConfig = async (updates: Array<{
    key: string
    value: string | number | boolean
  }>): Promise<{ updated: number; errors: string[] } | null> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await ConfigApiService.bulkUpdateConfig(updates)
      
      if (response.data) {
        // Refresh all configs after bulk update
        await fetchAllConfigs()
        await fetchGlobalConfig()
        
        return response.data
      }
      
      return null
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al actualizar configuraciones'
      console.error('[Config Store] Bulk update config error:', apiError)
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  const resetConfig = async (configKey: string): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await ConfigApiService.resetConfig(configKey)
      
      if (response.data) {
        // Update config in list
        const index = configs.value.findIndex(c => c.key === configKey)
        if (index !== -1) {
          configs.value[index] = response.data
        }
        
        // Refresh global config if needed
        if (['default_lead_time_minutes', 'operation_mode', 'display_refresh_seconds'].includes(configKey)) {
          await fetchGlobalConfig()
        }
        
        return true
      }
      
      return false
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al resetear configuración'
      console.error('[Config Store] Reset config error:', apiError)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const resetAllConfig = async (): Promise<number> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await ConfigApiService.resetAllConfig()
      
      if (response.data) {
        // Refresh all configs after reset
        await fetchAllConfigs()
        await fetchGlobalConfig()
        
        return response.data.reset
      }
      
      return 0
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al resetear todas las configuraciones'
      console.error('[Config Store] Reset all config error:', apiError)
      return 0
    } finally {
      isLoading.value = false
    }
  }
  
  const validateConfig = async (): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  } | null> => {
    try {
      const response = await ConfigApiService.validateConfig()
      return response.data || null
    } catch (apiError: any) {
      console.error('[Config Store] Validate config error:', apiError)
      return null
    }
  }
  
  const exportConfig = async (): Promise<SystemConfig[]> => {
    try {
      const response = await ConfigApiService.exportConfig()
      return response.data || []
    } catch (apiError: any) {
      console.error('[Config Store] Export config error:', apiError)
      return []
    }
  }
  
  const importConfig = async (configData: SystemConfig[]): Promise<{
    imported: number
    updated: number
    errors: string[]
  } | null> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await ConfigApiService.importConfig(configData)
      
      if (response.data) {
        // Refresh all configs after import
        await fetchAllConfigs()
        await fetchGlobalConfig()
        
        return response.data
      }
      
      return null
    } catch (apiError: any) {
      error.value = apiError.message || 'Error al importar configuración'
      console.error('[Config Store] Import config error:', apiError)
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  // Utility actions
  const clearError = (): void => {
    error.value = null
  }
  
  const clearCurrentConfig = (): void => {
    currentConfig.value = null
  }
  
  // Find config by key
  const findConfigByKey = (key: string): SystemConfig | null => {
    return configs.value.find(config => config.key === key) || null
  }
  
  // Get config value helper
  const getConfigValue = (key: string): string | number | boolean | null => {
    const config = findConfigByKey(key)
    return config ? config.value : null
  }
  
  // Refresh all data
  const refreshAll = async (): Promise<void> => {
    await Promise.all([
      fetchAllConfigs(),
      fetchGlobalConfig()
    ])
  }
  
  // Initialize store
  const initializeConfig = async (): Promise<void> => {
    await refreshAll()
  }

  return {
    // State
    configs,
    globalConfig,
    currentConfig,
    isLoading,
    error,
    
    // Computed
    configsByCategory,
    editableConfigs,
    categories,
    operationMode,
    leadTimeMinutes,
    displayRefreshSeconds,
    
    // Actions
    fetchAllConfigs,
    fetchConfigsByCategory,
    fetchConfig,
    updateConfig,
    fetchGlobalConfig,
    setOperationMode,
    updateLeadTime,
    updateDisplaySettings,
    updateVenueHours,
    bulkUpdateConfig,
    resetConfig,
    resetAllConfig,
    validateConfig,
    exportConfig,
    importConfig,
    
    // Utility actions
    clearError,
    clearCurrentConfig,
    findConfigByKey,
    getConfigValue,
    refreshAll,
    initializeConfig
  }
})