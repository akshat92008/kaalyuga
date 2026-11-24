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
  lane: number,
  fromBlade = false,
): StrokeSample {
  const taper = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.65);
  switch (element) {
    case 'water': {
      const tailLift = fromBlade ? Math.min(1, t * 3.4) : 1;
      const wave = Math.sin(t * Math.PI * 2.16 - 0.35) * reach * 0.17 * tailLift;
      const braid = Math.sin(t * Math.PI * 2.8 + lane * 1.6) * reach * 0.040;
      const crest = Math.exp(-Math.pow((t - 0.84) * 8.5, 2));
      const bodyWidth = Math.min(90, reach * 0.29);
      return {
        x: reach * (t - lane * 0.05 * tailLift),
        y: wave + (braid - lane * 5) * tailLift + (t * t * reach) * 0.04,
        width: lane === 0 ? bodyWidth * taper + 32 * crest + 2 : 24 * taper + 2,
      };
    }
    case 'wind': {
      const angle = -1.19 + 2.33 * t;
      const join = fromBlade ? Math.min(1, t / 0.46) : 1;
      const radius = reach * (0.31 + join * (2 - join) * (0.56 + 0.12 * t));
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.83,
        width: Math.min(88, reach * 0.39) * taper + 1.5,
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
