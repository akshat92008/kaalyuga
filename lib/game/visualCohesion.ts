// ============================================================================
// KALIYUGA: THE BLEEDING CROWN — PILLAR 1: VISUAL COHESION & 2.5D/3D PIPELINE
// Pure deterministic math & canvas rendering helpers for:
// 1. Unified 3D Pipeline Default ('all_3d' across Rudra, Bosses, Enemies, Companions)
// 2. Grounded Ambient-Occlusion & Directional Brazier Contact Shadows
// 3. Persistent Battle Scars & Floor Decals (Blood Splatters, Scorch Craters,
//    Shattered Chola Armor Shards, and Planted Footstep Ash Prints)
// 4. Weapon-Bone Tapered Mesh Slash Ribbons (14-segment swept blade polygon)
// 5. 3D Weapon-Tip 4-Point Starburst Threat Glints (Gold Parriable / Crimson Unblockable)
// ============================================================================

import type { StaffStance } from './rules';
import { buildWeaponPoseTrailBands, type WeaponTrailSample } from './act1WeaponPoseTrail';
import {
  act1HeavyBreathingPalette, buildAct1HeavyBladeFlames,
  type Act1HeavyBreathingStance,
} from './act1HeavyBreathingFx';
import {
  drawAdditiveFlipbookCell,
  PHASE2_VFX_SHEETS,
  PARASHU_FLIPBOOK_ROWS,
  PARRY_SPARKS_FLIPBOOK_ROWS,
  DUNDUBHI_FLIPBOOK_ROWS,
  VRIKODARA_FLIPBOOK_ROWS,
} from './vfxFlipbook';

export type BattleScarKind =
  | 'blood_splatter'
  | 'scorch_crater'
  | 'shattered_armor'
  | 'footstep_ash';

export interface BattleScarDroplet {
  offsetX: number;
  offsetY: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
}

export interface BattleScarDecal {
  id: number;
  kind: BattleScarKind;
  x: number;
  y: number;
  angle: number;
  radius: number;
  alpha: number;
  age: number;
  maxAge: number;
  primaryColor: string;
  secondaryColor: string;
  droplets: BattleScarDroplet[];
}

export const MAX_BATTLE_SCARS = 56;

/**
 * Deterministic pseudo-random generator from a numeric seed so decals are
 * reproducible in unit tests and free of frame-to-frame shimmer.
 */
export function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Spawns a persistent battle scar on the arena stone floor and enforces a FIFO cap.
 */
