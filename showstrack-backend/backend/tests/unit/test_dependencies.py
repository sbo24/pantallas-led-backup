"""
Tests unitarios para JWT authentication y dependencies
"""
import pytest
from datetime import datetime, timedelta
from jose import jwt, JWTError

from app.dependencies import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_user_by_username,
    authenticate_user,
    SECRET_KEY,
    ALGORITHM
)
from app.models.user import User, Role


class TestPasswordHandling:
    """Tests para manejo de contraseñas"""
    
    def test_password_hashing(self):
        """Verificar que bcrypt funciona correctamente"""
        password = "test_password_123"
        hashed = get_password_hash(password)
        
        assert hashed != password
        assert verify_password(password, hashed)
        assert not verify_password("wrong_password", hashed)
    
    def test_unicode_password_handling(self):
        """Verificar manejo de contraseñas con caracteres especiales"""
        password = "contraseña_especial_ñáéíóú"
        hashed = get_password_hash(password)
        
        assert verify_password(password, hashed)


class TestJWTTokens:
    """Tests para tokens JWT"""
    
    def test_token_generation(self):
        """Verificar generación de tokens JWT"""
        data = {"sub": "test_user", "user_id": 1}
        token = create_access_token(data)
        
        assert isinstance(token, str)
        assert token.count('.') == 2  # JWT tiene 3 partes separadas por puntos
    
    def test_token_validation(self):
        """Verificar validación de tokens"""
        data = {"sub": "test_user", "user_id": 1}
        token = create_access_token(data)
        
        # Decodificar token
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        assert decoded["sub"] == "test_user"
        assert decoded["user_id"] == 1
        assert "exp" in decoded
    
    def test_token_expiration(self):
        """Verificar manejo de expiración de tokens"""
        data = {"sub": "test_user", "user_id": 1}
        expires_delta = timedelta(seconds=-1)  # Token ya expirado
        token = create_access_token(data, expires_delta)
        
        with pytest.raises(JWTError):
            jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    
    def test_invalid_token(self):
        """Verificar manejo de tokens inválidos"""
        invalid_token = "invalid.token.here"
        
        with pytest.raises(JWTError):
            jwt.decode(invalid_token, SECRET_KEY, algorithms=[ALGORITHM])


class TestUserAuthentication:
    """Tests para autenticación de usuarios"""
    
    @pytest.mark.asyncio
    async def test_get_user_by_username(self, test_session, admin_user_data):
        """Verificar obtención de usuario por username"""
        # Crear role admin
        admin_role = Role(
            name="admin",
            description="Administrator",
            permissions=["all"]
        )
        test_session.add(admin_role)
        await test_session.commit()
        await test_session.refresh(admin_role)
        
        # Crear usuario admin
        user = User(
            username=admin_user_data["username"],
            email=admin_user_data["email"],
            full_name=admin_user_data["full_name"],
            hashed_password=get_password_hash(admin_user_data["password"]),
            role_id=admin_role.id,
            is_active=True
        )
        test_session.add(user)
        await test_session.commit()
        
        # Verificar obtención
        retrieved_user = await get_user_by_username(test_session, admin_user_data["username"])
        
        assert retrieved_user is not None
        assert retrieved_user.username == admin_user_data["username"]
        assert retrieved_user.role.name == "admin"
    
    @pytest.mark.asyncio
    async def test_authenticate_user_success(self, test_session, admin_user_data):
        """Verificar autenticación exitosa"""
        # Crear role admin
        admin_role = Role(
            name="admin",
            description="Administrator",
            permissions=["all"]
        )
        test_session.add(admin_role)
        await test_session.commit()
        await test_session.refresh(admin_role)
        
        # Crear usuario admin
        user = User(
            username=admin_user_data["username"],
            email=admin_user_data["email"],
            full_name=admin_user_data["full_name"],
            hashed_password=get_password_hash(admin_user_data["password"]),
            role_id=admin_role.id,
            is_active=True
        )
        test_session.add(user)
        await test_session.commit()
        
        # Verificar autenticación
        authenticated_user = await authenticate_user(
            test_session,
            admin_user_data["username"],
            admin_user_data["password"]
        )
        
        assert authenticated_user is not None
        assert authenticated_user.username == admin_user_data["username"]
    
    @pytest.mark.asyncio
    async def test_authenticate_user_failure(self, test_session, admin_user_data):
        """Verificar fallo de autenticación"""
        # Crear role admin
        admin_role = Role(
            name="admin",
            description="Administrator",
            permissions=["all"]
        )
        test_session.add(admin_role)
        await test_session.commit()
        await test_session.refresh(admin_role)
        
        # Crear usuario admin
        user = User(
            username=admin_user_data["username"],
            email=admin_user_data["email"],
            full_name=admin_user_data["full_name"],
            hashed_password=get_password_hash(admin_user_data["password"]),
            role_id=admin_role.id,
            is_active=True
        )
        test_session.add(user)
        await test_session.commit()
        
        # Verificar fallo con contraseña incorrecta
        authenticated_user = await authenticate_user(
            test_session,
            admin_user_data["username"],
            "wrong_password"
        )
        
        assert authenticated_user is None
    
    @pytest.mark.asyncio
    async def test_authenticate_nonexistent_user(self, test_session):
        """Verificar autenticación de usuario inexistente"""
        authenticated_user = await authenticate_user(
            test_session,
            "nonexistent_user",
            "any_password"
        )
        
        assert authenticated_user is None