// index.js — Servidor principal del E-commerce API
// Carga las variables de entorno PRIMERO antes de cualquier otra cosa
require('dotenv').config();

const express = require('express');
const app = express();

// Inicializar la base de datos (crea las tablas si no existen)
require('./db');

// Middleware para leer JSON en el body de las peticiones
app.use(express.json());

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE GLOBAL DE AUTENTICACIÓN
// Todas las rutas requieren el header: password: EcommerceSeguro2024
// Sin header → 401 Unauthorized
// Password incorrecta → 403 Forbidden
// ═══════════════════════════════════════════════════════════════
app.use((req, res, next) => {
  const apiKey = req.headers['password'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'Autenticación requerida. Envía el header: password'
    });
  }

  if (apiKey !== process.env.API_PASSWORD) {
    return res.status(403).json({
      success: false,
      message: 'Password incorrecta. Acceso denegado.'
    });
  }

  next();
});

// ═══════════════════════════════════════════════════════════════
// REGISTRO DE RUTAS — 7 tablas del E-commerce
// ═══════════════════════════════════════════════════════════════
app.use('/api/usuarios',        require('./routes/usuarios'));
app.use('/api/categorias',      require('./routes/categorias'));
app.use('/api/productos',       require('./routes/productos'));
app.use('/api/pedidos',         require('./routes/pedidos'));
app.use('/api/detalle-pedidos', require('./routes/detalle_pedidos'));
app.use('/api/pagos',           require('./routes/pagos'));
app.use('/api/resenas',         require('./routes/resenas'));

// Ruta principal — información del sistema
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API E-commerce — Proyecto Final SENA',
    version: '1.0.0',
    entorno: process.env.NODE_ENV || 'development',
    tablas: 7,
    endpoints: [
      '/usuarios', '/categorias', '/productos',
      '/pedidos', '/detalle-pedidos', '/pagos', '/resenas'
    ]
  });
});

// Ruta no encontrada (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta '${req.originalUrl}' no encontrada`
  });
});

// ═══════════════════════════════════════════════════════════════
// PUERTO DINÁMICO — Render asigna process.env.PORT automáticamente
// En local usa 3000 como fallback
// ═══════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 API E-commerce corriendo en http://localhost:${server.address().port}`);
});