export function spawnBattleScar(
  existing: BattleScarDecal[],
  params: {
    id: number;
    kind: BattleScarKind;
    x: number;
    y: number;
    angle?: number;
    scale?: number;
  }
): BattleScarDecal[] {
  const angle = params.angle ?? 0;
  const scale = Math.max(0.4, Math.min(2.4, params.scale ?? 1.0));
  const seedBase = params.id * 17.3 + params.x * 0.13 + params.y * 0.07;

  let radius = 24 * scale;
  let maxAge = 90; // Persistent across wave
  let alpha = 0.82;
  let primaryColor = '#5e0b14';
  let secondaryColor = '#2b0408';
  const droplets: BattleScarDroplet[] = [];

  if (params.kind === 'blood_splatter') {
    radius = 22 * scale;
    maxAge = 120;
    alpha = 0.84;
    primaryColor = '#6e0d18';
    secondaryColor = '#2a0408';
    for (let i = 0; i < 6; i++) {
      const s1 = seededUnit(seedBase + i * 3.1);
      const s2 = seededUnit(seedBase + i * 7.7);
      const s3 = seededUnit(seedBase + i * 11.3);
      const spreadAng = angle + (s1 - 0.5) * 0.95;
      const dist = radius * (0.45 + s2 * 1.15);
      droplets.push({
        offsetX: Math.cos(spreadAng) * dist,
        offsetY: Math.sin(spreadAng) * dist * 0.54,
        radiusX: (3.2 + s3 * 5.4) * scale,
        radiusY: (1.8 + s3 * 3.0) * scale,
        rotation: spreadAng,
      });
    }
  } else if (params.kind === 'scorch_crater') {
    radius = 34 * scale;
    maxAge = 140;
    alpha = 0.88;
    primaryColor = '#140f0d';
    secondaryColor = '#ff6a2b';
    for (let i = 0; i < 5; i++) {
      const s1 = seededUnit(seedBase + i * 5.3);
      const s2 = seededUnit(seedBase + i * 9.1);
      const rayAng = (i * Math.PI * 2) / 5 + (s1 - 0.5) * 0.4;
      const dist = radius * (0.55 + s2 * 0.55);
      droplets.push({
        offsetX: Math.cos(rayAng) * dist,
        offsetY: Math.sin(rayAng) * dist * 0.52,
        radiusX: 7.5 * scale,
        radiusY: 1.6 * scale,
        rotation: rayAng,
      });
    }
  } else if (params.kind === 'shattered_armor') {
    radius = 26 * scale;
    maxAge = 150;
    alpha = 0.86;
    primaryColor = '#c89d46';
    secondaryColor = '#3b3d46';
    for (let i = 0; i < 5; i++) {
      const s1 = seededUnit(seedBase + i * 4.7);
      const s2 = seededUnit(seedBase + i * 8.9);
      const s3 = seededUnit(seedBase + i * 13.1);
      const shardAng = s1 * Math.PI * 2;
      const dist = radius * (0.3 + s2 * 0.85);
      droplets.push({
        offsetX: Math.cos(shardAng) * dist,
        offsetY: Math.sin(shardAng) * dist * 0.54,
        radiusX: (4.0 + s3 * 4.5) * scale,
        radiusY: (2.2 + s3 * 2.4) * scale,
        rotation: shardAng + 0.5,
      });
    }
  } else {
    // 'footstep_ash'
    radius = 8.5 * scale;
    maxAge = 14;
    alpha = 0.44;
    primaryColor = '#231d18';
    secondaryColor = '#8c7a64';
  }

  const scar: BattleScarDecal = {
    id: params.id,
    kind: params.kind,
    x: params.x,
    y: params.y,
    angle,
    radius,
    alpha,
    age: 0,
    maxAge,
    primaryColor,
    secondaryColor,
    droplets,
  };

  const next = [...existing, scar];
  if (next.length > MAX_BATTLE_SCARS) {
    return next.slice(next.length - MAX_BATTLE_SCARS);
  }
  return next;
}

/**
 * Advances battle scar ages and removes expired footprints while keeping
 * heavy combat scars intact for the chamber duration.
 */
export function updateBattleScars(
  scars: BattleScarDecal[],
  dt: number
): BattleScarDecal[] {
  if (scars.length === 0) return scars;
  const out: BattleScarDecal[] = [];
  for (let i = 0; i < scars.length; i++) {
    const s = scars[i];
    const nextAge = s.age + dt;
    if (nextAge >= s.maxAge) continue;
    out.push({
      ...s,
      age: nextAge,
    });
  }
  return out;
}

export interface GroundedShadowParams {
  aoCoreRadiusX: number;
  aoCoreRadiusY: number;
  aoCoreAlpha: number;
  penumbraRadiusX: number;
  penumbraRadiusY: number;
  penumbraAlpha: number;
  directionalSkewX: number;
  directionalOffsetX: number;
  directionalOffsetY: number;
  warmBounceAlpha: number;
}

/**
 * Computes dual-layer Ambient Occlusion + Directional Brazier Shadow parameters
 * so 3D models and characters feel physically planted on the stone floor.
 */
