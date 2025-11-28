#!/usr/bin/env python3
"""
Script para modificar fechas en archivo JSON de ETL
Cambia eventos de 2025-11-30 a 2025-11-28 para importación inmediata
"""
import json
import os
from datetime import datetime

def modify_etl_dates(input_file, output_file, old_date, new_date):
    """
    Modifica las fechas en el archivo JSON de ETL

    Args:
        input_file: Archivo JSON original
        output_file: Archivo JSON modificado
        old_date: Fecha a reemplazar (YYYY-MM-DD)
        new_date: Nueva fecha (YYYY-MM-DD)
    """

    print(f"Leyendo archivo: {input_file}")

    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Eventos originales: {data['metadata']['total_events']}")

    # Modificar metadatos
    data['metadata']['extraction_time'] = datetime.now().isoformat()
    data['metadata']['date_range'] = [new_date]

    # Contar cambios
    eventos_modificados = 0

    # Modificar eventos
    for event in data['events']:
        if event['event_date'] == old_date:
            event['event_date'] = new_date

            # Modificar external_event_id para incluir nueva fecha
            old_id = event['external_event_id']
            old_id_parts = old_id.split('_')
            if len(old_id_parts) >= 2 and old_id_parts[-2] == old_date.replace('-', ''):
                # Reemplazar la fecha en el ID
                old_id_parts[-2] = new_date.replace('-', '')
                event['external_event_id'] = '_'.join(old_id_parts)

            eventos_modificados += 1

    print(f"Eventos modificados: {eventos_modificados}")

    # Actualizar summary
    data['metadata']['extraction_summary']['events_by_date'] = {new_date: eventos_modificados}

    # Guardar archivo modificado
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Archivo guardado: {output_file}")

    # Mostrar eventos de "La Alegría de la Navidad"
    christmas_events = [e for e in data['events'] if e['show_name'] == 'La Alegría de la Navidad']
    print(f"\n🎄 Eventos de 'La Alegría de la Navidad' para {new_date}:")
    for event in christmas_events:
        print(f"  • {event['start_time']} - {event['end_time']} (ID: {event['external_event_id']})")

    return data

if __name__ == "__main__":
    # Configuración
    input_file = "output/etl_api_20251130.json"
    output_file = "output/etl_api_20251128_christmas.json"
    old_date = "2025-11-30"
    new_date = "2025-11-28"

    # Verificar archivo de entrada
    if not os.path.exists(input_file):
        print(f"❌ Error: No existe el archivo {input_file}")
        exit(1)

    # Modificar fechas
    modified_data = modify_etl_dates(input_file, output_file, old_date, new_date)

    print(f"\n✅ Modificación completada")
    print(f"📁 Archivo original: {input_file}")
    print(f"📁 Archivo modificado: {output_file}")
    print(f"🗓️  Cambio de fecha: {old_date} → {new_date}")
    print(f"🎭 Total eventos: {modified_data['metadata']['total_events']}")