#!/bin/bash
set -e

# ShowsTrack - Instalación de Cron y Configuración ETL
# Este script instala y configura cron para la ejecución automática del ETL

echo "🚀 Iniciando instalación de Cron y configuración ETL para ShowsTrack..."

# Verificar si se ejecuta como root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Este script debe ejecutarse como root (use sudo)"
    echo "💡 Ejemplo: sudo bash /workspace/install_cron_etl.sh"
    exit 1
fi

echo ""
echo "📦 Paso 1: Actualizando paquetes e instalando cron..."

# Actualizar paquetes
apt update -y

# Instalar cron si no está instalado
if ! command -v cron &> /dev/null; then
    echo "🟢 Instalando cron..."
    apt install -y cron
else
    echo "✅ Cron ya está instalado"
fi

echo ""
echo "🔧 Paso 2: Verificando scripts ETL..."

# Verificar que exista el script ETL
ETL_SCRIPT="/workspace/scripts/etl-cron.sh"
if [ ! -f "$ETL_SCRIPT" ]; then
    echo "❌ No se encuentra el script ETL: $ETL_SCRIPT"
    exit 1
fi

# Dar permisos de ejecución
chmod +x "$ETL_SCRIPT"
echo "✅ Script ETL encontrado y con permisos: $ETL_SCRIPT"

echo ""
echo "📁 Paso 3: Creando directorios necesarios..."

# Crear directorio de logs
mkdir -p /workspace/logs
echo "✅ Directorio de logs creado: /workspace/logs"

# Crear directorio de output para ETL
mkdir -p /workspace/scripts/extraction/output
echo "✅ Directorio de output ETL creado"

echo ""
echo "🔄 Paso 4: Iniciando y configurando servicio cron..."

# Iniciar servicio cron
service cron start

# Habilitar cron al arranque
update-rc.d cron enable

echo ""
echo "⏰ Paso 5: Configurando tarea ETL en crontab..."

# Verificar si el usuario dev existe
if ! id -u dev > /dev/null 2>&1; then
    echo "❌ El usuario 'dev' no existe"
    exit 1
fi

# Configurar crontab para el usuario dev
sudo -u dev bash -c 'echo "5 */2 * * * /workspace/scripts/etl-cron.sh" | crontab -'

echo ""
echo "✅ Paso 6: Verificación final..."

# Verificar estado del servicio
if service cron status > /dev/null 2>&1; then
    echo "✅ Servicio cron está corriendo"
else
    echo "❌ Error: Servicio cron no está corriendo"
    exit 1
fi

# Verificar crontab configurado
CRON_TASKS=$(sudo -u dev crontab -l 2>/dev/null | grep -v "^#" | wc -l)
if [ "$CRON_TASKS" -gt 0 ]; then
    echo "✅ Tareas cron configuradas para usuario dev:"
    sudo -u dev crontab -l 2>/dev/null
else
    echo "❌ No se encontraron tareas cron configuradas"
    exit 1
fi

echo ""
echo "🎉 ¡Instalación completada exitosamente!"
echo ""
echo "📋 Resumen de la configuración:"
echo "   • Servicio cron: ✅ Corriendo"
echo "   • Tarea ETL: ✅ Cada 2 horas a los 5 minutos (00:05, 02:05, 04:05...)"
echo "   • Script ETL: ✅ $ETL_SCRIPT"
echo "   • Logs: ✅ /workspace/logs/showstrack-etl.log"
echo "   • Usuario: ✅ dev"
echo ""
echo "🔍 Comandos útiles:"
echo "   • Ver estado cron: service cron status"
echo "   • Ver tareas configuradas: sudo -u dev crontab -l"
echo "   • Ver logs en tiempo real: tail -f /workspace/logs/showstrack-etl.log"
echo "   • Ejecutar ETL manualmente: sudo -u dev /workspace/scripts/etl-cron.sh"
echo ""
echo "📅 Próxima ejecución automática: $(date -d 'today 0:05 + 2 hours' '+%H:%M del %d/%m/%Y')"
echo ""
echo "✨ ¡ShowsTrack ETL está listo para funcionar automáticamente!"