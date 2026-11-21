/**
 * Non-invasive 2.5D camera cues. The main game's existing view-clamp, input,
 * pause and camera-restoration pipeline remains authoritative.
 */
export type Act1CameraCueKind = 'execution' | 'boss_phase' | 'boss_entrance';
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
      focusWeight: Math.max(0, Math.min(0.35, input.focusWeight)),
      zoomBoost: Math.max(-0.06, Math.min(0.07, input.zoomBoost)),
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
