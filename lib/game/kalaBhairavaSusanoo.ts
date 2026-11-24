/**
 * KALA-BHAIRAVA ASTRAL AVATAR (SUSANOO-INSPIRED RAGE), DEVANAGARI COMBAT STAMPS,
 * SAVITRI LANTERN HUD LOGIC, AND 8-CHAMBER 60-30-10 BIOME PROFILES
 *
 * Pure state/math helpers are fully decoupled from DOM/Canvas so node:test
 * can verify combat feel, lighting contrast, and animation progression directly.
 */

export const KALA_BHAIRAVA_DURATION_SEC = 10.0;
export const KALA_BHAIRAVA_DAMAGE_MULT = 1.48;
export const KALA_BHAIRAVA_REACH_BONUS_PX = 64;

export type DevanagariStampKind = 'rage' | 'heavy' | 'break' | 'perfect_dash';

export interface DevanagariStampSpec {
  id: number;
  kind: DevanagariStampKind;
  glyph: string;
  subtitle: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  primaryColor: string;
  strokeColor: string;
  accentColor: string;
  scale: number;
}

export const DEVANAGARI_STAMP_CATALOG: Record<
  DevanagariStampKind,
  {
    glyph: string;
    subtitle: string;
    primaryColor: string;
    strokeColor: string;
    accentColor: string;
    maxLife: number;
    scale: number;
  }
> = {
  rage: {
    glyph: 'रौद्र',
    subtitle: 'KALA-BHAIRAVA',
    primaryColor: '#ff5226',
    strokeColor: '#120306',
    accentColor: '#ffd46b',
    maxLife: 1.05,
    scale: 1.32,
  },
  heavy: {
    glyph: 'प्रहार',
    subtitle: 'PARASHU CLEAVE',
    primaryColor: '#ffd46b',
    strokeColor: '#140804',
    accentColor: '#ff6e30',
    maxLife: 0.72,
    scale: 1.06,
  },
  break: {
    glyph: 'विच्छेद',
    subtitle: 'GUARD SHATTER',
    primaryColor: '#fff0c2',
    strokeColor: '#160408',
    accentColor: '#e63946',
    maxLife: 0.86,
    scale: 1.18,
  },
  perfect_dash: {
    glyph: 'अवहेलना',
    subtitle: 'PHANTOM STEP',
    primaryColor: '#8cf2ff',
    strokeColor: '#041224',
    accentColor: '#d4a548',
    maxLife: 0.64,
    scale: 0.94,
  },
};

let nextStampId = 1;

export function createDevanagariStamp(
  kind: DevanagariStampKind,
  x: number,
  y: number
): DevanagariStampSpec {
  const meta = DEVANAGARI_STAMP_CATALOG[kind];
  return {
    id: nextStampId++,
    kind,
    glyph: meta.glyph,
    subtitle: meta.subtitle,
    x,
    y,
    life: 0,
    maxLife: meta.maxLife,
    primaryColor: meta.primaryColor,
    strokeColor: meta.strokeColor,
    accentColor: meta.accentColor,
    scale: meta.scale,
  };
}

export interface SavitriLanternHudState {
  label: string;
  flameColor: string;
  coreColor: string;
  intensity: number;
  flickerSpeed: number;
  isEclipsedByRage: boolean;
}

/**
 * Computes Savitri's Lantern visual state on the HUD.
 * Using Kala-Bhairava Rage (Rudra-Kopa) visibly dims Savitri's warm saffron flame
 * toward dying vermilion ash, reinforcing the narrative cost of wrath.
 */
export function computeSavitriLanternHudState(
  rageUses: number,
  susanooActive: boolean
): SavitriLanternHudState {
  if (susanooActive) {
    return {
      label: 'ECLIPSED · रौद्र',
      flameColor: '#d92836',
      coreColor: '#ff7b54',
      intensity: 0.24,
      flickerSpeed: 11.0,
      isEclipsedByRage: true,
    };
  }
  const uses = Math.max(0, Math.floor(rageUses));
  if (uses === 0) {
    return {
      label: 'RADIANT SAFFRON',
      flameColor: '#f5b942',
      coreColor: '#fff5cc',
      intensity: 1.0,
      flickerSpeed: 2.8,
      isEclipsedByRage: false,
    };
  }
  if (uses <= 2) {
    return {
      label: 'WAXING EMBER',
      flameColor: '#e88b35',
      coreColor: '#ffe0a3',
      intensity: 0.72,
      flickerSpeed: 4.4,
      isEclipsedByRage: false,
    };
  }
  return {
    label: 'ASH-DIMMED',
    flameColor: '#b83c2e',
    coreColor: '#f29a6b',
    intensity: 0.42,
    flickerSpeed: 6.5,
    isEclipsedByRage: false,
  };
}

