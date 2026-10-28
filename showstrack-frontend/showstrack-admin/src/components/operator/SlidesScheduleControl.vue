<template>
  <div class="slides-schedule-control">
    <!-- Header de control -->
    <div class="control-header">
      <div class="header-main">
        <h3 class="control-title">Rotación de Pantallas y Diapositivas</h3>
        <p class="control-subtitle">
          Intercala el iframe de horarios y las imágenes, configura su tiempo y cambia el orden de reproducción.
        </p>
      </div>

      <div class="global-toggle">
        <label class="switch-label">
          <input 
            type="checkbox" 
            v-model="config.enabled" 
            class="switch-checkbox"
          />
          <span class="switch-slider"></span>
          <span class="switch-text">
            {{ config.enabled ? 'Rotación Activa' : 'Solo Horario Fijo' }}
          </span>
        </label>
      </div>
    </div>

    <!-- Spinner de carga -->
    <div v-if="isLoading" class="loading-state">
      <span class="spinner">⏳</span> Cargando configuración de diapositivas...
    </div>

    <div v-else class="control-body">
      <!-- Secuencia actual en vivo -->
      <div class="sequence-strip">
        <span class="sequence-label">🔄 Orden de reproducción:</span>
        <div class="sequence-tags">
          <span 
            v-for="(item, idx) in activeSequence" 
            :key="item.id || idx" 
            class="seq-tag"
            :class="{ 'seq-tag-schedule': item.type === 'schedule' }"
          >
            {{ idx + 1 }}. {{ item.title }} ({{ item.duration_seconds }}s)
          </span>
          <span v-if="activeSequence.length === 0" class="seq-empty">
            Ninguna diapositiva activa
          </span>
        </div>
      </div>

      <!-- Barra de herramientas para añadir iframe e intercalar -->
      <div class="list-toolbar">
        <button 
          type="button" 
          @click="addScheduleSlide" 
          class="btn-tool btn-add-schedule"
        >
          ➕ Añadir pase de Horario (Iframe)
        </button>
        <button 
          type="button" 
          @click="autoInterleave" 
          class="btn-tool btn-auto-interleave"
          title="Intercala automáticamente un pase de horario entre cada imagen"
        >
          ⚡ Intercalar Automático (Horario ➔ Imagen ➔ Horario...)
        </button>
      </div>

      <!-- Lista ordenada de diapositivas -->
      <div class="items-list">
        <div 
          v-for="(item, index) in config.items" 
          :key="item.id || index"
          class="item-card"
          :class="{ 
            'is-schedule': item.type === 'schedule',
            'is-disabled': !item.enabled 
          }"
        >
          <!-- Controles de Reordenación (Subir / Bajar) -->
          <div class="reorder-controls">
            <button 
              type="button" 
              class="btn-reorder" 
              :disabled="index === 0"
              @click="moveUp(index)"
              title="Mover arriba"
            >
              ▲
            </button>
            <span class="order-badge">#{{ index + 1 }}</span>
            <button 
              type="button" 
              class="btn-reorder" 
              :disabled="index === config.items.length - 1"
              @click="moveDown(index)"
              title="Mover abajo"
            >
              ▼
            </button>
          </div>

          <!-- Miniatura (Imagen o Icono Horario) -->
          <div class="item-visual">
            <div v-if="item.type === 'schedule'" class="schedule-visual">
              <span class="schedule-icon">🕒</span>
              <span class="schedule-tag">IFRAME</span>
            </div>
            <div v-else class="image-visual">
              <img :src="item.image_url" :alt="item.title" class="slide-thumbnail" />
            </div>
          </div>

          <!-- Contenido y configuración de la diapositiva -->
          <div class="item-details">
            <div class="item-header">
              <div class="item-title-row">
                <h4 class="item-title">{{ item.title }}</h4>
                <span v-if="item.type === 'schedule'" class="type-pill">Horario en vivo</span>
              </div>

              <div class="item-actions-header">
                <!-- Switch Activar/Desactivar -->
                <label class="inline-toggle">
                  <input type="checkbox" v-model="item.enabled" />
                  <span :class="item.enabled ? 'text-green' : 'text-gray'">
                    {{ item.enabled ? 'Activada' : 'Pausada' }}
                  </span>
                </label>

                <!-- Botón eliminar (para pases de horario adicionales o cualquier pase) -->
                <button 
                  v-if="item.type === 'schedule' && config.items.length > 1"
                  type="button"
                  class="btn-delete-item"
                  @click="removeItem(index)"
                  title="Eliminar este pase de horario"
                >
                  ✕
                </button>
              </div>
            </div>

            <div class="item-fields-grid">
              <!-- Duración en segundos -->
              <div class="field-item">
                <label class="field-label">Tiempo en pantalla:</label>
                <div class="input-with-unit">
                  <input 
                    type="number" 
                    v-model.number="item.duration_seconds" 
                    min="5" 
                    max="300"
                    class="number-input"
                  />
                  <span class="unit">segundos</span>
                </div>
              </div>

              <!-- Horario programado (para diapositivas de imagen) -->
              <div v-if="item.type !== 'schedule'" class="field-item schedule-timing">
                <label class="field-label">Programación horaria:</label>
                <div class="timing-options">
                  <label class="radio-label">
                    <input 
                      type="radio" 
                      :name="'mode-' + item.id" 
                      :value="true" 
                      v-model="item.all_day" 
                    />
                    <span>Todo el día</span>
                  </label>
                  <label class="radio-label">
                    <input 
                      type="radio" 
                      :name="'mode-' + item.id" 
                      :value="false" 
                      v-model="item.all_day" 
                    />
                    <span>Horario específico</span>
                  </label>
                </div>

                <!-- Selector de rango horario si no es todo el día -->
                <div v-if="!item.all_day" class="time-range-inputs">
                  <div class="time-field">
                    <span class="time-label">Desde:</span>
                    <input 
                      type="time" 
                      v-model="item.start_time" 
                      class="time-input"
                    />
                  </div>
                  <span class="time-separator">hasta</span>
                  <div class="time-field">
                    <span class="time-label">Hasta:</span>
                    <input 
                      type="time" 
                      v-model="item.end_time" 
                      class="time-input"
                    />
                  </div>
                </div>
              </div>

              <!-- Días específicos de emisión (para diapositivas de imagen) -->
              <div v-if="item.type !== 'schedule'" class="field-item schedule-days">
                <label class="field-label">Días de emisión:</label>
                <div class="timing-options">
                  <label class="radio-label">
                    <input 
                      type="radio" 
                      :name="'days-mode-' + item.id" 
                      value="all" 
                      v-model="item.days_mode" 
                    />
                    <span>Todos los días</span>
                  </label>
                  <label class="radio-label">
                    <input 
                      type="radio" 
                      :name="'days-mode-' + item.id" 
                      value="weekdays" 
                      v-model="item.days_mode" 
                    />
                    <span>Días de semana</span>
                  </label>
                  <label class="radio-label">
                    <input 
                      type="radio" 
                      :name="'days-mode-' + item.id" 
                      value="dates" 
                      v-model="item.days_mode" 
                    />
                    <span>Fechas</span>
                  </label>
                </div>

                <!-- Selector de días de la semana (Lun, Mar, Mié, Jue, Vie, Sáb, Dom) -->
                <div v-if="item.days_mode === 'weekdays'" class="weekdays-selector">
                  <button
                    v-for="day in WEEKDAYS"
                    :key="day.value"
                    type="button"
                    class="day-chip"
                    :class="{ selected: isDayActive(item, day.value) }"
                    @click="toggleDay(item, day.value)"
                  >
                    {{ day.label }}
                  </button>
                </div>

                <!-- Selector de rango de fechas -->
                <div v-if="item.days_mode === 'dates'" class="time-range-inputs">
                  <div class="time-field">
                    <span class="time-label">Desde:</span>
                    <input 
                      type="date" 
                      v-model="item.start_date" 
                      class="date-input"
                    />
                  </div>
                  <span class="time-separator">hasta</span>
                  <div class="time-field">
                    <span class="time-label">Hasta:</span>
                    <input 
                      type="date" 
                      v-model="item.end_date" 
                      class="date-input"
                    />
                  </div>
                </div>
              </div>

              <div v-else class="field-item schedule-timing">
                <label class="field-label">Información:</label>
                <p class="schedule-note">
                  El iframe se actualiza en segundo plano y muestra los estados de los espectáculos en tiempo real.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Barra de acciones inferiores -->
      <div class="control-actions">
        <a 
          href="http://localhost:8080" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="btn-preview-link"
        >
          👁️ Ver Pantalla Pública (Puerto 8080)
        </a>

        <button 
          @click="saveConfiguration" 
          :disabled="isSaving" 
          class="btn-save"
        >
          <span v-if="isSaving">💾 Guardando...</span>
          <span v-else>💾 Guardar Programación y Orden</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotifications } from '@/composables'
