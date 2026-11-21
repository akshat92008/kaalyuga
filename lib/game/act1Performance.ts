/**
 * Act I browser frame-time profiler.
 * Opt-in only: never reallocates unbounded history and never claims GPU time.
 */
export interface Act1FrameStats {
  samples: number;
  medianMs: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  meanMs: number;
  estimatedFps: number;
  framesOver33Ms: number;
  framesOver50Ms: number;
  discardedBackgroundFrames: number;
}
export class Act1FrameProfiler {
  private frames: number[];
  private next = 0;
  private count = 0;
  private over33 = 0;
  private over50 = 0;
  private suspended = 0;

  constructor(private readonly capacity = 1200) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 6000) {
      throw new RangeError('Frame-profiler capacity must be between 1 and 6000');
    }
    this.frames = new Array<number>(capacity).fill(0);
  }

  record(rawDtSec: number, hidden = false): void {
    const ms = rawDtSec * 1000;
    if (hidden || !Number.isFinite(ms) || ms <= 0 || ms > 750) {
      this.suspended++;
      return;
    }
    if (this.count === this.capacity) {
      const stale = this.frames[this.next];
      if (stale > 33.333) this.over33--;
      if (stale > 50) this.over50--;
    }
    this.frames[this.next] = ms;
    this.next = (this.next + 1) % this.capacity;
    this.count = Math.min(this.capacity, this.count + 1);
    if (ms > 33.333) this.over33++;
    if (ms > 50) this.over50++;
  }

  reset(): void {
    this.next = 0;
    this.count = 0;
    this.over33 = 0;
    this.over50 = 0;
    this.suspended = 0;
  }

  snapshot(): Act1FrameStats {
    if (!this.count) {
      return { samples: 0, medianMs: 0, p95Ms: 0, p99Ms: 0,
        maxMs: 0, meanMs: 0, estimatedFps: 0,
        framesOver33Ms: 0, framesOver50Ms: 0, discardedBackgroundFrames: this.suspended };
    }
    const sorted = this.frames.slice(0, this.count).sort((a, b) => a - b);
    const at = (quantile: number) => sorted[Math.min(sorted.length - 1,
      Math.max(0, Math.ceil(quantile * sorted.length) - 1))];
    const mean = sorted.reduce((a, b) => a + b, 0) / this.count;
    const round = (n: number) => Math.round(n * 100) / 100;
    return {
      samples: this.count,
      medianMs: round(at(0.5)),
      p95Ms: round(at(0.95)),
      p99Ms: round(at(0.99)),
      maxMs: round(sorted[sorted.length - 1]),
      meanMs: round(mean),
      estimatedFps: round(1000 / mean),
      framesOver33Ms: this.over33,
      framesOver50Ms: this.over50,
      discardedBackgroundFrames: this.suspended,
    };
  }
}
