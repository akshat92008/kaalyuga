// ============================================================================
// PART 1 PURE COMBAT, AI STABILITY, CAMERA & SUSANOO CORE LOGIC
// Decoupled pure functions covered by node:test unit tests.
// ============================================================================

export type Enemy3DAnimStateLike = 'idle' | 'chase' | 'windup' | 'attack' | 'hurt' | 'death';

export interface AtomicEnemyAnimInput {
  aiState: 'idle' | 'chase' | 'windup' | 'attack' | 'recover' | 'ko';
  isHitFlash: boolean;
  isPostureBroken: boolean;
  speed: number;
}

/**
 * Atomic Enemy Animation Commitment:
 * - Brief hit-flash shaders NEVER cancel or restart an active `windup` or `attack` clip.
 * - Only `ko` (death) or `isPostureBroken` (guard shatter stagger) interrupts an attack animation.
 * - Enemies in `recover` return to clean `idle` posture unless moving.
 */
export function resolveAtomicEnemyAnimState(
  input: AtomicEnemyAnimInput
): Enemy3DAnimStateLike {
  if (input.aiState === 'ko') return 'death';
  if (input.isPostureBroken) return 'hurt';
  if (input.aiState === 'attack') return 'attack';
  if (input.aiState === 'windup') return 'windup';
  if (input.isHitFlash && input.aiState !== 'chase') return 'hurt';
  if (input.aiState === 'chase' || input.speed > 12) return 'chase';
  return 'idle';
}

export interface EnemyRecoveryWatchdogInput {
  aiState: 'idle' | 'chase' | 'windup' | 'attack' | 'recover' | 'ko';
  aiTimer: number;
  postureBrokenTimer: number;
  idleFreezeAgeSec: number;
  isBoss: boolean;
  dt: number;
}

export interface EnemyRecoveryWatchdogResult {
  nextAiState: 'idle' | 'chase' | 'windup' | 'attack' | 'recover' | 'ko';
  nextAiTimer: number;
  nextPostureBrokenTimer: number;
  nextIdleFreezeAgeSec: number;
  unfroze: boolean;
}

/**
 * Hard Enemy AI Freeze Watchdog:
 * Guarantees NO enemy or boss can ever stall in `recover`, `idle`, or `postureBroken`
 * for minutes. Strictly caps recovery timers (<= 2.6s regular, <= 3.4s boss) and
 * auto-recovers any stalled enemy back into active `chase`.
 */
export function stepEnemyRecoveryWatchdog(
  input: EnemyRecoveryWatchdogInput
): EnemyRecoveryWatchdogResult {
  if (input.aiState === 'ko') {
    return {
      nextAiState: 'ko',
      nextAiTimer: 0,
      nextPostureBrokenTimer: 0,
      nextIdleFreezeAgeSec: 0,
      unfroze: false,
    };
  }

  const maxRecoverSec = input.isBoss ? 3.4 : 2.6;
  const maxFreezeWatchdogSec = input.isBoss ? 4.0 : 3.2;

  const clampedPosture = Math.min(maxRecoverSec, Math.max(0, input.postureBrokenTimer));
  let nextAiTimer = Number.isFinite(input.aiTimer) ? input.aiTimer : 0;
  let nextAiState = input.aiState;
  let nextIdleFreezeAgeSec = input.idleFreezeAgeSec;
  let unfroze = false;

  if (nextAiState === 'recover') {
    if (nextAiTimer > maxRecoverSec) {
      nextAiTimer = maxRecoverSec;
    }
    nextIdleFreezeAgeSec += input.dt;
    if (nextAiTimer <= 0 && clampedPosture <= 0) {
      nextAiState = 'chase';
      nextIdleFreezeAgeSec = 0;
    } else if (nextIdleFreezeAgeSec > maxFreezeWatchdogSec) {
      nextAiState = 'chase';
      nextAiTimer = 0;
      nextIdleFreezeAgeSec = 0;
      unfroze = true;
    }
  } else if (nextAiState === 'idle') {
    nextIdleFreezeAgeSec += input.dt;
    if (nextIdleFreezeAgeSec > 2.0) {
      nextAiState = 'chase';
      nextAiTimer = 0;
      nextIdleFreezeAgeSec = 0;
      unfroze = true;
    }
  } else if (nextAiState === 'windup' || nextAiState === 'attack') {
    // Also guard against corrupt NaN/huge windup or attack timers locking an enemy in pose
    const maxActionSec = input.isBoss ? 3.2 : 2.4;
    if (nextAiTimer > maxActionSec) {
      nextAiTimer = maxActionSec;
    }
    nextIdleFreezeAgeSec = 0;
  } else {
    nextIdleFreezeAgeSec = 0;
  }

  return {
    nextAiState,
    nextAiTimer,
    nextPostureBrokenTimer: unfroze ? 0 : clampedPosture,
    nextIdleFreezeAgeSec,
    unfroze,
  };
}

