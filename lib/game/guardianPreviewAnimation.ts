import * as THREE from 'three';

/**
 * QA-only motion proof for an existing, genuinely skinned Mixamo-compatible
 * character. This is NOT the canonical Kala-Bhairava art or an imported
 * finished combat animation; it proves bone deformation and animation mixing.
 * The production asset remains unchanged until the owner approves the preview.
 */
export type GuardianPreviewMotion = 'idle' | 'roar' | 'swing1' | 'swing2' | 'swing3';

const POSE_TIMELINES: Record<GuardianPreviewMotion, number[]> = {
  idle: [0, 0.58, 1.16],
  roar: [0, 0.17, 0.48, 0.8],
  swing1: [0, 0.18, 0.41, 0.65, 0.78],
  swing2: [0, 0.24, 0.43, 0.61, 0.84],
  swing3: [0, 0.15, 0.34, 0.58, 0.72],
};

type BoneDescriptor = {
  name: string;
  axis: THREE.Vector3;
  intensity: number;
  profiles: Record<GuardianPreviewMotion, number[]>;
};

const PREVIEW_BONES: BoneDescriptor[] = [
  {
    name: 'mixamorig:Spine2', axis: new THREE.Vector3(0, 1, 0), intensity: 0.52,
    profiles: {
      idle: [0, 0.02, 0], roar: [0, -0.1, 0.07, 0],
      swing1: [0, -0.32, 0.48, 0.09, 0],
      swing2: [0, -0.42, 0.58, 0.18, 0],
      swing3: [0, 0.35, -0.48, -0.1, 0],
    },
  },
  {
    name: 'mixamorig:RightArm', axis: new THREE.Vector3(0, 0, 1), intensity: 1.0,
    profiles: {
      // The static FBX rests in a T-pose. Z-axis shoulder elevation
      // lowers the upper arm instead of merely twisting it around X.
      idle: [0.84, 0.88, 0.84], roar: [0.84, 0.52, 0.40, 0.84],
      swing1: [0.84, 0.22, 1.34, 1.04, 0.84],
      swing2: [0.84, 0.05, 1.48, 1.16, 0.84],
      swing3: [0.84, 1.36, 0.12, 0.56, 0.84],
    },
  },
  {
    name: 'mixamorig:LeftArm', axis: new THREE.Vector3(0, 0, 1), intensity: 1.0,
    profiles: {
      idle: [-0.76, -0.82, -0.76], roar: [-0.76, -0.42, -0.34, -0.76],
      swing1: [-0.76, -0.28, -1.17, -0.95, -0.76],
      swing2: [-0.76, -0.22, -1.22, -0.92, -0.76],
      swing3: [-0.76, -1.26, -0.32, -0.58, -0.76],
    },
  },
  {
    name: 'mixamorig:RightForeArm', axis: new THREE.Vector3(0, 0, 1), intensity: 0.72,
    profiles: {
      idle: [0.36, 0.40, 0.36], roar: [0.36, 0.45, 0.56, 0.36],
      swing1: [0.36, 0.48, -0.28, 0.25, 0.36],
      swing2: [0.36, 0.62, -0.32, 0.25, 0.36],
      swing3: [0.36, 0.52, -0.26, 0.20, 0.36],
    },
  },
  {
    name: 'mixamorig:LeftForeArm', axis: new THREE.Vector3(0, 0, 1), intensity: 0.62,
    profiles: {
      idle: [-0.32, -0.35, -0.32], roar: [-0.32, -0.48, -0.56, -0.32],
      swing1: [-0.32, -0.45, 0.25, -0.16, -0.32],
      swing2: [-0.32, -0.52, 0.30, -0.14, -0.32],
      swing3: [-0.32, -0.38, 0.22, -0.12, -0.32],
    },
  },
];

function normalizedBoneName(name: string): string {
  // Three.js FBXLoader sometimes strips Mixamo's colon separator.
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function createGuardianProofClips(root: THREE.Group): {
  clips: Record<GuardianPreviewMotion, THREE.AnimationClip>;
  animatedBones: string[];
} {
  const knownBones: THREE.Bone[] = [];
  root.traverse(obj => {
    if ((obj as THREE.Bone).isBone) knownBones.push(obj as THREE.Bone);
  });
  const clips = {} as Record<GuardianPreviewMotion, THREE.AnimationClip>;
  const animatedBones: string[] = [];
  for (const motion of Object.keys(POSE_TIMELINES) as GuardianPreviewMotion[]) {
    const times = POSE_TIMELINES[motion];
    const tracks: THREE.QuaternionKeyframeTrack[] = [];
    for (const boneInfo of PREVIEW_BONES) {
      const obj = knownBones.find(b => normalizedBoneName(b.name) === normalizedBoneName(boneInfo.name));
      if (!obj) continue;
      // Three.AnimationMixer PropertyBinding treats ':' as a namespace separator;
      // retaining Mixamo FBX's original "mixamorig:RightArm" object name makes
      // a valid animation clip that cannot actually rotate its target bone.
      // Preview-only rename does not alter skin indices, skeleton references,
      // or the underlying source FBX.
      if (obj.name.includes(':')) {
        obj.name = obj.name.replace(/:/g, '');
      }
      const rest = obj.quaternion.clone();
      const values: number[] = [];
      for (const poseValue of boneInfo.profiles[motion]) {
        const offset = new THREE.Quaternion().setFromAxisAngle(
          boneInfo.axis,
          poseValue * boneInfo.intensity,
        );
        const quat = rest.clone().multiply(offset);
        values.push(quat.x, quat.y, quat.z, quat.w);
      }
      if (values.length !== times.length * 4) {
        throw new Error('Guardian preview action/keyframe mismatch: ' + motion);
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(obj.name + '.quaternion', times, values));
      if (!animatedBones.includes(obj.name)) animatedBones.push(obj.name);
    }
    clips[motion] = new THREE.AnimationClip('guardian-proof-' + motion, times[times.length - 1], tracks);
  }
  return { clips, animatedBones };
}
