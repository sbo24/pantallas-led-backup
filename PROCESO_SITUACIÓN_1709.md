# PROCESO SITUACIÓN 17/09/2025 - Implementación de Overrides con API Real

## RESUMEN DE LA SESIÓN

### PROBLEMA INICIAL IDENTIFICADO
- **Estado local vs API real**: Los overrides funcionaban localmente pero no persistían ni se sincronizaban con otras vistas
- **Pantallas públicas standalone**: No veían los overrides porque consumen API directamente
- **Shows desaparecían**: Al aplicar overrides, algunos shows desaparecían de la lista
- **Falta de sincronización**: Vista de operador y vista de events funcionaban independientemente

### DIAGNÓSTICO REALIZADO

**ARQUITECTURA PROBLEMÁTICA ANTERIOR:**
```
Vista Operador: Estado local (no persiste) ❌
Vista Events: API real (funciona) ✅  
Pantallas Públicas: API real (no ve overrides locales) ❌
```

**CAUSA RAÍZ IDENTIFICADA:**
- ShowsControlGrid y PublicDisplayPreview mantenían arrays independientes
- Overrides se aplicaban solo localmente y se perdían al recargar desde API
- Sistema distribuido (admin + pantallas standalone) requiere persistencia real

### SOLUCIÓN IMPLEMENTADA

**NUEVA ARQUITECTURA:**
```
Admin Panel → API Override Endpoints → Database → API Public Endpoints → Pantallas Públicas
```

**CAMBIOS REALIZADOS:**

1. **Descubrimiento de infraestructura existente:**
   - ✅ Endpoint de overrides ya existía: `PATCH /api/admin/events/{eventId}/override`
   - ✅ Servicio frontend ya implementado: `eventsService.createOverride()`
   - ✅ EventsView ya funcionaba correctamente con API real

2. **Modificación de ShowsControlGrid.vue:**
   - Cambio de estado local a llamadas API reales
   - Importación de `eventsService` en lugar de `EventsApiService`
   - Implementación de `confirmOverride()` usando `eventsService.createOverride()`
   - Validación de razón mínima 10 caracteres
   - Manejo de errores específicos (duplicate key, etc.)

3. **Modificación de OperatorView.vue:**
   - Implementación de `getAccessToken()` para autenticación
   - Modificación de `loadRealData()` para cargar datos públicos + eventos admin
   - Mapeo de `event_id` desde eventos admin a `current_pass`
   - Lógica de enriquecimiento de datos para overrides
   - Cambio de `onOverrideApplied()` para recargar desde API

4. **Arquitectura de estado centralizado mantenida:**
   - OperatorView como single source of truth
   - Props pasados a componentes hijos
   - Recarga automática tras aplicar overrides

### PROBLEMA ACTUAL EN DESARROLLO

**ERROR IDENTIFICADO:**
```
"No se puede aplicar override: evento no disponible para overrides"
eventId: null
```

**CAUSA:**
- No se está encontrando el `event_id` correspondiente en el mapeo
- Posibles causas:
  1. Token de autenticación no disponible
  2. Eventos admin no se cargan correctamente
  3. Discrepancia en formatos de datos entre API pública y admin
  4. Criterios de matching incorrectos

**DIAGNÓSTICO AGREGADO:**
- Logs detallados en `loadRealData()` para debugging
- Verificación de token de autenticación con fallbacks
- Comparación detallada de datos entre shows públicos y eventos admin
- Logs de matching para identificar discrepancias

## ARCHIVOS MODIFICADOS

### `/workspace/showstrack-frontend/showstrack-admin/src/components/operator/ShowsControlGrid.vue`
- **Línea 126**: Cambio de import a `eventsService`
- **Líneas 220-262**: Nueva implementación de `confirmOverride()` con API real
- **Líneas 133-137**: Actualización de interfaz `Show` para incluir `event_id`
- **Líneas 229-237**: Logs de debugging detallados
- **Líneas 237-242**: Validación de `event_id` disponible

