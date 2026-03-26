import { useEffect, useState } from 'react';
import api from '../api/axios';
import { Package, LogOut, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Search, AlertTriangle } from "lucide-react";


const InventarioPage = () => {
    const [productos, setProductos] = useState([]);
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    //modal de nuevo producto
    const [categorias, setCategorias] = useState([]);
    const [nuevoProducto, setNuevoProducto] = useState({
        sku: '', nombre: '', stock_actual: 0, stock_minimo: 5,
        precio_compra: 0, precio_venta: 0, categoria_id: ''
    });
    //modal ingreso bodega
    const [listaIngreso, setListaIngreso] = useState([]);
    const [isIngresoOpen, setIsIngresoOpen] = useState(false);
    const [datosIngreso, setDatosIngreso] = useState({ sku: "" });

    //ingreo de bodega de producto inexistente
    const [skuNoExistente, setSkuNoExistente] = useState(null);
    //edicion de productos
    const [productoOriginal, setProductoOriginal] = useState(null);
    const [currentId, setCurrentId] = useState(null);
    const [isEditing, setIsEditing] = useState(null);

    //busqueda y filtro
    const [busqueda, setBusqueda] = useState('');
    const [filtroStockBajo, setFiltroStockBajo] = useState(false);

    //nueva categoria
    const [mostrarNuevaCategoria, setMostrarNuevaCategoria] = useState(false);
    const [nuevaCategoria, setNuevaCategoria] = useState({
        nombre: '',
        descripcion: ''
    });

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


    // Función para buscar y agregar a la lista de recepción
    const agregarAListaRecepcion = async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            try {
                const res = await api.get(`/productos/sku/${datosIngreso.sku}`);
                const producto = res.data;

                setListaIngreso(prev => {
                    const existe = prev.find(p => p.id === producto.id);
                    if (existe) {
                        return prev.map(p => p.id === producto.id
                            ? { ...p, cantidad: p.cantidad + 1 } : p);
                    }
                    return [...prev, { ...producto, cantidad: 1 }];
                });
                setDatosIngreso({ ...datosIngreso, sku: "" }); // Limpiar para el siguiente escaneo
            } catch (err) {
                if (window.confirm("Producto no encontrado. ¿Deseas crearlo?")) {
                    setSkuNoExistente({ sku: datosIngreso.sku, cantidad: 1 });
                    setIsIngresoOpen(false); 
                    setIsModalOpen(true);   
                }
            }
        }
    };
    const procesarCargaMasiva = async () => {
        try {
            await api.post('/productos/ingreso-masivo', { items: listaIngreso });
            alert("Inventario actualizado con éxito");
            setIsIngresoOpen(false);
            setListaIngreso([]);
            window.location.reload();
        } catch (err) {
            alert("Error al procesar la carga");
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

    const crearCategoriaRapida = async () => {
        const nombre = prompt("Nombre de la nueva categoría:");
        if (nombre) {
            try {
                const res = await api.post('/productos/categorias', { nombre });
                // 1. Refrescamos la lista de categorías del estado para que aparezca en el select
                setCategorias([...categorias, res.data]);
                // 2. La seleccionamos automáticamente para el producto actual
                setNuevoProducto({ ...nuevoProducto, categoria_id: res.data.id });
            } catch (err) {
                alert("Error al crear categoría");
            }
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <main className="p-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-700">Inventario Actual</h2>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsIngresoOpen(true)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors shadow-sm"
                        >
                            <Package className="w-5 h-5" />
                            Ingreso Bodega
                        </button>

                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-5 h-5" />
                            Nuevo Producto
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                    <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between border border-gray-100">
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

                        <div className="flex items-center gap-4">
                            <label className="inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={filtroStockBajo}
                                    onChange={() => setFiltroStockBajo(!filtroStockBajo)}
                                />

                                <div
                                    className="relative w-11 h-6 bg-gray-200 rounded-full peer 
                                peer-checked:bg-red-600 transition-colors"
                                >
                                    <div
                                        className="absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-all
                                    peer-checked:translate-x-[20px]"
                                    />
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
                                    onClick={() => prepararEdicion(prod)}
                                    className="cursor-pointer transition-colors hover:bg-blue-50 active:bg-blue-100"
                                    title="Clic para ver detalles o editar"
                                >
                                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{prod.sku}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{prod.nombre}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {prod.categoria_nombre || 'Sin categoría'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-bold ${prod.stock_actual <= prod.stock_minimo
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-green-100 text-green-700'
                                                }`}
                                        >
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
                                        className="w-full border p-2 rounded bg-gray-50 font-mono"
                                        value={nuevoProducto.sku}
                                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, sku: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Stock Inicial</label>
                                    <input
                                        autoFocus
                                        type="number"
                                        required
                                        className="w-full border p-2 rounded bg-gray-50"
                                        value={nuevoProducto.stock_actual}
                                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, stock_actual: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 flex justify-between items-center">
                                        <span>Categoría</span>
                                        {!mostrarNuevaCategoria && (
                                            <button
                                                type="button"
                                                onClick={() => setMostrarNuevaCategoria(true)}
                                                className="text-blue-600 hover:underline text-xs font-bold"
                                            >
                                                + Nueva Categoría
                                            </button>
                                        )}
                                    </label>

                                    <select
                                        className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
                                        value={nuevoProducto.categoria_id}
                                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, categoria_id: e.target.value })}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {categorias.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                        ))}
                                    </select>

                                    {mostrarNuevaCategoria && (
                                        <div className="mt-3 border rounded-xl p-4 bg-gray-50 space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Nombre</label>
                                                    <input
                                                        type="text"
                                                        className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
                                                        value={nuevaCategoria.nombre}
                                                        onChange={(e) =>
                                                            setNuevaCategoria({ ...nuevaCategoria, nombre: e.target.value })
                                                        }
                                                        placeholder="Nombre de la categoría"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Descripción</label>
                                                    <input
                                                        type="text"
                                                        className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
                                                        value={nuevaCategoria.descripcion}
                                                        onChange={(e) =>
                                                            setNuevaCategoria({ ...nuevaCategoria, descripcion: e.target.value })
                                                        }
                                                        placeholder="Descripción"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMostrarNuevaCategoria(false);
                                                        setNuevaCategoria({ nombre: '', descripcion: '' });
                                                    }}
                                                    className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                >
                                                    Cancelar
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        try {
                                                            const res = await api.post('/categorias', {
                                                                nombre: nuevaCategoria.nombre,
                                                                descripcion: nuevaCategoria.descripcion
                                                            });

                                                            setCategorias([...categorias, res.data]);

                                                            setNuevoProducto({
                                                                ...nuevoProducto,
                                                                categoria_id: res.data.id
                                                            });

                                                            setNuevaCategoria({ nombre: '', descripcion: '' });
                                                            setMostrarNuevaCategoria(false);
                                                        } catch (error) {
                                                            alert('Error al crear la categoría');
                                                        }
                                                    }}
                                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                                                >
                                                    Guardar categoría
                                                </button>
                                            </div>
                                        </div>
                                    )}
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
            {isIngresoOpen && (
                <div className="fixed inset-0 bg-blue-900 bg-opacity-40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-2xl border-t-4 border-green-500 max-h-[90vh] flex flex-col">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Plus className="text-green-600" /> Recepción de productos
                        </h2>

                        {/* Input de escaneo rápido */}
                        <div className="mb-4">
                            <input
                                type="text"
                                autoFocus
                                placeholder="Ingresa el codigo del producto..."
                                className="w-full border-2 border-green-200 p-4 rounded-lg focus:border-green-500 outline-none text-lg font-mono"
                                value={datosIngreso.sku}
                                onChange={(e) => setDatosIngreso({ ...datosIngreso, sku: e.target.value })}
                                onKeyDown={agregarAListaRecepcion}
                            />
                        </div>

                        {/* Tabla de pre-carga */}
                        <div className="flex-1 overflow-y-auto border rounded-lg mb-4">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="p-3 text-sm font-bold">Producto</th>
                                        <th className="p-3 text-sm font-bold w-24">Cantidad</th>
                                        <th className="p-3 text-sm font-bold w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {listaIngreso.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="p-3 text-sm">{item.nombre}</td>
                                            <td className="p-3">
                                                <input
                                                    type="number"
                                                    value={item.cantidad}
                                                    onChange={(e) => {
                                                        const nuevaCant = parseInt(e.target.value);
                                                        setListaIngreso(listaIngreso.map((p, i) => i === idx ? { ...p, cantidad: nuevaCant } : p));
                                                    }}
                                                    className="w-full border rounded p-1"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <button onClick={() => setListaIngreso(listaIngreso.filter((_, i) => i !== idx))} className="text-red-500">×</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => { setIsIngresoOpen(false); setListaIngreso([]); }} className="flex-1 py-3 text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button
                                onClick={procesarCargaMasiva}
                                disabled={listaIngreso.length === 0}
                                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-300"
                            >
                                Cargar {listaIngreso.reduce((acc, p) => acc + p.cantidad, 0)} Unidades
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default InventarioPage;