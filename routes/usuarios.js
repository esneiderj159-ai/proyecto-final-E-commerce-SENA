const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ══════════════════════════════════════════════════════
// GET /usuarios — Listar todos con filtros dinámicos
// Filtros disponibles: ?nombre= ?email= ?rol= ?activo=
// ══════════════════════════════════════════════════════
router.get('/', (req, res) => {
  const { nombre, email, rol, activo } = req.query;

  let sql = 'SELECT id, nombre, email, rol, activo, createdAt FROM usuarios WHERE 1=1';
  const params = [];

  if (nombre) { sql += ' AND nombre LIKE ?'; params.push(`%${nombre}%`); }
  if (email)  { sql += ' AND email LIKE ?';  params.push(`%${email}%`); }
  if (rol)    { sql += ' AND rol = ?';        params.push(rol); }
  if (activo !== undefined) {
    sql += ' AND activo = ?';
    params.push(activo === 'true' ? 1 : 0);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, total: rows.length, data: rows });
  });
});

// ══════════════════════════════════════════════════════
// GET /usuarios/:id — Obtener uno por ID
// ══════════════════════════════════════════════════════
router.get('/:id', (req, res) => {
  db.get('SELECT id, nombre, email, rol, activo, createdAt FROM usuarios WHERE id = ?',
    [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (!row) return res.status(404).json({ success: false, message: `Usuario con id ${req.params.id} no encontrado` });
      res.json({ success: true, data: row });
    });
});

// ══════════════════════════════════════════════════════
// POST /usuarios — Crear usuario nuevo
// Validaciones: nombre y email obligatorios, email único,
// formato de email válido, rol válido
// ══════════════════════════════════════════════════════
router.post('/', (req, res) => {
  const { nombre, email, password, rol } = req.body;

  // 1. Campos obligatorios
  if (!nombre || !email || !password) {
    return res.status(400).json({ success: false, message: 'Los campos nombre, email y password son obligatorios' });
  }

  // 2. Formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'El formato del email no es válido' });
  }

  // 3. Rol válido
  const rolesValidos = ['admin', 'cliente', 'vendedor'];
  if (rol && !rolesValidos.includes(rol)) {
    return res.status(400).json({ success: false, message: `rol debe ser: ${rolesValidos.join(', ')}` });
  }

  // 4. Unicidad del email
  //db.get('SELECT id FROM usuarios WHERE email = ?', [email.toLowerCase()], (err, row) => {
    //if (err) return res.status(500).json({ success: false, message: err.message });
    //if (row) return res.status(400).json({ success: false, message: `El email '${email}' ya está registrado` });
    db.run('INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
      [nombre.trim(), email.toLowerCase(), password, rol || 'cliente'],
      function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.status(201).json({
          success: true,
          message: 'Usuario registrado correctamente',
          data: { id: this.lastID, nombre: nombre.trim(), email: email.toLowerCase(), rol: rol || 'cliente', activo: 1 }
        });
      }
    );
  });
//});

// ══════════════════════════════════════════════════════
// PUT /usuarios/:id — Actualizar usuario
// ══════════════════════════════════════════════════════
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, email, password, rol, activo } = req.body;

  db.get('SELECT * FROM usuarios WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: `Usuario con id ${id} no encontrado` });

    const rolesValidos = ['admin', 'cliente', 'vendedor'];
    if (rol && !rolesValidos.includes(rol)) {
      return res.status(400).json({ success: false, message: `rol debe ser: ${rolesValidos.join(', ')}` });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return res.status(400).json({ success: false, message: 'Formato de email inválido' });
    }

    const nuevoNombre   = nombre   !== undefined ? nombre.trim()       : row.nombre;
    const nuevoEmail    = email    !== undefined ? email.toLowerCase()  : row.email;
    const nuevoPassword = password !== undefined ? password             : row.password;
    const nuevoRol      = rol      !== undefined ? rol                  : row.rol;
    const nuevoActivo   = activo   !== undefined ? (activo ? 1 : 0)    : row.activo;

    db.run('UPDATE usuarios SET nombre=?, email=?, password=?, rol=?, activo=? WHERE id=?',
      [nuevoNombre, nuevoEmail, nuevoPassword, nuevoRol, nuevoActivo, id],
      function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Usuario actualizado correctamente',
          data: { id: parseInt(id), nombre: nuevoNombre, email: nuevoEmail, rol: nuevoRol, activo: nuevoActivo } });
      }
    );
  });
});

// ══════════════════════════════════════════════════════
// DELETE /usuarios/:id — Eliminar usuario junto con datos relacionados
// ══════════════════════════════════════════════════════
router.delete('/:id', (req, res) => {
  const id = req.params.id;

  db.get('SELECT * FROM usuarios WHERE id = ?', [id], (err, usuario) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!usuario) return res.status(404).json({ success: false, message: `Usuario con id ${id} no encontrado` });

    db.serialize(() => {
      // Borrar pagos relacionados con pedidos del usuario
      db.run(
        `DELETE FROM pagos WHERE pedidoId IN (SELECT id FROM pedidos WHERE usuarioId = ?)`,
        [id]
      );

      // Borrar detalles de pedidos relacionados con pedidos del usuario
      db.run(
        `DELETE FROM detalle_pedidos WHERE pedidoId IN (SELECT id FROM pedidos WHERE usuarioId = ?)`,
        [id]
      );

      // Borrar pedidos del usuario
      db.run(
        `DELETE FROM pedidos WHERE usuarioId = ?`,
        [id]
      );

      // Borrar reseñas del usuario
      db.run(
        `DELETE FROM resenas WHERE usuarioId = ?`,
        [id]
      );

      // Finalmente borrar usuario
      db.run('DELETE FROM usuarios WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Usuario eliminado correctamente', data: usuario });
      });
    });
  });
});

module.exports = router;