/**
 * Fixes the frozen axe-swing animation bug by computing exact normalized [0..0.99]
 * progress from the active action's timer and duration rather than a fixed 5.2x scalar
 * that clamped to 1.0 in 0.19 seconds.
 */
export function computeNormalizedAttackProgress(
  action: string,
  actionTimer: number,
  actionDuration: number,
  fallbackProgress = 0
): number {
  const isAttackAction =
    action === 'light_attack' || action === 'heavy_unleash' || action === 'execute';
  if (!isAttackAction) {
    return Math.max(0, Math.min(0.99, fallbackProgress));
  }
  const safeDuration = Math.max(0.05, actionDuration);
  const raw = 1 - Math.max(0, actionTimer) / safeDuration;
  return Math.max(0, Math.min(0.99, raw));
}

/**
 * Projects a 3D world ground point (0, footY, 0) through a Three.js Perspective or
 * Orthographic camera matrix to compute the exact normalized [0..1] vertical pixel ratio
 * from the top of the studio canvas where the character's feet touch the floor.
 * Anchoring 2D canvas draws at `-drawSize * footAnchorRatio` eliminates floating sprites!
 */
export interface ProjectableCameraLike {
  updateMatrixWorld?: (force?: boolean) => void;
  updateProjectionMatrix?: () => void;
  matrixWorldInverse: { elements: ArrayLike<number> };
  projectionMatrix: { elements: ArrayLike<number> };
}

export function computeCameraFootAnchorRatio(
  camera: ProjectableCameraLike,
  footY = 0
): number {
  camera.updateMatrixWorld?.(true);
  camera.updateProjectionMatrix?.();

  const vm = camera.matrixWorldInverse.elements;
  const pm = camera.projectionMatrix.elements;

  // Transform world point (0, footY, 0, 1) into view space
  const vx = vm[4] * footY + vm[12];
  const vy = vm[5] * footY + vm[13];
  const vz = vm[6] * footY + vm[14];
  const vw = vm[7] * footY + vm[15];

  // Transform view point into clip space
  const cy = pm[1] * vx + pm[5] * vy + pm[9] * vz + pm[13] * vw;
  const cw = pm[3] * vx + pm[7] * vy + pm[11] * vz + pm[15] * vw;
  if (!Number.isFinite(cw) || Math.abs(cw) < 1e-6) {
    return 0.72;
  }
  const ndcY = cy / cw;
  // Convert NDC y (+1 top, -1 bottom) to canvas top-down ratio (0 top, 1 bottom)
  const topDownRatio = (1 - ndcY) * 0.5;
  return Math.max(0.48, Math.min(0.94, topDownRatio));
}

/**
 * Maps a raw [0..1] attack progress into the active cleave window [startFrac..endFrac]
 * of an FBX combat clip so Rudra immediately enters the Parashu cleave arc instead of
 * stalling on idle windup frames.
 */
export function computeTrimmedCleaveClock(
  normalizedProgress: number,
  startFrac = 0.14,
  endFrac = 0.88
): number {
  const clamped = Math.max(0, Math.min(0.999, normalizedProgress));
  const lo = Math.max(0, Math.min(0.45, startFrac));
  const hi = Math.max(lo + 0.1, Math.min(0.98, endFrac));
  return lo + clamped * (hi - lo);
}

export interface SusanooDeflectOutcome {
  deflected: boolean;
  finalDamage: number;
  applyHitstun: boolean;
  knockbackImpulse: number;
  counterDamage: number;
}

/**
 * 100% True Chakra Armor Invincibility for Kala-Bhairava Susanoo:
 * While `transformTimer > 0`, ALL incoming hits deal 0 HP damage, trigger 0 hitstun,
 * and rebound with a golden chakra shockwave knocking attackers back.
 */
