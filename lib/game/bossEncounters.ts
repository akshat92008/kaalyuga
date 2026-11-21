// ============================================================================
// KALIYUGA: PILLAR 2 — BESPOKE 3-PHASE BOSS ENCOUNTERS & ARENA HAZARDS
// Pure, deterministic logic + high-contrast 2.5D canvas rendering for:
// 1. Dundubhi (Chamber 4: Chola Bronze War-Demon) & Vrikodara (Chamber 8: Sovereign of the Infernal Maw)
//    3-Phase Signature Attack Suites with explicit counterplay telegraphs
// 2. Interactive Pillar-Baiting Trajectory & Cracked War-Drum Punish Multiplier
// 3. Vrikodara Arena-Splitting Molten Slag Fissures (point-to-segment hazard & rendering)
// 4. Dundubhi Cymatic Sonic War-Drum Resonance Zones (delayed floor detonation rings)
// ============================================================================

import { MoltenSlagFissure } from '@/engine/lanternShaderEngine';
import {
  drawAdditiveFlipbookCell,
  drawAdditiveFlipbookRowProgress,
  DUNDUBHI_FLIPBOOK_ROWS,
  ISOMETRIC_TELEGRAPH_CELLS,
  PHASE2_VFX_SHEETS,
  VRIKODARA_FLIPBOOK_ROWS,
} from './vfxFlipbook';

export type BossArchetypeId = 'dundubhi' | 'xuemo' | 'vrikodara';
export type BossMoveId = string;

export type BossCounterplayKind =
  | 'parry_gold'
  | 'dodge_crimson'
  | 'bait_pillar'
  | 'pillar_stance_vault'
  | 'dash_outward';

export interface BossSignatureMoveSpec {
  id: string;
  bossType: BossArchetypeId;
  minPhase: 1 | 2 | 3;
  title: string;
  sanskritSubtitle: string;
  counterplayHint: string;
  counterplayKind: BossCounterplayKind;
  attackKind: 'cone' | 'corridor' | 'shockwave';
  windupDurationSec: number;
  telegraphRadiusPx: number;
  corridorLengthPx: number;
  comboFollowups: number;
  damageMultiplier: number;
  spawnsMoltenSlag: boolean;
  spawnsSonicZone: boolean;
  triggersVacuumPull: boolean;
}

export interface SonicDrumZone {
  id: number;
  x: number;
  y: number;
  radius: number;
  timer: number;
  maxTimer: number;
  detonated: boolean;
}