export interface RudraSusanooCoreInput {
  transformTimer: number;
  action: string;
  isCasting: boolean;
  isParrying: boolean;
  vx: number;
  vy: number;
}

export interface RudraSusanooCoreLockState {
  isSusanooActive: boolean;
  rudraIsAttacking: boolean;
  rudraIsHeavyAttack: boolean;
  rudraIsCasting: boolean;
  rudraIsParrying: boolean;
  rudraOnlyCalmWalkOrIdle: boolean;
  susanooShouldSwing: boolean;
  susanooSwingHeavy: boolean;
  invincibleInSusanoo: boolean;
}

/**
 * Enforces the user-mandated Susanoo visual & animation split:
 * While Kala-Bhairava Susanoo (`transformTimer > 0`) is active:
 * - Rudra ONLY walks or stands calmly inside the chakra core (ZERO Parashu attack/cast animation spam!)
 * - The towering 3D Susanoo executes the heavy Pro Axe swings & Creature roars
 * - Rudra has 100% True Chakra Armor invincibility for the full duration.
 */
export function resolveRudraSusanooCoreLock(
  input: RudraSusanooCoreInput
): RudraSusanooCoreLockState {
  const active = input.transformTimer > 0;
  const rawAttacking = input.action === 'light_attack';
  const rawHeavy = input.action === 'heavy_unleash' || input.action === 'execute';

  if (active) {
    return {
      isSusanooActive: true,
      rudraIsAttacking: false,
      rudraIsHeavyAttack: false,
      rudraIsCasting: false,
      rudraIsParrying: false,
      rudraOnlyCalmWalkOrIdle: true,
      susanooShouldSwing: rawAttacking || rawHeavy,
      susanooSwingHeavy: rawHeavy,
      invincibleInSusanoo: true,
    };
  }

  return {
    isSusanooActive: false,
    rudraIsAttacking: rawAttacking,
    rudraIsHeavyAttack: rawHeavy,
    rudraIsCasting: input.isCasting,
    rudraIsParrying: input.isParrying,
    rudraOnlyCalmWalkOrIdle: false,
    susanooShouldSwing: false,
    susanooSwingHeavy: false,
    invincibleInSusanoo: false,
  };
}

export interface WaterFluxTargetInput {
  hp: number;
  maxHp: number;
  posture: number;
  distancePx: number;
  isBoss: boolean;
  isSoaked: boolean;
  damageMultiplier?: number;
}

export interface WaterFluxHitResult {
  inRange: boolean;
  damage: number;
  postureDamage: number;
  nextHp: number;
  killed: boolean;
  executedBonus: boolean;
  pullStrengthPx: number;
  appliedSoakedSec: number;
}

export const WATER_FLUX_RADIUS_PX = 295;

/**
 * Water Breathing [4] — Constant Flux (Tidal Dragon Vortex):
 * Devastating multi-hit coiled dragon surge with inward vortex pull,
 * Soaked debuff (6s), posture shatter, and execute bonus on foes <= 38% HP
 * so regular mobs are reliably swept and killed cleanly.
 */
export function computeWaterFluxHit(input: WaterFluxTargetInput): WaterFluxHitResult {
  if (input.distancePx > WATER_FLUX_RADIUS_PX) {
    return {
      inRange: false,
      damage: 0,
      postureDamage: 0,
      nextHp: input.hp,
      killed: false,
      executedBonus: false,
      pullStrengthPx: 0,
      appliedSoakedSec: 0,
    };
  }

  const mult = input.damageMultiplier ?? 1.0;
  const falloff = 1.0 - Math.min(0.28, (input.distancePx / WATER_FLUX_RADIUS_PX) * 0.28);
  const hpRatio = input.maxHp > 0 ? input.hp / input.maxHp : 1;
  const executedBonus = !input.isBoss && hpRatio <= 0.38;

  const baseDamage = input.isBoss ? 148 : 195;
  const soakedBonus = input.isSoaked ? 1.24 : 1.0;
  const execMult = executedBonus ? 1.55 : 1.0;

  const damage = Math.round(baseDamage * falloff * soakedBonus * execMult * mult);
  const postureDamage = Math.round((input.isBoss ? 48 : 68) * falloff);
  const nextHp = Math.max(0, input.hp - damage);
  const killed = input.hp > 0 && nextHp <= 0;
  const pullStrengthPx = input.isBoss ? 42 : 118;

  return {
    inRange: true,
    damage,
    postureDamage,
    nextHp,
    killed,
    executedBonus,
    pullStrengthPx,
    appliedSoakedSec: 6.0,
  };
}

