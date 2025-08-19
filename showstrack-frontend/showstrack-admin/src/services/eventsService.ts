import { useAuthStore } from '@/stores/auth'

// Configuration API avec validation
const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_SHOWSTRACK_API_URL
  const defaultUrl = 'http://localhost:8000'
  
  // En production, forcer la configuration d'une URL
  if (import.meta.env.PROD && !envUrl) {
    throw new Error(
      'VITE_SHOWSTRACK_API_URL must be configured in production environment. ' +
      'Please set this environment variable in your .env file.'
    )
  }
  
  // Validation de l'URL
  const apiUrl = envUrl || defaultUrl
  try {
    new URL(apiUrl)
  } catch {
    throw new Error(`Invalid API URL: ${apiUrl}. Please check VITE_SHOWSTRACK_API_URL configuration.`)
  }
  
  // Log en développement
  if (import.meta.env.DEV) {
    console.log(`[EventsService] Using API URL: ${apiUrl} ${envUrl ? '(from env)' : '(default)'}`) 
  }
  
  return apiUrl
}

const API_BASE_URL = getApiBaseUrl()

const getAuthHeaders = () => {
  const authStore = useAuthStore()
  const token = authStore.tokens?.accessToken
  if (!token) throw new Error('No authentication token available')
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export const fetchOperationMode = async () => {
  const res = await fetch(`${API_BASE_URL}/api/admin/config/operation-mode`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return res.json()
}

export const fetchPendingChanges = async () => {
  const res = await fetch(`${API_BASE_URL}/api/admin/sync/pending?limit=50`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return res.json()
}

export const fetchImportHistory = async () => {
  const res = await fetch(`${API_BASE_URL}/api/admin/import/history?page=1&size=10`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return res.json()
}

export const fetchTodayEvents = async () => {
  const today = new Date().toISOString().split('T')[0]
  const res = await fetch(`${API_BASE_URL}/api/admin/events?date_from=${today}&date_to=${today}&page=1&size=50`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return res.json()
}

export const executeSyncManual = async () => {
  const res = await fetch(`${API_BASE_URL}/api/admin/sync/execute`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ force: false, reason: 'Sincronización manual desde EventsView' })
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return res.json()
}

export const cleanSkippedChanges = async () => {
  const res = await fetch(`${API_BASE_URL}/api/admin/sync/execute`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ force: true, reason: 'Forzar limpieza de duplicados desde EventsView' })
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return res.json()
}

export const changeOperationMode = async (newMode: 'automatic' | 'manual') => {
  const res = await fetch(`${API_BASE_URL}/api/admin/config/operation-mode`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ mode: newMode, reason: 'Cambio manual desde panel admin' })
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return res.json()
}

export const createOverride = async (eventId: string, status: 'CERRADO' | 'CANCELADO', reason: string) => {
  const res = await fetch(`${API_BASE_URL}/api/admin/events/${eventId}/override`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ action: 'create', status, reason })
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(errorData.detail || `HTTP ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

export const applySelectedChanges = async (changeIds: string[]) => {
  const res = await fetch(`${API_BASE_URL}/api/admin/sync/apply`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ 
      change_ids: changeIds, 
      reason: `Aplicación selectiva de ${changeIds.length} cambios desde EventsView` 
    })
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return res.json()
}

export const discardSelectedChanges = async (changeIds: string[]) => {
  const res = await fetch(`${API_BASE_URL}/api/admin/sync/discard`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ 
      change_ids: changeIds, 
      reason: `Descarte selectivo de ${changeIds.length} cambios desde EventsView` 
    })
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return res.json()
}