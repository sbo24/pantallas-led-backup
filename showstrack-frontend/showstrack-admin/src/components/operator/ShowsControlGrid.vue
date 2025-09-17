<template>
  <div class="controls-grid">
    <!-- Loading state -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Cargando shows...</p>
    </div>
    
    <!-- Error state -->
    <div v-else-if="hasError" class="error-state">
      <p>Error al cargar shows</p>
      <button @click="loadShows" class="retry-button">
        🔄 Reintentar
      </button>
    </div>
    
    <!-- Shows grid -->
    <div v-else-if="visibleShows.length > 0" class="shows-list">
      <div 
        v-for="show in visibleShows" 
        :key="show.id"
        class="show-control-card"
        :class="{ 'has-override': show.hasOverride }"
      >
        <!-- Header del show -->
        <div class="show-header">
          <div class="show-info">
            <img 
              v-if="show.selected_icon_filename"
              :src="`/assets/images/show-icons/${show.selected_icon_filename}`"
              :alt="show.name"
              class="show-icon"
            />
            <div 
              v-else 
              class="show-number-fallback"
            >
              {{ show.id }}
            </div>
            <div class="show-details">
              <h3 class="show-name">{{ show.name }}</h3>
              <p class="show-time">
                {{ show.current_pass?.start_time || '--:--' }}
                <span v-if="show.next_pass?.start_time" class="next-time">
                  → {{ show.next_pass.start_time }}
                </span>
              </p>
            </div>
          </div>
          
          <div class="show-status">
            <span 
              class="status-badge" 
              :class="getStatusClass(show.current_pass?.status || 'PROGRAMADO')"
            >
              {{ getStatusLabel(show.current_pass?.status || 'PROGRAMADO') }}
            </span>
          </div>
        </div>
        
        <!-- Lead time info -->
        <div class="lead-time-info">
          <span class="lead-time-label">Lead time: </span>
          <span class="lead-time-value">
            {{ show.custom_lead_time_access_minutes || 30 }}min
          </span>
        </div>
        
        <!-- Override indicator -->
        <div v-if="show.hasOverride" class="override-indicator">
          ⚡ Override activo: {{ show.overrideReason }}
        </div>
        
        <!-- Control buttons -->
        <div class="control-buttons">
          <template v-if="!show.hasOverride">
            <button 
              @click="openOverrideModal(show, 'CERRADO')"
              class="control-btn close-btn"
              :disabled="show.current_pass?.status === 'CERRADO'"
            >
              🔴 Cerrar
            </button>
            
            <button 
              @click="openOverrideModal(show, 'CANCELADO')"
              class="control-btn cancel-btn"
              :disabled="show.current_pass?.status === 'CANCELADO'"
            >
              ⚠️ Cancelar
            </button>
          </template>
          
          <template v-else>
            <button 
              @click="revertOverride(show)"
              class="control-btn revert-btn"
            >
              🔄 Revertir
            </button>
          </template>
        </div>
      </div>
    </div>
    
    <!-- Empty state -->
    <div v-else class="empty-state">
      <p>No hay shows disponibles</p>
    </div>
    
    <!-- Override Modal -->
    <OverrideModal
      :show="showOverrideModal"
      :selected-event="selectedEventForModal"
      :override-status="pendingOverride?.status || 'CERRADO'"
      @close="closeOverrideModal"
      @confirm="confirmOverride"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useNotifications } from '@/composables'
import OverrideModal from '@/components/OverrideModal.vue'
import * as eventsService from '@/services/eventsService'

// Interfaces
interface Show {
  id: number
  name: string
  selected_icon_filename?: string
  current_pass?: {
    start_time: string
    status: string
    event_id?: number
  }
  next_pass?: {
    start_time: string
  }
  custom_lead_time_access_minutes?: number
  hasOverride?: boolean
  overrideReason?: string
}

interface OverrideData {
  status: string
}

