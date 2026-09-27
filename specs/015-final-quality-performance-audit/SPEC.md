# SPEC-015 — Auditoría final UI/UX, arquitectura y rendimiento

## Estado

**Estado:** en curso

**Dependencias:** SPEC-005 a SPEC-014 cerradas.

---

# OBJETIVO

Revisar el estado final del ecommerce después de SPEC-005 a SPEC-014.

Recorrido principal:

Home
→ Productos
→ ProductDetail
→ Cart
→ Checkout
→ OrderConfirmation
→ Mis pedidos
→ OrderDetail
→ Admin

Evaluar:

1. coherencia UI;
2. responsive;
3. accesibilidad;
4. navegación;
5. estados loading/empty/error;
6. rendimiento;
7. bundle;
8. code splitting;
9. duplicación razonable;
10. deuda residual;
11. integraciones dormidas;
12. seguridad funcional básica.

---

# 1. INSPECCIÓN LOCALIZADA

Leer primero:

- `AGENTS.md`
- SPEC-005 a SPEC-014
- router principal
- `App.jsx` o entrypoint equivalente
- componentes shell
- componentes UI compartidos
- páginas principales del recorrido

No leer backend completo.

Backend solo si aparece una regresión funcional concreta.

---

# 2. AUDITORÍA VISUAL

Comprobar coherencia entre:

- Home
- Products
- ProductDetail
- Cart
- Checkout
- OrderConfirmation
- MyOrders
- OrderDetail
- Admin

Revisar:

- max-width;
- spacing;
- typography;
- radius;
- borders;
- botones;
- badges;
- inputs;
- dialogs;
- skeletons;
- empty/error states.

Corregir únicamente inconsistencias claras.

---

# 3. RESPONSIVE

Smoke en:

- 320
- 375
- 768
- 1024
- 1440

Buscar:

- overflow horizontal;
- layouts comprimidos;
- botones fuera de viewport;
- tablas inusables;
- cards demasiado estrechas;
- textos largos;
- IBAN/referencias;
- navegación.

---

# 4. DARK MODE

Validar todas las pantallas principales.

Buscar:

- hardcoded colors;
- contraste incorrecto;
- fondos claros en dark;
- borders invisibles;
- iconos sin contraste.

Corregir solo problemas reales.

---

# 5. ACCESSIBILITY

Revisar:

- headings;
- landmarks;
- labels;
- aria-label;
- focus-visible;
- keyboard navigation;
- dialogs;
- radio groups;
- buttons icon-only;
- contrast;
- reduced motion.

No intentar certificación completa WCAG.

Corregir issues concretos encontrados.

---

# 6. NAVEGACIÓN

Validar:

- header;
- mobile navigation;
- Global Search;
- catálogo → detalle → volver;
- restauración de scroll;
- carrito;
- checkout;
- confirmación;
- cuenta;
- pedido;
- admin;
- rutas protegidas.

No romper SPEC-009 restoration.

---

# 7. ESTADOS DE UI

Cada flujo debe distinguir correctamente:

- loading;
- empty;
- error;
- success.

Buscar:

- spinners gigantes;
- páginas vacías;
- errores confundidos con empty;
- estados sin retry.

Corregir solo inconsistencias claras.

---

# 8. RESTOS DE CHAKRA

Buscar:

- `@chakra-ui`
- ChakraProvider
- hooks Chakra
- imports muertos
- estilos legacy relacionados.

Objetivo:
0 uso directo Chakra.

No eliminar dependencia transitiva si otra librería legítima la necesita.

---

# 9. INTEGRACIONES DORMIDAS

Buscar en UI activa:

- AliExpress
- affiliate
- dropshipping
- MONEI

No deben aparecer en experiencia actual.

No borrar código histórico backend.

Solo retirar exposición accidental.

---

# 10. BUNDLE

Existe warning >500 kB.

Investigar antes de modificar.

Usar:

- build output;
- imports;
- dependencias;
- chunks;
- dynamic import opportunities.

Identificar los mayores contributors.

No instalar bundle analyzer salvo que ya exista.

---

# 11. CODE SPLITTING

Revisar router.

Prioridad para lazy-loading de páginas pesadas:

- Admin
- ProductDesigner
- Checkout
- OrderDetail
- páginas secundarias

Solo si actualmente están eager.

Usar `React.lazy` / `Suspense` si encaja con arquitectura existente.

No fragmentar componentes pequeños.

---

# 12. PRODUCT DESIGNER

Investigar si `react-konva` entra en bundle inicial.

Si sí:
preferencia fuerte por cargar ProductDesigner de forma lazy.

NO modificar lógica del diseñador.

---

# 13. EXCEL / ZIP / LIBRERÍAS PESADAS

Buscar imports grandes utilizados solo en rutas específicas.

Si existen:
carga dinámica/lazy cuando sea seguro.

No cambiar funcionalidad.

---

# 14. DEAD CODE

Buscar únicamente dead code evidente generado por migraciones recientes:

