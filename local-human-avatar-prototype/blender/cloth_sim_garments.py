"""
Generate simple cloth-simmed garment bands for the hybrid avatar.

This builds on smooth_and_shrinkwrap_garments.py, but instead of rigidly
snapping a garment tube to a surface, it starts the garment loose, pins the
top edge, and lets Blender Cloth settle against a temporary smooth body proxy.
The settled result is baked to a normal static mesh before GLB export.

Usage:
    blender --background --python blender/cloth_sim_garments.py -- \
        avatar_in.glb avatar_out.glb [config.json]
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector


CONFIG = {
    "smooth_iterations": 6,
    "smooth_factor": 0.5,
    "use_corrective_smooth": True,
    "shoulder_frac": 0.76,
    "waist_frac": 0.58,
    "hip_frac": 0.53,
    "hem_frac": 0.45,
    "top_start_ease": 1.14,
    "skirt_top_start_ease": 1.12,
    "skirt_flare": 1.24,
    "garment_thickness": 0.012,
    "garment_segments": 64,
    "proxy_voxel_size": 0.02,
    "proxy_smooth_iterations": 12,
    "proxy_smooth_factor": 0.8,
    "sim_settle_frames": 45,
    "cloth_mass": 0.3,
    "cloth_air_viscosity": 2.0,
    "cloth_tension_stiffness": 15.0,
    "cloth_bending_stiffness": 5.0,
    "collision_distance": 0.006,
    "top_color_hex": "#f4f4f3",
    "bottom_color_hex": "#f5f6f5",
    "top_object_name": "clean_crop_top_overlay",
    "bottom_object_name": "clean_skirt_overlay",
}


def main() -> None:
    args = parse_args()
    load_config_overrides(args.config)

    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(args.input))

    body = find_body_object()
    print(f"Using '{body.name}' as the body mesh.")
    smooth_body(body)
    remove_old_overlay_objects()

    z_min, _, height, sample_fn = get_body_metrics(body)
    proxy = build_collision_proxy(body)
    build_top(proxy, z_min, height, sample_fn)
    build_bottom(proxy, z_min, height, sample_fn)

    print(f"Removing temporary collision proxy '{proxy.name}'.")
    bpy.data.objects.remove(proxy, do_unlink=True)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(args.output),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
    )
    print(f"Exported cloth-simmed avatar to {args.output}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate cloth-simmed garment bands for an avatar GLB.")
    parser.add_argument("input", type=Path, help="Input avatar GLB/GLTF.")
    parser.add_argument("output", type=Path, help="Output avatar GLB path.")
    parser.add_argument("config", nargs="?", type=Path, help="Optional JSON config or zone_colors.json.")
    return parser.parse_args(args_after_blender_separator())


def args_after_blender_separator() -> list[str]:
    import sys

    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1 :]


def load_config_overrides(config_path: Path | None) -> None:
    if not config_path:
        return

    data = json.loads(config_path.read_text(encoding="utf-8"))
    overrides = dict(data)
    if "top" in data and isinstance(data["top"], dict) and data["top"].get("hex"):
        overrides["top_color_hex"] = data["top"]["hex"]
    if "bottom" in data and isinstance(data["bottom"], dict) and data["bottom"].get("hex"):
        overrides["bottom_color_hex"] = data["bottom"]["hex"]

    for key, value in overrides.items():
        if key in CONFIG:
            CONFIG[key] = value
    print(f"Loaded config overrides from {config_path}")


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def find_body_object() -> bpy.types.Object:
    hints = ["body", "pifuhd", "torso", "base"]
    meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError("No mesh objects found in the imported GLB.")
    for obj in meshes:
        if any(hint in obj.name.lower() for hint in hints):
            return obj
    return max(meshes, key=lambda obj: len(obj.data.vertices))


def smooth_body(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    if CONFIG["use_corrective_smooth"]:
        modifier = obj.modifiers.new(name="body_corrective_smooth", type="CORRECTIVE_SMOOTH")
        modifier.factor = CONFIG["smooth_factor"]
        modifier.iterations = CONFIG["smooth_iterations"]
        modifier.smooth_type = "LENGTH_WEIGHTED"
    else:
        modifier = obj.modifiers.new(name="body_smooth", type="SMOOTH")
        modifier.factor = CONFIG["smooth_factor"]
        modifier.iterations = CONFIG["smooth_iterations"]

    bpy.ops.object.modifier_apply(modifier=modifier.name)
    try:
        bpy.ops.object.shade_smooth()
    except RuntimeError:
        pass
    print(f"Smoothed body '{obj.name}'.")


def get_body_metrics(obj: bpy.types.Object):
    world_coords = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
    z_values = [coord.z for coord in world_coords]
    z_min = min(z_values)
    z_max = max(z_values)
    height = max(z_max - z_min, 1e-6)

    def sample_radius_and_center(target_z: float, band: float = 0.02):
        band_abs = band * height
        points = [coord for coord in world_coords if abs(coord.z - target_z) <= band_abs]
        if len(points) < 8:
            points = [coord for coord in world_coords if abs(coord.z - target_z) <= band_abs * 3]
        if not points:
            return 0.1, Vector((0, 0, target_z))

        center_x = sum(point.x for point in points) / len(points)
        center_y = sum(point.y for point in points) / len(points)
        center = Vector((center_x, center_y, target_z))
        radius = sum(math.hypot(point.x - center_x, point.y - center_y) for point in points) / len(points)
        return max(radius, 0.035), center

    return z_min, z_max, height, sample_radius_and_center


def build_collision_proxy(body: bpy.types.Object) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.duplicate()
    proxy = bpy.context.active_object
    proxy.name = "cloth_collision_proxy_TEMP"

    remesh = proxy.modifiers.new(name="proxy_voxel_remesh", type="REMESH")
    remesh.mode = "VOXEL"
    remesh.voxel_size = CONFIG["proxy_voxel_size"]
    bpy.ops.object.modifier_apply(modifier=remesh.name)

    smooth = proxy.modifiers.new(name="proxy_corrective_smooth", type="CORRECTIVE_SMOOTH")
    smooth.factor = CONFIG["proxy_smooth_factor"]
    smooth.iterations = CONFIG["proxy_smooth_iterations"]
    smooth.smooth_type = "LENGTH_WEIGHTED"
    bpy.ops.object.modifier_apply(modifier=smooth.name)

    collision = proxy.modifiers.new(name="body_collision", type="COLLISION")
    if hasattr(proxy, "collision") and proxy.collision:
        set_if_has(proxy.collision, "thickness_outer", CONFIG["collision_distance"])
        set_if_has(proxy.collision, "thickness_inner", CONFIG["collision_distance"])

    proxy.hide_render = True
    print(f"Built cloth collision proxy '{proxy.name}'.")
    return proxy


def remove_old_overlay_objects() -> None:
    hints = ["overlay", "crop_top", "skirt_overlay", "outfit_top", "outfit_bottom"]
    for obj in list(bpy.data.objects):
        if obj.type == "MESH" and any(hint in obj.name.lower() for hint in hints):
            print(f"Removing old overlay object: {obj.name}")
            bpy.data.objects.remove(obj, do_unlink=True)


def build_top(collision_body: bpy.types.Object, z_min: float, height: float, sample_fn):
    shoulder_z = z_min + CONFIG["shoulder_frac"] * height
    waist_z = z_min + CONFIG["waist_frac"] * height
    shoulder_radius, shoulder_center = sample_fn(shoulder_z)
    waist_radius, waist_center = sample_fn(waist_z)

    top, _, top_indices = create_band_mesh(
        CONFIG["top_object_name"],
        z_bottom=waist_z,
        z_top=shoulder_z,
        radius_bottom=waist_radius * CONFIG["top_start_ease"],
        radius_top=shoulder_radius * 1.05,
        center_bottom=waist_center,
        center_top=shoulder_center,
        segments=CONFIG["garment_segments"],
    )
    add_pin_group(top, top_indices, "pin")
    run_cloth_sim(top, "pin")
    solidify_apply(top, CONFIG["garment_thickness"])
    assign_material(top, make_material("zone_top", CONFIG["top_color_hex"], roughness=0.78))
    print(f"Built cloth-simmed top '{top.name}' using '{collision_body.name}' collision.")
    return top


def build_bottom(collision_body: bpy.types.Object, z_min: float, height: float, sample_fn):
    waist_z = z_min + CONFIG["waist_frac"] * height
    hip_z = z_min + CONFIG["hip_frac"] * height
    hem_z = z_min + CONFIG["hem_frac"] * height
    waist_radius, waist_center = sample_fn(waist_z)
    hip_radius, hip_center = sample_fn(hip_z)

    bottom, _, top_indices = create_band_mesh(
        CONFIG["bottom_object_name"],
        z_bottom=hem_z,
        z_top=waist_z,
        radius_bottom=max(hip_radius, waist_radius) * CONFIG["skirt_flare"],
        radius_top=waist_radius * CONFIG["skirt_top_start_ease"],
        center_bottom=hip_center,
        center_top=waist_center,
        segments=CONFIG["garment_segments"],
    )
    add_pin_group(bottom, top_indices, "pin")
    run_cloth_sim(bottom, "pin")
    solidify_apply(bottom, CONFIG["garment_thickness"])
    assign_material(bottom, make_material("zone_bottom", CONFIG["bottom_color_hex"], roughness=0.78))
    print(f"Built cloth-simmed bottom '{bottom.name}' using '{collision_body.name}' collision.")
    return bottom


def create_band_mesh(
    name: str,
    z_bottom: float,
    z_top: float,
    radius_bottom: float,
    radius_top: float,
    center_bottom: Vector,
    center_top: Vector,
    segments: int,
) -> tuple[bpy.types.Object, list[int], list[int]]:
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bottom_vertices = []
    top_vertices = []

    for index in range(segments):
        angle = 2 * math.pi * index / segments
        bottom_vertices.append(
            bm.verts.new(
                (
                    center_bottom.x + radius_bottom * math.cos(angle),
                    center_bottom.y + radius_bottom * math.sin(angle),
                    z_bottom,
                )
            )
        )
    for index in range(segments):
        angle = 2 * math.pi * index / segments
        top_vertices.append(
            bm.verts.new(
                (
                    center_top.x + radius_top * math.cos(angle),
                    center_top.y + radius_top * math.sin(angle),
                    z_top,
                )
            )
        )

    bm.verts.ensure_lookup_table()
    for index in range(segments):
        next_index = (index + 1) % segments
        bm.faces.new([bottom_vertices[index], bottom_vertices[next_index], top_vertices[next_index], top_vertices[index]])

    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj, list(range(segments)), list(range(segments, segments * 2))


def add_pin_group(obj: bpy.types.Object, indices: list[int], name: str) -> None:
    group = obj.vertex_groups.new(name=name)
    group.add(indices, 1.0, "REPLACE")


def run_cloth_sim(obj: bpy.types.Object, pin_group_name: str) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    cloth = obj.modifiers.new(name="cloth_settle", type="CLOTH")
    settings = cloth.settings
    set_if_has(settings, "mass", CONFIG["cloth_mass"])
    set_if_has(settings, "air_damping", CONFIG["cloth_air_viscosity"])
    set_if_has(settings, "tension_stiffness", CONFIG["cloth_tension_stiffness"])
    set_if_has(settings, "compression_stiffness", CONFIG["cloth_tension_stiffness"])
    set_if_has(settings, "shear_stiffness", CONFIG["cloth_tension_stiffness"])
    set_if_has(settings, "bending_stiffness", CONFIG["cloth_bending_stiffness"])
    set_if_has(settings, "vertex_group_mass", pin_group_name)
    set_if_has(settings, "quality", 8)

    collision = cloth.collision_settings
    set_if_has(collision, "distance_min", CONFIG["collision_distance"])
    set_if_has(collision, "use_self_collision", False)

    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = CONFIG["sim_settle_frames"] + 5
    depsgraph = bpy.context.evaluated_depsgraph_get()

    for frame in range(scene.frame_start, CONFIG["sim_settle_frames"] + 1):
        scene.frame_set(frame)
        depsgraph.update()

    evaluated = obj.evaluated_get(depsgraph)
    baked_mesh = bpy.data.meshes.new_from_object(evaluated)
    old_mesh = obj.data
    obj.data = baked_mesh
    if cloth.name in obj.modifiers:
        obj.modifiers.remove(cloth)
    bpy.data.meshes.remove(old_mesh)
    scene.frame_set(1)
    print(f"Baked cloth sim for '{obj.name}' after {CONFIG['sim_settle_frames']} frames.")


def solidify_apply(obj: bpy.types.Object, thickness: float) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    solid = obj.modifiers.new(name="garment_thickness", type="SOLIDIFY")
    solid.thickness = thickness
    solid.offset = 1.0
    bpy.ops.object.modifier_apply(modifier=solid.name)
    try:
        bpy.ops.object.shade_smooth()
    except RuntimeError:
        pass


def make_material(name: str, hex_color: str, roughness: float = 0.7) -> bpy.types.Material:
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name=name)
    material.use_nodes = True
    material.blend_method = "OPAQUE"
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = hex_to_linear_rgba(hex_color)
        bsdf.inputs["Alpha"].default_value = 1.0
        bsdf.inputs["Metallic"].default_value = 0.0
        bsdf.inputs["Roughness"].default_value = roughness
    return material


def assign_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    obj.data.materials.clear()
    obj.data.materials.append(material)


def set_if_has(obj, attr: str, value) -> None:
    if hasattr(obj, attr):
        setattr(obj, attr, value)


def hex_to_linear_rgba(hex_value: str) -> tuple[float, float, float, float]:
    hex_value = hex_value.strip().lstrip("#")
    srgb = [int(hex_value[index : index + 2], 16) / 255.0 for index in (0, 2, 4)]
    return tuple(srgb_to_linear(channel) for channel in srgb) + (1.0,)


def srgb_to_linear(channel: float) -> float:
    if channel <= 0.04045:
        return channel / 12.92
    return ((channel + 0.055) / 1.055) ** 2.4


if __name__ == "__main__":
    main()
