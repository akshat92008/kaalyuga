// ============================================================================
// KALIYUGA: THE BLEEDING CROWN — AAA PC Modern Combat Engine
// Combines mechanics from:
// 1. God of War (Golden Glint Parry, Shield-Shatter Posture Break, Vajra Riposte)
// 2. Black Myth: Wukong (See-Through Resolute Counter mid-combo, 3-Stance Flow)
// 3. Prince of Persia (Kala-Rewind Temporal State Buffer & Chrono-Slow Rift)
// 4. Assassin's Creed (Shadow Prana Blink Backstab & Chain-Assassination Reset)
// 5. Hades / Devil May Cry (Dynamic Style Rank Meter D -> C -> B -> A -> S -> SSS)
// ============================================================================

export type ParryOutcomeTier = 'perfect_golden' | 'standard_guard' | 'whiff';

export interface ParryEvaluationInput {
  parryElapsedSec: number;
  incomingDamage: number;
  attackerMaxPosture: number;
  isUnblockableCrimsonAttack: boolean;
}

export interface ParryEvaluationResult {
  tier: ParryOutcomeTier;
  damageTaken: number;
  postureDamageDealt: number;
  grantsRiposteWindow: boolean;
  riposteWindowDurationSec: number;
  focusOrbsGranted: number;
  healAmount: number;
  hitstopSec: number;
  calloutTitle: string;
  calloutSubtitle: string;
}

export const PERFECT_PARRY_WINDOW_SEC = 0.26;
export const STANDARD_GUARD_WINDOW_SEC = 0.62;

export function evaluateParryImpact(input: ParryEvaluationInput): ParryEvaluationResult {
  if (input.isUnblockableCrimsonAttack) {
    // Crimson Rune attacks must be dodged or Kala-Rewound; parrying only softens 35%
    return {
      tier: 'whiff',
      damageTaken: Math.max(1, Math.round(input.incomingDamage * 0.65)),
      postureDamageDealt: 10,
      grantsRiposteWindow: false,
      riposteWindowDurationSec: 0,
      focusOrbsGranted: 0,
      healAmount: 0,
      hitstopSec: 0.03,
      calloutTitle: 'CRIMSON SLAM · GUARD CRUSHED!',
      calloutSubtitle: 'DODGE [SPACE] OR REWIND [T] UNBLOCKABLE ATTACKS',
    };
  }

  if (input.parryElapsedSec <= PERFECT_PARRY_WINDOW_SEC) {
    return {
      tier: 'perfect_golden',
      damageTaken: 0,
      postureDamageDealt: Math.max(48, Math.round(input.attackerMaxPosture * 0.65)),
      grantsRiposteWindow: true,
      riposteWindowDurationSec: 2.2,
      focusOrbsGranted: 1,
      healAmount: 14,
      hitstopSec: 0.095,
      calloutTitle: 'PERFECT VAJRA PARRY!',
      calloutSubtitle: 'PRESS [LMB / J] OR [RMB / K] FOR LETHAL RIPOSTE COUNTER (2.65× DMG)',
    };
  }

  if (input.parryElapsedSec <= STANDARD_GUARD_WINDOW_SEC) {
    return {
      tier: 'standard_guard',
      damageTaken: Math.max(0, Math.round(input.incomingDamage * 0.15)),
      postureDamageDealt: Math.max(22, Math.round(input.attackerMaxPosture * 0.25)),
      grantsRiposteWindow: false,
      riposteWindowDurationSec: 0.8,
      focusOrbsGranted: 0,
      healAmount: 0,
      hitstopSec: 0.045,
      calloutTitle: 'KALARIPAYATTU IRON GUARD',
      calloutSubtitle: '85% DAMAGE DEFLECTED',
    };
  }

  return {
    tier: 'whiff',
    damageTaken: input.incomingDamage,
    postureDamageDealt: 0,
    grantsRiposteWindow: false,
    riposteWindowDurationSec: 0,
    focusOrbsGranted: 0,
    healAmount: 0,
    hitstopSec: 0,
    calloutTitle: 'GUARD BROKEN',
    calloutSubtitle: '',
  };
}

