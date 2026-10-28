"""
Schemas para sistema de importación y sincronización de datos.
Compatible con el formato JSON generado por scripts/extraction/
"""
from datetime import datetime, date, time
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field


# ================================
# SCHEMAS DE IMPORTACIÓN - FORMATO EXACTO DEL SCRIPT
# ================================

class PuyDuFouEventData(BaseModel):
    """
    Evento tal como viene del script de extracción de Puy du Fou.
    Formato EXACTO del JSON generado por showstrack_formatter.py
    """
    external_event_id: str = Field(..., description="ID único del evento externo")
    show_name: str = Field(..., description="Nombre del show/evento")
    event_date: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$', description="Fecha en formato YYYY-MM-DD")
    start_time: str = Field(..., pattern=r'^\d{2}:\d{2}$', description="Hora inicio HH:MM")
    end_time: str = Field(..., pattern=r'^\d{2}:\d{2}$', description="Hora fin HH:MM")
    duration_minutes: int = Field(..., ge=0, le=480, description="Duración en minutos")
    event_type: str = Field(..., description="Tipo de evento (show, system, restaurant, etc.)")


class ExtractionMetadata(BaseModel):
    """
    Metadatos de extracción tal como vienen del script.
    Formato EXACTO del JSON generado por showstrack_formatter.py
    """
    extraction_time: str = Field(..., description="Timestamp de extracción ISO")
    total_events: int = Field(..., ge=0, description="Total de eventos extraídos")
    date_range: List[str] = Field(..., description="Fechas incluidas en la extracción")
    source: str = Field(..., description="Fuente de los datos")
    version: str = Field(..., description="Versión del formato")
    extraction_summary: Dict[str, Any] = Field(..., description="Resumen estadístico")


class PuyDuFouImportData(BaseModel):
    """
    Estructura COMPLETA del JSON generado por el script de extracción.
    Esta es la estructura que recibirá el endpoint POST /api/admin/import
    """
    metadata: ExtractionMetadata
    events: List[PuyDuFouEventData] = Field(..., min_items=1)


# ================================
# SCHEMAS DE PROCESAMIENTO Y RESPUESTA
# ================================

class ImportValidationResult(BaseModel):
    """Resultado de validación de importación"""
    is_valid: bool
    total_events: int
    new_events: int
    updated_events: int
    conflicted_events: int = Field(default=0, description="Eventos con conflictos")
    skipped_events: int = Field(default=0, description="Eventos omitidos")
    conflicts: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)


class ImportRequest(BaseModel):
    """Request para importar datos - acepta el formato exacto del script"""
    data: PuyDuFouImportData = Field(..., description="Datos del script de extracción")
    dry_run: bool = Field(False, description="Solo validar, no aplicar cambios")
    preserve_overrides: bool = Field(True, description="Preservar overrides manuales existentes")


class ImportResponse(BaseModel):
    """Respuesta de importación"""
    import_id: int
    status: Literal["success", "partial", "failed"]
    message: str
    validation_result: ImportValidationResult
    processed_at: datetime
    applied: bool = Field(description="Si los cambios fueron aplicados (false en dry_run)")
    execution_time_seconds: float = Field(description="Tiempo de procesamiento")


class ImportHistoryItem(BaseModel):
    """Item del historial de importaciones"""
    id: int
    source: str
    import_timestamp: datetime = Field(description="Timestamp original de extracción")
    processed_at: datetime = Field(description="Cuando se procesó en ShowsTrack")
    status: Literal["success", "partial", "failed"]
    total_events: int
    new_events: int
    updated_events: int
    applied: bool
    import_metadata: Dict[str, Any] = Field(description="Metadatos de extracción del script")
    date_range: List[str] = Field(description="Fechas incluidas en la importación")


class ImportHistoryResponse(BaseModel):
    """Respuesta del historial de importaciones"""
    items: List[ImportHistoryItem]
    total: int
    page: int
    size: int
    pages: int


# ================================
# SCHEMAS DE SINCRONIZACIÓN
# ================================

class PendingChange(BaseModel):
    """Cambio pendiente de aplicar en modo manual"""
    change_id: str = Field(description="ID único del cambio")
    entity_type: Literal["show", "event"] = Field(description="Tipo de entidad afectada")
    entity_id: Optional[int] = Field(None, description="ID interno de la entidad (null para CREATE)")
    external_id: str = Field(description="ID externo de la entidad")
    action: Literal["create", "update", "delete"] = Field(description="Acción a realizar")
    current_data: Optional[Dict[str, Any]] = Field(None, description="Datos actuales")
    new_data: Dict[str, Any] = Field(description="Datos nuevos a aplicar")
    import_source: str = Field(description="Fuente de la importación")
    import_timestamp: datetime = Field(description="Timestamp de la importación original")
    conflict_reason: Optional[str] = Field(None, description="Razón de conflicto si existe")


