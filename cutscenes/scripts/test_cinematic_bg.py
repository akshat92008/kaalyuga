import bpy
import math
import os
import random
from mathutils import Vector, Euler, Quaternion

print("=== SETTING UP EXTREME CINEMATIC ENVIRONMENT ===")

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# 60 FPS, 1920x804 CinemaScope 2.39:1
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1920
scene.render.resolution_y = 804
scene.render.resolution_percentage = 100
scene.render.fps = 60
scene.frame_start = 1
scene.frame_end = 300

# EEVEE Next Settings
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'High Contrast'
scene.view_settings.exposure = 1.35

# Motion blur
scene.render.use_motion_blur = True
scene.render.motion_blur_shutter = 0.55

# EEVEE Volumetrics
eevee = scene.eevee
if hasattr(eevee, "use_volumetric_shadows"):
    eevee.use_volumetric_shadows = True
if hasattr(eevee, "volumetric_tile_size"):
    eevee.volumetric_tile_size = '2' # Crisp volumetric god rays
if hasattr(eevee, "volumetric_samples"):
    eevee.volumetric_samples = 64

# World Environment with Atmospheric Volumetric Fog
world = bpy.data.worlds.new("GoW_Atmospheric_World")
scene.world = world
world.use_nodes = True
wn = world.node_tree.nodes
wn.clear()

w_out = wn.new(type='ShaderNodeOutputWorld')
w_out.location = (400, 0)

w_bg = wn.new(type='ShaderNodeBackground')
w_bg.location = (100, 100)
w_bg.inputs['Color'].default_value = (0.008, 0.012, 0.022, 1.0) # Deep midnight temple void
w_bg.inputs['Strength'].default_value = 0.35
world.node_tree.links.new(w_bg.outputs['Background'], w_out.inputs['Surface'])

# Volumetric Fog Scatter (Creates God Rays from Rim Light)
w_vol = wn.new(type='ShaderNodeVolumeScatter')
w_vol.location = (100, -100)
w_vol.inputs['Color'].default_value = (0.3, 0.45, 0.6, 1.0) # Teal-tinted atmospheric mist
w_vol.inputs['Density'].default_value = 0.012 # Balanced haze
w_vol.inputs['Anisotropy'].default_value = 0.45 # Forward scattering for god rays
world.node_tree.links.new(w_vol.outputs['Volume'], w_out.inputs['Volume'])

# Base Paths
ASSETS_DIR = "/Users/ashishsingh/Desktop/kaliyuga/cutscenes/assets"
MINOTAUR_FBX = os.path.join(ASSETS_DIR, "animations/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture.fbx")
MINOTAUR_TEX_DIR = os.path.join(ASSETS_DIR, "characters/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx")
TRIDENT_FBX = os.path.join(ASSETS_DIR, "weapons/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.fbx")
TRIDENT_TEX_DIR = os.path.join(ASSETS_DIR, "weapons/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx")

# --- Helper: Setup PBR Material ---
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

# --- Build Majestic Stepped Altar Dais ---
# Lower Tier
bpy.ops.mesh.primitive_cylinder_add(radius=6.5, depth=0.25, location=(0, 0, 0.125))
dais_lower = bpy.context.active_object
dais_lower.name = "Dais_Lower_Step"

# Upper Tier (Main Ritual Arena)
bpy.ops.mesh.primitive_cylinder_add(radius=5.2, depth=0.35, location=(0, 0, 0.425))
dais_upper = bpy.context.active_object
dais_upper.name = "Dais_Upper_Ritual_Floor"

# Glowing Asura Rune Floor Material
dais_mat = bpy.data.materials.new("Asura_Rune_Basalt")
dais_mat.use_nodes = True
dnodes = dais_mat.node_tree.nodes
dlinks = dais_mat.node_tree.links
dnodes.clear()

d_out = dnodes.new(type='ShaderNodeOutputMaterial')
d_out.location = (800, 0)
d_mix = dnodes.new(type='ShaderNodeMixShader')
d_mix.location = (550, 0)
dlinks.new(d_mix.outputs['Shader'], d_out.inputs['Surface'])

# Base Dark Basalt
d_bsdf = dnodes.new(type='ShaderNodeBsdfPrincipled')
d_bsdf.location = (200, 150)
d_bsdf.inputs['Base Color'].default_value = (0.035, 0.032, 0.038, 1.0)
d_bsdf.inputs['Roughness'].default_value = 0.22 # Polished wet stone reflection
d_bsdf.inputs['Metallic'].default_value = 0.3
dlinks.new(d_bsdf.outputs['BSDF'], d_mix.inputs[1])

