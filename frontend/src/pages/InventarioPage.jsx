import { useEffect, useState } from 'react';
import api from '../api/axios';
import { Package, LogOut, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Search, AlertTriangle } from "lucide-react";

const InventarioPage = () => {
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
    //edicion de productos
    const [productoOriginal, setProductoOriginal] = useState(null);
    const [currentId, setCurrentId] = useState(null);
    const [isEditing, setIsEditing] = useState(null);

    //busqueda y filtro
    const [busqueda, setBusqueda] = useState('');
    const [filtroStockBajo, setFiltroStockBajo] = useState(false);

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
    //funcion de editar productos 
    const prepararEdicion = (prod) => {
        setCurrentId(prod.id);
        const datos = {
            sku: prod.sku,
            nombre: prod.nombre,
            stock_actual: prod.stock_actual,
            stock_minimo: prod.stock_minimo,
            precio_compra: prod.precio_compra,
            precio_venta: prod.precio_venta,
            categoria_id: prod.categoria_id
        };
        setNuevoProducto(datos);
        setProductoOriginal(datos);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    // Función para verificar si hubo cambios
    const tieneCambios = () => {
        return JSON.stringify(nuevoProducto) !== JSON.stringify(productoOriginal);
    };

    const confirmarEliminar = async (id, nombre) => {
        if (window.confirm(`¿Estás segura de eliminar "${nombre}"? Esta acción no se puede deshacer.`)) {
            try {
                await api.delete(`/productos/${id}`);
                window.location.reload();
            } catch (err) {
                alert("No se pudo eliminar el producto.");
            }
        }
    };

    // Función para guardar
    const guardarProducto = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/productos/${currentId}`, nuevoProducto);
            } else {
                await api.post('/productos', nuevoProducto);
            }
            setIsModalOpen(false);
            setIsEditing(false);
            window.location.reload();
        } catch (err) {
            alert("Error al procesar la solicitud");
        }
    };

    const productosFiltrados = productos.filter(prod => {
        // 1. Filtro por Texto (Nombre, SKU o Categoría)
        const coincideBusqueda =
            prod.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            prod.sku.toLowerCase().includes(busqueda.toLowerCase()) ||
            (prod.categoria_nombre && prod.categoria_nombre.toLowerCase().includes(busqueda.toLowerCase()));

        // 2. Filtro por Stock Bajo (solo si el switch está activo)
        const coincideStock = filtroStockBajo
            ? prod.stock_actual <= prod.stock_minimo
            : true;

        return coincideBusqueda && coincideStock;
    });

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
                    <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between border border-gray-100">

                        {/* Buscador de Texto */}
                        <div className="relative w-full md:w-96">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                <Search size={18} />
                            </span>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                                placeholder="Buscar por nombre, SKU o categoría..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                        </div>

                        {/* Filtros Rápidos */}
                        <div className="flex items-center gap-4">
                            <label className="inline-flex items-center cursor-pointer">

                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={filtroStockBajo}
                                    onChange={() => setFiltroStockBajo(!filtroStockBajo)}
                                />

                                <div className="relative w-11 h-6 bg-gray-200 rounded-full peer 
      peer-checked:bg-red-600 transition-colors"
                                >
                                    <div className="absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-all
        peer-checked:translate-x-[20px]">
                                    </div>
                                </div>

                                <span className="ml-3 text-sm font-medium text-gray-700 flex items-center gap-1">
                                    <AlertTriangle
                                        size={16}
                                        className={filtroStockBajo ? 'text-red-600' : 'text-gray-400'}
                                    />
                                    Stock Crítico
                                </span>

                            </label>
                        </div>
                    </div>
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

                            {productosFiltrados.map((prod) => (
                                <tr
                                    key={prod.id}
                                    onDoubleClick={() => {
                                        console.log("doble click", prod);
                                        prepararEdicion(prod);
                                    }}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    title="Doble clic para ver detalles o editar"
                                >
                                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{prod.sku}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{prod.nombre}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{prod.categoria_nombre || 'Sin categoría'}</td>
                                    <td className="px-6 py-4 text-sm text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${prod.stock_actual <= prod.stock_minimo
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-green-100 text-green-700'
                                            }`}>
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
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                    onClick={() => { setIsModalOpen(false); setIsEditing(false); }}
                >
                    <div
                        className="bg-white rounded-xl p-8 max-w-lg w-full shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >

                        {/* ✅ BOTÓN X */}
                        <button
                            onClick={() => { setIsModalOpen(false); setIsEditing(false); }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>


                        <h2 className="text-2xl font-bold mb-6 text-gray-800">
                            {isEditing ? 'Detalles del Producto' : 'Nuevo Producto'}
                        </h2>

                        <form onSubmit={guardarProducto} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Nombre</label>
                                    <input
                                        autoFocus
                                        type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={nuevoProducto.nombre}
                                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">SKU (Código)</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        disabled={isEditing}
                                        required
                                        className="w-full border p-2 rounded bg-gray-50 font-mono" // bg-gray-50 para indicar que está pre-llenado
                                        value={nuevoProducto.sku} // Vinculamos al estado
                                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, sku: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Stock Inicial</label>
                                    <input
                                        autoFocus
                                        type="number"
                                        required
                                        className="w-full border p-2 rounded bg-gray-50" // bg-gray-50 para indicar que está pre-llenado
                                        value={nuevoProducto.stock_actual} // Vinculamos al estado
                                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, stock_actual: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Categoría</label>
                                    <select
                                        required
                                        className="w-full border p-2 rounded"
                                        value={nuevoProducto.categoria_id}
                                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, categoria_id: e.target.value })}
                                    >
                                        <option value="">Selecciona...</option>
                                        {categorias.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Precio Compra</label>
                                    <input
                                        type="number"
                                        className="w-full border p-2 rounded"
                                        value={nuevoProducto.precio_compra || ''}
                                        onChange={(e) =>
                                            setNuevoProducto({
                                                ...nuevoProducto,
                                                precio_compra: Number(e.target.value)
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Precio Venta</label>
                                    <input
                                        type="number"
                                        className="w-full border p-2 rounded"
                                        value={nuevoProducto.precio_venta || ''}
                                        onChange={(e) =>
                                            setNuevoProducto({
                                                ...nuevoProducto,
                                                precio_venta: Number(e.target.value)
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-8 pt-4 border-t">
                                {/* Botón Eliminar (Solo aparece si estamos editando) */}
                                {isEditing ? (
                                    <button
                                        type="button"
                                        onClick={() => confirmarEliminar(currentId, nuevoProducto.nombre)}
                                        className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} /> Eliminar
                                    </button>
                                ) : <div></div>}

                                <div className="flex gap-3">

                                    <button
                                        type="submit"
                                        disabled={isEditing && !tieneCambios()}
                                        className={`px-6 py-2 rounded-lg font-medium text-white transition-all ${isEditing && !tieneCambios()
                                            ? 'bg-gray-300 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700 shadow-md'
                                            }`}
                                    >
                                        {isEditing ? 'Guardar Cambios' : 'Crear Producto'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>


            )}
            {
                isIngresoOpen && (
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
                )
            }
        </div >
    );
};

export default InventarioPage;