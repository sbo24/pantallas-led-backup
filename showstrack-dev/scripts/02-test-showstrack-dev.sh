#!/bin/bash

# ==========================================
# ShowsTrack Dev Stack - Test Script
# ==========================================

set -e

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# ==========================================
# CONFIGURACIÓN
# ==========================================

CONTAINER_NAME="showstrack-dev"
SSH_PORT="222"
SERVER_IP="172.26.131.240"  # Cambiar por IP real del servidor

echo "🧪 Testing ShowsTrack Development Stack"
echo "========================================"

# ==========================================
# TEST 1: CONTENEDOR FUNCIONANDO
# ==========================================

info "1. Verificando contenedor..."

if docker ps | grep -q $CONTAINER_NAME; then
    success "Contenedor $CONTAINER_NAME está corriendo"
else
    error "Contenedor $CONTAINER_NAME no está corriendo"
    echo "Para iniciarlo: docker-compose up -d"
    exit 1
fi

# ==========================================
# TEST 2: PUERTOS ABIERTOS
# ==========================================

info "2. Verificando puertos..."

# SSH Port
if nc -z $SERVER_IP $SSH_PORT 2>/dev/null; then
    success "Puerto SSH $SSH_PORT está abierto"
else
    error "Puerto SSH $SSH_PORT no responde"
fi

# FastAPI Dev Port
if nc -z $SERVER_IP 8001 2>/dev/null; then
    success "Puerto FastAPI 8001 está abierto"
else
    warn "Puerto FastAPI 8001 no responde (normal si no hay app corriendo)"
fi

# ==========================================
# TEST 3: LOGS DEL CONTENEDOR
# ==========================================

info "3. Verificando logs del contenedor..."

if docker logs $CONTAINER_NAME --tail 10 2>/dev/null | grep -q "ShowsTrack Development Ready"; then
    success "Contenedor inicializado correctamente"
else
    warn "Mensaje de inicio no encontrado en logs"
    echo "Últimos logs:"
    docker logs $CONTAINER_NAME --tail 5
fi

# ==========================================
# TEST 4: VOLÚMENES GESTIONADOS
# ==========================================

info "4. Verificando volúmenes..."

volumes=("showstrack_dev_workspace" "showstrack_dev_repos" "showstrack_dev_ssh")

for volume in "${volumes[@]}"; do
    if docker volume ls | grep -q $volume; then
        success "Volumen $volume existe"
    else
        error "Volumen $volume no existe"
    fi
done

# ==========================================
# TEST 5: CONEXIÓN SSH
# ==========================================

info "5. Testing conexión SSH..."

echo "Intentando conexión SSH (timeout 5s)..."
if timeout 5 ssh -o BatchMode=yes -o ConnectTimeout=5 dev@$SERVER_IP -p $SSH_PORT exit 2>/dev/null; then
    success "Conexión SSH con clave funciona"
elif timeout 5 ssh -o PasswordAuthentication=no -o ConnectTimeout=5 dev@$SERVER_IP -p $SSH_PORT exit 2>/dev/null; then
    warn "SSH responde pero necesita configurar claves"
else
    warn "SSH requiere contraseña (normal para primera conexión)"
fi

# ==========================================
# TEST 6: SERVICIOS INTERNOS
# ==========================================

info "6. Verificando servicios internos..."

# Ejecutar tests dentro del contenedor
docker exec $CONTAINER_NAME bash -c '
    echo "Testing interno del contenedor:"
    
    # Usuario dev existe
    if id dev &>/dev/null; then
        echo "✅ Usuario dev existe"
    else
        echo "❌ Usuario dev no existe"
    fi
    
    # Python instalado
    if python3 --version &>/dev/null; then
        echo "✅ Python3: $(python3 --version)"
    else
        echo "❌ Python3 no instalado"
    fi
    
    # Node.js instalado
    if node --version &>/dev/null; then
        echo "✅ Node.js: $(node --version)"
    else
        echo "❌ Node.js no instalado"
    fi
    
    # Git instalado
    if git --version &>/dev/null; then
        echo "✅ Git: $(git --version)"
    else
        echo "❌ Git no instalado"
    fi
    
    # Claude Code instalado
    if claude --version &>/dev/null; then
        echo "✅ Claude Code: $(claude --version)"
    else
        echo "❌ Claude Code no instalado o no funciona"
    fi
    
    # Estructura workspace
    if [ -d "/home/dev/workspace/showstrack-backend" ]; then
        echo "✅ Estructura backend creada"
    else
        echo "❌ Estructura backend no creada"
    fi
    
    # Virtual environment
    if [ -d "/home/dev/workspace/venv" ]; then
        echo "✅ Virtual environment existe"
    else
        echo "❌ Virtual environment no existe"
    fi
    
    # FastAPI instalado en venv
    if su - dev -c "source /home/dev/workspace/venv/bin/activate && python -c \"import fastapi; print(f'"'"'✅ FastAPI {fastapi.__version__} instalado'"'"')\"" 2>/dev/null; then
        :
    else
        echo "❌ FastAPI no instalado en venv"
    fi
    
    # Git configurado
    if su - dev -c "git config --get user.name" &>/dev/null; then
        echo "✅ Git configurado para dev"
    else
        echo "❌ Git no configurado"
    fi
'

# ==========================================
# TEST 7: CONECTIVIDAD BASE DE DATOS
# ==========================================

info "7. Testing conectividad PostgreSQL..."

docker exec $CONTAINER_NAME bash -c '
    if echo $DATABASE_URL | grep -q "postgresql"; then
        echo "✅ Variable DATABASE_URL configurada"
        
        # Test conexión PostgreSQL
        if su - dev -c "python3 -c \"import psycopg2; print('"'"'✅ psycopg2 disponible'"'"')\"" 2>/dev/null; then
            :
        else
            echo "❌ psycopg2 no disponible"
        fi
    else
        echo "❌ DATABASE_URL no configurada"
    fi
'

# ==========================================
# RESUMEN
# ==========================================

echo ""
echo "🎯 RESUMEN DEL TEST"
echo "=================="

info "Para conectarte por SSH:"
echo "ssh dev@$SERVER_IP -p $SSH_PORT"

info "Para acceder al contenedor directamente:"
echo "docker exec -it $CONTAINER_NAME bash"

info "Para activar entorno Python:"
echo "su - dev"
echo "cd /home/dev/workspace"
echo "source venv/bin/activate"

info "Para probar Claude Code:"
echo "claude --help"

info "Para verificar FastAPI:"
echo "cd showstrack-backend"
echo "uvicorn app.main:app --host 0.0.0.0 --port 8000"

warn "Si hay errores, revisar logs:"
echo "docker logs $CONTAINER_NAME -f"

echo ""
success "Test completado!"