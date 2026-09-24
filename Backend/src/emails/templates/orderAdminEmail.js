import { getOrderItemVariant } from "../../utils/orderVariantAdapter.js";

export function orderAdminEmail(order) {
  return `
    <h2>Nuevo pedido recibido</h2>
    <p><strong>Pedido:</strong> #${order._id}</p>

    <p>
      <strong>Cliente:</strong>
      ${order.guestEmail || "Usuario registrado"}
    </p>

    <h3>Productos</h3>
    <ul>
      ${order.items
        .map(
          (i) =>
            `<li>
              ${i.name} × ${i.quantity}
              ${getOrderItemVariant(i)?.size ? ` — Talla: ${getOrderItemVariant(i).size}` : ""}
              ${getOrderItemVariant(i)?.color ? ` — Color: ${getOrderItemVariant(i).color}` : ""}
              — ${i.price.toFixed(2)} €
            </li>
            `
        )
        .join("")}
    </ul>

    <p><strong>Total:</strong> ${order.total.toFixed(2)} €</p>
  `;
}
