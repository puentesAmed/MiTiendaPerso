// Backend/src/services/dropshipping.service.js
import axios from "axios";

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

const DROPSHIPPING_API_URL =
  process.env.DROPSHIPPING_API_URL || "http://localhost:4001";

/**
 * Envía los productos dropshipping de un pedido
 */
/*export async function sendToDropshipping({ order, items, shippingAddress }) {
  // 1️⃣ Filtrar solo productos AliExpress
  const dropshippingItems = items.filter(
    (item) => item.product?.provider === "aliexpress"
  );

  // Si no hay productos dropshipping → no hacer nada
  if (dropshippingItems.length === 0) {
    return;
  }

  // 2️⃣ Enviar cada producto como SupplierOrder
  for (const item of dropshippingItems) {
    const payload = {
      shopOrderId: order._id.toString(),
      supplier: "aliexpress",

      product: {
        externalId: item.product.externalId,
        title: item.product.title,
        sku: item.product.sku || null,
        price: item.price,
      },

      quantity: item.quantity,

      customer: {
        name: shippingAddress.fullName,
        email: order.email,
        phone: shippingAddress.phone,
        address: {
          street: shippingAddress.address,
          city: shippingAddress.city,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
        },
      },
    };

    try {
      await axios.post(
        `${DROPSHIPPING_API_URL}/api/supplier-orders`,
        payload
      );
    } catch (error) {
      // ⚠️ IMPORTANTE:
      // El pedido de la tienda NO falla aunque falle dropshipping
      console.error(
        "❌ Error sending order to dropshipping:",
        error.response?.data || error.message
      );
    }
  }
}
*/

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
