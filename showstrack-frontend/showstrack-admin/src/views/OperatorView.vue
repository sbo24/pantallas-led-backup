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
          :shows="uniqueShows"
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
        <div class="section-tabs">
          <button 
            type="button"
            class="tab-btn" 
            :class="{ active: activeTab === 'shows' }"
            @click="activeTab = 'shows'"
          >
            🎭 Espectáculos
          </button>
          <button 
            type="button"
            class="tab-btn" 
            :class="{ active: activeTab === 'slides' }"
            @click="activeTab = 'slides'"
          >
            🖼️ Rotación e Imágenes
          </button>
        </div>

        <template v-if="activeTab === 'shows'">
          <ShowsControlGrid 
            :demo-mode="demoMode"
            :shows="uniqueShows"
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
        </template>

        <template v-else-if="activeTab === 'slides'">
          <SlidesScheduleControl />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useNotifications } from '@/composables'
import { useAuthStore } from '@/stores/auth'
import { getApiBaseUrl } from '@/utils/api'
import ClockDisplay from '@/components/operator/ClockDisplay.vue'
import PublicDisplayPreview from '@/components/operator/PublicDisplayPreview.vue'
import ShowsControlGrid from '@/components/operator/ShowsControlGrid.vue'
import SlidesScheduleControl from '@/components/operator/SlidesScheduleControl.vue'
import BaseButton from '@/components/BaseButton.vue'

// Estado reactivo
const activeTab = ref<'shows' | 'slides'>('shows')
const demoMode = ref(false)
const customMessage = ref('')
const publicPreview = ref<InstanceType<typeof PublicDisplayPreview>>()

// Estado centralizado de shows
const shows = ref<any[]>([])
const isLoadingShows = ref(false)
const showsError = ref('')

// Computed para filtrar shows únicos (agrupar por show_id)
// Esto evita que aparezcan múltiples filas para el mismo show si hay varios pases
const uniqueShows = computed(() => {
  if (!shows.value || shows.value.length === 0) return []
  
  const uniqueMap = new Map()
  
  shows.value.forEach(show => {
    // Si ya existe este show_id, nos quedamos con el que tenga el pase más temprano
    // (Asumiendo que la API ya devuelve ordenado, el primero suele ser el correcto,
    // pero por seguridad comparamos start_time)
    if (!uniqueMap.has(show.show_id)) {
      uniqueMap.set(show.show_id, show)
    } else {
      const existing = uniqueMap.get(show.show_id)
      // Comparar horas (formato HH:MM)
      if (show.current_pass?.start_time < existing.current_pass?.start_time) {
        uniqueMap.set(show.show_id, show)
      }
    }
  })
  
  return Array.from(uniqueMap.values())
})

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
    'La Alegría de la Navidad': 'show-04.png',
    'Mercadillo de Navidad': 'show-04.png'
  }
  
  if (!showName) return undefined
  
  // 1. Exact match
  if (iconMap[showName]) return iconMap[showName]
  
  // 2. Normalized match (NFC)
  const normalize = (str: string) => str.normalize('NFC')
  const normalizedName = normalize(showName)
  const exactKey = Object.keys(iconMap).find(k => normalize(k) === normalizedName)
  if (exactKey) return iconMap[exactKey]
  
  // 3. Case insensitive
  const lowerName = normalizedName.toLowerCase()
  const mapKey = Object.keys(iconMap).find(k => normalize(k).toLowerCase() === lowerName)
  if (mapKey) return iconMap[mapKey]
  
  // 4. Partial match for Navidad
  if (lowerName.includes('navidad')) return 'show-04.png'
  
  return undefined
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
    console.log('[OperatorView] Cargando espectáculos públicos desde /api/public/schedules...')
    const response = await fetch(`${getApiBaseUrl()}/api/public/schedules?include_tomorrow=false`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Error al cargar datos públicos: ${response.status} ${errorText}`)
    }
    
    const data = await response.json()
    console.log('[OperatorView] Espectáculos públicos cargados:', data.shows?.length || 0, 'shows')
    
    const rawShows = data.shows || []
    
    return rawShows.map((show: any) => ({
      id: show.show_id || show.id,
      show_id: show.show_id || show.id,
      event_id: show.current_pass?.event_id,
      name: show.show_name || show.name,
      show_name: show.show_name || show.name,
      selected_icon_filename: show.selected_icon_filename || getIconForShow(show.show_name || show.name),
      current_pass: show.current_pass ? {
        start_time: formatTime(show.current_pass.start_time),
        status: show.current_pass.status || 'PROGRAMADO',
        event_date: show.current_pass.event_date,
        event_id: show.current_pass.event_id
      } : null,
      next_pass: show.next_pass ? {
        start_time: formatTime(show.next_pass.start_time),
        status: show.next_pass.status || 'PROGRAMADO',
        event_date: show.next_pass.event_date,
        event_id: show.next_pass.event_id
      } : null,
      custom_lead_time_access_minutes: show.custom_lead_time_access_minutes || 30,
      hasOverride: show.hasOverride || show.current_pass?.has_override || false,
      overrideReason: show.overrideReason || show.current_pass?.override_reason || null
    }))
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

.section-tabs {
  display: flex;
  background-color: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  padding: 0.375rem 0.75rem 0 0.75rem;
  gap: 0.5rem;
  flex-shrink: 0;
}

.tab-btn {
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  border-top-left-radius: 0.375rem;
  border-top-right-radius: 0.375rem;
}

.tab-btn:hover {
  color: #1e293b;
  background: rgba(255, 255, 255, 0.6);
}

.tab-btn.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  background: white;
  box-shadow: 0 -1px 2px rgba(0, 0, 0, 0.05);
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