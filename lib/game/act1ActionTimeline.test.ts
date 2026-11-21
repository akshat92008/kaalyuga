import test from 'node:test';
import assert from 'node:assert/strict';
import { canFirePendingStrike as fire, shouldCancelPendingStrike as cancel } from './act1ActionTimeline';
test('attack contact/VFX only fire once in the owning action active window', () => {
  assert.equal(fire('heavy_unleash','heavy_unleash',0.20,0.28,false),false);
  assert.equal(fire('heavy_unleash','heavy_unleash',0.28,0.28,false),true);
  assert.equal(fire('heavy_unleash','heavy_unleash',0.75,0.28,true),false);
  assert.equal(fire('heavy_unleash','dodge',0.75,0.28,false),false);
  assert.equal(fire('execute','execute',0.38,0.35,false),true);
});
test('cancels stale strikes on dodge, death or chamber-reset idle', () => {
  for (const action of ['dodge','death','idle','recover']) {
    assert.equal(cancel('execute',action),true);
  }
  assert.equal(cancel('execute','execute'),false);
});

test('a previous swing never owns a newer swing with the same action name', () => {
  // Light combo actions share a label, so the attackSerial is authoritative.
  assert.equal(cancel('light_attack','light_attack',12,13,0,0), true);
  assert.equal(cancel('light_attack','light_attack',12,12,0,1), true);
  assert.equal(cancel('light_attack','light_attack',12,12,0,0), false);
  assert.equal(cancel('heavy_unleash','heavy_unleash',24,24,3,3), false);
  assert.equal(cancel('execute','execute',3,4,7,7), true);
});

test('damage cues cannot fire at windup and fire once at active contact', () => {
  const strike = { action: 'light_attack', serial: 5, chamber: 0, fired: false };
  const mayFire = (progress: number, action: string, serial: number, chamber: number) =>
    !cancel(strike.action as 'light_attack', action, strike.serial, serial, strike.chamber, chamber) &&
    fire(strike.action as 'light_attack', action, progress, 0.25, strike.fired);
  assert.equal(mayFire(0.24, 'light_attack', 5, 0), false);
  assert.equal(mayFire(0.25, 'light_attack', 5, 0), true);
  strike.fired = true;
  assert.equal(mayFire(0.75, 'light_attack', 5, 0), false);
  assert.equal(mayFire(0.30, 'dodge', 5, 0), false);
  assert.equal(mayFire(0.30, 'light_attack', 6, 0), false);
  assert.equal(mayFire(0.30, 'light_attack', 5, 1), false);
});

test('heavy and execution contact windows honor active thresholds and interruption', () => {
  for (const [action, threshold] of [['heavy_unleash', 0.28], ['execute', 0.35]] as const) {
    assert.equal(fire(action, action, threshold-0.01, threshold, false), false);
    assert.equal(fire(action, action, threshold, threshold, false), true);
    assert.equal(cancel(action, 'dodge', 9, 9, 3, 3), true);
    assert.equal(cancel(action, action, 9, 10, 3, 3), true);
  }
});
