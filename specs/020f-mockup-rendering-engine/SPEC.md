# SPEC-020F — Mockup Rendering Engine

## Estado

Cumplida (2026-09-29).

## Objetivo

Entregar el primer mockup derivado de Designer V2 mediante un pipeline seguro y mínimo:

`DesignDocument → preview artwork PNG → MockupRenderingService → automated_mockups → StorageProvider → modo Mockup`.

El mockup es un artefacto derivado. No forma parte de `DesignDocument`, no entra en undo/redo y no se guarda como blob dentro del draft.

## Alcance

- Render determinista y transparente de la vista fuente, sin UI técnica.
- Contrato `MockupManifest` versionado y registry explícito.
- Un mockup técnico de desarrollo para `mug-ceramic-standard-v1`.
- Endpoint invitado `POST /api/designer-v2/mockups` con upload PNG limitado.
- Invocación local y segura del paquete Python `automated_mockups`.
- Almacenamiento y caché por contenido mediante `StorageProvider`.
- Modo Mockup con loading, éxito, error, stale y regeneración.
- Tests específicos frontend, backend y del puente Python.

## Fuera de alcance

- ProductDesigner V1.
- Curvatura, perspective, warp, displacement, máscaras, sombras o 3D.
- Persistencia backend de `DesignDocument` o jobs distribuidos.
- Integración con Cart, Checkout, Order, Admin o ZIP.
- Descarga de mockup y plantillas productivas finales.
- Medidas físicas de producción de la taza.

## Auditoría de `automated_mockups`

La integración reutiliza su API Python de operación individual:

- `MockupGenerator.generate_mockup(design_path, mockup_path, output_path)`;
- `BoxParameters` para `bbox`, `width`, `height`, `rotation` y `center`;
- enums existentes de alignment y scale mode;
- lectura RGBA, escalado, rotación con transparencia, composición alpha y salida PNG/JPEG/WebP.

El motor actual realiza overlay 2D. No implementa curvatura real, perspective, warp, máscaras, sombras ni 3D. El piloto se etiqueta como preview básico de desarrollo.

## Decisión de frontera

El frontend interpreta `DesignDocument`, resuelve assets y genera un PNG transparente de preview. El backend recibe ese PNG y un identificador conocido; no interpreta Fabric ni acepta paths o manifests del cliente.

Node invoca un puente Python de operación única con `spawn`, argumentos separados y `shell: false`. Un worker persistente se pospone porque el MVP no necesita cola ni estado de proceso compartido.

## MockupManifest

Contrato mínimo:

```js
{
  schemaVersion: 1,
  revision: 1,
  mockupId: "mug-white-basic-v1",
  kind: "development",
  template: { assetId: "mug-white-basic-v1" },
  sourceViewId: "wrap",
  placement: {
    bbox: [x, y, width, height],
    width,
    height,
    rotation,
    center: [x, y],
    alignment: "center",
    scaleMode: "fit"
  },
  output: { format: "png", sizeMode: "template", quality: null }
}
```

El registry resuelve `assetId` a un archivo controlado. No acepta templates ni paths aportados por el navegador. Se validan versión, revisión, ids, vista fuente, bbox, tamaños positivos, center, enums y formato de salida.

## ArtworkRenderer

- Crea un canvas Fabric aislado; no captura la UI.
- Reconcilia la vista y sus assets con el adapter existente.
- Exporta exclusivamente el área imprimible a PNG transparente.
- Excluye bordes, grid, safe area, selección, controles, warnings y fondo técnico.
- Respeta orden, visibilidad y clipping ya modelados.
- La salida de 020F se denomina `preview artwork`; no es arte final productivo.

## Endpoint

`POST /api/designer-v2/mockups`, multipart/form-data:

- `artwork`: PNG;
- `templateId`;
- `mockupId`;
- `sourceViewId`.

Respuesta 200:

```json
{
  "success": true,
  "mockup": {
    "mockupId": "mug-white-basic-v1",
    "sourceViewId": "wrap",
    "manifestRevision": 1,
    "cacheKey": "sha256",
    "url": "/uploads/designer-v2/mockups/<sha256>.png",
    "width": 1200,
    "height": 900,
    "cached": false
  }
}
```

Errores normalizados: `ENGINE_DISABLED`, `INVALID_ARTWORK`, `INVALID_MANIFEST`, `RENDERING_FAILED`, `RENDER_TIMEOUT`, `STORAGE_FAILED` y `ENGINE_BUSY`.

