<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="handleClose" class="relative z-50">
      <!-- Overlay -->
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black bg-opacity-25" />
      </TransitionChild>

      <!-- Modal container -->
      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel 
              :class="modalClasses"
            >
              <!-- Header -->
              <div v-if="slots.header || title" class="flex items-center justify-between p-4 border-b border-gray-200">
                <div class="flex items-center">
                  <!-- Icon -->
                  <div 
                    v-if="icon"
                    :class="iconContainerClasses"
                  >
                    <component 
                      :is="icon" 
                      :class="iconClasses"
                    />
                  </div>
                  
                  <!-- Title -->
                  <DialogTitle 
                    as="h3" 
                    :class="titleClasses"
                  >
                    <slot name="header">{{ title }}</slot>
                  </DialogTitle>
                </div>

                <!-- Close button -->
                <button
                  v-if="closable"
                  type="button"
                  class="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  @click="handleClose"
                >
                  <XMarkIcon class="h-6 w-6" />
                </button>
              </div>

              <!-- Content -->
              <div :class="contentClasses">
                <slot />
              </div>

              <!-- Footer -->
              <div 
                v-if="slots.footer || showDefaultActions"
                :class="footerClasses"
              >
                <slot name="footer">
                  <!-- Default actions for confirmation modal -->
                  <div v-if="showDefaultActions" class="flex space-x-3">
                    <BaseButton
                      variant="secondary"
                      @click="handleCancel"
                      :disabled="loading"
                    >
                      {{ cancelText }}
                    </BaseButton>
                    <BaseButton
                      :variant="confirmVariant"
                      @click="handleConfirm"
                      :loading="loading"
                    >
                      {{ confirmText }}
                    </BaseButton>
                  </div>
                </slot>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { computed, useSlots, type Component } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import BaseButton from './BaseButton.vue'

export interface BaseModalProps {
  // Control
  isOpen: boolean
  closable?: boolean
  
  // Content
  title?: string
  icon?: Component
  
  // Styling
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  variant?: 'default' | 'danger' | 'success' | 'warning'
  
  // Confirmation modal specific
  showDefaultActions?: boolean
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning'
  loading?: boolean
}

const props = withDefaults(defineProps<BaseModalProps>(), {
  closable: true,
  size: 'md',
  variant: 'default',
  showDefaultActions: false,
  confirmText: 'Confirmar',
  cancelText: 'Cancelar',
  confirmVariant: 'primary',
  loading: false
})

const emit = defineEmits<{
  close: []
  confirm: []
  cancel: []
}>()

const slots = useSlots()

// Size classes
const sizeClasses = computed(() => {
  const sizes = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full mx-4'
  }
  return sizes[props.size]
})

// Modal classes
const modalClasses = computed(() => {
  return [
    'w-full',
    sizeClasses.value,
    'transform',
    'overflow-hidden',
    'rounded-lg',
    'bg-white',
    'text-left',
    'align-middle',
    'shadow-xl',
    'transition-all'
  ].join(' ')
})

// Icon container classes based on variant
const iconContainerClasses = computed(() => {
  const variants = {
    default: 'bg-gray-100',
    danger: 'bg-red-100',
    success: 'bg-green-100',
    warning: 'bg-yellow-100'
  }
  
  return [
    'flex',
    'h-10',
    'w-10',
    'flex-shrink-0',
    'items-center',
    'justify-center',
    'rounded-full',
    'mr-4',
    variants[props.variant]
  ].join(' ')
})

// Icon classes based on variant
const iconClasses = computed(() => {
  const variants = {
    default: 'text-gray-600',
    danger: 'text-red-600',
    success: 'text-green-600', 
    warning: 'text-yellow-600'
  }
  
  return [
    'h-6',
    'w-6',
    variants[props.variant]
  ].join(' ')
})

// Title classes
const titleClasses = computed(() => {
  return [
    'text-lg',
    'font-medium',
    'leading-6',
    'text-gray-900'
  ].join(' ')
})

// Content classes
const contentClasses = computed(() => {
  const paddingClass = slots.header || props.title ? 'p-4' : 'p-6'
  return [
    paddingClass,
    'text-sm',
    'text-gray-500'
  ].join(' ')
})

// Footer classes
const footerClasses = computed(() => {
  return [
    'px-4',
    'py-3',
    'bg-gray-50',
    'border-t',
    'border-gray-200',
    'flex',
    'justify-end'
  ].join(' ')
})

// Event handlers
const handleClose = () => {
  if (props.closable && !props.loading) {
    emit('close')
  }
}

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
  if (props.closable) {
    emit('close')
  }
}
</script>