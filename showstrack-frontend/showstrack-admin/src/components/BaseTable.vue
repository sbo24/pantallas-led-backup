<template>
  <div class="bg-white shadow overflow-hidden rounded-md">
    <!-- Table Header -->
    <div v-if="title || slots.header || showSearch || showFilters" class="px-4 py-5 border-b border-gray-200 sm:px-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 v-if="title" class="text-lg leading-6 font-medium text-gray-900">
            {{ title }}
          </h3>
          <slot name="header" />
        </div>
        
        <div class="flex items-center gap-3">
          <!-- Search -->
          <div v-if="showSearch" class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon class="h-5 w-5 text-gray-400" />
            </div>
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="searchPlaceholder"
              class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              @input="handleSearch"
            />
          </div>
          
          <!-- Filters -->
          <slot name="filters" />
          
          <!-- Actions -->
          <slot name="actions" />
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <!-- Table Head -->
        <thead class="bg-gray-50">
          <tr>
            <!-- Select all checkbox -->
            <th v-if="selectable" class="w-4 px-6 py-3">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate="someSelected"
                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                @change="toggleSelectAll"
              />
            </th>
            
            <!-- Column headers -->
            <th
              v-for="column in columns"
              :key="column.key"
              :class="getHeaderClasses(column)"
              @click="handleSort(column)"
            >
              <div class="flex items-center gap-2">
                <span>{{ column.label }}</span>
                
                <!-- Sort indicators -->
                <div v-if="column.sortable" class="flex flex-col">
                  <ChevronUpIcon 
                    :class="getSortIconClasses(column, 'asc')"
                    class="h-3 w-3"
                  />
                  <ChevronDownIcon 
                    :class="getSortIconClasses(column, 'desc')"
                    class="h-3 w-3 -mt-1"
                  />
                </div>
              </div>
            </th>
            
            <!-- Actions column -->
            <th v-if="showActions" class="relative px-6 py-3">
              <span class="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        
        <!-- Table Body -->
        <tbody class="bg-white divide-y divide-gray-200">
          <!-- Loading state -->
          <tr v-if="loading">
            <td :colspan="totalColumns" class="px-6 py-4 text-center">
              <div class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="text-sm text-gray-500">{{ loadingText }}</span>
              </div>
            </td>
          </tr>
          
          <!-- Empty state -->
          <tr v-else-if="!data.length">
            <td :colspan="totalColumns" class="px-6 py-4 text-center">
              <div class="text-sm text-gray-500">
                {{ emptyText }}
              </div>
            </td>
          </tr>
          
          <!-- Data rows -->
          <tr 
            v-else
            v-for="(row, index) in paginatedData"
            :key="getRowKey(row, index)"
            :class="getRowClasses(row, index)"
          >
            <!-- Selection checkbox -->
            <td v-if="selectable" class="w-4 px-6 py-4">
              <input
                type="checkbox"
                :checked="isSelected(row)"
                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                @change="toggleSelect(row)"
              />
            </td>
            
            <!-- Data columns -->
            <td
              v-for="column in columns"
              :key="column.key"
              :class="getCellClasses(column)"
            >
              <slot 
                :name="`cell-${column.key}`" 
                :row="row" 
                :value="getColumnValue(row, column.key)" 
                :column="column"
                :index="index"
              >
                {{ formatCellValue(row, column) }}
              </slot>
            </td>
            
            <!-- Actions column -->
            <td v-if="showActions" class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <slot name="actions" :row="row" :index="index">
                <div class="flex items-center justify-end gap-2">
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    @click="$emit('edit', row)"
                  >
                    Editar
                  </BaseButton>
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    @click="$emit('delete', row)"
                  >
                    Eliminar
                  </BaseButton>
                </div>
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Pagination -->
    <div 
      v-if="showPagination && totalPages > 1" 
      class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6"
    >
      <div class="flex-1 flex justify-between sm:hidden">
        <BaseButton
          variant="secondary"
          size="sm"
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)"
        >
          Anterior
        </BaseButton>
        <BaseButton
          variant="secondary"
          size="sm"
          :disabled="currentPage === totalPages"
          @click="goToPage(currentPage + 1)"
        >
          Siguiente
        </BaseButton>
      </div>
      
      <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p class="text-sm text-gray-700">
            Mostrando 
            <span class="font-medium">{{ startItem }}</span>
            a 
            <span class="font-medium">{{ endItem }}</span>
            de 
            <span class="font-medium">{{ totalItems }}</span>
            resultados
          </p>
        </div>
        
        <div class="flex items-center gap-2">
          <BaseButton
            variant="secondary"
            size="sm"
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
          >
            <ChevronLeftIcon class="h-4 w-4" />
          </BaseButton>
          
          <div class="flex gap-1">
            <button
              v-for="page in visiblePages"
              :key="page"
              :class="getPageButtonClasses(page)"
              @click="goToPage(page)"
            >
              {{ page }}
            </button>
          </div>
          
          <BaseButton
            variant="secondary" 
            size="sm"
            :disabled="currentPage === totalPages"
            @click="goToPage(currentPage + 1)"
          >
            <ChevronRightIcon class="h-4 w-4" />
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useSlots, watch } from 'vue'
import { 
  MagnifyingGlassIcon, 
  ChevronUpIcon, 
  ChevronDownIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon 
} from '@heroicons/vue/24/outline'
import BaseButton from './BaseButton.vue'

