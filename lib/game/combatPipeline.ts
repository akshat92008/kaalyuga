// ============================================================================
// KALIYUGA: STAGE D (STEPS 20 & 21) — UNIFIED receiveHit() PIPELINE &
// GOD OF WAR-STYLE CLOSE-RANGE / COMBO STEP 4 PARASHU FINISHERS
// ============================================================================

import { applyPostureDamage, StaffStance } from './rules';

export const HITSTOP_MIN_SEC = 0.03; // 30ms minimum hitstop freeze-frame
export const HITSTOP_MAX_SEC = 0.06; // 60ms maximum hitstop freeze-frame
export const WHITE_HIT_FLASH_SEC = 0.048; // Crisp 1-to-3 frame white hit-flash
export const MAX_CLAMPED_CAMERA_TRAUMA = 0.85; // Clamped trauma ceiling so stacked hits never disorient

export type CombatHitWeight =
  | 'light'
  | 'heavy'
  | 'finisher'
  | 'execute'
  | 'boss_slam'
  | 'boss_strike'
  | 'boss'
  | 'riposte'
  | 'dash_strike'
  | 'projectile'
  | 'hazard';

export interface ReceiveHitTarget {
  hp: number;
  maxHp: number;
  posture?: number;
  maxPosture?: number;
  postureBrokenTimer?: number;
  vx: number;
  vy: number;
  hitFlashTimer: number;
  scaleX?: number;
  scaleY?: number;
  isBoss?: boolean;
  armorCracked?: boolean;
  parryStanceTimer?: number;
  aiState?: 'idle' | 'chase' | 'windup' | 'attack' | 'recover' | 'ko';
  aiTimer?: number;
}

export interface ReceiveHitInput {
  targetKind?: 'enemy' | 'player';
  hpDamage?: number;
  rawDamage?: number;
  postureDamage?: number;
  knockbackAngleRad: number;
  knockbackImpulse?: number;
  knockbackForcePx?: number;
  hitWeight?: CombatHitWeight;
  hitKind?: CombatHitWeight;
  isFinisher?: boolean;
  isCriticalOrBackstab?: boolean;
  isCrit?: boolean;
  isBackstab?: boolean;
  hitstopSec?: number;
  cameraTraumaDelta?: number;
  currentHitstopSec?: number;
  currentCameraTrauma?: number;
  cracksArmor?: boolean;
  cracksBossArmor?: boolean;
  shattersGuard?: boolean;
  postureBreakDurationSec?: number;
  accentSparkColor?: string;
}

export interface DirectionalSpraySpec {
  bloodCount: number;
  sparkCount: number;
  sprayAngleRad: number;
  bloodColor: string;
  sparkColor: string;
  speed: number;
}

export interface ReceiveHitOutput {
  hpLost: number;
  nextHp: number;
  postureLost: number;
  nextPosture: number;
  triggeredPostureBreak: boolean;
  crackedArmorNow: boolean;
  shatteredGuardNow: boolean;
  appliedHitstopSec: number;
  hitstopSec: number;
  nextHitstopSec: number;
  nextCameraTrauma: number;
  clampedCameraTrauma: number;
  hitFlashSec: number;
  whiteHitFlashSec: number;
  impulseVx: number;
  impulseVy: number;
  spraySpec: DirectionalSpraySpec;
  spray: DirectionalSpraySpec;
}

const DEFAULT_HITSTOP_BY_WEIGHT: Record<CombatHitWeight, number> = {
  light: 0.032,
  dash_strike: 0.042,
  riposte: 0.05,
  heavy: 0.052,
  finisher: 0.056,
  execute: 0.06,
  boss_slam: 0.058,
  boss_strike: 0.056,
  boss: 0.055,
  projectile: 0.034,
  hazard: 0.03,
};

const DEFAULT_TRAUMA_BY_WEIGHT: Record<CombatHitWeight, number> = {
  light: 0.14,
  dash_strike: 0.28,
  riposte: 0.36,
  heavy: 0.38,
  finisher: 0.44,
  execute: 0.58,
  boss_slam: 0.52,
  boss_strike: 0.48,
  boss: 0.48,
  projectile: 0.22,
  hazard: 0.24,
};

