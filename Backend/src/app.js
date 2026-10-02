import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import { env } from "./config/env.js";

import { authRouter } from "./routes/auth.routes.js";
import { productsRouter } from "./routes/products.routes.js";
import { ordersRouter } from "./routes/orders.routes.js";
import { publicUploadsRouter, uploadRouter } from "./routes/uploads.routes.js";
import { customizationRoutes } from "./routes/customizations.routes.js";
import { shippingRoutes } from "./routes/shipping.routes.js";
import checkoutRoutes from "./routes/checkout.routes.js";
import paymentsRouter from "./routes/payments.routes.js";
import { designerV2MockupsRouter } from "./routes/designer-v2-mockups.routes.js";
import { couponsRoutes } from "./routes/coupons.routes.js";

export function createApp() {
  const app = express();

  app.use(
    helmet({
      // Product/customization images are served by the API to a separate frontend origin.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  const limiterResponse = {
    ok: false,
    message: "Demasiadas solicitudes. Inténtalo de nuevo más tarde.",
  };

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: limiterResponse,
  });

  const publicActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: limiterResponse,
  });

  app.use(
    cors({
      origin:
        env.CORS_ORIGINS.length > 0
          ? env.CORS_ORIGINS
          : env.NODE_ENV === "production"
            ? false
            : true,
    })
  );

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.use("/auth/login", authLimiter);
  app.use("/auth/register", authLimiter);
  app.use("/api/orders/track", publicActionLimiter);
  app.use("/api/checkout/shipping-options", publicActionLimiter);
  app.use("/api/payments/monei/create", publicActionLimiter);
  app.use("/api/designer-v2/mockups", publicActionLimiter);
  app.use("/api/uploads/designer-v2", publicActionLimiter);

  app.use("/uploads", publicUploadsRouter);

  app.use("/auth", authRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/uploads", uploadRouter);
  app.use("/api/customizations", customizationRoutes);
  app.use("/api/shipping", shippingRoutes);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/coupons", couponsRoutes);
  app.use("/api/designer-v2/mockups", designerV2MockupsRouter);
  if (env.DROPSHIPPING_ENABLED) {
    app.use("/api/checkout", checkoutRoutes);
  }

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use((_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600
      ? err.status
      : 500;
    console.error("Error no controlado:", err.message);
    if (env.NODE_ENV !== "production" && err.stack) {
      console.error(err.stack);
    }
    res.status(status).json({
      message: status >= 500 ? "Internal server error" : err.message,
    });
  });

  return app;
}

