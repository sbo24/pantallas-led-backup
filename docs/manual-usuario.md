# Manual de Usuario - ShowsTrack

## ¿Qué es ShowsTrack?

ShowsTrack es un sistema de gestión y visualización de horarios de espectáculos en tiempo real para Puy du Fou España. El sistema permite:

- **Visualizar** los horarios de espectáculos en pantallas públicas distribuidas por el parque
- **Gestionar** manualmente los estados de los espectáculos ante contingencias
- **Sincronizar** automáticamente los horarios desde el sistema central
- **Comunicar** alertas e información importante a los visitantes

El sistema calcula automáticamente cuándo un espectáculo está abierto para acceder, cerrado o cancelado, y muestra esta información de forma clara y actualizada cada 30 segundos.

---

## Acceso al Sistema

### URLs del Sistema ShowsTrack

El sistema ShowsTrack cuenta con dos interfaces principales:

**🎬 Panel de Gestión (Admin):**
- **URL**: http://172.26.131.240:3001/
- **Acceso**: Con usuario y contraseña
- **Para**: Operadores y administradores del sistema

**📺 Pantallas Públicas:**
- **URL**: http://172.26.131.240:8081/
- **Acceso**: Público (sin autenticación)
- **Para**: Visualización de horarios en pantallas del parque

**📚 Wiki / Manual de Usuario:**
- **URL**: http://172.26.131.240:8081/wiki/
- **Acceso**: Público
- **Para**: Consulta de documentación y ayuda

### Pantalla de Inicio de Sesión

Para acceder al panel de administración:

1. Abra su navegador web
2. Acceda a: **http://172.26.131.240:3001/**
3. Introduzca su **nombre de usuario** y **contraseña**
4. Haga clic en **"Iniciar Sesión"**

**Nota**: Solo el personal autorizado tiene credenciales de acceso. Si no puede iniciar sesión, contacte con el administrador del sistema.

---

## Menú Principal

Una vez dentro del sistema, encontrará las siguientes secciones en el menú lateral:

### 📊 Dashboard

El Dashboard es su punto de partida. Muestra un resumen visual rápido del estado del sistema:

**¿Qué puedo ver aquí?**

- **Shows Activos**: Número de espectáculos configurados como visibles en las pantallas públicas
- **Eventos de Hoy**: Cantidad de funciones programadas para el día actual
- **Alertas Activas**: Si hay alguna alerta global activada (aparece destacada)
- **Overrides Manuales**: Número de intervenciones manuales aplicadas actualmente

**¿Cuándo usar esta sección?**

- Al iniciar sesión, para tener una visión general del día
- Para verificar rápidamente si hay alertas o situaciones especiales
- Para comprobar cuántos espectáculos están activos

---

### 🎭 Gestión de Espectáculos

Esta sección le permite administrar el catálogo de espectáculos del parque.

**¿Qué puedo hacer aquí?**

1. **Ver todos los espectáculos**: Lista completa de shows configurados en el sistema
   - Nombre del espectáculo
   - Duración en minutos
   - Orden de visualización
   - Si está visible en pantallas públicas
   - Número de eventos programados para hoy

2. **Crear un nuevo espectáculo**:
   - Haga clic en el botón **"+ Nuevo Show"**
   - Complete el formulario:
     - **Nombre**: Nombre del espectáculo (ej: "El Sueño de Toledo")
     - **Duración**: Tiempo en minutos (ej: 50)
     - **Orden de visualización**: Posición en la que aparecerá (1-5)
     - **Visible**: Active esta opción para que aparezca en pantallas públicas
   - Guarde los cambios

3. **Editar un espectáculo existente**:
   - Haga clic en el icono de **lápiz** (✏️) junto al espectáculo
   - Modifique los campos necesarios
   - Guarde los cambios

4. **Eliminar un espectáculo**:
   - Haga clic en el icono de **papelera** (🗑️)
   - Confirme la eliminación
   - **Atención**: Esto eliminará también todos los eventos asociados

