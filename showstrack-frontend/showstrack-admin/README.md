# ShowsTrack Admin - Frontend Vue.js

Panel administrativo en tiempo real para gestión de espectáculos y eventos de ShowsTrack. Construido con Vue.js 3 + TypeScript + Tailwind CSS v4.

## 📋 Estado del Proyecto

![Estado](https://img.shields.io/badge/Estado-FASE%204%20AVANZADA-green)
![Tests](https://img.shields.io/badge/Tests-94%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/Coverage-90%25+-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue)
![Composables](https://img.shields.io/badge/Composables-5/5%20✅-green)

**FASE 4 - Advanced Views & Architecture** (2025-08-11 → 2025-08-13) - 🚧 **90% COMPLETADO**

**Última actualización**: 2025-08-13  
**Estado de desarrollo**: Basado en PROCESO_DESARROLLO_FASE4.md  
**Tests validados**: 94 tests unitarios pasando  

### ✅ FASE 1-3 COMPLETADAS - Base Arquitectónica
- ✅ Vue.js 3.5.18 + Vite 5.4.19 + TypeScript 5.8.0 (Strict Mode)
- ✅ Tailwind CSS v4.1.11 con @tailwindcss/vite plugin
- ✅ Pinia 3.0.3 + Vue Router 4.5.1 + Axios 1.11.0
- ✅ ESLint + Vitest + Testing configurado
- ✅ Docker environment integrado
- ✅ Backend proxy configurado (localhost:8000)
- ✅ Layout System: AppLayout, AppSidebar, AppHeader con Headless UI
- ✅ 6 Pinia Stores: auth, shows, events, alerts, config, dashboard

## 🏗️ Stack Tecnológico

### Core Framework
- **Vue.js 3.5.18** - Composition API con `<script setup>`
- **TypeScript 5.8.0** - Type safety completo
- **Vite 5.4.19** - Build tool y dev server con HMR

### Gestión de Estado y Routing
- **Pinia 3.0.3** - Store management con Setup Stores
- **Vue Router 4.5.1** - SPA routing con guards

### UI y Estilos
- **Tailwind CSS v4.1.11** - Utility-first CSS framework (última versión)
- **@tailwindcss/vite** - Plugin Vite nativo para mejor performance
- **@headlessui/vue 1.7.23** - ✅ Componentes accesibles sin estilos (FASE 3)
- **@heroicons/vue 2.2.0** - ✅ Iconografía consistente (FASE 3)

### Desarrollo y Testing
- **Vitest** - Testing framework
- **Vue Test Utils** - Testing utilities para Vue
- **ESLint** - Code quality y linting

## 🐳 Entorno Docker

### Port Forwarding Configurado
```bash
# Docker Compose Configuration
ports:
  - "3001:3000"  # Frontend admin dev (host:container)
  - "8001:8000"  # Backend dev proxy
```

### Variables de Entorno
```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_TITLE=ShowsTrack Admin - DEV
VITE_ENABLE_DEVTOOLS=true
VITE_LOG_LEVEL=debug
```

## 🚀 Comandos de Desarrollo

### Setup Inicial (Solo primera vez)
```bash
# En el contenedor Docker vía SSH
ssh dev@[IP_SERVIDOR] -p 222
cd /workspace/showstrack-frontend/showstrack-admin
npm install  # Ya completado
```

### Desarrollo Diario
```bash
# Terminal 1: Backend (requerido)
cd /workspace && source venv/bin/activate
cd showstrack-backend/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend
cd /workspace/showstrack-frontend/showstrack-admin
npm run dev
```

### Testing y Build
```bash
# Development server con HMR
npm run dev                # ✅ Funcionando en puerto 3000

# Build para producción
npm run build             # ✅ 1.56s build time, optimizado

# Tests unitarios (FASE 4 validation)
npm run test:unit         # ✅ 94/94 tests passing

# Tests específicos por composable
npm run test:unit -- useShows    # ✅ 13 tests passing
npm run test:unit -- useSettings # ✅ 23 tests passing
npm run test:unit -- useTable    # ✅ 43 tests passing
npm run test:unit -- useModal    # ✅ 26 tests passing

# Linting y type checking
npm run lint              # ✅ ESLint configurado
npm run type-check        # ✅ TypeScript Strict Mode sin errores
```

## 📊 Métricas de Performance

### Build Optimizado
- **Build Time**: 1.56s
- **Bundle Size**: 96.71 kB (38.03 kB gzipped)
- **CSS Size**: 8.78 kB (2.64 kB gzipped)
- **Startup Time**: ~694ms

### Test Coverage (FASE 4 Metrics)
- **Total Unit Tests**: 94/94 passing (100%)
- **Composables Coverage**: >90% para todos los composables
- **TypeScript**: Strict Mode, 0 errores de compilación
- **ESLint**: Sin warnings críticos
- **Architecture**: Clean Architecture con type adapters validada

## 🌐 URLs de Acceso

### Desarrollo
- **Frontend DEV**: http://localhost:3000 (interno container)
- **Frontend External**: http://[IP_SERVIDOR]:3001 (acceso externo)
- **Backend API**: http://localhost:8000 (proxy automático VS Code)
- **Backend External**: http://[IP_SERVIDOR]:8001

### Documentación
- **API Docs**: http://localhost:8000/docs
- **Vite Config**: [Vite Configuration Reference](https://vite.dev/config/)

## 🔧 Configuración Técnica

### Vite Configuration
```typescript
// vite.config.ts - Configuración optimizada para Docker
export default defineConfig({
  plugins: [
    tailwindcss(),  // Tailwind CSS v4 nativo
    vue(),
  ],
  server: {
    host: '0.0.0.0',  // Docker compatibility
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
```

### Tailwind CSS v4 Setup
```css
/* main.css - CSS-first configuration */
@import './base.css';
@import "tailwindcss";

/* Tailwind automatically processes and optimizes CSS */
```

## 📁 Estructura del Proyecto

```
showstrack-admin/
├── public/
│   └── favicon.ico
├── src/
│   ├── main.ts                    # ✅ Entry point + Pinia + Router
│   ├── App.vue                    # ✅ Root component with router-view
│   ├── assets/                    # ✅ CSS, images, fonts
│   │   ├── main.css              # ✅ Tailwind CSS v4 import
│   │   ├── base.css              # ✅ Base styles
│   │   └── logo.svg
│   ├── components/               # ✅ Vue components + Layout
│   │   ├── base/                # ✅ BaseButton, BaseModal, BaseForm
│   │   ├── layout/              # ✅ AppLayout, AppSidebar, AppHeader
│   │   └── __tests__/           # ✅ Component tests
│   ├── composables/             # ✅ FASE 4 - Business Logic Layer
│   │   ├── useShows.ts          # ✅ 400+ líneas, 13 tests ✅
│   │   ├── useSettings.ts       # ✅ 570+ líneas, 23 tests ✅
│   │   ├── useTable.ts          # ✅ 839+ líneas, 43 tests ✅
│   │   ├── useModal.ts          # ✅ 652+ líneas, 26 tests ✅
│   │   ├── useNotifications.ts  # ✅ 200+ líneas
│   │   └── __tests__/           # ✅ 94 tests passing total
│   ├── views/                   # 🚧 Smart Views (2/5 completed)
│   │   ├── DashboardView.vue    # ✅ Dashboard con stores integration
│   │   ├── ShowsView.vue        # ✅ 1090+ líneas, CRUD completo
│   │   ├── SettingsView.vue     # ⏳ Pendiente (3-4h estimadas)
│   │   ├── EventsView.vue       # ⏳ Pendiente
│   │   └── AlertsView.vue       # ⏳ Pendiente
│   ├── types/                   # ✅ TypeScript Strict Mode
│   │   ├── api.ts               # ✅ API types (ApiShow, ApiEvent)
│   │   ├── show.ts              # ✅ Frontend types (Show, Event)
│   │   └── index.ts             # ✅ Named exports, conflicts resolved
│   ├── router/                  # ✅ Vue Router config
│   │   └── index.ts             # ✅ Routes definition + guards
│   └── stores/                  # ✅ Pinia stores (6 stores)
│       ├── auth.ts              # ✅ Authentication + JWT
│       ├── shows.ts             # ✅ Shows management
│       ├── events.ts            # ✅ Events management
│       ├── alerts.ts            # ✅ Global alerts
│       ├── config.ts            # ✅ Global configuration
│       └── dashboard.ts         # ✅ Dashboard metrics
├── .env.development             # ✅ Environment variables
├── package.json                 # ✅ Dependencies configured
├── vite.config.ts              # ✅ Vite + Tailwind + Docker setup
├── tailwind.config.js          # ✅ Tailwind configuration
├── tsconfig.json               # ✅ TypeScript Strict Mode config
├── eslint.config.ts            # ✅ ESLint configuration
└── vitest.config.ts            # ✅ Test configuration
```

## 🚧 FASE 4 - Advanced Views & Architecture (90% COMPLETADO)

### ✅ Milestone 1: Composables Foundation (100% ✅)
**Composables Implementados** (5/5 completados, 94 tests pasando):

- ✅ **useShows** (400+ líneas, 13 tests ✅): CRUD operations, optimistic updates, bulk operations
- ✅ **useSettings** (570+ líneas, 23 tests ✅): Form management, validation, change tracking, import/export
- ✅ **useTable** (839+ líneas, 43 tests ✅): Advanced pagination, sorting, filtering, selection, export  
- ✅ **useModal** (652+ líneas, 26 tests ✅): Stack management, focus trap, keyboard navigation, animation
- ✅ **useNotifications** (200+ líneas): Toast system, queue management

### 🚧 Milestone 2: Smart Views Implementation (40% completado)
**Views Status**:
- ✅ **DashboardView**: Métricas dashboard con stores integration
- ✅ **ShowsView** (1090+ líneas): Complete CRUD interface, todos los composables integrados
- ⏳ **SettingsView**: Pendiente (puede usar useSettings existente) - 3-4 horas estimadas
- ⏳ **EventsView**: Pendiente 
- ⏳ **AlertsView**: Pendiente

### ✅ TypeScript Integration (100% ✅)
- ✅ **Strict Mode Compliance**: 0 errores de compilación
- ✅ **Type Conflicts Resolved**: Clean Architecture con type adapters API ↔ Frontend
- ✅ **Named Exports Pattern**: ApiShow/ApiEvent para API, Show/Event para frontend

### ✅ FASE 2-3 COMPLETADAS - Infraestructura Base
- ✅ API client con Axios + interceptors JWT
- ✅ 6 Stores principales: auth, shows, events, alerts, config, dashboard  
- ✅ Sistema de autenticación completo con refresh tokens
- ✅ Layout System: AppLayout, AppSidebar, AppHeader con Headless UI
- ✅ Router guards y navegación protegida
- ✅ BaseButton, BaseModal, BaseForm components

## 🔍 Troubleshooting

### Problemas Comunes

**Error: Puerto 3000 en uso**
```bash
# Limpiar procesos zombie
pkill -f "node.*vite" || true
pkill -f "vite" || true
```

**Error: Cannot connect to backend**
```bash
# Verificar backend corriendo
curl http://localhost:8000/health

# Verificar proxy configuration
cat .env.development
```

**Build errors**
```bash
# Limpiar cache y reinstalar
rm -rf node_modules dist
npm install
npm run build
```

## 📚 Documentación Relacionada

- **FASE 4 Estado Completo**: `/workspace/PROCESO_DESARROLLO_FASE4.md` - 90% completado, 94 tests
- **FASE 4 Roadmap**: `/workspace/PROCESO_FASE4_VIEWS.md` - Milestone tracking
- **Backend API**: `/workspace/showstrack-backend/README.md` - Base arquitectónica completa
- **Git Workflow**: `/workspace/PROCESO_GITWORKFLOW.md` - MR standards aplicados
- **Documentación Process**: `/workspace/PROCESO_DOCUMENTACION.md` - README maintenance

## 🎯 Objetivos del Proyecto

ShowsTrack Admin es el panel de control para operadores de parques de atracciones que necesitan:

1. **Monitoreo en tiempo real** de estados de espectáculos
2. **Intervención manual** con sistema de overrides
3. **Gestión de alertas** globales de emergencia
4. **Configuración operativa** del sistema

**Meta**: Panel administrativo production-ready con arquitectura avanzada Vue 3, 5 composables completados (94 tests), y 2/5 views implementadas completamente.

## 🎯 Próximos Pasos (Basado en PROCESO_DESARROLLO_FASE4.md)

### **Inmediatos (3-5 días) - Completar FASE 4 Frontend Admin**:
1. **SettingsView Implementation** (4-6 horas):
   - Puede usar useSettings composable existente (570+ líneas, 23 tests)
   - Configuración global, lead times, modos operación
   - Import/export functionality

2. **EventsView Implementation** (1-2 días):
   - CRUD eventos usando useTable y useModal patterns
   - Sistema de overrides manuales (CERRADO/CANCELADO)
   - Vista calendar/agenda de eventos

3. **AlertsView Implementation** (6-8 horas):
   - Sistema alertas globales para emergencias
   - UI para activar/desactivar alertas
   - Historial y logs de alertas

### **FASE 5 - ETL Integration (1-2 días)**:
- **Import API Endpoints**: Exponer ImportService via REST (6-8 horas)
- **Frontend Integration**: Conectar EventsView con import endpoints
- **ETL Testing**: Scripts → API → Frontend workflow completo

### **FASE 6 - Frontend Pantallas Públicas (1-2 semanas)**:
- **HTML/CSS/JS Vanilla**: Sistema de visualización para visitantes
- **Auto-refresh System**: Actualización automática cada 30 segundos
- **Estados Visuales**: PROGRAMADO/ABIERTO/CERRADO/CANCELADO

### **FASE 7 - Testing & Production (1-2 semanas)**:
- **E2E Testing**: Workflow completo con backend integration
- **Performance Optimization**: Bundle splitting, lazy loading
- **Production Deploy**: CI/CD pipeline y monitoreo

### **Testing Status**:
- ✅ **Composables**: 94/94 tests passing (100%)
- ⏳ **Views**: E2E testing pendiente post-FASE 4
- ⏳ **Integration**: Backend connection testing
