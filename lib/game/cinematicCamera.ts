/**
 * Safe, deterministic camera choreography for Kaliyuga's painted 2.5D arenas.
 * This controls 2D canvas framing only; it must never rotate into missing 3D geometry.
 * Values are normalized to the viewport and independent of frame rate.
 */
export interface CinematicCameraKeyframe {
  at: number;
  focusX: number;
  focusY: number;
  zoom: number;
}

export interface CinematicCameraFrame {
  zoom: number;
  offsetX: number;
  offsetY: number;
  focusX: number;
  focusY: number;
  completed: boolean;
}

export const CINEMATIC_CAMERA_REST = Object.freeze({
  at: 0,
  focusX: 0.5,
  focusY: 0.75,
  zoom: 1,
});

function clamp(n: number, lo: number, hi: number): number {
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo;
}

function smoothstep(t: number): number {
  const n = clamp(t, 0, 1);
  return n * n * (3 - 2 * n);
}

/** Clamp pathological authoring input so close-ups cannot reveal painted arena edges. */
function sanitize(frame: CinematicCameraKeyframe): CinematicCameraKeyframe {
  return {
    at: Math.max(0, Number.isFinite(frame.at) ? frame.at : 0),
    focusX: clamp(frame.focusX, 0.35, 0.65),
    focusY: clamp(frame.focusY, 0.58, 0.84),
    zoom: clamp(frame.zoom, 0.88, 1.28),
  };
}

/**
 * A reusable non-destructive shot track. No timers, input locks, or gameplay mutation.
 * On skip/interruption, return to the resting camera immediately.
 */
export class CinematicCameraTrack {
  private readonly frames: CinematicCameraKeyframe[];
  private interrupted = false;
  private readonly duration: number;

  constructor(frames: readonly CinematicCameraKeyframe[], durationSec: number) {
    this.duration = Math.max(0.01, Number.isFinite(durationSec) ? durationSec : 0.01);
    const sanitized = frames.map(sanitize).filter((frame) => frame.at <= this.duration);
    this.frames = [
      { ...CINEMATIC_CAMERA_REST },
      ...sanitized,
      { ...CINEMATIC_CAMERA_REST, at: this.duration },
    ].sort((a, b) => a.at - b.at);
  }

  public restart(): void {
    this.interrupted = false;
  }

  public interrupt(): void {
    this.interrupted = true;
  }

  public skip(): void {
    this.interrupt();
  }

  public sample(timeSec: number, width: number, height: number): CinematicCameraFrame {
    const safeW = Math.max(1, Number.isFinite(width) ? width : 1);
    const safeH = Math.max(1, Number.isFinite(height) ? height : 1);
    const t = clamp(timeSec, 0, this.duration);
    if (this.interrupted || t >= this.duration) {
      return {
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        focusX: CINEMATIC_CAMERA_REST.focusX,
        focusY: CINEMATIC_CAMERA_REST.focusY,
        completed: true,
      };
    }

    let i = 1;
    while (i < this.frames.length - 1 && this.frames[i].at <= t) i += 1;
    const a = this.frames[i - 1];
    const b = this.frames[i];
    const ease = smoothstep((t - a.at) / Math.max(0.0001, b.at - a.at));
    const focusX = a.focusX + (b.focusX - a.focusX) * ease;
    const focusY = a.focusY + (b.focusY - a.focusY) * ease;
    const zoom = a.zoom + (b.zoom - a.zoom) * ease;
    return {
      zoom,
      // Horizontal/vertical pan stay inside the modest framing safety envelope.
      offsetX: Math.max(-safeW * 0.15, Math.min(safeW * 0.15, (CINEMATIC_CAMERA_REST.focusX - focusX) * safeW)),
      offsetY: Math.max(-safeH * 0.17, Math.min(safeH * 0.17, (CINEMATIC_CAMERA_REST.focusY - focusY) * safeH)),
      focusX,
      focusY,
      completed: false,
    };
  }
}

/** Deterministic, rapidly decaying impact impulse: no camera noise between impacts. */
export function sampleCinematicImpactImpulse(
  timeSec: number,
  impactSec: number,
  width: number,
  height: number,
  intensity = 1
): { x: number; y: number } {
  const t = timeSec - impactSec;
  if (!Number.isFinite(t) || t < 0 || t >= 0.38) return { x: 0, y: 0 };
  const strength = clamp(intensity, 0, 1) * Math.pow(1 - t / 0.38, 2);
  const scale = Math.min(Math.max(0, width) / 960, Math.max(0, height) / 540, 1);
  return {
    x: Math.sin(t * 103) * 6 * strength * scale,
    y: Math.cos(t * 121) * 5 * strength * scale,
  };
}
