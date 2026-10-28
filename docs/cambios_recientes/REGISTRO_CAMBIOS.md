# 📋 REGISTRO DE CAMBIOS Y GUÍA DE REVERSIÓN

**Fecha:** 5 de Agosto de 2026 → actualizado 6 de Agosto de 2026  
**Módulo:** Pantallas Públicas (`frontend-public`) y Backend API  

---

## 📑 Resumen de Cambios Realizados

### 1. Refresco Suave e Imperceptible (Sin Parpadeo)
* **Archivo modificado:** [`frontend-public/js/app.js`](file:///workspace/frontend-public/js/app.js)
* **Descripción:** 
  * Se implementó un mecanismo de *Smart Diffing* (`this.lastRenderedHTML`) que compara si los datos que devuelve la API en cada intervalo de 30s son idénticos a los que están en pantalla. Si no han cambiado, se omite el re-renderizado del DOM.
  * Se eliminó el parpadeo visual que bajaba la opacidad a `0.7` (`this.elements.showsTbody.style.opacity = '0.7'`).

### 2. Actualización en Tiempo Real del Mensaje Personalizado
* **Archivos modificados:** 
  * [`frontend-public/js/app.js`](file:///workspace/frontend-public/js/app.js)
  * [`showstrack-backend/backend/app/routers/public.py`](file:///workspace/showstrack-backend/backend/app/routers/public.py)
* **Descripción:** 
  * Se incluyó la función `this.loadCustomMessage()` en el ciclo de refresco automático de 30 segundos (antes solo se cargaba una vez al inicio).
  * Se añadieron cabeceras anti-caché (`cache: 'no-store'` en `fetch` de JavaScript y `Cache-Control: no-store, no-cache, must-revalidate` en los endpoints de FastAPI) para evitar que los navegadores o VPlayer muestren mensajes obsoletos.

### 3. Servidor Web Multi-hilo para Pantallas Públicas
* **Archivos modificados:** 
  * [`frontend-public/cors_server.py`](file:///workspace/frontend-public/cors_server.py)
  * [`start_showstrack.sh`](file:///workspace/start_showstrack.sh)
* **Descripción:** 
  * Se actualizó `cors_server.py` para usar `socketserver.ThreadingTCPServer` con hilos independientes y reutilización inmediata de socket (`allow_reuse_address = True`). Esto evita que el servidor de pantallas se bloquee cuando múltiples dispositivos VPlayer se conectan al mismo tiempo.
  * Se actualizó `start_showstrack.sh` para que inicie este servidor multi-hilo en el puerto 8080/8081 en lugar del monohilo predeterminado de Python.

### 4. Estilo Píldora Roja para Estado "CERRADO"
* **Archivos modificados:** 
  * [`frontend-public/css/styles.css`](file:///workspace/frontend-public/css/styles.css)
  * [`frontend-public/index.html`](file:///workspace/frontend-public/index.html)
  * [`showstrack-frontend/showstrack-admin/src/components/operator/PublicDisplayPreview.vue`](file:///workspace/showstrack-frontend/showstrack-admin/src/components/operator/PublicDisplayPreview.vue)
* **Descripción:** 
  * Se configuró `--color-cerrado: #8B1E1E;` (rojo granate) y `color: white;` para que el estado `CERRADO` tenga la misma caja/píldora con esquinas redondeadas que el estado `ABIERTO`.
  * Se sincronizó la vista previa del panel de administración (`PublicDisplayPreview.vue`).
  * Se ajustó el ancho de la píldora a `width: auto` con `margin: 0 auto` y `min-width` escalable, logrando que los badges de estado queden perfectamente compactos y centrados en su columna.
  * Se añadió un parámetro de versión (`styles.css?v=1.2`) en `index.html` para invalidar la caché CSS de los navegadores.

### 5. Centrado Correcto de las Píldoras de Estado (CERRADO / ABIERTO)
* **Archivos modificados:**
  * [`frontend-public/css/styles.css`](file:///workspace/frontend-public/css/styles.css)
  * [`showstrack-frontend/showstrack-admin/src/components/operator/PublicDisplayPreview.vue`](file:///workspace/showstrack-frontend/showstrack-admin/src/components/operator/PublicDisplayPreview.vue)
  * [`frontend-public/index.html`](file:///workspace/frontend-public/index.html) (`styles.css?v=1.3`)
* **Descripción:**
  * Se eliminó `margin: 0 auto` de `.show-status` ya que causaba conflicto con `text-align: center` del `td` padre. Con `display: inline-flex` y `text-align: center` en el `td`, el centrado funciona correctamente de forma nativa.
* **Para revertir:** Volver a añadir `margin: 0 auto;` en `.show-status` en `styles.css` y `PublicDisplayPreview.vue`.

### 6. Corrección de Desalineación Vertical entre Columnas
* **Archivos modificados:**
  * [`frontend-public/css/styles.css`](file:///workspace/frontend-public/css/styles.css)
  * [`frontend-public/index.html`](file:///workspace/frontend-public/index.html) (`styles.css?v=1.4`)
* **Problema detectado:** La columna izquierda (nombre del show) estaba visualmente más baja que las columnas derechas (HORA, estado, SIGUIENTE). El `<span>` de `.show-time` y `.show-next` tenía `height: 100%`, que en un `inline-flex` dentro de un `td` con `padding` produce comportamiento inconsistente entre navegadores, desalineando el contenido verticalmente.
* **Descripción:** Se eliminó `height: 100%` de `.show-time` y `.show-next` (versiones `.public-display-preview` y global). El `td` ya tiene `vertical-align: middle` que centra correctamente el contenido sin necesitar que el hijo se estire al 100% de la celda.
* **Para revertir:** Volver a añadir `height: 100%;` en `.show-time` y `.show-next` en `styles.css`.

---

## ⏪ Cómo Revertir los Cambios (Volver Atrás)

### Opción A: Revertir usando las Copias de Seguridad (Recomendado)
Se crearon copias de seguridad completas antes de las modificaciones en la carpeta `/workspace/backups/`:

1. **Restaurar todo el proyecto al estado inicial:**
   ```bash
   tar -xzvf /workspace/backups/showstrack_project_backup_20260804.tar.gz -C /workspace
   ```

2. **Restaurar la base de datos (si fuera necesario):**
   ```bash
   # Archivo de volcado completo JSON disponible en:
   /workspace/backups/db_dump_20260804.json
   ```

### Opción B: Revertir archivo por archivo vía Git
Si solo deseas revertir archivos específicos sin tocar el resto del proyecto:

1. **Revertir estilos (quitar píldora roja en CERRADO):**
   ```bash
   git checkout /workspace/frontend-public/css/styles.css
   git checkout /workspace/showstrack-frontend/showstrack-admin/src/components/operator/PublicDisplayPreview.vue
   ```

2. **Revertir lógica de refresco y JS:**
   ```bash
   git checkout /workspace/frontend-public/js/app.js
   git checkout /workspace/frontend-public/index.html
   ```

3. **Revertir backend y servidor:**
   ```bash
   git checkout /workspace/showstrack-backend/backend/app/routers/public.py
   git checkout /workspace/frontend-public/cors_server.py
   git checkout /workspace/start_showstrack.sh
   ```

---

## 🔄 Reiniciar Servicios
Después de cualquier restauración o cambio, reinicia los servicios del sistema con:
```bash
/workspace/start_showstrack.sh
```
