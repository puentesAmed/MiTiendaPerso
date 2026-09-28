# SPEC-020C — Designer V2 Layers, History & Workspace

## Estado

Implementada y validada el 2026-09-28. Alcance acotado a ProductDesigner V2.

## Objetivo

Completar el workspace 2D con capas accesibles, historial documental, selección múltiple y controles de zoom/pan, manteniendo `DesignDocument` como única fuente de verdad persistible y Fabric como adaptador imperativo.

## Alcance

- panel de capas con selección, orden manual, bloqueo, visibilidad, borrado e indicador de overflow;
- `zIndex` contiguo y normalizado tras cada reorder;
- historial `past/present/future`, límite 50 y una entrada semántica por gesto;
- undo/redo global al documento, incluso entre vistas, sin historizar cambio de vista, selección, zoom o pan;
- selección múltiple para seleccionar, mover y borrar en conjunto;
- zoom, porcentaje, ajustar y pan con Espacio+arrastre cuando hay zoom;
- inspector contextual para ninguna, una o varias selecciones;
- shortcuts accesibles y estado honesto `Cambios sin guardar`;
- drawers móviles para capas y propiedades;
- validación funcional, responsive, temas, lifecycle y rendimiento.

## Arquitectura de estado

```text
documentState: DesignDocument actual
sessionState: activeViewId, activePrintAreaId, selectedElementIds, zoom, pan, activeTool, mode, dirty
historyState: past, present, future, limit, lastGroupKey
asyncState: product, template, loading/error y assets runtime externos
```

`historyState.present` y `documentState.document` apuntan a la misma revisión. Los snapshots contienen exclusivamente `DesignDocument`: nunca Fabric JSON/objects, selección, zoom, pan, Object URL ni blobs.

Se mantiene `useReducer`: las transiciones son locales, síncronas y testeables; Zustand no reduce complejidad suficiente en esta fase y añadirlo aumentaría superficie y bundle.

## Historial

- Cada acción de dominio confirmada crea una revisión y limpia `future`.
- Transformaciones se confirman al terminar el gesto.
- Escritura repetida usa `groupKey` para sustituir la revisión presente sin multiplicar entradas.
- Undo/redo restaura el documento completo sin cambiar la vista activa.
- Cambiar vista, seleccionar, zoom y pan no crean entradas.
- Los Object URL se conservan en el registro runtime hasta desmontar para permitir undo de imágenes; no forman parte de snapshots.

## Capas y orden

La lista DOM muestra primero la capa superior. Cada fila permite seleccionar, ocultar/mostrar, bloquear/desbloquear, subir, bajar y eliminar con botones etiquetados. El reorder intercambia vecinos y normaliza `zIndex` a `0..n-1`.

Bloqueo y visibilidad se persisten en el elemento. Una capa bloqueada no se transforma desde canvas, pero sigue siendo seleccionable y operable desde el panel DOM. Una capa oculta permanece administrable desde capas.

## Selección múltiple

`sessionState.selectedElementIds` es el contrato. Fabric `ActiveSelection` se usa sólo dentro del adapter. Se exige selección, desplazamiento conjunto y borrado conjunto; duplicado múltiple y grouping quedan fuera.

## Workspace

- toolbar compacta para undo/redo, zoom y fit;
- zoom de sesión limitado a 50–200%; `Fit` restablece encaje y pan;
- pan de escritorio con Espacio+arrastre cuando zoom > fit;
- warning de overflow global y por capa;
- badges por vista con recuento de elementos;
- inspector contextual de texto, imagen y multiselección;
- light/dark sin alterar colores del artwork.

Pinch, copy/paste interno, nudge y grupos se difieren: no son necesarios para los criterios mínimos y su integración segura requiere una SPEC posterior.

## Mobile y accesibilidad

En 320/375/768 el stage conserva prioridad. Capas y propiedades viven en Sheet/Drawer invocables, sin ocupar permanentemente media pantalla. Toda gestión de capas dispone de controles DOM con nombre accesible y foco visible.

Shortcuts: Delete/Backspace, Escape, Ctrl/Cmd+D, Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z y Ctrl/Cmd+Y. No actúan en inputs, textareas, selects ni contenido editable.

## Dirty state

Toda mutación documental activa `Cambios sin guardar`. Undo/redo también mantienen dirty. Se avisa sólo ante cierre/recarga del navegador; no se bloquea agresivamente la navegación interna.

## Lifecycle y rendimiento

El canvas no se recrea por selección, propiedades o historial. Listeners y timers se registran una vez y se liberan en `dispose`. Se prueba al menos con 20 y 50 elementos. No se incorpora librería de drag-and-drop ni otra dependencia.

## Fuera de alcance

V1, Cart, Checkout, Order, Admin, backend, mockups, Three.js, plantilla comercial, persistencia/storage, grouping, pinch, copy/paste y export productivo.

## Validación

- tests: push/undo/redo, limpieza de future, agrupación semántica, reorder, lock/hide, normalización, selección/zoom fuera del documento y cambio de vista fuera del historial;
- adapter: stacking, visibilidad, lock y selección por IDs cuando sea viable sin tests frágiles;
- smoke desktop/mobile, 20/50 elementos, V1, light/dark;
- lint, build, diff check y `npm audit --omit=dev` antes/después;
- reporte de chunks main, V2, Fabric, nuevas dependencias e impacto inicial.

## Criterios de aceptación

- [x] CA-01 Las cuatro slices cumplen el contrato y no contienen objetos Fabric.
- [x] CA-02 Historial limitado restaura DesignDocument y limpia future tras una nueva edición.
- [x] CA-03 Escritura/gesto continuo produce una entrada semántica.
- [x] CA-04 Undo/redo funcionan en UI y shortcuts, también entre vistas.
- [x] CA-05 Cambio de vista, selección, zoom y pan no crean historial.
- [x] CA-06 Capas permiten selección, reorder, lock, hide y delete mediante DOM accesible.
- [x] CA-07 Reorder conserva `zIndex` contiguo y coincide con Fabric.
- [x] CA-08 Lock/hide persisten y se reflejan en canvas y panel.
- [x] CA-09 Selección múltiple permite mover y borrar conjuntamente.
- [x] CA-10 Inspector distingue ninguna, texto, imagen y multiselección.
- [x] CA-11 Zoom 50–200%, Fit y pan con Espacio funcionan como estado de sesión.
- [x] CA-12 Overflow y conteos por vista permanecen visibles.
- [x] CA-13 Dirty state es honesto y el aviso de salida no es agresivo.
- [x] CA-14 Mobile usa drawers para capas/propiedades y desktop conserva workspace compacto.
- [x] CA-15 Canvas, assets, listeners y timers se liberan correctamente.
- [x] CA-16 Tests específicos, lint, build, audit y diff check pasan.
- [x] CA-17 Main ecommerce no absorbe Fabric ni una dependencia pesada nueva.
- [x] CA-18 V1 y sistemas fuera de alcance permanecen intactos.

## Pendiente 020D

Persistencia, autosave/versionado remoto, grupos, clipboard, nudge, pinch, export y mockups requieren SPEC explícita.
