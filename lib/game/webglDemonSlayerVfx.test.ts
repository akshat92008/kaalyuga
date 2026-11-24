import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  buildStarburstPolygonGeometry,
  buildTaperedThunderRibbonGeometry,
  computeThunderForkedBranches,
  computeThunderZigzagVertices,
  selectDemonSlayerPaletteForStance,
} from './webglDemonSlayerVfx';
import {
  classifyEnemyVfxTier,
  evaluateStrikeActiveFrameGate,
  getEnemySlashVfxBudget,
} from './combatVfxClarity';
import {
  applyDemonSlayerCelShadingToHierarchy,
  createDemonSlayerCelMaterial,
  createParashuAuraMaterial,
  setCelBounceTint,
  setCelUnderGlow,
} from './demonSlayerShader';

test('computeThunderZigzagVertices preserves start/end endpoints and creates interior angular zigzags', () => {
  const pts = computeThunderZigzagVertices(100, 200, 420, 260, 6, 48, 3);
  assert.equal(pts.length, 7);
  assert.equal(pts[0].x, 100);
  assert.equal(pts[0].y, 200);
  assert.equal(pts[pts.length - 1].x, 420);
  assert.equal(pts[pts.length - 1].y, 260);

  for (const pt of pts) {
    assert.ok(Number.isFinite(pt.x), 'x must be finite');
    assert.ok(Number.isFinite(pt.y), 'y must be finite');
  }

  // Interior points must deflect off the straight line to form sharp Zenitsu zigzag corners
  const dx = 420 - 100;
  const dy = 260 - 200;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  let maxDeviation = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const px = pts[i].x - 100;
    const py = pts[i].y - 200;
    maxDeviation = Math.max(maxDeviation, Math.abs(px * nx + py * ny));
  }
  assert.ok(maxDeviation > 15, `expected sharp zigzag deviation > 15, got ${maxDeviation}`);
});

test('computeThunderForkedBranches generates forked sub-arcs anchored at interior vertices', () => {
  const mainPts = computeThunderZigzagVertices(0, 0, 320, 40, 6, 42, 7);
  const branches = computeThunderForkedBranches(mainPts, 7);
  assert.equal(branches.length, mainPts.length - 2);
  branches.forEach((branch, idx) => {
    assert.equal(branch.length, 4);
    assert.equal(branch[0].x, mainPts[idx + 1].x);
    assert.equal(branch[0].y, mainPts[idx + 1].y);
    for (const pt of branch) {
      assert.ok(Number.isFinite(pt.x) && Number.isFinite(pt.y));
    }
  });
});

test('buildTaperedThunderRibbonGeometry produces continuous miter-joined ribbon with normalized UVs', () => {
  const pts = computeThunderZigzagVertices(0, 0, 300, 60, 5, 36, 2);
  const geo = buildTaperedThunderRibbonGeometry(pts, 28, 6, 20);
  const pos = geo.getAttribute('position');
  const uv = geo.getAttribute('uv');
  assert.equal(pos.count, pts.length * 2);
  assert.equal(uv.count, pts.length * 2);
  assert.equal(uv.getX(0), 0);
  assert.ok(Math.abs(uv.getX(uv.count - 1) - 1) < 1e-5, 'final U coordinate must reach 1');
  for (let i = 0; i < pos.count; i++) {
    assert.ok(Number.isFinite(pos.getX(i)) && Number.isFinite(pos.getY(i)));
  }
  geo.dispose();
});

test('buildStarburstPolygonGeometry creates valid multi-point comic starburst fan', () => {
  const geo = buildStarburstPolygonGeometry(8, 44, 12);
  const pos = geo.getAttribute('position');
  const idx = geo.getIndex();
  assert.equal(pos.count, 1 + 16);
  assert.ok(idx !== null && idx.count === 16 * 3);
  geo.dispose();
});

test('classifyEnemyVfxTier separates small mobs, heavy grunts, and bosses cleanly', () => {
  assert.equal(classifyEnemyVfxTier({ type: 'charnel_ghoul' }), 'small');
  assert.equal(classifyEnemyVfxTier({ type: 'ashen_oracle' }), 'small');
  assert.equal(classifyEnemyVfxTier({ type: 'bloodmaw_brute' }), 'heavy');
  assert.equal(classifyEnemyVfxTier({ type: 'ironmaw_gladiator' }), 'heavy');
  assert.equal(classifyEnemyVfxTier({ type: 'dundubhi' }), 'boss');
  assert.equal(classifyEnemyVfxTier({ type: 'charnel_ghoul', isBoss: true }), 'boss');
  assert.equal(classifyEnemyVfxTier({ type: 'semi_boss_bloodforge', isSemiBoss: true }), 'boss');
});

