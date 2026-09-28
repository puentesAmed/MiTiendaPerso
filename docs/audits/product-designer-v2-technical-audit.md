# Auditoría técnica y arquitectura — ProductDesigner V2

Fecha: 2026-09-28  
Alcance: auditoría local, sin implementación, sin cambios de contratos y sin instalación de dependencias.

## Resumen ejecutivo

La recomendación es construir ProductDesigner V2 desde cero con React y Fabric.js, aislado de V1 y gobernado por dos contratos propios versionados: `ProductTemplate` y `DesignDocument`. Fabric debe ser un renderer/adaptador, nunca el formato persistente. V1 debe permanecer disponible en `/personalizar/:productId`; V2 debe aparecer bajo flag en `/personalizar-v2/:productId` y cargarse por ruta.

`automated_mockups` es reutilizable como núcleo de un servicio backend de composición 2D básico. No ofrece API HTTP, perspectiva, warping, máscaras de producto ni semántica multivista: necesita un adapter y evolución antes de producir mockups de alta fidelidad para tazas o prendas. Three.js es técnicamente adecuado para un modo 3D opcional, pero exige modelos GLB con UVs, nombres estables de meshes/materiales y una disciplina explícita de lazy loading y liberación de GPU. No debe entrar en el MVP.

La decisión es **B: Fabric para V2**, conservando V1/Konva dormido y sin basar V2 en su estado interno.

## Estado ProductDesigner V1

### Arquitectura actual

- Ruta lazy existente: `/personalizar/:id` carga `ProductDesignerPage` mediante `React.lazy`.
- `ProductDesignerPage` carga el producto, selecciona un template por `product.customizationType`, mantiene `design`, `committedDesign` y modo `edit/preview`, y crea el payload de carrito.
- `ProductDesigner` es un componente grande con React state interno y `react-konva`: canvas, herramientas, inspector, historial y export viven juntos.
- El estado editable es `{ side, elementsBySide, notes?, previewsBySide? }`.
- Existen dos stages ocultos, siempre `front` y `back`, que exportan PNG mediante `Stage.toDataURL({ pixelRatio: 2 })`.
- `DESIGN_TEMPLATES` es un objeto frontend estático para `tshirt`, `hoodie` y `mug`; el único template completo observado es camiseta.
- `ProductPreview360` no es 3D ni 360 real: alterna frames asociados a `front/back` y muestra el PNG ya compuesto.

### Flujo actual

```text
Product
  -> product.customizationType
  -> DESIGN_TEMPLATES
  -> ProductDesignerPage
  -> ProductDesigner (Konva)
  -> elementsBySide + previewsBySide
  -> createDesignerCustomizationPayload
  -> CartLineV2.customization
  -> Checkout DTO
  -> backend createOrder
  -> Customization Mongo document
  -> generateCustomizationZip
  -> Admin preview / design JSON / ZIP
```

El backend calcula producto, variante y precio de forma autoritativa. Si la línea es personalizable y el wrapper es `type: "designer"`, crea `Customization`, genera el ZIP y guarda `customizationId` en el pedido. `Order.items` escribe actualmente `variant` y `selectedVariant` con el mismo valor por compatibilidad.

### Acoplamientos detectados

- Dos lados fijos: `front/back` aparecen en estado, UI, exports ocultos, preview, schema Mongo, resumen de pedido y ZIP.
- Templates por tipo con branching indirecto: `DESIGN_TEMPLATES[customizationType]`; el modelo Product restringe `customizationType` a `tshirt|hoodie|mug`.
- Dimensiones fijas por template; el canvas de camiseta usa 550×500 y el wrapper móvil conserva un `min-width` igual al canvas, generando scroll en lugar de una interacción móvil nativa.
- El render del producto usa `width={stageHeight}` y `height={stageHeight}`: asume fondo cuadrado y no usa `stageWidth` para el ancho.
- Zonas imprimibles y mockups viven en código frontend. Hoodie y mug declaran una sola zona, pero el editor sigue exportando dos lados.
- `ExportStage` exporta mockup, guía discontinua y diseño juntos; por tanto el PNG no es un artwork de producción limpio.
- La comprobación de límites estima imágenes como 120×120 y texto con una fórmula aproximada; ignora rotación y dimensiones reales.
- Solo existe selección individual. No hay agrupación, snapping, guidelines, crop, formas ni edición directa de texto en canvas.
- Las imágenes se guardan como Data URL dentro de cada elemento.
- Estado, historial, selección, export y UI están acoplados al componente.
- El modelo Mongo `ElementSchema` no incluye `order`, aunque V1 lo usa para capas. Al persistir puede perderse el orden explícito de capas; el preview compuesto sí lo conserva visualmente.
- El wrapper de carrito contiene `clientId`, `type` y `designVersion`, pero `Customization` persiste solo `design`, previews y metadatos operativos. No persiste esos campos como contrato de documento.
- V1 usa componentes `legacy-ui`; no debe condicionar el stack de V2.

### Qué funciona bien

- La ruta ya está aislada y lazy; Konva no entra en el bundle inicial del ecommerce.
- Añadir/mover/redimensionar/rotar texto e imagen funciona con un modelo legible.
- Capas básicas, duplicado, centrado, borrado y undo/redo de hasta 30 snapshots existen.
- La edición desde carrito conserva `clientId`, `lineKey`, variante y ruta de retorno.
- `CartLineV2` evita fusionar diseños distintos mediante `customization.clientId`.
- Checkout y backend no confían en precios enviados por cliente.
- Los previews históricos, documento `Customization`, `customizationId` de Order y ZIP forman un flujo operativo real.

### Qué NO debe reutilizarse

