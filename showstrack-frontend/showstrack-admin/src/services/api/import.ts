// Import API Service - ShowsTrack Frontend
// ETL and import endpoints implementation

import { apiGet, apiPost } from './client'
import type { 
  ImportData, 
  ImportResponse, 
  ImportPreview, 
  ImportHistory, 
  ApiResponse 
} from '@/types/api'

export class ImportApiService {
  // Import data (events and shows) from JSON
  static async importData(data: ImportData): Promise<ApiResponse<ImportResponse>> {
    return apiPost<ImportResponse>('/api/admin/import', { data })
  }

  // Validate import data before applying
  static async validateImport(data: ImportData): Promise<ApiResponse<ImportPreview>> {
    return apiPost<ImportPreview>('/api/admin/import/validate', { data })
  }

  // Store file physically on server for audit/logging
  static async storeFile(
    data: ImportData, 
    filename: string, 
    validationStatus: 'valid' | 'warnings' | 'errors'
  ): Promise<ApiResponse<{
    success: boolean
    message: string
    file_path?: string
    file_size?: number
    stored_at?: string
  }>> {
    return apiPost('/api/admin/import/store-file', {
      data,
      filename,
      validation_status: validationStatus
    })
  }

  // Get import history with pagination
  static async getImportHistory(params?: {
    page?: number
    limit?: number
    source?: string
    status?: 'success' | 'partial' | 'failed'
  }): Promise<ApiResponse<ImportHistory[]>> {
    return apiGet<ImportHistory[]>('/api/admin/import/history', params)
  }

  // Get sync status (existing sync endpoints)
  static async getSyncStatus(): Promise<ApiResponse<{
    operation_mode: 'automatic' | 'manual'
    last_sync: string | null
    pending_changes: number
  }>> {
    return apiGet('/api/admin/sync/status')
  }

  // Get pending changes for sync
  static async getPendingChanges(): Promise<ApiResponse<{
    pending_changes: Array<{
      change_id: string
      action: 'create' | 'update' | 'delete'
      entity_type: 'event' | 'show'
      entity_id: string
      new_data: Record<string, unknown>
      old_data?: Record<string, unknown>
    }>
    total_pending: number
  }>> {
    return apiGet('/api/admin/sync/pending')
  }

  // Execute manual sync
  static async executeSync(): Promise<ApiResponse<{
    executed_changes: number
    processing_time_ms: number
    errors: string[]
  }>> {
    return apiPost('/api/admin/sync/execute', {})
  }

  // Apply pending changes
  static async applyPendingChanges(changeIds?: string[]): Promise<ApiResponse<{
    applied_changes: number
    errors: string[]
  }>> {
    return apiPost('/api/admin/sync/apply', {
      change_ids: changeIds
    })
  }

  // Discard pending changes
  static async discardPendingChanges(changeIds?: string[]): Promise<ApiResponse<{
    discarded_changes: number
  }>> {
    return apiPost('/api/admin/sync/discard', {
      change_ids: changeIds
    })
  }
}

export default ImportApiService