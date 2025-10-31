#!/usr/bin/env python3
"""
Script para limpiar eventos de días anteriores usando la API de ShowsTrack.
Elimina eventos que no sean del día actual para evitar confusiones.
"""

import requests
import json
from datetime import date, datetime

# Configuración
API_BASE = "http://localhost:8000"
USERNAME = "admin"
PASSWORD = "admin"

def get_auth_token():
    """Obtener token de autenticación"""
    auth_url = f"{API_BASE}/api/admin/auth/login"
    data = {
        "username": USERNAME,
        "password": PASSWORD
    }

    try:
        response = requests.post(auth_url, data=data)
        if response.status_code == 200:
            return response.json()["access_token"]
        else:
            print(f"❌ Error obteniendo token: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return None

def get_events_by_date(token, target_date):
    """Obtener eventos de una fecha específica"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    url = f"{API_BASE}/api/admin/events?date_from={target_date}&date_to={target_date}&size=100"

    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Error obteniendo eventos: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error obteniendo eventos: {e}")
        return None

def delete_event(token, event_id):
    """Eliminar un evento específico"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    url = f"{API_BASE}/api/admin/events/{event_id}"

    try:
        response = requests.delete(url, headers=headers)
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error eliminando evento {event_id}: {e}")
        return False

def cleanup_old_events():
    """Función principal de limpieza"""
    print("🧹 Script de limpieza de eventos de días anteriores")
    print("=" * 50)

    # 1. Obtener token
    print("🔐 Obteniendo token de autenticación...")
    token = get_auth_token()
    if not token:
        print("❌ No se pudo obtener token. Abortando.")
        return

    print("✅ Token obtenido correctamente")

    # 2. Obtener fecha actual
    today = date.today().isoformat()
    yesterday = (date.today() - datetime.timedelta(days=1)).isoformat()

    print(f"📅 Fecha actual: {today}")
    print(f"📅 Fecha a limpiar: {yesterday}")

    # 3. Obtener eventos del día anterior
    print(f"\n🔍 Buscando eventos del {yesterday}...")
    events_data = get_events_by_date(token, yesterday)

    if not events_data:
        print("❌ No se pudieron obtener los eventos")
        return

    total_events = events_data.get("total", 0)

    if total_events == 0:
        print(f"✅ No hay eventos del {yesterday}. Sistema limpio.")
        return

    print(f"⚠️  Se encontraron {total_events} eventos del {yesterday}")
    print(f"📋 Lista de eventos a eliminar:")

    # 4. Mostrar eventos a eliminar
    events = events_data.get("items", [])
    for i, event in enumerate(events[:10], 1):  # Mostrar primeros 10
        show_name = event.get("show", {}).get("name", "Desconocido")
        start_time = event.get("start_time", "")[:5]
        event_id = event.get("id")
        print(f"   {i}. {show_name} - {start_time} (ID: {event_id})")

    if total_events > 10:
        print(f"   ... y {total_events - 10} eventos más")

    # 5. Confirmar eliminación
    print(f"\n🗑️  Eliminando {total_events} eventos del {yesterday}...")

    deleted_count = 0
    failed_count = 0

    for event in events:
        event_id = event.get("id")
        if delete_event(token, event_id):
            deleted_count += 1
            if deleted_count % 5 == 0:
                print(f"   Progreso: {deleted_count}/{total_events} eliminados...")
        else:
            failed_count += 1

    # 6. Verificar resultado
    print(f"\n📊 Resultado de la limpieza:")
    print(f"   ✅ Eliminados: {deleted_count}")
    print(f"   ❌ Fallidos: {failed_count}")

    # 7. Verificación final
    print(f"\n🔍 Verificando que no queden eventos del {yesterday}...")
    verification_data = get_events_by_date(token, yesterday)

    if verification_data:
        remaining = verification_data.get("total", 0)
        if remaining == 0:
            print(f"✅ Verificación exitosa: No quedan eventos del {yesterday}")
        else:
            print(f"⚠️  Quedan {remaining} eventos del {yesterday}")

    print(f"\n🎉 Limpieza completada!")

if __name__ == "__main__":
    cleanup_old_events()