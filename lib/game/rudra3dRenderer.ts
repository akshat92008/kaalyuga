import * as THREE from 'three';
import {
  bindTexturedGeometryToSkeleton,
  buildStabilizedInPlaceClip,
  extractStandingHipY,
} from './enemy3dRenderer';
import {
  SHARED_STUDIO_OUTLINE_COLOR,
  applyHadesCelShadingToHierarchy,
  bake2DSpriteFrameFromCanvas,
  getSharedStudioWebGLRenderer,
  isSoftwareWebGLRenderer,
  setupSharedStudioLightingRig,
} from './hadesSpriteBaker';
import {
  createDemonSlayerCelMaterial,
  createParashuFlameSheathGroup,
  liftTextureToAnimeVibrancy,
  setCelRimStyle,
  setCelUnderGlow,
} from './demonSlayerShader';
import { loadFbxCached, simplifyBufferGeometry } from './meshSimplifier';
import {
  computeCameraFootAnchorRatio,
} from './kalaBhairavaSusanoo';
import { resolveWeaponSwingClipProgress, type BakedBladePose } from './bladeTrailSampler';
import type { WeaponId } from './rules';

export type RudraAnimState =
  | 'idle'
  | 'run'
  | 'dash'
  | 'attack1'
  | 'attack2'
  | 'attack3'
  | 'heavy'
  | 'cast'
  | 'block'
  | 'hurt';

export interface RudraRenderInput {
  dt: number;
  vx: number;
  vy: number;
  facingX: number;
  facingY: number;
  slashAngle: number;
  isAttacking: boolean;
  isHeavyAttack: boolean;
  comboStep: number;
  attackProgress: number;
  isDodging: boolean;
  isParrying: boolean;
  isCasting: boolean;
  isHealing: boolean;
  isHurt: boolean;
  isDefeated: boolean;
  stance: string;
  focusOrbs: number;
  elevationY: number;
  stateProgress?: number;
  finisherVariant?: 'downward_crush' | 'spin_360_cleave' | 'impaling_lunge' | null;
  attackSerial?: number;
  weaponSwing?: {
    weapon: WeaponId;
    activeStart: number;
    activeEnd: number;
  };
  susanooActive?: boolean;
}

export function isNormalizedRudraActionState(state: RudraAnimState): boolean {
  return (
    state === 'attack1' ||
    state === 'attack2' ||
    state === 'attack3' ||
    state === 'heavy' ||
    state === 'cast' ||
    state === 'dash' ||
    state === 'block' ||
    state === 'hurt'
  );
}

export function resolveRudraDesiredState(
  input: Pick<
    RudraRenderInput,
    | 'isHurt'
    | 'isDefeated'
    | 'isParrying'
    | 'isCasting'
    | 'isHeavyAttack'
    | 'isAttacking'
    | 'isDodging'
    | 'comboStep'
    | 'finisherVariant'
    | 'weaponSwing'
    | 'vx'
    | 'vy'
  >,
  availableActions: Partial<Record<RudraAnimState, unknown>> = {}
): RudraAnimState {
  if (input.isHurt || input.isDefeated) return 'hurt';
  if (input.isParrying) return 'block';
  if (input.isCasting) return 'cast';
  if (input.isHeavyAttack) {
    if (input.finisherVariant === 'spin_360_cleave' && availableActions.cast) {
      return 'cast';
    }
    if (input.finisherVariant === 'impaling_lunge' && availableActions.attack3) {
      return 'attack3';
    }
    // Give the fast weapon a crossing cut and the long weapon a forward
    // lunge. Parashu keeps the overhead chop. All share the live hit clock.
    if (!input.finisherVariant && input.weaponSwing) {
      if (input.weaponSwing.weapon === 'khanda_dual' && availableActions.attack2) return 'attack2';
      if (input.weaponSwing.weapon === 'trishula_great' && availableActions.attack3) return 'attack3';
    }
    return 'heavy';
  }
  if (input.isAttacking) {
    if (input.comboStep >= 4 && input.finisherVariant) {
      if (input.finisherVariant === 'downward_crush' && availableActions.heavy) return 'heavy';
      if (input.finisherVariant === 'spin_360_cleave' && availableActions.cast) return 'cast';
      return 'attack3';
    }
    return input.comboStep === 2 ? 'attack2' : input.comboStep >= 3 ? 'attack3' : 'attack1';
  }
  if (input.isDodging) return 'dash';
  if (Math.hypot(input.vx, input.vy) > 14) return 'run';
  return 'idle';
}

/**
 * Resolves Rudra's normalized `[0..1)` action clock for action states (`dash`, `block`, `hurt`, `cast`, `attack1..3`, `heavy`)
 * so dashes, parries, and hit-reactions always start cleanly at frame 0 instead of mid-clip on global uptime.
 */
