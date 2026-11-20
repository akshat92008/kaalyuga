export type BloodDemonArtPalette =
  | 'hinokami'
  | 'blood'
  | 'thunder'
  | 'void'
  | 'sun'
  | 'magma'
  | 'bronze'
  | 'water'
  | 'wind';

export type EnemyBloodDemonArtKind =
  | 'blood_sickles'
  | 'blood_threads'
  | 'iron_fang_cleave'
  | 'crimson_marrow_slam'
  | 'exploding_blood_seeds'
  | 'ember_arrow_rain'
  | 'ash_cyclone_vortex'
  | 'magma_fissure_geyser'
  | 'dharma_chakram_mandala'
  | 'sonic_war_mandala'
  | 'eclipse_calamity_art';

export interface EnemyBloodDemonArtProfile {
  kind: EnemyBloodDemonArtKind;
  artName: string;
  palette: BloodDemonArtPalette;
  primaryHex: string;
  coreHex: string;
  inkHex: string;
}

export interface BdaSlashArc {
  active: boolean;
  x: number;
  y: number;
  angle: number;
  arcSpan: number;
  radius: number;
  thickness: number;
  life: number;
  maxLife: number;
  palette: BloodDemonArtPalette;
  direction: 1 | -1;
  seed: number;
}

export interface BdaBloodSickle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
  spin: number;
  life: number;
  maxLife: number;
  palette: BloodDemonArtPalette;
}

export interface BdaBloodSeed {
  active: boolean;
  id: number;
  x: number;
  y: number;
  radius: number;
  damage: number;
  ownerSide: 'player' | 'enemy';
  life: number;
  maxLife: number;
  detonated: boolean;
  palette: BloodDemonArtPalette;
  seed: number;
}

export interface BdaCycloneArm {
  active: boolean;
  x: number;
  y: number;
  innerRadius: number;
  outerRadius: number;
  armCount: number;
  rotation: number;
  spinRate: number;
  life: number;
  maxLife: number;
  palette: BloodDemonArtPalette;
}

export interface BdaChakramRing {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  blades: number;
  rotation: number;
  life: number;
  maxLife: number;
  palette: BloodDemonArtPalette;
}

export interface BdaMagmaGeyser {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxHeight: number;
  life: number;
  maxLife: number;
  palette: BloodDemonArtPalette;
  seed: number;
}

export interface BdaSonicMandala {
  active: boolean;
  x: number;
  y: number;
  maxRadius: number;
  ringCount: number;
  rotation: number;
  life: number;
  maxLife: number;
  palette: BloodDemonArtPalette;
}

export interface BdaArrowTrail {
  active: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
  palette: BloodDemonArtPalette;
}

export interface BdaBloodThread {
  active: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
  pulsePhase: number;
  palette: BloodDemonArtPalette;
}

export interface BdaClashSpark {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  angle: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface BdaSunHaloRing {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  rotation: number;
  life: number;
  maxLife: number;
  palette: BloodDemonArtPalette;
}

export interface BdaSpeedStreak {
  active: boolean;
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface BloodSeedDetonation {
  id: number;
  x: number;
  y: number;
  radius: number;
  damage: number;
  ownerSide: 'player' | 'enemy';
  palette: BloodDemonArtPalette;
}

export interface BloodDemonArtPool {
  slashArcs: BdaSlashArc[];
  bloodSickles: BdaBloodSickle[];
  bloodSeeds: BdaBloodSeed[];
  cycloneArms: BdaCycloneArm[];
  chakramRings: BdaChakramRing[];
  magmaGeysers: BdaMagmaGeyser[];
  sonicMandalas: BdaSonicMandala[];
  arrowTrails: BdaArrowTrail[];
  bloodThreads: BdaBloodThread[];
  clashSparks: BdaClashSpark[];
  sunHaloRings: BdaSunHaloRing[];
  speedStreaks: BdaSpeedStreak[];
  impactInversionTimer: number;
  impactInversionDuration: number;
  impactInversionColor: string;
  impactOriginX: number;
  impactOriginY: number;
  nextSeedId: number;
}

const PALETTE_COLORS: Record<
  BloodDemonArtPalette,
  { outer: string; mid: string; core: string; ink: string; bloom: string }
> = {
  hinokami: {
    outer: '#e62200',
    mid: '#ff9614',
    core: '#fffce6',
    ink: '#140604',
    bloom: '#ff5e00',
  },
  blood: {
    outer: '#990024',
    mid: '#ff1744',
    core: '#ffe4ec',
    ink: '#0d0205',
    bloom: '#ff1f5a',
  },
  thunder: {
    outer: '#f59e0b',
    mid: '#ffe94d',
    core: '#ffffff',
    ink: '#120e04',
    bloom: '#38e8ff',
  },
  void: {
    outer: '#520c3c',
    mid: '#e11d74',
    core: '#ffd6f5',
    ink: '#0a0208',
    bloom: '#ff2478',
  },
  sun: {
    outer: '#ff2e00',
    mid: '#ffba1a',
    core: '#ffffff',
    ink: '#140604',
    bloom: '#ff7700',
  },
  magma: {
    outer: '#b81a06',
    mid: '#ff6a18',
    core: '#fff0b3',
    ink: '#120705',
    bloom: '#ff4818',
  },
  bronze: {
    outer: '#0284c7',
    mid: '#38e8ff',
    core: '#ffffff',
    ink: '#04101f',
    bloom: '#00d4ff',
  },
  water: {
    outer: '#062b7a',
    mid: '#009dff',
    core: '#ffffff',
    ink: '#040d21',
    bloom: '#38e8ff',
  },
  wind: {
    outer: '#047857',
    mid: '#26f78d',
    core: '#eefff7',
    ink: '#04120c',
    bloom: '#10b981',
  },
};

export const BDA_POOL_CAPS = {
  slashArcs: 36,
  bloodSickles: 28,
  bloodSeeds: 32,
  cycloneArms: 16,
  chakramRings: 20,
  magmaGeysers: 20,
  sonicMandalas: 16,
  arrowTrails: 36,
  bloodThreads: 40,
  clashSparks: 96,
  sunHaloRings: 14,
  speedStreaks: 64,
} as const;

export function createBloodDemonArtPool(): BloodDemonArtPool {
  const makeList = <T>(count: number, init: (i: number) => T): T[] =>
    Array.from({ length: count }, (_, i) => init(i));

  return {
    slashArcs: makeList(BDA_POOL_CAPS.slashArcs, () => ({
      active: false,
      x: 0,
      y: 0,
      angle: 0,
      arcSpan: 2.1,
      radius: 90,
      thickness: 18,
      life: 0,
      maxLife: 0.25,
      palette: 'hinokami',
      direction: 1,
      seed: 0,
    })),
    bloodSickles: makeList(BDA_POOL_CAPS.bloodSickles, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 30,
      angle: 0,
      spin: 9,
      life: 0,
      maxLife: 0.5,
      palette: 'blood',
    })),
    bloodSeeds: makeList(BDA_POOL_CAPS.bloodSeeds, () => ({
      active: false,
      id: 0,
      x: 0,
      y: 0,
      radius: 44,
      damage: 32,
      ownerSide: 'player',
      life: 0,
      maxLife: 0.72,
      detonated: false,
      palette: 'blood',
      seed: 0,
    })),
    cycloneArms: makeList(BDA_POOL_CAPS.cycloneArms, () => ({
      active: false,
      x: 0,
      y: 0,
      innerRadius: 24,
      outerRadius: 118,
      armCount: 4,
      rotation: 0,
      spinRate: 7,
      life: 0,
      maxLife: 0.55,
      palette: 'hinokami',
    })),
    chakramRings: makeList(BDA_POOL_CAPS.chakramRings, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 26,
      blades: 8,
      rotation: 0,
      life: 0,
      maxLife: 0.65,
      palette: 'blood',
    })),
    magmaGeysers: makeList(BDA_POOL_CAPS.magmaGeysers, () => ({
      active: false,
      x: 0,
      y: 0,
      radius: 46,
      maxHeight: 110,
      life: 0,
      maxLife: 0.52,
      palette: 'magma',
      seed: 0,
    })),
    sonicMandalas: makeList(BDA_POOL_CAPS.sonicMandalas, () => ({
      active: false,
      x: 0,
      y: 0,
      maxRadius: 180,
      ringCount: 3,
      rotation: 0,
      life: 0,
      maxLife: 0.48,
      palette: 'bronze',
    })),
    arrowTrails: makeList(BDA_POOL_CAPS.arrowTrails, () => ({
      active: false,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      life: 0,
      maxLife: 0.24,
      palette: 'blood',
    })),
    bloodThreads: makeList(BDA_POOL_CAPS.bloodThreads, () => ({
      active: false,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      life: 0,
      maxLife: 0.34,
      pulsePhase: 0,
      palette: 'void',
    })),
    clashSparks: makeList(BDA_POOL_CAPS.clashSparks, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      length: 20,
      angle: 0,
      color: '#ffd86b',
      life: 0,
      maxLife: 0.22,
    })),
    sunHaloRings: makeList(BDA_POOL_CAPS.sunHaloRings, () => ({
      active: false,
      x: 0,
      y: 0,
      radius: 105,
      rotation: 0,
      life: 0,
      maxLife: 0.42,
      palette: 'sun',
    })),
    speedStreaks: makeList(BDA_POOL_CAPS.speedStreaks, () => ({
      active: false,
      x: 0,
      y: 0,
      angle: 0,
      length: 44,
      width: 4,
      color: '#ff4818',
      life: 0,
      maxLife: 0.18,
    })),
    impactInversionTimer: 0,
    impactInversionDuration: 0.045,
    impactInversionColor: '#fff3d1',
    impactOriginX: 0,
    impactOriginY: 0,
    nextSeedId: 1,
  };
}

function allocSlot<T extends { active: boolean; life: number }>(pool: T[]): T {
  let oldestIdx = 0;
  let lowestLife = Infinity;
  for (let i = 0; i < pool.length; i++) {
    if (!pool[i].active) return pool[i];
    if (pool[i].life < lowestLife) {
      lowestLife = pool[i].life;
      oldestIdx = i;
    }
  }
  return pool[oldestIdx];
}

