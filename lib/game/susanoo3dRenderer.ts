import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { shouldStartGuardianSwing } from './guardianAttackGate';
import { createGuardianProofClips } from './guardianPreviewAnimation';
import {
  getSharedStudioWebGLRenderer,
  isSoftwareWebGLRenderer,
} from './hadesSpriteBaker';
import { loadFbxCached } from './meshSimplifier';
import {
  buildStabilizedInPlaceClip,
  extractStandingHipY,
} from './enemy3dRenderer';
import {
  KALA_BHAIRAVA_DURATION_SEC,
  computeCameraFootAnchorRatio,
} from './kalaBhairavaSusanoo';

export type SusanooPaletteKey = 'crimson_gold' | 'violet_indigo' | 'emerald_jade';

export interface Susanoo3DRenderInput {
  facingX: number;
  facingY: number;
  slashAngle: number;
  weaponSwingProgress: number;
  isAttacking: boolean;
  isHeavyAttack?: boolean;
  attackSerial?: number;
  comboStep?: number;
  transformTimer: number;
  nowMs: number;
  dt?: number;
  palette?: SusanooPaletteKey;
}

const PALETTE_COLORS: Record<
  SusanooPaletteKey,
  { core: THREE.Color; mid: THREE.Color; rim: THREE.Color; rib: THREE.Color }
> = {
  crimson_gold: {
    core: new THREE.Color('#5a0b1e'),
    mid: new THREE.Color('#e83b18'),
    rim: new THREE.Color('#ffe9a6'),
    rib: new THREE.Color('#ff8c28'),
  },
  violet_indigo: {
    core: new THREE.Color('#270d52'),
    mid: new THREE.Color('#8b2ce8'),
    rim: new THREE.Color('#f0dcff'),
    rib: new THREE.Color('#c084fc'),
  },
  emerald_jade: {
    core: new THREE.Color('#064234'),
    mid: new THREE.Color('#10b981'),
    rim: new THREE.Color('#d1fae5'),
    rib: new THREE.Color('#34d399'),
  },
};

// Properly skinned Three.js vertex shader so rigged `SkinnedMesh` Susanoo warlord
// animates smoothly with Creature Pack + Pro Melee Axe Pack clips without collapsing
// or exploding across the canvas!
const SUSANOO_SKINNED_VERTEX_SHADER = /* glsl */ `
  #include <common>
  #include <skinning_pars_vertex>

  varying vec3 vNormalView;
  varying vec3 vViewPos;
  varying vec3 vWorldPos;
  varying vec2 vNdcPos;

  uniform float uTime;

  void main() {
    #include <beginnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <begin_vertex>
    #include <skinning_vertex>

    // Subtle rising spectral chakra flame breathing along skinned normals
    float breath = sin(uTime * 5.0 + transformed.y * 0.04) * 0.004;
    transformed += normalize(objectNormal + vec3(0.0001)) * breath;

    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vWorldPos = worldPosition.xyz;
    vec4 mvPosition = viewMatrix * worldPosition;
    vViewPos = -mvPosition.xyz;
    vNormalView = normalize(normalMatrix * objectNormal);

    vec4 clipPos = projectionMatrix * mvPosition;
    vNdcPos = clipPos.xy / max(clipPos.w, 0.0001);
    gl_Position = clipPos;
  }
`;

