import { ref, computed } from 'vue'
import { useNotifications } from './useNotifications'
import type { FileUploadState, ImportData } from '@/types/api'

export function useFileUpload() {
  const { showSuccessToast, showErrorToast, showWarningToast } = useNotifications()

  // Estado reactivo
  const state = ref<FileUploadState>({
    isDragOver: false,
    isUploading: false,
    uploadProgress: 0,
    selectedFile: null,
    validationResults: null,
    error: null
  })

  // Computed properties
  const hasFile = computed(() => state.value.selectedFile !== null)
  const isValidFile = computed(() => {
    if (!state.value.selectedFile) return false
    return state.value.selectedFile.type === 'application/json' && 
           state.value.selectedFile.size <= 10 * 1024 * 1024 // 10MB max
  })
  const canUpload = computed(() => hasFile.value && isValidFile.value && !state.value.isUploading)

  // File validation
  const validateFile = (file: File): string | null => {
    if (!file) return 'No file selected'
    
    // Check file type
    if (file.type !== 'application/json') {
      return 'Only JSON files are allowed'
    }
    
    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return 'File size must be less than 10MB'
    }
    
    // Check file name
    if (!file.name.toLowerCase().endsWith('.json')) {
      return 'File must have .json extension'
    }
    
    return null
  }

  // Parse JSON file content
  const parseJsonFile = (file: File): Promise<ImportData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string
          const data = JSON.parse(content)
          
          // Basic structure validation
          if (!data.metadata || !data.events) {
            reject(new Error('Invalid JSON structure. Expected metadata and events properties.'))
            return
          }
          
          // Validate metadata
          if (!data.metadata.extraction_time || !data.metadata.total_events || !data.metadata.source) {
            reject(new Error('Invalid metadata. Missing required properties.'))
            return
          }
          
          // Validate events array
          if (!Array.isArray(data.events)) {
            reject(new Error('Events must be an array.'))
            return
          }
          
          resolve(data as ImportData)
        } catch (error) {
          reject(new Error('Invalid JSON format: ' + (error as Error).message))
        }
      }
      
      reader.onerror = () => {
        reject(new Error('Error reading file'))
      }
      
      reader.readAsText(file)
    })
  }

  // Handle file selection
  const selectFile = async (file: File) => {
    const error = validateFile(file)
    
    if (error) {
      state.value.error = error
      showErrorToast(error)
      return false
    }
    
    state.value.selectedFile = file
    state.value.error = null
    
    try {
      // Parse and validate JSON structure
      await parseJsonFile(file)
      showSuccessToast(`File "${file.name}" loaded successfully`)
      return true
    } catch (error) {
      state.value.error = (error as Error).message
      showErrorToast((error as Error).message)
      return false
    }
  }

  // Handle drag events
  const onDragEnter = (e: DragEvent) => {
    e.preventDefault()
    state.value.isDragOver = true
  }

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault()
    state.value.isDragOver = false
  }

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
  }

  const onDrop = async (e: DragEvent) => {
    e.preventDefault()
    state.value.isDragOver = false
    
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      await selectFile(files[0])
    }
  }

  // Handle file input change
  const onFileInputChange = async (e: Event) => {
    const input = e.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      await selectFile(input.files[0])
    }
  }

  // Get file content as ImportData
  const getFileContent = async (): Promise<ImportData | null> => {
    if (!state.value.selectedFile) return null
    
    try {
      return await parseJsonFile(state.value.selectedFile)
    } catch (error) {
      state.value.error = (error as Error).message
      return null
    }
  }

  // Clear selected file
  const clearFile = () => {
    state.value.selectedFile = null
    state.value.error = null
    state.value.validationResults = null
  }

  // Reset state
  const reset = () => {
    state.value = {
      isDragOver: false,
      isUploading: false,
      uploadProgress: 0,
      selectedFile: null,
      validationResults: null,
      error: null
    }
  }

  return {
    // State
    state: computed(() => state.value),
    
    // Computed
    hasFile,
    isValidFile,
    canUpload,
    
    // Methods
    selectFile,
    getFileContent,
    clearFile,
    reset,
    
    // Drag & Drop handlers
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    onFileInputChange
  }
}