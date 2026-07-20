import sys
from pathlib import Path

import bpy
from mathutils import Vector


def main():
    input_path, output_path = parse_args()
    clear_scene()
    import_model(input_path)
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]

    if not mesh_objects:
        raise RuntimeError(f"No mesh objects found in {input_path}")

    joined = join_meshes(mesh_objects)
    loose_parts = separate_loose_parts(joined)
    keep_largest_parts(loose_parts, keep_ratio=0.08)

    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    for obj in mesh_objects:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.shade_smooth()
        add_smooth_modifier(obj)
        obj.select_set(False)

    center_and_scale(mesh_objects)
    export_glb(output_path)
    print(f"Cleaned avatar exported to {output_path}")


def parse_args():
    if "--" not in sys.argv:
        raise SystemExit("Usage: blender --background --python clean_avatar.py -- input.glb output.glb")

    args = sys.argv[sys.argv.index("--") + 1 :]
    if len(args) != 2:
        raise SystemExit("Usage: blender --background --python clean_avatar.py -- input.glb output.glb")

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
    bpy.ops.object.select_all(action="DESELECT")
    for obj in mesh_objects:
        obj.select_set(True)

    bpy.context.view_layer.objects.active = mesh_objects[0]
    bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    joined.name = "avatar_merged"
    return joined


def separate_loose_parts(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    return [part for part in bpy.context.scene.objects if part.type == "MESH"]


def keep_largest_parts(parts, keep_ratio):
    scored = sorted(parts, key=object_volume_score, reverse=True)
    if not scored:
        return

    largest_score = object_volume_score(scored[0])
    minimum_score = largest_score * keep_ratio

    for obj in scored:
        if object_volume_score(obj) < minimum_score:
            bpy.data.objects.remove(obj, do_unlink=True)


def object_volume_score(obj):
    dimensions = obj.dimensions
    return max(dimensions.x, 0.001) * max(dimensions.y, 0.001) * max(dimensions.z, 0.001)


def add_smooth_modifier(obj):
    modifier = obj.modifiers.new("gentle_surface_smooth", "SMOOTH")
    modifier.factor = 0.35
    modifier.iterations = 2
    bpy.context.view_layer.objects.active = obj
    try:
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    except RuntimeError:
        pass


def center_and_scale(mesh_objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in mesh_objects:
        obj.select_set(True)

    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")

    min_corner = [float("inf"), float("inf"), float("inf")]
    max_corner = [float("-inf"), float("-inf"), float("-inf")]

    for obj in mesh_objects:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            for index in range(3):
                min_corner[index] = min(min_corner[index], world[index])
                max_corner[index] = max(max_corner[index], world[index])

    center = [(min_corner[index] + max_corner[index]) / 2 for index in range(3)]
    height = max(max_corner[2] - min_corner[2], 0.001)
    scale = 1.8 / height

    for obj in mesh_objects:
        obj.location.x -= center[0]
        obj.location.y -= center[1]
        obj.location.z -= min_corner[2]
        obj.scale = (obj.scale.x * scale, obj.scale.y * scale, obj.scale.z * scale)


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