export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  formatter?: (value: any, row: any) => string
}

export interface BaseTableProps {
  // Data
  data: any[]
  columns: TableColumn[]
  rowKey?: string | ((row: any) => string | number)
  
  // Features
  selectable?: boolean
  showActions?: boolean
  showSearch?: boolean
  showFilters?: boolean
  showPagination?: boolean
  
  // Pagination
  pageSize?: number
  currentPage?: number
  
  // Sorting
  defaultSort?: { key: string; direction: 'asc' | 'desc' }
  
  // UI
  title?: string
  loading?: boolean
  loadingText?: string
  emptyText?: string
  searchPlaceholder?: string
  
  // Row styling
  stripedRows?: boolean
  hoverRows?: boolean
}

const props = withDefaults(defineProps<BaseTableProps>(), {
  selectable: false,
  showActions: true,
  showSearch: false,
  showFilters: false,
  showPagination: true,
  pageSize: 10,
  currentPage: 1,
  loading: false,
  loadingText: 'Cargando...',
  emptyText: 'No hay datos disponibles',
  searchPlaceholder: 'Buscar...',
  stripedRows: true,
  hoverRows: true,
  rowKey: 'id'
})

const emit = defineEmits<{
  'update:currentPage': [page: number]
  'update:selectedRows': [rows: any[]]
  search: [query: string]
  sort: [column: TableColumn, direction: 'asc' | 'desc']
  edit: [row: any]
  delete: [row: any]
  'row-click': [row: any, index: number]
}>()

const slots = useSlots()

// Internal state
const searchQuery = ref('')
const selectedRows = ref<any[]>([])
const sortColumn = ref<string | null>(props.defaultSort?.key || null)
const sortDirection = ref<'asc' | 'desc'>(props.defaultSort?.direction || 'asc')
const internalCurrentPage = ref(props.currentPage)

// Computed
const totalColumns = computed(() => {
  let count = props.columns.length
  if (props.selectable) count++
  if (props.showActions) count++
  return count
})

const filteredData = computed(() => {
  if (!searchQuery.value) return props.data
  
  const query = searchQuery.value.toLowerCase()
  return props.data.filter(row => 
    props.columns.some(column => {
      const value = getColumnValue(row, column.key)
      return String(value).toLowerCase().includes(query)
    })
  )
})

const sortedData = computed(() => {
  if (!sortColumn.value) return filteredData.value
  
  const column = props.columns.find(col => col.key === sortColumn.value)
  if (!column?.sortable) return filteredData.value
  
  return [...filteredData.value].sort((a, b) => {
    const aValue = getColumnValue(a, column.key)
    const bValue = getColumnValue(b, column.key)
    
    let result = 0
    if (aValue < bValue) result = -1
    else if (aValue > bValue) result = 1
    
    return sortDirection.value === 'desc' ? -result : result
  })
})

const totalItems = computed(() => sortedData.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / props.pageSize))

const startItem = computed(() => {
  return Math.min((internalCurrentPage.value - 1) * props.pageSize + 1, totalItems.value)
})

const endItem = computed(() => {
  return Math.min(internalCurrentPage.value * props.pageSize, totalItems.value)
})

