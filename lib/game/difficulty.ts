/**
 * Pure deterministic Difficulty Configuration for Kaliyuga: The Bleeding Crown.
 * Scales enemy vitality, strike damage, aggression/cooldowns, parry grace window,
 * Blood Demon Art cadence, and Ashen Karma bounty multipliers.
 */

export type DifficultyTier = 'easy' | 'hard' | 'difficult';

export interface DifficultyConfig {
  id: DifficultyTier;
  label: string;
  sanskritSubtitle: string;
  tagline: string;
  enemyHpMult: number;
  enemyDamageMult: number;
  enemyAttackCooldownMult: number; // >1 slower enemies, <1 faster relentless enemies
  parryGraceMult: number; // >1 wider parry timing window, <1 tighter precision window
  bloodDemonArtCadenceMult: number; // >1 more frequent Blood Demon Art patterns
  karmaRewardMult: number;
  accentHex: string;
}

export const DIFFICULTY_STORAGE_KEY = 'kaliyuga_act1_difficulty_v1';

export const DIFFICULTY_PRESETS: Record<DifficultyTier, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'EASY',
    sanskritSubtitle: 'कथा · STORY WARRIOR',
    tagline: 'Forgiving parries, lower enemy lethality, full mythic spectacle.',
    enemyHpMult: 0.72,
    enemyDamageMult: 0.65,
    enemyAttackCooldownMult: 1.24,
    parryGraceMult: 1.38,
    bloodDemonArtCadenceMult: 0.82,
    karmaRewardMult: 0.9,
    accentHex: '#7dd3fc',
  },
  hard: {
    id: 'hard',
    label: 'HARD',
    sanskritSubtitle: 'युद्ध · ASURA STANDARD',
    tagline: 'Intended Kurukshetra balance: crisp deflections and lethal bosses.',
    enemyHpMult: 1.0,
    enemyDamageMult: 1.0,
    enemyAttackCooldownMult: 1.0,
    parryGraceMult: 1.0,
    bloodDemonArtCadenceMult: 1.0,
    karmaRewardMult: 1.0,
    accentHex: '#e5b869',
  },
  difficult: {
    id: 'difficult',
    label: 'DIFFICULT',
    sanskritSubtitle: 'प्रलय · KALIYUGA WRATH',
    tagline: 'Relentless Blood Demon Arts, razor parry timing, +35% Ashen Karma.',
    enemyHpMult: 1.36,
    enemyDamageMult: 1.42,
    enemyAttackCooldownMult: 0.78,
    parryGraceMult: 0.76,
    bloodDemonArtCadenceMult: 1.32,
    karmaRewardMult: 1.35,
    accentHex: '#ef4444',
  },
};

export const DIFFICULTY_ORDER: DifficultyTier[] = ['easy', 'hard', 'difficult'];

export function getDifficultyConfig(tier: DifficultyTier | string | null | undefined): DifficultyConfig {
  if (tier === 'easy' || tier === 'hard' || tier === 'difficult') {
    return DIFFICULTY_PRESETS[tier];
  }
  return DIFFICULTY_PRESETS.hard;
}

export function loadSavedDifficulty(): DifficultyTier {
  if (typeof window === 'undefined') return 'hard';
  try {
    const raw = window.localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (raw === 'easy' || raw === 'hard' || raw === 'difficult') {
      return raw;
    }
  } catch {
    // Ignore storage read errors in sandboxed iframes
  }
  return 'hard';
}

export function saveDifficulty(tier: DifficultyTier): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DIFFICULTY_STORAGE_KEY, tier);
  } catch {
    // Ignore storage write errors in sandboxed iframes
  }
}

export function scaleEnemyHpByDifficulty(baseHp: number, tier: DifficultyTier): number {
  const cfg = getDifficultyConfig(tier);
  return Math.max(10, Math.round(baseHp * cfg.enemyHpMult));
}

export function scaleIncomingDamageByDifficulty(baseDamage: number, tier: DifficultyTier): number {
  const cfg = getDifficultyConfig(tier);
  return Math.max(1, Math.round(baseDamage * cfg.enemyDamageMult));
}

export function scaleKarmaRewardByDifficulty(baseKarma: number, tier: DifficultyTier): number {
  const cfg = getDifficultyConfig(tier);
  return Math.max(1, Math.round(baseKarma * cfg.karmaRewardMult));
}
