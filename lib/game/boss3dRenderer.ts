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
  setupSharedStudioLightingRig,
} from './hadesSpriteBaker';
import { GAME_ASSETS } from './assets';

export type Boss3DKind = 'dundubhi' | 'vrikodara' | 'semi_boss';

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
  windupProgress: number;
  phase: 1 | 2 | 3;
  armorCracked: boolean;
  isPostureBroken: boolean;
  isHitFlash: boolean;
  isParrying?: boolean;
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
  materials: THREE.MeshStandardMaterial[];
  weaponMaterials: THREE.MeshStandardMaterial[];
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

  constructor(size = 288) {
    this.size = size;
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;

    this.webglCanvas = document.createElement('canvas');
    this.webglCanvas.width = size;
    this.webglCanvas.height = size;

    this.scene = new THREE.Scene();

    // True 2.5D Hades Dimetric (2:1) Isometric Orthographic Camera (~27° elevation, matching Rudra3DRenderer)
    const frustumHalf = 108;
    this.camera = new THREE.OrthographicCamera(
      -frustumHalf,
      frustumHalf,
      frustumHalf,
      -frustumHalf,
      1,
      1200
    );
    this.camera.position.set(0, 154, 300);
    this.camera.lookAt(0, 84, 0);

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
    const texLoader = new THREE.TextureLoader();
    return new Promise<THREE.Texture | null>((resolve) => {
      if (IS_SOFTWARE_WEBGL && !isColor) {
        resolve(null);
        return;
      }
      texLoader.load(
        encodeURI(url),
        (t) => {
          if (isColor) t.colorSpace = THREE.SRGBColorSpace;
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

  public ensureBossLoaded(kind: Boss3DKind): void {
    if (this.rigs[kind] || this.loadingByKind[kind]) return;
    if (kind === 'dundubhi') {
      this.loadingByKind[kind] = this.loadDundubhiRig();
    } else if (kind === 'semi_boss') {
      this.loadingByKind[kind] = this.loadSemiBossRig();
    } else {
      this.loadingByKind[kind] = this.loadVrikodaraRig();
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
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.idle, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.run, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.gore, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.slam, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.roar, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.stagger, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.death, false),
        this.loadTex(GAME_ASSETS.models3d.dundubhiTex.baseColor, true),
        this.loadTex(GAME_ASSETS.models3d.dundubhiTex.normal, false),
      ]);

      if (this.disposed) return;

      const dundubhiMaterials: THREE.MeshStandardMaterial[] = [];
      const dunCharMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xffffff),
        map: dunBase || undefined,
        normalMap: dunNorm || undefined,
        normalScale: new THREE.Vector2(0.35, 0.35),
        roughness: 0.86,
        metalness: 0.12,
        envMapIntensity: 0.0,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0.0,
      });
      dundubhiMaterials.push(dunCharMat);

      bindTexturedGeometryToSkeleton(dundubhiGroup, dundubhiTexGroup, dunCharMat);
      applyHadesCelShadingToHierarchy(dundubhiGroup);

      const dunStandingHipY = extractStandingHipY(dundubhiGroup);
      const dunRawBox = new THREE.Box3().setFromObject(dundubhiGroup);
      const dunRawH = Math.max(0.01, dunRawBox.max.y - dunRawBox.min.y);
      const dunScale = 156 / dunRawH;

      const dundubhiRoot = new THREE.Group();
      dundubhiGroup.scale.setScalar(dunScale);
      dundubhiGroup.position.set(0, -dunRawBox.min.y * dunScale, 0);
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
      const mIdle = mIdleFbx.animations?.[0] || dundubhiGroup.animations?.[0];
      const mRun = mRunFbx.animations?.[0] || mIdle;
      const mGore = mSwipeFbx.animations?.[0] || mIdle;
      const mSlam = mJumpFbx.animations?.[0] || mGore;
      const mRoar = mRoarFbx.animations?.[0] || mSlam;
      const mStagger = mStaggerFbx.animations?.[0] || mRoar;
      const mDeath = mDeathFbx.animations?.[0] || mStagger;

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
      regMutant('idle', mIdle, hipY, 3.0, true);
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
      this.loadProgress = 100;
      this.isReady = true;
      this.prewarmBossAtlas('dundubhi');
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
        loadFbxCached(cfg.anims.idle, false),
        loadFbxCached(cfg.anims.run, false),
        loadFbxCached(cfg.anims.slash1, false),
        loadFbxCached(cfg.anims.slash2, false),
        loadFbxCached(cfg.anims.slash3, false),
        loadFbxCached(cfg.anims.attack1, false),
        loadFbxCached(cfg.anims.blockIdle, false),
        loadFbxCached(cfg.anims.impact, false),
        loadFbxCached(cfg.anims.powerUp, false),
        loadFbxCached(cfg.anims.death, false),
        loadFbxCached(cfg.swordFbx, true),
        loadFbxCached(cfg.shieldFbx, true),
        this.loadTex(cfg.textures.baseColor, true),
        this.loadTex(cfg.textures.normal, false),
        this.loadTex(cfg.swordTex.baseColor, true),
        this.loadTex(cfg.shieldTex.baseColor, true),
      ]);

      if (this.disposed) return;

      const semiCharMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xffffff),
        map: semiBase || undefined,
        normalMap: semiNorm || undefined,
        normalScale: new THREE.Vector2(0.35, 0.35),
        roughness: 0.84,
        metalness: 0.14,
        envMapIntensity: 0.0,
      });

      bindTexturedGeometryToSkeleton(semiGroup, semiTexGroup, semiCharMat);
      applyHadesCelShadingToHierarchy(semiGroup);

      const semiStandingHipY = extractStandingHipY(semiGroup);
      const semiRawBox = new THREE.Box3().setFromObject(semiGroup);
      const semiRawH = Math.max(0.01, semiRawBox.max.y - semiRawBox.min.y);
      const semiScale = 152 / semiRawH;

      const semiRoot = new THREE.Group();
      semiGroup.scale.setScalar(semiScale);
      semiGroup.position.set(0, -semiRawBox.min.y * semiScale, 0);
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
      const wepMaterials: THREE.MeshStandardMaterial[] = [];

      // Socket Crescent_Reaver Sword onto RightHand
      if (semiBones.rightHand && swordFbx) {
        const handScaleVec = new THREE.Vector3();
        semiBones.rightHand.getWorldScale(handScaleVec);
        const handScale = Math.max(1e-5, handScaleVec.x);

        const swordMat = new THREE.MeshStandardMaterial({
          map: swordTex || undefined,
          roughness: 0.72,
          metalness: 0.24,
          emissive: new THREE.Color(0x3a0c10),
          emissiveIntensity: 0.12,
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

        applyHadesCelShadingToHierarchy(semiRightSocket);
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

        const shieldMat = new THREE.MeshStandardMaterial({
          map: shieldTex || undefined,
          roughness: 0.72,
          metalness: 0.28,
          emissive: new THREE.Color(0x3a0c10),
          emissiveIntensity: 0.10,
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
        applyHadesCelShadingToHierarchy(semiLeftSocket);
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

      const sIdle = sIdleFbx.animations?.[0] || semiGroup.animations?.[0];
      const sRun = sRunFbx.animations?.[0] || sIdle;
      const sSlash1 = sSlash1Fbx.animations?.[0] || sRun;
      const sSlash2 = sSlash2Fbx.animations?.[0] || sSlash1;
      const sSlash3 = sSlash3Fbx.animations?.[0] || sSlash2;
      const sAtk1 = sAttack1Fbx.animations?.[0] || sSlash1;
      const sBlock = sBlockFbx.animations?.[0] || sIdle;
      const sImpact = sImpactFbx.animations?.[0] || sBlock;
      const sPowerUp = sPowerUpFbx.animations?.[0] || sAtk1;
      const sDeath = sDeathFbx.animations?.[0] || sImpact;

      regSemi('idle', sIdle, true);
      regSemi('run', sRun, true);
      regSemi('charge', sRun, true);
      regSemi('swipe', sSlash1, false);
      regSemi('cleave', sSlash2, false);
      regSemi('combo', sSlash3, false);
      regSemi('whirlwind', sPowerUp, false);
      regSemi('roar', sPowerUp, false);
      regSemi('slam', sAtk1, false);
      regSemi('jumpAttack', sAtk1, false);
      regSemi('block', sBlock, true);
      regSemi('stagger', sImpact, true);
      regSemi('death', sDeath, false);

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
      this.isReady = true;
      this.prewarmBossAtlas('semi_boss');
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

      const [
        vrikodaraGroup,
        vrikodaraTexGroup,
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
        wepBaseTex,
        wepNormTex,
      ] = await Promise.all([
        loadFbxCached(GAME_ASSETS.models3d.vrikodaraFbx, false),
        loadFbxCached(GAME_ASSETS.models3d.vrikodaraTextureFbx, false),
        loadFbxCached(vAnims.idle, false),
        loadFbxCached(vAnims.run, false),
        loadFbxCached(vAnims.downwardSmash, false),
        loadFbxCached(vAnims.cleave360, false),
        loadFbxCached(vAnims.battlecry, false),
        loadFbxCached(vAnims.chestThump, false),
        loadFbxCached(vAnims.reactGut, false),
        loadFbxCached(vAnims.block, false),
        loadFbxCached(vAnims.death, false),
        loadFbxCached(GAME_ASSETS.models3d.embermawMaceFbx, true),
        loadFbxCached(GAME_ASSETS.models3d.tridentFbx, true),
        this.loadTex(GAME_ASSETS.models3d.vrikodaraTex.baseColor, true),
        this.loadTex(GAME_ASSETS.models3d.vrikodaraTex.normal, false),
        this.loadTex(GAME_ASSETS.models3d.embermawMaceTex.baseColor, true),
        this.loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png`, true),
        this.loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_normal.png`, false),
      ]);

      if (this.disposed) return;

      const vrikStandingHipY = extractStandingHipY(vrikodaraGroup);
      const vrikRawBox = new THREE.Box3().setFromObject(vrikodaraGroup);
      const vrikRawH = Math.max(0.01, vrikRawBox.max.y - vrikRawBox.min.y);
      const vrikScale = 158 / vrikRawH;

      const vrikodaraRoot = new THREE.Group();
      vrikodaraGroup.scale.setScalar(vrikScale);
      vrikodaraGroup.position.set(0, -vrikRawBox.min.y * vrikScale, 0);
      vrikodaraRoot.add(vrikodaraGroup);

      const vrikMaterials: THREE.MeshStandardMaterial[] = [];
      const vrikMaceMat = new THREE.MeshStandardMaterial({
        map: maceTex || wepBaseTex || undefined,
        roughness: 0.78,
        metalness: 0.18,
        envMapIntensity: 0.0,
        emissive: new THREE.Color(0x38080c),
        emissiveIntensity: 0.16,
      });
      const vrikWepMat = new THREE.MeshStandardMaterial({
        map: wepBaseTex || undefined,
        normalMap: wepNormTex || undefined,
        normalScale: new THREE.Vector2(0.45, 0.45),
        roughness: 0.92,
        metalness: 0.0,
        envMapIntensity: 0.0,
        emissive: new THREE.Color(0x38080c),
        emissiveIntensity: 0.14,
      });

      const vrikCharMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xffffff),
        map: vrikBase || undefined,
        normalMap: vrikNorm || undefined,
        normalScale: new THREE.Vector2(0.35, 0.35),
        roughness: 0.88,
        metalness: 0.08,
        envMapIntensity: 0.0,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0.0,
      });
      vrikMaterials.push(vrikCharMat);

      bindTexturedGeometryToSkeleton(vrikodaraGroup, vrikodaraTexGroup, vrikCharMat);
      applyHadesCelShadingToHierarchy(vrikodaraGroup);
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
      let vrikRightTridentSocket: THREE.Group | null = null;
      let vrikLeftSocket: THREE.Group | null = null;

      if (vrikBones.rightHand) {
        const handScaleVec = new THREE.Vector3();
        vrikBones.rightHand.getWorldScale(handScaleVec);
        const handScale = Math.max(1e-5, handScaleVec.x);

        // Phase 1 RightHand Weapon: Embermaw_Mace
        const rightMaceSource = maceFbx || tridentFbx;
        if (rightMaceSource) {
          const maceGroup = rightMaceSource.clone(true);
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

          applyHadesCelShadingToHierarchy(vrikRightMaceSocket);
          vrikBones.rightHand.add(vrikRightMaceSocket);
        }

        // Phase 2 RightHand Weapon: Bloodforged_Trident_Axe
        if (tridentFbx) {
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
          const desiredWorldLen = 108;
          const localWepScale = desiredWorldLen / (maxDim * handScale);

          vrikRightTridentSocket = new THREE.Group();
          rightTridentGroup.scale.setScalar(localWepScale);
          rightTridentGroup.rotation.set(-Math.PI * 0.5, 0, -Math.PI * 0.5);
          rightTridentGroup.position.set(0.26 * maxDim * localWepScale, 0, 0);
          vrikRightTridentSocket.add(rightTridentGroup);
          vrikRightTridentSocket.visible = false;

          applyHadesCelShadingToHierarchy(vrikRightTridentSocket);
          vrikBones.rightHand.add(vrikRightTridentSocket);
        }
      }

      // Phase 2 LeftHand Dual-Wield Weapon: Bloodforged_Trident_Axe
      const vrikLeftHand = findVrikBone(['mixamorigLeftHand', 'LeftHand']);
      if (vrikLeftHand && tridentFbx) {
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
        const desiredWorldLen = 96;
        const localWepScale = desiredWorldLen / (maxDim * handScale);

        vrikLeftSocket = new THREE.Group();
        leftWepGroup.scale.setScalar(localWepScale);
        leftWepGroup.rotation.set(-Math.PI * 0.5, 0, Math.PI * 0.5);
        leftWepGroup.position.set(-0.26 * maxDim * localWepScale, 0, 0);

        vrikLeftSocket.add(leftWepGroup);
        vrikLeftSocket.visible = false;
        applyHadesCelShadingToHierarchy(vrikLeftSocket);
        vrikLeftHand.add(vrikLeftSocket);
      }

      const vrikMixer = new THREE.AnimationMixer(vrikodaraGroup);
      const vrikActions: Partial<Record<BossClipKey, THREE.AnimationAction>> = {};

      const vIdle = vIdleFbx.animations?.[0] || vrikodaraGroup.animations?.[0];
      const vRun = vRunFbx.animations?.[0] || vrikodaraGroup.animations?.[0] || vIdle;
      const vDownward = vDownwardFbx.animations?.[0] || vRun;
      const vSpin = vSpinFbx.animations?.[0] || vDownward;
      const vBattlecry = vBattlecryFbx.animations?.[0] || vSpin;
      const vChestThump = vChestThumpFbx.animations?.[0] || vBattlecry;
      const vReactGut = vReactGutFbx.animations?.[0] || vIdle;
      const vBlock = vBlockFbx.animations?.[0] || vIdle;
      const vDeath = vDeathFbx.animations?.[0] || vReactGut;

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

      regVrik('idle', vIdle, true);
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

      this.rigs.vrikodara = {
        root: vrikodaraRoot,
        mixer: vrikMixer,
        actions: vrikActions,
        activeKey: null,
        materials: vrikMaterials,
        weaponMaterials: [vrikMaceMat, vrikWepMat],
        rightWeaponSocket: vrikRightMaceSocket,
        rightPhase2WeaponSocket: vrikRightTridentSocket,
        leftWeaponSocket: vrikLeftSocket,
        weaponTipNode: vrikTipNode,
        weaponBaseNode: vrikBaseNode,
        bones: vrikBones,
      };

      this.transitionToClip(this.rigs.vrikodara, 'idle', 0.05, 1.0, 0, true);
      this.rigs.vrikodara.mixer.update(0.016);
      this.loadProgress = 100;
      this.isReady = true;
      this.prewarmBossAtlas('vrikodara');
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

    const forceRestart = enteredWindup || (enteredAttack && prevAiState !== 'windup');
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
    const { frameKey: baseKey, quantizedYaw } = computeSpriteSheetFrameKey({
      id: params.kind,
      animName: rig.activeKey || desiredClip,
      animTime: this.clipAnimTime,
      clipDuration,
      yawRad: this.currentYaw,
      isAttacking: isBossAction,
      isHurt: false,
      isParrying: Boolean(params.isParrying),
      phase: params.phase,
      yawDirections: 12,
      stepsPerClip: 10,
    });
    const actionSubStep =
      params.aiState === 'windup'
        ? `w${Math.round(params.windupProgress * 4)}`
        : params.aiState === 'attack'
          ? `a${Math.round((1 - this.attackSwingTimer / Math.max(0.05, this.attackSwingDuration)) * 6)}`
          : 'loc';
    const frameKey = `${baseKey}:${actionSubStep}`;

    const cached = this.frameCache.get(frameKey);
    if (cached) {
      this.canvas = cached;
      rig.mixer.update(dt);
      return true;
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

    // High-intensity molten amber/crimson rim (#ff5a1f) for Bosses / Semi-Boss
    if (params.isParrying) {
      this.rimLight.color.setHex(0xffe082);
      this.rimLight.intensity = 2.1;
    } else if (params.aiState === 'attack' || params.aiState === 'windup') {
      this.rimLight.color.setHex(0xff5a1f);
      this.rimLight.intensity = 2.0;
    } else {
      this.rimLight.color.setHex(0xff5a1f);
      this.rimLight.intensity = 1.65;
    }

    for (const mat of rig.materials) {
      if (params.isHitFlash) {
        mat.emissive.setHex(0xfff0d0);
        mat.emissiveIntensity = 0.52;
      } else if (params.isParrying) {
        mat.emissive.setHex(0xffd86b);
        mat.emissiveIntensity = 0.24;
      } else {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0.0;
      }
    }

    for (const wMat of rig.weaponMaterials) {
      wMat.emissive.setHex(0x3a0c10);
      wMat.emissiveIntensity =
        params.aiState === 'attack' ? 0.28 : params.aiState === 'windup' ? 0.14 : 0.06;
    }

    this.scene.updateMatrixWorld(true);

    const trailActive =
      params.aiState === 'attack' ||
      this.attackSwingTimer > 0.04;
    const trailColor =
      params.phase === 3 ? 0xff2a18 : params.attackKind === 'shockwave' ? 0xff7722 : 0xd92638;
    this.updateWeaponTrail(rig, dt, trailActive, trailColor);

    if (
      this.renderer.domElement.width !== this.size ||
      this.renderer.domElement.height !== this.size
    ) {
      this.renderer.setSize(this.size, this.size, false);
    }
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    const baked = bake2DSpriteFrameFromCanvas(this.renderer.domElement, frameKey, {
      role: 'boss',
      outlineColor: params.isHitFlash ? '#ffffff' : SHARED_STUDIO_OUTLINE_COLOR,
      outlineThickness: 2.5,
      hitFlash: params.isHitFlash,
      cacheFrame: false,
    });
    this.canvas = baked;
    if (!params.isHitFlash) {
      if (this.frameCache.size > 1200) {
        const oldest = this.frameCache.keys().next().value;
        if (oldest) this.frameCache.delete(oldest);
      }
      this.frameCache.set(frameKey, baked);
    }
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
   * Stage B (Step 10): Pre-bake core boss idle/chase/windup/attack sprite frames on load
   */
  public prewarmBossAtlas(kind: Boss3DKind): void {
    const rig = this.rigs[kind];
    if (!rig || !this.renderer) return;
    const states: Array<Boss3DUpdateParams['aiState']> = ['idle', 'chase', 'windup', 'attack'];
    const angles = [0, Math.PI];
    for (const st of states) {
      for (const ang of angles) {
        this.updateAndRender({
          kind,
          dt: 0.016,
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
        });
      }
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
    this.renderer = null;
  }
}
