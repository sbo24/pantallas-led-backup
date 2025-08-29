<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotifications } from '@/composables/useNotifications'
import { useModal } from '@/composables/useModal'
import { AlertsApiService } from '@/services/api/alerts'
import type { GlobalAlert } from '@/types/api'
import BaseButton from '@/components/BaseButton.vue'
import { ExclamationTriangleIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/vue/24/outline'

// Composables
const { showSuccessToast, showErrorToast } = useNotifications()
const { openModal, closeModal } = useModal()

// State
const loading = ref(false)
const activeAlert = ref<GlobalAlert | null>(null)
const alertMessage = ref('')
const alertType = ref<'info' | 'warning' | 'error' | 'success'>('warning')
const showConfirmation = ref(false)

// Computed
const hasActiveAlert = computed(() => activeAlert.value !== null)
const canActivateAlert = computed(() => alertMessage.value.trim().length >= 10)

// Methods
const loadActiveAlert = async () => {
  try {
    loading.value = true
    const response = await AlertsApiService.getActiveAlerts()
    activeAlert.value = response.data.length > 0 ? response.data[0] : null
  } catch (error) {
    console.error('Error loading active alert:', error)
    showErrorToast('Error al cargar alertas activas')
  } finally {
    loading.value = false
  }
}

const activateAlert = async () => {
  if (!canActivateAlert.value) return
  
  try {
    loading.value = true
    const alertData = {
      message: alertMessage.value.trim(),
      alert_type: alertType.value === 'error' ? 'emergency' : alertType.value === 'warning' ? 'warning' : 'info'
    }
    
    const response = await AlertsApiService.createAlert(alertData)
    activeAlert.value = response.data
    alertMessage.value = ''
    showConfirmation.value = false
    
    showSuccessToast('Alerta global activada correctamente')
  } catch (error) {
    console.error('Error activating alert:', error)
    showErrorToast('Error al activar la alerta global')
  } finally {
    loading.value = false
  }
}

const deactivateAlert = async () => {
  if (!activeAlert.value) return
  
  try {
    loading.value = true
    await AlertsApiService.deactivateAlert(activeAlert.value.id)
    activeAlert.value = null
    
    showSuccessToast('Alerta global desactivada correctamente')
  } catch (error) {
    console.error('Error deactivating alert:', error)
    showErrorToast('Error al desactivar la alerta global')
  } finally {
    loading.value = false
  }
}

const showActivateConfirmation = () => {
  if (!canActivateAlert.value) return
  showConfirmation.value = true
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getAlertTypeColor = (type: string) => {
  switch (type) {
    case 'error': return 'text-red-600 bg-red-50 border-red-200'
    case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'success': return 'text-green-600 bg-green-50 border-green-200'
    default: return 'text-blue-600 bg-blue-50 border-blue-200'
  }
}

const getAlertIcon = (type: string) => {
  switch (type) {
    case 'error': return '🚨'
    case 'warning': return '⚠️'
    case 'success': return '✅'
    default: return 'ℹ️'
  }
}

onMounted(() => {
  loadActiveAlert()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="w-full max-w-4xl mx-auto space-y-12">
      
      <!-- Header -->
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900">Centro de Alertas Globales</h1>
        <p class="mt-2 text-lg text-gray-600">Gestión de alertas de emergencia para pantallas públicas</p>
      </div>

      <!-- Estado Actual de Alerta -->
      <div class="bg-white rounded-xl shadow-lg p-6 border-l-4" :class="[
        hasActiveAlert ? 'border-red-500' : 'border-green-500'
      ]">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="flex-shrink-0">
              <ExclamationTriangleIcon v-if="hasActiveAlert" class="w-8 h-8 text-red-500" />
              <CheckCircleIcon v-else class="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h3 class="text-xl font-semibold" :class="[
                hasActiveAlert ? 'text-red-900' : 'text-green-900'
              ]">
                {{ hasActiveAlert ? 'ALERTA ACTIVA' : 'Sin alertas activas' }}
              </h3>
              <p class="text-sm" :class="[
                hasActiveAlert ? 'text-red-600' : 'text-green-600'
              ]">
                {{ hasActiveAlert ? 'Las pantallas muestran mensaje de alerta' : 'Sistema operando normalmente' }}
              </p>
            </div>
          </div>
          
          <!-- Indicador visual -->
          <div :class="[
            'w-4 h-4 rounded-full',
            hasActiveAlert ? 'bg-red-500 animate-pulse' : 'bg-green-500'
          ]"></div>
        </div>
      </div>

      <!-- Alerta Activa - Información -->
      <div v-if="hasActiveAlert && activeAlert" class="bg-white rounded-xl shadow-lg overflow-hidden">
        <div class="px-6 py-4 bg-gradient-to-r from-red-50 to-pink-50 border-b">
          <h2 class="text-xl font-bold text-gray-900">Alerta Actual</h2>
        </div>
        
        <div class="p-6">
          <div class="space-y-4">
            <!-- Mensaje de la alerta -->
            <div class="p-4 rounded-lg border-2" :class="getAlertTypeColor(activeAlert.alert_type)">
              <div class="flex items-start gap-3">
                <span class="text-2xl">{{ getAlertIcon(activeAlert.alert_type) }}</span>
                <div class="flex-1">
                  <h4 class="font-semibold text-lg">Alerta Global</h4>
                  <p class="mt-1 text-base">{{ activeAlert.message }}</p>
                </div>
              </div>
            </div>
            
            <!-- Información adicional -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span class="font-medium">Activada:</span>
                {{ formatTime(activeAlert.activated_at) }}
              </div>
              <div>
                <span class="font-medium">Creada por:</span>
                {{ activeAlert.created_by }}
              </div>
              <div>
                <span class="font-medium">Tipo:</span>
                <span class="capitalize">{{ activeAlert.alert_type }}</span>
              </div>
              <div>
                <span class="font-medium">Creada:</span>
                {{ formatTime(activeAlert.created_at) }}
              </div>
            </div>
          </div>
          
          <!-- Acción de desactivar -->
          <div class="mt-6 pt-4 border-t">
            <BaseButton
              @click="deactivateAlert"
              :loading="loading"
              variant="primary"
              class="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg"
            >
              <CheckCircleIcon class="w-5 h-5 mr-2" />
              ✓ DESACTIVAR ALERTA GLOBAL
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- Espacement supplémentaire -->
      <div class="h-8"></div>

      <!-- Activar Nueva Alerta -->
      <div v-if="!hasActiveAlert" class="bg-white rounded-xl shadow-lg overflow-hidden mt-16">
        <div class="px-6 py-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-b">
          <h2 class="text-xl font-bold text-gray-900">Activar Alerta Global</h2>
          <p class="text-sm text-gray-600">Esta alerta reemplazará TODA la información en las pantallas públicas</p>
        </div>
        
        <div class="p-6 space-y-6">
          <!-- Tipo de alerta -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Alerta
            </label>
            <select 
              v-model="alertType"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="warning">⚠️ Advertencia</option>
              <option value="error">🚨 Emergencia</option>
              <option value="info">ℹ️ Información</option>
              <option value="success">✅ Confirmación</option>
            </select>
          </div>
          
          <!-- Mensaje de alerta -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Mensaje de Alerta (mínimo 10 caracteres)
            </label>
            <textarea 
              v-model="alertMessage"
              rows="4"
              placeholder="Escriba el mensaje que se mostrará en todas las pantallas del parque..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            ></textarea>
            <p class="mt-1 text-xs text-gray-500">
              {{ alertMessage.length }} caracteres (mínimo 10)
            </p>
          </div>
          
          <!-- Vista previa -->
          <div v-if="alertMessage.trim()" class="space-y-3">
            <h4 class="font-medium text-gray-900">Vista Previa:</h4>
            <div class="p-4 rounded-lg border-2" :class="getAlertTypeColor(alertType)">
              <div class="flex items-start gap-3">
                <span class="text-2xl">{{ getAlertIcon(alertType) }}</span>
                <div class="flex-1">
                  <h4 class="font-semibold text-lg">Alerta Global del Sistema</h4>
                  <p class="mt-1 text-base">{{ alertMessage }}</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Botón de activación -->
          <div class="pt-4 border-t">
            <BaseButton
              @click="showActivateConfirmation"
              :disabled="!canActivateAlert || loading"
              variant="primary"
              class="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-3 text-lg"
            >
              ⚠️ ACTIVAR ALERTA GLOBAL
            </BaseButton>
            
            <p v-if="!canActivateAlert" class="mt-2 text-sm text-red-600 text-center">
              El mensaje debe tener al menos 10 caracteres
            </p>
          </div>
        </div>
      </div>

      <!-- Modal de Confirmación -->
      <div v-if="showConfirmation" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
          <div class="p-6">
            <div class="flex items-center gap-3 mb-4">
              <ExclamationTriangleIcon class="w-8 h-8 text-red-500" />
              <h3 class="text-xl font-bold text-gray-900">¿Activar Alerta Global?</h3>
            </div>
            
            <div class="space-y-3 mb-6">
              <p class="text-gray-700">
                Esta acción reemplazará <strong>TODA</strong> la información en las pantallas públicas del parque.
              </p>
              
              <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p class="text-sm text-yellow-800">
                  <strong>Mensaje:</strong> {{ alertMessage }}
                </p>
              </div>
              
              <p class="text-sm text-gray-600">
                Los visitantes verán únicamente este mensaje hasta que la alerta sea desactivada.
              </p>
            </div>
            
            <div class="flex gap-3">
              <BaseButton
                @click="showConfirmation = false"
                variant="outline"
                class="flex-1"
              >
                <XMarkIcon class="w-4 h-4 mr-1" />
                Cancelar
              </BaseButton>
              
              <BaseButton
                @click="activateAlert"
                :loading="loading"
                variant="primary"
                class="flex-1 bg-red-600 hover:bg-red-700"
              >
                <ExclamationTriangleIcon class="w-4 h-4 mr-1" />
                Sí, activar alerta
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>