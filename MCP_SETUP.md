# MCP Context7 Setup Guide

## Configuración del Context7 MCP Server

El archivo `mcp_config.json` ya está configurado para usar el context7 MCP server de Upstash.

### Requisitos del Sistema

- **Node.js**: Versión 20 o superior (actualmente tienes v18.20.6)
- **NPM**: Versión reciente

### Actualización de Node.js (Requerido)

```bash
# Opción 1: Usando nvm (recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Opción 2: Actualización manual
# Descarga Node.js 20+ desde https://nodejs.org/
```

### Configuración MCP

El archivo `mcp_config.json` contiene:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": [
        "-y",
        "@upstash/context7-mcp"
      ]
    }
  }
}
```

### Uso con Claude Code

1. Asegúrate de que Node.js 20+ está instalado
2. El archivo `mcp_config.json` debe estar en el directorio del proyecto
3. Claude Code detectará automáticamente la configuración MCP

### Comandos Útiles

```bash
# Verificar versión de Node.js
node --version

# Probar context7 MCP
npx -y @upstash/context7-mcp --help

# Verificar que funciona
npx -y @upstash/context7-mcp --transport stdio
```

### Herramientas Disponibles

Context7 MCP proporciona las siguientes herramientas:

1. **resolve-library-id**: Resuelve un nombre de librería general a un ID compatible con Context7
2. **get-library-docs**: Obtiene documentación para una librería usando un ID compatible con Context7

### Uso en Prompts

Una vez configurado, puedes usar Context7 en tus prompts:

```
Crea un proyecto Next.js 14 con routing y server components. use context7
```

```
Escribe un pipeline de agregación MongoDB para agrupar y ordenar documentos. use context7
```

## Beneficios de Context7

- **Documentación actualizada**: Acceso en tiempo real a documentación actualizada
- **Ejemplos de código específicos por versión**: Obtén ejemplos correctos para la versión específica
- **Sin alucinaciones**: Evita APIs inexistentes o código obsoleto
- **Compatibilidad universal**: Funciona con Claude Desktop, Cursor, Windsurf, etc.

## Configuración Alternativa para Cursor

Si usas Cursor, la configuración sería:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": [
        "-y",
        "--node-options=--experimental-vm-modules",
        "@upstash/context7-mcp@1.0.6"
      ]
    }
  }
}
```

## Troubleshooting

### Error: Unsupported engine
- **Problema**: Node.js versión insuficiente
- **Solución**: Actualiza a Node.js 20+

### Error: "command not found"
- Asegúrate de que Node.js 20+ está instalado
- Verifica que npx está disponible

### Error de instalación
- Ejecuta: `npm cache clean --force`
- Intenta con: `npx -y @upstash/context7-mcp@latest`

## Estado del Proyecto

- ✅ **Configuración MCP**: Archivo `mcp_config.json` creado
- ✅ **Node.js**: Actualizado a v20.19.3
- ✅ **Paquete**: `@upstash/context7-mcp` disponible y funcional
- ✅ **Context7 MCP**: Totalmente configurado y operativo

## Comandos para Activar Node.js 20

```bash
# Activar Node.js 20 en la sesión actual
source ~/.nvm/nvm.sh

# Verificar versión
node --version  # Debería mostrar v20.19.3

# Probar context7
npx -y @upstash/context7-mcp --help
```