5. **Funciones avanzadas**:
   - **Búsqueda**: Filtre espectáculos por nombre
   - **Ordenar**: Haga clic en las cabeceras de columna para ordenar
   - **Selección múltiple**: Marque varios shows para acciones en lote
   - **Exportar**: Descargue la lista en formato Excel o CSV
   - **Activar/Desactivar varios shows**: Cambie la visibilidad de varios a la vez

**¿Cuándo usar esta sección?**

- Al inicio de temporada, para configurar los espectáculos disponibles
- Cuando se añade o retira un espectáculo del parque
- Para cambiar el orden de visualización en las pantallas
- Para ocultar temporalmente un show sin eliminarlo

---

### 📅 Gestión de Eventos

Los eventos son las funciones individuales de cada espectáculo en fechas y horas específicas.

**¿Qué puedo hacer aquí?**

1. **Ver eventos del día**:
   - Lista de todas las funciones programadas para hoy
   - Estado actual de cada evento (PROGRAMADO, ABIERTO, CERRADO, CANCELADO)
   - Información de overrides manuales aplicados

2. **Aplicar overrides manuales**:

   Un **override** es una intervención manual que fuerza un estado específico a un evento, ignorando el cálculo automático.

   **¿Cuándo aplicar un override?**
   - El espectáculo se cancela por lluvia → Override "CANCELADO"
   - Se cierra el acceso antes de tiempo → Override "CERRADO"
   - Hay un problema técnico → Override según la situación

   **Pasos para aplicar un override**:
   - Localice el evento en la tabla
   - Haga clic en el botón de estado (ej: "CERRADO" o "CANCELADO")
   - Escriba un **motivo** claro y descriptivo (obligatorio)
   - Confirme la acción
   - El estado se actualizará inmediatamente en las pantallas públicas

3. **Gestión de cambios pendientes** (Modo Manual):

   Cuando el sistema está en **modo manual**, los cambios de la sincronización automática quedan pendientes para su revisión.

   - **Ver cambios pendientes**: Lista de modificaciones propuestas por la sincronización
   - **Previsualizar cambio**: Vea en detalle qué va a cambiar
   - **Aplicar cambios seleccionados**: Marque los cambios que quiere aceptar y aplíquelos
   - **Descartar cambios**: Rechace los cambios que no desea aplicar
   - **Ejecutar sincronización completa**: Aplique todos los cambios pendientes de una vez

4. **Importar eventos desde archivo**:

   - Haga clic en **"Importar Eventos"**
   - Seleccione un archivo JSON con el formato correcto
   - El sistema validará el archivo y mostrará un resumen
   - Revise los eventos nuevos, actualizados y conflictos
   - Confirme la importación si todo es correcto

5. **Ver historial de importaciones**:
   - Consulte todas las importaciones realizadas
   - Fecha y hora de cada importación
   - Número de eventos aplicados, fallidos y omitidos
   - Usuario que realizó la acción

6. **Cambiar modo de operación**:

   El sistema tiene dos modos:

   - **Modo Automático**: Los cambios de sincronización se aplican inmediatamente sin revisión
   - **Modo Manual**: Los cambios quedan pendientes para revisión y aprobación manual

   Para cambiar de modo:
   - Haga clic en el botón **"Cambiar a Modo..."**
   - Confirme el cambio
   - El nuevo modo se aplicará inmediatamente

**¿Cuándo usar esta sección?**

- Durante el día, para monitorear el estado de los eventos
- Cuando necesite cancelar o cerrar manualmente un evento
- Para revisar y aprobar cambios cuando está en modo manual
- Para importar horarios manualmente desde archivos
- Al final del día, para consultar el historial

---

### 🚨 Centro de Alertas

Permite gestionar alertas globales que aparecen destacadas en todas las pantallas públicas.

*** Nota: Actualmente todas las alertas sin importar el tipo, se muestran con fondo rojo y una señal de alerta. Estas son visibles unicamente desde la url de acceso a las pantallas. No desde la vista de operador.***

**¿Qué puedo hacer aquí?**

1. **Ver alerta activa actual**:
   - Si hay una alerta activa, se muestra con su mensaje y tipo
   - Información de quién la activó y cuándo

