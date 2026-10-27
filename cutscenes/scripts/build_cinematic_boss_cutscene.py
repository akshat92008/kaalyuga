import bpy
import math
import os
from mathutils import Vector

# 1. Reset Scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# Configure Cinematic 1080p @ 30 FPS
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.fps = 30
scene.frame_start = 1
scene.frame_end = 180

# Enable Motion Blur for butter-smooth fluidity
scene.render.use_motion_blur = True
scene.render.motion_blur_shutter = 0.5

# Color Management: Standard for rich, saturated colors + boost exposure
scene.view_settings.view_transform = 'Standard'
scene.view_settings.exposure = 1.7
scene.view_settings.gamma = 1.0

# Atmospheric World Background
if not scene.world:
    scene.world = bpy.data.worlds.new('World')
scene.world.use_nodes = True
w_nodes = scene.world.node_tree.nodes
w_bg = w_nodes.get('Background')
if w_bg:
    w_bg.inputs['Color'].default_value = (0.045, 0.025, 0.038, 1.0)
    w_bg.inputs['Strength'].default_value = 0.85

# 2. Stage: Wet Volcanic Basalt Floor
bpy.ops.mesh.primitive_plane_add(size=44, location=(0, 0, 0))
floor = bpy.context.active_object
floor.name = 'Arena_Floor'
mat_floor = bpy.data.materials.new(name='Mat_Basalt_Floor')
mat_floor.use_nodes = True
b_floor = mat_floor.node_tree.nodes.get('Principled BSDF')
if b_floor:
    b_floor.inputs['Base Color'].default_value = (0.07, 0.055, 0.05, 1.0)
    b_floor.inputs['Roughness'].default_value = 0.38  # Reflective wet stone
    b_floor.inputs['Metallic'].default_value = 0.35
floor.data.materials.append(mat_floor)

# 3. Columns & Architecture
mat_stone = bpy.data.materials.new(name='Mat_Ancient_Stone')
mat_stone.use_nodes = True
b_stone = mat_stone.node_tree.nodes.get('Principled BSDF')
if b_stone:
    b_stone.inputs['Base Color'].default_value = (0.12, 0.09, 0.08, 1.0)
    b_stone.inputs['Roughness'].default_value = 0.88

pillar_coords = [(-6.5, 6.0), (6.5, 6.0), (-7.5, -3.5), (7.5, -3.5)]
for i, (px, py) in enumerate(pillar_coords):
    bpy.ops.mesh.primitive_cylinder_add(radius=1.5, depth=0.6, location=(px, py, 0.3))
    base = bpy.context.active_object
    base.name = f'Pillar_Base_{i+1}'
    base.data.materials.append(mat_stone)
    
    bpy.ops.mesh.primitive_cylinder_add(radius=1.05, depth=10.0, location=(px, py, 5.6))
    shaft = bpy.context.active_object
    shaft.name = f'Pillar_Shaft_{i+1}'
    shaft.data.materials.append(mat_stone)
    
    bpy.ops.mesh.primitive_cylinder_add(radius=1.45, depth=0.8, location=(px, py, 11.0))
    cap = bpy.context.active_object
    cap.name = f'Pillar_Cap_{i+1}'
    cap.data.materials.append(mat_stone)

# Broken Collapsed Column near the Boss
bpy.ops.mesh.primitive_cylinder_add(radius=1.0, depth=6.5, location=(-3.0, 4.8, 1.0))
broken = bpy.context.active_object
broken.name = 'Broken_Pillar'
broken.rotation_euler = (math.radians(88), math.radians(8), math.radians(40))
broken.data.materials.append(mat_stone)

# 4. Flaming Braziers (Warm Torches Flanking the Gate)
for i, bx in enumerate([-3.8, 3.8]):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.65, depth=1.3, location=(bx, 5.5, 0.65))
    br = bpy.context.active_object
    br.name = f'Brazier_Stand_{i+1}'
    br.data.materials.append(mat_stone)
    
    bpy.ops.object.light_add(type='POINT', location=(bx, 5.5, 1.6))
    flame = bpy.context.active_object
    flame.name = f'Brazier_Flame_{i+1}'
    flame.data.energy = 4500.0
    flame.data.color = (1.0, 0.45, 0.08)

