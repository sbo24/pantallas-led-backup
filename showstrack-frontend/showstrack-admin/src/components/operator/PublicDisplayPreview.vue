<template>
  <div class="public-display-preview">
    <!-- MAIN CONTENT - Ahora ocupa más espacio al quitar header -->
    <main class="main-content">
      <!-- Contenido normal: tabla de espectáculos -->
      <div class="shows-container" v-if="!isAlertMode">
        <table class="shows-table" v-if="!props.isLoading && !props.error && displayShows.length > 0">
          <thead>
            <tr>
              <th class="col-show-combined" colspan="2">
                <div class="table-title-with-icon">
                  <img src="/assets/images/shows.png" alt="Shows" class="table-shows-icon">
                  <span>PRÓXIMOS ESPECTÁCULOS</span>
                </div>
              </th>
              <th class="col-time">Hora</th>
              <th class="col-status">{{ currentTime }}</th>
              <th class="col-next">Próximo</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="(show, index) in displayShows" 
              :key="show.show_id || index"
              :data-status="show.current_pass?.status || 'PROGRAMADO'"
            >
              <td class="col-show-combined" colspan="2">
                <div class="show-content">
                  <img 
                    v-if="show.selected_icon_filename"
                    :src="`/assets/images/show-icons/${show.selected_icon_filename}`"
                    :alt="show.show_name"
                    class="show-icon"
                  />
                  <span v-else class="show-number">{{ show.show_id || (index + 1) }}</span>
                  <span class="show-name">{{ show.show_name || 'Sin nombre' }}</span>
                </div>
              </td>
              <td class="col-time">
                <span class="show-time">{{ show.current_pass?.start_time || '--:--' }}</span>
              </td>
              <td class="col-status">
                <span class="show-status" :data-status="show.current_pass?.status || 'PROGRAMADO'">
                  {{ show.current_pass?.status || 'PROGRAMADO' }}
                </span>
              </td>
              <td class="col-next">
                <span class="show-next">{{ show.next_pass?.start_time || '--:--' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
        
        <!-- Estados de carga/error/vacío -->
        <div v-if="props.isLoading" class="loading-state">
          <p>Cargando horarios...</p>
        </div>
        
        <div v-else-if="props.error" class="error-state">
          <p>{{ props.error }}</p>
        </div>
        
        <div v-else-if="displayShows.length === 0" class="empty-state">
          <p>No hay espectáculos programados</p>
        </div>
      </div>

      <!-- Modo alerta global (oculto por defecto) -->
      <div class="alert-mode" v-if="isAlertMode">
        <div class="alert-icon">⚠️</div>
        <h1 class="alert-message">{{ alertMessage }}</h1>
        <p class="alert-timestamp">Activada: {{ alertTimestamp }}</p>
      </div>
    </main>

    <!-- FOOTER - 15% de la pantalla (162px) -->
    <footer class="footer">
      <div class="footer-content">
        <div class="custom-message">
          <p class="custom-text">{{ customMessage || 'Mensaje personalizado aquí' }}</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

// Props
interface Props {
  demoMode?: boolean
  shows?: any[]
  isLoading?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  demoMode: false,
  shows: () => [],
  isLoading: false,
  error: ''
})

// Estado reactivo (solo para datos locales del componente)
// Los shows ahora vienen como prop desde OperatorView
const currentTime = ref('')
const lastUpdateTime = ref('')
const nextUpdateTime = ref('30s')
const isAlertMode = ref(false)
const alertMessage = ref('')
const alertTimestamp = ref('')
const customMessage = ref('Disfruta de los espectáculos de Puy du Fou')

// Function to load custom message from API
const loadCustomMessage = async () => {
  try {
    const response = await fetch('http://localhost:8000/api/public/custom-message')
    if (response.ok) {
      const data = await response.json()
      if (data.has_message && data.custom_message) {
        customMessage.value = data.custom_message
        console.log('[PublicDisplayPreview] Custom message loaded:', data.custom_message)
      } else {
        console.log('[PublicDisplayPreview] No custom message set, using default')
      }
    }
  } catch (error) {
    console.warn('[PublicDisplayPreview] Error loading custom message:', error)
    // Keep default message on error
  }
}

// Referencias para cleanup
let clockInterval: NodeJS.Timeout | null = null
let messageRefreshInterval: NodeJS.Timeout | null = null

// Expose loadCustomMessage function for parent component
defineExpose({
  loadCustomMessage
})

// Computed con EXACTAMENTE la misma lógica de ordenación que frontend-public
const displayShows = computed(() => {
  const showsArray = props.shows || []
  if (!showsArray.length) return []
  
  const now = new Date()
  const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Función parseTimeToDate (igual que frontend-public)
  const parseTimeToDate = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return null
    const [h, m] = timeStr.split(':').map(x => parseInt(x, 10))
    if (Number.isNaN(h) || Number.isNaN(m)) return null
    const d = new Date(baseDate)
    d.setHours(h, m, 0, 0)
    return d
  }
  
  // Función getStatusRank (igual que frontend-public)
  const getStatusRank = (show) => {
    const status = show?.current_pass?.status || show?.status || 'PROGRAMADO'
    // Priority: ABIERTO (0) > CERRADO (1) > PROGRAMADO (2) > CANCELADO (3)
    switch (status) {
      case 'ABIERTO': return 0
      case 'CERRADO': return 1
      case 'PROGRAMADO': return 2
      case 'CANCELADO': return 3
      default: return 4
    }
  }
  
  // Función sortKey - ACTUALIZADA: usar current_pass como backend
  const sortKey = (show) => {
    const tCurr = parseTimeToDate(show?.current_pass?.start_time)
    // CORREGIDO: Solo usar current_pass para ordenación (consistente con backend)
    const candidate = tCurr
    const rank = getStatusRank(show)
    if (!candidate) return { rank, past: 1, delta: Number.POSITIVE_INFINITY }
    const deltaMs = candidate - now
    return { rank, past: deltaMs < 0 ? 1 : 0, delta: Math.abs(deltaMs) }
  }
  
  // Ordenación exacta (igual que frontend-public)
  const sorted = [...showsArray].sort((a, b) => {
    const ka = sortKey(a), kb = sortKey(b)
    if (ka.rank !== kb.rank) return ka.rank - kb.rank
    if (ka.past !== kb.past) return ka.past - kb.past
    if (ka.delta !== kb.delta) return ka.delta - kb.delta
    const na = (a.show_name || a.name || ''), nb = (b.show_name || b.name || '')
    return na.localeCompare(nb)
  })
  
  // Máximo 5 shows (igual que CONFIG.MAX_SHOWS_DISPLAYED)
  return sorted.slice(0, 5)
})

