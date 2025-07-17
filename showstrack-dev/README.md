# 🚀 ShowsTrack Development Environment - FAQ

## 📋 **Setup Inicial**

### ❓ **¿Cómo accedo al entorno de desarrollo?**
```bash
ssh dev@[IP_SERVIDOR] -p 222
# Password: **
```

### ❓ **¿Qué hago la primera vez que entro?**
```bash
# 1. Navegar al workspace
cd /workspace

# 2. Clonar el repositorio
git clone https://github.com/rvaquerizopdf/showstrack-app.git .

# 3. Crear entorno virtual Python
python3 -m venv venv

# 4. Activar entorno virtual
source venv/bin/activate

# 5. Instalar dependencias del backend


pip install -r requirements.txt
```

### ❓ **¿Cómo inicio el desarrollo después de la configuración inicial?**
```bash
# 1. SSH al container
ssh dev@[IP_SERVIDOR] -p 222

# 2. Activar entorno
cd /workspace && source venv/bin/activate

# 3. Arrancar backend
cd showstrack-backend/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🔧 **Desarrollo Diario**

### ❓ **¿Cuáles son las URLs importantes?**
- **Backend DEV**: `http://[IP_SERVIDOR]:8001`
- **API Docs**: `http://[IP_SERVIDOR]:8001/docs`
- **Backend PROD**: `http://[IP_SERVIDOR]:8000`

### ❓ **¿Cómo actualizo el código desde Git?**
```bash
cd /workspace
git pull origin main
```

### ❓ **¿Cómo hago commit de mis cambios?**
```bash
# Ver cambios
git status

# Agregar cambios
git add .

# Commit
git commit -m "descripción de los cambios"

# Push
git push origin main
```

### ❓ **¿Cómo creo una rama nueva?**
```bash
# Crear y cambiar a nueva rama
git checkout -b feature/nueva-funcionalidad

# Hacer cambios...

# Push de la nueva rama
git push origin feature/nueva-funcionalidad
```

---

## 🧪 **Testing y Verificación**

### ❓ **¿Cómo verifico que el entorno funciona correctamente?**
```bash
# Test básico
cd /workspace && source venv/bin/activate
./showstrack-dev/scripts/test_dev_stack_script.sh --basic

# Test completo
./showstrack-dev/scripts/test_dev_stack_script.sh --full
```

### ❓ **¿Cómo verifico la conexión a PostgreSQL?**
```bash
# Test de conectividad
python3 -c "
import socket
result = socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect_ex(('showstrack-postgres', 5432))
print('✅ PostgreSQL OK' if result == 0 else '❌ PostgreSQL FAILED')
"

# Test de conexión real
python3 -c "
import asyncpg, asyncio, os
async def test():
    try:
        url = os.environ['DATABASE_URL'].replace('postgresql+asyncpg://', 'postgresql://')
        conn = await asyncpg.connect(url)
        result = await conn.fetchval('SELECT version()')
        await conn.close()
        print(f'✅ DB OK: {result.split()[1]}')
    except Exception as e:
        print(f'❌ DB Error: {e}')
asyncio.run(test())
"
```

### ❓ **¿Cómo verifico que las variables de entorno están configuradas?**
```bash
echo $DATABASE_URL
echo $GIT_USER_NAME
echo $GIT_USER_EMAIL
```

---

## 🐛 **Resolución de Problemas**

### ❓ **No puedo conectar por SSH**
```bash
# Verificar que el container está corriendo
docker ps | grep showstrack-dev

# Ver logs del container
docker logs showstrack-dev

# Reiniciar container
docker restart showstrack-dev
```

### ❓ **Las variables de entorno están vacías**
```bash
# Verificar variables
env | grep -E "(DATABASE|POSTGRES|GIT)"

# Si están vacías, cargar manualmente
source ~/.env

# Verificar de nuevo
echo $DATABASE_URL
```

### ❓ **No se puede conectar a PostgreSQL**
```bash
# Verificar que PostgreSQL está corriendo
docker ps | grep postgres

# Verificar conectividad de red
python3 -c "
import socket
try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5)
    result = sock.connect_ex(('showstrack-postgres', 5432))
    print('✅ Red OK' if result == 0 else '❌ Red FAILED')
except Exception as e:
    print(f'❌ Error: {e}')
"
```

### ❓ **FastAPI no arranca**
```bash
# Verificar que el venv está activado
echo $VIRTUAL_ENV

# Si no, activar
source /workspace/venv/bin/activate

# Verificar dependencias
pip list | grep fastapi

# Si no están, instalar
pip install -r requirements.txt

# Verificar puerto
netstat -tlnp | grep 8000
```

