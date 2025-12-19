export function orderClientEmail(order) {
  return `
    <h2>Pedido confirmado</h2>
    <p>Tu pedido <strong>#${order._id}</strong> se ha creado correctamente.</p>

    <h3>Resumen</h3>
    <ul>
      ${order.items
        .map(
          (i) =>
            `<li>
                ${i.name} × ${i.quantity}
                ${i.selectedVariant?.size ? ` — Talla: ${i.selectedVariant.size}` : ""}
                ${i.selectedVariant?.color ? ` — Color: ${i.selectedVariant.color}` : ""}
                — ${i.price.toFixed(2)} €
              </li>
              `
        )
        .join("")}
    </ul>

    <p><strong>Total:</strong> ${order.total.toFixed(2)} €</p>

    <h3>Dirección de envío</h3>
    <p>
      ${order.shippingAddress.fullName}<br/>
      ${order.shippingAddress.street}<br/>
      ${order.shippingAddress.postalCode} ${order.shippingAddress.city}
    </p>

    <p>Gracias por tu compra.</p>
  `;
}