const DUNDUBHI_SIGNATURE_MOVES: BossSignatureMoveSpec[] = [
    {
      id: 'brahmadanda_horn_gore',
      bossType: 'dundubhi',
      minPhase: 1,
      title: 'HORN GORE STAMPEDE',
      sanskritSubtitle: 'BRAHMADANDA SHRINGA-VEGA',
      counterplayHint: 'BAIT CHARGE INTO PILLAR OR [SPACE] SIDESTEP',
      counterplayKind: 'bait_pillar',
      attackKind: 'corridor',
      windupDurationSec: 0.78,
      telegraphRadiusPx: 110,
      corridorLengthPx: 320,
      comboFollowups: 0,
      damageMultiplier: 1.1,
      spawnsMoltenSlag: false,
      spawnsSonicZone: false,
      triggersVacuumPull: false,
    },
    {
      id: 'chola_cymbal_cleave',
      bossType: 'xuemo',
      minPhase: 1,
      title: 'CHOLA BRONZE CLEAVE',
      sanskritSubtitle: 'KAMSYA-CHAKRA PRAHARA',
      counterplayHint: '[Q / MMB] GOLDEN PARRY FOR POSTURE SHATTER',
      counterplayKind: 'parry_gold',
      attackKind: 'cone',
      windupDurationSec: 0.72,
      telegraphRadiusPx: 124,
      corridorLengthPx: 0,
      comboFollowups: 0,
      damageMultiplier: 1.0,
      spawnsMoltenSlag: false,
      spawnsSonicZone: false,
      triggersVacuumPull: false,
    },
    {
      id: 'karna_sonic_drum',
      bossType: 'xuemo',
      minPhase: 1,
      title: 'DUNDUBHI WAR-DRUM PULSE',
      sanskritSubtitle: 'BHUMI-NADA DUNDUBHI',
      counterplayHint: '[TAB] PILLAR STANCE VAULT OR [SPACE] DASH OUT',
      counterplayKind: 'pillar_stance_vault',
      attackKind: 'shockwave',
      windupDurationSec: 0.84,
      telegraphRadiusPx: 138,
      corridorLengthPx: 0,
      comboFollowups: 0,
      damageMultiplier: 1.05,
      spawnsMoltenSlag: false,
      spawnsSonicZone: true,
      triggersVacuumPull: false,
    },
    {
      id: 'rakta_double_gore',
      bossType: 'xuemo',
      minPhase: 2,
      title: 'TWIN-HORN BLOOD STAMPEDE',
      sanskritSubtitle: 'RAKTA-SHRINGA DVANDVA',
      counterplayHint: '2-HIT CHAIN CHARGE · BAIT INTO PILLAR',
      counterplayKind: 'bait_pillar',
      attackKind: 'corridor',
      windupDurationSec: 0.68,
      telegraphRadiusPx: 122,
      corridorLengthPx: 350,
      comboFollowups: 1,
      damageMultiplier: 1.2,
      spawnsMoltenSlag: false,
      spawnsSonicZone: true,
      triggersVacuumPull: false,
    },
    {
      id: 'kurukshetra_bell_quake',
      bossType: 'xuemo',
      minPhase: 2,
      title: 'BELL OF KURUKSHETRA QUAKE',
      sanskritSubtitle: 'MAHA-GHANTA BHUKAMPA',
      counterplayHint: 'UNBLOCKABLE CRIMSON QUAKE · [SPACE] EVADE RING',
      counterplayKind: 'dodge_crimson',
      attackKind: 'shockwave',
      windupDurationSec: 0.76,
      telegraphRadiusPx: 158,
      corridorLengthPx: 0,
      comboFollowups: 1,
      damageMultiplier: 1.25,
      spawnsMoltenSlag: false,
      spawnsSonicZone: true,
      triggersVacuumPull: false,
    },
    {
      id: 'pralaya_triple_trample',
      bossType: 'xuemo',
      minPhase: 3,
      title: 'PRALAYA TRIPLE STAMPEDE',
      sanskritSubtitle: 'PRALAYA-TANDAVA GATI',
      counterplayHint: '3-HIT CATACLYSM · [Q] PARRY FINAL CLEAVE',
      counterplayKind: 'parry_gold',
      attackKind: 'cone',
      windupDurationSec: 0.62,
      telegraphRadiusPx: 146,
      corridorLengthPx: 360,
      comboFollowups: 2,
      damageMultiplier: 1.35,
      spawnsMoltenSlag: false,
      spawnsSonicZone: true,
      triggersVacuumPull: false,
    },
];

