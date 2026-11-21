'use client';

import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GAME_ASSETS, type EnemyTrait, type Warden3DRigKey } from './assets';
import type { Boss3DKind, BossClipKey } from './boss3dRenderer';
import {
  applyDemonSlayerCelShadingToHierarchy,
  attachSumiInkOutlines,
  createDemonSlayerCelMaterial,
  createParashuAuraMaterial,
  liftTextureToAnimeVibrancy,
  setCelBounceTint,
  setCelHitFlash,
  setCelRimStyle,
} from './demonSlayerShader';
import {
  ARENA_THREE_SCALE_PX,
  arenaAngleToThreeYaw,
  arenaToThreeWorld,
  computeOrthoStageCameraSpec,
  stanceToAstraElement,
} from './demonSlayerVfxStage';
import {
  bindTexturedGeometryToSkeleton,
  buildStabilizedInPlaceClip,
  createProceduralIronBucklerGroup,
  createProceduralLongbowGroup,
  createProceduralDharmaChakramGroup,
  ENEMY_MODEL_SLOTS,
  extractStandingHipY,
  selectSlotKeyFromInput,
  type Enemy3DAnimState,
  type RegularEnemy3DKind,
} from './enemy3dRenderer';
import { isSoftwareWebGLRenderer, setupSharedStudioLightingRig } from './hadesSpriteBaker';
import { loadFbxCached, simplifyBufferGeometry } from './meshSimplifier';
import { Pillar3DPool } from './pillar3dMesh';
import {
  resolveRudraAnimStateAndClock,
  resolveRudraDesiredState,
  type RudraAnimState,
  type RudraRenderInput,
} from './rudra3dRenderer';
import {
  AstraCycloneVfx,
  type AstraElement,
  DashEchoPool,
  DundubhiBloodDemonArtVfx,
  HeavyWaveVfx,
  PooledSparkSystem,
  type RibbonTheme,
  SlashRibbonController,
  type SwingKind,
} from './slashRibbonVfx';
import {
  BossBloodMandalaRenderer,
  GroundFractureAndBouldersPool,
  GruntBloodArtPool,
  resolveBloodDemonArtProfile,
  SumiInkSplashPool,
} from './bloodDemonArtVfx';

// ============================================================================
// UNIFIED LIVE FULL-RESOLUTION 3D ANIME STAGE (UFOTABLE / HINOKAMI CHRONICLES)
// Renders Rudra, enemies, bosses, Savitri, 3D Chola pillars, clones, dash decoy,
// and all 3D Demon Slayer VFX in ONE live orthographic WebGL scene synced 1:1
// with the 2.5D arena camera (zero 192px/224px sprite-baker cutouts).
// ============================================================================

const RUDRA_WORLD_HEIGHT_M = 2.82;
const ENEMY_WORLD_BASE_HEIGHT_M = 2.62;
const SAVITRI_WORLD_HEIGHT_M = 2.72;
const BOSS_WORLD_HEIGHT_M: Record<'dundubhi' | 'vrikodara' | 'semi_boss', number> = {
  semi_boss: 3.72,
  dundubhi: 4.48,
  vrikodara: 4.78,
};

const RUDRA_RIGGED_FBX_URL =
  '/new_3d_assets/Animations/Pro Melee Axe Pack/Meshy_AI_Ashen_Warborn_20261025_generate.fbx';
const RUDRA_TEXTURE_FBX_URL =
  '/models/Meshy_AI_Ashen_Warborn_20261025_texture_fbx/Meshy_AI_Ashen_Warborn_20261025_texture.fbx';
const RUDRA_DIFFUSE_URL =
  '/models/Meshy_AI_Ashen_Warborn_20261025_texture_fbx/Meshy_AI_Ashen_Warborn_20261025_texture.png';
const PARASHU_WEAPON_FBX_URL =
  '/new_3d_assets/3D Models/Weapons/Bloodforged_Trident_Axe_20261025/Meshy_AI_Bloodforged_Trident_Axe_20261025_texture.fbx';
const PARASHU_DIFFUSE_URL =
  '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png';

const RUDRA_ANIM_URLS: Record<RudraAnimState, string> = {
  idle: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing idle.fbx',
  run: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing run forward.fbx',
  dash: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing run forward.fbx',
  attack1: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing melee combo attack ver. 1.fbx',
  attack2: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing melee combo attack ver. 2.fbx',
  attack3: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing melee combo attack ver. 3.fbx',
  heavy: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing melee attack downward.fbx',
  cast: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing melee attack 360 high.fbx',
  block: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing block idle.fbx',
  hurt: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing react large from left.fbx',
};

const MODEL_BASE = '/new_3d_assets/3D Models';
const MINOTAUR_AXE_FBX_URL = `${MODEL_BASE}/Weapons/Minotaur_War_Axe_20261111/Meshy_AI_Minotaur_War_Axe_20261111_texture.fbx`;
const TRIDENT_AXE_FBX_URL = `${MODEL_BASE}/Weapons/Bloodforged_Trident_Axe_20261025/Meshy_AI_Bloodforged_Trident_Axe_20261025_texture.fbx`;
const TRIDENT_AXE_TEX_URL = `/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png`;
const CRESCENT_REAVER_FBX_URL = `${MODEL_BASE}/Crescent_Reaver/Meshy_AI_Crescent_Reaver_20261111_texture_fbx/Meshy_AI_Crescent_Reaver_20261111_texture.fbx`;
const CRESCENT_REAVER_TEX_URL = `${MODEL_BASE}/Crescent_Reaver/Meshy_AI_Crescent_Reaver_20261111_texture_fbx/Meshy_AI_Crescent_Reaver_20261111_texture.png`;

function buildMutantInPlaceClip(
  clip: THREE.AnimationClip,
  targetRoot: THREE.Object3D,
  standingHipY: number,
  maxBounce: number,
  customName: string
): THREE.AnimationClip {
  const boneMap = new Map<string, string>();
  targetRoot.traverse((obj) => {
    const clean = obj.name.replace(/^mixamorig:?/i, '');
    boneMap.set(clean.toLowerCase(), obj.name);
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
      if (cleanNode !== 'hips' && cleanNode !== 'target_character') continue;
      const cloned = track.clone();
      cloned.name = `${mappedBone}.position`;
      const vals = cloned.values;
      const baseX = vals[0] || 0;
      const baseZ = vals[2] || 0;

      for (let i = 0; i < vals.length; i += 3) {
        vals[i] = (vals[i] - baseX) * 0.03;
        vals[i + 2] = (vals[i + 2] - baseZ) * 0.03;
        const dy = vals[i + 1] - standingHipY;
        const clampedDy = Math.max(-maxBounce * 0.5, Math.min(maxBounce * 0.65, dy * 0.35));
        vals[i + 1] = standingHipY + clampedDy;
      }
      newTracks.push(cloned);
    } else if (prop === 'quaternion') {
      const cloned = track.clone();
      cloned.name = `${mappedBone}.quaternion`;
      newTracks.push(cloned);
    }
  }

  return new THREE.AnimationClip(customName, clip.duration, newTracks);
}

/**
 * Clones a skinned/static hierarchy using `SkeletonUtils.clone` and creates fresh independent
 * `MeshToonMaterial` instances + crisp Sumi-e outlines so every pooled enemy has private
 * hit-flash & Blood Demon Art bounce uniforms (zero shared closure leakage).
 */
function cloneHierarchyWithIndependentCelMaterials(
  templateRoot: THREE.Object3D,
  opts: {
    rimColorHex: number;
    rimStrength: number;
    rimPower?: number;
    emissiveHex?: number;
    emissiveIntensity?: number;
    outlineHeightRatio?: number;
    outlineColorHex?: number;
    tintHex?: number;
    opacity?: number;
    transparent?: boolean;
  }
): {
  root: THREE.Group;
  celMaterials: THREE.MeshToonMaterial[];
} {
  const root = SkeletonUtils.clone(templateRoot) as THREE.Group;
  const matCache = new WeakMap<THREE.Material, THREE.MeshToonMaterial>();
  const celMaterials: THREE.MeshToonMaterial[] = [];

  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    if (mesh.userData.isInkOutline || mesh.userData.isAuraShell) return;
    mesh.userData.hasSumiOutline = false;
    mesh.frustumCulled = false;

    const srcMats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const nextMats = srcMats.map((srcMat) => {
      if (!srcMat) return srcMat;
      if (matCache.has(srcMat)) return matCache.get(srcMat)!;

      const s = srcMat as THREE.MeshStandardMaterial & THREE.MeshToonMaterial;
      const newMat = createDemonSlayerCelMaterial({
        map: s.map ?? null,
        normalMap: s.normalMap ?? null,
        normalScale: s.normalScale,
        tintHex: opts.tintHex ?? (s.color ? s.color.getHex() : 0xffffff),
        emissiveHex: opts.emissiveHex ?? 0x1a1118,
        emissiveIntensity: opts.emissiveIntensity ?? 0.08,
        rimColorHex: opts.rimColorHex,
        rimStrength: opts.rimStrength,
        rimPower: opts.rimPower ?? 2.55,
        opacity: opts.opacity ?? 1.0,
        transparent: opts.transparent ?? false,
      });
      matCache.set(srcMat, newMat);
      celMaterials.push(newMat);
      return newMat;
    });
    mesh.material = Array.isArray(mesh.material) ? nextMats : nextMats[0];
  });

  attachSumiInkOutlines(
    root,
    opts.outlineHeightRatio ?? 0.0046,
    opts.outlineColorHex ?? 0x070409
  );
  return { root, celMaterials };
}

/**
 * Multi-part sculpted 3D cel-shaded proxy silhouettes shown ONLY on frames while an FBX
 * rig is still downloading/simplifying (never replaces loaded FBX rigs, never draws 2D stickers).
 */
function buildSculptedProxy3D(
  archetype: 'rudra' | 'enemy' | 'boss' | 'savitri',
  accentHex: number,
  heightMeters: number,
  opacity = 1.0
): {
  group: THREE.Group;
  celMaterials: THREE.MeshToonMaterial[];
} {
  const group = new THREE.Group();
  const bodyMat = createDemonSlayerCelMaterial({
    map: null,
    tintHex:
      archetype === 'rudra'
        ? 0x8c5a3e
        : archetype === 'boss'
          ? 0x471822
          : archetype === 'savitri'
            ? 0x9e343c
            : 0x3b2e3c,
    rimColorHex: accentHex,
    rimStrength: 0.72,
    transparent: opacity < 0.99,
    opacity,
  });
  const trimMat = createDemonSlayerCelMaterial({
    map: null,
    tintHex: archetype === 'rudra' || archetype === 'savitri' ? 0xd99b38 : 0x8b1e2c,
    rimColorHex: accentHex,
    rimStrength: 0.82,
    transparent: opacity < 0.99,
    opacity,
  });
  const clothMat = createDemonSlayerCelMaterial({
    map: null,
    tintHex: archetype === 'rudra' ? 0xa3262a : archetype === 'savitri' ? 0xf2e4c9 : 0x241c24,
    rimColorHex: accentHex,
    rimStrength: 0.65,
    transparent: opacity < 0.99,
    opacity,
  });

  const s = heightMeters / 2.0;

  // Lower skirt / greaves
  const lower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22 * s, 0.31 * s, 0.82 * s, 8),
    clothMat
  );
  lower.position.y = 0.41 * s;

  // Torso armor
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32 * s, 0.23 * s, 0.72 * s, 8),
    bodyMat
  );
  torso.position.y = 1.15 * s;

  // Left & Right shoulder pauldrons
  const pauldronGeo = new THREE.DodecahedronGeometry(0.18 * s, 0);
  const leftPauldron = new THREE.Mesh(pauldronGeo, trimMat);
  leftPauldron.position.set(-0.34 * s, 1.42 * s, 0);
  const rightPauldron = new THREE.Mesh(pauldronGeo, trimMat);
  rightPauldron.position.set(0.34 * s, 1.42 * s, 0);

  // Head + crown/horns
  const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.19 * s, 1), bodyMat);
  head.position.y = 1.68 * s;

  group.add(lower, torso, leftPauldron, rightPauldron, head);

  if (archetype === 'boss' || archetype === 'enemy') {
    const hornGeo = new THREE.ConeGeometry(0.055 * s, 0.34 * s, 6);
    const lHorn = new THREE.Mesh(hornGeo, trimMat);
    lHorn.position.set(-0.15 * s, 1.88 * s, 0.04 * s);
    lHorn.rotation.z = 0.42;
    const rHorn = new THREE.Mesh(hornGeo, trimMat);
    rHorn.position.set(0.15 * s, 1.88 * s, 0.04 * s);
    rHorn.rotation.z = -0.42;
    group.add(lHorn, rHorn);
  }

  if (archetype === 'savitri') {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.28 * s, 0.03 * s, 6, 18), trimMat);
    halo.position.set(0, 1.72 * s, -0.14 * s);
    group.add(halo);
  } else {
    // Raised axe / blade silhouette in right hand
    const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s, 0.03 * s, 1.05 * s, 6), trimMat);
    haft.position.set(0.42 * s, 1.28 * s, 0.26 * s);
    haft.rotation.x = 0.52;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06 * s, 0.34 * s, 0.26 * s), trimMat);
    blade.position.set(0.42 * s, 1.66 * s, 0.52 * s);
    group.add(haft, blade);
  }

  attachSumiInkOutlines(group, 0.008, 0x070409);
  return { group, celMaterials: [bodyMat, trimMat, clothMat] };
}

