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

// Calibrated walkable stone platform polygons matching the 8 hand-painted 16:9 isometric arenas
const CHAMBER_GEOMETRIES: ChamberGeometrySpec[] = [
  // Chamber 1: Vaitarani River Ghat (Diamond Stone Platform)
  {
    outerPolygon: [
      { x: 0.50, y: 0.16 },
      { x: 0.84, y: 0.48 },
      { x: 0.80, y: 0.62 },
      { x: 0.50, y: 0.86 },
      { x: 0.20, y: 0.62 },
      { x: 0.16, y: 0.48 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.31, y: 0.24, angle: -0.52 },
    rightGate: { x: 0.69, y: 0.24, angle: 0.52 },
    traps: [
      { id: 'c1_t1', kind: 'agni_vent', x: 0.44, y: 0.52, radius: 56 },
      { id: 'c1_t2', kind: 'chakram_slicer', x: 0.58, y: 0.52, radius: 56 },
    ],
  },
  // Chamber 2: Raktabija Blood-Kunda Courtyard (Octagonal Courtyard)
  {
    outerPolygon: [
      { x: 0.34, y: 0.17 },
      { x: 0.66, y: 0.17 },
      { x: 0.85, y: 0.38 },
      { x: 0.85, y: 0.68 },
      { x: 0.66, y: 0.86 },
      { x: 0.34, y: 0.86 },
      { x: 0.15, y: 0.68 },
      { x: 0.15, y: 0.38 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.32, y: 0.22, angle: -0.45 },
    rightGate: { x: 0.68, y: 0.22, angle: 0.45 },
    traps: [
      { id: 'c2_t1', kind: 'chakram_slicer', x: 0.42, y: 0.54, radius: 58 },
      { id: 'c2_t2', kind: 'agni_vent', x: 0.58, y: 0.54, radius: 58 },
    ],
  },
  // Chamber 3: Kurukshetra Chariot Bonefield
  {
    outerPolygon: [
      { x: 0.30, y: 0.18 },
      { x: 0.70, y: 0.18 },
      { x: 0.86, y: 0.44 },
      { x: 0.82, y: 0.76 },
      { x: 0.64, y: 0.86 },
      { x: 0.36, y: 0.86 },
      { x: 0.18, y: 0.76 },
      { x: 0.14, y: 0.44 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.33, y: 0.22, angle: -0.42 },
    rightGate: { x: 0.67, y: 0.22, angle: 0.42 },
    traps: [
      { id: 'c3_t1', kind: 'agni_vent', x: 0.46, y: 0.50, radius: 58 },
      { id: 'c3_t2', kind: 'chakram_slicer', x: 0.58, y: 0.60, radius: 58 },
    ],
  },
  // Chamber 4: Mandapa of the War-Drum (3D Dundubhi Mid-Boss)
  {
    outerPolygon: [
      { x: 0.26, y: 0.18 },
      { x: 0.74, y: 0.18 },
      { x: 0.88, y: 0.46 },
      { x: 0.84, y: 0.78 },
      { x: 0.68, y: 0.87 },
      { x: 0.32, y: 0.87 },
      { x: 0.16, y: 0.78 },
      { x: 0.12, y: 0.46 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.34, y: 0.21, angle: -0.38 },
    rightGate: { x: 0.66, y: 0.21, angle: 0.38 },
    traps: [
      { id: 'c4_t1', kind: 'agni_vent', x: 0.50, y: 0.46, radius: 60 },
      { id: 'c4_t2', kind: 'chakram_slicer', x: 0.50, y: 0.66, radius: 60 },
    ],
  },
  // Chamber 5: Bhairava Soul-Fire Sanctum
  {
    outerPolygon: [
      { x: 0.32, y: 0.18 },
      { x: 0.68, y: 0.18 },
      { x: 0.86, y: 0.44 },
      { x: 0.82, y: 0.76 },
      { x: 0.66, y: 0.86 },
      { x: 0.34, y: 0.86 },
      { x: 0.18, y: 0.76 },
      { x: 0.14, y: 0.44 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.34, y: 0.22, angle: -0.44 },
    rightGate: { x: 0.66, y: 0.22, angle: 0.44 },
    traps: [
      { id: 'c5_t1', kind: 'chakram_slicer', x: 0.43, y: 0.52, radius: 58 },
      { id: 'c5_t2', kind: 'agni_vent', x: 0.57, y: 0.52, radius: 58 },
    ],
  },
  // Chamber 6: Shattered Gopuram Causeway
  {
    outerPolygon: [
      { x: 0.30, y: 0.18 },
      { x: 0.70, y: 0.18 },
      { x: 0.85, y: 0.45 },
      { x: 0.82, y: 0.76 },
      { x: 0.65, y: 0.86 },
      { x: 0.35, y: 0.86 },
      { x: 0.18, y: 0.76 },
      { x: 0.15, y: 0.45 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.33, y: 0.22, angle: -0.45 },
    rightGate: { x: 0.67, y: 0.22, angle: 0.45 },
    traps: [
      { id: 'c6_t1', kind: 'agni_vent', x: 0.38, y: 0.48, radius: 58 },
      { id: 'c6_t2', kind: 'chakram_slicer', x: 0.50, y: 0.56, radius: 58 },
      { id: 'c6_t3', kind: 'agni_vent', x: 0.62, y: 0.48, radius: 58 },
    ],
  },
  // Chamber 7: Sealed Gate of Jatharagni (Asura Lava Sanctum Locked -> Unlocked)
  {
    outerPolygon: [
      { x: 0.32, y: 0.22 },
      { x: 0.68, y: 0.22 },
      { x: 0.84, y: 0.48 },
      { x: 0.80, y: 0.78 },
      { x: 0.64, y: 0.87 },
      { x: 0.36, y: 0.87 },
      { x: 0.20, y: 0.78 },
      { x: 0.16, y: 0.48 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.44, y: 0.24, angle: 0 },
    rightGate: { x: 0.56, y: 0.24, angle: 0 },
    traps: [
      { id: 'c7_t1', kind: 'chakram_slicer', x: 0.44, y: 0.56, radius: 58 },
      { id: 'c7_t2', kind: 'agni_vent', x: 0.56, y: 0.56, radius: 58 },
    ],
  },
  // Chamber 8: Sanctum of the Infernal Maw (Final 3D Boss Vrikodara: Circular Naga / Eclipse Platform)
  {
    outerPolygon: [
      { x: 0.50, y: 0.18 },
      { x: 0.74, y: 0.25 },
      { x: 0.86, y: 0.48 },
      { x: 0.78, y: 0.74 },
      { x: 0.50, y: 0.86 },
      { x: 0.22, y: 0.74 },
      { x: 0.14, y: 0.48 },
      { x: 0.26, y: 0.25 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.36, y: 0.22, angle: -0.4 },
    rightGate: { x: 0.64, y: 0.22, angle: 0.4 },
    traps: [
      { id: 'c8_t1', kind: 'agni_vent', x: 0.38, y: 0.52, radius: 58 },
      { id: 'c8_t2', kind: 'chakram_slicer', x: 0.62, y: 0.52, radius: 58 },
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
    radius: t.radius,
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
  marginPx: number = 18
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

// Clean dark void backdrop (zero procedural magma/polygon shapes!)
export function renderParallaxAbyss(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  _camX: number,
  _camY: number,
  _now: number,
  _chamberIndex: number
) {
  ctx.save();
  ctx.fillStyle = '#050304';
  ctx.fillRect(0, 0, cw, ch);
  ctx.restore();
}

// Render the hand-painted 16:9 isometric chamber artwork + Hand-Painted Exit Gate Archways & Reward Orbs
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

  // 1. Full-Bleed Hand-Painted 16:9 Chamber Arena Artwork
  if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
    ctx.drawImage(bgImg, 0, 0, worldW, worldH);
  } else {
    ctx.fillStyle = '#0c0708';
    ctx.fillRect(0, 0, worldW, worldH);
  }

  // Subtle atmospheric color grade
  if (floorTint) {
    ctx.fillStyle = floorTint;
    ctx.fillRect(0, 0, worldW, worldH);
  }

  // 2. Surface decals, craters, and ambient brazier floor pools
  renderSurfaceDetailsCallback();

  // 3. Hand-Painted Isometric Exit Gate Archways (gcf89kgcf89kgcf8_26c0ebb5.png 2x1 & 5bgscc5bgscc5bgs_07c760f9.png 2x2)
  // and Floating Hades Chamber Reward Orbs (e4v7n9e4v7n9e4v7_05a48632.png 2x2)
  const geom = getChamberGeometry(chamberIndex);
  const gatesAsset = getProcessedSpriteSync(GAME_ASSETS.exitGateArchways2x1);
  const gateOverlaysAsset = getProcessedSpriteSync(GAME_ASSETS.gateOverlays2x2);
  const rewardOrbsAsset = getProcessedSpriteSync(GAME_ASSETS.rewardOrbs2x2);

  // Chamber 7 (index 6) uses the full-background Locked -> Unlocked gate swap in the center-top,
  // so we place its reward orbs flanking the grand unsealed portal; other non-final chambers render both Left & Right gates.
  if (chamberIndex < 7) {
    const gates = [
      {
        pos: geom.leftGate,
        orbFrame: isNextChamberBoss ? 3 : 0, // 0: Golden Lotus Boon Orb, 3: Crimson Skull Boss Orb
        label: isNextChamberBoss ? 'SOVEREIGN BOSS' : 'DEVA BOON ALTAR',
        accent: isNextChamberBoss ? '#ff384c' : '#ffd86b',
      },
      {
        pos: geom.rightGate,
        orbFrame: isNextChamberBoss ? 2 : 1, // 1: Emerald Amrita Vitality Orb, 2: Cyan Trishula Shrine Orb
        label: isNextChamberBoss ? 'ASTRA SHRINE + HP' : 'AMRITA +30 MAX HP',
        accent: isNextChamberBoss ? '#38e8ff' : '#3ee0a8',
      },
    ];

    gates.forEach((g) => {
      const gx = g.pos.x * worldW;
      const gy = g.pos.y * worldH;

      // Render 2x1 Isometric Gopuram Exit Gate Archway on chambers that don't have a single central background gate
      if (chamberIndex !== 6 && gatesAsset && gatesAsset.frames.length >= 2) {
        const frameIdx = isChamberCleared ? 1 : 0; // 0 = Locked with Golden Chains, 1 = Unlocked Portal Vortex
        const f = gatesAsset.frames[frameIdx] || gatesAsset.frames[0];
        const gateH = 210;
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
        const ovSize = 145;
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

      // Floating Hades Reward Preview Orb (bobs smoothly above each exit gate, intensifies when unlocked!)
      if (rewardOrbsAsset && rewardOrbsAsset.frames.length > 0) {
        const orbIdx = Math.min(rewardOrbsAsset.frames.length - 1, g.orbFrame);
        const of = rewardOrbsAsset.frames[orbIdx];
        const bobY = Math.sin(now * 0.004 + g.orbFrame * 1.7) * 8;
        const orbSize = isChamberCleared ? 86 : 64;

        ctx.save();
        ctx.translate(gx, gy - 98 + bobY);
        ctx.globalAlpha = isChamberCleared ? 1.0 : 0.72;

        // Soft additive glow behind the orb
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const oGlow = ctx.createRadialGradient(0, 0, 4, 0, 0, orbSize * 0.85);
        oGlow.addColorStop(0, g.accent + '88');
        oGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = oGlow;
        ctx.beginPath();
        ctx.arc(0, 0, orbSize * 0.85, 0, Math.PI * 2);
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
          ctx.font = "bold 11px 'Cinzel', Georgia, serif";
          ctx.textAlign = 'center';
          ctx.strokeStyle = 'rgba(0,0,0,0.92)';
          ctx.lineWidth = 3.5;
          ctx.strokeText(g.label, 0, orbSize * 0.55 + 10);
          ctx.fillStyle = g.accent;
          ctx.fillText(g.label, 0, orbSize * 0.55 + 10);
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

// Render Hand-Painted Foreground Parallax Corner Silhouettes (glxj9tglxj9tglxj_b076ead2.png & 9eap7c9eap7c9eap_6d0dfd02.png)
export function renderForegroundParallaxAndWipe(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  camX: number,
  camY: number,
  wipeProgress: number
) {
  const fgAssetA = getProcessedSpriteSync(GAME_ASSETS.foregroundOverhangsA2x2);
  const fgAssetB = getProcessedSpriteSync(GAME_ASSETS.foregroundOverhangsB2x2);
  const fgAsset = fgAssetA && fgAssetA.frames.length >= 4 ? fgAssetA : fgAssetB;

  if (fgAsset && fgAsset.frames.length >= 4) {
    // Inverse -0.065x parallax shift so foreground temple overhangs & gargoyles shift across viewport corners
    const px = -((camX * 0.065) % 90);
    const py = -((camY * 0.065) % 60);
    const cornerW = Math.min(340, cw * 0.25);
    const cornerH = Math.min(250, ch * 0.27);

    ctx.save();
    ctx.globalAlpha = 0.88;

    // Top-Left: Temple roof overhang & hanging chains (Frame 0)
    const f0 = fgAsset.frames[0];
    ctx.drawImage(
      fgAsset.cleanCanvas,
      f0.sx,
      f0.sy,
      f0.sw,
      f0.sh,
      -24 + px * 0.5,
      -18 + py * 0.5,
      cornerW,
      cornerH
    );

    // Top-Right: Horned Rakshasa gargoyle & bronze temple bells (Frame 1)
    const f1 = fgAsset.frames[1];
    ctx.drawImage(
      fgAsset.cleanCanvas,
      f1.sx,
      f1.sy,
      f1.sw,
      f1.sh,
      cw - cornerW + 24 + px * 0.5,
      -18 + py * 0.5,
      cornerW,
      cornerH
    );

    // Bottom-Left: Cracked stone balustrade & smoking oil lamp (Frame 2)
    const f2 = fgAsset.frames[2];
    ctx.drawImage(
      fgAsset.cleanCanvas,
      f2.sx,
      f2.sy,
      f2.sw,
      f2.sh,
      -28 + px * 0.65,
      ch - cornerH + 24 + py * 0.65,
      cornerW,
      cornerH
    );

    // Bottom-Right: Jagged obsidian spikes & torn war banners (Frame 3)
    const f3 = fgAsset.frames[3];
    ctx.drawImage(
      fgAsset.cleanCanvas,
      f3.sx,
      f3.sy,
      f3.sw,
      f3.sh,
      cw - cornerW + 28 + px * 0.65,
      ch - cornerH + 24 + py * 0.65,
      cornerW,
      cornerH
    );

    ctx.restore();
  }

  // Smooth Hades Diamond Iris Chamber Transition Wipe
  if (wipeProgress > 0 && wipeProgress < 1) {
    const alpha = Math.sin((1 - wipeProgress) * Math.PI);
    ctx.save();
    ctx.fillStyle = `rgba(5, 3, 4, ${(alpha * 0.85).toFixed(3)})`;
    ctx.fillRect(0, 0, cw, ch);
    ctx.restore();
  }
}
