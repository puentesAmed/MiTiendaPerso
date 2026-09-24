# FASE 1 — Auditoría técnica y funcional de MiTiendaPerso

Fecha: 2026-09-24  
Alcance: estado actual del repositorio, sin refactorización ni correcciones.  
Método: búsquedas localizadas, inspección de entrypoints, rutas, modelos, controladores, servicios y flujos frontend; ejecución de tests, lint y build disponibles.  
Limitación: no existe `AGENTS.md` en el repositorio. Se han aplicado las reglas proporcionadas con la solicitud. No se ha realizado una auditoría visual en navegadores/dispositivos reales; los hallazgos UI/UX y responsive son estáticos y funcionales.

## 1. Resumen ejecutivo

MiTiendaPerso es un ecommerce funcional basado en React y Express, con catálogo, personalización, carrito persistente, checkout invitado/autenticado, pedidos, administración, emails, envío y una integración de pagos MONEI parcialmente conectada. La separación física inicial entre frontend, rutas, controladores, modelos y servicios es razonable, pero los flujos críticos concentran demasiadas responsabilidades.

El core no es actualmente independiente de AliExpress. La conexión afiliada se crea al importar el modelo, el catálogo consulta siempre las dos bases de datos, la creación de pedidos consulta siempre productos afiliados y el webhook de pago invoca directamente el envío a dropshipping. Por ello, apagar únicamente variables o servicios externos puede degradar o bloquear catálogo y checkout convencionales.

Hallazgos prioritarios:

- **CRÍTICO — integridad de importes:** pedido y cotización de envío aceptan precios enviados por el navegador. El backend comprueba que dos valores controlados por el cliente coincidan, pero no recalcula producto ni envío desde fuentes autoritativas.
- **ALTO — acoplamiento AliExpress:** catálogo y creación de pedido dependen directamente de `AffiliateProduct` y de una segunda conexión Mongo.
- **ALTO — proceso no transaccional:** personalizaciones y stock se modifican antes de completar el pedido; no existe transacción ni compensación si una fase posterior falla.
- **ALTO — fulfillment no fiable:** el servicio marca el pedido como enviado aunque falte SKU o falle una llamada al proveedor.
- **ALTO — pago incompleto en UI:** el checkout crea el pedido y navega a confirmación sin iniciar MONEI, aunque el botón indica “pagar”; el servicio frontend de pagos importa un cliente inexistente y las URLs de retorno no coinciden con el router actual.
- **MEDIO — deuda concentrada:** `Admin.jsx`, `Checkout.jsx`, `orders.controller.js`, `ProductCard.jsx` y `App.jsx` son grandes o conservan implementaciones anteriores comentadas.
- **MEDIO — contrato de variantes inconsistente:** detalle, carrito, pedido y vistas usan formas distintas (`skuId`, `providerSku`, `variantAttributes`, `selectedVariant`).
- **MEDIO — calidad desigual:** existen 27 tests backend que pasan, pero no hay tests frontend ni E2E. Build y lint pasan; el bundle principal es grande.

La separación conceptual `CORE ECOMMERCE` / `OPTIONAL dropshipping/aliexpress` sí encaja con el código, porque el modelo local `Product` ya es independiente. Debe hacerse mediante puertos/adaptadores y flags explícitos, preservando modelos y datos, no mediante eliminación inmediata.

## 2. Stack tecnológico detectado

| Área | Tecnología detectada | Evidencia/uso |
|---|---|---|
| Frontend | React 18, Vite 7 | `frontend/src/main.jsx`, `frontend/vite.config.js` |
| UI | Chakra UI 2, Emotion, Framer Motion, Swiper | layout, formularios, animaciones y carrusel |
| Routing | React Router DOM 7 | router declarativo en `frontend/src/router/index.jsx` |
| Estado | Context API + hooks | `AuthContext`, `CartContext`, `ThemeContext` |
| Formularios | React Hook Form + Zod | login/registro y validación |
| Diseño de producto | React Konva | editor y previews de personalización |
| HTTP frontend | Axios y un `fetch` directo | servicios; cotización de envío en `Checkout.jsx` |
| Backend | Node.js ESM, Express 4 | `Backend/src/server.js`, `Backend/src/app.js` |
| Base de datos | MongoDB con Mongoose 8 | conexión core y conexión afiliada separada |
| Autenticación | JWT + bcrypt | middleware y controlador de auth |
| Pagos | MONEI vía Axios | creación de pago y webhook |
| Email | Nodemailer/SMTP | confirmación y cambios de pedido |
| Uploads/archivos | Multer, Archiver | imágenes y ZIP de personalizaciones |
| Seguridad operativa | CORS, express-rate-limit | orígenes configurables y límites parciales |
| Testing | `node:test`, Supertest, MongoDB Memory Server | 27 pruebas backend |
| Build/calidad | Vite, ESLint | build y lint frontend |
| Despliegue | No determinado | no se detectaron manifiestos Docker/Render/Vercel/CI |

