<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useEventsView } from '@/composables/useEventsView'
import { useFileUpload } from '@/composables/useFileUpload'
import { useImportValidation } from '@/composables/useImportValidation'
import { ImportApiService } from '@/services/api/import'
import { importHistoryColumns, eventsColumns, pendingChangesColumns } from '@/utils/tableColumns'
import BaseButton from '@/components/BaseButton.vue'
import BaseTable from '@/components/BaseTable.vue'
import BaseModal from '@/components/BaseModal.vue'
import FileUpload from '@/components/FileUpload.vue'
import OverrideModal from '@/components/OverrideModal.vue'
import ChangePreviewModal from '@/components/ChangePreviewModal.vue'
import { ExclamationTriangleIcon, ClockIcon, CheckCircleIcon, EyeIcon, DocumentArrowUpIcon } from '@heroicons/vue/24/outline'

const {
  loading, historyLoading, syncInProgress, eventsLoading,
  operationMode, pendingChanges, importHistory, todayEvents,
  lastSyncTime, selectedChanges, selectiveActionInProgress,
  hasPendingSync, pendingChangesCount, selectedChangesCount,
  hasSelectedChanges, allChangesSelected,
  loadOperationMode, loadPendingChanges, loadImportHistory, loadTodayEvents,
  executeSyncManual, cleanSkippedChanges, changeOperationMode, createOverride,
  toggleChangeSelection, toggleAllChanges, applySelectedChanges, discardSelectedChanges,
  startAutoRefresh
} = useEventsView()

// Import functionality
const fileUploadInstance = useFileUpload()
const { hasFile, getFileContent } = fileUploadInstance
const {
  isValidating,
  isImporting,
  validationResults,
  hasValidationResults,
  canImport,
  validationStats,
  validationStatus,
  validateImport,
  executeImport,
  getValidationSummary,
  clearValidation
} = useImportValidation()

// Debug reactivity
console.log('Setting up reactivity watchers...')
import { watch } from 'vue'
watch(hasValidationResults, (newVal) => {
  console.log('hasValidationResults changed:', newVal)
})
watch(validationStatus, (newVal) => {
  console.log('validationStatus changed:', newVal)  
})
watch(validationResults, (newVal) => {
  console.log('validationResults changed:', newVal)
})

// Modal state
const showOverrideModal = ref(false)
const showImportModal = ref(false)
const selectedEvent = ref<any>(null)
const overrideStatus = ref<'CERRADO' | 'CANCELADO'>('CERRADO')
const showPreviewModal = ref(false)
const selectedChange = ref<any>(null)

// File upload state
const uploadedFile = ref<File | null>(null)

const openOverrideModal = (event: any, status: 'CERRADO' | 'CANCELADO') => {
  selectedEvent.value = event
  overrideStatus.value = status
  showOverrideModal.value = true
}

const confirmOverride = async (reason: string) => {
  const success = await createOverride(selectedEvent.value, overrideStatus.value, reason)
  if (success) showOverrideModal.value = false
}

const showChangePreview = (change: any) => {
  selectedChange.value = change
  showPreviewModal.value = true
}

// Import functions
const openImportModal = () => {
  showImportModal.value = true
  clearValidation()
}

const closeImportModal = () => {
  showImportModal.value = false
  uploadedFile.value = null
  clearValidation()
}

const handleFileSelected = async (file: File) => {
  console.log('handleFileSelected called with file:', file?.name)
  uploadedFile.value = file
  
  // Read and validate file content
  try {
    console.log('Reading file content...')
    const reader = new FileReader()
    const content = await new Promise<string>((resolve, reject) => {
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error('Error reading file'))
      reader.readAsText(file)
    })
    
    console.log('File content loaded, parsing JSON...')
    const fileContent = JSON.parse(content)
    console.log('JSON parsed, calling validateImport...')
    await validateImport(fileContent)
    console.log('validateImport completed')
    console.log('validationStatus:', validationStatus.value)
    console.log('hasValidationResults:', hasValidationResults.value)
    console.log('validationResults:', validationResults.value)
    
    // NEW UX LOGIC: Automatic action based on validation result
    if (validationStatus.value === 'valid') {
      // File is perfectly valid - auto-store and auto-import
      console.log('File is valid, auto-storing and importing...')
      await handleAutoImportValid(fileContent, file.name)
    } else if (validationStatus.value === 'warnings') {
      // File has warnings - store file and show confirmation
      console.log('File has warnings, storing and showing confirmation...')
      await handleStoreFileForConfirmation(fileContent, file.name)
    } else {
      // File has errors - don't store, show error state only
      console.log('File has errors, showing error state only...')
      // Modal stays open with error message and only "Cancel" option
      // No automatic file storing for files with errors
    }
    
  } catch (error) {
    console.error('Error processing file:', error)
  }
}

