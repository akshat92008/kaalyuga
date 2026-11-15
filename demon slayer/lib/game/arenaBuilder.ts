import * as THREE from 'three';
import { ARENA_BOUND, type DundubhiAttackKind, type PillarState } from './rules';
import { attachSumiInkOutlines, createDemonSlayerCelMaterial } from './demonSlayerShader';

export interface ArenaSceneHandles {
  root: THREE.Group;
  brazierLights: THREE.PointLight[];
  pillarGroups: Map<number, { intact: THREE.Group; rubble: THREE.Group }>;
  telegraphDisc: THREE.Mesh;
  telegraphRing: THREE.Mesh;
  telegraphCone: THREE.Mesh;
  telegraphLane: THREE.Mesh;
  shockwaveMeshes: THREE.Mesh[];
  rudraShadow: THREE.Mesh;
  bossShadow: THREE.Mesh;
  emberParticles: THREE.Points;
  updateTelegraph: (
    active: boolean,
    kind: DundubhiAttackKind,
    bossX: number,
    bossZ: number,
    bossYaw: number,
    targetX: number,
    targetZ: number,
    progress: number,
    time: number
  ) => void;
  updateDecor: (
    time: number,
    enraged: boolean,
    pillars: PillarState[],
    drumPulse: number
  ) => void;
  dispose: () => void;
}

function createCholaStoneTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#47413c';
  ctx.fillRect(0, 0, size, size);

  // Carved temple granite strata + warm sandstone patina matching dundubhi_chamber.mp4 pillars
  for (let y = 0; y < size; y += 32) {
    const shade = 62 + ((y * 17) % 18);
    ctx.fillStyle = `rgba(${shade + 8}, ${shade + 2}, ${shade - 4}, 0.55)`;
    ctx.fillRect(0, y, size, 28);
    ctx.fillStyle = '#241e1a';
    ctx.fillRect(0, y + 28, size, 4);
  }

  // Etched golden-copper Yantra frieze bands
  ctx.strokeStyle = '#c88a36';
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 96, size - 36, 42);
  ctx.strokeRect(18, 360, size - 36, 42);

  for (let x = 32; x < size - 24; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 102);
    ctx.lineTo(x + 18, 117);
    ctx.lineTo(x, 132);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x + 12, 381, 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Subtle moss & ash weathering along base
  const grad = ctx.createLinearGradient(0, size * 0.65, 0, size);
  grad.addColorStop(0, 'rgba(28, 32, 24, 0)');
  grad.addColorStop(1, 'rgba(18, 22, 16, 0.72)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, size * 0.65, size, size * 0.35);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(4, 3, 7, 0.88)');
  grad.addColorStop(0.52, 'rgba(4, 3, 7, 0.45)');
  grad.addColorStop(1, 'rgba(4, 3, 7, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildDestructibleCholaPillar(
  stoneMat: THREE.Material,
  bronzeMat: THREE.Material,
  emberMat: THREE.Material
): { intact: THREE.Group; rubble: THREE.Group } {
  const intact = new THREE.Group();

  // Stepped octagonal temple plinth flush at y = 0
  const plinthLower = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.0, 0.28, 8), stoneMat);
  plinthLower.position.y = 0.14;
  plinthLower.castShadow = true;
  plinthLower.receiveShadow = true;

  const plinthUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.84, 0.22, 8), bronzeMat);
  plinthUpper.position.y = 0.39;
  plinthUpper.castShadow = true;

  // Carved octagonal stone shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.6, 2.15, 8), stoneMat);
  shaft.position.y = 1.56;
  shaft.castShadow = true;
  shaft.receiveShadow = true;

  // Glowing bull-horn fissure band
  const runeRing = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.16, 8), emberMat);
  runeRing.position.y = 1.58;

  // Stepped Chola shrine capital
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.56, 0.3, 8), bronzeMat);
  collar.position.y = 2.72;
  collar.castShadow = true;

  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.72, 0.42, 8), stoneMat);
  crown.position.y = 3.06;
  crown.castShadow = true;

  intact.add(plinthLower, plinthUpper, shaft, runeRing, collar, crown);
  attachSumiInkOutlines(intact, 0.008, 0x090508);

  // Crumbled stone stump & scattered shards when shattered by Bellhorn's charge/slam
  const rubble = new THREE.Group();
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.96, 0.34, 8), stoneMat);
  stump.position.y = 0.17;
  stump.receiveShadow = true;
  rubble.add(stump);

  const offsets: Array<[number, number, number, number]> = [
    [-0.55, 0.16, 0.42, 0.35],
    [0.62, 0.14, -0.32, 0.28],
    [0.18, 0.15, 0.65, 0.32],
    [-0.45, 0.13, -0.52, 0.26],
  ];
  for (const [ox, oy, oz, r] of offsets) {
    const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), stoneMat);
    chunk.position.set(ox, oy, oz);
    chunk.rotation.set(ox * 2, oy * 3, oz * 2);
    chunk.scale.y = 0.58;
    chunk.castShadow = true;
    rubble.add(chunk);
  }
  rubble.visible = false;

  return { intact, rubble };
}

