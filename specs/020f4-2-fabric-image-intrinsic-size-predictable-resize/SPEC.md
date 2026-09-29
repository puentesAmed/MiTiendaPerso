# SPEC-020F.4.2 — Fabric Image Intrinsic Size & Predictable Resize

## Estado

Implementada (2026-09-29). Validación manual del usuario pendiente.

## Objetivo

Separar explícitamente el tamaño visual normalizado de una imagen en `DesignDocument` de sus dimensiones intrínsecas y escala runtime en Fabric 7.4, eliminando crop, zonas vacías y drift durante resize/reconcile.

## Alcance

- Verificar la semántica real de `FabricImage.width`, `height`, `scaleX`, `scaleY`, `getScaledWidth()`, `getScaledHeight()` y crop.
- Conservar `widthPx`/`heightPx` del asset como dimensiones fuente.
- Mantener `domain.width`/`domain.height` como tamaño visual normalizado.
- Derivar `FabricImage.scaleX/scaleY` runtime desde tamaño visual deseado dividido por tamaño intrínseco.
- Convertir el tamaño visual final de Fabric a dominio sin persistir escalas Fabric.
- Preservar aspect ratio en pixels de canvas y corner resize uniforme.
- Revalidar fit inicial, `Ajustar al área`, imágenes rotadas, recovery y `ArtworkRenderer`.
- Añadir round-trip bloqueante para imágenes pequeñas y grandes.

## Fuera de alcance

- Cambios de schema o migración de drafts salvo evidencia imprescindible.
- Herramientas de crop, `cropX`, `cropY` o mutación del rectángulo fuente.
- Mobile salvo una regresión directa.
- Three.js, GLB, UV, `Product3DProfile`, backend o ecommerce.
- Nuevas dependencias.
- QA visual manual por Codex.

## Criterios de aceptación

1. `FabricImage.width/height` permanecen iguales a las dimensiones intrínsecas del asset durante reconcile y resize.
2. El tamaño visual se obtiene exclusivamente mediante `scaleX/scaleY` runtime.
3. Resize 2x y 0.5x modifica bitmap y bounding box en la misma proporción, sin crop.
4. El tamaño final persistido vuelve a producir exactamente el mismo tamaño renderizado tras reconcile.
5. El round-trip pasa para imágenes 200×400 y 4000×3000.
6. Landscape, portrait y square mantienen contain y ratio en pixels de canvas.
7. `Ajustar al área` solo cambia bounds de dominio y rotación; no cambia dimensiones intrínsecas.
8. `ArtworkRenderer` sigue usando únicamente `DesignDocument`.

## Validación

- Tests localizados de images, `FabricAdapter`, transforms y acciones de documento.
- Tests round-trip y bounding box vs bitmap.
- Test localizado de `ArtworkRenderer`.
- Lint, build y `git diff --check`.

## Causa raíz confirmada

En Fabric 7.4, `FabricImage.setElement()` inicializa `width/height` desde el source y `_renderFill()` los usa para calcular `sW/sH`, es decir, la región leída del bitmap. SPEC-020F.4.1 reemplazaba esos valores intrínsecos por el tamaño visual del canvas. Cuando el valor era menor se convertía implícitamente en crop; cuando era mayor excedía el source y dejaba contenido vacío, mientras el bounding box seguía representando el tamaño mutado.

## Resultado

- `FabricImage.width/height` permanecen iguales a `getOriginalSize()`.
- El tamaño visual normalizado se convierte a pixels de canvas y después a `scaleX/scaleY` runtime.
- El transform final usa tamaño intrínseco por escala uniforme y persiste exclusivamente `width/height` de dominio con `scale={1,1}`.
- Reconcile reproduce el mismo rendered size después de cada commit sin mutar `cropX/cropY`.
- Los tests con `FabricImage` real cubren 200×400, 4000×3000, resize 2x/0.5x, bounding box, rotación y round-trip.
- Fit inicial y `Ajustar al área` siguen usando metadata intrínseca y solo cambian bounds normalizados.
- `ArtworkRenderer` conserva el flujo `DesignDocument → FabricAdapter` y no depende de escalas persistidas.
