// ============================================================================
// UFOTABLE / DEMON SLAYER SAKUGA IMPACT & CHIAROSCURO LIGHTING DIRECTOR
// Pure deterministic state machine + Canvas2D cinematic compositor helpers:
// 1. Dynamic Chiaroscuro Arena Grading (darkens MP4 arena so HDR VFX pop!)
// 2. Real-Time Isometric Floor Light Blowout Pools + Long Cast Shadows
// 3. Authentic 2-3 Frame Sakuga Impact Frames (B&W / Inverted Sumi-e + Dual-Color Split)
// 4. Radial Pitch-Black Sumi-e Speed-Lines & Anamorphic Cross-Cutting Clash Beams
// 5. Dutch Camera Tilt Spring + Chromatic RGB Split Clash Pulse
// 6. Crisp Ink-Rimmed Vedic Ward Shield (replaces blurry yellow dandelion blobs)
// ============================================================================

export type SakugaElement = 'agni' | 'varuna' | 'vayu' | 'vajra' | 'blood' | 'parry' | 'guardian';

export interface SakugaImpactTrigger {
  kind: 'heavy_hit' | 'parry_clash' | 'astra_burst' | 'posture_break' | 'execution' | 'boss_clash';
  element: SakugaElement;
  worldX: number;
  worldY: number;
  angle: number;
  intensity?: number; // 0.5 .. 1.5
  enemyElement?: SakugaElement;
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
}

export interface SakugaDirectorState {
  // 2-3 frame Sakuga Impact Frame sequencer
  impactFrameTimer: number;
  impactFrameDuration: number;
  impactKind: SakugaImpactTrigger['kind'];
  impactElement: SakugaElement;
  impactEnemyElement: SakugaElement;
  impactWorldX: number;
  impactWorldY: number;
  impactAngle: number;
  impactIntensity: number;

  // Dynamic chiaroscuro arena darkness (0.34 baseline -> up to 0.72 during clashes/astras)
  chiaroscuroTarget: number;
  chiaroscuroCurrent: number;

  // Radial speed-lines & chromatic clash split
  speedLinesAlpha: number;
  speedLinesSeed: number;
  chromaticSplitPx: number;

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
    impactKind: 'heavy_hit',
    impactElement: 'agni',
    impactEnemyElement: 'blood',
    impactWorldX: 0,
    impactWorldY: 0,
    impactAngle: 0,
    impactIntensity: 0,
    chiaroscuroTarget: 0.36,
    chiaroscuroCurrent: 0.36,
    speedLinesAlpha: 0,
    speedLinesSeed: 1,
    chromaticSplitPx: 0,
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

  // Also energize dynamic character bounce light at this world point
  state.activeLightColor = spec.mid;
  state.activeLightRgb = [spec.rgb[0], spec.rgb[1], spec.rgb[2]];
  state.activeLightIntensity = Math.max(state.activeLightIntensity, Math.min(1.2, opts.intensity ?? 1.0));
  state.activeLightX = opts.worldX;
  state.activeLightY = opts.worldY;
}

/**
 * Fires a full Ufotable Sakuga Impact sequence:
 * - 2-3 frame B&W / Dual-Color Impact Frame
 * - Cross-cutting white-hot diagonal slash beams (Tengen vs Gyutaro signature)
 * - Blinding HDR floor light blowout pool
 * - Radial pitch-black sumi-e speed-lines + RGB chromatic clash split + Dutch tilt kick
 */
