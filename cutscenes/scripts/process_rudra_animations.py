#!/usr/bin/env python3
"""Kaliyuga Phase 3 — repeatable Blender FBX animation audit and GLB build.

Run with Blender (not ordinary Python):
 blender -b --python cutscenes/scripts/process_rudra_animations.py -- \
   --model "public/kaalyuga/rudra/rigged.fbx" \
   --clips public/kaalyuga/anims/rudra --output build/rudra_processed

This script never edits the source FBXs. It rejects clips with missing bone names
rather than silently producing broken retargeted animations. Visual foot locking,
hand/socket contact, and actual blend quality still require playback review.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
import traceback
from pathlib import Path
from typing import Any


def blender_argv() -> list[str]:
    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def get_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--clips", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--no-preview", action="store_true")
    return parser.parse_args(blender_argv())


def iter_action_curves(action: Any) -> list[Any]:
    """Handle legacy fcurves and Blender 4.4+/5 slotted Action channelbags."""
    curves = []
    legacy = getattr(action, 'fcurves', None)
    if legacy is not None:
        curves.extend(legacy)
    for layer in getattr(action, 'layers', []):
        for strip in getattr(layer, 'strips', []):
            for bag in getattr(strip, 'channelbags', []):
                curves.extend(getattr(bag, 'fcurves', []))
    return curves


def action_bones(action: Any) -> set[str]:
    used = set()
    for curve in iter_action_curves(action):
        match = re.search(r'pose\.bones\["([^"]+)"\]', curve.data_path)
        if match:
            used.add(match.group(1))
    return used


def validate_action(action: Any, target_bones: set[str]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    notes: list[str] = []
    used = action_bones(action)
    if not used:
        errors.append("No readable pose-bone fcurves (FBX may contain no supported bone animation)")
    missing = sorted(used - target_bones)
    if missing:
        errors.append("Bone paths absent from canonical rig: " + ", ".join(missing[:24]))
    for curve in iter_action_curves(action):
        for key in curve.keyframe_points:
            if any(not math.isfinite(float(v)) for v in (*key.co, *key.handle_left, *key.handle_right)):
                errors.append("Non-finite keyframe values")
                break
    if action.frame_range[1] <= action.frame_range[0]:
        errors.append("Empty or invalid action time range")
    if not any("hand" in name.lower() for name in target_bones):
        notes.append("Hand bone socket not found by name; weapon alignment needs manual review")
    notes.append("Foot contact, root motion, and weapon grip are NOT proven by bone-name validation")
    return errors, notes


def import_fbx(bpy: Any, filename: Path) -> list[Any]:
    before = set(bpy.data.objects)
    # Blender 5 native importer works on GitHub's Ubuntu runner; legacy addon can fail.
    if hasattr(bpy.ops.wm, 'fbx_import'):
        bpy.ops.wm.fbx_import(filepath=str(filename))
    else:
        bpy.ops.import_scene.fbx(filepath=str(filename))
    return [obj for obj in bpy.data.objects if obj not in before]


def find_armature(imported: list[Any]) -> Any:
    arms = [obj for obj in imported if obj.type == "ARMATURE"]
    if not arms:
        raise RuntimeError("FBX did not contain an armature")
    return max(arms, key=lambda obj: len(obj.data.bones))


def remove_objects(bpy: Any, objects: list[Any]) -> None:
    for obj in objects:
        if obj.name in bpy.data.objects:
            bpy.data.objects.remove(obj, do_unlink=True)


def select_for_export(bpy: Any, imported_model: list[Any]) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in imported_model:
        if obj.name in bpy.data.objects:
            obj.select_set(True)
    bpy.context.view_layer.objects.active = find_armature(imported_model)


def attach_clip_to_nla(armature: Any, action: Any, name: str) -> None:
    armature.animation_data_create()
    nla = armature.animation_data.nla_tracks.new()
    nla.name = name
    start = max(1, int(math.floor(action.frame_range[0])))
    strip = nla.strips.new(name, start, action)
    strip.blend_type = "REPLACE"
    strip.extrapolation = "NOTHING"
    armature.animation_data.action = None


def export_glb(bpy: Any, dest: Path) -> None:
    opts: dict[str, Any] = {
        "filepath": str(dest),
        "export_format": "GLB",
        "use_selection": True,
        "export_skins": True,
        "export_animations": True,
    }
    # Blender 3.x uses export_nla_strips; Blender 4.x+ exposes NLA_TRACKS.
    properties = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    if "export_animation_mode" in properties:
        opts["export_animation_mode"] = "NLA_TRACKS"
    elif "export_nla_strips" in properties:
        opts["export_nla_strips"] = True
    bpy.ops.export_scene.gltf(**opts)
    if not dest.exists() or dest.stat().st_size < 1024:
        raise RuntimeError("GLB output missing or suspiciously small")


def preview_model(bpy: Any, imported_model: list[Any], out: Path) -> None:
    from mathutils import Vector

    points = [
        obj.matrix_world @ Vector(corner)
        for obj in imported_model
        if obj.type == "MESH"
        for corner in obj.bound_box
    ]
    if not points:
        raise RuntimeError("No meshes available for a preview image")
    minimum = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    maximum = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    center = (minimum + maximum) / 2
    distance = max(2, (maximum - minimum).length * 1.8)
    cam_data = bpy.data.cameras.new("KaliyugaValidationCamera")
    cam = bpy.data.objects.new("KaliyugaValidationCamera", cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = center + Vector((0, -distance, distance * 0.22))
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam

    light_data = bpy.data.lights.new("ValidationKey", "AREA")
    light = bpy.data.objects.new("ValidationKey", light_data)
    bpy.context.scene.collection.objects.link(light)
    light.location = center + Vector((distance * 0.3, -distance * 0.5, distance * 0.65))
    light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()
    light_data.energy = 1100
    light_data.shape = "DISK"
    light_data.size = max(2, distance * 0.4)

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 8
    scene.render.resolution_x = 960
    scene.render.resolution_y = 540
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(out)
    scene.frame_set(1)
    bpy.ops.render.render(write_still=True)
    if not out.exists():
        raise RuntimeError("Blender preview render did not write output")


def main() -> int:
    args = get_args()
    report: dict[str, Any] = {
        "source_model": str(args.model),
        "source_clips": str(args.clips),
        "accepted": [],
        "rejected": [],
        "warnings": [],
        "visual_review_required": True,
        "blender_execution": False,
    }
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    try:
        import bpy
    except ImportError:
        print("Requires Blender's bundled bpy. Invoke: blender -b --python ... -- <args>", file=sys.stderr)
        return 2
    try:
        if not args.model.is_file() or not args.clips.is_dir():
            raise FileNotFoundError("Canonical model FBX or clip directory not found")
        bpy.ops.wm.read_factory_settings(use_empty=True)
        base = import_fbx(bpy, args.model.resolve())
        armature = find_armature(base)
        bone_names = set(b.name for b in armature.data.bones)
        report["canonical_bone_count"] = len(bone_names)
        report["mesh_count"] = sum(obj.type == "MESH" for obj in base)
        if not bone_names or not report["mesh_count"]:
            raise RuntimeError("Canonical FBX missing armature bones or skinned geometry")

        clip_paths = sorted(args.clips.resolve().glob("*.fbx"))
        if not clip_paths:
            raise RuntimeError("No animation FBX files found in --clips directory")
        for path in clip_paths:
            imported: list[Any] = []
            try:
                imported = import_fbx(bpy, path)
                clip_arm = find_armature(imported)
                animation_data = clip_arm.animation_data
                action = animation_data.action if animation_data else None
                if action is None:
                    raise RuntimeError("No active animation action on imported armature")
                errors, notes = validate_action(action, bone_names)
                if errors:
                    report["rejected"].append({"clip": path.name, "errors": errors})
                else:
                    action.name = "Rudra_" + path.stem.replace(" ", "_")
                    if animation_data:
                        animation_data.action = None
                    attach_clip_to_nla(armature, action, action.name)
                    report["accepted"].append({
                        "clip": path.name,
                        "action": action.name,
                        "frames": [float(v) for v in action.frame_range],
                        "animated_bones": len(action_bones(action)),
                    })
                    report["warnings"].extend(f"{path.name}: {note}" for note in notes)
            except Exception as err:
                report["rejected"].append({"clip": path.name, "errors": [str(err)]})
            finally:
                remove_objects(bpy, imported)

        if not report["accepted"]:
            raise RuntimeError("All animation clips were rejected; GLB export withheld")
        select_for_export(bpy, base)
        exported = out / "rudra_animated.glb"
        export_glb(bpy, exported)
        report["glb"] = str(exported)
        report["glb_bytes"] = exported.stat().st_size
        if not args.no_preview:
            try:
                preview_file = out / "rudra_preview.png"
                preview_model(bpy, base, preview_file)
                report["preview"] = str(preview_file)
            except Exception as err:
                report["warnings"].append("Preview render failed: " + str(err))
        report["blender_execution"] = True
        return 0
    except Exception as err:
        report["fatal_error"] = str(err)
        report["traceback"] = traceback.format_exc(limit=4)
        return 1
    finally:
        (out / "validation_report.json").write_text(
            json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
        )


if __name__ == "__main__":
    raise SystemExit(main())
