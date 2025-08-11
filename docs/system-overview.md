# 📋 ShowsTrack APP - Visión General del Sistema

## 1.1 Propósito y Alcance

### Problema que Resuelve

ShowsTrack APP es un sistema de gestión y visualización en tiempo real de horarios de espectáculos para Puy du Fou España. El sistema resuelve la necesidad crítica de:

- **Para visitantes**: Conocer en tiempo real qué espectáculos están disponibles para acceder
- **Para operadores**: Gestionar contingencias y comunicar cambios instantáneamente
- **Para el parque**: Optimizar flujos de visitantes y mejorar la experiencia general

### Usuarios del Sistema

1. **Visitantes del Parque**
   - Consultan pantallas públicas distribuidas por el parque
   - Necesitan información clara y actualizada cada 30 segundos
   - No interactúan directamente, solo visualizan

2. **Operadores del Sistema**
   - Personal del parque con acceso al panel administrativo
   - Gestionan la visualización y estados de los espectáculos
   - Pueden intervenir manualmente ante contingencias

3. **Sistema de Scripts Automatizados**
   - Procesos automáticos que sincronizan datos desde API externa
   - Ejecutan diariamente a las 6:00 AM
   - Actualizan la programación base sin afectar intervenciones manuales

### Componentes Principales y Responsabilidades

- **Backend API (FastAPI)**: Lógica de negocio, cálculo de estados, gestión de datos
- **Frontend Público (HTML/JS)**: Visualización optimizada para pantallas Media4Display
- **Panel Administrativo (Vue.js)**: Herramientas de gestión para operadores
- **Scripts Python**: Extracción y sincronización de datos externos
- **Base de Datos (PostgreSQL)**: Persistencia de configuración y estados

## 1.2 Arquitectura de Alto Nivel

### Flujo de Desarrollo: Enfoque Hybrid-First

El proyecto sigue una filosofía pragmática que combina velocidad y robustez:

1.  **Fase 1 (Prototipado Code-First)**: Se implementa la lógica central en FastAPI para obtener un MVP funcional rápidamente. El `openapi.json` generado es un artefacto del proceso.
2.  **Fase 2 (Estabilización Schema-Freeze)**: Una vez validado el MVP, el `openapi.json` se versiona y se convierte en el "contrato" oficial y la Fuente Única de la Verdad (SSOT).
3.  **Fase 3 (Expansión Schema-First)**: El desarrollo posterior, especialmente del frontend, se basa en un SDK de cliente TypeScript autogenerado a partir del contrato congelado, garantizando la sincronización y eliminando errores de integración.

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                        FUENTES EXTERNAS                         │
├─────────────────────────────────────────────────────────────────┤
│                    API Puy du Fou España                        │
│                 (Sistema origen de datos)                       │
└────────────────────┬───────────────────────────────────────────┘
                     │ [Extracción diaria 6:00 AM]
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA DE INTEGRACIÓN                          │
├─────────────────────────────────────────────────────────────────┤
│                    Scripts Python ETL                           │
│         • Extracción de datos via API REST                     │
│         • Procesamiento y validación                           │
│         • Generación de Excel + Webhook                        │
└────────────────────┬───────────────────────────────────────────┘
                     │ [Import API]
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND CORE                               │
├─────────────────────────────────────────────────────────────────┤
│                   FastAPI Application                           │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐       │
│  │  Public API │  │  Admin API   │  │ State Engine   │       │
│  │  (No Auth)  │  │  (JWT Auth)  │  │ (Calculator)   │       │
│  └─────────────┘  └──────────────┘  └────────────────┘       │
│                                                                 │
│  ┌─────────────────────────────────────────────────┐          │
│  │              PostgreSQL Database                 │          │
│  │  • Shows  • Events  • Overrides  • Settings     │          │
│  └─────────────────────────────────────────────────┘          │
└────────────┬──────────────────────────┬────────────────────────┘
             │                          │
             ▼                          ▼
