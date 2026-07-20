import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector


NEUTRAL_SURFACE = (0.94, 0.91, 0.86, 1.0)
FRONT_FACE_NORMAL_Y = -0.08


def main():
    mesh_path, image_path, output_path = parse_args()
    clear_scene()
    import_model(mesh_path)
    body = join_meshes([obj for obj in bpy.context.scene.objects if obj.type == "MESH"])
    body.name = "textured_pifuhd_avatar"
    center_and_scale_to_height(body, 1.72)
    create_front_projected_uvs(body)
    apply_front_texture(body, image_path)
    assign_front_texture_faces(body)
    shade_smooth(body)
    add_lights_and_camera()
    export_glb(output_path)
    print(f"Textured avatar exported to {output_path}")


def parse_args():
    if "--" not in sys.argv:
        raise SystemExit("Usage: blender --background --python project_front_texture.py -- mesh.obj image.png output.glb")

    args = sys.argv[sys.argv.index("--") + 1 :]
    if len(args) != 3:
        raise SystemExit("Usage: blender --background --python project_front_texture.py -- mesh.obj image.png output.glb")

    return Path(args[0]).resolve(), Path(args[1]).resolve(), Path(args[2]).resolve()


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
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)


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


def create_front_projected_uvs(obj):
    mesh = obj.data
    uv_layer = mesh.uv_layers.new(name="front_projected_uv") if not mesh.uv_layers else mesh.uv_layers[0]
    mesh.uv_layers.active = uv_layer

    min_x = min(vertex.co.x for vertex in mesh.vertices)
    max_x = max(vertex.co.x for vertex in mesh.vertices)
    min_z = min(vertex.co.z for vertex in mesh.vertices)
    max_z = max(vertex.co.z for vertex in mesh.vertices)
    width = max(max_x - min_x, 0.001)
    height = max(max_z - min_z, 0.001)

    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.faces.ensure_lookup_table()
    uv = bm.loops.layers.uv.verify()

    # Front projection. X maps horizontally, Z maps vertically. Faces facing away
    # still get the projected texture, but one-photo avatars will always be best
    # from the front.
    for face in bm.faces:
        for loop in face.loops:
            co = loop.vert.co
            u = (co.x - min_x) / width
            v = (co.z - min_z) / height
            loop[uv].uv = (u, v)

    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


def apply_front_texture(obj, image_path):
    image = load_display_cleaned_image(image_path)
    front_material = make_projected_texture_material(image)
    neutral_material = make_neutral_material()

    obj.data.materials.clear()
    obj.data.materials.append(front_material)
    obj.data.materials.append(neutral_material)


def load_display_cleaned_image(image_path):
    image = bpy.data.images.load(str(image_path))
    image.colorspace_settings.name = "sRGB"
    width, height = image.size
    source_pixels = list(image.pixels)
    cleaned_pixels = []

    for index in range(0, len(source_pixels), 4):
        r, g, b, a = source_pixels[index : index + 4]

        if is_baked_background_pixel(r, g, b, a) or is_source_person_pixel(r, g, b, a):
            cleaned_pixels.extend(NEUTRAL_SURFACE)
        else:
            cleaned_pixels.extend((r, g, b, 1.0))

    cleaned = bpy.data.images.new(f"{Path(image_path).stem}_display_cleaned", width, height, alpha=True)
    cleaned.colorspace_settings.name = "sRGB"
    cleaned.pixels.foreach_set(cleaned_pixels)
    cleaned.pack()
    return cleaned


def is_baked_background_pixel(r, g, b, a):
    if a < 0.05:
        return True

    average = (r + g + b) / 3
    saturation = max(r, g, b) - min(r, g, b)

    # The current sample image has a checkerboard/matte baked into RGB instead
    # of real alpha. Treat neutral gray/white pixels as preview background so
    # they do not become body/clothing color in the projected texture.
    return saturation < 0.035 and average > 0.72


def is_source_person_pixel(r, g, b, a):
    if a < 0.05:
        return True

    average = (r + g + b) / 3
    warm_skin = r > 0.36 and g > 0.20 and r > g + 0.08 and g > b + 0.02
    dark_hair_or_shoe = average < 0.20
    warm_brown_hair = average < 0.42 and r > b + 0.08 and g > b + 0.03

    return warm_skin or dark_hair_or_shoe or warm_brown_hair


def make_projected_texture_material(image):
    material = bpy.data.materials.new("front_photo_texture")
    material.use_nodes = True
    material.blend_method = "OPAQUE"
    material.use_screen_refraction = False
    nodes = material.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    texture.extension = "EXTEND"
    material.node_tree.links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Alpha"].default_value = 1.0
    bsdf.inputs["Metallic"].default_value = 0
    bsdf.inputs["Roughness"].default_value = 0.7
    return material


def make_neutral_material():
    material = bpy.data.materials.new("neutral_avatar_surface")
    material.use_nodes = True
    material.blend_method = "OPAQUE"
    nodes = material.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = NEUTRAL_SURFACE
    bsdf.inputs["Alpha"].default_value = 1.0
    bsdf.inputs["Metallic"].default_value = 0
    bsdf.inputs["Roughness"].default_value = 0.78
    return material


def assign_front_texture_faces(obj):
    obj.data.polygons.foreach_set(
        "material_index",
        [0 if polygon.normal.y < FRONT_FACE_NORMAL_Y else 1 for polygon in obj.data.polygons],
    )
    obj.data.update()


def shade_smooth(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    try:
        bpy.ops.object.shade_smooth()
    except RuntimeError:
        pass


def add_lights_and_camera():
    bpy.ops.object.light_add(type="AREA", location=(0, -3, 3.2))
    light = bpy.context.object
    light.name = "texture_preview_softbox"
    light.data.energy = 600
    light.data.size = 4

    bpy.ops.object.camera_add(location=(0, -3.8, 1.05), rotation=(1.36, 0, 0))
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