class SyncStatus(BaseModel):
    """Estado actual de sincronización del sistema"""
    operation_mode: Literal["automatic", "manual"] = Field(description="Modo de operación actual")
    has_pending_changes: bool = Field(description="Si hay cambios pendientes")
    pending_changes_count: int = Field(description="Número de cambios pendientes")
    last_import: Optional[datetime] = Field(None, description="Última importación recibida")
    last_sync: Optional[datetime] = Field(None, description="Última sincronización aplicada")
    pending_since: Optional[datetime] = Field(None, description="Cambios pendientes desde")
    system_healthy: bool = Field(True, description="Estado general del sistema de sync")


class SyncPendingResponse(BaseModel):
    """Respuesta de cambios pendientes"""
    pending_changes: List[PendingChange]
    total: int
    grouped_by_source: Dict[str, int] = Field(description="Cambios agrupados por fuente")
    grouped_by_action: Dict[str, int] = Field(description="Cambios agrupados por acción")
    oldest_change: Optional[datetime] = Field(None, description="Cambio más antiguo")


class SyncExecuteRequest(BaseModel):
    """Request para ejecutar sincronización completa"""
    force: bool = Field(False, description="Forzar sync incluso si hay conflictos")
    change_ids: Optional[List[str]] = Field(None, description="IDs específicos a sincronizar (todos si es None)")
    reason: Optional[str] = Field(None, max_length=500, description="Razón para la sincronización")


class SyncExecuteResponse(BaseModel):
    """Respuesta de ejecución de sincronización"""
    sync_id: str = Field(description="ID único de la operación de sync")
    status: Literal["success", "partial", "failed"]
    message: str
    changes_applied: int = Field(description="Cambios aplicados exitosamente")
    changes_failed: int = Field(description="Cambios que fallaron")
    changes_skipped: int = Field(default=0, description="Cambios omitidos por conflictos")
    execution_time_seconds: float
    executed_at: datetime
    details: Optional[Dict[str, Any]] = Field(None, description="Detalles adicionales")


class SyncApplyRequest(BaseModel):
    """Request para aplicar cambios pendientes específicos"""
    change_ids: List[str] = Field(..., min_items=1, description="IDs de cambios a aplicar")
    reason: Optional[str] = Field(None, max_length=500, description="Razón para aplicar cambios")


class SyncDiscardRequest(BaseModel):
    """Request para descartar cambios pendientes"""
    change_ids: List[str] = Field(..., min_items=1, description="IDs de cambios a descartar")
    reason: str = Field(..., min_length=1, max_length=500, description="Razón obligatoria para descartar")


class SyncActionResponse(BaseModel):
    """Respuesta genérica para acciones de sincronización"""
    success: bool
    message: str
    affected_changes: int
    executed_at: datetime
    details: Optional[Dict[str, Any]] = Field(None, description="Detalles de la operación")


# ================================
# SCHEMAS PARA VALIDACIÓN ESPECÍFICA  
# ================================

class ImportPreviewRequest(BaseModel):
    """Request para preview de importación sin aplicar cambios"""
    data: PuyDuFouImportData = Field(..., description="Datos a validar")


class ImportPreviewResponse(BaseModel):
    """Respuesta de preview de importación"""
    validation_result: ImportValidationResult
    preview_summary: Dict[str, Any] = Field(description="Resumen de cambios previstos")
    would_be_applied: bool = Field(description="Si los cambios se aplicarían en modo automático")
    estimated_execution_time: float = Field(description="Tiempo estimado de ejecución")


# ================================
# SCHEMAS PARA GUARDADO DE ARCHIVOS
# ================================

class FileStoreRequest(BaseModel):
    """Request para guardar archivo de importación en servidor"""
    data: PuyDuFouImportData = Field(..., description="Datos del archivo JSON")
    filename: str = Field(..., description="Nombre original del archivo")
    validation_status: Literal["valid", "warnings", "errors"] = Field(..., description="Estado de validación")


class FileStoreResponse(BaseModel):
    """Respuesta de guardado de archivo"""
    success: bool
    message: str
    file_path: Optional[str] = Field(None, description="Ruta donde se guardó el archivo")
    file_size: Optional[int] = Field(None, description="Tamaño del archivo en bytes")
    stored_at: Optional[datetime] = Field(None, description="Timestamp del guardado")
    validation_result: Optional[ImportValidationResult] = Field(None, description="Resultado de validación")