Dependencias declaradas sin uso detectado y candidatas a verificación, no a eliminación automática: `archiver`, `node-fetch` y `uuid` en frontend; `mongodb`, `node-fetch`, `helmet` y `morgan` en backend. Backend declara a la vez `bcrypt` y `bcryptjs`, usados respectivamente por auth y seed.

## 3. Arquitectura actual

### Entry points y composición

- Frontend: `frontend/src/main.jsx` monta Chakra, tema, auth, carrito y router. `App.jsx` contiene shell, navegación, menú móvil, footer y aviso de cookies.
- Backend: `Backend/src/server.js` conecta Mongo core y arranca `createApp()`; `Backend/src/app.js` configura CORS, parsers, rate limits, estáticos, rutas, 404 y error global.
- Persistencia: una conexión Mongoose principal (`MONGO_URI`) y otra afiliada creada de forma eager (`MONGO_URI_ALIEXPRESS`).

### Capas observadas

- Frontend separa páginas, componentes, contextos, hooks, servicios y utilidades, aunque checkout y admin eluden parcialmente servicios.
- Backend separa routes/controllers/models/services/utils/config, pero la lógica de negocio crítica está mayoritariamente en controllers.
- No se detectaron jobs, cron, colas, workers ni scripts de importación/enriquecimiento AliExpress dentro del repositorio. Sí existen seeds locales y un script debug de ZIP.
- No se detectaron imports circulares evidentes en la revisión estática; no existe herramienta automática configurada para garantizarlo.

### Tests

- Backend: integración de auth, productos, pedido, personalización, pago y error seguro del endpoint externo de envío.
- Frontend: no hay runner ni tests de componentes, hooks, responsive o E2E.
- Cobertura crítica ausente: manipulación de precio/envío, fallo de stock concurrente, rollback, catálogo con afiliados desconectados, pedido exclusivamente local sin conexión afiliada, webhook duplicado/concurrente y contrato de variantes completo.

## 4. Frontend

### Estructura y estado

El frontend utiliza páginas por dominio y servicios API básicos. Auth y carrito residen en Context; el tema usa Chakra. El carrito se persiste por usuario en `miTienda_cart_v1_<id>` y para invitado en `guest_session_v1`, con un `guest_id` adicional.

Problemas detectados:

- **MEDIO:** lógica de sesión invitada duplicada entre `CartContext.jsx`, `guestSession.service.js` y `Checkout.jsx`; cada implementación maneja hidratación/TTL de forma distinta.
- **MEDIO:** el checkout llama `fetch` directamente y Admin llama HTTP/descargas directamente; la frontera de servicios no es consistente.
- **MEDIO:** numerosos archivos conservan versiones enteras comentadas (`App`, router, AuthContext, ProductCard, Login, OrderTracking, ProductPreview360 y rutas backend). No afectan al bundle si están comentadas, pero elevan el riesgo de editar la implementación equivocada.
- **MEDIO:** `Admin.jsx` (1.554 líneas) y `Checkout.jsx` (826) combinan datos, validación, estado, presentación y acciones.
- **BAJO:** imports sin extensión y convenciones de rutas/naming mezcladas; no bloquean el build actual.

### Routing

Rutas activas principales: `/`, `/Inicio`, `/productos`, `/productos/:id`, `/personalizar/:id`, `/carrito`, `/checkout`, `/mis-pedidos`, `/confirmacion-pedido`, legales, seguimiento y `/admin` protegido por rol.

- **MEDIO:** Home enlaza sus productos simulados a `/producto/:id`, ruta inexistente; el router usa `/productos/:id`.
- **MEDIO:** las URLs MONEI apuntan a `/order-confirmation/:id`, ruta inexistente en el frontend actual.
- **BAJO:** no hay ruta comodín/404 activa; una URL desconocida queda sin contenido hijo útil.
- `/mis-pedidos` no está envuelta en `ProtectedRoute`; la API sí exige JWT y la página gestiona el error, pero la experiencia es menos predecible.

## 5. Backend

La infraestructura Express está razonablemente centralizada y aplica límites a login/registro, tracking, shipping externo y creación de pago. Auth JWT y autorización admin están separadas. Sin embargo, catálogo, pedidos y pagos contienen acoplamiento de integración y reglas de negocio dentro de controllers.

