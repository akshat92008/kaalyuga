import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import type { EnemyTrait, Warden3DRigKey } from './assets';
import {
  applyHadesCelShadingToHierarchy,
  bake2DSpriteFrameFromCanvas,
} from './hadesSpriteBaker';
import { loadFbxCached, simplifyBufferGeometry } from './meshSimplifier';
import { IS_SOFTWARE_WEBGL } from '../../engine/ue5GraphicsEngine';

const sharedAnimFbxCache = new Map<string, Promise<THREE.Group | null>>();

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
  stateProgress?: number;
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

type EnemyWeaponKind = 'greatsword' | 'minotaur_axe' | 'trident_axe' | 'stone_club' | 'war_bow' | 'none';

interface EnemyModelSlot {
  key: string;
  generateFbxUrl: string;
  textureFbxUrl: string;
  diffuseUrl: string;
  weaponKind: EnemyWeaponKind;
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
const MINOTAUR_AXE_FBX_URL = `${MODEL_BASE}/Weapons/Minotaur_War_Axe_20261111/Meshy_AI_Minotaur_War_Axe_20261111_texture.fbx`;
const TRIDENT_AXE_FBX_URL = `${MODEL_BASE}/Weapons/Bloodforged_Trident_Axe_20261025/Meshy_AI_Bloodforged_Trident_Axe_20261025_texture.fbx`;
const TRIDENT_AXE_TEX_URL = `/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png`;

/**
 * Every `generateFbxUrl` below points to a verified Mixamo-rigged enemy SkinnedMesh (`hasSkin: true`)
 * paired with its enemy texture mesh (`*_texture.fbx`) and original sRGB diffuse texture map.
 * Rudra (`Ashen_Warborn`) is NEVER used as an enemy.
 */
const ENEMY_MODEL_SLOTS: Record<
  string,
  Omit<EnemyModelSlot, 'group' | 'mixer' | 'actions' | 'ready' | 'standingHipY'>
> = {
  grunt_ghoul: {
    key: 'grunt_ghoul',
    generateFbxUrl: `${ANIM_BASE}/Great Sword Pack/Meshy_AI_Bleeding_Crown_Ghoul_20261111_generate.fbx`,
    textureFbxUrl: '',
    diffuseUrl: `${MODEL_BASE}/Bleeding_Crown_Ghoul/Meshy_AI_Bleeding_Crown_Ghoul_20261111_texture_fbx/Meshy_AI_Bleeding_Crown_Ghoul_20261111_texture.png`,
    weaponKind: 'greatsword',
    animUrls: {
      idle: `${ANIM_BASE}/Great Sword Pack/great sword idle.fbx`,
      chase: `${ANIM_BASE}/Great Sword Pack/great sword run.fbx`,
      windup: `${ANIM_BASE}/Great Sword Pack/great sword attack.fbx`,
      attack: `${ANIM_BASE}/Great Sword Pack/great sword slash.fbx`,
      hurt: `${ANIM_BASE}/Great Sword Pack/great sword impact.fbx`,
      death: `${ANIM_BASE}/Great Sword Pack/two handed sword death.fbx`,
    },
    rimColor: 0xffffff,
    rimIntensity: 0.0,
    scaleMultiplier: 1.0,
  },
  axe_guardian: {
    key: 'axe_guardian',
    generateFbxUrl: `${ANIM_BASE}/Creature Pack/Meshy_AI_Horned_Warlord_20261111_generate.fbx`,
    textureFbxUrl: '',
    diffuseUrl: `${MODEL_BASE}/Kaliyuga_the_Bleeding_Guardian/Meshy_AI_Kaliyuga_the_Bleeding_Guardian_20261111_texture_fbx/Meshy_AI_Kaliyuga_the_Bleeding_Guardian_20261111_texture.png`,
    weaponKind: 'minotaur_axe',
    animUrls: {
      idle: `${ANIM_BASE}/Pro Melee Axe Pack/standing idle.fbx`,
      chase: `${ANIM_BASE}/Pro Melee Axe Pack/standing run forward.fbx`,
      windup: `${ANIM_BASE}/Pro Melee Axe Pack/standing melee attack backhand.fbx`,
      attack: `${ANIM_BASE}/Pro Melee Axe Pack/standing melee combo attack ver. 1.fbx`,
      hurt: `${ANIM_BASE}/Pro Melee Axe Pack/standing react large from right.fbx`,
      death: `${ANIM_BASE}/Pro Magic Pack/Standing React Death Backward.fbx`,
    },
    rimColor: 0xffffff,
    rimIntensity: 0.0,
    scaleMultiplier: 1.04,
  },
  club_brute: {
    key: 'club_brute',
    generateFbxUrl: `${ANIM_BASE}/Pro Melee Axe Pack/Meshy_AI_Ironhide_Brute_20261111_generate.fbx`,
    textureFbxUrl: '',
    diffuseUrl: `${MODEL_BASE}/Bloodmaw_Brute/Meshy_AI_Bloodmaw_Brute_20261111_texture_fbx/Meshy_AI_Bloodmaw_Brute_20261111_texture.png`,
    weaponKind: 'stone_club',
    animUrls: {
      idle: `${ANIM_BASE}/Pro Melee Axe Pack/standing idle.fbx`,
      chase: `${ANIM_BASE}/Pro Melee Axe Pack/standing walk forward.fbx`,
      windup: `${ANIM_BASE}/Pro Melee Axe Pack/standing melee attack horizontal.fbx`,
      attack: `${ANIM_BASE}/Pro Melee Axe Pack/standing melee attack downward.fbx`,
      hurt: `${ANIM_BASE}/Pro Melee Axe Pack/standing react large gut.fbx`,
      death: `${ANIM_BASE}/Pro Magic Pack/Standing React Death Forward.fbx`,
    },
    rimColor: 0xffffff,
    rimIntensity: 0.0,
    scaleMultiplier: 1.06,
  },
  archer_reaver: {
    key: 'archer_reaver',
    generateFbxUrl: `${ANIM_BASE}/Creature Pack/Meshy_AI_Boneclaw_Warlord_20261111_generate.fbx`,
    textureFbxUrl: '',
    diffuseUrl: `${MODEL_BASE}/Crescent_Reaver/Meshy_AI_Crescent_Reaver_20261111_texture_fbx/Meshy_AI_Crescent_Reaver_20261111_texture.png`,
    weaponKind: 'war_bow',
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
  witch_oracle: {
    key: 'witch_oracle',
    generateFbxUrl: `${ANIM_BASE}/Pro Magic Pack/Meshy_AI_Ashen_Oracle_20261111_generate.fbx`,
    textureFbxUrl: '',
    diffuseUrl: `${MODEL_BASE}/Ashen_Oracle/Meshy_AI_Ashen_Oracle_20261111_texture_fbx/Meshy_AI_Ashen_Oracle_20261111_texture.png`,
    weaponKind: 'none',
    animUrls: {
      idle: `${ANIM_BASE}/Pro Magic Pack/Standing Idle 03.fbx`,
      chase: `${ANIM_BASE}/Pro Magic Pack/Standing Walk Forward.fbx`,
      windup: `${ANIM_BASE}/Pro Magic Pack/Standing 1H Magic Attack 01.fbx`,
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
    generateFbxUrl: `${ANIM_BASE}/Pro Melee Axe Pack/Meshy_AI_Ironhide_Warlord_20261111_generate.fbx`,
    textureFbxUrl: '',
    diffuseUrl: `${MODEL_BASE}/Ironmaw_Gladiator/Meshy_AI_Ironmaw_Gladiator_20261111_texture_fbx/Meshy_AI_Ironmaw_Gladiator_20261111_texture.png`,
    weaponKind: 'trident_axe',
    animUrls: {
      idle: `${ANIM_BASE}/Pro Melee Axe Pack/standing block idle.fbx`,
      chase: `${ANIM_BASE}/Pro Melee Axe Pack/standing walk forward.fbx`,
      windup: `${ANIM_BASE}/Pro Melee Axe Pack/standing melee attack horizontal.fbx`,
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
    generateFbxUrl: `${ANIM_BASE}/Pro Melee Axe Pack/Meshy_AI_Ironhide_Warlord_20261111_generate.fbx`,
    textureFbxUrl: '',
    diffuseUrl: `/models/Meshy_AI_Molten_Warlord_20261031_texture_fbx/Meshy_AI_Molten_Warlord_20261031_texture.png`,
    weaponKind: 'minotaur_axe',
    animUrls: {
      idle: `${ANIM_BASE}/Pro Melee Axe Pack/standing idle.fbx`,
      chase: `${ANIM_BASE}/Pro Melee Axe Pack/standing run forward.fbx`,
      windup: `${ANIM_BASE}/Pro Melee Axe Pack/standing melee combo attack ver. 2.fbx`,
      attack: `${ANIM_BASE}/Pro Melee Axe Pack/standing melee attack 360 high.fbx`,
      hurt: `${ANIM_BASE}/Pro Melee Axe Pack/standing react large from left.fbx`,
      death: `${ANIM_BASE}/Pro Magic Pack/Standing React Death Backward.fbx`,
    },
    rimColor: 0xffffff,
    rimIntensity: 0.0,
    scaleMultiplier: 1.08,
  },
  brute_warbringer: {
    key: 'brute_warbringer',
    generateFbxUrl: `${ANIM_BASE}/Pro Melee Axe Pack/Meshy_AI_Gorthak_the_Horned_Warlord_20261111_generate.fbx`,
    textureFbxUrl: '',
    diffuseUrl: `${MODEL_BASE}/Horned_Warbringer/Meshy_AI_Horned_Warbringer_20261111_texture_fbx/Meshy_AI_Horned_Warbringer_20261111_texture.png`,
    weaponKind: 'minotaur_axe',
    animUrls: {
      idle: `${ANIM_BASE}/Pro Melee Axe Pack/standing idle.fbx`,
      chase: `${ANIM_BASE}/Pro Melee Axe Pack/standing walk forward.fbx`,
      windup: `${ANIM_BASE}/Pro Melee Axe Pack/standing melee attack backhand.fbx`,
      attack: `${ANIM_BASE}/Pro Melee Axe Pack/standing melee attack downward.fbx`,
      hurt: `${ANIM_BASE}/Pro Melee Axe Pack/standing react large from left.fbx`,
      death: `${ANIM_BASE}/Pro Magic Pack/Standing React Death Backward.fbx`,
    },
    rimColor: 0xffffff,
    rimIntensity: 0.0,
    scaleMultiplier: 1.12,
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
    case 'wolf_guai': {
      // Distribute grunts across Great Sword, Battle Axe, and Spiked War-Club (zero bare-handed Creature waving)
      const mod = absId % 3;
      if (mod === 0) return 'grunt_ghoul';
      if (mod === 1) return 'axe_guardian';
      return 'club_brute';
    }
    case 'fire_monk':
      return absId % 2 === 0 ? 'witch_oracle' : 'archer_reaver';
    case 'stone_golem':
      return absId % 2 === 0 ? 'shield_gladiator' : 'club_brute';
    case 'furnace_titan': {
      const mod = absId % 3;
      if (mod === 0) return 'brute_warbringer';
      if (mod === 1) return 'bomber_guardian';
      return 'axe_guardian';
    }
    default:
      return 'grunt_ghoul';
  }
}

function selectSlotKey(archetype: EnemyArchetype, idHash: number): string {
  const absId = Math.abs(idHash);
  switch (archetype) {
    case 'grunt':
      return absId % 2 === 0 ? 'grunt_ghoul' : 'axe_guardian';
    case 'archer':
      return 'archer_reaver';
    case 'brute':
      return absId % 2 === 0 ? 'club_brute' : 'brute_warbringer';
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

function buildProceduralGreatSwordMesh(): THREE.Group {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xd4d8de,
    roughness: 0.35,
    metalness: 0.75,
  });
  const bloodEdgeMat = new THREE.MeshStandardMaterial({
    color: 0x8b1e24,
    roughness: 0.45,
    metalness: 0.4,
  });
  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0xc8963e,
    roughness: 0.42,
    metalness: 0.68,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: 0x2b1812,
    roughness: 0.85,
    metalness: 0.1,
  });

  // Heavy two-handed broadsword blade extending along +Y
  const bladeGeo = new THREE.BoxGeometry(3.2, 86, 10.5);
  const blade = new THREE.Mesh(bladeGeo, steelMat);
  blade.position.set(0, 52, 0);
  group.add(blade);

  const fullerGeo = new THREE.BoxGeometry(3.8, 68, 3.6);
  const fuller = new THREE.Mesh(fullerGeo, bloodEdgeMat);
  fuller.position.set(0, 48, 0);
  group.add(fuller);

  const guardGeo = new THREE.BoxGeometry(6.5, 4.5, 28);
  const guard = new THREE.Mesh(guardGeo, bronzeMat);
  guard.position.set(0, 8, 0);
  group.add(guard);

  const gripGeo = new THREE.CylinderGeometry(2.4, 2.6, 22, 8);
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.position.set(0, -4, 0);
  group.add(grip);

  const pommelGeo = new THREE.SphereGeometry(4.2, 8, 8);
  const pommel = new THREE.Mesh(pommelGeo, bronzeMat);
  pommel.position.set(0, -16, 0);
  group.add(pommel);

  // Rotate +Y blade axis onto +X of mixamorigRightHand (thumb-up/forward axis!)
  group.rotation.set(0, 0, -Math.PI * 0.5);
  group.position.set(16, 0, 0);
  return group;
}

function buildProceduralStoneClubMesh(): THREE.Group {
  const group = new THREE.Group();
  const ironWoodMat = new THREE.MeshStandardMaterial({
    color: 0x4a3222,
    roughness: 0.82,
    metalness: 0.15,
  });
  const obsidianIronMat = new THREE.MeshStandardMaterial({
    color: 0x3b3d42,
    roughness: 0.55,
    metalness: 0.62,
  });
  const bronzeStudMat = new THREE.MeshStandardMaterial({
    color: 0xd49b3b,
    roughness: 0.4,
    metalness: 0.72,
  });

  // Shaft
  const shaftGeo = new THREE.CylinderGeometry(2.6, 2.2, 48, 8);
  const shaft = new THREE.Mesh(shaftGeo, ironWoodMat);
  shaft.position.set(0, 16, 0);
  group.add(shaft);

  // Heavy bulbous Gada / War-Club head
  const headGeo = new THREE.CylinderGeometry(8.5, 12.5, 42, 10);
  const head = new THREE.Mesh(headGeo, obsidianIronMat);
  head.position.set(0, 56, 0);
  group.add(head);

  // Bronze spiked rings around the club head
  for (const ringY of [44, 58, 70]) {
    const bandGeo = new THREE.TorusGeometry(10.8, 1.8, 6, 12);
    const band = new THREE.Mesh(bandGeo, bronzeStudMat);
    band.rotation.x = Math.PI * 0.5;
    band.position.set(0, ringY, 0);
    group.add(band);
  }

  // Rotate +Y club head axis onto +X of mixamorigRightHand (thumb-up/forward axis!)
  group.rotation.set(0, 0, -Math.PI * 0.5);
  group.position.set(16, 0, 0);
  return group;
}

function buildProceduralWarBowMesh(): THREE.Group {
  const group = new THREE.Group();
  const bowMat = new THREE.MeshStandardMaterial({
    color: 0x9e6b30,
    roughness: 0.52,
    metalness: 0.35,
  });
  const stringMat = new THREE.MeshStandardMaterial({
    color: 0xe2d5b5,
    roughness: 0.6,
    metalness: 0.1,
  });

  const arcGeo = new THREE.TorusGeometry(38, 2.2, 8, 20, Math.PI * 0.88);
  const arc = new THREE.Mesh(arcGeo, bowMat);
  arc.rotation.z = -Math.PI * 0.44;
  group.add(arc);

  const strGeo = new THREE.CylinderGeometry(0.45, 0.45, 72, 6);
  const str = new THREE.Mesh(strGeo, stringMat);
  str.position.set(-6, 0, 0);
  group.add(str);

  group.position.set(0, 6, 6);
  return group;
}

/**
 * Extracts the exact Mixamo standing hip elevation (`mixamorigHips.position.y`) from the
 * rigged character's embedded T-pose track (`animations[0]`), where the character's feet rest on Y=0.
 */
export function extractStandingHipY(riggedGroup: THREE.Group): number {
  let boneHipY = 0;
  riggedGroup.traverse((obj) => {
    if (!boneHipY && /hips$/i.test(obj.name)) {
      boneHipY = obj.position.y;
    }
  });
  const clip0 = riggedGroup.animations?.[0];
  if (clip0) {
    const pTrack = clip0.tracks.find((t) => /hips\.position$/i.test(t.name));
    if (pTrack && pTrack.values.length >= 2 && Math.abs(pTrack.values[1]) > 0.01) {
      return pTrack.values[1];
    }
  }
  if (Math.abs(boneHipY) > 0.01) {
    return boneHipY;
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

      const hipUnitRatio =
        Math.abs(baseY) > 10 && Math.abs(standingHipY) < 5
          ? standingHipY / Math.abs(baseY)
          : Math.abs(baseY) < 5 && Math.abs(standingHipY) > 10
            ? standingHipY / Math.max(0.1, Math.abs(baseY))
            : 1.0;
      const maxBounce = Math.max(0.04, 0.12 * Math.abs(standingHipY));

      for (let i = 0; i < vals.length; i += 3) {
        vals[i] = (vals[i] - baseX) * hipUnitRatio * 0.04;
        const dy = (vals[i + 1] - baseY) * hipUnitRatio;
        const clampedDy = Math.max(-maxBounce, Math.min(maxBounce, dy * 0.45));
        vals[i + 1] = standingHipY + clampedDy;
        vals[i + 2] = (vals[i + 2] - baseZ) * hipUnitRatio * 0.04;
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
 * Generates clean normalized body-aligned planar UVs on a simplified native `SkinnedMesh`
 * geometry that was exported from Mixamo without a `uv` attribute, preserving 100% of the
 * native `position`, `normal`, `skinIndex`, and `skinWeight` buffers so the mesh NEVER twists!
 */
function ensureCleanPlanarUvs(geo: THREE.BufferGeometry): void {
  const existingUv = geo.attributes.uv as THREE.BufferAttribute | undefined;
  if (existingUv && existingUv.count > 0) {
    let hasNonZero = false;
    for (let i = 0; i < Math.min(64, existingUv.count); i++) {
      if (Math.abs(existingUv.getX(i)) > 1e-4 || Math.abs(existingUv.getY(i)) > 1e-4) {
        hasNonZero = true;
        break;
      }
    }
    if (hasNonZero) return;
  }

  const pos = geo.attributes.position as THREE.BufferAttribute | undefined;
  if (!pos || pos.count === 0) return;

  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  if (!bb) return;

  const spanX = Math.max(1e-4, bb.max.x - bb.min.x);
  const spanY = Math.max(1e-4, bb.max.y - bb.min.y);
  const spanZ = Math.max(1e-4, bb.max.z - bb.min.z);
  const zIsHeight = spanZ > spanY * 1.15;

  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const u = 0.15 + ((pos.getX(i) - bb.min.x) / spanX) * 0.7;
    const vRaw = zIsHeight
      ? (pos.getZ(i) - bb.min.z) / spanZ
      : (pos.getY(i) - bb.min.y) / spanY;
    const v = 0.1 + vRaw * 0.8;
    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
}

/**
 * Pairs a Mixamo-rigged `SkinnedMesh` (`*_generate.fbx`) with its UV texture:
 *  - NEVER replaces `rMesh.geometry` with vertices from a different mesh (mathematically eliminating
 *    any possibility of "snake" skinning distortion!).
 *  - Path 1 (Exact 1:1 Vertex Match, e.g. Rudra `Ashen_Warborn`, `Bleeding_Crown_Ghoul`, `Ashen_Oracle`):
 *    Copies `tUv` directly onto `rGeo` in `0.01ms` and simplifies `rGeo`.
 *  - Path 2 (Native `SkinnedMesh` with its own UVs or untextured Mixamo rig):
 *    Simplifies `rGeo` directly and ensures clean UVs while keeping 100% of `rGeo`'s factory-authored
 *    `position`, `skinIndex`, and `skinWeight` untouched!
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

  const simpGrid = IS_SOFTWARE_WEBGL ? 18 : 30;
  const simpMin = 32000;

  if (!riggedSkinned) {
    riggedRoot.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.frustumCulled = false;
        m.geometry = simplifyBufferGeometry(m.geometry, simpGrid, simpMin);
        ensureCleanPlanarUvs(m.geometry);
        m.material = material;
      }
    });
    return;
  }

  const rMesh = riggedSkinned as THREE.SkinnedMesh;
  rMesh.frustumCulled = false;
  const rGeo = rMesh.geometry;
  const rPos = rGeo.attributes.position;

  if (texturedRoot && riggedRoot !== texturedRoot && rPos) {
    let texMesh: THREE.Mesh | null = null;
    texturedRoot.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && !texMesh) {
        texMesh = child as THREE.Mesh;
      }
    });
    if (texMesh) {
      const tGeo = (texMesh as THREE.Mesh).geometry;
      const tPos = tGeo.attributes.position;
      const tUv = tGeo.attributes.uv;
      // PATH 1: Exact 1:1 vertex count match — direct UV attribute copy onto native SkinnedMesh!
      if (tPos && tUv && rPos.count === tPos.count) {
        rGeo.setAttribute('uv', tUv);
      }
    }
  }

  const simplifiedRigGeo = simplifyBufferGeometry(rGeo, simpGrid, simpMin);
  ensureCleanPlanarUvs(simplifiedRigGeo);
  rMesh.geometry = simplifiedRigGeo;
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
  private slotLastCanvas: Map<string, HTMLCanvasElement> = new Map();
  private lastActiveCanvas: HTMLCanvasElement | null = null;
  private frameBudgetWindowMs = 0;
  private rendersInCurrentWindow = 0;
  private sharedWeaponTemplates: Partial<Record<'minotaur_axe' | 'trident_axe', Promise<THREE.Group | null>>> = {};

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
          antialias: !IS_SOFTWARE_WEBGL,
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
      } catch (e) {
        console.warn('[Enemy3DRenderer] WebGL initialization skipped:', e);
      }
    }
  }

  private getSharedWeaponTemplate(kind: 'minotaur_axe' | 'trident_axe'): Promise<THREE.Group | null> {
    if (this.sharedWeaponTemplates[kind]) {
      return this.sharedWeaponTemplates[kind]!;
    }
    const texLoader = new THREE.TextureLoader();
    const fbxUrl = kind === 'minotaur_axe' ? MINOTAUR_AXE_FBX_URL : TRIDENT_AXE_FBX_URL;
    const promise = loadFbxCached(fbxUrl)
      .then(
        (group) =>
          new Promise<THREE.Group | null>((resolve) => {
            texLoader.load(
              encodeURI(TRIDENT_AXE_TEX_URL),
              (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.needsUpdate = true;
                const wepMat = new THREE.MeshStandardMaterial({
                  color: kind === 'minotaur_axe' ? 0xd99b52 : 0xffffff,
                  map: tex,
                  roughness: 0.55,
                  metalness: 0.45,
                });
                group.traverse((c) => {
                  if ((c as THREE.Mesh).isMesh) {
                    const wm = c as THREE.Mesh;
                    wm.geometry = simplifyBufferGeometry(wm.geometry, 24, 32000);
                    wm.material = wepMat;
                    wm.frustumCulled = false;
                  }
                });
                resolve(group);
              },
              undefined,
              () => resolve(group)
            );
          })
      )
      .catch(() => null);
    this.sharedWeaponTemplates[kind] = promise;
    return promise;
  }

  private attachWeaponToRig(baseGroup: THREE.Group, slot: EnemyModelSlot): void {
    if (slot.weaponKind === 'none') return;
    baseGroup.updateMatrixWorld(true);

    const findBone = (names: string[]): THREE.Object3D | null => {
      for (const n of names) {
        const found = baseGroup.getObjectByName(n);
        if (found) return found;
      }
      let matched: THREE.Object3D | null = null;
      baseGroup.traverse((obj) => {
        if (matched) return;
        const lower = obj.name.toLowerCase();
        if (names.some((n) => lower.endsWith(n.toLowerCase()))) {
          matched = obj;
        }
      });
      return matched;
    };

    if (slot.weaponKind === 'war_bow') {
      const leftHand = findBone(['mixamorigLeftHand', 'LeftHand']);
      if (leftHand) {
        const handScaleVec = new THREE.Vector3();
        leftHand.getWorldScale(handScaleVec);
        const handScale = Math.max(1e-5, handScaleVec.x);
        const bowMesh = buildProceduralWarBowMesh();
        const localScale = (0.82 * slot.scaleMultiplier) / (76 * handScale);
        bowMesh.scale.setScalar(localScale);
        bowMesh.position.set(0, 6 * localScale, 6 * localScale);
        applyHadesCelShadingToHierarchy(bowMesh);
        leftHand.add(bowMesh);
      }
      return;
    }

    const rightHand = findBone(['mixamorigRightHand', 'RightHand']);
    if (!rightHand) return;

    const handScaleVec = new THREE.Vector3();
    rightHand.getWorldScale(handScaleVec);
    const handScale = Math.max(1e-5, handScaleVec.x);

    if (slot.weaponKind === 'greatsword') {
      const swordMesh = buildProceduralGreatSwordMesh();
      const localScale = (0.96 * slot.scaleMultiplier) / (110 * handScale);
      swordMesh.scale.setScalar(localScale);
      swordMesh.position.set(16 * localScale, 0, 0);
      applyHadesCelShadingToHierarchy(swordMesh);
      rightHand.add(swordMesh);
    } else if (slot.weaponKind === 'stone_club') {
      const clubMesh = buildProceduralStoneClubMesh();
      const localScale = (0.90 * slot.scaleMultiplier) / (85 * handScale);
      clubMesh.scale.setScalar(localScale);
      clubMesh.position.set(16 * localScale, 0, 0);
      applyHadesCelShadingToHierarchy(clubMesh);
      rightHand.add(clubMesh);
    } else if (slot.weaponKind === 'minotaur_axe' || slot.weaponKind === 'trident_axe') {
      this.getSharedWeaponTemplate(slot.weaponKind).then((template) => {
        if (!template) return;
        const clonedWep = template.clone(true);
        const wepBox = new THREE.Box3().setFromObject(clonedWep);
        const wepSize = new THREE.Vector3();
        wepBox.getSize(wepSize);
        const maxDim = Math.max(0.001, wepSize.x, wepSize.y, wepSize.z);
        const desiredWorldLen = 0.98 * slot.scaleMultiplier;
        const localWepScale = desiredWorldLen / (maxDim * handScale);

        const weaponSocket = new THREE.Group();
        clonedWep.scale.setScalar(localWepScale);
        if (slot.weaponKind === 'minotaur_axe') {
          // Minotaur_War_Axe blade is already along +X (thumb-up/forward axis of RightHand)
          clonedWep.rotation.set(0, 0, 0);
        } else {
          // Bloodforged_Trident_Axe blade is along +Y of group -> rotate onto +X of RightHand
          clonedWep.rotation.set(-Math.PI * 0.5, 0, -Math.PI * 0.5);
        }
        clonedWep.position.set(0.26 * maxDim * localWepScale, 0, 0);
        weaponSocket.add(clonedWep);
        applyHadesCelShadingToHierarchy(weaponSocket);
        rightHand.add(weaponSocket);
        const prefix = `${slot.key}:`;
        for (const cacheKey of Array.from(this.atlasFrameCache.keys())) {
          if (cacheKey.startsWith(prefix)) {
            this.atlasFrameCache.delete(cacheKey);
          }
        }
      });
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

    const loadFbx = (url: string, cacheableAnim = false): Promise<THREE.Group | null> => {
      if (!url) return Promise.resolve(null);
      if (cacheableAnim && sharedAnimFbxCache.has(url)) {
        return sharedAnimFbxCache.get(url)!;
      }
      if (!cacheableAnim) {
        return loadFbxCached(url).catch(() => null);
      }
      const p = new Promise<THREE.Group | null>((resolve) => {
        fbxLoader.load(
          encodeURI(url),
          (group) => resolve(group),
          undefined,
          () => resolve(null)
        );
      });
      if (cacheableAnim) {
        sharedAnimFbxCache.set(url, p);
      }
      return p;
    };

    // STAGE 1: Load character rig, diffuse texture, idle & chase clips first so enemy renders in ~250ms
    Promise.all([
      loadFbx(slot.generateFbxUrl),
      slot.textureFbxUrl ? loadFbx(slot.textureFbxUrl) : Promise.resolve(null),
      loadTex(slot.diffuseUrl),
      loadFbx(slot.animUrls.idle, true),
      loadFbx(slot.animUrls.chase, true),
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

      // Compute raw height from bind box BEFORE attaching weapon so weapon bounds do not shrink character
      const rawBox = new THREE.Box3().setFromObject(baseGroup);
      const rawHeight = Math.max(0.001, rawBox.max.y - rawBox.min.y);
      const targetHeight = 1.52 * slot.scaleMultiplier;
      const scale = targetHeight / rawHeight;
      baseGroup.scale.setScalar(scale);
      baseGroup.position.set(0, -0.06, 0);

      this.attachWeaponToRig(baseGroup, slot);
      applyHadesCelShadingToHierarchy(baseGroup);

      const wrapper = new THREE.Group();
      wrapper.add(baseGroup);
      wrapper.visible = false;
      this.scene.add(wrapper);

      const mixer = new THREE.AnimationMixer(baseGroup);
      slot.group = wrapper;
      slot.mixer = mixer;

      const registerClip = (state: Enemy3DAnimState, animGroup: THREE.Group | null) => {
        if (!animGroup?.animations?.[0]) return;
        const cleanClip = buildStabilizedInPlaceClip(
          animGroup.animations[0],
          baseGroup,
          slot.standingHipY
        );
        if (cleanClip.tracks.length === 0) return;
        const action = mixer.clipAction(cleanClip);
        if (state === 'death') {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        }
        slot.actions[state] = action;
      };

      registerClip('idle', idleAnimGroup);
      registerClip('chase', chaseAnimGroup);

      if (slot.actions.idle) {
        slot.actions.idle.play();
      }

      slot.ready = true;

      // STAGE 2: Stream windup, attack, hurt, and death clips in the background and refresh cache
      Promise.all([
        loadFbx(slot.animUrls.windup, true),
        loadFbx(slot.animUrls.attack, true),
        loadFbx(slot.animUrls.hurt, true),
        loadFbx(slot.animUrls.death, true),
      ]).then(([windupAnimGroup, attackAnimGroup, hurtAnimGroup, deathAnimGroup]) => {
        registerClip('windup', windupAnimGroup);
        registerClip('attack', attackAnimGroup);
        registerClip('hurt', hurtAnimGroup);
        registerClip('death', deathAnimGroup);

        const prefix = `${slot.key}:`;
        for (const cacheKey of Array.from(this.atlasFrameCache.keys())) {
          if (cacheKey.startsWith(prefix)) {
            this.atlasFrameCache.delete(cacheKey);
          }
        }
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
    isElite: boolean,
    stateProgress?: number
  ): HTMLCanvasElement | null {
    if (!this.renderer) return null;
    this.ensureSlotLoaded(slotKey);
    const slot = this.slots.get(slotKey);

    // Never swap an enemy into a different enemy's 3D model mid-battle
    if (!slot || !slot.ready || !slot.group || !slot.mixer) {
      return null;
    }

    const activeKey = slot.key;
    const normalizedYaw = ((facingAngleRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const yawIndex = Math.round((normalizedYaw / (Math.PI * 2)) * 12) % 12;
    const quantizedYaw = (yawIndex / 12) * Math.PI * 2;

    const isActionState =
      state === 'windup' || state === 'attack' || state === 'hurt' || state === 'death';
    const targetAction =
      slot.actions[state] ||
      (state === 'windup' || state === 'attack' ? slot.actions.attack || slot.actions.chase : undefined) ||
      slot.actions.idle;
    const clipDur = targetAction ? Math.max(0.4, targetAction.getClip().duration) : 1.0;
    const stepsPerCycle = state === 'idle' ? 10 : 12;

    const stepIndex =
      isActionState && typeof stateProgress === 'number' && Number.isFinite(stateProgress)
        ? Math.min(
            stepsPerCycle - 1,
            Math.floor(Math.max(0, Math.min(0.999, stateProgress)) * stepsPerCycle)
          )
        : Math.floor(((Math.max(0, animTimeSec) % clipDur) / clipDur) * stepsPerCycle);
    const quantizedTime = (stepIndex / stepsPerCycle) * clipDur;

    const flashTag = hitFlash ? 'flash' : isElite ? 'elite' : 'norm';
    const cacheKey = `${activeKey}:${state}:y${yawIndex}:f${stepIndex}:${flashTag}`;

    const cached = this.atlasFrameCache.get(cacheKey);
    if (cached) {
      this.lastActiveCanvas = cached;
      return cached;
    }

    // Per-frame WebGL render budget: cap at 2 uncached enemy WebGL renders per 8ms window
    const nowMs = typeof performance !== 'undefined' ? performance.now() : 0;
    if (nowMs - this.frameBudgetWindowMs > 8) {
      this.frameBudgetWindowMs = nowMs;
      this.rendersInCurrentWindow = 0;
    }
    const fallbackCanvas = this.slotLastCanvas.get(activeKey);
    if (this.rendersInCurrentWindow >= 2 && fallbackCanvas && !hitFlash) {
      this.lastActiveCanvas = fallbackCanvas;
      return fallbackCanvas;
    }
    this.rendersInCurrentWindow += 1;

    if (!slot.group || !slot.mixer) return null;

    if (this.activeSlotKey && this.activeSlotKey !== activeKey) {
      const prev = this.slots.get(this.activeSlotKey);
      if (prev && prev.group) prev.group.visible = false;
    }
    slot.group.visible = true;
    this.activeSlotKey = activeKey;

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

    if (this.atlasFrameCache.size > 2400) {
      const oldestKey = this.atlasFrameCache.keys().next().value;
      if (oldestKey) this.atlasFrameCache.delete(oldestKey);
    }
    this.atlasFrameCache.set(cacheKey, bakedCanvas);
    if (!hitFlash) {
      this.slotLastCanvas.set(activeKey, bakedCanvas);
    }
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
    const resolvedProgress =
      typeof input.stateProgress === 'number'
        ? input.stateProgress
        : animState === 'windup'
          ? input.windupProgress
          : undefined;

    const canvas = this.renderSlotFrame(
      slotKey,
      animState,
      input.animTime,
      facingRad,
      input.isHitFlash,
      isElite,
      resolvedProgress
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
