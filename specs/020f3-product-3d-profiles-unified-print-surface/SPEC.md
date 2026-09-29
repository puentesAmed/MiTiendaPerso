# SPEC-020F.3 — Product 3D Profiles & Unified Print Surface

## Estado

Implementación automática completada (2026-09-29). Validación visual pendiente del usuario.

## Objetivo

Establecer `PrintSurface` como contrato geométrico único entre Designer V2, Fabric, ArtworkRenderer y el binding UV de Three.js, e introducir `Product3DProfile` como configuración versionada e independiente de `ProductTemplate`.

Arquitectura:

`Product → ProductTemplate → PrintSurface → Designer 2D / Product3DProfile → GLB → UV binding`.

## Alcance

- Contratos y validadores versionados para `PrintSurface` y `Product3DProfile`.
- Registro controlado de perfiles y assets 3D.
- Migración de `mug-ceramic-standard-v1` al contrato unificado.
- Coordenadas normalizadas, transformaciones puras y round-trip.
- Viewport 2D y export de artwork derivados del mismo `PrintSurface`.
- UV mapping declarativo con semántica de frente y seam.
- Fixture técnico de calibración usado solo en tests/desarrollo.
- Metadata opcional de referencias, procedencia, dimensiones y estado del modelo.
- Variantes de material declarativas preparadas, sin reglas de impresión.
- Compatibilidad localizada con templates 2D legacy durante la migración progresiva.

## Fuera de alcance

- Product Designer V1.
- Cart, Checkout, Order, Admin, backend o ZIP.
- Sustituir Three.js, introducir React Three Fiber o añadir dependencias.
- Descargar, comprar o generar un modelo externo.
- Inventar dimensiones, safe areas, bleed o zonas del asa.
- Reglas productivas de impresión, selección dinámica de materiales o nuevos productos reales.
- QA visual exhaustivo por Codex.

## PrintSurface

Contrato mínimo:

```js
{
  schemaVersion: 1,
  id,
  label,
  coordinateSystem: "normalized-0-1",
  aspectRatio,
  physicalSize: null | { width, height, unit },
  previewTextureResolution: { width, height },
  safeArea: null | { x, y, width, height },
  bleed: null | { top, right, bottom, left },
  restrictedZones: [],
  orientation: {
    topology: "flat" | "wrap" | "panel",
    horizontal: "left-to-right" | "right-to-left",
    vertical: "top-to-bottom" | "bottom-to-top",
    front: "center" | null,
    seam: "horizontal-edges" | null
  },
  constraints
}
```

`physicalSize`, `safeArea` y `bleed` permanecen `null` para la taza hasta disponer de medidas verificadas. `restrictedZones` permanece vacío.

## Product3DProfile

Contrato independiente:

```js
{
  schemaVersion: 1,
  revision,
  profileId,
  modelId,
  modelStatus: "development" | "verified" | "production",
  dimensions: null | { width, height, depth, unit },
  referenceData: {
    images: [],
    verifiedDimensions: null,
    provenance
  },
  printableSurfaces: [{ printSurfaceId, binding, uvMapping, texture }],
  materialVariants,
  camera,
  orbit,
  background,
  lighting
}
```

El modelo técnico actual conserva `modelId: "mug-development-v1"`, queda registrado explícitamente como `development` y no se presenta como modelo productivo.

## Contrato de coordenadas

`DesignDocument` almacena cada elemento respecto a su `PrintSurface`, con origen superior izquierdo:

- `x, y, width, height ∈ [0, 1]`;
- `xTexture = xNormalized × textureWidth`;
- `yTexture = yNormalized × textureHeight`;
- inversas: `xNormalized = xTexture / textureWidth`, `yNormalized = yTexture / textureHeight`.

Para UV sin rotación:

- `u = flipU ? uMax - x × (uMax-uMin) : uMin + x × (uMax-uMin)`;
- `v = flipV ? vMax - y × (vMax-vMin) : vMin + y × (vMax-vMin)`.

Las inversas despejan `x` e `y` de esas fórmulas. Una rotación declarada se aplica alrededor de `(0.5, 0.5)` antes de proyectar al rango UV y se invierte con el ángulo opuesto.

