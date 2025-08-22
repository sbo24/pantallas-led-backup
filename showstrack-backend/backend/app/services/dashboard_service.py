"""
Dashboard Service - Lógica de negocio para métricas operativas y resúmenes
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, date, time, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import selectinload

from app.models.show import Show
from app.models.event import ScheduledEvent
from app.models.override import StatusOverride
from app.models.alert import GlobalAlert
from app.models.settings import GlobalSettings
from app.models.import_sync import ImportHistory, PendingChanges
from app.models.audit import AuditLog
from app.services.state_engine import StateEngine
from app.schemas.dashboard import (
    DashboardOverviewResponse,
    SystemMetrics,
    OperationalStatus,
    EventStatusCounts,
    EventsTodayResponse,
    TodayEventSummary,
    EventsByShow,
    AlertsSummaryResponse,
    AlertSummaryItem,
    SystemNotification,
    ImportSyncStatus,
    SystemHealth,
    ShowStatus
)


class DashboardService:
    """Servicio para generar datos del dashboard administrativo"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.state_engine = StateEngine(db)

    async def get_dashboard_overview(self) -> DashboardOverviewResponse:
        """
        Generar resumen operativo completo del sistema.
        
        Métricas clave:
        - Contadores de entidades del sistema
        - Estado operativo actual (modo, alertas, salud)
        - Distribución de estados de eventos hoy
        - Estadísticas rápidas adicionales
        """
        now = datetime.now()
        today = now.date()
        
        # System Metrics
        system_metrics = await self._get_system_metrics(today)
        
        # Operational Status
        operational_status = await self._get_operational_status()
        
        # Events Status Today
        events_status_today = await self._get_events_status_counts(today)
        
        # Quick Stats
        quick_stats = await self._get_quick_stats(today)
        
        return DashboardOverviewResponse(
            timestamp=now,
            system_metrics=system_metrics,
            operational_status=operational_status,
            events_status_today=events_status_today,
            quick_stats=quick_stats
        )

    async def get_events_today(self) -> EventsTodayResponse:
        """
        Obtener todos los eventos del día con estados calculados en tiempo real.
        
        Organizado por:
        - Lista completa de eventos con estados actuales
        - Agrupación por show
        - Próximos cambios de estado
        """
        today = date.today()
        now = datetime.now(ZoneInfo("Europe/Madrid"))
        
        # Obtener todos los eventos de hoy con relaciones cargadas
        query = select(ScheduledEvent).options(
            selectinload(ScheduledEvent.show),
            selectinload(ScheduledEvent.status_overrides)
        ).where(
            ScheduledEvent.event_date == today
        ).order_by(ScheduledEvent.start_time)
        
        result = await self.db.execute(query)
        events = result.scalars().all()
        
        # Calcular estados para todos los eventos
        events_with_status = []
        for event in events:
            # Calcular estado actual usando StateEngine
            current_status = await self.state_engine.calculate_event_state(event, now)
            
            # Verificar override activo
            active_override = None
            for override in event.status_overrides:
                if override.is_active:
                    active_override = override
                    break
            
            # Próximo cambio de estado (estimado)
            next_change = await self._estimate_next_status_change(event, now)
            
            event_summary = TodayEventSummary(
                event_id=event.id,
                show_name=event.show.name,
                start_time=event.start_time,
                duration_minutes=event.duration_minutes,
                current_status=ShowStatus(current_status),
                has_override=active_override is not None,
                override_reason=active_override.override_reason if active_override else None,
                next_status_change=next_change,
                venue_location=event.show.venue_location
            )
            events_with_status.append(event_summary)
        
        # Agrupar por show
        events_by_show = await self._group_events_by_show(events_with_status)
        
        # Contadores por estado
        events_by_status = await self._get_events_status_counts(today)
        
        return EventsTodayResponse(
            date=today,
            total_events=len(events_with_status),
            events_by_status=events_by_status,
            events_by_show=events_by_show,
            last_calculation=now
        )

    async def get_alerts_summary(self) -> AlertsSummaryResponse:
        """
        Resumen completo de alertas y notificaciones del sistema.
        
        Incluye:
        - Alerta global activa (si existe)
        - Alertas recientes (últimas 24h)
        - Notificaciones del sistema
        - Estado de importación/sincronización
        """
        now = datetime.now()
        yesterday = now - timedelta(days=1)
        today = now.date()
        
        # Alerta global activa
        current_alert = await self._get_current_alert()
        
        # Alertas recientes (últimas 24h)
        recent_alerts = await self._get_recent_alerts(yesterday)
        
        # Notificaciones del sistema
        system_notifications = await self._get_system_notifications()
        
        # Estado import/sync
        import_sync_status = await self._get_import_sync_status()
        
        # Contadores
        alerts_today_count = await self._count_alerts_today(today)
        unread_notifications = len([n for n in system_notifications if not n.is_read])
        
        return AlertsSummaryResponse(
            current_alert=current_alert,
            recent_alerts=recent_alerts,
            system_notifications=system_notifications,
            import_sync_status=import_sync_status,
            alerts_today_count=alerts_today_count,
            unread_notifications=unread_notifications
        )

    # Métodos auxiliares privados
    
    async def _get_system_metrics(self, today: date) -> SystemMetrics:
        """Obtener métricas básicas del sistema"""
        # Total shows
        shows_query = select(func.count(Show.id))
        shows_result = await self.db.execute(shows_query)
        total_shows = shows_result.scalar() or 0
        
        # Events today
        events_query = select(func.count(ScheduledEvent.id)).where(
            ScheduledEvent.event_date == today
        )
        events_result = await self.db.execute(events_query)
        total_events_today = events_result.scalar() or 0
        
        # Active overrides
        overrides_query = select(func.count(StatusOverride.id)).where(
            StatusOverride.is_active == True
        )
        overrides_result = await self.db.execute(overrides_query)
        active_overrides = overrides_result.scalar() or 0
        
        # Pending imports
        pending_query = select(func.count(PendingChanges.id)).where(
            PendingChanges.is_applied == False
        )
        pending_result = await self.db.execute(pending_query)
        pending_imports = pending_result.scalar() or 0
        
        return SystemMetrics(
            total_shows=total_shows,
            total_events_today=total_events_today,
            active_overrides=active_overrides,
            pending_imports=pending_imports
        )

    async def _get_operational_status(self) -> OperationalStatus:
        """Obtener estado operativo actual"""
        # Operation mode from global settings
        settings_query = select(GlobalSettings).where(
            GlobalSettings.key == "operation_mode"
        )
        settings_result = await self.db.execute(settings_query)
        settings = settings_result.scalar_one_or_none()
        operation_mode = settings.value if settings else "automatic"
        
        # Active alert
        alert_query = select(GlobalAlert).where(
            and_(GlobalAlert.is_active == True, GlobalAlert.deactivated_at.is_(None))
        )
        alert_result = await self.db.execute(alert_query)
        has_active_alert = alert_result.scalar_one_or_none() is not None
        
        # System health (simple heuristic)
        system_health = SystemHealth.HEALTHY
        if has_active_alert:
            system_health = SystemHealth.WARNING
        
        # Last import/sync
        import_query = select(ImportHistory).order_by(desc(ImportHistory.created_at)).limit(1)
        import_result = await self.db.execute(import_query)
        last_import_record = import_result.scalar_one_or_none()
        last_import = last_import_record.created_at if last_import_record else None
        last_sync = last_import  # For now, sync and import are the same
        
        return OperationalStatus(
            operation_mode=operation_mode,
            has_active_alert=has_active_alert,
            system_health=system_health,
            last_import=last_import,
            last_sync=last_sync
        )

    async def _get_events_status_counts(self, today: date) -> EventStatusCounts:
        """Contar eventos por estado para fecha específica"""
        # Obtener eventos de hoy
        events_query = select(ScheduledEvent).where(
            ScheduledEvent.event_date == today
        )
        events_result = await self.db.execute(events_query)
        events = events_result.scalars().all()
        
        # Contar por estado
        counts = {
            "programado": 0,
            "abierto": 0,
            "cerrado": 0,
            "cancelado": 0
        }
        
        now = datetime.now(ZoneInfo("Europe/Madrid"))
        for event in events:
            status = await self.state_engine.calculate_event_state(event, now)
            status_lower = status.lower()
            if status_lower in counts:
                counts[status_lower] += 1
        
        return EventStatusCounts(
            programado=counts["programado"],
            abierto=counts["abierto"],
            cerrado=counts["cerrado"],
            cancelado=counts["cancelado"]
        )

    async def _get_quick_stats(self, today: date) -> Dict[str, Any]:
        """Estadísticas rápidas adicionales"""
        # Override rate today
        total_events_query = select(func.count(ScheduledEvent.id)).where(
            ScheduledEvent.event_date == today
        )
        total_result = await self.db.execute(total_events_query)
        total_events = total_result.scalar() or 0
        
        overrides_query = select(func.count(StatusOverride.id)).where(
            and_(
                StatusOverride.is_active == True,
                StatusOverride.created_at >= datetime.combine(today, time.min)
            )
        )
        overrides_result = await self.db.execute(overrides_query)
        overrides_today = overrides_result.scalar() or 0
        
        override_rate = (overrides_today / total_events * 100) if total_events > 0 else 0
        
        return {
            "override_rate_today_percent": round(override_rate, 1),
            "total_shows_with_events_today": await self._count_shows_with_events_today(today),
            "average_event_duration_minutes": await self._average_event_duration_today(today),
            "peak_hour_events": await self._get_peak_hour_today(today)
        }

    async def _estimate_next_status_change(self, event: ScheduledEvent, now: datetime) -> Optional[datetime]:
        """Estimar próximo cambio de estado para un evento"""
        # Combinar fecha y hora del evento
        event_datetime = datetime.combine(event.event_date, event.start_time)
        
        # Si el evento ya pasó, no hay próximo cambio
        if event_datetime < now:
            return None
        
        # Si está programado, próximo cambio es ABIERTO (30 min antes por defecto)
        lead_time_minutes = 30  # Simplificado, debería usar LeadTimeService
        access_time = event_datetime - timedelta(minutes=lead_time_minutes)
        
        if now < access_time:
            return access_time
        elif now < event_datetime:
            return event_datetime
        
        return None

    async def _group_events_by_show(self, events: List[TodayEventSummary]) -> List[EventsByShow]:
        """Agrupar eventos por show"""
        shows_dict = {}
        
        for event in events:
            show_name = event.show_name
            if show_name not in shows_dict:
                shows_dict[show_name] = {
                    "show_name": show_name,
                    "show_id": 0,  # Simplificado por ahora
                    "events": []
                }
            shows_dict[show_name]["events"].append(event)
        
        result = []
        for show_data in shows_dict.values():
            result.append(EventsByShow(
                show_name=show_data["show_name"],
                show_id=show_data["show_id"],
                total_events_today=len(show_data["events"]),
                events=show_data["events"]
            ))
        
        return result

    async def _get_current_alert(self) -> Optional[AlertSummaryItem]:
        """Obtener alerta global activa"""
        query = select(GlobalAlert).where(
            and_(GlobalAlert.is_active == True, GlobalAlert.deactivated_at.is_(None))
        )
        result = await self.db.execute(query)
        alert = result.scalar_one_or_none()
        
        if not alert:
            return None
        
        return AlertSummaryItem(
            alert_id=alert.id,
            alert_type=alert.alert_type,
            message=alert.message,
            created_at=alert.created_at,
            is_active=alert.is_active,
            created_by=alert.created_by
        )

    async def _get_recent_alerts(self, since: datetime) -> List[AlertSummaryItem]:
        """Obtener alertas recientes desde fecha específica"""
        query = select(GlobalAlert).where(
            GlobalAlert.created_at >= since
        ).order_by(desc(GlobalAlert.created_at)).limit(10)
        
        result = await self.db.execute(query)
        alerts = result.scalars().all()
        
        return [
            AlertSummaryItem(
                alert_id=alert.id,
                alert_type=alert.alert_type,
                message=alert.message,
                created_at=alert.created_at,
                is_active=alert.is_active,
                created_by=alert.created_by
            )
            for alert in alerts
        ]

    async def _get_system_notifications(self) -> List[SystemNotification]:
        """Generar notificaciones del sistema basadas en estado actual"""
        notifications = []
        
        # Verificar overrides activos
        overrides_query = select(func.count(StatusOverride.id)).where(
            StatusOverride.is_active == True
        )
        overrides_result = await self.db.execute(overrides_query)
        active_overrides = overrides_result.scalar() or 0
        
        if active_overrides > 0:
            notifications.append(SystemNotification(
                notification_id=f"overrides_{datetime.now().timestamp()}",
                type="warning",
                title="Overrides Activos",
                message=f"{active_overrides} overrides manuales están activos",
                created_at=datetime.now(ZoneInfo("Europe/Madrid")),
                is_read=False,
                action_required=False
            ))
        
        # Verificar cambios pendientes
        pending_query = select(func.count(PendingChanges.id)).where(
            PendingChanges.is_applied == False
        )
        pending_result = await self.db.execute(pending_query)
        pending_changes = pending_result.scalar() or 0
        
        if pending_changes > 0:
            notifications.append(SystemNotification(
                notification_id=f"pending_{datetime.now().timestamp()}",
                type="info",
                title="Cambios Pendientes",
                message=f"{pending_changes} cambios pendientes de aplicar",
                created_at=datetime.now(ZoneInfo("Europe/Madrid")),
                is_read=False,
                action_required=True
            ))
        
        return notifications

    async def _get_import_sync_status(self) -> ImportSyncStatus:
        """Obtener estado de importación y sincronización"""
        # Última importación
        import_query = select(ImportHistory).order_by(desc(ImportHistory.created_at)).limit(1)
        import_result = await self.db.execute(import_query)
        last_import = import_result.scalar_one_or_none()
        
        # Cambios pendientes
        pending_query = select(func.count(PendingChanges.id)).where(
            PendingChanges.is_applied == False
        )
        pending_result = await self.db.execute(pending_query)
        pending_count = pending_result.scalar() or 0
        
        # Modo de operación
        settings_query = select(GlobalSettings).where(
            GlobalSettings.key == "operation_mode"
        )
        settings_result = await self.db.execute(settings_query)
        settings = settings_result.scalar_one_or_none()
        sync_mode = settings.value if settings else "automatic"
        
        return ImportSyncStatus(
            last_import_status="success" if last_import and last_import.status == "SUCCESS" else "failed",
            last_import_time=last_import.created_at if last_import else None,
            pending_changes_count=pending_count,
            sync_mode=sync_mode,
            next_scheduled_import=None  # TODO: Implementar scheduling
        )

    async def _count_alerts_today(self, today: date) -> int:
        """Contar alertas de hoy"""
        query = select(func.count(GlobalAlert.id)).where(
            func.date(GlobalAlert.created_at) == today
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _count_shows_with_events_today(self, today: date) -> int:
        """Contar shows que tienen eventos hoy"""
        query = select(func.count(func.distinct(ScheduledEvent.show_id))).where(
            ScheduledEvent.event_date == today
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _average_event_duration_today(self, today: date) -> float:
        """Duración promedio de eventos hoy"""
        query = select(func.avg(ScheduledEvent.duration_minutes)).where(
            ScheduledEvent.event_date == today
        )
        result = await self.db.execute(query)
        avg = result.scalar()
        return round(float(avg), 1) if avg else 0.0

    async def _get_peak_hour_today(self, today: date) -> str:
        """Hora pico de eventos hoy"""
        query = select(
            func.extract('hour', ScheduledEvent.start_time).label('hour'),
            func.count(ScheduledEvent.id).label('count')
        ).where(
            ScheduledEvent.event_date == today
        ).group_by(
            func.extract('hour', ScheduledEvent.start_time)
        ).order_by(
            desc('count')
        ).limit(1)
        
        result = await self.db.execute(query)
        peak = result.first()
        
        if peak:
            hour = int(peak.hour)
            return f"{hour:02d}:00-{(hour+1):02d}:00"
        
        return "N/A"