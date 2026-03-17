# 🛒 API REST E-commerce — Proyecto Final SENA

> **Actividad:** Proyecto Final Integrador — Construcción y Despliegue de Sistema Backend  
> **Programa:** Tecnología en Análisis y Desarrollo de Software  
> **Instructor:** Mateo  
> **Integrantes:** Angel Gabriel Villada Jiménez y Erick Sneider Jiménez López  
> **Ficha:** 3229209  
> **Dominio:** E-commerce

---

## 📋 Descripción del Proyecto

Sistema backend completo para una tienda en línea (E-commerce). Permite gestionar usuarios, catálogo de productos por categorías, pedidos con sus detalles, pagos y reseñas de productos. Construido con Node.js, Express.js y SQLite, desplegado en Render.

---

## 🌐 URL en Producción

```
https://_________________________.onrender.com
```

> ⚠️ El plan gratuito de Render suspende el servidor tras 15 minutos de inactividad. La primera petición puede tardar hasta 60 segundos (cold start).

---

## 🔐 Autenticación

**Todos los endpoints** requieren el siguiente header en cada petición:

```
password: EcommerceSeguro2024
```

| Código | Causa |
|--------|-------|
| `401` | No se envió el header `password` |
| `403` | La password es incorrecta |

---

## 🗄️ Modelo de Datos — Diagrama ER

```
usuarios (PK: id)
    │
    │ 1:N
    ▼
pedidos (PK: id, FK: usuarioId → usuarios.id)
    │                         │
    │ 1:N                     │ 1:1
    ▼                         ▼
detalle_pedidos              pagos
(PK: id,                   (PK: id,
 FK: pedidoId → pedidos.id, FK: pedidoId → pedidos.id)
 FK: productoId → productos.id)
    │
    │ N:M resuelto
    ▼
productos (PK: id, FK: categoriaId → categorias.id)
    │                    │
    │ N:M                │ 1:N
    ▼                    ▼
resenas              categorias
(PK: id,             (PK: id)
 FK: usuarioId → usuarios.id,
 FK: productoId → productos.id)
```

### Relaciones principales

Una categoría tiene muchos productos (1:N). Un usuario hace muchos pedidos (1:N). Un pedido tiene muchos productos a través de detalle_pedidos (N:M). Un pedido tiene un solo pago (1:1). Un usuario escribe muchas reseñas y un producto tiene muchas reseñas (N:M doble).

---

## 📋 Diccionario de Datos

### Tabla: `usuarios`
| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| id | INTEGER PK | AUTOINCREMENT | Identificador único |
| nombre | TEXT | NOT NULL | Nombre completo |
| email | TEXT | NOT NULL UNIQUE | Correo electrónico |
| password | TEXT | NOT NULL | Contraseña |
| rol | TEXT | CHECK(admin,cliente,vendedor) | Rol del usuario |
| activo | INTEGER | DEFAULT 1 CHECK(0,1) | Estado |
| createdAt | TEXT | DEFAULT datetime('now') | Fecha de registro |

### Tabla: `categorias`
| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| id | INTEGER PK | AUTOINCREMENT | Identificador único |
| nombre | TEXT | NOT NULL UNIQUE | Nombre de la categoría |
| descripcion | TEXT | DEFAULT '' | Descripción |
| activa | INTEGER | DEFAULT 1 CHECK(0,1) | Estado |

### Tabla: `productos`
| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| id | INTEGER PK | AUTOINCREMENT | Identificador único |
| nombre | TEXT | NOT NULL | Nombre del producto |
| descripcion | TEXT | DEFAULT '' | Descripción |
| precio | REAL | NOT NULL CHECK(>0) | Precio de venta |
| stock | INTEGER | DEFAULT 0 CHECK(>=0) | Unidades disponibles |
| categoriaId | INTEGER FK | → categorias.id | Categoría |
| activo | INTEGER | DEFAULT 1 CHECK(0,1) | Estado |

### Tabla: `pedidos`
| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| id | INTEGER PK | AUTOINCREMENT | Identificador único |
| usuarioId | INTEGER FK | → usuarios.id | Usuario que pidió |
| total | REAL | DEFAULT 0 CHECK(>=0) | Total calculado |
| estado | TEXT | CHECK(pendiente,procesando,enviado,entregado,cancelado) | Estado |
| fecha | TEXT | DEFAULT datetime('now') | Fecha del pedido |

