// Combat lighting, localized clash beams, and short impact flashes.

export type SakugaElement = 'agni' | 'varuna' | 'vayu' | 'vajra' | 'blood' | 'parry' | 'guardian';

export interface SakugaImpactTrigger {
  kind: 'light_hit' | 'heavy_hit' | 'parry_clash' | 'astra_burst' | 'astra_contact' | 'posture_break' | 'execution' | 'boss_clash';
  element: SakugaElement;
  worldX: number;
  worldY: number;
  angle: number;
  intensity?: number; // 0.5 .. 1.5
}

export interface SakugaCrossBeam {
  active: boolean;
  worldX: number;
  worldY: number;
  angle: number;
  length: number;
  thickness: number;
  coreColor: string;
  glowColor: string;
  inkColor: string;
  life: number;
  maxLife: number;
}

export interface SakugaFloorBlowout {
  active: boolean;
  worldX: number;
  worldY: number;
  radius: number;
  coreColor: string;
  midColor: string;
  edgeColor: string;
  life: number;
  maxLife: number;
  intensity: number;
  angle: number;
}

export interface SakugaDirectorState {
  // 2-3 frame Sakuga Impact Frame sequencer
  impactFrameTimer: number;
  impactFrameDuration: number;
  impactElement: SakugaElement;
  impactWorldX: number;
  impactWorldY: number;
  impactKind: SakugaImpactTrigger['kind'] | null;
  focus: { x: number; y: number; age: number; duration: number; zoom: number; rank: number;
    kind: SakugaImpactTrigger['kind']; angle: number; element: SakugaElement } | null;

  // Dynamic chiaroscuro arena darkness (0.34 baseline -> up to 0.72 during clashes/astras)
  chiaroscuroTarget: number;
  chiaroscuroCurrent: number;


  // Dynamic Dutch tilt micro-camera spring (radians)
  dutchTiltRad: number;
  dutchTiltVel: number;

  // Active combat bounce light illuminating Rudra & nearby enemies
  activeLightColor: string;
  activeLightRgb: [number, number, number];
  activeLightIntensity: number;
  activeLightX: number;
  activeLightY: number;

  // Pooled zero-GC cross-cutting clash beams & floor light blowout pools
  crossBeams: SakugaCrossBeam[];
  floorBlowouts: SakugaFloorBlowout[];
}

export interface ElementColorSpec {
  core: string;
  mid: string;
  edge: string;
  rgb: [number, number, number];
  ink: string;
}

export const SAKUGA_ELEMENT_COLORS: Record<SakugaElement, ElementColorSpec> = {
  agni: {
    core: '#fffce8',
    mid: '#ff8a1c',
    edge: '#e01b00',
    rgb: [255, 118, 28],
    ink: '#120504',
  },
  varuna: {
    core: '#f4feff',
    mid: '#2de2ff',
    edge: '#0858cf',
    rgb: [45, 226, 255],
    ink: '#040c1f',
  },
  vayu: {
    core: '#f0fff8',
    mid: '#24f794',
    edge: '#058752',
    rgb: [36, 247, 148],
    ink: '#04120c',
  },
  vajra: {
    core: '#ffffff',
    mid: '#ffe838',
    edge: '#2ce6ff',
    rgb: [255, 232, 64],
    ink: '#0d0a04',
  },
  blood: {
    core: '#ffe6ee',
    mid: '#ff1744',
    edge: '#7a001c',
    rgb: [255, 28, 72],
    ink: '#0e0205',
  },
  parry: {
    core: '#ffffff',
    mid: '#ffd84d',
    edge: '#38e8ff',
    rgb: [255, 224, 96],
    ink: '#08070c',
  },
  guardian: {
    core: '#fff2e6',
    mid: '#ff3b1f',
    edge: '#8f0a1a',
    rgb: [255, 68, 34],
    ink: '#0f0304',
  },
};

const MAX_CROSS_BEAMS = 14;
const MAX_FLOOR_BLOWOUTS = 10;