export function resolveEnemyBloodDemonArtKind(
  type: string,
  trait?: string
): EnemyBloodDemonArtProfile {
  switch (type) {
    case 'charnel_ghoul':
      return {
        kind: 'blood_sickles',
        artName: 'RAKTADARA · BLOOD SICKLE CRESCENTS',
        palette: 'blood',
        primaryHex: '#d9163c',
        coreHex: '#ffd1dc',
        inkHex: '#120806',
      };
    case 'ashen_oracle':
      return {
        kind: 'blood_threads',
        artName: 'MAYA-JALA · CUTTING BLOOD THREADS',
        palette: 'void',
        primaryHex: '#c42466',
        coreHex: '#ffe6f0',
        inkHex: '#0a0408',
      };
    case 'ironmaw_gladiator':
      return {
        kind: 'iron_fang_cleave',
        artName: 'LOHA-DAMSTRA · IRON FANG CLEAVE',
        palette: trait === 'agni_aura' ? 'hinokami' : 'bronze',
        primaryHex: '#f5b041',
        coreHex: '#fff3d1',
        inkHex: '#120b05',
      };
    case 'bloodmaw_brute':
      return {
        kind: 'crimson_marrow_slam',
        artName: 'ASTHI-BHANGA · MARROW SHATTER RIFT',
        palette: 'magma',
        primaryHex: '#e63b1c',
        coreHex: '#ffe89c',
        inkHex: '#120705',
      };
    case 'semi_boss_bloodforge':
      return {
        kind: 'exploding_blood_seeds',
        artName: 'RAKTABIJA · EXPLODING BLOOD SEEDS',
        palette: 'blood',
        primaryHex: '#ff1f6d',
        coreHex: '#ffd8e8',
        inkHex: '#0d0306',
      };
    case 'preta_bowman':
      return {
        kind: 'ember_arrow_rain',
        artName: 'PRETA-SHARA · CRIMSON ARROW VOLLEY',
        palette: 'hinokami',
        primaryHex: '#ff4818',
        coreHex: '#fff3a8',
        inkHex: '#120806',
      };
    case 'ash_cyclone_warden':
      return {
        kind: 'ash_cyclone_vortex',
        artName: 'BHASMA-VAYU · ASHEN CYCLONE SPIRAL',
        palette: 'sun',
        primaryHex: '#ff6a1c',
        coreHex: '#fff9d6',
        inkHex: '#140804',
      };
    case 'molten_titan_warden':
      return {
        kind: 'magma_fissure_geyser',
        artName: 'JATHARAGNI · VOLCANIC MAGMA PILLARS',
        palette: 'magma',
        primaryHex: '#ff4514',
        coreHex: '#ffe89c',
        inkHex: '#120705',
      };
    case 'eternal_wheel_warden':
      return {
        kind: 'dharma_chakram_mandala',
        artName: 'KALA-CHAKRA · CRIMSON DHARMA WHEELS',
        palette: 'blood',
        primaryHex: '#e61c4c',
        coreHex: '#ffe2ec',
        inkHex: '#0d0306',
      };
    case 'dundubhi':
      return {
        kind: 'sonic_war_mandala',
        artName: 'BHERI-NADA · CYMATIC WAR-DRUM MANDALA',
        palette: 'bronze',
        primaryHex: '#f5b041',
        coreHex: '#fff1b8',
        inkHex: '#120b05',
      };
    case 'vrikodara':
      return {
        kind: 'eclipse_calamity_art',
        artName: 'KALIYUGA PRALAYA · BLACK-SUN ECLIPSE ART',
        palette: 'void',
        primaryHex: '#ff2448',
        coreHex: '#fff3a8',
        inkHex: '#0a0408',
      };
    default:
      return {
        kind: 'blood_sickles',
        artName: 'RAKTADARA · CRIMSON ARC',
        palette: 'blood',
        primaryHex: '#d9163c',
        coreHex: '#ffd1dc',
        inkHex: '#120806',
      };
  }
}

export function spawnHinokamiSlashArc(
  pool: BloodDemonArtPool,
  opts: {
    x: number;
    y: number;
    angle: number;
    arcSpan?: number;
    radius?: number;
    thickness?: number;
    duration?: number;
    palette?: BloodDemonArtPalette;
    direction?: 1 | -1;
  }
): void {
  const slot = allocSlot(pool.slashArcs);
  slot.active = true;
  slot.x = opts.x;
  slot.y = opts.y;
  slot.angle = opts.angle;
  slot.arcSpan = opts.arcSpan ?? 2.35;
  slot.radius = opts.radius ?? 96;
  slot.thickness = opts.thickness ?? 24;
  slot.maxLife = opts.duration ?? 0.30;
  slot.life = slot.maxLife;
  slot.palette = opts.palette ?? 'hinokami';
  slot.direction = opts.direction ?? 1;
  slot.seed = (pool.nextSeedId++ * 1.37) % 6.283;

  // Companion speed streaks along the blade rim
  const pal = PALETTE_COLORS[slot.palette];
  for (let i = 0; i < 4; i++) {
    const t = (i / 3 - 0.5) * slot.arcSpan * 0.85;
    const a = slot.angle + t;
    spawnBdaSpeedStreak(pool, {
      x: slot.x + Math.cos(a) * (slot.radius * 0.86),
      y: slot.y + Math.sin(a) * (slot.radius * 0.54),
      angle: a + slot.direction * 1.35,
      length: 30 + i * 7,
      width: 3.2,
      color: i % 2 === 0 ? pal.core : pal.mid,
      duration: 0.16,
    });
  }
}

export function spawnBloodSickle(
  pool: BloodDemonArtPool,
  opts: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius?: number;
    spin?: number;
    duration?: number;
    palette?: BloodDemonArtPalette;
  }
): void {
  const slot = allocSlot(pool.bloodSickles);
  slot.active = true;
  slot.x = opts.x;
  slot.y = opts.y;
  slot.vx = opts.vx;
  slot.vy = opts.vy;
  slot.radius = opts.radius ?? 28;
  slot.angle = Math.atan2(opts.vy, opts.vx);
  slot.spin = opts.spin ?? 11;
  slot.maxLife = opts.duration ?? 0.55;
  slot.life = slot.maxLife;
  slot.palette = opts.palette ?? 'blood';
}

export function spawnExplodingBloodSeed(
  pool: BloodDemonArtPool,
  opts: {
    x: number;
    y: number;
    radius?: number;
    damage?: number;
    ownerSide: 'player' | 'enemy';
    delaySec?: number;
    palette?: BloodDemonArtPalette;
  }
): void {
  const slot = allocSlot(pool.bloodSeeds);
  slot.active = true;
  slot.id = pool.nextSeedId++;
  slot.x = opts.x;
  slot.y = opts.y;
  slot.radius = opts.radius ?? 54;
  slot.damage = opts.damage ?? 34;
  slot.ownerSide = opts.ownerSide;
  slot.maxLife = opts.delaySec ?? 0.68;
  slot.life = slot.maxLife;
  slot.detonated = false;
  slot.palette = opts.palette ?? 'blood';
  slot.seed = (slot.id * 2.13) % 6.283;
}

export function spawnCycloneVortex(
  pool: BloodDemonArtPool,
  opts: {
    x: number;
    y: number;
    innerRadius?: number;
    outerRadius?: number;
    armCount?: number;
    spinRate?: number;
    duration?: number;
    palette?: BloodDemonArtPalette;
  }
): void {
  const slot = allocSlot(pool.cycloneArms);
  slot.active = true;
  slot.x = opts.x;
  slot.y = opts.y;
  slot.innerRadius = opts.innerRadius ?? 20;
  slot.outerRadius = opts.outerRadius ?? 125;
  slot.armCount = opts.armCount ?? 5;
  slot.rotation = (pool.nextSeedId++ * 0.7) % (Math.PI * 2);
  slot.spinRate = opts.spinRate ?? 8.5;
  slot.maxLife = opts.duration ?? 0.52;
  slot.life = slot.maxLife;
  slot.palette = opts.palette ?? 'sun';
}

export function spawnChakramRing(
  pool: BloodDemonArtPool,
  opts: {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    radius?: number;
    blades?: number;
    duration?: number;
    palette?: BloodDemonArtPalette;
  }
): void {
  const slot = allocSlot(pool.chakramRings);
  slot.active = true;
  slot.x = opts.x;
  slot.y = opts.y;
  slot.vx = opts.vx ?? 0;
  slot.vy = opts.vy ?? 0;
  slot.radius = opts.radius ?? 28;
  slot.blades = opts.blades ?? 8;
  slot.rotation = 0;
  slot.maxLife = opts.duration ?? 0.6;
  slot.life = slot.maxLife;
  slot.palette = opts.palette ?? 'blood';
}

export function spawnMagmaGeyser(
  pool: BloodDemonArtPool,
  opts: {
    x: number;
    y: number;
    radius?: number;
    maxHeight?: number;
    duration?: number;
    palette?: BloodDemonArtPalette;
  }
): void {
  const slot = allocSlot(pool.magmaGeysers);
  slot.active = true;
  slot.x = opts.x;
  slot.y = opts.y;
  slot.radius = opts.radius ?? 46;
  slot.maxHeight = opts.maxHeight ?? 116;
  slot.maxLife = opts.duration ?? 0.56;
  slot.life = slot.maxLife;
  slot.palette = opts.palette ?? 'magma';
  slot.seed = (pool.nextSeedId++ * 1.73) % 6.283;
}

export function spawnSonicMandala(
  pool: BloodDemonArtPool,
  opts: {
    x: number;
    y: number;
    maxRadius?: number;
    ringCount?: number;
    duration?: number;
    palette?: BloodDemonArtPalette;
  }
): void {
  const slot = allocSlot(pool.sonicMandalas);
  slot.active = true;
  slot.x = opts.x;
  slot.y = opts.y;
  slot.maxRadius = opts.maxRadius ?? 185;
  slot.ringCount = opts.ringCount ?? 4;
  slot.rotation = 0;
  slot.maxLife = opts.duration ?? 0.52;
  slot.life = slot.maxLife;
  slot.palette = opts.palette ?? 'bronze';
}

