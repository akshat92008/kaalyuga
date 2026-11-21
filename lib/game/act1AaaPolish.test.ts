import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  DIFFICULTY_PRESETS,
  getDifficultyConfig,
  scaleEnemyHpByDifficulty,
  scaleIncomingDamageByDifficulty,
  scaleKarmaRewardByDifficulty,
} from './difficulty';
import {
  computeCameraFootAnchorRatio,
  computeSusanooDeflectOutcome,
  computeTrimmedCleaveClock,
} from './kalaBhairavaSusanoo';
import { soundEngine } from './audio';
import { buildCandidateRepoPaths } from '../server/staticAssetProxy';

test('difficulty presets scale strictly Easy < Hard < Difficult for enemy HP & damage', () => {
  const easy = getDifficultyConfig('easy');
  const hard = getDifficultyConfig('hard');
  const difficult = getDifficultyConfig('difficult');

  assert.equal(easy.id, 'easy');
  assert.equal(hard.id, 'hard');
  assert.equal(difficult.id, 'difficult');

  assert.ok(easy.enemyHpMult < hard.enemyHpMult);
  assert.ok(hard.enemyHpMult < difficult.enemyHpMult);
  assert.ok(easy.enemyDamageMult < hard.enemyDamageMult);
  assert.ok(hard.enemyDamageMult < difficult.enemyDamageMult);

  assert.ok(scaleEnemyHpByDifficulty(1000, 'easy') < scaleEnemyHpByDifficulty(1000, 'hard'));
  assert.ok(scaleEnemyHpByDifficulty(1000, 'hard') < scaleEnemyHpByDifficulty(1000, 'difficult'));

  assert.ok(
    scaleIncomingDamageByDifficulty(50, 'easy') < scaleIncomingDamageByDifficulty(50, 'hard')
  );
  assert.ok(
    scaleIncomingDamageByDifficulty(50, 'hard') < scaleIncomingDamageByDifficulty(50, 'difficult')
  );

  // Higher difficulty grants at least equal or higher Karma reward
  assert.ok(
    scaleKarmaRewardByDifficulty(100, 'difficult') >= scaleKarmaRewardByDifficulty(100, 'hard')
  );
  assert.equal(Object.keys(DIFFICULTY_PRESETS).length, 3);
});

test('computeSusanooDeflectOutcome enforces 100% True Chakra Armor invincibility', () => {
  const active = computeSusanooDeflectOutcome(8.5, 120);
  assert.equal(active.deflected, true);
  assert.equal(active.finalDamage, 0);
  assert.equal(active.applyHitstun, false);
  assert.ok(active.knockbackImpulse > 0);

  const edgeActive = computeSusanooDeflectOutcome(0.05, 45);
  assert.equal(edgeActive.deflected, true);
  assert.equal(edgeActive.finalDamage, 0);

  const inactive = computeSusanooDeflectOutcome(0, 75);
  assert.equal(inactive.deflected, false);
  assert.equal(inactive.finalDamage, 75);
  assert.equal(inactive.applyHitstun, true);
  assert.equal(inactive.knockbackImpulse, 0);
});

test('computeCameraFootAnchorRatio matches exact 3D projection of ground foot y=0', () => {
  // Rudra perspective rig
  const rudraCam = new THREE.PerspectiveCamera(34, 1, 0.1, 45);
  rudraCam.position.set(0, 1.9, 3.92);
  rudraCam.lookAt(0, 0.78, 0);
  rudraCam.updateMatrixWorld(true);
  rudraCam.updateProjectionMatrix();

  const rudraRatio = computeCameraFootAnchorRatio(rudraCam, 0);
  assert.ok(rudraRatio >= 0.55 && rudraRatio <= 0.85, `Unexpected Rudra footAnchorRatio: ${rudraRatio}`);

  const proj = new THREE.Vector3(0, 0, 0).project(rudraCam);
  const expectedRudra = (1 - proj.y) * 0.5;
  assert.ok(Math.abs(rudraRatio - expectedRudra) < 0.002);

  // Boss orthographic rig
  const bossCam = new THREE.OrthographicCamera(-134, 134, 134, -134, 1, 2000);
  bossCam.position.set(0, 152, 356);
  bossCam.lookAt(0, 76, 0);
  bossCam.updateMatrixWorld(true);
  bossCam.updateProjectionMatrix();

  const bossRatio = computeCameraFootAnchorRatio(bossCam, 0);
  assert.ok(bossRatio >= 0.55 && bossRatio <= 0.88, `Unexpected Boss footAnchorRatio: ${bossRatio}`);

  const bossProj = new THREE.Vector3(0, 0, 0).project(bossCam);
  const expectedBoss = (1 - bossProj.y) * 0.5;
  assert.ok(Math.abs(bossRatio - expectedBoss) < 0.002);
});