- componentes Chakra sin uso;
- helpers antiguos reemplazados;
- imports sin uso;
- archivos temporales;
- smoke configs;
- scripts temporales.

NO hacer limpieza masiva.

---

# 15. COMPONENTES DUPLICADOS

Detectar duplicación clara entre:

- order item summaries;
- payment instruction presentation;
- status badges;
- Price;
- ProductImage;
- EmptyState;
- ErrorState;
- Loading/Skeleton.

No abstraer solo por tener dos usos.

Extraer únicamente si:
- reduce código;
- no aumenta complejidad;
- contrato es realmente igual.

---

# 16. PERFORMANCE FRONTEND

Revisar:

- renders obvios innecesarios;
- requests duplicadas;
- N+1;
- imágenes eager;
- previews pesadas;
- lists without stable keys.

No microoptimizar.

---

# 17. API REQUESTS

Validar que:

- Admin no haga N+1;
- MyOrders no haga detalle por cada pedido;
- catálogo no haga requests duplicadas;
- Home no duplique innecesariamente catálogo;
- Global Search debounce sigue correcto.

No rediseñar caching.

---

# 18. SECURITY SANITY CHECK

Revisar únicamente flujos ya implementados:

- Admin route protection;
- admin backend protection;
- order ownership;
- manual payment instructions;
- no secretos frontend;
- no precios autoritativos frontend;
- no shipping autoritativo frontend.

No realizar auditoría pentest.

---

# 19. CONSOLE

Durante smoke:
revisar errores reales de consola.

Ignorar warnings conocidos si no son funcionales:

- baseline-browser-mapping
- bundle warning

Documentarlos.

No dejar errores runtime.

---

# 20. BUILD WARNINGS

Clasificar:

A. corregible ahora;
B. deuda real;
C. informativo.

No intentar eliminar warnings ocultándolos.

---

# 21. BUNDLE TARGET

No fijar un número arbitrario.

Objetivo:
reducir bundle inicial de forma medible si existen imports pesados claramente lazy-loadable.

Reportar:

ANTES:
- JS initial/chunk principal

DESPUÉS:
- JS initial/chunk principal

Si no hay mejora segura:
documentar y no forzar.

---

# 22. NO TOCAR

No modificar:

- pricing;
- shipping;
- payment contracts;
- CartLineV2;
- Product schema;
- Order schema;
- manual payment semantics;
- AliExpress backend;
- dropshipping backend;
- MONEI backend.

---

# 23. VALIDACIÓN FUNCIONAL

Smoke mínimo:

Public:
- Home
- Global Search
- Products
- filters
- ProductDetail
- return restoration
- Cart
- Checkout

Orders:
- OrderConfirmation
- MyOrders
- OrderDetail

Admin:
- dashboard
- orders
- pending → paid
- products
- stock
- customizations

Auth:
- guest
- authenticated
- admin
- non-admin.

---

# 24. TESTS

Ejecutar:

Frontend:
- `npm run lint`
- `npm run build`
- `git diff --check`

Backend:
solo tests relevantes si se modifica backend.

No ejecutar suites innecesarias si no hay cambios.

---

# 25. CRITERIOS DE ACEPTACIÓN

La SPEC debe incluir como mínimo:

- [ ] audit visual;
- [ ] responsive;
- [ ] dark mode;
- [ ] accessibility;
- [ ] navigation;
- [ ] scroll restoration;
- [ ] no Chakra direct;
- [ ] dormant integrations hidden;
- [ ] bundle investigated;
- [ ] lazy loading evaluated;
- [ ] ProductDesigner lazy if justified;
- [ ] no temporary files;
- [ ] no runtime errors;
- [ ] no N+1 introduced;
- [ ] auth/admin/order ownership intact;
- [ ] lint;
- [ ] build;
- [ ] diff check.

---

# 26. AHORRO DE TOKENS

Primero usar búsquedas globales:

- `@chakra-ui`
- `react-konva`
- `ProductDesigner`
- `lazy(`
- `import(`
- `AliExpress`
- `MONEI`
- `dropshipping`
- `console.error`
- `TODO`
- `FIXME`

Después abrir solo archivos relevantes.

---

# ENTREGA

## SPEC creada

## Estado general
Máximo 10 puntos.

## Hallazgos
Separar:
- críticos
- importantes
- menores

## Archivos modificados
Motivo por archivo.

## UI/UX
Resultado.

## Responsive
Resultado.

## Accessibility
Resultado.

## Navegación
Resultado.

## Performance
Bundle antes/después.

## Lazy loading
Qué se cambió y por qué.

## Chakra
Resultado búsqueda.

## Integraciones dormidas
Resultado.

## Seguridad
Resultado.

## Runtime
Errores/warnings.

## Tests
Resultados.

## Criterios SPEC-015
Cumplidos / total.

## Deuda restante
Solo deuda real.

## Riesgos nuevos
Solo si existen.

Detente.