export const BOSS_SIGNATURE_MOVES: Record<BossArchetypeId, BossSignatureMoveSpec[]> = {
  dundubhi: DUNDUBHI_SIGNATURE_MOVES,
  xuemo: DUNDUBHI_SIGNATURE_MOVES,
  vrikodara: [
    {
      id: 'agni_furnace_inhale',
      bossType: 'vrikodara',
      minPhase: 1,
      title: 'ABDOMINAL FURNACE VACUUM',
      sanskritSubtitle: 'JATHARAGNI GRAHANA',
      counterplayHint: 'VORTEX PULL · [SPACE] DASH OUTWARD BEFORE SLAM',
      counterplayKind: 'dash_outward',
      attackKind: 'shockwave',
      windupDurationSec: 0.86,
      telegraphRadiusPx: 144,
      corridorLengthPx: 0,
      comboFollowups: 0,
      damageMultiplier: 1.12,
      spawnsMoltenSlag: false,
      spawnsSonicZone: false,
      triggersVacuumPull: true,
    },
    {
      id: 'trishula_iron_sweep',
      bossType: 'vrikodara',
      minPhase: 1,
      title: 'TRISHULA IRON CLEAVE',
      sanskritSubtitle: 'LAUHA-SHULA CHEDANA',
      counterplayHint: '[Q / MMB] GOLDEN PARRY FOR RIPOSTE OPENING',
      counterplayKind: 'parry_gold',
      attackKind: 'cone',
      windupDurationSec: 0.74,
      telegraphRadiusPx: 132,
      corridorLengthPx: 0,
      comboFollowups: 0,
      damageMultiplier: 1.05,
      spawnsMoltenSlag: false,
      spawnsSonicZone: false,
      triggersVacuumPull: false,
    },
    {
      id: 'kurukshetra_chariot_rush',
      bossType: 'vrikodara',
      minPhase: 1,
      title: 'BURNING CHARIOT CRUSH',
      sanskritSubtitle: 'DAHANA-RATHA VEGITA',
      counterplayHint: '[SPACE] DODGE CORRIDOR CHARGE',
      counterplayKind: 'dodge_crimson',
      attackKind: 'corridor',
      windupDurationSec: 0.76,
      telegraphRadiusPx: 118,
      corridorLengthPx: 335,
      comboFollowups: 0,
      damageMultiplier: 1.15,
      spawnsMoltenSlag: false,
      spawnsSonicZone: false,
      triggersVacuumPull: false,
    },
    {
      id: 'vaitarani_slag_eruption',
      bossType: 'vrikodara',
      minPhase: 2,
      title: 'VAITARANI MOLTEN SLAG SPLIT',
      sanskritSubtitle: 'VAITARANI-LAVA SPHOTANA',
      counterplayHint: 'SPLITS ARENA WITH MAGMA FISSURE · AVOID SLAG',
      counterplayKind: 'dodge_crimson',
      attackKind: 'shockwave',
      windupDurationSec: 0.78,
      telegraphRadiusPx: 162,
      corridorLengthPx: 0,
      comboFollowups: 1,
      damageMultiplier: 1.25,
      spawnsMoltenSlag: true,
      spawnsSonicZone: false,
      triggersVacuumPull: true,
    },
    {
      id: 'vrikodara_consume_lunge',
      bossType: 'vrikodara',
      minPhase: 2,
      title: 'JATHARAGNI CONSUME GRAB',
      sanskritSubtitle: 'PRANA-BHAKSHANA GRAHANA',
      counterplayHint: 'VACUUM PULL + ABILITY CONSUME · HEAVY SMASH BELLY TO RECLAIM',
      counterplayKind: 'dash_outward',
      attackKind: 'shockwave',
      windupDurationSec: 0.82,
      telegraphRadiusPx: 168,
      corridorLengthPx: 0,
      comboFollowups: 0,
      damageMultiplier: 1.18,
      spawnsMoltenSlag: false,
      spawnsSonicZone: false,
      triggersVacuumPull: true,
    },
    {
      id: 'rudra_jaw_guillotine',
      bossType: 'vrikodara',
      minPhase: 2,
      title: 'INFERNAL JAW GUILLOTINE',
      sanskritSubtitle: 'NARAKA-DAMSHTRA PATA',
      counterplayHint: '2-HIT CHAIN CLEAVE · [Q] PARRY OR [RMB] SEE-THROUGH',
      counterplayKind: 'parry_gold',
      attackKind: 'cone',
      windupDurationSec: 0.66,
      telegraphRadiusPx: 148,
      corridorLengthPx: 0,
      comboFollowups: 1,
      damageMultiplier: 1.22,
      spawnsMoltenSlag: true,
      spawnsSonicZone: false,
      triggersVacuumPull: false,
    },
    {
      id: 'kalagni_cataclysm_vortex',
      bossType: 'vrikodara',
      minPhase: 3,
      title: 'KALAGNI APOCALYPSE VORTEX',
      sanskritSubtitle: 'KALAGNI-RUDRA SAMHARA',
      counterplayHint: '3-HIT TITAN MAELSTROM · [SPACE] EVADE MAGMA RINGS',
      counterplayKind: 'dash_outward',
      attackKind: 'shockwave',
      windupDurationSec: 0.64,
      telegraphRadiusPx: 178,
      corridorLengthPx: 365,
      comboFollowups: 2,
      damageMultiplier: 1.38,
      spawnsMoltenSlag: true,
      spawnsSonicZone: false,
      triggersVacuumPull: true,
    },
  ],
};

/**
 * Selects a deterministic, distance- and phase-appropriate Signature Move for Dundubhi or Vrikodara.
 */
