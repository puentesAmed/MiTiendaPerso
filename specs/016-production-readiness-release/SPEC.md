# SPEC-016 — Production Readiness & Release

## Estado

**Estado:** implementación completada; release bloqueada hasta resolver los bloqueadores documentados  
**Dependencia:** SPEC-015 revisada; esta SPEC no modifica su alcance de UI/rendimiento.

## Objetivo

Preparar MiTiendaPerso para un despliegue productivo controlado y reproducible, sin nuevas funcionalidades comerciales, rediseño, cambios de pricing, fórmulas de envío, contratos de carrito/pago ni migraciones de datos.

## Arquitectura real

### Frontend

- React 18 con React Router y Vite 7.
- Código activo en `frontend/`; entrada `frontend/src/main.jsx` y router `frontend/src/router/index.jsx`.
- Build: `npm ci` y `npm run build`; salida `frontend/dist`.
- API HTTP centralizada con Axios. La variable existente es `VITE_API_URL`.
- Autenticación mediante JWT en cabecera `Authorization: Bearer` almacenado por el cliente; no usa cookies de sesión.
- `createBrowserRouter` requiere fallback del hosting a `index.html` para rutas SPA.
- Vite no publica source maps por configuración; se conserva el valor por defecto.
- No existe destino de despliegue frontend configurado. No se añadirá uno específico.

### Backend

- Node.js ESM, Express 4 y Mongoose 8; entrada `Backend/src/server.js`.
- Comando de producción: `npm ci --omit=dev` y `npm start`.
- Puerto tomado de `PORT`, con `3000` como valor local.
- MongoDB mediante `MONGO_URI`; el arranque espera conexión antes de escuchar.
- CORS mediante `CORS_ORIGINS`, con `FRONTEND_URL` como fallback únicamente en producción.
- JWT mediante `JWT_SECRET`, expiración actual de 12 horas y autorización admin/ownership en rutas existentes.
- SMTP mediante Nodemailer y variables `SMTP_*`, `EMAIL_FROM` y `ADMIN_EMAIL`.
- Health barato existente: `GET /health` → HTTP 200 y `{ "status": "ok" }`; no comprueba Mongo.
- Imágenes y ZIP se guardan y sirven desde `Backend/uploads` (filesystem local).
- No existe destino de despliegue backend configurado.

### Datos

- MongoDB es la base principal.
- No hay migraciones ni cambios de schema en esta SPEC.
- La base afiliada solo puede cargarse dinámicamente cuando AliExpress está habilitado.

## Alcance de implementación

1. Completar ejemplos de entorno sin secretos y documentar variables frontend/backend.
2. Dejar de versionar `.env` preservando los archivos locales e ignorar variantes locales.
3. Restringir el fallback `localhost` de la API al modo desarrollo.
4. Añadir 404 mínima y Error Boundary global sin rediseñar el shell.
5. Mantener CORS cerrado en producción y cabeceras seguras con la dependencia `helmet` ya instalada.
6. Mantener respuesta global de error sin stack/configuración en producción y logs operativos acotados.
7. Añadir cierre limpio de HTTP y Mongo ante `SIGTERM`/`SIGINT`.
8. Impedir que el endpoint heredado de shipping externo quede montado cuando dropshipping está apagado.
9. Mantener MONEI, AliExpress y dropshipping deshabilitados por defecto y sin secretos obligatorios.
10. Corregir únicamente flujos SMTP directos que puedan devolver falso error después de persistir.
11. Eliminar solo artefactos de debug inequívocos sin consumidores.

## Entornos y variables

### Obligatorias en producción

- `NODE_ENV=production`
- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `FRONTEND_URL`
- `CORS_ORIGINS` (o `FRONTEND_URL` como único origen)
- `VITE_API_URL` durante el build frontend cuando API y frontend no comparten origen

`JWT_SECRET` no tendrá valor por defecto. En producción debe ser largo y no trivial.