// Props
const props = defineProps<{
  demoMode?: boolean
  shows?: any[]
  isLoading?: boolean
  error?: string
}>()

// Emits
const emit = defineEmits<{
  overrideApplied: [data: { showId: number; status: string; reason: string }]
}>()

// Estado reactivo (solo para el modal)
// Los shows ahora vienen como prop desde OperatorView
const isLoading = computed(() => props.isLoading || false)
const hasError = computed(() => !!props.error)

// Computed para filtrar shows visibles solo en vista operador
const visibleShows = computed(() => {
  const showsArray = props.shows || []
  
  // En modo demo, mostrar todos los shows del demo
  if (props.demoMode) {
    return showsArray
  }
  
  // En modo real, los datos de la API pública ya vienen filtrados (solo visibles)
  // pero agregamos el filtro por seguridad
  return showsArray.filter(show => show.is_visible !== false)
})
const showOverrideModal = ref(false)
const selectedShow = ref<Show | null>(null)
const pendingOverride = ref<OverrideData | null>(null)

// Computed para crear un evento mock para el modal
const selectedEventForModal = computed(() => {
  if (!selectedShow.value) return null
  
  return {
    show: { name: selectedShow.value.name },
    start_time: selectedShow.value.current_pass?.start_time || '--:--',
    calculated_status: selectedShow.value.current_pass?.status || 'PROGRAMADO'
  }
})

// Composables
const { showSuccessToast, showErrorToast } = useNotifications()

// Función auxiliar para encontrar el event ID del current pass de un show
// NOTA: Deshabilitada porque el endpoint /api/public/events no existe (404)
// TODO: Implementar cuando tengamos el endpoint correcto
const findCurrentEventId = async (show: Show): Promise<string | null> => {
  console.warn('findCurrentEventId deshabilitada - endpoint /api/public/events no existe')
  return null
}

// Métodos - Ya no necesitamos cargar datos, vienen como props

const openOverrideModal = (show: Show, status: string) => {
  selectedShow.value = show
  pendingOverride.value = { status }
  showOverrideModal.value = true
}

const closeOverrideModal = () => {
  showOverrideModal.value = false
  selectedShow.value = null
  pendingOverride.value = null
}

const confirmOverride = async (reason: string) => {
  if (!selectedShow.value || !pendingOverride.value || !reason.trim()) return
  
  if (reason.length < 10) {
    showErrorToast('La razón debe tener al menos 10 caracteres')
    return
  }
  
  try {
    console.log('[ShowsControlGrid] Aplicando override via API real:', {
      show: selectedShow.value.name,
      showId: selectedShow.value.id,
      eventId: selectedShow.value.current_pass?.event_id,
      currentStatus: selectedShow.value.current_pass?.status,
      newStatus: pendingOverride.value.status,
      reason
    })
    
    // Verificar que tenemos event_id disponible
    const eventId = selectedShow.value.current_pass?.event_id
    if (!eventId) {
      showErrorToast('No se puede aplicar override: evento no disponible para overrides')
      return
    }
    
    // USAR API REAL - mismo endpoint que EventsView
    await eventsService.createOverride(
      eventId.toString(),
      pendingOverride.value.status,
      reason
    )
    
    // Guardar datos antes de cerrar modal (para evitar null reference)
    const showData = {
      showId: selectedShow.value.id,
      status: pendingOverride.value.status,
      reason: reason
    }
    
    showSuccessToast(`Override ${pendingOverride.value.status} aplicado correctamente`)
    closeOverrideModal()
    
    // Emitir evento para que OperatorView recargue los datos
    emit('overrideApplied', showData)
    
  } catch (error: any) {
    console.error('Error applying override:', error)
    if (error.message?.includes('duplicate key')) {
      showErrorToast('Error de sincronización de base de datos. Contacte al administrador.')
    } else {
      showErrorToast(`Error al aplicar override: ${error.message || 'Error desconocido'}`)
    }
  }
}

