// routes/pedidos.js — CRUD completo para la tabla pedidos
const express = require('express');
const router  = express.Router();
const db      = require('../db');

const ESTADOS_VALIDOS = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'];

// GET /pedidos — Listar todos con filtros
// Filtros: ?usuarioId= ?estado= ?fecha=
router.get('/', (req, res) => {
  const { usuarioId, estado, fecha } = req.query;

  let sql = `
    SELECT p.*, u.nombre AS usuarioNombre, u.email AS usuarioEmail
    FROM pedidos p
    LEFT JOIN usuarios u ON p.usuarioId = u.id
    WHERE 1=1
  `;
  const params = [];

  if (usuarioId) { sql += ' AND p.usuarioId = ?'; params.push(usuarioId); }
  if (estado)    { sql += ' AND p.estado = ?';    params.push(estado); }
  if (fecha)     { sql += ' AND p.fecha LIKE ?';  params.push(`%${fecha}%`); }

  db.all(sql, params, (err, pedidos) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    // Para cada pedido, obtener sus detalles
    if (pedidos.length === 0) return res.json({ success: true, total: 0, data: [] });

    let completados = 0;
    pedidos.forEach((pedido, i) => {
      db.all(`
        SELECT dp.*, pr.nombre AS productoNombre
        FROM detalle_pedidos dp
        LEFT JOIN productos pr ON dp.productoId = pr.id
        WHERE dp.pedidoId = ?`, [pedido.id],
        (err, detalles) => {
          pedidos[i].detalles = detalles || [];
          completados++;
          if (completados === pedidos.length) {
            res.json({ success: true, total: pedidos.length, data: pedidos });
          }
        }
      );
    });
  });
});

// GET /pedidos/:id — Obtener un pedido por ID con sus detalles
router.get('/:id', (req, res) => {
  db.get(`
    SELECT p.*, u.nombre AS usuarioNombre
    FROM pedidos p
    LEFT JOIN usuarios u ON p.usuarioId = u.id
    WHERE p.id = ?`, [req.params.id],
    (err, pedido) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (!pedido) return res.status(404).json({ success: false, message: `Pedido con id ${req.params.id} no encontrado` });

      db.all(`
        SELECT dp.*, pr.nombre AS productoNombre
        FROM detalle_pedidos dp
        LEFT JOIN productos pr ON dp.productoId = pr.id
        WHERE dp.pedidoId = ?`, [req.params.id],
        (err, detalles) => {
          pedido.detalles = detalles || [];
          res.json({ success: true, data: pedido });
        }
      );
    }
  );
});

// POST /pedidos — Crear pedido nuevo
// Validaciones: usuarioId obligatorio y debe existir,
//               productos debe ser array con al menos 1 item,
//               cada item debe tener productoId, cantidad y precioUnit válidos
router.post('/', (req, res) => {
  const { usuarioId, productos } = req.body;

  // 1. Campos obligatorios
  if (!usuarioId || !productos || !Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'usuarioId y productos (array con al menos 1 item) son obligatorios'
    });
  }

  // 2. Validar cada producto del array
  for (const p of productos) {
    if (!p.productoId || !p.cantidad || !p.precioUnit) {
      return res.status(400).json({ success: false, message: 'Cada producto debe tener productoId, cantidad y precioUnit' });
    }
    if (!Number.isInteger(Number(p.cantidad)) || Number(p.cantidad) <= 0) {
      return res.status(400).json({ success: false, message: 'cantidad debe ser un entero mayor a 0' });
    }
    if (isNaN(p.precioUnit) || Number(p.precioUnit) <= 0) {
      return res.status(400).json({ success: false, message: 'precioUnit debe ser mayor a 0' });
    }
  }

  // 3. Verificar que el usuario existe (FK)
  db.get('SELECT id FROM usuarios WHERE id = ?', [usuarioId], (err, usuario) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!usuario) return res.status(400).json({ success: false, message: `El usuario con id ${usuarioId} no existe` });

    // 4. Calcular total y crear el pedido
    const total = productos.reduce((sum, p) => sum + (Number(p.precioUnit) * Number(p.cantidad)), 0);

    db.run('INSERT INTO pedidos (usuarioId, total) VALUES (?, ?)', [usuarioId, total], function(err) {
      if (err) return res.status(500).json({ success: false, message: err.message });

      const pedidoId = this.lastID;
      let insertados = 0;

      productos.forEach(p => {
        const subtotal = Number(p.precioUnit) * Number(p.cantidad);
        db.run('INSERT INTO detalle_pedidos (pedidoId, productoId, cantidad, precioUnit, subtotal) VALUES (?, ?, ?, ?, ?)',
          [pedidoId, p.productoId, Number(p.cantidad), Number(p.precioUnit), subtotal],
          (err) => {
            if (err) console.error('Error insertando detalle:', err.message);
            insertados++;
            if (insertados === productos.length) {
              res.status(201).json({
                success: true, message: 'Pedido creado correctamente',
                data: { id: pedidoId, usuarioId, total, estado: 'pendiente', productos }
              });
            }
          }
        );
      });
    });
  });
});

// PUT /pedidos/:id — Actualizar estado del pedido
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  db.get('SELECT * FROM pedidos WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: `Pedido con id ${id} no encontrado` });

    if (!estado) return res.status(400).json({ success: false, message: 'El campo estado es obligatorio' });
    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ success: false, message: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}` });
    }

    db.run('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, id], function(err) {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Estado del pedido actualizado', data: { ...row, estado } });
    });
  });
});

// DELETE /pedidos/:id — Eliminar pedido y sus detalles
router.delete('/:id', (req, res) => {
  db.get('SELECT * FROM pedidos WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: `Pedido con id ${req.params.id} no encontrado` });

    // Eliminar detalles primero (integridad referencial)
    db.run('DELETE FROM detalle_pedidos WHERE pedidoId = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      db.run('DELETE FROM pedidos WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Pedido eliminado correctamente', data: row });
      });
    });
  });
});

module.exports = router;
