import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRudraBakedFrameTime, getRudraTransitionBlendSeconds } from './rudra3dRenderer';

test('Rudra Parashu clip keeps full intentionally trimmed [14%, 88%] contact range', () => {
  const start = computeRudraBakedFrameTime(0, 1.6, 24, true, true);
  const middle = computeRudraBakedFrameTime(0.5, 1.6, 24, true, true);
  const end = computeRudraBakedFrameTime(0.999, 1.6, 24, true, true);
  assert.equal(start.frame, 0);
  assert.ok(Math.abs(start.timeSec - 1.6 * 0.14) < 1e-6);
  assert.ok(middle.timeSec > start.timeSec && middle.timeSec < end.timeSec);
  assert.ok(Math.abs(end.timeSec - 1.6 * 0.88) < 1e-6);
});

test('Rudra action clip does not wrap before its recovery frame', () => {
  const a = computeRudraBakedFrameTime(0.85, 1, 12, true, false);
  const b = computeRudraBakedFrameTime(0.99, 1, 12, true, false);
  assert.ok(b.frame >= a.frame);
  assert.ok(b.timeSec < 1);
});

test('Rudra idle/run loops, action clips clamp, and invalid clocks do not corrupt sprite frames', () => {
  const idle = computeRudraBakedFrameTime(1.9, 1, 14, false, false);
  const loop = computeRudraBakedFrameTime(0.9, 1, 14, false, false);
  assert.equal(idle.frame, loop.frame);
  const bad = computeRudraBakedFrameTime(NaN, NaN, NaN, true, true);
  assert.equal(bad.frame, 0);
  assert.ok(Number.isFinite(bad.timeSec));
});


test('Rudra transitions retain fast input response and never ghost critical hit/parry frames', () => {
  assert.equal(getRudraTransitionBlendSeconds('attack1', 'attack1'), 0);
  assert.equal(getRudraTransitionBlendSeconds('idle', 'hurt'), 0);
  assert.equal(getRudraTransitionBlendSeconds('idle', 'block'), 0);
  assert.equal(getRudraTransitionBlendSeconds('run', 'dash'), 0);
  assert.ok(getRudraTransitionBlendSeconds('run', 'idle') > 0);
  assert.ok(getRudraTransitionBlendSeconds('heavy', 'idle') < 0.08);
  assert.ok(getRudraTransitionBlendSeconds('idle', 'attack1') < 0.05);
});
