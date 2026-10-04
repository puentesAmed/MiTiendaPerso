# SPEC-022B — Customization Surfaces & Pricing

## Objetivo

Permitir que un producto personalizable declare superficies comerciales, selección 1..N y modificadores autoritativos, empezando por la camiseta. La geometría permanece en `ProductTemplate`; el producto almacena disponibilidad y pricing.

## Auditoría previa

- `Product.price` es el precio base local. Talla/color son listas simples en `Product.variants`; no existe precio por variante local.
- `resolveAuthoritativeOrderLines` valida talla/color, relee `Product.price`, calcula subtotal y congela ese importe en `Order.items[].price`.
- Mongo contiene camiseta a 19,90 €, taza a 12,50 € y sudadera a 34,90 €. Ningún producto contiene configuración comercial ni modificadores de superficies verificados.
- La camiseta usa `tshirt-basic-v1` con superficies declarativas `tshirt-front`, `tshirt-back`, `tshirt-left-sleeve`, `tshirt-right-sleeve` y vistas `front`, `back`, `sleeve-left`, `sleeve-right`.
- ProductDetail selecciona talla/color y transporta la variante mediante route state. No selecciona superficies ni cotiza personalización.
- Designer V2 resuelve el template completo, inicializa todas sus vistas y el dominio opera contra la vista activa.
- `DesignDocument` contiene template, variante, assets y vistas; drafts validan producto/template/revisión/variante.
- `CartLineV2` identifica producto, variante y `customization.clientId`; checkout envía solo producto, cantidad, variante y customization.
- El handoff y backend V2 exigen actualmente todas las vistas del template y generan artwork/proof/placement para todas ellas.
- Admin producto usa campos normales para datos básicos, pero un JSON legacy no persistido para `customizationConfig`; `Product` no tiene ese campo.

`selectedSurfaceIds` pertenece al contrato explícito de la personalización y al `DesignDocument`: define el subconjunto editorial contratado, participa en drafts, carrito, pedido y producción. No se introduce pricing en ProductTemplate.

## Compatibilidad y decisión comercial

No existen precios verificados en Mongo. No se asigna ningún modificador ni se presupone que frontal está incluido.

- Productos con `customizationPricing` configurado: solo son comercialmente seleccionables superficies `enabled` cuyo `priceModifier` sea un número finito no negativo. `0` significa “Incluido” porque fue configurado explícitamente.
- Producto actual sin configuración: no expone nueva selección comercial ni habilita el CTA nuevo hasta que Admin lo configure.
- Payloads/drafts/pedidos V2 históricos sin `selectedSurfaceIds` mantienen el comportamiento legacy: todas las superficies del template y precio base histórico, sin inventar snapshot de modifiers.
- No se modifica la sudadera ni se crea template productivo para ella.

## Modelo comercial

`Product.customizationPricing`:

```js
{
  enabled: Boolean,
  surfaces: [{
    surfaceId: String,
    enabled: Boolean,
    required: Boolean,
    priceModifier: Number | null
  }]
}
```

Los IDs deben pertenecer al template productivo del producto, no pueden repetirse y los modifiers presentes son finitos y no negativos. Una superficie required debe estar enabled. Admin presenta todas las superficies del template con label humano.

## Selección y quote

El endpoint `POST /api/products/:productId/customization-quote` recibe variante y `selectedSurfaceIds`. Backend valida variante, selección no vacía, duplicados, IDs, enabled, modifier conocido y required. Devuelve:

```js
{
  basePrice,
  customizationAmount,
  unitPrice,
  currency: "EUR",
  selectedSurfaces: [{ surfaceId, label, priceModifier }]
}
```

El frontend usa el quote solo para presentación. `resolveAuthoritativeOrderLines` vuelve a resolver el mismo contrato desde Mongo e ignora prices/modifiers/totales enviados por el navegador.

## ProductDetail y Designer V2

ProductDetail mantiene el orden talla, color, superficies, precio y CTA. Solo muestra superficies comercialmente disponibles. `0` se presenta como “Incluido”; `null` no está disponible.

Designer recibe `selectedSurfaceIds` por route state y los congela en `DesignDocument`. El template de sesión se reduce declarativamente a las vistas cuyas `printSurface.id` fueron contratadas. Las acciones de dominio no pueden operar sobre vistas ausentes. Un draft solo es compatible si producto, template, revisión, variante y selección coinciden.

## CartLineV2 y pedido

La personalización V2 conserva `selectedSurfaceIds` y un snapshot informativo del quote. La identidad del carrito incluye la selección ordenada además de `clientId`, por lo que combinaciones distintas no colisionan.

Backend congela por item:

- `basePrice`;
- `selectedSurfaceIds`;
- `customizationAmount`;
- modifiers/labels aplicados;
- `price` como unitPrice autoritativo final;
- variante y `customizationId` existentes.

Productos no personalizables y líneas históricas sin selección conservan el cálculo actual.

## Producción y Admin

Customization V2 congela selección y pricing. Backend exige que `DesignDocument.selectedSurfaceIds`, payload, línea autoritativa y conjunto de vistas coincidan. Solo genera artifacts para las superficies seleccionadas y rechaza contenido/vistas fuera de contrato.

Admin pedido muestra selección y cantidad de personalización desde el snapshot del item. Admin producción muestra las superficies realmente producidas y el snapshot de pricing, sin nueva pantalla.

## Fuera de alcance

Fuentes, formas, productos nuevos, sudadera productiva, pagos, shipping, rediseño general del carrito, eliminación de Designer V1 y providers externos de pricing.

## Criterios de aceptación

- Configuración comercial declarativa validada contra ProductTemplate.
- Quote backend autoritativo y selección requerida/disabled/duplicada/inexistente cubierta.
- ProductDetail selecciona superficies y muestra precio cotizado.
- Designer y drafts operan solo sobre la selección contratada.
- CartLineV2 diferencia combinaciones y muestra selección.
- Order congela precio base, modifiers, selección y unitPrice.
- Producción genera exclusivamente superficies contratadas.
- Compatibilidad histórica explícita sin inventar precios.
- Admin configura superficies con campos normales.
- Tests específicos, lint/build/check y `git diff --check` pasan.
