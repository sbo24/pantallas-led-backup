# 🔌 ShowsTrack APP - Especificación Completa de APIs

## 4.1 API Pública (Sin Autenticación)

### GET /api/public/schedules

**Propósito**: Endpoint principal para pantallas públicas. Devuelve los espectáculos visibles con sus estados calculados en tiempo real.

**Request**:
```http
GET /api/public/schedules?date=2024-01-15&include_tomorrow=false
```

**Query Parameters**:
| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| date | string (YYYY-MM-DD) | today | Fecha de consulta |
| include_tomorrow | boolean | false | Incluir eventos de mañana |
| simulated_time | string (ISO) | null | Solo para testing |

**Response** (200 OK):
```json
{
  "current_time": "2024-01-15T10:30:00",
  "display_mode": "normal",
  "shows": [
    {
      "show_id": 1,
      "show_name": "El Último Cantar",
      "current_pass": {
        "start_time": "10:45",
        "status": "ABIERTO",
        "status_color": "#10B981",
        "time_until_change": 15,
        "lead_time_info": {
          "access_opened_at": "10:15",
          "will_close_at": "10:45"
        }
      },
      "next_pass": {
        "start_time": "12:45",
        "status": "PROGRAMADO"
      },
      "display_order": 1
    },
    {
      "show_id": 2,
      "show_name": "A Pluma y Espada",
      "current_pass": {
        "start_time": "11:00",
        "status": "PROGRAMADO",
        "status_color": "#6B7280",
        "time_until_change": 30,
        "lead_time_info": {
          "will_open_at": "10:30"
        }
      },
      "next_pass": null,
      "display_order": 2
    }
  ],
  "metadata": {
    "total_shows": 2,
    "refresh_interval_seconds": 30,
    "cache_expires_at": "2024-01-15T10:31:00"
  }
}
```

**Response con Alerta Global**:
```json
{
  "current_time": "2024-01-15T10:30:00",
  "display_mode": "alert",
  "alert": {
    "message": "Por condiciones meteorológicas adversas, todos los espectáculos exteriores están temporalmente suspendidos.",
    "type": "emergency",
    "activated_at": "2024-01-15T10:15:00"
  },
  "shows": [],
  "metadata": {
    "refresh_interval_seconds": 10
  }
}
```

**Cache**: TTL 60 segundos  
**Rate Limit**: 60 requests/minute per IP

### GET /api/public/alert

**Propósito**: Verificar si hay una alerta global activa.

**Response** (200 OK - Con alerta):
```json
{
  "has_alert": true,
  "alert": {
    "message": "Mensaje de emergencia",
    "type": "emergency",
    "activated_at": "2024-01-15T10:15:00"
  }
}
```

**Response** (200 OK - Sin alerta):
```json
{
  "has_alert": false,
  "alert": null
}
```

**Cache**: TTL 10 segundos  
**Rate Limit**: 120 requests/minute per IP

### GET /health

**Propósito**: Health check robusto del sistema para monitoreo de producción. Verifica estado de componentes críticos, conectividad de base de datos y métricas del sistema.

**Response** (200 OK - Sistema Saludable):
```json
{
  "status": "healthy",
  "timestamp": "2025-07-17T14:05:28.360799",
  "version": "1.0.0",
  "uptime": 62.95,
  "database": {
    "status": "healthy",
    "version": ["PostgreSQL", "15.13"],
    "database": "showstrack_main",
    "user": "showstrack_user",
    "tables_count": 0,
    "response_time_ms": 67.68
  },
  "system": {
    "cpu_percent": 22.2,
    "memory": {
      "total": 20621647872,
      "available": 17148792832,
      "percent": 16.8,
      "used": 3059359744
    },
    "disk": {
      "total": 46544191488,
      "free": 35171442688,
      "used": 11372748800,
      "percent": 24.43
    },
    "load_average": [0.11865234375, 0.14599609375, 0.09765625]
  },
  "components": {
    "database": {
      "status": "healthy",
      "healthy": true
    },
    "system": {
      "status": "healthy",
      "healthy": true
    },
    "api": {
      "status": "healthy",
      "healthy": true
    }
  }
}
```

