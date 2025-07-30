"""
Lead Time Service - Gestión de tiempos de anticipación para shows.

Proporciona funcionalidades para:
- Configurar lead times específicos por show
- Obtener configuración efectiva (show específico vs global)
- Validar rangos de valores
- Auditar cambios de configuración
"""
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update
from sqlalchemy.exc import IntegrityError

from app.models.show import Show
from app.models.settings import GlobalSettings
from app.models.audit import AuditLog
from app.services.config_service import ConfigService


class LeadTimeService:
    """Servicio para gestión de lead times de shows."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.config_service = ConfigService()
    
    # Valores límite según business-rules.md
    MIN_ACCESS_MINUTES = 0
    MAX_ACCESS_MINUTES = 120
    MIN_FINALIZED_MINUTES = 0
    MAX_FINALIZED_MINUTES = 60
    
    async def get_effective_lead_times(self, show: Show) -> Dict[str, int]:
        """
        Obtiene los lead times efectivos para un show siguiendo la jerarquía:
        1. Configuración específica del show (si está definida)
        2. Configuración global del sistema
        
        Args:
            show: Show para el cual obtener lead times
            
        Returns:
            Dict con 'access_minutes' y 'finalized_minutes'
        """
        # Si el show tiene configuración personalizada, usarla
        if (show.custom_lead_time_access_minutes is not None and 
            show.custom_lead_time_finalized_minutes is not None):
            return {
                'access_minutes': show.custom_lead_time_access_minutes,
                'finalized_minutes': show.custom_lead_time_finalized_minutes,
                'source': 'show_specific'
            }
        
        # Obtener configuración global
        global_config = await self.config_service.get_global_config(self.db)
        lead_times = global_config.lead_times
        
        return {
            'access_minutes': lead_times.default_lead_time_access_minutes,
            'finalized_minutes': lead_times.default_lead_time_finalized_minutes,
            'source': 'global_default'
        }
    
    async def configure_show_lead_times(
        self, 
        show_id: int, 
        access_minutes: int, 
        finalized_minutes: int,
        user: str
    ) -> Dict[str, Any]:
        """
        Configura lead times específicos para un show.
        
        Args:
            show_id: ID del show
            access_minutes: Minutos antes del show para PROGRAMADO → ABIERTO
            finalized_minutes: Minutos antes del show para ABIERTO → CERRADO
            user: Usuario que realiza el cambio (para auditoría)
            
        Returns:
            Dict con resultado de la operación
            
        Raises:
            ValueError: Si los valores están fuera de rango
            IntegrityError: Si el show no existe
        """
        # Validar rangos
        self._validate_lead_time_ranges(access_minutes, finalized_minutes)
        
        # Obtener el show actual
        stmt = select(Show).where(Show.id == show_id)
        result = await self.db.execute(stmt)
        show = result.scalar_one_or_none()
        
        if not show:
            raise ValueError(f"Show con ID {show_id} no encontrado")
        
        # Guardar valores anteriores para auditoría
        previous_values = {
            'access_minutes': show.custom_lead_time_access_minutes,
            'finalized_minutes': show.custom_lead_time_finalized_minutes
        }
        
        # Actualizar configuración
        stmt = update(Show).where(Show.id == show_id).values(
            custom_lead_time_access_minutes=access_minutes,
            custom_lead_time_finalized_minutes=finalized_minutes,
            updated_at=datetime.now()
        )
        await self.db.execute(stmt)
        await self.db.commit()
        
        # Registrar en audit log
        await self._log_lead_time_change(
            show_id=show_id,
            show_name=show.name,
            previous_values=previous_values,
            new_values={
                'access_minutes': access_minutes,
                'finalized_minutes': finalized_minutes
            },
            user=user
        )
        
        return {
            'success': True,
            'show_id': show_id,
            'show_name': show.name,
            'previous_access_minutes': previous_values['access_minutes'],
            'previous_finalized_minutes': previous_values['finalized_minutes'],  
            'new_access_minutes': access_minutes,
            'new_finalized_minutes': finalized_minutes,
            'changed_by': user,
            'changed_at': datetime.now()
        }
    
    async def remove_show_custom_lead_times(
        self, 
        show_id: int, 
        user: str
    ) -> Dict[str, Any]:
        """
        Elimina la configuración personalizada de lead times de un show,
        volviendo a usar la configuración global.
        
        Args:
            show_id: ID del show
            user: Usuario que realiza el cambio
            
        Returns:
            Dict con resultado de la operación
        """
        # Obtener el show actual
        stmt = select(Show).where(Show.id == show_id)
        result = await self.db.execute(stmt)
        show = result.scalar_one_or_none()
        
        if not show:
            raise ValueError(f"Show con ID {show_id} no encontrado")
        
        # Guardar valores que se van a eliminar
        previous_values = {
            'access_minutes': show.custom_lead_time_access_minutes,
            'finalized_minutes': show.custom_lead_time_finalized_minutes
        }
        
        # Solo proceder si había configuración personalizada
        if (previous_values['access_minutes'] is None and 
            previous_values['finalized_minutes'] is None):
            return {
                'success': False,
                'message': 'El show ya usa configuración global',
                'show_id': show_id,
                'show_name': show.name
            }
        
        # Limpiar configuración personalizada
        stmt = update(Show).where(Show.id == show_id).values(
            custom_lead_time_access_minutes=None,
            custom_lead_time_finalized_minutes=None,
            updated_at=datetime.now()
        )
        await self.db.execute(stmt)
        await self.db.commit()
        
        # Obtener configuración global que ahora se usará
        global_config = await self.config_service.get_global_config(self.db)
        new_values = {
            'access_minutes': global_config.lead_times.default_lead_time_access_minutes,
            'finalized_minutes': global_config.lead_times.default_lead_time_finalized_minutes
        }
        
        # Registrar en audit log
        await self._log_lead_time_change(
            show_id=show_id,
            show_name=show.name,
            previous_values=previous_values,
            new_values=new_values,
            user=user,
            action_type="REMOVE_CUSTOM_LEAD_TIMES"
        )
        
        return {
            'success': True,
            'show_id': show_id,
            'show_name': show.name,
            'previous_access_minutes': previous_values['access_minutes'],
            'previous_finalized_minutes': previous_values['finalized_minutes'],
            'new_access_minutes': new_values['access_minutes'],
            'new_finalized_minutes': new_values['finalized_minutes'],
            'message': 'Configuración personalizada eliminada, usando valores globales',
            'changed_by': user,
            'changed_at': datetime.now()
        }
    
    async def get_shows_with_custom_lead_times(self) -> List[Dict[str, Any]]:
        """
        Obtiene todos los shows que tienen configuración personalizada de lead times.
        
        Returns:
            Lista de shows con configuración personalizada
        """
        stmt = select(Show).where(
            and_(
                Show.custom_lead_time_access_minutes.is_not(None),
                Show.custom_lead_time_finalized_minutes.is_not(None)
            )
        ).order_by(Show.name)
        
        result = await self.db.execute(stmt)
        shows = result.scalars().all()
        
        return [
            {
                'show_id': show.id,
                'show_name': show.name,
                'access_minutes': show.custom_lead_time_access_minutes,
                'finalized_minutes': show.custom_lead_time_finalized_minutes,
                'is_visible': show.is_visible,
                'updated_at': show.updated_at
            }
            for show in shows
        ]
    
    async def validate_lead_time_impact(
        self, 
        show_id: int, 
        new_access_minutes: int,
        new_finalized_minutes: int
    ) -> Dict[str, Any]:
        """
        Analiza el impacto de cambiar los lead times de un show.
        Útil para mostrar preview antes de aplicar cambios.
        
        Args:
            show_id: ID del show
            new_access_minutes: Nuevos minutos para acceso
            new_finalized_minutes: Nuevos minutos para finalización
            
        Returns:
            Dict con análisis de impacto
        """
        # Validar rangos
        try:
            self._validate_lead_time_ranges(new_access_minutes, new_finalized_minutes)
        except ValueError as e:
            return {
                'valid': False,
                'error': str(e)
            }
        
        # Obtener configuración actual
        stmt = select(Show).where(Show.id == show_id)
        result = await self.db.execute(stmt)
        show = result.scalar_one_or_none()
        
        if not show:
            return {
                'valid': False,
                'error': f'Show con ID {show_id} no encontrado'
            }
        
        current_lead_times = await self.get_effective_lead_times(show)
        
        # Calcular diferencias
        access_diff = new_access_minutes - current_lead_times['access_minutes']
        finalized_diff = new_finalized_minutes - current_lead_times['finalized_minutes']
        
        # Analizar impacto
        impact_analysis = []
        
        if access_diff > 0:
            impact_analysis.append(
                f"Los visitantes podrán acceder {access_diff} minutos MÁS TEMPRANO"
            )
        elif access_diff < 0:
            impact_analysis.append(
                f"Los visitantes podrán acceder {abs(access_diff)} minutos MÁS TARDE"
            )
        
        if finalized_diff != 0:
            impact_analysis.append(
                f"El acceso se cerrará {abs(finalized_diff)} minutos "
                f"{'antes' if finalized_diff > 0 else 'después'} del show"
            )
        
        return {
            'valid': True,
            'show_id': show_id,
            'show_name': show.name,
            'current_access_minutes': current_lead_times['access_minutes'],
            'current_finalized_minutes': current_lead_times['finalized_minutes'],
            'new_access_minutes': new_access_minutes,
            'new_finalized_minutes': new_finalized_minutes,
            'access_change': access_diff,
            'finalized_change': finalized_diff,
            'impact_description': impact_analysis,
            'source_before': current_lead_times['source']
        }
    
    def _validate_lead_time_ranges(
        self, 
        access_minutes: int, 
        finalized_minutes: int
    ) -> None:
        """
        Valida que los lead times estén dentro de los rangos permitidos.
        
        Raises:
            ValueError: Si algún valor está fuera de rango
        """
        if not (self.MIN_ACCESS_MINUTES <= access_minutes <= self.MAX_ACCESS_MINUTES):
            raise ValueError(
                f"Lead time de acceso debe estar entre {self.MIN_ACCESS_MINUTES} "
                f"y {self.MAX_ACCESS_MINUTES} minutos"
            )
        
        if not (self.MIN_FINALIZED_MINUTES <= finalized_minutes <= self.MAX_FINALIZED_MINUTES):
            raise ValueError(
                f"Lead time de finalización debe estar entre {self.MIN_FINALIZED_MINUTES} "
                f"y {self.MAX_FINALIZED_MINUTES} minutos"
            )
        
        # Validación lógica: finalized_minutes debe ser <= access_minutes
        if finalized_minutes > access_minutes:
            raise ValueError(
                "Lead time de finalización no puede ser mayor que el de acceso"
            )
    
    async def _log_lead_time_change(
        self,
        show_id: int,
        show_name: str,
        previous_values: Dict[str, Any],
        new_values: Dict[str, Any],
        user: str,
        action_type: str = "UPDATE_LEAD_TIMES"
    ) -> None:
        """
        Registra cambios de lead times en el audit log.
        
        Args:
            show_id: ID del show modificado
            show_name: Nombre del show (para claridad)
            previous_values: Valores anteriores
            new_values: Nuevos valores
            user: Usuario que realizó el cambio
            action_type: Tipo de acción para el log
        """
        audit_entry = AuditLog(
            entity_type="show_lead_times",
            entity_id=show_id,
            action=action_type,
            user_id=user,
            old_values={
                "show_name": show_name,
                "access_minutes": previous_values.get('access_minutes'),
                "finalized_minutes": previous_values.get('finalized_minutes')
            },
            new_values={
                "show_name": show_name,
                "access_minutes": new_values.get('access_minutes'),
                "finalized_minutes": new_values.get('finalized_minutes')
            }
        )
        
        self.db.add(audit_entry)
        await self.db.commit()