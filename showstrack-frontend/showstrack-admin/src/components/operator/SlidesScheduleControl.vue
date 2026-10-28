<template>
  <div class="slides-schedule-control">
    <!-- Header de control -->
    <div class="control-header">
      <div class="header-main">
        <div class="title-with-pill">
          <h3 class="control-title">Rotación de Pantallas y Diapositivas</h3>
          <span class="badge-system">ShowsTrack LED</span>
        </div>
        <p class="control-subtitle">
          Programa cuándo y cuánto tiempo se muestra cada diapositiva (horarios en iframe e imágenes).
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
          <span class="switch-text" :class="config.enabled ? 'status-active' : 'status-paused'">
            {{ config.enabled ? 'Rotación Activa' : 'Rotación Pausada' }}
          </span>
        </label>
      </div>
    </div>

    <!-- Spinner de carga inicial -->
    <div v-if="isLoading" class="loading-state">
      <span class="spinner-icon">⏳</span>
      <p>Cargando configuración de diapositivas...</p>
    </div>

    <div v-else class="control-body">
      <!-- MODO GLOBAL DE EMISIÓN: INTERCALADO VS SOLO IFRAME -->
      <div class="interleave-mode-card">
        <div class="card-title-row">
          <div class="title-with-icon">
            <span class="card-icon">🔀</span>
            <div>
              <h4 class="card-heading">Planificación de Emisión: Intercalado vs Horario Fijo</h4>
              <p class="card-subheading">
                Configura qué días de la semana se intercalan las imágenes con los horarios y qué días la pantalla pública muestra <strong>únicamente el Horario (Iframe fijo)</strong>.
              </p>
            </div>
          </div>

          <!-- Indicador en vivo de estado para hoy -->
          <div 
            class="today-status-badge" 
            :class="isRotationActiveToday ? 'badge-interleaved' : 'badge-fixed-iframe'"
          >
            <span class="status-dot"></span>
            <span class="status-label">
              {{ isRotationActiveToday ? '🟢 HOY: Intercalado Activo (Horario + Imágenes)' : '🔒 HOY: Solo Horario Fijo (Iframe continuo)' }}
            </span>
          </div>
        </div>

        <!-- Opciones de Modo Principal -->
        <div class="mode-options-grid">
          <!-- Modo 1: Todos los días -->
          <label 
            class="mode-option-card" 
            :class="{ 'is-selected': config.rotation_days_mode === 'always' }"
          >
            <input 
              type="radio" 
              value="always" 
              v-model="config.rotation_days_mode" 
              class="mode-radio" 
            />
            <div class="mode-card-content">
              <div class="mode-card-header">
                <span class="mode-icon">⚡</span>
                <span class="mode-title">Intercalar Todos los Días</span>
              </div>
              <p class="mode-desc">
                La rotación alterna continuamente entre el horario en vivo y las diapositivas de imágenes durante toda la semana.
              </p>
            </div>
          </label>

          <!-- Modo 2: Días específicos -->
          <label 
            class="mode-option-card" 
            :class="{ 'is-selected': config.rotation_days_mode === 'specific_days' }"
          >
            <input 
              type="radio" 
              value="specific_days" 
              v-model="config.rotation_days_mode" 
              class="mode-radio" 
            />
            <div class="mode-card-content">
              <div class="mode-card-header">
                <span class="mode-icon">📅</span>
                <span class="mode-title">Días Específicos para Intercalar</span>
              </div>
              <p class="mode-desc">
                Activa el intercalado solo los días seleccionados (ej. fines de semana). En los demás días se muestra <strong>solo el horario (Iframe fijo)</strong>.
              </p>
            </div>
          </label>

          <!-- Modo 3: Solo Horario Fijo -->
          <label 
            class="mode-option-card" 
            :class="{ 'is-selected': config.rotation_days_mode === 'disabled' }"
          >
            <input 
              type="radio" 
              value="disabled" 
              v-model="config.rotation_days_mode" 
              class="mode-radio" 
            />
            <div class="mode-card-content">
              <div class="mode-card-header">
                <span class="mode-icon">🔒</span>
                <span class="mode-title">Solo Horario Fijo (Iframe Solo)</span>
              </div>
              <p class="mode-desc">
                Desactiva el intercalado por completo: la pantalla pública mantendrá siempre los horarios en vivo en pantalla completa sin emitir imágenes.
              </p>
            </div>
          </label>
        </div>

        <!-- Panel desplegable cuando se selecciona 'Días específicos' -->
        <div v-if="config.rotation_days_mode === 'specific_days'" class="specific-days-panel">
          <div class="specific-days-header">
            <span class="panel-section-title">📆 Elige qué días quieres ACTIVAR el intercalado con imágenes:</span>
            <div class="quick-preset-buttons">
              <button type="button" @click="setGlobalDaysPreset('weekend')" class="btn-preset">
                🎉 Fin de semana (Vie-Dom)
              </button>
              <button type="button" @click="setGlobalDaysPreset('weekdays')" class="btn-preset">
                💼 Laborables (Lun-Jue)
              </button>
              <button type="button" @click="setGlobalDaysPreset('all')" class="btn-preset">
                🌐 Todos los días
              </button>
            </div>
          </div>

          <!-- Botones toggle interactivos para cada día de la semana -->
          <div class="weekdays-chips-row">
            <button 
              v-for="day in WEEKDAYS" 
              :key="'global-day-' + day.value"
              type="button" 
              class="global-day-chip"
              :class="{ 
                'is-active': isGlobalDayActive(day.value),
                'is-today': isToday(day.value)
              }"
              @click="toggleGlobalDay(day.value)"
              :title="isGlobalDayActive(day.value) ? 'Clic para dejar solo iframe este día' : 'Clic para activar intercalado este día'"
            >
              <span class="day-chip-name">{{ day.label }}</span>
              <span class="day-chip-status">
                {{ isGlobalDayActive(day.value) ? '🔀 Intercala' : '🔒 Solo Iframe' }}
              </span>
              <span v-if="isToday(day.value)" class="day-today-indicator">HOY</span>
            </button>
          </div>

          <!-- Resumen explicativo de la distribución semanal -->
          <div class="days-summary-box">
            <div class="summary-line">
              <span class="summary-tag tag-interleaving">🔀 Días con intercalado (Horario + Imágenes):</span>
              <span class="summary-text">{{ activeDaysText }}</span>
            </div>
            <div class="summary-line">
              <span class="summary-tag tag-fixed-iframe">🔒 Días con SOLO HORARIO FIJO (Iframe):</span>
              <span class="summary-text">{{ inactiveDaysText }}</span>
            </div>
          </div>

          <!-- Restricción horaria opcional dentro de los días activos -->
          <div class="hours-restriction-row">
            <div class="hours-switch-title">
              <span class="clock-icon">⏰</span>
              <span>En los días de intercalado seleccionados:</span>
            </div>
            <div class="hours-options">
              <label class="radio-chip">
                <input 
                  type="radio" 
                  :value="true" 
                  v-model="config.rotation_all_day" 
                />
                <span>Intercalar todo el día</span>
              </label>
              <label class="radio-chip">
                <input 
                  type="radio" 
                  :value="false" 
                  v-model="config.rotation_all_day" 
                />
                <span>Solo en franja horaria</span>
              </label>
            </div>

            <div v-if="!config.rotation_all_day" class="time-inputs-container">
              <div class="time-field">
                <span class="time-label">Desde:</span>
                <input type="time" v-model="config.rotation_start_time" class="time-input" />
              </div>
              <div class="time-field">
                <span class="time-label">Hasta:</span>
                <input type="time" v-model="config.rotation_end_time" class="time-input" />
              </div>
              <span class="time-hint">Fuera de esta franja horaria, la pantalla mantendrá automáticamente solo el iframe fijo.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Secuencia en vivo y pipeline -->
      <div class="sequence-panel">
        <div class="sequence-header">
          <span class="sequence-title">🔄 Secuencia de Emisión en Vivo</span>
          <span class="sequence-counter" :class="{ 'counter-fixed': !isRotationActiveToday }">
            {{ isRotationActiveToday ? `${activeSequence.length} elemento(s) intercalado(s)` : '🔒 Solo Horario Fijo' }}
          </span>
        </div>

        <div v-if="!isRotationActiveToday" class="pipeline-fixed-banner">
          🔒 <strong>Modo Horario Fijo Activo:</strong> Hoy la pantalla pública mantiene el Horario (Iframe) de forma permanente sin rotar imágenes, según la programación establecida arriba.
        </div>

        <div class="sequence-pipeline">
          <template v-for="(item, idx) in activeSequence" :key="item.id || idx">
            <div 
              class="pipeline-node"
              :class="{
                'node-schedule': item.type === 'schedule',
                'node-image': item.type === 'image'
              }"
            >
              <span class="node-icon">{{ item.type === 'schedule' ? '🕒' : '🖼️' }}</span>
              <span class="node-title">{{ item.title }}</span>
              <span class="node-duration">{{ item.duration_seconds }}s</span>
            </div>
            <span v-if="idx < activeSequence.length - 1" class="pipeline-arrow">➔</span>
          </template>
          <div v-if="activeSequence.length === 0" class="pipeline-empty">
            ⚠️ No hay ninguna diapositiva activa para este momento. Solo se mostrará el horario fijo.
          </div>
        </div>
      </div>

      <!-- Barra de herramientas para añadir pases, subir imágenes e intercalar -->
      <div class="action-toolbar">
        <div class="toolbar-left">
          <!-- Botón Subir Imagen (Abre selector de archivos) -->
          <button 
            type="button" 
            @click="triggerFileUpload" 
            class="btn-action btn-upload"
            :disabled="isUploading"
          >
            <span v-if="isUploading">⏳ Subiendo...</span>
            <span v-else>📤 Subir Nueva Imagen</span>
          </button>
          <input 
            type="file" 
            ref="fileInputRef"
            accept="image/png, image/jpeg, image/webp" 
            @change="onFileSelected"
            style="display: none;" 
          />

          <!-- Botón Añadir pase Horario (Iframe) -->
          <button 
            type="button" 
            @click="addScheduleSlide" 
            class="btn-action btn-add-schedule"
          >
            ➕ Añadir pase de Horario (Iframe)
          </button>

          <!-- Botón Intercalar Automático -->
          <button 
            type="button" 
            @click="autoInterleave" 
            class="btn-action btn-interleave"
            title="Genera un patrón regular: Horario ➔ Imagen ➔ Horario ➔ Imagen..."
          >
            ⚡ Intercalar Automático
          </button>
        </div>

        <div class="toolbar-right">
          <span class="item-count-label">{{ config.items.length }} diapositiva(s) en lista</span>
        </div>
      </div>

      <!-- Lista ordenada de diapositivas -->
      <div class="items-list">
        <div 
          v-for="(item, index) in config.items" 
          :key="item.id || index"
          class="item-card"
          :class="{ 
            'card-schedule': item.type === 'schedule',
            'card-image': item.type === 'image',
            'card-disabled': !item.enabled 
          }"
        >
          <!-- Controles de Reordenación (Subir / Bajar) -->
          <div class="reorder-column">
            <button 
              type="button" 
              class="btn-reorder btn-up" 
              :disabled="index === 0"
              @click="moveUp(index)"
              title="Mover arriba"
            >
              ▲
            </button>
            <span class="order-number">#{{ index + 1 }}</span>
            <button 
              type="button" 
              class="btn-reorder btn-down" 
              :disabled="index === config.items.length - 1"
              @click="moveDown(index)"
              title="Mover abajo"
            >
              ▼
            </button>
          </div>

          <!-- Miniatura / Identificador visual -->
          <div class="item-visual-column">
            <div 
              v-if="item.type === 'schedule'" 
              class="schedule-visual-box"
              title="Iframe de Horarios en Vivo"
            >
              <span class="schedule-symbol">🕒</span>
              <span class="schedule-pill">IFRAME VIVO</span>
            </div>
            <div 
              v-else 
              class="image-visual-box"
              @click="openImagePreview(item)"
              title="Clic para ampliar imagen"
            >
              <img :src="item.image_url" :alt="item.title" class="thumbnail-img" />
              <div class="zoom-overlay">
                <span>🔍</span>
              </div>
            </div>
          </div>

          <!-- Contenido y configuración de la diapositiva -->
          <div class="item-main-column">
            <!-- Cabecera de la diapositiva -->
            <div class="item-card-header">
              <div class="title-editor">
                <span class="type-tag" :class="item.type === 'schedule' ? 'tag-schedule' : 'tag-image'">
                  {{ item.type === 'schedule' ? 'Horario Iframe' : 'Imagen' }}
                </span>
                <input 
                  type="text" 
                  v-model="item.title" 
                  class="title-input"
                  placeholder="Nombre de la diapositiva..."
                />
              </div>

              <div class="item-card-actions">
                <!-- Switch Activar / Pausar -->
                <label class="item-toggle-label">
                  <input type="checkbox" v-model="item.enabled" class="checkbox-status" />
                  <span class="status-indicator" :class="item.enabled ? 'is-active' : 'is-paused'">
                    {{ item.enabled ? 'Activa' : 'Pausada' }}
                  </span>
                </label>

                <!-- Botón Eliminar -->
                <button 
                  v-if="config.items.length > 1"
                  type="button"
                  class="btn-delete"
                  @click="removeItem(index)"
                  title="Eliminar esta diapositiva de la rotación"
                >
                  🗑️
                </button>
              </div>
            </div>

            <!-- Grilla de Ajustes de Tiempo, Horas y Días -->
            <div class="item-settings-grid">
              <!-- Duración en segundos -->
              <div class="setting-box duration-box">
                <label class="setting-label">⏱️ Tiempo Pantalla</label>
                <div class="input-unit-wrapper">
                  <input 
                    type="number" 
                    v-model.number="item.duration_seconds" 
                    min="5" 
                    max="300"
                    class="number-input"
                  />
                  <span class="unit-text">segundos</span>
                </div>
              </div>

              <!-- Programación Horaria (Disponible para Iframe e Imágenes) -->
              <div class="setting-box schedule-hours-box">
                <label class="setting-label">⏰ Horario de Emisión</label>
                <div class="radio-options-row">
                  <label class="radio-chip">
                    <input 
                      type="radio" 
                      :name="'mode-' + item.id" 
                      :value="true" 
                      v-model="item.all_day" 
                    />
                    <span>Todo el día</span>
                  </label>
                  <label class="radio-chip">
                    <input 
                      type="radio" 
                      :name="'mode-' + item.id" 
                      :value="false" 
                      v-model="item.all_day" 
                    />
                    <span>Horas específicas</span>
                  </label>
                </div>

                <!-- Rango Horario Desde / Hasta -->
                <div v-if="!item.all_day" class="time-range-group">
                  <div class="time-input-group">
                    <span class="time-prefix">Desde</span>
                    <input type="time" v-model="item.start_time" class="time-picker" />
                  </div>
                  <span class="time-divider">➔</span>
                  <div class="time-input-group">
                    <span class="time-prefix">Hasta</span>
                    <input type="time" v-model="item.end_time" class="time-picker" />
                  </div>
                </div>
              </div>

              <!-- Días específicos de emisión (Disponible para Iframe e Imágenes) -->
              <div class="setting-box schedule-days-box">
                <label class="setting-label">📅 Días de Emisión</label>
                <div class="radio-options-row">
                  <label class="radio-chip">
                    <input 
                      type="radio" 
                      :name="'days-mode-' + item.id" 
                      value="all" 
                      v-model="item.days_mode" 
                    />
                    <span>Todos los días</span>
                  </label>
                  <label class="radio-chip">
                    <input 
                      type="radio" 
                      :name="'days-mode-' + item.id" 
                      value="weekdays" 
                      v-model="item.days_mode" 
                    />
                    <span>Días de semana</span>
                  </label>
                  <label class="radio-chip">
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
                <div v-if="item.days_mode === 'weekdays'" class="weekdays-strip">
                  <button
                    v-for="day in WEEKDAYS"
                    :key="day.value"
                    type="button"
                    class="day-btn"
                    :class="{ selected: isDayActive(item, day.value) }"
                    @click="toggleDay(item, day.value)"
                  >
                    {{ day.label }}
                  </button>
                </div>

                <!-- Selector de rango de fechas -->
                <div v-if="item.days_mode === 'dates'" class="date-range-group">
                  <div class="date-input-group">
                    <span class="date-prefix">Desde</span>
                    <input type="date" v-model="item.start_date" class="date-picker" />
                  </div>
                  <span class="time-divider">➔</span>
                  <div class="date-input-group">
                    <span class="date-prefix">Hasta</span>
                    <input type="date" v-model="item.end_date" class="date-picker" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Barra de acciones inferiores fijas -->
      <div class="control-footer">
        <a 
          href="http://localhost:8080" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="btn-live-preview"
        >
          👁️ Ver Pantallas Públicas en Vivo (Puerto 8080)
        </a>

        <button 
          @click="saveConfiguration" 
          :disabled="isSaving" 
          class="btn-save-master"
        >
          <span v-if="isSaving">💾 Guardando cambios...</span>
          <span v-else>💾 Guardar Toda la Programación</span>
        </button>
      </div>
    </div>

    <!-- Modal de vista previa de imagen en grande -->
    <div v-if="previewModalOpen" class="modal-backdrop" @click="closeImagePreview">
      <div class="modal-card" @click.stop>
        <div class="modal-header">
          <h4 class="modal-title">{{ previewModalTitle }}</h4>
          <button type="button" class="btn-close-modal" @click="closeImagePreview">✕</button>
        </div>
        <div class="modal-body">
          <img :src="previewModalUrl" :alt="previewModalTitle" class="modal-img-full" />
        </div>
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
  all_day: boolean
  start_time?: string
  end_time?: string
  days_mode?: 'all' | 'weekdays' | 'dates'
  active_days?: number[] // 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb, 0=Dom
  start_date?: string
  end_date?: string
}

