const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/', async (req, res) => {
    try {
        const { sku, nombre, stock_actual, stock_minimo, precio_compra, precio_venta, categoria_id} = req.body;
        const nuevoProducto = await pool.query(
            "INSERT INTO productos (sku, nombre, stock_actual,stock_minimo,precio_compra,precio_venta,categoria_id ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [sku, nombre,stock_actual,stock_minimo,precio_compra,precio_venta,categoria_id]
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
module.exports = router;