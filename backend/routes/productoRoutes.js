const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/', async (req, res) => {
    try {
        const { sku, nombre, stock_actual, stock_minimo, precio_compra, precio_venta, categoria_id } = req.body;
        const nuevoProducto = await pool.query(
            "INSERT INTO productos (sku, nombre, stock_actual,stock_minimo,precio_compra,precio_venta,categoria_id ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [sku, nombre, stock_actual, stock_minimo, precio_compra, precio_venta, categoria_id]
        );
        res.json(nuevoProducto.rows[0]);
    } catch (err) {
        console.error(err.message);

        if (err.code === '23503') {
            return res.status(400).json({ mensaje: "La categoría especificada no existe" });
        }

        res.status(500).send("Error en el servidor");
    }
});

router.get('/', async (req, res) => {
    try {
        const todosProductos = await pool.query(
            `SELECT p.*, c.nombre AS categoria_nombre 
             FROM productos p 
             LEFT JOIN categorias c ON p.categoria_id = c.id 
             ORDER BY p.nombre ASC`
        );
        res.json(todosProductos.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Error al obtener los productos");
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const producto = await pool.query("SELECT * FROM productos WHERE id = $1", [id]);

        if (producto.rows.length === 0) {
            return res.status(404).json({ mensaje: "Producto no encontrado" });
        }

        res.json(producto.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Error en el servidor");
    }
});

// Buscar producto por SKU (Ideal para pistola de barras)
router.get('/sku/:sku', async (req, res) => {
    try {
        const { sku } = req.params;

        const producto = await pool.query(
            `SELECT p.*, c.nombre AS categoria_nombre 
             FROM productos p 
             INNER JOIN categorias c ON p.categoria_id = c.id 
             WHERE p.sku = $1`,
            [sku]
        );

        if (producto.rows.length === 0) {
            return res.status(404).json({ mensaje: "Producto no encontrado con ese SKU" });
        }

        res.json(producto.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Error en el servidor");
    }
});

// Actualizar stock de un producto
router.put('/:id/stock', async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidad, tipo } = req.body; // tipo: 'sumar' o 'restar'

        // Primero buscamos el stock actual
        const productoActual = await pool.query("SELECT stock_actual FROM productos WHERE id = $1", [id]);

        if (productoActual.rows.length === 0) {
            return res.status(404).json({ mensaje: "Producto no encontrado" });
        }

        let nuevoStock = productoActual.rows[0].stock_actual;

        if (tipo === 'sumar') {
            nuevoStock += cantidad;
        } else if (tipo === 'restar') {
            if (nuevoStock < cantidad) {
                return res.status(400).json({ mensaje: "Stock insuficiente para realizar la salida" });
            }
            nuevoStock -= cantidad;
        }

        const resultado = await pool.query(
            "UPDATE productos SET stock_actual = $1 WHERE id = $2 RETURNING *",
            [nuevoStock, id]
        );

        res.json(resultado.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Error al actualizar stock");
    }
});

// Incrementar stock por SKU (Ingreso de bodega)
router.put('/ingreso-bodega', async (req, res) => {
    try {
        const { sku, cantidad } = req.body;

        const resultado = await pool.query(
            "UPDATE productos SET stock_actual = stock_actual + $1 WHERE sku = $2 RETURNING *",
            [cantidad, sku]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: "Producto no encontrado" });
        }

        res.json({ mensaje: "Stock actualizado", producto: resultado.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Error al actualizar bodega");
    }
});
// EDITAR un producto
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, sku, precio_compra, precio_venta, categoria_id, stock_actual, stock_minimo } = req.body;

        const resultado = await pool.query(
            "UPDATE productos SET nombre = $1, sku = $2, precio_compra = $3, precio_venta = $4, categoria_id = $5, stock_actual = $6 ,stock_minimo = $7 WHERE id = $8 RETURNING *",
            [nombre, sku, precio_compra, precio_venta, categoria_id,stock_actual, stock_minimo, id]
        );

        if (resultado.rows.length === 0) return res.status(404).json({ mensaje: "Producto no encontrado" });
        res.json({ mensaje: "Producto actualizado", producto: resultado.rows[0] });
    } catch (err) {
        res.status(500).send("Error al editar");
    }
});

// ELIMINAR un producto
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM productos WHERE id = $1", [id]);
        res.json({ mensaje: "Producto eliminado correctamente" });
    } catch (err) {
        res.status(500).send("Error al eliminar. Verifica que no tenga movimientos asociados.");
    }
});

// Endpoint para datos resumidos del Panel de Control
router.get('/panelcontrol/resumen', async (req, res) => {
    try {
        // 1. Conteos Básicos (Productos, Categorías, Usuarios)
        const conteos = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM productos) as total_productos,
                (SELECT COUNT(*) FROM categorias) as total_categorias,
                (SELECT COUNT(*) FROM usuarios) as total_usuarios
        `);

        // 2. Último ingreso de inventario (Fecha más reciente en tabla productos)
        const ultimoIngreso = await pool.query(
            "SELECT MAX(creado_en) as fecha FROM productos"
        );

        // 3. Top 3 productos con menor stock (bajo el mínimo)
        const stockBajo = await pool.query(`
            SELECT nombre, stock_actual, stock_minimo 
            FROM productos 
            WHERE stock_actual <= stock_minimo
            ORDER BY stock_actual ASC
            LIMIT 3
        `);

        // 4. Productos recientemente añadidos (Top 3)
        const recientes = await pool.query(`
            SELECT nombre, sku, creado_en 
            FROM productos 
            ORDER BY creado_en DESC 
            LIMIT 3
        `);

        // 5. Últimos movimientos (Trazabilidad: Qué y Quién)
        // Nota: Asumimos que creaste una tabla 'movimientos' con u.nombre.
        // Si no la tienes, esto fallará. Puedes comentar esta parte temporalmente.
        const movimientos = await pool.query(`
            SELECT m.tipo, m.cantidad, m.fecha, p.nombre as producto, u.nombre as usuario
            FROM movimientos m
            JOIN productos p ON m.producto_id = p.id
            JOIN usuarios u ON m.usuario_id = u.id
            ORDER BY m.fecha DESC
            LIMIT 5
        `);

        res.json({
            conteos: conteos.rows[0],
            ultimoIngreso: ultimoIngreso.rows[0].fecha,
            stockBajo: stockBajo.rows,
            recientes: recientes.rows,
            movimientos: movimientos.rows
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Error cargando el panel de control");
    }
});

module.exports = router;