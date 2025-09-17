<template>
  <div class="clock-display">
    <div class="time">{{ currentTime }}</div>
    <div class="date">{{ currentDate }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// Estado reactivo
const currentTime = ref('')
const currentDate = ref('')

// Referencias para cleanup
let timeInterval: number | null = null

// Función para actualizar fecha y hora
const updateDateTime = () => {
  const now = new Date()
  
  // Formato de hora HH:MM
  currentTime.value = now.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Madrid'
  })
  
  // Formato de fecha
  currentDate.value = now.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Europe/Madrid'
  })
}

onMounted(() => {
  // Actualizar inmediatamente
  updateDateTime()
  
  // Actualizar cada minuto
  timeInterval = setInterval(updateDateTime, 60000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
.clock-display {
  text-align: right;
  color: #1f2937;
}

.time {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.025em;
}

.date {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  margin-top: 0.25rem;
  text-transform: capitalize;
}

/* Animación sutil para el cambio de minuto */
.time {
  transition: all 0.3s ease-in-out;
}

@media (max-width: 768px) {
  .time {
    font-size: 2rem;
  }
  
  .date {
    font-size: 0.75rem;
  }
}
</style>