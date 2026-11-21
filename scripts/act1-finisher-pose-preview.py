"""Act I: Blender preview of three *existing* Rudra Parashu finisher clips.

Non-destructive and QA-only. Uses the exact runtime FBX, not a lookalike rig.
Imports source clips, maps named bone channels onto a COPY of the runtime
armature animation, and renders contact-pose PNGs for director inspection.

No FBX source is edited; no candidate is silently installed at runtime.
A successful render does NOT certify footwork, skinning across every keyframe,
synchronized enemy reactions or Blender-to-Three.js axis conversion.

Usage:
 blender -b --python scripts/act1-finisher-pose-preview.py -- \
 --rig "new 3D assets and animations/Animations/Pro Melee Axe Pack/Meshy_AI_Ashen_Warborn_20261025_generate.fbx" \
 --heavy "public/kaalyuga/anims/rudra/heavy.fbx" \
 --spin "public/kaalyuga/anims/rudra/cast.fbx" \
 --lunge "public/kaalyuga/anims/rudra/attack3.fbx" \
 --output "artifacts/act1-finisher-pose-preview"
"""
from __future__ import annotations
import argparse
import json
import math
import re
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def args():
    p = argparse.ArgumentParser()
    p.add_argument("--rig", required=True, type=Path)
    for name in ("heavy", "spin", "lunge"):
        p.add_argument("--" + name, required=True, type=Path)
    p.add_argument("--output", required=True, type=Path)
    return p.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])


def load_fbx(path: Path):
    if not path.is_file():
        raise FileNotFoundError(str(path))
    existing = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(path.resolve()))
    bpy.context.view_layer.update()
    objects = [o for o in bpy.data.objects if o not in existing]
    rigs = [o for o in objects if o.type == "ARMATURE"]
    if not rigs:
        raise RuntimeError("No FBX armature: " + str(path))
    return objects, max(rigs, key=lambda o: len(o.data.bones))


def norm(name):
    name = re.sub(r"^(mixamorig[:|]?|armature[|:])", "", name, flags=re.I)
    return re.sub("[^a-z0-9]", "", name.lower())


def bone_curves(action):
    return [f for f in action.fcurves if "pose.bones[" in f.data_path]


def source_action(objects, armature):
    direct = armature.animation_data.action if armature.animation_data else None
    actions = [direct] if direct else []
    for obj in objects:
        if obj.animation_data and obj.animation_data.action not in actions:
            actions.append(obj.animation_data.action)
    candidates = [a for a in actions if a and len(bone_curves(a)) >= 12]
    if not candidates:
        raise RuntimeError("FBX contains no skeletal animation action with 12+ curves")
    return max(candidates, key=lambda a: len(bone_curves(a)))


def candidate_action(raw, source_armature, target_armature, label):
    target_names = {}
    for b in target_armature.data.bones:
        target_names.setdefault(norm(b.name), []).append(b.name)
    source_names = {b.name for b in source_armature.data.bones}
    mapping = {}
    unbound = []
    for name in source_names:
        choices = target_names.get(norm(name), [])
        if len(choices) == 1:
            mapping[name] = choices[0]
        else:
            unbound.append(name)

    # Make a copy. Leave original imported action and all source files intact.
    copy = raw.copy()
    copy.name = "QA_ONLY_ACT1_" + label
    copied = 0
    for fc in list(copy.fcurves):
        match = re.search(r'pose\.bones\["([^"]+)"\]', fc.data_path)
        if not match or match.group(1) not in mapping:
            copy.fcurves.remove(fc)
            continue
        source_name = match.group(1)
        dest_name = mapping[source_name]
        fc.data_path = fc.data_path.replace(
            'pose.bones["' + source_name + '"]',
            'pose.bones["' + dest_name + '"]')
        copied += 1
    if copied < 12:
        raise RuntimeError(label + " has fewer than 12 mapped animation curves")

    # Compare rest orientations. This is a risk gate, not a claim of retarget
    # quality: different shoulder/hip pivots can still deform despite names.
    rest_deviation = []
    for src_name, tgt_name in mapping.items():
        src_b = source_armature.data.bones[src_name]
        tgt_b = target_armature.data.bones[tgt_name]
        angle = src_b.matrix_local.to_quaternion().rotation_difference(
            tgt_b.matrix_local.to_quaternion()).angle
        rest_deviation.append((src_name, math.degrees(angle)))
    worst = sorted(rest_deviation, key=lambda pair: pair[1], reverse=True)[:10]
    return copy, {
        "source_action": raw.name, "candidate_action": copy.name,
        "mapped_bones": len(mapping), "canonical_bones": len(target_armature.data.bones),
        "unmapped_source_bones": sorted(unbound),
        "mapped_curves": copied,
        "rest_rotation_deg_max": round(max((v for _, v in rest_deviation), default=180), 3),
        "rest_rotation_deg_worst": [{"bone": n, "degrees": round(v, 2)} for n, v in worst],
        "direct_release_approved": False,
        "limitation": "Only contact-pose reference. Bone rest, foot sliding, axe socket, enemy reaction and exports still require visual and runtime validation."
    }


