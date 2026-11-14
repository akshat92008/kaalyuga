import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DASH_DURATION_SEC,
  DASH_IFRAME_SEC,
  INPUT_BUFFER_WINDOW_SEC,
  computeActionFramePhase,
  stepEnemyIronGuardState,
  evaluateParryImpact,
  evaluateSeeThroughOrRiposte,
  pushTemporalSnapshot,
  computeKalaRewindState,
  planShadowAssassination,
  computeCombatStyleStatus,
} from './modernCombat';
import { consumeDashStamina } from './rules';
import { assignGroupAttackTokens } from './astraEngine';

test('God of War 2-Tier Parry: Perfect Golden window negates 100% damage, grants Riposte & Focus Orb', () => {
  const perfect = evaluateParryImpact({
    parryElapsedSec: 0.12,
    incomingDamage: 48,
    attackerMaxPosture: 120,
    isUnblockableCrimsonAttack: false,
  });
  assert.equal(perfect.tier, 'perfect_golden');
  assert.equal(perfect.damageTaken, 0);
  assert.equal(perfect.grantsRiposteWindow, true);
  assert.equal(perfect.focusOrbsGranted, 1);
  assert.ok(perfect.postureDamageDealt >= 70);

  const standard = evaluateParryImpact({
    parryElapsedSec: 0.42,
    incomingDamage: 40,
    attackerMaxPosture: 120,
    isUnblockableCrimsonAttack: false,
  });
  assert.equal(standard.tier, 'standard_guard');
  assert.equal(standard.damageTaken, 6);
  assert.equal(standard.grantsRiposteWindow, false);

  const crimson = evaluateParryImpact({
    parryElapsedSec: 0.08,
    incomingDamage: 60,
    attackerMaxPosture: 200,
    isUnblockableCrimsonAttack: true,
  });
  assert.equal(crimson.tier, 'whiff');
  assert.ok(crimson.damageTaken > 0);
});

test('Black Myth See-Through & God of War Riposte counters boost damage and grant invulnerability', () => {
  const riposte = evaluateSeeThroughOrRiposte({
    playerInLightCombo: false,
    nearbyEnemyWindingUp: false,
    focusOrbs: 1,
    riposteWindowActive: true,
  });
  assert.equal(riposte.triggeredRiposteBurst, true);
  assert.equal(riposte.damageMultiplier, 2.65);

  const seeThrough = evaluateSeeThroughOrRiposte({
    playerInLightCombo: true,
    nearbyEnemyWindingUp: true,
    focusOrbs: 2,
    riposteWindowActive: false,
  });
  assert.equal(seeThrough.triggeredSeeThrough, true);
  assert.equal(seeThrough.damageMultiplier, 2.15);
  assert.equal(seeThrough.refundsFocusOrb, true);
});

test('Prince of Persia Kala-Rewind buffer restores position and highest recorded HP within 3s window', () => {
  let buf = pushTemporalSnapshot([], { timestampSec: 1.0, x: 200, y: 300, hp: 140 });
  buf = pushTemporalSnapshot(buf, { timestampSec: 2.5, x: 260, y: 320, hp: 110 });
  buf = pushTemporalSnapshot(buf, { timestampSec: 3.8, x: 310, y: 350, hp: 75 });

  const rewind = computeKalaRewindState(buf, 310, 350, 75, 150);
  assert.equal(rewind.canRewind, true);
  assert.equal(rewind.targetX, 200);
  assert.equal(rewind.targetY, 300);
  assert.equal(rewind.restoredHp, 140);
  assert.equal(rewind.hpRecoveredDelta, 65);
});

test('Assassins Creed Shadow Prana Blink prioritizes broken/low-HP enemies, teleports behind them, and resets on kill', () => {
  const plan = planShadowAssassination(100, 100, 50, [
    {
      id: 1,
      x: 220,
      y: 120,
      hp: 300,
      maxHp: 300,
      posture: 100,
      maxPosture: 100,
      facing: 1,
      isBoss: false,
      postureBroken: false,
    },
    {
      id: 2,
      x: 340,
      y: 150,
      hp: 90,
      maxHp: 200,
      posture: 40,
      maxPosture: 100,
      facing: -1,
      isBoss: false,
      postureBroken: false,
    },
  ]);

  assert.equal(plan.targetId, 2);
  // Target 2 faces -1 (left), so behind them is +42 to the right (340 + 42 = 382)
  assert.equal(plan.blinkX, 382);
  assert.equal(plan.newFacing, -1);
  assert.equal(plan.isLethalExecute, true);
  assert.equal(plan.resetsCooldownOnKillOrBreak, true);
});

test('Hades / DMC Combat Style Rank scales from D to SSS with damage and karma multipliers', () => {
  const rankD = computeCombatStyleStatus(10);
  const rankS = computeCombatStyleStatus(480);
  const rankSSS = computeCombatStyleStatus(950);

  assert.equal(rankD.grade, 'D');
  assert.equal(rankS.grade, 'S');
  assert.equal(rankSSS.grade, 'SSS');
  assert.ok(rankSSS.damageBonusMultiplier > rankS.damageBonusMultiplier);
  assert.ok(rankS.damageBonusMultiplier > rankD.damageBonusMultiplier);
});

