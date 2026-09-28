# SPEC-019 — Netlify + Render + MongoDB Atlas Deployment & Staging

## Estado

**Estado:** configuración local completada; despliegue remoto pendiente de acceso autenticado
**Dependencias:** SPEC-016, SPEC-017 y SPEC-018 completadas localmente.

## Objetivo

Preparar un staging reproducible con frontend Netlify, backend Render Web Service, base separada MongoDB Atlas y storage persistente, sin desplegar producción, introducir secretos, cambiar lógica comercial ni ejecutar migraciones.

## Inventario real

### Frontend

- Vite + React 18 + React Router 7.
- Base del proyecto: `frontend`.
- Instalación reproducible: Netlify instala desde `package-lock.json`.
- Build: `npm run build`.
- Publicación: `frontend/dist`.
- API: `VITE_API_URL`; en desarrollo conserva `http://localhost:3000` mediante el `.env` local/ejemplo.
- React Router necesita rewrite de toda ruta no-asset a `/index.html` para que React gestione sus rutas y 404.

### Backend

- Node ESM, Express 4 y Mongoose 8.
- Root: `Backend`.
- Build/install: `npm ci`.
- Start: `npm start` → `node src/server.js`.
- Node validado localmente: 20.19.6.
- Puerto: `env.PORT`, derivado de `process.env.PORT`, con 3000 solo como fallback local.
- `GET /health` es público, barato y no consulta endpoints comerciales.
- El proceso espera la conexión Mongo antes de escuchar, registra solo mensajes acotados y gestiona `SIGTERM`/`SIGINT`.
- CORS usa `CORS_ORIGINS`; en producción rechaza wildcard y puede usar `FRONTEND_URL` como único fallback.
- Storage: `LocalStorageProvider` bajo `STORAGE_ROOT`; producción exige root explícito.

## Arquitectura de staging

| Capa | Servicio | Configuración |
|---|---|---|
| Frontend | Netlify Site | Git remoto, base `frontend`, build `npm run build`, publish `dist`, dominio generado HTTPS |
| Backend | Render Web Service | Runtime Node nativo, root `Backend`, plan de pago mínimo compatible con disco, una instancia, `/health` |
| Base de datos | MongoDB Atlas | Proyecto/cluster o base staging independiente, usuario staging y Network Access limitado a los rangos outbound de Render |
| Ficheros | Render Persistent Disk | Disco de staging de 1 GB, mount `/var/data`, `STORAGE_ROOT=/var/data/uploads` |

No se usa Docker: Render soporta Node de forma nativa y el proyecto no necesita paquetes de sistema ni una imagen personalizada.

## Netlify

`netlify.toml` en la raíz define únicamente base, build, publish y Node. `frontend/public/_redirects` contiene el rewrite SPA y Vite lo copia a `dist`.

Configuración esperada:

- Base directory: `frontend`.
- Build command: `npm run build`.
- Publish directory: `dist` relativa a la base.
- `VITE_API_URL`: variable del sitio/contexto staging con el origen HTTPS real de Render, sin slash final obligatorio ni hostname versionado.
- Dominio: subdominio generado `netlify.app`; no se configura dominio custom.

El rewrite `/* /index.html 200` mantiene la URL y permite refresh directo de Home, Products, ProductDetail, Cart, Checkout, MyOrders, OrderDetail, Admin y 404 de React.

## Render

`render.yaml` define un Web Service staging reproducible:

- Runtime `node`, sin Docker.
- Root Directory `Backend`.
- Build `npm ci`.
- Start `npm start`.
- Node 20.19.6 explícito.
- Plan `0.5c-512mb`, mínimo de pago actual compatible con Persistent Disk.
- Una instancia; sin autoscaling.
- Health check `/health`.
- Persistent Disk de 1 GB montado en `/var/data`.
- `STORAGE_ROOT=/var/data/uploads`.
- Dormant flags explícitamente `false`.
- Secretos y URLs variables marcados `sync: false`, para introducirlos solo desde Render al aplicar el Blueprint.

Render inyecta `PORT`; no se versiona ni se fuerza un puerto. El servidor ya escucha ese valor.

### Restricciones verificadas del disco

- El filesystem ordinario de Render es efímero; solo persiste lo escrito bajo el mount path.
- Persistent Disk requiere Web Service de pago.
- El disco no puede compartirse entre múltiples instancias y el servicio no puede escalar horizontalmente.
- Adjuntar disco desactiva zero-downtime deploys; habrá una ventana de indisponibilidad durante redeploy.
- Render crea snapshots diarios cifrados y conserva snapshots al menos siete días; restaurar revierte el disco completo.
- Rollback/redeploy de código no debe eliminar ni reemplazar el disco.