### SMTP

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`
- `EMAIL_FROM`, `ADMIN_EMAIL`

SMTP es opcional. Si se configura, el bloque debe estar completo. Un fallo de envío se registra sin revertir una persistencia ya confirmada.

### Pagos manuales

- `MANUAL_PAYMENT_BIZUM_ENABLED`
- `MANUAL_PAYMENT_BIZUM_RECIPIENT`
- `MANUAL_PAYMENT_BIZUM_INSTRUCTIONS`
- `MANUAL_PAYMENT_BANK_TRANSFER_ENABLED`
- `MANUAL_PAYMENT_BANK_ACCOUNT_HOLDER`
- `MANUAL_PAYMENT_BANK_IBAN`
- `MANUAL_PAYMENT_BANK_INSTRUCTIONS`

Los métodos apagados no aparecen. Un método encendido con configuración incompleta aborta el arranque. Los pedidos conservan estado de pago `pending` hasta confirmación admin.

### Shipping

El shipping core activo usa reglas locales en `shipping.service.js` y no utiliza proveedor externo ni variables de entorno. No se modifica su fórmula. El endpoint heredado que contacta un proveedor externo queda asociado al flag de dropshipping.

### Integraciones dormidas

- `ALIEXPRESS_CATALOG_ENABLED=false`; `MONGO_URI_ALIEXPRESS` no es obligatoria.
- `DROPSHIPPING_ENABLED=false`; `DROPSHIPPING_API_URL` no es obligatoria.
- `MONEI_ENABLED=false`; `MONEI_API_KEY` y `MONEI_WEBHOOK_SECRET` no son obligatorias.

Solo al habilitar un flag se exige su configuración. Esta SPEC no activa ni modifica las implementaciones.

## Seguridad y operación

- Producción rechaza CORS wildcard y exige al menos un origen configurado.
- La API usa Authorization header; no se habilitan credenciales CORS innecesarias.
- Login/registro y acciones públicas sensibles conservan rate limiting existente.
- `helmet` se aplica con valores seguros por defecto; no se añade dependencia.
- Errores 500 no incluyen stack, configuración ni secretos en la respuesta.
- No se deben registrar JWT, passwords, URI Mongo, credenciales SMTP, cuerpos sensibles ni configuración de pagos.
- Los endpoints de pago de test permanecen fuera de producción.
- Las rutas admin conservan `requireAuth` + `requireAdmin`; pedidos de usuario filtran por `userId`.

## Health, readiness y shutdown

- `/health` indica que el proceso HTTP responde y se mantiene independiente de operaciones comerciales.
- No se añade `/ready`: el proceso no escucha hasta completar Mongo, por lo que el health actual es suficiente para esta arquitectura simple.
- `SIGTERM` y `SIGINT` dejan de aceptar tráfico, cierran HTTP y desconectan Mongoose; un segundo fallo/timeout debe terminar con código no cero.

## Persistencia de uploads

`uploads/customizations` contiene imágenes y ZIP en disco local. Es un **bloqueador si el hosting elegido tiene filesystem efímero, múltiples réplicas o despliegues inmutables**: los ficheros podrían perderse o no estar disponibles entre instancias. Esta SPEC no migra a Blob/S3. Antes de producción se debe elegir almacenamiento persistente/montado o aprobar una SPEC de migración.

## Assets, SEO y legales

- Favicon, banners, mockups, logo y fallback de producto son assets relativos de `frontend/public`; no dependen de rutas Windows.
- No existen `robots.txt` ni sitemap ni una decisión explícita de indexación. No se añade ni cambia indexación en esta SPEC.
- Las rutas legales existentes se conservan: privacidad, aviso legal, términos, cookies y contacto.

## Dependencias e índices

- Se ejecutará `npm audit` por separado en frontend/backend sin `audit fix`.
- No se actualizan dependencias masivamente ni lockfiles salvo necesidad probada.
- Email de usuario ya es único/indexado; producto tiene índices existentes.
- Las consultas de pedidos usan `userId` y `createdAt`, pero no se crearán índices a ciegas. Su medición queda como deuda antes de escalar volumen.

## Despliegue portable

No existen Dockerfile, Compose, Azure, Netlify, Vercel, Render, Railway ni Static Web Apps configurados. No se introduce proveedor.

### Frontend

1. Entrar en `frontend`.
2. Configurar `VITE_API_URL` para la API pública (o confirmar despliegue same-origin).
3. Ejecutar `npm ci` y `npm run build`.
4. Publicar `dist`.
5. Configurar en el hosting una reescritura de toda ruta no-asset a `/index.html`.

### Backend

1. Entrar en `Backend`.
2. Configurar las variables obligatorias y solo las integraciones activas.
3. Ejecutar `npm ci --omit=dev` y `npm start`.
4. Exponer `PORT` y comprobar `GET /health`.
5. Proveer persistencia real para uploads si se necesitan personalizaciones.

## Checklist de despliegue

### Antes del deploy

- [ ] Backup verificable de MongoDB disponible; no descargar datos a este repositorio.
- [ ] Secrets configurados fuera del código y credenciales antes versionadas rotadas.
- [ ] `NODE_ENV=production`, Mongo, JWT, frontend URL y CORS configurados.
- [ ] SMTP completo o explícitamente no configurado.
- [ ] Bizum/transferencia configurados solo si están habilitados.
- [ ] AliExpress, dropshipping y MONEI en `false`.
- [ ] Decisión de almacenamiento persistente para uploads.
- [ ] Política de robots/indexación decidida por negocio, sin cambios implícitos.

### Backend

- [ ] Instalación reproducible desde lockfile.
- [ ] Arranque correcto y conexión Mongo.
- [ ] `/health` devuelve 200.
- [ ] Logs no contienen secretos.
- [ ] `SIGTERM` finaliza limpiamente.

### Frontend

- [ ] Build con API URL correcta.
- [ ] Hosting sirve `index.html` al refrescar rutas SPA.
- [ ] Assets, favicon y fallback cargan.

### Post-deploy smoke (staging/local)

- [ ] Home, Products y ProductDetail.
- [ ] Añadir al carrito y calcular shipping en Checkout.
- [ ] Invitado crea pedido sin envío SMTP obligatorio.
- [ ] Usuario inicia sesión, abre MyOrders y OrderDetail.
- [ ] Admin inicia sesión, lista pedidos, confirma pago manual y actualiza producto.
- [ ] Refresh directo: `/productos`, `/productos/:id`, `/carrito`, `/checkout`, `/mis-pedidos`, `/mis-pedidos/:id`, `/admin`.
- [ ] 404, dark mode, móvil y `/health`.

No ejecutar mutaciones contra producción real sin autorización.

## Rollback

- Frontend: republicar el artefacto/build anterior conocido.
- Backend: volver al release o commit anterior con las mismas variables compatibles.
- Base de datos: esta SPEC tiene cero cambios de schema y cero migraciones; no requiere rollback DB. Mantener backup previo por seguridad operativa.
- Si el fallo está en configuración, restaurar la versión anterior de variables y reiniciar sin registrar sus valores.

## Criterios de aceptación

- [x] Auditoría y ejemplos de env completos, sin valores sensibles.
- [x] `.env` y variantes locales ignorados y no versionados.
- [x] API URL apta para producción; localhost solo en desarrollo.
- [x] CORS productivo restringido.
- [x] SPA fallback documentado según hosting real/portable.
- [x] 404 frontend y fallback global de errores.
- [x] Errores backend seguros.
- [x] Health documentado y operativo.
- [x] Arranque Mongo y shutdown controlados en código.
- [x] Logs temporales/sensibles eliminados o acotados.
- [x] SMTP no produce falso error tras persistencia.
- [x] Pagos manuales y validación de configuración preservados.
- [x] Integraciones dormidas no inicializan ni contactan servicios externos.
- [x] Shipping core preservado.
- [x] Riesgo de uploads documentado.
- [x] JWT, roles, ownership, rate limiting y dev endpoints revisados.
- [x] Dependencias auditadas y clasificadas.
- [x] Lint/build frontend correctos.
- [ ] Backend full suite/startup con Mongo de release verificados; la suite específica pasa, pero `orders.test.js` quedó bloqueada antes del primer caso por MongoDB Memory Server en este entorno.
- [x] Despliegue, smoke y rollback documentados.
- [x] Cero migraciones/schema changes.
- [x] Estado robots preservado.
- [x] Temporales inequívocos retirados.
- [x] `git diff --check` correcto.

**Resultado:** 23/24 criterios verificados localmente.

## Resultado de validación local

- Frontend `npm run lint`: correcto.
- Frontend `npm run build`: correcto con `VITE_API_URL=https://api.example.test`; 2411 módulos transformados.
- Preview del build: HTTP 200 y `index.html` para `/`, `/productos`, `/productos/test-id`, `/carrito`, `/checkout`, `/mis-pedidos`, `/mis-pedidos/test-id`, `/admin` y una ruta inexistente.
- Source maps públicos en `dist`: 0.
- Backend `npm run check`: correcto.
- Backend regresión localizada: 24/24 tests correctos (`production-readiness`, `checkout`, `dormant-integrations`, `manual-payment-config`).
- Health smoke: HTTP 200, body `{ "status": "ok" }` y cabecera Helmet `nosniff`.
- `orders.test.js`: dos intentos quedaron esperando a MongoDB Memory Server antes del primer test y se interrumpieron; no hubo fallo de aserción.
- `git diff --check`: correcto.
- Smoke HTTP local ejecutado; smoke visual/end-to-end de staging no ejecutado porque no existe entorno de staging ni target configurado.

