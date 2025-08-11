# 🗄️ ShowsTrack APP - Modelo de Datos y Entidades

## 2.1 Entidades Core

### Show (Espectáculos)

**Propósito**: Catálogo maestro de espectáculos disponibles en el parque.

```sql
CREATE TABLE shows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    duration_estimated INTEGER, -- minutos
    show_category VARCHAR(100), -- principal, secundario, especial
    
    -- Configuración de visibilidad
    is_visible BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    
    -- Lead times personalizados (NULL = usar globales)
    custom_lead_time_access_minutes INTEGER CHECK (custom_lead_time_access_minutes >= 0),
    custom_lead_time_finalized_minutes INTEGER CHECK (custom_lead_time_finalized_minutes >= 0),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimización
CREATE INDEX idx_shows_visible ON shows(is_visible);
CREATE INDEX idx_shows_display_order ON shows(display_order);
```

**Campos Clave**:
- `name`: Identificador único del espectáculo
- `is_visible`: Controla si aparece en pantallas públicas
- `display_order`: Para ordenación manual (0 = orden automático)
- `custom_lead_time_*`: Override de configuración global

### ScheduledEvent (Eventos Programados)

**Propósito**: Horarios específicos de cada representación/pase de un espectáculo.

```sql
CREATE TABLE scheduled_events (
    id SERIAL PRIMARY KEY,
    external_event_id VARCHAR(255) NOT NULL UNIQUE, -- ID del sistema origen
    show_id INTEGER NOT NULL REFERENCES shows(id),
    
    -- Información temporal
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    duration_minutes INTEGER NOT NULL,
    
    -- Tipo de evento
    event_type VARCHAR(50) DEFAULT 'show', -- show, apertura, cierre
    
    -- Flags especiales
    is_multiple_shows_flag BOOLEAN DEFAULT false,
    availability_window_start TIME,
    availability_window_end TIME,
    
    -- Metadata de importación
    last_imported_at TIMESTAMP WITH TIME ZONE,
    import_source VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_show_datetime UNIQUE (show_id, event_date, start_time)
);

-- Índices para queries frecuentes
CREATE INDEX idx_events_date ON scheduled_events(event_date);
CREATE INDEX idx_events_show_date ON scheduled_events(show_id, event_date);
CREATE INDEX idx_events_external_id ON scheduled_events(external_event_id);
CREATE INDEX idx_events_datetime ON scheduled_events(event_date, start_time);
```

**Campos Clave**:
- `external_event_id`: Clave única del sistema origen (inmutable)
- `event_date` + `start_time`: Identifican un pase específico
- `is_multiple_shows_flag`: Indica si hay más pases del mismo show ese día

### StatusOverride (Overrides Manuales)

**Propósito**: Almacenar intervenciones manuales del operador sobre estados calculados.

```sql
CREATE TABLE status_overrides (
    id SERIAL PRIMARY KEY,
    scheduled_event_id INTEGER NOT NULL REFERENCES scheduled_events(id),
    
    -- Estado forzado
    override_status VARCHAR(20) NOT NULL CHECK (override_status IN ('CERRADO', 'CANCELADO')),
    override_reason TEXT,
    
    -- Control de vigencia
    is_active BOOLEAN DEFAULT true,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    
    -- Auditoría
    created_by VARCHAR(100) NOT NULL, -- username del operador
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT one_active_override_per_event UNIQUE (scheduled_event_id) WHERE is_active = true
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_overrides_active ON status_overrides(scheduled_event_id) WHERE is_active = true;
```

**Reglas de Negocio**:
- Solo un override activo por evento
- Override persiste ante importaciones
- No se pueden crear overrides para eventos pasados

### GlobalSettings (Configuración del Sistema)

**Propósito**: Parámetros configurables a nivel sistema.

```sql
CREATE TABLE global_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);

-- Datos iniciales
INSERT INTO global_settings (key, value, description) VALUES
    ('default_lead_time_access_minutes', '30', 'Minutos antes para estado ABIERTO'),
    ('default_lead_time_finalized_minutes', '0', 'Minutos antes para estado CERRADO'),
    ('system_timezone', '"Europe/Madrid"', 'Zona horaria del sistema'),
    ('refresh_interval_seconds', '30', 'Intervalo actualización pantallas'),
    ('max_visible_shows', '5', 'Máximo shows en pantallas'),
    ('operation_mode', '"automatic"', 'automatic|manual'),
    ('venue_hours', '{
        "monday": {"open": "10:00", "close": "18:00"},
        "tuesday": {"open": "10:00", "close": "18:00"},
        "wednesday": {"open": "10:00", "close": "18:00"},
        "thursday": {"open": "10:00", "close": "18:00"},
        "friday": {"open": "10:00", "close": "20:00"},
        "saturday": {"open": "10:00", "close": "22:00"},
        "sunday": {"open": "10:00", "close": "20:00"}
    }', 'Horarios de apertura por día');
```

