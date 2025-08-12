import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useTable } from '../useTable'
import type { TableColumn } from '../useTable'

// Mock the notifications composable
const mockShowSuccessToast = vi.fn()
const mockShowErrorToast = vi.fn()
vi.mock('../useNotifications', () => ({
  useNotifications: () => ({
    showSuccessToast: mockShowSuccessToast,
    showErrorToast: mockShowErrorToast
  })
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Test data interface
interface TestItem {
  id: number
  name: string
  category: string
  price: number
  active: boolean
  createdAt: string
}

describe('useTable', () => {
  let testData: TestItem[]
  
  const generateTestData = (count: number = 50): TestItem[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      category: i % 3 === 0 ? 'Electronics' : i % 3 === 1 ? 'Clothing' : 'Books',
      price: Math.floor(Math.random() * 1000) + 10,
      active: Math.random() > 0.3,
      createdAt: new Date(2024, 0, i + 1).toISOString()
    }))
  }

  beforeEach(() => {
    testData = generateTestData()
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic functionality', () => {
    it('should initialize with provided data', () => {
      const data = ref(testData.slice(0, 10))
      const { 
        data: tableData, 
        paginatedData, 
        totalItems,
        hasData,
        isEmpty
      } = useTable({ data })

      expect(tableData.value).toEqual(data.value)
      expect(totalItems.value).toBe(10)
      expect(hasData.value).toBe(true)
      expect(isEmpty.value).toBe(false)
      expect(paginatedData.value).toHaveLength(10) // Default page size 25, so all fit
    })

    it('should handle empty data', () => {
      const data = ref<TestItem[]>([])
      const { 
        totalItems, 
        hasData, 
        isEmpty, 
        paginatedData 
      } = useTable({ data })

      expect(totalItems.value).toBe(0)
      expect(hasData.value).toBe(false)
      expect(isEmpty.value).toBe(true)
      expect(paginatedData.value).toHaveLength(0)
    })

    it('should initialize with default options', () => {
      const data = ref(testData)
      const { 
        currentPage, 
        pageSize, 
        sortBy, 
        sortDirection,
        searchQuery 
      } = useTable({ data })

      expect(currentPage.value).toBe(1)
      expect(pageSize.value).toBe(25)
      expect(sortBy.value).toBeNull()
      expect(sortDirection.value).toBe('asc')
      expect(searchQuery.value).toBe('')
    })
  })

  describe('Pagination functionality', () => {
    it('should paginate data correctly', () => {
      const data = ref(testData) // 50 items
      const { 
        paginatedData, 
        pagination, 
        totalPages 
      } = useTable({ 
        data, 
        defaultPageSize: 10 
      })

      expect(paginatedData.value).toHaveLength(10)
      expect(paginatedData.value[0]).toEqual(testData[0])
      expect(totalPages.value).toBe(5)
      expect(pagination.value).toEqual({
        currentPage: 1,
        pageSize: 10,
        totalItems: 50,
        totalPages: 5
      })
    })

    it('should navigate between pages', () => {
      const data = ref(testData)
      const { 
        paginatedData, 
        currentPage, 
        goToPage, 
        nextPage, 
        previousPage 
      } = useTable({ 
        data, 
        defaultPageSize: 10 
      })

      // Test goToPage
      goToPage(3)
      expect(currentPage.value).toBe(3)
      expect(paginatedData.value[0]).toEqual(testData[20])

      // Test nextPage
      nextPage()
      expect(currentPage.value).toBe(4)
      expect(paginatedData.value[0]).toEqual(testData[30])

      // Test previousPage
      previousPage()
      expect(currentPage.value).toBe(3)
      expect(paginatedData.value[0]).toEqual(testData[20])
    })

    it('should handle page bounds correctly', () => {
      const data = ref(testData)
      const { 
        currentPage, 
        goToPage, 
        nextPage, 
        previousPage,
        totalPages
      } = useTable({ 
        data, 
        defaultPageSize: 10 
      })

      // Try to go beyond last page
      goToPage(10)
      expect(currentPage.value).toBe(totalPages.value) // Should be 5

      // Try to go to page 0
      goToPage(0)
      expect(currentPage.value).toBe(1)

      // Test nextPage at last page
      goToPage(totalPages.value)
      nextPage()
      expect(currentPage.value).toBe(totalPages.value) // Should stay at last page

      // Test previousPage at first page
      goToPage(1)
      previousPage()
      expect(currentPage.value).toBe(1) // Should stay at first page
    })

    it('should change page size correctly', () => {
      const data = ref(testData)
      const { 
        pageSize, 
        changePageSize, 
        paginatedData, 
        totalPages, 
        currentPage 
      } = useTable({ data })

      changePageSize(10)
      expect(pageSize.value).toBe(10)
      expect(paginatedData.value).toHaveLength(10)
      expect(totalPages.value).toBe(5)
      expect(currentPage.value).toBe(1) // Should reset to first page
    })

    it('should provide navigation helpers', () => {
      const data = ref(testData)
      const { 
        currentPage, 
        goToPage,
        goToFirstPage, 
        goToLastPage, 
        totalPages 
      } = useTable({ 
        data, 
        defaultPageSize: 10 
      })

      goToPage(3)
      expect(currentPage.value).toBe(3)

      goToFirstPage()
      expect(currentPage.value).toBe(1)

      goToLastPage()
      expect(currentPage.value).toBe(totalPages.value)
    })
  })

  describe('Sorting functionality', () => {
    it('should sort data by column', () => {
      const data = ref(testData.slice(0, 5))
      const { sortedData, updateSort, sortBy, sortDirection } = useTable({ data })

      // Sort by name ascending
      updateSort('name')
      expect(sortBy.value).toBe('name')
      expect(sortDirection.value).toBe('asc')
      expect(sortedData.value[0].name).toBe('Item 1')

      // Sort by name descending
      updateSort('name')
      expect(sortDirection.value).toBe('desc')
      expect(sortedData.value[0].name).toBe('Item 5')
    })

    it('should sort numbers correctly', () => {
      const data = ref([
        { id: 1, name: 'A', price: 100 },
        { id: 2, name: 'B', price: 50 },
        { id: 3, name: 'C', price: 200 }
      ])
      const { sortedData, updateSort } = useTable({ data })

      updateSort('price')
      expect(sortedData.value.map(item => item.price)).toEqual([50, 100, 200])

      // Toggle to descending
      updateSort('price')
      expect(sortedData.value.map(item => item.price)).toEqual([200, 100, 50])
    })

    it('should sort dates correctly', () => {
      const data = ref([
        { id: 1, date: new Date('2024-03-01') },
        { id: 2, date: new Date('2024-01-01') },
        { id: 3, date: new Date('2024-02-01') }
      ])
      const { sortedData, updateSort } = useTable({ data })

      updateSort('date')
      expect(sortedData.value.map(item => item.id)).toEqual([2, 3, 1])
    })

    it('should handle null/undefined values in sorting', () => {
      const data = ref([
        { id: 1, value: 10 },
        { id: 2, value: null },
        { id: 3, value: 5 },
        { id: 4, value: undefined }
      ])
      const { sortedData, updateSort } = useTable({ data })

      updateSort('value')
      // Non-null values should come first, then null/undefined
      expect(sortedData.value.map(item => item.id)).toEqual([3, 1, 2, 4])
    })

    it('should provide sort control methods', () => {
      const data = ref(testData)
      const { 
        setSortBy, 
        clearSort, 
        toggleSort, 
        sortBy, 
        sortDirection 
      } = useTable({ data })

      setSortBy('name', 'desc')
      expect(sortBy.value).toBe('name')
      expect(sortDirection.value).toBe('desc')

      clearSort()
      expect(sortBy.value).toBeNull()
      expect(sortDirection.value).toBe('asc')

      toggleSort('price')
      expect(sortBy.value).toBe('price')
      expect(sortDirection.value).toBe('asc')
    })
  })

  describe('Filtering functionality', () => {
    it('should filter data by exact match', () => {
      const data = ref(testData.slice(0, 10))
      const { 
        filteredData, 
        updateFilter, 
        activeFilters 
      } = useTable({ data })

      updateFilter('category', 'Electronics')
      expect(activeFilters.value).toEqual({ category: 'Electronics' })
      expect(filteredData.value.every(item => item.category === 'Electronics')).toBe(true)
    })

    it('should filter data by array inclusion', () => {
      const data = ref(testData.slice(0, 10))
      const { filteredData, updateFilter } = useTable({ data })

      updateFilter('category', ['Electronics', 'Books'])
      expect(filteredData.value.every(item => 
        ['Electronics', 'Books'].includes(item.category)
      )).toBe(true)
    })

    it('should filter data by range', () => {
      const data = ref([
        { id: 1, price: 50 },
        { id: 2, price: 150 },
        { id: 3, price: 250 }
      ])
      const { filteredData, updateFilter } = useTable({ data })

      updateFilter('price', { min: 100, max: 200 })
      expect(filteredData.value).toHaveLength(1)
      expect(filteredData.value[0].id).toBe(2)
    })

    it('should handle string contains filtering', () => {
      const data = ref([
        { id: 1, name: 'Apple iPhone' },
        { id: 2, name: 'Samsung Galaxy' },
        { id: 3, name: 'Apple iPad' }
      ])
      const { filteredData, updateFilter } = useTable({ data })

      updateFilter('name', 'Apple')
      expect(filteredData.value).toHaveLength(2)
      expect(filteredData.value.every(item => item.name.includes('Apple'))).toBe(true)
    })

    it('should provide filter management methods', () => {
      const data = ref(testData)
      const { 
        filters, 
        activeFilters, 
        updateFilter, 
        removeFilter, 
        clearFilters 
      } = useTable({ data })

      updateFilter('category', 'Electronics')
      updateFilter('active', true)
      expect(Object.keys(activeFilters.value)).toHaveLength(2)

      removeFilter('category')
      expect(activeFilters.value).toEqual({ active: true })

      clearFilters()
      expect(Object.keys(activeFilters.value)).toHaveLength(0)
      expect(filters.value).toEqual({})
    })

    it('should reset page when filters change', () => {
      const data = ref(testData)
      const { 
        currentPage, 
        goToPage, 
        updateFilter 
      } = useTable({ 
        data, 
        defaultPageSize: 10 // This gives us 5 pages with 50 items
      })

      goToPage(3)
      expect(currentPage.value).toBe(3)

      updateFilter('category', 'Electronics')
      expect(currentPage.value).toBe(1) // Should reset to page 1
    })
  })

  describe('Search functionality', () => {
    it('should search across all fields', async () => {
      const data = ref([
        { id: 1, name: 'Apple iPhone', category: 'Electronics' },
        { id: 2, name: 'Samsung TV', category: 'Electronics' },
        { id: 3, name: 'Book about Apple', category: 'Books' }
      ])
      const { filteredData, setSearchQuery } = useTable({ data, debounceMs: 0 })

      setSearchQuery('Apple')
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(filteredData.value).toHaveLength(2)
      expect(filteredData.value.every(item => 
        JSON.stringify(item).toLowerCase().includes('apple')
      )).toBe(true)
    })

    it('should handle search debouncing', async () => {
      const data = ref(testData)
      const { searchQuery, setSearchQuery } = useTable({ 
        data, 
        debounceMs: 100 
      })

      setSearchQuery('test1')
      setSearchQuery('test2')
      setSearchQuery('final')

      // Should not update immediately
      expect(searchQuery.value).toBe('')

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150))
      expect(searchQuery.value).toBe('final')
    })

    it('should provide search control methods', async () => {
      const data = ref(testData)
      const { 
        searchQuery, 
        setSearchQuery, 
        clearSearch 
      } = useTable({ data, debounceMs: 0 })

      setSearchQuery('test')
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(searchQuery.value).toBe('test')

      clearSearch()
      expect(searchQuery.value).toBe('')
    })
  })

  describe('Selection functionality', () => {
    it('should select and deselect rows', () => {
      const data = ref(testData.slice(0, 5))
      const { 
        selectedRows, 
        selectRow, 
        deselectRow, 
        isRowSelected,
        selectedCount
      } = useTable({ data })

      const firstItem = data.value[0]
      
      expect(selectedRows.value).toHaveLength(0)
      expect(isRowSelected(firstItem)).toBe(false)

      selectRow(firstItem)
      expect(selectedRows.value).toHaveLength(1)
      expect(selectedCount.value).toBe(1)
      expect(isRowSelected(firstItem)).toBe(true)

      deselectRow(firstItem)
      expect(selectedRows.value).toHaveLength(0)
      expect(isRowSelected(firstItem)).toBe(false)
    })

    it('should toggle row selection', () => {
      const data = ref(testData.slice(0, 5))
      const { 
        selectedRows, 
        toggleRowSelection, 
        isRowSelected 
      } = useTable({ data })

      const firstItem = data.value[0]

      toggleRowSelection(firstItem)
      expect(isRowSelected(firstItem)).toBe(true)
      expect(selectedRows.value).toHaveLength(1)

      toggleRowSelection(firstItem)
      expect(isRowSelected(firstItem)).toBe(false)
      expect(selectedRows.value).toHaveLength(0)
    })

    it('should select multiple rows', () => {
      const data = ref(testData.slice(0, 5))
      const { 
        selectedRows, 
        selectRows 
      } = useTable({ data })

      const itemsToSelect = data.value.slice(0, 3)
      selectRows(itemsToSelect)
      
      expect(selectedRows.value).toHaveLength(3)
      expect(selectedRows.value).toEqual(itemsToSelect)
    })

    it('should select all rows', () => {
      const data = ref(testData.slice(0, 5))
      const { 
        selectedRows, 
        selectAll, 
        allSelected,
        selectedCount
      } = useTable({ data, defaultPageSize: 5 })

      selectAll()
      expect(selectedRows.value).toHaveLength(5)
      expect(allSelected.value).toBe(true)
      expect(selectedCount.value).toBe(5)
    })

    it('should handle partial selection state', () => {
      const data = ref(testData.slice(0, 5))
      const { 
        selectedRows, 
        selectRow, 
        allSelected, 
        someSelected 
      } = useTable({ data, defaultPageSize: 5 })

      // Select first item
      selectRow(data.value[0])
      expect(allSelected.value).toBe(false)
      expect(someSelected.value).toBe(true)

      // Select all items
      data.value.forEach(item => selectRow(item))
      expect(allSelected.value).toBe(true)
      expect(someSelected.value).toBe(false)
    })

    it('should clear selection', () => {
      const data = ref(testData.slice(0, 5))
      const { 
        selectedRows, 
        selectAll, 
        clearSelection, 
        hasSelection 
      } = useTable({ data })

      selectAll()
      expect(hasSelection.value).toBe(true)

      clearSelection()
      expect(selectedRows.value).toHaveLength(0)
      expect(hasSelection.value).toBe(false)
    })
  })

  describe('Export functionality', () => {
    // Mock URL and document methods for download testing
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
    const mockRevokeObjectURL = vi.fn()
    const mockClick = vi.fn()
    const mockAppendChild = vi.fn()
    const mockRemoveChild = vi.fn()

    beforeEach(() => {
      global.URL.createObjectURL = mockCreateObjectURL
      global.URL.revokeObjectURL = mockRevokeObjectURL
      
      const mockElement = {
        click: mockClick,
        href: '',
        download: ''
      }
      
      vi.spyOn(document, 'createElement').mockReturnValue(mockElement as any)
      vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
      vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)
    })

    it('should export data as CSV', async () => {
      const data = ref([
        { id: 1, name: 'Item 1', price: 100 },
        { id: 2, name: 'Item 2', price: 200 }
      ])
      const { exportData } = useTable({ data })

      await exportData('csv', { filename: 'test-export' })

      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockAppendChild).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockRemoveChild).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalled()
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Datos exportados exitosamente como CSV')
    })

    it('should export data as JSON', async () => {
      const data = ref([
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ])
      const { exportData } = useTable({ data })

      await exportData('json')

      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Datos exportados exitosamente como JSON')
    })

    it('should export selection only', async () => {
      const data = ref(testData.slice(0, 5))
      const { 
        exportSelection, 
        selectRow 
      } = useTable({ data })

      // Select first two items
      selectRow(data.value[0])
      selectRow(data.value[1])

      await exportSelection('csv')

      expect(mockShowSuccessToast).toHaveBeenCalledWith('2 filas exportadas como CSV')
    })

    it('should handle export with custom columns', async () => {
      const data = ref([
        { id: 1, name: 'Item 1', price: 100, secret: 'hidden' },
        { id: 2, name: 'Item 2', price: 200, secret: 'hidden' }
      ])
      const { exportData } = useTable({ data })

      await exportData('csv', { 
        columns: ['id', 'name'],
        filename: 'partial-export'
      })

      expect(mockShowSuccessToast).toHaveBeenCalled()
    })

    it('should show error when no selection for export', async () => {
      const data = ref(testData.slice(0, 5))
      const { exportSelection } = useTable({ data })

      await exportSelection('csv')

      expect(mockShowErrorToast).toHaveBeenCalledWith('No hay filas seleccionadas para exportar')
    })
  })

  describe('State persistence', () => {
    it('should persist state to localStorage', () => {
      const data = ref(testData)
      const { 
        goToPage, 
        changePageSize, 
        updateSort, 
        updateFilter, 
        setSearchQuery,
        persistState
      } = useTable({ 
        data, 
        persistState: 'test-table'
      })

      goToPage(2)
      changePageSize(10)
      updateSort('name')
      updateFilter('category', 'Electronics')
      setSearchQuery('test')

      persistState()

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'table-test-table',
        expect.stringContaining('"currentPage":2')
      )
    })

    it('should restore state from localStorage', () => {
      const mockState = JSON.stringify({
        currentPage: 3,
        pageSize: 15,
        sortBy: 'name',
        sortDirection: 'desc',
        filters: { category: 'Electronics' },
        searchQuery: 'test'
      })

      mockLocalStorage.getItem.mockReturnValue(mockState)

      const data = ref(testData)
      const { 
        currentPage, 
        pageSize, 
        sortBy, 
        sortDirection, 
        filters, 
        searchQuery 
      } = useTable({ 
        data, 
        persistState: 'test-table' 
      })

      expect(currentPage.value).toBe(3)
      expect(pageSize.value).toBe(15)
      expect(sortBy.value).toBe('name')
      expect(sortDirection.value).toBe('desc')
      expect(filters.value).toEqual({ category: 'Electronics' })
      expect(searchQuery.value).toBe('test')
    })

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const data = ref(testData)
      const { restoreState } = useTable({ 
        data, 
        persistState: 'test-table' 
      })

      expect(() => restoreState()).not.toThrow()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('Table reset and refresh', () => {
    it('should reset table to initial state', () => {
      const data = ref(testData)
      const { 
        currentPage, 
        pageSize, 
        sortBy, 
        filters, 
        searchQuery, 
        selectedRows,
        goToPage,
        changePageSize,
        updateSort,
        updateFilter,
        setSearchQuery,
        selectAll,
        resetTable
      } = useTable({ 
        data, 
        defaultSort: { key: 'id', direction: 'asc' },
        defaultPageSize: 20
      })

      // Make changes
      goToPage(3)
      changePageSize(10)
      updateSort('name')
      updateFilter('category', 'Electronics')
      setSearchQuery('test')
      selectAll()

      // Reset
      resetTable()

      expect(currentPage.value).toBe(1)
      expect(pageSize.value).toBe(20)
      expect(sortBy.value).toBe('id')
      expect(filters.value).toEqual({})
      expect(searchQuery.value).toBe('')
      expect(selectedRows.value).toHaveLength(0)
    })

    it('should refresh data correctly', async () => {
      const data = ref(testData.slice(0, 10))
      const { refreshData, paginatedData } = useTable({ data })

      expect(paginatedData.value).toHaveLength(10)

      // Change data
      data.value = testData.slice(0, 5)
      refreshData()

      await nextTick()
      expect(paginatedData.value).toHaveLength(5)
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle data changes that affect current page', async () => {
      const data = ref(testData) // 50 items
      const { 
        currentPage, 
        goToPage, 
        totalPages 
      } = useTable({ 
        data, 
        defaultPageSize: 10 
      })

      goToPage(5) // Last page with 50 items
      expect(currentPage.value).toBe(5)

      // Reduce data to 20 items (2 pages)
      data.value = testData.slice(0, 20)

      await nextTick()
      expect(currentPage.value).toBe(2) // Should adjust to last valid page
      expect(totalPages.value).toBe(2)
    })

    it('should handle invalid page numbers', () => {
      const data = ref(testData)
      const { 
        currentPage, 
        goToPage, 
        totalPages 
      } = useTable({ 
        data, 
        defaultPageSize: 10 
      })

      goToPage(-5)
      expect(currentPage.value).toBe(1)

      goToPage(999)
      expect(currentPage.value).toBe(totalPages.value)
    })

    it('should handle sorting with mixed data types', () => {
      const data = ref([
        { id: 1, value: 'string' },
        { id: 2, value: 123 },
        { id: 3, value: null },
        { id: 4, value: undefined },
        { id: 5, value: new Date() }
      ])
      const { sortedData, updateSort } = useTable({ data })

      expect(() => updateSort('value')).not.toThrow()
      expect(sortedData.value).toHaveLength(5)
    })

    it('should handle empty search results', async () => {
      const data = ref(testData.slice(0, 5))
      const { 
        filteredData, 
        paginatedData, 
        setSearchQuery 
      } = useTable({ data, debounceMs: 0 })

      setSearchQuery('nonexistent')
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(filteredData.value).toHaveLength(0)
      expect(paginatedData.value).toHaveLength(0)
    })

    it('should handle disabled features gracefully', () => {
      const data = ref(testData.slice(0, 5))
      const { 
        selectRow, 
        selectedRows, 
        exportData 
      } = useTable({ 
        data,
        selectable: false,
        exportable: false 
      })

      // Selection should not work
      selectRow(data.value[0])
      expect(selectedRows.value).toHaveLength(0)

      // Export should return early
      expect(async () => await exportData('csv')).not.toThrow()
    })
  })
})