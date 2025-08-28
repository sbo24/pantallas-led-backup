# 🖥️ ShowsTrack - Frontend Pantallas Públicas

**Sistema de visualización en tiempo real para pantallas distribuidas en Puy du Fou España**

## 📋 Descripción

Este frontend está optimizado para **pantallas públicas** que muestran horarios y estados de espectáculos en tiempo real. Diseñado para visualización a distancia (3-10 metros) en resolución **1920x1080 Full HD**.

## 🎯 Características Principales

- ✅ **Auto-refresh 30s**: Actualización automática cada 30 segundos
- ✅ **Estados visuales**: PROGRAMADO (gris), ABIERTO (verde), CERRADO (rojo), CANCELADO (amarillo)
- ✅ **Layout optimizado**: Header 15% + Main 70% + Footer 15%
- ✅ **Tipografía a distancia**: Tamaños optimizados para lectura 3-10 metros
- ✅ **Gestión de errores**: Fallback automático y reintento con backoff exponencial
- ✅ **Modo offline**: Mantiene últimos datos válidos si pierde conexión
- ✅ **Responsive**: Adaptado para diferentes tamaños de pantalla

## 🚀 Instalación Rápida

### **⚠️ PASO CRÍTICO: Configurar API URL**

**ANTES de desplegar**, modificar `js/config.js`:

```javascript
const CONFIG = {
    // 🔧 CAMBIAR ESTA URL POR LA DE TU SERVIDOR
    API_URL: 'http://localhost:8000',  // ← MODIFICAR AQUÍ
    
    // Resto de configuración (no modificar)
    UPDATE_INTERVAL: 30000,
    MAX_SHOWS_DISPLAY: 5,
    // ...
};
```

### **Ejemplos de URLs**

```javascript
// Servidor local del parque
API_URL: 'http://192.168.1.100:8000',

// Dominio personalizado  
API_URL: 'https://showstrack.puydufou.es',

// IP pública
API_URL: 'http://203.45.67.89:8000',
```

### **Desplegar Archivos**

```bash
# Opción 1: Servidor web (recomendado)
cp -r frontend-public/ /var/www/html/pantallas/

# Opción 2: Servidor Python simple (desarrollo)
cd frontend-public/
python -m http.server 8080

# Opción 3: Abrir directamente
# Abrir index.html en navegador
```

## 📁 Estructura de Archivos

```
frontend-public/
├── index.html              # Página principal optimizada
├── css/
│   └── styles.css         # Estilos para pantallas Full HD
├── js/
│   ├── config.js          # ⚠️ CONFIGURACIÓN - MODIFICAR API_URL
│   └── app.js            # Cliente JavaScript vanilla
├── assets/
│   └── images/           # Logo y recursos (agregar logo.png)
└── README.md             # Esta documentación
```

## 🔧 Configuración

### **Variables Principales (config.js)**

```javascript
const CONFIG = {
    // 🔧 URL del backend ShowsTrack (OBLIGATORIO MODIFICAR)
    API_URL: 'http://localhost:8000',
    
    // Intervalo de actualización (30 segundos recomendado)
    UPDATE_INTERVAL: 30000,
    
    // Número máximo de shows a mostrar
    MAX_SHOWS_DISPLAY: 5,
    
    // Configuración de reintentos en caso de error
    RETRY_DELAYS: [5000, 10000, 20000],
    MAX_RETRIES: 3,
    
    // Configuración regional
    TIMEZONE: 'Europe/Madrid',
    TIME_FORMAT: {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }
};
```

### **Estados de Espectáculos**

```javascript
const SHOW_STATES = {
    PROGRAMADO: {
        class: 'status-programado',
        icon: '🕒',
        label: 'PROGRAMADO'
    },
    ABIERTO: {
        class: 'status-abierto',
        icon: '✅', 
        label: 'ABIERTO'
    },
    CERRADO: {
        class: 'status-cerrado',
        icon: '❌',
        label: 'CERRADO'
    },
    CANCELADO: {
        class: 'status-cancelado',
        icon: '⚠️',
        label: 'CANCELADO'
    }
};
```

## 🎨 Personalización

### **Modificar Colores Corporativos**

En `css/styles.css`:

```css
:root {
    /* Colores de estados */
    --color-programado: #6B7280;  /* Gris */
    --color-abierto: #10B981;     /* Verde */
    --color-cerrado: #EF4444;     /* Rojo */
    --color-cancelado: #F59E0B;   /* Amarillo */
    
    /* Colores corporativos */
    --color-background: #FFFFFF;   /* Fondo */
    --color-text-primary: #111827; /* Texto principal */
    --color-accent: #8B5A3C;      /* Color Puy du Fou */
}
```

### **Cambiar Logo**

1. Agregar logo en `assets/images/logo.png`
2. Modificar en `index.html`:

```html
<div class="logo-section">
    <img src="./assets/images/logo.png" 
         alt="Puy du Fou España" 
         class="logo">
</div>
```

### **Personalizar Mensajes**

En `js/app.js`, función `renderNoShows()`:

