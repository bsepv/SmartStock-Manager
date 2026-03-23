import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { ShoppingCart, Barcode, Trash2, CreditCard, Banknote, Receipt } from 'lucide-react';

const PuntoVentaPage = () => {
    const [carrito, setCarrito] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [metodoPago, setMetodoPago] = useState("Efectivo");
    const [voucher, setVoucher] = useState("");
    const [efectivoRecibido, setEfectivoRecibido] = useState(0);
    const [descuento, setDescuento] = useState({ tipo: '%', valor: 0 });
    
    const inputRef = useRef(null); // Para mantener el foco en el pistoleo

    // 1. Lógica de Pistoleo (Simulación)
    const manejarEscaneo = async (e) => {
        if (e.key === 'Enter') {
            try {
                // Buscamos el producto por código de barras en el backend
                const res = await api.get(`/productos/sku/${busqueda.trim()}`);
                if (res.data) {
                    agregarAlCarrito(res.data);
                }
                setBusqueda(""); // Limpiamos para el siguiente pistoleo
            } catch (err) {
                alert("Producto no encontrado");
                setBusqueda("");
            }
        }
    };

    const agregarAlCarrito = (producto) => {
    if (producto.stock_actual <= 0) {
        const confirmar = window.confirm(
            `INCONSISTENCIA DE INVENTARIO: El producto "${producto.nombre}" tiene stock 0 en sistema pero existe físicamente. ¿Deseas realizar un ajuste de entrada automático para venderlo?`
        );
        
        if (confirmar) {
            // Marcamos que este producto necesitará un ajuste previo en el backend
            setAjustesPendientes(prev => [...prev, { producto_id: producto.id, cantidad: 1 }]);
            // Lo añadimos al carrito normalmente
        } else {
            return; // No se añade
        }
    }
        setCarrito(prev => {
            const existe = prev.find(item => item.id === producto.id);
            if (existe) {
                return prev.map(item => item.id === producto.id 
                    ? { ...item, cantidad: item.cantidad + 1 } : item);
            }
            return [...prev, { ...producto, cantidad: 1 }];
        });
    };

    // 2. Cálculos Financieros
    const subtotal = carrito.reduce((acc, item) => acc + (item.precio_venta * item.cantidad), 0);
    const montoDescuento = descuento.tipo === '%' 
        ? (subtotal * (descuento.valor / 100)) 
        : descuento.valor;
    const total = subtotal - montoDescuento;
    const vuelto = efectivoRecibido > total ? efectivoRecibido - total : 0;

    return (
        <div className="p-6 bg-gray-100 min-h-screen grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* IZQUIERDA: LISTA DE PRODUCTOS (3/4) */}
            <div className="lg:col-span-3 space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4 border-2 border-indigo-500">
                    <Barcode className="text-indigo-600" />
                    <input 
                        ref={inputRef}
                        autoFocus
                        placeholder="Escanee código de barras..."
                        className="w-full text-xl outline-none"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        onKeyDown={manejarEscaneo}
                    />
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden min-h-[500px]">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4">Producto</th>
                                <th className="p-4">Precio</th>
                                <th className="p-4">Cantidad</th>
                                <th className="p-4">Subtotal</th>
                                <th className="p-4"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {carrito.map(item => (
                                <tr key={item.id} className="border-b">
                                    <td className="p-4 font-bold">{item.nombre}</td>
                                    <td className="p-4">${item.precio_venta}</td>
                                    <td className="p-4">
                                        <input 
                                            type="number" 
                                            className="w-16 border rounded p-1"
                                            value={item.cantidad}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setCarrito(prev => prev.map(i => i.id === item.id ? {...i, cantidad: val} : i));
                                            }}
                                        />
                                    </td>
                                    <td className="p-4 font-bold">${item.precio_venta * item.cantidad}</td>
                                    <td className="p-4 text-red-500 cursor-pointer" onClick={() => setCarrito(carrito.filter(i => i.id !== item.id))}>
                                        <Trash2 size={18} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DERECHA: TOTALES Y PAGO (1/4) */}
            <div className="space-y-4">
                <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-xl">
                    <p className="text-indigo-200 text-sm uppercase font-bold tracking-widest">Total a Pagar</p>
                    <h2 className="text-4xl font-black">${total.toLocaleString('es-CL')}</h2>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-400">MÉTODO DE PAGO</label>
                        <select 
                            className="w-full mt-1 p-2 border rounded-lg"
                            value={metodoPago}
                            onChange={(e) => setMetodoPago(e.target.value)}
                        >
                            <option>Efectivo</option>
                            <option>Débito/Crédito</option>
                            <option>Transferencia</option>
                        </select>
                    </div>

                    {metodoPago === "Efectivo" ? (
                        <div>
                            <label className="text-xs font-bold text-gray-400">PAGA CON</label>
                            <input 
                                type="number" 
                                className="w-full p-2 bg-green-50 border border-green-200 rounded-lg text-xl font-bold"
                                onChange={(e) => setEfectivoRecibido(e.target.value)}
                            />
                            <p className="mt-2 text-sm text-green-600 font-bold">Vuelto: ${vuelto}</p>
                        </div>
                    ) : (
                        <div>
                            <label className="text-xs font-bold text-gray-400">N° VOUCHER / OPERACIÓN</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border rounded-lg"
                                placeholder="Ej: 004231"
                                value={voucher}
                                onChange={(e) => setVoucher(e.target.value)}
                            />
                        </div>
                    )}

                    <hr />
                    
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-400">DESC. VALOR</label>
                            <input type="number" className="w-full p-1 border rounded" onChange={(e) => setDescuento({tipo: '$', valor: Number(e.target.value)})} />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-400">DESC. %</label>
                            <input type="number" className="w-full p-1 border rounded" onChange={(e) => setDescuento({tipo: '%', valor: Number(e.target.value)})} />
                        </div>
                    </div>

                    <button className="w-full bg-green-500 text-white py-4 rounded-xl font-black text-lg hover:bg-green-600 transition-all flex items-center justify-center gap-2">
                        <Receipt size={20} /> FINALIZAR VENTA
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PuntoVentaPage;