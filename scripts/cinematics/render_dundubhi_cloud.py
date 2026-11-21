#!/usr/bin/env python3
"""
Kaliyuga / Act I / Dundubhi — cloud-rendered cinematic proof of concept.

Run with Blender (headless):
    blender -b -t 2 --python scripts/cinematics/render_dundubhi_cloud.py -- --out artifacts/dundubhi

Uses REAL Kaliyuga FBX model, diffuse texture, and supplied idle/roar clips.
Renders transparent RGBA frames for composition with the original arena MP4.
This is a directed previz, NOT a final studio-grade animation or in-game integration.
"""
import argparse
import json
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path.cwd()
MODEL = ROOT / "public/kaalyuga/dundubhi/model.fbx"
DIFFUSE = ROOT / "public/kaalyuga/dundubhi/diffuse.png"
IDLE = ROOT / "public/kaalyuga/anims/dundubhi/idle.fbx"
ROAR = ROOT / "public/kaalyuga/anims/dundubhi/roar.fbx"

FPS = 24
FRAMES = 144
WIDTH = 960
HEIGHT = 540


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for material in list(bpy.data.materials):
        if material.users == 0:
            bpy.data.materials.remove(material)


def import_fbx(file):
    if not file.exists():
        raise FileNotFoundError(str(file))
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(file), use_image_search=False)
    return [o for o in bpy.data.objects if o not in before]


