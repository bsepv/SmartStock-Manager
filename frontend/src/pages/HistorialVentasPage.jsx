import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Calendar, Search, FileX, Eye, ArrowLeftRight, CheckCircle, XCircle } from 'lucide-react';

const HistorialVentasPage = () => {
    const [ventas, setVentas] = useState([]);
    const [filtroFecha, setFiltroFecha] = useState({ desde: '', hasta: '' });

    const cargarHistorial = async () => {
        try {
            const res = await api.get('/ventas/historial', { params: filtroFecha });
            setVentas(res.data);
        } catch (err) { console.error("Error al cargar historial"); }
    };

    useEffect(() => { cargarHistorial(); }, []);

    const handleAnular = async (id) => {
        if (window.confirm("¿Seguro que deseas ANULAR esta venta? El stock se devolverá al inventario.")) {
            try {
                await api.post(`/ventas/anular/${id}`);
                cargarHistorial(); // Refrescar lista
            } catch (err) { alert("Error al anular"); }
        }
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 tracking-tight">Historial de Ventas</h1>
                        <p className="text-gray-500">Monitoreo de transacciones y devoluciones</p>
                    </div>

                    {/* Filtros */}
                    <div className="flex gap-3 bg-white p-2 rounded-2xl shadow-sm border">
                        <input 
                            type="date" 
                            className="p-2 text-sm outline-none border-r"
                            onChange={(e) => setFiltroFecha({...filtroFecha, desde: e.target.value})}
                        />
                        <input 
                            type="date" 
                            className="p-2 text-sm outline-none"
                            onChange={(e) => setFiltroFecha({...filtroFecha, hasta: e.target.value})}
                        />
                        <button 
                            onClick={cargarHistorial}
                            className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700"
                        >
                            <Search size={18} />
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b">
                                <th className="px-6 py-4">ID / Fecha</th>
                                <th className="px-6 py-4">Vendedor</th>
                                <th className="px-6 py-4">Método</th>
                                <th className="px-6 py-4">Voucher</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {ventas.map((v) => (
                                <tr key={v.id} className={`hover:bg-gray-50 transition-colors ${v.estado === 'ANULADA' ? 'opacity-50 italic' : ''}`}>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-700">#00{v.id}</p>
                                        <p className="text-[10px] text-gray-400">
                                            {new Date(v.fecha).toLocaleString('es-CL')}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-600">
                                        {v.vendedor}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="flex items-center gap-1 text-xs font-bold text-gray-500">
                                            {v.metodo_pago === 'Efectivo' ? <ArrowLeftRight size={14} className="text-green-500" /> : <CreditCard size={14} className="text-blue-500" />}
                                            {v.metodo_pago}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-indigo-500">
                                        {v.nro_voucher || '---'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className={`font-black ${v.estado === 'ANULADA' ? 'line-through text-red-300' : 'text-gray-800'}`}>
                                            ${Number(v.total_final).toLocaleString('es-CL')}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center gap-2">
                                            <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Ver Detalle">
                                                <Eye size={18} />
                                            </button>
                                            {v.estado !== 'ANULADA' && (
                                                <button 
                                                    onClick={() => handleAnular(v.id)}
                                                    className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" 
                                                    title="Anular Venta"
                                                >
                                                    <FileX size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HistorialVentasPage;