const revertOverride = async (show: Show) => {
  try {
    console.log('[ShowsControlGrid] Revirtiendo override para show:', show.id)
    
    // NUEVA LÓGICA: Solo emitir evento, el estado se actualiza en OperatorView
    emit('overrideApplied', {
      showId: show.id,
      status: 'REVERTIDO',
      reason: 'Override manual eliminado'
    })
    
    showSuccessToast(`Override revertido: ${show.name}`)
    
    // TODO: Implementar llamada real a la API cuando tengamos el endpoint correcto
    
  } catch (error: any) {
    console.error('Error reverting override:', error)
    showErrorToast(`Error al revertir override: ${error.message || 'Error desconocido'}`)
  }
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    'PROGRAMADO': 'status-programado',
    'ABIERTO': 'status-abierto', 
    'CERRADO': 'status-cerrado',
    'CANCELADO': 'status-cancelado'
  }
  return classes[status] || 'status-programado'
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'PROGRAMADO': 'Programado',
    'ABIERTO': 'Abierto',
    'CERRADO': 'Cerrado', 
    'CANCELADO': 'Cancelado'
  }
  return labels[status] || status
}

// Ya no necesitamos watchers ni onMounted - los datos vienen como props
</script>

<style scoped>
.controls-grid {
  height: 100%;
  overflow-y: auto;
  padding: 0;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #6b7280;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.shows-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.5rem;
  max-height: 100%;
  overflow-y: auto;
}

.show-control-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  transition: all 0.2s;
}

.show-control-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.show-control-card.has-override {
  border-color: #8b5cf6;
  background-color: #faf5ff;
}

.show-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.show-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.show-icon {
  width: 2rem;
  height: auto;
  max-height: 2.5rem;
  object-fit: contain;
}

.show-number-fallback {
  width: 2rem;
  height: 2rem;
  background-color: #ef4444;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.show-name {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.show-time {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.next-time {
  color: #9ca3af;
  font-size: 0.75rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.status-programado {
  background-color: #f3f4f6;
  color: #374151;
}

.status-abierto {
  background-color: #d1fae5;
  color: #065f46;
}

.status-cerrado {
  background-color: #fee2e2;
  color: #991b1b;
}

.status-cancelado {
  background-color: #fef3c7;
  color: #92400e;
}

.lead-time-info {
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.75rem;
}

.lead-time-label {
  font-weight: 500;
}

.lead-time-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.override-indicator {
  background-color: #ede9fe;
  border: 1px solid #c4b5fd;
  border-radius: 0.375rem;
  padding: 0.5rem;
  font-size: 0.75rem;
  color: #5b21b6;
  margin-bottom: 0.75rem;
}

.control-buttons {
  display: flex;
  gap: 0.5rem;
}

.control-btn {
  flex: 1;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.close-btn {
  background-color: #fee2e2;
  color: #991b1b;
}

.close-btn:hover:not(:disabled) {
  background-color: #fecaca;
}

.cancel-btn {
  background-color: #fef3c7;
  color: #92400e;
}

.cancel-btn:hover:not(:disabled) {
  background-color: #fde68a;
}

.revert-btn {
  background-color: #dbeafe;
  color: #1e40af;
}

.revert-btn:hover {
  background-color: #bfdbfe;
}

.retry-button {
  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
}

.retry-button:hover {
  background-color: #2563eb;
}

.modal-content {
  padding: 1rem 0;
}

.modal-description {
  margin-bottom: 1rem;
  color: #374151;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.reason-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  resize: vertical;
  font-family: inherit;
  font-size: 0.875rem;
}

.reason-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.modal-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  margin-left: 0.5rem;
}

.modal-btn.secondary {
  background-color: #f3f4f6;
  color: #374151;
}

.modal-btn.secondary:hover {
  background-color: #e5e7eb;
}

.modal-btn.primary {
  background-color: #3b82f6;
  color: white;
}

.modal-btn.primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.modal-btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>