- El componente monolítico y su estado interno.
- `front/back` como modelo universal.
- `DESIGN_TEMPLATES` como contrato permanente.
- Coordenadas ligadas al canvas/mockup visible.
- Data URLs como asset model.
- Los stages ocultos específicos por lado.
- La guía de print area incluida en el export final.
- El cálculo aproximado de límites.
- El supuesto de que preview, mockup y artwork de producción son la misma imagen.
- El JSON de Konva o cualquier futuro JSON de Fabric como contrato de negocio.

### Qué sí puede reutilizarse conceptualmente

- Separar diseño editable de preview derivado.
- Identidad `clientId` estable durante la edición.
- `variant` canónica y compatibilidad `selectedVariant` solo en fronteras legacy.
- Edición desde carrito por `lineKey`.
- Capas ordenadas, selección, duplicado, centrado y warnings fuera de área.
- Ruta lazy, modos Edit/Preview y export por vista.
- `Customization` separado de Order y ZIP de producción; deben evolucionar mediante adapters, no borrarse.

## Qué se deja dormido

- `/personalizar/:productId` continúa apuntando a V1.
- Se conserva todo el código, modelos y datos actuales.
- V1 solo recibe correcciones críticas que protejan el flujo estable.
- V2 no importa componentes, hooks privados, state ni templates de V1.
- V1 y V2 solo pueden compartir contratos públicos de ecommerce y utilidades neutrales expresamente versionadas.
- Flag conceptual: `VITE_PRODUCT_DESIGNER_V2_ENABLED`.
- Nueva ruta conceptual: `/personalizar-v2/:productId`, lazy.
- ProductDetail muestra “Probar nuevo diseñador” solo con flag activo. Durante desarrollo puede coexistir con el CTA V1.
- La desactivación del flag elimina la entrada visible a V2 sin afectar V1 ni carritos/pedidos históricos.

## Contrato actual de personalización

### Carrito vigente

```js
{
  schemaVersion: 2,                 // versión de CartLine, no del diseño
  lineKey,
  productId,
  quantity,
  variant: { size, color } | null,
  customization: {
    clientId,
    type: "designer",
    designVersion: 1 | 2,
    design: {
      side: "front" | "back",
      elementsBySide: { front: [], back: [] },
      notes,
      previewsBySide?               // tolerado dentro del design
    },
    previewsBySide: { front, back } | null,
    previewImage,
    productId,
    productSnapshot?,
    textSummary?
  },
  customizationRequired,
  presentation
}
```

- No existe `schemaVersion` dentro del diseño V1. `designVersion` pertenece al wrapper de customization y, si falta, se interpreta como 1.
- `selectedVariant` es entrada legacy y snapshot histórico; frontend nuevo usa `variant`.
- `clientId` identifica el diseño en carrito; no es `_id` ni autorización.
- Checkout envía `{ productId, quantity, variant, customization }`.

### Persistencia de pedido

- `Customization.design` admite solo `elementsBySide.front/back`, `notes` y `side`.
- Elementos persistidos: `id`, `type`, `text`, `url`, `x`, `y`, `fontSize`, `fontFamily`, `fill`, `rotation`, `scaleX`, `scaleY`.
- Previews: `previewImage`, `previewsBySide.front/back`; `previewImageHD` es leído por ZIP pero no existe en el schema observado.
- Operación: `mockupFront`, `mockupBack`, `zipUrl`, `orderId`, `status`.
- Order persiste `customizationId`, no el payload completo.
- ZIP incluye `design.json`, `design_front.png`, `design_back.png`, mockups opcionales y assets de imagen encontrados en `elementsBySide.front/back`.
- Admin lista previews, muestra el JSON almacenado y descarga el ZIP autenticado.

### Contratos que V2 no debe romper

- `CartLineV2.schemaVersion = 2`, `lineKey`, `clientId`, `variant` y edición por `lineKey`.
- Lectura histórica `variant ?? selectedVariant` y escritura dual temporal de Order.
- `Order.items[].customizationId` y documentos `Customization` históricos.
- Lectura de `previewImage`, `previewsBySide.front/back`, `zipUrl` y descarga `/api/customizations/:id/zip`.
- ZIPs y diseños históricos no deben migrarse destructivamente.

### Compatibilidad mediante adapter

V2 debe producir `DesignDocument` nativo. `LegacyCustomizationAdapter` traduce únicamente en la frontera. Mientras backend solo acepte front/back, el adapter inverso debe limitarse a templates compatibles y fallar de forma explícita para vistas/áreas no representables. No se debe truncar silenciosamente un diseño universal.

## automated_mockups: capacidades reales

### Arquitectura

- Paquete Python 3.8+ con Pillow, NumPy, OpenCV y scikit-image.
- CLI `argparse` con dos comandos: `calculate` y `generate`.
- API Python directa mediante `MockupCalculator` y `MockupGenerator`; no hay servidor HTTP ni cola.
- `calculate` detecta la mayor región de un color con tolerancia y genera JSON por filename.
- Parámetros reales: `filename`, `bbox` en orden `(min_row,min_col,max_row,max_col)`, `width`, `height`, `rotation`, `center`.
- `generate` abre diseño/template, convierte a RGBA, escala con `fit|fill|stretch|none`, rota y hace `paste` alfa.
- Alineaciones: nueve posiciones. Salida: PNG/JPEG/WebP; quality solo se aplica explícitamente a JPEG.
- Batch cartesiano diseños×mockups, opcionalmente paralelo con `ThreadPoolExecutor` (4 workers por defecto), y resultado por tarea con error.

### Límites y hallazgos

