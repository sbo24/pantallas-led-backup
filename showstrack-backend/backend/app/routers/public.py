"""
Router de API pública para consultas sin autenticación
"""
from typing import Optional
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.services.show_service import ShowService
from app.services.event_service import EventService
from sqlalchemy import select

router = APIRouter(prefix="/api/public", tags=["Public"])


@router.get("/schedules")
async def get_public_schedules(
    db: AsyncSession = Depends(get_db),
    date_param: Optional[date] = Query(None, alias="date", description="Fecha de consulta (YYYY-MM-DD)"),
    include_tomorrow: bool = Query(False, description="Incluir eventos de mañana"),
    simulated_time: Optional[datetime] = Query(None, description="Tiempo simulado para testing")
):
    """
    Endpoint principal para pantallas públicas
    
    Devuelve los espectáculos visibles con sus estados calculados en tiempo real.
    
    **Parámetros:**
    - **date**: Fecha de consulta (por defecto: hoy)
    - **include_tomorrow**: Incluir eventos de mañana
    - **simulated_time**: Solo para testing, simula la hora actual
    """
    # Usar fecha actual si no se especifica
    if date_param is None:
        date_param = date.today()
    
    # Determinar rango de fechas
    date_from = date_param
    date_to = date_param
    
    if include_tomorrow:
        # Utiliser un décalage d'un jour robuste
        date_to = date_param + timedelta(days=1)
    
    # Obtener shows visibles
    shows, _ = await ShowService.get_shows(
        db=db,
        visible_only=True,
        limit=100  # Límite alto para pantallas públicas
    )
    
    # Obtener eventos para los shows visibles
    show_ids = [show.id for show in shows]
    events = await EventService.get_events_by_date_range(
        db=db,
        date_from=date_from,
        date_to=date_to,
        show_ids=show_ids
    )
    
    # Agrupar eventos por show
    shows_with_events = {}
    for show in shows:
        shows_with_events[show.id] = {
            "show_id": show.id,
            "show_name": show.name,
            "current_pass": None,
            "next_pass": None,
            "display_order": show.display_order,
            "events": []
        }
    
    # Procesar eventos con nueva lógica de visibilidad
    if simulated_time:
        current_time = simulated_time
    else:
        # Utiliser l'heure locale Europe/Madrid comme NAIVE pour les comparaisons
        current_time = datetime.now(ZoneInfo("Europe/Madrid")).replace(tzinfo=None)
    
    # Inicializar StateEngine para filtrado de visibilidad
    from app.services.state_engine import StateEngine
    state_engine = StateEngine(db)
    
    for event in events:
        if event.show_id not in shows_with_events:
            continue
        
        # NUEVA LÓGICA: Filtrar eventos por visibilidad temporal
        try:
            should_display = await state_engine.should_display_event(event, current_time)
            if not should_display:
                continue  # Skip eventos fuera de ventana de visibilidad
        except Exception as e:
            # En caso de error, mostrar el evento (comportamiento fallback)
            print(f"Warning: Error checking display visibility for event {event.id}: {e}")
            pass  # Continuar mostrando el evento
        
        event_datetime = datetime.combine(event.event_date, event.start_time)
        event_status = await EventService.calculate_event_status(event, db)
        
        event_info = {
            "start_time": event.start_time.strftime("%H:%M"),
            "status": event_status,
            "status_color": get_status_color(event_status),
            "event_date": event.event_date.isoformat()
        }
        
        shows_with_events[event.show_id]["events"].append(event_info)
    
    # Determinar current_pass y next_pass para cada show (respetando estado del motor)
    for show_data in shows_with_events.values():
        events = show_data["events"]
        if not events:
            continue
        
        # Ordenar eventos por fecha y hora
        events.sort(key=lambda x: (x["event_date"], x["start_time"]))
        
        # Encontrar pase actual y próximo
        current_pass = None
        next_pass = None
        
        # Si hay eventos ABIERTO, siempre tiene prioridad máxima como current_pass
        open_event = None
        for event in events:
            if event.get("status") == "ABIERTO":
                open_event = event
                break
        
        if open_event:
            # Si hay evento ABIERTO, es el current_pass
            current_pass = open_event
            # next_pass es el siguiente evento después del ABIERTO
            open_index = events.index(open_event)
            if open_index + 1 < len(events):
                next_pass = events[open_index + 1]
        else:
            # Sin eventos ABIERTO, usar lógica temporal
            past_events = []
            future_events = []
            
            for event in events:
                event_datetime = datetime.combine(
                    datetime.fromisoformat(event["event_date"]).date(),
                    datetime.strptime(event["start_time"], "%H:%M").time()
                )
                
                if event_datetime <= current_time:
                    past_events.append(event)
                else:
                    future_events.append(event)
            
            if past_events:
                # current_pass es el último evento pasado
                current_pass = past_events[-1]
                # next_pass es el primer evento futuro
                next_pass = future_events[0] if future_events else None
            else:
                # Todos los eventos son futuros
                current_pass = future_events[0] if future_events else None
                next_pass = future_events[1] if len(future_events) > 1 else None
        
        show_data["current_pass"] = current_pass
        show_data["next_pass"] = next_pass
        del show_data["events"]  # Remover eventos detallados
    
    # Filtrar shows que tienen eventos
    shows_with_events_list = [
        show_data for show_data in shows_with_events.values()
        if show_data["current_pass"] or show_data["next_pass"]
    ]
    
    # NUEVA LÓGICA: Garantizar que columna izquierda nunca esté vacía
    for show_data in shows_with_events_list:
        if not show_data["current_pass"] and show_data["next_pass"]:
            # Promover next_pass a current_pass si no hay current_pass
            show_data["current_pass"] = show_data["next_pass"]
            show_data["next_pass"] = None
    
    # NUEVA LÓGICA: Ordenar por cercanía temporal en lugar de display_order
    def calculate_time_distance(show_data: dict, current_time: datetime) -> float:
        """Calcula distancia temporal desde ahora hasta el current_pass del show"""
        
        try:
            # NUEVA LÓGICA: Solo usar current_pass para ordenación
            # Es el evento más relevante para el visitante en este momento
            if show_data.get("current_pass"):
                event_datetime = datetime.combine(
                    datetime.fromisoformat(show_data["current_pass"]["event_date"]).date(),
                    datetime.strptime(show_data["current_pass"]["start_time"], "%H:%M").time()
                )
                # Calcular distancia absoluta en segundos
                distance = abs((event_datetime - current_time).total_seconds())
                return distance
            else:
                # Sin current_pass, poner al final
                return float('inf')
        except Exception as e:
            print(f"Error calculating time distance for show {show_data.get('show_name', 'unknown')}: {e}")
            # Fallback: usar display_order como criterio
            return show_data.get("display_order", 999) * 3600  # convertir a segundos
    
    # Ordenar por cercanía temporal (más cercano primero)
    try:
        shows_with_events_list.sort(key=lambda show: calculate_time_distance(show, current_time))
    except Exception as e:
        print(f"Error sorting by temporal distance, falling back to display_order: {e}")
        # Fallback: ordenar por display_order como antes
        shows_with_events_list.sort(key=lambda x: x.get("display_order", 999))
    
    # Verificar si hay alerta global activa de hoy
    from app.models.alert import GlobalAlert
    from sqlalchemy import and_, func
    
    today = datetime.now(ZoneInfo("Europe/Madrid")).date()
    stmt = select(GlobalAlert).where(
        and_(
            GlobalAlert.is_active == True,
            func.date(GlobalAlert.activated_at) == today
        )
    )
    result = await db.execute(stmt)
    active_alert = result.scalar_one_or_none()
    
    # Get custom message for displays
    custom_message = None
    try:
        from app.services.config_service import ConfigService
        config_service = ConfigService(db)
        custom_message = await config_service.get_custom_message()
    except Exception as e:
        print(f"Warning: Error getting custom message: {e}")
        # Continue without custom message
    
    # Si hay alerta activa, cambiar modo de visualización
    if active_alert:
        return {
            "current_time": current_time.isoformat(),
            "display_mode": "alert",
            "alert": {
                "message": active_alert.message,
                "type": active_alert.alert_type,
                "activated_at": active_alert.activated_at.isoformat()
            },
            "shows": [],  # No mostrar shows cuando hay alerta
            "metadata": {
                "refresh_interval_seconds": 10,  # Refresh más frecuente en modo alerta
                "custom_message": custom_message
            }
        }
    
    # Modo normal sin alerta
    return {
        "current_time": current_time.isoformat(),
        "display_mode": "normal",
        "shows": shows_with_events_list,
        "metadata": {
            "total_shows": len(shows_with_events_list),
            "refresh_interval_seconds": 30,
            "cache_expires_at": (current_time.replace(second=0, microsecond=0) + 
                                 timedelta(minutes=1)).isoformat(),
            "custom_message": custom_message
        }
    }


