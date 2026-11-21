import test from 'node:test';
import assert from 'node:assert/strict';
import { Act1CinematicCamera, composeAct1CinematicZoom, getAct1FinisherCameraShot, preserveAct1ExecutionContactZoom } from './act1CinematicCamera';
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

test('Three executions receive distinctive cinematic framings without masking the wider spin', () => {
 const down=getAct1FinisherCameraShot('downward_crush');
 const lunge=getAct1FinisherCameraShot('impaling_lunge');
 const spin=getAct1FinisherCameraShot('spin_360_cleave');
 assert.ok(down.zoomBoost > lunge.zoomBoost && lunge.zoomBoost > spin.zoomBoost);
 assert.ok(spin.zoomBoost <= 0.07);
 assert.ok(down.durationSec < 0.7);
 const camera=new Act1CinematicCamera();
 assert.equal(camera.start({kind:'execution',focusX:600,focusY:380,...down}),true);
 const shot=camera.step(0.16);
 assert.ok(shot.zoomBoost > 0.125);
 assert.ok(shot.focusWeight > 0.38);
});

test('Cinematic zoom composes the already eased cue; it is not attenuated by frame dt',()=>{
 assert.equal(composeAct1CinematicZoom(0.90,0.14),1.04);
 assert.equal(composeAct1CinematicZoom(0.90,0),0.90);
 assert.equal(composeAct1CinematicZoom(0.80,-0.035),0.765);
 assert.equal(composeAct1CinematicZoom(0.93,Number.NaN),0.93);
 assert.equal(composeAct1CinematicZoom(1.10,0.3),1.20);
 assert.equal(composeAct1CinematicZoom(0.70,-1),0.72);
});

test('Execution contact cannot kick an already zoomed-in camera back to the wide shot',()=>{
 assert.equal(preserveAct1ExecutionContactZoom(1.07,0.94),1.07);
 assert.equal(preserveAct1ExecutionContactZoom(0.92,0.94),0.995);
 assert.ok(preserveAct1ExecutionContactZoom(1.3,0.94)<=1.20);
 assert.ok(Number.isFinite(preserveAct1ExecutionContactZoom(NaN,Infinity)));
});
