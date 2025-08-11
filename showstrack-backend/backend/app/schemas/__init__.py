"""
Esquemas Pydantic para la API
"""
from .auth import (
    Token,
    TokenData,
    LoginRequest,
    LoginResponse,
    UserResponse
)
from .show import (
    ShowBase,
    ShowCreate,
    ShowUpdate,
    ShowResponse,
    ShowListResponse
)
from .event import (
    EventBase,
    EventCreate,
    EventUpdate,
    EventResponse,
    EventListResponse,
    StatusOverrideResponse,
    OverrideRequest,
    OverrideResponse,
    ShowBasicInfo
)
# Dashboard schemas commented out due to circular import
# from .dashboard import (
#     DashboardOverview,
#     EventsToday,
#     AlertsSummary
# )

__all__ = [
    # Auth schemas
    "Token",
    "TokenData", 
    "LoginRequest",
    "LoginResponse",
    "UserResponse",
    
    # Show schemas
    "ShowBase",
    "ShowCreate",
    "ShowUpdate", 
    "ShowResponse",
    "ShowListResponse",
    
    # Event schemas
    "EventBase",
    "EventCreate",
    "EventUpdate",
    "EventResponse", 
    "EventListResponse",
    "StatusOverrideResponse",
    "OverrideRequest",
    "OverrideResponse",
    "ShowBasicInfo"
]