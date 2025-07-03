#!/bin/bash

# ==========================================
# ShowsTrack Internal Dev Test Script v1.0
# ==========================================
# Uso INTERNO (desde dentro del container):
#   ./test_internal_dev.sh --basic     # Test básico (entorno configurado)
#   ./test_internal_dev.sh --full      # Test completo (con código y deps)
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

TEST_MODE=""

# Procesar argumentos
case "$1" in
    --basic)
        TEST_MODE="basic"
        echo "🧪 Testing ShowsTrack Internal Environment - MODO BÁSICO"
        ;;
    --full)
        TEST_MODE="full"
        echo "🧪 Testing ShowsTrack Internal Environment - MODO COMPLETO"
        ;;
    *)
        echo "Uso: $0 [--basic|--full]"
        echo "  --basic: Test básico (entorno configurado)"
        echo "  --full:  Test completo (con código y dependencias)"
        exit 1
        ;;
esac

echo "========================================"

# ==========================================
# TEST 1: USUARIO Y ENTORNO
# ==========================================

info "1. Verificando usuario y entorno..."

# Usuario actual
current_user=$(whoami)
if [ "$current_user" = "dev" ]; then
    success "Usuario correcto: $current_user"
else
    warn "Usuario actual: $current_user (esperado: dev)"
fi

# Home directory
if [ -d "/home/dev" ]; then
    success "Directorio home existe: /home/dev"
else
    error "Directorio home no existe"
fi

# Sudo access
if sudo -n true 2>/dev/null; then
    success "Usuario dev tiene acceso sudo"
else
    warn "Usuario dev sin acceso sudo (puede requerir contraseña)"
fi

# ==========================================
# TEST 2: HERRAMIENTAS BÁSICAS
# ==========================================

info "2. Verificando herramientas instaladas..."

# Python
if python3 --version &>/dev/null; then
    success "Python3: $(python3 --version)"
else
    error "Python3 no instalado"
fi

# Node.js
if node --version &>/dev/null; then
    success "Node.js: $(node --version)"
    echo "   └─ npm: $(npm --version)"
else
    error "Node.js no instalado"
fi

# Git
if git --version &>/dev/null; then
    success "Git: $(git --version)"
    
    # Git config
    git_name=$(git config --get user.name 2>/dev/null || echo "No configurado")
    git_email=$(git config --get user.email 2>/dev/null || echo "No configurado")
    echo "   └─ Nombre: $git_name"
    echo "   └─ Email: $git_email"
else
    error "Git no instalado"
fi

# Claude Code
if claude --version &>/dev/null 2>&1; then
    success "Claude Code: $(claude --version)"
else
    error "Claude Code no instalado o no funciona"
fi

# SSH daemon
if pgrep sshd &>/dev/null; then
    success "SSH daemon corriendo (PID: $(pgrep sshd | head -1))"
else
    error "SSH daemon no está corriendo"
fi

# ==========================================
# TEST 3: ESTRUCTURA WORKSPACE
# ==========================================

info "3. Verificando estructura workspace..."

if [ -d "/workspace" ]; then
    success "Directorio /workspace existe"
    
    # Propietario
    workspace_owner=$(stat -c %U:%G /workspace)
    echo "   └─ Propietario: $workspace_owner"
    
    # Contenido
    workspace_items=$(ls -la /workspace 2>/dev/null | wc -l)
    echo "   └─ Elementos: $((workspace_items - 3))"  # -3 por ., .. y total
    
    # Permisos de escritura
    if [ -w "/workspace" ]; then
        success "Permisos de escritura en /workspace"
    else
        error "Sin permisos de escritura en /workspace"
    fi
else
    error "Directorio /workspace no existe"
fi

# ==========================================
# TESTS ESPECÍFICOS SEGÚN MODO
# ==========================================

