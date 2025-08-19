<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold">Preview Detallado del Cambio</h3>
        <BaseButton @click="$emit('close')" variant="outline" size="sm">×</BaseButton>
      </div>
      
      <div v-if="selectedChange" class="space-y-4">
        <!-- Información General -->
        <div class="p-4 bg-blue-50 rounded-lg">
          <h4 class="font-semibold text-blue-900 mb-2">🔄 Información del Cambio</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Tipo:</strong> 
              <span :class="[
                'px-2 py-1 text-xs font-bold rounded ml-2',
                selectedChange.type === 'CREATE' ? 'bg-blue-100 text-blue-800' :
                selectedChange.type === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              ]">
                {{ selectedChange.type }}
              </span>
            </div>
            <div><strong>ID:</strong> {{ selectedChange.id }}</div>
            <div><strong>Espectáculo:</strong> {{ selectedChange.showName }}</div>
            <div><strong>Fecha:</strong> {{ selectedChange.eventDate }}</div>
          </div>
        </div>

        <!-- Detalles del Evento -->
        <div class="p-4 bg-green-50 rounded-lg">
          <h4 class="font-semibold text-green-900 mb-2">🎭 Detalles del Evento</h4>
          <div class="text-sm space-y-2">
            <div><strong>Hora de Inicio:</strong> {{ selectedChange.startTime }}</div>
            <div><strong>Descripción:</strong> {{ selectedChange.description }}</div>
          </div>
        </div>

        <!-- Impacto del Cambio -->
        <div class="p-4 bg-yellow-50 rounded-lg">
          <h4 class="font-semibold text-yellow-900 mb-2">⚠️ Impacto del Cambio</h4>
          <div class="text-sm space-y-1">
            <div v-if="selectedChange.type === 'CREATE'">
              • Se creará un nuevo evento para "{{ selectedChange.showName }}"
            </div>
            <div v-if="selectedChange.type === 'UPDATE'">
              • Se actualizará el evento existente de "{{ selectedChange.showName }}"
            </div>
            <div v-if="selectedChange.type === 'DELETE'">
              • Se eliminará el evento de "{{ selectedChange.showName }}"
            </div>
            <div>• Las pantallas públicas mostrarán este cambio inmediatamente</div>
            <div>• Los overrides manuales existentes se preservarán</div>
          </div>
        </div>

        <!-- Acción Recomendada -->
        <div class="p-4 bg-gray-50 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-2">📝 Acción Recomendada</h4>
          <p class="text-sm text-gray-700">
            Este cambio se aplicará automáticamente cuando uses "Aplicar Cambios" o cambies a modo automático.
            Revisa que la información sea correcta antes de proceder.
          </p>
        </div>
      </div>

      <div class="flex justify-end mt-6">
        <BaseButton @click="$emit('close')" variant="primary">
          Cerrar Preview
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseButton from '@/components/BaseButton.vue'

interface Props {
  show: boolean
  selectedChange: any
}

defineProps<Props>()
defineEmits<{
  close: []
}>()
</script>