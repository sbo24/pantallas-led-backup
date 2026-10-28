#!/usr/bin/env python3
"""
Script manual para capturar datos de la API de Puy du Fou e importarlos en ShowsTrack.

Uso básico:
  cd /workspace && python3 scripts/manual_import.py

Con rango de fechas específico:
  python3 scripts/manual_import.py --start 2026-03-15 --end 2026-03-21

Modo prueba (sin guardar en base de datos):
  python3 scripts/manual_import.py --dry-run
"""

import sys
import os
import json
import re
import time
import requests
import argparse
import logging
from datetime import datetime, timedelta

# ──────────────────────────────────────────────
# Configuración
# ──────────────────────────────────────────────

# URL de la API de Puy du Fou España
PDF_API_BASE = "https://api.mobile.puydufouespana.com/nagios"

# URL de la API de ShowsTrack (ajusta si es necesario)
SHOWSTRACK_API_URL = os.getenv("SHOWSTRACK_API_URL", "http://localhost:8000")
SHOWSTRACK_USERNAME = os.getenv("SHOWSTRACK_USERNAME", "admin")
SHOWSTRACK_PASSWORD = os.getenv("SHOWSTRACK_PASSWORD", "admin")

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("/workspace/logs/manual_import.log", encoding="utf-8")
    ]
)
log = logging.getLogger(__name__)

os.makedirs("/workspace/logs", exist_ok=True)


# ──────────────────────────────────────────────
# Paso 1: Captura de datos de la API de Puy du Fou
# ──────────────────────────────────────────────

def fetch_api_for_date(date_str: str, max_retries: int = 3) -> str | None:
    """Descarga los datos de la API para una fecha concreta."""
    url = f"{PDF_API_BASE}?debug&date={date_str}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    delay = 2
    for attempt in range(1, max_retries + 1):
        try:
            log.info(f"  → Consultando API para {date_str} (intento {attempt}/{max_retries})")
            resp = requests.get(url, headers=headers, timeout=15)
            resp.raise_for_status()
            log.info(f"  ✓ Respuesta recibida: {len(resp.text)} caracteres")
            return resp.text
        except requests.RequestException as e:
            log.warning(f"  ✗ Error: {e}")
            if attempt < max_retries:
                log.info(f"  Esperando {delay}s antes de reintentar...")
                time.sleep(delay)
                delay *= 2
    return None


def parse_time(raw: str) -> str:
    """Convierte hora en formato HHMM a HH:MM."""
    raw = raw.strip()
    if len(raw) == 4 and raw.isdigit():
        return f"{raw[:2]}:{raw[2:]}"
    return raw


def calculate_end_time(start_hhmm: str, duration_minutes: int) -> str:
    """Calcula hora de fin dado inicio (HHMM) y duración en minutos."""
    h, m = int(start_hhmm[:2]), int(start_hhmm[2:])
    total = h * 60 + m + duration_minutes
    return f"{(total // 60):02d}:{(total % 60):02d}"