Hallazgos:

- **CRÍTICO:** `createOrder` usa `cartItem.price`; `getShippingQuote` usa `item.price`; `createOrder` acepta también `shipping.price`, zona y plazos. La validación del total no protege porque todos los operandos vienen del cliente.
- **ALTO:** el decremento de stock se ejecuta antes de crear el pedido, en `Promise.all`, sin comprobar `matchedCount/modifiedCount`. Dos compras concurrentes o un fallo posterior pueden producir pedido sin stock, stock descontado sin pedido o total inconsistente.
- **ALTO:** las personalizaciones y ZIP se crean antes de validar el total y antes del pedido. Un error posterior puede dejar documentos/archivos huérfanos.
- **ALTO:** no hay sesión/transacción Mongo que agrupe personalización, stock, pedido y relaciones.
- **MEDIO:** `orders.controller.js` (617 líneas) mezcla validación, consulta de catálogos, pricing, stock, personalización, ZIP, persistencia y emails.
- **MEDIO:** errores de email se degradan correctamente en creación, pero los cambios administrativos esperan el email dentro del `try`; un fallo SMTP puede devolver 500 después de haber guardado el cambio.
- **MEDIO:** `optionalAuth` trata un token inválido como invitado, lo que puede sorprender al usuario y crear un pedido guest si el frontend aporta sus datos.
- **BAJO:** logs de depuración permanecen en arranque/creación de pedido.

## 6. Modelos de datos relevantes

### Product local

`Backend/src/models/Product.js` representa el producto convencional: nombre, descripción, precio numérico, imágenes, stock numérico, activo, categoría, variantes simples por talla/color y configuración de personalización. Es suficiente como base del ecommerce core.

### AffiliateProduct

Usa `models/schemas/product.schema.js` sobre la conexión afiliada. Contiene conceptos exclusivos o principalmente ligados a dropshipping:

- `externalId`, `provider`, `source`;
- precio con `cost`, `value`, `margin`, `currency`;
- stock `Mixed`;
- bloque `affiliate` con promotion link y comisión;
- `isDropshippable`, `hasSkuData`, variantes libres;
- origen/métodos/plazos de envío y `lastSyncedAt`.

El esquema mezcla afiliación, dropshipping y catálogo externo en una sola entidad. No debe trasladarse al modelo local ni eliminarse en esta fase.

### Order

Contiene snapshot de líneas, datos de usuario/guest, estados, pago, envío, dirección y personalizaciones. Los campos `items.provider`, `items.externalId`, `items.providerSku` y el bloque `dropshipping.sent/sentAt` son dependencias exclusivas del dominio suspendido.

Mantiene dos representaciones de pago (`payment.status` y `paymentStatus`, más fechas paralelas) por compatibilidad legacy. Esto exige sincronización manual y es fuente de divergencias.

### User y Customization

`User` es convencional (nombre, email, password hash, rol). `Customization` es core para MiTiendaPerso: guarda diseño, previews, mockups, ZIP, vínculo al pedido y estado de producción. No depende de AliExpress.

## 7. Flujo de catálogo

1. `Products.jsx` llama `apiGetProducts`.
2. `GET /api/products` ejecuta en paralelo consultas a `Product` y `AffiliateProduct`.
3. El controller concatena ambas fuentes y normaliza nombres, imágenes, precio, stock y variantes.
4. El servicio frontend vuelve a normalizar el producto y `Products` lo renderiza en `ProductCard`.

**ALTO:** una caída, latencia o falta de configuración de la base afiliada puede hacer fallar todo el catálogo local debido a `Promise.all`. No existe flag, timeout/fallback de fuente ni repositorio de catálogo desacoplado.

**MEDIO:** la normalización está duplicada backend/frontend y contiene reglas diferentes. El frontend fuerza todo AliExpress a `stock = 1`, ignorando el stock normalizado por el backend.

## 8. Flujo de producto

El detalle intenta primero `Product` local y después `AffiliateProduct`, luego aplica el mismo mapper del catálogo. La UI separa variantes locales de atributos dinámicos AliExpress.

Problemas:

- **ALTO:** el detalle pasa a `addItem` un `skuId` string donde `CartContext` espera un objeto variante. El SKU y atributos no llegan al formato esperado.
- **MEDIO:** productos locales guardan talla/color como cuarto argumento (personalización) y el carrito activo no crea `selectedVariant`; Cart/Checkout intentan leer precisamente `selectedVariant`.
- **MEDIO:** la galería muestra una imagen principal grande, pero no ofrece miniaturas, selección accesible ni estados claros de imagen rota/vacía.
- **BAJO:** ProductCard dispone de fallback `onError`, pero ProductDetail no.

