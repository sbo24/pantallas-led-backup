// Stores Index - ShowsTrack Frontend
// Centralized exports for all Pinia stores

// Main stores
export { useAuthStore } from './auth'
export { useShowsStore } from './shows'
export { useEventsStore } from './events'
export { useAlertsStore } from './alerts'
export { useConfigStore } from './config'
export { useDashboardStore } from './dashboard'

// Legacy store (can be removed when no longer needed)
export { useCounterStore } from './counter'

// Store initialization helper
export const initializeStores = async () => {
  const { useAuthStore } = await import('./auth')
  const { useConfigStore } = await import('./config')
  const { useDashboardStore } = await import('./dashboard')
  
  const authStore = useAuthStore()
  const configStore = useConfigStore()
  const dashboardStore = useDashboardStore()
  
  try {
    // Initialize auth first
    await authStore.initializeAuth()
    
    // Only initialize other stores if authenticated
    if (authStore.isAuthenticated) {
      await Promise.all([
        configStore.initializeConfig(),
        dashboardStore.initializeDashboard()
      ])
    }
  } catch (error) {
    console.error('[Stores] Initialization error:', error)
  }
}

// Store cleanup helper
export const cleanupStores = async () => {
  const { useDashboardStore } = await import('./dashboard')
  const dashboardStore = useDashboardStore()
  
  // Cleanup any timers or subscriptions
  dashboardStore.cleanup()
}

// Type exports for better TypeScript support
export type { User, AuthTokens } from '@/types/api'