'use client';

// ============================================================================
// MERU ENGINE v2.0 — REAL-TIME 60FPS 3D ENEMY SQUADRON RENDERER (THREE.JS + IBL)
// - Eliminates stiff 4-frame 2D enemy sprite sheets by rendering 100% of Act I
//   enemies (`wolf_guai`, `fire_monk`, `stone_golem`, `furnace_titan`) as real
//   Three.js 3D WebGL rigs with UE5 RoomEnvironment IBL metallic reflections!
// - Uses a SINGLE shared WebGLRenderer (zero WebGL context exhaustion) across
//   4 distinct 3D archetype rigs with composite multi-part 3D weapons & shields:
//   1) Ash-Stalker (`wolf_guai`): Twin Obsidian Katar Claws + crouched predator rig
//   2) Dhanur-Preta (`fire_monk`): Blazing Agni Greatbow + drawn fire-arrow
//   3) Vetala Gada-Guard (`stone_golem`): Chola War-Drum Shield (spiral-stamped) + Iron Gada
//   4) Furnace Colossus (`furnace_titan`): Molten Siege Greathammer + magma furnace core
// ============================================================================

import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { IS_SOFTWARE_WEBGL } from '../../engine/ue5GraphicsEngine';
import type { EnemyTrait } from './assets';

export type RegularEnemy3DKind = 'wolf_guai' | 'fire_monk' | 'stone_golem' | 'furnace_titan';

export interface Enemy3DRenderParams {
  id: number;
  kind: RegularEnemy3DKind;
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

interface Archetype3DRig {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  idleAction: THREE.AnimationAction | null;
  runAction: THREE.AnimationAction | null;
  attackAction: THREE.AnimationAction | null;
  spine1: THREE.Object3D | null;
  spine2: THREE.Object3D | null;
  rightArm: THREE.Object3D | null;
  rightForeArm: THREE.Object3D | null;
  leftArm: THREE.Object3D | null;
  leftForeArm: THREE.Object3D | null;
  materials: THREE.MeshStandardMaterial[];
}

export class Enemy3DRenderer {
  public readonly canvas: HTMLCanvasElement;
  public isReady = false;

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;
  private traitPointLight: THREE.PointLight;

  private rigs: Partial<Record<RegularEnemy3DKind, Archetype3DRig>> = {};
  private perEnemyYaw: Map<number, number> = new Map();
  private disposed = false;

  constructor(size = 288) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;

    this.scene = new THREE.Scene();

    const halfExtent = 132;
    this.camera = new THREE.OrthographicCamera(
      -halfExtent,
      halfExtent,
      halfExtent,
      -halfExtent,
      1,
      1000
    );
    this.camera.position.set(0, 195, 260);
    this.camera.lookAt(0, 74, 0);

    const ambient = new THREE.AmbientLight(0xdcd8e8, 1.65);
    this.scene.add(ambient);

    this.keyLight = new THREE.DirectionalLight(0xfff2dc, 2.75);
    this.keyLight.position.set(-130, 260, 195);
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0xf2c46d, 2.25);
    this.rimLight.position.set(140, 210, -195);
    this.scene.add(this.rimLight);

    this.fillLight = new THREE.DirectionalLight(0x7c8cb2, 1.3);
    this.fillLight.position.set(150, 65, 130);
    this.scene.add(this.fillLight);

    this.traitPointLight = new THREE.PointLight(0xff6a2b, 1.2, 220);
    this.traitPointLight.position.set(0, 85, 55);
    this.scene.add(this.traitPointLight);

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
      this.renderer.toneMappingExposure = 1.12;

      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();

