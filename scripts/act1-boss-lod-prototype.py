"""Non-destructive Blender FBX -> lower-poly skinned GLB proof of concept.

Only a prototype: NEVER changes original FBX, the production asset manifest,
animations, texture masters, or the runtime renderer. Outputs under artifacts/.
Example:
  blender -b --python scripts/act1-boss-lod-prototype.py -- \
    --input "new 3D assets and animations/Animations/Creature Pack (4)/Meshy_AI_Bellhorn_Warlord_20261114_generate.fbx" \
    --output artifacts/act1-lod/dundubhi-prototype.glb --ratio 0.62
"""
import argparse
import json
import math
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def options():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--input", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--ratio", type=float, default=0.62)
    p.add_argument("--render-previews", action="store_true")
    a = p.parse_args(argv)
    if not 0.3 <= a.ratio < 1:
        p.error("--ratio must be >= 0.3 and < 1")
    if not a.input.is_file():
        p.error("source FBX not found: " + str(a.input))
    if a.output.resolve() == a.input.resolve() or "artifacts" not in a.output.parts:
        p.error("--output must be a distinct file under artifacts/")
    return a


def mesh_objects():
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]


def rig_objects():
    return [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]


def describe():
    objects = mesh_objects()
    bounds = [obj.matrix_world @ Vector(corner)
              for obj in objects for corner in obj.bound_box]
    min_xyz = [min((v[i] for v in bounds), default=0.0) for i in range(3)]
    max_xyz = [max((v[i] for v in bounds), default=0.0) for i in range(3)]
    return {
        "meshes": len(objects),
        "triangles": sum(max(0, len(p.vertices) - 2)
                         for obj in objects for p in obj.data.polygons),
        "vertices": sum(len(obj.data.vertices) for obj in objects),
        "armature_bones": max((len(obj.data.bones) for obj in rig_objects()), default=0),
        "skinned_meshes": sum(bool(obj.find_armature()) for obj in objects),
        "uv_meshes": sum(bool(obj.data.uv_layers) for obj in objects),
        "materials": sum(len(obj.data.materials) for obj in objects),
        "bbox_min": min_xyz,
        "bbox_max": max_xyz,
    }


def render_preview(target, input_meshes):
    """Small CPU-rendered comparison; failure is reported, never silently verified."""
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 8
    scene.render.resolution_x = 480
    scene.render.resolution_y = 480
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    vertices = [obj.matrix_world @ Vector(corner)
                for obj in input_meshes for corner in obj.bound_box]
    center = Vector(tuple((min(v[i] for v in vertices) + max(v[i] for v in vertices)) / 2
                          for i in range(3)))
    span = max((max(v[i] for v in vertices) - min(v[i] for v in vertices)
                for i in range(3)), default=2.0)
    cam_data = bpy.data.cameras.new("Act1_Lod_QA_Camera")
    cam = bpy.data.objects.new("Act1_Lod_QA_Camera", cam_data)
    scene.collection.objects.link(cam)
    cam.location = center + Vector((0, -2.8 * span, 0.18 * span))
    look = center - cam.location
    cam.rotation_euler = look.to_track_quat("-Z", "Y").to_euler()
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = span * 1.25
    scene.camera = cam
    light_data = bpy.data.lights.new("Act1_Lod_QA_Light", "AREA")
    light_obj = bpy.data.objects.new("Act1_Lod_QA_Light", light_data)
    scene.collection.objects.link(light_obj)
    light_obj.location = center + Vector((-span, -span * 1.3, span * 1.6))
    light_obj.rotation_euler = (center - light_obj.location).to_track_quat("-Z", "Y").to_euler()
    light_data.energy = 900
    light_data.shape = "DISK"
    light_data.size = max(span * 2, 1)
    target.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(target.resolve())
    bpy.ops.render.render(write_still=True)
    # The extra camera/light must never become part of the released GLB.
    bpy.data.objects.remove(cam, do_unlink=True)
    bpy.data.objects.remove(light_obj, do_unlink=True)
    return target.is_file() and target.stat().st_size > 1024


def import_source(path):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    opts = {"filepath": str(path.resolve()), "use_anim": True, "ignore_leaf_bones": False}
    supported = {p.identifier for p in bpy.ops.import_scene.fbx.get_rna_type().properties}
    bpy.ops.import_scene.fbx(**{k: v for k, v in opts.items() if k in supported})
    if not mesh_objects() or not rig_objects():
        raise RuntimeError("Canonical boss FBX has no meshes or armature")


