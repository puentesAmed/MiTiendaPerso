import { createBrowserRouter, Navigate } from "react-router-dom";
import { App } from "../App";
import { ProtectedRoute } from "./ProtectedRoute";

import { Home } from "../pages/Home/Home";
import { Login } from "../pages/Login/Login";
import { Register } from "../pages/Register/Register";
import { Cart } from "../pages/Cart/Cart";
import { Checkout } from "../pages/Checkout/Checkout";
import { ProductDetail } from "../pages/ProductDetail/ProductDetail";
import { Admin } from "../pages/Admin/Admin";
import { Products } from "../pages/Products/Products";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // públicas
      { index: true, element: <Home /> },
      {path: "/products", element: <Products />},
      { path: "product/:id", element: <ProductDetail /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },

      // protegidas
      {
        element: <ProtectedRoute />,
        children: [
          { path: "cart", element: <Cart /> },
          { path: "checkout", element: <Checkout /> },
          { path: "admin", element: <Admin /> },
        ],
      },

      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

