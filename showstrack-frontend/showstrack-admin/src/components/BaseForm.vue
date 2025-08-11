<template>
  <form @submit="handleSubmit" :class="formClasses">
    <!-- Form header -->
    <div v-if="title || slots.header" class="mb-6">
      <slot name="header">
        <h2 v-if="title" class="text-lg font-medium text-gray-900 mb-2">
          {{ title }}
        </h2>
      </slot>
    </div>

    <!-- Form fields -->
    <div :class="fieldsContainerClasses">
      <slot :errors="errors" :values="formData" :set-field="setFieldValue" />
    </div>

    <!-- Form actions -->
    <div v-if="showActions || slots.actions" :class="actionsClasses">
      <slot name="actions" :errors="errors" :is-valid="isValid" :is-submitting="isSubmitting">
        <div class="flex justify-end gap-3">
          <BaseButton
            v-if="showCancel"
            type="button"
            variant="secondary"
            @click="handleCancel"
            :disabled="isSubmitting"
          >
            {{ cancelText }}
          </BaseButton>
          <BaseButton
            type="submit"
            variant="primary"
            :loading="isSubmitting"
            :disabled="!isValid || isSubmitting"
          >
            {{ submitText }}
          </BaseButton>
        </div>
      </slot>
    </div>

    <!-- Global error message -->
    <div v-if="globalError" class="mt-4">
      <div class="bg-red-50 border border-red-200 rounded-md p-4">
        <div class="flex">
          <ExclamationTriangleIcon class="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
          <div class="text-sm text-red-700">
            {{ globalError }}
          </div>
        </div>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, reactive, ref, useSlots, watch, readonly } from 'vue'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import BaseButton from './BaseButton.vue'

export interface FormField {
  name: string
  value?: any
  rules?: ValidationRule[]
}

export interface ValidationRule {
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  email?: boolean
  custom?: (value: any, formData: Record<string, any>) => string | null
  message?: string
}

export interface BaseFormProps {
  // Layout
  title?: string
  layout?: 'vertical' | 'horizontal'
  columns?: 1 | 2 | 3
  
  // Data
  initialData?: Record<string, any>
  fields?: FormField[]
  
  // Validation
  validateOnChange?: boolean
  validateOnBlur?: boolean
  showErrorSummary?: boolean
  
  // Actions
  showActions?: boolean
  showCancel?: boolean
  submitText?: string
  cancelText?: string
  
  // States
  loading?: boolean
}

const props = withDefaults(defineProps<BaseFormProps>(), {
  layout: 'vertical',
  columns: 1,
  validateOnChange: true,
  validateOnBlur: true,
  showErrorSummary: false,
  showActions: true,
  showCancel: false,
  submitText: 'Guardar',
  cancelText: 'Cancelar',
  loading: false
})

const emit = defineEmits<{
  submit: [data: Record<string, any>]
  cancel: []
  change: [field: string, value: any, formData: Record<string, any>]
}>()

const slots = useSlots()

// Form state
const formData = reactive<Record<string, any>>(props.initialData || {})
const errors = reactive<Record<string, string>>({})
const touched = reactive<Record<string, boolean>>({})
const isSubmitting = ref(false)
const globalError = ref('')

// Computed
const formClasses = computed(() => {
  const classes = ['bg-white']
  
  return classes.join(' ')
})

const fieldsContainerClasses = computed(() => {
  const classes = []
  
  if (props.columns > 1) {
    classes.push('grid gap-6')
    if (props.columns === 2) {
      classes.push('grid-cols-1 md:grid-cols-2')
    } else if (props.columns === 3) {
      classes.push('grid-cols-1 md:grid-cols-2 lg:grid-cols-3')
    }
  } else {
    classes.push('space-y-6')
  }
  
  return classes.join(' ')
})

const actionsClasses = computed(() => {
  const classes = ['mt-6 pt-6']
  
  if (props.showErrorSummary && hasErrors.value) {
    classes.push('border-t border-gray-200')
  }
  
  return classes.join(' ')
})

const isValid = computed(() => {
  return Object.keys(errors).length === 0
})

const hasErrors = computed(() => {
  return Object.keys(errors).length > 0
})


