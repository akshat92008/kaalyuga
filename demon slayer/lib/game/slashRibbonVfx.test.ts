import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSlashRibbonStrip,
  catmullRomValue,
  generateParametricSwingSamples,
  RIBBON_PALETTES,
  type RibbonSample,
} from './slashRibbonVfx';

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

  const count = buildSlashRibbonStrip(samples, 0.26, subdivisions, positions, uvs);
  assert.equal(count, 7);

  for (let i = 0; i < count * 6; i++) {
    assert.ok(Number.isFinite(positions[i]), `Position at ${i} should be finite`);
  }
  // Last sample U coordinate equals 1.0
  assert.equal(uvs[(count - 1) * 4 + 0], 1);
  assert.equal(uvs[(count - 1) * 4 + 3], 1);
});

test('buildSlashRibbonStrip returns 0 points when fewer than 2 samples exist', () => {
  const positions = new Float32Array(60);
  const uvs = new Float32Array(40);
  assert.equal(buildSlashRibbonStrip([], 0.25, 3, positions, uvs), 0);
});

test('all ribbon themes define distinct core/mid/ink palettes', () => {
  assert.ok(RIBBON_PALETTES.agni.midColor.r > 0.8);
  assert.ok(RIBBON_PALETTES.vajra.midColor.b > 0.8);
  assert.ok(RIBBON_PALETTES.vayu.midColor.g > 0.6);
});

test('generateParametricSwingSamples produces concentric blade-accurate arc points for attack1 and cast', () => {
  const { samples, opacity } = generateParametricSwingSamples('attack1', 0, 0, 0.4, 0.45, 0, 0.22, 16);
  assert.equal(samples.length, 16);
  assert.equal(opacity, 1);
  for (const s of samples) {
    const rBase = Math.hypot(s.baseX, s.baseZ);
    const rTip = Math.hypot(s.tipX, s.tipZ);
    const span = rTip - rBase;
    assert.ok(span >= 0.85 && span <= 1.15, `Expected tight blade span, got ${span.toFixed(2)}`);
  }
  const castFade = generateParametricSwingSamples('cast', 1, -1, 0, 0.85, 0.5, 0.22, 18);
  assert.ok(castFade.opacity > 0.4 && castFade.opacity < 0.7);
});
