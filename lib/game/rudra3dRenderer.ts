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
  computeTrimmedCleaveClock,
} from './kalaBhairavaSusanoo';

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

  if (state === 'attack1' || state === 'attack2' || state === 'attack3' || state === 'heavy') {
    const prog = Number.isFinite(input.attackProgress)
      ? input.attackProgress
      : stateElapsedSec / 0.44;
    return {
      state,
      animClock: Math.max(0, Math.min(0.99, prog)),
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

// Exact 1:1 vertex match (493,632 verts === 493,632 verts) between Pro Melee Axe Pack rig & Ashen_Warborn texture FBX!
const RUDRA_RIGGED_FBX_URL =
  '/new_3d_assets/Animations/Pro Melee Axe Pack/Meshy_AI_Ashen_Warborn_20261025_generate.fbx';
const RUDRA_TEXTURE_FBX_URL =
  '/models/Meshy_AI_Ashen_Warborn_20261025_texture_fbx/Meshy_AI_Ashen_Warborn_20261025_texture.fbx';
const RUDRA_DIFFUSE_URL =
  '/models/Meshy_AI_Ashen_Warborn_20261025_texture_fbx/Meshy_AI_Ashen_Warborn_20261025_texture.png';

// 3D Parashu Battle-Axe attached to Rudra's mixamorigRightHand bone
const PARASHU_WEAPON_FBX_URL =
  '/new_3d_assets/3D Models/Weapons/Bloodforged_Trident_Axe_20261025/Meshy_AI_Bloodforged_Trident_Axe_20261025_texture.fbx';
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
  private frameCache: Map<string, HTMLCanvasElement> = new Map();
  private celMaterials: THREE.Material[] = [];
  private parashuAuraMat: THREE.ShaderMaterial | null = null;
  private studioRimLight: THREE.DirectionalLight | null = null;
  private disposed = false;
  private prewarmQueue: Array<() => void> = [];
  private prewarmTimer: number | null = null;
  public readonly footAnchorRatio: number;

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

          // Subtle golden-amber blade edge accent around the Parashu axe head
          const flameSheath = createParashuFlameSheathGroup(maxDim * localWepScale);
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
    const stepDt = Math.max(0, Math.min(0.1, input.dt ?? 0.016));
    this.elapsedSec += stepDt;

    const nextState = resolveRudraDesiredState(input, this.actions);
    const serialChanged =
      typeof input.attackSerial === 'number' && input.attackSerial !== this.lastAttackSerial;
    if (nextState !== this.lastAnimState || serialChanged) {
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
        : Math.atan2(input.facingY, input.facingX);

    const baked = this.renderFrame(
      state,
      animClock,
      facingAngle,
      input.isHurt,
      input.stance,
      Boolean(input.susanooActive)
    );
    if (baked) {
      this.canvas = baked;
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
    const yawBuckets = isSoft ? 6 : 12;
    const normalizedYaw = ((facingAngleRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const yawIndex = Math.round((normalizedYaw / (Math.PI * 2)) * yawBuckets) % yawBuckets;
    const quantizedYaw = (yawIndex / yawBuckets) * Math.PI * 2;

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

    const effectiveNorm = Math.max(0, Math.min(0.999, animTimeSec));
    const stepIndex = isAction
      ? Math.min(steps - 1, Math.floor(effectiveNorm * steps))
      : Math.floor(((Math.max(0, animTimeSec) % clipDur) / clipDur) * steps);
    const quantizedTime = isAttack
      ? computeTrimmedCleaveClock(stepIndex / (steps - 1)) * clipDur
      : (stepIndex / steps) * clipDur;

    const stanceTag = susanooActive
      ? 'susanoo'
      : isAttack || state === 'dash' || state === 'block'
        ? stance
        : 'base';
    const flashTag = hitFlash ? 'flash' : 'norm';
    const cacheKey = `rudra:${state}:${stanceTag}:y${yawIndex}:f${stepIndex}:${flashTag}`;

    const cached = this.frameCache.get(cacheKey);
    if (cached) return cached;

    const renderer = getSharedStudioWebGLRenderer(this.size);
    if (!renderer) return null;

    if (action) {
      this.mixer.stopAllAction();
      action.reset();
      action.play();
      this.mixer.setTime(quantizedTime);
    }

    // Stance-synced + Kala-Bhairava Susanoo molten rim & under-glow on Rudra's 3D cel model
    const isPillar = stance === 'pillar';
    const isThrust = stance === 'thrust';
    const stanceRimHex = susanooActive
      ? 0xff7038
      : isPillar
        ? 0x6ee7b7
        : isThrust
          ? 0x7dd3fc
          : 0xffd27d;
    const stanceGlowHex = susanooActive
      ? 0xff3b18
      : isPillar
        ? 0x10b981
        : isThrust
          ? 0x38e8ff
          : 0xff6a18;
    const activeBoost = susanooActive
      ? 1.0
      : state === 'cast' || state === 'heavy'
        ? 1.0
        : isAttack
          ? 0.72
          : state === 'block'
            ? 0.55
            : 0.0;

    if (this.celMaterials.length > 0) {
      setCelRimStyle(
        this.celMaterials,
        activeBoost > 0 ? stanceRimHex : 0xffe4b8,
        activeBoost > 0 ? 0.36 + activeBoost * 0.28 : 0.28
      );
      setCelUnderGlow(this.celMaterials, stanceGlowHex, activeBoost * 0.52);
    }
    if (this.studioRimLight) {
      this.studioRimLight.color.setHex(activeBoost > 0 ? stanceRimHex : 0xffe8c2);
      this.studioRimLight.intensity = susanooActive ? 1.55 : activeBoost > 0 ? 1.25 : 1.05;
    }
    if (this.parashuAuraMat) {
      this.parashuAuraMat.uniforms.uTime.value = quantizedTime * 3.5;
      if (susanooActive) {
        this.parashuAuraMat.uniforms.uMidColor.value.setHex(0xff4a1c);
        this.parashuAuraMat.uniforms.uOuterColor.value.setHex(0x990f1a);
      } else if (isPillar) {
        this.parashuAuraMat.uniforms.uMidColor.value.setHex(0x26f78d);
        this.parashuAuraMat.uniforms.uOuterColor.value.setHex(0x047857);
      } else if (isThrust) {
        this.parashuAuraMat.uniforms.uMidColor.value.setHex(0x38e8ff);
        this.parashuAuraMat.uniforms.uOuterColor.value.setHex(0x0284c7);
      } else {
        this.parashuAuraMat.uniforms.uMidColor.value.setHex(0xff9f2e);
        this.parashuAuraMat.uniforms.uOuterColor.value.setHex(0xe64d1c);
      }
    }

    this.wrapper.rotation.y = Math.PI * 0.5 - quantizedYaw;
    this.wrapper.rotation.x = 0;

    renderer.render(this.scene, this.camera);

    const rimRgba = susanooActive
      ? 'rgba(255, 92, 42, 0.52)'
      : activeBoost > 0
        ? isPillar
          ? 'rgba(52, 245, 165, 0.36)'
          : isThrust
            ? 'rgba(72, 228, 255, 0.38)'
            : 'rgba(255, 178, 72, 0.38)'
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
      if (oldest) this.frameCache.delete(oldest);
    }
    this.frameCache.set(cacheKey, baked);

    return baked;
  }

  public dispose(): void {
    this.disposed = true;
    this.prewarmQueue.length = 0;
    if (this.prewarmTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.prewarmTimer);
      this.prewarmTimer = null;
    }
    this.frameCache.clear();
  }
}

