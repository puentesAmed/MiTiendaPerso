# SPEC-001 — Aislamiento reversible de AliExpress y Dropshipping

Estado: cerrada — 23/23 criterios de aceptación; 36/36 tests backend  
Tipo: arquitectura y aislamiento de integración  
Fuente principal: `docs/audits/2026-09-web-audit.md`

## 1. Objetivo

Permitir que MiTiendaPerso funcione como ecommerce convencional con AliExpress, dropshipping y MONEI deshabilitados, sin borrar su código, modelos, campos ni datos históricos.

Con la configuración por defecto, el backend debe arrancar y los flujos locales de catálogo, detalle, carrito, checkout, pedidos, consulta de pedidos y administración deben operar sin:

- `MONGO_URI_ALIEXPRESS`;
- conexión a la base Mongo afiliada;
- cargar o consultar `AffiliateProduct`;
- `DROPSHIPPING_API_URL`;
- llamadas al servicio externo de fulfillment;
- `MONEI_API_KEY`;
- `MONEI_WEBHOOK_SECRET`;
- creación de pagos, redirects, callbacks, webhooks o llamadas HTTP requeridas de MONEI.

El aislamiento debe ser reversible: una activación futura podrá recuperar las capacidades existentes mediante configuración explícita y válida.

## 2. Contexto y problema actual

La auditoría identifica estas dependencias activas:

1. El grafo de imports del backend llega desde los controllers de productos y pedidos hasta `AffiliateProduct`, cuyo import carga `dbAffiliate` y abre una conexión Mongo.
2. El catálogo ejecuta consultas local y afiliada mediante `Promise.all`; un fallo de la fuente opcional puede impedir devolver productos locales.
3. El detalle busca primero en `Product` y después en `AffiliateProduct`, incluso cuando la integración no debería estar disponible.
4. La creación de cualquier pedido consulta tanto `Product` como `AffiliateProduct`.
5. El controller de pagos importa e invoca directamente `sendToDropshipping` al confirmar determinados pagos.
6. El backend conserva rutas, creación de pagos y webhook MONEI; aunque el frontend no completa actualmente ese flujo, el core no debe requerir la pasarela para operar.

El modelo local `Product`, la autenticación, las personalizaciones, el envío convencional y la administración local ya pueden constituir el core. Esta SPEC elimina dependencias obligatorias, no capacidades ni datos.

## 3. Objetivo funcional

Con AliExpress, dropshipping y MONEI deshabilitados, MiTiendaPerso debe poder:

- arrancar el backend;
- listar productos locales activos;
- mostrar el detalle de un producto local;
- añadir productos locales al carrito mediante el frontend existente;
- calcular el envío convencional existente;
- completar el checkout existente;
- crear pedidos formados exclusivamente por productos locales;
- consultar y administrar pedidos, incluidos históricos que contengan metadata de proveedor;
- operar el CRUD administrativo de productos locales;
- dejar el pedido creado con pago pendiente;
- actualizar y consultar el pedido sin intentar una pasarela ni fulfillment externos.

No se exige que productos AliExpress sean visibles u operables mientras la integración esté deshabilitada.

## 4. Principios de diseño

```text
CORE ECOMMERCE
├── products
├── catalog
├── cart
├── checkout
├── orders
├── users
├── customizations
├── admin
└── manual payments
    ├── bizum
    └── bank transfer

OPTIONAL / DORMANT
├── dropshipping
│   └── aliexpress
└── payment gateways
    └── monei
```

Reglas:

- El core no debe importar infraestructura AliExpress cuando `ALIEXPRESS_CATALOG_ENABLED=false`.
- El core no debe requerir ni ejecutar infraestructura MONEI cuando `MONEI_ENABLED=false`.
- Una integración deshabilitada no debe validar sus variables, abrir conexiones, ejecutar consultas ni efectuar llamadas externas.
- Una integración habilitada explícitamente debe validar su configuración y fallar con un error claro si es inválida.
- La fuente local de productos es obligatoria. La fuente AliExpress es opcional y condicionada por configuración.
- La solución debe ser pequeña y directa. No es obligatorio crear una arquitectura genérica de repositorios, eventos o plugins si funciones/adaptadores acotados cumplen los criterios.
- No se modifican contratos públicos salvo lo estrictamente necesario para que el modo local conserve el comportamiento actual.

