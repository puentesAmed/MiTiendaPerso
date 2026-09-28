# SPEC-017 — Security & Dependency Remediation

## Estado

**Estado:** completada
**Dependencia:** SPEC-016 completada con release bloqueada por vulnerabilidades runtime y rotación pendiente de secretos.

## Objetivo

Resolver los hallazgos críticos y altos de dependencias runtime mediante eliminaciones confirmadas y actualizaciones mínimas, sin actualización masiva, `force`, migración de frameworks, cambios de schema ni cambios de lógica comercial.

## Entorno comprobado

- Node.js local: 20.19.6.
- npm y lockfiles v3 existentes en `frontend/` y `Backend/`.
- React 18 satisface los peers de React Router 7.18.
- `bcrypt` 6 requiere Node >=18; `nodemailer` 10 y React Router 7.18 requieren Node >=20.
- El runtime de despliegue deberá usar Node 20 o superior.

## Auditoría inicial reproducible

Comandos ejecutados por separado, sin fixes:

```text
cd frontend && npm audit --omit=dev
cd Backend && npm audit --omit=dev
```

### Frontend — antes

- Critical: 1
- High: 7
- Moderate: 2
- Total runtime: 10

### Backend — antes

- Critical: 1
- High: 13
- Moderate: 4
- Total runtime: 18

## Clasificación y estrategia

Clasificación: **A** exposición real/relevante; **B** runtime con exposición limitada; **C** transitiva o dependencia sin camino real; **D** tooling/dev only.

| Paquete/cadena | Área | Severidad | Directa/transitiva | Runtime real | Instalado | Rango vulnerable | Fix mínimo/acción | Breaking | Clase |
|---|---|---:|---|---|---:|---|---|---|---|
| `swiper` | Frontend | critical | directa | No: solo se importan tres CSS; no hay `Swiper`, `SwiperSlide` ni clases consumidoras | 12.0.3 | 6.5.1–12.1.1 | Eliminar dependencia e imports CSS muertos | No | C |
| `axios` | Frontend | high | directa | Sí: cliente HTTP central, interceptor JWT y API base URL | 1.13.2 | 1.0.0–1.17.0 | 1.18.0 | Minor; API usada compatible | A |
| `follow-redirects`, `form-data` | Frontend | moderate/high | transitivas de Axios | Adaptadores Axios; exposición browser limitada | 1.15.11 / 4.0.5 | <=1.15.11 / 4.0.0–4.0.5 | Se resuelven con Axios 1.18.0 | No directo | B |
| `react-router-dom` → `react-router` | Frontend | high | directa/transitiva | Sí: router, navegación, rutas protegidas, 404 | 7.9.6 | DOM hasta 7.11.0; core hasta 7.18.1 | 7.18.2 | Minor; peers React >=18 | A |
| `uuid` | Frontend | moderate | directa | No imports; se usa `crypto.randomUUID()` nativo | 13.0.0 | 13.0.0 | Eliminar | No | C |
| `archiver` → `lodash`, `minimatch`, `brace-expansion` | Frontend | high | directa/transitivas | No imports; además genera warnings Node en bundle browser | 7.0.1 | transitivos afectados | Eliminar `archiver` | No | C |
| `node-fetch` | Frontend | sin advisory directo | directa | No imports; solo amplía grafo Node del bundle | 3.3.2 | n/a | Eliminar | No | C |
| `axios` | Backend | high | directa | Sí: ZIP remoto; MONEI/dropshipping dormidos | 1.13.2 | 1.0.0–1.17.0 | 1.18.0 | Minor; `get/post` usados siguen compatibles | A/B |
| `express` → `body-parser`, `path-to-regexp`, `qs` | Backend | high/moderate | directa/transitivas | Sí: toda la API | 4.21.2 | Express 4.x hasta 4.22.2 | Express 4.22.3 | Patch; no migración a Express 5 | A |
| `mongoose` | Backend | high | directa | Sí: conexión, modelos, queries, populate, shutdown | 8.20.1 | 8.0.0–8.24.0 | 8.24.1 | Minor; sin cambios de schema | A |
| `multer` | Backend | high | directa | Sí: `POST /api/uploads/image` | 2.0.2 | <=2.2.0 | 2.3.0 | Minor; `diskStorage`/`single` permanecen | A |
| `bcrypt` → `@mapbox/node-pre-gyp` → `tar` | Backend | high/critical | directa/transitivas | Hash/compare real; `tar` está en cadena de instalación, no en requests | 5.1.1 / 1.0.11 / 6.2.1 | bcrypt 5.0.1–5.1.1; tar <=7.5.20 | bcrypt 6.0.0 | Major; API async usada es compatible, Node >=18 | A/C |
| `nodemailer` | Backend | high | directa | Sí cuando SMTP está configurado; opcional | 7.0.11 | <=9.1.0 | 10.0.12 | Major; validar `createTransport`/`sendMail`, Node >=20 | B |
| `morgan` | Backend | moderate | directa | No imports | 1.10.1 | <=1.11.0 | Eliminar | No | C |
| `jsonwebtoken` → `jws` | Backend | high transitiva | directa/transitiva | Sí: firma/verificación JWT | 9.0.2 / 3.2.2 | `jws` <3.2.3 | Actualizar `jsonwebtoken` dentro de 9.x o `jws` compatible | Patch | A |
| `archiver` → `lodash`, `minimatch`, `brace-expansion` | Backend | high | directa/transitivas | Sí: ZIP de personalizaciones; entrada controlada por aplicación | 7.0.1 | transitivos afectados | Actualización dirigida de transitivos compatibles | Lockfile, sin API de app | B |
| `follow-redirects`, `form-data` | Backend | moderate/high | transitivas de Axios | Sí solo a través de Axios | 1.15.11 / 4.0.5 | <=1.15.11 / 4.0.0–4.0.5 | Se resuelven con Axios 1.18.0 | No directo | B |

