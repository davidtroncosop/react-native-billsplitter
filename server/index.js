import express from 'express';
import cors from 'cors';
import receiptRoutes from './routes/receipt.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración CORS más permisiva para desarrollo
app.use(cors({
  origin: true, // Permite cualquier origen en desarrollo
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    serverIP: req.socket.localAddress
  });
});

app.use('/api', receiptRoutes);

// Middleware de error mejorado
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
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

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 Servidor iniciado:');
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`🌐 Local: http://localhost:${PORT}`);
  console.log(`📱 Android: http://10.0.2.2:${PORT}`);
  console.log(`🔗 Network: http://192.168.100.13:${PORT}\n`);
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('📥 SIGTERM recibido. Cerrando servidor...');
  server.close(() => {
    console.log('✋ Servidor cerrado');
    process.exit(0);
  });
});