export function resolveRudraAnimStateAndClock(
  input: RudraRenderInput,
  stateElapsedSec: number,
  globalElapsedSec: number,
  availableActions: Partial<Record<RudraAnimState, unknown>> = {}
): {
  state: RudraAnimState;
  animClock: number;
  usesNormalizedProgress: boolean;
} {
  const state = resolveRudraDesiredState(input, availableActions);
  const usesNormalizedProgress = isNormalizedRudraActionState(state);

  if (!usesNormalizedProgress) {
    return {
      state,
      animClock: globalElapsedSec,
      usesNormalizedProgress: false,
    };
  }

  // The spinning execution deliberately borrows the cast/360° axe clip.
  // It is still a WEAPON action, not an Astra cast: drive that clip from the
  // very same normalized attack clock that gates damage, sound and impact VFX.
  // Using elapsed render time here made its blade arrive late/early after
  // hitstop or irregular frames, while the other two executions stayed in sync.
  const isFinisherCast = state === 'cast' && Boolean(input.finisherVariant) &&
    (input.isHeavyAttack || input.isAttacking);
  if (state === 'attack1' || state === 'attack2' || state === 'attack3' ||
      state === 'heavy' || isFinisherCast) {
    const prog = Number.isFinite(input.attackProgress)
      ? input.attackProgress
      : stateElapsedSec / 0.44;
    const swing = input.weaponSwing;
    const clipProgress = swing && !input.finisherVariant
      ? resolveWeaponSwingClipProgress(prog, swing.weapon, input.isHeavyAttack, swing.activeStart, swing.activeEnd)
      : prog;
    return {
      state,
      animClock: Math.max(0, Math.min(0.99, clipProgress)),
      usesNormalizedProgress: true,
    };
  }

  if (typeof input.stateProgress === 'number' && Number.isFinite(input.stateProgress)) {
    return {
      state,
      animClock: Math.max(0, Math.min(0.99, input.stateProgress)),
      usesNormalizedProgress: true,
    };
  }

  const defaultDur =
    state === 'dash' ? 0.16 : state === 'block' ? 0.62 : state === 'cast' ? 0.42 : 0.25;
  return {
    state,
    animClock: Math.max(0, Math.min(0.99, stateElapsedSec / defaultDur)),
    usesNormalizedProgress: true,
  };
}

/**
 * Maps an animation clock to one exact baked sprite frame. Trim attack clips once,
 * not twice: double trimming shortened the visible cleave and shifted contact timing.
 * The same quantization is used by preview/prewarm and normal combat.
 */
export function computeRudraBakedFrameTime(
  clockSec: number,
  clipDurationSec: number,
  steps: number,
  isAction: boolean,
  isAttack: boolean
): { frame: number; timeSec: number } {
  const count = Math.max(2, Math.floor(Number.isFinite(steps) ? steps : 2));
  const duration = Math.max(0.01, Number.isFinite(clipDurationSec) ? clipDurationSec : 1);
  const clock = Number.isFinite(clockSec) ? Math.max(0, clockSec) : 0;
  const frame = isAction
    ? Math.min(count - 1, Math.floor(Math.min(0.9999, clock) * count))
    : Math.floor(((clock % duration) / duration) * count);
  const phase = frame / (count - 1);
  return {
    frame,
    timeSec: isAttack
      ? (0.14 + phase * (0.88 - 0.14)) * duration
      : (frame / count) * duration,
  };
}

/** Baked-sprite transitions retain pose continuity without fading precise contact or parry frames. */
export function getRudraTransitionBlendSeconds(from: RudraAnimState, to: RudraAnimState): number {
  if (from === to || to === 'hurt' || to === 'dash' || to === 'block') return 0;
  if (isNormalizedRudraActionState(to)) return 0.038;
  if (isNormalizedRudraActionState(from)) return 0.07;
  return 0.11;
}

// Exact 1:1 vertex match (493,632 verts === 493,632 verts) between Pro Melee Axe Pack rig & Ashen_Warborn texture FBX!
const RUDRA_RIGGED_FBX_URL =
  '/kaalyuga/rudra/rigged.fbx';
const RUDRA_TEXTURE_FBX_URL =
  '/models/Meshy_AI_Ashen_Warborn_20261025_texture_fbx/Meshy_AI_Ashen_Warborn_20261025_texture.fbx';
const RUDRA_DIFFUSE_URL =
  '/models/Meshy_AI_Ashen_Warborn_20261025_texture_fbx/Meshy_AI_Ashen_Warborn_20261025_texture.png';

// 3D Parashu Battle-Axe attached to Rudra's mixamorigRightHand bone
const PARASHU_WEAPON_FBX_URL =
  '/kaalyuga/parashu/weapon.fbx';
const PARASHU_DIFFUSE_URL =
  '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png';

