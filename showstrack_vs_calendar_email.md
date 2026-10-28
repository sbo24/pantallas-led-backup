# Respuesta a Mathias (Teams)

---

Hola Mathias,

Te respondo por aquí a tu último mensaje en Teams. Añado a Olivier al hilo porque considero que es importante que tenga visibilidad sobre este punto.

La propuesta de usar calendarios.puydufou.com para controlar pantallas individuales escribiendo en `SaisonToPeriodeToEvenementToStatus` es viable para marcar "CERRADO". Eso no lo cuestiono.

Sin embargo, me gustaría aportar contexto, porque considero que el coste de prescindir de showstrack sería significativo. Entiendo que puede resultar más práctico centralizar el desarrollo en una aplicación que el equipo ya conoce, pero conviene valorar lo que se perdería.

La diferencia fundamental es que la operativa desde el calendario es manual — cada cambio de estado requiere la intervención de un usuario — mientras que showstrack opera de forma completamente automática, permitiendo además intervención manual cuando sea necesario, con trazabilidad completa.

Funcionalidades que showstrack cubre actualmente y que quedarían sin cobertura:

- Motor de estados automático que gestiona las transiciones de las pantallas (PROGRAMADO → ABIERTO → CERRADO) sin intervención humana. El sistema se basa en lead times — tiempos de anticipación configurables por espectáculo. Por ejemplo, si un show comienza a las 17:00 y su lead time es de 30 minutos, la pantalla pasa a "ABIERTO" a las 16:30 de forma automática. La visibilidad de cada show (qué espectáculos aparecen y en qué orden) también es configurable individualmente.
- Alertas globales de emergencia que sustituyen de forma inmediata todo el contenido de las pantallas.
- Registro de auditoría completo: usuario, acción, fecha/hora, valores anteriores y posteriores.
- Frontend específico para pantallas LED, optimizado para televisores con refresco automático.
- Panel de control operativo con métricas y estado del sistema en tiempo real.
- Sincronización con validación previa de cambios antes de aplicarlos.

Sobre el control individual de pantallas, ya estaba contemplado en showstrack, pendiente de una US para ponerlo en marcha. Consistiría en parametrizar las URLs por grupo de pantallas (ej: `?grupo=EUC-OUT`), donde cada grupo representa una zona del parque. A cada zona se le asignaría un delay específico para que el motor de estados calcule automáticamente cuándo cada grupo cambia de estado — por ejemplo, las pantallas de la entrada mostrarían "CERRADO" con 10 minutos de antelación respecto a las del espectáculo. Todo automático, manteniendo la intervención manual en tiempo real. Con la arquitectura actual, implementar esto, testearlo y desplegarlo llevaría unas 3-4 horas.

En cuanto a agilidad de desarrollo, el stack de showstrack (FastAPI, PostgreSQL, Alembic, Vue 3) está diseñado para dar respuesta rápida a necesidades cambiantes de operativa — sensorización, informes, nuevas reglas de negocio — con un esfuerzo mínimo gracias a las migraciones automatizadas y la API auto-documentada.

Mi intención es poner en perspectiva el alcance de lo que ya se tiene. No voy a discutir que la solución propuesta es simple — lo es. Pero lo que estamos valorando es sustituir un sistema que gestiona lógicas de forma autónoma por otro que necesita intervención manual constante. Gestionar esto manualmente ya supondria una carga operativa considerable, pero si además consideramos la gestión de estados con retraso por zona individual, el problema ya no es solo de carga de trabajo — es que gestionar manualmente esos desfases entre zonas va a dar lugar inevitablemente a una gran cantidad de errores. 

Si la gente de operativa está de acuerdo con asumir todo esto, estupendo. Aunque, sinceramente, aunque ahora digan que es asumible, me extrañaría bastante que cuando llegue el momento de gestionarlo no se lo replanteen mejor.

Un saludo