export function computeSusanooDeflectOutcome(
  transformTimer: number,
  incomingDamage: number
): SusanooDeflectOutcome {
  if (transformTimer > 0) {
    return {
      deflected: true,
      finalDamage: 0,
      applyHitstun: false,
      knockbackImpulse: 440,
      counterDamage: Math.max(12, Math.round(incomingDamage * 0.65)),
    };
  }
  return {
    deflected: false,
    finalDamage: Math.max(0, incomingDamage),
    applyHitstun: true,
    knockbackImpulse: 0,
    counterDamage: 0,
  };
}

export interface ChamberBiomeProfile {
  id: number;
  biomeKey: string;
  baseCenterHex: string;
  baseMidHex: string;
  baseEdgeHex: string;
  moodCenterRgba: string;
  moodMidRgba: string;
  moodEdgeRgba: string;
  flagstoneStrokeRgba: string;
  rimAccentHex: string;
  horizonGlowRgba: string;
}

/**
 * Distinct 60-30-10 atmospheric color-grading profiles across all 8 Act I chambers
 * so every arena has unmistakable visual identity and contrast for anime VFX.
 */
export const CHAMBER_BIOME_PROFILES: ChamberBiomeProfile[] = [
  {
    id: 1,
    biomeKey: 'vaitarani_indigo_mist',
    baseCenterHex: '#253952',
    baseMidHex: '#162238',
    baseEdgeHex: '#0a101e',
    moodCenterRgba: 'rgba(14, 34, 62, 0.16)',
    moodMidRgba: 'rgba(8, 20, 42, 0.36)',
    moodEdgeRgba: 'rgba(4, 9, 20, 0.66)',
    flagstoneStrokeRgba: 'rgba(140, 210, 255, 0.14)',
    rimAccentHex: '#7dd3fc',
    horizonGlowRgba: 'rgba(56, 189, 248, 0.16)',
  },
  {
    id: 2,
    biomeKey: 'kurukshetra_ochre_twilight',
    baseCenterHex: '#63432b',
    baseMidHex: '#3f281a',
    baseEdgeHex: '#1c100b',
    moodCenterRgba: 'rgba(46, 26, 10, 0.15)',
    moodMidRgba: 'rgba(28, 15, 8, 0.36)',
    moodEdgeRgba: 'rgba(12, 6, 4, 0.68)',
    flagstoneStrokeRgba: 'rgba(245, 196, 81, 0.14)',
    rimAccentHex: '#f5be4f',
    horizonGlowRgba: 'rgba(234, 168, 66, 0.18)',
  },
  {
    id: 3,
    biomeKey: 'raktabija_crimson_pyre',
    baseCenterHex: '#572226',
    baseMidHex: '#331217',
    baseEdgeHex: '#150609',
    moodCenterRgba: 'rgba(62, 12, 18, 0.18)',
    moodMidRgba: 'rgba(34, 7, 14, 0.40)',
    moodEdgeRgba: 'rgba(12, 3, 7, 0.72)',
    flagstoneStrokeRgba: 'rgba(255, 118, 92, 0.14)',
    rimAccentHex: '#ff6442',
    horizonGlowRgba: 'rgba(220, 38, 38, 0.20)',
  },
  {
    id: 4,
    biomeKey: 'dundubhi_bronze_tempest',
    baseCenterHex: '#4f3a1c',
    baseMidHex: '#2b2012',
    baseEdgeHex: '#100c08',
    moodCenterRgba: 'rgba(44, 30, 8, 0.18)',
    moodMidRgba: 'rgba(20, 15, 10, 0.40)',
    moodEdgeRgba: 'rgba(7, 6, 10, 0.74)',
    flagstoneStrokeRgba: 'rgba(255, 210, 110, 0.17)',
    rimAccentHex: '#ffd269',
    horizonGlowRgba: 'rgba(250, 204, 21, 0.22)',
  },
  {
    id: 5,
    biomeKey: 'kaala_jade_sanctum',
    baseCenterHex: '#1c423a',
    baseMidHex: '#102925',
    baseEdgeHex: '#071412',
    moodCenterRgba: 'rgba(10, 44, 36, 0.16)',
    moodMidRgba: 'rgba(6, 26, 24, 0.38)',
    moodEdgeRgba: 'rgba(3, 12, 12, 0.70)',
    flagstoneStrokeRgba: 'rgba(74, 222, 178, 0.14)',
    rimAccentHex: '#34d399',
    horizonGlowRgba: 'rgba(16, 185, 129, 0.18)',
  },
  {
    id: 6,
    biomeKey: 'broken_seals_eclipse_violet',
    baseCenterHex: '#35214d',
    baseMidHex: '#1f1230',
    baseEdgeHex: '#0c0716',
    moodCenterRgba: 'rgba(36, 16, 58, 0.18)',
    moodMidRgba: 'rgba(20, 9, 36, 0.40)',
    moodEdgeRgba: 'rgba(8, 4, 16, 0.72)',
    flagstoneStrokeRgba: 'rgba(196, 148, 255, 0.15)',
    rimAccentHex: '#c084fc',
    horizonGlowRgba: 'rgba(168, 85, 247, 0.19)',
  },
  {
    id: 7,
    biomeKey: 'shishira_ash_canyon',
    baseCenterHex: '#4a3533',
    baseMidHex: '#2c1d1e',
    baseEdgeHex: '#120a0b',
    moodCenterRgba: 'rgba(42, 24, 22, 0.17)',
    moodMidRgba: 'rgba(24, 12, 14, 0.40)',
    moodEdgeRgba: 'rgba(9, 5, 8, 0.72)',
    flagstoneStrokeRgba: 'rgba(255, 180, 152, 0.14)',
    rimAccentHex: '#fb923c',
    horizonGlowRgba: 'rgba(249, 115, 22, 0.19)',
  },
  {
    id: 8,
    biomeKey: 'vrikodara_molten_furnace',
    baseCenterHex: '#5e1a0f',
    baseMidHex: '#360d09',
    baseEdgeHex: '#140404',
    moodCenterRgba: 'rgba(72, 14, 6, 0.22)',
    moodMidRgba: 'rgba(38, 7, 8, 0.44)',
    moodEdgeRgba: 'rgba(12, 3, 5, 0.76)',
    flagstoneStrokeRgba: 'rgba(255, 142, 66, 0.18)',
    rimAccentHex: '#ff5722',
    horizonGlowRgba: 'rgba(239, 68, 68, 0.24)',
  },
];

