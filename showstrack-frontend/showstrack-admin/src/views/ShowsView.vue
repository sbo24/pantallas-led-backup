<script setup lang="ts">
/**
 * ShowsView - Gestión completa de espectáculos
 * Implementa todas las funcionalidades avanzadas usando composables
 */

import { computed, ref, onMounted } from 'vue'
import { useShows, useTable, useModal, useNotifications } from '@/composables'
import { useEventsStore } from '@/stores/events'
import BaseTable from '@/components/BaseTable.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseModal from '@/components/BaseModal.vue'
import type { Show } from '@/types'
import type { TableColumn } from '@/components/BaseTable.vue'

// ==========================================
// COMPOSABLES & STATE INITIALIZATION
// ==========================================

// Business Logic - Shows management
const { 
  shows, 
  loading: showsLoading, 
  error: showsError,
  createShow, 
  updateShow, 
  deleteShow,
  bulkDelete,
  bulkToggleStatus,
  fetchShows
} = useShows()

// Events store for calculating today events
const eventsStore = useEventsStore()

// Table Management
const { 
  data: tableData,
  paginatedData,
  filteredData,
  sortedData,
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  selectedRows,
  selectedCount,
  allSelected,
  someSelected,
  sortBy,
  sortDirection,
  filters,
  activeFilters,
  searchQuery,
  hasSelection,
  isEmpty,
  hasData,
  // Methods
  goToPage,
  changePageSize,
  updateSort,
  updateFilter,
  removeFilter,
  clearFilters,
  setSearchQuery,
  clearSearch,
  selectRow,
  selectAll,
  deselectAll,
  clearSelection,
  isRowSelected,
  exportData,
  exportSelection,
  resetTable
} = useTable<Show>({
  data: shows,
  defaultSort: { key: 'createdAt', direction: 'desc' },
  defaultPageSize: 25,
  persistState: 'shows-table',
  searchable: true,
  exportable: true,
  selectable: true
})

// Modal Management
const {
  openModal,
  closeModal,
  isModalOpen
} = useModal({
  enableKeyboardShortcuts: true,
  enableFocusTrap: true,
  stackable: true
})

// Notifications
const { showSuccessToast, showErrorToast, showWarningToast } = useNotifications()

// ==========================================
// LIFECYCLE
// ==========================================

// Computed for today events count per show
const showsWithTodayEvents = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  const todayEvents = (eventsStore.events || []).filter(event => 
    event.event_date === today
  )
  
  return shows.value.map(show => ({
    ...show,
    todayEventsCount: todayEvents.filter(event => event.show_id === show.id).length
  }))
})

onMounted(async () => {
  console.log('ShowsView mounting...')
  await fetchShows()
  await eventsStore.fetchEvents()
  console.log(`ShowsView mounted with ${shows.value.length} shows`)
})

// ==========================================
// LOCAL STATE
// ==========================================

const showFiltersPanel = ref(false)
const selectedShow = ref<Show | null>(null)
const bulkActionInProgress = ref(false)

// Modal states
const modals = ref({
  create: false,
  edit: false,
  delete: false,
  bulkDelete: false,
  export: false
})

// ==========================================
// TABLE CONFIGURATION
// ==========================================

const tableColumns: TableColumn[] = [
  {
    key: 'is_visible',
    label: 'Visible',
    sortable: true,
    width: '100px',
    align: 'center',
    formatter: (value: boolean) => value ? 'Sí' : 'No'
  },
  {
    key: 'display_order',
    label: 'Orden',
    sortable: true,
    width: '80px',
    align: 'center',
    formatter: (value: number) => value?.toString() || '0'
  },
  {
    key: 'name',
    label: 'Nombre',
    sortable: true,
    width: '250px',
    align: 'left'
  },
  {
    key: 'todayEventsCount',
    label: 'Eventos Hoy',
    sortable: true,
    width: '120px',
    align: 'center',
    formatter: (value: number) => value?.toString() || '0'
  },
  {
    key: 'custom_lead_time_access_minutes',
    label: 'Lead Time',
    sortable: true,
    width: '120px',
    align: 'center',
    formatter: (value: number) => value ? `${value} min` : 'Por defecto'
  }
]

