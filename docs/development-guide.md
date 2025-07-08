# 💻 ShowsTrack APP - Guía para Desarrollo con Claude Code

## 8.1 Setup Inicial

### Requisitos del Sistema

**Software Necesario**:
- Python 3.10+
- Node.js 18+
- PostgreSQL 15
- Docker & docker-compose
- Git

**En WSL (Windows Subsystem for Linux)**:
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Python
sudo apt install python3.10 python3.10-venv python3-pip

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib

# Instalar Docker
sudo apt install docker.io docker-compose
sudo usermod -aG docker $USER
```

### Configuración del Entorno

**1. Clonar Repositorio**:
```bash
git clone https://github.com/your-org/showstrack-app.git
cd showstrack-app
```

**2. Estructura de Carpetas**:
```bash
# Crear estructura completa
mkdir -p {backend/{app/{api,core,db,models,schemas,services},alembic,tests},frontend-public/{css,js,assets},frontend-admin/src/{components,views,stores,services},scripts/{config,logs,output},docker,docs}

# Verificar estructura
tree -d -L 3
```

**3. Variables de Entorno**:
```bash
# Backend
cp backend/.env.example backend/.env
# Editar con valores de desarrollo

# Frontend Admin
cp frontend-admin/.env.example frontend-admin/.env
# Editar VITE_API_URL=http://localhost:8000
```

**4. Base de Datos de Desarrollo**:
```bash
# Iniciar PostgreSQL
sudo service postgresql start

# Crear usuario y base de datos
sudo -u postgres psql << EOF
CREATE USER showstrack WITH PASSWORD 'dev_password';
CREATE DATABASE showstrack_dev OWNER showstrack;
GRANT ALL PRIVILEGES ON DATABASE showstrack_dev TO showstrack;
EOF
```

## 8.2 Tareas de Desarrollo Comunes

### Añadir Nuevo Endpoint

**Ejemplo: Endpoint para estadísticas de shows**

**1. Crear Schema (backend/app/schemas/stats.py)**:
```python
from pydantic import BaseModel
from datetime import date
from typing import List, Dict

class ShowStats(BaseModel):
    show_id: int
    show_name: str
    total_events: int
    events_today: int
    average_duration: float
    
class StatsResponse(BaseModel):
    date_range: Dict[str, date]
    shows: List[ShowStats]
    summary: Dict[str, int]
```

**2. Crear Service (backend/app/services/stats.py)**:
```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from app.models import Show, ScheduledEvent
from app.schemas.stats import ShowStats, StatsResponse

class StatsService:
    async def get_show_statistics(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date
    ) -> StatsResponse:
        # Query para obtener estadísticas
        query = (
            select(
                Show.id,
                Show.name,
                func.count(ScheduledEvent.id).label('total_events'),
                func.avg(ScheduledEvent.duration_minutes).label('avg_duration')
            )
            .join(ScheduledEvent)
            .where(
                ScheduledEvent.event_date.between(start_date, end_date)
            )
            .group_by(Show.id)
        )
        
        result = await db.execute(query)
        stats = result.all()
        
        # Formatear respuesta
        return StatsResponse(
            date_range={"start": start_date, "end": end_date},
            shows=[ShowStats(...) for stat in stats],
            summary={"total_shows": len(stats)}
        )
```

**3. Crear Endpoint (backend/app/api/v1/stats.py)**:
```python
from fastapi import APIRouter, Depends, Query
from datetime import date, timedelta
from app.schemas.stats import StatsResponse
from app.services.stats import StatsService
from app.api.dependencies import get_db

router = APIRouter()

