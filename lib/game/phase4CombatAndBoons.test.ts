import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPON_CONFIGS, normalizeWeaponId } from './rules';
import {
  computeVrikodaraPhase,
  evaluateSemiBossGuardBreak,
  resolveConsumeFurnacePunish,
  resolveDundubhiPillarCollision,
  selectConsumeAbility,
  SEMI_BOSS_GUARD_BREAK_PUNISH_SEC,
  VRIKODARA_CONSUME_DURATION_SEC,
} from './bossEncounters';
import { evaluateParryImpact } from './modernCombat';
import {
  formatCleanDamageNumber,
  KALIYUGA_CRIT_GOLD_COLOR,
  KALIYUGA_NORMAL_BONE_WHITE_COLOR,
} from './combatPipeline';
import {
  computeBoonModifiers,
  getBoonOrbCell,
  LOHIT_SHARD_PICKUP_CELL,
} from './boons';
import { HudSnapshot, shouldSyncHudSnapshot } from './arenaHudState';

test('WEAPON_CONFIGS registers unified Parashu, Khanda, Trishula IDs and normalizeWeaponId handles legacy IDs', () => {
  assert.ok(WEAPON_CONFIGS.parashu, 'parashu weapon config must exist');
  assert.equal(WEAPON_CONFIGS.parashu.id, 'parashu');
  assert.equal(WEAPON_CONFIGS.parashu.key, '2');
  assert.equal(normalizeWeaponId('jingu_bang'), 'parashu');
  assert.equal(normalizeWeaponId('twin_blades'), 'khanda_dual');
  assert.equal(normalizeWeaponId('dragon_glaive'), 'trishula_great');
});

test('Semi-Boss Molten Oni Aegis deflects frontal Light spam and cracks on Heavy, Backstab, Parry-Riposte, or Finisher', () => {
  const lightFront = evaluateSemiBossGuardBreak({
    isGuarding: true,
    isFromBehind: false,
    attackKind: 'light',
  });
  assert.equal(lightFront.deflected, true);
  assert.equal(lightFront.guardBroken, false);
  assert.equal(lightFront.damageMultiplier, 0.15);

  for (const kind of ['heavy', 'parry_riposte', 'finisher'] as const) {
    const breakRes = evaluateSemiBossGuardBreak({
      isGuarding: true,
      isFromBehind: false,
      attackKind: kind,
    });
    assert.equal(breakRes.deflected, false);
    assert.equal(breakRes.guardBroken, true);
    assert.equal(breakRes.punishDurationSec, SEMI_BOSS_GUARD_BREAK_PUNISH_SEC);
    assert.ok(breakRes.punishDurationSec >= 1.8);
  }

  const backstab = evaluateSemiBossGuardBreak({
    isGuarding: true,
    isFromBehind: true,
    attackKind: 'light',
  });
  assert.equal(backstab.deflected, false);
  assert.equal(backstab.guardBroken, true);
  assert.equal(backstab.punishDurationSec, SEMI_BOSS_GUARD_BREAK_PUNISH_SEC);
});

test('Dundubhi pillar-baiting collision grants >= 2.5s punish window (4.5s)', () => {
  const res = resolveDundubhiPillarCollision();
  assert.equal(res.shattered, true);
  assert.ok(res.punishWindowSec >= 2.5);
  assert.equal(res.punishWindowSec, 4.5);
});

test('Vrikodara 3-phase thresholds (65% / 25%), Consume ability sealing, and Belly Rupture reclaim', () => {
  assert.equal(computeVrikodaraPhase(100, 100), 1);
  assert.equal(computeVrikodaraPhase(66, 100), 1);
  assert.equal(computeVrikodaraPhase(65, 100), 2);
  assert.equal(computeVrikodaraPhase(25, 100), 2);
  assert.equal(computeVrikodaraPhase(24, 100), 3);

  assert.equal(VRIKODARA_CONSUME_DURATION_SEC, 8.0);
  const firstSeal = selectConsumeAbility(null, 0);
  assert.equal(firstSeal, 'astra');
  assert.equal(selectConsumeAbility(firstSeal, 1), 'parry');

  const noBreakOnLight = resolveConsumeFurnacePunish({
    consumedAbility: 'astra',
    attackKind: 'light',
    furnaceExposed: true,
  });
  assert.equal(noBreakOnLight.freedAbility, null);
  assert.equal(noBreakOnLight.pranaBurst, 0);

  for (const kind of ['heavy', 'finisher', 'parry_riposte'] as const) {
    const freed = resolveConsumeFurnacePunish({
      consumedAbility: 'parry',
      attackKind: kind,
      furnaceExposed: true,
    });
    assert.equal(freed.freedAbility, 'parry');
    assert.equal(freed.pranaBurst, 35);
  }
});

test('Iron Guard Parry awards 2.6s 100% crit window and +25/+10 Prana bursts', () => {
  const perfect = evaluateParryImpact({
    parryElapsedSec: 0.1,
    incomingDamage: 30,
    attackerMaxPosture: 100,
    isUnblockableCrimsonAttack: false,
  });
  assert.equal(perfect.tier, 'perfect_golden');
  assert.equal(perfect.grantsCritWindow, true);
  assert.equal(perfect.critWindowDurationSec, 2.6);
  assert.equal(perfect.pranaBurstAmount, 25);

  const guard = evaluateParryImpact({
    parryElapsedSec: 0.4,
    incomingDamage: 30,
    attackerMaxPosture: 100,
    isUnblockableCrimsonAttack: false,
  });
  assert.equal(guard.tier, 'standard_guard');
  assert.equal(guard.grantsCritWindow, false);
  assert.equal(guard.pranaBurstAmount, 10);
});