export function spawnArrowTrail(
  pool: BloodDemonArtPool,
  opts: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    duration?: number;
    palette?: BloodDemonArtPalette;
  }
): void {
  const slot = allocSlot(pool.arrowTrails);
  slot.active = true;
  slot.x1 = opts.x1;
  slot.y1 = opts.y1;
  slot.x2 = opts.x2;
  slot.y2 = opts.y2;
  slot.maxLife = opts.duration ?? 0.24;
  slot.life = slot.maxLife;
  slot.palette = opts.palette ?? 'hinokami';
}

export function spawnBloodThread(
  pool: BloodDemonArtPool,
  opts: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    duration?: number;
    palette?: BloodDemonArtPalette;
  }
): void {
  const slot = allocSlot(pool.bloodThreads);
  slot.active = true;
  slot.x1 = opts.x1;
  slot.y1 = opts.y1;
  slot.x2 = opts.x2;
  slot.y2 = opts.y2;
  slot.maxLife = opts.duration ?? 0.36;
  slot.life = slot.maxLife;
  slot.pulsePhase = (pool.nextSeedId++ * 0.9) % 6.28;
  slot.palette = opts.palette ?? 'void';
}

const TENGEN_CLASH_HUES = ['#ff2438', '#ffd86b', '#6bf0ff'] as const;

export function spawnTengenClashSparks(
  pool: BloodDemonArtPool,
  x: number,
  y: number,
  count = 14,
  baseSpeed = 360
): void {
  for (let i = 0; i < count; i++) {
    const slot = allocSlot(pool.clashSparks);
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    const speed = baseSpeed * (0.65 + Math.random() * 0.75);
    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.vx = Math.cos(angle) * speed;
    slot.vy = Math.sin(angle) * speed * 0.72;
    slot.angle = angle;
    slot.length = 18 + Math.random() * 24;
    slot.color = TENGEN_CLASH_HUES[i % TENGEN_CLASH_HUES.length];
    slot.maxLife = 0.16 + Math.random() * 0.12;
    slot.life = slot.maxLife;
  }
}

export function spawnSunHaloRing(
  pool: BloodDemonArtPool,
  opts: {
    x: number;
    y: number;
    radius?: number;
    duration?: number;
    palette?: BloodDemonArtPalette;
  }
): void {
  const slot = allocSlot(pool.sunHaloRings);
  slot.active = true;
  slot.x = opts.x;
  slot.y = opts.y;
  slot.radius = opts.radius ?? 116;
  slot.rotation = 0;
  slot.maxLife = opts.duration ?? 0.42;
  slot.life = slot.maxLife;
  slot.palette = opts.palette ?? 'sun';
}

export function spawnBdaSpeedStreak(
  pool: BloodDemonArtPool,
  opts: {
    x: number;
    y: number;
    angle: number;
    length?: number;
    width?: number;
    color?: string;
    duration?: number;
  }
): void {
  const slot = allocSlot(pool.speedStreaks);
  slot.active = true;
  slot.x = opts.x;
  slot.y = opts.y;
  slot.angle = opts.angle;
  slot.length = opts.length ?? 46;
  slot.width = opts.width ?? 3.5;
  slot.color = opts.color ?? '#ff4818';
  slot.maxLife = opts.duration ?? 0.18;
  slot.life = slot.maxLife;
}

export function triggerImpactInversionFlash(
  pool: BloodDemonArtPool,
  x: number,
  y: number,
  duration = 0.048,
  tintColor = '#fff3d1'
): void {
  pool.impactInversionDuration = Math.max(0.032, duration);
  pool.impactInversionTimer = pool.impactInversionDuration;
  pool.impactInversionColor = tintColor;
  pool.impactOriginX = x;
  pool.impactOriginY = y;
}

export function triggerEnemyBloodDemonArtAttack(
  pool: BloodDemonArtPool,
  opts: {
    enemyType: string;
    trait?: string;
    phase?: number;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    aimAngle: number;
    radius: number;
    attackPattern?: number;
    damage?: number;
  }
): EnemyBloodDemonArtProfile {
  const profile = resolveEnemyBloodDemonArtKind(opts.enemyType, opts.trait);
  const cos = Math.cos(opts.aimAngle);
  const sin = Math.sin(opts.aimAngle);
  const dmg = Math.max(12, Math.round((opts.damage ?? 28) * 0.6));

  switch (profile.kind) {
    case 'blood_sickles': {
      spawnHinokamiSlashArc(pool, {
        x: opts.x,
        y: opts.y - 26,
        angle: opts.aimAngle,
        arcSpan: 2.0,
        radius: Math.max(66, opts.radius * 0.9),
        thickness: 18,
        palette: 'blood',
      });
      spawnBloodSickle(pool, {
        x: opts.x + cos * 22,
        y: opts.y - 24 + sin * 14,
        vx: cos * 310,
        vy: sin * 240,
        radius: 26,
        palette: 'blood',
      });
      break;
    }
    case 'blood_threads': {
      for (let i = -2; i <= 2; i++) {
        const a = opts.aimAngle + i * 0.24;
        spawnBloodThread(pool, {
          x1: opts.x,
          y1: opts.y - 30,
          x2: opts.x + Math.cos(a) * 195,
          y2: opts.y - 18 + Math.sin(a) * 130,
          duration: 0.42,
          palette: 'void',
        });
      }
      spawnExplodingBloodSeed(pool, {
        x: opts.targetX,
        y: opts.targetY,
        radius: 48,
        damage: dmg,
        ownerSide: 'enemy',
        delaySec: 0.78,
        palette: 'void',
      });
      break;
    }
    case 'iron_fang_cleave': {
      spawnHinokamiSlashArc(pool, {
        x: opts.x,
        y: opts.y - 28,
        angle: opts.aimAngle,
        arcSpan: 2.3,
        radius: Math.max(82, opts.radius),
        thickness: 20,
        palette: profile.palette,
      });
      spawnTengenClashSparks(pool, opts.x + cos * 44, opts.y - 24 + sin * 30, 8, 280);
      break;
    }
    case 'crimson_marrow_slam': {
      spawnSonicMandala(pool, {
        x: opts.x + cos * 32,
        y: opts.y + sin * 20,
        maxRadius: Math.max(108, opts.radius * 1.15),
        ringCount: 2,
        duration: 0.44,
        palette: 'magma',
      });
      spawnMagmaGeyser(pool, {
        x: opts.x + cos * 58,
        y: opts.y + sin * 36,
        radius: 42,
        maxHeight: 82,
        palette: 'magma',
      });
      break;
    }
    case 'exploding_blood_seeds': {
      spawnHinokamiSlashArc(pool, {
        x: opts.x,
        y: opts.y - 34,
        angle: opts.aimAngle,
        arcSpan: 2.5,
        radius: Math.max(106, opts.radius * 1.08),
        thickness: 24,
        palette: 'blood',
      });
      for (let i = -1; i <= 1; i++) {
        const a = opts.aimAngle + i * 0.42;
        spawnBloodSickle(pool, {
          x: opts.x + Math.cos(a) * 24,
          y: opts.y - 26 + Math.sin(a) * 16,
          vx: Math.cos(a) * 320,
          vy: Math.sin(a) * 235,
          radius: 30,
          palette: 'blood',
        });
        spawnExplodingBloodSeed(pool, {
          x: opts.x + Math.cos(a) * 95,
          y: opts.y + Math.sin(a) * 65,
          radius: 52,
          damage: dmg,
          ownerSide: 'enemy',
          delaySec: 0.65 + Math.abs(i) * 0.12,
          palette: 'blood',
        });
      }
      break;
    }
    case 'ember_arrow_rain': {
      for (let i = -1; i <= 1; i++) {
        const a = opts.aimAngle + i * 0.16;
        spawnArrowTrail(pool, {
          x1: opts.x,
          y1: opts.y - 32,
          x2: opts.x + Math.cos(a) * 260,
          y2: opts.y - 22 + Math.sin(a) * 170,
          duration: 0.28,
          palette: 'hinokami',
        });
      }
      break;
    }
    case 'ash_cyclone_vortex': {
      spawnCycloneVortex(pool, {
        x: opts.x,
        y: opts.y - 12,
        innerRadius: 22,
        outerRadius: Math.max(122, opts.radius * 1.25),
        armCount: 5,
        spinRate: 9.5,
        duration: 0.56,
        palette: 'sun',
      });
      spawnSunHaloRing(pool, {
        x: opts.x,
        y: opts.y - 18,
        radius: 96,
        duration: 0.42,
        palette: 'sun',
      });
      break;
    }
    case 'magma_fissure_geyser': {
      for (let i = 0; i < 3; i++) {
        const dist = 54 + i * 48;
        spawnMagmaGeyser(pool, {
          x: opts.x + cos * dist,
          y: opts.y + sin * dist * 0.72,
          radius: 44 + i * 4,
          maxHeight: 96 + i * 16,
          duration: 0.56 + i * 0.08,
          palette: 'magma',
        });
      }
      break;
    }
    case 'dharma_chakram_mandala': {
      for (let i = -1; i <= 1; i++) {
        const a = opts.aimAngle + i * 0.34;
        spawnChakramRing(pool, {
          x: opts.x + Math.cos(a) * 28,
          y: opts.y - 22 + Math.sin(a) * 18,
          vx: Math.cos(a) * 260,
          vy: Math.sin(a) * 185,
          radius: 28,
          blades: 8,
          duration: 0.65,
          palette: 'blood',
        });
      }
      break;
    }
    case 'sonic_war_mandala': {
      spawnSonicMandala(pool, {
        x: opts.x,
        y: opts.y - 10,
        maxRadius: Math.max(178, opts.radius * 1.25),
        ringCount: 4,
        duration: 0.55,
        palette: (opts.phase ?? 1) >= 2 ? 'hinokami' : 'bronze',
      });
      spawnHinokamiSlashArc(pool, {
        x: opts.x,
        y: opts.y - 42,
        angle: opts.aimAngle,
        arcSpan: 2.8,
        radius: 146,
        thickness: 28,
        palette: (opts.phase ?? 1) >= 2 ? 'blood' : 'bronze',
      });
      break;
    }
    case 'eclipse_calamity_art': {
      const pat = (opts.attackPattern ?? 0) % 4;
      spawnHinokamiSlashArc(pool, {
        x: opts.x,
        y: opts.y - 44,
        angle: opts.aimAngle,
        arcSpan: 3.1,
        radius: 162,
        thickness: 30,
        palette: (opts.phase ?? 1) >= 2 ? 'void' : 'hinokami',
      });
      if (pat === 0 || (opts.phase ?? 1) >= 2) {
        spawnCycloneVortex(pool, {
          x: opts.x,
          y: opts.y - 14,
          innerRadius: 28,
          outerRadius: 158,
          armCount: 6,
          spinRate: 10.2,
          duration: 0.62,
          palette: 'void',
        });
      }
      if (pat === 1 || (opts.phase ?? 1) >= 3) {
        spawnExplodingBloodSeed(pool, {
          x: opts.targetX,
          y: opts.targetY,
          radius: 60,
          damage: dmg,
          ownerSide: 'enemy',
          delaySec: 0.72,
          palette: 'blood',
        });
      }
      if (pat === 2) {
        spawnMagmaGeyser(pool, {
          x: opts.x + cos * 88,
          y: opts.y + sin * 60,
          radius: 54,
          maxHeight: 132,
          duration: 0.6,
          palette: 'magma',
        });
      }
      break;
    }
  }

  return profile;
}