const SUSANOO_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vNormalView;
  varying vec3 vViewPos;
  varying vec3 vWorldPos;
  varying vec2 vNdcPos;

  uniform float uTime;
  uniform float uAlpha;
  uniform float uWaistMinY;
  uniform float uWaistMaxY;
  uniform float uAttackFlash;
  uniform float uPreviewClarity;
  uniform vec3 uCoreColor;
  uniform vec3 uMidColor;
  uniform vec3 uRimColor;
  uniform vec3 uRibColor;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.52;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.04;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Soft radial edge fade in NDC space guarantees Susanoo NEVER clips into a hard square box!
    float edgeDist = max(abs(vNdcPos.x), abs(vNdcPos.y));
    float radialFade = 1.0 - smoothstep(0.76, 0.96, edgeDist);
    if (radialFade <= 0.01) {
      discard;
    }

    vec3 N = normalize(vNormalView);
    vec3 V = normalize(vViewPos);
    float ndotv = clamp(abs(dot(N, V)), 0.0, 1.0);

    // Naruto Storm / Shinobi Striker razor-sharp Fresnel silhouette + carved inner anatomy
    float fresnel = pow(1.0 - ndotv, 2.25);
    float razorRim = smoothstep(0.48, 0.88, 1.0 - ndotv);
    float darkCoreLine = smoothstep(0.82, 0.96, 1.0 - ndotv);

    // Rising spectral chakra flame ripples flowing upward over sculpted horns & shoulder armor
    vec2 flameUv = vec2(vWorldPos.x * 2.4 + vWorldPos.z * 1.5, vWorldPos.y * 2.5 - uTime * 2.9);
    float flame = fbm(flameUv);
    float ribLines = pow(0.5 + 0.5 * sin(vWorldPos.y * 16.0 - uTime * 3.6 + flame * 2.6), 3.0);

    // Clean half-body waist-down ethereal flame dissolve
    float flameEdge = uWaistMinY + (uWaistMaxY - uWaistMinY) * (0.30 + flame * 0.70);
    float waistMask = smoothstep(flameEdge - 0.14, flameEdge + 0.32, vWorldPos.y);
    if (waistMask <= 0.02) {
      discard;
    }

    // Layered Susanoo energy shading: deep translucent chakra torso -> incandescent ribs -> razor white-gold silhouette
    vec3 energyColor = mix(uCoreColor, uMidColor, clamp(flame * 0.72 + fresnel * 0.45, 0.0, 1.0));
    energyColor = mix(energyColor, uRibColor, clamp(ribLines * 0.46 + uAttackFlash * 0.25, 0.0, 1.0));
    energyColor = mix(energyColor, uRimColor, clamp(fresnel * 0.95 + razorRim * 0.72, 0.0, 1.0));

    // Subtle dark anime ink-etch at the extreme grazing contour for crisp Naruto Storm silhouette pop
    energyColor = mix(energyColor, uCoreColor * 0.25, darkCoreLine * 0.32);

    float dissolveTongue = smoothstep(0.04, 0.40, waistMask) * (1.0 - smoothstep(0.42, 0.85, waistMask));
    energyColor += uRimColor * (dissolveTongue * 0.45 + uAttackFlash * 0.22);

    // Keep chest interior translucent (~0.24) so calm-walking Rudra inside stays clearly visible,
    // while armor rims and horns glow intensely (~0.88)
    float interior = mix(0.22 + fresnel * 0.68 + ribLines * 0.12,
                         0.66 + fresnel * 0.25 + ribLines * 0.06,
                         uPreviewClarity);
    float finalAlpha = uAlpha * waistMask * radialFade * interior;
    finalAlpha = clamp(finalAlpha, 0.0, 0.90);

    gl_FragColor = vec4(energyColor, finalAlpha);
  }
