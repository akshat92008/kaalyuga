import test from 'node:test';
import assert from 'node:assert/strict';
import { canDispatchAct1GameplayKey } from './act1InputGate';

test('Act I accepts combat hotkeys only in unblocked active play', () => {
  assert.equal(canDispatchAct1GameplayKey('playing', false, false), true);
  for (const state of ['title', 'paused', 'gameover']) {
    assert.equal(canDispatchAct1GameplayKey(state, false, false), false);
  }
  assert.equal(canDispatchAct1GameplayKey('playing', true, false), false);
  // A newly opened modal must block before React synchronizes modalPaused.
  assert.equal(canDispatchAct1GameplayKey('playing', false, true), false);
  assert.equal(canDispatchAct1GameplayKey('playing', true, true), false);
});

test('Act I restores gameplay input when a blocking menu closes', () => {
  const states = [
    { modalPaused: false, blockingUiOpen: false, expected: true },
    { modalPaused: false, blockingUiOpen: true, expected: false },
    { modalPaused: true, blockingUiOpen: true, expected: false },
    { modalPaused: false, blockingUiOpen: false, expected: true },
  ];
  for (const { modalPaused, blockingUiOpen, expected } of states) {
    assert.equal(canDispatchAct1GameplayKey('playing', modalPaused, blockingUiOpen), expected);
  }
});
