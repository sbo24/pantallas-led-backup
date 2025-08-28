"""
Alert Service - Business logic for global alerts management.
"""
from datetime import datetime, date, timedelta
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from sqlalchemy.orm import selectinload

from app.models.alert import GlobalAlert
from app.models.audit import AuditLog
from app.schemas.alert import AlertCreate, AlertResponse, AlertStatus, AlertHistory


class AlertService:
    """Service class for managing global alerts."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_current_status(self) -> AlertStatus:
        """
        Get current alert status with active alert info and today's count.
        """
        # Get active alert
        active_alert_query = select(GlobalAlert).where(
            GlobalAlert.is_active == True
        ).order_by(desc(GlobalAlert.activated_at))
        
        result = await self.db.execute(active_alert_query)
        active_alert = result.scalars().first()
        
        # Count today's alerts
        today = date.today()
        today_count_query = select(func.count(GlobalAlert.id)).where(
            func.date(GlobalAlert.created_at) == today
        )
        
        count_result = await self.db.execute(today_count_query)
        today_count = count_result.scalar() or 0
        
        return AlertStatus(
            has_active_alert=active_alert is not None,
            active_alert=AlertResponse.model_validate(active_alert) if active_alert else None,
            total_alerts_today=today_count
        )
    
    async def create_alert(self, alert_data: AlertCreate) -> AlertResponse:
        """
        Create a new global alert. Only one alert can be active at a time.
        """
        # Validate alert type
        valid_types = ['emergency', 'warning', 'info']
        if alert_data.alert_type not in valid_types:
            raise ValueError(f"Invalid alert type. Must be one of: {valid_types}")
        
        # Deactivate any existing active alerts
        await self._deactivate_all_active_alerts("system")
        
        # Create new alert
        new_alert = GlobalAlert(
            message=alert_data.message,
            alert_type=alert_data.alert_type,
            is_active=True,
            created_by=alert_data.created_by
        )
        
        self.db.add(new_alert)
        await self.db.commit()
        await self.db.refresh(new_alert)
        
        # Log the action
        await self._log_alert_action(
            "ALERT_CREATED",
            new_alert.id,
            alert_data.created_by,
            f"Created alert: {alert_data.alert_type} - {alert_data.message[:50]}..."
        )
        
        return AlertResponse.model_validate(new_alert)
    
    async def deactivate_current_alert(self, deactivated_by: str) -> Optional[AlertResponse]:
        """
        Deactivate the currently active alert.
        """
        # Find active alert
        active_alert_query = select(GlobalAlert).where(
            GlobalAlert.is_active == True
        )
        
        result = await self.db.execute(active_alert_query)
        active_alert = result.scalars().first()
        
        if not active_alert:
            return None
        
        # Deactivate it
        active_alert.is_active = False
        active_alert.deactivated_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(active_alert)
        
        # Log the action
        await self._log_alert_action(
            "ALERT_DEACTIVATED",
            active_alert.id,
            deactivated_by,
            f"Deactivated alert: {active_alert.alert_type} - {active_alert.message[:50]}..."
        )
        
        return AlertResponse.model_validate(active_alert)
    
    async def get_alert_history(
        self, 
        page: int = 1, 
        limit: int = 20,
        days_back: int = 30
    ) -> AlertHistory:
        """
        Get paginated history of alerts from the last N days.
        """
        # Calculate offset
        offset = (page - 1) * limit
        
        # Date filter
        cutoff_date = datetime.utcnow().date() - timedelta(days=days_back)
        
        # Query for alerts
        alerts_query = (
            select(GlobalAlert)
            .where(func.date(GlobalAlert.created_at) >= cutoff_date)
            .order_by(desc(GlobalAlert.created_at))
            .offset(offset)
            .limit(limit)
        )
        
        alerts_result = await self.db.execute(alerts_query)
        alerts = alerts_result.scalars().all()
        
        # Count total
        count_query = select(func.count(GlobalAlert.id)).where(
            func.date(GlobalAlert.created_at) >= cutoff_date
        )
        count_result = await self.db.execute(count_query)
        total_count = count_result.scalar() or 0
        
        return AlertHistory(
            alerts=[AlertResponse.model_validate(alert) for alert in alerts],
            total_count=total_count,
            page=page,
            limit=limit
        )
    
    async def _deactivate_all_active_alerts(self, deactivated_by: str):
        """
        Deactivate all currently active alerts.
        """
        active_alerts_query = select(GlobalAlert).where(
            GlobalAlert.is_active == True
        )
        
        result = await self.db.execute(active_alerts_query)
        active_alerts = result.scalars().all()
        
        for alert in active_alerts:
            alert.is_active = False
            alert.deactivated_at = datetime.utcnow()
            
            await self._log_alert_action(
                "ALERT_AUTO_DEACTIVATED",
                alert.id,
                deactivated_by,
                f"Auto-deactivated by new alert creation"
            )
    
    async def _log_alert_action(
        self, 
        action: str, 
        alert_id: int, 
        user: str, 
        details: str
    ):
        """
        Log alert-related actions to audit log.
        """
        audit_entry = AuditLog(
            entity_type="alert",
            entity_id=alert_id,
            action=action,
            user_id=user,
            new_values={"details": details}
        )
        
        self.db.add(audit_entry)
        # Note: commit is handled by the calling method