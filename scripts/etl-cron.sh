#!/bin/bash

# ShowsTrack ETL - Script de automatización para cron
# Ejecuta ETL cada 2 horas con fecha actual
# https://api.mobile.puydufouespana.com/nagios?debug&date=2025-03-28

# Configuración de logging
LOG_FILE="/workspace/logs/showstrack-etl.log"
ETL_DIR="/workspace/scripts/extraction"

# Crear directorio de logs si no existe
mkdir -p "$(dirname "$LOG_FILE")"

# Función de logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ETL-CRON] $1" | tee -a "$LOG_FILE"
}

# Activar entorno virtual si existe
if [ -f "/workspace/venv/bin/activate" ]; then
    source /workspace/venv/bin/activate
    log "Entorno virtual activado"
fi

# Navegar al directorio ETL
cd "$ETL_DIR" || {
    log "ERROR: No se pudo acceder al directorio $ETL_DIR"
    exit 1
}

# Obtener fecha actual y siguiente día
CURRENT_DATE=$(date +%Y-%m-%d)
NEXT_DATE=$(date -d '+1 day' +%Y-%m-%d)

log "Iniciando ETL para rango: $CURRENT_DATE a $NEXT_DATE"

# Ejecutar script ETL
python3 main.py --start-date "$CURRENT_DATE" --end-date "$NEXT_DATE" 2>&1 | while read -r line; do
    log "$line"
done

# Verificar código de salida
ETL_EXIT_CODE=${PIPESTATUS[0]}

if [ $ETL_EXIT_CODE -eq 0 ]; then
    log "✅ ETL ejecutado exitosamente para $CURRENT_DATE"
    
    # Verificar si se generó el archivo de salida
    OUTPUT_FILE="output/etl_api_$(date +%Y%m%d).json"
    if [ -f "$OUTPUT_FILE" ]; then
        EVENTS_COUNT=$(grep -o '"external_event_id"' "$OUTPUT_FILE" | wc -l)
        log "📊 Archivo generado: $OUTPUT_FILE ($EVENTS_COUNT eventos)"
    fi
else
    log "❌ ETL falló con código de salida: $ETL_EXIT_CODE"
    
    # Notificación de error (opcional - requiere configuración de mail)
    # echo "ETL ShowsTrack falló el $(date)" | mail -s "Error ETL ShowsTrack" admin@puydufou.com
fi

log "ETL cron finalizado"