export interface SlidesConfig {
  enabled: boolean
  rotation_days_mode?: 'always' | 'specific_days' | 'disabled'
  rotation_active_days?: number[]
  rotation_all_day?: boolean
  rotation_start_time?: string
  rotation_end_time?: string
  items: RotationItem[]
  schedule_slide?: {
    title: string
    duration_seconds: number
    enabled: boolean
  }
  slides?: RotationItem[]
}

const { showSuccessToast, showErrorToast } = useNotifications()
const authStore = useAuthStore()

const isLoading = ref(true)
const isSaving = ref(false)
const isUploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Modal de previsualización
const previewModalOpen = ref(false)
const previewModalUrl = ref('')
const previewModalTitle = ref('')

const openImagePreview = (item: RotationItem) => {
  if (item.image_url) {
    previewModalUrl.value = item.image_url
    previewModalTitle.value = item.title
    previewModalOpen.value = true
  }
}

const closeImagePreview = () => {
  previewModalOpen.value = false
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

const dayNames: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  0: 'Domingo'
}

const isToday = (dayValue: number): boolean => {
  return new Date().getDay() === dayValue
}

const isGlobalDayActive = (dayValue: number): boolean => {
  if (!Array.isArray(config.value.rotation_active_days)) return true
  return config.value.rotation_active_days.includes(dayValue)
}

