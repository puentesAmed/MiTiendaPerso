# SPEC-013 — Cuenta, Mis pedidos y seguimiento Premium Compact

## Estado

**Estado:** en implementación.

**Dependencias:** SPEC-002, SPEC-003 y SPEC-012 cerradas.

## Objetivo

Modernizar la experiencia autenticada de cuenta y pedidos con la dirección `Premium Compact Commerce`, preservando los snapshots históricos, estados y contratos de negocio. El usuario debe poder listar exclusivamente sus pedidos, abrir un detalle compacto y volver a consultar de forma segura las instrucciones de un pago manual pendiente.

## Inspección inicial

- La única ruta de cuenta implementada es `/mis-pedidos`; no existe Perfil ni una ruta de detalle de usuario.
- El header enlaza a `/mis-pedidos`, pero no existe un shell de cuenta propio.
- `GET /api/orders/mine` exige JWT, filtra por `userId` y ordena por `createdAt: -1`.
- No existe endpoint autenticado de detalle para el propietario.
- El listado devuelve documentos `Order` completos y no expone `paymentInstructions`.
- Las instrucciones no se persisten en Order; se construyen desde el pedido persistido y la configuración backend mediante `buildManualPaymentInstructions`.
- Los estados logísticos reales son `created`, `processing`, `shipped`, `delivered` y `cancelled`.
- Los estados de pago reales son `pending`, `paid`, `failed` y `refunded`, con `paymentStatus` como fallback legacy.
- Los métodos manuales actuales son `bizum` y `bank_transfer`; el esquema conserva métodos históricos para lectura.
- Cada línea guarda nombre, precio, cantidad y variante como snapshot. `variant` es canónico y `selectedVariant` es fallback histórico.
- Order persiste total y shipping, pero no subtotal. El detalle lo deriva en backend exclusivamente desde `total - shipping.price`, sin consultar catálogo ni recalcular pricing.
- La personalización está vinculada por `customizationId`; su preview y textos se reducen a un DTO de presentación.
- Los guest orders pueden vincularse al crear una cuenta, pero no existe recuperación posterior autenticada propia para invitados. Crear una recuperación guest queda fuera de alcance.

## Alcance

1. Shell compacto de cuenta con navegación únicamente a rutas reales.
2. Listado de pedidos autenticado con estados, fecha, artículos, total y método.
3. Detalle autenticado de pedido con snapshot de líneas, importes y dirección.
4. Recuperación segura de instrucciones manuales pendientes.
5. Estados empty, loading y error diferenciados.
6. Responsive, dark mode y accesibilidad.

## Contrato backend mínimo

Se añade:

```http
GET /api/orders/mine/:id
Authorization: Bearer <token>
```

Reglas:

- requiere autenticación;
- valida el identificador;
- consulta por `{ _id: id, userId: req.userId }`;
- un pedido ajeno o inexistente responde 404 sin revelar ownership;
- no acepta `userId` desde frontend;
- devuelve `order`, `summary` y `paymentInstructions`;
- `summary` deriva subtotal, shipping y total solo de importes históricos del pedido;
- `paymentInstructions` solo se construye para `pending` con `bizum` o `bank_transfer`;
- un pago pagado/fallido/reembolsado no devuelve instrucciones;
- configuración manual no disponible no impide consultar el pedido: devuelve instrucciones nulas.

## UI

### Cuenta

`AccountShell` presenta cabecera y navegación compacta. Como Perfil no existe, solo muestra `Mis pedidos`; no crea pantallas ficticias ni duplica el header global.

### Listado

Cada fila compacta muestra `_id`, fecha, número de artículos, total, estado del pedido, estado del pago, método y `Ver pedido`. Se conserva el orden backend más reciente primero.

### Detalle

- referencia, fecha y badges de estados reales;
- líneas con fallback de imagen, nombre, `variant ?? selectedVariant`, personalización, cantidad e importe histórico;
- resumen backend de subtotal derivado, shipping almacenado y total almacenado;
- snapshot de dirección de entrega;
- método y estado de pago;
- instrucciones backend y copia accesible de destinatario, IBAN y referencia cuando estén presentes;
- no incluye timeline, carrier, tracking ni CTA de pago online.

## Compatibilidad

- Métodos y estados legacy siguen siendo legibles mediante etiquetas de presentación.
- `payment.status ?? paymentStatus` conserva compatibilidad.
- `payment.method ?? paymentMethod` conserva lectura histórica.
- `variant ?? selectedVariant` conserva pedidos antiguos.
- La UI no consulta productos actuales para reconstruir nombres, precios o importes.

## Fuera de alcance

- Perfil, edición de cuenta y nuevos campos de usuario.
- Recuperación posterior de pedidos guest.
- Tracking de transportista o timeline simulado.
- Admin, Checkout, pricing, shipping, stock, emails, AliExpress, dropshipping y MONEI.

## Criterios de aceptación

- [ ] **CA-01.** Cuenta usa un shell compacto y solo navegación real.
- [ ] **CA-02.** Mis pedidos presenta un listado compacto ordenado por backend.
- [ ] **CA-03.** Listado muestra referencia, fecha, artículos, total, estados y método reales.
- [ ] **CA-04.** Estados logísticos usan exclusivamente valores soportados.
- [ ] **CA-05.** Estados de pago usan exclusivamente valores soportados y texto visible.
- [ ] **CA-06.** Sin pedidos usa `EmptyState` con CTA `Ver productos`.
- [ ] **CA-07.** Loading usa skeleton compacto y anuncio accesible.
- [ ] **CA-08.** Error usa `ErrorState` con reintento.
- [ ] **CA-09.** Existe detalle navegable desde cada pedido.
- [ ] **CA-10.** Detalle usa snapshots históricos y no catálogo actual.
- [ ] **CA-11.** Variantes usan `variant` con fallback `selectedVariant`.
- [ ] **CA-12.** Personalización se resume sin abrir el editor.
- [ ] **CA-13.** Resumen muestra subtotal derivado por backend, shipping y total históricos.
- [ ] **CA-14.** Dirección usa el snapshot almacenado en Order.
- [ ] **CA-15.** Método de pago representa métodos manuales actuales e históricos legibles.
- [ ] **CA-16.** Pending manual recupera instrucciones desde backend autenticado.
- [ ] **CA-17.** Paid no muestra instrucciones ni CTA de pago.
- [ ] **CA-18.** Endpoint valida autenticación y ownership en backend.
- [ ] **CA-19.** Pedido ajeno responde 404 sin filtrar datos.
- [ ] **CA-20.** Recuperación guest queda documentada fuera de alcance.
- [ ] **CA-21.** No existe tracking, carrier o timeline ficticio.
- [ ] **CA-22.** No existe pago online ni botón `Pagar ahora`.
- [ ] **CA-23.** No hay overflow a 320, 375, 768, 1024 y 1440 px.
- [ ] **CA-24.** Light/dark usa tokens semánticos.
- [ ] **CA-25.** Headings, foco, links, badges, errores, loading y copy actions son accesibles.
- [ ] **CA-26.** MONEI, AliExpress y dropshipping permanecen fuera del flujo.
- [ ] **CA-27.** Tests backend localizados pasan.
- [ ] **CA-28.** `npm run lint` pasa.
- [ ] **CA-29.** `npm run build` pasa.
- [ ] **CA-30.** `git diff --check` pasa.

