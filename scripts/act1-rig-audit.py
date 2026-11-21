"""Act I non-destructive canonical rig + clip compatibility audit.

Runs in Blender 4/5; NEVER writes to input FBX files. By default writes only
JSON metadata. A clip is 'compatible' only if all animated pose bones exist
under the same names in the canonical armature; this deliberately does NOT
pretend to retarget different skeletons.

Usage:
  blender -b --python scripts/act1-rig-audit.py -- \
    --rig "public/models/.../character.fbx" \
    --clip "public/animations/.../attack.fbx" \
    --output "artifacts/act1_rig_audit.json"

This diagnostic is the prerequisite for any Blender-created finisher.
"""
import argparse
import json
import math
import re
import sys
from pathlib import Path
import bpy
from mathutils import Vector

def cli():
    raw = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--rig", required=True, type=Path)
    p.add_argument("--clip", action="append", default=[], type=Path)
    p.add_argument("--output", type=Path, default=Path("artifacts/act1_rig_audit.json"))
    p.add_argument("--strict", action="store_true", help="Fail when clips are mismatched")
    return p.parse_args(raw)

def import_fbx(path):
    if not path.is_file():
        raise FileNotFoundError(path)
    before = set(bpy.data.objects)
    kwargs = {"filepath": str(path.resolve()), "use_anim": True,
              "ignore_leaf_bones": False}
    opts = {x.identifier for x in bpy.ops.import_scene.fbx.get_rna_type().properties}
    bpy.ops.import_scene.fbx(**{k:v for k,v in kwargs.items() if k in opts})
    return [obj for obj in bpy.data.objects if obj not in before]

def primary_armature(objects):
    arms=[o for o in objects if o.type=="ARMATURE"]
    return max(arms, key=lambda a:len(a.data.bones)) if arms else None

def normalize(s):
    return re.sub(r"[^a-z0-9]", "", re.sub(r"^(mixamorig[:|]?|armature[|:])", "", s, flags=re.I).lower())

def action_bones(action):
    # Blender 4: legacy FCurves; Blender 5: layered channel bags. No destructive conversion.
    names=set()
    curves=list(getattr(action, "fcurves", ()) or ())
    for layer in getattr(action, "layers", ()) or ():
        for strip in getattr(layer, "strips", ()) or ():
            for bag in getattr(strip, "channelbags", ()) or ():
                curves.extend(getattr(bag, "fcurves", ()) or ())
    for curve in curves:
        match=re.search(r'pose\.bones\["([^"]+)"\]', curve.data_path)
        if match:
            names.add(match.group(1))
    return sorted(names)

def rig_metadata(armature, objects):
    meshes=[o for o in objects if o.type=="MESH"]
    vertices=sum(len(o.data.vertices) for o in meshes)
    triangles=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
    skin_meshes=sum(bool(any(m.type=="ARMATURE" for m in o.modifiers) or o.find_armature()) for o in meshes)
    uv_meshes=sum(bool(o.data.uv_layers) for o in meshes)
    missing_weights=[o.name for o in meshes if bool(o.find_armature()) and not o.vertex_groups]
    bounds=[]
    for o in meshes:
        for corner in o.bound_box:
            v=o.matrix_world @ Vector(corner)
            bounds.append(tuple(round(x,4) for x in v))
    bones=[]
    if armature:
        bones=[{"name":b.name,"parent":b.parent.name if b.parent else None} for b in armature.data.bones]
    return {
        "armature":armature.name if armature else None,
        "bone_count":len(bones),"bones":bones,
        "mesh_count":len(meshes),"vertices":vertices,"approx_triangles":triangles,
        "skinned_meshes":skin_meshes,"meshes_with_uv":uv_meshes,
        "meshes_missing_vertex_groups":missing_weights,
        "bbox_min":[min((p[i] for p in bounds),default=0) for i in range(3)],
        "bbox_max":[max((p[i] for p in bounds),default=0) for i in range(3)],
    }

def main():
    a=cli()
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    source=import_fbx(a.rig)
    target=primary_armature(source)
    canon=rig_metadata(target,source)
    errors=[]
    if not target:
        errors.append("canonical_rig_missing_armature")
    if canon["skinned_meshes"]==0:
        errors.append("canonical_rig_missing_skin")
    canonical_names={b["name"] for b in canon["bones"]}
    canonical_normalized={normalize(n) for n in canonical_names}
    clip_results=[]
    for path in a.clip:
        before_actions=set(bpy.data.actions)
        objs=import_fbx(path)
        arm=primary_armature(objs)
        new_actions=[ac for ac in bpy.data.actions if ac not in before_actions]
        for obj in objs:
            if obj.animation_data and obj.animation_data.action and obj.animation_data.action not in new_actions:
                new_actions.append(obj.animation_data.action)
        source_names={b.name for b in arm.data.bones} if arm else set()
        animation_skeleton_match=bool(source_names and source_names==canonical_names)
        missing=[name for name in source_names if normalize(name) not in canonical_normalized]
        actions=[]
        for action in new_actions:
            animated=action_bones(action)
            not_on_target=sorted(set(animated)-canonical_names)
            start,end=action.frame_range
            actions.append({
              "name":action.name, "start_frame":round(float(start),2),
              "end_frame":round(float(end),2),
              "duration_sec":round(float(end-start)/max(1,bpy.context.scene.render.fps),3),
              "animated_bones":animated,
              "missing_exact_bone_bindings":not_on_target,
            })
        compatible=bool(target and arm and animation_skeleton_match and actions and
                        all(not c["missing_exact_bone_bindings"] for c in actions))
        clip_results.append({
            "file":str(path),"clip_armature":arm.name if arm else None,
            "clip_bone_count":len(source_names),"exact_skeleton_match":animation_skeleton_match,
            "unmatched_normalized_bones":sorted(missing),
            "actions":actions,"compatible_for_direct_binding":compatible,
            "exported":False,
            "note":"No blind retarget or generic execution exported; inspect rigs/actions first.",
        })
        for obj in objs:
            bpy.data.objects.remove(obj,do_unlink=True)
        if not compatible and a.strict:
            errors.append("incompatible_clip:"+str(path))
    a.output.parent.mkdir(parents=True, exist_ok=True)
    report={"schema_version":1,"blender_version":bpy.app.version_string,
        "canonical_file":str(a.rig),"canonical":canon,
        "clips":clip_results,"errors":errors,
        "limits":["No visual foot-contact test","No hand/axe socket test",
                  "No imported clip was automatically retargeted",
                  "Actions/skin must be visually verified before release"]}
    a.output.write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({"report":str(a.output),"canonical_bones":canon["bone_count"],
                      "clips":len(clip_results),"errors":errors}))
    if errors and a.strict:
        sys.exit(1)
if __name__=="__main__":
    main()