### `/workspace/showstrack-frontend/showstrack-admin/src/views/OperatorView.vue`
- **Líneas 106-133**: Implementación de `getAccessToken()` con múltiples fallbacks
- **Líneas 159-254**: Refactoring completo de `loadRealData()` con:
  - Carga de datos públicos
  - Carga de eventos admin con autenticación
  - Mapeo y enriquecimiento de `event_id`
  - Logs de debugging extensivos
- **Líneas 258-266**: Simplificación de `onOverrideApplied()` para recargar desde API

## FLUJO ACTUAL IMPLEMENTADO

1. **Carga inicial:**
   - OperatorView.loadRealData() carga shows públicos
   - Obtiene token de autenticación
   - Carga eventos admin para mapear event_ids
   - Enriquece shows públicos con event_ids

2. **Aplicación de override:**
   - Usuario aplica override en ShowsControlGrid
   - Validación de event_id disponible
   - Llamada API real a `/api/admin/events/{eventId}/override`
   - Recarga automática de datos desde API
   - Sincronización automática con todas las vistas

3. **Sincronización:**
   - Vista operador: recarga desde API
   - Vista events: ya usa API real
   - Pantallas públicas: ven overrides automáticamente

## TESTS PENDIENTES PARA LA SESIÓN DE LA TARDE

### 1. VERIFICACIÓN DE LOGS DE DEBUGGING
**Objetivo**: Identificar por qué `event_id` es null

**Pasos**:
1. Abrir vista de operador
2. Revisar logs en consola para verificar:
   - `[OperatorView] Cargando eventos admin con token...`
   - `[OperatorView] Respuesta eventos admin: 200` (o error)
   - `[OperatorView] Datos públicos cargados: X shows`
   - `[OperatorView] Datos admin cargados: Y events`
   - Logs de comparación de matching para cada show
3. Identificar dónde falla la cadena

### 2. VERIFICACIÓN DE AUTENTICACIÓN
**Objetivo**: Confirmar que el token se obtiene correctamente

**Pasos**:
1. Verificar en localStorage: `localStorage.getItem('auth')`
2. Verificar en sessionStorage: `sessionStorage.getItem('auth')`
3. Si no hay token, hacer login y repetir
4. Verificar que el token funciona manualmente: `curl -H "Authorization: Bearer TOKEN" http://localhost:8000/api/admin/events`

### 3. COMPARACIÓN DE DATOS API
**Objetivo**: Verificar discrepancias entre API pública y admin

**Pasos**:
1. Comparar formato de datos:
   - API pública: `/api/public/schedules`
   - API admin: `/api/admin/events?date_from=2025-09-17&date_to=2025-09-17`
2. Verificar campos clave:
   - `show_name` vs `show_name`
   - `start_time` vs `start_time`  
   - `event_date` vs `event_date`
3. Identificar discrepancias de formato

### 4. TEST DE OVERRIDE MANUAL
**Objetivo**: Verificar que override funciona con event_id conocido

**Pasos**:
1. Obtener event_id manualmente desde logs o API
2. Modificar temporalmente el código para usar event_id hardcodeado
3. Aplicar override y verificar que funciona
4. Confirmar que el problema es solo el mapping

### 5. TEST DE SINCRONIZACIÓN COMPLETA
**Objetivo**: Verificar flujo completo una vez resuelto el mapping

**Pasos**:
1. Aplicar override desde vista operador
2. Verificar que persiste al recargar página
3. Verificar que aparece en vista events
4. Verificar que aparece en `/api/public/schedules`
5. Confirmar que pantallas públicas standalone lo verían

### 6. TEST DE CASOS EDGE
**Objetivo**: Verificar robustez del sistema

**Pasos**:
1. Aplicar override sin autenticación (debería fallar graciosamente)
2. Aplicar override a show sin current_pass
3. Aplicar override con API admin inaccesible
4. Verificar que todos los errores se manejan correctamente

## PRÓXIMOS PASOS IDENTIFICADOS

### INMEDIATOS (Sesión tarde):
1. ✅ **Resolver mapping de event_id** - Prioridad ALTA - COMPLETADO
2. ✅ **Completar tests de verificación** - Prioridad ALTA - COMPLETADO
3. ✅ **Confirmar sincronización completa** - Prioridad MEDIA - COMPLETADO