// NEW FUNCTIONS: Handle automatic UX flows

const handleAutoImportValid = async (fileContent: any, filename: string) => {
  console.log('Handling auto-import for valid file...')
  
  try {
    // 1. Store file for audit (valid files get stored)
    console.log('Storing file for audit...')
    const storeResult = await ImportApiService.storeFile(fileContent, filename, 'valid')
    
    if (!storeResult.data.success) {
      console.error('Failed to store file:', storeResult.data.message)
      // Continue with import even if storage fails
    } else {
      console.log('File stored successfully:', storeResult.data.file_path)
    }
    
    // 2. Execute import automatically
    console.log('Executing auto-import...')
    const success = await executeImport(fileContent)
    
    if (success) {
      console.log('Auto-import successful, reloading data...')
      // Reload data after successful import
      await Promise.all([
        loadPendingChanges(),
        loadImportHistory(),
        loadTodayEvents()
      ])
      // DO NOT close modal - let user see success summary and close manually
      console.log('Auto-import completed - modal stays open for user to review')
    } else {
      console.log('Auto-import failed')
      // Modal stays open with error state
    }
    
  } catch (error) {
    console.error('Error in auto-import flow:', error)
  }
}

const handleStoreFileForConfirmation = async (fileContent: any, filename: string) => {
  console.log('Handling store for file with warnings...')
  
  try {
    // Store file for audit (files with warnings get stored)
    console.log('Storing file with warnings for audit...')
    const storeResult = await ImportApiService.storeFile(fileContent, filename, 'warnings')
    
    if (!storeResult.data.success) {
      console.error('Failed to store file with warnings:', storeResult.data.message)
      // Continue showing confirmation dialog even if storage fails
    } else {
      console.log('File with warnings stored successfully:', storeResult.data.file_path)
    }
    
    // Modal stays open with validation results and confirmation buttons:
    // - "Continue despite warnings" → calls handleImportConfirm
    // - "Cancel" → calls closeImportModal
    console.log('File stored, showing warning confirmation dialog...')
    
  } catch (error) {
    console.error('Error storing file with warnings:', error)
  }
}

const handleStopProcess = () => {
  console.log('User chose to stop the import process - closing modal without importing')
  // Archive file is already stored for audit, just close modal without importing
  closeImportModal()
}

const handleImportConfirm = async () => {
  console.log('User chose to continue with import despite warnings')
  console.log('uploadedFile:', uploadedFile.value?.name)
  console.log('canImport:', canImport.value)
  
  if (!uploadedFile.value || !canImport.value) {
    console.log('Aborting import: missing file or cannot import')
    return
  }
  
  try {
    const reader = new FileReader()
    const content = await new Promise<string>((resolve, reject) => {
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error('Error reading file'))
      reader.readAsText(uploadedFile.value!)
    })
    
    const fileContent = JSON.parse(content)
    console.log('Executing import...')
    const success = await executeImport(fileContent)
    console.log('Import result:', success)
    if (success) {
      console.log('Import successful, reloading data and closing modal...')
      // Reload data after successful import
      await Promise.all([
        loadPendingChanges(),
        loadImportHistory(),
        loadTodayEvents()
      ])
      closeImportModal()
    } else {
      console.log('Import failed, modal will stay open')
    }
  } catch (error) {
    console.error('Error importing file:', error)
  }
}

