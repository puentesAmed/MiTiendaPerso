# SPEC-014 — Administración Premium Compact

## Estado

**Estado:** cerrada — 30/30 criterios cumplidos.

**Dependencias:** SPEC-002, SPEC-003 y SPEC-013 cerradas.

## Objetivo

Modernizar el área administrativa con la dirección `Premium Compact Commerce`: densa, operativa, responsive, accesible y centrada exclusivamente en capacidades reales. Pedidos y confirmación manual de pagos tienen prioridad sobre catálogo y personalizaciones.

## Inventario Admin real

- Ruta frontend única `/admin`, protegida por `ProtectedRoute roles={["admin"]}`. El header solo muestra el acceso a usuarios con rol admin.
- Módulos existentes: Resumen derivado, Productos locales, Pedidos y Personalizaciones.
- Pedidos: listado completo ordenado por fecha, filtro backend por estado, cambio a `processing`, `shipped`, `delivered` o `cancelled`, confirmación manual `pending → paid`, confirmación de fecha de entrega y detalle basado en el snapshot de Order.
- Pagos: `POST /api/orders/:id/mark-paid` exige autenticación y rol admin, rechaza cancelados y pagos ya confirmados.
- Productos: crear, editar y eliminar, incluido precio actual, stock global, visibilidad, variantes simples y configuración existente de personalización.
- Personalizaciones: listado, preview, detalle de diseño y descarga del ZIP ya generado. No se modifica ProductDesigner ni la generación del ZIP.
- No existe módulo de usuarios, marketing o analytics.
- No existe paginación en los listados actuales.
- No hay detalle admin dedicado: `GET /api/orders` ya devuelve el snapshot suficiente para lista y detalle sin N+1.
- La UI no ofrece controles activos de MONEI, AliExpress ni dropshipping.

## Hallazgo funcional previo

Productos utilizaba `GET /api/products`, contrato público que filtra `active: true`, puede incorporar afiliados si la integración estuviera habilitada y no devuelve el documento administrativo completo. Esto impide gestionar productos ocultos de forma fiable.

Se añade el contrato mínimo protegido:

```http
GET /api/products/admin
Authorization: Bearer <token admin>
```

Devuelve exclusivamente documentos `Product` locales, incluidos activos e inactivos, ordenados por fecha. No consulta ni mezcla `AffiliateProduct`.

## Diseño y navegación

- Cabecera compacta y navegación secundaria superior adaptable: Resumen, Pedidos, Productos y Personalizaciones.
- Sin hero, Magic UI, animaciones continuas ni decoración de storefront.
- Tablas compactas desde tablet/desktop y filas tipo card en móvil.
- Scroll horizontal queda contenido dentro de tablas cuando sea inevitable.
- Cada módulo distingue loading, empty y error.

## Pedidos

El listado usa una sola petición y muestra referencia, fecha, cliente, artículos, total, método, estado operativo, estado de pago y acciones. El filtro operativo se envía al backend; búsqueda, pago y método se aplican localmente porque no existe paginación.

La confirmación manual usa un diálogo accesible con referencia, total, método y estado. No se ofrece la acción si el pago no está pendiente. El backend sigue siendo autoridad y bloquea repeticiones.

El detalle usa exclusivamente el snapshot de Order: cliente, dirección, líneas, variante canónica con fallback legacy, indicador de personalización, subtotal derivado de total menos shipping almacenado, envío, total, método, estados, notas y entrega.

## Productos y stock

- El listado administrativo contiene únicamente productos locales y muestra imagen, nombre, categoría, precio, stock, visibilidad, personalización y acciones existentes.
- Alta y edición conservan el formulario y el modelo actuales.
- Stock se guarda mediante submit explícito; no actualiza por pulsación.
- Eliminación conserva el hard delete existente y exige confirmación accesible.
- No se introduce pricing nuevo ni stock por variante.

## Personalizaciones

Se conserva listado, búsqueda local, preview, detalle y descarga del ZIP existente. No se crean estados, assets ni procesos nuevos.

## Seguridad

- Frontend: `/admin` exige usuario autenticado con rol `admin`.
- Backend: pedidos, confirmación de pago, mutaciones de producto y personalizaciones exigen `requireAuth` y `requireAdmin`.
- El nuevo listado administrativo de productos aplica la misma protección.
- Ocultar navegación no sustituye autorización backend.

## Integraciones dormidas

- La UI activa no muestra sincronización o catálogo AliExpress, fulfillment dropshipping, MONEI, refunds, webhooks ni sesiones de pago.
- El listado administrativo nuevo consulta solo `Product` local.
- No se borra código histórico de integraciones.

## Fuera de alcance

- Storefront, Checkout, Mis pedidos, ProductDesigner, pricing, shipping y métodos manuales.
- Usuarios, marketing, analytics, informes, paginación nueva y máquinas de estados nuevas.
- Backend AliExpress, dropshipping o MONEI.

## Criterios de aceptación

- [x] **CA-01.** La SPEC documenta el inventario Admin real.
- [x] **CA-02.** `/admin` continúa protegido por rol en frontend.
- [x] **CA-03.** Endpoints críticos continúan protegidos por auth y rol admin.
- [x] **CA-04.** Navegación compacta muestra solo módulos reales.
- [x] **CA-05.** Resumen contiene únicamente métricas derivables de datos ya cargados.
- [x] **CA-06.** Pedidos usa una sola carga, sin N+1.
- [x] **CA-07.** Listado muestra referencia, fecha, cliente, artículos, total, método y estados.
- [x] **CA-08.** Filtros disponibles no introducen contratos ficticios.
- [x] **CA-09.** Estados operativos se limitan a los soportados por backend.
- [x] **CA-10.** Pending y paid tienen texto visible además de color.
- [x] **CA-11.** Confirmar pago usa diálogo explícito con referencia, importe y método.
- [x] **CA-12.** Paid y cancelled no ofrecen confirmación de pago.
- [x] **CA-13.** Acciones críticas bloquean doble submit y muestran feedback.
- [x] **CA-14.** Detalle usa snapshots históricos y no precios actuales.
- [x] **CA-15.** Detalle muestra dirección, líneas, importes, pago, estados y notas disponibles.
- [x] **CA-16.** Variantes canónicas y legacy siguen visibles.
- [x] **CA-17.** Líneas personalizadas quedan identificadas.
- [x] **CA-18.** Productos Admin contiene solo Product local, activos e inactivos.
- [x] **CA-19.** Gestión existente de precio y stock se conserva con submit explícito.
- [x] **CA-20.** Alta y edición no amplían el modelo Product.
- [x] **CA-21.** Eliminación conserva comportamiento y exige confirmación.
- [x] **CA-22.** Personalizaciones conserva preview, detalle y ZIP existentes.
- [x] **CA-23.** Integraciones dormidas no aparecen en la UI activa.
- [x] **CA-24.** Loading, empty y error están diferenciados por módulo.
- [x] **CA-25.** Tablas desktop y cards mobile no producen overflow documental.
- [x] **CA-26.** Responsive pasa a 320, 375, 768, 1024 y 1440 px.
- [x] **CA-27.** Light y dark mantienen contraste y jerarquía.
- [x] **CA-28.** Navegación, tablas, formularios, estados y diálogos son accesibles.
- [x] **CA-29.** Tests backend localizados pasan.
- [x] **CA-30.** `npm run lint`, `npm run build` y `git diff --check` pasan.