- No hay concepto de `view`, producto, manifest versionado ni asociación fuente→template; se infiere por filenames y parámetros.
- “Multiview” solo puede construirse externamente usando varios templates. El motor genera todas las combinaciones, no front/back/left/right dirigidos.
- `center` se calcula y serializa pero el generador posiciona desde el `bbox`; no usa `center`.
- Tras rotar con `expand=True`, posiciona por el tamaño rotado desde el bbox. No recentra con el centro detectado; necesita pruebas visuales para placements inclinados.
- `fill` calcula un tamaño mayor, pero no recorta explícitamente al bbox ni aplica máscara: el diseño puede invadir el mockup.
- No elimina el placeholder coloreado ni aplica deformación, perspectiva, displacement, shading, blend mode o oclusiones.
- El tamaño final es el tamaño nativo del template; no existe parámetro de output width/height.
- Acepta transparencia de entrada y conserva alpha en PNG/WebP; JPEG la elimina.
- El paralelismo y la carga completa de imágenes pueden elevar memoria con templates grandes.

### Qué puede reutilizarse directamente

- `BoxParameters`, detección de placeholders, JSON de parámetros.
- Escalado, rotación, alpha compositing y formatos.
- `GenerationResult`, batch y manejo de fallos como núcleo de worker.
- Tests unitarios de utilidades/calculador como base.

### Qué necesita adapter

- `MockupManifest` → `BoxParameters`/opciones del generador.
- `sourceViewId` → PNG temporal/objeto de storage.
- `mockupId/template` → filename exacto esperado por parámetros.
- Resultado de archivo → StorageProvider/URL/caché.
- Invocación por trabajo, no por directorios cartesianos.

### Qué necesita evolucionar

- API de una sola operación con bytes/streams o paths controlados.
- Validación versionada del manifest y dimensiones.
- Mapeo explícito multivista.
- Máscaras/recorte correcto y colocación rotada centrada.
- Límites de resolución/memoria, timeouts, observabilidad y sandbox de paths.
- Worker backend/cola para producción y una vía rápida de baja resolución.
- Pruebas visuales golden; los tests actuales no demuestran calidad fotográfica.

### Qué NO debe formar parte del editor

- Detección de placeholders, procesamiento batch, Pillow/OpenCV/scikit-image, acceso a filesystem, generación final o reintentos. Debe ser un **Mockup Rendering Engine backend separado**.

## Mockup Manifest propuesto

Basado solo en capacidades existentes:

```js
{
  schemaVersion: 1,
  mockupId: "mug-white-front",
  template: "templates/mug-white-front.png",
  sourceViewId: "wrap",
  placement: {
    bbox: [minRow, minCol, maxRow, maxCol],
    width,
    height,
    rotation,
    center: [x, y],
    alignment: "center",             // enum real de Alignment
    scaleMode: "fit"                 // fit|fill|stretch|none
  },
  output: {
    sizeMode: "template",            // el motor conserva tamaño del template
    format: "PNG",                   // PNG|JPEG|WEBP
    quality: 95,                      // efectivo hoy para JPEG
    filenamePattern: "{design}_{mockup}"
  }
}
```

No se incluye perspective, warp, mask, shadow ni escala numérica porque el motor no los soporta. `center` se conserva por compatibilidad con el calculador, aunque requiere evolución para influir en composición.

## Integración automated_mockups

```text
DesignDocument
  -> ProductionRenderer renderiza una vista PNG transparente
  -> guarda asset temporal/versionado
  -> MockupAdapter resuelve manifest
  -> job backend Mockup Rendering Engine
  -> guarda resultado y devuelve asset/URL
```

- Frontend: preview inmediato barato del diseño; nunca Python ni producción final.
- Backend: mockup final. Síncrono solo para preview pequeño con timeout estricto; asíncrono para alta resolución, varias vistas o checkout/producción.
- Caché por hash de `DesignDocument version + sourceView + manifest revision + output options`.
- Regenerar al solicitar mockup tras cambios; congelar/generar artefactos de producción al confirmar pedido.
- Preview rápido y artefacto de producción deben ser salidas distintas.

## Fabric.js

Repositorio auditado: Fabric.js 7.4.0, MIT.

### Qué resuelve mejor que el Konva actual

- `IText`/`Textbox` ofrecen edición directa de texto, selección/cursor y wrapping; V1 edita texto fuera del canvas.
- Controles de objeto integrados y extensibles para resize/rotate/skew y hit areas táctiles.
- Selección múltiple (`ActiveSelection`) y grupos.
- Clip paths en canvas, objetos y grupos.
- Orden de objetos y operaciones de stacking.
- Serialización/re-hidratación (`toObject/toJSON/loadFromJSON`) útil dentro del adapter.
- Export PNG (`toDataURL`) y SVG.
- Zoom/viewport nativos.
- Filtros de imagen y extensiones locales de cropping/alignment disponibles en el repo.
- Modelo de objetos más cercano a un editor visual que la capa declarativa de shapes usada por V1.

### Qué no resuelve por sí solo

- Contrato de negocio, versionado/migraciones, templates de producto y print areas.
- Undo/redo general; no existe history manager core.
- Autosave, asset storage, carga de fuentes, DPI, warnings de impresión.
- UX de capas/propiedades, accesibilidad, atajos, mobile layout.
- Snapping/guidelines como producto terminado: hay paquetes/ejemplos, pero requieren integración y QA.
- Render de producción, mockups fotográficos y 3D.

### Qué hay que construir igualmente

- `FabricAdapter`, normalización de transforms, reconciliación de eventos y view switching.
- Capa de selección independiente del documento persistido.
- Clip/overlay por print area, export limpio y renderer determinista.
- Historial por acciones, uploads, cache de imágenes, validadores y tests visuales.
- Gestión de CORS/taint y lifecycle/dispose.

### Integración React

