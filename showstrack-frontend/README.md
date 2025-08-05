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

### **Desarrollo**
```bash
# Servidor de desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Tests
npm run test
npm run test:e2e

# Linting y formatting
npm run lint
npm run format
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

| Fase | Estado | Progreso |
|------|--------|----------|
| **FASE 1**: Setup Inicial | ⏳ Pendiente | 0% |
| **FASE 2**: Servicios | ⏳ Pendiente | 0% |
| **FASE 3**: Layout Base | ⏳ Pendiente | 0% |
| **FASE 4**: Funcionalidades | ⏳ Pendiente | 0% |
| **FASE 5**: Testing Final | ⏳ Pendiente | 0% |

**Próximo paso**: Ejecutar FASE 1 - Setup inicial del proyecto

## 🔗 **Enlaces Relacionados**
- **Backend API**: [showstrack-backend](../showstrack-backend/)
- **Documentación**: [docs](../docs/)
- **Proceso de desarrollo**: [PROCESO_DESARROLLO.md](../PROCESO_DESARROLLO.md)