      this.loadArchetypes();
    } catch {
      this.renderer = null;
    }
  }

  /**
   * Builds composite multi-part 3D weapons & shields for each Act I enemy archetype
   * following the v7 Game Design Document (Section 9).
   */
  private attachArchetype3DWeapons(
    kind: RegularEnemy3DKind,
    rightHand: THREE.Object3D | null,
    leftForeArm: THREE.Object3D | null
  ): THREE.MeshStandardMaterial[] {
    const mats: THREE.MeshStandardMaterial[] = [];

    const darkIronMat = new THREE.MeshStandardMaterial({
      color: 0x3b3d46,
      roughness: 0.36,
      metalness: 0.88,
      envMapIntensity: 1.55,
    });
    const cholaBronzeMat = new THREE.MeshStandardMaterial({
      color: 0xd49b42,
      roughness: 0.3,
      metalness: 0.92,
      envMapIntensity: 1.65,
      emissive: new THREE.Color(0x281404),
      emissiveIntensity: 0.14,
    });
    const agniEmberMat = new THREE.MeshStandardMaterial({
      color: 0xff5a1f,
      roughness: 0.22,
      metalness: 0.2,
      emissive: new THREE.Color(0xff4214),
      emissiveIntensity: 1.75,
    });
    mats.push(darkIronMat, cholaBronzeMat, agniEmberMat);

    if (kind === 'wolf_guai') {
      // Ash-Stalker: Twin Curved Obsidian Katar Claws on right hand
      if (rightHand) {
        const holder = new THREE.Group();
        const guardGeo = new THREE.BoxGeometry(0.14, 0.06, 0.12);
        const guard = new THREE.Mesh(guardGeo, cholaBronzeMat);
        holder.add(guard);

        const bladeGeo = new THREE.ConeGeometry(0.038, 0.56, 6);
        bladeGeo.rotateX(Math.PI / 2);
        for (const offset of [-0.045, 0.045]) {
          const blade = new THREE.Mesh(bladeGeo, darkIronMat);
          blade.position.set(offset, 0, 0.28);
          holder.add(blade);
        }
        holder.position.set(0, 0.06, 0.02);
        holder.rotation.set(0, Math.PI / 2, 0.25);
        rightHand.add(holder);
      }
    } else if (kind === 'fire_monk') {
      // Dhanur-Preta Bowman: Blazing Agni Greatbow on left arm + drawn ember arrow
      if (leftForeArm) {
        const bowGroup = new THREE.Group();
        const arcGeo = new THREE.TorusGeometry(0.46, 0.028, 8, 20, Math.PI * 1.15);
        const bowArc = new THREE.Mesh(arcGeo, cholaBronzeMat);
        bowArc.rotation.z = -Math.PI * 0.57;
        bowGroup.add(bowArc);

        const arrowShaftGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.72, 6);
        arrowShaftGeo.rotateZ(Math.PI / 2);
        const arrowShaft = new THREE.Mesh(arrowShaftGeo, darkIronMat);
        arrowShaft.position.set(0.18, 0, 0);
        bowGroup.add(arrowShaft);

        const arrowHeadGeo = new THREE.ConeGeometry(0.042, 0.16, 6);
        arrowHeadGeo.rotateZ(-Math.PI / 2);
        const arrowHead = new THREE.Mesh(arrowHeadGeo, agniEmberMat);
        arrowHead.position.set(0.56, 0, 0);
        bowGroup.add(arrowHead);

        bowGroup.position.set(0, 0.12, 0.08);
        leftForeArm.add(bowGroup);
      }
    } else if (kind === 'stone_golem') {
      // Vetala Gada-Guard (v7 Section 9): War-Drum Stamped Bronze Shield on Left Forearm + Heavy Iron Mace on Right Hand
      if (leftForeArm) {
        const shieldGroup = new THREE.Group();
        const discGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.045, 18);
        discGeo.rotateX(Math.PI / 2);
        const disc = new THREE.Mesh(discGeo, darkIronMat);
        shieldGroup.add(disc);

        // Raised Chola-Bronze War-Drum Rim & Spiral Boss Stamp
        const rimGeo = new THREE.TorusGeometry(0.32, 0.032, 10, 22);
        const rim = new THREE.Mesh(rimGeo, cholaBronzeMat);
        rim.position.set(0, 0, 0.025);
        shieldGroup.add(rim);

        const spiralRingGeo = new THREE.TorusGeometry(0.15, 0.022, 8, 18);
        const spiralRing = new THREE.Mesh(spiralRingGeo, cholaBronzeMat);
        spiralRing.position.set(0, 0, 0.032);
        shieldGroup.add(spiralRing);

        shieldGroup.position.set(0, 0.14, 0.14);
        leftForeArm.add(shieldGroup);
      }
      if (rightHand) {
        const maceGroup = new THREE.Group();
        const shaftGeo = new THREE.CylinderGeometry(0.026, 0.032, 0.78, 8);
        shaftGeo.rotateX(Math.PI / 2);
        const shaft = new THREE.Mesh(shaftGeo, darkIronMat);
        shaft.position.set(0, 0, 0.22);
        maceGroup.add(shaft);

        const headGeo = new THREE.DodecahedronGeometry(0.14, 0);
        const head = new THREE.Mesh(headGeo, cholaBronzeMat);
        head.position.set(0, 0, 0.56);
        maceGroup.add(head);

        maceGroup.position.set(0, 0.07, 0.01);
        maceGroup.rotation.set(0, Math.PI / 2, 0.28);
        rightHand.add(maceGroup);
      }
    } else if (kind === 'furnace_titan') {
      // Furnace Colossus: Two-Handed Molten Siege Greathammer
      if (rightHand) {
        const hammerGroup = new THREE.Group();
        const shaftGeo = new THREE.CylinderGeometry(0.032, 0.038, 0.96, 10);
        shaftGeo.rotateX(Math.PI / 2);
        const shaft = new THREE.Mesh(shaftGeo, darkIronMat);
        shaft.position.set(0, 0, 0.28);
        hammerGroup.add(shaft);

        const blockGeo = new THREE.BoxGeometry(0.28, 0.42, 0.24);
        const block = new THREE.Mesh(blockGeo, darkIronMat);
        block.position.set(0, 0, 0.68);
        hammerGroup.add(block);

        const coreGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.46, 10);
        const core = new THREE.Mesh(coreGeo, agniEmberMat);
        core.position.set(0, 0, 0.68);
        hammerGroup.add(core);

        hammerGroup.position.set(0, 0.075, 0.01);
        hammerGroup.rotation.set(0, Math.PI / 2, 0.28);
        rightHand.add(hammerGroup);
      }
    }

    return mats;
  }

  private makeInPlaceClip(sourceClip: THREE.AnimationClip): THREE.AnimationClip {
    const clip = sourceClip.clone();
    for (const track of clip.tracks) {
      if (track.name.endsWith('.scale')) continue;
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
          values[i] = (values[i] - baseX) * 0.04;
          values[i + 2] = (values[i + 2] - baseZ) * 0.04;
          values[i + 1] = Math.max(0.56, baseY + (values[i + 1] - baseY) * 0.5);
        }
      }
    }
    return clip;
  }

  private async loadArchetypes(): Promise<void> {
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
      const bipedUrl =
        '/models/Meshy_AI_Ashen_Warborn_biped/Meshy_AI_Ashen_Warborn_biped_Meshy_Merged_Animations.fbx';
      const warlordBase = '/models/Meshy_AI_Bloodbound_Warlord_1025041901_texture_fbx';
      const titanBase = '/models/Meshy_AI_Bloodbound_Titan_1025042731_texture_fbx';
      const warbornBase = '/models/Meshy_AI_Ashen_Warborn_biped';

      const [
        baseBipedFbx,
        warbornAlbedo,
        warbornNorm,
        warbornRough,
        warbornMet,
        warlordAlbedo,
        warlordNorm,
        warlordRough,
        warlordMet,
        titanAlbedo,
        titanNorm,
        titanRough,
        titanMet,
      ] = await Promise.all([
        loadFbx(bipedUrl),
        loadTex(`${warbornBase}/Meshy_AI_Ashen_Warborn_biped_texture_0.png`, true),
        loadTex(`${warbornBase}/Meshy_AI_Ashen_Warborn_biped_texture_0_normal.png`, false),
        loadTex(`${warbornBase}/Meshy_AI_Ashen_Warborn_biped_texture_0_roughness.png`, false),
        loadTex(`${warbornBase}/Meshy_AI_Ashen_Warborn_biped_texture_0_metallic.png`, false),
        loadTex(`${warlordBase}/Meshy_AI_Bloodbound_Warlord_1025041901_texture.png`, true),
        loadTex(`${warlordBase}/Meshy_AI_Bloodbound_Warlord_1025041901_texture_normal.png`, false),
        loadTex(`${warlordBase}/Meshy_AI_Bloodbound_Warlord_1025041901_texture_roughness.png`, false),
        loadTex(`${warlordBase}/Meshy_AI_Bloodbound_Warlord_1025041901_texture_metallic.png`, false),
        loadTex(`${titanBase}/Meshy_AI_Bloodbound_Titan_1025042731_texture.png`, true),
        loadTex(`${titanBase}/Meshy_AI_Bloodbound_Titan_1025042731_texture_normal.png`, false),
        loadTex(`${titanBase}/Meshy_AI_Bloodbound_Titan_1025042731_texture_roughness.png`, false),
        loadTex(`${titanBase}/Meshy_AI_Bloodbound_Titan_1025042731_texture_metallic.png`, false),
      ]);

      if (this.disposed) return;

      const rawClips = baseBipedFbx.animations || [];
      const inPlaceClips = rawClips.map((c) => this.makeInPlaceClip(c));
      const findClip = (name: string) =>
        inPlaceClips.find((c) => c.name.toLowerCase().includes(name.toLowerCase())) ||
        inPlaceClips[0];

      const idleClip = findClip('Casual_Walk') || inPlaceClips[0];
      const runClip = findClip('Run') || idleClip;
      const attackClip = findClip('Attack') || runClip;

      const buildRig = (
        kind: RegularEnemy3DKind,
        albedo: THREE.Texture,
        normal: THREE.Texture,
        rough: THREE.Texture,
        metal: THREE.Texture,
        tintHex: number,
        emissiveHex: number,
        scaleVec: [number, number, number]
      ): Archetype3DRig => {
        const clonedChar = SkeletonUtils.clone(baseBipedFbx) as THREE.Group;
        clonedChar.scale.set(scaleVec[0] * 100, scaleVec[1] * 100, scaleVec[2] * 100);

        const bodyMat = new THREE.MeshStandardMaterial({
          map: albedo,
          normalMap: normal,
          normalScale: new THREE.Vector2(1.25, 1.25),
          roughnessMap: rough,
          metalnessMap: metal,
          color: new THREE.Color(tintHex),
          roughness: 0.48,
          metalness: 0.68,
          envMapIntensity: 1.5,
          emissive: new THREE.Color(emissiveHex),
          emissiveIntensity: 0.14,
        });

        clonedChar.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            m.material = bodyMat;
            m.frustumCulled = false;
          }
        });

        const spine1 = clonedChar.getObjectByName('mixamorigSpine1') || null;
        const spine2 = clonedChar.getObjectByName('mixamorigSpine2') || null;
        const rightArm = clonedChar.getObjectByName('mixamorigRightArm') || null;
        const rightForeArm = clonedChar.getObjectByName('mixamorigRightForeArm') || null;
        const rightHand = clonedChar.getObjectByName('mixamorigRightHand') || null;
        const leftArm = clonedChar.getObjectByName('mixamorigLeftArm') || null;
        const leftForeArm = clonedChar.getObjectByName('mixamorigLeftForeArm') || null;

        const wepMats = this.attachArchetype3DWeapons(kind, rightHand, leftForeArm);

        const root = new THREE.Group();
        root.visible = false;
        root.add(clonedChar);
        this.scene.add(root);

        const mixer = new THREE.AnimationMixer(clonedChar);
        const idleAction = idleClip ? mixer.clipAction(idleClip) : null;
        const runAction = runClip ? mixer.clipAction(runClip) : null;
        const attackAction = attackClip ? mixer.clipAction(attackClip) : null;

        if (idleAction) idleAction.play();

        return {
          root,
          mixer,
          idleAction,
          runAction,
          attackAction,
          spine1,
          spine2,
          rightArm,
          rightForeArm,
          leftArm,
          leftForeArm,
          materials: [bodyMat, ...wepMats],
        };
      };

      // Build the 4 Distinct 3D Act I Enemy Archetype Rigs
      this.rigs.wolf_guai = buildRig(
        'wolf_guai',
        warbornAlbedo,
        warbornNorm,
        warbornRough,
        warbornMet,
        0xb8a4d4,
        0x220a2e,
        [0.94, 0.90, 0.96]
      );
      this.rigs.fire_monk = buildRig(
        'fire_monk',
        warbornAlbedo,
        warbornNorm,
        warbornRough,
        warbornMet,
        0xf2b880,
        0x381204,
        [0.92, 0.98, 0.92]
      );
      this.rigs.stone_golem = buildRig(
        'stone_golem',
        warlordAlbedo,
        warlordNorm,
        warlordRough,
        warlordMet,
        0xd8c8b0,
        0x181208,
        [1.12, 1.04, 1.12]
      );
      this.rigs.furnace_titan = buildRig(
        'furnace_titan',
        titanAlbedo,
        titanNorm,
        titanRough,
        titanMet,
        0xffb48a,
        0x481204,
        [1.24, 1.14, 1.24]
      );

      this.isReady = true;
    } catch {
      this.isReady = false;
    }
  }

  public renderEnemy(params: Enemy3DRenderParams): boolean {
    if (!this.isReady || !this.renderer) return false;
    const rig = this.rigs[params.kind];
    if (!rig) return false;

    // Hide all other archetype roots
    (Object.keys(this.rigs) as RegularEnemy3DKind[]).forEach((k) => {
      const r = this.rigs[k];
      if (r) r.root.visible = k === params.kind;
    });

    // Smooth per-enemy 360-degree isometric yaw tracking
    const targetYaw = Math.PI * 0.5 - params.aimAngle;
    const prevYaw = this.perEnemyYaw.get(params.id) ?? targetYaw;
    let diff = targetYaw - prevYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const nextYaw = prevYaw + diff * 0.25;
    this.perEnemyYaw.set(params.id, nextYaw);
    rig.root.rotation.set(0, nextYaw, 0);

    // Sample deterministic animation pose from `params.animTime`
    const speed = Math.hypot(params.vx, params.vy);
    rig.idleAction?. stop();
    rig.runAction?.stop();
    rig.attackAction?.stop();

    if (params.aiState === 'attack' || params.aiState === 'windup') {
      if (rig.attackAction) {
        rig.attackAction.play();
        const clipDur = rig.attackAction.getClip().duration || 1.0;
        const sampleT =
          params.aiState === 'windup'
            ? params.windupProgress * 0.38 * clipDur
            : (0.42 + (params.animTime % 0.35)) * clipDur;
        rig.mixer.setTime(sampleT);
      }
    } else if (speed > 16 || params.aiState === 'chase') {
      if (rig.runAction) {
        rig.runAction.play();
        const clipDur = rig.runAction.getClip().duration || 0.8;
        rig.mixer.setTime((params.animTime * 1.15) % clipDur);
      }
    } else {
      if (rig.idleAction) {
        rig.idleAction.play();
        const clipDur = rig.idleAction.getClip().duration || 1.2;
        rig.mixer.setTime((params.animTime * 0.45) % clipDur);
      }
    }

    // Procedural Combat & Archetype Upper-Body Articulation
    if (rig.spine1) {
      if (params.isPostureBroken) {
        rig.spine1.rotation.x += 0.42;
      } else if (params.aiState === 'windup') {
        rig.spine1.rotation.x -= 0.26 * params.windupProgress;
        rig.spine1.rotation.y += 0.32 * params.windupProgress;
      } else if (params.aiState === 'attack') {
        rig.spine1.rotation.x += 0.34;
        rig.spine1.rotation.y -= 0.38;
      } else if (params.kind === 'wolf_guai') {
        // Predatory forward stalker crouch
        rig.spine1.rotation.x += 0.24;
      }
    }

    if (params.isParrying && rig.leftArm) {
      rig.leftArm.rotation.x -= 0.48;
      rig.leftArm.rotation.z += 0.32;
    }

    // Configure dynamic trait / combat point light & hit-flash emissive
    if (params.trait === 'vajra_shield') {
      this.traitPointLight.color.setHex(0x5ce6ff);
      this.traitPointLight.intensity = 2.1;
    } else if (params.trait === 'agni_aura' || params.kind === 'furnace_titan') {
      this.traitPointLight.color.setHex(0xff6a2b);
      this.traitPointLight.intensity = 2.2;
    } else if (params.trait === 'rakshasa_frenzy') {
      this.traitPointLight.color.setHex(0xd946ef);
      this.traitPointLight.intensity = 2.0;
    } else {
      this.traitPointLight.color.setHex(0xffaa44);
      this.traitPointLight.intensity = 0.95;
    }

    for (const mat of rig.materials) {
      if (params.isHitFlash) {
        mat.emissive.setHex(0xffffff);
        mat.emissiveIntensity = 0.85;
      } else if (params.aiState === 'windup') {
        mat.emissive.setHex(0xff3b1f);
        mat.emissiveIntensity = 0.25 + params.windupProgress * 0.45;
      } else {
        mat.emissive.setHex(
          params.kind === 'furnace_titan'
            ? 0x481204
            : params.kind === 'wolf_guai'
            ? 0x220a2e
            : 0x181208
        );
        mat.emissiveIntensity = 0.14;
      }
    }

    this.renderer.render(this.scene, this.camera);
    return true;
  }

  public dispose(): void {
    this.disposed = true;
    this.renderer?.dispose();
    this.renderer = null;
  }
}
