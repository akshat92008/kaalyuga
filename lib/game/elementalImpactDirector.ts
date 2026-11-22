/**
 * Phase 1: one restrained heavy-release composition per elemental identity.
 * All geometry stays around the weapon strike point, never an unrelated fullscreen burst.
 * Uses the existing pooled WebGL effect renderer instead of creating another canvas.
 */
import type { WebglDemonSlayerVfxOverlay, DemonSlayerVfxPalette } from './webglDemonSlayerVfx';

export type HeavyElement = 'agni' | 'varuna' | 'vayu' | 'vajra' | 'guardian';

type HeavyEffectMethod =
  | 'spawnSolarFlameWheel'
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
 * One primary silhouette + localized supporting flare. Each style has distinct geometry:
 * fire wheel, serpent-shaped water, emerald crescent gale, branching bolt, crimson guardian.
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
      // Two open, counter-swept ink-edged flame blades instead of the old
      // rotating solar wheel (a luminous orange ring in real gameplay).
      // Their crests remain directional to the impact rather than orbit Rudra.
      fx.spawnSlashRibbon({
        x: x + Math.cos(angle) * 14, y: y - 24 + Math.sin(angle) * 8,
        angle, radius: radius * 0.94, width: 67,
        arcSpan: 2.04, direction: 1, duration: 0.52, palette,
        tiltX: 0.53, spinRate: 0.18,
      });
      fx.spawnSlashRibbon({
        x: x - Math.cos(angle) * 11, y: y - 22 - Math.sin(angle) * 6,
        angle: angle + 0.24, radius: radius * 0.74, width: 38,
        arcSpan: 1.52, direction: -1, duration: 0.43, palette,
        tiltX: 0.71, spinRate: -0.23,
      });
      fx.spawnClashStarburst({ x, y: y - 25, scale: 0.96, duration: 0.22, palette });
      break;
    case 'varuna':
      fx.spawnWaterDragon({ x, y: y - 20, angle, radius: radius * 0.96, duration });
      fx.spawnSlashRibbon({
        x, y: y - 22, angle: angle + 0.18, radius: radius * 0.72, width: 35,
        arcSpan: 1.43, direction: 1, duration: 0.34, palette, spinRate: 0.13,
      });
      break;
    case 'vayu':
      fx.spawnWindGaleCrescents({ x, y: y - 18, angle, radius, duration });
      fx.spawnSlashRibbon({
        x, y: y - 20, angle, radius: radius * 0.77, width: 32,
        arcSpan: 1.67, direction: -1, duration: 0.34, palette, spinRate: -0.16,
      });
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
      fx.spawnSlashRibbon({
        x: x + Math.cos(angle) * 16, y: y - 34,
        angle, radius: radius * 0.92, width: 63,
        arcSpan: 1.96, direction: 1, palette, duration: 0.55,
        tiltX: 0.52, spinRate: 0.11,
      });
      fx.spawnSlashRibbon({
        x, y: y - 38, angle: angle - 0.17,
        radius: radius * 0.67, width: 31, arcSpan: 1.27,
        direction: 1, palette, duration: 0.42, tiltX: 0.61, spinRate: -0.12,
      });
      fx.spawnClashStarburst({ x, y: y - 24, scale: 1.18, duration: 0.23, palette });
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
