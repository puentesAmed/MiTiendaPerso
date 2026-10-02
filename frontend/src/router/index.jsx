// src/router/index.jsx
import { createBrowserRouter } from "react-router-dom";
import { lazy } from "react";
import { App } from "../App.jsx";
import { Home } from "../pages/Home/Home.jsx";
import { Login } from "../pages/Login/Login.jsx";
import { Register } from "../pages/Register/Register.jsx";
import { Products } from "../pages/Products/Products.jsx";
import { ProductDetail } from "../pages/ProductDetail/ProductDetail.jsx";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { createSuspenseWrapper } from "./loadingFallback";
import { NotFound } from "../pages/NotFound/NotFound.jsx";

// Lazy-load heavy pages (named exports) - inline imports for Vite code splitting
const ProductDesignerV2Page = lazy(() =>
  import("../features/product-designer-v2/pages/ProductDesignerV2Page.jsx").then((m) => ({ default: m.ProductDesignerV2Page }))
);
const Cart = lazy(() =>
  import("../pages/Cart/Cart.jsx").then((m) => ({ default: m.Cart }))
);
const Checkout = lazy(() =>
  import("../pages/Checkout/Checkout.jsx").then((m) => ({ default: m.Checkout }))
);
const MyOrders = lazy(() =>
  import("../pages/MyOrders/MyOrders.jsx").then((m) => ({ default: m.MyOrders }))
);
const OrderDetail = lazy(() =>
  import("../pages/OrderDetail/OrderDetail.jsx").then((m) => ({ default: m.OrderDetail }))
);
const OrderConfirmation = lazy(() =>
  import("../pages/OrderConfirmation/OrderConfirmation.jsx").then((m) => ({ default: m.OrderConfirmation }))
);
const Admin = lazy(() =>
  import("../pages/Admin/Admin.jsx").then((m) => ({ default: m.Admin }))
);
const OrderTracking = lazy(() =>
  import("../pages/OrderTracking/OrderTracking.jsx").then((m) => ({ default: m.OrderTracking }))
);

// Legal pages - lazy loaded
const PrivacyPolicy = lazy(() =>
  import("../pages/Legal/PrivacyPolicy").then((m) => ({ default: m.PrivacyPolicy }))
);
const AvisoLegal = lazy(() =>
  import("../pages/Legal/AvisoLegal.jsx").then((m) => ({ default: m.AvisoLegal }))
);
const TerminosCondiciones = lazy(() =>
  import("../pages/Legal/TerminosCondiciones.jsx").then((m) => ({ default: m.TerminosCondiciones }))
);
const CookiesPolicy = lazy(() =>
  import("../pages/Legal/CookiesPolicy.jsx").then((m) => ({ default: m.CookiesPolicy }))
);
const ContactoLegal = lazy(() =>
  import("../pages/Legal/ContactoLegal.jsx").then((m) => ({ default: m.ContactoLegal }))
);

// Create wrapper components with Suspense for each lazy page
const ProductDesignerV2PageSuspense = createSuspenseWrapper(ProductDesignerV2Page);
const CartSuspense = createSuspenseWrapper(Cart);
const CheckoutSuspense = createSuspenseWrapper(Checkout);
const MyOrdersSuspense = createSuspenseWrapper(MyOrders);
const OrderDetailSuspense = createSuspenseWrapper(OrderDetail);
const OrderConfirmationSuspense = createSuspenseWrapper(OrderConfirmation);
const AdminSuspense = createSuspenseWrapper(Admin);
const OrderTrackingSuspense = createSuspenseWrapper(OrderTracking);

const PrivacyPolicySuspense = createSuspenseWrapper(PrivacyPolicy);
const AvisoLegalSuspense = createSuspenseWrapper(AvisoLegal);
const TerminosCondicionesSuspense = createSuspenseWrapper(TerminosCondiciones);
const CookiesPolicySuspense = createSuspenseWrapper(CookiesPolicy);
const ContactoLegalSuspense = createSuspenseWrapper(ContactoLegal);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // Página por defecto al entrar a "/"
      { index: true, element: <Home /> },
      { path: "Inicio", element: <Home /> },

      // Auth públicas
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },

      // Productos (públicos)
      { path: "productos", element: <Products /> },
      { path: "productos/:id", element: <ProductDetail /> },
      { path: "personalizar-v2/:productId", element: <ProductDesignerV2PageSuspense /> },
      { path: "carrito", element: <CartSuspense /> },
      { path: "checkout", element: <CheckoutSuspense /> },
      { path: "confirmacion-pedido", element: <OrderConfirmationSuspense /> },
      { path: "seguimiento-pedido", element: <OrderTrackingSuspense /> },

      // Legal - lazy loaded (públicas)
      { path: "politica-privacidad", element: <PrivacyPolicySuspense /> },
      { path: "aviso-legal", element: <AvisoLegalSuspense /> },
      { path: "terminos-condiciones", element: <TerminosCondicionesSuspense /> },
      { path: "politica-cookies", element: <CookiesPolicySuspense /> },
      { path: "contacto-legal", element: <ContactoLegalSuspense /> },

      { path: "*", element: <NotFound /> },

      // Rutas protegidas (requieren autenticación)
      {
        element: <ProtectedRoute />,
        children: [
          // Cuenta - lazy loaded
          { path: "mis-pedidos", element: <MyOrdersSuspense /> },
          { path: "mis-pedidos/:id", element: <OrderDetailSuspense /> },

          // Admin - lazy loaded, requiere rol admin
          {
            element: <ProtectedRoute roles={["admin"]} />,
            children: [
              { path: "admin", element: <AdminSuspense /> },
            ],
          },
        ],
      },
    ],
  },
]);
