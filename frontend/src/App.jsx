import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import PanelControlPage from './pages/PanelControlPage';
import InventarioPage from './pages/InventarioPage';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/panelcontrol" element={<PanelControlPage />} />
        <Route path="/inventario" element={<InventarioPage />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;