if [ "$TEST_MODE" = "basic" ]; then
    info "4. Modo BÁSICO - Verificando configuración inicial..."
    
    # Variables de entorno importantes
    echo "Variables de entorno importantes:"
    
    if [ -n "$DATABASE_URL" ]; then
        success "DATABASE_URL configurada"
        echo "   └─ Host: $(echo $DATABASE_URL | sed 's/.*@//g' | sed 's/:.*//g')"
    else
        warn "DATABASE_URL no configurada"
    fi
    
    if [ -n "$GIT_USER_NAME" ]; then
        success "GIT_USER_NAME configurada: $GIT_USER_NAME"
    else
        warn "GIT_USER_NAME no configurada"
    fi
    
    if [ -n "$SSH_ROOT_PASSWORD" ]; then
        success "SSH_ROOT_PASSWORD configurada"
    else
        warn "SSH_ROOT_PASSWORD no configurada"
    fi
    
    # Workspace preparado
    if [ -d "/workspace" ] && [ "$(ls -A /workspace 2>/dev/null | wc -l)" -eq 0 ]; then
        success "Workspace vacío y listo para git clone"
    elif [ -d "/workspace/.git" ]; then
        info "Workspace ya tiene repositorio git"
    else
        warn "Workspace no está vacío pero sin repositorio git"
    fi
    
    echo ""
    info "PRÓXIMOS PASOS:"
    echo "1. Clonar repositorio: cd /workspace && git clone REPO_URL ."
    echo "2. Ejecutar test completo: ./test_internal_dev.sh --full"

elif [ "$TEST_MODE" = "full" ]; then
    info "4. Modo COMPLETO - Verificando proyecto..."
    
    # Git repository
    if [ -d "/workspace/.git" ]; then
        success "Repositorio git presente"
        
        cd /workspace
        git_remote=$(git remote get-url origin 2>/dev/null || echo "Sin remoto")
        git_branch=$(git branch --show-current 2>/dev/null || echo "Sin rama")
        git_status=$(git status --porcelain 2>/dev/null | wc -l)
        
        echo "   └─ Remoto: $git_remote"
        echo "   └─ Rama: $git_branch"
        echo "   └─ Archivos modificados: $git_status"
    else
        error "No hay repositorio git en /workspace"
        echo "   Ejecutar: cd /workspace && git clone REPO_URL ."
        exit 1
    fi
    
    # Estructura del proyecto
    if [ -d "/workspace/showstrack-backend" ]; then
        success "Directorio showstrack-backend existe"
        
        if [ -d "/workspace/showstrack-backend/backend" ]; then
            success "   └─ Subdirectorio backend existe"
            
            # main.py
            if [ -f "/workspace/showstrack-backend/backend/app/main.py" ]; then
                success "   └─ main.py encontrado"
            else
                warn "   └─ main.py no encontrado"
            fi
            
            # requirements.txt
            if [ -f "/workspace/showstrack-backend/backend/requirements.txt" ]; then
                success "   └─ requirements.txt encontrado"
                deps_count=$(wc -l < /workspace/showstrack-backend/backend/requirements.txt)
                echo "      └─ Dependencias: $deps_count líneas"
            else
                error "   └─ requirements.txt no encontrado"
            fi
        else
            error "   └─ Subdirectorio backend no existe"
        fi
    else
        error "Directorio showstrack-backend no encontrado"
    fi
    
    if [ -d "/workspace/showstrack-frontend" ]; then
        success "Directorio showstrack-frontend existe"
    else
        warn "Directorio showstrack-frontend no encontrado"
    fi
    
    info "5. Verificando entorno Python..."
    
    # Virtual environment
    if [ -d "/workspace/venv" ]; then
        success "Virtual environment existe en /workspace/venv"
        
        # Verificar activación
        if [ -n "$VIRTUAL_ENV" ]; then
            success "Virtual environment activado: $VIRTUAL_ENV"
            
            # FastAPI instalado
            if python -c "import fastapi; print(f'FastAPI {fastapi.__version__}')" 2>/dev/null; then
                success "FastAPI instalado y funcional"
            else
                error "FastAPI no instalado correctamente"
            fi
            
            # Otras dependencias importantes
            deps_check=()
            
            if python -c "import uvicorn" 2>/dev/null; then
                deps_check+=("uvicorn ✅")
            else
                deps_check+=("uvicorn ❌")
            fi
            
            if python -c "import sqlalchemy" 2>/dev/null; then
                deps_check+=("sqlalchemy ✅")
            else
                deps_check+=("sqlalchemy ❌")
            fi
            
            if python -c "import asyncpg" 2>/dev/null; then
                deps_check+=("asyncpg ✅")
            else
                deps_check+=("asyncpg ❌")
            fi
            
            echo "   └─ Dependencias: ${deps_check[*]}"
            
        else
            warn "Virtual environment no activado"
            echo "   └─ Activar con: source /workspace/venv/bin/activate"
        fi
    else
        warn "Virtual environment no existe"
        echo "   └─ Crear con: cd /workspace && python3 -m venv venv"
    fi
    
    info "6. Testing conectividad PostgreSQL..."
    
    if [ -n "$DATABASE_URL" ]; then
        success "Variable DATABASE_URL configurada"
        
        # Extraer host de DATABASE_URL
        pg_host=$(echo $DATABASE_URL | sed 's/.*@//g' | sed 's/:.*//g')
        echo "   └─ Host PostgreSQL: $pg_host"
        
        # Test ping
        if ping -c 1 -W 1 $pg_host &>/dev/null; then
            success "PostgreSQL host alcanzable ($pg_host)"
        else
            error "No se puede alcanzar PostgreSQL host ($pg_host)"
        fi
        
        # Test conexión Python (si venv está activado)
        if [ -n "$VIRTUAL_ENV" ]; then
            if python -c "
