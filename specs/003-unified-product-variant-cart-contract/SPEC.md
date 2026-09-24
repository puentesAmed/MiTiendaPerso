# SPEC-003 — Contrato unificado de producto, variante y carrito

## 1. Estado

**Estado:** implementada y validada.

**Dependencias:** SPEC-001 y SPEC-002 cerradas. El ecommerce local funciona con AliExpress, dropshipping y MONEI dormidos; backend continúa siendo autoridad de precio, stock, shipping y total.

Esta SPEC define el contrato local común entre producto, selección de variante, personalización, carrito, checkout y snapshot de pedido.

## 2. Objetivo

Establecer un único flujo contractual:

```text
Product local
    ↓
selección en ProductDetail
    ↓
adaptador único de línea
    ↓
CartContext
    ↓
Cart / Checkout
    ↓
DTO mínimo de pedido
    ↓
validación backend contra Product
    ↓
snapshot coherente en Order.items
```

El contrato debe:

- distinguir variantes y personalizaciones sin depender de campos de proveedor;
- permitir operaciones exactas sobre una sola línea;
- preservar de forma tolerante carritos legacy válidos;
- mantener legibles pedidos históricos;
- conservar el backend como autoridad de disponibilidad, stock y precio;
- evitar un sistema genérico de SKU que el modelo local actual no soporta.

## 3. Problemas confirmados en código

1. `CartContext.addItem(product, quantity, variant, customization)` recibe argumentos cuyo significado cambia entre ProductDetail, ProductDesigner y ProductCard.
2. La identidad actual de alta usa `productId + skuId`, aunque el producto local no tiene SKU; dos tallas/colores locales producen normalmente el mismo `skuId = null`.
3. Cuando encuentra una línea y recibe `variant` o personalización, `addItem` sobrescribe datos de esa línea en vez de distinguir una selección o diseño diferente.
4. `removeItem` y `updateQuantity` reciben solo `productId`, por lo que afectan a todas las variantes/personalizaciones del mismo producto.
5. Cart y Checkout renderizan con `key={productId}` y leen `selectedVariant`, mientras el estado también mantiene `skuId` y `variantAttributes`.
6. ProductDetail ya construye para producto local `{ selectedVariant: { size, color } }`, pero CartContext conserva además la forma externa de `variant`; ProductDesigner añade personalización sin selección de variante.
7. El carrito autenticado persiste bajo `miTienda_cart_v1_<userId>`; el invitado vive dentro de `guest_session_v1`. Ninguno adapta o valida las líneas al restaurarlas.
8. `Order.items` conserva `selectedVariant`, `providerSku` y campos externos; SPEC-002 valida talla/color contra `Product.variants`, pero el frontend todavía no tiene una única forma canónica.

## 4. Límites de dominio

### 4.1 Core local

El contrato nuevo se diseña para `Product` local:

- precio numérico a nivel de producto;
- stock numérico global a nivel de producto;
- `variants.sizes: string[]`;
- `variants.colors: string[]`;
- `customizable`, áreas y tipo de personalización;
- `image` e `images` para presentación.

El modelo **no** representa actualmente:

- SKU local por combinación;
- identificador persistente de variante;
- precio por variante;
- stock por talla/color o por combinación;
- catálogo genérico de atributos.

Esta SPEC no inventará esos conceptos. Una variante local es una selección validada de talla y color sobre listas del producto, no una nueva entidad de base de datos.

### 4.2 Compatibilidad externa

`provider`, `externalId`, `supplierId`, `skuId`, `providerSku` y `variantAttributes` quedan clasificados como legacy/externos. No se eliminan de modelos, datos ni adaptadores históricos, pero no forman parte del contrato activo de líneas locales v2.

AliExpress y dropshipping permanecen dormidos. Una línea externa legacy no se convierte silenciosamente en producto local.

## 5. Clasificación de datos de Product

### 5.1 Identidad y selección

Datos necesarios para identificar la intención del usuario:

- `productId` estable;
- `variant.size` cuando `Product.variants.sizes` no está vacío;
- `variant.color` cuando `Product.variants.colors` no está vacío;
- identidad cliente de personalización cuando existe.

### 5.2 Presentación

Datos que el carrito puede guardar como snapshot visual:

- nombre;
- imagen principal;
- `displayPrice` estimado;
- indicador de que el producto requiere personalización.