export function createSakugaDirectorState(): SakugaDirectorState {
  return {
    impactFrameTimer: 0,
    impactFrameDuration: 0.085,
    impactElement: 'agni',
    impactWorldX: 0,
    impactWorldY: 0,
    impactKind: null,
    focus: null,
    chiaroscuroTarget: 0.36,
    chiaroscuroCurrent: 0.36,
    dutchTiltRad: 0,
    dutchTiltVel: 0,
    activeLightColor: '#ff8a1c',
    activeLightRgb: [255, 138, 28],
    activeLightIntensity: 0,
    activeLightX: 0,
    activeLightY: 0,
    crossBeams: Array.from({ length: MAX_CROSS_BEAMS }, () => ({
      active: false,
      worldX: 0,
      worldY: 0,
      angle: 0,
      length: 300,
      thickness: 14,
      coreColor: '#ffffff',
      glowColor: '#ff8a1c',
      inkColor: '#09070a',
      life: 0,
      maxLife: 0.24,
    })),
    floorBlowouts: Array.from({ length: MAX_FLOOR_BLOWOUTS }, () => ({
      active: false,
      worldX: 0,
      worldY: 0,
      radius: 220,
      coreColor: '#fffce8',
      midColor: '#ff8a1c',
      edgeColor: '#e01b00',
      life: 0,
      maxLife: 0.45,
      intensity: 1,
      angle: 0,
    })),
  };
}

export function spawnSakugaCrossBeam(
  state: SakugaDirectorState,
  opts: {
    worldX: number;
    worldY: number;
    angle: number;
    length?: number;
    thickness?: number;
    element: SakugaElement;
    duration?: number;
  }
): void {
  const spec = SAKUGA_ELEMENT_COLORS[opts.element];
  let slot = state.crossBeams.find((b) => !b.active);
  if (!slot) {
    slot = state.crossBeams.reduce((a, b) => (b.life > a.life ? b : a));
  }
  slot.active = true;
  slot.worldX = opts.worldX;
  slot.worldY = opts.worldY;
  slot.angle = opts.angle;
  slot.length = opts.length ?? 460;
  slot.thickness = opts.thickness ?? 16;
  slot.coreColor = spec.core;
  slot.glowColor = spec.mid;
  slot.inkColor = spec.ink;
  slot.life = 0;
  slot.maxLife = opts.duration ?? 0.24;
}

export function spawnSakugaFloorBlowout(
  state: SakugaDirectorState,
  opts: {
    worldX: number;
    worldY: number;
    radius?: number;
    element: SakugaElement;
    duration?: number;
    intensity?: number;
    angle?: number;
  }
): void {
  const spec = SAKUGA_ELEMENT_COLORS[opts.element];
  let slot = state.floorBlowouts.find((f) => !f.active);
  if (!slot) {
    slot = state.floorBlowouts.reduce((a, b) => (b.life > a.life ? b : a));
  }
  slot.active = true;
  slot.worldX = opts.worldX;
  slot.worldY = opts.worldY;
  slot.radius = opts.radius ?? 260;
  slot.coreColor = spec.core;
  slot.midColor = spec.mid;
  slot.edgeColor = spec.edge;
  slot.life = 0;
  slot.maxLife = opts.duration ?? 0.48;
  slot.intensity = opts.intensity ?? 1.0;
  slot.angle = opts.angle ?? 0;

  // Also energize dynamic character bounce light at this world point
  state.activeLightColor = spec.mid;
  state.activeLightRgb = [spec.rgb[0], spec.rgb[1], spec.rgb[2]];
  state.activeLightIntensity = Math.max(state.activeLightIntensity, Math.min(1.2, opts.intensity ?? 1.0));
  state.activeLightX = opts.worldX;
  state.activeLightY = opts.worldY;
}

const COMBAT_CONTACT_PROFILES: Record<SakugaImpactTrigger['kind'], {
  rank: number; zoom: number; hold: number; radius: number; light: number;
}> = {
  light_hit: { rank: 1, zoom: 0.014, hold: 0.16, radius: 73, light: 0.38 },
  heavy_hit: { rank: 2, zoom: 0.059, hold: 0.31, radius: 126, light: 0.76 },
  astra_burst: { rank: 2, zoom: 0.030, hold: 0.28, radius: 110, light: 0.67 },
  astra_contact: { rank: 3, zoom: 0.035, hold: 0.27, radius: 135, light: 0.78 },
  parry_clash: { rank: 3, zoom: 0.055, hold: 0.23, radius: 122, light: 0.90 },
  posture_break: { rank: 3, zoom: 0.079, hold: 0.34, radius: 152, light: 0.90 },
  execution: { rank: 4, zoom: 0.05, hold: 0.33, radius: 166, light: 0.95 },
  boss_clash: { rank: 3, zoom: 0.065, hold: 0.32, radius: 146, light: 0.84 },
};