**Response** (503 Service Unavailable - Sistema No Saludable):
```json
{
  "status": "unhealthy",
  "timestamp": "2025-07-17T14:05:28.360799",
  "version": "1.0.0",
  "uptime": 62.95,
  "database": {
    "status": "unhealthy",
    "error": "Connection refused",
    "response_time_ms": 5000
  },
  "system": {
    "cpu_percent": 95.8,
    "memory": {
      "total": 20621647872,
      "available": 1048576000,
      "percent": 94.9,
      "used": 19573071872
    },
    "disk": {
      "total": 46544191488,
      "free": 1073741824,
      "used": 45470449664,
      "percent": 97.69
    },
    "load_average": [8.5, 7.2, 6.8]
  },
  "components": {
    "database": {
      "status": "unhealthy",
      "healthy": false
    },
    "system": {
      "status": "healthy",
      "healthy": true
    },
    "api": {
      "status": "healthy",
      "healthy": true
    }
  }
}
```

**Campos de Respuesta**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `status` | string | Estado general: `healthy` o `unhealthy` |
| `timestamp` | datetime | Timestamp ISO 8601 del momento de la consulta |
| `version` | string | Versión de la API (1.0.0) |
| `uptime` | float | Tiempo en segundos desde el inicio del servidor |
| `database.status` | string | Estado de PostgreSQL: `healthy` o `unhealthy` |
| `database.version` | array | Versión de PostgreSQL [nombre, versión] |
| `database.response_time_ms` | float | Tiempo de respuesta de la BD en milisegundos |
| `system.cpu_percent` | float | Porcentaje de uso de CPU |
| `system.memory.percent` | float | Porcentaje de uso de memoria |
| `system.disk.percent` | float | Porcentaje de uso de disco |
| `system.load_average` | array | Load average del sistema [1min, 5min, 15min] |
| `components.*.healthy` | boolean | Indicador booleano para monitoreo automático |

**Lógica de Estado General**:
- `healthy`: Todos los componentes críticos están operativos
- `unhealthy`: Al menos un componente crítico falla

**Componentes Monitoreados**:
- **Database**: Conectividad PostgreSQL, tiempo de respuesta
- **System**: Recursos del sistema (CPU, memoria, disco)
- **API**: Estado del servicio FastAPI

**Casos de Uso**:
- Monitoreo de infraestructura (Prometheus, Grafana)
- Health checks de load balancers
- Alertas automáticas de sistema
- Diagnóstico de problemas de rendimiento

**Implementación**: 
- Verificación asíncrona de PostgreSQL con `asyncpg`
- Métricas de sistema con `psutil`
- Formato de respuesta con modelo Pydantic
- Tiempos de respuesta medidos en tiempo real

**Cache**: Sin cache (consulta en tiempo real)  
**Rate Limit**: 30 requests/minute per IP

## 4.1.1 Implementación de Base de Datos

### Modelos SQLAlchemy implementados (2025-07-17)

El sistema cuenta con los siguientes modelos de base de datos implementados:

#### Tablas Core:
- **`shows`**: Catálogo maestro de espectáculos (8 campos + timestamps)
- **`scheduled_events`**: Eventos programados (11 campos + timestamps)
- **`status_overrides`**: Overrides manuales de estado (8 campos + timestamps)
- **`global_settings`**: Configuración del sistema (JSONB)
- **`global_alerts`**: Alertas globales del sistema (6 campos + timestamps)
- **`audit_logs`**: Registro de auditoría (11 campos + timestamp)

#### Tablas de Autenticación:
- **`users`**: Usuarios del sistema (7 campos + timestamps)
- **`roles`**: Roles y permisos (4 campos)