// Ya no necesitamos funciones de carga - los datos vienen como props

// Funciones
const updateClock = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit'
  })
}

const updateLastUpdateTime = () => {
  const now = new Date()
  lastUpdateTime.value = now.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit'
  })
}

// Ya no necesitamos loadShows ni forceRefresh - los datos vienen como props

// Lifecycle
onMounted(() => {
  updateClock()
  clockInterval = setInterval(updateClock, 1000)
  updateLastUpdateTime()
  loadCustomMessage()
  
  // Auto-refresh custom message every 30 seconds (same as auto-refresh interval)
  messageRefreshInterval = setInterval(() => {
    console.log('[PublicDisplayPreview] Auto-refreshing custom message...')
    loadCustomMessage()
  }, 30000)
})

onUnmounted(() => {
  if (clockInterval) {
    clearInterval(clockInterval)
  }
  if (messageRefreshInterval) {
    clearInterval(messageRefreshInterval)
  }
})

// Ya no necesitamos watcher para demoMode - los datos vienen como props
</script>

<style>
/* Variables CSS globales - SIN scoped para que funcionen */
.public-display-preview {
  /* Colors states */
  --color-programado: transparent;
  --color-abierto: #53630b;
  --color-cerrado: transparent;
  --color-cancelado: transparent;

  /* Base colors */
  --color-background: #FFFFFF;
  --color-surface: #F9FAFB;
  --color-text-primary: #3e3d34;
  --color-text-secondary: #3e3d34;
  --color-text-shows: #6c4e30;
  --color-text-custom: #6c4e30;
  --color-border: #D1D5DB;
  --color-header-bg: #F3F4F6;
  --color-footer-bg: #E5E7EB;

  /* Dimension for layout - Header eliminado, más espacio para main */
  --main-height: 85vh;
  --footer-height: 15vh;

  /* Typography optimized for distance reading */
  --font-size-title: 3.5rem;
  --font-size-time: 3rem;
  --font-size-status: 2.5rem;
  --font-size-show: 2.2rem;
  --font-size-next: 2rem;
}

