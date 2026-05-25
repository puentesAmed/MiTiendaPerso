# Inventario de código legacy/comentado

Este documento registra áreas con bloques legacy/comentados detectados en la revisión de limpieza controlada.

## Alto riesgo / no tocar todavía

- `Backend/src/controllers/orders.controller.js`
  - Archivo crítico de creación de pedido, estados, emails, tracking y pago manual.
  - Contiene bloques duplicados/comentados e historial de cambios dentro del mismo archivo.
  - Riesgo alto de romper checkout/pedidos si se limpia sin pruebas de integración.

- `Backend/src/controllers/products.controller.js`
  - Incluye bloques legacy y versión actual coexistiendo.
  - Afecta catálogo público y CRUD admin.
  - Riesgo alto de regresión en productos si se elimina código sin validación exhaustiva.

## Riesgo medio / requiere revisión manual

- `Backend/src/routes/customizations.routes.js`
- `frontend/src/pages/Admin/Admin.jsx`
- `frontend/src/App.jsx`
- `frontend/src/components/ProductDesigner.jsx`
- `frontend/src/pages/Login/Login.jsx`
- `frontend/src/pages/OrderTracking/OrderTracking.jsx`
- `frontend/src/router/index.jsx`

Motivo general:
- Presencia de bloques comentados/históricos en archivos activos.
- Superficie funcional amplia (routing/UI/admin) con potencial de efectos colaterales.
- Requiere revisión por secciones y smoke tests por flujo antes de eliminar.

## Bajo riesgo / posible limpieza futura

- Comentarios decorativos o bloques menores en archivos no críticos y utilidades aisladas.
- Limpieza posible cuando exista checklist de verificación rápida por módulo.

## Regla operativa para fases futuras

**No eliminar bloques legacy de archivos críticos hasta tener pruebas de integración mínimas**, al menos para:
- auth (login/register),
- crear pedido,
- confirmar pago manual,
- bloqueo de pago duplicado,
- shipping-options con error seguro,
- protección de endpoint admin.