// ==========================================
// COMPUTED PROPERTIES
// ==========================================

const showsStats = computed(() => ({
  total: shows.value.length,
  visible: shows.value.filter(s => s.is_visible).length,
  hidden: shows.value.filter(s => !s.is_visible).length,
  withEvents: shows.value.filter(s => s.current_events_count > 0).length,
  withoutEvents: shows.value.filter(s => s.current_events_count === 0).length
}))

const bulkActionsAvailable = computed(() => [
  {
    key: 'toggle-status',
    label: 'Cambiar Estado',
    action: handleBulkToggleStatus,
    enabled: hasSelection.value
  },
  {
    key: 'export-selected',
    label: 'Exportar Selección',
    action: handleExportSelection,
    enabled: hasSelection.value
  },
  {
    key: 'delete-selected',
    label: 'Eliminar Seleccionados',
    action: handleBulkDelete,
    enabled: hasSelection.value,
    variant: 'danger' as const
  }
])

const filterOptions = computed(() => ({
  is_visible: [
    { value: true, label: 'Visible' },
    { value: false, label: 'Oculto' }
  ],
  current_events_count: [
    { value: 0, label: 'Sin eventos' },
    { value: 1, label: 'Con eventos' }
  ]
}))

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const getStatusLabel = (status: string): string => {
  const labels = {
    'PROGRAMADO': 'Programado',
    'ABIERTO': 'Abierto',
    'CERRADO': 'Cerrado',
    'CANCELADO': 'Cancelado'
  }
  return labels[status as keyof typeof labels] || status
}

const getStatusBadgeClass = (status: string): string => {
  const classes = {
    'PROGRAMADO': 'bg-gray-100 text-gray-800',
    'ABIERTO': 'bg-green-100 text-green-800',
    'CERRADO': 'bg-red-100 text-red-800',
    'CANCELADO': 'bg-yellow-100 text-yellow-800'
  }
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800'}`
}

const formatDateTime = (dateString: string): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const formatDate = (dateString: string): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

// ==========================================
// MODAL HANDLERS
// ==========================================

const handleCreateShow = async () => {
  try {
    const modalId = await openModal({
      title: 'Crear Nuevo Show',
      size: 'lg',
      variant: 'form',
      context: {
        formType: 'create',
        show: null
      }
    })
    modals.value.create = true
  } catch (error) {
    console.error('Error opening create modal:', error)
    showErrorToast('Error al abrir el formulario de creación')
  }
}

const handleEditShow = async (show: Show) => {
  selectedShow.value = show
  try {
    const modalId = await openModal({
      title: `Editar Show: ${show.name}`,
      size: 'lg',
      variant: 'form',
      context: {
        formType: 'edit',
        show: { ...show }
      }
    })
    modals.value.edit = true
  } catch (error) {
    console.error('Error opening edit modal:', error)
    showErrorToast('Error al abrir el formulario de edición')
  }
}

