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
              maxlength="200"
            ></textarea>
            <div class="message-actions">
              <span class="char-count">{{ customMessage.length }}/200</span>
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
import { ref, onMounted } from 'vue'
import { useNotifications } from '@/composables'
import { useAuthStore } from '@/stores/auth'
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
    'El Sueño de Toledo': 'show-09.png',
  }
  return iconMap[showName]
}

const loadRealData = async () => {
  try {
    // 1. Cargar shows públicos (para display)
    const publicResponse = await fetch('http://localhost:8000/api/public/schedules')
    if (!publicResponse.ok) throw new Error('Failed to load public data')
    const publicData = await publicResponse.json()
    
    // 2. Cargar eventos admin (para obtener event_id) - necesitamos autenticación
    let eventsData: any = null
    try {
      const token = getAccessToken()
      if (!token) {
        console.warn('No hay token de autenticación, overrides no estarán disponibles')
        return publicData.shows.map((show: any) => ({
          id: show.show_id,
          show_id: show.show_id,
          name: show.show_name,
          show_name: show.show_name,
          selected_icon_filename: getIconForShow(show.show_name),
          current_pass: show.current_pass,
          next_pass: show.next_pass,
          custom_lead_time_access_minutes: 30,
          hasOverride: false
        }))
      }
      
      const today = new Date().toISOString().split('T')[0]
      console.log('[OperatorView] Cargando eventos admin con token...')
      const eventsResponse = await fetch(`http://localhost:8000/api/admin/events?date_from=${today}&date_to=${today}&page=1&size=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('[OperatorView] Respuesta eventos admin:', eventsResponse.status)
      if (eventsResponse.ok) {
        eventsData = await eventsResponse.json()
        console.log('[OperatorView] Eventos admin cargados exitosamente')
      } else {
        const errorText = await eventsResponse.text()
        console.warn('Error al cargar eventos admin:', eventsResponse.status, errorText)
      }
    } catch (error) {
      console.warn('No se pudieron cargar eventos admin, overrides no estarán disponibles:', error)
    }
    
    // 3. Mapear y enriquecer datos
    console.log('[OperatorView] Datos públicos cargados:', publicData.shows?.length, 'shows')
    console.log('[OperatorView] Datos admin cargados:', eventsData?.items?.length, 'events')
    if (eventsData?.items?.length > 0) {
      console.log('[OperatorView] Primer evento admin:', eventsData.items[0])
    }
    
    return publicData.shows.map((show: any) => {
      // Buscar el event_id del current_pass si existe
      let currentEventId = null
      if (eventsData && show.current_pass) {
        console.log(`[OperatorView] Buscando evento para show "${show.show_name}":`, {
          show_name: show.show_name,
          start_time: show.current_pass.start_time,
          event_date: show.current_pass.event_date
        })
        
        // Normalizar tiempo para comparación (12:45 -> 12:45, 22:00:00 -> 22:00)
        const normalizeTime = (timeStr: string) => {
          if (!timeStr) return ''
          // Tomar solo HH:MM (ignorar segundos si existen)
          return timeStr.substring(0, 5)
        }
        
        // NUEVA LÓGICA: Mapear por show_id y tiempo normalizado
        const matchingEvent = eventsData.items?.find((event: any) => {
          const eventTimeNormalized = normalizeTime(event.start_time)
          const showTimeNormalized = normalizeTime(show.current_pass.start_time)
          
          const showIdMatch = event.show_id === show.show_id
          const timeMatch = eventTimeNormalized === showTimeNormalized
          const dateMatch = event.event_date === show.current_pass.event_date
          
          const match = showIdMatch && timeMatch && dateMatch
          
          if (showIdMatch) {
            console.log(`[OperatorView] Comparando evento por show_id ${event.show_id}:`, {
              event_id: event.id,
              event_start_time: event.start_time,
              event_time_normalized: eventTimeNormalized,
              show_start_time: show.current_pass.start_time,
              show_time_normalized: showTimeNormalized,
              event_date: event.event_date,
              show_date: show.current_pass.event_date,
              show_id_match: showIdMatch,
              time_match: timeMatch,
              date_match: dateMatch,
              final_match: match
            })
          }
          
          return match
        })
        
        // Log de todos los eventos disponibles para debug (solo una vez)
        if (show.show_name === "El Último Cantar") {
          console.log(`[OperatorView] Eventos disponibles para show_id ${show.show_id}:`, 
            eventsData.items.filter((e: any) => e.show_id === show.show_id)
              .map((e: any) => ({
                event_id: e.id,
                show_id: e.show_id,
                start_time: e.start_time,
                start_time_normalized: normalizeTime(e.start_time),
                event_date: e.event_date,
                show_name: e.show_name
              }))
          )
        }
        
        if (matchingEvent) {
          currentEventId = matchingEvent.id
          console.log(`[OperatorView] ✅ Evento encontrado para "${show.show_name}": ID ${currentEventId}`)
        } else {
          console.log(`[OperatorView] ❌ No se encontró evento para "${show.show_name}"`)
        }
      }
      
      return {
        id: show.show_id,
        show_id: show.show_id,
        name: show.show_name,
        show_name: show.show_name,
        selected_icon_filename: getIconForShow(show.show_name),
        current_pass: show.current_pass ? {
          ...show.current_pass,
          event_id: currentEventId // Agregar event_id para overrides
        } : null,
        next_pass: show.next_pass,
        custom_lead_time_access_minutes: 30,
        hasOverride: false
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
      console.log('[OperatorView] Shows demo cargados:', shows.value.length)
      console.log('[OperatorView] Primer show demo:', shows.value[0])
    } else {
      shows.value = await loadRealData()
      console.log('[OperatorView] Shows reales cargados:', shows.value.length)
      console.log('[OperatorView] Primer show real:', shows.value[0])
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
  showSuccessToast('Preview actualizado')
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
    // TODO: Implementar API call para guardar mensaje personalizado
    // await apiPost('/api/operator/custom-message', { message: customMessage.value })
    
    showSuccessToast('Mensaje personalizado guardado')
    
    // Refresh preview para mostrar el nuevo mensaje
    refreshPreview()
  } catch (error) {
    showErrorToast('Error al guardar mensaje personalizado')
  }
}

onMounted(() => {
  // Cargar shows al montar el componente
  loadShows()
  
  // Cargar mensaje personalizado existente si hay uno
  // TODO: Implementar carga desde API
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