import bpy
import math
import os
import sys
from mathutils import Vector, Euler, Quaternion

# Import custom animation module
sys.path.append("/Users/ashishsingh/.gemini/antigravity/brain/7de577fd-9692-416c-ba16-3ab76a473aa8/scratch")
import generate_custom_animation

print("=== REBUILDING GOD OF WAR CUTSCENE WITH ACCURATE TRANSFORMS ===")

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# 1920x804 Anamorphic 2.39:1
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1920
scene.render.resolution_y = 804
scene.render.resolution_percentage = 100
scene.render.fps = 30
scene.frame_start = 1
scene.frame_end = 150

# EEVEE Next Settings
scene.view_settings.view_transform = 'Standard'
scene.view_settings.exposure = 1.3

# World
world = bpy.data.worlds.new("GoW_World")
scene.world = world
world.use_nodes = True
wn = world.node_tree.nodes
wn.clear()
w_bg = wn.new(type='ShaderNodeBackground')
w_bg.inputs['Color'].default_value = (0.015, 0.018, 0.03, 1.0)
w_bg.inputs['Strength'].default_value = 0.5
w_out = wn.new(type='ShaderNodeOutputWorld')
world.node_tree.links.new(w_bg.outputs['Background'], w_out.inputs['Surface'])

# Base Paths
ASSETS_DIR = "/Users/ashishsingh/Desktop/kaliyuga/cutscenes/assets"
MINOTAUR_FBX = os.path.join(ASSETS_DIR, "animations/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture.fbx")
MINOTAUR_TEX_DIR = os.path.join(ASSETS_DIR, "characters/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx")
TRIDENT_FBX = os.path.join(ASSETS_DIR, "weapons/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.fbx")
TRIDENT_TEX_DIR = os.path.join(ASSETS_DIR, "weapons/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx")

def create_pbr_material(name, diff_path, norm_path, rough_path, metal_path, metal_tint=0.8, norm_strength=2.2):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    
    output = nodes.new(type='ShaderNodeOutputMaterial')
    output.location = (600, 0)
    bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.location = (200, 0)
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    
    if os.path.exists(diff_path):
        tex_diff = nodes.new(type='ShaderNodeTexImage')
        tex_diff.image = bpy.data.images.load(diff_path)
        tex_diff.location = (-400, 300)
        links.new(tex_diff.outputs['Color'], bsdf.inputs['Base Color'])
    
    if os.path.exists(norm_path):
        tex_norm = nodes.new(type='ShaderNodeTexImage')
        tex_norm.image = bpy.data.images.load(norm_path)
        tex_norm.image.colorspace_settings.name = 'Non-Color'
        tex_norm.location = (-400, -200)
        norm_map = nodes.new(type='ShaderNodeNormalMap')
        norm_map.inputs['Strength'].default_value = norm_strength
        norm_map.location = (-100, -200)
        links.new(tex_norm.outputs['Color'], norm_map.inputs['Color'])
        links.new(norm_map.outputs['Normal'], bsdf.inputs['Normal'])
        
    if os.path.exists(rough_path):
        tex_rough = nodes.new(type='ShaderNodeTexImage')
        tex_rough.image = bpy.data.images.load(rough_path)
        tex_rough.image.colorspace_settings.name = 'Non-Color'
        tex_rough.location = (-400, 50)
        links.new(tex_rough.outputs['Color'], bsdf.inputs['Roughness'])
    else:
        bsdf.inputs['Roughness'].default_value = 0.4

    if os.path.exists(metal_path):
        tex_metal = nodes.new(type='ShaderNodeTexImage')
        tex_metal.image = bpy.data.images.load(metal_path)
        tex_metal.image.colorspace_settings.name = 'Non-Color'
        tex_metal.location = (-400, -80)
        links.new(tex_metal.outputs['Color'], bsdf.inputs['Metallic'])
    else:
        bsdf.inputs['Metallic'].default_value = metal_tint
        
    return mat

# --- Build Altar Stage ---
# Basalt Floor
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
floor = bpy.context.active_object
floor.name = "Basalt_Altar_Floor"
floor_mat = bpy.data.materials.new("Basalt_Stone")
floor_mat.use_nodes = True
fnodes = floor_mat.node_tree.nodes
fnodes.clear()
f_out = fnodes.new(type='ShaderNodeOutputMaterial')
f_bsdf = fnodes.new(type='ShaderNodeBsdfPrincipled')
f_bsdf.inputs['Base Color'].default_value = (0.045, 0.042, 0.045, 1.0)
f_bsdf.inputs['Roughness'].default_value = 0.28
f_bsdf.inputs['Metallic'].default_value = 0.25
floor_mat.node_tree.links.new(f_bsdf.outputs['BSDF'], f_out.inputs['Surface'])
floor.data.materials.append(floor_mat)

