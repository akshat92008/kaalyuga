/**
 * Gameplay camera-safe guardian framing. Keeps the spectral fighter towering
 * over Rudra while reserving a protected strip for the top HUD.
 * All distances are screen pixels, independent of devicePixelRatio.
 * The final canvas clip is still required when the hero is near the top edge.
 */
export function computeGuardianPreviewDrawSize(
  screenFootY: number,
  footAnchorRatio: number,
  nominalSize = 340,
  safeTop = 72
): number {
  const nominal = Number.isFinite(nominalSize) ? Math.max(80, nominalSize) : 340;
  if (!Number.isFinite(screenFootY) || !Number.isFinite(footAnchorRatio) ||
      footAnchorRatio < 0.20 || footAnchorRatio > 1.0) return nominal;
  const fittingSize = (screenFootY - safeTop) / footAnchorRatio;
  if (!Number.isFinite(fittingSize)) return nominal;
  return Math.max(Math.min(nominal, 180), Math.min(nominal, fittingSize));
}
