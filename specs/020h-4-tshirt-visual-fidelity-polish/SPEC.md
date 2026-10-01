# SPEC-020H.4 — Tshirt Visual Fidelity Polish

## Estado

Implementada. Validación automática completada; validación visual delegada al usuario.

## Objetivo

Eliminar la visibilidad del artwork desde el interior de la camiseta, verificar la orientación exterior de los overlays y mejorar la correspondencia perceptiva 2D/3D mediante guías FRONT/BACK derivadas del contorno y cuello reales del GLB.

## Alcance

- Auditar winding, normales y pertenencia exterior de cada triángulo overlay.
- Forzar culling exterior con `FrontSide`, mantener `depthTest` y usar únicamente el offset mínimo necesario contra z-fighting.
- Mantener interior, cuello, costuras y detalles sin artwork.
- Verificar que cada transformación UV se aplica una sola vez y que BACK no queda espejado.
- Derivar contorno exterior, abertura de cuello y silueta de panel FRONT/BACK desde `tshirt-web.glb`.
- Separar guía de prenda, máscara imprimible y artwork.
- Extender fixtures por panel con marcas pequeñas de calibración.
- Mantener cuatro vistas, DesignDocument, drafts, color, mobile, taza y lazy loading.

## Fuera de alcance

- V1, Cart, Checkout, Order, Admin, backend y entrega protegida de assets.
- Cambios del GLB salvo defecto estructural demostrado.
- Cambios de arquitectura o schema de DesignDocument/draft.
- QA visual exhaustivo.

## Criterios de aceptación

- [x] Todos los triángulos overlay proceden de componentes exteriores y conservan winding/normales consistentes.
- [x] Overlay usa `FrontSide`, `depthTest: true`, alpha estándar y offset mínimo.
- [x] El interior conserva exclusivamente el tejido base.
- [x] No existen flips, mirror, offset, repeat o rotation duplicados.
- [x] BACK conserva orientación legible.
- [x] FRONT y BACK tienen contornos de cuello reales, distintos cuando el modelo así lo define.
- [x] La guía procede de calibration y permanece separada de la máscara imprimible.
- [x] Fixtures FRONT/BACK y mangas contienen las marcas requeridas.
- [x] Cuatro vistas, colores, ArtworkRenderer, taza y lazy loading no regresan.
- [x] Tests localizados, lint, build y `git diff --check` pasan.

## Diagnóstico y resolución

Los materiales fuente del GLB declaran `DoubleSide`; el overlay heredaba esa propiedad al clonar el material y por ello era visible desde dentro. Los overlays derivados usan ahora `FrontSide`, `depthTest: true`, blending normal, `depthWrite: false` y un offset coplanar de una unidad sin desplazar físicamente la geometría.

La validación detectó dos triángulos FRONT y veinticinco BACK cuyo winding no coincidía con sus normales. Solo sus índices derivados se invierten al construir el overlay; el GLB permanece intacto. El overlay resultante tiene cero inconsistencias.

Las guías FRONT/BACK separan contorno proyectado, cuello y máscara UV. Los dos cuellos se derivan por separado de las islas reales del collar y se simplifican de forma conservadora.

## Validación manual delegada

El usuario validará interior/exterior, cuellos FRONT/BACK, alineación de marcas, mangas, PNG transparente, blanco/negro, móvil 375 px y taza.