/* Reset and base styles */
.public-display-preview {
  font-family: 'Arial', sans-serif;
  background-image: url('/assets/images/background.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  color: white;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}


/* Mantener estilos de tabla que sí se usan */
.table-title-with-icon {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: flex-start;
}

.table-shows-icon {
  height: 40px;
  width: auto;
}

.table-title-with-icon span {
  font-size: 2rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-text-primary);
}

/* MAIN CONTENT - Ahora más grande sin header */
.main-content {
  background: transparent;
  height: var(--main-height);
  padding: 0;
  position: relative;
  overflow: hidden;
}

.shows-container {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.public-display-preview .shows-table {
  width: 100%;
  height: auto;
  max-height: 80%;
  border-collapse: collapse;
  background: transparent;
  table-layout: fixed;
  border: none;
}

.public-display-preview .shows-table thead {
  background: transparent;
  color: var(--color-text-primary);
  height: 80px;
}

.public-display-preview .shows-table th {
  padding: 1rem 1.5rem;
  font-size: 2rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  border: none;
  text-align: center;
  color: var(--color-text-primary);
}

.public-display-preview .shows-table th:last-child {
  border-right: none;
}

/* Columns with responsive widths */
.public-display-preview .col-show-combined { 
  width: 50%; 
  text-align: left; 
  min-width: 280px;
}

.public-display-preview .show-content {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding-left: 1rem;
}

.public-display-preview .show-content .show-name { 
  text-align: left !important;
  margin-left: 0;
  flex: 1;
  color: var(--color-text-shows);
}
.public-display-preview .col-time { 
  width: 14%; 
  text-align: center; 
  min-width: 12%;
  max-width: 16%;
}
.public-display-preview .col-status { 
  width: 20%; 
  text-align: center; 
  min-width: 18%;
  max-width: 24%;
}

/* Ajustar espaciado para que Hora y el reloj se vean como una línea */
.public-display-preview .shows-table th.col-status {
  text-align: left;
  padding-left: 0.2rem; /* Mover el reloj más a la izquierda */
}
.public-display-preview .col-next { 
  width: 13%; 
  text-align: center; 
  min-width: 11%;
  max-width: 15%;
}

/* Responsive design for different aspect ratios */
@media (aspect-ratio: 1/1) {
  .public-display-preview .col-number { width: 10%; }
  .public-display-preview .col-time { width: 15%; min-width: 13%; max-width: 17%; }
  .public-display-preview .col-status { width: 22%; min-width: 20%; max-width: 26%; }
  .public-display-preview .col-next { width: 14%; min-width: 12%; max-width: 16%; }
}

@media (aspect-ratio: 16/9) {
  .public-display-preview .col-number { width: 8%; }
  .public-display-preview .col-time { width: 13%; min-width: 11%; max-width: 15%; }
  .public-display-preview .col-status { width: 19%; min-width: 17%; max-width: 23%; }
  .public-display-preview .col-next { width: 12%; min-width: 10%; max-width: 14%; }
}

.public-display-preview .shows-table tbody tr {
  height: 100px;
  min-height: 80px;
  max-height: 120px;
  border: none;
  transition: all 0.3s ease;
  background: transparent;
}

.public-display-preview .shows-table tbody tr:hover {
  background-color: rgba(255,255,255,0.05);
}

.public-display-preview .shows-table td {
  padding: 1rem 1.5rem;
  text-align: center;
  vertical-align: middle;
  border: none;
  color: var(--color-text-primary);
}

.public-display-preview .shows-table td:last-child {
  border-right: none;
}

/* Show icon */
.public-display-preview .show-icon {
  width: 60px;
  height: 60px;
  object-fit: contain;
}

/* Column-specific styles */
.public-display-preview .show-number {
  font-size: var(--font-size-next);
  font-weight: 700;
  color: var(--color-text-secondary);
}

.public-display-preview .show-name {
  font-size: var(--font-size-show);
  font-weight: 600;
  text-align: left;
  color: var(--color-text-shows);
}

.public-display-preview .show-time {
  font-size: var(--font-size-time);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
  background-image: url('/assets/images/hour-box.png');
  background-size: 100% 100%;
  background-repeat: no-repeat;
  background-position: center;
  padding: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.public-display-preview .show-status {
  font-size: var(--font-size-status);
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-width: 0;
}

/* Estados visuales */
.public-display-preview .show-status[data-status="PROGRAMADO"] {
  background-color: var(--color-programado);
  color: var(--color-text-primary);
}

.public-display-preview .show-status[data-status="ABIERTO"] {
  background-color: var(--color-abierto);
  color: white;
}

.public-display-preview .show-status[data-status="CERRADO"] {
  background-color: var(--color-cerrado);
  color: var(--color-text-primary);
}

.public-display-preview .show-status[data-status="CANCELADO"] {
  background-color: var(--color-cancelado);
  color: var(--color-text-primary);
}

.public-display-preview .show-next {
  font-size: var(--font-size-time);
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  background-image: url('/assets/images/hour-box.png');
  background-size: 100% 100%;
  background-repeat: no-repeat;
  background-position: center;
  padding: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* Estados de carga/error/vacío */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  text-align: center;
  font-size: 2rem;
}

.retry-button {
  background: var(--color-cancelado);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1.5rem;
  margin-top: 1rem;
}

/* Alert mode styles */
.alert-mode {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);
  border-radius: 12px;
  text-align: center;
  color: white;
}

.alert-icon {
  font-size: 8rem;
  margin-bottom: 2rem;
}

.alert-message {
  font-size: 4rem;
  font-weight: 700;
  margin-bottom: 2rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  line-height: 1.2;
  margin: 0;
}

.alert-timestamp {
  font-size: 2rem;
  opacity: 0.9;
  margin: 0;
}

/* FOOTER - 15% */
.footer {
  height: var(--footer-height);
  background: transparent;
  border-top: none;
  color: var(--color-text-custom);
  display: flex;
  align-items: center;
  padding: 0 4rem;
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  text-align: center;
}

.custom-message {
  width: 100%;
}

.custom-text {
  font-size: 2.5rem;
  font-weight: 600;
  color: var(--color-text-custom);
  margin: 0;
  text-align: center;
}
</style>