Estos valores permiten renderizar el carrito sin volver a solicitar el catálogo, pero no son autoridad de negocio.

### 5.3 Autoridad backend

Nunca son autoridad los valores persistidos en carrito para:

- precio vendible;
- disponibilidad/estado activo;
- stock;
- validez actual de talla/color;
- subtotal, shipping o total.

SPEC-002 continúa vigente: cotización y pedido resuelven otra vez `Product` y recalculan todo.

## 6. Contrato canónico de variante local

Forma única:

```js
variant: null
```

o:

```js
variant: {
  size: "M" | null,
  color: "Negro" | null
}
```

Reglas:

- producto sin tallas ni colores: `variant = null`;
- solo talla: `{ size: valor, color: null }`;
- solo color: `{ size: null, color: valor }`;
- talla y color: ambos valores presentes;
- los valores conservan exactamente el token publicado por `Product`; no se traducen ni cambian de mayúsculas en el carrito;
- no se añade `variant.id` porque el modelo local no posee una entidad/SKU que lo respalde;
- no se usan `selectedVariant`, `variantAttributes` ni `skuId` en consumidores nuevos del carrito;
- `selectedVariant` se acepta temporalmente solo como entrada legacy y snapshot histórico de pedido.

La combinación talla/color es una selección, no una garantía de stock individual. Mientras el modelo solo tenga stock global, backend valida atributos existentes y stock agregado del producto.

## 7. Identidad de personalización

Una personalización forma parte de la identidad de línea. Dos diseños distintos del mismo producto y variante no pueden fusionarse.

Cada personalización de carrito normalizada incorpora:

```js
customization: {
  clientId: "uuid-generado-en-cliente",
  type: "designer",
  designVersion: 1 | 2,
  design: {},
  previewsBySide: {},
  previewImage: null,
  productId: "..."
}
```

`clientId`:

- se genera una vez al crear un diseño nuevo mediante `crypto.randomUUID()`;
- se preserva al editar, persistir y restaurar la línea;
- no es un `_id` de Mongo ni concede acceso a recursos backend;
- no se deriva mediante hash del diseño, para evitar claves inestables o exposición accidental;
- durante migración se reutiliza un `_id` histórico si existe o se genera un UUID y se persiste inmediatamente en formato v2.

Editar el contenido de una personalización existente conserva `clientId`; crear otra copia/diseño genera otro. El backend continúa creando `Customization` y su `_id` definitivo al confirmar el pedido.

## 8. Contrato canónico `CartLineV2`

```js
{
  schemaVersion: 2,
  lineKey: "...",
  productId: "...",
  quantity: 1,
  variant: {
    size: "M",
    color: "Negro"
  },
  customization: null,
  customizationRequired: false,
  presentation: {
    name: "Camiseta",
    image: "/...",
    displayPrice: 20
  }
}
```

Reglas:

- `schemaVersion`, `lineKey`, `productId`, `quantity`, `variant`, `customization`, `customizationRequired` y `presentation` son los únicos campos activos de una línea local;
- `quantity` es entero mayor que cero;
- `variant` usa exclusivamente el contrato de la sección 6;
- `customization` usa el adaptador existente ampliado con `clientId`;
- `presentation.displayPrice` sustituye semánticamente al `price` del carrito para dejar claro que solo es visual;
- nombre e imagen son snapshots de presentación;
- `customizationRequired` permite conservar la validación UX existente sin confiar en ella desde backend;
- campos legacy no se propagan a nuevas líneas v2.

## 9. `lineKey` determinista

La identidad será calculada por una función única, no por componentes:

```text
variantKey =
  "size=" + encode(size o "-")
  + "&color=" + encode(color o "-")

customizationKey = customization.clientId o "none"

lineKey =
  "v2:local:"
  + encode(productId)
  + ":"
  + variantKey
  + ":custom="
  + encode(customizationKey)
```

Propiedades:

- misma ID de producto + misma selección + sin personalización produce la misma clave;
- talla o color diferentes producen claves diferentes;
- `clientId` de personalización diferente produce claves diferentes;
- producto sin variante usa explícitamente `size=-&color=-`;
- cantidad, nombre, imagen y displayPrice no participan;
- el orden de propiedades de objetos no afecta;
- la clave se vuelve a calcular al normalizar/restaurar, no se confía ciegamente en una clave persistida;
- no se usa como identificador de seguridad ni como dato autoritativo backend.

No se concatenan diseños completos ni valores sin escapar.

