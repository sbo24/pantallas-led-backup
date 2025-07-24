# 🔍 Mapeo Completo: Funcionalidades vs Endpoints - ShowsTrack APP

## ANÁLISIS POR CASOS DE USO PRINCIPALES

### 📺 **CU-01: Visualización en Pantallas Públicas**

#### Funcionalidades Especificadas:
1. **Mostrar máximo 5 espectáculos** ordenados por proximidad
2. **Estados visuales**: PROGRAMADO, ABIERTO, CERRADO, CANCELADO con colores
3. **Actualización automática cada 30 segundos**
4. **Modo alerta global** que reemplaza toda la visualización
5. **Manejo de casos especiales**: sin shows, sin conexión, horario cierre
6. **Próximo pase disponible** si existe

#### Endpoints Existentes ✅:
- `GET /api/public/schedules` → Datos principales para pantallas
- `GET /api/public/alert` → Verificar alertas globales
- `GET /health` → Health check para monitoreo

#### Endpoints Faltantes ❌:
- **NINGUNO** - Este caso de uso está completamente cubierto

---

### 🎛️ **CU-02: Gestión Operativa desde Panel Admin**

#### Funcionalidades Especificadas:

##### 2.1 Dashboard Principal
- **Vista previa en tiempo real** (réplica de pantallas)
- **Estado del sistema** (modo auto/manual, shows activos, overrides)
- **Botones de acción rápida**: Alerta Global, Sync Manual, Cambio de Modo

**Endpoints Existentes** ✅: 
- `GET /api/public/schedules` (para vista previa)

**Endpoints Faltantes** ❌:
```http
GET /api/admin/dashboard          # Estado sistema + métricas
PUT /api/admin/config/mode        # Cambiar modo automático/manual
GET /api/admin/sync/status        # Estado sincronización pendiente
POST /api/admin/sync/execute      # Ejecutar sync manual
```

##### 2.2 Gestión de Shows
- **Toggle visibilidad** de shows
- **Override manual de estados** (CERRADO/CANCELADO con razón)
- **Configurar lead times** específicos por show
- **Reordenar shows** (display_order)

**Endpoints Existentes** ✅:
- `GET /api/admin/shows` → Listar shows ✅
- `PUT /api/admin/shows/{id}` → Actualizar configuración ✅
- `PATCH /api/admin/events/{id}/override` → Override de eventos ✅

**Endpoints Faltantes** ❌:
```http
PUT /api/admin/shows/reorder      # Reordenar múltiples shows de una vez
GET /api/admin/shows/{id}/events  # Eventos específicos de un show
```

##### 2.3 Alertas de Emergencia
- **Activar/desactivar alerta global** con mensaje personalizado
- **Vista previa** de cómo se verá en pantallas
- **Historial de alertas** para auditoría

**Endpoints Existentes** ✅:
- `GET /api/public/alert` (solo para lectura)

**Endpoints Faltantes** ❌:
```http
GET /api/admin/alerts/global      # Estado actual + historial
POST /api/admin/alerts/global     # Activar alerta
DELETE /api/admin/alerts/global   # Desactivar alerta
GET /api/admin/alerts/history     # Historial de alertas
```

##### 2.4 Configuración del Sistema
- **Cambiar lead times globales**
- **Configurar horarios del venue**
- **Max shows visibles, intervalos de refresh**
- **Timezone del sistema**

**Endpoints Existentes** ✅:
- **NINGUNO**

**Endpoints Faltantes** ❌:
```http
GET /api/admin/config/global      # Configuración completa
PUT /api/admin/config/global      # Actualizar configuración
GET /api/admin/config/venue-hours # Horarios específicos del venue
PUT /api/admin/config/venue-hours # Actualizar horarios
```

---

### 🔄 **CU-03: Sincronización Automática de Datos**

#### Funcionalidades Especificadas:

##### 3.1 Recepción de Datos Externos
- **Scripts Python envían datos** vía webhook/API
- **Formato JSON estructurado** con metadatos
- **Validación y mapeo** de datos externos a formato interno
- **Preservación de overrides** manuales

**Endpoints Existentes** ✅:
- **NINGUNO**

**Endpoints Faltantes** ❌:
```http
POST /api/admin/import            # Recibir datos de scripts Python
POST /api/admin/import/validate   # Solo validar sin aplicar (preview)
GET /api/admin/import/history     # Historial de importaciones
```

##### 3.2 Gestión de Modos Operación
- **Modo Automático**: Aplica cambios inmediatamente
- **Modo Manual**: Retiene cambios hasta aprobación
- **Cambio entre modos** con confirmación si hay sync pendiente

**Endpoints Existentes** ✅:
- **NINGUNO**