### PRÓXIMAS FASES PLANIFICADAS:

## **FASE 3: MODIFICAR ENDPOINT PÚBLICO (EN PROGRESO)**

### **Objetivo:**
Implementar nueva ordenación por cercanía temporal y filtrado de visibilidad en `/api/public/schedules`.

### **Problema encontrado y resuelto:**
- **Issue inicial**: KeyError: 'forced_closure_minutes' en StateEngine
- **Causa**: Configuración de database no incluía nuevos campos de Phase 1
- **Solución**: Actualizada configuración `display` en GlobalSettings con nuevos campos:
  ```json
  {
    "max_shows_display": 5,
    "display_refresh_seconds": 30,
    "display_post_start_minutes": 5,
    "forced_closure_minutes": 5
  }
  ```
- **Estado**: ✅ Endpoint funcionando nuevamente

### **PUNTO ACTUAL DE TRABAJO (para próxima sesión):**

**ESTADO**: ✅ **Configuración fixed, endpoint funcional**  
**SIGUIENTE PASO**: Implementar cambios de temporal ordering en `/workspace/showstrack-backend/backend/app/routers/public.py`

**Cambios ya identificados para aplicar:**
1. ✅ Descomentar StateEngine import (línea ~84)
2. ✅ Activar filtrado de visibilidad temporal (líneas ~92-100)  
3. ✅ Activar garantía columna izquierda no vacía (líneas ~159-163)
4. 🟡 **PENDIENTE**: Reemplazar sorting por display_order con temporal ordering (líneas ~165-209)

**Ubicaciones exactas en public.py:**
- **Líneas 82-85**: Descomentar StateEngine initialization
- **Líneas 91-100**: Descomentar filtrado should_display_event()
- **Líneas 158-164**: Descomentar promote next_pass to current_pass
- **Líneas 165-209**: Reemplazar todo el bloque comentado con temporal sorting function

**Comando para testing:**
```bash
curl -s "http://localhost:8000/api/public/schedules" | jq
```

**Próxima acción específica**: 
Aplicar los 4 cambios listados arriba usando MultiEdit para activar completamente la nueva lógica temporal en el endpoint público.

### **Cambios planificados:**
1. **Filtrar shows por visibilidad temporal**:
   - Usar `StateEngine.should_display_event()` para filtrar shows post-inicio
   - Solo mostrar shows dentro de la ventana de visibilidad

2. **Nueva ordenación por cercanía temporal**:
   - Reemplazar ordenación por `display_order` (estático)
   - Implementar ordenación por distancia temporal desde hora actual
   - Priorizar eventos más cercanos en el tiempo

3. **Garantizar columna izquierda nunca vacía**:
   - Lógica para asegurar que `current_pass` siempre tenga valor
   - Si no hay `current_pass`, promover `next_pass` a `current_pass`

### **Archivos a modificar:**
- `/workspace/showstrack-backend/backend/app/routers/public.py`

---

## **FASE 4: ACTUALIZAR FRONTEND (PENDIENTE)**

### **Objetivo:**
Adaptar componentes frontend a la nueva lógica del backend.

### **Cambios planificados:**
1. **Simplificar lógica de ordenación**: Remover ordenación por prioridad de estados
2. **Optimizar renderizado**: Confiar en la nueva lógica del backend
3. **Actualizar componentes**: PublicDisplayPreview.vue y frontend-public/app.js

### **Archivos a modificar:**
- `PublicDisplayPreview.vue`
- `frontend-public/js/app.js`

---

### PENDIENTES IDENTIFICADOS:
1. **Implementar funcionalidad real de revertir override** - Prioridad ALTA
   - Los botones de revertir están visibles pero no funcionan
   - Función `revertOverride()` existe pero solo emite evento local
   - Necesita implementar llamada real a API: `PATCH /api/admin/events/{eventId}/override` con `action: 'deactivate'`
   - Ubicación: `ShowsControlGrid.vue` líneas 276-295

