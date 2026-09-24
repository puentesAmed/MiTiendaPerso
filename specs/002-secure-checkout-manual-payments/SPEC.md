# SPEC-002 — Checkout seguro y pagos manuales

## 1. Estado

**Estado:** implementada y validada el 24 de septiembre de 2026.

**Dependencia:** SPEC-001 cerrada. El catálogo AliExpress, el dropshipping y MONEI permanecen dormidos por defecto y son independientes entre sí.

Esta SPEC define el cambio mínimo aplicado para que el checkout local deje de confiar en importes enviados por el navegador y permita crear pedidos con Bizum o transferencia bancaria manual.

## 2. Objetivo

El flujo objetivo es:

```text
Catálogo local
    ↓
Carrito
    ↓
Checkout
    │
    ├── productId
    ├── quantity
    ├── selectedVariant cuando aplique
    ├── customization cuando aplique
    └── dirección
    ↓
Backend
    │
    ├── resuelve Product local activo
    ├── obtiene precio real
    ├── valida cantidad, variante y stock
    ├── calcula subtotal
    ├── calcula envío
    └── calcula total
    ↓
Método manual
    ├── bizum
    └── bank_transfer
    ↓
Pedido
    ├── payment.method = método elegido
    ├── payment.provider = manual
    └── payment.status = pending
    ↓
Confirmación manual protegida desde administración
    ↓
payment.status = paid
```

El backend será la única autoridad de precio unitario, subtotal, coste de envío y total. MONEI, AliExpress y dropshipping no participan en este flujo.

## 3. Estado actual relevante

La inspección localizada confirma:

- `createOrder` usa actualmente `cartItem.price`, acepta `shipping.price` y compara un `total` cuyos operandos proceden del cliente;
- `getShippingQuote` calcula el subtotal con `item.price` recibido del navegador;
- `Product` local ya contiene `price`, `stock`, `active` y variantes simples por talla/color;
- `Order` guarda snapshots de líneas, envío, `payment.status`, `paymentStatus`, fechas de confirmación y actor administrativo;
- `payment.method` admite hoy valores históricos como `manual`, `transfer`, `monei`, `card` o `paypal`, pero no `bank_transfer`;
- `POST /api/orders/:id/mark-paid` ya está protegido por autenticación y rol administrador y sincroniza los estados de pago moderno y legacy;
- el endpoint no productivo de pago de prueba intenta guardar `payment.method = "test"`, valor que no pertenece al enum;
- el checkout envía precios, cotización y total, y muestra el texto incorrecto `Confirmar pedido y pagar`;
- la confirmación actual muestra el pedido, pero no el método, estado ni instrucciones del pago manual.

## 4. Principios y límites

1. El navegador aporta selección e intención de compra; nunca importes autoritativos.
2. La cotización y la creación del pedido deben reutilizar la misma lógica backend de resolución de líneas y envío.
3. La creación del pedido recalcula siempre los importes; no confía en una cotización previa ni en `localStorage`.
4. Solo se crean pedidos nuevos con `bizum` o `bank_transfer`.
5. Todo pedido nuevo de esta fase nace con pago pendiente y sin confirmación automática.
6. Se conservan valores, código y metadatos históricos de otros pagos para lectura y posible reactivación futura.
7. Esta SPEC no normaliza por completo variantes, carrito, atomicidad ni el dominio de pagos.

## 5. Contrato frontend → backend

### 5.1 Cotización de envío

Se conserva el endpoint actual:

```http
POST /api/shipping/quote
```

Payload mínimo:

```json
{
  "items": [
    {
      "productId": "...",
      "quantity": 2,
      "selectedVariant": {
        "size": "M",
        "color": "Negro"
      }
    }
  ],
  "shippingAddress": {
    "fullName": "...",
    "street": "...",
    "city": "...",
    "state": "...",
    "postalCode": "...",
    "country": "..."
  }
}
```

Para cotizar solo son relevantes `productId`, `quantity`, la selección de variante cuando afecte a la validez de la línea y la dirección. Si por compatibilidad temporal llegan `price`, `subtotal`, `shipping.price` o `total`, el backend los ignora.

### 5.2 Creación del pedido

Se conserva:

```http
POST /api/orders
```

