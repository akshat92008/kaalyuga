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
  const taper = Math.pow(Math.sin(Math.PI * t), 0.65);
  switch (element) {
    case 'water': {
      // Staggered braids cross each other as the crest travels forward.
      const wave = Math.sin(t * Math.PI * 2.2 - 0.35) * reach * 0.125;
      const braid = Math.sin(t * Math.PI * 2.8 + lane * 1.6) * reach * 0.058;
      return {
        x: reach * (t - lane * 0.05),
        y: wave + braid - lane * 5 + (t * t * reach) * 0.04,
        width: (lane === 0 ? 37 : 26) * taper + 2,
      };
    }
    case 'wind': {
      const sweep = t * 2 - 1;
      return {
        x: reach * (0.58 + 0.38 * (1 - sweep * sweep) - lane * 0.17) + t * reach * 0.08,
        y: reach * (sweep * (0.39 - lane * 0.045) + lane * 0.064),
        width: (24 - lane * 4) * taper + 1.5,
      };
    }
    case 'guardian': {
      const angle = (t - 0.5) * 2.06;
      return {
        x: Math.cos(angle) * reach * (1 - lane * 0.26),
        y: Math.sin(angle) * reach * (0.78 - lane * 0.12),
        width: (lane === 0 ? 52 : 28) * taper + 2,
      };
    }
  }
}
