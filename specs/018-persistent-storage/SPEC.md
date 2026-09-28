# SPEC-018 — Persistent Storage Strategy & Implementation

## Estado

**Estado:** completada
**Dependencias:** SPEC-016 y SPEC-017 completadas. Esta SPEC elimina el bloqueo de filesystem efímero para un backend de una sola instancia con volumen persistente.

## Objetivo

Introducir una abstracción mínima de almacenamiento local configurable, segura y portable que preserve uploads, personalizaciones y ZIP históricos sin elegir proveedor cloud, cambiar schemas ni migrar datos.

## Inventario real

| Tipo | Quién lo crea | Dónde se guarda antes | Quién lo consume | Clase | Persistencia necesaria |
|---|---|---|---|---|---|
| Imagen de `/api/uploads/image` | Multer | `uploads/customizations/<timestamp>-<random>.<ext>` | URL pública `/uploads/customizations/...`; no existe consumidor frontend actual, pero puede haber referencias históricas | A | Sí si una personalización histórica guarda su URL |
| Imagen original añadida en ProductDesigner | `FileReader.readAsDataURL` | Dentro de `design.elementsBySide[].url` en Mongo al crear la personalización | ProductDesigner, ZIP y vistas de pedido | A, en Mongo | No crea fichero local |
| Preview frontal/trasero | Konva `toDataURL` | `previewImage` y `previewsBySide` en Mongo | carrito, checkout, pedidos, admin y ZIP | A, en Mongo | No crea fichero local |
| Mockups | Producto/payload como URL | Mongo o URL externa | ZIP y UI | A, referencia | El backend no crea fichero local |
| ZIP de personalización | `generateCustomizationZip` | `uploads/customizations/<customizationId>.zip`; `zipUrl` en Mongo | descarga admin | B regenerable, conservado por compatibilidad | Debe estar disponible o regenerarse; esta SPEC lo conserva en volumen |
| Descargas remotas usadas al construir ZIP | Axios | Buffer en memoria | Archiver | C temporal | No |
| ZIP parcial durante generación | Archiver | Antes escribía directamente al nombre final | Solo proceso actual | C temporal | No; debe limpiarse ante error |
| Assets estáticos del frontend | Build/repositorio | `frontend/public`/bundle | Navegador | Fuera de storage de usuario | Los conserva el artefacto de frontend |

No se encontraron otros usos de `fs`, Multer o Archiver relacionados con datos de usuario dentro de los consumidores revisados.

## Referencias en Mongo

- `Customization.previewImage` y `previewsBySide` contienen Data URL/base64, no paths físicos.
- `Customization.design.elementsBySide[].url` puede contener Data URL o URL/path histórico.
- `mockupFront` y `mockupBack` son strings de URL.
- `zipUrl` contiene actualmente `/uploads/customizations/<ObjectId>.zip`.
- `Order.items[].customizationId` referencia el documento `Customization`.
- No se encontró un campo que guarde deliberadamente un path absoluto. El uso anterior de `path.resolve` era interno y no se persistía.

No se modifica ningún schema ni se realiza migración. Los ZIP históricos se localizan por `Customization._id`, independientemente del valor legacy de `zipUrl`.

## Arquitectura anterior

- Multer usaba `diskStorage` con directorio relativo hardcodeado y filename basado en timestamp más `Math.random`.
- Express exponía todo el árbol `uploads` mediante `express.static`, incluidos ZIP privados.
- El ZIP escribía directamente al nombre final y guardaba una URL pública en Mongo.
- La descarga admin del frontend usaba `fetch` directo a esa URL, sin enviar el JWT del cliente HTTP.
- Rutas y utilidades resolvían paths directamente con `fs`/`path`.

## Arquitectura nueva

### Contrato real

`LocalStorageProvider` expone solo operaciones usadas o exigidas por los flujos actuales:

- normalizar y resolver una key relativa dentro del root;
- crear directorios;
- `save`, `read`, `exists` y `delete`;
- crear un write stream y mover un temporal de forma atómica dentro del mismo volumen;
- producir la URL pública de una key permitida.

