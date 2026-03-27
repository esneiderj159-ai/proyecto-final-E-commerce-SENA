const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error('❌ Error conectando a la base de datos:', err.message);
  else console.log('✅ Base de datos SQLite conectada → database.db');
});

// Activar llaves foráneas (están desactivadas por defecto en SQLite)
db.run('PRAGMA foreign_keys = ON');

// ─────────────────────────────────────────────────────────────
// TABLA 1: usuarios
// ─────────────────────────────────────────────────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre    TEXT    NOT NULL,
    email     TEXT    NOT NULL UNIQUE,
    password  TEXT    NOT NULL,
    rol       TEXT    NOT NULL DEFAULT 'cliente'
              CHECK(rol IN ('admin', 'cliente', 'vendedor')),
    activo    INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0, 1)),
    createdAt TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`, (err) => { if (err) console.error('Error creando tabla usuarios:', err.message); });

// ─────────────────────────────────────────────────────────────
// TABLA 2: categorias
// ─────────────────────────────────────────────────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS categorias (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      TEXT    NOT NULL UNIQUE,
    descripcion TEXT    DEFAULT '',
    activa      INTEGER NOT NULL DEFAULT 1 CHECK(activa IN (0, 1))
  )
`, (err) => { if (err) console.error('Error creando tabla categorias:', err.message); });

// ─────────────────────────────────────────────────────────────
// TABLA 3: productos
// ─────────────────────────────────────────────────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS productos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      TEXT    NOT NULL,
    descripcion TEXT    DEFAULT '',
    precio      REAL    NOT NULL CHECK(precio > 0),
    stock       INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
    categoriaId INTEGER NOT NULL,
    activo      INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0, 1)),
    FOREIGN KEY (categoriaId) REFERENCES categorias(id) ON DELETE CASCADE
  )
`, (err) => { if (err) console.error('Error creando tabla productos:', err.message); });

// ─────────────────────────────────────────────────────────────
// TABLA 4: pedidos
// ─────────────────────────────────────────────────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS pedidos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    usuarioId INTEGER NOT NULL,
    total     REAL    NOT NULL DEFAULT 0 CHECK(total >= 0),
    estado    TEXT    NOT NULL DEFAULT 'pendiente'
              CHECK(estado IN ('pendiente', 'procesando', 'enviado', 'entregado', 'cancelado')),
    fecha     TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE
  )
`, (err) => { if (err) console.error('Error creando tabla pedidos:', err.message); });

// ─────────────────────────────────────────────────────────────
// TABLA 5: detalle_pedidos
// ─────────────────────────────────────────────────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS detalle_pedidos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    pedidoId   INTEGER NOT NULL,
    productoId INTEGER NOT NULL,
    cantidad   INTEGER NOT NULL CHECK(cantidad > 0),
    precioUnit REAL    NOT NULL CHECK(precioUnit > 0),
    subtotal   REAL    NOT NULL CHECK(subtotal > 0),
    FOREIGN KEY (pedidoId)   REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (productoId) REFERENCES productos(id) ON DELETE CASCADE
  )
`, (err) => { if (err) console.error('Error creando tabla detalle_pedidos:', err.message); });

// ─────────────────────────────────────────────────────────────
// TABLA 6: pagos
// ─────────────────────────────────────────────────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS pagos (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    pedidoId INTEGER NOT NULL UNIQUE,
    monto    REAL    NOT NULL CHECK(monto > 0),
    metodo   TEXT    NOT NULL
             CHECK(metodo IN ('efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata')),
    estado   TEXT    NOT NULL DEFAULT 'pendiente'
             CHECK(estado IN ('pendiente', 'aprobado', 'rechazado', 'reembolsado')),
    fecha    TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (pedidoId) REFERENCES pedidos(id) ON DELETE CASCADE
  )
`, (err) => { if (err) console.error('Error creando tabla pagos:', err.message); });

// ─────────────────────────────────────────────────────────────
// TABLA 7: resenas
// ─────────────────────────────────────────────────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS resenas (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    usuarioId    INTEGER NOT NULL,
    productoId   INTEGER NOT NULL,
    calificacion INTEGER NOT NULL CHECK(calificacion BETWEEN 1 AND 5),
    comentario   TEXT    DEFAULT '',
    fecha        TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (usuarioId)  REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (productoId) REFERENCES productos(id) ON DELETE CASCADE
  )
`, (err) => { if (err) console.error('Error creando tabla resenas:', err.message); });

module.exports = db;