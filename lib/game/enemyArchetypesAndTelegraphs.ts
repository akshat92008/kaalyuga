import type { BossMoveId } from './bossEncounters';
import {
  drawAdditiveFlipbookCell,
  drawAdditiveFlipbookRowProgress,
  DUNDUBHI_FLIPBOOK_ROWS,
  ISOMETRIC_TELEGRAPH_CELLS,
  PHASE2_VFX_SHEETS,
  VRIKODARA_FLIPBOOK_ROWS,
} from './vfxFlipbook';

export type EnemyType =
  | 'charnel_ghoul'
  | 'ashen_oracle'
  | 'ironmaw_gladiator'
  | 'bloodmaw_brute'
  | 'semi_boss_bloodforge'
  | 'dundubhi'
  | 'wolf_guai'
  | 'fire_monk'
  | 'stone_golem'
  | 'furnace_titan'
  | 'xuemo'
  | 'vrikodara';

export const CHARNEL_GHOUL_POUNCE_WINDUP_SEC = 0.38; // 380ms fast pounce with red lunge line
export const ASHEN_ORACLE_YANTRA_WINDUP_SEC = 0.65; // 650ms Vedic ground yantra circle + ranged curse orb
export const IRONMAW_GLADIATOR_SLAM_WINDUP_SEC = 0.55; // 550ms heavy overhead slam vulnerable to Dash-behind backstab

export type ArchetypeTelegraphShape =
  | 'red_lunge_line'
  | 'vedic_yantra_fill'
  | 'overhead_slam_sector'
  | 'dundubhi_horn_corridor'
  | 'vrikodara_furnace_vacuum'
  | 'vrikodara_molten_slag_arc'
  | 'vrikodara_eclipse_twin_sweep'
  | 'standard_cone';

export interface Act1ArchetypeAttackSpec {
  windupSec: number;
  recoverySec: number;
  attackKind: 'cone' | 'corridor' | 'aoe' | 'projectile';
  telegraphShape: ArchetypeTelegraphShape;
  attackAngle: number;
  pounceRangePx: number;
  yantraRadiusPx: number;
  slamArcRad: number;
  slamRangePx: number;
  frontShieldActiveInChase: boolean;
  opensInWindupAndRecovery: boolean;
  backstabBonusMultiplier: number;
  telegraphLabel: string;
}

