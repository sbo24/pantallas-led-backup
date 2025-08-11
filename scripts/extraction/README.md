# 📒 Documentación y Manual Unificados – Puy du Fou España

> **Nota:** Este archivo combina íntegramente la documentación técnica y el manual de uso rápido sin omitir ningún detalle.

---

## 📚 Parte 1 – Documentación Técnica Completa


# 📚 Documentación Completa – Extracción y Exportación de Horarios de Puy du Fou España

---

## 🧭 Introducción

Este sistema automatiza la **extracción, tratamiento y exportación** de los horarios de eventos del parque **Puy du Fou España**. Está diseñado para facilitar el análisis operativo, visualización en pantallas (M4D) e integración con plataformas como **ShowsTrack**.

---

## ⚙️ Entradas y Salidas

### 🔢 Entradas:
- **API de horarios**: `https://api.mobile.puydufouespana.com/nagios?debug&date=YYYY-MM-DD`
- **Parámetros CLI**:
  - `--start-date` (obligatorio): Fecha de inicio en formato `YYYY-MM-DD`
  - `--end-date` (obligatorio): Fecha de fin
  - `--output` (opcional): Ruta base del archivo de salida
  - `--format` (opcional): `excel`, `json`, o `both` (por defecto)

### 📤 Salidas:
- Excel con dos hojas: `Horarios` y `Metadata`
- JSON estructurado optimizado para **ShowsTrack**
- Archivos de depuración: logs, respuesta bruta, eventos parseados

---

## 🧱 Arquitectura de Carpetas

```
Visualización de horarios/
├── main.py                    # Script principal
├── puy_du_fou_api.py          # Consulta API Puy du Fou
├── data_processor.py          # Procesamiento de HTML/PHP
├── date_utils.py              # Rango de fechas y formateo de horas
├── excel_exporter.py          # Coordinación exportación + Excel
├── showstrack_formatter.py    # Generación JSON para ShowsTrack
├── debug/                     # Logs y archivos de respuesta
└── output/                    # Archivos .xlsx y .json generados
```

---

## 🔄 Flujo de Ejecución

```mermaid
graph TD
    main[main.py] --> parseArgs[parse_arguments()]
    parseArgs --> valDates[validate_dates()]
    valDates --> dateRange[generate_date_range()]
    dateRange --> forEachDate{Para cada fecha}
    forEachDate --> fetch[puy_du_fou_api.py]
    fetch --> process[data_processor.py]
    process --> export[excel_exporter.py]
    export --> excel[Excel]
    export --> json[JSON ShowsTrack]
```

---

## 🧩 Descripción Detallada de los Módulos

### `main.py`
- Orquesta todo el flujo
- Valida fechas
- Genera fechas a procesar
- Llama a los módulos de API, procesamiento y exportación
- Muestra resumen final

### `puy_du_fou_api.py`
- Hace `GET` a la API con headers tipo navegador
- Manejo de errores + reintentos exponenciales (2s → 4s → 8s)
- Valida que la respuesta contiene `"Puy Du Fou DB Rows"`

### `data_processor.py`
- Extrae los bloques `V_GrilleHoraire` con regex
- Determina `Hora Fin` calculada si está vacía
- Ordena eventos por hora
- Genera `debug/response_YYYY-MM-DD.txt` y `shows_YYYY-MM-DD.txt`

### `date_utils.py`
- `generate_date_range(start, end)`: genera fechas en `YYYY-MM-DD`
- `format_time(HHMM)`: convierte a `HH:MM`

### `excel_exporter.py`
- Convierte lista de dicts a DataFrame
- Crea hoja `Horarios` y `Metadata`
- Ajusta anchos automáticamente
- Exporta a `.xlsx`
- Llama a `export_to_json()` si formato es `json` o `both`

### `showstrack_formatter.py`
- Convierte eventos a JSON estándar de ShowsTrack:
  - `external_event_id`, `show_name`, `event_date`, `start_time`, `end_time`, `duration_minutes`, `event_type`
- Valida campos, formatos de fecha/hora
- Genera `metadata` y `extraction_summary` (estadísticas por tipo, show y fecha)

---

## 🧠 Casos Especiales

