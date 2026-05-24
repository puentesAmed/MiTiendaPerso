# Backend MiTiendaPerso

## Descripción del backend

API REST en **Node.js + Express + MongoDB (Mongoose)** para:
- autenticación (`/auth`)
- catálogo/productos (`/api/products`)
- pedidos y administración (`/api/orders`)
- pagos (`/api/payments`)
- cálculo de envío (`/api/shipping`, `/api/checkout/shipping-options`)
- personalizaciones (`/api/customizations`)
- subida/descarga de archivos (`/api/uploads`, `/uploads`)

Módulos clave:
- `controllers/`: lógica por dominio.
- `routes/`: exposición HTTP.
- `models/`: esquemas Mongo.
- `middleware/`: auth/admin.
- `services/`: email y dropshipping.
- `config/`: entorno y conexión DB.

---

## Variables de entorno (reales en el código)

> Solo se listan variables detectadas en el repositorio.

| Variable | Obligatoria | Entorno | Descripción | Ejemplo (sin secreto) |
|---|---|---|---|---|
| `MONGO_URI` | Sí | Todos | URI principal de MongoDB para la API. | `mongodb+srv://user:***@cluster0.mongodb.net/mitienda` |
| `JWT_SECRET` | Sí | Todos | Secreto para firmar/verificar JWT. | `cambia-esto-por-un-secreto-largo` |
| `PORT` | No | Todos | Puerto HTTP del backend. Default `3000`. | `3000` |
| `NODE_ENV` | No | Todos | Entorno de ejecución (`development`/`production`). | `production` |
| `CORS_ORIGINS` | Sí en producción* | Producción | Lista de orígenes permitidos separados por coma. | `https://app.tudominio.com,https://admin.tudominio.com` |
| `FRONTEND_URL` | Condicional* | Todos | URL frontend usada en callbacks y como fallback CORS en prod. | `https://app.tudominio.com` |
| `ADMIN_EMAIL` | Recomendado | Todos | Email destino para notificaciones de nuevos pedidos. | `ops@tudominio.com` |
| `SMTP_HOST` | Opcional (si usas email) | Todos | Host SMTP para nodemailer. | `smtp.mailprovider.com` |
| `SMTP_PORT` | Opcional (si usas email) | Todos | Puerto SMTP. | `587` |
| `SMTP_SECURE` | Opcional (si usas email) | Todos | `true/false` para TLS directo. | `false` |
| `SMTP_USER` | Opcional (si usas email) | Todos | Usuario SMTP. | `mailer@tudominio.com` |
| `SMTP_PASS` | Opcional (si usas email) | Todos | Contraseña/token SMTP. | `***` |
| `EMAIL_FROM` | Opcional (si usas email) | Todos | Remitente por defecto. | `"MiTienda <no-reply@tudominio.com>"` |
| `MONEI_API_KEY` | Opcional (si activas MONEI) | Todos | API key para crear pagos MONEI. | `pk_live_***` |
| `MONEI_WEBHOOK_SECRET` | Opcional (si activas webhook) | Todos | Secreto para validar firma del webhook MONEI. | `whsec_***` |
| `MONGO_URI_ALIEXPRESS` | Opcional | Todos | URI para conexión afiliados/dropshipping. | `mongodb+srv://user:***@cluster0.mongodb.net/affiliate` |
| `DROPSHIPPING_API_URL` | Opcional | Todos | Endpoint del proveedor dropshipping. Default local. | `https://api.proveedor.com` |

\* Reglas de CORS en producción:
- `CORS_ORIGINS="*"` está bloqueado.
- si `CORS_ORIGINS` está vacío y existe `FRONTEND_URL`, se usa como fallback.
- si ambos faltan en producción, el backend falla al arrancar.

---

## Seguridad

- **CORS endurecido en producción** (no permite `*`).  
- **Rutas admin protegidas** con `requireAuth + requireAdmin` (ej. gestión de pedidos, productos y confirmación manual de pago).  
- **Rate limiting** en rutas públicas críticas:
  - `/auth/login`
  - `/auth/register`
  - `/api/orders/track`
  - `/api/checkout/shipping-options`
  - `/api/payments/monei/create`
- **Validación básica auth**:
  - normalización email (`trim().toLowerCase()`)
  - validación de formato email
  - password no vacía
- **Shipping checkout**: ante error, se devuelve mensaje público genérico sin detalles internos del proveedor.

---

## Arquitectura de pagos

- `order.status` = **estado operativo/logístico** del pedido.
- `order.payment.status` = **estado real del pago** (`pending`, `paid`, `failed`, `refunded`).
- `order.payment.provider` = fuente de pago:
  - ahora: `manual` (confirmación admin) o `null` en pedido recién creado
  - futuro: `monei`
- `order.payment.providerPaymentId` = ID de pasarela (reservado para MONEI).
- `order.payment.metadata` = metadatos auxiliares del proveedor.
- `paymentStatus` = compatibilidad ligera legacy.

Reglas:
- Confirmar pago manual **no** cambia `order.status`.
- Cambiar `order.status` **no** cambia `order.payment.status`.
- La futura integración MONEI debe actualizar el mismo bloque `payment`.

---

## Nomenclatura de estados de pedido

- Valor interno canónico en backend: `processing`.
- Etiqueta mostrada en UI en español: **“En preparación”**.
- No usar `preparing` como valor interno salvo migración planificada.
- `order.status` representa estado operativo/logístico del pedido.
- `order.payment.status` representa estado de pago.
- Cambiar estado operativo **no** cambia estado de pago.
- Confirmar pago manual **no** cambia estado operativo.

---

## Checklist pre-producción

1. Configurar `NODE_ENV=production`.
2. Configurar `CORS_ORIGINS` (sin `*`) y verificar fallback/uso de `FRONTEND_URL`.
3. Configurar `MONGO_URI` (y `MONGO_URI_ALIEXPRESS` si aplica).
4. Configurar `JWT_SECRET` robusto.
5. Configurar SMTP (`SMTP_*`, `EMAIL_FROM`) si se usarán emails.
6. Configurar `ADMIN_EMAIL`.
7. Configurar `MONEI_API_KEY` y `MONEI_WEBHOOK_SECRET` cuando se active pasarela.
8. Eliminar pedidos de prueba antes del go-live.
9. Crear pedido real de prueba:
   - checkout completo
   - cálculo de envío
   - creación de pedido
10. Probar confirmación manual de pago desde admin.
11. Probar cambio de estado operativo de pedido desde admin.
12. Ejecutar checks frontend:
   - `npm run lint`
   - `npm run build`

---

## Comandos útiles

```bash
# desarrollo backend
npm run dev

# producción local backend
npm start

# seeds
npm run seed:users
npm run seed:products
```