def actions_from_fbx(file):
    before_actions = set(bpy.data.actions)
    objects = import_fbx(file)
    armatures = [o for o in objects if o.type == "ARMATURE"]
    action = None
    for obj in armatures:
        if obj.animation_data and obj.animation_data.action:
            action = obj.animation_data.action
            break
    if action is None:
        new_actions = [a for a in bpy.data.actions if a not in before_actions]
        if new_actions:
            action = max(new_actions, key=lambda a: len(a.fcurves))
    if action:
        action.use_fake_user = True
    for obj in list(objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    return action, armatures


def world_bounds(meshes):
    corners = [o.matrix_world @ Vector(corner) for o in meshes for corner in o.bound_box]
    return (
        Vector([min(v[j] for v in corners) for j in range(3)]),
        Vector([max(v[j] for v in corners) for j in range(3)]),
    )


def material_for_model(imagepath):
    material = bpy.data.materials.new("Dundubhi - bronze cel-painterly")
    material.use_nodes = True
    tree = material.node_tree
    bsdf = next(n for n in tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Metallic"].default_value = 0.28
    bsdf.inputs["Roughness"].default_value = 0.67
    bsdf.inputs["Specular"].default_value = 0.28
    bsdf.inputs["Base Color"].default_value = (0.48, 0.27, 0.16, 1)
    if imagepath.exists():
        tex = tree.nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(str(imagepath), check_existing=True)
        tex.interpolation = "Linear"
        tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return material


def make_emission(name, color, strength=1.0, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, alpha)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        mat.node_tree.nodes.remove(bsdf)
    n = mat.node_tree.nodes.new("ShaderNodeEmission")
    n.inputs["Color"].default_value = (*color, 1)
    n.inputs["Strength"].default_value = strength
    out = next(node for node in mat.node_tree.nodes if node.type == "OUTPUT_MATERIAL")
    mat.node_tree.links.new(n.outputs[0], out.inputs["Surface"])
    return mat


def point_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def attach_idle_and_roar(armature, idle, roar, report):
    targets = set(armature.data.bones.keys())
    report["rig_bones"] = len(targets)
    compatible = []
    for name, action in [("idle", idle), ("roar", roar)]:
        if not action:
            report[name + "_matched_bones"] = 0
            continue
        import re
        referenced = set()
        for fc in action.fcurves:
            m = re.search(r'pose.bones\["([^"]+)"\]', fc.data_path)
            if m:
                referenced.add(m.group(1))
        matches = len(referenced.intersection(targets))
        report[name + "_matched_bones"] = matches
        report[name + "_action"] = action.name
        if matches >= 5:
            compatible.append(name)
    if armature.animation_data is None:
        armature.animation_data_create()
    if "idle" in compatible:
        armature.animation_data.action = idle
        # Idle is retained while a separate roar NLA track blends over it.
        track = armature.animation_data.nla_tracks.new()
        track.name = "Base breathing"
        start, end = idle.frame_range
        strip = track.strips.new("idle breathing", 1, idle)
        strip.action_frame_start = start
        strip.action_frame_end = end
        strip.repeat = FRAMES / max(1.0, end - start)
        armature.animation_data.action = None
    if "roar" in compatible:
        track = armature.animation_data.nla_tracks.new()
        track.name = "Cinematic roar"
        start, end = roar.frame_range
        strip = track.strips.new("Dundubhi roars", 62, roar)
        strip.action_frame_start = start
        strip.action_frame_end = end
        strip.scale = 63 / max(1.0, end - start)
        strip.blend_type = "REPLACE"
        strip.blend_in = 14
        strip.blend_out = 16
        report["roar_action_assigned"] = True
    else:
        report["roar_action_assigned"] = False
        # No false claims: the action is incompatible, so keep safe pose only.
        report["warning"] = "Roar FBX animation could not map to the rig; visual shot is a static/pose-only fallback."


def build(out_dir):
    random.seed(48)
    clear_scene()
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = 16
    scene.render.resolution_x = WIDTH
    scene.render.resolution_y = HEIGHT
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    scene.render.fps = FPS
    scene.frame_start = 1
    scene.frame_end = FRAMES
    scene.render.filepath = str(out_dir / "frames" / "")
    scene.render.filepath = str(out_dir / "frames" / "frame_")
    scene.render.use_file_extension = True
    scene.camera = None
    scene.world.color = (0.01, 0.01, 0.015)

    actors = import_fbx(MODEL)
    meshes = [o for o in actors if o.type == "MESH"]
    rigs = [o for o in actors if o.type == "ARMATURE"]
    if not meshes or not rigs:
        raise RuntimeError("The original Dundubhi FBX did not import a skinned mesh and armature.")
    lower, upper = world_bounds(meshes)
    height = float(upper.z - lower.z)
    if height < 0.0001:
        raise RuntimeError("Dundubhi FBX mesh height invalid.")
    scale = 3.55 / height
    center_x = float((lower.x + upper.x) / 2)
    center_y = float((lower.y + upper.y) / 2)

    pivot = bpy.data.objects.new("Dundubhi cinematic root", None)
    scene.collection.objects.link(pivot)
    # Keep imported scene graph intact and parent only top-level objects.
    imported_set = set(actors)
    for obj in actors:
        if obj.parent not in imported_set:
            world = obj.matrix_world.copy()
            obj.parent = pivot
            obj.matrix_world = world
    pivot.scale = (scale,) * 3
    pivot.location = (-center_x * scale, -center_y * scale, -float(lower.z) * scale)

    paint = material_for_model(DIFFUSE)
    for mesh in meshes:
        if mesh.data.materials:
            for i in range(len(mesh.data.materials)):
                mesh.data.materials[i] = paint
        else:
            mesh.data.materials.append(paint)

    report = {
        "character_model": str(MODEL.relative_to(ROOT)),
        "diffuse": str(DIFFUSE.relative_to(ROOT)),
        "mesh_count": len(meshes),
        "triangle_estimate": int(sum(len(o.data.polygons) for o in meshes)),
        "rig_count": len(rigs),
        "original_height": height,
        "normalized_height": 3.55,
        "output_frames": FRAMES,
        "fps": FPS,
        "resolution": [WIDTH, HEIGHT],
        "compositing_method": "RGBA foreground plus actual MP4 arena via FFmpeg",
    }

    idle, _ = actions_from_fbx(IDLE)
    roar, _ = actions_from_fbx(ROAR)
    attach_idle_and_roar(rigs[0], idle, roar, report)

    # Natural, subtle physical push-forward. Keep feet near grounded arena plane.
    for frame, delta_y, delta_z in [(1, 0.0, 0.0), (30, 0.0, 0.0), (60, -0.18, 0.0), (92, -0.37, -0.06), (123, -0.38, 0.0), (144, -0.38, 0.0)]:
        scene.frame_set(frame)
        pivot.location.y = -center_y * scale + delta_y
        pivot.location.z = -float(lower.z) * scale + delta_z
        pivot.keyframe_insert(data_path="location", frame=frame)
    for f in [1, 144]:
        scene.frame_set(f)
        pivot.rotation_euler.z = math.radians(3)
        pivot.keyframe_insert(data_path="rotation_euler", frame=f)

    cam_data = bpy.data.cameras.new("Directed cinematic lens")
    cam = bpy.data.objects.new("Directed camera", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 6.6
    cam_data.lens = 45

    shots = [
        (1, (0.0, -11.3, 3.7), 7.6),
        (38, (0.0, -10.8, 3.65), 6.7),
        (83, (0.0, -9.8, 3.4), 5.55),
        (116, (0.0, -10.3, 3.55), 6.15),
        (144, (0.0, -10.9, 3.7), 6.7),
    ]
    for frame, xyz, ortho in shots:
        scene.frame_set(frame)
        cam.location = xyz
        point_at(cam, (0, 0, 1.85))
        cam_data.ortho_scale = ortho
        cam.keyframe_insert(data_path="location", frame=frame)
        cam.keyframe_insert(data_path="rotation_euler", frame=frame)
        cam_data.keyframe_insert(data_path="ortho_scale", frame=frame)

    def area_light(name, at, color, power, size):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = power
        data.color = color
        data.shape = "DISK"
        data.size = size
        ob = bpy.data.objects.new(name, data)
        scene.collection.objects.link(ob)
        ob.location = at
        point_at(ob, (0, 0, 1.85))
        return ob

    area_light("Warm furnace key", (-4, -3, 7.5), (1.0, 0.48, 0.19), 1200, 6.0)
    area_light("Burning temple rim", (2.8, 2.8, 6.2), (1.0, 0.15, 0.08), 1650, 4.0)
    area_light("Cool shadow fill", (3.0, -5, 5), (0.24, 0.4, 0.65), 650, 6.0)
    area_light("Eye-level amber bounce", (-2.0, -7, 2.2), (1.0, 0.51, 0.25), 500, 4.0)

    # Ground contact shadow: semi-transparent flattened disk, no procedural flash wall.
    bpy.ops.mesh.primitive_circle_add(vertices=48, radius=1, location=(0, 0.1, 0.03))
    circle = bpy.context.object
    circle.name = "soft ground silhouette"
    circle.scale = (1.2, 0.45, 1)
    # A real arena has an existing floor; we do not draw a fake floor over its video.
    bpy.data.objects.remove(circle, do_unlink=True)

    # Tiny flame cinders; intentionally restrained and easy to see through.
    ember_mat = make_emission("Cinders - molten copper", (1.0, 0.27, 0.035), 3.0)
    for i in range(50):
        x = random.uniform(-4.1, 4.1)
        y = random.uniform(-2.4, 2.1)
        z = random.uniform(0.05, 3.6)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=random.uniform(0.009, 0.023), location=(x, y, z))
        ember = bpy.context.object
        ember.name = "Cinder_%03d" % i
        ember.data.materials.append(ember_mat)
        for frame in (1, 144):
            scene.frame_set(frame)
            ember.location = (x + (frame - 1) / 143 * random.uniform(-0.3, 0.3),
                              y + (frame - 1) / 143 * random.uniform(-0.1, 0.1),
                              z + (frame - 1) / 143 * random.uniform(0.3, 1.3))
            ember.keyframe_insert(data_path="location", frame=frame)

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "frames").mkdir(exist_ok=True)
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(out_dir / "Dundubhi_Entrance.blend"))
    with (out_dir / "render_report.json").open("w") as fp:
        json.dump(report, fp, indent=2)
    print("CINEMATIC_REPORT", json.dumps(report), flush=True)
    bpy.ops.render.render(animation=True)


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="artifacts/dundubhi_cloud")
    opts = parser.parse_args(args)
    build((ROOT / opts.out).resolve())
