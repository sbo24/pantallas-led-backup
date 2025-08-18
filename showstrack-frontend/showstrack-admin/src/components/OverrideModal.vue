<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-bold mb-4">Override Manual de Estado</h3>
      
      <div v-if="selectedEvent" class="mb-4 p-4 bg-gray-50 rounded">
        <p><strong>Espectáculo:</strong> {{ selectedEvent.show?.name || 'N/A' }}</p>
        <p><strong>Hora:</strong> {{ selectedEvent.start_time || 'N/A' }}</p>
        <p><strong>Estado Actual:</strong> {{ selectedEvent.calculated_status || 'N/A' }}</p>
        <p><strong>Nuevo Estado:</strong> <span class="font-bold text-red-600">{{ overrideStatus }}</span></p>
      </div>

      <div class="mb-4">
        <label class="block text-sm font-medium mb-2">
          Razón (mínimo 10 caracteres):
        </label>
        <textarea 
          v-model="reason" 
          class="w-full p-3 border rounded-lg"
          rows="3"
          placeholder="Explique el motivo del override (ej: problema técnico, mal tiempo, etc.)"
        />
        <p class="text-xs text-gray-500 mt-1">{{ reason.length }}/10 caracteres mínimos</p>
      </div>

      <div class="flex gap-3">
        <BaseButton @click="$emit('close')" variant="outline" class="flex-1">
          Cancelar
        </BaseButton>
        <BaseButton
          @click="$emit('confirm', reason)"
          variant="primary"
          :disabled="reason.length < 10"
          class="flex-1 bg-red-600 hover:bg-red-700"
        >
          Confirmar Override
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseButton from '@/components/BaseButton.vue'

interface Props {
  show: boolean
  selectedEvent: any
  overrideStatus: 'CERRADO' | 'CANCELADO'
}

const props = defineProps<Props>()
defineEmits<{
  close: []
  confirm: [reason: string]
}>()

const reason = ref('')

watch(() => props.show, (newShow) => {
  if (newShow) reason.value = ''
}, { immediate: false })
</script>