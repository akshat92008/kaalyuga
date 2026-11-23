export type ElementalStroke = 'water' | 'wind' | 'guardian';

export interface StrokeSample {
  x: number;
  y: number;
  width: number;
}

export function sampleElementalStroke(
  element: ElementalStroke,
  t: number,
  reach: number,
  lane: number
): StrokeSample {
  const taper = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.65);
  switch (element) {
    case 'water': {
      const wave = Math.sin(t * Math.PI * 2.16 - 0.35) * reach * 0.17;
      const braid = Math.sin(t * Math.PI * 2.8 + lane * 1.6) * reach * 0.040;
      const crest = Math.exp(-Math.pow((t - 0.84) * 8.5, 2));
      const bodyWidth = Math.min(90, reach * 0.29);
      return {
        x: reach * (t - lane * 0.05),
        y: wave + braid - lane * 5 + (t * t * reach) * 0.04,
        width: lane === 0 ? bodyWidth * taper + 32 * crest + 2 : 24 * taper + 2,
      };
    }
    case 'wind': {
      const sweep = t * 2 - 1;
      return {
        x: reach * (0.47 + 0.49 * (1 - sweep * sweep) - lane * 0.079) + t * reach * 0.13,
        y: reach * (sweep * (0.49 - lane * 0.062) + lane * 0.047),
        width: (lane === 0 ? Math.min(84, reach * 0.32) : 24 - lane * 3) * taper + 1.5,
      };
    }
    case 'guardian': {
      const angle = -1.02 + t * 2.12;
      const followThrough = 0.60 + 0.48 * Math.sin(t * Math.PI * 0.69);
      return {
        x: Math.cos(angle) * reach * followThrough * (1 - lane * 0.17),
        y: Math.sin(angle) * reach * followThrough * 0.86,
        width: (lane === 0 ? 83 : 29) * taper + 2,
      };
    }
  }
}
