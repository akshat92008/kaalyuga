export type ImmortalPatronId =
  | 'nezha'
  | 'erlang'
  | 'guanyin'
  | 'aoguang'
  | 'subhuti'
  | 'greatsage';

export type BoonRarity = 'Rare' | 'Epic' | 'Heroic' | 'Legendary' | 'Duo';

export type CelestialBoonId =
  | 'nezha_scorch_strike'
  | 'nezha_blazing_dash'
  | 'erlang_chain_lightning'
  | 'erlang_third_eye_crit'
  | 'guanyin_divine_deflect'
  | 'guanyin_ambrosia_gourd'
  | 'aoguang_tidal_slam'
  | 'aoguang_undertow_unleash'
  | 'subhuti_astral_qi'
  | 'subhuti_spell_mastery'
  | 'sage_phantom_echo'
  | 'sage_sovereign_breaker'
  | 'duo_agni_indra_cataclysm'
  | 'duo_varuna_rudra_riptide'
  | 'duo_ashvin_indra_mirage';

export interface ImmortalPatronSpec {
  id: ImmortalPatronId;
  name: string;
  chineseName: string;
  title: string;
  domain: string;
  accentColor: string;
  secondaryColor: string;
}

export interface CelestialBoonSpec {
  id: CelestialBoonId;
  patronId: ImmortalPatronId;
  secondaryPatronId?: ImmortalPatronId;
  name: string;
  chineseName: string;
  slotLabel: string;
  rarity: BoonRarity;
  summary: string;
  statCallout: string;
  accentColor: string;
}

export interface BoonCombatModifiers {
  damageMultiplier: number;
  attackSpeedMultiplier: number;
  critChance: number;
  critMultiplier: number;
  backstabMultiplier: number;
  dashStrikeMultiplier: number;
  postureDamageMultiplier: number;
  wallSlamMultiplier: number;
  focusGainMultiplier: number;
  spellCooldownMultiplier: number;
  scorchDps: number;
  dashFireNovaDamage: number;
  chainLightningDamage: number;
  deflectProjectilesOnDash: boolean;
  perfectDodgeHeal: number;
  gourdBonusMaxSips: number;
  gourdInstantHealRatio: number;
  echoStrikeRatio: number;
  heavyVortexPull: boolean;
  heavyBonusMultiplier: number;
  castLodgedDamageBonus: number;
}

export const IMMORTAL_PATRONS: Record<ImmortalPatronId, ImmortalPatronSpec> = {
  nezha: {
    id: 'nezha',
    name: 'Agni Deva',
    chineseName: 'AGNEYASTRA · LORD OF SACRED FIRE',
    title: 'Sovereign of the Homa Pyre',
    domain: 'Agneyastra Scorch & Cremation Ignition',
    accentColor: '#ff5e36',
    secondaryColor: '#ffb347',
  },
  erlang: {
    id: 'erlang',
    name: 'Indra Deva',
    chineseName: 'VAJRASTRA · KING OF THE DEVAS',
    title: 'Wielder of the Sky-Splitting Vajra',
    domain: 'Vajra Chain Lightning & Lethal Precision',
    accentColor: '#5ce6ff',
    secondaryColor: '#c4f5ff',
  },
  guanyin: {
    id: 'guanyin',
    name: 'The Ashvins',
    chineseName: 'AMRITA VEDA · DIVINE PHYSICIANS',
    title: 'Twin Horsemen of Dawn & Healing',
    domain: 'Kalaripayattu Deflection & Sacred Amrita',
    accentColor: '#3ee0a8',
    secondaryColor: '#a8ffdf',
  },
  aoguang: {
    id: 'aoguang',
    name: 'Varuna Deva',
    chineseName: 'VARUNASTRA · SOVEREIGN OF ABYSSAL WATERS',
    title: 'Keeper of Cosmic Rta & The Vaitarani Tide',
    domain: 'Tidal Knockback & Pillar-Slam Rupture',
    accentColor: '#4da6ff',
    secondaryColor: '#99ccff',
  },
  subhuti: {
    id: 'subhuti',
    name: 'Rishi Vyasa',
    chineseName: 'BRAHMAVIDYA · SCRIBE OF KURUKSHETRA',
    title: 'Seer of the Eighteen Days of Ash',
    domain: 'Tapas Focus Generation & Astra Mastery',
    accentColor: '#e08cff',
    secondaryColor: '#f3ccff',
  },
  greatsage: {
    id: 'greatsage',
    name: 'Rudra-Shiva',
    chineseName: 'PASHUPATASTRA · THE DESTROYER',
    title: 'Lord of Cremation Grounds & Tandava',
    domain: 'Phantom Blade Echoes & Posture Shatter',
    accentColor: '#f5c451',
    secondaryColor: '#fff0b3',
  },
};

