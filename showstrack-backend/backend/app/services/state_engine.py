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
from zoneinfo import ZoneInfo
from typing import Optional, Dict, Any, NamedTuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.event import ScheduledEvent
from app.models.show import Show
from app.models.override import StatusOverride
from app.models.settings import GlobalSettings


class LeadTimeConfig(NamedTuple):
    """Configuración de lead times para un show."""
    access_minutes: int      # Minutos antes para PROGRAMADO → ABIERTO
    finalized_minutes: int   # Minutos antes para ABIERTO → CERRADO


class TimeWindows(NamedTuple):
    """Ventanas temporales que definen transiciones de estado."""
    access_start: datetime      # Momento: PROGRAMADO → ABIERTO
    finalized_start: datetime   # Momento: ABIERTO → CERRADO (normalmente = show_start)
    forced_closure_start: datetime  # Momento: Cierre forzado (prioridad sobre ABIERTO)
    show_start: datetime        # Hora de inicio real del espectáculo
    display_until: datetime     # Momento: Show desaparece de pantallas públicas
    show_end: Optional[datetime] = None  # Hora de fin (si está definida)


class StateEngine:
    """Motor principal de cálculo de estados de eventos."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        # Zona horaria local del venue (Europe/Madrid). Se usa para obtener la hora actual
        # y para interpretar las horas de la BDD (almacenadas sin zona horaria) como hora local.
        self._venue_tz = ZoneInfo("Europe/Madrid")

    def _now_local_naive(self) -> datetime:
        """
        Obtener la hora actual del venue como datetime NAIVE en hora local de Madrid.
        Se retorna sin tzinfo para mantener compatibilidad con el resto del código y tests.
        """
        return datetime.now(self._venue_tz).replace(tzinfo=None)
    
    async def calculate_event_state(
        self, 
        event: ScheduledEvent, 
        current_time: Optional[datetime] = None
    ) -> str:
        """
        Algoritmo principal de 5 pasos para determinar el estado de un evento.
        
        Args:
            event: Evento programado
            current_time: Hora actual (usar datetime.now(ZoneInfo("Europe/Madrid")) si None)
            
        Returns:
            Estado calculado: PROGRAMADO, ABIERTO, CERRADO, CANCELADO
        """
        if current_time is None:
            # Usar hora actual en Europa/Madrid como NAIVE
            current_time = self._now_local_naive()
        else:
            # Si viene con tz, convertir a Europe/Madrid y volver a NAIVE para comparar con ventanas NAIVE
            if current_time.tzinfo is not None:
                current_time = current_time.astimezone(self._venue_tz).replace(tzinfo=None)
        
        # Paso 1: Verificar overrides activos (prioridad máxima)
        if override := await self._check_active_override(event.id):
            return override.override_status
        
        # Paso 2: Resolver lead times efectivos
        lead_times = await self._resolve_lead_times(event.show)
        
        # Paso 3: Calcular ventanas temporales
        windows = await self._calculate_time_windows(event, lead_times)
        
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
        
        # Usar configuración global si está disponible en GlobalSettings
        try:
            stmt = select(GlobalSettings).where(GlobalSettings.key == "lead_times")
            result = await self.db.execute(stmt)
            settings = result.scalar_one_or_none()
            if settings and isinstance(settings.value, dict):
                access = settings.value.get("default_lead_time_access_minutes", 30)
                finalized = settings.value.get("default_lead_time_finalized_minutes", 0)
                return LeadTimeConfig(access_minutes=int(access), finalized_minutes=int(finalized))
        except Exception:
            # Fallback silencioso a valores por defecto si no existe configuración
            pass

        # Fallback por defecto del business-rules.md
        return LeadTimeConfig(
            access_minutes=30,
            finalized_minutes=0
        )
    
    async def _calculate_time_windows(
        self, 
        event: ScheduledEvent, 
        lead_times: LeadTimeConfig
    ) -> TimeWindows:
        """
        Paso 3: Calcula las ventanas temporales que definen los cambios de estado.
        Incluye nuevas ventanas para cierre forzado y visibilidad post-inicio.
        """
        # Combinar fecha y hora del evento
        # Las columnas Date/Time de la BDD se interpretan como hora local del venue (Europa/Madrid)
        event_datetime = datetime.combine(event.event_date, event.start_time)
        
        # Obtener configuraciones de display desde GlobalSettings
        display_config = await self._get_display_config()
        
        # Calcular puntos de transición originales
        access_start = event_datetime - timedelta(minutes=lead_times.access_minutes)
        finalized_start = event_datetime - timedelta(minutes=lead_times.finalized_minutes)
        
        # Calcular nuevos puntos de transición
        forced_closure_start = event_datetime - timedelta(minutes=display_config["forced_closure_minutes"])
        display_until = event_datetime + timedelta(minutes=display_config["display_post_start_minutes"])
        
        # Calcular hora de fin si está definida
        show_end = None
        if event.end_time:
            show_end = datetime.combine(event.event_date, event.end_time)
        
        return TimeWindows(
            access_start=access_start,
            finalized_start=finalized_start,
            forced_closure_start=forced_closure_start,
            show_start=event_datetime,
            display_until=display_until,
            show_end=show_end
        )
    
    def _determine_state_by_time(
        self, 
        current_time: datetime, 
        windows: TimeWindows
    ) -> str:
        """
        Paso 4: Determina el estado basándose en la hora actual y las ventanas calculadas.
        
        Nueva lógica temporal con cierre forzado:
        - Antes de access_start: PROGRAMADO
        - Entre access_start y forced_closure_start: ABIERTO  
        - Entre forced_closure_start y show_start: CERRADO (cierre forzado - PRIORIDAD)
        - Después de show_start: CERRADO (show iniciado)
        """
        if current_time < windows.access_start:
            return "PROGRAMADO"  # Todavía no es hora de abrir acceso
        
        elif current_time < windows.forced_closure_start:
            return "ABIERTO"     # Ventana de acceso activa
        
        else:
            # Cierre forzado O show ya iniciado
            return "CERRADO"     # Cierre forzado tiene prioridad sobre apertura
    
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
    
    async def _get_display_config(self) -> Dict[str, Any]:
        """
        Obtiene la configuración de display desde GlobalSettings.
        Utiliza valores por defecto si no existe configuración.
        """
        try:
            from app.models.settings import GlobalSettings
            from sqlalchemy import select
            
            stmt = select(GlobalSettings).where(GlobalSettings.key == "display")
            result = await self.db.execute(stmt)
            settings = result.scalar_one_or_none()
            
            if settings and isinstance(settings.value, dict):
                return settings.value
            else:
                # Valores por defecto si no existe configuración
                return {
                    "display_post_start_minutes": 5,
                    "forced_closure_minutes": 5
                }
        except Exception:
            # Fallback silencioso en caso de error
            return {
                "display_post_start_minutes": 5,
                "forced_closure_minutes": 5
            }
    
    async def should_display_event(self, event: ScheduledEvent, current_time: Optional[datetime] = None) -> bool:
        """
        Determina si un evento debe mostrarse en pantallas públicas.
        Basado en la ventana de visibilidad post-inicio configurada.
        """
        if current_time is None:
            current_time = self._now_local_naive()
        else:
            if current_time.tzinfo is not None:
                current_time = current_time.astimezone(self._venue_tz).replace(tzinfo=None)
        
        # Obtener configuración real de display
        display_config = await self._get_display_config()
        display_post_start_minutes = display_config.get("display_post_start_minutes", 5)
        
        event_datetime = datetime.combine(event.event_date, event.start_time)
        
        # Si ya pasaron X minutos del inicio, no mostrar
        post_start_limit = event_datetime + timedelta(minutes=display_post_start_minutes)
        return current_time <= post_start_limit
    
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
            current_time = self._now_local_naive()
        else:
            if current_time.tzinfo is not None:
                current_time = current_time.astimezone(self._venue_tz).replace(tzinfo=None)
        
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
            windows = await self._calculate_time_windows(event, lead_times)
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
        windows = await self._calculate_time_windows(event, lead_times)
        current_time = self._now_local_naive()
        
        # Determinar el próximo timestamp de cambio con nueva lógica
        if current_time < windows.access_start:
            return windows.access_start  # Próximo: PROGRAMADO → ABIERTO
        elif current_time < windows.forced_closure_start:
            return windows.forced_closure_start  # Próximo: ABIERTO → CERRADO (forzado)
        elif current_time < windows.show_start:
            return windows.show_start    # Próximo: CERRADO (forzado) → CERRADO (iniciado)
        elif current_time < windows.display_until:
            return windows.display_until # Próximo: Desaparece de pantallas
        else:
            return None  # Ya no hay más cambios automáticos