def simplify(ratio):
    processed, skipped = [], []
    for obj in mesh_objects():
        triangles = sum(max(0, len(f.vertices)-2) for f in obj.data.polygons)
        if triangles < 3000 or not obj.find_armature() or obj.data.shape_keys:
            skipped.append({"mesh": obj.name, "triangles": triangles,
                            "reason": "small, unskinned or morph-target mesh"})
            continue
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        mod = obj.modifiers.new("ACT1_PROTOTYPE_DECIMATE", "DECIMATE")
        mod.ratio = ratio
        # Decimate in bind pose BEFORE the Armature modifier, preserving the
        # original skeleton and interpolated weights.
        while list(obj.modifiers).index(mod) > 0:
            bpy.ops.object.modifier_move_up(modifier=mod.name)
        bpy.ops.object.modifier_apply(modifier=mod.name)
        processed.append({"mesh": obj.name, "source_triangles": triangles,
                          "output_triangles": sum(max(0, len(f.vertices)-2)
                          for f in obj.data.polygons)})
    return processed, skipped


def glb_json(path):
    with path.open("rb") as fp:
        head = fp.read(12)
        if len(head) != 12 or head[:4] != b"glTF":
            raise RuntimeError("GLB header invalid")
        length, chunk_type = struct.unpack("<I4s", fp.read(8))
        if chunk_type != b"JSON":
            raise RuntimeError("GLB JSON chunk missing")
        return json.loads(fp.read(length).decode("utf-8"))


def main():
    a = options()
    import_source(a.input)
    before = describe()
    if before["armature_bones"] < 20 or before["skinned_meshes"] == 0:
        raise RuntimeError("Source boss skeleton/skin missing")
    warnings = []
    if a.render_previews:
        try:
            render_preview(a.output.with_suffix(".before.png"), mesh_objects())
        except Exception as exc:
            warnings.append("before preview failed: " + str(exc))
    processed, skipped = simplify(a.ratio)
    after = describe()
    if before["armature_bones"] != after["armature_bones"]:
        raise RuntimeError("Prototype altered armature bone count")
    if after["skinned_meshes"] != before["skinned_meshes"]:
        raise RuntimeError("Prototype lost an armature-bound mesh")
    if after["triangles"] >= before["triangles"] or not processed:
        raise RuntimeError("No triangle reduction achieved")
    if after["uv_meshes"] < before["uv_meshes"]:
        raise RuntimeError("Prototype lost UV-bearing meshes")
    for axis in range(3):
        span = max(0.001, before["bbox_max"][axis] - before["bbox_min"][axis])
        for key in ("bbox_min", "bbox_max"):
            if abs(before[key][axis] - after[key][axis]) > span * 0.035:
                raise RuntimeError("Mesh silhouette bounding box drift exceeds 3.5%")
    if a.render_previews:
        try:
            render_preview(a.output.with_suffix(".after.png"), mesh_objects())
        except Exception as exc:
            warnings.append("after preview failed: " + str(exc))
    a.output.parent.mkdir(parents=True, exist_ok=True)
    export_opts = {
        "filepath": str(a.output.resolve()),
        "export_format": "GLB",
        "export_skins": True,
        "export_animations": False,  # Animations remain canonical FBX clips.
        "export_image_format": "AUTO",
        "use_selection": False,
    }
    supported = {p.identifier for p in bpy.ops.export_scene.gltf.get_rna_type().properties}
    bpy.ops.export_scene.gltf(**{k: v for k, v in export_opts.items() if k in supported})
    if not a.output.is_file() or a.output.stat().st_size < 1024:
        raise RuntimeError("Exporter returned empty GLB")
    gltf = glb_json(a.output)
    if not gltf.get("skins") or not gltf.get("meshes"):
        raise RuntimeError("GLB failed skin/mesh structural validation")
    report = {
        "status": "prototype_not_runtime_approved",
        "source": str(a.input),
        "output": str(a.output),
        "ratio_requested": a.ratio,
        "before": before, "after": after,
        "actual_triangle_reduction_pct": round(
            100 * (1 - after["triangles"] / max(1, before["triangles"])), 2),
        "processed": processed, "skipped": skipped,
        "glb_bytes": a.output.stat().st_size,
        "glb_meshes": len(gltf["meshes"]),
        "glb_skins": len(gltf["skins"]),
        "glb_skin_joint_counts": [len(s.get("joints", [])) for s in gltf["skins"]],
        "glb_materials": len(gltf.get("materials", [])),
        "warnings": warnings,
        "limitations": [
            "Not used by game or manifest",
            "No validated UV/skin deformation frame-by-frame",
            "Materials/animations and combat contact require actual browser QA",
            "Only switch runtime after A/B screenshots and animation checks",
        ],
    }
    report_file = a.output.with_suffix(".report.json")
    report_file.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"report": str(report_file),
                      "reduction_pct": report["actual_triangle_reduction_pct"],
                      "glb_bytes": report["glb_bytes"], "warnings": warnings}))


if __name__ == "__main__":
    main()