export const CELESTIAL_BOONS: CelestialBoonSpec[] = [
  {
    id: 'nezha_scorch_strike',
    patronId: 'nezha',
    name: 'Agneyastra Branded Edge',
    chineseName: 'AGNI JVALA · CREMATION FLAME',
    slotLabel: 'STRIKE ASTRA',
    rarity: 'Epic',
    summary: 'Your Parashu Strikes and Dash-Strikes ignite foes with Agneyastra Cremation Flame, dealing searing burn damage over 3.0 seconds.',
    statCallout: '+32 Scorch DoT / sec · +12% Strike Damage',
    accentColor: '#ff5e36',
  },
  {
    id: 'nezha_blazing_dash',
    patronId: 'nezha',
    name: 'Homa Pyre Step',
    chineseName: 'AGNI PATHA · BLAZING STRIDE',
    slotLabel: 'DASH ASTRA',
    rarity: 'Heroic',
    summary: 'Phantom Step Dash detonates a blazing Homa fire ring at your origin and boosts Dash-Strike lunge damage.',
    statCallout: '72 AoE Fire Nova on Dash · +25% Dash-Strike Damage',
    accentColor: '#ff5e36',
  },
  {
    id: 'erlang_chain_lightning',
    patronId: 'erlang',
    name: 'Vajra Sky-Splitter',
    chineseName: 'INDRA VAJRA · THUNDERBOLT ARC',
    slotLabel: 'THUNDER ASTRA',
    rarity: 'Heroic',
    summary: 'Every Parashu strike unleashes jagged Vajra Chain Lightning that arcs across up to 3 nearby enemies.',
    statCallout: '48 Chain Lightning Damage (3 bounces)',
    accentColor: '#5ce6ff',
  },
  {
    id: 'erlang_third_eye_crit',
    patronId: 'erlang',
    name: 'Thousand-Eyed Gaze of Indra',
    chineseName: 'SAHASRAKSHA · LETHAL PRECISION',
    slotLabel: 'PRECISION ASTRA',
    rarity: 'Legendary',
    summary: 'Grants all attacks a high Critical Strike chance and massively amplifies Shadow Strike (Backstab) damage from behind.',
    statCallout: '+24% Crit Chance (1.75x) · +80% Backstab Damage',
    accentColor: '#5ce6ff',
  },
  {
    id: 'guanyin_divine_deflect',
    patronId: 'guanyin',
    name: 'Kalaripayattu Mirror Ward',
    chineseName: 'ASHVIN KAVACHA · IRON DEFLECT',
    slotLabel: 'DEFLECT ASTRA',
    rarity: 'Heroic',
    summary: 'Phantom Step Dash and Combo Finishers deflect incoming enemy arrows & orbs back at 2.5x damage. Perfect Dodges restore Vitality.',
    statCallout: '250% Projectile Deflect · +12 HP on Perfect Dodge',
    accentColor: '#3ee0a8',
  },
  {
    id: 'guanyin_ambrosia_gourd',
    patronId: 'guanyin',
    name: 'Nectar of the Ashvins',
    chineseName: 'SOMA AMRITA · GOLDEN DRAUGHT',
    slotLabel: 'VITALITY ASTRA',
    rarity: 'Rare',
    summary: 'Adds +1 Max Amrita Kalasha charge and massively empowers every healing draught.',
    statCallout: '+50% Kalasha Heal Ratio · +1 Max Kalasha Sip',
    accentColor: '#3ee0a8',
  },
  {
    id: 'aoguang_tidal_slam',
    patronId: 'aoguang',
    name: 'Vaitarani Undertow Slam',
    chineseName: 'VARUNA PASHA · CRUSHING TIDE',
    slotLabel: 'KNOCKBACK ASTRA',
    rarity: 'Epic',
    summary: 'Your strikes hurl enemies back with crashing force. Enemies slammed into pillars or walls suffer massive bonus shatter damage.',
    statCallout: '+90% Wall-Slam Damage & Posture Shatter',
    accentColor: '#4da6ff',
  },
  {
    id: 'aoguang_undertow_unleash',
    patronId: 'aoguang',
    name: 'Maelstrom of Kurukshetra',
    chineseName: 'SAMUDRA MANTHAN · ABYSSAL PULL',
    slotLabel: 'UNLEASH ASTRA',
    rarity: 'Heroic',
    summary: 'Stance Heavy Unleash pulls surrounding foes inward into a crushing vortex and deals +35% Heavy Damage.',
    statCallout: '+35% Stance Unleash Damage · Vortex Pull',
    accentColor: '#4da6ff',
  },
  {
    id: 'subhuti_astral_qi',
    patronId: 'subhuti',
    name: 'Tapas of the Saptarishi',
    chineseName: 'PRANA AGNI · INNER AUSTERITY',
    slotLabel: 'FOCUS ASTRA',
    rarity: 'Epic',
    summary: 'Accelerates Tapas Focus Orb generation from all combat actions by +60% and grants +1 instant Focus Orb.',
    statCallout: '+60% Focus Charge Rate · +1 Instant Focus Orb',
    accentColor: '#e08cff',
  },
  {
    id: 'subhuti_spell_mastery',
    patronId: 'subhuti',
    name: 'Mantra of the Atharvaveda',
    chineseName: 'ASTRA SIDDHI · SACRED VERSE',
    slotLabel: 'MANTRA ASTRA',
    rarity: 'Heroic',
    summary: 'Reduces cooldowns of Agneyastra Blood-Shard Cast, Kalaripayattu Parry, Maya Phantoms, and Rudra Tandava by 32%.',
    statCallout: '-32% All Vedic Astra Cooldowns · +20% Cast Lodged Amp',
    accentColor: '#e08cff',
  },
  {
    id: 'sage_phantom_echo',
    patronId: 'greatsage',
    name: 'Tandava Afterimage Blade',
    chineseName: 'KALA BHAIRAVA · SHADOW CLEAVE',
    slotLabel: 'HAVOC ASTRA',
    rarity: 'Legendary',
    summary: 'Increases Attack Speed by +20% and causes every Parashu swing to conjure a blazing bronze afterimage for 35% bonus damage.',
    statCallout: '+20% Attack Speed · +35% Phantom Echo Hit',
    accentColor: '#f5c451',
  },
  {
    id: 'sage_sovereign_breaker',
    patronId: 'greatsage',
    name: 'Pashupata Crown-Breaker',
    chineseName: 'SHIVA RUDRA · SOVEREIGN SHATTER',
    slotLabel: 'POSTURE ASTRA',
    rarity: 'Legendary',
    summary: 'Shatters enemy and Sovereign Rakshasa Posture 45% faster and increases all damage by +15%.',
    statCallout: '+45% Posture Damage · +15% All Damage',
    accentColor: '#f5c451',
  },
  // HADES-STYLE DUO BOONS (Unlocked when holding blessings from two distinct Devas)
  {
    id: 'duo_agni_indra_cataclysm',
    patronId: 'nezha',
    secondaryPatronId: 'erlang',
    name: 'Vajra-Agni Storm Pyre',
    chineseName: 'DUO ASTRA · AGNI × INDRA SYNERGY',
    slotLabel: 'DUO SYNERGY',
    rarity: 'Duo',
    summary: 'Foes ignited by Agneyastra Scorch are struck by doubly lethal Sky-Splitting Vajra Lightning on every swing and Dash.',
    statCallout: '+45 Chain Lightning · +28 Scorch DPS · +20% Crit Mult',
    accentColor: '#a8ff78',
  },
  {
    id: 'duo_varuna_rudra_riptide',
    patronId: 'aoguang',
    secondaryPatronId: 'greatsage',
    name: 'Vaitarani Crown-Shatter',
    chineseName: 'DUO ASTRA · VARUNA × RUDRA SYNERGY',
    slotLabel: 'DUO SYNERGY',
    rarity: 'Duo',
    summary: 'Heavy Unleash Vortex Pull and Lodged Blood-Shard Casts crush enemy Posture and amplify all strike damage by +30%.',
    statCallout: '+30% All Damage · +40% Posture Shatter · Vortex Pull',
    accentColor: '#a8ff78',
  },
  {
    id: 'duo_ashvin_indra_mirage',
    patronId: 'guanyin',
    secondaryPatronId: 'erlang',
    name: 'Sahasraksha Mirror-Step',
    chineseName: 'DUO ASTRA · ASHVINS × INDRA SYNERGY',
    slotLabel: 'DUO SYNERGY',
    rarity: 'Duo',
    summary: 'Phantom Step Dash automatically deflects projectiles, restores +18 HP on Perfect Dodge, and guarantees Critical Dash-Strikes.',
    statCallout: '+35% Dash-Strike · Auto-Deflect · +18 HP Perfect Dodge',
    accentColor: '#a8ff78',
  },
];