// Fast local FBX clips in /public/kaalyuga/anims/rudra/ with Pro Melee Axe Pack fallback
const RUDRA_LOCAL_ANIM_URLS: Record<RudraAnimState, string> = {
  idle: '/kaalyuga/anims/rudra/idle.fbx',
  run: '/kaalyuga/anims/rudra/run.fbx',
  dash: '/kaalyuga/anims/rudra/dodge.fbx',
  attack1: '/kaalyuga/anims/rudra/attack1.fbx',
  attack2: '/kaalyuga/anims/rudra/attack2.fbx',
  attack3: '/kaalyuga/anims/rudra/attack3.fbx',
  heavy: '/kaalyuga/anims/rudra/heavy.fbx',
  cast: '/kaalyuga/anims/rudra/cast.fbx',
  block: '/kaalyuga/anims/rudra/block.fbx',
  hurt: '/kaalyuga/anims/rudra/hurt.fbx',
};

const RUDRA_ANIM_URLS: Record<RudraAnimState, string> = {
  idle: '/animations/pro_melee_axe/standing idle.fbx',
  run: '/animations/pro_melee_axe/standing run forward.fbx',
  dash: '/animations/pro_melee_axe/standing run forward.fbx',
  attack1: '/animations/pro_melee_axe/standing melee combo attack ver. 1.fbx',
  attack2: '/animations/pro_melee_axe/standing melee combo attack ver. 2.fbx',
  attack3: '/animations/pro_melee_axe/standing melee combo attack ver. 3.fbx',
  heavy: '/animations/pro_melee_axe/standing melee attack downward.fbx',
  cast: '/animations/pro_melee_axe/standing melee attack 360 high.fbx',
  block: '/animations/pro_melee_axe/standing block idle.fbx',
  hurt: '/animations/pro_melee_axe/standing react large from left.fbx',
};

function quantizeRudraYaw(yaw: number, software: boolean): { index: number; angle: number } {
  const buckets = software ? 6 : 12;
  const fullTurn = Math.PI * 2;
  const normalized = ((yaw % fullTurn) + fullTurn) % fullTurn;
  const index = Math.round((normalized / fullTurn) * buckets) % buckets;
  return { index, angle: index * fullTurn / buckets };
}

export class Rudra3DRenderer {
  private readonly size: number;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private wrapper: THREE.Group;
  private model: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private actions: Partial<Record<RudraAnimState, THREE.AnimationAction>> = {};
  private standingHipY = 107.11;
  public isReady = false;
  public loadProgress = 0;
  public canvas: HTMLCanvasElement;
  private elapsedSec = 0;
  private stateElapsedSec = 0;
  private lastAnimState: RudraAnimState = 'idle';
  private lastAttackSerial = -1;
  private blendFromCanvas: HTMLCanvasElement | null = null;
  private blendOutCanvas: HTMLCanvasElement | null = null;
  private blendDurationSec = 0;
  private blendElapsedSec = 0;
  private frameCache: Map<string, HTMLCanvasElement> = new Map();
  private bladePoseCache: Map<string, BakedBladePose> = new Map();
  private latestBladePose: BakedBladePose = {
    rootU: 0.5,
    rootV: 0.48,
    tipU: 0.72,
    tipV: 0.42,
    depthZ: 0.12,
    valid: false,
  };
  private trailSeeds: { serial: number; samples: { progress: number; pose: BakedBladePose }[] } | null = null;
  private bladeRootAnchor: THREE.Object3D | null = null;
  private bladeTipAnchor: THREE.Object3D | null = null;
  private torsoDepthAnchor: THREE.Object3D | null = null;
  private readonly _vRoot = new THREE.Vector3();
  private readonly _vTip = new THREE.Vector3();
  private readonly _vTorso = new THREE.Vector3();
  private celMaterials: THREE.Material[] = [];
  private parashuAuraMat: THREE.ShaderMaterial | null = null;
  private studioRimLight: THREE.DirectionalLight | null = null;
  private disposed = false;
  private prewarmQueue: Array<() => void> = [];
  private prewarmTimer: number | null = null;
  public readonly footAnchorRatio: number;

  public getLatestBladePose(): BakedBladePose {
    return this.latestBladePose;
  }

  public getBladeTrailSeeds(serial: number): readonly { progress: number; pose: BakedBladePose }[] {
    return this.trailSeeds?.serial === serial ? this.trailSeeds.samples : [];
  }

  constructor(size = 256) {
    this.size = size;
    this.scene = new THREE.Scene();
    this.wrapper = new THREE.Group();
    this.scene.add(this.wrapper);

    // Tightened Demon Slayer camera framing so Rudra's face, armor, and Parashu fill the frame crisply
    this.camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100);
    this.camera.position.set(0, 1.90, 3.92);
    this.camera.lookAt(0, 0.78, 0);
    this.footAnchorRatio = computeCameraFootAnchorRatio(this.camera, 0);

    // Unified Demon Slayer Studio Key / Fill / Rim Rig with clean sunlit ivory anime rim
    const studioLights = setupSharedStudioLightingRig(this.scene, 1.0);
    studioLights.rimLight.color.setHex(0xffe8c2);
    studioLights.rimLight.intensity = 1.05;
    this.studioRimLight = studioLights.rimLight;