/**
 * Centralizes all combat damage resolution across Rudra, Enemies, and Bosses:
 * 1. HP loss & Guard/Armor shatter
 * 2. Posture damage & stagger state transition
 * 3. Clamped 30–60ms hitstop (freeze-frame)
 * 4. Directional knockback impulse (with isometric Y foreshortening & boss resistance)
 * 5. Crisp white 1-frame hit-flash
 * 6. Directional blood & bronze spark spray parameters
 * 7. Clamped trauma camera shake ([0, 0.85])
 */
export function receiveHit(
  target: ReceiveHitTarget,
  input: ReceiveHitInput
): ReceiveHitOutput {
  const effectiveWeight: CombatHitWeight =
    input.hitWeight ||
    input.hitKind ||
    (input.isFinisher ? 'finisher' : 'light');
  const effectiveTargetKind: 'enemy' | 'player' =
    input.targetKind || (typeof target.posture === 'number' ? 'enemy' : 'player');

  const rawHpDamage = Math.max(
    0,
    Math.round(input.hpDamage ?? input.rawDamage ?? 0)
  );
  const prevHp = Math.max(0, target.hp);
  const nextHp = Math.max(0, prevHp - rawHpDamage);
  const hpLost = prevHp - nextHp;
  target.hp = nextHp;

  // Armor crack & Guard shatter
  let crackedArmorNow = false;
  if ((input.cracksArmor || input.cracksBossArmor) && !target.armorCracked) {
    target.armorCracked = true;
    crackedArmorNow = true;
  }

  let shatteredGuardNow = false;
  if (input.shattersGuard && (target.parryStanceTimer ?? 0) > 0) {
    target.parryStanceTimer = 0;
    shatteredGuardNow = true;
  }

  // Posture / Armor Stagger bar resolution for enemy targets
  let postureLost = 0;
  let nextPosture = target.posture ?? 0;
  let triggeredPostureBreak = false;

  if (
    effectiveTargetKind === 'enemy' &&
    typeof target.posture === 'number' &&
    typeof target.maxPosture === 'number'
  ) {
    const rawPosDmg = Math.max(0, Math.round(input.postureDamage ?? 0));
    const effectivePosDmg = shatteredGuardNow ? Math.round(rawPosDmg * 1.4) : rawPosDmg;
    const prevPosture = target.posture;
    const posRes = applyPostureDamage({
      currentPosture: prevPosture,
      maxPosture: target.maxPosture,
      postureDamage: effectivePosDmg,
      alreadyBroken: (target.postureBrokenTimer ?? 0) > 0,
    });
    nextPosture = posRes.nextPosture;
    postureLost = Math.max(0, prevPosture - nextPosture);
    triggeredPostureBreak = posRes.triggeredBreak;
    target.posture = nextPosture;

    if (triggeredPostureBreak) {
      const breakDur = input.postureBreakDurationSec ?? (target.isBoss ? 4.2 : 4.0);
      target.postureBrokenTimer = breakDur;
      target.aiState = 'recover';
      target.aiTimer = breakDur;
      target.parryStanceTimer = 0;
    }
  }

  // White 1-frame hit-flash & subtle impact squash/stretch
  target.hitFlashTimer = Math.max(target.hitFlashTimer || 0, WHITE_HIT_FLASH_SEC);
  if (
    effectiveWeight === 'heavy' ||
    effectiveWeight === 'finisher' ||
    effectiveWeight === 'execute'
  ) {
    target.scaleX = 1.12;
    target.scaleY = 0.88;
  } else {
    target.scaleX = 1.05;
    target.scaleY = 0.95;
  }

  // Directional knockback impulse (scaled for bosses so they don't slide across the room on light hits)
  const bossResist = target.isBoss
    ? effectiveWeight === 'heavy' ||
      effectiveWeight === 'finisher' ||
      effectiveWeight === 'execute'
      ? 0.42
      : 0.25
    : 0.88;
  const rawImpulse = input.knockbackImpulse ?? input.knockbackForcePx ?? 0;
  const effectiveImpulse =
    Math.max(0, rawImpulse) * (effectiveTargetKind === 'enemy' ? bossResist : 1.0);
  const impulseVx = Number(
    (Math.cos(input.knockbackAngleRad) * effectiveImpulse).toFixed(2)
  );
  const impulseVy = Number(
    (Math.sin(input.knockbackAngleRad) * effectiveImpulse * 0.74).toFixed(2)
  );
  target.vx += impulseVx;
  target.vy += impulseVy;

  // Clamped 30–60ms hitstop freeze-frame
  const requestedHitstop =
    input.hitstopSec ?? DEFAULT_HITSTOP_BY_WEIGHT[effectiveWeight];
  const appliedHitstopSec =
    hpLost > 0 || postureLost > 0
      ? Number(
          Math.max(
            HITSTOP_MIN_SEC,
            Math.min(HITSTOP_MAX_SEC, requestedHitstop)
          ).toFixed(3)
        )
      : 0;
  const nextHitstopSec = Number(
    Math.max(input.currentHitstopSec || 0, appliedHitstopSec).toFixed(3)
  );

  // Clamped camera shake trauma
  const traumaAdd =
    input.cameraTraumaDelta ?? DEFAULT_TRAUMA_BY_WEIGHT[effectiveWeight];
  const nextCameraTrauma = Number(
    Math.max(
      0,
      Math.min(
        MAX_CLAMPED_CAMERA_TRAUMA,
        (input.currentCameraTrauma || 0) + traumaAdd
      )
    ).toFixed(3)
  );

  // Directional blood + spark spray specification
  const isHeavyClass =
    effectiveWeight === 'heavy' ||
    effectiveWeight === 'finisher' ||
    effectiveWeight === 'execute' ||
    effectiveWeight === 'boss_slam' ||
    effectiveWeight === 'boss';
  const spraySpec: DirectionalSpraySpec = {
    bloodCount: effectiveWeight === 'execute' ? 18 : isHeavyClass ? 12 : 5,
    sparkCount: effectiveWeight === 'execute' ? 16 : isHeavyClass ? 10 : 6,
    sprayAngleRad: input.knockbackAngleRad,
    bloodColor: '#ff2a3c',
    sparkColor:
      input.accentSparkColor ||
      (input.isCriticalOrBackstab ? '#ff6a2b' : '#ffd86b'),
    speed: effectiveWeight === 'execute' ? 235 : isHeavyClass ? 195 : 155,
  };

  return {
    hpLost,
    nextHp,
    postureLost,
    nextPosture,
    triggeredPostureBreak,
    crackedArmorNow,
    shatteredGuardNow,
    appliedHitstopSec,
    hitstopSec: appliedHitstopSec,
    nextHitstopSec,
    nextCameraTrauma,
    clampedCameraTrauma: nextCameraTrauma,
    hitFlashSec: WHITE_HIT_FLASH_SEC,
    whiteHitFlashSec: WHITE_HIT_FLASH_SEC,
    impulseVx,
    impulseVy,
    spraySpec,
    spray: spraySpec,
  };
}

