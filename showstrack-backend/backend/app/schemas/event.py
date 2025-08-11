"""
Esquemas Pydantic para Events
"""
from datetime import datetime, date, time
from typing import Optional, List
from pydantic import BaseModel, Field


class EventBase(BaseModel):
    """Schema base para Event"""
    external_event_id: str = Field(..., min_length=1, max_length=100, description="ID externo del evento")
    show_id: int = Field(..., gt=0, description="ID del show")
    event_date: date = Field(..., description="Fecha del evento")
    start_time: time = Field(..., description="Hora de inicio")
    end_time: Optional[time] = Field(None, description="Hora de fin")
    duration_minutes: Optional[int] = Field(None, ge=1, le=480, description="Duración en minutos")
    is_multiple_shows_flag: bool = Field(False, description="Flag para múltiples shows")


class EventCreate(EventBase):
    """Schema para crear un Event"""
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "external_event_id": "PDF-2024-001-15:30",
                    "show_id": 1,
                    "event_date": "2024-01-15",
                    "start_time": "15:30",
                    "end_time": "16:15",
                    "duration_minutes": 45,
                    "is_multiple_shows_flag": True
                }
            ]
        }
    }


class EventUpdate(BaseModel):
    """Schema para actualizar un Event"""
    external_event_id: Optional[str] = Field(None, min_length=1, max_length=100)
    show_id: Optional[int] = Field(None, gt=0)
    event_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    duration_minutes: Optional[int] = Field(None, ge=1, le=480)
    is_multiple_shows_flag: Optional[bool] = None
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "start_time": "15:45",
                    "end_time": "16:30",
                    "duration_minutes": 45
                }
            ]
        }
    }


class StatusOverrideResponse(BaseModel):
    """Schema para respuesta de Status Override"""
    id: int
    override_status: str = Field(..., description="Estado del override")
    reason: Optional[str] = Field(None, description="Razón del override")
    is_active: bool
    created_by: str
    created_at: datetime
    
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": 201,
                    "override_status": "CERRADO",
                    "reason": "Problemas técnicos con el equipo de sonido",
                    "is_active": True,
                    "created_by": "admin",
                    "created_at": "2024-01-15T10:40:00"
                }
            ]
        }
    }


class ShowBasicInfo(BaseModel):
    """Schema básico para información de Show en Event"""
    id: int
    name: str
    
    model_config = {
        "from_attributes": True
    }


class EventResponse(EventBase):
    """Schema para respuesta de Event"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    # Relaciones
    show: ShowBasicInfo
    override: Optional[StatusOverrideResponse] = None
    
    # Campos calculados
    calculated_status: Optional[str] = Field(None, description="Estado calculado del evento")
    
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": 101,
                    "external_event_id": "PDF-2024-001-15:30",
                    "show_id": 1,
                    "event_date": "2024-01-15",
                    "start_time": "15:30",
                    "end_time": "16:15",
                    "duration_minutes": 45,
                    "is_multiple_shows_flag": True,
                    "created_at": "2024-01-15T10:30:00",
                    "updated_at": "2024-01-15T10:30:00",
                    "show": {
                        "id": 1,
                        "name": "El Último Cantar"
                    },
                    "override": None,
                    "calculated_status": "PROGRAMADO"
                }
            ]
        }
    }


class EventListResponse(BaseModel):
    """Schema para respuesta de lista de Events"""
    items: List[EventResponse]
    total: int
    page: int
    size: int
    pages: int
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "items": [
                        {
                            "id": 101,
                            "external_event_id": "PDF-2024-001-15:30",
                            "show_id": 1,
                            "event_date": "2024-01-15",
                            "start_time": "15:30",
                            "end_time": "16:15",
                            "duration_minutes": 45,
                            "is_multiple_shows_flag": True,
                            "created_at": "2024-01-15T10:30:00",
                            "updated_at": "2024-01-15T10:30:00",
                            "show": {
                                "id": 1,
                                "name": "El Último Cantar"
                            },
                            "override": None,
                            "calculated_status": "PROGRAMADO"
                        }
                    ],
                    "total": 45,
                    "page": 1,
                    "size": 50,
                    "pages": 1
                }
            ]
        }
    }


class OverrideRequest(BaseModel):
    """Schema para request de override"""
    action: str = Field(..., description="Acción: 'create' o 'deactivate'")
    status: Optional[str] = Field(None, description="Estado del override: 'CERRADO' o 'CANCELADO'")
    reason: Optional[str] = Field(None, min_length=10, max_length=500, description="Razón del override")
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "action": "create",
                    "status": "CERRADO",
                    "reason": "Problemas técnicos con el equipo de sonido"
                }
            ]
        }
    }


class OverrideResponse(BaseModel):
    """Schema para respuesta de override"""
    event_id: int
    override: Optional[StatusOverrideResponse] = None
    audit_logged: bool = True
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "event_id": 101,
                    "override": {
                        "id": 201,
                        "override_status": "CERRADO",
                        "reason": "Problemas técnicos con el equipo de sonido",
                        "is_active": True,
                        "created_by": "admin",
                        "created_at": "2024-01-15T10:40:00"
                    },
                    "audit_logged": True
                }
            ]
        }
    }