def render_pose(target, action, out_path: Path):
    scene = bpy.context.scene
    target.animation_data_create()
    target.animation_data.action = action
    first, last = (float(x) for x in action.frame_range)
    contact = first + (last - first) * 0.35
    scene.frame_set(int(contact), subframe=contact % 1)
    bpy.context.view_layer.update()

    meshes = [obj for obj in target.children_recursive if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError("Runtime FBX has no mesh under target armature")
    bounds = [obj.matrix_world @ Vector(c) for obj in meshes for c in obj.bound_box]
    lo = Vector([min(x[i] for x in bounds) for i in range(3)])
    hi = Vector([max(x[i] for x in bounds) for i in range(3)])
    center = (lo + hi) * 0.5
    size = max(0.01, float((hi - lo).length))
    cam_data = bpy.data.cameras.new("QA_finisher_camera")
    cam = bpy.data.objects.new("QA_finisher_camera", cam_data)
    scene.collection.objects.link(cam)
    cam.location = center + Vector((0.8, -1.5, 0.6)).normalized() * size * 2
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = size * 1.14
    scene.camera = cam
    light_data = bpy.data.lights.new("QA_softbox", "AREA")
    light = bpy.data.objects.new("QA_softbox", light_data)
    scene.collection.objects.link(light)
    light.location = center + Vector((1.1, -1.2, 2.1)).normalized() * size
    light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()
    light_data.energy = 1300
    light_data.size = size * 0.8
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 4
    # Ubuntu's stock Blender is compiled without OpenImageDenoiser.
    scene.cycles.use_denoising = False
    for view_layer in scene.view_layers:
        view_layer.cycles.use_denoising = False
    scene.render.resolution_x = 480
    scene.render.resolution_y = 480
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = True
    scene.render.filepath = str(out_path.resolve())
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(light, do_unlink=True)
    bpy.data.objects.remove(cam, do_unlink=True)
    return {"contact_frame": round(contact, 3), "png": out_path.name}


def main():
    a = args()
    a.output.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    base_objects, target = load_fbx(a.rig)
    mesh_count = sum(o.type == "MESH" for o in base_objects)
    report = {
        "schema_version": 1,
        "runtime_rig": str(a.rig),
        "blender_version": bpy.app.version_string,
        "runtime_meshes": mesh_count,
        "runtime_bones": len(target.data.bones),
        "variants": {},
        "release_approved": False,
        "original_assets_modified": False
    }
    if mesh_count == 0:
        raise RuntimeError("Canonical Rudra runtime rig has no mesh")
    for variant, source_file in (
        ("downward_crush", a.heavy),
        ("spin_360_cleave", a.spin),
        ("impaling_lunge", a.lunge)
    ):
        objects, source_rig = load_fbx(source_file)
        source_anim = source_action(objects, source_rig)
        action, info = candidate_action(source_anim, source_rig, target, variant)
        # Prevent source armature/mesh appearing in the rendered image.
        for obj in objects:
            obj.hide_render = True
        pose = render_pose(target, action, a.output / (variant + "-contact.png"))
        info.update(pose)
        info["source_file"] = str(source_file)
        report["variants"][variant] = info
        for obj in objects:
            bpy.data.objects.remove(obj, do_unlink=True)

    report_path = a.output / "report.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"result": "candidate_contact_frames_only",
                       "report": str(report_path),
                       "variants": list(report["variants"]),
                       "release_approved": False}))


if __name__ == "__main__":
    main()