**Endpoints Faltantes** ❌:
```http
GET /api/admin/config/operation-mode   # Modo actual
PUT /api/admin/config/operation-mode   # Cambiar modo
GET /api/admin/sync/pending            # Cambios pendientes en modo manual
POST /api/admin/sync/apply             # Aplicar cambios pendientes
POST /api/admin/sync/discard           # Descartar cambios pendientes
```

---

## FUNCIONALIDADES ADICIONALES IDENTIFICADAS

### 🔐 **Gestión de Usuarios y Auditoría**

#### Especificaciones del Sistema:
- **Roles**: viewer, operator, admin (data-model.md)
- **Auditoría completa** de acciones administrativas
- **Trazabilidad** de overrides y cambios

**Endpoints Existentes** ✅:
- `POST /api/admin/auth/login`
- `GET /api/admin/auth/me`
- `POST /api/admin/auth/refresh`

**Endpoints Faltantes** ❌:
```http
GET /api/admin/users              # Gestión de usuarios (solo admin)
POST /api/admin/users             # Crear usuarios
PUT /api/admin/users/{id}         # Actualizar usuarios
DELETE /api/admin/users/{id}      # Eliminar usuarios
GET /api/admin/audit-logs         # Registro de auditoría
GET /api/admin/audit-logs/events/{id}  # Auditoría de evento específico
```

### 📊 **Estadísticas y Reporting**

#### Especificaciones del Panel Admin:
- **Métricas operacionales**: shows activos, overrides, última sync
- **Estadísticas por show**: eventos hoy, duración promedio
- **Análisis temporal**: eventos por fecha, tendencias

**Endpoints Existentes** ✅:
- **NINGUNO** (parcialmente en /health)

**Endpoints Faltantes** ❌:
```http
GET /api/admin/stats/overview     # Métricas generales del sistema
GET /api/admin/stats/shows        # Estadísticas por show
GET /api/admin/stats/events       # Análisis de eventos
GET /api/admin/stats/overrides    # Análisis de overrides
GET /api/admin/reports/daily      # Reporte diario
GET /api/admin/reports/weekly     # Reporte semanal
```

### ⚡ **Performance y Optimización**

#### Especificaciones Técnicas:
- **Cache invalidation** tras cambios administrativos
- **Preloading** de datos para optimización
- **Bulk operations** para eficiencia

**Endpoints Existentes** ✅:
- **NINGUNO**

**Endpoints Faltantes** ❌:
```http
POST /api/admin/cache/invalidate  # Forzar invalidación de cache
GET /api/admin/performance/stats  # Métricas de rendimiento
POST /api/admin/shows/bulk-update # Actualizar múltiples shows
POST /api/admin/events/bulk-update # Actualizar múltiples eventos
```

### 🛠️ **Herramientas de Desarrollo y Testing**

#### Especificaciones de Testing:
- **Simulación de tiempo** para testing de estados
- **Preview de cambios** antes de aplicar
- **Debugging** de cálculo de estados

**Endpoints Existentes** ✅:
- `GET /api/public/schedules?simulated_time=` (parcial)

**Endpoints Faltantes** ❌:
```http
GET /api/admin/debug/event-state/{id}     # Debug del cálculo de estado
POST /api/admin/test/simulate-time        # Simular sistema completo
GET /api/admin/preview/public-display     # Preview exacto de pantallas
POST /api/admin/test/import-data          # Probar importación sin aplicar
```

### 📱 **Integraciones Externas**

#### Especificaciones de Integración:
- **Webhooks** para notificar cambios
- **API externa** de Puy du Fou
- **Notificaciones** por email/SMS

**Endpoints Existentes** ✅:
- **NINGUNO**

**Endpoints Faltantes** ❌:
```http
GET /api/admin/integrations/status       # Estado integraciones externas
POST /api/admin/webhooks/register        # Registrar webhook
GET /api/admin/notifications/config      # Configurar notificaciones
POST /api/admin/notifications/test       # Probar notificaciones
```

---

## RESUMEN DE GAPS IDENTIFICADOS

### 🚨 **CRÍTICO** (Bloquea MVP)
1. **Sistema de Importación**: 4 endpoints faltantes
2. **Gestión de Alertas**: 4 endpoints faltantes  
3. **Configuración Global**: 4 endpoints faltantes
4. **Modos de Operación**: 5 endpoints faltantes

### ⚠️ **ALTO** (Funcionalidades principales)
5. **Dashboard Admin**: 3 endpoints faltantes
6. **Estadísticas**: 6 endpoints faltantes
7. **Auditoría**: 4 endpoints faltantes

### 📈 **MEDIO** (Mejoras UX/Performance)
8. **Gestión Usuarios**: 5 endpoints faltantes
9. **Bulk Operations**: 3 endpoints faltantes
10. **Performance**: 3 endpoints faltantes

