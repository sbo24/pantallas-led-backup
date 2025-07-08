# 🔄 ShowsTrack APP - Sistema de Extracción e Integración

## 6.1 Scripts Python Existentes

### Arquitectura del Sistema de Extracción

El sistema de extracción es una aplicación Python standalone que se ejecuta de forma independiente y se comunica con ShowsTrack via API.

```
scripts/
├── main.py                      # Orquestador principal
├── puy_du_fou_api.py           # Cliente para API externa
├── data_processor.py           # Lógica de transformación
├── showstrack_formatter.py     # Adaptador para ShowsTrack
├── automated_sync.py           # Automatización con cron
├── config/
│   └── settings.py             # Configuración
├── logs/
│   └── extraction_YYYY-MM-DD.log
└── output/
    └── shows_data_YYYY-MM-DD.xlsx
```

### Componentes Principales

#### main.py - Orquestador
```python
import asyncio
from datetime import datetime, timedelta
from puy_du_fou_api import PuyDuFouClient
from data_processor import DataProcessor
from showstrack_formatter import ShowsTrackFormatter

class ExtractionOrchestrator:
    """
    Coordina el proceso completo de extracción y sincronización.
    """
    
    def __init__(self):
        self.api_client = PuyDuFouClient()
        self.processor = DataProcessor()
        self.formatter = ShowsTrackFormatter()
        
    async def extract_weekly_data(self):
        """
        Extrae datos de los próximos 7 días.
        """
        start_date = datetime.now().date()
        end_date = start_date + timedelta(days=7)
        
        print(f"Extrayendo datos desde {start_date} hasta {end_date}")
        
        # 1. Obtener datos de API externa
        raw_data = await self.api_client.fetch_schedule(
            start_date, 
            end_date
        )
        
        # 2. Procesar y limpiar datos
        processed_data = self.processor.process_events(raw_data)
        
        # 3. Formatear para ShowsTrack
        formatted_data = self.formatter.format_for_import(processed_data)
        
        # 4. Generar Excel
        excel_path = self.formatter.generate_excel(formatted_data)
        
        # 5. Enviar a ShowsTrack
        result = await self.send_to_showstrack(formatted_data)
        
        return result
```

#### puy_du_fou_api.py - Cliente API Externa
```python
import httpx
from typing import Dict, List
from datetime import date

class PuyDuFouClient:
    """
    Cliente para interactuar con la API de Puy du Fou España.
    """
    
    BASE_URL = "https://api.puydufou.es/v1"
    
    def __init__(self):
        self.api_key = os.getenv("PUY_DU_FOU_API_KEY")
        self.client = httpx.AsyncClient(
            headers={"X-API-Key": self.api_key}
        )
    
    async def fetch_schedule(
        self, 
        start_date: date, 
        end_date: date
    ) -> List[Dict]:
        """
        Obtiene la programación de espectáculos en el rango de fechas.
        """
        response = await self.client.get(
            f"{self.BASE_URL}/schedule",
            params={
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "include_details": "true"
            }
        )
        
        response.raise_for_status()
        return response.json()["events"]
    
    async def get_show_details(self, show_id: str) -> Dict:
        """
        Obtiene detalles específicos de un espectáculo.
        """
        response = await self.client.get(f"{self.BASE_URL}/shows/{show_id}")
        response.raise_for_status()
        return response.json()

#### data_processor.py - Procesamiento de Datos
```python
from typing import List, Dict, Optional
from datetime import datetime, time
import pandas as pd

