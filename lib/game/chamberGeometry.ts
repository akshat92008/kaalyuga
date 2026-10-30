export interface NormPoint {
  x: number;
  y: number;
}

export interface ChamberTrapSpec {
  id: string;
  /** Normalized world coordinates (0..1) */
  x: number;
  y: number;
  kind: 'agni_vent' | 'chakram_plate';
}

export interface ChamberTrapRuntime {
  id: string;
  x: number;
  y: number;
  kind: 'agni_vent' | 'chakram_plate';
  state: 'idle' | 'arming' | 'firing' | 'cooldown';
  timer: number;
  hitDealtThisCycle: boolean;
}

export interface ChamberGeometrySpec {
  chamberIndex: number;
  name: string;
  /** Clockwise normalized polygon vertices (0..1) defining the playable 2:1 isometric stone platform */
  outerPolygon: NormPoint[];
  /** Interior chasm / magma / blood-river trenches that block walking but can be vaulted with Dash (Space) */
  chasmPolygons: NormPoint[][];
  /** Normalized coordinates of the North-West (Left) and North-East (Right) isometric exit archways */
  leftGate: NormPoint;
  rightGate: NormPoint;
  /** Interactive Hades-style floor pressure plate traps */
  traps: ChamberTrapSpec[];
  /** Primary abyss color theme */
  abyssTheme: 'lava' | 'blood' | 'void_gold' | 'furnace';
}