export function computeGroundedContactShadow(params: {
  worldX: number;
  worldY: number;
  baseRadius: number;
  elevationY: number;
  lightSourceX: number;
  lightSourceY?: number;
}): GroundedShadowParams {
  const elevAtten = Math.max(0.28, Math.min(1, 1 - params.elevationY / 135));
  const dx = params.worldX - params.lightSourceX;
  const dy = params.worldY - (params.lightSourceY ?? params.worldY - 120);
  const distToLight = Math.hypot(dx, dy);

  const directionalSkewX = Math.max(-0.42, Math.min(0.42, dx / 480));
  const directionalOffsetX = Math.max(-6, Math.min(6, (dx / Math.max(140, distToLight)) * 4.8));
  const directionalOffsetY = Math.max(-2.5, Math.min(3.5, (dy / Math.max(140, distToLight)) * 2.0));

  const lightProximity = Math.max(0, Math.min(1, 1 - distToLight / 520));

  return {
    aoCoreRadiusX: Number((params.baseRadius * 0.78 * elevAtten).toFixed(2)),
    aoCoreRadiusY: Number((params.baseRadius * 0.34 * elevAtten).toFixed(2)),
    aoCoreAlpha: Number((0.86 * elevAtten).toFixed(3)),
    penumbraRadiusX: Number((params.baseRadius * 1.26 * (1.06 - elevAtten * 0.06)).toFixed(2)),
    penumbraRadiusY: Number((params.baseRadius * 0.54 * (1.06 - elevAtten * 0.06)).toFixed(2)),
    penumbraAlpha: Number((0.44 * elevAtten).toFixed(3)),
    directionalSkewX: Number(directionalSkewX.toFixed(3)),
    directionalOffsetX: Number(directionalOffsetX.toFixed(2)),
    directionalOffsetY: Number(directionalOffsetY.toFixed(2)),
    warmBounceAlpha: Number((0.12 + lightProximity * 0.18).toFixed(3)),
  };
}

export interface SlashRibbonNode {
  innerX: number;
  innerY: number;
  outerX: number;
  outerY: number;
  spineX: number;
  spineY: number;
  t: number;
  thickness: number;
}

export interface WeaponSlashRibbonMesh {
  nodes: SlashRibbonNode[];
  coreColor: string;
  plasmaColor: string;
  outerGlowColor: string;
  tipX: number;
  tipY: number;
}

/**
 * Generates a 14-segment tapered weapon-bone slash ribbon mesh in isometric space.
 * Replaces flat oval strokes with a swept crescent polygon that tapers at tail and tip.
 */
export function computeWeaponSlashRibbon(params: {
  originX: number;
  originY: number;
  aimAngle: number;
  swingProgress: number;
  radius: number;
  stance: StaffStance;
  isHeavy: boolean;
  isRiposte?: boolean;
  comboStep?: number;
}): WeaponSlashRibbonMesh {
  const segments = 14;
  const rawProg = Math.max(0, Math.min(1, params.swingProgress));
  // The blade sweeps from startup to release; the luminous crescent is the
  // RECENT TRAIL BEHIND the moving axe, not a complete stationary ring.
  const prog =
    rawProg < 0.5
      ? 2 * rawProg * rawProg
      : 1 - Math.pow(-2 * rawProg + 2, 2) / 2;
  const arcSpan = params.isHeavy ? Math.PI * 0.96 : Math.PI * 0.78;
  const reverseDir = !params.isHeavy && params.comboStep === 2 ? -1 : 1;
  const bladeAngle = params.aimAngle - reverseDir * arcSpan * 0.52 + reverseDir * arcSpan * prog;
  const recentSweep = arcSpan * (0.24 + 0.16 * Math.sin(prog * Math.PI));
  const startAngle = bladeAngle - reverseDir * recentSweep;

  let coreColor = '#fff9e6';
  let plasmaColor = '#ff9d2e';
  let outerGlowColor = '#e0281e';

  if (params.isRiposte) {
    coreColor = '#ffffff';
    plasmaColor = '#ffd86b';
    outerGlowColor = '#38bdf8';
  } else if (params.stance === 'pillar') {
    coreColor = '#fffbe8';
    plasmaColor = '#ffd24c';
    outerGlowColor = '#ff7b1c';
  } else if (params.stance === 'thrust') {
    coreColor = '#eaffff';
    plasmaColor = '#4ce8ff';
    outerGlowColor = '#14b8a6';
  }

  const maxThickness = params.isHeavy ? params.radius * 0.24 : params.radius * 0.18;
  const isoSquashY = 0.66;
  const nodes: SlashRibbonNode[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const theta = startAngle + reverseDir * recentSweep * t;
    // Taper profile: sharp tail (t=0), wide belly (t=0.68), razor tip (t=1.0)
    const taper = Math.sin(Math.pow(t, 0.72) * Math.PI);
    const thickness = maxThickness * taper;

    const rInner = Math.max(8, params.radius - thickness * 0.65);
    const rOuter = params.radius + thickness * 0.45;
    const rSpine = (rInner + rOuter) * 0.5;

    const cosA = Math.cos(theta);
    const sinA = Math.sin(theta) * isoSquashY;

    nodes.push({
      innerX: params.originX + cosA * rInner,
      innerY: params.originY + sinA * rInner,
      outerX: params.originX + cosA * rOuter,
      outerY: params.originY + sinA * rOuter,
      spineX: params.originX + cosA * rSpine,
      spineY: params.originY + sinA * rSpine,
      t,
      thickness,
    });
  }

  const lastNode = nodes[nodes.length - 1];
  return {
    nodes,
    coreColor,
    plasmaColor,
    outerGlowColor,
    tipX: lastNode ? lastNode.spineX : params.originX,
    tipY: lastNode ? lastNode.spineY : params.originY,
  };
}

