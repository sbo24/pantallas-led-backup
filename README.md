# 🎭 ShowsTrack APP

Sistema de gestión y visualización en tiempo real de horarios de espectáculos para Puy du Fou España.

## 📋 Descripción General

ShowsTrack APP es una aplicación web que permite:
- **Visualizar horarios** de espectáculos en pantallas públicas distribuidas por el parque
- **Gestionar estados** de shows en tiempo real (PROGRAMADO, ABIERTO, CERRADO, CANCELADO)
- **Intervenir manualmente** ante contingencias operativas
- **Sincronizar automáticamente** con la API oficial de Puy du Fou España

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Externa   │───▶│  Scripts Python │───▶│  ShowsTrack API │
│  Puy du Fou     │    │  (ETL Process)  │    │   (FastAPI)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐            │
                       │ PostgreSQL DB   │◀───────────┘
                       └─────────────────┘
                                │
                ┌───────────────┴────────────────┐
                ▼                                ▼
┌─────────────────────────┐           ┌─────────────────────────┐
│   PANTALLAS PÚBLICAS    │           │    PANEL ADMIN          │
│   (HTML/CSS/JS)         │           │    (Vue.js)             │
│   • Auto-refresh 30s    │           │    • Gestión shows      │
│   • Estados visuales    │           │    • Overrides          │
│   • Máximo 5 shows     │           │    • Alertas globales   │
└─────────────────────────┘           └─────────────────────────┘
```

## 🛠️ Stack Tecnológico

- **Backend**: FastAPI + PostgreSQL + SQLAlchemy
- **Frontend Público**: HTML/CSS/JS Vanilla (optimizado para pantallas)
- **Frontend Admin**: Vue.js 3 + TypeScript + Pinia
- **Scripts ETL**: Python (existentes, ya funcionando)
- **Base de Datos**: PostgreSQL 15
- **Despliegue**: Docker + docker-compose

## 📁 Estructura del Proyecto

```
showstrack-app/
├── backend/                    # API FastAPI
│   ├── app/
│   │   ├── api/v1/            # Endpoints organizados
│   │   ├── models/            # Modelos SQLAlchemy
│   │   ├── schemas/           # Schemas Pydantic
│   │   ├── services/          # Lógica de negocio
│   │   └── main.py           # Aplicación principal
│   └── requirements.txt
├── frontend-public/           # Cliente para pantallas
│   ├── index.html
│   ├── css/styles.css
│   └── js/app.js
├── frontend-admin/            # Panel Vue.js
│   ├── src/
│   │   ├── components/
│   │   ├── views/
│   │   ├── stores/           # Pinia stores
│   │   └── services/
│   └── package.json
├── scripts/                   # Sistema ETL Python
│   ├── main.py
│   ├── puy_du_fou_api.py
│   └── showstrack_formatter.py
├── docs/                      # 📚 DOCUMENTACIÓN COMPLETA
│   ├── system-overview.md     # Visión general del sistema
│   ├── business-rules.md      # Reglas de negocio y estados
│   ├── data-model.md          # Modelo de datos y BD
│   ├── api-specification.md   # API endpoints completos
│   ├── frontend-specifications.md # UX/UI detallado
│   ├── integration-sync.md    # Sistema de sincronización
│   ├── deployment-operations.md # Despliegue y operaciones
│   ├── development-guide.md   # Guía para desarrolladores
│   ├── extraction-script.md   # Scripts Python ETL
│   └── Flujo\ de\ trabajo.md  # Metodología de trabajo
├── docker/
│   ├── docker-compose.dev.yml
│   └── docker-compose.prod.yml
└── README.md                  # Este archivo
```

## 🧠 Conceptos Clave del Sistema

### Estados de Espectáculos
- **PROGRAMADO** (Gris): Anunciado pero sin acceso
- **ABIERTO** (Verde): Acceso permitido al espectáculo
- **CERRADO** (Rojo): Acceso cerrado, show en curso/finalizado
- **CANCELADO** (Amarillo): Show no se realizará (override manual)

### Motor de Cálculo de Estados (5 Pasos)
1. **Verificar overrides activos** (prioridad máxima)
2. **Resolver lead times** (específicos del show o globales)
3. **Calcular ventanas temporales** (cuándo cambia cada estado)
4. **Determinar estado** según hora actual
5. **Aplicar casos especiales** (múltiples pases, etc.)

### Modos de Operación
- **Automático**: Sincronización continua con API externa
- **Manual**: Cambios pendientes hasta sincronización explícita

### Sistema de Overrides
- Los operadores pueden forzar estados manualmente
- Persisten ante importaciones de datos
- Auditoría completa con usuario y timestamp

## 🚀 Inicio Rápido

### Requisitos Previos
- Python 3.10+
- Node.js 18+
- PostgreSQL 15
- Docker & docker-compose

### Configuración de Desarrollo

```bash
# 1. Clonar repositorio
git clone https://github.com/your-org/showstrack-app.git
cd showstrack-app

