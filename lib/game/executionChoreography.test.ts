import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBossEntranceCameraTrack,
  createExecutionCameraTrack,
  getExecutionBeat,
  shouldCommitExecutionImpact,
} from './executionChoreography';

const variants = ['downward_crush', 'spin_360_cleave', 'impaling_lunge'] as const;

test('all three real execution styles have a unique, once-only weapon-contact beat', () => {
  const contacts = new Set<number>();
  for (const variant of variants) {
    const beat = getExecutionBeat(variant);
    contacts.add(beat.impactProgress);
    assert.ok(beat.prepareProgress < beat.impactProgress);
    assert.ok(beat.impactProgress < beat.recoveryProgress);
    assert.equal(shouldCommitExecutionImpact(variant, beat.impactProgress - 0.001, false), false);
    assert.equal(shouldCommitExecutionImpact(variant, beat.impactProgress, false), true);
    assert.equal(shouldCommitExecutionImpact(variant, 0.99, true), false);
    assert.equal(shouldCommitExecutionImpact(variant, NaN, false), false);
  }
  assert.equal(contacts.size, 3);
});

test('all execution camera tracks have bounded shots and reset exactly at action recovery', () => {
  for (const variant of variants) {
    const track = createExecutionCameraTrack(variant, 0.5);
    const atImpact = track.sample(0.5 * getExecutionBeat(variant).impactProgress, 1280, 720);
    assert.ok(atImpact.zoom > 1.12 && atImpact.zoom <= 1.28);
    assert.ok(Math.abs(atImpact.offsetX) < 195);
    assert.equal(track.sample(0.5, 1280, 720).completed, true);
    track.skip();
    assert.equal(track.sample(0.1, 1280, 720).zoom, 1);
    track.restart();
    assert.ok(track.sample(0.25, 1280, 720).zoom > 1);
  }
});

test('both boss entrance cameras stay safe at mobile aspect ratio and restore frame', () => {
  for (const boss of ['dundubhi', 'vrikodara'] as const) {
    const track = createBossEntranceCameraTrack(boss);
    assert.ok(track.sample(0.94, 375, 667).zoom >= 1.1);
    assert.equal(track.sample(2.65, 375, 667).zoom, 1);
    track.interrupt();
    assert.equal(track.sample(0.7, 375, 667).completed, true);
  }
});
