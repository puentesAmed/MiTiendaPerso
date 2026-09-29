# SPEC-020F.4 — Mug 11 oz Candidate Model Integration

## Estado

Implementada (2026-09-29). Candidato activado temporalmente como `development`; validación visual manual y protección de distribución para producción pendientes.

## Objetivo

Evaluar, preparar e integrar `mug-11oz-v1` como candidato 3D de desarrollo, reutilizando sin redefinir `PrintSurface`, `Product3DProfile`, `ThreePreviewAdapter` y el contrato de coordenadas de SPEC-020F.3.

El fixture `mug-development-v1` se conserva durante toda la migración.

## Precondiciones

- Restaurar el paquete fuente en una ubicación temporal accesible.
- Inventariar `.blend`, `.fbx`, `.obj`, `.mtl`, `.stl`, texturas y documentación local.
- Confirmar o registrar como desconocida la licencia/procedencia.
- Disponer de Blender CLI para un pipeline reproducible o ejecutar el pipeline en un equipo que lo tenga instalado.

## Alcance

- Copiar únicamente la fuente maestra y sus dependencias necesarias a `frontend/assets-source/3d/mug-11oz/`.
- Elegir preferentemente `.blend` cuando conserve geometría, materiales, UVs, nombres, objetos y escala; usar FBX/OBJ solo si resultan técnicamente superiores.
- Inspeccionar objetos, meshes, materiales, UV layers, polígonos, vértices, bounds, unidades, transforms, normales, interior, base, borde, asa y superficie imprimible.
- Registrar procedencia, `licenseStatus`, estado y dimensiones del modelo sin promover dimensiones físicas no verificadas al `PrintSurface`.
- Preparar de forma reproducible `MugBody` / `PrintableSurface` y detalles cerámicos equivalentes.
- Reutilizar `wrap-main` y su contrato normalizado 0..1 siempre que la UV candidata pueda representarlo.
- Re-unwrap únicamente la superficie imprimible cuando la UV fuente no satisfaga seam, frente y orientación.
- Exportar `frontend/public/models/mug-11oz-v1.glb` sin cámaras ni luces ajenas al producto.
- Registrar asset y profile `mug-11oz-v1` como `development`.
- Mantener el ProductTemplate activo sobre el fixture técnico hasta superar validación estructural, UV/calibración y revisión visual del usuario.

## Fuera de alcance

- Redefinir `PrintSurface` o `Product3DProfile`.
- Cambiar `DesignDocument` o migrar coordenadas/drafts.
- Eliminar `mug-development-v1`.
- Product Designer V1, backend, automated mockups, Cart, Checkout, Order, Admin o ZIP.
- Instalar Blender o dependencias automáticamente.
- Declarar licencia comercial, medidas físicas o estado `verified`/`production` sin evidencia.
- QA visual exhaustivo por Codex.

## UV requerido

El candidato debe demostrar, mediante geometría y calibración:

- `U=0`: seam posterior;
- `U=0.5`: frente comercial;
- `U=1`: seam posterior;
- `V=0`: borde inferior de la superficie imprimible;
- `V=1`: borde superior;
- `flipU=false`, `flipV=true`, `rotation=0`, salvo transformación declarativa demostrada y justificada.

No se aceptan offsets correctivos dentro de `ThreePreviewAdapter`.

## Licencia y estado

- Proveedor: CGTrader.
- Autor: peterdesigns.
- Modelo: `11oz Mug`, ID `4549774`.
- Licencia confirmada por el propietario del proyecto: `Royalty Free License (no AI)`.
- Se permite incorporar el modelo en productos/proyectos comerciales.
- Se prohíbe redistribuir el modelo o sus derivados como asset independiente.
- La publicación directa del GLB solo se acepta temporalmente en desarrollo local; producción requiere resolver su protección/distribución.
- La licencia confirmada no cambia `modelStatus: "development"` ni sustituye la validación técnica y visual pendiente.

## Pipeline reproducible

