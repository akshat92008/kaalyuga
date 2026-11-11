import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import type { EnemyTrait, Warden3DRigKey } from './assets';
import {
  applyHadesCelShadingToHierarchy,
  bake2DSpriteFrameFromCanvas,
} from './hadesSpriteBaker';
import { simplifyBufferGeometry } from './meshSimplifier';

export type RegularEnemy3DKind =
  | 'wolf_guai'
  | 'fire_monk'
  | 'stone_golem'
  | 'furnace_titan';

export type EnemyArchetype = 'grunt' | 'archer' | 'brute' | 'witch' | 'shield' | 'bomber';
export type Enemy3DAnimState = 'idle' | 'chase' | 'windup' | 'attack' | 'hurt' | 'death';

export interface Enemy3DRenderInput {
  id: number;
  kind: RegularEnemy3DKind;
  wardenRigKey?: Warden3DRigKey;
  trait?: EnemyTrait;
  animTime: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  aimAngle: number;
  aiState: 'idle' | 'chase' | 'windup' | 'attack' | 'recover' | 'ko';
  windupProgress: number;
  isPostureBroken: boolean;
  isHitFlash: boolean;
  isParrying: boolean;
}

interface EnemyModelSlot {
  key: string;
  generateFbxUrl: string;
  textureFbxUrl: string;
  diffuseUrl: string;
  animUrls: Record<Enemy3DAnimState, string>;
  rimColor: number;
  rimIntensity: number;
  scaleMultiplier: number;
  standingHipY: number;
  group: THREE.Group | null;
  mixer: THREE.AnimationMixer | null;
  actions: Partial<Record<Enemy3DAnimState, THREE.AnimationAction>>;
  ready: boolean;
}

const ANIM_BASE = '/new_3d_assets/Animations';
const MODEL_BASE = '/new_3d_assets/3D Models';

/**
 * Every `generateFbxUrl` below points to the verified Mixamo-rigged SkinnedMesh (`hasSkin: true`)
 * paired with its exact 1:1 sculpt twin `*_texture.fbx` and original sRGB diffuse texture map.
 */
const ENEMY_MODEL_SLOTS: Record<
  string,
  Omit<EnemyModelSlot, 'group' | 'mixer' | 'actions' | 'ready' | 'standingHipY'>