No hay wrapper React oficial declarativo en este repo. La guía crea `new fabric.Canvas(canvasRef.current)` en `useEffect` y llama `canvas.dispose()` al desmontar. Esta integración imperativa es adecuada si queda encapsulada en un componente/adaptador; React no debe recrear objetos Fabric en cada render.

### Bundle/performance

- El artefacto local completo `dist/index.min.js` mide ~301 KB y ~94 KB gzip; no equivale necesariamente al chunk final tree-shaken.
- El V1 construido actualmente separa `vendor-konva` en ~283 KB y ~87 KB gzip, más ~18.5 KB/~6.3 KB gzip de la página.
- Fabric completo es comparable al coste actual de Konva, pero debe validarse con imports ESM y el build real de V2.
- La ruta V2 debe ser lazy y el canvas debe limitar cache/resolución de imágenes en móvil.

### Riesgo de migración e idoneidad

Riesgo medio: no por Fabric, sino por traducir coordenadas, preservar históricos y construir UX/producción. Al ser V2 nuevo y coexistente, el riesgo operacional baja. Fabric es idóneo si permanece detrás de `DesignDocument`; no lo es si se persiste su JSON.

## Konva vs Fabric

| Capacidad | Konva actual | Fabric.js | Mejor opción |
|---|---|---|---|
| Text editing | Input externo; `Konva.Text` no edita inline | `IText`/`Textbox` inline | Fabric |
| Image editing | Move/scale/rotate básico | Objeto imagen, crop extensible, filtros | Fabric |
| Resize | `Transformer`, lógica manual | Controles integrados | Fabric |
| Rotate | Sí | Sí | Empate |
| Multi-select | No implementado | `ActiveSelection` | Fabric |
| Grouping | No implementado | `Group` | Fabric |
| Clipping | No implementado | `clipPath` rico | Fabric |
| Layers/order | Array y botones manuales | Stacking nativo; UI aún propia | Fabric |
| Custom controls | Posible, no usado | API dedicada | Fabric |
| Serialization | Modelo propio simple | JSON rico, solo interno al adapter | Fabric |
| Export PNG | Sí, con stages ocultos | Sí, canvas/viewport/crop | Fabric |
| Undo/redo | 30 snapshots locales | No core; hay que construirlo | Empate |
| Zoom | No implementado | viewport/zoom nativo | Fabric |
| Snapping | No | No core terminado; extensión local | Ligera ventaja Fabric |
| Guidelines | No | Paquete local de aligning-guidelines | Fabric |
| Mobile | Tap básico; canvas fijo | Touch/pointer y hit areas; UX propia | Fabric |
| React integration | `react-konva` declarativo | Imperativo con ref/effect | Konva |
| Maintainability | V1 monolítico y específico | Mejor base de editor si se encapsula | Fabric V2 |
| Ecosystem | Sólido para canvas/escenas | Más orientado a editores 2D | Fabric |
| Bundle | Actual ~87 KB gzip vendor | Full local ~94 KB gzip | Similar; medir build |
| Learning curve | Menor por experiencia actual | API amplia y lifecycle imperativo | Konva |

Recomendación: **B. Fabric para V2**. No reutilizar V1 como base. Konva podría construir un editor equivalente, pero exigiría implementar más infraestructura editorial y perpetuaría el acoplamiento actual.

## Three.js

Repositorio auditado: Three.js r186 (`0.186.0`), MIT.

### Flujo de diseño 2D a 3D

```text
DesignDocument
  -> renderer 2D produce canvas/PNG por sourceViewId
  -> CanvasTexture(canvas)
  -> texture colorSpace/flipY/transform según modelo
  -> material.map = texture; material.needsUpdate = true
  -> mesh con UVs correctas
  -> renderer + camera + OrbitControls
```

`CanvasTexture` marca `needsUpdate` inicialmente. Cambios posteriores deben marcarla de nuevo. La textura no corrige UVs defectuosas ni decide qué mesh/material representa cada vista.

### Requisitos de modelos 3D

- GLB/GLTF optimizado, con UVs no solapadas y orientadas para el artwork.
- Mesh y material con nombres estables y únicos para bindings.
- Escala, pivot, cámara y bounding box coherentes.
- Separación de materiales cuando front/back o wrap requieran texturas distintas.
- Iluminación/material PBR preparado y color management validado.
- Compresión/LOD y licencia de cada modelo/texture documentadas.
- Tests visuales por binding; un manifest no puede reparar un modelo mal preparado.

### Riesgos de performance

- Core local `three.module.js`: ~675 KB/~131 KB gzip antes del tree shaking; GLTFLoader ~124 KB/~26 KB gzip y OrbitControls ~43 KB/~9 KB gzip como fuentes independientes.
- GLB, texturas, shader compilation y memoria GPU dominan el coste real.
- CanvasTexture grande se duplica en memoria CPU/GPU; actualizarla en cada pointermove es caro.
- WebGL context loss, móviles térmicamente limitados y múltiples pestañas.
- Hay que detener animation loop y hacer `dispose()` de controls, geometries, materials, textures y renderer al salir.

### Productos

- 3D con valor: taza/botella (wrap), gorra (curvatura), camiseta/sudadera si el modelo y UVs son excelentes.
- 3D no prioritario: imán/placa/bolsa/cojín planos cuando un mockup 2D comunica igual o mejor.
- Carga: `import('three')`, `GLTFLoader` y `OrbitControls` solo al pulsar tab 3D; después cargar el GLB. Nunca en el bundle inicial ni al abrir Design/Mockup.

## 3D Manifest conceptual

```js
threeD: {
  modelUrl: "/models/mug-11oz.glb",
  bindings: [
    {
      sourceViewId: "wrap",
      meshName: "MugBody",
      materialName: "Printable"
    }
  ]
}
```

