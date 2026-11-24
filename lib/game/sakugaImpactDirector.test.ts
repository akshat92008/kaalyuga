import test from 'node:test';
import assert from 'node:assert/strict';
import { receiveHit, stepCombatHitReaction, type ReceiveHitTarget } from './combatPipeline';
import {
  createSakugaDirectorState,
  getActiveImpactFramePhase,
  sampleCombatContactCamera,
  stepSakugaDirector,
  triggerSakugaImpact,
} from './sakugaImpactDirector';

test('triggerSakugaImpact transitions from bw_ink -> contact_glow -> none cleanly', () => {
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
  assert.ok(state.chiaroscuroTarget >= 0.55 && state.chiaroscuroTarget < 0.65);

  // Advance ~36ms into second half of impact frame -> contact_glow
  stepSakugaDirector(state, 0.036, { isBossChamber: false });
  assert.equal(getActiveImpactFramePhase(state), 'contact_glow');

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


test('Agni release adds local light without overwriting a parry flash or spawning arena-wide beams', () => {
  const state = createSakugaDirectorState();
  const position = { worldX: 510, worldY: 375, angle: 0 };
  triggerSakugaImpact(state, { ...position, kind: 'astra_burst', element: 'agni' });
  assert.equal(getActiveImpactFramePhase(state), 'none');
  assert.ok(state.floorBlowouts.some((light) => light.active && light.radius === 110));
  assert.ok(state.crossBeams.every((beam) => !beam.active));

  triggerSakugaImpact(state, { ...position, kind: 'parry_clash', element: 'parry' });
  triggerSakugaImpact(state, { ...position, worldX: 420, kind: 'heavy_hit', element: 'agni' });
  assert.equal(getActiveImpactFramePhase(state), 'bw_ink');
  assert.equal(state.impactWorldX, 510);
});

test('contact camera follows the hit, yields to stronger beats and returns to rest', () => {
  const state = createSakugaDirectorState();
  triggerSakugaImpact(state, { kind: 'light_hit', element: 'agni', worldX: 400, worldY: 200, angle: 0 });
  const light = sampleCombatContactCamera(state, 300, 250);
  assert.ok(light.zoom > 1 && light.offsetX < 0 && light.offsetY > 0);
  triggerSakugaImpact(state, { kind: 'heavy_hit', element: 'vayu', worldX: 405, worldY: 200, angle: 0 });
  const heavy = sampleCombatContactCamera(state, 300, 250);
  assert.ok(heavy.zoom > light.zoom && heavy.zoom < 1.05);
  triggerSakugaImpact(state, { kind: 'light_hit', element: 'agni', worldX: 220, worldY: 250, angle: 0 });
  assert.deepEqual(sampleCombatContactCamera(state, 300, 250), heavy);
  for (let i = 0; i < 20; i++) stepSakugaDirector(state, 0.02);
  assert.deepEqual(sampleCombatContactCamera(state, 300, 250), { zoom: 1, offsetX: 0, offsetY: 0 });
});

test('confirmed hits give directional recoil, with weaker visible displacement for bosses', () => {
  const normal: ReceiveHitTarget = { hp: 100, maxHp: 100, vx: 0, vy: 0, hitFlashTimer: 0 };
  const boss: ReceiveHitTarget = { ...normal, isBoss: true };
  receiveHit(normal, { rawDamage: 10, knockbackAngleRad: 0, hitKind: 'heavy' });
  receiveHit(boss, { rawDamage: 10, knockbackAngleRad: Math.PI, hitKind: 'heavy' });
  const recoil = stepCombatHitReaction(normal, 0.016);
  const bossRecoil = stepCombatHitReaction(boss, 0.016);
  assert.ok(recoil && recoil.offsetX > 0 && recoil.lean > 0);
  assert.ok(bossRecoil && bossRecoil.offsetX < 0 && -bossRecoil.offsetX < recoil.offsetX);
  const next = stepCombatHitReaction(normal, 0.016);
  assert.ok(next && next.offsetX < recoil.offsetX);
  for (let frame = 0; frame < 30; frame++) stepCombatHitReaction(normal, 0.016);
  assert.equal(stepCombatHitReaction(normal, 0.016), null);
  receiveHit(normal, { rawDamage: 0, knockbackAngleRad: 0 });
  assert.equal(normal.hitReaction, undefined);
});
