import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getExecutionBeat,
  createExecutionCameraTrack,
  createBossEntranceCameraTrack,
  createBossTransformationCameraTrack,
} from './executionChoreography';

const variants = ['downward_crush', 'spin_360_cleave', 'impaling_lunge'] as const;

test('all three executions peak precisely on their gameplay impact frame', () => {
  const duration = 0.9;
  for (const variant of variants) {
    const impact = getExecutionBeat(variant).impactProgress;
    const track = createExecutionCameraTrack(variant, duration);
    const shot = track.sample(duration * impact, 960, 540);
    assert.ok(shot.zoom > 1.1, variant);
    assert.equal(track.sample(0, 960, 540).zoom, 1);
    assert.equal(track.sample(duration, 960, 540).zoom, 1);
  }
});

test('downward crush, sweeping cleave and impaling lunge are not camera duplicates', () => {
  const frames = variants.map(v => createExecutionCameraTrack(v, 0.9).sample(0.9 * getExecutionBeat(v).impactProgress, 960, 540));
  assert.ok(frames[0].zoom > frames[1].zoom);
  assert.ok(frames[2].zoom > frames[0].zoom);
  assert.ok(frames[0].focusX < frames[1].focusX && frames[1].focusX < frames[2].focusX);
});

test('Dundubhi and Vrikodara entrances use distinct silhouettes and restore safely', () => {
  const d = createBossEntranceCameraTrack('dundubhi');
  const v = createBossEntranceCameraTrack('vrikodara');
  const dShot = d.sample(2.65 * 0.54, 960, 540);
  const vShot = v.sample(2.65 * 0.54, 960, 540);
  assert.notDeepEqual(dShot, vShot);
  assert.ok(vShot.zoom > dShot.zoom);
  for (const track of [d, v]) {
    assert.equal(track.sample(0, 960, 540).zoom, 1);
    assert.equal(track.sample(2.65, 960, 540).zoom, 1);
    track.skip();
    assert.equal(track.sample(0.54, 960, 540).zoom, 1);
  }
});

test('both bosses have phase-specific short transformation camera treatments', () => {
  const d2 = createBossTransformationCameraTrack('dundubhi', 2);
  const d3 = createBossTransformationCameraTrack('dundubhi', 3);
  const v2 = createBossTransformationCameraTrack('vrikodara', 2);
  const v3 = createBossTransformationCameraTrack('vrikodara', 3);
  assert.ok(d3.sample(1.05 * 0.49, 960, 540).zoom > d2.sample(1.05 * 0.49, 960, 540).zoom);
  assert.ok(v3.sample(1.34 * 0.49, 960, 540).zoom > v2.sample(1.34 * 0.49, 960, 540).zoom);
  assert.equal(d2.sample(1.05, 960, 540).completed, true);
  assert.equal(v2.sample(1.34, 960, 540).completed, true);
});

test('authored camera tracks remain finite on an unusually small viewport', () => {
  for (const variant of variants) {
    const track = createExecutionCameraTrack(variant, 0.5);
    const shot = track.sample(0.24, 320, 240);
    assert.ok(Number.isFinite(shot.offsetX) && Number.isFinite(shot.offsetY));
    assert.ok(shot.zoom > 0 && shot.zoom <= 1.28);
  }
});
