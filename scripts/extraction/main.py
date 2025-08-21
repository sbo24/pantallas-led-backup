"""
Script ETL simple avec intégration API ShowsTrack
"""
import argparse
import json
import logging
from datetime import datetime
import os
from api.puy_du_fou_api import fetch_schedule_data
from utils.date_utils import generate_date_range
from utils.data_processor import process_all_data
from api.showstrack_api_client import ShowsTrackAPIClient
from config import config

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='ETL Puy du Fou España con integración API ShowsTrack')
    parser.add_argument('--start-date', type=str, required=True, help='Fecha de inicio YYYY-MM-DD')
    parser.add_argument('--end-date', type=str, required=True, help='Fecha de fin YYYY-MM-DD')
    parser.add_argument('--dry-run', action='store_true', help='Modo test')
    return parser.parse_args()

def convert_to_showstrack_format(processed_data):
    """Convertir datos procesados al formato ShowsTrack"""
    # Usar el formato que ya funciona del test anterior
    events = []
    for event in processed_data:
        # Créer external_event_id unique avec date et horaire
        base_id = event.get('EventoID', '')
        start_time = event.get('Hora Inicio', '')
        event_date = event.get('Fecha', '').replace('-', '')
        unique_id = f"{base_id}_{event_date}_{start_time.replace(':', '')}" if start_time and event_date else base_id
        
        events.append({
            "external_event_id": unique_id,
            "show_name": event.get('Evento', ''),
            "event_date": event.get('Fecha', ''),
            "start_time": start_time,
            "end_time": event.get('Hora Fin', ''),
            "duration_minutes": int(event.get('Duración', 0)),
            "event_type": "system" if "apertura" in event.get('Evento', '').lower() or "cierre" in event.get('Evento', '').lower() else "show"
        })
    
    # Estadísticas
    events_by_type = {}
    events_by_show = {}
    events_by_date = {}
    
    for event in events:
        # Por tipo
        event_type = event['event_type']
        events_by_type[event_type] = events_by_type.get(event_type, 0) + 1
        
        # Por show
        show_name = event['show_name']
        events_by_show[show_name] = events_by_show.get(show_name, 0) + 1
        
        # Por fecha
        event_date = event['event_date']
        events_by_date[event_date] = events_by_date.get(event_date, 0) + 1
    
    return {
        "metadata": {
            "extraction_time": datetime.now().isoformat(),
            "total_events": len(events),
            "date_range": list(events_by_date.keys()),
            "source": "puy_du_fou_api",
            "version": "1.0",
            "extraction_summary": {
                "events_by_type": events_by_type,
                "events_by_show": events_by_show,
                "events_by_date": events_by_date,
                "unique_shows": len(events_by_show),
                "date_range_days": len(events_by_date)
            }
        },
        "events": events
    }

def main():
    args = parse_arguments()
    
    # Créer répertoires
    os.makedirs("debug", exist_ok=True)
    os.makedirs("output", exist_ok=True)
    
    # Valider dates
    try:
        start_date = datetime.strptime(args.start_date, '%Y-%m-%d')
        end_date = datetime.strptime(args.end_date, '%Y-%m-%d')
        logger.info(f"Dates validées: {start_date} à {end_date}")
    except ValueError as e:
        logger.error(f"Format de date invalide: {e}")
        return
    
    # Générer range de dates
    date_range = generate_date_range(start_date, end_date)
    
    logger.info(f"Iniciando ETL: {args.start_date} a {args.end_date}")
    logger.info(f"Modo: {'DRY RUN' if args.dry_run else 'PRODUCCIÓN'}")
    
    # Extraire données
    all_data = {}
    for date_str in date_range:
        logger.info(f"Consultando datos para {date_str}...")
        response_data = fetch_schedule_data(date_str)
        all_data[date_str] = response_data
    
    # Traiter données
    logger.info("Procesando datos...")
    processed_data = process_all_data(all_data)
    
    if not processed_data:
        logger.error("No se pudieron procesar datos.")
        return
    
    logger.info(f"Datos procesados: {len(processed_data)} eventos")
    logger.info(f"Primer evento: {processed_data[0] if processed_data else 'None'}"[:200])
    
    # Convertir au format ShowsTrack
    showstrack_data = convert_to_showstrack_format(processed_data)
    
    # Sauvegarder JSON local
    date_part = start_date.strftime('%Y%m%d')
    if start_date != end_date:
        date_part += f"-{end_date.strftime('%Y%m%d')}"
    
    json_path = os.path.join("output", f"etl_api_{date_part}.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(showstrack_data, f, indent=2, ensure_ascii=False)
    logger.info(f"JSON guardado: {json_path}")
    
    # Envoyer à l'API
    logger.info("Enviando datos a ShowsTrack API...")
    
    # Utiliser la configuration sécurisée
    logger.info("Initialisation du client API...")
    try:
        api_url, username, password = config.get_credentials()
        logger.info(f"API URL: {api_url}, Username: {username}")
        api_client = ShowsTrackAPIClient(api_url, username, password)
        logger.info("Client API créé, envoi des données...")
        result = api_client.send_import_data(showstrack_data, dry_run=args.dry_run)
        logger.info(f"Résultat API: {result}")
    except Exception as e:
        logger.error(f"Erreur lors de l'envoi à l'API: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return
    
    if result["success"]:
        logger.info("✅ ETL completado exitosamente!")
        logger.info(f"Message: {result.get('message')}")
        
        validation = result.get('validation_result', {})
        if validation:
            logger.info(f"Total eventos: {validation.get('total_events', 0)}")
            logger.info(f"Nuevos: {validation.get('new_events', 0)}")
            logger.info(f"Actualizados: {validation.get('updated_events', 0)}")
    else:
        logger.error(f"❌ ETL falló: {result.get('error')}")

if __name__ == "__main__":
    main()