### Tabla: `detalle_pedidos`
| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| id | INTEGER PK | AUTOINCREMENT | Identificador único |
| pedidoId | INTEGER FK | → pedidos.id | Pedido al que pertenece |
| productoId | INTEGER FK | → productos.id | Producto incluido |
| cantidad | INTEGER | NOT NULL CHECK(>0) | Cantidad |
| precioUnit | REAL | NOT NULL CHECK(>0) | Precio unitario |
| subtotal | REAL | NOT NULL CHECK(>0) | cantidad × precioUnit |

### Tabla: `pagos`
| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| id | INTEGER PK | AUTOINCREMENT | Identificador único |
| pedidoId | INTEGER FK | → pedidos.id UNIQUE | Pedido pagado (1:1) |
| monto | REAL | NOT NULL CHECK(>0) | Monto del pago |
| metodo | TEXT | CHECK(efectivo,tarjeta,transferencia,nequi,daviplata) | Método |
| estado | TEXT | CHECK(pendiente,aprobado,rechazado,reembolsado) | Estado |
| fecha | TEXT | DEFAULT datetime('now') | Fecha del pago |

### Tabla: `resenas`
| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| id | INTEGER PK | AUTOINCREMENT | Identificador único |
| usuarioId | INTEGER FK | → usuarios.id | Usuario que reseñó |
| productoId | INTEGER FK | → productos.id | Producto reseñado |
| calificacion | INTEGER | NOT NULL CHECK(1-5) | Calificación de 1 a 5 |
| comentario | TEXT | DEFAULT '' | Comentario opcional |
| fecha | TEXT | DEFAULT datetime('now') | Fecha de la reseña |

---

## 📌 Endpoints — 35 en total (7 tablas × 5 métodos)

> **Base URL local:** `http://localhost:3000`  
> **Base URL producción:** `https://_________________________.onrender.com`  
> **Header requerido:** `password: EcommerceSeguro2024`

### 👤 Usuarios `/usuarios`
| Método | Ruta | Descripción | Código |
|--------|------|-------------|--------|
| GET | `/usuarios` | Listar todos (?nombre, ?email, ?rol, ?activo) | 200 |
| GET | `/usuarios/:id` | Obtener por ID | 200 / 404 |
| POST | `/usuarios` | Registrar usuario | 201 / 400 |
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

## 🛠️ Tecnologías Utilizadas

- **Node.js** v18+ — Entorno de ejecución
- **Express.js** v4.22+ — Framework para APIs REST
- **SQLite3** v5.1+ — Base de datos relacional en archivo local
- **dotenv** v16+ — Variables de entorno
- **Render.com** — Plataforma de despliegue en la nube (plan gratuito)
- **Postman** — Pruebas de endpoints

---

## 🚀 Instrucciones para Correr Localmente

```bash
# 1. Clonar el repositorio
git clone https://github.com/_________________________.git
cd ecommerce-api

# 2. Instalar dependencias
npm install

# 3. Crear archivo .env en la raíz
# Con este contenido:
# PORT=3000
# API_PASSWORD=EcommerceSeguro2024
# NODE_ENV=development

# 4. Ejecutar en modo desarrollo
npm run dev

# 5. La API corre en http://localhost:3000
# La base de datos database.db se crea automáticamente
```

---

## 🧪 Orden correcto para insertar datos

```
1. POST /categorias   → primero (no depende de nada)
2. POST /usuarios     → segundo (no depende de nada)
3. POST /productos    → tercero (necesita categoriaId)
4. POST /pedidos      → cuarto  (necesita usuarioId)
5. POST /detalle-pedidos → quinto (necesita pedidoId y productoId)
6. POST /pagos        → sexto   (necesita pedidoId)
7. POST /resenas      → séptimo (necesita usuarioId y productoId)
```

---

## 📝 Notas

- Los datos se almacenan en **SQLite** (`database.db`) de forma persistente localmente.
- En Render (plan gratuito), los datos se pierden al redesplegar — comportamiento esperado.
- `database.db`, `node_modules/` y `.env` están en `.gitignore` y no se suben a GitHub.