export function selectBossSignatureMove(params: {
  bossType: BossArchetypeId;
  phase: 1 | 2 | 3;
  attackPatternIndex: number;
  distanceToPlayerPx: number;
  hasIntactPillars: boolean;
}): BossSignatureMoveSpec {
  const normalizedBoss: BossArchetypeId =
    params.bossType === 'xuemo' ? 'dundubhi' : params.bossType;
  const pool = BOSS_SIGNATURE_MOVES[normalizedBoss].filter(
    (m) => m.minPhase <= params.phase
  );
  if (pool.length === 0) {
    return BOSS_SIGNATURE_MOVES[normalizedBoss][0];
  }

  // If Dundubhi is at medium-long range and intact pillars exist, prioritize Horn Gore Stampede so player can bait him!
  if (
    (normalizedBoss === 'dundubhi' || params.bossType === 'xuemo') &&
    params.distanceToPlayerPx > 165 &&
    params.hasIntactPillars &&
    params.attackPatternIndex % 2 === 0
  ) {
    const gore =
      pool.find((m) => m.id === 'rakta_double_gore') ||
      pool.find((m) => m.id === 'brahmadanda_horn_gore');
    if (gore) return gore;
  }

  // If Vrikodara is in Phase 2/3 and pattern index hits slag cycle, prioritize Vaitarani Molten Slag Split
  if (
    params.bossType === 'vrikodara' &&
    params.phase >= 2 &&
    params.attackPatternIndex % 3 === 1
  ) {
    const slagMove =
      params.phase === 3
        ? pool.find((m) => m.id === 'kalagni_cataclysm_vortex')
        : pool.find((m) => m.id === 'vaitarani_slag_eruption');
    if (slagMove) return slagMove;
  }

  const idx = Math.abs(params.attackPatternIndex) % pool.length;
  return pool[idx];
}

/**
 * Computes the damage multiplier against a Boss accounting for:
 * - Dundubhi's 3.0s Tusk-Lodge Punish Window (1.65x bonus damage)
 * - Dundubhi's Intact Bronze War-Drum Armor (0.78x damage until cracked by pillar or heavy slam, 1.25x after cracked)
 * - Vrikodara's Phase 2/3 Exposed Abdominal Furnace Core during recovery (1.35x bonus damage)
 */
export function computeBossVulnerabilityMultiplier(params: {
  bossType: BossArchetypeId;
  phase: 1 | 2 | 3;
  armorCracked: boolean;
  tuskLodgedTimer: number;
  aiState: 'idle' | 'chase' | 'windup' | 'attack' | 'recover' | 'ko';
}): {
  damageMultiplier: number;
  postureMultiplier: number;
  vulnerabilityCallout: string | null;
} {
  if (params.bossType === 'dundubhi' || params.bossType === 'xuemo') {
    if (params.tuskLodgedTimer > 0) {
      return {
        damageMultiplier: 1.65,
        postureMultiplier: 1.85,
        vulnerabilityCallout: 'TUSKS LODGED PUNISH! ×1.65',
      };
    }
    if (params.armorCracked) {
      return {
        damageMultiplier: 1.25,
        postureMultiplier: 1.3,
        vulnerabilityCallout: 'CRACKED DRUM EXPOSED! ×1.25',
      };
    }
    return {
      damageMultiplier: 0.85,
      postureMultiplier: 0.9,
      vulnerabilityCallout: null,
    };
  }

  // Vrikodara: when recovering in Phase 2/3, his unsealed abdominal furnace is open to critical strikes
  if (params.phase >= 2 && params.aiState === 'recover') {
    return {
      damageMultiplier: 1.35,
      postureMultiplier: 1.4,
      vulnerabilityCallout: 'FURNACE CORE EXPOSED! ×1.35',
    };
  }

  return {
    damageMultiplier: 1.0,
    postureMultiplier: 1.0,
    vulnerabilityCallout: null,
  };
}

/**
 * Evaluates whether an actor at (px, py) is standing inside any active Molten Slag Fissure segment.
 */
