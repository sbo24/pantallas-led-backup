# Login Error - ShowsTrack Frontend

## Problema Actual

El sistema de login está experimentando errores de integración entre el frontend Vue.js y el backend FastAPI.

## Errores Detectados

### 1. CORS Policy Error
```
Access to XMLHttpRequest at 'http://localhost:8000/api/auth/login' from origin 'http://localhost:3000' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### 2. Endpoint Incorrecto
- Frontend está llamando: `/api/auth/login` 
- Backend espera: `/api/admin/auth/login`

### 3. Formato de Request Incorrecto
- Frontend envía: `application/json`
- Backend espera: `application/x-www-form-urlencoded`

### 4. Formato de Response Incompatible
**Backend devuelve:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@showstrack.com",
    "full_name": "System Administrator",
    "role": "admin",
    "is_active": true,
    "created_at": "2025-07-17T14:55:09.813037Z"
  }
}
```

**Frontend espera:**
```json
{
  "user": {...},
  "tokens": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 1800,
    "tokenType": "Bearer"
  }
}
```

### 5. Error TypeScript
```
auth.ts:121:30 - error TS2304: Cannot find name 'apiGet'.
```
Falta importar `apiGet` en el auth store.

## Credenciales Backend Verificadas ✅
```bash
curl -X POST http://localhost:8000/api/admin/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin"
# Devuelve: JWT token válido
```

## Servidores Funcionando ✅
- Frontend: http://localhost:3000 ✅
- Backend: http://localhost:8000 ✅

## Soluciones Requeridas

1. **Corregir importación**: Añadir `apiGet` al import en `auth.ts`
2. **Adaptar formato de request**: Usar `URLSearchParams` para form data
3. **Adaptar formato de response**: Mapear la respuesta del backend al formato esperado
4. **Configurar CORS**: O usar fetch directo para evitar preflight OPTIONS

## Estado de Implementación

- ✅ LoginView.vue implementado con form funcional
- ✅ Binding de datos reactivos con v-model
- ✅ Validación y manejo de errores
- ✅ Estados de carga
- ✅ **CORS configurado en backend** - Middleware añadido a main.py
- ✅ **Importación apiGet corregida** en auth.ts
- ✅ **Endpoints corregidos** - Usando /api/admin/auth/*
- ✅ **Formato de request corregido** - URLSearchParams para form data
- ✅ **Formato de response adaptado** - Mapeo de backend response
- ✅ **Backend verificado** - Login devuelve JWT correctamente

## Próximos Pasos

1. ✅ ~~Completar la corrección del auth store~~ - **COMPLETADO**
2. 🧪 **Probar login con admin/admin** - **LISTO PARA PROBAR**
3. 🔄 Verificar redirección a dashboard
4. 💾 Validar persistencia de tokens

## Soluciones Implementadas ✅

### 1. CORS Middleware Añadido
```python
# main.py - Líneas 23-33
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. Auth Store Corregido
- ✅ Endpoints: `/api/admin/auth/login`
- ✅ Form data: `URLSearchParams` con `application/x-www-form-urlencoded`
- ✅ Response mapping: Backend format → Frontend format
- ✅ Importaciones: `apiGet` añadido

## Status: **🚀 READY TO TEST**