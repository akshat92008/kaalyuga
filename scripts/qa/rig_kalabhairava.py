"""Rig the existing Kala-Bhairava Abyss FBX to its compatible Mixamo bone rig.

Purpose: replace an unskinned static guardian with a deforming/skinned FBX.
Never edits source FBX; exports a NEW candidate under build/guardian.
This is a technical candidate requiring real visual approval, not automatic
artistic acceptance or a replacement of the original Blender assets.

blender -b -t 2 --python scripts/qa/rig_kalabhairava.py -- \
    --mesh "path to abyss static.fbx" --idle "path to idle.fbx" \
    --heavy "path to attack.fbx" --output "build/guardian"
"""
import argparse
import bpy
import json
from mathutils import Vector
from pathlib import Path
import math
import sys


def world_bounds(obj):
    pts = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    mn = Vector((min(v.x for v in pts), min(v.y for v in pts), min(v.z for v in pts)))
    mx = Vector((max(v.x for v in pts), max(v.y for v in pts), max(v.z for v in pts)))
    return mn, mx


def import_fbx(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(Path(path).resolve()), use_anim=True)
    return [o for o in bpy.data.objects if o not in before]


def choose_action(rig, previous):
    anim = getattr(rig, 'animation_data', None)
    action = getattr(anim, 'action', None)
    if action is not None:
        action.use_fake_user = True
        return action
    actions = [a for a in bpy.data.actions if a not in previous]
    if not actions:
        return None
    action = max(actions, key=lambda a: (float(a.frame_range[1]) - float(a.frame_range[0])))
    action.use_fake_user = True
    return action


def rig_to_mesh(armature, mesh):
    bpy.context.view_layer.update()
    mn, mx = world_bounds(mesh)
    center = (mn + mx) * 0.5
    verts = [armature.matrix_world @ b.head_local for b in armature.data.bones if b.use_deform]
    verts += [armature.matrix_world @ b.tail_local for b in armature.data.bones if b.use_deform]
    rminz = min(v.z for v in verts)
    rmaxz = max(v.z for v in verts)
    rcenterx = sum(v.x for v in verts) / len(verts)
    rcentery = sum(v.y for v in verts) / len(verts)
    rawheight = max(0.0001, rmaxz - rminz)
    meshheight = max(0.0001, mx.z - mn.z)
    # The model's horn crown and shoulder spikes extend well beyond anatomy.
    target_height = meshheight * 0.76
    factor = target_height / rawheight
    armature.scale *= factor
    bpy.context.view_layer.update()
    verts2 = [armature.matrix_world @ b.head_local for b in armature.data.bones if b.use_deform]
    verts2 += [armature.matrix_world @ b.tail_local for b in armature.data.bones if b.use_deform]
    zmin2 = min(v.z for v in verts2)
    cx2 = sum(v.x for v in verts2)/len(verts2)
    cy2 = sum(v.y for v in verts2)/len(verts2)
    armature.location += Vector((center.x-cx2, center.y-cy2, mn.z + 0.055*meshheight-zmin2))
    bpy.context.view_layer.update()
    return {"mesh_height":meshheight, "rig_fit_factor":factor, "mesh_bounds":[list(mn),list(mx)]}


def add_manual_nearest_bone_skin(mesh, rig):
    """Fallback if Blender's heat weights cannot solve an elaborate mesh."""
    mesh.vertex_groups.clear()
    if mesh.parent:
        mesh.parent = None
    mesh.parent = rig
    mesh.matrix_parent_inverse = rig.matrix_world.inverted()
    mod = mesh.modifiers.new("KalaBhairavaSkin", type="ARMATURE")
    mod.object = rig
    rig.update_tag()
    bpy.context.view_layer.update()
    bones = [b for b in rig.data.bones if b.use_deform and
             "End" not in b.name and "Index" not in b.name and
             "Middle" not in b.name and "Ring" not in b.name and
             "Pinky" not in b.name and "Thumb" not in b.name]
    groups = {b.name:mesh.vertex_groups.new(name=b.name) for b in bones}
    segments = []
    for b in bones:
        head = rig.matrix_world @ b.head_local
        tail = rig.matrix_world @ b.tail_local
        d = tail-head
        segments.append((b.name,head,d,max(0.000001,d.length_squared)))
    for v in mesh.data.vertices:
        wp = mesh.matrix_world @ v.co
        score = []
        for name,head,d,l2 in segments:
            t = max(0,min(1,(wp-head).dot(d)/l2))
            nearest = head+d*t
            dist2 = (wp-nearest).length_squared
            score.append((dist2,name))
        score.sort(key=lambda row:row[0])
        top = score[:3]
        weights = [1/max(0.00001, math.sqrt(d2))**1.7 for d2,_ in top]
        total = sum(weights)
        for w,(_,name) in zip(weights,top):
            groups[name].add([v.index], w/total, 'REPLACE')
    return "manual_nearest_segment"


