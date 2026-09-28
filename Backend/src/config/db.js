import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  const uri = env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI no está definida en las variables de entorno');
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('MongoDB conectado correctamente');
  } catch (error) {
    console.error('Error de conexión a MongoDB:', error.message);
    throw error;
  }
}
