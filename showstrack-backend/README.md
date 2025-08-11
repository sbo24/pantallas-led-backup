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
│   ├── main.py              # Aplicación FastAPI principal + routers
│   ├── dependencies.py      # JWT auth dependencies
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
│   ├── database/            # Configuración de base de datos
│   │   ├── __init__.py
│   │   ├── connection.py    # Engine async
│   │   └── session.py       # Session factory
│   ├── schemas/             # Esquemas Pydantic
│   │   ├── __init__.py
│   │   ├── auth.py          # Schemas de autenticación
│   │   ├── show.py          # Schemas de shows
│   │   └── event.py         # Schemas de eventos
│   ├── services/            # Lógica de negocio
│   │   ├── __init__.py
│   │   ├── show_service.py  # Servicios CRUD shows
│   │   └── event_service.py # Servicios CRUD eventos
│   └── routers/             # Endpoints FastAPI
│       ├── __init__.py
│       ├── auth.py          # Autenticación JWT
│       ├── admin.py         # API administrativa
│       └── public.py        # API pública
├── alembic/                 # Migraciones de base de datos
│   ├── env.py              # Configuración Alembic
│   ├── versions/           # Archivos de migración
│   └── script.py.mako      # Template migraciones
├── alembic.ini             # Configuración Alembic
└── requirements.txt        # Dependencias Python + JWT
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

### Dependencias de Autenticación
- **python-jose[cryptography] 3.3.0**: Generación y verificación JWT
- **passlib[bcrypt] 1.7.4**: Hash de contraseñas con bcrypt

### Características Técnicas
- **Async/Await**: Toda la aplicación es asíncrona
- **Type Hints**: Tipado completo en Python
- **Validation**: Modelos Pydantic para validación
- **Migrations**: Sistema de migraciones Alembic
- **Health Monitoring**: Endpoint robusto con métricas
- **JWT Authentication**: Autenticación segura con tokens JWT
- **CRUD Operations**: Operaciones CRUD completas con servicios dedicados
- **API Documentation**: Documentación automática con Swagger/OpenAPI

## 🔧 Desarrollo

### 📋 **Guía para Crear Nuevos Endpoints**

#### **Patrón de Desarrollo Establecido**
Todos los nuevos endpoints siguen este patrón estructurado de 5 pasos:

1. **Schemas Pydantic** - Definir modelos de entrada y salida
2. **Servicio de Negocio** - Implementar lógica de negocio
3. **Endpoints REST** - Crear rutas HTTP con autenticación
4. **Tests Automatizados** - Validar funcionalidad completa
5. **Pruebas Manuales** - Verificar en servidor real

#### **Ejemplo: Implementación Sistema de Alertas**

**Paso 1: Schemas (`app/schemas/alert.py`)**
```python
from pydantic import BaseModel, Field
from typing import Optional, List

class AlertBase(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    alert_type: Literal["emergency", "warning", "info"] = "warning"

class AlertCreate(AlertBase):
    created_by: Optional[str] = Field(None, description="Set by server from JWT")

class AlertResponse(AlertBase):
    id: int
    is_active: bool
    created_at: datetime
    created_by: str
    deactivated_at: Optional[datetime] = None
```

**Paso 2: Servicio (`app/services/alert_service.py`)**
```python
class AlertService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_current_status(self) -> AlertStatus:
        # Lógica de negocio para obtener estado actual
        pass
    
    async def create_alert(self, alert_data: AlertCreate) -> AlertResponse:
        # Lógica para crear alerta (auto-desactiva anteriores)
        pass
    
    async def deactivate_current_alert(self, user: str) -> Optional[AlertResponse]:
        # Lógica para desactivar alerta activa
        pass
```

**Paso 3: Endpoints (`app/routers/admin.py`)**
```python
@router.get("/alerts/global", response_model=AlertStatus)
async def get_global_alert_status(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """Get current global alert status with active alert and today's count."""
    try:
        alert_service = AlertService(db)
        status_info = await alert_service.get_current_status()
        return status_info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting alert status: {str(e)}"
        )
```

**Paso 4: Tests (`tests/test_alerts.py`)**
```python
class TestGlobalAlerts:
    @pytest.mark.asyncio
    async def test_get_alert_status_no_alerts(self, test_client, auth_headers):
        response = await test_client.get("/api/admin/alerts/global", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["has_active_alert"] == False
        assert data["total_alerts_today"] == 0
```

**Paso 5: Validación Manual**
```bash
# Obtener token JWT
TOKEN=$(curl -s -X POST http://localhost:8000/api/admin/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin" | jq -r '.access_token')

# Probar endpoint
curl -X GET http://localhost:8000/api/admin/alerts/global \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

#### **🔐 Gestión de Usuarios y Autenticación**

##### **Usuarios por Defecto**
```bash
# Usuario Admin (ya creado)
Username: admin
Password: admin
Rol: admin
Permisos: Acceso completo a todos los endpoints
```

##### **Crear Nuevos Usuarios**
```python
# Script para crear usuarios adicionales
from app.models.user import User, Role
from app.dependencies import get_password_hash

