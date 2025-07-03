#!/bin/bash

# ==========================================
# ShowsTrack Dev Stack - Test Script v2.0
# ==========================================
# Uso:
#   ./test_showstrack_dev.sh --basic     # Test básico (stack recién creado)
#   ./test_showstrack_dev.sh --full      # Test completo (con código git)
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
SERVER_IP="localhost"  # Cambiar por IP real si es remoto
TEST_MODE=""

# Procesar argumentos
case "$1" in
    --basic)
        TEST_MODE="basic"
        echo "🧪 Testing ShowsTrack Development Stack - MODO BÁSICO"
        ;;
    --full)
        TEST_MODE="full"
        echo "🧪 Testing ShowsTrack Development Stack - MODO COMPLETO"
        ;;
    *)
        echo "Uso: $0 [--basic|--full]"
        echo "  --basic: Test básico (stack recién creado)"
        echo "  --full:  Test completo (con código git clonado)"
        exit 1
        ;;
esac

echo "========================================"

# ==========================================
# TEST 1: CONTENEDOR FUNCIONANDO
# ==========================================

info "1. Verificando contenedor..."

if docker ps | grep -q $CONTAINER_NAME; then
    success "Contenedor $CONTAINER_NAME está corriendo"
else
    error "Contenedor $CONTAINER_NAME no está corriendo"
    echo "Para iniciarlo: Portainer → Stacks → showstrack-dev → Start"
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

