# SPEC-007 — Global Search & Catalog Filters UX

## Estado

**Estado:** implementada y validada el 25 de septiembre de 2026.

## Objetivo

Separar claramente el descubrimiento global de productos y el filtrado local del catálogo, manteniendo la dirección `Premium Compact Commerce` y reutilizando el contrato actual de productos.

## Responsabilidades

### Global Search

- Vive en el shell como una acción compacta, no como un input permanente.
- Abre un `Dialog` accesible con historial local y resultados rápidos.
- Navega al detalle o a `/productos?q=<texto>` desde cualquier página.

### Catalog Search

- Vive únicamente en `/productos` como input visible.
- Sincroniza su valor con `q` en la URL y filtra el catálogo explorado.
- Se combina con los filtros aplicados desde un `Sheet` lateral.

Ambos mecanismos comparten el parámetro `q`, pero no estado interno ni representación visual.

## Global Search Dialog

- Utiliza Dialog shadcn/Base UI, Tailwind y Lucide directamente.
- Mantiene como máximo seis búsquedas recientes en `localStorage`, bajo `miTienda_recent_searches_v1`.
- Normaliza espacios, ignora valores vacíos, elimina duplicados sin distinguir mayúsculas y ordena lo más reciente primero.
- Permite eliminar una búsqueda o limpiar todo el historial.
- Consulta `apiGetProducts({ q })` con 300 ms de debounce y muestra como máximo seis resultados compactos.
- Enter y “Ver todos” registran el término y navegan al catálogo.
- Seleccionar un producto registra el término, cierra el diálogo y navega a `/productos/:id`.
- Escape lo cierra mediante el primitive y el input recibe foco al abrir.
- Los estados loading, vacío y error permanecen dentro del diálogo.

## Catálogo y filtros

- El input local obtiene y actualiza `q` en la URL sin mantener una segunda fuente de verdad textual.
- Categoría, precio mínimo y precio máximo se retiran del layout permanente y pasan a un `Sheet` derecho.
- El Sheet usa estado temporal: abrir copia los filtros aplicados; cerrar descarta cambios; aplicar confirma y cierra.
- “Limpiar filtros” limpia el borrador de categoría y precio; los cambios se confirman con “Aplicar filtros”.
- El contador de filtros considera categoría como un filtro y cualquier rango de precio como otro. `q` no cuenta.
- Las categorías permitidas son las existentes en el catálogo actual: `ropa`, `electronica` y `hogar`.
- El precio se filtra en frontend sobre los resultados ya devueltos porque el endpoint actual no implementa `minPrice`/`maxPrice`.
- No se incorpora ordenación: no existe lógica real de ordenación configurable en el contrato actual y no se amplía backend en esta SPEC.
- El contador usa `products.length`; no genera una petición adicional.

## Criterios de aceptación

- [x] **CA-01.** La navbar no contiene un input de búsqueda permanente.
- [x] **CA-02.** La acción compacta abre un Global Search Dialog accesible.
- [x] **CA-03.** El diálogo enfoca el buscador al abrir y Escape permite cerrarlo.
- [x] **CA-04.** Las búsquedas recientes persisten con la key versionada y un máximo de seis elementos.
- [x] **CA-05.** Los recientes normalizan espacios, omiten vacíos y evitan duplicados.
- [x] **CA-06.** Se puede eliminar un reciente y limpiar el historial completo.
- [x] **CA-07.** El global search reutiliza `apiGetProducts`, aplica debounce y limita resultados rápidos.
- [x] **CA-08.** Loading usa una lista compacta de Skeleton sin bloquear todo el diálogo.
- [x] **CA-09.** Los estados vacío y error ofrecen acceso al catálogo sin convertirse en errores de página.
- [x] **CA-10.** “Ver todos” navega a `/productos?q=<texto>`, registra el término y cierra el diálogo.
- [x] **CA-11.** Seleccionar un resultado navega a la ruta real del producto y cierra el diálogo.
- [x] **CA-12.** Enter ejecuta la búsqueda general sin shortcuts ficticios.
- [x] **CA-13.** `/productos` muestra un único buscador local compacto junto al botón de filtros.
- [x] **CA-14.** El buscador local refleja `q` al llegar desde Global Search.
- [x] **CA-15.** Cambiar o limpiar el buscador local actualiza coherentemente `q` y los resultados.
- [x] **CA-16.** El bloque horizontal anterior se sustituye por un Sheet derecho de filtros.
- [x] **CA-17.** Categoría y rango de precio mantienen cambios temporales hasta aplicar.
- [x] **CA-18.** Cerrar el Sheet sin aplicar no altera los filtros vigentes.
- [x] **CA-19.** El botón muestra la cantidad de filtros activos sin contar `q`.
- [x] **CA-20.** El Sheet muestra el número actual de productos sin petición adicional.
- [x] **CA-21.** Solo se ofrecen categorías reales existentes y no se añade ordenación ficticia.
- [x] **CA-22.** La composición móvil funciona a 320, 375 y 768 px sin filtros permanentes ni overflow.
- [x] **CA-23.** La composición desktop funciona a 1024 y 1440 px sin cambiar el grid del catálogo.
- [x] **CA-24.** Global Search, Catalog Search y Filter Sheet funcionan en light y dark mode.
- [x] **CA-25.** No se modifican backend, ProductCard, grid, ancho del catálogo ni páginas fuera de alcance.
- [x] **CA-26.** `npm run lint` finaliza correctamente.
- [x] **CA-27.** `npm run build` finaliza correctamente.

## Fuera de alcance

Backend, nuevos contratos API, ordenación nueva, ProductCard, grid, ancho máximo del catálogo, Home, ProductDetail, Cart, Checkout, Admin, pricing, shipping, carrito, pagos y variantes.

## Validación

- Smoke funcional de Dialog, recientes, resultados, navegación, teclado y errores.
- Smoke funcional del input local, URL `q`, Sheet, estado temporal, filtros y contador.
- Revisión light/dark y responsive a 320, 375, 768, 1024 y 1440 px.
- `npm run lint`.
- `npm run build`.
