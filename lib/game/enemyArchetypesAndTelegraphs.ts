import type { BossMoveId } from './bossEncounters';

export type EnemyType =
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

  if (params.enemyType === 'wolf_guai') {
    // Charnel Ghoul: Fast pounce with red lunge line (380ms windup)
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

  if (params.enemyType === 'fire_monk') {
    // Ashen Oracle: Ranged curse orb + Vedic ground yantra circle (650ms fill ring before burst)
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

  if (params.enemyType === 'stone_golem' || params.enemyType === 'furnace_titan') {
    // Ironmaw Gladiator: Front shield block that opens during windup/recovery, heavy overhead slam (550ms windup) vulnerable to Dash-behind backstab
    return {
      windupSec: IRONMAW_GLADIATOR_SLAM_WINDUP_SEC,
      recoverySec: 0.95,
      attackKind: 'cone',
      telegraphShape: 'overhead_slam_sector',
      attackAngle,
      pounceRangePx: 0,
      yantraRadiusPx: 0,
      slamArcRad: 1.28,
      slamRangePx: params.enemyType === 'furnace_titan' ? 148 : 132,
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
    params.enemyType === 'stone_golem' || params.enemyType === 'furnace_titan';

  // Angle from enemy to attacker
  const toAttackerAngle = Math.atan2(
    params.attackerY - params.enemyY,
    params.attackerX - params.enemyX,
  );
  let angleDiff = toAttackerAngle - params.enemyFacingAngle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  const isFrontCone = Math.abs(angleDiff) <= Math.PI * 0.48; // ~86 deg each side in front
  const isBackstabAngle = Math.abs(angleDiff) >= Math.PI * 0.56; // Rear hemisphere

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

  // Ironmaw Gladiator:
  // Front shield is active during chase OR explicit ironGuardTimer,
  // EXCEPT it opens up during heavy overhead slam windup, attack, recovery, or posture break!
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
    damageMultiplier = 1.55; // Massive backstab punish when dashing behind overhead slam!
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

/**
 * Renders distinct, unmistakable Hades-grade ground telegraphs for Act I Enemy Archetypes,
 * Dundubhi (Act I Mid-Boss) Horn-Charge Corridor, and Vrikodara (Act I Finale Boss) phases.
 */
export function renderEnemyAndBossGroundTelegraph(
  ctx: CanvasRenderingContext2D,
  e: TelegraphRenderTarget,
  nowMs: number,
  pillars?: Array<{ x: number; y: number; radius: number; hp: number }>,
): boolean {
  if (e.aiState !== 'windup') return false;

  const totalWindup = Math.max(0.15, e.windupDuration || 0.55);
  const progress = Math.max(0, Math.min(1, 1 - e.aiTimer / totalWindup));
  const isParryFlash = e.aiTimer <= 0.22 && e.aiTimer > 0.02;

  // 1. CHARNEL GHOUL (`wolf_guai`) — Fast Pounce with Red Lunge Line (380ms windup)
  if (!e.isBoss && e.type === 'wolf_guai') {
    const angle = e.attackAngle;
    const targetX = e.pounceTargetX ?? e.x + Math.cos(angle) * 220;
    const targetY = e.pounceTargetY ?? e.y + Math.sin(angle) * 220;
    const dist = Math.max(90, Math.hypot(targetX - e.x, targetY - e.y));

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(1, 0.55); // Isometric ground projection
    ctx.rotate(angle);

    const corridorHalfWidth = 22;
    // Outer corridor frame
    ctx.fillStyle = isParryFlash
      ? 'rgba(255, 240, 150, 0.24)'
      : 'rgba(220, 24, 38, 0.18)';
    ctx.fillRect(0, -corridorHalfWidth, dist, corridorHalfWidth * 2);

    // Sweeping red lunge fill along the corridor
    ctx.fillStyle = isParryFlash
      ? 'rgba(255, 245, 175, 0.52)'
      : `rgba(255, 42, 56, ${0.32 + progress * 0.42})`;
    ctx.fillRect(0, -corridorHalfWidth, dist * progress, corridorHalfWidth * 2);

    // Crisp central red laser lunge line + arrowhead
    ctx.strokeStyle = isParryFlash ? '#FFF7B2' : '#FF2A38';
    ctx.lineWidth = isParryFlash ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(dist, 0);
    ctx.stroke();

    // Corridor rails
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = isParryFlash
      ? '#FFF7B2'
      : 'rgba(255, 75, 85, 0.88)';
    ctx.strokeRect(0, -corridorHalfWidth, dist, corridorHalfWidth * 2);

    // Directional lunge chevrons
    const chevronCount = 4;
    for (let i = 1; i <= chevronCount; i++) {
      const cx = (dist / (chevronCount + 0.5)) * i;
      ctx.beginPath();
      ctx.moveTo(cx - 10, -corridorHalfWidth * 0.65);
      ctx.lineTo(cx + 4, 0);
      ctx.lineTo(cx - 10, corridorHalfWidth * 0.65);
      ctx.stroke();
    }

    // Destination pounce impact ring
    ctx.beginPath();
    ctx.arc(dist, 0, corridorHalfWidth * 1.15, 0, Math.PI * 2);
    ctx.strokeStyle = isParryFlash ? '#FFFFFF' : '#FF3B47';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();
    return true;
  }

  // 2. ASHEN ORACLE (`fire_monk`) — Ranged Curse Orb + Vedic Ground Yantra Circle (650ms fill ring before burst)
  if (!e.isBoss && e.type === 'fire_monk') {
    const yantraX = e.yantraTargetX ?? e.x + Math.cos(e.attackAngle) * 190;
    const yantraY = e.yantraTargetY ?? e.y + Math.sin(e.attackAngle) * 190;
    const yantraR = e.yantraRadius ?? 92;

    // A) Ranged Curse Orb trajectory line from Oracle to player direction
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(1, 0.55);
    ctx.rotate(e.attackAngle);
    ctx.strokeStyle = `rgba(216, 110, 255, ${0.42 + progress * 0.45})`;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(290, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // B) Vedic Ground Yantra Circle (650ms fill ring before burst)
    ctx.save();
    ctx.translate(yantraX, yantraY);
    ctx.scale(1, 0.55);

    // Base dark-violet/crimson Vedic mandala ring
    ctx.fillStyle = `rgba(148, 36, 220, ${0.12 + progress * 0.18})`;
    ctx.beginPath();
    ctx.arc(0, 0, yantraR, 0, Math.PI * 2);
    ctx.fill();

    // Expanding 650ms fill ring before burst
    ctx.fillStyle = isParryFlash
      ? 'rgba(255, 235, 150, 0.42)'
      : `rgba(235, 68, 255, ${0.22 + progress * 0.38})`;
    ctx.beginPath();
    ctx.arc(0, 0, yantraR * progress, 0, Math.PI * 2);
    ctx.fill();

    // Sacred Vedic 8-pointed Shatkona/Yantra geometry inside the circle
    ctx.rotate((nowMs * 0.0018) % (Math.PI * 2));
    ctx.strokeStyle = isParryFlash
      ? '#FFF7B2'
      : `rgba(255, 115, 240, ${0.75 + progress * 0.25})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, yantraR, 0, Math.PI * 2);
    ctx.stroke();

    // Inscribed interlocking Vedic squares
    const sq = yantraR * 0.68;
    ctx.strokeRect(-sq, -sq, sq * 2, sq * 2);
    ctx.rotate(Math.PI / 4);
    ctx.strokeRect(-sq, -sq, sq * 2, sq * 2);
    ctx.restore();
    return true;
  }

  // 3. IRONMAW GLADIATOR (`stone_golem` / `furnace_titan` non-boss) — 550ms Heavy Overhead Slam + Backstab Open Arc
  if (
    !e.isBoss &&
    (e.type === 'stone_golem' || e.type === 'furnace_titan')
  ) {
    const slamRadius = e.type === 'furnace_titan' ? 148 : 132;
    const halfArc = 0.64; // 1.28 rad total front slam cone

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(1, 0.55);

    // Front Heavy Overhead Slam Sector
    ctx.fillStyle = isParryFlash
      ? 'rgba(255, 245, 160, 0.34)'
      : 'rgba(255, 62, 34, 0.20)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, slamRadius, e.attackAngle - halfArc, e.attackAngle + halfArc);
    ctx.closePath();
    ctx.fill();

    // Expanding fill wave (550ms windup)
    ctx.fillStyle = isParryFlash
      ? 'rgba(255, 245, 160, 0.55)'
      : `rgba(255, 88, 38, ${0.32 + progress * 0.42})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(
      0,
      0,
      slamRadius * progress,
      e.attackAngle - halfArc,
      e.attackAngle + halfArc,
    );
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = isParryFlash ? '#FFF7B2' : '#FF4E2A';
    ctx.lineWidth = isParryFlash ? 3.5 : 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, slamRadius, e.attackAngle - halfArc, e.attackAngle + halfArc);
    ctx.closePath();
    ctx.stroke();

    // Rear Backstab Open Indicator (Gold/Emerald dashed arc behind the Gladiator)
    const rearAngle = e.attackAngle + Math.PI;
    ctx.strokeStyle = 'rgba(110, 255, 170, 0.78)';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, e.radius + 36, rearAngle - 0.85, rearAngle + 0.85);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Crisp tactical hint above Gladiator
    ctx.save();
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7DFFBA';
    ctx.fillText('DASH BEHIND [SPACE] · BACKSTAB', e.x, e.y - e.radius - 42);
    ctx.restore();
    return true;
  }

  // 4. DUNDUBHI (`xuemo`) — Horn-Charge Corridor & Pillar Counterplay Telegraph
  if (
    e.isBoss &&
    e.type === 'xuemo' &&
    (e.attackKind === 'corridor' ||
      e.activeBossMoveId === 'rakta_stampede_charge')
  ) {
    const corridorLen = 540;
    const halfWidth = Math.max(46, e.radius * 0.92);

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(1, 0.55);
    ctx.rotate(e.attackAngle);

    // High-contrast crimson/gold stampede corridor
    ctx.fillStyle = 'rgba(225, 28, 38, 0.22)';
    ctx.fillRect(0, -halfWidth, corridorLen, halfWidth * 2);

    // Sweeping horn-charge fill
    ctx.fillStyle = isParryFlash
      ? 'rgba(255, 240, 150, 0.48)'
      : `rgba(255, 58, 42, ${0.32 + progress * 0.42})`;
    ctx.fillRect(0, -halfWidth, corridorLen * progress, halfWidth * 2);

    // Twin horn rails + outer border
    ctx.strokeStyle = isParryFlash ? '#FFF7B2' : '#FF3828';
    ctx.lineWidth = 3.2;
    ctx.strokeRect(0, -halfWidth, corridorLen, halfWidth * 2);

    // Twin inner horn tracks
    ctx.strokeStyle = 'rgba(255, 198, 92, 0.72)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -halfWidth * 0.45);
    ctx.lineTo(corridorLen, -halfWidth * 0.45);
    ctx.moveTo(0, halfWidth * 0.45);
    ctx.lineTo(corridorLen, halfWidth * 0.45);
    ctx.stroke();

    // Animated directional stampede chevrons
    const scrollOffset = ((nowMs * 0.35) % 75);
    ctx.strokeStyle = '#FFD166';
    ctx.lineWidth = 2.6;
    for (let dist = 45 + scrollOffset; dist < corridorLen - 25; dist += 75) {
      ctx.beginPath();
      ctx.moveTo(dist - 16, -halfWidth * 0.65);
      ctx.lineTo(dist + 8, 0);
      ctx.lineTo(dist - 16, halfWidth * 0.65);
      ctx.stroke();
    }
    ctx.restore();

    // Highlight any Kurukshetra Pillar intersecting the charge corridor as a BAIT target!
    if (pillars && pillars.length > 0) {
      const cosA = Math.cos(e.attackAngle);
      const sinA = Math.sin(e.attackAngle);
      for (const pillar of pillars) {
        if (pillar.hp <= 0) continue;
        const relX = pillar.x - e.x;
        const relY = pillar.y - e.y;
        const along = relX * cosA + relY * sinA;
        const perp = Math.abs(-relX * sinA + relY * cosA);
        if (along > 20 && along <= corridorLen + 30 && perp <= halfWidth + pillar.radius + 18) {
          ctx.save();
          ctx.translate(pillar.x, pillar.y);
          ctx.scale(1, 0.55);
          ctx.strokeStyle = '#FFD166';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(0, 0, pillar.radius + 24, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          ctx.save();
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#FFD166';
          ctx.fillText(
            'PILLAR LOCKED! SHATTER = 4.5s ARMOR BREAK',
            pillar.x,
            pillar.y - pillar.radius - 32,
          );
          ctx.restore();
        }
      }
    }
    return true;
  }

  // 5. VRIKODARA (`furnace_titan` Boss) — 3 Distinct Phase Ground Shape Telegraphs with Fair Escape Gaps
  if (e.isBoss && e.type === 'furnace_titan') {
    const moveId = e.activeBossMoveId;

    // 5A. Abdominal Furnace Vacuum Pull (`agni_furnace_inhale`)
    if (moveId === 'agni_furnace_inhale') {
      const pullRadius = 310;
      const blastCoreRadius = 158;

      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale(1, 0.55);

      // Outer vacuum suction ring with inward-scrolling rings
      const inwardPhase = 1 - ((nowMs * 0.0022) % 1);
      ctx.strokeStyle = `rgba(255, 136, 48, ${0.45 + progress * 0.4})`;
      ctx.lineWidth = 2.2;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, pullRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, blastCoreRadius + (pullRadius - blastCoreRadius) * inwardPhase, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Inner abdominal furnace detonation core (danger zone)
      ctx.fillStyle = `rgba(255, 58, 28, ${0.18 + progress * 0.34})`;
      ctx.beginPath();
      ctx.arc(0, 0, blastCoreRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 175, 55, ${0.28 + progress * 0.42})`;
      ctx.beginPath();
      ctx.arc(0, 0, blastCoreRadius * progress, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isParryFlash ? '#FFF7B2' : '#FF4824';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, blastCoreRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 4 Outward Escape Safe Lanes (showing player where to Dash outward)
      ctx.strokeStyle = 'rgba(125, 255, 186, 0.78)';
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 4; i++) {
        const laneAngle = e.attackAngle + (i * Math.PI) / 2;
        const rStart = blastCoreRadius + 14;
        const rEnd = pullRadius + 24;
        ctx.beginPath();
        ctx.moveTo(Math.cos(laneAngle) * rStart, Math.sin(laneAngle) * rStart);
        ctx.lineTo(Math.cos(laneAngle) * rEnd, Math.sin(laneAngle) * rEnd);
        ctx.stroke();
      }
      ctx.restore();
      return true;
    }

    // 5B. Molten Slag Arc (`vaitarani_slag_eruption`) — 3 Radial Magma Lanes with Fair Safe Wedge Gaps
    if (moveId === 'vaitarani_slag_eruption') {
      const laneLength = 275;
      const laneHalfArc = 0.21; // Each of the 3 slag prongs is 0.42 rad wide, leaving 0.30 rad safe escape gaps between prongs!
      const prongOffsets = [-0.68, 0, 0.68];

      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale(1, 0.55);

      for (const offset of prongOffsets) {
        const centerAngle = e.attackAngle + offset;
        ctx.fillStyle = 'rgba(255, 82, 24, 0.22)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(
          0,
          0,
          laneLength,
          centerAngle - laneHalfArc,
          centerAngle + laneHalfArc,
        );
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = isParryFlash
          ? 'rgba(255, 240, 150, 0.52)'
          : `rgba(255, 128, 32, ${0.32 + progress * 0.45})`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(
          0,
          0,
          laneLength * progress,
          centerAngle - laneHalfArc,
          centerAngle + laneHalfArc,
        );
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = isParryFlash ? '#FFF7B2' : '#FF7A1E';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(
          0,
          0,
          laneLength,
          centerAngle - laneHalfArc,
          centerAngle + laneHalfArc,
        );
        ctx.closePath();
        ctx.stroke();
      }

      // Highlight the 2 safe wedge gaps between the 3 molten slag lanes
      ctx.strokeStyle = 'rgba(125, 255, 186, 0.72)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      for (const safeOffset of [-0.34, 0.34]) {
        const safeAngle = e.attackAngle + safeOffset;
        ctx.beginPath();
        ctx.moveTo(Math.cos(safeAngle) * 55, Math.sin(safeAngle) * 55);
        ctx.lineTo(
          Math.cos(safeAngle) * (laneLength - 15),
          Math.sin(safeAngle) * (laneLength - 15),
        );
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
      return true;
    }

    // 5C. Phase 2 Eclipse Twin-Trident Sweep (`rudra_jaw_guillotine` / `kalagni_cataclysm_vortex`)
    if (
      moveId === 'rudra_jaw_guillotine' ||
      moveId === 'kalagni_cataclysm_vortex'
    ) {
      const isCataclysm = moveId === 'kalagni_cataclysm_vortex';
      const innerBladeRadius = isCataclysm ? 155 : 138;
      const outerBladeRadius = isCataclysm ? 245 : 210;
      const sweepHalfArc = isCataclysm ? 1.18 : 1.02; // Leaves a wide rear escape gap!

      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale(1, 0.55);

      // Blade 1: Inner Crimson Eclipse Trident Arc
      ctx.fillStyle = `rgba(220, 24, 62, ${0.22 + progress * 0.36})`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(
        0,
        0,
        innerBladeRadius * progress,
        e.attackAngle - sweepHalfArc,
        e.attackAngle + sweepHalfArc,
      );
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = isParryFlash ? '#FFF7B2' : '#FF2E54';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        innerBladeRadius,
        e.attackAngle - sweepHalfArc,
        e.attackAngle + sweepHalfArc,
      );
      ctx.stroke();

      // Blade 2: Outer Solar-Gold Eclipse Trident Ring Band
      const bandInner = innerBladeRadius + 16;
      ctx.fillStyle = `rgba(255, 168, 38, ${0.18 + progress * 0.34})`;
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        outerBladeRadius,
        e.attackAngle - sweepHalfArc * 0.88,
        e.attackAngle - sweepHalfArc * 0.88 + sweepHalfArc * 1.76 * progress,
      );
      ctx.arc(
        0,
        0,
        bandInner,
        e.attackAngle - sweepHalfArc * 0.88 + sweepHalfArc * 1.76 * progress,
        e.attackAngle - sweepHalfArc * 0.88,
        true,
      );
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = isParryFlash ? '#FFF7B2' : '#FFB72B';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        outerBladeRadius,
        e.attackAngle - sweepHalfArc * 0.88,
        e.attackAngle + sweepHalfArc * 0.88,
      );
      ctx.stroke();

      // Rear Escape Gap Indicator
      const rearAngle = e.attackAngle + Math.PI;
      ctx.strokeStyle = 'rgba(125, 255, 186, 0.85)';
      ctx.lineWidth = 2.6;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 48, rearAngle - 0.75, rearAngle + 0.75);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      return true;
    }
  }

  return false;
}