export function computeAct1ArchetypeAttackSpec(params: {
  enemyType: EnemyType;
  enemyX: number;
  enemyY: number;
  playerX: number;
  playerY: number;
}): Act1ArchetypeAttackSpec {
  const dx = params.playerX - params.enemyX;
  const dy = params.playerY - params.enemyY;
  const dist = Math.hypot(dx, dy);
  const attackAngle = Math.atan2(dy, dx);

  if (params.enemyType === 'charnel_ghoul' || params.enemyType === 'wolf_guai') {
    // Charnel Ghoul: Fast pounce with directional chevron runway (380ms windup)
    const pounceRangePx = Math.max(155, Math.min(285, dist + 42));
    return {
      windupSec: CHARNEL_GHOUL_POUNCE_WINDUP_SEC,
      recoverySec: 0.42,
      attackKind: 'corridor',
      telegraphShape: 'red_lunge_line',
      attackAngle,
      pounceRangePx,
      yantraRadiusPx: 0,
      slamArcRad: 0.9,
      slamRangePx: pounceRangePx,
      frontShieldActiveInChase: false,
      opensInWindupAndRecovery: true,
      backstabBonusMultiplier: 1.25,
      telegraphLabel: 'POUNCE LUNGE · 380ms',
    };
  }

  if (params.enemyType === 'ashen_oracle' || params.enemyType === 'fire_monk') {
    // Ashen Oracle: Ranged curse orb + Vedic ground yantra lotus sigil (650ms fill before burst)
    return {
      windupSec: ASHEN_ORACLE_YANTRA_WINDUP_SEC,
      recoverySec: 0.52,
      attackKind: 'projectile',
      telegraphShape: 'vedic_yantra_fill',
      attackAngle,
      pounceRangePx: 0,
      yantraRadiusPx: 92,
      slamArcRad: Math.PI * 2,
      slamRangePx: 92,
      frontShieldActiveInChase: false,
      opensInWindupAndRecovery: true,
      backstabBonusMultiplier: 1.3,
      telegraphLabel: 'VEDIC YANTRA + CURSE ORB · 650ms',
    };
  }

  if (
    params.enemyType === 'ironmaw_gladiator' ||
    params.enemyType === 'bloodmaw_brute' ||
    params.enemyType === 'semi_boss_bloodforge' ||
    params.enemyType === 'stone_golem' ||
    params.enemyType === 'furnace_titan'
  ) {
    // Ironmaw Gladiator / Bloodmaw Brute / Semi-Boss: Front shield block that opens during windup/recovery, heavy overhead slam (550ms windup) vulnerable to Dash-behind backstab
    const isHeavy =
      params.enemyType === 'bloodmaw_brute' ||
      params.enemyType === 'semi_boss_bloodforge' ||
      params.enemyType === 'furnace_titan';
    return {
      windupSec: IRONMAW_GLADIATOR_SLAM_WINDUP_SEC,
      recoverySec: 0.95,
      attackKind: 'cone',
      telegraphShape: 'overhead_slam_sector',
      attackAngle,
      pounceRangePx: 0,
      yantraRadiusPx: 0,
      slamArcRad: 1.28,
      slamRangePx: isHeavy ? 148 : 132,
      frontShieldActiveInChase: true,
      opensInWindupAndRecovery: true,
      backstabBonusMultiplier: 1.55,
      telegraphLabel: 'OVERHEAD SLAM · DASH BEHIND [SPACE]',
    };
  }

  return {
    windupSec: 0.58,
    recoverySec: 0.55,
    attackKind: 'cone',
    telegraphShape: 'standard_cone',
    attackAngle,
    pounceRangePx: 0,
    yantraRadiusPx: 0,
    slamArcRad: 1.35,
    slamRangePx: 115,
    frontShieldActiveInChase: false,
    opensInWindupAndRecovery: true,
    backstabBonusMultiplier: 1.25,
    telegraphLabel: 'STRIKE',
  };
}

export interface IronmawShieldEvaluation {
  isFrontShieldBlocking: boolean;
  isVulnerableWindowOpen: boolean;
  isBackstabAngle: boolean;
  damageMultiplier: number;
}

export function evaluateIronmawGladiatorDefense(params: {
  enemyType: EnemyType;
  aiState: 'chase' | 'windup' | 'attack' | 'recover' | 'hurt' | 'dead';
  ironGuardTimer: number;
  postureBrokenTimer: number;
  enemyFacingAngle: number;
  enemyX: number;
  enemyY: number;
  attackerX: number;
  attackerY: number;
}): IronmawShieldEvaluation {
  const isGladiator =
    params.enemyType === 'ironmaw_gladiator' ||
    params.enemyType === 'bloodmaw_brute' ||
    params.enemyType === 'semi_boss_bloodforge' ||
    params.enemyType === 'stone_golem' ||
    params.enemyType === 'furnace_titan';

  const toAttackerAngle = Math.atan2(
    params.attackerY - params.enemyY,
    params.attackerX - params.enemyX,
  );
  let angleDiff = toAttackerAngle - params.enemyFacingAngle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  const isFrontCone = Math.abs(angleDiff) <= Math.PI * 0.48;
  const isBackstabAngle = Math.abs(angleDiff) >= Math.PI * 0.56;

  if (!isGladiator) {
    return {
      isFrontShieldBlocking: params.ironGuardTimer > 0 && isFrontCone,
      isVulnerableWindowOpen:
        params.aiState === 'windup' ||
        params.aiState === 'recover' ||
        params.postureBrokenTimer > 0,
      isBackstabAngle,
      damageMultiplier: isBackstabAngle ? 1.25 : 1.0,
    };
  }

  const isVulnerableWindowOpen =
    params.aiState === 'windup' ||
    params.aiState === 'attack' ||
    params.aiState === 'recover' ||
    params.aiState === 'hurt' ||
    params.postureBrokenTimer > 0;

  const isFrontShieldBlocking =
    !isVulnerableWindowOpen &&
    isFrontCone &&
    (params.aiState === 'chase' || params.ironGuardTimer > 0);

  let damageMultiplier = 1.0;
  if (isBackstabAngle && isVulnerableWindowOpen) {
    damageMultiplier = 1.55;
  } else if (isBackstabAngle) {
    damageMultiplier = 1.35;
  } else if (isFrontShieldBlocking) {
    damageMultiplier = 0.25;
  }

  return {
    isFrontShieldBlocking,
    isVulnerableWindowOpen,
    isBackstabAngle,
    damageMultiplier,
  };
}