const paginatedData = computed(() => {
  if (!props.showPagination) return sortedData.value
  
  const start = (internalCurrentPage.value - 1) * props.pageSize
  const end = start + props.pageSize
  return sortedData.value.slice(start, end)
})

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = internalCurrentPage.value
  
  // Show up to 5 pages around current
  let start = Math.max(1, current - 2)
  let end = Math.min(total, current + 2)
  
  // Adjust to always show 5 pages if possible
  if (end - start < 4) {
    if (start === 1) {
      end = Math.min(total, start + 4)
    } else {
      start = Math.max(1, end - 4)
    }
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

const allSelected = computed(() => {
  return paginatedData.value.length > 0 && 
    paginatedData.value.every(row => selectedRows.value.includes(row))
})

const someSelected = computed(() => {
  return selectedRows.value.length > 0 && !allSelected.value
})

// Methods
const getRowKey = (row: any, index: number): string | number => {
  if (typeof props.rowKey === 'function') {
    return props.rowKey(row)
  }
  return row[props.rowKey] ?? index
}

const getColumnValue = (row: any, key: string): any => {
  return key.split('.').reduce((obj, k) => obj?.[k], row)
}

const formatCellValue = (row: any, column: TableColumn): string => {
  const value = getColumnValue(row, column.key)
  if (column.formatter) {
    return column.formatter(value, row)
  }
  return String(value ?? '')
}

const getHeaderClasses = (column: TableColumn): string => {
  const classes = [
    'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
  ]
  
  if (column.sortable) {
    classes.push('cursor-pointer hover:text-gray-700')
  }
  
  if (column.width) {
    classes.push(`w-${column.width}`)
  }
  
  return classes.join(' ')
}

const getCellClasses = (column: TableColumn): string => {
  const classes = ['px-6 py-4 whitespace-nowrap text-sm']
  
  if (column.align === 'center') {
    classes.push('text-center')
  } else if (column.align === 'right') {
    classes.push('text-right')
  } else {
    classes.push('text-left')
  }
  
  return classes.join(' ')
}

const getRowClasses = (row: any, index: number): string => {
  const classes = []
  
  if (props.stripedRows && index % 2 === 1) {
    classes.push('bg-gray-50')
  }
  
  if (props.hoverRows) {
    classes.push('hover:bg-gray-100')
  }
  
  if (isSelected(row)) {
    classes.push('bg-indigo-50')
  }
  
  return classes.join(' ')
}

const getSortIconClasses = (column: TableColumn, direction: 'asc' | 'desc'): string => {
  const classes = []
  
  if (sortColumn.value === column.key && sortDirection.value === direction) {
    classes.push('text-indigo-600')
  } else {
    classes.push('text-gray-400')
  }
  
  return classes.join(' ')
}

const getPageButtonClasses = (page: number): string => {
  const baseClasses = [
    'px-3 py-2 text-sm font-medium rounded-md transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-indigo-500'
  ]
  
  if (page === internalCurrentPage.value) {
    baseClasses.push('bg-indigo-600 text-white')
  } else {
    baseClasses.push('text-gray-700 hover:bg-gray-100')
  }
  
  return baseClasses.join(' ')
}

const isSelected = (row: any): boolean => {
  return selectedRows.value.some(selected => 
    getRowKey(selected, 0) === getRowKey(row, 0)
  )
}

const handleSearch = (): void => {
  emit('search', searchQuery.value)
  // Reset to first page when searching
  goToPage(1)
}

const handleSort = (column: TableColumn): void => {
  if (!column.sortable) return
  
  if (sortColumn.value === column.key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column.key
    sortDirection.value = 'asc'
  }
  
  emit('sort', column, sortDirection.value)
}

const toggleSelect = (row: any): void => {
  const index = selectedRows.value.findIndex(selected => 
    getRowKey(selected, 0) === getRowKey(row, 0)
  )
  
  if (index > -1) {
    selectedRows.value.splice(index, 1)
  } else {
    selectedRows.value.push(row)
  }
  
  emit('update:selectedRows', selectedRows.value)
}

const toggleSelectAll = (): void => {
  if (allSelected.value) {
    // Unselect all visible rows
    paginatedData.value.forEach(row => {
      const index = selectedRows.value.findIndex(selected => 
        getRowKey(selected, 0) === getRowKey(row, 0)
      )
      if (index > -1) {
        selectedRows.value.splice(index, 1)
      }
    })
  } else {
    // Select all visible rows
    paginatedData.value.forEach(row => {
      if (!isSelected(row)) {
        selectedRows.value.push(row)
      }
    })
  }
  
  emit('update:selectedRows', selectedRows.value)
}

const goToPage = (page: number): void => {
  if (page < 1 || page > totalPages.value) return
  
  internalCurrentPage.value = page
  emit('update:currentPage', page)
}

// Watch for external currentPage changes
watch(() => props.currentPage, (newPage) => {
  internalCurrentPage.value = newPage
})
</script>