export function getBoonById(id: CelestialBoonId): CelestialBoonSpec {
  const found = CELESTIAL_BOONS.find((b) => b.id === id);
  if (!found) {
    throw new Error(`Unknown CelestialBoonId: ${id}`);
  }
  return found;
}

export function computeBoonModifiers(activeBoons: CelestialBoonId[]): BoonCombatModifiers {
  const set = new Set<CelestialBoonId>(activeBoons);

  let damageMultiplier = 1.0;
  let attackSpeedMultiplier = 1.0;
  let critChance = 0.06; // Base 6% critical chance
  let critMultiplier = 1.75;
  let backstabMultiplier = 1.35; // Base +35% Hades Shadow Strike when attacking from behind
  let dashStrikeMultiplier = 1.35; // Base 1.35x Hades Dash-Strike lunge multiplier
  let postureDamageMultiplier = 1.0;
  let wallSlamMultiplier = 1.0;
  let focusGainMultiplier = 1.0;
  let spellCooldownMultiplier = 1.0;
  let scorchDps = 0;
  let dashFireNovaDamage = 0;
  let chainLightningDamage = 0;
  let deflectProjectilesOnDash = false;
  let perfectDodgeHeal = 0;
  let gourdBonusMaxSips = 0;
  let gourdInstantHealRatio = 0;
  let echoStrikeRatio = 0;
  let heavyVortexPull = false;
  let heavyBonusMultiplier = 1.0;
  let castLodgedDamageBonus = 0.25; // Base +25% damage per lodged Agni Blood-Shard Cast

  if (set.has('nezha_scorch_strike')) {
    damageMultiplier += 0.12;
    scorchDps += 32;
  }
  if (set.has('nezha_blazing_dash')) {
    dashFireNovaDamage += 72;
    dashStrikeMultiplier += 0.25;
  }
  if (set.has('erlang_chain_lightning')) {
    chainLightningDamage += 48;
  }
  if (set.has('erlang_third_eye_crit')) {
    critChance += 0.24;
    backstabMultiplier = 1.80;
  }
  if (set.has('guanyin_divine_deflect')) {
    deflectProjectilesOnDash = true;
    perfectDodgeHeal += 12;
  }
  if (set.has('guanyin_ambrosia_gourd')) {
    gourdBonusMaxSips += 1;
    gourdInstantHealRatio += 0.5;
  }
  if (set.has('aoguang_tidal_slam')) {
    wallSlamMultiplier += 0.9;
  }
  if (set.has('aoguang_undertow_unleash')) {
    heavyVortexPull = true;
    heavyBonusMultiplier += 0.35;
  }
  if (set.has('subhuti_astral_qi')) {
    focusGainMultiplier += 0.6;
  }
  if (set.has('subhuti_spell_mastery')) {
    spellCooldownMultiplier = 0.68;
    castLodgedDamageBonus += 0.20;
  }
  if (set.has('sage_phantom_echo')) {
    attackSpeedMultiplier += 0.2;
    echoStrikeRatio = 0.35;
  }
  if (set.has('sage_sovereign_breaker')) {
    postureDamageMultiplier += 0.45;
    damageMultiplier += 0.15;
  }

  // Duo Boon Synergies
  if (set.has('duo_agni_indra_cataclysm')) {
    chainLightningDamage += 45;
    scorchDps += 28;
    critMultiplier += 0.2;
  }
  if (set.has('duo_varuna_rudra_riptide')) {
    damageMultiplier += 0.3;
    postureDamageMultiplier += 0.4;
    heavyVortexPull = true;
    castLodgedDamageBonus += 0.15;
  }
  if (set.has('duo_ashvin_indra_mirage')) {
    deflectProjectilesOnDash = true;
    perfectDodgeHeal += 18;
    dashStrikeMultiplier += 0.35;
    critChance += 0.15;
  }

  return {
    damageMultiplier: Number(damageMultiplier.toFixed(2)),
    attackSpeedMultiplier: Number(attackSpeedMultiplier.toFixed(2)),
    critChance: Number(critChance.toFixed(2)),
    critMultiplier: Number(critMultiplier.toFixed(2)),
    backstabMultiplier: Number(backstabMultiplier.toFixed(2)),
    dashStrikeMultiplier: Number(dashStrikeMultiplier.toFixed(2)),
    postureDamageMultiplier: Number(postureDamageMultiplier.toFixed(2)),
    wallSlamMultiplier: Number(wallSlamMultiplier.toFixed(2)),
    focusGainMultiplier: Number(focusGainMultiplier.toFixed(2)),
    spellCooldownMultiplier: Number(spellCooldownMultiplier.toFixed(2)),
    scorchDps,
    dashFireNovaDamage,
    chainLightningDamage,
    deflectProjectilesOnDash,
    perfectDodgeHeal,
    gourdBonusMaxSips,
    gourdInstantHealRatio,
    echoStrikeRatio,
    heavyVortexPull,
    heavyBonusMultiplier: Number(heavyBonusMultiplier.toFixed(2)),
    castLodgedDamageBonus: Number(castLodgedDamageBonus.toFixed(2)),
  };
}