@router.get("/debug-events")
async def debug_events(db: AsyncSession = Depends(get_db)):
    """DEBUG: Verificar eventos en BD para debuggear horarios"""
    from datetime import date
    
    events = await EventService.get_events_by_date_range(
        db=db,
        date_from=date(2025, 9, 18),
        date_to=date(2025, 9, 18),
        show_ids=None
    )
    
    result = []
    for event in events:
        result.append({
            "show_name": event.show.name if event.show else "Unknown",
            "start_time": event.start_time.strftime("%H:%M"),
            "end_time": event.end_time.strftime("%H:%M") if event.end_time else None,
            "external_event_id": event.external_event_id
        })
    
    return {"total": len(result), "events": result}

@router.get("/alert")
async def get_public_alert(
    db: AsyncSession = Depends(get_db)
):
    """
    Verificar si hay una alerta global activa
    
    **Respuesta:**
    - Información de alerta global si está activa
    - null si no hay alerta activa
    """
    from sqlalchemy import select, and_, func
    from app.models.alert import GlobalAlert
    
    today = datetime.now(ZoneInfo("Europe/Madrid")).date()
    stmt = select(GlobalAlert).where(
        and_(
            GlobalAlert.is_active == True,
            func.date(GlobalAlert.activated_at) == today
        )
    )
    result = await db.execute(stmt)
    active_alert = result.scalar_one_or_none()
    
    if active_alert:
        return {
            "has_alert": True,
            "alert": {
                "message": active_alert.message,
                "type": active_alert.alert_type,
                "activated_at": active_alert.activated_at.isoformat()
            }
        }
    
    return {
        "has_alert": False,
        "alert": None
    }


