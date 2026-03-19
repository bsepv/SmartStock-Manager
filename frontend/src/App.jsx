import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import PanelControlPage from './pages/PanelControlPage';
import InventarioPage from './pages/InventarioPage';
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
          <Route path="/inventario" element={<InventarioPage />} />
        </Route>

        {/* Redirección */}
        <Route path="*" element={<Navigate to="/login" />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;