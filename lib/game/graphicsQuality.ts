export const ACT1_GRAPHICS = {
  performance: { sceneScale: 0.8, effectScale: 0.75, particleScale: 0.5, bloom: false },
  balanced: { sceneScale: 1, effectScale: 1, particleScale: 0.8, bloom: true },
  cinematic: { sceneScale: 1.35, effectScale: 1.35, particleScale: 1, bloom: true },
} as const;

export type GraphicsQuality = keyof typeof ACT1_GRAPHICS;

export function isGraphicsQuality(value: unknown): value is GraphicsQuality {
  return value === 'performance' || value === 'balanced' || value === 'cinematic';
}