#### Migraciones:
- **Sistema Alembic**: Configurado para PostgreSQL async
- **Migración inicial**: `de4808d98963_initial_migration_create_all_tables.py`
- **Estado actual**: 9 tablas creadas con constraints e índices

#### Características implementadas:
- **Async/await**: Toda la configuración es asíncrona
- **Relationships**: Foreign keys y relaciones configuradas
- **Constraints**: CHECK, UNIQUE, INDEX para integridad
- **Versionado**: Sistema de migraciones Alembic configurado
- **Validación**: Modelos Pydantic + SQLAlchemy

## 4.2 API Administrativa (JWT Authentication)

### Autenticación

Todos los endpoints administrativos requieren un token JWT en el header:

```http
Authorization: Bearer <jwt_token>
```

### POST /api/admin/auth/login

**Propósito**: Autenticar usuario y obtener token JWT.

**Request**:
```json
{
  "username": "admin",
  "password": "secure_password"
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "permissions": ["all"]
  }
}
```

### Shows Management

#### GET /api/admin/shows

**Propósito**: Listar todos los shows con información de gestión.

**Query Parameters**:
| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| page | integer | 1 | Página de resultados |
| size | integer | 50 | Items por página |
| visible_only | boolean | false | Filtrar solo visibles |
| search | string | null | Buscar en nombre |

**Response** (200 OK):
```json
{
  "items": [
    {
      "id": 1,
      "name": "El Último Cantar",
      "description": "Espectáculo épico medieval",
      "duration_estimated": 45,
      "is_visible": true,
      "display_order": 1,
      "custom_lead_time_access_minutes": null,
      "custom_lead_time_finalized_minutes": null,
      "current_events_count": 3,
      "next_event": {
        "id": 101,
        "start_time": "15:30",
        "event_date": "2024-01-15"
      }
    }
  ],
  "total": 15,
  "page": 1,
  "size": 50,
  "pages": 1
}
```

#### PUT /api/admin/shows/{show_id}

**Propósito**: Actualizar configuración de un show.

**Request**:
```json
{
  "is_visible": false,
  "display_order": 3,
  "custom_lead_time_access_minutes": 45,
  "custom_lead_time_finalized_minutes": 5
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "name": "El Último Cantar",
  "is_visible": false,
  "display_order": 3,
  "custom_lead_time_access_minutes": 45,
  "custom_lead_time_finalized_minutes": 5,
  "updated_at": "2024-01-15T10:35:00"
}
```

### Events Management

#### GET /api/admin/events

**Propósito**: Listar eventos programados con opciones de filtrado.

**Query Parameters**:
| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| date_from | date | today | Fecha inicio |
| date_to | date | today+7 | Fecha fin |
| show_id | integer | null | Filtrar por show |
| has_override | boolean | null | Con override activo |

**Response** (200 OK):
```json
{
  "items": [
    {
      "id": 101,
      "external_event_id": "PDF-2024-001-15:30",
      "show": {
        "id": 1,
        "name": "El Último Cantar"
      },
      "event_date": "2024-01-15",
      "start_time": "15:30",
      "end_time": "16:15",
      "duration_minutes": 45,
      "calculated_status": "PROGRAMADO",
      "override": null,
      "is_multiple_shows_flag": true
    },
    {
      "id": 102,
      "external_event_id": "PDF-2024-002-16:00",
      "show": {
        "id": 2,
        "name": "A Pluma y Espada"
      },
      "event_date": "2024-01-15",
      "start_time": "16:00",
      "calculated_status": "CERRADO",
      "override": {
        "status": "CANCELADO",
        "reason": "Mantenimiento técnico",
        "created_by": "operator1",
        "created_at": "2024-01-15T09:00:00"
      }
    }
  ],
  "total": 45,
  "page": 1
}
```

#### PATCH /api/admin/events/{event_id}/override

**Propósito**: Crear o actualizar override manual de estado.