/**
 * Computes the exact world-space coordinates of an enemy's raised weapon tip
 * during attack windup so the Sekiro/God-of-War 4-point starburst glint flashes
 * directly on the weapon hand rather than only on the floor.
 */
export function computeWeaponTipGlintPosition(params: {
  enemyX: number;
  enemyY: number;
  facing: 1 | -1;
  windupProgress: number;
  isBoss: boolean;
  attackKind: 'cone' | 'corridor' | 'shockwave';
}): {
  x: number;
  y: number;
  starRadius: number;
  isParriable: boolean;
  primaryColor: string;
  coreColor: string;
} {
  const wp = Math.max(0, Math.min(1, params.windupProgress));
  const liftY = (params.isBoss ? 46 : 32) + wp * (params.isBoss ? 12 : 9);
  const reachX = params.facing * ((params.isBoss ? 18 : 12) - wp * 3);
  const isParriable = params.attackKind !== 'shockwave';

  return {
    x: Number((params.enemyX + reachX).toFixed(2)),
    y: Number((params.enemyY - liftY).toFixed(2)),
    starRadius: Number(((params.isBoss ? 19 : 13) * (0.85 + wp * 0.35)).toFixed(2)),
    isParriable,
    primaryColor: isParriable ? '#ffd86b' : '#ff2a3c',
    coreColor: isParriable ? '#fffdf2' : '#ffd6d9',
  };
}

// ============================================================================
// CANVAS RENDERING HELPERS FOR PILLAR 1
// ============================================================================

