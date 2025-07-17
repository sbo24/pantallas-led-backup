# 🔗 ShowsTrack - Relaciones de Base de Datos

## Diagrama de Relaciones Completo

```
┌─────────────┐         ┌──────────────────┐         ┌────────────────┐
│    Shows    │ 1     N │ ScheduledEvents  │ 1    0..1│ StatusOverride │
│             ├─────────┤                  ├─────────┤                │
│ id (PK)     │         │ id (PK)          │         │ id (PK)        │
│ name        │         │ show_id (FK)     │         │ event_id (FK)  │
│ is_visible  │         │ external_id      │         │ override_status│
│ lead_times  │         │ event_date       │         │ is_active      │
└─────────────┘         │ start_time       │         └────────────────┘
                        └──────────────────┘
                                 
┌─────────────┐         ┌──────────────────┐
│    Roles    │ 1     N │      Users       │
│             ├─────────┤                  │
│ id (PK)     │         │ id (PK)          │
│ name        │         │ role_id (FK)     │
│ permissions │         │ username         │
└─────────────┘         └──────────────────┘

┌────────────────┐      ┌──────────────────┐
│ GlobalSettings │      │   GlobalAlert    │
│                │      │                  │
│ key (PK)       │      │ id (PK)          │
│ value (JSONB)  │      │ message          │
└────────────────┘      │ is_active        │
                        └──────────────────┘

┌──────────────────┐
│   AuditLogs      │
│                  │
│ id (PK)          │
│ user_id          │
│ entity_type      │
│ entity_id        │
│ old_values       │
│ new_values       │
└──────────────────┘
```

## Relaciones Implementadas

### 1. Shows → ScheduledEvents (1:N)
```sql
-- Foreign Key
ALTER TABLE scheduled_events 
ADD CONSTRAINT fk_scheduled_events_show_id_shows 
FOREIGN KEY (show_id) REFERENCES shows(id);
```

**Descripción**: Un show puede tener múltiples eventos programados
**Cascada**: NO CASCADE (preservar integridad)
**Índices**: 
- `idx_events_show_date` en `(show_id, event_date)`

### 2. ScheduledEvents → StatusOverride (1:0..1)
```sql
-- Foreign Key
ALTER TABLE status_overrides 
ADD CONSTRAINT fk_status_overrides_scheduled_event_id_scheduled_events 
FOREIGN KEY (scheduled_event_id) REFERENCES scheduled_events(id);
```

**Descripción**: Un evento puede tener máximo un override activo
**Cascada**: CASCADE ON DELETE (si se elimina evento, se elimina override)
**Constraints**: 
- `UNIQUE (scheduled_event_id)` WHERE `is_active = true`

### 3. Roles → Users (1:N)
```sql
-- Foreign Key
ALTER TABLE users 
ADD CONSTRAINT fk_users_role_id_roles 
FOREIGN KEY (role_id) REFERENCES roles(id);
```

**Descripción**: Un rol puede tener múltiples usuarios
**Cascada**: RESTRICT (no se puede eliminar rol con usuarios)
**Índices**:
- `idx_users_role_id` en `role_id`

## Queries de Verificación

### Verificar todas las Foreign Keys
```sql
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;
```

### Verificar integridad referencial
```sql
-- Shows que tienen eventos
SELECT 
    s.id,
    s.name,
    COUNT(e.id) as event_count
FROM shows s
LEFT JOIN scheduled_events e ON s.id = e.show_id
GROUP BY s.id, s.name
ORDER BY event_count DESC;

-- Eventos con overrides
SELECT 
    e.id,
    e.external_event_id,
    s.name as show_name,
    o.override_status,
    o.is_active
FROM scheduled_events e
JOIN shows s ON e.show_id = s.id
LEFT JOIN status_overrides o ON e.id = o.scheduled_event_id
WHERE o.is_active = true;

-- Usuarios por rol
SELECT 
    r.name as role_name,
    COUNT(u.id) as user_count
FROM roles r
LEFT JOIN users u ON r.id = u.role_id
GROUP BY r.id, r.name
ORDER BY user_count DESC;
```

## Constraints de Integridad

### 1. Shows
- `uq_shows_name`: UNIQUE en `name`
- `ck_shows_access_minutes_positive`: CHECK `custom_lead_time_access_minutes >= 0`
- `ck_shows_finalized_minutes_positive`: CHECK `custom_lead_time_finalized_minutes >= 0`

### 2. ScheduledEvents
- `uq_scheduled_events_external_event_id`: UNIQUE en `external_event_id`
- `unique_show_datetime`: UNIQUE en `(show_id, event_date, start_time)`

### 3. StatusOverrides
- `uq_one_active_override_per_event`: UNIQUE en `scheduled_event_id` WHERE `is_active = true`
- `ck_override_status_valid`: CHECK `override_status IN ('CERRADO', 'CANCELADO')`

### 4. Users
- `uq_users_username`: UNIQUE en `username`
- `uq_users_email`: UNIQUE en `email`

### 5. Roles
- `uq_roles_name`: UNIQUE en `name`

### 6. GlobalAlert
- `ck_alert_type_valid`: CHECK `alert_type IN ('emergency', 'warning', 'info')`

## Índices para Rendimiento

### Índices de Foreign Keys
- `idx_events_show_date` en `scheduled_events(show_id, event_date)`
- `idx_overrides_active` en `status_overrides(scheduled_event_id)` WHERE `is_active = true`

### Índices de Consultas Frecuentes
- `idx_shows_visible` en `shows(is_visible)`
- `idx_shows_display_order` en `shows(display_order)`
- `idx_events_date` en `scheduled_events(event_date)`
- `idx_events_datetime` en `scheduled_events(event_date, start_time)`
- `idx_events_external_id` en `scheduled_events(external_event_id)`

### Índices de Auditoría
- `idx_audit_user_timestamp` en `audit_logs(user_id, timestamp)`
- `idx_audit_entity` en `audit_logs(entity_type, entity_id)`
- `idx_audit_action` en `audit_logs(action, timestamp)`

## Reglas de Negocio en BD

### 1. Integridad Referencial
- No se puede eliminar un show que tiene eventos programados
- No se puede eliminar un evento que tiene override activo
- No se puede eliminar un rol que tiene usuarios asignados

### 2. Constraints de Negocio
- Solo un override activo por evento
- Solo una alerta global activa a la vez (manejado por aplicación)
- Lead times deben ser positivos
- Estados de override limitados a CERRADO/CANCELADO

### 3. Unicidad
- Nombres de shows únicos
- External event IDs únicos
- Combinación show+fecha+hora única
- Usernames y emails únicos

## Migración y Versionado

### Migración Actual
- **Versión**: `de4808d98963`
- **Descripción**: "Initial migration: create all tables"
- **Tablas creadas**: 9 (+ alembic_version)
- **Relaciones**: 3 foreign keys implementadas

### Comandos de Migración
```bash
# Ver estado actual
alembic current

# Ver historial
alembic history

# Verificar integridad
alembic check
```

---

*Esta documentación refleja el estado actual de la base de datos implementada el 2025-07-17.*