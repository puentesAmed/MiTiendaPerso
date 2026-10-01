# SPEC-020H — Tshirt ProductDesigner V2 Integration

## Estado

Implementada. Validación automática completada; validación visual delegada al usuario.

## Objetivo

Integrar `Camiseta básica personalizada` en ProductDesigner V2 mediante la arquitectura declarativa existente:

`Product → ProductTemplate → PrintSurface → DesignDocument → ArtworkRenderer → Product3DProfile → ThreePreviewAdapter`.

La ficha debe conservar talla y color al abrir `/personalizar-v2/:productId`; el diseñador debe editar FRONT/BACK de forma independiente y mostrar el GLB validado por SPEC-020G con el color seleccionado.

## Alcance

- Registrar el template `tshirt-basic-v1` con vistas `front` y `back` visibles como `Frontal` y `Trasera`.
- Registrar `tshirt-front` y `tshirt-back` como PrintSurfaces normalizadas, sin medidas físicas, safe area ni bleed inventados.
- Copiar sin modificar `tshirt-web.glb` a `frontend/public/models/` como asset público temporal de desarrollo.
- Registrar el Product3DProfile `tshirt-basic-v1`, sus dos bindings UV, materiales, cámara y órbita.
- Transportar un contexto canónico de variante con `variantId`, talla y `colorId`, conservando las etiquetas disponibles del producto.
- Hacer persistente el contexto en query params y mantener `location.state` como optimización de navegación.
- Asociar drafts a producto, revisión de template y variante. Un draft de otra variante se presenta como incompatible y nunca se restaura silenciosamente.
- Habilitar el CTA V2 únicamente para productos personalizables con template registrado y variante requerida completa.
- Actualizar seed/descripción y usar el script idempotente existente para asignar únicamente `tshirt-basic-v1` al producto real.

## Decisiones

### ProductTemplate y PrintSurfaces

- `tshirt-front`: resolución editorial `754 × 1024`, aspect ratio `754 / 1024`.
- `tshirt-back`: resolución editorial `747 × 1024`, aspect ratio `747 / 1024`.
- Ambas superficies son `panel`, usan coordenadas `normalized-0-1`, `physicalSize: null`, `safeArea: null`, `bleed: null` y `restrictedZones: []`.
- Fabric y ArtworkRenderer siguen consumiendo exclusivamente la vista activa, el documento y su PrintSurface.

### Binding 3D

Se reutiliza la calibración de SPEC-020G:

| Superficie | Mesh | Material | UV min | UV max | flipU |
| --- | --- | --- | --- | --- | --- |
| `tshirt-front` | `TShirtWebMesh_1` | `TShirtFrontPrintable` | `[0.154158, 0.082574]` | `[0.501834, 0.555016]` | no |
| `tshirt-back` | `TShirtWebMesh_2` | `TShirtBackPrintable` | `[0.617101, 0.098254]` | `[0.964716, 0.574612]` | sí |

El adapter compone cada canvas editorial dentro de su región UV sobre un atlas con el color base. No mezcla FRONT/BACK, no captura la UI y no tiñe el artwork.

### Variantes

- La UI continúa mostrando exclusivamente tallas y colores devueltos por el producto.
- Los identificadores de color son canónicos y declarativos; no se introducen comparaciones específicas dentro de Three.
- El cambio de color actualiza materiales/texturas del modelo ya cargado y no modifica el DesignDocument salvo su contexto de variante.
- Blanco y negro deben resolver como mínimo. Los demás colores declarados solo son utilizables cuando existen entre las opciones reales del producto.

### Drafts

La clave local incluye producto, template, revisión y variante. Las referencias anteriores siguen siendo detectables para no borrar drafts de taza. Si la variante guardada no coincide, el diálogo informa incompatibilidad y obliga a mantener el contexto original o empezar explícitamente de nuevo.

## Fuera de alcance

- Designer V1.
- Cart, Checkout, Order, Admin y ZIP.
- Protected asset delivery.
- Cambios o recalibración del GLB/UV.
- Medidas físicas no verificadas.
- Nuevas opciones comerciales de talla o color.

## Criterios de aceptación

- [x] `tshirt-basic-v1` y sus dos PrintSurfaces validan con los contratos existentes.
- [x] El profile 3D valida y enlaza exactamente FRONT/BACK con los materiales preparados.
- [x] ProductDetail habilita `Personalizar producto` solo con template y opciones requeridas válidas.
- [x] La navegación conserva `variantId`, talla y `colorId`, incluido refresh razonable.
- [x] El header muestra talla/color de forma compacta.
- [x] Frontal y Trasera conservan elementos e historial independientes al cambiar de vista.
- [x] El color base se aplica a tela y zonas imprimibles sin teñir artwork ni recargar el GLB.
- [x] Los drafts de variantes distintas no se restauran silenciosamente.
- [x] La taza V2 mantiene template, wrap, 3D y drafts compatibles.
- [x] Three continúa lazy-loaded y el asset de camiseta permanece marcado como público de desarrollo.
- [x] Tests localizados, lint, build y `git diff --check` pasan.

## Asignación al producto real

Desde `Backend`, el comando seguro por nombre exige una única coincidencia y es idempotente:

```powershell
node .\scripts\assign-product-template.js --name "Camiseta básica personalizada" tshirt-basic-v1 "Camiseta de algodón 100% con personalización frontal y posterior. Crea tu diseño con textos e imágenes y ajústalo libremente dentro de las áreas personalizables."
```

Cuando se conozca el `_id` real, se prefiere la variante posicional por identificador.

## Validación manual delegada

La validación visual exhaustiva corresponde al usuario: activación desde ProductDetail, entrada con talla/color, edición Frontal/Trasera, blanco/negro, refresh/autosave, móvil 375 px y regresión de taza.

