"""
Formateo de datos específico para ShowsTrack APP.
Optimiza la estructura para importación via API.
"""
import json
import os
from datetime import datetime
from typing import List, Dict, Any

def format_for_showstrack_api(data: List[Dict]) -> Dict[str, Any]:
    """
    Formatea los datos extraídos para la API de ShowsTrack.
    
    Args:
        data: Lista de diccionarios con datos de eventos
        
    Returns:
        dict: Estructura JSON optimizada para ShowsTrack ImportSyncService
    """
    if not data:
        return {
            "metadata": {
                "extraction_time": datetime.now().isoformat(),
                "total_events": 0,
                "date_range": [],
                "source": "puy_du_fou_api",
                "version": "1.0"
            },
            "events": []
        }
    
    # Extraer fechas únicas para metadatos
    unique_dates = sorted(list(set(event.get('Fecha', '') for event in data if event.get('Fecha'))))
    
    # Procesar eventos
    formatted_events = []
    
    for event in data:
        # Mapear campos según especificación ShowsTrack
        # Crear external_event_id único con sufijo de horario
        base_id = event.get('EventoID', '')
        start_time = event.get('Hora Inicio', '')
        unique_id = f"{base_id}_{start_time.replace(':', '')}" if start_time else base_id
        
        formatted_event = {
            "external_event_id": unique_id,
            "show_name": event.get('Evento', ''),
            "event_date": event.get('Fecha', ''),
            "start_time": start_time,
            "end_time": event.get('Hora Fin', ''),
            "duration_minutes": parse_duration(event.get('Duración', '0')),
            "event_type": map_event_type(event.get('Tipo', 'Show'))
        }
        
        # Validar datos críticos
        if validate_event_data(formatted_event):
            formatted_events.append(formatted_event)
        else:
            print(f"⚠️ Evento inválido omitido: {formatted_event.get('show_name', 'Sin nombre')}")
    
    # Crear estructura final
    result = {
        "metadata": {
            "extraction_time": datetime.now().isoformat(),
            "total_events": len(formatted_events),
            "date_range": unique_dates,
            "source": "puy_du_fou_api",
            "version": "1.0",
            "extraction_summary": generate_summary(formatted_events)
        },
        "events": formatted_events
    }
    
    return result

def parse_duration(duration_str: str) -> int:
    """
    Convierte duración de string a entero (minutos).
    
    Args:
        duration_str: Duración como string
        
    Returns:
        int: Duración en minutos
    """
    try:
        return int(duration_str) if duration_str else 0
    except (ValueError, TypeError):
        return 0

def map_event_type(original_type: str) -> str:
    """
    Mapea tipos de evento del sistema original al formato ShowsTrack.
    
    Args:
        original_type: Tipo original del evento
        
    Returns:
        str: Tipo mapeado para ShowsTrack
    """
    type_mapping = {
        'Show': 'show',
        'Apertura / Cierre': 'system',
        'Apertura': 'opening',
        'Cierre': 'closing'
    }
    
    return type_mapping.get(original_type, 'show')

def validate_event_data(event: Dict[str, Any]) -> bool:
    """
    Valida que un evento tenga los datos mínimos requeridos.
    
    Args:
        event: Diccionario con datos del evento
        
    Returns:
        bool: True si el evento es válido
    """
    required_fields = ['external_event_id', 'show_name', 'event_date', 'start_time']
    
    # Verificar campos obligatorios
    for field in required_fields:
        if not event.get(field):
            return False
    
    # Validar formato de fecha (YYYY-MM-DD)
    try:
        datetime.strptime(event['event_date'], '%Y-%m-%d')
    except ValueError:
        return False
    
    # Validar formato de hora (HH:MM)
    try:
        if event.get('start_time'):
            datetime.strptime(event['start_time'], '%H:%M')
        if event.get('end_time'):
            datetime.strptime(event['end_time'], '%H:%M')
    except ValueError:
        return False
    
    return True

def generate_summary(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Genera resumen estadístico de los eventos.
    
    Args:
        events: Lista de eventos formateados
        
    Returns:
        dict: Resumen con estadísticas
    """
    if not events:
        return {}
    
    # Contar por tipo
    type_counts = {}
    show_counts = {}
    date_counts = {}
    
    for event in events:
        # Conteo por tipo
        event_type = event.get('event_type', 'unknown')
        type_counts[event_type] = type_counts.get(event_type, 0) + 1
        
        # Conteo por show (solo shows, no eventos de sistema)
        if event_type == 'show':
            show_name = event.get('show_name', 'unknown')
            show_counts[show_name] = show_counts.get(show_name, 0) + 1
        
        # Conteo por fecha
        event_date = event.get('event_date', 'unknown')
        date_counts[event_date] = date_counts.get(event_date, 0) + 1
    
    return {
        "events_by_type": type_counts,
        "events_by_show": dict(sorted(show_counts.items(), key=lambda x: x[1], reverse=True)),
        "events_by_date": dict(sorted(date_counts.items())),
        "unique_shows": len(show_counts),
        "date_range_days": len(date_counts)
    }

def export_to_json(data: List[Dict], output_path: str) -> int:
    """
    Exporta datos a archivo JSON optimizado para ShowsTrack.
    
    Args:
        data: Lista de diccionarios con datos de eventos
        output_path: Ruta del archivo JSON de salida
        
    Returns:
        int: Número de eventos exportados
    """
    if not data:
        print("No hay datos para exportar a JSON")
        return 0
    
    # Crear directorio de salida si no existe
    output_dir = os.path.dirname(output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    
    try:
        # Formatear datos para ShowsTrack
        formatted_data = format_for_showstrack_api(data)
        
        # Escribir archivo JSON con formato legible
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(formatted_data, f, indent=2, ensure_ascii=False)
        
        print(f"Archivo JSON guardado correctamente: {output_path}")
        print(f"Eventos exportados: {formatted_data['metadata']['total_events']}")
        print(f"Fechas incluidas: {', '.join(formatted_data['metadata']['date_range'])}")
        
        return formatted_data['metadata']['total_events']
        
    except Exception as e:
        print(f"Error al guardar JSON: {e}")
        return 0