Es opcional. Una revisión futura puede añadir transform de textura/cámara solo cuando los assets reales lo exijan.

## UX objetivo desktop

- Header compacto: producto/variante, estado de guardado, undo/redo, zoom, modos y CTA.
- Columna izquierda 240–280 px: Texto, Imagen, Diseños y Formas; no formularios largos permanentes.
- Centro flexible: canvas protagonista, fondo neutro, zoom-to-fit y print area/safe area distinguibles sin contaminar export.
- Panel derecho 280–320 px: capas y propiedades contextuales; ocultable en pantallas medianas.
- Barra inferior: vistas reales del template, `Design | Mockup | 3D`, errores de impresión y CTA.
- Edición directa de texto; inspector para valores precisos.
- CTA “Guardar diseño” siempre visible, pero bloquea solo ante errores reales, no warnings.
- Mockup/3D leen el mismo documento y nunca reemplazan el estado editable.

## UX objetivo mobile

- Canvas ocupa la mayor parte del viewport y se ajusta a ancho; no canvas fijo con scroll horizontal.
- Top bar mínima con volver, nombre, undo/redo y guardado.
- Toolbar inferior con Texto, Imagen, Diseños, Capas y Más.
- Bottom sheets para propiedades/capas; una sola hoja abierta.
- Handles táctiles más grandes, drag con umbral, pinch-to-zoom y pan solo en modo/gesto claro.
- Tap selecciona; doble tap texto entra a edición; acciones delete/duplicate accesibles también en sheet.
- CTA sticky sobre safe-area del dispositivo.
- Cambio de orientación conserva zoom/selección sin alterar coordenadas.
- Mockup y 3D son pantallas/modos, no sidebars reducidas.

## Features Core V2

### MVP obligatorio

- Ruta/flag/lazy y shell responsive.
- Cargar `ProductTemplate` versionado y crear `DesignDocument` versionado.
- Vistas y print areas; cambiar vista sin perder estado.
- Añadir/editar texto; upload de imagen; mover, resize uniforme, rotate, delete y duplicate.
- Selección, lista de capas, reorder, lock/hide básico.
- Undo/redo por acciones semánticas.
- Zoom, zoom-to-fit y reset.
- Clipping visual, safe-area warning y export PNG limpio por vista.
- Autosave local de documento y referencias de assets.
- Estados loading/error/empty, teclado básico y responsive real.
- Sin carrito/pedido en la primera fase.

### Segunda fase

- Multi-select/grouping, snapping/guidelines y crop.
- Shapes más amplias, design templates y fuentes gestionadas.
- Filtros de imagen.
- Mockup live/final y backend persisted drafts.
- Warning de baja resolución cuando existan dimensiones físicas.
- Background removal futuro.
- 3D opcional.

## ProductTemplate propuesto

```js
{
  schemaVersion: 1,
  templateId: "mug-11oz",
  templateRevision: 1,
  productType: "mug",                 // metadato, no branching del editor
  label: "Taza 11 oz",
  editor: {
    coordinateSystem: "normalized-print-area",
    viewport: { aspectRatio: 1.2 },
    background: "#f4f4f5"
  },
  views: [
    {
      id: "wrap",
      label: "Diseño envolvente",
      baseImage: { assetId: "template:mug-11oz:wrap" },
      printAreas: [
        {
          id: "main",
          label: "Área imprimible",
          x: 0.12, y: 0.20, width: 0.76, height: 0.52,
          shape: { type: "rect" },
          clip: { enabled: true, type: "shape" },
          safeArea: { inset: null },
          bleed: null,
          physicalSize: null,
          constraints: {
            allowedElementTypes: ["text", "image", "shape"],
            minScale: null,
            maxScale: null,
            rotation: { mode: "free" }
          }
        }
      ]
    }
  ],
  mockups: [],
  threeD: null
}
```

Todos los campos físicos/restricciones desconocidos permanecen `null`; no se inventan datos de imprenta.

## PrintArea

```js
{
  id,
  label,
  x, y, width, height,                  // normalizados en la vista
  shape: { type: "rect" | "ellipse" | "path", pathData? },
  clip: { enabled, type: "shape" | "path", pathData? },
  safeArea: { inset: null | { top, right, bottom, left } },
  bleed: null | { top, right, bottom, left },
  physicalSize: null | { width, height, unit: "mm" },
  constraints: {
    allowedElementTypes: ["text", "image", "shape"],
    minScale: null,
    maxScale: null,
    rotation: { mode: "free" | "locked" | "range", min?, max? }
  }
}
```

El editor opera por datos del template; no pregunta si el producto es taza/camiseta/gorra.

## DesignDocument propuesto

```js
{
  schemaVersion: 1,
  documentId: "uuid",
  templateId: "mug-11oz",
  templateRevision: 1,
  productId: "...",
  variant: { size: null, color: "Blanco" },
  assets: {
    "asset-1": { assetId: "asset-1", kind: "image", storageKey: "...", widthPx: 2400, heightPx: 1800 }
  },
  views: {
    wrap: {
      elements: []
    }
  },
  metadata: {
    createdAt,
    updatedAt
  }
}
```

No contiene previews, mockups ni Fabric JSON como fuente de verdad. Son artefactos derivados.

### Coordenadas normalizadas vs absolutas

- Absolutas en píxeles simplifican Fabric, pero acoplan documento a viewport/export y rompen al cambiar template.
- Normalizadas mejoran portabilidad, responsive y render a varias resoluciones, pero requieren conversión precisa y reglas claras de anchor.
- Recomendación: coordenadas y dimensiones normalizadas **respecto al print area propietario**, no a la pantalla; ángulo en grados. El adapter convierte a unidades Fabric. `physicalSize` opcional del template permite producción/DPI sin contaminar el documento.

