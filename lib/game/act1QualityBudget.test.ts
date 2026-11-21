import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAct1VfxQualityBudget as budget } from './act1QualityBudget';

test('VFX GPU budget scales bloom, secondary sparks and display resolution', () => {
  const perf = budget('performance');
  const balanced = budget('balanced');
  const cine = budget('ultra');
  assert.equal(perf.bloomEnabled, false);
  assert.equal(balanced.bloomEnabled, true);
  assert.equal(cine.bloomStrength, 0.68);
  assert.ok(perf.pixelRatio < balanced.pixelRatio);
  assert.ok(balanced.pixelRatio < cine.pixelRatio);
  assert.ok(perf.maxLiveSparks < balanced.maxLiveSparks);
  assert.ok(balanced.maxLiveSparks < cine.maxLiveSparks);
});
test('legacy high mode keeps readability while preserving compatibility', () => {
  assert.equal(budget('high').maxLiveSparks, 100);
});
