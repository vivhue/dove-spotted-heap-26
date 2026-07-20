"""
Assign flat zone colors to an avatar GLB.

This is the safer alternative to projecting the source photo onto the mesh.
It reads the JSON produced by scripts/extract_zone_colors.py, assigns named
parts first, and only falls back to height bands when the avatar has no useful
object names.

Usage:
    blender --background --python blender/assign_zone_materials.py -- \
        outputs/hybrid-ariana-avatar.glb outputs/zone_colors.json \
        outputs/hybrid-ariana-zone-colored.glb
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import bpy


ZONE_NAME_HINTS = {
    "hair": [
        "hair",
        "ponytail",
        "pony",
        "falling_hair",
        "hair_cap",
        "haircap",
    ],
    "skin": [
        "skin",
        "head",
        "face",
        "neck",
        "nose",
        "body_base",
        "pifuhd_body",
        "body_surface",
    ],
    "top": [
        "top",
        "shirt",
        "tee",
        "blouse",
        "crop",
        "bodice",
        "dress_top",
        "torso_outfit",
        "clean_crop_top",
    ],
    "bottom": [
        "bottom",
        "pants",
        "trouser",
        "skirt",
        "shorts",
        "dress_bottom",
        "leg_outfit",
        "clean_skirt",
    ],
    "shoes": [
        "shoe",
        "shoes",
        "boot",
        "sneaker",
        "heel",
        "footwear",
    ],
}

ZONE_ROUGHNESS = {
    "hair": 0.48,
    "skin": 0.62,
    "top": 0.78,
    "bottom": 0.78,
    "shoes": 0.42,
}

HEIGHT_BANDS = [
    ("shoes", 0.00, 0.13),
    ("bottom", 0.13, 0.48),
    ("top", 0.48, 0.72),
    ("skin", 0.72, 0.90),
    ("hair", 0.90, 1.01),
]


def main() -> None:
    args = parse_args()
    zones = load_zone_colors(args.colors)

    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(args.input))

    matched = assign_by_name(zones)
    if not matched:
        print("No named mesh parts matched. Falling back to height-band material assignment.")
        assign_by_height_bands(zones)
    else:
        print(f"Named-part assignment matched {len(matched)} object(s).")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(args.output),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
    )
    print(f"Exported zone-colored avatar to {args.output}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Assign extracted zone colors to an avatar GLB.")
    parser.add_argument("input", type=Path, help="Input avatar GLB/GLTF.")
    parser.add_argument("colors", type=Path, help="zone_colors.json from extract_zone_colors.py.")
    parser.add_argument("output", type=Path, help="Output GLB path.")
    return parser.parse_args(args_after_blender_separator())


def args_after_blender_separator() -> list[str]:
    import sys

    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1 :]


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def load_zone_colors(path: Path) -> dict[str, dict]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    zones = raw.get("zones", raw)
    clean = {}
    for zone, data in zones.items():
        if zone.startswith("_") or not isinstance(data, dict):
            continue
        if "hex" in data:
            clean[zone] = data
    if not clean:
        raise RuntimeError(f"No usable zone colors found in {path}")
    return clean


def assign_by_name(zones: dict[str, dict]) -> set[str]:
    matched = set()
    materials = make_zone_materials(zones)

    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue

        zone = zone_for_name(obj.name)
        if not zone or zone not in materials:
            continue

        obj.data.materials.clear()
        obj.data.materials.append(materials[zone])
        matched.add(obj.name)
        print(f"[named] {obj.name} -> {zone}")

    return matched


def zone_for_name(name: str) -> str | None:
    normalized = name.lower().replace(".", "_").replace("-", "_").replace(" ", "_")
    for zone, hints in ZONE_NAME_HINTS.items():
        if any(hint in normalized for hint in hints):
            return zone
    return None


def assign_by_height_bands(zones: dict[str, dict]) -> None:
    materials = make_zone_materials(zones)
    available_bands = [band for band in HEIGHT_BANDS if band[0] in materials]
    if not available_bands:
        raise RuntimeError("No height bands could be assigned because no matching zone colors exist.")

    for obj in bpy.data.objects:
        if obj.type != "MESH" or not obj.data.polygons:
            continue

        obj.data.materials.clear()
        material_index_by_zone = {}
        for zone, _, _ in available_bands:
            material_index_by_zone[zone] = len(obj.data.materials)
            obj.data.materials.append(materials[zone])

        z_values = [(obj.matrix_world @ vertex.co).z for vertex in obj.data.vertices]
        z_min = min(z_values)
        z_span = max(max(z_values) - z_min, 1e-6)

        for polygon in obj.data.polygons:
            avg_z = sum((obj.matrix_world @ obj.data.vertices[index].co).z for index in polygon.vertices) / len(polygon.vertices)
            t = (avg_z - z_min) / z_span
            zone = zone_for_height(t, available_bands)
            polygon.material_index = material_index_by_zone[zone]

        obj.data.update()
        print(f"[height-band] {obj.name} -> {len(available_bands)} material bands")


def zone_for_height(t: float, bands: list[tuple[str, float, float]]) -> str:
    for zone, start, end in bands:
        if start <= t < end:
            return zone
    return bands[-1][0]


def make_zone_materials(zones: dict[str, dict]) -> dict[str, bpy.types.Material]:
    return {
        zone: make_material(f"zone_{zone}", hex_to_linear_rgba(data["hex"]), ZONE_ROUGHNESS.get(zone, 0.7))
        for zone, data in zones.items()
    }


def make_material(name: str, rgba: tuple[float, float, float, float], roughness: float) -> bpy.types.Material:
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name=name)
    material.use_nodes = True
    material.blend_method = "OPAQUE"
    nodes = material.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Alpha"].default_value = 1.0
        bsdf.inputs["Metallic"].default_value = 0.0
        bsdf.inputs["Roughness"].default_value = roughness
    return material


def hex_to_linear_rgba(hex_value: str) -> tuple[float, float, float, float]:
    hex_value = hex_value.strip().lstrip("#")
    if len(hex_value) != 6:
        raise ValueError(f"Expected #rrggbb color, got {hex_value!r}")
    srgb = [int(hex_value[index : index + 2], 16) / 255.0 for index in (0, 2, 4)]
    return tuple(srgb_to_linear(channel) for channel in srgb) + (1.0,)


def srgb_to_linear(channel: float) -> float:
    if channel <= 0.04045:
        return channel / 12.92
    return ((channel + 0.055) / 1.055) ** 2.4


if __name__ == "__main__":
    main()