### 🧪 **BAJO** (Testing/Debug)
11. **Herramientas Testing**: 4 endpoints faltantes
12. **Integraciones**: 4 endpoints faltantes

## TOTAL DE ENDPOINTS IDENTIFICADOS

- **Existentes**: 12 endpoints
- **Faltantes críticos**: 17 endpoints
- **Faltantes importantes**: 13 endpoints  
- **Faltantes opcionales**: 20 endpoints

**TOTAL ESTIMADO PARA MVP COMPLETO**: ~42 endpoints

La API actual cubre **~29%** del sistema completo especificado.

---

# 📋 Tabla Completa de Endpoints - ShowsTrack API

## PANTALLAS PÚBLICAS (Sin Autenticación)

| Endpoint | Funcionalidad | Caso de Uso Detallado | Estado |
|----------|---------------|----------------------|--------|
| `GET /api/public/schedules` | Obtener horarios para pantallas públicas | **CU-01**: Pantalla Media4Display consulta cada 30s para mostrar máximo 5 shows visibles con estados PROGRAMADO/ABIERTO/CERRADO/CANCELADO, colores, próximo pase, etc. | ✅ **Desarrollado** |
| `GET /api/public/alert` | Verificar alerta global activa | **CU-01**: Pantalla verifica si hay alerta de emergencia que debe reemplazar completamente la visualización normal (ej: "Todos los shows suspendidos por lluvia") | ✅ **Desarrollado** |

---

## AUTENTICACIÓN Y USUARIOS

| Endpoint | Funcionalidad | Caso de Uso Detallado | Estado |
|----------|---------------|----------------------|--------|
| `POST /api/admin/auth/login` | Login con credenciales | **CU-02**: Operador ingresa username/password en panel admin, recibe JWT token para sesión administrativa | ✅ **Desarrollado** |
| `GET /api/admin/auth/me` | Obtener información del usuario actual | **CU-02**: Panel admin verifica datos del usuario logueado (nombre, rol, permisos) para mostrar en header | ✅ **Desarrollado** |
| `POST /api/admin/auth/refresh` | Renovar token JWT | **CU-02**: Antes de que expire el token (30min), renovarlo automáticamente para mantener sesión activa | ✅ **Desarrollado** |
| `POST /api/admin/auth/logout` | Cerrar sesión | **CU-02**: Operador hace logout, invalida token para seguridad | ✅ **Desarrollado** |
| `GET /api/admin/users` | Listar usuarios del sistema | **Gestión Usuarios**: Admin ve lista de todos los usuarios (viewer/operator/admin) con estado activo/inactivo | ❌ **Faltante** |
| `POST /api/admin/users` | Crear nuevo usuario | **Gestión Usuarios**: Admin crea cuenta para nuevo operador, asigna rol y permisos específicos | ❌ **Faltante** |
| `PUT /api/admin/users/{id}` | Actualizar usuario existente | **Gestión Usuarios**: Admin cambia rol de usuario de 'viewer' a 'operator', o desactiva cuenta | ❌ **Faltante** |
| `DELETE /api/admin/users/{id}` | Eliminar usuario | **Gestión Usuarios**: Admin elimina cuenta de usuario que ya no trabaja en el parque | ❌ **Faltante** |

---

## GESTIÓN DE SHOWS

| Endpoint | Funcionalidad | Caso de Uso Detallado | Estado |
|----------|---------------|----------------------|--------|
| `GET /api/admin/shows` | Listar shows con paginación | **CU-02**: Panel admin muestra tabla con todos los shows, su visibilidad, orden, lead times custom, eventos de hoy | ✅ **Desarrollado** |
| `POST /api/admin/shows` | Crear nuevo show | **Setup Inicial**: Admin crea show "Nuevo Espectáculo 2025" con duración 30min, visible=true, orden=5 | ✅ **Desarrollado** |
| `GET /api/admin/shows/{id}` | Obtener show específico | **CU-02**: Admin ve detalles completos de "El Último Cantar" para revisar configuración actual | ✅ **Desarrollado** |
| `PUT /api/admin/shows/{id}` | Actualizar show existente | **CU-02**: Operador marca show como invisible por mantenimiento, o cambia lead time a 45min por alta demanda | ✅ **Desarrollado** |
| `DELETE /api/admin/shows/{id}` | Eliminar show | **Mantenimiento**: Admin elimina show que ya no se presenta en el parque (solo si no tiene eventos) | ✅ **Desarrollado** |
| `GET /api/admin/shows/{id}/events` | Eventos específicos de un show | **CU-02**: Admin ve todos los pases de "El Último Cantar" hoy para hacer override o revisar horarios | ❌ **Faltante** |
| `PUT /api/admin/shows/reorder` | Reordenar múltiples shows | **CU-02**: Admin arrastra shows para cambiar orden de visualización: 1.El Último Cantar, 2.A Pluma y Espada, etc. | ❌ **Faltante** |
| `POST /api/admin/shows/bulk-update` | Actualizar múltiples shows | **Contingencia**: Admin marca 5 shows exteriores como invisibles de una vez por lluvia intensa | ❌ **Faltante** |