/**
 * Computes dynamic Hades-style weapon slash & dash colors based on equipped Patron Boons.
 */
export function getActiveSlashPalette(
  activeBoons: CelestialBoonId[],
  stance: 'smash' | 'pillar' | 'thrust'
): {
  outerEdge: string;
  midCore: string;
  innerRibbon: string;
  boltPrimary: string;
  boltSecondary: string;
} {
  const hasPatron = (p: ImmortalPatronId) =>
    activeBoons.some((id) => {
      const b = CELESTIAL_BOONS.find((item) => item.id === id);
      return b?.patronId === p || b?.secondaryPatronId === p;
    });

  if (hasPatron('nezha') && hasPatron('erlang')) {
    return {
      outerEdge: 'rgba(255, 78, 36, 0.96)',
      midCore: 'rgba(255, 232, 92, 0.98)',
      innerRibbon: 'rgba(92, 230, 255, 0.96)',
      boltPrimary: '#ffe85c',
      boltSecondary: '#5ce6ff',
    };
  }
  if (hasPatron('erlang')) {
    return {
      outerEdge: 'rgba(56, 232, 255, 0.95)',
      midCore: 'rgba(255, 238, 115, 0.98)',
      innerRibbon: 'rgba(185, 248, 255, 0.96)',
      boltPrimary: '#5ce6ff',
      boltSecondary: '#ffee73',
    };
  }
  if (hasPatron('guanyin')) {
    return {
      outerEdge: 'rgba(62, 224, 168, 0.95)',
      midCore: 'rgba(255, 230, 128, 0.96)',
      innerRibbon: 'rgba(168, 255, 223, 0.95)',
      boltPrimary: '#3ee0a8',
      boltSecondary: '#ffe680',
    };
  }
  if (hasPatron('aoguang')) {
    return {
      outerEdge: 'rgba(56, 152, 255, 0.95)',
      midCore: 'rgba(92, 230, 255, 0.96)',
      innerRibbon: 'rgba(255, 225, 110, 0.95)',
      boltPrimary: '#4da6ff',
      boltSecondary: '#5ce6ff',
    };
  }

  // Default Zagreus / Rudra Stance Palette (Blood-Crimson, Lightning Gold, Electric Cyan)
  return {
    outerEdge:
      stance === 'pillar'
        ? 'rgba(56, 232, 255, 0.94)'
        : stance === 'thrust'
        ? 'rgba(232, 62, 255, 0.94)'
        : 'rgba(255, 42, 58, 0.95)',
    midCore: 'rgba(255, 225, 77, 0.96)',
    innerRibbon: 'rgba(56, 232, 255, 0.95)',
    boltPrimary: '#ffe14d',
    boltSecondary: '#38e8ff',
  };
}