## 5. Configuración y flags

Se incorporarán al módulo central `Backend/src/config/env.js`:

```env
ALIEXPRESS_CATALOG_ENABLED=false
DROPSHIPPING_ENABLED=false
MONEI_ENABLED=false
```

### 5.1 Interpretación

- Un flag no definido equivale a `false`.
- Solo el valor textual normalizado `true` activa la integración.
- Cualquier otro valor se considera desactivado, salvo que la implementación adopte una validación booleana estricta y documentada. La conducta elegida debe quedar cubierta por tests.

### 5.2 Variables condicionadas

| Estado | Requisito | Comportamiento |
|---|---|---|
| AliExpress deshabilitado | `MONGO_URI_ALIEXPRESS` no requerida | No importar modelo/conexión, no conectar, no consultar |
| AliExpress habilitado | `MONGO_URI_ALIEXPRESS` requerida | Fallar al arrancar o al inicializar la integración con mensaje de configuración claro |
| Dropshipping deshabilitado | `DROPSHIPPING_API_URL` no requerida | No cargar/ejecutar fulfillment ni hacer HTTP externo |
| Dropshipping habilitado | `DROPSHIPPING_API_URL` requerida | Fallar de forma clara antes de intentar fulfillment si falta configuración |
| MONEI deshabilitado | `MONEI_API_KEY` y `MONEI_WEBHOOK_SECRET` no requeridas | No crear pagos, redirigir, procesar callbacks/webhooks requeridos ni hacer HTTP a MONEI |
| MONEI habilitado | `MONEI_API_KEY` y `MONEI_WEBHOOK_SECRET` requeridas | Fallar con un error de configuración claro si falta alguna variable obligatoria |

No se admite degradación silenciosa cuando el operador ha activado explícitamente una integración pero su configuración es inválida.

### 5.3 Documentación de entorno

La implementación futura podrá documentar los flags en una fuente de configuración segura, sin copiar secretos ni contenido real de `.env`. Crear o modificar `.env.example` solo será válido si se limita a nombres y valores de ejemplo no sensibles.

## 6. Carga lazy obligatoria de AliExpress

Cuando `ALIEXPRESS_CATALOG_ENABLED=false`:

- no debe evaluarse `Backend/src/models/AffiliateProduct.js`;
- no debe evaluarse `Backend/src/config/dbAffiliate.js`;
- no debe crearse ninguna conexión Mongoose afiliada;
- no debe leerse ni requerirse `MONGO_URI_ALIEXPRESS`;
- no debe emitirse ninguna consulta contra la colección afiliada.

No cumple esta SPEC un import estático seguido de un condicional:

```js
import { AffiliateProduct } from "../models/AffiliateProduct.js";

if (ALIEXPRESS_CATALOG_ENABLED) {
  // Uso condicionado, pero el side effect del import ya ocurrió.
}
```

La implementación debe desplazar el import detrás de la decisión de configuración. Son soluciones aceptables:

- `import()` dinámico dentro de un cargador acotado;
- una función de acceso que importe/inicialice la integración solo al estar habilitada;
- otra solución igualmente simple que pruebe que el módulo y la conexión no se cargan en modo deshabilitado.

El cargador puede memorizar el módulo/modelo para evitar imports repetidos cuando la integración esté habilitada. No debe introducir un framework genérico de plugins.

## 7. Catálogo

### 7.1 Estado objetivo

```text
Fuente local obligatoria ───────────────┐
                                       ├─ normalización existente ─ catálogo
Fuente AliExpress opcional y lazy ─────┘
```

### 7.2 Comportamiento deshabilitado