test('getEnemySlashVfxBudget enforces lightweight visuals for small mobs and full spectacle for bosses', () => {
  const smallBudget = getEnemySlashVfxBudget('small', 180, 'shockwave');
  assert.ok(smallBudget.radius <= 76 && smallBudget.radius >= 54);
  assert.equal(smallBudget.width, 22);
  assert.equal(smallBudget.spawnMandala, false);
  assert.equal(smallBudget.spawnBloodCage, false);
  assert.equal(smallBudget.spawnGroundShockwave, false);

  const heavyBudget = getEnemySlashVfxBudget('heavy', 140, 'shockwave');
  assert.ok(heavyBudget.radius >= 96 && heavyBudget.radius <= 138);
  assert.equal(heavyBudget.spawnMandala, false);
  assert.equal(heavyBudget.spawnGroundShockwave, true);

  const bossBudget = getEnemySlashVfxBudget('boss', 180, 'shockwave');
  assert.ok(bossBudget.radius >= 148);
  assert.equal(bossBudget.spawnMandala, true);
  assert.equal(bossBudget.spawnBloodCage, true);
});

test('evaluateStrikeActiveFrameGate holds VFX during axe windup and fires exactly once at cleave frame', () => {
  const windup = evaluateStrikeActiveFrameGate({
    attackProgress: 0.12,
    triggerThreshold: 0.25,
    alreadyFired: false,
  });
  assert.equal(windup.shouldFireNow, false);
  assert.equal(windup.inStartupGlint, true);

  const active = evaluateStrikeActiveFrameGate({
    attackProgress: 0.26,
    triggerThreshold: 0.25,
    alreadyFired: false,
  });
  assert.equal(active.shouldFireNow, true);
  assert.equal(active.inStartupGlint, false);

  const followThrough = evaluateStrikeActiveFrameGate({
    attackProgress: 0.55,
    triggerThreshold: 0.25,
    alreadyFired: true,
  });
  assert.equal(followThrough.shouldFireNow, false);
  assert.equal(followThrough.inStartupGlint, false);
});

test('selectDemonSlayerPaletteForStance maps all Kaalyuga stances to Demon Slayer breathing palettes', () => {
  assert.equal(selectDemonSlayerPaletteForStance('smash'), 'hinokami');
  assert.equal(selectDemonSlayerPaletteForStance('pillar'), 'wind');
  assert.equal(selectDemonSlayerPaletteForStance('thrust'), 'thunder');
  assert.equal(selectDemonSlayerPaletteForStance('water'), 'water');
  assert.equal(selectDemonSlayerPaletteForStance('varuna'), 'water');
});

test('setCelUnderGlow and setCelBounceTint mutate cel shader uniforms without throwing', () => {
  const mat = createDemonSlayerCelMaterial({
    map: null,
    tintHex: 0xffffff,
    rimColorHex: 0xff9a3c,
    underGlowColorHex: 0x18d8ff,
    underGlowStrength: 0.2,
    shadowTintHex: 0x241038,
    shadowTintStrength: 0.32,
    useDemonContrastRamp: true,
  });

  setCelUnderGlow([mat], 0x18d8ff, 0.85);
  assert.equal(mat.userData.celUniforms.uUnderGlowStrength.value, 0.85);
  assert.equal(mat.userData.celUniforms.uUnderGlowColor.value.getHex(), 0x18d8ff);

  setCelBounceTint([mat], 0xff5a18, 0.45);
  assert.equal(mat.userData.celUniforms.uUnderGlowStrength.value, 0.45);
  assert.equal(mat.userData.celUniforms.uUnderGlowColor.value.getHex(), 0xff5a18);
  mat.dispose();
});

test('applyDemonSlayerCelShadingToHierarchy converts meshes to cel toon materials and attaches Sumi-e ink outlines', () => {
  const root = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xcc6633 })
  );
  root.add(mesh);

  const { celMaterials, outlineMeshes } = applyDemonSlayerCelShadingToHierarchy(root, {
    rimColorHex: 0xffaa33,
    outlineHeightRatio: 0.006,
    useDemonContrastRamp: true,
    shadowTintHex: 0x260d18,
    shadowTintStrength: 0.34,
  });

  assert.equal(celMaterials.length, 1);
  assert.ok(mesh.material instanceof THREE.MeshToonMaterial);
  assert.equal(outlineMeshes.length, 1, 'expected inverted-hull Sumi-e outline mesh');

  const aura = createParashuAuraMaterial(0x38e8ff);
  assert.equal(aura.uniforms.uColor.value.getHex(), 0x38e8ff);
  aura.dispose();
  celMaterials.forEach((m) => m.dispose());
});