`;

export const SUSANOO_FBX_URL = '/models_v2/horned_warlord_abyss.fbx';
const GUARDIAN_RIGGED_QA_URL = '/models_v2/rigged_crimson_guardian_preview.fbx';
const ABYSS_RIGGED_QA_URL = '/models_v2/kala_bhairava_guardian_rigged.fbx';

const SUSANOO_ANIM_URLS = {
  idle: '/new_3d_assets/Animations/Creature Pack (4)/mutant breathing idle.fbx',
  roar: '/new_3d_assets/Animations/Creature Pack (4)/mutant roaring.fbx',
  swing1: '/new_3d_assets/Animations/Pro Melee Axe Pack (5)/standing melee attack downward.fbx',
  swing2: '/new_3d_assets/Animations/Pro Melee Axe Pack (5)/standing melee attack 360 high.fbx',
  swing3: '/new_3d_assets/Animations/Pro Melee Axe Pack (5)/standing melee combo attack ver. 1.fbx',
} as const;

type SusanooClipKey = keyof typeof SUSANOO_ANIM_URLS;

/**
 * True Animated Skinned 3D Half-Body Kala-Bhairava Susanoo Renderer.
 * - Renders `Horned_Warlord_of_the_Abyss` with full GPU skeletal skinning + Fresnel Chakra-Flame GLSL shader.
 * - Blends Creature Pack idle & summon roar with Pro Melee Axe Pack bare-arm heavy swings (zero crude procedural axe!).
 * - Wide camera framing + NDC radial fade guarantees zero orange square clipping.
 */
export class Susanoo3DRenderer {
  private canvas: HTMLCanvasElement;
  private ctx2d: CanvasRenderingContext2D | null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private modelPivot: THREE.Group;
  private meshGroup: THREE.Group | null = null;
  private chakraMaterial: THREE.ShaderMaterial;
  private haloRing: THREE.Mesh;

  private mixer: THREE.AnimationMixer | null = null;
  private actions: Partial<Record<SusanooClipKey, THREE.AnimationAction>> = {};
  private activeClip: SusanooClipKey | null = null;
  private hasSkinnedBones = false;
  private readonly guardianPreviewSource =
    typeof window === 'undefined' ? '' : (new URLSearchParams(window.location.search).get('guardianPreview') ?? '');
  private readonly riggedPreviewMode = this.guardianPreviewSource === '1' || this.guardianPreviewSource === 'abyss';
  private readonly abyssRiggedPreview = this.guardianPreviewSource === 'abyss';
  private generatedPreviewBones: string[] = [];
  private previewArmBone: THREE.Bone | null = null;
  private previewArmAtRest = new THREE.Quaternion();
  private peakPreviewArmRotationRad = 0;
  private lastAttackSerial = -1;
  private wasAttacking = false;
  private roarPlayedForSummon = false;
  private lastTransformTimer = 0;
  private attackAnimHoldSec = 0;
  private activeSwingIndex = 0;

  private isLoaded = false;
  private isLoading = false;
  private loadFailed = false;
  private rendered3dFrameCount = 0;
  private lastRenderMs = 0;
  private lastSignature = '';
  public readonly footAnchorRatio: number;

  constructor(size = 420) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;
    this.ctx2d = this.canvas.getContext('2d');

    this.scene = new THREE.Scene();

    // Generous isometric framing so wide horns & sweeping arms NEVER clip the canvas bounds
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    this.camera.position.set(0, 2.45, 5.85);
    this.camera.lookAt(0, 1.48, 0);
    this.footAnchorRatio = computeCameraFootAnchorRatio(this.camera, 0);

    const palette = PALETTE_COLORS.crimson_gold;
    this.chakraMaterial = new THREE.ShaderMaterial({
      vertexShader: SUSANOO_SKINNED_VERTEX_SHADER,
      fragmentShader: SUSANOO_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uAlpha: { value: 0.92 },
        uWaistMinY: { value: this.riggedPreviewMode ? 0.08 : 0.62 },
        uWaistMaxY: { value: this.riggedPreviewMode ? 0.54 : 1.24 },
        uAttackFlash: { value: 0.0 },
        uPreviewClarity: { value: this.riggedPreviewMode ? 1.0 : 0.0 },
        uCoreColor: { value: palette.core.clone() },
        uMidColor: { value: palette.mid.clone() },
        uRimColor: { value: palette.rim.clone() },
        uRibColor: { value: palette.rib.clone() },
      },
    });

    this.modelPivot = new THREE.Group();
    this.scene.add(this.modelPivot);

    // Subtle sacred spectral chakra ring floating behind Susanoo's shoulders
    const ringGeo = new THREE.TorusGeometry(0.96, 0.032, 10, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffc86b,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.haloRing = new THREE.Mesh(ringGeo, ringMat);
    this.haloRing.position.set(0, 1.88, -0.52);
    this.modelPivot.add(this.haloRing);

    this.loadMeshAndAnimations();
  }

  private async loadMeshAndAnimations(): Promise<void> {
    if (this.isLoading || this.isLoaded || this.loadFailed) return;
    this.isLoading = true;
    try {
      const previewSourceUrl = this.abyssRiggedPreview ? ABYSS_RIGGED_QA_URL : this.riggedPreviewMode ? GUARDIAN_RIGGED_QA_URL : SUSANOO_FBX_URL;
      const fbx = await loadFbxCached(previewSourceUrl, false);
      // A plain Object3D clone duplicates bones without reliably rebinding
      // SkinnedMesh.skeleton.bones to the cloned bone hierarchy. The avatar
      // can appear frozen or deformed even when an AnimationMixer advances.
      const clone = SkeletonUtils.clone(fbx) as THREE.Group;
      clone.animations = fbx.animations;

      let foundBones = false;
      let skinnedMeshes = 0;
      clone.traverse((child) => {
        if ((child as THREE.Bone).isBone || (child as THREE.SkinnedMesh).isSkinnedMesh) {
          foundBones = true;
        }
        if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
          const sm = child as THREE.SkinnedMesh;
          if (sm.skeleton?.bones?.length) skinnedMeshes += 1;
        }
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.material = this.chakraMaterial;
          mesh.frustumCulled = false;
        }
      });
      this.hasSkinnedBones = foundBones && skinnedMeshes > 0;
      if (this.riggedPreviewMode && !this.hasSkinnedBones) {
        throw new Error('Rigged QA character is not a valid skinned mesh with bones');
      }

      const standingHipY = foundBones ? extractStandingHipY(clone) : 0;
      const rawBox = new THREE.Box3().setFromObject(clone);
      const rawSize = new THREE.Vector3();
      rawBox.getSize(rawSize);

      // Fit cleanly inside the 5.85-unit camera frustum (~2.45 units tall) with breathing room for horns & swings
      const targetHeight = this.riggedPreviewMode ? 3.08 : 2.45;
      const scale = targetHeight / Math.max(0.001, rawSize.y);
      clone.scale.setScalar(scale);

      const scaledBox = new THREE.Box3().setFromObject(clone);
      const scaledCenter = new THREE.Vector3();
      scaledBox.getCenter(scaledCenter);
      // Avoid double-lifting rigged Mixamo skeletons whose hips already anchor at y = 0
      const baseY = foundBones && Math.abs(standingHipY) > 0.01 ? 0 : -scaledBox.min.y;
      clone.position.set(-scaledCenter.x, baseY, -scaledCenter.z);
      if (this.riggedPreviewMode) {
        // Move the large spectral fighter slightly behind Rudra, keeping
        // feet at the contact shadow rather than a detached upper corner.
        clone.position.y += 0.05;
      }

      this.meshGroup = new THREE.Group();
      this.meshGroup.add(clone);
      this.modelPivot.add(this.meshGroup);

      if (this.hasSkinnedBones) {
        this.mixer = new THREE.AnimationMixer(clone);
        if (!this.riggedPreviewMode && clone.animations?.[0]) {
          const baseClip = buildStabilizedInPlaceClip(clone.animations[0], clone, standingHipY);
          if (baseClip.tracks.length > 0) {
            const act = this.mixer.clipAction(baseClip);
            act.setLoop(THREE.LoopRepeat, Infinity);
            this.actions.idle = act;
            this.playClip('idle', 0.05, 0.92);
          }
        }
      }

      this.isLoaded = true;

      if (this.abyssRiggedPreview && this.mixer) {
        // The actual approved Abyss sculpt now has a 33-bone skin in a NEW
        // generated FBX. Drive its own Mixamo-compatible bones using the
        // original Creature Pack and axe clips, rather than substituting the
        // Crimson Skull warlord or static orange shader mesh.
        this.streamSusanooClips(clone, standingHipY);
      } else if (this.riggedPreviewMode && this.mixer) {
        // The alternative Crimson Skull source is genuinely skinned, but its
        // embedded clip is Running. Build an explicit *preview* animation
        // set that targets exactly its own known Mixamo bone hierarchy;
        // unrelated Creature Pack clips must never play on this skeleton.
        const { clips, animatedBones } = createGuardianProofClips(clone);
        this.generatedPreviewBones = animatedBones;
        const rightArm = clone.getObjectByName('mixamorigRightArm');
        if (rightArm && (rightArm as THREE.Bone).isBone) {
          this.previewArmBone = rightArm as THREE.Bone;
          this.previewArmAtRest.copy(this.previewArmBone.quaternion);
        }
        for (const [key, clip] of Object.entries(clips) as Array<[SusanooClipKey, THREE.AnimationClip]>) {
          if (clip.tracks.length === 0) throw new Error('Missing guardian QA animation tracks: ' + key);
          const act = this.mixer.clipAction(clip);
          const loop = key === 'idle';
          act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
          act.clampWhenFinished = !loop;
          this.actions[key] = act;
        }
        this.playClip('idle', 0.03, 0.85, true);
      } else if (this.hasSkinnedBones && this.mixer) {
        // Original runtime path. Do not claim this works for an unskinned source.
        this.streamSusanooClips(clone, standingHipY);
      }
    } catch (err) {
      console.warn('[Susanoo3DRenderer] Failed to load Horned_Warlord_of_the_Abyss FBX:', err);
      this.loadFailed = true;
    } finally {
      this.isLoading = false;
    }
  }

  private streamSusanooClips(clone: THREE.Group, standingHipY: number): void {
    const entries: Array<[SusanooClipKey, string, boolean]> = [
      ['idle', SUSANOO_ANIM_URLS.idle, true],
      ['roar', SUSANOO_ANIM_URLS.roar, false],
      ['swing1', SUSANOO_ANIM_URLS.swing1, false],
      ['swing2', SUSANOO_ANIM_URLS.swing2, false],
      ['swing3', SUSANOO_ANIM_URLS.swing3, false],
    ];

    Promise.allSettled(
      entries.map(([, url]) => loadFbxCached(url, false))
    ).then((results) => {
      if (!this.mixer) return;
      results.forEach((res, idx) => {
        if (res.status !== 'fulfilled') return;
        const [key, , loop] = entries[idx];
        const srcClip = res.value.animations?.[0];
        if (!srcClip) return;
        const stabilized = buildStabilizedInPlaceClip(srcClip, clone, standingHipY);
        if (stabilized.tracks.length === 0) return;
        stabilized.name = `susanoo_${key}`;
        const act = this.mixer!.clipAction(stabilized);
        act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        act.clampWhenFinished = !loop;
        const priorIdle = key === 'idle' ? this.actions.idle : null;
        this.actions[key] = act;
        // Never leave the base FBX idle clip running beneath a streamed idle.
        if (key === 'idle' && priorIdle && priorIdle !== act && this.activeClip === 'idle') {
          priorIdle.fadeOut(0.12);
          act.reset().setEffectiveWeight(1).fadeIn(0.12).play();
        }
      });
      if (this.actions.idle && !this.activeClip) {
        this.playClip('idle', 0.1, 0.9);
      }
    });
  }

  private playClip(
    key: SusanooClipKey,
    fadeSec = 0.14,
    timeScale = 1.0,
    forceRestart = false
  ): void {
    const resolvedKey: SusanooClipKey = this.actions[key] ? key : 'idle';
    const next = this.actions[resolvedKey];
    if (!next) return;
    if (this.activeClip === resolvedKey && !forceRestart) {
      next.setEffectiveTimeScale(timeScale);
      return;
    }
    const prev = this.activeClip ? this.actions[this.activeClip] : null;
    next.reset();
    next.enabled = true;
    next.setEffectiveWeight(1);
    next.setEffectiveTimeScale(timeScale);
    next.play();
    if (prev && prev !== next) {
      prev.crossFadeTo(next, fadeSec, false);
    }
    this.activeClip = resolvedKey;
  }

  public isReady(): boolean {
    return this.isLoaded && !this.loadFailed;
  }

  /** Read-only snapshot for real browser QA; never used for gameplay decisions. */
  public debugStatus(): {
    ready: boolean;
    loading: boolean;
    failed: boolean;
    skinned: boolean;
    activeClip: string | null;
    loadedActions: string[];
    lastAttackSerial: number;
    rendered3dFrameCount: number;
    peakPreviewArmRotationRad: number;
    riggedPreviewMode: boolean;
    guardianPreviewSource: string;
    skeletonAnimationReady: boolean;
    animatedPreviewBoneNames: string[];
  } {
    return {
      ready: this.isReady(),
      loading: this.isLoading,
      failed: this.loadFailed,
      skinned: this.hasSkinnedBones,
      activeClip: this.activeClip,
      loadedActions: Object.keys(this.actions).sort(),
      lastAttackSerial: this.lastAttackSerial,
      rendered3dFrameCount: this.rendered3dFrameCount,
      peakPreviewArmRotationRad: Number(this.peakPreviewArmRotationRad.toFixed(3)),
      riggedPreviewMode: this.riggedPreviewMode,
      guardianPreviewSource: this.guardianPreviewSource,
      skeletonAnimationReady: this.hasSkinnedBones && Boolean(this.actions.swing1) && Boolean(this.actions.swing2) && Boolean(this.actions.swing3),
      animatedPreviewBoneNames: this.generatedPreviewBones,
    };
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public renderFrame(input: Susanoo3DRenderInput): HTMLCanvasElement | null {
    if (!this.isLoaded || !this.ctx2d || input.transformTimer <= 0) {
      this.roarPlayedForSummon = false;
      this.lastTransformTimer = 0;
      this.wasAttacking = false;
      this.lastAttackSerial = -1;
      this.attackAnimHoldSec = 0;
      return null;
    }

    const size = this.canvas.width;
    const renderer = getSharedStudioWebGLRenderer(size);
    if (!renderer) return null;

    // Detect fresh Susanoo activation -> trigger Creature Pack summon roar!
    if (input.transformTimer > this.lastTransformTimer + 0.5 || !this.roarPlayedForSummon) {
      this.roarPlayedForSummon = true;
      if (this.actions.roar) {
        this.playClip('roar', 0.08, 1.15, true);
        this.attackAnimHoldSec = 0.72;
      }
    }
    this.lastTransformTimer = input.transformTimer;

    const dt = Math.min(0.05, Math.max(0.008, input.dt ?? 0.016));

    // Trigger Pro Melee Axe Pack heavy bare-arm swings whenever Rudra commands an attack inside Susanoo
    const startNewSwing = shouldStartGuardianSwing({
      isAttacking: input.isAttacking,
      attackSerial: input.attackSerial,
      lastAttackSerial: this.lastAttackSerial,
      wasAttacking: this.wasAttacking,
    });
    if (startNewSwing) {
      if (typeof input.attackSerial === 'number' && Number.isFinite(input.attackSerial)) {
        this.lastAttackSerial = input.attackSerial;
      }
      this.activeSwingIndex = ((input.comboStep ?? this.activeSwingIndex + 1) % 3);
      const swingKey: SusanooClipKey =
        input.isHeavyAttack || this.activeSwingIndex === 1
          ? 'swing2'
          : this.activeSwingIndex === 2
            ? 'swing3'
            : 'swing1';
      this.playClip(swingKey, 0.08, input.isHeavyAttack ? 1.25 : 1.4, true);
      this.attackAnimHoldSec = input.isHeavyAttack ? 0.56 : 0.42;
    } else if (this.attackAnimHoldSec > 0) {
      this.attackAnimHoldSec = Math.max(0, this.attackAnimHoldSec - dt);
      if (this.attackAnimHoldSec <= 0 && this.activeClip !== 'idle') {
        this.playClip('idle', 0.22, 0.92, false);
      }
    } else if (this.activeClip !== 'idle') {
      this.playClip('idle', 0.22, 0.92, false);
    }

    this.wasAttacking = input.isAttacking;
    if (this.mixer) {
      this.mixer.update(dt);
    }
    if (this.riggedPreviewMode && this.previewArmBone) {
      this.peakPreviewArmRotationRad = Math.max(
        this.peakPreviewArmRotationRad,
        this.previewArmBone.quaternion.angleTo(this.previewArmAtRest)
      );
    }

    // Throttle software WebGL slightly (~24fps) while keeping GPU at fluid 60fps
    const isSw = isSoftwareWebGLRenderer();
    const minIntervalMs = isSw ? 42 : 16;
    if (input.nowMs - this.lastRenderMs < minIntervalMs && this.lastSignature) {
      return this.canvas;
    }

    const t = input.nowMs * 0.001;
    const fadeIn = Math.min(1, (KALA_BHAIRAVA_DURATION_SEC - input.transformTimer) / 0.28);
    const fadeOut = Math.min(1, input.transformTimer / 0.65);
    const alpha = Math.max(0, Math.min(1, Math.min(fadeIn, fadeOut)));
    if (alpha <= 0.02) return null;

    const paletteKey = input.palette || 'crimson_gold';
    const pal = PALETTE_COLORS[paletteKey] || PALETTE_COLORS.crimson_gold;
    // The QA model is warm orange because its default mid and rib are gold.
    // Preview dark-crimson/bronze skin rather than a flat translucent torch.
    const previewPalette = this.riggedPreviewMode
      ? {
          core: new THREE.Color('#26091c'),
          mid: new THREE.Color('#a61a43'),
          rim: new THREE.Color('#ffd09a'),
          rib: new THREE.Color('#d74a35'),
        }
      : pal;

    // Update shader uniforms
    this.chakraMaterial.uniforms.uTime.value = t;
    this.chakraMaterial.uniforms.uAlpha.value = alpha * 0.94;
    this.chakraMaterial.uniforms.uAttackFlash.value =
      this.attackAnimHoldSec > 0 ? Math.min(1, this.attackAnimHoldSec * 2.2) : 0;
    this.chakraMaterial.uniforms.uCoreColor.value.copy(previewPalette.core);
    this.chakraMaterial.uniforms.uMidColor.value.copy(previewPalette.mid);
    this.chakraMaterial.uniforms.uRimColor.value.copy(previewPalette.rim);
    this.chakraMaterial.uniforms.uRibColor.value.copy(previewPalette.rib);

    // Orient towering Susanoo toward Rudra's facing direction + authoritative cleave twist on swing
    const yaw = Math.atan2(input.facingX, Math.max(0.28, input.facingY * 0.65 + 0.55));
    const swingTwist =
      this.attackAnimHoldSec > 0
        ? Math.sin((1 - this.attackAnimHoldSec / 0.56) * Math.PI) *
          (this.hasSkinnedBones ? 0.26 : 0.62) *
          (this.activeSwingIndex % 2 === 0 ? 1 : -1)
        : 0;
    const swingPitch =
      this.attackAnimHoldSec > 0
        ? Math.sin((1 - this.attackAnimHoldSec / 0.56) * Math.PI) *
          (this.hasSkinnedBones ? 0.08 : 0.22)
        : 0;

    this.modelPivot.rotation.y = yaw * 0.72 + swingTwist;
    this.modelPivot.rotation.x = swingPitch;
    this.modelPivot.position.y = Math.sin(t * 3.8) * 0.05;

    // Spin spectral chakra halo behind shoulders
    this.haloRing.rotation.z = t * 1.1;
    const ringMat = this.haloRing.material as THREE.MeshBasicMaterial;
    ringMat.opacity = alpha * (this.riggedPreviewMode ? 0.16 : 0.36) + Math.sin(t * 6.5) * 0.035;

    renderer.setSize(size, size, false);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(this.scene, this.camera);

    this.ctx2d.clearRect(0, 0, size, size);
    this.ctx2d.drawImage(renderer.domElement, 0, 0, size, size);
    this.rendered3dFrameCount += 1;

    this.lastRenderMs = input.nowMs;
    this.lastSignature = `${paletteKey}_${Math.round(t * 24)}_${this.activeClip || 'idle'}`;
    return this.canvas;
  }

  public dispose(): void {
    this.chakraMaterial.dispose();
    this.haloRing.geometry.dispose();
    (this.haloRing.material as THREE.Material).dispose();
  }
}
