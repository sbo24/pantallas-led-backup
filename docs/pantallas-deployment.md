# 🖥️ Guía de Despliegue - Pantallas Públicas ShowsTrack

**Documentación para la instalación y configuración de las pantallas públicas en Puy du Fou España**

## 📋 Resumen Ejecutivo

Las **pantallas públicas ShowsTrack** son displays distribuidos por el parque que muestran en tiempo real los horarios y estados de los espectáculos. Este documento detalla la configuración, instalación y mantenimiento de estos sistemas.

## 🎯 Especificaciones Técnicas

### **Hardware Recomendado**
- **Pantalla**: 1920x1080 Full HD (mínimo)
- **Orientación**: Horizontal (landscape)
- **Tamaño**: 32" - 55" según ubicación
- **Distancia visualización**: 3-10 metros
- **Conectividad**: Ethernet (recomendado) o WiFi estable
- **Sistema**: Cualquier dispositivo con navegador web moderno

### **Software Requerido**
- **Navegador**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Resolución**: 1920x1080 (optimizado)
- **JavaScript**: Habilitado (requerido)
- **Conexión**: Internet estable para API calls cada 30s

## 🚀 Instalación Rápida

### **Paso 1: Configurar la URL del Backend**

**⚠️ CRÍTICO**: Antes de desplegar, **MODIFICAR** la configuración en `frontend-public/js/config.js`:

```javascript
// 🔧 CONFIGURACIÓN OBLIGATORIA - MODIFICAR ANTES DEL DESPLIEGUE
const CONFIG = {
    // ⚠️ CAMBIAR ESTA URL POR LA URL DE PRODUCCIÓN
    API_URL: 'http://localhost:8000',  // ← MODIFICAR AQUÍ
    
    // Configuración temporal
    UPDATE_INTERVAL: 30000,      // 30 segundos
    RETRY_DELAYS: [5000, 10000, 20000],
    MAX_RETRIES: 3,
    CACHE_DURATION: 120000,      // 2 minutos
    ANIMATION_DURATION: 300,     // ms
    MAX_SHOWS_DISPLAY: 5,        // Máximo shows visibles
    
    // Configuración regional
    TIMEZONE: 'Europe/Madrid',
    TIME_FORMAT: {
        hour: '2-digit',
        minute: '2-digit', 
        hour12: false
    }
};
```

### **Ejemplos de URLs de Producción**

```javascript
// Ejemplo 1: Servidor interno del parque
API_URL: 'http://192.168.1.100:8000',

// Ejemplo 2: Dominio personalizado
API_URL: 'https://showstrack.puydufou.es',

// Ejemplo 3: IP pública con puerto
API_URL: 'http://203.45.67.89:8000',
```

### **Paso 2: Desplegar Archivos**

```bash
# Opción A: Servidor web local
# Copiar frontend-public/ al servidor web
cp -r frontend-public/ /var/www/html/pantallas/

# Opción B: Servidor Python simple (desarrollo)
cd frontend-public/
python -m http.server 8080

# Opción C: Nginx (producción)
# Ver sección "Configuración Nginx" más abajo
```

### **Paso 3: Configurar Pantalla**

1. **Abrir navegador** en pantalla
2. **Navegar** a la URL del frontend público
3. **Activar modo kiosco** (F11 o configuración del navegador)
4. **Verificar** que los datos se cargan correctamente
5. **Configurar auto-inicio** del navegador

## 🔧 Configuración Detallada

### **Configuración de Red**

**Requisitos de conectividad**:
- **Ancho de banda**: Mínimo 1 Mbps por pantalla
- **Latencia**: < 100ms al servidor ShowsTrack
- **Disponibilidad**: 99.5% uptime recomendado
- **Puertos**: HTTP (80) o HTTPS (443) + puerto API personalizado

**Test de conectividad**:
```bash
# Verificar conectividad al backend
curl -I http://TU_SERVIDOR:8000/health

# Verificar API pública
curl http://TU_SERVIDOR:8000/api/public/schedules
```

### **Configuración Nginx (Producción)**