2. **Activar una nueva alerta global**:

   **Pasos**:
   - Escriba el **mensaje de alerta** (mínimo 10 caracteres)
   - Seleccione el **tipo de alerta**:
     - **Info** (azul): Información general
     - **Warning** (amarillo): Advertencia importante
     - **Error** (rojo): Emergencia o situación crítica
   - Haga clic en **"Activar Alerta Global"**
   - Confirme la acción
   - La alerta aparecerá inmediatamente en todas las pantallas

3. **Desactivar la alerta activa**:
   - Haga clic en **"Desactivar Alerta"**
   - Confirme la acción
   - La alerta desaparecerá de todas las pantallas

**Ejemplos de cuándo usar alertas**:
- Cierre anticipado del parque por mal tiempo
- Aviso importante sobre un espectáculo
- Información de evacuación o emergencia
- Comunicados generales importantes

**Buenas prácticas**:
- Use mensajes claros y concisos
- Seleccione el tipo correcto según la urgencia
- Desactive la alerta cuando ya no sea necesaria
- No abuse de las alertas para que mantengan su efectividad

---

### ⚙️ Configuración del Sistema

*** Nota: Todavia no hay roles implementados. ***

**Nota**: Esta sección solo está disponible para usuarios con rol de **Administrador**.

**¿Qué puedo hacer aquí?**

1. **Configuración de tiempos de espera**:
   - **Minutos antes del inicio**: Tiempo de antelación para abrir el acceso al espectáculo
   - Ejemplo: Si pone 30, el show se marca como "ABIERTO" 30 minutos antes de empezar

2. **Configuración de pantallas públicas**:
   - **Número máximo de shows**: Cuántos espectáculos se muestran simultáneamente (máximo 5)
   - **Intervalo de actualización**: Cada cuántos segundos se refresca la información

3. **Configuración de autenticación**:
   - **Tiempo de expiración de tokens**: Duración de las sesiones de usuario
   - Configuraciones de seguridad

4. **Gestión de usuarios** (si está disponible):
   - Crear nuevos usuarios
   - Modificar permisos
   - Desactivar cuentas

**¿Cuándo usar esta sección?**

- Al configurar el sistema por primera vez
- Para ajustar los tiempos de apertura según las necesidades operativas
- Para gestionar el acceso de nuevos operadores
- Cuando necesite cambiar parámetros globales del sistema

---

### 🎬 👉 Vista de Operador 

Esta es la vista principal durante la operación diaria. Combina visualización y control en una sola pantalla.

**¿Qué puedo ver y hacer aquí?**

**Panel izquierdo - Preview de Pantallas Públicas**:

- Visualización en tiempo real de cómo se ve la información en las pantallas del parque
- **Modo Demo**: Active esta opción para ver datos de ejemplo sin afectar el sistema real
- **Actualizar Preview**: Refresque manualmente la vista previa

**Panel derecho - Controles Manuales**:

1. **Cuadrícula de Shows**:
   - Una tarjeta por cada espectáculo visible
   - Para cada show puede ver:
     - Nombre del espectáculo
     - Próximo evento (hora de inicio)
     - Estado actual calculado
     - Botones de acción rápida

2. **Acciones rápidas por show**:
   - **Cerrar**: Fuerza el cierre del acceso al próximo evento
   - **Cancelar**: Marca el próximo evento como cancelado
   - **No implementado aún> Limpiar Override**: Elimina cualquier intervención manual y vuelve al cálculo automático

3. **Mensaje Personalizado**:
   - Escriba un mensaje que aparecerá en las pantallas públicas
   - Máximo 100 caracteres
   - Útil para comunicados rápidos sin activar una alerta
   - Haga clic en **"Guardar Mensaje"** para aplicarlo

**¿Cuándo usar esta sección?**

- Durante la operación diaria del parque
- Para monitorear en tiempo real el estado de los shows
- Para gestionar shows rápidamente sin navegar por menús
- Para ver "aproximadamente" lo que están viendo los visitantes
- Cuando necesite enviar mensajes informativos breves

**Flujo de trabajo típico**:
1. Abra la Vista de Operador al iniciar el turno
2. Revise el preview de pantallas públicas
3. Mantenga esta vista abierta durante el día
4. Aplique overrides según sea necesario con los botones de acción rápida
5. Use el mensaje personalizado para comunicados informativos

