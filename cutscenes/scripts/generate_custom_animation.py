import bpy
import math
from mathutils import Euler, Vector

def apply_custom_animation(armature):
    print("Applying 100% custom God of War keyframed animation...")
    
    # Ensure animation data
    if not armature.animation_data:
        armature.animation_data_create()
    
    action = bpy.data.actions.new(name="Dundubhi_GoW_Intro")
    armature.animation_data.action = action
    
    # Configure all key pose bones to XYZ Euler
    key_bones = [
        'mixamorig:Hips', 'mixamorig:Spine', 'mixamorig:Spine1', 'mixamorig:Spine2',
        'mixamorig:Neck', 'mixamorig:Head',
        'mixamorig:RightShoulder', 'mixamorig:RightArm', 'mixamorig:RightForeArm', 'mixamorig:RightHand',
        'mixamorig:LeftShoulder', 'mixamorig:LeftArm', 'mixamorig:LeftForeArm', 'mixamorig:LeftHand',
        'mixamorig:LeftUpLeg', 'mixamorig:LeftLeg', 'mixamorig:LeftFoot',
        'mixamorig:RightUpLeg', 'mixamorig:RightLeg', 'mixamorig:RightFoot'
    ]
    
    pbones = {}
    for bname in key_bones:
        pb = armature.pose.bones.get(bname)
        if pb:
            pb.rotation_mode = 'XYZ'
            pbones[bname] = pb

    # Set up keyframes across 150 frames
    for f in range(1, 151):
        t = f / 30.0 # Time in seconds
        
        # --- PHASE 1: Frames 1 - 45 (Predatory Breathing Idle) ---
        if f <= 45:
            breath = math.sin(t * 3.5) * 0.08
            
            # Stance (Squatted wide stance)
            if 'mixamorig:Hips' in pbones:
                pbones['mixamorig:Hips'].location = (0, 0, breath * 2.0 - 5.0)
                pbones['mixamorig:Hips'].rotation_euler = (math.radians(-5), math.radians(2), 0)
                
            if 'mixamorig:Spine' in pbones:
                pbones['mixamorig:Spine'].rotation_euler = (math.radians(12 + breath * 15), 0, 0)
            if 'mixamorig:Spine1' in pbones:
                pbones['mixamorig:Spine1'].rotation_euler = (math.radians(10 + breath * 20), 0, 0)
            if 'mixamorig:Spine2' in pbones:
                pbones['mixamorig:Spine2'].rotation_euler = (math.radians(8 + breath * 15), 0, 0)
                
            if 'mixamorig:Neck' in pbones:
                pbones['mixamorig:Neck'].rotation_euler = (math.radians(-8), 0, 0)
            if 'mixamorig:Head' in pbones:
                pbones['mixamorig:Head'].rotation_euler = (math.radians(-12 - breath * 10), 0, 0)
                
            # Right Arm (Holding trident resting near ground)
            if 'mixamorig:RightShoulder' in pbones:
                pbones['mixamorig:RightShoulder'].rotation_euler = (math.radians(5), 0, math.radians(10))
            if 'mixamorig:RightArm' in pbones:
                pbones['mixamorig:RightArm'].rotation_euler = (math.radians(20), math.radians(-10), math.radians(45))
            if 'mixamorig:RightForeArm' in pbones:
                pbones['mixamorig:RightForeArm'].rotation_euler = (math.radians(35), 0, math.radians(25))
            if 'mixamorig:RightHand' in pbones:
                pbones['mixamorig:RightHand'].rotation_euler = (0, 0, math.radians(-15))

            # Left Arm (Clenched fist ready at flank)
            if 'mixamorig:LeftShoulder' in pbones:
                pbones['mixamorig:LeftShoulder'].rotation_euler = (math.radians(5), 0, math.radians(-10))
            if 'mixamorig:LeftArm' in pbones:
                pbones['mixamorig:LeftArm'].rotation_euler = (math.radians(15), math.radians(10), math.radians(-40))
            if 'mixamorig:LeftForeArm' in pbones:
                pbones['mixamorig:LeftForeArm'].rotation_euler = (math.radians(40), 0, math.radians(-30))
            if 'mixamorig:LeftHand' in pbones:
                pbones['mixamorig:LeftHand'].rotation_euler = (0, 0, math.radians(20))

            # Legs (Firm wide stance)
            if 'mixamorig:LeftUpLeg' in pbones:
                pbones['mixamorig:LeftUpLeg'].rotation_euler = (math.radians(-15), math.radians(10), math.radians(-15))
            if 'mixamorig:LeftLeg' in pbones:
                pbones['mixamorig:LeftLeg'].rotation_euler = (math.radians(30), 0, 0)
            if 'mixamorig:RightUpLeg' in pbones:
                pbones['mixamorig:RightUpLeg'].rotation_euler = (math.radians(-15), math.radians(-10), math.radians(15))
            if 'mixamorig:RightLeg' in pbones:
                pbones['mixamorig:RightLeg'].rotation_euler = (math.radians(30), 0, 0)

        # --- PHASE 2: Frames 46 - 86 (The Weapon Hoist & Tension Build) ---
        elif f <= 86:
            p = (f - 45) / 41.0 # 0.0 to 1.0 smooth transition
            ease = 3*p*p - 2*p*p*p # Smooth cubic ease
            
            # Micro tension quiver near the apex (frames 75-86)
            jitter = (math.sin(f * 2.2) * 0.02) if f > 75 else 0.0
            
            if 'mixamorig:Hips' in pbones:
                pbones['mixamorig:Hips'].location = (0, 0, -5.0 + ease * 4.0)
                pbones['mixamorig:Hips'].rotation_euler = (math.radians(-5 + ease * 8), math.radians(ease * -15), 0)
                
            # Arch spine back to lift colossal weapon
            if 'mixamorig:Spine' in pbones:
                pbones['mixamorig:Spine'].rotation_euler = (math.radians(12 - ease * 25 + jitter * 40), 0, math.radians(ease * -8))
            if 'mixamorig:Spine1' in pbones:
                pbones['mixamorig:Spine1'].rotation_euler = (math.radians(10 - ease * 22), 0, math.radians(ease * -10))
            if 'mixamorig:Spine2' in pbones:
                pbones['mixamorig:Spine2'].rotation_euler = (math.radians(8 - ease * 20), 0, math.radians(ease * -12))
                
            # Head looks up with aggressive snarl
            if 'mixamorig:Neck' in pbones:
                pbones['mixamorig:Neck'].rotation_euler = (math.radians(-8 + ease * 25), 0, math.radians(ease * 10))
            if 'mixamorig:Head' in pbones:
                pbones['mixamorig:Head'].rotation_euler = (math.radians(-12 + ease * 35), 0, math.radians(ease * 12))
                
            # Right Arm hoists trident high overhead
            if 'mixamorig:RightShoulder' in pbones:
                pbones['mixamorig:RightShoulder'].rotation_euler = (math.radians(5 - ease * 20), 0, math.radians(10 - ease * 30))
            if 'mixamorig:RightArm' in pbones:
                pbones['mixamorig:RightArm'].rotation_euler = (math.radians(20 - ease * 95 + jitter * 60), math.radians(-10 + ease * 30), math.radians(45 - ease * 95))
            if 'mixamorig:RightForeArm' in pbones:
                pbones['mixamorig:RightForeArm'].rotation_euler = (math.radians(35 + ease * 45), 0, math.radians(25 - ease * 20))
            if 'mixamorig:RightHand' in pbones:
                pbones['mixamorig:RightHand'].rotation_euler = (0, 0, math.radians(-15 + ease * 30))

            # Left Arm reaches out for balance
            if 'mixamorig:LeftShoulder' in pbones:
                pbones['mixamorig:LeftShoulder'].rotation_euler = (math.radians(5), 0, math.radians(-10 - ease * 15))
            if 'mixamorig:LeftArm' in pbones:
                pbones['mixamorig:LeftArm'].rotation_euler = (math.radians(15 + ease * 20), 0, math.radians(-40 - ease * 35))
            if 'mixamorig:LeftForeArm' in pbones:
                pbones['mixamorig:LeftForeArm'].rotation_euler = (math.radians(40 - ease * 10), 0, math.radians(-30))

        # --- PHASE 3: Frames 87 - 97 (Violent Downward Slam & Ground Impact) ---
        elif f <= 97:
            p = (f - 86) / 11.0 # 11 frames of explosive acceleration
            snap = p ** 3 # Strong acceleration curve
            
            # Massive downward crunch
            if 'mixamorig:Hips' in pbones:
                pbones['mixamorig:Hips'].location = (0, 0, -1.0 - snap * 12.0)
                pbones['mixamorig:Hips'].rotation_euler = (math.radians(3 + snap * 15), math.radians(-15 + snap * 20), 0)
                
            if 'mixamorig:Spine' in pbones:
                pbones['mixamorig:Spine'].rotation_euler = (math.radians(-13 + snap * 42), 0, math.radians(-8 + snap * 12))
            if 'mixamorig:Spine1' in pbones:
                pbones['mixamorig:Spine1'].rotation_euler = (math.radians(-12 + snap * 40), 0, math.radians(-10 + snap * 14))
            if 'mixamorig:Spine2' in pbones:
                pbones['mixamorig:Spine2'].rotation_euler = (math.radians(-12 + snap * 38), 0, math.radians(-12 + snap * 15))
                
            # Head snaps down with impact
            if 'mixamorig:Neck' in pbones:
                pbones['mixamorig:Neck'].rotation_euler = (math.radians(17 - snap * 35), 0, 0)
            if 'mixamorig:Head' in pbones:
                pbones['mixamorig:Head'].rotation_euler = (math.radians(23 - snap * 45), 0, 0)
                
            # Right Arm drives weapon into the earth
            if 'mixamorig:RightShoulder' in pbones:
                pbones['mixamorig:RightShoulder'].rotation_euler = (math.radians(-15 + snap * 30), 0, math.radians(-20 + snap * 35))
            if 'mixamorig:RightArm' in pbones:
                pbones['mixamorig:RightArm'].rotation_euler = (math.radians(-75 + snap * 130), math.radians(20 - snap * 25), math.radians(-50 + snap * 115))
            if 'mixamorig:RightForeArm' in pbones:
                pbones['mixamorig:RightForeArm'].rotation_euler = (math.radians(80 - snap * 45), 0, math.radians(5 + snap * 25))

            # Left Arm slams back in counter-torque
            if 'mixamorig:LeftArm' in pbones:
                pbones['mixamorig:LeftArm'].rotation_euler = (math.radians(35 - snap * 40), 0, math.radians(-75 + snap * 35))

            # Legs bend deep to absorb shock
            if 'mixamorig:LeftLeg' in pbones:
                pbones['mixamorig:LeftLeg'].rotation_euler = (math.radians(30 + snap * 25), 0, 0)
            if 'mixamorig:RightLeg' in pbones:
                pbones['mixamorig:RightLeg'].rotation_euler = (math.radians(30 + snap * 25), 0, 0)

        # --- PHASE 4: Frames 98 - 150 (Impact Recoil, Primal Roar & Challenge Stance) ---
        else:
            p = (f - 97) / 53.0
            ease = 1.0 - math.exp(-p * 4.0) # Organic recovery curve
            roar_shake = math.sin(f * 1.8) * 0.035 if f >= 110 else 0.0
            
            # Rising into towering roar
            if 'mixamorig:Hips' in pbones:
                pbones['mixamorig:Hips'].location = (0, 0, -13.0 + ease * 10.0)
                pbones['mixamorig:Hips'].rotation_euler = (math.radians(18 - ease * 22), math.radians(5 - ease * 5), 0)
                
            # Chest arches forward and wide
            if 'mixamorig:Spine' in pbones:
                pbones['mixamorig:Spine'].rotation_euler = (math.radians(29 - ease * 38 + roar_shake * 45), 0, 0)
            if 'mixamorig:Spine1' in pbones:
                pbones['mixamorig:Spine1'].rotation_euler = (math.radians(28 - ease * 36 + roar_shake * 50), 0, 0)
            if 'mixamorig:Spine2' in pbones:
                pbones['mixamorig:Spine2'].rotation_euler = (math.radians(26 - ease * 34 + roar_shake * 45), 0, 0)
                
            # Head tilts up into massive bellowing roar
            if 'mixamorig:Neck' in pbones:
                pbones['mixamorig:Neck'].rotation_euler = (math.radians(-18 + ease * 38), 0, 0)
            if 'mixamorig:Head' in pbones:
                pbones['mixamorig:Head'].rotation_euler = (math.radians(-22 + ease * 52 + roar_shake * 60), 0, 0)
                
            # Right Arm locks weapon firmly into ground
            if 'mixamorig:RightArm' in pbones:
                pbones['mixamorig:RightArm'].rotation_euler = (math.radians(55 - ease * 25), math.radians(-5), math.radians(65 - ease * 20))
            if 'mixamorig:RightForeArm' in pbones:
                pbones['mixamorig:RightForeArm'].rotation_euler = (math.radians(35), 0, math.radians(30))

            # Left Arm flexes outward in brutal defiance
            if 'mixamorig:LeftArm' in pbones:
                pbones['mixamorig:LeftArm'].rotation_euler = (math.radians(-5 - ease * 30), 0, math.radians(-40 - ease * 25))
            if 'mixamorig:LeftForeArm' in pbones:
                pbones['mixamorig:LeftForeArm'].rotation_euler = (math.radians(50 + ease * 30), 0, math.radians(-45))

            # Legs settle back into sturdy stance
            if 'mixamorig:LeftLeg' in pbones:
                pbones['mixamorig:LeftLeg'].rotation_euler = (math.radians(55 - ease * 20), 0, 0)
            if 'mixamorig:RightLeg' in pbones:
                pbones['mixamorig:RightLeg'].rotation_euler = (math.radians(55 - ease * 20), 0, 0)

        # Keyframe all pose bones on this frame
        for pb in pbones.values():
            pb.keyframe_insert(data_path="location", frame=f)
            pb.keyframe_insert(data_path="rotation_euler", frame=f)

    print("Custom animation baked: keyframes inserted across 150 frames with Bezier curves.")
