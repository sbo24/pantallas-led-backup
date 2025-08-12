import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import { useShows } from '../useShows'
import { useShowsStore } from '@/stores/shows'
import type { Show, CreateShowData } from '@/types/api'

// Mock the notifications composable
const mockShowToast = vi.fn()
const mockShowSuccessToast = vi.fn()
const mockShowErrorToast = vi.fn()
vi.mock('../useNotifications', () => ({
  useNotifications: () => ({
    showToast: mockShowToast,
    showErrorToast: mockShowErrorToast,
    showSuccessToast: mockShowSuccessToast
  })
}))

describe('useShows', () => {
  let pinia: ReturnType<typeof createTestingPinia>
  
  const mockShow: Show = {
    id: '1',
    name: 'Test Show',
    description: 'Test Description',
    duration: 60,
    capacity: 100,
    venue: 'Main Stage',
    isActive: true,
    leadTimeMinutes: 30,
    displayOrder: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false
    })
    setActivePinia(pinia)
    vi.clearAllMocks()
    mockShowToast.mockClear()
    mockShowSuccessToast.mockClear()
    mockShowErrorToast.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic functionality', () => {
    it('should initialize with store data', () => {
      const store = useShowsStore()
      store.shows = [mockShow]
      
      const { shows, loading, error } = useShows()
      
      expect(shows.value).toEqual([mockShow])
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should reflect store loading state', () => {
      const store = useShowsStore()
      store.isLoading = true
      
      const { loading } = useShows()
      
      expect(loading.value).toBe(true)
    })
  })

  describe('CRUD Operations with optimistic updates', () => {
    it('should handle createShow with optimistic updates', async () => {
      const store = useShowsStore()
      const createData: CreateShowData = {
        name: 'New Show',
        duration: 45,
        capacity: 80,
        venue: 'Side Stage'
      }

      // Mock successful store action
      store.createShow = vi.fn().mockResolvedValue(mockShow)
      
      const { createShow, shows } = useShows()
      
      // Initial state
      expect(shows.value).toHaveLength(0)
      
      // Execute create
      const result = await createShow(createData)
      
      expect(store.createShow).toHaveBeenCalledWith(createData)
      expect(result).toBe(mockShow)
      expect(mockShowSuccessToast).toHaveBeenCalledWith(
        'Espectáculo creado exitosamente'
      )
    })

    it('should handle createShow failure with rollback', async () => {
      const store = useShowsStore()
      const createData: CreateShowData = {
        name: 'New Show',
        duration: 45,
        capacity: 80,
        venue: 'Side Stage'
      }

      // Mock failed store action
      const error = new Error('Creation failed')
      store.createShow = vi.fn().mockResolvedValue(null)
      store.error = 'Creation failed'
      
      const { createShow } = useShows()
      
      const result = await createShow(createData)
      
      expect(result).toBeNull()
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        'Error al crear espectáculo: Creation failed'
      )
    })

    it('should handle updateShow with optimistic updates', async () => {
      const store = useShowsStore()
      const updatedShow = { ...mockShow, name: 'Updated Show' }
      
      store.shows = [mockShow]
      store.updateShow = vi.fn().mockResolvedValue(updatedShow)
      
      const { updateShow } = useShows()
      
      const result = await updateShow('1', { name: 'Updated Show' })
      
      expect(store.updateShow).toHaveBeenCalledWith('1', { name: 'Updated Show' })
      expect(result).toBe(updatedShow)
      expect(mockShowSuccessToast).toHaveBeenCalledWith(
        'Espectáculo actualizado exitosamente'
      )
    })

    it('should handle deleteShow with confirmation', async () => {
      const store = useShowsStore()
      store.shows = [mockShow]
      store.deleteShow = vi.fn().mockResolvedValue(true)
      
      const { deleteShow } = useShows()
      
      const result = await deleteShow('1')
      
      expect(store.deleteShow).toHaveBeenCalledWith('1')
      expect(result).toBe(true)
      expect(mockShowSuccessToast).toHaveBeenCalledWith(
        'Espectáculo eliminado exitosamente'
      )
    })
  })

  describe('Bulk operations', () => {
    it('should handle bulk status updates', async () => {
      const store = useShowsStore()
      const shows = [
        { ...mockShow, id: '1' },
        { ...mockShow, id: '2' },
        { ...mockShow, id: '3' }
      ]
      
      store.shows = shows
      store.toggleShowStatus = vi.fn().mockResolvedValue(true)
      
      const { bulkToggleStatus } = useShows()
      
      const result = await bulkToggleStatus(['1', '2'], false)
      
      expect(store.toggleShowStatus).toHaveBeenCalledTimes(2)
      expect(store.toggleShowStatus).toHaveBeenCalledWith('1', false)
      expect(store.toggleShowStatus).toHaveBeenCalledWith('2', false)
      expect(result.successful).toHaveLength(2)
      expect(result.failed).toHaveLength(0)
    })

    it('should handle partial failures in bulk operations', async () => {
      const store = useShowsStore()
      const shows = [
        { ...mockShow, id: '1' },
        { ...mockShow, id: '2' }
      ]
      
      store.shows = shows
      store.toggleShowStatus = vi.fn()
        .mockResolvedValueOnce(true)  // Success for first
        .mockResolvedValueOnce(false) // Failure for second
      
      const { bulkToggleStatus } = useShows()
      
      const result = await bulkToggleStatus(['1', '2'], false)
      
      expect(result.successful).toEqual(['1'])
      expect(result.failed).toEqual(['2'])
      expect(mockShowToast).toHaveBeenCalledWith(
        'Operación completada: 1 exitosos, 1 fallidos',
        'warning'
      )
    })
  })

  describe('Advanced filtering and search', () => {
    it('should provide filtered shows by venue', () => {
      const store = useShowsStore()
      const shows = [
        { ...mockShow, id: '1', venue: 'Main Stage' },
        { ...mockShow, id: '2', venue: 'Side Stage' },
        { ...mockShow, id: '3', venue: 'Main Stage' }
      ]
      store.shows = shows
      
      const { getShowsByVenue } = useShows()
      
      const mainStageShows = getShowsByVenue('Main Stage')
      expect(mainStageShows.value).toHaveLength(2)
      expect(mainStageShows.value.every(show => show.venue === 'Main Stage')).toBe(true)
    })

    it('should provide search functionality', () => {
      const store = useShowsStore()
      const shows = [
        { ...mockShow, id: '1', name: 'Amazing Show' },
        { ...mockShow, id: '2', name: 'Wonderful Performance' },
        { ...mockShow, id: '3', name: 'Amazing Concert' }
      ]
      store.shows = shows
      
      const { searchShows } = useShows()
      
      const amazingShows = searchShows('amazing')
      expect(amazingShows.value).toHaveLength(2)
      expect(amazingShows.value.every(show => 
        show.name.toLowerCase().includes('amazing')
      )).toBe(true)
    })
  })

  describe('Real-time state sync', () => {
    it('should handle real-time updates', async () => {
      const store = useShowsStore()
      store.shows = [mockShow]
      store.fetchShows = vi.fn().mockResolvedValue(true)
      
      const { startRealTimeSync, stopRealTimeSync } = useShows()
      
      // Start real-time sync
      startRealTimeSync(1000) // 1 second for testing
      
      // Wait for first sync
      await vi.waitFor(() => {
        expect(store.fetchShows).toHaveBeenCalled()
      }, { timeout: 1200 })
      
      // Stop sync
      stopRealTimeSync()
      
      // Verify sync stopped
      const callCount = (store.fetchShows as any).mock.calls.length
      await new Promise(resolve => setTimeout(resolve, 1200))
      expect((store.fetchShows as any).mock.calls.length).toBe(callCount)
    })
  })

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      const store = useShowsStore()
      store.createShow = vi.fn().mockRejectedValue(new Error('Network error'))
      
      const { createShow } = useShows()
      
      const result = await createShow({
        name: 'Test',
        duration: 60,
        capacity: 100,
        venue: 'Stage'
      })
      
      expect(result).toBeNull()
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        'Error inesperado: Network error'
      )
    })

    it('should clear errors when requested', () => {
      const store = useShowsStore()
      store.error = 'Some error'
      
      const { error, clearError } = useShows()
      
      expect(error.value).toBe('Some error')
      
      clearError()
      
      expect(store.clearError).toHaveBeenCalled()
    })
  })
})