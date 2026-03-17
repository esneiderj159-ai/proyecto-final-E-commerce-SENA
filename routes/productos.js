// routes/productos.js — CRUD completo para la tabla productos
const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /productos — Listar todos con filtros dinámicos
// Filtros: ?nombre= ?categoriaId= ?activo= ?precioMin= ?precioMax=
router.get('/', (req, res) => {
  const { nombre, categoriaId, activo, precioMin, precioMax } = req.query;

  let sql = `
    SELECT p.*, c.nombre AS categoriaNombre
    FROM productos p
    LEFT JOIN categorias c ON p.categoriaId = c.id
    WHERE 1=1
  `;
  const params = [];

  if (nombre)     { sql += ' AND p.nombre LIKE ?';      params.push(`%${nombre}%`); }
  if (categoriaId){ sql += ' AND p.categoriaId = ?';    params.push(categoriaId); }
  if (precioMin)  { sql += ' AND p.precio >= ?';        params.push(Number(precioMin)); }
  if (precioMax)  { sql += ' AND p.precio <= ?';        params.push(Number(precioMax)); }
  if (activo !== undefined) { sql += ' AND p.activo = ?'; params.push(activo === 'true' ? 1 : 0); }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, total: rows.length, data: rows });
  });
});

// GET /productos/:id — Obtener uno por ID con nombre de categoría
router.get('/:id', (req, res) => {
  db.get(`
    SELECT p.*, c.nombre AS categoriaNombre
    FROM productos p
    LEFT JOIN categorias c ON p.categoriaId = c.id
    WHERE p.id = ?`, [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (!row) return res.status(404).json({ success: false, message: `Producto con id ${req.params.id} no encontrado` });
      res.json({ success: true, data: row });
    });
});

// POST /productos — Crear producto nuevo
// Validaciones: nombre/precio/categoriaId obligatorios, precio > 0,
//               stock >= 0, categoriaId debe existir en BD (FK)
router.post('/', (req, res) => {
  const { nombre, descripcion, precio, stock, categoriaId } = req.body;

  // 1. Campos obligatorios
  if (!nombre || precio === undefined || !categoriaId) {
    return res.status(400).json({ success: false, message: 'Los campos nombre, precio y categoriaId son obligatorios' });
  }

  // 2. Nombre no vacío
  if (nombre.trim() === '') {
    return res.status(400).json({ success: false, message: 'El nombre no puede estar vacío' });
  }

  // 3. Precio numérico y mayor a 0
  if (isNaN(precio) || Number(precio) <= 0) {
    return res.status(400).json({ success: false, message: 'precio debe ser un número mayor a 0' });
  }

  // 4. Stock entero mayor o igual a 0
  if (stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) {
    return res.status(400).json({ success: false, message: 'stock debe ser un entero mayor o igual a 0' });
  }

  // 5. Verificar que la categoría existe (integridad referencial)
  db.get('SELECT id FROM categorias WHERE id = ?', [categoriaId], (err, cat) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!cat) return res.status(400).json({ success: false, message: `La categoría con id ${categoriaId} no existe` });

    db.run('INSERT INTO productos (nombre, descripcion, precio, stock, categoriaId) VALUES (?, ?, ?, ?, ?)',
      [nombre.trim(), descripcion || '', Number(precio), Number(stock) || 0, Number(categoriaId)],
      function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.status(201).json({
          success: true, message: 'Producto creado correctamente',
          data: { id: this.lastID, nombre: nombre.trim(), descripcion: descripcion || '',
                  precio: Number(precio), stock: Number(stock) || 0, categoriaId: Number(categoriaId), activo: 1 }
        });
      }
    );
  });
});

// PUT /productos/:id — Actualizar producto
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, stock, categoriaId, activo } = req.body;

  db.get('SELECT * FROM productos WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: `Producto con id ${id} no encontrado` });

    if (precio !== undefined && (isNaN(precio) || Number(precio) <= 0)) {
      return res.status(400).json({ success: false, message: 'precio debe ser mayor a 0' });
    }
    if (stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) {
      return res.status(400).json({ success: false, message: 'stock debe ser entero >= 0' });
    }

    const nuevoNombre      = nombre      !== undefined ? nombre.trim()          : row.nombre;
    const nuevaDesc        = descripcion !== undefined ? descripcion             : row.descripcion;
    const nuevoPrecio      = precio      !== undefined ? Number(precio)          : row.precio;
    const nuevoStock       = stock       !== undefined ? Number(stock)           : row.stock;
    const nuevaCategoriaId = categoriaId !== undefined ? Number(categoriaId)     : row.categoriaId;
    const nuevoActivo      = activo      !== undefined ? (activo ? 1 : 0)        : row.activo;

    db.run('UPDATE productos SET nombre=?, descripcion=?, precio=?, stock=?, categoriaId=?, activo=? WHERE id=?',
      [nuevoNombre, nuevaDesc, nuevoPrecio, nuevoStock, nuevaCategoriaId, nuevoActivo, id],
      function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Producto actualizado correctamente',
          data: { id: parseInt(id), nombre: nuevoNombre, precio: nuevoPrecio, stock: nuevoStock,
                  categoriaId: nuevaCategoriaId, activo: nuevoActivo } });
      }
    );
  });
});

// DELETE /productos/:id — Eliminar producto
router.delete('/:id', (req, res) => {
  db.get('SELECT * FROM productos WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: `Producto con id ${req.params.id} no encontrado` });

    db.run('DELETE FROM productos WHERE id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Producto eliminado correctamente', data: row });
    });
  });
});

module.exports = router;