export function stepBloodDemonArtPool(
  pool: BloodDemonArtPool,
  dt: number
): BloodSeedDetonation[] {
  const detonations: BloodSeedDetonation[] = [];
  if (dt <= 0) return detonations;

  if (pool.impactInversionTimer > 0) {
    pool.impactInversionTimer = Math.max(0, pool.impactInversionTimer - dt);
  }

  const stepSimple = <T extends { active: boolean; life: number }>(arr: T[]) => {
    for (let i = 0; i < arr.length; i++) {
      if (!arr[i].active) continue;
      arr[i].life -= dt;
      if (arr[i].life <= 0) {
        arr[i].active = false;
      }
    }
  };

  stepSimple(pool.slashArcs);
  stepSimple(pool.magmaGeysers);
  stepSimple(pool.arrowTrails);
  stepSimple(pool.speedStreaks);

  for (let i = 0; i < pool.bloodSickles.length; i++) {
    const s = pool.bloodSickles[i];
    if (!s.active) continue;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.angle += s.spin * dt;
    s.life -= dt;
    if (s.life <= 0) s.active = false;
  }

  for (let i = 0; i < pool.bloodSeeds.length; i++) {
    const seed = pool.bloodSeeds[i];
    if (!seed.active) continue;
    seed.life -= dt;
    if (seed.life <= 0 && !seed.detonated) {
      seed.detonated = true;
      seed.active = false;
      detonations.push({
        id: seed.id,
        x: seed.x,
        y: seed.y,
        radius: seed.radius,
        damage: seed.damage,
        ownerSide: seed.ownerSide,
        palette: seed.palette,
      });
      // Visual burst right inside the pool so detonations always feel explosive
      spawnTengenClashSparks(pool, seed.x, seed.y - 14, 12, 310);
      spawnSonicMandala(pool, {
        x: seed.x,
        y: seed.y,
        maxRadius: seed.radius * 1.45,
        ringCount: 2,
        duration: 0.34,
        palette: seed.palette,
      });
    }
  }

  for (let i = 0; i < pool.cycloneArms.length; i++) {
    const c = pool.cycloneArms[i];
    if (!c.active) continue;
    c.rotation += c.spinRate * dt;
    c.life -= dt;
    if (c.life <= 0) c.active = false;
  }

  for (let i = 0; i < pool.chakramRings.length; i++) {
    const ch = pool.chakramRings[i];
    if (!ch.active) continue;
    ch.x += ch.vx * dt;
    ch.y += ch.vy * dt;
    ch.rotation += 13.5 * dt;
    ch.life -= dt;
    if (ch.life <= 0) ch.active = false;
  }

  for (let i = 0; i < pool.sonicMandalas.length; i++) {
    const m = pool.sonicMandalas[i];
    if (!m.active) continue;
    m.rotation += 2.6 * dt;
    m.life -= dt;
    if (m.life <= 0) m.active = false;
  }

  for (let i = 0; i < pool.bloodThreads.length; i++) {
    const t = pool.bloodThreads[i];
    if (!t.active) continue;
    t.pulsePhase += dt * 18;
    t.life -= dt;
    if (t.life <= 0) t.active = false;
  }

  for (let i = 0; i < pool.sunHaloRings.length; i++) {
    const r = pool.sunHaloRings[i];
    if (!r.active) continue;
    r.rotation += 5.4 * dt;
    r.life -= dt;
    if (r.life <= 0) r.active = false;
  }

  for (let i = 0; i < pool.clashSparks.length; i++) {
    const sp = pool.clashSparks[i];
    if (!sp.active) continue;
    sp.x += sp.vx * dt;
    sp.y += sp.vy * dt;
    sp.vx *= Math.max(0, 1 - dt * 5.2);
    sp.vy *= Math.max(0, 1 - dt * 5.2);
    sp.life -= dt;
    if (sp.life <= 0) sp.active = false;
  }

  return detonations;
}