// Methods
const validateField = (fieldName: string, value: any): string | null => {
  const field = props.fields?.find(f => f.name === fieldName)
  if (!field?.rules) return null
  
  for (const rule of field.rules) {
    // Required validation
    if (rule.required && (value === null || value === undefined || value === '')) {
      return rule.message || `${fieldName} es obligatorio`
    }
    
    // Skip other validations if value is empty and not required
    if (!rule.required && (value === null || value === undefined || value === '')) {
      continue
    }
    
    // Min/Max validation (for numbers)
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return rule.message || `${fieldName} debe ser mayor o igual a ${rule.min}`
      }
      if (rule.max !== undefined && value > rule.max) {
        return rule.message || `${fieldName} debe ser menor o igual a ${rule.max}`
      }
    }
    
    // MinLength/MaxLength validation (for strings)
    if (typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        return rule.message || `${fieldName} debe tener al menos ${rule.minLength} caracteres`
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return rule.message || `${fieldName} debe tener máximo ${rule.maxLength} caracteres`
      }
    }
    
    // Email validation
    if (rule.email && typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return rule.message || `${fieldName} debe ser un email válido`
      }
    }
    
    // Pattern validation
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        return rule.message || `${fieldName} no tiene el formato correcto`
      }
    }
    
    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value, formData)
      if (customError) {
        return customError
      }
    }
  }
  
  return null
}

const validateForm = (): boolean => {
  const newErrors: Record<string, string> = {}
  
  if (props.fields) {
    for (const field of props.fields) {
      const error = validateField(field.name, formData[field.name])
      if (error) {
        newErrors[field.name] = error
      }
    }
  }
  
  // Clear previous errors
  Object.keys(errors).forEach(key => {
    delete errors[key]
  })
  
  // Set new errors
  Object.assign(errors, newErrors)
  
  return Object.keys(newErrors).length === 0
}

const setFieldValue = (fieldName: string, value: any): void => {
  formData[fieldName] = value
  
  // Validate on change if enabled
  if (props.validateOnChange && touched[fieldName]) {
    const error = validateField(fieldName, value)
    if (error) {
      errors[fieldName] = error
    } else {
      delete errors[fieldName]
    }
  }
  
  emit('change', fieldName, value, { ...formData })
}

const setFieldTouched = (fieldName: string): void => {
  touched[fieldName] = true
  
  // Validate on blur if enabled
  if (props.validateOnBlur) {
    const error = validateField(fieldName, formData[fieldName])
    if (error) {
      errors[fieldName] = error
    } else {
      delete errors[fieldName]
    }
  }
}

const handleSubmit = async (event: Event): Promise<void> => {
  event.preventDefault()
  
  // Mark all fields as touched
  if (props.fields) {
    props.fields.forEach(field => {
      touched[field.name] = true
    })
  }
  
  // Validate form
  const isFormValid = validateForm()
  
  if (!isFormValid) {
    globalError.value = 'Por favor corrige los errores antes de continuar'
    return
  }
  
  try {
    isSubmitting.value = true
    globalError.value = ''
    
    emit('submit', { ...formData })
  } catch (error) {
    globalError.value = 'Error al enviar el formulario. Inténtalo de nuevo.'
  } finally {
    isSubmitting.value = false
  }
}

const handleCancel = (): void => {
  emit('cancel')
}

const resetForm = (): void => {
  // Reset form data
  Object.keys(formData).forEach(key => {
    delete formData[key]
  })
  Object.assign(formData, props.initialData || {})
  
  // Reset validation state
  Object.keys(errors).forEach(key => {
    delete errors[key]
  })
  Object.keys(touched).forEach(key => {
    delete touched[key]
  })
  
  globalError.value = ''
  isSubmitting.value = false
}

const setErrors = (newErrors: Record<string, string>): void => {
  // Clear previous errors
  Object.keys(errors).forEach(key => {
    delete errors[key]
  })
  
  // Set new errors
  Object.assign(errors, newErrors)
}

// Watch for initial data changes
watch(() => props.initialData, (newData) => {
  if (newData) {
    Object.assign(formData, newData)
  }
}, { deep: true })

// Expose methods for parent components
defineExpose({
  validateForm,
  resetForm,
  setFieldValue,
  setFieldTouched,
  setErrors,
  formData: readonly(formData),
  errors: readonly(errors),
  isValid,
  isSubmitting
})
</script>