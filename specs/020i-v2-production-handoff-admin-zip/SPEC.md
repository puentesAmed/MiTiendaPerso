# SPEC-020I — V2 Production Handoff, Admin & ZIP

## Estado

Activa. Esta SPEC cierra el handoff de `DesignDocument` V2 desde Designer V2 hasta producción y mantiene lectura/descarga V1.

## Objetivo

Congelar al confirmar el pedido el documento, assets y artworks limpios de todas las superficies declaradas por el template; exponerlos al Admin mediante descargas autenticadas y un ZIP versionado con manifest.

## Estado actual

- `Customization` es un documento separado y `Order.items[].customizationId` ya lo referencia.
- `orders.controller` crea la personalización antes del pedido y enlaza `orderId` después.
- `generateCustomizationZip` usa `StorageProvider`, pero escribe `design.json`, `design_front.png` y `design_back.png`.
- `/api/customizations` y `/api/customizations/:id/zip` están protegidos por auth/admin.
- Admin lista documentos, muestra un preview y descarga el ZIP.
- Designer V2 conserva `DesignDocument` y assets en IndexedDB; `ArtworkRenderer` produce PNG limpio a la resolución de `PrintSurface`.
- El Designer V2 no entrega todavía el documento al carrito.

## Reutilizable

- Relación `Order` → `Customization`.
- Middleware `requireAuth`/`requireAdmin`.
- `StorageProvider` y adapter local con protección de traversal.
- Renderer limpio `ArtworkRenderer` y resoluciones declaradas por template.
- Admin existente y endpoint legacy de ZIP.
- Contrato `CartLineV2` y serialización de checkout.

## Legacy

- Documentos sin `schemaVersion` se interpretan exclusivamente como V1.
- `design.elementsBySide.front/back`, `previewsBySide`, `previewImage`, mockups, `zipUrl` y `status` se mantienen.
- El ZIP V1 conserva sus nombres y no se migra ni regenera automáticamente.
- El adapter legacy no representa ni trunca documentos V2.

## Cambios necesarios

1. Añadir campos V2 opcionales y no destructivos al schema.
2. Validar producto, template, revisión, variante y superficies con catálogo backend declarativo.
3. Subir artifacts temporales opacos y promoverlos a keys deterministas al confirmar pedido.
4. Congelar `DesignDocument`, snapshots, item identity y surfaces.
5. Generar ZIP V2 idempotente con `manifest.json`, `design-document.json`, `production/` y `previews/`.
6. Añadir descarga individual y transiciones de producción validadas.
7. Evolucionar el Admin existente para leer V1/V2.
8. Añadir entrega V2 a Cart/Checkout sin blobs ni Data URLs en almacenamiento del carrito.

## Contrato V2

`schemaVersion: 2`, `orderItemId`, `productSnapshot`, `variant`, `quantity`, `designDocument`, `productionSurfaces[]`, `previewImage`, `productionBundle` y `productionStatus`. Los campos V1 continúan opcionales.

Cada surface contiene identidad declarativa (`viewId`, `surfaceId`, `label`) y referencias persistentes a artwork/preview (`storageKey`, filename, MIME y dimensiones). El cliente solo transporta upload references opacas; el backend resuelve y valida el conjunto esperado, MIME y dimensiones.

## Freeze y storage

- Designer V2 renderiza mediante el renderer limpio existente, nunca mediante screenshot de workspace.
- El endpoint de staging acepta PNG productivo y assets de imagen limitados, asigna un UUID opaco y no publica paths.
- Checkout promueve bytes a `customizations/<id>/production|previews|assets/...`.
- El documento congelado sustituye referencias locales por `storageKey`; quedan prohibidos `blob:` y Data URLs.
- Las keys y filenames productivos se derivan de IDs declarados/validados, nunca de texto del usuario.

## Templates soportados

- `mug-ceramic-standard-v1` revisión 1: `wrap` → `wrap-main`, 1008×480.
- `tshirt-basic-v1` revisión 2: `front`, `back`, `sleeve-left`, `sleeve-right` con las resoluciones declaradas actuales.

No se inventan DPI, tamaño físico, bleed ni safe area.

## Estados

`pending`, `ready`, `in_production`, `completed`, `issue`. Transiciones mínimas: `pending→ready|issue`, `ready→in_production|issue`, `in_production→completed|issue`, `issue→pending|ready`. V1 conserva su `status` histórico.

## Seguridad

- Listado, estado, artwork y ZIP requieren Admin.
- Nunca se devuelve `storageKey` en DTOs Admin.
- Se validan IDs, MIME, tamaño, PNG, dimensiones, template, revisión y surface set.
- El pedido no acepta paths, ZIP ni production status del cliente.

## Criterios de aceptación

- Taza produce `production/wrap.png`.
- Camiseta produce cuatro PNG independientes.
- ZIP V2 incluye manifest y documento congelado.
- Admin lista y detalla V1/V2, descarga surfaces/ZIP y cambia estado.
- `Order.items[].customizationId` se conserva y `orderItemId` identifica la línea.
- Producción no depende de IndexedDB, Object URLs ni template futuro.
- Ninguna vista V2 se trunca a front/back.
- Regresiones legacy, auth, status, manifest y surfaces cubiertas con tests localizados.

## Fuera de alcance

Migraciones destructivas, cloud storage nuevo, GLB por pedido, edición desde Admin, formatos SVG/PDF, DPI físico inventado, cambios de precio/pago y QA visual exhaustivo.
