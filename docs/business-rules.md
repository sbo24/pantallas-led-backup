# 🧮 ShowsTrack APP - Reglas de Negocio y Lógica

## 3.1 Motor de Cálculo de Estados (5 Pasos)

### Visión General del Algoritmo

El motor de cálculo de estados es el corazón del sistema. Determina en tiempo real qué estado debe mostrar cada espectáculo basándose en múltiples factores.

```python
def calculate_event_state(event: ScheduledEvent, current_time: datetime) -> str:
    """
    Algoritmo principal de 5 pasos para determinar el estado de un evento.
    """
    # Paso 1: Verificar overrides activos
    if override := check_active_override(event.id):
        return override.status  # CERRADO o CANCELADO
    
    # Paso 2: Resolver lead times efectivos
    lead_times = resolve_lead_times(event.show, global_settings)
    
    # Paso 3: Calcular ventanas temporales
    windows = calculate_time_windows(event, lead_times)
    
    # Paso 4: Determinar estado según hora actual
    state = determine_state_by_time(current_time, windows)
    
    # Paso 5: Aplicar casos especiales
    return apply_special_cases(event, state)
```

### Paso 1: Verificación de Overrides Activos

```python
def check_active_override(event_id: int) -> Optional[StatusOverride]:
    """
    Busca si existe un override manual activo para el evento.
    Los overrides tienen prioridad absoluta sobre el cálculo automático.
    """
    override = db.query(StatusOverride).filter(
        StatusOverride.scheduled_event_id == event_id,
        StatusOverride.is_active == True
    ).first()
    
    return override  # None si no hay override activo
```

**Reglas**:
- Override activo tiene prioridad máxima
- Solo puede haber un override activo por evento
- Estados posibles: CERRADO, CANCELADO
- Persisten hasta desactivación manual

### Paso 2: Resolución de Lead Times (Jerarquía)

```python
def resolve_lead_times(show: Show, global_settings: dict) -> LeadTimeConfig:
    """
    Determina los lead times efectivos siguiendo la jerarquía:
    1. Configuración específica del show (máxima prioridad)
    2. Configuración global del sistema
    """
    return LeadTimeConfig(
        access_minutes = (
            show.custom_lead_time_access_minutes 
            if show.custom_lead_time_access_minutes is not None
            else global_settings['default_lead_time_access_minutes']
        ),
        finalized_minutes = (
            show.custom_lead_time_finalized_minutes
            if show.custom_lead_time_finalized_minutes is not None  
            else global_settings['default_lead_time_finalized_minutes']
        )
    )
```

**Jerarquía de Configuración**:
1. **Específica del Show**: Si está definida, tiene prioridad
2. **Global del Sistema**: Valores por defecto para todos los shows

**Valores Típicos**:
- Lead time ABIERTO: 30 minutos (configurable)
- Lead time CERRADO: 0 minutos (normalmente)

### Paso 3: Cálculo de Ventanas Temporales

```python
def calculate_time_windows(event: ScheduledEvent, lead_times: LeadTimeConfig) -> TimeWindows:
    """
    Calcula las ventanas temporales que definen los cambios de estado.
    """
    # Combinar fecha y hora del evento
    event_datetime = datetime.combine(event.event_date, event.start_time)
    
    return TimeWindows(
        # Momento en que pasa de PROGRAMADO a ABIERTO
        access_start = event_datetime - timedelta(minutes=lead_times.access_minutes),
        
        # Momento en que pasa de ABIERTO a CERRADO  
        finalized_start = event_datetime - timedelta(minutes=lead_times.finalized_minutes),
        
        # Hora de inicio real del espectáculo
        show_start = event_datetime,
        
        # Hora de fin (si está definida)
        show_end = datetime.combine(event.event_date, event.end_time) if event.end_time else None
    )
```

**Línea Temporal**:
```
PROGRAMADO ────────► ABIERTO ────────► CERRADO
    │                    │                 │
    │                    │                 │
    └── access_start ────┴── show_start ──┘
        (T - 30min)         (T - 0min)
```

### Paso 4: Determinación de Estado según Hora Actual

```python
def determine_state_by_time(current_time: datetime, windows: TimeWindows) -> str:
    """
    Determina el estado basándose en la hora actual y las ventanas calculadas.
    """
    # Nueva lógica para EN_PREPARACION
    preparation_window_start = windows.access_start - timedelta(minutes=15) # Ventana de preparación de 15 min

    if current_time < preparation_window_start:
        return "PROGRAMADO"  # Todavía no es hora de prepararse
    
    elif current_time < windows.access_start:
        return "EN_PREPARACION" # Nuevo estado: en preparación para abrir

    elif current_time < windows.show_start:
        return "ABIERTO"     # Ventana de acceso activa
    
    else:
        return "CERRADO"     # Show iniciado o finalizado
```