const handleDeleteShow = async (show: Show) => {
  selectedShow.value = show
  try {
    const modalId = await openModal({
      title: 'Confirmar Eliminación',
      size: 'md',
      variant: 'confirmation',
      context: {
        message: `¿Estás seguro de que deseas eliminar el show "${show.name}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        variant: 'danger'
      }
    })
    modals.value.delete = true
  } catch (error) {
    console.error('Error opening delete modal:', error)
    showErrorToast('Error al abrir la confirmación de eliminación')
  }
}

// ==========================================
// BULK ACTIONS HANDLERS
// ==========================================

const handleBulkToggleStatus = async () => {
  if (!hasSelection.value) return
  
  bulkActionInProgress.value = true
  try {
    const selectedIds = selectedRows.value.map(show => show.id)
    const isCurrentlyActive = selectedRows.value[0].status === 'ABIERTO'
    
    await bulkToggleStatus(selectedIds, !isCurrentlyActive)
    showSuccessToast(`${selectedCount.value} shows actualizados correctamente`)
    clearSelection()
  } catch (error) {
    console.error('Bulk toggle status error:', error)
    showErrorToast('Error al actualizar el estado de los shows')
  } finally {
    bulkActionInProgress.value = false
  }
}

const handleBulkDelete = async () => {
  if (!hasSelection.value) return
  
  try {
    const modalId = await openModal({
      title: 'Eliminar Shows Seleccionados',
      size: 'md',
      variant: 'confirmation',
      context: {
        message: `¿Estás seguro de que deseas eliminar ${selectedCount.value} shows seleccionados?`,
        confirmText: 'Eliminar Todo',
        cancelText: 'Cancelar',
        variant: 'danger'
      }
    })
    modals.value.bulkDelete = true
  } catch (error) {
    console.error('Error opening bulk delete modal:', error)
    showErrorToast('Error al abrir la confirmación de eliminación masiva')
  }
}

const handleExportSelection = async () => {
  if (!hasSelection.value) return
  
  try {
    await exportSelection('csv', {
      filename: `shows-selection-${Date.now()}`,
      columns: ['name', 'status', 'venue', 'capacity', 'createdAt']
    })
  } catch (error) {
    console.error('Export selection error:', error)
    showErrorToast('Error al exportar la selección')
  }
}

// ==========================================
// EXPORT HANDLERS
// ==========================================

const handleExportAll = async (format: 'csv' | 'json' | 'xlsx' = 'csv') => {
  try {
    await exportData(format, {
      filename: `shows-export-${Date.now()}`,
      columns: ['name', 'status', 'venue', 'capacity', 'leadTimeMinutes', 'createdAt']
    })
  } catch (error) {
    console.error('Export error:', error)
    showErrorToast('Error al exportar los datos')
  }
}

// ==========================================
// FILTER HANDLERS
// ==========================================

const handleFilterChange = (key: string, value: any) => {
  updateFilter(key, value)
}

const handleClearFilters = () => {
  clearFilters()
  clearSearch()
}

const handleSearchChange = (query: string) => {
  setSearchQuery(query)
}

// ==========================================
// TABLE EVENT HANDLERS
// ==========================================

const handleRowClick = (show: Show) => {
  handleEditShow(show)
}

const handleRowSelect = (show: Show) => {
  selectRow(show)
}

const handleSelectAll = () => {
  if (allSelected.value) {
    deselectAll()
  } else {
    selectAll(true) // Select filtered data only
  }
}

const handleSort = (column: TableColumn, direction: 'asc' | 'desc') => {
  updateSort(column.key as keyof Show)
}

const handlePageChange = (page: number) => {
  goToPage(page)
}

const handlePageSizeChange = (size: number) => {
  changePageSize(size)
}

// ==========================================
// FORM HANDLERS
// ==========================================

const handleCreateSubmit = async (event: Event) => {
  event.preventDefault()
  const formData = new FormData(event.target as HTMLFormElement)
  const showData = {
    name: formData.get('name') as string,
    venue: formData.get('venue') as string,
    capacity: parseInt(formData.get('capacity') as string),
    leadTimeMinutes: parseInt(formData.get('leadTimeMinutes') as string),
    description: formData.get('description') as string
  }
  
  try {
    await createShow(showData as Show)
    modals.value.create = false
    showSuccessToast('Show creado correctamente')
  } catch (error) {
    console.error('Create show error:', error)
    showErrorToast('Error al crear el show')
  }
}

const handleEditSubmit = async (event: Event) => {
  event.preventDefault()
  if (!selectedShow.value) return
  
  const formData = new FormData(event.target as HTMLFormElement)
  const updateData = {
    name: formData.get('name') as string,
    venue: formData.get('venue') as string,
    capacity: parseInt(formData.get('capacity') as string),
    leadTimeMinutes: parseInt(formData.get('leadTimeMinutes') as string),
    description: formData.get('description') as string
  }
  
  try {
    await updateShow(selectedShow.value.id, updateData)
    modals.value.edit = false
    selectedShow.value = null
    showSuccessToast('Show actualizado correctamente')
  } catch (error) {
    console.error('Update show error:', error)
    showErrorToast('Error al actualizar el show')
  }
}

const handleDeleteConfirm = async () => {
  if (!selectedShow.value) return
  
  try {
    await deleteShow(selectedShow.value.id)
    modals.value.delete = false
    selectedShow.value = null
    showSuccessToast('Show eliminado correctamente')
  } catch (error) {
    console.error('Delete show error:', error)
    showErrorToast('Error al eliminar el show')
  }
}

const handleBulkDeleteConfirm = async () => {
  if (!hasSelection.value) return
  
  bulkActionInProgress.value = true
  try {
    const selectedIds = selectedRows.value.map(show => show.id)
    await bulkDelete(selectedIds)
    modals.value.bulkDelete = false
    clearSelection()
    showSuccessToast(`${selectedIds.length} shows eliminados correctamente`)
  } catch (error) {
    console.error('Bulk delete error:', error)
    showErrorToast('Error al eliminar los shows seleccionados')
  } finally {
    bulkActionInProgress.value = false
  }
}

// ==========================================
// LIFECYCLE
// ==========================================

onMounted(() => {
  // Initialize any needed data or watchers
  console.log('ShowsView mounted with', shows.value.length, 'shows')
})
</script>

<template>
  <div class="shows-view p-6 space-y-6">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Gestión de Shows</h1>
        <p class="mt-2 text-gray-600">Administrar espectáculos y configuraciones en tiempo real</p>
      </div>
      
      <div class="flex items-center gap-3">
        <BaseButton
          @click="handleExportAll('csv')"
          variant="secondary"
          :disabled="isEmpty"
        >
          Exportar
        </BaseButton>
        
        <BaseButton
          @click="handleCreateShow"
          variant="primary"
        >
          Nuevo Show
        </BaseButton>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div class="bg-white rounded-lg border p-4">
        <div class="text-2xl font-bold text-gray-900">{{ showsStats.total }}</div>
        <div class="text-sm text-gray-600">Total Shows</div>
      </div>
      
      <div class="bg-white rounded-lg border p-4">
        <div class="text-2xl font-bold text-green-600">{{ showsStats.visible }}</div>
        <div class="text-sm text-gray-600">Visibles</div>
      </div>
      
      <div class="bg-white rounded-lg border p-4">
        <div class="text-2xl font-bold text-gray-500">{{ showsStats.hidden }}</div>
        <div class="text-sm text-gray-600">Ocultos</div>
      </div>
      
      <div class="bg-white rounded-lg border p-4">
        <div class="text-2xl font-bold text-blue-600">{{ showsStats.withEvents }}</div>
        <div class="text-sm text-gray-600">Con Eventos</div>
      </div>
      
      <div class="bg-white rounded-lg border p-4">
        <div class="text-2xl font-bold text-orange-600">{{ showsStats.withoutEvents }}</div>
        <div class="text-sm text-gray-600">Sin Eventos</div>
      </div>
    </div>

    <!-- Filters & Search -->
    <div class="bg-white rounded-lg border p-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-4">
          <!-- Search Input -->
          <div class="relative">
            <input
              type="text"
              :value="searchQuery"
              @input="handleSearchChange(($event.target as HTMLInputElement).value)"
              placeholder="Buscar shows..."
              class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <!-- Filter Toggle -->
          <BaseButton
            @click="showFiltersPanel = !showFiltersPanel"
            variant="secondary"
            size="sm"
            :class="{ 'bg-gray-50': showFiltersPanel }"
          >
            Filtros
            <span v-if="Object.keys(activeFilters).length > 0" class="ml-1 bg-indigo-600 text-white rounded-full px-2 py-0.5 text-xs">
              {{ Object.keys(activeFilters).length }}
            </span>
          </BaseButton>

          <!-- Clear Filters -->
          <BaseButton
            v-if="searchQuery || Object.keys(activeFilters).length > 0"
            @click="handleClearFilters"
            variant="ghost"
            size="sm"
          >
            Limpiar
          </BaseButton>
        </div>

        <!-- Results Info -->
        <div class="text-sm text-gray-500">
          Mostrando {{ filteredData.length }} de {{ shows.length }} shows
          <span v-if="searchQuery || Object.keys(activeFilters).length > 0">
            (filtrados)
          </span>
        </div>
      </div>

      <!-- Expandable Filters Panel -->
      <div v-if="showFiltersPanel" class="mt-4 pt-4 border-t border-gray-200">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <!-- Visibility Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Visibilidad</label>
            <select
              :value="filters.is_visible ?? ''"
              @change="handleFilterChange('is_visible', ($event.target as HTMLSelectElement).value === '' ? null : ($event.target as HTMLSelectElement).value === 'true')"
              class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">Todos</option>
              <option v-for="option in filterOptions.is_visible" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Events Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Eventos</label>
            <select
              :value="filters.current_events_count ?? ''"
              @change="handleFilterChange('current_events_count', ($event.target as HTMLSelectElement).value === '' ? null : parseInt(($event.target as HTMLSelectElement).value))"
              class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">Todos</option>
              <option value="0">Sin eventos</option>
              <option value="1">Con eventos (1+)</option>
            </select>
          </div>

          <!-- Duration Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Duración mínima (min)</label>
            <input
              type="number"
              :value="filters.duration_estimated || ''"
              @input="handleFilterChange('duration_estimated', parseInt(($event.target as HTMLInputElement).value) || null)"
              placeholder="0"
              class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Bulk Actions Bar -->
    <div v-if="hasSelection" class="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <span class="text-sm font-medium text-indigo-900">
            {{ selectedCount }} {{ selectedCount === 1 ? 'show seleccionado' : 'shows seleccionados' }}
          </span>
          <BaseButton
            @click="clearSelection"
            variant="ghost"
            size="sm"
            class="ml-4 text-indigo-700"
          >
            Limpiar selección
          </BaseButton>
        </div>

        <div class="flex items-center gap-2">
          <BaseButton
            v-for="action in bulkActionsAvailable"
            :key="action.key"
            @click="action.action"
            :variant="action.variant || 'secondary'"
            size="sm"
            :disabled="!action.enabled || bulkActionInProgress"
          >
            {{ action.label }}
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Main Table -->
    <div class="bg-white rounded-lg border overflow-hidden">
      <BaseTable
        :data="showsWithTodayEvents"
        :columns="tableColumns"
        :loading="showsLoading"
        :selectable="true"
        :selected="selectedRows"
        :all-selected="allSelected"
        :some-selected="someSelected"
        :sort-by="sortBy"
        :sort-direction="sortDirection"
        @select="handleRowSelect"
        @select-all="handleSelectAll"
        @row-click="handleRowClick"
        @sort="handleSort"
        class="min-w-full"
      >
        <!-- Custom Status Column -->
        <template #cell-is_visible="{ value }">
          <span :class="value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
            {{ value ? 'Visible' : 'Oculto' }}
          </span>
        </template>

        <!-- Custom Actions Column -->
        <template #actions="{ row }">
          <div class="flex items-center gap-2">
            <BaseButton
              @click="handleEditShow(row)"
              variant="ghost"
              size="sm"
              class="text-gray-400 hover:text-indigo-600"
            >
              Editar
            </BaseButton>
            <BaseButton
              @click="handleDeleteShow(row)"
              variant="ghost"
              size="sm"
              class="text-gray-400 hover:text-red-600"
            >
              Eliminar
            </BaseButton>
          </div>
        </template>

        <!-- Empty State -->
        <template #empty>
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM6 6v12h12V6H6zm3 3a1 1 0 112 0v4a1 1 0 11-2 0V9zm6 0a1 1 0 112 0v4a1 1 0 11-2 0V9z"/>
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No hay shows</h3>
            <p class="mt-1 text-sm text-gray-500">Comienza creando tu primer espectáculo</p>
            <div class="mt-6">
              <BaseButton @click="handleCreateShow" variant="primary">
                Crear Primer Show
              </BaseButton>
            </div>
          </div>
        </template>
      </BaseTable>


    </div>

    <!-- Modals -->
    <!-- Create Show Modal -->
    <BaseModal
      :is-open="modals.create"
      title="Crear Nuevo Show"
      size="lg"
      @close="modals.create = false"
    >
      <div class="p-6">
        <form @submit.prevent="handleCreateSubmit">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Nombre del Show</label>
              <input name="name" type="text" required class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Venue</label>
              <input name="venue" type="text" required class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Capacidad</label>
              <input name="capacity" type="number" required class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Lead Time (minutos)</label>
              <input name="leadTimeMinutes" type="number" required value="30" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Descripción</label>
              <textarea name="description" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" rows="3"></textarea>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <BaseButton type="button" variant="secondary" @click="modals.create = false">
              Cancelar
            </BaseButton>
            <BaseButton type="submit" variant="primary">
              Crear Show
            </BaseButton>
          </div>
        </form>
      </div>
    </BaseModal>

    <!-- Edit Show Modal -->
    <BaseModal
      :is-open="modals.edit"
      :title="selectedShow ? `Editar Show: ${selectedShow.name}` : 'Editar Show'"
      size="lg"
      @close="modals.edit = false; selectedShow = null"
    >
      <div v-if="selectedShow" class="p-6">
        <form @submit.prevent="handleEditSubmit">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Nombre del Show</label>
              <input name="name" type="text" required :value="selectedShow.name" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Venue</label>
              <input name="venue" type="text" required :value="selectedShow.venue" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Capacidad</label>
              <input name="capacity" type="number" required :value="selectedShow.capacity" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Lead Time (minutos)</label>
              <input name="leadTimeMinutes" type="number" required :value="selectedShow.leadTimeMinutes" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Descripción</label>
              <textarea name="description" :value="selectedShow.description || ''" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" rows="3"></textarea>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <BaseButton type="button" variant="secondary" @click="modals.edit = false; selectedShow = null">
              Cancelar
            </BaseButton>
            <BaseButton type="submit" variant="primary">
              Actualizar Show
            </BaseButton>
          </div>
        </form>
      </div>
    </BaseModal>

    <!-- Delete Confirmation Modal -->
    <BaseModal
      :is-open="modals.delete"
      title="Confirmar Eliminación"
      size="md"
      variant="warning"
      @close="modals.delete = false; selectedShow = null"
    >
      <div v-if="selectedShow" class="p-6">
        <div class="flex items-center">
          <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.5 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Eliminar Show
            </h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
                ¿Estás seguro de que deseas eliminar el show "{{ selectedShow.name }}"? Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
        </div>
        
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <BaseButton
            @click="handleDeleteConfirm"
            variant="danger"
            class="w-full sm:w-auto sm:ml-3"
          >
            Eliminar
          </BaseButton>
          <BaseButton
            @click="modals.delete = false; selectedShow = null"
            variant="secondary"
            class="mt-3 w-full sm:mt-0 sm:w-auto"
          >
            Cancelar
          </BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- Bulk Delete Confirmation Modal -->
    <BaseModal
      :is-open="modals.bulkDelete"
      title="Eliminar Shows Seleccionados"
      size="md"
      variant="warning"
      @close="modals.bulkDelete = false"
    >
      <div class="p-6">
        <div class="flex items-center">
          <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.5 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Eliminar {{ selectedCount }} Shows
            </h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
                ¿Estás seguro de que deseas eliminar los {{ selectedCount }} shows seleccionados? Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
        </div>
        
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <BaseButton
            @click="handleBulkDeleteConfirm"
            variant="danger"
            :loading="bulkActionInProgress"
            class="w-full sm:w-auto sm:ml-3"
          >
            {{ bulkActionInProgress ? 'Eliminando...' : 'Eliminar Todo' }}
          </BaseButton>
          <BaseButton
            @click="modals.bulkDelete = false"
            variant="secondary"
            :disabled="bulkActionInProgress"
            class="mt-3 w-full sm:mt-0 sm:w-auto"
          >
            Cancelar
          </BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.shows-view {
  min-height: 100vh;
}

/* Custom scrollbar for table */
.table-container {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
}

.table-container::-webkit-scrollbar {
  height: 8px;
  width: 8px;
}

.table-container::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.table-container::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}
</style>