class DataProcessor:
    """
    Procesa y transforma los datos crudos de la API externa.
    """
    
    def process_events(self, raw_events: List[Dict]) -> pd.DataFrame:
        """
        Convierte eventos crudos en DataFrame estructurado.
        """
        processed_events = []
        
        for event in raw_events:
            processed = self._process_single_event(event)
            if processed:
                processed_events.append(processed)
        
        df = pd.DataFrame(processed_events)
        
        # Detectar múltiples pases
        df['is_multiple_shows'] = df.duplicated(
            subset=['show_name', 'event_date'], 
            keep=False
        )
        
        # Ordenar por fecha y hora
        df = df.sort_values(['event_date', 'start_time'])
        
        return df
    
    def _process_single_event(self, event: Dict) -> Optional[Dict]:
        """
        Procesa un evento individual.
        """
        try:
            # Validar campos requeridos
            if not all(k in event for k in ['id', 'name', 'date', 'time']):
                return None
            
            # Parsear fecha y hora
            event_date = datetime.fromisoformat(event['date']).date()
            start_time = datetime.strptime(event['time'], '%H:%M').time()
            
            # Calcular hora de fin si está disponible
            duration = event.get('duration_minutes', 45)
            end_time = self._calculate_end_time(start_time, duration)
            
            return {
                'external_event_id': event['id'],
                'show_name': event['name'],
                'event_date': event_date,
                'start_time': start_time,
                'end_time': end_time,
                'duration_minutes': duration,
                'event_type': event.get('type', 'show'),
                'venue': event.get('venue', 'Principal'),
                'capacity': event.get('capacity'),
                'status': event.get('status', 'CONFIRMED')
            }
            
        except Exception as e:
            print(f"Error procesando evento {event.get('id')}: {e}")
            return None
    
    def _calculate_end_time(self, start: time, duration: int) -> time:
        """
        Calcula la hora de finalización basada en duración.
        """
        from datetime import datetime, timedelta
        
        # Crear datetime temporal para cálculo
        temp_dt = datetime.combine(datetime.today(), start)
        end_dt = temp_dt + timedelta(minutes=duration)
        
        return end_dt.time()
```

#### showstrack_formatter.py - Adaptador ShowsTrack
```python
import json
import pandas as pd
from typing import Dict, List
import httpx