// ============================================================================
// STEP 21: GOD OF WAR-STYLE CLOSE-RANGE & COMBO FINISHERS
// Context-sensitive close-range heavy slam / staggered-enemy execution variants
// mapped to Rudra's 3 Parashu FBX clips:
// - 'downward_crush' -> 'heavy'   (standing melee attack downward.fbx)
// - 'spin_360_cleave' -> 'cast'   (standing melee attack 360 high.fbx)
// - 'impaling_lunge'  -> 'attack3' (standing melee combo attack ver. 3.fbx)
// ============================================================================

export type ParashuFinisherVariant =
  | 'downward_crush'
  | 'spin_360_cleave'
  | 'impaling_lunge';

export interface ParashuFinisherSpec {
  variant: ParashuFinisherVariant;
  rudraAnimState: 'heavy' | 'cast' | 'attack3';
  calloutTitle: string;
  calloutSubtitle: string;
  title: string;
  subtitle: string;
  accentColor: string;
  durationSec: number;
  damageMultiplier: number;
  postureMultiplier: number;
  cleaveRadiusPx: number;
  lungeImpulsePx: number;
  forwardLungePx: number;
  knockbackForcePx: number;
  is360Spin: boolean;
  cracksArmor: boolean;
  hitstopSec: number;
  cameraTrauma: number;
}

export interface SelectParashuFinisherInput {
  comboStep: number;
  stance: StaffStance;
  isExecution?: boolean;
  isExecuteAction?: boolean;
  targetDistPx?: number;
  distancePx?: number;
  nearbyEnemiesCount?: number;
  nearbyEnemyCount?: number;
  targetIsStaggered?: boolean;
  isTargetStaggered?: boolean;
  isTargetBoss?: boolean;
}