// ----------------------------------------------------------------------------
// Hades-Grade Dash Timing, Explicit Startup/Active/Recovery Phases & 120ms Buffer
// ----------------------------------------------------------------------------

export const DASH_DURATION_SEC = 0.16; // 160ms crisp dash distance window
export const DASH_IFRAME_SEC = 0.13; // 130ms strict invulnerability window
export const DASH_STAMINA_COST = 25;
export const INPUT_BUFFER_WINDOW_SEC = 0.12; // 120ms recovery input buffer

export type CombatActionKind =
  | 'idle'
  | 'light_attack'
  | 'heavy_unleash'
  | 'dodge'
  | 'parry'
  | 'astra'
  | 'execute'
  | 'gourd';

export type ActionFramePhase = 'idle' | 'startup' | 'active' | 'recovery';

export interface ActionFramePhaseInfo {
  phase: ActionFramePhase;
  elapsedSec: number;
  remainingSec: number;
  normalizedProgress: number;
  canBufferNext: boolean;
  canChainImmediately: boolean;
  canDashCancel: boolean;
}

/**
 * Splits Rudra's combat actions into explicit Startup -> Active -> Recovery frame phases
 * and evaluates whether the current frame is inside the final 120ms input buffer window
 * or eligible for instant Zagreus-style Dash cancel.
 */
export function computeActionFramePhase(
  action: CombatActionKind,
  remainingSec: number,
  totalDurationSec: number
): ActionFramePhaseInfo {
  if (action === 'idle' || totalDurationSec <= 0 || remainingSec <= 0) {
    return {
      phase: 'idle',
      elapsedSec: 0,
      remainingSec: 0,
      normalizedProgress: 1,
      canBufferNext: true,
      canChainImmediately: true,
      canDashCancel: true,
    };
  }

  const clampedRem = Math.max(0, Math.min(totalDurationSec, remainingSec));
  const elapsedSec = Math.max(0, totalDurationSec - clampedRem);
  const normalizedProgress = Math.max(0, Math.min(1, elapsedSec / totalDurationSec));

  // Frame phase ratios tailored per action type
  let startupEndRatio = 0.22;
  let activeEndRatio = 0.68;
  if (action === 'heavy_unleash') {
    startupEndRatio = 0.26;
    activeEndRatio = 0.70;
  } else if (action === 'parry') {
    startupEndRatio = 0.08;
    activeEndRatio = 0.58;
  } else if (action === 'astra') {
    startupEndRatio = 0.20;
    activeEndRatio = 0.65;
  } else if (action === 'dodge') {
    startupEndRatio = 0.15;
    activeEndRatio = 0.8125; // 130ms / 160ms = 0.8125 active i-frame ratio
  }

  const phase: ActionFramePhase =
    normalizedProgress < startupEndRatio
      ? 'startup'
      : normalizedProgress < activeEndRatio
      ? 'active'
      : 'recovery';

  // Any input pressed within the final 120ms of an action (or during recovery) buffers & chains seamlessly
  const inBufferWindow = clampedRem <= INPUT_BUFFER_WINDOW_SEC || phase === 'recovery';
  const canChainImmediately = clampedRem <= 0.035;
  // Dash cancels startup or recovery (and active frames of light/heavy/parry/astra) immediately like Zagreus
  const canDashCancel =
    action === 'light_attack' ||
    action === 'heavy_unleash' ||
    action === 'parry' ||
    action === 'astra';

  return {
    phase,
    elapsedSec: Number(elapsedSec.toFixed(4)),
    remainingSec: Number(clampedRem.toFixed(4)),
    normalizedProgress: Number(normalizedProgress.toFixed(4)),
    canBufferNext: inBufferWindow,
    canChainImmediately,
    canDashCancel,
  };
}

// ----------------------------------------------------------------------------
// Deterministic Telegraph-Backed Iron Guard State (Replaces Per-Frame RNG)
// ----------------------------------------------------------------------------