export function buildBronzeDrumArena(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  initialPillars: PillarState[]
): ArenaSceneHandles {
  const root = new THREE.Group();
  scene.add(root);

  const stoneTex = createCholaStoneTexture();
  stoneTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  // Transparent shadow-catching plane aligned seamlessly over dundubhi_chamber.mp4 floor
  const shadowFloorMat = new THREE.ShadowMaterial({
    opacity: 0.56,
    color: 0x050308,
  });
  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), shadowFloorMat);
  shadowFloor.rotation.x = -Math.PI * 0.5;
  shadowFloor.position.y = 0.001;
  shadowFloor.receiveShadow = true;
  root.add(shadowFloor);

  // Materials for destructible pillars
  const pillarStoneMat = createDemonSlayerCelMaterial({
    map: stoneTex,
    tintHex: 0xe6d6c3,
    emissiveHex: 0x1e140e,
    emissiveIntensity: 0.28,
  });
  const pillarBronzeMat = createDemonSlayerCelMaterial({
    map: null,
    tintHex: 0xc2873a,
    emissiveHex: 0x3b2109,
    emissiveIntensity: 0.32,
  });
  const pillarEmberMat = new THREE.MeshBasicMaterial({
    color: 0xff6b1a,
    transparent: true,
    opacity: 0.85,
  });

  // Destructible Kurukshetra/Chola Pillars
  const pillarGroups = new Map<number, { intact: THREE.Group; rubble: THREE.Group }>();
  for (const p of initialPillars) {
    const pair = buildDestructibleCholaPillar(pillarStoneMat, pillarBronzeMat, pillarEmberMat);
    pair.intact.position.set(p.x, 0, p.z);
    pair.rubble.position.set(p.x, 0, p.z);
    root.add(pair.intact, pair.rubble);
    pillarGroups.set(p.id, pair);
  }

  // Contact shadow discs directly beneath Rudra & Dundubhi
  const shadowTex = createContactShadowTexture();
  const rudraShadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const rudraShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 1.55), rudraShadowMat);
  rudraShadow.rotation.x = -Math.PI * 0.5;
  rudraShadow.position.y = 0.012;
  rudraShadow.renderOrder = 2;

  const bossShadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  const bossShadow = new THREE.Mesh(new THREE.PlaneGeometry(2.65, 2.65), bossShadowMat);
  bossShadow.rotation.x = -Math.PI * 0.5;
  bossShadow.position.y = 0.013;
  bossShadow.renderOrder = 2;
  root.add(rudraShadow, bossShadow);

  // Corner brazier PointLights positioned to match the 4 burning braziers in dundubhi_chamber.mp4
  const cornerDist = ARENA_BOUND * 0.92;
  const cornerCoords: Array<[number, number]> = [
    [-cornerDist, -cornerDist],
    [cornerDist, -cornerDist],
    [-cornerDist, cornerDist],
    [cornerDist, cornerDist],
  ];
  const brazierLights: THREE.PointLight[] = [];
  for (const [cx, cz] of cornerCoords) {
    const light = new THREE.PointLight(0xff7b24, 18, 15, 1.4);
    light.position.set(cx, 2.1, cz);
    root.add(light);
    brazierLights.push(light);
  }

  // Ground telegraph geometries: AOE Disc, Outer Ring, Frontal Cone Wedge, and Bull-Charge Lane
  const telegraphDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1, 36),
    new THREE.MeshBasicMaterial({
      color: 0xff2e1f,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  telegraphDisc.rotation.x = -Math.PI * 0.5;
  telegraphDisc.position.y = 0.025;
  telegraphDisc.visible = false;
  telegraphDisc.renderOrder = 4;

  const telegraphRing = new THREE.Mesh(
    new THREE.RingGeometry(0.91, 1.0, 40),
    new THREE.MeshBasicMaterial({
      color: 0xffb703,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  telegraphRing.rotation.x = -Math.PI * 0.5;
  telegraphRing.position.y = 0.028;
  telegraphRing.visible = false;
  telegraphRing.renderOrder = 5;

  // Frontal 130° cone mesh lying flat on XZ pointing toward +Z before Y-rotation
  const coneGeo = new THREE.CircleGeometry(1, 24, -Math.PI * 0.5 - 1.15, 2.3);
  coneGeo.rotateX(-Math.PI * 0.5);
  const telegraphCone = new THREE.Mesh(
    coneGeo,
    new THREE.MeshBasicMaterial({
      color: 0xff3b1f,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  telegraphCone.position.y = 0.026;
  telegraphCone.visible = false;
  telegraphCone.renderOrder = 4;

  // Bull-charge corridor lane extending along +Z from 0..1 before Y-rotation & Z-scaling
  const laneGeo = new THREE.PlaneGeometry(1.75, 1.0);
  laneGeo.rotateX(-Math.PI * 0.5);
  laneGeo.translate(0, 0, 0.5);
  const telegraphLane = new THREE.Mesh(
    laneGeo,
    new THREE.MeshBasicMaterial({
      color: 0xff451f,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  telegraphLane.position.y = 0.026;
  telegraphLane.visible = false;
  telegraphLane.renderOrder = 4;

  root.add(telegraphDisc, telegraphRing, telegraphCone, telegraphLane);

  // Pooled shockwave rings
  const shockwaveMeshes: THREE.Mesh[] = [];
  const swGeo = new THREE.RingGeometry(0.76, 1.0, 36);
  for (let i = 0; i < 4; i++) {
    const sw = new THREE.Mesh(
      swGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff9f1c,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    sw.rotation.x = -Math.PI * 0.5;
    sw.position.y = 0.04;
    sw.visible = false;
    sw.renderOrder = 6;
    root.add(sw);
    shockwaveMeshes.push(sw);
  }

  // Rising volcanic fire embers drifting across the temple courtyard
  const emberCount = 64;
  const emberPos = new Float32Array(emberCount * 3);
  for (let i = 0; i < emberCount; i++) {
    emberPos[i * 3 + 0] = (Math.random() - 0.5) * 14;
    emberPos[i * 3 + 1] = 0.15 + Math.random() * 3.8;
    emberPos[i * 3 + 2] = (Math.random() - 0.5) * 14;
  }
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const emberPointsMat = new THREE.PointsMaterial({
    color: 0xff9f40,
    size: 0.11,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const emberParticles = new THREE.Points(emberGeo, emberPointsMat);
  emberParticles.renderOrder = 14;
  root.add(emberParticles);

  const updateTelegraph = (
    active: boolean,
    kind: DundubhiAttackKind,
    bossX: number,
    bossZ: number,
    bossYaw: number,
    targetX: number,
    targetZ: number,
    progress: number,
    time: number
  ) => {
    telegraphDisc.visible = false;
    telegraphRing.visible = false;
    telegraphCone.visible = false;
    telegraphLane.visible = false;

    if (!active) return;

    const pulse = 0.85 + Math.sin(time * 24) * 0.15;
    const p = Math.max(0, Math.min(1, progress));

    if (kind === 'slam' || kind === 'roar') {
      const rad = kind === 'roar' ? 5.4 : 3.55;
      const tx = kind === 'slam' ? targetX : bossX;
      const tz = kind === 'slam' ? targetZ : bossZ;

      telegraphDisc.visible = true;
      telegraphDisc.position.set(tx, 0.025, tz);
      telegraphDisc.scale.setScalar(Math.max(0.2, rad * p));
      (telegraphDisc.material as THREE.MeshBasicMaterial).opacity = (0.18 + p * 0.28) * pulse;

      telegraphRing.visible = true;
      telegraphRing.position.set(tx, 0.028, tz);
      telegraphRing.scale.setScalar(rad);
      (telegraphRing.material as THREE.MeshBasicMaterial).opacity = (0.52 + p * 0.42) * pulse;
    } else if (kind === 'charge') {
      const chargeLen = Math.max(3.5, Math.min(8.5, Math.hypot(targetX - bossX, targetZ - bossZ)));
      const laneYaw = Math.atan2(targetX - bossX, targetZ - bossZ);
      telegraphLane.visible = true;
      telegraphLane.position.set(bossX, 0.026, bossZ);
      telegraphLane.rotation.set(0, laneYaw, 0);
      telegraphLane.scale.set(1, 1, chargeLen * (0.35 + 0.65 * p));
      (telegraphLane.material as THREE.MeshBasicMaterial).opacity = (0.28 + p * 0.42) * pulse;
    } else {
      // Punch / Swipe frontal danger sector
      const reach = kind === 'punch' ? 3.2 : 3.65;
      telegraphCone.visible = true;
      telegraphCone.position.set(bossX, 0.026, bossZ);
      // CircleGeometry was rotated around X -> +Z aligns at rotation.y = bossYaw - PI/2
      telegraphCone.rotation.set(0, bossYaw, 0);
      telegraphCone.scale.setScalar(reach * (0.45 + 0.55 * p));
      (telegraphCone.material as THREE.MeshBasicMaterial).opacity = (0.26 + p * 0.38) * pulse;
    }
  };

  const updateDecor = (
    time: number,
    enraged: boolean,
    pillars: PillarState[],
    drumPulse: number
  ) => {
    for (let i = 0; i < brazierLights.length; i++) {
      const flicker = Math.sin(time * 9.5 + i * 2.1) * 3.0 + Math.cos(time * 15 + i) * 1.6;
      brazierLights[i].intensity = (enraged ? 24 : 18) + flicker + drumPulse * 8;
      brazierLights[i].color.setHex(enraged ? 0xff4520 : 0xff8424);
    }

    pillarEmberMat.opacity = 0.55 + Math.sin(time * 4.5) * 0.25 + drumPulse * 0.2;

    for (const p of pillars) {
      const pair = pillarGroups.get(p.id);
      if (pair) {
        pair.intact.visible = p.intact;
        pair.rubble.visible = !p.intact;
      }
    }

    const posAttr = emberGeo.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < emberCount; i++) {
      arr[i * 3 + 1] += (0.012 + (i % 5) * 0.003) * (enraged ? 1.8 : 1.0);
      arr[i * 3 + 0] += Math.sin(time * 1.6 + i) * 0.005;
      if (arr[i * 3 + 1] > 4.6) {
        arr[i * 3 + 1] = 0.12;
      }
    }
    posAttr.needsUpdate = true;
    emberPointsMat.color.setHex(enraged ? 0xff4538 : 0xff9f40);
  };

  const dispose = () => {
    stoneTex.dispose();
    shadowTex.dispose();
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
        else m.material?.dispose();
      }
    });
    scene.remove(root);
  };

  return {
    root,
    brazierLights,
    pillarGroups,
    telegraphDisc,
    telegraphRing,
    telegraphCone,
    telegraphLane,
    shockwaveMeshes,
    rudraShadow,
    bossShadow,
    emberParticles,
    updateTelegraph,
    updateDecor,
    dispose,
  };
}