/**
 * Selects a brutal, context-sensitive God of War-style Parashu finisher variant
 * on `comboStep === 4` or when executing/finishing a staggered target at close range.
 */
export function selectParashuFinisherVariant(
  input: SelectParashuFinisherInput
): ParashuFinisherSpec {
  const isExecution = Boolean(input.isExecution ?? input.isExecuteAction);
  const targetIsStaggered = Boolean(
    input.targetIsStaggered ?? input.isTargetStaggered
  );
  const nearbyCount = input.nearbyEnemiesCount ?? input.nearbyEnemyCount ?? 1;
  const distPx = input.targetDistPx ?? input.distancePx ?? 48;

  // 1. Crowd surrounded (>= 2 nearby enemies) or Pillar stance -> 360° Decapitation Whirlwind
  if (nearbyCount >= 2 || input.stance === 'pillar') {
    const title =
      isExecution || targetIsStaggered
        ? 'SUDARSHANA 360° EXECUTION!'
        : 'SUDARSHANA 360° FINISHER!';
    const subtitle = '360° PARASHU WHIRLWIND CLEAVE';
    return {
      variant: 'spin_360_cleave',
      rudraAnimState: 'cast', // Maps to 'standing melee attack 360 high.fbx'
      calloutTitle: title,
      calloutSubtitle: subtitle,
      title,
      subtitle,
      accentColor: '#ff7a33',
      durationSec: 0.48,
      damageMultiplier: isExecution ? 2.45 : targetIsStaggered ? 1.65 : 1.28,
      postureMultiplier: 1.45,
      cleaveRadiusPx: 148,
      lungeImpulsePx: 64,
      forwardLungePx: 64,
      knockbackForcePx: 145,
      is360Spin: true,
      cracksArmor: false,
      hitstopSec: 0.056,
      cameraTrauma: 0.46,
    };
  }

  // 2. Medium-range gap-closer (> 95px) or Thrust stance -> Brahmashira Impaling Lunge
  if (distPx > 95 || input.stance === 'thrust') {
    const title =
      isExecution || targetIsStaggered
        ? 'BRAHMASHIRA IMPALING EXECUTE!'
        : 'BRAHMASHIRA LUNGE FINISHER!';
    const subtitle = 'ARMOR-PIERCING PARASHU THRUST';
    return {
      variant: 'impaling_lunge',
      rudraAnimState: 'attack3', // Maps to 'standing melee combo attack ver. 3.fbx'
      calloutTitle: title,
      calloutSubtitle: subtitle,
      title,
      subtitle,
      accentColor: '#3ee0a8',
      durationSec: 0.46,
      damageMultiplier: isExecution ? 2.55 : targetIsStaggered ? 1.72 : 1.32,
      postureMultiplier: 1.5,
      cleaveRadiusPx: 128,
      lungeImpulsePx: 124,
      forwardLungePx: 124,
      knockbackForcePx: 155,
      is360Spin: false,
      cracksArmor: true,
      hitstopSec: 0.058,
      cameraTrauma: 0.48,
    };
  }

  // 3. Close-range (< 95px) or Smash stance -> Parashu Skull-Splitter Downward Crush
  const title =
    isExecution || targetIsStaggered
      ? 'PARASHU SKULL-SPLITTER EXECUTE!'
      : 'PARASHU DOWNWARD CRUSH!';
  const subtitle = 'CLOSE-RANGE OVERHEAD GUILLOTINE SLAM';
  return {
    variant: 'downward_crush',
    rudraAnimState: 'heavy', // Maps to 'standing melee attack downward.fbx'
    calloutTitle: title,
    calloutSubtitle: subtitle,
    title,
    subtitle,
    accentColor: '#ff3848',
    durationSec: 0.5,
    damageMultiplier: isExecution ? 2.65 : targetIsStaggered ? 1.8 : 1.38,
    postureMultiplier: 1.6,
    cleaveRadiusPx: 136,
    lungeImpulsePx: 78,
    forwardLungePx: 78,
    knockbackForcePx: 165,
    is360Spin: false,
    cracksArmor: true,
    hitstopSec: 0.06,
    cameraTrauma: 0.54,
  };
}
