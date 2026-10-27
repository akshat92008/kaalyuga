import bpy
import math
import os
from mathutils import Vector

# 1. Reset Scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# Configure Render Settings
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.fps = 24
scene.frame_start = 1
scene.frame_end = 120

# 2. Arena Floor (Basalt Slate)
bpy.ops.mesh.primitive_plane_add(size=44, location=(0, 0, 0))
floor = bpy.context.active_object
floor.name = 'Arena_Floor'
mat_floor = bpy.data.materials.new(name='Mat_Temple_Floor')
mat_floor.use_nodes = True
b_floor = mat_floor.node_tree.nodes.get('Principled BSDF')
if b_floor:
    b_floor.inputs['Base Color'].default_value = (0.045, 0.04, 0.045, 1.0)
    b_floor.inputs['Roughness'].default_value = 0.82
    b_floor.inputs['Metallic'].default_value = 0.2
floor.data.materials.append(mat_floor)

# 3. Columns & Architecture
mat_stone = bpy.data.materials.new(name='Mat_Ancient_Stone')
mat_stone.use_nodes = True
b_stone = mat_stone.node_tree.nodes.get('Principled BSDF')
if b_stone:
    b_stone.inputs['Base Color'].default_value = (0.09, 0.075, 0.07, 1.0)
    b_stone.inputs['Roughness'].default_value = 0.92

pillar_coords = [(-7.5, 6.5), (7.5, 6.5), (-8.5, -4.5), (8.5, -4.5)]
for i, (px, py) in enumerate(pillar_coords):
    bpy.ops.mesh.primitive_cylinder_add(radius=1.6, depth=0.6, location=(px, py, 0.3))
    base = bpy.context.active_object
    base.name = f'Pillar_Base_{i+1}'
    base.data.materials.append(mat_stone)
    bpy.ops.mesh.primitive_cylinder_add(radius=1.1, depth=10.0, location=(px, py, 5.6))
    shaft = bpy.context.active_object
    shaft.name = f'Pillar_Shaft_{i+1}'
    shaft.data.materials.append(mat_stone)
    bpy.ops.mesh.primitive_cylinder_add(radius=1.5, depth=0.8, location=(px, py, 11.0))
    cap = bpy.context.active_object
    cap.name = f'Pillar_Cap_{i+1}'
    cap.data.materials.append(mat_stone)

# Broken Fallen Pillar
bpy.ops.mesh.primitive_cylinder_add(radius=1.1, depth=6.5, location=(-3.2, 4.5, 1.1))
broken = bpy.context.active_object
broken.name = 'Broken_Pillar'
broken.rotation_euler = (math.radians(88), math.radians(8), math.radians(40))
broken.data.materials.append(mat_stone)

# Flaming Braziers
for i, bx in enumerate([-4.2, 4.2]):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.7, depth=1.4, location=(bx, 5.8, 0.7))
    br = bpy.context.active_object
    br.name = f'Brazier_Stand_{i+1}'
    br.data.materials.append(mat_stone)
    bpy.ops.object.light_add(type='POINT', location=(bx, 5.8, 1.6))
    flame = bpy.context.active_object
    flame.name = f'Brazier_Flame_{i+1}'
    flame.data.energy = 900.0
    flame.data.color = (1.0, 0.35, 0.04)

# 4. Import Rigged Minotaur with Roar Animation
minotaur_fbx = '/Users/ashishsingh/Desktop/kaliyuga/creature_animations/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture.fbx'
bpy.ops.import_scene.fbx(filepath=minotaur_fbx)
mino_objs = [o for o in bpy.context.selected_objects]
mino_mesh = next((o for o in mino_objs if o.type == 'MESH'), None)
mino_arm = next((o for o in mino_objs if o.type == 'ARMATURE'), None)

# Also import mutant roaring action
roar_fbx = '/Users/ashishsingh/Desktop/kaliyuga/creature_animations/mutant roaring.fbx'
bpy.ops.import_scene.fbx(filepath=roar_fbx)
# Find roar action
roar_act = None
for a in bpy.data.actions:
    if 'mixamo.com' in a.name or 'layer0' in a.name.lower():
        roar_act = a
        break