export const IRON_GUARD_WINDUP_SEC = 0.22;
export const IRON_GUARD_ACTIVE_BOSS_SEC = 1.1;
export const IRON_GUARD_ACTIVE_ELITE_SEC = 0.9;
export const IRON_GUARD_COOLDOWN_BOSS_SEC = 5.5;
export const IRON_GUARD_COOLDOWN_ELITE_SEC = 6.5;

export interface IronGuardStepInput {
  canGuard: boolean;
  isBoss: boolean;
  aiState: string;
  distToPlayer: number;
  playerAttacking: boolean;
  postureBroken: boolean;
  immobilized: boolean;
  parryStanceTimer: number;
  ironGuardWindupTimer: number;
  ironGuardCd: number;
  dt: number;
}

export interface IronGuardStepResult {
  parryStanceTimer: number;
  ironGuardWindupTimer: number;
  ironGuardCd: number;
  startedWindup: boolean;
  activatedGuard: boolean;
}

/**
 * Advances an enemy's Iron Guard state machine deterministically with zero per-frame RNG:
 * - Requires `ironGuardCd <= 0` and player attacking within 170px while enemy is in chase/idle.
 * - Enters a visible 220ms golden shield windup (`startedWindup = true`) and locks cooldown (5.5s–6.5s).
 * - When the windup completes, activates `parryStanceTimer` (`activatedGuard = true`).
 */
export function stepEnemyIronGuardState(input: IronGuardStepInput): IronGuardStepResult {
  let parryStanceTimer = Math.max(0, input.parryStanceTimer - input.dt);
  let ironGuardWindupTimer = Math.max(0, input.ironGuardWindupTimer);
  let ironGuardCd = Math.max(0, input.ironGuardCd - input.dt);
  let startedWindup = false;
  let activatedGuard = false;

  if (input.postureBroken || input.immobilized || input.aiState === 'ko') {
    return {
      parryStanceTimer: 0,
      ironGuardWindupTimer: 0,
      ironGuardCd,
      startedWindup: false,
      activatedGuard: false,
    };
  }

  if (ironGuardWindupTimer > 0) {
    ironGuardWindupTimer = Math.max(0, ironGuardWindupTimer - input.dt);
    if (ironGuardWindupTimer <= 0) {
      parryStanceTimer = input.isBoss ? IRON_GUARD_ACTIVE_BOSS_SEC : IRON_GUARD_ACTIVE_ELITE_SEC;
      activatedGuard = true;
    }
    return {
      parryStanceTimer,
      ironGuardWindupTimer,
      ironGuardCd,
      startedWindup,
      activatedGuard,
    };
  }

  if (
    input.canGuard &&
    parryStanceTimer <= 0 &&
    ironGuardCd <= 0 &&
    (input.aiState === 'chase' || input.aiState === 'idle') &&
    input.playerAttacking &&
    input.distToPlayer < 170
  ) {
    ironGuardWindupTimer = IRON_GUARD_WINDUP_SEC;
    ironGuardCd = input.isBoss ? IRON_GUARD_COOLDOWN_BOSS_SEC : IRON_GUARD_COOLDOWN_ELITE_SEC;
    startedWindup = true;
  }

  return {
    parryStanceTimer,
    ironGuardWindupTimer,
    ironGuardCd,
    startedWindup,
    activatedGuard,
  };
}

// ----------------------------------------------------------------------------
// Black Myth: Wukong — "See-Through" Resolute Strike Evaluation
// ----------------------------------------------------------------------------

export interface SeeThroughCounterInput {
  playerInLightCombo: boolean;
  nearbyEnemyWindingUp: boolean;
  focusOrbs: number;
  riposteWindowActive: boolean;
}

export interface SeeThroughCounterResult {
  triggeredSeeThrough: boolean;
  triggeredRiposteBurst: boolean;
  damageMultiplier: number;
  postureDamageBonus: number;
  invulnDurationSec: number;
  refundsFocusOrb: boolean;
  calloutTitle: string;
}

