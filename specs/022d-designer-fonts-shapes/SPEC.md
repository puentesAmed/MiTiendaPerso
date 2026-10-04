# SPEC-022D — Designer Fonts & Shapes

## Objetivo

Ampliar Designer V2 con un catálogo controlado de tipografías y formas básicas editables, manteniendo `DesignDocument` como única fuente de verdad y garantizando que edición, previews, proofs y producción interpreten el mismo contrato.

## Auditoría previa

- `DesignDocument` usa `schemaVersion: 1` y persiste exclusivamente datos de dominio. `fabric`, canvas, PNG, zoom y selección están prohibidos.
- `DESIGN_ELEMENT_TYPES` ya reserva `text`, `image` y `shape`, pero `shape` no tiene contrato específico, acción de creación, UI, adapter ni validación productiva.
- Los textos guardan contenido, tamaño, color, alineación y peso, pero no identidad de fuente. `FabricAdapter` aplica Inter mediante un string hardcodeado.
- No existen fuentes web autocontenidas ni `@font-face`; la apariencia actual depende de fuentes instaladas/fallback del cliente.
- `FabricAdapter` renderiza texto e imagen. `ArtworkRenderer` y `PlacementProofRenderer` delegan el artwork en ese adapter, por lo que es el punto común de paridad visual.
- Drafts e historial conservan el documento completo; las operaciones genéricas de update, duplicate, delete, lock, hide y z-order ya son reutilizables por shapes.
- El handoff produce artwork/proof en el navegador y el backend persiste esos rasterizados junto con metadata. Actualmente no valida tipos, fuentes ni propiedades de shape.
- La metadata productiva identifica texto sin fuente y deja cualquier shape reducido a los campos geométricos base.

## Alcance

- Registro declarativo y compartido de fuentes permitidas, con IDs estables, familia, categoría, pesos admitidos, fallback y assets locales.
- Carga bajo demanda, cacheada y observable de fuentes; nunca se aceptan URL, CSS o familias arbitrarias desde el documento.
- Selector de fuente agrupado por categoría y con búsqueda.
- Contrato de dominio `shape` con catálogo cerrado: rectangle, circle, triangle, star, heart y line.
- Edición de fill, stroke, strokeWidth y opacity, además de transformaciones, duplicate, delete, lock, hide y z-order existentes.
- Render consistente mediante `FabricAdapter`, `ArtworkRenderer`, `PlacementProofRenderer`, drafts, historial y metadata productiva.
- Validación frontend y backend de fuentes, shapes y valores numéricos.

Quedan fuera productos, pricing, shipping, pagos, carrito, quality gate de imágenes, proveedores, IA, stickers externos, iconos externos y SVG arbitrario.

## FontRegistry

El registro común es código de dominio puro, importable por frontend y backend. Cada entrada declara:

```js
{
  id,
  label,
  family,
  category: "Modernas" | "Elegantes" | "Decorativas / manuscritas" | "Display",
  weights: [400, 500, 600, 700],
  fallback,
  source: "/fonts/…-variable.woff2",
  sources: { 400: "/fonts/…-400.woff2" },
  license: "/fonts/…-OFL.txt",
  enabled: true
}
```

`source` se usa cuando un único WOFF2 variable cubre todos los pesos registrados. `sources` se usa para familias con binarios estáticos por peso. Cada peso declarado debe resolver exactamente a uno de esos assets locales.

El `DesignDocument` almacena `fontId` y `fontWeight`, nunca una URL, una regla CSS ni una familia libre. La familia efectiva se resuelve desde el registro. Los documentos v1 históricos sin `fontId` se normalizan al ID por defecto al restaurar/validar en frontend; los nuevos documentos siempre lo escriben. No se cambia `schemaVersion` porque el tipo `shape` ya estaba reservado y los campos nuevos son extensiones tipadas del elemento.

## Fuentes

Se incorpora un catálogo de doce familias comercialmente utilizables bajo SIL Open Font License, agrupadas sin taxonomía adicional:

- Modernas: Inter, Montserrat, Poppins, Roboto y Open Sans.
- Elegantes: Playfair Display, Merriweather y Libre Baskerville.
- Decorativas / manuscritas: Pacifico, Dancing Script y Caveat.
- Display: Bebas Neue.

Los IDs existentes permanecen estables. Los binarios WOFF2 y sus licencias se sirven desde `frontend/public/fonts/designer/`; no se usa CDN en runtime. Cada fuente/peso se carga únicamente cuando aparece en el documento o se elige en el selector.

La carga mantiene una promesa por `fontId + weight`, usa `FontFace`/`document.fonts`, invalida el canvas al completarse y expone error explícito. Preview y handoff esperan a que todas las fuentes del documento estén disponibles. Si una fuente no se puede cargar, la edición puede mostrar el fallback declarado y el handoff productivo se bloquea; nunca se confirma silenciosamente un raster con sustitución.

## Contrato Shape