test('computeTrimmedCleaveClock trims idle wind-up and dead recovery frames cleanly', () => {
  assert.ok(Math.abs(computeTrimmedCleaveClock(0, 0.14, 0.88) - 0.14) < 1e-6);
  assert.ok(Math.abs(computeTrimmedCleaveClock(0.5, 0.14, 0.88) - 0.51) < 1e-6);
  assert.ok(computeTrimmedCleaveClock(0.999, 0.14, 0.88) <= 0.88);
  assert.ok(computeTrimmedCleaveClock(1.5, 0.14, 0.88) >= 0.14);
});

test('soundEngine.resolveTrackForState maps all Act I states, 8 chambers, boss phases, and Susanoo surge', () => {
  assert.equal(soundEngine.resolveTrackForState('title', 1, false).url, '/audio/repo/the_bleeding_crown.mp3');
  assert.equal(soundEngine.resolveTrackForState('prologue', 1, false).url, '/assets/aistudio/Before_the_Iron_Gate.mp3');
  assert.equal(soundEngine.resolveTrackForState('shrine', 1, false).url, '/audio/repo/vaitarani_realm.mp3');
  assert.equal(soundEngine.resolveTrackForState('playing', 1, false).url, '/assets/aistudio/Iron_Chariots_of_the_Sun.mp3');
  assert.equal(soundEngine.resolveTrackForState('playing', 2, false).url, '/assets/aistudio/Judgment_at_the_Ruined_Gate.mp3');
  assert.equal(soundEngine.resolveTrackForState('playing', 3, false).url, '/audio/repo/mythic_battle_impact.mp3');
  assert.equal(soundEngine.resolveTrackForState('playing', 4, true).url, '/audio/repo/dundubhi_boss_theme.mp3');
  assert.equal(soundEngine.resolveTrackForState('playing', 5, false).url, '/audio/repo/dark_western_rpg.mp3');
  assert.equal(soundEngine.resolveTrackForState('playing', 6, true).url, '/audio/repo/demon_boss_battle.mp3');
  assert.equal(soundEngine.resolveTrackForState('playing', 7, false).url, '/assets/aistudio/The_Titan_s_Final_Stride.mp3');
  assert.equal(soundEngine.resolveTrackForState('playing', 8, true, 1, false).url, '/audio/repo/vrikodara_boss_theme.mp3');
  assert.equal(soundEngine.resolveTrackForState('playing', 8, true, 2, false).url, '/audio/repo/apocalyptic_climax.mp3');
  assert.equal(soundEngine.resolveTrackForState('playing', 4, true, 1, true).url, '/audio/repo/god_of_war_epic.mp3');
  assert.equal(soundEngine.resolveTrackForState('victory', 8, true).url, '/assets/aistudio/Ma_de_va_Rising.mp3');
  assert.equal(soundEngine.resolveTrackForState('defeat', 4, true).url, '/assets/aistudio/Where_Bronze_Gods_Weep.mp3');
});

test('staticAssetProxy resolves all newly integrated Act I 3D models, soundtracks, SFX, and v4 voices', () => {
  const susanooPaths = buildCandidateRepoPaths(['models_v2', 'horned_warlord_abyss.fbx']).map((p) => p.join('/'));
  assert.ok(
    susanooPaths.some((p) => p.includes('Horned_Warlord_of_the_Abyss') && p.endsWith('.fbx')),
    `Expected Horned_Warlord_of_the_Abyss FBX path, got ${JSON.stringify(susanooPaths)}`
  );

  const smithPaths = buildCandidateRepoPaths(['models_v2', 'molten_forge_titan.fbx']).map((p) => p.join('/'));
  assert.ok(
    smithPaths.some((p) => p.includes('Molten_Forge_Titan') && p.endsWith('.fbx')),
    `Expected Molten_Forge_Titan FBX path, got ${JSON.stringify(smithPaths)}`
  );

  const sanctuaryPaths = buildCandidateRepoPaths(['audio', 'repo', 'mythic_sanctuary.mp3']).map((p) => p.join('/'));
  assert.ok(
    sanctuaryPaths.some((p) => p.includes('Mythic Sanctuary')),
    `Expected Mythic Sanctuary track path, got ${JSON.stringify(sanctuaryPaths)}`
  );

  const sfxPaths = buildCandidateRepoPaths(['audio', 'repo', 'sfx_susanoo_summon.mp3']).map((p) => p.join('/'));
  assert.ok(
    sfxPaths.some((p) => p.includes('Colossal_supernatura_#3')),
    `Expected ElevenLabs Susanoo summon SFX path, got ${JSON.stringify(sfxPaths)}`
  );

  const voicePaths = buildCandidateRepoPaths(['audio', 'repo', 'voice_dundubhi_intro.mp3']).map((p) => p.join('/'));
  assert.ok(
    voicePaths.some((p) => p.includes('dundubhi')),
    `Expected dundubhi v4 voice path, got ${JSON.stringify(voicePaths)}`
  );
});
