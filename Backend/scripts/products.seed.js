// scripts/products.seed.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { Product } from '../src/models/Product.js';

async function seedProducts() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error("Falta MONGO_URI en .env");
      process.exit(1);
    }

    console.log("Conectando a Mongo...");
    await mongoose.connect(uri);

    console.log("Limpiando colección Product...");
    await Product.deleteMany({});

    const products = [
      {
        name: "Camiseta básica",
        description: "Camiseta de algodón 100%, disponible en varias tallas.",
        price: 12.99,
        category: "ropa",
        stock: 50,
        image: "https://via.placeholder.com/400x300?text=Camiseta",
      },
      {
        name: "Pantalón deportivo",
        description: "Pantalón cómodo para correr o entrenar.",
        price: 24.99,
        category: "ropa",
        stock: 30,
        image: "https://via.placeholder.com/400x300?text=Pantalon",
      },
      {
        name: "Auriculares Inalámbricos",
        description: "Bluetooth 5.0, batería de larga duración.",
        price: 49.99,
        category: "electronica",
        stock: 20,
        image: "https://via.placeholder.com/400x300?text=Auriculares",
      },
      {
        name: "Robot Aspirador",
        description: "Ideal para mantener tu casa limpia cada día.",
        price: 199.90,
        category: "hogar",
        stock: 15,
        image: "https://via.placeholder.com/400x300?text=Aspirador",
      },
      {
        name: "Lámpara de Escritorio LED",
        description: "Luz suave regulable, perfecta para estudiar.",
        price: 18.50,
        category: "hogar",
        stock: 40,
        image: "https://via.placeholder.com/400x300?text=Lampara",
      },
      {
        name: "Monitor 27'' Full HD",
        description: "Ideal para trabajo y gaming casual.",
        price: 159.00,
        category: "electronica",
        stock: 10,
        image: "https://via.placeholder.com/400x300?text=Monitor",
      }
    ];

    console.log("Insertando productos...");
    await Product.insertMany(products);

    console.log("Seed completado con éxito");
    process.exit(0);

  } catch (err) {
    console.error("Error en seed:", err);
    process.exit(1);
  }
}

seedProducts();