## 9. Flujo de carrito

`CartContext` gestiona items, persistencia, sumas y acciones. Para autenticados usa una clave por usuario; para invitados guarda sesión durante siete días. No existe carrito backend.

- **MEDIO:** el carrito depende enteramente de `localStorage`; no hay sincronización multi-dispositivo ni merge explícito guest→usuario. El registro vincula pedidos guest, no necesariamente carrito.
- **MEDIO:** identidad de línea usa `productId + skuId`, pero `removeItem` y `updateQuantity` solo usan `productId`; variantes del mismo producto se eliminan/actualizan conjuntamente.
- **MEDIO:** contrato de línea mezcla `skuId`, `variantAttributes`, `selectedVariant`, `provider`, `externalId` y `supplierId` sin tipo o adaptador único.
- **ALTO:** precio persistido en navegador se reenvía y el backend confía en él.
- La lógica AliExpress está activa en el carrito mediante proveedor, IDs externos y SKU, aunque no existe llamada directa al proveedor.

## 10. Flujo de checkout

1. Hidrata email, direcciones, notas y sesión guest.
2. Valida personalizaciones requeridas.
3. Solicita `/api/shipping/quote` al cambiar dirección/items.
4. Envía items, envío y total a `/api/orders`.
5. Crea el pedido con pago pendiente.
6. Navega a `/confirmacion-pedido` y limpia carrito/sesión.

- **CRÍTICO:** subtotal y cotización usan precios del cliente; pedido vuelve a aceptar esos precios y la propia cotización del cliente.
- **ALTO:** el botón indica “Confirmar pedido y pagar”, pero el bloque MONEI está comentado; el flujo confirma “pedido creado” sin pago.
- **MEDIO:** usa `VITE_API_URL` directamente en `fetch` sin fallback al baseURL de `http`; una configuración ausente produce una URL `undefined/api/...` aunque el resto de servicios funcione en localhost.
- **MEDIO:** el componente contiene bloques históricos comentados y estados extensos, dificultando distinguir la secuencia vigente.
- El endpoint `/api/checkout/shipping-options` consulta `api.milugui.com`, pero el checkout actual no lo usa. Es una integración externa residual que puede dormirse sin afectar el flujo actual, previa prueba.

## 11. Flujo de pedidos

Flujo actual:

`checkout → createOrder → consulta local+afiliado → personalización/ZIP → cálculo con precio cliente → decremento stock local → Order.create → vínculo personalización → emails → confirmación UI → administración/seguimiento`

El procesamiento administrativo permite confirmar pago manual, fecha de entrega y estados. Los pedidos autenticados se consultan por `userId`; invitados pueden rastrear por ID+email.

Puntos dropshipping:

- consulta obligatoria de `AffiliateProduct` al crear cualquier pedido;
- branching de stock/personalización según `provider`;
- snapshot de IDs/SKU externos;
- campos de estado dropshipping;
- fulfillment automático solo desde webhook MONEI y endpoint de pago de test, no desde confirmación manual admin.

Para que pedidos sean independientes debe existir una resolución de producto core que funcione sin proveedor, y el fulfillment debe reaccionar a un evento/puerto opcional después de confirmar pago, nunca ser importado por el controller de pago.

## 12. Flujo de pagos

Backend implementa creación MONEI y webhook firmado con HMAC. El importe se toma del `Order` persistido, lo cual sería correcto si el pedido hubiera sido calculado de forma autoritativa. El pago exitoso actualiza estado y llama dropshipping.

- **ALTO:** no se observa idempotencia persistente por `event.id` ni actualización condicional atómica. Dos webhooks concurrentes pueden procesar el mismo pago antes de que el flag de dropshipping sea visible.
- **ALTO:** la respuesta al webhook espera fulfillment externo; una integración suspendida/lenta queda dentro del camino crítico del pago.
- **ALTO:** `payments.service.js` importa `{ api }`, pero `http.js` solo exporta `http`. Está latente porque el import/uso MONEI está comentado en checkout.
- **ALTO:** `callbackUrl`/`completeUrl` usan `/order-confirmation/:id`, que no existe; la ruta real es `/confirmacion-pedido` y depende de `location.state`.
- **MEDIO:** la creación de pago no guarda `providerPaymentId` ni un intento antes de redirigir.
- **MEDIO:** el webhook actualiza `payment.status` pero no el campo legacy `paymentStatus`.
- **MEDIO:** la suite prueba guards de pedido pagado/cancelado/entregado, pero no firma/webhook, reintentos, éxito MONEI ni fallo del fulfillment.
- La confirmación manual admin no llama dropshipping; existe divergencia operativa entre métodos de confirmación.

