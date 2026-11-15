import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AstraCycloneVfx,
  buildSlashRibbonStrip,
  catmullRomValue,
  DashEchoPool,
  DundubhiBloodDemonArtVfx,
  generateParametricSwingSamples,
  HeavyWaveVfx,
  PooledSparkSystem,
  RIBBON_PALETTES,
  type RibbonSample,
} from './slashRibbonVfx';
import {
  computeFlipbookFrame,
  computeFlipbookUvRect,
  FlipbookEffectPool,
  KALIYUGA_VFX_SHEETS,
} from './vfxFlipbook';

test('Catmull-Rom interpolation returns endpoints at t=0 and t=1', () => {
  assert.equal(catmullRomValue(0, 2, 5, 9, 0), 2);
  assert.equal(catmullRomValue(0, 2, 5, 9, 1), 5);
});

test('buildSlashRibbonStrip generates smooth finite coordinates and valid UVs', () => {
  const samples: RibbonSample[] = [
    { baseX: 0, baseY: 1, baseZ: 0, tipX: 0, tipY: 2, tipZ: 1, age: 0.1 },
    { baseX: 1, baseY: 1.2, baseZ: 0.4, tipX: 1.5, tipY: 2.2, tipZ: 1.4, age: 0.05 },
    { baseX: 2, baseY: 1.0, baseZ: 0.9, tipX: 2.8, tipY: 1.9, tipZ: 1.8, age: 0 },
  ];
  const subdivisions = 3;
  const maxVerts = (samples.length - 1) * subdivisions + 1;
  const positions = new Float32Array(maxVerts * 6);
  const uvs = new Float32Array(maxVerts * 4);
  const count = buildSlashRibbonStrip(samples, 0.16, subdivisions, positions, uvs);

  assert.equal(count, 7);
  for (let i = 0; i < count * 6; i++) {
    assert.ok(Number.isFinite(positions[i]), `Position at ${i} should be finite`);
  }
  assert.equal(uvs[(count - 1) * 4 + 0], 1);
  assert.equal(uvs[(count - 1) * 4 + 3], 1);
});

test('buildSlashRibbonStrip returns 0 points when fewer than 2 samples exist', () => {
  const positions = new Float32Array(60);
  const uvs = new Float32Array(40);
  assert.equal(buildSlashRibbonStrip([], 0.16, 3, positions, uvs), 0);
});

test('all ribbon themes define distinct core/mid/ink palettes', () => {
  assert.ok(RIBBON_PALETTES.agni.midColor.r > 0.8);
  assert.ok(RIBBON_PALETTES.vajra.midColor.r > 0.8 && RIBBON_PALETTES.vajra.outerColor.b > 0.5);
  assert.ok(RIBBON_PALETTES.vayu.midColor.g > 0.45);
  assert.ok(RIBBON_PALETTES.agni.inkColor.r < 0.2);
});

test('generateParametricSwingSamples produces tight blade-accurate arc points for attack1 and cast', () => {
  const { samples, opacity } = generateParametricSwingSamples('attack1', 0, 0, 0.4, 0.45, 0, 0.16, 16);
  assert.equal(samples.length, 16);
  assert.equal(opacity, 1);
  for (const s of samples) {
    const rBase = Math.hypot(s.baseX, s.baseZ);
    const rTip = Math.hypot(s.tipX, s.tipZ);
    const span = rTip - rBase;
    assert.ok(span >= 0.38 && span <= 0.65, `Expected tight blade span, got ${span.toFixed(2)}`);
  }

  const castFade = generateParametricSwingSamples('cast', 1, -1, 0, 0.85, 0.5, 0.16, 18);
  assert.ok(castFade.opacity > 0.4 && castFade.opacity < 0.7);
});

test('AstraCycloneVfx activates 3 nested ribbons and bolts for Vajra, then hides cleanly', () => {
  const cyclone = new AstraCycloneVfx();
  assert.equal(cyclone.group.visible, false);

  cyclone.setTheme('vajra');
  cyclone.update(1.2, true, 2, -1, 0.5, 0.45, 0.6);
  assert.equal(cyclone.group.visible, true);
  assert.equal(cyclone.group.children[0].visible, true);
  assert.equal(cyclone.group.children[2].visible, true);

  cyclone.update(1.4, false, 2, -1, 0.5, 1.0, 0.6);
  assert.equal(cyclone.group.visible, false);
  cyclone.dispose();
});