**Transiciones de Estado**:
- **PROGRAMADO → ABIERTO**: Al llegar a `(start_time - lead_time_access)`
- **ABIERTO → CERRADO**: Al llegar a `start_time`
- No hay transición automática hacia atrás

### Paso 5: Aplicación de Casos Especiales

```python
def apply_special_cases(event: ScheduledEvent, calculated_state: str) -> str:
    """
    Maneja casos especiales que pueden modificar el estado calculado.
    """
    # Caso 1: Shows con múltiples pases
    if event.is_multiple_shows_flag and calculated_state == "CERRADO":
        next_event = get_next_event_same_show(event)
        if next_event and is_within_transition_window(next_event):
            # Podría mantenerse información del próximo pase
            pass
    
    # Caso 2: Último pase del día
    if is_last_show_of_day(event) and calculated_state == "CERRADO":
        # Aplicar lógica especial para último pase
        pass
    
    # Caso 3: Shows continuos (sin horarios fijos)
    if event.availability_window_start and event.availability_window_end:
        current_time = datetime.now().time()
        if event.availability_window_start <= current_time <= event.availability_window_end:
            return "ABIERTO"  # Durante toda la ventana
    
    return calculated_state
```

## 3.2 Sistema de Overrides

### Concepto y Propósito

Los overrides permiten al operador forzar manualmente el estado de un evento específico, anulando el cálculo automático. Son críticos para gestionar contingencias operativas.

### Características del Sistema

```python
class OverrideManager:
    """
    Gestiona los overrides manuales del sistema.
    """
    
    def create_override(
        self,
        event_id: int,
        status: str,  # CERRADO o CANCELADO
        reason: str,
        user: str
    ) -> StatusOverride:
        """
        Crea un nuevo override para un evento específico.
        """
        # Validar estado permitido
        if status not in ["CERRADO", "CANCELADO"]:
            raise ValueError("Estado de override no válido")
        
        # Desactivar override anterior si existe
        self.deactivate_existing_override(event_id)
        
        # Crear nuevo override
        override = StatusOverride(
            scheduled_event_id=event_id,
            override_status=status,
            override_reason=reason,
            created_by=user,
            is_active=True
        )
        
        # Registrar en audit log
        self.audit_log.record_override(event_id, status, user)
        
        return override
    
    def deactivate_override(self, override_id: int, user: str):
        """
        Desactiva un override existente.
        """
        override = self.get_override(override_id)
        override.is_active = False
        override.deactivated_at = datetime.now()
        
        self.audit_log.record_override_removal(override_id, user)
```

### Reglas de Negocio para Overrides

1. **Alcance por Evento**:
   - Override aplica solo al evento específico (fecha + hora)
   - No afecta otros pases del mismo show
   - No se propaga a eventos futuros

2. **Permanencia**:
   - Persisten indefinidamente hasta desactivación manual
   - Sobreviven a importaciones de datos
   - Se mantienen en cambios de modo auto/manual

3. **Estados Permitidos**:
   - **CERRADO**: Para contingencias operativas
   - **CANCELADO**: Para shows que no se realizarán

4. **Auditoría**:
   - Todo override queda registrado con usuario y timestamp
   - Razón obligatoria para trazabilidad
   - Historial completo de activaciones/desactivaciones

## 3.3 Modos de Operación

### Modo Automático

```python
class AutomaticMode:
    """
    En modo automático, el sistema sincroniza continuamente con datos externos.
    """
    
    def process_import(self, import_data: dict):
        """
        Procesa importación aplicando cambios inmediatamente.
        """
        for event_data in import_data['events']:
            # Buscar evento por external_id
            event = self.find_by_external_id(event_data['external_id'])
            
            if event:
                # Actualizar campos permitidos
                self.update_event(event, event_data)
            else:
                # Crear nuevo evento
                self.create_event(event_data)
        
        # Los overrides NO se tocan
        # La visibilidad de shows NO se modifica
        # El display_order se mantiene
```

**Características**:
- Sincronización continua cada vez que llegan datos
- Aplica cambios inmediatamente
- Preserva configuraciones manuales (overrides, visibilidad)
- Ideal para operación normal sin intervención

### Modo Manual

```python
class ManualMode:
    """
    En modo manual, el sistema retiene cambios hasta sincronización explícita.
    """
    
    def process_import(self, import_data: dict):
        """
        Recibe datos pero no los aplica automáticamente.
        """
        # Guardar datos en staging/pendientes
        self.pending_sync_data = import_data
        self.pending_sync_timestamp = datetime.now()
        
        # Notificar al operador que hay cambios pendientes
        self.notify_pending_sync()
    
    def execute_manual_sync(self, user: str):
        """
        Aplica cambios pendientes cuando el operador lo solicita.
        """
        if not self.pending_sync_data:
            return "No hay cambios pendientes"
        
        # Aplicar cambios preservando modificaciones manuales
        result = self.apply_pending_changes()
        
        # Limpiar datos pendientes
        self.pending_sync_data = None
        
        # Registrar en audit log
        self.audit_log.record_manual_sync(user, result)
        
        return result
```

