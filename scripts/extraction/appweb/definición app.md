# Manual detallado del script de extracción de horarios de Puy du Fou España

## Introducción

Este manual proporciona una descripción profunda del funcionamiento del script para extraer y procesar los horarios de eventos del parque temático Puy du Fou España. El sistema está diseñado para obtener información de la API oficial del parque, procesarla y exportarla a múltiples formatos (Excel y JSON) para facilitar su análisis y uso en diferentes sistemas.

## Arquitectura general

El sistema está organizado en módulos especializados que siguen el principio de responsabilidad única:

```
Visualización de horarios/
├── main.py                    # Script principal y punto de entrada
├── puy_du_fou_api.py         # Interacción con la API del parque
├── data_processor.py         # Procesamiento de datos obtenidos
├── date_utils.py             # Utilidades para manejo de fechas
├── excel_exporter.py         # Exportación de datos a Excel y coordinación
├── showstrack_formatter.py   # Formateo específico para ShowsTrack APP (JSON)
├── debug/                    # Directorio para archivos de depuración
└── output/                   # Directorio para archivos de salida
```

## Flujo de ejecución

El flujo general de ejecución ha sido mejorado para soportar múltiples formatos de salida:

1. El usuario ejecuta `main.py` con parámetros para especificar el rango de fechas y formato de salida.
2. Se genera un rango de fechas a procesar.
3. Para cada fecha, se solicitan los datos a la API de Puy du Fou.
4. Los datos recibidos se procesan para extraer la información de los eventos.
5. Los datos procesados se exportan según el formato especificado:
   - **Excel**: Para revisión manual y análisis tradicional
   - **JSON**: Para integración con ShowsTrack APP
   - **Ambos**: Para máxima flexibilidad

## Nuevas opciones de ejecución

### Formatos de salida disponibles

```bash
# Solo archivo Excel (comportamiento original)
python main.py --start-date 2025-06-21 --end-date 2025-06-22 --format excel

# Solo archivo JSON (optimizado para ShowsTrack APP)
python main.py --start-date 2025-06-21 --end-date 2025-06-22 --format json

# Ambos formatos (recomendado para máxima compatibilidad)
python main.py --start-date 2025-06-21 --end-date 2025-06-22 --format both

# Formato por defecto si no se especifica (ambos)
python main.py --start-date 2025-06-21 --end-date 2025-06-22
```

### Nombres de archivos generados

El sistema genera nombres de archivo consistentes basados en el rango de fechas:

- **Un solo día**: `horarios_puydufou_20250621.xlsx` / `.json`
- **Rango de fechas**: `horarios_puydufou_20250621-20250622.xlsx` / `.json`
- **Salida personalizada**: `--output mi_archivo` genera `mi_archivo.xlsx` / `.json`

## Descripción detallada de los módulos

### `main.py` (Actualizado)

El script principal ha sido mejorado para soportar múltiples formatos de salida y proporcionar mejor feedback al usuario.

#### Funciones principales:

##### `parse_arguments()` (Actualizada)
- **Propósito**: Procesar los argumentos de línea de comandos con nuevas opciones.
- **Nuevos parámetros**:
  - `--format`: Especifica el formato de salida (excel, json, both)
- **Retorno**: Objeto con los argumentos parseados incluyendo formato.
- **Comportamiento**: Configura el parser con las nuevas opciones de formato y valida las combinaciones.

##### `generate_output_path()` (Nueva)
- **Propósito**: Generar rutas de salida apropiadas según el formato solicitado.
- **Parámetros**:
  - `start_date`: Fecha de inicio
  - `end_date`: Fecha de fin
  - `base_path`: Ruta base personalizada (opcional)
  - `format_type`: Tipo de formato
- **Retorno**: Ruta completa del archivo optimizada para el formato.
- **Comportamiento**: Genera nombres de archivo inteligentes evitando extensiones duplicadas.

##### `main()` (Mejorada)
- **Propósito**: Función principal que ejecuta todo el flujo de trabajo con soporte multi-formato.
- **Nuevos comportamientos**:
  1. Muestra información detallada sobre el formato de salida seleccionado.
  2. Coordina la exportación a múltiples formatos cuando se solicita.
  3. Proporciona estadísticas detalladas de la exportación.
  4. Lista los archivos generados al final del proceso.

### `excel_exporter.py` (Actualizado)

