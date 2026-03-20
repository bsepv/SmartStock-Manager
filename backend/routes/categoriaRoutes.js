const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/', async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        const nuevaCategoria = await pool.query(
            "INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2) RETURNING *",
            [nombre, descripcion]
        );
        res.json(nuevaCategoria.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Error en el servidor");
    }
});


router.get('/', async (req, res) => {
    try {
        const todasCategorias = await pool.query("SELECT * FROM categorias ORDER BY nombre ASC");
        res.json(todasCategorias.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Error al obtener categorías");
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params; 
        const categoria = await pool.query("SELECT * FROM categorias WHERE id = $1", [id]);

        if (categoria.rows.length === 0) {
            return res.status(404).json({ mensaje: "Categoría no encontrada" });
        }

        res.json(categoria.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Error en el servidor");
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;

        const categoriaActualizada = await pool.query(
            `UPDATE categorias
             SET nombre = $1, descripcion = $2
             WHERE id = $3
             RETURNING *`,
            [nombre, descripcion, id]
        );

        if (categoriaActualizada.rows.length === 0) {
            return res.status(404).json({ mensaje: "Categoría no encontrada" });
        }

        res.json(categoriaActualizada.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Error al actualizar categoría");
    }
});
module.exports = router;