```javascript
renderNoShows() {
    this.elements.showsTbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 4rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🎭</div>
                <div style="font-size: 2rem; font-weight: 600; margin-bottom: 1rem;">
                    Mensaje personalizado aquí
                </div>
                <div style="font-size: 1.5rem; color: var(--color-text-secondary);">
                    Información adicional
                </div>
            </td>
        </tr>
    `;
}
```

## 🔍 Funcionamiento Técnico

### **Flujo de Datos**

```
1. Cliente JavaScript (app.js)
   ↓
2. Llamada API cada 30s: GET /api/public/schedules
   ↓  
3. Validación de datos recibidos
   ↓
4. Renderizado en tabla HTML
   ↓
5. Actualización visual con animaciones
```

### **Gestión de Errores**

- **Pérdida de conexión**: Mantiene últimos datos válidos
- **API no disponible**: Reintento automático con backoff exponencial
- **Datos inválidos**: Muestra mensaje de error informativo
- **Sin espectáculos**: Mensaje personalizable "No hay espectáculos"

### **Auto-refresh Inteligente**

```javascript
// Actualización cada 30 segundos
setInterval(() => {
    this.fetchAndRender();
}, 30000);

// Contador visual de próxima actualización
updateCountdown() {
    this.elements.nextUpdateTime.textContent = `${secondsLeft}s`;
}
```

## 🖥️ Configuración Pantallas

### **Navegador en Modo Kiosco**

**Chrome**:
```bash
google-chrome --kiosk --no-first-run --disable-infobars \
  http://pantallas.puydufou.local
```

**Firefox**:
```bash
firefox --kiosk http://pantallas.puydufou.local
```

### **Resolución Recomendada**

- **Óptima**: 1920x1080 (Full HD)
- **Mínima**: 1366x768
- **Orientación**: Horizontal (landscape)
- **Zoom navegador**: 100% (sin zoom)

## 🔧 Troubleshooting

### **Problemas Comunes**

| Problema | Causa | Solución |
|----------|-------|----------|
| Pantalla en blanco | URL incorrecta en config.js | Verificar API_URL |
| "No hay espectáculos" | API no responde | Verificar conectividad |
| No se actualiza | JavaScript deshabilitado | Habilitar JavaScript |
| Texto muy pequeño | Resolución incorrecta | Ajustar a 1920x1080 |

### **Verificar Funcionamiento**

1. **Abrir DevTools** (F12)
2. **Console**: Buscar logs de ShowsTrack Client
3. **Network**: Verificar llamadas a `/api/public/schedules`
4. **Esperar 30s**: Comprobar auto-refresh

**Logs esperados**:
```
🔍 CONFIG loaded: {API_URL: '...'}
🚀 ShowsTrack Client démarré  
🔄 Fetching new data...
✅ Données mises à jour avec succès
```

### **Test de Conectividad**

```bash
# Verificar API disponible
curl http://TU_SERVIDOR:8000/api/public/schedules

# Respuesta esperada
{
  "current_time": "2025-08-25T14:30:00",
  "display_mode": "normal", 
  "shows": [...],
  "metadata": {...}
}
```

## 📊 Monitoreo

### **Métricas Importantes**

- **Uptime pantallas**: > 99%
- **Latencia API**: < 2 segundos
- **Frecuencia actualización**: Cada 30 segundos
- **Errores de red**: < 1% de las llamadas

### **Alertas Recomendadas**

- API no responde > 5 minutos
- Pantalla sin actualizar > 10 minutos  
- Errores JavaScript frecuentes
- Conectividad de red intermitente

## 🚀 Despliegue en Producción

### **Checklist Pre-despliegue**

- [ ] ✅ Modificar `API_URL` en `config.js`
- [ ] ✅ Agregar logo corporativo en `assets/images/`
- [ ] ✅ Personalizar colores en `styles.css`
- [ ] ✅ Configurar mensajes personalizados
- [ ] ✅ Verificar conectividad al backend
- [ ] ✅ Probar en resolución 1920x1080

### **Checklist Post-despliegue**

- [ ] ✅ Verificar carga de datos en tiempo real
- [ ] ✅ Comprobar auto-refresh cada 30s
- [ ] ✅ Validar estados visuales correctos
- [ ] ✅ Configurar modo kiosco en navegador
- [ ] ✅ Establecer monitoreo automático
- [ ] ✅ Formar personal operativo

## 📞 Soporte

### **Documentación Adicional**

- **[Guía Despliegue Completa](../docs/pantallas-deployment.md)**: Configuración avanzada
- **[Especificaciones Frontend](../docs/frontend-specifications.md)**: Detalles técnicos UX/UI
- **[API Documentation](http://localhost:8000/docs)**: Endpoints disponibles

### **Contacto Técnico**

- **Logs del sistema**: Ver DevTools del navegador
- **Estado API**: `http://TU_SERVIDOR:8000/health`
- **Repositorio**: Documentación completa en `/docs/`

---

**🎉 ¡Frontend Pantallas ShowsTrack listo para Puy du Fou España!**