export function evaluateMoltenSlagHazard(params: {
  px: number;
  py: number;
  elevationY: number;
  fissures: MoltenSlagFissure[];
}): {
  inSlag: boolean;
  burnDamagePerTick: number;
  moveSpeedMultiplier: number;
  closestFissureIndex: number;
} {
  if (params.elevationY > 8 || params.fissures.length === 0) {
    return {
      inSlag: false,
      burnDamagePerTick: 0,
      moveSpeedMultiplier: 1.0,
      closestFissureIndex: -1,
    };
  }

  for (let i = 0; i < params.fissures.length; i++) {
    const f = params.fissures[i];
    if (f.life <= 0) continue;
    const dx = f.x2 - f.x1;
    const dy = f.y2 - f.y1;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0.0001) {
      t = ((params.px - f.x1) * dx + (params.py - f.y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }
    const projX = f.x1 + t * dx;
    const projY = f.y1 + t * dy;
    const dist = Math.hypot(params.px - projX, params.py - projY);
    const halfWidth = Math.max(14, (f.width || 34) * 0.55);
    if (dist <= halfWidth) {
      return {
        inSlag: true,
        burnDamagePerTick: 9,
        moveSpeedMultiplier: 0.76,
        closestFissureIndex: i,
      };
    }
  }

  return {
    inSlag: false,
    burnDamagePerTick: 0,
    moveSpeedMultiplier: 1.0,
    closestFissureIndex: -1,
  };
}

/**
 * Finds the best intact Dragon Pillar near Dundubhi's charge corridor so the UI can highlight it as a Pillar-Bait target.
 */
export function findBaitablePillarOnTrajectory(params: {
  bossX: number;
  bossY: number;
  aimAngle: number;
  endX?: number;
  endY?: number;
  pillars: Array<{ id: number; x: number; y: number; destroyed: boolean; type: string }>;
}) {
  const dx = (params.endX ?? params.bossX + Math.cos(params.aimAngle) * 350) - params.bossX;
  const dy = (params.endY ?? params.bossY + Math.sin(params.aimAngle) * 350) - params.bossY;
  const length = Math.hypot(dx, dy);
  if (!length) return null;
  const ux = dx / length, uy = dy / length;
  const radius = 82;
  let best: { id: number; x: number; y: number; willImpact: boolean; stopX: number; stopY: number } | null = null;
  let bestDistance = Infinity;
  for (const pillar of params.pillars) {
    if (pillar.destroyed || (pillar.type !== 'kurukshetra_pillar' && pillar.type !== 'dragon_pillar')) continue;
    const x = pillar.x - params.bossX, y = pillar.y - params.bossY;
    const along = x * ux + y * uy;
    const side = Math.abs(x * uy - y * ux);
    const entry = Math.max(0, along - Math.sqrt(Math.max(0, radius * radius - side * side)));
    const willImpact = along >= 0 && side <= radius && entry <= length;
    const closest = Math.max(0, Math.min(length, along));
    const distance = willImpact ? entry : Math.hypot(x - closest * ux, y - closest * uy);
    if (best && (best.willImpact && !willImpact || best.willImpact === willImpact && distance >= bestDistance)) continue;
    bestDistance = distance;
    best = { id: pillar.id, x: pillar.x, y: pillar.y, willImpact,
      stopX: params.bossX + ux * entry, stopY: params.bossY + uy * entry };
  }
  return best;
}

/**
 * Renders Vrikodara's Arena-Splitting Molten Slag Geysers (`us4plh` Row 1) &
 * Dundubhi's Sonic War-Drum Resonance Rings (`kogf7y` Row 0) using additive flipbooks.
 */
export function renderBossArenaHazards(
  ctx: CanvasRenderingContext2D,
  timeSec: number,
  slagFissures: MoltenSlagFissure[],
  sonicZones: SonicDrumZone[],
  baitPillar: { x: number; y: number; willImpact: boolean } | null
): void {
  const vrikSheet = PHASE2_VFX_SHEETS.vrikodaraVacuumAndSlag4x2;
  const dundubhiSheet = PHASE2_VFX_SHEETS.dundubhiShockwaveAndShatter4x2;
  const teleSheet = PHASE2_VFX_SHEETS.isometricTelegraphs2x2;

  // 1. Render Vrikodara's Arena-Splitting Molten Slag Fissures using us4plh...png Row 1 (Erupting Molten Slag Geysers)
  for (let i = 0; i < slagFissures.length; i++) {
    const f = slagFissures[i];
    if (f.life <= 0) continue;
    const alpha = Math.min(0.86, f.life / Math.min(1.2, f.maxLife * 0.25));
    const dx = f.x2 - f.x1;
    const dy = f.y2 - f.y1;
    const len = Math.hypot(dx, dy);
    const geyserNodes = Math.max(2, Math.min(5, Math.ceil(len / 75)));

    for (let n = 0; n < geyserNodes; n++) {
      const t = geyserNodes === 1 ? 0.5 : n / (geyserNodes - 1);
      const gx = f.x1 + dx * t;
      const gy = f.y1 + dy * t;
      const animProg = (timeSec * 3.2 + i * 0.37 + n * 0.23) % 1;
      drawAdditiveFlipbookRowProgress(ctx, {
        sheetUrl: vrikSheet.url,
        cols: vrikSheet.cols,
        rows: vrikSheet.rows,
        rowIndex: VRIKODARA_FLIPBOOK_ROWS.MOLTEN_SLAG_GEYSERS,
        progress: animProg,
        x: gx,
        y: gy - 12,
        size: 112,
        scaleX: 1,
        scaleY: 0.86,
        alpha: alpha * 0.82,
      });
    }
  }

  // 2. Render Dundubhi's Cymatic Sonic War-Drum Resonance Zones using isometricTelegraphs2x2 outer boundary + kogf7y Row 0 expanding fill ring
  for (let i = 0; i < sonicZones.length; i++) {
    const z = sonicZones[i];
    if (z.detonated || z.timer <= 0) continue;
    const prog = Math.max(0, Math.min(1, 1 - Math.max(0, z.timer / Math.max(0.01, z.maxTimer))));
    const outerDiameter = z.radius * 2.1;

    // Ground-projected outer isometric mandala boundary showing exact blast radius
    drawAdditiveFlipbookCell(ctx, {
      sheetUrl: teleSheet.url,
      cols: teleSheet.cols,
      rows: teleSheet.rows,
      col: ISOMETRIC_TELEGRAPH_CELLS.BOSS_CIRCULAR_SLAM_MANDALA.col,
      row: ISOMETRIC_TELEGRAPH_CELLS.BOSS_CIRCULAR_SLAM_MANDALA.row,
      x: z.x,
      y: z.y,
      width: outerDiameter,
      rotationRad: (timeSec * 0.9 + i * 0.5) % (Math.PI * 2),
      scaleX: 1,
      scaleY: 0.58,
      alpha: 0.42 + prog * 0.34,
    });

    // Expanding inner concentric bronze sonic ring showing exact fill timing [0 -> 1]
    drawAdditiveFlipbookRowProgress(ctx, {
      sheetUrl: dundubhiSheet.url,
      cols: dundubhiSheet.cols,
      rows: dundubhiSheet.rows,
      rowIndex: DUNDUBHI_FLIPBOOK_ROWS.SONIC_BRONZE_RINGS,
      progress: prog,
      x: z.x,
      y: z.y,
      size: outerDiameter * (0.36 + prog * 0.68),
      scaleX: 1,
      scaleY: 0.58,
      alpha: 0.48 + prog * 0.30,
    });
  }

  // 3. Render Dundubhi Pillar-Baiting Target Mandala during Horn Gore Windup using jjxeuu...png Top-Left
  if (baitPillar) {
    const pulse = 0.65 + 0.35 * Math.sin(timeSec * 9.0);
    drawAdditiveFlipbookCell(ctx, {
      sheetUrl: teleSheet.url,
      cols: teleSheet.cols,
      rows: teleSheet.rows,
      col: ISOMETRIC_TELEGRAPH_CELLS.BOSS_CIRCULAR_SLAM_MANDALA.col,
      row: ISOMETRIC_TELEGRAPH_CELLS.BOSS_CIRCULAR_SLAM_MANDALA.row,
      x: baitPillar.x,
      y: baitPillar.y,
      width: 132,
      rotationRad: (timeSec * 1.4) % (Math.PI * 2),
      scaleX: 1,
      scaleY: 0.62,
      alpha: baitPillar.willImpact ? 0.88 : 0.58 + pulse * 0.24,
    });

    ctx.save();
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = baitPillar.willImpact ? '#d4a548' : '#ffd86b';
    ctx.fillText(
      baitPillar.willImpact
        ? '⚡ PILLAR IMPACT LOCKED! (4.5s ARMOR BREAK)'
        : '🎯 BAIT HORN CHARGE HERE',
      baitPillar.x,
      baitPillar.y - 88
    );
    ctx.restore();
  }
}

export const DUNDUBHI_PILLAR_PUNISH_WINDOW_SEC = 4.5;

export interface DundubhiPillarShatterResult {
  shattered: boolean;
  punishWindowSec: number;
  selfDamageRatio: number;
  bannerText: string;
}

/**
 * Resolves Dundubhi colliding with a Kurukshetra Pillar during his Horn-Charge Corridor,
 * triggering a dramatic pillar-shatter + long 4.5s armor-broken punish window.
 */
export function resolveDundubhiPillarCollision(): DundubhiPillarShatterResult {
  return {
    shattered: true,
    punishWindowSec: DUNDUBHI_PILLAR_PUNISH_WINDOW_SEC,
    selfDamageRatio: 0.14,
    bannerText: 'PILLAR SHATTERED! DUNDUBHI ARMOR BROKEN (4.5s PUNISH)',
  };
}

/**
 * Evaluates whether a target at (targetX, targetY) is inside Vrikodara's active
 * attack telegraph or safely inside one of the fair dash/outward-escape gaps.
 */
export function evaluateVrikodaraTelegraphHit(params: {
  moveId: BossMoveId | undefined;
  bossX: number;
  bossY: number;
  bossAttackAngle: number;
  targetX: number;
  targetY: number;
  targetRadius: number;
}): { hit: boolean; inSafeEscapeGap: boolean } {
  const dx = params.targetX - params.bossX;
  const dy = params.targetY - params.bossY;
  const dist = Math.hypot(dx, dy);
  const angleToTarget = Math.atan2(dy, dx);

  let relAngle = angleToTarget - params.bossAttackAngle;
  while (relAngle > Math.PI) relAngle -= Math.PI * 2;
  while (relAngle < -Math.PI) relAngle += Math.PI * 2;

  if (params.moveId === 'agni_furnace_inhale') {
    // Abdominal Furnace Vacuum Pull: fair outward-escape gap outside 158px core blast radius
    const blastCoreRadius = 158 + params.targetRadius * 0.5;
    const hit = dist <= blastCoreRadius;
    return { hit, inSafeEscapeGap: !hit };
  }

  if (params.moveId === 'vaitarani_slag_eruption') {
    // Molten Slag Arc: 3 radial magma prongs at [-0.68, 0, +0.68] rad, each ±0.21 rad wide, max range 275px
    const maxRange = 275 + params.targetRadius * 0.5;
    if (dist > maxRange) {
      return { hit: false, inSafeEscapeGap: true };
    }
    const prongOffsets = [-0.68, 0, 0.68];
    const prongHalfArc = 0.21;
    for (const offset of prongOffsets) {
      let diff = relAngle - offset;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) <= prongHalfArc) {
        return { hit: true, inSafeEscapeGap: false };
      }
    }
    // Player is between the molten slag prongs in a safe wedge gap!
    return { hit: false, inSafeEscapeGap: true };
  }

  if (
    params.moveId === 'rudra_jaw_guillotine' ||
    params.moveId === 'kalagni_cataclysm_vortex'
  ) {
    // Phase 2 Eclipse Twin-Trident Sweep: wide frontal double-crescent arc, leaving rear & outer escape gap
    const isCataclysm = params.moveId === 'kalagni_cataclysm_vortex';
    const maxRadius = (isCataclysm ? 245 : 210) + params.targetRadius * 0.5;
    const sweepHalfArc = isCataclysm ? 1.18 : 1.02;
    if (dist <= maxRadius && Math.abs(relAngle) <= sweepHalfArc) {
      return { hit: true, inSafeEscapeGap: false };
    }
    return { hit: false, inSafeEscapeGap: true };
  }

  return { hit: dist <= 185, inSafeEscapeGap: dist > 185 };
}

