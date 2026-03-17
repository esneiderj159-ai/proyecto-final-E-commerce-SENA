// routes/categorias.js — CRUD completo para la tabla categorias
const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /categorias — Listar todas con filtros ?nombre= ?activa=
router.get('/', (req, res) => {
  const { nombre, activa } = req.query;
  let sql = 'SELECT * FROM categorias WHERE 1=1';
  const params = [];

  if (nombre) { sql += ' AND nombre LIKE ?'; params.push(`%${nombre}%`); }
  if (activa !== undefined) { sql += ' AND activa = ?'; params.push(activa === 'true' ? 1 : 0); }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, total: rows.length, data: rows });
  });
});

// GET /categorias/:id — Obtener una por ID
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM categorias WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: `Categoría con id ${req.params.id} no encontrada` });
    res.json({ success: true, data: row });
  });
});

// POST /categorias — Crear categoría
// Validaciones: nombre obligatorio, mínimo 2 caracteres, UNIQUE
router.post('/', (req, res) => {
  const { nombre, descripcion } = req.body;

  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({ success: false, message: 'El campo nombre es obligatorio' });
  }
  if (nombre.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'El nombre debe tener al menos 2 caracteres' });
  }

  db.get('SELECT id FROM categorias WHERE nombre = ?', [nombre.trim()], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (row) return res.status(400).json({ success: false, message: `Ya existe una categoría con el nombre '${nombre}'` });

    db.run('INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
      [nombre.trim(), descripcion || ''],
      function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.status(201).json({
          success: true, message: 'Categoría creada correctamente',
          data: { id: this.lastID, nombre: nombre.trim(), descripcion: descripcion || '', activa: 1 }
        });
      }
    );
  });
});

// PUT /categorias/:id — Actualizar categoría
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, activa } = req.body;

  db.get('SELECT * FROM categorias WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: `Categoría con id ${id} no encontrada` });

    if (activa !== undefined && activa !== true && activa !== false && activa !== 1 && activa !== 0) {
      return res.status(400).json({ success: false, message: 'activa debe ser true o false' });
    }

    const nuevoNombre      = nombre      !== undefined ? nombre.trim()         : row.nombre;
    const nuevaDescripcion = descripcion !== undefined ? descripcion            : row.descripcion;
    const nuevaActiva      = activa      !== undefined ? (activa ? 1 : 0)      : row.activa;

    db.run('UPDATE categorias SET nombre=?, descripcion=?, activa=? WHERE id=?',
      [nuevoNombre, nuevaDescripcion, nuevaActiva, id],
      function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Categoría actualizada correctamente',
          data: { id: parseInt(id), nombre: nuevoNombre, descripcion: nuevaDescripcion, activa: nuevaActiva } });
      }
    );
  });
});

// DELETE /categorias/:id — Eliminar categoría
router.delete('/:id', (req, res) => {
  db.get('SELECT * FROM categorias WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: `Categoría con id ${req.params.id} no encontrada` });

    db.run('DELETE FROM categorias WHERE id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Categoría eliminada correctamente', data: row });
    });
  });
});

module.exports = router;