export function triggerSakugaImpact(
  state: SakugaDirectorState,
  trigger: SakugaImpactTrigger
): void {
  const intensity = Math.max(0.45, Math.min(1.5, trigger.intensity ?? 1.0));
  const isMajor =
    trigger.kind === 'parry_clash' ||
    trigger.kind === 'posture_break' ||
    trigger.kind === 'execution' ||
    trigger.kind === 'boss_clash';

  // Impact frame duration: ~55ms (3 frames @ 60fps) for major clashes, ~34ms (2 frames) for heavy/astra bursts
  const dur = isMajor ? 0.068 : trigger.kind === 'astra_burst' ? 0.052 : 0.036;
  state.impactFrameTimer = Math.max(state.impactFrameTimer, dur);
  state.impactFrameDuration = dur;
  state.impactKind = trigger.kind;
  state.impactElement = trigger.element;
  state.impactEnemyElement = trigger.enemyElement ?? (trigger.element === 'varuna' ? 'agni' : 'blood');
  state.impactWorldX = trigger.worldX;
  state.impactWorldY = trigger.worldY;
  state.impactAngle = trigger.angle;
  state.impactIntensity = intensity;

  // Plunge arena shadows deep so the clash blazes like 8K HDR!
  state.chiaroscuroTarget = Math.max(
    state.chiaroscuroTarget,
    isMajor ? 0.72 : trigger.kind === 'astra_burst' ? 0.64 : 0.54
  );
  state.speedLinesAlpha = Math.max(state.speedLinesAlpha, isMajor ? 0.92 : 0.68);
  state.speedLinesSeed = (state.speedLinesSeed * 1.618033 + 1.37) % 997;
  state.chromaticSplitPx = Math.max(state.chromaticSplitPx, isMajor ? 9.5 * intensity : 5.5 * intensity);

  // Dutch camera tilt kick (alternating direction by angle sign so consecutive hits whip!)
  const tiltSign = Math.cos(trigger.angle) >= 0 ? 1 : -1;
  const tiltKick = (isMajor ? 0.044 : 0.024) * intensity * tiltSign;
  state.dutchTiltVel += tiltKick * 12;

  // Spawn blazing HDR floor blowout underneath clash
  spawnSakugaFloorBlowout(state, {
    worldX: trigger.worldX,
    worldY: trigger.worldY + 14,
    radius: (isMajor ? 330 : 275) * Math.min(1.25, intensity),
    element: trigger.element,
    duration: isMajor ? 0.58 : 0.44,
    intensity: isMajor ? 1.18 : 0.95,
  });

  // Spawn signature Tengen-vs-Gyutaro cross-cutting razor slash beams!
  const beamLen = (isMajor ? 620 : 440) * Math.min(1.25, intensity);
  spawnSakugaCrossBeam(state, {
    worldX: trigger.worldX,
    worldY: trigger.worldY - 22,
    angle: trigger.angle,
    length: beamLen,
    thickness: isMajor ? 22 : 15,
    element: trigger.element,
    duration: isMajor ? 0.28 : 0.21,
  });
  if (isMajor || trigger.kind === 'astra_burst') {
    // Secondary counter-diagonal cross beam (forms the iconic anime X-clash!)
    spawnSakugaCrossBeam(state, {
      worldX: trigger.worldX,
      worldY: trigger.worldY - 22,
      angle: trigger.angle + (isMajor ? 1.24 : 0.88),
      length: beamLen * 0.78,
      thickness: isMajor ? 14 : 10,
      element: trigger.kind === 'parry_clash' ? 'parry' : trigger.element,
      duration: isMajor ? 0.24 : 0.18,
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
  const vfxDarknessBoost = opts?.hasActiveElementalVfx ? 0.16 : 0;

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

  // Decay radial ink speed-lines & RGB chromatic split
  state.speedLinesAlpha = Math.max(0, state.speedLinesAlpha - safeDt * 3.8);
  state.chromaticSplitPx = Math.max(0, state.chromaticSplitPx - safeDt * 42);
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
 * - 'dual_split' (next 55%): Akaza-vs-Rengoku dual-color chromatic clash frame
 * - 'none': normal graded combat rendering
 */
export function getActiveImpactFramePhase(
  state: SakugaDirectorState
): 'none' | 'bw_ink' | 'dual_split' {
  if (state.impactFrameTimer <= 0 || state.impactFrameDuration <= 0) return 'none';
  const elapsedFrac = 1 - state.impactFrameTimer / state.impactFrameDuration;
  return elapsedFrac < 0.46 ? 'bw_ink' : 'dual_split';
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
 * 1. 2-3 Frame Sakuga Impact Frame (Stark B&W Ink Flash -> Dual-Color Akaza/Rengoku Split)
 * 2. Radial Pitch-Black Sumi-e Anime Speed-Lines tearing around the viewport perimeter
 * 3. Chromatic RGB Edge Split Flash during high-weight clashes
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

  // 1. Authentic 2-3 Frame Sakuga Impact Frame!
  const phase = getActiveImpactFramePhase(state);
  if (phase === 'bw_ink') {
    ctx.save();
    // Stark high-contrast black-and-white impact inversion burst centered on the clash
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = 'rgba(245, 245, 250, 0.78)';
    ctx.fillRect(0, 0, cw, ch);

    // Blinding white-hot center clash shock disc + jagged sumi-e ink spikes
    ctx.globalCompositeOperation = 'source-over';
    const flashGrad = ctx.createRadialGradient(focusX, focusY, 12, focusX, focusY, Math.max(cw, ch) * 0.55);
    flashGrad.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
    flashGrad.addColorStop(0.24, 'rgba(255, 255, 255, 0.42)');
    flashGrad.addColorStop(0.58, 'rgba(8, 8, 12, 0.72)');
    flashGrad.addColorStop(1, 'rgba(4, 4, 8, 0.94)');
    ctx.fillStyle = flashGrad;
    ctx.fillRect(0, 0, cw, ch);

    // Razor black-and-white manga ink slash rays bursting radially from the impact focal point
    ctx.translate(focusX, focusY);
    const rayCount = 26;
    const maxR = Math.hypot(cw, ch);
    for (let i = 0; i < rayCount; i++) {
      const a = (i / rayCount) * Math.PI * 2 + state.impactAngle * 0.4;
      const isWhite = i % 3 === 0;
      const innerR = 48 + ((i * 37) % 72);
      const halfSpread = isWhite ? 0.018 : 0.032;
      ctx.fillStyle = isWhite ? '#ffffff' : '#050508';
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
      ctx.lineTo(Math.cos(a - halfSpread) * maxR, Math.sin(a - halfSpread) * maxR);
      ctx.lineTo(Math.cos(a + halfSpread) * maxR, Math.sin(a + halfSpread) * maxR);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  } else if (phase === 'dual_split') {
    // Frame 2: Akaza vs Rengoku High-Contrast Peripheral Dual-Color Split (preserves deep velvet blacks in center!)
    const heroCol = SAKUGA_ELEMENT_COLORS[state.impactElement];
    const foeCol = SAKUGA_ELEMENT_COLORS[state.impactEnemyElement];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const leftEdge = ctx.createLinearGradient(0, 0, cw * 0.34, 0);
    leftEdge.addColorStop(0, `rgba(${heroCol.rgb[0]}, ${heroCol.rgb[1]}, ${heroCol.rgb[2]}, 0.38)`);
    leftEdge.addColorStop(0.55, `rgba(${heroCol.rgb[0]}, ${heroCol.rgb[1]}, ${heroCol.rgb[2]}, 0.12)`);
    leftEdge.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = leftEdge;
    ctx.fillRect(0, 0, cw * 0.34, ch);

    const rightEdge = ctx.createLinearGradient(cw, 0, cw * 0.66, 0);
    rightEdge.addColorStop(0, `rgba(${foeCol.rgb[0]}, ${foeCol.rgb[1]}, ${foeCol.rgb[2]}, 0.36)`);
    rightEdge.addColorStop(0.55, `rgba(${foeCol.rgb[0]}, ${foeCol.rgb[1]}, ${foeCol.rgb[2]}, 0.11)`);
    rightEdge.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rightEdge;
    ctx.fillRect(cw * 0.66, 0, cw * 0.34, ch);

    // Focused white-hot pinpoint clash glow right at the focal point (never washes out shadows!)
    const corePop = ctx.createRadialGradient(focusX, focusY, 4, focusX, focusY, 175);
    corePop.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    corePop.addColorStop(0.35, `rgba(${heroCol.rgb[0]}, ${heroCol.rgb[1]}, ${heroCol.rgb[2]}, 0.24)`);
    corePop.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = corePop;
    ctx.beginPath();
    ctx.arc(focusX, focusY, 175, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2. Radial Pitch-Black Sumi-e Anime Speed-Lines (Perimeter Kinetic Framing around Duel)
  if (state.speedLinesAlpha > 0.03) {
    ctx.save();
    ctx.translate(focusX, focusY);
    const maxR = Math.hypot(cw, ch) * 0.95;
    const lineCount = 32;
    const baseA = state.speedLinesAlpha;
    for (let i = 0; i < lineCount; i++) {
      const h = Math.abs(Math.sin(i * 19.73 + state.speedLinesSeed * 7.13));
      const ang = (i / lineCount) * Math.PI * 2 + (h - 0.5) * 0.08;
      const innerR = Math.min(cw, ch) * (0.38 + h * 0.22);
      const spread = 0.007 + h * 0.014;
      const isHighlight = i % 7 === 0;
      ctx.fillStyle = isHighlight
        ? `rgba(255, 252, 240, ${(baseA * 0.32).toFixed(3)})`
        : `rgba(5, 4, 9, ${(baseA * 0.82).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * innerR, Math.sin(ang) * innerR);
      ctx.lineTo(Math.cos(ang - spread) * maxR, Math.sin(ang - spread) * maxR);
      ctx.lineTo(Math.cos(ang + spread) * maxR, Math.sin(ang + spread) * maxR);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. Chromatic RGB Edge Split Flash (subtle blazing cyan/crimson peripheral punch)
  if (state.chromaticSplitPx > 0.5) {
    const cAlpha = Math.min(0.28, (state.chromaticSplitPx / 10) * 0.24);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const leftGrad = ctx.createLinearGradient(0, 0, cw * 0.16, 0);
    leftGrad.addColorStop(0, `rgba(255, 36, 72, ${cAlpha.toFixed(3)})`);
    leftGrad.addColorStop(1, 'rgba(255, 36, 72, 0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 0, cw * 0.16, ch);

    const rightGrad = ctx.createLinearGradient(cw, 0, cw * 0.84, 0);
    rightGrad.addColorStop(0, `rgba(38, 224, 255, ${cAlpha.toFixed(3)})`);
    rightGrad.addColorStop(1, 'rgba(38, 224, 255, 0)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(cw * 0.84, 0, cw * 0.16, ch);
    ctx.restore();
  }
}
