# SPEC-009 — Catálogo Premium Compact

## Estado

**Estado:** implementada y validada el 25 de septiembre de 2026.

## Objetivo

Rediseñar `/productos` con la dirección `Premium Compact Commerce`: más producto visible, mejor aprovechamiento horizontal y una lectura rápida, conservando la búsqueda, los filtros y todos los contratos funcionales existentes.

## Decisiones de diseño

- El catálogo utiliza `PageContainer` en variante `wide`, con márgenes laterales responsivos.
- El grid usa una columna por debajo de 360 px porque los CTA reales no conservan una anchura táctil y legible en dos columnas a 320 px.
- Desde 360 px usa dos columnas; a 768 px, tres; a 1024 px, cuatro; y desde el breakpoint `xl` (1280 px), cinco.
- `ProductCard` mantiene su lógica de carrito, variantes, personalización, navegación y restauración de scroll.
- La descripción y la categoría se omiten del grid: el detalle conserva esa información y la card prioriza imagen, nombre, precio, disponibilidad y capacidades accionables.
- El nombre ocupa como máximo dos líneas y mantiene una zona estable sin imponer una altura rígida a toda la card.
- `ProductImage` conserva ratio 4:3, fallback y lazy loading.
- El brillo decorativo se retira de las cards; solo permanece una elevación sutil en hover con soporte para `prefers-reduced-motion`.
- El buscador continúa sincronizado con `q`; categoría y precios siguen en el `Sheet` con estado temporal.
- Los filtros aplicados se muestran como chips removibles compactos. El filtro de precio cuenta como un único filtro.
- El contador reutiliza `products.length` y no genera peticiones adicionales.
- La carga inicial usa un grid de skeletons con proporciones próximas a `ProductCard`.

## Estados

- Loading: skeletons dentro del grid responsive.
- Empty: `EmptyState` diferenciado, con acción para limpiar búsqueda y filtros.
- Error: `ErrorState` con reintento; no se presenta como ausencia de resultados.
- Resultados previos durante una recarga: permanecen visibles para evitar saltos de layout.

## Accesibilidad

- Un único `h1` describe la página.
- El buscador conserva `role="search"` y label accesible.
- El botón de filtros anuncia la cantidad activa.
- Cada chip dispone de botón con nombre explícito para retirar el filtro.
- Navegación y acciones mantienen foco visible, targets táctiles y controles independientes.
- Los movimientos decorativos respetan `prefers-reduced-motion`.

## Rendimiento

No se añaden dependencias, peticiones ni efectos pesados. Las imágenes siguen cargando de forma diferida y el grid de carga reutiliza `Skeleton`.

## Criterios de aceptación

- [x] **CA-01.** El catálogo utiliza el ancho `wide` y mantiene márgenes laterales respirables.
- [x] **CA-02.** El grid usa una columna a 320 px y dos columnas desde 360/375 px sin perder legibilidad.
- [x] **CA-03.** El grid muestra tres columnas a 768 px.
- [x] **CA-04.** El grid muestra cuatro columnas a 1024 px.
- [x] **CA-05.** El grid muestra cinco columnas desde 1280 px y, por tanto, a 1320/1440 px.
- [x] **CA-06.** `ProductCard` conserva toda su lógica funcional.
- [x] **CA-07.** Las cards mantienen altura visual consistente con título limitado a dos líneas.
- [x] **CA-08.** La descripción larga y la categoría no ocupan espacio en el grid.
- [x] **CA-09.** Imagen, fallback, ratio consistente y lazy loading se conservan mediante `ProductImage`.
- [x] **CA-10.** Precio, disponibilidad, personalización y variantes mantienen representación visible y textual.
- [x] **CA-11.** Los CTA son compactos, claros y mantienen targets táctiles.
- [x] **CA-12.** La búsqueda local continúa sincronizada con `q` y combinada con los filtros.
- [x] **CA-13.** El `Sheet` y su estado temporal permanecen funcionales.
- [x] **CA-14.** El botón muestra la cantidad de filtros activos.
- [x] **CA-15.** Los filtros aplicados aparecen como chips compactos, removibles y sin reservar espacio cuando no existen.
- [x] **CA-16.** El contador queda relacionado con el encabezado y no realiza una petición adicional.
- [x] **CA-17.** Loading usa skeletons de card dentro del grid responsive.
- [x] **CA-18.** Empty y error permanecen diferenciados y ofrecen acciones adecuadas.
- [x] **CA-19.** La primera fila aparece pronto y no existe overflow a 320, 375, 768, 1024 o 1440 px.
- [x] **CA-20.** La composición funciona en light y dark mode.
- [x] **CA-21.** Focus, teclado, contraste, labels y botones de chips son accesibles.
- [x] **CA-22.** No se modifican backend, APIs, Global Search, Home ni páginas fuera de alcance.
- [x] **CA-23.** No se añaden dependencias ni peticiones adicionales.
- [x] **CA-24.** `npm run lint` finaliza correctamente.
- [x] **CA-25.** `npm run build` finaliza correctamente.
- [x] **CA-26.** `git diff --check` finaliza correctamente.

## Fuera de alcance

Global Search, Home, ProductDetail, Cart, Checkout, Admin, backend, APIs, pricing, shipping, pagos, variantes, AliExpress, dropshipping y MONEI.

## Validación

- Smoke funcional de `q`, filtros, chips, contador, Sheet y acciones de card.
- Smoke visual en 320, 375, 768, 1024 y 1440 px, en light y dark.
- Revisión de títulos largos, imágenes, CTA, stock, personalización y ausencia de overflow.
- `npm run lint`.
- `npm run build`.
- `git diff --check`.

Resultado: 26/26 criterios cumplidos. El smoke utilizó la API real en `http://localhost:3000`, con 10 productos, y comprobó búsqueda por `q`, filtros de categoría y precio, chips removibles, contador, empty state, cards reales y grid 1/2/3/4/5 en las resoluciones objetivo. Error y loading se verificaron mediante sus ramas independientes y componentes existentes; la respuesta local disponible permitió validar el camino de éxito completo.
