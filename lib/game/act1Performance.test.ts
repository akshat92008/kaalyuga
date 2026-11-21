import test from 'node:test';
import assert from 'node:assert/strict';
import { Act1FrameProfiler } from './act1Performance';

test('records real frame p95/p99 rather than clamped 60 FPS simulation dt', () => {
  const p = new Act1FrameProfiler(10);
  [0.01, 0.016, 0.016, 0.016, 0.016, 0.016, 0.033, 0.035, 0.05, 0.12]
    .forEach(x => p.record(x));
  const s = p.snapshot();
  assert.equal(s.samples, 10);
  assert.equal(s.medianMs, 16);
  assert.equal(s.p95Ms, 120);
  assert.equal(s.p99Ms, 120);
  assert.equal(s.framesOver33Ms, 3);
  assert.equal(s.framesOver50Ms, 1);
  assert.ok(s.estimatedFps < 40);
});

test('ring buffer eviction updates counters without unbounded memory', () => {
  const p = new Act1FrameProfiler(2);
  p.record(0.12);
  p.record(0.05);
  p.record(0.016);
  const s = p.snapshot();
  assert.equal(s.samples, 2);
  assert.equal(s.maxMs, 50);
  assert.equal(s.framesOver33Ms, 1);
  assert.equal(s.framesOver50Ms, 0);
  p.reset();
  assert.equal(p.snapshot().samples, 0);
});

test('ignores hidden tabs, invalid timers and long browser suspensions', () => {
  const p = new Act1FrameProfiler();
  [Number.NaN, -1, 1, 0.016].forEach(x => p.record(x));
  p.record(0.016, true);
  assert.equal(p.snapshot().samples, 1);
  assert.equal(p.snapshot().discardedBackgroundFrames, 4);
});
