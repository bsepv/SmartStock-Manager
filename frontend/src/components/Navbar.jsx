import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, LogOut } from 'lucide-react';

const Navbar = ({ usuario }) => {
    const navigate = useNavigate(); // ✅ ahora sí

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        navigate("/login");
    };

    return (
        <nav className="bg-white border-b border-gray-200 px-8 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
            
            <div className="flex items-center gap-8">
                
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                        <Package size={20} />
                    </div>
                    <span className="font-bold text-xl text-gray-800 tracking-tight">
                        SmartStock
                    </span>
                </div>

                {/* Navegación */}
                <div className="flex items-center gap-2">
                    <NavLink
                        to="/panelcontrol"
                        className={({ isActive }) =>
                            `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                isActive
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-500 hover:bg-gray-100'
                            }`
                        }
                    >
                        <LayoutDashboard size={18} />
                        Panel de Control
                    </NavLink>

                    <NavLink
                        to="/inventario"
                        className={({ isActive }) =>
                            `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                isActive
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-500 hover:bg-gray-100'
                            }`
                        }
                    >
                        <Package size={18} />
                        Inventario
                    </NavLink>
                </div>
            </div>

            {/* Usuario */}
            <div className="flex items-center gap-4">
                <p className="text-sm font-bold text-gray-700">
                    Hola, {usuario?.nombre || "Usuario"}
                </p>

                <button
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                >
                    <LogOut size={20} />
                </button>
            </div>

        </nav>
    );
};

export default Navbar;