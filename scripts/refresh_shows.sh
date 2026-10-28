#!/bin/bash

# ShowsTrack Refresh Shows - Script para actualizar horarios de shows
# Este script es un wrapper del ETL principal para facilitar la actualización manual

# Configuración
LOG_FILE="/workspace/logs/refresh-shows.log"
ETL_DIR="/workspace/scripts/extraction"
DEFAULT_DAYS=7

# Crear directorio de logs si no existe
mkdir -p "$(dirname "$LOG_FILE")"

# Función de ayuda
show_help() {
    echo "Uso: $0 [OPCIONES]"
    echo ""
    echo "Opciones:"
    echo "  --days N       Número de días a actualizar desde hoy (por defecto: $DEFAULT_DAYS)"
    echo "  --dry-run      Modo de prueba (no aplica cambios en la base de datos)"
    echo "  --help         Mostrar esta ayuda"
    echo ""
}

# Procesar argumentos
DAYS=$DEFAULT_DAYS
DRY_RUN_ARG=""
DRY_RUN_LABEL="PRODUCCIÓN"

while [[ $# -gt 0 ]]; do
    case $1 in
        --days)
            DAYS="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN_ARG="--dry-run"
            DRY_RUN_LABEL="TEST (DRY RUN)"
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "Error: Opción desconocida $1"
            show_help
            exit 1
            ;;
    esac
done

# Función de logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [REFRESH] $1" | tee -a "$LOG_FILE"
}

log "--------------------------------------------------"
log "Iniciando actualización de shows ($DRY_RUN_LABEL)"
log "Días a procesar: $DAYS"

# Navegar al directorio ETL
if [ ! -d "$ETL_DIR" ]; then
    log "ERROR: No se encontró el directorio ETL: $ETL_DIR"
    exit 1
fi

cd "$ETL_DIR" || exit 1

# Activar entorno virtual si existe
if [ -f "/workspace/venv/bin/activate" ]; then
    source /workspace/venv/bin/activate
    log "Entorno virtual activado"
fi

# Calcular fechas
START_DATE=$(date +%Y-%m-%d)
END_DATE=$(date -d "+$DAYS days" +%Y-%m-%d 2>/dev/null || date -v+"$DAYS"d +%Y-%m-%d 2>/dev/null)

if [ -z "$END_DATE" ]; then
    log "ERROR: No se pudo calcular la fecha de fin"
    exit 1
fi

log "Rango de fechas: $START_DATE hasta $END_DATE"

# Ejecutar el script ETL
log "Ejecutando ETL principal..."
python3 main.py --start-date "$START_DATE" --end-date "$END_DATE" $DRY_RUN_ARG 2>&1 | while read -r line; do
    log "$line"
done

# Verificar código de salida de la tubería
# Usamos PIPESTATUS para obtener el código de salida de python3, no de while
ETL_EXIT_CODE=${PIPESTATUS[0]}

if [ $ETL_EXIT_CODE -eq 0 ]; then
    log "✅ Actualización completada exitosamente."
else
    log "❌ Error en la ejecución del ETL (Código: $ETL_EXIT_CODE)."
    exit $ETL_EXIT_CODE
fi

log "Fin del proceso de actualización"
log "--------------------------------------------------"
