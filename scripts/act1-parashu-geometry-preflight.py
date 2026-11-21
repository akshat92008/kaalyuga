"""Non-destructive Act I Parashu blade-head geometry audit.

This is an FBX source validation and candidate marker preview, NOT an
animation retargeter or approved release export. It neither edits the original
mesh nor silently substitutes a different weapon.

Run:
 blender -b --python scripts/act1-parashu-geometry-preflight.py -- \\
   --weapon "new 3D assets and animations/3D Models/Weapons/Bloodforged_Trident_Axe_20261025/Meshy_AI_Bloodforged_Trident_Axe_20261025_texture.fbx" \\
   --output "artifacts/act1-parashu/head-audit.json" --render-preview
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector


def parse_args():
    raw = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--weapon", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--render-preview", action="store_true")
    return p.parse_args(raw)


def import_fbx(path):
    if not path.is_file():
        raise FileNotFoundError(path)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(path.resolve()))
    objs = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in objs if o.type == "MESH" and len(o.data.vertices)]
    if not meshes:
        raise RuntimeError("Parashu FBX has no mesh vertices")
    bpy.context.view_layer.update()
    return objs, meshes


def main():
    args = parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    objs, meshes = import_fbx(args.weapon)

    # Count and sample physical mesh VERTICES (not an invented Box3 corner).
    verts = []
    tri_count = 0
    for mesh in meshes:
        mat = mesh.matrix_world
        stride = max(1, len(mesh.data.vertices) // 45000)
        # Blender bpy_prop_collection supports indexed access but does not
        # reliably support Python extended slicing with a stride.
        verts.extend((mat @ mesh.data.vertices[i].co).copy()
                     for i in range(0, len(mesh.data.vertices), stride))
        tri_count += sum(max(0, len(face.vertices)-2) for face in mesh.data.polygons)
    if len(verts) < 16:
        raise RuntimeError("Parashu mesh has insufficient geometry for head calibration")

    low = Vector([min(v[d] for v in verts) for d in range(3)])
    high = Vector([max(v[d] for v in verts) for d in range(3)])
    center = (low+high)*0.5
    dims = high-low
    long_axis = max(range(3), key=lambda d:dims[d])
    # The original Bloodforged Trident Axe's LONGEST shaft endpoint is its
    # decorative bottom pommel. Inspect transverse widths near BOTH ends.
    axis_span = max(1e-6,float(dims[long_axis]))
    other_axes = [a for a in range(3) if a != long_axis]
    pos_cap = [v for v in verts if v[long_axis] >= high[long_axis] - axis_span*0.28]
    neg_cap = [v for v in verts if v[long_axis] <= low[long_axis] + axis_span*0.28]
    if not pos_cap or not neg_cap:
        raise RuntimeError("Cannot find Parashu vertices at both shaft ends")
    def transverse_width(points):
        return max(
          max(v[axis] for v in points)-min(v[axis] for v in points)
          for axis in other_axes
        )
    pos_width=transverse_width(pos_cap)
    neg_width=transverse_width(neg_cap)
    long_positive=pos_width>=neg_width
    near_head=pos_cap if long_positive else neg_cap
    near_grip=neg_cap if long_positive else pos_cap
    base=[sum(v[a] for v in near_grip)/len(near_grip) for a in other_axes]
    # Actual cutting edge surface vertex (not an empty bounding-box corner).
    point=max(near_head,key=lambda v:sum(
       (v[a]-base[i])**2 for i,a in enumerate(other_axes)
    ))
    axial_end=high[long_axis] if long_positive else low[long_axis]
    pct_from_end=abs(float(axial_end-point[long_axis]))/axis_span
    head_width=max(pos_width,neg_width)
    pommel_width=min(pos_width,neg_width)

    errors = []
    if tri_count <= 0:
        errors.append("no_visible_triangles")
    if min(float(d) for d in dims) <= 0:
        errors.append("degenerate_bounds")

    report = {
      "schema_version":1,
      "source_fbx":str(args.weapon),
      "blender_version":bpy.app.version_string,
      "mesh_count":len(meshes),
      "mesh_names":[m.name for m in meshes],
      "sampled_vertices":len(verts),
      "triangles":tri_count,
      "bounds_min":[round(float(v),5) for v in low],
      "bounds_max":[round(float(v),5) for v in high],
      "dimensions":[round(float(v),5) for v in dims],
      "dominant_axis":"XYZ"[long_axis],
      "head_end":"positive" if long_positive else "negative",
      "head_width":round(float(head_width),5),
      "pommel_width":round(float(pommel_width),5),
      "suggested_blade_surface_vertex_blender_world":[round(float(v),5) for v in point],
      "candidate_head_end_offset_ratio":round(float(pct_from_end),4),
      "errors":errors,
      "limits":[
         "Blender FBX import and Three.js FBXLoader may convert axes differently",
         "This geometry-derived point is a candidate, not an artist-approved cutting-edge socket",
         "Weapon-to-hand grip and animated clipping require in-game multi-frame visual checks",
         "No original meshes, materials, animations or release manifests were modified"
      ]
    }

    if args.render_preview:
        # Lightweight clay geometry preview, with a crimson sphere showing
        # the candidate surface point. Does not need texture downloads.
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,
            radius=max(float(dims[long_axis])*.028,.001),location=point)
        sphere=bpy.context.object
        sphere.name="QA_BLADE_SURFACE_CANDIDATE_NOT_EXPORTED"
        red=bpy.data.materials.new("QA_POINT_ONLY_CRIMSON")
        red.diffuse_color=(.95,.11,.08,1.0)
        sphere.data.materials.append(red)
        cam_data=bpy.data.cameras.new("QA_orthographic_camera")
        cam=bpy.data.objects.new("QA_orthographic_camera",cam_data)
        bpy.context.scene.collection.objects.link(cam)
        bpy.context.scene.camera=cam
        direction=Vector((1.8,-2.8,1.5))
        cam.location=center+direction.normalized()*max(float(dims[long_axis])*2.,1.)
        cam.rotation_euler=(center-cam.location).to_track_quat("-Z","Y").to_euler()
        cam.data.type="ORTHO"
        cam.data.ortho_scale=max(float(dims[long_axis])*1.75,.01)
        scene=bpy.context.scene
        # GitHub's Linux headless runner has no EGL display. Render using
        # Blender Cycles CPU instead of Workbench/OpenGL to produce a genuine,
        # stable FBX geometry preview on stock build agents.
        clay=bpy.data.materials.new("QA_CLAY_GEOMETRY_ONLY")
        clay.diffuse_color=(.39,.31,.27,1.0)
        clay.use_nodes=True
        clay.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value=(.39,.31,.27,1.0)
        for mesh in meshes:
            mesh.data.materials.clear()
            mesh.data.materials.append(clay)
        red.use_nodes=True
        red.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value=(.95,.09,.07,1.0)
        light_data=bpy.data.lights.new("QA_softbox","AREA")
        light=bpy.data.objects.new("QA_softbox",light_data)
        bpy.context.scene.collection.objects.link(light)
        light.location=center+Vector((2.4,-3.5,4.2)).normalized()*max(float(dims[long_axis])*2.0,1.)
        light.rotation_euler=(center-light.location).to_track_quat("-Z","Y").to_euler()
        light_data.energy=950
        light_data.shape="DISK"
        light_data.size=max(float(dims[long_axis])*1.4,.1)
        scene.render.engine="CYCLES"
        scene.cycles.device="CPU"
        scene.cycles.samples=8
        scene.cycles.use_denoising=False
        for view_layer in scene.view_layers:
            view_layer.cycles.use_denoising=False
        scene.render.resolution_x=640
        scene.render.resolution_y=640
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.film_transparent=True
        scene.render.filepath=str(args.output.with_suffix(".png").resolve())
        bpy.ops.render.render(write_still=True)
        report["preview_png"]=str(args.output.with_suffix(".png"))
        # The generated QA-only preview is NOT an asset to be packaged.

    args.output.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"result":"passed" if not errors else "failed",
      "output":str(args.output),"triangles":tri_count,
      "candidate":report["suggested_blade_surface_vertex_blender_world"],
      "errors":errors}))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