**Nota**: Podemos ver exactamente lo que esta apareciendo en las pantallas desde:
http://172.26.131.240:8081/

---

## Conceptos Clave

### Estados de Eventos

El sistema calcula automáticamente 4 estados posibles para cada evento:

1. **PROGRAMADO** (⚪ Gris):
   - El evento está anunciado
   - Aún no es momento de acceder
   - Aparece en las pantallas como "programado"

2. **ABIERTO** (🟢 Verde):
   - El acceso al espectáculo está abierto
   - Los visitantes pueden dirigirse al recinto
   - Se calcula automáticamente según el tiempo configurado antes del inicio

3. **CERRADO** (🔴 Rojo):
   - El acceso está cerrado
   - El show está en curso o ya finalizó
   - Los visitantes no pueden acceder

4. **CANCELADO** (🟡 Amarillo):
   - El evento ha sido cancelado
   - Solo se puede aplicar manualmente mediante override
   - Motivos típicos: lluvia, problemas técnicos, etc.

### ¿Qué es un Override?

Un **override** (intervención manual) es una acción que fuerza un estado específico a un evento, ignorando el cálculo automático del sistema. (Programación previamente establecida)

**Características importantes**:
- Requiere siempre un **motivo** escrito
- Se registra quién lo aplicó y cuándo
- **No se sobrescribe nunca** por las sincronizaciones automáticas
- Permanece hasta que se elimine manualmente
- Es la forma de gestionar contingencias en tiempo real

**Ejemplo práctico**:
- Sin override: El sistema abre el show automáticamente 30 min antes
- Con override "CANCELADO": El show aparece cancelado independientemente de la hora

### Modos de Operación

**Modo Automático**:
- Las sincronizaciones diarias se aplican inmediatamente
- Ideal para operación normal sin cambios frecuentes
- Menos trabajo manual, más automatización

**Modo Manual**:
- Las sincronizaciones quedan pendientes de revisión
- Usted decide qué cambios aplicar y cuáles descartar
- Más control, pero requiere revisión diaria
- Recomendado durante períodos con muchos cambios o eventos especiales

### Sincronización Automática ETL

El sistema se sincroniza automáticamente cada 2 horas con los datos centrales de Puy du Fou:

- **Frecuencia**: Cada 2 horas (00:05, 02:05, 04:05, etc.)
- **Qué sincroniza**: Horarios, nuevos eventos, cambios en shows
- **Qué NO toca**: Overrides manuales (se respetan siempre)
- **Dónde se ve**: En la sección de Eventos, pestaña "Cambios Pendientes" (modo manual)

---

## Casos de Uso Comunes

### Caso 1: Cancelar un espectáculo por lluvia

1. Vaya a **Vista de Operador** o **Gestión de Eventos**
2. Localice el evento del show afectado
3. Haga clic en el botón **"Cancelar"**
4. Escriba el motivo: *"Cancelado por lluvia"*
5. Confirme la acción
6. El estado aparecerá inmediatamente en las pantallas como CANCELADO

### Caso 2: Cerrar acceso antes de tiempo

1. Vaya a **Vista de Operador**
2. Localice el show en la cuadrícula
3. Haga clic en **"Cerrar"**
4. Escriba el motivo: *"Aforo completo"*
5. Confirme
6. El acceso se marca como cerrado inmediatamente

### Caso 3: Activar alerta por cierre anticipado del parque

1. Vaya a **Centro de Alertas**
2. Escriba el mensaje: *"El parque cerrará hoy a las 18:00 por previsión meteorológica"*
3. Seleccione tipo: **Warning** (amarillo)
4. Haga clic en **"Activar Alerta Global"**
5. Confirme
6. Todos los visitantes verán el mensaje destacado

### Caso 4: Revisar cambios antes de aplicarlos (Modo Manual)