### 🕐 Determinación de Hora de Fin
- Si `Gh_heurefin` tiene valor → se usa directamente
- Si está vacío → se calcula con `Gh_heuredebut + duración`
- Si hay discrepancia → se **prioriza** el valor explícito y se **loggea advertencia**

### 🔁 Eventos repetidos
- Cada pase se trata como un evento independiente con su hora

### 🪛 Manejo de Errores
- Validación de argumentos
- Reintentos HTTP
- Control de excepciones y logs
- Eventos inválidos son omitidos y loggeados, nunca bloquean el flujo

---

## 🛠️ Archivos de Depuración

Todos en la carpeta `debug/`:
- `data_processor_diagnostic.log`: log detallado del procesamiento
- `response_YYYY-MM-DD.txt`: respuesta cruda de la API
- `shows_YYYY-MM-DD.txt`: eventos procesados

---

## 📊 Salida de Ejemplo (Excel y JSON)

**Excel** (`output/horarios_puydufou_20250704-20250706.xlsx`)
- `Horarios`: eventos completos con fecha, ID, nombre, tipo, duración, inicio y fin
- `Metadata`: total eventos, fechas, timestamp generación, fuente

**JSON ShowsTrack** (`.json`):
```json
{
  "metadata": {
    "extraction_time": "2025-07-07T10:42:11",
    "total_events": 45,
    "date_range": ["2025-07-04", "2025-07-06"],
    "source": "puy_du_fou_api",
    "version": "1.0",
    "extraction_summary": {
      "events_by_type": { "show": 42, "system": 3 },
      "events_by_show": { "El Último Cantar": 6, ... },
      "events_by_date": { "2025-07-04": 15, ... }
    }
  },
  "events": [
    {
      "external_event_id": "2107137254650000441_",
      "show_name": "Apertura",
      "event_date": "2025-07-04",
      "start_time": "09:30",
      "end_time": "09:30",
      "duration_minutes": 0,
      "event_type": "system"
    }
  ]
}
```

---

## 🚀 MANUAL DE USO RÁPIDO

### 🔧 Activación del entorno
```cmd
cd "C:\DEV\Pantallas de información\Visualización de horarios"
venv\Scripts\activate
```

### 🏁 Comando base
```cmd
python main.py --start-date 2025-07-04 --end-date 2025-07-06 --format both
```

### ✅ Salida esperada
```
🔄 Extrayendo horarios de 2025-07-04 a 2025-07-06
📁 Formato de salida: both
✅ Datos procesados: 45 eventos
🎉 Proceso completado:
  📊 Excel: 45 eventos
  📋 JSON: 45 eventos
```

### 📁 Archivos generados
- `output/horarios_puydufou_20250704-20250706.xlsx`
- `output/horarios_puydufou_20250704-20250706.json`

---

## 🆘 Resolución de Problemas

