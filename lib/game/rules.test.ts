import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_SHRINE_RANKS,
  INITIAL_ASHEN_KARMA,
  getUpgradeCost,
  canPurchaseUpgrade,
  purchaseShrineUpgrade,
  computeDerivedPlayerStats,
  calculateLightHitDamage,
  calculateStanceHeavyDamage,
  getNextStaffStance,
  computeBossPhase,
  applyPostureDamage,
  isPointInConeTelegraph,
  isPointInDashCorridor,
  isPointInShockwaveRing,
  consumeDashStamina,
  computeSmartEnemyWindup,
  computeSmartEnemyRecovery,
  computePredictiveAimLead,
  computeAgniDashVelocityMultiplier,
  computeVirtualJoystickVector,
  computeGodOfWarHeavyStyleSpec,
} from './rules';

test('computeDerivedPlayerStats calculates correct baseline with initial shrine ranks', () => {
  const stats = computeDerivedPlayerStats(INITIAL_SHRINE_RANKS);
  // Base 220 + 1 rank of simian_marrow (+30) = 250
  assert.equal(stats.maxHp, 250);
  assert.equal(stats.maxGourdSips, 3);
  assert.equal(stats.startingFocusOrbs, 1);
  assert.ok(Math.abs(stats.damageMultiplier - 1.12) < 1e-6);
});

test('purchaseShrineUpgrade deducts karma and increments upgrade rank up to maxRank', () => {
  const cost = getUpgradeCost('simian_marrow', INITIAL_SHRINE_RANKS.simian_marrow);
  assert.equal(cost, 70);
  assert.equal(canPurchaseUpgrade('simian_marrow', INITIAL_SHRINE_RANKS, INITIAL_ASHEN_KARMA), true);

  const res = purchaseShrineUpgrade('simian_marrow', INITIAL_SHRINE_RANKS, INITIAL_ASHEN_KARMA);
  assert.equal(res.purchased, true);
  assert.equal(res.ranks.simian_marrow, 2);
  assert.equal(res.availableKarma, INITIAL_ASHEN_KARMA - 70);
  assert.equal(computeDerivedPlayerStats(res.ranks).maxHp, 280);
});

test('stance cycling rotates smash -> pillar -> thrust -> smash', () => {
  assert.equal(getNextStaffStance('smash'), 'pillar');
  assert.equal(getNextStaffStance('pillar'), 'thrust');
  assert.equal(getNextStaffStance('thrust'), 'smash');
});

test('light and heavy attack damage scale with combo steps, focus orbs, and stance', () => {
  const hit1 = calculateLightHitDamage({
    comboStep: 1,
    weapon: 'jingu_bang',
    ranks: INITIAL_SHRINE_RANKS,
  });
  const hit4 = calculateLightHitDamage({
    comboStep: 4,
    weapon: 'jingu_bang',
    ranks: INITIAL_SHRINE_RANKS,
  });
  assert.ok(hit4.hpDamage > hit1.hpDamage);
  assert.ok(hit4.postureDamage > hit1.postureDamage);

  const heavy1 = calculateStanceHeavyDamage({
    stance: 'smash',
    focusOrbsConsumed: 1,
    weapon: 'jingu_bang',
    ranks: INITIAL_SHRINE_RANKS,
  });
  const heavy3 = calculateStanceHeavyDamage({
    stance: 'smash',
    focusOrbsConsumed: 3,
    weapon: 'jingu_bang',
    ranks: INITIAL_SHRINE_RANKS,
  });
  assert.ok(heavy3.hpDamage > heavy1.hpDamage * 1.8);
  assert.equal(heavy3.healAmount, 42);
});

test('boss phase transitions and posture break triggers accurately', () => {
  assert.equal(computeBossPhase(1600, 1750), 1);
  assert.equal(computeBossPhase(900, 1750), 2);
  assert.equal(computeBossPhase(400, 1750), 3);

  const p1 = applyPostureDamage({
    currentPosture: 200,
    maxPosture: 1750,
    postureDamage: 150,
    alreadyBroken: false,
  });
  assert.equal(p1.nextPosture, 50);
  assert.equal(p1.triggeredBreak, false);

  const p2 = applyPostureDamage({
    currentPosture: 50,
    maxPosture: 1750,
    postureDamage: 120,
    alreadyBroken: false,
  });
  assert.equal(p2.nextPosture, 0);
  assert.equal(p2.triggeredBreak, true);
});

