import bpy
import math
import os
from mathutils import Vector, Euler, Quaternion

print("=== GOD OF WAR CUTSCENE SETUP INITIALIZING ===")

# Reset scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# Set Render Settings (EEVEE Next, 1920x804 Anamorphic 2.39:1)
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 1920
scene.render.resolution_y = 804
scene.render.resolution_percentage = 100
scene.render.fps = 30
scene.frame_start = 1
scene.frame_end = 150

# EEVEE Next Settings
eevee = scene.eevee
if hasattr(eevee, "use_raytracing"):
    eevee.use_raytracing = True
if hasattr(eevee, "use_motion_blur"):
    scene.render.use_motion_blur = True
    scene.render.motion_blur_shutter = 0.5

# Color Management (Rich film contrast)
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'High Contrast'
scene.view_settings.exposure = 1.2

# World Environment (Deep atmospheric dark blue/smoke)
world = bpy.data.worlds.new("GoW_World")
scene.world = world
world.use_nodes = True
nodes = world.node_tree.nodes
nodes.clear()
node_bg = nodes.new(type='ShaderNodeBackground')
node_bg.inputs['Color'].default_value = (0.015, 0.02, 0.035, 1.0)
node_bg.inputs['Strength'].default_value = 0.4
node_out = nodes.new(type='ShaderNodeOutputWorld')
world.node_tree.links.new(node_bg.outputs['Background'], node_out.inputs['Surface'])

# Base Paths
ASSETS_DIR = "/Users/ashishsingh/Desktop/kaliyuga/cutscenes/assets"
MINOTAUR_FBX = os.path.join(ASSETS_DIR, "animations/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture.fbx")
MINOTAUR_TEX_DIR = os.path.join(ASSETS_DIR, "characters/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx")
TRIDENT_FBX = os.path.join(ASSETS_DIR, "weapons/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.fbx")
TRIDENT_TEX_DIR = os.path.join(ASSETS_DIR, "weapons/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx")

# --- Helper: Setup PBR Material ---
def create_pbr_material(name, diff_path, norm_path, rough_path, metal_path, metal_tint=1.0, norm_strength=1.8):
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
    
    # Diffuse
    if os.path.exists(diff_path):
        tex_diff = nodes.new(type='ShaderNodeTexImage')
        tex_diff.image = bpy.data.images.load(diff_path)
        tex_diff.location = (-400, 300)
        links.new(tex_diff.outputs['Color'], bsdf.inputs['Base Color'])
    
    # Normal
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
        
    # Roughness
    if os.path.exists(rough_path):
        tex_rough = nodes.new(type='ShaderNodeTexImage')
        tex_rough.image = bpy.data.images.load(rough_path)
        tex_rough.image.colorspace_settings.name = 'Non-Color'
        tex_rough.location = (-400, 50)
        links.new(tex_rough.outputs['Color'], bsdf.inputs['Roughness'])
    else:
        bsdf.inputs['Roughness'].default_value = 0.45

    # Metallic
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
# Polished Basalt Floor with Wet Specular Reflections
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
floor = bpy.context.active_object
floor.name = "Basalt_Altar_Floor"
floor_mat = bpy.data.materials.new("Basalt_Stone")
floor_mat.use_nodes = True
fnodes = floor_mat.node_tree.nodes
fnodes.clear()
f_out = fnodes.new(type='ShaderNodeOutputMaterial')
f_bsdf = fnodes.new(type='ShaderNodeBsdfPrincipled')
f_bsdf.inputs['Base Color'].default_value = (0.04, 0.04, 0.045, 1.0)
f_bsdf.inputs['Roughness'].default_value = 0.22 # Wet stone
f_bsdf.inputs['Metallic'].default_value = 0.15
f_bsdf.inputs['Specular IOR Level'].default_value = 0.7
floor_mat.node_tree.links.new(f_bsdf.outputs['BSDF'], f_out.inputs['Surface'])
floor.data.materials.append(floor_mat)

# Massive Ancient Pillars
def create_pillar(x, y, h=10.0, r=0.85):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x, y, h/2))
    col = bpy.context.active_object
    col.name = f"Pillar_{x}_{y}"
    cmat = bpy.data.materials.new(f"PillarMat_{x}_{y}")
    cmat.use_nodes = True
    cbsdf = cmat.node_tree.nodes["Principled BSDF"]
    cbsdf.inputs['Base Color'].default_value = (0.06, 0.055, 0.05, 1.0)
    cbsdf.inputs['Roughness'].default_value = 0.75
    col.data.materials.append(cmat)
    return col

create_pillar(-4.5, 2.0)
create_pillar(4.5, 2.0)
create_pillar(-5.5, -4.0)
create_pillar(5.5, -4.0)

