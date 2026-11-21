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