import { useAuthStore } from '@/stores/auth'
import { getApiBaseUrl } from '@/utils/api'

export interface RotationItem {
  id: string
  type: 'schedule' | 'image'
  title: string
  image_url?: string
  duration_seconds: number
  enabled: boolean
  all_day?: boolean
  start_time?: string
  end_time?: string
  days_mode?: 'all' | 'weekdays' | 'dates'
  active_days?: number[] // 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb, 0=Dom
  start_date?: string
  end_date?: string
}

export interface SlidesConfig {
  enabled: boolean
  items: RotationItem[]
  schedule_slide?: {
    title: string
    duration_seconds: number
    enabled: boolean
  }
  slides?: RotationItem[]
}

const WEEKDAYS = [
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mié', value: 3 },
  { label: 'Jue', value: 4 },
  { label: 'Vie', value: 5 },
  { label: 'Sáb', value: 6 },
  { label: 'Dom', value: 0 }
]

const isDayActive = (item: RotationItem, dayValue: number): boolean => {
  if (!Array.isArray(item.active_days)) return true
  return item.active_days.includes(dayValue)
}

const toggleDay = (item: RotationItem, dayValue: number) => {
  if (!Array.isArray(item.active_days)) {
    item.active_days = [1, 2, 3, 4, 5, 6, 0]
  }
  const idx = item.active_days.indexOf(dayValue)
  if (idx > -1) {
    if (item.active_days.length > 1) {
      item.active_days.splice(idx, 1)
    }
  } else {
    item.active_days.push(dayValue)
    item.active_days.sort((a, b) => {
      const orderA = a === 0 ? 7 : a
      const orderB = b === 0 ? 7 : b
      return orderA - orderB
    })
  }
}

