"""
GlobalSettings model - Configuración del sistema.
"""
from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from .base import Base, BaseModel


class GlobalSettings(Base, BaseModel):
    """Parámetros configurables a nivel sistema."""
    
    __tablename__ = 'global_settings'
    
    # Primary key (la clave es también PK)
    key = Column(String(100), primary_key=True)
    
    # Valor en formato JSON
    value = Column(JSONB, nullable=False)
    
    # Metadata
    description = Column(Text)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by = Column(String(100))
    
    def __repr__(self):
        return f"<GlobalSettings(key='{self.key}', value={self.value})>"