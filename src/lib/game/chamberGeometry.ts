// Hades-Style Isometric Chamber Collision Boundaries, Asset-Driven Exit Gates, Reward Orbs, Floor Traps & Foreground Parallax
import { GAME_ASSETS } from './assets';
import { getProcessedSpriteSync } from './spriteProcessor';

export interface NormPoint {
  x: number;
  y: number;
}

export interface ChamberTrapSpec {
  id: string;
  kind: 'agni_vent' | 'chakram_slicer';
  x: number;
  y: number;
  radius: number;
}

export interface ChamberTrapRuntime {
  id: string;
  kind: 'agni_vent' | 'chakram_slicer';
  x: number;
  y: number;
  radius: number;
  state: 'idle' | 'priming' | 'erupting' | 'cooldown';
  timer: number;
}

export interface ChamberGeometrySpec {
  outerPolygon: NormPoint[];
  chasmIslands: NormPoint[][];
  leftGate: { x: number; y: number; angle: number };
  rightGate: { x: number; y: number; angle: number };
  traps: ChamberTrapSpec[];
}

// Calibrated expansive walkable stone platform polygons matching the 8 hand-painted 16:9 isometric arenas
const CHAMBER_GEOMETRIES: ChamberGeometrySpec[] = [
  // Chamber 1: Vaitarani River Ghat (Expansive Diamond Stone Platform)
  {
    outerPolygon: [
      { x: 0.50, y: 0.13 },
      { x: 0.89, y: 0.45 },
      { x: 0.85, y: 0.68 },
      { x: 0.50, y: 0.89 },
      { x: 0.15, y: 0.68 },
      { x: 0.11, y: 0.45 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.29, y: 0.21, angle: -0.52 },
    rightGate: { x: 0.71, y: 0.21, angle: 0.52 },
    traps: [
      { id: 'c1_t1', kind: 'agni_vent', x: 0.40, y: 0.52, radius: 58 },
      { id: 'c1_t2', kind: 'chakram_slicer', x: 0.60, y: 0.52, radius: 58 },
      { id: 'c1_t3', kind: 'agni_vent', x: 0.50, y: 0.38, radius: 56 },
    ],
  },
  // Chamber 2: Raktabija Blood-Kunda Courtyard (Wide Octagonal Courtyard)
  {
    outerPolygon: [
      { x: 0.30, y: 0.14 },
      { x: 0.70, y: 0.14 },
      { x: 0.89, y: 0.36 },
      { x: 0.89, y: 0.72 },
      { x: 0.70, y: 0.89 },
      { x: 0.30, y: 0.89 },
      { x: 0.11, y: 0.72 },
      { x: 0.11, y: 0.36 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.30, y: 0.20, angle: -0.45 },
    rightGate: { x: 0.70, y: 0.20, angle: 0.45 },
    traps: [
      { id: 'c2_t1', kind: 'chakram_slicer', x: 0.38, y: 0.54, radius: 58 },
      { id: 'c2_t2', kind: 'agni_vent', x: 0.62, y: 0.54, radius: 58 },
      { id: 'c2_t3', kind: 'chakram_slicer', x: 0.50, y: 0.40, radius: 58 },
    ],
  },
  // Chamber 3: Kurukshetra Chariot Bonefield
  {
    outerPolygon: [
      { x: 0.28, y: 0.15 },
      { x: 0.72, y: 0.15 },
      { x: 0.89, y: 0.42 },
      { x: 0.86, y: 0.78 },
      { x: 0.68, y: 0.89 },
      { x: 0.32, y: 0.89 },
      { x: 0.14, y: 0.78 },
      { x: 0.11, y: 0.42 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.31, y: 0.20, angle: -0.42 },
    rightGate: { x: 0.69, y: 0.20, angle: 0.42 },
    traps: [
      { id: 'c3_t1', kind: 'agni_vent', x: 0.42, y: 0.48, radius: 58 },
      { id: 'c3_t2', kind: 'chakram_slicer', x: 0.60, y: 0.60, radius: 58 },
      { id: 'c3_t3', kind: 'agni_vent', x: 0.52, y: 0.34, radius: 58 },
    ],
  },
  // Chamber 4: Mandapa of the War-Drum (3D Dundubhi Mid-Boss)
  {
    outerPolygon: [
      { x: 0.24, y: 0.15 },
      { x: 0.76, y: 0.15 },
      { x: 0.90, y: 0.45 },
      { x: 0.86, y: 0.80 },
      { x: 0.70, y: 0.89 },
      { x: 0.30, y: 0.89 },
      { x: 0.14, y: 0.80 },
      { x: 0.10, y: 0.45 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.32, y: 0.19, angle: -0.38 },
    rightGate: { x: 0.68, y: 0.19, angle: 0.38 },
    traps: [
      { id: 'c4_t1', kind: 'agni_vent', x: 0.50, y: 0.44, radius: 60 },
      { id: 'c4_t2', kind: 'chakram_slicer', x: 0.50, y: 0.68, radius: 60 },
    ],
  },
  // Chamber 5: Bhairava Soul-Fire Sanctum
  {
    outerPolygon: [
      { x: 0.28, y: 0.15 },
      { x: 0.72, y: 0.15 },
      { x: 0.89, y: 0.42 },
      { x: 0.86, y: 0.78 },
      { x: 0.68, y: 0.89 },
      { x: 0.32, y: 0.89 },
      { x: 0.14, y: 0.78 },
      { x: 0.11, y: 0.42 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.32, y: 0.20, angle: -0.44 },
    rightGate: { x: 0.68, y: 0.20, angle: 0.44 },
    traps: [
      { id: 'c5_t1', kind: 'chakram_slicer', x: 0.40, y: 0.52, radius: 58 },
      { id: 'c5_t2', kind: 'agni_vent', x: 0.60, y: 0.52, radius: 58 },
    ],
  },
  // Chamber 6: Shattered Gopuram Causeway
  {
    outerPolygon: [
      { x: 0.28, y: 0.15 },
      { x: 0.72, y: 0.15 },
      { x: 0.89, y: 0.44 },
      { x: 0.86, y: 0.78 },
      { x: 0.68, y: 0.89 },
      { x: 0.32, y: 0.89 },
      { x: 0.14, y: 0.78 },
      { x: 0.11, y: 0.44 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.31, y: 0.20, angle: -0.45 },
    rightGate: { x: 0.69, y: 0.20, angle: 0.45 },
    traps: [
      { id: 'c6_t1', kind: 'agni_vent', x: 0.36, y: 0.48, radius: 58 },
      { id: 'c6_t2', kind: 'chakram_slicer', x: 0.50, y: 0.58, radius: 58 },
      { id: 'c6_t3', kind: 'agni_vent', x: 0.64, y: 0.48, radius: 58 },
    ],
  },
  // Chamber 7: Sealed Gate of Jatharagni (Asura Lava Sanctum Locked -> Unlocked)
  {
    outerPolygon: [
      { x: 0.28, y: 0.18 },
      { x: 0.72, y: 0.18 },
      { x: 0.88, y: 0.46 },
      { x: 0.84, y: 0.80 },
      { x: 0.66, y: 0.89 },
      { x: 0.34, y: 0.89 },
      { x: 0.16, y: 0.80 },
      { x: 0.12, y: 0.46 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.42, y: 0.22, angle: 0 },
    rightGate: { x: 0.58, y: 0.22, angle: 0 },
    traps: [
      { id: 'c7_t1', kind: 'chakram_slicer', x: 0.42, y: 0.56, radius: 58 },
      { id: 'c7_t2', kind: 'agni_vent', x: 0.58, y: 0.56, radius: 58 },
    ],
  },
  // Chamber 8: Sanctum of the Infernal Maw (Final 3D Boss Vrikodara: Circular Naga / Eclipse Platform)
  {
    outerPolygon: [
      { x: 0.50, y: 0.15 },
      { x: 0.78, y: 0.23 },
      { x: 0.90, y: 0.48 },
      { x: 0.82, y: 0.78 },
      { x: 0.50, y: 0.89 },
      { x: 0.18, y: 0.78 },
      { x: 0.10, y: 0.48 },
      { x: 0.22, y: 0.23 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.34, y: 0.20, angle: -0.4 },
    rightGate: { x: 0.66, y: 0.20, angle: 0.4 },
    traps: [
      { id: 'c8_t1', kind: 'agni_vent', x: 0.36, y: 0.52, radius: 58 },
      { id: 'c8_t2', kind: 'chakram_slicer', x: 0.64, y: 0.52, radius: 58 },
    ],
  },
];

export function getChamberGeometry(chamberIndex: number): ChamberGeometrySpec {
  const idx = Math.max(0, Math.min(CHAMBER_GEOMETRIES.length - 1, chamberIndex));
  return CHAMBER_GEOMETRIES[idx];
}

export function createChamberTrapsRuntime(
  chamberIndex: number,
  worldW: number,
  worldH: number
): ChamberTrapRuntime[] {
  const geom = getChamberGeometry(chamberIndex);
  return geom.traps.map((t) => ({
    id: t.id,
    kind: t.kind,
    x: t.x * worldW,
    y: t.y * worldH,
    radius: Math.round(t.radius * 1.18),
    state: 'idle',
    timer: 0,
  }));
}

function isPointInPolygon(px: number, py: number, poly: NormPoint[], w: number, h: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x * w;
    const yi = poly[i].y * h;
    const xj = poly[j].x * w;
    const yj = poly[j].y * h;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 0.00001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function closestPointOnPolygon(
  px: number,
  py: number,
  poly: NormPoint[],
  w: number,
  h: number
): { x: number; y: number; nx: number; ny: number } {
  let bestX = px;
  let bestY = py;
  let bestDistSq = Infinity;
  let bestNx = 0;
  let bestNy = -1;

  const cx = w * 0.5;
  const cy = h * 0.52;

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ax = a.x * w;
    const ay = a.y * h;
    const bx = b.x * w;
    const by = b.y * h;
    const abx = bx - ax;
    const aby = by - ay;
    const abLenSq = abx * abx + aby * aby || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / abLenSq));
    const qx = ax + abx * t;
    const qy = ay + aby * t;
    const dx = px - qx;
    const dy = py - qy;
    const dSq = dx * dx + dy * dy;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestX = qx;
      bestY = qy;
      const toCenterLen = Math.hypot(cx - qx, cy - qy) || 1;
      bestNx = (cx - qx) / toCenterLen;
      bestNy = (cy - qy) / toCenterLen;
    }
  }
  return { x: bestX, y: bestY, nx: bestNx, ny: bestNy };
}

export function constrainActorToChamber(
  nextX: number,
  nextY: number,
  vx: number,
  vy: number,
  worldW: number,
  worldH: number,
  chamberIndex: number,
  _isDodging: boolean,
  _isBoss: boolean,
  marginPx: number = 12
): {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hitOuterWall: boolean;
  hitChasmEdge: boolean;
  vaultedChasm: boolean;
  normalX: number;
  normalY: number;
} {
  const geom = getChamberGeometry(chamberIndex);
  const insideOuter = isPointInPolygon(nextX, nextY, geom.outerPolygon, worldW, worldH);

  if (!insideOuter) {
    const closest = closestPointOnPolygon(nextX, nextY, geom.outerPolygon, worldW, worldH);
    const clampedX = closest.x + closest.nx * marginPx;
    const clampedY = closest.y + closest.ny * marginPx;
    const dot = vx * closest.nx + vy * closest.ny;
    const outVx = dot < 0 ? vx - closest.nx * dot : vx;
    const outVy = dot < 0 ? vy - closest.ny * dot : vy;
    return {
      x: clampedX,
      y: clampedY,
      vx: outVx,
      vy: outVy,
      hitOuterWall: true,
      hitChasmEdge: false,
      vaultedChasm: false,
      normalX: closest.nx,
      normalY: closest.ny,
    };
  }

  return {
    x: nextX,
    y: nextY,
    vx,
    vy,
    hitOuterWall: false,
    hitChasmEdge: false,
    vaultedChasm: false,
    normalX: 0,
    normalY: -1,
  };
}

// Deep Obsidian Underworld Backdrop (Seamless Hades-style void behind chamber bounds)
export function renderParallaxAbyss(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  _camX: number,
  _camY: number,
  _now: number,
  chamberIndex: number
) {
  ctx.save();
  const abyssGrad = ctx.createLinearGradient(0, 0, 0, ch);
  if (chamberIndex >= 6) {
    abyssGrad.addColorStop(0, '#090306');
    abyssGrad.addColorStop(0.55, '#120407');
    abyssGrad.addColorStop(1, '#1c0605');
  } else {
    abyssGrad.addColorStop(0, '#050407');
    abyssGrad.addColorStop(0.55, '#0b0608');
    abyssGrad.addColorStop(1, '#140807');
  }
  ctx.fillStyle = abyssGrad;
  ctx.fillRect(0, 0, cw, ch);
  ctx.restore();
}

// Render Seamless Vast 2.5D Hand-Painted Isometric Sanctuary + Surface Craters + Exit Gates
export function renderIsometricChamberPlatform(
  ctx: CanvasRenderingContext2D,
  worldW: number,
  worldH: number,
  bgImg: HTMLImageElement | undefined,
  floorTint: string,
  chamberIndex: number,
  now: number,
  isChamberCleared: boolean,
  isNextChamberBoss: boolean,
  renderSurfaceDetailsCallback: () => void
) {
  ctx.save();

  const geom = getChamberGeometry(chamberIndex);

  // 1. Full Bleed Hand-Painted 16:9 Isometric Chamber Artwork (Zero polygon clipping, zero yellow grid lines, zero artificial borders)
  if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
    ctx.drawImage(bgImg, 0, 0, worldW, worldH);
  } else {
    ctx.fillStyle = '#0e090a';
    ctx.fillRect(0, 0, worldW, worldH);
  }

  if (floorTint) {
    ctx.fillStyle = floorTint;
    ctx.fillRect(0, 0, worldW, worldH);
  }

  // 2. Surface decals, craters, and ambient brazier floor pools
  renderSurfaceDetailsCallback();

  // ============================================================================
  // 4. MONUMENTAL ISOMETRIC EXIT GATE ARCHWAYS & FLOATING HADES REWARD ORBS
  // ============================================================================
  const gatesAsset = getProcessedSpriteSync(GAME_ASSETS.exitGateArchways2x1);
  const gateOverlaysAsset = getProcessedSpriteSync(GAME_ASSETS.gateOverlays2x2);
  const rewardOrbsAsset = getProcessedSpriteSync(GAME_ASSETS.rewardOrbs2x2);

  if (chamberIndex < 7) {
    const gates = [
      {
        pos: geom.leftGate,
        orbFrame: isNextChamberBoss ? 3 : 0,
        label: isNextChamberBoss ? 'SOVEREIGN BOSS' : 'DEVA BOON',
        accent: isNextChamberBoss ? '#ff384c' : '#ffd86b',
      },
      {
        pos: geom.rightGate,
        orbFrame: isNextChamberBoss ? 2 : 1,
        label: isNextChamberBoss ? 'SHRINE + HP' : 'AMRITA +30 HP',
        accent: isNextChamberBoss ? '#38e8ff' : '#3ee0a8',
      },
    ];

    gates.forEach((g) => {
      const gx = g.pos.x * worldW;
      const gy = g.pos.y * worldH;

      // Ground portal rune glow under each exit gate
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.translate(gx, gy + 8);
      ctx.scale(1, 0.52);
      const gatePool = ctx.createRadialGradient(0, 0, 10, 0, 0, isChamberCleared ? 145 : 95);
      gatePool.addColorStop(0, isChamberCleared ? g.accent + '88' : g.accent + '33');
      gatePool.addColorStop(0.55, isChamberCleared ? g.accent + '33' : 'rgba(0,0,0,0)');
      gatePool.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gatePool;
      ctx.beginPath();
      ctx.arc(0, 0, isChamberCleared ? 145 : 95, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (chamberIndex !== 6 && gatesAsset && gatesAsset.frames.length >= 2) {
        const frameIdx = isChamberCleared ? 1 : 0;
        const f = gatesAsset.frames[frameIdx] || gatesAsset.frames[0];
        const gateH = 215;
        const gateW = (f.sw / Math.max(1, f.sh)) * gateH;
        ctx.save();
        ctx.translate(gx, gy);
        ctx.drawImage(
          gatesAsset.cleanCanvas,
          f.sx,
          f.sy,
          f.sw,
          f.sh,
          -gateW * 0.5,
          -gateH * 0.78,
          gateW,
          gateH
        );
        ctx.restore();
      } else if (gateOverlaysAsset && gateOverlaysAsset.frames.length >= 2) {
        const overlayIdx = isChamberCleared ? 1 : 0;
        const f = gateOverlaysAsset.frames[overlayIdx] || gateOverlaysAsset.frames[0];
        const ovSize = 148;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.translate(gx, gy - 42);
        ctx.drawImage(
          gateOverlaysAsset.cleanCanvas,
          f.sx,
          f.sy,
          f.sw,
          f.sh,
          -ovSize * 0.5,
          -ovSize * 0.5,
          ovSize,
          ovSize
        );
        ctx.restore();
      }

      if (rewardOrbsAsset && rewardOrbsAsset.frames.length > 0) {
        const orbIdx = Math.min(rewardOrbsAsset.frames.length - 1, g.orbFrame);
        const of = rewardOrbsAsset.frames[orbIdx];
        const bobY = Math.sin(now * 0.004 + g.orbFrame * 1.7) * 8;
        const orbSize = isChamberCleared ? 78 : 56;

        ctx.save();
        ctx.translate(gx, gy - 98 + bobY);
        ctx.globalAlpha = isChamberCleared ? 1.0 : 0.78;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const oGlow = ctx.createRadialGradient(0, 0, 4, 0, 0, orbSize * 0.95);
        oGlow.addColorStop(0, g.accent + 'aa');
        oGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = oGlow;
        ctx.beginPath();
        ctx.arc(0, 0, orbSize * 0.95, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.drawImage(
          rewardOrbsAsset.cleanCanvas,
          of.sx,
          of.sy,
          of.sw,
          of.sh,
          -orbSize * 0.5,
          -orbSize * 0.5,
          orbSize,
          orbSize
        );

        if (isChamberCleared) {
          ctx.font = "bold 13px 'Cinzel', Georgia, serif";
          ctx.textAlign = 'center';
          ctx.strokeStyle = 'rgba(0,0,0,0.94)';
          ctx.lineWidth = 3.5;
          ctx.strokeText(g.label, 0, orbSize * 0.56 + 12);
          ctx.fillStyle = g.accent;
          ctx.fillText(g.label, 0, orbSize * 0.56 + 12);
        }
        ctx.restore();
      }
    });
  }

  ctx.restore();
}

// 100% Asset-Driven 4-Stage Isometric Floor Traps (zhy8c6zhy8c6zhy8_5d2df495.png 2x2 Sheet)
// Top-Left (0): Dormant Stone Plate | Top-Right (1): Priming Molten Plate
// Bottom-Left (2): Erupted Bloodied Iron Spikes | Bottom-Right (3): Roaring Agni Lotus Fire Plume
export function updateAndRenderPressureTraps(
  ctx: CanvasRenderingContext2D,
  traps: ChamberTrapRuntime[],
  dt: number,
  now: number,
  player: { x: number; y: number; hp: number; invulnTimer: number; hitFlashTimer: number; elevationY: number },
  enemies: Array<{
    x: number;
    y: number;
    hp: number;
    posture: number;
    maxPosture: number;
    postureBrokenTimer: number;
    hitFlashTimer: number;
    aiState: string;
    scorchTimer: number;
  }>,
  callbacks: {
    onTrapTriggered: (x: number, y: number) => void;
    onTrapErupt: (trap: ChamberTrapRuntime, hitPlayer: boolean, enemiesHitCount: number) => void;
  }
) {
  const trapsAsset = getProcessedSpriteSync(GAME_ASSETS.floorTraps2x2);

  for (let i = 0; i < traps.length; i++) {
    const trap = traps[i];

    if (trap.state === 'idle') {
      const playerOnPlate =
        player.elevationY < 10 &&
        Math.hypot(player.x - trap.x, (player.y - trap.y) * 1.35) <= trap.radius * 0.85;
      const enemyOnPlate = enemies.some(
        (e) =>
          e.aiState !== 'ko' &&
          Math.hypot(e.x - trap.x, (e.y - trap.y) * 1.35) <= trap.radius * 0.85
      );
      if (playerOnPlate || enemyOnPlate) {
        trap.state = 'priming';
        trap.timer = 0.52;
        callbacks.onTrapTriggered(trap.x, trap.y);
      }
    } else if (trap.state === 'priming') {
      trap.timer -= dt;
      if (trap.timer <= 0) {
        trap.state = 'erupting';
        trap.timer = 0.65;

        let hitPlayer = false;
        if (
          player.invulnTimer <= 0 &&
          player.elevationY < 12 &&
          Math.hypot(player.x - trap.x, (player.y - trap.y) * 1.3) <= trap.radius * 1.15
        ) {
          player.hp = Math.max(0, player.hp - 24);
          player.hitFlashTimer = 0.12;
          hitPlayer = true;
        }

        let enemiesHitCount = 0;
        enemies.forEach((e) => {
          if (e.aiState === 'ko') return;
          if (Math.hypot(e.x - trap.x, (e.y - trap.y) * 1.3) <= trap.radius * 1.25) {
            e.hp = Math.max(0, e.hp - 145);
            e.hitFlashTimer = 0.14;
            if (trap.kind === 'agni_vent') {
              e.scorchTimer = Math.max(e.scorchTimer, 4.0);
            }
            e.posture = Math.max(0, e.posture - 160);
            if (e.posture <= 0 && e.postureBrokenTimer <= 0) {
              e.postureBrokenTimer = 4.0;
              e.aiState = 'recover';
            }
            enemiesHitCount++;
          }
        });

        callbacks.onTrapErupt(trap, hitPlayer, enemiesHitCount);
      }
    } else if (trap.state === 'erupting') {
      trap.timer -= dt;
      if (trap.timer <= 0) {
        trap.state = 'cooldown';
        trap.timer = 2.6;
      }
    } else if (trap.state === 'cooldown') {
      trap.timer -= dt;
      if (trap.timer <= 0) {
        trap.state = 'idle';
      }
    }

    // Render using the hand-painted 2x2 Isometric Floor Trap Sprite Sheet (zhy8c6zhy8c6zhy8_5d2df495.png)
    if (trapsAsset && trapsAsset.frames.length >= 4) {
      let frameIdx = 0;
      if (trap.state === 'priming') {
        frameIdx = 1; // Armed glowing molten-cracked plate
      } else if (trap.state === 'erupting') {
        frameIdx = trap.kind === 'chakram_slicer' ? 2 : 3; // 2: Erupted Iron Spikes, 3: Roaring Agni Lotus Plume
      } else {
        frameIdx = 0; // Dormant plate
      }

      const f = trapsAsset.frames[frameIdx] || trapsAsset.frames[0];
      const baseSize = trap.radius * 2.35;
      const drawW = baseSize;
      const drawH = (f.sh / Math.max(1, f.sw)) * drawW;

      ctx.save();
      ctx.translate(trap.x, trap.y);

      if (trap.state === 'priming') {
        const pulse = 0.85 + Math.sin(now * 0.035) * 0.15;
        ctx.scale(pulse, pulse);
      }

      ctx.drawImage(
        trapsAsset.cleanCanvas,
        f.sx,
        f.sy,
        f.sw,
        f.sh,
        -drawW * 0.5,
        trap.state === 'erupting' && frameIdx === 3 ? -drawH * 0.72 : -drawH * 0.55,
        drawW,
        drawH
      );
      ctx.restore();
    }
  }
}

// Smooth Chamber Transition Wipe (no hanging corner foreground overlays)
export function renderForegroundParallaxAndWipe(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  _camX: number,
  _camY: number,
  wipeProgress: number
) {
  // Smooth Hades Diamond Iris Chamber Transition Wipe
  if (wipeProgress > 0 && wipeProgress < 1) {
    const alpha = Math.sin((1 - wipeProgress) * Math.PI);
    ctx.save();
    ctx.fillStyle = `rgba(5, 3, 4, ${(alpha * 0.85).toFixed(3)})`;
    ctx.fillRect(0, 0, cw, ch);
    ctx.restore();
  }
}
