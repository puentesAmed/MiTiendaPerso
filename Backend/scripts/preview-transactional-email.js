import { renderTransactionalOrderEmail } from "../src/emails/templates/transactionalOrderEmail.js";

const event = process.argv[2] || "ORDER_RECEIVED";
const fixture = process.argv[3] || "mug";
if (!["mug", "shirt"].includes(fixture)) throw new Error("Fixture no disponible: usa mug o shirt");

const common = {
  _id: "6ac3e0a1b2c3d4e5f6071829",
  createdAt: new Date("2026-10-05T12:00:00Z"),
  customer: { fullName: "Amed García", email: "amed@example.test", phone: "600 000 000" },
  payment: { method: "bizum", status: "pending", instructionsSnapshot: { recipient: "+34 600 000 000", instructions: "Realiza el Bizum indicando como concepto el número de pedido." } },
  orderPreparation: { preparationRequired: true, minDays: 2, maxDays: 4 },
};

const mug = {
  ...common,
  items: [
    { productId: "sample-product", name: "Taza personalizada", quantity: 2, price: 12.5, customizationId: "design-a", selectedSurfaceIds: ["wrap-main"] },
    { productId: "sample-product", name: "Taza personalizada", quantity: 1, price: 12.5, customizationId: "design-b", selectedSurfaceIds: ["wrap-main"] },
  ],
  subtotal: 37.5, discountAmount: 0, total: 37.5,
  shipping: { methodId: "pickup-free", type: "PICKUP_FREE", label: "Recogida gratuita", pickupAddress: "Paseo Miguel de Cervantes 2, 28922 Alcorcón, Madrid", price: 0 },
};

const shirt = {
  ...common,
  items: [{ productId: "shirt", name: "Camiseta personalizada", quantity: 2, price: 24.9, variant: { size: "M", color: "Blanco" }, customizationId: "design-shirt", selectedSurfaceIds: ["tshirt-front", "tshirt-back"] }],
  subtotal: 49.8, discountAmount: 0, total: 54.8,
  shipping: { methodId: "local-urgent", type: "LOCAL_URGENT", label: "Envío urgente local", price: 5 },
  shippingAddress: { street: "Calle Ejemplo 1", postalCode: "28001", city: "Madrid", state: "Madrid", country: "España" },
};

const sample = fixture === "shirt" || event === "ORDER_SHIPPED" ? shirt : mug;
process.stdout.write(renderTransactionalOrderEmail(sample, event, { publicStorefrontUrl: null }).html);