┌───────────────────────┐   ┌────────────────────────┐
│   PANTALLAS PÚBLICAS  │   │   PANEL DE ADMIN       │
├───────────────────────┤   ├────────────────────────┤
│   HTML/CSS/JS Vanilla │   │   Vue.js 3 + TypeScript│
│   • Auto-refresh 30s  │   │   • Gestión shows      │
│   • Max 5 shows       │   │   • Overrides          │
│   • Estados visuales  │   │   • Alertas            │
│   • Modo alerta       │   │   • Modos auto/manual  │
└───────────────────────┘   └────────────────────────┘
```

### Flujos de Datos Principales

1. **Flujo de Sincronización Automática**
   ```
   API Externa → Scripts Python → Procesamiento → ShowsTrack API → DB
   ```

2. **Flujo de Visualización Pública**
   ```
   Pantalla → GET /schedules → State Engine → Response → Display
   ```

3. **Flujo de Gestión Manual**
   ```
   Operador → Panel Admin → API Admin → DB → Invalidar cache → Pantallas
   ```

### Tecnologías por Componente

| Componente | Tecnología Principal | Justificación |
|------------|---------------------|---------------|
| Backend API | FastAPI + Python 3.10 | Async, performance, auto-docs |
| Base de Datos | PostgreSQL 15 | Robustez, ACID, JSON support |
| Frontend Público | HTML5/CSS3/JS Vanilla | Máxima compatibilidad, cero dependencias |
| Panel Admin | Vue.js 3 + TypeScript | Productividad, type safety, reactividad |
| Scripts ETL | Python + pandas | Integración existente probada |
| Autenticación | JWT | Stateless, seguro, estándar |
| Deployment | Docker + docker-compose | Portabilidad, consistencia |

## 1.3 Casos de Uso Principales

### CU-01: Visualización en Pantallas Públicas

**Actor**: Visitante del parque  
**Objetivo**: Ver estado actual de espectáculos disponibles  
**Flujo Principal**:
1. Visitante se acerca a pantalla pública
2. Pantalla muestra máximo 5 espectáculos ordenados por proximidad
3. Cada espectáculo muestra:
   - Nombre del show
   - Hora del pase actual
   - Estado visual (color + icono): PROGRAMADO, ABIERTO, CERRADO
   - Próximo pase disponible (si existe)
4. Información se actualiza automáticamente cada 30 segundos
5. Si hay alerta global activa, se muestra solo el mensaje de alerta

**Casos Especiales**:
- Sin shows disponibles: Mensaje informativo
- Error de conexión: Mantener últimos datos válidos
- Horario de cierre: Mensaje especial

### CU-02: Gestión Operativa desde Panel Admin

**Actor**: Operador del sistema  
**Objetivo**: Controlar qué y cómo se muestra en las pantallas  
**Flujo Principal**:
1. Operador accede con credenciales al panel
2. Ve dashboard con:
   - Vista previa en tiempo real (réplica de pantallas)
   - Estado del sistema (modo auto/manual)
   - Shows activos y sus estados
3. Puede realizar acciones:
   - Toggle visibilidad de shows
   - Override manual de estados (CERRADO/CANCELADO)
   - Activar/desactivar alerta global
   - Cambiar entre modo automático/manual
   - Forzar sincronización manual

**Restricciones**:
- Overrides son por evento específico (no afectan otros pases)
- Overrides persisten ante nuevas importaciones
- Cambios requieren confirmación explícita

### CU-03: Sincronización Automática de Datos

**Actor**: Sistema de scripts Python  
**Objetivo**: Mantener datos actualizados desde fuente externa  
**Flujo Principal**:
1. Script ejecuta diariamente a las 6:00 AM
2. Conecta con API externa de Puy du Fou
3. Extrae datos de programación (7 días)
4. Procesa y valida información
5. Genera archivo Excel estructurado
6. Envía datos a ShowsTrack via webhook/API
7. Sistema procesa según modo:
   - Modo Automático: Aplica cambios inmediatamente
   - Modo Manual: Retiene cambios hasta sincronización explícita

**Validaciones**:
- Preservar siempre overrides manuales
- Detectar cambios mediante external_event_id
- Registrar log de importación

## 1.4 Integraciones Externas

### API Puy du Fou España

**Tipo**: REST API (Sistema origen)  
**Propósito**: Fuente principal de datos de programación  
**Características**:
- Endpoint de consulta de horarios por rango de fechas
- Respuesta en JSON con estructura específica
- Autenticación via API key
- Rate limiting: respetar límites del proveedor
- Datos incluyen: shows, horarios, duraciones, tipos de evento

### Sistema Media4Display

**Tipo**: Infraestructura de pantallas digitales  
**Propósito**: Mostrar información a visitantes  
**Características**:
- Pantallas full HD (1920x1080)
- Navegador embebido con capacidades HTML5
- Refresh automático configurable
- Sin capacidad táctil (solo visualización)
- Gestión centralizada de contenido

### Sistema de Scripts Python Existente

**Tipo**: Aplicación Python standalone  
**Propósito**: ETL y sincronización de datos  
**Componentes**:
- `puy_du_fou_api.py`: Cliente para API externa
- `data_processor.py`: Lógica de transformación
- `showstrack_formatter.py`: Adaptador para ShowsTrack
- `automated_sync.py`: Orquestador principal

**Integración con ShowsTrack**:
- Webhook POST a `/api/admin/import`
- Formato de datos acordado (JSON/Excel)
- Autenticación via token en headers
- Respuesta síncrona con resultado de importación

---

*Esta visión general proporciona el contexto completo del sistema ShowsTrack APP, estableciendo las bases para el desarrollo y mantenimiento del proyecto.*