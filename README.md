# 🛒 API REST E-commerce — Proyecto Final SENA

> **Actividad:** Proyecto Final Integrador — Construcción y Despliegue de Sistema Backend
> **Programa:** Tecnología en Análisis y Desarrollo de Software
> **Instructor:** Mateo Arroyave
> **Integrantes:** Angel Gabriel Villada Jiménez, Erick Sneider Jiménez López, Diego Rojas, Diego Bermudez
> **Ficha:** 3229209
> **Dominio elegido:** E-commerce

---

## 📋 Descripción del Proyecto

Sistema backend completo para una tienda en línea (E-commerce). Permite gestionar usuarios registrados, un catálogo de productos organizados por categorías, pedidos con sus ítems detallados, pagos asociados a cada pedido, y reseñas de productos escritas por usuarios.

Construido con **Node.js**, **Express.js** y **SQLite** como base de datos relacional, desplegado en producción usando **Render.com**.

---

## 🌐 URL en Producción

```
https://proyecto-final-e-commerce-sena.onrender.com
```

> ⚠️ El plan gratuito de Render suspende el servidor tras 15 minutos de inactividad. La primera petición puede tardar hasta 60 segundos (cold start). Esto es completamente normal.

---

## 🔐 Autenticación

Todos los endpoints requieren el siguiente header en cada petición:

```
password: EcommerceSeguro2024
```

| Código HTTP | Significado |
|-------------|-------------|
| `401 Unauthorized` | No se envió el header `password` |
| `403 Forbidden` | La password enviada es incorrecta |

---

## 🗄️ Modelo de Datos — Diagrama Entidad-Relación

El sistema tiene **7 tablas** relacionadas entre sí:

```
categorias (PK: id)
    │
    │ 1:N
    ▼
productos (PK: id, FK: categoriaId → categorias.id)
    │                        │
    │ 1:N                    │ 1:N
    ▼                        ▼
detalle_pedidos           resenas
(FK: pedidoId              (FK: usuarioId → usuarios.id
 FK: productoId)            FK: productoId → productos.id)
    │
    ▼
pedidos (PK: id, FK: usuarioId → usuarios.id)
    │                    │
    │ 1:1                │ N:1
    ▼                    ▼
pagos                 usuarios (PK: id)
(FK: pedidoId)
```

### Relaciones principales
- Una **categoría** tiene muchos **productos** (1:N)
- Un **usuario** hace muchos **pedidos** (1:N)
- Un **pedido** tiene muchos **productos** a través de **detalle_pedidos** (N:M)
- Un **pedido** tiene exactamente un **pago** (1:1)
- Un **usuario** puede escribir muchas **reseñas** (1:N)

---

## 📋 Diccionario de Datos

### Tabla 1: `usuarios`
| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| id | INTEGER PK | AUTOINCREMENT | Identificador único |
| nombre | TEXT | NOT NULL | Nombre completo |
| email | TEXT | NOT NULL UNIQUE | Correo (no puede repetirse) |
| password | TEXT | NOT NULL | Contraseña |
| rol | TEXT | CHECK(admin, cliente, vendedor) | Rol en el sistema |
| activo | INTEGER | DEFAULT 1, CHECK(0,1) | 1=activo, 0=inactivo |
| createdAt | TEXT | DEFAULT datetime('now') | Fecha de registro |

### Tabla 2: `categorias`
| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| id | INTEGER PK | AUTOINCREMENT | Identificador único |
| nombre | TEXT | NOT NULL UNIQUE | Nombre (no puede repetirse) |
| descripcion | TEXT | DEFAULT '' | Descripción opcional |
| activa | INTEGER | DEFAULT 1, CHECK(0,1) | 1=activa, 0=inactiva |

### Tabla 3: `productos`
| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| id | INTEGER PK | AUTOINCREMENT | Identificador único |
| nombre | TEXT | NOT NULL | Nombre del producto |
| descripcion | TEXT | DEFAULT '' | Descripción opcional |
| precio | REAL | NOT NULL, CHECK(>0) | Precio de venta |
| stock | INTEGER | DEFAULT 0, CHECK(>=0) | Unidades disponibles |
| categoriaId | INTEGER FK | → categorias.id | Categoría a la que pertenece |
| activo | INTEGER | DEFAULT 1, CHECK(0,1) | 1=activo, 0=inactivo |

