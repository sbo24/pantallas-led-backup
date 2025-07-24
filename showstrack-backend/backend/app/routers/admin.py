"""
Router de administración para Shows y Events
"""
from typing import Annotated, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.dependencies import get_current_active_user
from app.services.show_service import ShowService
from app.services.event_service import EventService
from app.services.alert_service import AlertService
from app.services.config_service import ConfigService
from app.schemas.show import (
    ShowCreate,
    ShowUpdate,
    ShowResponse,
    ShowListResponse
)
from app.schemas.event import (
    EventCreate,
    EventUpdate,
    EventResponse,
    EventListResponse,
    OverrideRequest,
    OverrideResponse
)
from app.schemas.alert import (
    AlertCreate,
    AlertResponse,
    AlertStatus,
    AlertHistory,
    AlertDeactivateResponse
)
from app.schemas.config import (
    GlobalConfig,
    GlobalConfigUpdate,
    OperationModeResponse,
    OperationModeUpdate,
    VenueHoursResponse,
    VenueHoursUpdate,
    ConfigurationChangeResponse
)
from app.models.user import User

router = APIRouter(prefix="/api/admin", tags=["Administration"])


# ===== SHOWS ENDPOINTS =====

@router.get("/shows", response_model=ShowListResponse)
async def get_shows(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Página"),
    size: int = Query(50, ge=1, le=100, description="Elementos por página"),
    visible_only: bool = Query(False, description="Solo shows visibles"),
    search: Optional[str] = Query(None, description="Buscar en nombre")
):
    """
    Obtener lista de shows con paginación
    
    **Requiere autenticación JWT**
    """
    skip = (page - 1) * size
    
    # Aplicar filtros si es necesario
    if visible_only or search:
        shows, total = await ShowService.get_shows(
            db=db,
            skip=skip,
            limit=size,
            visible_only=visible_only,
            search=search
        )
        # Convertir a formato de respuesta
        shows_data = [ShowResponse.model_validate(show) for show in shows]
    else:
        # Usar servicio con conteo de eventos
        shows_data_raw, total = await ShowService.get_shows_with_event_count(
            db=db,
            skip=skip,
            limit=size
        )
        # Convertir diccionarios a ShowResponse
        shows_data = []
        for show_dict in shows_data_raw:
            # Crear ShowResponse desde diccionario
            show_response = ShowResponse(
                id=show_dict["id"],
                name=show_dict["name"],
                description=show_dict["description"],
                duration_estimated=show_dict["duration_estimated"],
                is_visible=show_dict["is_visible"],
                display_order=show_dict["display_order"],
                custom_lead_time_access_minutes=show_dict["custom_lead_time_access_minutes"],
                custom_lead_time_finalized_minutes=show_dict["custom_lead_time_finalized_minutes"],
                created_at=show_dict["created_at"],
                updated_at=show_dict["updated_at"],
                current_events_count=show_dict["current_events_count"]
            )
            shows_data.append(show_response)
    
    pages = (total + size - 1) // size
    
    return ShowListResponse(
        items=shows_data,
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@router.get("/shows/{show_id}", response_model=ShowResponse)
async def get_show(
    show_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener show específico por ID
    
    **Requiere autenticación JWT**
    """
    show = await ShowService.get_show(db, show_id)
    if not show:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Show not found"
        )
    
    return ShowResponse.model_validate(show)


@router.post("/shows", response_model=ShowResponse, status_code=status.HTTP_201_CREATED)
async def create_show(
    show_data: ShowCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Crear nuevo show
    
    **Requiere autenticación JWT**
    """
    # Verificar que no existe un show con el mismo nombre
    existing_show = await ShowService.get_show_by_name(db, show_data.name)
    if existing_show:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Show with this name already exists"
        )
    
    show = await ShowService.create_show(db, show_data)
    return ShowResponse.model_validate(show)


@router.put("/shows/{show_id}", response_model=ShowResponse)
async def update_show(
    show_id: int,
    show_data: ShowUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar show existente
    
    **Requiere autenticación JWT**
    """
    try:
        show = await ShowService.update_show(db, show_id, show_data)
        if not show:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Show not found"
            )
        return ShowResponse.model_validate(show)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/shows/{show_id}")
async def delete_show(
    show_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar show
    
    **Requiere autenticación JWT**
    **Nota:** No se puede eliminar un show que tiene eventos relacionados
    """
    try:
        success = await ShowService.delete_show(db, show_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Show not found"
            )
        return {"message": "Show deleted successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ===== EVENTS ENDPOINTS =====

@router.get("/events", response_model=EventListResponse)
async def get_events(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Página"),
    size: int = Query(50, ge=1, le=100, description="Elementos por página"),
    date_from: Optional[date] = Query(None, description="Fecha desde"),
    date_to: Optional[date] = Query(None, description="Fecha hasta"),
    show_id: Optional[int] = Query(None, description="Filtrar por show"),
    has_override: Optional[bool] = Query(None, description="Con override activo")
):
    """
    Obtener lista de eventos con paginación y filtros
    
    **Requiere autenticación JWT**
    """
    skip = (page - 1) * size
    
    events, total = await EventService.get_events(
        db=db,
        skip=skip,
        limit=size,
        date_from=date_from,
        date_to=date_to,
        show_id=show_id,
        has_override=has_override
    )
    
    # Calcular estados de eventos
    events_with_status = []
    for event in events:
        event_dict = {
            "id": event.id,
            "external_event_id": event.external_event_id,
            "show_id": event.show_id,
            "event_date": event.event_date,
            "start_time": event.start_time,
            "end_time": event.end_time,
            "duration_minutes": event.duration_minutes,
            "is_multiple_shows_flag": event.is_multiple_shows_flag,
            "created_at": event.created_at,
            "updated_at": event.updated_at,
            "show": {
                "id": event.show.id,
                "name": event.show.name
            },
            "override": None,
            "calculated_status": await EventService.calculate_event_status(event)
        }
        
        if event.status_override:
            event_dict["override"] = {
                "id": event.status_override.id,
                "override_status": event.status_override.override_status,
                "reason": event.status_override.override_reason,
                "is_active": event.status_override.is_active,
                "created_by": event.status_override.created_by,
                "created_at": event.status_override.created_at
            }
        
        events_with_status.append(event_dict)
    
    pages = (total + size - 1) // size
    
    return EventListResponse(
        items=events_with_status,
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@router.get("/events/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener evento específico por ID
    
    **Requiere autenticación JWT**
    """
    event = await EventService.get_event(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    return EventResponse.model_validate(event)


@router.post("/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_data: EventCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Crear nuevo evento
    
    **Requiere autenticación JWT**
    """
    try:
        event = await EventService.create_event(db, event_data)
        return EventResponse.model_validate(event)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/events/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: int,
    event_data: EventUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar evento existente
    
    **Requiere autenticación JWT**
    """
    try:
        event = await EventService.update_event(db, event_id, event_data)
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )
        return EventResponse.model_validate(event)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/events/{event_id}")
async def delete_event(
    event_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar evento
    
    **Requiere autenticación JWT**
    """
    success = await EventService.delete_event(db, event_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    return {"message": "Event deleted successfully"}


# ===== OVERRIDE ENDPOINTS =====

@router.patch("/events/{event_id}/override", response_model=OverrideResponse)
async def manage_event_override(
    event_id: int,
    override_data: OverrideRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Crear o desactivar override manual de estado
    
    **Requiere autenticación JWT**
    """
    try:
        if override_data.action == "create":
            if not override_data.status or not override_data.reason:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Status and reason are required for create action"
                )
            
            override = await EventService.create_override(
                db=db,
                event_id=event_id,
                override_data=override_data,
                created_by=current_user.username
            )
            
            return OverrideResponse(
                event_id=event_id,
                override={
                    "id": override.id,
                    "override_status": override.override_status,
                    "reason": override.override_reason,
                    "is_active": override.is_active,
                    "created_by": override.created_by,
                    "created_at": override.created_at
                },
                audit_logged=True
            )
        
        elif override_data.action == "deactivate":
            success = await EventService.deactivate_override(db, event_id)
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No active override found for this event"
                )
            
            return OverrideResponse(
                event_id=event_id,
                override=None,
                audit_logged=True
            )
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid action. Use 'create' or 'deactivate'"
            )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ===== GLOBAL ALERTS ENDPOINTS =====

@router.get("/alerts/global", response_model=AlertStatus)
async def get_global_alert_status(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Get current global alert status with active alert and today's count.
    
    **CU-02**: Panel admin verifica si hay alerta activa para mostrar botón "DESACTIVAR" en rojo.
    
    **Requiere autenticación JWT**
    """
    try:
        alert_service = AlertService(db)
        status_info = await alert_service.get_current_status()
        return status_info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting alert status: {str(e)}"
        )


@router.post("/alerts/global", response_model=AlertResponse)
async def create_global_alert(
    alert_data: AlertCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Create new global emergency alert. Only one alert can be active at a time.
    
    **EMERGENCIA**: "Evacuación preventiva por tormenta eléctrica - Todos los espectáculos suspendidos"
    
    **Requiere autenticación JWT**
    """
    try:
        # Set creator from authenticated user
        alert_data.created_by = current_user.username
        
        alert_service = AlertService(db)
        new_alert = await alert_service.create_alert(alert_data)
        return new_alert
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating alert: {str(e)}"
        )


@router.delete("/alerts/global", response_model=AlertDeactivateResponse)
async def deactivate_global_alert(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Deactivate currently active global alert.
    
    **Post-Emergencia**: Operador desactiva alerta tras pasar tormenta, pantallas vuelven a mostrar horarios normales.
    
    **Requiere autenticación JWT**
    """
    try:
        alert_service = AlertService(db)
        deactivated_alert = await alert_service.deactivate_current_alert(current_user.username)
        
        if not deactivated_alert:
            return AlertDeactivateResponse(
                success=False,
                message="No hay alerta activa para desactivar",
                deactivated_alert=None
            )
        
        return AlertDeactivateResponse(
            success=True,
            message="Alerta global desactivada correctamente",
            deactivated_alert=deactivated_alert
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deactivating alert: {str(e)}"
        )


@router.get("/alerts/history", response_model=AlertHistory)
async def get_alerts_history(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Página"),
    limit: int = Query(20, ge=1, le=100, description="Elementos por página"),
    days_back: int = Query(30, ge=1, le=365, description="Días hacia atrás")
):
    """
    Get paginated history of global alerts.
    
    **Auditoría**: Admin revisa alertas del último mes: 3 por lluvia, 1 por corte eléctrico, duración promedio 45min.
    
    **Requiere autenticación JWT**
    """
    try:
        alert_service = AlertService(db)
        history = await alert_service.get_alert_history(
            page=page,
            limit=limit,
            days_back=days_back
        )
        return history
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting alert history: {str(e)}"
        )


# ===== GLOBAL CONFIGURATION ENDPOINTS =====

@router.get("/config/global", response_model=GlobalConfig)
async def get_global_configuration(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Get complete global system configuration.
    
    **Configuración Sistema**: Admin consulta configuración completa: lead times 30min, 
    modo automático, parque abre 10:00-22:00, max 5 shows en pantalla.
    
    **Requiere autenticación JWT**
    """
    try:
        config_service = ConfigService(db)
        global_config = await config_service.get_global_config()
        return global_config
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting global configuration: {str(e)}"
        )


@router.put("/config/global", response_model=ConfigurationChangeResponse)
async def update_global_configuration(
    config_update: GlobalConfigUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Update global system configuration (partial updates supported).
    
    **Actualización Configuración**: Admin actualiza lead time a 45min y modo manual 
    para mantenimiento programado hasta 18:00.
    
    **Requiere autenticación JWT**
    """
    try:
        config_service = ConfigService(db)
        change_response = await config_service.update_global_config(
            config_update=config_update,
            updated_by=current_user.username
        )
        return change_response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating global configuration: {str(e)}"
        )


@router.get("/config/operation-mode", response_model=OperationModeResponse)
async def get_operation_mode(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Get current system operation mode.
    
    **Modo Operación**: Admin verifica modo actual - "manual" desde 14:30 por admin 
    para mantenimiento hasta 18:00.
    
    **Requiere autenticación JWT**
    """
    try:
        config_service = ConfigService(db)
        operation_mode = await config_service.get_operation_mode()
        return operation_mode
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting operation mode: {str(e)}"
        )


@router.put("/config/operation-mode", response_model=ConfigurationChangeResponse)
async def update_operation_mode(
    mode_update: OperationModeUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Update system operation mode.
    
    **Cambio Modo**: Admin cambia a "automático" tras finalizar mantenimiento - 
    sincronización continua reanudada a las 18:15.
    
    **Requiere autenticación JWT**
    """
    try:
        config_service = ConfigService(db)
        change_response = await config_service.update_operation_mode(
            mode_update=mode_update,
            updated_by=current_user.username
        )
        return change_response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating operation mode: {str(e)}"
        )


@router.get("/config/venue-hours", response_model=VenueHoursResponse)
async def get_venue_hours(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Get current venue operating hours and status.
    
    **Horarios Venue**: Admin consulta horarios - parque abierto 10:00-22:00, 
    zona horaria Europe/Madrid, actualmente abierto.
    
    **Requiere autenticación JWT**
    """
    try:
        config_service = ConfigService(db)
        venue_hours = await config_service.get_venue_hours()
        return venue_hours
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting venue hours: {str(e)}"
        )


@router.put("/config/venue-hours", response_model=ConfigurationChangeResponse)
async def update_venue_hours(
    hours_update: VenueHoursUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Update venue operating hours.
    
    **Horarios Especiales**: Admin actualiza horarios a 09:30-23:00 para evento especial 
    nocturno - efectivo inmediatamente.
    
    **Requiere autenticación JWT**
    """
    try:
        config_service = ConfigService(db)
        change_response = await config_service.update_venue_hours(
            hours_update=hours_update,
            updated_by=current_user.username
        )
        return change_response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating venue hours: {str(e)}"
        )