---

## GESTIÓN DE EVENTOS

| Endpoint | Funcionalidad | Caso de Uso Detallado | Estado |
|----------|---------------|----------------------|--------|
| `GET /api/admin/events` | Listar eventos con filtros | **CU-02**: Admin ve eventos de hoy filtrados por show, o eventos con override activo para monitorear estado | ✅ **Desarrollado** |
| `POST /api/admin/events` | Crear nuevo evento | **Evento Especial**: Admin crea pase extra de "El Último Cantar" a las 20:00 por alta demanda turística | ✅ **Desarrollado** |
| `GET /api/admin/events/{id}` | Obtener evento específico | **CU-02**: Admin ve detalles del pase de 15:30 para verificar si tiene override o revisar estado calculado | ✅ **Desarrollado** |
| `PUT /api/admin/events/{id}` | Actualizar evento existente | **CU-03**: Sistema actualiza hora de "El Último Cantar" de 15:30 a 15:45 tras importación de datos | ✅ **Desarrollado** |
| `DELETE /api/admin/events/{id}` | Eliminar evento | **Cancelación**: Admin elimina pase de las 20:00 que se canceló definitivamente | ✅ **Desarrollado** |
| `PATCH /api/admin/events/{id}/override` | Gestionar override manual | **CU-02**: Operador marca pase 15:30 como "CANCELADO" por "Problema técnico con sonido", requiere razón obligatoria | ✅ **Desarrollado** |
| `POST /api/admin/events/bulk-update` | Actualizar múltiples eventos | **Importación Masiva**: Sistema actualiza 150 eventos de una vez tras sincronización diaria de Puy du Fou | ❌ **Faltante** |

---

## DASHBOARD Y MÉTRICAS

| Endpoint | Funcionalidad | Caso de Uso Detallado | Estado |
|----------|---------------|----------------------|--------|
| `GET /api/admin/dashboard` | Datos principales del dashboard | **CU-02**: Panel admin muestra: modo actual (auto/manual), 5 shows activos, 2 overrides activos, última sync: 06:00, vista previa pantallas | ❌ **Faltante** |
| `GET /api/admin/stats/overview` | Métricas generales del sistema | **CU-02**: Dashboard muestra: 15 shows totales, 45 eventos hoy, 2 overrides activos, uptime 99.8%, última importación exitosa | ❌ **Faltante** |
| `GET /api/admin/stats/shows` | Estadísticas por show | **Reporting**: Admin ve que "El Último Cantar" tiene 3 pases hoy, duración promedio 45min, 85% ocupación estimada | ❌ **Faltante** |
| `GET /api/admin/stats/events` | Análisis de eventos | **Reporting**: Admin analiza que se han realizado 120 eventos esta semana, 5% tuvieron override, promedio 2h entre pases | ❌ **Faltante** |
| `GET /api/admin/stats/overrides` | Análisis de overrides | **Auditoría**: Admin ve que operator1 ha hecho 5 overrides esta semana, principalmente por lluvia en shows exteriores | ❌ **Faltante** |
| `GET /api/admin/reports/daily` | Reporte diario | **Gestión**: Admin descarga PDF con resumen del día: eventos realizados, cancelados, incidencias, tiempo medio de acceso | ❌ **Faltante** |
| `GET /api/admin/reports/weekly` | Reporte semanal | **Dirección**: Gerencia recibe resumen semanal: shows más populares, horarios de mayor affluencia, efectividad de lead times | ❌ **Faltante** |

---

## CONFIGURACIÓN DEL SISTEMA

