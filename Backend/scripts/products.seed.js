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
      },

       // 1) Camiseta personalizable
    {
      name: "Camiseta básica personalizada",
      description:
        "Camiseta de algodón 100% con personalización frontal y posterior. Crea tu diseño con textos e imágenes y ajústalo libremente dentro de las áreas personalizables.",
      price: 19.9,
      image: "https://via.placeholder.com/400x300?text=Camiseta+personalizada",
      stock: 50,
      active: true,
      category: "ropa",
      customizable: true,
      productTemplateId: "tshirt-basic-v1",
      customizationAreas: [
        {
          name: "Pecho frontal",
          code: "front",
          maxWidthMm: 280,
          maxHeightMm: 200,
          notes: "Zona centrada en la parte frontal de la camiseta.",
        },
        {
          name: "Espalda completa",
          code: "back",
          maxWidthMm: 300,
          maxHeightMm: 350,
          notes: "Ideal para dorsales o diseños grandes.",
        },
      ],
    },

    // 2) Sudadera personalizable
    {
      name: "Sudadera con capucha personalizada",
      description:
        "Sudadera unisex con capucha, interior perchado. Personalizable en pecho y espalda.",
      price: 34.9,
      image: "https://via.placeholder.com/400x300?text=Sudadera+personalizada",
      stock: 30,
      active: true,
      category: "ropa",
      customizable: true,
      customizationAreas: [
        {
          name: "Pecho pequeño",
          code: "front_small",
          maxWidthMm: 100,
          maxHeightMm: 60,
          notes: "Logo pequeño en el lado izquierdo.",
        },
        {
          name: "Espalda",
          code: "back",
          maxWidthMm: 260,
          maxHeightMm: 260,
          notes: "Texto o imagen centrada.",
        },
      ],
    },

    // 3) Taza personalizable
    {
      name: "Taza cerámica personalizada",
      description:
        "Taza blanca de cerámica con impresión envolvente. Apta para lavavajillas.",
      price: 12.5,
      image: "https://via.placeholder.com/400x300?text=Taza+personalizada",
      stock: 100,
      active: true,
      category: "hogar",
      customizable: true,
      productTemplateId: "mug-ceramic-standard-v1",
      customizationAreas: [
        {
          name: "Área lateral",
          code: "side",
          maxWidthMm: 80,
          maxHeightMm: 50,
          notes: "Zona visible cuando se sujeta con la mano derecha.",
        },
      ],
    },

    // 4) Producto NO personalizable
    {
      name: "Pantalón vaquero clásico",
      description: "Vaquero azul corte recto. No admite personalización.",
      price: 39.9,
      image: "https://via.placeholder.com/400x300?text=Pantalon+vaquero",
      stock: 40,
      active: true,
      category: "ropa",
      customizable: false,
      customizationAreas: [],
    },

    // 5) Producto NO personalizable
    {
      name: "Auriculares Bluetooth",
      description:
        "Auriculares inalámbricos con cancelación de ruido. Producto estándar.",
      price: 59.9,
      image: "https://via.placeholder.com/400x300?text=Auriculares",
      stock: 20,
      active: true,
      category: "electronica",
      customizable: false,
      customizationAreas: [],
    },
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