/**
 * Exact 3-phase thresholds for Vrikodara (Chamber 8):
 * - Phase 1: 100% -> 65% HP (Embermaw Mace, slower heavy slams)
 * - Phase 2: 65% -> 25% HP (Blood Eclipse MP4 swap, Vacuum Pull + Consume ability)
 * - Phase 3: < 25% HP (Molten Slag Geysers & fastest cadence)
 */
export function computeVrikodaraPhase(currentHp: number, maxHp: number): 1 | 2 | 3 {
  const ratio = maxHp > 0 ? currentHp / maxHp : 0;
  if (ratio > 0.65) return 1;
  if (ratio >= 0.25) return 2;
  return 3;
}

export const SEMI_BOSS_GUARD_BREAK_PUNISH_SEC = 1.8;

export interface SemiBossGuardBreakInput {
  isGuarding: boolean;
  isFromBehind: boolean;
  attackKind: 'light' | 'heavy' | 'parry_riposte' | 'finisher' | 'astra';
}

export interface SemiBossGuardBreakResult {
  deflected: boolean;
  guardBroken: boolean;
  punishDurationSec: number;
  damageMultiplier: number;
  postureDamageBonus: number;
  calloutText: string;
}

/**
 * Semi-Boss Sword & Shield (Molten_Oni_Aegis):
 * Frontal Light spam is deflected cleanly until the player either:
 * - Dashes behind his back (Backstab bypasses & cracks guard),
 * - Lands an Iron Guard Parry / Riposte, or
 * - Lands a Heavy Smash / Finisher to shatter his Molten_Oni_Aegis for a 1.8s punish window.
 */
