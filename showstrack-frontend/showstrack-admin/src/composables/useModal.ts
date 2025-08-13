/**
 * useModal Composable
 * Advanced modal management with stack support, keyboard shortcuts and focus management
 * 
 * Features:
 * - Modal stack management with proper z-index handling
 * - Keyboard shortcuts (ESC, Enter, Tab navigation)
 * - Focus trap and focus management
 * - Animation orchestration with enter/leave transitions
 * - Context preservation across modal switches
 * - Backdrop behavior (configurable click-outside-to-close)
 * - Multiple modal types with different behaviors
 * - TypeScript strict mode compatibility
 */

import { ref, computed, nextTick, watch, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue'
import { useNotifications } from './useNotifications'

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
export type ModalVariant = 'default' | 'confirmation' | 'form' | 'alert' | 'custom'
export type ModalPosition = 'center' | 'top' | 'bottom' | 'left' | 'right'

export interface ModalConfig {
  id: string
  title?: string
  size?: ModalSize
  variant?: ModalVariant
  position?: ModalPosition
  closeOnEscape?: boolean
  closeOnBackdrop?: boolean
  persistent?: boolean
  stackable?: boolean
  showDefaultActions?: boolean
  animation?: string
  zIndex?: number
  context?: Record<string, any>
}

export interface ModalInstance extends ModalConfig {
  isOpen: boolean
  openedAt: Date
  focusableElements?: HTMLElement[]
  previousFocus?: HTMLElement
  onClose?: () => void
  onConfirm?: (data?: any) => void
  onCancel?: () => void
}

export interface UseModalOptions {
  defaultSize?: ModalSize
  defaultVariant?: ModalVariant
  defaultPosition?: ModalPosition
  enableKeyboardShortcuts?: boolean
  enableFocusTrap?: boolean
  stackable?: boolean
  maxStackSize?: number
  baseZIndex?: number
  animationDuration?: number
}

export interface UseModalReturn {
  // State
  modals: ComputedRef<ModalInstance[]>
  currentModal: ComputedRef<ModalInstance | null>
  topModal: ComputedRef<ModalInstance | null>
  modalCount: ComputedRef<number>
  isAnyModalOpen: ComputedRef<boolean>
  
  // Stack management
  modalStack: ComputedRef<ModalInstance[]>
  stackSize: ComputedRef<number>
  
  // Modal management
  openModal: (config: Partial<ModalConfig>, context?: Record<string, any>) => Promise<string>
  closeModal: (id?: string, result?: any) => Promise<void>
  closeTopModal: (result?: any) => Promise<void>
  closeAllModals: (result?: any) => Promise<void>
  
  // Modal queries
  isModalOpen: (id: string) => boolean
  getModal: (id: string) => ModalInstance | undefined
  getModalPosition: (id: string) => number
  
  // Focus management
  focusModal: (id: string) => void
  focusFirstElement: (id: string) => void
  focusLastElement: (id: string) => void
  
  // Context management
  setModalContext: (id: string, context: Record<string, any>) => void
  getModalContext: (id: string) => Record<string, any> | undefined
  
  // Utilities
  generateModalId: () => string
  resetModals: () => void
}

// ==========================================
// CONSTANTS
// ==========================================

const DEFAULT_CONFIG: Partial<ModalConfig> = {
  size: 'md',
  variant: 'default',
  position: 'center',
  closeOnEscape: true,
  closeOnBackdrop: true,
  persistent: false,
  stackable: true,
  showDefaultActions: true
}

const FOCUSABLE_SELECTORS = [
  'button',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]'
].join(',')

// ==========================================
// COMPOSABLE IMPLEMENTATION
// ==========================================

