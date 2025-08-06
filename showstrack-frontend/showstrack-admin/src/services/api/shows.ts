// Shows API Service - ShowsTrack Frontend
// Shows management endpoints implementation

import { apiGet, apiPost, apiPut, apiDelete } from './client'
import type { Show, ShowsListParams, CreateShowData, ApiResponse, PaginatedResponse } from '@/types/api'

export class ShowsApiService {
  // Get paginated list of shows
  static async getShows(params?: ShowsListParams): Promise<ApiResponse<PaginatedResponse<Show>>> {
    return apiGet<PaginatedResponse<Show>>('/api/admin/shows', params)
  }

  // Get single show by ID
  static async getShow(showId: string): Promise<ApiResponse<Show>> {
    return apiGet<Show>(`/api/admin/shows/${showId}`)
  }

  // Create new show
  static async createShow(showData: CreateShowData): Promise<ApiResponse<Show>> {
    return apiPost<Show>('/api/admin/shows', showData)
  }

  // Update existing show
  static async updateShow(showId: string, showData: Partial<CreateShowData>): Promise<ApiResponse<Show>> {
    return apiPut<Show>(`/api/admin/shows/${showId}`, showData)
  }

  // Delete show
  static async deleteShow(showId: string): Promise<ApiResponse<null>> {
    return apiDelete<null>(`/api/admin/shows/${showId}`)
  }

  // Toggle show active status
  static async toggleShowStatus(showId: string, isActive: boolean): Promise<ApiResponse<Show>> {
    return apiPut<Show>(`/api/admin/shows/${showId}/status`, { is_active: isActive })
  }

  // Get shows for public display (no auth required)
  static async getPublicShows(): Promise<ApiResponse<Show[]>> {
    return apiGet<Show[]>('/api/public/shows')
  }

  // Bulk update shows order
  static async updateShowsOrder(showsOrder: Array<{ id: string; displayOrder: number }>): Promise<ApiResponse<null>> {
    return apiPost<null>('/api/admin/shows/bulk-order', { shows: showsOrder })
  }

  // Import shows from external source
  static async importShows(source: 'puy_du_fou' | 'manual'): Promise<ApiResponse<{ imported: number; updated: number }>> {
    return apiPost<{ imported: number; updated: number }>('/api/admin/shows/import', { source })
  }

  // Get shows statistics
  static async getShowsStats(): Promise<ApiResponse<{
    total: number
    active: number
    inactive: number
    venues: string[]
  }>> {
    return apiGet<{
      total: number
      active: number
      inactive: number
      venues: string[]
    }>('/api/admin/shows/stats')
  }
}

export default ShowsApiService