La instancia se configura centralmente mediante `STORAGE_PROVIDER=local` y `STORAGE_ROOT`. No se implementa un proveedor cloud.

### Flujo de upload

1. Multer conserva `diskStorage`, 10 MiB, un archivo y MIME JPEG/PNG/WebP.
2. El servidor genera el nombre con `crypto.randomUUID()` y extensión derivada del MIME.
3. El provider resuelve `customizations/<uuid>.<ext>` dentro de `STORAGE_ROOT`.
4. Solo imágenes con filename seguro se sirven desde `/uploads/customizations/:filename`.

### Flujo de ZIP

1. El ZIP se genera desde el diseño/previews persistidos en Mongo y referencias existentes.
2. Se escribe a una key temporal única dentro del volumen.
3. Al cerrar correctamente se mueve al nombre final `<customizationId>.zip`.
4. El temporal se elimina si falla la generación.
5. La descarga se realiza únicamente mediante `GET /api/customizations/:id/zip`, protegida por auth y rol admin.
6. Nuevos documentos guardan la ruta API; documentos con `zipUrl` legacy siguen descargándose por su `_id` sin migración.

## Seguridad

- Todas las keys se normalizan como paths relativos POSIX y se rechazan paths absolutos, segmentos `..`, bytes nulos y resoluciones fuera del root.
- No se confía en `originalname`; solo se usa el MIME validado para la extensión.
- UUID evita colisiones por concurrencia.
- El root físico nunca se devuelve al cliente.
- No hay listado de directorios ni exposición estática general.
- Los ZIP dejan de ser públicos y mantienen autorización admin.
- Los 404 y errores de storage son controlados y no incluyen stack ni path físico.

Las imágenes del endpoint de upload permanecen públicas por URL relativa para compatibilidad histórica y uso directo en `<img>`. Los nombres nuevos son UUID no predecibles, pero no existe ownership/ACL para esas imágenes: quien conozca la URL puede leerlas. Cerrar también ese acceso requeriría definir cómo autenticar recursos de imagen en navegador y queda como riesgo/deuda separada, no como regresión introducida aquí.

## Configuración

- `STORAGE_PROVIDER=local`: único provider implementado.
- `STORAGE_ROOT`: root configurable. En desarrollo/test puede omitirse y usa `<cwd>/uploads`; en producción es obligatorio.
- No hace falta `PUBLIC_API_URL`: las URLs continúan siendo relativas y el frontend usa `VITE_API_URL`.

## Producción

### Desarrollo local

Filesystem local existente o `STORAGE_ROOT` explícito.

### Single-instance

Un único backend puede usar una ruta montada persistente, por ejemplo `/data/uploads`, configurada mediante env. El código no hardcodea `/data`.

### Multi-replica

El provider local no basta con discos independientes. Se necesita un volumen compartido con semántica compatible o un futuro provider de object storage. Queda fuera de esta SPEC.

## Compatibilidad y límites

- No cambia `CartLineV2`, Product, Order ni Customization schemas.
- Data URLs de previews/diseño permanecen en Mongo; no se duplican en storage.
- No se migran ni borran assets existentes.
- El root productivo debe montarse conteniendo el árbol `customizations` existente si se trasladan datos históricos.
- No se añade garbage collector. Solo se limpian temporales y artefactos recién creados por una operación fallida.

## Flujo de personalización validado

- ProductDesigner sigue creando imágenes y previews como Data URL; no llama actualmente a `/api/uploads/image`.
- El carrito y checkout conservan sin cambios la personalización normalizada y `CartLineV2`.
- Al crear el pedido, Mongo conserva diseño/previews y el backend construye el ZIP en el provider configurado.
- MyOrders y OrderDetail siguen leyendo los previews desde `Customization` en Mongo, no desde disco.
- Admin preview continúa usando esos mismos datos persistidos.
- Admin ZIP descarga por endpoint autenticado con el JWT del cliente HTTP.

