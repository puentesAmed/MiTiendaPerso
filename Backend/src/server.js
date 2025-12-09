/*import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { authRouter } from './routes/auth.routes.js';
import { productsRouter } from './routes/products.routes.js';
import { ordersRouter } from './routes/orders.routes.js';
import path from "path";
import { uploadRouter } from "./routes/uploads.routes.js";
import {customizationRoutes} from "./routes/customizations.routes.js";

async function bootstrap() {
  await connectDB();

  const app = express();

  app.use("/uploads", express.static(path.resolve("uploads")));
  app.use("/api/uploads", uploadRouter);

  // CORS
  app.use(
    cors({
      origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : '*',
    }),
  );

  // Body parser
  app.use(express.json());

  // Rutas API
  app.use('/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/orders', ordersRouter);
  app.use("/api/customizations", customizationRoutes);


  // Healthcheck
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // 404
  app.use((req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  // Manejo básico de errores
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error('Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  });

  const PORT = env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
  });
}

bootstrap();
*/

// src/server.js
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { authRouter } from './routes/auth.routes.js';
import { productsRouter } from './routes/products.routes.js';
import { ordersRouter } from './routes/orders.routes.js';
import path from "path";
import { uploadRouter } from "./routes/uploads.routes.js";
import { customizationRoutes } from "./routes/customizations.routes.js";

async function bootstrap() {
  await connectDB();

  const app = express();

  // Archivo estático para imágenes subidas
  app.use("/uploads", express.static(path.resolve("uploads")));
  app.use("/api/uploads", uploadRouter);

  // CORS
  app.use(
    cors({
      origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : '*',
    }),
  );

  // ⭐ CORRECCIÓN IMPORTANTE: aumentar límite del body parser (antes → 100kb, ahora → 20MB)
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // Rutas API
  app.use('/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/orders', ordersRouter);
  app.use("/api/customizations", customizationRoutes);

  // Healthcheck
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // 404
  app.use((req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  // Manejo de errores
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error('Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  });

  const PORT = env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
  });
}

bootstrap();
