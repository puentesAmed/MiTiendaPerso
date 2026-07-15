import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { createApp } from "./app.js";

async function bootstrap() {
  await connectDB();
  const app = createApp();

  const PORT = env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 API escuchando en http://localhost:${PORT}`);
  });
}

bootstrap();