## 13. Integraciones externas

| Integración | Punto de entrada | Estado/impacto |
|---|---|---|
| MongoDB core | `config/db.js` | obligatoria para toda la app |
| MongoDB afiliado | `config/dbAffiliate.js` | conexión eager; contamina arranque, catálogo y pedidos core |
| Servicio dropshipping | `dropshipping.service.js` | POST por item al confirmar pago MONEI/test |
| Envío Milugui | `checkout.routes.js` | endpoint montado y testeado; no usado por checkout actual |
| MONEI | `payments.controller.js` | backend presente; frontend desconectado/inconsistente |
| SMTP | `email.service.js` | confirmaciones/estados; tolerancia desigual a fallos |
| Assets remotos | `generateCustomizationZip.js` | descarga mockups/assets para ZIP |
| Filesystem local | uploads/ZIP | requiere persistencia y estrategia de despliegue no documentada |

Variables detectadas: `MONGO_URI`, `MONGO_URI_ALIEXPRESS`, `DROPSHIPPING_API_URL`, `JWT_SECRET`, `PORT`, `NODE_ENV`, `CORS_ORIGINS`, `FRONTEND_URL`, `MONEI_API_KEY`, `MONEI_WEBHOOK_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `ADMIN_EMAIL`, `VITE_API_URL`.

No existe `.env.example`. Hay archivos `.env` locales ignorados; no se inspeccionaron ni reprodujeron secretos.

## 14. Inventario AliExpress/dropshipping

### Backend

| Elemento | Archivo | Relación |
|---|---|---|
| Conexión afiliada | `src/config/dbAffiliate.js` | usa `MONGO_URI_ALIEXPRESS`; conexión al importar |
| Esquema afiliado | `src/models/schemas/product.schema.js` | provider/source/affiliate/costes/margen/SKU/envío/sync |
| Modelo afiliado | `src/models/AffiliateProduct.js` | modelo sobre conexión secundaria |
| Catálogo | `src/controllers/products.controller.js` | mezcla local+afiliado y normaliza precios/stock/variantes |
| Pedido | `src/controllers/orders.controller.js` | consulta afiliados y bifurca stock/personalización |
| Modelo pedido | `src/models/Order.js` | provider, externalId, providerSku, estado dropshipping |
| Fulfillment | `src/services/dropshipping.service.js` | filtra items AliExpress y crea supplier orders |
| Pago | `src/controllers/payments.controller.js` | invoca fulfillment tras MONEI/test |
| Checkout externo | `src/routes/checkout.routes.js` | cotización por seller/product/SKU en Milugui |
| Variables/docs | README y runtime | URI afiliada y URL dropshipping |

No se localizaron controllers de importación/enriquecimiento, jobs, cron, webhooks AliExpress, sincronizadores ni scripts AliExpress en este repositorio. Es posible que el servicio señalado por `DROPSHIPPING_API_URL` pertenezca a otro sistema no incluido.

### Frontend

| Elemento | Archivo | Relación |
|---|---|---|
| Normalización | `utils/normalizeProduct.js` | título/precio y disponibilidad AliExpress |
| Tarjeta | `components/ProductCard.jsx` | variantes array y compatibilidad de precio |
| Detalle | `pages/ProductDetail/ProductDetail.jsx` | atributos/SKU dinámicos y branching explícito |
| Carrito | `context/CartContext.jsx` | externalId/provider/supplierId/skuId |
| Carrito/checkout | vistas | muestran contrato legacy `selectedVariant`; reenvían datos externos |
| README | `frontend/README.md` | describe ecommerce híbrido y automatización total |

No se detectó una pantalla admin específica de AliExpress: Admin opera CRUD del modelo local mediante `/api/products`.

## 15. Dependencias del core hacia dropshipping

### Dependencias directas y activas

1. Arranque/import graph: `app → products/orders controller → AffiliateProduct → dbAffiliate`.
2. Catálogo: `getProducts` requiere que consulta local y afiliada completen.
3. Detalle: fallback obligatorio a modelo afiliado cuando no encuentra local.
4. Pedido: siempre consulta ambos repositorios y entiende `provider`.
5. Pago MONEI/test: importa e invoca directamente `sendToDropshipping`.
6. Modelo de pedido y contratos frontend incluyen datos de proveedor.

### Grado de mezcla

- **ALTO en backend:** catálogo, pedido y pago conocen AliExpress por nombre y esquema.
- **MEDIO en frontend:** detalle y normalización tienen ramas explícitas; carrito conserva campos externos.
- **BAJO en producto local, auth, personalización, shipping core y admin local:** pueden formar el núcleo independiente.

El apagado seguro no consiste en borrar campos. Debe impedir que el core importe/conecte/consulte la integración cuando esté deshabilitada, manteniendo documentos históricos legibles.

## 16. Código potencialmente obsoleto

- Implementaciones anteriores comentadas en `App.jsx`, `router/index.jsx`, `AuthContext.jsx`, `ProductCard.jsx`, `Login.jsx`, `OrderTracking.jsx`, `ProductPreview360.jsx`, `customizations.routes.js`, `CartContext.jsx`, `Checkout.jsx` y `Order.js`.
- `createSupplierOrder` parece no tener consumidores; `sendToDropshipping` usa otro endpoint/payload.
- `/api/checkout/shipping-options` no es llamado por el frontend actual.
- `payments.service.js` está desconectado y su import está roto.
- Scripts npm `seed` y `seed:categories` apuntan a `scripts/seed.js` y `scripts/seedCategories.js`, archivos no presentes.
- Home muestra productos destacados simulados y enlaza una ruta obsoleta.
- `ThemeContext` existe, pero `main.jsx` usa Chakra y no monta ese provider; candidato a legado.
- Dependencias sin imports detectados enumeradas en la sección de stack.

Clasificación **potencial**: antes de eliminar se requiere búsqueda de consumidores, smoke test y SPEC específica. No se recomienda eliminar nada en la fase de aislamiento.

## 17. Deuda técnica

### ALTO

- Autoridad de precios/envío en cliente.
- Falta de transacción/compensación en pedido.
- Acoplamiento directo de controllers core a integración afiliada.
- Contrato de variante/SKU divergente entre capas.
- Fulfillment que registra éxito global pese a fallos parciales.

### MEDIO

- Controllers/componentes monolíticos y lógica de negocio en UI/controllers.
- Doble estado de pago legacy.
- Persistencia guest duplicada.
- Bloques históricos voluminosos en archivos activos.
- Acceso HTTP fuera de servicios.
- Errores silenciosos en storage y errores de integración reducidos a mensajes genéricos sin trazabilidad estructurada.
- Ausencia de validación de payload centralizada en backend.
- Sin tests frontend/E2E ni pipeline detectado.
- Bundle JS principal de 1.232,87 kB (394,74 kB gzip) y sin code splitting por rutas.

### BAJO

- Naming y rutas bilingües/inconsistentes.
- Comentarios decorativos y logs de depuración.
- Tokens de diseño parciales combinados con colores/medidas hardcoded.
- Documentación histórica no alineada del todo con el flujo actual.

## 18. Auditoría UI/UX

### Fortalezas

- Chakra aporta controles accesibles, responsive props y estados de formulario.
- Catálogo, detalle, pedidos y diseñador tienen loading/error/empty en varios puntos.
- Existe feedback al añadir al carrito, aviso de cookies, navegación móvil y tema claro/oscuro.
- Catálogo conserva/restaura scroll al volver desde detalle.
- Checkout conserva borrador guest y muestra resumen, envío, términos y validaciones.

### Problemas

- **ALTO:** promesa de pago incoherente: CTA de pagar termina en “pedido creado” con pago pendiente.
- **MEDIO:** Home usa contenido simulado, rutas rotas e imágenes sin evidencia de fallback; la sección destacada no usa el catálogo real ni `ProductCard`.
- **MEDIO:** navegación, tarjetas y formularios combinan `brand`, `blue`, `pink`, `purple`, hexadecimales y CSS, debilitando jerarquía/consistencia.
- **MEDIO:** `#root` fija `max-width`, padding y `text-align:center` globalmente; puede comprimir shell y formularios y fuerza overrides locales.
- **MEDIO:** ProductCard abre un modal solo al añadir el primer item; los siguientes no producen el mismo feedback.
- **MEDIO:** carrito/checkout esperan `selectedVariant` que el flujo activo no guarda; el usuario puede perder confirmación visual de talla/color.
- **MEDIO:** detalle no tiene galería navegable de miniaturas aunque recibe `images`; solo muestra la activa.
- **MEDIO:** Admin concentra tres dominios en una vista de 1.554 líneas; tablas/formularios densos requieren evaluación específica en móvil.
- **BAJO:** estados usan patrones diferentes (texto, Alert, Spinner, toast, modal) sin componentes compartidos de loading/error/empty.
- **BAJO:** no existe página 404 activa ni recuperación consistente ante rutas desconocidas.