Fuentes: [Render Persistent Disks](https://render.com/docs/disks), [Render deploys](https://render.com/docs/deploys), [Render scaling](https://render.com/docs/scaling), [Blueprint YAML](https://render.com/docs/blueprint-spec).

## MongoDB Atlas staging

- Usar proyecto/cluster o, como mínimo, base y usuario exclusivos de staging; no reutilizar producción.
- Guardar `MONGO_URI` exclusivamente como secret de Render.
- Crear usuario con permisos mínimos sobre la base staging.
- En Render, abrir **Connect → Outbound** y copiar todos los rangos CIDR del servicio/región a Atlas Network Access.
- No asumir una IP única. Render puede usar cualquiera de los rangos outbound mostrados.
- Evitar `0.0.0.0/0`; si se usa temporalmente para diagnóstico, debe tener expiración y retirarse tras confirmar los rangos.
- No se modifican reglas Atlas automáticamente en esta SPEC.

Fuentes: [Render outbound IP addresses](https://render.com/docs/outbound-ip-addresses), [Atlas IP Access List](https://www.mongodb.com/docs/atlas/security/ip-access-list/).

## Variables y secretos

### Netlify staging

| Variable | Tipo | Valor esperado |
|---|---|---|
| `VITE_API_URL` | configuración pública de build | Origen HTTPS generado por Render staging |

### Render staging

| Grupo | Variables | Tratamiento |
|---|---|---|
| Runtime | `NODE_ENV`, `NODE_VERSION`; `PORT` lo inyecta Render | No secret |
| Mongo/auth | `MONGO_URI`, `JWT_SECRET` | Secret, independientes de producción |
| Frontend/CORS | `FRONTEND_URL`, `CORS_ORIGINS` | URL exacta Netlify staging; sin wildcard |
| Storage | `STORAGE_PROVIDER=local`, `STORAGE_ROOT=/var/data/uploads` | No secret; coherentes con el disco |
| SMTP opcional | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `ADMIN_EMAIL` | Bloque completo de test o totalmente ausente; password secreto |
| Bizum staging | flag, recipient e instructions existentes | Datos ficticios/controlados; sensibles fuera del repo |
| Transferencia staging | flag, holder, IBAN e instructions existentes | Datos ficticios/controlados; sensibles fuera del repo |
| Integraciones dormidas | `ALIEXPRESS_CATALOG_ENABLED=false`, `DROPSHIPPING_ENABLED=false`, `MONEI_ENABLED=false` | Sin secrets asociados |

## CORS y HTTPS

- `FRONTEND_URL` y `CORS_ORIGINS` deben ser exactamente el origen HTTPS generado por Netlify staging.
- No incluir path, slash adicional como origen distinto ni wildcard.
- Render y Netlify terminan TLS y exponen dominios HTTPS generados.
- `VITE_API_URL` debe usar HTTPS para evitar mixed content.
- El smoke debe cubrir GET, POST, preflight con `Authorization`, upload de imagen y descarga ZIP admin.

## CI/CD y separación de entornos

Existe remoto GitHub `origin` (`puentesAmed/MiTiendaPerso`). No se detectaron configuraciones Netlify/Render previas, pero no hay evidencia local de que las cuentas estén conectadas al repositorio.

- Netlify: conectar manualmente el repositorio y crear un Site staging. Deploy Previews son opcionales y solo se habilitan si la integración Git queda activa; cada preview necesitaría CORS explícito o un hostname estable de staging.
- Render: aplicar manualmente el Blueprint desde el repositorio y completar los valores `sync: false`.
- No se añaden GitHub Actions porque ambas plataformas ofrecen integración Git y no existe necesidad demostrada.
- Backend, Atlas, disco y secretos de staging deben ser recursos separados de producción.

## Smoke remoto de staging

No puede marcarse hasta disponer de Netlify, Render y Atlas autenticados.

### Infraestructura

- [ ] Deploy Netlify y Render correctos usando los archivos versionados.
- [ ] `/health` responde 200 por HTTPS.
- [ ] Atlas conecta al arranque y un fallo de URI impide escuchar.
- [ ] Logs de startup, health y shutdown no exponen secretos.
- [ ] CORS permite solo el origen Netlify staging.
- [ ] Browser console: cero errores runtime propios y cero mixed content.

### SPA y UI

- [ ] Refresh directo: `/`, `/productos`, ProductDetail, `/carrito`, `/checkout`, MyOrders, OrderDetail, `/admin` y ruta inexistente.
- [ ] Home, búsqueda global, filtros, detalle, scroll restoration, carrito y shipping.
- [ ] Mobile/desktop y light/dark sin regresión.

### Auth, pedidos y administración

- [ ] Registro, login, JWT, logout y refresh protegido con cuentas ficticias.
- [ ] Guest crea pedido staging.
- [ ] Usuario consulta solo sus MyOrders/OrderDetail.
- [ ] Admin lista pedidos/productos, cambia stock y confirma pending → paid.
- [ ] Bizum y transferencia usan datos ficticios, crean `pending` y muestran instrucciones.
- [ ] SMTP ausente no rompe pedidos/cambios o SMTP test no envía a destinatarios reales.

### Storage

- [ ] Upload válido devuelve URL HTTPS y Content-Type correcto.
- [ ] Imagen se visualiza desde Netlify con Helmet/CORS vigente.
- [ ] Personalización y preview llegan al pedido/admin.
- [ ] ZIP se descarga desde Admin con JWT y no es público.
- [ ] Tras restart/redeploy, imagen y ZIP siguen disponibles.
- [ ] Verificar snapshot/restore policy sin ejecutar restore destructivo.

## Rollback

### Netlify

Seleccionar y publicar un deploy anterior conocido desde Netlify. Mantener `VITE_API_URL` compatible con el backend staging activo. No borrar el deploy actual como mecanismo de rollback.

### Render

Usar rollback/redeploy del release anterior. Mantener las mismas variables, Atlas y Persistent Disk. Dado que el disco desactiva zero-downtime, programar la ventana de staging y verificar `/health` después.

### Datos y storage

- Esta SPEC tiene cero migraciones y cero cambios de schema.
- Un rollback de código no debe borrar, recrear ni desmontar el Persistent Disk.
- No restaurar snapshot salvo incidente confirmado: la restauración descarta cambios posteriores.
- Atlas staging permanece independiente; antes de producción se exige backup verificable de Atlas.

## Validación local requerida

- Frontend: `npm ci`, lint, build y comprobar `_redirects` en `dist`.
- Backend: `npm ci`, check y suite completa serial.
- Validación estática de `netlify.toml` y `render.yaml`.
- General: `git diff --check`; no repetir audit de SPEC-017.

### Resultado local

- Frontend `npm ci`: correcto, 227 paquetes instalados desde lockfile.
- Frontend `npm run lint`: correcto.
- Frontend `npm run build`: correcto, 2410 módulos transformados.
- `frontend/dist/_redirects`: presente con el rewrite SPA esperado.
- Backend `npm ci`: correcto, 311 paquetes instalados desde lockfile.
- Backend `npm run check`: correcto.
- Suite backend completa serial: 109/109 tests correctos, 0 fallos y 0 omitidos.
- Regresión CORS: origen Netlify exacto permitido, origen ajeno sin cabecera CORS y preflight con `Authorization` permitido.
- `netlify.toml`: TOML válido.
- `render.yaml`: YAML válido; disco y mount comprobados estáticamente.
- `git diff --check` y `git diff --cached --check`: correctos.

## Estado real del deployment

No se dispone de sesiones autenticadas de Netlify, Render ni MongoDB Atlas y no se solicitó crear recursos reales. No se ejecutó deployment, no se configuraron secretos remotos, no se modificó Atlas y no se realizó smoke remoto, revisión de logs remotos ni prueba restart/redeploy. Los checklists correspondientes permanecen abiertos.

## Criterios de aceptación

- [x] Inventario frontend/backend documentado.
- [x] Netlify config reproducible.
- [x] SPA fallback incluido en el artefacto.
- [x] `VITE_API_URL` externo al repositorio documentado.
- [x] Render Blueprint reproducible y sin secretos.
- [x] Runtime Node nativo 20+ y comandos correctos.
- [x] `PORT` y `/health` compatibles con Render.
- [x] Atlas staging y Network Access documentados.
- [x] Secrets staging separados y clasificados.
- [x] CORS exacto Netlify → Render documentado/validado localmente.
- [x] Integraciones dormidas en false.
- [x] Persistent Disk configurado bajo path confirmado.
- [x] `STORAGE_ROOT` coincide con el mount.
- [x] Servicio limitado a una instancia.
- [x] Limitaciones de disco/deploy/backups documentadas.
- [x] Checklist restart/redeploy incluido.
- [x] Checklist auth, guest, MyOrders y Admin incluido.
- [x] Checklist pagos manuales, personalización y ZIP incluido.
- [x] Checklist browser console y logs seguros incluido.
- [x] Rollback Netlify/Render/storage documentado.
- [x] Cero migraciones DB.
- [x] Validación local correcta.
- [x] Estado remoto comunicado sin fingir deployment.
- [x] Producción bloqueada hasta rotación de credenciales.

**Resultado:** 24/24 criterios de configuración, documentación y validación local cumplidos. El smoke remoto es un gate separado y continúa pendiente.

## Bloqueo de producción

Aunque staging se valide, producción continúa bloqueada hasta rotar MongoDB, JWT, SMTP y cualquier credencial histórica expuesta/versionada, crear credenciales independientes de producción, realizar backup Atlas y aprobar el target final.

## No tocar

UI, pricing, shipping, semántica de pagos, CartLineV2, schemas Product/Order, auth, AliExpress, dropshipping y MONEI.
