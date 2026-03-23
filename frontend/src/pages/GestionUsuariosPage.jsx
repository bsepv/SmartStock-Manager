import { useState, useEffect } from 'react';
import api from '../api/axios';
import { UserPlus, Users, Trash2, X, Save, Edit3, UserCheck, UserMinus } from 'lucide-react';

const GestionUsuariosPage = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [form, setForm] = useState({ nombre: '', username: '', password: '', email: '', rol: 'vendedor' });
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [cambioDetectado, setCambioDetectado] = useState(false);

    const obtenerUsuarios = async () => {
        try {
            const res = await api.get('/usuarios/lista');
            setUsuarios(res.data);
        } catch (err) { console.error("Error cargando usuarios"); }
    };

    useEffect(() => { obtenerUsuarios(); }, []);

    // Detectar si hay cambios en el modal de edición
    useEffect(() => {
        if (usuarioSeleccionado) {
            const hayCambios = JSON.stringify(usuarioSeleccionado) !== JSON.stringify(editForm);
            setCambioDetectado(hayCambios);
        }
    }, [editForm, usuarioSeleccionado]);

    const handleCrear = async (e) => {
        e.preventDefault();
        try {
            await api.post('/usuarios/registro', form);
            setForm({ nombre: '', username: '', password: '', email: '', rol: 'vendedor' });
            obtenerUsuarios();
        } catch (err) { alert(err.response?.data?.mensaje || "Error"); }
    };

    const abrirModal = (u) => {
        setUsuarioSeleccionado(u);
        setEditForm({ ...u, password: '' }); // Password vacío por seguridad
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* LADO IZQUIERDO: LISTA DE USUARIOS (2/3 del ancho) */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-white">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                                <Users className="text-indigo-600" /> Personal del Sistema
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-400 text-xs uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Usuario</th>
                                        <th className="px-6 py-4">Email</th>
                                        <th className="px-6 py-4">Rol</th>
                                        <th className="px-6 py-4 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {usuarios.map((u) => (
                                        <tr 
                                            key={u.id} 
                                            onClick={() => abrirModal(u)}
                                            className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-700 group-hover:text-indigo-600">{u.nombre}</p>
                                                <p className="text-xs text-gray-400">@{u.username}</p>
                                            </td>
                                            <td className="px-6 py-4 text-sm">{u.email}</td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${u.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {u.rol.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="w-2 h-2 bg-green-500 rounded-full mx-auto shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* LADO DERECHO: FORMULARIO DE CREACIÓN (1/3 del ancho) */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-t-4 border-t-indigo-500">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <UserPlus size={20} className="text-indigo-600" /> Registrar Nuevo
                        </h2>
                        <form onSubmit={handleCrear} className="space-y-4" autoComplete="off">
                            <Input label="Nombre Completo" name="nombre" value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} />
                            <Input label="Username" name="username" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} />
                            <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                            <Input label="Password Temporal" name="password" type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} />
                            
                            <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95">
                                Crear Acceso
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* MODAL DE EDICIÓN / VER DETALLE */}
            {usuarioSeleccionado && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500"></div>
                        <button onClick={() => setUsuarioSeleccionado(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>

                        <h2 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
                            <Edit3 size={24} className="text-indigo-500" /> Perfil de Usuario
                        </h2>
                        <p className="text-sm text-gray-400 mb-6 font-medium uppercase tracking-wider">Detalles Administrativos</p>

                        <div className="space-y-4">
                            <Input label="Nombre" value={editForm.nombre} onChange={(e) => setEditForm({...editForm, nombre: e.target.value})} />
                            <Input label="Email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} />
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Cambiar Contraseña (Opcional)</label>
                                <input 
                                    type="password" 
                                    placeholder="Dejar vacío para mantener actual"
                                    className="w-full mt-1 p-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                                />
                            </div>
                            
                            <div className="pt-4 flex flex-col gap-3">
                                <button 
                                    disabled={!cambioDetectado}
                                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${cambioDetectado ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                >
                                    <Save size={18} /> Guardar Cambios
                                </button>
                                <button className="w-full py-3 border-2 border-red-50 text-red-500 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                                    <UserMinus size={18} /> Desactivar Usuario
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Componente pequeño para los Inputs
const Input = ({ label, ...props }) => (
    <div>
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
        <input {...props} className="w-full mt-1 p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-700" />
    </div>
);

export default GestionUsuariosPage;