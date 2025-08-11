"""
Esquemas Pydantic para autenticación JWT
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class Token(BaseModel):
    """Schema para respuesta de token JWT"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "token_type": "bearer",
                    "expires_in": 3600
                }
            ]
        }
    }


class TokenData(BaseModel):
    """Schema para datos del token JWT"""
    username: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[str] = None


class LoginRequest(BaseModel):
    """Schema para request de login"""
    username: str
    password: str
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "username": "admin",
                    "password": "secret_password"
                }
            ]
        }
    }


class UserResponse(BaseModel):
    """Schema para respuesta de usuario autenticado"""
    id: int
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "username": "admin",
                    "email": "admin@puydufou.com",
                    "full_name": "Administrator",
                    "role": "admin",
                    "is_active": True,
                    "created_at": "2025-01-15T10:30:00"
                }
            ]
        }
    }


class LoginResponse(BaseModel):
    """Schema para respuesta completa de login"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "token_type": "bearer",
                    "expires_in": 3600,
                    "user": {
                        "id": 1,
                        "username": "admin",
                        "email": "admin@puydufou.com",
                        "full_name": "Administrator",
                        "role": "admin",
                        "is_active": True,
                        "created_at": "2025-01-15T10:30:00"
                    }
                }
            ]
        }
    }