### Auditoría de dependencias (sin fixes automáticos)

Frontend completo: 22 hallazgos (1 crítico, 15 altos, 5 moderados, 1 bajo). Frontend runtime: 10 (1 crítico, 7 altos, 2 moderados). Dependencias directas runtime señaladas: `swiper` (crítico), `axios` y `react-router-dom` (altos), `uuid` (moderado).

Backend completo: 19 hallazgos (1 crítico, 14 altos, 4 moderados). Backend runtime: 18 (1 crítico, 13 altos, 4 moderados). Dependencias directas runtime señaladas: `axios`, `bcrypt`, `express`, `mongoose`, `multer`, `nodemailer` (altos) y `morgan` (moderado). El crítico `tar` es transitivo de la cadena de instalación de `bcrypt`; no es un endpoint de la aplicación, pero sigue presente en el árbol productivo.

No se ejecutó `npm audit fix`, no se actualizaron paquetes ni lockfiles. La remediación debe ser dirigida, con revisión de majors (`bcrypt`, `nodemailer`) y regresión completa.

## Bloqueadores para producción

1. **Rotación de credenciales:** `frontend/.env` y `Backend/.env` estaban versionados. Se retiraron del índice y permanecen solo como archivos locales ignorados, pero el historial Git conserva sus valores. Antes de producción se deben rotar, como mínimo, MongoDB, JWT y SMTP; revisar también cualquier dato/configuración de pago o integración que haya sido real. No se imprimieron ni rotaron valores en esta SPEC.
2. **Dependencias vulnerables:** existen hallazgos críticos/altos en runtime. Requieren actualización dirigida y nueva auditoría antes de release.
3. **Validación backend incompleta:** repetir full suite, incluido `orders.test.js`, en un entorno limpio con MongoDB Memory Server operativo y realizar arranque/shutdown contra la configuración de staging.
4. **Target de hosting:** al elegir proveedor se debe materializar su regla SPA y comprobar `/health`, CORS y rollback. Actualmente solo existe el procedimiento portable.
5. **Uploads si el filesystem es efímero o hay más de una réplica:** proporcionar volumen persistente/compartido o una SPEC de object storage.

## Deuda no bloqueante

- El build conserva warnings conocidos por dependencias Node (`archiver`/`node-fetch`) dentro del grafo frontend; no se reoptimiza SPEC-015 aquí.
- Medir consultas de pedidos antes de decidir índices adicionales por `userId`/`createdAt`.
- Definir explícitamente robots/sitemap cuando negocio decida la política de indexación.

## Fuera de alcance / deuda

- Elección y configuración de proveedor cloud.
- Migración de uploads a object storage.
- Creación de índices sin métricas de producción.
- Nuevos textos legales, declaración normativa o habilitación SEO.
- Rediseño UI, cambios comerciales o reactivación de integraciones dormidas.
