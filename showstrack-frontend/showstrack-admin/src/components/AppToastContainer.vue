<template>
  <div
    aria-live="assertive"
    class="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-50"
  >
    <div class="flex w-full flex-col items-center space-y-4 sm:items-end">
      <transition-group
        enter-active-class="transform ease-out duration-300 transition"
        enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
        enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5"
        >
          <div class="p-4">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <!-- Success icon -->
                <CheckCircleIcon
                  v-if="toast.type === 'success'"
                  class="h-6 w-6 text-green-400"
                />
                <!-- Error icon -->
                <XCircleIcon
                  v-else-if="toast.type === 'error'"
                  class="h-6 w-6 text-red-400"
                />
                <!-- Warning icon -->
                <ExclamationTriangleIcon
                  v-else-if="toast.type === 'warning'"
                  class="h-6 w-6 text-yellow-400"
                />
                <!-- Info icon -->
                <InformationCircleIcon
                  v-else
                  class="h-6 w-6 text-blue-400"
                />
              </div>
              <div class="ml-4 w-0 flex-1 pt-0.5">
                <p class="text-sm font-medium text-gray-900">{{ toast.title }}</p>
                <p v-if="toast.message" class="mt-1 text-sm text-gray-500">{{ toast.message }}</p>
              </div>
              <div class="ml-4 flex flex-shrink-0">
                <button
                  type="button"
                  class="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  @click="removeToast(toast.id)"
                >
                  <XMarkIcon class="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

const toasts = ref<Toast[]>([])

// Add toast function
const addToast = (toast: Omit<Toast, 'id'>) => {
  const id = `toast-${Date.now()}-${Math.random()}`
  const newToast: Toast = {
    id,
    duration: 5000, // 5 seconds default
    ...toast
  }
  
  toasts.value.push(newToast)
  
  // Auto remove after duration
  if (newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, newToast.duration)
  }
}

// Remove toast function
const removeToast = (id: string) => {
  const index = toasts.value.findIndex(toast => toast.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

// Global toast service
const showToast = {
  success: (title: string, message?: string, duration?: number) => {
    addToast({ type: 'success', title, message, duration })
  },
  error: (title: string, message?: string, duration?: number) => {
    addToast({ type: 'error', title, message, duration })
  },
  warning: (title: string, message?: string, duration?: number) => {
    addToast({ type: 'warning', title, message, duration })
  },
  info: (title: string, message?: string, duration?: number) => {
    addToast({ type: 'info', title, message, duration })
  }
}

// Make toast service globally available
onMounted(() => {
  // @ts-ignore - Global assignment for easy access
  window.showToast = showToast
})

onUnmounted(() => {
  // @ts-ignore
  delete window.showToast
})

// Expose functions for direct component usage
defineExpose({
  addToast,
  removeToast,
  showToast
})
</script>