import asyncpg
import asyncio
import os

async def test_connection():
    try:
        conn = await asyncpg.connect(os.environ['DATABASE_URL'])
        result = await conn.fetchval('SELECT version()')
        await conn.close()
        print(f'✅ Conexión PostgreSQL exitosa')
        print(f'   └─ Versión: {result.split()[1]}')
        return True
    except Exception as e:
        print(f'❌ Error conexión PostgreSQL: {str(e)[:50]}...')
        return False

asyncio.run(test_connection())
" 2>/dev/null; then
                :  # Success message already printed by Python
            else
                warn "No se pudo conectar a PostgreSQL (revisar credenciales)"
            fi
        fi
    else
        error "Variable DATABASE_URL no configurada"
    fi
    
    echo ""
    info "ENTORNO LISTO PARA DESARROLLO:"
    echo "• Backend: cd /workspace/showstrack-backend/backend"
    echo "• Activar venv: source /workspace/venv/bin/activate"
    echo "• FastAPI: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
    echo "• API Docs: http://YOUR_IP:8001/docs"
    echo "• Claude Code: claude --help"
fi

# ==========================================
# RESUMEN FINAL
# ==========================================

echo ""
echo "🎯 INFORMACIÓN DEL ENTORNO"
echo "=========================="

info "Workspace actual:"
echo "$(pwd)"

info "Variables importantes:"
echo "• DATABASE_URL: ${DATABASE_URL:0:50}..."
echo "• VIRTUAL_ENV: ${VIRTUAL_ENV:-No activado}"
echo "• USER: $(whoami)"

echo ""
if [ "$TEST_MODE" = "basic" ]; then
    success "Test BÁSICO completado - Entorno configurado"
else
    success "Test COMPLETO completado - Listo para desarrollo"
fi

echo ""
info "Para más detalles del entorno:"
echo "• Procesos: ps aux"
echo "• Red: netstat -tlnp"
echo "• Logs container: exit && docker logs showstrack-dev"