# ShowsTrack Frontend

![Estado](https://img.shields.io/badge/Estado-FASE%204%20COMPLETÁNDOSE-green)
![Admin](https://img.shields.io/badge/Admin%20Panel-90%25%20Completado-brightgreen)
![Tests](https://img.shields.io/badge/Tests-94%20passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue)

Frontend para pantallas públicas y panel administrativo del sistema ShowsTrack.

**Última actualización**: 2025-08-13  
**Estado desarrollo**: Basado en PROCESO_DESARROLLO_FASE4.md  
**Progreso**: FASE 4 - Advanced Views & Architecture (90% completado)

## 📋 **Componentes del Frontend**
- **🚧 frontend-public**: HTML/CSS/JS para Media4Display (pantallas públicas) - Pendiente
- **✅ showstrack-admin**: Vue.js 3 + TypeScript panel administrativo - **90% COMPLETADO**

## ✅ **showstrack-admin: Panel Administrativo Vue.js (90% COMPLETADO)**

### **FASE 4 - Advanced Views & Architecture**
**Estado**: 🚧 90% completado - Milestone 1 ✅, Milestone 2 🚧 40%

#### **✅ Milestone 1: Composables Foundation (100% ✅)**
- **5/5 Composables completados** con 94 tests unitarios pasando
- **useShows** (400+ líneas, 13 tests): CRUD operations, optimistic updates
- **useSettings** (570+ líneas, 23 tests): Form management, validation, import/export
- **useTable** (839+ líneas, 43 tests): Advanced pagination, sorting, filtering
- **useModal** (652+ líneas, 26 tests): Stack management, focus trap, keyboard navigation
- **useNotifications** (200+ líneas): Toast system, queue management

#### **🚧 Milestone 2: Smart Views (40% completado)**
- **✅ DashboardView**: Métricas dashboard con stores integration
- **✅ ShowsView** (1090+ líneas): Complete CRUD interface, todos los composables integrados
- **⏳ SettingsView**: Pendiente (3-4 horas estimadas)
- **⏳ EventsView & AlertsView**: Pendientes

### **Stack Tecnológico Actualizado**
- **Vue.js 3.5.18** con Composition API (`<script setup>`)
- **TypeScript 5.8.0** - **Strict Mode** (0 errores compilación)
- **Pinia 3.0.3** - 6 stores con type safety completo
- **Vue Router 4.5.1** con guards de autenticación
- **Tailwind CSS v4.1.11** con @tailwindcss/vite plugin
- **Vite 5.4.19** con HMR optimizado

### **Funcionalidades Implementadas y Validadas**
- ✅ **Dashboard en tiempo real** - DashboardView operativa
- ✅ **Gestión completa de shows** - ShowsView con CRUD completo
- ✅ **Table Management avanzado** - Pagination, sorting, filtering, export
- ✅ **Modal System** - Stack management con keyboard shortcuts
- ✅ **Form Management** - Validation, change tracking, import/export
- ✅ **Notification System** - Toast queue con animations
- ✅ **TypeScript Integration** - Type conflicts resolved, Clean Architecture
- 🚧 **Sistema de configuración** - Settings management (pendiente UI)
- ⏳ **Centro de alertas globales** - AlertsView pendiente
- ⏳ **Overrides con confirmaciones** - EventsView pendiente

## 📚 **Documentación**

### **FASE 4 - Estado Actual**
- **[`PROCESO_DESARROLLO_FASE4.md`](../PROCESO_DESARROLLO_FASE4.md)** - ⭐ **Estado actualizado**: 90% completado, 94 tests
- **[`PROCESO_FASE4_VIEWS.md`](../PROCESO_FASE4_VIEWS.md)** - Roadmap y milestone tracking
- **[`showstrack-admin/README.md`](showstrack-admin/README.md)** - Documentación específica del admin panel

### **Desarrollo y Procesos**
- **[`PROCESO_DESARROLLO_VUE.md`](../PROCESO_DESARROLLO_VUE.md)** - Plan completo de desarrollo por fases
- **[`PROCESO_GITWORKFLOW.md`](../PROCESO_GITWORKFLOW.md)** - Workflow MR aplicado
- **[`TESTING_PLAN.md`](TESTING_PLAN.md)** - Plan detallado de testing y seguridad por cada fase

### **Backend Integration**
- **✅ API Base Integrada**: showstrack-backend usando FastAPI con JWT
- **✅ Authentication Flow**: Login, refresh token completamente funcional  
- **✅ CRUD Operations**: Shows/Events management en uso por composables
- **API Documentation**: Ver documentación del backend en `/docs`

## 🛠️ **Comandos de Desarrollo**

### **Setup Inicial**
```bash
# Crear proyecto Vue 3 + TypeScript
npm create vue@latest showstrack-admin -- --typescript --router --pinia --vitest --eslint

# Instalar dependencias
cd showstrack-admin
npm install

# Instalar dependencias adicionales
npm install axios @headlessui/vue @heroicons/vue
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### **🚀 Comandos de Inicio Rápido**

#### **Iniciar Frontend FASE 4 (Desarrollo Diario)**
```bash
# 1. Navegar al directorio del admin panel
cd /workspace/showstrack-frontend/showstrack-admin

# 2. Verificar que no hay procesos zombie (si hay problemas)
ps aux | grep vite | grep -v grep
pkill -f "node.*vite" || true  # Solo si hay procesos colgados

# 3. Iniciar servidor de desarrollo
npm run dev  # 94 tests pasando ✅

# 4. Verificar tests (opcional)
npm run test:unit  # Debería mostrar 94/94 tests passing
npm run type-check  # TypeScript Strict Mode, 0 errores

# La aplicación estará disponible en:
# - Interno (container): http://localhost:3000
# - Externo: http://[IP_SERVIDOR]:3001 (si aplica)
# - Funcionalidades: Dashboard ✅, ShowsView ✅, Settings/Events/Alerts 🚧
```

#### **Solución de Problemas Comunes**
```bash
# Si ves página en blanco:
# 1. Verificar que todos los archivos de views existen
ls -la src/views/  # Debe mostrar 8 archivos .vue

# 2. Reiniciar el servidor limpiamente
pkill -f "node.*vite" || true
npm run dev

# 3. Verificar conectividad
curl http://localhost:3000  # Debe responder HTML
```

### **Desarrollo Completo**
```bash
# Servidor de desarrollo
npm run dev

# Build para producción  
npm run build

# Preview del build
npm run preview

# Tests (FASE 4 - 94 tests pasando)
npm run test:unit           # 94/94 tests unitarios ✅
npm run test:unit -- useShows    # 13 tests useShows ✅
npm run test:unit -- useSettings # 23 tests useSettings ✅  
npm run test:unit -- useTable    # 43 tests useTable ✅
npm run test:unit -- useModal    # 26 tests useModal ✅

# Linting y formatting
npm run lint
npm run type-check
```

### **Testing y Seguridad**
```bash
# Security audit
npm audit --audit-level moderate

# Performance testing
npm run test:performance

# Accessibility testing
npm run test:a11y
```

## 📊 **Estado del Proyecto (Actualizado 2025-08-13)**

| Fase | Estado | Progreso | Duración Real |
|------|--------|----------|---------------|
| **FASE 1**: Setup Inicial | ✅ **COMPLETADA** | 100% | ~~2 días~~ ✅ |
| **FASE 2**: Servicios + Stores | ✅ **COMPLETADA** | 100% | ~~3 días~~ ✅ |
| **FASE 3**: Layout + Components | ✅ **COMPLETADA** | 100% | ~~2 días~~ ✅ |
| **FASE 4**: Advanced Views | 🚧 **90% COMPLETADO** | 90% | 3 días (est. 4-6) |
| **FASE 5**: Testing + Polish | ⏳ Esperando FASE 4 | 0% | 1-2 días |

**Progreso total**: 4.9/5 fases completadas (**90%**)  
**Próximo paso**: **SettingsView + EventsView implementation (3-4 horas)**

### **Hitos Alcanzados en FASE 4**
- ✅ **Milestone 1**: Composables Foundation (100%) - 5/5 composables, 94 tests
- 🚧 **Milestone 2**: Smart Views Implementation (40%) - 2/5 views completadas
- ✅ **TypeScript Integration**: Strict mode, type conflicts resolved
- ✅ **Architecture**: Clean Architecture con type adapters validada

## 🏗️ **Arquitectura Implementada (FASE 1-4)**

### **✅ Stack Tecnológico Production-Ready**
- **Vue.js 3.5.18** con Composition API (`<script setup>`)
- **TypeScript 5.8.0** - **Strict Mode** con type safety completo
- **Tailwind CSS v4.1.11** con @tailwindcss/vite plugin
- **Pinia 3.0.3** para gestión de estado reactiva
- **Vue Router 4.5.1** con guards de autenticación
- **Vite 5.4.19** como build tool optimizado

### **✅ Business Logic Layer - Composables (5/5)**
- **useShows** (400+ líneas) - CRUD, optimistic updates, bulk operations
- **useSettings** (570+ líneas) - Form management, validation, import/export
- **useTable** (839+ líneas) - Advanced pagination, sorting, filtering, selection
- **useModal** (652+ líneas) - Stack management, focus trap, keyboard navigation
- **useNotifications** (200+ líneas) - Toast system, queue management

### **✅ Data Layer - Pinia Stores (6/6)**
- `useAuthStore` - JWT, roles, persistencia segura
- `useShowsStore` - Gestión completa de espectáculos  
- `useEventsStore` - Eventos con tiempo real y overrides
- `useAlertsStore` - Sistema de alertas globales
- `useConfigStore` - Configuración del sistema
- `useDashboardStore` - Métricas con auto-refresh

### **✅ Presentation Layer - Smart Views (2/5)**
- **DashboardView** - Métricas dashboard con stores integration
- **ShowsView** (1090+ líneas) - Complete CRUD interface usando todos los composables
- **SettingsView** - Pendiente (puede usar useSettings existente)
- **EventsView** - Pendiente
- **AlertsView** - Pendiente

### **✅ API Integration Layer**
- **Authentication Flow** - Login, JWT refresh, roles ✅ funcional
- **CRUD Operations** - Shows/Events management ✅ en uso por composables
- **Real-time Data** - Dashboard metrics ✅ integrando con backend
- **Type Safety** - API ↔ Frontend type adapters ✅ implementados

### **✅ Testing Suite (94 tests pasando)**
- **Composables Testing**: 94 tests unitarios con >90% coverage
- **Store Testing**: Pinia Testing utilities con mocks
- **TypeScript**: Strict mode compliance, 0 errores compilación
- **Architecture**: Clean Architecture patterns validados

## 🎯 **Próximos Pasos - Completar FASE 4**

### **⏳ Inmediato (1-2 días)**
1. **SettingsView Implementation** (3-4 horas estimadas)
   - Puede reutilizar useSettings composable existente (570+ líneas, 23 tests)
   - Formularios de configuración del sistema
   - Import/export functionality

2. **EventsView & AlertsView** 
   - Implementación usando useTable y useModal patterns establecidos
   - CRUD operations para eventos y alertas
   - Integration con stores existentes

### **✅ Completado en FASE 4**
- **Architecture Foundation** - Clean Architecture con composables pattern
- **Business Logic** - 5 composables completados y testeados
- **UI Components** - BaseButton, BaseModal, BaseTable, BaseForm operativos
- **Smart Views** - DashboardView, ShowsView completamente funcionales
- **TypeScript Integration** - Strict mode, type conflicts resolved
- **Testing Suite** - 94 tests unitarios con alta cobertura
- **Backend Integration** - API client y authentication flow funcionales

### **🚀 FASE 5: Testing & Production Ready**
1. **E2E Testing** - Workflow completo testing
2. **Performance Optimization** - Bundle splitting, lazy loading
3. **Production Build** - Deployment y monitoring

## 🔗 **Enlaces y Documentación**

### **Estado Actual y Progreso**
- **FASE 4 Estado**: [PROCESO_DESARROLLO_FASE4.md](../PROCESO_DESARROLLO_FASE4.md) ⭐ **90% completado, 94 tests**
- **Admin Panel Details**: [showstrack-admin/README.md](showstrack-admin/README.md) - Documentación específica
- **FASE 4 Roadmap**: [PROCESO_FASE4_VIEWS.md](../PROCESO_FASE4_VIEWS.md) - Milestone tracking

### **Desarrollo y Procesos**
- **Backend Integration**: [showstrack-backend](../showstrack-backend/) - Base arquitectónica completa
- **Git Workflow**: [PROCESO_GITWORKFLOW.md](../PROCESO_GITWORKFLOW.md) - MR standards aplicados
- **Documentation Process**: [PROCESO_DOCUMENTACION.md](../PROCESO_DOCUMENTACION.md) - README maintenance

### **Desarrollo Histórico**
- **Proceso completo**: [PROCESO_DESARROLLO_VUE.md](../PROCESO_DESARROLLO_VUE.md) - Plan original por fases
- **FASE 3 Layout**: [PROCESO_FASE3_LAYOUTS.md](../PROCESO_FASE3_LAYOUTS.md) - Layout system completado
- **Testing Plan**: [TESTING_PLAN.md](TESTING_PLAN.md) - Plan detallado de testing