```js
{
  id,
  type: "shape",
  shapeType: "rectangle" | "circle" | "triangle" | "star" | "heart" | "line",
  printAreaId,
  x, y, width, height,
  rotation,
  scale: { x, y },
  opacity,
  zIndex,
  locked,
  hidden,
  fill,
  stroke,
  strokeWidth
}
```

`shapeType` pertenece a un catálogo cerrado. `fill` y `stroke` son colores CSS hex controlados; `strokeWidth` es finito, no negativo y normalizado respecto al área de impresión. Una línea puede usar `fill: "none"`, pero sigue requiriendo stroke visible. No se admiten paths, SVG ni geometría suministrada por el cliente.

## Semántica de render

- Rectangle, circle y triangle usan primitivas Fabric.
- Star usa puntos deterministas generados por el adapter.
- Heart usa un path interno constante del catálogo, nunca contenido del documento.
- Line usa una primitiva lineal determinista.
- La geometría persistida continúa normalizada al print area. El adapter absorbe la escala Fabric dentro de width/height mediante el contrato existente.
- El orden se deriva de `zIndex`; hidden no se renderiza y locked solo afecta interacción.
- Texto y shape usan el mismo clip de print area que imagen.

## UI

- La herramienta Formas abre una paleta compacta accesible con las seis opciones.
- Añadir una forma la crea centrada en el área activa, la selecciona y genera una entrada de historial.
- Propiedades de texto añaden búsqueda/selector de fuente y solo muestran pesos soportados por la fuente seleccionada.
- Propiedades de shape permiten fill, stroke, strokeWidth y opacity. Las acciones genéricas permanecen en capas/propiedades.
- Desktop y móvil exponen las mismas capacidades funcionales sin introducir una nueva arquitectura de navegación.

## Drafts e historial

Drafts persisten `fontId` y el contrato shape como parte del `DesignDocument`. No persisten objetos Fabric. Undo/redo cubre alta de shape, selección de fuente y cambios de estilo usando el mecanismo de commits agrupados existente. Restore vuelve a cargar las fuentes referenciadas antes de considerar listo el render.

## Producción y seguridad

Antes de subir artwork/proof, frontend espera todas las fuentes del documento y rechaza IDs/pesos desconocidos. Backend vuelve a validar de forma autoritativa:

- tipos de elemento permitidos;
- `fontId` y peso presentes en FontRegistry;
- `shapeType` presente en el catálogo;
- campos geométricos finitos;
- opacity dentro de `[0, 1]`;
- `strokeWidth` finito y no negativo;
- colores permitidos;
- invariantes existentes de imagen/assets.

La placement metadata incluye identidad de fuente para texto y `shapeType`, fill, stroke y strokeWidth para shapes. No se confía en valores renderizados ni en URLs del navegador.

## Rendimiento

- No se precarga el catálogo completo.
- Cada archivo/peso se carga una sola vez y comparte promesa.
- Los WOFF2 variables se reutilizan entre sus pesos mediante cache HTTP; los estáticos declaran un asset real por peso.
- Reconciliación del canvas conserva objetos y solo recrea cuando cambia el tipo estructural.
- Búsqueda de fuente se resuelve localmente sobre un catálogo pequeño.
- Render productivo espera cargas ya cacheadas en la sesión.

## Criterios de aceptación

1. Un texto nuevo guarda el `fontId` por defecto y puede cambiar a cualquier fuente/peso permitido.
2. Fuente y peso sobreviven draft, restore, undo/redo, artwork, proof y metadata productiva.
3. Una fuente desconocida, peso no permitido o fallo de carga impide handoff productivo con error explícito.
4. Las seis formas pueden añadirse, transformarse, estilizarse, duplicarse, ocultarse, bloquearse, reordenarse y eliminarse.
5. Shapes sobreviven draft/restore e historial sin serializar Fabric.
6. Artwork y placement proof reproducen fuentes y shapes mediante el adapter común.
7. Backend rechaza tipo, fuente, shape, opacity, strokeWidth o números inválidos.
8. Assets de fuentes son locales, con licencia incluida, y no se aceptan recursos arbitrarios.
9. Tests específicos, lint frontend, build frontend, backend check y `git diff --check` pasan.

## Pruebas previstas

- Registro, resolución, búsqueda, pesos y carga/cache/error de fuentes.
- Catálogo completo de doce familias y presencia explícita de Poppins, Merriweather, Dancing Script y Caveat.
- Resolución de WOFF2 variable y estático por peso sin precarga global.
- Validación de texto con fuente válida, desconocida y peso incompatible.
- Alta/edición/duplicate/history/restore de cada shape.
- Adapter para las seis primitivas, fuente resuelta y reconciliación.
- Artwork/proof con texto no-default y shapes.
- Handoff bloqueado ante fuente no cargable.
- Backend aceptación válida y rechazo de IDs, tipos, números, opacity y strokeWidth inválidos.
- Placement metadata de texto y shape.