export function sampleCombatContactCamera(
  state: SakugaDirectorState,
  centerX: number,
  centerY: number,
  viewportWidth = 1440,
): { zoom: number; offsetX: number; offsetY: number } {
  const contact = state.focus;
  if (!contact) return { zoom: 1, offsetX: 0, offsetY: 0 };
  const t = Math.min(1, contact.age / contact.duration);
  const envelope = (0.64 + 0.36 * Math.min(1, t * 7)) * Math.pow(1 - t, 2.1);
  const viewportScale = Math.max(0.55, Math.min(1, viewportWidth / 960));
  const zoom = Math.min(0.085, contact.zoom * envelope * viewportScale);
  const dx = Math.max(-195, Math.min(195, contact.x - centerX));
  const dy = Math.max(-130, Math.min(130, contact.y - centerY));
  // Aim into the exchange while keeping both fighters within the normal arena view.
  return { zoom: 1 + zoom, offsetX: -dx * zoom * 2.0, offsetY: -dy * zoom * 1.6 };
}

/**
 * Fires a full Ufotable Sakuga Impact sequence:
 * - Cross-cutting white-hot diagonal slash beams (Tengen vs Gyutaro signature)
 * - Blinding HDR floor light blowout pool
 */
export function triggerSakugaImpact(
  state: SakugaDirectorState,
  trigger: SakugaImpactTrigger
): void {
  const intensity = Math.max(0.45, Math.min(1.5, trigger.intensity ?? 1.0));
  const profile = COMBAT_CONTACT_PROFILES[trigger.kind];
  const activeFocus = state.focus;
  if (!activeFocus || profile.rank > activeFocus.rank ||
      activeFocus.age >= activeFocus.duration * (profile.rank === activeFocus.rank ? 0.30 : 0.67)) {
    state.focus = {
      x: trigger.worldX, y: trigger.worldY, age: 0,
      duration: profile.hold, zoom: profile.zoom * Math.min(1.25, intensity),
      rank: profile.rank, kind: trigger.kind, angle: trigger.angle, element: trigger.element,
    };
  }
  const isMajor =
    trigger.kind === 'parry_clash' ||
    trigger.kind === 'posture_break' ||
    trigger.kind === 'execution' ||
    trigger.kind === 'boss_clash';

  const usesInkFlash = trigger.kind === 'parry_clash' ||
    trigger.kind === 'posture_break' || trigger.kind === 'execution';
  if (usesInkFlash) {
    state.impactFrameTimer = 0.05;
    state.impactFrameDuration = 0.05;
    state.impactElement = trigger.element;
    state.impactWorldX = trigger.worldX;
    state.impactWorldY = trigger.worldY;
    state.impactKind = trigger.kind;
  }

  spawnSakugaFloorBlowout(state, {
    worldX: trigger.worldX,
    worldY: trigger.worldY + 14,
    radius: profile.radius,
    element: trigger.element,
    duration: profile.hold + 0.08,
    intensity: profile.light * Math.min(1.25, intensity),
    angle: trigger.angle,
  });

  if (!isMajor) return;

  state.chiaroscuroTarget = Math.max(state.chiaroscuroTarget, 0.57);
  const tiltDirection = Math.cos(trigger.angle) >= 0 ? 1 : -1;
  state.dutchTiltVel += 0.25 * intensity * tiltDirection;

  // Spawn signature Tengen-vs-Gyutaro cross-cutting razor slash beams!
  const beamLen = (trigger.kind === 'parry_clash' ? 108 : 150) * Math.min(1.20, intensity);
  spawnSakugaCrossBeam(state, {
    worldX: trigger.worldX,
    worldY: trigger.worldY - 22,
    angle: trigger.angle,
    length: beamLen,
    thickness: 7,
    element: trigger.element,
    duration: 0.16,
  });
  if (trigger.kind === 'parry_clash' || trigger.kind === 'boss_clash') {
    // Secondary counter-diagonal cross beam (forms the iconic anime X-clash!)
    spawnSakugaCrossBeam(state, {
      worldX: trigger.worldX,
      worldY: trigger.worldY - 22,
      angle: trigger.angle + 1.24,
      length: beamLen * 0.78,
      thickness: 6,
      element: trigger.kind === 'parry_clash' ? 'parry' : trigger.element,
      duration: 0.14,
    });
  }
}

