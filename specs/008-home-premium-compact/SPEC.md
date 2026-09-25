# SPEC-008 — Home Premium Compact

## Estado

**Estado:** implementada y validada el 25 de septiembre de 2026.

## Objetivo

Rediseñar la Home de MiTiendaPerso como una portada ecommerce compacta, premium, accesible y orientada a producto y personalización, utilizando exclusivamente rutas, datos y capacidades reales.

## Estructura

1. Hero compacto con producto real cuando la API está disponible.
2. Categorías destacadas derivadas del catálogo real.
3. Hasta cuatro productos destacados reales.
4. Flujo compacto de personalización.
5. Beneficios verificables de la aplicación.
6. CTA final compacto.

## Datos y selección

- La Home reutiliza `apiGetProducts()` sin modificar su contrato.
- No existe señal de “destacado” en el modelo actual. Se seleccionan determinísticamente los primeros cuatro productos del orden devuelto por la API.
- El hero prioriza el primer producto personalizable; si no existe, utiliza el primer producto disponible.
- Las categorías se deduplican a partir de `product.category`, muestran como máximo tres y utilizan como imagen el primer producto real de cada categoría.
- Las categorías enlazan al catálogo general: el filtro de categoría no dispone actualmente de contrato URL público y esta SPEC no altera filtros ni backend.

## Contenido real

- Se eliminan productos simulados, banners promocionales ficticios, descuentos no respaldados y rutas inexistentes.
- La personalización representa el flujo real: elegir producto, personalizar cuando esté disponible y añadirlo al pedido.
- Los beneficios se limitan a personalización, variantes del catálogo y seguimiento de pedidos.

## Arquitectura visual

- Tailwind, shadcn/Base UI, Lucide y foundation existente.
- `ShineBorder` se utiliza como detalle estático y moderado en la composición editorial del hero.
- No se incorporan animaciones continuas ni nuevas dependencias. Las transiciones respetan `prefers-reduced-motion`.
- ProductCard se reutiliza sin modificaciones.

## Estados

- La carga de destacados utiliza `LoadingState`.
- Los fallos utilizan `ErrorState` con reintento y no bloquean el resto de la Home.
- Un catálogo vacío utiliza `EmptyState`.

## Criterios de aceptación

- [x] **CA-01.** La Home presenta un hero split premium y compacto, sin ocupar la pantalla completa.
- [x] **CA-02.** El hero utiliza copy breve, CTA reales y no contiene promociones o garantías inventadas.
- [x] **CA-03.** La composición del hero usa productos e imágenes reales de la API cuando están disponibles.
- [x] **CA-04.** Se eliminan banners, productos simulados y rutas rotas de la Home anterior.
- [x] **CA-05.** Las categorías destacadas se derivan de categorías reales y se limitan a tres.
- [x] **CA-06.** Las categorías utilizan imágenes de productos reales y navegación existente.
- [x] **CA-07.** Los destacados proceden de `apiGetProducts()` y usan una selección determinista documentada.
- [x] **CA-08.** Se muestran como máximo cuatro destacados y se reutiliza ProductCard sin modificarlo.
- [x] **CA-09.** Loading, error y empty de destacados utilizan los componentes foundation existentes.
- [x] **CA-10.** Un error de productos no impide utilizar hero, personalización, beneficios o CTA final.
- [x] **CA-11.** La sección de personalización representa el flujo real en tres pasos compactos.
- [x] **CA-12.** Los CTA enlazan exclusivamente rutas existentes.
- [x] **CA-13.** Los beneficios mencionan únicamente capacidades verificables de la aplicación.
- [x] **CA-14.** La Home no introduce un tercer buscador ni duplica Global Search.
- [x] **CA-15.** Magic UI queda limitado a `ShineBorder`, sin efectos continuos o distractores.
- [x] **CA-16.** La jerarquía de headings, alt text, semántica y foco son accesibles.
- [x] **CA-17.** Las transiciones respetan `prefers-reduced-motion` y las imágenes secundarias usan lazy loading.
- [x] **CA-18.** La Home funciona sin overflow a 320, 375, 768, 1024 y 1440 px.
- [x] **CA-19.** Hero, categorías, cards, CTA y superficies funcionan en light y dark mode.
- [x] **CA-20.** No se modifica backend, ProductCard, shell, catálogo, filtros ni páginas fuera de alcance.
- [x] **CA-21.** `npm run lint` finaliza correctamente.
- [x] **CA-22.** `npm run build` finaliza correctamente.
- [x] **CA-23.** `git diff --check` finaliza correctamente.

## Fuera de alcance

Catálogo, filtros, Global Search, ProductDetail, galería, Cart, Checkout, Admin, backend, pagos, shipping, variantes, AliExpress, dropshipping y MONEI.

## Validación

- `npm run lint`
- `npm run build`
- `git diff --check`
- smoke visual light/dark a 320, 375, 768, 1024 y 1440 px;
- comprobación de hero, CTA, categorías, estados de productos, personalización y navegación.

Resultado: 23/23 criterios cumplidos. La validación visual cubrió los estados disponibles con la API local desconectada, incluido el aislamiento del error de productos; la composición con datos se verificó mediante el contrato de `apiGetProducts()` y la reutilización de `ProductCard`.
