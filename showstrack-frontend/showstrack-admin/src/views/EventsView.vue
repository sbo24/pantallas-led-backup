<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useEventsView } from '@/composables/useEventsView'
import { importHistoryColumns, eventsColumns, pendingChangesColumns } from '@/utils/tableColumns'
import BaseButton from '@/components/BaseButton.vue'
import BaseTable from '@/components/BaseTable.vue'
import OverrideModal from '@/components/OverrideModal.vue'
import ChangePreviewModal from '@/components/ChangePreviewModal.vue'
import { ExclamationTriangleIcon, ClockIcon, CheckCircleIcon, EyeIcon } from '@heroicons/vue/24/outline'

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

// Modal state
const showOverrideModal = ref(false)
const selectedEvent = ref<any>(null)
const overrideStatus = ref<'CERRADO' | 'CANCELADO'>('CERRADO')
const showPreviewModal = ref(false)
const selectedChange = ref<any>(null)

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
</template>