## Seguridad y límites

- PNG exclusivamente, validado por firma e IHDR; no SVG.
- Tamaño máximo de upload y dimensiones/píxeles máximos.
- Filename del cliente ignorado.
- Mockup y template resueltos desde registries explícitos.
- Directorio temporal por operación, eliminado siempre.
- Ejecutable y raíz Python configurables.
- Sin interpolación de shell; stdout/stderr acotados; timeout y exit code controlados.
- Concurrencia local pequeña y rate limit específico.
- Resultados públicos solo por claves SHA-256 con patrón estricto.
- El endpoint continúa disponible para invitados, sin exponer assets privados ni paths internos.

## Configuración

- `MOCKUP_ENGINE_ENABLED`: deshabilitado por defecto.
- `MOCKUP_ENGINE_PYTHON`: ejecutable Python.
- `MOCKUP_ENGINE_ROOT`: raíz del repositorio `automated_mockups`.
- `MOCKUP_ENGINE_TIMEOUT_MS`: timeout acotado opcional.

La ausencia de configuración no impide arrancar el ecommerce. Devuelve un error controlado al intentar generar.

## Hash y caché

El frontend calcula un hash estable para detectar stale usando solo el documento relevante, assets referenciados, template/revision, `sourceViewId`, `mockupId`, revisión del manifest y opciones de render. Excluye selección, zoom, pan y demás session state.

El backend no confía en ese hash: calcula SHA-256 sobre bytes PNG y parámetros canónicos resueltos. `hash → storage key` permite reutilizar una salida existente.

## Estado frontend

El modo Mockup existe solo cuando el template declara mockups. Sus estados derivados son:

- vacío: `Generar mockup`;
- loading: `Generando mockup…` anunciado;
- éxito: imagen `contain`, alt descriptivo y acción actualizar;
- stale: conserva la imagen y muestra `Mockup desactualizado`;
- error: mensaje útil anunciado; Design sigue operativo;
- no disponible: template sin mockups o engine deshabilitado.

Entrar en Mockup no regenera automáticamente. Cambios documentales relevantes invalidan el resultado; cambios session-only no. Volver a Design conserva documento e historial. Una petición frontend puede abortarse sin implementar cancelación distribuida.

## Mockup piloto

`mug-white-basic-v1` usa un fixture técnico 2D, controlado por backend y marcado `development`. Solo demuestra placement/alpha/fit del pipeline; no se presenta como render fotorrealista ni plantilla productiva.

## Validación automatizada

### Backend

- manifest/registry e ids inválidos;
- validación PNG y límites;
- engine disabled;
- proceso exitoso, fallo y timeout;
- cleanup temporal;
- storage y cache hit;
- contrato HTTP.

### Frontend

- disponibilidad del tab por template;
- fingerprint estable y exclusión de session state;
- stale después de cambio documental;
- solicitud, loading, éxito, error y regeneración mediante helpers/componentes comprobables;
- export/crop limpio mediante invariantes unitarias.

### Python

- operación individual real;
- output existente y dimensiones;
- alpha/placement aproximado;
- error de input.

## Criterios de aceptación

1. Existe esta SPEC y la implementación no excede su alcance.
2. Existe manifest versionado, validación y registry explícito.
3. `mug-ceramic-standard-v1` declara `mug-white-basic-v1`.
4. El piloto queda identificado como desarrollo.
5. Existe `MockupRenderingService` independiente del controller.
6. Python se ejecuta sin shell, con timeout, límites, códigos y cleanup.
7. El frontend genera un preview artwork PNG limpio y transparente.
8. La vista `wrap` procede del manifest, no de un hardcode del service.
9. El endpoint acepta solo PNG validado y no acepta paths/manifests.
10. El resultado usa `StorageProvider` y una URL segura.
11. Backend calcula hash y reutiliza caché existente.
12. Mockup mode cubre vacío, loading, éxito, error y stale.
13. Cambios de documento invalidan; cambios session-only no.
14. Generar no modifica `DesignDocument` ni historial.
15. Design sigue operativo si el engine está deshabilitado o falla.
16. No se añaden Three.js ni integraciones ecommerce fuera de alcance.
17. V1 permanece intacto.
18. Tests específicos frontend/backend/Python, lint, build y diff check pasan.

## Pruebas manuales delegadas al usuario

Codex no ejecutará QA visual exhaustivo. La entrega final incluirá el checklist bloqueante/importante/opcional solicitado.
