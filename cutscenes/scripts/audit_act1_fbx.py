"""Run with blender -b -P cutscenes/scripts/audit_act1_fbx.py -- path.fbx ..."""
import json
from pathlib import Path
import sys

import bpy

for filename in sys.argv[sys.argv.index("--") + 1:]:
    path = Path(filename).resolve(strict=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(path))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    rigs = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    print("ACT1_FBX", json.dumps({
        "file": path.name,
        "bytes": path.stat().st_size,
        "meshes": len(meshes),
        "vertices": sum(len(obj.data.vertices) for obj in meshes),
        "triangles": sum(len(face.vertices) - 2 for obj in meshes for face in obj.data.polygons),
        "weighted_meshes": sum(obj.find_armature() is not None and bool(obj.vertex_groups) for obj in meshes),
        "rigs": {obj.name: len(obj.data.bones) for obj in rigs},
        "actions": [action.name for action in bpy.data.actions],
    }))
