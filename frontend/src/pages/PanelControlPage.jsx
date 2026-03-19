import { useEffect, useState } from 'react';
import api from '../api/axios';
import { LayoutDashboard, Package, List, Clock, AlertTriangle, Activity, Users } from 'lucide-react';

const PanelControlPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const res = await api.get('/productos/dashboard/resumen');
                setData(res.data);
            } catch (err) {
                console.error("Error cargando dashboard", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando Panel...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Error al cargar datos.</div>;

    // Formateador de fechas chileno
    const formatearFecha = (fecha) => {
        return new Date(fecha).toLocaleDateString('es-CL', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            {/* Título */}
            <header className="flex items-center gap-3 mb-10">
                <LayoutDashboard className="text-blue-600" size={32} />
                <h1 className="text-3xl font-bold text-gray-800">Panel de Control</h1>
                <p className="text-gray-500 ml-2">Resumen estratégico de SmartStock-Manager</p>
            </header>

            {/* SECCIÓN 1: LAS CARDS (Basadas en tu referencia) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                
                {/* Card: Total Productos (Azul) */}
                <CardResumen 
                    titulo="Productos" 
                    valor={data.conteos.total_productos} 
                    icono={Package} 
                    color="border-blue-500" 
                    bgColor="bg-blue-100" 
                    textColor="text-blue-600" 
                />

                {/* Card: Total Categorías (Naranja) */}
                <CardResumen 
                    titulo="Categorías" 
                    valor={data.conteos.total_categorias} 
                    icono={List} 
                    color="border-orange-500" 
                    bgColor="bg-orange-100" 
                    textColor="text-orange-600" 
                />

                {/* Card: Último Ingreso (Verde) */}
                <CardResumen 
                    titulo="Último Ingreso" 
                    valor={data.ultimoIngreso ? new Date(data.ultimoIngreso).toLocaleDateString('es-CL') : 'N/A'}
                    icono={Clock} 
                    color="border-green-500" 
                    bgColor="bg-green-100" 
                    textColor="text-green-600" 
                    esPequeño
                />

                {/* Card: Usuarios (Gris/Amarillo) */}
                <CardResumen 
                    titulo="Usuarios" 
                    valor={data.conteos.total_usuarios} 
                    icono={Users} 
                    color="border-gray-500" 
                    bgColor="bg-gray-100" 
                    textColor="text-gray-600" 
                />
            </div>

            {/* SECCIÓN 2: LAS PEQUEÑAS TABLAS */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Tabla: Stock Bajo (Crítico) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
                        <AlertTriangle className="text-red-500" size={20} /> Top 3 Stock Bajo
                    </h2>
                    <TablaPequeña 
                        headers={['Producto', 'Stock', 'Mínimo']}
                        data={data.stockBajo.map(p => [
                            <span className="font-medium text-gray-900">{p.nombre}</span>,
                            <span className="font-bold text-red-600">{p.stock_actual}</span>,
                            p.stock_minimo
                        ])}
                    />
                </div>

                {/* Tabla: Recientemente Añadidos */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
                        <Package className="text-blue-500" size={20} /> Añadidos Recientemente
                    </h2>
                    <TablaPequeña 
                        headers={['Producto', 'SKU', 'Fecha']}
                        data={data.recientes.map(p => [
                            p.nombre,
                            <span className="font-mono text-gray-600">{p.sku}</span>,
                            new Date(p.creado_en).toLocaleDateString('es-CL')
                        ])}
                    />
                </div>

                {/* Tabla: Últimos Movimientos (Trazabilidad) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 xl:col-span-3">
                    <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
                        <Activity className="text-purple-500" size={20} /> Últimos Movimientos (Qué y Quién)
                    </h2>
                    <TablaPequeña 
                        headers={['Tipo', 'Producto', 'Cant.', 'Usuario', 'Fecha']}
                        data={data.movimientos.map(m => [
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${m.tipo === 'INGRESO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{m.tipo}</span>,
                            m.producto,
                            <span className="font-bold">{m.cantidad}</span>,
                            m.usuario,
                            formatearFecha(m.fecha)
                        ])}
                    />
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTES AUXILIARES (Para reutilizar código) ---

const CardResumen = ({ titulo, valor, icono: Icono, color, bgColor, textColor, esPequeño }) => (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 ${color} p-5 flex items-center justify-between transition-transform hover:scale-105 hover:shadow-lg`}>
        <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{titulo}</p>
            <p className={`font-bold text-gray-800 ${esPequeño ? 'text-xl' : 'text-3xl'}`}>{valor}</p>
        </div>
        <div className={`${bgColor} ${textColor} p-3.5 rounded-xl`}>
            <Icono size={26} strokeWidth={2.5} />
        </div>
    </div>
);

const TablaPequeña = ({ headers, data }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 rounded-lg">
                <tr>
                    {headers.map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {data.length === 0 ? (
                    <tr><td colSpan={headers.length} className="px-4 py-6 text-center text-gray-400">Sin datos registrados</td></tr>
                ) : data.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                        {row.map((cell, j) => <td key={j} className="px-4 py-3 text-gray-700">{cell}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default PanelControlPage;