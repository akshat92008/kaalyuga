import type { StaffStance, WeaponId } from './rules';
import type { CompanionId } from './partySystem';
import type { CombatStyleStatus } from './modernCombat';
import type { AstraId, NarayanastraTrialState } from './astraEngine';
import type { BossCounterplayKind } from './bossEncounters';

export interface HudSnapshot {
  chamberId: number;
  chamberName: string;
  foesRemaining: number;
  score: number;
  comboCount: number;
  ashenKarma: number;
  karmaRunDelta: number;
  fps: number;
  playerHp: number;
  playerDisplayHp: number;
  playerMaxHp: number;
  focusOrbs: number;
  focusProgress: number;
  dashCharges: number;
  maxDashCharges: number;
  stance: StaffStance;
  weapon: WeaponId;
  gourdSips: number;
  maxGourdSips: number;
  immobilizeCd: number;
  parryCd: number;
  clonesCd: number;
  transformCd: number;
  transformActiveTimer: number;
  hasBrokenTarget: boolean;
  riposteWindowTimer: number;
  kalaRewindCd: number;
  shadowBlinkCd: number;
  stylePoints: number;
  styleStatus: CombatStyleStatus;
  partyLinkCd: number;
  partyCompanions: Array<{
    id: CompanionId;
    hp: number;
    maxHp: number;
  }>;
  stamina: number;
  maxStamina: number;
  astraEnergy: number;
  maxAstraEnergy: number;
  agneyastraCd: number;
  vayavyastraCd: number;
  vajrastraCd: number;
  activeUpasamharaZones: AstraId[];
  narayanastraTrial: NarayanastraTrialState;
  runDamageDealt: number;
  runParriesLanded: number;
  runDodgesCompleted: number;
  runPostureBreaks: number;
  runTimeSec: number;
  boss: {
    active: boolean;
    type: string;
    aiState: string;
    name: string;
    sanskritTitle: string;
    hp: number;
    displayHp: number;
    maxHp: number;
    posture: number;
    maxPosture: number;
    phase: 1 | 2 | 3;
    armorCracked?: boolean;
    tuskLodgedTimer?: number;
    signatureMoveTitle?: string;
    signatureCounterplayHint?: string;
    signatureCounterplayKind?: BossCounterplayKind;
  } | null;
  playerX?: number;
  playerY?: number;
  videoBgEnabled?: boolean;
  lowEndMode?: boolean;
}

/**
 * Compares two HudSnapshots to avoid triggering React state updates (`setHud`)
 * during 60 FPS simulation frames when no HUD-visible values have changed.
 */
export function shouldSyncHudSnapshot(
  prev: HudSnapshot,
  next: HudSnapshot,
): boolean {
  if (
    prev.chamberId !== next.chamberId ||
    prev.chamberName !== next.chamberName ||
    prev.foesRemaining !== next.foesRemaining ||
    prev.score !== next.score ||
    prev.comboCount !== next.comboCount ||
    prev.ashenKarma !== next.ashenKarma ||
    prev.playerHp !== next.playerHp ||
    Math.abs(prev.playerDisplayHp - next.playerDisplayHp) >= 2 ||
    prev.playerMaxHp !== next.playerMaxHp ||
    prev.focusOrbs !== next.focusOrbs ||
    Math.abs(prev.focusProgress - next.focusProgress) >= 0.05 ||
    prev.dashCharges !== next.dashCharges ||
    prev.stance !== next.stance ||
    prev.weapon !== next.weapon ||
    prev.gourdSips !== next.gourdSips ||
    prev.maxGourdSips !== next.maxGourdSips ||
    prev.hasBrokenTarget !== next.hasBrokenTarget ||
    Math.abs(prev.riposteWindowTimer - next.riposteWindowTimer) >= 0.1 ||
    prev.stamina !== next.stamina ||
    prev.astraEnergy !== next.astraEnergy ||
    Math.abs(prev.agneyastraCd - next.agneyastraCd) >= 0.15 ||
    Math.abs(prev.vayavyastraCd - next.vayavyastraCd) >= 0.15 ||
    Math.abs(prev.vajrastraCd - next.vajrastraCd) >= 0.15 ||
    prev.activeUpasamharaZones.length !== next.activeUpasamharaZones.length ||
    prev.narayanastraTrial.active !== next.narayanastraTrial.active ||
    prev.styleStatus.grade !== next.styleStatus.grade ||
    Boolean(prev.boss) !== Boolean(next.boss)
  ) {
    return true;
  }

  if (prev.boss && next.boss) {
    if (
      prev.boss.hp !== next.boss.hp ||
      Math.abs(prev.boss.displayHp - next.boss.displayHp) >= 3 ||
      prev.boss.posture !== next.boss.posture ||
      prev.boss.phase !== next.boss.phase ||
      prev.boss.armorCracked !== next.boss.armorCracked ||
      prev.boss.signatureMoveTitle !== next.boss.signatureMoveTitle ||
      Math.abs((prev.boss.tuskLodgedTimer || 0) - (next.boss.tuskLodgedTimer || 0)) >= 0.2
    ) {
      return true;
    }
  }

  return false;
}