const toggleGlobalDay = (dayValue: number) => {
  if (!Array.isArray(config.value.rotation_active_days)) {
    config.value.rotation_active_days = [1, 2, 3, 4, 5, 6, 0]
  }
  const idx = config.value.rotation_active_days.indexOf(dayValue)
  if (idx > -1) {
    if (config.value.rotation_active_days.length > 1) {
      config.value.rotation_active_days.splice(idx, 1)
    }
  } else {
    config.value.rotation_active_days.push(dayValue)
    config.value.rotation_active_days.sort((a, b) => {
      const orderA = a === 0 ? 7 : a
      const orderB = b === 0 ? 7 : b
      return orderA - orderB
    })
  }
}

const setGlobalDaysPreset = (preset: 'weekend' | 'weekdays' | 'all') => {
  if (preset === 'weekend') {
    config.value.rotation_active_days = [5, 6, 0]
  } else if (preset === 'weekdays') {
    config.value.rotation_active_days = [1, 2, 3, 4]
  } else {
    config.value.rotation_active_days = [1, 2, 3, 4, 5, 6, 0]
  }
}

const activeDaysText = computed(() => {
  const days = config.value.rotation_active_days || []
  if (days.length === 0) return 'Ningún día'
  if (days.length === 7) return 'Todos los días (Lunes a Domingo)'
  const ordered = [...days].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
  return ordered.map(d => dayNames[d]).join(', ')
})

