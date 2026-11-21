/**
 * Act I — attack-frame driven Parashu trail staging.
 *
 * This is presentation only. It never changes hitboxes, combat damage,
 * cooldowns, or input windows. One compact blade-following ribbon is
 * preferable to a stationary full-circle flash on every light attack.
 */
export type ParashuVisualAction = 'light_attack' | 'heavy_unleash' | 'execute' | 'idle' | 'parry' | 'dodge' | 'astra' | string;
export type ParashuVisualStance = 'smash' | 'pillar' | 'thrust';

export interface ParashuSwingVisual {
  active: boolean;
  alpha: number;
  radius: number;
  isHeavy: boolean;
  comboStep: number;
}

function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
}

/**
 * Tail forms *after* the startup tells the player an attack is coming;
 * peaks on the actual contact interval, then sheds ink within the recovery.
 * Alpha is derived from simulation progress so 30/60/120 Hz agree.
 */
export function computeParashuSwingVisual(
  action: ParashuVisualAction,
  progress: number,
  comboStep = 1,
): ParashuSwingVisual {
  const isHeavy = action === 'heavy_unleash';
  const isLight = action === 'light_attack';
  const step = Math.max(1, Math.min(4, Number.isFinite(comboStep) ? Math.round(comboStep) : 1));
  if (!isLight && !isHeavy) return {active: false,alpha:0,radius:0,isHeavy:false,comboStep:step};
  const p = clamp01(progress);
  // Soft leading edge, crisp active frame, rapid recovery: never draw the
  // entire ring during the startup or while Rudra is already idle.
  const inRamp = clamp01((p - 0.19) / 0.12);
  const outRamp = 1 - clamp01((p - 0.66) / 0.21);
  const alpha = Math.max(0, Math.min(inRamp, outRamp));
  const radius = isHeavy ? 84 : step === 4 ? 82 : step === 3 ? 72 : 65;
  return {
    active: alpha > 0.025,
    alpha,
    radius,
    isHeavy,
    comboStep:step,
  };
}

export interface HeavyVfxPresentation {
  slashRadius: number;
  slashWidth: number;
  slashArc: number;
  floorRingRadius: number;
  sparkCount: number;
  createUltimateWheel: boolean;
}

/**
 * Ordinary heavies remain directional and grounded. A multi-focus charged
 * ultimate earns the larger circular flourish, never an uncharged smash.
 */
export function getSmashHeavyVfxPresentation(focusOrbs: number): HeavyVfxPresentation {
  const focus = Math.max(0, Math.min(4, Number.isFinite(focusOrbs) ? Math.floor(focusOrbs) : 0));
  return {
    slashRadius: 112 + focus * 10,
    slashWidth: 44 + focus * 3,
    slashArc: 2.20 + focus * 0.08,
    floorRingRadius: 118 + focus * 10,
    sparkCount: 11 + focus * 2,
    createUltimateWheel: focus >= 3,
  };
}