export function evaluateSemiBossGuardBreak(
  input: SemiBossGuardBreakInput
): SemiBossGuardBreakResult {
  if (!input.isGuarding) {
    return {
      deflected: false,
      guardBroken: false,
      punishDurationSec: 0,
      damageMultiplier: input.isFromBehind ? 1.35 : 1.0,
      postureDamageBonus: 0,
      calloutText: '',
    };
  }

  if (
    input.isFromBehind ||
    input.attackKind === 'heavy' ||
    input.attackKind === 'parry_riposte' ||
    input.attackKind === 'finisher'
  ) {
    return {
      deflected: false,
      guardBroken: true,
      punishDurationSec: SEMI_BOSS_GUARD_BREAK_PUNISH_SEC,
      damageMultiplier: 1.45,
      postureDamageBonus: 85,
      calloutText: input.isFromBehind
        ? 'AEGIS FLANKED! GUARD SHATTERED (1.8s PUNISH)'
        : 'MOLTEN AEGIS CRACKED! (1.8s PUNISH)',
    };
  }

  return {
    deflected: true,
    guardBroken: false,
    punishDurationSec: 0,
    damageMultiplier: 0.15,
    postureDamageBonus: 6,
    calloutText: 'MOLTEN AEGIS DEFLECT · DASH BEHIND / HEAVY SMASH / PARRY',
  };
}

