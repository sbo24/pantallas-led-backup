"""
Configuration Service - Business logic for global system configuration management.
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from sqlalchemy.exc import IntegrityError

from app.models.settings import GlobalSettings
from app.models.audit import AuditLog
from app.schemas.config import (
    GlobalConfig, GlobalConfigUpdate, 
    OperationModeResponse, OperationModeUpdate,
    VenueHoursResponse, VenueHoursUpdate,
    ConfigurationChangeResponse
)

class ConfigService:
    """Service for managing global system configuration."""
    
    # Default configuration keys
    DEFAULT_CONFIG_KEYS = {
        "lead_times": {
            "default_lead_time_access_minutes": 30,
            "default_lead_time_finalized_minutes": 0
        },
        "display": {
            "max_shows_display": 5,
            "display_refresh_seconds": 30,
            "display_post_start_minutes": 5,
            "forced_closure_minutes": 5,
            "custom_message": None
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
        "system_states": {
            "states": {
                "programado": {"color": "gray", "label": "Programado"},
                "abierto": {"color": "green", "label": "Abierto"},
                "cerrado": {"color": "red", "label": "Cerrado"},
                "cancelado": {"color": "yellow", "label": "Cancelado"}
            }
        },
        "operation_mode": "automatic"
    }

    DEFAULT_SLIDES_CONFIG = {
        "enabled": True,
        "schedule_slide": {
            "title": "Horarios de Espectáculos",
            "duration_seconds": 30,
            "enabled": True
        },
        "slides": [
            {
                "id": "sueno_2000",
                "title": "El Sueño de Toledo - 20:00H",
                "image_url": "/assets/images/slides/sueno-toledo-2000.jpg",
                "duration_seconds": 15,
                "enabled": True,
                "all_day": False,
                "start_time": "10:00",
                "end_time": "20:00"
            },
            {
                "id": "sueno_2230",
                "title": "El Sueño de Toledo - 22:30H",
                "image_url": "/assets/images/slides/sueno-toledo-2230.jpg",
                "duration_seconds": 15,
                "enabled": True,
                "all_day": False,
                "start_time": "18:00",
                "end_time": "22:30"
            },
            {
                "id": "musica_directo",
                "title": "Música en Directo",
                "image_url": "/assets/images/slides/musica-en-directo.jpg",
                "duration_seconds": 15,
                "enabled": True,
                "all_day": True,
                "start_time": "10:00",
                "end_time": "23:00"
            }
        ],
        "items": [
            {
                "id": "schedule_1",
                "type": "schedule",
                "title": "Horarios de Espectáculos (Iframe)",
                "duration_seconds": 30,
                "enabled": True,
                "all_day": True
            },
            {
                "id": "sueno_2000",
                "type": "image",
                "title": "El Sueño de Toledo - 20:00H",
                "image_url": "/assets/images/slides/sueno-toledo-2000.jpg",
                "duration_seconds": 15,
                "enabled": True,
                "all_day": False,
                "start_time": "10:00",
                "end_time": "20:00"
            },
            {
                "id": "schedule_2",
                "type": "schedule",
                "title": "Horarios de Espectáculos (Iframe)",
                "duration_seconds": 30,
                "enabled": True,
                "all_day": True
            },
            {
                "id": "sueno_2230",
                "type": "image",
                "title": "El Sueño de Toledo - 22:30H",
                "image_url": "/assets/images/slides/sueno-toledo-2230.jpg",
                "duration_seconds": 15,
                "enabled": True,
                "all_day": False,
                "start_time": "18:00",
                "end_time": "22:30"
            },
            {
                "id": "schedule_3",
                "type": "schedule",
                "title": "Horarios de Espectáculos (Iframe)",
                "duration_seconds": 30,
                "enabled": True,
                "all_day": True
            },
            {
                "id": "musica_directo",
                "type": "image",
                "title": "Música en Directo",
                "image_url": "/assets/images/slides/musica-en-directo.jpg",
                "duration_seconds": 15,
                "enabled": True,
                "all_day": True,
                "start_time": "10:00",
                "end_time": "23:00"
            }
        ]
    }
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_global_config(self) -> GlobalConfig:
        """
        Get complete global system configuration.
        Creates default values if they don't exist.
        """
        config_data = {}
        
        # Load all configuration keys
        for main_key, default_value in self.DEFAULT_CONFIG_KEYS.items():
            setting = await self._get_setting(main_key)
            if setting:
                config_data[main_key] = setting.value
            else:
                # Create default if not exists
                await self._create_default_setting(main_key, default_value)
                config_data[main_key] = default_value
        
        return GlobalConfig(**config_data)
    
    async def update_global_config(
        self, 
        config_update: GlobalConfigUpdate,
        updated_by: str
    ) -> ConfigurationChangeResponse:
        """
        Update global system configuration.
        Only updates provided fields.
        """
        updated_fields = []
        previous_values = {}
        new_values = {}
        
        # Get current config for comparison
        current_config = await self.get_global_config()
        
        # Update each provided field
        update_data = config_update.dict(exclude_none=True)
        
        for field_name, field_value in update_data.items():
            if field_value is not None:
                # Get previous value
                current_value = getattr(current_config, field_name)
                if isinstance(current_value, dict):
                    previous_values[field_name] = current_value
                else:
                    previous_values[field_name] = current_value.dict() if hasattr(current_value, 'dict') else current_value
                
                # Set new value
                if hasattr(field_value, 'dict'):
                    new_values[field_name] = field_value.dict()
                else:
                    new_values[field_name] = field_value
                
                # Update in database
                await self._update_setting(
                    field_name,
                    new_values[field_name],
                    updated_by
                )
                
                updated_fields.append(field_name)
        
        # Log changes to audit
        await self._log_config_action(
            action="UPDATE_GLOBAL_CONFIG",
            user=updated_by,
            details=f"Updated fields: {', '.join(updated_fields)}"
        )
        
        return ConfigurationChangeResponse(
            success=True,
            message="Configuración actualizada correctamente",
            updated_fields=updated_fields,
            previous_values=previous_values,
            new_values=new_values,
            updated_at=datetime.now(timezone.utc).isoformat(),
            updated_by=updated_by
        )
    
    async def get_operation_mode(self) -> OperationModeResponse:
        """Get current system operation mode."""
        setting = await self._get_setting("operation_mode")
        
        if not setting:
            # Create default
            await self._create_default_setting("operation_mode", "automatic")
            current_mode = "automatic"
            last_changed_at = None
            changed_by = None
        else:
            current_mode = setting.value
            last_changed_at = setting.updated_at.isoformat() if setting.updated_at else None
            changed_by = setting.updated_by
        
        description = (
            "Sistema en modo automático - sincronización continua" 
            if current_mode == "automatic" 
            else "Sistema en modo manual - cambios retenidos hasta sincronización"
        )
        
        return OperationModeResponse(
            current_mode=current_mode,
            description=description,
            last_changed_at=last_changed_at,
            changed_by=changed_by
        )
    
    async def update_operation_mode(
        self, 
        mode_update: OperationModeUpdate,
        updated_by: str
    ) -> ConfigurationChangeResponse:
        """Update system operation mode."""
        # Get current mode
        current = await self.get_operation_mode()
        
        if current.current_mode == mode_update.mode:
            return ConfigurationChangeResponse(
                success=True,
                message=f"El sistema ya está en modo {mode_update.mode}",
                updated_fields=[],
                previous_values={"operation_mode": current.current_mode},
                new_values={"operation_mode": mode_update.mode},
                updated_at=datetime.now(timezone.utc).isoformat(),
                updated_by=updated_by
            )
        
        # Update mode
        await self._update_setting("operation_mode", mode_update.mode, updated_by)
        
        # Log change
        reason_detail = f" - Motivo: {mode_update.reason}" if mode_update.reason else ""
        await self._log_config_action(
            action="UPDATE_OPERATION_MODE",
            user=updated_by,
            details=f"Cambio de modo: {current.current_mode} → {mode_update.mode}{reason_detail}"
        )
        
        return ConfigurationChangeResponse(
            success=True,
            message=f"Modo de operación cambiado a {mode_update.mode}",
            updated_fields=["operation_mode"],
            previous_values={"operation_mode": current.current_mode},
            new_values={"operation_mode": mode_update.mode},
            updated_at=datetime.now(timezone.utc).isoformat(),
            updated_by=updated_by
        )
    
    async def get_venue_hours(self) -> VenueHoursResponse:
        """Get current venue operating hours with status."""
        venue_setting = await self._get_setting("venue")
        
        if not venue_setting:
            # Create default
            default_venue = self.DEFAULT_CONFIG_KEYS["venue"]
            await self._create_default_setting("venue", default_venue)
            venue_config = default_venue
        else:
            venue_config = venue_setting.value
        
        # Calculate if venue is open now
        # TODO: Implement timezone-aware calculation based on venue_timezone
        is_open_now = True  # Placeholder - would need proper timezone calculation
        
        return VenueHoursResponse(
            park_opening_time=venue_config["park_opening_time"],
            park_closing_time=venue_config["park_closing_time"],
            venue_timezone=venue_config["venue_timezone"],
            is_open_now=is_open_now,
            next_opening=None,  # TODO: Calculate next opening time
            next_closing=None   # TODO: Calculate next closing time
        )
    
    async def update_venue_hours(
        self, 
        hours_update: VenueHoursUpdate,
        updated_by: str
    ) -> ConfigurationChangeResponse:
        """Update venue operating hours."""
        # Get current venue config
        current_hours = await self.get_venue_hours()
        
        # Get full venue config to preserve other settings
        venue_setting = await self._get_setting("venue")
        if venue_setting:
            venue_config = venue_setting.value.copy()
        else:
            venue_config = self.DEFAULT_CONFIG_KEYS["venue"].copy()
        
        # Update hours
        previous_values = {
            "park_opening_time": venue_config["park_opening_time"],
            "park_closing_time": venue_config["park_closing_time"]
        }
        
        venue_config["park_opening_time"] = hours_update.park_opening_time
        venue_config["park_closing_time"] = hours_update.park_closing_time
        
        new_values = {
            "park_opening_time": hours_update.park_opening_time,
            "park_closing_time": hours_update.park_closing_time
        }
        
        # Update in database
        await self._update_setting("venue", venue_config, updated_by)
        
        # Log change
        await self._log_config_action(
            action="UPDATE_VENUE_HOURS",
            user=updated_by,
            details=f"Horarios: {previous_values['park_opening_time']}-{previous_values['park_closing_time']} → {new_values['park_opening_time']}-{new_values['park_closing_time']}"
        )
        
        return ConfigurationChangeResponse(
            success=True,
            message="Horarios del venue actualizados correctamente",
            updated_fields=["park_opening_time", "park_closing_time"],
            previous_values=previous_values,
            new_values=new_values,
            updated_at=datetime.now(timezone.utc).isoformat(),
            updated_by=updated_by
        )
    
    async def get_custom_message(self) -> Optional[str]:
        """Get current custom message for public displays."""
        display_setting = await self._get_setting("display")
        
        if not display_setting:
            # Create default display config if not exists
            default_display = self.DEFAULT_CONFIG_KEYS["display"]
            await self._create_default_setting("display", default_display)
            return None
        
        display_config = display_setting.value
        return display_config.get("custom_message")
    
    async def update_custom_message(
        self, 
        message: Optional[str],
        updated_by: str
    ) -> ConfigurationChangeResponse:
        """Update custom message for public displays."""
        # Get current display config
        display_setting = await self._get_setting("display")
        
        if not display_setting:
            # Create default display config
            display_config = self.DEFAULT_CONFIG_KEYS["display"].copy()
        else:
            display_config = display_setting.value.copy()
        
        # Get previous value
        previous_message = display_config.get("custom_message")
        
        # Update custom message
        display_config["custom_message"] = message
        
        # Update in database
        await self._update_setting("display", display_config, updated_by)
        
        # Log change
        message_detail = f"'{message}'" if message else "None"
        previous_detail = f"'{previous_message}'" if previous_message else "None"
        await self._log_config_action(
            action="UPDATE_CUSTOM_MESSAGE",
            user=updated_by,
            details=f"Mensaje personalizado: {previous_detail} → {message_detail}"
        )
        
        return ConfigurationChangeResponse(
            success=True,
            message="Mensaje personalizado actualizado correctamente",
            updated_fields=["custom_message"],
            previous_values={"custom_message": previous_message},
            new_values={"custom_message": message},
            updated_at=datetime.now(timezone.utc).isoformat(),
            updated_by=updated_by
        )
    
    async def get_slides_config(self) -> Dict[str, Any]:
        """Get slides rotation configuration for public displays."""
        slides_setting = await self._get_setting("slides_rotation")
        if not slides_setting:
            await self._create_default_setting("slides_rotation", self.DEFAULT_SLIDES_CONFIG)
            return self.DEFAULT_SLIDES_CONFIG
        return slides_setting.value

    async def update_slides_config(
        self,
        slides_data: Dict[str, Any],
        updated_by: str
    ) -> ConfigurationChangeResponse:
        """Update slides rotation configuration."""
        current_config = await self.get_slides_config()
        await self._update_setting("slides_rotation", slides_data, updated_by)
        
        await self._log_config_action(
            action="UPDATE_SLIDES_CONFIG",
            user=updated_by,
            details="Configuración de rotación de diapositivas actualizada"
        )
        
        return ConfigurationChangeResponse(
            success=True,
            message="Configuración de diapositivas guardada correctamente",
            updated_fields=["slides_rotation"],
            previous_values={"slides_rotation": current_config},
            new_values={"slides_rotation": slides_data},
            updated_at=datetime.now(timezone.utc).isoformat(),
            updated_by=updated_by
        )

    # === PRIVATE HELPER METHODS ===
    
    async def _get_setting(self, key: str) -> Optional[GlobalSettings]:
        """Get a single setting by key."""
        query = select(GlobalSettings).where(GlobalSettings.key == key)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def _create_default_setting(self, key: str, value: Any) -> GlobalSettings:
        """Create a default setting if it doesn't exist."""
        setting = GlobalSettings(
            key=key,
            value=value,
            description=f"Default configuration for {key}",
            updated_by="system"
        )
        
        self.db.add(setting)
        await self.db.commit()
        await self.db.refresh(setting)
        
        return setting
    
    async def _update_setting(self, key: str, value: Any, updated_by: str) -> GlobalSettings:
        """Update or create a setting."""
        setting = await self._get_setting(key)
        
        if setting:
            setting.value = value
            setting.updated_by = updated_by
            setting.updated_at = func.now()
        else:
            setting = GlobalSettings(
                key=key,
                value=value,
                description=f"Configuration for {key}",
                updated_by=updated_by
            )
            self.db.add(setting)
        
        await self.db.commit()
        await self.db.refresh(setting)
        
        return setting
    
    async def _log_config_action(self, action: str, user: str, details: str = None):
        """Log configuration-related actions to audit log."""
        audit_entry = AuditLog(
            entity_type="configuration",
            entity_id=None,  # Global config doesn't have specific ID
            action=action,
            user_id=user,
            new_values={"details": details} if details else {}
        )
        
        self.db.add(audit_entry)
        # Note: Commit is handled by the calling method