# Columns
def create_pillar(x, y, h=10.0, r=0.8):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x, y, h/2))
    col = bpy.context.active_object
    col.name = f"Pillar_{x}_{y}"
    cmat = bpy.data.materials.new(f"PillarMat_{x}_{y}")
    cmat.use_nodes = True
    cbsdf = cmat.node_tree.nodes["Principled BSDF"]
    cbsdf.inputs['Base Color'].default_value = (0.06, 0.055, 0.05, 1.0)
    cbsdf.inputs['Roughness'].default_value = 0.8
    col.data.materials.append(cmat)
    return col

create_pillar(-4.5, 2.5)
create_pillar(4.5, 2.5)
create_pillar(-5.5, -4.0)
create_pillar(5.5, -4.0)

# Flaming Braziers
def create_brazier(x, y, z=1.3):
    # Pedestal
    bpy.ops.mesh.primitive_cylinder_add(radius=0.6, depth=1.3, location=(x, y, 0.65))
    ped = bpy.context.active_object
    ped.name = f"Brazier_Ped_{x}"
    pmat = bpy.data.materials.new(f"Ped_Mat_{x}")
    pmat.use_nodes = True
    pmat.node_tree.nodes["Principled BSDF"].inputs['Base Color'].default_value = (0.08, 0.06, 0.05, 1.0)
    ped.data.materials.append(pmat)
    
    # Fire Core
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.45, subdivisions=2, location=(x, y, z))
    fire = bpy.context.active_object
    fire.name = f"Fire_Core_{x}"
    fmat = bpy.data.materials.new(f"Fire_Mat_{x}")
    fmat.use_nodes = True
    fn = fmat.node_tree.nodes
    fn.clear()
    fout = fn.new(type='ShaderNodeOutputMaterial')
    f_em = fn.new(type='ShaderNodeEmission')
    f_em.inputs['Color'].default_value = (1.0, 0.45, 0.08, 1.0)
    f_em.inputs['Strength'].default_value = 50.0
    fmat.node_tree.links.new(f_em.outputs['Emission'], fout.inputs['Surface'])
    fire.data.materials.append(fmat)
    
    # Point Light
    bpy.ops.object.light_add(type='POINT', radius=0.6, location=(x, y, z + 0.3))
    light = bpy.context.active_object
    light.name = f"Brazier_Light_{x}"
    light.data.energy = 12000.0
    light.data.color = (1.0, 0.48, 0.12)
    return light

create_brazier(-3.5, 0.0, 1.3)
create_brazier(3.5, 0.0, 1.3)

# --- God of War Cinematic 3-Point Lighting ---
# Key Light (Warm Amber)
bpy.ops.object.light_add(type='POINT', radius=0.9, location=(2.0, -4.0, 3.6))
key_light = bpy.context.active_object
key_light.name = "Cinematic_Key_Light"
key_light.data.energy = 16000.0
key_light.data.color = (1.0, 0.85, 0.65)

# Cyan Rim Light (Sharp Silhouette behind Boss)
bpy.ops.object.light_add(type='SPOT', radius=1.0, location=(0.0, 3.2, 4.8))
rim_light = bpy.context.active_object
rim_light.name = "Cinematic_Rim_Light"
rim_light.data.energy = 32000.0
rim_light.data.color = (0.22, 0.80, 1.0)
rim_light.data.spot_size = math.radians(85)
rim_light.data.spot_blend = 0.4
rim_light.rotation_euler = (math.radians(130), 0, 0)

# Fill Light
bpy.ops.object.light_add(type='POINT', radius=1.4, location=(-2.4, -3.5, 2.0))
fill_light = bpy.context.active_object
fill_light.name = "Cinematic_Fill_Light"
fill_light.data.energy = 6000.0
fill_light.data.color = (1.0, 0.55, 0.22)

# --- Import Dundubhi & Orient Upright ---
bpy.ops.import_scene.fbx(filepath=MINOTAUR_FBX)
armature = bpy.data.objects.get("Armature")
armature.name = "Dundubhi_Armature"

minotaur_mesh = None
for child in armature.children:
    if child.type == 'MESH':
        minotaur_mesh = child
        break

# SCALE and ORIENT: Rotate +90 deg on X so character stands upright facing -Y
armature.scale = (0.025, 0.025, 0.025)
armature.rotation_euler = (math.radians(90), 0, 0)
armature.location = (0.0, 0.0, 1.55) # Ground feet at Z=0.0

# Apply PBR
minotaur_mat = create_pbr_material(
    name="Dundubhi_PBR",
    diff_path=os.path.join(MINOTAUR_TEX_DIR, "Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture.png"),
    norm_path=os.path.join(MINOTAUR_TEX_DIR, "Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_normal.png"),
    rough_path=os.path.join(MINOTAUR_TEX_DIR, "Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_roughness.png"),
    metal_path=os.path.join(MINOTAUR_TEX_DIR, "Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_metallic.png"),
    metal_tint=0.75,
    norm_strength=2.4
)
minotaur_mesh.data.materials.clear()
minotaur_mesh.data.materials.append(minotaur_mat)

