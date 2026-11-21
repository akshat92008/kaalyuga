/**
 * Act I execution visual-direction budgets.
 *
 * Data only: preserve existing damage, rewards, i-frames, and animation clip
 * selection. The first premium execution is an OVERHEAD Parashu impact.
 * It must not fire an unrelated full-circle fire wheel, a water dragon, and
 * three sky lightning columns simultaneously at contact. Each finisher now
 * has its own silhouette: vertical crush, circular cleave, linear lunge.
 */
import type { ParashuFinisherVariant } from './combatPipeline';

export interface Act1ExecutionVisualPlan {
  variant: ParashuFinisherVariant;
  contactProgress: number;
  focusXOffset: number;
  focusYOffset: number;
  groundShockwaveRadius: number;
  slashRadius: number;
  slashWidth: number;
  slashArcSpan: number;
  impactBurstScale: number;
  sparkCount: number;
  flipbookSize: number;
  // The aim is one credible physical strike, not stacked unrelated elemental
  // set pieces. Attack damage and contact frame remain controlled elsewhere.
  useGroundedOverheadContact: boolean;
  allowSpectralSkyBolts: boolean;
}

/** A stable, deterministic contact presentation for each original variant. */
export function getAct1ExecutionVisualPlan(variant:ParashuFinisherVariant):Act1ExecutionVisualPlan {
  if (variant === 'downward_crush') {
    return {
      variant, contactProgress:0.35, focusXOffset:30, focusYOffset:-24,
      groundShockwaveRadius:84, slashRadius:52,
      slashWidth:35, slashArcSpan:1.54,
      impactBurstScale:0.82, sparkCount:16,
      flipbookSize:72,
      useGroundedOverheadContact:true,allowSpectralSkyBolts:false,
    };
  }
  if (variant === 'spin_360_cleave') {
    return {
      variant,contactProgress:0.35,focusXOffset:0,focusYOffset:-24,
      groundShockwaveRadius:94,slashRadius:66,
      slashWidth:54,slashArcSpan:3.55,
      impactBurstScale:0.78,sparkCount:22,flipbookSize:76,
      useGroundedOverheadContact:false,allowSpectralSkyBolts:false,
    };
  }
  // Impaling Lunge is a narrow, directed weapon contact, not a second
  // screen-wide spinning finisher. Keep its original 0.35 active contact frame.
  return {
    variant,contactProgress:0.35,focusXOffset:30,focusYOffset:-24,
    groundShockwaveRadius:66,slashRadius:50,
    slashWidth:24,slashArcSpan:0.72,
    impactBurstScale:0.73,sparkCount:14,flipbookSize:65,
    useGroundedOverheadContact:false,allowSpectralSkyBolts:false,
  };
}