Áreas que podrían adoptar posteriormente patrones equivalentes a RicoSaborCubanoMiLuGui: shell móvil, catálogo/cards reales en Home, galería de detalle, feedback uniforme de carrito, restauración de navegación, checkout por pasos/estado, tablas admin adaptables e imágenes con ratio/fallback/skeleton. No se ha leído ni copiado ese proyecto.

## 19. Responsive/mobile

- Catálogo usa 1/2/3/4 columnas y detalle pasa de una a dos columnas; navegación tiene menú móvil; varias páginas usan stacks responsivos.
- El hero usa `2.8rem` en móvil y banners de altura fija; requiere prueba en 320–375 px y con zoom de texto.
- La imagen principal de detalle usa altura fija de 360 px; puede consumir gran parte del viewport o dejar espacios en imágenes verticales.
- ProductCard usa imagen fija de 180 px y botones lado a lado; nombres largos/personalización pueden comprimir acciones.
- Checkout y Admin tienen alta densidad de controles. No se encontraron tests visuales ni breakpoints E2E.
- El padding global de `#root` (2 rem) se suma al padding de páginas, reduciendo ancho útil móvil.
- La navegación móvil está implementada, pero debe verificarse foco, cierre al navegar, scroll lock y targets táctiles en prueba real.

Prioridad futura: matriz 320/375/768/1024 px, teclado, zoom 200 %, dark mode y contenido largo, sin rediseñar antes de estabilizar contratos.