export function renderBattleScarsOnFloor(
  ctx: CanvasRenderingContext2D,
  scars: BattleScarDecal[]
): void {
  if (scars.length === 0) return;
  ctx.save();
  for (let i = 0; i < scars.length; i++) {
    const s = scars[i];
    const fadeRatio =
      s.age > s.maxAge * 0.75
        ? Math.max(0, 1 - (s.age - s.maxAge * 0.75) / (s.maxAge * 0.25))
        : 1;
    const alpha = s.alpha * fadeRatio;
    if (alpha <= 0.02) continue;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.globalAlpha = alpha;

    if (s.kind === 'blood_splatter') {
      drawAdditiveFlipbookCell(ctx, {
        sheetSpec: PHASE2_VFX_SHEETS.parryAndHitSparks4x2,
        col: s.id % 4,
        row: PARRY_SPARKS_FLIPBOOK_ROWS.DIRECTIONAL_HIT_SPLATTER,
        x: 0,
        y: 0,
        width: s.radius * 2.8,
        height: s.radius * 2.2,
        rotationRad: s.angle,
        scaleY: 0.56,
        alpha: Math.min(0.75, alpha * 0.85),
      });
    } else if (s.kind === 'scorch_crater') {
      drawAdditiveFlipbookCell(ctx, {
        sheetSpec: PHASE2_VFX_SHEETS.vrikodaraVacuumAndSlag4x2,
        col: s.id % 4,
        row: VRIKODARA_FLIPBOOK_ROWS.MOLTEN_SLAG_GEYSERS,
        x: 0,
        y: 0,
        width: s.radius * 2.6,
        height: s.radius * 2.2,
        rotationRad: s.angle,
        scaleY: 0.54,
        alpha: Math.min(0.65, alpha * 0.72),
      });
    } else if (s.kind === 'shattered_armor') {
      drawAdditiveFlipbookCell(ctx, {
        sheetSpec: PHASE2_VFX_SHEETS.dundubhiShockwaveAndShatter4x2,
        col: s.id % 4,
        row: DUNDUBHI_FLIPBOOK_ROWS.PILLAR_SANDSTONE_SHATTER,
        x: 0,
        y: 0,
        width: s.radius * 2.6,
        height: s.radius * 2.2,
        rotationRad: s.angle,
        scaleY: 0.58,
        alpha: Math.min(0.72, alpha * 0.8),
      });
    }

    ctx.restore();
  }
  ctx.restore();
}

let cachedShadowStampCanvas: HTMLCanvasElement | null = null;