### Tabla 4: `pedidos`
| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| id | INTEGER PK | AUTOINCREMENT | Identificador único |
| usuarioId | INTEGER FK | → usuarios.id | Usuario que realizó el pedido |
| total | REAL | DEFAULT 0, CHECK(>=0) | Total calculado automáticamente |
| estado | TEXT | CHECK(pendiente, procesando, enviado, entregado, cancelado) | Estado actual |
| fecha | TEXT | DEFAULT datetime('now') | Fecha de creación |

### Tabla 5: `detalle_pedidos`
| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| id | INTEGER PK | AUTOINCREMENT | Identificador único |
| pedidoId | INTEGER FK | → pedidos.id | Pedido al que pertenece |
| productoId | INTEGER FK | → productos.id | Producto incluido |
| cantidad | INTEGER | NOT NULL, CHECK(>0) | Cantidad pedida |
| precioUnit | REAL | NOT NULL, CHECK(>0) | Precio unitario |
| subtotal | REAL | NOT NULL, CHECK(>0) | cantidad × precioUnit |

### Tabla 6: `pagos`
| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| id | INTEGER PK | AUTOINCREMENT | Identificador único |
| pedidoId | INTEGER FK | → pedidos.id UNIQUE | Pedido pagado (1:1) |
| monto | REAL | NOT NULL, CHECK(>0) | Monto del pago |
| metodo | TEXT | CHECK(efectivo, tarjeta, transferencia, nequi, daviplata) | Método de pago |
| estado | TEXT | CHECK(pendiente, aprobado, rechazado, reembolsado) | Estado del pago |
| fecha | TEXT | DEFAULT datetime('now') | Fecha del pago |

### Tabla 7: `resenas`
| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| id | INTEGER PK | AUTOINCREMENT | Identificador único |
| usuarioId | INTEGER FK | → usuarios.id | Usuario que reseñó |
| productoId | INTEGER FK | → productos.id | Producto reseñado |
| calificacion | INTEGER | NOT NULL, CHECK(1-5) | Calificación de 1 a 5 |
| comentario | TEXT | DEFAULT '' | Comentario opcional |
| fecha | TEXT | DEFAULT datetime('now') | Fecha de la reseña |

---

## 📌 Endpoints — 35 en total (7 tablas × 5 métodos)

**Base URL:** `https://proyecto-final-e-commerce-sena.onrender.com`
**Header requerido en todas las peticiones:** `password: EcommerceSeguro2024`

### 👤 Usuarios `/usuarios`
| Método | Ruta | Descripción | Código |
|--------|------|-------------|--------|
| GET | `/usuarios` | Listar todos (?nombre, ?email, ?rol, ?activo) | 200 |
| GET | `/usuarios/:id` | Obtener por ID | 200 / 404 |
| POST | `/usuarios` | Registrar nuevo usuario | 201 / 400 |
| PUT | `/usuarios/:id` | Actualizar usuario | 200 / 404 |
| DELETE | `/usuarios/:id` | Eliminar usuario | 200 / 404 |

### 🏷️ Categorías `/categorias`
| Método | Ruta | Descripción | Código |
|--------|------|-------------|--------|
| GET | `/categorias` | Listar todas (?nombre, ?activa) | 200 |
| GET | `/categorias/:id` | Obtener por ID | 200 / 404 |
| POST | `/categorias` | Crear categoría | 201 / 400 |
| PUT | `/categorias/:id` | Actualizar categoría | 200 / 404 |
| DELETE | `/categorias/:id` | Eliminar categoría | 200 / 404 |

### 📦 Productos `/productos`
| Método | Ruta | Descripción | Código |
|--------|------|-------------|--------|
| GET | `/productos` | Listar todos (?nombre, ?categoriaId, ?activo, ?precioMin, ?precioMax) | 200 |
| GET | `/productos/:id` | Obtener por ID | 200 / 404 |
| POST | `/productos` | Crear producto | 201 / 400 |
| PUT | `/productos/:id` | Actualizar producto | 200 / 404 |
| DELETE | `/productos/:id` | Eliminar producto | 200 / 404 |

### 🛒 Pedidos `/pedidos`
| Método | Ruta | Descripción | Código |
|--------|------|-------------|--------|
| GET | `/pedidos` | Listar todos (?usuarioId, ?estado, ?fecha) | 200 |
| GET | `/pedidos/:id` | Obtener por ID con detalles | 200 / 404 |
| POST | `/pedidos` | Crear pedido | 201 / 400 |
| PUT | `/pedidos/:id` | Actualizar estado | 200 / 404 |
| DELETE | `/pedidos/:id` | Eliminar pedido | 200 / 404 |

