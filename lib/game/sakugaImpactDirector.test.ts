import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSakugaDirectorState,
  getActiveImpactFramePhase,
  stepSakugaDirector,
  triggerSakugaImpact,
} from './sakugaImpactDirector';

test('triggerSakugaImpact transitions from bw_ink -> dual_split -> none cleanly', () => {
  const state = createSakugaDirectorState();
  assert.equal(getActiveImpactFramePhase(state), 'none');

  triggerSakugaImpact(state, {
    kind: 'parry_clash',
    element: 'parry',
    worldX: 500,
    worldY: 400,
    angle: 0.4,
    intensity: 1.1,
  });

  assert.equal(getActiveImpactFramePhase(state), 'bw_ink');
  assert.ok(state.crossBeams.some((b) => b.active), 'spawns cross-cutting clash beams');
  assert.ok(state.floorBlowouts.some((f) => f.active), 'spawns HDR floor light blowout');
  assert.ok(state.speedLinesAlpha > 0.7, 'activates radial ink speed lines');
  assert.ok(state.chiaroscuroTarget >= 0.7, 'deepens arena shadows during clash');

  // Advance ~36ms into second half of impact frame -> dual_split
  stepSakugaDirector(state, 0.036, { isBossChamber: false });
  assert.equal(getActiveImpactFramePhase(state), 'dual_split');

  // Advance another 40ms -> impact frame finishes
  stepSakugaDirector(state, 0.04, { isBossChamber: false });
  assert.equal(getActiveImpactFramePhase(state), 'none');
});

test('Dutch camera tilt spring stays clamped and settles cleanly to zero', () => {
  const state = createSakugaDirectorState();
  triggerSakugaImpact(state, {
    kind: 'execution',
    element: 'agni',
    worldX: 600,
    worldY: 500,
    angle: 0,
    intensity: 1.5,
  });

  for (let i = 0; i < 90; i++) {
    stepSakugaDirector(state, 0.016, { isBossChamber: true });
    assert.ok(Math.abs(state.dutchTiltRad) <= 0.0721, 'dutch tilt never exceeds safe arena margin');
  }
  assert.equal(state.dutchTiltRad, 0, 'dutch tilt settles completely to 0');
  assert.equal(state.speedLinesAlpha, 0, 'speed lines fade out cleanly');
  assert.equal(state.chromaticSplitPx, 0, 'chromatic split decays to 0');
});

test('Zero-GC beam and floor blowout pools recycle cleanly under heavy spam', () => {
  const state = createSakugaDirectorState();
  for (let i = 0; i < 40; i++) {
    triggerSakugaImpact(state, {
      kind: 'astra_burst',
      element: i % 2 === 0 ? 'agni' : 'vajra',
      worldX: 300 + i * 5,
      worldY: 300,
      angle: i * 0.25,
    });
  }
  assert.equal(state.crossBeams.length, 14, 'cross beam pool stays fixed length');
  assert.equal(state.floorBlowouts.length, 10, 'floor blowout pool stays fixed length');
});