function createSilhouetteCloneMaterial(colorHex: number, opacity: number): THREE.MeshToonMaterial {
  return createDemonSlayerCelMaterial({
    map: null,
    tintHex: colorHex,
    emissiveHex: colorHex,
    emissiveIntensity: 0.42,
    rimColorHex: 0xffffff,
    rimStrength: 0.85,
    transparent: true,
    opacity,
  });
}

export interface UnifiedEnemyFrameInput {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  aimAngle: number;
  kind: RegularEnemy3DKind | 'dundubhi' | 'vrikodara';
  wardenRigKey?: Warden3DRigKey;
  trait?: EnemyTrait;
  aiState: 'idle' | 'chase' | 'windup' | 'attack' | 'recover' | 'ko';
  attackKind: 'cone' | 'corridor' | 'shockwave';
  attackPattern?: number;
  windupProgress: number;
  stateProgress?: number;
  animTime: number;
  phase: 1 | 2 | 3;
  armorCracked: boolean;
  isPostureBroken: boolean;
  isHitFlash: boolean;
  isParrying: boolean;
  growthScale?: number;
  scaleX?: number;
  scaleY?: number;
}

export interface UnifiedPillarFrameInput {
  x: number;
  y: number;
  stage: 0 | 1 | 2;
  destroyed: boolean;
  hitFlash: boolean;
  bossEnraged: boolean;
  shakeOffsetX?: number;
}

export interface UnifiedCloneFrameInput {
  id: number;
  x: number;
  y: number;
  facing: 1 | -1;
  animTime: number;
}

export interface UnifiedStageFrameInput {
  camX: number;
  camY: number;
  viewportW: number;
  viewportH: number;
  cameraZoom: number;
  rudra: RudraRenderInput & {
    x: number;
    y: number;
    swingKind: SwingKind;
    castProgress: number;
    castElement: AstraElement;
    reachBonus?: number;
  };
  enemies: UnifiedEnemyFrameInput[];
  pillars: UnifiedPillarFrameInput[];
  clones?: UnifiedCloneFrameInput[];
  decoy?: { active: boolean; x: number; y: number; facing: 1 | -1 };
  savitriHub?: { active: boolean; x: number; y: number; facing: 1 | -1 };
}

interface EnemySlotTemplate {
  key: string;
  generateFbxUrl: string;
  textureFbxUrl: string;
  diffuseUrl: string;
  weaponKind: (typeof ENEMY_MODEL_SLOTS)[string]['weaponKind'];
  leftBucklerKind?: 'iron_buckler' | 'none';
  animUrls: Record<Enemy3DAnimState, string>;
  rimColor: number;
  rimIntensity: number;
  scaleMultiplier: number;
  standingHipY: number;
  templateGroup: THREE.Group | null;
  clips: Partial<Record<Enemy3DAnimState, THREE.AnimationClip>>;
  ready: boolean;
  loading: boolean;
}

interface PooledEnemyInstance {
  wrapper: THREE.Group;
  model: THREE.Group;
  slotKey: string;
  mixer: THREE.AnimationMixer;
  actions: Partial<Record<Enemy3DAnimState, THREE.AnimationAction>>;
  activeState: Enemy3DAnimState | null;
  celMaterials: THREE.MeshToonMaterial[];
  currentYaw: number;
  inUseThisFrame: boolean;
}

interface LiveBossRig {
  kind: Boss3DKind;
  wrapper: THREE.Group;
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Partial<Record<BossClipKey, THREE.AnimationAction>>;
  activeKey: BossClipKey | null;
  celMaterials: THREE.MeshToonMaterial[];
  weaponAuraMaterials: THREE.ShaderMaterial[];
  rightWeaponSocket: THREE.Group | null;
  rightPhase2WeaponSocket?: THREE.Group | null;
  leftWeaponSocket: THREE.Group | null;
  currentYaw: number;
  lastAiState: UnifiedEnemyFrameInput['aiState'];
  lockedAttackClip: BossClipKey | null;
  attackSwingTimer: number;
  attackSwingDuration: number;
}

/**
 * Single Live Full-Resolution 3D Orthographic World Stage:
 * Zero low-res 2D sprite baking, zero 2D rectangular cutouts, zero `EffectComposer` alpha wipe.
 */
export class UnifiedWorld3DStage {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private isSoftwareGl = false;
  private disposed = false;
  private elapsedSec = 0;

  // Lighting
  private keyLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;

  // Rudra Hero Rig & Weapon Trail Bone Nodes
  private readonly rudraWrapper = new THREE.Group();
  private readonly rudraProxy: { group: THREE.Group; celMaterials: THREE.MeshToonMaterial[] };
  private rudraModel: THREE.Group | null = null;
  private rudraMixer: THREE.AnimationMixer | null = null;
  private rudraActions: Partial<Record<RudraAnimState, THREE.AnimationAction>> = {};
  private rudraCelMaterials: THREE.MeshToonMaterial[] = [];
  private rudraAuraMats: THREE.ShaderMaterial[] = [];
  private parashuBaseNode: THREE.Object3D | null = null;
  private parashuTipNode: THREE.Object3D | null = null;
  private rudraStandingHipY = 107.11;
  private rudraReady = false;
  private rudraLoadProgress = 0.15;
  private rudraLastState: RudraAnimState = 'idle';
  private rudraStateElapsedSec = 0;
  private rudraCurrentYaw = Math.PI * 0.5;
  private rudraBoneTrailSamples = 0;
  private rudraWasSwinging = false;

  // Clones & Dash Decoy
  private readonly decoyWrapper = new THREE.Group();
  private readonly cloneWrappers: Array<{ group: THREE.Group; inUse: boolean }> = [];

  // Savitri Hub NPC
  private readonly savitriWrapper = new THREE.Group();
  private savitriProxy: { group: THREE.Group; celMaterials: THREE.MeshToonMaterial[] };

  // Pooled Enemy Slots & Live Skinned Instances
  private readonly enemySlots = new Map<string, EnemySlotTemplate>();
  private readonly enemyInstances = new Map<number, PooledEnemyInstance>();
  private readonly enemyProxies = new Map<number, THREE.Group>();
  private readonly sharedWeaponTemplates: Partial<
    Record<'minotaur_axe' | 'trident_axe' | 'crescent_reaver', Promise<THREE.Group | null>>
  > = {};

  // Live Bosses
  private readonly bossRigs: Partial<Record<Boss3DKind, LiveBossRig>> = {};
  private readonly bossLoading: Partial<Record<Boss3DKind, Promise<void>>> = {};
  private readonly bossProxies = new Map<number, THREE.Group>();

  // 3D Chola Stone Pillars Pool
  private readonly pillarPool = new Pillar3DPool(6);

  // Integrated Demon Slayer 3D VFX Pools
  private readonly rudraRibbon = new SlashRibbonController('agni');
  private readonly bossRibbon = new SlashRibbonController('boss');
  private readonly cycloneVfx = new AstraCycloneVfx();
  private readonly heavyWaves = new HeavyWaveVfx();
  private readonly dashEchoes = new DashEchoPool();
  private readonly sparks = new PooledSparkSystem(64);
  private readonly bloodArt = new DundubhiBloodDemonArtVfx();
  private readonly bossMandala = new BossBloodMandalaRenderer();
  private readonly gruntBloodArt = new GruntBloodArtPool(14, 10);
  private readonly sumiInk = new SumiInkSplashPool(12);
  private readonly fissuresAndBoulders = new GroundFractureAndBouldersPool(6, 28);

  // Brief burst-swing fallback timer for instant triggerRudraSwing responses
  private rudraSwingTimer = 0;
  private rudraSwingDuration = 0.24;
  private rudraSwingKind: SwingKind = 'attack1';
  private rudraSwingYaw = Math.PI * 0.5;
  private rudraSwingReach = 0;

  private readonly scratchCamPos = new THREE.Vector3();
  private readonly scratchBaseWorld = new THREE.Vector3();
  private readonly scratchTipWorld = new THREE.Vector3();
  private renderW = 960;
  private renderH = 540;

  constructor() {
    this.camera = new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 140);
    const rig = setupSharedStudioLightingRig(this.scene, 1.0);
    this.keyLight = rig.keyLight;
    this.rimLight = rig.rimLight;

    // Rudra Hero + Proxy
    this.rudraProxy = buildSculptedProxy3D('rudra', 0xff9f40, RUDRA_WORLD_HEIGHT_M);
    this.rudraWrapper.add(this.rudraProxy.group);
    this.scene.add(this.rudraWrapper);

    // Dash Decoy & 4 Pooled Golden Astral Clones (populated with real 3D Rudra meshes once loaded — zero cylinder snowmen!)
    this.decoyWrapper.visible = false;
    this.scene.add(this.decoyWrapper);

    for (let i = 0; i < 4; i++) {
      const cGroup = new THREE.Group();
      cGroup.visible = false;
      this.scene.add(cGroup);
      this.cloneWrappers.push({ group: cGroup, inUse: false });
    }

    // Savitri Hub NPC Wrapper + Proxy
    this.savitriProxy = buildSculptedProxy3D('savitri', 0xffd86b, SAVITRI_WORLD_HEIGHT_M);
    this.savitriWrapper.add(this.savitriProxy.group);
    this.savitriWrapper.visible = false;
    this.scene.add(this.savitriWrapper);

    // Add 3D Pillars & All VFX Groups into the Live Scene
    this.scene.add(
      this.pillarPool.group,
      this.rudraRibbon.mesh,
      this.bossRibbon.mesh,
      this.cycloneVfx.group,
      this.heavyWaves.group,
      this.dashEchoes.group,
      this.sparks.group,
      this.bloodArt.group,
      this.bossMandala.group,
      this.gruntBloodArt.group,
      this.sumiInk.group,
      this.fissuresAndBoulders.group
    );

    // Register enemy slot descriptors
    Object.values(ENEMY_MODEL_SLOTS).forEach((cfg) => {
      this.enemySlots.set(cfg.key, {
        ...cfg,
        standingHipY: 100,
        templateGroup: null,
        clips: {},
        ready: false,
        loading: false,
      });
    });

