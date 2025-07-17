"""
AuditLog model - Registro de auditoría.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.dialects.postgresql import JSONB, INET, UUID
from sqlalchemy.sql import func
from .base import Base, BaseModel


class AuditLog(Base, BaseModel):
    """Trazabilidad completa de acciones administrativas."""
    
    __tablename__ = 'audit_logs'
    
    # Primary key
    id = Column(Integer, primary_key=True)
    
    # Timestamp
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # User info
    user_id = Column(String(100), nullable=False)
    
    # Action details
    action = Column(String(100), nullable=False)  # CREATE, UPDATE, DELETE, OVERRIDE, SYNC, etc.
    entity_type = Column(String(50), nullable=False)  # show, event, setting, alert
    entity_id = Column(Integer)
    
    # Detalles del cambio
    old_values = Column(JSONB)
    new_values = Column(JSONB)
    
    # Contexto adicional
    ip_address = Column(INET)
    user_agent = Column(Text)
    request_id = Column(UUID)
    
    # Indexes
    __table_args__ = (
        Index('idx_audit_user_timestamp', 'user_id', 'timestamp'),
        Index('idx_audit_entity', 'entity_type', 'entity_id'),
        Index('idx_audit_action', 'action', 'timestamp'),
    )
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, user='{self.user_id}', action='{self.action}', entity='{self.entity_type}')>"