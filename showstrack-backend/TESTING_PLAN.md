# Plan de Pruebas Unitarias - ShowsTrack Backend

## 🎯 Objetivo

Crear una suite completa de pruebas unitarias que permita diagnosticar rápidamente problemas en el backend de ShowsTrack, especialmente enfocada en:

1. **Diagnóstico rápido** de errores de endpoints
2. **Validación de autenticación** JWT
3. **Verificación de lógica de negocio** en servicios
4. **Testing de integración** con base de datos
5. **Detección temprana** de regresiones

## 📋 Estructura de Testing Propuesta

### 1. Configuración Base

```
tests/
├── __init__.py
├── conftest.py                    # Configuración pytest y fixtures
├── unit/
│   ├── __init__.py
│   ├── test_dependencies.py       # Tests JWT y autenticación
│   ├── test_services.py           # Tests servicios de negocio
│   ├── test_models.py             # Tests modelos SQLAlchemy
│   └── test_schemas.py            # Tests validación Pydantic
├── integration/
│   ├── __init__.py
│   ├── test_endpoints.py          # Tests endpoints completos
│   ├── test_database.py           # Tests integración DB
│   └── test_full_workflows.py     # Tests flujos completos
└── utils/
    ├── __init__.py
    ├── fixtures.py                # Fixtures de datos de prueba
    └── helpers.py                 # Funciones auxiliares
```

### 2. Scripts de Diagnóstico

```
scripts/
├── test_all_endpoints.py         # Verificar todos los endpoints
├── health_check.py               # Verificación completa del sistema
├── generate_test_data.py         # Generar datos de prueba
├── benchmark_api.py              # Tests de performance
└── diagnostic_report.py          # Generar reporte completo
```

## 🔧 Pruebas Unitarias Detalladas

### test_dependencies.py - Autenticación JWT

```python
"""
Tests críticos para JWT authentication
"""

class TestJWTAuthentication:
    def test_password_hashing():
        """Verificar que bcrypt funciona correctamente"""
        
    def test_token_generation():
        """Verificar generación de tokens JWT"""
        
    def test_token_validation():
        """Verificar validación de tokens"""
        
    def test_user_retrieval():
        """Verificar carga de usuario con role"""
        
    def test_expired_token():
        """Verificar manejo de tokens expirados"""
        
    def test_invalid_token():
        """Verificar manejo de tokens inválidos"""
```

### test_services.py - Lógica de Negocio

```python
"""
Tests para servicios CRUD y lógica de negocio
"""

class TestShowService:
    def test_get_shows():
        """Verificar obtención de shows con filtros"""
        
    def test_create_show():
        """Verificar creación de shows"""
        
    def test_update_show():
        """Verificar actualización de shows"""
        
    def test_delete_show():
        """Verificar eliminación de shows"""

class TestEventService:
    def test_get_events():
        """Verificar obtención de eventos con filtros"""
        
    def test_event_status_calculation():
        """Verificar cálculo de estados de eventos"""
        
    def test_override_handling():
        """Verificar manejo de overrides"""
        
    def test_date_range_queries():
        """Verificar consultas por rango de fechas"""
```

### test_endpoints.py - Endpoints Completos

```python
"""
Tests de integración para todos los endpoints
"""

class TestAuthEndpoints:
    def test_login_success():
        """Verificar login exitoso"""
        
    def test_login_failure():
        """Verificar login con credenciales incorrectas"""
        
    def test_me_endpoint():
        """Verificar endpoint de usuario actual"""
        
    def test_refresh_token():
        """Verificar renovación de token"""

class TestAdminEndpoints:
    def test_shows_crud():
        """Verificar CRUD completo de shows"""
        
    def test_events_crud():
        """Verificar CRUD completo de eventos"""
        
    def test_authorization():
        """Verificar autorización en endpoints protegidos"""
        
    def test_response_formats():
        """Verificar formatos de respuesta"""

class TestPublicEndpoints:
    def test_schedules():
        """Verificar endpoint de horarios públicos"""
        
    def test_alerts():
        """Verificar endpoint de alertas"""
        
    def test_no_auth_required():
        """Verificar que no requieren autenticación"""
```

## 🚀 Scripts de Diagnóstico

### test_all_endpoints.py

```python
"""
Script para verificar todos los endpoints automáticamente
"""

async def test_all_endpoints():
    """
    Ejecuta pruebas en todos los endpoints y genera reporte
    """
    results = {
        "auth": [],
        "admin": [],
        "public": [],
        "system": []
    }
    
    # Test endpoints de autenticación
    # Test endpoints admin
    # Test endpoints públicos
    # Test endpoints del sistema
    
    # Generar reporte
    generate_report(results)
```

### health_check.py

```python
"""
Verificación completa del sistema
"""

def comprehensive_health_check():
    """
    Verificación completa del sistema:
    - Base de datos
    - Servicios
    - Endpoints
    - Dependencias
    """
    
def check_database_connectivity():
    """Verificar conectividad a base de datos"""
    
def check_jwt_functionality():
    """Verificar funcionalidad JWT"""
    
def check_service_layer():
    """Verificar capa de servicios"""
    
def check_endpoint_availability():
    """Verificar disponibilidad de endpoints"""
```

