# BillSplitter API - Cloudflare Workers

Este es el backend de BillSplitter migrado a Cloudflare Workers para mejor rendimiento y escalabilidad.

## Configuración

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
# Configurar la API key de Gemini (requerida)
wrangler secret put GEMINI_API_KEY

# Opcional: URL del cliente para CORS
wrangler secret put CLIENT_URL
```

### 3. Desarrollo local
```bash
npm run dev
```

### 4. Deploy a producción
```bash
npm run deploy
```

## Endpoints

### Health Check
- **GET** `/health`
- Verifica el estado del servicio

### Procesar Recibo
- **POST** `/api/process-receipt`
- Procesa una imagen de recibo y extrae los datos

**Body:**
```json
{
  "imageData": "base64_encoded_image_data",
  "mimeType": "image/jpeg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "name": "Producto",
        "quantity": 1,
        "price": 1000.00
      }
    ],
    "total": 1000.00
  }
}
```

## Ventajas de Cloudflare Workers

- **Rendimiento**: Edge computing con latencia ultra-baja
- **Escalabilidad**: Auto-scaling sin configuración
- **Costo**: Pay-per-use, muy económico para aplicaciones pequeñas/medianas
- **Global**: Desplegado automáticamente en toda la red global de Cloudflare
- **Sin servidor**: No necesitas manejar infraestructura

## Migración desde Express

La API mantiene la misma interfaz que el servidor Express original, por lo que no necesitas cambiar el código del cliente React Native.

## Configuración de CORS

El worker está configurado para permitir requests desde:
- localhost (desarrollo)
- Tu dominio de producción actual
- Cualquier dominio configurado en CLIENT_URL

## Límites

- Tamaño máximo de imagen: 4MB
- Timeout: 30 segundos (límite de Cloudflare Workers)
- CPU time: 50ms en el plan gratuito, 30 segundos en el plan pagado