Este módulo ahora actúa como coordinador de exportación para múltiples formatos, manteniendo la funcionalidad original de Excel.

#### Funciones principales:

##### `export_to_excel(data, output_path)` (Sin cambios)
- Mantiene toda la funcionalidad original para exportación Excel.

##### `export_data()` (Nueva)
- **Propósito**: Coordinar la exportación a múltiples formatos según la configuración.
- **Parámetros**:
  - `data`: Lista de diccionarios con información de eventos
  - `output_path`: Ruta base para archivos de salida
  - `format_type`: Tipo de formato ('excel', 'json', 'both')
- **Retorno**: Diccionario con resultados de cada exportación
- **Comportamiento**:
  1. Determina qué formatos exportar según `format_type`.
  2. Genera rutas de archivo apropiadas para cada formato.
  3. Ejecuta las exportaciones correspondientes.
  4. Retorna estadísticas de cada operación.

### `showstrack_formatter.py` (Nuevo módulo)

Este nuevo módulo está específicamente diseñado para formatear datos para su integración con ShowsTrack APP, proporcionando un JSON estructurado y optimizado.

#### Funciones principales:

##### `format_for_showstrack_api(data)`
- **Propósito**: Formatear datos extraídos para la API de ShowsTrack.
- **Parámetros**:
  - `data`: Lista de diccionarios con datos de eventos
- **Retorno**: Estructura JSON optimizada para ImportSyncService de ShowsTrack
- **Comportamiento**:
  1. Mapea campos del formato original al formato ShowsTrack.
  2. Valida datos críticos antes de incluirlos.
  3. Genera metadatos comprensivos de la extracción.
  4. Crea estadísticas de resumen automáticas.

##### `parse_duration(duration_str)`
- **Propósito**: Convertir duración de string a entero (minutos).
- **Parámetros**: `duration_str` - Duración como string
- **Retorno**: Duración en minutos como entero
- **Comportamiento**: Maneja conversiones seguras con fallback a 0.

##### `map_event_type(original_type)`
- **Propósito**: Mapear tipos de evento del sistema original al formato ShowsTrack.
- **Mapeo implementado**:
  - `'Show'` → `'show'`
  - `'Apertura / Cierre'` → `'system'`
  - `'Apertura'` → `'opening'`
  - `'Cierre'` → `'closing'`
- **Retorno**: Tipo mapeado para ShowsTrack con fallback a 'show'.

##### `validate_event_data(event)`
- **Propósito**: Validar que un evento tenga los datos mínimos requeridos.
- **Validaciones implementadas**:
  - Campos obligatorios: external_event_id, show_name, event_date, start_time
  - Formato de fecha: YYYY-MM-DD
  - Formato de hora: HH:MM
- **Retorno**: Boolean indicando si el evento es válido.

##### `generate_summary(events)`
- **Propósito**: Generar resumen estadístico comprensivo de los eventos.
- **Estadísticas generadas**:
  - Conteo por tipo de evento
  - Conteo por espectáculo (solo shows)
  - Conteo por fecha
  - Número de espectáculos únicos
  - Días en el rango de fechas
- **Retorno**: Diccionario con estadísticas organizadas.

##### `export_to_json(data, output_path)`
- **Propósito**: Exportar datos a archivo JSON optimizado para ShowsTrack.
- **Características**:
  - Formato legible con indentación
  - Codificación UTF-8 para caracteres especiales
  - Manejo robusto de errores
  - Estadísticas de exportación en tiempo real

## Estructura del archivo JSON generado

### Estructura general

```json
{
  "metadata": {
    "extraction_time": "2025-06-23T14:30:25.123456",
    "total_events": 51,
    "date_range": ["2025-06-21", "2025-06-22"],
    "source": "puy_du_fou_api",
    "version": "1.0",
    "extraction_summary": {
      "events_by_type": {
        "show": 47,
        "system": 4
      },
      "events_by_show": {
        "El Último Cantar": 8,
        "A Pluma y Espada": 6,
        "Cetrería de Reyes": 5
      },
      "events_by_date": {
        "2025-06-21": 31,
        "2025-06-22": 20
      },
      "unique_shows": 12,
      "date_range_days": 2
    }
  },
  "events": [
    {
      "external_event_id": "2107137254650000441_",
      "show_name": "Apertura",
      "event_date": "2025-06-21",
      "start_time": "09:30",
      "end_time": "09:30",
      "duration_minutes": 0,
      "event_type": "system"
    }
  ]
}
```