### GlobalAlert (Alertas del Sistema)

**Propósito**: Mensajes de alerta que reemplazan la visualización normal.

```sql
CREATE TABLE global_alerts (
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    alert_type VARCHAR(50) DEFAULT 'emergency', -- emergency, warning, info
    
    -- Control de vigencia
    is_active BOOLEAN DEFAULT true,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    
    -- Auditoría
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT only_one_active_alert CHECK (
        (SELECT COUNT(*) FROM global_alerts WHERE is_active = true) <= 1
    )
);
```

### AuditLog (Registro de Auditoría)

**Propósito**: Trazabilidad completa de acciones administrativas.

```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL, -- CREATE, UPDATE, DELETE, OVERRIDE, SYNC, etc.
    entity_type VARCHAR(50) NOT NULL, -- show, event, setting, alert
    entity_id INTEGER,
    
    -- Detalles del cambio
    old_values JSONB,
    new_values JSONB,
    
    -- Contexto adicional
    ip_address INET,
    user_agent TEXT,
    request_id UUID,
    
    -- Índices para búsquedas
    INDEX idx_audit_user_timestamp (user_id, timestamp DESC),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_action (action, timestamp DESC)
);
```

## 2.2 Relaciones y Cardinalidades

### Diagrama de Relaciones

```
┌─────────────┐         ┌──────────────────┐         ┌────────────────┐
│    Shows    │ 1     N │ ScheduledEvents  │ 1     1 │ StatusOverride │
│             ├─────────┤                  ├─────────┤                │
│ id (PK)     │         │ id (PK)          │         │ id (PK)        │
│ name        │         │ show_id (FK)     │         │ event_id (FK)  │
│ is_visible  │         │ external_id      │         │ override_status│
│ lead_times  │         │ event_date       │         │ is_active      │
└─────────────┘         │ start_time       │         └────────────────┘
                        └──────────────────┘
                                 │
                                 │ N
                                 │
                                 │ 1
                        ┌──────────────────┐
                        │   GlobalAlert    │
                        ├──────────────────┤
                        │ id (PK)          │
                        │ message          │
                        │ is_active        │
                        └──────────────────┘
```

### Cardinalidades Detalladas

| Relación | Cardinalidad | Descripción |
|----------|--------------|-------------|
| Show → ScheduledEvent | 1:N | Un show tiene múltiples eventos programados |
| ScheduledEvent → StatusOverride | 1:0..1 | Un evento puede tener máximo un override activo |
| ScheduledEvent → Show | N:1 | Múltiples eventos pertenecen a un show |
| GlobalAlert → Sistema | 1:Sistema | Solo una alerta global activa a la vez |

## 2.3 Estados y Transiciones

### Estados Válidos

```
┌─────────────┐     ┌─────────┐     ┌─────────┐     ┌───────────┐
│ PROGRAMADO  │────▶│ ABIERTO │────▶│ CERRADO │     │ CANCELADO │
│   (Gris)    │     │ (Verde) │     │  (Rojo) │     │(Amarillo) │
└─────────────┘     └─────────┘     └─────────┘     └───────────┘
      │                   │               │                 ▲
      │                   │               │                 │
      └───────────────────┴───────────────┴─────────────────┘
                        (Override Manual)
```

### Definición de Estados

| Estado | Color | Significado | Cuándo Ocurre |
|--------|-------|-------------|---------------|
| **PROGRAMADO** | Gris/Azul | Espectáculo anunciado pero sin acceso | Antes de `(start_time - lead_time_access)` |
| **ABIERTO** | Verde | Acceso permitido al espectáculo | Entre `(start_time - lead_time_access)` y `start_time` |
| **CERRADO** | Rojo | Acceso cerrado, show en curso o finalizado | Después de `(start_time - lead_time_finalized)` |
| **CANCELADO** | Amarillo | Espectáculo no se realizará | Override manual del operador |


### Prioridad de Estados

1. **Override Manual** (máxima prioridad)
   - Si existe `status_override.is_active = true`
   - Ignora cálculo automático
   - Persiste hasta desactivación manual

