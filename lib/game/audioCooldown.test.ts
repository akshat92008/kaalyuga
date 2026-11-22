import test from 'node:test';
import assert from 'node:assert/strict';
import { isAudioEventOnCooldown } from './audioCooldown';

test('initial boss intro and first heavy sound are never suppressed at startup', () => {
  assert.equal(isAudioEventOnCooldown(undefined, 100, 1500), false);
  assert.equal(isAudioEventOnCooldown(undefined, 10, 90), false);
});

test('repeated voice lines and SFX respect their individual cooldowns', () => {
  assert.equal(isAudioEventOnCooldown(100, 160, 1500), true);
  assert.equal(isAudioEventOnCooldown(100, 1599, 1500), true);
  assert.equal(isAudioEventOnCooldown(100, 1600, 1500), false);
  assert.equal(isAudioEventOnCooldown(100, 160, 45), false);
});

test('nonmonotonic or unavailable clocks fail open instead of permanently muting audio', () => {
  assert.equal(isAudioEventOnCooldown(500, 100, 1500), false);
  assert.equal(isAudioEventOnCooldown(NaN, 200, 1500), false);
});
