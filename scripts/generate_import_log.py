import requests
import os
from datetime import datetime

SHOWSTRACK_API_URL = os.getenv("SHOWSTRACK_API_URL", "http://localhost:8000")
SHOWSTRACK_USERNAME = os.getenv("SHOWSTRACK_USERNAME", "admin")
SHOWSTRACK_PASSWORD = os.getenv("SHOWSTRACK_PASSWORD", "admin")
LOG_FILE = "/workspace/logs/import_detallado.log"

def get_jwt_token():
    resp = requests.post(
        f"{SHOWSTRACK_API_URL}/api/admin/auth/login",
        data={"username": SHOWSTRACK_USERNAME, "password": SHOWSTRACK_PASSWORD},
    )
    if resp.status_code == 200:
        return resp.json().get("access_token")
    return None

def generate_detailed_log():
    token = get_jwt_token()
    if not token:
        print("Error: No se pudo autenticar con la API.")
        return

    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{SHOWSTRACK_API_URL}/api/admin/import/history", headers=headers)
    
    if resp.status_code != 200:
        print(f"Error al obtener historial: HTTP {resp.status_code}")
        return

    data = resp.json()
    
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        f.write("=== REPORTE DETALLADO DE IMPORTACIONES DE ESPECTÁCULOS ===\n")
        f.write(f"Generado el: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        count = 0
        for item in data.get("items", []):
            if item["total_events"] > 0:
                count += 1
                f.write(f"{ '='*60 }\n")
                f.write(f"IMPORTACIÓN #{count}\n")
                f.write(f"ID: {item['id']}\n")
                f.write(f"Fecha de procesamiento: {item['processed_at']}\n")
                f.write(f"Total eventos: {item['total_events']} ({item['new_events']} nuevos, {item['updated_events']} actualizados)\n")
                f.write(f"Estado: {item['status'].upper()}\n")
                f.write(f"{ '-'*60 }\n")

                meta = item.get("import_metadata", {})
                summary = meta.get("extraction_summary", {})
                
                f.write("FECHAS BARRIDAS / PROGRAMADAS:\n")
                for date, amount in summary.get("events_by_date", {}).items():
                    f.write(f"  • {date}: {amount} eventos\n")
                
                f.write("\nESPECTÁCULOS IMPORTADOS (y número de sesiones):\n")
                # Ordenar espectáculos alfabéticamente para mayor claridad
                shows = summary.get("events_by_show", {})
                for show in sorted(shows.keys()):
                    f.write(f"  • {show}: {shows[show]} sesiones\n")
                
                f.write("\n\n")

                if count >= 10:  # Mostrar las últimas 10 importaciones con datos
                    break
                    
    print(f"✅ Reporte generado exitosamente en: {LOG_FILE}")
    print("Puedes abrir este archivo en tu editor para ver todo el detalle.")

if __name__ == "__main__":
    generate_detailed_log()
