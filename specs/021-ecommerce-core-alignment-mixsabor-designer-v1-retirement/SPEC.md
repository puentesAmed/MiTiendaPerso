# SPEC-021 — Ecommerce Core Alignment with MixSabor & Designer V1 Retirement

## Estado

Activa. Implementación dirigida sobre el contrato actual de MiTiendaPerso, usando RicoSaborCubanoMiLuGui (MixSabor) como referencia conceptual y funcional.

## Objetivo

Restaurar el ecommerce invitado completo, retirar Designer V1 del runtime, consolidar carrito/checkout y añadir shipping autoritativo configurable, pagos manuales administrables y el cupón porcentual pertinente de MixSabor, sin romper Designer V2 ni SPEC-020I.

## Matriz comparativa

| Subsistema | MiTiendaPerso | MixSabor | Reutilizar | Adaptar / descartar |
|---|---|---|---|---|
| Identidad y carrito | `CartLineV2`, `lineKey`, storage separado por usuario y sesión guest; dos implementaciones de guest session; sin adopción guest→user | Store reactivo versionado, identidad activa, adopción guest segura y aislamiento entre usuarios | Normalización/persistencia de MiTiendaPerso y reglas de adopción de MixSabor | Consolidar guest session; no copiar el modelo Angular ni su contrato de producto |
| UX Add to Cart | Dialog solo en primer producto; badge sin pulso | Estado añadir/éxito/error, fly-to-cart, pulso del target, reduced motion | Fly/pulse y feedback no bloqueante | Implementación React ligera con Web Animations; descartar CSS/Angular específico |
| Cart page | Página responsive compacta, quantity/remove/empty state ya funcional | UX madura, stock feedback y cupón | Mantener página y contrato destino; añadir feedback/cupón | No copiar HTML/CSS completo ni pricing de customizations de MixSabor |
| Guest commerce | Backend admite guest; frontend protege carrito, checkout y confirmación accidentalmente | Compra guest nativa | Rutas públicas y conservación del carrito ante error | Cuenta, pedidos privados y Admin siguen protegidos |
| Designer | V1 y V2 activos; CTA/fallback V1; checkout edita por V1 | No equivalente | Mantener solo V2 registrado por template | Código V1 queda dormido, sin import, ruta ni chunk |
| Shipping | Motor autoritativo por zonas España, importes hardcoded | Geocode ORS→Nominatim, ruta por carretera, cache/fallback y bandas locales | Separación motor/config, cache y fallback de proveedor | Mantener reglas comerciales actuales; activar distancia solo con configuración MiTiendaPerso; no copiar origen/bandas de MixSabor |
| Payment methods | Bizum/transferencia desde ENV; API pública ya existe | Documento único persistente, bootstrap ENV, cache, validación y Admin | Documento canónico, bootstrap, cache, public/admin DTO | Solo Bizum y transferencia; descartar efectivo y MONEI |
| Coupons | No existe | `PRIMER10`, porcentual, primera compra, backend autoritativo, draft por identidad | Tipo porcentual y validación first-order | Añadir persistencia/Admin pedidos por esta SPEC; no añadir fixed ni reglas no solicitadas |
| Checkout | Guest UI ya implementada pero ruta protegida; shipping/payment backend; sin cupón; edición fuerza V1 | Draft persistente, cupón, quote y resumen subtotal→descuento→envío→total | UX de cupón y orden de cálculo | Mantener React/Tailwind y CartLineV2; no copiar checkout Angular |
| Order creation | Backend recalcula producto, variante, stock, shipping y pago; SPEC-020I integrada | Snapshot de cupón/pago y cálculo único autoritativo | Snapshot e invariantes de cálculo | Mantener modelo/flujo de Customization; no portar reservas/idempotencia global fuera de alcance |
| Confirmation | Recibe order e instrucciones de pago actuales | Snapshot histórico de pago/descuento | Snapshot en Order/respuesta | No consultar configuración mutable para pedidos históricos |

## Decisiones

1. Designer V1 se conserva físicamente, pero no tendrá import, lazy route, CTA, redirect ni referencia runtime.
2. `/carrito`, `/checkout` y `/confirmacion-pedido` serán públicas; cuenta, pedidos privados y Admin continúan protegidos.
3. Se conserva `CartLineV2`. Guest→user adopta y fusiona solo después de persistir destino; user→guest y user A→B no copian.
4. Shipping mantiene precios/zonas actuales como configuración comercial. Un motor opcional por distancia se habilita exclusivamente mediante ENV de MiTiendaPerso y cae al motor zonal si no está configurado o el proveedor falla.
5. Pago usa documento persistente con bootstrap manual/idempotente desde ENV. La API pública nunca expone detalles sensibles; la creación congela instrucciones.
6. Cupones soportan exclusivamente `percent`, incluyendo el caso `PRIMER10` first-order. Se admiten enabled, fechas, mínimo y límite solicitados; no existe tipo fixed en esta SPEC.
7. Orden de cálculo único: subtotal autoritativo de items → descuento autoritativo de cupón → shipping calculado sobre subtotal descontado → total. El cliente no puede declarar descuentos, shipping ni total.

## Contratos

### PaymentSettings

Documento único con `bizum` y `bankTransfer`: enabled, displayName, instructions, recipient/details, sortOrder, updatedAt/updatedBy. El DTO público devuelve únicamente métodos habilitados y textos necesarios para checkout.

### Coupon

`code`, `type: percent`, `value`, `enabled`, `firstOrderOnly`, `minimumSubtotal`, `startsAt`, `endsAt`, `maxUses`, `usageCount`, timestamps. Order congela code/type/value/discountAmount.

### Shipping

Quote añade `subtotal`, `discountAmount`, `discountedSubtotal`, `price`, `total`, zona y, cuando proceda, distancia/fuente. Cache por dirección normalizada. Las reglas comerciales permanecen en configuración propia.

## Seguridad

- Precios, cupón, shipping, pago y total se recalculan en backend.
- Endpoints Admin requieren auth/admin.
- MONEI, AliExpress y dropshipping permanecen dormidos.
- Configuración pública de pago no devuelve secretos ni paths internos.

## Criterios de aceptación

- No existe ruta/import/chunk/CTA Designer V1; V2 funciona para taza/camiseta.
- Guest abre carrito/checkout/confirmación, crea pedidos y mantiene carrito ante error.
- Carrito conserva CartLineV2, identidades aisladas y feedback accesible/reduced motion.
- Shipping tiene cache/fallback y backend recalcula.
- Admin gestiona Bizum/transferencia; checkout solo muestra enabled; Order congela instrucciones.
- Cupón percent se valida en backend, se muestra en checkout y queda congelado en Order.
- SPEC-020I y ZIP/Admin de producción continúan pasando tests.

## Fuera de alcance

Copiar carpetas completas, nuevos proveedores cloud, efectivo, MONEI, cupones fixed, reservas de pago/stock de MixSabor, migración destructiva, borrado físico V1 y QA visual exhaustivo.