const inactiveDaysText = computed(() => {
  const days = config.value.rotation_active_days || []
  const allDays = [1, 2, 3, 4, 5, 6, 0]
  const inactive = allDays.filter(d => !days.includes(d))
  if (inactive.length === 0) return 'Ninguno (todos los días intercalan)'
  const ordered = [...inactive].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
  return ordered.map(d => dayNames[d]).join(', ')
})

const isRotationActiveToday = computed(() => {
  if (!config.value.enabled) return false
  if (config.value.rotation_days_mode === 'disabled') return false
  if (config.value.rotation_days_mode === 'always') return true

  if (config.value.rotation_days_mode === 'specific_days') {
    const today = new Date().getDay()
    const activeDays = config.value.rotation_active_days || [1, 2, 3, 4, 5, 6, 0]
    if (!activeDays.includes(today)) {
      return false
    }

    if (!config.value.rotation_all_day && config.value.rotation_start_time && config.value.rotation_end_time) {
      const now = new Date()
      const currentHours = String(now.getHours()).padStart(2, '0')
      const currentMinutes = String(now.getMinutes()).padStart(2, '0')
      const currentTime = `${currentHours}:${currentMinutes}`
      if (currentTime < config.value.rotation_start_time || currentTime > config.value.rotation_end_time) {
        return false
      }
    }
    return true
  }

  return true
})