/**
 * Pure deterministic per-frame update (runs in real dt so impact frames,
 * chromatic decay, and camera tilt spring stay silky smooth even during hitstop!).
 */
export function stepSakugaDirector(
  state: SakugaDirectorState,
  dt: number,
  opts?: { isBossChamber?: boolean; isHubMode?: boolean; hasActiveElementalVfx?: boolean }
): void {
  const safeDt = Math.max(0, Math.min(0.05, dt));
  const baselineDarkness = opts?.isHubMode
    ? 0.24
    : opts?.isBossChamber
      ? 0.44
      : 0.36;
  const vfxDarknessBoost = opts?.hasActiveElementalVfx ? 0.07 : 0;
  if (state.focus) {
    state.focus.age += safeDt;
    if (state.focus.age >= state.focus.duration) state.focus = null;
  }

  // Impact frame countdown
  if (state.impactFrameTimer > 0) {
    state.impactFrameTimer = Math.max(0, state.impactFrameTimer - safeDt);
  }

  // Smooth chiaroscuro recovery back to cinematic twilight baseline
  const floorTarget = Math.min(0.68, baselineDarkness + vfxDarknessBoost);
  state.chiaroscuroTarget = Math.max(
    floorTarget,
    state.chiaroscuroTarget - safeDt * 0.85
  );
  const darkRate = state.chiaroscuroTarget > state.chiaroscuroCurrent ? 18 : 5.5;
  state.chiaroscuroCurrent +=
    (state.chiaroscuroTarget - state.chiaroscuroCurrent) *
    (1 - Math.exp(-darkRate * safeDt));

  state.activeLightIntensity = Math.max(0, state.activeLightIntensity - safeDt * 2.4);

  // Second-order critically-damped spring for Dutch camera tilt (snaps & returns cleanly)
  const stiffness = 140;
  const damping = 18;
  const accel = -stiffness * state.dutchTiltRad - damping * state.dutchTiltVel;
  state.dutchTiltVel += accel * safeDt;
  state.dutchTiltRad += state.dutchTiltVel * safeDt;
  // Clamp max tilt to ±4.2 degrees so arena edges never clip awkwardly
  const maxTilt = 0.072;
  if (state.dutchTiltRad > maxTilt) state.dutchTiltRad = maxTilt;
  else if (state.dutchTiltRad < -maxTilt) state.dutchTiltRad = -maxTilt;
  if (Math.abs(state.dutchTiltRad) < 0.0004 && Math.abs(state.dutchTiltVel) < 0.002) {
    state.dutchTiltRad = 0;
    state.dutchTiltVel = 0;
  }

  // Step cross-cutting beams
  for (let i = 0; i < state.crossBeams.length; i++) {
    const b = state.crossBeams[i];
    if (!b.active) continue;
    b.life += safeDt;
    if (b.life >= b.maxLife) b.active = false;
  }

  // Step HDR floor blowout pools
  for (let i = 0; i < state.floorBlowouts.length; i++) {
    const f = state.floorBlowouts[i];
    if (!f.active) continue;
    f.life += safeDt;
    if (f.life >= f.maxLife) f.active = false;
  }
}

/**
 * Resolves the exact phase of an active 2-3 frame Sakuga Impact Frame:
 * - 'bw_ink' (first 45%): stark B&W / inverted sumi-e ink flash frame
 * - 'contact_glow' (remaining time): local afterglow at the point of contact
 * - 'none': normal graded combat rendering
 */
