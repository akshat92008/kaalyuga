export type StaffStance = 'smash' | 'pillar' | 'thrust';
export type WeaponId = 'twin_blades' | 'jingu_bang' | 'dragon_glaive';
export type UpgradeId =
  | 'simian_marrow'
  | 'jade_gourd'
  | 'qi_vessel'
  | 'suozi_armor'
  | 'relic_curio'
  | 'lifesaving_strand';

export interface ShrineUpgradeSpec {
  id: UpgradeId;
  chineseName: string;
  title: string;
  description: string;
  effectText: string;
  maxRank: number;
  baseCost: number;
  costStep: number;
}

export type ShrineRanks = Record<UpgradeId, number>;

export const SHRINE_UPGRADES: ShrineUpgradeSpec[] = [
  {
    id: 'simian_marrow',
    chineseName: 'PRANA MARROW',
    title: 'ASH-FORGED PRANA MARROW',
    description: 'Permanently increases Rudra’s Maximum Vitality at the start of every Kurukshetra run.',
    effectText: '+30 Max HP per Rank',
    maxRank: 5,
    baseCost: 50,
    costStep: 20,
  },
  {
    id: 'jade_gourd',
    chineseName: 'AMRITA KALASHA',
    title: 'CHOLA BRASS AMRITA KALASHA',
    description: 'Increases the number of golden Amrita Kalasha draughts you carry into battle.',
    effectText: '+1 Kalasha Sip per Rank',
    maxRank: 4,
    baseCost: 55,
    costStep: 35,
  },
  {
    id: 'qi_vessel',
    chineseName: 'TAPAS VESSEL',
    title: 'AWAKENED TAPAS CHAKRA',
    description: 'Begin every arena with pre-charged Tapas Focus Orbs ready for Heavy Khanda Cleaves.',
    effectText: '+1 Starting Focus Orb per Rank',
    maxRank: 3,
    baseCost: 65,
    costStep: 30,
  },
  {
    id: 'suozi_armor',
    chineseName: 'KAVACHA MAIL',
    title: 'CHOLA BRONZE KAVACHA MAIL',
    description: 'Ancient Chola war-plate that amplifies all Khanda, Stance, and Vedic Astra damage.',
    effectText: '+12% All Damage per Rank',
    maxRank: 5,
    baseCost: 60,
    costStep: 25,
  },
  {
    id: 'relic_curio',
    chineseName: 'KURUKSHETRA SEAL',
    title: 'SEAL OF THE BLEEDING CROWN',
    description: 'Vanquished Dharma-Rot legions and Rakshasa Sovereigns yield significantly more Ashen Karma.',
    effectText: '+25% Ashen Karma per Rank',
    maxRank: 4,
    baseCost: 50,
    costStep: 25,
  },
  {
    id: 'lifesaving_strand',
    chineseName: 'MRITYUNJAYA VOW',
    title: 'MRITYUNJAYA DEATHLESS VOW',
    description: 'Defy death once per run through the Ash-Bound curse, rising from the pyre with 70% HP.',
    effectText: '+1 Auto-Revive per Run',
    maxRank: 2,
    baseCost: 120,
    costStep: 90,
  },
];

export const INITIAL_SHRINE_RANKS: ShrineRanks = {
  simian_marrow: 1,
  jade_gourd: 0,
  qi_vessel: 1,
  suozi_armor: 1,
  relic_curio: 0,
  lifesaving_strand: 0,
};

export const INITIAL_ASHEN_KARMA = 5447;

export interface StanceConfig {
  id: StaffStance;
  chineseName: string;
  englishName: string;
  shortDesc: string;
  heavyDamageBase: number;
  postureDamageBase: number;
  rangePx: number;
  elevatedImmuneToGround: boolean;
}

export const STANCE_CONFIGS: Record<StaffStance, StanceConfig> = {
  smash: {
    id: 'smash',
    chineseName: 'CLEAVE',
    englishName: 'Asura Parashu Cleave',
    shortDesc: 'Two-handed overhead Parashu Great-Axe crush · High stagger & shockwave',
    heavyDamageBase: 92,
    postureDamageBase: 165,
    rangePx: 145,
    elevatedImmuneToGround: false,
  },
  pillar: {
    id: 'pillar',
    chineseName: 'TANDAVA',
    englishName: 'Tandava Vault Stance',
    shortDesc: 'Leaps above ground quakes · Wide 360° airborne Parashu cyclone slam',
    heavyDamageBase: 80,
    postureDamageBase: 145,
    rangePx: 185,
    elevatedImmuneToGround: true,
  },
  thrust: {
    id: 'thrust',
    chineseName: 'SHULA',
    englishName: 'Trishula Lunge Stance',
    shortDesc: 'Long-range armor-piercing Trishula-Axe thrust · Precision crit multiplier',
    heavyDamageBase: 104,
    postureDamageBase: 135,
    rangePx: 235,
    elevatedImmuneToGround: false,
  },
};

