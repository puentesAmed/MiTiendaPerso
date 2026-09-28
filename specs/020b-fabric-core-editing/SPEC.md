# SPEC-020B — Fabric Core Editing

## 1. Estado

Implementada y validada el 2026-09-28.

## 2. Contexto

SPEC-020A dejó ProductDesigner V2 aislado, lazy y gobernado por `ProductTemplate` y `DesignDocument`. Esta fase incorpora Fabric.js como renderer/editor imperativo, sin convertir su JSON ni sus objetos en estado de dominio.

ProductDesigner V1 permanece dormido. Cart, Checkout, Order, Admin, backend, `automated_mockups`, Three.js y persistencia remota quedan fuera de alcance.

## 3. Objetivo

Entregar el primer núcleo de edición 2D:

- texto editable;
- imágenes temporales JPEG, PNG y WebP;
- selección, move, resize, rotate, duplicate y delete;
- sincronización bidireccional mediante acciones de dominio;
- aislamiento por vista, orden z y print area;
- clipping visual y warning de bounds;
- UX accesible y responsive.

## 4. Decisiones

- Fabric.js 7.4.0, sin wrapper React.
- `DesignDocument` es la fuente de verdad.
- `FabricAdapter` encapsula canvas, objetos, listeners, reconcile y dispose.
- No se persisten Fabric JSON, matrices, clases ni internals.
- Los Object URL viven en un registro runtime separado; el documento solo conserva metadata y `assetId`.
- Se usa `Textbox` para texto, con edición inline y ancho normalizado.
- Los commits de transform se realizan al finalizar la interacción, no en cada pointer move.

## 5. Flujo

```text
DesignDocument -> FabricAdapter -> Fabric Canvas
Fabric event -> domain action -> reducer -> DesignDocument -> reconcile mínimo
```

El adapter nunca expone `FabricObject` fuera de su módulo.

## 6. Dominio

Acciones puras: `addText`, `addImage`, `updateElement`, `deleteElement` y `duplicateElement`. Todas actualizan `metadata.updatedAt`, validan vista/print area y mantienen z-index. Transformaciones Fabric se normalizan a `x/y/width/height/rotation` del elemento.

`sessionState` incorpora `selectedElementId` y `activePrintAreaId`. Selección y zoom no se persisten.

## 7. Texto

El botón Texto crea `Tu texto`, centrado en el print area activo, con tamaño relativo legible, color neutro y alineación centrada. `Textbox` permite doble click/tap, cursor, selección, wrapping y edición inline. El panel DOM permite editar contenido, font size, color, alineación y weight.

## 8. Imagen

El frontend acepta JPEG, PNG y WebP, máximo 10 MiB. Verifica MIME, decode y dimensiones. El Object URL se registra en memoria y se revoca al eliminar el asset o desmontar. El documento guarda metadata sin Data URL.

La imagen se inserta centrada, visible, con aspect ratio preservado y seleccionada.

## 9. Transformaciones y bounds

Fabric gestiona controles de selección, resize y rotate. Al finalizar, el adapter convierte el rectángulo al sistema normalizado del print area y absorbe escalas Fabric en dimensiones de dominio.

Salir parcialmente del print area no bloquea el gesto: se persiste y se muestra warning visual/DOM. El artwork usa clip cuando `clip.enabled=true`; overlay y controles permanecen fuera del clip.

## 10. Vistas y print areas

Cambiar de vista conserva el documento completo, limpia/reconcilia el canvas y renderiza solo la vista activa. La arquitectura admite varias print areas mediante `activePrintAreaId`, aunque el fixture actual tenga una por vista.

## 11. UX y accesibilidad

- Desktop 1024/1440: rail, canvas y propiedades.
- Mobile 320/375: stage prioritario, herramientas compactas y propiedades apiladas, sin sidebar permanente.
- Handles táctiles y hit area ampliada.
- Lista/resumen DOM de elementos, selección anunciada, acciones duplicar/eliminar y propiedades editables.
- Delete/Backspace elimina; Escape deselecciona; Ctrl/Cmd+D duplica.
- Los shortcuts no actúan durante edición de texto o inputs.
- Shell/overlay responden a light/dark; colores del artwork no cambian con el tema.

