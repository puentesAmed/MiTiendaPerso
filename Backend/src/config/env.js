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

export const env = {
  PORT: Number(process.env.PORT) || 3000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  CORS_ORIGINS: ORIGINS,
  NODE_ENV: process.env.NODE_ENV || 'development',
};
