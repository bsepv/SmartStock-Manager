const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Modificamos el Registro para que sea la "Creación de Usuarios"
router.post('/registro', async (req, res) => {
    try {
        // Añadimos email a la desestructuración
        const { nombre, username, password, email, rol } = req.body;

        // Validamos si el username O el email ya existen
        const usuarioExistente = await pool.query(
            "SELECT * FROM usuarios WHERE username = $1 OR email = $2",
            [username, email]
        );

        if (usuarioExistente.rows.length > 0) {
            return res.status(400).json({
                mensaje: "El nombre de usuario o el correo ya están registrados"
            });
        }

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insertar incluyendo el campo email
        const nuevoUsuario = await pool.query(
            "INSERT INTO usuarios (nombre, username, password_hash, email, rol) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, username, email, rol",
            [nombre, username, password_hash, email, rol || 'vendedor']
        );

        res.json(nuevoUsuario.rows[0]);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Error al registrar usuario");
    }
});

// 2. Login (Se mantiene igual, pero es bueno que devuelva el email también)
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const usuario = await pool.query(
            "SELECT * FROM usuarios WHERE username = $1",
            [username]
        );

        if (usuario.rows.length === 0) {
            return res.status(401).json({ mensaje: "Credenciales inválidas" });
        }

        const passwordCorrecta = await bcrypt.compare(password, usuario.rows[0].password_hash);

        if (!passwordCorrecta) {
            return res.status(401).json({ mensaje: "Credenciales inválidas" });
        }

        const token = jwt.sign(
            { id: usuario.rows[0].id, rol: usuario.rows[0].rol },
            process.env.JWT_SECRET || 'clave_secreta_temporal',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            usuario: {
                id: usuario.rows[0].id,
                nombre: usuario.rows[0].nombre,
                username: usuario.rows[0].username,
                email: usuario.rows[0].email, // Añadido
                rol: usuario.rows[0].rol
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Error en el login");
    }
});
router.get('/lista', async (req, res) => {
    try {
        const usuarios = await pool.query(
            "SELECT id, nombre, username, email, rol FROM usuarios ORDER BY id DESC"
        );
        res.json(usuarios.rows);
    } catch (err) {
        res.status(500).send("Error al obtener usuarios");
    }
});

// Actualizar Usuario (Para el Modal de Edición)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, email, password, rol } = req.body;

    try {
        let consulta;
        let valores;

        if (password && password.trim() !== "") {
            // Si el Admin escribió una nueva contraseña, la encriptamos
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);
            consulta = "UPDATE usuarios SET nombre = $1, email = $2, password_hash = $3, rol = $4 WHERE id = $5";
            valores = [nombre, email, password_hash, rol, id];
        } else {
            // Si no escribió contraseña, solo actualizamos los datos básicos
            consulta = "UPDATE usuarios SET nombre = $1, email = $2, rol = $3 WHERE id = $4";
            valores = [nombre, email, rol, id];
        }

        await pool.query(consulta, valores);
        res.json({ mensaje: "Usuario actualizado con éxito" });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ mensaje: "Error al actualizar" });
    }
});

// 3. Recuperar Password (Ya usa el email, así que está perfecto)
router.post('/recuperar-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await pool.query("SELECT id FROM usuarios WHERE email = $1", [email]);

        if (user.rows.length > 0) {
            console.log(`Solicitud de recuperación para: ${email}`);
        }

        res.json({ mensaje: "Si el correo existe, se ha enviado un enlace." });
    } catch (err) {
        res.status(500).send("Error en el servidor");
    }
});

module.exports = router;