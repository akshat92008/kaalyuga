/**
 * Strict ownership for deferred melee visual/contact events.
 * The attack that scheduled a cue must still own the active action when it fires.
 * This prevents a dodge, stagger or chamber change from replaying an abandoned slash.
 */
export type Act1StrikeAction = 'light_attack' | 'heavy_unleash' | 'execute';

export function canFirePendingStrike(
  expectedAction: Act1StrikeAction,
  activeAction: string,
  attackProgress: number,
  contactThreshold: number,
  fired: boolean
): boolean {
  if (fired || expectedAction !== activeAction || !Number.isFinite(attackProgress)) return false;
  const threshold = Math.max(0, Math.min(1, contactThreshold));
  return attackProgress >= threshold;
}

export function shouldCancelPendingStrike(
  expectedAction: Act1StrikeAction,
  activeAction: string,
  expectedAttackSerial?: number,
  activeAttackSerial?: number,
  expectedChamber?: number,
  activeChamber?: number
): boolean {
  // Comparing the action name alone is not sufficient: a fresh light swing
  // can have the same name as a cancelled, earlier light swing.
  return expectedAction !== activeAction ||
    (expectedAttackSerial !== undefined && expectedAttackSerial !== activeAttackSerial) ||
    (expectedChamber !== undefined && expectedChamber !== activeChamber);
}
