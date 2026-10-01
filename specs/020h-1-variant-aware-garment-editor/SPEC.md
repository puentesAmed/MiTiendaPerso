# SPEC-020H.1 — Variant-Aware Garment Editor & Compact Workspace

## Estado

Implementada. Validación automática completada; validación visual delegada al usuario.

## Objetivo

Representar declarativamente la prenda completa y el color de variante alrededor de la PrintSurface de Product Designer V2, manteniendo el artwork, sus coordenadas normalizadas y su exportación sin cambios.

## Alcance

- Resolver `colorId → label/baseColor` desde una única configuración compartida por variante, guía editorial y perfil Three.
- Añadir a `tshirt-basic-v1` una presentación editorial FRONT/BACK con guía vectorial ligera y posición normalizada de la PrintSurface.
- Renderizar la guía fuera de Fabric, sin interacción, historial, autosave ni exportación.
- Encajar guía y PrintSurface en un workspace compacto y adaptable al viewport.
- Mantener la resolución lógica `754 × 1024` y `747 × 1024` y las coordenadas normalizadas existentes.
- Mantener la taza con su presentación rectangular actual.

## Fuera de alcance

- DesignDocument, UV, GLB y bindings FRONT/BACK.
- ArtworkRenderer y su salida.
- Draft schema.
- Designer V1, backend, Cart, Order y Admin.
- QA visual exhaustivo.

## Decisiones

- `editorPresentation` pertenece al ProductTemplate y solo describe presentación editorial, nunca UV ni geometría persistida.
- La guía usa un SVG interno genérico controlado por configuración; no utiliza assets externos.
- Fabric conserva un canvas limitado exactamente a la PrintSurface. La guía es una capa DOM hermana con `pointer-events: none`.
- El tamaño lógico permanece en PrintSurface y el tamaño visible se deriva del contenedor mediante CSS responsivo.
- El ajuste a `100%` restablece exclusivamente el viewport interno de Fabric; la guía completa permanece siempre encajada por el layout.

## Criterios de aceptación

- [x] Blanco y negro resuelven el mismo `baseColor` para guía y material Three.
- [x] FRONT y BACK presentan siluetas diferenciadas y su PrintSurface declarativamente posicionada sobre el torso.
- [x] La guía no forma parte de Fabric, DesignDocument, history, autosave ni ArtworkRenderer.
- [x] La PrintSurface sigue usando coordenadas normalizadas y resolución lógica sin cambios.
- [x] La guía completa cabe en el workspace sin scroll horizontal y con altura ligada al viewport.
- [x] El contraste de borde y controles sigue siendo legible sobre prenda negra.
- [x] El cambio de color actualiza guía y Three sin recargar el GLB ni alterar artwork.
- [x] La taza conserva su editor y preview actuales.
- [x] Tests localizados, lint, build y `git diff --check` pasan.

## Validación manual delegada

El usuario validará blanco, negro, contexto de colocación, Trasera independiente, workspace desktop, zoom, móvil 375 px, exclusión de la guía en 3D/exportación y regresión de taza.
