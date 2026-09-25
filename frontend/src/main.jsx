import ReactDOM from "react-dom/client";
import { AuthProvider } from "./context/AuthContext";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./components/theme-provider";
import "./index.css";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";


ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <RouterProvider router={router} />
        </CartProvider>
      </AuthProvider>
  </ThemeProvider>
);
