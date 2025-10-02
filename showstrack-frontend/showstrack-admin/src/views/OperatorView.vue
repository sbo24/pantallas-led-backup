<template>
  <div class="operator-view">
    <!-- Header con reloj -->
    <div class="operator-header">
      <h1 class="operator-title">Vista de Operador</h1>
      <ClockDisplay />
    </div>

    <!-- Layout principal con 2 columnas -->
    <div class="operator-main">
      <!-- Columna izquierda: Preview de pantallas públicas -->
      <div class="preview-section">
        <h2 class="section-title">Preview Pantallas Públicas</h2>
        <PublicDisplayPreview 
          ref="publicPreview"
          :demo-mode="demoMode"
          :shows="shows"
          :is-loading="isLoadingShows"
          :error="showsError"
          class="preview-container"
        />
        
        <!-- Controles del preview -->
        <div class="preview-controls">
          <label class="demo-toggle">
            <input 
              type="checkbox" 
              v-model="demoMode"
              @change="onDemoModeChange"
            />
            <span>Modo Demo</span>
          </label>
          
          <BaseButton 
            @click="refreshPreview"
            variant="secondary"
            size="sm"
          >
            🔄 Actualizar Preview
          </BaseButton>
        </div>
      </div>

      <!-- Columna derecha: Controles de operador -->
      <div class="controls-section">
        <h2 class="section-title">Controles Manuales</h2>
        <ShowsControlGrid 
          :demo-mode="demoMode"
          :shows="shows"
          :is-loading="isLoadingShows"
          :error="showsError"
          @override-applied="onOverrideApplied"
          class="control-grid"
        />
        
        <!-- Mensaje personalizado -->
        <div class="message-section">
          <h3 class="subsection-title">Mensaje Personalizado</h3>
          <div class="message-editor">
            <textarea
              v-model="customMessage"
              placeholder="Mensaje que aparecerá en las pantallas públicas..."
              class="message-input"
              rows="3"
              maxlength="100"
            ></textarea>
            <div class="message-actions">
              <span class="char-count">{{ customMessage.length }}/100</span>
              <BaseButton 
                @click="saveCustomMessage"
                :disabled="!customMessage.trim()"
                variant="primary"
                size="sm"
              >
                💾 Guardar Mensaje
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useNotifications } from '@/composables'
import { useAuthStore } from '@/stores/auth'
import { getApiBaseUrl } from '@/utils/api'
import ClockDisplay from '@/components/operator/ClockDisplay.vue'
import PublicDisplayPreview from '@/components/operator/PublicDisplayPreview.vue'
import ShowsControlGrid from '@/components/operator/ShowsControlGrid.vue'
import BaseButton from '@/components/BaseButton.vue'

// Estado reactivo
const demoMode = ref(false)
const customMessage = ref('')
const publicPreview = ref<InstanceType<typeof PublicDisplayPreview>>()

// Estado centralizado de shows
const shows = ref<any[]>([])
const isLoadingShows = ref(false)
const showsError = ref('')

// Composables
const { showSuccessToast, showErrorToast } = useNotifications()
const authStore = useAuthStore()

// Función para obtener token de autenticación
const getAccessToken = () => {
  try {
    // Método 1: desde el store Pinia (más confiable)
    if (authStore.tokens?.accessToken) {
      console.log('[OperatorView] Token obtenido desde store Pinia')
      return authStore.tokens.accessToken
    }
    
    // Método 2: desde localStorage (Pinia persistido)
    const authData = localStorage.getItem('auth')
    if (authData) {
      const parsedAuth = JSON.parse(authData)
      if (parsedAuth.tokens?.accessToken) {
        console.log('[OperatorView] Token obtenido desde localStorage')
        return parsedAuth.tokens.accessToken
      }
    }
    
    // Método 3: desde sessionStorage
    const sessionAuth = sessionStorage.getItem('auth')
    if (sessionAuth) {
      const parsedAuth = JSON.parse(sessionAuth)
      if (parsedAuth.tokens?.accessToken) {
        console.log('[OperatorView] Token obtenido desde sessionStorage')
        return parsedAuth.tokens.accessToken
      }
    }
    
    console.warn('[OperatorView] No se encontró token de autenticación en ninguna fuente')
    return null
  } catch (error) {
    console.error('[OperatorView] Error al obtener token:', error)
    return null
  }
}