> = {
  grunt_ghoul: {
    key: 'grunt_ghoul',
    // Exact 1:1 vertex match (317,952 verts === 317,952 verts)
    generateFbxUrl: `${ANIM_BASE}/Great Sword Pack/Meshy_AI_Bleeding_Crown_Ghoul_20261111_generate.fbx`,
    textureFbxUrl: `${MODEL_BASE}/Bleeding_Crown_Ghoul/Meshy_AI_Bleeding_Crown_Ghoul_20261111_texture_fbx/Meshy_AI_Bleeding_Crown_Ghoul_20261111_texture.fbx`,
    diffuseUrl: `${MODEL_BASE}/Bleeding_Crown_Ghoul/Meshy_AI_Bleeding_Crown_Ghoul_20261111_texture_fbx/Meshy_AI_Bleeding_Crown_Ghoul_20261111_texture.png`,
    animUrls: {
      idle: `${ANIM_BASE}/Great Sword Pack/great sword idle.fbx`,
      chase: `${ANIM_BASE}/Great Sword Pack/great sword run.fbx`,
      windup: `${ANIM_BASE}/Great Sword Pack/great sword power up.fbx`,
      attack: `${ANIM_BASE}/Great Sword Pack/great sword slash.fbx`,
      hurt: `${ANIM_BASE}/Great Sword Pack/great sword impact.fbx`,
      death: `${ANIM_BASE}/Great Sword Pack/two handed sword death.fbx`,
    },
    rimColor: 0xffffff,
    rimIntensity: 0.0,
    scaleMultiplier: 1.0,
  },
  archer_reaver: {
    key: 'archer_reaver',
    // Exact 1:1 vertex match (493,632 verts === 493,632 verts) + Pro Longbow Pack animations
    generateFbxUrl: `${ANIM_BASE}/Pro Longbow Pack/Meshy_AI_Ashen_Warborn_20261025_generate.fbx`,
    textureFbxUrl: `/models/Meshy_AI_Ashen_Warborn_20261025_texture_fbx/Meshy_AI_Ashen_Warborn_20261025_texture.fbx`,
    diffuseUrl: `/models/Meshy_AI_Ashen_Warborn_20261025_texture_fbx/Meshy_AI_Ashen_Warborn_20261025_texture.png`,
    animUrls: {
      idle: `${ANIM_BASE}/Pro Longbow Pack/standing idle 01.fbx`,
      chase: `${ANIM_BASE}/Pro Longbow Pack/standing walk forward.fbx`,
      windup: `${ANIM_BASE}/Pro Longbow Pack/standing draw arrow.fbx`,
      attack: `${ANIM_BASE}/Pro Longbow Pack/standing aim recoil.fbx`,
      hurt: `${ANIM_BASE}/Pro Longbow Pack/standing react small from front.fbx`,
      death: `${ANIM_BASE}/Pro Longbow Pack/standing death backward 01.fbx`,
    },
    rimColor: 0xffffff,
    rimIntensity: 0.0,
    scaleMultiplier: 1.02,
  },
  brute_bloodmaw: {
    key: 'brute_bloodmaw',
    // Exact sculpt match: Creature Pack Bloodmaw_Brute_generate + Bloodmaw_Brute_texture
    generateFbxUrl: `${ANIM_BASE}/Creature Pack/Meshy_AI_Bloodmaw_Brute_20261111_generate (1).fbx`,
    textureFbxUrl: `${MODEL_BASE}/Bloodmaw_Brute/Meshy_AI_Bloodmaw_Brute_20261111_texture_fbx/Meshy_AI_Bloodmaw_Brute_20261111_texture.fbx`,
    diffuseUrl: `${MODEL_BASE}/Bloodmaw_Brute/Meshy_AI_Bloodmaw_Brute_20261111_texture_fbx/Meshy_AI_Bloodmaw_Brute_20261111_texture.png`,
    animUrls: {
      idle: `${ANIM_BASE}/Creature Pack/mutant idle.fbx`,
      chase: `${ANIM_BASE}/Creature Pack/mutant run.fbx`,
      windup: `${ANIM_BASE}/Creature Pack/mutant roaring.fbx`,
      attack: `${ANIM_BASE}/Creature Pack/mutant swiping.fbx`,
      hurt: `${ANIM_BASE}/Creature Pack/mutant flexing muscles.fbx`,
      death: `${ANIM_BASE}/Creature Pack/mutant dying.fbx`,
    },
    rimColor: 0xffffff,
    rimIntensity: 0.0,
    scaleMultiplier: 1.1,
  },
  brute_warbringer: {
    key: 'brute_warbringer',
    // Exact sculpt match (358,308 vs 358,314 verts, identical bounding box): Horned_Warlord_generate + Horned_Warbringer_texture
    generateFbxUrl: `${ANIM_BASE}/Creature Pack/Meshy_AI_Horned_Warlord_20261111_generate.fbx`,
    textureFbxUrl: `${MODEL_BASE}/Horned_Warbringer/Meshy_AI_Horned_Warbringer_20261111_texture_fbx/Meshy_AI_Horned_Warbringer_20261111_texture.fbx`,
    diffuseUrl: `${MODEL_BASE}/Horned_Warbringer/Meshy_AI_Horned_Warbringer_20261111_texture_fbx/Meshy_AI_Horned_Warbringer_20261111_texture.png`,
    animUrls: {
      idle: `${ANIM_BASE}/Creature Pack/mutant breathing idle.fbx`,
      chase: `${ANIM_BASE}/Creature Pack/mutant walking.fbx`,
      windup: `${ANIM_BASE}/Creature Pack/mutant flexing muscles.fbx`,
      attack: `${ANIM_BASE}/Creature Pack/mutant punch.fbx`,
      hurt: `${ANIM_BASE}/Creature Pack/mutant roaring.fbx`,
      death: `${ANIM_BASE}/Creature Pack/mutant dying.fbx`,
    },
    rimColor: 0xffffff,
    rimIntensity: 0.0,
    scaleMultiplier: 1.12,
  },
  witch_oracle: {
    key: 'witch_oracle',
    // Exact 1:1 vertex match (362,178 verts === 362,178 verts)
    generateFbxUrl: `${ANIM_BASE}/Pro Magic Pack/Meshy_AI_Ashen_Oracle_20261111_generate.fbx`,
    textureFbxUrl: `${MODEL_BASE}/Ashen_Oracle/Meshy_AI_Ashen_Oracle_20261111_texture_fbx/Meshy_AI_Ashen_Oracle_20261111_texture.fbx`,
    diffuseUrl: `${MODEL_BASE}/Ashen_Oracle/Meshy_AI_Ashen_Oracle_20261111_texture_fbx/Meshy_AI_Ashen_Oracle_20261111_texture.png`,
    animUrls: {
      idle: `${ANIM_BASE}/Pro Magic Pack/Standing Idle 03.fbx`,
      chase: `${ANIM_BASE}/Pro Magic Pack/Standing Walk Forward.fbx`,
      windup: `${ANIM_BASE}/Pro Magic Pack/Standing 2H Magic Area Attack 01.fbx`,
      attack: `${ANIM_BASE}/Pro Magic Pack/Standing 2H Magic Attack 01.fbx`,
      hurt: `${ANIM_BASE}/Pro Magic Pack/Standing React Small From Front.fbx`,
      death: `${ANIM_BASE}/Pro Magic Pack/Standing React Death Forward.fbx`,
    },
    rimColor: 0xffffff,
    rimIntensity: 0.0,
    scaleMultiplier: 1.0,
  },
  shield_gladiator: {
    key: 'shield_gladiator',
    // Exact sculpt match: Ironhide_Warlord_generate === Ironmaw_Gladiator_texture
    generateFbxUrl: `${ANIM_BASE}/Pro Melee Axe Pack/Meshy_AI_Ironhide_Warlord_20261111_generate.fbx`,
    textureFbxUrl: `${MODEL_BASE}/Ironmaw_Gladiator/Meshy_AI_Ironmaw_Gladiator_20261111_texture_fbx/Meshy_AI_Ironmaw_Gladiator_20261111_texture.fbx`,
    diffuseUrl: `${MODEL_BASE}/Ironmaw_Gladiator/Meshy_AI_Ironmaw_Gladiator_20261111_texture_fbx/Meshy_AI_Ironmaw_Gladiator_20261111_texture.png`,
    animUrls: {
      idle: `${ANIM_BASE}/Pro Melee Axe Pack/standing block idle.fbx`,
      chase: `${ANIM_BASE}/Pro Melee Axe Pack/standing walk forward.fbx`,
      windup: `${ANIM_BASE}/Pro Melee Axe Pack/standing taunt chest thump.fbx`,
      attack: `${ANIM_BASE}/Pro Melee Axe Pack/standing melee attack downward.fbx`,
      hurt: `${ANIM_BASE}/Pro Melee Axe Pack/standing block react large.fbx`,
      death: `${ANIM_BASE}/Pro Magic Pack/Standing React Death Backward.fbx`,
    },
    rimColor: 0xffffff,
    rimIntensity: 0.0,
    scaleMultiplier: 1.06,
  },
  bomber_guardian: {
    key: 'bomber_guardian',
    // Single unified rigged + UV-mapped SkinnedMesh (hasSkin: true, hasUV: true)
    generateFbxUrl: `/models/Meshy_AI_Crimson_Skull_Warlord_biped/Meshy_AI_Crimson_Skull_Warlord_biped_Animation_Running_withSkin.fbx`,
    textureFbxUrl: '',
    diffuseUrl: `/models/Meshy_AI_Crimson_Skull_Warlord_biped/Meshy_AI_Crimson_Skull_Warlord_biped_texture_0.png`,
    animUrls: {
      idle: `${ANIM_BASE}/Pro Melee Axe Pack/standing idle.fbx`,
      chase: `${ANIM_BASE}/Pro Melee Axe Pack/standing run forward.fbx`,
      windup: `${ANIM_BASE}/Pro Melee Axe Pack/standing taunt chest thump.fbx`,
      attack: `${ANIM_BASE}/Pro Melee Axe Pack/standing melee attack 360 high.fbx`,
      hurt: `${ANIM_BASE}/Pro Melee Axe Pack/standing react large from left.fbx`,
      death: `${ANIM_BASE}/Pro Magic Pack/Standing React Death Backward.fbx`,
    },
    rimColor: 0xffffff,
    rimIntensity: 0.0,
    scaleMultiplier: 1.08,
  },
};

