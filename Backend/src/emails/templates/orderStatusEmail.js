export function orderStatusEmail(order) {
  let title = "";
  let message = "";

  switch (order.status) {
    case "processing":
      title = "Pedido en preparación";
      message = "Tu pedido está siendo preparado.";
      break;

    case "shipped":
      title = "Pedido enviado";
      message = "Tu pedido ha sido enviado y está en camino.";
      break;

    case "delivered":
      title = "Pedido entregado";
      message = "Tu pedido ha sido entregado. ¡Gracias por confiar en nosotros!";
      break;

    case "cancelled":
      title = "Pedido cancelado";
      message = "Tu pedido ha sido cancelado. Si tienes dudas, contáctanos.";
      break;

    default:
      return null; // No enviar email en otros estados
  }

  return {
    subject: `${title} — Pedido #${order._id}`,
    html: `
      <h2>${title}</h2>
      <p>${message}</p>
      <p><strong>Número de pedido:</strong> ${order._id}</p>
      <p><strong>Total:</strong> ${order.total.toFixed(2)} €</p>
    `,
  };
}