1. Asegúrese de estar en **Modo Manual** (verifique en Gestión de Eventos)
2. Vaya a **Gestión de Eventos** → pestaña **"Cambios Pendientes"**
3. Revise la lista de cambios propuestos
4. Haga clic en **"👁️ Ver"** para previsualizar cada cambio en detalle
5. Marque los cambios que desea aplicar
6. Haga clic en **"Aplicar Seleccionados"**
7. Descarte los que no desee con **"Descartar Seleccionados"**

### Caso 5: Añadir un nuevo espectáculo

1. Vaya a **Gestión de Espectáculos**
2. Haga clic en **"+ Nuevo Show"**
3. Complete el formulario:
   - Nombre: *"Nuevo Show 2024"*
   - Duración: *45* minutos
   - Orden: *3*
   - Visible: ✅ (marcado)
4. Guarde
5. El show aparecerá en la lista y estará disponible para programar eventos

### Caso 6: Importar horarios manualmente

1. Obtenga el archivo JSON con los horarios (del departamento correspondiente)
2. Vaya a **Gestión de Eventos**
3. Haga clic en **"📤 Importar Eventos"**
4. Seleccione el archivo JSON
5. Revise el resumen de validación:
   - Eventos nuevos: X
   - Eventos actualizados: Y
   - Conflictos: Z
6. Si hay conflictos, revíselos cuidadosamente
7. Confirme la importación
8. Los eventos se aplicarán al sistema

---

## Buenas Prácticas

### Gestión de Overrides

✅ **Sí hacer**:
- Siempre escriba un motivo claro y descriptivo
- Elimine el override cuando la situación se normalice
- Revise los overrides activos al final del día

❌ **No hacer**:
- No deje overrides antiguos "olvidados"
- No use motivos genéricos como "prueba" o "test"
- No abuse de los overrides para situaciones que deberían configurarse en el sistema

### Gestión de Alertas

✅ **Sí hacer**:
- Use alertas solo para información realmente importante
- Desactive la alerta cuando ya no sea necesaria
- Elija el tipo correcto (info/warning/error) según la urgencia

❌ **No hacer**:
- No deje alertas activadas más tiempo del necesario
- No use alertas para información rutinaria
- No active múltiples alertas simultáneamente

### Operación Diaria

✅ **Sí hacer**:
- Revise el Dashboard al iniciar el turno
- Mantenga abierta la Vista de Operador durante el día
- Revise los cambios pendientes diariamente (si está en modo manual)
- Documente situaciones especiales en los motivos de override

❌ **No hacer**:
- No cierre sesión sin verificar que no hay alertas activas innecesarias
- No cambie de modo (automático/manual) sin consultar con supervisión
- No elimine espectáculos sin verificar que no tienen eventos futuros programados

---

## Solución de Problemas

### No puedo iniciar sesión

- Verifique que su usuario y contraseña son correctos
- Asegúrese de que está usando la URL correcta del sistema
- Contacte con el administrador si el problema persiste

### No veo cambios en las pantallas públicas

- Los cambios se reflejan cada 30 segundos, espere un momento
- Verifique que el espectáculo está marcado como "Visible"
- Verifique que no hay problemas de red con las pantallas

### Un override no se aplica

- Asegúrese de haber escrito un motivo (obligatorio)
- Verifique que confirmó la acción
- Refresque la página y vuelva a intentar
- Si persiste, contacte con soporte técnico

### Los cambios pendientes no aparecen

- Verifique que está en **Modo Manual**
- La sincronización ocurre cada 2 horas, puede que aún no haya datos nuevos
- Haga clic en "Actualizar" para refrescar la vista

### No puedo acceder a Configuración

- Esta sección requiere permisos de **Administrador**
- Si necesita acceso, solicítelo al administrador del sistema

---

## Glosario

- **Show/Espectáculo**: Un tipo de espectáculo del parque (ej: "El Sueño de Toledo")
- **Evento**: Una función específica de un show en una fecha y hora concreta
- **Override**: Intervención manual que fuerza un estado específico
- **Estado**: Situación actual de un evento (PROGRAMADO, ABIERTO, CERRADO, CANCELADO)
- **Sincronización**: Proceso automático de actualización de horarios
- **ETL**: Sistema de extracción y sincronización automática de datos
- **Modo Automático**: Los cambios se aplican sin revisión
- **Modo Manual**: Los cambios requieren aprobación antes de aplicarse
- **Alerta Global**: Mensaje destacado que aparece en todas las pantallas
- **Preview**: Vista previa de cómo se muestran las pantallas públicas