export function evaluateSeeThroughOrRiposte(
  input: SeeThroughCounterInput
): SeeThroughCounterResult {
  if (input.riposteWindowActive) {
    return {
      triggeredSeeThrough: false,
      triggeredRiposteBurst: true,
      damageMultiplier: 2.65,
      postureDamageBonus: 65,
      invulnDurationSec: 0.85,
      refundsFocusOrb: true,
      calloutTitle: 'GOD OF WAR · VAJRA RIPOSTE CLEAVE!',
    };
  }

  if (input.playerInLightCombo && input.nearbyEnemyWindingUp) {
    return {
      triggeredSeeThrough: true,
      triggeredRiposteBurst: false,
      damageMultiplier: 2.15,
      postureDamageBonus: 48,
      invulnDurationSec: 0.72,
      refundsFocusOrb: true,
      calloutTitle: 'DRISHTI SEE-THROUGH COUNTER!',
    };
  }

  return {
    triggeredSeeThrough: false,
    triggeredRiposteBurst: false,
    damageMultiplier: 1.0,
    postureDamageBonus: 0,
    invulnDurationSec: 0.35,
    refundsFocusOrb: false,
    calloutTitle: '',
  };
}

// ----------------------------------------------------------------------------
// Prince of Persia — Sands of Time Temporal Rewind Buffer (`Kala-Rewind [T]`)
// ----------------------------------------------------------------------------

export interface TemporalSnapshot {
  timestampSec: number;
  x: number;
  y: number;
  hp: number;
}

export function pushTemporalSnapshot(
  buffer: TemporalSnapshot[],
  snapshot: TemporalSnapshot,
  maxWindowSec = 3.0
): TemporalSnapshot[] {
  const cutoff = snapshot.timestampSec - maxWindowSec;
  const filtered = buffer.filter((s) => s.timestampSec >= cutoff);
  filtered.push(snapshot);
  return filtered;
}

export interface KalaRewindResult {
  canRewind: boolean;
  targetX: number;
  targetY: number;
  restoredHp: number;
  hpRecoveredDelta: number;
  chronoSlowRadiusPx: number;
  chronoSlowDurationSec: number;
}

export function computeKalaRewindState(
  buffer: TemporalSnapshot[],
  currentX: number,
  currentY: number,
  currentHp: number,
  maxHp: number
): KalaRewindResult {
  if (buffer.length === 0) {
    const fallbackHeal = Math.min(maxHp, currentHp + 35);
    return {
      canRewind: true,
      targetX: currentX,
      targetY: currentY,
      restoredHp: fallbackHeal,
      hpRecoveredDelta: fallbackHeal - currentHp,
      chronoSlowRadiusPx: 260,
      chronoSlowDurationSec: 3.5,
    };
  }

  const oldest = buffer[0];
  // Restore to the highest HP recorded in the temporal window (or at least +30 HP recovery)
  const peakRecordedHp = buffer.reduce((best, snap) => Math.max(best, snap.hp), currentHp);
  const restoredHp = Math.min(maxHp, Math.max(peakRecordedHp, currentHp + 30));

  return {
    canRewind: true,
    targetX: oldest.x,
    targetY: oldest.y,
    restoredHp,
    hpRecoveredDelta: Math.max(0, restoredHp - currentHp),
    chronoSlowRadiusPx: 260,
    chronoSlowDurationSec: 3.5,
  };
}

// ----------------------------------------------------------------------------
// Assassin's Creed — Shadow Prana Blink & Chain Assassination (`[V]`)
// ----------------------------------------------------------------------------

export interface AssassinationCandidate {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  posture: number;
  maxPosture: number;
  facing: 1 | -1;
  isBoss: boolean;
  postureBroken: boolean;
}

export interface ShadowAssassinationPlan {
  targetId: number | null;
  blinkX: number;
  blinkY: number;
  newFacing: 1 | -1;
  damage: number;
  postureDamage: number;
  isLethalExecute: boolean;
  resetsCooldownOnKillOrBreak: boolean;
}

