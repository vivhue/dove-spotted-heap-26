# Local Human Avatar Prototype

This folder is intentionally separate from the Bove Closet app.

Goal:

```text
person image
-> human-specific reconstruction model
-> rough OBJ/GLB
-> Blender cleanup
-> app-ready GLB
```

This is different from TripoSR. TripoSR is generic image-to-3D, so it can turn the whole image rectangle into a lumpy object. Human avatar generation needs a model that understands bodies, pose, clothing, face, and hair.

## Recommended Path

Start with this order:

1. **PIFuHD** for the first human-specific local experiment.
   - Best first test because it is famous, single-image focused, and conceptually simpler.
   - It may still be painful on Mac and may need older Python/PyTorch.
2. **ECON** if PIFuHD is too rough.
   - Better human prior and clothed-body structure.
   - More complex setup because it depends on SMPL/SMPL-X assets.
3. **ICON** after that.
   - Similar family, more involved, research-style pipeline.

Do not connect any of these to the mobile app until the output is good in Blender.

## Input Rules

Human reconstruction works best with:

- full body visible, head to shoes
- front-facing or mostly front-facing
- simple pose, arms not crossing the torso
- clean background
- no baked checkerboard background
- tight/simple clothing if possible
- high-resolution image

If the input has a checkerboard pattern baked into the pixels, remove it first with background removal.

## Blender Cleanup

Use Blender after the model is generated. Blender is the post-process step:

```text
rough avatar mesh
-> delete background chunks
-> smooth normals
-> reduce tiny artifacts
-> scale/center
-> export GLB
```

Manual GUI flow:

1. Open Blender.
2. `File > Import > glTF 2.0` or `Wavefront (.obj)`.
3. Import the generated model.
4. Delete unrelated chunks:
   - Select model.
   - Press `Tab` for Edit Mode.
   - Select unwanted pieces.
   - Press `X` -> `Vertices`.
5. Smooth:
   - Object Mode.
   - Right click -> `Shade Smooth`.
   - Add Modifier -> `Smooth` if needed.
6. Export:
   - `File > Export > glTF 2.0`
   - Format: `GLB`

Automated cleanup script:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python blender/clean_avatar.py -- \
  input.glb \
  output-clean.glb
```

If Blender is installed somewhere else, replace `/Applications/Blender.app/Contents/MacOS/Blender` with the real path.

## Zone Color Materials

For a cleaner 3D-avatar look, prefer zone materials over front-photo texture
projection. This keeps the mesh artifact-free while still borrowing the user's
hair, skin, outfit, and shoe colors from the source photo.

Extract colors from the original photo:

```sh
python -m pip install -r requirements-zone-colors.txt

python scripts/extract_zone_colors.py \
  pifuhd/sample_bove/ariana.png \
  outputs/ariana-zone-colors.json \
  --debug-dir outputs/ariana-zone-debug
```

Apply those colors to a named hybrid avatar:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python blender/assign_zone_materials.py -- \
  outputs/hybrid-ariana-avatar.glb \
  outputs/ariana-zone-colors.json \
  outputs/hybrid-ariana-zone-colored.glb
```

`assign_zone_materials.py` first looks for named mesh parts like `hair_cap`,
`clear_stylized_head`, `pifuhd_body_base`, `clean_crop_top_overlay`, and
`clean_skirt_overlay`. If those names are not available, it falls back to rough
height bands. Named parts are the preferred path because they avoid hard
paint-by-height mistakes on unusual outfits or poses.

## What This Will Not Solve

This does not automatically make clothes swappable on a 3D body.

For true 3D clothing try-on you need:

```text
rigged body
+ garment mesh
+ garment fitting
+ cloth simulation or deformation
+ collision/body measurements
```

For Bove Closet, the realistic product split is:

```text
2D try-on -> realistic outfit result
3D avatar -> profile / styling / interactive visual layer
```
