"""
Router de autenticación JWT
"""
from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.dependencies import (
    authenticate_user,
    create_access_token,
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.schemas.auth import LoginResponse, UserResponse
from app.models.user import User

router = APIRouter(prefix="/api/admin/auth", tags=["Authentication"])




@router.post("/login", response_model=LoginResponse)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: AsyncSession = Depends(get_db)
):
    """
    Autenticar usuario y generar token JWT
    
    **Parámetros:**
    - **username**: Nombre de usuario
    - **password**: Contraseña
    
    **Respuesta:**
    - Token JWT con información del usuario
    """
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Crear token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    # Preparar respuesta del usuario
    user_response = UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role.name,
        is_active=user.is_active,
        created_at=user.created_at
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # En segundos
        user=user_response
    )


@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    """
    Obtener información del usuario actual
    
    **Requiere autenticación JWT**
    """
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.name,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )


@router.post("/logout")
async def logout(
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    """
    Cerrar sesión (invalidar token)
    
    **Nota:** En una implementación JWT estateless, el logout es manejado
    por el cliente eliminando el token. Este endpoint existe para 
    consistencia de API.
    """
    return {"message": "Successfully logged out"}


@router.post("/refresh")
async def refresh_token(
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    """
    Renovar token JWT
    
    **Requiere autenticación JWT**
    """
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_user.username, "user_id": current_user.id},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }