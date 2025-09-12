"""
Servicio para operaciones de sincronización en modo manual.
Maneja cambios pendientes, aplicación y descarte de cambios.
"""
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from sqlalchemy.orm import selectinload

from ..models.import_sync import PendingChanges, SyncOperations, ImportStatus, ChangeAction, EntityType
from ..models.show import Show
from ..models.event import ScheduledEvent
from ..models.override import StatusOverride
from ..schemas.import_sync import (
    SyncStatus, SyncPendingResponse, PendingChange, 
    SyncExecuteResponse, SyncActionResponse
)
from ..services.config_service import ConfigService


class SyncService:
    """Servicio para gestión de sincronización de cambios pendientes"""
    
    @staticmethod
    async def get_sync_status(db: AsyncSession) -> SyncStatus:
        """Obtiene el estado actual de sincronización del sistema"""
        
        # Obtener modo de operación
        config_service = ConfigService(db)
        operation_mode = await config_service.get_operation_mode()
        
        # Contar cambios pendientes
        pending_query = select(func.count(PendingChanges.id)).where(
            PendingChanges.is_applied == False
        )
        pending_count = (await db.execute(pending_query)).scalar_one()
        
        # Obtener fechas relevantes
        last_import_query = select(func.max(PendingChanges.import_timestamp))
        last_import = (await db.execute(last_import_query)).scalar_one()
        
        last_sync_query = select(func.max(SyncOperations.executed_at))
        last_sync = (await db.execute(last_sync_query)).scalar_one()
        
        # Cambio pendiente más antiguo
        oldest_change_query = select(func.min(PendingChanges.created_at)).where(
            PendingChanges.is_applied == False
        )
        pending_since = (await db.execute(oldest_change_query)).scalar_one()
        
        return SyncStatus(
            operation_mode=operation_mode.current_mode,
            has_pending_changes=pending_count > 0,
            pending_changes_count=pending_count,
            last_import=last_import,
            last_sync=last_sync,
            pending_since=pending_since,
            system_healthy=True  # TODO: Implementar chequeos de salud más avanzados
        )
    
    @staticmethod
    async def get_pending_changes(
        db: AsyncSession,
        limit: int = 100,
        source: Optional[str] = None,
        entity_type: Optional[str] = None
    ) -> SyncPendingResponse:
        """Obtiene cambios pendientes de aplicar"""
        
        query = select(PendingChanges).where(PendingChanges.is_applied == False)
        
        if source:
            query = query.where(PendingChanges.import_source == source)
        
        if entity_type:
            query = query.where(PendingChanges.entity_type == EntityType(entity_type))
        
        query = query.order_by(PendingChanges.created_at.asc()).limit(limit)
        
        pending_changes_db = (await db.execute(query)).scalars().all()
        
        # Convertir a schema
        pending_changes = []
        for change in pending_changes_db:
            pending_changes.append(PendingChange(
                change_id=change.change_id,
                entity_type=change.entity_type.value,
                entity_id=change.entity_id,
                external_id=change.external_id,
                action=change.action.value,
                current_data=change.current_data,
                new_data=change.new_data,
                import_source=change.import_source,
                import_timestamp=change.import_timestamp,
                conflict_reason=change.conflict_reason
            ))
        
        # Estadísticas agrupadas
        grouped_by_source = {}
        grouped_by_action = {}
        oldest_change = None
        
        for change in pending_changes_db:
            # Por fuente
            source_key = change.import_source
            grouped_by_source[source_key] = grouped_by_source.get(source_key, 0) + 1
            
            # Por acción
            action_key = change.action.value
            grouped_by_action[action_key] = grouped_by_action.get(action_key, 0) + 1
            
            # Más antiguo
            if oldest_change is None or change.created_at < oldest_change:
                oldest_change = change.created_at
        
        return SyncPendingResponse(
            pending_changes=pending_changes,
            total=len(pending_changes),
            grouped_by_source=grouped_by_source,
            grouped_by_action=grouped_by_action,
            oldest_change=oldest_change
        )
    
    @staticmethod
    async def execute_sync(
        db: AsyncSession,
        force: bool = False,
        change_ids: Optional[List[str]] = None,
        reason: Optional[str] = None,
        user_id: str = "system"
    ) -> SyncExecuteResponse:
        """Ejecuta sincronización completa de cambios pendientes"""
        
        start_time = datetime.now()
        sync_id = str(uuid.uuid4())
        
        try:
            # Construir query de cambios a procesar
            query = select(PendingChanges).where(PendingChanges.is_applied == False)
            
            if change_ids:
                query = query.where(PendingChanges.change_id.in_(change_ids))
            
            changes_to_process = (await db.execute(query)).scalars().all()
            
            if not changes_to_process:
                return SyncExecuteResponse(
                    sync_id=sync_id,
                    status="success",
                    message="No hay cambios pendientes para procesar",
                    changes_applied=0,
                    changes_failed=0,
                    changes_skipped=0,
                    execution_time_seconds=0,
                    executed_at=datetime.now()
                )
            
            # Procesar cambios uno por uno con manejo de transacciones
            applied_count = 0
            failed_count = 0
            skipped_count = 0
            
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"🔥 SYNC: Procesando {len(changes_to_process)} cambios pendientes")
            
            # Récupérer tous les shows une seule fois avant la boucle
            try:
                shows_query = select(Show)
                all_shows = (await db.execute(shows_query)).scalars().all()
                show_name_to_id = {show.name: show.id for show in all_shows}
                logger.error(f"🔥 SHOWS LOADED: {len(show_name_to_id)} shows found")
            except Exception as e:
                logger.error(f"🔥 ERROR LOADING SHOWS: {e}")
                show_name_to_id = {}
            
            # AUTO-NETTOYAGE: Détecter et marquer comme appliqués tous les doublons AVANT la boucle
            auto_cleaned = 0
            for change in changes_to_process:
                if change.external_id:
                    # Vérifier si l'external_event_id existe déjà
                    existing_query = select(ScheduledEvent).where(
                        ScheduledEvent.external_event_id == change.external_id
                    )
                    existing_event = (await db.execute(existing_query)).scalar_one_or_none()
                    if existing_event:
                        # Marquer comme appliqué (auto-nettoyage)
                        change.is_applied = True
                        change.applied_at = datetime.now()
                        change.applied_by = user_id
                        change.resolution_notes = f"AUTO-NETTOYÉ: Événement déjà existant (ID: {existing_event.id})"
                        auto_cleaned += 1
            
            if auto_cleaned > 0:
                await db.commit()
                logger.error(f"🔥 AUTO-CLEANED: {auto_cleaned} doublons détectés et nettoyés")
                # Recharger les changements non appliqués
                query = select(PendingChanges).where(PendingChanges.is_applied == False)
                if change_ids:
                    query = query.where(PendingChanges.change_id.in_(change_ids))
                changes_to_process = (await db.execute(query)).scalars().all()
                applied_count += auto_cleaned
            
            for i, change in enumerate(changes_to_process):
                try:
                    logger.error(f"🔥 SYNC [{i+1}/{len(changes_to_process)}]: change_id={change.change_id}, external_id={change.external_id}")
                    if change.new_data:
                        show_name = change.new_data.get('show_name', 'Unknown')
                        event_start_time = change.new_data.get('start_time', 'Unknown')
                        logger.error(f"🔥 SYNC [{i+1}]: Show='{show_name}', Start={event_start_time}")
                    # Verificar conflictos si no es force
                    if not force and change.conflict_reason:
                        skipped_count += 1
                        continue
                    
                    # Verificar si el evento ya existe (solo por show+fecha+hora, NO por external_id)
                    if change.action == ChangeAction.CREATE and change.entity_type == EntityType.EVENT:
                        show_name = change.new_data.get("show_name")
                        if show_name:
                            show_query = select(Show).where(Show.name == show_name)
                            show = (await db.execute(show_query)).scalar_one_or_none()
                            if show:
                                event_date = datetime.strptime(change.new_data["event_date"], '%Y-%m-%d').date()
                                start_time_str = change.new_data["start_time"]
                                try:
                                    event_start_time = datetime.strptime(start_time_str, '%H:%M:%S').time()
                                except ValueError:
                                    event_start_time = datetime.strptime(start_time_str, '%H:%M').time()
                                
                                duplicate_query = select(ScheduledEvent).where(
                                    ScheduledEvent.show_id == show.id,
                                    ScheduledEvent.event_date == event_date,
                                    ScheduledEvent.start_time == event_start_time
                                )
                                existing_event = (await db.execute(duplicate_query)).scalar_one_or_none()
                                
                                if existing_event:
                                    # AUTO-LIMPIAR: Marcar como aplicado el duplicado detectado
                                    change.is_applied = True
                                    change.applied_at = datetime.now()
                                    change.applied_by = user_id
                                    change.resolution_notes = f"AUTO-LIMPIADO: Evento duplicado ya existe (ID: {existing_event.id})"
                                    applied_count += 1  # Contar como aplicado, no como omitido
                                    await db.commit()
                                    continue
                    
                    # Verificar si el show ya existe
                    if change.action == ChangeAction.CREATE and change.entity_type == EntityType.SHOW:
                        show_name = change.new_data.get("show_name") or change.new_data.get("name")
                        if show_name:
                            existing_show_query = select(Show).where(Show.name == show_name)
                            existing_show = (await db.execute(existing_show_query)).scalar_one_or_none()
                            if existing_show:
                                # AUTO-LIMPIAR: Marcar como aplicado el show duplicado
                                change.is_applied = True
                                change.applied_at = datetime.now()
                                change.applied_by = user_id
                                change.resolution_notes = f"AUTO-LIMPIADO: Show duplicado ya existe (ID: {existing_show.id})"
                                applied_count += 1  # Contar como aplicado, no como omitido
                                await db.commit()
                                continue
                    
                    if change.action == ChangeAction.CREATE:
                        logger.error(f"🔥 CALLING CREATE for {show_name}")
                        success = await SyncService._apply_create_change(db, change)
                    elif change.action == ChangeAction.UPDATE:
                        logger.error(f"🔥 CALLING UPDATE for {show_name}")
                        success = await SyncService._apply_update_change(db, change, show_name_to_id)
                    elif change.action == ChangeAction.DELETE:
                        logger.error(f"🔥 CALLING DELETE for {show_name}")
                        success = await SyncService._apply_delete_change(db, change)
                    else:
                        logger.error(f"🔥 UNKNOWN ACTION: {change.action}")
                        success = False
                    
                    if success:
                        # Marcar como aplicado
                        change.is_applied = True
                        change.applied_at = datetime.now()
                        change.applied_by = user_id
                        applied_count += 1
                        logger.error(f"🔥 ✅ SYNC [{i+1}]: SUCCESS - Applied change for {show_name}")
                        # Commit individual para evitar rollback masivo
                        await db.commit()
                    else:
                        failed_count += 1
                        logger.error(f"❌ SYNC [{i+1}]: FAILED - Could not apply change for {show_name}")
                        # Rollback solo este cambio, no afecta los anteriores
                        await db.rollback()
                        
                except Exception as e:
                    # Détecter les erreurs de contrainte unique et auto-nettoyer
                    error_str = str(e)
                    if 'unique constraint' in error_str and 'external_event_id' in error_str:
                        # AUTO-NETTOYAGE: Marquer comme appliqué car l'événement existe déjà
                        change.is_applied = True
                        change.applied_at = datetime.now()
                        change.applied_by = user_id
                        change.resolution_notes = f"AUTO-NETTOYÉ: Événement déjà existant (contrainte unique)"
                        applied_count += 1
                        logger.error(f"🔥 ✅ SYNC [{i+1}]: AUTO-CLEANED - Event already exists for {show_name}")
                        await db.commit()
                    else:
                        failed_count += 1
                        logger.error(f"🚨 SYNC [{i+1}]: EXCEPTION - {str(e)}")
                        await db.rollback()
                    continue
            
            # Crear registro de operación
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            
            sync_operation = SyncOperations(
                sync_id=sync_id,
                operation_type="execute",
                status=ImportStatus.SUCCESS if failed_count == 0 else ImportStatus.PARTIAL,
                changes_processed=len(changes_to_process),
                changes_applied=applied_count,
                changes_failed=failed_count,
                changes_skipped=skipped_count,
                execution_time_seconds=int(execution_time),
                request_data={
                    "force": force,
                    "change_ids": change_ids,
                    "reason": reason
                },
                executed_by=user_id
            )
            
            db.add(sync_operation)
            await db.commit()
            
            status = "success" if failed_count == 0 else ("partial" if applied_count > 0 else "failed")
            
            return SyncExecuteResponse(
                sync_id=sync_id,
                status=status,
                message=f"Sincronización completada: {applied_count} aplicados, {failed_count} fallaron, {skipped_count} omitidos",
                changes_applied=applied_count,
                changes_failed=failed_count,
                changes_skipped=skipped_count,
                execution_time_seconds=float(execution_time),
                executed_at=datetime.now()
            )
            
        except Exception as e:
            await db.rollback()
            
            # Crear registro de operación fallida en nueva transacción
            try:
                sync_operation = SyncOperations(
                    sync_id=sync_id,
                    operation_type="execute",
                    status=ImportStatus.FAILED,
                    error_details=str(e),
                    executed_by=user_id
                )
                db.add(sync_operation)
                await db.commit()
            except:
                pass
            
            # Calcular tiempo de ejecución
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            
            return SyncExecuteResponse(
                sync_id=sync_id,
                status="failed",
                message=f"Error en sincronización: {str(e)}",
                changes_applied=0,
                changes_failed=len(change_ids) if change_ids else 0,
                changes_skipped=0,
                execution_time_seconds=float(execution_time),
                executed_at=datetime.now()
            )
    
    @staticmethod
    async def apply_changes(
        db: AsyncSession,
        change_ids: List[str],
        reason: Optional[str] = None,
        user_id: str = "system"
    ) -> SyncActionResponse:
        """Aplica cambios específicos seleccionados"""
        
        start_time = datetime.now()
        
        try:
            # Obtener cambios a aplicar
            query = select(PendingChanges).where(
                and_(
                    PendingChanges.change_id.in_(change_ids),
                    PendingChanges.is_applied == False
                )
            )
            changes_to_apply = (await db.execute(query)).scalars().all()
            
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"🔥 APPLY_CHANGES: Processing {len(changes_to_apply)} selected changes")
            
            applied_count = 0
            auto_cleaned = 0
            
            # AUTO-CLEANUP: Detect and mark duplicates as applied BEFORE processing
            # IMPORTANT: Only auto-clean the SELECTED changes, not all duplicates in database
            for change in changes_to_apply:
                try:
                    # Check if event already exists by external_event_id
                    if change.external_id and change.entity_type == EntityType.EVENT:
                        existing_query = select(ScheduledEvent).where(
                            ScheduledEvent.external_event_id == change.external_id
                        )
                        existing_event = (await db.execute(existing_query)).scalar_one_or_none()
                        if existing_event:
                            # Mark THIS SPECIFIC CHANGE as applied (auto-cleanup)
                            change.is_applied = True
                            change.applied_at = datetime.now()
                            change.applied_by = user_id
                            change.resolution_notes = f"AUTO-CLEANED: Event already exists (ID: {existing_event.id})"
                            applied_count += 1
                            auto_cleaned += 1
                            logger.error(f"🔥 APPLY_CHANGES: Auto-cleaned duplicate event {change.external_id}")
                            continue
                    
                    # Check for duplicate events by show+date+time (CREATE only)
                    if change.action == ChangeAction.CREATE and change.entity_type == EntityType.EVENT:
                        show_name = change.new_data.get("show_name")
                        if show_name:
                            show_query = select(Show).where(Show.name == show_name)
                            show = (await db.execute(show_query)).scalar_one_or_none()
                            if show:
                                event_date = datetime.strptime(change.new_data["event_date"], '%Y-%m-%d').date()
                                start_time_str = change.new_data["start_time"]
                                try:
                                    event_start_time = datetime.strptime(start_time_str, '%H:%M:%S').time()
                                except ValueError:
                                    event_start_time = datetime.strptime(start_time_str, '%H:%M').time()
                                
                                duplicate_query = select(ScheduledEvent).where(
                                    ScheduledEvent.show_id == show.id,
                                    ScheduledEvent.event_date == event_date,
                                    ScheduledEvent.start_time == event_start_time
                                )
                                existing_event = (await db.execute(duplicate_query)).scalar_one_or_none()
                                
                                if existing_event:
                                    # Mark as applied (auto-cleanup)
                                    change.is_applied = True
                                    change.applied_at = datetime.now()
                                    change.applied_by = user_id
                                    change.resolution_notes = f"AUTO-CLEANED: Duplicate event already exists (ID: {existing_event.id})"
                                    applied_count += 1
                                    auto_cleaned += 1
                                    logger.error(f"🔥 APPLY_CHANGES: Auto-cleaned duplicate by show+date+time {show_name}")
                                    continue
                    
                    # Check for duplicate shows (CREATE only)
                    if change.action == ChangeAction.CREATE and change.entity_type == EntityType.SHOW:
                        show_name = change.new_data.get("show_name") or change.new_data.get("name")
                        if show_name:
                            existing_show_query = select(Show).where(Show.name == show_name)
                            existing_show = (await db.execute(existing_show_query)).scalar_one_or_none()
                            if existing_show:
                                # Mark as applied (auto-cleanup)
                                change.is_applied = True
                                change.applied_at = datetime.now()
                                change.applied_by = user_id
                                change.resolution_notes = f"AUTO-CLEANED: Duplicate show already exists (ID: {existing_show.id})"
                                applied_count += 1
                                auto_cleaned += 1
                                logger.error(f"🔥 APPLY_CHANGES: Auto-cleaned duplicate show {show_name}")
                                continue
                    
                    # Try to apply the change if not auto-cleaned
                    if change.action == ChangeAction.CREATE:
                        success = await SyncService._apply_create_change(db, change)
                    elif change.action == ChangeAction.UPDATE:
                        success = await SyncService._apply_update_change(db, change)
                    elif change.action == ChangeAction.DELETE:
                        success = await SyncService._apply_delete_change(db, change)
                    else:
                        success = False
                    
                    if success:
                        change.is_applied = True
                        change.applied_at = datetime.now()
                        change.applied_by = user_id
                        change.resolution_notes = reason
                        applied_count += 1
                        logger.error(f"🔥 APPLY_CHANGES: Successfully applied change {change.change_id}")
                        
                except Exception as e:
                    # Handle unique constraint errors like execute_sync does
                    error_str = str(e)
                    if 'unique constraint' in error_str and 'external_event_id' in error_str:
                        # Auto-cleanup: mark as applied since event already exists
                        change.is_applied = True
                        change.applied_at = datetime.now()
                        change.applied_by = user_id
                        change.resolution_notes = f"AUTO-CLEANED: Event already exists (unique constraint)"
                        applied_count += 1
                        auto_cleaned += 1
                        logger.error(f"🔥 APPLY_CHANGES: Auto-cleaned unique constraint violation")
                    else:
                        logger.error(f"🚨 APPLY_CHANGES: Error processing change {change.change_id}: {str(e)}")
                    continue
            
            await db.commit()
            
            if auto_cleaned > 0:
                message = f"No se aplicaron cambios - {auto_cleaned} eventos ya existen en la base de datos"
                logger.error(f"🔥 APPLY_CHANGES: {message}")
            else:
                message = f"Aplicados {applied_count} de {len(change_ids)} cambios"
            
            return SyncActionResponse(
                success=applied_count > 0,
                message=message,
                affected_changes=applied_count,
                executed_at=datetime.now(),
                details={"auto_cleaned": auto_cleaned} if auto_cleaned > 0 else None
            )
            
        except Exception as e:
            await db.rollback()
            return SyncActionResponse(
                success=False,
                message=f"Error aplicando cambios: {str(e)}",
                affected_changes=0,
                executed_at=datetime.now()
            )
    
    @staticmethod
    async def discard_changes(
        db: AsyncSession,
        change_ids: List[str],
        reason: str,
        user_id: str = "system"
    ) -> SyncActionResponse:
        """Descarta cambios específicos sin aplicarlos"""
        
        try:
            # Eliminar cambios pendientes
            delete_query = select(PendingChanges).where(
                and_(
                    PendingChanges.change_id.in_(change_ids),
                    PendingChanges.is_applied == False
                )
            )
            changes_to_discard = (await db.execute(delete_query)).scalars().all()
            
            discarded_count = 0
            for change in changes_to_discard:
                change.resolution_notes = f"DESCARTADO: {reason}"
                await db.delete(change)
                discarded_count += 1
            
            await db.commit()
            
            return SyncActionResponse(
                success=discarded_count > 0,
                message=f"Descartados {discarded_count} cambios",
                affected_changes=discarded_count,
                executed_at=datetime.now(),
                details={"reason": reason}
            )
            
        except Exception as e:
            await db.rollback()
            return SyncActionResponse(
                success=False,
                message=f"Error descartando cambios: {str(e)}",
                affected_changes=0,
                executed_at=datetime.now()
            )
    
    # Métodos privados para aplicar cambios específicos
    
    @staticmethod
    async def _apply_create_change(db: AsyncSession, change: PendingChanges) -> bool:
        """Aplica un cambio de creación"""
        try:
            if change.entity_type == EntityType.EVENT:
                # Crear o encontrar show
                show = await SyncService._ensure_show_exists(db, change.new_data["show_name"])
                
                # Crear evento - Support des formats d'heure avec ou sans secondes
                start_time_str = change.new_data["start_time"]
                end_time_str = change.new_data["end_time"]
                
                # Essayer d'abord avec secondes, puis sans
                try:
                    start_time = datetime.strptime(start_time_str, '%H:%M:%S').time()
                except ValueError:
                    start_time = datetime.strptime(start_time_str, '%H:%M').time()
                
                try:
                    end_time = datetime.strptime(end_time_str, '%H:%M:%S').time()
                except ValueError:
                    end_time = datetime.strptime(end_time_str, '%H:%M').time()
                
                new_event = ScheduledEvent(
                    external_event_id=change.external_id,
                    show_id=show.id,
                    event_date=datetime.strptime(change.new_data["event_date"], '%Y-%m-%d').date(),
                    start_time=start_time,
                    end_time=end_time,
                    duration_minutes=change.new_data["duration_minutes"],
                    is_multiple_shows_flag=False
                )
                db.add(new_event)
                # Event created successfully
                return True
                
            elif change.entity_type == EntityType.SHOW:
                # Crear show
                new_show = Show(
                    name=change.new_data["show_name"],
                    description=change.new_data.get("description", "Importado automáticamente"),
                    duration_estimated=change.new_data.get("duration_minutes", 60),
                    show_category=change.new_data.get("event_type", "show"),
                    is_visible=True,
                    display_order=0
                )
                db.add(new_show)
                return True
                
        except Exception as e:
            # Détecter les erreurs de contrainte unique
            error_str = str(e)
            if 'unique constraint' in error_str and 'external_event_id' in error_str:
                # L'événement existe déjà, retourner True pour auto-nettoyage
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"🔥 CREATE: Event already exists, auto-cleaning")
                return True
            else:
                import logging
                import traceback
                logger = logging.getLogger(__name__)
                logger.error(f"Erreur dans _apply_create_change: {e}")
                logger.error(f"Change ID: {change.change_id}")
                logger.error(f"Data: {change.new_data}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                return False
            
        return False
    
    @staticmethod 
    async def _apply_update_change(db: AsyncSession, change: PendingChanges, show_name_to_id: dict = None) -> bool:
        """Aplica un cambio de actualización"""
        try:
            if change.entity_type == EntityType.EVENT:
                # Pour les événements multiples, utiliser show_id existant directement
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"🔥 UPDATE: Force creating new event for multiple shows")
                
                # Utiliser le mapping dynamique des shows
                show_name = change.new_data["show_name"]
                show_id = show_name_to_id.get(show_name, 1) if show_name_to_id else 1  # ID par défaut si non trouvé
                # Mapping completed
                
                # Créer événement directement
                start_time_str = change.new_data["start_time"]
                end_time_str = change.new_data["end_time"]
                
                try:
                    start_time = datetime.strptime(start_time_str, '%H:%M:%S').time()
                except ValueError:
                    start_time = datetime.strptime(start_time_str, '%H:%M').time()
                
                try:
                    end_time = datetime.strptime(end_time_str, '%H:%M:%S').time()
                except ValueError:
                    end_time = datetime.strptime(end_time_str, '%H:%M').time()
                
                new_event = ScheduledEvent(
                    external_event_id=change.external_id,
                    show_id=show_id,
                    event_date=datetime.strptime(change.new_data["event_date"], '%Y-%m-%d').date(),
                    start_time=start_time,
                    end_time=end_time,
                    duration_minutes=change.new_data["duration_minutes"],
                    is_multiple_shows_flag=False
                )
                db.add(new_event)
                logger.error(f"🔥 CREATE: Added event {change.external_id} at {start_time}")
                return True
                    
        except Exception:
            return False
            
        return False
    
    @staticmethod
    async def _apply_delete_change(db: AsyncSession, change: PendingChanges) -> bool:
        """Aplica un cambio de eliminación"""
        try:
            if change.entity_type == EntityType.EVENT and change.entity_id:
                # Obtener y eliminar evento
                event_query = select(ScheduledEvent).where(ScheduledEvent.id == change.entity_id)
                event = (await db.execute(event_query)).scalar_one_or_none()
                
                if event:
                    await db.delete(event)
                    return True
                    
        except Exception:
            return False
            
        return False
    
    @staticmethod
    async def clean_duplicate_changes(
        db: AsyncSession,
        user_id: str = "system"
    ) -> Dict[str, int]:
        """Limpia todos los cambios pendientes que son duplicados de entidades existentes"""
        
        cleaned_events = 0
        cleaned_shows = 0
        
        try:
            # Limpiar eventos duplicados
            event_changes_query = select(PendingChanges).where(
                and_(
                    PendingChanges.is_applied == False,
                    PendingChanges.action == ChangeAction.CREATE,
                    PendingChanges.entity_type == EntityType.EVENT
                )
            )
            event_changes = (await db.execute(event_changes_query)).scalars().all()
            
            for change in event_changes:
                if change.external_id:
                    existing_query = select(ScheduledEvent).where(
                        ScheduledEvent.external_event_id == change.external_id
                    )
                    existing_event = (await db.execute(existing_query)).scalar_one_or_none()
                    if existing_event:
                        change.is_applied = True
                        change.applied_at = datetime.now()
                        change.applied_by = user_id
                        change.resolution_notes = f"AUTO-LIMPIADO: Evento duplicado detectado (ID: {existing_event.id})"
                        cleaned_events += 1
            
            # Limpiar shows duplicados
            show_changes_query = select(PendingChanges).where(
                and_(
                    PendingChanges.is_applied == False,
                    PendingChanges.action == ChangeAction.CREATE,
                    PendingChanges.entity_type == EntityType.SHOW
                )
            )
            show_changes = (await db.execute(show_changes_query)).scalars().all()
            
            for change in show_changes:
                show_name = change.new_data.get("show_name") or change.new_data.get("name")
                if show_name:
                    existing_show_query = select(Show).where(Show.name == show_name)
                    existing_show = (await db.execute(existing_show_query)).scalar_one_or_none()
                    if existing_show:
                        change.is_applied = True
                        change.applied_at = datetime.now()
                        change.applied_by = user_id
                        change.resolution_notes = f"AUTO-LIMPIADO: Show duplicado detectado (ID: {existing_show.id})"
                        cleaned_shows += 1
            
            await db.commit()
            
            return {
                "cleaned_events": cleaned_events,
                "cleaned_shows": cleaned_shows,
                "total_cleaned": cleaned_events + cleaned_shows
            }
            
        except Exception as e:
            await db.rollback()
            return {
                "cleaned_events": 0,
                "cleaned_shows": 0,
                "total_cleaned": 0,
                "error": str(e)
            }
    
    @staticmethod
    async def _ensure_show_exists(db: AsyncSession, show_name: str) -> Show:
        """Asegura que un show existe, lo crea si no existe"""
        
        # Buscar show existente
        show_query = select(Show).where(Show.name == show_name)
        show = (await db.execute(show_query)).scalar_one_or_none()
        
        if not show:
            # Crear show
            show = Show(
                name=show_name,
                description="Show creado automáticamente durante sincronización",
                duration_estimated=60,
                show_category="show",
                is_visible=True,
                display_order=0
            )
            db.add(show)
            await db.flush()  # Para obtener el ID
        
        return show