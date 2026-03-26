const express = require('express');
const router = express.Router();
const pool = require('../db');

// --- 1. LISTAR TODOS LOS PRODUCTOS ---
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
        console.error('ERROR LISTAR PRODUCTOS:', err.message);
        res.status(500).send('Error al obtener los productos');
    }
});

// --- 2. BUSCAR POR SKU (Clave para el escáner) ---
router.get('/sku/:sku', async (req, res) => {
    try {
        const { sku } = req.params;
        const producto = await pool.query(
            `SELECT p.*, c.nombre AS categoria_nombre
             FROM productos p
             LEFT JOIN categorias c ON p.categoria_id = c.id
             WHERE p.sku = $1`,
            [sku]
        );

        if (producto.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }
        res.json(producto.rows[0]);
    } catch (err) {
        console.error('ERROR BUSCAR SKU:', err.message);
        res.status(500).send('Error en el servidor');
    }
});

// --- 3. CREAR PRODUCTO NUEVO ---
router.post('/', async (req, res) => {
    const {
        sku, nombre, stock_actual, stock_minimo,
        precio_compra, precio_venta, categoria_id, usuario_id
    } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const nuevoProducto = await client.query(
            `INSERT INTO productos (
                sku, nombre, stock_actual, stock_minimo, precio_compra, precio_venta, categoria_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [sku, nombre, stock_actual, stock_minimo, precio_compra, precio_venta, categoria_id]
        );

        const prod = nuevoProducto.rows[0];
        await client.query(
            `INSERT INTO movimientos (tipo, producto_id, usuario_id, cantidad, motivo)
             VALUES ('ENTRADA', $1, $2, $3, 'CREACIÓN DE PRODUCTO NUEVO')`,
            [prod.id, usuario_id || 1, Number(stock_actual) || 0]
        );

        await client.query('COMMIT');
        res.json(prod);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('ERROR CREAR:', err.message);
        res.status(500).json({ error: "Error al crear producto" });
    } finally {
        client.release();
    }
});

// --- 4. INGRESO MASIVO (CAMIÓN DE MERCADERÍA) ---
router.post('/ingreso-masivo', async (req, res) => {
    const { productos, usuario_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (let prod of productos) {
            await client.query(
                "UPDATE productos SET stock_actual = stock_actual + $1 WHERE id = $2",
                [prod.cantidad, prod.id]
            );
            await client.query(
                `INSERT INTO movimientos (producto_id, tipo, cantidad, motivo, usuario_id) 
                 VALUES ($1, 'ENTRADA', $2, 'INGRESO CAMIÓN MERCADERÍA', $3)`,
                [prod.id, prod.cantidad, usuario_id || 1]
            );
        }
        await client.query('COMMIT');
        res.json({ mensaje: "Stock actualizado correctamente" });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("ERROR INGRESO MASIVO:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// --- 5. ACTUALIZAR / EDITAR DATOS ---
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, sku, precio_compra, precio_venta, categoria_id, stock_actual, stock_minimo, usuario_id } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const resultado = await client.query(
            `UPDATE productos SET nombre=$1, sku=$2, precio_compra=$3, precio_venta=$4, 
             categoria_id=$5, stock_actual=$6, stock_minimo=$7 WHERE id=$8 RETURNING *`,
            [nombre, sku, precio_compra, precio_venta, categoria_id, stock_actual, stock_minimo, id]
        );

        await client.query(
            `INSERT INTO movimientos (tipo, producto_id, usuario_id, cantidad, motivo)
             VALUES ('EDICIÓN', $1, $2, 0, 'MODIFICACIÓN DE FICHA TÉCNICA')`,
            [id, usuario_id || 1]
        );

        await client.query('COMMIT');
        res.json(resultado.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).send('Error al editar');
    } finally {
        client.release();
    }
});

// --- 6. RESUMEN PANEL DE CONTROL ---
router.get('/panelcontrol/resumen', async (req, res) => {
    try {
        const consultaCards = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM productos) as total_productos,
                (SELECT COUNT(*) FROM categorias) as total_categorias,
                (
                    SELECT MAX(fecha)
                    FROM movimientos
                    WHERE tipo IN ('ENTRADA', 'Ingreso en bodega')
                ) as ultimo_ingreso
        `);

        const consultaStock = await pool.query(`
            SELECT nombre, stock_actual, stock_minimo
            FROM productos
            ORDER BY (stock_actual - stock_minimo) ASC
            LIMIT 3
        `);

        const consultaMovimientos = await pool.query(`
            SELECT m.tipo, p.nombre as producto, u.nombre as usuario, m.fecha, m.cantidad
            FROM movimientos m
            LEFT JOIN productos p ON m.producto_id = p.id
            LEFT JOIN usuarios u ON m.usuario_id = u.id
            ORDER BY m.fecha DESC LIMIT 5
        `);

        res.json({
            cards: consultaCards.rows[0],
            stockBajo: consultaStock.rows,
            movimientos: consultaMovimientos.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 7. OBTENER POR ID ---
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const producto = await pool.query('SELECT * FROM productos WHERE id = $1', [id]);
        if (producto.rows.length === 0) return res.status(404).json({ mensaje: 'No existe' });
        res.json(producto.rows[0]);
    } catch (err) {
        res.status(500).send('Error');
    }
});

module.exports = router;