"""
Configuration schemas for global system settings management.
"""
from typing import Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, validator
from datetime import time

class LeadTimeConfig(BaseModel):
    """Lead time configuration for show state transitions."""
    default_lead_time_access_minutes: int = Field(
        default=30, 
        ge=0, le=120,
        description="Minutes before show start to change from PROGRAMADO to ABIERTO"
    )
    default_lead_time_finalized_minutes: int = Field(
        default=0,
        ge=0, le=60, 
        description="Minutes before show start to change from ABIERTO to CERRADO"
    )

class DisplayConfig(BaseModel):
    """Display and UI configuration."""
    max_shows_display: int = Field(
        default=5,
        ge=1, le=10,
        description="Maximum shows visible on public displays"
    )
    display_refresh_seconds: int = Field(
        default=30,
        ge=10, le=300,
        description="Seconds between display refreshes"
    )

class VenueConfig(BaseModel):
    """Venue/park basic configuration."""
    venue_name: str = Field(
        default="Puy du Fou España",
        min_length=1, max_length=100,
        description="Name of the venue/park"
    )
    venue_timezone: str = Field(
        default="Europe/Madrid",
        description="Timezone for the venue"
    )
    park_opening_time: str = Field(
        default="10:00",
        description="Park opening time (HH:MM format)"
    )
    park_closing_time: str = Field(
        default="22:00", 
        description="Park closing time (HH:MM format)"
    )
    
    @validator('park_opening_time', 'park_closing_time')
    def validate_time_format(cls, v):
        try:
            time.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError('Time must be in HH:MM format')

class ImportConfig(BaseModel):
    """Data import and synchronization configuration."""
    auto_import_enabled: bool = Field(
        default=True,
        description="Enable automatic data import"
    )
    import_schedule_cron: str = Field(
        default="0 6 * * *",
        description="Cron schedule for automatic imports"
    )

class SystemStateConfig(BaseModel):
    """System states configuration."""
    states: Dict[str, Dict[str, str]] = Field(
        default={
            "programado": {"color": "gray", "label": "Programado"},
            "abierto": {"color": "green", "label": "Abierto"},
            "cerrado": {"color": "red", "label": "Cerrado"},
            "cancelado": {"color": "yellow", "label": "Cancelado"}
        },
        description="System states with display configuration"
    )

# === MAIN CONFIGURATION SCHEMAS ===

class GlobalConfig(BaseModel):
    """Complete global system configuration."""
    lead_times: LeadTimeConfig = Field(default_factory=LeadTimeConfig)
    display: DisplayConfig = Field(default_factory=DisplayConfig)
    venue: VenueConfig = Field(default_factory=VenueConfig)
    import_settings: ImportConfig = Field(default_factory=ImportConfig)
    system_states: SystemStateConfig = Field(default_factory=SystemStateConfig)
    operation_mode: Literal["automatic", "manual"] = Field(
        default="automatic",
        description="System operation mode"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "lead_times": {
                    "default_lead_time_access_minutes": 30,
                    "default_lead_time_finalized_minutes": 0
                },
                "display": {
                    "max_shows_display": 5,
                    "display_refresh_seconds": 30
                },
                "venue": {
                    "venue_name": "Puy du Fou España",
                    "venue_timezone": "Europe/Madrid",
                    "park_opening_time": "10:00",
                    "park_closing_time": "22:00"
                },
                "import_settings": {
                    "auto_import_enabled": True,
                    "import_schedule_cron": "0 6 * * *"
                },
                "operation_mode": "automatic"
            }
        }

class GlobalConfigUpdate(BaseModel):
    """Partial update schema for global configuration."""
    lead_times: Optional[LeadTimeConfig] = None
    display: Optional[DisplayConfig] = None
    venue: Optional[VenueConfig] = None
    import_settings: Optional[ImportConfig] = None
    system_states: Optional[SystemStateConfig] = None
    operation_mode: Optional[Literal["automatic", "manual"]] = None

# === OPERATION MODE SPECIFIC SCHEMAS ===

class OperationModeResponse(BaseModel):
    """Response for operation mode queries."""
    current_mode: Literal["automatic", "manual"]
    description: str
    last_changed_at: Optional[str] = None
    changed_by: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "current_mode": "automatic",
                "description": "Sistema en modo automático - sincronización continua",
                "last_changed_at": "2025-07-22T10:30:00Z",
                "changed_by": "admin"
            }
        }

class OperationModeUpdate(BaseModel):
    """Schema for updating operation mode."""
    mode: Literal["automatic", "manual"] = Field(
        ...,
        description="New operation mode"
    )
    reason: Optional[str] = Field(
        None,
        max_length=200,
        description="Reason for mode change"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "mode": "manual",
                "reason": "Mantenimiento programado - cambios manuales hasta las 18:00"
            }
        }

# === VENUE HOURS SPECIFIC SCHEMAS ===

class VenueHoursResponse(BaseModel):
    """Response for venue hours queries."""
    park_opening_time: str
    park_closing_time: str
    venue_timezone: str
    is_open_now: bool
    next_opening: Optional[str] = None
    next_closing: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "park_opening_time": "10:00",
                "park_closing_time": "22:00",
                "venue_timezone": "Europe/Madrid",
                "is_open_now": True,
                "next_opening": None,
                "next_closing": "2025-07-22T22:00:00+02:00"
            }
        }

class VenueHoursUpdate(BaseModel):
    """Schema for updating venue hours."""
    park_opening_time: str = Field(
        ...,
        description="Park opening time (HH:MM format)"
    )
    park_closing_time: str = Field(
        ..., 
        description="Park closing time (HH:MM format)"
    )
    
    @validator('park_opening_time', 'park_closing_time')
    def validate_time_format(cls, v):
        try:
            time.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError('Time must be in HH:MM format')
    
    class Config:
        json_schema_extra = {
            "example": {
                "park_opening_time": "09:30",
                "park_closing_time": "23:00"
            }
        }

# === CONFIGURATION CHANGE RESPONSE ===

class ConfigurationChangeResponse(BaseModel):
    """Response for configuration update operations."""
    success: bool
    message: str
    updated_fields: list[str]
    previous_values: Optional[Dict[str, Any]] = None
    new_values: Dict[str, Any]
    updated_at: str
    updated_by: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Configuración actualizada correctamente",
                "updated_fields": ["operation_mode", "lead_times.default_lead_time_access_minutes"],
                "previous_values": {
                    "operation_mode": "automatic",
                    "lead_times.default_lead_time_access_minutes": 30
                },
                "new_values": {
                    "operation_mode": "manual", 
                    "lead_times.default_lead_time_access_minutes": 45
                },
                "updated_at": "2025-07-22T10:30:00Z",
                "updated_by": "admin"
            }
        }