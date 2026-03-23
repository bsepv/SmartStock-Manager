import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import PanelControlPage from './pages/PanelControlPage';
import InventarioPage from './pages/InventarioPage';
import GestionUsuariosPage from './pages/GestionUsuariosPage';
import PuntoVentaPage from './pages/PuntoVentaPage';
import HistorialVentasPage from './pages/HistorialVentasPage';
import Navbar from './components/Navbar';

// Layout con Navbar
const LayoutPrivado = () => {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
};

// Protección
const RutaProtegida = ({ children }) => {
  const isAuth = localStorage.getItem("token");

  return isAuth ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login SIN navbar */}
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RutaProtegida>
              <LayoutPrivado />
            </RutaProtegida>
          }
        >
          <Route path="/panelcontrol" element={<PanelControlPage />} />
          <Route path="/puntoventa" element={<PuntoVentaPage />} />
          <Route path="/inventario" element={<InventarioPage />} />
          <Route path="/historialventas" element={<HistorialVentasPage />} />
          <Route path='/usuarios' element={<GestionUsuariosPage/>} />
        </Route>

        {/* Redirección */}
        <Route path="*" element={<Navigate to="/login" />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;