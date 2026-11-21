import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAtomicEnemyAnimState,
  stepEnemyRecoveryWatchdog,
  resolveRudraSusanooCoreLock,
  computeWaterFluxHit,
  computeAgniSolarHit,
  computeDynamicArenaCameraZoom,
  HEROIC_DRAW_SIZES,
} from './enemyAiStability';
import {
  getInitialDialogueNode,
  resolveDialogueChoice,
} from './hubDialogues';

test('Susanoo core lock keeps Rudra in calm walk/idle while Susanoo executes heavy swings', () => {
  const locked = resolveRudraSusanooCoreLock({
    transformTimer: 6.5,
    action: 'heavy_unleash',
    isCasting: true,
    isParrying: true,
    vx: 180,
    vy: 20,
  });
  assert.equal(locked.isSusanooActive, true);
  assert.equal(locked.rudraIsAttacking, false);
  assert.equal(locked.rudraIsHeavyAttack, false);
  assert.equal(locked.rudraIsCasting, false);
  assert.equal(locked.rudraIsParrying, false);
  assert.equal(locked.rudraOnlyCalmWalkOrIdle, true);
  assert.equal(locked.susanooShouldSwing, true);
  assert.equal(locked.susanooSwingHeavy, true);
  assert.equal(locked.invincibleInSusanoo, true);

  const normal = resolveRudraSusanooCoreLock({
    transformTimer: 0,
    action: 'light_attack',
    isCasting: false,
    isParrying: false,
    vx: 0,
    vy: 0,
  });
  assert.equal(normal.isSusanooActive, false);
  assert.equal(normal.rudraIsAttacking, true);
  assert.equal(normal.invincibleInSusanoo, false);
});

test('Atomic enemy animation prevents hit-flash from interrupting active windup or attack clips', () => {
  assert.equal(
    resolveAtomicEnemyAnimState({
      aiState: 'windup',
      isHitFlash: true,
      isPostureBroken: false,
      speed: 0,
    }),
    'windup'
  );
  assert.equal(
    resolveAtomicEnemyAnimState({
      aiState: 'attack',
      isHitFlash: true,
      isPostureBroken: false,
      speed: 0,
    }),
    'attack'
  );
  // Posture break or KO properly interrupts
  assert.equal(
    resolveAtomicEnemyAnimState({
      aiState: 'attack',
      isHitFlash: true,
      isPostureBroken: true,
      speed: 0,
    }),
    'hurt'
  );
  assert.equal(
    resolveAtomicEnemyAnimState({
      aiState: 'ko',
      isHitFlash: false,
      isPostureBroken: true,
      speed: 0,
    }),
    'death'
  );
});

test('Light hit flashes do not reset enemy idle, chase, or recover animations', () => {
  for (const aiState of ['idle', 'chase', 'recover'] as const) {
    const result = resolveAtomicEnemyAnimState({
      aiState,
      isHitFlash: true,
      isPostureBroken: false,
      speed: 0,
    });
    assert.equal(result, aiState === 'chase' ? 'chase' : 'idle');
  }
});

test('Enemy recovery watchdog prevents multi-minute freezes and caps recovery timers', () => {
  // Corrupt huge timer gets strictly clamped
  const clamped = stepEnemyRecoveryWatchdog({
    aiState: 'recover',
    aiTimer: 45,
    postureBrokenTimer: 12,
    idleFreezeAgeSec: 0.2,
    isBoss: false,
    dt: 0.016,
  });
  assert.ok(clamped.nextAiTimer <= 2.2);
  assert.ok(clamped.nextPostureBrokenTimer <= 2.2);

  // Stalled enemy past watchdog threshold forcibly unfreezes into chase
  const unfrozen = stepEnemyRecoveryWatchdog({
    aiState: 'recover',
    aiTimer: 1.5,
    postureBrokenTimer: 1.0,
    idleFreezeAgeSec: 3.3,
    isBoss: false,
    dt: 0.05,
  });
  assert.equal(unfrozen.unfroze, true);
  assert.equal(unfrozen.nextAiState, 'chase');
  assert.equal(unfrozen.nextAiTimer, 0);
  assert.equal(unfrozen.nextPostureBrokenTimer, 0);
});

test('Water [4] Constant Flux deals lethal burst + execute bonus + soaked + inward pull', () => {
  const regularMob = computeWaterFluxHit({
    hp: 170,
    maxHp: 170,
    posture: 60,
    distancePx: 90,
    isBoss: false,
    isSoaked: false,
  });
  assert.equal(regularMob.inRange, true);
  assert.ok(regularMob.damage >= 165, `Expected lethal damage >= 165, got ${regularMob.damage}`);
  assert.equal(regularMob.killed, true);
  assert.equal(regularMob.appliedSoakedSec, 6.0);
  assert.ok(regularMob.pullStrengthPx > 90);

  const woundedExecute = computeWaterFluxHit({
    hp: 95,
    maxHp: 300,
    posture: 40,
    distancePx: 140,
    isBoss: false,
    isSoaked: true,
  });
  assert.equal(woundedExecute.executedBonus, true);
  assert.equal(woundedExecute.killed, true);
});

test('Agni [Q] / Heavy blast deals high solar damage, burn DoT, and hitstop', () => {
  const agniHeavy = computeAgniSolarHit({
    hp: 185,
    maxHp: 220,
    distancePx: 100,
    isBoss: false,
    isHeavyVariant: true,
  });
  assert.equal(agniHeavy.inRange, true);
  assert.ok(agniHeavy.damage >= 185);
  assert.equal(agniHeavy.killed, true);
  assert.ok(agniHeavy.burnSec >= 5.0);
  assert.ok(agniHeavy.hitstopSec >= 0.06);
});

test('Dynamic arena camera widens smoothly during boss fights and heroic sizes stay proportional', () => {
  let zoom = 0.94;
  for (let i = 0; i < 60; i++) {
    zoom = computeDynamicArenaCameraZoom({
      isHub: false,
      hasActiveBoss: true,
      bossKind: 'dundubhi',
      susanooActive: false,
      currentZoom: zoom,
      dt: 0.05,
    });
  }
  assert.ok(zoom <= 0.82 && zoom >= 0.80, `Expected boss zoom ~0.81, got ${zoom}`);
  assert.ok(HEROIC_DRAW_SIZES.rudra < 150, 'Rudra should no longer feel oversized');
  assert.ok(HEROIC_DRAW_SIZES.dundubhi >= HEROIC_DRAW_SIZES.rudra * 1.9);
});

test('Hub text-based dialogue trees progress cleanly for Savitri and Lohakara', () => {
  const savitriStart = getInitialDialogueNode('savitri');
  assert.equal(savitriStart.speakerName, 'Savitri');
  const omenStep = resolveDialogueChoice(savitriStart, 'ask_chambers');
  assert.equal(omenStep.action, 'next');
  assert.equal(omenStep.nextNode?.id, 'savitri_omens');

  const crossStep = resolveDialogueChoice(omenStep.nextNode!, 'cross_after_omen');
  assert.equal(crossStep.action, 'enter_charnel_plains');

  const smithStart = getInitialDialogueNode('lohakara');
  assert.equal(smithStart.speakerName, 'Lohakara');
  const forgeStep = resolveDialogueChoice(smithStart, 'open_forge_now');
  assert.equal(forgeStep.action, 'open_forge');
});