| Endpoint | Funcionalidad | Caso de Uso Detallado | Estado |
|----------|---------------|----------------------|--------|
| `GET /api/admin/config/global` | Obtener configuración completa | **CU-02**: Panel admin carga configuración actual: modo manual, lead time 30min, máx 5 shows, refresh 30s, timezone Madrid | ✅ **Desarrollado** |
| `PUT /api/admin/config/global` | Actualizar configuración global | **CU-02**: Admin cambia a modo manual por evento especial, aumenta máx shows a 6, cambia refresh a 15s por mayor dinamismo | ✅ **Desarrollado** |
| `GET /api/admin/config/operation-mode` | Modo de operación actual | **CU-02**: Dashboard consulta si está en modo automático o manual para mostrar controles correctos | ✅ **Desarrollado** |
| `PUT /api/admin/config/operation-mode` | Cambiar modo operación | **CU-02**: Admin cambia de automático a manual porque habrá evento especial y quiere control total sobre cambios | ✅ **Desarrollado** |
| `GET /api/admin/config/venue-hours` | Horarios del venue | **Configuración**: Admin revisa horarios: Lu-Ju 10-18h, Vi 10-20h, Sa 10-22h, Do 10-20h para configurar lead times | ✅ **Desarrollado** |
| `PUT /api/admin/config/venue-hours` | Actualizar horarios venue | **Temporada**: Admin actualiza horarios de verano: Lu-Do 10-22h para temporada alta turística | ✅ **Desarrollado** |

---

## 🎯 **SISTEMA DE CONFIGURACIÓN GLOBAL - DOCUMENTACIÓN TÉCNICA**

### **Arquitectura Implementada**

El sistema de configuración global utiliza el modelo `GlobalSettings` existente con estructura clave-valor JSONB que permite flexibilidad mientras mantiene estructura en las claves.

#### **Componentes del Sistema:**

1. **Modelo de Datos**: `GlobalSettings` (tabla: `global_settings`)
   ```python
   # Estructura tabla
   key: String(100) PRIMARY KEY          # Clave de configuración
   value: JSONB NOT NULL                 # Valor en formato JSON
   description: Text                     # Descripción de la configuración
   updated_at: DateTime                  # Timestamp de última actualización
   updated_by: String(100)              # Usuario que realizó el cambio
   ```

2. **Schemas Pydantic** (`app/schemas/config.py`):
   - `GlobalConfig`: Configuración completa del sistema
   - `GlobalConfigUpdate`: Actualización parcial de configuración
   - `OperationModeResponse/Update`: Gestión específica del modo de operación
   - `VenueHoursResponse/Update`: Gestión específica de horarios del venue
   - `ConfigurationChangeResponse`: Respuesta detallada de cambios

3. **Servicio de Negocio** (`app/services/config_service.py`):
   - `ConfigService`: Gestión completa de configuraciones
   - Métodos principales: get/update para cada tipo de configuración
   - Auditoría automática en `AuditLog`
   - Creación automática de valores por defecto

#### **Configuraciones Gestionadas:**

##### **Lead Times (Tiempos de Anticipación)**
```json
{
  "lead_times": {
    "default_lead_time_access_minutes": 30,    // Minutos para cambiar PROGRAMADO→ABIERTO
    "default_lead_time_finalized_minutes": 0   // Minutos para cambiar ABIERTO→CERRADO
  }
}
```

##### **Configuración de Display**
```json
{
  "display": {
    "max_shows_display": 5,                    // Máximo shows en pantallas públicas
    "display_refresh_seconds": 30              // Intervalo de actualización
  }
}
```

##### **Configuración del Venue**
```json
{
  "venue": {
    "venue_name": "Puy du Fou España",
    "venue_timezone": "Europe/Madrid",
    "park_opening_time": "10:00",              // Formato HH:MM
    "park_closing_time": "22:00"               // Formato HH:MM
  }
}
```

##### **Configuración de Importación**
```json
{
  "import_settings": {
    "auto_import_enabled": true,
    "import_schedule_cron": "0 6 * * *"        // Cron para importación automática
  }
}
```

##### **Estados del Sistema**
```json
{
  "system_states": {
    "states": {
      "programado": {"color": "gray", "label": "Programado"},
      "abierto": {"color": "green", "label": "Abierto"},
      "cerrado": {"color": "red", "label": "Cerrado"},
      "cancelado": {"color": "yellow", "label": "Cancelado"}
    }
  }
}
```

##### **Modo de Operación**
```json
{
  "operation_mode": "automatic"                // "automatic" | "manual"
}
```

### **Endpoints Implementados - Especificación Técnica**

#### **1. GET /api/admin/config/global**
```http
GET /api/admin/config/global
Authorization: Bearer <jwt_token>
```

**Respuesta:**
```json
{
  "lead_times": {
    "default_lead_time_access_minutes": 30,
    "default_lead_time_finalized_minutes": 0
  },
  "display": {
    "max_shows_display": 5,
    "display_refresh_seconds": 30
  },
  "venue": {
    "venue_name": "Puy du Fou España",
    "venue_timezone": "Europe/Madrid",
    "park_opening_time": "10:00",
    "park_closing_time": "22:00"
  },
  "import_settings": {
    "auto_import_enabled": true,
    "import_schedule_cron": "0 6 * * *"
  },
  "system_states": {
    "states": {
      "programado": {"color": "gray", "label": "Programado"},
      "abierto": {"color": "green", "label": "Abierto"},
      "cerrado": {"color": "red", "label": "Cerrado"},
      "cancelado": {"color": "yellow", "label": "Cancelado"}
    }
  },
  "operation_mode": "automatic"
}
```

