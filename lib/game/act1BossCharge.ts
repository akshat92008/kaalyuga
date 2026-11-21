/**
 * Dundubhi's charge locomotion and first-pillar collision are computed in
 * world space, independent of Three.js and frame rate.
 *
 * Boss AI/animation use the resulting per-frame position/velocity. Combat
 * damage and pillar punish remain in KaliyugaArena's existing battle pipeline.
 */
export const DUNDUBHI_CHARGE_TRAVEL_SEC = 0.42;
export const DUNDUBHI_CHARGE_PILLAR_HALF_WIDTH = 82;

export interface DundubhiChargeFrame {
  previousX: number;
  previousY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  elapsedSec: number;
  progress: number;
  complete: boolean;
}

/** A position on the committed charge corridor, advancing only during simulation time. */
export function advanceDundubhiCharge(params: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  elapsedSec: number;
  durationSec: number;
  dt: number;
}): DundubhiChargeFrame {
  const { startX, startY, endX, endY } = params;
  const duration = Math.max(0.05, Number.isFinite(params.durationSec) ? params.durationSec : DUNDUBHI_CHARGE_TRAVEL_SEC);
  const dt = Math.max(0, Number.isFinite(params.dt) ? params.dt : 0);
  const elapsed = Math.min(duration, Math.max(0, Number.isFinite(params.elapsedSec) ? params.elapsedSec : 0));
  const nextElapsed = Math.min(duration, elapsed + dt);
  const oldProgress = elapsed / duration;
  const progress = nextElapsed / duration;
  const previousX = startX + (endX - startX) * oldProgress;
  const previousY = startY + (endY - startY) * oldProgress;
  const x = startX + (endX - startX) * progress;
  const y = startY + (endY - startY) * progress;
  return {
    previousX, previousY, x, y,
    vx: dt > 0 ? (x - previousX) / dt : 0,
    vy: dt > 0 ? (y - previousY) / dt : 0,
    elapsedSec: nextElapsed,
    progress,
    complete: nextElapsed >= duration,
  };
}

export interface DundubhiChargePillar {
  id: number;
  x: number;
  y: number;
  type: string;
  destroyed: boolean;
  pillarStage?: number;
}

/** Stop at the FIRST intact pillar on the path, not beyond it or through it. */
export function findFirstDundubhiChargePillar(params: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  pillars: DundubhiChargePillar[];
  halfWidth?: number;
}): { id: number; x: number; y: number; progress: number } | null {
  const { startX, startY, endX, endY } = params;
  const dx = endX - startX;
  const dy = endY - startY;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 0.001) return null;
  const length = Math.sqrt(lengthSq);
  const halfWidth = Math.max(0, params.halfWidth ?? DUNDUBHI_CHARGE_PILLAR_HALF_WIDTH);
  let best: { id: number; x: number; y: number; progress: number } | null = null;
  for (const p of params.pillars) {
    if (p.destroyed || p.type !== 'kurukshetra_pillar' || (p.pillarStage ?? 0) >= 2) continue;
    const t = ((p.x - startX) * dx + (p.y - startY) * dy) / lengthSq;
    if (t < 0 || t > 1) continue;
    const closestX = startX + dx * t;
    const closestY = startY + dy * t;
    if (Math.hypot(p.x - closestX, p.y - closestY) > halfWidth) continue;
    // Bring Dundubhi up to the pillar instead of teleporting through it.
    // Preserve the existing 105px endpoint collision radius.
    const stoppingT = Math.max(0, t - 22 / length);
    if (best !== null && stoppingT >= best.progress) continue;
    best = { id: p.id, x: startX + dx * stoppingT, y: startY + dy * stoppingT, progress: stoppingT };
  }
  return best;
}

/** The full 4.5s tusk-lodge punish must not be clipped to the generic boss 3.2s posture limit. */
export function stepPostureBreakDuringTuskLodge(params: {
  currentPostureBrokenSec: number;
  tuskLodgedSec: number;
  isBoss: boolean;
  dt: number;
}): number {
  const dt = Math.max(0, Number.isFinite(params.dt) ? params.dt : 0);
  const posture = Math.max(0, params.currentPostureBrokenSec);
  const tusk = Math.max(0, params.tuskLodgedSec);
  const held = tusk > 0 ? Math.max(posture, tusk) : Math.min(params.isBoss ? 3.2 : 2.5, posture);
  return Math.max(0, held - dt);
}
