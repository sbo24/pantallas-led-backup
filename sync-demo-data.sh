#!/bin/bash

# Script para sincronizar datos demo entre frontend-public y admin
echo "🔄 Sincronizando datos demo..."

SOURCE="frontend-public/data/demo-data.json"
DEST="showstrack-frontend/showstrack-admin/public/data/demo-data.json"

if [ -f "$SOURCE" ]; then
    cp "$SOURCE" "$DEST"
    echo "✅ Datos sincronizados: $SOURCE → $DEST"
else
    echo "❌ Error: $SOURCE no existe"
    exit 1
fi

echo "🎯 Ambas interfaces ahora usan los mismos datos demo"