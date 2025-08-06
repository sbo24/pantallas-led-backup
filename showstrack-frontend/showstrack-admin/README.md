# ShowsTrack Admin - Frontend Vue.js

Panel administrativo en tiempo real para gestión de espectáculos y eventos de ShowsTrack. Construido con Vue.js 3 + TypeScript + Tailwind CSS v4.

## 📋 Estado del Proyecto

**FASE 1 COMPLETADA** (2025-08-06) - ✅ **100% OPERATIVO**

- ✅ Vue.js 3.5.18 + Vite 5.4.19 + TypeScript 5.8.0
- ✅ Tailwind CSS v4.1.11 con @tailwindcss/vite plugin
- ✅ Pinia 3.0.3 + Vue Router 4.5.1 + Axios 1.11.0
- ✅ ESLint + Vitest + Testing configurado
- ✅ Docker environment integrado
- ✅ Backend proxy configurado (localhost:8000)

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
- **Headless UI** - Componentes accesibles sin estilos
- **Heroicons** - Iconografía consistente

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

# Tests unitarios
npm run test:unit         # ✅ 1/1 tests passing

# Linting y type checking
npm run lint              # ✅ ESLint configurado
npm run type-check        # ✅ TypeScript sin errores
```

## 📊 Métricas de Performance

### Build Optimizado
- **Build Time**: 1.56s
- **Bundle Size**: 96.71 kB (38.03 kB gzipped)
- **CSS Size**: 8.78 kB (2.64 kB gzipped)
- **Startup Time**: ~694ms

### Test Coverage
- **Unit Tests**: 1/1 passed (100%)
- **TypeScript**: Sin errores de compilación
- **ESLint**: Sin warnings críticos

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
│   ├── App.vue                    # ✅ Root component
│   ├── assets/                    # ✅ CSS, images, fonts
│   │   ├── main.css              # ✅ Tailwind CSS v4 import
│   │   ├── base.css              # ✅ Base styles
│   │   └── logo.svg
│   ├── components/               # ✅ Vue components
│   │   ├── HelloWorld.vue        # ✅ Demo component
│   │   └── __tests__/           # ✅ Component tests
│   ├── views/                   # ✅ Page components
│   │   ├── HomeView.vue         # ✅ Landing page
│   │   └── AboutView.vue        # ✅ About page
│   ├── router/                  # ✅ Vue Router config
│   │   └── index.ts             # ✅ Routes definition
│   └── stores/                  # ✅ Pinia stores
│       └── counter.ts           # ✅ Demo store
├── .env.development             # ✅ Environment variables
├── package.json                 # ✅ Dependencies configured
├── vite.config.ts              # ✅ Vite + Tailwind + Docker setup
├── tailwind.config.js          # ✅ Tailwind configuration
├── tsconfig.json               # ✅ TypeScript configuration
├── eslint.config.ts            # ✅ ESLint configuration
└── vitest.config.ts            # ✅ Test configuration
```

## 🔄 Próximos Pasos - FASE 2

### API Clients y Servicios (En desarrollo)
- [ ] API client con Axios + interceptors JWT
- [ ] Stores principales: auth, shows, events, alerts, config
- [ ] Sistema de autenticación completo

### Layout y Componentes Base
- [ ] AppLayout con sidebar + header responsivo
- [ ] Componentes base reutilizables
- [ ] Sistema de notificaciones

### Funcionalidades Principales
- [ ] Dashboard en tiempo real
- [ ] CRUD de shows y eventos
- [ ] Sistema de overrides manuales
- [ ] Centro de alertas globales

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

- **Proceso de desarrollo completo**: `/workspace/PROCESO_DESARROLLO_VUE.md`
- **Backend API**: `/workspace/showstrack-backend/README.md`
- **Testing Plan**: `/workspace/showstrack-frontend/TESTING_PLAN.md`

## 🎯 Objetivos del Proyecto

ShowsTrack Admin es el panel de control para operadores de parques de atracciones que necesitan:

1. **Monitoreo en tiempo real** de estados de espectáculos
2. **Intervención manual** con sistema de overrides
3. **Gestión de alertas** globales de emergencia
4. **Configuración operativa** del sistema

**Meta**: Panel administrativo production-ready integrado con backend funcional de 38 endpoints.
