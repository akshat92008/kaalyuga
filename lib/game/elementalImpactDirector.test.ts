import test from 'node:test';
import assert from 'node:assert/strict';
import {
  heavyElementFromStance,
  resolveHeavyReleaseProfile,
  spawnHeavyElementalRelease,
  type HeavyEffectSink,
  type HeavyElement,
} from './elementalImpactDirector';

test('heavy elemental selection includes original fire, water, green wind, thunder and guardian', () => {
  assert.equal(heavyElementFromStance('smash'), 'agni');
  assert.equal(heavyElementFromStance('water'), 'varuna');
  assert.equal(heavyElementFromStance('pillar'), 'vayu');
  assert.equal(heavyElementFromStance('thrust'), 'vajra');
  assert.equal(heavyElementFromStance('smash', true), 'guardian');
});

test('heavy release stays bounded on low-end GPU and scales with power', () => {
  const normal = resolveHeavyReleaseProfile({ x: 30, y: 40, angle: 0, radius: 180, element: 'vayu' });
  const charged = resolveHeavyReleaseProfile({ x: 30, y: 40, angle: 0, radius: 180, energyOrbs: 4, element: 'vayu' });
  assert.ok(charged.radius > normal.radius);
  assert.ok(charged.sparks > normal.sparks);
  const corrupted = resolveHeavyReleaseProfile({ x: NaN, y: 0, angle: NaN, radius: Infinity, energyOrbs: Infinity, element: 'guardian' });
  assert.ok(Number.isFinite(corrupted.radius));
  assert.ok(corrupted.sparks <= 19);
});

test('each elemental heavy uses distinct primary geometry and only one shared spark burst', () => {
  const primaryNames: Record<HeavyElement, string> = {
    agni: 'spawnSolarFlameWheel',
    varuna: 'spawnWaterDragon',
    vayu: 'spawnWindGaleCrescents',
    vajra: 'spawnThunderZigzag',
    guardian: 'spawnSlashRibbon',
  };
  const methods = [
    'spawnSolarFlameWheel', 'spawnWaterDragon', 'spawnWindGaleCrescents',
    'spawnThunderZigzag', 'spawnSlashRibbon', 'spawnShockwaveRing',
    'spawnClashStarburst', 'spawnSparkBurst',
  ];
  for (const element of Object.keys(primaryNames) as HeavyElement[]) {
    const calls: string[] = [];
    const sink = Object.fromEntries(methods.map((name) => [
      name,
      () => { calls.push(name); },
    ])) as unknown as HeavyEffectSink;
    const profile = spawnHeavyElementalRelease(sink, {
      element, x: 500, y: 300, angle: 0.2, radius: 170, energyOrbs: 2,
    });
    assert.equal(calls[0], primaryNames[element], element);
    assert.equal(calls.filter((name) => name === 'spawnSparkBurst').length, 1, element);
    assert.ok(calls.length >= 3 && calls.length <= 4, element);
    assert.ok(profile.radius > 170);
  }
});
