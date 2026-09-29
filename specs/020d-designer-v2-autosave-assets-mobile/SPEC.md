# SPEC-020D — Designer V2 Autosave, Assets & Mobile UX

## Estado

Implementada y validada el 2026-09-29. Implementación limitada a ProductDesigner V2 y persistencia local en navegador.

## Objetivo

Convertir V2 en una sesión local recuperable mediante drafts y assets en IndexedDB, autosave semántico, estados honestos de guardado, lifecycle seguro y una toolbar mobile compacta, sin afectar V1, ecommerce ni backend.

## Decisiones

- IndexedDB nativo mediante wrapper propio; no se añade `idb` ni otra dependencia.
- Stores versionados: `drafts` (`draftId`) y `assets` (`assetId`).
- La UI consume `DraftRepository` y `AssetRepository`; nunca IndexedDB directamente.
- `DesignDocument` sigue siendo la fuente de verdad. No se persisten Fabric JSON, selección, zoom, pan, DOM ni Object URL.
- `draftId` y `documentId` son identidades independientes.
- Una referencia ligera product/template/revision → draftId puede vivir en `localStorage`; ningún documento, Blob o Data URL se almacena allí.
- Autosave serializado, con debounce de 700 ms después de cambios documentales.
- Concurrencia MVP mediante `revision` optimista; no hay merge ni colaboración.
- Pinch-to-zoom se difiere: los eventos táctiles de Fabric ya participan en transformaciones y añadirlo sin QA específica eleva el riesgo de gestos accidentales.

## Draft model

```text
draftId, productId, templateId, templateRevision,
document, createdAt, updatedAt, assetIds, revision
```

El documento conserva su `schemaVersion`. Al cargar se validan schema, producto y referencias de template. Un draft incompatible produce error recuperable y nunca se reinterpreta silenciosamente.

## Repositories e IndexedDB

`DraftRepository`: `saveDraft`, `loadDraft`, `deleteDraft`, `hasDraft`; `listDrafts` se admite internamente para GC compartido.

`AssetRepository`: `saveAsset`, `loadAsset`, `hasAsset`, `deleteAsset`, metadata y Blob.

Los repositorios reciben un storage driver inyectable, permitiendo tests aislados sin depender del IndexedDB global del runner Node. El driver nativo usa transacciones IndexedDB.

## Autosave y save now

Toda revisión documental nueva —incluidos undo/redo— marca dirty. Tras 700 ms sin nuevas revisiones se guarda el documento completo. Escritura continua queda agrupada por el debounce y el historial semántico existente. `Guardar en este dispositivo` fuerza la cola inmediatamente.

Estados:

- `Cambios pendientes`: documento actual distinto del último confirmado;
- `Guardando…`: operación en curso;
- `Guardado en este dispositivo`: revisión actual confirmada;
- `Error al guardar`: persistencia fallida, edición en memoria intacta.

Un guardado que termina después de otra edición sólo limpia la revisión realmente guardada; la más reciente continúa dirty.

## Recovery

Si existe referencia a draft compatible se muestra una decisión accesible con fecha, producto, template legible y número de elementos:

- `Continuar diseño`: restaura documento y blobs, genera Object URLs nuevos e inicia historial vacío;
- `Empezar de nuevo`: confirma el descarte mediante el propio diálogo, elimina el draft anterior, ejecuta GC y crea nuevas identidades.

No hay restauración ni sobrescritura silenciosa.

## Assets y lifecycle

Upload conserva JPEG/PNG/WebP, máximo 10 MiB, MIME/decode/dimensiones válidas. Se guarda primero Blob+metadata y después el draft puede referenciarlo. `DesignDocument.assets` contiene metadata y `assetId`, nunca Blob/Object URL.

`runtimeAssetRegistry` acepta Blob, crea como máximo un Object URL por `assetId`, lo regenera tras recovery y revoca en remove/dispose.

