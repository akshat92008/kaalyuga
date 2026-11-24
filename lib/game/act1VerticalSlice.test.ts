import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_SHRINE_RANKS,
  STANCE_CONFIGS,
  calculateLightHitDamage,
  calculateStanceHeavyDamage,
} from './rules';
import {
  CHAMBER_BIOME_PROFILES,
  DEVANAGARI_STAMP_CATALOG,
  KALA_BHAIRAVA_DAMAGE_MULT,
  computeNormalizedAttackProgress,
  computeSavitriLanternHudState,
  createDevanagariStamp,
  getChamberBiomeProfile,
} from './kalaBhairavaSusanoo';
import { resolveRudraAnimStateAndClock } from './rudra3dRenderer';

test('Heavy Attack rebalance: 0-orb Heavy hits significantly harder than a Light combo hit', () => {
  const light1 = calculateLightHitDamage({
    comboStep: 1,
    weapon: 'parashu',
    ranks: INITIAL_SHRINE_RANKS,
  });
  const heavy0 = calculateStanceHeavyDamage({
    stance: 'smash',
    focusOrbsConsumed: 0,
    weapon: 'parashu',
    ranks: INITIAL_SHRINE_RANKS,
  });
  const heavy1 = calculateStanceHeavyDamage({
    stance: 'smash',
    focusOrbsConsumed: 1,
    weapon: 'parashu',
    ranks: INITIAL_SHRINE_RANKS,
  });
  const heavy3 = calculateStanceHeavyDamage({
    stance: 'smash',
    focusOrbsConsumed: 3,
    weapon: 'parashu',
    ranks: INITIAL_SHRINE_RANKS,
  });

  // Uncharged heavy must feel meaty (>= 4x a single light hit)
  assert.ok(
    heavy0.hpDamage >= light1.hpDamage * 4.0,
    `Expected 0-orb heavy (${heavy0.hpDamage}) >= 4x light1 (${light1.hpDamage})`
  );
  // 3-orb heavy must remain strongly scaled (> 1.8x 1-orb heavy)
  assert.ok(heavy3.hpDamage > heavy1.hpDamage * 1.8);
  assert.equal(heavy3.healAmount, 42);
  assert.ok(STANCE_CONFIGS.smash.heavyDamageBase >= 104);
});

test('Normalized attack progress never freezes early at 0.19s for longer swings', () => {
  const dur = 0.44;
  const atStart = computeNormalizedAttackProgress('heavy_unleash', 0.44, dur, 0);
  const atMid = computeNormalizedAttackProgress('heavy_unleash', 0.22, dur, 0);
  const atEnd = computeNormalizedAttackProgress('heavy_unleash', 0.01, dur, 0);

  assert.equal(atStart, 0);
  assert.ok(Math.abs(atMid - 0.5) < 0.02, `Expected ~0.5 mid-swing, got ${atMid}`);
  assert.ok(atEnd > 0.95 && atEnd <= 0.99);
});

test('Rudra combo spam advances distinct attack1/attack2/attack3 states cleanly', () => {
  const baseInput = {
    dt: 0.016,
    vx: 0,
    vy: 0,
    facingX: 1,
    facingY: 0,
    slashAngle: 0,
    isAttacking: true,
    isHeavyAttack: false,
    attackProgress: 0.35,
    isDodging: false,
    isParrying: false,
    isCasting: false,
    isHealing: false,
    isHurt: false,
    isDefeated: false,
    stance: 'smash',
    focusOrbs: 1,
    elevationY: 0,
  };

  const s1 = resolveRudraAnimStateAndClock({ ...baseInput, comboStep: 1 }, 0.05, 1.0);
  const s2 = resolveRudraAnimStateAndClock({ ...baseInput, comboStep: 2 }, 0.05, 1.1);
  const s3 = resolveRudraAnimStateAndClock({ ...baseInput, comboStep: 3 }, 0.05, 1.2);

  assert.equal(s1.state, 'attack1');
  assert.equal(s2.state, 'attack2');
  assert.equal(s3.state, 'attack3');
  assert.equal(s1.usesNormalizedProgress, true);
});

test('Kala-Bhairava Susanoo dims Savitri Lantern while active and leaves ember scar after uses', () => {
  const pristine = computeSavitriLanternHudState(0, false);
  const activeRage = computeSavitriLanternHudState(1, true);
  const afterOneUse = computeSavitriLanternHudState(1, false);
  const afterManyUses = computeSavitriLanternHudState(4, false);

  assert.equal(pristine.isEclipsedByRage, false);
  assert.equal(pristine.intensity, 1.0);

  assert.equal(activeRage.isEclipsedByRage, true);
  assert.ok(activeRage.intensity < 0.3);
  assert.ok(activeRage.label.includes('रौद्र'));

  assert.ok(afterOneUse.intensity < pristine.intensity);
  assert.ok(afterManyUses.intensity < afterOneUse.intensity);
  assert.ok(KALA_BHAIRAVA_DAMAGE_MULT >= 1.45);
});

test('Devanagari combat stamps provide distinct canonical Sanskrit glyphs', () => {
  const rageStamp = createDevanagariStamp('rage', 100, 200);
  const heavyStamp = createDevanagariStamp('heavy', 120, 200);
  const breakStamp = createDevanagariStamp('break', 140, 200);
  const dashStamp = createDevanagariStamp('perfect_dash', 160, 200);

  assert.equal(rageStamp.glyph, DEVANAGARI_STAMP_CATALOG.rage.glyph);
  assert.equal(heavyStamp.glyph, 'प्रहार');
  assert.equal(breakStamp.glyph, 'विच्छेद');
  assert.equal(dashStamp.glyph, 'अवहेलना');
  assert.notEqual(rageStamp.id, heavyStamp.id);
});

test('All 8 Act I chambers have distinct biome visual identities and unique rim accents', () => {
  assert.equal(CHAMBER_BIOME_PROFILES.length, 8);
  const keys = new Set(CHAMBER_BIOME_PROFILES.map((p) => p.biomeKey));
  const rimAccents = new Set(CHAMBER_BIOME_PROFILES.map((p) => p.rimAccentHex));
  assert.equal(keys.size, 8);
  assert.equal(rimAccents.size, 8);

  const ch1 = getChamberBiomeProfile(0);
  const ch4 = getChamberBiomeProfile(3);
  const ch8 = getChamberBiomeProfile(7);
  assert.equal(ch1.id, 1);
  assert.equal(ch4.id, 4);
  assert.equal(ch8.id, 8);
  assert.notEqual(ch1.baseCenterHex, ch4.baseCenterHex);
  assert.notEqual(ch4.baseCenterHex, ch8.baseCenterHex);
});
