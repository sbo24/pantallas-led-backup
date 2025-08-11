"""
State Engine - Motor de cálculo de estados de eventos de espectáculos.

Implementa el algoritmo de 5 pasos definido en business-rules.md:
1. Verificación de overrides activos (prioridad máxima)
2. Resolución de lead times (show específico > global)
3. Cálculo de ventanas temporales
4. Determinación de estado por hora actual
5. Aplicación de casos especiales

Estados posibles:
- PROGRAMADO: Show anunciado, acceso no abierto aún
- ABIERTO: Visitantes pueden acceder al venue
- CERRADO: Acceso cerrado, show iniciado/terminado
- CANCELADO: Show cancelado (solo por override manual)
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, NamedTuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.event import ScheduledEvent
from app.models.show import Show
from app.models.override import StatusOverride


class LeadTimeConfig(NamedTuple):
    """Configuración de lead times para un show."""
    access_minutes: int      # Minutos antes para PROGRAMADO → ABIERTO
    finalized_minutes: int   # Minutos antes para ABIERTO → CERRADO


class TimeWindows(NamedTuple):
    """Ventanas temporales que definen transiciones de estado."""
    access_start: datetime      # Momento: PROGRAMADO → ABIERTO
    finalized_start: datetime   # Momento: ABIERTO → CERRADO (normalmente = show_start)
    show_start: datetime        # Hora de inicio real del espectáculo
    show_end: Optional[datetime] = None  # Hora de fin (si está definida)


class StateEngine:
    """Motor principal de cálculo de estados de eventos."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def calculate_event_state(
        self, 
        event: ScheduledEvent, 
        current_time: Optional[datetime] = None
    ) -> str:
        """
        Algoritmo principal de 5 pasos para determinar el estado de un evento.
        
        Args:
            event: Evento programado
            current_time: Hora actual (usar datetime.now() si None)
            
        Returns:
            Estado calculado: PROGRAMADO, ABIERTO, CERRADO, CANCELADO
        """
        if current_time is None:
            current_time = datetime.now()
        
        # Paso 1: Verificar overrides activos (prioridad máxima)
        if override := await self._check_active_override(event.id):
            return override.override_status
        
        # Paso 2: Resolver lead times efectivos
        lead_times = await self._resolve_lead_times(event.show)
        
        # Paso 3: Calcular ventanas temporales
        windows = self._calculate_time_windows(event, lead_times)
        
        # Paso 4: Determinar estado según hora actual
        state = self._determine_state_by_time(current_time, windows)
        
        # Paso 5: Aplicar casos especiales
        final_state = self._apply_special_cases(event, state, current_time)
        
        return final_state
    
    async def _check_active_override(self, event_id: int) -> Optional[StatusOverride]:
        """
        Paso 1: Busca si existe un override manual activo para el evento.
        Los overrides tienen prioridad absoluta sobre el cálculo automático.
        """
        stmt = select(StatusOverride).where(
            and_(
                StatusOverride.scheduled_event_id == event_id,
                StatusOverride.is_active == True
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def _resolve_lead_times(self, show: Show) -> LeadTimeConfig:
        """
        Paso 2: Determina los lead times efectivos siguiendo la jerarquía:
        1. Configuración específica del show (máxima prioridad)
        2. Configuración global del sistema
        """
        # Si el show tiene configuración personalizada, usarla
        if (show.custom_lead_time_access_minutes is not None and 
            show.custom_lead_time_finalized_minutes is not None):
            return LeadTimeConfig(
                access_minutes=show.custom_lead_time_access_minutes,
                finalized_minutes=show.custom_lead_time_finalized_minutes
            )
        
        # Usar configuración global por defecto
        # TODO: En el futuro, obtener esto del ConfigService
        # Por ahora usar valores por defecto del business-rules.md
        return LeadTimeConfig(
            access_minutes=30,  # PROGRAMADO → ABIERTO: 30 min antes
            finalized_minutes=0  # ABIERTO → CERRADO: justo al inicio
        )
    
    def _calculate_time_windows(
        self, 
        event: ScheduledEvent, 
        lead_times: LeadTimeConfig
    ) -> TimeWindows:
        """
        Paso 3: Calcula las ventanas temporales que definen los cambios de estado.
        """
        # Combinar fecha y hora del evento
        event_datetime = datetime.combine(event.event_date, event.start_time)
        
        # Calcular puntos de transición
        access_start = event_datetime - timedelta(minutes=lead_times.access_minutes)
        finalized_start = event_datetime - timedelta(minutes=lead_times.finalized_minutes)
        
        # Calcular hora de fin si está definida
        show_end = None
        if event.end_time:
            show_end = datetime.combine(event.event_date, event.end_time)
        
        return TimeWindows(
            access_start=access_start,
            finalized_start=finalized_start,
            show_start=event_datetime,
            show_end=show_end
        )
    
    def _determine_state_by_time(
        self, 
        current_time: datetime, 
        windows: TimeWindows
    ) -> str:
        """
        Paso 4: Determina el estado basándose en la hora actual y las ventanas calculadas.
        
        Lógica temporal:
        - Antes de access_start: PROGRAMADO
        - Entre access_start y show_start: ABIERTO  
        - Después de show_start: CERRADO
        """
        if current_time < windows.access_start:
            return "PROGRAMADO"  # Todavía no es hora de abrir acceso
        
        elif current_time < windows.show_start:
            return "ABIERTO"     # Ventana de acceso activa
        
        else:
            return "CERRADO"     # Show iniciado o finalizado
    
    def _apply_special_cases(
        self, 
        event: ScheduledEvent, 
        calculated_state: str,
        current_time: datetime
    ) -> str:
        """
        Paso 5: Maneja casos especiales que pueden modificar el estado calculado.
        """
        # Caso 1: Shows con ventana de disponibilidad continua
        if (event.availability_window_start and event.availability_window_end):
            current_time_only = current_time.time()
            if (event.availability_window_start <= current_time_only <= 
                event.availability_window_end):
                return "ABIERTO"  # Durante toda la ventana de disponibilidad
        
        # Caso 2: Shows con múltiples pases
        # TODO: Implementar lógica especial para múltiples pases
        # Por ahora retornar el estado calculado normalmente
        
        # Caso 3: Último pase del día
        # TODO: Implementar lógica para último pase
        # Por ahora retornar el estado calculado normalmente
        
        return calculated_state
    
    async def calculate_multiple_events_states(
        self, 
        events: list[ScheduledEvent],
        current_time: Optional[datetime] = None
    ) -> Dict[int, str]:
        """
        Calcula estados para múltiples eventos de forma eficiente.
        
        Args:
            events: Lista de eventos programados
            current_time: Hora actual (usar datetime.now() si None)
            
        Returns:
            Diccionario {event_id: estado}
        """
        if current_time is None:
            current_time = datetime.now()
        
        # Pre-cargar todos los overrides activos de una vez para eficiencia
        event_ids = [event.id for event in events]
        
        stmt = select(StatusOverride).where(
            and_(
                StatusOverride.scheduled_event_id.in_(event_ids),
                StatusOverride.is_active == True
            )
        )
        result = await self.db.execute(stmt)
        overrides = {override.scheduled_event_id: override 
                    for override in result.scalars().all()}
        
        # Calcular estados para cada evento
        states = {}
        for event in events:
            # Verificar override primero
            if event.id in overrides:
                states[event.id] = overrides[event.id].override_status
                continue
            
            # Calcular estado normalmente (pasos 2-5)
            lead_times = await self._resolve_lead_times(event.show)
            windows = self._calculate_time_windows(event, lead_times)
            state = self._determine_state_by_time(current_time, windows)
            final_state = self._apply_special_cases(event, state, current_time)
            states[event.id] = final_state
        
        return states
    
    async def get_next_state_change_time(
        self, 
        event: ScheduledEvent
    ) -> Optional[datetime]:
        """
        Calcula cuándo ocurrirá el próximo cambio de estado para un evento.
        Útil para programar actualizaciones o notificaciones.
        
        Returns:
            Timestamp del próximo cambio de estado, o None si no hay más cambios
        """
        # Si hay override activo, no hay cambios automáticos programados
        if await self._check_active_override(event.id):
            return None
        
        lead_times = await self._resolve_lead_times(event.show)
        windows = self._calculate_time_windows(event, lead_times)
        current_time = datetime.now()
        
        # Determinar el próximo timestamp de cambio
        if current_time < windows.access_start:
            return windows.access_start  # Próximo: PROGRAMADO → ABIERTO
        elif current_time < windows.show_start:
            return windows.show_start    # Próximo: ABIERTO → CERRADO
        else:
            return None  # Ya no hay más cambios automáticos