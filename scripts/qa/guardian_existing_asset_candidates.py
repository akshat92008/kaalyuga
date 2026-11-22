"""Read-only Blender audition of existing mythic guardian candidate FBX models.

No asset modifications. Records which sculpt contains animation-ready skin.
Creates preview PNGs for human comparison, including a front and 45-degree view.
"""
import bpy, sys, json, math
from pathlib import Path
from mathutils import Vector

def inspect(path, out):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    record={'path':str(path),'error':None}
    try:
        bpy.ops.import_scene.fbx(filepath=str(path.resolve()),use_anim=True)
        objects=list(bpy.context.scene.objects)
        meshes=sorted((o for o in objects if o.type=='MESH'),key=lambda x:len(x.data.vertices),reverse=True)
        rigs=[o for o in objects if o.type=='ARMATURE']
        if not meshes: raise ValueError('No mesh in FBX')
        for ob in objects:
            ob.hide_render=False
            ob.hide_viewport=False
            ob.hide_set(False)
        mesh=meshes[0]
        record.update({
           'mesh_count':len(meshes),'total_mesh_vertices':sum(len(o.data.vertices) for o in meshes),
           'main_mesh_vertices':len(mesh.data.vertices),
           'armature_count':len(rigs),
           'bone_counts':[len(o.data.bones) for o in rigs],
           'main_mesh_skin_groups':len(mesh.vertex_groups),
           'main_mesh_armature_modifier':bool(mesh.find_armature()),
           'action_names':[a.name for a in bpy.data.actions],
        })
        deps=bpy.context.evaluated_depsgraph_get()
        points=[(o.matrix_world@Vector(c)) for o in meshes for c in o.bound_box]
        lo=Vector((min(p.x for p in points),min(p.y for p in points),min(p.z for p in points)))
        hi=Vector((max(p.x for p in points),max(p.y for p in points),max(p.z for p in points)))
        cen=(hi+lo)/2
        size=hi-lo
        record['bounds']={'min':list(lo),'max':list(hi)}
        record['dims']=[round(v,3) for v in size]
        scene=bpy.context.scene
        scene.render.engine='BLENDER_WORKBENCH'
        scene.render.resolution_x=640
        scene.render.resolution_y=640
        scene.render.resolution_percentage=100
        scene.display.shading.light='STUDIO'
        scene.display.shading.color_type='OBJECT'
        scene.display.shading.show_cavity=True
        scene.display.shading.show_shadows=True
        for m in meshes: m.color=(0.52,0.19,0.12,1)
        cam_data=bpy.data.cameras.new('CandidatePreviewCamera')
        cam=bpy.data.objects.new('CandidatePreviewCamera',cam_data)
        scene.collection.objects.link(cam)
        scene.camera=cam
        cam_data.type='ORTHO'
        cam_data.ortho_scale=max(max(size),0.1)*1.7
        distance=max(max(size),0.1)*2.0
        for name,view in [('front',Vector((0,-1,0.3))),('side',Vector((1,-0.4,0.3)))]:
            cam.location=cen+view.normalized()*distance
            cam.rotation_euler=(cen-cam.location).to_track_quat('-Z','Y').to_euler()
            scene.render.image_settings.file_format='PNG'
            scene.render.filepath=str(out/(path.stem[:40]+'-'+name+'.png'))
            bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(cam,do_unlink=True)
    except Exception as exc:
        record['error']=repr(exc)[:400]
    return record

def main():
    args=sys.argv[sys.argv.index('--')+1:]
    out=Path(args[0]);out.mkdir(parents=True,exist_ok=True)
    reports=[inspect(Path(p),out) for p in args[1:]]
    (out/'candidates.json').write_text(json.dumps(reports,indent=2),encoding='utf-8')
    for r in reports:print('GUARDIAN_ALTERNATIVE '+json.dumps(r))
    if not any(r.get('armature_count',0)>0 and r.get('main_mesh_armature_modifier') for r in reports):
        print('WARNING: no confirmed rigged candidate; no automatic swap should occur')
    return 0

if __name__=='__main__':
    raise SystemExit(main())