onMounted(async () => {
  await Promise.all([
    loadOperationMode(),
    loadPendingChanges(),
    loadImportHistory(),
    loadTodayEvents()
  ])
  startAutoRefresh()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <!-- Conteneur principal avec espacement vertical -->
    <div class="w-full space-y-8">
      
      <!-- Header -->
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900">Gestión de Eventos</h1>
        <p class="mt-2 text-lg text-gray-600">Sincronización y gestión de eventos del sistema</p>
        
        <!-- Import Button -->
        <div class="mt-4">
          <BaseButton
            @click="openImportModal"
            variant="primary"
            class="inline-flex items-center"
          >
            <DocumentArrowUpIcon class="w-5 h-5 mr-2" />
            Importar Eventos
          </BaseButton>
        </div>
      </div>

      <!-- Estado del Sistema - Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Modo de Operación -->
        <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-5">
              <div :class="[
                'w-4 h-4 rounded-full flex-shrink-0',
                operationMode === 'automatic' ? 'bg-green-500' : 'bg-yellow-500'
              ]"></div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Modo de Operación</h3>
                <p class="text-2xl font-bold capitalize" :class="[
                  operationMode === 'automatic' ? 'text-green-600' : 'text-yellow-600'
                ]">{{ operationMode }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Cambios Pendientes -->
        <div class="bg-white rounded-xl shadow-lg p-6 border-l-4" :class="[
          hasPendingSync ? 'border-yellow-500' : 'border-gray-300'
        ]">
          <div class="flex items-center gap-4">
            <div class="flex-shrink-0">
              <ExclamationTriangleIcon :class="[
                'w-8 h-8',
                hasPendingSync ? 'text-yellow-500' : 'text-gray-400'
              ]" />
            </div>
            <div class="flex flex-col gap-1">
              <h3 class="text-lg font-semibold text-gray-900">Cambios Pendientes</h3>
              <p class="text-2xl font-bold" :class="[
                hasPendingSync ? 'text-yellow-600' : 'text-gray-400'
              ]">{{ pendingChangesCount }}</p>
            </div>
          </div>
        </div>

        <!-- Última Sincronización -->
        <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-gray-300">
          <div class="flex items-center gap-4">
            <div class="flex-shrink-0">
              <ClockIcon class="w-8 h-8 text-gray-400" />
            </div>
            <div class="flex flex-col gap-1">
              <h3 class="text-lg font-semibold text-gray-900">Última Sincronización</h3>
              <p class="text-sm font-medium text-gray-600">{{ lastSyncTime || 'Nunca' }}</p>
            </div>
          </div>
        </div>
      </div>
      <OverrideModal
      :show="showOverrideModal"
      :selectedEvent="selectedEvent"
      :overrideStatus="overrideStatus"
      @confirm="confirmOverride"
      @close="showOverrideModal = false"
    />

    <ChangePreviewModal
      :show="showPreviewModal"
      :selectedChange="selectedChange"
      @close="showPreviewModal = false"
    />

      <!-- Acciones -->
      <div class="bg-white rounded-xl shadow-lg p-6">
        <!-- Acciones Globales -->
        <div class="flex flex-wrap gap-4 justify-center mb-4">
          <BaseButton
            v-if="hasPendingSync"
            @click="executeSyncManual"
            :loading="syncInProgress"
            variant="primary"
            class="px-6 py-3 text-lg"
          >
            <CheckCircleIcon class="w-5 h-5 mr-2" />
            Aplicar Todos ({{ pendingChangesCount }})
          </BaseButton>
          
          <BaseButton
            @click="changeOperationMode(operationMode === 'automatic' ? 'manual' : 'automatic')"
            variant="outline"
            class="px-6 py-3"
          >
            Cambiar a {{ operationMode === 'automatic' ? 'Manual' : 'Automático' }}
          </BaseButton>
          
          <BaseButton
            v-if="hasPendingSync"
            @click="cleanSkippedChanges"
            variant="outline"
            class="px-6 py-3"
          >
            Forzar Aplicación
          </BaseButton>
        </div>
        
        <!-- Acciones Selectivas -->
        <div v-if="hasPendingSync" class="border-t pt-4">
          <div class="flex flex-wrap gap-3 justify-center">
            <BaseButton
              v-if="hasSelectedChanges"
              @click="applySelectedChanges"
              :loading="selectiveActionInProgress"
              variant="primary"
              size="sm"
              class="bg-green-600 hover:bg-green-700"
            >
              ✓ Aplicar Seleccionados ({{ selectedChangesCount }})
            </BaseButton>
            
            <BaseButton
              v-if="hasSelectedChanges"
              @click="discardSelectedChanges"
              :loading="selectiveActionInProgress"
              variant="outline"
              size="sm"
              class="text-red-600 border-red-300 hover:bg-red-50"
            >
              × Descartar Seleccionados ({{ selectedChangesCount }})
            </BaseButton>
            
            <BaseButton
              v-if="!hasSelectedChanges && hasPendingSync"
              @click="toggleAllChanges"
              variant="outline"
              size="sm"
            >
              Seleccionar Todos
            </BaseButton>
            
            <BaseButton
              v-if="hasSelectedChanges"
              @click="selectedChanges.clear()"
              variant="outline"
              size="sm"
            >
              Limpiar Selección
            </BaseButton>
          </div>
          
          <p v-if="hasSelectedChanges" class="text-center text-sm text-gray-600 mt-2">
            {{ selectedChangesCount }} de {{ pendingChangesCount }} cambios seleccionados
          </p>
        </div>
      </div>

      <!-- Cambios Pendientes - Table -->
      <div class="bg-white rounded-xl shadow-lg overflow-hidden">
        <div class="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-xl font-bold text-gray-900">Cambios Pendientes</h2>
              <p class="text-sm text-gray-600">Selecciona cambios individuales para aplicar o descartar</p>
            </div>
            <div v-if="hasPendingSync" class="flex items-center gap-2">
              <input
                type="checkbox"
                :checked="allChangesSelected"
                @change="toggleAllChanges"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label class="text-sm font-medium text-gray-700">
                Seleccionar Todos
              </label>
            </div>
          </div>
        </div>
        
        <BaseTable
          :columns="pendingChangesColumns"
          :data="pendingChanges"
          :loading="loading"
          :show-actions="false"
          empty-message="No hay cambios pendientes"
        >
          <template #cell-select="{ row }">
            <input
              type="checkbox"
              :checked="selectedChanges.has(row.id)"
              @change="toggleChangeSelection(row.id)"
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </template>
          
          <template #cell-type="{ row }">
            <span :class="[ 
              'px-3 py-1 text-xs font-bold rounded-full',
              row.type === 'CREATE' ? 'bg-blue-100 text-blue-800' :
              row.type === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            ]">
              {{ row.type }}
            </span>
          </template>
          
          <template #cell-preview="{ row }">
            <BaseButton
              @click="showChangePreview(row)"
              variant="outline"
              size="sm"
              class="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <EyeIcon class="w-4 h-4 mr-1" />
              Ver Detalles
            </BaseButton>
          </template>
        </BaseTable>
      </div>

      <!-- Historial de Importaciones -->
      <div class="bg-white rounded-xl shadow-lg overflow-hidden">
        <div class="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b">
          <h2 class="text-xl font-bold text-gray-900">Historial de Importaciones</h2>
          <p class="text-sm text-gray-600">Registro de sincronizaciones anteriores</p>
        </div>
        
        <BaseTable
          :columns="importHistoryColumns"
          :data="importHistory"
          :loading="historyLoading"
          :show-actions="false"
          empty-message="No hay historial de importaciones"
        >
          <template #cell-status="{ row }">
            <span :class="[ 
              'px-3 py-1 text-xs font-bold rounded-full',
              row.status === 'SUCCESS' || row.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
              row.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
              row.status === 'FAILED' ? 'bg-red-100 text-red-800' :
              row.status === 'PENDING' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            ]">
              {{ row.status }}
            </span>
          </template>
        </BaseTable>
      </div>

      <!-- Eventos de Hoy con Overrides -->
      <div class="bg-white rounded-xl shadow-lg overflow-hidden">
        <div class="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b">
          <h2 class="text-xl font-bold text-gray-900">Eventos de Hoy - Overrides Manuales</h2>
          <p class="text-sm text-gray-600">Forzar estados CERRADO/CANCELADO para contingencias</p>
        </div>
        
        <BaseTable
          :columns="eventsColumns"
          :data="todayEvents"
          :loading="eventsLoading"
          :show-actions="false"
          empty-message="No hay eventos programados para hoy"
        >
          <template #cell-calculated_status="{ row }">
            <span :class="[ 
              'px-3 py-1 text-xs font-bold rounded-full',
              row.calculated_status === 'ABIERTO' ? 'bg-green-100 text-green-800' :
              row.calculated_status === 'CERRADO' ? 'bg-red-100 text-red-800' :
              row.calculated_status === 'CANCELADO' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            ]">
              {{ row.calculated_status || 'PROGRAMADO' }}
            </span>
          </template>
          
          <template #cell-actions="{ row }">
            <div class="flex gap-2">
              <BaseButton
                @click="openOverrideModal(row, 'CERRADO')"
                variant="outline"
                size="sm"
                class="text-red-600 border-red-300 hover:bg-red-50"
              >
                Forzar CERRADO
              </BaseButton>
              <BaseButton
                @click="openOverrideModal(row, 'CANCELADO')"
                variant="outline"
                size="sm"
                class="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
              >
                Forzar CANCELADO
              </BaseButton>
            </div>
          </template>
        </BaseTable>
      </div>
    </div>
  </div>

  <!-- Import Modal -->
  <BaseModal
    :isOpen="showImportModal"
    @close="closeImportModal"
    title="Importar Eventos"
    size="xl"
  >
    <div class="space-y-6">
      <!-- File Upload Section -->
      <div>
        <h3 class="text-lg font-medium text-gray-900 mb-4">Seleccionar Archivo JSON</h3>
        <FileUpload 
          @fileCleared="clearValidation"
          @proceed="handleFileSelected"
        />
      </div>

      <!-- Validation Results -->
      <div v-if="hasValidationResults" class="space-y-4">
        <div class="border-t pt-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Resultados de Validación</h3>
          
          <!-- Status Badge -->
          <div class="mb-4">
            <span v-if="validationStatus === 'valid'" 
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <CheckCircleIcon class="w-4 h-4 mr-1" />
              Válido - Listo para importar
            </span>
            <span v-else-if="validationStatus === 'warnings'" 
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              <ExclamationTriangleIcon class="w-4 h-4 mr-1" />
              Warnings - Se puede importar con advertencias
            </span>
            <span v-else 
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
              <ExclamationTriangleIcon class="w-4 h-4 mr-1" />
              Errores - No se puede importar
            </span>
          </div>

          <!-- Summary -->
          <div v-if="validationStats" class="bg-gray-50 rounded-lg p-4">
            <div class="grid grid-cols-3 gap-4 text-sm text-center">
              <div>
                <div class="text-2xl font-bold text-gray-900">{{ validationStats.totalEvents }}</div>
                <div class="text-gray-600">Total eventos</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-green-600">{{ validationStats.newEvents }}</div>
                <div class="text-gray-600">Nuevos</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-blue-600">{{ validationStats.updatedEvents }}</div>
                <div class="text-gray-600">Actualizaciones</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading States -->
      <div v-if="isValidating" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">Validando archivo...</span>
      </div>

      <div v-if="isImporting" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span class="ml-3 text-gray-600">Importando datos...</span>
      </div>
      
    </div>

    <!-- Modal Actions -->
    <template #footer>
      <BaseButton
        @click="closeImportModal"
        variant="secondary"
        :disabled="isValidating || isImporting"
      >
        Cancelar
      </BaseButton>
      
      <!-- For files with warnings: show both Continue and Stop options -->
      <BaseButton
        v-if="hasValidationResults && validationStatus === 'warnings'"
        @click="handleStopProcess"
        variant="secondary"
        :disabled="isValidating || isImporting"
        class="border-red-300 text-red-600 hover:bg-red-50"
      >
        Detener proceso
      </BaseButton>
      
      <BaseButton
        v-if="hasValidationResults && validationStatus === 'warnings'"
        @click="handleImportConfirm"
        variant="primary"
        :disabled="isValidating || isImporting"
        :loading="isImporting"
        class="bg-yellow-600 hover:bg-yellow-700"
      >
        Continuar a pesar de advertencias
      </BaseButton>
      
      <!-- For files with valid status: show success info -->
      <div
        v-if="hasValidationResults && validationStatus === 'valid'"
        class="text-sm text-green-600 font-medium"
      >
        ✅ Importación completada exitosamente
      </div>
      
      <!-- For files with errors: no additional buttons (only Cancel) -->
    </template>
  </BaseModal>
</template>