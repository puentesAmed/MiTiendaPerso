# SPEC-010 — Product Detail + Gallery Premium Compact

## Estado

**Estado:** cerrada — 29/29 criterios cumplidos.

## Objetivo

Rediseñar ProductDetail con la dirección `Premium Compact Commerce`: galería protagonista, compra compacta, variantes canónicas, personalización clara y composición responsive, sin modificar negocio, backend ni contratos API.

## Estructura

- `PageContainer` limita el ancho y mantiene márgenes responsivos.
- En desktop, galería e información forman dos columnas; en mobile se apilan en el orden imagen, miniaturas, información, variantes y acciones.
- La descripción pasa a una sección secundaria debajo del bloque de compra.
- No se muestran promesas de envío, devolución, garantía, materiales o plazos que no procedan de datos reales del producto.

## Galería

- La colección deduplica `product.image` y `product.images` sin cambiar el contrato recibido.
- La imagen principal usa `ProductImage`, `object-fit: contain`, ratio estable y fallback existente.
- Las miniaturas solo aparecen con más de una imagen y usan carga diferida.
- Flechas anterior/siguiente y swipe mediante Pointer Events navegan de forma circular.
- El swipe requiere un desplazamiento horizontal mínimo de 44 px y no añade dependencias.
- La imagen principal carga eager por ser contenido prioritario; las miniaturas cargan lazy.

## Compra y variantes

- `Price` representa el precio recibido, sin cálculos alternativos.
- Disponibilidad usa el stock general disponible y texto explícito.
- Las tallas y colores locales se leen exclusivamente de `product.variants.sizes/colors`.
- La selección se normaliza mediante `normalizeVariant(product, { size, color })` y produce `{ size, color } | null`.
- No se introducen `skuId`, `variantAttributes`, stock por combinación ni swatches inferidos.
- Cantidad se limita entre 1 y el stock general mediante controles compactos.
- Añadir conserva `addItem({ product, quantity, variant, customization: null })` y muestra feedback en el Dialog existente.
- Personalizar conserva la variante canónica seleccionada al navegar al diseñador.

## Navegación

La acción Volver conserva sin cambios el contrato implantado por SPEC-009: pathname/querystring, producto anterior, filtros, búsqueda y estado de restauración. También debe seguir funcionando el botón Atrás nativo del navegador.

## Estados

- Loading: skeleton compacto próximo al layout final.
- Error o producto inexistente: `ErrorState`, reintento y acceso a Volver.
- Sin imagen o imagen rota: fallback visual de `ProductImage`.
- Sin stock: CTA principal deshabilitado y disponibilidad textual.

## Accesibilidad y rendimiento

- Un único `h1` identifica el producto.
- Flechas, miniaturas, variantes y cantidad tienen nombres accesibles y foco visible.
- Los selectores no dependen únicamente del color.
- Las animaciones respetan `prefers-reduced-motion`.
- No se añaden dependencias, prefetch ni imágenes duplicadas.

## Criterios de aceptación

- [x] **CA-01.** ProductDetail usa una composición premium compacta coherente con Home y catálogo.
- [x] **CA-02.** Desktop presenta galería izquierda y compra derecha; mobile conserva el orden funcional definido.
- [x] **CA-03.** La primera acción de compra aparece sin espacio vertical innecesario.
- [x] **CA-04.** La galería deduplica imagen principal e imágenes adicionales.
- [x] **CA-05.** La imagen principal mantiene ratio, contain, fallback y alt adecuado mediante `ProductImage`.
- [x] **CA-06.** Las miniaturas solo aparecen cuando existe más de una imagen y marcan la activa.
- [x] **CA-07.** Flechas anterior/siguiente aparecen únicamente con varias imágenes y navegan circularmente.
- [x] **CA-08.** Swipe móvil mediante Pointer Events usa un umbral razonable y no añade dependencias.
- [x] **CA-09.** Las miniaturas usan lazy loading y la imagen principal prioritaria evita carga diferida.
- [x] **CA-10.** Nombre, precio, disponibilidad, variantes, cantidad y CTA mantienen la jerarquía acordada.
- [x] **CA-11.** El precio se renderiza con `Price` sin nueva lógica de pricing.
- [x] **CA-12.** Talla y color se muestran como selectores compactos, textuales y accesibles.
- [x] **CA-13.** La variante enviada conserva exclusivamente `{ size, color } | null` mediante `normalizeVariant`.
- [x] **CA-14.** No se inventa stock por variante ni se introducen formas legacy en la UI local.
- [x] **CA-15.** La cantidad no baja de 1 ni supera el stock general conocido.
- [x] **CA-16.** Añadir al carrito conserva su comando actual y muestra feedback accesible.
- [x] **CA-17.** Personalizar conserva la variante seleccionada según SPEC-003.
- [x] **CA-18.** La descripción queda como contenido secundario y no se crean tabs innecesarios.
- [x] **CA-19.** No se muestran promesas comerciales o logísticas inventadas.
- [x] **CA-20.** Loading, error, producto inexistente e imagen rota tienen estados diferenciados.
- [x] **CA-21.** No existe overflow y la galería es usable a 320, 375, 768, 1024 y 1440 px.
- [x] **CA-22.** Galería, selectores, botones, superficies y texto funcionan en light y dark mode.
- [x] **CA-23.** Alt, aria-labels, foco, teclado, targets táctiles, contraste y reduced motion son accesibles.
- [x] **CA-24.** Volver y Atrás nativo preservan pathname, querystring, producto, filtros, búsqueda y restauración de SPEC-009.
- [x] **CA-25.** No se modifican backend, API, catálogo, Global Search, Home, Cart, Checkout ni Admin.
- [x] **CA-26.** No se añaden dependencias ni efectos decorativos pesados.
- [x] **CA-27.** `npm run lint` finaliza correctamente.
- [x] **CA-28.** `npm run build` finaliza correctamente.
- [x] **CA-29.** `git diff --check` finaliza correctamente.

## Fuera de alcance

Catálogo, Global Search, Home, Cart, Checkout, Admin, backend, APIs, pricing, shipping, pagos, ProductDesigner, AliExpress, dropshipping y MONEI. La compatibilidad dormida existente no se amplía ni se elimina.

## Validación

- Productos sin variantes, con talla/color, personalizable, con varias imágenes, una imagen e imagen inválida.
- Add-to-cart, feedback, cantidad y variante canónica.
- Swipe, flechas, thumbnails y fallback.
- Volver y Atrás nativo desde catálogo general, búsqueda y filtros.
- Smoke light/dark a 320, 375, 768, 1024 y 1440 px.
- `npm run lint`.
- `npm run build`.
- `git diff --check`.