test('geometric combat hitboxes (cone cleave, dash corridor, shockwave) and dash stamina discipline work accurately', () => {
  // Frontal cone facing right (0 rad) hits target in front, misses target behind
  assert.equal(
    isPointInConeTelegraph({
      px: 580,
      py: 400,
      originX: 500,
      originY: 400,
      aimAngle: 0,
      radius: 150,
    }),
    true
  );
  assert.equal(
    isPointInConeTelegraph({
      px: 410,
      py: 400,
      originX: 500,
      originY: 400,
      aimAngle: 0,
      radius: 150,
    }),
    false
  );

  // Dash corridor along X axis hits target in lane, misses target far above lane
  assert.equal(
    isPointInDashCorridor({
      px: 620,
      py: 412,
      startX: 500,
      startY: 400,
      endX: 760,
      endY: 400,
      halfWidth: 42,
    }),
    true
  );
  assert.equal(
    isPointInDashCorridor({
      px: 620,
      py: 510,
      startX: 500,
      startY: 400,
      endX: 760,
      endY: 400,
      halfWidth: 42,
    }),
    false
  );

  // Shockwave ring hits grounded target, misses Pillar Stance elevated target
  assert.equal(
    isPointInShockwaveRing({
      px: 540,
      py: 420,
      centerX: 500,
      centerY: 400,
      outerRadius: 150,
      elevatedImmune: false,
    }),
    true
  );
  assert.equal(
    isPointInShockwaveRing({
      px: 540,
      py: 420,
      centerX: 500,
      centerY: 400,
      outerRadius: 150,
      elevatedImmune: true,
    }),
    false
  );

  // Dash stamina consumes 1 charge when available, initializes 1.15s recharge timer, and blocks when empty
  const d1 = consumeDashStamina({ currentCharges: 2, maxCharges: 2, currentRechargeTimer: 0 });
  assert.equal(d1.canDash, true);
  assert.equal(d1.nextCharges, 1);
  assert.equal(d1.nextRechargeTimer, 1.15);

  const d2 = consumeDashStamina({
    currentCharges: d1.nextCharges,
    maxCharges: 2,
    currentRechargeTimer: 0.72,
  });
  assert.equal(d2.canDash, true);
  assert.equal(d2.nextCharges, 0);
  assert.equal(d2.nextRechargeTimer, 0.72);

  const dEmpty = consumeDashStamina({ currentCharges: 0, maxCharges: 2, currentRechargeTimer: 0.5 });
  assert.equal(dEmpty.canDash, false);
  assert.equal(dEmpty.nextCharges, 0);
  assert.equal(dEmpty.nextRechargeTimer, 0.5);
});

test('smart enemy pacing, predictive aim lead, and 3-stage Agni-Step dash curve work accurately', () => {
  // Deliberate windup is slower (>0.6s for mobs) and scales by boss phase
  assert.equal(computeSmartEnemyWindup({ enemyType: 'wolf_guai', isBoss: false }), 0.62);
  assert.equal(computeSmartEnemyWindup({ enemyType: 'furnace_titan', isBoss: false }), 0.8);
  assert.ok(
    computeSmartEnemyWindup({ enemyType: 'vrikodara', isBoss: true, phase: 1 }) >
      computeSmartEnemyWindup({ enemyType: 'vrikodara', isBoss: true, phase: 3 })
  );

  // Recovery gives generous punish window
  assert.ok(computeSmartEnemyRecovery({ isBoss: false }) >= 1.15);
  assert.ok(computeSmartEnemyRecovery({ isBoss: true, phase: 1 }) >= 1.0);

  // Predictive aim leads moving player in direction of velocity
  const lead = computePredictiveAimLead({
    enemyX: 500,
    enemyY: 500,
    playerX: 700,
    playerY: 500,
    playerVx: 0,
    playerVy: 240,
  });
  assert.ok(lead.targetY > 500);
  assert.ok(lead.aimAngle > 0);

  // 3-Stage non-linear Agni-Step dash velocity curve
  assert.equal(computeAgniDashVelocityMultiplier(0.1), 1.42);
  assert.equal(computeAgniDashVelocityMultiplier(0.5), 1.08);
  assert.equal(computeAgniDashVelocityMultiplier(0.9), 0.38);

  // Mobile 360-degree virtual joystick deadzone and clamping
  const joyDead = computeVirtualJoystickVector({ deltaX: 2, deltaY: 1, maxRadius: 50 });
  assert.equal(joyDead.active, false);
  assert.equal(joyDead.normX, 0);

  const joyFull = computeVirtualJoystickVector({ deltaX: 80, deltaY: 0, maxRadius: 50 });
  assert.equal(joyFull.active, true);
  assert.equal(joyFull.clampedX, 50);
  assert.equal(joyFull.normX, 1);
  assert.equal(joyFull.normY, 0);

  // God-of-War distinct Heavy Attack styles per stance
  const smashHeavy = computeGodOfWarHeavyStyleSpec('smash', 3);
  const pillarHeavy = computeGodOfWarHeavyStyleSpec('pillar', 2);
  const thrustHeavy = computeGodOfWarHeavyStyleSpec('thrust', 2);
  assert.equal(smashHeavy.styleId, 'pralaya_earth_shatter');
  assert.equal(smashHeavy.animClip, 'Skill_03');
  assert.equal(pillarHeavy.styleId, 'sudarshana_vortex');
  assert.equal(pillarHeavy.animClip, 'Skill_01');
  assert.equal(thrustHeavy.styleId, 'brahmashira_lunge');
  assert.equal(thrustHeavy.animClip, 'Attack');
  assert.ok(thrustHeavy.forwardLungePx > smashHeavy.forwardLungePx);
});

