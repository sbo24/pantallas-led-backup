import type { TableColumn } from '@/components/BaseTable.vue'

export const importHistoryColumns: TableColumn[] = [
  { key: 'timestamp', label: 'Fecha/Hora', sortable: true },
  { key: 'source', label: 'Fuente', sortable: true },
  { key: 'eventsCount', label: 'Eventos', sortable: true, align: 'center' },
  { key: 'status', label: 'Estado', sortable: true, align: 'center' },
  {
    key: 'applied',
    label: 'Aplicados',
    sortable: true,
    align: 'center',
    formatter: (value: any, row: any) => {
      const applied = row.appliedCount || 0
      const total = row.eventsCount || 0
      const errors = row.errorCount || 0
      let result = `${applied} / ${total}`
      if (errors > 0) result += ` (${errors} errores)`
      return result
    }
  }
]

export const eventsColumns: TableColumn[] = [
  { key: 'show.name', label: 'Espectáculo', sortable: true },
  { key: 'start_time', label: 'Hora', sortable: true, align: 'center' },
  { key: 'calculated_status', label: 'Estado', sortable: true, align: 'center' },
  { key: 'actions', label: 'Overrides', sortable: false, align: 'center' }
]

export const pendingChangesColumns: TableColumn[] = [
  { key: 'select', label: '', sortable: false, align: 'center' },
  { key: 'type', label: 'Tipo', sortable: true, align: 'center' },
  { key: 'showName', label: 'Espectáculo', sortable: true },
  { key: 'eventDate', label: 'Fecha', sortable: true, align: 'center' },
  { key: 'startTime', label: 'Hora', sortable: true, align: 'center' },
  { key: 'description', label: 'Descripción', sortable: false },
  { key: 'preview', label: 'Preview', sortable: false, align: 'center' }
]