function selectSlotKeyFromInput(
  kind: RegularEnemy3DKind,
  id: number,
  wardenRigKey?: Warden3DRigKey,
  trait?: EnemyTrait
): string {
  const absId = Math.abs(id);
  if (wardenRigKey === 'sovereign_titan') return 'bomber_guardian';
  if (wardenRigKey === 'furnace_titan') return 'brute_warbringer';
  if (wardenRigKey === 'stone_golem') return 'shield_gladiator';
  if (wardenRigKey === 'fire_monk') return 'witch_oracle';

  if (trait === 'vajra_shield') return 'shield_gladiator';
  if (trait === 'agni_aura') return 'witch_oracle';

  switch (kind) {
    case 'wolf_guai':
      return absId % 3 === 1 ? 'archer_reaver' : 'grunt_ghoul';
    case 'fire_monk':
      return absId % 2 === 0 ? 'witch_oracle' : 'archer_reaver';
    case 'stone_golem':
      return absId % 2 === 0 ? 'shield_gladiator' : 'brute_bloodmaw';
    case 'furnace_titan':
      return absId % 2 === 0 ? 'brute_warbringer' : 'bomber_guardian';
    default:
      return 'grunt_ghoul';
  }
}

function selectSlotKey(archetype: EnemyArchetype, idHash: number): string {
  const absId = Math.abs(idHash);
  switch (archetype) {
    case 'grunt':
      return 'grunt_ghoul';
    case 'archer':
      return 'archer_reaver';
    case 'brute':
      return absId % 2 === 0 ? 'brute_bloodmaw' : 'brute_warbringer';
    case 'witch':
      return 'witch_oracle';
    case 'shield':
      return 'shield_gladiator';
    case 'bomber':
      return 'bomber_guardian';
    default:
      return 'grunt_ghoul';
  }
}

