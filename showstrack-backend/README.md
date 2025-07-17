# ShowsTrack Backend

Backend API de ShowsTrack construido con FastAPI, SQLAlchemy y PostgreSQL.

## 🚀 Inicio Rápido

### Requisitos Previos
- Python 3.10+
- PostgreSQL 15+
- Virtual environment activado

### Instalación
```bash
# Activar entorno virtual
source /workspace/venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar base de datos (primera vez)
alembic upgrade head

# Iniciar servidor de desarrollo
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### URLs Principales
- **API**: `http://localhost:8000`
- **Documentación**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health`

## 🏗️ Arquitectura

### Estructura del Proyecto
```
backend/
├── app/
│   ├── main.py              # Aplicación FastAPI principal
│   ├── models/              # Modelos SQLAlchemy
│   │   ├── __init__.py
│   │   ├── base.py          # Configuración base
│   │   ├── show.py          # Modelo Show
│   │   ├── event.py         # Modelo ScheduledEvent
│   │   ├── override.py      # Modelo StatusOverride
│   │   ├── settings.py      # Modelo GlobalSettings
│   │   ├── alert.py         # Modelo GlobalAlert
│   │   ├── audit.py         # Modelo AuditLog
│   │   └── user.py          # Modelos User y Role
│   └── database/            # Configuración de base de datos
│       ├── __init__.py
│       ├── connection.py    # Engine async
│       └── session.py       # Session factory
├── alembic/                 # Migraciones de base de datos
│   ├── env.py              # Configuración Alembic
│   ├── versions/           # Archivos de migración
│   └── script.py.mako      # Template migraciones
├── alembic.ini             # Configuración Alembic
└── requirements.txt        # Dependencias Python
```

## 🗄️ Base de Datos

### Modelos Implementados
- **`shows`**: Catálogo maestro de espectáculos
- **`scheduled_events`**: Eventos programados (FK → shows)
- **`status_overrides`**: Overrides manuales de estado (FK → scheduled_events)
- **`global_settings`**: Configuración del sistema (JSONB)
- **`global_alerts`**: Alertas globales del sistema
- **`audit_logs`**: Registro de auditoría
- **`users`**: Usuarios del sistema (FK → roles)
- **`roles`**: Roles y permisos

### Relaciones de Base de Datos
- **Shows → ScheduledEvents** (1:N): Un show tiene múltiples eventos
- **ScheduledEvents → StatusOverride** (1:0..1): Un evento puede tener un override
- **Roles → Users** (1:N): Un rol puede tener múltiples usuarios

Para documentación detallada de relaciones, ver: `/docs/database-relationships.md`

### Configuración de Base de Datos
```python
# Variables de entorno
DATABASE_URL=postgresql+asyncpg://showstrack_user:password@showstrack-postgres:5432/showstrack_main
```

### Migraciones
```bash
# Crear nueva migración
alembic revision --autogenerate -m "Descripción del cambio"

# Aplicar migraciones
alembic upgrade head

# Ver estado actual
alembic current

# Ver historial
alembic history
```

## 📚 Stack Tecnológico

### Dependencias Principales
- **FastAPI 0.104.1**: Framework web async
- **SQLAlchemy 2.0.23**: ORM para base de datos
- **asyncpg 0.29.0**: Driver PostgreSQL async
- **Alembic 1.12.1**: Migraciones de base de datos
- **Pydantic 2.4.2**: Validación de datos
- **psutil 5.9.6**: Métricas del sistema
- **psycopg2-binary 2.9.9**: Driver PostgreSQL sync (migraciones)

### Características Técnicas
- **Async/Await**: Toda la aplicación es asíncrona
- **Type Hints**: Tipado completo en Python
- **Validation**: Modelos Pydantic para validación
- **Migrations**: Sistema de migraciones Alembic
- **Health Monitoring**: Endpoint robusto con métricas

## 🔧 Desarrollo

### Comandos Útiles
```bash
# Verificar estado de la base de datos
alembic check

# Ejecutar tests (cuando estén disponibles)
python -m pytest

# Verificar health check
curl http://localhost:8000/health

# Ver documentación interactiva
curl http://localhost:8000/docs
```

### Estructura de Respuesta Health
```json
{
  "status": "healthy",
  "timestamp": "2025-07-17T14:05:28.360799",
  "version": "1.0.0",
  "uptime": 62.95,
  "database": {
    "status": "healthy",
    "version": ["PostgreSQL", "15.13"],
    "tables_count": 9,
    "response_time_ms": 67.68
  },
  "system": {
    "cpu_percent": 22.2,
    "memory": {"percent": 16.8},
    "disk": {"percent": 24.43}
  },
  "components": {
    "database": {"healthy": true},
    "system": {"healthy": true},
    "api": {"healthy": true}
  }
}
```

## 🔐 Configuración

### Variables de Entorno
```bash
# Base de datos
DATABASE_URL=postgresql+asyncpg://user:password@host:port/database

# Aplicación
SECRET_KEY=your_secret_key_here
ENVIRONMENT=development
DEBUG=true

# API
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
LOG_LEVEL=INFO
```

## 📈 Monitoreo

### Health Check
El endpoint `/health` proporciona información detallada del sistema:
- Estado de la base de datos PostgreSQL
- Métricas del sistema (CPU, memoria, disco)
- Tiempo de respuesta de componentes
- Estado de componentes críticos

### Logs
Los logs de la aplicación incluyen:
- Requests HTTP
- Errores de base de datos
- Métricas de rendimiento
- Auditoría de acciones

## 🚀 Despliegue

### Docker
```bash
# Construir imagen
docker build -t showstrack-backend .

# Ejecutar contenedor
docker run -p 8000:8000 showstrack-backend
```

### Producción
- Configurar variables de entorno apropiadas
- Ejecutar migraciones: `alembic upgrade head`
- Usar servidor WSGI como Gunicorn
- Configurar monitoreo y logging

## 📖 Documentación Adicional

Para documentación completa del sistema, consultar:
- `/docs` - Documentación completa del proyecto
- `/docs/api-specification.md` - Especificación de la API
- `/docs/data-model.md` - Modelo de datos detallado
- `/docs/database-relationships.md` - Relaciones y constraints detallados

## 📊 Estado del Proyecto

**Última actualización**: 2025-07-17

### Implementado ✅
- Modelos SQLAlchemy completos
- Sistema de migraciones Alembic
- Health endpoint robusto
- Configuración async completa
- Documentación de API

### Próximos Pasos 🔄
- Implementar endpoints CRUD
- Sistema de autenticación JWT
- Lógica de estados de shows
- Tests unitarios
- Integración con frontend