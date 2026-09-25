# SPEC-011 — Carrito Premium Compact

## Estado

**Estado:** cerrada — 28/28 criterios cumplidos.

## Objetivo

Rediseñar el carrito con la dirección `Premium Compact Commerce`: líneas densas y escaneables, información canónica de variante y personalización, operaciones exactas por `lineKey`, resumen separado y navegación clara hacia catálogo o checkout, sin cambiar negocio, backend ni contratos API.

## Estructura

- Desktop usa una columna principal de líneas y un resumen lateral compacto, sticky cuando el viewport lo permite.
- Mobile apila líneas y resumen sin ocultar información ni introducir accordions.
- Las líneas comparten una única superficie y evitan cards grandes o cajas anidadas.
- Cada línea prioriza imagen, nombre, variante, personalización, cantidad, importe visual y eliminación.

## Contrato CartLineV2

- La clave de React y todas las operaciones de línea usan `lineKey`.
- Se leen exclusivamente `presentation`, `variant`, `customization` y `quantity` del contrato vigente.
- Cantidad llama `updateQuantity(lineKey, quantity)` y eliminar llama `removeItem(lineKey)`.
- No se muestran ni reintroducen `skuId`, `providerSku`, `externalId`, `provider` u otros campos legacy.
- `CartContext`, persistencia guest/autenticada y adaptación para checkout permanecen sin cambios.

## Presentación

- `ProductImage` aporta imagen compacta, proporción estable y fallback.
- `Price` formatea subtotal e importe estimado de cada línea.
- Talla y color se presentan solo cuando existen, en una línea textual compacta.
- Una personalización muestra badge textual, preview pequeño cuando existe, hasta dos textos y acceso a edición con el `lineKey`, variante y payload actuales.
- Cantidad usa controles `[-] cantidad [+]`, con mínimo 1 y targets táctiles accesibles.
- Eliminar es una acción discreta con icono Lucide y nombre accesible específico.

## Resumen y navegación

- El resumen muestra número de artículos, subtotal estimado y `Envío calculado en checkout`.
- No se presenta un coste de envío ni un total definitivo inventados.
- El CTA principal es `Continuar al checkout` y conserva la ruta existente `/checkout`.
- `Seguir comprando` y el empty state navegan a la ruta real `/productos`.
- Se conserva `Vaciar carrito` como acción secundaria existente, sin añadir un modal nuevo.

## Estados y accesibilidad

- Carrito vacío usa `EmptyState` con CTA `Ver productos`.
- Controles tienen foco visible, iconos decorativos ocultos y labels accesibles.
- Variante y personalización no dependen únicamente del color.
- Light/dark usan tokens del design system y no se añaden animaciones ni dependencias.

## Criterios de aceptación

- [x] **CA-01.** El carrito sigue la dirección Premium Compact Commerce con líneas densas y sin cards repetitivas sobredimensionadas.
- [x] **CA-02.** Desktop presenta líneas a la izquierda y resumen lateral separado a la derecha.
- [x] **CA-03.** Mobile apila contenido y resumen sin ocultar información importante.
- [x] **CA-04.** Cada línea usa `lineKey` como key e identidad de todas sus operaciones.
- [x] **CA-05.** Variantes del mismo producto permanecen en líneas independientes.
- [x] **CA-06.** Personalizaciones con distinto `clientId` permanecen en líneas independientes.
- [x] **CA-07.** La UI lee nombre, imagen y precio visual desde `presentation`.
- [x] **CA-08.** La imagen usa `ProductImage`, proporción compacta y fallback existente.
- [x] **CA-09.** Talla y color solo aparecen cuando tienen valor y no muestran campos legacy.
- [x] **CA-10.** La personalización se resume sin expandir toda la configuración y conserva el flujo de edición actual.
- [x] **CA-11.** Cantidad modifica exclusivamente la `lineKey` objetivo y respeta el mínimo 1.
- [x] **CA-12.** Eliminar afecta exclusivamente la `lineKey` objetivo y tiene nombre accesible.
- [x] **CA-13.** `Price` representa el importe visual de línea y el subtotal estimado.
- [x] **CA-14.** El resumen muestra número de artículos y subtotal estimado.
- [x] **CA-15.** El envío se comunica como calculado en checkout, sin inventar coste ni total definitivo.
- [x] **CA-16.** El CTA principal dice `Continuar al checkout` y usa la ruta existente.
- [x] **CA-17.** `Seguir comprando` navega al catálogo mediante una ruta real.
- [x] **CA-18.** El carrito vacío usa `EmptyState` con acceso al catálogo.
- [x] **CA-19.** El resumen sticky solo se activa en desktop y no tapa el footer.
- [x] **CA-20.** No existe overflow a 320, 375, 768, 1024 y 1440 px.
- [x] **CA-21.** Líneas, resumen, controles y empty state funcionan en light y dark mode.
- [x] **CA-22.** Foco, contraste, labels y targets táctiles cumplen accesibilidad básica.
- [x] **CA-23.** Persistencia guest y autenticada, así como el payload existente de checkout, no cambian.
- [x] **CA-24.** No se modifican backend, Checkout, shipping, pagos ni módulos fuera de alcance.
- [x] **CA-25.** No se añaden dependencias, Magic UI ni animaciones pesadas.
- [x] **CA-26.** `npm run lint` finaliza correctamente.
- [x] **CA-27.** `npm run build` finaliza correctamente.
- [x] **CA-28.** `git diff --check` finaliza correctamente.

## Fuera de alcance

Backend, Checkout, shipping, pagos, ProductDetail, catálogo, Global Search, Home, Admin, ProductDesigner, AliExpress, dropshipping, MONEI y cualquier cambio al contrato `CartLineV2`.

## Validación

- Carrito vacío, una línea, varias líneas y refresh.
- Mismo producto con variantes diferentes y personalizaciones distintas.
- Incremento, decremento y eliminación exactos por `lineKey`.
- Edición de personalización y navegación a checkout.
- Persistencia guest y autenticada sin cambios estructurales.
- Light/dark y 320, 375, 768, 1024 y 1440 px.
- `npm run lint`, `npm run build` y `git diff --check`.