# 2. Configurar backend
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows
pip install -r requirements.txt

# 3. Configurar base de datos
cp .env.example .env
# Editar .env con configuración de BD

# 4. Ejecutar migraciones
alembic upgrade head

# 5. Iniciar backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 6. Configurar frontend admin (nueva terminal)
cd frontend-admin
npm install
npm run dev

# 7. Acceder a la aplicación
# - API: http://localhost:8000
# - Docs: http://localhost:8000/docs
# - Admin: http://localhost:3000
# - Pantallas: http://localhost:8000/static/index.html
```

### Con Docker (Recomendado)
```bash
# Desarrollo
docker-compose -f docker/docker-compose.dev.yml up -d

# Producción
docker-compose -f docker/docker-compose.prod.yml up -d
```

## 🔧 Desarrollo

### Variables de Entorno Importantes
```bash
# Backend
DATABASE_URL=postgresql://user:pass@localhost:5432/showstrack
SECRET_KEY=your-secret-key-here
ENVIRONMENT=development

# Frontend
VITE_API_URL=http://localhost:8000
VITE_REFRESH_INTERVAL=30000

# Scripts ETL
PUY_DU_FOU_API_URL=https://api.puydufou.es/v1
SHOWSTRACK_API_URL=http://localhost:8000
```

### Comandos de Desarrollo
```bash
# Backend development
cd backend && source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend development
cd frontend-admin && npm run dev

# Testing
cd backend && pytest tests/ -v
cd frontend-admin && npm run test

# Database operations
cd backend && alembic revision --autogenerate -m "Description"
cd backend && alembic upgrade head
```

## 📚 Documentación Completa

La documentación completa está en la carpeta `/docs/`:

- **[system-overview.md](docs/system-overview.md)**: Visión general, arquitectura y casos de uso
- **[business-rules.md](docs/business-rules.md)**: Motor de estados, overrides y reglas de negocio
- **[data-model.md](docs/data-model.md)**: Modelo de datos, entidades y relaciones
- **[api-specification.md](docs/api-specification.md)**: Especificación completa de APIs
- **[frontend-specifications.md](docs/frontend-specifications.md)**: UX/UI y especificaciones visuales
- **[integration-sync.md](docs/integration-sync.md)**: Sistema de sincronización con API externa
- **[deployment-operations.md](docs/deployment-operations.md)**: Despliegue y operaciones
- **[development-guide.md](docs/development-guide.md)**: Guía para desarrolladores
- **[extraction-script.md](docs/extraction-script.md)**: Scripts Python ETL
- **[Flujo de trabajo.md](docs/Flujo%20de%20trabajo.md)**: Metodología de trabajo

## 🎯 Casos de Uso Principales

- **Visualización en Pantallas**: Mostrar estados de espectáculos en tiempo real
- **Gestión Operativa**: Control manual de estados ante contingencias
- **Sincronización Automática**: Actualización diaria desde API externa
- **Overrides Manuales**: Forzar estados por razones operativas
- **Alertas Globales**: Comunicar emergencias instantáneamente

## 🔄 Flujo de Trabajo Diario

1. **Mañana**: Revisar logs de sincronización automática (6:00 AM)
2. **Desarrollo**: Usar Claude Code para implementar features
3. **Testing**: Validar en entorno de desarrollo
4. **Deploy**: Push a producción tras testing

## 🚨 Operaciones Críticas

### Activar Alerta Global
```bash
# Via API
curl -X POST http://localhost:8000/api/admin/alerts/global \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "Emergencia: Todos los shows suspendidos", "type": "emergency"}'

# Via Panel Admin
# Acceder a /admin → Alertas → Activar Alerta Global
```

### Override Manual de Estado
```bash
# Forzar cierre de show por contingencia
curl -X PATCH http://localhost:8000/api/admin/events/123/override \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action": "create", "status": "CERRADO", "reason": "Problema técnico"}'
```

### Cambio de Modo Operación
```bash
# Cambiar a modo manual por evento especial
curl -X PUT http://localhost:8000/api/admin/config/global \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"operation_mode": "manual"}'
```