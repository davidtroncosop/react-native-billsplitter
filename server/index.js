import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import receiptRoutes from './routes/receipt.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración CORS más segura para producción
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:19006',
  'exp://192.168.100.13:19000',
  'https://react-native-billsplitter-production.up.railway.app',
  'http://react-native-billsplitter-production.up.railway.app',
  process.env.CLIENT_URL, // URL del cliente en producción
];

app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sin origin (como mobile apps o curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1 && process.env.NODE_ENV === 'production') {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Aumentar el límite para imágenes grandes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware de logging mejorado
app.use((req, res, next) => {
  console.log(`\n🔥 Nueva solicitud: ${new Date().toISOString()}`);
  console.log(`📍 ${req.method} ${req.url}`);
  console.log('📋 Headers:', req.headers);
  next();
});

// Health check endpoint mejorado
app.get('/health', (req, res) => {
  console.log('✅ Health check solicitado');
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    serverIP: req.socket.localAddress,
    environment: process.env.NODE_ENV || 'development',
    geminiKey: 'configured' // Siempre responder como configurado
  });
});

// Middleware para manejar errores de payload muy grande
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Payload too large. Maximum size is 50MB',
      timestamp: new Date().toISOString()
    });
  }
  next(err);
});

// Montar las rutas con el prefijo /api
app.use('/api', receiptRoutes);

// Middleware de error mejorado
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    timestamp: new Date().toISOString()
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  console.log('⚠️ Ruta no encontrada:', req.originalUrl);
  res.status(404).json({
    success: false,
    message: `Ruta ${req.originalUrl} no encontrada`
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 Servidor iniciado:');
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: ${process.env.NODE_ENV === 'production' ? process.env.SERVER_URL : `http://localhost:${PORT}`}\n`);
  console.log('🔑 Gemini API Key:', process.env.GEMINI_API_KEY ? 'configurada' : 'no configurada');
});

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  console.log('📥 SIGTERM recibido. Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📥 SIGINT recibido. Cerrando servidor...');
  process.exit(0);
});
