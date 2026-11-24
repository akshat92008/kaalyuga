import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  receiveHit,
  selectParashuFinisherVariant,
  HITSTOP_MIN_SEC,
  HITSTOP_MAX_SEC,
  WHITE_HIT_FLASH_SEC,
  MAX_CLAMPED_CAMERA_TRAUMA,
} from './combatPipeline';
import {
  CHARNEL_GHOUL_POUNCE_WINDUP_SEC,
  ASHEN_ORACLE_YANTRA_WINDUP_SEC,
  IRONMAW_GLADIATOR_SLAM_WINDUP_SEC,
  computeAct1ArchetypeAttackSpec,
  evaluateIronmawGladiatorDefense,
} from './enemyArchetypesAndTelegraphs';
import {
  DUNDUBHI_PILLAR_PUNISH_WINDOW_SEC,
  resolveDundubhiPillarCollision,
  evaluateVrikodaraTelegraphHit,
} from './bossEncounters';
import { shouldSyncHudSnapshot, type HudSnapshot } from './arenaHudState';

describe('Stage D — Hades-Feel Combat Polish, Variety & Encounters (Steps 20–25)', () => {
  it('Step 20: receiveHit() unifies HP loss, posture break, 30-60ms hitstop, 1-frame white hit-flash, directional knockback, and clamped camera trauma', () => {
    const enemyTarget = {
      hp: 120,
      maxHp: 120,
      posture: 20,
      maxPosture: 100,
      postureBrokenTimer: 0,
      vx: 0,
      vy: 0,
      hitFlashTimer: 0,
      scaleX: 1,
      scaleY: 1,
      isBoss: false,
      aiState: 'chase' as const,
      aiTimer: 0,
    };

    const hitAngle = Math.atan2(4, 3);
    const lightHit = receiveHit(enemyTarget, {
      targetKind: 'enemy',
      hpDamage: 25,
      postureDamage: 30,
      knockbackAngleRad: hitAngle,
      knockbackImpulse: 40,
      hitWeight: 'light',
      currentHitstopSec: 0,
      currentCameraTrauma: 0.1,
    });

    assert.equal(lightHit.hpLost, 25);
    assert.equal(lightHit.nextHp, 95);
    assert.equal(lightHit.triggeredPostureBreak, true);
    assert.equal(enemyTarget.postureBrokenTimer, 4.0);
    assert.ok(
      lightHit.appliedHitstopSec >= HITSTOP_MIN_SEC &&
        lightHit.appliedHitstopSec <= HITSTOP_MAX_SEC,
      `Hitstop ${lightHit.appliedHitstopSec} must be within [${HITSTOP_MIN_SEC}, ${HITSTOP_MAX_SEC}]`
    );
    assert.equal(lightHit.hitFlashSec, WHITE_HIT_FLASH_SEC);
    assert.equal(lightHit.spraySpec.sprayAngleRad, hitAngle);
    assert.ok(lightHit.impulseVx > 0 && lightHit.impulseVy > 0);
    assert.ok(lightHit.nextCameraTrauma <= MAX_CLAMPED_CAMERA_TRAUMA);

    // Verify camera trauma clamps strictly at MAX_CLAMPED_CAMERA_TRAUMA (0.85) even under stacked finishers
    const bossTarget = {
      hp: 500,
      maxHp: 500,
      posture: 10,
      maxPosture: 200,
      postureBrokenTimer: 2.0,
      vx: 0,
      vy: 0,
      hitFlashTimer: 0,
      scaleX: 1,
      scaleY: 1,
      isBoss: true,
      armorCracked: false,
    };
    const stackedFinisher = receiveHit(bossTarget, {
      targetKind: 'enemy',
      hpDamage: 135,
      postureDamage: 50,
      knockbackAngleRad: 0,
      knockbackImpulse: 80,
      hitWeight: 'execute',
      currentHitstopSec: 0.02,
      currentCameraTrauma: 0.82,
      cracksArmor: true,
    });
    assert.equal(stackedFinisher.hpLost, 135);
    assert.equal(stackedFinisher.crackedArmorNow, true);
    assert.equal(stackedFinisher.nextCameraTrauma, MAX_CLAMPED_CAMERA_TRAUMA);
    assert.equal(stackedFinisher.appliedHitstopSec, HITSTOP_MAX_SEC);
  });

  it('Step 21: selectParashuFinisherVariant() selects context-sensitive God of War Parashu animations on comboStep 4, heavy unleash, and staggered executions', () => {
    const crushExec = selectParashuFinisherVariant({
      comboStep: 2,
      stance: 'smash',
      isExecution: true,
      targetDistPx: 42,
      nearbyEnemiesCount: 1,
      targetIsStaggered: true,
    });
    assert.equal(crushExec.variant, 'downward_crush');
    assert.equal(crushExec.rudraAnimState, 'heavy');
    assert.ok(crushExec.damageMultiplier >= 2.0);

    const spinCrowd = selectParashuFinisherVariant({
      comboStep: 4,
      stance: 'pillar',
      isExecution: false,
      targetDistPx: 55,
      nearbyEnemiesCount: 3,
      targetIsStaggered: false,
    });
    assert.equal(spinCrowd.variant, 'spin_360_cleave');
    assert.equal(spinCrowd.rudraAnimState, 'cast');
    assert.equal(spinCrowd.is360Spin, true);
    assert.ok(spinCrowd.cleaveRadiusPx >= 140);

    const lungeGapClose = selectParashuFinisherVariant({
      comboStep: 4,
      stance: 'thrust',
      isExecution: false,
      targetDistPx: 112,
      nearbyEnemiesCount: 1,
      targetIsStaggered: false,
    });
    assert.equal(lungeGapClose.variant, 'impaling_lunge');
    assert.equal(lungeGapClose.rudraAnimState, 'attack3');
    assert.ok(lungeGapClose.lungeImpulsePx >= 100);
  });

  it('Step 22: Act I archetypes use exact 380ms/650ms/550ms windups and Ironmaw Gladiator blocks front hits until recovery/backstab', () => {
    const ghoulSpec = computeAct1ArchetypeAttackSpec({
      enemyType: 'wolf_guai',
      enemyX: 0,
      enemyY: 0,
      playerX: 120,
      playerY: 0,
    });
    assert.equal(ghoulSpec.windupSec, CHARNEL_GHOUL_POUNCE_WINDUP_SEC);
    assert.equal(ghoulSpec.windupSec, 0.38);
    assert.equal(ghoulSpec.telegraphShape, 'red_lunge_line');

    const oracleSpec = computeAct1ArchetypeAttackSpec({
      enemyType: 'fire_monk',
      enemyX: 0,
      enemyY: 0,
      playerX: 180,
      playerY: 45,
    });
    assert.equal(oracleSpec.windupSec, ASHEN_ORACLE_YANTRA_WINDUP_SEC);
    assert.equal(oracleSpec.windupSec, 0.65);
    assert.equal(oracleSpec.telegraphShape, 'vedic_yantra_fill');

    const gladiatorSpec = computeAct1ArchetypeAttackSpec({
      enemyType: 'stone_golem',
      enemyX: 0,
      enemyY: 0,
      playerX: 60,
      playerY: 0,
    });
    assert.equal(gladiatorSpec.windupSec, IRONMAW_GLADIATOR_SLAM_WINDUP_SEC);
    assert.equal(gladiatorSpec.windupSec, 0.55);
    assert.equal(gladiatorSpec.telegraphShape, 'overhead_slam_sector');

    // Frontal hit while Ironmaw Gladiator is chasing (shield raised) -> blocked!
    const frontGuard = evaluateIronmawGladiatorDefense({
      enemyType: 'stone_golem',
      aiState: 'chase',
      ironGuardTimer: 0,
      postureBrokenTimer: 0,
      enemyFacingAngle: 0,
      enemyX: 0,
      enemyY: 0,
      attackerX: 100,
      attackerY: 0,
    });
    assert.equal(frontGuard.isFrontShieldBlocking, true);
    assert.equal(frontGuard.damageMultiplier, 0.25);

    // Frontal hit while Ironmaw Gladiator is in recovery -> shield open!
    const recoveryOpen = evaluateIronmawGladiatorDefense({
      enemyType: 'stone_golem',
      aiState: 'recover',
      ironGuardTimer: 0,
      postureBrokenTimer: 0,
      enemyFacingAngle: 0,
      enemyX: 0,
      enemyY: 0,
      attackerX: 100,
      attackerY: 0,
    });
    assert.equal(recoveryOpen.isFrontShieldBlocking, false);
    assert.equal(recoveryOpen.isVulnerableWindowOpen, true);
    assert.equal(recoveryOpen.damageMultiplier, 1.0);

    // Dash-behind backstab during windup -> 1.55x backstab bonus!
    const backstab = evaluateIronmawGladiatorDefense({
      enemyType: 'stone_golem',
      aiState: 'windup',
      ironGuardTimer: 0,
      postureBrokenTimer: 0,
      enemyFacingAngle: 0,
      enemyX: 0,
      enemyY: 0,
      attackerX: -100,
      attackerY: 0,
    });
    assert.equal(backstab.isFrontShieldBlocking, false);
    assert.equal(backstab.isBackstabAngle, true);
    assert.equal(backstab.damageMultiplier, 1.55);
  });

  it('Step 23: Dundubhi horn-charge colliding with a Kurukshetra Pillar shatters the pillar and opens a 4.5s armor-broken punish window', () => {
    const collision = resolveDundubhiPillarCollision();
    assert.equal(collision.shattered, true);
    assert.equal(collision.punishWindowSec, DUNDUBHI_PILLAR_PUNISH_WINDOW_SEC);
    assert.equal(collision.punishWindowSec, 4.5);
    assert.ok(collision.selfDamageRatio > 0.1);
  });

  it('Step 24: Vrikodara attacks provide fair outward-escape rings and angular dash gaps', () => {
    // 1. Abdominal Furnace Vacuum Pull: escaping outside 158px core blast radius avoids damage
    const vacuumInside = evaluateVrikodaraTelegraphHit({
      moveId: 'agni_furnace_inhale',
      bossX: 0,
      bossY: 0,
      bossAttackAngle: 0,
      targetX: 120,
      targetY: 0,
      targetRadius: 18,
    });
    assert.equal(vacuumInside.hit, true);

    const vacuumEscaped = evaluateVrikodaraTelegraphHit({
      moveId: 'agni_furnace_inhale',
      bossX: 0,
      bossY: 0,
      bossAttackAngle: 0,
      targetX: 195,
      targetY: 0,
      targetRadius: 18,
    });
    assert.equal(vacuumEscaped.hit, false);
    assert.equal(vacuumEscaped.inSafeEscapeGap, true);

    // 2. Molten Slag Arc: dashing into the wedge gap between prongs (0 rad and +0.68 rad) avoids damage
    const slagCenterLobe = evaluateVrikodaraTelegraphHit({
      moveId: 'vaitarani_slag_eruption',
      bossX: 0,
      bossY: 0,
      bossAttackAngle: 0,
      targetX: 140,
      targetY: 0,
      targetRadius: 18,
    });
    assert.equal(slagCenterLobe.hit, true);

    const slagGapAngle = 0.34; // Midpoint between prong 0 (0 rad) and prong +1 (+0.68 rad)
    const slagInGap = evaluateVrikodaraTelegraphHit({
      moveId: 'vaitarani_slag_eruption',
      bossX: 0,
      bossY: 0,
      bossAttackAngle: 0,
      targetX: Math.cos(slagGapAngle) * 140,
      targetY: Math.sin(slagGapAngle) * 140,
      targetRadius: 18,
    });
    assert.equal(slagInGap.hit, false);
    assert.equal(slagInGap.inSafeEscapeGap, true);

    // 3. Phase 2 Eclipse Twin-Trident Sweep: dashing behind Vrikodara avoids the frontal sweep
    const sweepFront = evaluateVrikodaraTelegraphHit({
      moveId: 'rudra_jaw_guillotine',
      bossX: 0,
      bossY: 0,
      bossAttackAngle: 0,
      targetX: 140,
      targetY: 0,
      targetRadius: 18,
    });
    assert.equal(sweepFront.hit, true);

    const sweepBehind = evaluateVrikodaraTelegraphHit({
      moveId: 'rudra_jaw_guillotine',
      bossX: 0,
      bossY: 0,
      bossAttackAngle: 0,
      targetX: -120,
      targetY: 0,
      targetRadius: 18,
    });
    assert.equal(sweepBehind.hit, false);
    assert.equal(sweepBehind.inSafeEscapeGap, true);
  });

  it('Step 25: shouldSyncHudSnapshot() skips React state updates when HUD values are unchanged across 60 FPS frames', () => {
    const baseHud: HudSnapshot = {
      chamberId: 1,
      chamberName: 'Drowned Ghats',
      foesRemaining: 3,
      score: 120,
      comboCount: 4,
      ashenKarma: 50,
      karmaRunDelta: 10,
      fps: 60,
      playerHp: 100,
      playerDisplayHp: 100,
      playerMaxHp: 100,
      stamina: 100,
      maxStamina: 100,
      astraEnergy: 40,
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
        requiredCalmSec: 2,
        escalationStacks: 0,
        remainingWindowSec: 0,
        resolved: 'none',
      },
      focusOrbs: 1,
      focusProgress: 0.4,
      stance: 'smash',
      weapon: 'parashu',
      gourdSips: 3,
      maxGourdSips: 3,
      dashCharges: 2,
      maxDashCharges: 2,
      immobilizeCd: 0,
      parryCd: 0,
      clonesCd: 0,
      transformCd: 0,
      transformActiveTimer: 0,
      hasBrokenTarget: false,
      riposteWindowTimer: 0,
      kalaRewindCd: 0,
      shadowBlinkCd: 0,
      stylePoints: 15,
      styleStatus: {
        grade: 'C',
        title: 'KRODHA',
        color: '#f59e0b',
        damageBonusMultiplier: 1.1,
        karmaBonusMultiplier: 1.1,
        nextThresholdProgress: 0.5,
      },
      partyLinkCd: 0,
      partyCompanions: [],
      runDamageDealt: 340,
      runParriesLanded: 1,
      runDodgesCompleted: 4,
      runPostureBreaks: 1,
      runTimeSec: 18.2,
      playerX: 400,
      playerY: 300,
      videoBgEnabled: true,
      lowEndMode: false,
      boss: null,
    };

    // Sub-pixel player movement or tiny cooldown drift (<0.05s) should NOT trigger React re-render
    const subFrameHud: HudSnapshot = {
      ...baseHud,
      playerX: 404,
      playerY: 303,
      runTimeSec: 18.4,
    };
    assert.equal(shouldSyncHudSnapshot(baseHud, subFrameHud), false);

    // Meaningful combat state change (HP loss or combo increment) MUST trigger React re-render
    const damagedHud: HudSnapshot = {
      ...baseHud,
      playerHp: 82,
    };
    assert.equal(shouldSyncHudSnapshot(baseHud, damagedHud), true);
  });
});
