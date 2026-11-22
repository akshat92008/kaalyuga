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
    name: 'mixamorig:RightArm', axis: new THREE.Vector3(1, 0, 0), intensity: 1.0,
    profiles: {
      idle: [0, -0.015, 0], roar: [0, -0.4, -0.85, 0],
      swing1: [0, -0.95, 1.35, 0.48, 0],
      swing2: [0, -1.25, 1.52, 0.42, 0],
      swing3: [0, -0.56, 1.18, 0.16, 0],
    },
  },
  {
    name: 'mixamorig:LeftArm', axis: new THREE.Vector3(1, 0, 0), intensity: 0.82,
    profiles: {
      idle: [0, 0.015, 0], roar: [0, -0.32, -0.58, 0],
      swing1: [0, -0.49, 0.79, 0.22, 0],
      swing2: [0, -0.65, 0.91, 0.20, 0],
      swing3: [0, -0.40, 0.68, 0.15, 0],
    },
  },
  {
    name: 'mixamorig:RightForeArm', axis: new THREE.Vector3(0, 0, 1), intensity: 0.48,
    profiles: {
      idle: [0, 0.01, 0], roar: [0, 0.22, 0.32, 0],
      swing1: [0, 0.49, -0.28, -0.1, 0],
      swing2: [0, 0.64, -0.34, -0.12, 0],
      swing3: [0, 0.35, -0.34, -0.1, 0],
    },
  },
  {
    name: 'mixamorig:LeftForeArm', axis: new THREE.Vector3(0, 0, 1), intensity: 0.28,
    profiles: {
      idle: [0, -0.01, 0], roar: [0, -0.18, -0.24, 0],
      swing1: [0, -0.21, 0.31, 0.06, 0],
      swing2: [0, -0.29, 0.37, 0.08, 0],
      swing3: [0, -0.16, 0.22, 0.04, 0],
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
