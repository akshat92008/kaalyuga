import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import type { StaffStance } from './rules';

export type RudraAnimState =
  | 'idle'
  | 'run'
  | 'dash'
  | 'combo1'
  | 'combo2'
  | 'combo3'
  | 'combo4'
  | 'heavy'
  | 'parry'
  | 'cast'
  | 'heal'
  | 'hurt'
  | 'defeat';

export interface Rudra3DRenderParams {
  dt: number;
  vx: number;
  vy: number;
  facingX: number;
  facingY: number;
  slashAngle: number;
  isAttacking: boolean;
  isHeavyAttack: boolean;
  comboStep: number;
  attackProgress: number; // 0..1
  isDodging: boolean;
  isParrying: boolean;
  isCasting: boolean;
  isHealing: boolean;
  isHurt: boolean;
  isDefeated: boolean;
  stance: StaffStance;
  focusOrbs: number;
  elevationY: number;
}

interface TrailSample {
  tip: THREE.Vector3;
  base: THREE.Vector3;
  age: number;
}

export class Rudra3DRenderer {
  public canvas: HTMLCanvasElement;
  public isReady = false;
  public loadError: string | null = null;
  public loadProgress = 0;
  private disposed = false;

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private rootGroup: THREE.Group;
  private charObject: THREE.Group | null = null;
  private weaponObject: THREE.Object3D | null = null;
  private weaponTipNode: THREE.Object3D;
  private weaponBaseNode: THREE.Object3D;
  private mixer: THREE.AnimationMixer | null = null;
  private actions: Map<string, THREE.AnimationAction> = new Map();
  private activeActionName = '';
  private currentAnimState: RudraAnimState = 'idle';

  // Cached Mixamo bones for clean Hades-grade upper-body axe cleave articulation
  private spine1Bone: THREE.Object3D | null = null;
  private spine2Bone: THREE.Object3D | null = null;
  private rightArmBone: THREE.Object3D | null = null;
  private rightForeArmBone: THREE.Object3D | null = null;
  private rightHandBone: THREE.Object3D | null = null;

  // Single-strike window so each click plays strictly ONE clean, fluid swing
  private attackHoldTimer = 0;
  private attackHoldDuration = 0.32;
  private activeStrikeKind: 'none' | 'combo1' | 'combo2' | 'combo3' | 'combo4' | 'heavy' = 'none';
  private lastAttackTriggerStep = 0;
  private wasAttackingLastFrame = false;

  // Balanced PBR Lighting (preserves dark iron & blood-crimson textures)
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;
  private axeGlowLight: THREE.PointLight;

  // 3D Weapon Slash Ribbon in Scene
  private trailMesh: THREE.Mesh;
  private trailGeometry: THREE.BufferGeometry;
  private trailMaterial: THREE.MeshBasicMaterial;
  private trailSamples: TrailSample[] = [];
  private readonly maxTrailSamples = 14;

  // Smooth 360-degree isometric yaw
  private currentYaw = 0;
  private targetYaw = 0;
  private elapsedTime = 0;
  private charMaterials: THREE.MeshStandardMaterial[] = [];
  private wepMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(size = 384) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;

    this.scene = new THREE.Scene();

    // Hades ~32° Isometric Orthographic Camera
    const halfExtent = 135;
    this.camera = new THREE.OrthographicCamera(
      -halfExtent,
      halfExtent,
      halfExtent,
      -halfExtent,
      1,
      1000
    );
    this.camera.position.set(0, 205, 260);
    this.camera.lookAt(0, 72, 0);

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.weaponTipNode = new THREE.Object3D();
    this.weaponBaseNode = new THREE.Object3D();

    // Crisp Dark-Mythology Lighting Rig
    const ambient = new THREE.AmbientLight(0xd8d4e2, 1.55);
    this.scene.add(ambient);

