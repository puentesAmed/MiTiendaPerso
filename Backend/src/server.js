import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import mongoose from "mongoose";

let server;
let shuttingDown = false;

async function bootstrap() {
  await connectDB();
  const app = createApp();

  const PORT = env.PORT || 3000;
  server = app.listen(PORT, () => {
    console.log(`API escuchando en el puerto ${PORT}`);
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} recibido; cerrando servidor`);

  const forceExit = setTimeout(() => {
    console.error("Timeout durante el cierre limpio");
    process.exit(1);
  }, 10000);
  forceExit.unref();

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await mongoose.disconnect();
    clearTimeout(forceExit);
    process.exit(0);
  } catch (error) {
    console.error("Error durante el cierre:", error.message);
    process.exit(1);
  }
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));

bootstrap().catch((error) => {
  console.error("No se pudo iniciar la API:", error.message);
  process.exit(1);
});
