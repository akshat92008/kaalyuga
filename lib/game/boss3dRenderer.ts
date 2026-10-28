import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export type Boss3DKind = 'dundubhi' | 'vrikodara';

export interface Boss3DRenderParams {
  dt: number;
  kind: Boss3DKind;
  vx: number;
  vy: number;
  facing: 1 | -1;
  aimAngle: number;
  aiState: 'idle' | 'chase' | 'windup' | 'attack' | 'recover' | 'ko';
  attackKind: 'cone' | 'corridor' | 'shockwave';
  windupProgress: number; // 0..1
  phase: 1 | 2 | 3;
  armorCracked: boolean;
  isPostureBroken: boolean;
  isHitFlash: boolean;
}

interface BossBoneCache {
  hips: THREE.Object3D | null;
  spine1: THREE.Object3D | null;
  spine2: THREE.Object3D | null;
  head: THREE.Object3D | null;
  leftArm: THREE.Object3D | null;
  rightArm: THREE.Object3D | null;
  leftHand: THREE.Object3D | null;
  rightHand: THREE.Object3D | null;
}

export class Boss3DRenderer {
  public canvas: HTMLCanvasElement;
  public isReady = false;
  public hasCustomFbxLoaded = false;

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private rootGroup: THREE.Group;

  // Procedural Articulated Rig Groups (instant zero-latency fallback while FBX streams)
  private dundubhiGroup: THREE.Group;
  private vrikodaraGroup: THREE.Group;

  // Dundubhi procedural parts
  private dunTorso: THREE.Group;
  private dunHead: THREE.Group;
  private dunDrumCore: THREE.Mesh;
  private dunDrumCracks: THREE.Group;
  private dunLeftArm: THREE.Group;
  private dunRightArm: THREE.Group;
  private dunLeftLeg: THREE.Group;
  private dunRightLeg: THREE.Group;

  // Vrikodara procedural parts
  private vriTorso: THREE.Group;
  private vriHead: THREE.Group;
  private vriBellyMaw: THREE.Group;
  private vriBellyCore: THREE.Mesh;
  private vriLeftArm: THREE.Group;
  private vriRightArm: THREE.Group;
  private vriLeftPillar: THREE.Group;
  private vriRightPillar: THREE.Group;
  private vriLeftLeg: THREE.Group;
  private vriRightLeg: THREE.Group;

  // Real High-Poly Meshy AI FBX Rigs + Mixamo Animation Mixers
  private customDundubhiFbx: THREE.Group | null = null;
  private customVrikodaraFbx: THREE.Group | null = null;
  private dundubhiMixer: THREE.AnimationMixer | null = null;
  private vrikodaraMixer: THREE.AnimationMixer | null = null;
  private dundubhiActions: Map<string, THREE.AnimationAction> = new Map();
  private vrikodaraActions: Map<string, THREE.AnimationAction> = new Map();
  private activeDundubhiClip = '';
  private activeVrikodaraClip = '';

  private dundubhiBones: BossBoneCache = {
    hips: null,
    spine1: null,
    spine2: null,
    head: null,
    leftArm: null,
    rightArm: null,
    leftHand: null,
    rightHand: null,
  };
  private vrikodaraBones: BossBoneCache = {
    hips: null,
    spine1: null,
    spine2: null,
    head: null,
    leftArm: null,
    rightArm: null,
    leftHand: null,
    rightHand: null,
  };

  private dundubhiFbxMat: THREE.MeshStandardMaterial | null = null;
  private vrikodaraFbxMat: THREE.MeshStandardMaterial | null = null;
  private vriFbxLeftPillar: THREE.Group | null = null;
  private vriFbxRightPillar: THREE.Group | null = null;

  // Pre-allocated scratch math objects (zero per-frame GC allocations)
  private readonly scratchQuat = new THREE.Quaternion();
  private readonly scratchEuler = new THREE.Euler();

  // Lights
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private corePointLight: THREE.PointLight;

  private currentYaw = -Math.PI * 0.5;
  private elapsedTime = 0;
  private allMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(size = 420) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;

    this.scene = new THREE.Scene();

    const halfExtent = 145;
    this.camera = new THREE.OrthographicCamera(
      -halfExtent,
      halfExtent,
      halfExtent,
      -halfExtent,
      1,
      1000
    );
    this.camera.position.set(0, 215, 275);
    this.camera.lookAt(0, 78, 0);

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    const ambient = new THREE.AmbientLight(0xd8d0e5, 1.55);
    this.scene.add(ambient);

