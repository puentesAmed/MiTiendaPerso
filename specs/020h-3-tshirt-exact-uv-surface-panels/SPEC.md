# SPEC-020H.3 — Tshirt Exact UV Surface Panels & Full Printable Coverage

## Estado

Implementada. Validación automática completada; validación visual delegada al usuario.

## Objetivo

Reemplazar la división editorial aproximada de SPEC-020H.2 por cuatro paneles independientes derivados de las caras e islas UV reales de `tshirt-web.glb`, garantizando que toda cara exterior declarada imprimible recibe exactamente un artwork y que el cuello permanece excluido.

## Alcance

- Determinar y documentar la causa estructural de los huecos de artwork.
- Derivar regiones exactas FRONT, BACK, LEFT SLEEVE y RIGHT SLEEVE mediante geometría, conectividad, material, orientación, posición y UV.
- Registrar cuatro vistas y cuatro PrintSurfaces normalizadas en `tshirt-basic-v1`.
- Generar guías/máscaras y fixtures de calibración desde cada panel real.
- Renderizar cuatro outputs transparentes e independientes.
- Crear overlays Three únicamente con las caras clasificadas de cada región, preservando UV y sin recargar el GLB al editar.
- Excluir explícitamente collar, interior y componentes técnicos no imprimibles.
- Migrar drafts anteriores conservando FRONT/BACK e inicializando ambas mangas vacías.
- Mantener color de variante, shading y comportamiento de taza.

## Fuera de alcance

- V1, Cart, Checkout, Order, Admin, backend y entrega protegida de assets.
- Sustitución de Fabric, Three.js o la arquitectura multiview.
- Reexportación del GLB salvo defecto de clasificación que no pueda corregirse limpiamente con overlays derivados.
- QA visual exhaustivo.

## Decisiones

- La fuente de verdad de cobertura es la clasificación de triángulos del GLB, no un rectángulo UV ni la proyección de cámara.
- Las mangas son paneles anatómicos independientes; no forman parte de FRONT/BACK.
- Una normal local no puede excluir por sí sola una cara conectada a un panel imprimible.
- Toda cara exterior analizada debe pertenecer a una única región imprimible o a una exclusión explícita.
- Los overlays conservan los materiales base por debajo para mantener color, normales, rugosidad e iluminación.

## Criterios de aceptación

- [x] Existen cuatro views y cuatro PrintSurfaces independientes.
- [x] FRONT y BACK contienen solo sus paneles de torso respectivos.
- [x] LEFT/RIGHT SLEEVE siguen la anatomía de la prenda y no la cámara.
- [x] Las caras curvas, laterales, plegadas y próximas a costuras del panel siguen cubiertas.
- [x] El cuello, interior y costuras técnicas declaradas no reciben artwork.
- [x] Ninguna cara exterior imprimible queda huérfana ni pertenece a dos regiones.
- [x] Las máscaras y fixtures se derivan de UV/geometría real.
- [x] ArtworkRenderer produce cuatro canvases con alpha transparente.
- [x] Three actualiza cada panel sin recargar el GLB.
- [x] Blanco/negro y taza no regresan.
- [x] Drafts de la revisión anterior preservan FRONT/BACK y añaden mangas vacías.
- [x] Tests localizados, lint, build y `git diff --check` pasan.

## Clasificación implementada

La clasificación recorre componentes conectados y asigna componentes exteriores completos dentro de las islas UV de cada panel. La normal solo distingue la capa exterior de su duplicado interior a nivel de componente; nunca recorta caras individuales por orientación. El informe reproducible clasifica las 120.000 caras del GLB exactamente una vez, sin huérfanas ni solapes. Collar, interior, costuras con UV degenerada y detalles técnicos quedan como exclusiones explícitas.

La manga izquierda usa el lado anatómico de la prenda (`model +X`) y la derecha `model -X`. El GLB original permanece sin cambios.

## Validación manual delegada

El usuario validará visualmente cobertura FRONT/BACK en curvas y pliegues, independencia de mangas, exclusión del cuello, correspondencia 2D/3D, blanco/negro, persistencia del draft, móvil 375 px y regresión de taza.
