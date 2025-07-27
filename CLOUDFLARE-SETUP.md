# 🚀 Guía de Migración a Cloudflare Workers

## Paso 1: Instalar Wrangler CLI

```bash
npm install -g wrangler
```

## Paso 2: Autenticarse con Cloudflare

```bash
wrangler login
```

Esto abrirá tu navegador para autenticarte con tu cuenta de Cloudflare.

## Paso 3: Navegar al directorio de Cloudflare Workers

```bash
cd cloudflare-workers
```

## Paso 4: Configurar Variables de Entorno

### Configurar GEMINI_API_KEY (Requerida)
```bash
wrangler secret put GEMINI_API_KEY
```
Cuando te lo pida, pega tu API key de Google Gemini.

### Configurar CLIENT_URL (Opcional)
```bash
wrangler secret put CLIENT_URL
```
Ejemplo: `https://tu-app.com`

### Configurar Modelo de Gemini (Opcional)
El modelo por defecto es `gemini-1.5-flash`. Para cambiarlo, edita `wrangler.toml`:
```toml
[vars]
GEMINI_MODEL = "gemini-2.0-flash-exp"
```

Modelos disponibles:
- `gemini-1.5-flash` (por defecto, rápido y eficiente)
- `gemini-2.0-flash-exp` (experimental, más reciente)
- `gemini-1.5-pro` (más preciso, más lento)

## Paso 5: Instalar Dependencias

```bash
npm install
```

## Paso 6: Probar en Desarrollo Local

```bash
npm run dev
```

Esto iniciará el worker localmente en `http://localhost:8787`

### Probar endpoints:
- Health check: `GET http://localhost:8787/health`
- Process receipt: `POST http://localhost:8787/api/process-receipt`

## Paso 7: Deploy a Producción

```bash
npm run deploy
```

O usa el script automatizado:
```bash
./deploy-cloudflare.sh
```

## Paso 8: Obtener la URL de tu Worker

Después del deploy, Wrangler te mostrará la URL de tu worker:
```
https://billsplitter-api.tu-subdominio.workers.dev
```

## Paso 9: Actualizar la Configuración del Cliente

1. Abre `config.ts`
2. Reemplaza `tu-subdominio` con tu subdominio real de Cloudflare
3. Asegúrate de que `USE_CLOUDFLARE = true`

```typescript
const USE_CLOUDFLARE = true;
export const API_URL = 'https://billsplitter-api.TU-SUBDOMINIO-REAL.workers.dev';
```

## Paso 10: Probar la Integración

1. Ejecuta tu app React Native
2. Intenta procesar un recibo
3. Verifica que funcione correctamente

## Comandos Útiles

```bash
# Ver logs en tiempo real
wrangler tail

# Ver variables de entorno configuradas
wrangler secret list

# Eliminar una variable de entorno
wrangler secret delete VARIABLE_NAME

# Deploy a un entorno específico
wrangler deploy --env production
```

## Ventajas de Cloudflare Workers

✅ **Rendimiento**: Latencia ultra-baja (edge computing)  
✅ **Escalabilidad**: Auto-scaling automático  
✅ **Costo**: Plan gratuito generoso (100,000 requests/día)  
✅ **Global**: Desplegado en 200+ ubicaciones  
✅ **Confiabilidad**: 99.9% uptime  
✅ **Sin servidor**: Cero configuración de infraestructura  

## Troubleshooting

### Error: "GEMINI_API_KEY is not configured"
```bash
wrangler secret put GEMINI_API_KEY
```

### Error: "Worker not found"
Verifica que el nombre en `wrangler.toml` sea único.

### Error de CORS
Verifica que tu dominio esté en la lista de `allowedOrigins` en `src/index.js`.

### Timeout en requests
Los Workers tienen un límite de 30 segundos. Para imágenes muy grandes, considera optimizarlas antes del envío.

## Monitoreo

Puedes monitorear tu worker desde el dashboard de Cloudflare:
1. Ve a Workers & Pages
2. Selecciona tu worker
3. Ve métricas, logs y configuración