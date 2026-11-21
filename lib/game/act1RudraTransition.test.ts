import test from 'node:test';
import assert from 'node:assert/strict';
import { rudraPoseBlendAlpha, rudraPoseTransitionDurationSec } from './act1RudraTransition';

test('attack transitions are quick and keep strike startup unobstructed', () => {
  assert.ok(rudraPoseTransitionDurationSec('idle','attack1') < 0.085);
  assert.ok(rudraPoseTransitionDurationSec('run','heavy') < 0.085);
  assert.equal(rudraPoseTransitionDurationSec('attack2','attack2'), 0);
  assert.equal(rudraPoseTransitionDurationSec('run','hurt'), 0);
  assert.ok(rudraPoseTransitionDurationSec('idle','dash') <= 0.05);
  assert.ok(rudraPoseTransitionDurationSec('heavy','idle') < 0.11);
});

test('pose blend is stable at 30, 60 and 120 Hz and has clamped endpoints', () => {
  for (const hz of [30,60,120]) {
    const duration=0.072;
    let elapsed=0;
    let last=0;
    for (let i=0;i<20;i++) {
      elapsed += 1/hz;
      const alpha=rudraPoseBlendAlpha(elapsed,duration);
      assert.ok(alpha>=last && alpha<=1);
      last=alpha;
    }
    assert.equal(last,1);
  }
  assert.equal(rudraPoseBlendAlpha(0,.072),0);
  assert.equal(rudraPoseBlendAlpha(.036,.072),.5);
  assert.equal(rudraPoseBlendAlpha(1,.072),1);
  assert.equal(rudraPoseBlendAlpha(-1,.072),0);
  assert.equal(rudraPoseBlendAlpha(NaN,.072),1);
  assert.equal(rudraPoseBlendAlpha(.01,0),1);
});