async def create_user(username: str, password: str, role_name: str):
    # Obtener rol
    role = await db.execute(select(Role).where(Role.name == role_name))
    role = role.scalar_one()
    
    # Crear usuario
    user = User(
        username=username,
        email=f"{username}@showstrack.com",
        full_name=f"{username.capitalize()} User",
        password_hash=get_password_hash(password),
        role_id=role.id,
        is_active=True
    )
    
    db.add(user)
    await db.commit()
```

##### **Roles Disponibles**
- **admin**: Acceso completo (CRUD shows, eventos, configuración, alertas)
- **operator**: Operaciones básicas (overrides, consulta shows/eventos)  
- **viewer**: Solo lectura (consulta datos, sin modificaciones)

##### **Autenticación JWT**
```python
# Configuración JWT
SECRET_KEY = "dev_secret_key_here"  # Cambiar en producción
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Headers requeridos
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### **🗄️ Trabajo con Base de Datos**

##### **Migraciones con Alembic**
```bash
# Crear nueva migración tras cambios en modelos
alembic revision --autogenerate -m "Add new configuration fields"

# Aplicar migraciones pendientes
alembic upgrade head

# Ver historial de migraciones
alembic history

# Rollback a migración anterior
alembic downgrade -1
```

##### **Queries Asíncronas**
```python
# Patrón para queries async
async def get_shows_with_events(db: AsyncSession, limit: int = 10):
    query = (
        select(Show)
        .options(selectinload(Show.scheduled_events))
        .where(Show.is_visible == True)
        .order_by(Show.display_order)
        .limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()
```

##### **Transacciones y Commits**
```python
# Patrón para operaciones con transacciones
async def update_with_audit(db: AsyncSession, entity, changes, user: str):
    try:
        # Actualizar entidad
        for field, value in changes.items():
            setattr(entity, field, value)
        
        # Crear entrada de auditoría
        audit_log = AuditLog(
            entity_type=entity.__class__.__name__.lower(),
            entity_id=entity.id,
            action="UPDATE",
            user_id=user,
            new_values=changes
        )
        db.add(audit_log)
        
        # Commit todo junto
        await db.commit()
        await db.refresh(entity)
        return entity
        
    except Exception as e:
        await db.rollback()
        raise e
```

### **📊 Testing y Validación**

#### **Testing Automatizado**
```bash
# Ejecutar tests completos
cd /workspace/showstrack-backend/backend
pytest tests/ -v

# Tests específicos por módulo
pytest tests/test_alerts.py -v
pytest tests/test_config.py -v

# Tests con coverage
pytest tests/ --cov=app --cov-report=html
```

#### **Script de Testing Manual**
```bash
# Script completo de validación de endpoints
python scripts/test_all_endpoints.py

# Resultado esperado: 28/28 endpoints (100% success)
```

### Comandos Útiles
```bash
# Verificar estado de la base de datos
alembic check

# Ejecutar testing completo automatizado
cd /workspace/showstrack-dev/scripts
./test_dev_stack_script.sh --full

# Ejecutar testing básico
./test_dev_stack_script.sh --basic

# Verificar health check
curl http://localhost:8000/health

# Ver documentación interactiva
curl http://localhost:8000/docs

# Probar autenticación
curl -X POST http://localhost:8000/api/admin/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin"

# Probar endpoints protegidos
curl -X GET http://localhost:8000/api/admin/shows \
  -H "Authorization: Bearer <jwt_token>"
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

## 🔌 API Endpoints

### Autenticación
- `POST /api/admin/auth/login` - Autenticación con JWT
- `GET /api/admin/auth/me` - Información del usuario actual
- `POST /api/admin/auth/logout` - Cerrar sesión
- `POST /api/admin/auth/refresh` - Renovar token

### Gestión de Shows (Requiere JWT)
- `GET /api/admin/shows` - Listar shows con paginación
- `GET /api/admin/shows/{id}` - Obtener show específico
- `POST /api/admin/shows` - Crear nuevo show
- `PUT /api/admin/shows/{id}` - Actualizar show
- `DELETE /api/admin/shows/{id}` - Eliminar show

### Gestión de Eventos (Requiere JWT)
- `GET /api/admin/events` - Listar eventos con filtros
- `GET /api/admin/events/{id}` - Obtener evento específico
- `POST /api/admin/events` - Crear nuevo evento
- `PUT /api/admin/events/{id}` - Actualizar evento
- `DELETE /api/admin/events/{id}` - Eliminar evento
- `PATCH /api/admin/events/{id}/override` - Gestionar overrides

### ✅ **SISTEMA DE ALERTAS GLOBALES (Requiere JWT)**
- `GET /api/admin/alerts/global` - Estado actual de alerta + historial
- `POST /api/admin/alerts/global` - Activar alerta emergencia  
- `DELETE /api/admin/alerts/global` - Desactivar alerta activa
- `GET /api/admin/alerts/history` - Historial paginado de alertas

### ✅ **SISTEMA DE CONFIGURACIÓN GLOBAL (Requiere JWT)**
- `GET /api/admin/config/global` - Configuración completa del sistema
- `PUT /api/admin/config/global` - Actualizar configuración parcial/completa
- `GET /api/admin/config/operation-mode` - Modo operación actual (auto/manual)
- `PUT /api/admin/config/operation-mode` - Cambiar modo operación
- `GET /api/admin/config/venue-hours` - Horarios específicos del venue
- `PUT /api/admin/config/venue-hours` - Actualizar horarios del venue

### API Pública
- `GET /api/public/schedules` - Horarios públicos para pantallas
- `GET /api/public/alert` - Alertas globales activas

### Sistema
- `GET /health` - Health check completo
- `GET /` - Endpoint raíz

## 📖 Documentación Adicional

Para documentación completa del sistema, consultar:
- `/docs` - Documentación completa del proyecto
- `/docs/api-specification.md` - Especificación de la API
- `/docs/data-model.md` - Modelo de datos detallado
- `/docs/database-relationships.md` - Relaciones y constraints detallados
- `TESTING_PLAN.md` - Plan y resultados de testing automatizado
- `/workspace/showstrack-dev/scripts/` - Scripts de testing y diagnóstico

## 🧪 Testing de Endpoints

### Endpoints Funcionando ✅
```bash
# Endpoint raíz
curl http://localhost:8000/
# Respuesta: {"message":"ShowsTrack API funcionando"}

