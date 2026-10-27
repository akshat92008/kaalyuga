import bpy
import math
import os
import random
from mathutils import Vector, Euler

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1920
scene.render.resolution_y = 804
scene.render.fps = 60

# Clean Color Management (AgX or Standard with 0.0 exposure)
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'Medium High Contrast'
scene.view_settings.exposure = 0.0 # Neutral calibrated exposure

# Clean Atmospheric World (NO infinite fog flood)
world = bpy.data.worlds.new("GoW_World")
scene.world = world
world.use_nodes = True
wn = world.node_tree.nodes
wn.clear()
w_out = wn.new(type='ShaderNodeOutputWorld')
w_bg = wn.new(type='ShaderNodeBackground')
w_bg.inputs['Color'].default_value = (0.015, 0.018, 0.028, 1.0) # Rich midnight blue
w_bg.inputs['Strength'].default_value = 0.4
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
    bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    
    if os.path.exists(diff_path):
        tex_diff = nodes.new(type='ShaderNodeTexImage')
        tex_diff.image = bpy.data.images.load(diff_path)
        links.new(tex_diff.outputs['Color'], bsdf.inputs['Base Color'])
    
    if os.path.exists(norm_path):
        tex_norm = nodes.new(type='ShaderNodeTexImage')
        tex_norm.image = bpy.data.images.load(norm_path)
        tex_norm.image.colorspace_settings.name = 'Non-Color'
        norm_map = nodes.new(type='ShaderNodeNormalMap')
        norm_map.inputs['Strength'].default_value = norm_strength
        links.new(tex_norm.outputs['Color'], norm_map.inputs['Color'])
        links.new(norm_map.outputs['Normal'], bsdf.inputs['Normal'])
        
    if os.path.exists(rough_path):
        tex_rough = nodes.new(type='ShaderNodeTexImage')
        tex_rough.image = bpy.data.images.load(rough_path)
        tex_rough.image.colorspace_settings.name = 'Non-Color'
        links.new(tex_rough.outputs['Color'], bsdf.inputs['Roughness'])
    else:
        bsdf.inputs['Roughness'].default_value = 0.4

    if os.path.exists(metal_path):
        tex_metal = nodes.new(type='ShaderNodeTexImage')
        tex_metal.image = bpy.data.images.load(metal_path)
        tex_metal.image.colorspace_settings.name = 'Non-Color'
        links.new(tex_metal.outputs['Color'], bsdf.inputs['Metallic'])
    else:
        bsdf.inputs['Metallic'].default_value = metal_tint
        
    return mat

# --- Build Stepped Ritual Altar ---
bpy.ops.mesh.primitive_cylinder_add(radius=6.2, depth=0.25, location=(0, 0, 0.125))
dais_lower = bpy.context.active_object
bpy.ops.mesh.primitive_cylinder_add(radius=5.0, depth=0.35, location=(0, 0, 0.425))
dais_upper = bpy.context.active_object

# Glowing Asura Rune Floor
dais_mat = bpy.data.materials.new("Asura_Rune_Basalt")
dais_mat.use_nodes = True
dnodes = dais_mat.node_tree.nodes
dlinks = dais_mat.node_tree.links
dnodes.clear()

d_out = dnodes.new(type='ShaderNodeOutputMaterial')
d_mix = dnodes.new(type='ShaderNodeMixShader')
dlinks.new(d_mix.outputs['Shader'], d_out.inputs['Surface'])

d_bsdf = dnodes.new(type='ShaderNodeBsdfPrincipled')
d_bsdf.inputs['Base Color'].default_value = (0.04, 0.038, 0.042, 1.0)
d_bsdf.inputs['Roughness'].default_value = 0.22 # Polished wet stone reflection
d_bsdf.inputs['Metallic'].default_value = 0.25
dlinks.new(d_bsdf.outputs['BSDF'], d_mix.inputs[1])

d_emit = dnodes.new(type='ShaderNodeEmission')
d_emit.inputs['Color'].default_value = (1.0, 0.32, 0.05, 1.0) # Molten ember
d_emit.inputs['Strength'].default_value = 4.0 # Balanced glow (not blinding)
dlinks.new(d_emit.outputs['Emission'], d_mix.inputs[2])

tex_coord = dnodes.new(type='ShaderNodeTexCoord')
wave_rings = dnodes.new(type='ShaderNodeTexWave')
wave_rings.wave_type = 'RINGS'
wave_rings.rings_direction = 'SPHERICAL'
wave_rings.inputs['Scale'].default_value = 2.0
wave_rings.inputs['Distortion'].default_value = 3.5
dlinks.new(tex_coord.outputs['Object'], wave_rings.inputs['Vector'])

color_ramp = dnodes.new(type='ShaderNodeValToRGB')
color_ramp.color_ramp.elements[0].position = 0.72
color_ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
color_ramp.color_ramp.elements[1].position = 0.78
color_ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
dlinks.new(wave_rings.outputs['Color'], color_ramp.inputs['Fac'])
dlinks.new(color_ramp.outputs['Color'], d_mix.inputs['Fac'])

dais_upper.data.materials.append(dais_mat)
dais_lower.data.materials.append(dais_mat)

# 6 Weathered Temple Pillars
def create_pillar(x, y, h=10.5, r=0.85):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x, y, h/2))
    col = bpy.context.active_object
    pmat = bpy.data.materials.new(f"PillarMat_{x}_{y}")
    pmat.use_nodes = True
    cbsdf = pmat.node_tree.nodes["Principled BSDF"]
    cbsdf.inputs['Base Color'].default_value = (0.05, 0.045, 0.048, 1.0)
    cbsdf.inputs['Roughness'].default_value = 0.8
    col.data.materials.append(pmat)
    return col