- `GET /api/products` consulta únicamente `Product`.
- Conserva filtros actuales de categoría y búsqueda para productos locales.
- Conserva el contrato de respuesta local actual.
- No construye filtros afiliados ni carga `AffiliateProduct`.
- No espera, captura ni oculta errores de una integración que no se ha iniciado.

### 7.3 Comportamiento habilitado

- La fuente local sigue siendo obligatoria.
- La fuente afiliada se carga únicamente tras validar el flag y configuración.
- Puede mantenerse la combinación y normalización actuales para reducir el cambio.
- La política ante errores de una integración explícitamente habilitada debe ser visible y testeable; no debe ocultar una configuración inválida. Esta SPEC no obliga a diseñar tolerancia avanzada, circuit breakers ni caché.

La retirada de `Promise.all` no debe cambiar orden, filtros o estructura del catálogo local salvo que sea imprescindible para el aislamiento.

## 8. Detalle de producto

Con `ALIEXPRESS_CATALOG_ENABLED=false`:

1. `GET /api/products/:id` busca únicamente en `Product`.
2. Si no existe localmente, responde con el 404 vigente.
3. No carga ni consulta `AffiliateProduct`.

Con la integración habilitada y bien configurada, puede mantenerse el fallback existente: buscar local y, si no se encuentra, buscar en la fuente afiliada lazy.

No se modifican en esta SPEC normalización de precios, stock, variantes, imágenes ni contratos frontend.

## 9. Pedidos locales

La creación de un pedido formado exclusivamente por productos locales debe completarse sin infraestructura AliExpress.

### 9.1 Comportamiento deshabilitado

- `createOrder` consulta únicamente `Product`.
- No carga `AffiliateProduct` ni abre la conexión afiliada.
- Mantiene las validaciones, personalizaciones, stock, total, envío, emails y respuesta existentes, aunque tengan deuda ya documentada.
- Mantiene el valor y comportamiento actual de líneas locales.
- Un item que declare proveedor AliExpress mientras la integración está deshabilitada debe rechazarse como producto no disponible mediante un error controlado; no debe activar la integración ni provocar error de conexión.

### 9.2 Comportamiento habilitado

Puede conservarse la resolución combinada existente tras cargar el modelo afiliado de forma lazy.

### 9.3 Históricos

No se modificarán ni eliminarán:

- `items.provider`;
- `items.externalId`;
- `items.providerSku`;
- `dropshipping.sent` y `dropshipping.sentAt`;
- snapshots de líneas;
- documentos históricos.

La lectura, listado, tracking y administración de pedidos históricos con `provider: "aliexpress"` deben continuar funcionando porque se basan en el snapshot de `Order`, no en una consulta obligatoria a `AffiliateProduct`.

## 10. MONEI, pagos y fulfillment

MONEI y dropshipping son decisiones independientes. Deshabilitar la pasarela no debe activar ni desactivar fulfillment, y deshabilitar fulfillment no debe determinar si una pasarela está disponible.

El flujo convencional objetivo de esta SPEC es:

```text
checkout
      ↓
creación de pedido
      ↓
pago pendiente
      ↓
confirmación manual futura
```

Esta SPEC no implementa la confirmación manual futura ni los métodos Bizum/transferencia. Solo garantiza que la creación y operación del pedido no dependen de MONEI.

### 10.1 MONEI deshabilitado

Con `MONEI_ENABLED=false`:

- no se requieren `MONEI_API_KEY` ni `MONEI_WEBHOOK_SECRET`;
- no se crean pagos MONEI;
- no se generan ni ejecutan redirects a MONEI;
- no se realizan llamadas HTTP a MONEI;
- callbacks y webhooks MONEI no son necesarios para crear, consultar o administrar pedidos;
- las rutas MONEI conservadas no deben iniciar la pasarela: pueden no montarse o responder de forma controlada sin efectuar llamadas externas;
- el pedido local queda con el estado de pago pendiente existente;
- la ausencia de la pasarela no bloquea la creación de pedidos.

Con `MONEI_ENABLED=true`, la integración podrá conservar el comportamiento actual únicamente si su configuración obligatoria es válida. Si falta configuración, debe producirse un error explícito; no se permite degradación silenciosa.