test('formatCleanDamageNumber styles crits in Kaliyuga gold, normals in bone-white, and de-stacks overlaps', () => {
  const critPop = formatCleanDamageNumber({
    amount: 142.4,
    isCrit: true,
    x: 400,
    y: 300,
  });
  assert.equal(critPop.color, KALIYUGA_CRIT_GOLD_COLOR);
  assert.equal(critPop.text, '142!');

  const normalPop = formatCleanDamageNumber({
    amount: 48,
    isCrit: false,
    x: 400,
    y: 300,
  });
  assert.equal(normalPop.color, KALIYUGA_NORMAL_BONE_WHITE_COLOR);
  assert.equal(normalPop.text, '48');

  const destacked = formatCleanDamageNumber({
    amount: 50,
    isCrit: false,
    x: 400,
    y: 300,
    existingPops: [{ x: 400, y: 300, text: '48', life: 0.6 }],
  });
  assert.notEqual(destacked.x, 400);
  assert.ok(destacked.y < 300);
});

test('Transformative Boon modifiers and Lohit Shard / Boon Orb atlas coordinates', () => {
  const mods = computeBoonModifiers([
    'nezha_scorch_strike',
    'aoguang_tidal_slam',
    'sage_phantom_echo',
  ]);
  assert.equal(mods.parryFireBoltsCount, 3);
  assert.ok(mods.heavyFaultLineDamage > 0);
  assert.equal(mods.finisherRageDurationSec, 3.0);
  assert.equal(mods.finisherRageAttackSpeedBonus, 0.35);

  assert.deepEqual(LOHIT_SHARD_PICKUP_CELL, { col: 0, row: 0 });
  assert.deepEqual(getBoonOrbCell('nezha'), { col: 1, row: 0 });
  assert.deepEqual(getBoonOrbCell('greatsage'), { col: 0, row: 1 });
  assert.deepEqual(getBoonOrbCell('erlang', 'Heroic'), { col: 1, row: 1 });
});

test('shouldSyncHudSnapshot detects isSemiBoss, guardBroken, and consumedAbility changes', () => {
  const baseSnapshot: HudSnapshot = {
    chamberId: 2,
    chamberName: 'Sealed Gate of Raktabija',
    foesRemaining: 3,
    score: 0,
    comboCount: 0,
    ashenKarma: 500,
    karmaRunDelta: 0,
    fps: 60,
    playerHp: 250,
    playerDisplayHp: 250,
    playerMaxHp: 250,
    focusOrbs: 1,
    focusProgress: 0,
    dashCharges: 2,
    maxDashCharges: 2,
    stance: 'smash',
    weapon: 'parashu',
    gourdSips: 3,
    maxGourdSips: 3,
    immobilizeCd: 0,
    parryCd: 0,
    clonesCd: 0,
    transformCd: 0,
    transformActiveTimer: 0,
    hasBrokenTarget: false,
    riposteWindowTimer: 0,
    kalaRewindCd: 0,
    shadowBlinkCd: 0,
    stylePoints: 0,
    styleStatus: {
      grade: 'D',
      title: 'INITIATE',
      color: '#8f8473',
      damageBonusMultiplier: 1,
      karmaBonusMultiplier: 1,
      nextThresholdProgress: 0,
    },
    partyLinkCd: 0,
    partyCompanions: [],
    stamina: 100,
    maxStamina: 100,
    astraEnergy: 100,
    maxAstraEnergy: 100,
    agneyastraCd: 0,
    vayavyastraCd: 0,
    vajrastraCd: 0,
    activeUpasamharaZones: [],
    narayanastraTrial: {
      active: false,
      invokerEnemyId: null,
      invokerName: '',
      calmTimerSec: 0,
      requiredCalmSec: 3,
      escalationStacks: 0,
      remainingWindowSec: 0,
      resolved: 'none',
    },
    runDamageDealt: 0,
    runParriesLanded: 0,
    runDodgesCompleted: 0,
    runPostureBreaks: 0,
    runTimeSec: 0,
    boss: {
      active: true,
      type: 'semi_boss_bloodforge',
      aiState: 'chase',
      name: 'WARDEN',
      sanskritTitle: 'WARDEN',
      hp: 400,
      displayHp: 400,
      maxHp: 400,
      posture: 100,
      maxPosture: 100,
      phase: 1,
      isSemiBoss: true,
      guardBroken: false,
    },
    consumedAbility: null,
    consumedTimer: 0,
  };

  assert.equal(shouldSyncHudSnapshot(baseSnapshot, { ...baseSnapshot, boss: { ...baseSnapshot.boss! } }), false);
  assert.equal(
    shouldSyncHudSnapshot(baseSnapshot, {
      ...baseSnapshot,
      boss: { ...baseSnapshot.boss!, guardBroken: true },
    }),
    true
  );
  assert.equal(
    shouldSyncHudSnapshot(baseSnapshot, {
      ...baseSnapshot,
      boss: { ...baseSnapshot.boss!, isSemiBoss: false },
    }),
    true
  );
  assert.equal(
    shouldSyncHudSnapshot(baseSnapshot, {
      ...baseSnapshot,
      consumedAbility: 'astra',
      consumedTimer: 8,
    }),
    true
  );
});
