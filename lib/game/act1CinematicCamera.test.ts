import test from 'node:test';
import assert from 'node:assert/strict';
import { Act1CinematicCamera } from './act1CinematicCamera';
test('phase camera softly returns to gameplay and never exceeds safe 2.5D zoom/weight', () => {
  const camera = new Act1CinematicCamera();
  assert.equal(camera.start({
    kind: 'boss_phase', focusX: 600, focusY: 500, durationSec: 0.5,
    focusWeight: 5, zoomBoost: 2,
  }), true);
  const frame = camera.step(0.2);
  assert.equal(frame.active, true);
  assert.ok(frame.focusWeight <= 0.35);
  assert.ok(frame.zoomBoost <= 0.07);
  assert.equal(camera.step(1).active, false);
  assert.equal(camera.step(0.016).zoomBoost, 0);
});
test('higher priority execution camera cannot be stolen by phase cue; Escape skip restores instantly', () => {
  const camera = new Act1CinematicCamera();
  camera.start({kind: 'execution',focusX: 500,focusY: 250,durationSec: 0.6,focusWeight: 0.25,zoomBoost: 0.06});
  assert.equal(camera.start({kind: 'boss_phase',focusX: 0,focusY: 0,durationSec: 0.6,focusWeight: 0.25,zoomBoost: 0.02}), false);
  assert.equal(camera.step(0.1).focusX, 500);
  assert.equal(camera.skip(), true);
  assert.equal(camera.skip(), false);
  assert.equal(camera.step(0.01).active, false);
});
test('blocks invalid camera cues and cancels on modal/pause interruption', () => {
  const camera = new Act1CinematicCamera();
  assert.equal(camera.start({kind: 'boss_entrance',focusX: Infinity,focusY: 2,durationSec: 1,focusWeight: 0.2,zoomBoost: 0.02}),false);
  camera.start({kind: 'boss_entrance',focusX: 1,focusY: 2,durationSec: 1,focusWeight: 0.2,zoomBoost: 0.02});
  assert.equal(camera.step(0.1, true).active,false);
  assert.equal(camera.step(0.1).active,false);
});
