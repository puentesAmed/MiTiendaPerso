export function orderClientEmail(order) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  const email =
    order.guestEmail ||
    order.userId?.email ||
    "";

  const trackingUrl = `${frontendUrl}/seguimiento-pedido?orderId=${order._id}&email=${encodeURIComponent(
    email
  )}`;

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5">
      <h2>Gracias por tu pedido</h2>

      <p>
        Hemos recibido correctamente tu pedido.
      </p>

      <p>
        <strong>Número de pedido:</strong> ${order._id}
      </p>

      <p>
        <strong>Total:</strong> ${order.total.toFixed(2)} €
      </p>

      <h3>Productos</h3>
      <ul>
        ${order.items
          .map(
            (i) => `<li>${i.name} × ${i.quantity}</li>`
          )
          .join("")}
      </ul>

      <hr />

      <p>
        Puedes consultar el estado de tu pedido en cualquier momento desde este enlace:
      </p>

      <hr />

      <p>
      
      </p>
        Entrega estimada:  
        Entre ${order.shipping.estimatedDays.min} y ${order.shipping.estimatedDays.max} días laborables  
        Fecha aproximada: ${formatDate(order.shipping.estimatedDeliveryDate)}
      <p>

      <hr />
        <a
          href="${trackingUrl}"
          style="
            display: inline-block;
            padding: 12px 18px;
            background: #3182ce;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
          "
        >
          Ver estado de mi pedido
        </a>
      </p>

      <p style="font-size: 12px; color: #666">
        Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
        ${trackingUrl}
      </p>

      <p>
        Gracias por confiar en nosotros.
      </p>
    </div>
  `;
}
