/**
 * useNotifications Composable
 * Provides toast notifications and alert management
 * 
 * Features:
 * - Toast notifications with different types
 * - Queue management for multiple notifications
 * - Auto-dismiss functionality
 * - Integration with UI toast system
 */

import { ref, type Ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
  dismissible?: boolean
}

export interface UseNotificationsReturn {
  // State
  toasts: Ref<Toast[]>
  
  // Actions
  showToast: (message: string, type?: ToastType, duration?: number) => string
  showSuccessToast: (message: string, duration?: number) => string
  showErrorToast: (message: string, duration?: number) => string
  showWarningToast: (message: string, duration?: number) => string
  showInfoToast: (message: string, duration?: number) => string
  dismissToast: (id: string) => void
  clearAllToasts: () => void
}

// Global toast state (shared across all composable instances)
const globalToasts = ref<Toast[]>([])

export function useNotifications(): UseNotificationsReturn {
  const generateId = (): string => {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  const showToast = (
    message: string, 
    type: ToastType = 'info', 
    duration: number = 5000
  ): string => {
    const id = generateId()
    const toast: Toast = {
      id,
      message,
      type,
      duration,
      dismissible: true
    }

    globalToasts.value.push(toast)

    // Auto-dismiss if duration is set
    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id)
      }, duration)
    }

    return id
  }

  const showSuccessToast = (message: string, duration: number = 4000): string => {
    return showToast(message, 'success', duration)
  }

  const showErrorToast = (message: string, duration: number = 6000): string => {
    return showToast(message, 'error', duration)
  }

  const showWarningToast = (message: string, duration: number = 5000): string => {
    return showToast(message, 'warning', duration)
  }

  const showInfoToast = (message: string, duration: number = 4000): string => {
    return showToast(message, 'info', duration)
  }

  const dismissToast = (id: string): void => {
    const index = globalToasts.value.findIndex(toast => toast.id === id)
    if (index !== -1) {
      globalToasts.value.splice(index, 1)
    }
  }

  const clearAllToasts = (): void => {
    globalToasts.value.splice(0)
  }

  return {
    // State
    toasts: globalToasts,
    
    // Actions
    showToast,
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    showInfoToast,
    dismissToast,
    clearAllToasts
  }
}