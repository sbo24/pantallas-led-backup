<template>
  <component
    :is="tag"
    :type="tag === 'button' ? type : undefined"
    :to="tag === 'router-link' ? to : undefined"
    :href="tag === 'a' ? href : undefined"
    :disabled="disabled || loading"
    :class="buttonClasses"
    v-bind="$attrs"
    @click="handleClick"
  >
    <!-- Loading spinner -->
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-2 h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      ></circle>
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>

    <!-- Left icon -->
    <component
      v-if="leftIcon && !loading"
      :is="leftIcon"
      :class="iconClasses"
    />

    <!-- Button text content -->
    <span v-if="slots.default || text">
      <slot>{{ text }}</slot>
    </span>

    <!-- Right icon -->
    <component
      v-if="rightIcon"
      :is="rightIcon"
      :class="iconClasses"
    />
  </component>
</template>

<script setup lang="ts">
import { computed, useSlots, type Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

export interface BaseButtonProps {
  // Content
  text?: string
  leftIcon?: Component
  rightIcon?: Component
  
  // Behavior
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  
  // Navigation
  to?: RouteLocationRaw
  href?: string
  
  // Styling
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost' | 'link'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  block?: boolean
  rounded?: boolean
}

const props = withDefaults(defineProps<BaseButtonProps>(), {
  type: 'button',
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  block: false,
  rounded: false
})

const emit = defineEmits<{
  click: [event: Event]
}>()

const slots = useSlots()

// Determine the component tag to render
const tag = computed(() => {
  if (props.to) return 'router-link'
  if (props.href) return 'a'
  return 'button'
})

// Base button classes
const baseClasses = [
  'inline-flex',
  'items-center',
  'justify-center',
  'font-medium',
  'transition-colors',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-offset-2',
  'disabled:opacity-50',
  'disabled:cursor-not-allowed'
]

// Size classes
const sizeClasses = computed(() => {
  const sizes = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-4 py-2 text-base',
    xl: 'px-6 py-3 text-base'
  }
  return sizes[props.size]
})

// Variant classes
const variantClasses = computed(() => {
  const variants = {
    primary: [
      'bg-indigo-600',
      'text-white',
      'border',
      'border-transparent',
      'hover:bg-indigo-700',
      'focus:ring-indigo-500'
    ],
    secondary: [
      'bg-white',
      'text-gray-700',
      'border',
      'border-gray-300',
      'hover:bg-gray-50',
      'focus:ring-indigo-500'
    ],
    danger: [
      'bg-red-600',
      'text-white',
      'border',
      'border-transparent',
      'hover:bg-red-700',
      'focus:ring-red-500'
    ],
    success: [
      'bg-green-600',
      'text-white',
      'border',
      'border-transparent',
      'hover:bg-green-700',
      'focus:ring-green-500'
    ],
    warning: [
      'bg-yellow-600',
      'text-white',
      'border',
      'border-transparent',
      'hover:bg-yellow-700',
      'focus:ring-yellow-500'
    ],
    ghost: [
      'bg-transparent',
      'text-gray-700',
      'border',
      'border-transparent',
      'hover:bg-gray-100',
      'focus:ring-indigo-500'
    ],
    link: [
      'bg-transparent',
      'text-indigo-600',
      'border-none',
      'hover:text-indigo-500',
      'focus:ring-indigo-500',
      'p-0'
    ]
  }
  return variants[props.variant]
})

// Rounded classes
const roundedClasses = computed(() => {
  if (props.rounded) return 'rounded-full'
  if (props.variant === 'link') return ''
  return 'rounded-md'
})

// Block classes
const blockClasses = computed(() => {
  return props.block ? 'w-full' : ''
})

// Icon classes
const iconClasses = computed(() => {
  const sizes = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4', 
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
    xl: 'h-5 w-5'
  }
  
  const spacing = props.text || slots.default ? 'first:mr-2 last:ml-2' : ''
  
  return [sizes[props.size], spacing].filter(Boolean).join(' ')
})

// Final button classes
const buttonClasses = computed(() => {
  return [
    ...baseClasses,
    sizeClasses.value,
    ...variantClasses.value,
    roundedClasses.value,
    blockClasses.value
  ].filter(Boolean).join(' ')
})

// Handle click events
const handleClick = (event: Event) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}

// Make component polymorphic-friendly
defineOptions({
  inheritAttrs: false
})
</script>