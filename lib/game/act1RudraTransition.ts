/**
 * Act I Rudra pose-transition compositor policy.
 *
 * Pure time/priority rules; the renderer blends two *already baked* studio
 * frames without altering AnimationMixer tracks, attack contact or i-frames.
 * A very short easing window avoids hard atlas-state pops on an 8 GB machine.
 */
const FINISHER_STATES = new Set(['attack1', 'attack2', 'attack3', 'heavy', 'cast']);

export function rudraPoseTransitionDurationSec(from: string, to: string): number {
  if (from === to || to === 'hurt') return 0;
  if (to === 'dash' || from === 'dash') return 0.045;
  if (FINISHER_STATES.has(to)) return 0.072;
  if (FINISHER_STATES.has(from)) return 0.096;
  if (to === 'block') return 0.055;
  return 0.105;
}

/** Smoothstep, clamped and independent of the display refresh rate. */
export function rudraPoseBlendAlpha(elapsedSec: number, durationSec: number): number {
  if (!Number.isFinite(elapsedSec) || !Number.isFinite(durationSec) ||
      durationSec <= 0) return 1;
  const t = Math.max(0, Math.min(1, elapsedSec / durationSec));
  return t * t * (3 - 2 * t);
}
