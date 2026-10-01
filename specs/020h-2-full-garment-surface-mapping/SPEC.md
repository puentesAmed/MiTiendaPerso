# SPEC-020H.2 — Full Garment Surface Mapping & 2D/3D Alignment

## Estado

Implementada. Validación automática completada; validación visual delegada al usuario.

## Objetivo

Sustituir la presentación rectangular de pecho de `tshirt-basic-v1` por superficies editoriales FRONT/BACK de prenda completa, con máscara de torso y mangas, exclusión del cuello y correspondencia reproducible entre coordenadas editoriales, atlas UV y preview 3D.

## Alcance

- Derivar la calibración editorial desde la geometría/UV/materiales del GLB preparado, sin modificarlo salvo imposibilidad demostrada.
- Extender declarativamente PrintSurface/presentation con máscara y regiones transformables.
- Mantener FRONT/BACK independientes y las coordenadas normalizadas del DesignDocument.
- Recortar artwork por máscara tanto en presentación como en composición 3D.
- Aplicar el color de variante a todo el grupo de materiales de tejido.
- Usar overlay transparente para camiseta y conservar la composición blanca opaca de taza.
- Añadir fixture técnico y helpers matemáticos de mapping multi-región.
- Mantener el workspace compacto y añadir debug opcional, oculto por defecto.

## Fuera de alcance

- Cambios en V1, backend, Cart, Order, Admin o entrega protegida de assets.
- Sustitución del GLB.
- Cambios del DesignDocument salvo necesidad demostrada.
- QA visual exhaustivo.

## Condiciones de aceptación

- [x] FRONT y BACK contienen regiones de torso y ambas mangas, y excluyen collar/interior.
- [x] Las regiones editoriales y UV provienen de una calibración reproducible del modelo existente.
- [x] Los transforms editorial → región → atlas/UV tienen tests matemáticos.
- [x] Fabric presenta la prenda completa sin el rectángulo pequeño de pecho.
- [x] ArtworkRenderer conserva alpha fuera de elementos para garment y no exporta guía/fondo.
- [x] Three compone overlay transparente sobre el color base sin recargar el GLB.
- [x] Blanco y negro alcanzan todos los materiales declarados del tejido.
- [x] Taza, DesignDocument, resoluciones lógicas y lazy loading no regresan.
- [x] Tests localizados, lint, build y `git diff --check` pasan.

## Calibración implementada

`frontend/scripts/derive-tshirt-surface-calibration.mjs` carga el GLB real y deriva proyección XY, siluetas, collar, bounds UV, correlaciones y partición de mangas. La inspección confirmó que el pipeline de SPEC-020G asignó únicamente los torsos a materiales imprimibles y conservó ambas mangas en `TShirtFabric`.

Cada superficie editorial contiene tres regiones: torso, manga izquierda y manga derecha. Las mangas comparten islas UV por prenda, por lo que FRONT/BACK usan mitades no solapadas calculadas desde la correlación medida entre profundidad y U. El collar se deriva de sus islas y se resta de la máscara.

Three mantiene materiales base coloreados sin el mapa de albedo gris original y añade meshes overlay transparentes que reutilizan la geometría/UV. La taza conserva composición `opaque-base`; la camiseta usa `transparent-overlay`.

El modo `?debugGarmentMapping=1` muestra regiones y nombres editoriales; permanece oculto por defecto.

## Validación manual delegada

El usuario validará placement FRONT/BACK en torso y mangas, exclusión del cuello, alineación visual 2D/3D, blanco/negro, PNG transparente, workspace, móvil 375 px y regresión de taza.