Payload mínimo:

```json
{
  "items": [
    {
      "productId": "...",
      "quantity": 2,
      "selectedVariant": {
        "size": "M",
        "color": "Negro"
      },
      "customization": {}
    }
  ],
  "paymentMethod": "bizum",
  "shippingAddress": {},
  "billingAddress": {},
  "notes": "",
  "guestId": "...",
  "email": "..."
}
```

Reglas del contrato:

- requeridos por línea: `productId` y `quantity` entera mayor que cero;
- `selectedVariant` conserva el formato actual `{ size, color }` y se envía solo cuando aplica;
- `customization` mantiene temporalmente el payload actual normalizado porque hoy la personalización se crea durante `createOrder`; no se rediseña en esta SPEC;
- `paymentMethod` es obligatorio y solo admite `bizum` o `bank_transfer`;
- los datos de invitado/autenticación, dirección, facturación y notas conservan el contrato vigente;
- `price`, `name`, `provider`, `externalId`, `shipping` y `total` no son necesarios para decidir importes;
- si esos campos antiguos siguen llegando durante la transición, se ignoran para resolución, cálculo y persistencia. El servidor fuerza el proveedor local con las integraciones dormidas;
- una cotización previa es informativa. La creación del pedido vuelve a resolver productos y recalcular todo para evitar manipulación o datos obsoletos.

El frontend puede seguir mostrando un precio almacenado en un carrito antiguo, pero debe tratarlo como orientativo. La respuesta del backend sustituye cualquier cálculo local como verdad final.

## 6. Resolución autoritativa de líneas y pricing

Se introducirá un servicio backend pequeño, reutilizable por shipping y pedidos, con una responsabilidad equivalente a:

```text
resolveAuthoritativeOrderLines(items)
→ { lines, subtotal, stockRequirements }
```

Por cada línea, el servicio debe:

1. validar formato de `productId` y `quantity`;
2. agrupar cantidades repetidas del mismo producto para validar el stock total solicitado;
3. consultar únicamente `Product` local con `active: true`;
4. rechazar productos inexistentes, inactivos o no disponibles;
5. obtener `name`, `price`, stock y variantes desde el documento del servidor;
6. validar que la talla y/o color enviados pertenecen a las listas configuradas cuando dichas listas no están vacías;
7. requerir una selección para cada dimensión de variante configurada y rechazar valores desconocidos;
8. construir el snapshot de línea con el precio de `Product`, nunca con `cartItem.price`;
9. calcular el subtotal como suma de `precio servidor × cantidad`.

El contrato de variantes sigue siendo el actual objeto `selectedVariant`. El cambio mínimo de frontend será preservar y enviar ese objeto correctamente para productos locales. La identidad completa de SKU, precios por variante y el refactor general del carrito quedan para otra SPEC.

La personalización se normaliza y vincula al `Product` ya resuelto. Su payload no puede cambiar el precio en esta fase.

### Protección explícita

```text
Producto en Product.price = 20 €
Cliente envía item.price = 1 €
Resultado persistido: línea = 20 €, subtotal calculado con 20 €
```

No se rechaza el pedido solo porque el cliente antiguo envíe un precio distinto: se ignora el valor no autoritativo. Sí se rechaza si el producto ya no existe, está inactivo, no tiene stock suficiente o la variante no es válida.

## 7. Shipping autoritativo y compartido

La lógica actualmente alojada en el controller debe extraerse a un servicio backend sin dependencia HTTP, equivalente a:

```text
calculateShippingQuote({ authoritativeSubtotal, shippingAddress })
→ { zone, price, isFree, freeFrom, estimatedDays, currency }
```

Entradas autoritativas:

- `authoritativeSubtotal`: resultado de `resolveAuthoritativeOrderLines`;
- reglas backend de zona, tarifa, umbral gratuito y plazos.

Entrada legítima del cliente:

- dirección de envío, incluidos país, provincia/estado y código postal necesarios para resolver la zona.

Uso obligatorio:

- `getShippingQuote` resuelve primero las líneas/precios desde `Product` y después llama al servicio de shipping;
- `createOrder` ejecuta la misma secuencia y persiste exactamente la cotización devuelta por ese servicio;
- `estimatedDeliveryDate` se calcula desde los `estimatedDays` devueltos por el servicio;
- no se duplica la tabla de reglas ni se copia el cálculo en controllers;
- no se acepta como fuente de verdad `shipping.zone`, `shipping.price`, `shipping.isFree`, `shipping.estimatedDays` ni `total` del navegador.

Protección explícita:

```text
Envío calculado por backend = 8 €
Cliente envía shipping.price = 0 €
Resultado persistido: shipping.price = 8 € y total incluye 8 €
```

El total persistido será:

```text
total = subtotal autoritativo + shipping.price autoritativo
```

La respuesta de cotización continúa mostrando el coste estimado al usuario, pero nunca autoriza la creación del pedido por sí misma.

## 8. Stock, orden de operaciones y atomicidad

La implementación debe validar todas las líneas, variantes, cantidades, subtotal, shipping, total y método de pago antes de crear personalizaciones, generar ZIP, descontar stock o crear el pedido.

El descuento conserva por ahora la condición `stock >= cantidad`, pero la implementación debe comprobar el resultado de la actualización y responder con conflicto controlado si el stock cambió entre validación y descuento. No se debe ampliar el comportamiento actual que ignora `matchedCount/modifiedCount`.

Esta medida reduce efectos laterales previos a una validación fallida, pero **no garantiza atomicidad completa**. Una transacción Mongo y el rollback coordinado de stock, personalizaciones, archivos y pedido siguen siendo deuda explícita fuera de alcance.

## 9. Métodos de pago y compatibilidad del modelo

### 9.1 Métodos activos de negocio

```text
bizum
bank_transfer
```

Ambos son pagos manuales. No crean sesiones externas, no redirigen y no confirman automáticamente el pedido.

### 9.2 Cambio mínimo del esquema

Se añadirá `bank_transfer` al enum actual de `payment.method`. Se mantendrán los valores históricos existentes (`manual`, `cash`, `transfer`, `card`, `paypal`, `monei` y `null`) para poder leer/guardar documentos antiguos sin migración destructiva.

La compatibilidad del esquema no convierte esos valores históricos en métodos activos. La validación del caso de uso `createOrder` usa una allowlist estricta:

```text
["bizum", "bank_transfer"]
```

No se renombra ni migra automáticamente el valor histórico `transfer`. Los nuevos pedidos de transferencia usan `bank_transfer`.

Al crear el pedido:

```text
payment.method = paymentMethod
payment.provider = "manual"
payment.status = "pending"
payment.paidAt = null
payment.confirmedAt = null
payment.confirmedBy = null
paymentStatus = "pending"
paymentConfirmedAt = null
```

El estado operativo del pedido continúa siendo independiente del estado del pago.

## 10. Configuración de pagos manuales

Se añadirá configuración backend centralizada, sin panel administrativo y sin valores reales en el repositorio. La forma mínima propuesta es:

```text
manualPayments:
  bizum:
    recipient       ← MANUAL_PAYMENT_BIZUM_RECIPIENT
    instructions    ← MANUAL_PAYMENT_BIZUM_INSTRUCTIONS

  bankTransfer:
    accountHolder   ← MANUAL_PAYMENT_BANK_ACCOUNT_HOLDER
    iban            ← MANUAL_PAYMENT_BANK_IBAN
    instructions    ← MANUAL_PAYMENT_BANK_INSTRUCTIONS
```

Decisiones:

- Bizum y transferencia están activos en esta fase; sus campos de configuración son obligatorios;
- la configuración se carga una vez desde el módulo backend de entorno/configuración;
- si falta un campo obligatorio, se produce un error de configuración explícito al arrancar; no se ofrecen instrucciones incompletas ni se degrada silenciosamente;
- los tests inyectan valores ficticios no sensibles;
- teléfono/destino Bizum, titular, IBAN e instrucciones no se hardcodean en React, modelos ni plantillas;
- estos datos no se devuelven en un endpoint público general ni se registran en logs;
- solo se devuelve la sección del método elegido después de que el pedido haya sido creado correctamente.

Se actualizará la plantilla de variables de entorno/documentación durante la implementación, usando nombres y ejemplos ficticios. Nunca se añadirá contenido real de `.env` al repositorio.

