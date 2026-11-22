/**
 * Lightweight cinematic direction for the existing 2.5D combat camera.
 * This does NOT replace the Meru renderer, animation clock or elemental VFX.
 * All values are deterministic, bounded and derived from the active attack.
 */
export type CombatCameraAction = 'light_attack' | 'heavy_unleash' | 'astra' | string;
export type CombatCameraStance = 'smash' | 'pillar' | 'thrust' | string;

export interface CombatCameraInput {
  action: CombatCameraAction;
  progress: number;
  facing: number;
  stance: CombatCameraStance;
  comboStep?: number;
  guardianActive?: boolean;
  frozen?: boolean;
}

export interface CombatCameraAccent {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export const COMBAT_CAMERA_REST: Readonly<CombatCameraAccent> = Object.freeze({
  zoom: 1, offsetX: 0, offsetY: 0,
});

const clamp = (n: number, lo: number, hi: number) =>
  Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;

function smoothstep(t: number): number {
  const n = clamp(t, 0, 1);
  return n * n * (3 - 2 * n);
}

/** Smooth localized pulse, no abrupt hit-frame jump or random jitter. */
function envelope(progress: number, start: number, peak: number, end: number): number {
  if (progress <= start || progress >= end) return 0;
  return progress <= peak
    ? smoothstep((progress - start) / Math.max(0.001, peak - start))
    : 1 - smoothstep((progress - peak) / Math.max(0.001, end - peak));
}

/**
 * The heavy active-frame gate is 0.28 in KaliyugaArena, light is 0.25
 * (or 0.28 for the fourth hit). The camera uses that SAME normalized
 * animation progression rather than a wall-clock timer.
 */
export function sampleCombatCameraAccent(input: CombatCameraInput): CombatCameraAccent {
  if (input.frozen || !Number.isFinite(input.progress)) return { ...COMBAT_CAMERA_REST };
  const p = clamp(input.progress, 0, 1);
  const sign = input.facing < 0 ? -1 : 1;
  if (input.action === 'heavy_unleash') {
    const windup = envelope(p, 0, 0.13, 0.28);
    const strike = envelope(p, 0.20, 0.30, 0.84);
    const guardian = Boolean(input.guardianActive);
    const style = input.stance === 'pillar'
      ? { zoom: 0.026, lead: 5, rise: -2 }
      : input.stance === 'thrust'
        ? { zoom: 0.050, lead: 15, rise: -3 }
        : { zoom: 0.042, lead: 9, rise: -5 };
    const strength = guardian ? 1.12 : 1;
    return {
      zoom: 1 + windup * 0.008 + strike * style.zoom * strength,
      offsetX: sign * (windup * -3 + strike * style.lead * strength),
      offsetY: windup * 2 + strike * style.rise,
    };
  }
  if (input.action === 'light_attack') {
    const isFinisher = input.comboStep === 4;
    const impactAt = isFinisher ? 0.28 : 0.25;
    const strike = envelope(p, 0.12, impactAt, 0.68);
    return {
      zoom: 1 + strike * (isFinisher ? 0.022 : 0.008),
      offsetX: sign * strike * (isFinisher ? 5 : 2),
      offsetY: -strike * (isFinisher ? 2 : 0.7),
    };
  }
  if (input.action === 'astra') {
    const release = envelope(p, 0.08, 0.42, 0.82);
    return {
      zoom: 1 + release * 0.024,
      offsetX: sign * release * 6,
      offsetY: -release * 3,
    };
  }
  return { ...COMBAT_CAMERA_REST };
}

/**
 * Bounded, deterministic impact movement. Random per-frame shake previously
 * made the image jitter and made identical action tests non-reproducible.
 */
export function sampleSteadyImpactShake(
  nowMs: number,
  trauma: number,
  viewportW: number,
  viewportH: number
): { x: number; y: number } {
  if (!Number.isFinite(nowMs) || !Number.isFinite(trauma) || trauma <= 0) {
    return { x: 0, y: 0 };
  }
  const t = nowMs / 1000;
  const power = Math.pow(clamp(trauma, 0, 1), 2);
  const deviceScale = Math.min(
    1,
    clamp(viewportW, 1, 10000) / 960,
    clamp(viewportH, 1, 10000) / 540,
  );
  return {
    x: (Math.sin(t * 49) * 5 + Math.sin(t * 83 + 0.7) * 2) * power * deviceScale,
    y: (Math.cos(t * 57) * 4 + Math.sin(t * 79 + 1.2) * 1.5) * power * deviceScale,
  };
}

export interface SafeWorldCameraInput {
  viewportW: number;
  viewportH: number;
  worldW: number;
  worldH: number;
  camX: number;
  camY: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Keep the entire painted/MP4 WORLD covering the viewport after zoom,
 * pan, screen kick and shake. This operates in canvas/world units, not
 * CSS pixels, and is used for every camera accent including boss shots.
 */
export function clampCinematicOffsetToWorld(input: SafeWorldCameraInput): CombatCameraAccent {
  const viewportW = clamp(input.viewportW, 1, 10000);
  const viewportH = clamp(input.viewportH, 1, 10000);
  const worldW = clamp(input.worldW, 1, 100000);
  const worldH = clamp(input.worldH, 1, 100000);
  const zoom = clamp(input.zoom, 0.25, 3);
  const camX = clamp(input.camX, -worldW, worldW);
  const camY = clamp(input.camY, -worldH, worldH);
  const halfX = viewportW / (2 * zoom);
  const halfY = viewportH / (2 * zoom);
  // With the existing render transform, these bounds guarantee the first and
  // last world pixels project beyond BOTH viewport edges.
  const minX = camX + viewportW / 2 + halfX - worldW;
  const maxX = camX + viewportW / 2 - halfX;
  const minY = camY + viewportH / 2 + halfY - worldH;
  const maxY = camY + viewportH / 2 - halfY;
  const safeX = Number.isFinite(input.offsetX) ? input.offsetX : 0;
  const safeY = Number.isFinite(input.offsetY) ? input.offsetY : 0;
  return {
    zoom,
    offsetX: minX <= maxX ? clamp(safeX, minX, maxX) : 0,
    offsetY: minY <= maxY ? clamp(safeY, minY, maxY) : 0,
  };
}