export const CHAMBER_GEOMETRIES: ChamberGeometrySpec[] = [
  // Chamber 1 (idx 0): The Ashen Gate — Grand Octagonal Isometric Courtyard
  {
    chamberIndex: 0,
    name: 'THE ASHEN GATE',
    outerPolygon: [
      { x: 0.30, y: 0.16 },
      { x: 0.70, y: 0.16 },
      { x: 0.91, y: 0.38 },
      { x: 0.91, y: 0.64 },
      { x: 0.68, y: 0.87 },
      { x: 0.32, y: 0.87 },
      { x: 0.09, y: 0.64 },
      { x: 0.09, y: 0.38 },
    ],
    chasmPolygons: [
      // Central sunken molten ash fissure (dashable gap between west and east courtyard wings)
      [
        { x: 0.47, y: 0.39 },
        { x: 0.53, y: 0.39 },
        { x: 0.55, y: 0.53 },
        { x: 0.49, y: 0.57 },
        { x: 0.45, y: 0.51 },
      ],
    ],
    leftGate: { x: 0.34, y: 0.19 },
    rightGate: { x: 0.66, y: 0.19 },
    traps: [
      { id: 'c0_t1', x: 0.39, y: 0.46, kind: 'agni_vent' },
      { id: 'c0_t2', x: 0.61, y: 0.46, kind: 'agni_vent' },
      { id: 'c0_t3', x: 0.50, y: 0.70, kind: 'chakram_plate' },
    ],
    abyssTheme: 'lava',
  },

  // Chamber 2 (idx 1): River Vaitarani — Twin-Bridge Blood-River Crossing
  {
    chamberIndex: 1,
    name: 'RIVER VAITARANI',
    outerPolygon: [
      { x: 0.28, y: 0.16 },
      { x: 0.72, y: 0.16 },
      { x: 0.92, y: 0.40 },
      { x: 0.90, y: 0.68 },
      { x: 0.66, y: 0.88 },
      { x: 0.34, y: 0.88 },
      { x: 0.10, y: 0.68 },
      { x: 0.08, y: 0.40 },
    ],
    chasmPolygons: [
      // Upper Vaitarani blood-river channel (leaves central & side bridges open, dashable across middle)
      [
        { x: 0.44, y: 0.28 },
        { x: 0.56, y: 0.28 },
        { x: 0.58, y: 0.43 },
        { x: 0.42, y: 0.43 },
      ],
      // Lower Vaitarani blood-river channel
      [
        { x: 0.42, y: 0.59 },
        { x: 0.58, y: 0.59 },
        { x: 0.56, y: 0.75 },
        { x: 0.44, y: 0.75 },
      ],
    ],
    leftGate: { x: 0.33, y: 0.19 },
    rightGate: { x: 0.67, y: 0.19 },
    traps: [
      { id: 'c1_t1', x: 0.31, y: 0.51, kind: 'chakram_plate' },
      { id: 'c1_t2', x: 0.69, y: 0.51, kind: 'chakram_plate' },
      { id: 'c1_t3', x: 0.50, y: 0.51, kind: 'agni_vent' },
    ],
    abyssTheme: 'blood',
  },

  // Chamber 3 (idx 2): The Chakraview Labyrinth — Stepped Isometric Diamond Bastion
  {
    chamberIndex: 2,
    name: 'CHAKRAVIEW LABYRINTH',
    outerPolygon: [
      { x: 0.32, y: 0.15 },
      { x: 0.68, y: 0.15 },
      { x: 0.92, y: 0.42 },
      { x: 0.92, y: 0.62 },
      { x: 0.68, y: 0.87 },
      { x: 0.32, y: 0.87 },
      { x: 0.08, y: 0.62 },
      { x: 0.08, y: 0.42 },
    ],
    chasmPolygons: [
      [
        { x: 0.25, y: 0.45 },
        { x: 0.33, y: 0.45 },
        { x: 0.33, y: 0.59 },
        { x: 0.25, y: 0.59 },
      ],
      [
        { x: 0.67, y: 0.45 },
        { x: 0.75, y: 0.45 },
        { x: 0.75, y: 0.59 },
        { x: 0.67, y: 0.59 },
      ],
    ],
    leftGate: { x: 0.35, y: 0.18 },
    rightGate: { x: 0.65, y: 0.18 },
    traps: [
      { id: 'c2_t1', x: 0.50, y: 0.38, kind: 'chakram_plate' },
      { id: 'c2_t2', x: 0.50, y: 0.66, kind: 'chakram_plate' },
      { id: 'c2_t3', x: 0.41, y: 0.52, kind: 'agni_vent' },
      { id: 'c2_t4', x: 0.59, y: 0.52, kind: 'agni_vent' },
    ],
    abyssTheme: 'void_gold',
  },

  // Chamber 4 (idx 3): Sanctum of the Bleeding Drum — Boss I (Dundubhi) Colossal Octagonal Amphitheater
  {
    chamberIndex: 3,
    name: 'SANCTUM OF THE BLEEDING DRUM',
    outerPolygon: [
      { x: 0.27, y: 0.15 },
      { x: 0.73, y: 0.15 },
      { x: 0.93, y: 0.36 },
      { x: 0.93, y: 0.68 },
      { x: 0.72, y: 0.88 },
      { x: 0.28, y: 0.88 },
      { x: 0.07, y: 0.68 },
      { x: 0.07, y: 0.36 },
    ],
    chasmPolygons: [],
    leftGate: { x: 0.34, y: 0.18 },
    rightGate: { x: 0.66, y: 0.18 },
    traps: [
      { id: 'c3_t1', x: 0.36, y: 0.38, kind: 'agni_vent' },
      { id: 'c3_t2', x: 0.64, y: 0.38, kind: 'agni_vent' },
      { id: 'c3_t3', x: 0.36, y: 0.68, kind: 'chakram_plate' },
      { id: 'c3_t4', x: 0.64, y: 0.68, kind: 'chakram_plate' },
    ],
    abyssTheme: 'blood',
  },

  // Chamber 5 (idx 4): Hall of 1000 Chariots
  {
    chamberIndex: 4,
    name: 'HALL OF 1000 CHARIOTS',
    outerPolygon: [
      { x: 0.29, y: 0.16 },
      { x: 0.71, y: 0.16 },
      { x: 0.91, y: 0.39 },
      { x: 0.91, y: 0.65 },
      { x: 0.69, y: 0.87 },
      { x: 0.31, y: 0.87 },
      { x: 0.09, y: 0.65 },
      { x: 0.09, y: 0.39 },
    ],
    chasmPolygons: [
      [
        { x: 0.46, y: 0.44 },
        { x: 0.54, y: 0.44 },
        { x: 0.54, y: 0.60 },
        { x: 0.46, y: 0.60 },
      ],
    ],
    leftGate: { x: 0.34, y: 0.19 },
    rightGate: { x: 0.66, y: 0.19 },
    traps: [
      { id: 'c4_t1', x: 0.35, y: 0.52, kind: 'agni_vent' },
      { id: 'c4_t2', x: 0.65, y: 0.52, kind: 'agni_vent' },
      { id: 'c4_t3', x: 0.50, y: 0.31, kind: 'chakram_plate' },
    ],
    abyssTheme: 'lava',
  },

  // Chamber 6 (idx 5): Sunken Shrine of Drona
  {
    chamberIndex: 5,
    name: 'SUNKEN SHRINE OF DRONA',
    outerPolygon: [
      { x: 0.30, y: 0.16 },
      { x: 0.70, y: 0.16 },
      { x: 0.92, y: 0.40 },
      { x: 0.90, y: 0.67 },
      { x: 0.67, y: 0.88 },
      { x: 0.33, y: 0.88 },
      { x: 0.10, y: 0.67 },
      { x: 0.08, y: 0.40 },
    ],
    chasmPolygons: [
      [
        { x: 0.26, y: 0.48 },
        { x: 0.35, y: 0.44 },
        { x: 0.35, y: 0.58 },
        { x: 0.26, y: 0.58 },
      ],
      [
        { x: 0.65, y: 0.44 },
        { x: 0.74, y: 0.48 },
        { x: 0.74, y: 0.58 },
        { x: 0.65, y: 0.58 },
      ],
    ],
    leftGate: { x: 0.34, y: 0.19 },
    rightGate: { x: 0.66, y: 0.19 },
    traps: [
      { id: 'c5_t1', x: 0.50, y: 0.44, kind: 'chakram_plate' },
      { id: 'c5_t2', x: 0.50, y: 0.64, kind: 'agni_vent' },
      { id: 'c5_t3', x: 0.38, y: 0.72, kind: 'chakram_plate' },
      { id: 'c5_t4', x: 0.62, y: 0.72, kind: 'chakram_plate' },
    ],
    abyssTheme: 'blood',
  },

  // Chamber 7 (idx 6): Gates of Jatharagni
  {
    chamberIndex: 6,
    name: 'GATES OF JATHARAGNI',
    outerPolygon: [
      { x: 0.28, y: 0.16 },
      { x: 0.72, y: 0.16 },
      { x: 0.92, y: 0.38 },
      { x: 0.92, y: 0.66 },
      { x: 0.70, y: 0.88 },
      { x: 0.30, y: 0.88 },
      { x: 0.08, y: 0.66 },
      { x: 0.08, y: 0.38 },
    ],
    chasmPolygons: [
      [
        { x: 0.44, y: 0.32 },
        { x: 0.56, y: 0.32 },
        { x: 0.54, y: 0.46 },
        { x: 0.46, y: 0.46 },
      ],
      [
        { x: 0.46, y: 0.60 },
        { x: 0.54, y: 0.60 },
        { x: 0.56, y: 0.74 },
        { x: 0.44, y: 0.74 },
      ],
    ],
    leftGate: { x: 0.34, y: 0.19 },
    rightGate: { x: 0.66, y: 0.19 },
    traps: [
      { id: 'c6_t1', x: 0.32, y: 0.46, kind: 'agni_vent' },
      { id: 'c6_t2', x: 0.68, y: 0.46, kind: 'agni_vent' },
      { id: 'c6_t3', x: 0.32, y: 0.62, kind: 'chakram_plate' },
      { id: 'c6_t4', x: 0.68, y: 0.62, kind: 'chakram_plate' },
    ],
    abyssTheme: 'furnace',
  },

  // Chamber 8 (idx 7): The Chained Furnace — Final Sovereign Boss (Vrikodara) Sanctum
  {
    chamberIndex: 7,
    name: 'THE CHAINED FURNACE',
    outerPolygon: [
      { x: 0.26, y: 0.14 },
      { x: 0.74, y: 0.14 },
      { x: 0.94, y: 0.36 },
      { x: 0.94, y: 0.68 },
      { x: 0.73, y: 0.89 },
      { x: 0.27, y: 0.89 },
      { x: 0.06, y: 0.68 },
      { x: 0.06, y: 0.36 },
    ],
    chasmPolygons: [],
    leftGate: { x: 0.34, y: 0.17 },
    rightGate: { x: 0.66, y: 0.17 },
    traps: [
      { id: 'c7_t1', x: 0.34, y: 0.36, kind: 'agni_vent' },
      { id: 'c7_t2', x: 0.66, y: 0.36, kind: 'agni_vent' },
      { id: 'c7_t3', x: 0.34, y: 0.68, kind: 'agni_vent' },
      { id: 'c7_t4', x: 0.66, y: 0.68, kind: 'agni_vent' },
    ],
    abyssTheme: 'furnace',
  },
];

