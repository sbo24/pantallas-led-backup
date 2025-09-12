<template>
  <div class="file-upload-zone">
    <!-- Drop Zone -->
    <div
      @dragenter="onDragEnter"
      @dragleave="onDragLeave"
      @dragover="onDragOver"
      @drop="onDrop"
      :class="[
        'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
        state.isDragOver
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      ]"
    >
      <!-- Hidden file input -->
      <input
        ref="fileInput"
        type="file"
        accept=".json,application/json"
        @change="onFileInputChange"
        class="hidden"
      />

      <!-- Upload Icon -->
      <div class="mx-auto mb-4">
        <DocumentArrowUpIcon
          :class="[
            'mx-auto h-12 w-12',
            state.isDragOver ? 'text-blue-500' : 'text-gray-400'
          ]"
        />
      </div>

      <!-- Upload Text -->
      <div v-if="!hasFile" class="space-y-2">
        <p class="text-lg font-medium text-gray-900">
          {{ state.isDragOver ? 'Drop JSON file here' : 'Upload Import Data' }}
        </p>
        <p class="text-sm text-gray-600">
          Drag and drop a JSON file here, or 
          <button
            @click="triggerFileInput"
            class="text-blue-600 hover:text-blue-500 underline"
          >
            browse files
          </button>
        </p>
        <p class="text-xs text-gray-500">
          JSON files only, max 10MB
        </p>
      </div>

      <!-- Selected File Info -->
      <div v-else class="space-y-4">
        <div class="flex items-center justify-center space-x-3">
          <DocumentIcon class="h-8 w-8 text-blue-500" />
          <div class="text-left">
            <p class="text-sm font-medium text-gray-900">
              {{ state.selectedFile?.name }}
            </p>
            <p class="text-xs text-gray-500">
              {{ formatFileSize(state.selectedFile?.size || 0) }}
            </p>
          </div>
        </div>

        <!-- File Processing Status -->
        <div class="text-center text-sm text-gray-600">
          Archivo seleccionado y validándose automáticamente...
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="state.error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
        <div class="flex items-center">
          <ExclamationTriangleIcon class="h-5 w-5 text-red-500 mr-2" />
          <p class="text-sm text-red-700">{{ state.error }}</p>
        </div>
      </div>

      <!-- Upload Progress -->
      <div v-if="state.isUploading" class="mt-4">
        <div class="bg-gray-200 rounded-full h-2">
          <div
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${state.uploadProgress}%` }"
          ></div>
        </div>
        <p class="text-sm text-gray-600 mt-2">
          Uploading... {{ state.uploadProgress }}%
        </p>
      </div>
    </div>

    <!-- File Preview (if valid) -->
    <div v-if="hasFile && isValidFile && !state.error" class="mt-6">
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 class="text-sm font-medium text-gray-900 mb-3">File Preview</h4>
        
        <!-- File Stats -->
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-600">File name:</span>
            <span class="ml-2 font-medium">{{ state.selectedFile?.name }}</span>
          </div>
          <div>
            <span class="text-gray-600">File size:</span>
            <span class="ml-2 font-medium">{{ formatFileSize(state.selectedFile?.size || 0) }}</span>
          </div>
          <div>
            <span class="text-gray-600">Format:</span>
            <span class="ml-2 font-medium">JSON</span>
          </div>
          <div>
            <span class="text-gray-600">Status:</span>
            <span class="ml-2 text-green-600 font-medium">
              <CheckCircleIcon class="inline h-4 w-4 mr-1" />
              Valid
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useFileUpload } from '@/composables/useFileUpload'
import {
  DocumentArrowUpIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/vue/24/outline'

// Props
interface Props {
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

// Emits
interface Emits {
  fileSelected: [file: File]
  fileCleared: []
  error: [error: string]
  proceed: [file: File]
}

const emit = defineEmits<Emits>()

// Composable
const {
  state,
  hasFile,
  isValidFile,
  canUpload,
  selectFile,
  clearFile: clearFileInternal,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop: onDropInternal,
  onFileInputChange: onFileInputChangeInternal
} = useFileUpload()

// Refs
const fileInput = ref<HTMLInputElement>()

// Methods
const triggerFileInput = () => {
  if (props.disabled) return
  fileInput.value?.click()
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Enhanced event handlers that emit events
const onDrop = async (e: DragEvent) => {
  if (props.disabled) return
  
  await onDropInternal(e)
  if (state.value.selectedFile && isValidFile.value) {
    // Auto-proceed with file validation and processing
    emit('proceed', state.value.selectedFile)
  } else if (state.value.error) {
    emit('error', state.value.error)
  }
}

const onFileInputChange = async (e: Event) => {
  if (props.disabled) return
  
  await onFileInputChangeInternal(e)
  if (state.value.selectedFile && isValidFile.value) {
    // Auto-proceed with file validation and processing
    emit('proceed', state.value.selectedFile)
  } else if (state.value.error) {
    emit('error', state.value.error)
  }
}

const clearFile = () => {
  if (props.disabled) return
  
  clearFileInternal()
  emit('fileCleared')
}

// Expose methods for parent component
defineExpose({
  hasFile,
  isValidFile,
  canUpload,
  getFile: () => state.value.selectedFile,
  clearFile
})
</script>

<style scoped>
.file-upload-zone {
  @apply w-full;
}
</style>