```nginx
# /etc/nginx/sites-available/showstrack-pantallas
server {
    listen 80;
    server_name pantallas.puydufou.local;
    
    # Servir archivos estáticos
    location / {
        root /var/www/showstrack/frontend-public;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Headers para cache
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
    
    # Proxy para API (opcional)
    location /api/ {
        proxy_pass http://showstrack-backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Logs específicos
    access_log /var/log/nginx/pantallas.access.log;
    error_log /var/log/nginx/pantallas.error.log;
}
```

### **Configuración Navegador (Modo Kiosco)**

**Chrome/Chromium**:
```bash
# Iniciar en modo kiosco
google-chrome --kiosk --no-first-run --disable-infobars \
  --disable-session-crashed-bubble --disable-translate \
  --disable-features=TranslateUI --autoplay-policy=no-user-gesture-required \
  http://pantallas.puydufou.local
```

**Firefox**:
```bash
# Crear perfil kiosco
firefox -CreateProfile "kiosco /path/to/kiosco-profile"

# Iniciar en modo kiosco
firefox -P kiosco --kiosk http://pantallas.puydufou.local
```

## 🎨 Personalización Visual

### **Modificar Colores y Estilos**

Editar `frontend-public/css/styles.css`:

```css
/* Personalizar colores corporativos */
:root {
    /* Estados de espectáculos */
    --color-programado: #6B7280;  /* Gris */
    --color-abierto: #10B981;     /* Verde */
    --color-cerrado: #EF4444;     /* Rojo */
    --color-cancelado: #F59E0B;   /* Amarillo */
    
    /* Colores corporativos Puy du Fou */
    --color-background: #FFFFFF;   /* Fondo blanco */
    --color-text-primary: #1F2937; /* Texto principal */
    --color-accent: #8B5A3C;      /* Color corporativo */
    
    /* Tipografía para distancia */
    --font-size-title: 3.5rem;    /* 56px - Título principal */
    --font-size-show: 2.2rem;     /* 35px - Nombres shows */
    --font-size-time: 3rem;       /* 48px - Horarios */
}
```

### **Modificar Logo y Branding**

```html
<!-- En frontend-public/index.html -->
<div class="logo-section">
    <img src="./assets/images/logo-puydufou.png" 
         alt="Puy du Fou España" 
         class="logo">
</div>

<div class="title-section">
    <h1 class="main-title">HORARIOS DE ESPECTÁCULOS</h1>
    <!-- Opcional: subtítulo -->
    <p class="subtitle">Puy du Fou España - Toledo</p>
</div>
```

### **Configurar Mensajes Personalizados**

En `frontend-public/js/app.js`, modificar:

```javascript
renderNoShows() {
    this.elements.showsTbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 4rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🎭</div>
                <div style="font-size: 2rem; font-weight: 600; margin-bottom: 1rem;">
                    No hay espectáculos programados en este momento
                </div>
                <div style="font-size: 1.5rem; color: var(--color-text-secondary);">
                    Consulte información en recepción o en la app móvil
                </div>
            </td>
        </tr>
    `;
}
```

## 🔍 Monitoreo y Mantenimiento

### **Logs y Diagnóstico**

**Verificar funcionamiento**:
1. **Abrir DevTools** (F12) en la pantalla
2. **Revisar Console** para errores JavaScript
3. **Verificar Network** para llamadas API
4. **Comprobar** que el auto-refresh funciona (cada 30s)

**Logs típicos esperados**:
```
🔍 CONFIG loaded: {API_URL: 'http://...', ...}
🚀 ShowsTrack Client démarré
🔄 Fetching new data...
✅ Données mises à jour avec succès
```

**Errores comunes**:
```
❌ Erreur lors de la récupération: TypeError: Failed to fetch
→ Problema de conectividad o URL incorrecta

❌ Error: Invalid data structure  
→ API retorna formato incorrecto

⚠️ Affichage des dernières données valides
→ Pérdida temporal de conexión (normal)
```

### **Alertas y Notificaciones**

**Configurar alertas de sistema**:
```bash
# Script de monitoreo (cron cada 5 minutos)
#!/bin/bash
PANTALLA_URL="http://pantalla-01.puydufou.local"
API_URL="http://showstrack-api:8000/health"