def extract_events_from_response(text: str, date_str: str) -> list[dict]:
    """Extrae los eventos del formato PHP de la respuesta de la API."""
    events = []
    start_marker = "=> Check PuyDuFou DB Content for table V_GrilleHoraire"
    end_marker   = "=> Check Local DB Opening date"

    start_pos = text.find(start_marker)
    if start_pos == -1:
        log.warning(f"  ⚠ No se encontró la sección de datos para {date_str}")
        return []

    end_pos = text.find(end_marker, start_pos)
    block_text = text[start_pos: end_pos if end_pos != -1 else len(text)]

    event_pattern = (
        r'array\(8\)\s*\{\s*'
        r'\["Gh_date"\]=>.*?'
        r'\["Gh_evenementid"\]=>.*?'
        r'\["Gh_evenement"\]=>.*?'
        r'\["Gh_type"\]=>.*?'
        r'\["Gh_duree"\]=>.*?'
        r'\["Gh_heuredebut"\]=>.*?'
        r'\["Gh_heurefin"\]=>.*?'
        r'\["Gh_etat"\]=>.*?'
        r'\}'
    )
    blocks = re.findall(event_pattern, block_text, re.DOTALL)
    log.info(f"  ✓ {len(blocks)} eventos encontrados para {date_str}")

    for block in blocks:
        def extract(field):
            m = re.search(rf'\["{field}"\]=>\s*string\(\d+\)\s*"([^"]*)"', block)
            return m.group(1).strip() if m else ""

        event_id   = extract("Gh_evenementid")
        event_name = extract("Gh_evenement")
        event_type = extract("Gh_type")   # "Show", "Apertura / Cierre", "Restauration"…
        duration   = extract("Gh_duree")
        start_raw  = extract("Gh_heuredebut")
        end_raw    = extract("Gh_heurefin")

        # ── FILTRO: solo espectáculos y apertura/cierre del parque ──
        ALLOWED_TYPES = {"Show", "Apertura / Cierre"}
        if event_type not in ALLOWED_TYPES:
            continue

        if not start_raw:
            continue

        start_fmt = parse_time(start_raw)
        if end_raw:
            end_fmt = parse_time(end_raw)
        else:
            try:
                end_fmt = calculate_end_time(start_raw, int(duration))
            except Exception:
                end_fmt = start_fmt

        try:
            duration_int = int(duration)
        except Exception:
            duration_int = 0

        # ID único: combina EventoID + fecha + hora
        date_compact = date_str.replace("-", "")
        start_compact = start_raw.replace(":", "")
        unique_id = f"{event_id}_{date_compact}_{start_compact}" if event_id else f"unknown_{date_compact}_{start_compact}"

        is_system = event_type == "Apertura / Cierre"

        events.append({
            "external_event_id": unique_id,
            "show_name": event_name,
            "event_date": date_str,
            "start_time": start_fmt,
            "end_time": end_fmt,
            "duration_minutes": duration_int,
            "event_type": "system" if is_system else "show",
        })

    return events


# ──────────────────────────────────────────────
# Paso 2: Preparar payload para ShowsTrack
# ──────────────────────────────────────────────

def build_showstrack_payload(all_events: list[dict]) -> dict:
    """Construye el JSON en el formato que espera la API /api/admin/import."""
    now = datetime.now().isoformat()
    dates = sorted(set(e["event_date"] for e in all_events))
    shows = {}
    for e in all_events:
        shows[e["show_name"]] = shows.get(e["show_name"], 0) + 1

    return {
        "metadata": {
            "extraction_time": now,
            "total_events": len(all_events),
            "date_range": dates,
            "source": "puy_du_fou_api",
            "version": "1.0",
            "extraction_summary": {
                "events_by_type": {
                    "show":   sum(1 for e in all_events if e["event_type"] == "show"),
                    "system": sum(1 for e in all_events if e["event_type"] == "system"),
                },
                "events_by_show": shows,
                "events_by_date": {d: sum(1 for e in all_events if e["event_date"] == d) for d in dates},
                "unique_shows": len(shows),
                "date_range_days": len(dates),
            }
        },
        "events": all_events,
    }


# ──────────────────────────────────────────────
# Paso 3: Autenticación e importación en ShowsTrack
# ──────────────────────────────────────────────

def get_jwt_token(api_url: str, username: str, password: str) -> str | None:
    """Obtiene un token JWT de ShowsTrack."""
    try:
        resp = requests.post(
            f"{api_url}/api/admin/auth/login",
            data={"username": username, "password": password},
            timeout=30,
        )
        if resp.status_code == 200:
            token = resp.json().get("access_token")
            log.info("  ✓ Autenticación en ShowsTrack correcta")
            return token
        log.error(f"  ✗ Error de autenticación: {resp.status_code} - {resp.text}")
    except Exception as e:
        log.error(f"  ✗ No se pudo conectar a ShowsTrack: {e}")
    return None