export function getActiveImpactFramePhase(
  state: SakugaDirectorState
): 'none' | 'bw_ink' | 'contact_glow' {
  if (state.impactFrameTimer <= 0 || state.impactFrameDuration <= 0) return 'none';
  const elapsedFrac = 1 - state.impactFrameTimer / state.impactFrameDuration;
  return elapsedFrac < 0.66 ? 'bw_ink' : 'contact_glow';
}

// ============================================================================
// CANVAS2D RENDER PASSES (WORLD-SPACE & SCREEN-SPACE UFOTABLE COMPOSITOR)
// ============================================================================

/**
 * PASS A (World-Space, immediately AFTER MP4 arena floor & BEFORE actors):
 * 1. Plunges the washed-out MP4 floor into velvety Ufotable twilight/indigo chiaroscuro
 *    (Muzan vs All Hashira 8K top-down contrast).
 * 2. Blasts blazing HDR additive + screen floor light blowout pools directly onto the
 *    darkened stone tiles so fire/water/wind/lightning genuinely illuminates the world!
 */
export function renderChiaroscuroAndFloorBlowouts(
  ctx: CanvasRenderingContext2D,
  state: SakugaDirectorState,
  opts: {
    camX: number;
    camY: number;
    cw: number;
    ch: number;
    playerX: number;
    playerY: number;
    stanceElement: SakugaElement;
  }
): void {
  const { camX, camY, cw, ch, playerX, playerY, stanceElement } = opts;

  // 1. Deep Ufotable Chiaroscuro Shadow Grade over the MP4 Arena
  // Preserves stone relief detail via multiply + cool midnight indigo shadow veil
  const darkAlpha = Math.max(0.18, Math.min(0.76, state.chiaroscuroCurrent));
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const gradeGrad = ctx.createRadialGradient(
    playerX,
    playerY - 12,
    90,
    playerX,
    playerY - 12,
    Math.max(cw, ch) * 0.78
  );
  // Keep a slightly warmer readable stage center around Rudra while edges plunge deep!
  gradeGrad.addColorStop(0, `rgba(118, 122, 148, ${(darkAlpha * 0.85).toFixed(3)})`);
  gradeGrad.addColorStop(0.45, `rgba(48, 52, 78, ${darkAlpha.toFixed(3)})`);
  gradeGrad.addColorStop(1, `rgba(12, 14, 28, ${Math.min(0.92, darkAlpha + 0.24).toFixed(3)})`);
  ctx.fillStyle = gradeGrad;
  ctx.fillRect(camX - 180, camY - 180, cw + 360, ch + 360);

  // Additional subtle deep charcoal contrast floor veil so light pools read like molten HDR
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = `rgba(6, 8, 18, ${(darkAlpha * 0.42).toFixed(3)})`;
  ctx.fillRect(camX - 180, camY - 180, cw + 360, ch + 360);
  ctx.restore();

  // 2. Subtle warm hero sanctuary footlight so Rudra's stance always reads cleanly on dark stone
  const heroSpec = SAKUGA_ELEMENT_COLORS[stanceElement];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(playerX, playerY + 4);
  ctx.scale(1, 0.56);
  const footGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 145);
  footGrad.addColorStop(0, `rgba(${heroSpec.rgb[0]}, ${heroSpec.rgb[1]}, ${heroSpec.rgb[2]}, 0.16)`);
  footGrad.addColorStop(0.55, `rgba(${heroSpec.rgb[0]}, ${heroSpec.rgb[1]}, ${heroSpec.rgb[2]}, 0.05)`);
  footGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = footGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 145, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. Blazing HDR Floor Light Blowout Pools (Hinokami Kagura forest floor / Tengen dual-color bounce!)
  for (let i = 0; i < state.floorBlowouts.length; i++) {
    const f = state.floorBlowouts[i];
    if (!f.active) continue;
    const norm = f.life / Math.max(0.01, f.maxLife);
    const punch = Math.sin(Math.min(1, norm * 3.5) * Math.PI * 0.5);
    const fade = Math.pow(1 - norm, 1.35);
    const alpha = Math.min(1, punch * fade * f.intensity);
    if (alpha <= 0.01) continue;

    const r = f.radius * (0.76 + Math.sin(norm * Math.PI * 0.5) * 0.34);
    ctx.save();
    ctx.translate(f.worldX, f.worldY);
    ctx.scale(1, 0.56);
    ctx.rotate(f.angle);
    ctx.scale(1.13, 0.78);

    // Outer saturated elemental floodlight across the stone tiles
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.88, alpha * 0.72);
    const outerGrad = ctx.createRadialGradient(0, 0, r * 0.06, 0, 0, r);
    outerGrad.addColorStop(0, f.coreColor);
    outerGrad.addColorStop(0.28, f.midColor);
    outerGrad.addColorStop(0.68, f.edgeColor);
    outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Inner pure-white blown-out core right beneath the clash/slash
    ctx.globalAlpha = Math.min(0.95, alpha * 0.85);
    const innerR = r * 0.42;
    const innerGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, innerR);
    innerGrad.addColorStop(0, '#ffffff');
    innerGrad.addColorStop(0.45, f.coreColor);
    innerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, innerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function renderCombatContactAccent(
  ctx: CanvasRenderingContext2D,
  state: SakugaDirectorState,
): void {
  const contact = state.focus;
  if (!contact || contact.kind === 'astra_burst') return;
  const duration = contact.rank === 1 ? 0.075 : 0.115;
  const t = contact.age / duration;
  if (t >= 1) return;

  const colors = SAKUGA_ELEMENT_COLORS[contact.element];
  const radius = (contact.rank === 1 ? 11 : 18) * (0.82 + t * 0.6);
  ctx.save();
  ctx.translate(contact.x, contact.y - 17);
  ctx.rotate(contact.angle);
  ctx.globalAlpha = Math.pow(1 - t, 1.5);
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 4;
  ctx.fillStyle = colors.core;
  ctx.beginPath();
  ctx.moveTo(-radius, 1);
  ctx.lineTo(-radius * 0.19, -2);
  ctx.lineTo(radius * 0.34, -radius * 0.69);
  ctx.lineTo(radius * 0.16, -1);
  ctx.lineTo(radius * 1.26, -2);
  ctx.lineTo(radius * 0.23, 3);
  ctx.lineTo(-radius * 0.34, radius * 0.51);
  ctx.lineTo(-radius * 0.18, 3);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

export function renderCombatActorBounce(
  ctx: CanvasRenderingContext2D,
  state: SakugaDirectorState,
  x: number,
  y: number,
  size: number,
): void {
  const dx = state.activeLightX - x;
  const dy = state.activeLightY - y;
  const distance = Math.hypot(dx, dy);
  const intensity = state.activeLightIntensity * Math.pow(Math.max(0, 1 - distance / 235), 1.5);
  if (intensity < 0.055) return;
  // Put the color on the side facing the strike and leave the contour visible.
  const sourceX = Math.max(-size * 0.24, Math.min(size * 0.24, dx * 0.24));
  const sourceY = Math.max(-size * 0.14, Math.min(size * 0.14, dy * 0.14));
  ctx.save();
  ctx.translate(x + sourceX, y - size * 0.57 + sourceY);
  ctx.scale(0.70, 1);
  ctx.globalCompositeOperation = 'screen';
  const radius = size * 0.69;
  const light = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  const [r, g, b] = state.activeLightRgb;
  light.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${Math.min(0.42, intensity * 0.42)})`);
  light.addColorStop(0.48, `rgba(${r}, ${g}, ${b}, ${intensity * 0.15})`);
  light.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = light;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

/**
 * Renders long dramatic cast shadow projected away from the active elemental blowout light!
 * (Matches Tanjiro vs Rui forest floor cast shadows)
 */
export function renderDynamicElementalCastShadow(
  ctx: CanvasRenderingContext2D,
  state: SakugaDirectorState,
  actorX: number,
  actorY: number,
  actorRadius = 22
): void {
  if (state.activeLightIntensity <= 0.08) return;
  const dx = actorX - state.activeLightX;
  const dy = actorY - state.activeLightY;
  const dist = Math.hypot(dx, dy);
  if (dist < 14 || dist > 520) return;

  const dirX = dx / dist;
  const dirY = dy / dist;
  const shadowLen = Math.min(130, Math.max(44, (1 - dist / 520) * 140)) * Math.min(1, state.activeLightIntensity);
  const angle = Math.atan2(dirY * 0.65, dirX);

  ctx.save();
  ctx.translate(actorX, actorY + 2);
  ctx.rotate(angle);
  const grad = ctx.createLinearGradient(0, 0, shadowLen, 0);
  grad.addColorStop(0, `rgba(4, 3, 9, ${(0.62 * Math.min(1, state.activeLightIntensity)).toFixed(3)})`);
  grad.addColorStop(0.65, `rgba(4, 3, 9, ${(0.28 * Math.min(1, state.activeLightIntensity)).toFixed(3)})`);
  grad.addColorStop(1, 'rgba(4, 3, 9, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(shadowLen * 0.45, 0, shadowLen * 0.55, actorRadius * 0.54, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Replaces the blurry yellow dandelion-ball shield PNG with a razor-sharp
 * ink-rimmed Vedic Ward Shield Arc that looks genuinely Ufotable-drawn!
 */
export function renderCrispVedicWardShield(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number;
    y: number;
    angle: number;
    radius: number;
    isWindup: boolean;
    nowMs: number;
  }
): void {
  const { x, y, angle, radius, isWindup, nowMs } = opts;
  const pulse = 0.85 + Math.sin(nowMs * 0.016) * 0.15;
  const arcSpan = isWindup ? 1.15 : 1.48;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // 1. Crisp pitch-black sumi-e ink backing arc
  ctx.strokeStyle = 'rgba(10, 7, 14, 0.92)';
  ctx.lineWidth = isWindup ? 6.5 : 8.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, radius, -arcSpan * 0.5, arcSpan * 0.5);
  ctx.stroke();

  // 2. Luminous molten gold / amber ward edge
  ctx.strokeStyle = isWindup
    ? `rgba(255, 224, 118, ${(0.78 * pulse).toFixed(3)})`
    : `rgba(255, 186, 46, ${(0.94 * pulse).toFixed(3)})`;
  ctx.lineWidth = isWindup ? 3.2 : 4.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius, -arcSpan * 0.48, arcSpan * 0.48);
  ctx.stroke();

  // 3. Pure white-hot inner razor specular rim
  ctx.strokeStyle = `rgba(255, 253, 232, ${(0.88 * pulse).toFixed(3)})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 1.5, -arcSpan * 0.34, arcSpan * 0.34);
  ctx.stroke();

  // 4. Crisp geometric Vedic diamond ticks along the shield face
  for (let i = -1; i <= 1; i++) {
    const a = i * (arcSpan * 0.28);
    const tx = Math.cos(a) * radius;
    const ty = Math.sin(a) * radius;
    ctx.fillStyle = '#fff9d6';
    ctx.beginPath();
    ctx.moveTo(tx + Math.cos(a) * 5, ty + Math.sin(a) * 5);
    ctx.lineTo(tx - Math.sin(a) * 3, ty + Math.cos(a) * 3);
    ctx.lineTo(tx - Math.cos(a) * 5, ty - Math.sin(a) * 5);
    ctx.lineTo(tx + Math.sin(a) * 3, ty - Math.cos(a) * 3);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/**
 * PASS B (World-Space, AFTER Actors & WebGL Front Pass):
 * Renders Tengen-vs-Gyutaro razor-sharp cross-cutting white-hot diagonal slash beams
 * with pitch-black sumi-e ink outer edges and anamorphic needle clash flares!
 */
export function renderSakugaCrossBeams(
  ctx: CanvasRenderingContext2D,
  state: SakugaDirectorState
): void {
  for (let i = 0; i < state.crossBeams.length; i++) {
    const b = state.crossBeams[i];
    if (!b.active) continue;
    const norm = b.life / Math.max(0.01, b.maxLife);
    const expand = Math.min(1, norm * 7.5);
    const fade = Math.pow(1 - norm, 1.55);
    if (fade <= 0.01) continue;

    const halfLen = b.length * 0.5 * (0.45 + expand * 0.65);
    const halfW = b.thickness * 0.5 * (1.15 - norm * 0.72);

    ctx.save();
    ctx.translate(b.worldX, b.worldY);
    ctx.rotate(b.angle);

    // 1. Pitch-black sumi-e ink tear-shadow enveloping the razor beam
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade * 0.88;
    ctx.fillStyle = b.inkColor;
    ctx.beginPath();
    ctx.moveTo(-halfLen * 1.06, 0);
    ctx.quadraticCurveTo(0, -halfW * 1.85, halfLen * 1.06, 0);
    ctx.quadraticCurveTo(0, halfW * 1.85, -halfLen * 1.06, 0);
    ctx.closePath();
    ctx.fill();

    // 2. Wide saturated elemental HDR glow envelope
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.82;
    const glowGrad = ctx.createLinearGradient(-halfLen, 0, halfLen, 0);
    glowGrad.addColorStop(0, 'rgba(0,0,0,0)');
    glowGrad.addColorStop(0.22, b.glowColor);
    glowGrad.addColorStop(0.5, b.coreColor);
    glowGrad.addColorStop(0.78, b.glowColor);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.moveTo(-halfLen * 1.15, 0);
    ctx.quadraticCurveTo(0, -halfW * 2.2, halfLen * 1.15, 0);
    ctx.quadraticCurveTo(0, halfW * 2.2, -halfLen * 1.15, 0);
    ctx.closePath();
    ctx.fill();

    // 3. Blinding razor-thin pure white-hot cutting needle core
    ctx.globalAlpha = Math.min(1, fade * 1.25);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-halfLen, 0);
    ctx.quadraticCurveTo(0, -Math.max(2, halfW * 0.65), halfLen, 0);
    ctx.quadraticCurveTo(0, Math.max(2, halfW * 0.65), -halfLen, 0);
    ctx.closePath();
    ctx.fill();

    // 4. Anamorphic pinpoint lens-spike right at the clash intersection (center = 0,0)
    if (norm < 0.55) {
      const flareAlpha = (1 - norm / 0.55) * 0.95;
      ctx.globalAlpha = flareAlpha;
      const spikeLen = halfLen * 0.36;
      const spikeW = Math.max(2.5, halfW * 0.42);
      ctx.beginPath();
      ctx.moveTo(0, -spikeLen);
      ctx.quadraticCurveTo(spikeW, 0, 0, spikeLen);
      ctx.quadraticCurveTo(-spikeW, 0, 0, -spikeLen);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * PASS C (Screen-Space, Final Post-Processing Layer):
 * A brief ink flash followed by a localized contact glow.
 */
export function renderSakugaScreenPostPass(
  ctx: CanvasRenderingContext2D,
  state: SakugaDirectorState,
  opts: {
    cw: number;
    ch: number;
    camX: number;
    camY: number;
    zoom: number;
  }
): void {
  const { cw, ch, camX, camY, zoom } = opts;
  const focusX = Math.max(
    cw * 0.15,
    Math.min(cw * 0.85, (state.impactWorldX - camX - cw * 0.5) * zoom + cw * 0.5)
  );
  const focusY = Math.max(
    ch * 0.15,
    Math.min(ch * 0.85, (state.impactWorldY - 24 - camY - ch * 0.5) * zoom + ch * 0.5)
  );

  const phase = getActiveImpactFramePhase(state);
  if (phase === 'none') return;

  ctx.save();
  if (phase === 'bw_ink') {
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.29)';
    ctx.fillRect(0, 0, cw, ch);
  }
  ctx.globalCompositeOperation = 'lighter';
  const radius = Math.max(54, 110 * zoom);
  const core = ctx.createRadialGradient(focusX, focusY, 2, focusX, focusY, radius);
  const { rgb } = SAKUGA_ELEMENT_COLORS[state.impactElement];
  core.addColorStop(0, 'rgba(255, 255, 255, 0.82)');
  core.addColorStop(0.36, phase === 'bw_ink'
    ? 'rgba(255, 255, 255, 0.22)'
    : `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.24)`);
  core.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = core;
  ctx.fillRect(focusX - radius, focusY - radius, radius * 2, radius * 2);
  ctx.restore();
}