# 5. Import the Boss: Minotaur Warlord
minotaur_fbx = '/Users/ashishsingh/Desktop/kaliyuga/creature_animations/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture.fbx'
bpy.ops.import_scene.fbx(filepath=minotaur_fbx)
mino_objs = [o for o in bpy.context.selected_objects]
mino_mesh = next((o for o in mino_objs if o.type == 'MESH'), None)
mino_arm = next((o for o in mino_objs if o.type == 'ARMATURE'), None)

# Also import the roaring animation action
roar_fbx = '/Users/ashishsingh/Desktop/kaliyuga/creature_animations/mutant roaring.fbx'
bpy.ops.import_scene.fbx(filepath=roar_fbx)
roar_act = None
for a in bpy.data.actions:
    if 'mixamo.com' in a.name or 'layer0' in a.name.lower():
        roar_act = a
        break

if mino_arm:
    mino_arm.name = 'Actor_Minotaur_Armature'
    # Scale from cm to meters (x0.0245 = 2.45m tall towering warlord)
    mino_arm.scale = (0.0245, 0.0245, 0.0245)
    mino_arm.rotation_euler = (0, 0, math.radians(180))
    mino_arm.location = (0, 4.0, 0.0)
    if roar_act:
        if not mino_arm.animation_data:
            mino_arm.animation_data_create()
        mino_arm.animation_data.action = roar_act

if mino_mesh:
    mino_mesh.name = 'Actor_Minotaur_Mesh'
    # Full PBR Material
    mat_mino = bpy.data.materials.new(name='Mat_Minotaur_PBR')
    mat_mino.use_nodes = True
    nodes = mat_mino.node_tree.nodes
    links = mat_mino.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    
    tex_dir = '/Users/ashishsingh/Desktop/kaliyuga/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx'
    diff = os.path.join(tex_dir, 'Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture.png')
    norm = os.path.join(tex_dir, 'Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_normal.png')
    rough = os.path.join(tex_dir, 'Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_roughness.png')
    
    # Diffuse Base Color
    t_diff = nodes.new('ShaderNodeTexImage')
    t_diff.image = bpy.data.images.load(diff, check_existing=True)
    links.new(t_diff.outputs['Color'], bsdf.inputs['Base Color'])
    
    # Metallic for bronze armor
    bsdf.inputs['Metallic'].default_value = 0.65
    
    # Roughness
    t_rough = nodes.new('ShaderNodeTexImage')
    t_rough.image = bpy.data.images.load(rough, check_existing=True)
    t_rough.image.colorspace_settings.name = 'Non-Color'
    links.new(t_rough.outputs['Color'], bsdf.inputs['Roughness'])
    
    # Normal Map for detailed muscles & runes
    t_norm = nodes.new('ShaderNodeTexImage')
    t_norm.image = bpy.data.images.load(norm, check_existing=True)
    t_norm.image.colorspace_settings.name = 'Non-Color'
    nmap = nodes.new('ShaderNodeNormalMap')
    nmap.inputs['Strength'].default_value = 1.6 # Deep normal depth
    links.new(t_norm.outputs['Color'], nmap.inputs['Color'])
    links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
    
    mino_mesh.data.materials.clear()
    mino_mesh.data.materials.append(mat_mino)

# 6. High-Impact Cinematic Lighting Rig
# Warm Amber Sun (Key Light)
bpy.ops.object.light_add(type='SUN', location=(6, -7, 14))
sun = bpy.context.active_object
sun.name = 'Sun_Key'
sun.data.energy = 85.0
sun.data.color = (1.0, 0.80, 0.55)

# Eye-Level Front Fill Light (Illuminates face, horns, and chest definition)
bpy.ops.object.light_add(type='POINT', location=(0.0, 1.8, 1.9))
fill = bpy.context.active_object
fill.name = 'Boss_Front_Fill'
fill.data.energy = 9500.0
fill.data.color = (1.0, 0.88, 0.70)

# Cold Cyan Rim/Back Light (Carves sharp silhouette of horns and shoulders)
bpy.ops.object.light_add(type='SPOT', location=(0.0, 7.5, 4.8))
rim = bpy.context.active_object
rim.name = 'Minotaur_Rim'
rim.data.energy = 18000.0
rim.data.color = (0.20, 0.75, 1.0)
rim.rotation_euler = (math.radians(-55), 0, math.radians(180))

# Molten Lava Ground Fissure Glow
bpy.ops.object.light_add(type='POINT', location=(0, 2.8, 0.4))
lava = bpy.context.active_object
lava.name = 'Lava_Floor_Glow'
lava.data.energy = 3200.0
lava.data.color = (1.0, 0.28, 0.02)