2. **Cálculo Automático**
   - Basado en hora actual vs ventanas temporales
   - Usa lead times (específicos del show o globales)
   - Se recalcula en cada consulta

## 2.4 Datos de Sincronización

### Estrategia de Identificación Única

**Clave Principal**: `external_event_id`
- Inmutable desde el sistema origen
- Permite tracking de cambios
- Evita duplicados en importaciones

### Mapeo de Datos Externos

```python
# Estructura esperada del sistema origen
{
    "event_id": "PDF-2024-001-15:30",  # → external_event_id
    "show_name": "El Último Cantar",    # → match con shows.name
    "date": "2024-01-15",               # → event_date
    "start_time": "15:30",              # → start_time
    "duration": 45,                     # → duration_minutes
    "type": "SHOW",                     # → event_type
    "status": "CONFIRMED"               # → validación antes de importar
}
```

### Proceso de Actualización No Destructiva

1. **Identificación**:
   - Buscar por `external_event_id`
   - Si no existe → CREATE
   - Si existe → UPDATE (solo campos permitidos)

2. **Preservación de Datos Locales**:
   - NUNCA modificar `status_overrides`
   - Mantener `is_visible` de shows
   - Conservar `display_order` manual

3. **Validaciones en Importación**:
   - Show debe existir (match por nombre)
   - Fechas/horas coherentes
   - No crear eventos en el pasado
   - Respetar constraints de unicidad

### Campos Actualizables vs Protegidos

**Actualizables en Importación**:
- `event_date`, `start_time`, `end_time`
- `duration_minutes`
- `is_multiple_shows_flag`

**Protegidos (nunca se modifican)**:
- `status_overrides.*`
- `shows.is_visible`
- `shows.display_order`
- `shows.custom_lead_time_*`
- Registros de `audit_logs`

## 2.5 Entidades de Autenticación

### User (Usuarios)
**Propósito**: Gestionar las cuentas de los operadores que acceden al panel de administración.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Role (Roles)

Propósito: Definir los niveles de permiso dentro del sistema.

```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB -- Almacena una lista de permisos como ["read:shows", "write:shows"]
);

-- Datos iniciales
INSERT INTO roles (name, description, permissions) VALUES
    ('viewer', 'Solo puede ver información', '["read:shows", "read:events", "read:config"]'),
    ('operator', 'Operaciones diarias', '["read:*", "override:status", "manage:alerts"]'),
    ('admin', 'Acceso completo', '["*"]');
```
---

## 2.7 Integración con Motor de Estados

### 🎯 **StateEngine - Utilización del Modelo de Datos**

El motor de estados implementado en `app/services/state_engine.py` utiliza las entidades del modelo de datos de la siguiente manera:

#### **Show Entity - Lead Times Dinámicos**

```python
# En StateEngine._resolve_lead_times()
class StateEngine:
    async def _resolve_lead_times(self, show: Show) -> LeadTimeConfig:
        """Jerarquía de configuración de lead times."""
        
        # 1. Configuración específica del show (prioridad)
        if (show.custom_lead_time_access_minutes is not None and 
            show.custom_lead_time_finalized_minutes is not None):
            return LeadTimeConfig(
                access_minutes=show.custom_lead_time_access_minutes,
                finalized_minutes=show.custom_lead_time_finalized_minutes
            )
        
        # 2. Configuración global (fallback)
        return LeadTimeConfig(access_minutes=30, finalized_minutes=0)
```

**Campos utilizados**:
- `custom_lead_time_access_minutes`: Personalización por show
- `custom_lead_time_finalized_minutes`: Override de configuración global
- Relationship con `scheduled_events`: Carga eventos del show

#### **ScheduledEvent Entity - Cálculo de Ventanas Temporales**

```python
# En StateEngine._calculate_time_windows()  
def _calculate_time_windows(self, event: ScheduledEvent, lead_times: LeadTimeConfig) -> TimeWindows:
    """Utiliza campos de evento para calcular transiciones."""
    
    # Combinar fecha y hora del evento
    event_datetime = datetime.combine(event.event_date, event.start_time)
    
    return TimeWindows(
        access_start=event_datetime - timedelta(minutes=lead_times.access_minutes),
        finalized_start=event_datetime - timedelta(minutes=lead_times.finalized_minutes),
        show_start=event_datetime,
        show_end=datetime.combine(event.event_date, event.end_time) if event.end_time else None
    )
```

**Campos utilizados**:
- `event_date` + `start_time`: Timestamp del show
- `end_time`: Duración del evento (opcional)
- `availability_window_start/end`: Casos especiales (shows continuos)
- `is_multiple_shows_flag`: Identificación de múltiples pases

