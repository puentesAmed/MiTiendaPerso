import 'dotenv/config';
import path from 'node:path';

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
const STORAGE_PROVIDER = (process.env.STORAGE_PROVIDER || 'local').trim();
const CONFIGURED_STORAGE_ROOT = (process.env.STORAGE_ROOT || '').trim();
const isEnabled = (key) =>
  (process.env[key] || '').trim().toLowerCase() === 'true';

const ALIEXPRESS_CATALOG_ENABLED = isEnabled('ALIEXPRESS_CATALOG_ENABLED');
const DROPSHIPPING_ENABLED = isEnabled('DROPSHIPPING_ENABLED');
const MONEI_ENABLED = isEnabled('MONEI_ENABLED');
const MANUAL_PAYMENT_BIZUM_ENABLED = isEnabled(
  'MANUAL_PAYMENT_BIZUM_ENABLED'
);
const MANUAL_PAYMENT_BANK_TRANSFER_ENABLED = isEnabled(
  'MANUAL_PAYMENT_BANK_TRANSFER_ENABLED'
);

if (STORAGE_PROVIDER !== 'local') {
  throw new Error(`STORAGE_PROVIDER no soportado: ${STORAGE_PROVIDER}`);
}
const SMTP_KEYS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
  'ADMIN_EMAIL',
];
const SMTP_CONFIGURED = [
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
  'ADMIN_EMAIL',
].some((key) =>
  (process.env[key] || '').trim()
);

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
requireIntegrationConfig(
  MANUAL_PAYMENT_BIZUM_ENABLED,
  [
    'MANUAL_PAYMENT_BIZUM_RECIPIENT',
    'MANUAL_PAYMENT_BIZUM_INSTRUCTIONS',
  ],
  'Bizum manual'
);
requireIntegrationConfig(
  MANUAL_PAYMENT_BANK_TRANSFER_ENABLED,
  [
    'MANUAL_PAYMENT_BANK_ACCOUNT_HOLDER',
    'MANUAL_PAYMENT_BANK_IBAN',
    'MANUAL_PAYMENT_BANK_INSTRUCTIONS',
  ],
  'transferencia bancaria manual'
);
requireIntegrationConfig(SMTP_CONFIGURED, SMTP_KEYS, 'SMTP');

let CORS_ORIGINS = ORIGINS;

if (NODE_ENV === 'production') {
  if (process.env.JWT_SECRET.trim().length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción.');
  }

  if (!FRONTEND_URL) {
    throw new Error('FRONTEND_URL es obligatoria en producción.');
  }

  if (!CONFIGURED_STORAGE_ROOT) {
    throw new Error('STORAGE_ROOT es obligatorio en producción.');
  }

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
  STORAGE_PROVIDER,
  STORAGE_ROOT: CONFIGURED_STORAGE_ROOT || path.resolve(process.cwd(), 'uploads'),
  ALIEXPRESS_CATALOG_ENABLED,
  DROPSHIPPING_ENABLED,
  MONEI_ENABLED,
  MONGO_URI_ALIEXPRESS: process.env.MONGO_URI_ALIEXPRESS,
  DROPSHIPPING_API_URL: process.env.DROPSHIPPING_API_URL,
  MONEI_API_KEY: process.env.MONEI_API_KEY,
  MONEI_WEBHOOK_SECRET: process.env.MONEI_WEBHOOK_SECRET,
  MANUAL_PAYMENTS: {
    bizum: {
      enabled: MANUAL_PAYMENT_BIZUM_ENABLED,
      recipient: process.env.MANUAL_PAYMENT_BIZUM_RECIPIENT,
      instructions: process.env.MANUAL_PAYMENT_BIZUM_INSTRUCTIONS,
    },
    bankTransfer: {
      enabled: MANUAL_PAYMENT_BANK_TRANSFER_ENABLED,
      accountHolder: process.env.MANUAL_PAYMENT_BANK_ACCOUNT_HOLDER,
      iban: process.env.MANUAL_PAYMENT_BANK_IBAN,
      instructions: process.env.MANUAL_PAYMENT_BANK_INSTRUCTIONS,
    },
  },
  SMTP: {
    configured: SMTP_CONFIGURED,
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: isEnabled('SMTP_SECURE'),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM,
    adminEmail: process.env.ADMIN_EMAIL,
  },
};