Esta SPEC no reactiva, completa ni refactoriza de forma general MONEI. Solo añade el límite de configuración necesario para dormir la integración.

### 10.2 Dropshipping deshabilitado

La confirmación de pago, actual o futura, debe ser independiente de la disponibilidad del servicio dropshipping.

Con `DROPSHIPPING_ENABLED=false`:

```text
payment confirmed
      ↓
pedido actualizado
      ↓
FIN
```

Debe cumplirse:

- no requerir `DROPSHIPPING_API_URL`;
- no ejecutar `sendToDropshipping`;
- no efectuar peticiones HTTP al proveedor;
- no bloquear ni convertir en error la confirmación por ausencia del servicio;
- conservar los cambios de estado de pago/pedido actuales.

El controller de pagos no debe importar eager un módulo de fulfillment con configuración o side effects innecesarios. Se acepta una función coordinadora mínima, un import dinámico condicionado o un no-op explícito situado fuera de la lógica de actualización del pago.

Con `DROPSHIPPING_ENABLED=true`, la implementación existente podrá seguir utilizándose si la URL está configurada. Esta SPEC no corrige idempotencia, reintentos, estados parciales, endpoints, callbacks ni el flujo frontend de MONEI.

La confirmación manual que actualmente no ejecuta fulfillment no debe ampliar su comportamiento en esta SPEC.

### 10.3 Independencia de flags

`ALIEXPRESS_CATALOG_ENABLED`, `DROPSHIPPING_ENABLED` y `MONEI_ENABLED` se evalúan por separado. Debe ser posible mantener los tres en `false` simultáneamente y operar el core local. Ninguna combinación puede asumir que MONEI implica dropshipping o viceversa.

## 11. Conservación y reversibilidad

No se eliminarán, renombrarán ni migrarán destructivamente:

- `Backend/src/models/AffiliateProduct.js`;
- `Backend/src/models/schemas/product.schema.js`;
- `Backend/src/config/dbAffiliate.js`;
- `Backend/src/services/dropshipping.service.js`;
- controllers, services, rutas y webhook MONEI existentes;
- campos AliExpress/dropshipping de `Order`;
- campos históricos de pago e IDs de pagos MONEI;
- `provider`, `externalId`, `providerSku`;
- datos o pedidos históricos;
- ramas frontend que interpretan productos externos;
- variables y documentación histórica de las integraciones, salvo adaptación mínima para describir su estado dormido.

Los cambios deben limitarse a configuración, puntos de carga/consulta, coordinación de fulfillment y tests necesarios. Cualquier movimiento físico de módulos requiere justificación expresa dentro de la implementación de esta SPEC y no puede convertirse en una reorganización general.

## 12. Compatibilidad esperada

### Modo por defecto

Sin flags ni variables externas de las integraciones suspendidas:

- el backend considera AliExpress, dropshipping y MONEI apagados;
- solo se expone catálogo local;
- el core local funciona;
- los pedidos se crean con pago pendiente;
- no existen intentos de conexión, pasarela o fulfillment externos.

### AliExpress habilitado

- exige URI afiliada;
- carga conexión/modelo bajo demanda;
- conserva catálogo y fallback externo existentes en la medida cubierta por los tests actuales.

### Dropshipping habilitado

- exige URL de servicio;
- conserva el envío externo existente en los puntos donde ya se ejecuta;
- no añade nuevas automatizaciones.

### MONEI habilitado

- exige API key y secreto de webhook;
- conserva la integración existente solo en la medida necesaria para mantenerla recuperable;
- no activa automáticamente AliExpress ni dropshipping.

Los tres flags son independientes. Activar catálogo AliExpress no activa automáticamente fulfillment; activar dropshipping no fuerza la consulta del catálogo afiliado ni activa MONEI; activar MONEI no activa catálogo externo ni fulfillment.

## 13. Fuera de alcance

Esta SPEC no debe resolver:

- manipulación de precios;
- pricing autoritativo;
- cálculo autoritativo de envío;
- transacciones Mongo, rollback o concurrencia de stock;
- normalización de variantes/SKU;
- migración o versionado del carrito;
- refactorización de `Checkout.jsx` o `Admin.jsx`;
- refactorización general de controllers;
- limpieza de código comentado;
- eliminación o actualización de dependencias;
- rediseño UI/UX o Design System;
- implementación de Bizum;
- implementación de transferencia bancaria;
- instrucciones bancarias en UI;
- cambio completo del checkout;
- nuevo modelo definitivo de pagos;
- refactor general, reactivación o corrección completa de MONEI;
- eliminación de controllers, services, rutas, webhook, campos o datos MONEI;
- idempotencia avanzada de webhooks;
- importación, enriquecimiento, sincronización o affiliate links;
- nuevas funciones de dropshipping;
- migraciones destructivas o eliminación de datos AliExpress.

Si uno de estos problemas aparece durante la implementación, debe registrarse como pendiente. Solo podrá abordarse el mínimo imprescindible si bloquea un criterio de esta SPEC, documentando el motivo y sin convertirlo en un refactor lateral.

## 14. Estrategia de tests obligatoria

Los tests nuevos deben aislar el entorno y restaurar variables/mocks entre casos. No deben depender de secretos ni de una base afiliada real.

### 14.1 Arranque y configuración

- Arrancar/importar la aplicación con los tres flags apagados o ausentes, sin `MONGO_URI_ALIEXPRESS`, `DROPSHIPPING_API_URL`, `MONEI_API_KEY` ni `MONEI_WEBHOOK_SECRET`.
- Verificar que el módulo/conexión afiliada no se evalúa o inicializa.
- Verificar error claro para `ALIEXPRESS_CATALOG_ENABLED=true` sin URI.
- Verificar error claro para `DROPSHIPPING_ENABLED=true` sin URL antes del uso de fulfillment.
- Verificar error claro para `MONEI_ENABLED=true` sin API key o secreto de webhook.

### 14.2 Catálogo

- `GET /api/products` devuelve productos locales activos con AliExpress apagado.
- La prueba no proporciona URI afiliada y demuestra que no hubo consulta afiliada.
- Los filtros locales ya existentes continúan funcionando en lo cubierto por la suite.

### 14.3 Detalle

- `GET /api/products/:id` devuelve un producto local sin conexión afiliada.
- Un ID no local devuelve 404 con AliExpress apagado sin intentar fallback externo.

### 14.4 Pedidos

- Un pedido exclusivamente local se crea sin conexión ni consulta afiliada.
- Un item explícitamente AliExpress se rechaza de forma controlada cuando el catálogo externo está apagado.
- La lectura/listado de un pedido histórico con metadata AliExpress no requiere infraestructura afiliada.

### 14.5 Dropshipping

- Al confirmar el pago por un camino que actualmente dispara fulfillment, el flag apagado evita invocar `sendToDropshipping` y cualquier `axios.post` externo.
- La ausencia de `DROPSHIPPING_API_URL` no produce error en modo apagado.
- La actualización del pago/pedido conserva el resultado core vigente.

### 14.6 MONEI

- Un pedido exclusivamente local se crea con MONEI apagado y conserva pago pendiente.
- No se crea un pago, redirect ni llamada HTTP a MONEI cuando `MONEI_ENABLED=false`.
- La ausencia de `MONEI_API_KEY` y `MONEI_WEBHOOK_SECRET` no impide arrancar ni operar en modo apagado.
- AliExpress, dropshipping y MONEI pueden permanecer deshabilitados simultáneamente.
- Controllers, rutas, webhook, campos e IDs históricos MONEI permanecen intactos.

### 14.7 Regresión

- Ejecutar primero los tests específicos de productos, pedidos y pagos.
- Ejecutar después la suite backend completa una vez.
- No se requiere build frontend si no se modifica frontend; si la implementación futura lo toca por una necesidad demostrada, deberá ejecutar lint y build.