# Puertos de desarrollo
ports=("8001:FastAPI" "3001:Frontend-Admin" "8081:Frontend-Public")
for port_desc in "${ports[@]}"; do
    port=${port_desc%:*}
    desc=${port_desc#*:}
    if nc -z $SERVER_IP $port 2>/dev/null; then
        success "Puerto $desc ($port) está abierto"
    else
        warn "Puerto $desc ($port) no responde (normal si no hay app corriendo)"
    fi
done

# ==========================================
# TEST 3: LOGS DEL CONTENEDOR
# ==========================================

info "3. Verificando logs del contenedor..."

if docker logs $CONTAINER_NAME --tail 20 2>/dev/null | grep -q "ShowsTrack Development.*Ready"; then
    success "Contenedor inicializado correctamente"
else
    warn "Mensaje de inicio no encontrado en logs"
    echo "Últimos 5 logs:"
    docker logs $CONTAINER_NAME --tail 5
fi

# ==========================================
# TEST 4: VOLÚMENES (Consistente con el stack)
# ==========================================

info "4. Verificando volúmenes named..."

volumes=("showstrack_dev_workspace" "showstrack_dev_home")

for volume in "${volumes[@]}"; do
    if docker volume ls | grep -q $volume; then
        success "Volumen $volume existe"
        # Mostrar tamaño si es posible
        size=$(docker system df -v 2>/dev/null | grep $volume | awk '{print $3}' || echo "?")
        echo "   └─ Tamaño: $size"
    else
        error "Volumen $volume no existe"
    fi
done

# ==========================================
# TEST 5: CONEXIÓN SSH
# ==========================================

info "5. Testing conexión SSH..."

echo "Intentando conexión SSH (timeout 10s)..."
if timeout 10 ssh -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=no dev@$SERVER_IP -p $SSH_PORT "echo 'SSH OK'" 2>/dev/null; then
    success "Conexión SSH con clave funciona"
elif timeout 10 ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no dev@$SERVER_IP -p $SSH_PORT "echo 'SSH OK'" 2>/dev/null; then
    warn "SSH funciona pero pide contraseña"
    echo "   └─ Para evitar contraseña: ssh-copy-id dev@$SERVER_IP -p $SSH_PORT"
else
    warn "SSH no responde (verificar firewall o configuración)"
fi

# ==========================================
# TEST 6: SERVICIOS INTERNOS
# ==========================================

info "6. Verificando servicios internos..."

docker exec $CONTAINER_NAME bash -c '
    echo "Testing interno del contenedor:"
    
    # Usuario dev
    if id dev &>/dev/null; then
        echo "✅ Usuario dev existe"
        echo "   └─ Home: $(eval echo ~dev)"
    else
        echo "❌ Usuario dev no existe"
    fi
    
    # SSH daemon
    if pgrep sshd &>/dev/null; then
        echo "✅ SSH daemon corriendo"
    else
        echo "❌ SSH daemon no está corriendo"
    fi
    
    # Python
    if python3 --version &>/dev/null; then
        echo "✅ Python3: $(python3 --version)"
    else
        echo "❌ Python3 no instalado"
    fi
    
    # Node.js
    if node --version &>/dev/null; then
        echo "✅ Node.js: $(node --version)"
        echo "   └─ npm: $(npm --version)"
    else
        echo "❌ Node.js no instalado"
    fi
    
    # Git
    if git --version &>/dev/null; then
        echo "✅ Git: $(git --version)"
    else
        echo "❌ Git no instalado"
    fi
    
    # Claude Code
    if claude --version &>/dev/null 2>&1; then
        echo "✅ Claude Code: $(claude --version)"
    else
        echo "❌ Claude Code no instalado o no funciona"
    fi
    
    # Workspace básico
    if [ -d "/workspace" ]; then
        echo "✅ Directorio /workspace existe"
        echo "   └─ Propietario: $(stat -c %U:%G /workspace)"
        echo "   └─ Contenido: $(ls -la /workspace | wc -l) elementos"
    else
        echo "❌ Directorio /workspace no existe"
    fi
'

# ==========================================
# TESTS ESPECÍFICOS SEGÚN MODO
# ==========================================

if [ "$TEST_MODE" = "basic" ]; then
    info "7. Modo BÁSICO - Verificando configuración inicial..."
    
    docker exec $CONTAINER_NAME bash -c '
        # Git configurado
        if su - dev -c "git config --get user.name" &>/dev/null; then
            echo "✅ Git configurado para usuario dev"
            echo "   └─ Nombre: $(su - dev -c \"git config --get user.name\")"
            echo "   └─ Email: $(su - dev -c \"git config --get user.email\")"
        else
            echo "❌ Git no configurado para usuario dev"
        fi
        
        # Workspace preparado para git clone
        if [ -d "/workspace" ] && [ "$(ls -A /workspace 2>/dev/null | wc -l)" -eq 0 ]; then
            echo "✅ Workspace vacío y listo para git clone"
        elif [ -d "/workspace/.git" ]; then
            echo "ℹ️  Workspace ya tiene repositorio git"
        else
            echo "⚠️  Workspace no está vacío pero sin repositorio git"
        fi
    '
    
    echo ""
    info "PRÓXIMOS PASOS:"
    echo "1. SSH al contenedor: ssh dev@$SERVER_IP -p $SSH_PORT"
    echo "2. Clonar repositorio: cd /workspace && git clone REPO_URL ."
    echo "3. Ejecutar test completo: ./test_showstrack_dev.sh --full"

elif [ "$TEST_MODE" = "full" ]; then
    info "7. Modo COMPLETO - Verificando proyecto git..."
    
    docker exec $CONTAINER_NAME bash -c '
        # Repositorio git
        if [ -d "/workspace/.git" ]; then
            echo "✅ Repositorio git presente"
            echo "   └─ Remoto: $(cd /workspace && git remote get-url origin 2>/dev/null || echo \"Sin remoto\")"
            echo "   └─ Rama: $(cd /workspace && git branch --show-current 2>/dev/null || echo \"Sin rama\")"
        else
            echo "❌ No hay repositorio git en /workspace"
            echo "   Ejecutar: cd /workspace && git clone REPO_URL ."
            exit 1
        fi
        
        # Estructura del proyecto
        if [ -d "/workspace/showstrack-backend" ]; then
            echo "✅ Directorio showstrack-backend existe"
            if [ -d "/workspace/showstrack-backend/backend" ]; then
                echo "   └─ Subdirectorio backend: ✅"
            else
                echo "   └─ Subdirectorio backend: ❌"
            fi
        else
            echo "❌ Directorio showstrack-backend no encontrado"
        fi
        
        if [ -d "/workspace/showstrack-frontend" ]; then
            echo "✅ Directorio showstrack-frontend existe"
        else
            echo "⚠️  Directorio showstrack-frontend no encontrado"
        fi
        
        # Requirements.txt
        if [ -f "/workspace/showstrack-backend/backend/requirements.txt" ]; then
            echo "✅ requirements.txt encontrado"
            echo "   └─ Dependencias: $(wc -l < /workspace/showstrack-backend/backend/requirements.txt) líneas"
        else
            echo "❌ requirements.txt no encontrado"
        fi
    '
    
    info "8. Testing entorno Python..."
    
    docker exec $CONTAINER_NAME bash -c '
        # Crear y verificar venv si no existe
        if [ ! -d "/workspace/venv" ]; then
            echo "ℹ️  Creando virtual environment..."
            cd /workspace && python3 -m venv venv
        fi
        
        if [ -d "/workspace/venv" ]; then
            echo "✅ Virtual environment existe"
            
            # Test activación venv
            if su - dev -c "cd /workspace && source venv/bin/activate && python --version" &>/dev/null; then
                echo "✅ Virtual environment activable"
                
                # Test instalación básica
                if [ -f "/workspace/showstrack-backend/backend/requirements.txt" ]; then
                    echo "ℹ️  Instalando dependencias básicas..."
                    su - dev -c "cd /workspace && source venv/bin/activate && pip install -q fastapi uvicorn" 2>/dev/null || true
                    
                    if su - dev -c "cd /workspace && source venv/bin/activate && python -c \"import fastapi; print(f'FastAPI {fastapi.__version__}')\"" 2>/dev/null; then
                        echo "✅ FastAPI instalado y funcional"
                    else
                        echo "❌ FastAPI no instalado correctamente"
                    fi
                fi
            else
                echo "❌ No se puede activar virtual environment"
            fi
        else
            echo "❌ Virtual environment no se pudo crear"
        fi
    '
    
    info "9. Testing conectividad PostgreSQL..."
    
    docker exec $CONTAINER_NAME bash -c '
        if [ -n "$DATABASE_URL" ]; then
            echo "✅ Variable DATABASE_URL configurada"
            echo "   └─ DB: $(echo $DATABASE_URL | sed \"s/.*@//g\" | sed \"s/:.*//g\")"
            
            # Test ping a PostgreSQL
            pg_host=$(echo $DATABASE_URL | sed "s/.*@//g" | sed "s/:.*//g")
            if ping -c 1 -W 1 $pg_host &>/dev/null; then
                echo "✅ PostgreSQL host alcanzable ($pg_host)"
            else
                echo "❌ No se puede alcanzar PostgreSQL host ($pg_host)"
            fi
        else
            echo "❌ Variable DATABASE_URL no configurada"
        fi
    '
    
    echo ""
    info "ENTORNO LISTO PARA DESARROLLO:"
    echo "• Backend: cd /workspace/showstrack-backend/backend && source ../../venv/bin/activate"
    echo "• FastAPI: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
    echo "• Frontend: cd /workspace/showstrack-frontend && npm install && npm run dev"
    echo "• Claude Code: claude --help"
fi

# ==========================================
# RESUMEN FINAL
# ==========================================

echo ""
echo "🎯 INFORMACIÓN DEL ENTORNO"
echo "=========================="

info "Conexión SSH:"
echo "ssh dev@$SERVER_IP -p $SSH_PORT"

info "Acceso directo al contenedor:"
echo "docker exec -it $CONTAINER_NAME bash"

info "Logs del contenedor:"
echo "docker logs $CONTAINER_NAME -f"

info "Gestión en Portainer:"
echo "Volumes → Browse showstrack_dev_workspace"

echo ""
if [ "$TEST_MODE" = "basic" ]; then
    success "Test BÁSICO completado - Stack listo para git clone"
else
    success "Test COMPLETO completado - Entorno de desarrollo listo"
fi