class ShowsTrackFormatter:
    """
    Formatea datos para importación en ShowsTrack.
    """
    
    def __init__(self):
        self.showstrack_url = os.getenv("SHOWSTRACK_API_URL")
        self.api_token = os.getenv("SHOWSTRACK_API_TOKEN")
    
    def format_for_import(self, df: pd.DataFrame) -> Dict:
        """
        Convierte DataFrame a formato JSON esperado por ShowsTrack.
        """
        events = []
        
        for _, row in df.iterrows():
            events.append({
                'external_event_id': row['external_event_id'],
                'show_name': row['show_name'],
                'event_date': row['event_date'].isoformat(),
                'start_time': row['start_time'].strftime('%H:%M'),
                'end_time': row['end_time'].strftime('%H:%M') if pd.notna(row['end_time']) else None,
                'duration_minutes': int(row['duration_minutes']),
                'event_type': row['event_type'],
                'is_multiple_shows_flag': bool(row['is_multiple_shows'])
            })
        
        return {
            'import_source': 'puy_du_fou_api',
            'import_timestamp': datetime.now().isoformat(),
            'total_events': len(events),
            'events': events
        }
    
    def generate_excel(self, data: Dict) -> str:
        """
        Genera archivo Excel para respaldo/revisión manual.
        """
        df = pd.DataFrame(data['events'])
        
        filename = f"output/shows_data_{datetime.now().strftime('%Y-%m-%d')}.xlsx"
        
        with pd.ExcelWriter(filename, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Events', index=False)
            
            # Agregar hoja de resumen
            summary = pd.DataFrame([{
                'Import Date': data['import_timestamp'],
                'Total Events': data['total_events'],
                'Date Range': f"{df['event_date'].min()} to {df['event_date'].max()}",
                'Unique Shows': df['show_name'].nunique()
            }])
            summary.to_excel(writer, sheet_name='Summary', index=False)
        
        return filename
    
    async def send_to_showstrack(self, data: Dict) -> Dict:
        """
        Envía datos a ShowsTrack API.
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.showstrack_url}/api/admin/import",
                json=data,
                headers={
                    "Authorization": f"Bearer {self.api_token}",
                    "Content-Type": "application/json"
                }
            )
            
            response.raise_for_status()
            return response.json()
```

### Flujo de Ejecución Diaria

```
06:00 AM - Cron trigger
    │
    ├─► Inicio del proceso
    │   └─► Log: "Iniciando extracción diaria"
    │
    ├─► Conexión con API Puy du Fou
    │   ├─► Autenticación
    │   └─► Request: /schedule?start_date=today&end_date=today+7
    │
    ├─► Procesamiento de datos (150-300 eventos típicamente)
    │   ├─► Validación de campos
    │   ├─► Normalización de formatos
    │   └─► Detección de múltiples pases
    │
    ├─► Generación de archivos
    │   ├─► Excel para backup
    │   └─► JSON para API
    │
    ├─► Envío a ShowsTrack
    │   ├─► POST /api/admin/import
    │   └─► Verificación de respuesta
    │
    └─► Finalización
        ├─► Log: resumen de operación
        └─► Notificación si hay errores
```

## 6.2 Integración con ShowsTrack

### Endpoint de Importación

ShowsTrack expone un endpoint específico para recibir datos del sistema de extracción:

```python
# En ShowsTrack Backend (FastAPI)
@router.post("/api/admin/import")
async def import_data(
    import_data: ImportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Recibe y procesa datos del sistema de extracción.
    """
    # Verificar modo de operación
    operation_mode = await get_global_setting("operation_mode")
    
    if operation_mode == "automatic":
        # Aplicar cambios inmediatamente
        result = await import_service.process_import(import_data, apply_now=True)
    else:
        # Guardar para sincronización manual
        result = await import_service.store_pending_import(import_data)
    
    # Registrar en audit log
    await audit_service.log_import(
        user=current_user,
        source=import_data.import_source,
        events_count=import_data.total_events,
        result=result
    )
    
    return result
```

### Mapeo de Datos

El mapeo entre el formato externo y el modelo interno de ShowsTrack:

```python
class ImportMapper:
    """
    Mapea datos externos al modelo interno de ShowsTrack.
    """
    
    def map_external_to_internal(self, external_event: Dict) -> Dict:
        """
        Convierte formato externo a formato interno.
        """
        # Buscar show por nombre
        show = self.find_or_create_show(external_event['show_name'])
        
        return {
            'external_event_id': external_event['external_event_id'],
            'show_id': show.id,
            'event_date': external_event['event_date'],
            'start_time': external_event['start_time'],
            'end_time': external_event.get('end_time'),
            'duration_minutes': external_event['duration_minutes'],
            'event_type': external_event.get('event_type', 'show'),
            'is_multiple_shows_flag': external_event.get('is_multiple_shows_flag', False)
        }
    
    def find_or_create_show(self, show_name: str) -> Show:
        """
        Busca un show por nombre o lo crea si no existe.
        """
        show = db.query(Show).filter(Show.name == show_name).first()
        
        if not show:
            show = Show(
                name=show_name,
                is_visible=True,  # Visible por defecto
                display_order=0   # Orden automático
            )
            db.add(show)
            db.commit()
            
            print(f"Nuevo show creado: {show_name}")
        
        return show
```

### Validaciones en Importación

```python
class ImportValidator:
    """
    Valida datos antes de importar.
    """
    
    def validate_import_data(self, import_data: ImportRequest) -> ValidationResult:
        """
        Valida estructura y coherencia de datos.
        """
        errors = []
        warnings = []
        
        for event in import_data.events:
            # Validaciones críticas
            if not event.get('external_event_id'):
                errors.append(f"Evento sin ID externo: {event}")
                continue
            
            if not event.get('show_name'):
                errors.append(f"Evento {event['external_event_id']} sin nombre de show")
                continue
            
            # Validaciones de coherencia
            try:
                event_date = datetime.fromisoformat(event['event_date'])
                if event_date.date() < datetime.now().date():
                    warnings.append(f"Evento {event['external_event_id']} en el pasado")
                
                # Validar formato de hora
                datetime.strptime(event['start_time'], '%H:%M')
                
            except ValueError as e:
                errors.append(f"Formato inválido en {event['external_event_id']}: {e}")
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
```

### Detección de Cambios (Delta)

```python
class ChangeDetector:
    """
    Detecta qué ha cambiado respecto a datos actuales.
    """
    
    def detect_changes(self, import_events: List[Dict]) -> ChangeSet:
        """
        Compara eventos importados con existentes.
        """
        changes = {
            'to_create': [],
            'to_update': [],
            'to_delete': [],
            'unchanged': []
        }
        
        # Obtener todos los external_ids actuales
        existing_ids = set(
            db.query(ScheduledEvent.external_event_id).all()
        )
        
        import_ids = set(e['external_event_id'] for e in import_events)
        
        # Detectar nuevos
        new_ids = import_ids - existing_ids
        changes['to_create'] = [
            e for e in import_events 
            if e['external_event_id'] in new_ids
        ]
        
        # Detectar actualizaciones
        for event_data in import_events:
            if event_data['external_event_id'] in existing_ids:
                existing = self.get_event_by_external_id(
                    event_data['external_event_id']
                )
                
                if self.has_changes(existing, event_data):
                    changes['to_update'].append(event_data)
                else:
                    changes['unchanged'].append(event_data)
        
        # Detectar eliminados (opcional)
        deleted_ids = existing_ids - import_ids
        if deleted_ids:
            changes['to_delete'] = list(deleted_ids)
        
        return ChangeSet(**changes)
```

## 6.3 Estrategia de Sincronización

### Modo Automático

En modo automático, los cambios se aplican inmediatamente:

```python
class AutomaticSyncStrategy:
    """
    Estrategia de sincronización para modo automático.
    """
    
    async def apply_changes(self, change_set: ChangeSet) -> SyncResult:
        """
        Aplica todos los cambios detectados inmediatamente.
        """
        results = {
            'created': 0,
            'updated': 0,
            'errors': []
        }
        
        async with db.begin():
            # Crear nuevos eventos
            for event_data in change_set.to_create:
                try:
                    event = await self.create_event(event_data)
                    results['created'] += 1
                except Exception as e:
                    results['errors'].append(f"Error creando {event_data['external_event_id']}: {e}")
            
            # Actualizar existentes
            for event_data in change_set.to_update:
                try:
                    await self.update_event(event_data)
                    results['updated'] += 1
                except Exception as e:
                    results['errors'].append(f"Error actualizando {event_data['external_event_id']}: {e}")
        
        # Invalidar cache
        await cache_service.invalidate_pattern("schedules:*")
        
        return SyncResult(**results)
```

### Modo Manual

En modo manual, los cambios se retienen:

```python
class ManualSyncStrategy:
    """
    Estrategia de sincronización para modo manual.
    """
    
    async def store_pending_changes(self, import_data: ImportRequest) -> Dict:
        """
        Almacena cambios para revisión manual.
        """
        # Detectar cambios
        change_set = await change_detector.detect_changes(import_data.events)
        
        # Guardar en almacenamiento temporal
        pending_sync = PendingSync(
            import_timestamp=import_data.import_timestamp,
            import_source=import_data.import_source,
            change_summary={
                'to_create': len(change_set.to_create),
                'to_update': len(change_set.to_update),
                'total_events': import_data.total_events
            },
            change_data=change_set.dict()
        )
        
        await cache_service.set(
            "pending_sync",
            pending_sync.dict(),
            ttl=86400  # 24 horas
        )
        
        # Notificar al frontend
        await websocket_manager.broadcast({
            'type': 'pending_sync_available',
            'summary': pending_sync.change_summary
        })
        
        return {
            'status': 'pending',
            'message': 'Cambios guardados para sincronización manual',
            'summary': pending_sync.change_summary
        }
    
    async def execute_manual_sync(self, user: User) -> SyncResult:
        """
        Ejecuta sincronización manual cuando el operador lo solicita.
        """
        # Recuperar cambios pendientes
        pending_data = await cache_service.get("pending_sync")
        if not pending_data:
            raise ValueError("No hay cambios pendientes")
        
        change_set = ChangeSet(**pending_data['change_data'])
        
        # Aplicar cambios preservando overrides
        result = await self.apply_changes_preserving_overrides(change_set)
        
        # Limpiar datos pendientes
        await cache_service.delete("pending_sync")
        
        # Registrar en audit log
        await audit_service.log_manual_sync(user, result)
        
        return result
```

### Preservación de Overrides

Crítico: Los overrides del operador NUNCA se sobrescriben:

```python
async def update_event_preserving_override(
    self, 
    event_data: Dict
) -> ScheduledEvent:
    """
    Actualiza evento preservando override si existe.
    """
    event = await self.get_event_by_external_id(
        event_data['external_event_id']
    )
    
    # Verificar si tiene override activo
    has_override = db.query(StatusOverride).filter(
        StatusOverride.scheduled_event_id == event.id,
        StatusOverride.is_active == True
    ).first() is not None
    
    # Actualizar solo campos permitidos
    event.event_date = event_data['event_date']
    event.start_time = event_data['start_time']
    event.end_time = event_data.get('end_time')
    event.duration_minutes = event_data['duration_minutes']
    
    # NO tocar el estado si hay override
    if has_override:
        print(f"Preservando override para evento {event.id}")
    
    await db.commit()
    return event
```

### Logs y Auditoría

Todo proceso de sincronización se registra:

```python
class ImportAuditLogger:
    """
    Registra todas las operaciones de importación.
    """
    
    async def log_import_attempt(
        self,
        source: str,
        events_count: int,
        user: Optional[User] = None
    ):
        """
        Registra intento de importación.
        """
        log_entry = AuditLog(
            timestamp=datetime.now(),
            user_id=user.username if user else "system",
            action="IMPORT_ATTEMPT",
            entity_type="import",
            new_values={
                'source': source,
                'events_count': events_count,
                'mode': await get_global_setting('operation_mode')
            }
        )
        
        db.add(log_entry)
        await db.commit()
    
    async def log_import_result(
        self,
        result: SyncResult,
        duration_seconds: float
    ):
        """
        Registra resultado de importación.
        """
        log_entry = AuditLog(
            timestamp=datetime.now(),
            user_id="system",
            action="IMPORT_COMPLETE",
            entity_type="import",
            new_values={
                'created': result.created,
                'updated': result.updated,
                'errors': len(result.errors),
                'duration_seconds': duration_seconds
            }
        )
        
        if result.errors:
            log_entry.new_values['error_details'] = result.errors[:10]  # Primeros 10
        
        db.add(log_entry)
        await db.commit()
```

### Configuración de Automatización

```bash
# Crontab para ejecución diaria
0 6 * * * /usr/bin/python3 /opt/showstrack/scripts/automated_sync.py >> /var/log/showstrack/sync.log 2>&1

# Script de automatización
#!/usr/bin/env python3
# automated_sync.py

import asyncio
import logging
from main import ExtractionOrchestrator

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def daily_sync():
    """
    Ejecuta sincronización diaria.
    """
    logger = logging.getLogger('automated_sync')
    
    try:
        logger.info("Iniciando sincronización diaria automática")
        
        orchestrator = ExtractionOrchestrator()
        result = await orchestrator.extract_weekly_data()
        
        logger.info(f"Sincronización completada: {result}")
        
        # Notificar éxito si está configurado
        if os.getenv('NOTIFY_SUCCESS'):
            await send_notification('success', result)
            
    except Exception as e:
        logger.error(f"Error en sincronización: {e}", exc_info=True)
        
        # Notificar error
        if os.getenv('NOTIFY_ERRORS'):
            await send_notification('error', str(e))
        
        raise

if __name__ == "__main__":
    asyncio.run(daily_sync())
```

---

*Este sistema de integración garantiza la sincronización confiable de datos mientras preserva el control operativo del sistema ShowsTrack.*