export interface WeaponConfig {
  id: WeaponId;
  key: '1' | '2' | '3';
  chineseName: string;
  englishName: string;
  shortLabel: string;
  damageMultiplier: number;
  attackSpeedMultiplier: number;
  focusGainPerHit: number;
  reachPx: number;
  accentColor: string;
}

export const WEAPON_CONFIGS: Record<WeaponId, WeaponConfig> = {
  twin_blades: {
    id: 'twin_blades',
    key: '1',
    chineseName: 'KATAR-AXE',
    englishName: 'Rakta-Parashu Twin Cleavers',
    shortLabel: 'Twin-Axe',
    damageMultiplier: 0.82,
    attackSpeedMultiplier: 1.38,
    focusGainPerHit: 0.28,
    reachPx: 98,
    accentColor: '#3be8d0',
  },
  jingu_bang: {
    id: 'jingu_bang',
    key: '2',
    chineseName: 'PARASHU',
    englishName: 'Bloodforged Khanda-Parashu Axe',
    shortLabel: 'Parashu',
    damageMultiplier: 1.08,
    attackSpeedMultiplier: 1.0,
    focusGainPerHit: 0.36,
    reachPx: 128,
    accentColor: '#f5be4f',
  },
  dragon_glaive: {
    id: 'dragon_glaive',
    key: '3',
    chineseName: 'TRISHULA',
    englishName: 'Brahmashira Trishula Great-Axe',
    shortLabel: 'Trishula',
    damageMultiplier: 1.32,
    attackSpeedMultiplier: 0.78,
    focusGainPerHit: 0.44,
    reachPx: 150,
    accentColor: '#ff642e',
  },
};

export function getUpgradeCost(id: UpgradeId, currentRank: number): number {
  const spec = SHRINE_UPGRADES.find((u) => u.id === id);
  if (!spec) return 9999;
  return spec.baseCost + currentRank * spec.costStep;
}

export function canPurchaseUpgrade(
  id: UpgradeId,
  ranks: ShrineRanks,
  availableKarma: number
): boolean {
  const spec = SHRINE_UPGRADES.find((u) => u.id === id);
  if (!spec) return false;
  const currentRank = ranks[id] ?? 0;
  if (currentRank >= spec.maxRank) return false;
  const cost = getUpgradeCost(id, currentRank);
  return availableKarma >= cost;
}

export function purchaseShrineUpgrade(
  id: UpgradeId,
  ranks: ShrineRanks,
  availableKarma: number
): { ranks: ShrineRanks; availableKarma: number; purchased: boolean } {
  if (!canPurchaseUpgrade(id, ranks, availableKarma)) {
    return { ranks, availableKarma, purchased: false };
  }
  const currentRank = ranks[id] ?? 0;
  const cost = getUpgradeCost(id, currentRank);
  return {
    ranks: {
      ...ranks,
      [id]: currentRank + 1,
    },
    availableKarma: availableKarma - cost,
    purchased: true,
  };
}

export function computeDerivedPlayerStats(ranks: ShrineRanks) {
  const baseHp = 220;
  const maxHp = baseHp + (ranks.simian_marrow ?? 0) * 30;
  const maxGourdSips = 3 + (ranks.jade_gourd ?? 0);
  const startingFocusOrbs = Math.min(4, (ranks.qi_vessel ?? 0));
  const damageMultiplier = 1 + (ranks.suozi_armor ?? 0) * 0.12;
  const karmaMultiplier = 1 + (ranks.relic_curio ?? 0) * 0.25;
  const extraLives = ranks.lifesaving_strand ?? 0;

  return {
    maxHp,
    maxGourdSips,
    startingFocusOrbs,
    damageMultiplier,
    karmaMultiplier,
    extraLives,
  };
}

export function calculateLightHitDamage(params: {
  comboStep: 1 | 2 | 3 | 4;
  weapon: WeaponId;
  ranks: ShrineRanks;
  isImmobilizedTarget?: boolean;
}): { hpDamage: number; postureDamage: number; focusDelta: number } {
  const weaponCfg = WEAPON_CONFIGS[params.weapon];
  const stats = computeDerivedPlayerStats(params.ranks);
  const stepMultipliers: Record<1 | 2 | 3 | 4, number> = {
    1: 1.0,
    2: 1.15,
    3: 1.32,
    4: 1.75, // 4th hit combo finisher
  };
  const stepMult = stepMultipliers[params.comboStep];
  const immobMult = params.isImmobilizedTarget ? 1.25 : 1.0;

  const rawHp = 28 * weaponCfg.damageMultiplier * stepMult * stats.damageMultiplier * immobMult;
  const rawPosture = 42 * weaponCfg.damageMultiplier * stepMult * stats.damageMultiplier * immobMult;

  return {
    hpDamage: Math.round(rawHp),
    postureDamage: Math.round(rawPosture),
    focusDelta: weaponCfg.focusGainPerHit * (params.comboStep === 4 ? 1.35 : 1.0),
  };
}