const { showSuccessToast, showErrorToast } = useNotifications()
const authStore = useAuthStore()

const isLoading = ref(true)
const isSaving = ref(false)

const config = ref<SlidesConfig>({
  enabled: true,
  items: [
    {
      id: 'schedule',
      type: 'schedule',
      title: 'Horarios de Espectáculos (Iframe)',
      duration_seconds: 30,
      enabled: true,
      all_day: true
    },
    {
      id: 'sueno_2000',
      type: 'image',
      title: 'El Sueño de Toledo - 20:00H',
      image_url: '/assets/images/slides/sueno-toledo-2000.jpg',
      duration_seconds: 15,
      enabled: true,
      all_day: false,
      start_time: '10:00',
      end_time: '20:00'
    },
    {
      id: 'sueno_2230',
      type: 'image',
      title: 'El Sueño de Toledo - 22:30H',
      image_url: '/assets/images/slides/sueno-toledo-2230.jpg',
      duration_seconds: 15,
      enabled: true,
      all_day: false,
      start_time: '18:00',
      end_time: '22:30'
    },
    {
      id: 'musica_directo',
      type: 'image',
      title: 'Música en Directo',
      image_url: '/assets/images/slides/musica-en-directo.jpg',
      duration_seconds: 15,
      enabled: true,
      all_day: true,
      start_time: '10:00',
      end_time: '23:00'
    }
  ]
})

