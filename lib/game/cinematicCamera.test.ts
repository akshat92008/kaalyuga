import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CinematicCameraTrack,
  sampleCinematicImpactImpulse,
  boundCinematicCameraToPaintedVideo,
} from './cinematicCamera';

const frames = [
  { at: 1.0, focusX: 0.47, focusY: 0.68, zoom: 1.13 },
  { at: 3.0, focusX: 0.53, focusY: 0.64, zoom: 1.23 },
  { at: 5.0, focusX: 0.5, focusY: 0.75, zoom: 1.0 },
];

test('cinematic track eases through deterministic keyframes without camera snaps', () => {
  const track = new CinematicCameraTrack(frames, 5);
  const atStart = track.sample(0, 960, 540);
  assert.equal(atStart.zoom, 1);
  assert.equal(atStart.offsetX, 0);
  assert.equal(atStart.offsetY, 0);
  assert.equal(track.sample(1, 960, 540).zoom, 1.13);
  assert.equal(track.sample(3, 960, 540).zoom, 1.23);
  const between = track.sample(2, 960, 540);
  assert.ok(between.zoom > 1.13 && between.zoom < 1.23);
  assert.deepEqual(track.sample(2, 960, 540), between);
  assert.equal(track.sample(5, 960, 540).zoom, 1);
});

test('cinematic track can be interrupted, skipped and restarted safely', () => {
  const track = new CinematicCameraTrack(frames, 5);
  track.interrupt();
  assert.deepEqual(track.sample(2, 960, 540), {
    zoom: 1, offsetX: 0, offsetY: 0, focusX: 0.5, focusY: 0.75, completed: true,
  });
  track.restart();
  assert.ok(track.sample(2, 960, 540).zoom > 1);
  track.skip();
  assert.equal(track.sample(2, 960, 540).completed, true);
});

test('authored camera zoom and pans are bounded for 2.5D painted arenas', () => {
  const track = new CinematicCameraTrack([
    { at: 1, focusX: -6, focusY: 9, zoom: 200 },
  ], 2);
  const shot = track.sample(1, 960, 540);
  assert.equal(shot.zoom, 1.28);
  assert.ok(Math.abs(shot.offsetX) <= 144);
  assert.ok(Math.abs(shot.offsetY) <= 141);
  assert.ok(Number.isFinite(track.sample(NaN, NaN, NaN).zoom));
});

test('impact impulses are local, deterministic and stop after recovery', () => {
  assert.deepEqual(sampleCinematicImpactImpulse(0, 1, 960, 540), { x: 0, y: 0 });
  const a = sampleCinematicImpactImpulse(1.08, 1, 960, 540);
  assert.ok(Math.abs(a.x) <= 6 && Math.abs(a.y) <= 5);
  assert.deepEqual(a, sampleCinematicImpactImpulse(1.08, 1, 960, 540));
  assert.deepEqual(sampleCinematicImpactImpulse(1.39, 1, 960, 540), { x: 0, y: 0 });
});

test('painted MP4 close-ups cannot expose a video edge, including impact shake', () => {
  const w = 960, h = 540;
  const pivotX = 0.5, pivotY = 305 / 540;
  for (const shot of [
    { zoom: 1, offsetX: 500, offsetY: -500 },
    { zoom: 1.025, offsetX: 0, offsetY: 90 },
    { zoom: 1.12, offsetX: -220, offsetY: 100 },
    { zoom: 1.25, offsetX: 180, offsetY: -180 },
    { zoom: 0.7, offsetX: 200, offsetY: 200 },
    { zoom: NaN, offsetX: Infinity, offsetY: NaN },
  ]) {
    const out = boundCinematicCameraToPaintedVideo(shot, w, h, pivotX, pivotY);
    assert.ok(out.zoom >= 1 && out.zoom <= 1.28);
    // Untransformed video coordinates [0,w] x [0,h] still cover every
    // viewport edge after scaling around the off-center camera pivot.
    const minX = pivotX * w * (1 - out.zoom) + out.offsetX;
    const maxX = minX + w * out.zoom;
    const minY = pivotY * h * (1 - out.zoom) + out.offsetY;
    const maxY = minY + h * out.zoom;
    assert.ok(minX <= 0.01 && minY <= 0.01, 'video reveals left/top edge');
    assert.ok(maxX >= w - 0.01 && maxY >= h - 0.01, 'video reveals right/bottom edge');
  }
});

test('MP4 camera rest is exactly identity and keeps non-finite transforms safe', () => {
  assert.deepEqual(
    boundCinematicCameraToPaintedVideo({ zoom: 1, offsetX: 200, offsetY: -200 }, 960, 540),
    { zoom: 1, offsetX: 0, offsetY: 0 }
  );
  const result = boundCinematicCameraToPaintedVideo(
    { zoom: NaN, offsetX: NaN, offsetY: -Infinity }, NaN, NaN
  );
  assert.deepEqual(result, { zoom: 1, offsetX: 0, offsetY: 0 });
});
