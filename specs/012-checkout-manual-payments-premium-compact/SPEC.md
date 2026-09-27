# SPEC-012 — Checkout Bizum / Transferencia Premium Compact

## Estado

**Estado:** cerrada y validada (23/23) el 27 de septiembre de 2026.

**Dependencias:** SPEC-002 (checkout seguro y pagos manuales) y SPEC-011 (lenguaje visual del carrito).

## Objetivo

Rediseñar Checkout y OrderConfirmation con la dirección `Premium Compact Commerce`, sin cambiar contratos ni autoridad de negocio. El backend continúa siendo la única autoridad para precios, subtotal, shipping y total. Los únicos métodos visibles son los que devuelve `GET /api/payments/manual/methods`; MONEI permanece dormido.

## Alcance

- Checkout compacto, responsive y accesible para invitado y usuario autenticado.
- Dirección de envío y facturación agrupadas con labels y errores próximos.
- Cotización autoritativa existente con estados loading/error/resultado.
- Resumen compacto de líneas, variantes, personalización, subtotal, envío y total.
- Selector radio accesible para Bizum y transferencia, generado desde backend.
- Creación protegida frente a doble submit y limpieza del carrito solo tras éxito.
- Confirmación con referencia, total servidor, estado pendiente e instrucciones devueltas por backend.
- Copia opcional de destinatario, IBAN y concepto mediante Clipboard API, sin dependencias.

## Fuera de alcance

- Backend, pricing, fórmula de shipping, auth, Cart, catálogo, Admin y emails.
- Persistencia de las instrucciones tras recargar la confirmación: `location.state` sigue siendo la única fuente segura disponible y no se reconstruyen datos sensibles en frontend.
- AliExpress, dropshipping y MONEI.

## Contratos preservados

- La cotización usa `getShippingQuoteRequest(items, shippingAddress)` y presenta su respuesta como estimación previa a crear el pedido.
- La creación usa `createOrderRequest` sin enviar subtotal, shipping ni total como autoridad.
- La respuesta consume `order`, `orderId` y `paymentInstructions`.
- El total definitivo mostrado en confirmación procede de `paymentInstructions.amount` o `order.total`, ambos devueltos por el servidor.
- El pedido nuevo permanece `pending`; la UI lo expresa como `Pendiente de pago`, sin semántica de error.

## Estructura y comportamiento

### Desktop

Dos columnas desde `lg`: formulario a la izquierda y resumen lateral sticky a la derecha. El formulario mantiene datos de cliente, dirección, método, términos y CTA. El resumen no replica cards completas.

### Mobile

Una sola columna, en este orden: datos, dirección, pago, resumen, términos y `Confirmar pedido`. No hay columnas comprimidas ni overflow intencionado.

### Métodos manuales

- Se representan únicamente los métodos recibidos del endpoint.
- Bizum y transferencia incluyen una explicación breve que no revela datos sensibles.
- Cero métodos o error de carga deshabilitan la confirmación y muestran un estado explícito.
- El CTA nunca promete pago online.

### Confirmación

- Presenta pedido creado, referencia, total, método y badge `Pendiente de pago`.
- Bizum muestra exclusivamente destinatario, concepto, importe e instrucciones recibidos.
- Transferencia muestra exclusivamente titular, IBAN, concepto, importe e instrucciones recibidos.
- Los valores copiables conservan wrapping para IBAN, email y referencias largas.

## Validación prevista

- Viewports: 320, 375, 768, 1024 y 1440 px.
- Temas: light y dark usando tokens semánticos.
- Teclado, foco visible, labels, errores asociados, radios nativos, estados live y botones de copia con feedback.
- Sin nuevas dependencias, Magic UI ni animaciones pesadas.

## Criterios de aceptación

- [x] **CA-01.** Checkout compacto y coherente con Premium Compact Commerce.
- [x] **CA-02.** Dirección usable, agrupada y responsive.
- [x] **CA-03.** Shipping autoritativo de SPEC-002 permanece intacto.
- [x] **CA-04.** Resumen muestra artículos, subtotal, envío y total/estimación coherentes.
- [x] **CA-05.** Métodos de pago se obtienen dinámicamente del backend.
- [x] **CA-06.** Bizum habilitado se representa como opción accesible.
- [x] **CA-07.** Transferencia habilitada se representa como opción accesible.
- [x] **CA-08.** Cero métodos bloquea la creación y muestra explicación.
- [x] **CA-09.** CTA usa exactamente `Confirmar pedido`.
- [x] **CA-10.** Doble submit queda protegido durante la creación.
- [x] **CA-11.** Estado `Pendiente de pago` es visible y no usa semántica de error.
- [x] **CA-12.** Confirmación usa únicamente instrucciones recibidas del backend.
- [x] **CA-13.** Confirmación comparte el lenguaje visual compacto y premium.
- [x] **CA-14.** Layout preparado para 320, 375, 768, 1024 y 1440 sin columnas mobile comprimidas.
- [x] **CA-15.** Light/dark dependen de tokens semánticos existentes.
- [x] **CA-16.** Labels, errores, radio, teclado, foco, live regions y copia son accesibles.
- [x] **CA-17.** MONEI permanece ausente y dormido.
- [x] **CA-18.** No hay cambios backend.
- [x] **CA-19.** Smoke real Bizum, transferencia, cero métodos, guest y autenticado completado.
- [x] **CA-20.** Revisión visual real en todos los viewports y ambos temas completada.
- [x] **CA-21.** `npm run lint` finaliza correctamente.
- [x] **CA-22.** `npm run build` finaliza correctamente.
- [x] **CA-23.** `git diff --check` finaliza correctamente.

## Regresiones SPEC-002

La implementación no cambia servicios ni backend: siguen vigentes el recálculo servidor de precios, shipping y total; la allowlist de métodos habilitados; el estado inicial pending; el contrato CartLineV2; y la limpieza del carrito posterior a una respuesta correcta. La validación funcional completa de esas garantías corresponde a los tests backend existentes de SPEC-002 y al smoke real indicado.
