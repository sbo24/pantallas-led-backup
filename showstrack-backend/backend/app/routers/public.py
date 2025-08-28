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
    
    # Procesar eventos
    if simulated_time:
        current_time = simulated_time
    else:
        # Utiliser l'heure locale Europe/Madrid comme NAIVE pour les comparaisons
        current_time = datetime.now(ZoneInfo("Europe/Madrid")).replace(tzinfo=None)
    
    for event in events:
        if event.show_id not in shows_with_events:
            continue
        
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
        
        for event in events:
            event_datetime = datetime.combine(
                datetime.fromisoformat(event["event_date"]).date(),
                datetime.strptime(event["start_time"], "%H:%M").time()
            )
            
            # Si el estado calculado es ABIERTO, priorizar SIEMPRE como pase actual
            # (remplace un current_pass anterior si fuera necesario)
            if event.get("status") == "ABIERTO":
                current_pass = event
                continue
            
            # Fallback por tiempo (compatibilidad): último <= ahora es el actual
            if event_datetime <= current_time:
                current_pass = event
            else:
                if next_pass is None:
                    next_pass = event
                # No romper aquí, porque puede haber un evento ABIERTO más adelante en la lista
        
        show_data["current_pass"] = current_pass
        show_data["next_pass"] = next_pass
        del show_data["events"]  # Remover eventos detallados
    
    # Filtrar shows que tienen eventos
    shows_with_events_list = [
        show_data for show_data in shows_with_events.values()
        if show_data["current_pass"] or show_data["next_pass"]
    ]
    
    # Ordenar por display_order
    shows_with_events_list.sort(key=lambda x: x["display_order"])
    
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
                "refresh_interval_seconds": 10  # Refresh más frecuente en modo alerta
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
                                 timedelta(minutes=1)).isoformat()
        }
    }


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


def get_status_color(status: str) -> str:
    """Obtener color para estado de evento"""
    color_map = {
        "PROGRAMADO": "#6B7280",    # Gris
        "ABIERTO": "#10B981",       # Verde
        "CERRADO": "#EF4444",       # Rojo
        "CANCELADO": "#F59E0B"      # Amarillo
    }
    return color_map.get(status, "#6B7280")