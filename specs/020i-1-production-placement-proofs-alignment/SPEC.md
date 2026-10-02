# SPEC-020I.1 — Production Placement Proofs & 2D/3D Alignment Contract

## Estado

Activa. Extensión localizada de SPEC-020I sin regeneración histórica.

## Problema

El artwork productivo V2 es correcto para imprimir, pero no comunica al operario la colocación editorial escogida. Deben congelarse, desde la misma fuente de dominio, tres artefactos distintos: artwork limpio, prueba visual y metadata normalizada.

## Fuente única y contrato de alineación

`DesignDocument.views[viewId].elements` conserva `x`, `y`, `width`, `height`, `rotation` y `zIndex` normalizados. El contrato compartido es:

1. normalizado → píxeles de `PrintSurface` para artwork y proof;
2. normalizado → UV mediante calibration solo en Three;
3. `flipU`, `flipV`, mirror, atlas y offsets técnicos nunca se aplican al proof editorial.

No se admiten screenshots Fabric/DOM/Three, viewport transforms, offsets paralelos ni coordenadas físicas inventadas.

## Diseño

### PlacementProofRenderer

Renderer frontend independiente de React. Recibe `DesignDocument`, `ProductTemplate`, view y `assetRegistry`. Usa el artwork derivado del documento y lo compone, sin transformación adicional, sobre una guía editorial declarativa:

- camiseta: reutiliza `view.editorPresentation.guide`, mask y orientación de `tshirtSurfaceCalibration`;
- taza: representa el wrap completo y sus referencias seam/centro/orientación;
- resolución de proof declarativa y separada de la productiva;
- labels técnicos fuera del artwork, sin datos personales ni medidas físicas.

El proof se sube junto al artwork durante `prepareProductionHandoff`; backend valida PNG y lo congela bajo key determinista.

### Placement metadata

Backend genera JSON desde el `DesignDocument` ya validado y congelado, nunca desde payload JSON adicional. Contiene schema, template/revision, view/surface, resolución lógica, campos físicos nullable y elementos de dominio ordenados por `zIndex`. Imágenes referencian `assetId`; texto conserva solo propiedades técnicas necesarias y no duplica datos ajenos al documento.

## Persistencia

Por superficie V2 nueva:

- `customizations/{id}/production/{viewId}.png`
- `customizations/{id}/proofs/{viewId}-placement.png`
- `customizations/{id}/placement/{viewId}.json`
- preview existente sin cambios.

`productionSurfaces[]` incorpora `placementProof` y `placementMetadata`. Ausencia en V2 históricos y legacy es válida.

## Bundle y manifest

ZIP V2 incluye `production/`, `proofs/`, `placement/`, `previews/`, `manifest.json` y `design-document.json`. Manifest surface añade `placementProofFile` y `placementMetadataFile`; bundle incrementa versión. Los filenames y keys son deterministas e idempotentes.

## API Admin

- `GET /api/customizations/:id/surfaces/:surfaceId/proof`
- `GET /api/customizations/:id/surfaces/:surfaceId/placement`

Ambos requieren auth/admin, resuelven exclusivamente keys almacenadas y no aceptan paths del cliente.

Admin muestra por superficie preview, dimensiones, archivo productivo, proof en dialog y descarga de placement JSON. Si faltan artefactos, omite acciones sin fallar.

## Compatibilidad e inmutabilidad

- Customization V1 y ZIP legacy permanecen sin cambios.
- V2 previo sin proof/placement sigue visible.
- Admin nunca regenera artefactos.
- Cambios posteriores en template/calibration/código no alteran bundles existentes.
- El retry de bundle reutiliza artefactos congelados y nombres deterministas.

## Criterios de aceptación

- Taza produce wrap artwork/proof/JSON y referencias de orientación.
- Camiseta produce cuatro sets independientes sin intercambio de mangas.
- BACK proof no aplica el mirror técnico UV.
- Rotation y z-order proceden directamente del documento.
- Metadata no contiene Fabric, viewport, matrices, Object URLs, Data URLs ni storage keys.
- Manifest, ZIP, endpoints y Admin exponen los nuevos artefactos de forma segura.
- Tests matemáticos verifican el mismo normalizado→píxel para artwork y proof; test estructural mantiene Three ligado a calibration.
- Regresiones SPEC-020I y legacy continúan pasando.

## Fuera de alcance

Medidas físicas, DPI, regeneración histórica, editor Admin, cambios de cámara/modelo Three, nuevos proveedores de storage y mockups fotográficos.
