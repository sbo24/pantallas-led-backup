"""
Servicio para importación y sincronización de datos externos.
Compatible con el formato JSON generado por scripts/extraction/
"""
import uuid
from datetime import datetime, time, date
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload

from ..models.import_sync import ImportHistory, PendingChanges, SyncOperations, ImportStatus, ChangeAction, EntityType
from ..models.show import Show
from ..models.event import ScheduledEvent
from ..models.override import StatusOverride
from ..models.settings import GlobalSettings
from ..models.audit import AuditLog
from ..schemas.import_sync import (
    PuyDuFouImportData, ImportValidationResult, ImportResponse, 
    ImportHistoryResponse, ImportHistoryItem, SyncStatus, SyncPendingResponse,
    PendingChange, SyncExecuteResponse, SyncActionResponse
)
from ..services.config_service import ConfigService


class ImportService:
    """Servicio para gestión de importación y sincronización de datos externos"""
    
    @staticmethod
    async def process_import(
        db: AsyncSession, 
        import_data: PuyDuFouImportData, 
        dry_run: bool = False,
        preserve_overrides: bool = True,
        user_id: str = "system"
    ) -> ImportResponse:
        """
        Procesa una importación completa de datos desde el script de extracción.
        
        Args:
            db: Sesión de base de datos
            import_data: Datos del script de extracción (formato exacto)
            dry_run: Solo validar, no aplicar cambios
            preserve_overrides: Preservar overrides manuales existentes
            user_id: Usuario que ejecuta la importación
            
        Returns:
            ImportResponse: Resultado de la importación
        """
        start_time = datetime.now()
        
        # 1. Validar datos de entrada
        validation_result = await ImportService._validate_import_data(db, import_data)
        
        if not validation_result.is_valid and not dry_run:
            # Crear registro de importación fallida
            import_history = await ImportService._create_import_history(
                db, import_data, ImportStatus.FAILED, validation_result, 
                user_id, applied=False
            )
            return ImportResponse(
                import_id=import_history.id,
                status="failed",
                message=f"Validación fallida: {', '.join(validation_result.errors)}",
                validation_result=validation_result,
                processed_at=datetime.now(),
                applied=False,
                execution_time_seconds=(datetime.now() - start_time).total_seconds()
            )
        
        # 2. Determinar modo de operación
        config_service = ConfigService(db)
        operation_mode = await config_service.get_operation_mode()
        should_apply_immediately = (operation_mode.current_mode == "automatic" and not dry_run)
        
        # 3. Procesar eventos
        if should_apply_immediately:
            # Modo automático: aplicar cambios inmediatamente
            applied_result = await ImportService._apply_changes_immediate(
                db, import_data, validation_result, preserve_overrides, user_id
            )
            final_status = "success" if applied_result["success"] else "partial"
        else:
            # Modo manual o dry_run: crear cambios pendientes
            pending_result = await ImportService._create_pending_changes(
                db, import_data, validation_result, user_id
            )
            applied_result = pending_result
            final_status = "success" if pending_result["success"] else "partial"
        
        # 4. Crear registro de importación
        import_status = ImportStatus.SUCCESS if final_status == "success" else ImportStatus.PARTIAL
        import_history = await ImportService._create_import_history(
            db, import_data, import_status, validation_result, 
            user_id, applied=should_apply_immediately
        )
        
        execution_time = (datetime.now() - start_time).total_seconds()
        
        return ImportResponse(
            import_id=import_history.id,
            status=final_status,
            message=applied_result["message"],
            validation_result=validation_result,
            processed_at=datetime.now(),
            applied=should_apply_immediately,
            execution_time_seconds=execution_time
        )
    
    @staticmethod
    async def _validate_import_data(
        db: AsyncSession, 
        import_data: PuyDuFouImportData
    ) -> ImportValidationResult:
        """Valida los datos de importación y detecta conflictos"""
        
        errors = []
        warnings = []
        conflicts = []
        new_events = 0
        updated_events = 0
        conflicted_events = 0
        
        # Validar metadatos básicos
        if not import_data.metadata.source:
            errors.append("Fuente de datos requerida")
        
        if not import_data.events:
            errors.append("Lista de eventos no puede estar vacía")
            return ImportValidationResult(
                is_valid=False,
                total_events=0,
                new_events=0,
                updated_events=0,
                conflicted_events=0,
                conflicts=conflicts,
                warnings=warnings,
                errors=errors
            )
        
        # Obtener shows existentes
        shows_query = select(Show)
        existing_shows = {show.name: show for show in (await db.execute(shows_query)).scalars().all()}
        
        # Obtener eventos existentes por external_event_id
        external_ids = [event.external_event_id for event in import_data.events]
        events_query = select(ScheduledEvent).where(ScheduledEvent.external_event_id.in_(external_ids))
        existing_events = {event.external_event_id: event for event in (await db.execute(events_query)).scalars().all()}
        
        # Obtener overrides activos
        overrides_query = select(StatusOverride).where(
            and_(StatusOverride.is_active == True, StatusOverride.scheduled_event_id.in_([e.id for e in existing_events.values()]))
        )
        active_overrides = {override.scheduled_event_id: override for override in (await db.execute(overrides_query)).scalars().all()}
        
        # Validar cada evento
        for event_data in import_data.events:
            try:
                # Validar formato de fecha y hora
                event_date = datetime.strptime(event_data.event_date, '%Y-%m-%d').date()
                start_time = datetime.strptime(event_data.start_time, '%H:%M').time()
                end_time = datetime.strptime(event_data.end_time, '%H:%M').time()
                
                # Determinar si es nuevo o actualización
                existing_event = existing_events.get(event_data.external_event_id)
                
                if existing_event:
                    # Evento existente - verificar cambios
                    updated_events += 1
                    
                    # Verificar si tiene override activo
                    if existing_event.id in active_overrides:
                        conflicts.append({
                            "external_event_id": event_data.external_event_id,
                            "type": "override_conflict",
                            "message": f"Evento tiene override manual activo: {active_overrides[existing_event.id].override_reason}",
                            "current_status": active_overrides[existing_event.id].override_status,
                            "show_name": event_data.show_name
                        })
                        conflicted_events += 1
                    
                    # Verificar cambios significativos
                    if (existing_event.event_date != event_date or 
                        existing_event.start_time != start_time or
                        existing_event.end_time != end_time):
                        warnings.append(f"Cambios detectados en evento existente: {event_data.show_name} - {event_data.event_date}")
                        
                else:
                    # Evento nuevo
                    new_events += 1
                    
                    # Verificar si el show existe
                    if event_data.show_name not in existing_shows:
                        warnings.append(f"Show no existe, se creará automáticamente: {event_data.show_name}")
                
            except ValueError as e:
                errors.append(f"Error en formato de fecha/hora para evento {event_data.external_event_id}: {str(e)}")
        
        is_valid = len(errors) == 0
        
        return ImportValidationResult(
            is_valid=is_valid,
            total_events=len(import_data.events),
            new_events=new_events,
            updated_events=updated_events,
            conflicted_events=conflicted_events,
            conflicts=conflicts,
            warnings=warnings,
            errors=errors
        )
    
    @staticmethod
    async def _apply_changes_immediate(
        db: AsyncSession,
        import_data: PuyDuFouImportData,
        validation_result: ImportValidationResult,
        preserve_overrides: bool,
        user_id: str
    ) -> Dict[str, Any]:
        """Aplica cambios inmediatamente en modo automático"""
        
        applied_count = 0
        failed_count = 0
        skipped_count = 0
        
        try:
            # Obtener shows existentes
            shows_query = select(Show)
            existing_shows = {show.name: show for show in (await db.execute(shows_query)).scalars().all()}
            
            # Obtener eventos existentes
            external_ids = [event.external_event_id for event in import_data.events]
            events_query = select(ScheduledEvent).where(ScheduledEvent.external_event_id.in_(external_ids))
            existing_events = {event.external_event_id: event for event in (await db.execute(events_query)).scalars().all()}
            
            # Procesar cada evento
            for event_data in import_data.events:
                try:
                    # Convertir formatos
                    event_date = datetime.strptime(event_data.event_date, '%Y-%m-%d').date()
                    start_time = datetime.strptime(event_data.start_time, '%H:%M').time()
                    end_time = datetime.strptime(event_data.end_time, '%H:%M').time()
                    
                    # Crear show si no existe
                    show = existing_shows.get(event_data.show_name)
                    if not show:
                        show = Show(
                            name=event_data.show_name,
                            description=f"Show importado automáticamente desde {import_data.metadata.source}",
                            venue="Por determinar",
                            duration_minutes=event_data.duration_minutes,
                            capacity=100,  # Valor por defecto
                            min_age=0,
                            accessibility_info="Por determinar",
                            show_type=event_data.event_type.upper(),
                            is_visible=True
                        )
                        db.add(show)
                        await db.flush()  # Para obtener el ID
                        existing_shows[event_data.show_name] = show
                    
                    # Crear o actualizar evento
                    existing_event = existing_events.get(event_data.external_event_id) 
                    
                    if existing_event:
                        # Verificar si tiene override activo y preserve_overrides está habilitado
                        if preserve_overrides:
                            override_query = select(StatusOverride).where(
                                and_(
                                    StatusOverride.scheduled_event_id == existing_event.id,
                                    StatusOverride.is_active == True
                                )
                            )
                            has_active_override = (await db.execute(override_query)).scalar_one_or_none()
                            
                            if has_active_override:
                                skipped_count += 1
                                continue
                        
                        # Actualizar evento existente
                        existing_event.show_id = show.id
                        existing_event.event_date = event_date
                        existing_event.start_time = start_time
                        existing_event.end_time = end_time
                        existing_event.duration_minutes = event_data.duration_minutes
                        existing_event.updated_at = datetime.now()
                        
                    else:
                        # Crear nuevo evento
                        new_event = ScheduledEvent(
                            external_event_id=event_data.external_event_id,
                            show_id=show.id,
                            event_date=event_date,
                            start_time=start_time,
                            end_time=end_time,
                            duration_minutes=event_data.duration_minutes,
                            is_multiple_shows_flag=False
                        )
                        db.add(new_event)
                    
                    applied_count += 1
                    
                except Exception as e:
                    failed_count += 1
                    # Log del error pero continuar con el siguiente evento
                    continue
            
            await db.commit()
            
            return {
                "success": failed_count == 0,
                "applied_count": applied_count,
                "failed_count": failed_count,
                "skipped_count": skipped_count,
                "message": f"Aplicados {applied_count} cambios, {failed_count} fallaron, {skipped_count} omitidos"
            }
            
        except Exception as e:
            await db.rollback()
            return {
                "success": False,
                "applied_count": 0,
                "failed_count": len(import_data.events),
                "skipped_count": 0,
                "message": f"Error en aplicación de cambios: {str(e)}"
            }
    
    @staticmethod
    async def _create_pending_changes(
        db: AsyncSession,
        import_data: PuyDuFouImportData,
        validation_result: ImportValidationResult,
        user_id: str
    ) -> Dict[str, Any]:
        """Crea cambios pendientes para modo manual"""
        
        created_count = 0
        
        try:
            # Obtener eventos existentes con sus shows
            external_ids = [event.external_event_id for event in import_data.events]
            events_query = select(ScheduledEvent).options(selectinload(ScheduledEvent.show)).where(ScheduledEvent.external_event_id.in_(external_ids))
            existing_events = {event.external_event_id: event for event in (await db.execute(events_query)).scalars().all()}
            
            for event_data in import_data.events:
                existing_event = existing_events.get(event_data.external_event_id)
                
                # Determinar acción
                if existing_event:
                    action = ChangeAction.UPDATE
                    entity_id = existing_event.id
                    current_data = {
                        "show_name": existing_event.show.name if existing_event.show else None,
                        "event_date": existing_event.event_date.isoformat() if existing_event.event_date else None,
                        "start_time": existing_event.start_time.strftime('%H:%M') if existing_event.start_time else None,
                        "end_time": existing_event.end_time.strftime('%H:%M') if existing_event.end_time else None,
                        "duration_minutes": existing_event.duration_minutes
                    }
                else:
                    action = ChangeAction.CREATE
                    entity_id = None
                    current_data = None
                
                # Crear cambio pendiente
                pending_change = PendingChanges(
                    change_id=str(uuid.uuid4()),
                    entity_type=EntityType.EVENT,
                    entity_id=entity_id,
                    external_id=event_data.external_event_id,
                    action=action,
                    current_data=current_data,
                    new_data={
                        "show_name": event_data.show_name,
                        "event_date": event_data.event_date,
                        "start_time": event_data.start_time,
                        "end_time": event_data.end_time,
                        "duration_minutes": event_data.duration_minutes,
                        "event_type": event_data.event_type
                    },
                    import_source=import_data.metadata.source,
                    import_timestamp=datetime.fromisoformat(import_data.metadata.extraction_time.replace('Z', '+00:00')).replace(tzinfo=None)
                )
                
                db.add(pending_change)
                created_count += 1
            
            await db.commit()
            
            return {
                "success": True,
                "created_count": created_count,
                "message": f"Creados {created_count} cambios pendientes para revisión"
            }
            
        except Exception as e:
            await db.rollback()
            return {
                "success": False,
                "created_count": 0,
                "message": f"Error creando cambios pendientes: {str(e)}"
            }
    
    @staticmethod
    async def _create_import_history(
        db: AsyncSession,
        import_data: PuyDuFouImportData,
        status: ImportStatus,
        validation_result: ImportValidationResult,
        user_id: str,
        applied: bool = True
    ) -> ImportHistory:
        """Crea registro en el historial de importaciones"""
        
        import_history = ImportHistory(
            source=import_data.metadata.source,
            import_timestamp=datetime.fromisoformat(import_data.metadata.extraction_time.replace('Z', '+00:00')).replace(tzinfo=None),
            status=status,
            applied=applied,
            total_events=validation_result.total_events,
            new_events=validation_result.new_events,
            updated_events=validation_result.updated_events,
            conflicted_events=validation_result.conflicted_events,
            skipped_events=validation_result.skipped_events,
            import_metadata=import_data.metadata.dict(),
            validation_result=validation_result.dict(),
            created_by=user_id
        )
        
        db.add(import_history)
        await db.commit()
        
        return import_history
    
    @staticmethod
    async def get_import_history(
        db: AsyncSession,
        page: int = 1,
        size: int = 20,
        source: Optional[str] = None
    ) -> ImportHistoryResponse:
        """Obtiene el historial de importaciones"""
        
        offset = (page - 1) * size
        
        query = select(ImportHistory)
        
        if source:
            query = query.where(ImportHistory.source == source)
        
        query = query.order_by(ImportHistory.processed_at.desc())
        
        # Contar total
        count_query = select(func.count(ImportHistory.id))
        if source:
            count_query = count_query.where(ImportHistory.source == source)
        
        total = (await db.execute(count_query)).scalar_one()
        
        # Obtener registros paginados
        paginated_query = query.offset(offset).limit(size)
        imports = (await db.execute(paginated_query)).scalars().all()
        
        # Convertir a response items
        items = []
        for imp in imports:
            # Extraer date_range de metadata si existe
            date_range = []
            if imp.import_metadata and 'date_range' in imp.import_metadata:
                date_range = imp.import_metadata['date_range']
            
            items.append(ImportHistoryItem(
                id=imp.id,
                source=imp.source,
                import_timestamp=imp.import_timestamp,
                processed_at=imp.processed_at,
                status=imp.status.value,
                total_events=imp.total_events,
                new_events=imp.new_events,
                updated_events=imp.updated_events,
                applied=imp.applied,
                import_metadata=imp.import_metadata or {},
                date_range=date_range
            ))
        
        pages = (total + size - 1) // size
        
        return ImportHistoryResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=pages
        )