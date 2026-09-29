"""Prepare the licensed 11 oz mug source and export a deterministic development GLB.

Run with Blender:
  blender --background 11oz-Mug.blend --python prepare-mug-11oz-model.py -- --output mug-11oz-v1.glb

The source file is never modified. Components are classified from geometric traits,
not source vertex/polygon indices or their incidental ordering.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy


EPSILON = 1e-12


def parse_args() -> argparse.Namespace:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--report")
    return parser.parse_args(args)


def rounded(values):
    return [round(float(value), 8) for value in values]


def components_for_mesh(mesh):
    adjacency = [set() for _ in mesh.vertices]
    for edge in mesh.edges:
        first, second = edge.vertices
        adjacency[first].add(second)
        adjacency[second].add(first)

    unseen = set(range(len(mesh.vertices)))
    components = []
    while unseen:
        seed = min(unseen)
        stack = [seed]
        unseen.remove(seed)
        vertices = []
        while stack:
            current = stack.pop()
            vertices.append(current)
            neighbours = adjacency[current] & unseen
            unseen.difference_update(neighbours)
            stack.extend(neighbours)

        vertex_set = set(vertices)
        polygons = [
            polygon.index
            for polygon in mesh.polygons
            if all(index in vertex_set for index in polygon.vertices)
        ]
        coordinates = [mesh.vertices[index].co for index in vertices]
        minimum = [min(coordinate[axis] for coordinate in coordinates) for axis in range(3)]
        maximum = [max(coordinate[axis] for coordinate in coordinates) for axis in range(3)]
        dimensions = [maximum[axis] - minimum[axis] for axis in range(3)]
        radii = [math.hypot(coordinate.x, coordinate.y) for coordinate in coordinates]
        outward = 0
        for polygon_index in polygons:
            polygon = mesh.polygons[polygon_index]
            radius = math.hypot(polygon.center.x, polygon.center.y)
            radial_dot = (
                (polygon.normal.x * polygon.center.x + polygon.normal.y * polygon.center.y) / radius
                if radius > 1e-9
                else 0
            )
            outward += radial_dot > 0.5
        components.append(
            {
                "vertices": vertices,
                "polygons": polygons,
                "minimum": minimum,
                "maximum": maximum,
                "dimensions": dimensions,
                "maxRadius": max(radii),
                "outwardRatio": outward / len(polygons),
            }
        )
    return components


def classify_components(components):
    if len(components) != 4:
        raise RuntimeError(f"Se esperaban 4 componentes conectados y se encontraron {len(components)}.")

    total_min_z = min(component["minimum"][2] for component in components)
    total_max_z = max(component["maximum"][2] for component in components)
    total_height = total_max_z - total_min_z
    body_diameter = max(max(component["dimensions"][0:2]) for component in components)

    bottom_matches = [
        component
        for component in components
        if component["dimensions"][2] < total_height * 0.05
        and max(component["dimensions"][0:2]) > body_diameter * 0.9
    ]
    handle_matches = [
        component
        for component in components
        if component["maxRadius"] > body_diameter * 0.8
        and component["dimensions"][0] < body_diameter * 0.5
        and component["dimensions"][2] > total_height * 0.5
    ]
    printable_matches = [
        component
        for component in components
        if component["outwardRatio"] > 0.9
        and component["dimensions"][2] > total_height * 0.8
        and max(component["dimensions"][0:2]) > body_diameter * 0.9
    ]

    if not (len(bottom_matches) == len(handle_matches) == len(printable_matches) == 1):
        raise RuntimeError(
            "La clasificación geométrica no es inequívoca: "
            f"bottom={len(bottom_matches)}, handle={len(handle_matches)}, printable={len(printable_matches)}."
        )

    claimed = {id(bottom_matches[0]), id(handle_matches[0]), id(printable_matches[0])}
    detail_matches = [component for component in components if id(component) not in claimed]
    if len(detail_matches) != 1:
        raise RuntimeError("No se pudo aislar de forma inequívoca el detalle cerámico.")

    return {
        "MugBody": printable_matches[0],
        "CeramicDetail": detail_matches[0],
        "MugBottom": bottom_matches[0],
        "MugHandle": handle_matches[0],
    }


def create_material(name, roughness):
    material = bpy.data.materials.new(name=name)
    material.use_nodes = True
    material.diffuse_color = (1, 1, 1, 1)
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (1, 1, 1, 1)
    principled.inputs["Metallic"].default_value = 0
    principled.inputs["Roughness"].default_value = roughness
    return material


def cylindrical_uv(coordinate, min_z, max_z):
    # Seam: +Y (handle side). Front: -Y => U 0.5.
    # Blender's glTF exporter flips V, so author top=0 here to obtain top=1 in GLTF.
    u = (math.atan2(-coordinate.x, coordinate.y) / (2 * math.pi)) % 1.0
    v = 1 - ((coordinate.z - min_z) / (max_z - min_z))
    return u, min(1.0, max(0.0, v))


def is_printable_surface_face(polygon):
    radius = math.hypot(polygon.center.x, polygon.center.y)
    radial_dot = (
        (polygon.normal.x * polygon.center.x + polygon.normal.y * polygon.center.y) / radius
        if radius > 1e-9
        else 0
    )
    return radial_dot > 0.7 and abs(polygon.normal.z) < 0.7


def create_component_object(source, component, name, printable_material, ceramic_material, body_face_role=None):
    source_mesh = source.data
    zero_area_count = sum(
        source_mesh.polygons[index].area <= EPSILON for index in component["polygons"]
    )
    kept_polygons = [
        source_mesh.polygons[index]
        for index in component["polygons"]
        if source_mesh.polygons[index].area > EPSILON
        and (
            body_face_role is None
            or is_printable_surface_face(source_mesh.polygons[index]) == (body_face_role == "printable")
        )
    ]
    if not kept_polygons:
        raise RuntimeError(f"La clasificación dejó {name} sin polígonos.")
    used_vertices = sorted({index for polygon in kept_polygons for index in polygon.vertices})
    vertex_map = {source_index: target_index for target_index, source_index in enumerate(used_vertices)}
    vertices = [source_mesh.vertices[index].co.copy() for index in used_vertices]
    faces = [[vertex_map[index] for index in polygon.vertices] for polygon in kept_polygons]

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)

    is_body = body_face_role == "printable"
    if is_body:
        obj.data.materials.append(printable_material)
    else:
        obj.data.materials.append(ceramic_material)

    source_uv = source_mesh.uv_layers.active
    target_uv = mesh.uv_layers.new(name="UVMap")
    min_z = component["minimum"][2]
    max_z = component["maximum"][2]
    printable_faces = 0

    for target_polygon, source_polygon in zip(mesh.polygons, kept_polygons):
        target_polygon.use_smooth = source_polygon.use_smooth
        is_printable_face = is_body
        target_polygon.material_index = 0
        printable_faces += is_printable_face

        polygon_uvs = []
        for source_vertex, source_loop_index in zip(source_polygon.vertices, source_polygon.loop_indices):
            if is_body:
                polygon_uvs.append(cylindrical_uv(source_mesh.vertices[source_vertex].co, min_z, max_z))
            elif source_uv:
                uv = source_uv.data[source_loop_index].uv
                polygon_uvs.append((uv.x, uv.y))
            else:
                polygon_uvs.append((0, 0))

        # Shared seam vertices may use U=0 on one side and U=1 on the other.
        if is_body and polygon_uvs and max(uv[0] for uv in polygon_uvs) - min(uv[0] for uv in polygon_uvs) > 0.5:
            if source_polygon.center.x > 0:
                polygon_uvs = [(u + 1 if u < 0.5 else u, v) for u, v in polygon_uvs]
            else:
                polygon_uvs = [(u - 1 if u > 0.5 else u, v) for u, v in polygon_uvs]

        for loop_index, uv in zip(target_polygon.loop_indices, polygon_uvs):
            target_uv.data[loop_index].uv = uv

    if is_body and printable_faces == 0:
        raise RuntimeError("MugBody no contiene caras imprimibles tras la clasificación.")

    return obj, {
        "sourcePolygons": len(component["polygons"]),
        "exportedPolygons": len(kept_polygons),
        "removedZeroAreaPolygons": zero_area_count,
        "excludedBySurfaceRole": len(component["polygons"]) - zero_area_count - len(kept_polygons),
        "printablePolygons": printable_faces,
        "boundsMin": rounded(component["minimum"]),
        "boundsMax": rounded(component["maximum"]),
    }


def main():
    arguments = parse_args()
    source_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(source_objects) != 1:
        raise RuntimeError(f"Se esperaba una única malla fuente y se encontraron {len(source_objects)}.")
    source = source_objects[0]
    if source.modifiers:
        raise RuntimeError("La malla fuente contiene modificadores no evaluados.")

    components = classify_components(components_for_mesh(source.data))
    printable_material = create_material("PrintableSurface", 0.58)
    ceramic_material = create_material("CeramicDetail", 0.5)

    prepared_objects = []
    report = {
        "source": bpy.data.filepath,
        "blenderVersion": bpy.app.version_string,
        "modelStatus": "development",
        "uvContract": {"seam": "+Y / U=0|1", "front": "-Y / U=0.5", "vertical": "bottom=0, top=1"},
        "components": {},
    }
    output_parts = (
        ("MugBody", components["MugBody"], "printable"),
        ("CeramicDetailSurface", components["MugBody"], "ceramic"),
        ("CeramicDetail", components["CeramicDetail"], None),
        ("MugBottom", components["MugBottom"], None),
        ("MugHandle", components["MugHandle"], None),
    )
    for name, component, body_face_role in output_parts:
        obj, component_report = create_component_object(
            source,
            component,
            name,
            printable_material,
            ceramic_material,
            body_face_role,
        )
        prepared_objects.append(obj)
        report["components"][name] = component_report

    bpy.data.objects.remove(source, do_unlink=True)
    for obj in list(bpy.context.scene.objects):
        obj.select_set(obj in prepared_objects)
    bpy.context.view_layer.objects.active = prepared_objects[0]

    output = Path(arguments.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_texcoords=True,
        export_normals=True,
        export_cameras=False,
        export_lights=False,
    )
    report["output"] = str(output)
    report["outputBytes"] = output.stat().st_size

    if arguments.report:
        report_path = Path(arguments.report)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