### 📋 Detalle Pedidos `/detalle-pedidos`
| Método | Ruta | Descripción | Código |
|--------|------|-------------|--------|
| GET | `/detalle-pedidos` | Listar todos (?pedidoId, ?productoId) | 200 |
| GET | `/detalle-pedidos/:id` | Obtener por ID | 200 / 404 |
| POST | `/detalle-pedidos` | Agregar ítem a pedido | 201 / 400 |
| PUT | `/detalle-pedidos/:id` | Actualizar cantidad/precio | 200 / 404 |
| DELETE | `/detalle-pedidos/:id` | Eliminar ítem | 200 / 404 |

### 💳 Pagos `/pagos`
| Método | Ruta | Descripción | Código |
|--------|------|-------------|--------|
| GET | `/pagos` | Listar todos (?pedidoId, ?metodo, ?estado) | 200 |
| GET | `/pagos/:id` | Obtener por ID | 200 / 404 |
| POST | `/pagos` | Registrar pago | 201 / 400 |
| PUT | `/pagos/:id` | Actualizar estado/método | 200 / 404 |
| DELETE | `/pagos/:id` | Eliminar pago | 200 / 404 |

### ⭐ Reseñas `/resenas`
| Método | Ruta | Descripción | Código |
|--------|------|-------------|--------|
| GET | `/resenas` | Listar todas (?usuarioId, ?productoId, ?calificacion) | 200 |
| GET | `/resenas/:id` | Obtener por ID | 200 / 404 |
| POST | `/resenas` | Crear reseña | 201 / 400 |
| PUT | `/resenas/:id` | Actualizar calificación/comentario | 200 / 404 |
| DELETE | `/resenas/:id` | Eliminar reseña | 200 / 404 |

---

## 💻 Ejemplos de uso

```bash
# Listar todos los productos
curl https://proyecto-final-e-commerce-sena.onrender.com/productos \
  -H "password: EcommerceSeguro2024"

# Crear una categoría
curl -X POST https://proyecto-final-e-commerce-sena.onrender.com/categorias \
  -H "password: EcommerceSeguro2024" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Tecnología","descripcion":"Dispositivos electrónicos"}'

# Crear un usuario
curl -X POST https://proyecto-final-e-commerce-sena.onrender.com/usuarios \
  -H "password: EcommerceSeguro2024" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Juan Pérez","email":"juan@email.com","password":"123456","rol":"cliente"}'

# Crear un pedido
curl -X POST https://proyecto-final-e-commerce-sena.onrender.com/pedidos \
  -H "password: EcommerceSeguro2024" \
  -H "Content-Type: application/json" \
  -d '{"usuarioId":1,"productos":[{"productoId":1,"cantidad":2,"precioUnit":2500000}]}'
```

---

## 🧪 Orden correcto para insertar datos

Respetar este orden para no violar las restricciones de llaves foráneas:

1. **Categorías** — no dependen de nada
2. **Usuarios** — no dependen de nada
3. **Productos** — necesitan `categoriaId`
4. **Pedidos** — necesitan `usuarioId`
5. **Detalle pedidos** — necesitan `pedidoId` y `productoId`
6. **Pagos** — necesitan `pedidoId`
7. **Reseñas** — necesitan `usuarioId` y `productoId`

---

## 🛠️ Tecnologías Utilizadas

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | v18+ | Entorno de ejecución |
| Express.js | v4.22+ | Framework REST API |
| SQLite3 | v5.1+ | Base de datos relacional |
| dotenv | v16+ | Variables de entorno |
| Render.com | — | Despliegue en la nube |
| Postman | — | Pruebas de endpoints |

---

## 🚀 Instrucciones para Correr Localmente

```bash
# 1. Clonar el repositorio
git clone https://github.com/esneiderj159-ai/proyecto-final-E-commerce-SENA.git
cd proyecto-final-E-commerce-SENA

# 2. Instalar dependencias
npm install

# 3. Crear archivo .env en la raíz
echo "PORT=3000" > .env
echo "API_PASSWORD=EcommerceSeguro2024" >> .env
echo "NODE_ENV=development" >> .env

# 4. Ejecutar el servidor
npm start

# El servidor corre en http://localhost:3000
# La base de datos database.db se crea automáticamente
```

---

## 📝 Notas Importantes

- Los datos se almacenan de forma persistente en SQLite localmente.
- En Render con plan gratuito, los datos se reinician al redesplegar — comportamiento normal en desarrollo.
- Los archivos `database.db`, `node_modules/` y `.env` están excluidos del repositorio mediante `.gitignore`.
- El servidor incluye datos iniciales (seed) que se insertan automáticamente si la base de datos está vacía.