@router.get("/stats/shows", response_model=StatsResponse)
async def get_show_statistics(
    start_date: date = Query(default=date.today()),
    end_date: date = Query(default=date.today() + timedelta(days=7)),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene estadísticas de shows en rango de fechas.
    """
    stats_service = StatsService()
    return await stats_service.get_show_statistics(db, start_date, end_date)
```

**4. Registrar Router (backend/app/main.py)**:
```python
from app.api.v1 import stats

app.include_router(stats.router, prefix="/api/v1/admin", tags=["statistics"])
```

### Modificar Lógica de Estados

**Ejemplo: Añadir estado "EN_PREPARACION"**

**1. Actualizar Enum (backend/app/models/enums.py)**:
```python
from enum import Enum

class EventStatus(str, Enum):
    PROGRAMADO = "PROGRAMADO"
    EN_PREPARACION = "EN_PREPARACION"  # Nuevo
    ABIERTO = "ABIERTO"
    CERRADO = "CERRADO"
    CANCELADO = "CANCELADO"
```

**2. Modificar State Engine (backend/app/services/state_engine.py)**:
```python
def calculate_event_state(self, event: ScheduledEvent, current_time: datetime) -> str:
    # ... código existente ...
    
    # Añadir nueva lógica
    preparation_window = windows.access_start - timedelta(minutes=15)
    
    if preparation_window <= current_time < windows.access_start:
        return EventStatus.EN_PREPARACION
    elif current_time < preparation_window:
        return EventStatus.PROGRAMADO
    # ... resto de la lógica ...
```

**3. Actualizar Frontend (frontend-public/js/config.js)**:
```javascript
COLORS: {
    PROGRAMADO: '#6B7280',
    EN_PREPARACION: '#FCD34D',  // Amarillo
    ABIERTO: '#10B981',
    CERRADO: '#EF4444',
    CANCELADO: '#F59E0B'
}
```

### Crear Nuevo Componente Vue

**Ejemplo: Componente de notificaciones en tiempo real**

**1. Crear Store (frontend-admin/src/stores/notifications.ts)**:
```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([]);
  
  const unreadCount = computed(() => 
    notifications.value.filter(n => !n.read).length
  );
  
  function addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    notifications.value.unshift({
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false
    });
  }
  
  function markAsRead(id: string) {
    const notification = notifications.value.find(n => n.id === id);
    if (notification) notification.read = true;
  }
  
  function clearAll() {
    notifications.value = [];
  }
  
  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    clearAll
  };
});
```

**2. Crear Componente (frontend-admin/src/components/NotificationCenter.vue)**:
```vue
<template>
  <div class="notification-center">
    <button 
      @click="showDropdown = !showDropdown"
      class="notification-button"
    >
      <Bell />
      <span v-if="unreadCount > 0" class="badge">
        {{ unreadCount }}
      </span>
    </button>
    
    <div v-if="showDropdown" class="dropdown">
      <div class="header">
        <h3>Notificaciones</h3>
        <button @click="clearAll">Limpiar</button>
      </div>
      
      <div class="notifications-list">
        <div 
          v-for="notification in notifications"
          :key="notification.id"
          :class="['notification', notification.type, { unread: !notification.read }]"
          @click="markAsRead(notification.id)"
        >
          <h4>{{ notification.title }}</h4>
          <p>{{ notification.message }}</p>
          <time>{{ formatTime(notification.timestamp) }}</time>
        </div>
        
        <div v-if="notifications.length === 0" class="empty">
          No hay notificaciones
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Bell } from 'lucide-vue-next';
import { useNotificationsStore } from '@/stores/notifications';
import { storeToRefs } from 'pinia';

const notificationsStore = useNotificationsStore();
const { notifications, unreadCount } = storeToRefs(notificationsStore);
const { markAsRead, clearAll } = notificationsStore;

const showDropdown = ref(false);

function formatTime(date: Date): string {
  return new Intl.RelativeTimeFormat('es').format(
    Math.round((date.getTime() - Date.now()) / 1000 / 60),
    'minute'
  );
}
</script>
```

### Añadir Validación de Negocio

**Ejemplo: Validar que no se creen eventos en horario de cierre**

**1. Crear Validador (backend/app/services/validators.py)**:
```python
from datetime import time, date
from app.core.exceptions import ValidationError

class EventValidator:
    def __init__(self, venue_hours: dict):
        self.venue_hours = venue_hours
    
    def validate_event_time(
        self,
        event_date: date,
        start_time: time,
        end_time: time
    ):
        """
        Valida que el evento esté dentro del horario del venue.
        """
        day_name = event_date.strftime('%A').lower()
        venue_day = self.venue_hours.get(day_name)
        
        if not venue_day:
            raise ValidationError("Día no configurado en horarios del venue")
        
        venue_open = time.fromisoformat(venue_day['open'])
        venue_close = time.fromisoformat(venue_day['close'])
        
        if start_time < venue_open: