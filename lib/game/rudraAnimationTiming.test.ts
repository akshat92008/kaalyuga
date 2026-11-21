import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRudraBakedFrameTime, getRudraTransitionBlendSeconds, resolveRudraAnimStateAndClock, type RudraRenderInput } from './rudra3dRenderer';

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

test('all three finishers sample Rudra poses from the same active-frame clock as impact VFX', () => {
  const base: RudraRenderInput = {
    dt: 1 / 60, vx: 0, vy: 0, facingX: 1, facingY: 0,
    slashAngle: 0, isAttacking: false, isHeavyAttack: true,
    comboStep: 4, attackProgress: 0.47, isDodging: false,
    isParrying: false, isCasting: false, isHealing: false,
    isHurt: false, isDefeated: false, stance: 'smash',
    focusOrbs: 0, elevationY: 0,
  };
  const actions = { cast: {}, heavy: {}, attack3: {} };
  for (const [variant, expected] of [
    ['downward_crush', 'heavy'],
    ['spin_360_cleave', 'cast'],
    ['impaling_lunge', 'attack3'],
  ] as const) {
    // Renderers can be cold-started or stalled by hitstop. Poses must follow
    // the gameplay normalized clock, not an independent animation timer.
    const input = { ...base, finisherVariant: variant };
    const first = resolveRudraAnimStateAndClock(input, 0.01, 20, actions);
    const afterStall = resolveRudraAnimStateAndClock(input, 0.39, 120, actions);
    assert.equal(first.state, expected);
    assert.equal(first.usesNormalizedProgress, true);
    assert.equal(first.animClock, 0.47);
    assert.deepEqual(afterStall, first);
  }
});

test('normal Astra casting still obeys cast stateProgress, not stale attack progress', () => {
  const cast: RudraRenderInput = {
    dt: 1 / 60, vx: 0, vy: 0, facingX: 1, facingY: 0,
    slashAngle: 0, isAttacking: false, isHeavyAttack: false,
    comboStep: 0, attackProgress: 0.85, isDodging: false,
    isParrying: false, isCasting: true, isHealing: false,
    isHurt: false, isDefeated: false, stance: 'smash',
    focusOrbs: 0, elevationY: 0, stateProgress: 0.16,
  };
  const result = resolveRudraAnimStateAndClock(cast, 0.12, 34, { cast: {} });
  assert.equal(result.state, 'cast');
  assert.equal(result.animClock, 0.16);
});
