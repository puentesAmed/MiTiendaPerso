/*port { createBrowserRouter, Navigate } from "react-router-dom";
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

*/


// src/router/index.jsx
import { createBrowserRouter } from "react-router-dom";
import { App } from "../App.jsx";
import { Home } from "../pages/Home/Home.jsx";
import { Login } from "../pages/Login/Login.jsx";
import { Register } from "../pages/Register/Register.jsx";
import { Products } from "../pages/Products/Products.jsx";
import { ProductDetail } from "../pages/ProductDetail/ProductDetail.jsx";
import { ProductDesignerPage } from "../pages/ProductDesigner/ProductDesignerPage.jsx";

import { Cart } from "../pages/Cart/Cart.jsx";
import { Checkout } from "../pages/Checkout/Checkout";
import { MyOrders } from "../pages/MyOrders/MyOrders.jsx";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { Admin } from "../pages/Admin/Admin.jsx";
import { OrderConfirmation } from "../pages/OrderConfirmation/OrderConfirmation.jsx";
import { PrivacyPolicy } from "../pages/Legal/PrivacyPolicy";
import { AvisoLegal } from "../pages/Legal/AvisoLegal.jsx";
import { TerminosCondiciones } from "../pages/Legal/TerminosCondiciones.jsx";
import { CookiesPolicy } from "../pages/Legal/CookiesPolicy.jsx";
import { ContactoLegal } from "../pages/Legal/ContactoLegal.jsx";







export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // Página por defecto al entrar a "/"
      { index: true, element: <Home/> },
      { path: "Inicio", element: <Home/> },

      // Auth públicas
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },

      // Productos (públicos)
      { path: "productos", element: <Products /> },
      { path: "productos/:id", element: <ProductDetail /> },
      { path: "personalizar/:id", element: <ProductDesignerPage /> },

      // Descomenta cuando tengas estas páginas creadas
      { path: "carrito", element: <Cart /> },
      { path: "checkout", element: <Checkout /> },
      { path: "mis-pedidos", element: (<MyOrders />),},
      //{ path: "/perfil", element: (<ProfilePage />)},
      //{ path: "/ayuda", element: (<HelpPage />)},
      { path: "confirmacion-pedido", element: <OrderConfirmation /> },
      { path: "politica-privacidad", element: <PrivacyPolicy /> },
      { path: "aviso-legal", element: <AvisoLegal /> },
      { path: "terminos-condiciones", element: <TerminosCondiciones /> },
      { path: "contacto-legal", element: <ContactoLegal /> },
      
      { path: "politica-cookies", element: <CookiesPolicy /> },

    


      {
        path: "admin",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Admin />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
