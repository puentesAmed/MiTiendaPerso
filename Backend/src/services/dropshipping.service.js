// Backend/src/services/dropshipping.service.js
import axios from "axios";
import { Order } from "../models/Order.js";  

/**
 * ======================================================
 * DROPSHIPPING SERVICE
 * ======================================================
 * Envía productos AliExpress al microservicio
 * ApiDropshipping sin afectar el flujo principal
 * de la tienda.
 *
 * - NO lanza errores críticos
 * - NO expone AliExpress al cliente
 * ======================================================
 */

/*const DROPSHIPPING_API_URL =
  process.env.DROPSHIPPING_API_URL || "http://localhost:4001";


export async function sendToDropshipping({ order }) {
  // 0) Seguridad: solo si está pagado
  if (order?.payment?.status !== "paid") return;

  // 1) Filtrar items AliExpress desde la orden real
  const dropshippingItems = (order.items || []).filter(
    (i) => i.provider === "aliexpress" && i.externalId
  );

  if (dropshippingItems.length === 0) return;

  const shippingAddress = order.shippingAddress;

  for (const item of dropshippingItems) {
    const payload = {
      shopOrderId: order._id.toString(),
      supplier: "aliexpress",

      product: {
        externalId: item.externalId,      // AliExpress product_id
        providerSku: item.providerSku,    // AliExpress ae_sku_id (si existe)
        title: item.name,
        price: item.price,
      },

      quantity: item.quantity,

      customer: {
        name: shippingAddress.fullName,
        email: order.guestEmail || null,
        address: {
          street: shippingAddress.street,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
        },
      },
    };

    try {
      await axios.post(`${DROPSHIPPING_API_URL}/api/supplier-orders`, payload);
    } catch (error) {
      console.error(
        "❌ Error sending order to dropshipping:",
        error.response?.data || error.message
      );
    }
  }
}
*/

const DROPSHIPPING_API_URL =
  process.env.DROPSHIPPING_API_URL || "http://localhost:4001";

export async function sendToDropshipping({ order }) {
  // 0️⃣ Seguridad absoluta
  if (!order) return;
  if (order.payment?.status !== "paid") return;
  if (order.dropshipping?.sent === true) return;

  // 1️⃣ Filtrar SOLO items AliExpress
  const items = (order.items || []).filter(
    (item) =>
      item.provider === "aliexpress" &&
      item.externalId
  );

  if (items.length === 0) {
    // Marcar como procesado aunque no haya dropshipping
    await Order.updateOne(
      { _id: order._id },
      { "dropshipping.sent": true, "dropshipping.sentAt": new Date() }
    );
    return;
  }

  // 2️⃣ Enviar item por item (modelo SupplierOrder)
  for (const item of items) {
    if (!item.providerSku) {
      console.warn(
        `[DROPSHIPPING] Missing providerSku for product ${item.externalId}`
      );
      continue; // no rompemos el resto
    }

    const payload = {
      shopOrderId: order._id.toString(),
      supplier: "aliexpress",

      product: {
        externalId: item.externalId,       // product_id
        sku: item.providerSku,             // ae_sku_id (CRÍTICO)
        title: item.name,
        price: item.price,
      },

      quantity: item.quantity,

      customer: {
        name: order.shippingAddress.fullName,
        email: order.guestEmail || null,
        address: {
          street: order.shippingAddress.street,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          postalCode: order.shippingAddress.postalCode,
          country: order.shippingAddress.country,
        },
      },
    };

    try {
      await axios.post(
        `${DROPSHIPPING_API_URL}/api/supplier-orders`,
        payload
      );
    } catch (err) {
      console.error(
        `[DROPSHIPPING] Failed for ${item.externalId}:`,
        err.response?.data || err.message
      );
    }
  }

  // 3️⃣ Marcar pedido como enviado a dropshipping
  await Order.updateOne(
    { _id: order._id },
    {
      "dropshipping.sent": true,
      "dropshipping.sentAt": new Date(),
    }
  );
}

export async function createSupplierOrder({ shopOrderId, item, customer }) {
  return axios.post(`${DROPSHIPPING_API_URL}/supplier-orders`, {
    shopOrderId,
    supplier: "aliexpress",
    product: {
      externalId: item.product.externalId,
      title: item.product.name,
      price: item.price,
    },
    quantity: item.quantity,
    customer,
  });
}


