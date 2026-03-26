const express = require('express');
const router = express.Router();
const pool = require('../db');

// --- 1. FINALIZAR VENTA ---
router.post('/finalizar', async (req, res) => {
    const {
        usuario_id, productos, metodo_pago, nro_voucher,
        total_neto, descuento_valor, total_final, ajustes_necesarios
    } = req.body;

    const cliente = await pool.connect();

    try {
        await cliente.query('BEGIN');

        // A. Manejar Inconsistencias
        if (ajustes_necesarios && ajustes_necesarios.length > 0) {
            for (let adj of ajustes_necesarios) {
                await cliente.query(
                    "UPDATE productos SET stock_actual = stock_actual + $1 WHERE id = $2",
                    [adj.cantidad, adj.producto_id]
                );
                await cliente.query(
                    `INSERT INTO movimientos (producto_id, tipo, cantidad, motivo, usuario_id) 
                     VALUES ($1, 'ENTRADA', $2, 'AJUSTE POR INCONSISTENCIA POS', $3)`,
                    [adj.producto_id, adj.cantidad, usuario_id]
                );
            }
        }

        // B. Registrar la Venta
        const nuevaVenta = await cliente.query(
            `INSERT INTO ventas 
            (usuario_id, metodo_pago, nro_voucher, total_neto, descuento_valor, total_final, estado) 
            VALUES ($1, $2, $3, $4, $5, $6, 'COMPLETADA') RETURNING id`,
            [usuario_id, metodo_pago, nro_voucher, total_neto, descuento_valor, total_final]
        );
        const ventaId = nuevaVenta.rows[0].id;

        // C. Procesar cada producto del carrito
        for (let prod of productos) {
            // 1. REGISTRAR DETALLE (¡Esto faltaba!)
            await cliente.query(
                `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [ventaId, prod.id, prod.cantidad, prod.precio, (prod.precio * prod.cantidad)]
            );

            // 2. DESCONTAR STOCK
            await cliente.query(
                "UPDATE productos SET stock_actual = stock_actual - $1 WHERE id = $2",
                [prod.cantidad, prod.id]
            );

            // 3. REGISTRAR MOVIMIENTO (Solo una vez)
            await cliente.query(
                `INSERT INTO movimientos (producto_id, tipo, cantidad, motivo, usuario_id, referencia_id) 
                 VALUES ($1, 'SALIDA', $2, 'VENTA POS', $3, $4)`,
                [prod.id, prod.cantidad, usuario_id, ventaId]
            );
        }

        await cliente.query('COMMIT');
        res.json({ mensaje: "Venta exitosa", ventaId });

    } catch (err) {
        await cliente.query('ROLLBACK');
        console.error("ERROR CRÍTICO VENTA:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        cliente.release();
    }
});

// --- 2. HISTORIAL ---
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

// --- 3. ANULAR VENTA ---
router.post('/anular/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Obtener detalles para devolver stock
        const detalles = await client.query(
            "SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = $1", 
            [id]
        );

        // 2. Devolver stock y registrar movimientos
        for (let item of detalles.rows) {
            await client.query(
                "UPDATE productos SET stock_actual = stock_actual + $1 WHERE id = $2",
                [item.cantidad, item.producto_id]
            );
            
            await client.query(
                `INSERT INTO movimientos (producto_id, tipo, cantidad, motivo, referencia_id) 
                 VALUES ($1, 'ENTRADA', $2, 'ANULACIÓN DE VENTA', $3)`,
                [item.producto_id, item.cantidad, id]
            );
        }

        // 3. Marcar como anulada
        await client.query("UPDATE ventas SET estado = 'ANULADA', total_final = 0 WHERE id = $1", [id]);

        await client.query('COMMIT');
        res.json({ mensaje: "Venta anulada y stock restaurado" });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error al anular:", err.message);
        res.status(500).send("Error al anular");
    } finally {
        client.release();
    }
});

module.exports = router;