export function useModal(options: UseModalOptions = {}): UseModalReturn {
  const {
    defaultSize = 'md',
    defaultVariant = 'default',
    defaultPosition = 'center',
    enableKeyboardShortcuts = true,
    enableFocusTrap = true,
    stackable = true,
    maxStackSize = 5,
    baseZIndex = 1000,
    animationDuration = 300
  } = options

  const { showErrorToast, showWarningToast } = useNotifications()

  // ==========================================
  // STATE INITIALIZATION
  // ==========================================
  
  const modalsState = ref<ModalInstance[]>([])
  
  // ==========================================
  // COMPUTED PROPERTIES
  // ==========================================
  
  const modals = computed(() => modalsState.value)
  
  const modalStack = computed(() => 
    modals.value
      .filter(modal => modal.isOpen)
      .sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime())
  )
  
  const currentModal = computed(() => 
    modals.value.find(modal => modal.isOpen) || null
  )
  
  const topModal = computed(() => 
    modalStack.value[modalStack.value.length - 1] || null
  )
  
  const modalCount = computed(() => modals.value.length)
  
  const stackSize = computed(() => modalStack.value.length)
  
  const isAnyModalOpen = computed(() => stackSize.value > 0)
  
  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================
  
  const generateModalId = (): string => {
    return `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
  
  const calculateZIndex = (position: number): number => {
    return baseZIndex + (position * 10)
  }
  
  const getFocusableElements = (modalElement: HTMLElement): HTMLElement[] => {
    return Array.from(modalElement.querySelectorAll(FOCUSABLE_SELECTORS))
      .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden')) as HTMLElement[]
  }
  
  const trapFocus = (event: KeyboardEvent, modalId: string): void => {
    if (!enableFocusTrap) return
    
    const modal = getModal(modalId)
    if (!modal || !modal.focusableElements || modal.focusableElements.length === 0) return
    
    const firstElement = modal.focusableElements[0]
    const lastElement = modal.focusableElements[modal.focusableElements.length - 1]
    
    if (event.shiftKey && event.target === firstElement) {
      event.preventDefault()
      lastElement.focus()
    } else if (!event.shiftKey && event.target === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }
  
  const handleKeydown = (event: KeyboardEvent): void => {
    if (!enableKeyboardShortcuts || !isAnyModalOpen.value) return
    
    const modal = topModal.value
    if (!modal) return
    
    switch (event.key) {
      case 'Escape':
        if (modal.closeOnEscape) {
          event.preventDefault()
          closeModal(modal.id)
        }
        break
        
      case 'Enter':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          if (modal.onConfirm) {
            modal.onConfirm()
          } else {
            closeModal(modal.id, { confirmed: true })
          }
        }
        break
        
      case 'Tab':
        trapFocus(event, modal.id)
        break
    }
  }
  
  const handleBackdropClick = (event: MouseEvent, modalId: string): void => {
    const modal = getModal(modalId)
    if (!modal || !modal.closeOnBackdrop) return
    
    // Only close if clicked on backdrop (not on modal content)
    const target = event.target as HTMLElement
    if (target.classList.contains('modal-backdrop') || target.classList.contains('modal-overlay')) {
      closeModal(modalId)
    }
  }
  
  // ==========================================
  // MODAL MANAGEMENT METHODS
  // ==========================================
  
  const openModal = async (
    config: Partial<ModalConfig>, 
    context: Record<string, any> = {}
  ): Promise<string> => {
    // Check stack size limit
    if (stackable && stackSize.value >= maxStackSize) {
      showWarningToast(`Máximo ${maxStackSize} modales abiertos simultáneamente`)
      return ''
    }
    
    const modalId = config.id || generateModalId()
    
    // Check if modal already exists
    const existingModal = getModal(modalId)
    if (existingModal) {
      if (existingModal.isOpen) {
        showWarningToast('El modal ya está abierto')
        return modalId
      } else {
        // Reopen existing modal
        existingModal.isOpen = true
        existingModal.openedAt = new Date()
        existingModal.context = { ...existingModal.context, ...context }
        return modalId
      }
    }
    
    // Create new modal instance
    const modalConfig: ModalInstance = {
      ...DEFAULT_CONFIG,
      ...config,
      id: modalId,
      size: config.size || defaultSize,
      variant: config.variant || defaultVariant,
      position: config.position || defaultPosition,
      isOpen: true,
      openedAt: new Date(),
      context,
      zIndex: calculateZIndex(stackSize.value)
    }
    
    // Store current focus to restore later
    modalConfig.previousFocus = document.activeElement as HTMLElement
    
    modalsState.value.push(modalConfig)
    
    // Wait for DOM update
    await nextTick()
    
    // Setup focus management
    if (enableFocusTrap) {
      const modalElement = document.querySelector(`[data-modal-id="${modalId}"]`) as HTMLElement
      if (modalElement) {
        modalConfig.focusableElements = getFocusableElements(modalElement)
        // Focus first focusable element
        if (modalConfig.focusableElements.length > 0) {
          modalConfig.focusableElements[0].focus()
        }
      }
    }
    
    return modalId
  }
  
  const closeModal = async (id?: string, result?: any): Promise<void> => {
    const modalId = id || topModal.value?.id
    if (!modalId) return
    
    const modal = getModal(modalId)
    if (!modal || !modal.isOpen) return
    
    // Call onClose callback if provided
    if (modal.onClose) {
      modal.onClose()
    }
    
    modal.isOpen = false
    
    // Restore previous focus
    if (modal.previousFocus && enableFocusTrap) {
      modal.previousFocus.focus()
    }
    
    // Remove from state after animation
    setTimeout(() => {
      modalsState.value = modalsState.value.filter(m => m.id !== modalId)
    }, animationDuration)
    
    // If this was a stacked modal, focus the previous modal
    if (stackable && stackSize.value > 0) {
      const newTopModal = topModal.value
      if (newTopModal && newTopModal.focusableElements && newTopModal.focusableElements.length > 0) {
        newTopModal.focusableElements[0].focus()
      }
    }
  }
  
  const closeTopModal = async (result?: any): Promise<void> => {
    const modal = topModal.value
    if (modal) {
      await closeModal(modal.id, result)
    }
  }
  
  const closeAllModals = async (result?: any): Promise<void> => {
    const openModals = modalStack.value.slice()
    for (const modal of openModals) {
      await closeModal(modal.id, result)
    }
  }
  
  // ==========================================
  // MODAL QUERY METHODS
  // ==========================================
  
  const isModalOpen = (id: string): boolean => {
    const modal = getModal(id)
    return modal ? modal.isOpen : false
  }
  
  const getModal = (id: string): ModalInstance | undefined => {
    return modals.value.find(modal => modal.id === id)
  }
  
  const getModalPosition = (id: string): number => {
    return modalStack.value.findIndex(modal => modal.id === id)
  }
  
  // ==========================================
  // FOCUS MANAGEMENT METHODS
  // ==========================================
  
  const focusModal = (id: string): void => {
    if (!enableFocusTrap) return
    
    const modal = getModal(id)
    if (!modal || !modal.focusableElements || modal.focusableElements.length === 0) return
    
    modal.focusableElements[0].focus()
  }
  
  const focusFirstElement = (id: string): void => {
    const modal = getModal(id)
    if (modal && modal.focusableElements && modal.focusableElements.length > 0) {
      modal.focusableElements[0].focus()
    }
  }
  
  const focusLastElement = (id: string): void => {
    const modal = getModal(id)
    if (modal && modal.focusableElements && modal.focusableElements.length > 0) {
      const lastIndex = modal.focusableElements.length - 1
      modal.focusableElements[lastIndex].focus()
    }
  }
  
  // ==========================================
  // CONTEXT MANAGEMENT METHODS
  // ==========================================
  
  const setModalContext = (id: string, context: Record<string, any>): void => {
    const modal = getModal(id)
    if (modal) {
      modal.context = { ...modal.context, ...context }
    }
  }
  
  const getModalContext = (id: string): Record<string, any> | undefined => {
    const modal = getModal(id)
    return modal ? modal.context : undefined
  }
  
  // ==========================================
  // UTILITY METHODS
  // ==========================================
  
  const resetModals = (): void => {
    // Close all modals and clear state
    modalsState.value.forEach(modal => {
      if (modal.previousFocus && enableFocusTrap) {
        modal.previousFocus.focus()
      }
    })
    modalsState.value = []
  }
  
  // ==========================================
  // LIFECYCLE & EVENT HANDLERS
  // ==========================================
  
  onMounted(() => {
    if (enableKeyboardShortcuts) {
      document.addEventListener('keydown', handleKeydown)
    }
    
    // Handle backdrop clicks globally
    document.addEventListener('click', (event) => {
      if (isAnyModalOpen.value) {
        const target = event.target as HTMLElement
        const modalId = target.getAttribute('data-modal-id') || 
                       target.closest('[data-modal-id]')?.getAttribute('data-modal-id')
        if (modalId) {
          handleBackdropClick(event, modalId)
        }
      }
    })
  })
  
  onUnmounted(() => {
    if (enableKeyboardShortcuts) {
      document.removeEventListener('keydown', handleKeydown)
    }
    
    // Clean up any remaining modals
    resetModals()
  })
  
  // Watch for body scroll management
  watch(isAnyModalOpen, (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  })
  
  // ==========================================
  // RETURN INTERFACE
  // ==========================================
  
  return {
    // State
    modals,
    currentModal,
    topModal,
    modalCount,
    isAnyModalOpen,
    
    // Stack management
    modalStack,
    stackSize,
    
    // Modal management
    openModal,
    closeModal,
    closeTopModal,
    closeAllModals,
    
    // Modal queries
    isModalOpen,
    getModal,
    getModalPosition,
    
    // Focus management
    focusModal,
    focusFirstElement,
    focusLastElement,
    
    // Context management
    setModalContext,
    getModalContext,
    
    // Utilities
    generateModalId,
    resetModals
  }
}

// ==========================================
// CONVENIENCE FUNCTIONS
// ==========================================

/**
 * Show a confirmation modal
 */
export const showConfirmationModal = async (
  title: string,
  message: string,
  options: Partial<ModalConfig> = {}
): Promise<boolean> => {
  const { openModal, closeModal } = useModal()
  
  return new Promise((resolve) => {
    const modalId = openModal({
      ...options,
      title,
      variant: 'confirmation',
      context: { message },
      onConfirm: () => {
        closeModal(modalId, { confirmed: true })
        resolve(true)
      },
      onCancel: () => {
        closeModal(modalId, { confirmed: false })
        resolve(false)
      }
    })
  })
}

/**
 * Show an alert modal
 */
export const showAlertModal = async (
  title: string,
  message: string,
  variant: 'success' | 'error' | 'warning' | 'info' = 'info',
  options: Partial<ModalConfig> = {}
): Promise<void> => {
  const { openModal, closeModal } = useModal()
  
  return new Promise((resolve) => {
    const modalId = openModal({
      ...options,
      title,
      variant: 'alert',
      closeOnEscape: true,
      context: { message, variant },
      onClose: () => resolve()
    })
  })
}

/**
 * Show a form modal
 */
export const showFormModal = async <T = any>(
  title: string,
  formConfig: Record<string, any>,
  options: Partial<ModalConfig> = {}
): Promise<T | null> => {
  const { openModal, closeModal } = useModal()
  
  return new Promise((resolve) => {
    const modalId = openModal({
      ...options,
      title,
      variant: 'form',
      context: { formConfig },
      onConfirm: (data: T) => {
        closeModal(modalId, data)
        resolve(data)
      },
      onCancel: () => {
        closeModal(modalId, null)
        resolve(null)
      }
    })
  })
}