if mino_arm:
    mino_arm.name = 'Actor_Minotaur_Armature'
    # Scale: from cm to meters (x 0.024 for 2.4m hulking warlord)
    mino_arm.scale = (0.024, 0.024, 0.024)
    mino_arm.rotation_euler = (0, 0, math.radians(180))
    mino_arm.location = (0, 4.0, 0.0)
    if roar_act:
        if not mino_arm.animation_data:
            mino_arm.animation_data_create()
        mino_arm.animation_data.action = roar_act

if mino_mesh:
    mino_mesh.name = 'Actor_Minotaur_Mesh'
    # Assign PBR Material
    mat_mino = bpy.data.materials.new(name='Mat_Minotaur_Warlord')
    mat_mino.use_nodes = True
    nodes = mat_mino.node_tree.nodes
    links = mat_mino.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    tex_dir = '/Users/ashishsingh/Desktop/kaliyuga/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx'
    diff = os.path.join(tex_dir, 'Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture.png')
    norm = os.path.join(tex_dir, 'Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_normal.png')
    rough = os.path.join(tex_dir, 'Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_roughness.png')
    
    t_diff = nodes.new('ShaderNodeTexImage')
    t_diff.image = bpy.data.images.load(diff, check_existing=True)
    links.new(t_diff.outputs['Color'], bsdf.inputs['Base Color'])
    
    t_rough = nodes.new('ShaderNodeTexImage')
    t_rough.image = bpy.data.images.load(rough, check_existing=True)
    t_rough.image.colorspace_settings.name = 'Non-Color'
    links.new(t_rough.outputs['Color'], bsdf.inputs['Roughness'])
    
    t_norm = nodes.new('ShaderNodeTexImage')
    t_norm.image = bpy.data.images.load(norm, check_existing=True)
    t_norm.image.colorspace_settings.name = 'Non-Color'
    nmap = nodes.new('ShaderNodeNormalMap')
    links.new(t_norm.outputs['Color'], nmap.inputs['Color'])
    links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
    
    mino_mesh.data.materials.clear()
    mino_mesh.data.materials.append(mat_mino)

# 5. Import Rudra (Ashen Warborn)
rudra_fbx = '/Users/ashishsingh/Desktop/kaliyuga/wukong-master-guide-—-technical-code-audit-&-sandbox (1)/public/models/Meshy_AI_Ashen_Warborn_biped/Meshy_AI_Ashen_Warborn_biped_Meshy_Merged_Animations.fbx'
bpy.ops.import_scene.fbx(filepath=rudra_fbx)
rudra_objs = [o for o in bpy.context.selected_objects]
rudra_mesh = next((o for o in rudra_objs if o.type == 'MESH'), None)
rudra_arm = next((o for o in rudra_objs if o.type == 'ARMATURE'), None)

if rudra_arm:
    rudra_arm.name = 'Actor_Rudra_Armature'
    # Upright: 90 deg on X
    rudra_arm.rotation_euler = (math.radians(90), 0, 0)
    rudra_arm.scale = (1.45, 1.45, 1.45) # 1.83m hero
    rudra_arm.location = (0, -3.2, 0.0)
    
    # Assign Skill Animation
    skill_act = None
    for a in bpy.data.actions:
        if 'Skill_03' in a.name or 'Attack' in a.name:
            skill_act = a
            break
    if skill_act:
        if not rudra_arm.animation_data:
            rudra_arm.animation_data_create()
        rudra_arm.animation_data.action = skill_act

