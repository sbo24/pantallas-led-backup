"""
ScheduledEvent model - Eventos programados de espectáculos.
"""
from sqlalchemy import Column, Integer, String, Date, Time, Boolean, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base, BaseModel


class ScheduledEvent(Base, BaseModel):
    """Horarios específicos de cada representación/pase de un espectáculo."""
    
    __tablename__ = 'scheduled_events'
    
    # Primary key
    id = Column(Integer, primary_key=True)
    
    # External reference
    external_event_id = Column(String(255), nullable=False, unique=True)
    
    # Show reference
    show_id = Column(Integer, ForeignKey('shows.id'), nullable=False)
    
    # Información temporal
    event_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time)
    duration_minutes = Column(Integer, nullable=False)
    
    # Tipo de evento
    event_type = Column(String(50), default='show')  # show, apertura, cierre
    
    # Flags especiales
    is_multiple_shows_flag = Column(Boolean, default=False)
    availability_window_start = Column(Time)
    availability_window_end = Column(Time)
    
    # Metadata de importación
    last_imported_at = Column(DateTime(timezone=True))
    import_source = Column(String(100))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    show = relationship("Show", back_populates="scheduled_events")
    status_override = relationship("StatusOverride", back_populates="scheduled_event", uselist=False)
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('show_id', 'event_date', 'start_time', name='unique_show_datetime'),
        Index('idx_events_date', 'event_date'),
        Index('idx_events_show_date', 'show_id', 'event_date'),
        Index('idx_events_external_id', 'external_event_id'),
        Index('idx_events_datetime', 'event_date', 'start_time'),
    )
    
    def __repr__(self):
        return f"<ScheduledEvent(id={self.id}, external_id='{self.external_event_id}', show_id={self.show_id}, date={self.event_date})>"