**Características**:
- No aplica cambios automáticamente
- Operador decide cuándo sincronizar
- Permite trabajo seguro sin sorpresas
- Útil durante eventos especiales o contingencias

### Proceso de Cambio entre Modos

```python
def change_operation_mode(new_mode: str, user: str):
    """
    Cambia entre modo automático y manual.
    """
    current_mode = global_settings.get('operation_mode')
    
    if current_mode == new_mode:
        return "Ya está en ese modo"
    
    if new_mode == "manual":
        # De automático a manual
        # No requiere acción especial, solo cambiar flag
        global_settings.set('operation_mode', 'manual')
        audit_log.record("Cambio a modo manual", user)
        
    elif new_mode == "automatic":
        # De manual a automático
        if has_pending_sync():
            # Preguntar si aplicar cambios pendientes
            if confirm_apply_pending():
                execute_manual_sync(user)
        
        global_settings.set('operation_mode', 'automatic')
        audit_log.record("Cambio a modo automático", user)
```

## 3.4 Configuración de Lead Times

### Concepto de Lead Times

Los lead times definen cuántos minutos antes de la hora de inicio se producen los cambios de estado.

### Configuración Global

```python
# Valores por defecto del sistema
DEFAULT_LEAD_TIMES = {
    'access_minutes': 30,      # PROGRAMADO → ABIERTO
    'finalized_minutes': 0,    # ABIERTO → CERRADO
}
```

### Configuración Específica por Show

```python
def configure_show_lead_times(show_id: int, access_minutes: int, finalized_minutes: int):
    """
    Configura lead times específicos para un show.
    """
    show = get_show(show_id)
    
    # Validaciones
    if access_minutes < 0 or access_minutes > 120:
        raise ValueError("Lead time de acceso debe estar entre 0 y 120 minutos")
    
    if finalized_minutes < 0 or finalized_minutes > 60:
        raise ValueError("Lead time de finalización debe estar entre 0 y 60 minutos")
    
    # Aplicar configuración
    show.custom_lead_time_access_minutes = access_minutes
    show.custom_lead_time_finalized_minutes = finalized_minutes
    
    audit_log.record(f"Lead times actualizados para {show.name}")
```

### Casos de Uso Comunes

1. **Shows con alta demanda**:
   - Aumentar lead time de acceso a 45-60 minutos
   - Permite gestionar mejor las colas

2. **Shows de corta duración**:
   - Reducir lead time de acceso a 15-20 minutos
   - Evita largas esperas innecesarias

3. **Eventos especiales**:
   - Configuración específica según necesidades
   - Flexibilidad total por show

## 3.5 Gestión de Múltiples Pases

### Identificación del Pase Actual

```python
def get_current_pass(show_id: int, current_time: datetime) -> ScheduledEvent:
    """
    Determina cuál es el pase "actual" de un show con múltiples horarios.
    """
    today_events = db.query(ScheduledEvent).filter(
        ScheduledEvent.show_id == show_id,
        ScheduledEvent.event_date == current_time.date()
    ).order_by(ScheduledEvent.start_time).all()
    
    # Buscar el pase más próximo (no cerrado)
    for event in today_events:
        state = calculate_event_state(event, current_time)
        if state in ["PROGRAMADO", "ABIERTO"]:
            return event
    
    # Si todos están cerrados, devolver el último
    return today_events[-1] if today_events else None
```

### Cálculo del Próximo Pase

```python
def get_next_pass(event: ScheduledEvent) -> Optional[ScheduledEvent]:
    """
    Encuentra el siguiente pase del mismo show en el mismo día.
    """
    next_event = db.query(ScheduledEvent).filter(
        ScheduledEvent.show_id == event.show_id,
        ScheduledEvent.event_date == event.event_date,
        ScheduledEvent.start_time > event.start_time
    ).order_by(ScheduledEvent.start_time).first()
    
    return next_event
```

### Visualización en Pantallas

Para shows con múltiples pases, la información se presenta así:

| Columna | Contenido |
|---------|-----------|
| Espectáculo | Nombre del show |
| Hora actual | Hora del pase más próximo o en curso |
| Estado | Estado del pase actual |
| Próximo pase | Hora del siguiente pase (si existe) |

**Ejemplo**:
```
El Último Cantar | 15:30 | ABIERTO | Próximo: 18:00
```

### Reglas Especiales

1. **Transición entre pases**:
   - No mostrar pases cerrados si hay más en el día
   - Transición suave al siguiente pase disponible

2. **Último pase del día**:
   - No mostrar "Próximo pase" 
   - Posible mensaje especial: "Último pase del día"

3. **Ventana continua**:
   - Para shows tipo "walk-through"
   - Mostrar rango horario completo

---

*Estas reglas de negocio forman el núcleo operativo de ShowsTrack APP, garantizando flexibilidad para el operador mientras mantiene la automatización como base del sistema.*