## Element model

Campos comunes:

```js
{
  id,
  type: "text" | "image" | "shape" | "background",
  printAreaId,
  x, y, width, height,                   // normalizados; anchor top-left
  scale: { x: 1, y: 1 },
  rotation: 0,
  opacity: 1,
  zIndex: 0,
  locked: false,
  hidden: false
}
```

Texto:

```js
{
  ...common,
  type: "text",
  text,
  font: { family, assetId: null },
  size,                                 // normalizado a la altura del print area
  weight: 400,
  alignment: "left" | "center" | "right",
  fill: "#000000",
  lineHeight: 1.2,
  letterSpacing: 0
}
```

Imagen:

```js
{
  ...common,
  type: "image",
  assetId,
  crop: { x: 0, y: 0, width: 1, height: 1 },
  filters: []
}
```

Forma:

```js
{
  ...common,
  type: "shape",
  shape: "rect" | "ellipse" | "line",
  fill,
  stroke: { color, width }
}
```

No se guardan nombres de clases, matrices o filtros internos de Fabric.

## Versionado

- `ProductTemplate.schemaVersion` versiona la forma del contrato; `templateRevision` versiona cambios de una plantilla concreta.
- `DesignDocument.schemaVersion` versiona el documento.
- Lectores aceptan versiones conocidas; writers emiten solo la actual.
- Registro futuro de migraciones puras `vN -> vN+1`, idempotentes, con fixtures de regresión.
- Nunca reescribir históricos en masa como condición de despliegue. Migrar al leer y persistir solo tras acción explícita/guardado seguro.
- Un documento conserva `templateRevision` para detectar incompatibilidades en vez de reinterpretarse silenciosamente.

## LegacyCustomizationAdapter

### Legacy → V2

- Detecta wrapper `type: designer`, `designVersion` ausente/1/2.
- Mapea `front/back` a view IDs declarados por el ProductTemplate de compatibilidad.
- Convierte coordenadas desde stage legacy y print area legacy a coordenadas normalizadas.
- Traduce `order` a `zIndex`; si falta, usa orden del array.
- Convierte `url` Data URL/remota a `Asset` legacy referenciado, sin borrar el origen.
- Conserva `clientId`, variante y previews como artefactos históricos separados.

### V2 → legacy mínimo

- Solo para templates marcados como `legacyCompatible` con mapeo exacto a front/back.
- Renderiza `previewsBySide` y un `elementsBySide` compatible cuando no haya pérdida.
- Envuelve con `clientId`, `type: designer`, `designVersion: 2`, `productId`.
- Si existen más vistas, múltiples print areas o elementos no representables, devuelve error de compatibilidad. No omite datos.
- Cart/Order no debe ver Fabric JSON.

## Fabric Adapter

- Construye objetos Fabric desde `DesignDocument` + vista + template.
- Convierte coordenadas normalizadas ↔ viewport Fabric.
- Mantiene mapa `elementId -> FabricObject`.
- Traduce eventos `added/modified/removed/text:changed/selection` a acciones de dominio.
- Evita bucles al rehidratar/reconciliar.
- Aplica controles, locks, visibilidad, z-order y clip por print area.
- Gestiona selección y vista como estado de sesión, no persistente salvo necesidad.
- Exporta artwork limpio por vista/área sin overlays ni selección.
- Libera canvas, listeners, imágenes y caches al desmontar/cambiar template.

## State management

| Opción | Evaluación |
|---|---|
| `useReducer` | Buena para acciones/documento en una primera vertical; incómoda con muchos paneles, selección y async assets |
| Zustand | Mejor ajuste: store pequeño, selectores, acciones, poco boilerplate, fuera del árbol React |
| Redux Toolkit | Robusto/devtools, pero excesivo para un editor encapsulado salvo integración global futura |
| Store propio | Evita dependencia, pero recrea suscripciones, selectores, devtools y edge cases |

Recomendación: diseñar primero reducer/actions puros y adoptar **Zustand** en una SPEC posterior explícita para orquestación de sesión. No añadirlo ahora. Mantener separados `documentState` (persistible), `sessionState` (selection/zoom/mode) y `asyncState` (assets/renders).

## Undo/redo

Usar snapshots inmutables de `DesignDocument` por transacción semántica, con structural sharing y límite configurable. No guardar PNG, Fabric JSON, selección, zoom ni blobs.

- Drag/resize/rotate: un paso al finalizar gesto, no uno por pointermove.
- Typing: agrupar por sesión/debounce.
- Cambio de vista/zoom/selección: no entra en historial.
- Upload: una acción que referencia `assetId`; el asset lifecycle se gestiona aparte.
- Command pattern añade complejidad de inversión; patches requieren infraestructura/dependencia adicional. Snapshots son la opción MVP más fiable.

## Autosave

- MVP: IndexedDB para documento, metadatos y blobs/asset cache; localStorage solo índice pequeño y preferencias.
- Debounce tras acciones semánticas y flush en `visibilitychange` cuando sea viable.
- Clave por `draftId/productId/templateId/templateRevision` y estado de recuperación visible.
- No guardar Data URLs grandes en localStorage.
- Futuro: backend persisted draft con revision/etag y conflictos explícitos; assets subidos antes o mediante URLs firmadas.

## Asset management

```text
Upload -> validate/decode -> Asset -> assetId -> StorageProvider
                                  -> DesignDocument referencia assetId
```

- Asset contiene dimensiones, MIME verificado, tamaño, checksum/storageKey y estado.
- Preview local puede usar Object URL y blob IndexedDB.
- Documento no duplica base64.
- Compatibilidad: adapter encapsula Data URL legacy como asset `provider: legacy-inline` hasta migración no destructiva.