/**
 * Hades-style Shadow Strike (Backstab) detection:
 * Returns true if the player is positioned behind the enemy relative to the enemy's facing direction.
 */
export function isShadowStrikeBackstab(input: {
  playerX: number;
  enemyX: number;
  enemyFacing: 1 | -1;
}): boolean {
  const dx = input.playerX - input.enemyX;
  // If enemy faces right (+1), behind is dx < -8; if enemy faces left (-1), behind is dx > 8
  return input.enemyFacing === 1 ? dx < -8 : dx > 8;
}

/**
 * Rolls 3 distinct Celestial Boons not yet owned by the player.
 * Unlocks Duo Boons automatically when the player holds blessings from at least 2 Patrons!
 */
export function rollCelestialBoonOffer(
  ownedBoons: CelestialBoonId[],
  rng: () => number = Math.random
): CelestialBoonSpec[] {
  const ownedSet = new Set(ownedBoons);
  const ownedPatrons = new Set<ImmortalPatronId>();
  ownedBoons.forEach((id) => {
    const found = CELESTIAL_BOONS.find((b) => b.id === id);
    if (found) ownedPatrons.add(found.patronId);
  });

  const pool = CELESTIAL_BOONS.filter((b) => {
    if (ownedSet.has(b.id)) return false;
    if (b.rarity === 'Duo' && b.secondaryPatronId) {
      // Unlock Duo Boon if the player has at least 1 blessing from either patron (or 2+ total boons)
      return (
        (ownedPatrons.has(b.patronId) && ownedPatrons.has(b.secondaryPatronId)) ||
        (ownedBoons.length >= 2 && (ownedPatrons.has(b.patronId) || ownedPatrons.has(b.secondaryPatronId)))
      );
    }
    return true;
  });
  const source = [...pool];

  const picked: CelestialBoonSpec[] = [];
  // If a Duo Boon is eligible, give it a high chance to appear in slot 1!
  const eligibleDuos = source.filter((b) => b.rarity === 'Duo');
  if (eligibleDuos.length > 0 && rng() < 0.65) {
    const duoPick = eligibleDuos[Math.floor(rng() * eligibleDuos.length)];
    picked.push(duoPick);
    const removeIdx = source.findIndex((s) => s.id === duoPick.id);
    if (removeIdx >= 0) source.splice(removeIdx, 1);
  }

  while (picked.length < 3 && source.length > 0) {
    const idx = Math.min(source.length - 1, Math.floor(rng() * source.length));
    picked.push(source[idx]);
    source.splice(idx, 1);
  }
  return picked;
}
