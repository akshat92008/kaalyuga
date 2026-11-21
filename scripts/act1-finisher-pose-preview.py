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
 --weapon "new 3D assets and animations/3D Models/Weapons/Bloodforged_Trident_Axe_20261025/Meshy_AI_Bloodforged_Trident_Axe_20261025_texture.fbx" \
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
    p.add_argument("--weapon", required=True, type=Path)
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
        # Quaternion q and -q encode the same orientation; report the
        # shortest angle rather than alarming 355-degree false positives.
        degrees = math.degrees(angle)
        rest_deviation.append((src_name, min(degrees, abs(360 - degrees))))
    worst = sorted(rest_deviation, key=lambda pair: pair[1], reverse=True)[:10]
    return copy, {
        "source_action": raw.name, "candidate_action": copy.name,
        "mapped_bones": len(mapping), "canonical_bones": len(target_armature.data.bones),
        "unmapped_source_bones": sorted(unbound),
        "mapped_curves": copied,
        "rest_rotation_deg_max": round(max((v for _, v in rest_deviation), default=180), 3),
        "rest_rotation_deg_worst": [{"bone": n, "degrees": round(v, 2)} for n, v in worst],
        "rest_orientation_conflicts_gt_35deg": sum(v > 35 for _, v in rest_deviation),
        "direct_release_approved": False,
        "limitation": "Only pose references. Significant rest-orientation differences, foot sliding, axe socket, enemy reaction and exports require director and runtime validation."
    }



def attach_qa_weapon(target, path: Path):
    """Source FBX geometry, parented to the animated right-hand *for QA only*.

    Three.js normalizes Rudra to 1.48 m and the Parashu to 1.04 m. This
    reproduces their relative size and the authored Euler offset but cannot
    prove Blender/Three coordinate conventions match; do not export to runtime.
    """
    if not path.is_file():
        raise FileNotFoundError(str(path))
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(path.resolve()))
    imported = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in imported if o.type == "MESH"]
    if not meshes:
        raise RuntimeError("Parashu source FBX imported with no meshes")
    right_hand = next(
        (b for b in target.pose.bones if norm(b.name) == "righthand"), None)
    if right_hand is None:
        raise RuntimeError("Runtime Rudra rig has no right-hand socket bone")

    bpy.context.view_layer.update()
    bounds = [m.matrix_world @ Vector(c) for m in meshes for c in m.bound_box]
    lo = Vector([min(v[i] for v in bounds) for i in range(3)])
    hi = Vector([max(v[i] for v in bounds) for i in range(3)])
    weapon_max_dim = max(1e-5, *(float(v) for v in (hi - lo)))

    character_meshes = [m for m in target.children_recursive if m.type == "MESH"]
    character_points = [m.matrix_world @ Vector(c)
                        for m in character_meshes for c in m.bound_box]
    char_lo = min(float(v.z) for v in character_points)
    char_hi = max(float(v.z) for v in character_points)
    # Some FBX rigs are Y-up on import; use the maximum world axis extent.
    char_size_axes = [
        max(float(v[i]) for v in character_points) -
        min(float(v[i]) for v in character_points) for i in range(3)]
    char_height = max(1e-5, max(char_size_axes))

    scene = bpy.context.scene
    socket = bpy.data.objects.new("QA_ONLY_ACT1_RIGHT_HAND_SOCKET", None)
    scene.collection.objects.link(socket)
    socket.parent = target
    socket.parent_type = "BONE"
    socket.parent_bone = right_hand.name
    socket.location = (0, 0, 0)
    socket.rotation_euler = (0, 0, 0)

    weapon = bpy.data.objects.new("QA_ONLY_ACT1_PARASHU_ROOT", None)
    scene.collection.objects.link(weapon)
    for node in imported:
        if node.parent not in imported:
            world_before = node.matrix_world.copy()
            node.parent = weapon
            node.matrix_world = world_before
    for m in meshes:
        m.name = "QA_ONLY_ACT1_WEAPON_" + m.name
        m["act1_qa_weapon"] = True

    weapon.parent = socket
    # Reproduce runtime's weaponGroup.rotation/position/scale. No character
    # bones or input FBX assets are modified.
    hand_world = target.matrix_world @ right_hand.matrix
    hand_scale = max(1e-5, abs(float(hand_world.to_scale().x)))
    scaled_length = char_height * (1.04 / 1.48)
    weapon_scale = scaled_length / (weapon_max_dim * hand_scale)
    weapon.rotation_euler = (-math.pi * 0.5, 0, -math.pi * 0.5)
    weapon.scale = (weapon_scale,) * 3
    weapon.location = (0.26 * weapon_max_dim * weapon_scale, 0, 0)
    bpy.context.view_layer.update()
    return {
        "source_fbx": str(path),
        "mesh_count": len(meshes),
        "right_hand_bone": right_hand.name,
        "weapon_source_longest_dimension": round(weapon_max_dim, 3),
        "character_source_longest_dimension": round(char_height, 3),
        "relative_weapon_size": round(scaled_length / char_height, 4),
        "release_approved": False,
        "caveat": "Candidate QA socket. Runtime FBXLoader axis orientation, grip position, blade projection and swing contact still require real-game comparison."
    }


def render_pose(target, action, out_path: Path, gameplay_progress: float):
    scene = bpy.context.scene
    target.animation_data_create()
    target.animation_data.action = action
    first, last = (float(x) for x in action.frame_range)
    # Match the runtime's trimmed Parashu attack clip, not an arbitrary
    # fraction of the imported FBX. Active contact is at gameplay 0.35.
    clip_progress = 0.14 + gameplay_progress * 0.74
    contact = first + (last - first) * clip_progress
    scene.frame_set(int(contact), subframe=contact % 1)
    bpy.context.view_layer.update()

    meshes = [obj for obj in target.children_recursive if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError("Runtime FBX has no mesh under target armature")
    # Uniform non-emissive clay: texture maps or default imported materials
    # should never make the diagnostic silhouette all white and unreadable.
    clay = bpy.data.materials.get("QA_NONRELEASE_CLAY")
    if clay is None:
        clay = bpy.data.materials.new("QA_NONRELEASE_CLAY")
        clay.use_nodes = True
        shader = clay.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = (.28, .20, .16, 1)
        shader.inputs["Metallic"].default_value = 0.0
        shader.inputs["Roughness"].default_value = .87
    bronze = bpy.data.materials.get("QA_NONRELEASE_WEAPON_BRONZE")
    if bronze is None:
        bronze = bpy.data.materials.new("QA_NONRELEASE_WEAPON_BRONZE")
        bronze.use_nodes = True
        shader = bronze.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = (.53, .25, .08, 1)
        shader.inputs["Metallic"].default_value = .25
        shader.inputs["Roughness"].default_value = .74
    for obj in meshes:
        obj.data.materials.clear()
        obj.data.materials.append(bronze if obj.get("act1_qa_weapon") else clay)
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
    light_data.energy = 430
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
    return {"frame": round(contact, 3), "clip_normalized_progress": round(clip_progress, 4),
            "png": out_path.name}


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
    report["qa_parashu_socket"] = attach_qa_weapon(target, a.weapon)
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
        poses = {}
        for name, progress in (
            ("anticipation", 0.15), ("contact", 0.35), ("recovery", 0.75)
        ):
            poses[name] = render_pose(
                target, action, a.output / (variant + "-" + name + ".png"),
                progress)
        info["pose_frames"] = poses
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