| Problema | Solución |
|----------|----------|
| PowerShell: *scripts deshabilitados* | Usar CMD o `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| No se encuentra `python` | Activar entorno virtual: `venv\Scripts\activate` |
| Falta módulo `requests` | `pip install requests pandas openpyxl` |
| Fecha malformada | Usar `YYYY-MM-DD` (ej: 2025-07-04) |

---

## 📌 Casos de Uso Comunes

| Objetivo | Comando |
|----------|---------|
| Hoy | `--start-date 2025-07-07 --end-date 2025-07-07` |
| Fin de semana | `--start-date 2025-07-05 --end-date 2025-07-06` |
| Semana completa | `--start-date 2025-07-07 --end-date 2025-07-13` |
| Todo el mes | `--start-date 2025-07-01 --end-date 2025-07-31` |

---

## 📌 Créditos y Fuentes

- Manual original adaptado desde documentación M4D y scripts internos
- Integración ShowsTrack basada en especificaciones ImportSyncService
- Desarrollado por equipo @PuyDuFou IT


---

## 🚀 Parte 2 – Manual de Uso Rápido

# 🚀 Manual de Uso Rápido - Script Extracción Puy du Fou

## ⚡ Ejecución en 3 pasos

### 1. Abrir terminal
```cmd
# Opción A: Windows + R → escribir "cmd" → Enter
# Opción B: Buscar "Command Prompt" en menú inicio
```

### 2. Ir a la carpeta y activar
```cmd
cd "C:\DEV\Pantallas de información\Script de extracción de horarios\Visualización de horarios"
venv\Scripts\activate
```

### 3. Ejecutar extracción
```cmd
python main.py --start-date 2025-07-04 --end-date 2025-07-06
```

## 🛡️ Si PowerShell da error de políticas

### Error típico:
```
cannot be loaded because running scripts is disabled on this system
```

### Solución 1: Usar Command Prompt (CMD) - **RECOMENDADO**
```cmd
# En lugar de PowerShell, usar CMD siempre
# No hay restricciones de políticas en CMD
```

### Solución 2: Habilitar políticas en PowerShell
```powershell
# Ejecutar UNA VEZ como administrador en PowerShell:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Luego ya funciona normal:
venv\Scripts\activate
```

### Solución 3: Bypass temporal
```powershell
# En PowerShell, ejecutar con bypass:
PowerShell -ExecutionPolicy Bypass -File "venv\Scripts\Activate.ps1"
```

## 📋 Comandos más usados

### Extraer un solo día
```cmd
python main.py --start-date 2025-07-04 --end-date 2025-07-04
```

### Extraer un fin de semana
```cmd
python main.py --start-date 2025-07-05 --end-date 2025-07-06
```

### Extraer una semana completa
```cmd
python main.py --start-date 2025-07-07 --end-date 2025-07-13
```

### Con nombre personalizado
```cmd
python main.py --start-date 2025-07-04 --end-date 2025-07-06 --output "fin_semana_julio"
```

## 📁 Dónde se guardan los archivos

### Siempre en la carpeta `output\`:
- **Excel**: `horarios_puydufou_YYYYMMDD-YYYYMMDD.xlsx`
- **JSON**: `horarios_puydufou_YYYYMMDD-YYYYMMDD.json`

### Ejemplo para julio 4-6:
- `output\horarios_puydufou_20250704-20250706.xlsx`
- `output\horarios_puydufou_20250704-20250706.json`

## ✅ Verificar que funciona

### Deberías ver algo así:
```
🔄 Extrayendo horarios de 2025-07-04 a 2025-07-06
📁 Formato de salida: both
📂 Ruta base: C:\DEV\...\horarios_puydufou_20250704-20250706

Consultando datos para 2025-07-04...
  Código de estado HTTP: 200 ✅

🎉 Proceso completado:
  📊 Excel: 45 eventos
  📋 JSON: 45 eventos
```

## 🆘 Si algo falla

### Error común: "No se encuentra python"
```cmd
# Verificar que venv está activado (debe aparecer "(venv)" al inicio)
# Si no está activado, repetir:
venv\Scripts\activate
```

### Error común: "No module named requests"
```cmd
# Instalar dependencias:
pip install requests pandas openpyxl
```

### Error común: Fecha incorrecta
```cmd
# Formato correcto: YYYY-MM-DD
python main.py --start-date 2025-07-04 --end-date 2025-07-06
```

### Error común: Políticas de PowerShell
```cmd
# SOLUCIÓN FÁCIL: Usar CMD en lugar de PowerShell
# O ejecutar en PowerShell:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 🔄 Comando completo de ejemplo

### Para CMD (recomendado):
```cmd
cd "C:\DEV\Pantallas de información\Script de extracción de horarios\Visualización de horarios" && venv\Scripts\activate && python main.py --start-date 2025-07-04 --end-date 2025-07-06
```

### Para PowerShell (con políticas habilitadas):
```powershell
cd "C:\DEV\Pantallas de información\Script de extracción de horarios\Visualización de horarios"; venv\Scripts\activate; python main.py --start-date 2025-07-04 --end-date 2025-07-06
```

## 🎯 Casos de uso frecuentes

| Necesidad | Comando |
|-----------|---------|
| **Hoy** | `--start-date 2025-07-04 --end-date 2025-07-04` |
| **Esta semana** | `--start-date 2025-07-07 --end-date 2025-07-13` |
| **Próximo fin de semana** | `--start-date 2025-07-12 --end-date 2025-07-13` |
| **Todo el mes** | `--start-date 2025-07-01 --end-date 2025-07-31` |

---

python main.py --start-date 2025-07-04 --end-date 2025-07-06 --format both

