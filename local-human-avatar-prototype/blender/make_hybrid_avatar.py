import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


SKIN = (0.78, 0.56, 0.43, 1.0)
SKIN_LIGHT = (0.92, 0.72, 0.58, 1.0)
HAIR = (0.05, 0.035, 0.03, 1.0)
WHITE = (0.98, 0.95, 0.9, 1.0)
DARK = (0.025, 0.022, 0.02, 1.0)
LIP = (0.48, 0.16, 0.17, 1.0)
OUTFIT = (0.93, 0.9, 0.84, 1.0)


def main():
    input_path, output_path = parse_args()
    clear_scene()
    import_model(input_path)
    body = join_meshes([obj for obj in bpy.context.scene.objects if obj.type == "MESH"])
    body.name = "pifuhd_body_base"
    assign_material(body, make_material("soft_body_surface", SKIN_LIGHT, roughness=0.72))
    shade_and_smooth(body)
    center_and_scale_to_height(body, 1.72)

    # PIFuHD head/facial surface is usually muddy. Keep body context but make the
    # intentional face read clearly with stylized geometry layered on top.
    add_stylized_head()
    add_outfit_overlays()
    add_lights_and_camera()
    export_glb(output_path)
    print(f"Hybrid avatar exported to {output_path}")


def parse_args():
    if "--" not in sys.argv:
        raise SystemExit("Usage: blender --background --python make_hybrid_avatar.py -- input.obj output.glb")

    args = sys.argv[sys.argv.index("--") + 1 :]
    if len(args) != 2:
        raise SystemExit("Usage: blender --background --python make_hybrid_avatar.py -- input.obj output.glb")

    return Path(args[0]).resolve(), Path(args[1]).resolve()


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_model(path):
    suffix = path.suffix.lower()
    if suffix in {".glb", ".gltf"}:
        bpy.ops.import_scene.gltf(filepath=str(path))
        return
    if suffix == ".obj":
        bpy.ops.wm.obj_import(filepath=str(path))
        return
    raise RuntimeError(f"Unsupported model format: {suffix}")


def join_meshes(mesh_objects):
    if not mesh_objects:
        raise RuntimeError("No mesh objects found")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in mesh_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objects[0]
    if len(mesh_objects) > 1:
        bpy.ops.object.join()
    return bpy.context.view_layer.objects.active


def center_and_scale_to_height(obj, target_height):
    min_corner, max_corner = world_bounds([obj])
    center = (min_corner + max_corner) * 0.5
    height = max(max_corner.z - min_corner.z, 0.001)
    factor = target_height / height
    obj.location -= center
    obj.location.z += height * 0.5
    obj.scale = (obj.scale.x * factor, obj.scale.y * factor, obj.scale.z * factor)
    bpy.context.view_layer.update()


def world_bounds(objects):
    min_corner = Vector((float("inf"), float("inf"), float("inf")))
    max_corner = Vector((float("-inf"), float("-inf"), float("-inf")))
    for obj in objects:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            min_corner.x = min(min_corner.x, world.x)
            min_corner.y = min(min_corner.y, world.y)
            min_corner.z = min(min_corner.z, world.z)
            max_corner.x = max(max_corner.x, world.x)
            max_corner.y = max(max_corner.y, world.y)
            max_corner.z = max(max_corner.z, world.z)
    return min_corner, max_corner