// Funciones de carga de datos centralizadas
const loadDemoData = async () => {
  try {
    const response = await fetch('/data/demo-data.json')
    if (!response.ok) throw new Error('Failed to load demo data')
    
    const data = await response.json()
    
    return data.shows.map((show: any) => ({
      id: show.show_id,
      show_id: show.show_id, // Mantener ambas propiedades por compatibilidad
      name: show.show_name,
      show_name: show.show_name, // Mantener ambas propiedades por compatibilidad
      selected_icon_filename: show.selected_icon_filename,
      current_pass: show.current_pass,
      next_pass: show.next_pass,
      custom_lead_time_access_minutes: 30,
      hasOverride: false
    }))
  } catch (error) {
    console.error('Error loading demo data:', error)
    throw error
  }
}

const getIconForShow = (showName: string): string | undefined => {
  const iconMap: Record<string, string> = {
    'El Último Cantar': 'show-01.png',
    'A Pluma y Espada': 'show-02.png',
    'Allende la Mar Océana': 'show-03.png',
    'Cetrería de Reyes': 'show-04.png',
    'El Misterio de Sorbaces': 'show-05.png',
    'El tambor de la Libertad': 'show-06.png',
    'El Tambor de la Libertad': 'show-06.png',
    'De Tal Palo': 'show-07.png',
    'El Espadero de Vivar': 'show-08.png',
    'El Sueño de Toledo': 'night-show.png',
  }
  return iconMap[showName]
}

// Función para formatear tiempo sin segundos
const formatTime = (timeString: string) => {
  if (!timeString || timeString === '--:--') return '--:--'
  
  // Si viene con segundos (HH:MM:SS), extraer solo HH:MM
  if (timeString.includes(':') && timeString.split(':').length === 3) {
    const [hours, minutes] = timeString.split(':')
    return `${hours}:${minutes}`
  }
  
  // Si ya está en formato HH:MM, devolverlo tal como está
  return timeString
}

