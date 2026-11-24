/**
 * Three sharply different Parashu finisher impact signatures.
 *
 * Rendering remains in the shared pooled WebGL layer, centered on the
 * enemy/weapon contact (never an independent fullscreen screen-space quad).
 * No gameplay damage, scoring, i-frames or cutscene state is owned here.
 */
import type { ParashuFinisherVariant } from './combatPipeline';
import type { WebglDemonSlayerVfxOverlay } from './webglDemonSlayerVfx';

export type ExecutionEffectSink = Pick<WebglDemonSlayerVfxOverlay,
  'spawnSlashRibbon' | 'spawnWindGaleSweep' | 'spawnThunderZigzag' | 'spawnClashStarburst' | 'spawnSparkBurst'>;

export interface ExecutionImpactSignature {
  palette: 'hinokami' | 'wind' | 'thunder';
  strikeRadius: number;
  duration: number;
  sparkCount: number;
}

export function executionImpactSignature(
  variant: ParashuFinisherVariant
): ExecutionImpactSignature {
  switch (variant) {
    case 'downward_crush':
      return { palette: 'hinokami', strikeRadius: 152, duration: 0.46, sparkCount: 16 };
    case 'spin_360_cleave':
      return { palette: 'wind', strikeRadius: 174, duration: 0.52, sparkCount: 18 };
    case 'impaling_lunge':
      return { palette: 'thunder', strikeRadius: 158, duration: 0.42, sparkCount: 14 };
  }
}

export function spawnExecutionImpactFx(
  fx: ExecutionEffectSink | null | undefined,
  variant: ParashuFinisherVariant,
  x: number,
  y: number,
  angle: number
): ExecutionImpactSignature {
  const signature = executionImpactSignature(variant);
  if (!fx) return signature;
  const cx = Number.isFinite(x) ? x : 0;
  const cy = Number.isFinite(y) ? y : 0;
  const direction = Number.isFinite(angle) ? angle : 0;
  const { palette, strikeRadius, duration, sparkCount } = signature;

  switch (variant) {
    case 'downward_crush':
      fx.spawnSlashRibbon({
        x: cx, y: cy - 24, angle: direction, radius: strikeRadius,
        width: 49, arcSpan: 1.68, direction: 1,
        palette, duration: 0.38, tiltX: 0.46, openStrike: true,
      });
      break;
    case 'spin_360_cleave':
      fx.spawnWindGaleSweep({
        x: cx, y: cy - 19, angle: direction,
        radius: strikeRadius, duration, fromBlade: true,
      });
      break;
    case 'impaling_lunge':
      // Spear-line lightning traces the thrust axis rather than spinning
      // around the fighter or looking like the overhead execution.
      fx.spawnThunderZigzag({
        x1: cx - Math.cos(direction) * 62,
        y1: cy - 23 - Math.sin(direction) * 34,
        x2: cx + Math.cos(direction) * strikeRadius,
        y2: cy - 23 + Math.sin(direction) * strikeRadius * 0.55,
        width: 18, duration, palette, focused: true, withFloorRing: false,
      });
      fx.spawnClashStarburst({
        x: cx, y: cy - 24, scale: 0.84,
        duration: 0.26, palette,
      });
      break;
  }
  fx.spawnSparkBurst({
    x: cx + Math.cos(direction) * 14,
    y: cy - 24 + Math.sin(direction) * 8,
    count: sparkCount, speed: 380, palette,
  });
  return signature;
}