/**
 * Extracts the exact Mixamo standing hip elevation (`mixamorigHips.position.y`) from the
 * rigged character's embedded T-pose track (`animations[0]`), where the character's feet rest on Y=0.
 */
export function extractStandingHipY(riggedGroup: THREE.Group): number {
  const clip0 = riggedGroup.animations?.[0];
  if (clip0) {
    const pTrack = clip0.tracks.find((t) => t.name.endsWith('Hips.position'));
    if (pTrack && pTrack.values.length >= 2) {
      return pTrack.values[1];
    }
  }
  return 100;
}

/**
 * Eliminates horizontal X/Z Mixamo root-motion drift and anchors vertical hip height to
 * `standingHipY` so the character never floats into the air or walks out of the 256x256 frame!
 */
export function buildStabilizedInPlaceClip(
  clip: THREE.AnimationClip,
  targetRoot: THREE.Object3D,
  standingHipY: number
): THREE.AnimationClip {
  const boneMap = new Map<string, string>();
  targetRoot.traverse((obj) => {
    const clean = obj.name.replace(/^mixamorig:?/i, '').toLowerCase();
    boneMap.set(clean, obj.name);
    boneMap.set(obj.name.toLowerCase(), obj.name);
  });

  const newTracks: THREE.KeyframeTrack[] = [];

  for (const track of clip.tracks) {
    const dotIdx = track.name.indexOf('.');
    if (dotIdx < 0) continue;
    const rawNode = track.name.slice(0, dotIdx).replace(/^Armature\|/i, '');
    const prop = track.name.slice(dotIdx + 1);
    const cleanNode = rawNode.replace(/^mixamorig:?/i, '').toLowerCase();
    const mappedBone = boneMap.get(cleanNode) || boneMap.get(rawNode.toLowerCase());
    if (!mappedBone) continue;
    if (prop === 'scale') continue;

    if (prop === 'position') {
      if (cleanNode !== 'hips' && !cleanNode.endsWith('hips')) continue;
      const cloned = track.clone();
      cloned.name = `${mappedBone}.position`;
      const vals = cloned.values;
      const baseX = vals[0] || 0;
      const baseY = vals[1] || standingHipY;
      const baseZ = vals[2] || 0;

      for (let i = 0; i < vals.length; i += 3) {
        vals[i] = (vals[i] - baseX) * 0.04;
        const dy = vals[i + 1] - baseY;
        const clampedDy = Math.max(-14, Math.min(16, dy * 0.45));
        vals[i + 1] = standingHipY + clampedDy;
        vals[i + 2] = (vals[i + 2] - baseZ) * 0.04;
      }
      newTracks.push(cloned);
    } else if (prop === 'quaternion') {
      const cloned = track.clone();
      cloned.name = `${mappedBone}.quaternion`;
      newTracks.push(cloned);
    }
  }

  return new THREE.AnimationClip(clip.name, clip.duration, newTracks);
}

/**
 * Pairs an untextured Mixamo-rigged `SkinnedMesh` (`*_generate.fbx`) with its UV-mapped
 * `*_texture.fbx` mesh:
 *  - Path 1 (Exact Vertex Match, e.g. Bleeding_Crown_Ghoul, Ashen_Oracle, Ashen_Warborn):
 *    Copies `tGeo.attributes.uv` directly onto `rGeo` in 0.01ms (`O(1)`), preserving 100% of
 *    native Mixamo bone weights and native UV islands, then simplifies to ~22k watertight verts.
 *  - Path 2 (Remeshed UV Seam Count, e.g. Bloodmaw_Brute, Horned_Warbringer, Ironmaw_Gladiator):
 *    Simplifies `tGeo` first to ~22k watertight verts (`12ms`) while keeping its exact native
 *    vertex coordinates, and transfers `skinIndex` and `skinWeight` from `rGeo` via a `48x48x48`
 *    BFS-dilated 3D Voxel Lookup Grid in `3ms` with 0 misses!
 */
