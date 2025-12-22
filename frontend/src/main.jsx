import ReactDOM from "react-dom/client";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import { theme } from "./theme";


import { AuthProvider } from "./context/AuthContext";

import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { CartProvider } from "./context/CartContext";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";


ReactDOM.createRoot(document.getElementById("root")).render(
  <ChakraProvider theme={theme}>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    
      <AuthProvider>
        <CartProvider>
          <RouterProvider router={router} />
        </CartProvider>
      </AuthProvider>
    
  </ChakraProvider>
);
