"""
Schemas Pydantic para Dashboard Admin - Resúmenes operativos y métricas
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, date, time
from pydantic import BaseModel, Field
from enum import Enum


class ShowStatus(str, Enum):
    """Estados de shows para dashboard"""
    PROGRAMADO = "PROGRAMADO"
    ABIERTO = "ABIERTO"
    CERRADO = "CERRADO"
    CANCELADO = "CANCELADO"


class SystemHealth(str, Enum):
    """Estados de salud del sistema"""
    HEALTHY = "healthy"
    WARNING = "warning"
    ERROR = "error"


# Schemas simples sin referencias circulares
class SystemMetrics(BaseModel):
    """Métricas del sistema"""
    total_shows: int = Field(..., description="Total de shows en el sistema")
    total_events_today: int = Field(..., description="Total de eventos hoy")
    active_overrides: int = Field(..., description="Overrides manuales activos")
    pending_imports: int = Field(..., description="Importaciones pendientes")
    

class OperationalStatus(BaseModel):
    """Estado operativo actual"""
    operation_mode: str = Field(..., description="Modo operativo (automatic/manual)")
    has_active_alert: bool = Field(..., description="¿Hay alerta global activa?")
    system_health: SystemHealth = Field(..., description="Estado general del sistema")
    last_import: Optional[datetime] = Field(None, description="Última importación exitosa")
    last_sync: Optional[datetime] = Field(None, description="Última sincronización")


class EventStatusCounts(BaseModel):
    """Contadores por estado de eventos"""
    programado: int = Field(0, description="Eventos PROGRAMADO")
    abierto: int = Field(0, description="Eventos ABIERTO") 
    cerrado: int = Field(0, description="Eventos CERRADO")
    cancelado: int = Field(0, description="Eventos CANCELADO")


class TodayEventSummary(BaseModel):
    """Resumen de evento individual para hoy"""
    event_id: int
    show_name: str
    start_time: time
    duration_minutes: int
    current_status: ShowStatus
    has_override: bool = Field(False, description="¿Tiene override manual activo?")
    override_reason: Optional[str] = Field(None, description="Razón del override si existe")
    next_status_change: Optional[datetime] = Field(None, description="Próximo cambio de estado")
    venue_location: Optional[str] = Field(None, description="Ubicación del show")


class EventsByShow(BaseModel):
    """Eventos agrupados por show"""
    show_name: str
    show_id: int
    total_events_today: int
    events: List[TodayEventSummary]


class AlertSummaryItem(BaseModel):
    """Item individual de alerta en resumen"""
    alert_id: int
    alert_type: str = Field(..., description="Tipo: emergency, warning, info")
    message: str
    created_at: datetime
    is_active: bool
    created_by: str


class SystemNotification(BaseModel):
    """Notificación del sistema"""
    notification_id: str
    type: str = Field(..., description="info, warning, error, success")
    title: str
    message: str
    created_at: datetime
    is_read: bool = Field(False, description="¿Ha sido leída?")
    action_required: bool = Field(False, description="¿Requiere acción?")


class ImportSyncStatus(BaseModel):
    """Estado de importación y sincronización"""
    last_import_status: str = Field(..., description="success, failed, pending")
    last_import_time: Optional[datetime]
    pending_changes_count: int = Field(0, description="Cambios pendientes de aplicar")
    sync_mode: str = Field(..., description="automatic, manual")
    next_scheduled_import: Optional[datetime] = Field(None, description="Próxima importación programada")


# Response schemas principales
class DashboardOverviewResponse(BaseModel):
    """Respuesta completa del dashboard overview"""
    timestamp: datetime = Field(..., description="Timestamp de generación")
    system_metrics: SystemMetrics
    operational_status: OperationalStatus
    events_status_today: EventStatusCounts
    quick_stats: Dict[str, Any] = Field(..., description="Estadísticas rápidas adicionales")


class EventsTodayResponse(BaseModel):
    """Respuesta completa de eventos de hoy"""
    date: date = Field(..., description="Fecha de los eventos")
    total_events: int = Field(..., description="Total de eventos hoy")
    events_by_status: EventStatusCounts
    events_by_show: List[EventsByShow]
    last_calculation: datetime = Field(..., description="Última actualización de estados")


class AlertsSummaryResponse(BaseModel):
    """Respuesta completa del resumen de alertas"""
    current_alert: Optional[AlertSummaryItem] = Field(None, description="Alerta global activa")
    recent_alerts: List[AlertSummaryItem] = Field(..., description="Alertas recientes (últimas 24h)")
    system_notifications: List[SystemNotification] = Field(..., description="Notificaciones del sistema")
    import_sync_status: ImportSyncStatus
    alerts_today_count: int = Field(..., description="Total de alertas hoy")
    unread_notifications: int = Field(..., description="Notificaciones no leídas")


# Aliases para endpoints
DashboardOverview = DashboardOverviewResponse
EventsToday = EventsTodayResponse
AlertsSummary = AlertsSummaryResponse