## 11. Respuesta de creación e instrucciones

Se elige la opción más simple: ampliar la respuesta existente de `POST /api/orders`; no se crea un endpoint público adicional.

Respuesta conceptual para Bizum:

```json
{
  "ok": true,
  "orderId": "...",
  "order": {},
  "paymentInstructions": {
    "method": "bizum",
    "status": "pending",
    "amount": 33.99,
    "currency": "EUR",
    "reference": "PEDIDO-...",
    "recipient": "valor configurado",
    "instructions": "valor configurado"
  }
}
```

Para `bank_transfer`, el mismo bloque sustituye `recipient` por `accountHolder` e `iban`. Solo aparece el método seleccionado. No se exponen configuraciones de otros métodos, claves, secretos ni datos de MONEI.

`amount`, `reference`, método y estado se construyen desde el pedido recién persistido. Las instrucciones se construyen desde configuración backend. El frontend no puede sobrescribirlos.

## 12. Checkout y confirmación UX

Cambios funcionales mínimos:

- añadir un selector obligatorio con las opciones `Bizum` y `Transferencia bancaria`;
- enviar el identificador estable `bizum` o `bank_transfer`;
- mostrar la cotización backend y advertir que el importe definitivo lo confirma el servidor;
- sustituir `Confirmar pedido y pagar` por `Confirmar pedido`;
- adaptar mensajes auxiliares que prometan un pago online o una acción de pago inmediata;
- después de la respuesta correcta, pasar `order` y `paymentInstructions` a la vista de confirmación;
- limpiar el carrito solo después de una creación confirmada por el backend.

La confirmación debe mostrar:

- número o referencia del pedido;
- total calculado por servidor;
- método seleccionado;
- estado `Pendiente de pago`;
- instrucciones limitadas al método;
- concepto/referencia que el usuario debe indicar;
- siguiente paso: realizar el Bizum o la transferencia y esperar confirmación manual.

No se rediseña la página, no se añade design system y no se simula que el pago ya se realizó.

## 13. Confirmación manual administrativa

Se reutiliza el endpoint existente:

```http
POST /api/orders/:id/mark-paid
```

No se crean permisos ni endpoint nuevos porque la ruta ya exige autenticación y rol administrador.

Transición permitida:

```text
payment.status: pending → paid
```

Al confirmar:

- se conserva `payment.method` (`bizum` o `bank_transfer`);
- `payment.provider` permanece `manual`;
- se establecen `payment.paidAt`, `payment.confirmedAt` y `payment.confirmedBy` con los campos ya disponibles;
- se sincronizan `paymentStatus = "paid"` y `paymentConfirmedAt` mientras existan consumidores legacy;
- no se cambia automáticamente el estado operativo del pedido;
- pedidos cancelados o ya pagados siguen produciendo conflicto controlado;
- no se invoca MONEI ni dropshipping.

No se implementan conciliación, comprobantes ni verificación automática.

## 14. Resolución del endpoint de pago `test`

No se añadirá `"test"` al enum.

La solución de menor impacto será mantener la ruta exclusivamente fuera de producción y adaptar su handler para usar el valor histórico válido `manual`, con una marca en metadata como `testSimulation: true`. Debe sincronizar los campos moderno y legacy igual que una confirmación de prueba y respetar los guards de integraciones dormidas.

Este endpoint no se mostrará como método de negocio, no aceptará `test` desde checkout y no servirá de base al flujo administrativo. Los tests funcionales del pago manual deben preferir el endpoint administrativo protegido existente.

## 15. Integraciones dormidas

### MONEI

Debe mantenerse:

```env
MONEI_ENABLED=false
```

El flujo de esta SPEC no realiza creación de pagos MONEI, redirects, callbacks, webhooks requeridos, llamadas HTTP, botones ni estados dependientes de MONEI. Sus controllers, services, rutas, campos e IDs históricos se conservan para una posible reactivación futura.

### AliExpress y dropshipping

Debe mantenerse:

```env
ALIEXPRESS_CATALOG_ENABLED=false
DROPSHIPPING_ENABLED=false
```

La resolución autoritativa de checkout consulta `Product` local. No carga ni consulta `AffiliateProduct`, no importa fulfillment de forma eager y no llama proveedores externos. Los modelos, campos y metadatos históricos se conservan.

