#!/bin/bash

# =============================================================================
# SCRIPT DE PARADA SHOWSTRACK - VERSIÓN SIMPLE
# Detiene todos los servicios del sistema ShowsTrack
# =============================================================================

echo "🛑 Deteniendo ShowsTrack Development Stack..."

# Detener servicios usando PIDs si existen (compatible con Docker)
echo "🧹 Deteniendo servicios..."

# Backend
if [ -f "/workspace/backend.pid" ]; then
    BACKEND_PID=$(cat /workspace/backend.pid)
    kill $BACKEND_PID 2>/dev/null && echo "✅ Backend detenido (PID: $BACKEND_PID)"
    rm /workspace/backend.pid
else
    pkill -f "uvicorn app.main:app" 2>/dev/null && echo "✅ Backend detenido (sin PID)"
fi

# Vue Admin
if [ -f "/workspace/frontend-admin.pid" ]; then
    VUE_PID=$(cat /workspace/frontend-admin.pid)
    kill $VUE_PID 2>/dev/null && echo "✅ Vue Admin detenido (PID: $VUE_PID)"
    rm /workspace/frontend-admin.pid
else
    pkill -f "vite.*--port 3000" 2>/dev/null && echo "✅ Vue Admin detenido (sin PID)"
fi

# Pantallas Públicas
if [ -f "/workspace/frontend-public.pid" ]; then
    PUBLIC_PID=$(cat /workspace/frontend-public.pid)
    kill $PUBLIC_PID 2>/dev/null && echo "✅ Pantallas Públicas detenidas (PID: $PUBLIC_PID)"
    rm /workspace/frontend-public.pid
else
    pkill -f "python3 -m http.server 8080" 2>/dev/null && echo "✅ Pantallas Públicas detenidas (sin PID)"
fi

# Esperar a que los procesos terminen
sleep 3

# Verificar que no queden procesos
if ps aux | grep -E "(uvicorn|vite|http.server)" | grep -v grep > /dev/null; then
    echo "⚠️ Algunos procesos pueden seguir activos"
    echo "💡 Para forzar la parada: pkill -9 -f \"uvicorn\\|vite\\|http.server\""
    echo "📋 Para ver procesos activos: ps aux | grep -E \"(uvicorn|vite|http.server)\""
else
    echo "✅ Todos los servicios han sido detenidos correctamente"
fi

echo ""
echo "🎉 ShowsTrack detenido!"
echo "📁 Logs preservados en /workspace/*.log"

# =============================================================================
# COMENTARIOS DE MEJORAS FUTURAS
# =============================================================================

# TODO: Mejoras posibles para futuras versiones:
#
# 1. PARADA GRACEFUL:
#    - Enviar señal SIGTERM antes de SIGKILL
#    - Esperar confirmación de cada servicio
#    - Guardar estado antes de detener
#
# 2. VERIFICACIÓN:
#    - Verificar que los puertos se liberen
#    - Mostrar PIDs de procesos detenidos
#    - Log de parada con timestamp
#
# 3. OPCIONES:
#    - Parada selectiva de servicios
#    - Modo forzado (-f) para kill -9
#    - Modo silencioso (-q)