def send_to_showstrack(payload: dict, token: str, api_url: str, dry_run: bool = False) -> dict:
    """Envía el payload al endpoint de importación de ShowsTrack."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    body = {
        "data": payload,
        "dry_run": dry_run,
        "preserve_overrides": True,
    }
    try:
        resp = requests.post(
            f"{api_url}/api/admin/import",
            json=body,
            headers=headers,
            timeout=120,
        )
        if resp.status_code in (200, 201):
            result = resp.json()
            return {"success": True, "result": result}
        else:
            return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(
        description="Captura datos de la API de Puy du Fou e importa en ShowsTrack"
    )
    parser.add_argument(
        "--start", dest="start_date",
        default=datetime.now().strftime("%Y-%m-%d"),
        help="Fecha de inicio YYYY-MM-DD (por defecto: hoy)"
    )
    parser.add_argument(
        "--end", dest="end_date",
        default=None,
        help="Fecha de fin YYYY-MM-DD (por defecto: 6 días después del inicio)"
    )
    parser.add_argument(
        "--days", type=int, default=None,
        help="Número de días a procesar desde --start (alternativa a --end)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Solo validar datos, sin guardar en la base de datos"
    )
    parser.add_argument(
        "--save-json", action="store_true",
        help="Guardar el JSON generado en scripts/extraction/output/"
    )
    return parser.parse_args()


def main():
    args = parse_args()

    # Calcular rango de fechas
    try:
        start = datetime.strptime(args.start_date, "%Y-%m-%d")
    except ValueError:
        log.error(f"Formato de fecha incorrecto: {args.start_date}. Use YYYY-MM-DD")
        sys.exit(1)

    if args.days:
        end = start + timedelta(days=args.days - 1)
    elif args.end_date:
        try:
            end = datetime.strptime(args.end_date, "%Y-%m-%d")
        except ValueError:
            log.error(f"Formato de fecha incorrecto: {args.end_date}. Use YYYY-MM-DD")
            sys.exit(1)
    else:
        end = start + timedelta(days=6)  # Por defecto: 7 días

    dates = []
    cur = start
    while cur <= end:
        dates.append(cur.strftime("%Y-%m-%d"))
        cur += timedelta(days=1)

    log.info("=" * 60)
    log.info(f"🚀 Importación manual ShowsTrack")
    log.info(f"   Rango: {dates[0]} → {dates[-1]}  ({len(dates)} días)")
    log.info(f"   Modo:  {'DRY-RUN (sin cambios en BD)' if args.dry_run else 'PRODUCCIÓN'}")
    log.info("=" * 60)

    # ── PASO 1: Captura de datos ──
    log.info("\n📡 PASO 1: Capturando datos de la API de Puy du Fou...")
    all_events = []
    for date_str in dates:
        text = fetch_api_for_date(date_str)
        if text:
            events = extract_events_from_response(text, date_str)
            all_events.extend(events)
        else:
            log.warning(f"  ⚠ Sin datos para {date_str}")

    if not all_events:
        log.error(f"\n❌ No se obtuvieron eventos. Verifica el rango de fechas.")
        log.info("   Nota: La API de Puy du Fou España solo devuelve datos durante la temporada.")
        sys.exit(1)

    log.info(f"\n✅ Total de eventos capturados: {len(all_events)}")

    # ── PASO 2: Construir payload ──
    log.info("\n📦 PASO 2: Preparando datos para ShowsTrack...")
    payload = build_showstrack_payload(all_events)

    if args.save_json:
        os.makedirs("scripts/extraction/output", exist_ok=True)
        filename = f"scripts/extraction/output/manual_{dates[0]}_{dates[-1]}.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        log.info(f"  ✓ JSON guardado en {filename}")

    # ── PASO 3: Importar en ShowsTrack ──
    log.info(f"\n🔗 PASO 3: Importando en ShowsTrack ({SHOWSTRACK_API_URL})...")
    token = get_jwt_token(SHOWSTRACK_API_URL, SHOWSTRACK_USERNAME, SHOWSTRACK_PASSWORD)
    if not token:
        log.error("❌ No se pudo autenticar. Verifica las variables SHOWSTRACK_USERNAME y SHOWSTRACK_PASSWORD.")
        sys.exit(1)

    result = send_to_showstrack(payload, token, SHOWSTRACK_API_URL, dry_run=args.dry_run)

    if result["success"]:
        r = result["result"]
        log.info("\n" + "=" * 60)
        log.info("✅ IMPORTACIÓN COMPLETADA")
        log.info(f"   Estado:   {r.get('status', '-')}")
        log.info(f"   Mensaje:  {r.get('message', '-')}")
        log.info(f"   Aplicado: {'Sí' if r.get('applied') else 'No (modo manual/dry-run)'}")
        vr = r.get("validation_result", {})
        if vr:
            log.info(f"   Eventos:  {vr.get('total_events', 0)} total  |  "
                     f"{vr.get('new_events', 0)} nuevos  |  "
                     f"{vr.get('updated_events', 0)} actualizados")
        log.info("=" * 60)
    else:
        log.error(f"\n❌ Error al importar: {result['error']}")
        sys.exit(1)


if __name__ == "__main__":
    main()
