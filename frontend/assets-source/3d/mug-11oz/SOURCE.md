# Mug 11 oz — source inventory

## Status

- Candidate status: `development`
- License status: confirmed from the acquisition record supplied by the project owner
- Provider: CGTrader
- Author: peterdesigns
- Model: `11oz Mug` (CGTrader ID `4549774`)
- License: `Royalty Free License (no AI)`
- Acquisition date: not supplied; provenance confirmed by the project owner on 2026-09-29
- Allowed use: incorporation into commercial products and projects
- Restriction: the model or its derivatives must not be redistributed as a standalone asset
- Delivery protection: a public GLB is acceptable only for temporary local development; production delivery requires an asset-protection decision
- Inspection date: 2026-09-29

No LICENSE, README, author metadata, source URL, reference images or usage terms were embedded in the supplied package. The provenance and license facts above come from the acquisition record confirmed by the project owner and must remain attached to any prepared derivative.

## Preserved files

| File | Purpose | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `11oz-Mug.blend` | Source of truth | 1,547,812 | `FB30D37930F35BE91E77810C98C65C721F8E575001E529BB30BDE3F9BCBA565C` |
| `11oz-Mug.obj` | Auditable interchange representation | 742,777 | `E549F6BFCE47D2F9411BE7146E782E27A95525624EEE522BE82D51F1E7DBCA51` |
| `11oz-Mug.mtl` | OBJ material companion | 243 | `3E61D07DA4D6B451C82EEC623CF9E7347838E246EBBECFC69F98D2BBB5426DBC` |

The supplied copies under `dist/assets/11oz-Mug` and `dist/mockups/11oz-Mug` were byte-identical. `dist` remains generated output and is not a source dependency.

## Source selection

`11oz-Mug.blend` is the master candidate because the OBJ header identifies that Blender file as its source and BLEND is the only format capable of retaining native objects, transforms, materials, UV layers, scene units and editable topology.

The supplied FBX is a binary derivative and the STL is a triangulated derivative without UV/material semantics. They were inventoried but intentionally not duplicated into `assets-source`.

## Package inventory

| Supplied file | Bytes | Notes |
| --- | ---: | --- |
| `11oz-Mug.blend` | 1,547,812 | Blender 3.00 file header |
| `11oz-Mug.fbx` | 282,156 | Binary FBX 7400 |
| `11oz-Mug.obj` | 742,777 | Exported by Blender 3.0.1 |
| `11oz-Mug.mtl` | 243 | One material: `Mug-Material` |
| `11oz-Mug.stl` | 534,184 | Binary STL, 10,682 triangles, no UV/material support |

No texture images or additional documentation were supplied.

## OBJ structural inspection

- Objects: 1 (`11oz-Mug_Cylinder.001`)
- Groups: 0
- Materials: 1 (`Mug-Material`)
- Vertices: 5,525
- UV coordinates: 6,008
- Normals: 5,219
- Polygon faces: 5,272
- Quads: 5,238
- N-gons: 34
- Triangles after triangulation: 10,682
- Connected geometric components: 4
- Boundary edges: 368
- Non-manifold edges shared by more than two faces: 0
- Zero-area polygon faces: 128
- Faces whose stored normals oppose the geometric winding: 13

The geometry is therefore not ready for direct promotion. Body, base, handle and remaining cup surfaces are disconnected within one object; there is no material boundary that isolates only the printable exterior. Blender inspection must determine whether boundaries are intentional joins or defects before any cleanup.

## Bounds and scale

Raw OBJ bounds are unitless:

- min: `[-0.040127, 0.004790, -0.074446]`
- max: `[0.040127, 0.100544, 0.040127]`
- dimensions: `[0.080254, 0.095754, 0.114573]`
- bounds center: `[0, 0.052667, -0.0171595]`

If the Blender scene unit is metres, these values would correspond approximately to 80.254 × 95.754 × 114.573 mm including the handle. That interpretation is plausible for an 11 oz mug but remains unverified; it must not populate `PrintSurface.physicalSize`.

## UV inspection

Every OBJ face references UVs, but the global UV range is outside 0..1:

- U: `-0.098199 .. 1.263614`
- V: `-0.549734 .. 2.131643`

The largest body-like component spans approximately:

- U: `0.263452 .. 1.263614`
- V: `1.147404 .. 2.131643`

This span is close to one UV unit but is offset and shares the single `Mug-Material` with every component. It was not reused for the printable surface because it did not demonstrate the SPEC-020F.3 seam/front/orientation contract.

## Blender preparation result

Blender 5.2.2 LTS inspection confirmed one mesh object, one active UV layer, no modifiers and identity transforms. Its four connected components were classified by geometry rather than stored indices:

- full-height outward cylindrical shell: printable body;
- largest radial extension: handle;
- near-zero-height full-diameter component: bottom;
- remaining full-height component: ceramic interior/rim/detail.

`prepare-mug-11oz-model.py` removes only the 128 zero-area source polygons, isolates 136 outward wall polygons as `MugBody` / `PrintableSurface`, keeps all remaining exported faces on `CeramicDetail`, and creates a cylindrical UV with seam at the handle side, front at U=0.5 and final GLTF V bottom/top at 0/1. No adapter offsets or corrective transforms are used.

The reproducible output is `frontend/public/models/mug-11oz-v1.glb` (266,840 bytes) with nodes `MugBody`, `CeramicDetailSurface`, `CeramicDetail`, `MugBottom` and `MugHandle`. Inspection and preparation reports are retained beside this file. The model remains `development` pending manual visual approval and a production asset-protection decision.