const config = ref<SlidesConfig>({
  enabled: true,
  rotation_days_mode: 'always',
  rotation_active_days: [1, 2, 3, 4, 5, 6, 0],
  rotation_all_day: true,
  rotation_start_time: '18:00',
  rotation_end_time: '23:00',
  items: [
    {
      id: 'schedule_1',
      type: 'schedule',
      title: 'Horarios de Espectáculos (Iframe)',
      duration_seconds: 30,
      enabled: true,
      all_day: true,
      days_mode: 'all',
      active_days: [1, 2, 3, 4, 5, 6, 0]
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
      end_time: '20:00',
      days_mode: 'all',
      active_days: [1, 2, 3, 4, 5, 6, 0]
    },
    {
      id: 'schedule_2',
      type: 'schedule',
      title: 'Horarios de Espectáculos (Iframe)',
      duration_seconds: 30,
      enabled: true,
      all_day: true,
      days_mode: 'all',
      active_days: [1, 2, 3, 4, 5, 6, 0]
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
      end_time: '22:30',
      days_mode: 'all',
      active_days: [1, 2, 3, 4, 5, 6, 0]
    },
    {
      id: 'schedule_3',
      type: 'schedule',
      title: 'Horarios de Espectáculos (Iframe)',
      duration_seconds: 30,
      enabled: true,
      all_day: true,
      days_mode: 'all',
      active_days: [1, 2, 3, 4, 5, 6, 0]
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
      end_time: '23:00',
      days_mode: 'all',
      active_days: [1, 2, 3, 4, 5, 6, 0]
    }
  ]
})

// Secuencia activa en tiempo real
const activeSequence = computed(() => {
  if (!config.value.items) return []
  if (!isRotationActiveToday.value) {
    return [
      {
        id: 'fixed_schedule_today',
        type: 'schedule' as const,
        title: 'Horarios de Espectáculos (Iframe Solo)',
        duration_seconds: 30,
        enabled: true,
        all_day: true
      }
    ]
  }
  return config.value.items.filter(item => item.enabled)
})

// Mover arriba
const moveUp = (index: number) => {
  if (index <= 0) return
  const items = [...config.value.items]
  const temp = items[index]
  items[index] = items[index - 1]
  items[index - 1] = temp
  config.value.items = items
}

// Mover abajo
const moveDown = (index: number) => {
  if (index >= config.value.items.length - 1) return
  const items = [...config.value.items]
  const temp = items[index]
  items[index] = items[index + 1]
  items[index + 1] = temp
  config.value.items = items
}

// Añadir pase de horario
const addScheduleSlide = () => {
  const newId = `schedule_${Date.now()}`
  config.value.items.push({
    id: newId,
    type: 'schedule',
    title: 'Horarios de Espectáculos (Iframe)',
    duration_seconds: 30,
    enabled: true,
    all_day: true,
    days_mode: 'all',
    active_days: [1, 2, 3, 4, 5, 6, 0]
  })
  showSuccessToast('➕ Nuevo pase de Horarios añadido a la rotación')
}