## Low resolution warning

Con dimensiones físicas reales:

```text
usedSourcePixels = sourcePixels * cropFraction
printInches = printMillimeters / 25.4
effectiveDPI = usedSourcePixels / printInches
```

Calcular por eje y usar el menor. Escalado hacia arriba reduce DPI; crop usa solo píxeles efectivos. Los umbrales deben venir de ProductTemplate/print profile y pueden ser `null`. Sin tamaño físico/técnica de impresión no se emite un veredicto inventado.

## Design templates futuros

Un layout prediseñado es un `DesignDocumentFragment` versionado con `templateCompatibility`, assets y elementos por vista. Al aplicarlo se generan IDs nuevos, se resuelven assets y se valida contra print areas. No es JSON Fabric ni un catálogo embebido en el editor.

## Productos iniciales

| Producto | Views | Print Areas | Mockup | 3D recomendado |
|---|---|---|---|---|
| Camiseta | front, back | 1 por vista inicialmente | 2D por vista; prendas requieren máscara/deformación para alta fidelidad | Después, si hay GLB/UVs buenos |
| Sudadera | front, back | 1 por vista; ampliar solo con datos reales | Igual que camiseta, con oclusiones/costuras | Después |
| Taza | wrap | 1 envolvente | Motor actual solo overlay plano; necesita evolución para curvatura real | Sí, alto valor futuro |
| Gorra | front inicialmente | 1 frontal | Motor actual insuficiente para curvatura/visera | Sí, pero asset complejo |
| Imán | front | 1, shape según troquel real | Overlay 2D directo, ideal | No |

No se fijan tamaños/bleed/safe areas hasta disponer de especificaciones de producción.

## Producto piloto

Evaluación:

- Imán: menor riesgo y mockup fácil, pero valida poco más que un editor plano.
- Camiseta: valor visible y continuidad, pero puede esconder assumptions heredadas de ropa.
- Taza: rompe front/back, obliga a modelar una vista wrap, demuestra universalidad y prepara 3D; el mockup fotográfico real es más difícil.

Recomendación: **taza como piloto funcional de V2**, con una primera preview 2D honesta y 3D fuera del MVP. Si no existen medidas/asset de producción verificables al comenzar SPEC-020D, usar imán como vertical técnica temporal y no inventar el template de taza.

## Performance y lazy loading

Budgets iniciales, sujetos a medición en SPEC-020A:

- Bundle inicial ecommerce: incremento 0 por Fabric/Three.
- Chunk JS del editor 2D: objetivo ≤150 KB gzip; el artefacto Fabric local completo (~94 KB gzip) y el Konva actual (~87 KB gzip) hacen el límite verificable.
- Three+loader+controls: chunk opt-in objetivo ≤180 KB gzip antes de modelo; evidencia local suma aproximadamente 165 KB gzip sin tree shaking.
- GLB inicial: objetivo ≤3 MB transferido y texturas preview 1024 móvil/2048 desktop como punto de partida, ajustado por pruebas visuales y memoria.
- Interacción: objetivo 60 fps desktop y ≥30 fps móvil de referencia; ninguna actualización de textura 3D por cada pointermove si no es necesaria.
- Export alta resolución fuera del hilo crítico; imágenes decodificadas/downsampled para preview.
- Prueba de fuga: cinco ciclos abrir/cerrar modo 3D sin crecimiento sostenido de geometrías/texturas/contexts.

Budgets son guardrails de aceptación, no límites de impresión. Deben medirse con builds y dispositivos de referencia.

## Accessibility

- Toolbar, botones, inputs y tabs con nombres accesibles y orden de foco lógico.
- Lista de capas como interfaz alternativa: seleccionar, renombrar, ocultar, bloquear, reordenar y borrar.
- Panel de propiedades permite modificar posición/tamaño/rotación sin depender de drag.
- Atajos con ayuda visible: delete, duplicate, undo/redo, arrows; no capturar teclas mientras se edita texto.
- Focus ring, announcements de selección/errores/guardado y contraste de print/safe area.
- El canvas no será plenamente interpretable por lector de pantalla. La accesibilidad real proviene del DOM paralelo y operaciones equivalentes; no se debe prometer accesibilidad total del bitmap.

## Licencias

| Repo | Licencia | Uso comercial | Obligación principal |
|---|---|---|---|
| Fabric.js 7.4.0 | MIT | Sí | Conservar copyright y texto de licencia en copias/porciones sustanciales |
| Three.js r186 | MIT | Sí | Igual |
| automated_mockups 1.0.0 | MIT | Sí | Igual; copyright 2023 David Bogdanov |

Son viables comercialmente. Deben conservarse avisos en distribución/third-party notices. Assets, fuentes y modelos 3D tienen licencias independientes y deben inventariarse.

## Seguridad

- Uploads: verificar magic bytes, allowlist de formatos, límites de tamaño/dimensiones/píxeles, timeout de decode y protección frente a decompression bombs.
- SVG futuro: no aceptar crudo en DOM/canvas sin sanitización estricta; preferir rasterización aislada. Rechazar scripts, external refs y foreignObject.
- Imágenes externas: allowlist/proxy backend controlado; evitar SSRF, redirects privados y tracking. CORS correcto para evitar canvas tainted.
- Texto: Fabric dibuja glyphs y React escapa texto, pero validar longitud/control characters y no convertir contenido a HTML.
- Filenames: IDs generados y storage keys normalizadas; no confiar en nombre cliente ni permitir traversal.
- URLs: no permitir esquemas arbitrarios; distinguir `blob:`, `data:` legacy y HTTPS controlado.
- Mockup worker: paths resueltos dentro de roots, límites de CPU/memoria y outputs no ejecutables.
- `clientId` no autoriza acceso. Drafts/assets backend deben comprobar owner/guest session.

