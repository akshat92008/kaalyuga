import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeParashuSwingVisual,
  getSmashHeavyVfxPresentation,
} from './act1BreathingVisuals';

test('Parashu breathing ribbon is silent during startup and after swing', () => {
  for (const p of [-10, 0, 0.12, 0.19, 0.88, 1, Number.NaN]) {
    const v=computeParashuSwingVisual('light_attack',p,1);
    assert.equal(v.active,false,'progress '+p);
  }
  const contact=computeParashuSwingVisual('light_attack',0.31,1);
  assert.equal(contact.active,true);
  assert.ok(contact.alpha>0.95);
  assert.ok(contact.radius<=72);
});
test('Parashu trail cannot appear during dodge, parry, idle or astras', () => {
  for (const action of ['idle','dodge','parry','astra']) {
    assert.equal(computeParashuSwingVisual(action,0.44).active,false);
  }
});
test('Combo finisher and heavy are readable without filling the arena', () => {
  const combo=computeParashuSwingVisual('light_attack',0.42,4);
  const heavy=computeParashuSwingVisual('heavy_unleash',0.42,1);
  assert.equal(combo.radius,82);
  assert.equal(heavy.radius,84);
  assert.equal(heavy.isHeavy,true);
  assert.ok(heavy.alpha>0.9);
});
test('Normal heavy has no giant full-circle wheel; focused ultimate remains special', () => {
  for (const focus of [0,1,2]) {
    const v=getSmashHeavyVfxPresentation(focus);
    assert.equal(v.createUltimateWheel,false);
    assert.ok(v.slashArc<2.5);
    assert.ok(v.slashRadius<=140);
    assert.ok(v.floorRingRadius<=140);
  }
  const ultimate=getSmashHeavyVfxPresentation(4);
  assert.equal(ultimate.createUltimateWheel,true);
  assert.ok(ultimate.slashRadius<170);
});
test('VFX parameters clamp invalid focus and attack progress', () => {
  assert.deepEqual(getSmashHeavyVfxPresentation(-3),getSmashHeavyVfxPresentation(0));
  assert.deepEqual(getSmashHeavyVfxPresentation(100),getSmashHeavyVfxPresentation(4));
  assert.equal(computeParashuSwingVisual('heavy_unleash',Infinity).active,false);
});

test('Execute also uses the measured Parashu weapon-head silhouette during active frames', () => {
 const pre=computeParashuSwingVisual('execute',0.13);
 const contact=computeParashuSwingVisual('execute',0.35);
 const after=computeParashuSwingVisual('execute',0.95);
 assert.equal(pre.active,false);
 assert.equal(contact.active,true);
 assert.ok(contact.alpha>0.9);
 assert.equal(contact.isHeavy,true);
 assert.ok(contact.radius<100);
 assert.equal(after.active,false);
});