export type ConsumableAbilitySlot = 'astra' | 'parry';
export const VRIKODARA_CONSUME_DURATION_SEC = 8.0;

export function selectConsumeAbility(
  currentConsumed: ConsumableAbilitySlot | null,
  attackIndex: number
): ConsumableAbilitySlot {
  if (currentConsumed === 'astra') return 'parry';
  if (currentConsumed === 'parry') return 'astra';
  return attackIndex % 2 === 0 ? 'astra' : 'parry';
}

export const VRIKODARA_INHALE_HEAL_RATIO = 0.04;
export const VRIKODARA_FURNACE_EMPOWER_SEC = 7.0;

export function resolveVrikodaraInhaleImpact(params: {
  connectedOnPlayer: boolean;
  interruptedDuringWindup: boolean;
  currentHp: number;
  maxHp: number;
  attackIndex: number;
  currentConsumed: ConsumableAbilitySlot | null;
}): {
  cancelledWindup: boolean;
  staggerSec: number;
  healedAmount: number;
  nextHp: number;
  furnaceEmpoweredSec: number;
  consumedSlot: ConsumableAbilitySlot | null;
  calloutText: string;
} {
  if (params.interruptedDuringWindup) {
    return {
      cancelledWindup: true,
      staggerSec: 1.4,
      healedAmount: 0,
      nextHp: params.currentHp,
      furnaceEmpoweredSec: 0,
      consumedSlot: null,
      calloutText: 'FURNACE INHALE INTERRUPTED! (STAGGERED)',
    };
  }
  if (!params.connectedOnPlayer) {
    return {
      cancelledWindup: false,
      staggerSec: 0,
      healedAmount: 0,
      nextHp: params.currentHp,
      furnaceEmpoweredSec: 0,
      consumedSlot: null,
      calloutText: '',
    };
  }
  const healedAmount = Math.max(12, Math.round(params.maxHp * VRIKODARA_INHALE_HEAL_RATIO));
  const nextHp = Math.min(params.maxHp, params.currentHp + healedAmount);
  const consumedSlot = selectConsumeAbility(params.currentConsumed, params.attackIndex);
  return {
    cancelledWindup: false,
    staggerSec: 0,
    healedAmount,
    nextHp,
    furnaceEmpoweredSec: VRIKODARA_FURNACE_EMPOWER_SEC,
    consumedSlot,
    calloutText: `VRIKODARA CONSUMED ${consumedSlot.toUpperCase()}! +${healedAmount} HP & FURNACE EMPOWER`,
  };
}

export function resolveConsumeFurnacePunish(params: {
  consumedAbility: ConsumableAbilitySlot | null;
  attackKind: 'light' | 'heavy' | 'finisher' | 'parry_riposte' | 'astra';
  furnaceExposed: boolean;
}): {
  freedAbility: ConsumableAbilitySlot | null;
  pranaBurst: number;
  calloutText: string;
} {
  if (!params.consumedAbility) {
    return { freedAbility: null, pranaBurst: 0, calloutText: '' };
  }
  const canBurst =
    params.furnaceExposed &&
    (params.attackKind === 'heavy' ||
      params.attackKind === 'finisher' ||
      params.attackKind === 'parry_riposte');
  if (!canBurst) {
    return { freedAbility: null, pranaBurst: 0, calloutText: '' };
  }
  return {
    freedAbility: params.consumedAbility,
    pranaBurst: 35,
    calloutText: `FURNACE RUPTURED! ${params.consumedAbility.toUpperCase()} RECLAIMED (+35 PRANA)`,
  };
}


