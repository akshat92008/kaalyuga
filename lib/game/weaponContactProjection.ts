/**
 * Phase 0/1: geometry-backed Parashu visual contact coordinates.
 *
 * A real 3D weapon mesh extremity is projected through the same baked
 * Rudra camera, then mapped through the actual sprite draw rectangle.
 * The result is a visual anchor, NOT the authority for damage/hitboxes.
 * Keep the gameplay fallback if the FBX or weapon socket is unavailable.
 */
export interface NdcPoint {
  x: number;
  y: number;
  z?: number;
}

export interface ScreenOffset {
  dx: number;
  dy: number;
}

export interface ScreenContact {
  x: number;
  y: number;
  source: 'weapon_mesh' | 'simulation_fallback';
}

export function ndcWeaponTipToDrawOffset(
  ndc: NdcPoint | null | undefined,
  drawnSpriteSize: number,
  footAnchorRatio: number
): ScreenOffset | null {
  if (!ndc ||
      !Number.isFinite(ndc.x) || !Number.isFinite(ndc.y) ||
      (ndc.z !== undefined && !Number.isFinite(ndc.z)) ||
      !Number.isFinite(drawnSpriteSize) || drawnSpriteSize <= 0 ||
      !Number.isFinite(footAnchorRatio) ||
      footAnchorRatio < -0.25 || footAnchorRatio > 1.25 ||
      Math.abs(ndc.x) > 1.05 || Math.abs(ndc.y) > 1.05 ||
      (ndc.z !== undefined && (ndc.z < -1 || ndc.z > 1))) {
    return null;
  }
  // The baked canvas is positioned at (player.x - size/2,
  // player.y - size*footAnchorRatio) in KaliyugaArena.
  return {
    dx: ndc.x * drawnSpriteSize * 0.5,
    dy: drawnSpriteSize * (0.5 - ndc.y * 0.5 - footAnchorRatio),
  };
}

export function resolveVisualWeaponContact(
  playerX: number,
  playerY: number,
  angle: number,
  fallbackForward: number,
  fallbackVertical: number,
  weaponOffset: ScreenOffset | null | undefined,
  maxReachPx = 110
): ScreenContact {
  const safeAngle = Number.isFinite(angle) ? angle : 0;
  const fallbackX = playerX + Math.cos(safeAngle) * fallbackForward;
  const fallbackY = playerY + Math.sin(safeAngle) * fallbackVertical;
  if (weaponOffset && Number.isFinite(weaponOffset.dx) &&
      Number.isFinite(weaponOffset.dy)) {
    const d = Math.hypot(weaponOffset.dx, weaponOffset.dy);
    // The physical blade may be behind Rudra during the windup, so reject a
    // stale cached frame behind the current swing direction.
    const forward = weaponOffset.dx * Math.cos(safeAngle) +
      weaponOffset.dy * Math.sin(safeAngle);
    if (d >= 12 && d <= Math.min(140, Math.max(20, maxReachPx)) &&
        forward >= -12) {
      return {
        x: playerX + weaponOffset.dx,
        y: playerY + weaponOffset.dy,
        source: 'weapon_mesh',
      };
    }
  }
  return {x: fallbackX, y: fallbackY, source: 'simulation_fallback'};
}
