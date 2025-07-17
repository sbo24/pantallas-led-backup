"""
GlobalAlert model - Alertas del sistema.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, CheckConstraint
from sqlalchemy.sql import func
from .base import Base, BaseModel


class GlobalAlert(Base, BaseModel):
    """Mensajes de alerta que reemplazan la visualización normal."""
    
    __tablename__ = 'global_alerts'
    
    # Primary key
    id = Column(Integer, primary_key=True)
    
    # Alert content
    message = Column(Text, nullable=False)
    alert_type = Column(String(50), default='emergency')  # emergency, warning, info
    
    # Control de vigencia
    is_active = Column(Boolean, default=True)
    activated_at = Column(DateTime(timezone=True), server_default=func.now())
    deactivated_at = Column(DateTime(timezone=True))
    
    # Auditoría
    created_by = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Constraints
    __table_args__ = (
        CheckConstraint("alert_type IN ('emergency', 'warning', 'info')", name='ck_alert_type_valid'),
        # Solo una alerta activa a la vez - esto se manejará a nivel aplicación
    )
    
    def __repr__(self):
        return f"<GlobalAlert(id={self.id}, type='{self.alert_type}', active={self.is_active})>"