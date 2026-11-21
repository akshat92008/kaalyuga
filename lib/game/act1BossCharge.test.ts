import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DUNDUBHI_CHARGE_TRAVEL_SEC,
  advanceDundubhiCharge,
  findFirstDundubhiChargePillar,
  stepPostureBreakDuringTuskLodge,
} from './act1BossCharge';

test('Dundubhi actually traverses the arena rather than teleporting at attack start', () => {
  const first = advanceDundubhiCharge({
    startX: 200, startY: 320, endX: 600, endY: 480,
    elapsedSec: 0, durationSec: DUNDUBHI_CHARGE_TRAVEL_SEC, dt: 0.016,
  });
  assert.ok(first.x > 200 && first.x < 600);
  assert.ok(first.y > 320 && first.y < 480);
  assert.equal(first.complete, false);
  assert.ok(first.vx > 0 && first.vy > 0);
});

test('Charge endpoint and duration are stable at different simulation frame sizes', () => {
  const duration = DUNDUBHI_CHARGE_TRAVEL_SEC;
  for (const dt of [1 / 30, 1 / 60, 1 / 120]) {
    let elapsed = 0;
    let x = 100, y = 200, n = 0;
    while (elapsed < duration && n++ < 1000) {
      const frame = advanceDundubhiCharge({
        startX: 100, startY: 200, endX: 500, endY: 140,
        elapsedSec: elapsed, durationSec: duration, dt,
      });
      assert.ok(frame.x >= x && frame.x <= 500);
      elapsed = frame.elapsedSec;
      x = frame.x; y = frame.y;
    }
    assert.ok(n < 1000);
    assert.ok(Math.abs(x - 500) < 0.0001);
    assert.ok(Math.abs(y - 140) < 0.0001);
  }
  const paused = advanceDundubhiCharge({
    startX: 100, startY: 0, endX: 500, endY: 0,
    elapsedSec: 0.1, durationSec: duration, dt: 0,
  });
  assert.equal(paused.progress, 0.1 / duration);
  assert.equal(paused.vx, 0);
});

test('Boss hits first intact pillar and never chooses a pillar behind him', () => {
  const hit = findFirstDundubhiChargePillar({
    startX: 100, startY: 200, endX: 700, endY: 200,
    pillars: [
      { id: 1, x: 500, y: 205, type: 'kurukshetra_pillar', destroyed: false },
      { id: 2, x: 300, y: 215, type: 'kurukshetra_pillar', destroyed: false },
      { id: 3, x: 220, y: 200, type: 'kurukshetra_pillar', destroyed: true },
      { id: 4, x: 90, y: 200, type: 'kurukshetra_pillar', destroyed: false },
    ],
  });
  assert.ok(hit);
  assert.equal(hit.id, 2);
  assert.ok(hit.x < 300 && hit.x > 200);
});
test('Dundubhi does not collide with pillars off the corridor or already shattered', () => {
  assert.equal(findFirstDundubhiChargePillar({
    startX: 0, startY: 0, endX: 500, endY: 0,
    pillars: [
      { id: 1, x: 100, y: 110, type: 'kurukshetra_pillar', destroyed: false },
      { id: 2, x: 180, y: 10, type: 'kurukshetra_pillar', destroyed: false, pillarStage: 2 },
      { id: 3, x: 290, y: 0, type: 'rock', destroyed: false },
    ],
  }), null);
});

test('4.5-second pillar punish persists; ordinary posture still respects old cap', () => {
  let posture = 4.5, tusk = 4.5;
  for (let i = 0; i < 40; i++) {
    tusk = Math.max(0, tusk - 0.1);
    posture = stepPostureBreakDuringTuskLodge({
      currentPostureBrokenSec: posture, tuskLodgedSec: tusk, isBoss: true, dt: 0.1,
    });
  }
  assert.ok(posture > 0 && posture <= 0.6);
  assert.equal(stepPostureBreakDuringTuskLodge({
    currentPostureBrokenSec: 4.5, tuskLodgedSec: 0, isBoss: true, dt: 0.1,
  }), 3.1);
});