Los paths se comprobaron con `npm explain` y con los lockfiles. Las entradas dev-only de ESLint, Nodemon, Supertest y MongoDB Memory Server no se cuentan como runtime productivo.

## Actualizaciones autorizadas por esta SPEC

### Frontend

- `axios`: 1.13.2 → 1.18.0.
- `react-router-dom`/`react-router`: 7.9.6 → 7.18.2.
- Eliminar `swiper`, `uuid`, `archiver` y `node-fetch` por ausencia de consumidores funcionales.

### Backend

- `axios`: 1.13.2 → 1.18.0.
- `express`: 4.21.2 → 4.22.3, manteniendo Express 4.
- `mongoose`: 8.20.1 → 8.24.1.
- `multer`: 2.0.2 → 2.3.0.
- `bcrypt`: 5.1.1 → 6.0.0.
- `nodemailer`: 7.0.11 → 10.0.12.
- Eliminar `morgan` por cero imports.
- Actualizar únicamente transitivos vulnerables que permanezcan, dentro de rangos compatibles, después del primer audit final.

Los lockfiles se actualizarán exclusivamente mediante npm. Queda prohibido `npm audit fix --force`, `npm install --force` y `--legacy-peer-deps`.

## Adaptaciones de código permitidas

- Retirar imports CSS de Swiper al eliminar esa dependencia.
- Añadir límites conservadores a Multer si el endpoint real carece de ellos, sin cambiar storage.
- Solo realizar cambios adicionales si una incompatibilidad reproducible de las nuevas versiones los exige.

## Regresión requerida

### Frontend

- `npm ci`, `npm run lint`, `npm run build`.
- Router, rutas protegidas/admin, ProductDetail, scroll restoration, carrito, checkout, pedidos, 404.
- Home/galería: confirmar que no dependía de Swiper y que retirar CSS no cambia funcionalidad.
- Axios: base URL e interceptor `Authorization` intactos.

### Backend

- `npm ci`, `npm run check`.
- Suite completa con ejecución serial si MongoDB Memory Server compite por recursos.
- Health/security headers, auth/register/login, products/admin, orders/ownership, pagos manuales, shipping, upload, SMTP fallido y dormant integrations.
- No rehash masivo; bcrypt nuevo debe comparar hashes existentes compatibles.

## Auditoría final

Repetir exactamente:

```text
cd frontend && npm audit --omit=dev
cd Backend && npm audit --omit=dev
```

### Resultado

| Aplicación | Antes (critical/high/moderate) | Después (critical/high/moderate) | Total runtime final |
|---|---:|---:|---:|
| Frontend | 1 / 7 / 2 | 0 / 0 / 0 | 0 |
| Backend | 1 / 13 / 4 | 0 / 0 / 0 | 0 |

