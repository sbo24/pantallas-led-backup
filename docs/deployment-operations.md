# 🚀 ShowsTrack APP - Despliegue y Operaciones

## 7.1 Infraestructura

### Stack de Infraestructura

**Componentes Principales**:
- **Backend API**: FastAPI + Uvicorn
- **Base de Datos**: PostgreSQL 15
- **Frontend Admin**: Vue.js SPA servido por Nginx
- **Frontend Público**: Archivos estáticos servidos por el backend
- **Contenedores**: Docker para todos los servicios
- **Orquestación**: docker-compose para desarrollo y producción

### Arquitectura de Contenedores

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Base de Datos PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: showstrack-db
    environment:
      POSTGRES_DB: ${DB_NAME:-showstrack}
      POSTGRES_USER: ${DB_USER:-showstrack}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db:/docker-entrypoint-initdb.d
    ports:
      - "${DB_PORT:-5432}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-showstrack}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - showstrack-network

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: showstrack-api
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      SECRET_KEY: ${SECRET_KEY}
      ENVIRONMENT: ${ENVIRONMENT:-production}
      CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost:3000}
    volumes:
      - ./backend:/app
      - static_files:/app/static
    ports:
      - "${API_PORT:-8000}:8000"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - showstrack-network

  # Frontend Admin (Vue.js)
  frontend-admin:
    build:
      context: ./frontend-admin
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL:-http://localhost:8000}
    container_name: showstrack-admin
    volumes:
      - admin_dist:/app/dist
    networks:
      - showstrack-network

  # Nginx para servir frontends
  nginx:
    image: nginx:alpine
    container_name: showstrack-nginx
    ports:
      - "${HTTP_PORT:-80}:80"
      - "${HTTPS_PORT:-443}:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - admin_dist:/var/www/admin:ro
      - static_files:/var/www/public:ro
    depends_on:
      - backend
      - frontend-admin
    networks:
      - showstrack-network

volumes:
  postgres_data:
  static_files:
  admin_dist:

networks:
  showstrack-network:
    driver: bridge
```

### Configuración de Nginx

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Upstream para API
    upstream api_backend {
        server backend:8000;
    }

    # Server block principal
    server {
        listen 80;
        server_name _;

        # API Backend
        location /api {
            proxy_pass http://api_backend;
            proxy_set_header Host $http_host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts para requests largos (importación)
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # Panel Admin (Vue.js SPA)
        location /admin {
            alias /var/www/admin;
            try_files $uri $uri/ /admin/index.html;
            
            # Cache para assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # Frontend Público
        location / {
            root /var/www/public;
            index index.html;
            
            # Cache moderado para HTML
            location ~* \.html$ {
                expires 1h;
                add_header Cache-Control "public, must-revalidate";
            }
            
            # Cache largo para assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
                expires 30d;
                add_header Cache-Control "public";
            }
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

### Variables de Entorno

```bash
# .env.production
# Base de Datos
DB_NAME=showstrack_prod
DB_USER=showstrack_user
DB_PASSWORD=SecurePasswordHere
DB_PORT=5432

# Backend
SECRET_KEY=your-secret-key-here-must-be-secure
ENVIRONMENT=production
CORS_ORIGINS=https://showstrack.yourdomain.com
API_PORT=8000

# Frontend
VITE_API_URL=https://showstrack.yourdomain.com
VITE_REFRESH_INTERVAL=30000

# External APIs
PUY_DU_FOU_API_KEY=your-api-key
PUY_DU_FOU_API_URL=https://api.puydufou.es/v1

# Monitoring
SENTRY_DSN=your-sentry-dsn-if-using
LOG_LEVEL=INFO

# Nginx
HTTP_PORT=80
HTTPS_PORT=443

### Dockerfiles

**Backend Dockerfile**:
```dockerfile
# backend/Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -s /bin/bash appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run migrations and start server
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

**Frontend Admin Dockerfile**:
```dockerfile
# frontend-admin/Dockerfile
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build arguments
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config if needed
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