#### **StatusOverride Entity - Prioridad Máxima**

```python
# En StateEngine._check_active_override()
async def _check_active_override(self, event_id: int) -> Optional[StatusOverride]:
    """Override activo anula cualquier cálculo automático."""
    
    stmt = select(StatusOverride).where(
        and_(
            StatusOverride.scheduled_event_id == event_id,
            StatusOverride.is_active == True  # Solo overrides activos
        )
    )
    return await self.db.execute(stmt).scalar_one_or_none()
```

**Campos utilizados**:
- `scheduled_event_id`: Vinculación con evento específico
- `override_status`: CERRADO o CANCELADO (prioridad máxima)
- `is_active`: Solo overrides activos afectan el cálculo
- `override_reason`: Trazabilidad (no usado en cálculo)

#### **GlobalSettings Entity - Configuración por Defecto**

```python
# En LeadTimeService.get_effective_lead_times()
# Configuración global desde ConfigService
global_config = await self.config_service.get_global_config(self.db)
lead_times = global_config.lead_times

return {
    'access_minutes': lead_times.default_lead_time_access_minutes,    # 30 min
    'finalized_minutes': lead_times.default_lead_time_finalized_minutes # 0 min
}
```

**Configuración utilizada**:
- `default_lead_time_access_minutes`: Valor global para PROGRAMADO → ABIERTO
- `default_lead_time_finalized_minutes`: Valor global para ABIERTO → CERRADO

### 📊 **Performance Optimizations Implementadas**

#### **Batch Loading de Overrides**
```python
# En StateEngine.calculate_multiple_events_states()
async def calculate_multiple_events_states(self, events: list[ScheduledEvent]) -> Dict[int, str]:
    """Pre-carga overrides para múltiples eventos eficientemente."""
    
    event_ids = [event.id for event in events]
    
    # Una sola query para todos los overrides
    stmt = select(StatusOverride).where(
        and_(
            StatusOverride.scheduled_event_id.in_(event_ids),
            StatusOverride.is_active == True
        )
    )
    result = await self.db.execute(stmt)
    overrides = {override.scheduled_event_id: override 
                for override in result.scalars().all()}
```

#### **Eager Loading de Relationships**
```python
# En EventService.get_events_by_date_range()
query = select(ScheduledEvent).options(
    selectinload(ScheduledEvent.show),              # Pre-carga show data
    selectinload(ScheduledEvent.status_override)    # Pre-carga override data
)
```

### 🔄 **Audit Trail Integration**

#### **AuditLog Entity - Trazabilidad Completa**
```python
# En LeadTimeService._log_lead_time_change()
audit_entry = AuditLog(
    entity_type="show_lead_times",
    entity_id=show_id,
    action="UPDATE_LEAD_TIMES",
    user_id=user,
    old_values={"access_minutes": previous_values.get('access_minutes')},
    new_values={"access_minutes": new_values.get('access_minutes')},
)
```

**Eventos auditados**:
- Cambios de lead times personalizados por show
- Activación/desactivación de overrides manuales
- Cambios de configuración global que afectan cálculo de estados

### 🎯 **Estado de Implementación del Modelo**

#### **Entidades Completamente Integradas**
- ✅ **Show**: Lead times personalizados funcionando
- ✅ **ScheduledEvent**: Cálculo de ventanas temporales operativo  
- ✅ **StatusOverride**: Sistema de prioridad máxima implementado
- ✅ **GlobalSettings**: Configuración por defecto integrada
- ✅ **AuditLog**: Trazabilidad de cambios funcionando

#### **Relationships Utilizadas**
- ✅ **Show ↔ ScheduledEvent**: One-to-many para eventos del show
- ✅ **ScheduledEvent ↔ StatusOverride**: One-to-one para override activo
- ✅ **Show ↔ StateEngine**: Configuración de lead times por show
- ✅ **GlobalSettings ↔ ConfigService**: Valores por defecto del sistema

#### **Índices de Performance**
- ✅ **idx_shows_visible**: Optimiza consultas de shows públicos
- ✅ **idx_events_show_date**: Optimiza búsqueda de eventos por show y fecha
- ✅ **idx_overrides_active**: Optimiza búsqueda de overrides activos

---

*Este modelo de datos garantiza la integridad, trazabilidad y flexibilidad necesarias para la operación confiable de ShowsTrack APP, con motor de estados completamente integrado y operativo.*