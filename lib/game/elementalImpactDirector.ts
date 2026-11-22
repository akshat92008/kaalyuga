/**
 * Phase 1: one restrained heavy-release composition per elemental identity.
 * All geometry stays around the weapon strike point, never an unrelated fullscreen burst.
 * Uses the existing pooled WebGL effect renderer instead of creating another canvas.
 */
import type { WebglDemonSlayerVfxOverlay, DemonSlayerVfxPalette } from './webglDemonSlayerVfx';

export type HeavyElement = 'agni' | 'varuna' | 'vayu' | 'vajra' | 'guardian';

type HeavyEffectMethod =
  | 'spawnSolarFlameWheel'
  | 'spawnPainterlyCleave'
  | 'spawnWaterDragon'
  | 'spawnWindGaleCrescents'
  | 'spawnThunderZigzag'
  | 'spawnSlashRibbon'
  | 'spawnClashStarburst'
  | 'spawnShockwaveRing'
  | 'spawnSparkBurst';

export type HeavyEffectSink = Pick<WebglDemonSlayerVfxOverlay, HeavyEffectMethod>;

export interface HeavyReleaseInput {
  x: number;
  y: number;
  angle: number;
  radius: number;
  energyOrbs?: number;
  element: HeavyElement;
}

export interface HeavyReleaseProfile {
  element: HeavyElement;
  palette: DemonSlayerVfxPalette;
  radius: number;
  reach: number;
  sparks: number;
  duration: number;
}

function clamp(value: number, low: number, high: number): number {
  return Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : low;
}

export function heavyElementFromStance(
  stance: string,
  guardianActive = false
): HeavyElement {
  if (guardianActive) return 'guardian';
  if (stance === 'pillar') return 'vayu';
  if (stance === 'thrust') return 'vajra';
  if (stance === 'water' || stance === 'varuna') return 'varuna';
  return 'agni';
}

export function resolveHeavyReleaseProfile(input: HeavyReleaseInput): HeavyReleaseProfile {
  const orbBoost = clamp(input.energyOrbs ?? 0, 0, 4);
  const radius = clamp(input.radius, 105, 220) + orbBoost * 9;
  const palette: Record<HeavyElement, DemonSlayerVfxPalette> = {
    agni: 'hinokami',
    varuna: 'water',
    vayu: 'wind',
    vajra: 'thunder',
    guardian: 'blood',
  };
  return {
    element: input.element,
    palette: palette[input.element],
    radius,
    reach: radius * (input.element === 'vajra' ? 1.30 : 1.04),
    sparks: Math.round(clamp(11 + orbBoost * 2, 11, 19)),
    duration: input.element === 'guardian' ? 0.74 : 0.64,
  };
}

/**
 * One readable weapon-directed signature per element, with localized contact
 * flare instead of ornamental circles: flame blade, S-curve water dragon,
 * three staggered wind razors, angular thunder and legacy guardian.
 */
export function spawnHeavyElementalRelease(
  fx: HeavyEffectSink | null | undefined,
  input: HeavyReleaseInput
): HeavyReleaseProfile {
  const profile = resolveHeavyReleaseProfile(input);
  if (!fx) return profile;

  const x = Number.isFinite(input.x) ? input.x : 0;
  const y = Number.isFinite(input.y) ? input.y : 0;
  const angle = Number.isFinite(input.angle) ? input.angle : 0;
  const { radius, reach, palette, duration } = profile;
  switch (input.element) {
    case 'agni':
      fx.spawnPainterlyCleave({
        x, y: y - 22, angle, radius: radius * 1.02,
        palette, duration: 0.59, variant: 'flame',
      });
      fx.spawnClashStarburst({ x, y: y - 22, scale: 1.02, duration: 0.20, palette });
      break;
    case 'varuna':
      fx.spawnWaterDragon({ x, y: y - 20, angle, radius: radius * 0.96, duration });
      fx.spawnClashStarburst({ x, y: y - 21, scale: 0.68, duration: 0.14, palette });
      break;
    case 'vayu':
      fx.spawnWindGaleCrescents({ x, y: y - 18, angle, radius, duration });
      fx.spawnClashStarburst({ x, y: y - 20, scale: 0.75, duration: 0.14, palette });
      break;
    case 'vajra':
      fx.spawnThunderZigzag({
        x1: x - Math.cos(angle) * 38,
        y1: y - 20 - Math.sin(angle) * 20,
        x2: x + Math.cos(angle) * reach,
        y2: y - 20 + Math.sin(angle) * reach * 0.68,
        width: 29, duration, palette, withFloorRing: true,
      });
      fx.spawnClashStarburst({ x, y: y - 24, scale: 1.10, duration: 0.30, palette });
      break;
    case 'guardian':
      fx.spawnPainterlyCleave({
        x, y: y - 26, angle, radius,
        palette, duration: 0.66, variant: 'guardian',
      });
      fx.spawnClashStarburst({ x, y: y - 22, scale: 1.23, duration: 0.24, palette });
      break;
  }
  fx.spawnSparkBurst({
    x: x + Math.cos(angle) * 22,
    y: y - 24 + Math.sin(angle) * 12,
    count: profile.sparks,
    speed: 400,
    palette,
  });
  return profile;
}
