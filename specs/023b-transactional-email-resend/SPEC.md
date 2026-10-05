# SPEC-023B — Transactional email & Resend

## Auditoría previa

- `Backend/src/services/email.service.js` usa Nodemailer/SMTP; no hay Resend, registro persistente ni idempotencia. SMTP queda deshabilitado sin configuración y una configuración parcial impide el arranque.
- `createOrder` intenta dos emails (cliente/admin) después de persistir el pedido, con plantillas HTML simples. Sus errores no revierten el pedido, pero tampoco quedan registrados.
- `adminUpdateOrderStatus` reenvía la plantilla por estado en cada PATCH, incluso al repetir el mismo estado. `adminConfirmDeliveryDate` también envía un email fuera del conjunto de eventos de esta SPEC.
- `markOrderAsPaid` confirma el pago manual sin email. La producción V2 tiene estado propio en `Customization` (`ready → in_production → completed`), no en `Order`. El estado `processing` del pedido es preparación operativa, no una prueba suficiente de producción.
- No existe estado de pedido «listo para recogida». Se añadirá una transición localizada para `PICKUP_FREE`; `shipped` se reservará para métodos con envío.
- Variables SMTP actuales: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `ADMIN_EMAIL`. Se mantienen como compatibilidad dormida, sin usarlas para eventos 023B.

## Decisión y alcance

- Resend se invoca solo desde backend mediante un `EmailProvider.send` sustituible en tests. Sin dependencia de SDK: se usa su API HTTP oficial. No hay webhook en esta SPEC; `sent` significa aceptación por Resend, nunca entrega final.
- Configuración: `TRANSACTIONAL_EMAIL_ENABLED=false` por defecto, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `ADMIN_NOTIFICATION_EMAIL`. Sin configuración, el ecommerce sigue funcionando; el evento queda `failed` y es reintentable. La falta de configuración habilitada se registra sin secretos.
- Una colección `EmailNotification` identifica de forma única `orderId + event + recipient`, conserva `pending/sent/failed`, intento, proveedor ID, timestamps y error sanitizado. Solo el servicio reclama/envía eventos; el reintento explícito se limita a `failed`. Se usa una clave de idempotencia estable ante Resend.
- Eventos: `ORDER_RECEIVED`, `PAYMENT_PENDING`, `PAYMENT_CONFIRMED`, `ORDER_IN_PRODUCTION`, `ORDER_READY_FOR_PICKUP`, `ORDER_SHIPPED`, `NEW_ORDER_ADMIN`. Solo transiciones efectivas los disparan. Producción V2 dispara una vez al entrar una personalización en `in_production`.
- Los templates de HTML y texto usan exclusivamente snapshots de `Order`, escapan datos variables y nunca incluyen documentos de diseño, claves internas ni notas como HTML. Multi-personalización conserva una fila por `Order.items`.
- El detalle Admin muestra el log y permite reintentar fallos. No se añaden páginas ni campañas. Un test/helper renderiza HTML sin enviarlo.
- Preview local sin envío: desde `Backend`, ejecutar `node scripts/preview-transactional-email.js ORDER_RECEIVED` y redirigir stdout a un `.html` temporal para abrirlo en un navegador.

## Criterios de aceptación

1. Pedido persistido y respuesta correcta aun si Resend falla; destinatarios cliente/admin independientes.
2. Payment pending usa instrucciones congeladas; pago confirmado, producción, recogida y envío se emiten una sola vez.
3. Pickup muestra punto/instrucciones congelados, local muestra dirección congelada, parcel omite tracking inexistente.
4. Los correos no exponen secretos ni HTML no escapado. Admin ve `pending/sent/failed` y puede reintentar `failed`.
5. Tests de provider, templates, eventos/idempotencia/error/retry; backend check, frontend tests afectados/lint/build y diff check.

## Operación y configuración manual

