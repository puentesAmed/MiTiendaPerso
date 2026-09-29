# SPEC-020F.2 — Three.js Visual Quality & Mug Preview Refinement

## Estado

Implementación automática completada (2026-09-29). Validación visual final pendiente del usuario.

## Objetivo

Refinar el fixture técnico de taza y su presentación en Product Designer V2 para que el preview 3D muestre el artwork legible, centrado y curvado sobre una taza cerámica blanca geométricamente coherente.

Three.js continúa siendo el preview principal para la taza. Design y Mockup se conservan sin cambios funcionales y el mockup 2D permanece como fallback técnico existente.

## Alcance

- Corregir orientación vertical, sentido horizontal y seam de los UVs del cuerpo imprimible.
- Mantener el binding limitado a `MugBody` / `PrintableSurface`.
- Refinar cuerpo, borde, interior, fondo y asa del GLB técnico generado localmente.
- Evitar que el asa atraviese la cavidad o el cuerpo salvo el solape mínimo de sus dos uniones.
- Unificar los materiales en una apariencia base de cerámica blanca no metálica.
- Ajustar la cámara inicial para priorizar el frente imprimible y mantener el asa reconocible.
- Limitar rotación vertical y zoom a vistas útiles del producto.
- Añadir regresiones automáticas localizadas sobre manifest, GLB, textura y cámara.

## Fuera de alcance

- Product Designer V1.
- Sustituir Three.js o introducir React Three Fiber.
- Modelos productivos, assets externos, HDRI o nuevas dependencias.
- Cambios en `DesignDocument`, historial, draft, Design o Mockup.
- Backend, Cart, Checkout, Order, Admin o ZIP.
- QA visual exhaustivo automatizado o aprobación artística final.

## Diseño técnico

### Modelo

El script determinista conserva `mug-development-v1.glb` y sus nombres públicos. `MugBody` sigue siendo el único mesh imprimible. El modelo incorpora piezas cerámicas separadas para borde, interior y base, y un asa curva exterior con dos uniones controladas.

El seam del cilindro queda orientado hacia la parte posterior. El centro horizontal del artwork corresponde al frente de la taza y el eje vertical mantiene arriba/abajo al usar la textura canvas.

### Textura y material

`CanvasTexture` usa sRGB, fondo blanco y la orientación declarada en el manifest. No se altera el canvas fuente ni `DesignDocument`. El material imprimible y los detalles usan base blanca, rugosidad cerámica y metalness cero.

### Cámara y controles

La posición inicial es frontal con un desplazamiento lateral y vertical leve para enseñar volumen y asa sin ocultar el artwork. OrbitControls conserva rotate y zoom, bloquea pan y restringe distancia y ángulo polar a vistas útiles. Reset restaura exactamente esta vista.

### Arquitectura y carga

Se mantienen registry, manifest, adapter, `ThreeProductPreview`, runtime dinámico y `React.lazy()`. Ningún import estático de Three se añade a rutas iniciales del ecommerce.

## Criterios de aceptación

1. Existe esta SPEC antes de los cambios de implementación.
2. Al abrir 3D, la taza parte de una vista frontal útil con el asa reconocible.
3. El artwork no aparece invertido vertical ni horizontalmente.
4. El centro del artwork se presenta en el frente y el seam queda detrás.
5. El artwork usa los UVs del cuerpo curvo; no existe plano flotante.
6. El binding afecta solo a `MugBody` / `PrintableSurface`.
7. El asa permanece fuera de la cavidad y solo solapa el cuerpo en sus uniones.
8. Cuerpo, borde, interior y base forman una silueta de taza coherente desde varios ángulos.
9. Todos los materiales visibles parten de blanco cerámico, con metalness cero.
10. La rotación vertical y el zoom están limitados a rangos útiles.
11. Reset recupera la cámara inicial declarada.
12. Las actualizaciones de diseño reemplazan la textura sin recargar el GLB.
13. Design → 3D → Design no modifica `DesignDocument`.
14. Design y Mockup conservan su comportamiento existente.
15. Three y sus addons continúan completamente lazy-loaded.
16. No se añaden dependencias.
17. No hay cambios en V1, backend ni flujos ecommerce fuera de alcance.
18. Tests localizados, lint y build pasan.

## Validación

Automática: tests del registry, adapter, modelo generado y runtime lazy; lint y build.

Manual por el usuario: frente, legibilidad, curvatura, asa, rotación, reset y mobile a 375 px.

