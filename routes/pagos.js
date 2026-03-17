// routes/pagos.js — CRUD completo para la tabla pagos
const express = require('express');
const router  = express.Router();
const db      = require('../db');

const METODOS_VALIDOS = ['efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata'];
const ESTADOS_VALIDOS = ['pendiente', 'aprobado', 'rechazado', 'reembolsado'];

// GET /pagos — Listar todos con filtros
// Filtros: ?pedidoId= ?metodo= ?estado=
router.get('/', (req, res) => {
  const { pedidoId, metodo, estado } = req.query;

  let sql = `
    SELECT pa.*, pe.usuarioId, pe.estado AS estadoPedido
    FROM pagos pa
    LEFT JOIN pedidos pe ON pa.pedidoId = pe.id
    WHERE 1=1
  `;
  const params = [];

  if (pedidoId) { sql += ' AND pa.pedidoId = ?'; params.push(pedidoId); }
  if (metodo)   { sql += ' AND pa.metodo = ?';   params.push(metodo); }
  if (estado)   { sql += ' AND pa.estado = ?';   params.push(estado); }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, total: rows.length, data: rows });
  });
});

// GET /pagos/:id
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM pagos WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: `Pago con id ${req.params.id} no encontrado` });
    res.json({ success: true, data: row });
  });
});

// POST /pagos — Registrar un pago para un pedido
// Validaciones: pedidoId y monto y metodo obligatorios,
//               pedidoId debe existir (FK), pedido no debe tener pago ya registrado,
//               monto > 0, metodo en lista válida
router.post('/', (req, res) => {
  const { pedidoId, monto, metodo } = req.body;

  if (!pedidoId || !monto || !metodo) {
    return res.status(400).json({ success: false, message: 'pedidoId, monto y metodo son obligatorios' });
  }
  if (isNaN(monto) || Number(monto) <= 0) {
    return res.status(400).json({ success: false, message: 'monto debe ser un número mayor a 0' });
  }
  if (!METODOS_VALIDOS.includes(metodo)) {
    return res.status(400).json({ success: false, message: `metodo debe ser uno de: ${METODOS_VALIDOS.join(', ')}` });
  }

  // Verificar que el pedido existe (FK)
  db.get('SELECT id FROM pedidos WHERE id = ?', [pedidoId], (err, pedido) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!pedido) return res.status(400).json({ success: false, message: `El pedido con id ${pedidoId} no existe` });

    // Verificar que el pedido no tiene pago ya registrado (UNIQUE en pedidoId)
    db.get('SELECT id FROM pagos WHERE pedidoId = ?', [pedidoId], (err, pagoExistente) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (pagoExistente) return res.status(400).json({ success: false, message: `El pedido ${pedidoId} ya tiene un pago registrado` });

      db.run('INSERT INTO pagos (pedidoId, monto, metodo) VALUES (?, ?, ?)',
        [Number(pedidoId), Number(monto), metodo],
        function(err) {
          if (err) return res.status(500).json({ success: false, message: err.message });
          res.status(201).json({
            success: true, message: 'Pago registrado correctamente',
            data: { id: this.lastID, pedidoId: Number(pedidoId), monto: Number(monto), metodo, estado: 'pendiente' }
          });
        }
      );
    });
  });
});

// PUT /pagos/:id — Actualizar estado del pago
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { estado, metodo } = req.body;

  db.get('SELECT * FROM pagos WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: `Pago con id ${id} no encontrado` });

    if (estado && !ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ success: false, message: `Estado inválido. Valores: ${ESTADOS_VALIDOS.join(', ')}` });
    }
    if (metodo && !METODOS_VALIDOS.includes(metodo)) {
      return res.status(400).json({ success: false, message: `Método inválido. Valores: ${METODOS_VALIDOS.join(', ')}` });
    }

    const nuevoEstado = estado !== undefined ? estado : row.estado;
    const nuevoMetodo = metodo !== undefined ? metodo : row.metodo;

    db.run('UPDATE pagos SET estado=?, metodo=? WHERE id=?', [nuevoEstado, nuevoMetodo, id], function(err) {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Pago actualizado correctamente',
        data: { ...row, estado: nuevoEstado, metodo: nuevoMetodo } });
    });
  });
});

// DELETE /pagos/:id — Eliminar pago
router.delete('/:id', (req, res) => {
  db.get('SELECT * FROM pagos WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: `Pago con id ${req.params.id} no encontrado` });

    db.run('DELETE FROM pagos WHERE id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Pago eliminado correctamente', data: row });
    });
  });
});

module.exports = router;
