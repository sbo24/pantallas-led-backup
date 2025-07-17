# Models package
from .base import Base
from .show import Show
from .event import ScheduledEvent
from .override import StatusOverride
from .settings import GlobalSettings
from .alert import GlobalAlert
from .audit import AuditLog
from .user import User, Role

# Import all models to ensure they're registered with Base.metadata
# This is necessary for Alembic to detect them
__all__ = [
    "Base",
    "Show",
    "ScheduledEvent", 
    "StatusOverride",
    "GlobalSettings",
    "GlobalAlert",
    "AuditLog",
    "User",
    "Role"
]