Los tres flags continúan siendo independientes. El flujo local debe funcionar con los tres deshabilitados simultáneamente.

## 16. Errores esperados

La API debe responder de forma controlada, sin persistir pedido, ante:

- payload vacío o mal formado;
- cantidad no entera, cero o negativa;
- producto inexistente o inactivo;
- stock insuficiente;
- variante requerida ausente o inválida;
- dirección insuficiente para cotizar;
- método distinto de `bizum` o `bank_transfer`;
- configuración incompleta del método manual;
- cambio concurrente de stock detectado antes de crear el pedido.

Una diferencia entre importes enviados por un cliente antiguo y los importes del servidor no es un error de validación: los valores del cliente se ignoran y se persisten los del servidor.

## 17. Tests obligatorios propuestos

Se proponen **22 tests** backend de integración/unidad focalizados:

### Pricing

1. producto real de 20 € con `item.price = 1` persiste 20 €;
2. subtotal se recalcula con precios de `Product` para varias líneas;
3. `total` enviado por cliente se ignora y el total final se calcula en backend;
4. producto inexistente o inactivo produce rechazo controlado;
5. cantidad no entera, cero o negativa produce rechazo;
6. stock insuficiente produce rechazo antes de crear pedido o efectos laterales;
7. variante válida configurada se acepta y se conserva en el snapshot;
8. variante requerida ausente o desconocida se rechaza.

### Shipping

9. `shipping.price = 0` manipulado no cambia el coste backend;
10. el envío persistido coincide con el servicio compartido y el total lo incluye;
11. cotización y creación reutilizan las mismas reglas, incluido el umbral de envío gratuito.

### Métodos e instrucciones

12. Bizum crea pedido con `payment.status` y `paymentStatus` pendientes;
13. transferencia crea pedido con ambos estados pendientes;
14. método no soportado produce rechazo controlado;
15. `test` no es método válido en `createOrder`;
16. respuesta Bizum expone solo importe, referencia, destinatario e instrucciones configuradas;
17. respuesta de transferencia expone solo importe, referencia, titular, IBAN e instrucciones configuradas.

### Administración e integraciones

18. admin cambia un pago `pending → paid`, conserva método y registra fechas/actor;
19. usuario anónimo o no administrador no puede confirmar pagos;
20. `MONEI_ENABLED=false` no interviene ni realiza llamadas externas;
21. catálogo/carrito/pedido local funcionan con AliExpress, dropshipping y MONEI dormidos;
22. la suite backend existente continúa pasando.

Se ampliarán los tests existentes sin sustituir aserciones correctas por mocks que oculten el problema. Solo se añadirán tests frontend si la infraestructura vigente permite cubrir selector, payload y confirmación sin instalar un ecosistema nuevo.

## 18. Criterios de aceptación