## 12. Lifecycle y errores

El canvas se crea desde `canvasRef`, registra listeners una vez y ejecuta `dispose()` al desmontar. El adapter evita loops durante reconcile. Los Object URL se revocan al liberar el registro.

Se manejan init de Fabric, asset faltante, MIME/tamaño/decode inválidos y templates inválidos sin romper la página.

## 13. Performance

Fabric solo puede importarse desde la feature lazy V2. El build debe separar un chunk Fabric y mantener sin incremento significativo el bundle inicial ecommerce.

## 14. Fuera de alcance

- historial undo/redo;
- layers UI completa;
- zoom avanzado;
- shapes UI;
- persistencia o upload backend;
- export productivo;
- mockups y Three.js;
- cambios en V1, Cart, Checkout, Order, Admin o backend.

## 15. Validación

- tests puros de acciones, vistas, z-index, transforms y assets;
- tests no frágiles del adapter cuando sea viable;
- lint, build y diff check;
- smoke flag ON/OFF, light/dark y 320/375/768/1024/1440;
- smoke de texto, imagen, transform, duplicado, borrado y cambio de vista.

## 16. Criterios de aceptación

- [x] CA-01 Fabric.js 7.4.0 está integrado sin wrapper React.
- [x] CA-02 Fabric solo se carga dentro de la ruta lazy V2.
- [x] CA-03 FabricAdapter encapsula objetos, listeners, eventos, reconcile y dispose.
- [x] CA-04 DesignDocument sigue siendo la fuente de verdad y no almacena internals Fabric.
- [x] CA-05 añadir texto produce un TextElement válido y centrado.
- [x] CA-06 el texto admite edición inline y mediante panel accesible.
- [x] CA-07 el panel permite contenido, tamaño, color, alineación y weight.
- [x] CA-08 upload valida JPEG/PNG/WebP, tamaño, decode y dimensiones.
- [x] CA-09 assets runtime y metadata documental están separados.
- [x] CA-10 añadir imagen conserva aspect ratio, es visible y queda seleccionada.
- [x] CA-11 selección y deselección actualizan solo sessionState.
- [x] CA-12 move persiste posición normalizada al finalizar.
- [x] CA-13 resize absorbe escalas en dimensiones normalizadas.
- [x] CA-14 rotate persiste grados.
- [x] CA-15 duplicar crea ID y z-index nuevos con offset.
- [x] CA-16 eliminar retira el elemento del documento y canvas.
- [x] CA-17 Delete/Backspace, Escape y Ctrl/Cmd+D respetan edición de texto/inputs.
- [x] CA-18 bounds fuera de print area generan warning sin bloqueo agresivo.
- [x] CA-19 clipping se aplica al artwork sin inutilizar selección/controles.
- [x] CA-20 cambiar de vista conserva los elementos de todas las vistas.
- [x] CA-21 activePrintAreaId prepara múltiples print areas.
- [x] CA-22 render respeta zIndex y los nuevos objetos van al frente.
- [x] CA-23 property panel contextual funciona para texto e imagen.
- [x] CA-24 existe alternativa DOM accesible al canvas.
- [x] CA-25 mobile 320/375 permite las operaciones principales.
- [x] CA-26 desktop 1024/1440 conserva dirección Premium Compact.
- [x] CA-27 light/dark no altera colores del artwork.
- [x] CA-28 lifecycle libera listeners, canvas y Object URLs.
- [x] CA-29 errores de imagen, Fabric y asset faltante son recuperables.
- [x] CA-30 tests específicos, lint, build y diff check pasan.
- [x] CA-31 main ecommerce no incorpora Fabric y se reportan chunks/gzip.
- [x] CA-32 V1 y sistemas fuera de alcance permanecen intactos.

## 17. Pendiente para SPEC-020C

Layers completas, history undo/redo, zoom avanzado, orden manual, shortcuts ampliados y refinamiento de selección múltiple.
