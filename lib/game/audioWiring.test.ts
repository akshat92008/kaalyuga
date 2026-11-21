import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SoundEngine } from './audio';

test('all 19 shipped ElevenLabs voice barks have reachable combat or hub dialogue triggers', () => {
  const combat = readFileSync(join(process.cwd(), 'components/game/KaliyugaArena.tsx'), 'utf8');
  const hub = readFileSync(join(process.cwd(), 'lib/game/hubDialogues.ts'), 'utf8');
  const modal = readFileSync(join(process.cwd(), 'components/game/HubDialogueModal.tsx'), 'utf8');

  const voiceNames = Object.keys(SoundEngine.VOICE_CLIPS);
  assert.equal(voiceNames.length, 19);
  assert.match(modal, /playVoiceBark/);
  for (const key of voiceNames) {
    const regex = new RegExp("playVoiceBark\\(['\"]" + key + "['\"]|voiceBarkKey:\\s*['\"]" + key + "['\"]");
    assert.match(combat + '\n' + hub, regex, key + ' has no in-game trigger');
  }
});

test('all curated Act I tracks resolve to an on-server URL', () => {
  for (let chamber = 1; chamber <= 8; chamber++) {
    const ordinary = new SoundEngine().resolveTrackForState('playing', chamber, false);
    assert.ok(ordinary.url.startsWith('/'), 'missing chamber ' + chamber + ' BGM');
  }
  for (const boss of [4, 8]) {
    const theme = new SoundEngine().resolveTrackForState('playing', boss, true);
    assert.ok(theme.url.startsWith('/audio/') || theme.url.startsWith('/assets/'));
  }
});