// Secuencia activa para el indicador visual superior
const activeSequence = computed(() => {
  if (!config.value.items) return []
  return config.value.items.filter(item => item.enabled)
})

// Mover elemento hacia arriba en la lista
const moveUp = (index: number) => {
  if (index <= 0) return
  const items = [...config.value.items]
  const temp = items[index]
  items[index] = items[index - 1]
  items[index - 1] = temp
  config.value.items = items
}

// Mover elemento hacia abajo en la lista
const moveDown = (index: number) => {
  if (index >= config.value.items.length - 1) return
  const items = [...config.value.items]
  const temp = items[index]
  items[index] = items[index + 1]
  items[index + 1] = temp
  config.value.items = items
}

// Añadir un nuevo pase del Iframe de Horarios a la lista
const addScheduleSlide = () => {
  const newId = `schedule_${Date.now()}`
  config.value.items.push({
    id: newId,
    type: 'schedule',
    title: 'Horarios de Espectáculos (Iframe)',
    duration_seconds: 30,
    enabled: true,
    all_day: true
  })
  showSuccessToast('➕ Nuevo pase de Horarios añadido a la rotación')
}

// Intercalar automáticamente el iframe de horario entre cada imagen
const autoInterleave = () => {
  const images = config.value.items.filter(i => i.type !== 'schedule')
  if (images.length === 0) {
    showErrorToast('No hay imágenes para intercalar')
    return
  }

  const existingSchedule = config.value.items.find(i => i.type === 'schedule')
  const defaultDuration = existingSchedule?.duration_seconds || 30

  const interleaved: RotationItem[] = []
  images.forEach((img, idx) => {
    // Añadir pase de horario antes de cada imagen
    interleaved.push({
      id: `schedule_${Date.now()}_${idx}`,
      type: 'schedule',
      title: 'Horarios de Espectáculos (Iframe)',
      duration_seconds: defaultDuration,
      enabled: true,
      all_day: true
    })
    interleaved.push(img)
  })

  config.value.items = interleaved
  showSuccessToast('⚡ Secuencia intercalada: Horario ➔ Imagen ➔ Horario ➔ Imagen...')
}

// Eliminar un elemento de la rotación
const removeItem = (index: number) => {
  const item = config.value.items[index]
  config.value.items.splice(index, 1)
  showSuccessToast(`Eliminado: ${item.title}`)
}

const normalizeConfig = (raw: any): SlidesConfig => {
  let items: RotationItem[] = []

  if (Array.isArray(raw?.items) && raw.items.length > 0) {
    items = raw.items.map((item: any) => ({
      ...item,
      days_mode: item.days_mode || 'all',
      active_days: Array.isArray(item.active_days) ? item.active_days : [1, 2, 3, 4, 5, 6, 0],
      start_date: item.start_date || '',
      end_date: item.end_date || ''
    }))
  } else {
    // Si viene en formato antiguo { schedule_slide, slides }
    const scheduleItem: RotationItem = {
      id: 'schedule_1',
      type: 'schedule',
      title: raw?.schedule_slide?.title || 'Horarios de Espectáculos (Iframe)',
      duration_seconds: raw?.schedule_slide?.duration_seconds || 30,
      enabled: raw?.schedule_slide?.enabled !== false,
      all_day: true,
      days_mode: 'all',
      active_days: [1, 2, 3, 4, 5, 6, 0]
    }

    const imageItems: RotationItem[] = Array.isArray(raw?.slides)
      ? raw.slides.map((s: any) => ({
          ...s,
          type: 'image',
          days_mode: s.days_mode || 'all',
          active_days: Array.isArray(s.active_days) ? s.active_days : [1, 2, 3, 4, 5, 6, 0],
          start_date: s.start_date || '',
          end_date: s.end_date || ''
        }))
      : []

    items = [scheduleItem, ...imageItems]
  }

  return {
    enabled: raw?.enabled !== false,
    items
  }
}

