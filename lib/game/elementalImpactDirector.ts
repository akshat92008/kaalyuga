/**
 * Phase 1: one restrained heavy-release composition per elemental identity.
 * All geometry stays around the weapon strike point, never an unrelated fullscreen burst.
 * Uses the existing pooled WebGL effect renderer instead of creating another canvas.
 */
import type { WebglDemonSlayerVfxOverlay, DemonSlayerVfxPalette } from './webglDemonSlayerVfx';

export type HeavyElement = 'agni' | 'varuna' | 'vayu' | 'vajra' | 'guardian';

type HeavyEffectMethod =
  | 'spawnAgniCrescent'
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
  const radius = clamp(input.radius, 155, 295) + orbBoost * 14;
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
    reach: radius * (input.element === 'vajra' ? 1.82 : 1.28),
    sparks: Math.round(clamp(18 + orbBoost * 3, 18, 30)),
    duration: input.element === 'guardian' ? 0.78 : 0.68,
  };
}

/**
 * Full-frame Ufotable heavy elemental release per element:
 * Hinokami fire cyclone, Hokusai clawed-seafoam tidal surge, razor emerald vacuum gale,
 * blazing forked plasma thunderbolt, and crimson guardian sweep.
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
      fx.spawnAgniCrescent({ x, y: y - 18, angle, radius: 135 + clamp(input.energyOrbs ?? 0, 0, 4) * 7,
        duration: 0.48 });
      return profile;
    case 'varuna':
      fx.spawnWaterDragon({ x, y: y - 20, angle, radius: radius * 1.22, duration: duration + 0.1 });
      fx.spawnSlashRibbon({
        x, y: y - 22, angle, radius: radius * 1.24, width: 108,
        arcSpan: 2.95, direction: 1, duration: 0.48, palette, withBackWrap: true,
      });
      break;
    case 'vayu':
      fx.spawnWindGaleCrescents({ x, y: y - 18, angle, radius: radius * 1.32, duration: duration + 0.08 });
      fx.spawnSlashRibbon({
        x, y: y - 20, angle, radius: radius * 1.22, width: 104,
        arcSpan: 3.05, direction: -1, duration: 0.46, palette, withBackWrap: true,
      });
      break;
    case 'vajra':
      fx.spawnThunderZigzag({
        x1: x - Math.cos(angle) * 56,
        y1: y - 22 - Math.sin(angle) * 24,
        x2: x + Math.cos(angle) * reach * 1.22,
        y2: y - 22 + Math.sin(angle) * reach * 0.78,
        width: 44, duration, palette, withFloorRing: true,
      });
      fx.spawnClashStarburst({ x, y: y - 24, scale: 1.55, duration: 0.34, palette });
      break;
    case 'guardian':
      fx.spawnSlashRibbon({
        x, y: y - 34, angle, radius: radius * 1.26, width: 92,
        arcSpan: 3.1, direction: 1, palette, duration, tiltX: 0.56,
      });
      fx.spawnShockwaveRing({ x, y, radius: radius * 1.18, duration: 0.46, palette });
      fx.spawnClashStarburst({ x, y: y - 24, scale: 1.72, duration: 0.32, palette });
      break;
  }
  fx.spawnSparkBurst({
    x: x + Math.cos(angle) * 26,
    y: y - 24 + Math.sin(angle) * 14,
    count: profile.sparks,
    speed: 480,
    palette,
  });
  return profile;
}
