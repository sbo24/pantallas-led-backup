"""
Servicios CRUD para Shows
"""
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete
from sqlalchemy.orm import selectinload

from app.models.show import Show
from app.models.event import ScheduledEvent
from app.schemas.show import ShowCreate, ShowUpdate


class ShowService:
    """Servicio para operaciones CRUD de Shows"""
    
    @staticmethod
    async def get_shows(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        visible_only: bool = False,
        search: Optional[str] = None
    ) -> tuple[List[Show], int]:
        """Obtener lista de shows con paginación"""
        query = select(Show)
        
        # Filtros
        if visible_only:
            query = query.where(Show.is_visible == True)
        
        if search:
            query = query.where(Show.name.ilike(f"%{search}%"))
        
        # Contar total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Obtener datos con paginación
        query = query.order_by(Show.display_order, Show.id).offset(skip).limit(limit)
        result = await db.execute(query)
        shows = result.scalars().all()
        
        return shows, total
    
    @staticmethod
    async def get_show(db: AsyncSession, show_id: int) -> Optional[Show]:
        """Obtener show por ID"""
        stmt = select(Show).where(Show.id == show_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_show_with_events(db: AsyncSession, show_id: int) -> Optional[Show]:
        """Obtener show con eventos relacionados"""
        stmt = select(Show).options(
            selectinload(Show.scheduled_events)
        ).where(Show.id == show_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_show(db: AsyncSession, show_data: ShowCreate) -> Show:
        """Crear nuevo show"""
        show = Show(**show_data.model_dump())
        db.add(show)
        await db.commit()
        await db.refresh(show)
        return show
    
    @staticmethod
    async def update_show(
        db: AsyncSession,
        show_id: int,
        show_data: ShowUpdate
    ) -> Optional[Show]:
        """Actualizar show existente"""
        # Obtener datos a actualizar (solo campos no None)
        update_data = show_data.model_dump(exclude_unset=True)
        
        if not update_data:
            # Si no hay datos para actualizar, retornar el show actual
            return await ShowService.get_show(db, show_id)
        
        # Actualizar
        stmt = (
            update(Show)
            .where(Show.id == show_id)
            .values(**update_data)
            .execution_options(synchronize_session="fetch")
        )
        result = await db.execute(stmt)
        
        if result.rowcount == 0:
            return None
        
        await db.commit()
        return await ShowService.get_show(db, show_id)
    
    @staticmethod
    async def delete_show(db: AsyncSession, show_id: int) -> bool:
        """Eliminar show"""
        # Verificar si tiene eventos relacionados
        stmt = select(func.count()).select_from(ScheduledEvent).where(
            ScheduledEvent.show_id == show_id
        )
        result = await db.execute(stmt)
        event_count = result.scalar()
        
        if event_count > 0:
            raise ValueError("Cannot delete show with existing events")
        
        # Eliminar show
        stmt = delete(Show).where(Show.id == show_id)
        result = await db.execute(stmt)
        
        if result.rowcount == 0:
            return False
        
        await db.commit()
        return True
    
    @staticmethod
    async def get_show_by_name(db: AsyncSession, name: str) -> Optional[Show]:
        """Obtener show por nombre"""
        stmt = select(Show).where(Show.name == name)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_shows_with_event_count(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[List[dict], int]:
        """Obtener shows con cantidad de eventos"""
        # Query para obtener shows con conteo de eventos
        query = (
            select(
                Show,
                func.count(ScheduledEvent.id).label("current_events_count")
            )
            .outerjoin(ScheduledEvent)
            .group_by(Show.id)
        )
        
        # Contar total
        count_query = select(func.count()).select_from(
            select(Show.id).subquery()
        )
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Obtener datos con paginación
        query = query.order_by(Show.display_order, Show.id).offset(skip).limit(limit)
        result = await db.execute(query)
        
        # Convertir a lista de diccionarios
        shows_with_count = []
        for row in result:
            show_dict = {
                "id": row.Show.id,
                "name": row.Show.name,
                "description": row.Show.description,
                "duration_estimated": row.Show.duration_estimated,
                "is_visible": row.Show.is_visible,
                "display_order": row.Show.display_order,
                "custom_lead_time_access_minutes": row.Show.custom_lead_time_access_minutes,
                "custom_lead_time_finalized_minutes": row.Show.custom_lead_time_finalized_minutes,
                "created_at": row.Show.created_at,
                "updated_at": row.Show.updated_at,
                "current_events_count": row.current_events_count
            }
            shows_with_count.append(show_dict)
        
        return shows_with_count, total