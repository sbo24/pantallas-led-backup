<script setup lang="ts">
// SettingsView - Configuración del sistema
import { computed, onMounted, ref } from 'vue';
import { useSettings } from '@/composables/useSettings';
import { useNotifications } from '@/composables/useNotifications';

// Composables
const {
  formData,
  hasChanges,
  loading,
  error,
  validateForm,
  saveAllSettings,
  resetForm,
  exportSettings,
  importSettings,
  resetAllSettings,
  clearError
} = useSettings({ autoValidate: true, trackChanges: true });

const { showSuccessToast, showWarningToast, showErrorToast } = useNotifications();

// local state
const activeTab = ref('general');
const showResetModal = ref(false);
const showImportModal = ref(false);
const importFile = ref<File | null>(null);
const validationResult = ref(validateForm());

// Computed
const canSave = computed(() => hasChanges.value && !loading.value && validationResult.value.isValid);
const hasErrors = computed(() => validationResult.value.errors.length > 0);
const hasWarnings = computed(() => validationResult.value.warnings.length > 0);

// Methods
const handleSave = async () => {
  const result = await saveAllSettings();
  if (result) {
    validationResult.value = validateForm();
  } else {
    showErrorToast('Error al guardar la configuración');
  }
}

const handleReset = () => {
  resetForm();
  validationResult.value = validateForm();
  showResetModal.value = false;
}

