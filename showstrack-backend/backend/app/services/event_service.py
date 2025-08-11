"""
Servicios CRUD para Events
"""
from typing import List, Optional
from datetime import date, datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete
from sqlalchemy.orm import selectinload

from app.models.event import ScheduledEvent
from app.models.override import StatusOverride
from app.models.show import Show
from app.schemas.event import EventCreate, EventUpdate, OverrideRequest


class EventService:
    """Servicio para operaciones CRUD de Events"""
    
    @staticmethod
    async def get_events(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        show_id: Optional[int] = None,
        has_override: Optional[bool] = None
    ) -> tuple[List[ScheduledEvent], int]:
        """Obtener lista de eventos con paginación y filtros"""
        query = select(ScheduledEvent).options(
            selectinload(ScheduledEvent.show),
            selectinload(ScheduledEvent.status_override)
        )
        
        # Filtros
        if date_from:
            query = query.where(ScheduledEvent.event_date >= date_from)
        
        if date_to:
            query = query.where(ScheduledEvent.event_date <= date_to)
        
        if show_id:
            query = query.where(ScheduledEvent.show_id == show_id)
        
        if has_override is not None:
            if has_override:
                query = query.join(StatusOverride).where(StatusOverride.is_active == True)
            else:
                query = query.outerjoin(StatusOverride).where(
                    StatusOverride.id.is_(None)
                )
        
        # Contar total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Obtener datos con paginación
        query = query.order_by(
            ScheduledEvent.event_date.desc(),
            ScheduledEvent.start_time.desc()
        ).offset(skip).limit(limit)
        result = await db.execute(query)
        events = result.scalars().all()
        
        return events, total
    
    @staticmethod
    async def get_event(db: AsyncSession, event_id: int) -> Optional[ScheduledEvent]:
        """Obtener evento por ID"""
        stmt = select(ScheduledEvent).options(
            selectinload(ScheduledEvent.show),
            selectinload(ScheduledEvent.status_override)
        ).where(ScheduledEvent.id == event_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_event_by_external_id(
        db: AsyncSession,
        external_id: str
    ) -> Optional[ScheduledEvent]:
        """Obtener evento por ID externo"""
        stmt = select(ScheduledEvent).options(
            selectinload(ScheduledEvent.show),
            selectinload(ScheduledEvent.status_override)
        ).where(ScheduledEvent.external_event_id == external_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_event(db: AsyncSession, event_data: EventCreate) -> ScheduledEvent:
        """Crear nuevo evento"""
        # Verificar que el show existe
        show_stmt = select(Show).where(Show.id == event_data.show_id)
        show_result = await db.execute(show_stmt)
        show = show_result.scalar_one_or_none()
        
        if not show:
            raise ValueError(f"Show with ID {event_data.show_id} not found")
        
        # Verificar que no existe un evento con el mismo external_event_id
        existing_stmt = select(ScheduledEvent).where(
            ScheduledEvent.external_event_id == event_data.external_event_id
        )
        existing_result = await db.execute(existing_stmt)
        existing_event = existing_result.scalar_one_or_none()
        
        if existing_event:
            raise ValueError(f"Event with external_id {event_data.external_event_id} already exists")
        
        # Crear evento
        event = ScheduledEvent(**event_data.model_dump())
        db.add(event)
        await db.commit()
        await db.refresh(event)
        
        # Cargar relaciones
        return await EventService.get_event(db, event.id)
    
    @staticmethod
    async def update_event(
        db: AsyncSession,
        event_id: int,
        event_data: EventUpdate
    ) -> Optional[ScheduledEvent]:
        """Actualizar evento existente"""
        # Obtener datos a actualizar (solo campos no None)
        update_data = event_data.model_dump(exclude_unset=True)
        
        if not update_data:
            return await EventService.get_event(db, event_id)
        
        # Si se actualiza show_id, verificar que existe
        if "show_id" in update_data:
            show_stmt = select(Show).where(Show.id == update_data["show_id"])
            show_result = await db.execute(show_stmt)
            show = show_result.scalar_one_or_none()
            
            if not show:
                raise ValueError(f"Show with ID {update_data['show_id']} not found")
        
        # Actualizar
        stmt = (
            update(ScheduledEvent)
            .where(ScheduledEvent.id == event_id)
            .values(**update_data)
            .execution_options(synchronize_session="fetch")
        )
        result = await db.execute(stmt)
        
        if result.rowcount == 0:
            return None
        
        await db.commit()
        return await EventService.get_event(db, event_id)
    
    @staticmethod
    async def delete_event(db: AsyncSession, event_id: int) -> bool:
        """Eliminar evento"""
        # Primero eliminar overrides relacionados
        delete_overrides_stmt = delete(StatusOverride).where(
            StatusOverride.scheduled_event_id == event_id
        )
        await db.execute(delete_overrides_stmt)
        
        # Eliminar evento
        stmt = delete(ScheduledEvent).where(ScheduledEvent.id == event_id)
        result = await db.execute(stmt)
        
        if result.rowcount == 0:
            return False
        
        await db.commit()
        return True
    
    @staticmethod
    async def create_override(
        db: AsyncSession,
        event_id: int,
        override_data: OverrideRequest,
        created_by: str
    ) -> Optional[StatusOverride]:
        """Crear override para evento"""
        # Verificar que el evento existe
        event = await EventService.get_event(db, event_id)
        if not event:
            raise ValueError(f"Event with ID {event_id} not found")
        
        # Desactivar override anterior si existe
        deactivate_stmt = (
            update(StatusOverride)
            .where(StatusOverride.scheduled_event_id == event_id)
            .values(is_active=False)
        )
        await db.execute(deactivate_stmt)
        
        # Crear nuevo override
        override = StatusOverride(
            scheduled_event_id=event_id,
            override_status=override_data.status,
            override_reason=override_data.reason,
            created_by=created_by,
            is_active=True
        )
        
        db.add(override)
        await db.commit()
        await db.refresh(override)
        
        return override
    
    @staticmethod
    async def deactivate_override(
        db: AsyncSession,
        event_id: int
    ) -> bool:
        """Desactivar override de evento"""
        stmt = (
            update(StatusOverride)
            .where(StatusOverride.scheduled_event_id == event_id)
            .values(is_active=False)
        )
        result = await db.execute(stmt)
        
        if result.rowcount == 0:
            return False
        
        await db.commit()
        return True
    
    @staticmethod
    async def get_events_by_date_range(
        db: AsyncSession,
        date_from: date,
        date_to: date,
        show_ids: Optional[List[int]] = None
    ) -> List[ScheduledEvent]:
        """Obtener eventos en un rango de fechas"""
        query = select(ScheduledEvent).options(
            selectinload(ScheduledEvent.show),
            selectinload(ScheduledEvent.status_override)
        ).where(
            ScheduledEvent.event_date >= date_from,
            ScheduledEvent.event_date <= date_to
        )
        
        if show_ids:
            query = query.where(ScheduledEvent.show_id.in_(show_ids))
        
        query = query.order_by(
            ScheduledEvent.event_date,
            ScheduledEvent.start_time
        )
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def calculate_event_status(event: ScheduledEvent, db: AsyncSession = None) -> str:
        """
        Calcular estado del evento usando el motor de estados completo.
        
        Implementa el algoritmo de 5 pasos definido en business-rules.md:
        1. Verificación de overrides activos (prioridad máxima)
        2. Resolución de lead times (show específico > global)  
        3. Cálculo de ventanas temporales
        4. Determinación de estado por hora actual
        5. Aplicación de casos especiales
        
        Args:
            event: Evento programado con show y override precargados
            db: Sesión de base de datos (requerida para consultas adicionales)
            
        Returns:
            Estado calculado: PROGRAMADO, ABIERTO, CERRADO, CANCELADO
        """
        # Si no se proporciona db session, usar lógica básica como fallback
        if db is None:
            # Lógica de fallback sin StateEngine (compatibilidad)
            if event.status_override and event.status_override.is_active:
                return event.status_override.override_status
            
            now = datetime.now()
            event_datetime = datetime.combine(event.event_date, event.start_time)
            
            # Implementar lead time básico (30 minutos por defecto)
            access_start = event_datetime - timedelta(minutes=30)
            
            if now < access_start:
                return "PROGRAMADO"
            elif now < event_datetime:
                return "ABIERTO" 
            else:
                return "CERRADO"
        
        # Usar StateEngine completo cuando hay session de DB disponible
        from app.services.state_engine import StateEngine
        
        state_engine = StateEngine(db)
        return await state_engine.calculate_event_state(event)