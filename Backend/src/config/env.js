import 'dotenv/config';

['MONGO_URI', 'JWT_SECRET'].forEach((key) => {
  if (!process.env[key]) {
    console.error('Falta la variable de entorno:', key);
    process.exit(1);
  }
});

const ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin !== '');

const FRONTEND_URL = (process.env.FRONTEND_URL || '').trim();
const NODE_ENV = process.env.NODE_ENV || 'development';
const isEnabled = (key) =>
  (process.env[key] || '').trim().toLowerCase() === 'true';

const ALIEXPRESS_CATALOG_ENABLED = isEnabled('ALIEXPRESS_CATALOG_ENABLED');
const DROPSHIPPING_ENABLED = isEnabled('DROPSHIPPING_ENABLED');
const MONEI_ENABLED = isEnabled('MONEI_ENABLED');

const requireIntegrationConfig = (enabled, keys, integration) => {
  if (!enabled) return;

  const missing = keys.filter((key) => !(process.env[key] || '').trim());
  if (missing.length > 0) {
    throw new Error(
      `Configuración incompleta para ${integration}: falta ${missing.join(', ')}.`
    );
  }
};

requireIntegrationConfig(
  ALIEXPRESS_CATALOG_ENABLED,
  ['MONGO_URI_ALIEXPRESS'],
  'AliExpress'
);
requireIntegrationConfig(
  DROPSHIPPING_ENABLED,
  ['DROPSHIPPING_API_URL'],
  'dropshipping'
);
requireIntegrationConfig(
  MONEI_ENABLED,
  ['MONEI_API_KEY', 'MONEI_WEBHOOK_SECRET'],
  'MONEI'
);

let CORS_ORIGINS = ORIGINS;

if (NODE_ENV === 'production') {
  if (CORS_ORIGINS.includes('*')) {
    throw new Error("Configuración insegura: CORS_ORIGINS no puede contener '*' en producción.");
  }

  if (CORS_ORIGINS.length === 0 && FRONTEND_URL) {
    CORS_ORIGINS = [FRONTEND_URL];
    console.warn("⚠️ CORS_ORIGINS no definido. Usando FRONTEND_URL como origen permitido en producción.");
  }

  if (CORS_ORIGINS.length === 0) {
    throw new Error('Falta configuración CORS en producción: define CORS_ORIGINS o FRONTEND_URL.');
  }
}

export const env = {
  PORT: Number(process.env.PORT) || 3000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  CORS_ORIGINS,
  FRONTEND_URL,
  NODE_ENV,
  ALIEXPRESS_CATALOG_ENABLED,
  DROPSHIPPING_ENABLED,
  MONEI_ENABLED,
  MONGO_URI_ALIEXPRESS: process.env.MONGO_URI_ALIEXPRESS,
  DROPSHIPPING_API_URL: process.env.DROPSHIPPING_API_URL,
  MONEI_API_KEY: process.env.MONEI_API_KEY,
  MONEI_WEBHOOK_SECRET: process.env.MONEI_WEBHOOK_SECRET,
};