## Make or buy

| Opción | Resultado local |
|---|---|
| A. Fabric V2 propio | Mejor equilibrio entre UX, control de contrato y extensibilidad; trabajo relevante pero acotable |
| B. Evolucionar Konva/V1 | Konva es capaz, pero V1 exige desmontar acoplamientos y construir edición textual/editorial; mayor riesgo sobre flujo estable |
| C. Editor externo/comercial | No evaluable seriamente con repos locales; añade lock-in, coste, privacidad y adapters. Requiere auditoría separada |
| D. Canvas/DOM propio | Coste alto y poco valor frente a Fabric |

Decisión: construir V2 propio con Fabric. No usar coste hundido. Mantener una puerta arquitectónica: `DesignDocument` permite cambiar renderer o integrar proveedor futuro sin cambiar Cart/Order.

## Arquitectura final

```text
Product
  |
  v
ProductTemplate Repository -----> ProductTemplate vN
                                  |
                                  v
                         Designer V2 Shell
                         |        |       |
                         |        |       +--> SessionState (selection/zoom/mode)
                         |        +----------> AssetManager -> StorageProvider
                         v
                    DesignDocument vN
                         |
          +--------------+------------------+
          |              |                  |
          v              v                  v
     FabricAdapter  ProductionRenderer  DraftRepository
          |              |
          v              +--> transparent PNG/view
     Fabric Canvas             |
                              +--> MockupAdapter -> backend job -> automated_mockups
                              |
                              +--> ThreeAdapter (lazy, optional)
                                      -> CanvasTexture -> GLB mesh/material

DesignDocument
  -> LegacyCustomizationAdapter / future CartAdapter
  -> CartLineV2 (unchanged initially)
  -> Checkout
  -> Order.customizationId
  -> Customization / Admin / Production / ZIP
```

## Fases propuestas

### SPEC-020A — Designer V2 Foundation

- Contratos/validadores v1, ruta lazy, flag, shell responsive, modes y fixture no comercial.
- V1 intacto; ProductDetail ofrece CTA bajo flag.
- Progreso visible: página V2 y canvas/print area read-only.

### SPEC-020B — Fabric Core Editing

- FabricAdapter mínimo; texto, imagen, move/resize/rotate/delete/duplicate, selección y export limpio.
- Sin carrito, mockup ni 3D.

### SPEC-020C — Document State, Layers and History

- Store elegido explícitamente, acciones, layers, lock/hide, undo/redo, view switching y tests de round-trip.

### SPEC-020D — Mobile, Autosave and Assets

- Toolbar/bottom sheets, touch/zoom, IndexedDB draft, Asset model local y recuperación.

### SPEC-020E — Universal Templates and Pilot Mug

- Repository de ProductTemplate, taza verificada, wrap view, print/safe area con datos reales y warning básico.
- Si faltan datos reales, vertical temporal de imán.

### SPEC-020F — Mockup Rendering Engine

- MockupManifest, adapter, hardening de placement/mask, API/job backend, storage/caché y preview vs producción.

### SPEC-020G — Cart/Order/Admin/ZIP Integration

- Legacy adapter bidireccional limitado, persistencia V2 no destructiva, producción y regresiones históricas.
- No integrar productos no representables mediante pérdida silenciosa.

### SPEC-020H — More Product Types

- Camiseta, sudadera, imán y después gorra; templates/assets reales y QA por producto.

### SPEC-020I — Optional Three.js Preview

- 3D manifest, GLB pipeline, lazy tab, bindings, disposal, budgets y fallback 2D.

Este orden mueve Cart/Order antes de 3D: aporta valor comercial y valida producción sin convertir 3D en dependencia del lanzamiento.

## Riesgos

1. Persistencia actual solo front/back y schema estricto: V2 universal no cabe sin fase backend explícita.
2. `order` de capas no está en `ElementSchema`; históricos pueden no conservar orden editable aunque el PNG sí.
3. automated_mockups no produce hoy mockups curvos/perspectivos de calidad para taza/prenda.
4. Falta de dimensiones/bleed/DPI reales puede generar falsa precisión.
5. CORS/Data URLs y assets grandes pueden romper export, storage y memoria móvil.
6. Fabric event reconciliation puede crear loops o historial ruidoso si no existe adapter estricto.
7. Fuentes no disponibles cambian métricas y output; requieren asset/licencia/carga determinista.
8. Modelos 3D sin UV/naming contractual invalidan bindings y multiplican soporte.
9. Persistir Fabric JSON crearía lock-in y migraciones frágiles.
10. Integrar V2 al carrito antes de cerrar contrato de producción puede generar pedidos no fabricables.
11. Feature flag solo frontend no es control de seguridad; V2 debe validar igualmente backend cuando se integre.

## Recomendación final

Construir ProductDesigner V2 desde cero con **React + Fabric.js**, `ProductTemplate` universal, `DesignDocument` propio versionado y adapters estrictos. Mantener V1 dormido en su ruta actual y V2 bajo flag/ruta lazy. Convertir `automated_mockups` en servicio backend 2D, tras corregir sus límites de placement/masking y añadir manifest/job/storage; no usarlo dentro del editor. Dejar Three.js para una fase opcional posterior a la integración de producción.

La primera vertical debe ser visible desde SPEC-020A, pero no tocar Cart/Checkout/Order hasta SPEC-020G. El piloto recomendado es taza porque valida el modelo universal; si faltan datos de producción, iniciar técnicamente con imán sin inventarlos.