---

## ⚠️ Limitaciones y Notas Importantes de Esta Versión

### Funcionalidades NO Implementadas

#### ❌ 1. NO se pueden eliminar overrides

**IMPORTANTE**: Una vez aplicado un override (CERRADO o CANCELADO), **NO puede deshacerlo** desde la interfaz.

- No existe botón "Limpiar Override" o "Deshacer"
- El override es permanente hasta que el evento pasa de fecha
- Para eliminarlo antes requiere intervención técnica (acceso a base de datos)

**Recomendación operativa:**
- ✅ Verifique DOS VECES antes de aplicar un override
- ✅ Escriba motivos muy claros que justifiquen la acción
- ✅ Documente en bitácora los overrides aplicados

**Planificado para**: Versión 1.1

#### ❌ 2. Configuración del Sistema - Vista sin funcionalidad

La sección "⚙️ Configuración del Sistema" está creada pero **sin funcionalidad** en esta versión.

**NO se puede configurar desde interfaz:**
- Lead times globales
- Tiempos de expiración de sesión
- Parámetros de pantallas públicas
- Gestión de usuarios

**Cómo configurar Lead Time:**

**Opción A - Por Show (FUNCIONAL):**
1. Vaya a "Gestión de Espectáculos"
2. Edite el show deseado
3. Complete los campos "Lead Time Access" y "Lead Time Finalized"
4. Si se dejan vacíos, usa los valores globales del sistema

**Opción B - Global (Requiere acceso técnico):**
- Acceso directo a base de datos
- Contacte con el administrador del sistema

**¿Qué es el Lead Time?**

Lead Time = Tiempo de anticipación antes del show

Ejemplo práctico:
```
Show: "El Sueño de Toledo" a las 20:00
Lead Time Access: 30 minutos
Lead Time Finalized: 5 minutos

Timeline de estados:
19:30 → Estado cambia a ABIERTO (30 min antes del inicio)
19:55 → Estado cambia a CERRADO (5 min antes del inicio)
20:00 → Show comienza
```

**Planificado para**: Versión 1.2

#### ❌ 3. Gestión de Usuarios - No implementada

No existe interfaz para crear o gestionar usuarios.

**Estado actual:**
- Todos los usuarios autenticados tienen acceso completo
- No hay diferenciación de permisos (todos son operator/admin)
- Creación de usuarios requiere acceso a base de datos

**Planificado para**: Versión 1.3

### Limitaciones Conocidas

#### ⚠️ 1. Vista de Operador - Preview NO es 100% exacto

El preview de pantallas públicas en la Vista de Operador es una **simulación aproximada**.

**LO QUE SÍ ES EXACTO:**
- ✅ Qué shows aparecen
- ✅ Qué pases (horarios) se muestran
- ✅ Los estados (PROGRAMADO, ABIERTO, CERRADO, CANCELADO)
- ✅ Cambios de estado en tiempo real
- ✅ Contenido de alertas y mensajes personalizados

**LO QUE PUEDE DIFERIR:**
- ❌ Estilos CSS exactos
- ❌ Tamaños de fuente
- ❌ Animaciones y transiciones
- ❌ Sincronización exacta del reloj

**RECOMENDACIÓN OPERATIVA:**

Cuando active una alerta o aplique un override importante:

1. Use la Vista de Operador para los controles rápidos
2. **SIEMPRE verifique** en la URL real de pantallas públicas: **http://172.26.131.240:8081/**
3. Abra esa URL en otra ventana/pestaña como referencia de verificación

#### ⚠️ 2. Persistencia de Shows - Cambios permanentes

**MUY IMPORTANTE**: Los cambios en shows son **PERMANENTES y afectan TODOS los días**.

Los shows son entidades del catálogo permanente:
- Si modifica nombre, duración, orden o lead time de un show, el cambio aplica a:
  - ✅ Todos los eventos futuros
  - ✅ Todos los eventos pasados (en histórico)
  - ✅ TODOS los días

