'use client';

// ============================================================================
// REAL-TIME 60FPS 3D BOSS RENDERER FOR DUNDUBHI & VRIKODARA (THREE.JS + FBX)
// - Native skeleton-matched animations (Zero cross-rig bone twisting or 90-deg flips!)
//   * Dundubhi (Runebound Minotaur Warlord): Mixamo Mutant Y-Up Rig (Hips Y = 73.15)
//     uses ONLY Mutant FBX clips + poised Combat_Idle + procedural Parashu articulation
//   * Vrikodara (Infernal Maw Iron Giant): Meshy Biped Y-Up Rig (Hips Y = 0.90, scale = 100)
//     uses ONLY Meshy Biped FBX clips + poised Combat_Idle + procedural Parashu articulation
// - True 360-degree isometric yaw tracking toward Rudra + 3D crimson weapon trail ribbon
// ============================================================================

import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { IS_SOFTWARE_WEBGL } from '../../engine/ue5GraphicsEngine';
import { GAME_ASSETS } from './assets';

export type Boss3DKind = 'dundubhi' | 'vrikodara';

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

type BossClipKey =
  | 'idle'
  | 'run'
  | 'charge'
  | 'swipe'
  | 'cleave'
  | 'combo'
  | 'whirlwind'
  | 'slam'
  | 'jumpAttack'
  | 'stagger';

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
 * Retargets a same-skeleton animation clip onto `targetRoot` and locks horizontal root drift
 * in-place at `standingHipY` (`73.15` for Dundubhi, `0.90` for Vrikodara).
 * Zero cross-rig quaternion hacks — preserves 100% authentic bind-pose limb orientations!
 */