**Funcionalidad:**
- Carga configuración completa del sistema
- Crea valores por defecto si no existen
- Auto-inicialización en primera consulta

#### **2. PUT /api/admin/config/global**
```http
PUT /api/admin/config/global
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "operation_mode": "manual",
  "lead_times": {
    "default_lead_time_access_minutes": 45,
    "default_lead_time_finalized_minutes": 5
  },
  "display": {
    "max_shows_display": 6
  }
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Configuración actualizada correctamente",
  "updated_fields": ["operation_mode", "lead_times", "display"],
  "previous_values": {
    "operation_mode": "automatic",
    "lead_times": {
      "default_lead_time_access_minutes": 30,
      "default_lead_time_finalized_minutes": 0
    }
  },
  "new_values": {
    "operation_mode": "manual",
    "lead_times": {
      "default_lead_time_access_minutes": 45,
      "default_lead_time_finalized_minutes": 5
    }
  },
  "updated_at": "2025-07-22T16:24:14.917718+00:00",
  "updated_by": "admin"
}
```

**Funcionalidad:**
- Actualización parcial (solo campos enviados)
- Preserva valores no modificados
- Auditoría completa de cambios
- Validación de tipos y rangos

#### **3. GET /api/admin/config/operation-mode**
```http
GET /api/admin/config/operation-mode
Authorization: Bearer <jwt_token>
```

**Respuesta:**
```json
{
  "current_mode": "manual",
  "description": "Sistema en modo manual - cambios retenidos hasta sincronización",
  "last_changed_at": "2025-07-22T16:24:14.866065+00:00",
  "changed_by": "admin"
}
```

**Funcionalidad:**
- Consulta específica del modo actual
- Descripción contextual del modo
- Metadatos del último cambio

#### **4. PUT /api/admin/config/operation-mode**
```http
PUT /api/admin/config/operation-mode
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "mode": "automatic",
  "reason": "Mantenimiento finalizado - reanudando sincronización automática"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Modo de operación cambiado a automatic",
  "updated_fields": ["operation_mode"],
  "previous_values": {"operation_mode": "manual"},
  "new_values": {"operation_mode": "automatic"},
  "updated_at": "2025-07-22T16:25:06.126015+00:00",
  "updated_by": "admin"
}
```

**Funcionalidad:**
- Cambio específico de modo operativo
- Validación de estado actual
- Auditoría con motivo del cambio

#### **5. GET /api/admin/config/venue-hours**
```http
GET /api/admin/config/venue-hours
Authorization: Bearer <jwt_token>
```

**Respuesta:**
```json
{
  "park_opening_time": "09:30",
  "park_closing_time": "23:00",
  "venue_timezone": "Europe/Madrid",
  "is_open_now": true,
  "next_opening": null,
  "next_closing": null
}
```

**Funcionalidad:**
- Horarios específicos del venue
- Estado actual (abierto/cerrado)
- Próximos eventos de apertura/cierre (TODO)

#### **6. PUT /api/admin/config/venue-hours**
```http
PUT /api/admin/config/venue-hours
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "park_opening_time": "09:30",
  "park_closing_time": "23:00"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Horarios del venue actualizados correctamente",
  "updated_fields": ["park_opening_time", "park_closing_time"],
  "previous_values": {
    "park_opening_time": "10:00",
    "park_closing_time": "22:00"
  },
  "new_values": {
    "park_opening_time": "09:30",
    "park_closing_time": "23:00"
  },
  "updated_at": "2025-07-22T16:25:57.683362+00:00",
  "updated_by": "admin"
}
```

**Funcionalidad:**
- Actualización específica de horarios
- Validación formato HH:MM
- Preserva resto de configuración del venue

### **Validaciones Implementadas**

1. **Rangos de Valores:**
   - `lead_time_access_minutes`: 0-120 minutos
   - `lead_time_finalized_minutes`: 0-60 minutos
   - `max_shows_display`: 1-10 shows
   - `display_refresh_seconds`: 10-300 segundos

2. **Formatos:**
   - Horarios: Formato HH:MM validado
   - Operation mode: Solo "automatic" | "manual"
   - Timezone: String válido (TODO: validación timezone)

3. **Reglas de Negocio:**
   - Solo un modo operativo a la vez
   - Preservación de configuraciones no modificadas
   - Auditoría obligatoria de todos los cambios

### **Sistema de Auditoría**

