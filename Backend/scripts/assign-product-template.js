import "dotenv/config";
import mongoose from "mongoose";
import { Product } from "../src/models/Product.js";

const DEFAULT_PRODUCT_ID = "693070095d96fe47cd3f2055";
const DEFAULT_TEMPLATE_ID = "mug-ceramic-standard-v1";

async function assignProductTemplate() {
  const args = process.argv.slice(2);
  const byName = args[0] === "--name";
  const productSelector = byName ? args[1] : (args[0] || DEFAULT_PRODUCT_ID);
  const templateId = byName ? args[2] : (args[1] || DEFAULT_TEMPLATE_ID);
  const description = byName ? args[3] : args[2];
  if (!process.env.MONGO_URI) throw new Error("Falta MONGO_URI en el entorno.");
  if (!byName && !mongoose.isValidObjectId(productSelector)) throw new Error("productId inválido.");
  if (byName && !productSelector?.trim()) throw new Error("Nombre de producto inválido.");
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(templateId)) throw new Error("templateId inválido.");

  await mongoose.connect(process.env.MONGO_URI);
  const filter = byName ? { name: productSelector.trim() } : { _id: productSelector };
  if (byName && await Product.countDocuments(filter) !== 1) throw new Error("El nombre debe identificar exactamente un producto.");
  const update = { productTemplateId: templateId };
  if (description?.trim()) update.description = description.trim();
  const result = await Product.updateOne(
    filter,
    { $set: update },
  );
  if (result.matchedCount !== 1) throw new Error("No se encontró el producto piloto.");
  console.log(`Producto ${productSelector} asociado a ${templateId}${result.modifiedCount ? "." : " (sin cambios)."}`);
}

assignProductTemplate()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
