"""
User and Role models - Sistema de autenticación.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base, BaseModel


class Role(Base, BaseModel):
    """Definir los niveles de permiso dentro del sistema."""
    
    __tablename__ = 'roles'
    
    # Primary key
    id = Column(Integer, primary_key=True)
    
    # Role info
    name = Column(String(50), nullable=False, unique=True)
    description = Column(Text)
    permissions = Column(JSONB)  # Lista de permisos como ["read:shows", "write:shows"]
    
    # Relationships
    users = relationship("User", back_populates="role")
    
    def __repr__(self):
        return f"<Role(id={self.id}, name='{self.name}')>"


class User(Base, BaseModel):
    """Gestionar las cuentas de los operadores que acceden al panel de administración."""
    
    __tablename__ = 'users'
    
    # Primary key
    id = Column(Integer, primary_key=True)
    
    # User credentials
    username = Column(String(100), nullable=False, unique=True)
    email = Column(String(255), nullable=False, unique=True)
    hashed_password = Column(String(255), nullable=False)
    
    # User info
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    
    # Role reference
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    role = relationship("Role", back_populates="users")
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', active={self.is_active})>"