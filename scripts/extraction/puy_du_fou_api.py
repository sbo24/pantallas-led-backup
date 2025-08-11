"""
Módulo para interactuar con la API de Puy du Fou España.
"""
import requests
import time

# URL base para las consultas
BASE_URL = "https://api.mobile.puydufouespana.com/nagios"

def fetch_schedule_data(date_str):
    """
    Fetch schedule data for the specified date.
    
    Args:
        date_str (str): Date in YYYY-MM-DD format
        
    Returns:
        str: Raw response text
    """
    url = f"{BASE_URL}?debug&date={date_str}"
    print(f"  Consultando URL: {url}")
    
    # Add retry mechanism with backoff
    max_retries = 3
    retry_delay = 2  # seconds
    
    for attempt in range(max_retries):
        try:
            # Configurar headers para simular un navegador
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            
            # Imprimir código de estado y tamaño de la respuesta
            print(f"  Código de estado HTTP: {response.status_code}")
            print(f"  Tamaño de la respuesta: {len(response.text)} caracteres")
            
            response.raise_for_status()  # Raise exception for HTTP errors
            
            if "Puy Du Fou DB Rows" not in response.text:
                print("  ¡Advertencia! La respuesta no contiene los datos esperados.")
            
            return response.text
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                print(f"  Error ({attempt+1}/{max_retries}): {e}. Reintentando en {retry_delay} segundos...")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                print(f"  Error final: {e}")
                return None