## 7.2 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy ShowsTrack

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: showstrack_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install -r requirements-dev.txt
      
      - name: Run tests
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/showstrack_test
        run: |
          cd backend
          pytest tests/ -v --cov=app --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v3
      
      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push Backend
        uses: docker/build-push-action@v4
        with:
          context: ./backend
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:latest
      
      - name: Build and push Frontend
        uses: docker/build-push-action@v4
        with:
          context: ./frontend-admin
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:latest
          build-args: |
            VITE_API_URL=${{ secrets.PRODUCTION_API_URL }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Production
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/showstrack
            docker-compose pull
            docker-compose up -d
            docker system prune -f
```

### Scripts de Deployment

**deploy.sh**:
```bash
#!/bin/bash
# deploy.sh - Script de despliegue

set -e

echo "🚀 Iniciando despliegue de ShowsTrack..."

# Variables
ENVIRONMENT=${1:-production}
BACKUP_BEFORE_DEPLOY=${BACKUP_BEFORE_DEPLOY:-true}

# Validar entorno
if [[ ! "$ENVIRONMENT" =~ ^(production|staging)$ ]]; then
    echo "❌ Entorno inválido: $ENVIRONMENT"
    exit 1
fi

# Cargar variables de entorno
source .env.$ENVIRONMENT

# Backup de base de datos
if [ "$BACKUP_BEFORE_DEPLOY" = "true" ]; then
    echo "📦 Creando backup de base de datos..."
    ./scripts/backup-db.sh
fi

# Pull últimas imágenes
echo "📥 Descargando últimas imágenes..."
docker-compose -f docker-compose.$ENVIRONMENT.yml pull

# Ejecutar migraciones
echo "🗄️ Ejecutando migraciones..."
docker-compose -f docker-compose.$ENVIRONMENT.yml run --rm backend alembic upgrade head

# Reiniciar servicios
echo "🔄 Reiniciando servicios..."
docker-compose -f docker-compose.$ENVIRONMENT.yml up -d

# Esperar a que los servicios estén listos
echo "⏳ Esperando a que los servicios estén listos..."
./scripts/wait-for-healthy.sh

# Verificar salud
echo "🏥 Verificando salud del sistema..."
curl -f http://localhost/health || exit 1

echo "✅ Despliegue completado exitosamente!"
```

**rollback.sh**:
```bash
#!/bin/bash
# rollback.sh - Script de rollback

set -e

echo "⚠️ Iniciando rollback..."

# Variables
BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "❌ Uso: ./rollback.sh <backup_file>"
    exit 1
fi

# Confirmar
read -p "¿Estás seguro de hacer rollback? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Rollback cancelado"
    exit 0
fi

# Detener servicios
echo "🛑 Deteniendo servicios..."
docker-compose down

# Restaurar base de datos
echo "📥 Restaurando base de datos..."
./scripts/restore-db.sh $BACKUP_FILE

# Volver a versión anterior
echo "🔄 Volviendo a versión anterior..."
git checkout HEAD~1
docker-compose build
docker-compose up -d

echo "✅ Rollback completado"
```

## 7.3 Monitoreo y Alertas

### Health Checks

**Endpoint de Health Check Completo**:
```python
# backend/app/api/health.py
from fastapi import APIRouter, Depends
from sqlalchemy import text
from app.db.session import get_db

router = APIRouter()

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Health check completo del sistema.
    """
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "checks": {}
    }
    
    # Check database
    try:
        await db.execute(text("SELECT 1"))
        health_status["checks"]["database"] = {
            "status": "healthy",
            "response_time_ms": 5
        }
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Check external API
    try:
        # Verificar conectividad con API externa
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.puydufou.es/health",
                timeout=5.0
            )
            health_status["checks"]["external_api"] = {
                "status": "healthy" if response.status_code == 200 else "degraded"
            }
    except:
        health_status["checks"]["external_api"] = {
            "status": "degraded",
            "note": "External API unreachable"
        }
    
    # Métricas operacionales
    health_status["metrics"] = {
        "active_shows": await count_active_shows(),
        "todays_events": await count_todays_events(),
        "active_overrides": await count_active_overrides()
    }
    
    return health_status
```

### Métricas y Logging

**Configuración de Logging Estructurado**:
```python
# backend/app/core/logging.py
import logging
import json
from pythonjsonlogger import jsonlogger

def setup_logging():
    """
    Configura logging estructurado en formato JSON.
    """
    logHandler = logging.StreamHandler()
    formatter = jsonlogger.JsonFormatter(
        fmt='%(timestamp)s %(level)s %(name)s %(message)s'
    )
    logHandler.setFormatter(formatter)
    
    logger = logging.getLogger()
    logger.addHandler(logHandler)
    logger.setLevel(logging.INFO)
    
    # Log de ejemplo
    logger.info(
        "Application started",
        extra={
            "environment": os.getenv("ENVIRONMENT"),
            "version": "1.0.0"
        }
    )
```

**Métricas Prometheus** (opcional):
```python
# backend/app/core/metrics.py
from prometheus_client import Counter, Histogram, Gauge

# Contadores
api_requests_total = Counter(
    'api_requests_total',
    'Total API requests',
    ['method', 'endpoint', 'status']
)

import_events_total = Counter(
    'import_events_total',
    'Total events imported',
    ['source']
)

# Histogramas
request_duration = Histogram(
    'request_duration_seconds',
    'Request duration',
    ['method', 'endpoint']
)

# Gauges
active_shows = Gauge(
    'active_shows_total',
    'Total active shows'
)

active_overrides = Gauge(
    'active_overrides_total',
    'Total active overrides'
)
```

### Alertas Operativas

**Configuración de Alertas**:
```yaml
# monitoring/alerts.yml
groups:
  - name: showstrack_alerts
    interval: 30s
    rules:
      # API no responde
      - alert: APIDown
        expr: up{job="showstrack-api"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "ShowsTrack API is down"
          description: "API has been down for more than 2 minutes"
      
      # Alta latencia
      - alert: HighLatency
        expr: histogram_quantile(0.95, request_duration_seconds) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency"
          description: "95th percentile latency is above 2s"
      
      # Errores de importación
      - alert: ImportFailures
        expr: rate(import_errors_total[5m]) > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Import failures detected"
          description: "Import error rate is above 10%"
      
      # Sin datos nuevos
      - alert: NoRecentImports
        expr: time() - last_successful_import_timestamp > 86400
        labels:
          severity: warning
        annotations:
          summary: "No imports in 24 hours"
          description: "No successful imports in the last 24 hours"
```

## 7.4 Mantenimiento

### Backup Automático

**Script de Backup**:
```bash
#!/bin/bash
# scripts/backup-db.sh

set -e

# Variables
BACKUP_DIR="/opt/showstrack/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/showstrack_backup_$TIMESTAMP.sql"

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Ejecutar backup
echo "📦 Creando backup de base de datos..."
docker-compose exec -T postgres pg_dump \
    -U $DB_USER \
    -d $DB_NAME \
    > $BACKUP_FILE

# Comprimir
gzip $BACKUP_FILE

# Limpiar backups antiguos (mantener últimos 30 días)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "✅ Backup completado: ${BACKUP_FILE}.gz"
```

**Cron para Backup Diario**:
```cron
# Backup diario a las 2 AM
0 2 * * * /opt/showstrack/scripts/backup-db.sh >> /var/log/showstrack/backup.log 2>&1
```

### Limpieza de Datos

**Script de Limpieza**:
```python
# backend/app/tasks/cleanup.py
import asyncio
from datetime import datetime, timedelta
from app.db.session import async_session
from app.models import ScheduledEvent, AuditLog

async def cleanup_old_data():
    """
    Limpia datos antiguos de la base de datos.
    """
    async with async_session() as db:
        # Eliminar eventos de más de 90 días
        cutoff_date = datetime.now() - timedelta(days=90)
        
        deleted_events = await db.execute(
            delete(ScheduledEvent).where(
                ScheduledEvent.event_date < cutoff_date.date()
            )
        )
        
        # Limpiar logs de más de 180 días
        log_cutoff = datetime.now() - timedelta(days=180)
        
        deleted_logs = await db.execute(
            delete(AuditLog).where(
                AuditLog.timestamp < log_cutoff
            )
        )
        
        await db.commit()
        
        print(f"Limpieza completada: {deleted_events.rowcount} eventos, {deleted_logs.rowcount} logs")
```

### Actualización de Dependencias

**Script de Actualización**:
```bash
#!/bin/bash
# scripts/update-dependencies.sh

echo "📦 Actualizando dependencias..."

# Backend Python
cd backend
pip install --upgrade pip
pip install pip-tools
pip-compile requirements.in --upgrade
pip install -r requirements.txt

# Frontend Node
cd ../frontend-admin
npm update
npm audit fix

# Ejecutar tests
cd ..
./scripts/run-tests.sh

echo "✅ Dependencias actualizadas"
```

### Procedimientos de Emergencia

**1. API No Responde**:
```bash
# Verificar logs
docker logs showstrack-api --tail 100

# Reiniciar servicio
docker-compose restart backend

# Si persiste, rollback
./scripts/rollback.sh last_known_good
```

**2. Base de Datos Corrupta**:
```bash
# Detener servicios
docker-compose stop

# Restaurar último backup
./scripts/restore-db.sh /backups/latest.sql.gz

# Reiniciar
docker-compose up -d
```

**3. Importación Fallida**:
```bash
# Verificar logs de importación
tail -f /var/log/showstrack/import.log

# Ejecutar importación manual
docker-compose exec backend python -m app.tasks.manual_import

# Cambiar a modo manual si es necesario
curl -X PUT http://localhost/api/admin/config/global \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"operation_mode": "manual"}'
```

---

*Esta guía de despliegue y operaciones proporciona todos los elementos necesarios para mantener ShowsTrack APP funcionando de manera confiable en producción.*