export interface TelegraphRenderTarget {
  type: EnemyType;
  isBoss: boolean;
  x: number;
  y: number;
  radius: number;
  aiState: 'chase' | 'windup' | 'attack' | 'recover' | 'hurt' | 'dead';
  aiTimer: number;
  windupDuration: number;
  attackAngle: number;
  attackKind?: 'cone' | 'corridor' | 'aoe' | 'projectile';
  activeBossMoveId?: BossMoveId;
  activeBossMoveName?: string;
  pounceTargetX?: number;
  pounceTargetY?: number;
  yantraTargetX?: number;
  yantraTargetY?: number;
  yantraRadius?: number;
}

export interface TelegraphFlipbookStampSpec {
  sheetUrl: string;
  cols: number;
  rows: number;
  col: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height?: number;
  rotationRad: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
}

/**
 * Pure, deterministic planner that maps any Act I Enemy Archetype or Boss windup into
 * hand-painted `#000000` flipbook stamps (`jjxeuu` 2x2 Isometric Telegraphs, `kogf7y` Dundubhi
 * sonic rings, and `us4plh` Vrikodara furnace vortex & molten slag geysers).
 */
export function resolveEnemyAndBossTelegraphFlipbookPlan(
  e: TelegraphRenderTarget,
  nowMs: number,
  pillars?: Array<{ x: number; y: number; radius: number; hp: number }>
): TelegraphFlipbookStampSpec[] {
  if (e.aiState !== 'windup') return [];

  const totalWindup = Math.max(0.15, e.windupDuration || 0.55);
  const progress = Math.max(0, Math.min(1, 1 - e.aiTimer / totalWindup));
  const isParryFlash = e.aiTimer <= 0.22 && e.aiTimer > 0.02;
  const baseAlpha = isParryFlash ? 0.88 : 0.48 + progress * 0.38;
  const teleSheet = PHASE2_VFX_SHEETS.isometricTelegraphs2x2;
  const stamps: TelegraphFlipbookStampSpec[] = [];

  // 1. CHARNEL GHOUL (`charnel_ghoul` / `wolf_guai`) — Directional Dash/Charge Chevron Runway (Top-Right cell 1,0)
  if (!e.isBoss && (e.type === 'charnel_ghoul' || e.type === 'wolf_guai')) {
    const angle = e.attackAngle;
    const targetX = e.pounceTargetX ?? e.x + Math.cos(angle) * 220;
    const targetY = e.pounceTargetY ?? e.y + Math.sin(angle) * 220;
    const dist = Math.max(90, Math.hypot(targetX - e.x, targetY - e.y));
    const midX = e.x + Math.cos(angle) * (dist * 0.5);
    const midY = e.y + Math.sin(angle) * (dist * 0.5);

    stamps.push({
      sheetUrl: teleSheet.url,
      cols: teleSheet.cols,
      rows: teleSheet.rows,
      col: ISOMETRIC_TELEGRAPH_CELLS.DIRECTIONAL_CHEVRON_RUNWAY.col,
      row: ISOMETRIC_TELEGRAPH_CELLS.DIRECTIONAL_CHEVRON_RUNWAY.row,
      x: midX,
      y: midY,
      width: dist * 1.05,
      height: 82,
      rotationRad: angle,
      scaleX: 1,
      scaleY: 0.65,
      alpha: baseAlpha,
    });
    return stamps;
  }

  // 2. ASHEN ORACLE (`ashen_oracle` / `fire_monk`) — Aghori Oracle Curse Lotus Sigil (Bottom-Left cell 0,1)
  if (!e.isBoss && (e.type === 'ashen_oracle' || e.type === 'fire_monk')) {
    const yantraX = e.yantraTargetX ?? e.x + Math.cos(e.attackAngle) * 190;
    const yantraY = e.yantraTargetY ?? e.y + Math.sin(e.attackAngle) * 190;
    const yantraR = e.yantraRadius ?? 92;

    // Ground lotus sigil at target coordinates
    stamps.push({
      sheetUrl: teleSheet.url,
      cols: teleSheet.cols,
      rows: teleSheet.rows,
      col: ISOMETRIC_TELEGRAPH_CELLS.ORACLE_CURSE_LOTUS_SIGIL.col,
      row: ISOMETRIC_TELEGRAPH_CELLS.ORACLE_CURSE_LOTUS_SIGIL.row,
      x: yantraX,
      y: yantraY,
      width: yantraR * (1.55 + progress * 0.65),
      rotationRad: (nowMs * 0.0014) % (Math.PI * 2),
      scaleX: 1,
      scaleY: 0.64,
      alpha: baseAlpha,
    });

    // Secondary casting sigil under the Oracle
    stamps.push({
      sheetUrl: teleSheet.url,
      cols: teleSheet.cols,
      rows: teleSheet.rows,
      col: ISOMETRIC_TELEGRAPH_CELLS.ORACLE_CURSE_LOTUS_SIGIL.col,
      row: ISOMETRIC_TELEGRAPH_CELLS.ORACLE_CURSE_LOTUS_SIGIL.row,
      x: e.x,
      y: e.y,
      width: 78,
      rotationRad: -(nowMs * 0.002) % (Math.PI * 2),
      scaleX: 1,
      scaleY: 0.58,
      alpha: baseAlpha * 0.72,
    });
    return stamps;
  }

  // 3. IRONMAW GLADIATOR / BLOODMAW BRUTE / SEMI-BOSS — Elite Circular Slam Mandala (Top-Left 0,0) + Cleave Cone (Bottom-Right 1,1)
  if (
    !e.isBoss &&
    (e.type === 'ironmaw_gladiator' ||
      e.type === 'bloodmaw_brute' ||
      e.type === 'semi_boss_bloodforge' ||
      e.type === 'stone_golem' ||
      e.type === 'furnace_titan')
  ) {
    const isHeavy =
      e.type === 'bloodmaw_brute' ||
      e.type === 'semi_boss_bloodforge' ||
      e.type === 'furnace_titan';
    const slamRadius = isHeavy ? 148 : 132;
    const coneCenterDist = slamRadius * 0.48;
    stamps.push({
      sheetUrl: teleSheet.url,
      cols: teleSheet.cols,
      rows: teleSheet.rows,
      col: ISOMETRIC_TELEGRAPH_CELLS.BOSS_CIRCULAR_SLAM_MANDALA.col,
      row: ISOMETRIC_TELEGRAPH_CELLS.BOSS_CIRCULAR_SLAM_MANDALA.row,
      x: e.x + Math.cos(e.attackAngle) * coneCenterDist,
      y: e.y + Math.sin(e.attackAngle) * coneCenterDist * 0.65,
      width: slamRadius * (1.15 + progress * 0.35),
      rotationRad: e.attackAngle,
      scaleX: 1,
      scaleY: 0.62,
      alpha: baseAlpha,
    });
    stamps.push({
      sheetUrl: teleSheet.url,
      cols: teleSheet.cols,
      rows: teleSheet.rows,
      col: ISOMETRIC_TELEGRAPH_CELLS.CLEAVE_BREATH_CONE_WARNING.col,
      row: ISOMETRIC_TELEGRAPH_CELLS.CLEAVE_BREATH_CONE_WARNING.row,
      x: e.x + Math.cos(e.attackAngle) * (coneCenterDist * 0.85),
      y: e.y + Math.sin(e.attackAngle) * (coneCenterDist * 0.85) * 0.65,
      width: slamRadius * (1.2 + progress * 0.35),
      rotationRad: e.attackAngle,
      scaleX: 1,
      scaleY: 0.66,
      alpha: baseAlpha * 0.85,
    });
    return stamps;
  }

  // 4. DUNDUBHI (`dundubhi` / `xuemo`) — Horn-Charge Corridor (Top-Right cell 1,0) OR Sonic Slam (Top-Left cell 0,0 + kogf7y Row 0)
  if (e.isBoss && (e.type === 'dundubhi' || e.type === 'xuemo')) {
    if (
      e.attackKind === 'corridor' ||
      e.activeBossMoveId === 'rakta_stampede_charge'
    ) {
      const corridorLen = 520;
      const cosA = Math.cos(e.attackAngle);
      const sinA = Math.sin(e.attackAngle);

      // Stamp 2 linked Chevron Runway segments along the 520px charge trajectory
      for (const segFrac of [0.32, 0.74]) {
        stamps.push({
          sheetUrl: teleSheet.url,
          cols: teleSheet.cols,
          rows: teleSheet.rows,
          col: ISOMETRIC_TELEGRAPH_CELLS.DIRECTIONAL_CHEVRON_RUNWAY.col,
          row: ISOMETRIC_TELEGRAPH_CELLS.DIRECTIONAL_CHEVRON_RUNWAY.row,
          x: e.x + cosA * (corridorLen * segFrac),
          y: e.y + sinA * (corridorLen * segFrac),
          width: 280,
          height: 118,
          rotationRad: e.attackAngle,
          scaleX: 1,
          scaleY: 0.65,
          alpha: baseAlpha,
        });
      }

      // Highlight any Kurukshetra Pillar intersecting the charge corridor using Top-Left Circular Slam Mandala
      if (pillars && pillars.length > 0) {
        const halfWidth = Math.max(46, e.radius * 0.92);
        for (const pillar of pillars) {
          if (pillar.hp <= 0) continue;
          const relX = pillar.x - e.x;
          const relY = pillar.y - e.y;
          const along = relX * cosA + relY * sinA;
          const perp = Math.abs(-relX * sinA + relY * cosA);
          if (
            along > 20 &&
            along <= corridorLen + 30 &&
            perp <= halfWidth + pillar.radius + 18
          ) {
            stamps.push({
              sheetUrl: teleSheet.url,
              cols: teleSheet.cols,
              rows: teleSheet.rows,
              col: ISOMETRIC_TELEGRAPH_CELLS.BOSS_CIRCULAR_SLAM_MANDALA.col,
              row: ISOMETRIC_TELEGRAPH_CELLS.BOSS_CIRCULAR_SLAM_MANDALA.row,
              x: pillar.x,
              y: pillar.y,
              width: (pillar.radius + 42) * 2,
              rotationRad: (nowMs * 0.002) % (Math.PI * 2),
              scaleX: 1,
              scaleY: 0.62,
              alpha: 0.86,
            });
          }
        }
      }
      return stamps;
    }

    // Dundubhi AoE / Cone slam: Top-Left Boss Circular Slam Mandala + kogf7y Row 0 Sonic Bronze Rings
    const dundubhiSheet = PHASE2_VFX_SHEETS.dundubhiShockwaveAndShatter4x2;
    const frameCol = Math.min(3, Math.floor(progress * 4));
    stamps.push({
      sheetUrl: teleSheet.url,
      cols: teleSheet.cols,
      rows: teleSheet.rows,
      col:
        e.attackKind === 'aoe'
          ? ISOMETRIC_TELEGRAPH_CELLS.BOSS_CIRCULAR_SLAM_MANDALA.col
          : ISOMETRIC_TELEGRAPH_CELLS.CLEAVE_BREATH_CONE_WARNING.col,
      row:
        e.attackKind === 'aoe'
          ? ISOMETRIC_TELEGRAPH_CELLS.BOSS_CIRCULAR_SLAM_MANDALA.row
          : ISOMETRIC_TELEGRAPH_CELLS.CLEAVE_BREATH_CONE_WARNING.row,
      x: e.x + (e.attackKind === 'aoe' ? 0 : Math.cos(e.attackAngle) * 72),
      y: e.y + (e.attackKind === 'aoe' ? 0 : Math.sin(e.attackAngle) * 48),
      width: e.attackKind === 'aoe' ? 280 : 225,
      rotationRad: e.attackAngle,
      scaleX: 1,
      scaleY: 0.62,
      alpha: baseAlpha,
    });
    stamps.push({
      sheetUrl: dundubhiSheet.url,
      cols: dundubhiSheet.cols,
      rows: dundubhiSheet.rows,
      col: frameCol,
      row: DUNDUBHI_FLIPBOOK_ROWS.SONIC_BRONZE_RINGS,
      x: e.x,
      y: e.y,
      width: 240 * (0.7 + progress * 0.45),
      rotationRad: 0,
      scaleX: 1,
      scaleY: 0.62,
      alpha: baseAlpha * 0.85,
    });
    return stamps;
  }

  // 5. VRIKODARA (`furnace_titan` / `vrikodara` Boss) — 3 Distinct Phase Ground Flipbook Telegraphs
  if (e.isBoss && (e.type === 'furnace_titan' || e.type === 'vrikodara')) {
    const moveId = e.activeBossMoveId;
    const vrikSheet = PHASE2_VFX_SHEETS.vrikodaraVacuumAndSlag4x2;
    const frameCol = Math.min(3, Math.floor(progress * 4));

    // 5A. Abdominal Furnace Vacuum Pull (`agni_furnace_inhale`) -> us4plh Row 0 Vortex + Top-Left Circular Slam Mandala
    if (moveId === 'agni_furnace_inhale') {
      stamps.push({
        sheetUrl: teleSheet.url,
        cols: teleSheet.cols,
        rows: teleSheet.rows,
        col: ISOMETRIC_TELEGRAPH_CELLS.BOSS_CIRCULAR_SLAM_MANDALA.col,
        row: ISOMETRIC_TELEGRAPH_CELLS.BOSS_CIRCULAR_SLAM_MANDALA.row,
        x: e.x,
        y: e.y,
        width: 310 * (0.75 + progress * 0.35),
        rotationRad: (nowMs * 0.0018) % (Math.PI * 2),
        scaleX: 1,
        scaleY: 0.6,
        alpha: baseAlpha,
      });
      stamps.push({
        sheetUrl: vrikSheet.url,
        cols: vrikSheet.cols,
        rows: vrikSheet.rows,
        col: frameCol,
        row: VRIKODARA_FLIPBOOK_ROWS.FURNACE_GRAVITATIONAL_VORTEX,
        x: e.x,
        y: e.y - 26,
        width: 235,
        rotationRad: -(nowMs * 0.0032) % (Math.PI * 2),
        scaleX: 1,
        scaleY: 0.72,
        alpha: 0.85,
      });
      return stamps;
    }

    // 5B. Molten Slag Arc (`vaitarani_slag_eruption`) -> 3 Radial Cleave Cones (Bottom-Right cell 1,1) + us4plh Row 1 Slag Geysers
    if (moveId === 'vaitarani_slag_eruption') {
      const prongOffsets = [-0.68, 0, 0.68];
      for (const offset of prongOffsets) {
        const centerAngle = e.attackAngle + offset;
        const coneDist = 115;
        stamps.push({
          sheetUrl: teleSheet.url,
          cols: teleSheet.cols,
          rows: teleSheet.rows,
          col: ISOMETRIC_TELEGRAPH_CELLS.CLEAVE_BREATH_CONE_WARNING.col,
          row: ISOMETRIC_TELEGRAPH_CELLS.CLEAVE_BREATH_CONE_WARNING.row,
          x: e.x + Math.cos(centerAngle) * coneDist,
          y: e.y + Math.sin(centerAngle) * coneDist * 0.65,
          width: 195 * (0.75 + progress * 0.3),
          rotationRad: centerAngle,
          scaleX: 1,
          scaleY: 0.56,
          alpha: baseAlpha,
        });
        stamps.push({
          sheetUrl: vrikSheet.url,
          cols: vrikSheet.cols,
          rows: vrikSheet.rows,
          col: frameCol,
          row: VRIKODARA_FLIPBOOK_ROWS.MOLTEN_SLAG_GEYSERS,
          x: e.x + Math.cos(centerAngle) * (155 * (0.45 + progress * 0.55)),
          y: e.y + Math.sin(centerAngle) * (155 * (0.45 + progress * 0.55)) * 0.65,
          width: 124,
          rotationRad: 0,
          scaleX: 1,
          scaleY: 0.85,
          alpha: baseAlpha * 0.88,
        });
      }
      return stamps;
    }

    // 5C. Phase 2 Eclipse Twin-Trident Sweep (`rudra_jaw_guillotine` / `kalagni_cataclysm_vortex`)
    const isCataclysm = moveId === 'kalagni_cataclysm_vortex';
    const sweepWidth = isCataclysm ? 285 : 240;
    stamps.push({
      sheetUrl: teleSheet.url,
      cols: teleSheet.cols,
      rows: teleSheet.rows,
      col: ISOMETRIC_TELEGRAPH_CELLS.CLEAVE_BREATH_CONE_WARNING.col,
      row: ISOMETRIC_TELEGRAPH_CELLS.CLEAVE_BREATH_CONE_WARNING.row,
      x: e.x + Math.cos(e.attackAngle) * 78,
      y: e.y + Math.sin(e.attackAngle) * 52,
      width: sweepWidth * (0.8 + progress * 0.28),
      rotationRad: e.attackAngle,
      scaleX: 1.12,
      scaleY: 0.66,
      alpha: baseAlpha,
    });
    stamps.push({
      sheetUrl: teleSheet.url,
      cols: teleSheet.cols,
      rows: teleSheet.rows,
      col: ISOMETRIC_TELEGRAPH_CELLS.BOSS_CIRCULAR_SLAM_MANDALA.col,
      row: ISOMETRIC_TELEGRAPH_CELLS.BOSS_CIRCULAR_SLAM_MANDALA.row,
      x: e.x,
      y: e.y,
      width: sweepWidth * 0.92,
      rotationRad: e.attackAngle,
      scaleX: 1,
      scaleY: 0.6,
      alpha: baseAlpha * 0.72,
    });
    return stamps;
  }

  // Fallback standard cone/circle telegraph using jjxeuu
  stamps.push({
    sheetUrl: teleSheet.url,
    cols: teleSheet.cols,
    rows: teleSheet.rows,
    col:
      e.attackKind === 'aoe'
        ? ISOMETRIC_TELEGRAPH_CELLS.BOSS_CIRCULAR_SLAM_MANDALA.col
        : ISOMETRIC_TELEGRAPH_CELLS.CLEAVE_BREATH_CONE_WARNING.col,
    row:
      e.attackKind === 'aoe'
        ? ISOMETRIC_TELEGRAPH_CELLS.BOSS_CIRCULAR_SLAM_MANDALA.row
        : ISOMETRIC_TELEGRAPH_CELLS.CLEAVE_BREATH_CONE_WARNING.row,
    x: e.x + Math.cos(e.attackAngle) * 56,
    y: e.y + Math.sin(e.attackAngle) * 38,
    width: 156,
    rotationRad: e.attackAngle,
    scaleX: 1,
    scaleY: 0.64,
    alpha: baseAlpha,
  });
  return stamps;
}