const loadRealData = async () => {
  try {
    // NUEVA LÓGICA: Cargar eventos individuales directamente (como EventsView)
    const token = getAccessToken()
    if (!token) {
      console.warn('No hay token de autenticación, no se pueden cargar eventos')
      throw new Error('No authentication token available')
    }
    
    console.log('[OperatorView] Cargando shows visibles primero...')
    
    // 1. Cargar shows visibles para filtrar eventos
    const showsResponse = await fetch(`${getApiBaseUrl()}/api/admin/shows?visible_only=true&page=1&size=100`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!showsResponse.ok) {
      const errorText = await showsResponse.text()
      throw new Error(`Error al cargar shows visibles: ${showsResponse.status} ${errorText}`)
    }
    
    const showsData = await showsResponse.json()
    const visibleShowIds = new Set(showsData.items?.map((show: any) => show.id) || [])
    console.log('[OperatorView] Shows visibles cargados:', visibleShowIds.size, 'shows')
    
    if (visibleShowIds.size === 0) {
      console.log('[OperatorView] No hay shows visibles')
      return []
    }
    
    const today = new Date().toISOString().split('T')[0]
    console.log('[OperatorView] Cargando eventos individuales para operador...')
    
    // 2. Cargar eventos del día
    const eventsResponse = await fetch(`${getApiBaseUrl()}/api/admin/events?date_from=${today}&date_to=${today}&page=1&size=50`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!eventsResponse.ok) {
      const errorText = await eventsResponse.text()
      throw new Error(`Error al cargar eventos: ${eventsResponse.status} ${errorText}`)
    }
    
    const eventsData = await eventsResponse.json()
    console.log('[OperatorView] Eventos cargados:', eventsData.items?.length, 'eventos')
    
    if (!eventsData.items || eventsData.items.length === 0) {
      console.log('[OperatorView] No hay eventos para hoy')
      return []
    }
    
    // 3. Filtrar eventos por shows visibles, eventos de sistema y ventana temporal
    const currentTime = new Date()
    const showEvents = eventsData.items.filter((event: any) => {
      const showName = event.show?.name || ''
      const showId = event.show_id
      
      // Filtrar eventos de sistema (Apertura/Cierre)
      if (showName.includes('Apertura') || showName.includes('Cierre')) {
        return false
      }
      
      // Filtrar por shows visibles
      if (!visibleShowIds.has(showId)) {
        console.log(`[OperatorView] Evento filtrado por show no visible: ${showName} (ID: ${showId})`)
        return false
      }
      
      // Filtrar eventos que han pasado más de 5 minutos desde el inicio
      const eventDate = new Date(event.event_date)
      const [hours, minutes] = event.start_time.split(':').map(Number)
      const eventDateTime = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), hours, minutes)
      const minutesSinceStart = (currentTime.getTime() - eventDateTime.getTime()) / (1000 * 60)
      
      if (minutesSinceStart > 5) {
        console.log(`[OperatorView] Evento filtrado por ventana temporal: ${showName} (${minutesSinceStart.toFixed(1)} min desde inicio)`)
        return false
      }
      
      return true
    })

    return showEvents.map((event: any) => {
        // Buscar el siguiente evento del mismo show (ordenados ascendente para encontrar el próximo)
        const sameShowEvents = showEvents
          .filter((e: any) => e.show_id === event.show_id)
          .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time))

        const currentIndex = sameShowEvents.findIndex((e: any) => e.id === event.id)
        const nextEvent = currentIndex < sameShowEvents.length - 1 ? sameShowEvents[currentIndex + 1] : null

        return {
          id: event.id,
          event_id: event.id, // ID directo del evento
          show_id: event.show_id,
          name: event.show?.name || event.show_name || 'Show desconocido',
          show_name: event.show?.name || event.show_name || 'Show desconocido',
          selected_icon_filename: getIconForShow(event.show?.name || event.show_name),
          current_pass: {
            start_time: formatTime(event.start_time),
            status: event.calculated_status || 'PROGRAMADO',
            event_date: event.event_date,
            event_id: event.id
          },
          next_pass: nextEvent ? {
            start_time: formatTime(nextEvent.start_time),
            event_date: nextEvent.event_date
          } : null,
          custom_lead_time_access_minutes: (() => {
            const leadTime = event.show?.custom_lead_time_access_minutes || 30
            if (event.show?.name === 'A Pluma y Espada') {
              console.log('[OperatorView] A Pluma y Espada lead time:', {
                from_api: event.show?.custom_lead_time_access_minutes,
                show_object: event.show,
                final_value: leadTime
              })
            }
            return leadTime
          })(),
          hasOverride: event.status_override?.is_active || false,
          overrideReason: event.status_override?.reason || null
        }
      })
  } catch (error) {
    console.error('Error loading real data:', error)
    throw error
  }
}

const loadShows = async () => {
  console.log('[OperatorView] Cargando shows, demoMode:', demoMode.value)
  isLoadingShows.value = true
  showsError.value = ''
  
  try {
    if (demoMode.value) {
      shows.value = await loadDemoData()
    } else {
      shows.value = await loadRealData()
    }
  } catch (error) {
    console.error('Error loading shows:', error)
    showsError.value = 'Error al cargar los espectáculos'
  } finally {
    isLoadingShows.value = false
  }
}

// Métodos
const onDemoModeChange = async () => {
  // Recargar shows cuando cambie el modo demo
  await loadShows()
}

const refreshPreview = async () => {
  await loadShows()
  // Also refresh custom message in preview
  const previewComponent = publicPreview.value
  if (previewComponent && previewComponent.loadCustomMessage) {
    previewComponent.loadCustomMessage()
  }
  showSuccessToast('Preview actualizado')
}

