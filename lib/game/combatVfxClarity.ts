/**
 * Pure, unit-tested combat VFX clarity, enemy authority tiering, and
 * axe-swing active-frame synchronization rules for Kaalyuga.
 */

export type EnemyVfxTier = 'small' | 'heavy' | 'boss';

export interface EnemySlashVfxBudget {
  tier: EnemyVfxTier;
  radius: number;
  width: number;
  arcSpan: number;
  duration: number;
  sparkCount: number;
  spawnMandala: boolean;
  spawnBloodCage: boolean;
  spawnGroundShockwave: boolean;
}

const BOSS_ENEMY_TYPES = new Set([
  'dundubhi',
  'vrikodara',
  'semi_boss_bloodforge',
  'furnace_titan',
]);

const HEAVY_ENEMY_TYPES = new Set([
  'bloodmaw_brute',
  'ironmaw_gladiator',
  'stone_golem',
  'ash_cyclone_warden',
  'molten_titan_warden',
  'eternal_wheel_warden',
]);

/**
 * Classifies an enemy into strict visual authority tiers so small mobs never
 * clutter the arena with boss-scale visuals while heavy brutes and bosses command presence.
 */
export function classifyEnemyVfxTier(enemy: {
  type: string;
  isBoss?: boolean;
  isSemiBoss?: boolean;
}): EnemyVfxTier {
  if (enemy.isBoss || enemy.isSemiBoss || BOSS_ENEMY_TYPES.has(enemy.type)) {
    return 'boss';
  }
  if (HEAVY_ENEMY_TYPES.has(enemy.type)) {
    return 'heavy';
  }
  return 'small';
}

/**
 * Computes exact VFX geometry & spectacle limits for an enemy's strike tier.
 */
export function getEnemySlashVfxBudget(
  tier: EnemyVfxTier,
  telegraphRadius: number,
  attackKind?: string
): EnemySlashVfxBudget {
  const safeRadius = Number.isFinite(telegraphRadius) ? Math.max(40, telegraphRadius) : 90;

  if (tier === 'small') {
    return {
      tier: 'small',
      radius: Math.max(54, Math.min(76, safeRadius * 0.62)),
      width: 22,
      arcSpan: 1.55,
      duration: 0.20,
      sparkCount: 5,
      spawnMandala: false,
      spawnBloodCage: false,
      spawnGroundShockwave: false,
    };
  }

  if (tier === 'heavy') {
    return {
      tier: 'heavy',
      radius: Math.max(96, Math.min(138, safeRadius * 0.85)),
      width: 38,
      arcSpan: 2.15,
      duration: 0.28,
      sparkCount: 10,
      spawnMandala: false,
      spawnBloodCage: false,
      spawnGroundShockwave: attackKind === 'shockwave',
    };
  }

  return {
    tier: 'boss',
    radius: Math.max(148, Math.min(228, safeRadius * 1.04)),
    width: 64,
    arcSpan: 2.85,
    duration: 0.40,
    sparkCount: 16,
    spawnMandala: true,
    spawnBloodCage: true,
    spawnGroundShockwave: attackKind === 'shockwave',
  };
}

export interface StrikeActiveFrameGateResult {
  shouldFireNow: boolean;
  inStartupGlint: boolean;
  normalizedProgress: number;
}

/**
 * Synchronizes melee slash VFX and hitboxes with Rudra's physical Parashu axe cleave frame
 * instead of firing prematurely on frame 0 of button press during startup windup.
 */
export function evaluateStrikeActiveFrameGate(params: {
  attackProgress: number;
  triggerThreshold: number;
  alreadyFired: boolean;
}): StrikeActiveFrameGateResult {
  const norm = Math.max(0, Math.min(1, Number.isFinite(params.attackProgress) ? params.attackProgress : 0));
  const threshold = Math.max(0.05, Math.min(0.75, params.triggerThreshold));

  if (params.alreadyFired) {
    return {
      shouldFireNow: false,
      inStartupGlint: false,
      normalizedProgress: norm,
    };
  }

  if (norm >= threshold) {
    return {
      shouldFireNow: true,
      inStartupGlint: false,
      normalizedProgress: norm,
    };
  }

  return {
    shouldFireNow: false,
    inStartupGlint: norm > 0.02,
    normalizedProgress: norm,
  };
}
