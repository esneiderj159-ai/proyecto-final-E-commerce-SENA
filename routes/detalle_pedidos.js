// routes/detalle_pedidos.js — CRUD para la tabla detalle_pedidos
const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /detalle-pedidos — Listar todos con filtros
// Filtros: ?pedidoId= ?productoId=
router.get('/', (req, res) => {
  const { pedidoId, productoId } = req.query;

  let sql = `
    SELECT dp.*, pr.nombre AS productoNombre
    FROM detalle_pedidos dp
    LEFT JOIN productos pr ON dp.productoId = pr.id
    WHERE 1=1
  `;
  const params = [];

  if (pedidoId)   { sql += ' AND dp.pedidoId = ?';   params.push(pedidoId); }
  if (productoId) { sql += ' AND dp.productoId = ?'; params.push(productoId); }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, total: rows.length, data: rows });
  });
});

// GET /detalle-pedidos/:id
router.get('/:id', (req, res) => {
  db.get(`
    SELECT dp.*, pr.nombre AS productoNombre
    FROM detalle_pedidos dp
    LEFT JOIN productos pr ON dp.productoId = pr.id
    WHERE dp.id = ?`, [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (!row) return res.status(404).json({ success: false, message: `Detalle con id ${req.params.id} no encontrado` });
      res.json({ success: true, data: row });
    }
  );
});

// POST /detalle-pedidos — Agregar ítem a un pedido existente
// Validaciones: pedidoId y productoId deben existir, cantidad y precioUnit > 0
router.post('/', (req, res) => {
  const { pedidoId, productoId, cantidad, precioUnit } = req.body;

  if (!pedidoId || !productoId || !cantidad || !precioUnit) {
    return res.status(400).json({ success: false, message: 'pedidoId, productoId, cantidad y precioUnit son obligatorios' });
  }
  if (!Number.isInteger(Number(cantidad)) || Number(cantidad) <= 0) {
    return res.status(400).json({ success: false, message: 'cantidad debe ser un entero mayor a 0' });
  }
  if (isNaN(precioUnit) || Number(precioUnit) <= 0) {
    return res.status(400).json({ success: false, message: 'precioUnit debe ser mayor a 0' });
  }

  // Verificar que el pedido existe (FK)
  db.get('SELECT id FROM pedidos WHERE id = ?', [pedidoId], (err, pedido) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!pedido) return res.status(400).json({ success: false, message: `El pedido con id ${pedidoId} no existe` });

    // Verificar que el producto existe (FK)
    db.get('SELECT id FROM productos WHERE id = ?', [productoId], (err, producto) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (!producto) return res.status(400).json({ success: false, message: `El producto con id ${productoId} no existe` });

      const subtotal = Number(precioUnit) * Number(cantidad);

      db.run('INSERT INTO detalle_pedidos (pedidoId, productoId, cantidad, precioUnit, subtotal) VALUES (?, ?, ?, ?, ?)',
        [Number(pedidoId), Number(productoId), Number(cantidad), Number(precioUnit), subtotal],
        function(err) {
          if (err) return res.status(500).json({ success: false, message: err.message });
          res.status(201).json({
            success: true, message: 'Detalle agregado correctamente',
            data: { id: this.lastID, pedidoId: Number(pedidoId), productoId: Number(productoId),
                    cantidad: Number(cantidad), precioUnit: Number(precioUnit), subtotal }
          });
        }
      );
    });
  });
});

// PUT /detalle-pedidos/:id — Actualizar cantidad o precio
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { cantidad, precioUnit } = req.body;

  db.get('SELECT * FROM detalle_pedidos WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: `Detalle con id ${id} no encontrado` });

    if (cantidad !== undefined && (!Number.isInteger(Number(cantidad)) || Number(cantidad) <= 0)) {
      return res.status(400).json({ success: false, message: 'cantidad debe ser entero mayor a 0' });
    }
    if (precioUnit !== undefined && (isNaN(precioUnit) || Number(precioUnit) <= 0)) {
      return res.status(400).json({ success: false, message: 'precioUnit debe ser mayor a 0' });
    }

    const nuevaCantidad   = cantidad   !== undefined ? Number(cantidad)   : row.cantidad;
    const nuevoPrecioUnit = precioUnit !== undefined ? Number(precioUnit) : row.precioUnit;
    const nuevoSubtotal   = nuevaCantidad * nuevoPrecioUnit;

    db.run('UPDATE detalle_pedidos SET cantidad=?, precioUnit=?, subtotal=? WHERE id=?',
      [nuevaCantidad, nuevoPrecioUnit, nuevoSubtotal, id],
      function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Detalle actualizado correctamente',
          data: { id: parseInt(id), pedidoId: row.pedidoId, productoId: row.productoId,
                  cantidad: nuevaCantidad, precioUnit: nuevoPrecioUnit, subtotal: nuevoSubtotal } });
      }
    );
  });
});

// DELETE /detalle-pedidos/:id — Eliminar ítem de pedido
router.delete('/:id', (req, res) => {
  db.get('SELECT * FROM detalle_pedidos WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: `Detalle con id ${req.params.id} no encontrado` });

    db.run('DELETE FROM detalle_pedidos WHERE id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Detalle eliminado correctamente', data: row });
    });
  });
});

module.exports = router;