## 10. Adaptador único de línea

Se introducirá un módulo frontend pequeño, por ejemplo `utils/cartLineAdapter.js`, con funciones puras equivalentes a:

```text
normalizeVariant(product, input)
normalizeCartCustomization(input, product)
buildCartLineKey({ productId, variant, customization })
createCartLine({ product, quantity, variant, customization })
normalizeStoredCart(payload)
toCheckoutItem(cartLine)
```

Este módulo es la única frontera de traducción. ProductDetail, ProductCard, ProductDesigner, CartContext y Checkout no implementan mapeos alternativos.

La validación frontend comprueba presencia y forma para UX. No sustituye la validación backend contra el `Product` actual.

## 11. API de CartContext

### 11.1 Alta

Se sustituye el contrato posicional ambiguo por un comando:

```js
addItem({
  product,
  quantity,
  variant,
  customization
})
```

CartContext llama siempre a `createCartLine`:

- si `lineKey` ya existe, incrementa exclusivamente esa línea;
- si no existe, añade una línea nueva;
- una variante o personalización distinta nunca sobrescribe otra línea;
- producto simple repetido incrementa la línea existente.

### 11.2 Operaciones exactas

```js
updateQuantity(lineKey, quantity)
removeItem(lineKey)
updateCustomization(lineKey, customization)
clearCart()
```

- `updateQuantity` solo modifica la clave exacta y elimina esa línea si la cantidad normalizada queda en cero;
- `removeItem` solo elimina la clave exacta;
- `updateCustomization` conserva el `clientId`, renormaliza el payload y reconstruye la línea; si su clave cambiara por una acción explícita, la sustitución debe ser atómica;
- `clearCart` conserva el comportamiento vigente según sesión, sin convertirse en merge/sincronización remota.

Cart, Checkout y cualquier editor pasan `lineKey`, nunca `productId`, a operaciones de línea.

## 12. ProductCard, ProductDetail y ProductDesigner

### ProductCard

- producto sin variantes seleccionables puede llamar `addItem` con `variant: null`;
- producto con talla/color navega a detalle para selección;
- no crea SKU ni atributos externos;
- si la personalización es obligatoria, conserva el acceso al diseñador/validación existente, sin fabricar una personalización vacía.

### ProductDetail

```text
selectedSize / selectedColor
        ↓
normalizeVariant(product, { size, color })
        ↓
addItem({ product, quantity, variant, customization })
```

- no construye wrappers como `{ selectedVariant: ... }`;
- no puede añadir si falta una dimensión configurada;
- producto sin variante envía `null`;
- selección local no comparte forma con las variantes dinámicas externas dormidas.

### ProductDesigner

- un diseño nuevo recibe nuevo `customization.clientId`;
- una edición recibe `lineKey`, variante y personalización actuales por estado de navegación y preserva `clientId`;
- guardar edición llama `updateCustomization(lineKey, payload)`;
- guardar diseño nuevo llama `addItem` incluyendo la variante seleccionada si existía;
- no pierde talla/color al entrar y volver del diseñador.

## 13. Cart UI

Cart renderiza con:

```text
key = line.lineKey
name = line.presentation.name
image = line.presentation.image
display price = line.presentation.displayPrice
size/color = line.variant
customization = line.customization
quantity = line.quantity
```

Los botones pasan `lineKey`. `CustomizationInlineSummary` continúa leyendo la personalización normalizada.

La UI puede mostrar que el precio es estimado si existe riesgo de desactualización. No usa `skuId`, `variantAttributes` ni `selectedVariant` como fallback arbitrario después de completar la migración del storage.

No se cambia layout, estilos globales ni responsive salvo textos/controles imprescindibles para distinguir líneas.

## 14. Persistencia y migración tolerante

### 14.1 Usuario autenticado

Formato nuevo:

```text
clave: miTienda_cart_v2_<userId>
valor: { version: 2, items, updatedAt }
```

Carga:

1. intentar v2;
2. si no existe, leer `miTienda_cart_v1_<userId>`;
3. normalizar cada línea legacy;
4. escribir v2 solo después de obtener resultado válido;
5. no borrar v1 en la primera migración; podrá retirarse en una fase posterior tras confirmar estabilidad.

### 14.2 Invitado

Se conserva `guest_session_v1` para no perder `guestId`, TTL ni borrador de checkout. Dentro de la sesión se añade:

```js
{
  cartVersion: 2,
  cart: [CartLineV2]
}
```

El adaptador migra `session.cart` v1 y vuelve a persistir solo los campos del carrito. No elimina el resto de la sesión.

### 14.3 Reglas de adaptación legacy

Para líneas locales:

- `selectedVariant.size/color` → `variant.size/color`;
- `variantAttributes.size|talla` y `variantAttributes.color` se aceptan como fallback conocido;
- un antiguo `customization` no designer que solo contenga talla/color se interpreta como selección legacy y no como diseño;
- `price` → `presentation.displayPrice` únicamente;
- `name`, `image`, `customizable/requiresDesign` → snapshot/flag correspondiente;
- `customization.clientId` o `_id` se conserva; si falta, se genera una identidad cliente y se persiste en v2;
- `lineKey` recibido se recalcula;
- `provider: "internal"` y `provider: "local"` se tratan como local durante migración.

Una línea se descarta de la vista activa únicamente si carece de `productId`, tiene cantidad irrecuperable o pertenece inequívocamente a un proveedor externo dormido. El adaptador devuelve warnings/contador de líneas omitidas para que la UI pueda informar de forma controlada. No se borra todo el carrito por una línea inválida.

Una variante legacy estructuralmente válida puede haber dejado de existir. Se conserva para revisión visual, pero cotización/pedido backend la rechazará; la UI debe dirigir al detalle para corregirla.

## 15. Guest y usuario autenticado

El mismo `CartLineV2` y el mismo adaptador se usan para ambas persistencias. Solo cambia el contenedor/clave.

No se implementa en esta SPEC:

- carrito backend;
- sincronización entre dispositivos;
- merge completo guest→usuario;
- resolución automática de conflictos entre ambos carritos.

Al cambiar de identidad se mantiene el comportamiento de selección de storage actual, evitando que una escritura inicial vacía pise el payload antes de terminar la hidratación.

## 16. Checkout y DTO hacia backend

Checkout consume `CartLineV2` y usa el adaptador:

```js
toCheckoutItem(line) => {
  productId: line.productId,
  quantity: line.quantity,
  variant: line.variant,
  customization: line.customization
}
```

No envía como autoridad:

- `presentation`;
- `displayPrice`;
- subtotal;
- shipping;
- total;
- `lineKey` como criterio de validación;
- campos de proveedor.

La cotización de shipping usa el mismo DTO sin personalización cuando esta no sea necesaria para calcularla. La creación del pedido incluye personalización porque backend crea el documento asociado.

Durante una ventana de compatibilidad, backend puede aceptar `selectedVariant` como alias si `variant` no existe. Frontend nuevo solo envía `variant`. Conflicto entre ambos campos produce rechazo, no selección silenciosa.

## 17. Backend y snapshot de Order

### 17.1 Validación

`resolveAuthoritativeOrderLines` debe:

- leer `variant` canónica;
- tolerar `selectedVariant` solo como alias legacy;
- rechazar dimensiones requeridas ausentes;
- rechazar talla/color no presentes en `Product.variants`;
- normalizar producto sin variante a `null`;
- validar stock global agregado por producto, como en SPEC-002;
- ignorar precio/presentación del carrito.

Si el producto deja de publicar una talla/color, la línea ya no es comprable hasta corregirse. Backend responde de forma controlada sin efectos laterales.

### 17.2 Pedido nuevo

Snapshot mínimo de línea:

```js
{
  productId,
  name,
  price,
  quantity,
  variant: { size, color } | null,
  customizationId: ObjectId | null,
  provider: "local"
}
```

`name` y `price` son snapshots autoritativos obtenidos del servidor. `customizationId` apunta al documento creado por backend.

### 17.3 Compatibilidad histórica

- añadir `variant` no elimina `selectedVariant` del esquema;
- durante transición, pedidos nuevos pueden escribir ambos con el mismo valor para consumidores existentes;
- lectores usan `item.variant ?? item.selectedVariant` mediante un helper/adaptador de lectura;
- `provider`, `externalId` y `providerSku` se conservan para documentos históricos;
- no se migra ni reescribe masivamente `Order`;
- pedidos históricos sin `variant` continúan visibles en Admin, seguimiento, emails y vistas de usuario.

Después de migrar todos los lectores podrá proponerse otra SPEC para retirar escritura dual; no forma parte de esta.

## 18. Variantes inválidas y responsabilidades