# 7. Focus Target & Track-To Constraints for Perfect Centered Framing
focus_target = bpy.data.objects.new('Boss_Focus_Target', None)
bpy.context.collection.objects.link(focus_target)
focus_target.location = (0.0, 4.0, 1.7)

def setup_camera(name, lens, fstop=2.4):
    cdata = bpy.data.cameras.new(f'{name}_Data')
    cdata.lens = lens
    cdata.clip_start = 0.1
    cdata.dof.use_dof = True
    cdata.dof.focus_object = focus_target
    cdata.dof.aperture_fstop = fstop
    cobj = bpy.data.objects.new(name, cdata)
    bpy.context.collection.objects.link(cobj)
    
    tt = cobj.constraints.new(type='TRACK_TO')
    tt.target = focus_target
    tt.track_axis = 'TRACK_NEGATIVE_Z'
    tt.up_axis = 'UP_Y'
    return cobj

# --- SHOT 1: The Ground Stomp & Rising Presence (Frames 1-55) ---
cam1 = setup_camera('Cam_Shot1_Stomp', lens=28, fstop=2.8)
# Animate low-angle crane push-in
cam1.location = Vector((0.3, 1.2, 0.45))
cam1.keyframe_insert(data_path='location', frame=1)

# Subtle camera impact shake around frame 20 (hoof stomp)
for f, shake_z in [(18, 0.48), (20, 0.42), (22, 0.47), (24, 0.44)]:
    cam1.location = Vector((0.2, 1.5, shake_z))
    cam1.keyframe_insert(data_path='location', frame=f)

cam1.location = Vector((0.0, 1.8, 0.85))
cam1.keyframe_insert(data_path='location', frame=55)

# --- SHOT 2: The Horns & Muscle Flex Orbital Sweep (Frames 56-115) ---
cam2 = setup_camera('Cam_Shot2_TorsoSweep', lens=52, fstop=2.0)
# Cinematic arc sweep around the front-right to front
cam2.location = Vector((1.6, 2.2, 1.75))
cam2.keyframe_insert(data_path='location', frame=56)

cam2.location = Vector((0.8, 1.9, 1.80))
cam2.keyframe_insert(data_path='location', frame=85)

cam2.location = Vector((0.0, 1.7, 1.75))
cam2.keyframe_insert(data_path='location', frame=115)

# --- SHOT 3: The Primal Roar Apex & Title Card (Frames 116-180) ---
cam3 = setup_camera('Cam_Shot3_RoarApex', lens=36, fstop=2.6)
# Dynamic hero pullback framing the whole beast
cam3.location = Vector((0.0, 1.6, 1.65))
cam3.keyframe_insert(data_path='location', frame=116)

# Roar camera vibration shake (Frames 130-160)
import random
random.seed(42)
for f in range(128, 162, 2):
    rx = (random.random() - 0.5) * 0.06
    rz = (random.random() - 0.5) * 0.05
    cam3.location = Vector((rx, 1.0 - (f - 116) * 0.015, 1.55 + rz))
    cam3.keyframe_insert(data_path='location', frame=f)

cam3.location = Vector((0.0, 0.3, 1.45))
cam3.keyframe_insert(data_path='location', frame=180)

# Bind Timeline Markers to switch cameras automatically
scene.timeline_markers.clear()
m1 = scene.timeline_markers.new('Shot1', frame=1)
m1.camera = cam1
m2 = scene.timeline_markers.new('Shot2', frame=56)
m2.camera = cam2
m3 = scene.timeline_markers.new('Shot3', frame=116)
m3.camera = cam3

# Save Master Project File
blend_out = '/Users/ashishsingh/Desktop/kaliyuga/kaliyuga_boss_intro_master.blend'
bpy.ops.wm.save_as_mainfile(filepath=blend_out)
print(f'Master blend file saved to {blend_out}')

# Render 180 Frames natively at 1080p
frames_dir = '/tmp/boss_cinematic_frames'
os.makedirs(frames_dir, exist_ok=True)
scene.render.filepath = os.path.join(frames_dir, 'frame_')
scene.render.image_settings.file_format = 'PNG'

print('Rendering 180 frames @ 1080p 30FPS with motion blur & Track-To camera...')
bpy.ops.render.render(animation=True)
print('Boss entry render complete!')
