// src/router/index.jsx
import { createBrowserRouter, Navigate } from "react-router-dom";

import { App } from "../App";
import { ProtectedRoute } from "./ProtectedRoute";

import { Login } from "../pages/Login/Login";
import { Register } from "../pages/Register/Register";
import { Checkout } from "../pages/Checkout/Checkout";
// importa también Home u otras páginas si las necesitas
// import { Home } from "../pages/Home/Home";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // públicas
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },

      // protegidas
      {
        element: <ProtectedRoute />,
        children: [
          // { index: true, element: <Home /> },  // si quieres home protegido
          { path: "checkout", element: <Checkout /> },
          // aquí podrías añadir /carrito, /mis-pedidos, etc.
        ],
      },

      // 404
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