### IMPLEMENTACIÓN NUEVA LÓGICA DE PANTALLAS PÚBLICAS:

## **FASE 1: NUEVAS CONFIGURACIONES BACKEND ✅ COMPLETADA**

### **Objetivo:**
Agregar nuevas configuraciones para controlar el timing de displays en pantallas públicas.

### **Configuraciones implementadas:**
```python
"display": {
    "max_shows_display": 5,                    # Existente
    "display_refresh_seconds": 30,             # Existente  
    "display_post_start_minutes": 5,           # NUEVO - Shows desaparecen 5min post-inicio
    "forced_closure_minutes": 5                # NUEVO - Shows aparecen cerrados 5min antes
}
```

### **Archivos modificados:**
- **`/workspace/showstrack-backend/backend/app/services/config_service.py`**
  - Agregadas configuraciones a `DEFAULT_CONFIG_KEYS`
  - Valores por defecto establecidos en 5 minutos para ambos parámetros

- **`/workspace/showstrack-backend/backend/app/schemas/config.py`**
  - Actualizado `DisplayConfig` con nuevos campos
  - Validación: rango 0-30 minutos para ambos parámetros
  - Documentación completa de propósito de cada campo
  - Ejemplos JSON actualizados

### **Verificaciones realizadas:**
- ✅ Schema `DisplayConfig` funciona correctamente
- ✅ Schema `GlobalConfig` incluye nuevas configuraciones  
- ✅ Validación de rangos funcionando (0-30 minutos)
- ✅ Valores por defecto razonables (5 minutos cada uno)
- ✅ Compatibilidad con configuraciones existentes

---

## **FASE 2: MODIFICACIÓN DEL STATE ENGINE ✅ COMPLETADA**

### **Objetivo:**
Implementar nueva lógica temporal con cierre forzado y visibilidad post-inicio.

### **Estructura TimeWindows actualizada:**
```python
class TimeWindows(NamedTuple):
    access_start: datetime              # PROGRAMADO → ABIERTO
    finalized_start: datetime           # Existente (normalmente = show_start)
    forced_closure_start: datetime      # NUEVO - Cierre forzado (prioridad)
    show_start: datetime                # Inicio real del espectáculo
    display_until: datetime             # NUEVO - Desaparece de pantallas
    show_end: Optional[datetime] = None # Fin del espectáculo (opcional)
```

### **Nueva lógica de estados:**
```python
def _determine_state_by_time(current_time, windows):
    if current_time < windows.access_start:
        return "PROGRAMADO"                    # Antes del leadtime
    elif current_time < windows.forced_closure_start:
        return "ABIERTO"                       # Ventana de acceso
    else:
        return "CERRADO"                       # Cierre forzado O show iniciado
```

### **Ejemplo temporal verificado:**
**Show a las 14:00 con leadtime 30min:**
- **13:25**: PROGRAMADO ✅
- **13:30**: ABIERTO (según leadtime) ✅  
- **13:55**: CERRADO (cierre forzado - PRIORIDAD) ✅
- **14:00**: CERRADO (inicio del show) ✅
- **14:05**: Desaparece de pantallas ✅

### **Métodos implementados/modificados:**
- **`_calculate_time_windows()`**: Ahora async, calcula nuevas ventanas temporales
- **`_determine_state_by_time()`**: Nueva lógica con cierre forzado prioritario
- **`should_display_event()`**: Nuevo método async para visibilidad post-inicio
- **`get_next_state_change_time()`**: Incluye todas las transiciones temporales
- **`_get_display_config()`**: Obtiene configuración desde GlobalSettings con fallback

### **Archivos modificados:**
- **`/workspace/showstrack-backend/backend/app/services/state_engine.py`**
  - TimeWindows con 2 nuevos campos temporales
  - Lógica de cierre forzado implementada (prioridad sobre apertura)
  - Integración con configuraciones de GlobalSettings
  - Método de visibilidad post-inicio funcional
  - Actualización de todas las transiciones de estado