1. Verificar dominio y remitente en Resend.
2. Definir en entorno local y en Render `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `ADMIN_NOTIFICATION_EMAIL` y `TRANSACTIONAL_EMAIL_ENABLED=true`. No poner la clave en frontend ni en Mongo.
   Para el logo de email, definir también `PUBLIC_STOREFRONT_URL` como origen HTTPS público de la tienda; sin él se usa texto `MiLuGui`.
3. Reiniciar backend y crear pedidos de prueba pickup y local. Confirmar correos de pedido y pago pendiente; confirmar pago en Admin, pasar una personalización V2 a `in_production`, marcar pickup listo y un envío como enviado. Revisar registro en el detalle Admin.
4. Simular fallo de proveedor y usar «Reintentar» solo cuando el registro indique `failed`. No se realiza despliegue automáticamente.

## Riesgos y exclusiones

- Sin webhook firmado no se conocen `delivered/bounced`; consultar el panel Resend para entrega real.
- Resend retiene claves de idempotencia durante 24 h; una aceptación remota seguida de pérdida del ACK y reintento manual fuera de esa ventana no garantiza exactamente una entrega. El log local evita duplicados conocidos.
- No hay cola ni reintentos automáticos. No se migra histórico SMTP ni se reenvían emails de pedidos antiguos automáticamente.
- Un segundo `POST /api/orders` tras perder la respuesta puede crear otro pedido: la idempotencia 023B garantiza un email por evento de **cada pedido persistido**, no deduplica el checkout completo. Requiere contrato de idempotencia de pedidos aparte.
- Se requiere configurar/verificar dominio remitente y variables en Render manualmente; no se despliega en esta tarea.

## Ampliación visual y branding MiLuGui

- Marca visible: `MiLuGui`; se conservan nombres técnicos, rutas y contratos. `RESEND_FROM_NAME` usa ese nombre por defecto sin cambiar la dirección remitente.
- Assets oficiales localizados en `C:\Users\Amed\Desktop\Diseños\LOGO\Correcto`: `LOGO_mejorado.svg`, varios PNG del logo, `ISOTIPO_processed.png`, `ISOTIPO_processed_blanco.png` e `ISOTIPO_SIN.png`. Los dos PNG «processed» tienen fondo casi opaco y el llamado «blanco» conserva el símbolo oscuro; no sirve como variante blanca para modo oscuro. Se copia `ISOTIPO_SIN.png` transparente para móvil/favicon. En modo oscuro el header proporciona una pequeña superficie clara para contraste, sin recolorear el asset.
- `frontend/public/brand/` contiene SVG completo sin modificar, isotipo transparente y PNG de email recortado determinísticamente del PNG oficial (`LOGO_mejorado_2 (1).png`), sin deformar ni recolorear.
- Header web: SVG desktop/tablet e isotipo en móvil por CSS; enlace a inicio con `alt="MiLuGui"`. Favicon PNG oficial. No hay manifest/PWA icons previos.
- Emails: layout de 600 px con tablas e inline styles, logo PNG solo con URL HTTPS pública válida, fallback textual. Pedido y fecha destacados; cada `Order.items` se presenta por separado. Superficies derivadas de labels congelados o del catálogo ProductTemplate de producción, nunca IDs técnicos. Total enfatizado. Preparación solo si procede. Pickup/local muestran datos comerciales del snapshot.
- `ORDER_RECEIVED` y `PAYMENT_PENDING` mantienen detalle; los cuatro estados usan un resumen breve; `NEW_ORDER_ADMIN` prioriza total, entrega, pago y líneas. No se añaden eventos ni se altera su lógica.
- Preview local: `node scripts/preview-transactional-email.js ORDER_RECEIVED mug` o `... ORDER_SHIPPED shirt`; cualquier evento 023B es válido. Solo genera HTML en stdout, sin envíos.

## Segunda pasada visual

- Cabecera blanca con acento turquesa, cuerpo de 620 px, metadatos en tabla, productos separados y personalización como subtarjeta. El total se destaca; `PAYMENT_PENDING` prioriza importe e instrucciones estructuradas, mientras los estados son breves y el aviso Admin es operativo.
- El PNG local debe estar publicado por el frontend en `/brand/milugui-logo-email.png`. Si `PUBLIC_STOREFRONT_URL` es HTTPS, sintácticamente válida y no local, el HTML usa directamente esa URL con la ruta del PNG; de lo contrario se muestra `MiLuGui` en texto. El envío no consulta el frontend. La disponibilidad pública del asset se verifica en tests, despliegue y revisión manual, no en cada email.
- Resend ya admite `reply_to`: `RESEND_REPLY_TO` es opcional. El footer invita a responder solo si hay una dirección configurada y válida. No se alteran eventos, envío ni reintentos.
