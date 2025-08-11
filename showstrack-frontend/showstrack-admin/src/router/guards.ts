// Navigation Guards - ShowsTrack Frontend
// Vue Router guards for authentication and authorization

import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Auth guard - Requires authentication
export const requiresAuth = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): Promise<void> => {
  const authStore = useAuthStore()
  
  // Check if already authenticated
  if (authStore.isAuthenticated) {
    next()
    return
  }
  
  // Try to restore authentication from stored tokens
  const isAuthenticated = await authStore.checkAuthStatus()
  
  if (isAuthenticated) {
    next()
  } else {
    // Redirect to login with return URL
    next({
      name: 'login',
      query: { redirect: to.fullPath }
    })
  }
}

// Guest guard - Redirects authenticated users away from login/register pages
export const requiresGuest = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): void => {
  const authStore = useAuthStore()
  
  if (authStore.isAuthenticated) {
    // Redirect to dashboard or intended destination
    const redirectTo = to.query.redirect as string || '/dashboard'
    next(redirectTo)
  } else {
    next()
  }
}

// Admin guard - Requires admin role
export const requiresAdmin = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): void => {
  const authStore = useAuthStore()
  
  if (!authStore.isAuthenticated) {
    next({
      name: 'login',
      query: { redirect: to.fullPath }
    })
    return
  }
  
  if (!authStore.isAdmin) {
    // Redirect to unauthorized page or dashboard
    next({ name: 'unauthorized' })
    return
  }
  
  next()
}

// Role guard factory - Requires specific role
export const requiresRole = (role: string) => {
  return (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext
  ): void => {
    const authStore = useAuthStore()
    
    if (!authStore.isAuthenticated) {
      next({
        name: 'login',
        query: { redirect: to.fullPath }
      })
      return
    }
    
    if (!authStore.hasRole(role)) {
      next({ name: 'unauthorized' })
      return
    }
    
    next()
  }
}

// Navigation logger (development only)
export const navigationLogger = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): void => {
  if (import.meta.env.DEV) {
    console.log(`[Router] Navigation: ${from.path} → ${to.path}`)
  }
  next()
}