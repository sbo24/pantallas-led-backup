"""
Script principal para extraer horarios de Puy du Fou España.
Soporta exportación a Excel, JSON o ambos formatos.
"""
import argparse
from datetime import datetime
import os
from puy_du_fou_api import fetch_schedule_data
from date_utils import generate_date_range
from data_processor import process_all_data
from excel_exporter import export_data

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Extraer horarios de Puy du Fou España')
    parser.add_argument('--start-date', type=str, required=True, 
                      help='Fecha de inicio en formato YYYY-MM-DD')
    parser.add_argument('--end-date', type=str, required=True, 
                      help='Fecha de fin en formato YYYY-MM-DD')
    parser.add_argument('--output', type=str, default=None,
                      help='Ruta base del archivo de salida (sin extensión)')
    parser.add_argument('--format', type=str, choices=['excel', 'json', 'both'], 
                      default='both', help='Formato de salida: excel, json o both (default: both)')
    return parser.parse_args()

def validate_dates(start_date_str, end_date_str):
    """Validate date format and range."""
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
        if end_date < start_date:
            raise ValueError("La fecha de fin debe ser posterior a la fecha de inicio")
        return start_date, end_date
    except ValueError as e:
        print(f"Error en el formato de fecha: {e}")
        exit(1)

def generate_output_path(start_date, end_date, base_path=None, format_type='excel'):
    """
    Genera la ruta de salida basada en las fechas.
    
    Args:
        start_date: Fecha de inicio
        end_date: Fecha de fin
        base_path: Ruta base personalizada
        format_type: Tipo de formato para la extensión
        
    Returns:
        str: Ruta completa del archivo
    """
    if base_path is None:
        # Generar nombre basado en fechas
        date_part = f"{start_date.strftime('%Y%m%d')}"
        if start_date != end_date:
            date_part += f"-{end_date.strftime('%Y%m%d')}"
        
        if format_type == 'excel':
            base_path = os.path.join("output", f"horarios_puydufou_{date_part}.xlsx")
        elif format_type == 'json':
            base_path = os.path.join("output", f"horarios_puydufou_{date_part}.json")
        else:  # both
            base_path = os.path.join("output", f"horarios_puydufou_{date_part}")
    else:
        # Si la ruta no incluye un directorio, guardar en output
        if os.path.dirname(base_path) == "":
            base_path = os.path.join("output", base_path)
    
    return os.path.abspath(base_path)

def main():
    """Entry point of the script."""
    # Crear directorios necesarios
    os.makedirs("debug", exist_ok=True)
    os.makedirs("output", exist_ok=True)
    
    # Parse command line arguments
    args = parse_arguments()
    
    # Validate dates
    start_date, end_date = validate_dates(args.start_date, args.end_date)
    
    # Generate date range
    date_range = generate_date_range(start_date, end_date)
    
    # Establecer nombre del archivo de salida
    output_path = generate_output_path(start_date, end_date, args.output, args.format)
    
    print(f"🔄 Extrayendo horarios de {args.start_date} a {args.end_date}")
    print(f"📁 Formato de salida: {args.format}")
    print(f"📂 Ruta base: {output_path}")
    print()
    
    # Fetch data for each date
    all_data = {}
    for date_str in date_range:
        print(f"Consultando datos para {date_str}...")
        response_data = fetch_schedule_data(date_str)
        all_data[date_str] = response_data
    
    print()
    
    # Process the data
    processed_data = process_all_data(all_data)
    
    if not processed_data:
        print("❌ No se pudieron procesar datos.")
        return
    
    print(f"✅ Datos procesados: {len(processed_data)} eventos encontrados")
    print()
    
    # Export to specified format(s)
    results = export_data(processed_data, output_path, args.format)
    
    # Summary
    print(f"\n🎉 Proceso completado:")
    total_events = 0
    
    if 'excel' in results:
        total_events = results['excel']
        print(f"  📊 Excel: {results['excel']} eventos")
    
    if 'json' in results:
        if 'excel' not in results:
            total_events = results['json']
        print(f"  📋 JSON: {results['json']} eventos")
    
    print(f"  📈 Total: {total_events} eventos exportados")
    
    if args.format == 'both':
        print("\n💡 Archivos generados:")
        if 'excel' in results:
            excel_path = output_path + '.xlsx' if not output_path.endswith('.xlsx') else output_path
            print(f"  📊 Excel: {excel_path}")
        if 'json' in results:
            json_path = output_path + '.json' if not output_path.endswith('.json') else output_path.replace('.xlsx', '.json')
            print(f"  📋 JSON:  {json_path}")

if __name__ == "__main__":
    main()