| Caso | Frontend UX | Backend de seguridad |
|---|---|---|
| Falta talla/color requerida | deshabilitar alta y explicar selección | rechazar cotización/pedido |
| Valor no incluido en Product | impedir si catálogo actual lo conoce | rechazar siempre |
| Variante legacy desactualizada | marcar “revisar selección” y enlazar detalle | rechazar sin efectos laterales |
| Producto sin variantes | usar `variant: null` | aceptar solo selección vacía/null |
| Stock insuficiente | mostrar stock conocido como orientación | validar stock real agregado y rechazar |
| Producto inactivo/inexistente | impedir si se detecta | rechazar siempre |
| Personalización requerida ausente | bloquear checkout y dirigir al diseñador | mantener validación funcional existente; endurecimiento backend completo queda para SPEC específica si requiere reglas nuevas |
| Línea externa legacy | no ofrecer checkout local | no convertir ni consultar integración dormida |

## 19. Tests obligatorios propuestos

Se proponen **24 tests** focalizados:

### Identidad

1. mismo producto, misma variante y sin personalización produce la misma `lineKey` e incrementa cantidad;
2. mismo producto con talla distinta produce líneas diferentes;
3. mismo producto con color distinto produce líneas diferentes;
4. mismo producto y variante con `clientId` de personalización diferente produce líneas diferentes;
5. el orden de propiedades del input no cambia la clave;

### Operaciones

6. `updateQuantity(lineKey)` modifica únicamente la línea objetivo;
7. `removeItem(lineKey)` elimina únicamente la línea objetivo;
8. producto sin variantes usa `variant: null` y sigue funcionando;
9. editar una personalización conserva identidad y no altera otra línea;

### ProductDetail / ProductDesigner

10. talla/color válidos producen el contrato canónico;
11. dimensión requerida sin seleccionar no se añade;
12. diseñador nuevo genera `clientId` y edición lo conserva junto con variante;

### Persistencia

13. carrito v2 autenticado persiste y restaura líneas/keys;
14. guest v2 persiste carrito sin perder checkout draft, TTL ni guestId;
15. carrito v1 con `selectedVariant` se normaliza;
16. talla/color guardados erróneamente como personalización legacy se recuperan;
17. una línea legacy inválida se omite de forma controlada sin borrar las demás;

### Checkout / backend

18. Checkout envía solo `productId`, cantidad, variante y personalización necesaria;
19. `displayPrice` manipulado no altera precio ni total de pedido;
20. pedido nuevo persiste snapshot coherente de variante y alias transitorio;
21. backend rechaza variante inexistente o requerida ausente;
22. backend rechaza stock insuficiente agregado por producto;

### Regresión

23. pricing, shipping y pagos manuales de SPEC-002 continúan pasando;
24. AliExpress, dropshipping y MONEI continúan dormidos y los pedidos históricos siguen siendo legibles.

Se reutilizará la infraestructura existente. Si no existe testing frontend suficiente, se probarán adaptadores/funciones puras con la base mínima ya disponible; no se instalará un ecosistema grande solo para esta SPEC.

## 20. Criterios de aceptación