**Request**:
```json
{
  "action": "create",
  "status": "CERRADO",
  "reason": "Problemas técnicos con el equipo de sonido"
}
```

**Response** (200 OK):
```json
{
  "event_id": 101,
  "override": {
    "id": 201,
    "status": "CERRADO",
    "reason": "Problemas técnicos con el equipo de sonido",
    "is_active": true,
    "created_by": "admin",
    "created_at": "2024-01-15T10:40:00"
  },
  "audit_logged": true
}
```

**Request para desactivar**:
```json
{
  "action": "deactivate"
}
```

### Configuration Management

#### GET /api/admin/config/global

**Propósito**: Obtener configuración global del sistema.

**Response** (200 OK):
```json
{
  "operation_mode": "automatic",
  "default_lead_time_access_minutes": 30,
  "default_lead_time_finalized_minutes": 0,
  "system_timezone": "Europe/Madrid",
  "refresh_interval_seconds": 30,
  "max_visible_shows": 5,
  "venue_hours": {
    "monday": {"open": "10:00", "close": "18:00"},
    "tuesday": {"open": "10:00", "close": "18:00"},
    "wednesday": {"open": "10:00", "close": "18:00"},
    "thursday": {"open": "10:00", "close": "18:00"},
    "friday": {"open": "10:00", "close": "20:00"},
    "saturday": {"open": "10:00", "close": "22:00"},
    "sunday": {"open": "10:00", "close": "20:00"}
  }
}
```

#### PUT /api/admin/config/global

**Propósito**: Actualizar configuración global.

**Request**:
```json
{
  "operation_mode": "manual",
  "default_lead_time_access_minutes": 45,
  "max_visible_shows": 6
}
```

### Alert Management

#### POST /api/admin/alerts/global

**Propósito**: Activar alerta global.

**Request**:
```json
{
  "message": "Todos los espectáculos están temporalmente suspendidos por condiciones meteorológicas.",
  "type": "emergency"
}
```

**Response** (201 Created):
```json
{
  "alert": {
    "id": 1,
    "message": "Todos los espectáculos están temporalmente suspendidos por condiciones meteorológicas.",
    "type": "emergency",
    "is_active": true,
    "activated_at": "2024-01-15T10:45:00",
    "created_by": "admin"
  }
}
```

#### DELETE /api/admin/alerts/global

**Propósito**: Desactivar alerta global activa.

**Response** (200 OK):
```json
{
  "message": "Alerta global desactivada",
  "deactivated_at": "2024-01-15T11:00:00"
}
```

### Import Management

#### POST /api/admin/import

**Propósito**: Importar datos desde sistema externo.

**Request** (multipart/form-data):
```
Content-Type: multipart/form-data
file: [archivo Excel]
mode: "preview" | "apply"
```

**Response** (200 OK - Preview):
```json
{
  "mode": "preview",
  "summary": {
    "total_events": 150,
    "new_events": 10,
    "updated_events": 140,
    "conflicts": 2
  },
  "changes": [
    {
      "action": "create",
      "show_name": "Nuevo Show",
      "event_date": "2024-01-20",
      "start_time": "14:00"
    },
    {
      "action": "update",
      "external_id": "PDF-2024-001-15:30",
      "field": "start_time",
      "old_value": "15:30",
      "new_value": "15:45"
    }
  ],
  "conflicts": [
    {
      "external_id": "PDF-2024-100-18:00",
      "issue": "Show 'El Sueño de Toledo' no existe en el sistema"
    }
  ]
}
```

### Statistics

#### GET /api/admin/stats/shows

**Propósito**: Obtener estadísticas agregadas sobre los shows en un rango de fechas. Útil para reportes de operación.

**Query Parameters**:
| Parámetro | Tipo | Default | Descripción |
| :--- | :--- | :--- | :--- |
| `start_date` | string (YYYY-MM-DD) | today | Fecha de inicio del rango |
| `end_date` | string (YYYY-MM-DD) | today+7 | Fecha de fin del rango |

