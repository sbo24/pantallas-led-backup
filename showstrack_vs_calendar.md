# Showstrack vs. Calendario: Análisis de funcionalidades

## Contexto

La aplicación de **calendario** (calendarios.puydufou.com) es la herramienta donde operativa crea la programación de los shows. Es la **fuente de datos** que alimenta la grillehoraires. Ya tiene funcionalidades sólidas de gestión de horarios.

La propuesta del consultor: añadir un botón en el calendario para controlar pantallas individuales (mostrar "CERRADO"), escribiendo en la tabla `SaisonToPeriodeToEvenementToStatus`.

**El problema**: esto cubre **una funcionalidad** del control de pantallas, pero ignora toda la **capa operativa en tiempo real** que showstrack proporciona y que el calendario **no está diseñado para cubrir**.

---

## Lo que el calendario SÍ hace bien (y nadie cuestiona)

- Gestión de la programación de shows (es la fuente de datos)
- Envío de datos a la grillehoraires
- Gestión de temporadas, periodos y eventos

## Lo que showstrack hace y el calendario NO

| Funcionalidad | Descripción | ¿El calendario puede? |
|---|---|:---:|
| **Motor de estados automático** | Algoritmo de 5 pasos: PROGRAMADO → ABIERTO → CERRADO sin intervención humana | ❌ |
| **Lead times configurables** | Tiempos de anticipación por show (ej: abrir acceso 30 min antes) | ❌ |
| **Overrides con auditoría** | Forzar CERRADO/CANCELADO con motivo, usuario, timestamp | Parcial (sin auditoría) |
| **Pantallas LED públicas** | Frontend optimizado para TV/LED con auto-refresh cada 30s | ❌ |
| **Preview en vivo** | Ver en admin cómo se ve la pantalla LED en tiempo real | ❌ |
| **Alertas globales** | Reemplazar TODA la pantalla con mensaje de emergencia | ❌ |
| **Mensajes personalizados** | Footer editable en tiempo real en pantallas | ❌ |
| **Dashboard operativo** | Métricas, contadores, estado del sistema en tiempo real | ❌ |
| **Auditoría completa** | Quién hizo qué, cuándo, valores anteriores/nuevos (JSONB) | ❌ |
| **Modo sincronización manual** | Revisar y aprobar/descartar cambios antes de aplicarlos | ❌ |
| **Validación de importaciones** | Dry-run, preview, detección de conflictos | ❌ |
| **API REST documentada** | FastAPI + OpenAPI automático para integraciones futuras | ❌ |
| **Migraciones versionadas** | Alembic → evolucionar el esquema sin riesgo | ❌ |
| **Preparada para sensorización** | Añadir endpoints de sensores en horas, no semanas | ❌ |

---

## El argumento central: agilidad de desarrollo

La gente de operativa necesita cambios de forma **muy rápida y ágil**. El stack de showstrack está diseñado específicamente para eso:

- **Alembic**: nueva tabla en 1 comando → `alembic revision --autogenerate -m "nueva_tabla"` + `alembic upgrade head`
- **FastAPI**: nuevo endpoint funcional en 10-15 líneas de código, con documentación automática
- **Vue 3 + composables reutilizables**: nueva vista admin en horas, no en días
- **State Engine extensible**: integrar nuevos inputs (sensores, aforo, etc.) sin reescribir lógica

**La pregunta no es si el calendario puede añadir un botón. La pregunta es: cuando operativa pida la siguiente funcionalidad (sensorización, informes, nuevas reglas de negocio), ¿cuánto tiempo llevará implementarla?**

Con showstrack: horas o días. ¿Con el calendario? No está diseñado para este tipo de extensibilidad.

---

## Control individual de pantallas: ya estaba contemplado

El control individual de pantallas **ya estaba previsto en showstrack**, pendiente de una US para ponerlo en marcha. La implementación sería sencilla gracias al stack existente:

1. **URLs con parámetro de grupo**: cada pantalla física cargaría una URL con el parámetro `?grupo=zona_entrada` o `?grupo=zona_pluma`, etc.
2. **Mapeo de tiempos por grupo de pantallas**: en la aplicación, cada grupo de pantallas tendría configurado un **delay específico** para las transiciones de estado. Por ejemplo, las pantallas de la zona de entrada podrían mostrar "ABIERTO" 5 minutos antes que las de la zona del espectáculo.
3. **Delay automático**: este delay se aplicaría **automáticamente** por el State Engine, igual que el resto de lógicas (lead times, cierre forzado, etc.).
4. **Intervención manual en tiempo real**: el operador seguiría pudiendo forzar estados manualmente sobre cualquier grupo/pantalla en tiempo real, con la misma auditoría y trazabilidad.

**Con Alembic**: una tabla `screen_groups` con su configuración de delays. **Con FastAPI**: un parámetro `grupo` en el endpoint público. **Tiempo estimado**: días, no semanas.

---

## Automatización vs. intervención manual

El calendario propone **intervención manual** para cada pantalla:
> *"Un clic en el botón de una pantalla para un horario"*

Showstrack hace esto **automáticamente** en el 90%+ de los casos gracias al **State Engine** (algoritmo de 5 pasos). **El operador solo interviene en excepciones.** Con el calendario, alguien tendría que hacer clic en cada pantalla para cada pase de cada show, todos los días.

---

## Respuesta sugerida

> De acuerdo, entiendo que el calendario ya gestiona la programación y es la fuente de datos — nadie cuestiona eso. Y sí, añadir un botón para marcar "CERRADO" en una pantalla es viable desde allí.
>
> Pero showstrack no es una duplicación del calendario. Es la **capa operativa en tiempo real** que el calendario no cubre: motor de estados automático, alertas globales, auditoría completa, frontend para pantallas LED, dashboard operativo...
>
> Lo más importante: **el stack de showstrack está diseñado para que operativa reciba funcionalidades nuevas rápidamente**. Alembic + FastAPI + Vue 3 permiten implementar cambios grandes en horas, no en semanas. Cuando operativa pida la siguiente funcionalidad — sensorización, informes, nuevas reglas de negocio — **¿cuánto tiempo llevará implementarla en el calendario?**
>
> Si el equipo del calendario puede generar funcionalidades con la misma rapidez, perfecto. Pero la propuesta de hoy cubre 1 funcionalidad de las 15+ que showstrack ya tiene. Sustituirlo significaría perder toda esa operativa o reconstruirla en una plataforma que no fue diseñada para ello.