# Verificar API
if ! curl -f -s $API_URL > /dev/null; then
    echo "ALERTA: API ShowsTrack no responde" | mail -s "Pantallas Error" admin@puydufou.es
fi

# Verificar pantalla (opcional)
if ! curl -f -s $PANTALLA_URL > /dev/null; then
    echo "ALERTA: Pantalla no accesible" | mail -s "Pantalla Offline" admin@puydufou.es
fi
```

### **Actualizaciones y Mantenimiento**

**Actualizar contenido**:
1. **Modificar** archivos en `frontend-public/`
2. **Subir** al servidor web
3. **Refrescar** navegador en pantallas (Ctrl+F5)
4. **Verificar** que los cambios se aplican

**Reinicio automático** (recomendado):
```bash
# Cron job para reiniciar navegador diariamente a las 6:00 AM
0 6 * * * pkill chrome && sleep 5 && /usr/bin/start-kiosco.sh
```

## 🚨 Troubleshooting

### **Problemas Comunes**

| Problema | Síntoma | Solución |
|----------|---------|----------|
| **Pantalla en blanco** | No se carga nada | Verificar URL en config.js |
| **"No hay espectáculos"** | Mensaje permanente | Verificar API_URL y conectividad |
| **Datos obsoletos** | No se actualiza | Verificar auto-refresh en DevTools |
| **Estados incorrectos** | Colores/estados erróneos | Verificar timezone en backend |
| **Texto muy pequeño** | No se lee a distancia | Ajustar font-size en CSS |

### **Comandos de Diagnóstico**

```bash
# Verificar conectividad
ping showstrack-api.puydufou.local

# Test API directamente
curl -v http://showstrack-api:8000/api/public/schedules

# Verificar logs del navegador
journalctl -u kiosco-chrome.service -f

# Reiniciar servicio pantalla
systemctl restart kiosco-chrome.service
```

### **Configuración de Emergencia**

**Modo offline** (si API no disponible):
```javascript
// En config.js - datos de fallback
const FALLBACK_DATA = {
    shows: [
        {
            show_name: "Información no disponible",
            current_pass: { start_time: "--:--", status: "PROGRAMADO" },
            next_pass: null
        }
    ],
    display_mode: "normal"
};
```

## 📞 Soporte y Contacto

### **Escalación de Problemas**

1. **Nivel 1** - Operador parque:
   - Reiniciar pantalla/navegador
   - Verificar conectividad básica
   - Reportar a IT si persiste

2. **Nivel 2** - IT Puy du Fou:
   - Verificar infraestructura de red
   - Revisar logs del sistema
   - Contactar desarrollo si necesario

3. **Nivel 3** - Equipo desarrollo:
   - Análisis técnico avanzado
   - Modificaciones de código
   - Actualizaciones del sistema

### **Información de Contacto**

- **Documentación**: `/docs/` en el repositorio
- **API Status**: `http://TU_SERVIDOR:8000/health`
- **Logs Backend**: Servidor ShowsTrack
- **Repositorio**: GitHub/GitLab del proyecto

---

## ✅ Checklist de Despliegue

**Antes del despliegue**:
- [ ] Modificar `API_URL` en `config.js`
- [ ] Verificar conectividad al backend
- [ ] Personalizar logo y colores corporativos
- [ ] Configurar mensajes personalizados
- [ ] Preparar servidor web (Nginx/Apache)

**Durante el despliegue**:
- [ ] Subir archivos al servidor
- [ ] Configurar navegador en modo kiosco
- [ ] Verificar carga de datos en tiempo real
- [ ] Probar auto-refresh (esperar 30s)
- [ ] Validar estados visuales correctos

**Después del despliegue**:
- [ ] Configurar monitoreo automático
- [ ] Establecer procedimientos de mantenimiento
- [ ] Formar al personal operativo
- [ ] Documentar configuración específica
- [ ] Programar revisiones periódicas

**🎉 ¡Pantallas ShowsTrack listas para producción!**