**Response** (200 OK):

```json
{
  "date_range": {
    "start": "2024-07-01",
    "end": "2024-07-07"
  },
  "shows": [
    {
      "show_id": 1,
      "show_name": "El Último Cantar",
      "total_events": 21,
      "average_duration": 25.5,
      "events_today": 3
    },
    {
      "show_id": 2,
      "show_name": "A Pluma y Espada",
      "total_events": 14,
      "average_duration": 20.0,
      "events_today": 2
    }
  ],
  "summary": {
    "total_shows_in_range": 2,
    "total_events_in_range": 35
  }
}
```
**Propósito**: Ejecutar sincronización manual en modo manual.

**Response** (200 OK):
```json
{
  "status": "completed",
  "timestamp": "2024-01-15T11:00:00",
  "summary": {
    "events_processed": 145,
    "events_created": 5,
    "events_updated": 140,
    "errors": 0
  }
}
```

### Statistics

## 4.3 Autenticación y Autorización

### Flujo de Autenticación

1. **Login**: Cliente envía credenciales a `/api/admin/auth/login`
2. **Token Generation**: Server valida y genera JWT tokens
3. **Token Usage**: Cliente incluye token en header `Authorization: Bearer <token>`
4. **Token Refresh**: Antes de expirar, usar refresh token para obtener nuevo access token

### Estructura del JWT Token

```json
{
  "sub": "admin",
  "user_id": 1,
  "role": "admin",
  "permissions": ["all"],
  "exp": 1705315200,
  "iat": 1705311600
}
```

### Roles y Permisos

Por ahora, sistema simplificado con un solo rol:

| Rol | Permisos |
|-----|----------|
| admin | Acceso completo a todas las funcionalidades |

### Manejo de Errores de Autenticación

**401 Unauthorized**:
```json
{
  "detail": "Token expirado o inválido",
  "code": "TOKEN_EXPIRED"
}
```

