/**
 * Non-invasive 2.5D camera cues. The main game's existing view-clamp, input,
 * pause and camera-restoration pipeline remains authoritative.
 */
import type { ParashuFinisherVariant } from './combatPipeline';

export type Act1CameraCueKind = 'execution' | 'boss_phase' | 'boss_entrance';

/** A safe short in-engine finisher shot, not a locked full-screen cinematic. */
export function getAct1FinisherCameraShot(variant: ParashuFinisherVariant): Pick<
  Act1CameraCueInput, 'durationSec' | 'focusWeight' | 'zoomBoost'
> {
  switch (variant) {
    case 'downward_crush': return {durationSec:0.61,focusWeight:0.43,zoomBoost:0.14};
    case 'impaling_lunge': return {durationSec:0.54,focusWeight:0.42,zoomBoost:0.115};
    case 'spin_360_cleave': return {durationSec:0.60,focusWeight:0.40,zoomBoost:0.070};
  }
}

/** The sample has its own eased fade envelope: never multiply it by dt again. */
export function composeAct1CinematicZoom(baseZoom: number, cueZoomBoost: number): number {
  if (!Number.isFinite(baseZoom)) return 1;
  const safeBoost = Number.isFinite(cueZoomBoost)
    ? Math.max(-0.06, Math.min(0.15, cueZoomBoost)) : 0;
  return Math.max(0.72, Math.min(1.20, baseZoom + safeBoost));
}
export interface Act1CameraCueInput {
  kind: Act1CameraCueKind;
  focusX: number;
  focusY: number;
  durationSec: number;
  focusWeight: number;
  zoomBoost: number;
}
export interface Act1CameraCueSample {
  active: boolean;
  focusX: number;
  focusY: number;
  focusWeight: number;
  zoomBoost: number;
}
const NONE: Act1CameraCueSample = { active: false, focusX: 0, focusY: 0, focusWeight: 0, zoomBoost: 0 };

const PRIORITIES: Record<Act1CameraCueKind, number> = {
  boss_entrance: 1,
  boss_phase: 2,
  execution: 3,
};

export class Act1CinematicCamera {
  private cue: (Required<Act1CameraCueInput> & { elapsedSec: number }) | null = null;

  start(input: Act1CameraCueInput): boolean {
    if (![input.focusX, input.focusY, input.durationSec, input.focusWeight, input.zoomBoost]
      .every(Number.isFinite) || input.durationSec <= 0) return false;
    if (this.cue && PRIORITIES[this.cue.kind] > PRIORITIES[input.kind]) return false;
    this.cue = {
      kind: input.kind,
      focusX: input.focusX,
      focusY: input.focusY,
      durationSec: Math.max(0.12, Math.min(1.8, input.durationSec)),
      focusWeight: Math.max(0, Math.min(input.kind === 'execution' ? 0.45 : 0.35, input.focusWeight)),
      zoomBoost: Math.max(-0.06, Math.min(input.kind === 'execution' ? 0.15 : 0.07, input.zoomBoost)),
      elapsedSec: 0,
    };
    return true;
  }

  cancel(): void { this.cue = null; }
  /** Return true only when Escape actually consumed a live cinematic shot. */
  skip(): boolean {
    if (!this.cue) return false;
    this.cancel();
    return true;
  }

  step(rawDtSec: number, blocked = false): Act1CameraCueSample {
    const cue = this.cue;
    if (!cue) return NONE;
    if (blocked) {
      this.cancel();
      return NONE;
    }
    // A suspended browser tab must never resume inside a stale execution shot.
    if (!Number.isFinite(rawDtSec) || rawDtSec > 0.35) {
      this.cancel();
      return NONE;
    }
    const dt = Math.min(0.2, Math.max(0, rawDtSec));
    cue.elapsedSec += dt;
    const progress = Math.min(1, cue.elapsedSec / cue.durationSec);
    if (progress >= 1) {
      this.cancel();
      return NONE;
    }
    // Soft attack/release envelope: keep the game visible, never lock movement.
    const fadeIn = Math.min(1, progress / 0.16);
    const fadeOut = Math.min(1, (1 - progress) / 0.33);
    const influence = Math.max(0, Math.min(fadeIn, fadeOut));
    const smooth = influence * influence * (3 - 2 * influence);
    return {
      active: true,
      focusX: cue.focusX,
      focusY: cue.focusY,
      focusWeight: cue.focusWeight * smooth,
      zoomBoost: cue.zoomBoost * smooth,
    };
  }
}
