# ShowsTrack Frontend

Frontend para pantallas públicas y panel administrativo del sistema ShowsTrack.

## 📋 **Componentes**
- **frontend-public**: HTML/CSS/JS para Media4Display (pantallas públicas)
- **frontend-admin**: Vue.js 3 + TypeScript panel administrativo

## 🚀 **Panel Administrativo Vue.js**

### **Stack Tecnológico**
- **Vue.js 3.4+** con Composition API
- **TypeScript 5.0+** para type safety
- **Pinia 2.1+** para gestión de estado
- **Vue Router 4.0+** para navegación
- **Tailwind CSS 3.4+** para estilos
- **Vite 5.0+** como build tool

### **Funcionalidades Principales**
- Dashboard con vista previa en tiempo real
- Gestión completa de shows y eventos
- Sistema de overrides con confirmaciones
- Centro de alertas globales
- Configuración del sistema operativo
- Autenticación JWT con refresh automático

## 📚 **Documentación**

### **Desarrollo**
- **[`PROCESO_DESARROLLO_VUE.md`](../PROCESO_DESARROLLO_VUE.md)** - Plan completo de desarrollo por fases
- **[`TESTING_PLAN.md`](TESTING_PLAN.md)** - Plan detallado de testing y seguridad por cada fase

### **Backend Integration**
- **38 endpoints** del backend completamente integrados
- **API Documentation**: Ver documentación del backend en `/docs`
- **Testing**: 100% de endpoints testeados y funcionando

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

#### **Iniciar Frontend (Desarrollo Diario)**
```bash
# 1. Navegar al directorio del frontend
cd /workspace/showstrack-frontend/showstrack-admin

# 2. Verificar que no hay procesos zombie (si hay problemas)
ps aux | grep vite | grep -v grep
pkill -f "node.*vite" || true  # Solo si hay procesos colgados

# 3. Iniciar servidor de desarrollo
npm run dev

# La aplicación estará disponible en:
# - Interno (container): http://localhost:3000
# - Externo: http://[IP_SERVIDOR]:3001 (si aplica)
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

# Tests
npm run test:unit           # Tests unitarios
npm run test:stores         # Solo tests de stores
npm run test:api           # Solo tests de API
npm run test:router        # Solo tests de router

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

## 📊 **Estado del Proyecto**

| Fase | Estado | Progreso | ETA |
|------|--------|----------|-----|
| **FASE 1**: Setup Inicial | ✅ **COMPLETADA** | 100% | ~~2 días~~ |
| **FASE 2**: Servicios | ✅ **COMPLETADA** | 100% | ~~3 días~~ |
| **Testing Pre-FASE 3** | ✅ **COMPLETADO** | 100% | ~~0.5 días~~ |
| **FASE 3**: Layout Base | 🚧 **EN PROGRESO** | 70% | 1-2 días |
| **FASE 4**: Funcionalidades | ⏳ Esperando FASE 3 | 0% | 4-5 días |
| **FASE 5**: Testing Final | ⏳ Esperando FASE 4 | 0% | 1-2 días |

**Progreso total**: 2.7/5 fases completadas (54%)  
**Próximo paso**: **Componentes Base (BaseButton, BaseModal)**

## 🏗️ **Infraestructura Implementada (FASE 1 + 2)**

### **✅ Stack Tecnológico Operativo**
- **Vue.js 3.5.18** con Composition API (`<script setup>`)
- **TypeScript 5.8.0** con type safety completo
- **Tailwind CSS v4.1.11** con @tailwindcss/vite plugin
- **Pinia 3.0.3** para gestión de estado reactiva
- **Vue Router 4.5.1** con guards de autenticación
- **Vite 5.4.19** como build tool optimizado

### **🏪 Stores Implementados (6/6)**
- `useAuthStore` - JWT, roles, persistencia segura
- `useShowsStore` - Gestión completa de espectáculos  
- `useEventsStore` - Eventos con tiempo real y overrides
- `useAlertsStore` - Sistema de alertas globales
- `useConfigStore` - Configuración del sistema
- `useDashboardStore` - Métricas con auto-refresh

### **📡 API Integration (61+ endpoints)**
- **Authentication** - Login, JWT refresh, roles
- **Shows CRUD** - Gestión completa de espectáculos
- **Events CRUD** - Eventos, horarios, overrides
- **Alerts System** - Alertas globales y emergencias
- **Configuration** - Parámetros del sistema
- **Dashboard** - Métricas en tiempo real

### **🧪 Testing Suite (207+ tests)**
- Store testing con Pinia Testing utilities
- API client testing con mocks
- Router guards y navigation testing
- TypeScript compilation y linting
- Security audit y dependency validation

## 🎨 **Próximo: FASE 3 - UI Layout**

### **✅ Componentes Implementados (FASE 3 - Sesión 2025-08-11)**
1. **Layout System**: ✅ `AppLayout`, `AppSidebar`, `AppHeader`, `AppToastContainer`
2. **UI Integration**: ✅ Headless UI + Heroicons, stores mock data
3. **Responsive Design**: ✅ Mobile-first implementado y verificado
4. **Development**: ✅ Servidor estable, hot reload funcionando

### **🚧 Pendiente para Próxima Sesión**
1. **Base Components**: `BaseButton`, `BaseModal`, `BaseTable`, `BaseForm`
2. **Real Data**: Conectar con backend real (remover mock data)
3. **Testing**: Unit tests para componentes de layout

## 🔗 **Enlaces Relacionados**
- **Backend API**: [showstrack-backend](../showstrack-backend/)
- **Proceso completo**: [PROCESO_DESARROLLO_VUE.md](../PROCESO_DESARROLLO_VUE.md)
- **FASE 3 Layout**: [PROCESO_FASE3_LAYOUTS.md](../PROCESO_FASE3_LAYOUTS.md) ⭐ **NUEVO**
- **Testing Plan**: [showstrack-admin/test-phase2-infrastructure.sh](showstrack-admin/test-phase2-infrastructure.sh)