if rudra_mesh:
    rudra_mesh.name = 'Actor_Rudra_Mesh'
    mat_rudra = bpy.data.materials.new(name='Mat_Rudra')
    mat_rudra.use_nodes = True
    nodes = mat_rudra.node_tree.nodes
    links = mat_rudra.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    rudra_dir = '/Users/ashishsingh/Desktop/kaliyuga/wukong-master-guide-—-technical-code-audit-&-sandbox (1)/public/models/Meshy_AI_Ashen_Warborn_biped'
    r_diff = os.path.join(rudra_dir, 'Meshy_AI_Ashen_Warborn_biped_texture_0.png')
    r_norm = os.path.join(rudra_dir, 'Meshy_AI_Ashen_Warborn_biped_texture_0_normal.png')
    r_rough = os.path.join(rudra_dir, 'Meshy_AI_Ashen_Warborn_biped_texture_0_roughness.png')
    
    t_diff = nodes.new('ShaderNodeTexImage')
    t_diff.image = bpy.data.images.load(r_diff, check_existing=True)
    links.new(t_diff.outputs['Color'], bsdf.inputs['Base Color'])
    
    t_rough = nodes.new('ShaderNodeTexImage')
    t_rough.image = bpy.data.images.load(r_rough, check_existing=True)
    t_rough.image.colorspace_settings.name = 'Non-Color'
    links.new(t_rough.outputs['Color'], bsdf.inputs['Roughness'])
    
    t_norm = nodes.new('ShaderNodeTexImage')
    t_norm.image = bpy.data.images.load(r_norm, check_existing=True)
    t_norm.image.colorspace_settings.name = 'Non-Color'
    nmap = nodes.new('ShaderNodeNormalMap')
    links.new(t_norm.outputs['Color'], nmap.inputs['Color'])
    links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
    
    rudra_mesh.data.materials.clear()
    rudra_mesh.data.materials.append(mat_rudra)

# 6. Import Prop: Bloodforged Trident & Parent to Hand
trident_fbx = '/Users/ashishsingh/Desktop/kaliyuga/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.fbx'
bpy.ops.import_scene.fbx(filepath=trident_fbx)
trident_objs = [o for o in bpy.context.selected_objects]
trident = next((o for o in trident_objs if o.type == 'MESH'), None)

if trident and rudra_arm:
    trident.name = 'Prop_Trident'
    trident.parent = rudra_arm
    trident.parent_type = 'BONE'
    trident.parent_bone = 'mixamorig:RightHand'
    trident.location = (0.04, 0.04, -0.35)
    trident.rotation_euler = (math.radians(-90), math.radians(15), math.radians(45))
    trident.scale = (0.85, 0.85, 0.85)
    
    mat_tri = bpy.data.materials.new(name='Mat_Trident')
    mat_tri.use_nodes = True
    nodes = mat_tri.node_tree.nodes
    links = mat_tri.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    tri_dir = '/Users/ashishsingh/Desktop/kaliyuga/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx'
    t_diff_path = os.path.join(tri_dir, 'Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png')
    t_norm_path = os.path.join(tri_dir, 'Meshy_AI_Bloodforged_Trident_A_1025041928_texture_normal.png')
    t_rough_path = os.path.join(tri_dir, 'Meshy_AI_Bloodforged_Trident_A_1025041928_texture_roughness.png')
    
    t_diff = nodes.new('ShaderNodeTexImage')
    t_diff.image = bpy.data.images.load(t_diff_path, check_existing=True)
    links.new(t_diff.outputs['Color'], bsdf.inputs['Base Color'])
    
    t_rough = nodes.new('ShaderNodeTexImage')
    t_rough.image = bpy.data.images.load(t_rough_path, check_existing=True)
    t_rough.image.colorspace_settings.name = 'Non-Color'
    links.new(t_rough.outputs['Color'], bsdf.inputs['Roughness'])
    
    t_norm = nodes.new('ShaderNodeTexImage')
    t_norm.image = bpy.data.images.load(t_norm_path, check_existing=True)
    t_norm.image.colorspace_settings.name = 'Non-Color'
    nmap = nodes.new('ShaderNodeNormalMap')
    links.new(t_norm.outputs['Color'], nmap.inputs['Color'])
    links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
    
    trident.data.materials.clear()
    trident.data.materials.append(mat_tri)

# 7. Cinematic Lighting
bpy.ops.object.light_add(type='SUN', location=(6, -9, 14))
sun = bpy.context.active_object
sun.name = 'Sun_Key'
sun.data.energy = 5.5
sun.data.color = (1.0, 0.72, 0.45)