const loadConfiguration = async () => {
  isLoading.value = true
  try {
    const token = authStore.tokens?.accessToken
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${getApiBaseUrl()}/api/admin/config/slides`, {
      method: 'GET',
      headers
    })

    if (response.ok) {
      const result = await response.json()
      if (result.success && result.data) {
        config.value = normalizeConfig(result.data)
        return
      }
    }

    // Fallback a endpoint público
    const pubResp = await fetch(`${getApiBaseUrl()}/api/public/slides-config`)
    if (pubResp.ok) {
      const pubData = await pubResp.json()
      if (pubData.success && pubData.data) {
        config.value = normalizeConfig(pubData.data)
      }
    }
  } catch (error: any) {
    console.error('[SlidesScheduleControl] Error cargando configuración:', error)
  } finally {
    isLoading.value = false
  }
}

const saveConfiguration = async () => {
  isSaving.value = true
  try {
    const token = authStore.tokens?.accessToken
    if (!token) {
      throw new Error('No se ha encontrado sesión activa de autenticación')
    }

    // Sincronizar también schedule_slide y slides para compatibilidad
    const schedule = config.value.items.find(i => i.type === 'schedule')
    const images = config.value.items.filter(i => i.type !== 'schedule')

    const payload = {
      enabled: config.value.enabled,
      items: config.value.items,
      schedule_slide: schedule ? {
        title: schedule.title,
        duration_seconds: schedule.duration_seconds,
        enabled: schedule.enabled
      } : {
        title: 'Horarios de Espectáculos',
        duration_seconds: 30,
        enabled: true
      },
      slides: images
    }

    const response = await fetch(`${getApiBaseUrl()}/api/admin/config/slides`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.detail || 'Error al guardar la configuración')
    }

    showSuccessToast('✅ Programación y orden de diapositivas guardados')
  } catch (error: any) {
    console.error('[SlidesScheduleControl] Error guardando configuración:', error)
    showErrorToast(error.message || 'Error al guardar configuración de diapositivas')
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  loadConfiguration()
})
</script>

<style scoped>
.slides-schedule-control {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1rem;
  background-color: #f8fafc;
  height: 100%;
  overflow-y: auto;
}

.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.control-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.control-subtitle {
  font-size: 0.8125rem;
  color: #64748b;
  margin: 0.25rem 0 0 0;
}

.switch-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
}

.switch-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  accent-color: #2563eb;
  cursor: pointer;
}

.switch-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
}

/* Secuencia strip */
.sequence-strip {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  overflow-x: auto;
}

.sequence-label {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #475569;
  white-space: nowrap;
}

.sequence-tags {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.seq-tag {
  font-size: 0.75rem;
  font-weight: 600;
  background: #f1f5f9;
  color: #334155;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  white-space: nowrap;
  border: 1px solid #cbd5e1;
}

.seq-tag-schedule {
  background: #e0f2fe;
  color: #0369a1;
  border-color: #bae6fd;
}

.seq-empty {
  font-size: 0.75rem;
  color: #94a3b8;
  font-style: italic;
}

/* Toolbar de acciones */
.list-toolbar {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-tool {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.btn-add-schedule {
  background-color: #f0fdf4;
  color: #15803d;
  border-color: #bbf7d0;
}

.btn-add-schedule:hover {
  background-color: #dcfce7;
  border-color: #86efac;
}

.btn-auto-interleave {
  background-color: #eff6ff;
  color: #1d4ed8;
  border-color: #bfdbfe;
}

.btn-auto-interleave:hover {
  background-color: #dbeafe;
  border-color: #93c5fd;
}

/* Acciones en header de item */
.item-actions-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-delete-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  background-color: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fca5a5;
  font-size: 0.6875rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-delete-item:hover {
  background-color: #ef4444;
  color: white;
  border-color: #dc2626;
}

/* Lista de diapositivas */
.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.item-card {
  display: flex;
  align-items: stretch;
  gap: 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.875rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.item-card.is-schedule {
  border-left: 4px solid #0284c7;
}

.item-card.is-disabled {
  opacity: 0.55;
  background: #f8fafc;
}

/* Controles de Reordenación */
.reorder-controls {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.25rem;
  width: 2.25rem;
  flex-shrink: 0;
}

.btn-reorder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.875rem;
  height: 1.875rem;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.75rem;
  color: #334155;
  transition: all 0.15s;
}

.btn-reorder:hover:not(:disabled) {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.btn-reorder:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.order-badge {
  font-size: 0.75rem;
  font-weight: 800;
  color: #1e293b;
}

/* Miniatura */
.item-visual {
  width: 140px;
  height: 80px;
  border-radius: 0.375rem;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid #cbd5e1;
  background: #000;
}

.schedule-visual {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0369a1, #0f172a);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  gap: 0.25rem;
}

.schedule-icon {
  font-size: 1.5rem;
}

.schedule-tag {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.image-visual {
  width: 100%;
  height: 100%;
}

.slide-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Detalles */
.item-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  justify-content: center;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.item-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.type-pill {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  background-color: #dbeafe;
  color: #1e40af;
}

.inline-toggle {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.inline-toggle input {
  accent-color: #16a34a;
  cursor: pointer;
}

.text-green {
  color: #16a34a;
}

.text-gray {
  color: #94a3b8;
}

.item-fields-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  align-items: center;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-label {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.number-input {
  width: 4.5rem;
  padding: 0.3125rem 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
}

.unit {
  font-size: 0.8125rem;
  color: #64748b;
}

.schedule-timing {
  flex: 1;
  min-width: 220px;
}

.timing-options {
  display: flex;
  gap: 0.75rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8125rem;
  color: #334155;
  cursor: pointer;
}

.time-range-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.375rem;
  background: #f1f5f9;
  padding: 0.3125rem 0.5rem;
  border-radius: 0.375rem;
}

.time-field {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.time-label {
  font-size: 0.75rem;
  color: #64748b;
}

.time-input {
  border: 1px solid #cbd5e1;
  border-radius: 0.25rem;
  padding: 0.15rem 0.35rem;
  font-size: 0.8125rem;
  background: white;
}

.time-separator {
  font-size: 0.75rem;
  color: #94a3b8;
}

.schedule-days {
  flex: 1;
  min-width: 260px;
}

.weekdays-selector {
  display: flex;
  gap: 0.375rem;
  margin-top: 0.375rem;
  flex-wrap: wrap;
}

.day-chip {
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid #cbd5e1;
  background: white;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.day-chip:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.day-chip.selected {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.25);
}

.date-input {
  border: 1px solid #cbd5e1;
  border-radius: 0.25rem;
  padding: 0.15rem 0.35rem;
  font-size: 0.8125rem;
  background: white;
}

.schedule-note {
  font-size: 0.75rem;
  color: #64748b;
  margin: 0;
  line-height: 1.3;
}

.control-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  margin-top: 0.5rem;
}

.btn-preview-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #2563eb;
  text-decoration: none;
  padding: 0.5rem 0.875rem;
  border: 1px solid #bfdbfe;
  border-radius: 0.375rem;
  background: #eff6ff;
  transition: background 0.2s;
}

.btn-preview-link:hover {
  background: #dbeafe;
}

.btn-save {
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: white;
  background: #2563eb;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.2);
  transition: background 0.2s;
}

.btn-save:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-state {
  padding: 2rem;
  text-align: center;
  color: #64748b;
  font-size: 0.9375rem;
}
</style>