create_pillar(-4.5, 2.2)
create_pillar(4.5, 2.2)
create_pillar(-5.5, -2.5)
create_pillar(5.5, -2.5)
create_pillar(-3.2, 5.0)
create_pillar(3.2, 5.0)

# Flaming Braziers
def create_brazier(x, y, z=1.4):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.6, depth=1.3, location=(x, y, 0.65 + 0.35))
    ped = bpy.context.active_object
    pmat = bpy.data.materials.new(f"Ped_Mat_{x}")
    pmat.use_nodes = True
    pmat.node_tree.nodes["Principled BSDF"].inputs['Base Color'].default_value = (0.07, 0.06, 0.05, 1.0)
    ped.data.materials.append(pmat)
    
    # Fire Core
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.45, subdivisions=2, location=(x, y, z))
    fire = bpy.context.active_object
    fmat = bpy.data.materials.new(f"Fire_Mat_{x}")
    fmat.use_nodes = True
    fn = fmat.node_tree.nodes
    fn.clear()
    fout = fn.new(type='ShaderNodeOutputMaterial')
    f_em = fn.new(type='ShaderNodeEmission')
    f_em.inputs['Color'].default_value = (1.0, 0.42, 0.08, 1.0)
    f_em.inputs['Strength'].default_value = 25.0
    fmat.node_tree.links.new(f_em.outputs['Emission'], fout.inputs['Surface'])
    fire.data.materials.append(fmat)
    
    # Point Light
    bpy.ops.object.light_add(type='POINT', radius=0.6, location=(x, y, z + 0.3))
    light = bpy.context.active_object
    light.name = f"Brazier_Light_{x}"
    light.data.energy = 8500.0
    light.data.color = (1.0, 0.48, 0.12)
    return light

create_brazier(-3.5, 0.0, 1.6)
create_brazier(3.5, 0.0, 1.6)

# Floating Embers (Subtle fire sparks)
random.seed(42)
ember_mat = bpy.data.materials.new("Ember_Mat")
ember_mat.use_nodes = True
en = ember_mat.node_tree.nodes
en.clear()
e_out = en.new(type='ShaderNodeOutputMaterial')
e_em = en.new(type='ShaderNodeEmission')
e_em.inputs['Color'].default_value = (1.0, 0.52, 0.1, 1.0)
e_em.inputs['Strength'].default_value = 35.0
ember_mat.node_tree.links.new(e_em.outputs['Emission'], e_out.inputs['Surface'])

for i in range(45):
    ex = random.uniform(-3.0, 3.0)
    ey = random.uniform(-3.5, 1.5)
    ez = random.uniform(0.8, 3.5)
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.02, subdivisions=1, location=(ex, ey, ez))
    ember = bpy.context.active_object
    ember.data.materials.append(ember_mat)

# --- Balanced Cinematic 3-Point Lighting ---
# Key Light (Warm Amber)
bpy.ops.object.light_add(type='POINT', radius=0.9, location=(2.0, -4.0, 3.8))
key_light = bpy.context.active_object
key_light.name = "Key_Light"
key_light.data.energy = 11000.0
key_light.data.color = (1.0, 0.85, 0.65)

# Cyan Rim Light (Sharp Horn Silhouette)
bpy.ops.object.light_add(type='SPOT', radius=1.0, location=(0.0, 3.6, 5.0))
rim_light = bpy.context.active_object
rim_light.name = "Rim_Light"
rim_light.data.energy = 22000.0
rim_light.data.color = (0.18, 0.80, 1.0)
rim_light.data.spot_size = math.radians(75)
rim_light.data.spot_blend = 0.45
rim_light.rotation_euler = (math.radians(135), 0, 0)

# Fill Light
bpy.ops.object.light_add(type='POINT', radius=1.3, location=(-2.4, -3.2, 1.8))
fill_light = bpy.context.active_object
fill_light.name = "Fill_Light"
fill_light.data.energy = 4000.0
fill_light.data.color = (0.95, 0.50, 0.20)

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
armature.location = (0.0, 0.0, 1.90)

minotaur_mat = create_pbr_material(
    name="Dundubhi_PBR",
    diff_path=os.path.join(MINOTAUR_TEX_DIR, "Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture.png"),
    norm_path=os.path.join(MINOTAUR_TEX_DIR, "Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_normal.png"),
    rough_path=os.path.join(MINOTAUR_TEX_DIR, "Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_roughness.png"),
    metal_path=os.path.join(MINOTAUR_TEX_DIR, "Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_metallic.png"),
    metal_tint=0.8,
    norm_strength=2.4
)
minotaur_mesh.data.materials.clear()
minotaur_mesh.data.materials.append(minotaur_mat)

# Attach Trident
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

# Camera
bpy.ops.object.camera_add()
cam = bpy.context.active_object
cam.name = "GoW_Cinema_Cam"
scene.camera = cam

cam.data.lens = 45.0
cam.data.sensor_width = 36.0
cam.data.dof.use_dof = True
cam.data.dof.focus_object = armature
cam.data.dof.focus_subtarget = 'mixamorig:Head'
cam.data.dof.aperture_fstop = 2.8

pos = Vector((0.0, -4.5, 2.3))
target = Vector((0.0, 0.0, 2.45))
cam.location = pos
cam.rotation_euler = (target - pos).to_track_quat('-Z', 'Y').to_euler()

out_preview = "/Users/ashishsingh/Desktop/kaliyuga/cutscenes/calibrated_cinematic_preview.png"
scene.render.filepath = out_preview
bpy.ops.render.render(write_still=True)
print(f"Calibrated preview saved to: {out_preview}")
