/**
 * Readability contract for Act I Parashu VFX.
 *
 * A loaded 3D Rudra *never* emits a free-floating inferred slash when the
 * exact weapon-head socket is missing or the animation is crossfading.
 * In that state the blade remains visible; the effect waits for the true
 * physical trajectory. Source-free 2D fallback is limited and explicit.
 *
 * This module does not affect hitboxes, i-frames, damage or player input.
 */
export type Act1BladeFxMode = 'socket_trail' | 'socket_tip' | 'fallback_2d' | 'suppressed';

export function chooseAct1BladeFxMode(params: {
  rendered3D: boolean;
  hasProjectedHead: boolean;
  sampleCount: number;
}): Act1BladeFxMode {
  if (!params.rendered3D) return 'fallback_2d';
  if (!params.hasProjectedHead) return 'suppressed';
  return Number.isFinite(params.sampleCount) && params.sampleCount >= 2
    ? 'socket_trail' : 'socket_tip';
}

/**
 * A source-geometry-free slash can be seen during initial 3D streaming only.
 * Keep it within a hand/axe-length near the actor, never a distant screen arc.
 */
export function getAct1FallbackBladeRadius(requestedRadius: number): number {
  return Number.isFinite(requestedRadius)
    ? Math.max(16, Math.min(46, requestedRadius))
    : 32;
}

/** Local hit effects may not grow into full-screen elemental wheels. */
export function getAct1ExecutionContactBudget(variant: string): {
  groundRadius: number;
  impactFlipbookSize: number;
  contactSparkSize: number;
} {
  switch (variant) {
    case 'spin_360_cleave': return {groundRadius:94,impactFlipbookSize:76,contactSparkSize:84};
    case 'impaling_lunge': return {groundRadius:66,impactFlipbookSize:65,contactSparkSize:70};
    default: return {groundRadius:84,impactFlipbookSize:72,contactSparkSize:78};
  }
}
