"""
Modelos para sistema de importación y sincronización de datos.
Compatible con el formato JSON generado por scripts/extraction/
"""
from datetime import datetime
from typing import Dict, Any

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from .base import Base


class ImportStatus(enum.Enum):
    """Estados de importación"""
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"


class ChangeAction(enum.Enum):
    """Acciones de cambio"""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"


class EntityType(enum.Enum):
    """Tipos de entidad"""
    SHOW = "show"
    EVENT = "event"


class ImportHistory(Base):
    """
    Historial de importaciones de datos externos.
    Guarda cada importación recibida desde los scripts de extracción.
    """
    __tablename__ = "import_history"

    id = Column(Integer, primary_key=True, index=True)
    
    # Información de la fuente
    source = Column(String(100), nullable=False, index=True, comment="Fuente: puy_du_fou_api, manual, etc.")
    import_timestamp = Column(DateTime, nullable=False, comment="Timestamp original de la extracción")
    processed_at = Column(DateTime, nullable=False, default=func.now(), comment="Cuándo se procesó en ShowsTrack")
    
    # Estado y resultado
    status = Column(Enum(ImportStatus), nullable=False, index=True, comment="Estado final de la importación")
    applied = Column(Boolean, nullable=False, default=True, comment="Si los cambios fueron aplicados inmediatamente")
    
    # Estadísticas de eventos
    total_events = Column(Integer, nullable=False, default=0, comment="Total de eventos en la importación")
    new_events = Column(Integer, nullable=False, default=0, comment="Eventos nuevos creados")
    updated_events = Column(Integer, nullable=False, default=0, comment="Eventos actualizados")
    conflicted_events = Column(Integer, nullable=False, default=0, comment="Eventos con conflictos")
    skipped_events = Column(Integer, nullable=False, default=0, comment="Eventos omitidos")
    
    # Datos adicionales
    import_metadata = Column(JSON, nullable=True, comment="Metadatos de extracción completos del script")
    validation_result = Column(JSON, nullable=True, comment="Resultado completo de validación")
    error_details = Column(Text, nullable=True, comment="Detalles de errores si los hubo")
    execution_time_seconds = Column(Integer, nullable=False, default=0, comment="Tiempo de procesamiento")
    
    # Auditoría
    created_at = Column(DateTime, nullable=False, default=func.now())
    created_by = Column(String(100), nullable=True, comment="Usuario que ejecutó la importación")
    
    # Relaciones
    pending_changes = relationship("PendingChanges", back_populates="import_history")
    sync_operations = relationship("SyncOperations", back_populates="import_history")


class PendingChanges(Base):
    """
    Cambios pendientes de aplicar cuando el sistema está en modo manual.
    Cada cambio representa una modificación que debe ser aprobada antes de aplicarse.
    """
    __tablename__ = "pending_changes"

    id = Column(Integer, primary_key=True, index=True)
    change_id = Column(String(100), nullable=False, unique=True, index=True, comment="ID único del cambio (UUID)")
    
    # Entidad afectada
    entity_type = Column(Enum(EntityType), nullable=False, comment="Tipo de entidad: show o event")
    entity_id = Column(Integer, nullable=True, comment="ID de la entidad existente (null para CREATE)")
    external_id = Column(String(100), nullable=False, comment="ID externo de la entidad (del script)")
    
    # Detalles del cambio
    action = Column(Enum(ChangeAction), nullable=False, comment="Acción: create, update, delete")
    current_data = Column(JSON, nullable=True, comment="Datos actuales de la entidad (null para CREATE)")
    new_data = Column(JSON, nullable=False, comment="Datos nuevos a aplicar")
    
    # Origen y metadatos  
    import_source = Column(String(100), nullable=False, comment="Fuente de la importación")
    import_timestamp = Column(DateTime, nullable=False, comment="Timestamp original de la extracción")
    import_history_id = Column(Integer, ForeignKey("import_history.id"), nullable=True, comment="Referencia a la importación")
    
    # Estado del cambio
    is_applied = Column(Boolean, nullable=False, default=False, comment="Si el cambio ya fue aplicado")
    applied_at = Column(DateTime, nullable=True, comment="Cuándo se aplicó el cambio")
    applied_by = Column(String(100), nullable=True, comment="Usuario que aplicó el cambio")
    
    # Gestión de conflictos
    conflict_reason = Column(Text, nullable=True, comment="Razón de conflicto si existe")
    resolution_notes = Column(Text, nullable=True, comment="Notas sobre resolución de conflictos")
    
    # Auditoría
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=True, onupdate=func.now())
    
    # Relaciones
    import_history = relationship("ImportHistory", back_populates="pending_changes")


class SyncOperations(Base):
    """
    Registro de operaciones de sincronización ejecutadas.
    Incluye operaciones de apply, discard y execute completas.
    """
    __tablename__ = "sync_operations"

    id = Column(Integer, primary_key=True, index=True)
    sync_id = Column(String(100), nullable=False, unique=True, index=True, comment="ID único de la operación (UUID)")
    
    # Tipo y estado de operación
    operation_type = Column(String(50), nullable=False, comment="Tipo: execute, apply, discard")
    status = Column(Enum(ImportStatus), nullable=False, comment="Estado: success, partial, failed")
    
    # Estadísticas de la operación
    changes_processed = Column(Integer, nullable=False, default=0, comment="Cambios procesados en total")
    changes_applied = Column(Integer, nullable=False, default=0, comment="Cambios aplicados exitosamente")
    changes_failed = Column(Integer, nullable=False, default=0, comment="Cambios que fallaron")
    changes_skipped = Column(Integer, nullable=False, default=0, comment="Cambios omitidos por conflictos")
    execution_time_seconds = Column(Integer, nullable=False, default=0, comment="Tiempo de ejecución")
    
    # Datos de la operación
    request_data = Column(JSON, nullable=True, comment="Datos del request original")
    result_details = Column(JSON, nullable=True, comment="Detalles del resultado de la operación")
    error_details = Column(Text, nullable=True, comment="Detalles de errores si los hubo")
    
    # Referencias
    import_history_id = Column(Integer, ForeignKey("import_history.id"), nullable=True, comment="Importación relacionada")
    
    # Auditoría
    executed_at = Column(DateTime, nullable=False, default=func.now())
    executed_by = Column(String(100), nullable=False, comment="Usuario que ejecutó la operación")
    
    # Relaciones
    import_history = relationship("ImportHistory", back_populates="sync_operations")


# ================================
# ÍNDICES ADICIONALES PARA RENDIMIENTO
# ================================

# Los índices más importantes ya están definidos en las columnas
# Estos modelos están optimizados para:
# 1. Búsquedas por fecha (import_timestamp, processed_at)
# 2. Filtros por estado (status, is_applied)
# 3. Agrupaciones por fuente (source, import_source)
# 4. Lookups por IDs únicos (change_id, sync_id, external_id)