const loadCurrentCustomMessage = async () => {
  try {
    const authStore = useAuthStore()
    if (!authStore.tokens?.accessToken) {
      console.warn('[OperatorView] No access token available for loading custom message')
      return
    }
    
    const response = await fetch(`${getApiBaseUrl()}/api/admin/config/custom-message`, {
      headers: {
        'Authorization': `Bearer ${authStore.tokens.accessToken}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.has_message && data.custom_message) {
        customMessage.value = data.custom_message
        console.log('[OperatorView] Current custom message loaded:', data.custom_message)
      }
    }
  } catch (error) {
    console.warn('[OperatorView] Error loading current custom message:', error)
  }
}

const onOverrideApplied = async (data: { showId: number; status: string; reason: string }) => {
  console.log('[OperatorView] Override aplicado recibido:', data)
  
  if (data.status === 'REVERTIDO') {
    console.log('[OperatorView] Override revertido - recargando datos desde API')
  } else {
    console.log('[OperatorView] Override aplicado - recargando datos desde API')
  }
  
  // RECARGAR datos desde API para reflejar el override real
  await loadShows()
}

const saveCustomMessage = async () => {
  try {
    console.log('[OperatorView] Guardando mensaje personalizado:', customMessage.value)
    
    // Get auth token
    const authStore = useAuthStore()
    if (!authStore.tokens?.accessToken) {
      throw new Error('No authentication token available')
    }
    
    // Prepare message data
    const messageData = {
      message: customMessage.value?.trim() || null
    }
    
    // API call to save custom message
    const response = await fetch(`${getApiBaseUrl()}/api/admin/config/custom-message`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.tokens.accessToken}`
      },
      body: JSON.stringify(messageData)
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || 'Error al guardar mensaje')
    }
    
    const result = await response.json()
    console.log('[OperatorView] Mensaje guardado exitosamente:', result)
    
    showSuccessToast('Mensaje personalizado guardado')
    
    // Refresh preview to show the new message (without showing additional toast)
    await loadShows()
    const previewComponent = publicPreview.value
    if (previewComponent && previewComponent.loadCustomMessage) {
      previewComponent.loadCustomMessage()
    }
  } catch (error) {
    console.error('[OperatorView] Error guardando mensaje personalizado:', error)
    showErrorToast('Error al guardar mensaje personalizado')
  }
}

// Auto-refresh functionality
let autoRefreshInterval: NodeJS.Timeout | null = null

const startAutoRefresh = () => {
  // Limpiar intervalo existente si lo hay
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval)
  }
  
  // Actualizar cada 30 segundos (mismo intervalo que pantallas públicas)
  autoRefreshInterval = setInterval(async () => {
    console.log('[OperatorView] Auto-refresh: recargando datos...')
    await loadShows()
  }, 30000) // 30 segundos
}

const stopAutoRefresh = () => {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval)
    autoRefreshInterval = null
  }
}

onMounted(() => {
  // Cargar shows al montar el componente
  loadShows()
  
  // Iniciar auto-refresh
  startAutoRefresh()
  
  // Cargar mensaje personalizado existente
  loadCurrentCustomMessage()
})

// Limpiar intervalo al desmontar el componente
onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.operator-view {
  min-height: 100vh;
  padding: 1rem;
  background-color: #f8fafc;
}

.operator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.operator-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.operator-main {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  height: calc(100vh - 140px);
  min-height: 600px;
}

.preview-section,
.controls-section {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 100%;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.preview-container {
  flex: 1;
  margin: 1rem;
  min-height: 300px;
  overflow: hidden;
}

.preview-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
  background-color: #f9fafb;
  flex-shrink: 0;
  min-height: 60px;
}

.demo-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
}

.demo-toggle input {
  width: 1rem;
  height: 1rem;
}

.control-grid {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  min-height: 200px;
}

.message-section {
  border-top: 1px solid #e5e7eb;
  background-color: #f9fafb;
  flex-shrink: 0;
  max-height: 200px;
  overflow-y: auto;
}

.subsection-title {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
  padding: 1rem 1rem 0.5rem;
}

.message-editor {
  padding: 0 1rem 1rem;
}

.message-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  resize: vertical;
  font-family: inherit;
  font-size: 0.875rem;
  line-height: 1.5;
}

.message-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.message-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.char-count {
  font-size: 0.75rem;
  color: #6b7280;
}

@media (max-width: 1280px) {
  .operator-main {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .preview-container {
    height: 400px;
  }
}
</style>