test('DashEchoPool and PooledSparkSystem clash flare animate and deactivate without GC churn', () => {
  const echoes = new DashEchoPool();
  echoes.spawn(1, 2, 0.8, 'agni');
  assert.equal(echoes.group.children[0].visible, true);
  echoes.update(0.12);
  assert.equal(echoes.group.children[0].visible, true);
  echoes.update(0.25);
  assert.equal(echoes.group.children[0].visible, false);
  echoes.dispose();

  const sparks = new PooledSparkSystem();
  sparks.triggerClashFlare(0, 1.5, 0);
  assert.equal(sparks.clashGroup.visible, true);
  sparks.update(0.1);
  assert.equal(sparks.clashGroup.visible, true);
  sparks.update(0.2);
  assert.equal(sparks.clashGroup.visible, false);
  sparks.dispose();
});

test('HeavyWaveVfx and DundubhiBloodDemonArtVfx spawn Blood Sickles, Spikes, and Elemental Waves cleanly', () => {
  const waves = new HeavyWaveVfx();
  waves.triggerTripleWave(0, 0, 0.3, 'vayu', 11);
  assert.equal(waves.group.children[0].visible, true);
  waves.update(0.25);
  assert.equal(waves.group.children[0].visible, true);
  waves.update(0.35);
  assert.equal(waves.group.children[0].visible, false);
  waves.dispose();

  const bloodArt = new DundubhiBloodDemonArtVfx();
  bloodArt.spawnFlyingBloodSickles(2, -2, -0.5, 3, true);
  bloodArt.spawnBloodSpikeBurst(2, -2, 2.5, true);
  bloodArt.spawnShockwaveImpact(2, -2, 3.0, 'slam', true);
  bloodArt.spawnShockwaveImpact(2, -2, 4.4, 'roar', true);
  bloodArt.update(0.05, 1.2, 2, -2, -0.5, true, true, true, false);
  assert.equal(bloodArt.group.children[0].visible, true);
  bloodArt.clearAll();
  bloodArt.update(0.05, 1.3, 2, -2, -0.5, false, false, false, true);
  assert.equal(bloodArt.group.children[0].visible, false);
  bloodArt.dispose();
});

test('computeFlipbookUvRect and computeFlipbookFrame map sprite cells accurately', () => {
  const topLeft = computeFlipbookUvRect(0, 0, 4, 2, 0);
  assert.equal(topLeft.offsetX, 0);
  assert.equal(topLeft.offsetY, 0.5);
  assert.equal(topLeft.repeatX, 0.25);
  assert.equal(topLeft.repeatY, 0.5);

  const bottomRight = computeFlipbookUvRect(3, 1, 4, 2, 0);
  assert.equal(bottomRight.offsetX, 0.75);
  assert.equal(bottomRight.offsetY, 0);

  assert.equal(computeFlipbookFrame(-0.5, 8), 0);
  assert.equal(computeFlipbookFrame(0.5, 8), 4);
  assert.equal(computeFlipbookFrame(1.0, 8), 7);
});

test('FlipbookEffectPool activates slots, advances UVs across frames, and clears cleanly', () => {
  const pool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.shockwave4x2, 4);
  assert.equal(pool.group.children.length, 4);
  assert.equal(pool.group.children[0].visible, false);

  pool.spawn({
    x: 1,
    y: 0.05,
    z: -1,
    sizeStart: 2,
    sizeEnd: 5,
    duration: 0.4,
    mode: 'ground',
    frameCount: 8,
  });
  assert.equal(pool.group.children[0].visible, true);

  pool.update(0.2);
  assert.equal(pool.group.children[0].visible, true);

  pool.update(0.25);
  assert.equal(pool.group.children[0].visible, false);
  pool.dispose();
});