const handleExport = async () => {
  const settings = await exportSettings();
  if (settings.length > 0) {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `showstrack-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

const handleImportFile = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    importFile.value = target.files[0];
  }
}

const handleImport = async () => {
  if (!importFile.value) return;

  try {
    const text = await importFile.value.text();
    const configData = JSON.parse(text);
    const result = await importSettings(configData);

    if (result) {
      showImportModal.value = false;
      importFile.value = null;
      validationResult.value = validateForm();
    }
  } catch (error) {
    showErrorToast('Error al importar la configuración: ' + (error as Error).message);
  }
}

const handleResetAll = async () => {
  const count = await resetAllSettings();
  if (count > 0) {
    validationResult.value = validateForm();
    showResetModal.value = false;
  }
}

// Watch for form changes to revalidate
const updateValidation = () => {
  validationResult.value = validateForm();
}

onMounted(() => {
  clearError();
})
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex justify-between items-start">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p class="text-gray-600 mt-2">Gestiona la configuración global de ShowsTrack</p>
        </div>
        
        <div class="flex gap-3">          
          <!-- Actions -->
          <button @click="handleExport" class="btn-secondary">
            📤 Exportar
          </button>
          <button @click="showImportModal = true" class="btn-secondary">
            📥 Importar
          </button>
          <button 
            @click="handleSave" 
            :disabled="!canSave"
            class="btn-primary"
          >
            💾 Guardar Cambios
          </button>
        </div>
      </div>
      
      <!-- Status Indicators -->
      <div class="flex gap-4 mt-4">
        <div v-if="hasChanges" class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
          ⚠️ Cambios pendientes
        </div>
        <div v-if="hasErrors" class="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
          ❌ {{ validationResult.errors.length }} errores
        </div>
        <div v-if="hasWarnings" class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
          ⚠️ {{ validationResult.warnings.length }} advertencias
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="flex space-x-8">
        <button
          v-for="tab in ['general', 'display', 'venue', 'alerts']"
          :key="tab"
          @click="activeTab = tab"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
            activeTab === tab
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          {{ {
            general: '⚙️ General',
            display: '🖥️ Pantallas',
            venue: '🏛️ Recinto',
            alerts: '🚨 Alertas'
          }[tab] }}
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div class="space-y-6">
      <!-- General Tab -->
      <div v-show="activeTab === 'general'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white p-6 rounded-lg border">
          <h3 class="text-lg font-semibold mb-4">Configuración General</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Tiempo de Anticipación por Defecto (minutos)
              </label>
              <input
                v-model.number="formData.general.defaultLeadTimeMinutes"
                @input="updateValidation"
                type="number"
                min="0"
                max="120"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Display Tab -->
      <div v-show="activeTab === 'display'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white p-6 rounded-lg border">
          <h3 class="text-lg font-semibold mb-4">Configuración de Pantallas</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Intervalo de Actualización (segundos)
              </label>
              <input
                v-model.number="formData.display.refreshSeconds"
                @input="updateValidation"
                type="number"
                min="5"
                max="300"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div class="space-y-3">
              <label class="flex items-center">
                <input
                  v-model="formData.display.showVenues"
                  @change="updateValidation"
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-700">Mostrar ubicaciones</span>
              </label>
              
              <label class="flex items-center">
                <input
                  v-model="formData.display.showCapacity"
                  @change="updateValidation"
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-700">Mostrar capacidad</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Venue Tab -->
      <div v-show="activeTab === 'venue'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white p-6 rounded-lg border">
          <h3 class="text-lg font-semibold mb-4">Horarios del Recinto</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Hora de Apertura
              </label>
              <input
                v-model="formData.venue.openTime"
                @input="updateValidation"
                type="time"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Hora de Cierre
              </label>
              <input
                v-model="formData.venue.closeTime"
                @input="updateValidation"
                type="time"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Alerts Tab -->
      <div v-show="activeTab === 'alerts'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white p-6 rounded-lg border">
          <h3 class="text-lg font-semibold mb-4">Configuración de Alertas</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Días de Retención de Alertas
              </label>
              <input
                v-model.number="formData.alerts.retentionDays"
                @input="updateValidation"
                type="number"
                min="1"
                max="365"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Máximo Overrides Concurrentes
              </label>
              <input
                v-model.number="formData.alerts.maxConcurrentOverrides"
                @input="updateValidation"
                type="number"
                min="1"
                max="50"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Validation Errors -->
    <div v-if="hasErrors || hasWarnings" class="mt-6 space-y-2">
      <div v-for="error in validationResult.errors" :key="error.field" class="p-3 bg-red-50 border border-red-200 rounded-md">
        <p class="text-red-800 text-sm">❌ {{ error.message }}</p>
      </div>
      <div v-for="warning in validationResult.warnings" :key="warning.field" class="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <p class="text-yellow-800 text-sm">⚠️ {{ warning.message }}</p>
      </div>
    </div>

    <!-- Reset Actions -->
    <div class="mt-8 pt-6 border-t border-gray-200">
      <div class="flex justify-between items-center">
        <button @click="handleReset" :disabled="!hasChanges" class="btn-secondary">
          🔄 Descartar Cambios
        </button>
        <button @click="showResetModal = true" class="btn-danger">
          ⚠️ Restablecer Todo
        </button>
      </div>
    </div>

    <!-- Import Modal -->
    <div v-if="showImportModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-4">Importar Configuración</h3>
        <input
          @change="handleImportFile"
          type="file"
          accept=".json"
          class="w-full mb-4"
        />
        <div class="flex justify-end gap-3">
          <button @click="showImportModal = false" class="btn-secondary">Cancelar</button>
          <button @click="handleImport" :disabled="!importFile" class="btn-primary">Importar</button>
        </div>
      </div>
    </div>

    <!-- Reset Confirmation Modal -->
    <div v-if="showResetModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-4 text-red-600">⚠️ Confirmar Restablecimiento</h3>
        <p class="text-gray-600 mb-6">Esta acción restablecerá TODAS las configuraciones a sus valores por defecto. ¿Estás seguro?</p>
        <div class="flex justify-end gap-3">
          <button @click="showResetModal = false" class="btn-secondary">Cancelar</button>
          <button @click="handleResetAll" class="btn-danger">Sí, Restablecer</button>
        </div>
      </div>
    </div>
  </div>
</template>