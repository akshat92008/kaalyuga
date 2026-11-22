/**
 * A guardian strike may play exactly once per gameplay attack instance.
 * renderFrame can run many times during a long heavy or an FPS stall.
 * Never replay the clip just because its visual hold is nearly exhausted.
 */
export interface GuardianAttackFrame {
  isAttacking: boolean;
  attackSerial?: number;
  lastAttackSerial: number;
  wasAttacking: boolean;
}

export function shouldStartGuardianSwing(frame: GuardianAttackFrame): boolean {
  if (!frame.isAttacking) return false;
  if (typeof frame.attackSerial === 'number' && Number.isFinite(frame.attackSerial)) {
    return frame.attackSerial !== frame.lastAttackSerial;
  }
  // Fallback for non-serial callers: a rising edge is a new attack.
  return !frame.wasAttacking;
}
