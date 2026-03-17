const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Registrar un nuevo usuario
router.post('/registro', async (req, res) => {
    try {
        const { nombre, username, password, rol } = req.body;

        // 2. Verificar si el username ya existe (la validación de analista)
        const usuarioExistente = await pool.query(
            "SELECT * FROM usuarios WHERE username = $1", 
            [username]
        );

        if (usuarioExistente.rows.length > 0) {
            return res.status(400).json({ mensaje: "El nombre de usuario ya está tomado" });
        }

        // 3. Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const nuevoUsuario = await pool.query(
            "INSERT INTO usuarios (nombre, username, password_hash, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, username, rol",
            [nombre, username, password_hash, rol || 'vendedor']
        );

        // 5. Responder con los datos (sin la contraseña)
        res.json(nuevoUsuario.rows[0]);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Error al registrar usuario");
    }
});

// Iniciar Sesión (Login)
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Buscar al usuario
        const usuario = await pool.query(
            "SELECT * FROM usuarios WHERE username = $1", 
            [username]
        );

        if (usuario.rows.length === 0) {
            return res.status(401).json({ mensaje: "Credenciales inválidas" });
        }

        // 2. Comparar la contraseña escrita con el hash de la DB
        // bcrypt.compare devuelve true o false
        const passwordCorrecta = await bcrypt.compare(password, usuario.rows[0].password_hash);

        if (!passwordCorrecta) {
            return res.status(401).json({ mensaje: "Credenciales inválidas" });
        }

        // 3. Crear el Token (JWT)
        // Guardamos el ID y el Rol dentro del token para usarlos después
        const token = jwt.sign(
            { id: usuario.rows[0].id, rol: usuario.rows[0].rol },
            process.env.JWT_SECRET || 'clave_secreta_temporal', // Usa una variable de entorno
            { expiresIn: '24h' } // El token expira en un día
        );

        // 4. Responder con los datos del usuario y su token
        res.json({
            token,
            usuario: {
                id: usuario.rows[0].id,
                nombre: usuario.rows[0].nombre,
                username: usuario.rows[0].username,
                rol: usuario.rows[0].rol
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Error en el login");
    }
});

module.exports = router;