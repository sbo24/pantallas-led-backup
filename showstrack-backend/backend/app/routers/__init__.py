"""
Routers de FastAPI para endpoints de la API
"""
from .auth import router as auth_router
from .admin import router as admin_router
from .public import router as public_router

__all__ = [
    "auth_router",
    "admin_router", 
    "public_router"
]