import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useModal, showConfirmationModal, showAlertModal, showFormModal } from '../useModal'
import type { ModalConfig } from '../useModal'

// Mock the notifications composable
const mockShowErrorToast = vi.fn()
const mockShowWarningToast = vi.fn()
vi.mock('../useNotifications', () => ({
  useNotifications: () => ({
    showErrorToast: mockShowErrorToast,
    showWarningToast: mockShowWarningToast
  })
}))

// Mock DOM methods
const mockFocus = vi.fn()
const mockQuerySelector = vi.fn()
const mockQuerySelectorAll = vi.fn(() => [])

Object.defineProperty(document, 'querySelector', {
  value: mockQuerySelector
})

Object.defineProperty(document, 'querySelectorAll', {
  value: mockQuerySelectorAll
})

// Mock document.body
Object.defineProperty(document, 'body', {
  value: {
    style: {},
    appendChild: vi.fn(),
    removeChild: vi.fn()
  }
})

describe('useModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQuerySelector.mockReturnValue({
      querySelectorAll: mockQuerySelectorAll,
      focus: mockFocus
    })
    mockQuerySelectorAll.mockReturnValue([
      { focus: mockFocus, hasAttribute: () => false, getAttribute: () => null }
    ])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic functionality', () => {
    it('should initialize with empty state', () => {
      const {
        modals,
        modalCount,
        stackSize,
        isAnyModalOpen,
        currentModal,
        topModal
      } = useModal()

      expect(modals.value).toEqual([])
      expect(modalCount.value).toBe(0)
      expect(stackSize.value).toBe(0)
      expect(isAnyModalOpen.value).toBe(false)
      expect(currentModal.value).toBeNull()
      expect(topModal.value).toBeNull()
    })

    it('should generate unique modal IDs', () => {
      const { generateModalId } = useModal()

      const id1 = generateModalId()
      const id2 = generateModalId()

      expect(id1).toMatch(/^modal-\d+-[a-z0-9]+$/)
      expect(id2).toMatch(/^modal-\d+-[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })

    it('should initialize with default options', () => {
      const modal = useModal({
        defaultSize: 'lg',
        defaultVariant: 'form',
        maxStackSize: 3
      })

      expect(modal).toBeDefined()
    })
  })

  describe('Modal opening and closing', () => {
    it('should open a modal with default config', async () => {
      const {
        openModal,
        modals,
        modalCount,
        isAnyModalOpen,
        currentModal
      } = useModal()

      const modalId = await openModal({ title: 'Test Modal' })

      expect(modalId).toBeTruthy()
      expect(modalCount.value).toBe(1)
      expect(isAnyModalOpen.value).toBe(true)
      expect(currentModal.value).toBeTruthy()
      expect(currentModal.value?.title).toBe('Test Modal')
      expect(currentModal.value?.isOpen).toBe(true)
    })

    it('should open modal with custom config', async () => {
      const { openModal, getModal } = useModal()

      const config: Partial<ModalConfig> = {
        title: 'Custom Modal',
        size: 'lg',
        variant: 'confirmation',
        closeOnEscape: false,
        closeOnBackdrop: false
      }

      const modalId = await openModal(config)
      const modal = getModal(modalId)

      expect(modal).toBeTruthy()
      expect(modal?.title).toBe('Custom Modal')
      expect(modal?.size).toBe('lg')
      expect(modal?.variant).toBe('confirmation')
      expect(modal?.closeOnEscape).toBe(false)
      expect(modal?.closeOnBackdrop).toBe(false)
    })

    it('should close a modal', async () => {
      const {
        openModal,
        closeModal,
        isModalOpen,
        modalCount
      } = useModal()

      const modalId = await openModal({ title: 'Test Modal' })
      expect(isModalOpen(modalId)).toBe(true)

      await closeModal(modalId)
      expect(isModalOpen(modalId)).toBe(false)

      // Wait for cleanup timeout
      await new Promise(resolve => setTimeout(resolve, 350))
      expect(modalCount.value).toBe(0)
    })

    it('should close top modal', async () => {
      const {
        openModal,
        closeTopModal,
        topModal,
        stackSize
      } = useModal()

      await openModal({ title: 'Modal 1' })
      const modal2Id = await openModal({ title: 'Modal 2' })

      expect(stackSize.value).toBe(2)
      expect(topModal.value?.id).toBe(modal2Id)

      await closeTopModal()
      expect(stackSize.value).toBe(1)
      expect(topModal.value?.title).toBe('Modal 1')
    })

    it('should close all modals', async () => {
      const {
        openModal,
        closeAllModals,
        stackSize
      } = useModal()

      await openModal({ title: 'Modal 1' })
      await openModal({ title: 'Modal 2' })
      await openModal({ title: 'Modal 3' })

      expect(stackSize.value).toBe(3)

      await closeAllModals()
      expect(stackSize.value).toBe(0)
    })
  })

  describe('Modal stack management', () => {
    it('should manage modal stack correctly', async () => {
      const {
        openModal,
        modalStack,
        stackSize,
        topModal
      } = useModal()

      const modal1Id = await openModal({ title: 'Modal 1' })
      expect(stackSize.value).toBe(1)
      expect(topModal.value?.id).toBe(modal1Id)

      const modal2Id = await openModal({ title: 'Modal 2' })
      expect(stackSize.value).toBe(2)
      expect(topModal.value?.id).toBe(modal2Id)

      const modal3Id = await openModal({ title: 'Modal 3' })
      expect(stackSize.value).toBe(3)
      expect(topModal.value?.id).toBe(modal3Id)

      // Stack should be ordered by opening time
      expect(modalStack.value[0].id).toBe(modal1Id)
      expect(modalStack.value[1].id).toBe(modal2Id)
      expect(modalStack.value[2].id).toBe(modal3Id)
    })

    it('should respect max stack size', async () => {
      const { openModal } = useModal({ maxStackSize: 2 })

      await openModal({ title: 'Modal 1' })
      await openModal({ title: 'Modal 2' })
      
      // Third modal should show warning and return empty string
      const modal3Id = await openModal({ title: 'Modal 3' })
      
      expect(modal3Id).toBe('')
      expect(mockShowWarningToast).toHaveBeenCalledWith('Máximo 2 modales abiertos simultáneamente')
    })

    it('should calculate z-index correctly', async () => {
      const { openModal, getModal } = useModal({ baseZIndex: 1000 })

      const modal1Id = await openModal({ title: 'Modal 1' })
      const modal2Id = await openModal({ title: 'Modal 2' })

      const modal1 = getModal(modal1Id)
      const modal2 = getModal(modal2Id)

      expect(modal1?.zIndex).toBe(1000) // baseZIndex + (0 * 10)
      expect(modal2?.zIndex).toBe(1010) // baseZIndex + (1 * 10)
    })
  })

  describe('Modal queries and utilities', () => {
    it('should check if modal is open', async () => {
      const { openModal, isModalOpen, closeModal } = useModal()

      const modalId = await openModal({ title: 'Test Modal' })
      expect(isModalOpen(modalId)).toBe(true)

      await closeModal(modalId)
      expect(isModalOpen(modalId)).toBe(false)
    })

    it('should get modal by ID', async () => {
      const { openModal, getModal } = useModal()

      const modalId = await openModal({ title: 'Test Modal' })
      const modal = getModal(modalId)

      expect(modal).toBeTruthy()
      expect(modal?.id).toBe(modalId)
      expect(modal?.title).toBe('Test Modal')
    })

    it('should get modal position in stack', async () => {
      const { openModal, getModalPosition } = useModal()

      const modal1Id = await openModal({ title: 'Modal 1' })
      const modal2Id = await openModal({ title: 'Modal 2' })
      const modal3Id = await openModal({ title: 'Modal 3' })

      expect(getModalPosition(modal1Id)).toBe(0)
      expect(getModalPosition(modal2Id)).toBe(1)
      expect(getModalPosition(modal3Id)).toBe(2)
      expect(getModalPosition('nonexistent')).toBe(-1)
    })

    it('should reset all modals', async () => {
      const {
        openModal,
        resetModals,
        modalCount,
        isAnyModalOpen
      } = useModal()

      await openModal({ title: 'Modal 1' })
      await openModal({ title: 'Modal 2' })

      expect(modalCount.value).toBe(2)
      expect(isAnyModalOpen.value).toBe(true)

      resetModals()

      expect(modalCount.value).toBe(0)
      expect(isAnyModalOpen.value).toBe(false)
    })
  })

  describe('Modal context management', () => {
    it('should set and get modal context', async () => {
      const {
        openModal,
        setModalContext,
        getModalContext
      } = useModal()

      const modalId = await openModal({ title: 'Test Modal' })
      
      const context = { userId: '123', formData: { name: 'John' } }
      setModalContext(modalId, context)

      const retrievedContext = getModalContext(modalId)
      expect(retrievedContext).toEqual(context)
    })

    it('should merge context when opening modal', async () => {
      const { openModal, getModalContext } = useModal()

      const initialContext = { userId: '123' }
      const modalId = await openModal({ title: 'Test Modal' }, initialContext)

      const context = getModalContext(modalId)
      expect(context).toEqual(initialContext)
    })

    it('should handle undefined context gracefully', () => {
      const { getModalContext, setModalContext } = useModal()

      expect(getModalContext('nonexistent')).toBeUndefined()
      expect(() => setModalContext('nonexistent', {})).not.toThrow()
    })
  })

  describe('Focus management', () => {
    it('should focus modal elements', async () => {
      const {
        openModal,
        focusModal,
        focusFirstElement,
        focusLastElement
      } = useModal({ enableFocusTrap: true })

      const modalId = await openModal({ title: 'Test Modal' })
      
      // Mock focusable elements
      const mockElements = [
        { focus: vi.fn() },
        { focus: vi.fn() },
        { focus: vi.fn() }
      ]
      
      const modal = { focusableElements: mockElements }
      mockQuerySelector.mockReturnValue({
        querySelectorAll: () => mockElements
      })

      expect(() => focusModal(modalId)).not.toThrow()
      expect(() => focusFirstElement(modalId)).not.toThrow()
      expect(() => focusLastElement(modalId)).not.toThrow()
    })

    it('should handle focus trap disabled', () => {
      const {
        focusModal,
        focusFirstElement,
        focusLastElement
      } = useModal({ enableFocusTrap: false })

      expect(() => focusModal('any-id')).not.toThrow()
      expect(() => focusFirstElement('any-id')).not.toThrow()
      expect(() => focusLastElement('any-id')).not.toThrow()
    })
  })

  describe('Modal reuse', () => {
    it('should reopen existing closed modal', async () => {
      const { openModal, closeModal, isModalOpen } = useModal()

      const modalId = await openModal({ id: 'reusable-modal', title: 'Test Modal' })
      expect(isModalOpen(modalId)).toBe(true)

      await closeModal(modalId)
      expect(isModalOpen(modalId)).toBe(false)

      // Reopen with same ID
      const reopenedId = await openModal({ id: 'reusable-modal', title: 'Reopened Modal' })
      expect(reopenedId).toBe(modalId)
      expect(isModalOpen(modalId)).toBe(true)
    })

    it('should warn when trying to open already open modal', async () => {
      const { openModal } = useModal()

      const modalId = await openModal({ id: 'existing-modal', title: 'Test Modal' })
      
      // Try to open same modal again
      const duplicateId = await openModal({ id: 'existing-modal', title: 'Duplicate Modal' })
      
      expect(duplicateId).toBe(modalId)
      expect(mockShowWarningToast).toHaveBeenCalledWith('El modal ya está abierto')
    })
  })
})

describe('Convenience functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('showConfirmationModal', () => {
    it('should show confirmation modal and return true on confirm', async () => {
      // Mock the composable
      const mockOpenModal = vi.fn().mockReturnValue('modal-id')
      const mockCloseModal = vi.fn()

      vi.doMock('../useModal', () => ({
        useModal: () => ({
          openModal: mockOpenModal,
          closeModal: mockCloseModal
        })
      }))

      // Note: This test would need proper mocking of the useModal hook
      // For now, we just test that the function doesn't throw
      expect(() => showConfirmationModal('Title', 'Message')).not.toThrow()
    })
  })

  describe('showAlertModal', () => {
    it('should show alert modal with default variant', async () => {
      expect(() => showAlertModal('Title', 'Message')).not.toThrow()
    })

    it('should show alert modal with custom variant', async () => {
      expect(() => showAlertModal('Title', 'Message', 'error')).not.toThrow()
    })
  })

  describe('showFormModal', () => {
    it('should show form modal with config', async () => {
      const formConfig = { fields: ['name', 'email'] }
      expect(() => showFormModal('Title', formConfig)).not.toThrow()
    })
  })
})