export function planShadowAssassination(
  playerX: number,
  playerY: number,
  baseDamage: number,
  candidates: AssassinationCandidate[]
): ShadowAssassinationPlan {
  if (candidates.length === 0) {
    return {
      targetId: null,
      blinkX: playerX,
      blinkY: playerY,
      newFacing: 1,
      damage: 0,
      postureDamage: 0,
      isLethalExecute: false,
      resetsCooldownOnKillOrBreak: false,
    };
  }

  // Prioritize posture-broken targets first, then low-HP targets, then nearest within 520px
  const scored = candidates.map((c) => {
    const dist = Math.hypot(c.x - playerX, c.y - playerY);
    const brokenBonus = c.postureBroken ? -1000 : 0;
    const lowHpBonus = c.hp <= baseDamage * 2.6 ? -450 : 0;
    return { c, score: dist + brokenBonus + lowHpBonus };
  });
  scored.sort((a, b) => a.score - b.score);
  const target = scored[0].c;

  // Blink directly behind the target's facing direction for a true Assassin's Creed backstab
  const behindOffset = -target.facing * 42;
  const blinkX = target.x + behindOffset;
  const blinkY = target.y + 4;
  const newFacing: 1 | -1 = target.facing;

  const mult = target.postureBroken ? 3.2 : target.isBoss ? 2.25 : 2.75;
  const damage = Math.round(baseDamage * mult);
  const postureDamage = target.isBoss ? 58 : 75;
  const willKill = target.hp <= damage;
  const willBreak = target.posture <= postureDamage;

  return {
    targetId: target.id,
    blinkX,
    blinkY,
    newFacing,
    damage,
    postureDamage,
    isLethalExecute: willKill,
    resetsCooldownOnKillOrBreak: willKill || willBreak,
  };
}

// ----------------------------------------------------------------------------
// Hades / Devil May Cry — Dynamic Combat Style Rank System
// ----------------------------------------------------------------------------

export type CombatStyleGrade = 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

export interface CombatStyleStatus {
  grade: CombatStyleGrade;
  title: string;
  color: string;
  damageBonusMultiplier: number;
  karmaBonusMultiplier: number;
  nextThresholdProgress: number;
}

export function computeCombatStyleStatus(stylePoints: number): CombatStyleStatus {
  const pts = Math.max(0, stylePoints);
  if (pts >= 900) {
    return {
      grade: 'SSS',
      title: 'KALIYUGA SOVEREIGN',
      color: '#ff3b30',
      damageBonusMultiplier: 1.45,
      karmaBonusMultiplier: 1.5,
      nextThresholdProgress: 1,
    };
  }
  if (pts >= 650) {
    return {
      grade: 'SS',
      title: 'BRAHMASHIRA WRATH',
      color: '#ff6a2b',
      damageBonusMultiplier: 1.32,
      karmaBonusMultiplier: 1.35,
      nextThresholdProgress: (pts - 650) / 250,
    };
  }
  if (pts >= 420) {
    return {
      grade: 'S',
      title: 'VAJRA IMMORTAL',
      color: '#ffd86b',
      damageBonusMultiplier: 1.22,
      karmaBonusMultiplier: 1.25,
      nextThresholdProgress: (pts - 420) / 230,
    };
  }
  if (pts >= 250) {
    return {
      grade: 'A',
      title: 'KURUKSHETRA VANGUARD',
      color: '#3ee0a8',
      damageBonusMultiplier: 1.14,
      karmaBonusMultiplier: 1.15,
      nextThresholdProgress: (pts - 250) / 170,
    };
  }
  if (pts >= 130) {
    return {
      grade: 'B',
      title: 'AGNI STRIKER',
      color: '#38bdf8',
      damageBonusMultiplier: 1.08,
      karmaBonusMultiplier: 1.08,
      nextThresholdProgress: (pts - 130) / 120,
    };
  }
  if (pts >= 50) {
    return {
      grade: 'C',
      title: 'ASHEN WARRIOR',
      color: '#d8ccb8',
      damageBonusMultiplier: 1.04,
      karmaBonusMultiplier: 1.04,
      nextThresholdProgress: (pts - 50) / 80,
    };
  }
  return {
    grade: 'D',
    title: 'INITIATE',
    color: '#8f8473',
    damageBonusMultiplier: 1.0,
    karmaBonusMultiplier: 1.0,
    nextThresholdProgress: pts / 50,
  };
}