test('all 8 Act I chambers have HD animated arena videos and VFX flipbook sheets registered', async () => {
  const { CHAMBERS, GAME_ASSETS } = await import('./assets');
  assert.equal(CHAMBERS.length, 8);
  for (const chamber of CHAMBERS) {
    assert.ok(chamber.videoUrl && chamber.videoUrl.startsWith('/videos/') && chamber.videoUrl.endsWith('.mp4'));
    assert.ok(!chamber.videoUrl.includes('…'), `Chamber ${chamber.id} videoUrl must not contain ellipsis`);
    assert.ok(!chamber.backgroundUrl.includes('…'), `Chamber ${chamber.id} backgroundUrl must not contain ellipsis`);
    assert.equal(chamber.floorTint, 'transparent', `Chamber ${chamber.id} must have zero programmatic floorTint grading`);
  }

  // Vaitarani Simple Ash Hub
  assert.equal(GAME_ASSETS.hub.vaitaraniAshHubBg, '/arenas/Gemini_Generated_Image_ol56bvol56bvol56.png');
  assert.equal(GAME_ASSETS.hub.vaitaraniAshHubVideo, '/videos/Ash_drifting_across_river_landscape_2b693e5d.mp4');

  // Chamber 1: Ash Shore / Skirmish
  assert.equal(CHAMBERS[0].backgroundUrl, GAME_ASSETS.chambers.vaitaraniGhat);
  assert.equal(CHAMBERS[0].videoUrl, GAME_ASSETS.arenaVideos.waterCourtyard);

  // Chamber 2: Sealed Gate of Raktabija (Locked -> Unlocked + 2x1 Vedic Chained Gate overlay d647kw)
  assert.equal(CHAMBERS[1].backgroundUrl, GAME_ASSETS.chambers.asuraLavaLocked);
  assert.equal(CHAMBERS[1].unlockedBackgroundUrl, GAME_ASSETS.chambers.asuraLavaUnlocked);
  assert.equal(GAME_ASSETS.exitGateArchways2x1, '/vfx/Gemini_Generated_Image_d647kwd647kwd647.png');

  // Chamber 3: Kurukshetra Charnel Battleground (i2qg8y + Flames_burn_on_funeral_pyres_5bef99be.mp4)
  assert.equal(CHAMBERS[2].backgroundUrl, '/arenas/Gemini_Generated_Image_i2qg8yi2qg8yi2qg.png');
  assert.equal(CHAMBERS[2].videoUrl, '/videos/Flames_burn_on_funeral_pyres_5bef99be.mp4');

  // Chamber 4: Dundubhi — Mandapa of the War-Drum (bc2kjf + new Dundubhi Arena MP4)
  assert.equal(CHAMBERS[3].backgroundUrl, '/arenas/Gemini_Generated_Image_bc2kjfbc2kjfbc2k.png');
  assert.equal(CHAMBERS[3].videoUrl, '/videos/Flames_flickering_around_stone_f_09be2052.mp4');

  // Vrikodara — Sanctum of the Infernal Maw (Phase 1 -> Phase 2 Blood Eclipse)
  assert.equal(CHAMBERS[7].backgroundUrl, GAME_ASSETS.chambers.bossSanctumPhase1);
  assert.equal(CHAMBERS[7].videoUrl, '/videos/Animate_mythological_game_enviro_f7acefd6_1080p.mp4');
  assert.equal(CHAMBERS[7].phase2BackgroundUrl, '/arenas/Gemini_Generated_Image_3ay6rk3ay6rk3ay6.png');
  assert.equal(CHAMBERS[7].phase2VideoUrl, '/videos/Furnaces_spewing_flames_and_slag_baeefd93_1080p.mp4');

  // Ensure zero Unicode ellipsis across all arenaVideos
  for (const [k, url] of Object.entries(GAME_ASSETS.arenaVideos)) {
    assert.ok(!url.includes('…'), `arenaVideos.${k} must be clean ASCII without ellipsis`);
  }

  assert.ok(Object.keys(GAME_ASSETS.vfxFlipbooks).length >= 16);
  assert.ok(Object.keys(GAME_ASSETS.conceptPortraits).length >= 15);
});

