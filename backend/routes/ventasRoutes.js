const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/finalizar', async (req, res) => {
    const { 
        usuario_id, productos, metodo_pago, nro_voucher, 
        total_neto, descuento_valor, total_final, ajustes_necesarios 
    } = req.body;

    const cliente = await pool.connect(); // Iniciamos conexión para transacción

    try {
        await cliente.query('BEGIN'); // Inicio de la transacción

        // 1. Manejar Inconsistencias (Ajustes de entrada si el stock era 0)
        if (ajustes_necesarios && ajustes_necesarios.length > 0) {
            for (let adj of ajustes_necesarios) {
                // Registramos el ajuste de entrada para que el stock no sea negativo
                await cliente.query(
                    "UPDATE productos SET stock_actual = stock_actual + $1 WHERE id = $2",
                    [adj.cantidad, adj.producto_id]
                );
                // Opcional: Registrar en una tabla de 'auditoria_ajustes'
                console.log(`Ajuste automático por inconsistencia: Producto ${adj.producto_id} +${adj.cantidad}`);
            }
        }

        // 2. Registrar la Cabecera de la Venta
        const nuevaVenta = await cliente.query(
            `INSERT INTO ventas 
            (usuario_id, metodo_pago, nro_voucher, total_neto, descuento_valor, total_final) 
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [usuario_id, metodo_pago, nro_voucher, total_neto, descuento_valor, total_final]
        );
        const ventaId = nuevaVenta.rows[0].id;

        // 3. Registrar Detalles y Descontar Stock Real
        for (let prod of productos) {
            // Insertar detalle
            await cliente.query(
                "INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5)",
                [ventaId, prod.id, prod.cantidad, prod.precio, (prod.precio * prod.cantidad)]
            );

            // Descontar Stock
            const updateStock = await cliente.query(
                "UPDATE productos SET stock_actual = stock_actual - $1 WHERE id = $2 RETURNING stock_actual",
                [prod.cantidad, prod.id]
            );

            if (updateStock.rows[0].stock_actual < 0) {
                throw new Error(`Stock insuficiente para el producto ${prod.nombre}`);
            }
        }

        await cliente.query('COMMIT'); // ¡Todo salió bien! Guardamos cambios
        res.json({ mensaje: "Venta procesada con éxito", ventaId });

    } catch (err) {
        await cliente.query('ROLLBACK'); // Algo falló, deshacemos todo
        console.error("Error en transacción de venta:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        cliente.release();
    }
});
// Obtener historial con filtros básicos
router.get('/historial', async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        let query = `
            SELECT v.*, u.nombre as vendedor, 
            (SELECT COUNT(*) FROM detalle_ventas WHERE venta_id = v.id) as items
            FROM ventas v
            JOIN usuarios u ON v.usuario_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (desde && hasta) {
            query += " AND v.fecha BETWEEN $1 AND $2";
            params.push(desde, hasta);
        }

        query += " ORDER BY v.fecha DESC";
        const resultado = await pool.query(query, params);
        res.json(resultado.rows);
    } catch (err) {
        res.status(500).send("Error al obtener historial");
    }
});

// Anular Venta (Devuelve stock y marca como anulada)
router.post('/anular/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Obtener los productos de esa venta para devolverlos al stock
        const detalles = await client.query("SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = $1", [id]);

        for (let item of detalles.rows) {
            await client.query(
                "UPDATE productos SET stock_actual = stock_actual + $1 WHERE id = $2",
                [item.cantidad, item.producto_id]
            );
        }

        // 2. Marcar la venta como anulada (necesitarás una columna 'estado' en tu tabla ventas)
        await client.query("UPDATE ventas SET estado = 'ANULADA', total_final = 0 WHERE id = $1", [id]);

        await client.query('COMMIT');
        res.json({ mensaje: "Venta anulada y stock restaurado" });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).send("Error al anular");
    } finally {
        client.release();
    }
});