export function getChamberBiomeProfile(chamberIndex: number): ChamberBiomeProfile {
  const clamped = Math.max(0, Math.min(CHAMBER_BIOME_PROFILES.length - 1, Math.floor(chamberIndex)));
  return CHAMBER_BIOME_PROFILES[clamped] || CHAMBER_BIOME_PROFILES[0];
}

export interface KalaBhairavaRenderParams {
  x: number;
  y: number;
  facing: 1 | -1;
  slashAngle: number;
  weaponSwingProgress: number;
  isAttacking: boolean;
  transformTimer: number;
  nowMs: number;
}

/**
 * Renders the towering Kala-Bhairava Astral Avatar (Susanoo-inspired) rising behind Rudra
 * during Rudra-Kopa Rage (`transformTimer > 0`):
 * - Translucent molten-crimson & Chola-gold spectral ribcage + spinal chakras with Sumi-e ink outlines
 * - Horned Rudra Temple War-Mask with blazing Third Eye (Trinetra)
 * - Colossal spectral arms & giant astral Parashu Great-Axe synchronized to Rudra's live swing angle
 */
export function renderKalaBhairavaSusanooAvatar(
  ctx: CanvasRenderingContext2D,
  params: KalaBhairavaRenderParams
): void {
  if (params.transformTimer <= 0) return;

  const t = params.nowMs * 0.001;
  const fadeIn = Math.min(1, (KALA_BHAIRAVA_DURATION_SEC - params.transformTimer) / 0.35);
  const fadeOut = Math.min(1, params.transformTimer / 0.65);
  const alpha = Math.max(0, Math.min(1, Math.min(fadeIn, fadeOut)));
  if (alpha <= 0.01) return;

  const hoverY = Math.sin(t * 4.2) * 5;
  const pulse = 0.92 + Math.sin(t * 7.5) * 0.08;
  const dir = params.facing;

  ctx.save();
  ctx.translate(params.x, params.y);

  // 1. Grounded Mandala Chakra Seal beneath Rudra (Chola vermilion + gold)
  ctx.save();
  ctx.scale(1, 0.56);
  ctx.globalAlpha = alpha * 0.52;
  ctx.strokeStyle = '#ff4a1c';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(0, 0, 86 * pulse, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#ffd46b';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, 68, t * 0.9, t * 0.9 + Math.PI * 1.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 68, t * 0.9 + Math.PI, t * 0.9 + Math.PI * 2.55);
  ctx.stroke();

  // 8-pointed Chola Star spokes
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + t * 0.45;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 52, Math.sin(a) * 52);
    ctx.lineTo(Math.cos(a) * 84, Math.sin(a) * 84);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Towering Translucent Spectral Flame Aura Column & Rising Chakra Wisps (Additive Glow)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const auraGrad = ctx.createRadialGradient(0, -106 + hoverY, 14, 0, -106 + hoverY, 144);
  auraGrad.addColorStop(0, `rgba(255, 132, 48, ${0.38 * alpha})`);
  auraGrad.addColorStop(0.45, `rgba(214, 34, 42, ${0.24 * alpha})`);
  auraGrad.addColorStop(1, 'rgba(184, 20, 32, 0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.ellipse(0, -106 + hoverY, 122, 148, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rising spectral anime flame plumes flanking the Susanoo silhouette
  for (let i = -2; i <= 2; i++) {
    const wx = i * 32 + Math.sin(t * 5.2 + i * 1.4) * 6;
    const wh = 74 + (2 - Math.abs(i)) * 22 + Math.cos(t * 6.8 + i) * 10;
    const wGrad = ctx.createLinearGradient(wx, -34 + hoverY, wx, -34 - wh + hoverY);
    wGrad.addColorStop(0, `rgba(255, 68, 28, ${0.26 * alpha})`);
    wGrad.addColorStop(0.6, `rgba(255, 168, 64, ${0.14 * alpha})`);
    wGrad.addColorStop(1, 'rgba(255, 220, 120, 0)');
    ctx.fillStyle = wGrad;
    ctx.beginPath();
    ctx.moveTo(wx - 18, -34 + hoverY);
    ctx.quadraticCurveTo(wx + Math.sin(t * 7 + i) * 14, -34 - wh * 0.55 + hoverY, wx, -34 - wh + hoverY);
    ctx.quadraticCurveTo(wx - Math.sin(t * 7 + i) * 10, -34 - wh * 0.45 + hoverY, wx + 18, -34 + hoverY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 3. Ethereal Spectral Ribcage & Chola Shoulder Pauldrons (translucent chakra energy + refined ink rims)
  ctx.save();
  ctx.translate(0, -48 + hoverY);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Spine chakra column (translucent glow + glowing gold core)
  ctx.globalAlpha = alpha * 0.68;
  ctx.strokeStyle = 'rgba(72, 10, 18, 0.62)';
  ctx.lineWidth = 8.5;
  ctx.beginPath();
  ctx.moveTo(0, 24);
  ctx.lineTo(0, -84);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 98, 42, 0.78)';
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(0, -82);
  ctx.stroke();

  // 4 pairs of ethereal curved Susanoo ribs wrapping around Rudra
  for (let r = 0; r < 4; r++) {
    const ry = -66 + r * 19;
    const ribW = 70 - r * 7;
    const ribDip = 13 + r * 3;
    for (const side of [-1, 1]) {
      // Soft outer spectral aura halo
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255, 76, 32, ${(0.34 - r * 0.04) * alpha})`;
      ctx.lineWidth = 11 - r * 1.0;
      ctx.beginPath();
      ctx.moveTo(side * 6, ry);
      ctx.bezierCurveTo(
        side * (ribW * 0.88),
        ry - 9,
        side * ribW,
        ry + ribDip,
        side * (ribW * 0.44),
        ry + ribDip + 10
      );
      ctx.stroke();
      ctx.restore();

      // Delicate Sumi-crimson outer ink edge
      ctx.globalAlpha = alpha * (0.64 - r * 0.06);
      ctx.strokeStyle = 'rgba(54, 6, 14, 0.68)';
      ctx.lineWidth = 6.2 - r * 0.65;
      ctx.beginPath();
      ctx.moveTo(side * 6, ry);
      ctx.bezierCurveTo(
        side * (ribW * 0.88),
        ry - 9,
        side * ribW,
        ry + ribDip,
        side * (ribW * 0.44),
        ry + ribDip + 10
      );
      ctx.stroke();

      // Incandescent chakra-flame rib core
      ctx.globalAlpha = alpha * (0.86 - r * 0.08);
      ctx.strokeStyle = r === 0 ? '#ffe18a' : '#ff7238';
      ctx.lineWidth = 2.6 - r * 0.25;
      ctx.beginPath();
      ctx.moveTo(side * 6, ry);
      ctx.bezierCurveTo(
        side * (ribW * 0.88),
        ry - 9,
        side * ribW,
        ry + ribDip,
        side * (ribW * 0.44),
        ry + ribDip + 10
      );
      ctx.stroke();
    }
  }

  // Sweeping Translucent Chola Temple Shoulder Pauldrons
  ctx.globalAlpha = alpha * 0.66;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 24, -84);
    ctx.quadraticCurveTo(side * 66, -98, side * 86, -64);
    ctx.quadraticCurveTo(side * 62, -70, side * 34, -56);
    ctx.closePath();
    ctx.fillStyle = 'rgba(218, 42, 38, 0.36)';
    ctx.strokeStyle = 'rgba(255, 206, 102, 0.72)';
    ctx.lineWidth = 1.8;
    ctx.fill();
    ctx.stroke();
  }

  // 4. Fierce Horned Kala-Bhairava Temple War-Mask & Crown Flames
  ctx.save();
  ctx.translate(0, -112);

  // Additive crown halo behind the horned mask
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const headHalo = ctx.createRadialGradient(0, -4, 4, 0, -4, 52);
  headHalo.addColorStop(0, `rgba(255, 214, 110, ${0.46 * alpha})`);
  headHalo.addColorStop(0.55, `rgba(255, 74, 34, ${0.26 * alpha})`);
  headHalo.addColorStop(1, 'rgba(255, 40, 20, 0)');
  ctx.fillStyle = headHalo;
  ctx.beginPath();
  ctx.arc(0, -4, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.globalAlpha = alpha * 0.84;

  // Curved Asura / Shiva temple crown horns (translucent molten gold)
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 15, -6);
    ctx.quadraticCurveTo(side * 48, -26, side * 35, -58);
    ctx.quadraticCurveTo(side * 27, -32, side * 8, -14);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 206, 98, 0.78)';
    ctx.strokeStyle = 'rgba(56, 8, 14, 0.72)';
    ctx.lineWidth = 2.0;
    ctx.fill();
    ctx.stroke();
  }

  // Angular sculpted Chola war-mask plate (spectral translucent vermilion glass)
  ctx.beginPath();
  ctx.moveTo(0, -25);
  ctx.lineTo(24, -10);
  ctx.lineTo(18, 16);
  ctx.lineTo(0, 26);
  ctx.lineTo(-18, 16);
  ctx.lineTo(-24, -10);
  ctx.closePath();
  const maskGrad = ctx.createLinearGradient(0, -25, 0, 26);
  maskGrad.addColorStop(0, 'rgba(255, 110, 46, 0.62)');
  maskGrad.addColorStop(0.6, 'rgba(182, 22, 34, 0.56)');
  maskGrad.addColorStop(1, 'rgba(92, 10, 20, 0.64)');
  ctx.fillStyle = maskGrad;
  ctx.strokeStyle = 'rgba(255, 212, 112, 0.82)';
  ctx.lineWidth = 2.0;
  ctx.fill();
  ctx.stroke();

  // Inner molten gold cheek & brow filigree
  ctx.strokeStyle = '#ffe28a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-16, -6);
  ctx.lineTo(0, -15);
  ctx.lineTo(16, -6);
  ctx.stroke();

  // Fierce incandescent eyes + vertical Third Eye (Trinetra)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = '#fff9df';
  ctx.beginPath();
  ctx.moveTo(-14, -2);
  ctx.lineTo(-5, 1);
  ctx.lineTo(-12, 4.5);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(14, -2);
  ctx.lineTo(5, 1);
  ctx.lineTo(12, 4.5);
  ctx.closePath();
  ctx.fill();

  // Blazing vertical Trinetra flame-eye on forehead
  ctx.fillStyle = '#ffe484';
  ctx.beginPath();
  ctx.ellipse(0, -10, 3.0, 7.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, -10, 1.3, 4.0, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  // 5. Colossal Spectral Right Arm + Giant Astral Parashu Great-Axe synchronized to Rudra's attacks
  const swingPhase = params.isAttacking
    ? Math.max(0, Math.min(1, params.weaponSwingProgress))
    : 0;
  const idleSway = Math.sin(t * 3.1) * 0.12;
  const swingSweep = params.isAttacking
    ? -1.45 + swingPhase * 2.85
    : idleSway;
  const armAngle = params.isAttacking
    ? params.slashAngle + swingSweep * 0.42
    : dir > 0
      ? -0.35 + idleSway
      : Math.PI + 0.35 - idleSway;

  ctx.save();
  ctx.translate(dir * 46, -56);
  ctx.rotate(armAngle);
  ctx.globalAlpha = alpha * 0.78;

  // Spectral forearm aura & core
  ctx.strokeStyle = 'rgba(255, 76, 32, 0.46)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(58, 0);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 198, 96, 0.78)';
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(58, 0);
  ctx.stroke();

  // Giant Astral Parashu Haft
  ctx.strokeStyle = 'rgba(64, 10, 16, 0.65)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(22, -46);
  ctx.lineTo(82, 58);
  ctx.stroke();

  ctx.strokeStyle = '#ffe08a';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(22, -46);
  ctx.lineTo(82, 58);
  ctx.stroke();

  // Colossal Crescent Parashu Blade (translucent fiery energy blade)
  ctx.beginPath();
  ctx.moveTo(68, 22);
  ctx.quadraticCurveTo(128, 12, 120, 68);
  ctx.quadraticCurveTo(96, 52, 74, 48);
  ctx.closePath();
  const bladeGrad = ctx.createLinearGradient(68, 20, 124, 68);
  bladeGrad.addColorStop(0, 'rgba(255, 72, 30, 0.72)');
  bladeGrad.addColorStop(0.62, 'rgba(255, 206, 98, 0.86)');
  bladeGrad.addColorStop(1, 'rgba(255, 250, 228, 0.94)');
  ctx.fillStyle = bladeGrad;
  ctx.strokeStyle = 'rgba(255, 232, 160, 0.9)';
  ctx.lineWidth = 2.0;
  ctx.fill();
  ctx.stroke();

  // Sweeping astral energy crescent during active swing
  if (params.isAttacking && swingPhase > 0.12 && swingPhase < 0.92) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255, 212, 107, ${(1 - swingPhase) * 0.86})`;
    ctx.lineWidth = 10 * (1 - swingPhase * 0.5);
    ctx.beginPath();
    ctx.arc(0, 0, 122, -0.78, 0.92);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
  ctx.restore();
}

/**
 * Renders crisp Sumi-e / Chola-brass Devanagari combat impact stamps (`रौद्र`, `प्रहार`, `विच्छेद`, `अवहेलना`)
 * directly in world space with punchy pop-in scaling and clean ink borders.
 */
export function renderDevanagariCombatStamps(
  ctx: CanvasRenderingContext2D,
  stamps: DevanagariStampSpec[]
): void {
  if (!stamps.length) return;
  for (const st of stamps) {
    const progress = Math.max(0, Math.min(1, st.life / Math.max(0.1, st.maxLife)));
    const popScale =
      progress < 0.16
        ? 0.55 + (progress / 0.16) * 0.65
        : progress < 0.34
          ? 1.2 - ((progress - 0.16) / 0.18) * 0.2
          : 1.0 + (progress - 0.34) * 0.08;
    const alpha = progress > 0.68 ? Math.max(0, 1 - (progress - 0.68) / 0.32) : 1;
    const floatY = -progress * 26;

    ctx.save();
    ctx.translate(st.x, st.y + floatY);
    ctx.scale(st.scale * popScale, st.scale * popScale);
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Sharp beveled Tala-patra ink backing brush stroke behind the glyph
    ctx.fillStyle = 'rgba(12, 6, 8, 0.72)';
    ctx.beginPath();
    ctx.moveTo(-54, -15);
    ctx.lineTo(54, -18);
    ctx.lineTo(48, 17);
    ctx.lineTo(-48, 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = st.accentColor;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Devanagari calligraphic glyph
    ctx.font = "900 28px 'Noto Serif Devanagari', 'Cinzel', serif";
    ctx.strokeStyle = st.strokeColor;
    ctx.lineWidth = 5.5;
    ctx.lineJoin = 'round';
    ctx.strokeText(st.glyph, 0, -2);
    ctx.fillStyle = st.primaryColor;
    ctx.fillText(st.glyph, 0, -2);

    // Crisp English subtitle beneath stamp
    ctx.font = "700 9px 'JetBrains Mono', monospace";
    ctx.strokeStyle = st.strokeColor;
    ctx.lineWidth = 3;
    ctx.strokeText(st.subtitle, 0, 22);
    ctx.fillStyle = st.accentColor;
    ctx.fillText(st.subtitle, 0, 22);

    ctx.restore();
  }
}