export function calculateStanceHeavyDamage(params: {
  stance: StaffStance;
  focusOrbsConsumed: number;
  weapon: WeaponId;
  ranks: ShrineRanks;
  isResoluteCounter?: boolean;
}): { hpDamage: number; postureDamage: number; healAmount: number } {
  const stanceCfg = STANCE_CONFIGS[params.stance];
  const weaponCfg = WEAPON_CONFIGS[params.weapon];
  const stats = computeDerivedPlayerStats(params.ranks);
  const orbs = Math.max(0, Math.min(4, Math.floor(params.focusOrbsConsumed)));

  // Each Focus Orb consumed amplifies heavy attack exponentially (1x -> 1.55x -> 2.2x -> 3.0x -> 4.0x)
  const orbMultipliers = [0.75, 1.45, 2.15, 2.95, 3.85];
  const orbMult = orbMultipliers[orbs] ?? 1.0;
  const resoluteMult = params.isResoluteCounter ? 1.35 : 1.0;

  const hpDamage = Math.round(
    stanceCfg.heavyDamageBase *
      weaponCfg.damageMultiplier *
      stats.damageMultiplier *
      orbMult *
      resoluteMult
  );
  const postureDamage = Math.round(
    stanceCfg.postureDamageBase *
      weaponCfg.damageMultiplier *
      stats.damageMultiplier *
      orbMult *
      resoluteMult
  );
  // Exhilaration passive: spending Focus Orbs restores health
  const healAmount = orbs * 14;

  return { hpDamage, postureDamage, healAmount };
}

export function getNextStaffStance(current: StaffStance): StaffStance {
  if (current === 'smash') return 'pillar';
  if (current === 'pillar') return 'thrust';
  return 'smash';
}

export function computeBossPhase(currentHp: number, maxHp: number): 1 | 2 | 3 {
  const ratio = maxHp > 0 ? currentHp / maxHp : 0;
  if (ratio > 0.66) return 1;
  if (ratio > 0.33) return 2;
  return 3;
}

export function applyPostureDamage(params: {
  currentPosture: number;
  maxPosture: number;
  postureDamage: number;
  alreadyBroken: boolean;
}): { nextPosture: number; triggeredBreak: boolean } {
  if (params.alreadyBroken) {
    return { nextPosture: 0, triggeredBreak: false };
  }
  const next = Math.max(0, params.currentPosture - Math.max(0, params.postureDamage));
  return {
    nextPosture: next,
    triggeredBreak: next === 0 && params.currentPosture > 0,
  };
}

export function isPointInConeTelegraph(params: {
  px: number;
  py: number;
  originX: number;
  originY: number;
  aimAngle: number;
  radius: number;
  halfAngleRad?: number;
}): boolean {
  const halfAngle = params.halfAngleRad ?? 0.82; // ~94 deg total cone
  const dx = params.px - params.originX;
  const dy = (params.py - params.originY) / 0.65; // Normalize isometric foreshortening
  const dist = Math.hypot(dx, dy);
  if (dist > params.radius) return false;
  if (dist < 18) return true; // Point-blank overlap
  const targetAngle = Math.atan2(params.py - params.originY, dx);
  let diff = targetAngle - params.aimAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= halfAngle;
}

export function isPointInDashCorridor(params: {
  px: number;
  py: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  halfWidth: number;
}): boolean {
  const vx = params.endX - params.startX;
  const vy = params.endY - params.startY;
  const lenSq = vx * vx + vy * vy;
  if (lenSq < 1) {
    return Math.hypot(params.px - params.startX, params.py - params.startY) <= params.halfWidth;
  }
  const t = Math.max(
    0,
    Math.min(1, ((params.px - params.startX) * vx + (params.py - params.startY) * vy) / lenSq)
  );
  const projX = params.startX + t * vx;
  const projY = params.startY + t * vy;
  const dist = Math.hypot(params.px - projX, (params.py - projY) * 1.15);
  return dist <= params.halfWidth;
}

export function isPointInShockwaveRing(params: {
  px: number;
  py: number;
  centerX: number;
  centerY: number;
  outerRadius: number;
  elevatedImmune: boolean;
}): boolean {
  if (params.elevatedImmune) return false;
  const dx = params.px - params.centerX;
  const dy = (params.py - params.centerY) / 0.6;
  return Math.hypot(dx, dy) <= params.outerRadius;
}

export const DASH_RECHARGE_SECONDS = 1.15;

export function consumeDashStamina(params: {
  currentCharges: number;
  maxCharges: number;
  currentRechargeTimer?: number;
}): { canDash: boolean; nextCharges: number; nextRechargeTimer: number } {
  const existingTimer = params.currentRechargeTimer ?? 0;
  if (params.currentCharges < 1) {
    return {
      canDash: false,
      nextCharges: params.currentCharges,
      nextRechargeTimer: existingTimer > 0 ? existingTimer : DASH_RECHARGE_SECONDS,
    };
  }
  const nextCharges = Math.max(0, Math.min(params.maxCharges, params.currentCharges - 1));
  const nextRechargeTimer =
    existingTimer > 0 ? existingTimer : nextCharges < params.maxCharges ? DASH_RECHARGE_SECONDS : 0;
  return {
    canDash: true,
    nextCharges,
    nextRechargeTimer,
  };
}