def bind_mesh(mesh, rig):
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    try:
        bpy.ops.object.parent_set(type='ARMATURE_AUTO', keep_transform=True)
        bpy.context.view_layer.update()
        deform_groups = [g for g in mesh.vertex_groups if g.name in rig.data.bones]
        if not mesh.find_armature() or not deform_groups:
            raise RuntimeError("Automatic weights did not produce a skinned mesh")
        return "blender_bone_heat"
    except Exception as exc:
        print("GUARDIAN_RIG_AUTO_WEIGHT_WARNING",str(exc)[:300])
        return add_manual_nearest_bone_skin(mesh,rig)


def export_rigged_fbx(mesh,rig,path):
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.fbx(
        filepath=str(path),use_selection=True,
        object_types={'ARMATURE','MESH'},
        add_leaf_bones=False,
        bake_anim=True,
        bake_anim_use_nla_strips=False,
        bake_anim_use_all_actions=False,
        bake_anim_simplify_factor=1.0,
        use_mesh_modifiers=True,
        path_mode='AUTO'
    )


def evaluated_bounds(mesh):
    deps = bpy.context.evaluated_depsgraph_get()
    ob = mesh.evaluated_get(deps)
    evaluated = ob.to_mesh()
    coords = [ob.matrix_world @ vert.co for vert in evaluated.vertices]
    lo = Vector((min(v.x for v in coords),min(v.y for v in coords),min(v.z for v in coords)))
    hi = Vector((max(v.x for v in coords),max(v.y for v in coords),max(v.z for v in coords)))
    ob.to_mesh_clear()
    return lo, hi


def render_preview(mesh,rig,action,output):
    try:
        scene = bpy.context.scene
        scene.render.engine = 'BLENDER_WORKBENCH'
        scene.render.resolution_x=720
        scene.render.resolution_y=720
        scene.render.resolution_percentage=100
        scene.render.film_transparent=False
        scene.display.shading.color_type='OBJECT'
        scene.display.shading.light='STUDIO'
        scene.display.shading.show_cavity=True
        scene.display.shading.show_shadows=True
        mesh.color=(0.33,0.13,0.09,1)
        if rig is not None:
            rig.animation_data_create().action=action
            rig.data.pose_position='POSE' if action else 'REST'
        frame=int((action.frame_range[0]+action.frame_range[1])*0.5) if action else 1
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        mn,mx = evaluated_bounds(mesh) if rig is not None else world_bounds(mesh)
        print("GUARDIAN_POSE_BOUNDS", output.name, tuple(round(v,3) for v in mn), tuple(round(v,3) for v in mx))
        mid=(mn+mx)*0.5
        size=max((mx-mn).length,1)
        cam_data=bpy.data.cameras.new('GuardianAuditCam')
        cam=bpy.data.objects.new('GuardianAuditCam',cam_data)
        scene.collection.objects.link(cam)
        cam.location=mid+Vector((0,-size*1.25,size*0.45))
        direction=mid-cam.location
        cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
        cam_data.type='ORTHO'
        cam_data.ortho_scale=max((mx-mn).z*1.75,(mx-mn).x*1.65)
        scene.camera=cam
        scene.render.image_settings.file_format='PNG'
        scene.render.filepath=str(output)
        bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(cam,do_unlink=True)
    except Exception as exc:
        print("GUARDIAN_RIG_RENDER_WARNING",str(exc)[:300])