Todos los cambios de configuración se registran en `audit_logs`:
```python
# Registro automático
entity_type: "configuration"
entity_id: None                    # Config global no tiene ID específico  
action: "UPDATE_GLOBAL_CONFIG" | "UPDATE_OPERATION_MODE" | "UPDATE_VENUE_HOURS"
user_id: <username_from_jwt>
new_values: {"details": "Descripción del cambio"}
```

### **Casos de Uso Validados**

1. **✅ Configuración Inicial**: Sistema crea valores por defecto automáticamente
2. **✅ Actualización Parcial**: Solo campos modificados se actualizan
3. **✅ Cambio de Modo**: Transición automatic ↔ manual con auditoría
4. **✅ Horarios Especiales**: Actualización para eventos especiales
5. **✅ Auditoría Completa**: Todos los cambios registrados con usuario y timestamp

---

## ALERTAS GLOBALES

| Endpoint | Funcionalidad | Caso de Uso Detallado | Estado |
|----------|---------------|----------------------|--------|
| `GET /api/admin/alerts/global` | Estado actual de alerta | **CU-02**: Panel admin verifica si hay alerta activa para mostrar botón "DESACTIVAR" en rojo si está activa | ✅ **Desarrollado** |
| `POST /api/admin/alerts/global` | Activar alerta global | **EMERGENCIA**: Operador activa alerta "Evacuación preventiva por tormenta eléctrica - Todos los espectáculos suspendidos" | ✅ **Desarrollado** |
| `DELETE /api/admin/alerts/global` | Desactivar alerta global | **Post-Emergencia**: Operador desactiva alerta tras pasar tormenta, pantallas vuelven a mostrar horarios normales | ✅ **Desarrollado** |
| `GET /api/admin/alerts/history` | Historial de alertas | **Auditoría**: Admin revisa alertas del último mes: 3 por lluvia, 1 por corte eléctrico, duración promedio 45min | ✅ **Desarrollado** |

---

## IMPORTACIÓN Y SINCRONIZACIÓN

| Endpoint | Funcionalidad | Caso de Uso Detallado | Estado |
|----------|---------------|----------------------|--------|
| `POST /api/admin/import` | Importar datos externos | **CU-03**: Script Python envía 150 eventos de Puy du Fou API cada día a las 06:00 con metadatos de importación | ❌ **Faltante** |
| `POST /api/admin/import/validate` | Validar sin aplicar | **Preview**: Admin ve que importación cambiará 5 horarios y creará 3 eventos nuevos, sin aplicar cambios aún | ❌ **Faltante** |
| `GET /api/admin/import/history` | Historial de importaciones | **CU-03**: Admin ve últimas importaciones: 21/07 06:00 exitosa (150 eventos), 20/07 06:00 exitosa (145 eventos) | ❌ **Faltante** |
| `GET /api/admin/sync/status` | Estado de sincronización | **CU-03**: Dashboard muestra "Modo Manual - 15 cambios pendientes desde 06:00" con botón "SINCRONIZAR" | ❌ **Faltante** |
| `GET /api/admin/sync/pending` | Cambios pendientes | **Modo Manual**: Admin ve preview de cambios: 10 eventos nuevos, 5 horarios modificados, 0 conflictos con overrides | ❌ **Faltante** |
| `POST /api/admin/sync/execute` | Ejecutar sincronización manual | **CU-03**: Admin revisa cambios pendientes y clickea "APLICAR" para sincronizar con preservación de overrides | ❌ **Faltante** |
| `POST /api/admin/sync/apply` | Aplicar cambios pendientes | **Modo Manual**: Sistema aplica 15 cambios pendientes, preserva 2 overrides activos, actualiza cache de pantallas | ❌ **Faltante** |
| `POST /api/admin/sync/discard` | Descartar cambios pendientes | **Modo Manual**: Admin descarta cambios pendientes porque prefiere mantener configuración actual durante evento especial | ❌ **Faltante** |

---

## AUDITORÍA Y LOGS

| Endpoint | Funcionalidad | Caso de Uso Detallado | Estado |
|----------|---------------|----------------------|--------|
| `GET /api/admin/audit-logs` | Registro de auditoría completo | **Supervisión**: Admin ve log: 10:30 user:operator1 OVERRIDE_CREATE event:15:30 reason:"Problema técnico" | ❌ **Faltante** |
| `GET /api/admin/audit-logs/events/{id}` | Auditoría de evento específico | **Investigación**: Admin ve historial completo del evento 15:30: creado por import, modificado 2 veces, override por operator1 | ❌ **Faltante** |
| `GET /api/admin/audit-logs/users/{id}` | Acciones de usuario específico | **Supervisión**: Admin ve que operator1 ha hecho 5 overrides esta semana, todos por motivos técnicos válidos | ❌ **Faltante** |
| `GET /api/admin/audit-logs/overrides` | Log específico de overrides | **Análisis**: Admin identifica patrones: 80% overrides por lluvia, 20% por problemas técnicos, mayoría entre 14-16h | ❌ **Faltante** |

