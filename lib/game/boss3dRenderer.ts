'use client';

// ============================================================================
// REAL-TIME 60FPS 3D BOSS RENDERER FOR DUNDUBHI & VRIKODARA (THREE.JS + FBX)
// - Native skeleton-matched animations & native scale preservation:
//   * Dundubhi (Runebound Minotaur Warlord): Mixamo Mutant Y-Up Rig (Hips Y = 73.15)
//     uses Mutant FBX combat clips at native scale (~1.05x)
//   * Vrikodara (Crimson Skull Warlord): Meshy Biped Y-Up Rig (Hips Y = 0.90, Armature scale = 100)
//     uses the exact same native (1, 1, 1) scale, balanced hand-painted PBR material settings,
//     and Meshy Biped animations as Rudra (Ashen Warborn) so Vrikodara looks 100% authentic,
//     sharp, and lag-free!
// ============================================================================

import * as THREE from 'three';
import { IS_SOFTWARE_WEBGL } from '../../engine/ue5GraphicsEngine';
import { loadFbxCached } from './meshSimplifier';
import {
  bindTexturedGeometryToSkeleton,
  buildStabilizedInPlaceClip,
  extractStandingHipY,
} from './enemy3dRenderer';
import {
  SHARED_STUDIO_OUTLINE_COLOR,
  SHARED_STUDIO_OUTLINE_THICKNESS,
  applyHadesCelShadingToHierarchy,
  bake2DSpriteFrameFromCanvas,
  computeSpriteSheetFrameKey,
  getSharedStudioWebGLRenderer,
  isSoftwareWebGLRenderer,
  setupSharedStudioLightingRig,
} from './hadesSpriteBaker';
import { GAME_ASSETS } from './assets';
import {
  createDemonSlayerCelMaterial,
  liftTextureToAnimeVibrancy,
  setCelHitFlash,
  setCelRimStyle,
  setCelUnderGlow,
} from './demonSlayerShader';
import { computeCameraFootAnchorRatio } from './kalaBhairavaSusanoo';

export type Boss3DKind =
  | 'dundubhi'
  | 'vrikodara'
  | 'semi_boss'
  | 'savitri_hub'
  | 'weaponsmith_hub';

export interface Boss3DUpdateParams {
  kind: Boss3DKind;
  dt: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  aimAngle: number;
  aiState: 'idle' | 'chase' | 'windup' | 'attack' | 'recover' | 'ko';
  attackKind: 'cone' | 'corridor' | 'shockwave';
  attackPattern?: number;
  // The staged horn charge has a one-tick impact handoff; keep the same
  // running clip instead of restarting its animation on that handoff.
  chargeImpactReady?: boolean;
  windupProgress: number;
  phase: 1 | 2 | 3;
  armorCracked: boolean;
  isPostureBroken: boolean;
  isHitFlash: boolean;
  isParrying?: boolean;
  bypassSoftwareThrottle?: boolean;
}

export interface BossPbrMaterialMaps {
  map?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
  metalnessMap?: THREE.Texture | null;
  fallbackRoughness?: number;
  fallbackMetalness?: number;
  normalScale?: number;
  emissiveHex?: number;
  emissiveIntensity?: number;
  colorHex?: number;
}

/**
 * Resolves Three.js MeshStandardMaterial parameters so bound roughness/metalness maps
 * always receive `1.0` scalar multipliers (preventing 0.08/0.24 from suppressing the map).
 */