export function getChamberGeometry(chamberIndex: number): ChamberGeometrySpec {
  const clamped = Math.max(0, Math.min(CHAMBER_GEOMETRIES.length - 1, chamberIndex));
  return CHAMBER_GEOMETRIES[clamped];
}

export function createChamberTrapsRuntime(
  chamberIndex: number,
  worldW: number,
  worldH: number
): ChamberTrapRuntime[] {
  const spec = getChamberGeometry(chamberIndex);
  return spec.traps.map((t) => ({
    id: t.id,
    x: t.x * worldW,
    y: t.y * worldH,
    kind: t.kind,
    state: 'idle',
    timer: 0,
    hitDealtThisCycle: false,
  }));
}

/** Point-in-polygon check in world coordinates */
function isPointInPolygon(
  px: number,
  py: number,
  poly: NormPoint[],
  worldW: number,
  worldH: number
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x * worldW;
    const yi = poly[i].y * worldH;
    const xj = poly[j].x * worldW;
    const yj = poly[j].y * worldH;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-7) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Closest point on a polygon perimeter in world coordinates */
function closestPointOnPolygon(
  px: number,
  py: number,
  poly: NormPoint[],
  worldW: number,
  worldH: number
): { x: number; y: number; nx: number; ny: number; dist: number } {
  let bestX = px;
  let bestY = py;
  let bestNx = 0;
  let bestNy = -1;
  let bestDistSq = Infinity;

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ax = a.x * worldW;
    const ay = a.y * worldH;
    const bx = b.x * worldW;
    const by = b.y * worldH;
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const dSq = (px - cx) * (px - cx) + (py - cy) * (py - cy);
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestX = cx;
      bestY = cy;
      const len = Math.sqrt(lenSq) || 1;
      // For clockwise outer polygon in screen coords (Y down), inward normal is (-dy/len, dx/len)
      bestNx = -dy / len;
      bestNy = dx / len;
    }
  }

  return {
    x: bestX,
    y: bestY,
    nx: bestNx,
    ny: bestNy,
    dist: Math.sqrt(bestDistSq),
  };
}

export interface PolygonConstraintResult {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hitOuterWall: boolean;
  hitChasmEdge: boolean;
  vaultedChasm: boolean;
  normalX: number;
  normalY: number;
}

/**
 * Constrains an actor (Rudra or Enemy) to the 2:1 isometric chamber polygon
 * and interior chasm/magma channels.
 * - Walking actors slide smoothly along diagonal isometric walls.
 * - Dashing actors (`isDashing = true`) can vault directly over interior `chasmPolygons`!
 * - High-velocity knocked-back enemies return `hitOuterWall = true` to trigger Hades Wall-Slam damage.
 */
export function constrainActorToChamber(
  x: number,
  y: number,
  vx: number,
  vy: number,
  worldW: number,
  worldH: number,
  chamberIndex: number,
  isDashing: boolean,
  isBoss: boolean,
  marginPx: number = 18
): PolygonConstraintResult {
  const geom = getChamberGeometry(chamberIndex);
  let curX = x;
  let curY = y;
  let curVx = vx;
  let curVy = vy;
  let hitOuterWall = false;
  let hitChasmEdge = false;
  let vaultedChasm = false;
  let normalX = 0;
  let normalY = 0;

  // 1. Check Outer 2:1 Isometric Platform Polygon
  const insideOuter = isPointInPolygon(curX, curY, geom.outerPolygon, worldW, worldH);
  const closestOuter = closestPointOnPolygon(curX, curY, geom.outerPolygon, worldW, worldH);

  if (!insideOuter || closestOuter.dist < marginPx) {
    hitOuterWall = true;
    normalX = closestOuter.nx;
    normalY = closestOuter.ny;
    curX = closestOuter.x + closestOuter.nx * marginPx;
    curY = closestOuter.y + closestOuter.ny * marginPx;

    // Project velocity to slide smoothly along the isometric wall
    const dot = curVx * normalX + curVy * normalY;
    if (dot < 0) {
      curVx -= dot * normalX;
      curVy -= dot * normalY;
    }
  }

  // 2. Check Interior Chasm / Magma / Blood-River Channels
  for (let i = 0; i < geom.chasmPolygons.length; i++) {
    const chasm = geom.chasmPolygons[i];
    const inChasm = isPointInPolygon(curX, curY, chasm, worldW, worldH);
    if (inChasm) {
      if (isDashing || isBoss) {
        vaultedChasm = isDashing;
      } else {
        hitChasmEdge = true;
        const closestChasm = closestPointOnPolygon(curX, curY, chasm, worldW, worldH);
        // Push outward from the interior chasm polygon
        const outNx = -closestChasm.nx;
        const outNy = -closestChasm.ny;
        curX = closestChasm.x + outNx * 12;
        curY = closestChasm.y + outNy * 12;
        const dot = curVx * outNx + curVy * outNy;
        if (dot < 0) {
          curVx -= dot * outNx;
          curVy -= dot * outNy;
        }
      }
    }
  }

  return {
    x: curX,
    y: curY,
    vx: curVx,
    vy: curVy,
    hitOuterWall,
    hitChasmEdge,
    vaultedChasm,
    normalX,
    normalY,
  };
}

