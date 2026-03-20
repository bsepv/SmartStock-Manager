import { useEffect, useState } from 'react';
import api from '../api/axios';
import { Package, List, Clock, AlertTriangle, History, PlusCircle, X } from 'lucide-react';

const PanelControlPage = () => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null); // Nuevo: Para capturar errores
    const [mostrarGestionCategorias, setMostrarGestionCategorias] = useState(false);
    const [categorias, setCategorias] = useState([]);
    const [mostrarFormularioCategoria, setMostrarFormularioCategoria] = useState(false);
    const [nuevaCatNombre, setNuevaCatNombre] = useState('');
    const [nuevaCatDescripcion, setNuevaCatDescripcion] = useState('');

    const [editandoCategoria, setEditandoCategoria] = useState(null);

    const abrirGestionCategorias = async () => {
        try {
            const res = await api.get('/categorias');
            setCategorias(res.data);
            setMostrarGestionCategorias(true);
        } catch (err) {
            alert("Error al cargar categorías");
        }
    };

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                // Asegúrate que esta ruta sea EXACTAMENTE la que definiste en el backend
                const res = await api.get('/productos/panelcontrol/resumen');
                console.log("Datos recibidos:", res.data); // Ver en consola F12
                setData(res.data);
            } catch (err) {
                console.error("Error en la petición:", err);
                setError(err.message); // Si falla, guardamos el mensaje
            }
        };
        cargarDatos();
    }, []);

    // Si hay error, mostrarlo
    if (error) return (
        <div className="p-10 text-center text-red-500">
            <h2 className="font-bold">Error al cargar el Panel</h2>
            <p>{error}</p>
            <p className="text-sm text-gray-500">Revisa si la ruta /productos/panelcontrol/resumen existe en el backend.</p>
        </div>
    );

    // Mientras carga
    if (!data) return <div className="p-10 text-center text-gray-500">Cargando resumen de inventario...</div>;

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-8">Resumen General</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <CardItem
                    label="Total Productos"
                    valor={data.cards?.total_productos || 0}
                    icon={<Package className="text-blue-600" />}
                    bg="bg-blue-50"
                />
                <div onClick={abrirGestionCategorias} className="cursor-pointer transition-all active:scale-95">
                    <CardItem
                        label="Total Categorías"
                        valor={data.cards?.total_categorias || 0}
                        icon={<List className="text-orange-600" />}
                        bg="bg-orange-50"
                    />
                </div>
                <CardItem
                    label="Último Ingreso"
                    valor={data.cards?.ultimo_ingreso ? new Date(data.cards.ultimo_ingreso).toLocaleDateString('es-CL') : 'Sin datos'}
                    icon={<Clock className="text-green-600" />}
                    bg="bg-green-50"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="flex items-center gap-2 font-bold text-red-600 mb-4"><AlertTriangle size={20} /> Críticos (Menor Stock)</h3>
                    <MiniTabla
                        headers={['Producto', 'Stock actual']}
                        rows={data.stockBajo?.map(p => [p.nombre, <span className="font-bold">{p.stock_actual}</span>]) || []}
                    />
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="flex items-center gap-2 font-bold text-blue-600 mb-4"><PlusCircle size={20} /> Recién Añadidos</h3>
                    <MiniTabla
                        headers={['Producto', 'Fecha']}
                        rows={data.recientes?.map(p => [p.nombre, new Date(p.creado_en).toLocaleDateString('es-CL')]) || []}
                    />
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                    <h3 className="flex items-center gap-2 font-bold text-gray-700 mb-4"><History size={20} /> Últimos Movimientos</h3>
                    <MiniTabla
                        headers={['Acción', 'Producto', 'Usuario', 'Fecha']}
                        rows={data.movimientos?.map(m => [
                            <span key={m.fecha} className={`text-xs font-bold px-2 py-1 rounded ${m.tipo === 'INGRESO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{m.tipo}</span>,
                            m.producto,
                            m.usuario,
                            new Date(m.fecha).toLocaleString('es-CL')
                        ]) || []}
                    />
                </div>
            </div>

            {mostrarGestionCategorias && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Gestionar categorías</h2>
                            <button
                                onClick={() => {
                                    setMostrarGestionCategorias(false);
                                    setMostrarFormularioCategoria(false);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {mostrarGestionCategorias && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                                <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-bold text-gray-800">Gestionar categorías</h2>
                                        <button
                                            onClick={() => {
                                                setMostrarGestionCategorias(false);
                                                setMostrarFormularioCategoria(false);
                                                setEditandoCategoria(null);
                                                setNuevaCatNombre('');
                                                setNuevaCatDescripcion('');
                                            }}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>

                                    {mostrarFormularioCategoria && (
                                        <form
                                            onSubmit={async (e) => {
                                                e.preventDefault();
                                                try {
                                                    if (editandoCategoria) {
                                                        const res = await api.put(`/categorias/${editandoCategoria.id}`, {
                                                            nombre: nuevaCatNombre,
                                                            descripcion: nuevaCatDescripcion
                                                        });

                                                        setCategorias(categorias.map(cat =>
                                                            cat.id === editandoCategoria.id ? res.data : cat
                                                        ));
                                                    } else {
                                                        const res = await api.post('/categorias', {
                                                            nombre: nuevaCatNombre,
                                                            descripcion: nuevaCatDescripcion
                                                        });

                                                        setCategorias([...categorias, res.data]);

                                                        setData(prev => ({
                                                            ...prev,
                                                            cards: {
                                                                ...prev.cards,
                                                                total_categorias: parseInt(prev.cards.total_categorias) + 1
                                                            }
                                                        }));
                                                    }

                                                    setNuevaCatNombre('');
                                                    setNuevaCatDescripcion('');
                                                    setMostrarFormularioCategoria(false);
                                                    setEditandoCategoria(null);
                                                } catch (err) {
                                                    alert(editandoCategoria ? "Error al editar categoría" : "Error al crear categoría");
                                                }
                                            }}
                                            className="mb-4 bg-gray-50 border rounded-xl p-4 flex flex-col gap-4"
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <input
                                                    type="text"
                                                    placeholder="Nombre de la categoría"
                                                    className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500"
                                                    value={nuevaCatNombre}
                                                    onChange={(e) => setNuevaCatNombre(e.target.value)}
                                                    required
                                                />

                                                <input
                                                    type="text"
                                                    placeholder="Descripción"
                                                    className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500"
                                                    value={nuevaCatDescripcion}
                                                    onChange={(e) => setNuevaCatDescripcion(e.target.value)}
                                                    required
                                                />
                                            </div>

                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMostrarFormularioCategoria(false);
                                                        setNuevaCatNombre('');
                                                        setNuevaCatDescripcion('');
                                                        setEditandoCategoria(null);
                                                    }}
                                                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300"
                                                >
                                                    Cancelar
                                                </button>

                                                <button
                                                    type="submit"
                                                    className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-700"
                                                >
                                                    {editandoCategoria ? 'Guardar cambios' : 'Guardar categoría'}
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    <div className="flex-1 overflow-y-auto border-t pt-4 pr-2">
                                        {categorias.length > 0 ? (
                                            categorias.map((cat) => (
                                                <div
                                                    key={cat.id}
                                                    onClick={() => {
                                                        setEditandoCategoria(cat);
                                                        setNuevaCatNombre(cat.nombre || '');
                                                        setNuevaCatDescripcion(cat.descripcion || '');
                                                        setMostrarFormularioCategoria(true);
                                                    }}
                                                    className="p-3 border-b last:border-0 flex flex-col cursor-pointer hover:bg-orange-50 rounded-lg transition"
                                                >
                                                    <span className="font-semibold text-gray-800">{cat.nombre}</span>
                                                    <span className="text-sm text-gray-500">
                                                        {cat.descripcion || 'Sin descripción'}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-500 text-center py-4">No hay categorías registradas.</p>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t mt-4 flex justify-center">
                                        {!mostrarFormularioCategoria && (
                                            <button
                                                onClick={() => {
                                                    setEditandoCategoria(null);
                                                    setNuevaCatNombre('');
                                                    setNuevaCatDescripcion('');
                                                    setMostrarFormularioCategoria(true);
                                                }}
                                                className="bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-orange-700"
                                            >
                                                Añadir categoría
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto border-t pt-4 pr-2">
                            {categorias.length > 0 ? (
                                categorias.map((cat) => (
                                    <div
                                        key={cat.id}
                                        className="p-3 border-b last:border-0 flex flex-col"
                                    >
                                        <span className="font-semibold text-gray-800">{cat.nombre}</span>
                                        <span className="text-sm text-gray-500">
                                            {cat.descripcion || 'Sin descripción'}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-4">No hay categorías registradas.</p>
                            )}
                        </div>

                        <div className="pt-4 border-t mt-4 flex justify-center">
                            {!mostrarFormularioCategoria && (
                                <button
                                    onClick={() => setMostrarFormularioCategoria(true)}
                                    className="bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-orange-700"
                                >
                                    Añadir categoría
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CardItem = ({ label, valor, icon, bg }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center gap-4 border border-gray-100">
        <div className={`p-4 rounded-xl ${bg}`}>{icon}</div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            <p className="text-2xl font-bold text-gray-800">{valor}</p>
        </div>
    </div>
);

const MiniTabla = ({ headers, rows }) => (
    <table className="w-full text-left text-sm">
        <thead>
            <tr className="text-gray-400 border-b border-gray-50">
                {headers.map(h => <th key={h} className="pb-2 font-medium">{h}</th>)}
            </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
            {rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                    {row.map((cell, j) => <td key={j} className="py-3 text-gray-700">{cell}</td>)}
                </tr>
            ))}
        </tbody>
    </table>
);

export default PanelControlPage;