"""
Esquemas Pydantic para Shows
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ShowBase(BaseModel):
    """Schema base para Show"""
    name: str = Field(..., min_length=1, max_length=100, description="Nombre del show")
    description: Optional[str] = Field(None, max_length=500, description="Descripción del show")
    duration_estimated: Optional[int] = Field(None, ge=0, le=300, description="Duración estimada en minutos")
    is_visible: bool = Field(True, description="Si el show es visible al público")
    display_order: int = Field(1, ge=0, le=100, description="Orden de visualización")
    custom_lead_time_access_minutes: Optional[int] = Field(None, ge=0, le=120, description="Tiempo de apertura personalizado")
    custom_lead_time_finalized_minutes: Optional[int] = Field(None, ge=0, le=60, description="Tiempo de finalización personalizado")


class ShowCreate(ShowBase):
    """Schema para crear un Show"""
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "El Último Cantar",
                    "description": "Espectáculo épico medieval",
                    "duration_estimated": 45,
                    "is_visible": True,
                    "display_order": 1,
                    "custom_lead_time_access_minutes": 30,
                    "custom_lead_time_finalized_minutes": 5
                }
            ]
        }
    }


class ShowUpdate(BaseModel):
    """Schema para actualizar un Show"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    duration_estimated: Optional[int] = Field(None, ge=0, le=300)
    is_visible: Optional[bool] = None
    display_order: Optional[int] = Field(None, ge=0, le=100)
    custom_lead_time_access_minutes: Optional[int] = Field(None, ge=0, le=120)
    custom_lead_time_finalized_minutes: Optional[int] = Field(None, ge=0, le=60)
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "is_visible": False,
                    "display_order": 3,
                    "custom_lead_time_access_minutes": 45
                }
            ]
        }
    }


class ShowResponse(ShowBase):
    """Schema para respuesta de Show"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    # Campos calculados
    current_events_count: Optional[int] = Field(None, description="Cantidad de eventos actuales")
    
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "name": "El Último Cantar",
                    "description": "Espectáculo épico medieval",
                    "duration_estimated": 45,
                    "is_visible": True,
                    "display_order": 1,
                    "custom_lead_time_access_minutes": 30,
                    "custom_lead_time_finalized_minutes": 5,
                    "created_at": "2025-01-15T10:30:00",
                    "updated_at": "2025-01-15T10:30:00",
                    "current_events_count": 3
                }
            ]
        }
    }


class ShowListResponse(BaseModel):
    """Schema para respuesta de lista de Shows"""
    items: List[ShowResponse]
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
                            "id": 1,
                            "name": "El Último Cantar",
                            "description": "Espectáculo épico medieval",
                            "duration_estimated": 45,
                            "is_visible": True,
                            "display_order": 1,
                            "custom_lead_time_access_minutes": 30,
                            "custom_lead_time_finalized_minutes": 5,
                            "created_at": "2025-01-15T10:30:00",
                            "updated_at": "2025-01-15T10:30:00",
                            "current_events_count": 3
                        }
                    ],
                    "total": 15,
                    "page": 1,
                    "size": 50,
                    "pages": 1
                }
            ]
        }
    }