export function resolveBossPbrMaterialConfig(opts: BossPbrMaterialMaps) {
  const hasRoughnessMap = Boolean(opts.roughnessMap);
  const hasMetalnessMap = Boolean(opts.metalnessMap);
  const nScale = opts.normalScale ?? 0.35;
  return {
    color: opts.colorHex ?? (opts.map ? 0xffffff : 0x4a2024),
    map: opts.map || undefined,
    normalMap: opts.normalMap || undefined,
    normalScale: new THREE.Vector2(nScale, nScale),
    roughnessMap: opts.roughnessMap || undefined,
    metalnessMap: opts.metalnessMap || undefined,
    roughness: hasRoughnessMap ? 1.0 : (opts.fallbackRoughness ?? 0.84),
    metalness: hasMetalnessMap ? 1.0 : (opts.fallbackMetalness ?? 0.14),
    envMapIntensity: hasMetalnessMap ? 0.35 : 0.0,
    emissive: new THREE.Color(opts.emissiveHex ?? 0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? 0.0,
  };
}

export function createBossPbrMaterial(
  opts: BossPbrMaterialMaps & { rimColorHex?: number; rimStrength?: number }
): THREE.MeshToonMaterial {
  // Unified bright Rudra-parity anime vibrancy lift so ALL bosses pop crisply
  const liftedMap = liftTextureToAnimeVibrancy(opts.map || null, 1.24, 1.18);
  if (liftedMap) liftedMap.userData.animeLifted = true;
  const mat = createDemonSlayerCelMaterial({
    map: liftedMap,
    tintHex: opts.colorHex ?? (liftedMap ? 0xffffff : 0xd94838),
    emissiveHex: opts.emissiveHex ?? 0x302826,
    emissiveIntensity: Math.max(0.28, opts.emissiveIntensity ?? 0.30),
    rimColorHex: opts.rimColorHex ?? 0xffe4b8,
    rimStrength: Math.max(0.38, opts.rimStrength ?? 0.42),
    rimPower: 2.75,
    shadowTintStrength: 0.0,
    useDemonContrastRamp: false,
  });
  if (opts.normalMap) {
    mat.normalMap = opts.normalMap;
    const nScale = opts.normalScale ?? 0.35;
    mat.normalScale = new THREE.Vector2(nScale, nScale);
  }
  return mat;
}

export function buildBossPrewarmParamsList(kind: Boss3DKind): Boss3DUpdateParams[] {
  const states: Array<Boss3DUpdateParams['aiState']> = ['idle', 'chase', 'windup', 'attack'];
  const angles = [0, Math.PI];
  const list: Boss3DUpdateParams[] = [];
  for (const st of states) {
    for (const ang of angles) {
      list.push({
        kind,
        dt: 0.033,
        vx: st === 'chase' ? Math.cos(ang) * 140 : 0,
        vy: st === 'chase' ? Math.sin(ang) * 140 : 0,
        facing: ang === 0 ? 1 : -1,
        aimAngle: ang,
        aiState: st,
        attackKind: 'cone',
        attackPattern: 0,
        windupProgress: st === 'windup' ? 0.5 : 0,
        phase: 1,
        armorCracked: false,
        isPostureBroken: false,
        isHitFlash: false,
        bypassSoftwareThrottle: true,
      });
    }
  }
  return list;
}

export type BossClipKey =
  | 'idle'
  | 'run'
  | 'charge'
  | 'gore'
  | 'swipe'
  | 'cleave'
  | 'combo'
  | 'whirlwind'
  | 'slam'
  | 'jumpAttack'
  | 'roar'
  | 'block'
  | 'stagger'
  | 'death';

interface BossUpperBodyBones {
  spine1: THREE.Object3D | null;
  spine2: THREE.Object3D | null;
  rightArm: THREE.Object3D | null;
  rightForeArm: THREE.Object3D | null;
  rightHand: THREE.Object3D | null;
  leftArm: THREE.Object3D | null;
}

interface LoadedBossRig {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Partial<Record<BossClipKey, THREE.AnimationAction>>;
  activeKey: BossClipKey | null;
  materials: Array<THREE.MeshToonMaterial | THREE.MeshStandardMaterial>;
  weaponMaterials: Array<THREE.MeshToonMaterial | THREE.MeshStandardMaterial>;
  rightWeaponSocket: THREE.Group | null;
  rightPhase2WeaponSocket?: THREE.Group | null;
  leftWeaponSocket: THREE.Group | null;
  weaponTipNode: THREE.Object3D;
  weaponBaseNode: THREE.Object3D;
  bones: BossUpperBodyBones;
}

interface TrailSample {
  tip: THREE.Vector3;
  base: THREE.Vector3;
  age: number;
}

/**
 * Strips horizontal root drift from a Mixamo Mutant clip while keeping vertical hip bounce
 * grounded at `standingHipY`.
 */
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

export class Boss3DRenderer {
  public canvas: HTMLCanvasElement;
  private readonly webglCanvas: HTMLCanvasElement;
  private readonly size: number;
  private readonly frameCache = new Map<string, HTMLCanvasElement>();
  public isReady = false;
  public loadProgress = 0;

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;

  private rigs: Partial<Record<Boss3DKind, LoadedBossRig>> = {};
  private loadingByKind: Partial<Record<Boss3DKind, Promise<void>>> = {};
  private prewarmedKinds = new Set<Boss3DKind>();
  private activeKind: Boss3DKind | null = null;
  private currentYaw = 0;
  private targetYaw = 0;
  private lastAiState: Boss3DUpdateParams['aiState'] = 'idle';
  private lockedAttackClip: BossClipKey | null = null;
  private locomotionRunning = false;
  private idleHysteresisTimer = 0;
  private attackSwingTimer = 0;
  private attackSwingDuration = 0.36;
  private elapsedTime = 0;
  private clipAnimTime = 0;
  private lastRenderTime = -999;
  private disposed = false;

  // Real-time 3D Boss Weapon Trail Ribbon
  private trailGeometry: THREE.BufferGeometry;
  private trailMaterial: THREE.MeshBasicMaterial;
  private trailMesh: THREE.Mesh;
  private trailSamples: TrailSample[] = [];
  private readonly maxTrailSamples = 14;

  private readonly scratchRotQ = new THREE.Quaternion();
  private readonly scratchEuler = new THREE.Euler();
  private readonly scratchTipWorld = new THREE.Vector3();
  private readonly scratchBaseWorld = new THREE.Vector3();
  public readonly footAnchorRatio: number;

  constructor(size = 288) {
    this.size = size;
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;

    this.webglCanvas = document.createElement('canvas');
    this.webglCanvas.width = size;
    this.webglCanvas.height = size;

    this.scene = new THREE.Scene();

    // Generous 2.5D Demon Slayer Dimetric Orthographic Camera so tall horned bosses, swords & crests NEVER clip
    const frustumHalf = 158;
    this.camera = new THREE.OrthographicCamera(
      -frustumHalf,
      frustumHalf,
      frustumHalf,
      -frustumHalf,
      1,
      1200
    );
    this.camera.position.set(0, 158, 380);
    this.camera.lookAt(0, 74, 0);
    this.footAnchorRatio = computeCameraFootAnchorRatio(this.camera, 0);

    // Unified Hades Studio Lighting Rig (distanceScale=60 for centimeter boss frustum)
    const studioLights = setupSharedStudioLightingRig(this.scene, 60);
    this.keyLight = studioLights.keyLight;
    this.rimLight = studioLights.rimLight;
    this.fillLight = studioLights.fillLight;

    // Initialize 3D Weapon Slash Ribbon Mesh
    this.trailGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxTrailSamples * 2 * 3);
    const uvs = new Float32Array(this.maxTrailSamples * 2 * 2);
    const indices: number[] = [];

    for (let i = 0; i < this.maxTrailSamples; i++) {
      const u = i / (this.maxTrailSamples - 1);
      uvs[i * 4 + 0] = u;
      uvs[i * 4 + 1] = 0;
      uvs[i * 4 + 2] = u;
      uvs[i * 4 + 3] = 1;
      if (i < this.maxTrailSamples - 1) {
        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        indices.push(a, b, c, b, d, c);
      }
    }

    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trailGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.trailGeometry.setIndex(indices);

    this.trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xff2a3c,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.trailMesh = new THREE.Mesh(this.trailGeometry, this.trailMaterial);
    this.trailMesh.frustumCulled = false;
    this.scene.add(this.trailMesh);

    try {
      this.renderer = getSharedStudioWebGLRenderer(size);
      this.scene.environment = null;
    } catch {
      this.renderer = null;
    }
  }

  private loadTex(url: string, isColor = false): Promise<THREE.Texture | null> {
    if (!url) return Promise.resolve(null);
    const texLoader = new THREE.TextureLoader();
    return new Promise<THREE.Texture | null>((resolve) => {
      texLoader.load(
        encodeURI(url),
        (t) => {
          t.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          if (IS_SOFTWARE_WEBGL) {
            t.generateMipmaps = false;
            t.minFilter = THREE.LinearFilter;
          }
          t.needsUpdate = true;
          resolve(t);
        },
        undefined,
        () => resolve(null)
      );
    });
  }

  public ensureBossLoaded(kind: Boss3DKind): Promise<void> {
    if (this.rigs[kind]) return Promise.resolve();
    if (this.loadingByKind[kind]) return this.loadingByKind[kind]!;
    if (kind === 'dundubhi') {
      this.loadingByKind[kind] = this.loadDundubhiRig();
    } else if (kind === 'semi_boss') {
      this.loadingByKind[kind] = this.loadSemiBossRig();
    } else if (kind === 'savitri_hub') {
      this.loadingByKind[kind] = this.loadSavitriHubRig();
    } else if (kind === 'weaponsmith_hub') {
      this.loadingByKind[kind] = this.loadWeaponsmithHubRig();
    } else {
      this.loadingByKind[kind] = this.loadVrikodaraRig();
    }
    return this.loadingByKind[kind]!;
  }

  public async waitForBossReady(kind: Boss3DKind, timeoutMs = 5500): Promise<boolean> {
    const p = this.ensureBossLoaded(kind);
    await Promise.race([
      p.catch(() => {}),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
    return Boolean(this.rigs[kind]);
  }

  public clearFrameCache(): void {
    this.frameCache.clear();
  }

  private async loadSavitriHubRig(): Promise<void> {
    try {
      const cfg = GAME_ASSETS.models3d.lotusEmpress;
      const [lotusGroup, idleAnimFbx, baseTex, normTex, roughTex, metalTex] = await Promise.all([
        loadFbxCached(cfg.textureFbx, false),
        loadFbxCached(cfg.idleAnimFbx, false),
        this.loadTex(cfg.textures.baseColor, true),
        this.loadTex(cfg.textures.normal, false),
        this.loadTex(cfg.textures.roughness, false),
        this.loadTex(cfg.textures.metalness, false),
      ]);

      if (this.disposed) return;

      const savitriMat = createBossPbrMaterial({
        map: baseTex,
        normalMap: normTex,
        roughnessMap: roughTex,
        metalnessMap: metalTex,
        fallbackRoughness: 0.78,
        fallbackMetalness: 0.18,
        normalScale: 0.35,
        emissiveHex: 0x262220,
        emissiveIntensity: 0.24,
        rimColorHex: 0xffe4b8,
        rimStrength: 0.28,
      });

      let hasBones = false;
      lotusGroup.traverse((obj) => {
        if ((obj as THREE.Bone).isBone || (obj as THREE.SkinnedMesh).isSkinnedMesh) {
          hasBones = true;
        }
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.material = savitriMat;
          mesh.castShadow = false;
          mesh.receiveShadow = false;
        }
      });

      applyHadesCelShadingToHierarchy(lotusGroup, {
        rimColor: 0xffe4b8,
        rimIntensity: 0.28,
        emissiveTint: 0x262220,
        emissiveStrength: 0.24,
        outlineRatio: 0.0052,
      });

      const rawBox = new THREE.Box3().setFromObject(lotusGroup);
      const rawH = Math.max(0.01, rawBox.max.y - rawBox.min.y);
      const targetScale = 128 / rawH;

      const savitriRoot = new THREE.Group();
      lotusGroup.scale.setScalar(targetScale);
      lotusGroup.position.set(0, -rawBox.min.y * targetScale, 0);
      savitriRoot.add(lotusGroup);
      lotusGroup.updateMatrixWorld(true);

      const mixer = new THREE.AnimationMixer(lotusGroup);
      const actions: Partial<Record<BossClipKey, THREE.AnimationAction>> = {};
      const srcIdle = lotusGroup.animations?.[0] || (hasBones ? idleAnimFbx.animations?.[0] : undefined);
      if (srcIdle) {
        const standingHipY = extractStandingHipY(lotusGroup);
        const stabilized = buildStabilizedInPlaceClip(srcIdle, lotusGroup, standingHipY);
        stabilized.name = 'savitri_hub_idle';
        const act = mixer.clipAction(stabilized);
        act.setLoop(THREE.LoopRepeat, Infinity);
        actions.idle = act;
      }

      this.rigs.savitri_hub = {
        root: savitriRoot,
        mixer,
        actions,
        activeKey: null,
        materials: [savitriMat],
        weaponMaterials: [],
        rightWeaponSocket: null,
        leftWeaponSocket: null,
        weaponTipNode: new THREE.Object3D(),
        weaponBaseNode: new THREE.Object3D(),
        bones: {
          spine1: null,
          spine2: null,
          rightArm: null,
          rightForeArm: null,
          rightHand: null,
          leftArm: null,
        },
      };

      if (actions.idle) {
        this.transitionToClip(this.rigs.savitri_hub, 'idle', 0.05, 0.85, 0, true);
        mixer.update(0.016);
      }
      this.loadProgress = 100;
      this.isReady = true;
    } catch (err) {
      console.warn('Boss3DRenderer Savitri Hub load warning:', err);
      this.loadProgress = 100;
    }
  }

  /**
   * Vaitarani Hub Weaponsmith — Lohakara (`Molten_Forge_Titan`)
   */
  private async loadWeaponsmithHubRig(): Promise<void> {
    try {
      const [forgeGroup, baseTex, normTex, roughTex, metalTex] = await Promise.all([
        loadFbxCached('/models_v2/molten_forge_titan.fbx', false),
        this.loadTex('/models_v2/molten_forge_titan.png', true),
        this.loadTex('/models_v2/molten_forge_titan_normal.png', false),
        this.loadTex('/models_v2/molten_forge_titan_roughness.png', false),
        this.loadTex('/models_v2/molten_forge_titan_metallic.png', false),
      ]);

      if (this.disposed) return;

      const smithMat = createBossPbrMaterial({
        map: baseTex,
        normalMap: normTex,
        roughnessMap: roughTex,
        metalnessMap: metalTex,
        fallbackRoughness: 0.72,
        fallbackMetalness: 0.32,
        normalScale: 0.4,
        emissiveHex: 0x3b1708,
        emissiveIntensity: 0.34,
        rimColorHex: 0xffb347,
        rimStrength: 0.38,
      });

      forgeGroup.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.material = smithMat;
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          mesh.frustumCulled = false;
        }
      });

      applyHadesCelShadingToHierarchy(forgeGroup, {
        rimColor: 0xffb347,
        rimIntensity: 0.38,
        emissiveTint: 0x3b1708,
        emissiveStrength: 0.32,
        outlineRatio: 0.0056,
      });

      const rawBox = new THREE.Box3().setFromObject(forgeGroup);
      const rawH = Math.max(0.01, rawBox.max.y - rawBox.min.y);
      const targetScale = 148 / rawH;

      const smithRoot = new THREE.Group();
      forgeGroup.scale.setScalar(targetScale);
      forgeGroup.position.set(0, -rawBox.min.y * targetScale, 0);
      smithRoot.add(forgeGroup);
      forgeGroup.updateMatrixWorld(true);

      const mixer = new THREE.AnimationMixer(forgeGroup);
      const actions: Partial<Record<BossClipKey, THREE.AnimationAction>> = {};
      if (forgeGroup.animations?.[0]) {
        const act = mixer.clipAction(forgeGroup.animations[0]);
        act.setLoop(THREE.LoopRepeat, Infinity);
        actions.idle = act;
      }

      this.rigs.weaponsmith_hub = {
        root: smithRoot,
        mixer,
        actions,
        activeKey: null,
        materials: [smithMat],
        weaponMaterials: [],
        rightWeaponSocket: null,
        leftWeaponSocket: null,
        weaponTipNode: new THREE.Object3D(),
        weaponBaseNode: new THREE.Object3D(),
        bones: {
          spine1: null,
          spine2: null,
          rightArm: null,
          rightForeArm: null,
          rightHand: null,
          leftArm: null,
        },
      };

      if (actions.idle) {
        this.transitionToClip(this.rigs.weaponsmith_hub, 'idle', 0.05, 0.85, 0, true);
        mixer.update(0.016);
      }
      this.loadProgress = 100;
      this.isReady = true;
    } catch (err) {
      console.warn('Boss3DRenderer Weaponsmith Hub load warning:', err);
      this.loadProgress = 100;
    }
  }

  /**
   * Phase 3 — Dundubhi (`Bellhorn_Warlord` + `Creature Pack (4)`):
   * - Base skeleton: `Creature Pack (4)/Meshy_AI_Bellhorn_Warlord_20261114_generate.fbx`
   * - PBR textures: `3D Models/Bellhorn_Warlord/`
   * - Exact clips: `idle`, `run`, `charge`, `gore` (`mutant swiping`), `slam` (`mutant jump attack`),
   *   `roar` (`mutant roaring`), `stagger` (`mutant flexing muscles`), and `death` (`mutant dying`)
   */
  private async loadDundubhiRig(): Promise<void> {
    try {
      this.loadProgress = Math.max(this.loadProgress, 15);
      // Phase 1 (Fast First Paint): Load ONLY base rig, textured mesh, idle clip & 4 PBR maps so Dundubhi renders in ~2-3s
      const [
        dundubhiGroup,
        dundubhiTexGroup,
        mIdleFbx,
        dunBase,
        dunNorm,
        dunRough,
        dunMetal,
      ] = await Promise.all([
        loadFbxCached(GAME_ASSETS.models3d.dundubhiFbx, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiTextureFbx, false).catch(() => null),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.idle, false).catch(() => null),
        this.loadTex(GAME_ASSETS.models3d.dundubhiTex.baseColor, true),
        this.loadTex(GAME_ASSETS.models3d.dundubhiTex.normal, false),
        this.loadTex(GAME_ASSETS.models3d.dundubhiTex.roughness, false),
        this.loadTex(GAME_ASSETS.models3d.dundubhiTex.metallic, false),
      ]);

      if (this.disposed) return;

      const dundubhiMaterials: Array<THREE.MeshToonMaterial | THREE.MeshStandardMaterial> = [];
      const dunCharMat = createBossPbrMaterial({
        map: dunBase,
        normalMap: dunNorm,
        roughnessMap: dunRough,
        metalnessMap: dunMetal,
        fallbackRoughness: 0.84,
        fallbackMetalness: 0.14,
        normalScale: 0.35,
        emissiveHex: 0x362a20,
        emissiveIntensity: 0.34,
        rimColorHex: 0xffd27d,
        rimStrength: 0.46,
      });
      dundubhiMaterials.push(dunCharMat);

      if (dundubhiTexGroup) {
        bindTexturedGeometryToSkeleton(dundubhiGroup, dundubhiTexGroup, dunCharMat);
      } else {
        dundubhiGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.material = dunCharMat;
            m.frustumCulled = false;
          }
        });
      }
      applyHadesCelShadingToHierarchy(dundubhiGroup, {
        rimColor: 0xffd27d,
        rimIntensity: 0.44,
        emissiveTint: 0x362a20,
        emissiveStrength: 0.30,
        attachInkOutline: true,
        outlineRatio: 0.0058,
      });

      const dunStandingHipY = extractStandingHipY(dundubhiGroup);
      const dunRawBox = new THREE.Box3().setFromObject(dundubhiGroup);
      const dunRawH = Math.max(0.01, dunRawBox.max.y - dunRawBox.min.y);
      const dunScale = 140 / dunRawH;

      const dundubhiRoot = new THREE.Group();
      dundubhiGroup.scale.setScalar(dunScale);
      // Mixamo Creature Pack clips anchor hips.position.y at standingHipY (feet at Y=0).
      // Do NOT add -dunRawBox.min.y * dunScale on rigged Mixamo models or Dundubhi floats in mid-air!
      const dunBaseY = Math.abs(dunStandingHipY) > 0.01 ? 0 : -dunRawBox.min.y * dunScale;
      dundubhiGroup.position.set(0, dunBaseY, 0);
      dundubhiRoot.add(dundubhiGroup);

      const dunBones: BossUpperBodyBones = {
        spine1: dundubhiGroup.getObjectByName('mixamorigSpine1') || null,
        spine2: dundubhiGroup.getObjectByName('mixamorigSpine2') || null,
        rightArm: dundubhiGroup.getObjectByName('mixamorigRightArm') || null,
        rightForeArm: dundubhiGroup.getObjectByName('mixamorigRightForeArm') || null,
        rightHand: dundubhiGroup.getObjectByName('mixamorigRightHand') || null,
        leftArm: dundubhiGroup.getObjectByName('mixamorigLeftArm') || null,
      };

      const dunTipNode = new THREE.Object3D();
      const dunBaseNode = new THREE.Object3D();
      let dunRightSocket: THREE.Group | null = null;
      if (dunBones.rightHand) {
        dunRightSocket = new THREE.Group();
        dunTipNode.position.set(52, 0, 0);
        dunBaseNode.position.set(14, 0, 0);
        dunRightSocket.add(dunTipNode);
        dunRightSocket.add(dunBaseNode);
        dunBones.rightHand.add(dunRightSocket);
      }

      const dunMixer = new THREE.AnimationMixer(dundubhiGroup);
      const dunActions: Partial<Record<BossClipKey, THREE.AnimationAction>> = {};
      const mIdle = mIdleFbx?.animations?.[0] || dundubhiGroup.animations?.[0];

      const regMutant = (
        key: BossClipKey,
        src: THREE.AnimationClip | undefined,
        hipY: number,
        bounce: number,
        loop: boolean
      ) => {
        if (!src) return;
        const clip =
          Math.abs(hipY) > 10
            ? buildMutantInPlaceClip(src, dundubhiGroup, hipY, bounce, `dundubhi_${key}`)
            : buildStabilizedInPlaceClip(src, dundubhiGroup, hipY);
        clip.name = `dundubhi_${key}`;
        const act = dunMixer.clipAction(clip);
        act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        act.clampWhenFinished = !loop;
        dunActions[key] = act;
      };

      const hipY = Math.abs(dunStandingHipY) > 0.01 ? dunStandingHipY : 73.15;
      // Register idle immediately (and fallback aliases until Phase 2 clips finish streaming)
      regMutant('idle', mIdle, hipY, 3.0, true);
      regMutant('run', mIdle, hipY, 3.5, true);
      regMutant('charge', mIdle, hipY, 4.0, true);
      regMutant('gore', mIdle, hipY, 3.5, false);
      regMutant('swipe', mIdle, hipY, 3.5, false);
      regMutant('cleave', mIdle, hipY, 3.5, false);
      regMutant('combo', mIdle, hipY, 3.5, false);
      regMutant('whirlwind', mIdle, hipY, 3.5, false);
      regMutant('roar', mIdle, hipY, 3.5, false);
      regMutant('slam', mIdle, hipY, 4.0, false);
      regMutant('jumpAttack', mIdle, hipY, 4.0, false);
      regMutant('stagger', mIdle, hipY, 2.5, true);
      regMutant('death', mIdle, hipY, 1.5, false);

      this.rigs.dundubhi = {
        root: dundubhiRoot,
        mixer: dunMixer,
        actions: dunActions,
        activeKey: null,
        materials: dundubhiMaterials,
        weaponMaterials: [],
        rightWeaponSocket: dunRightSocket,
        leftWeaponSocket: null,
        weaponTipNode: dunTipNode,
        weaponBaseNode: dunBaseNode,
        bones: dunBones,
      };

      this.transitionToClip(this.rigs.dundubhi, 'idle', 0.05, 1.0, 0, true);
      this.rigs.dundubhi.mixer.update(0.016);
      dundubhiRoot.updateMatrixWorld(true);
      this.loadProgress = 100;
      this.isReady = true;
      this.prewarmBossAtlas('dundubhi');

      // Phase 2 (Non-blocking Background Stream): Attach full Mutant combat animation clips as soon as each arrives
      Promise.allSettled([
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.run, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.gore, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.slam, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.roar, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.stagger, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.death, false),
      ]).then((results) => {
        if (this.disposed || !this.rigs.dundubhi) return;
        const getClip = (idx: number) =>
          results[idx].status === 'fulfilled' ? results[idx].value.animations?.[0] : undefined;
        const mRun = getClip(0) || mIdle;
        const mGore = getClip(1) || mIdle;
        const mSlam = getClip(2) || mGore;
        const mRoar = getClip(3) || mSlam;
        const mStagger = getClip(4) || mRoar;
        const mDeath = getClip(5) || mStagger;

        regMutant('run', mRun, hipY, 4.0, true);
        regMutant('charge', mRun, hipY, 4.5, true);
        regMutant('gore', mGore, hipY, 4.0, false);
        regMutant('swipe', mGore, hipY, 4.0, false);
        regMutant('cleave', mGore, hipY, 4.0, false);
        regMutant('combo', mGore, hipY, 4.0, false);
        regMutant('whirlwind', mRoar, hipY, 4.0, false);
        regMutant('roar', mRoar, hipY, 4.0, false);
        regMutant('slam', mSlam, hipY, 5.0, false);
        regMutant('jumpAttack', mSlam, hipY, 5.5, false);
        regMutant('stagger', mStagger, hipY, 2.5, true);
        regMutant('death', mDeath, hipY, 1.5, false);
        this.frameCache.clear();
      });
    } catch (err) {
      console.warn('Boss3DRenderer Dundubhi load warning:', err);
      this.loadProgress = 100;
    }
  }

  /**
   * Phase 3 — Semi-Boss Sword & Shield (`Horned_Warlord_of_the_Bloodforge_v2` + `Pro Sword and Shield Pack`):
   * - Pair `Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_generate.fbx` + `Pro Sword and Shield Pack` clips
   * - Socket `Molten_Oni_Aegis` onto `LeftHand`/`LeftForeArm` and `Crescent_Reaver` onto `RightHand`
   */
  private async loadSemiBossRig(): Promise<void> {
    try {
      const cfg = GAME_ASSETS.models3d.semiBossBloodforge;
      // Phase 1 (Fast First Paint): Load ONLY base rig, textured mesh, core idle/run/slash1 clips,
      // sword, shield, and diffuse maps so Temple Guardian spawns whole & bright within ~2s!
      const [
        semiGroup,
        semiTexGroup,
        sIdleFbx,
        sRunFbx,
        sSlash1Fbx,
        swordFbx,
        shieldFbx,
        semiBase,
        swordTex,
        shieldTex,
      ] = await Promise.all([
        loadFbxCached(cfg.riggedFbx, false),
        loadFbxCached(cfg.textureFbx, false).catch(() => null),
        loadFbxCached(cfg.anims.idle, false).catch(() => null),
        loadFbxCached(cfg.anims.run, false).catch(() => null),
        loadFbxCached(cfg.anims.slash1, false).catch(() => null),
        loadFbxCached(cfg.swordFbx, true).catch(() => null),
        loadFbxCached(cfg.shieldFbx, true).catch(() => null),
        this.loadTex(cfg.textures.baseColor, true),
        this.loadTex(cfg.swordTex.baseColor, true),
        this.loadTex(cfg.shieldTex.baseColor, true),
      ]);

      if (this.disposed) return;

      const semiCharMat = createBossPbrMaterial({
        map: semiBase,
        fallbackRoughness: 0.84,
        fallbackMetalness: 0.14,
        normalScale: 0.35,
        emissiveHex: 0x302624,
        emissiveIntensity: 0.30,
        rimColorHex: 0xffe4b8,
        rimStrength: 0.42,
      });

      if (semiTexGroup) {
        bindTexturedGeometryToSkeleton(semiGroup, semiTexGroup, semiCharMat);
      } else {
        semiGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.material = semiCharMat;
            m.frustumCulled = false;
          }
        });
      }
      applyHadesCelShadingToHierarchy(semiGroup, {
        rimColor: 0xffe4b8,
        rimIntensity: 0.42,
        emissiveTint: 0x302624,
        emissiveStrength: 0.30,
        attachInkOutline: true,
        outlineRatio: 0.0056,
      });

      const semiStandingHipY = extractStandingHipY(semiGroup);
      const semiRawBox = new THREE.Box3().setFromObject(semiGroup);
      const semiRawH = Math.max(0.01, semiRawBox.max.y - semiRawBox.min.y);
      const semiScale = 144 / semiRawH;

      const semiRoot = new THREE.Group();
      semiGroup.scale.setScalar(semiScale);
      // Mixamo Pro Sword & Shield clips anchor hips at standingHipY (feet at Y=0).
      // Removing the double -semiRawBox.min.y lift fixes the half-cut head & floating torso!
      const semiBaseY = Math.abs(semiStandingHipY) > 0.01 ? 0 : -semiRawBox.min.y * semiScale;
      semiGroup.position.set(0, semiBaseY, 0);
      semiRoot.add(semiGroup);
      semiGroup.updateMatrixWorld(true);

      const findSemiBone = (names: string[]): THREE.Object3D | null => {
        for (const n of names) {
          const found = semiGroup.getObjectByName(n);
          if (found) return found;
        }
        let matched: THREE.Object3D | null = null;
        semiGroup.traverse((obj) => {
          if (matched) return;
          const lower = obj.name.toLowerCase();
          if (names.some((n) => lower.endsWith(n.toLowerCase()))) {
            matched = obj;
          }
        });
        return matched;
      };

      const semiBones: BossUpperBodyBones = {
        spine1: findSemiBone(['mixamorigSpine1', 'Spine1']),
        spine2: findSemiBone(['mixamorigSpine2', 'Spine2']),
        rightArm: findSemiBone(['mixamorigRightArm', 'RightArm']),
        rightForeArm: findSemiBone(['mixamorigRightForeArm', 'RightForeArm']),
        rightHand: findSemiBone(['mixamorigRightHand', 'RightHand']),
        leftArm: findSemiBone(['mixamorigLeftArm', 'LeftArm']),
      };

      const semiTipNode = new THREE.Object3D();
      const semiBaseNode = new THREE.Object3D();
      let semiRightSocket: THREE.Group | null = null;
      let semiLeftSocket: THREE.Group | null = null;
      const wepMaterials: Array<THREE.MeshToonMaterial | THREE.MeshStandardMaterial> = [];

      // Socket Emberfang Sword onto RightHand
      if (semiBones.rightHand && swordFbx) {
        const handScaleVec = new THREE.Vector3();
        semiBones.rightHand.getWorldScale(handScaleVec);
        const handScale = Math.max(1e-5, handScaleVec.x);

        const swordMat = createBossPbrMaterial({
          map: swordTex,
          fallbackRoughness: 0.72,
          fallbackMetalness: 0.24,
          normalScale: 0.45,
          emissiveHex: 0x2b221e,
          emissiveIntensity: 0.28,
          rimColorHex: 0xfde68a,
          rimStrength: 0.40,
        });
        wepMaterials.push(swordMat);

        const rightWepGroup = swordFbx.clone(true);
        rightWepGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.material = swordMat;
            m.frustumCulled = false;
          }
        });
        const wepBox = new THREE.Box3().setFromObject(rightWepGroup);
        const wepSize = new THREE.Vector3();
        wepBox.getSize(wepSize);
        const maxDim = Math.max(0.001, wepSize.x, wepSize.y, wepSize.z);
        const desiredWorldLen = 96;
        const localWepScale = desiredWorldLen / (maxDim * handScale);

        semiRightSocket = new THREE.Group();
        rightWepGroup.scale.setScalar(localWepScale);
        rightWepGroup.rotation.set(-Math.PI * 0.5, 0, -Math.PI * 0.5);
        rightWepGroup.position.set(0.24 * maxDim * localWepScale, 0, 0);

        semiTipNode.position.set(0.45 * maxDim * localWepScale, 0, 0);
        semiBaseNode.position.set(0.12 * maxDim * localWepScale, 0, 0);
        semiRightSocket.add(semiTipNode);
        semiRightSocket.add(semiBaseNode);
        semiRightSocket.add(rightWepGroup);

        applyHadesCelShadingToHierarchy(semiRightSocket, {
          rimColor: 0xfde68a,
          rimIntensity: 0.40,
          emissiveTint: 0x2b221e,
          emissiveStrength: 0.28,
          attachInkOutline: true,
          outlineRatio: 0.0062,
        });
        semiBones.rightHand.add(semiRightSocket);
      }

      // Socket Molten_Oni_Aegis Shield onto LeftForeArm / LeftHand
      const leftArmBone = findSemiBone([
        'mixamorigLeftForeArm',
        'LeftForeArm',
        'mixamorigLeftHand',
        'LeftHand',
      ]);
      if (leftArmBone && shieldFbx) {
        const armScaleVec = new THREE.Vector3();
        leftArmBone.getWorldScale(armScaleVec);
        const armScale = Math.max(1e-5, armScaleVec.x);

        const shieldMat = createBossPbrMaterial({
          map: shieldTex,
          fallbackRoughness: 0.72,
          fallbackMetalness: 0.28,
          normalScale: 0.45,
          emissiveHex: 0x2b221e,
          emissiveIntensity: 0.28,
          rimColorHex: 0xfdba74,
          rimStrength: 0.38,
        });
        wepMaterials.push(shieldMat);

        const shieldGroup = shieldFbx.clone(true);
        shieldGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.material = shieldMat;
            m.frustumCulled = false;
          }
        });
        const shBox = new THREE.Box3().setFromObject(shieldGroup);
        const shSize = new THREE.Vector3();
        shBox.getSize(shSize);
        const maxDim = Math.max(0.001, shSize.x, shSize.y, shSize.z);
        const desiredShieldLen = 68;
        const localShieldScale = desiredShieldLen / (maxDim * armScale);

        semiLeftSocket = new THREE.Group();
        shieldGroup.scale.setScalar(localShieldScale);
        shieldGroup.rotation.set(0, Math.PI * 0.5, 0);
        shieldGroup.position.set(-0.08 * maxDim * localShieldScale, 0, 0.14 * maxDim * localShieldScale);
        semiLeftSocket.add(shieldGroup);
        semiLeftSocket.visible = true;
        applyHadesCelShadingToHierarchy(semiLeftSocket, {
          rimColor: 0xfdba74,
          rimIntensity: 0.38,
          emissiveTint: 0x2b221e,
          emissiveStrength: 0.28,
          attachInkOutline: true,
          outlineRatio: 0.0062,
        });
        leftArmBone.add(semiLeftSocket);
      }

      const semiMixer = new THREE.AnimationMixer(semiGroup);
      const semiActions: Partial<Record<BossClipKey, THREE.AnimationAction>> = {};

      const regSemi = (
        key: BossClipKey,
        src: THREE.AnimationClip | undefined,
        loop: boolean
      ) => {
        if (!src) return;
        const processed = buildStabilizedInPlaceClip(src, semiGroup, semiStandingHipY);
        if (processed.tracks.length === 0) return;
        processed.name = `semi_boss_${key}`;
        const act = semiMixer.clipAction(processed);
        act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        act.clampWhenFinished = !loop;
        semiActions[key] = act;
      };

      const sIdle = sIdleFbx?.animations?.[0] || semiGroup.animations?.[0];
      const sRun = sRunFbx?.animations?.[0] || sIdle;
      const sSlash1 = sSlash1Fbx?.animations?.[0] || sRun;

      // Register Phase 1 core clips immediately so Temple Guardian animates cleanly from frame 1
      regSemi('idle', sIdle, true);
      regSemi('run', sRun, true);
      regSemi('charge', sRun, true);
      regSemi('swipe', sSlash1, false);
      regSemi('cleave', sSlash1, false);
      regSemi('combo', sSlash1, false);
      regSemi('whirlwind', sSlash1, false);
      regSemi('roar', sSlash1, false);
      regSemi('slam', sSlash1, false);
      regSemi('jumpAttack', sSlash1, false);
      regSemi('block', sIdle, true);
      regSemi('stagger', sIdle, true);
      regSemi('death', sIdle, false);

      this.rigs.semi_boss = {
        root: semiRoot,
        mixer: semiMixer,
        actions: semiActions,
        activeKey: null,
        materials: [semiCharMat],
        weaponMaterials: wepMaterials,
        rightWeaponSocket: semiRightSocket,
        leftWeaponSocket: semiLeftSocket,
        weaponTipNode: semiTipNode,
        weaponBaseNode: semiBaseNode,
        bones: semiBones,
      };

      this.transitionToClip(this.rigs.semi_boss, 'idle', 0.05, 1.0, 0, true);
      this.rigs.semi_boss.mixer.update(0.016);
      semiRoot.updateMatrixWorld(true);
      this.isReady = true;
      this.prewarmBossAtlas('semi_boss');

      // Phase 2 (Non-blocking Background Stream): Attach remaining sword & shield clips
      Promise.allSettled([
        loadFbxCached(cfg.anims.slash2, false),
        loadFbxCached(cfg.anims.slash3, false),
        loadFbxCached(cfg.anims.attack1, false),
        loadFbxCached(cfg.anims.blockIdle, false),
        loadFbxCached(cfg.anims.impact, false),
        loadFbxCached(cfg.anims.powerUp, false),
        loadFbxCached(cfg.anims.death, false),
      ]).then((results) => {
        if (this.disposed || !this.rigs.semi_boss) return;
        const getClip = (idx: number) =>
          results[idx].status === 'fulfilled' ? results[idx].value.animations?.[0] : undefined;
        const sSlash2 = getClip(0) || sSlash1;
        const sSlash3 = getClip(1) || sSlash2;
        const sAtk1 = getClip(2) || sSlash1;
        const sBlock = getClip(3) || sIdle;
        const sImpact = getClip(4) || sBlock;
        const sPowerUp = getClip(5) || sAtk1;
        const sDeath = getClip(6) || sImpact;

        regSemi('cleave', sSlash2, false);
        regSemi('combo', sSlash3, false);
        regSemi('whirlwind', sPowerUp, false);
        regSemi('roar', sPowerUp, false);
        regSemi('slam', sAtk1, false);
        regSemi('jumpAttack', sAtk1, false);
        regSemi('block', sBlock, true);
        regSemi('stagger', sImpact, true);
        regSemi('death', sDeath, false);
        this.frameCache.clear();
      });
    } catch (err) {
      console.warn('Boss3DRenderer Semi-Boss load warning:', err);
    }
  }

  /**
   * Phase 3 — Vrikodara (`Crimson_Skull_Warlord_v2` + `Pro Melee Axe Pack (5)`):
   * - Pair `Meshy_AI_Crimson_Skull_Warlord_20261030_generate.fbx` + `Crimson_Skull_Warlord_20261030_texture_fbx` PBR maps
   * - Animations from `Pro Melee Axe Pack (5)` (`downwardSmash`, `cleave360`, `battlecry` Vacuum Roar, `chestThump`, `reactGut`, `block`, `death`)
   * - Socket `Embermaw_Mace` in Phase 1 and swap/dual-wield `Bloodforged_Trident_Axe` in Phase 2 Blood Eclipse
   */
  private async loadVrikodaraRig(): Promise<void> {
    try {
      this.loadProgress = Math.max(this.loadProgress, 15);
      const wepBase = '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx';
      const vAnims = GAME_ASSETS.models3d.vrikodaraAnims;

      // Phase 1 (Fast First Paint): Load ONLY Vrikodara base rig, textured mesh, idle clip, Phase 1 Mace & essential PBR maps
      const [
        vrikodaraGroup,
        vrikodaraTexGroup,
        vIdleFbx,
        maceFbx,
        vrikBase,
        vrikNorm,
        vrikRough,
        vrikMetal,
        maceTex,
        maceNorm,
      ] = await Promise.all([
        loadFbxCached(GAME_ASSETS.models3d.vrikodaraFbx, false),
        loadFbxCached(GAME_ASSETS.models3d.vrikodaraTextureFbx, false).catch(() => null),
        loadFbxCached(vAnims.idle, false).catch(() => null),
        loadFbxCached(GAME_ASSETS.models3d.embermawMaceFbx, true).catch(() => null),
        this.loadTex(GAME_ASSETS.models3d.vrikodaraTex.baseColor, true),
        this.loadTex(GAME_ASSETS.models3d.vrikodaraTex.normal, false),
        this.loadTex(GAME_ASSETS.models3d.vrikodaraTex.roughness, false),
        this.loadTex(GAME_ASSETS.models3d.vrikodaraTex.metallic, false),
        this.loadTex(GAME_ASSETS.models3d.embermawMaceTex.baseColor, true),
        this.loadTex(GAME_ASSETS.models3d.embermawMaceTex.normal, false),
      ]);

      if (this.disposed) return;

      const vrikStandingHipY = extractStandingHipY(vrikodaraGroup);
      const vrikRawBox = new THREE.Box3().setFromObject(vrikodaraGroup);
      const vrikRawH = Math.max(0.01, vrikRawBox.max.y - vrikRawBox.min.y);
      const vrikScale = 148 / vrikRawH;

      const vrikodaraRoot = new THREE.Group();
      vrikodaraGroup.scale.setScalar(vrikScale);
      const vrikBaseY = Math.abs(vrikStandingHipY) > 0.01 ? 0 : -vrikRawBox.min.y * vrikScale;
      vrikodaraGroup.position.set(0, vrikBaseY, 0);
      vrikodaraRoot.add(vrikodaraGroup);

      const vrikMaterials: Array<THREE.MeshToonMaterial | THREE.MeshStandardMaterial> = [];
      const vrikMaceMat = createBossPbrMaterial({
        map: maceTex,
        normalMap: maceNorm,
        fallbackRoughness: 0.78,
        fallbackMetalness: 0.18,
        normalScale: 0.45,
        emissiveHex: 0x2b221e,
        emissiveIntensity: 0.28,
        rimColorHex: 0xfdba74,
        rimStrength: 0.40,
      });

      const vrikCharMat = createBossPbrMaterial({
        map: vrikBase,
        normalMap: vrikNorm,
        roughnessMap: vrikRough,
        metalnessMap: vrikMetal,
        fallbackRoughness: 0.88,
        fallbackMetalness: 0.08,
        normalScale: 0.35,
        emissiveHex: 0x302826,
        emissiveIntensity: 0.30,
        rimColorHex: 0xffe4b8,
        rimStrength: 0.42,
      });
      vrikMaterials.push(vrikCharMat);

      if (vrikodaraTexGroup) {
        bindTexturedGeometryToSkeleton(vrikodaraGroup, vrikodaraTexGroup, vrikCharMat);
      } else {
        vrikodaraGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.material = vrikCharMat;
            m.frustumCulled = false;
          }
        });
      }
      applyHadesCelShadingToHierarchy(vrikodaraGroup, {
        rimColor: 0xffe4b8,
        rimIntensity: 0.42,
        emissiveTint: 0x302826,
        emissiveStrength: 0.30,
        attachInkOutline: true,
        outlineRatio: 0.0056,
      });
      vrikodaraGroup.updateMatrixWorld(true);

      const findVrikBone = (names: string[]): THREE.Object3D | null => {
        for (const n of names) {
          const found = vrikodaraGroup.getObjectByName(n);
          if (found) return found;
        }
        let matched: THREE.Object3D | null = null;
        vrikodaraGroup.traverse((obj) => {
          if (matched) return;
          const lower = obj.name.toLowerCase();
          if (names.some((n) => lower.endsWith(n.toLowerCase()))) {
            matched = obj;
          }
        });
        return matched;
      };

      const vrikBones: BossUpperBodyBones = {
        spine1: findVrikBone(['mixamorigSpine1', 'Spine1']),
        spine2: findVrikBone(['mixamorigSpine2', 'Spine2']),
        rightArm: findVrikBone(['mixamorigRightArm', 'RightArm']),
        rightForeArm: findVrikBone(['mixamorigRightForeArm', 'RightForeArm']),
        rightHand: findVrikBone(['mixamorigRightHand', 'RightHand']),
        leftArm: findVrikBone(['mixamorigLeftArm', 'LeftArm']),
      };

      const vrikTipNode = new THREE.Object3D();
      const vrikBaseNode = new THREE.Object3D();
      let vrikRightMaceSocket: THREE.Group | null = null;

      if (vrikBones.rightHand && maceFbx) {
        const handScaleVec = new THREE.Vector3();
        vrikBones.rightHand.getWorldScale(handScaleVec);
        const handScale = Math.max(1e-5, handScaleVec.x);

        const maceGroup = maceFbx.clone(true);
        maceGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.material = vrikMaceMat;
            m.frustumCulled = false;
          }
        });
        const wepBox = new THREE.Box3().setFromObject(maceGroup);
        const wepSize = new THREE.Vector3();
        wepBox.getSize(wepSize);
        const maxDim = Math.max(0.001, wepSize.x, wepSize.y, wepSize.z);
        const desiredWorldLen = 100;
        const localWepScale = desiredWorldLen / (maxDim * handScale);

        vrikRightMaceSocket = new THREE.Group();
        maceGroup.scale.setScalar(localWepScale);
        maceGroup.rotation.set(-Math.PI * 0.5, 0, -Math.PI * 0.5);
        maceGroup.position.set(0.24 * maxDim * localWepScale, 0, 0);

        vrikTipNode.position.set(0.45 * maxDim * localWepScale, 0, 0);
        vrikBaseNode.position.set(0.12 * maxDim * localWepScale, 0, 0);
        vrikRightMaceSocket.add(vrikTipNode);
        vrikRightMaceSocket.add(vrikBaseNode);
        vrikRightMaceSocket.add(maceGroup);

        applyHadesCelShadingToHierarchy(vrikRightMaceSocket, {
          rimColor: 0xfdba74,
          rimIntensity: 0.34,
          emissiveTint: 0x241c1a,
          emissiveStrength: 0.14,
          outlineRatio: 0.0064,
        });
        vrikBones.rightHand.add(vrikRightMaceSocket);
      }

      const vrikMixer = new THREE.AnimationMixer(vrikodaraGroup);
      const vrikActions: Partial<Record<BossClipKey, THREE.AnimationAction>> = {};
      const vIdle = vIdleFbx?.animations?.[0] || vrikodaraGroup.animations?.[0];

      const regVrik = (
        key: BossClipKey,
        src: THREE.AnimationClip | undefined,
        loop: boolean
      ) => {
        if (!src) return;
        const processed = buildStabilizedInPlaceClip(src, vrikodaraGroup, vrikStandingHipY);
        if (processed.tracks.length === 0) return;
        processed.name = `vrikodara_${key}`;
        const act = vrikMixer.clipAction(processed);
        act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        act.clampWhenFinished = !loop;
        vrikActions[key] = act;
      };

      // Register idle immediately + temporary aliases so Vrikodara renders right away
      regVrik('idle', vIdle, true);
      regVrik('run', vIdle, true);
      regVrik('charge', vIdle, true);
      regVrik('swipe', vIdle, false);
      regVrik('cleave', vIdle, false);
      regVrik('combo', vIdle, false);
      regVrik('whirlwind', vIdle, false);
      regVrik('roar', vIdle, false);
      regVrik('slam', vIdle, false);
      regVrik('jumpAttack', vIdle, false);
      regVrik('block', vIdle, true);
      regVrik('stagger', vIdle, true);
      regVrik('death', vIdle, false);

      this.rigs.vrikodara = {
        root: vrikodaraRoot,
        mixer: vrikMixer,
        actions: vrikActions,
        activeKey: null,
        materials: vrikMaterials,
        weaponMaterials: [vrikMaceMat],
        rightWeaponSocket: vrikRightMaceSocket,
        rightPhase2WeaponSocket: null,
        leftWeaponSocket: null,
        weaponTipNode: vrikTipNode,
        weaponBaseNode: vrikBaseNode,
        bones: vrikBones,
      };

      this.transitionToClip(this.rigs.vrikodara, 'idle', 0.05, 1.0, 0, true);
      this.rigs.vrikodara.mixer.update(0.016);
      vrikodaraRoot.updateMatrixWorld(true);
      this.loadProgress = 100;
      this.isReady = true;
      this.prewarmBossAtlas('vrikodara');

      // Phase 2 (Non-blocking Background Stream): Combat clips + Phase 2 dual-wield Bloodforged Trident-Axes
      Promise.allSettled([
        loadFbxCached(vAnims.run, false),
        loadFbxCached(vAnims.downwardSmash, false),
        loadFbxCached(vAnims.cleave360, false),
        loadFbxCached(vAnims.battlecry, false),
        loadFbxCached(vAnims.chestThump, false),
        loadFbxCached(vAnims.reactGut, false),
        loadFbxCached(vAnims.block, false),
        loadFbxCached(vAnims.death, false),
        loadFbxCached(GAME_ASSETS.models3d.tridentFbx, true),
        this.loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png`, true),
        this.loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_normal.png`, false),
      ]).then((res) => {
        if (this.disposed || !this.rigs.vrikodara) return;
        const getFbx = (i: number) =>
          res[i].status === 'fulfilled' ? (res[i].value as THREE.Group) : null;
        const vRun = getFbx(0)?.animations?.[0] || vIdle;
        const vDownward = getFbx(1)?.animations?.[0] || vRun;
        const vSpin = getFbx(2)?.animations?.[0] || vDownward;
        const vBattlecry = getFbx(3)?.animations?.[0] || vSpin;
        const vChestThump = getFbx(4)?.animations?.[0] || vBattlecry;
        const vReactGut = getFbx(5)?.animations?.[0] || vIdle;
        const vBlock = getFbx(6)?.animations?.[0] || vIdle;
        const vDeath = getFbx(7)?.animations?.[0] || vReactGut;

        regVrik('run', vRun, true);
        regVrik('charge', vRun, true);
        regVrik('swipe', vDownward, false);
        regVrik('cleave', vSpin, false);
        regVrik('combo', vChestThump, false);
        regVrik('whirlwind', vSpin, false);
        regVrik('roar', vBattlecry, false);
        regVrik('slam', vDownward, false);
        regVrik('jumpAttack', vDownward, false);
        regVrik('block', vBlock, true);
        regVrik('stagger', vReactGut, true);
        regVrik('death', vDeath, false);

        const tridentFbx = getFbx(8);
        const wepBaseTex = res[9].status === 'fulfilled' ? (res[9].value as THREE.Texture | null) : null;
        const wepNormTex = res[10].status === 'fulfilled' ? (res[10].value as THREE.Texture | null) : null;
        if (tridentFbx) {
          const vrikWepMat = createBossPbrMaterial({
            map: wepBaseTex,
            normalMap: wepNormTex,
            fallbackRoughness: 0.92,
            fallbackMetalness: 0.0,
            normalScale: 0.45,
            emissiveHex: 0x241c1a,
            emissiveIntensity: 0.14,
            rimColorHex: 0xfecaca,
            rimStrength: 0.34,
          });
          this.rigs.vrikodara.weaponMaterials.push(vrikWepMat);

          if (vrikBones.rightHand) {
            const handScaleVec = new THREE.Vector3();
            vrikBones.rightHand.getWorldScale(handScaleVec);
            const handScale = Math.max(1e-5, handScaleVec.x);
            const rightTridentGroup = tridentFbx.clone(true);
            rightTridentGroup.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const m = child as THREE.Mesh;
                m.material = vrikWepMat;
                m.frustumCulled = false;
              }
            });
            const wepBox = new THREE.Box3().setFromObject(rightTridentGroup);
            const wepSize = new THREE.Vector3();
            wepBox.getSize(wepSize);
            const maxDim = Math.max(0.001, wepSize.x, wepSize.y, wepSize.z);
            const localWepScale = 108 / (maxDim * handScale);
            const socket = new THREE.Group();
            rightTridentGroup.scale.setScalar(localWepScale);
            rightTridentGroup.rotation.set(-Math.PI * 0.5, 0, -Math.PI * 0.5);
            rightTridentGroup.position.set(0.26 * maxDim * localWepScale, 0, 0);
            socket.add(rightTridentGroup);
            socket.visible = false;
            applyHadesCelShadingToHierarchy(socket, {
              rimColor: 0xfecaca,
              rimIntensity: 0.34,
              emissiveTint: 0x241c1a,
              emissiveStrength: 0.12,
              outlineRatio: 0.0064,
            });
            vrikBones.rightHand.add(socket);
            this.rigs.vrikodara.rightPhase2WeaponSocket = socket;
          }

          const vrikLeftHand = findVrikBone(['mixamorigLeftHand', 'LeftHand']);
          if (vrikLeftHand) {
            const handScaleVec = new THREE.Vector3();
            vrikLeftHand.getWorldScale(handScaleVec);
            const handScale = Math.max(1e-5, handScaleVec.x);
            const leftWepGroup = tridentFbx.clone(true);
            leftWepGroup.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const m = child as THREE.Mesh;
                m.material = vrikWepMat;
                m.frustumCulled = false;
              }
            });
            const wepBox = new THREE.Box3().setFromObject(leftWepGroup);
            const wepSize = new THREE.Vector3();
            wepBox.getSize(wepSize);
            const maxDim = Math.max(0.001, wepSize.x, wepSize.y, wepSize.z);
            const localWepScale = 96 / (maxDim * handScale);
            const leftSocket = new THREE.Group();
            leftWepGroup.scale.setScalar(localWepScale);
            leftWepGroup.rotation.set(-Math.PI * 0.5, 0, Math.PI * 0.5);
            leftWepGroup.position.set(-0.26 * maxDim * localWepScale, 0, 0);
            leftSocket.add(leftWepGroup);
            leftSocket.visible = false;
            applyHadesCelShadingToHierarchy(leftSocket, {
              rimColor: 0xfecaca,
              rimIntensity: 0.34,
              emissiveTint: 0x241c1a,
              emissiveStrength: 0.12,
              outlineRatio: 0.0064,
            });
            vrikLeftHand.add(leftSocket);
            this.rigs.vrikodara.leftWeaponSocket = leftSocket;
          }
        }
        this.frameCache.clear();
      });
    } catch (err) {
      console.warn('Boss3DRenderer Vrikodara load warning:', err);
      this.loadProgress = 100;
    }
  }

  private transitionToClip(
    rig: LoadedBossRig,
    key: BossClipKey,
    fadeDuration = 0.14,
    timeScale = 1.0,
    startTimeOffset = 0,
    forceRestart = false
  ): void {
    const nextAction = rig.actions[key] || rig.actions.idle;
    if (!nextAction) return;

    if (rig.activeKey === key && !forceRestart) {
      nextAction.setEffectiveTimeScale(timeScale);
      return;
    }

    const prevAction = rig.activeKey ? rig.actions[rig.activeKey] : null;

    for (const act of Object.values(rig.actions)) {
      if (act && act !== nextAction && act !== prevAction) {
        act.stop();
        act.enabled = false;
        act.setEffectiveWeight(0);
      }
    }

    nextAction.reset();
    nextAction.enabled = true;
    nextAction.setEffectiveTimeScale(timeScale);
    nextAction.setEffectiveWeight(1);
    if (startTimeOffset > 0) {
      nextAction.time = startTimeOffset;
    }
    nextAction.play();

    if (prevAction && prevAction !== nextAction) {
      prevAction.crossFadeTo(nextAction, fadeDuration, false);
    }

    rig.activeKey = key;
    this.clipAnimTime = startTimeOffset;
  }

  private selectDesiredClip(params: Boss3DUpdateParams, dt: number): BossClipKey {
    if (params.aiState === 'ko') {
      this.lockedAttackClip = null;
      return 'death';
    }
    if (params.isPostureBroken) {
      this.lockedAttackClip = null;
      return 'stagger';
    }
    if (params.isParrying && params.kind === 'semi_boss') {
      return 'block';
    }

    if (params.aiState === 'windup' || params.aiState === 'attack') {
      if (this.lockedAttackClip && params.aiState === 'attack') {
        return this.lockedAttackClip;
      }
      const pat = (params.attackPattern ?? 0) % 6;
      let chosen: BossClipKey = 'swipe';
      if (params.attackKind === 'corridor') {
        chosen = params.kind === 'dundubhi' ? 'charge' : 'jumpAttack';
      } else if (params.attackKind === 'shockwave') {
        chosen = pat === 3 ? 'whirlwind' : pat === 4 ? 'roar' : 'slam';
      } else {
        chosen =
          params.kind === 'dundubhi'
            ? 'gore'
            : pat === 2
              ? 'combo'
              : pat % 2 === 0
                ? 'swipe'
                : 'cleave';
      }
      this.lockedAttackClip = chosen;
      return chosen;
    }

    if (params.aiState === 'recover' && this.lockedAttackClip && this.attackSwingTimer > 0.08) {
      return this.lockedAttackClip;
    }
    this.lockedAttackClip = null;

    const speed = Math.hypot(params.vx, params.vy);
    if (speed > 22) {
      this.locomotionRunning = true;
      this.idleHysteresisTimer = 0.22;
      return speed > 215 ? 'charge' : 'run';
    }
    if (this.locomotionRunning) {
      if (speed < 10) {
        this.idleHysteresisTimer = Math.max(0, this.idleHysteresisTimer - dt);
        if (this.idleHysteresisTimer <= 0) {
          this.locomotionRunning = false;
        } else {
          return 'run';
        }
      } else {
        return 'run';
      }
    }

    return 'idle';
  }

  public updateAndRender(params: Boss3DUpdateParams): boolean {
    if (!this.renderer) return false;
    this.ensureBossLoaded(params.kind);
    const rig = this.rigs[params.kind];
    if (!rig) return false;

    if (this.activeKind !== params.kind) {
      if (this.activeKind && this.rigs[this.activeKind]) {
        this.scene.remove(this.rigs[this.activeKind]!.root);
      }
      // Flush old combat boss frames on boss transition so Chamber 4/8 RAM never spikes,
      // while letting Savitri & Lohakara share the cache cleanly in Vaitarani Hub!
      const isHubPair =
        (this.activeKind === 'savitri_hub' || this.activeKind === 'weaponsmith_hub') &&
        (params.kind === 'savitri_hub' || params.kind === 'weaponsmith_hub');
      if (!isHubPair) {
        this.frameCache.clear();
      }
      this.scene.add(rig.root);
      this.activeKind = params.kind;
      this.trailSamples.length = 0;
      this.lockedAttackClip = null;
      this.lastAiState = 'idle';
    }

    const dt = Math.min(0.05, Math.max(0.001, params.dt));
    this.elapsedTime += dt;

    // Frame-rate optimization: throttle software WebGL offscreen re-renders to 45 FPS while keeping main game at 60 FPS
    if (
      IS_SOFTWARE_WEBGL &&
      !params.isHitFlash &&
      !params.bypassSoftwareThrottle &&
      this.elapsedTime - this.lastRenderTime < 0.022
    ) {
      return true;
    }
    this.lastRenderTime = this.elapsedTime;

    const speed = Math.hypot(params.vx, params.vy);
    const phaseBoost = 1 + (params.phase - 1) * 0.10;

    if (params.kind === 'vrikodara') {
      const isPhase2OrHigher = params.phase >= 2;
      if (rig.rightWeaponSocket) {
        rig.rightWeaponSocket.visible = !isPhase2OrHigher;
      }
      if (rig.rightPhase2WeaponSocket) {
        rig.rightPhase2WeaponSocket.visible = isPhase2OrHigher;
      }
      if (rig.leftWeaponSocket) {
        rig.leftWeaponSocket.visible = isPhase2OrHigher;
      }
    } else if (params.kind === 'semi_boss') {
      if (rig.leftWeaponSocket) {
        rig.leftWeaponSocket.visible = true;
      }
    }

    const targetScale = params.kind === 'vrikodara' && params.phase >= 2 ? 1.12 : 1.0;
    const currentScale = rig.root.scale.x || 1.0;
    rig.root.scale.setScalar(currentScale + (targetScale - currentScale) * Math.min(1, dt * 6));

    const prevAiState = this.lastAiState;
    const enteredWindup = params.aiState === 'windup' && prevAiState !== 'windup';
    const enteredAttack = params.aiState === 'attack' && prevAiState !== 'attack';
    this.lastAiState = params.aiState;

    if (enteredWindup) {
      this.lockedAttackClip = null;
    }
    if (enteredAttack) {
      this.attackSwingDuration = params.attackKind === 'shockwave' ? 0.52 : 0.40;
      this.attackSwingTimer = this.attackSwingDuration;
    }
    if (this.attackSwingTimer > 0) {
      this.attackSwingTimer = Math.max(0, this.attackSwingTimer - dt);
    }

    const desiredClip = this.selectDesiredClip(params, dt);

    let targetTimeScale = 1.0 * phaseBoost;
    if (params.aiState === 'windup') {
      targetTimeScale = (0.72 + params.windupProgress * 0.35) * phaseBoost;
    } else if (params.aiState === 'attack') {
      targetTimeScale = 1.42 * phaseBoost;
    } else if (desiredClip === 'run' || desiredClip === 'charge') {
      targetTimeScale = Math.min(1.45, Math.max(0.88, speed / 150)) * phaseBoost;
    } else if (desiredClip === 'stagger') {
      targetTimeScale = 0.45;
    }

    const forceRestart = (enteredWindup && !params.chargeImpactReady) ||
      (enteredAttack && prevAiState !== 'windup');
    const startOffset = enteredWindup ? 0.08 : 0;

    if (forceRestart || rig.activeKey !== desiredClip) {
      this.transitionToClip(
        rig,
        desiredClip,
        enteredWindup ? 0.12 : 0.16,
        targetTimeScale,
        startOffset,
        forceRestart
      );
    } else {
      this.transitionToClip(rig, desiredClip, 0.14, targetTimeScale, 0, false);
    }

    let aimDx = Math.cos(params.aimAngle);
    let aimDy = Math.sin(params.aimAngle);
    if (params.aiState === 'chase' && speed > 24) {
      aimDx = params.vx;
      aimDy = params.vy;
    }
    if (Math.hypot(aimDx, aimDy) > 0.001) {
      this.targetYaw = Math.atan2(aimDx, aimDy);
    } else {
      this.targetYaw = Math.atan2(params.facing, 0.35);
    }

    let angleDiff = this.targetYaw - this.currentYaw;
    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
    const turnSpeed = params.aiState === 'attack' || params.aiState === 'windup' ? 24 : 14;
    this.currentYaw += angleDiff * Math.min(1, turnSpeed * dt);

    // Compute Hades 2D Stepped Sprite-Sheet Frame Key (12 directions x 10 steps for smooth 60 FPS caching)
    this.clipAnimTime += dt * targetTimeScale;
    const isBossAction =
      params.aiState === 'windup' ||
      params.aiState === 'attack' ||
      this.attackSwingTimer > 0;
    const activeAction = rig.actions[rig.activeKey || desiredClip];
    const clipDuration = Math.max(0.25, activeAction?.getClip().duration || 1.0);
    const isSoft = IS_SOFTWARE_WEBGL || isSoftwareWebGLRenderer();
    const { frameKey: baseKey, quantizedYaw } = computeSpriteSheetFrameKey({
      id: params.kind,
      animName: rig.activeKey || desiredClip,
      animTime: this.clipAnimTime,
      clipDuration,
      yawRad: this.currentYaw,
      isAttacking: isBossAction,
      isHurt: Boolean(params.isHitFlash),
      isParrying: Boolean(params.isParrying),
      phase: params.phase,
      yawDirections: isSoft ? 4 : 12,
      stepsPerClip: isSoft ? 4 : 10,
    });
    const actionSubStep =
      params.aiState === 'windup'
        ? `w${Math.round(params.windupProgress * (isSoft ? 2 : 4))}`
        : params.aiState === 'attack'
          ? `a${Math.round((1 - this.attackSwingTimer / Math.max(0.05, this.attackSwingDuration)) * (isSoft ? 2 : 6))}`
          : 'loc';
    const flashSuffix = params.isHitFlash ? 'flash' : 'norm';
    const frameKey = `${baseKey}:${actionSubStep}:${flashSuffix}`;

    const cached = this.frameCache.get(frameKey);
    if (cached) {
      this.canvas = cached;
      rig.mixer.update(dt);
      return true;
    }

    // Fast-path: if hitFlash is active and the un-flashed norm frame is already cached, apply warm amber-gold emissive tint without skipping or re-rendering WebGL
    if (params.isHitFlash) {
      const { frameKey: normBaseKey } = computeSpriteSheetFrameKey({
        id: params.kind,
        animName: rig.activeKey || desiredClip,
        animTime: this.clipAnimTime,
        clipDuration,
        yawRad: this.currentYaw,
        isAttacking: isBossAction,
        isHurt: false,
        isParrying: Boolean(params.isParrying),
        phase: params.phase,
        yawDirections: isSoft ? 4 : 12,
        stepsPerClip: isSoft ? 4 : 10,
      });
      const normKey = `${normBaseKey}:${actionSubStep}:norm`;
      const baseCached = this.frameCache.get(normKey) || this.frameCache.get(`${baseKey}:${actionSubStep}:norm`);
      if (baseCached && typeof document !== 'undefined') {
        const flashCanvas = document.createElement('canvas');
        flashCanvas.width = baseCached.width;
        flashCanvas.height = baseCached.height;
        const fCtx = flashCanvas.getContext('2d');
        if (fCtx) {
          fCtx.drawImage(baseCached, 0, 0);
          fCtx.globalCompositeOperation = 'source-atop';
          fCtx.fillStyle = 'rgba(255, 184, 71, 0.34)';
          fCtx.fillRect(0, 0, flashCanvas.width, flashCanvas.height);
          fCtx.globalCompositeOperation = 'source-over';
          if (this.frameCache.size >= 48) {
            const stale = this.frameCache.keys().next().value;
            if (stale) this.frameCache.delete(stale);
          }
          this.frameCache.set(frameKey, flashCanvas);
          this.canvas = flashCanvas;
          rig.mixer.update(dt);
          return true;
        }
      }
    }

    // Advance base FBX animation mixer
    rig.mixer.update(dt);

    // Apply Rudra-style upper-body weapon swing articulation on Vrikodara and Semi-Boss
    if (params.kind === 'vrikodara' || params.kind === 'semi_boss') {
      if (params.aiState === 'windup') {
        const w = params.windupProgress;
        this.applyProceduralBossPose(rig.bones, -0.32 * w, -0.18 * w, -0.75 * w, -0.35 * w, -0.15 * w);
      } else if (params.aiState === 'attack' || this.attackSwingTimer > 0) {
        const prog =
          this.attackSwingDuration > 0
            ? Math.min(1, 1 - this.attackSwingTimer / this.attackSwingDuration)
            : 0.5;
        const cleave = Math.sin(prog * Math.PI);
        this.applyProceduralBossPose(rig.bones, 0.42 * cleave, 0.24 * cleave, 0.95 * cleave, 0.25 * cleave, 0.32 * cleave);
      }
    }

    // Subtle 360-degree spin during Whirlwind shockwave
    let spinYawOffset = 0;
    const pat = (params.attackPattern ?? 0) % 6;
    if ((params.aiState === 'attack' || this.attackSwingTimer > 0) && params.attackKind === 'shockwave' && pat === 3) {
      const p =
        this.attackSwingDuration > 0
          ? 1 - this.attackSwingTimer / this.attackSwingDuration
          : 0.6;
      spinYawOffset = Math.min(1, p * 1.15) * Math.PI * 2;
    }

    rig.root.rotation.y = quantizedYaw + spinYawOffset;

    const leanTarget =
      params.aiState === 'attack'
        ? 0.14
        : params.aiState === 'windup'
          ? -0.07 * params.windupProgress
          : speed > 110
            ? 0.10
            : 0;
    rig.root.rotation.x = THREE.MathUtils.lerp(
      rig.root.rotation.x,
      leanTarget * Math.cos(quantizedYaw),
      dt * 12
    );
    rig.root.rotation.z = THREE.MathUtils.lerp(
      rig.root.rotation.z,
      -leanTarget * Math.sin(quantizedYaw),
      dt * 12
    );

    // Clean 2D anime phase-tuned edge highlight + crisp hit flash
    const phaseRimHex =
      params.isParrying
        ? 0xffe082
        : params.phase === 3
          ? 0xffb4a2
          : params.phase === 2
            ? 0xffcba4
            : 0xffe4b8;
    const phaseRimStrength =
      params.isParrying ? 0.48 : params.aiState === 'attack' || params.aiState === 'windup' ? 0.38 : 0.28;

    if (params.isParrying) {
      this.rimLight.color.setHex(0xffe082);
      this.rimLight.intensity = 1.25;
    } else if (params.aiState === 'attack' || params.aiState === 'windup') {
      this.rimLight.color.setHex(phaseRimHex);
      this.rimLight.intensity = 1.15;
    } else {
      this.rimLight.color.setHex(phaseRimHex);
      this.rimLight.intensity = 1.05;
    }

    setCelRimStyle(rig.materials, phaseRimHex, phaseRimStrength);
    // Purple-Crimson Blood Demon Art dramatic upward floor under-lighting (zero cyan on Dundubhi!)
    const bossUnderHex =
      params.kind === 'dundubhi'
        ? 0xa855f7
        : params.kind === 'vrikodara'
          ? 0xff1f5a
          : params.kind === 'semi_boss'
            ? 0xff5218
            : params.kind === 'weaponsmith_hub'
              ? 0xff8c2b
              : 0xffe4b8;
    const bossUnderStrength =
      params.kind === 'savitri_hub'
        ? 0.10
        : params.kind === 'weaponsmith_hub'
          ? 0.24
          : params.aiState === 'windup'
            ? 0.44 + params.windupProgress * 0.30
            : params.aiState === 'attack'
              ? 0.66
              : params.phase >= 2
                ? 0.40
                : 0.16;
    setCelUnderGlow(rig.materials, bossUnderHex, bossUnderStrength);
    setCelHitFlash(
      rig.materials,
      params.isHitFlash,
      params.isParrying ? 0x362a16 : 0x262220,
      params.isParrying ? 0.28 : 0.24,
      0xffd86b
    );

    for (const wMat of rig.weaponMaterials) {
      wMat.emissive.setHex(params.phase >= 2 ? 0x3a2018 : 0x262220);
      wMat.emissiveIntensity =
        params.aiState === 'attack' ? 0.34 : params.aiState === 'windup' ? 0.28 : 0.22;
    }

    this.scene.updateMatrixWorld(true);

    const trailActive =
      params.aiState === 'attack' ||
      this.attackSwingTimer > 0.04;
    const trailColor =
      params.phase === 3 ? 0xff4d2e : params.attackKind === 'shockwave' ? 0xff9f2e : 0xe64d3c;
    this.updateWeaponTrail(rig, dt, trailActive, trailColor);

    if (
      this.renderer.domElement.width !== this.size ||
      this.renderer.domElement.height !== this.size
    ) {
      this.renderer.setSize(this.size, this.size, false);
    }
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    const bossRimHex =
      params.kind === 'dundubhi'
        ? params.phase >= 2
          ? 0xfdba74
          : 0xffe4b8
        : params.kind === 'semi_boss'
          ? 0xfecdd3
          : phaseRimHex;
    const bR = (bossRimHex >> 16) & 255;
    const bG = (bossRimHex >> 8) & 255;
    const bB = bossRimHex & 255;
    const baked = bake2DSpriteFrameFromCanvas(this.renderer.domElement, frameKey, {
      role: 'boss',
      rimColor: `rgba(${bR}, ${bG}, ${bB}, 0.36)`,
      outlineColor: '#080509',
      outlineThickness: 2.5,
      hitFlash: params.isHitFlash,
      cacheFrame: false,
    });
    this.canvas = baked;
    if (this.frameCache.size >= 48) {
      const oldest = this.frameCache.keys().next().value;
      if (oldest) this.frameCache.delete(oldest);
    }
    this.frameCache.set(frameKey, baked);
    return true;
  }

  private applyProceduralBossPose(
    bones: BossUpperBodyBones,
    spineYaw: number,
    spinePitch: number,
    _armSweep: number,
    _foreArmBend: number,
    _wristPitch: number
  ): void {
    const rotQ = this.scratchRotQ;
    const euler = this.scratchEuler;

    // Gentle torso lean only — preserves natural Mixamo shoulder/elbow/wrist animations
    if (bones.spine1) {
      euler.set(spinePitch * 0.4, spineYaw * 0.4, 0, 'XYZ');
      rotQ.setFromEuler(euler);
      bones.spine1.quaternion.multiply(rotQ);
    }
    if (bones.spine2) {
      euler.set(spinePitch * 0.45, spineYaw * 0.45, 0, 'XYZ');
      rotQ.setFromEuler(euler);
      bones.spine2.quaternion.multiply(rotQ);
    }
  }

  private updateWeaponTrail(
    rig: LoadedBossRig,
    dt: number,
    active: boolean,
    colorHex: number
  ): void {
    for (let i = this.trailSamples.length - 1; i >= 0; i--) {
      this.trailSamples[i].age += dt;
      if (this.trailSamples[i].age > 0.12) {
        this.trailSamples.splice(i, 1);
      }
    }

    if (active && rig.rightWeaponSocket) {
      rig.weaponTipNode.getWorldPosition(this.scratchTipWorld);
      rig.weaponBaseNode.getWorldPosition(this.scratchBaseWorld);

      this.trailSamples.unshift({
        tip: this.scratchTipWorld.clone(),
        base: this.scratchBaseWorld.clone(),
        age: 0,
      });

      if (this.trailSamples.length > this.maxTrailSamples) {
        this.trailSamples.length = this.maxTrailSamples;
      }
    }

    if (this.trailSamples.length < 2) {
      this.trailMaterial.opacity = 0;
      return;
    }

    this.trailMaterial.color.setHex(colorHex);
    this.trailMaterial.opacity = active ? 0.64 : 0.20;

    const posAttr = this.trailGeometry.getAttribute('position') as THREE.BufferAttribute;
    const count = this.trailSamples.length;

    for (let i = 0; i < this.maxTrailSamples; i++) {
      const sample = this.trailSamples[Math.min(i, count - 1)];
      const idx = i * 6;
      posAttr.array[idx] = sample.tip.x;
      posAttr.array[idx + 1] = sample.tip.y;
      posAttr.array[idx + 2] = sample.tip.z;
      posAttr.array[idx + 3] = sample.base.x;
      posAttr.array[idx + 4] = sample.base.y;
      posAttr.array[idx + 5] = sample.base.z;
    }
    posAttr.needsUpdate = true;
  }

  /**
   * Stage B (Step 10): Pre-bake core boss idle/chase/windup/attack sprite frames lazily on load
   */
  public prewarmBossAtlas(kind: Boss3DKind): void {
    this.ensureBossLoaded(kind);
    const rig = this.rigs[kind];
    if (!rig || !this.renderer || this.prewarmedKinds.has(kind)) return;
    this.prewarmedKinds.add(kind);
    if (IS_SOFTWARE_WEBGL || isSoftwareWebGLRenderer()) return;
    const list = [...buildBossPrewarmParamsList(kind)];
    if (typeof window === 'undefined') {
      for (const params of list) {
        this.updateAndRender(params);
      }
      this.lastRenderTime = -999;
      return;
    }
    const flushChunk = () => {
      if (this.disposed || !this.renderer) return;
      for (let i = 0; i < 2 && list.length > 0; i++) {
        const params = list.shift();
        if (params) this.updateAndRender(params);
      }
      if (list.length > 0) {
        window.setTimeout(flushChunk, 16);
      } else {
        this.lastRenderTime = -999;
      }
    };
    window.setTimeout(flushChunk, 16);
  }

  public dispose(): void {
    this.disposed = true;
    this.frameCache.clear();
    this.prewarmedKinds.clear();
    for (const rig of Object.values(this.rigs)) {
      if (!rig) continue;
      rig.mixer.stopAllAction();
      rig.root.removeFromParent();
      rig.root.clear();
    }
    this.rigs = {};
    this.loadingByKind = {};
    this.trailSamples.length = 0;
    this.scene.clear();
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
    this.renderer = null; // shared WebGL context remains owned by the sprite baker
  }
}