test('Dash timing split (160ms duration / 130ms i-frame) & strict 2-charge + stamina gating', () => {
  assert.equal(DASH_DURATION_SEC, 0.16);
  assert.equal(DASH_IFRAME_SEC, 0.13);
  assert.equal(INPUT_BUFFER_WINDOW_SEC, 0.12);

  // Requires BOTH charges >= 1 AND stamina >= 25
  const noStamina = consumeDashStamina({
    currentCharges: 2,
    maxCharges: 2,
    currentRechargeTimer: 0,
    currentStamina: 15,
    staminaCost: 25,
  });
  assert.equal(noStamina.canDash, false);
  assert.equal(noStamina.nextCharges, 2);

  const noCharge = consumeDashStamina({
    currentCharges: 0,
    maxCharges: 2,
    currentRechargeTimer: 0.6,
    currentStamina: 100,
    staminaCost: 25,
  });
  assert.equal(noCharge.canDash, false);
  assert.equal(noCharge.nextCharges, 0);

  const validDash = consumeDashStamina({
    currentCharges: 2,
    maxCharges: 2,
    currentRechargeTimer: 0,
    currentStamina: 80,
    staminaCost: 25,
  });
  assert.equal(validDash.canDash, true);
  assert.equal(validDash.nextCharges, 1);
  assert.equal(validDash.nextStamina, 55);
});

test('Explicit Startup / Active / Recovery frame phases + 120ms input buffer & Dash cancel', () => {
  const startup = computeActionFramePhase('light_attack', 0.25, 0.28);
  assert.equal(startup.phase, 'startup');
  assert.equal(startup.canDashCancel, true);
  assert.equal(startup.canBufferNext, false);

  const active = computeActionFramePhase('light_attack', 0.16, 0.28);
  assert.equal(active.phase, 'active');
  assert.equal(active.canDashCancel, true);

  const recoveryBuffer = computeActionFramePhase('light_attack', 0.10, 0.28);
  assert.equal(recoveryBuffer.phase, 'active'); // 0.18 / 0.28 = 0.64, still inside 120ms buffer window!
  assert.equal(recoveryBuffer.canBufferNext, true);

  const lateRecovery = computeActionFramePhase('heavy_unleash', 0.08, 0.44);
  assert.equal(lateRecovery.phase, 'recovery');
  assert.equal(lateRecovery.canBufferNext, true);
  assert.equal(lateRecovery.canDashCancel, true);
});

test('Deterministic Iron Guard windup & cooldown replaces per-frame RNG', () => {
  // Step 1: Enemy in range while player attacks -> triggers 220ms windup once and locks 6.5s cooldown
  const step1 = stepEnemyIronGuardState({
    canGuard: true,
    isBoss: false,
    aiState: 'chase',
    distToPlayer: 120,
    playerAttacking: true,
    postureBroken: false,
    immobilized: false,
    parryStanceTimer: 0,
    ironGuardWindupTimer: 0,
    ironGuardCd: 0,
    dt: 0.016,
  });
  assert.equal(step1.startedWindup, true);
  assert.equal(step1.activatedGuard, false);
  assert.equal(step1.ironGuardWindupTimer, 0.22);
  assert.equal(step1.ironGuardCd, 6.5);

  // Step 2: Finish 220ms windup -> activates 0.9s guard stance
  const step2 = stepEnemyIronGuardState({
    canGuard: true,
    isBoss: false,
    aiState: 'chase',
    distToPlayer: 120,
    playerAttacking: true,
    postureBroken: false,
    immobilized: false,
    parryStanceTimer: step1.parryStanceTimer,
    ironGuardWindupTimer: step1.ironGuardWindupTimer,
    ironGuardCd: step1.ironGuardCd,
    dt: 0.25,
  });
  assert.equal(step2.activatedGuard, true);
  assert.equal(step2.parryStanceTimer, 0.9);
  assert.ok(step2.ironGuardCd > 6.0);
});

test('Simultaneous enemy attack tokens strictly capped to < 2 melee + 1 ranged', () => {
  const tokens = assignGroupAttackTokens(
    [
      { id: 1, type: 'wolf_guai', hp: 100, x: 110, y: 100, aiState: 'chase' },
      { id: 2, type: 'stone_golem', hp: 100, x: 130, y: 100, aiState: 'chase' },
      { id: 3, type: 'furnace_titan', hp: 100, x: 140, y: 100, aiState: 'chase' },
      { id: 4, type: 'fire_monk', hp: 100, x: 220, y: 100, aiState: 'chase' },
      { id: 5, type: 'fire_monk', hp: 100, x: 260, y: 100, aiState: 'chase' },
    ],
    100,
    100
  );
  // At most 1 melee/heavy (id 1) + 1 ranged (id 4) = 2 tokens total
  assert.equal(tokens.size, 2);
  assert.equal(tokens.has(1), true);
  assert.equal(tokens.has(4), true);
  assert.equal(tokens.has(2), false);
  assert.equal(tokens.has(3), false);
});