Un helper puro cuenta referencias en documento presente, `history.past`, `history.future` y drafts persistidos. GC elimina únicamente assets con recuento cero; truncar historial y borrar draft vuelven a calcular candidatos.

## Fallos y concurrencia

Si IndexedDB no existe, falla o supera cuota, V2 sigue editable en memoria y muestra `No se puede guardar automáticamente en este dispositivo`. No se borran datos para liberar espacio.

Cada draft incluye `revision`. Antes de guardar se compara la revisión conocida. Una modificación externa produce conflicto controlado con opciones para recargar la copia almacenada o sobrescribir explícitamente; nunca se hace merge automático.

`beforeunload` sólo se activa si hay cambios pendientes, guardado en curso o error.

## Mobile

El canvas permanece protagonista. La toolbar compacta prioriza Texto, Imagen, Capas y Más. Capas y propiedades continúan en Sheet; Guardar ahora y acciones secundarias viven en Más. El estado de guardado es visible y discreto. Resize/orientación sólo recalculan viewport y no alteran DesignDocument ni disparan autosave.

## Fuera de alcance

Backend/API de drafts, Mongo, uploads remotos, Cart, Checkout, Order, Admin, ZIP, pagos, shipping, mockups, `automated_mockups`, Three.js, V1, mapping ProductTemplate productivo, pinch, migraciones complejas y colaboración.

## Validación automática

- repositorios, Blob, validación, conflicto, fallback y quota normalizada;
- autosave debounce y transiciones dirty/saving/clean/error;
- recovery y empezar nuevo;
- referencias current/past/future/drafts y GC;
- stress lógico con 20 elementos, historial y 10 blobs sintéticos;
- tests V2, lint, build, diff check y audit runtime antes/después.

No se realizará smoke visual exhaustivo. Se entregará checklist manual priorizada.

## Criterios de aceptación

- [x] CA-01 DraftRepository implementa save/load/delete/has con draftId independiente.
- [x] CA-02 IndexedDB guarda drafts y assets sin localStorage para datos grandes.
- [x] CA-03 Draft model conserva schema/template/version y rechaza incompatibilidad.
- [x] CA-04 Autosave guarda revisiones semánticas con debounce y cola serializada.
- [x] CA-05 Guardar en este dispositivo fuerza persistencia inmediata.
- [x] CA-06 Dirty/saving/clean/error corresponden a revisiones confirmadas.
- [x] CA-07 Recovery no restaura silenciosamente y permite continuar o empezar nuevo.
- [x] CA-08 Continuar restaura documento, assets y un historial inicial limpio.
- [x] CA-09 AssetRepository persiste metadata y Blob.
- [x] CA-10 Object URLs se regeneran, deduplican y revocan correctamente.
- [x] CA-11 GC considera current, past, future y otros drafts.
- [x] CA-12 Eliminar draft no elimina assets compartidos o recuperables.
- [x] CA-13 Fallos IndexedDB/quota mantienen edición en memoria y son visibles.
- [x] CA-14 Revisión optimista detecta conflicto entre tabs sin merge automático.
- [x] CA-15 beforeunload sólo se activa con dirty/saving/error.
- [x] CA-16 Mobile prioriza canvas y toolbar Texto/Imagen/Capas/Más.
- [x] CA-17 Zoom/pan/session state no se persisten ni disparan autosave.
- [x] CA-18 Upload mantiene política segura de 020B y guarda asset antes del draft.
- [x] CA-19 V1, backend, ecommerce, mockups y Three permanecen intactos.
- [x] CA-20 Audit, tests, lint, build y diff check pasan.
- [x] CA-21 Bundle inicial no incorpora Fabric ni persistencia pesada nueva.
- [x] CA-22 Se entrega checklist manual priorizada.

## Pendiente 020E

Relación productiva producto → `productTemplateId`/contrato equivalente y producto piloto real, sin reforzar `customizationType` provisional.
