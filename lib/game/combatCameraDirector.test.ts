import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMBAT_CAMERA_REST,
  sampleCombatCameraAccent,
  sampleSteadyImpactShake,
  clampCinematicOffsetToWorld,
} from './combatCameraDirector';

const heavy = (stance: string, progress: number, facing = 1) =>
  sampleCombatCameraAccent({ action: 'heavy_unleash', stance, progress, facing });

test('all combat shots rest cleanly before and after action with no camera drift', () => {
  for (const stance of ['smash', 'pillar', 'thrust']) {
    assert.deepEqual(heavy(stance, 0), COMBAT_CAMERA_REST);
    assert.deepEqual(heavy(stance, 1), COMBAT_CAMERA_REST);
  }
  assert.deepEqual(sampleCombatCameraAccent({ action: 'idle', stance: 'smash', progress: 0.5, facing: 1 }), COMBAT_CAMERA_REST);
  assert.deepEqual(sampleCombatCameraAccent({ action: 'heavy_unleash', stance: 'smash', progress: 0.3, facing: 1, frozen: true }), COMBAT_CAMERA_REST);
});

test('the three stances deliver distinct bounded hit-frame compositions', () => {
  const smash = heavy('smash', 0.30);
  const pillar = heavy('pillar', 0.30);
  const thrust = heavy('thrust', 0.30);
  assert.ok(thrust.zoom > smash.zoom && smash.zoom > pillar.zoom);
  assert.ok(thrust.offsetX > smash.offsetX && smash.offsetX > pillar.offsetX);
  for (const shot of [smash, pillar, thrust]) {
    assert.ok(shot.zoom > 1 && shot.zoom < 1.07);
    assert.ok(Math.abs(shot.offsetX) <= 20);
    assert.ok(Math.abs(shot.offsetY) <= 8);
  }
});

test('framing follows facing and guardian intensity without altering gameplay', () => {
  const right = heavy('thrust', 0.3);
  const left = heavy('thrust', 0.3, -1);
  assert.equal(right.offsetX, -left.offsetX);
  assert.equal(right.offsetY, left.offsetY);
  const guardian = sampleCombatCameraAccent({ action: 'heavy_unleash', stance: 'smash', progress: 0.3, facing: 1, guardianActive: true });
  assert.ok(guardian.zoom > heavy('smash', 0.3).zoom);
});

test('fourth light hit and Astras have distinct restrained shots', () => {
  const first = sampleCombatCameraAccent({ action: 'light_attack', stance: 'smash', progress: 0.25, facing: 1, comboStep: 1 });
  const fourth = sampleCombatCameraAccent({ action: 'light_attack', stance: 'smash', progress: 0.28, facing: 1, comboStep: 4 });
  assert.ok(fourth.zoom > first.zoom);
  const astra = sampleCombatCameraAccent({ action: 'astra', stance: 'smash', progress: 0.42, facing: 1 });
  assert.ok(astra.zoom > first.zoom);
  assert.ok(astra.zoom < 1.04);
});

test('impact motion is bounded, deterministic and disabled at rest', () => {
  assert.deepEqual(sampleSteadyImpactShake(500, 0, 960, 540), { x: 0, y: 0 });
  const shot = sampleSteadyImpactShake(500, 1, 960, 540);
  assert.deepEqual(shot, sampleSteadyImpactShake(500, 1, 960, 540));
  assert.ok(Math.abs(shot.x) <= 7 && Math.abs(shot.y) <= 5.5);
  const mobile = sampleSteadyImpactShake(500, 1, 375, 667);
  assert.ok(Math.abs(mobile.x) <= Math.abs(shot.x));
});

test('no cinematic frame reveals a painted or MP4 arena edge', () => {
  const cases = [
    { camX: 0, camY: 0, zoom: 1, offsetX: -900, offsetY: 900 },
    { camX: 1200, camY: 780, zoom: 1.16, offsetX: 3000, offsetY: -3000 },
    { camX: 0, camY: 0, zoom: 0.82, offsetX: 400, offsetY: 400 },
    { camX: 1120, camY: 630, zoom: 1.35, offsetX: -4000, offsetY: 900 },
  ];
  for (const shot of cases) {
    const input = { viewportW: 960, viewportH: 540, worldW: 2563, worldH: 1602, ...shot };
    const out = clampCinematicOffsetToWorld(input);
    const leftX = input.camX + 480 - 480 / out.zoom - out.offsetX;
    const rightX = input.camX + 480 + 480 / out.zoom - out.offsetX;
    const topY = input.camY + 270 - 270 / out.zoom - out.offsetY;
    const bottomY = input.camY + 270 + 270 / out.zoom - out.offsetY;
    assert.ok(leftX >= -1e-5 && rightX <= input.worldW + 1e-5, 'horizontal arena edge exposed');
    assert.ok(topY >= -1e-5 && bottomY <= input.worldH + 1e-5, 'vertical arena edge exposed');
  }
});

test('invalid input cannot poison the camera matrix', () => {
  const shot = sampleCombatCameraAccent({ action: 'heavy_unleash', stance: 'smash', progress: NaN, facing: 1 });
  assert.deepEqual(shot, COMBAT_CAMERA_REST);
  const safe = clampCinematicOffsetToWorld({ viewportW: NaN, viewportH: NaN, worldW: NaN, worldH: NaN, camX: NaN, camY: NaN, zoom: NaN, offsetX: NaN, offsetY: Infinity });
  for (const x of Object.values(safe)) assert.ok(Number.isFinite(x));
});