## 20. Componentes candidatos a reutilización

Existentes a consolidar:

- `ProductCard` como única tarjeta de producto, también para Home.
- `OrderTimeline` para pedidos, seguimiento y admin.
- `CustomizationInlineSummary` para carrito, checkout y pedido.
- `GuestSessionNotice`, `Logo`, `CookieNotice`.
- `ProductPreviewGallery`/`ProductPreview360` para una experiencia de imágenes coherente.

Candidatos a extraer en SPEC futura, solo tras fijar comportamiento:

- `AsyncState`/`PageState` para loading, error y empty.
- `Price` y `ProductImage` con moneda, rango, ratio y fallback únicos.
- selector convencional de variantes y adaptador de línea de carrito.
- formulario reutilizable de dirección.
- resumen monetario (`subtotal`, envío, total) con datos autoritativos.
- tablas/cards responsive de administración.
- encabezado de sección, confirmación de acción y feedback de carrito.

No conviene crear estos componentes durante el aislamiento si no son necesarios para cumplir su SPEC.

## 21. Riesgos de refactorización

1. **CRÍTICO — pricing/checkout:** cambiar normalización o esquema puede alterar precios, totales y pagos; exige tests de manipulación y regresión extremo a extremo.
2. **ALTO — catálogo:** retirar la consulta afiliada sin preservar el contrato `{price, stock, variants, provider}` puede romper ProductCard/detalle/admin.
3. **ALTO — carrito/variantes:** corregir `skuId/providerSku/selectedVariant` puede invalidar carritos persistidos existentes; requiere migración tolerante/versionada.
4. **ALTO — pedidos/stock/personalización:** modularizar sin transacción puede cambiar el orden de efectos y crear huérfanos o stock incorrecto.
5. **ALTO — pagos:** desacoplar fulfillment del webhook debe preservar idempotencia, confirmación y respuesta rápida a MONEI.
6. **MEDIO — auth/guest:** unificar storage puede perder carrito o borrador de checkout.
7. **MEDIO — UI legacy:** eliminar bloques comentados sin smoke tests puede borrar referencias útiles, aunque no sean código activo.
8. **MEDIO — admin:** dividir el componente puede alterar permisos, filtros, formularios o descargas.

## 22. Arquitectura objetivo propuesta

La separación propuesta encaja con el código existente si se introduce de forma incremental:

```text
CORE ECOMMERCE
├── products
│   ├── Product (modelo local)
│   ├── ProductRepository
│   └── ProductPricing (autoridad servidor)
├── catalog
│   └── CatalogService (fuentes opcionales, core siempre disponible)
├── cart
│   └── CartLine contract/version adapter
├── checkout
│   ├── CheckoutService
│   ├── ShippingQuoteService
│   └── payload validators
├── orders
│   ├── OrderService
│   ├── stock/customization transaction boundary
│   └── Order events
├── payments
│   ├── PaymentGateway port
│   ├── Monei adapter
│   └── idempotent webhook handler
├── users
└── admin

OPTIONAL / DORMANT
└── dropshipping
    └── aliexpress
        ├── AffiliateProductRepository
        ├── catalog source adapter
        ├── fulfillment adapter
        ├── external shipping adapter
        └── configuration/feature flag
```