## 15. Criterios de aceptación

- [x] **CA-01:** sin definir los flags, los tres se interpretan como `false`.
- [x] **CA-02:** el backend arranca sin `MONGO_URI_ALIEXPRESS`, `DROPSHIPPING_API_URL`, `MONEI_API_KEY` ni `MONEI_WEBHOOK_SECRET` cuando los flags están apagados.
- [x] **CA-03:** con AliExpress apagado no se evalúa/importa eager `AffiliateProduct`.
- [x] **CA-04:** con AliExpress apagado no se abre la conexión Mongo afiliada.
- [x] **CA-05:** con AliExpress apagado no se consulta ninguna colección afiliada.
- [x] **CA-06:** `GET /api/products` devuelve correctamente productos locales activos en modo deshabilitado.
- [x] **CA-07:** `GET /api/products/:id` devuelve un producto local sin infraestructura afiliada.
- [x] **CA-08:** un detalle no encontrado devuelve 404 sin fallback afiliado cuando el flag está apagado.
- [x] **CA-09:** un pedido exclusivamente local se crea sin cargar ni consultar `AffiliateProduct`.
- [x] **CA-10:** un item AliExpress se rechaza de forma controlada cuando la integración está apagada.
- [x] **CA-11:** consultas y administración de pedidos históricos con metadata AliExpress siguen funcionando.
- [x] **CA-12:** con dropshipping apagado no se ejecuta `sendToDropshipping` ni se realiza HTTP al proveedor.
- [x] **CA-13:** la confirmación de pago/pedido no falla por ausencia de `DROPSHIPPING_API_URL` en modo apagado.
- [x] **CA-14:** activar AliExpress sin `MONGO_URI_ALIEXPRESS` produce un error claro de configuración.
- [x] **CA-15:** activar dropshipping sin `DROPSHIPPING_API_URL` produce un error claro de configuración antes de llamar al proveedor.
- [x] **CA-16:** código, modelos, campos y datos históricos AliExpress/dropshipping/MONEI permanecen intactos.
- [x] **CA-17:** existen tests nuevos para el modo deshabilitado que cubren arranque, catálogo, detalle, pedido y fulfillment.
- [x] **CA-18:** todos los tests backend existentes continúan pasando.
- [x] **CA-19:** un pedido exclusivamente local se crea con MONEI apagado y permanece con pago pendiente.
- [x] **CA-20:** con MONEI apagado no se crean pagos, redirects ni llamadas HTTP a MONEI.
- [x] **CA-21:** AliExpress, dropshipping y MONEI pueden estar deshabilitados simultáneamente sin bloquear el core local.
- [x] **CA-22:** activar MONEI sin `MONEI_API_KEY` o `MONEI_WEBHOOK_SECRET` produce un error claro de configuración.
- [x] **CA-23:** controllers, services, rutas, webhook, campos e IDs históricos MONEI permanecen recuperables e intactos.

## 16. Tareas propuestas de implementación

1. **Configuración:** añadir los tres flags al módulo `env`, con defaults y validación condicionada documentados.
2. **Pruebas de carga:** preparar una prueba que falle si el modelo/conexión afiliada se evalúa con el flag apagado.
3. **Cargador AliExpress lazy:** encapsular el acceso a `AffiliateProduct` detrás de una función mínima que solo importe e inicialice al estar habilitado.
4. **Catálogo:** separar la consulta local obligatoria de la consulta afiliada opcional manteniendo el mapper y contrato actuales.
5. **Detalle:** condicionar el fallback afiliado al flag sin cargar infraestructura externa en modo apagado.
6. **Pedidos:** resolver pedidos locales exclusivamente desde `Product` cuando AliExpress esté apagado y rechazar items externos de forma controlada.
7. **Fulfillment:** condicionar el acceso a dropshipping al flag, fuera del camino core de confirmación cuando esté apagado.
8. **MONEI dormido:** impedir creación, redirects, webhooks requeridos y HTTP de MONEI cuando su flag esté apagado, sin eliminar rutas ni lógica histórica.
9. **Tests específicos:** cubrir configuración, catálogo, detalle, pedido local, histórico y ausencia de llamadas externas de fulfillment/MONEI.
10. **Validación final:** ejecutar tests específicos, suite backend completa y comprobar que no se borró ni migró código/dato legacy.