## 📊 Casos de Prueba Críticos

### 1. Problemas Identificados Previamente

- **Unicode encoding errors** ✅ Resuelto
- **Password hashing issues** ✅ Resuelto  
- **Relationship loading problems** ✅ Resuelto
- **Import errors** ✅ Resuelto
- **Parameter order issues** ✅ Resuelto

### 2. Casos de Prueba para Prevenir Regresiones

```python
def test_unicode_handling():
    """Verificar manejo correcto de caracteres especiales"""
    
def test_password_hashing():
    """Verificar que bcrypt funciona correctamente"""
    
def test_relationship_loading():
    """Verificar que las relaciones se cargan correctamente"""
    
def test_import_integrity():
    """Verificar que todos los imports funcionan"""
    
def test_parameter_validation():
    """Verificar validación de parámetros"""
```

### 3. Escenarios de Error Comunes

```python
def test_database_connection_failure():
    """Verificar manejo de fallos de conexión DB"""
    
def test_invalid_jwt_token():
    """Verificar manejo de tokens inválidos"""
    
def test_expired_jwt_token():
    """Verificar manejo de tokens expirados"""
    
def test_missing_permissions():
    """Verificar manejo de permisos insuficientes"""
    
def test_malformed_requests():
    """Verificar manejo de requests malformados"""
```

## 🔍 Herramientas de Diagnóstico

### 1. Reporte de Estado

```python
def generate_diagnostic_report():
    """
    Generar reporte completo del estado del sistema:
    - Endpoints funcionando
    - Endpoints con problemas
    - Performance metrics
    - Problemas conocidos
    """
```

### 2. Validación Automática

```python
def auto_validate_system():
    """
    Validación automática que se puede ejecutar:
    - Antes de commits
    - En CI/CD
    - Periódicamente
    """
```

## 📈 Métricas de Éxito

- **Cobertura de código**: > 90%
- **Tiempo de ejecución**: < 30 segundos para suite completa
- **Detección de errores**: 100% de problemas conocidos detectados
- **Documentación**: Cada test documentado con su propósito

## 🚀 Implementación Propuesta

### Fase 1: Configuración Base
1. Crear estructura de directorios
2. Configurar pytest y fixtures
3. Implementar tests críticos de autenticación

### Fase 2: Tests de Servicios
1. Tests unitarios para ShowService
2. Tests unitarios para EventService
3. Tests de validación de schemas

### Fase 3: Tests de Integración
1. Tests de endpoints completos
2. Tests de flujos de trabajo
3. Tests de base de datos

### Fase 4: Scripts de Diagnóstico
1. Script de verificación completa
2. Script de generación de datos
3. Script de benchmark

## 🎯 Beneficios Esperados

1. **Diagnóstico rápido**: Identificar problemas en segundos
2. **Prevención de regresiones**: Detectar problemas antes de deployment
3. **Documentación viva**: Tests como documentación del comportamiento
4. **Confianza en cambios**: Refactoring seguro con tests
5. **Debugging eficiente**: Localizar problemas específicos rápidamente

---

## 🎉 Estado Actual del Testing (2025-07-21)

### ✅ Testing Automatizado Implementado y Ejecutado

**Script de Testing**: `test_dev_stack_script.sh --full`
- **Ubicación**: `/workspace/showstrack-dev/scripts/`
- **Resultados**: **100% de éxito** (16/16 endpoints)
- **Cobertura completa**: Sistema, Públicos, Autenticación, Admin

### Resultados Detallados

#### Distribución por Categoría:
- **Sistema**: 4/4 (100%) - /, /health, /docs, /openapi.json
- **Públicos**: 3/3 (100%) - /api/public/alert, /api/public/schedules 
- **Autenticación**: 4/4 (100%) - login, me, logout, refresh
- **Admin**: 5/5 (100%) - shows, events, override completos

#### Problemas Críticos Resueltos:
1. **Campo `reason` vs `override_reason`** - Corregido en EventService y AdminRouter
2. **Constraints de BD** - UniqueConstraint eliminado para permitir múltiples overrides
3. **Migración aplicada** - `459e01693bc6_fix_status_overrides_constraints_for_`

### Archivos de Reporte Generados
- **JSON Report**: `endpoint_test_results.json` - Resultados estructurados
- **Text Report**: `endpoint_test_report.txt` - Reporte legible
- **Logs detallados** con timestamps y respuestas completas

### Validación Manual Completada
- **Override functionality**: Create/deactivate testeado exitosamente
- **JWT Authentication**: Login y uso de tokens funcionando
- **Admin endpoints**: CRUD operations validadas
- **Database constraints**: Múltiples overrides por evento permitidos

---

**Estado**: ✅ **Testing automatizado funcionando al 100%** - Todos los endpoints operativos y validados.