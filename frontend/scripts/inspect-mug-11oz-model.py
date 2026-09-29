"""Inspect the native mug BLEND scene and emit a deterministic JSON report.

Run with Blender:
  blender --background 11oz-Mug.blend --python inspect-mug-11oz-model.py -- --output report.json
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def parse_args() -> argparse.Namespace:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    return parser.parse_args(args)


def rounded(values):
    return [round(float(value), 8) for value in values]


def connected_components(mesh):
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
        radii = sorted(math.hypot(coordinate.x, coordinate.y) for coordinate in coordinates)
        minimum = [min(coordinate[axis] for coordinate in coordinates) for axis in range(3)]
        maximum = [max(coordinate[axis] for coordinate in coordinates) for axis in range(3)]
        face_metrics = []
        uv_coordinates = []
        active_uv = mesh.uv_layers.active
        for polygon_index in polygons:
            polygon = mesh.polygons[polygon_index]
            center = polygon.center
            radius = math.hypot(center.x, center.y)
            radial_dot = (
                (polygon.normal.x * center.x + polygon.normal.y * center.y) / radius
                if radius > 1e-9
                else 0
            )
            face_metrics.append((radius, radial_dot, abs(polygon.normal.z), polygon.area))
            if active_uv:
                uv_coordinates.extend(active_uv.data[loop_index].uv for loop_index in polygon.loop_indices)

        def percentile(values, fraction):
            return values[min(len(values) - 1, round((len(values) - 1) * fraction))]

        components.append(
            {
                "vertexCount": len(vertices),
                "polygonCount": len(polygons),
                "boundsMin": rounded(minimum),
                "boundsMax": rounded(maximum),
                "dimensions": rounded(maximum[axis] - minimum[axis] for axis in range(3)),
                "radiusPercentiles": rounded(
                    percentile(radii, fraction) for fraction in (0, 0.1, 0.5, 0.9, 1)
                ),
                "faceClassification": {
                    "outwardRadial": sum(metric[1] > 0.5 for metric in face_metrics),
                    "inwardRadial": sum(metric[1] < -0.5 for metric in face_metrics),
                    "mostlyHorizontal": sum(metric[2] > 0.7 for metric in face_metrics),
                    "zeroArea": sum(metric[3] <= 1e-12 for metric in face_metrics),
                },
                "surfaceArea": round(sum(metric[3] for metric in face_metrics), 10),
                "faceCenterZRange": rounded(
                    [
                        min(mesh.polygons[index].center.z for index in polygons),
                        max(mesh.polygons[index].center.z for index in polygons),
                    ]
                ),
                "uvBounds": {
                    "min": rounded([min(uv.x for uv in uv_coordinates), min(uv.y for uv in uv_coordinates)]),
                    "max": rounded([max(uv.x for uv in uv_coordinates), max(uv.y for uv in uv_coordinates)]),
                }
                if uv_coordinates
                else None,
            }
        )

    return sorted(components, key=lambda item: item["vertexCount"], reverse=True)


def inspect_mesh(obj):
    mesh = obj.data
    world_corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    minimum = [min(corner[axis] for corner in world_corners) for axis in range(3)]
    maximum = [max(corner[axis] for corner in world_corners) for axis in range(3)]

    material_polygons = {}
    for polygon in mesh.polygons:
        material_polygons[str(polygon.material_index)] = (
            material_polygons.get(str(polygon.material_index), 0) + 1
        )

    uv_layers = []
    for layer in mesh.uv_layers:
        coordinates = [loop.uv for loop in layer.data]
        uv_layers.append(
            {
                "name": layer.name,
                "active": layer == mesh.uv_layers.active,
                "bounds": {
                    "min": rounded(
                        [min(uv.x for uv in coordinates), min(uv.y for uv in coordinates)]
                    )
                    if coordinates
                    else None,
                    "max": rounded(
                        [max(uv.x for uv in coordinates), max(uv.y for uv in coordinates)]
                    )
                    if coordinates
                    else None,
                },
            }
        )

    return {
        "name": obj.name,
        "mesh": mesh.name,
        "vertexCount": len(mesh.vertices),
        "edgeCount": len(mesh.edges),
        "polygonCount": len(mesh.polygons),
        "loopTriangleCount": sum(max(0, len(polygon.vertices) - 2) for polygon in mesh.polygons),
        "connectedComponents": connected_components(mesh),
        "materials": [slot.material.name if slot.material else None for slot in obj.material_slots],
        "polygonsByMaterialIndex": material_polygons,
        "uvLayers": uv_layers,
        "modifiers": [
            {"name": modifier.name, "type": modifier.type, "showRender": modifier.show_render}
            for modifier in obj.modifiers
        ],
        "transform": {
            "location": rounded(obj.location),
            "rotationEuler": rounded(obj.rotation_euler),
            "scale": rounded(obj.scale),
        },
        "worldBounds": {"min": rounded(minimum), "max": rounded(maximum)},
        "worldDimensions": rounded(maximum[axis] - minimum[axis] for axis in range(3)),
        "visibleRender": not obj.hide_render,
    }


def main():
    arguments = parse_args()
    scene = bpy.context.scene
    report = {
        "blendFile": bpy.data.filepath,
        "blenderVersion": bpy.app.version_string,
        "scene": {
            "unitSystem": scene.unit_settings.system,
            "unitScale": scene.unit_settings.scale_length,
            "lengthUnit": scene.unit_settings.length_unit,
            "objectCount": len(scene.objects),
        },
        "objects": [
            inspect_mesh(obj)
            if obj.type == "MESH"
            else {
                "name": obj.name,
                "type": obj.type,
                "visibleRender": not obj.hide_render,
                "transform": {
                    "location": rounded(obj.location),
                    "rotationEuler": rounded(obj.rotation_euler),
                    "scale": rounded(obj.scale),
                },
            }
            for obj in sorted(scene.objects, key=lambda item: item.name)
        ],
        "materials": [
            {
                "name": material.name,
                "useNodes": material.use_nodes,
                "blendMethod": getattr(material, "surface_render_method", None),
            }
            for material in sorted(bpy.data.materials, key=lambda item: item.name)
        ],
    }

    output = Path(arguments.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")
    print(f"Inspection report written to {output}")


if __name__ == "__main__":
    main()