---

## HERRAMIENTAS DE DESARROLLO

| Endpoint | Funcionalidad | Caso de Uso Detallado | Estado |
|----------|---------------|----------------------|--------|
| `GET /api/admin/debug/event-state/{id}` | Debug cálculo de estado | **Desarrollo**: Técnico ve por qué evento 15:30 está "PROGRAMADO": hora actual 15:00, lead time 30min, abre a 15:00 | ❌ **Faltante** |
| `POST /api/admin/test/simulate-time` | Simular tiempo del sistema | **Testing**: Técnico simula que son las 15:25 para ver cómo cambiarían estados antes del go-live | ❌ **Faltante** |
| `GET /api/admin/preview/public-display` | Preview exacto de pantallas | **CU-02**: Admin ve réplica exacta de lo que muestran pantallas públicas en tiempo real para validar cambios | ❌ **Faltante** |
| `POST /api/admin/test/import-data` | Probar importación sin aplicar | **Testing**: Técnico prueba formato de datos de scripts Python sin afectar producción | ❌ **Faltante** |

---

## PERFORMANCE Y MANTENIMIENTO

| Endpoint | Funcionalidad | Caso de Uso Detallado | Estado |
|----------|---------------|----------------------|--------|
| `POST /api/admin/cache/invalidate` | Forzar invalidación cache | **Mantenimiento**: Admin invalida cache tras cambios manuales para que pantallas se actualicen inmediatamente | ❌ **Faltante** |
| `GET /api/admin/performance/stats` | Métricas de rendimiento | **Monitoreo**: Técnico ve: API responde en 50ms promedio, cache hit 95%, memoria 2GB usada, CPU 15% | ❌ **Faltante** |
| `GET /health` | Health check del sistema | **Monitoreo**: Sistema de monitoreo verifica cada minuto que API responde, BD conectada, componentes OK | ✅ **Desarrollado** |
| `GET /` | Endpoint raíz | **Verificación**: Verificar que API está funcionando correctamente | ✅ **Desarrollado** |

---

## INTEGRACIONES Y WEBHOOKS

| Endpoint | Funcionalidad | Caso de Uso Detallado | Estado |
|----------|---------------|----------------------|--------|
| `GET /api/admin/integrations/status` | Estado integraciones externas | **Monitoreo**: Admin ve estado conexión API Puy du Fou: OK, última consulta 06:00, próxima 06:00 mañana | ❌ **Faltante** |
| `POST /api/admin/webhooks/register` | Registrar webhook externo | **Integración**: Admin configura webhook para notificar a sistema externo cuando hay alerta global | ❌ **Faltante** |
| `GET /api/admin/notifications/config` | Configuración notificaciones | **Alertas**: Admin configura email/SMS para notificar overrides críticos a responsable de turno | ❌ **Faltante** |
| `POST /api/admin/notifications/test` | Probar notificaciones | **Testing**: Admin prueba que llegan correctamente notificaciones por email cuando se activa alerta | ❌ **Faltante** |

---

## RESUMEN ESTADÍSTICO

| Categoría | Total Endpoints | Desarrollados | Faltantes | % Completado |
|-----------|----------------|---------------|-----------|--------------|
| **Pantallas Públicas** | 2 | 2 | 0 | 100% ✅ |
| **Autenticación** | 8 | 4 | 4 | 50% |
| **Gestión Shows** | 8 | 5 | 3 | 63% |
| **Gestión Eventos** | 7 | 6 | 1 | 86% |
| **Dashboard/Métricas** | 7 | 0 | 7 | 0% ❌ |
| **Configuración Sistema** | 6 | 6 | 0 | 100% ✅ |
| **Alertas Globales** | 4 | 4 | 0 | 100% ✅ |
| **Importación/Sync** | 8 | 0 | 8 | 0% ❌ |
| **Auditoría** | 4 | 0 | 4 | 0% ❌ |
| **Herramientas Dev** | 4 | 0 | 4 | 0% ❌ |
| **Performance** | 3 | 1 | 2 | 33% |
| **Integraciones** | 4 | 0 | 4 | 0% ❌ |
| **TOTAL GENERAL** | **65** | **28** | **37** | **43%** |

### 🎯 Conclusión
La API actual tiene una base sólida para gestión básica de shows/eventos, y ha completado sistemas críticos de **alertas globales** y **configuración del sistema**. Faltan **37 endpoints** (57%) para ser un sistema completo según especificaciones. Los gaps más críticos restantes están en sistema de importación/sincronización y herramientas de dashboard.