Versiones finales relevantes:

- Frontend: Axios 1.18.0 y React Router DOM/Core 7.18.2; eliminados Swiper, UUID, Archiver y Node Fetch.
- Backend: Axios 1.18.0, Express 4.22.3, Mongoose 8.24.1, Multer 2.3.0, bcrypt 6.0.0, Nodemailer 10.0.12 y JSON Web Token 9.0.3; eliminado Morgan.
- Transitivos remediados mediante npm: `form-data`, `brace-expansion`, `lodash`, `minimatch` y `jws`, sin editar lockfiles manualmente.

No se usaron `npm audit fix --force`, `npm install --force` ni `--legacy-peer-deps`.

## Implementación y validación

- Se retiraron imports CSS muertos de Swiper y sus chunks manuales de Vite.
- El upload mantiene `diskStorage` y limita a un archivo de 10 MiB, acepta JPEG/PNG/WebP, normaliza extensión y devuelve errores controlados.
- Se añadió regresión del upload y del flujo register/login con bcrypt 6.
- Frontend: `npm ci`, lint y build correctos. El build transformó 2410 módulos sin los warnings Node causados por Archiver.
- Smoke HTTP del frontend correcto (HTTP 200 y shell de la aplicación) para home, productos, detalle, carrito, checkout, confirmación, login, pedidos, detalle de pedido, admin y 404.
- La comprobación visual automatizada no pudo ejecutarse porque el transporte de control del navegador estaba cerrado; no se afirma validación visual manual.
- Backend: `npm ci` y `npm run check` correctos.
- Suite completa backend en serial: 102 tests correctos, 0 fallos y 0 omitidos. La ejecución serial evita la competición de recursos observada anteriormente en MongoDB Memory Server.
- Los audits completos conservan hallazgos exclusivos de tooling/dev (frontend 14; backend 1); no forman parte del runtime productivo y quedan como deuda no bloqueante.

## Rotación manual pre-release

No se muestran ni modifican valores.

- [ ] Rotar credencial/usuario MongoDB y revocar el anterior.
- [ ] Generar `JWT_SECRET` nuevo; asumir que invalida sesiones emitidas.
- [ ] Rotar password/token SMTP y verificar remitente.
- [ ] Revisar y rotar cualquier clave histórica de MONEI, AliExpress o dropshipping si alguna vez fue real.
- [ ] Revisar datos operativos de pagos manuales expuestos históricamente.
- [ ] Configurar secretos nuevos fuera de Git y validar staging.
- [ ] Considerar saneamiento de historial Git solo con plan coordinado; no reescribirlo en esta SPEC.

## Git y seguridad

- `.env` debe permanecer fuera del índice y conservado solo localmente.
- No registrar outputs con credenciales ni contenido de `.env`.
- No introducir artefactos de audit, logs o builds.
- Ejecutar `git diff --check`, `git diff --cached --check` y `git status --short`.

## Criterios de aceptación

- [x] Audits iniciales reproducidos y clasificados.
- [x] Dependencias, versiones y paths investigados.
- [x] Critical runtime tratados.
- [x] High runtime tratados o justificados individualmente.
- [x] Upgrades mínimos y dependencias muertas retiradas.
- [x] Ningún comando force/legacy utilizado.
- [x] Frontend `npm ci`, lint y build correctos.
- [x] Backend `npm ci` y check correctos.
- [x] Regresiones específicas correctas.
- [x] Full suite ejecutada o bloqueo de Mongo investigado sin afirmar éxito.
- [x] Audit before/after documentado.
- [x] Secretos no impresos y checklist de rotación incluida.
- [x] `.env` fuera de Git confirmado.
- [x] Diff checks correctos.

## Pendiente fuera de alcance

- Ejecutar manualmente la rotación de credenciales del checklist antes del release; sigue siendo un bloqueo de release.
- Realizar smoke visual/manual en un navegador o staging disponible.
- Planificar por separado la actualización del tooling/dev si se decide eliminar también sus advisories.

## No tocar

UI visual, pricing, fórmula de shipping, semántica de pagos, schemas Product/Order, CartLineV2, storage persistente, target de despliegue e implementaciones AliExpress/dropshipping/MONEI.
