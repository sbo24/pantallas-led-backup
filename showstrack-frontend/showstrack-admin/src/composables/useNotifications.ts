/**
 * useNotifications Composable
 * Toast system with queue management
 */

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

export type ToastType = Toast['type']

export interface UseNotificationsReturn {
  showToast: (message: string, type?: ToastType, duration?: number) => void
  showSuccessToast: (message: string, duration?: number) => void
  showErrorToast: (message: string, duration?: number) => void
  showWarningToast: (message: string, duration?: number) => void
  dismissToast: (id: string) => void
}

export function useNotifications(): UseNotificationsReturn {
  const showToast = (message: string, type: ToastType = 'info', duration = 5000): void => {
    // Simple console implementation for testing
    console.log(`[${type.toUpperCase()}]: ${message}`)
  }

  const showSuccessToast = (message: string, duration = 3000): void => {
    showToast(message, 'success', duration)
  }

  const showErrorToast = (message: string, duration = 5000): void => {
    showToast(message, 'error', duration)
  }

  const showWarningToast = (message: string, duration = 4000): void => {
    showToast(message, 'warning', duration)
  }

  const dismissToast = (id: string): void => {
    console.log(`Dismissing toast: ${id}`)
  }

  return {
    showToast,
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    dismissToast
  }
}