### Campos del evento JSON

| Campo | Tipo | Descripción | Mapeo desde Excel |
|-------|------|-------------|------------------|
| `external_event_id` | string | ID único del evento en el sistema origen | EventoID |
| `show_name` | string | Nombre del espectáculo | Evento |
| `event_date` | string | Fecha del evento (YYYY-MM-DD) | Fecha |
| `start_time` | string | Hora de inicio (HH:MM) | Hora Inicio |
| `end_time` | string | Hora de fin (HH:MM) | Hora Fin |
| `duration_minutes` | integer | Duración en minutos | Duración |
| `event_type` | string | Tipo de evento mapeado | Tipo |

### Metadatos incluidos

- **extraction_time**: Timestamp ISO de cuando se realizó la extracción
- **total_events**: Número total de eventos válidos procesados
- **date_range**: Array con todas las fechas incluidas en la extracción
- **source**: Identificador de la fuente de datos (siempre "puy_du_fou_api")
- **version**: Versión del formato de datos (para futuras evoluciones)
- **extraction_summary**: Estadísticas detalladas de la extracción

## Integración con ShowsTrack APP

### Propósito del formato JSON

El archivo JSON generado está específicamente optimizado para la importación en ShowsTrack APP a través de:

1. **Endpoint `/api/admin/import/direct`**: Para importación automática vía API
2. **Mapeo directo a modelos**: Campos alineados con la base de datos ShowsTrack
3. **Validaciones incluidas**: Datos pre-validados para importación segura
4. **Metadatos de auditoría**: Información completa para trazabilidad

### Ventajas del formato JSON para ShowsTrack

- **Importación directa**: Sin procesamiento adicional requerido
- **Validación previa**: Errores detectados antes de llegar a la base de datos
- **Metadatos comprensivos**: Información completa para auditoría y debugging
- **Estructura tipada**: Facilita la generación de SDKs automáticos
- **Extensibilidad**: Preparado para futuras mejoras sin romper compatibilidad

## Interacción entre módulos actualizada

La interacción entre los diferentes módulos ha evolucionado para soportar el nuevo flujo multi-formato:

1. **`main.py`** coordina el proceso completo:
   - Procesa argumentos incluyendo formato de salida
   - Llama a `generate_date_range()` de `date_utils.py`
   - Llama a `fetch_schedule_data()` de `puy_du_fou_api.py` para cada fecha
   - Llama a `process_all_data()` de `data_processor.py`
   - Llama a `export_data()` de `excel_exporter.py` con formato especificado

2. **`excel_exporter.py`** actúa como coordinador de exportación:
   - Recibe datos procesados y tipo de formato de `main.py`
   - Para formato Excel: llama a `export_to_excel()` localmente
   - Para formato JSON: llama a `export_to_json()` de `showstrack_formatter.py`
   - Retorna estadísticas consolidadas a `main.py`

3. **`showstrack_formatter.py`** (nuevo) especializado en JSON:
   - Recibe datos procesados de `excel_exporter.py`
   - Aplica validaciones específicas para ShowsTrack
   - Mapea campos al formato esperado por la API
   - Genera metadatos y estadísticas comprensivas
   - Exporta JSON optimizado para importación automática

4. Los otros módulos (`puy_du_fou_api.py`, `data_processor.py`, `date_utils.py`) mantienen su funcionalidad original sin cambios.

## Casos de uso recomendados

### Para análisis manual y revisión
```bash
python main.py --start-date 2025-06-21 --end-date 2025-06-22 --format excel
```
- Ideal para revisión humana de los datos
- Formato familiar para equipos no técnicos
- Incluye metadatos en hoja separada

### Para integración automática con ShowsTrack
```bash
python main.py --start-date 2025-06-21 --end-date 2025-06-22 --format json
```
- Optimizado para importación via API
- Validaciones incluidas
- Formato estructurado para procesamiento automático

### Para máxima flexibilidad (recomendado)
```bash
python main.py --start-date 2025-06-21 --end-date 2025-06-22 --format both
```
- Genera ambos formatos simultáneamente
- Permite análisis manual Y automatización
- Backup en múltiples formatos

## Validaciones y control de calidad

### Validaciones del formato JSON

El nuevo sistema incluye validaciones robustas específicamente para el formato ShowsTrack:

1. **Campos obligatorios**: Verifica presencia de external_event_id, show_name, event_date, start_time
2. **Formato de fechas**: Valida formato YYYY-MM-DD
3. **Formato de horas**: Valida formato HH:MM
4. **Coherencia de datos**: Verifica que los datos sean lógicamente consistentes
5. **Filtrado automático**: Omite eventos inválidos con logging de advertencias

### Estadísticas de calidad

El sistema genera automáticamente estadísticas de calidad que incluyen:

- Total de eventos procesados vs. válidos
- Distribución por tipo de evento
- Eventos por espectáculo (para detectar anomalías)
- Cobertura temporal (días incluidos)

## Manejo de errores mejorado

### Errores específicos del formato JSON

- **Datos inválidos**: Se omiten con advertencia en lugar de fallar completamente
- **Formato incorrecto**: Se aplican conversiones automáticas cuando es posible
- **Archivos de salida**: Manejo robusto de permisos y espacio en disco

### Logging mejorado

El sistema ahora incluye logging específico para:

- Eventos omitidos por validación
- Estadísticas de conversión de formatos
- Tiempo de procesamiento por formato
- Advertencias sobre discrepancias de datos

## Archivo de salida Excel (sin cambios)

El archivo Excel mantiene su estructura original:

1. **Horarios**: Contiene todos los eventos con sus detalles
2. **Metadata**: Contiene información sobre la generación del archivo

## Consideraciones técnicas adicionales

### Rendimiento

- **Procesamiento paralelo**: Los formatos se procesan secuencialmente pero optimizadamente
- **Memoria eficiente**: Los datos se procesan una sola vez y se formatean según necesidad
- **Archivos grandes**: Manejo optimizado de datasets grandes con múltiples fechas

### Compatibilidad hacia atrás

- **Comandos existentes**: Todos los comandos anteriores siguen funcionando
- **Formato por defecto**: Si no se especifica formato, se genera ambos (both)
- **Estructura de archivos**: Los archivos Excel mantienen exactamente la misma estructura

### Extensibilidad futura

El sistema está preparado para:

- **Nuevos formatos**: Fácil adición de CSV, XML, etc.
- **APIs adicionales**: Integración con otros sistemas más allá de ShowsTrack
- **Validaciones personalizadas**: Reglas específicas por formato o destino
- **Transformaciones**: Mapeos personalizados según el sistema destino

## Resumen del funcionamiento actualizado

El flujo completo del sistema mejorado es:

1. **Ejecución**: `python main.py --start-date 2025-06-21 --end-date 2025-06-22 --format both`
2. **Validación**: El script valida fechas y parámetros de formato
3. **Extracción**: Para cada fecha se consulta la API (sin cambios)
4. **Procesamiento**: Se extraen y estructuran los datos (sin cambios)
5. **Exportación multi-formato**:
   - Si se solicita Excel: genera archivo .xlsx con la estructura tradicional
   - Si se solicita JSON: genera archivo .json optimizado para ShowsTrack APP
   - Si se solicita both: genera ambos archivos simultáneamente
6. **Estadísticas**: Se muestran resultados detallados por formato
7. **Resumen**: Lista de archivos generados con rutas completas

### Ejemplo de salida del sistema

```
🔄 Extrayendo horarios de 2025-06-21 a 2025-06-22
📁 Formato de salida: both
📂 Ruta base: C:\...\horarios_puydufou_20250621-20250622

Consultando datos para 2025-06-21...
  Código de estado HTTP: 200
  Tamaño de la respuesta: 23756 caracteres

Consultando datos para 2025-06-22...
  Código de estado HTTP: 200
  Tamaño de la respuesta: 14617 caracteres

✅ Datos procesados: 51 eventos encontrados

Archivo Excel guardado correctamente: horarios_puydufou_20250621-20250622.xlsx
Archivo JSON guardado correctamente: horarios_puydufou_20250621-20250622.json
Eventos exportados: 51
Fechas incluidas: 2025-06-21, 2025-06-22

🎉 Proceso completado:
  📊 Excel: 51 eventos
  📋 JSON: 51 eventos
  📈 Total: 51 eventos exportados

💡 Archivos generados:
  📊 Excel: C:\...\horarios_puydufou_20250621-20250622.xlsx
  📋 JSON:  C:\...\horarios_puydufou_20250621-20250622.json
```