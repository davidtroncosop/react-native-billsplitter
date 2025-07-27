#!/bin/bash

echo "🚀 Desplegando BillSplitter API a Cloudflare Workers..."

# Verificar que wrangler esté instalado
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler no está instalado. Instalando..."
    npm install -g wrangler
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Verificar que las variables de entorno estén configuradas
echo "🔑 Verificando variables de entorno..."
if ! wrangler secret list | grep -q "GEMINI_API_KEY"; then
    echo "⚠️  GEMINI_API_KEY no está configurada."
    echo "Por favor ejecuta: wrangler secret put GEMINI_API_KEY"
    read -p "¿Quieres configurarla ahora? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        wrangler secret put GEMINI_API_KEY
    else
        echo "❌ No se puede continuar sin GEMINI_API_KEY"
        exit 1
    fi
fi

# Deploy
echo "🌍 Desplegando a Cloudflare Workers..."
wrangler deploy

echo "✅ ¡Deployment completado!"
echo "📋 Tu API estará disponible en: https://billsplitter-api.tu-subdominio.workers.dev"
echo ""
echo "🔧 Próximos pasos:"
echo "1. Actualiza config.ts con la nueva URL"
echo "2. Prueba los endpoints /health y /api/process-receipt"
echo "3. Actualiza tu app React Native para usar la nueva API"