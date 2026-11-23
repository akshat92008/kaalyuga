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
      fx.spawnAgniCrescent({
        x, y: y - 18, angle, radius: 148 + clamp(input.energyOrbs ?? 0, 0, 4) * 9,
        duration: 0.50,
      });
      break;
    case 'varuna':
      fx.spawnWaterDragon({ x, y: y - 19, angle, radius: radius * 0.82, duration: 0.68 });
      break;
    case 'vayu':
      fx.spawnWindGaleCrescents({ x, y: y - 18, angle, radius: radius * 0.92, duration: 0.60 });
      break;
    case 'vajra': {
      const boltReach = clamp(reach, 158, 315);
      fx.spawnThunderZigzag({
        x1: x - Math.cos(angle) * 25,
        y1: y - 22 - Math.sin(angle) * 15,
        x2: x + Math.cos(angle) * boltReach,
        y2: y - 22 + Math.sin(angle) * boltReach * 0.78,
        width: 13, duration: 0.37, palette, focused: true, withFloorRing: true,
      });
      break;
    }
    case 'guardian':
      fx.spawnSlashRibbon({
        x, y: y - 34, angle, radius: clamp(radius, 155, 215), spinRate: 0.65,
        palette, duration, tiltX: 0.42, spectralGuardian: true,
      });
      fx.spawnSparkBurst({
        x: x + Math.cos(angle) * 38, y: y - 30 + Math.sin(angle) * 22,
        count: profile.sparks, speed: 340, palette,
      });
      break;
  }
  return profile;
}