    if (typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = size;
      this.canvas.height = size;
      this.blendFromCanvas = document.createElement('canvas');
      this.blendFromCanvas.width = size;
      this.blendFromCanvas.height = size;
      this.blendOutCanvas = document.createElement('canvas');
      this.blendOutCanvas.width = size;
      this.blendOutCanvas.height = size;
    } else {
      this.canvas = null as unknown as HTMLCanvasElement;
    }

    if (typeof window !== 'undefined') {
      const renderer = getSharedStudioWebGLRenderer(size);
      if (renderer) {
        this.canvas = renderer.domElement;
        this.loadRudraModelAndAnimations();
      }
    }
  }

  private loadRudraModelAndAnimations(): void {
    const texLoader = new THREE.TextureLoader();
    this.loadProgress = 0.25;

    const loadTex = (url: string): Promise<THREE.Texture | null> =>
      new Promise((resolve) => {
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
      loadFbxCached(url, true).catch(() => null);

    const loadAnimWithLocalFirst = async (state: RudraAnimState): Promise<THREE.Group | null> => {
      const localGrp = await loadFbx(RUDRA_LOCAL_ANIM_URLS[state]);
      if (localGrp?.animations?.length) return localGrp;
      return loadFbx(RUDRA_ANIM_URLS[state]);
    };

    Promise.all([
      loadFbx(RUDRA_RIGGED_FBX_URL),
      loadFbx(RUDRA_TEXTURE_FBX_URL),
      loadFbx(PARASHU_WEAPON_FBX_URL),
      loadTex(RUDRA_DIFFUSE_URL),
      loadTex(PARASHU_DIFFUSE_URL),
      loadAnimWithLocalFirst('idle'),
      loadAnimWithLocalFirst('run'),
    ]).then(
      ([
        riggedGroup,
        texturedGroup,
        weaponGroup,
        diffuseMap,
        weaponDiffuseMap,
        idleAnimGroup,
        runAnimGroup,
      ]) => {
        const baseGroup = riggedGroup || texturedGroup;
        if (!baseGroup) {
          this.loadProgress = 1.0;
          return;
        }

        this.standingHipY = extractStandingHipY(baseGroup);

        const liftedDiffuse = liftTextureToAnimeVibrancy(diffuseMap, 1.18, 1.12);
        if (liftedDiffuse) liftedDiffuse.userData.animeLifted = true;

        const mat = createDemonSlayerCelMaterial({
          map: liftedDiffuse,
          tintHex: liftedDiffuse ? 0xffffff : 0xd94838,
          emissiveHex: 0x262220,
          emissiveIntensity: 0.24,
          rimColorHex: 0xffe4b8,
          rimStrength: 0.28,
          rimPower: 3.1,
        });
        this.celMaterials.push(mat);

        if (riggedGroup) {
          bindTexturedGeometryToSkeleton(riggedGroup, texturedGroup, mat);
        } else {
          baseGroup.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const m = child as THREE.Mesh;
              m.frustumCulled = false;
              m.material = mat;
            }
          });
        }

        // Normalize height to 1.48m BEFORE attaching weapon so weapon bounds do not shrink character
        const rawBox = new THREE.Box3().setFromObject(baseGroup);
        const rawHeight = Math.max(0.001, rawBox.max.y - rawBox.min.y);
        const scale = 1.48 / rawHeight;
        baseGroup.scale.setScalar(scale);
        baseGroup.position.set(0, -0.06, 0);

        // Attach 3D Parashu Battle-Axe + Ignited Hinokami Flame Sheath to Rudra's right hand bone
        baseGroup.updateMatrixWorld(true);
        const rightHand =
          baseGroup.getObjectByName('mixamorigRightHand') ||
          baseGroup.getObjectByName('RightHand');
        if (rightHand && weaponGroup) {
          const liftedWepMap = liftTextureToAnimeVibrancy(weaponDiffuseMap, 1.16, 1.12);
          if (liftedWepMap) liftedWepMap.userData.animeLifted = true;
          const wepMat = createDemonSlayerCelMaterial({
            map: liftedWepMap,
            tintHex: liftedWepMap ? 0xffffff : 0xc97b3e,
            emissiveHex: 0x28201c,
            emissiveIntensity: 0.22,
            rimColorHex: 0xffe0a8,
            rimStrength: 0.32,
            rimPower: 3.0,
          });
          this.celMaterials.push(wepMat);
          weaponGroup.traverse((c) => {
            if ((c as THREE.Mesh).isMesh) {
              const wm = c as THREE.Mesh;
              wm.geometry = simplifyBufferGeometry(wm.geometry, 56, 32000);
              wm.material = wepMat;
              wm.frustumCulled = false;
            }
          });
          const handScaleVec = new THREE.Vector3();
          rightHand.getWorldScale(handScaleVec);
          const handScale = Math.max(1e-5, handScaleVec.x);

          const wepBox = new THREE.Box3().setFromObject(weaponGroup);
          const wepSize = new THREE.Vector3();
          wepBox.getSize(wepSize);
          const maxDim = Math.max(0.001, wepSize.x, wepSize.y, wepSize.z);
          const desiredWorldLen = 1.04;
          const localWepScale = desiredWorldLen / (maxDim * handScale);

          const weaponSocket = new THREE.Group();
          weaponGroup.scale.setScalar(localWepScale);
          weaponGroup.rotation.set(-Math.PI * 0.5, 0, -Math.PI * 0.5);
          weaponGroup.position.set(0.26 * maxDim * localWepScale, 0, 0);
          weaponSocket.add(weaponGroup);

          // Attach exact Parashu blade root & outer cutting-edge tip anchors for Phase 1 blade-tracked VFX
          const wepLocalLen = maxDim * localWepScale;
          const bladeRoot = new THREE.Object3D();
          bladeRoot.position.set(0.14 * wepLocalLen, 0, 0);
          const bladeTip = new THREE.Object3D();
          bladeTip.position.set(0.76 * wepLocalLen, 0, 0);
          weaponSocket.add(bladeRoot, bladeTip);
          this.bladeRootAnchor = bladeRoot;
          this.bladeTipAnchor = bladeTip;

          // Subtle golden-amber blade edge accent around the Parashu axe head
          const flameSheath = createParashuFlameSheathGroup(wepLocalLen);
          const sheathMesh = flameSheath.children[0] as THREE.Mesh | undefined;
          if (sheathMesh && sheathMesh.material instanceof THREE.ShaderMaterial) {
            this.parashuAuraMat = sheathMesh.material;
          }
          weaponSocket.add(flameSheath);
          rightHand.add(weaponSocket);
        }

        applyHadesCelShadingToHierarchy(baseGroup, {
          rimColor: 0xffe4b8,
          rimIntensity: 0.28,
          emissiveTint: 0x262220,
          emissiveStrength: 0.24,
          outlineRatio: 0.0048,
        });

        const torsoAnchor = new THREE.Object3D();
        torsoAnchor.position.set(0, 0.84, 0);
        this.wrapper.add(torsoAnchor);
        this.torsoDepthAnchor = torsoAnchor;
        this.wrapper.add(baseGroup);
        this.model = baseGroup;
        this.mixer = new THREE.AnimationMixer(baseGroup);

        if (idleAnimGroup?.animations?.[0]) {
          const cleanIdle = buildStabilizedInPlaceClip(
            idleAnimGroup.animations[0],
            baseGroup,
            this.standingHipY
          );
          if (cleanIdle.tracks.length > 0) {
            const idleAction = this.mixer.clipAction(cleanIdle);
            idleAction.play();
            this.actions.idle = idleAction;
          }
        }
        if (runAnimGroup?.animations?.[0]) {
          const cleanRun = buildStabilizedInPlaceClip(
            runAnimGroup.animations[0],
            baseGroup,
            this.standingHipY
          );
          if (cleanRun.tracks.length > 0) {
            this.actions.run = this.mixer.clipAction(cleanRun);
          }
        }

        this.isReady = true;
        this.loadProgress = 1.0;
        this.prewarmCoreAtlas();

        // Eagerly preload ALL combat & dodge clips from local public/kaalyuga/anims/rudra/ (no 14s stall!)
        const secondaryStates: RudraAnimState[] = [
          'attack1',
          'attack2',
          'attack3',
          'heavy',
          'dash',
          'cast',
          'block',
          'hurt',
        ];
        if (this.actions.run && !this.actions.dash) {
          this.actions.dash = this.actions.run;
        }
        const isSoft = isSoftwareWebGLRenderer();
        secondaryStates.forEach((state, idx) => {
          const delayMs = isSoft ? 60 + idx * 90 : 30 + idx * 55;
          const schedule =
            typeof window !== 'undefined'
              ? (fn: () => void) => window.setTimeout(fn, delayMs)
              : (fn: () => void) => fn();
          schedule(() => {
            if (this.disposed) return;
            loadAnimWithLocalFirst(state).then((animGroup) => {
              if (
                this.disposed ||
                !animGroup ||
                !animGroup.animations ||
                animGroup.animations.length === 0 ||
                !this.mixer
              ) {
                return;
              }
              const rawClip = animGroup.animations[0];
              const cleanClip = buildStabilizedInPlaceClip(rawClip, baseGroup, this.standingHipY);
              if (cleanClip.tracks.length === 0) return;

              const action = this.mixer.clipAction(cleanClip);
              this.actions[state] = action;
              const prefix = `rudra:${state}:`;
              for (const k of Array.from(this.frameCache.keys())) {
                if (k.startsWith(prefix)) this.frameCache.delete(k);
              }
            });
          });
        });
      }
    );
  }

  private enqueuePrewarmTasks(tasks: Array<() => void>): void {
    if (this.disposed || tasks.length === 0) return;
    if (isSoftwareWebGLRenderer()) return;
    this.prewarmQueue.push(...tasks);
    if (this.prewarmTimer !== null) return;
    if (typeof window === 'undefined') {
      while (this.prewarmQueue.length > 0 && !this.disposed) {
        const fn = this.prewarmQueue.shift();
        fn?.();
      }
      return;
    }
    const flushChunk = () => {
      this.prewarmTimer = null;
      if (this.disposed) {
        this.prewarmQueue.length = 0;
        return;
      }
      const batchSize = isSoftwareWebGLRenderer() ? 1 : 2;
      for (let i = 0; i < batchSize && this.prewarmQueue.length > 0; i++) {
        const fn = this.prewarmQueue.shift();
        fn?.();
      }
      if (this.prewarmQueue.length > 0) {
        this.prewarmTimer = window.setTimeout(flushChunk, 16);
      }
    };
    this.prewarmTimer = window.setTimeout(flushChunk, 16);
  }

  /**
   * Pre-bakes Rudra's core idle, run, attack1, heavy, and hurt frames across primary facing directions
   * asynchronously in small chunks so the main thread and compositor never hitch.
   */
  public prewarmCoreAtlas(): void {
    if (!this.isReady || !this.model || !this.mixer || this.disposed) return;
    if (isSoftwareWebGLRenderer()) return;
    const warmAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
    const tasks: Array<() => void> = [];
    for (const ang of warmAngles) {
      tasks.push(() => {
        this.renderFrame('idle', 0.0, ang, false);
      });
      tasks.push(() => {
        this.renderFrame('run', 0.0, ang, false);
      });
      tasks.push(() => {
        this.renderFrame('idle', 0.35, ang, false);
      });
      tasks.push(() => {
        this.renderFrame('run', 0.35, ang, false);
      });
      if (this.actions.attack1) {
        tasks.push(() => {
          this.renderFrame('attack1', 0.25, ang, false);
        });
        tasks.push(() => {
          this.renderFrame('attack1', 0.55, ang, false);
        });
      }
      if (this.actions.heavy) {
        tasks.push(() => {
          this.renderFrame('heavy', 0.35, ang, false);
        });
      }
    }
    this.enqueuePrewarmTasks(tasks);
  }

  public updateAndRender(input: RudraRenderInput): boolean {
    if (!this.isReady) return false;
    const stepDt = Math.max(0, Math.min(0.1, input.dt || 0.016));
    this.elapsedSec += stepDt;

    const nextState = resolveRudraDesiredState(input, this.actions);
    const serialChanged =
      typeof input.attackSerial === 'number' && input.attackSerial !== this.lastAttackSerial;
    if (nextState !== this.lastAnimState || serialChanged) {
      const blend = getRudraTransitionBlendSeconds(this.lastAnimState, nextState);
      const duration = serialChanged && nextState === this.lastAnimState
        ? 0
        : input.weaponSwing ? Math.min(blend, 0.018) : blend;
      this.blendDurationSec = 0;
      if (duration > 0 && this.canvas?.width && this.blendFromCanvas) {
        const sourceCtx = this.blendFromCanvas.getContext('2d');
        if (sourceCtx) {
          sourceCtx.clearRect(0, 0, this.size, this.size);
          sourceCtx.drawImage(this.canvas, 0, 0, this.size, this.size);
          this.blendElapsedSec = 0;
          this.blendDurationSec = duration;
        }
      }
      this.stateElapsedSec = 0;
      this.lastAnimState = nextState;
      if (typeof input.attackSerial === 'number') {
        this.lastAttackSerial = input.attackSerial;
      }
    } else {
      this.stateElapsedSec += stepDt;
    }

    const { state, animClock } = resolveRudraAnimStateAndClock(
      input,
      this.stateElapsedSec,
      this.elapsedSec,
      this.actions
    );

    const facingAngle =
      input.isAttacking || input.isHeavyAttack
        ? input.slashAngle
        : Math.atan2(input.facingY || 0, input.facingX || 1);

    const window = input.weaponSwing;
    const serial = input.attackSerial;
    if (window && serial !== undefined && this.trailSeeds?.serial !== serial &&
        input.attackProgress >= window.activeStart && input.attackProgress <= window.activeEnd) {
      const samples: { progress: number; pose: BakedBladePose }[] = [];
      const offsets = input.isHeavyAttack ? [0.16] : [0.09, 0.23, 0.36, 0.45];
      for (const offset of offsets) {
        const progress = Math.max(0, input.attackProgress - offset);
        const seed = resolveRudraAnimStateAndClock({ ...input, attackProgress: progress },
          this.stateElapsedSec, this.elapsedSec, this.actions);
        const pose = this.sampleSwingPose(seed.state, seed.animClock, facingAngle);
        if (pose?.valid) samples.push({ progress, pose });
      }
      this.trailSeeds = { serial, samples };
    }

    const baked = this.renderFrame(
      state,
      animClock,
      facingAngle,
      input.isHurt,
      input.stance,
      Boolean(input.susanooActive)
    );
    if (baked) {
      if (this.blendDurationSec > 0 && this.blendFromCanvas && this.blendOutCanvas) {
        this.blendElapsedSec += stepDt;
        const atWeaponContact = input.weaponSwing && input.attackProgress >= input.weaponSwing.activeStart;
        const alpha = atWeaponContact ? 1 : Math.min(1, this.blendElapsedSec / this.blendDurationSec);
        const blendCtx = this.blendOutCanvas.getContext('2d');
        if (blendCtx && alpha < 1) {
          blendCtx.clearRect(0, 0, this.size, this.size);
          blendCtx.globalAlpha = 1 - alpha;
          blendCtx.drawImage(this.blendFromCanvas, 0, 0, this.size, this.size);
          blendCtx.globalAlpha = alpha;
          blendCtx.drawImage(baked, 0, 0, this.size, this.size);
          blendCtx.globalAlpha = 1;
          this.canvas = this.blendOutCanvas;
        } else {
          this.blendDurationSec = 0;
          this.canvas = baked;
        }
      } else {
        this.canvas = baked;
      }
      return true;
    }
    return false;
  }

  public renderFrame(
    state: RudraAnimState,
    animTimeSec: number,
    facingAngleRad: number,
    hitFlash = false,
    stance = 'smash',
    susanooActive = false
  ): HTMLCanvasElement | null {
    if (!this.isReady || !this.model || !this.mixer) return null;

    const isSoft = isSoftwareWebGLRenderer();
    const { index: yawIndex, angle: quantizedYaw } = quantizeRudraYaw(facingAngleRad, isSoft);

    const isAttack =
      state === 'attack1' ||
      state === 'attack2' ||
      state === 'attack3' ||
      state === 'heavy' ||
      state === 'cast';
    const isAction = isNormalizedRudraActionState(state);

    const action =
      this.actions[state] ||
      (isAttack ? this.actions.attack1 || this.actions.run : undefined) ||
      this.actions.idle;

    const clipDur = action ? Math.max(0.32, action.getClip().duration) : 1.0;
    // Higher swing frame density (12 software / 24 GPU) + active cleave window [0.14..0.88] eliminates stalled axe swings
    const steps = isSoft ? (isAttack ? 12 : 8) : isAttack ? 24 : 14;

    const { frame: stepIndex, timeSec: quantizedTime } = computeRudraBakedFrameTime(
      animTimeSec, clipDur, steps, isAction, isAttack
    );

    const stanceTag = susanooActive
      ? 'susanoo'
      : isAttack || state === 'dash' || state === 'block'
        ? stance
        : 'base';
    const flashTag = hitFlash ? 'flash' : 'norm';
    const cacheKey = `rudra:${state}:${stanceTag}:y${yawIndex}:f${stepIndex}:${flashTag}`;

    const cached = this.frameCache.get(cacheKey);
    if (cached) {
      const cachedPose = this.bladePoseCache.get(cacheKey);
      if (cachedPose) {
        this.latestBladePose = cachedPose;
      }
      return cached;
    }

    const renderer = getSharedStudioWebGLRenderer(this.size);
    if (!renderer) return null;

    if (action) {
      this.mixer.stopAllAction();
      action.reset();
      action.play();
      this.mixer.setTime(quantizedTime);
    }

    // Stance-synced + 4-element (Agni / Varuna / Vayu / Vajra) rim & under-glow on Rudra's 3D cel model
    const isPillar = stance === 'pillar';
    const isThrust = stance === 'thrust';
    const isWater = stance === 'water' || stance === 'varuna';
    const stanceRimHex = susanooActive
      ? 0xff7038
      : isWater
        ? 0x7dd3fc
        : isPillar
          ? 0x6ee7b7
          : isThrust
            ? 0xfef08a
            : 0xffd27d;
    const stanceGlowHex = susanooActive
      ? 0xff3b18
      : isWater
        ? 0x0ea5e9
        : isPillar
          ? 0x10b981
          : isThrust
            ? 0xfacc15
            : 0xff5a18;
    const activeBoost = susanooActive
      ? 1.0
      : state === 'cast' || state === 'heavy'
        ? 1.0
        : isAttack
          ? 0.78
          : state === 'block'
            ? 0.58
            : 0.0;

    if (this.celMaterials.length > 0) {
      setCelRimStyle(
        this.celMaterials,
        activeBoost > 0 ? stanceRimHex : 0xffe4b8,
        activeBoost > 0 ? 0.40 + activeBoost * 0.34 : 0.28
      );
      setCelUnderGlow(this.celMaterials, stanceGlowHex, activeBoost * 0.58);
    }
    if (this.studioRimLight) {
      this.studioRimLight.color.setHex(activeBoost > 0 ? stanceRimHex : 0xffe8c2);
      this.studioRimLight.intensity = susanooActive ? 1.55 : activeBoost > 0 ? 1.38 : 1.05;
    }
    if (this.parashuAuraMat) {
      this.parashuAuraMat.uniforms.uTime.value = quantizedTime * 3.5;
      if (susanooActive) {
        this.parashuAuraMat.uniforms.uMidColor.value.setHex(0xff4a1c);
        this.parashuAuraMat.uniforms.uOuterColor.value.setHex(0x990f1a);
      } else if (isWater) {
        this.parashuAuraMat.uniforms.uMidColor.value.setHex(0x38e8ff);
        this.parashuAuraMat.uniforms.uOuterColor.value.setHex(0x0c4a9e);
      } else if (isPillar) {
        this.parashuAuraMat.uniforms.uMidColor.value.setHex(0x26f78d);
        this.parashuAuraMat.uniforms.uOuterColor.value.setHex(0x047857);
      } else if (isThrust) {
        this.parashuAuraMat.uniforms.uMidColor.value.setHex(0xffe838);
        this.parashuAuraMat.uniforms.uOuterColor.value.setHex(0x38e8ff);
      } else {
        this.parashuAuraMat.uniforms.uMidColor.value.setHex(0xff9f2e);
        this.parashuAuraMat.uniforms.uOuterColor.value.setHex(0xd91c08);
      }
    }

    this.wrapper.rotation.y = Math.PI * 0.5 - quantizedYaw;
    this.wrapper.rotation.x = 0;

    const bakedPose = this.projectBladePose();

    renderer.render(this.scene, this.camera);

    const rimRgba = susanooActive
      ? 'rgba(255, 92, 42, 0.52)'
      : activeBoost > 0
        ? isWater
          ? 'rgba(56, 232, 255, 0.44)'
          : isPillar
            ? 'rgba(52, 245, 165, 0.42)'
            : isThrust
              ? 'rgba(255, 232, 72, 0.44)'
              : 'rgba(255, 148, 48, 0.46)'
        : 'rgba(255, 242, 214, 0.30)';

    const baked = bake2DSpriteFrameFromCanvas(renderer.domElement, cacheKey, {
      role: 'rudra',
      rimColor: rimRgba,
      outlineColor: SHARED_STUDIO_OUTLINE_COLOR,
      outlineThickness: susanooActive ? 2.15 : 1.85,
      hitFlash,
      cacheFrame: false,
    });

    if (this.frameCache.size > 1100) {
      const oldest = this.frameCache.keys().next().value;
      if (oldest) {
        this.frameCache.delete(oldest);
        this.bladePoseCache.delete(oldest);
      }
    }
    this.frameCache.set(cacheKey, baked);
    this.bladePoseCache.set(cacheKey, bakedPose);
    this.latestBladePose = bakedPose;

    return baked;
  }

  private sampleSwingPose(state: RudraAnimState, clock: number, angle: number): BakedBladePose | null {
    const action = this.actions[state];
    if (!action || !this.mixer || !this.bladeTipAnchor) return null;
    const software = isSoftwareWebGLRenderer();
    const { timeSec } = computeRudraBakedFrameTime(clock, Math.max(0.32, action.getClip().duration),
      software ? 12 : 24, true, true);
    this.mixer.stopAllAction();
    action.reset().play();
    this.mixer.setTime(timeSec);
    this.wrapper.rotation.y = Math.PI * 0.5 - quantizeRudraYaw(angle, software).angle;
    this.wrapper.rotation.x = 0;
    return this.projectBladePose();
  }

  private projectBladePose(): BakedBladePose {
    // Project real 3D Parashu root/tip + camera-space depthZ before rendering baked frame
    this.scene.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    let bakedPose: BakedBladePose = {
      rootU: 0.5,
      rootV: 0.48,
      tipU: 0.72,
      tipV: 0.42,
      depthZ: 0.12,
      valid: false,
    };
    if (this.bladeRootAnchor && this.bladeTipAnchor && this.torsoDepthAnchor) {
      this.bladeRootAnchor.getWorldPosition(this._vRoot);
      this.bladeTipAnchor.getWorldPosition(this._vTip);
      this.torsoDepthAnchor.getWorldPosition(this._vTorso);

      // Compute camera-space Z relative to Rudra's torso (+Z = closer to camera = IN FRONT of Rudra)
      const invCam = this.camera.matrixWorldInverse;
      const rootCamZ = this._vRoot.clone().applyMatrix4(invCam).z;
      const tipCamZ = this._vTip.clone().applyMatrix4(invCam).z;
      const torsoCamZ = this._vTorso.clone().applyMatrix4(invCam).z;
      const depthZ = (rootCamZ + tipCamZ) * 0.5 - torsoCamZ;

      this._vRoot.project(this.camera);
      this._vTip.project(this.camera);

      bakedPose = {
        rootU: Math.max(-0.25, Math.min(1.25, this._vRoot.x * 0.5 + 0.5)),
        rootV: Math.max(-0.25, Math.min(1.25, 0.5 - this._vRoot.y * 0.5)),
        tipU: Math.max(-0.25, Math.min(1.25, this._vTip.x * 0.5 + 0.5)),
        tipV: Math.max(-0.25, Math.min(1.25, 0.5 - this._vTip.y * 0.5)),
        depthZ,
        valid: true,
      };
    }

    return bakedPose;
  }

  public dispose(): void {
    this.disposed = true;
    this.prewarmQueue.length = 0;
    if (this.prewarmTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.prewarmTimer);
      this.prewarmTimer = null;
    }
    this.frameCache.clear();
    this.bladePoseCache.clear();
  }
}