    if (typeof window !== 'undefined') {
      this.initLiveRenderer();
      this.loadRudraRig();
      this.ensureEnemySlotLoaded('grunt_ghoul');
    }
  }

  private initLiveRenderer() {
    try {
      const r = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
      r.setClearColor(0x000000, 0);
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = 0.98;
      this.isSoftwareGl =
        isSoftwareWebGLRenderer() ||
        (typeof navigator !== 'undefined' && Boolean(navigator.webdriver));
      if (!this.isSoftwareGl) {
        try {
          const gl = r.getContext();
          const dbg = gl.getExtension('WEBGL_debug_renderer_info');
          if (dbg) {
            const name = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
            if (/swiftshader|subzero|llvmpipe|softpipe|software/i.test(name)) {
              this.isSoftwareGl = true;
            }
          }
        } catch {
          // Ignore driver query errors
        }
      }
      r.setSize(this.renderW, this.renderH, false);
      this.renderer = r;
    } catch (e) {
      console.warn('[UnifiedWorld3DStage] WebGL init skipped:', e);
      this.renderer = null;
    }
  }

  public getRudraLoadState(): { isReady: boolean; loadProgress: number } {
    return { isReady: this.rudraReady, loadProgress: this.rudraLoadProgress };
  }

  private loadTex(url: string, isColor = true): Promise<THREE.Texture | null> {
    if (!url) return Promise.resolve(null);
    const loader = new THREE.TextureLoader();
    return new Promise((resolve) => {
      loader.load(
        encodeURI(url),
        (tex) => {
          tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          if (this.isSoftwareGl) {
            tex.generateMipmaps = false;
            tex.minFilter = THREE.LinearFilter;
          }
          tex.needsUpdate = true;
          resolve(tex);
        },
        undefined,
        () => resolve(null)
      );
    });
  }

  private loadRudraRig() {
    this.rudraLoadProgress = 0.25;
    const loadFbx = (url: string, cacheable = false) =>
      loadFbxCached(url, cacheable).catch(() => null);

    Promise.all([
      loadFbx(RUDRA_RIGGED_FBX_URL, false),
      loadFbx(RUDRA_TEXTURE_FBX_URL, false),
      loadFbx(PARASHU_WEAPON_FBX_URL, false),
      this.loadTex(RUDRA_DIFFUSE_URL, true),
      this.loadTex(PARASHU_DIFFUSE_URL, true),
      loadFbx(RUDRA_ANIM_URLS.idle, true),
      loadFbx(RUDRA_ANIM_URLS.run, true),
    ]).then(([riggedGroup, texturedGroup, weaponGroup, diffuseMap, weaponDiffuseMap, idleAnimGroup, runAnimGroup]) => {
      if (this.disposed) return;
      const baseGroup = riggedGroup || texturedGroup;
      if (!baseGroup) {
        this.rudraLoadProgress = 1.0;
        return;
      }

      this.rudraStandingHipY = extractStandingHipY(baseGroup);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: diffuseMap || null,
        roughness: 0.84,
        metalness: 0.08,
      });

      if (riggedGroup) {
        bindTexturedGeometryToSkeleton(riggedGroup, texturedGroup, baseMat);
      } else {
        baseGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.frustumCulled = false;
            m.material = baseMat;
          }
        });
      }

      const rawBox = new THREE.Box3().setFromObject(baseGroup);
      const rawHeight = Math.max(0.001, rawBox.max.y - rawBox.min.y);
      const scale = RUDRA_WORLD_HEIGHT_M / rawHeight;
      baseGroup.scale.setScalar(scale);
      baseGroup.position.set(0, -rawBox.min.y * scale, 0);
      baseGroup.updateMatrixWorld(true);

      const rightHand =
        baseGroup.getObjectByName('mixamorigRightHand') ||
        baseGroup.getObjectByName('RightHand');
      if (rightHand && weaponGroup) {
        const wepMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: weaponDiffuseMap || null,
          roughness: 0.82,
          metalness: 0.12,
        });
        weaponGroup.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            const wm = c as THREE.Mesh;
            wm.geometry = simplifyBufferGeometry(wm.geometry, 56, 32000);
            wm.material = wepMat;
            wm.frustumCulled = false;
          }
        });
        weaponGroup.traverse((c) => {
          if ((c as THREE.Mesh).isMesh && !c.userData.isAuraShell) {
            const wm = c as THREE.Mesh;
            const auraMat = createParashuAuraMaterial(0xff6a22, 1.35);
            this.rudraAuraMats.push(auraMat);
            const auraShell = new THREE.Mesh(wm.geometry, auraMat);
            auraShell.position.copy(wm.position);
            auraShell.rotation.copy(wm.rotation);
            auraShell.scale.copy(wm.scale);
            auraShell.frustumCulled = false;
            auraShell.userData.isAuraShell = true;
            if (wm.parent) wm.parent.add(auraShell);
          }
        });

        const handScaleVec = new THREE.Vector3();
        rightHand.getWorldScale(handScaleVec);
        const handScale = Math.max(1e-5, handScaleVec.x);
        const wepBox = new THREE.Box3().setFromObject(weaponGroup);
        const wepSize = new THREE.Vector3();
        wepBox.getSize(wepSize);
        const maxDim = Math.max(0.001, wepSize.x, wepSize.y, wepSize.z);
        const desiredWorldLen = 1.28;
        const localWepScale = desiredWorldLen / (maxDim * handScale);

        const weaponSocket = new THREE.Group();
        weaponGroup.scale.setScalar(localWepScale);
        weaponGroup.rotation.set(-Math.PI * 0.5, 0, -Math.PI * 0.5);
        weaponGroup.position.set(0.26 * maxDim * localWepScale, 0, 0);

        const baseNode = new THREE.Object3D();
        baseNode.position.set(0.18 * maxDim * localWepScale, 0, 0);
        const tipNode = new THREE.Object3D();
        tipNode.position.set(1.18 * maxDim * localWepScale, 0, 0);
        this.parashuBaseNode = baseNode;
        this.parashuTipNode = tipNode;

        weaponSocket.add(weaponGroup, baseNode, tipNode);
        rightHand.add(weaponSocket);
      }

      const styled = applyDemonSlayerCelShadingToHierarchy(baseGroup, {
        rimColorHex: 0xff9f40,
        rimStrength: 0.78,
        rimPower: 2.35,
        brightnessLift: 1.18,
        saturationBoost: 1.48,
        outlineHeightRatio: 0.0072,
        outlineColorHex: 0x060208,
      });
      this.rudraCelMaterials = styled.celMaterials;

      this.rudraWrapper.remove(this.rudraProxy.group);
      this.rudraWrapper.add(baseGroup);
      this.rudraModel = baseGroup;
      this.rudraMixer = new THREE.AnimationMixer(baseGroup);

      if (idleAnimGroup?.animations?.[0]) {
        const cleanIdle = buildStabilizedInPlaceClip(
          idleAnimGroup.animations[0],
          baseGroup,
          this.rudraStandingHipY
        );
        if (cleanIdle.tracks.length > 0) {
          const act = this.rudraMixer.clipAction(cleanIdle);
          act.play();
          this.rudraActions.idle = act;
        }
      }
      if (runAnimGroup?.animations?.[0]) {
        const cleanRun = buildStabilizedInPlaceClip(
          runAnimGroup.animations[0],
          baseGroup,
          this.rudraStandingHipY
        );
        if (cleanRun.tracks.length > 0) {
          this.rudraActions.run = this.rudraMixer.clipAction(cleanRun);
        }
      }

      this.rudraReady = true;
      this.rudraLoadProgress = 1.0;

      // Stream combat clips cleanly in background
      (Object.keys(RUDRA_ANIM_URLS) as RudraAnimState[]).forEach((state) => {
        if (state === 'idle' || state === 'run') return;
        loadFbx(RUDRA_ANIM_URLS[state], true).then((animGroup) => {
          if (this.disposed || !animGroup?.animations?.[0] || !this.rudraMixer || !this.rudraModel) return;
          const cleanClip = buildStabilizedInPlaceClip(
            animGroup.animations[0],
            this.rudraModel,
            this.rudraStandingHipY
          );
          if (cleanClip.tracks.length > 0) {
            this.rudraActions[state] = this.rudraMixer.clipAction(cleanClip);
          }
        });
      });
    });
  }

  private getSharedWeaponTemplate(
    kind: 'minotaur_axe' | 'trident_axe' | 'crescent_reaver'
  ): Promise<THREE.Group | null> {
    if (this.sharedWeaponTemplates[kind]) return this.sharedWeaponTemplates[kind]!;
    const fbxUrl =
      kind === 'minotaur_axe'
        ? MINOTAUR_AXE_FBX_URL
        : kind === 'crescent_reaver'
          ? CRESCENT_REAVER_FBX_URL
          : TRIDENT_AXE_FBX_URL;
    const texUrl = kind === 'crescent_reaver' ? CRESCENT_REAVER_TEX_URL : TRIDENT_AXE_TEX_URL;
    const p = loadFbxCached(fbxUrl, true)
      .then(async (group) => {
        const tex = await this.loadTex(texUrl, true);
        const lifted = liftTextureToAnimeVibrancy(tex, 1.05, 1.24);
        const wepMat = new THREE.MeshStandardMaterial({
          color: kind === 'minotaur_axe' ? 0xe0a85c : 0xffffff,
          map: lifted,
          roughness: 0.72,
          metalness: 0.2,
        });
        group.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            const wm = c as THREE.Mesh;
            wm.geometry = simplifyBufferGeometry(wm.geometry, 56, 32000);
            wm.material = wepMat;
            wm.frustumCulled = false;
          }
        });
        return group;
      })
      .catch(() => null);
    this.sharedWeaponTemplates[kind] = p;
    return p;
  }

  private ensureEnemySlotLoaded(slotKey: string) {
    const slot = this.enemySlots.get(slotKey);
    if (!slot || slot.ready || slot.loading) return;
    slot.loading = true;

    const loadFbx = (url: string, cacheable = false) =>
      url ? loadFbxCached(url, cacheable).catch(() => null) : Promise.resolve(null);

    Promise.all([
      loadFbx(slot.generateFbxUrl, false),
      loadFbx(slot.textureFbxUrl, false),
      this.loadTex(slot.diffuseUrl, true),
      loadFbx(slot.animUrls.idle, true),
      loadFbx(slot.animUrls.chase, true),
    ]).then(async ([riggedGroup, texturedGroup, diffuseMap, idleAnimGroup, chaseAnimGroup]) => {
      if (this.disposed) return;
      const baseGroup = riggedGroup || texturedGroup;
      if (!baseGroup) return;

      slot.standingHipY = extractStandingHipY(baseGroup);
      const liftedMap = liftTextureToAnimeVibrancy(diffuseMap, 1.04, 1.32);
      const pbrMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: liftedMap,
        roughness: 0.86,
        metalness: 0.08,
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

      const rawBox = new THREE.Box3().setFromObject(baseGroup);
      const rawHeight = Math.max(0.001, rawBox.max.y - rawBox.min.y);
      const scale = (ENEMY_WORLD_BASE_HEIGHT_M * slot.scaleMultiplier) / rawHeight;
      baseGroup.scale.setScalar(scale);
      baseGroup.position.set(0, -rawBox.min.y * scale, 0);
      baseGroup.updateMatrixWorld(true);

      const findBone = (names: string[]): THREE.Object3D | null => {
        for (const n of names) {
          const f = baseGroup.getObjectByName(n);
          if (f) return f;
        }
        let matched: THREE.Object3D | null = null;
        baseGroup.traverse((o) => {
          if (matched) return;
          const lower = o.name.toLowerCase();
          if (names.some((n) => lower.endsWith(n.toLowerCase()))) matched = o;
        });
        return matched;
      };

      if (slot.weaponKind !== 'none') {
        const isBow = slot.weaponKind === 'longbow';
        const hand = isBow ? findBone(['mixamorigLeftHand', 'LeftHand']) : findBone(['mixamorigRightHand', 'RightHand']);
        const wepTemplate = slot.weaponKind === 'longbow' ? createProceduralLongbowGroup()
          : slot.weaponKind === 'dharma_chakram' ? createProceduralDharmaChakramGroup()
          : await this.getSharedWeaponTemplate(slot.weaponKind);
        if (hand && wepTemplate) {
          const handScaleVec = new THREE.Vector3();
          hand.getWorldScale(handScaleVec);
          const handScale = Math.max(1e-5, handScaleVec.x);
          const clonedWep = wepTemplate.clone(true);
          const wepBox = new THREE.Box3().setFromObject(clonedWep);
          const wepSize = new THREE.Vector3();
          wepBox.getSize(wepSize);
          const maxDim = Math.max(0.001, wepSize.x, wepSize.y, wepSize.z);
          const desiredWorldLen = (isBow ? 1.05 : slot.weaponKind === 'dharma_chakram' ? 0.72 : 1.24) * slot.scaleMultiplier;
          const localWepScale = desiredWorldLen / (maxDim * handScale);

          const weaponSocket = new THREE.Group();
          clonedWep.scale.setScalar(localWepScale);
          if (isBow) {
            clonedWep.rotation.set(0, Math.PI * 0.5, 0);
          } else if (slot.weaponKind === 'minotaur_axe' || slot.weaponKind === 'dharma_chakram') {
            clonedWep.rotation.set(0, 0, 0);
          } else {
            clonedWep.rotation.set(-Math.PI * 0.5, 0, -Math.PI * 0.5);
          }
          clonedWep.position.set(isBow ? 0 : 0.26 * maxDim * localWepScale, 0, 0);
          weaponSocket.add(clonedWep);
          hand.add(weaponSocket);
        }
      }

      if (slot.leftBucklerKind === 'iron_buckler') {
        const leftArmBone = findBone([
          'mixamorigLeftForeArm',
          'LeftForeArm',
          'mixamorigLeftHand',
          'LeftHand',
        ]);
        if (leftArmBone) {
          const armScaleVec = new THREE.Vector3();
          leftArmBone.getWorldScale(armScaleVec);
          const armScale = Math.max(1e-5, armScaleVec.x);
          const bucklerGroup = createProceduralIronBucklerGroup();
          const shBox = new THREE.Box3().setFromObject(bucklerGroup);
          const shSize = new THREE.Vector3();
          shBox.getSize(shSize);
          const maxDim = Math.max(0.001, shSize.x, shSize.y, shSize.z);
          const desiredBucklerLen = 0.58 * slot.scaleMultiplier;
          const localShieldScale = desiredBucklerLen / (maxDim * armScale);

          const shieldSocket = new THREE.Group();
          bucklerGroup.scale.setScalar(localShieldScale);
          bucklerGroup.rotation.set(0, Math.PI * 0.5, 0);
          bucklerGroup.position.set(
            -0.06 * maxDim * localShieldScale,
            0,
            0.1 * maxDim * localShieldScale
          );
          shieldSocket.add(bucklerGroup);
          leftArmBone.add(shieldSocket);
        }
      }

      if (idleAnimGroup?.animations?.[0]) {
        const cleanIdle = buildStabilizedInPlaceClip(
          idleAnimGroup.animations[0],
          baseGroup,
          slot.standingHipY
        );
        if (cleanIdle.tracks.length > 0) slot.clips.idle = cleanIdle;
      }
      if (chaseAnimGroup?.animations?.[0]) {
        const cleanChase = buildStabilizedInPlaceClip(
          chaseAnimGroup.animations[0],
          baseGroup,
          slot.standingHipY
        );
        if (cleanChase.tracks.length > 0) slot.clips.chase = cleanChase;
      }

      slot.templateGroup = baseGroup;
      slot.ready = true;

      // Stream combat clips in background
      Promise.all([
        loadFbx(slot.animUrls.windup, true),
        loadFbx(slot.animUrls.attack, true),
        loadFbx(slot.animUrls.hurt, true),
        loadFbx(slot.animUrls.death, true),
      ]).then(([wG, aG, hG, dG]) => {
        if (this.disposed || !slot.templateGroup) return;
        const reg = (state: Enemy3DAnimState, g: THREE.Group | null) => {
          if (!g?.animations?.[0]) return;
          const clean = buildStabilizedInPlaceClip(g.animations[0], slot.templateGroup!, slot.standingHipY);
          if (clean.tracks.length === 0) return;
          slot.clips[state] = clean;
          this.enemyInstances.forEach((inst) => {
            if (inst.slotKey === slotKey && !inst.actions[state]) {
              const act = inst.mixer.clipAction(clean);
              if (state === 'death') {
                act.setLoop(THREE.LoopOnce, 1);
                act.clampWhenFinished = true;
              }
              inst.actions[state] = act;
            }
          });
        };
        reg('windup', wG);
        reg('attack', aG);
        reg('hurt', hG);
        reg('death', dG);
      });
    });
  }

  public ensureBossLoaded(kind: Boss3DKind) {
    if (this.bossRigs[kind] || this.bossLoading[kind]) return;
    if (kind === 'dundubhi') this.bossLoading[kind] = this.loadDundubhiBoss();
    else if (kind === 'vrikodara') this.bossLoading[kind] = this.loadVrikodaraBoss();
    else if (kind === 'semi_boss') this.bossLoading[kind] = this.loadSemiBoss();
    else this.bossLoading[kind] = this.loadSavitriHubModel();
  }

  private async loadSavitriHubModel() {
    try {
      const cfg = GAME_ASSETS.models3d.lotusEmpress;
      const [lotusGroup, idleAnimFbx, baseTex, normTex] = await Promise.all([
        loadFbxCached(cfg.textureFbx, false),
        loadFbxCached(cfg.idleAnimFbx, false),
        this.loadTex(cfg.textures.baseColor, true),
        this.loadTex(cfg.textures.normal, false),
      ]);
      if (this.disposed) return;

      const lifted = liftTextureToAnimeVibrancy(baseTex, 1.06, 1.24);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: lifted,
        normalMap: normTex || undefined,
        roughness: 0.78,
        metalness: 0.14,
      });

      let hasBones = false;
      lotusGroup.traverse((o) => {
        if ((o as THREE.Bone).isBone || (o as THREE.SkinnedMesh).isSkinnedMesh) hasBones = true;
        if ((o as THREE.Mesh).isMesh) {
          const m = o as THREE.Mesh;
          m.material = mat;
          m.frustumCulled = false;
        }
      });

      const styled = applyDemonSlayerCelShadingToHierarchy(lotusGroup, {
        rimColorHex: 0xffd86b,
        rimStrength: 0.68,
        brightnessLift: 1.05,
        saturationBoost: 1.24,
        outlineHeightRatio: 0.0046,
        outlineColorHex: 0x070409,
      });

      const rawBox = new THREE.Box3().setFromObject(lotusGroup);
      const rawH = Math.max(0.01, rawBox.max.y - rawBox.min.y);
      const scale = SAVITRI_WORLD_HEIGHT_M / rawH;
      lotusGroup.scale.setScalar(scale);
      lotusGroup.position.set(0, -rawBox.min.y * scale, 0);

      this.savitriWrapper.remove(this.savitriProxy.group);
      this.savitriWrapper.add(lotusGroup);

      const mixer = new THREE.AnimationMixer(lotusGroup);
      const actions: Partial<Record<BossClipKey, THREE.AnimationAction>> = {};
      const srcIdle = lotusGroup.animations?.[0] || (hasBones ? idleAnimFbx.animations?.[0] : undefined);
      if (srcIdle) {
        const hipY = extractStandingHipY(lotusGroup);
        const stabilized = buildStabilizedInPlaceClip(srcIdle, lotusGroup, hipY);
        const act = mixer.clipAction(stabilized);
        act.play();
        actions.idle = act;
      }

      this.bossRigs.savitri_hub = {
        kind: 'savitri_hub',
        wrapper: this.savitriWrapper,
        root: lotusGroup,
        mixer,
        actions,
        activeKey: 'idle',
        celMaterials: styled.celMaterials,
        weaponAuraMaterials: [],
        rightWeaponSocket: null,
        leftWeaponSocket: null,
        currentYaw: Math.PI * 0.5,
        lastAiState: 'idle',
        lockedAttackClip: null,
        attackSwingTimer: 0,
        attackSwingDuration: 0.36,
      };
    } catch (e) {
      console.warn('[UnifiedWorld3DStage] Savitri load warning:', e);
    }
  }

  private async loadDundubhiBoss() {
    try {
      const [
        dundubhiGroup,
        dundubhiTexGroup,
        mIdleFbx,
        mRunFbx,
        mSwipeFbx,
        mJumpFbx,
        mRoarFbx,
        mStaggerFbx,
        mDeathFbx,
        dunBase,
        dunNorm,
      ] = await Promise.all([
        loadFbxCached(GAME_ASSETS.models3d.dundubhiFbx, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiTextureFbx, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.idle, true),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.run, true),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.gore, true),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.slam, true),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.roar, true),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.stagger, true),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.death, true),
        this.loadTex(GAME_ASSETS.models3d.dundubhiTex.baseColor, true),
        this.loadTex(GAME_ASSETS.models3d.dundubhiTex.normal, false),
      ]);
      if (this.disposed) return;

      const lifted = liftTextureToAnimeVibrancy(dunBase, 1.04, 1.32);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: lifted,
        normalMap: dunNorm || undefined,
        roughness: 0.84,
        metalness: 0.12,
      });
      bindTexturedGeometryToSkeleton(dundubhiGroup, dundubhiTexGroup, mat);

      const styled = applyDemonSlayerCelShadingToHierarchy(dundubhiGroup, {
        rimColorHex: 0xff5a1f,
        rimStrength: 0.68,
        rimPower: 2.55,
        brightnessLift: 1.04,
        saturationBoost: 1.32,
        outlineHeightRatio: 0.0044,
        outlineColorHex: 0x070409,
      });

      const hipYRaw = extractStandingHipY(dundubhiGroup);
      const rawBox = new THREE.Box3().setFromObject(dundubhiGroup);
      const rawH = Math.max(0.01, rawBox.max.y - rawBox.min.y);
      const scale = BOSS_WORLD_HEIGHT_M.dundubhi / rawH;
      dundubhiGroup.scale.setScalar(scale);
      dundubhiGroup.position.set(0, -rawBox.min.y * scale, 0);

      const wrapper = new THREE.Group();
      wrapper.add(dundubhiGroup);
      wrapper.visible = false;
      this.scene.add(wrapper);

      const mixer = new THREE.AnimationMixer(dundubhiGroup);
      const actions: Partial<Record<BossClipKey, THREE.AnimationAction>> = {};
      const hipY = Math.abs(hipYRaw) > 0.01 ? hipYRaw : 73.15;
      const reg = (key: BossClipKey, fbx: THREE.Group | null, bounce: number, loop: boolean) => {
        const src = fbx?.animations?.[0];
        if (!src) return;
        const clip =
          Math.abs(hipY) > 10
            ? buildMutantInPlaceClip(src, dundubhiGroup, hipY, bounce, `dundubhi_${key}`)
            : buildStabilizedInPlaceClip(src, dundubhiGroup, hipY);
        const act = mixer.clipAction(clip);
        act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        act.clampWhenFinished = !loop;
        actions[key] = act;
      };

      reg('idle', mIdleFbx, 3.0, true);
      reg('run', mRunFbx, 4.0, true);
      reg('charge', mRunFbx, 4.5, true);
      reg('gore', mSwipeFbx, 4.0, false);
      reg('swipe', mSwipeFbx, 4.0, false);
      reg('cleave', mSwipeFbx, 4.0, false);
      reg('combo', mSwipeFbx, 4.0, false);
      reg('roar', mRoarFbx, 4.0, false);
      reg('whirlwind', mRoarFbx, 4.0, false);
      reg('slam', mJumpFbx, 5.0, false);
      reg('jumpAttack', mJumpFbx, 5.5, false);
      reg('stagger', mStaggerFbx, 2.5, true);
      reg('death', mDeathFbx, 1.5, false);
      actions.idle?.play();

      this.bossRigs.dundubhi = {
        kind: 'dundubhi',
        wrapper,
        root: dundubhiGroup,
        mixer,
        actions,
        activeKey: 'idle',
        celMaterials: styled.celMaterials,
        weaponAuraMaterials: [],
        rightWeaponSocket: null,
        leftWeaponSocket: null,
        currentYaw: Math.PI * 0.5,
        lastAiState: 'idle',
        lockedAttackClip: null,
        attackSwingTimer: 0,
        attackSwingDuration: 0.36,
      };
    } catch (e) {
      console.warn('[UnifiedWorld3DStage] Dundubhi load warning:', e);
    }
  }

  private async loadSemiBoss() {
    try {
      const cfg = GAME_ASSETS.models3d.semiBossBloodforge;
      const [
        semiGroup,
        semiTexGroup,
        sIdleFbx,
        sRunFbx,
        sSlash1Fbx,
        sSlash2Fbx,
        sSlash3Fbx,
        sAttack1Fbx,
        sBlockFbx,
        sImpactFbx,
        sPowerUpFbx,
        sDeathFbx,
        swordFbx,
        shieldFbx,
        semiBase,
        semiNorm,
        swordTex,
        shieldTex,
      ] = await Promise.all([
        loadFbxCached(cfg.riggedFbx, false),
        loadFbxCached(cfg.textureFbx, false),
        loadFbxCached(cfg.anims.idle, true),
        loadFbxCached(cfg.anims.run, true),
        loadFbxCached(cfg.anims.slash1, true),
        loadFbxCached(cfg.anims.slash2, true),
        loadFbxCached(cfg.anims.slash3, true),
        loadFbxCached(cfg.anims.attack1, true),
        loadFbxCached(cfg.anims.blockIdle, true),
        loadFbxCached(cfg.anims.impact, true),
        loadFbxCached(cfg.anims.powerUp, true),
        loadFbxCached(cfg.anims.death, true),
        loadFbxCached(cfg.swordFbx, true),
        loadFbxCached(cfg.shieldFbx, true),
        this.loadTex(cfg.textures.baseColor, true),
        this.loadTex(cfg.textures.normal, false),
        this.loadTex(cfg.swordTex.baseColor, true),
        this.loadTex(cfg.shieldTex.baseColor, true),
      ]);
      if (this.disposed) return;

      const charMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: liftTextureToAnimeVibrancy(semiBase, 1.04, 1.3),
        normalMap: semiNorm || undefined,
        roughness: 0.84,
        metalness: 0.14,
      });
      bindTexturedGeometryToSkeleton(semiGroup, semiTexGroup, charMat);
      const styled = applyDemonSlayerCelShadingToHierarchy(semiGroup, {
        rimColorHex: 0xff5a1f,
        rimStrength: 0.72,
        brightnessLift: 1.04,
        saturationBoost: 1.3,
        outlineHeightRatio: 0.0046,
        outlineColorHex: 0x070409,
      });
      const celMaterials = [...styled.celMaterials];
      const weaponAuraMaterials: THREE.ShaderMaterial[] = [];

      const hipY = extractStandingHipY(semiGroup);
      const rawBox = new THREE.Box3().setFromObject(semiGroup);
      const rawH = Math.max(0.01, rawBox.max.y - rawBox.min.y);
      const scale = BOSS_WORLD_HEIGHT_M.semi_boss / rawH;
      semiGroup.scale.setScalar(scale);
      semiGroup.position.set(0, -rawBox.min.y * scale, 0);
      semiGroup.updateMatrixWorld(true);

      const findBone = (names: string[]): THREE.Object3D | null => {
        for (const n of names) {
          const f = semiGroup.getObjectByName(n);
          if (f) return f;
        }
        let m: THREE.Object3D | null = null;
        semiGroup.traverse((o) => {
          if (m) return;
          if (names.some((n) => o.name.toLowerCase().endsWith(n.toLowerCase()))) m = o;
        });
        return m;
      };

      let rightSocket: THREE.Group | null = null;
      const rightHand = findBone(['mixamorigRightHand', 'RightHand']);
      if (rightHand && swordFbx) {
        const handScaleVec = new THREE.Vector3();
        rightHand.getWorldScale(handScaleVec);
        const handScale = Math.max(1e-5, handScaleVec.x);
        const swordMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: liftTextureToAnimeVibrancy(swordTex, 1.04, 1.25),
          roughness: 0.72,
          metalness: 0.24,
        });
        const rWep = swordFbx.clone(true);
        rWep.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            (c as THREE.Mesh).material = swordMat;
            c.frustumCulled = false;
          }
        });
        const wBox = new THREE.Box3().setFromObject(rWep);
        const wSize = new THREE.Vector3();
        wBox.getSize(wSize);
        const maxDim = Math.max(0.001, wSize.x, wSize.y, wSize.z);
        const localScale = (1.65 / (maxDim * handScale));
        rightSocket = new THREE.Group();
        rWep.scale.setScalar(localScale);
        rWep.rotation.set(-Math.PI * 0.5, 0, -Math.PI * 0.5);
        rWep.position.set(0.24 * maxDim * localScale, 0, 0);
        rightSocket.add(rWep);
        const swStyled = applyDemonSlayerCelShadingToHierarchy(rightSocket, {
          rimColorHex: 0xff5a1f,
          rimStrength: 0.76,
          outlineHeightRatio: 0.0046,
          outlineColorHex: 0x070409,
        });
        celMaterials.push(...swStyled.celMaterials);
        rightHand.add(rightSocket);
      }

      let leftSocket: THREE.Group | null = null;
      const leftArm = findBone(['mixamorigLeftForeArm', 'LeftForeArm', 'mixamorigLeftHand', 'LeftHand']);
      if (leftArm && shieldFbx) {
        const armScaleVec = new THREE.Vector3();
        leftArm.getWorldScale(armScaleVec);
        const armScale = Math.max(1e-5, armScaleVec.x);
        const shieldMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: liftTextureToAnimeVibrancy(shieldTex, 1.04, 1.25),
          roughness: 0.72,
          metalness: 0.24,
        });
        const sh = shieldFbx.clone(true);
        sh.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            (c as THREE.Mesh).material = shieldMat;
            c.frustumCulled = false;
          }
        });
        const shBox = new THREE.Box3().setFromObject(sh);
        const shSize = new THREE.Vector3();
        shBox.getSize(shSize);
        const maxDim = Math.max(0.001, shSize.x, shSize.y, shSize.z);
        const localScale = 1.15 / (maxDim * armScale);
        leftSocket = new THREE.Group();
        sh.scale.setScalar(localScale);
        sh.rotation.set(0, Math.PI * 0.5, 0);
        sh.position.set(-0.08 * maxDim * localScale, 0, 0.14 * maxDim * localScale);
        leftSocket.add(sh);
        const shStyled = applyDemonSlayerCelShadingToHierarchy(leftSocket, {
          rimColorHex: 0xff5a1f,
          rimStrength: 0.72,
          outlineHeightRatio: 0.0046,
          outlineColorHex: 0x070409,
        });
        celMaterials.push(...shStyled.celMaterials);
        leftArm.add(leftSocket);
      }

      const wrapper = new THREE.Group();
      wrapper.add(semiGroup);
      wrapper.visible = false;
      this.scene.add(wrapper);

      const mixer = new THREE.AnimationMixer(semiGroup);
      const actions: Partial<Record<BossClipKey, THREE.AnimationAction>> = {};
      const reg = (key: BossClipKey, fbx: THREE.Group | null, loop: boolean) => {
        const src = fbx?.animations?.[0];
        if (!src) return;
        const clip = buildStabilizedInPlaceClip(src, semiGroup, hipY);
        if (clip.tracks.length === 0) return;
        const act = mixer.clipAction(clip);
        act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        act.clampWhenFinished = !loop;
        actions[key] = act;
      };
      reg('idle', sIdleFbx, true);
      reg('run', sRunFbx, true);
      reg('charge', sRunFbx, true);
      reg('swipe', sSlash1Fbx, false);
      reg('cleave', sSlash2Fbx, false);
      reg('combo', sSlash3Fbx, false);
      reg('whirlwind', sPowerUpFbx, false);
      reg('roar', sPowerUpFbx, false);
      reg('slam', sAttack1Fbx, false);
      reg('jumpAttack', sAttack1Fbx, false);
      reg('block', sBlockFbx, true);
      reg('stagger', sImpactFbx, true);
      reg('death', sDeathFbx, false);
      actions.idle?.play();

      this.bossRigs.semi_boss = {
        kind: 'semi_boss',
        wrapper,
        root: semiGroup,
        mixer,
        actions,
        activeKey: 'idle',
        celMaterials,
        weaponAuraMaterials,
        rightWeaponSocket: rightSocket,
        leftWeaponSocket: leftSocket,
        currentYaw: Math.PI * 0.5,
        lastAiState: 'idle',
        lockedAttackClip: null,
        attackSwingTimer: 0,
        attackSwingDuration: 0.36,
      };
    } catch (e) {
      console.warn('[UnifiedWorld3DStage] Semi-Boss load warning:', e);
    }
  }

  private async loadVrikodaraBoss() {
    try {
      const wepBase = '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx';
      const vAnims = GAME_ASSETS.models3d.vrikodaraAnims;
      const [
        vrikGroup,
        vrikTexGroup,
        vIdleFbx,
        vRunFbx,
        vDownwardFbx,
        vSpinFbx,
        vBattlecryFbx,
        vChestThumpFbx,
        vReactGutFbx,
        vBlockFbx,
        vDeathFbx,
        maceFbx,
        tridentFbx,
        vrikBase,
        vrikNorm,
        maceTex,
        tridentTex,
      ] = await Promise.all([
        loadFbxCached(GAME_ASSETS.models3d.vrikodaraFbx, false),
        loadFbxCached(GAME_ASSETS.models3d.vrikodaraTextureFbx, false),
        loadFbxCached(vAnims.idle, true),
        loadFbxCached(vAnims.run, true),
        loadFbxCached(vAnims.downwardSmash, true),
        loadFbxCached(vAnims.cleave360, true),
        loadFbxCached(vAnims.battlecry, true),
        loadFbxCached(vAnims.chestThump, true),
        loadFbxCached(vAnims.reactGut, true),
        loadFbxCached(vAnims.block, true),
        loadFbxCached(vAnims.death, true),
        loadFbxCached(GAME_ASSETS.models3d.embermawMaceFbx, true),
        loadFbxCached(GAME_ASSETS.models3d.tridentFbx, true),
        this.loadTex(GAME_ASSETS.models3d.vrikodaraTex.baseColor, true),
        this.loadTex(GAME_ASSETS.models3d.vrikodaraTex.normal, false),
        this.loadTex(GAME_ASSETS.models3d.embermawMaceTex.baseColor, true),
        this.loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png`, true),
      ]);
      if (this.disposed) return;

      const hipY = extractStandingHipY(vrikGroup);
      const rawBox = new THREE.Box3().setFromObject(vrikGroup);
      const rawH = Math.max(0.01, rawBox.max.y - rawBox.min.y);
      const scale = BOSS_WORLD_HEIGHT_M.vrikodara / rawH;
      vrikGroup.scale.setScalar(scale);
      vrikGroup.position.set(0, -rawBox.min.y * scale, 0);

      const charMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: liftTextureToAnimeVibrancy(vrikBase, 1.04, 1.3),
        normalMap: vrikNorm || undefined,
        roughness: 0.86,
        metalness: 0.08,
      });
      bindTexturedGeometryToSkeleton(vrikGroup, vrikTexGroup, charMat);
      const styled = applyDemonSlayerCelShadingToHierarchy(vrikGroup, {
        rimColorHex: 0xff3b28,
        rimStrength: 0.74,
        rimPower: 2.35,
        brightnessLift: 1.05,
        saturationBoost: 1.3,
        outlineHeightRatio: 0.0046,
        outlineColorHex: 0x070409,
      });
      const celMaterials = [...styled.celMaterials];
      const weaponAuraMaterials: THREE.ShaderMaterial[] = [];
      vrikGroup.updateMatrixWorld(true);

      const findBone = (names: string[]): THREE.Object3D | null => {
        for (const n of names) {
          const f = vrikGroup.getObjectByName(n);
          if (f) return f;
        }
        let m: THREE.Object3D | null = null;
        vrikGroup.traverse((o) => {
          if (m) return;
          if (names.some((n) => o.name.toLowerCase().endsWith(n.toLowerCase()))) m = o;
        });
        return m;
      };

      const rightHand = findBone(['mixamorigRightHand', 'RightHand']);
      const leftHand = findBone(['mixamorigLeftHand', 'LeftHand']);
      let rightMaceSocket: THREE.Group | null = null;
      let rightTridentSocket: THREE.Group | null = null;
      let leftTridentSocket: THREE.Group | null = null;

      const maceMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: liftTextureToAnimeVibrancy(maceTex || tridentTex, 1.04, 1.25),
        roughness: 0.78,
        metalness: 0.18,
      });
      const tridentMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: liftTextureToAnimeVibrancy(tridentTex, 1.04, 1.25),
        roughness: 0.84,
        metalness: 0.12,
      });

      const attachWep = (
        hand: THREE.Object3D,
        src: THREE.Group,
        mat: THREE.MeshStandardMaterial,
        worldLen: number,
        isLeft: boolean,
        auraHex: number
      ): THREE.Group => {
        const handScaleVec = new THREE.Vector3();
        hand.getWorldScale(handScaleVec);
        const handScale = Math.max(1e-5, handScaleVec.x);
        const w = src.clone(true);
        w.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            (c as THREE.Mesh).material = mat;
            c.frustumCulled = false;
          }
        });
        const wBox = new THREE.Box3().setFromObject(w);
        const wSize = new THREE.Vector3();
        wBox.getSize(wSize);
        const maxDim = Math.max(0.001, wSize.x, wSize.y, wSize.z);
        const localScale = worldLen / (maxDim * handScale);
        const sock = new THREE.Group();
        w.scale.setScalar(localScale);
        w.rotation.set(-Math.PI * 0.5, 0, isLeft ? Math.PI * 0.5 : -Math.PI * 0.5);
        w.position.set((isLeft ? -0.25 : 0.25) * maxDim * localScale, 0, 0);
        w.traverse((c) => {
          if ((c as THREE.Mesh).isMesh && !c.userData.isAuraShell) {
            const wm = c as THREE.Mesh;
            const auraMat = createParashuAuraMaterial(auraHex, 1.45);
            weaponAuraMaterials.push(auraMat);
            const auraShell = new THREE.Mesh(wm.geometry, auraMat);
            auraShell.position.copy(wm.position);
            auraShell.rotation.copy(wm.rotation);
            auraShell.scale.copy(wm.scale);
            auraShell.frustumCulled = false;
            auraShell.userData.isAuraShell = true;
            if (wm.parent) wm.parent.add(auraShell);
          }
        });
        sock.add(w);
        const sStyled = applyDemonSlayerCelShadingToHierarchy(sock, {
          rimColorHex: auraHex,
          rimStrength: 0.78,
          outlineHeightRatio: 0.0046,
          outlineColorHex: 0x070409,
        });
        celMaterials.push(...sStyled.celMaterials);
        hand.add(sock);
        return sock;
      };

      if (rightHand) {
        if (maceFbx || tridentFbx) {
          rightMaceSocket = attachWep(rightHand, (maceFbx || tridentFbx)!, maceMat, 2.05, false, 0xff4526);
        }
        if (tridentFbx) {
          rightTridentSocket = attachWep(rightHand, tridentFbx, tridentMat, 2.2, false, 0xff1e38);
          rightTridentSocket.visible = false;
        }
      }
      if (leftHand && tridentFbx) {
        leftTridentSocket = attachWep(leftHand, tridentFbx, tridentMat, 1.95, true, 0xff1e38);
        leftTridentSocket.visible = false;
      }

      const wrapper = new THREE.Group();
      wrapper.add(vrikGroup);
      wrapper.visible = false;
      this.scene.add(wrapper);

      const mixer = new THREE.AnimationMixer(vrikGroup);
      const actions: Partial<Record<BossClipKey, THREE.AnimationAction>> = {};
      const reg = (key: BossClipKey, fbx: THREE.Group | null, loop: boolean) => {
        const src = fbx?.animations?.[0];
        if (!src) return;
        const clip = buildStabilizedInPlaceClip(src, vrikGroup, hipY);
        if (clip.tracks.length === 0) return;
        const act = mixer.clipAction(clip);
        act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        act.clampWhenFinished = !loop;
        actions[key] = act;
      };
      reg('idle', vIdleFbx, true);
      reg('run', vRunFbx, true);
      reg('charge', vRunFbx, true);
      reg('swipe', vDownwardFbx, false);
      reg('cleave', vSpinFbx, false);
      reg('combo', vChestThumpFbx, false);
      reg('whirlwind', vSpinFbx, false);
      reg('roar', vBattlecryFbx, false);
      reg('slam', vDownwardFbx, false);
      reg('jumpAttack', vDownwardFbx, false);
      reg('block', vBlockFbx, true);
      reg('stagger', vReactGutFbx, true);
      reg('death', vDeathFbx, false);
      actions.idle?.play();

      this.bossRigs.vrikodara = {
        kind: 'vrikodara',
        wrapper,
        root: vrikGroup,
        mixer,
        actions,
        activeKey: 'idle',
        celMaterials,
        weaponAuraMaterials,
        rightWeaponSocket: rightMaceSocket,
        rightPhase2WeaponSocket: rightTridentSocket,
        leftWeaponSocket: leftTridentSocket,
        currentYaw: Math.PI * 0.5,
        lastAiState: 'idle',
        lockedAttackClip: null,
        attackSwingTimer: 0,
        attackSwingDuration: 0.36,
      };
    } catch (e) {
      console.warn('[UnifiedWorld3DStage] Vrikodara load warning:', e);
    }
  }

  public prewarmChamber(
    enemies: Array<{
      id: number;
      kind: RegularEnemy3DKind;
      wardenRigKey?: Warden3DRigKey;
      trait?: EnemyTrait;
    }>,
    bossKind?: 'dundubhi' | 'vrikodara' | 'semi_boss' | null
  ) {
    if (bossKind) this.ensureBossLoaded(bossKind);
    const seen = new Set<string>();
    for (const e of enemies) {
      const slotKey = selectSlotKeyFromInput(e.kind, e.id, e.wardenRigKey, e.trait);
      if (!seen.has(slotKey)) {
        seen.add(slotKey);
        this.ensureEnemySlotLoaded(slotKey);
      }
    }
  }

  public prewarmSavitriHub() {
    this.ensureBossLoaded('savitri_hub');
  }

  // ---- VFX & Combat Impact Trigger API ----

  public triggerRudraSwing(
    arenaX: number,
    arenaY: number,
    angleRad: number,
    stance: string,
    kind: SwingKind = 'attack1',
    durationSec = 0.24,
    reachBonus = 0
  ) {
    this.rudraRibbon.setTheme(stanceToAstraElement(stance));
    this.rudraSwingYaw = arenaAngleToThreeYaw(angleRad);
    this.rudraSwingKind = kind;
    this.rudraSwingDuration = Math.max(0.14, durationSec);
    this.rudraSwingTimer = this.rudraSwingDuration;
    this.rudraSwingReach = reachBonus;
    this.rudraBoneTrailSamples = 0;
  }

  public triggerHeavyWave(
    arenaX: number,
    arenaY: number,
    angleRad: number,
    element: AstraElement,
    speed = 11.5
  ) {
    const w = arenaToThreeWorld(arenaX, arenaY);
    this.heavyWaves.triggerTripleWave(w.x, w.z, arenaAngleToThreeYaw(angleRad), element, speed);
  }

  public spawnDashEcho(arenaX: number, arenaY: number, angleRad: number, stance: string) {
    const w = arenaToThreeWorld(arenaX, arenaY);
    this.dashEchoes.spawn(w.x, w.z, arenaAngleToThreeYaw(angleRad), stanceToAstraElement(stance));
  }

  public triggerParryClash(arenaX: number, arenaY: number, colorHex = 0xffe484) {
    const w = arenaToThreeWorld(arenaX, arenaY);
    this.sparks.triggerClashFlare(w.x, 1.05, w.z, colorHex, this.scratchCamPos);
    this.sumiInk.spawn(w.x, 1.05, w.z, colorHex, 1.75, this.scratchCamPos);
  }

  public triggerHitSparks(arenaX: number, arenaY: number, colorHex = 0xff9e3d, count = 14) {
    const w = arenaToThreeWorld(arenaX, arenaY);
    this.sparks.spawnBurst(w.x, 0.95, w.z, colorHex, count, 6.4);
  }

  public triggerSumiInkSplash(
    arenaX: number,
    arenaY: number,
    rimColorHex = 0x38bdf8,
    scale = 1.65
  ) {
    const w = arenaToThreeWorld(arenaX, arenaY);
    this.sumiInk.spawn(w.x, 1.02, w.z, rimColorHex, scale, this.scratchCamPos);
  }

  public triggerGroundImpact(
    arenaX: number,
    arenaY: number,
    element: AstraElement | 'boss',
    radiusPx = 120,
    boulderBurstCount = 8
  ) {
    const w = arenaToThreeWorld(arenaX, arenaY);
    this.fissuresAndBoulders.triggerImpact(
      w.x,
      w.z,
      element,
      Math.max(1.3, radiusPx / ARENA_THREE_SCALE_PX),
      boulderBurstCount
    );
  }

  public triggerGruntBloodSlash(
    arenaX: number,
    arenaY: number,
    angleRad: number,
    actorType: string,
    trait?: EnemyTrait
  ) {
    const w = arenaToThreeWorld(arenaX, arenaY);
    const profile = resolveBloodDemonArtProfile({
      actorType,
      trait,
      phase: 1,
      aiState: 'attack',
    });
    this.gruntBloodArt.triggerGruntBloodSlash(w.x, w.z, arenaAngleToThreeYaw(angleRad), profile);
  }

  public triggerBossSickles(
    arenaX: number,
    arenaY: number,
    angleRad: number,
    count = 2,
    enraged = false
  ) {
    const w = arenaToThreeWorld(arenaX, arenaY);
    this.bloodArt.spawnFlyingBloodSickles(w.x, w.z, arenaAngleToThreeYaw(angleRad), count, enraged);
  }

  public triggerBossSpikeBurst(
    arenaX: number,
    arenaY: number,
    radiusPx = 120,
    enraged = false
  ) {
    const w = arenaToThreeWorld(arenaX, arenaY);
    this.bloodArt.spawnBloodSpikeBurst(w.x, w.z, Math.max(1.2, radiusPx / ARENA_THREE_SCALE_PX), enraged);
  }

  public triggerBossShockwave(
    arenaX: number,
    arenaY: number,
    radiusPx: number,
    kind: 'slam' | 'roar' | 'pillar_break',
    enraged = false
  ) {
    const w = arenaToThreeWorld(arenaX, arenaY);
    const radM = Math.max(1.4, radiusPx / ARENA_THREE_SCALE_PX);
    this.bloodArt.spawnShockwaveImpact(w.x, w.z, radM, kind, enraged);
    this.fissuresAndBoulders.triggerImpact(
      w.x,
      w.z,
      'boss',
      radM * 0.9,
      kind === 'pillar_break' ? 14 : 9
    );
  }

  public clearAll() {
    this.rudraSwingTimer = 0;
    this.rudraBoneTrailSamples = 0;
    this.rudraRibbon.clear();
    this.bossRibbon.clear();
    this.cycloneVfx.update(this.elapsedSec, false, 0, 0, 0, 0, 0);
    this.heavyWaves.clear();
    this.dashEchoes.clear();
    this.sparks.clear();
    this.bloodArt.clearAll();
    this.bossMandala.clear();
    this.gruntBloodArt.clear();
    this.sumiInk.clear();
    this.fissuresAndBoulders.clear();
    this.pillarPool.clear();
    this.enemyInstances.forEach((inst) => {
      inst.wrapper.visible = false;
    });
    this.enemyProxies.forEach((p) => {
      p.visible = false;
    });
    this.bossProxies.forEach((p) => {
      p.visible = false;
    });
    Object.values(this.bossRigs).forEach((rig) => {
      if (rig && rig.kind !== 'savitri_hub') rig.wrapper.visible = false;
    });
  }

  // ---- Per-Frame Sync Helpers ----

  private syncRudra(frame: UnifiedStageFrameInput, dt: number) {
    const r = frame.rudra;
    const rWorld = arenaToThreeWorld(r.x, r.y);
    const speedMag = Math.hypot(r.vx, r.vy);
    const isSwinging = r.isAttacking || r.isHeavyAttack || r.isCasting;
    const facingAngle = isSwinging
      ? r.slashAngle
      : speedMag > 25
        ? Math.atan2(r.vy, r.vx)
        : Math.atan2(r.facingY || 0, r.facingX || 1);
    const targetYaw = arenaAngleToThreeYaw(facingAngle);
    const angleDiff = Math.atan2(Math.sin(targetYaw - this.rudraCurrentYaw), Math.cos(targetYaw - this.rudraCurrentYaw));
    this.rudraCurrentYaw += angleDiff * Math.min(1, (isSwinging ? 28 : 16) * dt);

    const elevM = (r.elevationY || 0) / ARENA_THREE_SCALE_PX;
    this.rudraWrapper.position.set(rWorld.x, elevM, rWorld.z);
    this.rudraWrapper.rotation.y = this.rudraCurrentYaw;

    const elem = stanceToAstraElement(r.stance);
    const elemHex = elem === 'vayu' ? 0x34d399 : elem === 'vajra' ? 0x38d9ff : 0xff7a22;

    if (!this.rudraReady || !this.rudraMixer || !this.rudraModel) {
      setCelRimStyle(this.rudraProxy.celMaterials, elemHex, isSwinging ? 0.84 : 0.58);
      setCelHitFlash(this.rudraProxy.celMaterials, r.isHurt, 0x0d0907, 0.05, 0xffe49e);
      return;
    }

    const desired = resolveRudraDesiredState(r, this.rudraActions);
    if (desired !== this.rudraLastState) {
      this.rudraStateElapsedSec = 0;
      this.rudraLastState = desired;
    } else {
      this.rudraStateElapsedSec += dt;
    }
    const { state, animClock, usesNormalizedProgress } = resolveRudraAnimStateAndClock(
      r,
      this.rudraStateElapsedSec,
      this.elapsedSec,
      this.rudraActions
    );

    const isAttack =
      state === 'attack1' || state === 'attack2' || state === 'attack3' || state === 'heavy' || state === 'cast';
    const action =
      this.rudraActions[state] ||
      (isAttack ? this.rudraActions.attack1 || this.rudraActions.run : undefined) ||
      this.rudraActions.idle;

    if (action) {
      this.rudraMixer.stopAllAction();
      action.reset();
      action.play();
      const clipDur = Math.max(0.25, action.getClip().duration);
      const t = usesNormalizedProgress ? animClock * clipDur : animClock % clipDur;
      this.rudraMixer.setTime(t);
    }

    setCelRimStyle(this.rudraCelMaterials, elemHex, isAttack ? 0.82 : 0.58);
    setCelHitFlash(this.rudraCelMaterials, r.isHurt, 0x0d0907, 0.05, 0xffe49e);
    for (const am of this.rudraAuraMats) {
      am.uniforms.uTime.value = this.elapsedSec;
      am.uniforms.uColor.value.setHex(elemHex);
      am.uniforms.uIntensity.value = isAttack ? 1.2 : 0.86;
    }
  }

  private getOrCreateEnemyInstance(e: UnifiedEnemyFrameInput): PooledEnemyInstance | null {
    const desiredSlotKey = selectSlotKeyFromInput(
      e.kind as RegularEnemy3DKind,
      e.id,
      e.wardenRigKey,
      e.trait
    );
    this.ensureEnemySlotLoaded(desiredSlotKey);
    let activeSlotKey = desiredSlotKey;
    let slot = this.enemySlots.get(desiredSlotKey);
    if (!slot || !slot.ready || !slot.templateGroup) {
      // Use any already-loaded 3D enemy rig (such as prewarmed grunt_ghoul) as a live 3D stand-in
      // while this variant's FBX finishes streaming, then seamlessly upgrade once desiredSlotKey is ready!
      let foundReady = false;
      for (const [key, candidate] of this.enemySlots.entries()) {
        if (candidate.ready && candidate.templateGroup) {
          slot = candidate;
          activeSlotKey = key;
          foundReady = true;
          break;
        }
      }
      if (!foundReady || !slot || !slot.templateGroup) return null;
    }

    const existing = this.enemyInstances.get(e.id);
    if (existing && existing.slotKey === activeSlotKey) return existing;

    if (existing) {
      this.scene.remove(existing.wrapper);
      existing.celMaterials.forEach((m) => m.dispose());
    }

    const cloned = cloneHierarchyWithIndependentCelMaterials(slot.templateGroup, {
      rimColorHex: slot.rimColor,
      rimStrength: Math.min(0.68, slot.rimIntensity),
      rimPower: 2.55,
      outlineHeightRatio: 0.0046,
      outlineColorHex: 0x070409,
    });

    const wrapper = new THREE.Group();
    wrapper.add(cloned.root);
    this.scene.add(wrapper);

    const mixer = new THREE.AnimationMixer(cloned.root);
    const actions: Partial<Record<Enemy3DAnimState, THREE.AnimationAction>> = {};
    (Object.keys(slot.clips) as Enemy3DAnimState[]).forEach((st) => {
      const clip = slot.clips[st];
      if (!clip) return;
      const act = mixer.clipAction(clip);
      if (st === 'death') {
        act.setLoop(THREE.LoopOnce, 1);
        act.clampWhenFinished = true;
      }
      actions[st] = act;
    });
    actions.idle?.play();

    const inst: PooledEnemyInstance = {
      wrapper,
      model: cloned.root,
      slotKey: activeSlotKey,
      mixer,
      actions,
      activeState: 'idle',
      celMaterials: cloned.celMaterials,
      currentYaw: arenaAngleToThreeYaw(e.aimAngle ?? (e.facing === 1 ? 0 : Math.PI)),
      inUseThisFrame: true,
    };
    this.enemyInstances.set(e.id, inst);
    return inst;
  }

  private syncRegularEnemy(e: UnifiedEnemyFrameInput, dt: number, sealIdx: number) {
    const world = arenaToThreeWorld(e.x, e.y);
    const speedMag = Math.hypot(e.vx, e.vy);
    const angleRad =
      e.aiState === 'windup' || e.aiState === 'attack' || speedMag < 18
        ? (e.aimAngle ?? (e.facing === 1 ? 0 : Math.PI))
        : Math.atan2(e.vy, e.vx);
    const targetYaw = arenaAngleToThreeYaw(angleRad);

    const profile = resolveBloodDemonArtProfile({
      actorType: e.kind,
      trait: e.trait,
      phase: e.phase,
      aiState: e.aiState,
    });

    // Tier 1 Grunt Blood Demon Art localized curse sigil under attacking/trait enemies
    if (e.aiState !== 'ko' && profile.mandalaAlpha > 0.02) {
      this.gruntBloodArt.applyGruntSeal(sealIdx, this.elapsedSec, world.x, world.z, profile);
    }

    const inst = this.getOrCreateEnemyInstance(e);
    if (!inst) {
      let proxy = this.enemyProxies.get(e.id);
      if (!proxy) {
        const built = buildSculptedProxy3D('enemy', profile.primaryHex, ENEMY_WORLD_BASE_HEIGHT_M);
        proxy = built.group;
        proxy.userData.celMaterials = built.celMaterials;
        this.scene.add(proxy);
        this.enemyProxies.set(e.id, proxy);
      }
      proxy.visible = e.aiState !== 'ko';
      proxy.position.set(world.x, 0, world.z);
      proxy.rotation.y = targetYaw;
      const sx = (e.scaleX ?? 1) * (e.growthScale ?? 1);
      const sy = (e.scaleY ?? 1) * (e.growthScale ?? 1);
      proxy.scale.set(sx, sy, sx);
      const pMats = (proxy.userData.celMaterials || []) as THREE.MeshToonMaterial[];
      setCelHitFlash(pMats, e.isHitFlash, 0x0d0907, 0.05, 0xffe49e);
      setCelBounceTint(pMats, profile.primaryHex, profile.bounceStrength);
      return;
    }

    const oldProxy = this.enemyProxies.get(e.id);
    if (oldProxy) oldProxy.visible = false;

    inst.inUseThisFrame = true;
    inst.wrapper.visible = true;
    const diff = Math.atan2(Math.sin(targetYaw - inst.currentYaw), Math.cos(targetYaw - inst.currentYaw));
    inst.currentYaw += diff * Math.min(1, 16 * dt);
    inst.wrapper.position.set(world.x, 0, world.z);
    inst.wrapper.rotation.y = inst.currentYaw;
    const sx = (e.scaleX ?? 1) * (e.growthScale ?? 1);
    const sy = (e.scaleY ?? 1) * (e.growthScale ?? 1);
    inst.wrapper.scale.set(sx, sy, sx);

    const animState: Enemy3DAnimState =
      e.aiState === 'ko'
        ? 'death'
        : e.isPostureBroken || e.isHitFlash
          ? 'hurt'
          : e.aiState === 'windup'
            ? 'windup'
            : e.aiState === 'attack'
              ? 'attack'
              : speedMag > 18
                ? 'chase'
                : 'idle';

    const action =
      inst.actions[animState] ||
      (animState === 'windup' || animState === 'attack' ? inst.actions.attack || inst.actions.chase : undefined) ||
      inst.actions.idle;
    if (action) {
      if (inst.activeState !== animState) {
        inst.mixer.stopAllAction();
        action.reset();
        action.play();
        inst.activeState = animState;
      }
      const dur = Math.max(0.25, action.getClip().duration);
      const isActionState = animState === 'windup' || animState === 'attack' || animState === 'hurt' || animState === 'death';
      const prog = isActionState && typeof e.stateProgress === 'number' ? Math.max(0, Math.min(0.99, e.stateProgress)) : null;
      const t = prog !== null ? prog * dur : e.animTime % dur;
      inst.mixer.setTime(t);
    }

    const rimHex = e.aiState === 'windup' ? profile.primaryHex : e.trait === 'vajra_shield' ? 0x6366f1 : profile.rimHex;
    setCelRimStyle(inst.celMaterials, rimHex, e.aiState === 'windup' || e.aiState === 'attack' ? 0.78 : 0.56);
    setCelBounceTint(inst.celMaterials, profile.primaryHex, profile.bounceStrength);
    setCelHitFlash(inst.celMaterials, e.isHitFlash, 0x0d0907, 0.05, 0xffe49e);
  }

  private syncBossEnemy(e: UnifiedEnemyFrameInput, dt: number) {
    const bossKind: 'dundubhi' | 'vrikodara' | 'semi_boss' =
      e.kind === 'dundubhi'
        ? 'dundubhi'
        : e.kind === 'vrikodara'
          ? 'vrikodara'
          : 'semi_boss';
    this.ensureBossLoaded(bossKind);
    const world = arenaToThreeWorld(e.x, e.y);
    const speedMag = Math.hypot(e.vx, e.vy);
    const angleRad =
      e.aiState === 'chase' && speedMag > 24
        ? Math.atan2(e.vy, e.vx)
        : (e.aimAngle ?? (e.facing === 1 ? 0 : Math.PI));
    const targetYaw = arenaAngleToThreeYaw(angleRad);

    const profile = resolveBloodDemonArtProfile({
      actorType: e.kind,
      phase: e.phase,
      aiState: e.aiState,
    });

    const isWindupOrAtk = e.aiState === 'windup' || e.aiState === 'attack';
    const atkProg =
      e.aiState === 'windup'
        ? Math.max(0.05, Math.min(0.95, e.windupProgress))
        : e.aiState === 'attack'
          ? Math.max(0.05, Math.min(0.95, e.stateProgress ?? 0.5))
          : 0.35;

    // Tier 2 Boss Blood Demon Art Domain Mandala + Vertical Beams + Crimson Ink Ribbons
    this.bossMandala.update({
      active: e.aiState !== 'ko',
      elapsedSec: this.elapsedSec,
      x: world.x,
      z: world.z,
      yaw: targetYaw,
      profile,
      isAttackOrWindup: isWindupOrAtk,
      attackProgress01: atkProg,
      cameraPos: this.scratchCamPos,
    });

    if (e.aiState === 'attack' && e.attackKind === 'cone') {
      this.bossRibbon.setTheme('boss');
      this.bossRibbon.updateParametricSwing(
        this.elapsedSec,
        true,
        e.phase >= 2 ? 'heavy' : 'attack3',
        world.x,
        world.z,
        targetYaw,
        atkProg,
        0.95
      );
    } else {
      this.bossRibbon.clear();
    }

    this.bloodArt.update(
      dt,
      this.elapsedSec,
      world.x,
      world.z,
      targetYaw,
      e.phase >= 2,
      e.aiState === 'windup',
      e.aiState === 'attack' && e.attackKind === 'corridor',
      e.aiState === 'ko',
      e.kind === 'dundubhi' || e.phase >= 2,
      this.scratchCamPos
    );

    const rig = this.bossRigs[bossKind];
    if (!rig) {
      let proxy = this.bossProxies.get(e.id);
      if (!proxy) {
        const built = buildSculptedProxy3D('boss', profile.primaryHex, BOSS_WORLD_HEIGHT_M[bossKind]);
        proxy = built.group;
        proxy.userData.celMaterials = built.celMaterials;
        this.scene.add(proxy);
        this.bossProxies.set(e.id, proxy);
      }
      proxy.visible = e.aiState !== 'ko';
      proxy.position.set(world.x, 0, world.z);
      proxy.rotation.y = targetYaw;
      const phScale = bossKind === 'vrikodara' && e.phase >= 2 ? 1.12 : 1.0;
      const sx = (e.scaleX ?? 1) * (e.growthScale ?? 1) * phScale;
      const sy = (e.scaleY ?? 1) * (e.growthScale ?? 1) * phScale;
      proxy.scale.set(sx, sy, sx);
      const pMats = (proxy.userData.celMaterials || []) as THREE.MeshToonMaterial[];
      setCelHitFlash(pMats, e.isHitFlash, 0x1a1118, 0.08, 0xffe49e);
      setCelBounceTint(pMats, profile.primaryHex, profile.bounceStrength);
      return;
    }

    const oldProxy = this.bossProxies.get(e.id);
    if (oldProxy) oldProxy.visible = false;

    rig.wrapper.visible = true;
    const diff = Math.atan2(Math.sin(targetYaw - rig.currentYaw), Math.cos(targetYaw - rig.currentYaw));
    rig.currentYaw += diff * Math.min(1, (isWindupOrAtk ? 24 : 14) * dt);
    rig.wrapper.position.set(world.x, 0, world.z);
    rig.wrapper.rotation.y = rig.currentYaw;

    const phScale = bossKind === 'vrikodara' && e.phase >= 2 ? 1.12 : 1.0;
    const sx = (e.scaleX ?? 1) * (e.growthScale ?? 1) * phScale;
    const sy = (e.scaleY ?? 1) * (e.growthScale ?? 1) * phScale;
    rig.wrapper.scale.set(sx, sy, sx);

    if (bossKind === 'vrikodara') {
      const p2 = e.phase >= 2;
      if (rig.rightWeaponSocket) rig.rightWeaponSocket.visible = !p2;
      if (rig.rightPhase2WeaponSocket) rig.rightPhase2WeaponSocket.visible = p2;
      if (rig.leftWeaponSocket) rig.leftWeaponSocket.visible = p2;
    }

    const prevState = rig.lastAiState;
    const enteredWindup = e.aiState === 'windup' && prevState !== 'windup';
    const enteredAttack = e.aiState === 'attack' && prevState !== 'attack';
    rig.lastAiState = e.aiState;
    if (enteredWindup) rig.lockedAttackClip = null;
    if (enteredAttack) {
      rig.attackSwingDuration = e.attackKind === 'shockwave' ? 0.52 : 0.4;
      rig.attackSwingTimer = rig.attackSwingDuration;
    }
    rig.attackSwingTimer = Math.max(0, rig.attackSwingTimer - dt);

    let desiredClip: BossClipKey = 'idle';
    if (e.aiState === 'ko') {
      desiredClip = 'death';
    } else if (e.isPostureBroken) {
      desiredClip = 'stagger';
    } else if (e.isParrying && bossKind === 'semi_boss') {
      desiredClip = 'block';
    } else if (isWindupOrAtk) {
      if (rig.lockedAttackClip && e.aiState === 'attack') {
        desiredClip = rig.lockedAttackClip;
      } else {
        const pat = (e.attackPattern ?? 0) % 6;
        if (e.attackKind === 'corridor') {
          desiredClip = bossKind === 'dundubhi' ? 'charge' : 'jumpAttack';
        } else if (e.attackKind === 'shockwave') {
          desiredClip = pat === 3 ? 'whirlwind' : pat === 4 ? 'roar' : 'slam';
        } else {
          desiredClip =
            bossKind === 'dundubhi'
              ? 'gore'
              : pat === 2
                ? 'combo'
                : pat % 2 === 0
                  ? 'swipe'
                  : 'cleave';
        }
        rig.lockedAttackClip = desiredClip;
      }
    } else if (speedMag > 22) {
      desiredClip = speedMag > 215 ? 'charge' : 'run';
    }

    const action = rig.actions[desiredClip] || rig.actions.idle;
    if (action) {
      if (rig.activeKey !== desiredClip || enteredWindup) {
        rig.mixer.stopAllAction();
        action.reset();
        action.play();
        rig.activeKey = desiredClip;
      }
      const boost = 1 + (e.phase - 1) * 0.1;
      rig.mixer.update(dt * boost);
    }

    setCelRimStyle(
      rig.celMaterials,
      e.isParrying ? 0xffe082 : profile.primaryHex,
      e.isParrying || isWindupOrAtk ? 0.84 : 0.68
    );
    setCelBounceTint(rig.celMaterials, profile.primaryHex, profile.bounceStrength);
    setCelHitFlash(rig.celMaterials, e.isHitFlash, 0x0d0907, e.phase >= 2 ? 0.09 : 0.05, 0xffe49e);
    for (const am of rig.weaponAuraMaterials) {
      am.uniforms.uTime.value = this.elapsedSec;
      am.uniforms.uColor.value.setHex(profile.primaryHex);
      am.uniforms.uIntensity.value = isWindupOrAtk ? 1.25 : 0.88;
    }
  }

  public updateAndComposite(
    ctx: CanvasRenderingContext2D,
    dt: number,
    frame: UnifiedStageFrameInput
  ) {
    if (this.disposed || !this.renderer) return;
    const stepDt = Math.max(0.001, Math.min(0.05, dt));
    this.elapsedSec += stepDt;

    // 1. Sync OrthographicCamera 1:1 with arena camera
    const spec = computeOrthoStageCameraSpec(
      frame.camX,
      frame.camY,
      frame.viewportW,
      frame.viewportH,
      frame.cameraZoom
    );
    this.camera.left = -spec.halfW;
    this.camera.right = spec.halfW;
    this.camera.top = spec.halfH;
    this.camera.bottom = -spec.halfH;
    this.camera.position.set(spec.camPosX, spec.camPosY, spec.camPosZ);
    this.camera.lookAt(spec.targetX, 0, spec.targetZ);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    this.scratchCamPos.set(spec.camPosX, spec.camPosY, spec.camPosZ);

    // Light follow camera center cleanly
    this.keyLight.position.set(spec.targetX - 3.6, 5.4, spec.targetZ + 4.2);
    this.keyLight.target.position.set(spec.targetX, 0.8, spec.targetZ);
    this.keyLight.target.updateMatrixWorld();
    this.rimLight.position.set(spec.targetX + 3.2, 3.6, spec.targetZ - 4.4);
    this.rimLight.target.position.set(spec.targetX, 0.8, spec.targetZ);
    this.rimLight.target.updateMatrixWorld();

    // 2. Sync Rudra
    this.syncRudra(frame, stepDt);

    // 3. Sync Clones & Decoy (only visible once real 3D Rudra mesh is loaded — zero primitive cylinder snowmen)
    for (const c of this.cloneWrappers) c.group.visible = false;
    const clones = frame.clones ?? [];
    if (this.rudraReady) {
      for (let i = 0; i < Math.min(clones.length, this.cloneWrappers.length); i++) {
        const c = clones[i];
        const cw = arenaToThreeWorld(c.x, c.y);
        const slot = this.cloneWrappers[i].group;
        slot.visible = true;
        slot.position.set(cw.x, 0, cw.z);
        slot.rotation.y = arenaAngleToThreeYaw(c.facing >= 0 ? 0 : Math.PI);
      }
    }

    if (this.rudraReady && frame.decoy && frame.decoy.active) {
      const dw = arenaToThreeWorld(frame.decoy.x, frame.decoy.y);
      this.decoyWrapper.visible = true;
      this.decoyWrapper.position.set(dw.x, 0, dw.z);
      this.decoyWrapper.rotation.y = arenaAngleToThreeYaw(frame.decoy.facing >= 0 ? 0 : Math.PI);
    } else {
      this.decoyWrapper.visible = false;
    }

    // 4. Sync Savitri Hub NPC
    if (frame.savitriHub && frame.savitriHub.active) {
      this.ensureBossLoaded('savitri_hub');
      const sw = arenaToThreeWorld(frame.savitriHub.x, frame.savitriHub.y);
      this.savitriWrapper.visible = true;
      this.savitriWrapper.position.set(sw.x, 0, sw.z);
      this.savitriWrapper.rotation.y = arenaAngleToThreeYaw(frame.savitriHub.facing >= 0 ? 0 : Math.PI);
      const sRig = this.bossRigs.savitri_hub;
      if (sRig) sRig.mixer.update(stepDt);
    } else {
      this.savitriWrapper.visible = false;
    }

    // 5. Sync Regular Enemies & Bosses
    this.enemyInstances.forEach((inst) => {
      inst.inUseThisFrame = false;
    });
    this.enemyProxies.forEach((p) => {
      p.visible = false;
    });
    this.bossProxies.forEach((p) => {
      p.visible = false;
    });
    (['dundubhi', 'vrikodara', 'semi_boss'] as const).forEach((k) => {
      const r = this.bossRigs[k];
      if (r) r.wrapper.visible = false;
    });
    this.gruntBloodArt.beginFrame();

    let activeBossFound = false;
    let sealIdx = 0;
    for (const e of frame.enemies) {
      if (
        e.kind === 'dundubhi' ||
        e.kind === 'vrikodara' ||
        e.kind === 'semi_boss_bloodforge'
      ) {
        activeBossFound = true;
        this.syncBossEnemy(e, stepDt);
      } else {
        this.syncRegularEnemy(e, stepDt, sealIdx++);
      }
    }
    this.enemyInstances.forEach((inst) => {
      if (!inst.inUseThisFrame) inst.wrapper.visible = false;
    });
    if (!activeBossFound) {
      this.bossMandala.clear();
      this.bossRibbon.clear();
      this.bloodArt.update(
        stepDt,
        this.elapsedSec,
        0,
        0,
        0,
        false,
        false,
        false,
        true,
        false,
        this.scratchCamPos
      );
    }

    // 6. Sync 3D Cel-Shaded Chola Pillars (`Pillar3DPool`)
    const rWorld = arenaToThreeWorld(frame.rudra.x, frame.rudra.y);
    const pillarInputs = frame.pillars.map((p) => {
      const pw = arenaToThreeWorld(p.x, p.y);
      return {
        x: pw.x,
        z: pw.z,
        stage: p.stage,
        destroyed: p.destroyed,
        hitFlash: p.hitFlash,
        bossEnraged: p.bossEnraged,
        shakeOffsetX: (p.shakeOffsetX ?? 0) / ARENA_THREE_SCALE_PX,
        rudraX: rWorld.x,
        rudraZ: rWorld.z,
      };
    });
    this.pillarPool.syncAll(pillarInputs, this.elapsedSec);

    // 7. Update Rudra Parashu Slash Ribbon (live bone tracking + instant parametric fallback)
    this.rudraWrapper.updateMatrixWorld(true);
    const rElem = stanceToAstraElement(frame.rudra.stance);
    this.rudraRibbon.setTheme(rElem);
    const liveSwinging = frame.rudra.isAttacking || frame.rudra.isHeavyAttack;

    if (liveSwinging) {
      if (!this.rudraWasSwinging) {
        this.rudraBoneTrailSamples = 0;
        this.rudraRibbon.clear();
      }
      this.rudraWasSwinging = true;
      this.rudraSwingTimer = 0;

      if (this.parashuBaseNode && this.parashuTipNode) {
        this.parashuBaseNode.getWorldPosition(this.scratchBaseWorld);
        this.parashuTipNode.getWorldPosition(this.scratchTipWorld);
        this.rudraRibbon.ageSamples(stepDt);
        this.rudraRibbon.pushSample(this.scratchBaseWorld, this.scratchTipWorld);
        this.rudraBoneTrailSamples++;
      }

      if (this.rudraBoneTrailSamples >= 3) {
        this.rudraRibbon.commit(this.elapsedSec, true, 1.14);
      } else {
        this.rudraRibbon.updateParametricSwing(
          this.elapsedSec,
          true,
          frame.rudra.swingKind,
          rWorld.x,
          rWorld.z,
          this.rudraCurrentYaw,
          Math.max(0.05, Math.min(0.98, frame.rudra.attackProgress)),
          frame.rudra.reachBonus ?? (rElem === 'vayu' ? 0.45 : 0)
        );
      }
    } else if (this.rudraSwingTimer > 0) {
      this.rudraWasSwinging = false;
      this.rudraSwingTimer = Math.max(0, this.rudraSwingTimer - stepDt);
      const prog = 1 - this.rudraSwingTimer / Math.max(0.05, this.rudraSwingDuration);
      this.rudraRibbon.updateParametricSwing(
        this.elapsedSec,
        this.rudraSwingTimer > 0,
        this.rudraSwingKind,
        rWorld.x,
        rWorld.z,
        this.rudraSwingYaw,
        prog,
        this.rudraSwingReach
      );
    } else {
      this.rudraWasSwinging = false;
      this.rudraRibbon.clear();
    }

    // 8. Update Astra Cyclone + Pooled VFX
    this.cycloneVfx.setTheme(frame.rudra.castElement as RibbonTheme);
    this.cycloneVfx.update(
      this.elapsedSec,
      frame.rudra.isCasting,
      rWorld.x,
      rWorld.z,
      this.rudraCurrentYaw,
      Math.max(0, Math.min(1, frame.rudra.castProgress)),
      frame.rudra.castElement === 'vayu' ? 0.55 : 0.25
    );

    this.heavyWaves.update(stepDt);
    this.dashEchoes.update(stepDt);
    this.sparks.update(stepDt, this.scratchCamPos);
    this.gruntBloodArt.update(stepDt, this.elapsedSec);
    this.sumiInk.update(stepDt, this.scratchCamPos);
    this.fissuresAndBoulders.update(stepDt);

    // 9. Viewport-Resolution Sizing & Live Render (Zero Sprite-Baker Downscaling)
    const dpr = this.isSoftwareGl
      ? 1
      : Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.5);
    const maxW = this.isSoftwareGl ? 960 : 1920;
    const targetW = Math.max(320, Math.min(maxW, Math.round(frame.viewportW * dpr)));
    const targetH = Math.max(
      180,
      Math.round((targetW * Math.max(1, frame.viewportH)) / Math.max(1, frame.viewportW))
    );
    if (targetW !== this.renderW || targetH !== this.renderH) {
      this.renderW = targetW;
      this.renderH = targetH;
      this.renderer.setSize(targetW, targetH, false);
    }

    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    // 10. Alpha-Safe Composite onto Arena 2D Canvas + GPU-Only Subtle Additive Emissive Pop
    ctx.drawImage(
      this.renderer.domElement,
      spec.worldRect.x,
      spec.worldRect.y,
      spec.worldRect.w,
      spec.worldRect.h
    );

    if (!this.isSoftwareGl) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.16;
      ctx.filter = 'blur(6px)';
      ctx.drawImage(
        this.renderer.domElement,
        spec.worldRect.x,
        spec.worldRect.y,
        spec.worldRect.w,
        spec.worldRect.h
      );
      ctx.filter = 'none';
      ctx.restore();
    }
  }

  public dispose() {
    this.disposed = true;
    this.rudraRibbon.dispose();
    this.bossRibbon.dispose();
    this.cycloneVfx.dispose();
    this.heavyWaves.dispose();
    this.dashEchoes.dispose();
    this.sparks.dispose();
    this.bloodArt.dispose();
    this.bossMandala.dispose();
    this.gruntBloodArt.dispose();
    this.sumiInk.dispose();
    this.fissuresAndBoulders.dispose();
    this.pillarPool.dispose();

    this.enemyInstances.forEach((inst) => {
      inst.celMaterials.forEach((m) => m.dispose());
    });
    this.enemyInstances.clear();

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