Por tanto, cambiar `STORAGE_ROOT` afecta únicamente a imágenes subidas por el endpoint de uploads y a ZIPs; no duplica ni mueve previews existentes.

## Validación requerida

- Provider: save, read, delete, exists, root configurable, filename/key segura y traversal bloqueado.
- Upload: MIME permitido, límite de tamaño, filename UUID, lectura pública de imagen y 404.
- ZIP: generación en root configurable, descarga admin, rechazo sin autorización, compatibilidad por `_id` y limpieza temporal.
- Backend: `npm run check`, tests específicos y suite completa serial si es viable.
- Frontend: lint/build por el ajuste de descarga admin.
- General: `git diff --check` y ausencia de temporales.

## Resultado de implementación

- `LocalStorageProvider` centraliza todas las nuevas resoluciones físicas bajo el root configurado.
- Multer conserva `diskStorage`, validaciones de SPEC-017 y devuelve una URL relativa compatible.
- Los nombres nuevos usan UUID v4 y extensión derivada exclusivamente del MIME validado.
- El serving público se limita a imágenes seguras bajo `/uploads/customizations/:filename`; no expone el árbol ni permite ZIP.
- Los ZIP usan temporal único, rename dentro del volumen y cleanup si falla el stream o el guardado de `zipUrl`.
- Si falla la creación de pedido antes de persistirlo, se eliminan únicamente personalizaciones y ZIP creados por esa operación.
- La descarga ZIP usa el cliente Axios autenticado y el endpoint admin; los paths legacy de Mongo no necesitan migración porque el fichero se resuelve por `_id`.
- No se modificaron schemas ni contratos de carrito, pricing, shipping, pagos o integraciones dormidas.

### Validación ejecutada

- Backend `npm run check`: correcto.
- Tests específicos de storage, uploads, configuración y pedidos: 26/26 correctos.
- Suite backend completa serial: 108/108 correctos, 0 fallos y 0 omitidos.
- Frontend `npm run lint`: correcto.
- Frontend `npm run build`: correcto; 2410 módulos transformados.
- `git diff --check` y `git diff --cached --check`: correctos.

## Decisión de release

**Sí**, el backend puede desplegarse en una única instancia con un volumen persistente. La evidencia es que todo fichero nuevo se resuelve desde `STORAGE_ROOT`, producción rechaza su ausencia, los tests escriben en roots temporales configurables y no queda ningún path físico de uploads hardcodeado en los consumidores activos.

El requisito de infraestructura es montar un volumen persistente en `STORAGE_ROOT` y, si se trasladan históricos, copiar allí el árbol `customizations` existente fuera de esta aplicación. Para múltiples réplicas sigue siendo necesario un volumen compartido u object storage futuro.

## Criterios de aceptación

- [x] Inventario y clasificación A/B/C documentados.
- [x] Abstracción mínima de storage implementada.
- [x] Provider local configurable implementado.
- [x] `STORAGE_ROOT` obligatorio en producción y portable.
- [x] Nuevas referencias no contienen paths Windows absolutos.
- [x] Filenames únicos y seguros.
- [x] Path traversal bloqueado.
- [x] Validación Multer de SPEC-017 preservada.
- [x] Compatibilidad histórica sin migración.
- [x] Previews y flujo de personalización preservados.
- [x] ZIP preservado con temporal seguro y cleanup.
- [x] Descarga ZIP solo admin preservada.
- [x] Serving sin exposición de directorios ni paths físicos.
- [x] Errores/404 controlados.
- [x] Tests específicos correctos.
- [x] Suite backend validada.
- [x] Frontend validado si cambia.
- [x] Producción single-instance viable con volumen persistente.
- [x] Limitación multi-réplica documentada.
- [x] Diff check correcto y sin temporales.

**Resultado:** 20/20 criterios cumplidos.

## No tocar

Pricing, shipping, pagos, auth model, CartLineV2, schemas Product/Order/Customization, UI visual, target de deployment, AliExpress, dropshipping y MONEI.