Cada tarea debe producir un cambio pequeño y verificable. No iniciar la siguiente si la anterior deja roto el modo local.

## 17. Riesgos y mitigaciones

### R1 — Imports con side effects

**Riesgo:** conservar imports estáticos puede abrir la conexión antes de leer el flag.  
**Mitigación:** import dinámico detrás de configuración y test que detecte evaluación/conexión en modo apagado.

### R2 — Dependencias indirectas en controllers

**Riesgo:** eliminar un import directo sin identificar catálogo, detalle y pedido puede producir errores en runtime.  
**Mitigación:** centralizar solo el acceso opcional al modelo y cubrir cada consumidor con tests específicos.

### R3 — Regresión del catálogo

**Riesgo:** reemplazar `Promise.all` puede cambiar orden, filtros, normalización o forma de respuesta local.  
**Mitigación:** conservar consulta/mapper local y afirmar el contrato existente en integración.

### R4 — Pedidos históricos AliExpress

**Riesgo:** confundir “deshabilitar” con limpiar campos puede romper lectura, tracking o admin.  
**Mitigación:** no migrar `Order`; añadir prueba de lectura de snapshot histórico sin conexión afiliada.

### R5 — Pagos aún acoplados a fulfillment

**Riesgo:** un import o llamada residual puede bloquear el pago aunque el servicio esté apagado.  
**Mitigación:** ubicar el guard antes de cargar el servicio y probar ausencia de llamada HTTP con confirmación core exitosa.

### R6 — MONEI parcialmente accesible

**Riesgo:** conservar rutas montadas sin un guard temprano puede permitir crear pagos o procesar webhooks aunque el flag esté apagado.  
**Mitigación:** comprobar `MONEI_ENABLED` antes de usar secretos o clientes externos y probar que no existe llamada HTTP.

### R7 — Tests dependientes del entorno local

**Riesgo:** la suite puede pasar solo porque existen variables AliExpress, dropshipping o MONEI en `.env`.  
**Mitigación:** borrar/restaurar variables dentro de tests, prohibir conexiones reales y usar mocks/contadores explícitos.

## 18. Validación final de la implementación futura

La implementación se considerará terminada únicamente si:

1. se cumplen los 23 criterios de aceptación;
2. los tests nuevos demuestran ausencia de imports/conexiones/consultas/HTTP externos y uso de MONEI en modo apagado;
3. la suite backend existente pasa completa;
4. el diff no contiene borrado de integración, migraciones destructivas ni cambios frontend no justificados;
5. cualquier deuda descubierta fuera de alcance queda documentada como tarea posterior, sin implementarse.

## 19. Próxima SPEC recomendada

**SPEC-002 — Checkout seguro y pagos manuales**

Objetivo futuro:

- convertir al backend en autoridad de precios;
- convertir al backend en autoridad de envío;
- implementar Bizum manual;
- implementar transferencia bancaria;
- mantener el estado de pago pendiente hasta confirmación;
- permitir confirmación manual administrativa;
- eliminar cualquier promesa visual de pago online mientras MONEI permanezca dormido.

Esta SPEC no se crea ni implementa ahora.

Otros pendientes posteriores que requieren SPEC independiente:

- cálculo autoritativo de precios y envío;
- atomicidad de pedido, stock y personalizaciones;
- contrato único de producto/variante/carrito;
- idempotencia y eventual reactivación completa de MONEI;
- corregir en la fase de checkout/pagos el endpoint de pago de desarrollo que intenta guardar `payment.method="test"`, valor que no pertenece al enum actual; queda fuera de SPEC-001 y no debe resolverse ampliando el modelo;
- modularización de controllers;
- limpieza de código legacy comentado;
- UI/UX, responsive y Design System.
