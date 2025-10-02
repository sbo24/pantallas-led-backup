# Configuración de Cron para ETL Automatizado

## Resumen
Este documento describe cómo configurar la automatización del proceso ETL usando cron dentro del contenedor Docker `showstrack-dev`.

## Configuración Actual

### Tarea Cron Configurada
```bash
5 */2 * * * /workspace/scripts/etl-cron.sh
```

**Frecuencia**: Cada 2 horas a los 5 minutos de la hora (00:05, 02:05, 04:05, etc.)

### Archivos Involucrados
- **Script wrapper**: `/workspace/scripts/etl-cron.sh`
- **Script ETL**: `/workspace/scripts/extraction/main.py`
- **Logs**: `/workspace/logs/showstrack-etl.log`
- **Salida JSON**: `/workspace/scripts/extraction/output/etl_api_YYYYMMDD-YYYYMMDD.json`

## Estado Actual
✅ **Cron instalado y funcionando**
- Servicio: `cron is running`
- Usuario: `dev`
- Última ejecución exitosa: 2025-10-02 07:22:48
- Eventos procesados: 36 eventos (2025-10-02 a 2025-10-03)

## Instalación Inicial (YA COMPLETADA)

### Desde el Host Docker
```bash
# 1. Instalar cron en el contenedor
docker exec -u root showstrack-dev bash -c "apt update && apt install -y cron"

# 2. Iniciar servicio cron
docker exec -u root showstrack-dev service cron start

# 3. Habilitar cron al arranque
docker exec -u root showstrack-dev bash -c "update-rc.d cron enable"
```

### Desde Dentro del Contenedor
```bash
# 1. Dar permisos de ejecución al script
chmod +x /workspace/scripts/etl-cron.sh

# 2. Crear directorio de logs
mkdir -p /workspace/logs

# 3. Configurar crontab
echo "5 */2 * * * /workspace/scripts/etl-cron.sh" | crontab -

# 4. Verificar configuración
crontab -l
```

## ⚠️ IMPORTANTE: Reinstalación Después de Actualizar Stack

Cuando actualizas el stack del contenedor en Portainer, **el servicio cron se pierde** porque el contenedor se recrea.

### Procedimiento de Reinstalación

#### Opción A: Desde el Host Docker (Recomendada)
Ejecuta estos comandos desde el servidor Docker como root:

```bash
# 1. Instalar cron
docker exec -u root showstrack-dev bash -c "apt update && apt install -y cron"

# 2. Iniciar y habilitar servicio
docker exec -u root showstrack-dev service cron start
docker exec -u root showstrack-dev bash -c "update-rc.d cron enable"

# 3. Configurar crontab (como usuario dev)
docker exec -u dev showstrack-dev bash -c 'echo "5 */2 * * * /workspace/scripts/etl-cron.sh" | crontab -'

# 4. Verificar
docker exec -u dev showstrack-dev crontab -l
docker exec -u root showstrack-dev service cron status
```

#### Opción B: Desde Dentro del Contenedor
Si estás conectado vía SSH al contenedor:

```bash
# Nota: Requiere permisos root, usa docker exec desde el host
# O pide al administrador que ejecute la Opción A
```

## Comandos Útiles

### Verificar Estado
```bash
# Ver estado del servicio cron
service cron status

# Ver tareas configuradas
crontab -l

# Ver últimas ejecuciones en el log
tail -f /workspace/logs/showstrack-etl.log

# Ver archivos JSON generados
ls -lh /workspace/scripts/extraction/output/etl_api_*.json
```

### Ejecutar Manualmente
```bash
# Ejecutar ETL manualmente (test)
/workspace/scripts/etl-cron.sh

# O desde el directorio de scripts
cd /workspace/scripts && ./etl-cron.sh
```

### Modificar Frecuencia
```bash
# Editar crontab
crontab -e

# Ejemplos de frecuencias:
# Cada hora:        0 * * * * /workspace/scripts/etl-cron.sh
# Cada 4 horas:     0 */4 * * * /workspace/scripts/etl-cron.sh
# Cada día a las 6: 0 6 * * * /workspace/scripts/etl-cron.sh
# Horario laboral:  0 6-22/2 * * * /workspace/scripts/etl-cron.sh
```

## Monitoreo

### Ver Logs en Tiempo Real
```bash
tail -f /workspace/logs/showstrack-etl.log
```

### Verificar Última Ejecución
```bash
# Ver últimas 20 líneas del log
tail -20 /workspace/logs/showstrack-etl.log

# Buscar ejecuciones exitosas
grep "ETL ejecutado exitosamente" /workspace/logs/showstrack-etl.log

# Buscar errores
grep "ERROR\|❌" /workspace/logs/showstrack-etl.log
```

### Verificar Archivos Generados
```bash
# Listar archivos JSON recientes
ls -lth /workspace/scripts/extraction/output/etl_api_*.json | head -5

# Ver contenido del último archivo
ls -t /workspace/scripts/extraction/output/etl_api_*.json | head -1 | xargs cat | jq '.metadata'
```

## Troubleshooting

### Cron no está corriendo
```bash
# Verificar estado
service cron status

# Iniciar servicio
service cron start

# Si falla, reinstalar desde el host
```

### Crontab no se ejecuta
```bash
# Verificar configuración
crontab -l

# Verificar logs del sistema
grep CRON /var/log/syslog | tail -20

# Verificar permisos del script
ls -la /workspace/scripts/etl-cron.sh
```

### Script falla al ejecutarse
```bash
# Ejecutar manualmente para ver errores
/workspace/scripts/etl-cron.sh

# Verificar permisos
chmod +x /workspace/scripts/etl-cron.sh

# Verificar entorno virtual
ls -la /workspace/venv/bin/activate
```

## Integración con Backend

El script ETL se conecta automáticamente al backend ShowsTrack:
- **URL**: `http://localhost:8000`
- **Usuario**: `admin` (configurado en `.env`)
- **Endpoint**: `POST /api/admin/import`

### Verificar Conexión
```bash
# Test de conectividad
curl http://localhost:8000/health

# Ver historial de imports
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/admin/import/history | jq
```

## Resumen de Configuración

| Parámetro | Valor |
|-----------|-------|
| Frecuencia | Cada 2 horas (X:05) |
| Script | `/workspace/scripts/etl-cron.sh` |
| Logs | `/workspace/logs/showstrack-etl.log` |
| Salida | `/workspace/scripts/extraction/output/` |
| Usuario | `dev` |
| Servicio | `cron` |

## Próxima Ejecución
```bash
# Ver próxima ejecución programada
# La próxima ejecución será a las X:05 de cada 2 horas
# Ejemplos: 00:05, 02:05, 04:05, 06:05, etc.
```

---

**Última actualización**: 2025-10-02
**Estado**: ✅ Operativo