function buildNativeInPlaceClip(
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

  const isArise = clip.name.toLowerCase().includes('arise');
  const newTracks: THREE.KeyframeTrack[] = [];

  for (const track of clip.tracks) {
    const dotIdx = track.name.indexOf('.');
    if (dotIdx < 0) continue;
    const rawNode = track.name.slice(0, dotIdx).replace(/^Armature\|/i, '');
    const prop = track.name.slice(dotIdx + 1);
    const cleanNode = rawNode.replace(/^mixamorig:?/i, '').toLowerCase();
    const mappedBone = boneMap.get(cleanNode) || boneMap.get(rawNode.toLowerCase());
    if (!mappedBone) continue;

    // Strip scale tracks so animations never distort meshes
    if (prop === 'scale') continue;

    if (prop === 'position') {
      if (cleanNode !== 'hips' && cleanNode !== 'target_character') continue;
      const cloned = track.clone();
      cloned.name = `${mappedBone}.position`;
      const vals = cloned.values;
      const baseX = vals[0] || 0;
      const baseY = vals[1] || standingHipY;
      const baseZ = vals[2] || 0;

      for (let i = 0; i < vals.length; i += 3) {
        vals[i] = (vals[i] - baseX) * 0.04;
        vals[i + 2] = (vals[i + 2] - baseZ) * 0.04;
        if (isArise) {
          vals[i + 1] = Math.max(standingHipY * 0.62, standingHipY * 0.88);
        } else {
          const dy = vals[i + 1] - baseY;
          const clampedDy = Math.max(-maxBounce, Math.min(maxBounce * 1.25, dy * 0.5));
          vals[i + 1] = standingHipY + clampedDy;
        }
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
 * Generates a poised, breathing Hades-style Combat Idle clip sampled from a native locomotion/idle
 * pose at `sampleTime` so the boss never plays random emotes, flexes, or T-poses while standing.
 */
function createPoisedBossIdleClip(
  baseClip: THREE.AnimationClip,
  targetRoot: THREE.Object3D,
  standingHipY: number,
  sampleTime: number,
  customName: string
): THREE.AnimationClip {
  const inPlaceBase = buildNativeInPlaceClip(
    baseClip,
    targetRoot,
    standingHipY,
    standingHipY * 0.02,
    `${customName}_base`
  );

  const duration = 2.0;
  const times = [0, 0.5, 1.0, 1.5, 2.0];
  const newTracks: THREE.KeyframeTrack[] = [];
  const breathAmp = standingHipY * 0.016;

  for (const track of inPlaceBase.tracks) {
    const itemSize = track.getValueSize();
    const interpolant = (
      track as THREE.KeyframeTrack & {
        createInterpolant: () => { evaluate: (t: number) => Float32Array | number[] };
      }
    ).createInterpolant();
    const baseVal = Array.from(interpolant.evaluate(sampleTime));

    const isSpine = track.name.includes('Spine') && track.name.endsWith('.quaternion');
    const isRightArm = track.name.includes('RightArm') && track.name.endsWith('.quaternion');
    const isHipsPos = track.name.includes('Hips') && track.name.endsWith('.position');

    const outValues: number[] = [];
    for (let step = 0; step < times.length; step++) {
      const phase = Math.sin((step / (times.length - 1)) * Math.PI * 2);
      if (isHipsPos && itemSize === 3) {
        outValues.push(0, standingHipY + phase * breathAmp, 0);
      } else if ((isSpine || isRightArm) && itemSize === 4) {
        const q = new THREE.Quaternion(baseVal[0], baseVal[1], baseVal[2], baseVal[3]);
        const breathQ = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            isSpine ? phase * 0.025 : phase * 0.032,
            0,
            isRightArm ? phase * 0.022 : 0
          )
        );
        q.multiply(breathQ).normalize();
        outValues.push(q.x, q.y, q.z, q.w);
      } else {
        outValues.push(...baseVal);
      }
    }

    if (itemSize === 4 && track instanceof THREE.QuaternionKeyframeTrack) {
      newTracks.push(new THREE.QuaternionKeyframeTrack(track.name, times, outValues));
    } else {
      newTracks.push(new THREE.VectorKeyframeTrack(track.name, times, outValues));
    }
  }

  return new THREE.AnimationClip(customName, duration, newTracks);
}

export class Boss3DRenderer {
  public readonly canvas: HTMLCanvasElement;
  public isReady = false;
  public loadProgress = 0;

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;

  private rigs: Partial<Record<Boss3DKind, LoadedBossRig>> = {};
  private activeKind: Boss3DKind | null = null;
  private currentYaw = 0;
  private targetYaw = 0;
  private lastAiState: Boss3DUpdateParams['aiState'] = 'idle';
  private attackSwingTimer = 0;
  private attackSwingDuration = 0.36;
  private disposed = false;

  // Real-time 3D Boss Weapon Trail Ribbon
  private trailGeometry: THREE.BufferGeometry;
  private trailMaterial: THREE.MeshBasicMaterial;
  private trailMesh: THREE.Mesh;
  private trailSamples: TrailSample[] = [];
  private readonly maxTrailSamples = 14;

  private readonly scratchRotQ = new THREE.Quaternion();
  private readonly scratchEuler = new THREE.Euler();

  constructor(size = 384) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;

    this.scene = new THREE.Scene();

    // Isometric Orthographic Camera matching Rudra's 30-degree Hades arena projection
    const frustumHalf = 142;
    this.camera = new THREE.OrthographicCamera(
      -frustumHalf,
      frustumHalf,
      frustumHalf,
      -frustumHalf,
      1,
      1200
    );
    this.camera.position.set(0, 205, 320);
    this.camera.lookAt(0, 82, 0);

    // Balanced Crisp Studio PBR Lighting
    const ambient = new THREE.AmbientLight(0xe6e2ee, 1.7);
    this.scene.add(ambient);

    this.keyLight = new THREE.DirectionalLight(0xfff3db, 2.8);
    this.keyLight.position.set(-140, 270, 210);
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0xf5c878, 2.2);
    this.rimLight.position.set(150, 210, -200);
    this.scene.add(this.rimLight);

    this.fillLight = new THREE.DirectionalLight(0x8896b8, 1.35);
    this.fillLight.position.set(160, 75, 140);
    this.scene.add(this.fillLight);

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
      color: 0xff3b28,
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
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: !IS_SOFTWARE_WEBGL,
        powerPreference: 'high-performance',
      });
      this.renderer.setSize(size, size, false);
      this.renderer.setPixelRatio(1);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.14;
      this.renderer.shadowMap.enabled = !IS_SOFTWARE_WEBGL;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // UE5 Lumen-Style Studio IBL Environment Map for Chola Bronze & Iron Rakshasa Armor
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();

      this.loadAllBossAssets();
    } catch {
      this.renderer = null;
    }
  }

  private async loadAllBossAssets(): Promise<void> {
    const fbxLoader = new FBXLoader();
    const texLoader = new THREE.TextureLoader();

    const loadFbx = (url: string) =>
      new Promise<THREE.Group>((resolve, reject) => {
        fbxLoader.load(url, resolve, undefined, reject);
      });

    const loadTex = (url: string, isColor = false) =>
      new Promise<THREE.Texture>((resolve) => {
        texLoader.load(
          url,
          (t) => {
            if (isColor) t.colorSpace = THREE.SRGBColorSpace;
            t.needsUpdate = true;
            resolve(t);
          },
          undefined,
          () => resolve(new THREE.Texture())
        );
      });

    try {
      this.loadProgress = 12;
      const wepBase = '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx';

      const [
        dundubhiGroup,
        mIdleFbx,
        mRunFbx,
        mSwipeFbx,
        mJumpFbx,
        vrikodaraGroup,
        rudraAnimSource,
        tridentFbx,
        dunBase,
        dunNorm,
        dunRough,
        dunMet,
        vrikBase,
        vrikMet,
        vrikNorm,
        vrikRough,
        wepBaseTex,
        wepNormTex,
        wepRoughTex,
        wepMetTex,
      ] = await Promise.all([
        loadFbx(GAME_ASSETS.models3d.dundubhiFbx),
        loadFbx(GAME_ASSETS.models3d.dundubhiAnims.idle),
        loadFbx(GAME_ASSETS.models3d.dundubhiAnims.run),
        loadFbx(GAME_ASSETS.models3d.dundubhiAnims.swipe),
        loadFbx(GAME_ASSETS.models3d.dundubhiAnims.jumpAttack),
        loadFbx(GAME_ASSETS.models3d.vrikodaraFbx),
        loadFbx(GAME_ASSETS.models3d.rudraMergedFbx),
        loadFbx(GAME_ASSETS.models3d.tridentFbx),
        loadTex(GAME_ASSETS.models3d.dundubhiTex.baseColor, true),
        loadTex(GAME_ASSETS.models3d.dundubhiTex.normal, false),
        loadTex(GAME_ASSETS.models3d.dundubhiTex.roughness, false),
        loadTex(GAME_ASSETS.models3d.dundubhiTex.metallic, false),
        loadTex(GAME_ASSETS.models3d.vrikodaraTex.baseColor, true),
        loadTex(GAME_ASSETS.models3d.vrikodaraTex.metallic, false),
        loadTex(GAME_ASSETS.models3d.vrikodaraTex.normal, false),
        loadTex(GAME_ASSETS.models3d.vrikodaraTex.roughness, false),
        loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png`, true),
        loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_normal.png`, false),
        loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_roughness.png`, false),
        loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_metallic.png`, false),
      ]);

      if (this.disposed) return;
      this.loadProgress = 78;

      let rawWeaponMesh: THREE.Mesh | null = null;
      tridentFbx.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && !rawWeaponMesh) {
          rawWeaponMesh = child as THREE.Mesh;
        }
      });

      const createWepMat = () =>
        new THREE.MeshStandardMaterial({
          map: wepBaseTex,
          normalMap: wepNormTex,
          roughnessMap: wepRoughTex,
          metalnessMap: wepMetTex,
          roughness: 0.36,
          metalness: 0.86,
          envMapIntensity: 1.65,
          emissive: new THREE.Color(0x280608),
          emissiveIntensity: 0.1,
        });

      const registerNativeClip = (
        mixer: THREE.AnimationMixer,
        actions: Partial<Record<BossClipKey, THREE.AnimationAction>>,
        target: THREE.Object3D,
        standingHipY: number,
        maxBounce: number,
        key: BossClipKey,
        srcClip: THREE.AnimationClip | undefined,
        loop: boolean
      ) => {
        if (!srcClip) return;
        const processed = buildNativeInPlaceClip(
          srcClip,
          target,
          standingHipY,
          maxBounce,
          `${target.uuid}_${key}`
        );
        const act = mixer.clipAction(processed);
        act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        act.clampWhenFinished = !loop;
        actions[key] = act;
      };

      // ======================================================================
      // 1. CONFIGURE DUNDUBHI (Runebound Minotaur Warlord — Native Mutant Rig)
      //    Hips standing height = 73.15cm, Armature scale = 1.0
      // ======================================================================
      const dundubhiRoot = new THREE.Group();
      dundubhiGroup.scale.setScalar(1.26);
      dundubhiGroup.position.set(0, 0, 0);
      dundubhiRoot.add(dundubhiGroup);

      const dundubhiMaterials: THREE.MeshStandardMaterial[] = [];
      const dunWepMat = createWepMat();

      dundubhiGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.frustumCulled = false;
          mesh.castShadow = !IS_SOFTWARE_WEBGL;
          mesh.receiveShadow = !IS_SOFTWARE_WEBGL;
          const mat = new THREE.MeshStandardMaterial({
            map: dunBase,
            normalMap: dunNorm,
            normalScale: new THREE.Vector2(1.3, 1.3),
            roughnessMap: dunRough,
            metalnessMap: dunMet,
            roughness: 0.46,
            metalness: 0.68,
            envMapIntensity: 1.55,
            emissive: new THREE.Color(0x120a04),
            emissiveIntensity: 0.08,
          });
          mesh.material = mat;
          dundubhiMaterials.push(mat);
        }
      });

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
      if (dunBones.rightHand && rawWeaponMesh) {
        dunRightSocket = new THREE.Group();
        const dunMesh = (rawWeaponMesh as THREE.Mesh).clone();
        dunMesh.material = dunWepMat;
        dunMesh.frustumCulled = false;
        dunMesh.scale.setScalar(42);
        dunMesh.rotation.set(0, 0, -Math.PI / 2);
        dunMesh.position.set(0, 0, 14);

        dunTipNode.position.set(0, 0, 0.92);
        dunBaseNode.position.set(0, 0, 0.34);
        dunMesh.add(dunTipNode);
        dunMesh.add(dunBaseNode);

        dunRightSocket.add(dunMesh);
        dunRightSocket.position.set(0, 7.5, 1.0);
        dunRightSocket.rotation.set(0, Math.PI / 2, 0.28);
        dunBones.rightHand.add(dunRightSocket);
      }

      const mIdle = mIdleFbx.animations?.[0] || dundubhiGroup.animations?.[0];
      const mRun = mRunFbx.animations?.[0] || mIdle;
      const mSwipe = mSwipeFbx.animations?.[0] || mIdle;
      const mJump = mJumpFbx.animations?.[0] || mSwipe;

      const dunMixer = new THREE.AnimationMixer(dundubhiGroup);
      const dunActions: Partial<Record<BossClipKey, THREE.AnimationAction>> = {};

      // Poised breathing idle sampled from Mutant Idle at t=0.15s (zero random roar/emote!)
      if (mIdle) {
        const poisedDunIdle = createPoisedBossIdleClip(
          mIdle,
          dundubhiGroup,
          73.15,
          0.15,
          'dundubhi_poised_idle'
        );
        const idleAct = dunMixer.clipAction(poisedDunIdle);
        idleAct.setLoop(THREE.LoopRepeat, Infinity);
        dunActions.idle = idleAct;
      }

      // Strictly use Mutant clips on Dundubhi so every bone matches his Mutant bind pose!
      registerNativeClip(dunMixer, dunActions, dundubhiGroup, 73.15, 6.5, 'run', mRun, true);
      registerNativeClip(dunMixer, dunActions, dundubhiGroup, 73.15, 7.5, 'charge', mRun, true);
      registerNativeClip(dunMixer, dunActions, dundubhiGroup, 73.15, 6.5, 'swipe', mSwipe, false);
      registerNativeClip(dunMixer, dunActions, dundubhiGroup, 73.15, 6.5, 'cleave', mSwipe, false);
      registerNativeClip(dunMixer, dunActions, dundubhiGroup, 73.15, 6.5, 'combo', mSwipe, false);
      registerNativeClip(dunMixer, dunActions, dundubhiGroup, 73.15, 6.5, 'whirlwind', mSwipe, false);
      registerNativeClip(dunMixer, dunActions, dundubhiGroup, 73.15, 11.0, 'slam', mJump, false);
      registerNativeClip(dunMixer, dunActions, dundubhiGroup, 73.15, 11.0, 'jumpAttack', mJump, false);
      registerNativeClip(dunMixer, dunActions, dundubhiGroup, 62.0, 2.5, 'stagger', mIdle, true);

      this.rigs.dundubhi = {
        root: dundubhiRoot,
        mixer: dunMixer,
        actions: dunActions,
        activeKey: null,
        materials: dundubhiMaterials,
        weaponMaterials: [dunWepMat],
        rightWeaponSocket: dunRightSocket,
        leftWeaponSocket: null,
        weaponTipNode: dunTipNode,
        weaponBaseNode: dunBaseNode,
        bones: dunBones,
      };

      // ======================================================================
      // 2. CONFIGURE VRIKODARA (Infernal Maw Iron Giant — Native Meshy Biped Rig)
      //    Hips standing height = 0.90m, SmartRigArmature scale = 100
      // ======================================================================
      const vrikodaraRoot = new THREE.Group();
      vrikodaraGroup.scale.setScalar(1.04);
      vrikodaraGroup.position.set(0, 0, 0);
      vrikodaraRoot.add(vrikodaraGroup);

      const vrikMaterials: THREE.MeshStandardMaterial[] = [];
      const vrikWepMat = createWepMat();

      vrikodaraGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.frustumCulled = false;
          mesh.castShadow = !IS_SOFTWARE_WEBGL;
          mesh.receiveShadow = !IS_SOFTWARE_WEBGL;
          const mat = new THREE.MeshStandardMaterial({
            map: vrikBase,
            metalnessMap: vrikMet,
            normalMap: vrikNorm,
            normalScale: new THREE.Vector2(1.35, 1.35),
            roughnessMap: vrikRough,
            roughness: 0.42,
            metalness: 0.74,
            envMapIntensity: 1.6,
            emissive: new THREE.Color(0x1a0804),
            emissiveIntensity: 0.1,
          });
          mesh.material = mat;
          vrikMaterials.push(mat);
        }
      });

      const vrikBones: BossUpperBodyBones = {
        spine1: vrikodaraGroup.getObjectByName('mixamorigSpine1') || null,
        spine2: vrikodaraGroup.getObjectByName('mixamorigSpine2') || null,
        rightArm: vrikodaraGroup.getObjectByName('mixamorigRightArm') || null,
        rightForeArm: vrikodaraGroup.getObjectByName('mixamorigRightForeArm') || null,
        rightHand: vrikodaraGroup.getObjectByName('mixamorigRightHand') || null,
        leftArm: vrikodaraGroup.getObjectByName('mixamorigLeftArm') || null,
      };

      const vrikTipNode = new THREE.Object3D();
      const vrikBaseNode = new THREE.Object3D();
      let vrikRightSocket: THREE.Group | null = null;
      let vrikLeftSocket: THREE.Group | null = null;

      if (vrikBones.rightHand && rawWeaponMesh) {
        vrikRightSocket = new THREE.Group();
        const rightMesh = (rawWeaponMesh as THREE.Mesh).clone();
        rightMesh.material = vrikWepMat;
        rightMesh.frustumCulled = false;
        rightMesh.scale.setScalar(0.54);
        rightMesh.rotation.set(0, 0, -Math.PI / 2);
        rightMesh.position.set(0, 0, 0.18);

        vrikTipNode.position.set(0, 0, 0.92);
        vrikBaseNode.position.set(0, 0, 0.34);
        rightMesh.add(vrikTipNode);
        rightMesh.add(vrikBaseNode);

        vrikRightSocket.add(rightMesh);
        vrikRightSocket.position.set(0, 0.076, 0.01);
        vrikRightSocket.rotation.set(0, Math.PI / 2, 0.28);
        vrikBones.rightHand.add(vrikRightSocket);
      }

      const vrikLeftHand = vrikodaraGroup.getObjectByName('mixamorigLeftHand');
      if (vrikLeftHand && rawWeaponMesh) {
        vrikLeftSocket = new THREE.Group();
        const leftMesh = (rawWeaponMesh as THREE.Mesh).clone();
        leftMesh.material = vrikWepMat;
        leftMesh.frustumCulled = false;
        leftMesh.scale.setScalar(0.50);
        leftMesh.rotation.set(0, 0, Math.PI / 2);
        leftMesh.position.set(0, 0, 0.18);

        vrikLeftSocket.add(leftMesh);
        vrikLeftSocket.position.set(0, 0.076, 0.01);
        vrikLeftSocket.rotation.set(0, -Math.PI / 2, -0.28);
        vrikLeftSocket.visible = false;
        vrikLeftHand.add(vrikLeftSocket);
      }

      // Extract native Meshy Biped animations from Vrikodara & Rudra's merged Meshy Biped FBX
      const vrikNativeRun = vrikodaraGroup.animations?.[0];
      const rudraClips = new Map<string, THREE.AnimationClip>();
      for (const c of rudraAnimSource.animations || []) {
        rudraClips.set(c.name.toLowerCase(), c);
      }
      const findRudraClip = (substr: string) => {
        for (const [k, v] of rudraClips.entries()) {
          if (k.includes(substr.toLowerCase())) return v;
        }
        return undefined;
      };

      const rWalk = findRudraClip('walking') || findRudraClip('casual_walk') || vrikNativeRun;
      const rRun = vrikNativeRun || findRudraClip('running');
      const rRunFast = findRudraClip('runfast') || findRudraClip('run_03') || rRun;
      const rAttack = findRudraClip('attack') || rRun;
      const rSkill1 = findRudraClip('skill_01') || rAttack;
      const rSkill3 = findRudraClip('skill_03') || rAttack;
      const rArise = findRudraClip('arise') || rWalk;

      const vrikMixer = new THREE.AnimationMixer(vrikodaraGroup);
      const vrikActions: Partial<Record<BossClipKey, THREE.AnimationAction>> = {};

      // Poised breathing idle sampled from Meshy Biped Walking at t=0.18s (exact Rudra method!)
      if (rWalk) {
        const poisedVrikIdle = createPoisedBossIdleClip(
          rWalk,
          vrikodaraGroup,
          0.90,
          0.18,
          'vrikodara_poised_idle'
        );
        const idleAct = vrikMixer.clipAction(poisedVrikIdle);
        idleAct.setLoop(THREE.LoopRepeat, Infinity);
        vrikActions.idle = idleAct;
      }

      // Strictly use Meshy Biped clips on Vrikodara (Hips Y = 0.90m) — zero Mutant cross-rig distortion!
      registerNativeClip(vrikMixer, vrikActions, vrikodaraGroup, 0.90, 0.08, 'run', rRun, true);
      registerNativeClip(vrikMixer, vrikActions, vrikodaraGroup, 0.90, 0.10, 'charge', rRunFast, true);
      registerNativeClip(vrikMixer, vrikActions, vrikodaraGroup, 0.90, 0.08, 'swipe', rAttack, false);
      registerNativeClip(vrikMixer, vrikActions, vrikodaraGroup, 0.90, 0.08, 'cleave', rSkill1, false);
      registerNativeClip(vrikMixer, vrikActions, vrikodaraGroup, 0.90, 0.08, 'combo', rSkill1, false);
      registerNativeClip(vrikMixer, vrikActions, vrikodaraGroup, 0.90, 0.08, 'whirlwind', rSkill1, false);
      registerNativeClip(vrikMixer, vrikActions, vrikodaraGroup, 0.90, 0.12, 'slam', rSkill3, false);
      registerNativeClip(vrikMixer, vrikActions, vrikodaraGroup, 0.90, 0.12, 'jumpAttack', rSkill3, false);
      registerNativeClip(vrikMixer, vrikActions, vrikodaraGroup, 0.78, 0.04, 'stagger', rArise, false);

      this.rigs.vrikodara = {
        root: vrikodaraRoot,
        mixer: vrikMixer,
        actions: vrikActions,
        activeKey: null,
        materials: vrikMaterials,
        weaponMaterials: [vrikWepMat],
        rightWeaponSocket: vrikRightSocket,
        leftWeaponSocket: vrikLeftSocket,
        weaponTipNode: vrikTipNode,
        weaponBaseNode: vrikBaseNode,
        bones: vrikBones,
      };

      // Warm up both rigs for 1 frame so shaders compile during preload
      this.transitionToClip(this.rigs.dundubhi, 'idle', 0.05, 1.0, 0, true);
      this.rigs.dundubhi.mixer.update(0.016);
      this.transitionToClip(this.rigs.vrikodara, 'idle', 0.05, 1.0, 0, true);
      this.rigs.vrikodara.mixer.update(0.016);

      this.loadProgress = 100;
      this.isReady = true;
    } catch (err) {
      console.warn('Boss3DRenderer load warning:', err);
      this.loadProgress = 100;
    }
  }

  private transitionToClip(
    rig: LoadedBossRig,
    key: BossClipKey,
    fadeDuration = 0.08,
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

    // Strictly stop all other non-active actions so multiple clips NEVER blend or twitch simultaneously
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
  }

  private getStrikeStartOffset(kind: Boss3DKind, clipKey: BossClipKey, isAttackPhase: boolean): number {
    // Jump directly to the active strike frames so there is ZERO lag between windup and impact!
    if (kind === 'dundubhi') {
      if (clipKey === 'swipe' || clipKey === 'cleave' || clipKey === 'combo' || clipKey === 'whirlwind') {
        return isAttackPhase ? 0.88 : 0.25;
      }
      if (clipKey === 'slam' || clipKey === 'jumpAttack') {
        return isAttackPhase ? 0.95 : 0.22;
      }
      return 0;
    } else {
      if (clipKey === 'swipe') return isAttackPhase ? 0.52 : 0.16;
      if (clipKey === 'cleave' || clipKey === 'combo' || clipKey === 'whirlwind') {
        return isAttackPhase ? 0.20 : 0.05;
      }
      if (clipKey === 'slam' || clipKey === 'jumpAttack') {
        return isAttackPhase ? 0.26 : 0.06;
      }
      if (clipKey === 'stagger') return 0.45;
      return 0;
    }
  }

  private selectDesiredClip(params: Boss3DUpdateParams): BossClipKey {
    if (params.isPostureBroken || params.aiState === 'ko') {
      return 'stagger';
    }
    const pat = (params.attackPattern ?? 0) % 6;

    if (params.aiState === 'windup' || params.aiState === 'attack') {
      if (params.attackKind === 'corridor') {
        return params.aiState === 'windup' ? 'charge' : 'jumpAttack';
      }
      if (params.attackKind === 'shockwave') {
        return pat === 3 ? 'whirlwind' : 'slam';
      }
      return pat === 2 ? 'combo' : pat % 2 === 0 ? 'swipe' : 'cleave';
    }

    const speed = Math.hypot(params.vx, params.vy);
    if (speed > 14) {
      return speed > 195 ? 'charge' : 'run';
    }

    return 'idle';
  }

  public updateAndRender(params: Boss3DUpdateParams): boolean {
    if (!this.isReady || !this.renderer) return false;
    const rig = this.rigs[params.kind];
    if (!rig) return false;

    if (this.activeKind !== params.kind) {
      if (this.activeKind && this.rigs[this.activeKind]) {
        this.scene.remove(this.rigs[this.activeKind]!.root);
      }
      this.scene.add(rig.root);
      this.activeKind = params.kind;
      this.trailSamples.length = 0;
    }

    const dt = Math.min(0.05, Math.max(0.001, params.dt));
    const speed = Math.hypot(params.vx, params.vy);
    const phaseBoost = 1 + (params.phase - 1) * 0.12;

    // Unseal Vrikodara's second off-hand Bloodforged weapon & grow in Phase 2 & Phase 3 (Section 9)
    if (rig.leftWeaponSocket) {
      rig.leftWeaponSocket.visible = params.phase >= 2;
    }
    const targetScale = params.kind === 'vrikodara' && params.phase >= 2 ? 1.24 : 1.0;
    const currentScale = rig.root.scale.x || 1.0;
    rig.root.scale.setScalar(currentScale + (targetScale - currentScale) * Math.min(1, dt * 6));

    const desiredClip = this.selectDesiredClip(params);
    const stateJustChanged = params.aiState !== this.lastAiState;
    this.lastAiState = params.aiState;

    if (stateJustChanged && params.aiState === 'attack') {
      this.attackSwingDuration = params.attackKind === 'shockwave' ? 0.44 : 0.34;
      this.attackSwingTimer = this.attackSwingDuration;
    }
    if (this.attackSwingTimer > 0) {
      this.attackSwingTimer = Math.max(0, this.attackSwingTimer - dt);
    }

    // Calculate animation playback speed and start offset
    let targetTimeScale = 1.0 * phaseBoost;
    if (params.aiState === 'windup') {
      targetTimeScale = (0.55 + params.windupProgress * 0.45) * phaseBoost;
    } else if (params.aiState === 'attack') {
      targetTimeScale = 1.48 * phaseBoost;
    } else if (desiredClip === 'run' || desiredClip === 'charge') {
      targetTimeScale = Math.min(1.55, Math.max(0.85, speed / 155)) * phaseBoost;
    } else if (desiredClip === 'stagger') {
      targetTimeScale = 0.35;
    }

    const forceAttackSnap = stateJustChanged && (params.aiState === 'attack' || params.aiState === 'windup');
    const startOffset = this.getStrikeStartOffset(
      params.kind,
      desiredClip,
      params.aiState === 'attack'
    );

    this.transitionToClip(
      rig,
      desiredClip,
      params.aiState === 'attack' ? 0.05 : 0.10,
      targetTimeScale,
      startOffset,
      forceAttackSnap
    );

    // Advance base FBX animation mixer
    rig.mixer.update(dt);

    // Layer Hades-Style Upper-Body Procedural Cleave Articulation (matches Rudra's responsiveness!)
    let spinYawOffset = 0;
    const pat = (params.attackPattern ?? 0) % 6;

    if (params.aiState === 'windup') {
      // Coiled windup pullback synchronized with windupProgress (0 -> 1)
      const w = Math.min(1, Math.max(0, params.windupProgress));
      if (params.attackKind === 'shockwave' || pat === 4) {
        // Overhead two-handed raise before seismic slam
        this.applyProceduralBossPose(rig.bones, -0.22 * w, -0.36 * w, -0.55 * w, -0.25 * w, -0.20 * w);
      } else if (pat % 2 === 1) {
        // Backhand coil across chest
        this.applyProceduralBossPose(rig.bones, 0.42 * w, 0.08 * w, 0.52 * w, -0.22 * w, 0.18 * w);
      } else {
        // Forehand coil behind right shoulder
        this.applyProceduralBossPose(rig.bones, -0.45 * w, -0.10 * w, -0.58 * w, -0.24 * w, -0.22 * w);
      }
    } else if (params.aiState === 'attack' || this.attackSwingTimer > 0) {
      const p =
        this.attackSwingDuration > 0
          ? 1 - this.attackSwingTimer / this.attackSwingDuration
          : 0.6;
      const swingCurve = Math.sin(Math.min(1, p * 1.15) * Math.PI);
      const sweepSigned = -1 + 2 * Math.min(1, Math.pow(Math.max(0, p), 0.68));

      if (params.attackKind === 'shockwave' && pat === 3) {
        // 360-Degree Whirlwind Spin
        spinYawOffset = Math.min(1, p * 1.15) * Math.PI * 2;
        this.applyProceduralBossPose(rig.bones, 0.36, 0.18, 0.48, -0.24, 0.28);
      } else if (params.attackKind === 'shockwave' || params.attackKind === 'corridor' || pat === 4) {
        // Overhead Seismic Execution Slam
        const slamPitch =
          p < 0.25 ? -0.36 : -0.36 + 0.95 * Math.min(1, (p - 0.25) / 0.55);
        this.applyProceduralBossPose(
          rig.bones,
          0.16 * sweepSigned,
          slamPitch * 0.48,
          slamPitch * 0.78,
          -0.22,
          slamPitch * 0.35
        );
      } else if (pat % 2 === 1) {
        // Backhand Left-to-Right Wide Reverse Cleave
        this.applyProceduralBossPose(
          rig.bones,
          -sweepSigned * 0.52,
          0.14 * swingCurve,
          -sweepSigned * 0.68,
          -0.20 * swingCurve,
          -0.25 * swingCurve
        );
      } else {
        // Forehand Right-to-Left Wide Horizontal Cleave
        this.applyProceduralBossPose(
          rig.bones,
          sweepSigned * 0.50,
          0.15 * swingCurve,
          sweepSigned * 0.66,
          -0.18 * swingCurve,
          0.25 * swingCurve
        );
      }
    }

    // True 360-Degree Isometric Facing Angle toward Rudra (same formula as Rudra3DRenderer!)
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
    rig.root.rotation.y = this.currentYaw + spinYawOffset;

    // Forward kinetic lean during charges and heavy swings
    const leanTarget =
      params.aiState === 'attack'
        ? 0.15
        : params.aiState === 'windup'
        ? -0.08 * params.windupProgress
        : speed > 110
        ? 0.11
        : 0;
    rig.root.rotation.x = THREE.MathUtils.lerp(
      rig.root.rotation.x,
      leanTarget * Math.cos(this.currentYaw),
      dt * 12
    );
    rig.root.rotation.z = THREE.MathUtils.lerp(
      rig.root.rotation.z,
      -leanTarget * Math.sin(this.currentYaw),
      dt * 12
    );

    // Subtle PBR Emissive & Rim Light Response
    if (params.isParrying) {
      this.rimLight.color.setHex(0xffe082);
      this.rimLight.intensity = 3.5;
    } else if (params.aiState === 'attack' || params.aiState === 'windup') {
      this.rimLight.color.setHex(0xff5238);
      this.rimLight.intensity = 2.9;
    } else {
      this.rimLight.color.setHex(0xf5c878);
      this.rimLight.intensity = 2.2;
    }

    for (const mat of rig.materials) {
      if (params.isHitFlash) {
        mat.emissive.setHex(0xfff0d0);
        mat.emissiveIntensity = 0.72;
      } else if (params.isParrying) {
        mat.emissive.setHex(0xffd86b);
        mat.emissiveIntensity = 0.42;
      } else if (params.phase === 3) {
        mat.emissive.setHex(0x882208);
        mat.emissiveIntensity = 0.22;
      } else if (params.phase === 2) {
        mat.emissive.setHex(0x551806);
        mat.emissiveIntensity = 0.14;
      } else {
        mat.emissive.setHex(0x120804);
        mat.emissiveIntensity = 0.05;
      }
    }

    for (const wMat of rig.weaponMaterials) {
      wMat.emissive.setHex(0x44080a);
      wMat.emissiveIntensity =
        params.aiState === 'attack' ? 0.32 : params.aiState === 'windup' ? 0.18 : 0.07;
    }

    this.scene.updateMatrixWorld(true);

    // Update 3D Boss Weapon Blade Trail Ribbon
    const trailActive =
      params.aiState === 'attack' ||
      this.attackSwingTimer > 0 ||
      (params.aiState === 'windup' && params.windupProgress > 0.72);
    const trailColor =
      params.phase === 3 ? 0xff2a18 : params.attackKind === 'shockwave' ? 0xff7722 : 0xd92638;
    this.updateWeaponTrail(rig, dt, trailActive, trailColor);

    this.renderer.render(this.scene, this.camera);
    return true;
  }

  private applyProceduralBossPose(
    bones: BossUpperBodyBones,
    spineYaw: number,
    spinePitch: number,
    armSweep: number,
    foreArmBend: number,
    wristPitch: number
  ): void {
    const rotQ = this.scratchRotQ;
    const euler = this.scratchEuler;

    if (bones.spine1) {
      euler.set(spinePitch * 0.5, spineYaw * 0.5, 0, 'XYZ');
      rotQ.setFromEuler(euler);
      bones.spine1.quaternion.multiply(rotQ);
    }
    if (bones.spine2) {
      euler.set(spinePitch * 0.5, spineYaw * 0.6, 0, 'XYZ');
      rotQ.setFromEuler(euler);
      bones.spine2.quaternion.multiply(rotQ);
    }
    if (bones.rightArm) {
      euler.set(armSweep * 0.55, armSweep * 0.7, -0.15, 'XYZ');
      rotQ.setFromEuler(euler);
      bones.rightArm.quaternion.multiply(rotQ);
    }
    if (bones.rightForeArm) {
      euler.set(foreArmBend, 0, 0, 'XYZ');
      rotQ.setFromEuler(euler);
      bones.rightForeArm.quaternion.multiply(rotQ);
    }
    if (bones.rightHand) {
      euler.set(wristPitch, 0, 0, 'XYZ');
      rotQ.setFromEuler(euler);
      bones.rightHand.quaternion.multiply(rotQ);
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
      if (this.trailSamples[i].age > 0.14) {
        this.trailSamples.splice(i, 1);
      }
    }

    if (active && rig.rightWeaponSocket) {
      const tipWorld = new THREE.Vector3();
      const baseWorld = new THREE.Vector3();
      rig.weaponTipNode.getWorldPosition(tipWorld);
      rig.weaponBaseNode.getWorldPosition(baseWorld);

      this.trailSamples.unshift({
        tip: tipWorld,
        base: baseWorld,
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
    this.trailMaterial.opacity = active ? 0.66 : 0.22;

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

  public dispose(): void {
    this.disposed = true;
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