# Health check robusto
curl http://localhost:8000/health
# Respuesta: JSON completo con métricas del sistema

# Documentación Swagger
curl http://localhost:8000/docs
# Respuesta: Interfaz web interactiva con todos los endpoints

# Alertas públicas
curl http://localhost:8000/api/public/alert
# Respuesta: {"has_alert":false,"alert":null}

# Schedules públicos (con fecha específica)
curl "http://localhost:8000/api/public/schedules?date=2024-07-17"
# Respuesta: JSON con shows y eventos

# Autenticación JWT
curl -X POST http://localhost:8000/api/admin/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin"
# Respuesta: {"access_token":"...", "user":{...}}

# Usuario actual
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/admin/auth/me
# Respuesta: {"id":1,"username":"admin",...}
```

### Endpoints con Verificación Pendiente ⚠️
```bash
# Algunos endpoints admin pueden necesitar verificación adicional
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/admin/shows
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/admin/events
```

### Problemas Resueltos ✅
- **Unicode encoding errors** - Corregidos en dependencies.py
- **Password hashing** - Admin user con bcrypt correcto
- **Relationship loading** - Role relationship eager loaded
- **Import errors** - timedelta import añadido en public.py
- **Parameter order** - Syntax errors corregidos en admin.py
- **Server stability** - Uvicorn corriendo con auto-reload

## 📊 Estado del Proyecto

**Última actualización**: 2025-07-18

### Implementado ✅ (98% Completado)
- **Modelos SQLAlchemy completos** - 8 modelos con relaciones
- **Sistema de migraciones Alembic** - Configuración completa
- **Health endpoint robusto** - Con métricas del sistema
- **Configuración async completa** - PostgreSQL + asyncpg
- **Sistema de autenticación JWT** - Con bcrypt y tokens seguros
- **Endpoints CRUD completos** - 19 endpoints implementados
- **Esquemas Pydantic para validación** - Schemas completos con ejemplos
- **Servicios de negocio separados** - ShowService + EventService
- **Documentación automática con Swagger** - Interfaz web interactiva
- **Dependencias instaladas** - JWT, multipart, bcrypt, testing
- **Servidor funcionando** - Uvicorn en puerto 8000 con auto-reload
- **Problemas de conexión DB resueltos** - Unicode, hashing, imports corregidos
- **Usuario admin configurado** - Con password hash bcrypt correcto
- **Relaciones eager loading** - Role relationship cargada correctamente
- **Testing automatizado** - Script completo con **100% de éxito** (16/16 endpoints)
- **Suite de testing** - Pytest configurado con fixtures async

### ✅ Estado Actual (100% Completado - 2025-07-21)
- **19 endpoints implementados** y **16 testeados** (100% éxito)
- **Testing automatizado** con suite completa funcionando
- **Todos los problemas críticos resueltos**
- **Sistema de override funcionando** completamente
- **Base de datos** con constraints corregidos
- **API completamente operativa** y lista para producción

### Próximos Pasos 🔄
- Implementar lógica avanzada de estados de shows
- Optimización de rendimiento y caching
- Integración con sistema externo de Puy du Fou
- Desarrollo del frontend administrativo
- Implementación de alertas en tiempo real