- [x] **CA-01.** Existe un único contrato `CartLineV2` documentado y utilizado por productores y consumidores locales.
- [x] **CA-02.** La variante local canónica solo contiene talla/color y no inventa SKU o ID backend.
- [x] **CA-03.** Producto sin variante se representa de forma única con `variant: null`.
- [x] **CA-04.** Una función pura genera `lineKey` estable desde producto, variante y personalización.
- [x] **CA-05.** Misma selección sin personalización se deduplica e incrementa; selecciones distintas no colisionan.
- [x] **CA-06.** Personalizaciones con identidad diferente nunca se fusionan.
- [x] **CA-07.** `updateQuantity` y `removeItem` operan exclusivamente por `lineKey`.
- [x] **CA-08.** ProductCard, ProductDetail y ProductDesigner entregan comandos con la misma forma a CartContext.
- [x] **CA-09.** ProductDetail impide añadir cuando falta talla/color configurado.
- [x] **CA-10.** Una edición de diseño conserva `clientId`, variante y línea objetivo.
- [x] **CA-11.** Cart y Checkout renderizan con `lineKey` y leen variante/presentación canónicas.
- [x] **CA-12.** `displayPrice` está identificado como snapshot visual y nunca se usa como autoridad backend.
- [x] **CA-13.** Checkout envía un DTO mínimo sin precios, totales ni campos externos.
- [x] **CA-14.** Backend valida la variante canónica contra `Product.variants` y stock real.
- [x] **CA-15.** Pedidos nuevos guardan snapshot canónico de variante y personalización vinculada.
- [x] **CA-16.** `selectedVariant` histórico se conserva y puede leerse mediante fallback transitorio.
- [x] **CA-17.** Campos provider/external históricos permanecen intactos y fuera de líneas locales nuevas.
- [x] **CA-18.** Storage autenticado v2 migra de v1 sin borrar el original antes de persistir correctamente.
- [x] **CA-19.** Guest session incorpora `cartVersion: 2` sin perder borrador, TTL ni identidad guest.
- [x] **CA-20.** El adaptador recupera líneas legacy seguras y aísla solo las inválidas.
- [x] **CA-21.** Variantes legacy desactualizadas producen revisión/rechazo controlado, no compra silenciosa.
- [x] **CA-22.** SPEC-002 sigue recalculando precio, shipping y total y mantiene pagos manuales operativos.
- [x] **CA-23.** Integraciones dormidas no se cargan ni se reactivan por el nuevo contrato.
- [x] **CA-24.** Los 24 tests propuestos y la suite backend existente pasan sin regresiones.

**Total: 24 criterios de aceptación.**

## 21. Estrategia de implementación

1. Crear adaptador puro `CartLineV2`, normalización de variante/personalización y `lineKey`.
2. Añadir migración tolerante de storage autenticado y guest, con fixtures legacy.
3. Cambiar CartContext a comandos normalizados y operaciones por `lineKey`.
4. Adaptar ProductCard y ProductDetail sin alterar su diseño visual.
5. Preservar variante/clientId en el flujo ProductDesigner y edición.
6. Adaptar Cart y Checkout para consumir la forma canónica.
7. Cambiar el DTO de shipping/pedido a `variant` y mantener alias backend temporal.
8. Añadir snapshot `variant` a `Order.items` sin retirar campos históricos.
9. Adaptar lectores directos de pedido a `variant ?? selectedVariant`.
10. Añadir tests de adaptadores, CartContext, backend y regresión.
11. Ejecutar primero tests focalizados, después suite backend y lint/build frontend una sola vez.

Cada tarea debe ser pequeña y reversible. No se mezclan limpieza de comentarios, estilos ni refactors generales.

## 22. Riesgos y mitigaciones

1. **Carritos legacy:** formas ambiguas pueden migrarse mal. Mitigar con adaptador versionado, fixtures reales conocidos y omisión por línea.
2. **Pedidos históricos:** retirar `selectedVariant` rompería lectores. Mitigar con escritura dual temporal y helper de lectura.
3. **Productos sin variantes:** una clave vacía inconsistente crea duplicados. Mitigar normalizando siempre a `variant: null` y tokens `-`.
4. **Personalizaciones:** generar identidad en cada render fragmentaría líneas. Mitigar creando `clientId` una sola vez y preservándolo al editar.
5. **Cambio de identidad:** operaciones que sigan usando `productId` afectarían varias líneas. Mitigar buscando todos los consumidores y probando cada acción por `lineKey`.
6. **Stock:** el modelo no tiene stock por variante. Mitigar documentando stock global y manteniendo backend como autoridad; no prometer disponibilidad por combinación.
7. **Lectores legacy:** Admin, emails o vistas pueden leer el campo antiguo. Mitigar con adaptador `variant ?? selectedVariant` antes de retirar escritura dual.
8. **Persistencia guest/auth:** una hidratación vacía puede sobrescribir storage. Mitigar separando carga, normalización y persistencia y conservando el guard de hidratación.

## 23. Fuera de alcance

- reactivar, normalizar o eliminar AliExpress;
- dropshipping o fulfillment;
- MONEI u otras pasarelas;
- cambios de pricing, shipping o pagos manuales salvo regresión;
- SKU local, stock/precio por variante o modelo genérico de atributos;
- migración destructiva de pedidos históricos;
- borrar campos provider/external;
- transacciones Mongo completas o reservas de stock;
- carrito backend, sincronización multi-dispositivo o merge completo guest→usuario;
- rediseño de catálogo, ProductCard, detalle, carrito o checkout;
- Design System, galería, navegación o responsive general;
- refactor completo de Admin;
- E2E general de toda la aplicación.