# --- Attach Bloodforged Trident ---
bpy.ops.import_scene.fbx(filepath=TRIDENT_FBX)
trident_mesh = None
for obj in bpy.context.selected_objects:
    if obj.type == 'MESH':
        trident_mesh = obj
        break

trident_mat = create_pbr_material(
    name="Trident_PBR",
    diff_path=os.path.join(TRIDENT_TEX_DIR, "Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png"),
    norm_path=os.path.join(TRIDENT_TEX_DIR, "Meshy_AI_Bloodforged_Trident_A_1025041928_texture_normal.png"),
    rough_path=os.path.join(TRIDENT_TEX_DIR, "Meshy_AI_Bloodforged_Trident_A_1025041928_texture_roughness.png"),
    metal_path=os.path.join(TRIDENT_TEX_DIR, "Meshy_AI_Bloodforged_Trident_A_1025041928_texture_metallic.png"),
    metal_tint=0.88,
    norm_strength=2.2
)
trident_mesh.data.materials.clear()
trident_mesh.data.materials.append(trident_mat)

trident_mesh.parent = armature
trident_mesh.parent_type = 'BONE'
trident_mesh.parent_bone = 'mixamorig:RightHand'
trident_mesh.scale = (0.016, 0.016, 0.016)
trident_mesh.rotation_euler = (math.radians(90), 0, math.radians(-90))
trident_mesh.location = (0.0, 0.1, -0.4)

# --- Apply Custom God of War Keyframed Animation ---
generate_custom_animation.apply_custom_animation(armature)

# --- God of War Continuous Cinematic Camera ---
bpy.ops.object.camera_add()
cam = bpy.context.active_object
cam.name = "GoW_Cinematic_Camera"
scene.camera = cam

cam.data.lens = 42.0 # 42mm Anamorphic Cinema Lens
cam.data.sensor_width = 36.0
cam.data.dof.use_dof = True
cam.data.dof.focus_object = armature
cam.data.dof.focus_subtarget = 'mixamorig:Head'
cam.data.dof.aperture_fstop = 2.8

# Animate Camera across 150 frames with Euler rotations baked directly
for f in range(1, 151):
    scene.frame_set(f)
    t = f / 30.0
    
    # Upright Boss Coordinates:
    # Chest is around Z = 2.10m, Head is around Z = 2.75m
    if f <= 45:
        # Shot 1: Low-angle tracking up from hooves toward chest
        p = f / 45.0
        pos = Vector((0.7 - p * 0.3, -4.5 + p * 0.5, 0.85 + p * 0.45))
        target = Vector((0.0, 0.0, 1.85))
    elif f <= 86:
        # Shot 2: Craning up and orbiting as weapon hoists overhead
        p = (f - 45) / 41.0
        ease = 3*p*p - 2*p*p*p
        pos = Vector((0.4 + ease * 1.1, -4.0 + ease * 0.4, 1.3 + ease * 0.85))
        target = Vector((0.0, 0.0, 2.15 + ease * 0.4))
    elif f <= 97:
        # Shot 3: Fast dive down tracking the ground slam
        p = (f - 86) / 11.0
        pos = Vector((1.5 - p * 1.1, -3.6 - p * 0.2, 2.15 - p * 0.85))
        target = Vector((0.0, 0.0, 2.55 - p * 1.1))
    else:
        # Shot 4: Pulling back into grand wide hero shot + Roar apex
        p = (f - 97) / 53.0
        ease = 1.0 - math.exp(-p * 3.5)
        
        # Ground impact shake at frames 98-108
        shake_x = (math.sin(f * 4.5) * 0.04 * math.exp(-(f - 97) * 0.35)) if f <= 112 else 0.0
        shake_z = (math.cos(f * 5.0) * 0.05 * math.exp(-(f - 97) * 0.35)) if f <= 112 else 0.0
        
        pos = Vector((0.4 - ease * 0.4 + shake_x, -3.8 - ease * 1.6, 1.3 + ease * 0.7 + shake_z))
        target = Vector((0.0, 0.0, 1.9 + ease * 0.4))

    cam.location = pos
    
    # Calculate exact Euler rotation facing target
    direction = target - pos
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam.rotation_euler = rot_quat.to_euler()
    
    cam.keyframe_insert(data_path="location", frame=f)
    cam.keyframe_insert(data_path="rotation_euler", frame=f)

# Save Master .blend file
blend_save_path = "/Users/ashishsingh/Desktop/kaliyuga/cutscenes/kaliyuga_god_of_war_master.blend"
bpy.ops.wm.save_as_mainfile(filepath=blend_save_path)
print(f"Master project file saved to: {blend_save_path}")

# Render Frame 130 (The Roar Climax) to test preview
test_render_path = "/Users/ashishsingh/Desktop/kaliyuga/cutscenes/gow_test_frame_130.png"
scene.frame_set(130)
scene.render.filepath = test_render_path
bpy.ops.render.render(write_still=True)
print(f"Test frame 130 successfully rendered to: {test_render_path}")