- [x] **CA-01.** `POST /api/orders` puede recibir líneas sin precio, shipping ni total enviados por cliente.
- [x] **CA-02.** Cada línea nueva obtiene nombre y precio del `Product` local activo cargado por backend.
- [x] **CA-03.** Un `item.price` manipulado o antiguo se ignora y nunca se persiste como autoridad.
- [x] **CA-04.** El subtotal se calcula exclusivamente en backend con precio servidor y cantidad validada.
- [x] **CA-05.** Cantidades inválidas, productos inactivos/inexistentes y stock insuficiente se rechazan de forma controlada.
- [x] **CA-06.** El contrato actual mínimo de `selectedVariant` se preserva y se valida contra talla/color configurados.
- [x] **CA-07.** Cotización y creación de pedido usan un único servicio backend de reglas de shipping.
- [x] **CA-08.** La zona usa datos legítimos de dirección del cliente; la tarifa y plazos proceden del backend.
- [x] **CA-09.** `shipping.price`, zona, plazos y total enviados por cliente se ignoran para persistencia y cálculo.
- [x] **CA-10.** El shipping persistido coincide con la cotización recalculada durante `createOrder`.
- [x] **CA-11.** El total persistido es subtotal autoritativo más shipping autoritativo.
- [x] **CA-12.** `bizum` crea un pedido con provider manual y estado de pago pendiente.
- [x] **CA-13.** `bank_transfer` crea un pedido con provider manual y estado de pago pendiente.
- [x] **CA-14.** Cualquier método distinto de `bizum` o `bank_transfer`, incluido `test`, se rechaza en checkout.
- [x] **CA-15.** El enum incorpora `bank_transfer` sin eliminar valores ni datos históricos.
- [x] **CA-16.** `payment.status` y `paymentStatus` permanecen sincronizados durante la compatibilidad legacy.
- [x] **CA-17.** La configuración manual vive en backend, contiene cero datos reales versionados y falla explícitamente si está incompleta.
- [x] **CA-18.** `POST /api/orders` devuelve instrucciones solo del método elegido y derivadas del pedido/configuración.
- [x] **CA-19.** Checkout muestra solo Bizum/transferencia y usa el CTA `Confirmar pedido` sin promesa de pago online.
- [x] **CA-20.** La confirmación muestra referencia, total servidor, método, estado pendiente, instrucciones y siguiente paso.
- [x] **CA-21.** El endpoint admin protegido cambia `pending → paid`, conserva el método y registra fecha/actor disponibles.
- [x] **CA-22.** Un usuario no administrador no puede confirmar el pago.
- [x] **CA-23.** El endpoint no productivo deja de guardar `payment.method = "test"` sin ampliar el enum con ese valor.
- [x] **CA-24.** MONEI, AliExpress y dropshipping permanecen dormidos, sin llamadas externas ni dependencia del flujo local.
- [x] **CA-25.** Los 22 tests propuestos y la suite backend existente pasan sin regresiones.

**Total: 25 criterios de aceptación.**

## 19. Plan de implementación

1. Añadir configuración backend validada para los dos pagos manuales y documentar variables ficticias.
2. Añadir `bank_transfer` al enum preservando todos los valores históricos.
3. Extraer el servicio autoritativo de resolución/validación de líneas y subtotal.
4. Extraer el cálculo de shipping a un servicio único reutilizable.
5. Adaptar `getShippingQuote` para resolver precios desde `Product`.
6. Adaptar `createOrder` para recalcular líneas, shipping y total antes de efectos laterales.
7. Validar stock/variantes y comprobar el resultado del decremento sin introducir una transacción completa.
8. Persistir método manual y estados pending moderno/legacy; devolver instrucciones limitadas.
9. Adaptar payload, selector, textos y confirmación del checkout frontend.
10. Verificar y ajustar el flujo admin existente sin cambiar permisos.
11. Adaptar el endpoint no productivo para que no use `test` como método.
12. Añadir tests focalizados, ejecutar suite backend y validar el build frontend.

Cada tarea debe implementarse con cambios localizados. No se mezclan refactors generales.

## 20. Fuera de alcance

- API o integración real de Bizum;
- Open Banking, conciliación bancaria o confirmación automática;
- comprobantes, OCR o carga documental de pago;
- MONEI, PayPal, Stripe u otra pasarela online;
- AliExpress, catálogo afiliado o dropshipping;
- panel administrativo para editar instrucciones/datos bancarios;
- migración destructiva de métodos o documentos históricos;
- nuevo modelo definitivo de pagos;
- normalización completa de variantes/SKU;
- migración completa del carrito o eliminación inmediata de campos antiguos del payload;
- precios específicos por variante, promociones, impuestos o multidivisa;
- rediseño general de checkout, Admin o Design System;
- transacción Mongo completa y rollback coordinado de stock/personalizaciones/archivos;
- idempotencia avanzada, reservas de stock o solución integral de concurrencia;
- notificaciones automáticas avanzadas.

## 21. Deuda posterior explícita

- normalizar el contrato de carrito y variantes, incluida identidad de línea por variante;
- diseñar un modelo definitivo de pagos y retirar duplicidad `payment.status`/`paymentStatus` mediante migración;
- añadir transacciones/rollback e idempotencia para stock, personalizaciones y pedido;
- definir recuperación segura de instrucciones tras recargar la página de confirmación;
- revisar emails de pedido y notificaciones de pago como fase separada;
- eliminar compatibilidad de payload antiguo solo después de desplegar y verificar el nuevo frontend.