/**
 * Step 1 of Render Pipeline: Deep Parallax Underworld Abyss beneath the suspended isometric chamber.
 * Moves at 0.42x camera parallax to give authentic Hades Tartarus/Asphodel spatial depth.
 */
export function renderParallaxAbyss(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  camX: number,
  camY: number,
  now: number,
  chamberIndex: number
): void {
  const geom = getChamberGeometry(chamberIndex);
  ctx.save();

  // Deep underworld void gradient
  const abyssGrad = ctx.createLinearGradient(0, 0, 0, ch);
  if (geom.abyssTheme === 'blood') {
    abyssGrad.addColorStop(0, '#090306');
    abyssGrad.addColorStop(0.55, '#16050a');
    abyssGrad.addColorStop(1, '#260710');
  } else if (geom.abyssTheme === 'void_gold') {
    abyssGrad.addColorStop(0, '#06060b');
    abyssGrad.addColorStop(0.6, '#120e18');
    abyssGrad.addColorStop(1, '#1f1612');
  } else {
    abyssGrad.addColorStop(0, '#080404');
    abyssGrad.addColorStop(0.55, '#180805');
    abyssGrad.addColorStop(1, '#2b0d06');
  }
  ctx.fillStyle = abyssGrad;
  ctx.fillRect(0, 0, cw, ch);

  const pxOffset = -camX * 0.38;
  const pyOffset = -camY * 0.38;

  // Distant Sunken Gopuram / Ruined Underworld Pillars in the 0.38x parallax chasm
  ctx.fillStyle = 'rgba(18, 10, 12, 0.78)';
  const pillarSeeds = [0.12, 0.28, 0.46, 0.68, 0.85, 1.05];
  for (let i = 0; i < pillarSeeds.length; i++) {
    const sx = ((pillarSeeds[i] * cw * 1.4 + pxOffset) % (cw * 1.35)) - 80;
    const sy = ch * (0.48 + (i % 3) * 0.14) + pyOffset * 0.5;
    const pw = 46 + (i % 2) * 18;
    const ph = 320;
    ctx.fillRect(sx, sy, pw, ph);
    // Ruined capital crown
    ctx.fillRect(sx - 10, sy, pw + 20, 14);
  }

  // Glowing Molten Magma / Vaitarani Blood Veins flowing across the chasm floor below
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const veinColor =
    geom.abyssTheme === 'blood'
      ? 'rgba(255, 38, 68, 0.24)'
      : geom.abyssTheme === 'void_gold'
      ? 'rgba(255, 196, 77, 0.18)'
      : 'rgba(255, 94, 24, 0.26)';

  for (let v = 0; v < 4; v++) {
    const vy = ch * (0.25 + v * 0.22) + (pyOffset % 160);
    const pulse = 0.8 + Math.sin(now * 0.0025 + v * 1.7) * 0.2;
    const vGrad = ctx.createRadialGradient(
      cw * (0.3 + v * 0.18) + pxOffset * 0.4,
      vy,
      10,
      cw * (0.3 + v * 0.18) + pxOffset * 0.4,
      vy,
      320 * pulse
    );
    vGrad.addColorStop(0, veinColor);
    vGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = vGrad;
    ctx.beginPath();
    ctx.arc(cw * (0.3 + v * 0.18) + pxOffset * 0.4, vy, 320 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rising Chasm Ash & Ember Motes from the Abyss
  for (let m = 0; m < 22; m++) {
    const seed = m * 137.5;
    const cycle = ((now * 0.032 + seed) % 100) / 100;
    const mx = ((seed * 19.3 + pxOffset * 1.2) % (cw + 120) + (cw + 120)) % (cw + 120) - 60;
    const my = ch * (1.05 - cycle * 0.95);
    const alpha = Math.sin(cycle * Math.PI) * 0.55;
    ctx.fillStyle =
      geom.abyssTheme === 'blood'
        ? '#ff3b5c'
        : geom.abyssTheme === 'void_gold'
        ? '#ffd86b'
        : '#ff7b29';
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(mx, my, 1.8 + (m % 3) * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

/**
 * Step 2 of Render Pipeline (in World Space):
 * Renders the 3D-extruded basalt stone cliff skirt, clips the hand-painted chamber backdrop
 * into the 2:1 isometric platform polygon, carves out interior dashable magma/blood channels,
 * draws beveled temple walls, and renders the physical NW & NE Isometric Exit Gate Archways.
 */
export function renderIsometricChamberPlatform(
  ctx: CanvasRenderingContext2D,
  worldW: number,
  worldH: number,
  bgImg: HTMLImageElement | undefined,
  floorTint: string,
  chamberIndex: number,
  now: number,
  chamberCleared: boolean,
  nextChamberIsBoss: boolean,
  drawInsidePlatformCallback: () => void
): void {
  const geom = getChamberGeometry(chamberIndex);
  const poly = geom.outerPolygon;
  const skirtDepth = 54;

  // -------------------------------------------------------------------------
  // A. 3D-EXTRUDED BASALT STONE CLIFF SKIRT (Southern / Lower Ledges)
  // -------------------------------------------------------------------------
  ctx.save();
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ax = a.x * worldW;
    const ay = a.y * worldH;
    const bx = b.x * worldW;
    const by = b.y * worldH;

    // For clockwise polygon, southern-facing edges have ax > bx or sit in the lower half
    if (ay >= worldH * 0.35 || by >= worldH * 0.35) {
      const cliffGrad = ctx.createLinearGradient(0, Math.min(ay, by), 0, Math.max(ay, by) + skirtDepth);
      cliffGrad.addColorStop(0, '#2a211d');
      cliffGrad.addColorStop(0.45, '#171110');
      cliffGrad.addColorStop(1, '#090607');

      ctx.fillStyle = cliffGrad;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx, by + skirtDepth);
      ctx.lineTo(ax, ay + skirtDepth);
      ctx.closePath();
      ctx.fill();

      // Chiseled vertical basalt column joints along the 3D cliff face
      ctx.strokeStyle = 'rgba(255, 165, 82, 0.14)';
      ctx.lineWidth = 1.4;
      const segLen = Math.hypot(bx - ax, by - ay);
      const steps = Math.max(2, Math.floor(segLen / 64));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const jx = ax + (bx - ax) * t;
        const jy = ay + (by - ay) * t;
        ctx.beginPath();
        ctx.moveTo(jx, jy);
        ctx.lineTo(jx, jy + skirtDepth);
        ctx.stroke();
      }

      // Glowing under-lip reflection from the lava/blood abyss below
      ctx.strokeStyle =
        geom.abyssTheme === 'blood'
          ? 'rgba(255, 48, 78, 0.38)'
          : 'rgba(255, 110, 36, 0.38)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(ax, ay + skirtDepth - 2);
      ctx.lineTo(bx, by + skirtDepth - 2);
      ctx.stroke();
    }
  }
  ctx.restore();

  // -------------------------------------------------------------------------
  // B. CLIPPED 2:1 ISOMETRIC STONE FLOOR SLAB & HAND-PAINTED ARTWORK
  // -------------------------------------------------------------------------
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < poly.length; i++) {
    const vx = poly[i].x * worldW;
    const vy = poly[i].y * worldH;
    if (i === 0) ctx.moveTo(vx, vy);
    else ctx.lineTo(vx, vy);
  }
  ctx.closePath();
  ctx.clip();

  // Draw hand-painted chamber artwork inside the clipped isometric stone slab
  if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
    const scale = Math.max(worldW / bgImg.naturalWidth, worldH / bgImg.naturalHeight);
    const dw = bgImg.naturalWidth * scale;
    const dh = bgImg.naturalHeight * scale;
    ctx.drawImage(bgImg, (worldW - dw) * 0.5, (worldH - dh) * 0.5, dw, dh);
  } else {
    ctx.fillStyle = '#181210';
    ctx.fillRect(0, 0, worldW, worldH);
  }

  // Subtle floor atmospheric tint
  ctx.fillStyle = floorTint;
  ctx.fillRect(0, 0, worldW, worldH);

  // Subtle 2:1 Isometric Flagstone Bevel Grid Overlay for unmistakable Hades spatial perspective
  ctx.save();
  ctx.strokeStyle = 'rgba(245, 200, 125, 0.055)';
  ctx.lineWidth = 1.2;
  const tileStep = 110;
  for (let offset = -worldH; offset < worldW + worldH; offset += tileStep) {
    // 2:1 isometric NE-SW lines
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset - worldH * 1.8, worldH);
    ctx.stroke();
    // 2:1 isometric NW-SE lines
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset + worldH * 1.8, worldH);
    ctx.stroke();
  }
  ctx.restore();

  // Execute callback for floor decals, mandalas, and braziers inside the clipped stone platform
  drawInsidePlatformCallback();

  // -------------------------------------------------------------------------
  // C. INTERIOR DASHABLE CHASM / MAGMA / BLOOD-RIVER CHANNELS
  // -------------------------------------------------------------------------
  for (let c = 0; c < geom.chasmPolygons.length; c++) {
    const chasm = geom.chasmPolygons[c];
    if (chasm.length < 3) continue;

    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < chasm.length; i++) {
      const cx = chasm[i].x * worldW;
      const cy = chasm[i].y * worldH;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.closePath();

    // Deep recessed magma/blood trench fill
    const isBlood = geom.abyssTheme === 'blood';
    const pulse = 0.82 + Math.sin(now * 0.004 + c) * 0.18;
    ctx.fillStyle = isBlood ? '#1a0409' : '#180704';
    ctx.fill();

    ctx.save();
    ctx.clip();
    // Inner recessed stone ledge wall along top of trench
    ctx.fillStyle = '#2d221e';
    ctx.beginPath();
    for (let i = 0; i < chasm.length; i++) {
      const cx = chasm[i].x * worldW;
      const cy = chasm[i].y * worldH;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    for (let i = chasm.length - 1; i >= 0; i--) {
      const cx = chasm[i].x * worldW;
      const cy = chasm[i].y * worldH + 22;
      ctx.lineTo(cx, cy);
    }
    ctx.closePath();
    ctx.fill();

    // Glowing molten river current inside the trench ( below the 22px stone drop)
    const center = chasm.reduce(
      (acc, pt) => ({ x: acc.x + (pt.x * worldW) / chasm.length, y: acc.y + (pt.y * worldH) / chasm.length }),
      { x: 0, y: 0 }
    );
    const trenchGlow = ctx.createRadialGradient(center.x, center.y + 10, 6, center.x, center.y + 10, 130);
    if (isBlood) {
      trenchGlow.addColorStop(0, `rgba(255, 42, 72, ${0.78 * pulse})`);
      trenchGlow.addColorStop(0.6, `rgba(175, 14, 38, ${0.52 * pulse})`);
      trenchGlow.addColorStop(1, 'rgba(30, 4, 10, 0.9)');
    } else {
      trenchGlow.addColorStop(0, `rgba(255, 185, 52, ${0.82 * pulse})`);
      trenchGlow.addColorStop(0.55, `rgba(255, 72, 18, ${0.58 * pulse})`);
      trenchGlow.addColorStop(1, 'rgba(32, 8, 4, 0.9)');
    }
    ctx.fillStyle = trenchGlow;
    ctx.fillRect(center.x - 180, center.y - 140, 360, 280);
    ctx.restore();

    // Beveled gold/crimson rim around the chasm trench (visual cue: "DASH [SPACE] TO VAULT")
    ctx.strokeStyle = isBlood ? '#ff3b5c' : '#ff8833';
    ctx.lineWidth = 2.8;
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore(); // End outer polygon clip

  // -------------------------------------------------------------------------
  // D. CHISELED ISOMETRIC PERIMETER BORDER BEVEL & RAISED NW/NE TEMPLE WALLS
  // -------------------------------------------------------------------------
  ctx.save();
  // Outer dark stone Curb
  ctx.strokeStyle = '#120d0c';
  ctx.lineWidth = 10;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < poly.length; i++) {
    const vx = poly[i].x * worldW;
    const vy = poly[i].y * worldH;
    if (i === 0) ctx.moveTo(vx, vy);
    else ctx.lineTo(vx, vy);
  }
  ctx.closePath();
  ctx.stroke();

  // Inner Gilded Vedic Trim Line
  ctx.strokeStyle = 'rgba(236, 184, 98, 0.52)';
  ctx.lineWidth = 2.8;
  ctx.stroke();

  // Raised Upper-Left (NW), Upper-Center (N), and Upper-Right (NE) Isometric Temple Walls
  // poly[7]->poly[0] (NW wall), poly[0]->poly[1] (North wall), poly[1]->poly[2] (NE wall)
  const wallHeight = 64;
  const upperEdges = [
    [poly[7], poly[0]],
    [poly[0], poly[1]],
    [poly[1], poly[2]],
  ];
  for (const [pA, pB] of upperEdges) {
    if (!pA || !pB) continue;
    const ax = pA.x * worldW;
    const ay = pA.y * worldH;
    const bx = pB.x * worldW;
    const by = pB.y * worldH;

    const wallGrad = ctx.createLinearGradient(0, Math.min(ay, by) - wallHeight, 0, Math.max(ay, by));
    wallGrad.addColorStop(0, '#140e0d');
    wallGrad.addColorStop(0.3, '#2b1f1b');
    wallGrad.addColorStop(1, '#191210');

    ctx.fillStyle = wallGrad;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx, by - wallHeight);
    ctx.lineTo(ax, ay - wallHeight);
    ctx.closePath();
    ctx.fill();

    // Top cornice gold trim on the raised wall
    ctx.strokeStyle = 'rgba(242, 196, 108, 0.48)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(ax, ay - wallHeight);
    ctx.lineTo(bx, by - wallHeight);
    ctx.stroke();
  }
  ctx.restore();

  // -------------------------------------------------------------------------
  // E. PHYSICAL 2:1 ISOMETRIC LOCKED / UNLOCKED TEMPLE EXIT GATE ARCHWAYS
  // -------------------------------------------------------------------------
  const gates = [
    {
      pos: geom.leftGate,
      color: '#ffd86b',
      lockedColor: '#ff2a3a',
      title: nextChamberIsBoss ? 'SOVEREIGN SANCTUM + DEVA BOON' : 'DEVA ASTRA BOON GATE',
      subtitle: chamberCleared ? 'ENTER ARCHWAY · CLAIM DEVA BLESSING' : 'SEALED · VANQUISH ALL FOES',
      sigilKind: 'boon' as const,
    },
    {
      pos: geom.rightGate,
      color: '#3ee0a8',
      lockedColor: '#ff2a3a',
      title: 'AMRITA KALASHA & KARMA GATE',
      subtitle: chamberCleared ? 'ENTER ARCHWAY · +30 MAX HP & +95 KARMA' : 'SEALED · VANQUISH ALL FOES',
      sigilKind: 'amrita' as const,
    },
  ];

  for (const g of gates) {
    const gx = g.pos.x * worldW;
    const gy = g.pos.y * worldH;
    const activeColor = chamberCleared ? g.color : g.lockedColor;

    ctx.save();
    ctx.translate(gx, gy);

    // 1. Isometric Floor Threshold Mandala
    ctx.save();
    ctx.scale(1, 0.52);
    const gRad = chamberCleared ? 82 + Math.sin(now * 0.006) * 7 : 64;
    const floorGlow = ctx.createRadialGradient(0, 0, 8, 0, 0, gRad * 1.35);
    floorGlow.addColorStop(0, activeColor + (chamberCleared ? '88' : '44'));
    floorGlow.addColorStop(0.55, activeColor + (chamberCleared ? '33' : '18'));
    floorGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = floorGlow;
    ctx.beginPath();
    ctx.arc(0, 0, gRad * 1.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(now * (chamberCleared ? 0.0025 : 0.0008));
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = chamberCleared ? 3.0 : 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, gRad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 2. Physical 3D Stone Temple Gopuram Archway Frame
    const archW = 96;
    const archH = 92;
    // Left & Right Stone Pillars
    ctx.fillStyle = '#241a17';
    ctx.strokeStyle = '#d4a658';
    ctx.lineWidth = 2.2;
    ctx.fillRect(-archW * 0.5 - 14, -archH, 16, archH + 6);
    ctx.strokeRect(-archW * 0.5 - 14, -archH, 16, archH + 6);
    ctx.fillRect(archW * 0.5 - 2, -archH, 16, archH + 6);
    ctx.strokeRect(archW * 0.5 - 2, -archH, 16, archH + 6);

    // Stepped Gopuram Lintel Crown
    ctx.fillStyle = '#2e201b';
    ctx.beginPath();
    ctx.moveTo(-archW * 0.5 - 22, -archH);
    ctx.lineTo(archW * 0.5 + 22, -archH);
    ctx.lineTo(archW * 0.5 + 12, -archH - 18);
    ctx.lineTo(-archW * 0.5 - 12, -archH - 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Portal Interior: Locked Chains vs. Blazing Hades Exit Vortex
    if (!chamberCleared) {
      // Dark sealed doorway
      ctx.fillStyle = 'rgba(12, 4, 6, 0.86)';
      ctx.fillRect(-archW * 0.5 + 2, -archH + 2, archW - 4, archH);

      // Crossed Rudra-Agni Lock Chains barring the gate during combat!
      ctx.strokeStyle = '#ff384c';
      ctx.shadowColor = '#ff2a3a';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3.6;
      ctx.setLineDash([7, 4]);
      ctx.beginPath();
      ctx.moveTo(-archW * 0.45, -archH + 8);
      ctx.lineTo(archW * 0.45, -8);
      ctx.moveTo(archW * 0.45, -archH + 8);
      ctx.lineTo(-archW * 0.45, -8);
      ctx.stroke();
      ctx.setLineDash([]);

      // Central Crimson Lock Seal
      ctx.fillStyle = '#1a0609';
      ctx.beginPath();
      ctx.arc(0, -archH * 0.5, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Unlocked Blazing Portal Vortex
      const vortexGrad = ctx.createRadialGradient(0, -archH * 0.5, 4, 0, -archH * 0.5, archW * 0.6);
      vortexGrad.addColorStop(0, '#ffffff');
      vortexGrad.addColorStop(0.35, g.color);
      vortexGrad.addColorStop(0.85, g.color + '44');
      vortexGrad.addColorStop(1, 'rgba(10, 6, 12, 0.9)');
      ctx.fillStyle = vortexGrad;
      ctx.fillRect(-archW * 0.5 + 2, -archH + 2, archW - 4, archH);
    }

    // 4. Floating Hades-Style Reward Preview Crest above the Archway
    const floatY = -archH - 36 + Math.sin(now * 0.005) * 5;
    ctx.fillStyle = '#110c12';
    ctx.strokeStyle = activeColor;
    ctx.shadowColor = activeColor;
    ctx.shadowBlur = chamberCleared ? 14 : 6;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, floatY - 20);
    ctx.lineTo(20, floatY);
    ctx.lineTo(0, floatY + 20);
    ctx.lineTo(-20, floatY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner Reward Icon (Boon Lotus vs Amrita Kalasha)
    ctx.fillStyle = activeColor;
    ctx.beginPath();
    ctx.arc(0, floatY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Gate Callout Banner
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.font = "bold 11px 'Cinzel', Georgia, serif";
    ctx.strokeStyle = 'rgba(0,0,0,0.92)';
    ctx.lineWidth = 3.2;
    ctx.strokeText(g.title, 0, floatY - 28);
    ctx.fillStyle = activeColor;
    ctx.fillText(g.title, 0, floatY - 28);

    if (chamberCleared) {
      ctx.font = "600 9.5px 'Plus Jakarta Sans', sans-serif";
      ctx.strokeText(g.subtitle, 0, floatY + 33);
      ctx.fillStyle = '#f7efe0';
      ctx.fillText(g.subtitle, 0, floatY + 33);
    }

    ctx.restore();
  }
}

/**
 * Updates and renders interactive Hades-style Floor Pressure-Plate Traps (Agni Flame Vents & Chakram Blades).
 * Damages BOTH enemies (heavy tactical bonus damage!) and Rudra (if not invulnerable/dashing).
 */
export function updateAndRenderPressureTraps(
  ctx: CanvasRenderingContext2D,
  traps: ChamberTrapRuntime[],
  simDt: number,
  now: number,
  player: {
    x: number;
    y: number;
    hp: number;
    invulnTimer: number;
    hitFlashTimer: number;
  },
  enemies: Array<{
    x: number;
    y: number;
    hp: number;
    posture: number;
    maxPosture: number;
    postureBrokenTimer: number;
    aiState: string;
    aiTimer: number;
    hitFlashTimer: number;
    scorchTimer: number;
    isBoss: boolean;
  }>,
  callbacks: {
    onTrapTriggered: (x: number, y: number) => void;
    onTrapErupt: (
      trap: ChamberTrapRuntime,
      hitPlayer: boolean,
      enemiesHitCount: number
    ) => void;
  }
): void {
  const triggerRadius = 44;
  const blastRadius = 112;

  for (let i = 0; i < traps.length; i++) {
    const tr = traps[i];

    // 1. State Machine Update
    if (simDt > 0) {
      if (tr.state === 'idle') {
        const playerStepped =
          player.invulnTimer <= 0 &&
          Math.hypot(player.x - tr.x, (player.y - tr.y) * 1.3) <= triggerRadius;
        const enemyStepped = enemies.some(
          (e) =>
            e.aiState !== 'ko' &&
            Math.hypot(e.x - tr.x, (e.y - tr.y) * 1.3) <= triggerRadius
        );
        if (playerStepped || enemyStepped) {
          tr.state = 'arming';
          tr.timer = 0.46; // 0.46s clear Hades telegraph before eruption!
          tr.hitDealtThisCycle = false;
          callbacks.onTrapTriggered(tr.x, tr.y);
        }
      } else if (tr.state === 'arming') {
        tr.timer -= simDt;
        if (tr.timer <= 0) {
          tr.state = 'firing';
          tr.timer = 0.36;
        }
      } else if (tr.state === 'firing') {
        if (!tr.hitDealtThisCycle) {
          tr.hitDealtThisCycle = true;
          let hitPlayer = false;
          let enemiesHit = 0;

          if (
            player.invulnTimer <= 0 &&
            Math.hypot(player.x - tr.x, (player.y - tr.y) * 1.2) <= blastRadius
          ) {
            player.hp = Math.max(0, player.hp - 24);
            player.hitFlashTimer = 0.1;
            hitPlayer = true;
          }

          for (const e of enemies) {
            if (e.aiState === 'ko') continue;
            if (Math.hypot(e.x - tr.x, (e.y - tr.y) * 1.2) <= blastRadius + (e.isBoss ? 24 : 0)) {
              const trapDmg = e.isBoss ? 115 : 145;
              e.hp = Math.max(0, e.hp - trapDmg);
              e.hitFlashTimer = 0.12;
              if (tr.kind === 'agni_vent') {
                e.scorchTimer = Math.max(e.scorchTimer, 4.0);
              }
              e.posture = Math.min(e.maxPosture, e.posture + 140);
              if (e.posture >= e.maxPosture && e.postureBrokenTimer <= 0) {
                e.postureBrokenTimer = 4.5;
                e.aiState = 'recover';
                e.aiTimer = 4.5;
              }
              enemiesHit++;
            }
          }

          callbacks.onTrapErupt(tr, hitPlayer, enemiesHit);
        }

        tr.timer -= simDt;
        if (tr.timer <= 0) {
          tr.state = 'cooldown';
          tr.timer = 2.6;
        }
      } else if (tr.state === 'cooldown') {
        tr.timer -= simDt;
        if (tr.timer <= 0) {
          tr.state = 'idle';
          tr.timer = 0;
        }
      }
    }

    // 2. Render Isometric Pressure Plate on the Floor
    ctx.save();
    ctx.translate(tr.x, tr.y);
    ctx.scale(1, 0.54);

    const isArming = tr.state === 'arming';
    const isFiring = tr.state === 'firing';
    const plateColor = isFiring
      ? '#ffffff'
      : isArming
      ? '#ff2a3a'
      : tr.state === 'cooldown'
      ? '#4a3d36'
      : '#c89e56';

    // Octagonal bronze pressure plate inset into stone
    ctx.fillStyle = isArming ? 'rgba(255, 52, 36, 0.35)' : 'rgba(20, 14, 12, 0.85)';
    ctx.strokeStyle = plateColor;
    ctx.lineWidth = isArming || isFiring ? 3.2 : 2.0;
    const r = 34;
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 + Math.PI / 8;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner Agni/Chakram vents
    ctx.strokeStyle = isArming ? '#ffe14d' : 'rgba(235, 175, 85, 0.45)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Telegraph Blast Ring while Arming
    if (isArming) {
      const prog = 1 - Math.max(0, tr.timer / 0.46);
      ctx.strokeStyle = '#ff384c';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, blastRadius * prog, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 225, 77, 0.65)';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, blastRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();

    // Vertical Eruption Column when Firing
    if (isFiring) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const pillarH = 165 * (tr.timer / 0.36);
      const colGrad = ctx.createLinearGradient(tr.x, tr.y, tr.x, tr.y - pillarH);
      colGrad.addColorStop(0, '#ffffff');
      colGrad.addColorStop(0.35, tr.kind === 'agni_vent' ? '#ff6a18' : '#38e8ff');
      colGrad.addColorStop(1, 'rgba(255, 42, 58, 0)');
      ctx.fillStyle = colGrad;
      ctx.beginPath();
      ctx.ellipse(tr.x, tr.y - pillarH * 0.45, 48, pillarH * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

/**
 * Step 4 of Render Pipeline (Screen Space):
 * Renders 1.26x foreground parallax dark temple ceiling beams & hanging iron chains around the
 * top/bottom edges of the viewport for authentic Hades foreground depth-of-field framing,
 * plus the Blood-Lotus Diamond Chamber Wipe transition when walking through an exit gate.
 */
export function renderForegroundParallaxAndWipe(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  camX: number,
  camY: number,
  transitionProgress: number
): void {
  ctx.save();
  const fgX = -camX * 0.24;
  const fgY = -camY * 0.24;

  // Out-of-focus dark foreground temple rafters & hanging chains at top-left and top-right corners
  ctx.fillStyle = 'rgba(6, 4, 6, 0.76)';
  // Top-left arch overhang
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(cw * 0.26 + (fgX % 60), 0);
  ctx.quadraticCurveTo(cw * 0.12, ch * 0.08, 0, ch * 0.22 + (fgY % 40));
  ctx.closePath();
  ctx.fill();

  // Top-right arch overhang
  ctx.beginPath();
  ctx.moveTo(cw, 0);
  ctx.lineTo(cw * 0.74 + (fgX % 60), 0);
  ctx.quadraticCurveTo(cw * 0.88, ch * 0.08, cw, ch * 0.22 + (fgY % 40));
  ctx.closePath();
  ctx.fill();

  // Hades-Style Obsidian & Blood-Lotus Diamond Chamber Wipe when transitioning between rooms
  if (transitionProgress > 0.001) {
    const p = Math.min(1, transitionProgress);
    // Triangle wave: 0 -> 1 (cover screen) -> 0 (reveal new chamber)
    const cover = p <= 0.5 ? p * 2 : (1 - p) * 2;
    const maxDim = Math.hypot(cw, ch) * 1.15 * cover;

    ctx.save();
    ctx.translate(cw * 0.5, ch * 0.5);
    ctx.fillStyle = '#090507';
    ctx.strokeStyle = '#ffd86b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -maxDim * 0.65);
    ctx.lineTo(maxDim, 0);
    ctx.lineTo(0, maxDim * 0.65);
    ctx.lineTo(-maxDim, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
