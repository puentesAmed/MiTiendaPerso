import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { authRouter } from './routes/auth.routes.js';
import { productsRouter } from './routes/products.routes.js';
import { ordersRouter } from './routes/orders.routes.js';

async function bootstrap() {
  await connectDB();

  const app = express();

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