/**
 * Renders distinct, unmistakable Hades-grade ground telegraphs for Act I Enemy Archetypes,
 * Dundubhi (Act I Mid-Boss), and Vrikodara (Act I Finale Boss) using ONLY hand-painted
 * `#000000` flipbooks (`jjxeuu`, `kogf7y`, `us4plh`) with additive blending (`lighter`).
 * Zero `ctx.arc` or `ctx.stroke` debug shapes!
 */
export function renderEnemyAndBossGroundTelegraph(
  ctx: CanvasRenderingContext2D,
  e: TelegraphRenderTarget,
  nowMs: number,
  pillars?: Array<{ x: number; y: number; radius: number; hp: number }>
): boolean {
  if (e.aiState !== 'windup') return false;

  const stamps = resolveEnemyAndBossTelegraphFlipbookPlan(e, nowMs, pillars);
  if (stamps.length === 0) return false;

  for (let i = 0; i < stamps.length; i++) {
    const st = stamps[i];
    drawAdditiveFlipbookCell(ctx, {
      sheetUrl: st.sheetUrl,
      cols: st.cols,
      rows: st.rows,
      col: st.col,
      row: st.row,
      x: st.x,
      y: st.y,
      width: st.width,
      height: st.height,
      rotationRad: st.rotationRad,
      scaleX: st.scaleX,
      scaleY: st.scaleY,
      alpha: st.alpha,
    });
  }

  // Tactical text callout for Ironmaw Gladiator backstab or Dundubhi Pillar Lock
  if (
    !e.isBoss &&
    (e.type === 'ironmaw_gladiator' ||
      e.type === 'bloodmaw_brute' ||
      e.type === 'semi_boss_bloodforge' ||
      e.type === 'stone_golem' ||
      e.type === 'furnace_titan')
  ) {
    ctx.save();
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7DFFBA';
    ctx.fillText('DASH BEHIND [SPACE] · BACKSTAB', e.x, e.y - e.radius - 42);
    ctx.restore();
  } else if (
    e.isBoss &&
    (e.type === 'dundubhi' || e.type === 'xuemo') &&
    pillars &&
    pillars.length > 0 &&
    (e.attackKind === 'corridor' || e.activeBossMoveId === 'rakta_stampede_charge')
  ) {
    const cosA = Math.cos(e.attackAngle);
    const sinA = Math.sin(e.attackAngle);
    const halfWidth = Math.max(46, e.radius * 0.92);
    for (const pillar of pillars) {
      if (pillar.hp <= 0) continue;
      const relX = pillar.x - e.x;
      const relY = pillar.y - e.y;
      const along = relX * cosA + relY * sinA;
      const perp = Math.abs(-relX * sinA + relY * cosA);
      if (along > 20 && along <= 550 && perp <= halfWidth + pillar.radius + 18) {
        ctx.save();
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFD166';
        ctx.fillText(
          'PILLAR LOCKED! SHATTER = 4.5s ARMOR BREAK',
          pillar.x,
          pillar.y - pillar.radius - 32
        );
        ctx.restore();
      }
    }
  }

  void drawAdditiveFlipbookRowProgress;
  return true;
}