def main():
    argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    p=argparse.ArgumentParser()
    p.add_argument('--mesh',required=True)
    p.add_argument('--idle',required=True)
    p.add_argument('--heavy',required=True)
    p.add_argument('--output',required=True)
    args=p.parse_args(argv)
    out=Path(args.output)
    out.mkdir(parents=True,exist_ok=True)
    if not Path(args.mesh).is_file() or not Path(args.idle).is_file():
        raise SystemExit('Source guardian mesh or skeleton asset missing')

    model_objs=import_fbx(args.mesh)
    mesh=next((ob for ob in model_objs if ob.type=="MESH"),None)
    if mesh is None:
        raise SystemExit("Guardian FBX has no mesh")
    mesh.name="KalaBhairavaAbyss"
    original_verts=len(mesh.data.vertices)
    # Keep hero silhouette but reduce 145k unskinned vertices to near 46k.
    if original_verts>60000:
        bpy.ops.object.select_all(action='DESELECT')
        mesh.select_set(True)
        bpy.context.view_layer.objects.active=mesh
        modifier=mesh.modifiers.new("GuardianRuntimeLOD","DECIMATE")
        modifier.ratio=max(0.26, 44000/original_verts)
        bpy.ops.object.modifier_apply(modifier=modifier.name)

    # Control image: original sculpt BEFORE any skeleton, skinning or action.
    # This proves what the model should look like independent of rigging.
    render_preview(mesh,None,None,out/'guardian-source-unrigged.png')

    previous=set(bpy.data.actions)
    idle_objs=import_fbx(args.idle)
    rig=next((ob for ob in idle_objs if ob.type=="ARMATURE"),None)
    if rig is None:
        raise SystemExit("Idle FBX has no armature")
    rig.name="KalaBhairavaArmature"
    idle=choose_action(rig,previous)
    if idle is None:
        raise SystemExit("Idle FBX has no action")
    idle.name="KalaBhairava_Idle"
    idle.use_fake_user=True
    rig.animation_data_create().action=idle

    fit=rig_to_mesh(rig,mesh)
    binding=bind_mesh(mesh,rig)

    previous=set(bpy.data.actions)
    attack_objs=import_fbx(args.heavy)
    attack_rig=next((ob for ob in attack_objs if ob.type=="ARMATURE"),None)
    attack=choose_action(attack_rig,previous) if attack_rig else None
    if attack:
        attack.name="KalaBhairava_Heavy"
        attack.use_fake_user=True
    if attack_rig:
        bpy.data.objects.remove(attack_rig,do_unlink=True)
    if not attack:
        print("GUARDIAN_RIG_WARNING no attack clip imported")

    report={
        "source_mesh":args.mesh,
        "source_idle":args.idle,
        "source_heavy":args.heavy,
        "source_vertices":original_verts,
        "runtime_vertices":len(mesh.data.vertices),
        "source_mesh_was_unrigged":True,
        "output_bone_count":len(rig.data.bones),
        "skin_binding_method":binding,
        "mesh_has_armature_modifier":bool(mesh.find_armature()),
        "deforming_vertex_groups":len(mesh.vertex_groups),
        "idle_fcurves":len(idle.fcurves) if hasattr(idle,'fcurves') else None,
        "heavy_fcurves":len(attack.fcurves) if attack and hasattr(attack,'fcurves') else None,
        "fit":fit,
        "limitations":[
            "Automatic skinning is an approximation and must be judged on moving rendered footage.",
            "Armature proportions from a Mixamo mutant may not perfectly match the guardian sculpt.",
            "Source Blender mesh and animation packs remain unchanged.",
        ],
    }
    rig.animation_data.action=idle
    scene=bpy.context.scene
    scene.frame_set(int(idle.frame_range[0]))
    fbxout=out/'guardian-abyss-rigged.fbx'
    export_rigged_fbx(mesh,rig,fbxout)
    report['export_file']=str(fbxout)
    report['export_bytes']=fbxout.stat().st_size
    # Persist a factual rig report BEFORE invoking the renderer. The headless
    # runner may lack libEGL and exit the Blender process during render.
    (out/'rigging-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')

    # Rest screenshot must show the whole original silhouette before any
    # animation is accepted. Framing uses the evaluated deformed mesh,
    # not its original undeformed vertex bounding box.
    render_preview(mesh,rig,None,out/'guardian-rest.png')
    report['rest_evaluated_bounds']=[list(v) for v in evaluated_bounds(mesh)]
    render_preview(mesh,rig,idle,out/'guardian-idle.png')
    report['idle_evaluated_bounds']=[list(v) for v in evaluated_bounds(mesh)]
    if attack:
        render_preview(mesh,rig,attack,out/'guardian-heavy.png')
        report['heavy_evaluated_bounds']=[list(v) for v in evaluated_bounds(mesh)]
    (out/'rigging-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print("GUARDIAN_RIG_REPORT "+json.dumps(report))
    if not report['mesh_has_armature_modifier'] or report['deforming_vertex_groups']<4:
        raise SystemExit("Rigging failed skinning acceptance")
    return 0


if __name__=='__main__':
    raise SystemExit(main())