    this.keyLight = new THREE.DirectionalLight(0xfff4e0, 2.65);
    this.keyLight.position.set(-130, 260, 190);
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0xe8c48e, 2.1);
    this.rimLight.position.set(130, 210, -210);
    this.scene.add(this.rimLight);

    this.fillLight = new THREE.DirectionalLight(0x7c859e, 1.25);
    this.fillLight.position.set(160, 55, 130);
    this.scene.add(this.fillLight);

    this.axeGlowLight = new THREE.PointLight(0xd43b2a, 0.75, 150);
    this.axeGlowLight.position.set(0, 90, 40);
    this.rootGroup.add(this.axeGlowLight);

    // Real-time 3D Axe Blade Trail Ribbon
    this.trailGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxTrailSamples * 2 * 3);
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const indices: number[] = [];
    for (let i = 0; i < this.maxTrailSamples - 1; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, b, c, b, d, c);
    }
    this.trailGeometry.setIndex(indices);

    this.trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xe62e3d,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.trailMesh = new THREE.Mesh(this.trailGeometry, this.trailMaterial);
    this.trailMesh.frustumCulled = false;
    this.scene.add(this.trailMesh);

    this.initWebGL(size);
  }

  private initWebGL(size: number) {
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setSize(size, size, false);
      this.renderer.setPixelRatio(1);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      this.loadAssets();
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : 'WebGL initialization failed';
    }
  }

  private async loadAssets() {
    const texLoader = new THREE.TextureLoader();
    const fbxLoader = new FBXLoader();

    const loadTex = (url: string, isColor = false, attempt = 0): Promise<THREE.Texture> =>
      new Promise((resolve, reject) => {
        texLoader.load(
          url,
          (tex) => {
            if (isColor) {
              tex.colorSpace = THREE.SRGBColorSpace;
            }
            tex.needsUpdate = true;
            resolve(tex);
          },
          undefined,
          (err) => {
            if (attempt < 3) {
              setTimeout(() => {
                loadTex(url, isColor, attempt + 1).then(resolve).catch(reject);
              }, 700 * (attempt + 1));
            } else {
              reject(err);
            }
          }
        );
      });

    const loadFbx = (url: string, attempt = 0): Promise<THREE.Group> =>
      new Promise((resolve, reject) => {
        fbxLoader.load(
          url,
          (obj) => resolve(obj),
          (ev) => {
            if (ev.total > 0) {
              this.loadProgress = Math.min(0.95, ev.loaded / ev.total);
            }
          },
          (err) => {
            if (attempt < 3) {
              setTimeout(() => {
                loadFbx(url, attempt + 1).then(resolve).catch(reject);
              }, 800 * (attempt + 1));
            } else {
              reject(err);
            }
          }
        );
      });

    try {
      const charBase = '/models/Meshy_AI_Ashen_Warborn_biped';
      const wepBase = '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx';

      const [
        charObj,
        wepObj,
        charAlbedo,
        charNormal,
        charRough,
        charMetal,
        wepAlbedo,
        wepNormal,
        wepRough,
        wepMetal,
      ] = await Promise.all([
        loadFbx(`${charBase}/Meshy_AI_Ashen_Warborn_biped_Meshy_Merged_Animations.fbx`),
        loadFbx(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.fbx`),
        loadTex(`${charBase}/Meshy_AI_Ashen_Warborn_biped_texture_0.png`, true),
        loadTex(`${charBase}/Meshy_AI_Ashen_Warborn_biped_texture_0_normal.png`, false),
        loadTex(`${charBase}/Meshy_AI_Ashen_Warborn_biped_texture_0_roughness.png`, false),
        loadTex(`${charBase}/Meshy_AI_Ashen_Warborn_biped_texture_0_metallic.png`, false),
        loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png`, true),
        loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_normal.png`, false),
        loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_roughness.png`, false),
        loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_metallic.png`, false),
      ]);

      if (this.disposed) return;

      // 1. Configure Character PBR Material
      const charMat = new THREE.MeshStandardMaterial({
        map: charAlbedo,
        normalMap: charNormal,
        normalScale: new THREE.Vector2(1.15, 1.15),
        roughnessMap: charRough,
        metalnessMap: charMetal,
        roughness: 0.68,
        metalness: 0.42,
        emissive: new THREE.Color(0x0c0608),
        emissiveIntensity: 0.08,
      });
      this.charMaterials.push(charMat);

      charObj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.material = charMat;
          mesh.frustumCulled = false;
        }
      });

      this.charObject = charObj;
      this.rootGroup.add(charObj);

      // Cache Mixamo upper-body bones
      this.spine1Bone = charObj.getObjectByName('mixamorigSpine1') || null;
      this.spine2Bone = charObj.getObjectByName('mixamorigSpine2') || null;
      this.rightArmBone = charObj.getObjectByName('mixamorigRightArm') || null;
      this.rightForeArmBone = charObj.getObjectByName('mixamorigRightForeArm') || null;
      this.rightHandBone =
        charObj.getObjectByName('mixamorigRightHand') ||
        charObj.getObjectByName('RightHand') ||
        null;

      // 2. Configure 3D Bloodforged Parashu Great-Axe & Attach to Right Hand Fist
      const wepMat = new THREE.MeshStandardMaterial({
        map: wepAlbedo,
        normalMap: wepNormal,
        normalScale: new THREE.Vector2(1.3, 1.3),
        roughnessMap: wepRough,
        metalnessMap: wepMetal,
        roughness: 0.45,
        metalness: 0.78,
        emissive: new THREE.Color(0x280408),
        emissiveIntensity: 0.08,
      });
      this.wepMaterials.push(wepMat);

      let weaponMesh: THREE.Mesh | null = null;
      wepObj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && !weaponMesh) {
          weaponMesh = child as THREE.Mesh;
        }
      });

      if (weaponMesh && this.rightHandBone) {
        const mesh = weaponMesh as THREE.Mesh;
        mesh.material = wepMat;
        mesh.frustumCulled = false;

        // Verified FBX Geometry of Mesh_0:
        // - Shaft axis is local Z: pommel at z = -0.95, wide Parashu Axe Head at z = +0.50..+0.95.
        // - Wide blade edge spans local X (x = -0.40..+0.40); flat blade thickness is local Y.
        // Verified Mixamo mixamorigRightHand axes:
        // - Wrist is at (0,0,0), knuckles at (0, +0.082, 0).
        // - In locomotion & combat poses, local +X (tilted slightly toward +Y) points UP and FORWARD out of the top/thumb side of the closed fist!
        // - Rotating weaponHolder by (0, +Math.PI/2, +0.28) aligns the +Z shaft of Mesh_0 with the +X/+Y top-of-fist vector so the Axe Head is held high and forward in front of Rudra, while the pommel extends below his pinky!
        // - Rotating mesh by (0, 0, -Math.PI/2) around its Z shaft aligns the wide X blade edge into the forward-downward chopping plane!
        const weaponHolder = new THREE.Group();
        weaponHolder.name = 'ParashuWeaponHolder';

        const axeScale = 0.48;
        mesh.scale.set(axeScale, axeScale, axeScale);
        mesh.rotation.set(0, 0, -Math.PI / 2);
        // Shift +0.18 along holder's shaft axis (+Z before holder rotation) so Rudra grips the lower-middle shaft
        mesh.position.set(0, 0, 0.18);

        this.weaponTipNode.position.set(0, 0, 0.92);
        this.weaponBaseNode.position.set(0, 0, 0.34);
        mesh.add(this.weaponTipNode);
        mesh.add(this.weaponBaseNode);

        weaponHolder.add(mesh);
        weaponHolder.position.set(0.0, 0.076, 0.01);
        weaponHolder.rotation.set(0.0, Math.PI / 2, 0.28);

        this.rightHandBone.add(weaponHolder);
        this.weaponObject = weaponHolder;
      }

      // 3. Process Embedded Animations & Strip Horizontal Root Drift
      this.mixer = new THREE.AnimationMixer(charObj);
      const rawClips = charObj.animations || [];

      const oneShotClipNames = new Set([
        'Attack',
        'Triple_Combo_Attack',
        'Skill_01',
        'Skill_03',
        'Arise',
      ]);

      for (const rawClip of rawClips) {
        const clip = this.makeInPlaceClip(rawClip);
        const action = this.mixer.clipAction(clip);
        if (oneShotClipNames.has(clip.name)) {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        }
        this.actions.set(clip.name, action);
      }

      // Create poised, breathing Hades Combat Idle clip
      const idleClip = this.createCombatIdleClip(rawClips);
      if (idleClip) {
        const idleAction = this.mixer.clipAction(idleClip);
        idleAction.setLoop(THREE.LoopRepeat, Infinity);
        this.actions.set('Combat_Idle', idleAction);
      }

      this.transitionToAction(
        this.actions.has('Combat_Idle') ? 'Combat_Idle' : 'Casual_Walk',
        0.05,
        1.0
      );
      this.mixer.update(0.016);

      this.loadProgress = 1;
      this.isReady = true;
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : 'Failed to load 3D assets';
      this.loadProgress = 1;
    }
  }

  private makeInPlaceClip(sourceClip: THREE.AnimationClip): THREE.AnimationClip {
    const clip = sourceClip.clone();
    const isArise = clip.name === 'Arise';

    for (const track of clip.tracks) {
      if (
        track.name.endsWith('mixamorigHips.position') ||
        track.name.endsWith('Hips.position') ||
        track.name.endsWith('target_character.position')
      ) {
        const values = track.values;
        const baseX = values[0] || 0;
        const baseY = values[1] || 0.92;
        const baseZ = values[2] || 0;

        for (let i = 0; i < values.length; i += 3) {
          values[i] = (values[i] - baseX) * 0.05;
          values[i + 2] = (values[i + 2] - baseZ) * 0.05;
          if (isArise) {
            values[i + 1] = Math.max(0.35, values[i + 1] + 0.55);
          } else {
            values[i + 1] = Math.max(0.58, baseY + (values[i + 1] - baseY) * 0.6);
          }
        }
      }
    }
    return clip;
  }

  private createCombatIdleClip(clips: THREE.AnimationClip[]): THREE.AnimationClip | null {
    const baseClip =
      clips.find((c) => c.name === 'Walking') ||
      clips.find((c) => c.name === 'Casual_Walk') ||
      clips[0];
    if (!baseClip) return null;

    const duration = 2.0;
    const times = [0, 0.5, 1.0, 1.5, 2.0];
    const newTracks: THREE.KeyframeTrack[] = [];

    for (const track of baseClip.tracks) {
      const itemSize = track.getValueSize();
      const interpolant = (
        track as THREE.KeyframeTrack & {
          createInterpolant: () => { evaluate: (t: number) => Float32Array | number[] };
        }
      ).createInterpolant();
      const baseVal = Array.from(interpolant.evaluate(0.18));

      const isSpine =
        track.name.includes('Spine') && track.name.endsWith('.quaternion');
      const isRightArm =
        track.name.includes('RightArm') && track.name.endsWith('.quaternion');
      const isHipsPos =
        track.name.includes('Hips') && track.name.endsWith('.position');

      const outValues: number[] = [];
      for (let step = 0; step < times.length; step++) {
        const phase = Math.sin((step / (times.length - 1)) * Math.PI * 2);
        if (isHipsPos && itemSize === 3) {
          outValues.push(0, 0.92 + phase * 0.014, 0);
        } else if ((isSpine || isRightArm) && itemSize === 4) {
          const q = new THREE.Quaternion(baseVal[0], baseVal[1], baseVal[2], baseVal[3]);
          const breathQ = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
              isSpine ? phase * 0.02 : phase * 0.03,
              0,
              isRightArm ? phase * 0.02 : 0
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

    return new THREE.AnimationClip('Combat_Idle', duration, newTracks);
  }

  private transitionToAction(
    clipName: string,
    fadeDuration = 0.08,
    timeScale = 1.0,
    startTimeOffset = 0,
    forceRestart = false
  ) {
    if (!this.mixer) return;
    const nextAction =
      this.actions.get(clipName) ||
      this.actions.get('Combat_Idle') ||
      Array.from(this.actions.values())[0];
    if (!nextAction) return;

    if (this.activeActionName === clipName && !forceRestart) {
      nextAction.setEffectiveTimeScale(timeScale);
      return;
    }

    const prevAction = this.actions.get(this.activeActionName);

    // Strictly stop all other non-active actions so 2-3 animations NEVER blend or spam simultaneously!
    for (const [name, act] of this.actions.entries()) {
      if (act !== nextAction && act !== prevAction) {
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

    this.activeActionName = clipName;
  }

  public updateAndRender(params: Rudra3DRenderParams): boolean {
    if (!this.isReady || !this.renderer || !this.mixer || !this.charObject) {
      return false;
    }

    const dt = Math.min(0.05, Math.max(0.001, params.dt));
    this.elapsedTime += dt;

    // Detect fresh attack trigger or combo step progression — strictly ONE clean swing per trigger
    const isNowAttacking = params.isAttacking || params.isHeavyAttack;
    if (
      isNowAttacking &&
      (!this.wasAttackingLastFrame || params.comboStep !== this.lastAttackTriggerStep)
    ) {
      this.lastAttackTriggerStep = params.comboStep;
      if (params.isHeavyAttack) {
        this.activeStrikeKind = 'heavy';
        this.currentAnimState = 'heavy';
        this.attackHoldDuration = 0.42;
        this.attackHoldTimer = 0.42;
        this.transitionToAction('Skill_03', 0.05, 1.35, 0.22, true);
      } else {
        const step = ((params.comboStep - 1) % 4) + 1;
        this.attackHoldDuration = step === 4 ? 0.36 : 0.27;
        this.attackHoldTimer = this.attackHoldDuration;
        if (step === 1) {
          this.activeStrikeKind = 'combo1';
          this.currentAnimState = 'combo1';
          this.transitionToAction('Attack', 0.05, 1.45, 0.48, true);
        } else if (step === 2) {
          this.activeStrikeKind = 'combo2';
          this.currentAnimState = 'combo2';
          this.transitionToAction('Skill_01', 0.05, 1.45, 0.14, true);
        } else if (step === 3) {
          this.activeStrikeKind = 'combo3';
          this.currentAnimState = 'combo3';
          this.transitionToAction('Skill_01', 0.05, 1.55, 0.18, true);
        } else {
          this.activeStrikeKind = 'combo4';
          this.currentAnimState = 'combo4';
          this.transitionToAction('Skill_03', 0.05, 1.45, 0.24, true);
        }
      }
    }
    this.wasAttackingLastFrame = isNowAttacking;

    if (this.attackHoldTimer > 0) {
      this.attackHoldTimer = Math.max(0, this.attackHoldTimer - dt);
      if (params.isDodging) {
        // Dash-cancel immediately interrupts attack follow-through (Hades responsiveness!)
        this.attackHoldTimer = 0;
        this.activeStrikeKind = 'none';
      }
    } else {
      this.activeStrikeKind = 'none';
    }

    // 1. Determine Desired Locomotion / Action State when not in active strike hold
    const speed = Math.hypot(params.vx, params.vy);
    const runThreshold = this.currentAnimState === 'run' ? 14 : 26;
    let nextState: RudraAnimState = 'idle';

    if (params.isDefeated) {
      nextState = 'defeat';
    } else if (params.isDodging) {
      nextState = 'dash';
    } else if (this.attackHoldTimer > 0) {
      nextState = this.activeStrikeKind === 'none' ? 'combo1' : this.activeStrikeKind;
    } else if (params.isParrying) {
      nextState = 'parry';
    } else if (params.isCasting) {
      nextState = 'cast';
    } else if (params.isHealing) {
      nextState = 'heal';
    } else if (params.isHurt) {
      nextState = 'hurt';
    } else if (speed > runThreshold) {
      nextState = 'run';
    } else {
      nextState = 'idle';
    }

    if (nextState !== this.currentAnimState && this.attackHoldTimer <= 0) {
      this.currentAnimState = nextState;
      switch (nextState) {
        case 'idle':
          this.transitionToAction(
            this.actions.has('Combat_Idle') ? 'Combat_Idle' : 'Walking',
            0.1,
            1.0
          );
          break;
        case 'run':
          this.transitionToAction(
            'Running',
            0.08,
            Math.min(1.45, Math.max(0.82, speed / 250))
          );
          break;
        case 'dash':
          this.transitionToAction('RunFast', 0.04, 1.65);
          break;
        case 'parry':
          this.transitionToAction('Skill_01', 0.06, 0.75, 0.15, true);
          break;
        case 'cast':
          this.transitionToAction('Skill_03', 0.06, 1.35, 0.22, true);
          break;
        case 'heal':
          this.transitionToAction('Arise', 0.08, 1.15, 0.65, true);
          break;
        case 'hurt':
          this.transitionToAction('Arise', 0.06, 1.2, 0.45, true);
          break;
        case 'defeat':
          this.transitionToAction('Arise', 0.15, 0.05, 0.15, true);
          break;
      }
    } else if (nextState === 'run' && this.attackHoldTimer <= 0) {
      const runAct = this.actions.get(this.activeActionName);
      if (runAct) {
        runAct.setEffectiveTimeScale(Math.min(1.45, Math.max(0.82, speed / 250)));
      }
    }

    // 2. Calculate True 360-Degree Isometric Facing Angle
    let aimDx = params.facingX;
    let aimDy = params.facingY;

    if (this.attackHoldTimer > 0 || params.isAttacking || params.isHeavyAttack || params.isCasting) {
      aimDx = Math.cos(params.slashAngle);
      aimDy = Math.sin(params.slashAngle);
    } else if (speed > 18) {
      aimDx = params.vx;
      aimDy = params.vy;
    }

    if (Math.hypot(aimDx, aimDy) > 0.001) {
      this.targetYaw = Math.atan2(aimDx, aimDy);
    }

    let angleDiff = this.targetYaw - this.currentYaw;
    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
    const turnSpeed = this.attackHoldTimer > 0 || params.isDodging ? 36 : 18;
    this.currentYaw += angleDiff * Math.min(1, turnSpeed * dt);

    // Advance base FBX animation mixer
    this.mixer.update(dt);

    // 3. Layer Harmonious Hades-Style Upper-Body Cleave Articulation
    let spinYawOffset = 0;
    if (this.attackHoldTimer > 0 && this.activeStrikeKind !== 'none') {
      const p = 1 - this.attackHoldTimer / Math.max(0.01, this.attackHoldDuration);
      const swingCurve = Math.sin(Math.min(1, p * 1.15) * Math.PI);
      const sweepSigned = -1 + 2 * Math.min(1, Math.pow(p, 0.72));

      if (this.activeStrikeKind === 'combo1') {
        // Forehand Right-to-Left Wide Horizontal Parashu Cleave
        this.applyProceduralSwingPose(
          sweepSigned * 0.48,
          0.14 * swingCurve,
          sweepSigned * 0.65,
          -0.18 * swingCurve,
          0.25 * swingCurve
        );
      } else if (this.activeStrikeKind === 'combo2') {
        // Backhand Left-to-Right Reverse Cleave
        this.applyProceduralSwingPose(
          -sweepSigned * 0.52,
          0.12 * swingCurve,
          -sweepSigned * 0.68,
          -0.2 * swingCurve,
          -0.25 * swingCurve
        );
      } else if (this.activeStrikeKind === 'combo3') {
        // 360-Degree Whirlwind Spin
        spinYawOffset = Math.min(1, p * 1.12) * Math.PI * 2;
        this.applyProceduralSwingPose(0.32, 0.18, 0.42, -0.25, 0.3);
      } else if (this.activeStrikeKind === 'combo4' || this.activeStrikeKind === 'heavy') {
        // Overhead Guillotine Execution Slam
        const slamPitch =
          p < 0.32 ? -0.38 * (p / 0.32) : -0.38 + 0.92 * Math.min(1, (p - 0.32) / 0.48);
        this.applyProceduralSwingPose(
          0.18 * sweepSigned,
          slamPitch * 0.45,
          slamPitch * 0.75,
          -0.22,
          slamPitch * 0.35
        );
      }
    }

    this.rootGroup.rotation.y = this.currentYaw + spinYawOffset;

    // Kinetic sprint/dash lean
    const leanTarget =
      params.isDodging
        ? 0.24
        : this.attackHoldTimer > 0
        ? 0.14
        : speed > 120
        ? 0.11
        : 0;
    this.rootGroup.rotation.x = THREE.MathUtils.lerp(
      this.rootGroup.rotation.x,
      leanTarget * Math.cos(this.currentYaw),
      dt * 14
    );
    this.rootGroup.rotation.z = THREE.MathUtils.lerp(
      this.rootGroup.rotation.z,
      -leanTarget * Math.sin(this.currentYaw),
      dt * 14
    );

    this.rootGroup.position.y = Math.min(45, params.elevationY * 0.85);

    // 4. Authentic PBR Rim & Material Response
    if (params.isParrying) {
      this.rimLight.color.setHex(0xffe082);
      this.rimLight.intensity = 3.6;
    } else if (params.isDodging) {
      this.rimLight.color.setHex(0x63f2ff);
      this.rimLight.intensity = 3.4;
    } else if (this.attackHoldTimer > 0) {
      this.rimLight.color.setHex(0xff5252);
      this.rimLight.intensity = 2.8;
    } else {
      this.rimLight.color.setHex(0xe8c48e);
      this.rimLight.intensity = 2.0;
    }

    for (const mat of this.charMaterials) {
      if (params.isHurt) {
        mat.emissive.setHex(0xcc1b26);
        mat.emissiveIntensity = 0.55;
      } else if (params.isParrying) {
        mat.emissive.setHex(0x8a6822);
        mat.emissiveIntensity = 0.32;
      } else if (params.isDodging) {
        mat.emissive.setHex(0x124e58);
        mat.emissiveIntensity = 0.35;
      } else {
        mat.emissive.setHex(0x0c0608);
        mat.emissiveIntensity = 0.08;
      }
    }

    for (const mat of this.wepMaterials) {
      mat.emissive.setHex(0x3a060a);
      mat.emissiveIntensity = this.attackHoldTimer > 0 ? 0.22 : 0.07;
    }

    this.scene.updateMatrixWorld(true);

    // 5. Update 3D Parashu Axe Blade Trail Ribbon
    const trailActive = this.attackHoldTimer > 0 || params.isDodging;
    const trailColor = params.isDodging
      ? 0x5ce6ff
      : this.activeStrikeKind === 'heavy' || this.activeStrikeKind === 'combo4'
      ? 0xff3848
      : 0xd92638;
    this.updateWeaponTrail(dt, trailActive, trailColor);

    // 6. Render Isometric 3D Character + Axe to Offscreen Canvas
    this.renderer.render(this.scene, this.camera);
    return true;
  }

  private readonly scratchRotQ = new THREE.Quaternion();
  private readonly scratchEuler = new THREE.Euler();

  private applyProceduralSwingPose(
    spineYaw: number,
    spinePitch: number,
    armSweep: number,
    foreArmBend: number,
    wristPitch: number
  ) {
    const rotQ = this.scratchRotQ;
    const euler = this.scratchEuler;

    if (this.spine1Bone) {
      euler.set(spinePitch * 0.5, spineYaw * 0.5, 0, 'XYZ');
      rotQ.setFromEuler(euler);
      this.spine1Bone.quaternion.multiply(rotQ);
    }
    if (this.spine2Bone) {
      euler.set(spinePitch * 0.5, spineYaw * 0.6, 0, 'XYZ');
      rotQ.setFromEuler(euler);
      this.spine2Bone.quaternion.multiply(rotQ);
    }
    if (this.rightArmBone) {
      euler.set(armSweep * 0.55, armSweep * 0.7, -0.15, 'XYZ');
      rotQ.setFromEuler(euler);
      this.rightArmBone.quaternion.multiply(rotQ);
    }
    if (this.rightForeArmBone) {
      euler.set(foreArmBend, 0, 0, 'XYZ');
      rotQ.setFromEuler(euler);
      this.rightForeArmBone.quaternion.multiply(rotQ);
    }
    if (this.rightHandBone) {
      euler.set(wristPitch, 0, 0, 'XYZ');
      rotQ.setFromEuler(euler);
      this.rightHandBone.quaternion.multiply(rotQ);
    }
  }

  private updateWeaponTrail(dt: number, active: boolean, colorHex: number) {
    for (let i = this.trailSamples.length - 1; i >= 0; i--) {
      this.trailSamples[i].age += dt;
      if (this.trailSamples[i].age > 0.12) {
        this.trailSamples.splice(i, 1);
      }
    }

    if (active && this.weaponObject) {
      const tipWorld = new THREE.Vector3();
      const baseWorld = new THREE.Vector3();
      this.weaponTipNode.getWorldPosition(tipWorld);
      this.weaponBaseNode.getWorldPosition(baseWorld);

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
    this.trailMaterial.opacity = active ? 0.68 : 0.24;

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

  public dispose() {
    this.disposed = true;
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
    for (const m of this.charMaterials) m.dispose();
    for (const m of this.wepMaterials) m.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
