# 🚀 ETL Puy du Fou España - Integración API ShowsTrack

## 📋 Descripción

Script ETL automatizado que extrae los horarios de Puy du Fou España y los envía directamente a la API ShowsTrack a través del endpoint `/api/admin/import`.

## ✅ Estado Actual - COMPLETAMENTE FUNCIONAL

- **✅ Extracción de datos**: Conecta con API de Puy du Fou España
- **✅ Transformación**: Convierte datos al formato JSON ShowsTrack
- **✅ Carga**: Envía datos via `/api/admin/import` con autenticación JWT
- **✅ Sincronización**: Sistema de sincronización manual/automática operativo
- **✅ Validación**: 11 eventos sincronizados exitosamente en pruebas
- **⏳ Automatización**: Configuración cron pendiente

## 🏗️ Estructura de archivos

```
extraction/
├── main.py                     # Script ETL principal con integración API
├── config.py                   # Configuración segura con variables de entorno
├── .env                        # Credenciales (protegido por .gitignore)
├── api/
│   ├── puy_du_fou_api.py      # Cliente API Puy du Fou
│   └── showstrack_api_client.py # Cliente API ShowsTrack con JWT
├── utils/                      # Módulos utilitarios
│   ├── date_utils.py          # Gestión de fechas
│   ├── data_processor.py      # Procesamiento de datos
│   └── showstrack_formatter.py # Formateo ShowsTrack
├── debug/                      # Logs y datos de debug
├── output/                     # Archivos JSON generados
└── test_integration.py         # Tests de integración
```

## 🚀 Uso

### Comandos principales

```bash
# Modo test (dry-run) - valida sin aplicar
python main.py --start-date 2025-08-14 --end-date 2025-08-14 --dry-run

# Modo producción - aplica los cambios
python main.py --start-date 2025-08-14 --end-date 2025-08-14

# Extracción de una semana
python main.py --start-date 2025-08-14 --end-date 2025-08-20
```

### Test de integración

```bash
# Probar la conexión API
python test_integration.py
```

## ⚙️ Configuración

### Variables de entorno (.env)

```bash
# URL de la API ShowsTrack
SHOWSTRACK_API_URL=http://localhost:8000

# Credenciales de autenticación
SHOWSTRACK_USERNAME=admin
SHOWSTRACK_PASSWORD=admin
```

### Parámetros CLI

- `--start-date` : Fecha de inicio (YYYY-MM-DD) **[REQUERIDO]**
- `--end-date` : Fecha de fin (YYYY-MM-DD) **[REQUERIDO]**
- `--dry-run` : Modo test sin aplicación de cambios

## 🔄 Flujo ETL

1. **Extracción**: Recuperación de datos desde la API Puy du Fou
2. **Transformación**: Conversión al formato JSON ShowsTrack
3. **Carga**: Envío a la API ShowsTrack vía `/api/admin/import`
4. **Sincronización**: Procesamiento automático o manual según configuración
5. **Validación**: Verificación de resultados y gestión de errores

## 📊 Formato de datos

### Entrada (API Puy du Fou)
- Formato PHP array con eventos y metadatos
- Extracción vía regex de campos esenciales

### Salida (API ShowsTrack)
```json
{
  "metadata": {
    "extraction_time": "2025-08-14T12:00:00",
    "total_events": 14,
    "source": "puy_du_fou_api",
    "extraction_summary": {
      "events_by_type": {"show": 12, "system": 2},
      "events_by_show": {"A Pluma y Espada": 2, "El Último Cantar": 3},
      "unique_shows": 8
    }
  },
  "events": [
    {
      "external_event_id": "2106740768780000369_",
      "show_name": "A Pluma y Espada",
      "event_date": "2025-08-14",
      "start_time": "13:45",
      "end_time": "14:15",
      "duration_minutes": 30,
      "event_type": "show"
    }
  ]
}
```

## 🔐 Autenticación

El script utiliza autenticación JWT con la API ShowsTrack:
1. Login automático con username/password
2. Recuperación del token JWT
3. Uso del token para las peticiones de import

## 📝 Logs y Debug

- **Logs consola**: Progreso en tiempo real
- **Archivos debug/**: Respuestas brutas de la API Puy du Fou
- **Archivos output/**: JSON formateados para ShowsTrack

## 🚨 Gestión de errores

- **Retry automático** para llamadas API
- **Validación de datos** antes del envío
- **Modo dry-run** para tests sin impacto
- **Logs detallados** para debugging
- **Gestión de sesiones** SQLAlchemy mejorada

## 🎯 Integración con ShowsTrack

El ETL se integra perfectamente con el sistema ShowsTrack:
- **✅ Import automático** vía `/api/admin/import`
- **✅ Preservación de overrides** manuales
- **✅ Modo automático/manual** según configuración
- **✅ Historial de importaciones** accesible
- **✅ Creación automática de shows** si no existen
- **✅ Sincronización de eventos** con validación de duplicados

## 📅 Automatización

### Configuración cron (pendiente)

```bash
# Cron diario a las 6:00
0 6 * * * cd /workspace/scripts/extraction && python main.py --start-date $(date +%Y-%m-%d) --end-date $(date +%Y-%m-%d) >> /var/log/etl.log 2>&1
```

### Script wrapper recomendado

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
cd /workspace/scripts/extraction
python main.py --start-date $DATE --end-date $DATE
if [ $? -eq 0 ]; then
    echo "ETL exitoso para $DATE"
else
    echo "ETL falló para $DATE" | mail -s "Error ETL" admin@puydufou.com
fi
```

## 🔧 Dependencias

```bash
pip install requests pandas openpyxl python-dotenv
```

## 📊 Resultados de pruebas

- **✅ 11 eventos sincronizados** exitosamente
- **✅ 6 shows creados** automáticamente (Cetrería de Reyes, A Pluma y Espada, etc.)
- **✅ Estados calculados** correctamente (PROGRAMADO, CERRADO)
- **✅ Validación de duplicados** funcionando
- **✅ Gestión de eventos sistema** (Apertura/Cierre con duración 0)

## 📞 Soporte

- **Documentación completa**: `appweb/definición app.md`
- **Tests de integración**: `test_integration.py`
- **Logs de debug**: Carpeta `debug/`
- **Configuración segura**: Archivo `.env`