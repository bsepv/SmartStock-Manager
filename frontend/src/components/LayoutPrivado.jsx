import Navbar from "./components/Navbar";
import { Outlet } from "react-router-dom";

const LayoutPrivado = () => {
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  return (
    <>
      <Navbar usuario={usuario} />
      <Outlet />
    </>
  );
};

export default LayoutPrivado;