export function renderBloodDemonArtWorldPass(
  ctx: CanvasRenderingContext2D,
  pool: BloodDemonArtPool
): void {
  // 1. Akaza Destructive Death: Compass Needle Floor Mandalas & Exploding Blood Seeds
  for (let i = 0; i < pool.sonicMandalas.length; i++) {
    const m = pool.sonicMandalas[i];
    if (!m.active) continue;
    const p = 1 - m.life / m.maxLife;
    const alpha = Math.max(0, Math.sin(Math.min(1, (1 - p) * 1.15) * Math.PI * 0.5) * 0.98);
    const pal = PALETTE_COLORS[m.palette];
    const outerR = Math.max(36, m.maxRadius * Math.min(1.06, p * 1.4 + 0.22));
    const spokes = 12;

    // Ground radial additive illumination pool (Akaza reference #2 glowing blue/crimson floor!)
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.scale(1, 0.58);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.72;
    const compassGlow = ctx.createRadialGradient(0, 0, outerR * 0.05, 0, 0, outerR * 1.48);
    compassGlow.addColorStop(0, pal.core);
    compassGlow.addColorStop(0.28, pal.bloom);
    compassGlow.addColorStop(0.66, pal.outer);
    compassGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = compassGlow;
    ctx.beginPath();
    ctx.arc(0, 0, outerR * 1.48, 0, Math.PI * 2);
    ctx.fill();

    // Inner hexagram star-of-david lattice + outer snowflake compass crystal arms
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (let hex = 0; hex < 2; hex++) {
      ctx.beginPath();
      for (let v = 0; v < 3; v++) {
        const ha = m.rotation + hex * (Math.PI / 3) + (v / 3) * Math.PI * 2;
        const hx = Math.cos(ha) * (outerR * 0.74);
        const hy = Math.sin(ha) * (outerR * 0.74);
        if (v === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 6.2;
      ctx.stroke();
      ctx.strokeStyle = pal.mid;
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }

    // 12 crystal snowflake spokes with double chevron barbs
    for (let pass = 0; pass < 3; pass++) {
      if (pass === 0) {
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = 6.4 * (1 - p * 0.3);
      } else if (pass === 1) {
        ctx.strokeStyle = pal.mid;
        ctx.lineWidth = 3.2 * (1 - p * 0.3);
      } else {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = pal.core;
        ctx.lineWidth = 1.6 * (1 - p * 0.3);
      }
      ctx.beginPath();
      for (let s = 0; s < spokes; s++) {
        const sa = m.rotation + (s / spokes) * Math.PI * 2;
        const tipR = s % 2 === 0 ? outerR * 1.14 : outerR * 0.86;
        ctx.moveTo(Math.cos(sa) * (outerR * 0.14), Math.sin(sa) * (outerR * 0.14));
        ctx.lineTo(Math.cos(sa) * tipR, Math.sin(sa) * tipR);

        for (const frac of [0.54, 0.76]) {
          const br = tipR * frac;
          const bx = Math.cos(sa) * br;
          const by = Math.sin(sa) * br;
          const barbLen = outerR * (frac > 0.65 ? 0.17 : 0.13);
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(sa + 0.62) * barbLen, by + Math.sin(sa + 0.62) * barbLen);
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(sa - 0.62) * barbLen, by + Math.sin(sa - 0.62) * barbLen);
        }
      }
      ctx.stroke();
    }

    // Glowing compass rings
    ctx.globalCompositeOperation = 'source-over';
    for (let r = 0; r < m.ringCount; r++) {
      const rp = Math.min(1, p * (1 + r * 0.14) + 0.15);
      const rad = Math.max(16, m.maxRadius * rp * (1 - r * 0.22));
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 8.4 * (1 - p * 0.35);
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = r === 0 ? pal.core : pal.mid;
      ctx.lineWidth = 4.0 * (1 - p * 0.35);
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Tall vertical additive Akaza spirit-light pillars rising smoothly from 6 outer compass vertices
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.78;
    for (let s = 0; s < 6; s++) {
      const sa = m.rotation + (s / 6) * Math.PI * 2;
      const vx = Math.cos(sa) * outerR * 1.02;
      const vy = Math.sin(sa) * outerR * 1.02 * 0.58;
      const pillarH = (96 + (s % 2) * 34) * (1 - p * 0.38);
      const pillarW = 18 * (1 - p * 0.28);

      const beamGrad = ctx.createLinearGradient(vx, vy, vx, vy - pillarH);
      beamGrad.addColorStop(0, pal.core);
      beamGrad.addColorStop(0.38, pal.bloom);
      beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(vx - pillarW, vy);
      ctx.quadraticCurveTo(vx - pillarW * 0.3, vy - pillarH * 0.55, vx, vy - pillarH);
      ctx.quadraticCurveTo(vx + pillarW * 0.3, vy - pillarH * 0.55, vx + pillarW, vy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Exploding Blood Seeds (Ufotable Crimson-Ink Lotus Flame Blossoms)
  for (let i = 0; i < pool.bloodSeeds.length; i++) {
    const seed = pool.bloodSeeds[i];
    if (!seed.active) continue;
    const p = 1 - seed.life / seed.maxLife;
    const pal = PALETTE_COLORS[seed.palette];
    const pulse = 0.86 + Math.sin(p * Math.PI * 6) * 0.14;
    const rad = seed.radius * (0.42 + p * 0.62);

    ctx.save();
    ctx.translate(seed.x, seed.y);
    ctx.scale(1, 0.56);

    ctx.globalCompositeOperation = 'lighter';
    const seedGlow = ctx.createRadialGradient(0, 0, rad * 0.1, 0, 0, seed.radius * 1.25);
    seedGlow.addColorStop(0, pal.core);
    seedGlow.addColorStop(0.45, pal.bloom);
    seedGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalAlpha = 0.45 + p * 0.35;
    ctx.fillStyle = seedGlow;
    ctx.beginPath();
    ctx.arc(0, 0, seed.radius * 1.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    const petals = 7;
    ctx.beginPath();
    for (let k = 0; k < petals * 2; k++) {
      const a = seed.seed + (k / (petals * 2)) * Math.PI * 2 + p * 1.25;
      const sway = Math.sin(k * 2.1 + p * 8) * 0.16;
      const r = k % 2 === 0 ? rad * (1.06 * pulse) : rad * (0.44 + sway * 0.3);
      if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = pal.outer;
    ctx.globalAlpha = 0.84 + p * 0.14;
    ctx.fill();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 4.2;
    ctx.stroke();

    ctx.beginPath();
    for (let k = 0; k < petals * 2; k++) {
      const a = seed.seed + (k / (petals * 2)) * Math.PI * 2 - p * 0.9;
      const r = k % 2 === 0 ? rad * 0.68 : rad * 0.25;
      if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = p > 0.72 ? pal.core : pal.mid;
    ctx.fill();

    ctx.globalAlpha = 0.76;
    ctx.strokeStyle = pal.mid;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, seed.radius * (0.88 + p * 0.12), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 2. Magma Fissure Geysers (Roaring S-Curved Flame Pillars + Additive Bloom)
  for (let i = 0; i < pool.magmaGeysers.length; i++) {
    const g = pool.magmaGeysers[i];
    if (!g.active) continue;
    const p = 1 - g.life / g.maxLife;
    const h = g.maxHeight * Math.sin(Math.min(1, p * 1.15) * Math.PI) * 1.25;
    const w = g.radius * (1.15 - p * 0.25);
    const pal = PALETTE_COLORS[g.palette];
    const alpha = Math.max(0, 1 - p * 0.82);

    ctx.save();
    ctx.translate(g.x, g.y);

    // Additive floor/plume glow
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.65;
    const plumeGlow = ctx.createRadialGradient(0, -h * 0.35, 4, 0, -h * 0.35, Math.max(w, h) * 1.15);
    plumeGlow.addColorStop(0, pal.core);
    plumeGlow.addColorStop(0.45, pal.bloom);
    plumeGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = plumeGlow;
    ctx.beginPath();
    ctx.arc(0, -h * 0.35, Math.max(w, h) * 1.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pal.ink;
    ctx.beginPath();
    ctx.ellipse(0, 0, w, w * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flowing curved multi-tongue flame pillar
    ctx.beginPath();
    ctx.moveTo(-w * 0.78, 0);
    ctx.quadraticCurveTo(-w * 0.64, -h * 0.48, -w * 0.44, -h * 0.68);
    ctx.quadraticCurveTo(-w * 0.25, -h * 0.46, -w * 0.22, -h * 0.44);
    ctx.quadraticCurveTo(-w * 0.12, -h * 0.85, 0, -h * 1.05);
    ctx.quadraticCurveTo(w * 0.18, -h * 0.72, w * 0.26, -h * 0.48);
    ctx.quadraticCurveTo(w * 0.48, -h * 0.76, w * 0.56, -h * 0.66);
    ctx.quadraticCurveTo(w * 0.74, -h * 0.32, w * 0.78, 0);
    ctx.closePath();
    ctx.fillStyle = pal.outer;
    ctx.fill();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 4.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-w * 0.46, 0);
    ctx.quadraticCurveTo(-w * 0.22, -h * 0.52, 0, -h * 0.88);
    ctx.quadraticCurveTo(w * 0.22, -h * 0.52, w * 0.46, 0);
    ctx.closePath();
    ctx.fillStyle = pal.mid;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-w * 0.22, 0);
    ctx.quadraticCurveTo(0, -h * 0.64, w * 0.22, 0);
    ctx.closePath();
    ctx.fillStyle = pal.core;
    ctx.fill();
    ctx.restore();
  }

  // 3. Swirling Cyclone Vortexes (Sanemi Hurricane Emerald Ribbons + Sumi-e Black Gale Shards + Additive Halo)
  for (let i = 0; i < pool.cycloneArms.length; i++) {
    const c = pool.cycloneArms[i];
    if (!c.active) continue;
    const p = 1 - c.life / c.maxLife;
    const alpha = Math.max(0, Math.sin((1 - p) * Math.PI * 0.5) * 0.98);
    const pal = PALETTE_COLORS[c.palette];

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(1, 0.62);

    // Wide additive cyclone floor illumination
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.52;
    const vortexGlow = ctx.createRadialGradient(0, 0, c.innerRadius * 0.5, 0, 0, c.outerRadius * 1.38);
    vortexGlow.addColorStop(0, pal.core);
    vortexGlow.addColorStop(0.42, pal.bloom);
    vortexGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = vortexGlow;
    ctx.beginPath();
    ctx.arc(0, 0, c.outerRadius * 1.38, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let arm = 0; arm < c.armCount; arm++) {
      const baseA = c.rotation + (arm / c.armCount) * Math.PI * 2;
      const steps = 18;
      // Trace tapered cyclone ribbon polygon instead of flat uniform line stroke
      ctx.beginPath();
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const r = c.innerRadius + (c.outerRadius - c.innerRadius) * t;
        const a = baseA + t * 2.85;
        const halfW = Math.sin(Math.pow(t, 0.7) * Math.PI) * 14 * (1 - p * 0.35);
        const px = Math.cos(a) * (r + halfW);
        const py = Math.sin(a) * (r + halfW);
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      for (let s = steps; s >= 0; s--) {
        const t = s / steps;
        const r = c.innerRadius + (c.outerRadius - c.innerRadius) * t;
        const a = baseA + t * 2.85;
        const halfW = Math.sin(Math.pow(t, 0.7) * Math.PI) * 14 * (1 - p * 0.35);
        const px = Math.cos(a) * Math.max(4, r - halfW);
        const py = Math.sin(a) * Math.max(4, r - halfW);
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = pal.outer;
      ctx.fill();
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 4.2;
      ctx.stroke();

      // Inner bright core spine along the swirling cyclone arm
      ctx.beginPath();
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const r = c.innerRadius + (c.outerRadius - c.innerRadius) * t;
        const a = baseA + t * 2.85;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = pal.mid;
      ctx.lineWidth = 8.5 * (1 - p * 0.38);
      ctx.stroke();
      ctx.strokeStyle = pal.core;
      ctx.lineWidth = 3.4 * (1 - p * 0.42);
      ctx.stroke();

      // Sanemi-style jagged Sumi-e black gale shards tearing outward (Reference Image #4)
      for (let sh = 0; sh < 2; sh++) {
        const shardA = baseA + 1.55 + sh * 0.9;
        const shardR = c.outerRadius * (0.68 + sh * 0.28 + (arm % 2) * 0.14);
        const sx = Math.cos(shardA) * shardR;
        const sy = Math.sin(shardA) * shardR;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(shardA + 1.35 + sh * 0.4);
        ctx.fillStyle = '#070a08';
        ctx.strokeStyle = pal.mid;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-16, -2);
        ctx.lineTo(-4, -8.5);
        ctx.lineTo(18, 0);
        ctx.lineTo(-1, 7.5);
        ctx.lineTo(-10, 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // 4. Breathing Sun / Water / Thunder / Wind Halos (Organic Ufotable Vortexes — Zero Gear Teeth!)
  for (let i = 0; i < pool.sunHaloRings.length; i++) {
    const r = pool.sunHaloRings[i];
    if (!r.active) continue;
    const p = 1 - r.life / r.maxLife;
    const pal = PALETTE_COLORS[r.palette];
    const rad = r.radius * (0.74 + p * 0.44);
    const alpha = Math.max(0, 1 - Math.pow(p, 1.55));

    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.scale(1, 0.72);

    // Wide additive ground & air bloom
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.68;
    const haloGlow = ctx.createRadialGradient(0, 0, rad * 0.35, 0, 0, rad * 1.48);
    haloGlow.addColorStop(0, 'rgba(0, 0, 0, 0)');
    haloGlow.addColorStop(0.58, pal.bloom);
    haloGlow.addColorStop(0.78, pal.core);
    haloGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = haloGlow;
    ctx.beginPath();
    ctx.arc(0, 0, rad * 1.48, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (r.palette === 'thunder') {
      // Zenitsu Thunderclap Rings + 10 Branching Jagged Lightning Bolts (Ref Image #5!)
      for (let ringIdx = 0; ringIdx < 2; ringIdx++) {
        const ringR = rad * (ringIdx === 0 ? 1.0 : 0.76);
        const segs = 28;
        ctx.beginPath();
        for (let k = 0; k <= segs; k++) {
          const a = r.rotation * (ringIdx === 0 ? 1 : -1.2) + (k / segs) * Math.PI * 2;
          const jitter = Math.sin(k * 5.7 + p * 24 + ringIdx) * (rad * 0.08);
          const px = Math.cos(a) * (ringR + jitter);
          const py = Math.sin(a) * (ringR + jitter);
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = 10 * (1 - p * 0.3);
        ctx.stroke();
        ctx.strokeStyle = ringIdx === 0 ? '#ffe94d' : '#38e8ff';
        ctx.lineWidth = 5.4 * (1 - p * 0.3);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }

      const boltCount = 10;
      for (let s = 0; s < boltCount; s++) {
        const a = r.rotation * 0.8 + (s / boltCount) * Math.PI * 2;
        const r1 = rad * 0.35;
        const r2 = rad * 0.78;
        const r3 = rad * 1.15;
        const r4 = rad * (1.42 + (s % 2) * 0.24);
        const j1 = ((s % 2 === 0 ? 1 : -1) * 0.14);
        const j2 = -j1 * 0.85;
        const x1 = Math.cos(a) * r1;
        const y1 = Math.sin(a) * r1;
        const x2 = Math.cos(a + j1) * r2;
        const y2 = Math.sin(a + j1) * r2;
        const x3 = Math.cos(a + j2) * r3;
        const y3 = Math.sin(a + j2) * r3;
        const x4 = Math.cos(a + j1 * 0.4) * r4;
        const y4 = Math.sin(a + j1 * 0.4) * r4;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.lineTo(x4, y4);
        // Side fork
        ctx.moveTo(x2, y2);
        ctx.lineTo(Math.cos(a + j1 * 2.4) * (r2 * 1.38), Math.sin(a + j1 * 2.4) * (r2 * 1.38));
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = 7.2;
        ctx.stroke();
        ctx.strokeStyle = s % 3 === 0 ? '#38e8ff' : '#ffe94d';
        ctx.lineWidth = 3.8;
        ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
    } else if (r.palette === 'water') {
      // Ukiyo-e Flowing Water Wheel (3 intertwined wave tracks + Hokusai multi-finger seafoam claws!)
      const segs = 36;
      for (let band = 0; band < 3; band++) {
        const bandOffset = (band - 1) * 12;
        ctx.beginPath();
        for (let k = 0; k <= segs; k++) {
          const a = r.rotation + (k / segs) * Math.PI * 2;
          const wave = Math.sin(a * 4 + p * 8 + band) * 8;
          const rr = rad + bandOffset + wave;
          const px = Math.cos(a) * rr;
          const py = Math.sin(a) * rr;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        if (band === 0) {
          ctx.strokeStyle = pal.ink;
          ctx.lineWidth = 22 * (1 - p * 0.35);
          ctx.stroke();
          ctx.strokeStyle = pal.outer;
          ctx.lineWidth = 15 * (1 - p * 0.35);
          ctx.stroke();
        } else if (band === 1) {
          ctx.strokeStyle = pal.mid;
          ctx.lineWidth = 9.5 * (1 - p * 0.35);
          ctx.stroke();
        } else {
          ctx.strokeStyle = pal.core;
          ctx.lineWidth = 3.8 * (1 - p * 0.4);
          ctx.stroke();
        }
      }

      // 8 Clustered 3-finger Hokusai seafoam crests + scattered droplets
      const clusterCount = 8;
      for (let s = 0; s < clusterCount; s++) {
        const a = r.rotation + (s / clusterCount) * Math.PI * 2;
        for (let finger = 0; finger < 3; finger++) {
          const fa = a + finger * 0.11;
          const baseR = rad + 6 + finger * 4;
          const tipR = rad + 26 + (2 - finger) * 10;
          const tipA = fa + 0.24;
          ctx.beginPath();
          ctx.moveTo(Math.cos(fa - 0.06) * baseR, Math.sin(fa - 0.06) * baseR);
          ctx.quadraticCurveTo(
            Math.cos(fa + 0.1) * (tipR + 6),
            Math.sin(fa + 0.1) * (tipR + 6),
            Math.cos(tipA) * tipR,
            Math.sin(tipA) * tipR
          );
          ctx.quadraticCurveTo(
            Math.cos(fa + 0.12) * (baseR + 6),
            Math.sin(fa + 0.12) * (baseR + 6),
            Math.cos(fa + 0.08) * baseR,
            Math.sin(fa + 0.08) * baseR
          );
          ctx.closePath();
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = pal.ink;
          ctx.lineWidth = 2.2;
          ctx.stroke();
        }
        // Splash droplets
        for (let d = 0; d < 2; d++) {
          const da = a + 0.32 + d * 0.16;
          const dr = rad + 36 + d * 14;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = pal.ink;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(Math.cos(da) * dr, Math.sin(da) * dr, 3.8 - d * 1.0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    } else {
      // Hinokami Kagura / Sun Dragon-Wheel OR Sanemi Wind Ring (3 Organic Swirling Ribbons + Asymmetrical Hooked Crests!)
      const segs = 40;
      const traceTurbulentLoop = (radiusMul: number, thick: number, phaseOffset: number) => {
        ctx.beginPath();
        for (let k = 0; k <= segs; k++) {
          const a = r.rotation + (k / segs) * Math.PI * 2;
          const wobble =
            Math.sin(a * 5 + p * 6 + phaseOffset) * (thick * 0.45) +
            Math.cos(a * 9 - p * 9 + phaseOffset) * (thick * 0.22);
          const rr = rad * radiusMul + wobble + thick * 0.52;
          const px = Math.cos(a) * rr;
          const py = Math.sin(a) * rr;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        for (let k = segs; k >= 0; k--) {
          const a = r.rotation + (k / segs) * Math.PI * 2;
          const wobble =
            Math.sin(a * 5 + p * 6 + phaseOffset) * (thick * 0.45) +
            Math.cos(a * 9 - p * 9 + phaseOffset) * (thick * 0.22);
          const rr = Math.max(10, rad * radiusMul + wobble - thick * 0.48);
          const px = Math.cos(a) * rr;
          const py = Math.sin(a) * rr;
          ctx.lineTo(px, py);
        }
        ctx.closePath();
      };

      const baseThick = Math.max(18, rad * 0.24) * (1 - p * 0.35);
      traceTurbulentLoop(1.0, baseThick, 0);
      ctx.fillStyle = pal.outer;
      ctx.fill();
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 4.6;
      ctx.stroke();

      traceTurbulentLoop(0.98, baseThick * 0.62, 1.2);
      ctx.fillStyle = pal.mid;
      ctx.fill();

      traceTurbulentLoop(0.96, baseThick * 0.28, 2.4);
      ctx.fillStyle = pal.core;
      ctx.fill();

      // 8 Asymmetrical Swept Hooked Flame/Wind Crests licking tangentially (NEVER uniform gears!)
      const crestCount = 8;
      for (let s = 0; s < crestCount; s++) {
        const a = r.rotation + (s / crestCount) * Math.PI * 2 + Math.sin(s * 2.1) * 0.14;
        const baseR = rad * 0.96;
        const tipR = rad * (1.36 + ((s * 3) % 4) * 0.11);
        const sweep = 0.36 + (s % 2) * 0.14;

        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.12) * baseR, Math.sin(a - 0.12) * baseR);
        ctx.quadraticCurveTo(
          Math.cos(a + sweep * 0.5) * (tipR * 1.06),
          Math.sin(a + sweep * 0.5) * (tipR * 1.06),
          Math.cos(a + sweep) * tipR,
          Math.sin(a + sweep) * tipR
        );
        ctx.quadraticCurveTo(
          Math.cos(a + sweep * 0.45) * (baseR * 1.08),
          Math.sin(a + sweep * 0.45) * (baseR * 1.08),
          Math.cos(a + 0.15) * baseR,
          Math.sin(a + 0.15) * baseR
        );
        ctx.closePath();
        ctx.fillStyle = s % 2 === 0 ? pal.outer : pal.mid;
        ctx.fill();
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = 3.0;
        ctx.stroke();

        // Inner bright flame streak inside each crest
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.04) * baseR, Math.sin(a - 0.04) * baseR);
        ctx.quadraticCurveTo(
          Math.cos(a + sweep * 0.45) * (tipR * 0.94),
          Math.sin(a + sweep * 0.45) * (tipR * 0.94),
          Math.cos(a + sweep * 0.88) * (tipR * 0.9),
          Math.sin(a + sweep * 0.88) * (tipR * 0.9)
        );
        ctx.strokeStyle = pal.core;
        ctx.lineWidth = 3.2;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 5. Rui-Style Crimson-Ink Razor Blood Thread Webs & Arrow Trails
  const activeThreads: BdaBloodThread[] = [];
  for (let i = 0; i < pool.bloodThreads.length; i++) {
    const t = pool.bloodThreads[i];
    if (!t.active) continue;
    activeThreads.push(t);
    const p = 1 - t.life / t.maxLife;
    const pal = PALETTE_COLORS[t.palette];
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - p);
    const mx = (t.x1 + t.x2) * 0.5 + Math.sin(t.pulsePhase) * 18;
    const my = (t.y1 + t.y2) * 0.5 + Math.cos(t.pulsePhase) * 12;
    ctx.beginPath();
    ctx.moveTo(t.x1, t.y1);
    ctx.quadraticCurveTo(mx, my, t.x2, t.y2);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 6.8;
    ctx.stroke();
    ctx.strokeStyle = pal.outer;
    ctx.lineWidth = 4.0;
    ctx.stroke();
    ctx.strokeStyle = pal.mid;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = pal.core;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }
  if (activeThreads.length >= 2) {
    ctx.save();
    for (let i = 0; i < activeThreads.length - 1; i++) {
      const tA = activeThreads[i];
      const tB = activeThreads[i + 1];
      const pal = PALETTE_COLORS[tA.palette];
      const alpha = Math.min(tA.life / tA.maxLife, tB.life / tB.maxLife) * 0.88;
      ctx.globalAlpha = Math.max(0, alpha);
      for (const frac of [0.38, 0.72]) {
        const ax = tA.x1 + (tA.x2 - tA.x1) * frac;
        const ay = tA.y1 + (tA.y2 - tA.y1) * frac;
        const bx = tB.x1 + (tB.x2 - tB.x1) * frac;
        const by = tB.y1 + (tB.y2 - tB.y1) * frac;
        if (Math.hypot(bx - ax, by - ay) < 220) {
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.strokeStyle = pal.ink;
          ctx.lineWidth = 4.0;
          ctx.stroke();
          ctx.strokeStyle = pal.mid;
          ctx.lineWidth = 1.8;
          ctx.stroke();

          ctx.fillStyle = pal.core;
          ctx.strokeStyle = pal.ink;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(ax, ay, 3.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  for (let i = 0; i < pool.arrowTrails.length; i++) {
    const a = pool.arrowTrails[i];
    if (!a.active) continue;
    const p = 1 - a.life / a.maxLife;
    const pal = PALETTE_COLORS[a.palette];
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - p);
    ctx.beginPath();
    ctx.moveTo(a.x1, a.y1);
    ctx.lineTo(a.x2, a.y2);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 7.2 * (1 - p * 0.45);
    ctx.stroke();
    ctx.strokeStyle = pal.mid;
    ctx.lineWidth = 3.6 * (1 - p * 0.45);
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = pal.core;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }

  // 6. Blood Sickle Crescents (Gyutaro crimson-black crescents) & Dharma Chakrams
  for (let i = 0; i < pool.bloodSickles.length; i++) {
    const s = pool.bloodSickles[i];
    if (!s.active) continue;
    const p = 1 - s.life / s.maxLife;
    const pal = PALETTE_COLORS[s.palette];
    const alpha = Math.max(0, 1 - p * 0.82);

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.55;
    const sickleGlow = ctx.createRadialGradient(0, 0, s.radius * 0.2, 0, 0, s.radius * 1.45);
    sickleGlow.addColorStop(0, pal.bloom);
    sickleGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sickleGlow;
    ctx.beginPath();
    ctx.arc(0, 0, s.radius * 1.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(0, 0, s.radius * 1.15, -1.28, 1.28, false);
    ctx.arc(-s.radius * 0.36, 0, s.radius * 0.95, 1.15, -1.15, true);
    ctx.closePath();
    ctx.fillStyle = pal.outer;
    ctx.fill();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 4.6;
    ctx.stroke();
    ctx.strokeStyle = pal.mid;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(0, 0, s.radius * 1.06, -1.05, 1.05);
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = pal.core;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }

  for (let i = 0; i < pool.chakramRings.length; i++) {
    const ch = pool.chakramRings[i];
    if (!ch.active) continue;
    const p = 1 - ch.life / ch.maxLife;
    const pal = PALETTE_COLORS[ch.palette];

    ctx.save();
    ctx.translate(ch.x, ch.y);
    ctx.scale(1, 0.68);
    ctx.rotate(ch.rotation);
    ctx.globalAlpha = Math.max(0, 1 - p * 0.85);

    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 8.2;
    ctx.beginPath();
    ctx.arc(0, 0, ch.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = pal.mid;
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.arc(0, 0, ch.radius, 0, Math.PI * 2);
    ctx.stroke();

    for (let b = 0; b < ch.blades; b++) {
      const a = (b / ch.blades) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (ch.radius * 0.85), Math.sin(a) * (ch.radius * 0.85));
      ctx.lineTo(Math.cos(a + 0.16) * (ch.radius * 1.48), Math.sin(a + 0.16) * (ch.radius * 1.48));
      ctx.lineTo(Math.cos(a + 0.34) * (ch.radius * 0.88), Math.sin(a + 0.34) * (ch.radius * 0.88));
      ctx.closePath();
      ctx.fillStyle = b % 2 === 0 ? pal.core : pal.outer;
      ctx.fill();
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
    ctx.restore();
  }

  // 7. Sweeping Ufotable Demon Slayer Crescent Ribbons + Multi-Pass Additive Bloom
  for (let i = 0; i < pool.slashArcs.length; i++) {
    const s = pool.slashArcs[i];
    if (!s.active) continue;
    const p = 1 - s.life / s.maxLife;
    const alpha = Math.max(0, 1 - Math.pow(p, 1.75));
    const pal = PALETTE_COLORS[s.palette];
    const startA = s.direction === 1 ? s.angle - s.arcSpan * 0.54 : s.angle + s.arcSpan * 0.54;
    const sweepSpan = s.arcSpan * s.direction;
    // Scale up arc sweep dramatically so every Breathing slash fills combat space cleanly
    const rad = s.radius * (1.06 + p * 0.18);
    const widthScale = Math.sin(Math.min(1, p * 1.15 + 0.22) * Math.PI);
    const maxThick = Math.max(18, s.thickness * 1.65 * widthScale);
    const segs = 26;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(1, 0.72);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Trace organic fluid-modulated tapered crescent band
    const traceOrganicBand = (innerMul: number, outerMul: number, radiusOffset = 0, waveAmp = 0.12) => {
      ctx.beginPath();
      for (let k = 0; k <= segs; k++) {
        const t = k / segs;
        const a = startA + sweepSpan * t;
        const taper = Math.sin(Math.pow(t, 0.7) * Math.PI);
        const fluidWave =
          Math.sin(t * 14 + s.seed + p * 8) * (maxThick * waveAmp * taper) +
          Math.cos(t * 23 - s.seed) * (maxThick * waveAmp * 0.45 * taper);
        const rOut = rad + radiusOffset + maxThick * outerMul * taper + fluidWave;
        const px = Math.cos(a) * rOut;
        const py = Math.sin(a) * rOut;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      for (let k = segs; k >= 0; k--) {
        const t = k / segs;
        const a = startA + sweepSpan * t;
        const taper = Math.sin(Math.pow(t, 0.7) * Math.PI);
        const fluidWave = Math.sin(t * 11 + s.seed * 1.3) * (maxThick * waveAmp * 0.5 * taper);
        const rIn = Math.max(10, rad + radiusOffset - maxThick * innerMul * taper + fluidWave);
        const px = Math.cos(a) * rIn;
        const py = Math.sin(a) * rIn;
        ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    // PASS A: Wide Additive Ufotable Emissive Bloom Halo around the slash
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.36;
    traceOrganicBand(0.95, 1.08, 0, 0.08);
    ctx.fillStyle = pal.bloom;
    ctx.fill();

    // PASS B: Crisp Hand-Inked Multi-Band Cel Slash Body
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;

    traceOrganicBand(0.58, 0.64, 0, 0.14);
    ctx.fillStyle = pal.outer;
    ctx.fill();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 4.8;
    ctx.stroke();

    traceOrganicBand(0.32, 0.38, maxThick * 0.04, 0.10);
    ctx.fillStyle = pal.mid;
    ctx.fill();

    traceOrganicBand(0.10, 0.16, maxThick * 0.08, 0.05);
    ctx.fillStyle = pal.core;
    ctx.fill();

    // Detached Secondary Outer Echo Ribbon (Ufotable sweeping double-ribbon silhouette)
    traceOrganicBand(0.10, 0.22, maxThick * 0.88, 0.16);
    ctx.fillStyle = pal.mid;
    ctx.fill();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 2.6;
    ctx.stroke();

    // PASS C: Signature Element Ornaments (Images 1, 4, 5, 6, 7, 8, 9, 10)
    if (s.palette === 'water') {
      // Multi-strand Ukiyo-e parallel flow curves inside the water body
      for (const offsetFrac of [-0.22, 0.05, 0.28]) {
        ctx.strokeStyle = offsetFrac < 0 ? '#031842' : '#7df9ff';
        ctx.lineWidth = offsetFrac < 0 ? 2.4 : 2.0;
        ctx.beginPath();
        for (let k = 2; k <= segs - 2; k++) {
          const t = k / segs;
          const a = startA + sweepSpan * t;
          const taper = Math.sin(Math.pow(t, 0.7) * Math.PI);
          const rr = rad + maxThick * offsetFrac * taper + Math.sin(t * Math.PI * 5 + s.seed) * 4;
          const px = Math.cos(a) * rr;
          const py = Math.sin(a) * rr;
          if (k === 2) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // Clustered 3-Finger Hokusai White Sea-Foam Claws + Scattered Spray Droplets (Images 7 & 8)
      const clusterCount = 7;
      for (let f = 0; f < clusterCount; f++) {
        const tf = (f + 0.35) / clusterCount;
        const fa = startA + sweepSpan * tf;
        const taper = Math.sin(Math.pow(tf, 0.7) * Math.PI);
        const baseR = rad + maxThick * 0.48 * taper;

        for (let finger = 0; finger < 3; finger++) {
          const fAng = fa + s.direction * (finger * 0.085);
          const fTipR = baseR + maxThick * (0.48 + (2 - finger) * 0.20 + ((f + finger) % 2) * 0.12);
          const curlTipA = fAng + s.direction * 0.18;

          ctx.beginPath();
          ctx.moveTo(Math.cos(fAng - s.direction * 0.06) * baseR, Math.sin(fAng - s.direction * 0.06) * baseR);
          ctx.quadraticCurveTo(
            Math.cos(fAng + s.direction * 0.04) * (fTipR * 1.06),
            Math.sin(fAng + s.direction * 0.04) * (fTipR * 1.06),
            Math.cos(curlTipA) * fTipR,
            Math.sin(curlTipA) * fTipR
          );
          ctx.quadraticCurveTo(
            Math.cos(fAng + s.direction * 0.07) * (baseR * 1.05),
            Math.sin(fAng + s.direction * 0.07) * (baseR * 1.05),
            Math.cos(fAng + s.direction * 0.08) * baseR,
            Math.sin(fAng + s.direction * 0.08) * baseR
          );
          ctx.closePath();
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = pal.ink;
          ctx.lineWidth = 2.4;
          ctx.stroke();
        }

        // 2 irregular white spray droplets flying off the wave crest
        for (let d = 0; d < 2; d++) {
          const dropR = baseR + maxThick * (0.95 + d * 0.36);
          const da = fa + s.direction * (0.22 + d * 0.1);
          ctx.beginPath();
          ctx.ellipse(
            Math.cos(da) * dropR,
            Math.sin(da) * dropR,
            4.2 - d * 1.1,
            2.6 - d * 0.5,
            da + 0.5,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = pal.ink;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
      }
    } else if (s.palette === 'wind') {
      // Sanemi Wind Breathing (Image 4): Overlapping Emerald Scythe Blades + 12 Angular Black Sumi-e Wind Shards!
      const shardCount = 12;
      for (let w = 0; w < shardCount; w++) {
        const tw = (w + 0.25) / shardCount;
        const wa = startA + sweepSpan * tw;
        const shardDist = rad + maxThick * (0.48 + ((w * 3) % 4) * 0.34);
        const sx = Math.cos(wa) * shardDist;
        const sy = Math.sin(wa) * shardDist;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(wa + s.direction * 1.48);
        ctx.fillStyle = w % 3 === 0 ? pal.mid : '#070b09';
        ctx.strokeStyle = w % 3 === 0 ? pal.ink : pal.mid;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-18, -2);
        ctx.lineTo(-4, -8.5);
        ctx.lineTo(20, 0);
        ctx.lineTo(-2, 7.5);
        ctx.lineTo(-12, 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    } else if (s.palette === 'thunder') {
      // Zenitsu Thunder Breathing (Image 5): Multi-Branch Fractal Canary Gold & Electric Cyan Lightning Forks!
      for (let bolt = 0; bolt < 3; bolt++) {
        const isBlue = bolt === 2;
        const isWhiteCore = bolt === 1;
        const boltSteps = 14;
        ctx.beginPath();
        for (let b = 0; b <= boltSteps; b++) {
          const bf = b / boltSteps;
          const ba = startA + sweepSpan * bf;
          const seedSig = Math.sin(b * 6.3 + s.seed + bolt * 2.1);
          const zig = (seedSig >= 0 ? 1 : -1) * maxThick * (isBlue ? 0.65 : 0.48) * (0.5 + Math.abs(seedSig) * 0.7);
          const br = rad + zig + (isBlue ? 12 : -4);
          const bx = Math.cos(ba) * br;
          const by = Math.sin(ba) * br;
          if (b === 0) ctx.moveTo(bx, by);
          else ctx.lineTo(bx, by);
        }
        if (!isWhiteCore) {
          ctx.strokeStyle = pal.ink;
          ctx.lineWidth = isBlue ? 5.8 : 7.6;
          ctx.stroke();
          ctx.strokeStyle = isBlue ? '#38e8ff' : '#ffe94d';
          ctx.lineWidth = isBlue ? 3.2 : 4.4;
          ctx.stroke();
        } else {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.4;
          ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
      }
    } else {
      // Hinokami Kagura / Rengoku Flame Breathing / Blood Demon Art (Images 1, 6, 9, 10):
      // 11 Asymmetrical Hooked S-Curved Flame Tongues + Detached Curling Ember Chunks!
      const tongueCount = 11;
      for (let t = 0; t < tongueCount; t++) {
        const tf = (t + 0.3) / tongueCount;
        const ta = startA + sweepSpan * tf;
        const taper = Math.sin(Math.pow(tf, 0.7) * Math.PI);
        const baseR = rad + maxThick * 0.46 * taper;
        const amp = 0.78 + ((t * 5 + Math.floor(s.seed)) % 4) * 0.24;
        const tipR = baseR + maxThick * amp;
        const hookSweep = s.direction * (0.24 + (t % 2) * 0.08);

        ctx.beginPath();
        ctx.moveTo(Math.cos(ta - s.direction * 0.11) * baseR, Math.sin(ta - s.direction * 0.11) * baseR);
        ctx.quadraticCurveTo(
          Math.cos(ta + hookSweep * 0.45) * (tipR * 1.02),
          Math.sin(ta + hookSweep * 0.45) * (tipR * 1.02),
          Math.cos(ta + hookSweep) * tipR,
          Math.sin(ta + hookSweep) * tipR
        );
        ctx.quadraticCurveTo(
          Math.cos(ta + hookSweep * 0.5) * (baseR * 1.08),
          Math.sin(ta + hookSweep * 0.5) * (baseR * 1.08),
          Math.cos(ta + s.direction * 0.12) * baseR,
          Math.sin(ta + s.direction * 0.12) * baseR
        );
        ctx.closePath();
        ctx.fillStyle = t % 2 === 0 ? pal.outer : pal.mid;
        ctx.fill();
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = 3.0;
        ctx.stroke();

        // Inner blazing yellow-white flame tongue core
        ctx.beginPath();
        ctx.moveTo(Math.cos(ta - s.direction * 0.04) * baseR, Math.sin(ta - s.direction * 0.04) * baseR);
        ctx.quadraticCurveTo(
          Math.cos(ta + hookSweep * 0.45) * (tipR * 0.92),
          Math.sin(ta + hookSweep * 0.45) * (tipR * 0.92),
          Math.cos(ta + hookSweep * 0.85) * (tipR * 0.88),
          Math.sin(ta + hookSweep * 0.85) * (tipR * 0.88)
        );
        ctx.lineTo(Math.cos(ta + s.direction * 0.06) * baseR, Math.sin(ta + s.direction * 0.06) * baseR);
        ctx.closePath();
        ctx.fillStyle = pal.core;
        ctx.fill();

        // Detached curling flame ember droplet (Image 1 & 9 signature!)
        if (t % 2 === 0) {
          const emberR = tipR + 12 + (t % 3) * 7;
          const ea = ta + hookSweep * 1.08;
          const ex = Math.cos(ea) * emberR;
          const ey = Math.sin(ea) * emberR;
          ctx.save();
          ctx.translate(ex, ey);
          ctx.rotate(ea + s.direction * 0.6 + p * 2.2);
          ctx.fillStyle = t % 4 === 0 ? pal.core : pal.mid;
          ctx.strokeStyle = pal.ink;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(-7, 0);
          ctx.quadraticCurveTo(0, -6.5, 9, -1);
          ctx.quadraticCurveTo(1, 5.5, -7, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // PASS D: Additive White-Hot Blade Spine Accent
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.48;
    traceOrganicBand(0.06, 0.09, maxThick * 0.06, 0.04);
    ctx.fillStyle = pal.core;
    ctx.fill();

    ctx.restore();
  }

  // 8. Dark-backed Anime Speed Streaks & Multi-Hue Tengen Clash Sparks
  for (let i = 0; i < pool.speedStreaks.length; i++) {
    const st = pool.speedStreaks[i];
    if (!st.active) continue;
    const p = 1 - st.life / st.maxLife;
    const ex = st.x + Math.cos(st.angle) * st.length;
    const ey = st.y + Math.sin(st.angle) * st.length * 0.72;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - p);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(st.x, st.y);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = '#120806';
    ctx.lineWidth = st.width + 2.8;
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = st.color;
    ctx.lineWidth = st.width;
    ctx.stroke();
    ctx.restore();
  }

  for (let i = 0; i < pool.clashSparks.length; i++) {
    const sp = pool.clashSparks[i];
    if (!sp.active) continue;
    const p = 1 - sp.life / sp.maxLife;
    const len = sp.length * (1 - p * 0.35);
    const nx = Math.cos(sp.angle);
    const ny = Math.sin(sp.angle);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - p);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sp.x - nx * len * 0.4, sp.y - ny * len * 0.28);
    ctx.lineTo(sp.x + nx * len, sp.y + ny * len * 0.72);
    ctx.strokeStyle = '#120806';
    ctx.lineWidth = 6.0;
    ctx.stroke();
    ctx.strokeStyle = sp.color;
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }
}

export function renderBloodDemonArtScreenFlash(
  ctx: CanvasRenderingContext2D,
  pool: BloodDemonArtPool,
  width: number,
  height: number
): void {
  if (pool.impactInversionTimer <= 0) return;
  const p = pool.impactInversionTimer / Math.max(0.001, pool.impactInversionDuration);
  const cx = width * 0.5;
  const cy = height * 0.5;

  ctx.save();

  // Frame 1-2 (p > 0.56): True Ufotable High-Contrast Sumi-e Negative Impact Inversion!
  if (p > 0.56) {
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.88;
    ctx.fillRect(0, 0, width, height);

    // Stark black ink impact border vignette
    ctx.globalCompositeOperation = 'source-over';
    const vig = ctx.createRadialGradient(
      cx,
      cy,
      Math.min(width, height) * 0.24,
      cx,
      cy,
      Math.max(width, height) * 0.72
    );
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(5, 3, 6, 0.72)');
    ctx.fillStyle = vig;
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Recovery frames: Chromatic RGB shockwave split + crisp elemental tint flash
    const expand = 1 - p / 0.56;
    const baseR = Math.min(width, height) * (0.16 + expand * 0.44);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.22 * (1 - expand);
    ctx.fillStyle = pool.impactInversionColor;
    ctx.fillRect(0, 0, width, height);

    // Cyan / Crimson chromatic aberration ring pair
    ctx.lineWidth = 4.5 * (1 - expand * 0.5);
    ctx.globalAlpha = 0.65 * (1 - expand);
    ctx.strokeStyle = '#38e8ff';
    ctx.beginPath();
    ctx.arc(cx - 5, cy, baseR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ff2a55';
    ctx.beginPath();
    ctx.arc(cx + 5, cy, baseR * 1.02, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Sharp converging Ufotable anime action speed-lines (alternating Sumi-e ink & blazing white)
  const rayCount = 36;
  for (let i = 0; i < rayCount; i++) {
    const a = (i / rayCount) * Math.PI * 2 + (i % 2) * 0.038;
    const r0 = Math.min(width, height) * (0.18 + (i % 3) * 0.07);
    const r1 = Math.max(width, height) * 0.82;
    const isInkRay = p > 0.56 && i % 3 === 0;
    ctx.globalCompositeOperation = isInkRay ? 'source-over' : 'lighter';
    ctx.strokeStyle = isInkRay ? '#080406' : p > 0.56 ? '#ffffff' : pool.impactInversionColor;
    ctx.globalAlpha = (isInkRay ? 0.82 : 0.78) * p;
    ctx.lineWidth = isInkRay ? 4.2 : 2.6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();
}
