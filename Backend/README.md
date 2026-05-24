# Backend - Arquitectura de pagos

## Arquitectura de pagos

- `order.status` representa el **estado operativo/logístico** del pedido.
- `order.payment.status` representa el **estado real del pago** (`pending`, `paid`, `failed`, `refunded`).
- `order.payment.provider` identifica la fuente del pago:
  - ahora: `manual` (confirmación desde admin) o `null` en pedidos nuevos sin pasarela.
  - futuro: `monei`.
- `order.payment.providerPaymentId` queda reservado para IDs de pasarela (futuro MONEI).
- `order.payment.metadata` almacena datos auxiliares del proveedor.
- `paymentStatus` se mantiene como campo **legacy/fallback** de compatibilidad ligera.

### Reglas de separación

- Confirmar pago manual **no cambia** automáticamente `order.status`.
- Cambiar `order.status` (operativa) **no cambia** `order.payment.status`.
- La futura integración MONEI debe actualizar el mismo bloque `payment` como fuente única del estado de pago.