### ❓ **Git no funciona correctamente**
```bash
# Verificar configuración
git config --list | grep user

# Configurar si es necesario
git config --global user.name "rvaquerizo"
git config --global user.email "rvaquerizo@puydufou.com"

# Verificar remoto
git remote -v
```

---

## 📁 **Estructura del Proyecto**

### ❓ **¿Cómo está organizado el workspace?**
```
/workspace/
├── showstrack-backend/backend/    # Backend FastAPI
├── showstrack-frontend/           # Frontend Vue.js
├── showstrack-dev/                # Configuración del entorno dev
├── venv/                          # Virtual environment Python
└── .git/                          # Repositorio Git
```

### ❓ **¿Dónde están los archivos importantes?**
- **Backend**: `/workspace/showstrack-backend/backend/`
- **Frontend**: `/workspace/showstrack-frontend/`
- **Configuración**: `/workspace/showstrack-dev/`
- **Tests**: `/workspace/showstrack-dev/scripts/`

---

## 🔄 **Flujo de Deploy**

### ❓ **¿Cómo despliego los cambios a producción?**
```bash
# 1. Hacer push de cambios
git push origin main

# 2. Actualizar código en producción
docker exec -it showstrack-backend bash
cd /app && git pull
exit

# 3. Reiniciar container de producción
docker restart showstrack-backend

# 4. Verificar
curl http://[IP_SERVIDOR]:8000/health
```

### ❓ **¿Cómo hago rollback si algo sale mal?**
```bash
# 1. Entrar al container de producción
docker exec -it showstrack-backend bash

# 2. Ver commits recientes
git log --oneline -5

# 3. Volver a commit anterior
git reset --hard [COMMIT_HASH]

# 4. Salir y reiniciar
exit
docker restart showstrack-backend
```

---

## 🧹 **Mantenimiento**

### ❓ **¿Cómo limpio archivos temporales?**
```bash
# Limpiar cache Python
find /workspace -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null

# Limpiar logs antiguos
find /workspace -name "*.log" -mtime +7 -delete 2>/dev/null

# Limpiar archivos temporales
find /workspace -name "*.tmp" -delete 2>/dev/null
```

### ❓ **¿Cómo actualizo las dependencias?**
```bash
# Activar entorno virtual
source /workspace/venv/bin/activate

# Actualizar pip
pip install --upgrade pip

# Actualizar dependencias
cd /workspace/showstrack-backend/backend
pip install --upgrade -r requirements.txt
```

### ❓ **¿Cómo hago backup del código?**
```bash
# Backup manual
docker run --rm -v showstrack_dev_workspace:/source -v /opt/backups:/backup ubuntu tar czf /backup/showstrack_workspace_$(date +%Y%m%d_%H%M%S).tar.gz -C /source .
```

---

## 🆘 **Comandos de Emergencia**

### ❓ **¿Cómo reinicio completamente el entorno?**
```bash
# ⚠️ ATENCIÓN: Esto borra todo el código local
docker stop showstrack-dev
docker rm showstrack-dev
docker volume rm showstrack_dev_workspace showstrack_dev_home

# Redeploy stack desde Portainer
```

### ❓ **¿Cómo restauro desde backup?**
```bash
# Restaurar workspace
docker run --rm -v showstrack_dev_workspace:/target -v /opt/backups:/backup ubuntu tar xzf /backup/showstrack_workspace_[TIMESTAMP].tar.gz -C /target
```

### ❓ **¿Cómo verifico el estado del sistema?**
```bash
# Ver procesos
ps aux

# Ver espacio en disco
df -h

# Ver memoria
free -h

# Ver red
ip addr show

# Ver logs del sistema
docker logs showstrack-dev
```

---

## 🎯 **Comandos Útiles**

### **Navegación rápida:**
```bash
alias st-dev="cd /workspace && source venv/bin/activate"
alias st-backend="cd /workspace/showstrack-backend/backend"
alias st-frontend="cd /workspace/showstrack-frontend"
```

### **Git útil:**
```bash
# Ver estado
git status

# Ver diferencias
git diff

# Ver historial
git log --oneline -10

# Descartar cambios
git checkout -- .
```

### **Python útil:**
```bash
# Ver paquetes instalados
pip list

# Instalar paquete
pip install nombre_paquete

# Generar requirements
pip freeze > requirements.txt
```

---
