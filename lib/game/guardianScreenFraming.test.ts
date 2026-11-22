import test from 'node:test';
import assert from 'node:assert/strict';
import { computeGuardianPreviewDrawSize } from './guardianScreenFraming';

test('normal framing preserves monumental default if hero has vertical space', () => {
  assert.equal(computeGuardianPreviewDrawSize(400, 0.65), 340);
});
test('near upper UI, the guardian scales down instead of overlapping top controls', () => {
  assert.equal(Math.round(computeGuardianPreviewDrawSize(262, 0.65)), 292);
  const size=computeGuardianPreviewDrawSize(262,0.65);
  assert.ok(262-size*0.65>=71);
});
test('pathological camera or absent ratio degrades without NaN or negative size', () => {
  for(const value of [NaN, -1, 0, 1.1]){
    const size=computeGuardianPreviewDrawSize(175,value);
    assert.ok(Number.isFinite(size)&&size>0&&size<=340);
  }
  assert.equal(computeGuardianPreviewDrawSize(-500,0.6),180);
});