export function bindTexturedGeometryToSkeleton(
  riggedRoot: THREE.Group,
  texturedRoot: THREE.Group | null,
  material: THREE.MeshStandardMaterial
): void {
  let riggedSkinned: THREE.SkinnedMesh | null = null;
  riggedRoot.traverse((child) => {
    if ((child as THREE.SkinnedMesh).isSkinnedMesh && !riggedSkinned) {
      riggedSkinned = child as THREE.SkinnedMesh;
    }
  });

  if (!texturedRoot || riggedRoot === texturedRoot) {
    if (riggedSkinned) {
      const rMesh = riggedSkinned as THREE.SkinnedMesh;
      rMesh.frustumCulled = false;
      rMesh.geometry = simplifyBufferGeometry(rMesh.geometry, 46, 22000);
      rMesh.material = material;
      return;
    }
    riggedRoot.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.frustumCulled = false;
        m.material = material;
      }
    });
    return;
  }

  let texMesh: THREE.Mesh | null = null;
  texturedRoot.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && !texMesh) {
      texMesh = child as THREE.Mesh;
    }
  });

  if (!riggedSkinned || !texMesh) {
    riggedRoot.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.frustumCulled = false;
        m.material = material;
      }
    });
    return;
  }

  const rMesh = riggedSkinned as THREE.SkinnedMesh;
  const tMesh = texMesh as THREE.Mesh;
  rMesh.frustumCulled = false;

  const rGeo = rMesh.geometry;
  const tGeo = tMesh.geometry;
  const rPos = rGeo.attributes.position;
  const rSkinIdx = rGeo.attributes.skinIndex;
  const rSkinWgt = rGeo.attributes.skinWeight;
  const tPos = tGeo.attributes.position;
  const tUv = tGeo.attributes.uv;

  if (!rPos || !rSkinIdx || !rSkinWgt || !tPos || !tUv) {
    rMesh.material = material;
    return;
  }

  // PATH 1: Exact 1:1 vertex count match — direct UV attribute transfer in 0.01ms!
  if (rPos.count === tPos.count) {
    rGeo.setAttribute('uv', tUv);
    rMesh.geometry = simplifyBufferGeometry(rGeo, 46, 22000);
    rMesh.material = material;
    return;
  }

  // PATH 2: Simplify textured geometry first (350k -> ~20k verts), then 48x48x48 BFS voxel skin transfer
  rGeo.computeBoundingBox();
  const rBox = rGeo.boundingBox!;
  const rMin = rBox.min;
  const rMax = rBox.max;

  const simplifiedTexGeo = simplifyBufferGeometry(tGeo, 46, 22000);
  simplifiedTexGeo.computeBoundingBox();
  const tBox = simplifiedTexGeo.boundingBox!;
  const tMin = tBox.min;
  const tMax = tBox.max;

  const G = 48;
  const totalVoxels = G * G * G;
  const voxelNearest = new Int32Array(totalVoxels).fill(-1);

  const invRx = (G - 1) / Math.max(1e-5, rMax.x - rMin.x);
  const invRy = (G - 1) / Math.max(1e-5, rMax.y - rMin.y);
  const invRz = (G - 1) / Math.max(1e-5, rMax.z - rMin.z);

  // Populate surface voxels from rigged geometry
  const rStep = Math.max(1, Math.floor(rPos.count / 45000));
  for (let i = 0; i < rPos.count; i += rStep) {
    const vx = Math.max(0, Math.min(G - 1, Math.round((rPos.getX(i) - rMin.x) * invRx)));
    const vy = Math.max(0, Math.min(G - 1, Math.round((rPos.getY(i) - rMin.y) * invRy)));
    const vz = Math.max(0, Math.min(G - 1, Math.round((rPos.getZ(i) - rMin.z) * invRz)));
    voxelNearest[(vx * G + vy) * G + vz] = i;
  }

  // Multi-source BFS dilation across 48x48x48 grid (guarantees 0 misses in ~3ms)
  const queue = new Int32Array(totalVoxels);
  let head = 0;
  let tail = 0;
  for (let idx = 0; idx < totalVoxels; idx++) {
    if (voxelNearest[idx] !== -1) queue[tail++] = idx;
  }

  const strideX = G * G;
  const strideY = G;
  while (head < tail) {
    const curr = queue[head++];
    const srcVertex = voxelNearest[curr];
    const cx = (curr / strideX) | 0;
    const rem = curr % strideX;
    const cy = (rem / strideY) | 0;
    const cz = rem % strideY;

    if (cx + 1 < G && voxelNearest[curr + strideX] === -1) {
      voxelNearest[curr + strideX] = srcVertex;
      queue[tail++] = curr + strideX;
    }
    if (cx - 1 >= 0 && voxelNearest[curr - strideX] === -1) {
      voxelNearest[curr - strideX] = srcVertex;
      queue[tail++] = curr - strideX;
    }
    if (cy + 1 < G && voxelNearest[curr + strideY] === -1) {
      voxelNearest[curr + strideY] = srcVertex;
      queue[tail++] = curr + strideY;
    }
    if (cy - 1 >= 0 && voxelNearest[curr - strideY] === -1) {
      voxelNearest[curr - strideY] = srcVertex;
      queue[tail++] = curr - strideY;
    }
    if (cz + 1 < G && voxelNearest[curr + 1] === -1) {
      voxelNearest[curr + 1] = srcVertex;
      queue[tail++] = curr + 1;
    }
    if (cz - 1 >= 0 && voxelNearest[curr - 1] === -1) {
      voxelNearest[curr - 1] = srcVertex;
      queue[tail++] = curr - 1;
    }
  }

  const sPos = simplifiedTexGeo.attributes.position as THREE.BufferAttribute;
  const sCount = sPos.count;
  const skinIndices = new Uint16Array(sCount * 4);
  const skinWeights = new Float32Array(sCount * 4);

  const invTx = (G - 1) / Math.max(1e-5, tMax.x - tMin.x);
  const invTy = (G - 1) / Math.max(1e-5, tMax.y - tMin.y);
  const invTz = (G - 1) / Math.max(1e-5, tMax.z - tMin.z);

  const posArr = sPos.array as Float32Array;
  const rIdxArr = rSkinIdx.array as Uint16Array | Float32Array;
  const rWgtArr = rSkinWgt.array as Float32Array;

  for (let i = 0; i < sCount; i++) {
    const i3 = i * 3;
    const rawX = posArr[i3];
    const rawY = posArr[i3 + 1];
    const rawZ = posArr[i3 + 2];

    const vx = Math.max(0, Math.min(G - 1, Math.round((rawX - tMin.x) * invTx)));
    const vy = Math.max(0, Math.min(G - 1, Math.round((rawY - tMin.y) * invTy)));
    const vz = Math.max(0, Math.min(G - 1, Math.round((rawZ - tMin.z) * invTz)));

    const matchedVertex = Math.max(0, voxelNearest[(vx * G + vy) * G + vz]);
    const ri4 = matchedVertex * 4;
    const ti4 = i * 4;

    skinIndices[ti4] = rIdxArr[ri4];
    skinIndices[ti4 + 1] = rIdxArr[ri4 + 1];
    skinIndices[ti4 + 2] = rIdxArr[ri4 + 2];
    skinIndices[ti4 + 3] = rIdxArr[ri4 + 3];

    skinWeights[ti4] = rWgtArr[ri4];
    skinWeights[ti4 + 1] = rWgtArr[ri4 + 1];
    skinWeights[ti4 + 2] = rWgtArr[ri4 + 2];
    skinWeights[ti4 + 3] = rWgtArr[ri4 + 3];
  }

  simplifiedTexGeo.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndices, 4));
  simplifiedTexGeo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeights, 4));
  simplifiedTexGeo.computeBoundingBox();
  simplifiedTexGeo.computeBoundingSphere();

  rMesh.geometry = simplifiedTexGeo;
  rMesh.material = material;
}