**NO existe:**
- ❌ "Versión por día" de un show
- ❌ Cambios temporales en shows
- ❌ Shows solo para días específicos

**Para cambios temporales:**
- Use la opción "Visible: No" para ocultar un show temporalmente
- O aplique overrides en eventos específicos de ese día

**Ejemplo:**
Si cambia "El Sueño de Toledo" a "Toledo Night Show", todos los eventos (pasados, presentes y futuros) mostrarán el nuevo nombre inmediatamente.

### Notas Operativas Importantes

#### 📍 Sincronización ETL - Qué toca y qué no

**Frecuencia**: Cada 2 horas (00:05, 02:05, 04:05, etc.)

**✅ SE SINCRONIZA:**
- Nuevos eventos desde sistema externo
- Actualizaciones de horarios
- Cambios en shows del sistema externo

**🔒 NUNCA SE TOCA:**
- Overrides manuales (respetados SIEMPRE)
- Shows creados manualmente en el sistema
- Lead times personalizados por show
- Configuración del sistema

#### 📍 Estados de Eventos - Cálculo automático

Los estados se calculan **automáticamente cada 30 segundos** basándose en:
- Hora actual
- Hora de inicio del evento
- Lead times configurados (global o personalizado del show)

**Transiciones automáticas:**
- PROGRAMADO → ABIERTO (según lead time access)
- ABIERTO → CERRADO (según lead time finalized)

**Estado manual:**
- CANCELADO (solo vía override manual)

### Checklist Operativa

**Al aplicar overrides:**
- [ ] He verificado que es el evento correcto (fecha, hora, show)
- [ ] He escrito un motivo claro y detallado
- [ ] Entiendo que NO podré deshacerlo
- [ ] He documentado la acción si es necesario

**Al activar alertas globales:**
- [ ] El mensaje es claro y conciso (mínimo 10 caracteres)
- [ ] He seleccionado el tipo correcto (Info/Warning/Error)
- [ ] He verificado en http://172.26.131.240:8081/ cómo se ve
- [ ] Sé cuándo la desactivaré

**Al modificar shows:**
- [ ] Entiendo que el cambio es permanente (todos los días)
- [ ] He verificado que es el cambio correcto
- [ ] He exportado un backup si es cambio masivo

**Al inicio del turno:**
- [ ] Abrir Dashboard para visión general
- [ ] Abrir Vista de Operador en una ventana
- [ ] Abrir Pantallas Públicas (http://172.26.131.240:8081/) en otra ventana
- [ ] Verificar si hay alertas activas
- [ ] Revisar overrides pendientes (si hay)

### Soluciones Temporales (Workarounds)

**Si aplicó un override por error:**
1. NO entre en pánico - el override afecta solo ese evento específico
2. Contacte inmediatamente con el administrador técnico del sistema
3. Proporcione: fecha, hora, show afectado, tipo de override aplicado
4. El administrador lo eliminará manualmente desde base de datos
5. Documente el incidente para evitar repetirlo

**Si necesita cambiar un show solo para hoy:**
1. **NO modifique el show** (cambiaría todos los días permanentemente)
2. Use overrides en los eventos específicos de hoy
3. Los eventos de mañana no se verán afectados

**Si la Vista de Operador no coincide con pantallas reales:**
1. Refresque la Vista de Operador (tecla F5)
2. Verifique en http://172.26.131.240:8081/
3. Confíe en la URL de pantallas públicas como fuente de verdad
4. Si persiste la diferencia, reporte al equipo técnico

---

## Contacto y Soporte

Si tiene dudas, problemas técnicos o necesita ayuda:

- **Soporte Técnico**: [Ticket en atera a sistemas o a CAU]
- **Formación adicional**: [Sistemas de información]
- **Reportar errores**: [Ticket en atera]
- **Wiki Online**: http://172.26.131.240:8081/wiki/

---

**Versión del manual**: 1.0
**Fecha**: Octubre 2025
**Sistema**: ShowsTrack - Puy du Fou España
**Última actualización**: 2 de Octubre 2025
