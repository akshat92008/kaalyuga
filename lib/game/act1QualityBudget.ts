import type { MeruQualityTier } from '../../engine/ue5GraphicsEngine';

export interface Act1VfxQualityBudget {
  pixelRatio: number;
  sparkMultiplier: number;
  maxLiveSparks: number;
  bloomEnabled: boolean;
  bloomStrength: number;
}

/** Keep mandatory attack silhouettes and boss telegraphs; only scale secondary GPU work. */
export function resolveAct1VfxQualityBudget(tier: MeruQualityTier): Act1VfxQualityBudget {
  if (tier === 'performance') {
    return { pixelRatio: 0.67, sparkMultiplier: 0.38, maxLiveSparks: 40,
      bloomEnabled: false, bloomStrength: 0 };
  }
  if (tier === 'balanced') {
    return { pixelRatio: 0.85, sparkMultiplier: 0.7, maxLiveSparks: 80,
      bloomEnabled: true, bloomStrength: 0.38 };
  }
  if (tier === 'high') {
    return { pixelRatio: 1.0, sparkMultiplier: 0.9, maxLiveSparks: 100,
      bloomEnabled: true, bloomStrength: 0.52 };
  }
  return { pixelRatio: 1.35, sparkMultiplier: 1, maxLiveSparks: 110,
    bloomEnabled: true, bloomStrength: 0.68 };
}