    this.keyLight = new THREE.DirectionalLight(0xffe8c8, 2.85);
    this.keyLight.position.set(-140, 270, 195);
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0xff7733, 2.45);
    this.rimLight.position.set(140, 210, -210);
    this.scene.add(this.rimLight);

    const fillLight = new THREE.DirectionalLight(0x6e7894, 1.25);
    fillLight.position.set(160, 65, 140);
    this.scene.add(fillLight);

    this.corePointLight = new THREE.PointLight(0xff8822, 1.8, 210);
    this.corePointLight.position.set(0, 88, 34);
    this.rootGroup.add(this.corePointLight);

    // Initialize procedural articulated 3D rigs
    this.dundubhiGroup = new THREE.Group();
    this.dunTorso = new THREE.Group();
    this.dunHead = new THREE.Group();
    this.dunDrumCore = new THREE.Mesh();
    this.dunDrumCracks = new THREE.Group();
    this.dunLeftArm = new THREE.Group();
    this.dunRightArm = new THREE.Group();
    this.dunLeftLeg = new THREE.Group();
    this.dunRightLeg = new THREE.Group();

    this.vrikodaraGroup = new THREE.Group();
    this.vriTorso = new THREE.Group();
    this.vriHead = new THREE.Group();
    this.vriBellyMaw = new THREE.Group();
    this.vriBellyCore = new THREE.Mesh();
    this.vriLeftArm = new THREE.Group();
    this.vriRightArm = new THREE.Group();
    this.vriLeftPillar = new THREE.Group();
    this.vriRightPillar = new THREE.Group();
    this.vriLeftLeg = new THREE.Group();
    this.vriRightLeg = new THREE.Group();

    this.buildProceduralDundubhiRig();
    this.buildProceduralVrikodaraRig();

    this.rootGroup.add(this.dundubhiGroup);
    this.rootGroup.add(this.vrikodaraGroup);

    this.initWebGL(size);
  }

  private createMat(params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial(params);
    this.allMaterials.push(m);
    return m;
  }

  private buildChainedPillarAttachment(scale = 1.0): THREE.Group {
    const basaltPillarMat = this.createMat({
      color: 0x2b2930,
      roughness: 0.72,
      metalness: 0.32,
      emissive: 0x331006,
      emissiveIntensity: 0.18,
    });
    const goldCrownMat = this.createMat({
      color: 0xd8a642,
      roughness: 0.32,
      metalness: 0.88,
      emissive: 0x422404,
      emissiveIntensity: 0.22,
    });

    const grp = new THREE.Group();
    const colGeo = new THREE.CylinderGeometry(12 * scale, 14 * scale, 68 * scale, 8);
    colGeo.rotateX(Math.PI * 0.5);
    const col = new THREE.Mesh(colGeo, basaltPillarMat);
    col.position.z = 34 * scale;
    grp.add(col);

    for (let r = 0; r < 3; r++) {
      const ringGeo = new THREE.TorusGeometry(13.8 * scale, 2.1 * scale, 8, 16);
      const ring = new THREE.Mesh(ringGeo, goldCrownMat);
      ring.position.z = (16 + r * 18) * scale;
      grp.add(ring);
    }
    return grp;
  }

  private buildProceduralDundubhiRig() {
    const obsidianHide = this.createMat({
      color: 0x1e1b20,
      roughness: 0.65,
      metalness: 0.35,
    });
    const corrodedBronze = this.createMat({
      color: 0x9b763c,
      roughness: 0.42,
      metalness: 0.82,
      emissive: 0x241404,
      emissiveIntensity: 0.15,
    });
    const bloodHornMat = this.createMat({
      color: 0x4a161a,
      roughness: 0.38,
      metalness: 0.55,
      emissive: 0x3a080c,
      emissiveIntensity: 0.2,
    });
    const crimsonCloth = this.createMat({
      color: 0x6e151c,
      roughness: 0.78,
      metalness: 0.15,
    });
    const moltenCoreMat = this.createMat({
      color: 0xffd268,
      roughness: 0.2,
      metalness: 0.1,
      emissive: 0xff6b1a,
      emissiveIntensity: 1.6,
    });

    const legGeo = new THREE.CylinderGeometry(11, 8.5, 48, 10);
    const hoofGeo = new THREE.CylinderGeometry(10, 12.5, 12, 10);

    const leftLegMesh = new THREE.Mesh(legGeo, obsidianHide);
    leftLegMesh.position.y = -22;
    const leftHoof = new THREE.Mesh(hoofGeo, corrodedBronze);
    leftHoof.position.y = -46;
    this.dunLeftLeg.add(leftLegMesh, leftHoof);
    this.dunLeftLeg.position.set(-22, 52, 0);

    const rightLegMesh = new THREE.Mesh(legGeo, obsidianHide);
    rightLegMesh.position.y = -22;
    const rightHoof = new THREE.Mesh(hoofGeo, corrodedBronze);
    rightHoof.position.y = -46;
    this.dunRightLeg.add(rightLegMesh, rightHoof);
    this.dunRightLeg.position.set(22, 52, 0);

    const pelvisGeo = new THREE.CylinderGeometry(28, 32, 26, 12);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, crimsonCloth);
    pelvisMesh.position.y = 54;
    this.dundubhiGroup.add(pelvisMesh, this.dunLeftLeg, this.dunRightLeg);

    this.dunTorso.position.set(0, 66, 0);
    const chestGeo = new THREE.CylinderGeometry(42, 30, 56, 14);
    const chestMesh = new THREE.Mesh(chestGeo, obsidianHide);
    chestMesh.position.y = 26;
    chestMesh.scale.set(1.15, 1, 0.88);
    this.dunTorso.add(chestMesh);

    const drumBarrelGeo = new THREE.CylinderGeometry(24, 24, 26, 20);
    drumBarrelGeo.rotateX(Math.PI * 0.5);
    const drumBarrel = new THREE.Mesh(drumBarrelGeo, corrodedBronze);
    drumBarrel.position.set(0, 26, 20);
    this.dunTorso.add(drumBarrel);

    const drumRimGeo = new THREE.TorusGeometry(23.5, 2.6, 10, 24);
    const drumRim = new THREE.Mesh(drumRimGeo, corrodedBronze);
    drumRim.position.set(0, 26, 33);
    this.dunTorso.add(drumRim);

    const drumFaceGeo = new THREE.CircleGeometry(22, 20);
    this.dunDrumCore = new THREE.Mesh(drumFaceGeo, corrodedBronze.clone());
    this.dunDrumCore.position.set(0, 26, 33.4);
    this.dunTorso.add(this.dunDrumCore);

    const crackMat = moltenCoreMat;
    for (let c = 0; c < 4; c++) {
      const barGeo = new THREE.BoxGeometry(36, 3.2, 2);
      const bar = new THREE.Mesh(barGeo, crackMat);
      bar.rotation.z = (c * Math.PI) / 4 + 0.25;
      this.dunDrumCracks.add(bar);
    }
    this.dunDrumCracks.position.set(0, 26, 34.2);
    this.dunDrumCracks.visible = false;
    this.dunTorso.add(this.dunDrumCracks);

    const pauldronGeo = new THREE.SphereGeometry(20, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const leftPauldron = new THREE.Mesh(pauldronGeo, corrodedBronze);
    leftPauldron.position.set(-44, 46, 0);
    leftPauldron.rotation.z = 0.45;
    const rightPauldron = new THREE.Mesh(pauldronGeo, corrodedBronze);
    rightPauldron.position.set(44, 46, 0);
    rightPauldron.rotation.z = -0.45;
    this.dunTorso.add(leftPauldron, rightPauldron);

    this.dunHead.position.set(0, 56, 12);
    const skullGeo = new THREE.BoxGeometry(26, 26, 34);
    const skull = new THREE.Mesh(skullGeo, obsidianHide);
    skull.position.set(0, 6, 6);
    this.dunHead.add(skull);

    const eyeGeo = new THREE.SphereGeometry(3.2, 8, 8);
    const leftEye = new THREE.Mesh(eyeGeo, moltenCoreMat);
    leftEye.position.set(-8, 10, 22);
    const rightEye = new THREE.Mesh(eyeGeo, moltenCoreMat);
    rightEye.position.set(8, 10, 22);
    this.dunHead.add(leftEye, rightEye);

    const hornCurveGeo = new THREE.TorusGeometry(28, 5.5, 10, 18, Math.PI * 0.72);
    const leftHorn = new THREE.Mesh(hornCurveGeo, bloodHornMat);
    leftHorn.position.set(-18, 16, 6);
    leftHorn.rotation.set(0.35, 0.25, Math.PI * 0.65);
    const rightHorn = new THREE.Mesh(hornCurveGeo, bloodHornMat);
    rightHorn.position.set(18, 16, 6);
    rightHorn.rotation.set(0.35, -0.25, -Math.PI * 0.35);
    this.dunHead.add(leftHorn, rightHorn);
    this.dunTorso.add(this.dunHead);

    const armGeo = new THREE.CylinderGeometry(10.5, 8.5, 46, 10);
    const fistGeo = new THREE.CylinderGeometry(13, 13, 18, 12);

    const lArmMesh = new THREE.Mesh(armGeo, obsidianHide);
    lArmMesh.position.y = -20;
    const lFist = new THREE.Mesh(fistGeo, corrodedBronze);
    lFist.position.y = -44;
    this.dunLeftArm.add(lArmMesh, lFist);
    this.dunLeftArm.position.set(-46, 44, 0);

    const rArmMesh = new THREE.Mesh(armGeo, obsidianHide);
    rArmMesh.position.y = -20;
    const rFist = new THREE.Mesh(fistGeo, corrodedBronze);
    rFist.position.y = -44;
    this.dunRightArm.add(rArmMesh, rFist);
    this.dunRightArm.position.set(46, 44, 0);

    this.dunTorso.add(this.dunLeftArm, this.dunRightArm);
    this.dundubhiGroup.add(this.dunTorso);
  }

  private buildProceduralVrikodaraRig() {
    const castIronMat = this.createMat({
      color: 0x1a1c22,
      roughness: 0.48,
      metalness: 0.78,
      emissive: 0x1c0804,
      emissiveIntensity: 0.12,
    });
    const goldCrownMat = this.createMat({
      color: 0xd8a642,
      roughness: 0.32,
      metalness: 0.88,
      emissive: 0x422404,
      emissiveIntensity: 0.22,
    });
    const furnaceFireMat = this.createMat({
      color: 0xffdd77,
      roughness: 0.15,
      metalness: 0.1,
      emissive: 0xff4512,
      emissiveIntensity: 2.1,
    });

    const legGeo = new THREE.CylinderGeometry(12, 9.5, 52, 10);
    const lLeg = new THREE.Mesh(legGeo, castIronMat);
    lLeg.position.y = -24;
    this.vriLeftLeg.add(lLeg);
    this.vriLeftLeg.position.set(-24, 54, 0);

    const rLeg = new THREE.Mesh(legGeo, castIronMat);
    rLeg.position.y = -24;
    this.vriRightLeg.add(rLeg);
    this.vriRightLeg.position.set(24, 54, 0);

    const waistGeo = new THREE.CylinderGeometry(30, 34, 26, 12);
    const waist = new THREE.Mesh(waistGeo, castIronMat);
    waist.position.y = 56;
    this.vrikodaraGroup.add(waist, this.vriLeftLeg, this.vriRightLeg);

    this.vriTorso.position.set(0, 68, 0);
    const chestGeo = new THREE.CylinderGeometry(45, 32, 62, 14);
    const chest = new THREE.Mesh(chestGeo, castIronMat);
    chest.position.y = 28;
    chest.scale.set(1.18, 1, 0.9);
    this.vriTorso.add(chest);

    this.vriBellyMaw.position.set(0, 20, 26);
    const mawRimGeo = new THREE.TorusGeometry(19, 4.2, 10, 20);
    const mawRim = new THREE.Mesh(mawRimGeo, goldCrownMat);
    this.vriBellyMaw.add(mawRim);

    const mawCoreGeo = new THREE.CircleGeometry(17.5, 18);
    this.vriBellyCore = new THREE.Mesh(mawCoreGeo, furnaceFireMat);
    this.vriBellyCore.position.z = -1;
    this.vriBellyMaw.add(this.vriBellyCore);

    const fangGeo = new THREE.ConeGeometry(3.2, 9, 6);
    for (let f = 0; f < 8; f++) {
      const ang = (f / 8) * Math.PI * 2;
      const fang = new THREE.Mesh(fangGeo, goldCrownMat);
      fang.position.set(Math.cos(ang) * 17, Math.sin(ang) * 17, 2);
      fang.rotation.z = ang + Math.PI * 0.5;
      fang.rotation.x = -0.35;
      this.vriBellyMaw.add(fang);
    }
    this.vriTorso.add(this.vriBellyMaw);

    const pGeo = new THREE.ConeGeometry(22, 28, 8);
    const lPauldron = new THREE.Mesh(pGeo, castIronMat);
    lPauldron.position.set(-48, 52, 0);
    lPauldron.rotation.z = 0.55;
    const rPauldron = new THREE.Mesh(pGeo, castIronMat);
    rPauldron.position.set(48, 52, 0);
    rPauldron.rotation.z = -0.55;
    this.vriTorso.add(lPauldron, rPauldron);

    this.vriHead.position.set(0, 62, 6);
    const helmGeo = new THREE.CylinderGeometry(14, 16, 26, 10);
    const helm = new THREE.Mesh(helmGeo, castIronMat);
    helm.position.y = 10;
    this.vriHead.add(helm);

    for (let s = -2; s <= 2; s++) {
      const spikeGeo = new THREE.ConeGeometry(3.2, 18 + (2 - Math.abs(s)) * 5, 6);
      const spike = new THREE.Mesh(spikeGeo, goldCrownMat);
      spike.position.set(s * 5.5, 26, 2);
      spike.rotation.z = -s * 0.14;
      this.vriHead.add(spike);
    }

    const eyeGeo = new THREE.SphereGeometry(2.8, 8, 8);
    const lEye = new THREE.Mesh(eyeGeo, furnaceFireMat);
    lEye.position.set(-6, 11, 15);
    const rEye = new THREE.Mesh(eyeGeo, furnaceFireMat);
    rEye.position.set(6, 11, 15);
    this.vriHead.add(lEye, rEye);
    this.vriTorso.add(this.vriHead);

    const armGeo = new THREE.CylinderGeometry(11, 9, 48, 10);
    const lArm = new THREE.Mesh(armGeo, castIronMat);
    lArm.position.y = -22;
    this.vriLeftArm.add(lArm);
    this.vriLeftArm.position.set(-48, 48, 0);

    const rArm = new THREE.Mesh(armGeo, castIronMat);
    rArm.position.y = -22;
    this.vriRightArm.add(rArm);
    this.vriRightArm.position.set(48, 48, 0);

    this.vriLeftPillar = this.buildChainedPillarAttachment(1.0);
    this.vriLeftPillar.position.set(0, -44, 6);
    this.vriLeftArm.add(this.vriLeftPillar);

    this.vriRightPillar = this.buildChainedPillarAttachment(1.0);
    this.vriRightPillar.position.set(0, -44, 6);
    this.vriRightArm.add(this.vriRightPillar);

    this.vriTorso.add(this.vriLeftArm, this.vriRightArm);
    this.vrikodaraGroup.add(this.vriTorso);
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
      this.renderer.toneMappingExposure = 1.08;
      this.isReady = true;
      this.loadAllBossFbxModels();
    } catch {
      this.isReady = false;
    }
  }

  private findMixamoBone(root: THREE.Object3D, suffix: string): THREE.Object3D | null {
    let found: THREE.Object3D | null = null;
    const targets = [`mixamorig${suffix}`, `mixamorig:${suffix}`, suffix];
    root.traverse((obj) => {
      if (found) return;
      for (const t of targets) {
        if (obj.name === t || obj.name.endsWith(t)) {
          found = obj;
          return;
        }
      }
    });
    return found;
  }

  private cacheBossBones(root: THREE.Object3D): BossBoneCache {
    return {
      hips: this.findMixamoBone(root, 'Hips'),
      spine1: this.findMixamoBone(root, 'Spine1') || this.findMixamoBone(root, 'Spine'),
      spine2: this.findMixamoBone(root, 'Spine2'),
      head: this.findMixamoBone(root, 'Head'),
      leftArm: this.findMixamoBone(root, 'LeftArm'),
      rightArm: this.findMixamoBone(root, 'RightArm'),
      leftHand: this.findMixamoBone(root, 'LeftHand'),
      rightHand: this.findMixamoBone(root, 'RightHand'),
    };
  }

  private retargetAndStripRootMotion(
    sourceClip: THREE.AnimationClip,
    targetRoot: THREE.Object3D,
    clipName: string
  ): THREE.AnimationClip {
    const boneNameMap = new Map<string, string>();
    targetRoot.traverse((obj) => {
      if ((obj as THREE.Bone).isBone || obj.name.includes('mixamorig')) {
        const clean = obj.name.replace(/^mixamorig:?/, '');
        boneNameMap.set(clean, obj.name);
      }
    });

    const newTracks: THREE.KeyframeTrack[] = [];
    for (const srcTrack of sourceClip.tracks) {
      const dotIdx = srcTrack.name.lastIndexOf('.');
      if (dotIdx === -1) continue;
      const rawNode = srcTrack.name.slice(0, dotIdx);
      const prop = srcTrack.name.slice(dotIdx + 1);
      const cleanBone = rawNode.replace(/^.*mixamorig:?/, '');
      const mappedNode = boneNameMap.get(cleanBone) || rawNode;

      // Skip non-Hips position tracks from external skeletons so bone lengths stay faithful to the Boss rig
      if (prop === 'position' && !cleanBone.endsWith('Hips')) {
        continue;
      }

      const cloned = srcTrack.clone();
      cloned.name = `${mappedNode}.${prop}`;

      if (prop === 'position' && cleanBone.endsWith('Hips')) {
        const vals = cloned.values;
        const baseX = vals[0] || 0;
        const baseY = vals[1] || 0;
        const baseZ = vals[2] || 0;
        for (let i = 0; i < vals.length; i += 3) {
          vals[i] = (vals[i] - baseX) * 0.05;
          vals[i + 1] = baseY + (vals[i + 1] - baseY) * 0.35;
          vals[i + 2] = (vals[i + 2] - baseZ) * 0.05;
        }
      }
      newTracks.push(cloned);
    }

    return new THREE.AnimationClip(clipName, sourceClip.duration, newTracks);
  }

  private normalizeAndGroundModel(obj: THREE.Group, targetHeight: number): THREE.Group {
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const rawH = Math.max(0.001, size.y);
    const scale = targetHeight / rawH;

    const wrapper = new THREE.Group();
    obj.scale.set(scale, scale, scale);
    obj.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3();
    scaledBox.getCenter(center);

    obj.position.set(-center.x, -scaledBox.min.y, -center.z);
    wrapper.add(obj);
    return wrapper;
  }

  private async loadAllBossFbxModels() {
    if (typeof window === 'undefined') return;
    const fbxLoader = new FBXLoader();
    const texLoader = new THREE.TextureLoader();

    const loadTex = (url: string, isColor = false): Promise<THREE.Texture> =>
      new Promise((resolve, reject) => {
        texLoader.load(
          url,
          (tex) => {
            if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
            resolve(tex);
          },
          undefined,
          reject
        );
      });

    const loadFbx = (url: string): Promise<THREE.Group> =>
      new Promise((resolve, reject) => {
        fbxLoader.load(url, resolve, undefined, reject);
      });

    const dunBase = '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx';
    const vriBase = '/models/Meshy_AI_Infernal_Maw_Sovereign_20261025_texture_fbx';

    // Load shared Mixamo combat animation clips (340KB - 620KB each)
    const animPromise = Promise.all([
      loadFbx(`${dunBase}/mutant_idle.fbx`),
      loadFbx(`${dunBase}/mutant_run.fbx`),
      loadFbx(`${dunBase}/mutant_swiping.fbx`),
      loadFbx(`${dunBase}/mutant_jump_attack.fbx`),
      loadFbx(`${dunBase}/mutant_roaring.fbx`),
    ]).catch(() => null);

    // 1. Load Dundubhi (Runebound Minotaur Warlord) + 4K PBR Maps
    Promise.all([
      loadFbx(`${dunBase}/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture.fbx`),
      loadTex(`${dunBase}/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture.png`, true),
      loadTex(`${dunBase}/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_normal.png`, false),
      loadTex(`${dunBase}/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_roughness.png`, false),
      loadTex(`${dunBase}/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_metallic.png`, false),
      animPromise,
    ])
      .then(([dunObj, albedo, normal, rough, metal, animGroups]) => {
        const mat = this.createMat({
          map: albedo,
          normalMap: normal,
          normalScale: new THREE.Vector2(1.25, 1.25),
          roughnessMap: rough,
          metalnessMap: metal,
          roughness: 0.62,
          metalness: 0.52,
          emissive: new THREE.Color(0x1f0c04),
          emissiveIntensity: 0.16,
        });
        this.dundubhiFbxMat = mat;

        dunObj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.material = mat;
            mesh.frustumCulled = false;
          }
        });

        this.dundubhiBones = this.cacheBossBones(dunObj);
        const wrapped = this.normalizeAndGroundModel(dunObj, 178);
        this.customDundubhiFbx = wrapped;
        this.rootGroup.add(wrapped);

        this.dundubhiMixer = new THREE.AnimationMixer(dunObj);
        if (animGroups) {
          const clipSpecs: Array<[string, THREE.Group, boolean]> = [
            ['idle', animGroups[0], true],
            ['run', animGroups[1], true],
            ['swipe', animGroups[2], false],
            ['jumpAttack', animGroups[3], false],
            ['roar', animGroups[4], false],
          ];
          for (const [name, grp, loop] of clipSpecs) {
            const raw = grp.animations?.[0];
            if (!raw) continue;
            const clip = this.retargetAndStripRootMotion(raw, dunObj, name);
            const act = this.dundubhiMixer.clipAction(clip);
            if (!loop) {
              act.setLoop(THREE.LoopOnce, 1);
              act.clampWhenFinished = true;
            }
            this.dundubhiActions.set(name, act);
          }
          this.transitionBossClip('dundubhi', 'idle', 0.05, 1.0);
        }
        this.hasCustomFbxLoaded = true;
      })
      .catch(() => {
        // Fallback to procedural Dundubhi rig
      });

    // 2. Load Vrikodara (Infernal Maw Sovereign) + 4K PBR Maps
    Promise.all([
      loadFbx(`${vriBase}/Meshy_AI_Infernal_Maw_Sovereign_20261025_texture.fbx`),
      loadTex(`${vriBase}/Meshy_AI_Infernal_Maw_Sovereign_20261025_texture.png`, true),
      loadTex(`${vriBase}/Meshy_AI_Infernal_Maw_Sovereign_20261025_texture_normal.png`, false),
      loadTex(`${vriBase}/Meshy_AI_Infernal_Maw_Sovereign_20261025_texture_roughness.png`, false),
      loadTex(`${vriBase}/Meshy_AI_Infernal_Maw_Sovereign_20261025_texture_metallic.png`, false),
      animPromise,
    ])
      .then(([vriObj, albedo, normal, rough, metal, animGroups]) => {
        const mat = this.createMat({
          map: albedo,
          normalMap: normal,
          normalScale: new THREE.Vector2(1.3, 1.3),
          roughnessMap: rough,
          metalnessMap: metal,
          roughness: 0.54,
          metalness: 0.65,
          emissive: new THREE.Color(0x240904),
          emissiveIntensity: 0.2,
        });
        this.vrikodaraFbxMat = mat;

        vriObj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.material = mat;
            mesh.frustumCulled = false;
          }
        });

        this.vrikodaraBones = this.cacheBossBones(vriObj);
        const wrapped = this.normalizeAndGroundModel(vriObj, 192);

        // Attach Phase 1 Chained Basalt Pillars to Vrikodara's hands
        if (this.vrikodaraBones.leftHand) {
          this.vriFbxLeftPillar = this.buildChainedPillarAttachment(0.008);
          this.vrikodaraBones.leftHand.add(this.vriFbxLeftPillar);
        }
        if (this.vrikodaraBones.rightHand) {
          this.vriFbxRightPillar = this.buildChainedPillarAttachment(0.008);
          this.vrikodaraBones.rightHand.add(this.vriFbxRightPillar);
        }

        this.customVrikodaraFbx = wrapped;
        this.rootGroup.add(wrapped);

        this.vrikodaraMixer = new THREE.AnimationMixer(vriObj);
        if (animGroups) {
          const clipSpecs: Array<[string, THREE.Group, boolean]> = [
            ['idle', animGroups[0], true],
            ['run', animGroups[1], true],
            ['swipe', animGroups[2], false],
            ['jumpAttack', animGroups[3], false],
            ['roar', animGroups[4], false],
          ];
          for (const [name, grp, loop] of clipSpecs) {
            const raw = grp.animations?.[0];
            if (!raw) continue;
            const clip = this.retargetAndStripRootMotion(raw, vriObj, name);
            const act = this.vrikodaraMixer.clipAction(clip);
            if (!loop) {
              act.setLoop(THREE.LoopOnce, 1);
              act.clampWhenFinished = true;
            }
            this.vrikodaraActions.set(name, act);
          }
          this.transitionBossClip('vrikodara', 'idle', 0.05, 1.0);
        }
        this.hasCustomFbxLoaded = true;
      })
      .catch(() => {
        // Fallback to procedural Vrikodara rig
      });
  }

  private transitionBossClip(
    kind: Boss3DKind,
    clipName: string,
    fadeDuration = 0.12,
    timeScale = 1.0
  ) {
    const actions = kind === 'dundubhi' ? this.dundubhiActions : this.vrikodaraActions;
    const activeName = kind === 'dundubhi' ? this.activeDundubhiClip : this.activeVrikodaraClip;
    const nextAction = actions.get(clipName) || actions.get('idle');
    if (!nextAction) return;

    if (activeName === clipName) {
      nextAction.setEffectiveTimeScale(timeScale);
      return;
    }

    const prevAction = actions.get(activeName);
    for (const [, act] of actions.entries()) {
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
    nextAction.play();

    if (prevAction && prevAction !== nextAction) {
      prevAction.crossFadeTo(nextAction, fadeDuration, false);
    }

    if (kind === 'dundubhi') {
      this.activeDundubhiClip = clipName;
    } else {
      this.activeVrikodaraClip = clipName;
    }
  }

  private applyBossBonePose(
    bones: BossBoneCache,
    spinePitch: number,
    spineYaw: number,
    headPitch: number,
    leftArmPitch: number,
    rightArmPitch: number,
    armSpreadZ = 0
  ) {
    if (bones.spine1) {
      this.scratchEuler.set(spinePitch * 0.5, spineYaw * 0.5, 0, 'XYZ');
      this.scratchQuat.setFromEuler(this.scratchEuler);
      bones.spine1.quaternion.multiply(this.scratchQuat);
    }
    if (bones.spine2) {
      this.scratchEuler.set(spinePitch * 0.5, spineYaw * 0.5, 0, 'XYZ');
      this.scratchQuat.setFromEuler(this.scratchEuler);
      bones.spine2.quaternion.multiply(this.scratchQuat);
    }
    if (bones.head) {
      this.scratchEuler.set(headPitch, 0, 0, 'XYZ');
      this.scratchQuat.setFromEuler(this.scratchEuler);
      bones.head.quaternion.multiply(this.scratchQuat);
    }
    if (bones.leftArm) {
      this.scratchEuler.set(leftArmPitch, 0, armSpreadZ, 'XYZ');
      this.scratchQuat.setFromEuler(this.scratchEuler);
      bones.leftArm.quaternion.multiply(this.scratchQuat);
    }
    if (bones.rightArm) {
      this.scratchEuler.set(rightArmPitch, 0, -armSpreadZ, 'XYZ');
      this.scratchQuat.setFromEuler(this.scratchEuler);
      bones.rightArm.quaternion.multiply(this.scratchQuat);
    }
  }

  public updateAndRender(params: Boss3DRenderParams): boolean {
    if (!this.isReady || !this.renderer) return false;

    const dt = Math.min(0.05, Math.max(0.001, params.dt));
    this.elapsedTime += dt;

    const isDundubhi = params.kind === 'dundubhi';
    this.dundubhiGroup.visible = isDundubhi && !this.customDundubhiFbx;
    this.vrikodaraGroup.visible = !isDundubhi && !this.customVrikodaraFbx;
    if (this.customDundubhiFbx) this.customDundubhiFbx.visible = isDundubhi;
    if (this.customVrikodaraFbx) this.customVrikodaraFbx.visible = !isDundubhi;

    // Smooth 360-degree isometric yaw toward aimAngle or facing
    const targetYaw =
      params.aiState === 'windup' || params.aiState === 'attack'
        ? Math.atan2(Math.cos(params.aimAngle), Math.sin(params.aimAngle))
        : params.facing === 1
        ? Math.PI * 0.45
        : -Math.PI * 0.45;
    const diff = Math.atan2(
      Math.sin(targetYaw - this.currentYaw),
      Math.cos(targetYaw - this.currentYaw)
    );
    this.currentYaw += diff * Math.min(1, 14 * dt);
    this.rootGroup.rotation.y = this.currentYaw;

    const speed = Math.hypot(params.vx, params.vy);
    const walkCycle = this.elapsedTime * (speed > 25 ? 9.5 : 3.2);

    // Select desired skeletal clip based on Boss AI state
    const desiredClip =
      params.isPostureBroken || params.aiState === 'ko'
        ? 'idle'
        : params.aiState === 'windup'
        ? params.attackKind === 'shockwave'
          ? 'roar'
          : 'swipe'
        : params.aiState === 'attack'
        ? params.attackKind === 'corridor'
          ? 'run'
          : params.attackKind === 'shockwave'
          ? 'jumpAttack'
          : 'swipe'
        : speed > 22 || params.aiState === 'chase'
        ? 'run'
        : 'idle';

    const clipSpeed =
      params.isPostureBroken || params.aiState === 'ko'
        ? 0.25
        : params.aiState === 'attack' && params.attackKind === 'corridor'
        ? 1.75
        : params.aiState === 'windup'
        ? 0.9
        : 1.15;

    if (isDundubhi) {
      if (this.customDundubhiFbx && this.dundubhiMixer) {
        this.transitionBossClip('dundubhi', desiredClip, 0.1, clipSpeed);
        this.dundubhiMixer.update(dt);
        this.animateFbxDundubhi(params);
      } else {
        this.animateDundubhi(params, walkCycle, speed);
      }
    } else {
      if (this.customVrikodaraFbx && this.vrikodaraMixer) {
        this.transitionBossClip('vrikodara', desiredClip, 0.1, clipSpeed);
        this.vrikodaraMixer.update(dt);
        this.animateFbxVrikodara(params);
      } else {
        this.animateVrikodara(params, walkCycle, speed);
      }
    }

    // Hit-flash emissive boost
    if (params.isHitFlash) {
      for (const mat of this.allMaterials) {
        mat.emissiveIntensity = 1.85;
      }
    }

    this.renderer.render(this.scene, this.camera);

    // Restore normal emissive after render
    if (params.isHitFlash) {
      for (const mat of this.allMaterials) {
        mat.emissiveIntensity = 0.22;
      }
    }

    return true;
  }

  private animateFbxDundubhi(params: Boss3DRenderParams) {
    if (!this.customDundubhiFbx) return;

    if (this.dundubhiFbxMat) {
      if (params.armorCracked) {
        this.dundubhiFbxMat.emissive.setHex(0xff4512);
        this.dundubhiFbxMat.emissiveIntensity = 0.55 + Math.sin(this.elapsedTime * 12) * 0.2;
        this.corePointLight.color.setHex(0xff5518);
        this.corePointLight.intensity = 3.4;
      } else {
        this.dundubhiFbxMat.emissive.setHex(0x241204);
        this.dundubhiFbxMat.emissiveIntensity = 0.16;
        this.corePointLight.color.setHex(0xff9933);
        this.corePointLight.intensity = 1.6;
      }
    }

    if (params.isPostureBroken || params.aiState === 'ko') {
      this.customDundubhiFbx.position.y = -18;
      this.applyBossBonePose(this.dundubhiBones, 0.45, 0, 0.35, 0.3, 0.3);
      return;
    }

    this.customDundubhiFbx.position.y = 0;
    if (params.aiState === 'windup') {
      const p = params.windupProgress;
      if (params.attackKind === 'corridor') {
        // Lowering bull horns for lethal corridor charge
        this.applyBossBonePose(this.dundubhiBones, 0.48 * p, 0, 0.38 * p, 0.25, 0.25);
      } else if (params.attackKind === 'shockwave') {
        // Beating war-drum chest
        const beat = Math.sin(p * Math.PI * 6) * 0.3;
        this.applyBossBonePose(this.dundubhiBones, -0.22, 0, -0.25, -0.5 + beat, -0.5 - beat);
      }
    } else if (params.aiState === 'attack' && params.attackKind === 'corridor') {
      this.applyBossBonePose(this.dundubhiBones, 0.55, 0, -0.32, -0.4, -0.4);
    }
  }

  private animateFbxVrikodara(params: Boss3DRenderParams) {
    if (!this.customVrikodaraFbx) return;
    const isPhase2 = params.phase >= 2;

    if (this.vriFbxLeftPillar) this.vriFbxLeftPillar.visible = !isPhase2;
    if (this.vriFbxRightPillar) this.vriFbxRightPillar.visible = !isPhase2;

    const scale = isPhase2 ? 1.1 : 1.0;
    this.customVrikodaraFbx.scale.set(scale, scale, scale);

    if (this.vrikodaraFbxMat) {
      if (isPhase2) {
        this.vrikodaraFbxMat.emissive.setHex(0xff3300);
        this.vrikodaraFbxMat.emissiveIntensity = 0.68 + Math.sin(this.elapsedTime * 14) * 0.24;
        this.corePointLight.color.setHex(0xff3810);
        this.corePointLight.intensity = 4.0;
        this.rimLight.color.setHex(0xff4411);
        this.rimLight.intensity = 3.5;
      } else {
        this.vrikodaraFbxMat.emissive.setHex(0x240904);
        this.vrikodaraFbxMat.emissiveIntensity = 0.2;
        this.corePointLight.color.setHex(0xff7722);
        this.corePointLight.intensity = 2.2;
        this.rimLight.color.setHex(0xe8a856);
        this.rimLight.intensity = 2.3;
      }
    }

    if (params.isPostureBroken || params.aiState === 'ko') {
      this.customVrikodaraFbx.position.y = -20;
      this.applyBossBonePose(this.vrikodaraBones, 0.42, 0, 0.38, 0.25, 0.25);
      return;
    }

    this.customVrikodaraFbx.position.y = 0;
    if (params.aiState === 'windup') {
      const p = params.windupProgress;
      if (params.attackKind === 'shockwave') {
        // Abdominal Furnace-Maw Vacuum Pull — arches chest back wide
        this.applyBossBonePose(this.vrikodaraBones, -0.35 * p, 0, -0.25 * p, -0.4, -0.4, 0.55 * p);
      } else {
        this.applyBossBonePose(
          this.vrikodaraBones,
          -0.24 * p,
          -0.35 * p,
          0,
          -0.85 * p,
          -0.85 * p
        );
      }
    } else if (params.aiState === 'attack') {
      this.applyBossBonePose(this.vrikodaraBones, 0.42, 0.35, 0.1, 0.65, 0.65);
    }
  }

  private animateDundubhi(params: Boss3DRenderParams, walkCycle: number, speed: number) {
    this.dunDrumCracks.visible = params.armorCracked;
    const drumMat = this.dunDrumCore.material as THREE.MeshStandardMaterial;
    if (params.armorCracked) {
      drumMat.color.setHex(0xffb84d);
      drumMat.emissive.setHex(0xff4512);
      drumMat.emissiveIntensity = 1.6 + Math.sin(this.elapsedTime * 12) * 0.4;
      this.corePointLight.color.setHex(0xff5518);
      this.corePointLight.intensity = 3.2;
    } else {
      drumMat.color.setHex(0x9b763c);
      drumMat.emissive.setHex(0x331c06);
      drumMat.emissiveIntensity = 0.25;
      this.corePointLight.color.setHex(0xff9933);
      this.corePointLight.intensity = 1.4;
    }

    const legSwing = speed > 20 || params.aiState === 'chase' ? Math.sin(walkCycle) * 0.48 : 0;
    this.dunLeftLeg.rotation.x = legSwing;
    this.dunRightLeg.rotation.x = -legSwing;

    if (params.isPostureBroken || params.aiState === 'ko') {
      this.dundubhiGroup.position.y = -18;
      this.dunTorso.rotation.x = 0.42;
      this.dunHead.rotation.x = 0.35;
      this.dunLeftArm.rotation.set(0.3, 0, 0.25);
      this.dunRightArm.rotation.set(0.3, 0, -0.25);
      return;
    }

    this.dundubhiGroup.position.y = Math.abs(Math.sin(walkCycle)) * (speed > 20 ? 5 : 1.5);

    if (params.aiState === 'windup') {
      const p = params.windupProgress;
      if (params.attackKind === 'shockwave') {
        const beat = Math.sin(p * Math.PI * 6);
        this.dunTorso.rotation.x = -0.18;
        this.dunLeftArm.rotation.set(-0.95, 0.55 + beat * 0.35, -0.4);
        this.dunRightArm.rotation.set(-0.95, -0.55 - beat * 0.35, 0.4);
        this.dunHead.rotation.x = -0.25;
      } else if (params.attackKind === 'corridor') {
        this.dunTorso.rotation.x = 0.48 * p;
        this.dunHead.rotation.x = 0.42 * p;
        this.dunLeftArm.rotation.set(0.45, 0, 0.3);
        this.dunRightArm.rotation.set(0.45, 0, -0.3);
      } else {
        this.dunTorso.rotation.x = -0.25 * p;
        this.dunLeftArm.rotation.set(-2.2 * p, 0, 0.2);
        this.dunRightArm.rotation.set(-2.2 * p, 0, -0.2);
      }
    } else if (params.aiState === 'attack') {
      if (params.attackKind === 'corridor') {
        this.dunTorso.rotation.x = 0.58;
        this.dunHead.rotation.x = -0.35;
        this.dunLeftArm.rotation.set(-0.8, 0, 0.35);
        this.dunRightArm.rotation.set(-0.8, 0, -0.35);
      } else {
        this.dunTorso.rotation.x = 0.42;
        this.dunLeftArm.rotation.set(0.95, 0, 0.15);
        this.dunRightArm.rotation.set(0.95, 0, -0.15);
      }
    } else {
      this.dunTorso.rotation.x = 0.08 + Math.sin(this.elapsedTime * 3) * 0.04;
      this.dunHead.rotation.x = Math.sin(this.elapsedTime * 2.5) * 0.06;
      this.dunLeftArm.rotation.set(-0.35 - legSwing * 0.5, 0, 0.22);
      this.dunRightArm.rotation.set(-0.35 + legSwing * 0.5, 0, -0.22);
    }
  }

  private animateVrikodara(params: Boss3DRenderParams, walkCycle: number, speed: number) {
    const isPhase2 = params.phase >= 2;

    this.vriLeftPillar.visible = !isPhase2;
    this.vriRightPillar.visible = !isPhase2;

    const bellyMat = this.vriBellyCore.material as THREE.MeshStandardMaterial;
    if (isPhase2) {
      this.vrikodaraGroup.scale.set(1.12, 1.12, 1.12);
      bellyMat.emissive.setHex(0xff3300);
      bellyMat.emissiveIntensity = 2.8 + Math.sin(this.elapsedTime * 15) * 0.6;
      this.corePointLight.color.setHex(0xff3810);
      this.corePointLight.intensity = 3.8;
      this.rimLight.color.setHex(0xff4411);
      this.rimLight.intensity = 3.4;
    } else {
      this.vrikodaraGroup.scale.set(1.0, 1.0, 1.0);
      bellyMat.emissive.setHex(0xff6a1a);
      bellyMat.emissiveIntensity = 1.6;
      this.corePointLight.color.setHex(0xff7722);
      this.corePointLight.intensity = 2.0;
      this.rimLight.color.setHex(0xe8a856);
      this.rimLight.intensity = 2.2;
    }

    const legSwing = speed > 20 || params.aiState === 'chase' ? Math.sin(walkCycle) * 0.45 : 0;
    this.vriLeftLeg.rotation.x = legSwing;
    this.vriRightLeg.rotation.x = -legSwing;

    if (params.isPostureBroken || params.aiState === 'ko') {
      this.vrikodaraGroup.position.y = -22;
      this.vriTorso.rotation.x = 0.38;
      this.vriHead.rotation.x = 0.42;
      this.vriLeftArm.rotation.set(0.25, 0, 0.2);
      this.vriRightArm.rotation.set(0.25, 0, -0.2);
      return;
    }

    this.vrikodaraGroup.position.y = Math.abs(Math.sin(walkCycle)) * (speed > 20 ? 5.5 : 1.8);

    if (params.aiState === 'windup') {
      const p = params.windupProgress;
      if (params.attackKind === 'shockwave') {
        this.vriTorso.rotation.x = -0.32 * p;
        const mawPulse = 1 + Math.sin(this.elapsedTime * 22) * 0.22;
        this.vriBellyMaw.scale.set(mawPulse, mawPulse, 1.25);
        this.vriLeftArm.rotation.set(-0.6, 0, 0.75 * p);
        this.vriRightArm.rotation.set(-0.6, 0, -0.75 * p);
      } else {
        this.vriBellyMaw.scale.set(1, 1, 1);
        this.vriTorso.rotation.x = -0.24 * p;
        this.vriTorso.rotation.y = -0.55 * p;
        this.vriLeftArm.rotation.set(-2.1 * p, 0, 0.35);
        this.vriRightArm.rotation.set(-2.1 * p, 0, -0.35);
      }
    } else if (params.aiState === 'attack') {
      this.vriBellyMaw.scale.set(1, 1, 1);
      this.vriTorso.rotation.x = 0.46;
      this.vriTorso.rotation.y = 0.55;
      this.vriLeftArm.rotation.set(0.88, -0.35, 0.15);
      this.vriRightArm.rotation.set(0.88, 0.35, -0.15);
    } else {
      this.vriBellyMaw.scale.set(1, 1, 1);
      this.vriTorso.rotation.x = 0.06 + Math.sin(this.elapsedTime * 2.8) * 0.04;
      this.vriTorso.rotation.y = Math.sin(walkCycle) * 0.12;
      this.vriLeftArm.rotation.set(-0.45 - legSwing * 0.45, 0, 0.24);
      this.vriRightArm.rotation.set(-0.45 + legSwing * 0.45, 0, -0.24);
    }
  }

  public dispose() {
    for (const m of this.allMaterials) m.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
