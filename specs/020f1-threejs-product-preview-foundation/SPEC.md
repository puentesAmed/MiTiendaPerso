# SPEC-020F.1 — Three.js Product Preview Foundation

## Estado

Implementación automática completada (2026-09-29). Validación visual pendiente del usuario.

## Objetivo

Incorporar un preview 3D genérico y derivado para Designer V2:

`DesignDocument → ArtworkRenderer canvas → CanvasTexture → GLB registrado → binding declarativo → preview interactivo`.

Three.js es la capa principal cuando `ProductTemplate.threeD` referencia un modelo registrado. El mockup 2D permanece como fallback y para productos planos.

## Alcance

- Three.js `0.186.0` sin wrappers React.
- Carga dinámica exclusiva al entrar en modo `3D`.
- Contrato versionado `ThreeDManifest` y model registry controlado.
- Componente aislado `ThreeProductPreview`.
- Adapter responsable de renderer, escena, modelo, bindings, texturas, cámara, controles y lifecycle.
- Fixture GLB técnico de taza generado localmente con UVs y material imprimible separado.
- `CanvasTexture` construida desde el canvas limpio de `ArtworkRenderer`.
- Actualización de texturas sin recargar el modelo.
- Loading, error, context loss, resize, reset, captura técnica y dispose.
- Tests estructurales/unitarios; sin QA visual de Codex.

## Fuera de alcance

- ProductDesigner V1.
- Camisetas, gorras u otros productos concretos.
- Backend 3D, render server-side o persistencia de snapshots.
- Cart, Checkout, Order, Admin o ZIP.
- HDRI, auto-rotate, animación, edición de UVs o modelos productivos finales.
- Aprobación visual del modelo, curvatura o calidad del binding.

## Auditoría Three.js local

Se usa el repositorio local `three.js` versión `0.186.0` (r186), licencia MIT. Se confirmaron:

- `GLTFLoader` desde `three/addons/loaders/GLTFLoader.js`;
- `OrbitControls` con `dispose()` y limpieza de listeners;
- `CanvasTexture`, que marca `needsUpdate` al construirse;
- renderer con `SRGBColorSpace`, eventos de pérdida/restauración de contexto, `dispose()` y `forceContextLoss()`;
- materiales, meshes, bounding boxes y APIs de dispose del core.

No se incorporan modelos externos ni descargas de red.

## Dependencia y lazy loading

`three@0.186.0` se instala de forma exacta. Ningún módulo cargado en Home, catálogo, detalle, Cart, Checkout o Design importa Three estáticamente.

El modo `3D` usa dos fronteras dinámicas:

1. `React.lazy()` carga `ThreeProductPreview` solo al renderizar ese modo.
2. El runtime hace `Promise.all(import("three"), import(GLTFLoader), import(OrbitControls))`.

El build debe demostrar un chunk Three separado y 0 KB de impacto en los chunks iniciales del ecommerce.

## ProductTemplate.threeD

Contrato mínimo:

```js
threeD: {
  modelId: "mug-development-v1"
}
```

`ProductTemplate` no contiene URLs, nombres de archivos ni lógica del producto. `threeD: null` continúa siendo válido para productos planos.

## ThreeDManifest

```js
{
  schemaVersion: 1,
  revision: 1,
  modelId,
  asset: { url, kind: "development" },
  bindings: [{
    sourceViewId,
    meshName,
    materialName,
    texture: { colorSpace, flipY, wrapS, wrapT, offset, repeat, rotation }
  }],
  camera: { fov, direction, targetOffset, fitPadding },
  orbit: { enableRotate, enableZoom, enablePan, minDistanceFactor, maxDistanceFactor, minPolarAngle, maxPolarAngle, damping },
  background,
  lighting: { preset: "studio-soft" }
}
```

El validator comprueba versión, identificadores, asset registrado, bindings, transforms, cámara, órbita, background y preset. La validación contra el template confirma que cada `sourceViewId` existe.

## Model registry y seguridad

- El navegador solo resuelve `modelId` desde un registry empaquetado.
- No se aceptan URLs o modelos aportados por usuario/servidor.
- Los assets se sirven desde `public/models` del frontend.
- El runtime valida mesh, material, UVs y bounding box después de cargar.
- Un binding afecta únicamente al material objetivo del mesh objetivo.

## Modelo piloto

`mug-development-v1.glb` será generado por un script determinista del proyecto mediante primitivas Three.js:

- `MugBody` con material lateral `PrintableSurface` y tapas cerámicas separadas;
- `MugHandle` con material `CeramicDetail`;
- UVs estándar de `CylinderGeometry` para que la textura siga la superficie cilíndrica.

Es un fixture técnico propio, sin asset externo ni licencia ajena, y no representa dimensiones o calidad productiva.

## Artwork y CanvasTexture

`ArtworkRenderer` expone además un canvas limpio recortado al print area. No hay captura de UI ni encode/decode PNG para 3D.

Por binding:

- `CanvasTexture(canvas)`;
- `SRGBColorSpace`;
- `flipY` y transforms obtenidos del manifest;
- wrap y filtros declarativos;
- material objetivo clonado, conservando sus propiedades PBR;
- `needsUpdate` tras sustituir el canvas.

El adapter soporta múltiples bindings y canvases por `sourceViewId`.

## ThreeProductPreview

Responsabilidades:

- resolver manifest registrado;
- cargar runtime y modelo;
- producir artworks por vista;
- coordinar estados `loading-runtime`, `loading-model`, `preparing-texture`, `ready`, `error`;
- actualizar artworks con debounce cuando cambia el documento;
- ofrecer reset y fallbacks DOM;
- desmontar el adapter.

No contiene detalles de escenas, meshes o materiales.

## ThreePreviewAdapter

Responsabilidades:

- renderer, scene, camera, lights y OrbitControls;
- carga GLB única;
- validación runtime de modelo/bindings;
- clonación y binding de materiales;
- framing por `Box3` y preset relativo al tamaño;
- actualización de CanvasTexture sin recargar GLB;
- loop con damping;
- ResizeObserver y pixel ratio limitado a 2;
- context loss;
- captura PNG técnica;
- dispose completo de listeners, controles, texturas, geometrías, materiales y renderer.

## Cámara, controles e iluminación

- Encuadre derivado de bounding box, FOV y dirección declarativa.
- Target relativo al centro más `targetOffset`.
- Rotate y zoom habilitados; pan deshabilitado.
- Damping habilitado; autoRotate deshabilitado.
- Distancias y ángulos limitados por manifest.
- Iluminación `studio-soft`: hemisphere, key y fill/rim suaves, sin HDRI.

## Live update e historial

El modelo se carga una vez por montaje. Los cambios documentales regeneran solo los canvases y actualizan/reemplazan las CanvasTexture; no recargan el GLB.

El preview es derivado: no modifica `DesignDocument`, history, draft ni autosave. Selección, zoom y pan 2D no forman parte del input.

## Lifecycle, resize y contexto

- RAF cancelado al desmontar.
- OrbitControls y ResizeObserver desconectados.
- Listeners de contexto eliminados.
- CanvasTexture y materiales clonados liberados.
- Geometrías/materiales del GLB liberados porque el adapter posee la escena cargada.
- Renderer liberado y `forceContextLoss()` usado únicamente durante dispose.
- `webglcontextlost` produce error controlado; no se implementa recovery complejo.

## Accesibilidad y mobile

- Canvas con role/label y descripción textual.
- Estados y errores anunciados.
- Reset y fallbacks son botones DOM.
- Contenedor fluido, `min-width: 0`, canvas a ancho completo y altura mínima razonable.
- OrbitControls mantiene rotate táctil y pinch zoom; no hay sidebar 3D.

## Snapshot

El adapter expone `capturePreviewBlob()` para una futura integración. Renderiza el canvas WebGL a PNG sin overlays DOM. No se persiste ni se conecta al ecommerce en esta fase.

## Tests automáticos

- Manifest válido/inválido y registry.
- Elegibilidad por ProductTemplate.
- Resolución de source views.
- Validación de mesh/material/UV/bounds mediante dobles unitarios.
- Configuración de textura y cámara.
- Lifecycle/dispose y actualización sin recarga mediante runtime mockeado cuando sea estable.
- Validación estructural del GLB generado.
- Tests V2 afectados, lint, build, audit runtime y diff check.

WebGL/GPU real y ausencia de leaks GPU requieren validación manual en navegador.

## Criterios de aceptación automáticos

1. SPEC creada y alcance respetado.
2. Three `0.186.0` exacto, sin wrapper React.
3. Three y addons solo se importan dinámicamente al abrir 3D.
4. ProductTemplate referencia únicamente `modelId`.
5. Manifest versionado y registry controlado.
6. Fixture GLB técnico propio con mesh, material, UVs y bounds válidos.
7. `ThreeProductPreview` aislado.
8. `ThreePreviewAdapter` encapsula todos los detalles Three.
9. Artwork canvas limpio reutiliza 020F.
10. CanvasTexture conserva configuración declarativa y PBR.
11. Binding exacto por vista, mesh y material.
12. Modelo no se recarga en actualizaciones documentales dentro del montaje.
13. Cámara, controles, iluminación y reset implementados.
14. Loading, error, fallback y context loss implementados.
15. Resize, mobile estructural, accesibilidad y dispose implementados.
16. Captura técnica preparada.
17. DesignDocument/history/draft permanecen intactos.
18. V1, backend 3D y ecommerce fuera de alcance permanecen intactos.
19. Tests, lint, build, audit y diff check pasan.
20. Se reportan chunks y 0 KB de impacto inicial.

## Cierre

Codex puede declarar la implementación automática completa. La SPEC no queda visualmente aprobada hasta que el usuario valide modelo, UV/curvatura, rotación, zoom, reset y mobile.
