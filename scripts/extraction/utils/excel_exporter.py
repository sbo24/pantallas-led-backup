"""
Funcionalidades para exportar datos a Excel y JSON.
"""
import os
import pandas as pd
from datetime import datetime
from showstrack_formatter import export_to_json

def export_to_excel(data, output_path):
    """
    Export data to Excel file.
    
    Args:
        data (list): List of dictionaries containing show data
        output_path (str): Path to save the Excel file
        
    Returns:
        int: Number of events exported
    """
    if not data:
        print("No hay datos para exportar")
        return 0
    
    # Crear directorio output si no existe
    output_dir = os.path.dirname(output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    
    # Convert to DataFrame
    df = pd.DataFrame(data)
    
    # Sort by date and start time
    if 'Fecha' in df.columns and 'Hora Inicio' in df.columns:
        df = df.sort_values(by=['Fecha', 'Hora Inicio'])
    
    # Add metadata
    metadata_sheet = pd.DataFrame([
        {'Clave': 'Fecha de generación', 'Valor': datetime.now().strftime('%Y-%m-%d %H:%M:%S')},
        {'Clave': 'Total de eventos', 'Valor': len(df)},
        {'Clave': 'Fechas incluidas', 'Valor': ', '.join(df['Fecha'].unique())},
        {'Clave': 'Fuente', 'Valor': 'API de Puy du Fou España'}
    ])
    
    try:
        # Create Excel writer
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            # Write data to the main sheet
            df.to_excel(writer, sheet_name='Horarios', index=False)
            
            # Write metadata to a separate sheet
            metadata_sheet.to_excel(writer, sheet_name='Metadata', index=False)
            
            # Auto-adjust column widths
            for sheet_name in writer.sheets:
                for column in writer.sheets[sheet_name].columns:
                    max_length = 0
                    column_letter = column[0].column_letter
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    adjusted_width = (max_length + 2)
                    writer.sheets[sheet_name].column_dimensions[column_letter].width = adjusted_width
        
        print(f"Archivo Excel guardado correctamente: {output_path}")
        
    except Exception as e:
        print(f"Error al guardar Excel: {e}")
        return 0
    
    return len(df)

def export_data(data, output_path, format_type='excel'):
    """
    Export data to specified format.
    
    Args:
        data (list): List of dictionaries containing show data
        output_path (str): Base path for output files
        format_type (str): 'excel', 'json', or 'both'
        
    Returns:
        dict: Results of export operations
    """
    results = {}
    
    if format_type in ['excel', 'both']:
        excel_path = output_path if output_path.endswith('.xlsx') else f"{output_path}.xlsx"
        results['excel'] = export_to_excel(data, excel_path)
    
    if format_type in ['json', 'both']:
        if output_path.endswith('.xlsx'):
            json_path = output_path.replace('.xlsx', '.json')
        elif output_path.endswith('.json'):
            json_path = output_path  # Ya tiene la extensión correcta
        else:
            json_path = f"{output_path}.json"
        results['json'] = export_to_json(data, json_path)
    
    return results