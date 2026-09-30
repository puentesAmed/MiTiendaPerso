# SPEC-020G — T-Shirt 3D Customization PoC

## Estado

Cumplida — incluida rectificación de PrintSurface FRONT/BACK.

## Objetivo

Validar de forma aislada y reproducible que el artwork transparente producido conceptualmente por el personalizador 2D puede componerse de forma independiente sobre zonas FRONT y BACK de una camiseta 3D real, conservando material textil, UV y geometría esencial en un GLB optimizado para web.

## Fuente canónica protegida

`D:/DESARROLLOS PROPIOS/miTiendaPersonalizar/mug/tshirt`

Los archivos originales, incluido `OBJ.obj`, `OBJ.mtl`, texturas/mapas y `tshirt-original.blend`, son de solo lectura. Los derivados se generan exclusivamente en `scripts/`, `export/` y `poc/` dentro de ese directorio.

## Alcance

- Inventariar OBJ, MTL, texturas, materiales, meshes, UV, componentes, geometría, dimensiones, orientación y tamaños.
- Detectar islas UV y clasificar FRONT, BACK, mangas y detalles cuando la geometría lo permita; documentar cualquier ambigüedad.
- Inspeccionar y reutilizar de forma localizada convenciones, scripts y runtime 3D existentes.
- Crear un pipeline Blender headless que importe la fuente sin modificarla, conserve UV y normales, reduzca geometría y exporte `export/tshirt-web.glb`.
- Generar métricas antes/después y validación estructural GLB.
- Crear una estrategia reproducible de atlas/composición que aplique diseños FRONT/BACK solo a sus zonas calibradas y preserve la textura base.
- Crear una PoC visual aislada con rotación, vistas frontal/trasera, iluminación y sustitución futura de los PNG de prueba.
- Documentar regeneración, ejecución, calibración, composición y limitaciones.

## Estrategia condicionada a inspección

Se priorizará una composición UV sobre atlas mediante canvas/textura derivada cuando las islas FRONT/BACK puedan aislarse reproduciblemente. No se regenerará el UV. Si la clasificación automática no es inequívoca, el pipeline conservará un manifiesto de calibración explícito y verificable en lugar de adivinar semántica.

## Fuera de alcance

- Integración con Product Designer productivo o sincronización en tiempo real.
- Carrito, checkout, pedidos, catálogo o backend productivo.
- Server-side mockup definitivo, CDN, tallas, colores u otros modelos.
- Cambios en mugs u otros productos.
- React Three Fiber o dependencias nuevas salvo evidencia imprescindible.
- Unwrap o sobrescritura de assets originales.

## Entregables

1. Informe de inspección y clasificación UV.
2. Scripts reproducibles de inspección, preparación, composición y validación.
3. Modelo optimizado y `export/tshirt-web.glb`.
4. Diseños FRONT/BACK de prueba y atlas/material derivados.
5. PoC web aislada.
6. Documentación y métricas comparativas.

## Criterios de aceptación

1. Hashes de todos los originales permanecen inalterados.
2. El pipeline no ejecuta unwrap y conserva coordenadas UV.
3. El GLB se genera, carga y contiene geometría, normales, materiales y UV válidos.
4. Los triángulos se reducen significativamente sin invalidar silueta, bounds o componentes esenciales.
5. FRONT/BACK se identifican o calibran mediante un manifiesto reproducible.
6. FRONT recibe exclusivamente su diseño; BACK, mangas y cuello no lo reciben.
7. La arquitectura permite un diseño BACK independiente.
8. El material base sigue siendo perceptible.
9. La PoC permite rotar y alternar presentación frontal/trasera.
10. La PoC queda aislada y no modifica flujos productivos.
11. Se documentan comandos y métricas original/optimizado.

## Validación permitida

- Blender CLI/headless.
- Parseo OBJ/MTL y análisis UV localizado.
- Carga GLB mediante `GLTFLoader` o validador equivalente ya instalado.
- Tests específicos de composición/calibración.
- Build/lint únicamente si la PoC reutiliza el frontend del repositorio.
- `git diff --check` para cambios dentro del repositorio.

## Validación manual pendiente del usuario

- Silueta tras decimación.
- Correspondencia visual exacta FRONT/BACK.
- Ausencia de bleed en mangas/cuello/cara opuesta.
- Calidad del tejido, pliegues, rotación e iluminación.

## Resultado

- Fuente inspeccionada: 468.065 vértices y 831.114 triángulos en un mesh con `UVMap`.
- FRONT/BACK calibrados mediante las islas dominantes de torso y su normal exterior; interior, mangas, cuello y detalles permanecen en material base.
- GLB derivado: 79.227 vértices, 119.999 triángulos y 8.168.260 bytes.
- `GLTFLoader` validó geometría, UV, bounds verticales y materiales `TShirtFabric`, `TShirtFrontPrintable` y `TShirtBackPrintable`.
- Los 25 archivos fuente mantienen idénticos tamaño y SHA-256 antes/después.
- Derivados aislados en `tshirt/scripts`, `tshirt/export` y `tshirt/poc`; sin integración productiva.

## Rectificación posterior a validación visual

La PoC debe reemplazar el placement fijo por dos superficies editoriales normalizadas e independientes:

- `FRONT`: coordenadas X/Y normalizadas `0..1`, escala y rotación.
- `BACK`: coordenadas X/Y normalizadas `0..1`, escala y rotación.

Cada canvas editorial mantiene fondo transparente y se compone después sobre el atlas base, limitado al material y región UV de su torso. El source PNG no se recorta para simular movimiento. Mangas, cuello, laterales, geometría, UV y GLB permanecen fuera de esta rectificación.

### Criterios adicionales

1. FRONT y BACK permiten mover, escalar y rotar artwork de forma independiente.
2. Las superficies normalizadas son amplias y continuas dentro de las islas de torso correspondientes.
3. No existe un círculo, bbox o placement fijo del artwork.
4. El canvas editorial fuera del artwork permanece transparente.
5. La composición conserva diffuse base, normal, roughness y shading.
6. Las islas de mangas, cuello y detalles quedan documentadas y excluidas.
7. Tests localizados validan transformaciones, independencia y exclusión UV.
8. No existe integración con Product Designer V2 ni cambios productivos.

### Resultado de la rectificación

- FRONT y BACK usan canvas editoriales transparentes de 1024 × 1024 con X/Y normalizados, escala y rotación.
- Las superficies cubren aproximadamente el 88 % del ancho y 87 % del alto del bbox UV de cada torso, con insets relativos y sin medidas físicas inventadas.
- La composición mantiene estados, materiales y texturas independientes por cara.
- El atlas base se compone antes del artwork; normal y roughness del GLB permanecen intactos.
- Se documentaron torso, mangas, cuello y 3.294 microislas de costuras/bordes.
- Seis tests localizados validan placement, aspect ratio, independencia, bounds, exclusión UV y activación explícita del debug.

### Corrección de asset y separación debug/runtime

- La selección anterior por rectángulo UV + normal incluía componentes desconectados: 11 candidatos FRONT y 14 BACK en la fuente preparada.
- El pipeline conserva ahora únicamente el componente conectado principal de cada torso y rechaza la exportación si una superficie imprimible queda fragmentada.
- El GLB corregido contiene exactamente un componente en `TShirtFrontPrintable` y uno en `TShirtBackPrintable`.
- El runtime normal inicia ambos canvas editoriales transparentes, sin fixtures ni overlays visibles.
- El modo técnico se activa exclusivamente mediante `?debugPrintSurfaces=1`.