# Molten Magma Rune Emission
d_emit = dnodes.new(type='ShaderNodeEmission')
d_emit.location = (200, -150)
d_emit.inputs['Color'].default_value = (1.0, 0.28, 0.04, 1.0) # Molten crimson/amber
d_emit.inputs['Strength'].default_value = 15.0 # Vibrant glow
dlinks.new(d_emit.outputs['Emission'], d_mix.inputs[2])

# Procedural Runic Pattern (Wave + Voronoi concentric rings)
tex_coord = dnodes.new(type='ShaderNodeTexCoord')
tex_coord.location = (-600, 0)
wave_rings = dnodes.new(type='ShaderNodeTexWave')
wave_rings.location = (-350, 0)
wave_rings.wave_type = 'RINGS'
wave_rings.rings_direction = 'SPHERICAL'
wave_rings.inputs['Scale'].default_value = 2.4
wave_rings.inputs['Distortion'].default_value = 4.5
dlinks.new(tex_coord.outputs['Object'], wave_rings.inputs['Vector'])

color_ramp = dnodes.new(type='ShaderNodeValToRGB')
color_ramp.location = (-100, 0)
color_ramp.color_ramp.elements[0].position = 0.68
color_ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
color_ramp.color_ramp.elements[1].position = 0.74
color_ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
dlinks.new(wave_rings.outputs['Color'], color_ramp.inputs['Fac'])
dlinks.new(color_ramp.outputs['Color'], d_mix.inputs['Fac'])

dais_upper.data.materials.append(dais_mat)
dais_lower.data.materials.append(dais_mat)

# Massive Broken Temple Ruins & Columns
def create_pillar(x, y, h=11.0, r=0.9, broken=False):
    actual_h = h * (0.6 if broken else 1.0)
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=actual_h, location=(x, y, actual_h/2))
    col = bpy.context.active_object
    col.name = f"Temple_Pillar_{x}_{y}"
    pmat = bpy.data.materials.new(f"TempleStone_{x}_{y}")
    pmat.use_nodes = True
    cbsdf = pmat.node_tree.nodes["Principled BSDF"]
    cbsdf.inputs['Base Color'].default_value = (0.055, 0.05, 0.052, 1.0)
    cbsdf.inputs['Roughness'].default_value = 0.85
    col.data.materials.append(pmat)
    
    # Capital Header Block
    if not broken:
        bpy.ops.mesh.primitive_cube_add(size=2.2, location=(x, y, actual_h))
        cap = bpy.context.active_object
        cap.scale = (1.0, 1.0, 0.3)
        cap.data.materials.append(pmat)
    return col

# 6 Imposing Monoliths framing the arena
create_pillar(-4.8, 2.2, 11.0, 0.85)
create_pillar(4.8, 2.2, 11.0, 0.85)
create_pillar(-5.8, -2.5, 9.5, 0.85, broken=True)
create_pillar(5.8, -2.5, 11.0, 0.85)
create_pillar(-3.2, 5.5, 12.0, 0.95)
create_pillar(3.2, 5.5, 12.0, 0.95)

# Broken Temple Arch in the deep background (frames the rim light)
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 5.5, 8.5))
arch_beam = bpy.context.active_object
arch_beam.scale = (8.5, 1.4, 0.8)
arch_mat = bpy.data.materials.new("ArchMat")
arch_mat.use_nodes = True
arch_mat.node_tree.nodes["Principled BSDF"].inputs['Base Color'].default_value = (0.045, 0.04, 0.045, 1.0)
arch_beam.data.materials.append(arch_mat)

# Flaming Braziers (Cast dynamic amber firelight)
def create_brazier(x, y, z=1.4):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.65, depth=1.3, location=(x, y, 0.65 + 0.35))
    ped = bpy.context.active_object
    ped.name = f"Brazier_Ped_{x}"
    
    # Fire Core
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.48, subdivisions=2, location=(x, y, z))
    fire = bpy.context.active_object
    fire.name = f"Fire_Core_{x}"
    fmat = bpy.data.materials.new(f"Fire_Mat_{x}")
    fmat.use_nodes = True
    fn = fmat.node_tree.nodes
    fn.clear()
    fout = fn.new(type='ShaderNodeOutputMaterial')
    f_em = fn.new(type='ShaderNodeEmission')
    f_em.inputs['Color'].default_value = (1.0, 0.45, 0.08, 1.0)
    f_em.inputs['Strength'].default_value = 65.0
    fmat.node_tree.links.new(f_em.outputs['Emission'], fout.inputs['Surface'])
    fire.data.materials.append(fmat)
    
    # Volumetric Point Light
    bpy.ops.object.light_add(type='POINT', radius=0.8, location=(x, y, z + 0.4))
    light = bpy.context.active_object
    light.name = f"Brazier_Light_{x}"
    light.data.energy = 16000.0
    light.data.color = (1.0, 0.48, 0.12)
    return light

create_brazier(-3.6, 0.0, 1.6)
create_brazier(3.6, 0.0, 1.6)