// Disparar selector de archivos
const triggerFileUpload = () => {
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
    fileInputRef.value.click()
  }
}

// Al seleccionar archivo de imagen
const onFileSelected = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const file = target.files[0]
  const formData = new FormData()
  formData.append('file', file)

  isUploading.value = true
  try {
    const token = authStore.tokens?.accessToken
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${getApiBaseUrl()}/api/admin/config/slides/upload`, {
      method: 'POST',
      headers,
      body: formData
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.detail || 'Error al subir imagen')
    }

    const result = await response.json()
    if (result.success && result.image_url) {
      // Generar nombre descriptivo a partir del nombre del archivo
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]/g, ' ')
        .trim()
      const capitalized = cleanName.charAt(0).toUpperCase() + cleanName.slice(1)

      const newSlide: RotationItem = {
        id: `slide_${Date.now()}`,
        type: 'image',
        title: capitalized || 'Nueva Diapositiva',
        image_url: result.image_url,
        duration_seconds: 15,
        enabled: true,
        all_day: true,
        days_mode: 'all',
        active_days: [1, 2, 3, 4, 5, 6, 0]
      }

      config.value.items.push(newSlide)
      showSuccessToast(`✅ Imagen subida: ${capitalized}`)
    }
  } catch (error: any) {
    console.error('[SlidesScheduleControl] Error subiendo imagen:', error)
    showErrorToast(error.message || 'Error al subir imagen')
  } finally {
    isUploading.value = false
  }
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
    interleaved.push({
      id: `schedule_${Date.now()}_${idx}`,
      type: 'schedule',
      title: 'Horarios de Espectáculos (Iframe)',
      duration_seconds: defaultDuration,
      enabled: true,
      all_day: true,
      days_mode: 'all',
      active_days: [1, 2, 3, 4, 5, 6, 0]
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
      all_day: item.all_day !== false,
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
          all_day: s.all_day !== false,
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
    rotation_days_mode: raw?.rotation_days_mode || 'always',
    rotation_active_days: Array.isArray(raw?.rotation_active_days) ? raw.rotation_active_days : [1, 2, 3, 4, 5, 6, 0],
    rotation_all_day: raw?.rotation_all_day !== false,
    rotation_start_time: raw?.rotation_start_time || '18:00',
    rotation_end_time: raw?.rotation_end_time || '23:00',
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

    const schedule = config.value.items.find(i => i.type === 'schedule')
    const images = config.value.items.filter(i => i.type !== 'schedule')

    const payload = {
      enabled: config.value.enabled,
      rotation_days_mode: config.value.rotation_days_mode || 'always',
      rotation_active_days: config.value.rotation_active_days || [1, 2, 3, 4, 5, 6, 0],
      rotation_all_day: config.value.rotation_all_day !== false,
      rotation_start_time: config.value.rotation_start_time || '18:00',
      rotation_end_time: config.value.rotation_end_time || '23:00',
      items: config.value.items,
      schedule_slide: schedule ? {
        title: schedule.title,
        duration_seconds: schedule.duration_seconds,
        enabled: schedule.enabled,
        all_day: schedule.all_day,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        days_mode: schedule.days_mode,
        active_days: schedule.active_days
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
  padding: 1.25rem;
  background-color: #f1f5f9;
  height: 100%;
  overflow-y: auto;
  font-family: inherit;
}

/* Header */
.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.125rem 1.25rem;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
}

.title-with-pill {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.control-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.01em;
}

.badge-system {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  background: #f1f5f9;
  color: #475569;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  border: 1px solid #cbd5e1;
}

.control-subtitle {
  font-size: 0.8125rem;
  color: #64748b;
  margin: 0.35rem 0 0 0;
}

/* Switch toggle */
.switch-label {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  cursor: pointer;
  user-select: none;
  background: #f8fafc;
  padding: 0.5rem 0.875rem;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}

.switch-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  accent-color: #2563eb;
  cursor: pointer;
}

.switch-text {
  font-size: 0.875rem;
  font-weight: 700;
}

.status-active {
  color: #15803d;
}

.status-paused {
  color: #94a3b8;
}

/* Secuencia Pipeline Panel */
.sequence-panel {
  background: white;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.sequence-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.sequence-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1e293b;
}

.sequence-counter {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
}

.sequence-pipeline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.35rem;
}

.pipeline-node {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.node-schedule {
  background: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.node-image {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.node-icon {
  font-size: 0.875rem;
}

.node-title {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-duration {
  background: rgba(0, 0, 0, 0.08);
  padding: 0.1rem 0.35rem;
  border-radius: 0.25rem;
  font-size: 0.6875rem;
}

.pipeline-arrow {
  color: #94a3b8;
  font-size: 0.875rem;
  font-weight: 800;
}

.pipeline-empty {
  font-size: 0.8125rem;
  color: #d97706;
  font-weight: 600;
}

/* Toolbar */
.action-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.toolbar-left {
  display: flex;
  gap: 0.625rem;
  flex-wrap: wrap;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 700;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.btn-upload {
  background: #faf5ff;
  color: #7e22ce;
  border-color: #e9d5ff;
}

.btn-upload:hover:not(:disabled) {
  background: #f3e8ff;
  border-color: #d8b4fe;
}

.btn-add-schedule {
  background: #f0fdf4;
  color: #15803d;
  border-color: #bbf7d0;
}

.btn-add-schedule:hover {
  background: #dcfce7;
  border-color: #86efac;
}

.btn-interleave {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: #bfdbfe;
}

.btn-interleave:hover {
  background: #dbeafe;
  border-color: #93c5fd;
}

.item-count-label {
  font-size: 0.8125rem;
  color: #64748b;
  font-weight: 600;
}

/* Lista de diapositivas */
.items-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.item-card {
  display: flex;
  align-items: stretch;
  gap: 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.item-card.card-schedule {
  border-left: 5px solid #0284c7;
}

.item-card.card-image {
  border-left: 5px solid #d97706;
}

.item-card.card-disabled {
  opacity: 0.55;
  background: #f8fafc;
}

/* Columna Reordenar */
.reorder-column {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.35rem;
  width: 2.25rem;
  flex-shrink: 0;
}

.btn-reorder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
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

.order-number {
  font-size: 0.8125rem;
  font-weight: 800;
  color: #0f172a;
}

/* Visual Column */
.item-visual-column {
  width: 140px;
  height: 86px;
  border-radius: 0.5rem;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid #cbd5e1;
  background: #0f172a;
  position: relative;
}

.schedule-visual-box {
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

.schedule-symbol {
  font-size: 1.625rem;
}

.schedule-pill {
  font-size: 0.625rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.image-visual-box {
  width: 100%;
  height: 100%;
  position: relative;
  cursor: pointer;
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.image-visual-box:hover .thumbnail-img {
  transform: scale(1.05);
}

.zoom-overlay {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  background: rgba(0, 0, 0, 0.65);
  color: white;
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

/* Main Details Column */
.item-main-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  justify-content: center;
}

.item-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.title-editor {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.type-tag {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  white-space: nowrap;
}

.tag-schedule {
  background: #e0f2fe;
  color: #0284c7;
}

.tag-image {
  background: #fef3c7;
  color: #b45309;
}

.title-input {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #0f172a;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  padding: 0.25rem 0.5rem;
  background: transparent;
  transition: border-color 0.2s, background-color 0.2s;
  flex: 1;
  max-width: 380px;
}

.title-input:hover,
.title-input:focus {
  border-color: #cbd5e1;
  background: #f8fafc;
  outline: none;
}

.item-card-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.item-toggle-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
}

.checkbox-status {
  accent-color: #16a34a;
  cursor: pointer;
  width: 1.125rem;
  height: 1.125rem;
}

.status-indicator {
  font-size: 0.8125rem;
  font-weight: 700;
}

.status-indicator.is-active {
  color: #16a34a;
}

.status-indicator.is-paused {
  color: #94a3b8;
}

.btn-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.875rem;
  height: 1.875rem;
  border-radius: 0.375rem;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: #b91c1c;
  cursor: pointer;
  font-size: 0.8125rem;
  transition: all 0.15s;
}

.btn-delete:hover {
  background: #ef4444;
  color: white;
  border-color: #dc2626;
}

/* Grilla de Ajustes */
.item-settings-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  align-items: flex-start;
  background: #f8fafc;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}

.setting-box {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.duration-box {
  width: 110px;
}

.schedule-hours-box {
  flex: 1;
  min-width: 220px;
}

.schedule-days-box {
  flex: 1.2;
  min-width: 260px;
}

.setting-label {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.input-unit-wrapper {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.number-input {
  width: 4.25rem;
  padding: 0.3rem 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: #0f172a;
  background: white;
}

.unit-text {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 600;
}

/* Radio chips */
.radio-options-row {
  display: flex;
  gap: 0.625rem;
}

.radio-chip {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
}

/* Time range input */
.time-range-group,
.date-range-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.35rem;
}

.time-input-group,
.date-input-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  padding: 0.15rem 0.4rem;
}

.time-prefix,
.date-prefix {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #64748b;
}

.time-picker,
.date-picker {
  border: none;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #0f172a;
  background: transparent;
  outline: none;
}

.time-divider {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 800;
}

/* Weekdays buttons strip */
.weekdays-strip {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.35rem;
  flex-wrap: wrap;
}

.day-btn {
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

.day-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.day-btn.selected {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.2);
}

/* Footer Actions */
.control-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.125rem 1.25rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.btn-live-preview {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: #2563eb;
  text-decoration: none;
  padding: 0.5rem 0.875rem;
  border: 1px solid #bfdbfe;
  border-radius: 0.5rem;
  background: #eff6ff;
  transition: all 0.2s;
}

.btn-live-preview:hover {
  background: #dbeafe;
}

.btn-save-master {
  padding: 0.625rem 1.5rem;
  font-size: 0.9375rem;
  font-weight: 800;
  color: white;
  background: #2563eb;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25);
  transition: background 0.2s, transform 0.1s;
}

.btn-save-master:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.btn-save-master:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 2rem;
}

.modal-card {
  background: #0f172a;
  border-radius: 0.75rem;
  overflow: hidden;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  border: 1px solid #334155;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.25rem;
  background: #1e293b;
  color: white;
}

.modal-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.btn-close-modal {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
}

.btn-close-modal:hover {
  color: white;
}

.modal-body {
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.modal-img-full {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 0.375rem;
}

.loading-state {
  padding: 3rem;
  text-align: center;
  color: #64748b;
  font-size: 0.9375rem;
}

.spinner-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}

/* ========================================================
   ESTILOS PARA MODO GLOBAL: INTERCALADO VS SOLO IFRAME
   ======================================================== */
.interleave-mode-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.25rem 1.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.title-with-icon {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
}

.card-icon {
  font-size: 1.75rem;
  line-height: 1;
}

.card-heading {
  margin: 0 0 0.25rem 0;
  font-size: 1.0625rem;
  font-weight: 700;
  color: #0f172a;
}

.card-subheading {
  margin: 0;
  font-size: 0.84375rem;
  color: #64748b;
  line-height: 1.4;
}

.card-subheading strong {
  color: #0f172a;
}

/* Badge de estado hoy */
.today-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 700;
  white-space: nowrap;
}

.badge-interleaved {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.badge-fixed-iframe {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);
}

/* Opciones de Modo en Grilla */
.mode-options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.mode-option-card {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  padding: 1rem;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 0.625rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-option-card:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.mode-option-card.is-selected {
  background: #eff6ff;
  border-color: #2563eb;
  box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.1);
}

.mode-radio {
  margin-top: 0.25rem;
  cursor: pointer;
  accent-color: #2563eb;
  width: 1.125rem;
  height: 1.125rem;
}

.mode-card-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.mode-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mode-icon {
  font-size: 1.125rem;
}

.mode-title {
  font-weight: 700;
  font-size: 0.9375rem;
  color: #0f172a;
}

.mode-desc {
  margin: 0;
  font-size: 0.8125rem;
  color: #64748b;
  line-height: 1.35;
}

.mode-desc strong {
  color: #1e293b;
}

/* Panel Desplegable para Días Específicos */
.specific-days-panel {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.625rem;
  padding: 1.125rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.specific-days-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.panel-section-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1e293b;
}

.quick-preset-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-preset {
  background: white;
  border: 1px solid #cbd5e1;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3125rem 0.625rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-preset:hover {
  background: #e2e8f0;
  color: #0f172a;
}

/* Botones toggle de días de la semana */
.weekdays-chips-row {
  display: flex;
  gap: 0.625rem;
  flex-wrap: wrap;
}

.global-day-chip {
  flex: 1;
  min-width: 90px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.625rem 0.5rem;
  border-radius: 0.5rem;
  border: 2px solid #e2e8f0;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.global-day-chip:hover {
  border-color: #94a3b8;
  transform: translateY(-1px);
}

.global-day-chip.is-active {
  background: #f0fdf4;
  border-color: #16a34a;
  box-shadow: 0 2px 4px rgba(22, 163, 74, 0.15);
}

.global-day-chip:not(.is-active) {
  background: #f8fafc;
  border-color: #cbd5e1;
  opacity: 0.85;
}

.day-chip-name {
  font-weight: 800;
  font-size: 0.9375rem;
  color: #0f172a;
}

.global-day-chip.is-active .day-chip-name {
  color: #15803d;
}

.day-chip-status {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #64748b;
}

.global-day-chip.is-active .day-chip-status {
  color: #16a34a;
}

.day-today-indicator {
  position: absolute;
  top: -8px;
  right: -6px;
  background: #2563eb;
  color: white;
  font-size: 0.625rem;
  font-weight: 800;
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* Resumen informativo de distribución */
.days-summary-box {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.8125rem;
}

.summary-tag {
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
}

.tag-interleaving {
  background: #dcfce7;
  color: #166534;
}

.tag-fixed-iframe {
  background: #f1f5f9;
  color: #475569;
}

.summary-text {
  font-weight: 600;
  color: #1e293b;
}

/* Restricción de Horas */
.hours-restriction-row {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding-top: 0.75rem;
  border-top: 1px dashed #cbd5e1;
}

.hours-switch-title {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #334155;
}

.hours-options {
  display: flex;
  gap: 0.75rem;
}

.time-inputs-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.625rem 0.875rem;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
}

.time-field {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.time-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #475569;
}

.time-input {
  border: 1px solid #cbd5e1;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
  font-family: inherit;
}

.time-hint {
  font-size: 0.75rem;
  color: #64748b;
  font-style: italic;
}

/* Banner de modo horario fijo en la secuencia */
.pipeline-fixed-banner {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-left: 4px solid #64748b;
  padding: 0.625rem 0.875rem;
  border-radius: 0.375rem;
  font-size: 0.84375rem;
  color: #334155;
  margin-bottom: 0.75rem;
}

.counter-fixed {
  background: #f1f5f9 !important;
  color: #475569 !important;
  border: 1px solid #cbd5e1 !important;
}
</style>