`frontend/scripts/inspect-mug-11oz-model.py` genera el inventario nativo y `frontend/scripts/prepare-mug-11oz-model.py`:

1. abrir la fuente maestra copiada;
2. excluir cámaras y luces;
3. aplicar transforms solo de forma auditable;
4. corregir normales y geometría únicamente cuando el diagnóstico lo justifique;
5. genera un mapa dedicado para la superficie imprimible;
6. estabilizar nombres de mesh/material;
7. exportar GLB con geometría, materiales, normales y UVs.

## Validación automática requerida

- Carga real con GLTFLoader.
- Mesh/material objetivo y UV presentes.
- Geometría no vacía y bounding box válida.
- Inventario de meshes/materiales/primitivas/vértices aproximados.
- Center/left/right/top/bottom contra el contrato de calibración.
- Tests de profile y PrintSurface afectados.
- Lint, build y `git diff --check`.

## Criterios de activación del candidato

El ProductTemplate solo podrá apuntar temporalmente al nuevo profile cuando:

1. el GLB cargue y sus bindings sean exactos;
2. la superficie imprimible esté aislada;
3. la UV supere calibración sin espejo, inversión ni salto frontal;
4. materiales y geometría sean estructuralmente coherentes;
5. la activación temporal conserve estado `development`; la aprobación visual del usuario será obligatoria antes de cualquier promoción posterior.

## Datos necesarios para correspondencia exacta

- fabricante y referencia comercial;
- altura y diámetros exterior/interior;
- capacidad nominal confirmada;
- geometría y posición del asa;
- fotografías frontales, laterales y superiores;
- zona imprimible real del proveedor.

## Resultado de inspección y preparación

- El paquete fue restaurado en dos ubicaciones de `dist`; ambas copias son byte-a-byte idénticas.
- Se preservaron BLEND como fuente maestra y OBJ/MTL como representación auditable en `frontend/assets-source/3d/mug-11oz/`.
- La procedencia y licencia están confirmadas por el registro de adquisición aportado por el propietario: CGTrader, peterdesigns, modelo `11oz Mug` ID `4549774`, `Royalty Free License (no AI)`. El paquete no incluye un documento de licencia embebido.
- El OBJ contiene un objeto, un material, 5.525 vértices, 5.272 polígonos, 6.008 coordenadas UV y cuatro componentes geométricos desconectados.
- Se detectaron 368 boundary edges, 128 caras de área cero y 13 caras cuyas normales guardadas se oponen al winding geométrico.
- La UV existe, pero ocupa rangos fuera de 0..1 y no hay separación de material entre superficie imprimible y detalles cerámicos.
- Las dimensiones OBJ son unitless. Su interpretación como metros es plausible, pero no está verificada y no modifica `PrintSurface.physicalSize`.
- Blender 5.2.2 LTS confirma una malla, identidad de transforms, ausencia de modificadores, una UV activa y cuatro componentes conectados.
- La clasificación geométrica aisló pared exterior, fondo, asa y detalle cerámico sin depender de índices fuente.
- Se eliminaron únicamente 128 polígonos de área cero; no se aplicó una reparación global de normales ni transforms destructivos.
- `MugBody` contiene 136 polígonos exclusivamente imprimibles con material `PrintableSurface`; el resto usa `CeramicDetail`.
- El GLB final contiene cinco nodos, dos materiales, UV final 0..1, frente U=0.5, costura U=0/1 y V bottom/top 0/1.
- `GLTFLoader` valida el binding, bounding box, partes, material imprimible exclusivo y contrato de calibración.
- Se registró el asset/profile `mug-11oz-v1` como `development`, se activó temporalmente en el template piloto y se conservó `mug-development-v1` como fallback.

## Pendiente fuera de la validación automática

- Validación visual manual del usuario sobre cámara, forma, asa, interior y continuidad del wrap.
- Definir distribución protegida antes de usar el GLB público en producción.
- No promover el profile a `verified` o `production` sin referencias físicas y aprobación visual.