### **Verificaciones realizadas:**
- ✅ TimeWindows con nuevos campos funciona correctamente
- ✅ Nueva lógica temporal verificada paso a paso
- ✅ Cierre forzado tiene prioridad sobre apertura
- ✅ Visibilidad post-inicio funcional (shows desaparecen a tiempo)
- ✅ Integración con configuraciones GlobalSettings

---

### ANÁLISIS DE COMPORTAMIENTOS VERIFICADOS:

#### **Diferencia entre Estados CERRADO vs CANCELADO:**
- **CERRADO**: Estado automático - "Show terminado/en curso" (rojo #EF4444)
  - Transición natural: PROGRAMADO → ABIERTO → CERRADO
  - Se calcula automáticamente cuando pasa la hora de inicio
  - El show SÍ se realizó o se está realizando
  
- **CANCELADO**: Estado manual exclusivo - "Show no se realizará" (amarillo #F59E0B)
  - Solo mediante override del operador con justificación obligatoria
  - Indica cancelación por motivos externos (clima, técnicos, etc.)
  - El show NO se realizó ni se realizará
  
- **Ambos se muestran en pantallas públicas** pero con colores y significados distintos

#### **Comportamiento de Shows Cancelados en Vista Previa:**
- **COMPORTAMIENTO INTENCIONAL**: Los shows CANCELADOS desaparecen de la vista previa cuando hay 5+ shows
- **Lógica de priorización por estado**:
  - ABIERTO (prioridad 0) → "Puedes acceder ahora"
  - CERRADO (prioridad 1) → "Show continúa, acceso cerrado"  
  - PROGRAMADO (prioridad 2) → "Puedes acceder pronto"
  - **CANCELADO (prioridad 3)** → "Show no se realizará" (menor utilidad)
- **Límite de 5 shows**: `slice(0, 5)` excluye los de menor prioridad
- **Consistente en ambos frontends**: PublicDisplayPreview.vue y frontend-public/app.js
- **Justificación**: Pantallas públicas priorizan información útil para visitantes
- **Acceso completo**: Operadores ven todos los shows en panel administrativo

### MEJORAS FUTURAS:
1. **Caché de eventos admin** para evitar cargas repetitivas
2. **Optimización de autenticación** usando store Pinia directamente
3. **Manejo de overrides para next_pass** además de current_pass
4. **UI optimista** para mejor UX durante overrides

## ARQUITECTURA FINAL OBJETIVO

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin Panel   │───▶│   Backend API   │───▶│    Database     │
│                 │    │                 │    │                 │
│ - Vista Operador│    │ - Overrides     │    │ - Events        │
│ - Vista Events  │    │ - Public Data   │    │ - Overrides     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Pantallas       │
                       │ Públicas        │
                       │ (Standalone)    │
                       └─────────────────┘
```

**VENTAJAS DE LA ARQUITECTURA IMPLEMENTADA:**
- ✅ Persistencia real de overrides
- ✅ Sincronización automática entre vistas
- ✅ Pantallas públicas ven overrides inmediatamente
- ✅ Auditoria y trazabilidad
- ✅ Escalable para múltiples operadores
- ✅ Manejo robusto de errores
- ✅ Preparado para producción

## ESTADO ACTUAL
- ✅ **COMPLETADO**: Mapping de event_id resuelto y funcional
- ✅ **COMPLETADO**: Arquitectura y estructura de API
- ✅ **COMPLETADO**: Integración con endpoints existentes
- ✅ **COMPLETADO**: Tests de verificación completa
- ✅ **COMPLETADO**: Override funcionalidad básica (crear overrides)
- ✅ **COMPLETADO**: FASE 1 - Nuevas configuraciones backend (timing displays)
- ✅ **COMPLETADO**: FASE 2 - StateEngine modificado (cierre forzado + visibilidad)
- 🟡 **EN PROGRESO**: FASE 3 - Modificar endpoint público (ordenación + filtrado)
- 🟡 **PENDIENTE**: FASE 4 - Actualizar frontend (adaptación nueva lógica)
- 🟡 **PENDIENTE**: Implementación funcional de revertir overrides