function getSharedShadowStampCanvas(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (cachedShadowStampCanvas) return cachedShadowStampCanvas;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const sCtx = c.getContext('2d');
  if (sCtx) {
    const grad = sCtx.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    grad.addColorStop(0.58, 'rgba(6, 3, 4, 0.56)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 64, 64);
  }
  cachedShadowStampCanvas = c;
  return cachedShadowStampCanvas;
}

let cachedSaffronFootStampCanvas: HTMLCanvasElement | null = null;

function getSharedSaffronFootStampCanvas(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (cachedSaffronFootStampCanvas) return cachedSaffronFootStampCanvas;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const sCtx = c.getContext('2d');
  if (sCtx) {
    const grad = sCtx.createRadialGradient(32, 32, 16, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 179, 71, 0)');
    grad.addColorStop(0.55, 'rgba(255, 179, 71, 0.42)');
    grad.addColorStop(0.82, 'rgba(255, 179, 71, 0.74)');
    grad.addColorStop(1, 'rgba(255, 179, 71, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 64, 64);
  }
  cachedSaffronFootStampCanvas = c;
  return cachedSaffronFootStampCanvas;
}

export function drawGrounded3DContactShadow(
  ctx: CanvasRenderingContext2D,
  params: {
    worldX: number;
    worldY: number;
    baseRadius: number;
    elevationY: number;
    lightSourceX: number;
    accentColor?: string;
    isPlayer?: boolean;
  }
): void {
  const shadow = computeGroundedContactShadow(params);
  const stamp = getSharedShadowStampCanvas();
  if (!stamp) return;

  ctx.save();
  ctx.translate(params.worldX, params.worldY);

  // 1. Directional skewed soft penumbra (clear dark ground shadow)
  ctx.save();
  ctx.translate(shadow.directionalOffsetX, shadow.directionalOffsetY);
  ctx.transform(1, 0, shadow.directionalSkewX, 1, 0, 0);
  ctx.globalAlpha = Math.min(0.62, shadow.penumbraAlpha * 1.18);
  ctx.drawImage(
    stamp,
    -shadow.penumbraRadiusX,
    -shadow.penumbraRadiusY,
    shadow.penumbraRadiusX * 2,
    shadow.penumbraRadiusY * 2
  );
  ctx.restore();

  // 2. Tight boot-level AO core
  ctx.save();
  ctx.globalAlpha = Math.min(0.94, shadow.aoCoreAlpha * 1.15);
  const coreRx = shadow.aoCoreRadiusX * 1.18;
  const coreRy = shadow.aoCoreRadiusY * 1.18;
  ctx.drawImage(stamp, -coreRx, -coreRy, coreRx * 2, coreRy * 2);
  ctx.restore();

  // 3. Subtle saffron (#ffb347) foot contact ring on floor Layer 2 for Rudra so player never loses center in 8-enemy swarms
  const isRudraFootRing =
    params.isPlayer ||
    params.accentColor === '#ffb347' ||
    params.accentColor === '#d4a548';
  if (isRudraFootRing) {
    const saffronStamp = getSharedSaffronFootStampCanvas();
    if (saffronStamp) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.58;
      const ringRx = params.baseRadius * 1.48;
      const ringRy = params.baseRadius * 0.68;
      ctx.drawImage(saffronStamp, -ringRx, -ringRy, ringRx * 2, ringRy * 2);
      ctx.restore();
    }
  }

  ctx.restore();
}

/**
 * The theatrical layer BEHIND Rudra during Smash/Pillar/Thrust heavy attacks.
 * Unlike an orbiting billboard, every sweeping fire/tide/lightning tongue is
 * rooted at a measured 3D blade-head sample (the same pose as the hero).
 * The brightest narrow blade core is rendered above the player separately.
 */
export function renderAct1HeavyParashuBreathing(
  ctx:CanvasRenderingContext2D,
  samples:WeaponTrailSample[],
  params:{
    stance:Act1HeavyBreathingStance;
    focus:number;
    alpha:number;
    action:'heavy_unleash'|'execute';
  }
):boolean {
  const tongues=buildAct1HeavyBladeFlames(samples,params);
  if(!tongues.length)return false;
  const colors=act1HeavyBreathingPalette(params.stance);
  ctx.save();
  ctx.globalCompositeOperation='source-over';
  ctx.lineJoin='round';
  // From outer ink to oversaturated pigment to near-white cutting-edge;
  // each body tapers all the way to an individually measured-path-rooted tip.
  for(const flame of tongues) {
    const {root,tip,bendOut,bendIn,leftBase,rightBase,opacity}=flame;
    const paintPath=()=>{
      ctx.beginPath();
      ctx.moveTo(leftBase.x,leftBase.y);
      ctx.quadraticCurveTo(bendOut.x,bendOut.y,tip.x,tip.y);
      ctx.quadraticCurveTo(bendIn.x,bendIn.y,rightBase.x,rightBase.y);
      ctx.quadraticCurveTo(root.x,root.y,leftBase.x,leftBase.y);
      ctx.closePath();
    };
    paintPath();
    ctx.globalAlpha=opacity*0.82;
    ctx.lineWidth=3;
    ctx.strokeStyle=colors.soot;
    ctx.stroke();

    // One restrained gradient per flame, with a vivid electric/orange center
    // and ink-suppressed edges. No full-screen blur canvas or unbounded pool.
    const g=ctx.createLinearGradient(root.x,root.y,tip.x,tip.y);
    g.addColorStop(0,colors.hot);
    g.addColorStop(0.19,colors.pigment);
    g.addColorStop(0.62,colors.ember);
    g.addColorStop(1,colors.ember+'00');
    ctx.globalAlpha=opacity;
    ctx.fillStyle=g;
    ctx.fill();

    ctx.globalAlpha=opacity*0.92;
    ctx.strokeStyle=colors.rim;
    ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.moveTo(root.x,root.y);
    ctx.quadraticCurveTo(bendOut.x,bendOut.y,tip.x,tip.y);
    ctx.stroke();

    // Hand-inked hot vein, not random sprites floating in the arena.
    ctx.globalAlpha=opacity*0.66;
    ctx.strokeStyle=colors.hot;
    ctx.lineWidth=0.95;
    ctx.beginPath();
    ctx.moveTo(root.x,root.y);
    ctx.quadraticCurveTo(bendIn.x,bendIn.y,tip.x,tip.y);
    ctx.stroke();
  }
  ctx.restore();
  return true;
}

/**
 * Three.js head-socket path renderer. These are the very same XY positions
 * projected from the cached Parashu frame baked for Rudra's game sprite;
 * no unrelated screen-space circle, GPU readback, or copied texture needed.
 */
export function renderWeaponPoseTrail(
  ctx: CanvasRenderingContext2D,
  samples: WeaponTrailSample[],
  alpha: number,
  colors: { coreColor: string; plasmaColor: string; outerGlowColor: string },
  isHeavy: boolean
): boolean {
  // Round abrupt sampled corners while retaining the true blade endpoints.
  const bands = buildWeaponPoseTrailBands(samples, isHeavy ? 21 : 14, true);
  if (bands.length < 2 || alpha <= 0.01) return false;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  const fillBand = (scale: number, color: string, opacity: number) => {
    ctx.globalAlpha = clampedAlpha * opacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < bands.length; i++) {
      const b = bands[i];
      const x = b.x + (b.leftX-b.x)*scale;
      const y = b.y + (b.leftY-b.y)*scale;
      if (i === 0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    for (let i = bands.length-1; i >= 0; i--) {
      const b = bands[i];
      ctx.lineTo(b.x+(b.rightX-b.x)*scale,b.y+(b.rightY-b.y)*scale);
    }
    ctx.closePath();
    ctx.fill();
  };
  // Ink > vivid pigment > amber-white core, without bloom on the actor's face.
  fillBand(1.26, '#13070d', 0.89);
  fillBand(1.0, colors.outerGlowColor, 0.85);
  fillBand(0.68, colors.plasmaColor, 0.94);
  fillBand(0.24, colors.coreColor, 0.98);

  // Three brush-fire filaments hug the ACTUAL Parashu path. Every vertex
  // lies within six pixels of a sampled cutting edge; no free-floating
  // orbital slash, fixed screen arc or random GPU particle emitter.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const filaments = [
    {normal: -0.20, width: 1.65, opacity: 0.85, color: colors.coreColor},
    {normal:  0.32, width: 1.35, opacity: 0.64, color: colors.plasmaColor},
    {normal:  0.38, width: 0.90, opacity: 0.46, color: colors.coreColor},
  ];
  for (const filament of filaments) {
    ctx.beginPath();
    let started = false;
    for (let i = Math.max(0, bands.length - 8); i < bands.length; i++) {
      const b = bands[i];
      const x = b.x + (b.leftX - b.x) * filament.normal;
      const y = b.y + (b.leftY - b.y) * filament.normal;
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.globalAlpha = clampedAlpha * filament.opacity;
    ctx.strokeStyle = filament.color;
    ctx.lineWidth = filament.width;
    ctx.stroke();
  }
  ctx.restore();
  return true;
}

/**
 * During a baked-pose transition a single valid socket point may be all we
 * have. Keep the hot edge on that actual point; never hallucinate a wide
 * crescent while 3D source animation has not advanced to a second sample.
 */
export function renderParashuBladeTipGlint(
  ctx: CanvasRenderingContext2D,
  point: {x:number;y:number},
  alpha: number,
  stance: 'smash' | 'pillar' | 'thrust' | string
): boolean {
  if (![point.x,point.y,alpha].every(Number.isFinite) || alpha <= 0.01)
    return false;
  const opacity = Math.max(0,Math.min(1,alpha));
  const accent = stance === 'thrust' ? '#6fefff'
    : stance === 'pillar' ? '#5bffc1' : '#ffb66b';
  ctx.save();
  ctx.globalCompositeOperation='source-over';
  ctx.lineCap='round';
  ctx.strokeStyle='#12080b';
  ctx.lineWidth=5.4;
  ctx.globalAlpha=opacity*0.8;
  ctx.beginPath();ctx.moveTo(point.x-5,point.y+2);ctx.lineTo(point.x+5,point.y-2);ctx.stroke();
  ctx.strokeStyle=accent;
  ctx.lineWidth=2.8;
  ctx.globalAlpha=opacity;
  ctx.beginPath();ctx.moveTo(point.x-5,point.y+2);ctx.lineTo(point.x+5,point.y-2);ctx.stroke();
  ctx.lineWidth=1.3;
  ctx.strokeStyle='#fff1c3';
  ctx.beginPath();ctx.moveTo(point.x-2,point.y+3);ctx.lineTo(point.x+2,point.y-3);ctx.stroke();
  ctx.restore();
  return true;
}

export function renderWeaponBoneSlashRibbon(
  ctx: CanvasRenderingContext2D,
  mesh: WeaponSlashRibbonMesh,
  alpha: number
): void {
  if (mesh.nodes.length < 2 || alpha <= 0.01) return;

  // Layer the physical crescent entirely in the player's world-space camera
  // pass. Unlike a free-floating WebGL wheel this moves with Rudra every
  // frame. Hand-painted ink border > saturated breathing energy > narrow
  // rice-paper-hot spine. Avoid large radial bloom and rectangle clipping.
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const visible = Math.max(0, Math.min(1, alpha));

  const drawTaperedBand = (innerBlend: number, outerBlend: number, color: string, opacity: number) => {
    const nodes = mesh.nodes;
    const mix = (a: number, b: number, t: number) => a + (b - a) * t;
    ctx.beginPath();
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const x = mix(n.spineX, n.outerX, outerBlend);
      const y = mix(n.spineY, n.outerY, outerBlend);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      ctx.lineTo(mix(n.spineX, n.innerX, innerBlend), mix(n.spineY, n.innerY, innerBlend));
    }
    ctx.closePath();
    ctx.globalAlpha = visible * opacity;
    ctx.fillStyle = color;
    ctx.fill();
  };

  // Outer sumi ink is essential against warm fire-lit temple floors.
  drawTaperedBand(1.16, 1.16, '#12080c', 0.92);
  drawTaperedBand(0.90, 0.86, mesh.outerGlowColor, 0.82);
  drawTaperedBand(0.58, 0.58, mesh.plasmaColor, 0.96);
  drawTaperedBand(0.16, 0.16, mesh.coreColor, 0.98);

  const nodes = mesh.nodes;
  ctx.beginPath();
  for (let i = 0; i < nodes.length; i++) {
    if (i === 0) ctx.moveTo(nodes[i].spineX, nodes[i].spineY);
    else ctx.lineTo(nodes[i].spineX, nodes[i].spineY);
  }
  ctx.globalAlpha = visible * 0.96;
  ctx.strokeStyle = mesh.coreColor;
  ctx.lineWidth = 1.7;
  ctx.stroke();

  // The hot tip visually points in the attack direction and quickly vanishes
  // with the trail; it is not an independent screen-wide particle burst.
  const tip = nodes[nodes.length - 1];
  ctx.globalAlpha = visible * 0.84;
  ctx.fillStyle = mesh.coreColor;
  ctx.beginPath();
  ctx.arc(tip.spineX, tip.spineY, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function renderWeaponTipStarburstGlint(
  ctx: CanvasRenderingContext2D,
  glint: ReturnType<typeof computeWeaponTipGlintPosition>,
  nowMs: number
): void {
  const frameCol = Math.floor(nowMs * 0.012) % 4;
  drawAdditiveFlipbookCell(ctx, {
    sheetSpec: PHASE2_VFX_SHEETS.parryAndHitSparks4x2,
    col: frameCol,
    row:
      glint.primaryColor === '#ffd86b'
        ? PARRY_SPARKS_FLIPBOOK_ROWS.VEDIC_PARRY_FLASH
        : PARRY_SPARKS_FLIPBOOK_ROWS.DIRECTIONAL_HIT_SPLATTER,
    x: glint.x,
    y: glint.y,
    width: glint.starRadius * 3.4,
    height: glint.starRadius * 3.4,
    rotationRad: nowMs * 0.0055,
    alpha: 0.92,
  });
}
