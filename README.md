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
│   • Máximo 5 shows      │           │    • Alertas globales   │
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

### Requisitos del Sistema (Estado Actual)
- **✅ Python 3.10**: Backend FastAPI funcionando
- **✅ Node.js 18**: Frontend Vue.js 3 operativo  
- **✅ PostgreSQL 15**: 9 tablas + migraciones configuradas
- **✅ SSH Access**: Servidor desarrollo en puerto 222
- **✅ Virtual Environment**: `/workspace/venv/` configurado
- **✅ Docker Environment**: Contenedor desarrollo Ubuntu 22.04

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
curl -X PUT http://localhost:8000/api/admin/config/operation-mode \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"mode": "manual", "reason": "Evento especial - control manual requerido"}'
```

## 🎯 **Estado Actual del Desarrollo (Actualizado 2025-08-14)**

### **⚙️ Backend - Arquitectura Completa (95% Funcional)**

#### **✅ Infrastructure Completada**
- **9 Modelos SQLAlchemy**: Shows, Events, Overrides, Settings, Alerts, Audit, Users, Roles ✅
- **Sistema de Migraciones**: Alembic configurado y funcional ✅
- **PostgreSQL 15**: Configuración async con asyncpg driver ✅
- **Health Check Robusto**: Métricas completas de sistema y BD ✅
- **JWT Authentication**: Sistema seguro con bcrypt + python-jose ✅
- **FastAPI 0.104.1**: Framework async con documentación automática ✅

#### **✅ API Endpoints - Implementación Completa**
- **✅ Core Endpoints**: Health, Auth (login, me), CRUD completo ✅
- **✅ Shows/Events CRUD**: Endpoints completos, lógica de negocio implementada ✅
- **✅ Alertas Globales**: Endpoints implementados y funcionales ✅
- **✅ Configuración Global**: Endpoints implementados y funcionales ✅  
- **✅ Sistema de Overrides**: Lógica de negocio completa (ImportService) ✅
- **✅ Estado Engine**: Motor de cálculo de estados 100% implementado ✅
- **✅ ETL Integration**: Scripts ETL + API endpoints + sincronización FUNCIONAL ✅

### **🎨 Frontend Admin Panel - FASE 4 Advanced Views (90% Completado)**

#### **✅ Milestone 1: Composables Foundation (100% ✅)**
- **5/5 Composables**: 94 tests unitarios pasando ✅
- **useShows** (400+ líneas, 13 tests): CRUD operations, optimistic updates ✅
- **useSettings** (570+ líneas, 23 tests): Form management, validation, import/export ✅
- **useTable** (839+ líneas, 43 tests): Advanced pagination, sorting, filtering ✅
- **useModal** (652+ líneas, 26 tests): Stack management, focus trap, keyboard nav ✅
- **useNotifications** (200+ líneas): Toast system, queue management ✅

#### **🚧 Milestone 2: Smart Views (40% completado)**
- **✅ DashboardView**: Métricas dashboard con stores integration ✅
- **✅ ShowsView** (1090+ líneas): Complete CRUD interface usando todos los composables ✅
- **⏳ SettingsView**: Pendiente (puede usar useSettings existente) - 3-4 horas estimadas
- **⏳ EventsView**: Pendiente - Gestión de eventos y overrides
- **⏳ AlertsView**: Pendiente - Sistema de alertas globales

#### **✅ Architecture & TypeScript (100% ✅)**
- **TypeScript Strict Mode**: 0 errores de compilación ✅
- **Clean Architecture**: Type adapters API ↔ Frontend ✅
- **6 Pinia Stores**: auth, shows, events, alerts, config, dashboard ✅
- **Layout System**: AppLayout, AppSidebar, AppHeader con Headless UI ✅

### **📱 Frontend Público - Pantallas (0% - No Iniciado)**
- **⏳ HTML/CSS/JS Vanilla**: Para pantallas públicas del parque - No iniciado
- **⏳ Auto-refresh System**: Actualización automática cada 30s - Pendiente
- **⏳ Visual States**: Diseño para estados PROGRAMADO/ABIERTO/CERRADO/CANCELADO - Pendiente

### **🔄 Sistema ETL - COMPLETAMENTE FUNCIONAL (100%)**

#### **✅ Scripts Python Completamente Operativos**
- **📁 Ubicación**: `/workspace/scripts/extraction/` - Documentado en README.md ✅
- **🐍 Scripts Operativos**: Extracción, procesamiento y formateo de datos ✅
- **📊 Formato Compatible**: Genera JSON exacto para ImportService ✅
- **🔐 Autenticación JWT**: Sistema seguro con credenciales en .env ✅
- **📝 Logging Completo**: Sistema de logs y auditoria implementado ✅

#### **✅ Integración Backend Completa**
- **✅ ImportService**: 493 líneas, validación, procesamiento automático/manual ✅
- **✅ Import API Endpoints**: `/api/admin/import` completamente funcional ✅
- **✅ Sync Service**: Sincronización manual/automática operativa ✅
- **✅ Formato ETL**: Compatible con scripts Python existentes ✅
- **✅ Preservación Overrides**: Mantiene intervenciones manuales ✅
- **✅ Modo Operación**: Automático (aplicar) vs Manual (revisar) ✅

#### **✅ Flujo ETL Completo Validado**
- **✅ ETL Scripts → ShowsTrack API → Database**: Flujo completo funcional
- **✅ 11 eventos sincronizados** exitosamente en pruebas
- **✅ 6 shows creados** automáticamente (Cetrería de Reyes, A Pluma y Espada, etc.)
- **✅ Estados calculados** correctamente (PROGRAMADO, CERRADO)
- **⏳ Automatización cron**: Configuración pendiente

### **📊 Estado Real por Componente del Sistema**

| Área | Componente | Estado | Progreso | Implementado | Pendiente |
|------|------------|--------|----------|--------------|----------|
| **🗄️ Database** | PostgreSQL + Models | ✅ | 100% | 9 modelos + migraciones | - |
| **🔐 Backend Auth** | JWT + User System | ✅ | 100% | Login, roles, bcrypt | - |
| **📡 Backend API** | Core Endpoints | 🚧 | 60% | Health, Auth, CRUD básico | Business logic completa |
| **📡 Backend API** | Advanced Features | 🚧 | 85% | Business logic implementado | Solo endpoints REST |
| **🎨 Frontend Base** | Architecture + Composables | ✅ | 100% | 5 composables, 94 tests | - |
| **🎨 Frontend Views** | Admin Panel Views | 🚧 | 40% | Dashboard, ShowsView | Settings, Events, AlertsView |
| **📱 Frontend Público** | Pantallas Parque | ⏳ | 0% | - | Todo (HTML/CSS/JS) |
| **🔄 ETL Scripts** | Sync System | ✅ | 100% | Scripts + API + Sync completo | Solo automatización cron |
| **🧪 Testing** | Frontend Tests | ✅ | 95% | 94 tests unitarios | E2E testing |
| **🧪 Testing** | Backend Tests | 🚧 | 30% | Test setup configurado | API endpoint testing |

**📈 Progreso Real del Proyecto**: **80% del sistema completo**
- **Backend**: Arquitectura completa (95%) + Business logic implementado (95%) = 95% total
- **Frontend Admin**: Composables completos (100%) + Views parciales (40%) = 70% total  
- **Frontend Público**: No iniciado (0%)
- **Integration**: ETL Scripts + API + Sync COMPLETAMENTE FUNCIONAL ✅

### **🎯 Roadmap de Desarrollo**

#### **📋 Inmediato (3-5 días) - Completar FASE 4 Frontend Admin**
1. **SettingsView** (4-6 horas): Configuración global, lead times, modos operación
2. **EventsView** (1-2 días): CRUD eventos + overrides manuales - **CLAVE PARA ETL** 
3. **AlertsView** (6-8 horas): Sistema alertas globales + historial

#### **🔥 Siguiente (1-2 días) - FASE 5 Automatización ETL**
1. **Configuración Cron** (2-4 horas): Automatización diaria 6:00 AM
2. **Script Wrapper** (2-3 horas): Gestión de errores y alertas
3. **Monitoring ETL** (3-4 horas): Logs y notificaciones de fallos
4. **Testing Automatización**: Validar ejecución automática completa

#### **🎨 Medio Plazo (2-3 semanas) - Frontend Público**
1. **Pantallas HTML/CSS/JS**: Diseño optimizado para displays del parque
2. **Auto-refresh System**: Actualización automática cada 30 segundos
3. **Visual States System**: Interfaz clara para estados de shows
4. **Responsive Design**: Adaptación a diferentes tamaños de pantalla

## **📋 FASES RESTANTES PARA COMPLETAR EL PROYECTO**

### **🎨 FASE 4 (Final) - Completar Frontend Admin (3-5 días)**
**Objetivo**: UI completa para operadores ANTES de ETL Integration
1. **SettingsView** (4-6 horas):
   - Usar `useSettings` composable existente
   - Configuración global, lead times, modos operación
   - Import/export configuraciones

2. **EventsView** (1-2 días): **🎯 CLAVE PARA ETL**
   - CRUD eventos con `useTable` + `useModal` patterns
   - Sistema de overrides manuales (CERRADO/CANCELADO)
   - Vista calendar/agenda de eventos
   - UI para gestión de importaciones ETL

3. **AlertsView** (6-8 horas):
   - Sistema alertas globales para emergencias
   - UI para activar/desactivar alertas
   - Historial y logs de alertas

### **🔥 FASE 5 - ETL Integration (1-2 días)**
**Objetivo**: Conectar ETL con panel admin completamente funcional
1. **Import API Endpoints** (6-8 horas):
   - `POST /api/admin/import` - Recibir datos del ETL
   - `GET /api/admin/import/history` - Historial de importaciones
   - `POST /api/admin/sync/execute` - Sincronización manual
   - `GET /api/admin/sync/pending` - Cambios pendientes

2. **Frontend Integration** (2-4 horas):
   - Conectar EventsView con import endpoints
   - UI para revisar/aprobar importaciones ETL
   - Notificaciones de nuevos datos disponibles

3. **Testing End-to-End** (2-4 horas):
   - Scripts → API → Frontend → Database workflow completo
   - Validar preservación de overrides manuales
   - Test con operadores reales usando panel admin

### **🖥️ FASE 6 - Frontend Pantallas Públicas (1-2 semanas)**  
**Objetivo**: Sistema de visualización para visitantes del parque
1. **Arquitectura Display** (2-3 días):
   - HTML/CSS/JS vanilla optimizado para pantallas
   - Auto-refresh cada 30 segundos
   - Diseño responsive para diferentes tamaños

2. **Estados Visuales** (2-3 días):
   - PROGRAMADO (gris), ABIERTO (verde), CERRADO (rojo), CANCELADO (amarillo)
   - Iconografía clara y accesible
   - Información de próximos pases

3. **Sistema de Alertas** (1-2 días):
   - Mostrar alertas globales full-screen
   - Priorización: alerta > shows normales
   - Transiciones suaves entre estados

### **🧪 FASE 7 - Validación y UX Testing (1 semana)**
**Objetivo**: Validar funcionalidad completa antes de producción
1. **Ejercicio Esbozo y Maquetado** (2-3 días):
   - Crear mockups completos de todas las pantallas
   - Identificar endpoints faltantes o funcionalidades no diseñadas
   - Validar workflows completos con operadores reales

2. **E2E Testing** (2-3 días):
   - Tests de workflow completo: ETL → Backend → Frontend
   - Testing de scenarios: modo auto, manual, overrides, alertas
   - Performance testing: múltiples pantallas simultáneas

3. **API Documentation** (1 día):
   - Completar documentación de todos los endpoints
   - Ejemplos de uso para integración
   - Guías de troubleshooting

### **🚀 FASE 8 - Producción (1-2 semanas)**
**Objetivo**: Deploy y monitoreo en entorno real
1. **Production Environment** (3-4 días):
   - Docker production setup optimizado
   - CI/CD pipeline con testing automático
   - Backup y recovery procedures

2. **Monitoring & Observability** (2-3 días):
   - APM, error tracking, metrics
   - Alertas para fallos de ETL o API
   - Dashboards de monitoreo operativo

3. **Documentation & Training** (2-3 días):
   - Guías operativas para personal del parque
   - Procedures de emergencia y troubleshooting
   - Training sessions con operadores

### **📚 Información Técnica por Área**

#### **🔍 Estado Detallado**
- **FASE 4 Frontend**: [PROCESO_DESARROLLO_FASE4.md](PROCESO_DESARROLLO_FASE4.md) - 90% completado, 94 tests
- **Backend Base**: [showstrack-backend/README.md](showstrack-backend/README.md) - Arquitectura sólida
- **Frontend Admin**: [showstrack-frontend/showstrack-admin/README.md](showstrack-frontend/showstrack-admin/README.md) - Composables + Views
- **Development Setup**: [CLAUDE.md](CLAUDE.md) - Instrucciones para Claude Code

#### **🔄 Procesos de Desarrollo**
- **Git Workflow**: [PROCESO_GITWORKFLOW.md](PROCESO_GITWORKFLOW.md) - Standards MR aplicados
- **Documentation**: [PROCESO_DOCUMENTACION.md](PROCESO_DOCUMENTACION.md) - Maintenance process
- **Development History**: [PROCESO_DESARROLLO.md](PROCESO_DESARROLLO.md) - Backend development log

#### **🎯 Qué Está Listo para Usar**
- **✅ Admin Login**: http://localhost:3000 (admin/admin)
- **✅ Dashboard**: Métricas del sistema funcionando
- **✅ Shows Management**: CRUD completo con 1090+ líneas de código
- **✅ API Documentation**: http://localhost:8000/docs
- **✅ Development Environment**: Backend + Frontend corriendo simultáneamente

#### **⚠️ Qué NO Está Listo**
- **❌ Import API Endpoints**: ImportService implementado pero no expuesto via REST - **BLOQUEANTE ETL**
- **❌ Pantallas Públicas**: No existe frontend para visitantes del parque
- **❌ Alertas Operativas**: UI de AlertsView no implementada  
- **❌ Configuración UI**: EventsView sin sistema de intervenciones
- **❌ Producción**: Sin deployment ni monitoring configurado

#### **✅ Sistemas Completamente Implementados**
- **✅ Motor de Estados**: StateEngine.py - 267 líneas, algoritmo completo de 5 pasos ✅
- **✅ Business Logic**: Services layer completo (show_service, event_service, import_service) ✅
- **✅ Scripts ETL**: 100% funcionales, formato JSON compatible ✅
- **✅ Overrides Manuales**: Lógica implementada en StatusOverride model + StateEngine ✅