bpy.ops.object.light_add(type='SPOT', location=(0, 7.2, 4.8))
rim = bpy.context.active_object
rim.name = 'Minotaur_Rim'
rim.data.energy = 1500.0
rim.data.color = (0.15, 0.65, 1.0)
rim.rotation_euler = (math.radians(-55), 0, math.radians(180))

bpy.ops.object.light_add(type='POINT', location=(0, 0.5, 0.3))
lava = bpy.context.active_object
lava.name = 'Lava_Floor_Glow'
lava.data.energy = 600.0
lava.data.color = (1.0, 0.28, 0.04)

bpy.ops.object.light_add(type='POINT', location=(0, -3.3, 1.7))
mani = bpy.context.active_object
mani.name = 'Mani_Glow'
mani.data.energy = 200.0
mani.data.color = (0.95, 0.80, 0.25)

# 8. Multi-Camera System with Aim Tracking
def point_at(cam, target, frame):
    direction = target - cam.location
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam.rotation_euler = rot_quat.to_euler()
    cam.keyframe_insert(data_path='location', frame=frame)
    cam.keyframe_insert(data_path='rotation_euler', frame=frame)

# SHOT 1: Warlord Roar (Frames 1-40)
cam1_data = bpy.data.cameras.new('Cam_BossIntro_Data')
cam1_data.lens = 32
cam1 = bpy.data.objects.new('Cam_BossIntro', cam1_data)
bpy.context.collection.objects.link(cam1)

t1 = Vector((0.0, 4.0, 1.8))
cam1.location = Vector((1.8, 1.4, 0.6))
point_at(cam1, t1, 1)
cam1.location = Vector((1.0, 2.2, 0.85))
point_at(cam1, t1, 40)

# SHOT 2: Rudra OTS & Trident (Frames 41-80)
cam2_data = bpy.data.cameras.new('Cam_RudraHero_Data')
cam2_data.lens = 65
cam2 = bpy.data.objects.new('Cam_RudraHero', cam2_data)
bpy.context.collection.objects.link(cam2)

t2 = Vector((0.0, 0.0, 1.6))
cam2.location = Vector((0.9, -4.8, 1.55))
point_at(cam2, t2, 41)
cam2.location = Vector((0.5, -4.3, 1.65))
point_at(cam2, t2, 80)

# SHOT 3: The Stand-off Wide Profile (Frames 81-120)
cam3_data = bpy.data.cameras.new('Cam_Showdown_Data')
cam3_data.lens = 42
cam3 = bpy.data.objects.new('Cam_Showdown', cam3_data)
bpy.context.collection.objects.link(cam3)

t3 = Vector((0.0, 0.4, 1.3))
cam3.location = Vector((-7.2, 0.0, 2.3))
point_at(cam3, t3, 81)
cam3.location = Vector((-6.3, 1.2, 2.1))
point_at(cam3, t3, 120)

# Bind Timeline Markers
scene.timeline_markers.clear()
m1 = scene.timeline_markers.new('Shot1_Warlord', frame=1)
m1.camera = cam1
m2 = scene.timeline_markers.new('Shot2_Rudra', frame=41)
m2.camera = cam2
m3 = scene.timeline_markers.new('Shot3_Showdown', frame=81)
m3.camera = cam3

# Save complete blend file
blend_out = '/Users/ashishsingh/Desktop/kaliyuga/kaliyuga_cutscene_master.blend'
bpy.ops.wm.save_as_mainfile(filepath=blend_out)
print(f'Saved master blend file to {blend_out}')

# Render Animation frames natively
os.makedirs('/tmp/cutscene_perfect_frames', exist_ok=True)
scene.render.filepath = '/tmp/cutscene_perfect_frames/frame_'
scene.render.image_settings.file_format = 'PNG'

print('Rendering full 120-frame animation via Blender native pipeline...')
bpy.ops.render.render(animation=True)
print('Animation render complete!')
