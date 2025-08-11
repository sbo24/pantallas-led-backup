"""
Pydantic schemas for GlobalAlert operations.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class AlertBase(BaseModel):
    """Base schema for alert data."""
    message: str = Field(..., description="Alert message content", min_length=1, max_length=1000)
    alert_type: str = Field(default="emergency", description="Type of alert")


class AlertCreate(AlertBase):
    """Schema for creating a new global alert."""
    created_by: Optional[str] = Field(None, description="Username who created the alert (set by server from JWT)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "Evacuación preventiva por tormenta eléctrica - Todos los espectáculos suspendidos",
                "alert_type": "emergency",
                "created_by": "operator1"
            }
        }


class AlertResponse(AlertBase):
    """Schema for alert response data."""
    id: int
    is_active: bool
    activated_at: datetime
    deactivated_at: Optional[datetime] = None
    created_by: str
    created_at: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "message": "Evacuación preventiva por tormenta eléctrica",
                "alert_type": "emergency",
                "is_active": True,
                "activated_at": "2025-07-21T14:30:00Z",
                "deactivated_at": None,
                "created_by": "operator1",
                "created_at": "2025-07-21T14:30:00Z"
            }
        }


class AlertStatus(BaseModel):
    """Schema for current alert status."""
    has_active_alert: bool = Field(..., description="Whether there's an active alert")
    active_alert: Optional[AlertResponse] = Field(None, description="Current active alert if any")
    total_alerts_today: int = Field(..., description="Total alerts created today")
    
    class Config:
        json_schema_extra = {
            "example": {
                "has_active_alert": True,
                "active_alert": {
                    "id": 1,
                    "message": "Evacuación preventiva por tormenta eléctrica",
                    "alert_type": "emergency",
                    "is_active": True,
                    "activated_at": "2025-07-21T14:30:00Z",
                    "deactivated_at": None,
                    "created_by": "operator1",
                    "created_at": "2025-07-21T14:30:00Z"
                },
                "total_alerts_today": 2
            }
        }


class AlertHistory(BaseModel):
    """Schema for alert history response."""
    alerts: List[AlertResponse]
    total_count: int
    page: int
    limit: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "alerts": [
                    {
                        "id": 2,
                        "message": "Mantenimiento urgente en El Último Cantar",
                        "alert_type": "warning", 
                        "is_active": False,
                        "activated_at": "2025-07-21T10:00:00Z",
                        "deactivated_at": "2025-07-21T11:30:00Z",
                        "created_by": "admin1",
                        "created_at": "2025-07-21T10:00:00Z"
                    }
                ],
                "total_count": 15,
                "page": 1,
                "limit": 20
            }
        }


class AlertDeactivateResponse(BaseModel):
    """Schema for alert deactivation response."""
    success: bool
    message: str
    deactivated_alert: Optional[AlertResponse] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Alerta global desactivada correctamente",
                "deactivated_alert": {
                    "id": 1,
                    "message": "Evacuación preventiva por tormenta eléctrica",
                    "alert_type": "emergency",
                    "is_active": False,
                    "activated_at": "2025-07-21T14:30:00Z",
                    "deactivated_at": "2025-07-21T15:00:00Z",
                    "created_by": "operator1",
                    "created_at": "2025-07-21T14:30:00Z"
                }
            }
        }