export interface AgniHeavyBlastInput {
  hp: number;
  maxHp: number;
  distancePx: number;
  isBoss: boolean;
  isHeavyVariant: boolean;
  damageMultiplier?: number;
}

export interface AgniHeavyBlastResult {
  inRange: boolean;
  damage: number;
  postureDamage: number;
  nextHp: number;
  killed: boolean;
  burnSec: number;
  hitstopSec: number;
}

export const AGNI_BLAST_RADIUS_PX = 250;

/**
 * Agni [Q] / Heavy Solar Eruption math:
 * High burst damage + scorching burn DoT + heavy stagger + cinematic hitstop.
 */
export function computeAgniSolarHit(input: AgniHeavyBlastInput): AgniHeavyBlastResult {
  const maxR = input.isHeavyVariant ? 285 : AGNI_BLAST_RADIUS_PX;
  if (input.distancePx > maxR) {
    return {
      inRange: false,
      damage: 0,
      postureDamage: 0,
      nextHp: input.hp,
      killed: false,
      burnSec: 0,
      hitstopSec: 0,
    };
  }

  const mult = input.damageMultiplier ?? 1.0;
  const falloff = 1.0 - Math.min(0.24, (input.distancePx / maxR) * 0.24);
  const baseDamage = input.isHeavyVariant
    ? input.isBoss
      ? 162
      : 215
    : input.isBoss
      ? 122
      : 165;
  const damage = Math.round(baseDamage * falloff * mult);
  const postureDamage = Math.round((input.isBoss ? 44 : 62) * falloff);
  const nextHp = Math.max(0, input.hp - damage);

  return {
    inRange: true,
    damage,
    postureDamage,
    nextHp,
    killed: input.hp > 0 && nextHp <= 0,
    burnSec: input.isHeavyVariant ? 5.5 : 4.2,
    hitstopSec: input.isHeavyVariant ? 0.068 : 0.048,
  };
}

export interface DynamicCameraInput {
  isHub: boolean;
  hasActiveBoss: boolean;
  bossKind?: 'dundubhi' | 'vrikodara' | 'semi_boss' | null;
  susanooActive: boolean;
  currentZoom: number;
  dt: number;
}

/**
 * Dynamic Cinematic Camera Zoom:
 * - Standard chambers: `0.94` so stone halls feel monumental while keeping Rudra & foes crisp
 * - Hub sanctuary: `0.96` so Savitri, Lohakara, and Ferry Gate frame comfortably together
 * - Boss encounters: smoothly widens to `0.81` (Dundubhi/Vrikodara) or `0.86` (Temple Guardian)
 * - Susanoo active: subtly widens by `-0.04` so the towering spectral torso breathes cleanly
 */
export function computeDynamicArenaCameraZoom(input: DynamicCameraInput): number {
  let target = 1.12;
  if (input.isHub) {
    target = 1.06;
  } else if (input.hasActiveBoss) {
    target = input.bossKind === 'semi_boss' ? 1.0 : 0.94;
  }
  if (input.susanooActive && !input.isHub) {
    target = Math.max(0.88, target - 0.04);
  }
  const t = Math.min(1, Math.max(0, input.dt * 2.8));
  return input.currentZoom + (target - input.currentZoom) * t;
}

/**
 * Heroic Character Draw Sizes (calibrated for Ufotable anime combat intimacy while
 * bosses retain towering monumental scale under dynamic zoom).
 */
export const HEROIC_DRAW_SIZES = {
  rudra: 154,
  susanoo: 368,
  regularMin: 134,
  regularMax: 158,
  semiBoss: 242,
  dundubhi: 296,
  vrikodara: 316,
  savitriHub: 158,
  lohakaraHub: 184,
} as const;