def add_stylized_head():
    skin = make_material("warm_skin", SKIN, roughness=0.64)
    hair = make_material("dark_hair", HAIR, roughness=0.82)
    white = make_material("soft_eye_white", WHITE, roughness=0.48)
    dark = make_material("dark_features", DARK, roughness=0.55)
    lip = make_material("soft_lips", LIP, roughness=0.58)

    head = add_uv_sphere("clear_stylized_head", (0, -0.03, 1.58), (0.135, 0.112, 0.17), skin, segments=64, rings=32)
    neck = add_uv_sphere("smooth_neck", (0, -0.015, 1.39), (0.07, 0.055, 0.09), skin, segments=40, rings=18)
    shade_and_smooth(head)
    shade_and_smooth(neck)

    # Hair cap and ponytail-like volume, borrowing the source-image vibe without claiming likeness.
    hair_cap = add_uv_sphere("hair_cap", (0, -0.045, 1.66), (0.145, 0.118, 0.105), hair, segments=64, rings=24)
    hair_cap.scale.z *= 0.75
    pony = add_uv_sphere("high_ponytail_volume", (0.055, 0.015, 1.88), (0.075, 0.06, 0.16), hair, segments=40, rings=18)
    pony.rotation_euler[1] = math.radians(-18)
    hair_tail = add_uv_sphere("falling_hair_shape", (0.105, 0.015, 1.62), (0.065, 0.05, 0.29), hair, segments=40, rings=18)
    hair_tail.rotation_euler[1] = math.radians(-12)

    # Face is placed on the front side. Preview often opens from arbitrary angles,
    # so these are intentionally slightly raised from the head surface.
    add_uv_sphere("left_eye_white", (-0.045, -0.125, 1.61), (0.026, 0.008, 0.015), white, segments=24, rings=12)
    add_uv_sphere("right_eye_white", (0.045, -0.125, 1.61), (0.026, 0.008, 0.015), white, segments=24, rings=12)
    add_uv_sphere("left_pupil", (-0.045, -0.132, 1.608), (0.009, 0.004, 0.009), dark, segments=16, rings=8)
    add_uv_sphere("right_pupil", (0.045, -0.132, 1.608), (0.009, 0.004, 0.009), dark, segments=16, rings=8)
    add_uv_sphere("soft_nose", (0, -0.135, 1.57), (0.018, 0.018, 0.033), skin, segments=20, rings=10)
    mouth = add_uv_sphere("visible_mouth", (0, -0.137, 1.515), (0.042, 0.006, 0.012), lip, segments=24, rings=8)
    mouth.rotation_euler[0] = math.radians(0)

    left_brow = add_cube("left_brow", (-0.045, -0.137, 1.642), (0.055, 0.006, 0.008), dark)
    right_brow = add_cube("right_brow", (0.045, -0.137, 1.642), (0.055, 0.006, 0.008), dark)
    left_brow.rotation_euler[1] = math.radians(-8)
    right_brow.rotation_euler[1] = math.radians(8)

    for obj in bpy.context.scene.objects:
        if obj.type == "MESH" and obj.name.startswith(("hair", "high_", "falling_", "left_", "right_", "soft_", "visible_")):
            shade_and_smooth(obj)


def add_outfit_overlays():
    outfit = make_material("cream_outfit_readable", OUTFIT, roughness=0.78)
    top = add_uv_sphere("clean_crop_top_overlay", (0, -0.105, 1.13), (0.24, 0.035, 0.18), outfit, segments=48, rings=18)
    top.scale.z *= 0.65
    skirt = add_uv_sphere("clean_skirt_overlay", (0, -0.095, 0.82), (0.245, 0.04, 0.16), outfit, segments=48, rings=18)
    skirt.scale.z *= 0.75
    shade_and_smooth(top)
    shade_and_smooth(skirt)


def add_uv_sphere(name, location, scale, material, segments=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    assign_material(obj, material)
    return obj


def add_cube(name, location, scale, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    assign_material(obj, material)
    return obj


def make_material(name, color, roughness=0.7):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0
    return material


def assign_material(obj, material):
    obj.data.materials.clear()
    obj.data.materials.append(material)


def shade_and_smooth(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    try:
        bpy.ops.object.shade_smooth()
    except RuntimeError:
        pass
    modifier = obj.modifiers.new("gentle_smooth", "SMOOTH")
    modifier.factor = 0.18
    modifier.iterations = 1
    try:
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    except RuntimeError:
        pass


def add_lights_and_camera():
    bpy.ops.object.light_add(type="AREA", location=(0, -3, 3.2))
    key = bpy.context.object
    key.name = "large_softbox"
    key.data.energy = 500
    key.data.size = 4

    bpy.ops.object.camera_add(location=(0, -3.8, 1.15), rotation=(math.radians(78), 0, 0))
    bpy.context.scene.camera = bpy.context.object


def export_glb(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
    )


if __name__ == "__main__":
    main()