# --- Floating Ember Sparks (Volumetric Fire Particles) ---
random.seed(42)
ember_mat = bpy.data.materials.new("Ember_Spark_Mat")
ember_mat.use_nodes = True
en = ember_mat.node_tree.nodes
en.clear()
e_out = en.new(type='ShaderNodeOutputMaterial')
e_em = en.new(type='ShaderNodeEmission')
e_em.inputs['Color'].default_value = (1.0, 0.55, 0.1, 1.0)
e_em.inputs['Strength'].default_value = 80.0
ember_mat.node_tree.links.new(e_em.outputs['Emission'], e_out.inputs['Surface'])

for i in range(65):
    ex = random.uniform(-3.5, 3.5)
    ey = random.uniform(-4.0, 2.0)
    ez = random.uniform(0.6, 3.8)
    er = random.uniform(0.015, 0.035)
    bpy.ops.mesh.primitive_ico_sphere_add(radius=er, subdivisions=1, location=(ex, ey, ez))
    ember = bpy.context.active_object
    ember.name = f"Ember_Spark_{i}"
    ember.data.materials.append(ember_mat)

# --- God of War High-Contrast 3-Point Lighting ---
# 1. Warm Amber Key Light (Illuminates Warlord's torso, scars, and face)
bpy.ops.object.light_add(type='POINT', radius=1.0, location=(2.2, -4.2, 4.0))
key_light = bpy.context.active_object
key_light.name = "Cinematic_Key_Light"
key_light.data.energy = 22000.0
key_light.data.color = (1.0, 0.82, 0.58)

# 2. Electric Cyan Rim Light (Shoots through broken arch into volumetric fog -> God Rays)
bpy.ops.object.light_add(type='SPOT', radius=1.2, location=(0.0, 4.2, 5.6))
rim_light = bpy.context.active_object
rim_light.name = "Cinematic_Rim_Light"
rim_light.data.energy = 48000.0 # High energy to cut through volumetric fog
rim_light.data.color = (0.16, 0.78, 1.0)
rim_light.data.spot_size = math.radians(75)
rim_light.data.spot_blend = 0.5
rim_light.rotation_euler = (math.radians(138), 0, 0)

# 3. Ground Molten Uplight (Flares upward from the ritual runes)
bpy.ops.object.light_add(type='POINT', radius=1.8, location=(0.0, -0.5, 0.6))
uplight = bpy.context.active_object
uplight.name = "Altar_Rune_Uplight"
uplight.data.energy = 7500.0
uplight.data.color = (1.0, 0.25, 0.05)

# --- Import Dundubhi & Orient Upright ---
bpy.ops.import_scene.fbx(filepath=MINOTAUR_FBX)
armature = bpy.data.objects.get("Armature")
armature.name = "Dundubhi_Armature"

minotaur_mesh = None
for child in armature.children:
    if child.type == 'MESH':
        minotaur_mesh = child
        break

armature.scale = (0.025, 0.025, 0.025)
armature.rotation_euler = (math.radians(90), 0, 0)
armature.location = (0.0, 0.0, 1.90) # Grounded on top of the 0.35m altar dais

# Apply PBR
minotaur_mat = create_pbr_material(
    name="Dundubhi_PBR",
    diff_path=os.path.join(MINOTAUR_TEX_DIR, "Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture.png"),
    norm_path=os.path.join(MINOTAUR_TEX_DIR, "Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_normal.png"),
    rough_path=os.path.join(MINOTAUR_TEX_DIR, "Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_roughness.png"),
    metal_path=os.path.join(MINOTAUR_TEX_DIR, "Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_metallic.png"),
    metal_tint=0.8,
    norm_strength=2.5
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
    metal_tint=0.9,
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

# Camera (45mm Anamorphic Lens, Shallow DoF, Bokeh)
bpy.ops.object.camera_add()
cam = bpy.context.active_object
cam.name = "GoW_Cinema_Cam"
scene.camera = cam

cam.data.lens = 45.0
cam.data.sensor_width = 36.0
cam.data.dof.use_dof = True
cam.data.dof.focus_object = armature
cam.data.dof.focus_subtarget = 'mixamorig:Head'
cam.data.dof.aperture_fstop = 2.4 # Creamy cinematic bokeh on background ruins

# Test Camera Position: Hero Shot
pos = Vector((0.0, -4.6, 2.3))
target = Vector((0.0, 0.0, 2.45))
cam.location = pos
cam.rotation_euler = (target - pos).to_track_quat('-Z', 'Y').to_euler()

# Render Still Preview
out_preview = "/Users/ashishsingh/Desktop/kaliyuga/cutscenes/gow_extreme_cinematic_preview.png"
scene.render.filepath = out_preview
bpy.ops.render.render(write_still=True)
print(f"Extremely cinematic preview successfully rendered to: {out_preview}")