No se permiten offsets/repeats dispersos. Si un perfil futuro los necesita, deben estar declarados y justificados en `uvMapping`.

## Frente y seam

En una superficie `wrap`, los dos bordes horizontales representan el seam. El centro normalizado `x=0.5` representa el frente comercial y debe proyectarse a `frontU`. La dirección de lectura proviene de `orientation.horizontal` y `flipU`.

Para la taza piloto:

- `seamU = 0` (equivalente al borde `1`);
- `frontU = 0.5`;
- `flipU = false`;
- `flipV = true`;
- `rotation = 0`.

## Designer y artwork

La vista migrada obtiene su aspect ratio de `PrintSurface.aspectRatio`. Su área editable cubre el espacio completo 0..1. El tamaño CSS puede variar responsive sin alterar las coordenadas del documento.

ArtworkRenderer usa exactamente `previewTextureResolution`; no recibe un ancho arbitrario para la taza. Fabric renderiza el mismo espacio normalizado que ve el usuario y exporta la superficie completa.

## Three.js

`ThreePreviewAdapter` recibe `Product3DProfile`. Resuelve bindings por `printSurfaceId` y configura la textura exclusivamente desde `uvMapping` y `texture`. No contiene condiciones por taza, wrap o `productType`.

Three.js y sus addons conservan las fronteras lazy de 020F.1.

## Calibración

Un fixture no productivo define:

- líneas verticales izquierda, centro y derecha;
- cuadrícula UV;
- marcas `TOP` y `BOTTOM`.

Los tests demuestran matemáticamente left→`uMin`, center→`frontU`, right→`uMax`, top/bottom→V esperado y round-trip normalizado→px→normalizado→UV→normalizado.

## Productos futuros

Fixtures contractuales, sin GLB, deben representar:

- superficie plana;
- superficie cilíndrica/wrap;
- prenda con superficies front/back.

Los contratos no ramifican por `productType`.

## Estrategia de assets productivos

Orden de preferencia futuro:

1. modelo 3D/CAD oficial del fabricante o proveedor con licencia y procedencia verificadas;
2. modelo construido a partir de medidas y fotografías reales verificadas;
3. fotogrametría o escaneo controlado.

Antes de promover un asset se registrarán procedencia, derechos, imágenes de referencia, dimensiones verificadas, revisión UV y estado `verified` o `production`.

## Criterios de aceptación

1. Existe esta SPEC antes de la implementación.
2. `PrintSurface` es versionado y validado.
3. `Product3DProfile` es versionado, independiente y validado.
4. La taza referencia un `PrintSurface` y un `profileId`, no un `modelId` directo.
5. Dimensiones, safe area y bleed no verificados permanecen `null`; restricted zones vacío.
6. Designer y ArtworkRenderer obtienen ratio y resolución del mismo `PrintSurface`.
7. Las coordenadas documentales continúan normalizadas 0..1.
8. ArtworkRenderer genera 1008×480 para la superficie piloto 2.1, sin ancho arbitrario.
9. El perfil declara rangos UV, seam, front, flips y rotación.
10. El centro 2D proyecta exactamente a `frontU`.
11. Three aplica configuración declarativa sin branches por producto.
12. El binding afecta solo mesh/material declarados.
13. Los round-trips de coordenadas son estables dentro de tolerancia numérica.
14. El fixture de calibración prueba bordes, centro, top y bottom.
15. Fixtures plano, wrap y front/back validan sin GLBs.
16. El GLB actual permanece marcado como fixture `development`.
17. Metadata de referencia y variantes de material queda preparada sin inventar datos.
18. Design, Mockup, historial y documentos existentes no sufren regresiones.
19. Three continúa lazy y no se añaden dependencias.
20. No hay cambios fuera de alcance.
21. Tests localizados, lint, build y diff check pasan.

## Validación manual

La ejecuta el usuario mediante el checklist de centro/frente, extremos, movimiento proporcional y seam. La aprobación visual y un modelo físico productivo siguen pendientes.

