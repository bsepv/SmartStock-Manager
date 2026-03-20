const express = require('express');
const router = express.Router();
const pool = require('../db');

// CREAR producto
router.post('/', async (req, res) => {
    const {
        sku,
        nombre,
        stock_actual,
        stock_minimo,
        precio_compra,
        precio_venta,
        categoria_id,
        usuario_id
    } = req.body;

    try {
        await pool.query('BEGIN');

        const nuevoProducto = await pool.query(
            `INSERT INTO productos (
                sku, nombre, stock_actual, stock_minimo, precio_compra, precio_venta, categoria_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [sku, nombre, stock_actual, stock_minimo, precio_compra, precio_venta, categoria_id]
        );

        const productoCreado = nuevoProducto.rows[0];

        await pool.query(
            `INSERT INTO movimientos (tipo, producto_id, usuario_id, cantidad)
             VALUES ($1, $2, $3, $4)`,
            ['Creo un producto', productoCreado.id, usuario_id || 1, Number(stock_actual) || 0]
        );

        await pool.query('COMMIT');
        res.json(productoCreado);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('ERROR CREAR PRODUCTO:', err.message);

        if (err.code === '23503') {
            return res.status(400).json({ mensaje: 'La categoría especificada no existe' });
        }

        res.status(500).send('Error en el servidor');
    }
});

// LISTAR productos
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

// BUSCAR por SKU
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
            return res.status(404).json({ mensaje: 'Producto no encontrado con ese SKU' });
        }

        res.json(producto.rows[0]);
    } catch (err) {
        console.error('ERROR BUSCAR SKU:', err.message);
        res.status(500).send('Error en el servidor');
    }
});

// INGRESO DE BODEGA
router.put('/ingreso-bodega', async (req, res) => {
    const { sku, cantidad, usuario_id } = req.body;

    try {
        await pool.query('BEGIN');

        const updateRes = await pool.query(
            `UPDATE productos
             SET stock_actual = stock_actual + $1
             WHERE sku = $2
             RETURNING id`,
            [Number(cantidad), sku]
        );

        if (updateRes.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        const productoId = updateRes.rows[0].id;

        await pool.query(
            `INSERT INTO movimientos (tipo, producto_id, usuario_id, cantidad)
             VALUES ($1, $2, $3, $4)`,
            ['Ingreso en bodega', productoId, usuario_id || 1, Number(cantidad)]
        );

        await pool.query('COMMIT');
        res.json({ mensaje: 'Ingreso registrado en el historial' });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('ERROR INGRESO BODEGA:', err.message);
        res.status(500).send('Error en el ingreso');
    }
});

// ACTUALIZAR stock
router.put('/:id/stock', async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidad, tipo, usuario_id } = req.body;

        await pool.query('BEGIN');

        const productoActual = await pool.query(
            'SELECT stock_actual FROM productos WHERE id = $1',
            [id]
        );

        if (productoActual.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        let nuevoStock = Number(productoActual.rows[0].stock_actual);

        if (tipo === 'sumar') {
            nuevoStock += Number(cantidad);
        } else if (tipo === 'restar') {
            if (nuevoStock < Number(cantidad)) {
                await pool.query('ROLLBACK');
                return res.status(400).json({ mensaje: 'Stock insuficiente para realizar la salida' });
            }
            nuevoStock -= Number(cantidad);
        } else {
            await pool.query('ROLLBACK');
            return res.status(400).json({ mensaje: 'Tipo de movimiento no válido' });
        }

        const resultado = await pool.query(
            `UPDATE productos
             SET stock_actual = $1
             WHERE id = $2
             RETURNING *`,
            [nuevoStock, id]
        );

        await pool.query(
            `INSERT INTO movimientos (tipo, producto_id, usuario_id, cantidad)
             VALUES ($1, $2, $3, $4)`,
            [tipo === 'sumar' ? 'Entrada de stock' : 'Salida de stock', id, usuario_id || 1, Number(cantidad)]
        );

        await pool.query('COMMIT');
        res.json(resultado.rows[0]);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('ERROR ACTUALIZAR STOCK:', err.message);
        res.status(500).send('Error al actualizar stock');
    }
});

// EDITAR producto
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre,
            sku,
            precio_compra,
            precio_venta,
            categoria_id,
            stock_actual,
            stock_minimo,
            usuario_id
        } = req.body;

        await pool.query('BEGIN');

        const resultado = await pool.query(
            `UPDATE productos
             SET nombre = $1,
                 sku = $2,
                 precio_compra = $3,
                 precio_venta = $4,
                 categoria_id = $5,
                 stock_actual = $6,
                 stock_minimo = $7
             WHERE id = $8
             RETURNING *`,
            [nombre, sku, precio_compra, precio_venta, categoria_id, stock_actual, stock_minimo, id]
        );

        if (resultado.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        await pool.query(
            `INSERT INTO movimientos (tipo, producto_id, usuario_id, cantidad)
             VALUES ($1, $2, $3, $4)`,
            ['Edicion de producto', Number(id), usuario_id || 1, 0]
        );

        await pool.query('COMMIT');
        res.json({ mensaje: 'Producto actualizado', producto: resultado.rows[0] });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('ERROR EDITAR PRODUCTO:', err.message);
        res.status(500).send('Error al editar');
    }
});

// RESUMEN PANEL DE CONTROL
router.get('/panelcontrol/resumen', async (req, res) => {
    try {
        const consultaCards = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM productos) as total_productos,
                (SELECT COUNT(*) FROM categorias) as total_categorias,
                (
                    SELECT MAX(fecha)
                    FROM movimientos
                    WHERE tipo = 'Ingreso en bodega'
                ) as ultimo_ingreso
        `);

        const consultaStock = await pool.query(`
            SELECT nombre, stock_actual, stock_minimo
            FROM productos
            ORDER BY stock_actual ASC
            LIMIT 3
        `);

        const consultaRecientes = await pool.query(`
            SELECT nombre, creado_en
            FROM productos
            ORDER BY creado_en DESC
            LIMIT 3
        `);

        const consultaMovimientos = await pool.query(`
            SELECT
                m.tipo,
                p.nombre as producto,
                u.nombre as usuario,
                m.fecha
            FROM movimientos m
            LEFT JOIN productos p ON m.producto_id = p.id
            LEFT JOIN usuarios u ON m.usuario_id = u.id
            ORDER BY m.fecha DESC
            LIMIT 5
        `);

        res.json({
            cards: consultaCards.rows[0],
            stockBajo: consultaStock.rows,
            recientes: consultaRecientes.rows,
            movimientos: consultaMovimientos.rows
        });
    } catch (err) {
        console.error('DETALLE DEL ERROR EN CONSOLA:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// OBTENER producto por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const producto = await pool.query('SELECT * FROM productos WHERE id = $1', [id]);

        if (producto.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        res.json(producto.rows[0]);
    } catch (err) {
        console.error('ERROR OBTENER PRODUCTO:', err.message);
        res.status(500).send('Error en el servidor');
    }
});

module.exports = router;