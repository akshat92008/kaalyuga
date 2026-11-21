import test from 'node:test';
import assert from 'node:assert/strict';
import { displayMeruQualityTier, presetForQualityTier } from '../../engine/ue5GraphicsEngine';

test('three player-visible quality tiers preserve all character rendering', () => {
  const labels = ['performance','balanced','ultra'] as const;
  assert.deepEqual(labels.map(displayMeruQualityTier),['PERFORMANCE','BALANCED','CINEMATIC']);
  const perf = presetForQualityTier('performance');
  const balanced = presetForQualityTier('balanced');
  const cinematic = presetForQualityTier('ultra');
  assert.equal(perf.hdrBloom, false);
  assert.equal(balanced.hdrBloom, true);
  assert.equal(cinematic.lumenGiBounce, true);
  assert.equal(perf.dynamicShadows, false);
  assert.equal(balanced.dynamicShadows, false);
});
test('legacy high tier remains loadable and distinct', () => {
  assert.equal(presetForQualityTier('high').tier, 'high');
  assert.equal(displayMeruQualityTier('high'), 'HIGH (LEGACY)');
});
