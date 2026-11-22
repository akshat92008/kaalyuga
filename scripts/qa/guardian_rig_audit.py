"""Blender read-only forensic audit of guardian FBX geometry and animation clips.

Run:
  blender -b --python scripts/qa/guardian_rig_audit.py -- \
    --output artifacts/guardian-rig-report.json "file.fbx" ...
No files are modified. Every import is isolated in a fresh Blender scene.
"""
import bpy
import json
from pathlib import Path
import sys
import argparse


def audit(path):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        if action.users == 0:
            bpy.data.actions.remove(action)
    entry = {
        "path": str(path),
        "exists": path.is_file(),
        "bytes": path.stat().st_size if path.is_file() else 0,
        "errors": [],
        "objects": {},
        "armatures": [],
        "mesh_vertex_count": 0,
        "skinned_mesh_names": [],
        "animation_clips": [],
    }
    if not path.is_file():
        entry["errors"].append("asset missing")
        return entry
    try:
        bpy.ops.import_scene.fbx(filepath=str(path.resolve()), use_anim=True)
    except Exception as exc:
        entry["errors"].append("import failed: " + str(exc)[:350])
        return entry
    for ob in bpy.context.scene.objects:
        entry["objects"][ob.type] = entry["objects"].get(ob.type, 0) + 1
        if ob.type == "MESH":
            entry["mesh_vertex_count"] += len(ob.data.vertices)
            if ob.find_armature() or any(m.type=="ARMATURE" for m in ob.modifiers):
                entry["skinned_mesh_names"].append(ob.name)
        if ob.type == "ARMATURE":
            entry["armatures"].append({
                "name": ob.name,
                "bone_count": len(ob.data.bones),
                "sample_bones": [b.name for b in list(ob.data.bones)[:18]],
            })
    for action in bpy.data.actions:
        entry["animation_clips"].append({
            "name": action.name,
            "fcurves": len(action.fcurves) if hasattr(action, "fcurves") else None,
            "frame_range": [float(v) for v in action.frame_range],
        })
    return entry


def main():
    argv = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--output", required=True)
    p.add_argument("fbx", nargs="+")
    args = p.parse_args(argv)
    reports = [audit(Path(p)) for p in args.fbx]
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(reports, indent=2), encoding="utf-8")
    for r in reports:
        print("GUARDIAN_FBX_AUDIT " + json.dumps({
            "path":r["path"],"armatures":r["armatures"],
            "skinned_mesh_names":r["skinned_mesh_names"],
            "mesh_vertex_count":r["mesh_vertex_count"],
            "animation_clips":r["animation_clips"],
            "errors":r["errors"],
        }, ensure_ascii=False))
    return 0


if __name__=="__main__":
    raise SystemExit(main())