# Flaming Braziers (Cast dynamic amber firelight)
def create_brazier(x, y, z=1.2):
    # Pedestal
    bpy.ops.mesh.primitive_cylinder_add(radius=0.6, depth=1.2, location=(x, y, 0.6))
    ped = bpy.context.active_object
    ped.name = f"Brazier_Ped_{x}"
    
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
    f_em.inputs['Color'].default_value = (1.0, 0.35, 0.05, 1.0)
    f_em.inputs['Strength'].default_value = 35.0
    fmat.node_tree.links.new(f_em.outputs['Emission'], fout.inputs['Surface'])
    fire.data.materials.append(fmat)
    
    # Point Light
    bpy.ops.object.light_add(type='POINT', radius=0.6, location=(x, y, z + 0.3))
    light = bpy.context.active_object
    light.name = f"Brazier_Light_{x}"
    light.data.energy = 8500.0
    light.data.color = (1.0, 0.42, 0.08)
    return light

create_brazier(-3.6, -0.5, 1.3)
create_brazier(3.6, -0.5, 1.3)

# --- God of War Cinematic 3-Point Lighting ---
# 1. Warm Key Spot (Focuses on Warlord's upper torso and horns)
bpy.ops.object.light_add(type='SPOT', radius=0.5, location=(2.2, -4.0, 3.8))
key_light = bpy.context.active_object
key_light.name = "Cinematic_Key_Light"
key_light.data.energy = 16000.0
key_light.data.color = (1.0, 0.82, 0.62) # Warm incandescent
key_light.data.spot_size = math.radians(65)
key_light.data.spot_blend = 0.4
key_light.rotation_euler = (math.radians(35), math.radians(15), math.radians(-25))

# 2. Cool Moonlight Rim Spot (Behind boss, cuts silhouette and bronze horn edges)
bpy.ops.object.light_add(type='SPOT', radius=0.8, location=(0.0, 3.5, 4.2))
rim_light = bpy.context.active_object
rim_light.name = "Cinematic_Rim_Light"
rim_light.data.energy = 28000.0
rim_light.data.color = (0.15, 0.65, 1.0) # Intense cyan/blue rim
rim_light.data.spot_size = math.radians(75)
rim_light.data.spot_blend = 0.5
rim_light.rotation_euler = (math.radians(135), 0, 0)

# 3. Ground Fill Light
bpy.ops.object.light_add(type='POINT', radius=1.5, location=(-2.0, -3.5, 1.0))
fill_light = bpy.context.active_object
fill_light.name = "Cinematic_Fill_Light"
fill_light.data.energy = 4000.0
fill_light.data.color = (0.9, 0.45, 0.15)

# --- Import & Setup Dundubhi (Minotaur Warlord) ---
bpy.ops.import_scene.fbx(filepath=MINOTAUR_FBX)
armature = bpy.data.objects.get("Armature")
armature.name = "Dundubhi_Armature"

# Find mesh
minotaur_mesh = None
for child in armature.children:
    if child.type == 'MESH':
        minotaur_mesh = child
        break

# Ground and Scale Warlord (2.55m height)
armature.scale = (0.025, 0.025, 0.025)
armature.rotation_euler = (0, 0, 0) # Facing -Y toward camera
armature.location = (0.0, 0.0, 0.0)

# Apply PBR Material to Dundubhi
minotaur_mat = create_pbr_material(
    name="Dundubhi_PBR",
    diff_path=os.path.join(MINOTAUR_TEX_DIR, "Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture.png"),
    norm_path=os.path.join(MINOTAUR_TEX_DIR, "Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_normal.png"),
    rough_path=os.path.join(MINOTAUR_TEX_DIR, "Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_roughness.png"),
    metal_path=os.path.join(MINOTAUR_TEX_DIR, "Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_metallic.png"),
    metal_tint=0.65,
    norm_strength=2.2
)
minotaur_mesh.data.materials.clear()
minotaur_mesh.data.materials.append(minotaur_mat)

# --- Import & Attach Bloodforged Trident ---
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
    metal_tint=0.85,
    norm_strength=2.0
)
trident_mesh.data.materials.clear()
trident_mesh.data.materials.append(trident_mat)

# Parent Trident to Right Hand
trident_mesh.parent = armature
trident_mesh.parent_type = 'BONE'
trident_mesh.parent_bone = 'mixamorig:RightHand'
trident_mesh.scale = (0.018, 0.018, 0.018)
trident_mesh.rotation_euler = (math.radians(90), 0, math.radians(-90))
trident_mesh.location = (0.0, 0.1, -0.4)

print("Scene setup complete. Models and PBR shaders initialized successfully.")
