/**
 * Act I Parashu execution victim choreography.
 *
 * Pure, non-physics render cues on the original encounter clock. Enemy AI,
 * hit resolution, knockback, foot collision and health remain authoritative.
 * Never retarget/modify source FBX keyframes to manufacture combat movement.
 */
import type { ParashuFinisherVariant } from './combatPipeline';

export interface Act1ExecutionChoreographyToken {
  enemyId: number;
  chamberIndex: number;
  attackSerial: number;
  variant: ParashuFinisherVariant;
  facing: 1 | -1;
  contactRegistered: boolean;
}

export interface Act1VictimPose {
  offsetX: number;
  offsetY: number;
  rotationRad: number;
  scaleX: number;
  scaleY: number;
  forceHurt: boolean;
}
const IDLE: Act1VictimPose = Object.freeze({
  offsetX: 0, offsetY: 0, rotationRad: 0,
  scaleX: 1, scaleY: 1, forceHurt: false,
});
const smooth = (t: number): number => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};
const envelope = (p: number, begin: number, peak: number, end: number): number =>
  p <= begin || p >= end ? 0 :
  p < peak ? smooth((p - begin) / (peak - begin)) :
  1 - smooth((p - peak) / (end - peak));

/**
 * Return the same deterministic pose at 30/60/120 Hz.
 * Hit reaction never begins before the actual one-shot damage contact.
 */
export function sampleAct1ExecutionVictimPose(
  token: Act1ExecutionChoreographyToken | null,
  params: {
    enemyId: number;
    chamberIndex: number;
    attackSerial: number;
    action: string;
    progress: number;
    isBoss: boolean;
    isDead: boolean;
  }
): Act1VictimPose {
  if (!token || !Number.isFinite(params.progress) ||
      params.progress < 0 || params.progress >= 1 ||
      params.action !== 'execute' ||
      token.enemyId !== params.enemyId ||
      token.chamberIndex !== params.chamberIndex ||
      token.attackSerial !== params.attackSerial) return IDLE;

  const p = params.progress;
  const anticipation = envelope(p, 0.07, 0.22, 0.345);
  // Never animate recoil early because the target was merely posture-broken.
  const impact = token.contactRegistered ? envelope(p, 0.35, 0.46, 0.84) : 0;
  const cap = params.isBoss ? 0.40 : 1;
  const s = token.facing;
  let offsetX = -s * 3 * anticipation;
  let offsetY = -1.5 * anticipation;
  let rotationRad = -s * 0.018 * anticipation;
  let scaleX = 1 + 0.012 * anticipation;
  let scaleY = 1 - 0.014 * anticipation;

  switch (token.variant) {
    case 'downward_crush':
      // Plant feet; compress torso at contact, then rise or enter death.
      offsetX += s * 5 * impact * cap;
      offsetY += 7 * impact * cap;
      rotationRad += s * 0.070 * impact * cap;
      scaleX += 0.045 * impact * cap;
      scaleY -= 0.10 * impact * cap;
      break;
    case 'spin_360_cleave':
      // Sideways torso recoil, distinct from the downward compress.
      offsetX += s * 18 * impact * cap;
      offsetY -= 2 * impact * cap;
      rotationRad += s * 0.16 * impact * cap;
      scaleX -= 0.045 * impact * cap;
      scaleY += 0.026 * impact * cap;
      break;
    case 'impaling_lunge':
      // Short linear recoil, no disconnected airborne ragdoll.
      offsetX += s * 25 * impact * cap;
      offsetY += 1 * impact * cap;
      rotationRad -= s * 0.105 * impact * cap;
      scaleX -= 0.068 * impact * cap;
      scaleY += 0.022 * impact * cap;
      break;
  }
  return {
    offsetX, offsetY, rotationRad,
    scaleX: Math.max(0.86, Math.min(1.12, scaleX)),
    scaleY: Math.max(0.86, Math.min(1.12, scaleY)),
    forceHurt: token.contactRegistered && p < 0.78 && !params.isDead,
  };
}

/** Camera/world-independent position for one accurate contact flash. */
export function resolveAct1FinisherContactAnchor(input: {
  enemyX: number; enemyY: number;
  bladeX?: number | null; bladeY?: number | null;
  bladeMaxDistance?: number;
}): {x: number; y: number; source: 'blade' | 'target'} {
  const ex = input.enemyX;
  const ey = input.enemyY - 24;
  const bx = input.bladeX;
  const by = input.bladeY;
  const limit = Math.max(16, Math.min(95, input.bladeMaxDistance ?? 65));
  if (Number.isFinite(bx) && Number.isFinite(by) &&
      Math.hypot((bx as number) - ex, (by as number) - ey) <= limit) {
    // Partial visual alignment keeps sparks on the enemy while tracking
    // the actual weapon. Outliers/teleport poses fall back to physical hit.
    return {
      x: ex + ((bx as number) - ex) * 0.4,
      y: ey + ((by as number) - ey) * 0.4,
      source: 'blade',
    };
  }
  return {x: ex, y: ey, source: 'target'};
}

/**
 * Small visual root follow-through to make a Parashu execution *travel*.
 * The actual player world position never changes (no extra hit, teleport,
 * i-frame, collision or camera simulation displacement).
 */
export function sampleAct1ExecutionHeroRoot(
  token: Act1ExecutionChoreographyToken | null,
  params: {
    action: string;
    attackSerial: number;
    chamberIndex: number;
    progress: number;
  }
): {offsetX: number; offsetY: number} {
  if (!token || params.action !== 'execute' ||
      token.attackSerial !== params.attackSerial ||
      token.chamberIndex !== params.chamberIndex ||
      !Number.isFinite(params.progress)) return {offsetX:0,offsetY:0};
  const p = params.progress;
  const step = envelope(p, 0.07, 0.36, 0.83);
  if (step <= 0) return {offsetX:0,offsetY:0};
  switch(token.variant) {
    case 'downward_crush':
      return {offsetX:token.facing * 8 * step,offsetY:2.5 * step};
    case 'spin_360_cleave':
      return {offsetX:token.facing * 6 * step,offsetY:-2 * step};
    case 'impaling_lunge':
      return {offsetX:token.facing * 18 * step,offsetY:0};
  }
}
