import test from 'node:test';
import assert from 'node:assert/strict';
import {
  executionImpactSignature,
  spawnExecutionImpactFx,
} from './executionImpactDirector';
import type { HeavyEffectSink } from './elementalImpactDirector';

test('all three executions have different silhouettes and strictly bounded particle budgets', () => {
  const specs = [
    ['downward_crush', 'spawnSlashRibbon'],
    ['spin_360_cleave', 'spawnWindGaleCrescents'],
    ['impaling_lunge', 'spawnThunderZigzag'],
  ] as const;
  const palettes = new Set<string>();
  for (const [variant, primary] of specs) {
    const calls: { name: string; input: Record<string, unknown> }[] = [];
    const methods = [
      'spawnSolarFlameWheel', 'spawnWaterDragon', 'spawnWindGaleCrescents',
      'spawnThunderZigzag', 'spawnSlashRibbon', 'spawnClashStarburst',
      'spawnShockwaveRing', 'spawnSparkBurst',
    ];
    const fx = Object.fromEntries(methods.map(name => [name,
      (input: Record<string, unknown>) => { calls.push({ name, input }); },
    ])) as unknown as HeavyEffectSink;
    const signature = spawnExecutionImpactFx(fx, variant, 500, 300, 0);
    assert.equal(calls[0].name, primary);
    assert.equal(calls[calls.length - 1].name, 'spawnSparkBurst');
    assert.ok(calls.length <= 3, 'Too many stacked effects: ' + variant);
    assert.ok(signature.strikeRadius <= 175);
    assert.ok(signature.sparkCount <= 18);
    palettes.add(signature.palette);
    for (const call of calls) {
      if ('radius' in call.input) assert.ok(Number(call.input.radius) <= 175);
    }
  }
  assert.equal(palettes.size, 3);
});

test('execution impact director never emits non-finite weapon impact coordinates', () => {
  let recorded: Record<string, unknown> | undefined;
  const noop = () => {};
  const fx = {
    spawnSlashRibbon: (props: Record<string, unknown>) => { recorded = props; },
    spawnShockwaveRing: noop, spawnSparkBurst: noop,
  } as unknown as HeavyEffectSink;
  spawnExecutionImpactFx(fx, 'downward_crush', NaN, Infinity, NaN);
  assert.equal(recorded?.x, 0);
  assert.equal(recorded?.y, -24);
  assert.equal(recorded?.angle, 0);
});

test('execution signature can be inspected without a WebGL device', () => {
  const spec = executionImpactSignature('impaling_lunge');
  assert.equal(spawnExecutionImpactFx(null, 'impaling_lunge', 0, 0, 0), spec);
});