**403 Forbidden**:
```json
{
  "detail": "No tienes permisos para esta operación",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

## 4.4 Schemas y Validaciones

### Validaciones Comunes

**Fechas y Horas**:
- Formato fecha: `YYYY-MM-DD`
- Formato hora: `HH:MM` (24 horas)
- Timezone: Europe/Madrid (configuración del sistema)

**Lead Times**:
- Rango válido acceso: 0-120 minutos
- Rango válido finalización: 0-60 minutos
- Valores deben ser enteros positivos

**Estados Override**:
- Valores permitidos: `CERRADO`, `CANCELADO`
- Requiere razón (mínimo 10 caracteres)

### Códigos de Error Estándar

| Código | HTTP Status | Descripción |
|--------|-------------|-------------|
| VALIDATION_ERROR | 422 | Datos de entrada inválidos |
| NOT_FOUND | 404 | Recurso no encontrado |
| CONFLICT | 409 | Conflicto con estado actual |
| UNAUTHORIZED | 401 | Autenticación requerida |
| FORBIDDEN | 403 | Sin permisos suficientes |
| RATE_LIMITED | 429 | Límite de requests excedido |
| SERVER_ERROR | 500 | Error interno del servidor |

### Formato de Respuesta de Error

Todas las respuestas de error siguen este formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Error de validación en los datos enviados",
    "details": [
      {
        "field": "start_time",
        "message": "Formato de hora inválido. Use HH:MM"
      }
    ],
    "request_id": "req_123456789",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Rate Limiting

Los límites se aplican por IP para API pública y por usuario para API administrativa:

| Endpoint | Límite | Ventana | Headers de Respuesta |
|----------|--------|---------|---------------------|
| /api/public/schedules | 60 | 1 minuto | X-RateLimit-Limit: 60<br>X-RateLimit-Remaining: 45<br>X-RateLimit-Reset: 1705312200 |
| /api/public/alert | 120 | 1 minuto | Mismos headers |
| /api/admin/* | 300 | 1 minuto | Por usuario autenticado |

### Versionado de API

La API usa versionado en la URL:
- Versión actual: `/api/v1/`
- Futura versión: `/api/v2/`

Headers de respuesta incluyen:
```
X-API-Version: 1.0
X-Deprecation-Notice: Esta versión será deprecada el 2025-01-01
```

---

## 🎯 Estado de Implementación de API Pública

### ✅ GET /api/public/schedules - COMPLETAMENTE IMPLEMENTADO (2025-07-24)

#### **Motor de Estados Integrado**

El endpoint ahora utiliza el **StateEngine completo** implementado en `app/services/state_engine.py`:

```python
# En app/routers/public.py - Línea 80
event_status = await EventService.calculate_event_status(event, db)
# Utiliza algoritmo de 5 pasos para cálculo real-time
```

#### **Cálculo de Estados Real-Time**

**Antes** (lógica básica):
```python
if event_datetime > now: return "PROGRAMADO"
elif event_datetime <= now: return "CERRADO"
```

**Ahora** (algoritmo completo):
- ✅ **Paso 1**: Verificación de overrides activos (prioridad máxima)
- ✅ **Paso 2**: Resolución de lead times (show específico > global)
- ✅ **Paso 3**: Cálculo de ventanas temporales
- ✅ **Paso 4**: Determinación por tiempo: PROGRAMADO → ABIERTO → CERRADO
- ✅ **Paso 5**: Casos especiales (ventanas de disponibilidad continua)

#### **Estados Calculados Correctamente**

| Estado | Descripción | Color | Cuándo Se Aplica |
|--------|-------------|-------|------------------|
| PROGRAMADO | Show anunciado, acceso no abierto | #6B7280 (gris) | Antes de (start_time - lead_time_access) |
| ABIERTO | Visitantes pueden acceder | #10B981 (verde) | Entre (start_time - lead_time_access) y start_time |
| CERRADO | Acceso cerrado, show iniciado | #EF4444 (rojo) | Después de start_time |
| CANCELADO | Show cancelado | #F59E0B (amarillo) | Solo por override manual |

#### **Lead Times Dinámicos**

- **Configuración global**: 30 min acceso, 0 min finalización (por defecto)
- **Configuración por show**: Valores personalizables vía `LeadTimeService`
- **Jerarquía respetada**: Show específico > configuración global
- **Ejemplo**: Show con lead time personalizado de 45 min → acceso abierto 45 min antes

#### **Sistema de Overrides Integrado**

```json
// Ejemplo de evento con override activo
{
  "show_id": 1,
  "show_name": "El Último Cantar", 
  "current_pass": {
    "start_time": "15:30",
    "status": "CANCELADO",     // Override manual activo
    "status_color": "#F59E0B", // Amarillo para cancelado
    "override_reason": "Motivos técnicos" // Visible en admin
  }
}
```

#### **Performance Optimizada**

- **Cálculo batch**: StateEngine procesa múltiples eventos eficientemente
- **Pre-carga de overrides**: Una sola query para todos los eventos
- **Caching preparado**: Estructura lista para FASE 2 (optimizaciones)

#### **Testing Validado**

Endpoint completamente probado con:
- ✅ Estados calculados correctamente por tiempo
- ✅ Overrides con prioridad máxima
- ✅ Lead times personalizados por show
- ✅ Casos especiales (ventanas disponibilidad)
- ✅ Performance con múltiples eventos

### 🔄 Próximas Mejoras (FASE 2)

- **Caching inteligente**: TTL basado en próximo cambio de estado
- **WebSocket**: Actualizaciones en tiempo real para pantallas
- **Métricas**: Tiempo de respuesta y uso de recursos

---

*Esta especificación define completamente las interfaces de comunicación de ShowsTrack APP, proporcionando la base para la integración de todos los componentes del sistema.*