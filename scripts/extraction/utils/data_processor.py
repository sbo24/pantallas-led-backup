"""
Procesamiento de los datos obtenidos de la API con diagnóstico detallado.
"""
import re
import os
import logging
from collections import defaultdict
from .date_utils import format_time

# Configurar logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s: %(message)s'
)

def calculate_end_time(start_time, duration):
    """
    Calcular hora de fin basada en hora de inicio y duración.
    """
    if not start_time:
        return start_time
    
    # Convertir horas a minutos
    start_hours = int(start_time[:2])
    start_minutes = int(start_time[2:])
    
    # Convertir duración a entero
    try:
        duration_minutes = int(duration)
    except (ValueError, TypeError):
        duration_minutes = 0
    
    # Calcular hora de fin
    total_minutes = start_hours * 60 + start_minutes + duration_minutes
    end_hours = total_minutes // 60
    end_minutes = total_minutes % 60
    
    return f"{end_hours:02d}{end_minutes:02d}"

def extract_show_data(response_text, date_str):
    """
    Extract show data from the API response text con diagnóstico detallado.
    """
    shows = []
    
    # Verificación de la respuesta
    if not response_text:
        logging.warning(f"No hay respuesta para {date_str}")
        return []
    
    # Crear directorio debug si no existe
    os.makedirs("debug", exist_ok=True)
    
    # Guardar la respuesta para depuración
    with open(f"debug/response_{date_str}.txt", "w", encoding="utf-8") as f:
        f.write(response_text)
    
    # Find the section that contains the show data
    start_marker = "=> Check PuyDuFou DB Content for table V_GrilleHoraire"
    end_marker = "=> Check Local DB Opening date"
    
    start_pos = response_text.find(start_marker)
    if start_pos == -1:
        logging.warning(f"No se encontró la sección de datos para {date_str}")
        return []
    
    end_pos = response_text.find(end_marker, start_pos)
    if end_pos == -1:
        end_pos = len(response_text)
    
    relevant_text = response_text[start_pos:end_pos]
    
    # Patrón para extraer bloques completos de eventos
    # Este patrón captura cada estructura de evento completa en el formato PHP de la API
    event_pattern = r'array\(8\)\s*\{\s*\["Gh_date"\]=>.*?\["Gh_evenementid"\]=>.*?\["Gh_evenement"\]=>.*?\["Gh_type"\]=>.*?\["Gh_duree"\]=>.*?\["Gh_heuredebut"\]=>.*?\["Gh_heurefin"\]=>.*?\["Gh_etat"\]=>.*?\}'
    
    # Usar re.DOTALL para que el punto coincida también con saltos de línea
    event_blocks = re.findall(event_pattern, relevant_text, re.DOTALL)
    
    logging.info(f"Se encontraron {len(event_blocks)} bloques de eventos")
    
    # Procesar cada bloque de evento
    for i, block in enumerate(event_blocks):
        logging.debug(f"Procesando bloque de evento {i+1}:")
        logging.debug(f"---INICIO DEL BLOQUE---\n{block}\n---FIN DEL BLOQUE---")
        
        # Inicializar datos del show
        show = {
            'Fecha': date_str,
        }
        
        # Extraer propiedades individuales dentro de cada bloque
        event_id = re.search(r'\["Gh_evenementid"\]=>\s*string\(\d+\)\s*"([^"]+)"', block)
        event_name = re.search(r'\["Gh_evenement"\]=>\s*string\(\d+\)\s*"([^"]+)"', block)
        event_type = re.search(r'\["Gh_type"\]=>\s*string\(\d+\)\s*"([^"]+)"', block)
        event_duration = re.search(r'\["Gh_duree"\]=>\s*string\(\d+\)\s*"([^"]+)"', block)
        event_start_time = re.search(r'\["Gh_heuredebut"\]=>\s*string\(\d+\)\s*"(\d{4})"', block)
        event_end_time = re.search(r'\["Gh_heurefin"\]=>\s*string\(\d+\)\s*"([^"]*)"', block)
        
        # Asignar valores al show
        if event_id:
            show['EventoID'] = event_id.group(1)
        if event_name:
            show['Evento'] = event_name.group(1)
        if event_type:
            show['Tipo'] = event_type.group(1)
        if event_duration:
            show['Duración'] = event_duration.group(1)
        
        # Procesar horas de inicio y fin
        start_time = event_start_time.group(1) if event_start_time else None
        # Importante: Capturar también cadenas vacías para Gh_heurefin
        raw_end_time = event_end_time.group(1) if event_end_time else None
        end_time = raw_end_time if raw_end_time and raw_end_time.strip() else None
        duration = event_duration.group(1) if event_duration else '0'
        
        # Depuración adicional
        logging.debug(f"Evento: {show.get('Evento', 'SIN NOMBRE')}")
        logging.debug(f"  Hora Inicio: {start_time}")
        logging.debug(f"  Hora Fin (raw): '{raw_end_time}'")
        logging.debug(f"  Hora Fin (procesada): {end_time}")
        logging.debug(f"  Duración: {duration}")
        
        if start_time:
            show['Hora Inicio'] = format_time(start_time)
            
            # Lógica mejorada para determinar hora de fin
            if end_time:
                # Usar hora de fin si está disponible y no está vacía
                show['Hora Fin'] = format_time(end_time)
                logging.info(f"Usando hora fin explícita para {show.get('Evento', 'SIN NOMBRE')}: {end_time} ({format_time(end_time)})")
                
                # Verificar coherencia entre hora de fin y duración
                calculated_end_time = calculate_end_time(start_time, duration)
                if calculated_end_time != end_time:
                    logging.warning(f"Discrepancia en hora fin para {show.get('Evento', 'SIN NOMBRE')}: ")
                    logging.warning(f"  Hora fin explícita: {end_time} ({format_time(end_time)})")
                    logging.warning(f"  Hora fin calculada: {calculated_end_time} ({format_time(calculated_end_time)})")
                    logging.warning(f"  Se utilizará la hora fin explícita")
            else:
                # Si no hay hora de fin, calcular basándose en duración
                calculated_end_time = calculate_end_time(start_time, duration)
                show['Hora Fin'] = format_time(calculated_end_time)
                logging.info(f"Calculando hora fin para {show.get('Evento', 'SIN NOMBRE')}: {calculated_end_time} ({format_time(calculated_end_time)})")
        
        shows.append(show)
    
    # Ordenar los eventos por hora de inicio
    shows.sort(key=lambda x: x.get('Hora Inicio', ''))
    
    # Guardar datos extraídos para depuración
    with open(f"debug/shows_{date_str}.txt", "w", encoding="utf-8") as f:
        for i, show in enumerate(shows):
            f.write(f"Evento {i+1}:\n")
            for key, val in show.items():
                f.write(f"  {key}: {val}\n")
            f.write("\n")
    
    return shows

def process_all_data(data_dict):
    """
    Process all data from multiple dates.
    """
    all_shows = []
    
    for date_str, response_text in data_dict.items():
        if response_text:
            shows = extract_show_data(response_text, date_str)
            all_shows.extend(shows)
    
    return all_shows