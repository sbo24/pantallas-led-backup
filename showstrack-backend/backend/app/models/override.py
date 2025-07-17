"""
StatusOverride model - Overrides manuales de estado.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, CheckConstraint, Index, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base, BaseModel


class StatusOverride(Base, BaseModel):
    """Almacenar intervenciones manuales del operador sobre estados calculados."""
    
    __tablename__ = 'status_overrides'
    
    # Primary key
    id = Column(Integer, primary_key=True)
    
    # Event reference
    scheduled_event_id = Column(Integer, ForeignKey('scheduled_events.id'), nullable=False)
    
    # Estado forzado
    override_status = Column(String(20), nullable=False)
    override_reason = Column(Text)
    
    # Control de vigencia
    is_active = Column(Boolean, default=True)
    activated_at = Column(DateTime(timezone=True), server_default=func.now())
    deactivated_at = Column(DateTime(timezone=True))
    
    # Auditoría
    created_by = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    scheduled_event = relationship("ScheduledEvent", back_populates="status_override")
    
    # Constraints
    __table_args__ = (
        CheckConstraint("override_status IN ('CERRADO', 'CANCELADO')", name='ck_override_status_valid'),
        # Solo un override activo por evento
        UniqueConstraint('scheduled_event_id', name='uq_one_active_override_per_event'),
        Index('idx_overrides_active', 'scheduled_event_id', postgresql_where=Column('is_active') == True),
    )
    
    def __repr__(self):
        return f"<StatusOverride(id={self.id}, event_id={self.scheduled_event_id}, status='{self.override_status}', active={self.is_active})>"