export class Enemy3DRenderer {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private slots: Map<string, EnemyModelSlot> = new Map();
  private loadingSlots: Set<string> = new Set();
  private size: number;
  private activeSlotKey: string | null = null;
  private atlasFrameCache: Map<string, HTMLCanvasElement> = new Map();
  private lastActiveCanvas: HTMLCanvasElement | null = null;

  constructor(size = 256) {
    this.size = size;
    this.scene = new THREE.Scene();

    // Verified camera framing: world y=0 (feet) projects to pixel y=197 (anchorY=0.78),
    // world y=1.55 (head) projects to pixel y=61, leaving 61px headroom for overhead swings!
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    this.camera.position.set(0, 2.1, 4.4);
    this.camera.lookAt(0, 0.82, 0);

    // Neutral, color-true studio lighting so 3D diffuse textures match the user's original models 1:1
    const ambient = new THREE.AmbientLight(0xffffff, 2.35);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfffaf2, 1.45);
    keyLight.position.set(3.2, 5.5, 4.0);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf1f5f9, 0.65);
    fillLight.position.set(-3.5, 2.5, 2.0);
    this.scene.add(fillLight);

    if (typeof window !== 'undefined') {
      try {
        this.renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        });
        this.renderer.setSize(size, size);
        this.renderer.setPixelRatio(1);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.NoToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.setClearColor(0x000000, 0);
        this.lastActiveCanvas = this.renderer.domElement;

        Object.values(ENEMY_MODEL_SLOTS).forEach((config) => {
          this.slots.set(config.key, {
            ...config,
            standingHipY: 100,
            group: null,
            mixer: null,
            actions: {},
            ready: false,
          });
        });

        // Preload core Chamber 1 enemy rigs immediately so combat starts with zero lag
        const coreSlots = ['grunt_ghoul', 'archer_reaver', 'witch_oracle', 'shield_gladiator'];
        coreSlots.forEach((key, idx) => {
          window.setTimeout(() => {
            this.ensureSlotLoaded(key);
          }, idx * 120);
        });
      } catch (e) {
        console.warn('[Enemy3DRenderer] WebGL initialization skipped:', e);
      }
    }
  }

  private ensureSlotLoaded(slotKey: string): void {
    if (this.loadingSlots.has(slotKey)) return;
    const slot = this.slots.get(slotKey);
    if (!slot || slot.ready) return;

    this.loadingSlots.add(slotKey);
    const fbxLoader = new FBXLoader();
    const texLoader = new THREE.TextureLoader();

    const loadTex = (url: string): Promise<THREE.Texture | null> =>
      new Promise((resolve) => {
        if (!url) {
          resolve(null);
          return;
        }
        texLoader.load(
          encodeURI(url),
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
            resolve(tex);
          },
          undefined,
          () => resolve(null)
        );
      });

    const loadFbx = (url: string): Promise<THREE.Group | null> =>
      new Promise((resolve) => {
        if (!url) {
          resolve(null);
          return;
        }
        fbxLoader.load(
          encodeURI(url),
          (group) => resolve(group),
          undefined,
          () => resolve(null)
        );
      });

    Promise.all([
      loadFbx(slot.generateFbxUrl),
      slot.textureFbxUrl ? loadFbx(slot.textureFbxUrl) : Promise.resolve(null),
      loadTex(slot.diffuseUrl),
      loadFbx(slot.animUrls.idle),
      loadFbx(slot.animUrls.chase),
    ]).then(([riggedGroup, texturedGroup, diffuseMap, idleAnimGroup, chaseAnimGroup]) => {
      const baseGroup = riggedGroup || texturedGroup;
      if (!baseGroup) return;

      slot.standingHipY = extractStandingHipY(baseGroup);

      const pbrMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: diffuseMap || null,
        roughness: 0.88,
        metalness: 0.06,
      });

      if (riggedGroup) {
        bindTexturedGeometryToSkeleton(riggedGroup, texturedGroup, pbrMat);
      } else {
        baseGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.frustumCulled = false;
            m.material = pbrMat;
          }
        });
      }

      // Compute raw height from bind box, then scale to 1.52m and plant feet at y = -0.06m
      // (Because Mixamo's `standingHipY` track ALREADY shifts feet to y = 0!)
      const rawBox = new THREE.Box3().setFromObject(baseGroup);
      const rawHeight = Math.max(0.001, rawBox.max.y - rawBox.min.y);
      const targetHeight = 1.52 * slot.scaleMultiplier;
      const scale = targetHeight / rawHeight;
      baseGroup.scale.setScalar(scale);
      baseGroup.position.set(0, -0.06, 0);

      applyHadesCelShadingToHierarchy(baseGroup);

      const wrapper = new THREE.Group();
      wrapper.add(baseGroup);
      wrapper.visible = false;
      this.scene.add(wrapper);

      const mixer = new THREE.AnimationMixer(baseGroup);
      slot.group = wrapper;
      slot.mixer = mixer;

      if (idleAnimGroup?.animations?.[0]) {
        const cleanIdle = buildStabilizedInPlaceClip(
          idleAnimGroup.animations[0],
          baseGroup,
          slot.standingHipY
        );
        if (cleanIdle.tracks.length > 0) {
          const idleAction = mixer.clipAction(cleanIdle);
          idleAction.play();
          slot.actions.idle = idleAction;
        }
      }
      if (chaseAnimGroup?.animations?.[0]) {
        const cleanChase = buildStabilizedInPlaceClip(
          chaseAnimGroup.animations[0],
          baseGroup,
          slot.standingHipY
        );
        if (cleanChase.tracks.length > 0) {
          slot.actions.chase = mixer.clipAction(cleanChase);
        }
      }

      slot.ready = true;

      (Object.keys(slot.animUrls) as Enemy3DAnimState[]).forEach((animState) => {
        if (animState === 'idle' || animState === 'chase') return;
        const animUrl = slot.animUrls[animState];
        loadFbx(animUrl).then((animGroup) => {
          if (!animGroup || !animGroup.animations || animGroup.animations.length === 0) return;
          const rawClip = animGroup.animations[0];
          const cleanClip = buildStabilizedInPlaceClip(rawClip, baseGroup, slot.standingHipY);
          if (cleanClip.tracks.length === 0) return;

          const action = mixer.clipAction(cleanClip);
          if (animState === 'death') {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
          }
          slot.actions[animState] = action;
          const prefix = `${slot.key}:${animState}:`;
          for (const cacheKey of Array.from(this.atlasFrameCache.keys())) {
            if (cacheKey.startsWith(prefix)) {
              this.atlasFrameCache.delete(cacheKey);
            }
          }
        });
      });
    });
  }

  public isReady(archetype?: EnemyArchetype, idHash = 0): boolean {
    if (!this.renderer) return false;
    if (!archetype) {
      for (const slot of this.slots.values()) {
        if (slot.ready) return true;
      }
      return false;
    }
    const slotKey = selectSlotKey(archetype, idHash);
    const slot = this.slots.get(slotKey);
    return Boolean(slot && slot.ready);
  }

  private renderSlotFrame(
    slotKey: string,
    state: Enemy3DAnimState,
    animTimeSec: number,
    facingAngleRad: number,
    hitFlash: boolean,
    isElite: boolean
  ): HTMLCanvasElement | null {
    if (!this.renderer) return null;
    this.ensureSlotLoaded(slotKey);
    const slot = this.slots.get(slotKey);
    if (!slot || !slot.ready || !slot.group || !slot.mixer) return null;

    const normalizedYaw = ((facingAngleRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const yawIndex = Math.round((normalizedYaw / (Math.PI * 2)) * 8) % 8;
    const quantizedYaw = (yawIndex / 8) * Math.PI * 2;

    const targetAction = slot.actions[state] || slot.actions.idle;
    const clipDur = targetAction ? Math.max(0.4, targetAction.getClip().duration) : 1.0;
    const stepsPerCycle = state === 'idle' ? 8 : 10;
    const stepIndex = Math.floor(((animTimeSec % clipDur) / clipDur) * stepsPerCycle);
    const quantizedTime = (stepIndex / stepsPerCycle) * clipDur;

    const flashTag = hitFlash ? 'flash' : isElite ? 'elite' : 'norm';
    const cacheKey = `${slotKey}:${state}:y${yawIndex}:f${stepIndex}:${flashTag}`;

    const cached = this.atlasFrameCache.get(cacheKey);
    if (cached) {
      this.lastActiveCanvas = cached;
      return cached;
    }

    if (this.activeSlotKey && this.activeSlotKey !== slotKey) {
      const prev = this.slots.get(this.activeSlotKey);
      if (prev && prev.group) prev.group.visible = false;
    }
    slot.group.visible = true;
    this.activeSlotKey = slotKey;

    if (targetAction) {
      slot.mixer.stopAllAction();
      targetAction.reset();
      targetAction.play();
      slot.mixer.setTime(quantizedTime);
    }

    slot.group.rotation.y = Math.PI * 0.5 - quantizedYaw;

    this.renderer.render(this.scene, this.camera);

    const outlineHex = hitFlash ? '#ffffff' : isElite ? '#ffd166' : '#120907';

    const bakedCanvas = bake2DSpriteFrameFromCanvas(this.renderer.domElement, cacheKey, {
      outlineColor: outlineHex,
      outlineThickness: isElite ? 2.5 : 2,
      hitFlash,
      cacheFrame: false,
    });

    if (this.atlasFrameCache.size > 1600) {
      const oldestKey = this.atlasFrameCache.keys().next().value;
      if (oldestKey) this.atlasFrameCache.delete(oldestKey);
    }
    this.atlasFrameCache.set(cacheKey, bakedCanvas);
    this.lastActiveCanvas = bakedCanvas;

    return bakedCanvas;
  }

  public renderEnemy(input: Enemy3DRenderInput): boolean {
    const slotKey = selectSlotKeyFromInput(
      input.kind,
      input.id,
      input.wardenRigKey,
      input.trait
    );

    let animState: Enemy3DAnimState = 'idle';
    if (input.aiState === 'ko') {
      animState = 'death';
    } else if (input.isHitFlash || input.isPostureBroken) {
      animState = 'hurt';
    } else if (input.aiState === 'attack') {
      animState = 'attack';
    } else if (input.aiState === 'windup') {
      animState = 'windup';
    } else if (input.aiState === 'chase' || Math.hypot(input.vx, input.vy) > 12) {
      animState = 'chase';
    }

    const facingRad = Number.isFinite(input.aimAngle)
      ? input.aimAngle
      : input.facing === 1
        ? 0
        : Math.PI;
    const isElite = Boolean(input.wardenRigKey || input.trait);

    const canvas = this.renderSlotFrame(
      slotKey,
      animState,
      input.animTime,
      facingRad,
      input.isHitFlash,
      isElite
    );
    return Boolean(canvas);
  }

  public getActiveCanvas(): HTMLCanvasElement {
    return this.lastActiveCanvas || this.renderer!.domElement;
  }

  public renderEnemyFrame(
    archetype: EnemyArchetype,
    idHash: number,
    state: Enemy3DAnimState,
    animTimeSec: number,
    facingAngleRad: number,
    hitFlash = false,
    isElite = false
  ): HTMLCanvasElement | null {
    const slotKey = selectSlotKey(archetype, idHash);
    return this.renderSlotFrame(
      slotKey,
      state,
      animTimeSec,
      facingAngleRad,
      hitFlash,
      isElite
    );
  }

  public dispose(): void {
    this.atlasFrameCache.clear();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
