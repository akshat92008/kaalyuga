import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_SHRINE_RANKS,
  SHRINE_UPGRADES,
  STANCE_CONFIGS,
  WEAPON_CONFIGS,
  normalizeWeaponId,
} from './rules';
import { INITIAL_WEAPON_ASPECT_RANKS } from './pillars4And5Engine';
import { CHAMBERS, GAME_ASSETS } from './assets';
import { shouldDamageProp } from './combatPipeline';
import { resolveVrikodaraInhaleImpact } from './bossEncounters';
import {
  HUB_FERRY_GATE_POS,
  HUB_SAVITRI_POS,
  HUB_SPAWN_X,
  HUB_SPAWN_Y,
  VAITARANI_HUB_STATIONS,
  findNearestHubStation,
  isInsideHubFerryGate,
} from './vaitaraniHub';
import {
  DISK_CACHE_DIR,
  buildCandidateRepoPaths,
  isBlockedRuntimeAsset,
} from '../server/staticAssetProxy';

test('P2 Proxy Hygiene: staticAssetProxy uses single cache dir, maps clean ASCII stems, and blocks duplicates/.zip/.stl', () => {
  assert.equal(DISK_CACHE_DIR, '/tmp/kaliyuga_static_cache');
  assert.equal(isBlockedRuntimeAsset(['models', 'mesh.zip']), true);
  assert.equal(isBlockedRuntimeAsset(['models', 'statue.stl']), true);
  assert.equal(isBlockedRuntimeAsset(['arenas', 'file (1).png']), true);
  assert.equal(isBlockedRuntimeAsset(['arenas', 'Gemini_Generated_Image_4ai5dh.png']), true);
  assert.equal(isBlockedRuntimeAsset(['..', 'etc', 'passwd']), true);
  assert.equal(isBlockedRuntimeAsset(['arenas', 'Gemini_Generated_Image_ol56bvol56bvol56.png']), false);

  const mapped = buildCandidateRepoPaths(['videos', 'Ash_drifting_across_river_landscape_2b693e5d.mp4']);
  assert.deepEqual(mapped[0], [
    'new 3D assets and animations',
    'Cutscenes & Audio',
    'Ash_drifting_across_river_landscape_2b693e5d.mp4',
  ]);
});

test('P2 Domain Hygiene: WeaponId, UpgradeId, and STANCE_CONFIGS use pure Vedic/Sanskrit identifiers with zero Wukong/chineseName keys', () => {
  assert.deepEqual(Object.keys(WEAPON_CONFIGS).sort(), ['khanda_dual', 'parashu', 'trishula_great']);
  assert.deepEqual(Object.keys(INITIAL_WEAPON_ASPECT_RANKS).sort(), ['khanda_dual', 'parashu', 'trishula_great']);
  assert.equal(Object.keys(INITIAL_SHRINE_RANKS).includes('simian_marrow'), false);
  assert.equal(UPGRADE_CHECK(), true);
  function UPGRADE_CHECK() {
    return (
      !SHRINE_UPGRADES.some((u) => (u.id as string) === 'simian_marrow') &&
      SHRINE_UPGRADES.some((u) => u.id === 'prana_marrow')
    );
  }

  for (const stance of Object.values(STANCE_CONFIGS)) {
    assert.ok(stance.sanskritName && stance.sanskritName.length > 0);
    assert.equal('chineseName' in stance, false);
  }
  for (const weapon of Object.values(WEAPON_CONFIGS)) {
    assert.ok(weapon.sanskritName && weapon.sanskritName.length > 0);
    assert.equal('chineseName' in weapon, false);
  }

  assert.equal(normalizeWeaponId('jingu_bang'), 'parashu');
  assert.equal(normalizeWeaponId('twin_blades'), 'khanda_dual');
  assert.equal(normalizeWeaponId('dragon_glaive'), 'trishula_great');
});

test('P2 Act I Scope Alignment: CHAMBERS has 5 cohesive chambers ending with Dundubhi (4) and Vrikodara (5)', () => {
  assert.equal(CHAMBERS.length, 5);
  assert.equal(CHAMBERS[1].spawns.some((s) => s.type === 'semi_boss_bloodforge'), true);
  assert.equal(CHAMBERS[3].id, 4);
  assert.equal(CHAMBERS[3].spawns[0].type, 'dundubhi');
  assert.equal(CHAMBERS[4].id, 5);
  assert.equal(CHAMBERS[4].spawns[0].type, 'vrikodara');
  assert.ok(GAME_ASSETS.models3d.lotusEmpress.textureFbx.includes('Lotus_Empress'));
});

test('P2 Walkable Vaitarani Ash Hub: stations, proximity detection, and Ferry Gate auto-entry work deterministically', () => {
  assert.equal(VAITARANI_HUB_STATIONS.length, 3);
  assert.equal(findNearestHubStation(HUB_SPAWN_X, HUB_SPAWN_Y).station, null);

  const nearSavitri = findNearestHubStation(HUB_SAVITRI_POS.x + 20, HUB_SAVITRI_POS.y + 10);
  assert.equal(nearSavitri.station?.id, 'savitri_lantern');

  const nearGate = findNearestHubStation(HUB_FERRY_GATE_POS.x, HUB_FERRY_GATE_POS.y + 10);
  assert.equal(nearGate.station?.id, 'ferry_gate');
  assert.equal(isInsideHubFerryGate(HUB_FERRY_GATE_POS.x, HUB_FERRY_GATE_POS.y), true);
  assert.equal(isInsideHubFerryGate(HUB_SPAWN_X, HUB_SPAWN_Y), false);
});

test('P0/P1 Safeguards: kurukshetra_pillar ignores ordinary combat AoE and Vrikodara Inhale interrupts or heals/empowers', () => {
  assert.equal(shouldDamageProp('kurukshetra_pillar', false), false);
  assert.equal(shouldDamageProp('kurukshetra_pillar', true), true);
  assert.equal(shouldDamageProp('homa_cauldron', false), true);

  const interrupted = resolveVrikodaraInhaleImpact({
    connectedOnPlayer: false,
    interruptedDuringWindup: true,
    currentHp: 1000,
    maxHp: 2000,
    attackIndex: 1,
    currentConsumed: null,
  });
  assert.equal(interrupted.cancelledWindup, true);
  assert.equal(interrupted.staggerSec, 1.4);
  assert.equal(interrupted.nextHp, 1000);

  const consumed = resolveVrikodaraInhaleImpact({
    connectedOnPlayer: true,
    interruptedDuringWindup: false,
    currentHp: 1000,
    maxHp: 2000,
    attackIndex: 0,
    currentConsumed: null,
  });
  assert.equal(consumed.nextHp, 1080); // +4% maxHp
  assert.equal(consumed.furnaceEmpoweredSec, 7.0);
  assert.equal(consumed.consumedSlot, 'astra');
});
