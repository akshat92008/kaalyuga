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
  { outer: string; mid: string; core: string; ink: string }
> = {
  hinokami: { outer: '#e6241c', mid: '#ff6a18', core: '#fff5b8', ink: '#120806' },
  blood: { outer: '#9c0929', mid: '#ff1f5a', core: '#ffd1dc', ink: '#0d0306' },
  thunder: { outer: '#d98816', mid: '#ffd84a', core: '#e0f7ff', ink: '#140f08' },
  void: { outer: '#4b1139', mid: '#e11d74', core: '#ffe6f0', ink: '#0a0408' },
  sun: { outer: '#ff3b14', mid: '#ffab1f', core: '#fffbe0', ink: '#140804' },
  magma: { outer: '#b81f0d', mid: '#ff6a18', core: '#ffe89c', ink: '#120705' },
  bronze: { outer: '#0ea5e9', mid: '#38bdf8', core: '#e0f2fe', ink: '#081426' },
  water: { outer: '#0a3d91', mid: '#1ca8ff', core: '#ffffff', ink: '#081226' },
  wind: { outer: '#059669', mid: '#34d399', core: '#ecfdf5', ink: '#061a12' },
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
  // 1. Ground Sonic / Akaza-Style Geometric Compass Mandalas & Exploding Blood Seeds
  for (let i = 0; i < pool.sonicMandalas.length; i++) {
    const m = pool.sonicMandalas[i];
    if (!m.active) continue;
    const p = 1 - m.life / m.maxLife;
    const alpha = Math.max(0, (1 - p) * 0.94);
    const pal = PALETTE_COLORS[m.palette];

    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.scale(1, 0.58);
    ctx.globalAlpha = alpha;

    // Akaza-style 12-spoke Destructive Death: Compass Needle geometric snowflake array
    const outerR = Math.max(24, m.maxRadius * Math.min(1, p * 1.35 + 0.18));
    const spokes = 12;

    // Luminous ground glow beneath the geometric compass
    const compassGlow = ctx.createRadialGradient(0, 0, outerR * 0.08, 0, 0, outerR * 1.12);
    compassGlow.addColorStop(0, pal.mid + '66');
    compassGlow.addColorStop(0.65, pal.outer + '33');
    compassGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = compassGlow;
    ctx.beginPath();
    ctx.arc(0, 0, outerR * 1.12, 0, Math.PI * 2);
    ctx.fill();

    // Snowflake cross-bars on each spoke
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 5.2 * (1 - p * 0.35);
    for (let s = 0; s < spokes; s++) {
      const sa = m.rotation + (s / spokes) * Math.PI * 2;
      const tipR = s % 2 === 0 ? outerR * 1.1 : outerR * 0.88;
      ctx.beginPath();
      ctx.moveTo(Math.cos(sa) * (outerR * 0.16), Math.sin(sa) * (outerR * 0.16));
      ctx.lineTo(Math.cos(sa) * tipR, Math.sin(sa) * tipR);
      ctx.stroke();
    }
    ctx.strokeStyle = pal.core;
    ctx.lineWidth = 2.4 * (1 - p * 0.35);
    for (let s = 0; s < spokes; s++) {
      const sa = m.rotation + (s / spokes) * Math.PI * 2;
      const tipR = s % 2 === 0 ? outerR * 1.1 : outerR * 0.88;
      const branchR = tipR * 0.68;
      const bx = Math.cos(sa) * branchR;
      const by = Math.sin(sa) * branchR;
      ctx.beginPath();
      ctx.moveTo(Math.cos(sa) * (outerR * 0.16), Math.sin(sa) * (outerR * 0.16));
      ctx.lineTo(Math.cos(sa) * tipR, Math.sin(sa) * tipR);
      // Snowflake barb left & right
      ctx.moveTo(bx, by);
      ctx.lineTo(
        bx + Math.cos(sa + 0.55) * (outerR * 0.16),
        by + Math.sin(sa + 0.55) * (outerR * 0.16)
      );
      ctx.moveTo(bx, by);
      ctx.lineTo(
        bx + Math.cos(sa - 0.55) * (outerR * 0.16),
        by + Math.sin(sa - 0.55) * (outerR * 0.16)
      );
      ctx.stroke();
    }

    for (let r = 0; r < m.ringCount; r++) {
      const rp = Math.min(1, p * (1 + r * 0.16));
      const rad = Math.max(12, m.maxRadius * rp * (1 - r * 0.2));
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 7.2 * (1 - p * 0.45);
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = r === 0 ? pal.core : pal.mid;
      ctx.lineWidth = 3.6 * (1 - p * 0.35);
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Vertical rising Akaza spirit-flame pillars at the 6 primary compass vertices (un-foreshortened in Y!)
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.globalAlpha = alpha * 0.88;
    for (let s = 0; s < 6; s++) {
      const sa = m.rotation + (s / 6) * Math.PI * 2;
      const vx = Math.cos(sa) * outerR * 0.96;
      const vy = Math.sin(sa) * outerR * 0.96 * 0.58;
      const pillarH = (38 + (s % 2) * 18) * (1 - p * 0.5);
      const pillarW = 9 * (1 - p * 0.35);
      ctx.beginPath();
      ctx.moveTo(vx - pillarW, vy);
      ctx.lineTo(vx, vy - pillarH);
      ctx.lineTo(vx + pillarW, vy);
      ctx.closePath();
      ctx.fillStyle = pal.mid;
      ctx.fill();
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 2.0;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(vx - pillarW * 0.45, vy);
      ctx.lineTo(vx, vy - pillarH * 0.82);
      ctx.lineTo(vx + pillarW * 0.45, vy);
      ctx.closePath();
      ctx.fillStyle = pal.core;
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
    const pulse = 0.8 + Math.sin(p * Math.PI * 5) * 0.14;
    const rad = seed.radius * (0.35 + p * 0.65);

    ctx.save();
    ctx.translate(seed.x, seed.y);
    ctx.scale(1, 0.56);

    // Soft outer magma/blood aura
    const seedGlow = ctx.createRadialGradient(0, 0, rad * 0.15, 0, 0, seed.radius);
    seedGlow.addColorStop(0, p > 0.72 ? 'rgba(255, 190, 215, 0.52)' : 'rgba(255, 31, 109, 0.36)');
    seedGlow.addColorStop(0.7, 'rgba(180, 14, 52, 0.22)');
    seedGlow.addColorStop(1, 'rgba(18, 8, 6, 0)');
    ctx.fillStyle = seedGlow;
    ctx.beginPath();
    ctx.arc(0, 0, seed.radius, 0, Math.PI * 2);
    ctx.fill();

    // Jagged ink-edged lotus flame ring (6 tapered petals)
    const petals = 6;
    ctx.beginPath();
    for (let k = 0; k < petals * 2; k++) {
      const a = seed.seed + (k / (petals * 2)) * Math.PI * 2 + p * 1.1;
      const r = k % 2 === 0 ? rad * (0.98 * pulse) : rad * 0.48;
      if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = pal.outer;
    ctx.globalAlpha = 0.72 + p * 0.22;
    ctx.fill();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 3.8;
    ctx.stroke();

    // Inner bright crimson-gold cel flame core
    ctx.beginPath();
    for (let k = 0; k < petals * 2; k++) {
      const a = seed.seed + (k / (petals * 2)) * Math.PI * 2 - p * 0.8;
      const r = k % 2 === 0 ? rad * 0.64 : rad * 0.26;
      if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = p > 0.75 ? pal.core : pal.mid;
    ctx.fill();

    // Expanding thin outer warning contour
    ctx.globalAlpha = 0.68;
    ctx.strokeStyle = pal.mid;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, seed.radius * (0.88 + p * 0.12), 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // 2. Magma Fissure Geysers (Jagged Anime Cel Flame Pillars)
  for (let i = 0; i < pool.magmaGeysers.length; i++) {
    const g = pool.magmaGeysers[i];
    if (!g.active) continue;
    const p = 1 - g.life / g.maxLife;
    const h = g.maxHeight * Math.sin(Math.min(1, p * 1.15) * Math.PI);
    const w = g.radius * (1 - p * 0.25);
    const pal = PALETTE_COLORS[g.palette];

    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.globalAlpha = Math.max(0, 1 - p * 0.85);

    // Base stone scorch circle
    ctx.fillStyle = pal.ink;
    ctx.beginPath();
    ctx.ellipse(0, 0, w, w * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    // Multi-tongue jagged eruption silhouette with crisp #120806 ink outline
    ctx.beginPath();
    ctx.moveTo(-w * 0.72, 0);
    ctx.lineTo(-w * 0.45, -h * 0.62);
    ctx.lineTo(-w * 0.22, -h * 0.42);
    ctx.lineTo(0, -h);
    ctx.lineTo(w * 0.26, -h * 0.48);
    ctx.lineTo(w * 0.52, -h * 0.68);
    ctx.lineTo(w * 0.72, 0);
    ctx.closePath();
    ctx.fillStyle = pal.outer;
    ctx.fill();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 4.4;
    ctx.stroke();

    // Inner bright core tongue
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, 0);
    ctx.lineTo(0, -h * 0.76);
    ctx.lineTo(w * 0.34, 0);
    ctx.closePath();
    ctx.fillStyle = pal.core;
    ctx.fill();
    ctx.restore();
  }

  // 3. Swirling Cyclone Vortexes (Tapered multi-arm anime ribbon spirals + Sanemi black wind shards)
  for (let i = 0; i < pool.cycloneArms.length; i++) {
    const c = pool.cycloneArms[i];
    if (!c.active) continue;
    const p = 1 - c.life / c.maxLife;
    const alpha = Math.max(0, Math.sin((1 - p) * Math.PI * 0.5) * 0.96);
    const pal = PALETTE_COLORS[c.palette];

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(1, 0.64);
    ctx.globalAlpha = alpha;

    for (let arm = 0; arm < c.armCount; arm++) {
      const baseA = c.rotation + (arm / c.armCount) * Math.PI * 2;
      ctx.beginPath();
      const steps = 14;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const r = c.innerRadius + (c.outerRadius - c.innerRadius) * t;
        const a = baseA + t * 2.55;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.lineCap = 'round';
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 17 * (1 - p * 0.38);
      ctx.stroke();

      ctx.strokeStyle = pal.outer;
      ctx.lineWidth = 12 * (1 - p * 0.38);
      ctx.stroke();

      ctx.strokeStyle = pal.mid;
      ctx.lineWidth = 7.5 * (1 - p * 0.38);
      ctx.stroke();

      ctx.strokeStyle = pal.core;
      ctx.lineWidth = 3.2 * (1 - p * 0.45);
      ctx.stroke();

      // Sanemi-style flying black Sumi-e wind/ember shards along the vortex perimeter
      const shardA = baseA + 1.85;
      const shardR = c.outerRadius * (0.72 + (arm % 2) * 0.22);
      const sx = Math.cos(shardA) * shardR;
      const sy = Math.sin(shardA) * shardR;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(shardA + 1.2);
      ctx.fillStyle = '#0e0706';
      ctx.strokeStyle = pal.mid;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(-2, -5.5);
      ctx.lineTo(13, 0);
      ctx.lineTo(-2, 5.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // 4. Sun Halo Flame Wheels (Rengoku / Tanjiro Hinokami Kagura burning sun wheel with sculpted cel flame teeth)
  for (let i = 0; i < pool.sunHaloRings.length; i++) {
    const r = pool.sunHaloRings[i];
    if (!r.active) continue;
    const p = 1 - r.life / r.maxLife;
    const pal = PALETTE_COLORS[r.palette];
    const rad = r.radius * (0.68 + p * 0.42);

    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.scale(1, 0.74);
    ctx.globalAlpha = Math.max(0, 1 - p * 0.88);

    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 20 * (1 - p * 0.38);
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = pal.outer;
    ctx.lineWidth = 13.5 * (1 - p * 0.38);
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = pal.mid;
    ctx.lineWidth = 8.2 * (1 - p * 0.42);
    ctx.beginPath();
    ctx.arc(0, 0, rad * 0.96, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = pal.core;
    ctx.lineWidth = 3.8 * (1 - p * 0.48);
    ctx.beginPath();
    ctx.arc(0, 0, rad * 0.92, 0, Math.PI * 2);
    ctx.stroke();

    // Perimeter Breathing Style Ornaments (Water Hokusai foam curls / Thunder bolts / Wind blades / Flame tongues)
    if (r.palette === 'water') {
      const curlCount = 10;
      for (let s = 0; s < curlCount; s++) {
        const a = r.rotation + (s / curlCount) * Math.PI * 2;
        const tipA = a + 0.36;
        const cx = Math.cos(tipA) * (rad * 1.14);
        const cy = Math.sin(tipA) * (rad * 1.14);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (rad * 0.96), Math.sin(a) * (rad * 0.96));
        ctx.quadraticCurveTo(
          Math.cos(a + 0.18) * (rad * 1.24),
          Math.sin(a + 0.18) * (rad * 1.24),
          cx,
          cy
        );
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = 6.0;
        ctx.stroke();
        ctx.strokeStyle = pal.core;
        ctx.lineWidth = 3.2;
        ctx.stroke();

        ctx.fillStyle = pal.core;
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(cx, cy, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else if (r.palette === 'thunder') {
      const boltCount = 10;
      for (let s = 0; s < boltCount; s++) {
        const a = r.rotation + (s / boltCount) * Math.PI * 2;
        const b1 = rad * 1.02;
        const b2 = rad * 1.18;
        const b3 = rad * 1.38;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * b1, Math.sin(a) * b1);
        ctx.lineTo(Math.cos(a + 0.11) * b2, Math.sin(a + 0.11) * b2);
        ctx.lineTo(Math.cos(a - 0.04) * b3, Math.sin(a - 0.04) * b3);
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = 5.4;
        ctx.stroke();
        ctx.strokeStyle = s % 2 === 0 ? pal.mid : '#38bdf8';
        ctx.lineWidth = 2.8;
        ctx.stroke();
      }
    } else {
      const spikes = 16;
      for (let s = 0; s < spikes; s++) {
        const a = r.rotation + (s / spikes) * Math.PI * 2;
        const baseR = rad * 0.93;
        const tipR = rad * (1.28 + (s % 3) * 0.11);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.14) * baseR, Math.sin(a - 0.14) * baseR);
        ctx.quadraticCurveTo(
          Math.cos(a + 0.05) * (tipR * 0.93),
          Math.sin(a + 0.05) * (tipR * 0.93),
          Math.cos(a + 0.15) * tipR,
          Math.sin(a + 0.15) * tipR
        );
        ctx.lineTo(Math.cos(a + 0.16) * baseR, Math.sin(a + 0.16) * baseR);
        ctx.closePath();
        ctx.fillStyle = s % 2 === 0 ? pal.outer : pal.mid;
        ctx.fill();
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = 2.8;
        ctx.stroke();

        // Inner bright highlight core
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.06) * baseR, Math.sin(a - 0.06) * baseR);
        ctx.lineTo(Math.cos(a + 0.1) * (tipR * 0.88), Math.sin(a + 0.1) * (tipR * 0.88));
        ctx.lineTo(Math.cos(a + 0.08) * baseR, Math.sin(a + 0.08) * baseR);
        ctx.closePath();
        ctx.fillStyle = pal.core;
        ctx.fill();
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
    const mx = (t.x1 + t.x2) * 0.5 + Math.sin(t.pulsePhase) * 16;
    const my = (t.y1 + t.y2) * 0.5 + Math.cos(t.pulsePhase) * 10;
    ctx.beginPath();
    ctx.moveTo(t.x1, t.y1);
    ctx.quadraticCurveTo(mx, my, t.x2, t.y2);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 6.2;
    ctx.stroke();
    ctx.strokeStyle = pal.outer;
    ctx.lineWidth = 3.6;
    ctx.stroke();
    ctx.strokeStyle = pal.mid;
    ctx.lineWidth = 2.0;
    ctx.stroke();
    ctx.strokeStyle = pal.core;
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.restore();
  }
  // Cross-webbing fibers between adjacent Rui blood threads (Image 15)
  if (activeThreads.length >= 2) {
    ctx.save();
    for (let i = 0; i < activeThreads.length - 1; i++) {
      const tA = activeThreads[i];
      const tB = activeThreads[i + 1];
      const pal = PALETTE_COLORS[tA.palette];
      const alpha = Math.min(tA.life / tA.maxLife, tB.life / tB.maxLife) * 0.85;
      ctx.globalAlpha = Math.max(0, alpha);
      for (const frac of [0.38, 0.72]) {
        const ax = tA.x1 + (tA.x2 - tA.x1) * frac;
        const ay = tA.y1 + (tA.y2 - tA.y1) * frac;
        const bx = tB.x1 + (tB.x2 - tB.x1) * frac;
        const by = tB.y1 + (tB.y2 - tB.y1) * frac;
        if (Math.hypot(bx - ax, by - ay) < 180) {
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.strokeStyle = pal.ink;
          ctx.lineWidth = 3.8;
          ctx.stroke();
          ctx.strokeStyle = pal.mid;
          ctx.lineWidth = 1.6;
          ctx.stroke();

          // Crimson blood knot node at web intersection
          ctx.fillStyle = pal.core;
          ctx.strokeStyle = pal.ink;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(ax, ay, 3.2, 0, Math.PI * 2);
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
    ctx.lineWidth = 6.5 * (1 - p * 0.5);
    ctx.stroke();
    ctx.strokeStyle = pal.mid;
    ctx.lineWidth = 3.2 * (1 - p * 0.5);
    ctx.stroke();
    ctx.strokeStyle = pal.core;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // 6. Blood Sickle Crescents (Gyutaro / Daki black-inked crimson blood blades) & Dharma Chakrams
  for (let i = 0; i < pool.bloodSickles.length; i++) {
    const s = pool.bloodSickles[i];
    if (!s.active) continue;
    const p = 1 - s.life / s.maxLife;
    const pal = PALETTE_COLORS[s.palette];

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.globalAlpha = Math.max(0, 1 - p * 0.85);
    ctx.beginPath();
    ctx.arc(0, 0, s.radius, -1.25, 1.25, false);
    ctx.arc(-s.radius * 0.34, 0, s.radius * 0.86, 1.12, -1.12, true);
    ctx.closePath();
    ctx.fillStyle = pal.outer;
    ctx.fill();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 4.4;
    ctx.stroke();
    ctx.strokeStyle = pal.core;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, s.radius * 0.94, -0.95, 0.95);
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
    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.arc(0, 0, ch.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = pal.mid;
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.arc(0, 0, ch.radius, 0, Math.PI * 2);
    ctx.stroke();

    for (let b = 0; b < ch.blades; b++) {
      const a = (b / ch.blades) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (ch.radius * 0.85), Math.sin(a) * (ch.radius * 0.85));
      ctx.lineTo(Math.cos(a + 0.16) * (ch.radius * 1.42), Math.sin(a + 0.16) * (ch.radius * 1.42));
      ctx.lineTo(Math.cos(a + 0.34) * (ch.radius * 0.88), Math.sin(a + 0.34) * (ch.radius * 0.88));
      ctx.closePath();
      ctx.fillStyle = b % 2 === 0 ? pal.core : pal.outer;
      ctx.fill();
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }
    ctx.restore();
  }

  // 7. Tapered 2D Anime Breathing Style & Blood Demon Art Crescent Ribbons:
  //    - Hinokami / Sun / Magma: Multi-band cel fire ribbons + hooked black-inked flame tongues + diamond embers (Images 1, 6, 9, 10)
  //    - Ukiyo-e Water ('water'): Deep indigo-to-cyan wave ribbons + white Hokusai sea-foam claw curls & droplets (Images 7, 8, 11, 12)
  //    - Sanemi Wind ('wind'): Emerald wind crescents + flying black Sumi-e hurricane slash shards (Image 4)
  //    - Zenitsu / Kaigaku Thunder ('thunder'): Dual golden-amber & electric-blue branching jagged lightning bolts (Images 5, 14)
  for (let i = 0; i < pool.slashArcs.length; i++) {
    const s = pool.slashArcs[i];
    if (!s.active) continue;
    const p = 1 - s.life / s.maxLife;
    const alpha = Math.max(0, 1 - Math.pow(p, 1.65));
    const pal = PALETTE_COLORS[s.palette];
    const startA = s.direction === 1 ? s.angle - s.arcSpan * 0.52 : s.angle + s.arcSpan * 0.52;
    const sweepSpan = s.arcSpan * s.direction;
    const rad = s.radius * (0.94 + p * 0.15);
    const widthScale = Math.sin(Math.min(1, p * 1.2 + 0.18) * Math.PI);
    const maxThick = Math.max(12, s.thickness * 1.35 * widthScale);
    const segs = 18;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(1, 0.72);
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Helper to trace a tapered crescent polygon band (t=0 razor tail -> t=0.68 wide belly -> t=1.0 sharp tip)
    const traceTaperedBand = (innerMul: number, outerMul: number, radiusOffset = 0) => {
      ctx.beginPath();
      for (let k = 0; k <= segs; k++) {
        const t = k / segs;
        const a = startA + sweepSpan * t;
        const taper = Math.sin(Math.pow(t, 0.74) * Math.PI);
        const rOut = rad + radiusOffset + maxThick * outerMul * taper;
        const px = Math.cos(a) * rOut;
        const py = Math.sin(a) * rOut;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      for (let k = segs; k >= 0; k--) {
        const t = k / segs;
        const a = startA + sweepSpan * t;
        const taper = Math.sin(Math.pow(t, 0.74) * Math.PI);
        const rIn = Math.max(8, rad + radiusOffset - maxThick * innerMul * taper);
        const px = Math.cos(a) * rIn;
        const py = Math.sin(a) * rIn;
        ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    // Band 1: Outer Primary Elemental Cel Ribbon + Bold #120806 Sumi-e Woodblock Ink Border
    traceTaperedBand(0.55, 0.58);
    ctx.fillStyle = pal.outer;
    ctx.fill();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 4.6;
    ctx.stroke();

    // Band 2: Vibrant Mid-Core Cel Ribbon (Solar Orange / Cerulean Wave / Emerald Wind / Lightning Gold)
    traceTaperedBand(0.28, 0.34, maxThick * 0.04);
    ctx.fillStyle = pal.mid;
    ctx.fill();

    // Band 3: White-Hot Inner Blade Trajectory Core
    traceTaperedBand(0.08, 0.14, maxThick * 0.08);
    ctx.fillStyle = pal.core;
    ctx.fill();

    // Detached Secondary Outer Echo Ribbon (gives Demon Slayer multi-layered fluid swirl depth)
    traceTaperedBand(0.08, 0.16, maxThick * 0.78);
    ctx.fillStyle = pal.mid;
    ctx.fill();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Palette-Specific Ufotable Signature Ornaments along the outer slash crest
    if (s.palette === 'water') {
      // Ukiyo-e Water Breathing (Images 7, 8, 11, 12): Internal cobalt wave stripes + White Hokusai Sea-Foam Claw Curls!
      ctx.strokeStyle = '#062356';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      for (let k = 2; k <= segs - 2; k++) {
        const t = k / segs;
        const a = startA + sweepSpan * t;
        const rWave = rad + Math.sin(t * Math.PI * 5 + s.seed) * (maxThick * 0.16);
        const px = Math.cos(a) * rWave;
        const py = Math.sin(a) * rWave;
        if (k === 2) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      const foamCount = 7;
      for (let f = 0; f < foamCount; f++) {
        const tf = (f + 0.4) / foamCount;
        const fa = startA + sweepSpan * tf;
        const taper = Math.sin(Math.pow(tf, 0.74) * Math.PI);
        const baseR = rad + maxThick * 0.52 * taper;
        const crestR = baseR + maxThick * (0.48 + (f % 2) * 0.22);
        const curlAngle = fa + s.direction * 0.14;

        // White Hokusai foam claw curl with crisp dark indigo-black ink outline
        ctx.beginPath();
        ctx.moveTo(Math.cos(fa - s.direction * 0.09) * baseR, Math.sin(fa - s.direction * 0.09) * baseR);
        ctx.quadraticCurveTo(
          Math.cos(fa) * crestR,
          Math.sin(fa) * crestR,
          Math.cos(curlAngle) * (crestR * 0.96),
          Math.sin(curlAngle) * (crestR * 0.96)
        );
        ctx.quadraticCurveTo(
          Math.cos(fa + s.direction * 0.06) * (baseR * 1.03),
          Math.sin(fa + s.direction * 0.06) * (baseR * 1.03),
          Math.cos(fa + s.direction * 0.08) * baseR,
          Math.sin(fa + s.direction * 0.08) * baseR
        );
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = 2.4;
        ctx.stroke();

        // Detached white sea-foam splash droplets around the wave crest
        const dropR = crestR + 9 + (f % 3) * 5;
        const dx = Math.cos(curlAngle + s.direction * 0.05) * dropR;
        const dy = Math.sin(curlAngle + s.direction * 0.05) * dropR;
        ctx.beginPath();
        ctx.arc(dx, dy, 3.4 - (f % 2) * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
    } else if (s.palette === 'wind') {
      // Sanemi Wind Breathing (Image 4): Razor emerald wind tongues + Flying Black Sumi-e Hurricane Shards
      const shardCount = 8;
      for (let w = 0; w < shardCount; w++) {
        const tw = (w + 0.35) / shardCount;
        const wa = startA + sweepSpan * tw;
        const shardDist = rad + maxThick * (0.62 + (w % 3) * 0.28);
        const sx = Math.cos(wa) * shardDist;
        const sy = Math.sin(wa) * shardDist;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(wa + s.direction * 1.45);
        ctx.fillStyle = w % 2 === 0 ? '#090d0b' : pal.mid;
        ctx.strokeStyle = w % 2 === 0 ? pal.mid : pal.ink;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.lineTo(-2, -5.2);
        ctx.lineTo(15, 0);
        ctx.lineTo(-2, 5.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    } else if (s.palette === 'thunder') {
      // Zenitsu / Kaigaku Thunder Breathing (Images 5, 14): Dual Golden-Amber + Electric-Blue Branching Lightning Forks!
      for (let bolt = 0; bolt < 2; bolt++) {
        const isBlue = bolt === 1;
        ctx.beginPath();
        const boltSteps = 10;
        for (let b = 0; b <= boltSteps; b++) {
          const bf = b / boltSteps;
          const ba = startA + sweepSpan * bf;
          const zig = (b % 2 === 0 ? 1 : -1) * maxThick * (isBlue ? 0.56 : 0.42);
          const br = rad + zig + (isBlue ? 8 : -4);
          const bx = Math.cos(ba) * br;
          const by = Math.sin(ba) * br;
          if (b === 0) ctx.moveTo(bx, by);
          else ctx.lineTo(bx, by);
        }
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = isBlue ? 5.2 : 6.4;
        ctx.stroke();
        ctx.strokeStyle = isBlue ? '#38bdf8' : '#ffd84a';
        ctx.lineWidth = isBlue ? 2.6 : 3.4;
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    } else {
      // Hinokami Kagura / Rengoku Flame / Blood Art (Images 1, 6, 9, 10, 13):
      // 9 Sculpted Hooked Cel Flame Tongues + Detached Ink-Rimmed Ember Chunks
      const tongueCount = 9;
      for (let t = 0; t < tongueCount; t++) {
        const tf = (t + 0.4) / tongueCount;
        const ta = startA + sweepSpan * tf;
        const taper = Math.sin(Math.pow(tf, 0.74) * Math.PI);
        const baseR = rad + maxThick * 0.44 * taper;
        const tipR = baseR + maxThick * (0.68 + ((t + Math.floor(s.seed)) % 3) * 0.25);

        ctx.beginPath();
        ctx.moveTo(Math.cos(ta - s.direction * 0.11) * baseR, Math.sin(ta - s.direction * 0.11) * baseR);
        ctx.quadraticCurveTo(
          Math.cos(ta + s.direction * 0.06) * (tipR * 0.94),
          Math.sin(ta + s.direction * 0.06) * (tipR * 0.94),
          Math.cos(ta + s.direction * 0.19) * tipR,
          Math.sin(ta + s.direction * 0.19) * tipR
        );
        ctx.lineTo(Math.cos(ta + s.direction * 0.11) * baseR, Math.sin(ta + s.direction * 0.11) * baseR);
        ctx.closePath();
        ctx.fillStyle = t % 2 === 0 ? pal.outer : pal.mid;
        ctx.fill();
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = 2.8;
        ctx.stroke();

        // Inner bright yellow-white flame tongue core
        ctx.beginPath();
        ctx.moveTo(Math.cos(ta - s.direction * 0.04) * baseR, Math.sin(ta - s.direction * 0.04) * baseR);
        ctx.lineTo(
          Math.cos(ta + s.direction * 0.14) * (tipR * 0.88),
          Math.sin(ta + s.direction * 0.14) * (tipR * 0.88)
        );
        ctx.lineTo(Math.cos(ta + s.direction * 0.07) * baseR, Math.sin(ta + s.direction * 0.07) * baseR);
        ctx.closePath();
        ctx.fillStyle = pal.core;
        ctx.fill();

        // Detached anime ember chunk outside every second flame tongue (Image 9)
        if (t % 2 === 0) {
          const emberR = tipR + 10 + (t % 3) * 4;
          const ex = Math.cos(ta + s.direction * 0.22) * emberR;
          const ey = Math.sin(ta + s.direction * 0.22) * emberR;
          ctx.save();
          ctx.translate(ex, ey);
          ctx.rotate(ta + p * 2.5);
          ctx.fillStyle = pal.core;
          ctx.strokeStyle = pal.ink;
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(0, -5.2);
          ctx.lineTo(3.6, 0);
          ctx.lineTo(0, 5.2);
          ctx.lineTo(-3.6, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
    }
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
    ctx.lineWidth = st.width + 2.6;
    ctx.stroke();
    ctx.strokeStyle = st.color;
    ctx.lineWidth = st.width;
    ctx.stroke();
    ctx.restore();
  }

  for (let i = 0; i < pool.clashSparks.length; i++) {
    const sp = pool.clashSparks[i];
    if (!sp.active) continue;
    const p = 1 - sp.life / sp.maxLife;
    const len = sp.length * (1 - p * 0.45);
    const nx = Math.cos(sp.angle);
    const ny = Math.sin(sp.angle);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - p);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sp.x - nx * len * 0.35, sp.y - ny * len * 0.25);
    ctx.lineTo(sp.x + nx * len, sp.y + ny * len * 0.72);
    ctx.strokeStyle = '#120806';
    ctx.lineWidth = 5.4;
    ctx.stroke();
    ctx.strokeStyle = sp.color;
    ctx.lineWidth = 2.6;
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

  ctx.save();
  // Crisp high-contrast Sumi-e impact inversion flash (2-frame manga clash look)
  ctx.fillStyle = p > 0.5 ? '#070405' : pool.impactInversionColor;
  ctx.globalAlpha = p > 0.5 ? 0.52 : 0.34;
  ctx.fillRect(0, 0, width, height);

  // Radial white-hot manga speed lines converging toward impact point or screen center
  const cx = pool.impactOriginX > 0 ? width * 0.5 : width * 0.5;
  const cy = pool.impactOriginY > 0 ? height * 0.5 : height * 0.5;
  ctx.strokeStyle = p > 0.5 ? '#fff9e6' : '#120806';
  ctx.globalAlpha = 0.72 * p;
  ctx.lineWidth = 2.6;
  const rayCount = 24;
  for (let i = 0; i < rayCount; i++) {
    const a = (i / rayCount) * Math.PI * 2 + (i % 2) * 0.04;
    const r0 = Math.min(width, height) * (0.16 + (i % 3) * 0.05);
    const r1 = Math.max(width, height) * 0.75;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();
}
