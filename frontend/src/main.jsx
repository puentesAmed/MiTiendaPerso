import ReactDOM from "react-dom/client";
import { AuthProvider } from "./context/AuthContext";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./components/theme-provider";
import { AppErrorBoundary } from "./components/common/AppErrorBoundary";
import "./index.css";


ReactDOM.createRoot(document.getElementById("root")).render(
  <AppErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <RouterProvider router={router} />
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  </AppErrorBoundary>
);
