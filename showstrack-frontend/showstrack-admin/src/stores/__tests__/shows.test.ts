// Shows Store Tests - ShowsTrack Frontend
// Tests for shows management store functionality

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useShowsStore } from '../shows'
import ShowsApiService from '@/services/api/shows'
import type { Show, ShowsListParams, CreateShowData, UpdateShowData, ApiResponse } from '@/types/api'

// Mock API service
vi.mock('@/services/api/shows')
const mockShowsApiService = ShowsApiService as {
  getShows: MockedFunction<any>
  getShow: MockedFunction<any>
  createShow: MockedFunction<any>
  updateShow: MockedFunction<any>
  deleteShow: MockedFunction<any>
  bulkUpdateShowStatus: MockedFunction<any>
}

describe('Shows Store', () => {
  let mockShow: Show

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    mockShow = {
      id: 'show-1',
      name: 'Test Show',
      description: 'A test show',
      type: 'performance',
      duration: 90,
      minAge: 0,
      maxCapacity: 2000,
      venue: 'Main Theater',
      isActive: true,
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z'
    }
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useShowsStore()
      
      expect(store.shows).toEqual([])
      expect(store.currentShow).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.pagination).toEqual({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      })
    })

    it('should compute stats correctly', () => {
      const store = useShowsStore()
      
      // Initially empty
      expect(store.showsStats).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        byType: {},
        avgDuration: 0
      })
      
      // Add shows
      store.shows = [
        mockShow,
        { ...mockShow, id: 'show-2', isActive: false, type: 'tour', duration: 120 },
        { ...mockShow, id: 'show-3', type: 'performance', duration: 60 }
      ]
      
      const stats = store.showsStats
      expect(stats.total).toBe(3)
      expect(stats.active).toBe(2)
      expect(stats.inactive).toBe(1)
      expect(stats.byType.performance).toBe(2)
      expect(stats.byType.tour).toBe(1)
      expect(stats.avgDuration).toBe(90) // (90 + 120 + 60) / 3
    })
  })

  describe('Shows Fetching', () => {
    it('should fetch shows successfully', async () => {
      const store = useShowsStore()
      const mockShows = [mockShow]
      
      mockShowsApiService.getShows.mockResolvedValueOnce({
        data: {
          shows: mockShows,
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1
        },
        status: 200
      } as ApiResponse<{
        shows: Show[]
        total: number
        page: number
        limit: number
        totalPages: number
      }>)
      
      const result = await store.fetchShows()
      
      expect(result).toBe(true)
      expect(store.shows).toEqual(mockShows)
      expect(store.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      })
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should handle fetch shows failure', async () => {
      const store = useShowsStore()
      
      mockShowsApiService.getShows.mockRejectedValueOnce({
        message: 'Failed to fetch shows',
        status: 500
      })
      
      const result = await store.fetchShows()
      
      expect(result).toBe(false)
      expect(store.shows).toEqual([])
      expect(store.error).toBe('Failed to fetch shows')
      expect(store.isLoading).toBe(false)
    })

    it('should fetch shows with filters', async () => {
      const store = useShowsStore()
      const filters: ShowsListParams = {
        search: 'test',
        isActive: true,
        type: 'performance',
        page: 2,
        limit: 5
      }
      
      mockShowsApiService.getShows.mockResolvedValueOnce({
        data: {
          shows: [mockShow],
          total: 1,
          page: 2,
          limit: 5,
          totalPages: 1
        },
        status: 200
      })
      
      await store.fetchShows(filters)
      
      expect(mockShowsApiService.getShows).toHaveBeenCalledWith(filters)
    })

    it('should fetch single show successfully', async () => {
      const store = useShowsStore()
      
      mockShowsApiService.getShow.mockResolvedValueOnce({
        data: mockShow,
        status: 200
      } as ApiResponse<Show>)
      
      const result = await store.fetchShow('show-1')
      
      expect(result).toEqual(mockShow)
      expect(store.currentShow).toEqual(mockShow)
      expect(store.error).toBeNull()
    })

    it('should handle fetch single show failure', async () => {
      const store = useShowsStore()
      
      mockShowsApiService.getShow.mockRejectedValueOnce({
        message: 'Show not found',
        status: 404
      })
      
      const result = await store.fetchShow('non-existent')
      
      expect(result).toBeNull()
      expect(store.error).toBe('Show not found')
    })
  })

  describe('Show Management', () => {
    it('should create show successfully', async () => {
      const store = useShowsStore()
      const createData: CreateShowData = {
        name: 'New Show',
        description: 'A new show',
        type: 'performance',
        duration: 90,
        minAge: 0,
        maxCapacity: 1500,
        venue: 'Theater 2'
      }
      
      const createdShow = { ...mockShow, ...createData, id: 'show-new' }
      
      mockShowsApiService.createShow.mockResolvedValueOnce({
        data: createdShow,
        status: 201
      } as ApiResponse<Show>)
      
      const result = await store.createShow(createData)
      
      expect(result).toEqual(createdShow)
      expect(store.shows).toContain(createdShow)
      expect(store.error).toBeNull()
    })

    it('should handle create show failure', async () => {
      const store = useShowsStore()
      const createData: CreateShowData = {
        name: '',
        description: 'Invalid show',
        type: 'performance',
        duration: 90,
        minAge: 0,
        maxCapacity: 1500,
        venue: 'Theater'
      }
      
      mockShowsApiService.createShow.mockRejectedValueOnce({
        message: 'Name is required',
        status: 400
      })
      
      const result = await store.createShow(createData)
      
      expect(result).toBeNull()
      expect(store.error).toBe('Name is required')
    })

    it('should update show successfully', async () => {
      const store = useShowsStore()
      store.shows = [mockShow]
      
      const updateData: UpdateShowData = {
        name: 'Updated Show Name',
        duration: 120
      }
      
      const updatedShow = { ...mockShow, ...updateData }
      
      mockShowsApiService.updateShow.mockResolvedValueOnce({
        data: updatedShow,
        status: 200
      } as ApiResponse<Show>)
      
      const result = await store.updateShow('show-1', updateData)
      
      expect(result).toEqual(updatedShow)
      expect(store.shows[0]).toEqual(updatedShow)
      expect(store.error).toBeNull()
    })

    it('should handle update show failure', async () => {
      const store = useShowsStore()
      
      mockShowsApiService.updateShow.mockRejectedValueOnce({
        message: 'Show not found',
        status: 404
      })
      
      const result = await store.updateShow('non-existent', { name: 'Updated' })
      
      expect(result).toBeNull()
      expect(store.error).toBe('Show not found')
    })

    it('should delete show successfully', async () => {
      const store = useShowsStore()
      store.shows = [mockShow]
      store.currentShow = mockShow
      
      mockShowsApiService.deleteShow.mockResolvedValueOnce({
        data: { message: 'Show deleted' },
        status: 200
      })
      
      const result = await store.deleteShow('show-1')
      
      expect(result).toBe(true)
      expect(store.shows).toEqual([])
      expect(store.currentShow).toBeNull()
      expect(store.error).toBeNull()
    })

    it('should handle delete show failure', async () => {
      const store = useShowsStore()
      
      mockShowsApiService.deleteShow.mockRejectedValueOnce({
        message: 'Cannot delete show with active events',
        status: 400
      })
      
      const result = await store.deleteShow('show-1')
      
      expect(result).toBe(false)
      expect(store.error).toBe('Cannot delete show with active events')
    })
  })

  describe('Bulk Operations', () => {
    it('should perform bulk status update successfully', async () => {
      const store = useShowsStore()
      const show1 = { ...mockShow, id: 'show-1', isActive: true }
      const show2 = { ...mockShow, id: 'show-2', isActive: true }
      store.shows = [show1, show2]
      
      const showIds = ['show-1', 'show-2']
      const updatedShows = [
        { ...show1, isActive: false },
        { ...show2, isActive: false }
      ]
      
      mockShowsApiService.bulkUpdateShowStatus.mockResolvedValueOnce({
        data: {
          updated: 2,
          shows: updatedShows
        },
        status: 200
      })
      
      const result = await store.bulkUpdateStatus(showIds, false)
      
      expect(result).toBe(true)
      expect(store.shows[0].isActive).toBe(false)
      expect(store.shows[1].isActive).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should handle bulk update failure', async () => {
      const store = useShowsStore()
      
      mockShowsApiService.bulkUpdateShowStatus.mockRejectedValueOnce({
        message: 'Some shows not found',
        status: 404
      })
      
      const result = await store.bulkUpdateStatus(['show-1', 'show-2'], true)
      
      expect(result).toBe(false)
      expect(store.error).toBe('Some shows not found')
    })
  })

  describe('Search and Filtering', () => {
    beforeEach(() => {
      const store = useShowsStore()
      store.shows = [
        mockShow,
        { ...mockShow, id: 'show-2', name: 'Another Show', type: 'tour', isActive: false },
        { ...mockShow, id: 'show-3', name: 'Special Performance', type: 'performance' }
      ]
    })

    it('should filter shows by search term', () => {
      const store = useShowsStore()
      
      const filtered = store.getFilteredShows('Special')
      
      expect(filtered).toHaveLength(1)
      expect(filtered[0].name).toBe('Special Performance')
    })

    it('should filter shows by type', () => {
      const store = useShowsStore()
      
      const performanceShows = store.getShowsByType('performance')
      const tourShows = store.getShowsByType('tour')
      
      expect(performanceShows).toHaveLength(2)
      expect(tourShows).toHaveLength(1)
    })

    it('should filter active shows', () => {
      const store = useShowsStore()
      
      const activeShows = store.activeShows
      const inactiveShows = store.inactiveShows
      
      expect(activeShows).toHaveLength(2)
      expect(inactiveShows).toHaveLength(1)
    })
  })

  describe('Utility Functions', () => {
    it('should clear error', () => {
      const store = useShowsStore()
      
      store.error = 'Some error'
      expect(store.error).toBe('Some error')
      
      store.clearError()
      expect(store.error).toBeNull()
    })

    it('should clear current show', () => {
      const store = useShowsStore()
      
      store.currentShow = mockShow
      expect(store.currentShow).toEqual(mockShow)
      
      store.clearCurrentShow()
      expect(store.currentShow).toBeNull()
    })

    it('should refresh all data', async () => {
      const store = useShowsStore()
      
      mockShowsApiService.getShows.mockResolvedValueOnce({
        data: {
          shows: [mockShow],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1
        },
        status: 200
      })
      
      await store.refreshAll()
      
      expect(mockShowsApiService.getShows).toHaveBeenCalled()
      expect(store.shows).toEqual([mockShow])
    })
  })

  describe('Computed Properties', () => {
    it('should check if shows are available', () => {
      const store = useShowsStore()
      
      expect(store.hasShows).toBe(false)
      
      store.shows = [mockShow]
      expect(store.hasShows).toBe(true)
    })

    it('should check loading states', () => {
      const store = useShowsStore()
      
      expect(store.isLoading).toBe(false)
      
      store.isLoading = true
      expect(store.isLoading).toBe(true)
    })
  })
})