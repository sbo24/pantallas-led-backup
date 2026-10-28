#!/bin/bash

# =============================================================================
# SCRIPT DE INICIO SHOWSTRACK - COMPATIBLE CON DOCKER STACK
# Levanta todos los servicios del sistema ShowsTrack
# Compatible con el autostart automático del stack Docker
# =============================================================================

echo "🚀 Iniciando ShowsTrack Development Stack..."

# Ir al directorio de trabajo
cd /workspace

# =============================================================================
# SCRIPT UNIFICADO DE INICIO - MÉTODO ÚNICO
# No hay detección Docker vs manual - este es EL script oficial
# =============================================================================

# Limpiar procesos previos
echo "🧹 Limpiando procesos previos..."
pkill -f "uvicorn\|vite\|http.server" 2>/dev/null
sleep 3

# Crear estructura de logs compatible con Docker (sin subdirectorio)
# Los logs van directamente en /workspace/ para compatibilidad total

# Activar entorno virtual Python
source venv/bin/activate

# =============================================================================
# INICIAR SERVICIOS EN SEGUNDO PLANO (estructura compatible con Docker)
# =============================================================================

echo "📦 Iniciando Backend FastAPI (puerto 8000)..."
cd showstrack-backend/backend
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > /workspace/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /workspace/backend.pid

echo "🖥️ Iniciando Vue Admin (puerto 3000)..."
cd /workspace/showstrack-frontend/showstrack-admin
nohup npm run dev -- --host 0.0.0.0 --port 3000 > /workspace/frontend-admin.log 2>&1 &
VUE_PID=$!
echo $VUE_PID > /workspace/frontend-admin.pid

echo "📺 Iniciando Pantallas Públicas (puerto 8080 con servidor multi-hilo CORS)..."
cd /workspace/frontend-public
nohup python3 cors_server.py > /workspace/frontend-public.log 2>&1 &
PUBLIC_PID=$!
echo $PUBLIC_PID > /workspace/frontend-public.pid

# Esperar a que los servicios se inicialicen
echo "⏳ Esperando servicios (15 segundos)..."
sleep 15

# =============================================================================
# VERIFICACIÓN Y CONFIGURACIÓN DE CRON ETL
# =============================================================================

echo "🔄 Verificando automatización ETL..."

# Verificar si cron está corriendo y tiene la tarea configurada
if service cron status >/dev/null 2>&1 && crontab -l 2>/dev/null | grep -q "etl-cron.sh"; then
    echo "✅ Cron ETL: Servicio corriendo y tarea configurada"
else
    echo "⚠️  Cron ETL no está listo — ejecutando install_cron_etl.sh..."
    if [ "$EUID" -eq 0 ]; then
        bash /workspace/install_cron_etl.sh
    else
        sudo bash /workspace/install_cron_etl.sh
    fi
fi

echo ""

# =============================================================================
# VERIFICACIÓN SIMPLE
# =============================================================================

echo "🔍 Verificando servicios..."
curl -s http://localhost:8000/health | grep -q "healthy" && echo "✅ Backend: OK" || echo "❌ Backend: ERROR"
curl -s http://localhost:3000/ | grep -q "html" && echo "✅ Vue Admin: OK" || echo "❌ Vue Admin: ERROR"
curl -s http://localhost:8080/ | grep -q "html" && echo "✅ Pantallas Públicas: OK" || echo "❌ Pantallas Públicas: ERROR"

echo ""
echo "🎉 ShowsTrack iniciado correctamente!"
echo ""
echo "🔗 URLs de acceso:"
echo "   🏠 Vue Admin Local: http://localhost:3000/"
echo "   🏠 Backend API Local: http://localhost:8000/docs"
echo "   🏠 Pantallas Públicas Local: http://localhost:8080/"
echo ""
echo "   🎯 Vue Admin Externo: http://172.26.131.240:3001/"
echo "   🎯 Backend API Externo: http://172.26.131.240:8001/docs"
echo "   🎯 Pantallas Públicas Externo: http://172.26.131.240:8081/"
echo ""
echo "📋 Ver logs:"
echo "   Backend: tail -f /workspace/backend.log"
echo "   Vue Admin: tail -f /workspace/frontend-admin.log"
echo "   Pantallas: tail -f /workspace/frontend-public.log"
echo "   ETL: tail -f /workspace/logs/showstrack-etl.log"
echo ""
echo "📊 PIDs guardados en:"
echo "   Backend: /workspace/backend.pid ($BACKEND_PID)"
echo "   Vue Admin: /workspace/frontend-admin.pid ($VUE_PID)"
echo "   Pantallas: /workspace/frontend-public.pid ($PUBLIC_PID)"
echo ""
echo "🔄 ETL Manual: /workspace/scripts/etl-cron.sh"
echo "🛑 Detener: /workspace/stop_showstrack.sh"

# =============================================================================
# COMENTARIOS DE MEJORAS FUTURAS
# =============================================================================

# TODO: Mejoras posibles para futuras versiones:
#
# 1. VERIFICACIÓN AVANZADA:
#    - Verificar puertos antes de iniciar
#    - Verificar dependencias (node, python, etc.)
#    - Verificar conectividad de base de datos
#
# 2. GESTIÓN DE ERRORES:
#    - Reintentos automáticos si un servicio falla
#    - Rollback automático si algún servicio no inicia
#    - Notificaciones de error más detalladas
#
# 3. CONFIGURACIÓN:
#    - Variables de entorno configurable por archivo .env
#    - Perfiles de configuración (dev, staging, prod)
#    - Configuración de puertos personalizable
#
# 4. MONITOREO:
#    - Health checks periódicos automáticos
#    - Restart automático de servicios caídos
#    - Métricas de rendimiento
#
# 5. LOGS MEJORADOS:
#    - Rotación automática de logs
#    - Logs centralizados con timestamps
#    - Filtrado de logs por nivel (debug, info, error)
#
# 6. SERVICIOS ADICIONALES:
#    - Integración con PostgreSQL
#    - Reverse proxy con Nginx
#    - SSL/TLS automático
#
# 7. DESARROLLO:
#    - Hot reload inteligente
#    - Tests automáticos antes del inicio
#    - Linting automático
#
# 8. DEPLOYMENT:
#    - Integración con Docker Compose
#    - CI/CD hooks
#    - Backup automático antes de cambios