@router.get("/custom-message")
async def get_public_custom_message(
    db: AsyncSession = Depends(get_db)
):
    """
    Get current custom message for standalone public displays.
    
    This endpoint is designed for consumption by standalone HTML/JS applications
    that are not part of the Vue.js admin interface.
    
    **Response:**
    - custom_message: string or null
    - has_message: boolean indicating if message exists
    """
    try:
        from app.services.config_service import ConfigService
        
        config_service = ConfigService(db)
        custom_message = await config_service.get_custom_message()
        
        return {
            "custom_message": custom_message,
            "has_message": custom_message is not None,
            "timestamp": datetime.now(ZoneInfo("Europe/Madrid")).isoformat()
        }
    except Exception as e:
        # Return empty response instead of error to allow standalone apps to work
        print(f"Error getting custom message: {e}")
        return {
            "custom_message": None,
            "has_message": False,
            "timestamp": datetime.now(ZoneInfo("Europe/Madrid")).isoformat()
        }


def get_status_color(status: str) -> str:
    """Obtener color para estado de evento"""
    color_map = {
        "PROGRAMADO": "#6B7280",    # Gris
        "ABIERTO": "#10B981",       # Verde
        "CERRADO": "#EF4444",       # Rojo
        "CANCELADO": "#F59E0B"      # Amarillo
    }
    return color_map.get(status, "#6B7280")