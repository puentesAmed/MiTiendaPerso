# SPEC-020H.5 — Tshirt Editor Visual Proportion Polish

Estado: Implementada

## Objetivo

Mejorar exclusivamente la proporción visual de las guías editoriales de camiseta y el ajuste inicial de sus vistas, sin alterar el mapping técnico 2D → UV → 3D.

## Alcance

- Rectificar los laterales y el bajo de las guías FRONT/BACK.
- Presentar sisas curvas y cuellos abiertos por el borde superior como una plantilla de confección convencional.
- Conservar cuellos FRONT/BACK diferentes.
- Mantener la máscara técnica independiente e inalterada.
- Garantizar estructuralmente que la guía editorial contiene la máscara editable.
- Declarar un `displayFit` por vista y reducir el fit de ambas mangas.
- Restablecer zoom y pan al cambiar de vista para aplicar su fit editorial.
- Alinear el marco editorial FRONT con la proyección ortográfica del panel imprimible sin cambiar coordenadas ni UV.
- Añadir pruebas localizadas de presentación, coordenadas y regresión.

## Fuera de alcance

- UV, clasificación de caras, `ArtworkRenderer`, overlays Three.js y GLB.
- `DesignDocument`, esquema de drafts y `Product3DProfile`.
- Colores, V1, backend, Cart, Order y Admin.

## Criterios de aceptación

- [x] FRONT y BACK presentan un torso visualmente recto y un bajo razonablemente horizontal.
- [x] FRONT y BACK presentan sisas curvas y el cuello no aparece como un hueco flotante.
- [x] Los cuellos FRONT y BACK siguen siendo distintos.
- [x] La máscara editable queda contenida por la guía editorial y no cambia.
- [x] Las mangas usan el mismo espacio lógico 1024 × 525 y coordenadas normalizadas.
- [x] Las mangas ocupan como máximo aproximadamente el 72 % del espacio disponible al 100 %.
- [x] FRONT/BACK conservan aproximadamente su tamaño actual.
- [x] `Ajustar` y el cambio de vista recuperan el fit declarativo de la vista activa.
- [x] La posición percibida en FRONT 2D usa el mismo marco proyectado que la vista frontal 3D.
- [x] No hay regresiones en mapping Three.js, `ArtworkRenderer`, mobile ni taza.
- [x] Lint, build y `git diff --check` pasan.

## Validación manual delegada

El usuario validará FRONT, BACK, ambas mangas, artwork en las cuatro vistas, `Ajustar`, mobile 375 px y taza.
