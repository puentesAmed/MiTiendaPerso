// src/server.js
import express from "express";
import cors from "cors";
import path from "path";

import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";

import { authRouter } from "./routes/auth.routes.js";
import { productsRouter } from "./routes/products.routes.js";
import { ordersRouter } from "./routes/orders.routes.js";
import { uploadRouter } from "./routes/uploads.routes.js";
import { customizationRoutes } from "./routes/customizations.routes.js";
import { shippingRoutes } from "./routes/shipping.routes.js";
import checkoutRoutes from "./routes/checkout.routes.js";
import paymentsRouter from "./routes/payments.routes.js";

async function bootstrap() {
  await connectDB();

  const app = express();

  /* ---------------------------------------------------------
   * CORS
   * --------------------------------------------------------- */
  app.use(
    cors({
      origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : "*",
    })
  );

  /* ---------------------------------------------------------
   * BODY PARSER (CRÍTICO PARA PREVIEW HD)
   * --------------------------------------------------------- */
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  /* ---------------------------------------------------------
   * ARCHIVOS ESTÁTICOS (SOLO IMÁGENES)
   * --------------------------------------------------------- */
  app.use("/uploads", express.static(path.resolve("uploads")));

  /* ---------------------------------------------------------
   * RUTAS API
   * --------------------------------------------------------- */
  app.use("/auth", authRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/uploads", uploadRouter);
  app.use("/api/customizations", customizationRoutes);
  app.use("/api/shipping", shippingRoutes);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/checkout", checkoutRoutes);

  /* ---------------------------------------------------------
   * HEALTHCHECK
   * --------------------------------------------------------- */
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  /* ---------------------------------------------------------
   * 404
   * --------------------------------------------------------- */
  app.use((_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  /* ---------------------------------------------------------
   * ERROR HANDLER
   * --------------------------------------------------------- */
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error("❌ Error:", err);
    res.status(500).json({ message: "Internal server error" });
  });

  const PORT = env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 API escuchando en http://localhost:${PORT}`);
  });
}

bootstrap();
