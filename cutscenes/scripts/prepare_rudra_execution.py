"""Blender 5.3: derive an in-place animation and measure the right-hand swing."""
import argparse
import json
import math
from pathlib import Path
import sys

import bpy

parser = argparse.ArgumentParser()
parser.add_argument("--model", type=Path, required=True)
parser.add_argument("--clip", type=Path, required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
if args.output.suffix.lower() != ".glb":
    parser.error("--output must be a new .glb file")
report = args.output.with_suffix(".json")
if args.output.exists() or report.exists():
    parser.error("Output already exists. Use a fresh output path.")
args.output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

def import_rig(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(path.resolve(strict=True)))
    imported = set(bpy.data.objects) - before
    rigs = [obj for obj in imported if obj.type == "ARMATURE"]
    if len(rigs) != 1:
        raise ValueError(f"Expected one armature in {path}")
    return rigs[0], imported

target, objects = import_rig(args.model)
source, _ = import_rig(args.clip)
if set(target.data.bones.keys()) != set(source.data.bones.keys()):
    raise ValueError("Bone names differ. This workflow requires a compatible rig.")
for bone in target.data.bones:
    other = source.data.bones[bone.name]
    if (bone.parent and bone.parent.name) != (other.parent and other.parent.name):
        raise ValueError(f"Parent differs for {bone.name}")
anim = source.animation_data
action = anim.action.copy()
action.name = args.output.stem
target.animation_data_create()
target.animation_data.action = action
target.animation_data.action_slot = action.slots[0]
hips = target.pose.bones["mixamorig:Hips"]
bag = action.layers[0].strips[0].channelbag(action.slots[0])
# The source FBX is Y-up. Keep hip height, anchor lateral and forward travel.
for curve in bag.fcurves:
    if curve.data_path == hips.path_from_id("location") and curve.array_index in (0, 2):
        for key in curve.keyframe_points:
            key.co.y = key.handle_left.y = key.handle_right.y = 0
        curve.update()
scene = bpy.context.scene
first, last = (round(value) for value in action.frame_range)
scene.frame_start, scene.frame_end = first, last
hand = target.pose.bones["mixamorig:RightHand"]
samples = []
previous = None
for frame in range(first, last + 1):
    scene.frame_set(frame)
    point = target.matrix_world @ hand.tail
    if not all(math.isfinite(value) for value in point):
        raise ValueError(f"Non-finite hand position at {frame}")
    samples.append({"frame": frame, "hand_m": [round(v, 4) for v in point],
                    "step_m": round((point - previous).length, 5) if previous else 0})
    previous = point.copy()
scene.frame_set(first)
bpy.ops.object.select_all(action="DESELECT")
for obj in objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = target
bpy.ops.export_scene.gltf(filepath=str(args.output.resolve()), use_selection=True,
                          export_format="GLB", export_animation_mode="ACTIVE_ACTIONS",
                          export_frame_range=True, export_force_sampling=True)
report.write_text(json.dumps({"model": args.model.name, "clip": args.clip.name,
    "frames": [first, last], "fps": scene.render.fps / scene.render.fps_base,
    "bone_count": len(target.data.bones), "right_hand": samples}, indent=2))
