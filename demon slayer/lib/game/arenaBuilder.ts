import * as THREE from 'three';
import { ARENA_BOUND, type DundubhiAttackKind, type PillarState } from './rules';
import { attachSumiInkOutlines, createDemonSlayerCelMaterial } from './demonSlayerShader';
import { KALIYUGA_TELEGRAPH_URLS, getSharedVfxTexture } from './vfxFlipbook';

export interface ArenaSceneHandles {
  root: THREE.Group;
  brazierLights: THREE.PointLight[];
  pillarGroups: Map<number, { intact: THREE.Group; rubble: THREE.Group }>;
  telegraphDisc: THREE.Mesh;
  telegraphRoarDisc: THREE.Mesh;
  telegraphRing: THREE.Mesh;
  telegraphCone: THREE.Mesh;
  telegraphLane: THREE.Mesh;
  shockwaveMeshes: THREE.Mesh[];
  shockWallMeshes: THREE.Mesh[];
  rudraShadow: THREE.Mesh;
  bossShadow: THREE.Mesh;
  rudraLightPool: THREE.Mesh;
  bossLightPool: THREE.Mesh;
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
  updateLightPools: (
    rudraX: number,
    rudraZ: number,
    rudraIntensity: number,
    rudraColorHex: number,
    bossX: number,
    bossZ: number,
    bossIntensity: number,
    bossColorHex: number
  ) => void;
  dispose: () => void;
}

function createCholaStoneTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#5a5450';
  ctx.fillRect(0, 0, size, size);

  // Weathered Chola sandstone/granite strata matching dundubhi_chamber.mp4 courtyard pillars
  for (let y = 0; y < size; y += 32) {
    const shade = 78 + ((y * 17) % 16);
    ctx.fillStyle = `rgba(${shade + 5}, ${shade + 1}, ${shade - 2}, 0.52)`;
    ctx.fillRect(0, y, size, 28);
    ctx.fillStyle = '#2d2825';
    ctx.fillRect(0, y + 28, size, 4);
  }

  // Etched muted antique bronze Yantra frieze bands
  ctx.strokeStyle = '#997343';
  ctx.lineWidth = 3.5;
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

  // Subtle damp moss & ash weathering along base
  const grad = ctx.createLinearGradient(0, size * 0.65, 0, size);
  grad.addColorStop(0, 'rgba(30, 32, 28, 0)');
  grad.addColorStop(1, 'rgba(18, 20, 17, 0.72)');
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
  emberMat: THREE.Material,
  shadowMat: THREE.Material
): { intact: THREE.Group; rubble: THREE.Group } {
  const intact = new THREE.Group();

  const shadowDisc = new THREE.Mesh(new THREE.PlaneGeometry(2.85, 2.85), shadowMat);
  shadowDisc.rotation.x = -Math.PI * 0.5;
  shadowDisc.position.y = 0.011;
  shadowDisc.renderOrder = 2;

  // Stepped octagonal temple plinth flush at y = 0
  const plinthLower = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.96, 0.24, 8), stoneMat);
  plinthLower.position.y = 0.12;
  plinthLower.castShadow = true;
  plinthLower.receiveShadow = true;

  const plinthUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.78, 0.18, 8), bronzeMat);
  plinthUpper.position.y = 0.33;
  plinthUpper.castShadow = true;

  // Carved octagonal dark stone shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.56, 2.05, 8), stoneMat);
  shaft.position.y = 1.44;
  shaft.castShadow = true;
  shaft.receiveShadow = true;

  // Glowing bull-horn fissure band
  const runeRing = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.14, 8), emberMat);
  runeRing.position.y = 1.45;

  // Flat Chola mandapa stepped capital (matches hand-inked courtyard masonry)
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.52, 0.24, 8), bronzeMat);
  collar.position.y = 2.56;
  collar.castShadow = true;

  const abacus = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.22, 1.18), stoneMat);
  abacus.position.y = 2.79;
  abacus.rotation.y = Math.PI * 0.25;
  abacus.castShadow = true;

  intact.add(plinthLower, plinthUpper, shaft, runeRing, collar, abacus);
  attachSumiInkOutlines(intact, 0.005, 0x070408);
  intact.add(shadowDisc);

  // Crumbled stone stump & scattered shards when shattered by Bellhorn's charge/slam
  const rubble = new THREE.Group();
  const rubbleShadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), shadowMat);
  rubbleShadow.rotation.x = -Math.PI * 0.5;
  rubbleShadow.position.y = 0.011;
  rubbleShadow.renderOrder = 2;

  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.92, 0.32, 8), stoneMat);
  stump.position.y = 0.16;
  stump.receiveShadow = true;
  rubble.add(stump);

  const offsets: Array<[number, number, number, number]> = [
    [-0.55, 0.14, 0.42, 0.32],
    [0.6, 0.12, -0.32, 0.26],
    [0.18, 0.13, 0.62, 0.29],
    [-0.45, 0.11, -0.5, 0.24],
  ];
  for (const [ox, oy, oz, r] of offsets) {
    const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), stoneMat);
    chunk.position.set(ox, oy, oz);
    chunk.rotation.set(ox * 2, oy * 3, oz * 2);
    chunk.scale.y = 0.55;
    chunk.castShadow = true;
    rubble.add(chunk);
  }
  attachSumiInkOutlines(rubble, 0.005, 0x070408);
  rubble.add(rubbleShadow);
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

  const shadowTex = createContactShadowTexture();

  // Materials for destructible pillars matched to the weathered Chola stone & muted bronze drums
  const pillarStoneMat = createDemonSlayerCelMaterial({
    map: stoneTex,
    tintHex: 0x928983,
    emissiveHex: 0x161210,
    emissiveIntensity: 0.18,
  });
  const pillarBronzeMat = createDemonSlayerCelMaterial({
    map: null,
    tintHex: 0x7d613b,
    emissiveHex: 0x1f1409,
    emissiveIntensity: 0.18,
  });
  const pillarEmberMat = new THREE.MeshBasicMaterial({
    color: 0xd96b27,
    transparent: true,
    opacity: 0.78,
  });
  const pillarShadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });

  // Destructible Kurukshetra/Chola Pillars
  const pillarGroups = new Map<number, { intact: THREE.Group; rubble: THREE.Group }>();
  for (const p of initialPillars) {
    const pair = buildDestructibleCholaPillar(
      pillarStoneMat,
      pillarBronzeMat,
      pillarEmberMat,
      pillarShadowMat
    );
    pair.intact.position.set(p.x, 0, p.z);
    pair.rubble.position.set(p.x, 0, p.z);
    pair.intact.scale.setScalar(0.86);
    pair.rubble.scale.setScalar(0.86);
    root.add(pair.intact, pair.rubble);
    pillarGroups.set(p.id, pair);
  }

  // Radial contact shadow discs directly beneath Rudra & Dundubhi
  const rudraShadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const rudraShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 1.28), rudraShadowMat);
  rudraShadow.rotation.x = -Math.PI * 0.5;
  rudraShadow.position.y = 0.012;
  rudraShadow.renderOrder = 2;

  const bossShadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.84,
    depthWrite: false,
  });
  const bossShadow = new THREE.Mesh(new THREE.PlaneGeometry(2.14, 2.14), bossShadowMat);
  bossShadow.rotation.x = -Math.PI * 0.5;
  bossShadow.position.y = 0.013;
  bossShadow.renderOrder = 2;

  // Dynamic elemental light-pool glow discs illuminating courtyard stone beneath strikes & cyclones
  const createLightPoolTex = () => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    g.addColorStop(0.35, 'rgba(255, 255, 255, 0.52)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
  const lightPoolTex = createLightPoolTex();

  const rudraLightPool = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 3.6),
    new THREE.MeshBasicMaterial({
      map: lightPoolTex,
      color: 0xff7b1a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  rudraLightPool.rotation.x = -Math.PI * 0.5;
  rudraLightPool.position.y = 0.018;
  rudraLightPool.visible = false;
  rudraLightPool.renderOrder = 3;

  const bossLightPool = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 4.8),
    new THREE.MeshBasicMaterial({
      map: lightPoolTex,
      color: 0xff3024,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  bossLightPool.rotation.x = -Math.PI * 0.5;
  bossLightPool.position.y = 0.019;
  bossLightPool.visible = false;
  bossLightPool.renderOrder = 3;

  root.add(rudraShadow, bossShadow, rudraLightPool, bossLightPool);

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
    const light = new THREE.PointLight(0xff8433, 10, 11, 1.5);
    light.position.set(cx, 2.1, cz);
    root.add(light);
    brazierLights.push(light);
  }

  // Hand-painted Demon Slayer / Vedic telegraph PNGs (no procedural Canvas2D shapes)
  const slamTex = getSharedVfxTexture(KALIYUGA_TELEGRAPH_URLS.slam);
  const roarTex = getSharedVfxTexture(KALIYUGA_TELEGRAPH_URLS.roar);
  const coneTex = getSharedVfxTexture(KALIYUGA_TELEGRAPH_URLS.cone);
  const chargeTex = getSharedVfxTexture(KALIYUGA_TELEGRAPH_URLS.charge);

  // Slam Yantra disc (diameter 2 so scale == radius)
  const slamGeo = new THREE.PlaneGeometry(2, 2);
  slamGeo.rotateX(-Math.PI * 0.5);
  const telegraphDisc = new THREE.Mesh(
    slamGeo,
    new THREE.MeshBasicMaterial({
      map: slamTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })
  );
  telegraphDisc.position.y = 0.025;
  telegraphDisc.visible = false;
  telegraphDisc.renderOrder = 4;

  // Roar Asura Skull & Lotus curse disc (diameter 2 so scale == radius)
  const roarGeo = new THREE.PlaneGeometry(2, 2);
  roarGeo.rotateX(-Math.PI * 0.5);
  const telegraphRoarDisc = new THREE.Mesh(
    roarGeo,
    new THREE.MeshBasicMaterial({
      map: roarTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })
  );
  telegraphRoarDisc.position.y = 0.026;
  telegraphRoarDisc.visible = false;
  telegraphRoarDisc.renderOrder = 4;

  const telegraphRing = new THREE.Mesh(
    new THREE.RingGeometry(0.94, 1.0, 44),
    new THREE.MeshBasicMaterial({
      color: 0xff4d5a,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  telegraphRing.rotation.x = -Math.PI * 0.5;
  telegraphRing.position.y = 0.029;
  telegraphRing.visible = false;
  telegraphRing.renderOrder = 5;

  // Frontal 130° cone PNG: apex at top (v=1) -> z=0 after rotateX(-PI/2) + translate(0,0,0.5)
  const coneGeo = new THREE.PlaneGeometry(1, 1);
  coneGeo.rotateX(-Math.PI * 0.5);
  coneGeo.translate(0, 0, 0.5);
  const telegraphCone = new THREE.Mesh(
    coneGeo,
    new THREE.MeshBasicMaterial({
      map: coneTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })
  );
  telegraphCone.position.y = 0.026;
  telegraphCone.visible = false;
  telegraphCone.renderOrder = 4;

  // Bull-charge chevron PNG: arrowhead at top (v=1) -> rotateX(-PI/2) + rotateY(PI) + translate(0,0,0.5) points +Z
  const laneGeo = new THREE.PlaneGeometry(1, 1);
  laneGeo.rotateX(-Math.PI * 0.5);
  laneGeo.rotateY(Math.PI);
  laneGeo.translate(0, 0, 0.5);
  const telegraphLane = new THREE.Mesh(
    laneGeo,
    new THREE.MeshBasicMaterial({
      map: chargeTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })
  );
  telegraphLane.position.y = 0.026;
  telegraphLane.visible = false;
  telegraphLane.renderOrder = 4;

  root.add(telegraphDisc, telegraphRoarDisc, telegraphRing, telegraphCone, telegraphLane);

  // Crisp flat ground shockwave accent rings (hand-drawn shockwave_4x2 flipbooks do main burst)
  const shockwaveMeshes: THREE.Mesh[] = [];
  const shockWallMeshes: THREE.Mesh[] = [];
  const swGeo = new THREE.RingGeometry(0.9, 1.0, 40);

  for (let i = 0; i < 4; i++) {
    const sw = new THREE.Mesh(
      swGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff5a28,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    sw.rotation.x = -Math.PI * 0.5;
    sw.position.y = 0.036;
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
    telegraphRoarDisc.visible = false;
    telegraphRing.visible = false;
    telegraphCone.visible = false;
    telegraphLane.visible = false;

    if (!active) return;

    const pulse = 0.88 + Math.sin(time * 22) * 0.12;
    const p = Math.max(0, Math.min(1, progress));

    if (kind === 'slam') {
      const rad = 3.55;
      telegraphDisc.visible = true;
      telegraphDisc.position.set(targetX, 0.025, targetZ);
      telegraphDisc.rotation.y = time * 1.4;
      telegraphDisc.scale.setScalar(Math.max(0.45, rad * (0.35 + 0.65 * p)));
      (telegraphDisc.material as THREE.MeshBasicMaterial).opacity = (0.58 + p * 0.36) * pulse;

      telegraphRing.visible = true;
      telegraphRing.position.set(targetX, 0.029, targetZ);
      telegraphRing.scale.setScalar(rad);
      const rMat = telegraphRing.material as THREE.MeshBasicMaterial;
      rMat.color.setHex(0xff5238);
      rMat.opacity = (0.48 + p * 0.42) * pulse;
    } else if (kind === 'roar') {
      const rad = 5.4;
      telegraphRoarDisc.visible = true;
      telegraphRoarDisc.position.set(bossX, 0.026, bossZ);
      telegraphRoarDisc.rotation.y = -time * 1.25;
      telegraphRoarDisc.scale.setScalar(Math.max(0.55, rad * (0.35 + 0.65 * p)));
      (telegraphRoarDisc.material as THREE.MeshBasicMaterial).opacity = (0.62 + p * 0.34) * pulse;

      telegraphRing.visible = true;
      telegraphRing.position.set(bossX, 0.029, bossZ);
      telegraphRing.scale.setScalar(rad);
      const rMat = telegraphRing.material as THREE.MeshBasicMaterial;
      rMat.color.setHex(0xff2858);
      rMat.opacity = (0.52 + p * 0.42) * pulse;
    } else if (kind === 'charge') {
      const chargeLen = Math.max(3.5, Math.min(8.5, Math.hypot(targetX - bossX, targetZ - bossZ)));
      const laneYaw = Math.atan2(targetX - bossX, targetZ - bossZ);
      telegraphLane.visible = true;
      telegraphLane.position.set(bossX, 0.026, bossZ);
      telegraphLane.rotation.set(0, laneYaw, 0);
      telegraphLane.scale.set(2.8, 1, chargeLen * (0.38 + 0.62 * p));
      (telegraphLane.material as THREE.MeshBasicMaterial).opacity = (0.62 + p * 0.34) * pulse;
    } else {
      // Punch / Swipe frontal fissure cone
      const reach = kind === 'punch' ? 3.2 : 3.65;
      const fill = 0.5 + 0.5 * p;
      telegraphCone.visible = true;
      telegraphCone.position.set(bossX, 0.026, bossZ);
      telegraphCone.rotation.set(0, bossYaw, 0);
      telegraphCone.scale.set(reach * 1.98 * fill, 1, reach * 1.24 * fill);
      (telegraphCone.material as THREE.MeshBasicMaterial).opacity = (0.64 + p * 0.32) * pulse;
    }
  };

  const updateDecor = (
    time: number,
    enraged: boolean,
    pillars: PillarState[],
    drumPulse: number
  ) => {
    for (let i = 0; i < brazierLights.length; i++) {
      const flicker = Math.sin(time * 9.5 + i * 2.1) * 1.8 + Math.cos(time * 15 + i) * 1.0;
      brazierLights[i].intensity = (enraged ? 14 : 10) + flicker + drumPulse * 5;
      brazierLights[i].color.setHex(enraged ? 0xff4c24 : 0xff8838);
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

  const updateLightPools = (
    rudraX: number,
    rudraZ: number,
    rudraIntensity: number,
    rudraColorHex: number,
    bossX: number,
    bossZ: number,
    bossIntensity: number,
    bossColorHex: number
  ) => {
    if (rudraIntensity > 0.02) {
      rudraLightPool.visible = true;
      rudraLightPool.position.set(rudraX, 0.018, rudraZ);
      rudraLightPool.scale.setScalar(0.85 + rudraIntensity * 0.55);
      const rm = rudraLightPool.material as THREE.MeshBasicMaterial;
      rm.color.setHex(rudraColorHex);
      rm.opacity = Math.min(0.68, rudraIntensity * 0.58);
    } else {
      rudraLightPool.visible = false;
    }

    if (bossIntensity > 0.02) {
      bossLightPool.visible = true;
      bossLightPool.position.set(bossX, 0.019, bossZ);
      bossLightPool.scale.setScalar(0.9 + bossIntensity * 0.45);
      const bm = bossLightPool.material as THREE.MeshBasicMaterial;
      bm.color.setHex(bossColorHex);
      bm.opacity = Math.min(0.62, bossIntensity * 0.5);
    } else {
      bossLightPool.visible = false;
    }
  };

  const dispose = () => {
    stoneTex.dispose();
    shadowTex.dispose();
    lightPoolTex.dispose();
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
    telegraphRoarDisc,
    telegraphRing,
    telegraphCone,
    telegraphLane,
    shockwaveMeshes,
    shockWallMeshes,
    rudraShadow,
    bossShadow,
    rudraLightPool,
    bossLightPool,
    emberParticles,
    updateTelegraph,
    updateDecor,
    updateLightPools,
    dispose,
  };
}

