// routes/resenas.js — CRUD completo para la tabla resenas
const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /resenas — Listar todas con filtros
// Filtros: ?usuarioId= ?productoId= ?calificacion=
router.get('/', (req, res) => {
  const { usuarioId, productoId, calificacion } = req.query;

  let sql = `
    SELECT r.*, u.nombre AS usuarioNombre, p.nombre AS productoNombre
    FROM resenas r
    LEFT JOIN usuarios  u ON r.usuarioId  = u.id
    LEFT JOIN productos p ON r.productoId = p.id
    WHERE 1=1
  `;
  const params = [];

  if (usuarioId)    { sql += ' AND r.usuarioId = ?';    params.push(usuarioId); }
  if (productoId)   { sql += ' AND r.productoId = ?';   params.push(productoId); }
  if (calificacion) { sql += ' AND r.calificacion = ?'; params.push(Number(calificacion)); }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, total: rows.length, data: rows });
  });
});

// GET /resenas/:id
router.get('/:id', (req, res) => {
  db.get(`
    SELECT r.*, u.nombre AS usuarioNombre, p.nombre AS productoNombre
    FROM resenas r
    LEFT JOIN usuarios  u ON r.usuarioId  = u.id
    LEFT JOIN productos p ON r.productoId = p.id
    WHERE r.id = ?`, [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (!row) return res.status(404).json({ success: false, message: `Reseña con id ${req.params.id} no encontrada` });
      res.json({ success: true, data: row });
    }
  );
});

// POST /resenas — Crear reseña nueva
// Validaciones: usuarioId, productoId y calificacion son obligatorios,
//               calificacion debe ser entero entre 1 y 5,
//               usuarioId debe existir (FK), productoId debe existir (FK)
router.post('/', (req, res) => {
  const { usuarioId, productoId, calificacion, comentario } = req.body;

  // 1. Campos obligatorios
  if (!usuarioId || !productoId || calificacion === undefined) {
    return res.status(400).json({ success: false, message: 'usuarioId, productoId y calificacion son obligatorios' });
  }

  // 2. Calificación entre 1 y 5 (validación crítica del dominio)
  const cal = Number(calificacion);
  if (!Number.isInteger(cal) || cal < 1 || cal > 5) {
    return res.status(400).json({ success: false, message: 'calificacion debe ser un entero entre 1 y 5' });
  }

  // 3. Verificar que el usuario existe (FK)
  db.get('SELECT id FROM usuarios WHERE id = ?', [usuarioId], (err, usuario) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!usuario) return res.status(400).json({ success: false, message: `El usuario con id ${usuarioId} no existe` });

    // 4. Verificar que el producto existe (FK)
    db.get('SELECT id FROM productos WHERE id = ?', [productoId], (err, producto) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (!producto) return res.status(400).json({ success: false, message: `El producto con id ${productoId} no existe` });

      db.run('INSERT INTO resenas (usuarioId, productoId, calificacion, comentario) VALUES (?, ?, ?, ?)',
        [Number(usuarioId), Number(productoId), cal, comentario || ''],
        function(err) {
          if (err) return res.status(500).json({ success: false, message: err.message });
          res.status(201).json({
            success: true, message: 'Reseña creada correctamente',
            data: { id: this.lastID, usuarioId: Number(usuarioId), productoId: Number(productoId),
                    calificacion: cal, comentario: comentario || '' }
          });
        }
      );
    });
  });
});

// PUT /resenas/:id — Actualizar calificación o comentario
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { calificacion, comentario } = req.body;

  db.get('SELECT * FROM resenas WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: `Reseña con id ${id} no encontrada` });

    if (calificacion !== undefined) {
      const cal = Number(calificacion);
      if (!Number.isInteger(cal) || cal < 1 || cal > 5) {
        return res.status(400).json({ success: false, message: 'calificacion debe ser entero entre 1 y 5' });
      }
    }

    const nuevaCal  = calificacion !== undefined ? Number(calificacion) : row.calificacion;
    const nuevoComt = comentario   !== undefined ? comentario           : row.comentario;

    db.run('UPDATE resenas SET calificacion=?, comentario=? WHERE id=?',
      [nuevaCal, nuevoComt, id],
      function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Reseña actualizada correctamente',
          data: { ...row, calificacion: nuevaCal, comentario: nuevoComt } });
      }
    );
  });
});

// DELETE /resenas/:id — Eliminar reseña
router.delete('/:id', (req, res) => {
  db.get('SELECT * FROM resenas WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: `Reseña con id ${req.params.id} no encontrada` });

    db.run('DELETE FROM resenas WHERE id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Reseña eliminada correctamente', data: row });
    });
  });
});

module.exports = router;
