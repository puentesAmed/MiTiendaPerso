import "dotenv/config";
import mongoose from "mongoose";
import { Product } from "../src/models/Product.js";

const DEFAULT_PRODUCT_ID = "693070095d96fe47cd3f2055";
const DEFAULT_TEMPLATE_ID = "mug-ceramic-standard-v1";

async function assignProductTemplate() {
  const [productId = DEFAULT_PRODUCT_ID, templateId = DEFAULT_TEMPLATE_ID] = process.argv.slice(2);
  if (!process.env.MONGO_URI) throw new Error("Falta MONGO_URI en el entorno.");
  if (!mongoose.isValidObjectId(productId)) throw new Error("productId inválido.");
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(templateId)) throw new Error("templateId inválido.");

  await mongoose.connect(process.env.MONGO_URI);
  const result = await Product.updateOne(
    { _id: productId },
    { $set: { productTemplateId: templateId } },
  );
  if (result.matchedCount !== 1) throw new Error("No se encontró el producto piloto.");
  console.log(`Producto ${productId} asociado a ${templateId}.`);
}

assignProductTemplate()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
