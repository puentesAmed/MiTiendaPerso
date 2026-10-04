# SPEC-022A — Image Upload Quality Gate

## Objetivo

Impedir que imágenes claramente insuficientes lleguen desde Designer V2 a producción, manteniendo un aviso no bloqueante para imágenes utilizables pero justas. La evaluación usa exclusivamente el archivo original y lenguaje simple; no usa DPI, medidas físicas, zoom ni tamaño visual en canvas.

## Auditoría previa

- `runtimeAssetRegistry` ya limita a JPEG, PNG y WebP, aplica un máximo de 10 MiB, decodifica con `Image`, obtiene dimensiones naturales, sanitiza el nombre y revoca el Object URL temporal.
- `AssetRepository` conserva el Blob y metadata en IndexedDB. `runtimeAssetRegistry` regenera Object URLs al restaurar y nunca los persiste.
- `DesignDocument.assets` ya es el contrato de metadata desacoplado de Fabric; los elementos solo referencian `assetId`.
- El upload de Designer V2 prepara el asset, lo persiste, lo registra en memoria y lo inserta mediante una acción de dominio. Autosave guarda el documento con esa metadata.
- `ArtworkRenderer` consume referencias opacas del registro y exporta según `previewTextureResolution`; no debe recalcular calidad según escala o zoom.
- Las superficies productivas actuales son: taza 1008×480 px; camiseta frontal 754×1024, trasera 747×1024 y mangas 1024×525. Todas declaran `physicalSize: null`, por lo que no existe base para inferir DPI.
- El handoff sube originales y renders. Backend verifica template, referencias, MIME declarado/contenido y dimensiones de los PNG productivos, pero no bloquea todavía assets marcados como rechazados.

Se reutilizan los validadores, metadata, IndexedDB, registro runtime y guard productivo actuales. No se introduce estado Fabric ni persistencia de Object URLs/Data URLs.

## Contrato de calidad

Cada asset nuevo conserva `widthPx`, `heightPx` y `qualityStatus`, donde `qualityStatus` es `good`, `warning` o `rejected`. Se mantienen los nombres `widthPx`/`heightPx` ya establecidos para no duplicar dimensiones con aliases ambiguos.

- `good`: puede continuar.
- `warning`: puede continuar con aviso visible.
- `rejected`: no se inserta en el documento y no puede finalizar el handoff.

Assets históricos sin `qualityStatus` siguen siendo compatibles y no reciben una clasificación retroactiva.

## Umbrales

Los umbrales centralizados usan área total y menor dimensión del original:

```js
IMAGE_QUALITY_THRESHOLDS = {
  rejected: { minDimensionPx: 320, minAreaPx: 250_000 },
  good: { minDimensionPx: 480, minAreaPx: 1_500_000 }
}
```

- Es `rejected` si incumple cualquiera de los mínimos de rechazo.
- Es `good` si cumple ambos mínimos de buena calidad.
- El intervalo restante es `warning`.

La menor superficie productiva actual tiene 480 px en su lado corto y aproximadamente 484 000 px²; el rechazo queda claramente por debajo de esa referencia. El umbral `good` exige aproximadamente el doble del área de la superficie actual más grande, pero admite panorámicas con lado corto de 480 px. Así se aporta margen sin exigir formato cuadrado ni atribuir tamaño físico/DPI.

## Flujo frontend

1. Validar MIME y tamaño existentes.
2. Decodificar el archivo original.
3. Leer dimensiones naturales.
4. Evaluar `qualityStatus`.
5. Mostrar inmediatamente:
   - `✓ Buena calidad` — `Imagen apta para personalización.`
   - `⚠ Calidad justa` — `Recomendamos usar una imagen de mayor resolución.`
   - `✕ Calidad insuficiente` — `Sube una imagen de mayor calidad para continuar.`

`good` y `warning` se insertan normalmente. `rejected` no se persiste, registra ni inserta; esta opción evita documentos deliberadamente inválidos y simplifica recuperación/autosave. MIME inválido, archivo corrupto o decode fallido continúan usando el error de upload existente.

## Persistencia y restauración

El Blob persistente y la metadata `widthPx`, `heightPx`, `qualityStatus` se guardan en IndexedDB. El mismo metadata vive en `DesignDocument.assets`, por lo que autosave/draft preserva el estado. Restaurar registra de nuevo el Blob y usa el status guardado sin recalcularlo. Object URLs, objetos Fabric y bitmap/canvas runtime quedan fuera de persistencia.

## Guard de handoff y backend

- Frontend comprueba antes de subir artifacts que ningún asset referenciado tenga `qualityStatus: rejected`.
- Backend rechaza cualquier asset V2 explícitamente `rejected` antes de persistir producción.
- Si existe `qualityStatus`, backend exige un valor permitido y coherencia con `widthPx`/`heightPx` y los mismos umbrales. Esto impide cambiar `rejected` por `good` o `warning` en el payload.
- Si falta `qualityStatus`, se trata como asset histórico y se mantiene compatible; no se inventa rechazo retroactivo.
- Se conservan las validaciones actuales de referencia, upload, MIME y firma del contenido. No se implementa un nuevo pipeline de decode ni un provider externo.

## Fuera de alcance

Pricing por superficie, selección front/back/mangas, fuentes, formas, carrito general, shipping, Admin general, providers externos, upscaling, DPI o tamaños físicos inventados.

## Criterios de aceptación

- Good, warning y rejected se clasifican con umbrales centralizados.
- Feedback compacto usa el copy acordado.
- Warning se inserta y puede finalizar; rejected no se inserta y el handoff lo bloquea defensivamente.
- Draft/IndexedDB conservan `qualityStatus` sin Object URLs.
- Backend acepta good/warning/históricos y rechaza rejected o status manipulado incoherente.
- PNG/JPEG/WebP, autosave y producción de taza/camiseta conservan su flujo existente.
- Tests específicos, lint, builds/check y `git diff --check` pasan.
