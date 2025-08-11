"""
Show model - Catálogo maestro de espectáculos.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, CheckConstraint, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base, BaseModel


class Show(Base, BaseModel):
    """Catálogo maestro de espectáculos disponibles en el parque."""
    
    __tablename__ = 'shows'
    
    # Primary key
    id = Column(Integer, primary_key=True)
    
    # Basic info
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text)
    duration_estimated = Column(Integer)  # minutos
    show_category = Column(String(100))  # principal, secundario, especial
    
    # Configuración de visibilidad
    is_visible = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    
    # Lead times personalizados (NULL = usar globales)
    custom_lead_time_access_minutes = Column(Integer)
    custom_lead_time_finalized_minutes = Column(Integer)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    scheduled_events = relationship("ScheduledEvent", back_populates="show")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('custom_lead_time_access_minutes >= 0', name='ck_shows_access_minutes_positive'),
        CheckConstraint('custom_lead_time_finalized_minutes >= 0', name='ck_shows_finalized_minutes_positive'),
        Index('idx_shows_visible', 'is_visible'),
        Index('idx_shows_display_order', 'display_order'),
    )
    
    def __repr__(self):
        return f"<Show(id={self.id}, name='{self.name}', is_visible={self.is_visible})>"