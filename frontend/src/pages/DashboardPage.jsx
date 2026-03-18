import { useEffect, useState } from 'react';
import api from '../api/axios';
import { Package, LogOut, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
    const [productos, setProductos] = useState([]);
    const navigate = useNavigate();
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    const [isModalOpen, setIsModalOpen] = useState(false);
    //modal de nuevo producto
    const [categorias, setCategorias] = useState([]);
    const [nuevoProducto, setNuevoProducto] = useState({
        sku: '', nombre: '', stock_actual: 0, stock_minimo: 5,
        precio_compra: 0, precio_venta: 0, categoria_id: ''
    });
    //modal ingreso bodega
    const [isIngresoOpen, setIsIngresoOpen] = useState(false);
    const [datosIngreso, setDatosIngreso] = useState({ sku: '', cantidad: 1 });
    //ingreo de bodega de producto inexistente
    const [skuNoExistente, setSkuNoExistente] = useState(null);

    useEffect(() => {
        const fetchProductos = async () => {
            try {
                const res = await api.get('/productos');
                setProductos(res.data);
            } catch (err) {
                console.error("Error al cargar productos", err);
            }
        };
        fetchProductos();
    }, []);

    // Cargar categorías al iniciar
    useEffect(() => {
        const fetchCategorias = async () => {
            const res = await api.get('/categorias');
            setCategorias(res.data);
        };
        fetchCategorias();
    }, []);

    // Añade este useEffect en DashboardPage.jsx
    useEffect(() => {
        // Si el modal de Nuevo Producto se abre Y tenemos un SKU pendiente
        if (isModalOpen && skuNoExistente) {
            setNuevoProducto({
                ...nuevoProducto, // Mantenemos valores por defecto (como stock_minimo: 5)
                sku: skuNoExistente.sku,
                stock_actual: skuNoExistente.cantidad // ¡Aquí asignamos el stock ingresado!
            });
        }

        // IMPORTANTE: Limpiar el SKU pendiente al cerrar el modal
        if (!isModalOpen) {
            setSkuNoExistente(null);
            // Opcional: Resetear nuevoProducto a su estado inicial vacío
        }
    }, [isModalOpen, skuNoExistente]);

    // Función para guardar
    const guardarProducto = async (e) => {
        e.preventDefault();
        try {
            await api.post('/productos', nuevoProducto);
            setIsModalOpen(false); // Cerramos el modal
            // Recargamos la lista de productos (puedes llamar a tu función fetchProductos aquí)
            window.location.reload();
        } catch (err) {
            alert("Error al guardar: " + err.response.data.mensaje);
        }
    };

    //funcion para enviar el ingreso de bodega

    const manejarIngresoBodega = async (e) => {
        e.preventDefault();
        try {
            // Intentamos actualizar el stock del SKU
            await api.put('/productos/ingreso-bodega', datosIngreso);

            // Si tiene éxito, cerramos y recargamos
            setIsIngresoOpen(false);
            setDatosIngreso({ sku: '', cantidad: 1 });
            window.location.reload();

        } catch (err) {
            if (err.response && err.response.status === 404) {
                // El producto no existe.
                const quiereRegistrar = window.confirm(
                    `El SKU "${datosIngreso.sku}" no existe. ¿Deseas registrarlo ahora con un stock inicial de ${datosIngreso.cantidad}?`
                );

                if (quiereRegistrar) {
                    // 1. Guardamos los datos temporalmente
                    setSkuNoExistente({
                        sku: datosIngreso.sku,
                        cantidad: datosIngreso.cantidad
                    });

                    // 2. Cerramos el modal de Ingreso
                    setIsIngresoOpen(false);
                    setDatosIngreso({ sku: '', cantidad: 1 }); // Limpiamos el form de ingreso

                    // 3. Abrimos el modal de Nuevo Producto
                    setIsModalOpen(true);
                }
            } else {
                // Otro tipo de error (ej: servidor caído)
                alert("Error: " + (err.response?.data?.mensaje || "Problema de conexión"));
            }
        }
    };
    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Navbar superior */}
            <nav className="bg-white shadow-sm px-8 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Package className="text-blue-600" />
                    <h1 className="text-xl font-bold text-gray-800">SmartStock-Manager</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">Hola, <b>{usuario?.nombre}</b></span>
                    <button onClick={handleLogout} className="text-gray-500 hover:text-red-600 transition-colors">
                        <LogOut size={20} />
                    </button>
                </div>
            </nav>

            <main className="p-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-700">Inventario Actual</h2>

                    <div className="flex gap-3">
                        {/* NUEVO BOTÓN: INGRESO DE BODEGA */}
                        <button
                            onClick={() => setIsIngresoOpen(true)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors shadow-sm"
                        >
                            <Package className="w-5 h-5" />
                            Ingreso Bodega
                        </button>

                        {/* BOTÓN EXISTENTE: NUEVO PRODUCTO */}
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-5 h-5" />
                            Nuevo Producto
                        </button>
                    </div>
                </div>

                {/* Tabla de Productos */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">SKU</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Producto</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Categoría</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-center">Stock</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">Precio Venta</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {productos.map((prod) => (
                                <tr key={prod.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{prod.sku}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{prod.nombre}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{prod.categoria_nombre || 'Sin categoría'}</td>
                                    <td className="px-6 py-4 text-sm text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${prod.stock_actual <= prod.stock_minimo ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {prod.stock_actual}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                                        ${new Intl.NumberFormat('es-CL').format(prod.precio_venta)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Registrar Nuevo Producto</h2>

                        <form onSubmit={guardarProducto} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Nombre del Producto</label>
                                    <input type="text" required className="w-full border p-2 rounded"
                                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">SKU (Código)</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border p-2 rounded bg-gray-50 font-mono" // bg-gray-50 para indicar que está pre-llenado
                                        value={nuevoProducto.sku} // Vinculamos al estado
                                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, sku: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Stock Inicial</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full border p-2 rounded bg-gray-50" // bg-gray-50 para indicar que está pre-llenado
                                        value={nuevoProducto.stock_actual} // Vinculamos al estado
                                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, stock_actual: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Categoría</label>
                                    <select required className="w-full border p-2 rounded"
                                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, categoria_id: e.target.value })}>
                                        <option value="">Selecciona...</option>
                                        {categorias.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Precio Compra</label>
                                    <input type="number" className="w-full border p-2 rounded"
                                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, precio_compra: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Precio Venta</label>
                                    <input type="number" className="w-full border p-2 rounded"
                                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, precio_venta: parseInt(e.target.value) })} />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
                                <button type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar Producto</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {isIngresoOpen && (
                <div className="fixed inset-0 bg-blue-900 bg-opacity-40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-8 max-w-sm w-full shadow-2xl border-t-4 border-green-500">
                        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                            <Plus className="text-green-600" /> Ingreso de Bodega
                        </h2>
                        <p className="text-sm text-gray-500 mb-6">Escanea el código o digita el SKU</p>

                        <form onSubmit={manejarIngresoBodega} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">SKU del Producto</label>
                                <input
                                    type="text"
                                    autoFocus
                                    required
                                    className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-green-500 outline-none text-lg font-mono"
                                    placeholder="Pistolear aquí..."
                                    value={datosIngreso.sku}
                                    onChange={(e) => setDatosIngreso({ ...datosIngreso, sku: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cantidad que ingresa</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-green-500 outline-none text-lg"
                                    value={datosIngreso.cantidad}
                                    onChange={(e) => setDatosIngreso({ ...datosIngreso, cantidad: parseInt(e.target.value) })}
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setIsIngresoOpen(false)}
                                    className="flex-1 py-3 text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                <button type="submit"
                                    className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700">
                                    Cargar Stock
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;