Reglas de dependencia:

- Core define puertos; AliExpress los implementa. Core nunca importa `AffiliateProduct`, `dbAffiliate` ni `dropshipping.service` directamente.
- Configuración explícita `DROPSHIPPING_ENABLED=false` y `ALIEXPRESS_CATALOG_ENABLED=false` evita crear conexión/importar/consultar la integración.
- Catálogo core responde con productos locales aun cuando una fuente opcional esté caída.
- Order conserva snapshots/metadata legacy para leer históricos, pero el flujo convencional no necesita rellenarlos.
- Pago publica `payment.confirmed`; un dispatcher opcional decide si hay fulfillment. El webhook no espera una red externa no esencial.
- Pricing y shipping se recalculan en backend a partir de IDs, cantidad, variante y dirección; el cliente solo presenta estimaciones.
- No se propone migración destructiva de datos en las primeras fases.

## 23. Fases recomendadas

### Fase 2 — Dormir AliExpress de forma reversible

- Añadir flags de configuración validados.
- Encapsular conexión/modelo afiliado tras un adaptador lazy.
- Hacer catálogo y pedido local operativos sin URI/base afiliada.
- Sustituir import directo de fulfillment por puerto no-op cuando esté deshabilitado.
- Mantener modelos, campos y código externo; añadir tests de core con integración apagada.

### Fase 3 — Integridad de checkout y pedido

- Recalcular producto, variante, subtotal y envío en servidor.
- Validar payloads y cantidades.
- Introducir transacción o compensaciones para stock/personalización/pedido.
- Cubrir concurrencia, manipulación y rollback.

### Fase 4 — Contratos de producto/variante/carrito

- Definir DTO único y versionado.
- Adaptar carritos persistidos de forma tolerante.
- Eliminar branching AliExpress de componentes core mediante capacidades normalizadas.

### Fase 5 — Pagos

- Elegir explícitamente si MONEI queda activo.
- Corregir cliente/rutas de retorno y modelo de intentos.
- Hacer webhook idempotente y desacoplado del fulfillment.
- Alinear estados legacy sin migración destructiva inicial.

### Fase 6 — Modularización y tests

- Extraer services desde controllers y subcomponentes con responsabilidad clara.
- Añadir tests frontend y E2E de catálogo→carrito→checkout→pedido.
- Limpiar código comentado solo con inventario y smoke tests aprobados.

### Fase 7 — UI/UX y responsive

- Consolidar design tokens/estados/componentes.
- Sustituir Home simulada por catálogo real.
- Mejorar galería, feedback de carrito, navegación y checkout.
- Verificación visual/móvil y accesibilidad.

## 24. Propuesta de próxima SPEC

**Nombre:** `SPEC-002-isolate-dormant-aliexpress.md`

**Objetivo:** conseguir que MiTiendaPerso arranque y complete catálogo local, detalle local, carrito, checkout convencional y creación/confirmación de pedidos con AliExpress/dropshipping deshabilitado, sin borrar código, modelos, campos ni datos relacionados.

**Alcance recomendado:**

- flags `ALIEXPRESS_CATALOG_ENABLED` y `DROPSHIPPING_ENABLED`, desactivados por defecto;
- conexión/modelo afiliado lazy y solo cuando el flag esté activo;
- interfaz de fuente de catálogo con implementación local obligatoria y afiliada opcional;
- resolución de pedido local sin consulta afiliada;
- puerto de fulfillment con implementación no-op/dormant;
- tests que demuestren arranque y flujos core sin `MONGO_URI_ALIEXPRESS` ni `DROPSHIPPING_API_URL`;
- conservación total del código y campos AliExpress existentes.

**Fuera de alcance:** borrar datos/código, rediseñar UI, cambiar esquema de producto/pedido, reactivar MONEI, importar/enriquecer AliExpress o corregir globalmente la deuda técnica.

**Nota de seguridad para planificación:** la siguiente SPEC posterior debe abordar de inmediato el cálculo autoritativo de precios/envío y la atomicidad del pedido. El aislamiento no debe ampliar alcance mezclando ambos cambios, salvo los mínimos imprescindibles para que el core local funcione.

## Validación de la auditoría

- `Backend: npm test` — 27/27 tests pasan.
- `frontend: npm run lint` — pasa, con aviso informativo de datos de `baseline-browser-mapping` desactualizados.
- `frontend: npm run build` — pasa; advierte chunk principal superior a 500 kB (1.232,87 kB, 394,74 kB gzip).
- Estado Git comprobado antes de crear este informe; los artefactos temporales generados por tests fueron retirados.
