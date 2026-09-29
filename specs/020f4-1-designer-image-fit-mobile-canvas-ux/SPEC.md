# SPEC-020F.4.1 — Designer Image Fit & Mobile Canvas UX

## Estado

Implementada (2026-09-29). Validación manual del usuario pendiente.

## Objetivo

Hacer predecible la inserción y transformación de imágenes en Product Designer V2 y mantener el área editable claramente usable a 375 px, sin alterar las coordenadas normalizadas de `DesignDocument` ni el preview 3D.

## Alcance

- Aplicar `contain` inicial a imágenes usando sus dimensiones naturales y como máximo el 75% de cada eje del `PrintSurface`.
- No ampliar imágenes pequeñas de forma agresiva.
- Centrar la imagen insertada y preservar su relación de aspecto.
- Normalizar transforms Fabric una sola vez desde los bounds visuales finales.
- Mantener resize uniforme por defecto.
- Evitar que una imagen termine completamente inaccesible sin impedir composiciones parciales en borde.
- Añadir `Ajustar al área` únicamente si encaja en las propiedades existentes sin ampliar arquitectura.
- Separar toolbar, labels, hints y controles del área editable en layout móvil.
- Mantener el warning de overflow sin provocar cambios relevantes de layout.
- Añadir regresiones localizadas para fit, ratio, normalización, recuperación y estructura móvil.

## Fuera de alcance

- Three.js, GLB, `Product3DProfile`, UV y contrato `PrintSurface`.
- Product Designer V1.
- Backend, Cart, Checkout, Order, Admin y ZIP.
- Cambios de schema no demostrados.
- Reescalado físico o compresión de blobs.
- Reescritura de assets, ObjectURL, IndexedDB o autosave.
- Nuevas dependencias.
- QA visual exhaustivo por Codex.

## Criterios de aceptación

1. Imágenes landscape, portrait y square entran completas, centradas y con ratio preservado.
2. Una imagen pequeña no se amplía por encima de su tamaño documental razonable.
3. Un resize uniforme 2x produce bounds de dominio 2x, sin doble escala ni inversión.
4. Los controles de esquina no introducen `scaleX`/`scaleY` independientes en el dominio.
5. Tras finalizar un transform, una fracción mínima de la imagen sigue accesible.
6. El warning de overflow se conserva sin layout shift relevante.
7. A 375 px, toolbar y controles quedan fuera del `PrintSurface`; el canvas conserva su aspect ratio y usa el ancho disponible.
8. Design → 3D continúa reflejando el mismo `DesignDocument` sin cambios en `ArtworkRenderer` ni `ThreePreviewAdapter`.

## Validación

- Tests localizados de image fit y transforms Fabric.
- Test estructural del layout móvil.
- Tests V2 afectados.
- Lint.
- Build.
- `git diff --check`.

## Resultado

- El fit inicial usa dimensiones naturales y la resolución editorial del `PrintSurface`, con `contain` máximo del 75% y sin ampliar assets pequeños.
- Fabric usa `getObjectScaling()` para excluir zoom y retina de la persistencia; el dominio absorbe el transform una sola vez en `width`/`height` y restablece `scale` a 1.
- Las imágenes muestran únicamente controles de esquina y el transform final aplica escala uniforme.
- La recuperación conserva al menos el 12% del elemento o el 4% del área, permitiendo overflow parcial.
- Propiedades ofrece `Ajustar al área`, que centra, contiene, preserva ratio y restablece la rotación.
- La toolbar móvil permanece en flujo fuera del canvas; labels e instrucciones quedan fuera del `PrintSurface` y el warning reserva altura estable.
- `ArtworkRenderer`, Three.js, GLB, UV, `Product3DProfile` y el contrato `PrintSurface` no se modificaron.
