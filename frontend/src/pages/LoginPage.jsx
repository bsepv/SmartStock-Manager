import { useState } from 'react';
import api from '../api/axios'; 
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(''); // Para mostrar el mensaje de "Credenciales inválidas"
    const navigate = useNavigate();
    // 2. Función que se ejecuta al hacer clic en "Entrar"
    const handleLogin = async (e) => {
        e.preventDefault(); 
        setError(''); 

        try {
            // Enviamos los datos al backend (la ruta que hiciste ayer)
            const respuesta = await api.post('/usuarios/login', { username, password });

            // Si el backend dice OK, recibimos el token y los datos del usuario
            console.log('Login exitoso:', respuesta.data);

            // Guardamos el token en el navegador (Local Storage) para futuras peticiones
            localStorage.setItem('token', respuesta.data.token);
            localStorage.setItem('usuario', JSON.stringify(respuesta.data.usuario));

            navigate('/dashboard');

        } catch (err) {
            // Si el backend da error (401), mostramos el mensaje
            if (err.response && err.response.data) {
                setError(err.response.data.mensaje);
            } else {
                setError('Error de conexión con el servidor');
            }
        }
    };
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
                <form onSubmit={handleLogin}>
                    

                    <h1 className="text-2xl font-bold text-center">
                        SmartStock-Manager
                    </h1>
                    <p className="text-center text-gray-500 mb-6">
                        Sistema de Gestión de Inventario
                    </p>
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                            <span className="text-red-600">⚠️</span>
                            <p className="text-sm text-red-600 font-medium">
                                {error}
                            </p>
                        </div>
                    )}

                    {/* Usuario */}
                    <div className="mb-4">
                        <label className="text-sm font-medium">
                            Nombre de usuario
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full mt-1 p-3 rounded-lg bg-gray-100"
                            placeholder="usuarioVazques"
                        />
                    </div>

                    {/* Password */}
                    <div className="mb-4">
                        <label className="text-sm font-medium">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full mt-1 p-3 rounded-lg bg-gray-100"
                            placeholder="••••••••"
                        />
                    </div>

                    {/* Opciones */}
                    <div className="flex justify-between items-center mb-4">
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                            <input type="checkbox" />
                            Recordarme
                        </label>

                        <button className="text-indigo-600 text-sm">
                            ¿Olvidaste tu contraseña?
                        </button>
                    </div>

                    {/* Botón */}
                    <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700"
                    >
                        Iniciar Sesión
                    </button>

                    {/* Registro */}
                    <p className="text-center text-sm text-gray-600 mt-4">
                        ¿No tienes una cuenta?{" "}
                        <span className="text-indigo-600 cursor-pointer">
                            Regístrate aquí
                        </span>
                    </p>
                </form>
            </div>
        </div>
    );
};
export default LoginPage;