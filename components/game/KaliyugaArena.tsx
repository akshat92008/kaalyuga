'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CHAMBERS, GAME_ASSETS, ChamberSpec, PropType, EnemyTrait } from '@/lib/game/assets';
import {
  INITIAL_SHRINE_RANKS,
  INITIAL_ASHEN_KARMA,
  ShrineRanks,
  StaffStance,
  WeaponId,
  UpgradeId,
  STANCE_CONFIGS,
  WEAPON_CONFIGS,
  computeDerivedPlayerStats,
  calculateLightHitDamage,
  calculateStanceHeavyDamage,
  getNextStaffStance,
  computeBossPhase,
  applyPostureDamage,
  purchaseShrineUpgrade,
  isPointInConeTelegraph,
  isPointInDashCorridor,
  isPointInShockwaveRing,
  consumeDashStamina,
} from '@/lib/game/rules';
import { soundEngine } from '@/lib/game/audio';
import {
  loadAndProcessSprite,
  getProcessedSpriteSync,
  ProcessedSpriteAsset,
} from '@/lib/game/spriteProcessor';
import { Rudra3DRenderer } from '@/lib/game/rudra3dRenderer';
import { Boss3DRenderer } from '@/lib/game/boss3dRenderer';
import { Enemy3DRenderer } from '@/lib/game/enemy3dRenderer';
import { TitleScreen } from './TitleScreen';
import KeepersShrineModal from './KeepersShrineModal';
import StoryCodexModal from './StoryCodexModal';
import OutcomeModal from './OutcomeModal';
import BoonModal from './BoonModal';
import { NarrativeOverlay } from './NarrativeOverlay';
import {
  getLanternLightState,
  INITIAL_STORY_FLAGS,
  loadStoryMemoryFlags,
  LookObjectSpec,
  saveStoryMemoryFlags,
  SliceStageId,
  StoryMemoryFlags,
} from '@/engine/v7StoryEngine';
import {
  MoltenSlagFissure,
  renderAndFindChamberLookObject,
  renderBossMythicMechanics,
  renderLanternAtmosphereAndAshStorm,
} from '@/engine/lanternShaderEngine';
import {
  DEFAULT_UE5_GRAPHICS_SETTINGS,
  loadMeruGraphicsSettings,
  LumenLightEmitter,
  MeruGraphicsSettings,
  MeruQualityTier,
  presetForQualityTier,
  renderUE5PostProcessingPass,
  renderWorldSpaceLumenGI,
  saveMeruGraphicsSettings,
} from '@/engine/ue5GraphicsEngine';
import {
  CelestialBoonId,
  CelestialBoonSpec,
  CELESTIAL_BOONS,
  IMMORTAL_PATRONS,
  computeBoonModifiers,
  getActiveSlashPalette,
  getBoonById,
  isShadowStrikeBackstab,
  rollCelestialBoonOffer,
} from '@/lib/game/boons';
import {
  ChamberTrapRuntime,
  createChamberTrapsRuntime,
  constrainActorToChamber,
  getChamberGeometry,
  renderParallaxAbyss,
  renderIsometricChamberPlatform,
  updateAndRenderPressureTraps,
  renderForegroundParallaxAndWipe,
} from '@/lib/game/chamberGeometry';


interface EnemyEntity {
  id: number;
  type: 'wolf_guai' | 'fire_monk' | 'stone_golem' | 'furnace_titan' | 'xuemo' | 'vrikodara';
  trait?: EnemyTrait;
  name: string;
  chineseTitle: string;
  isBoss: boolean;
  armorCracked?: boolean;
  tuskLodgedTimer?: number;
  vacuumActiveTimer?: number;
  lodgedCasts?: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  displayHp: number;
  posture: number;
  maxPosture: number;
  postureBrokenTimer: number;
  immobilizedTimer: number;
  hitFlashTimer: number;
  parryStanceTimer: number;
  growthScale: number;
  animTime: number;
  aiState: 'idle' | 'chase' | 'windup' | 'attack' | 'recover' | 'ko';
  aiTimer: number;
  windupDuration: number;
  attackPattern: number;
  attackKind: 'cone' | 'corridor' | 'shockwave';
  aimAngle: number;
  corridorEndX: number;
  corridorEndY: number;
  comboHitsRemaining: number;
  slashArcAlpha: number;
  telegraphRadius: number;
  telegraphX: number;
  telegraphY: number;
  scaleX: number;
  scaleY: number;
  koTimer: number;
  phase: 1 | 2 | 3;
  scorchTimer: number;
  scorchTickAccum: number;
}

interface DestructiblePropEntity {
  id: number;
  type: PropType;
  frameIndex: 0 | 1 | 2 | 3;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  hitFlashTimer: number;
  shakeTimer: number;
  destroyed: boolean;
}

interface CloneEntity {
  id: number;
  x: number;
  y: number;
  facing: 1 | -1;
  life: number;
  maxLife: number;
  attackCooldown: number;
  animTime: number;
}

interface ProjectileEntity {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
  life: number;
  deflected?: boolean;
  isPlayerCast?: boolean;
}

interface ParticleItem {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity: number;
}

interface FloatingTextItem {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  subtext?: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

interface CraterDecal {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  decalFrame: 0 | 1 | 2 | 3;
  angle: number;
}

interface AfterimageItem {
  active: boolean;
  assetUrl: string;
  frameIndex: number;
  x: number;
  y: number;
  targetHeight: number;
  facing: 1 | -1;
  elevationY: number;
  life: number;
  maxLife: number;
  tint: 'gold' | 'jade';
}

interface ShockwaveRing {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number;
  maxLife: number;
}

interface AmbientMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  alpha: number;
  isLeaf: boolean;
}

interface HudSnapshot {
  chamberId: number;
  chamberName: string;
  foesRemaining: number;
  score: number;
  comboCount: number;
  ashenKarma: number;
  karmaRunDelta: number;
  fps: number;
  playerHp: number;
  playerDisplayHp: number;
  playerMaxHp: number;
  focusOrbs: number;
  focusProgress: number;
  dashCharges: number;
  maxDashCharges: number;
  stance: StaffStance;
  weapon: WeaponId;
  gourdSips: number;
  maxGourdSips: number;
  immobilizeCd: number;
  parryCd: number;
  clonesCd: number;
  transformCd: number;
  transformActiveTimer: number;
  hasBrokenTarget: boolean;
  boss: {
    active: boolean;
    name: string;
    chineseTitle: string;
    hp: number;
    displayHp: number;
    maxHp: number;
    posture: number;
    maxPosture: number;
    phase: 1 | 2 | 3;
    armorCracked?: boolean;
  } | null;
}

const MAX_PARTICLES = 320;
const MAX_PROJECTILES = 36;
const MAX_FLOATING_TEXTS = 24;
const MAX_AFTERIMAGES = 32;
const MAX_SHOCKWAVES = 14;
const MAX_AMBIENT_MOTES = 64;
const WORLD_SCALE = 3.15;
const BASE_CAMERA_ZOOM = 0.74;

export default function KaliyugaArena() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rudra3dRef = useRef<Rudra3DRenderer | null>(null);
  const boss3dRef = useRef<Boss3DRenderer | null>(null);
  const enemy3dRef = useRef<Enemy3DRenderer | null>(null);
  const gamepadPrevButtonsRef = useRef<boolean[]>([]);
  const [preloadProgress, setPreloadProgress] = useState<number>(18);

  // Initialize 3D Animated Rudra, 3D Bosses & 3D Enemy Squadron WebGL Renderers
  useEffect(() => {
    const r3d = new Rudra3DRenderer(512);
    const b3d = new Boss3DRenderer(512);
    const e3d = new Enemy3DRenderer(288);
    rudra3dRef.current = r3d;
    boss3dRef.current = b3d;
    enemy3dRef.current = e3d;

    let ticks = 0;
    const preloadTimer = window.setInterval(() => {
      ticks += 1;
      const rProg = r3d.isReady || r3d.loadProgress >= 1 ? 100 : Math.min(95, Math.round((r3d.loadProgress || 0.45) * 100));
      const bProg = b3d.isReady ? 100 : b3d.loadProgress || 25;
      const timeFloor = Math.min(100, 24 + ticks * 8);
      const combined = Math.min(100, Math.max(timeFloor, Math.round(rProg * 0.4 + bProg * 0.6)));
      setPreloadProgress(combined);
      if (combined >= 100) {
        window.clearInterval(preloadTimer);
      }
    }, 120);

    // Load persisted Ashen Karma & Homa Fire Shrine upgrade ranks from localStorage
    try {
      const raw = window.localStorage.getItem('kaliyuga_save_v1');
      if (raw) {
        const parsed = JSON.parse(raw) as {
          ashenKarma?: number;
          ranks?: Partial<ShrineRanks>;
        };
        const mergedRanks: ShrineRanks = {
          ...INITIAL_SHRINE_RANKS,
          ...(parsed.ranks || {}),
        };
        const savedKarma =
          typeof parsed.ashenKarma === 'number' && Number.isFinite(parsed.ashenKarma)
            ? Math.max(0, Math.round(parsed.ashenKarma))
            : INITIAL_ASHEN_KARMA;
        simRef.current.ranks = mergedRanks;
        simRef.current.ashenKarma = savedKarma;
        const derived = computeDerivedPlayerStats(mergedRanks);
        simRef.current.player.maxHp = derived.maxHp;
        simRef.current.player.hp = derived.maxHp;
        simRef.current.player.displayHp = derived.maxHp;
        simRef.current.player.maxGourdSips = derived.maxGourdSips;
        simRef.current.player.gourdSips = derived.maxGourdSips;
        simRef.current.player.extraLives = derived.extraLives;
        simRef.current.player.focusOrbs = derived.startingFocusOrbs;
        setShrineRanks(mergedRanks);
        setAshenKarma(savedKarma);
      }
    } catch {
      // Ignore storage read errors in restricted environments
    }

    return () => {
      window.clearInterval(preloadTimer);
      r3d.dispose();
      b3d.dispose();
      e3d.dispose();
      rudra3dRef.current = null;
      boss3dRef.current = null;
      enemy3dRef.current = null;
    };
  }, []);

  const triggerGamepadRumble = useCallback(
    (weakMagnitude = 0.4, strongMagnitude = 0.6, duration = 90) => {
      if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
      try {
        const pads = navigator.getGamepads();
        const pad = pads?.[0] || pads?.[1] || pads?.[2] || pads?.[3];
        const actuator = (
          pad as Gamepad & {
            vibrationActuator?: {
              playEffect?: (
                type: string,
                params: {
                  startDelay: number;
                  duration: number;
                  weakMagnitude: number;
                  strongMagnitude: number;
                }
              ) => Promise<unknown>;
            };
          }
        )?.vibrationActuator;
        if (actuator && typeof actuator.playEffect === 'function') {
          actuator
            .playEffect('dual-rumble', {
              startDelay: 0,
              duration,
              weakMagnitude,
              strongMagnitude,
            })
            .catch(() => {});
        }
      } catch {
        // Ignore rumble errors on unsupported browsers
      }
    },
    []
  );

  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'gameover'>('title');
  const [outcomeMode, setOutcomeMode] = useState<'none' | 'paused' | 'victory' | 'defeat'>('none');
  const [sliceStage, setSliceStage] = useState<SliceStageId>('combat_arena');
  const [storyFlags, setStoryFlags] = useState<StoryMemoryFlags>(() => loadStoryMemoryFlags());
  const [activeLookModal, setActiveLookModal] = useState<LookObjectSpec | null>(null);
  const [graphicsSettings, setGraphicsSettings] = useState<MeruGraphicsSettings>(() =>
    loadMeruGraphicsSettings()
  );
  const [shrineOpen, setShrineOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [boonModalOpen, setBoonModalOpen] = useState(false);
  const [boonChoices, setBoonChoices] = useState<CelestialBoonSpec[]>([]);
  const [ownedBoons, setOwnedBoons] = useState<CelestialBoonId[]>([]);
  const [boonReadyCount, setBoonReadyCount] = useState<number>(1);
  const [boonRerolls, setBoonRerolls] = useState<number>(2);
  const [muted, setMuted] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [shrineRanks, setShrineRanks] = useState<ShrineRanks>(INITIAL_SHRINE_RANKS);
  const [ashenKarma, setAshenKarma] = useState<number>(INITIAL_ASHEN_KARMA);

  const cycleGraphicsTier = useCallback(() => {
    setGraphicsSettings((prev) => {
      const order: MeruQualityTier[] = ['ultra', 'high', 'balanced'];
      const nextTier = order[(order.indexOf(prev.tier) + 1) % order.length];
      const next = presetForQualityTier(nextTier);
      simRef.current.graphicsSettings = next;
      saveMeruGraphicsSettings(next);
      return next;
    });
  }, []);

  const updateStoryFlags = useCallback((patch: Partial<StoryMemoryFlags>) => {
    setStoryFlags((prev) => {
      const next: StoryMemoryFlags = { ...prev, ...patch };
      simRef.current.storyFlags = next;
      saveStoryMemoryFlags(next);
      return next;
    });
  }, []);

  const [hud, setHud] = useState<HudSnapshot>(() => {
    const derived = computeDerivedPlayerStats(INITIAL_SHRINE_RANKS);
    return {
      chamberId: 1,
      chamberName: CHAMBERS[0].name,
      foesRemaining: CHAMBERS[0].spawns.length,
      score: 0,
      comboCount: 0,
      ashenKarma: INITIAL_ASHEN_KARMA,
      karmaRunDelta: 0,
      fps: 60,
      playerHp: derived.maxHp,
      playerDisplayHp: derived.maxHp,
      playerMaxHp: derived.maxHp,
      focusOrbs: derived.startingFocusOrbs,
      focusProgress: 0.35,
      dashCharges: 2,
      maxDashCharges: 2,
      stance: 'smash',
      weapon: 'jingu_bang',
      gourdSips: derived.maxGourdSips,
      maxGourdSips: derived.maxGourdSips,
      immobilizeCd: 0,
      parryCd: 0,
      clonesCd: 0,
      transformCd: 0,
      transformActiveTimer: 0,
      hasBrokenTarget: false,
      boss: null,
    };
  });

  // Mutable simulation state inside useRef so 60fps loop never tears down canvas
  const simRef = useRef({
    state: 'title' as 'title' | 'playing' | 'paused' | 'gameover',
    modalPaused: false,
    storyFlags: { ...INITIAL_STORY_FLAGS } as StoryMemoryFlags,
    graphicsSettings: { ...DEFAULT_UE5_GRAPHICS_SETTINGS } as MeruGraphicsSettings,
    nearestLookObject: null as LookObjectSpec | null,
    activeLookObject: null as LookObjectSpec | null,
    slagFissures: [] as MoltenSlagFissure[],
    viewportW: 1440,
    viewportH: 900,
    worldW: Math.round(1440 * WORLD_SCALE),
    worldH: Math.round(900 * WORLD_SCALE),
    camX: 380,
    camY: 240,
    dpr: 1,
    chamberIndex: 0,
    chamberBannerTimer: 3.2,
    chamberClearTimer: 0,
    bossPhaseBanner: null as {
      timer: number;
      title: string;
      speaker: string;
      strikethrough: string;
      correction: string;
    } | null,
    score: 0,
    comboCount: 0,
    comboResetTimer: 0,
    ashenKarma: INITIAL_ASHEN_KARMA,
    karmaRunDelta: 0,
    ranks: { ...INITIAL_SHRINE_RANKS } as ShrineRanks,
    activeBoons: [] as CelestialBoonId[],
    boonReadyCount: 1,
    boonRerollsRemaining: 2,
    lightningArcs: [] as Array<{
      x1: number;
      y1: number;
      y2: number;
      x2: number;
      color: string;
      life: number;
      maxLife: number;
    }>,
    hitstopTimer: 0,
    slowMoTimer: 0,
    cameraShakeTrauma: 0,
    cameraZoom: BASE_CAMERA_ZOOM,
    screenFlashAlpha: 0,
    screenFlashColor: '#ffffff',
    gateWipeTimer: 0,
    chasmVaultCalloutCd: 0,
    traps: [] as ChamberTrapRuntime[],
    fps: 60,
    frameCounter: 0,
    fpsAccum: 0,
    afterimageSpawnAccum: 0,

    player: {
      x: 820,
      y: 780,
      vx: 0,
      vy: 0,
      plumeLagX: -28,
      plumeLagY: -10,
      lastMoveDirX: 1,
      lastMoveDirY: 0,
      dashStartX: 820,
      dashStartY: 780,
      dashStreakAlpha: 0,
      dashCharges: 2,
      maxDashCharges: 2,
      dashRechargeTimer: 0,
      dashStrikeWindowTimer: 0,
      weaponSwingProgress: 0,
      facing: 1 as 1 | -1,
      hp: 250,
      maxHp: 250,
      displayHp: 250,
      focusOrbs: 1,
      focusProgress: 0.35,
      stance: 'smash' as StaffStance,
      weapon: 'jingu_bang' as WeaponId,
      gourdSips: 3,
      maxGourdSips: 3,
      extraLives: 0,
      walkDistance: 0,
      lastFootstepDist: 0,
      scaleX: 1,
      scaleY: 1,
      elevationY: 0,
      action: 'idle' as
        | 'idle'
        | 'light_attack'
        | 'heavy_unleash'
        | 'dodge'
        | 'parry'
        | 'astra'
        | 'execute'
        | 'gourd',
      actionTimer: 0,
      actionDuration: 0,
      comboStep: 1 as 1 | 2 | 3 | 4,
      comboWindowTimer: 0,
      invulnTimer: 0,
      hitFlashTimer: 0,
      immobilizeCd: 0,
      parryCd: 0,
      clonesCd: 0,
      transformCd: 0,
      transformTimer: 0,
      slashAngle: 0,
      slashArcAlpha: 0,
    },

    decoy: {
      active: false,
      x: 0,
      y: 0,
      timer: 0,
    },

    enemies: [] as EnemyEntity[],
    props: [] as DestructiblePropEntity[],
    currentWave: 1,
    maxWave: 1,
    waveQueue: [] as Array<{
      type: EnemyEntity['type'];
      x: number;
      y: number;
      delay: number;
      wave: 1 | 2 | 3;
      trait?: EnemyTrait;
    }>,
    summoningRifts: [] as Array<{
      type: EnemyEntity['type'];
      x: number;
      y: number;
      timer: number;
      maxTimer: number;
      trait?: EnemyTrait;
    }>,
    pendingSpawns: [] as Array<{
      type: EnemyEntity['type'];
      x: number;
      y: number;
      timer: number;
      trait?: EnemyTrait;
    }>,
    clones: [] as CloneEntity[],
    craters: [] as CraterDecal[],
    afterimages: Array.from({ length: MAX_AFTERIMAGES }, () => ({
      active: false,
      assetUrl: '',
      frameIndex: 0,
      x: 0,
      y: 0,
      targetHeight: 88,
      facing: 1 as 1 | -1,
      elevationY: 0,
      life: 0,
      maxLife: 0.25,
      tint: 'gold' as 'gold' | 'jade',
    })) as AfterimageItem[],
    shockwaves: Array.from({ length: MAX_SHOCKWAVES }, () => ({
      active: false,
      x: 0,
      y: 0,
      radius: 10,
      maxRadius: 120,
      color: '#ffd86b',
      life: 0,
      maxLife: 0.4,
    })) as ShockwaveRing[],
    ambientMotes: Array.from({ length: MAX_AMBIENT_MOTES }, (_, idx) => ({
      x: (idx * 97) % 1440,
      y: (idx * 67) % 900,
      vx: 16 + (idx % 5) * 6,
      vy: idx % 3 === 0 ? 14 + (idx % 4) * 5 : -18 - (idx % 5) * 6,
      size: 1.5 + (idx % 4) * 0.9,
      phase: idx * 0.7,
      alpha: 0.35 + (idx % 5) * 0.12,
      isLeaf: idx % 4 === 0,
    })) as AmbientMote[],
    projectiles: Array.from({ length: MAX_PROJECTILES }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 8,
      damage: 18,
      color: '#ff6422',
      life: 0,
    })) as ProjectileEntity[],
    particles: Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 3,
      color: '#ffaa44',
      alpha: 1,
      life: 0,
      maxLife: 1,
      gravity: 0,
    })) as ParticleItem[],
    floatingTexts: Array.from({ length: MAX_FLOATING_TEXTS }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: -36,
      text: '',
      subtext: undefined,
      color: '#ffffff',
      life: 0,
      maxLife: 0.78,
      scale: 1,
    })) as FloatingTextItem[],

    input: {
      keysHeld: new Set<string>(),
      justPressed: new Set<string>(),
      pointerScreenX: 640,
      pointerScreenY: 420,
      pointerX: 1020,
      pointerY: 660,
      pointerActive: false,
      bufferedAction: null as 'light' | 'heavy' | 'dodge' | null,
      bufferTimer: 0,
    },
  });

  // Helper to spawn pooled particles
  const spawnParticles = useCallback(
    (
      x: number,
      y: number,
      count: number,
      color: string,
      speed: number = 140,
      size: number = 4,
      gravity: number = 180
    ) => {
      const pool = simRef.current.particles;
      let spawned = 0;
      for (let i = 0; i < pool.length && spawned < count; i++) {
        if (!pool[i].active) {
          const angle = Math.random() * Math.PI * 2;
          const spd = speed * (0.35 + Math.random() * 0.85);
          pool[i].active = true;
          pool[i].x = x + (Math.random() - 0.5) * 18;
          pool[i].y = y + (Math.random() - 0.5) * 14;
          pool[i].vx = Math.cos(angle) * spd;
          pool[i].vy = Math.sin(angle) * spd - 35;
          pool[i].size = size * (0.7 + Math.random() * 0.7);
          pool[i].color = color;
          pool[i].alpha = 1;
          pool[i].maxLife = 0.32 + Math.random() * 0.38;
          pool[i].life = pool[i].maxLife;
          pool[i].gravity = gravity;
          spawned++;
        }
      }
    },
    []
  );

  // Helper to spawn pooled motion afterimages
  const spawnAfterimage = useCallback(
    (
      assetUrl: string,
      frameIndex: number,
      x: number,
      y: number,
      targetHeight: number,
      facing: 1 | -1,
      elevationY: number,
      tint: 'gold' | 'jade' = 'gold',
      duration: number = 0.24
    ) => {
      const pool = simRef.current.afterimages;
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].active) {
          pool[i].active = true;
          pool[i].assetUrl = assetUrl;
          pool[i].frameIndex = frameIndex;
          pool[i].x = x;
          pool[i].y = y;
          pool[i].targetHeight = targetHeight;
          pool[i].facing = facing;
          pool[i].elevationY = elevationY;
          pool[i].tint = tint;
          pool[i].maxLife = duration;
          pool[i].life = duration;
          return;
        }
      }
    },
    []
  );

  // Helper to spawn pooled isometric shockwave rings
  const spawnShockwave = useCallback(
    (x: number, y: number, maxRadius: number, color: string = '#ffd86b', duration: number = 0.38) => {
      const pool = simRef.current.shockwaves;
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].active) {
          pool[i].active = true;
          pool[i].x = x;
          pool[i].y = y;
          pool[i].radius = 12;
          pool[i].maxRadius = maxRadius;
          pool[i].color = color;
          pool[i].maxLife = duration;
          pool[i].life = duration;
          return;
        }
      }
    },
    []
  );

  const spawnFloatingText = useCallback(
    (
      x: number,
      y: number,
      text: string,
      color: string = '#f9e79f',
      scale: number = 1,
      subtext?: string
    ) => {
      const pool = simRef.current.floatingTexts;
      // Offset higher above character heads & stagger vertically if another callout is nearby so windups stay 100% readable
      let adjustedY = y - 16;
      for (let i = 0; i < pool.length; i++) {
        if (
          pool[i].active &&
          pool[i].life > 0.22 &&
          Math.abs(pool[i].x - x) < 76 &&
          Math.abs(pool[i].y - adjustedY) < 24
        ) {
          adjustedY = Math.min(adjustedY, pool[i].y - 20);
        }
      }

      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].active) {
          pool[i].active = true;
          pool[i].x = x + (Math.random() - 0.5) * 14;
          pool[i].y = adjustedY;
          pool[i].vx = (Math.random() - 0.5) * 28;
          pool[i].vy = -58 - Math.random() * 14;
          pool[i].text = text;
          pool[i].subtext = subtext;
          pool[i].color = color;
          pool[i].maxLife = 0.66;
          pool[i].life = 0.66;
          pool[i].scale = scale;
          return;
        }
      }
    },
    []
  );

  const createEnemyFromSpec = useCallback(
    (
      type: EnemyEntity['type'],
      normX: number,
      normY: number,
      canvasW: number,
      canvasH: number,
      trait?: EnemyTrait
    ): EnemyEntity => {
      const id = Math.floor(Math.random() * 1e9);
      const x = normX * canvasW;
      const y = normY * canvasH;

      if (type === 'xuemo') {
        return {
          id,
          type,
          name: 'DUNDUBHI, THE WAR-DRUM BEHEMOTH',
          chineseTitle: '3D VANGUARD · BAIT CHARGE INTO PILLARS TO CRACK ARMOR!',
          isBoss: true,
          armorCracked: false,
          x,
          y,
          vx: 0,
          vy: 0,
          facing: -1,
          hp: 2150,
          maxHp: 2150,
          displayHp: 2150,
          posture: 1950,
          maxPosture: 1950,
          postureBrokenTimer: 0,
          immobilizedTimer: 0,
          hitFlashTimer: 0,
          parryStanceTimer: 0,
          growthScale: 1.0,
          animTime: 0,
          aiState: 'idle',
          aiTimer: 0.75,
          windupDuration: 0.68,
          attackPattern: 0,
          attackKind: 'cone',
          aimAngle: Math.PI,
          corridorEndX: x - 260,
          corridorEndY: y,
          comboHitsRemaining: 0,
          slashArcAlpha: 0,
          telegraphRadius: 170,
          telegraphX: x,
          telegraphY: y,
          scaleX: 1,
          scaleY: 1,
          koTimer: 0,
          phase: 1,
          scorchTimer: 0,
          scorchTickAccum: 0,
        };
      }

      if (type === 'vrikodara') {
        return {
          id,
          type,
          name: 'VRIKODARA, THE IRON RAKSHASA',
          chineseTitle: '3D SOVEREIGN · WIELDER OF THE BLOODFORGED TRIDENT',
          isBoss: true,
          armorCracked: true,
          x,
          y,
          vx: 0,
          vy: 0,
          facing: -1,
          hp: 2750,
          maxHp: 2750,
          displayHp: 2750,
          posture: 2550,
          maxPosture: 2550,
          postureBrokenTimer: 0,
          immobilizedTimer: 0,
          hitFlashTimer: 0,
          parryStanceTimer: 0,
          growthScale: 1.0,
          animTime: 0,
          aiState: 'idle',
          aiTimer: 0.7,
          windupDuration: 0.62,
          attackPattern: 0,
          attackKind: 'cone',
          aimAngle: Math.PI,
          corridorEndX: x - 290,
          corridorEndY: y,
          comboHitsRemaining: 0,
          slashArcAlpha: 0,
          telegraphRadius: 192,
          telegraphX: x,
          telegraphY: y,
          scaleX: 1,
          scaleY: 1,
          koTimer: 0,
          phase: 1,
          scorchTimer: 0,
          scorchTickAccum: 0,
        };
      }

      const configs: Record<
        'wolf_guai' | 'fire_monk' | 'stone_golem' | 'furnace_titan',
        { name: string; zh: string; hp: number; posture: number; radius: number }
      > = {
        wolf_guai: {
          name: 'Vrika Stalker',
          zh: 'FLANKING PACK ASSASSIN',
          hp: 230,
          posture: 230,
          radius: 112,
        },
        fire_monk: {
          name: 'Agni Spearman',
          zh: 'BLAZING JAVELIN ZEALOT',
          hp: 260,
          posture: 250,
          radius: 132,
        },
        stone_golem: {
          name: 'Magma Shield-Golem',
          zh: 'PARRYING OBSIDIAN GUARD',
          hp: 390,
          posture: 360,
          radius: 148,
        },
        furnace_titan: {
          name: 'Furnace Colossus',
          zh: 'MOLTEN SIEGE JUGGERNAUT',
          hp: 490,
          posture: 420,
          radius: 168,
        },
      };

      const cfg = configs[type];
      const traitPrefix =
        trait === 'vajra_shield'
          ? '[SHIELDED] '
          : trait === 'agni_aura'
          ? '[AGNI-BORN] '
          : trait === 'rakshasa_frenzy'
          ? '[FRENZIED] '
          : '';
      const hpMult = trait ? 1.24 : 1.0;
      const finalHp = Math.round(cfg.hp * hpMult);
      const finalPosture = Math.round(cfg.posture * hpMult);

      return {
        id,
        type,
        trait,
        name: `${traitPrefix}${cfg.name}`,
        chineseTitle: cfg.zh,
        isBoss: false,
        x,
        y,
        vx: 0,
        vy: 0,
        facing: -1,
        hp: finalHp,
        maxHp: finalHp,
        displayHp: finalHp,
        posture: finalPosture,
        maxPosture: finalPosture,
        postureBrokenTimer: 0,
        immobilizedTimer: 0,
        hitFlashTimer: 0,
        parryStanceTimer: trait === 'vajra_shield' || type === 'stone_golem' ? 1.8 : 0,
        growthScale: 1.0,
        animTime: Math.random() * 5,
        aiState: 'chase',
        aiTimer: 0.85 + Math.random() * 0.55,
        windupDuration: trait === 'rakshasa_frenzy' ? 0.48 : 0.58,
        attackPattern: 0,
        attackKind: type === 'stone_golem' || type === 'furnace_titan' ? 'shockwave' : 'cone',
        aimAngle: Math.PI,
        corridorEndX: x,
        corridorEndY: y,
        comboHitsRemaining: 0,
        slashArcAlpha: 0,
        telegraphRadius: cfg.radius,
        telegraphX: x,
        telegraphY: y,
        scaleX: 1,
        scaleY: 1,
        koTimer: 0,
        phase: 1,
        scorchTimer: 0,
        scorchTickAccum: 0,
      };
    },
    []
  );

  // Helper to damage or shatter destructible 2.5D courtyard props (includes Hades environmental traps!)
  const damagePropsNearPoint = useCallback(
    (originX: number, originY: number, radius: number, damage: number) => {
      const sim = simRef.current;
      const p = sim.player;
      for (let i = 0; i < sim.props.length; i++) {
        const prop = sim.props[i];
        if (prop.destroyed) continue;
        const d = Math.hypot(prop.x - originX, (prop.y - originY) * 1.15);
        if (d <= radius) {
          prop.hp = Math.max(0, prop.hp - damage);
          prop.hitFlashTimer = 0.09;
          prop.shakeTimer = 0.22;
          const sparkColor =
            prop.type === 'incense_cauldron'
              ? '#ff7b24'
              : prop.type === 'pagoda_lantern'
              ? '#ffd86b'
              : prop.type === 'dragon_pillar'
              ? '#ff4d3b'
              : '#d6b47c';
          spawnParticles(prop.x, prop.y - 28, 12, sparkColor, 155, 3.8, 150);

          if (prop.hp <= 0) {
            prop.destroyed = true;
            sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.34);
            soundEngine.playHit('heavy');
            const blastRadius =
              prop.type === 'dragon_pillar'
                ? 175
                : prop.type === 'incense_cauldron'
                ? 160
                : 92;
            spawnShockwave(prop.x, prop.y, blastRadius, sparkColor, 0.42);
            spawnParticles(prop.x, prop.y - 32, 34, sparkColor, 240, 5.2, 170);
            spawnParticles(prop.x, prop.y - 20, 18, '#7a6f62', 180, 4.4, 190);
            sim.craters.push({
              x: prop.x,
              y: prop.y + 4,
              radius: prop.type === 'incense_cauldron' ? 76 : 56,
              alpha: 0.88,
              decalFrame: prop.type === 'incense_cauldron' ? 3 : 2,
              angle: (Math.random() - 0.5) * 0.6,
            });
            if (sim.craters.length > 12) sim.craters.shift();

            // Hades-Style Tactical Environmental Trap Damage:
            // Toppling a Kurukshetra Pillar or exploding a Homa Oil Cauldron crushes/scorches nearby foes!
            if (prop.type === 'dragon_pillar' || prop.type === 'incense_cauldron') {
              const envDmg = prop.type === 'dragon_pillar' ? 155 : 135;
              const envPosDmg = prop.type === 'dragon_pillar' ? 190 : 140;
              sim.enemies.forEach((foe) => {
                if (foe.aiState === 'ko') return;
                if (Math.hypot(foe.x - prop.x, foe.y - prop.y) <= blastRadius) {
                  foe.hp = Math.max(0, foe.hp - envDmg);
                  foe.hitFlashTimer = 0.14;
                  if (prop.type === 'incense_cauldron') {
                    foe.scorchTimer = Math.max(foe.scorchTimer, 4.5);
                  }
                  const posRes = applyPostureDamage({
                    currentPosture: foe.posture,
                    maxPosture: foe.maxPosture,
                    postureDamage: envPosDmg,
                    alreadyBroken: foe.postureBrokenTimer > 0,
                  });
                  foe.posture = posRes.nextPosture;
                  if (posRes.triggeredBreak) {
                    foe.postureBrokenTimer = 4.5;
                    foe.aiState = 'recover';
                    foe.aiTimer = 4.5;
                  }
                  spawnFloatingText(
                    foe.x,
                    foe.y - 74,
                    prop.type === 'dragon_pillar'
                      ? `PILLAR CRUSH! -${envDmg}`
                      : `AGNI OIL BLAST! -${envDmg}`,
                    '#ff9233',
                    1.18
                  );
                }
              });
            }

            sim.ashenKarma += 15;
            sim.karmaRunDelta += 15;
            sim.score += 90;
            p.focusProgress = Math.min(1, p.focusProgress + 0.25);
            if (p.focusProgress >= 1 && p.focusOrbs < 4) {
              p.focusProgress -= 1;
              p.focusOrbs += 1;
            }
            spawnFloatingText(
              prop.x,
              prop.y - 64,
              prop.type === 'dragon_pillar'
                ? 'PILLAR TOPPLED! +15 KARMA'
                : prop.type === 'incense_cauldron'
                ? 'CAULDRON DETONATED! +15 KARMA'
                : 'SHATTERED! +15 KARMA',
              '#ffd86b',
              0.98,
              '+25% FOCUS CHARGE'
            );
          }
        }
      }
    },
    [spawnFloatingText, spawnParticles, spawnShockwave]
  );

  // Load a specific chamber (0-indexed: 0..11)
  const loadChamber = useCallback(
    (index: number, resetFullRun: boolean = false) => {
      const sim = simRef.current;
      const clampedIdx = Math.max(0, Math.min(CHAMBERS.length - 1, index));
      const spec = CHAMBERS[clampedIdx];
      const cw = sim.viewportW || (typeof window !== 'undefined' ? window.innerWidth : 1440);
      const ch = sim.viewportH || (typeof window !== 'undefined' ? window.innerHeight : 900);
      const worldW = Math.round(cw * WORLD_SCALE);
      const worldH = Math.round(ch * WORLD_SCALE);

      const derived = computeDerivedPlayerStats(sim.ranks);

      sim.worldW = worldW;
      sim.worldH = worldH;
      sim.chamberIndex = clampedIdx;
      sim.chamberBannerTimer = 3.8;
      sim.chamberClearTimer = 0;
      sim.bossPhaseBanner = null;
      sim.cameraZoom = BASE_CAMERA_ZOOM + 0.03;
      sim.slowMoTimer = 0;
      sim.gateWipeTimer = 0.44;
      sim.chasmVaultCalloutCd = 0;
      sim.traps = createChamberTrapsRuntime(clampedIdx, worldW, worldH);
      sim.craters = [];
      sim.clones = [];
      sim.decoy.active = false;
      sim.afterimages.forEach((a) => {
        a.active = false;
      });
      sim.shockwaves.forEach((s) => {
        s.active = false;
      });
      sim.projectiles.forEach((p) => {
        p.active = false;
      });

      // Spawn player on open central-left sanctuary flagstones facing northeast toward the arena center
      sim.player.x = worldW * 0.34;
      sim.player.y = worldH * 0.56;
      sim.player.dashStartX = sim.player.x;
      sim.player.dashStartY = sim.player.y;
      sim.player.dashStreakAlpha = 0;
      sim.player.dashCharges = 2;
      sim.player.maxDashCharges = 2;
      sim.player.dashRechargeTimer = 0;
      sim.player.weaponSwingProgress = 0;
      sim.player.vx = 0;
      sim.player.vy = 0;
      sim.player.plumeLagX = -28;
      sim.player.plumeLagY = -8;
      sim.player.facing = 1;
      sim.player.action = 'idle';
      sim.player.actionTimer = 0;
      sim.player.elevationY = 0;
      sim.player.invulnTimer = 1.4;
      sim.player.walkDistance = 0;
      sim.player.lastFootstepDist = 0;
      sim.player.dashStrikeWindowTimer = 0;
      sim.lightningArcs = [];
      sim.slagFissures = [];
      sim.nearestLookObject = null;
      sim.activeLookObject = null;
      setActiveLookModal(null);

      // Center tracking camera smoothly on Wukong's starting sanctuary position
      const halfVisW = (cw * 0.5) / BASE_CAMERA_ZOOM;
      const halfVisH = (ch * 0.5) / BASE_CAMERA_ZOOM;
      const minCamX = Math.max(0, halfVisW - cw * 0.5);
      const maxCamX = Math.max(minCamX, worldW - halfVisW - cw * 0.5);
      const minCamY = Math.max(0, halfVisH - ch * 0.5);
      const maxCamY = Math.max(minCamY, worldH - halfVisH - ch * 0.5);
      sim.camX = Math.max(minCamX, Math.min(maxCamX, sim.player.x - cw * 0.5));
      sim.camY = Math.max(minCamY, Math.min(maxCamY, sim.player.y - ch * 0.5));

      if (resetFullRun) {
        sim.score = 0;
        sim.comboCount = 0;
        sim.karmaRunDelta = 0;
        sim.activeBoons = [];
        sim.boonReadyCount = 1;
        sim.boonRerollsRemaining = 2;
        setOwnedBoons([]);
        setBoonReadyCount(1);
        setBoonRerolls(2);
        setBoonModalOpen(false);
        sim.player.maxHp = derived.maxHp;
        sim.player.hp = derived.maxHp;
        sim.player.displayHp = derived.maxHp;
        sim.player.maxGourdSips = derived.maxGourdSips;
        sim.player.gourdSips = derived.maxGourdSips;
        sim.player.extraLives = derived.extraLives;
        sim.player.focusOrbs = derived.startingFocusOrbs;
        sim.player.focusProgress = 0.45;
        sim.player.immobilizeCd = 0;
        sim.player.parryCd = 0;
        sim.player.clonesCd = 0;
        sim.player.transformCd = 0;
        sim.player.transformTimer = 0;
      } else {
        const boonMods = computeBoonModifiers(sim.activeBoons);
        // Between chambers, replenish 1 Gourd sip and ensure minimum Starting Focus Orbs
        sim.player.maxHp = derived.maxHp;
        sim.player.hp = Math.min(derived.maxHp, sim.player.hp + 55);
        sim.player.displayHp = sim.player.hp;
        sim.player.maxGourdSips = derived.maxGourdSips + boonMods.gourdBonusMaxSips;
        sim.player.gourdSips = Math.min(sim.player.maxGourdSips, sim.player.gourdSips + 1);
        const astralBonus = sim.activeBoons.includes('subhuti_astral_qi') ? 1 : 0;
        sim.player.focusOrbs = Math.max(
          sim.player.focusOrbs,
          Math.min(4, derived.startingFocusOrbs + astralBonus)
        );
      }

      // Populate Y-sorted destructible 2.5D temple courtyard props for this chamber
      const propFrameMap: Record<PropType, 0 | 1 | 2 | 3> = {
        incense_cauldron: 0,
        pagoda_lantern: 1,
        weapon_rack: 2,
        dragon_pillar: 3,
      };
      const propHpMap: Record<PropType, number> = {
        incense_cauldron: 75,
        pagoda_lantern: 65,
        weapon_rack: 55,
        dragon_pillar: 110,
      };
      sim.props = (spec.props || []).map((pr, idx) => ({
        id: idx + 1,
        type: pr.type,
        frameIndex: propFrameMap[pr.type],
        x: pr.x * worldW,
        y: pr.y * worldH,
        hp: propHpMap[pr.type],
        maxHp: propHpMap[pr.type],
        hitFlashTimer: 0,
        shakeTimer: 0,
        destroyed: false,
      }));

      sim.enemies = [];
      sim.pendingSpawns = [];
      sim.summoningRifts = [];
      sim.currentWave = 1;
      sim.maxWave = Math.max(1, ...spec.spawns.map((s) => s.wave || 1));
      sim.waveQueue = [];

      spec.spawns.forEach((s) => {
        const waveNum = s.wave || 1;
        if (waveNum === 1) {
          if (s.delay && s.delay > 0) {
            sim.pendingSpawns.push({
              type: s.type,
              x: s.x,
              y: s.y,
              timer: s.delay,
              trait: s.trait,
            });
          } else {
            sim.enemies.push(createEnemyFromSpec(s.type, s.x, s.y, worldW, worldH, s.trait));
          }
        } else {
          sim.waveQueue.push({
            type: s.type,
            x: s.x,
            y: s.y,
            delay: s.delay || 0.2,
            wave: waveNum,
            trait: s.trait,
          });
        }
      });

      soundEngine.playGong('chamber');
    },
    [createEnemyFromSpec]
  );

  // Start or restart game
  const startGameAtChamber = useCallback(
    (chamberIndex: number = 0) => {
      const sim = simRef.current;
      sim.state = 'playing';
      document.body.dataset.state = 'playing';
      setGameState('playing');
      setOutcomeMode('none');
      setShrineOpen(false);
      setStoryOpen(false);
      setControlsOpen(false);
      setBoonModalOpen(false);
      setSliceStage('combat_arena');
      sim.storyFlags = loadStoryMemoryFlags();
      sim.input.keysHeld.clear();
      sim.input.justPressed.clear();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      loadChamber(chamberIndex, true);
      soundEngine.startMusic();
    },
    [loadChamber]
  );

  // Hades-Style Celestial Boon Altar Handlers
  const openBoonAltar = useCallback(() => {
    const sim = simRef.current;
    if (sim.boonReadyCount <= 0) return;
    const offer = rollCelestialBoonOffer(sim.activeBoons);
    if (offer.length === 0) {
      sim.boonReadyCount = 0;
      setBoonReadyCount(0);
      return;
    }
    setBoonChoices(offer);
    setBoonModalOpen(true);
    soundEngine.playGong('chamber');
  }, []);

  const handleSelectBoon = useCallback(
    (boonId: CelestialBoonId) => {
      const sim = simRef.current;
      if (!sim.activeBoons.includes(boonId)) {
        sim.activeBoons.push(boonId);
      }
      sim.boonReadyCount = Math.max(0, sim.boonReadyCount - 1);
      setOwnedBoons([...sim.activeBoons]);
      setBoonReadyCount(sim.boonReadyCount);
      setBoonModalOpen(false);

      const p = sim.player;
      if (boonId === 'guanyin_ambrosia_gourd') {
        p.maxGourdSips += 1;
        p.gourdSips += 1;
      } else if (boonId === 'subhuti_astral_qi') {
        p.focusOrbs = Math.min(4, p.focusOrbs + 1);
      }

      const boonDef = getBoonById(boonId);
      soundEngine.playSpell('gourd');
      spawnShockwave(p.x, p.y, 145, '#ffd86b', 0.42);
      spawnParticles(p.x, p.y - 30, 28, '#ffd86b', 180, 4.5, 40);
      if (boonDef) {
        const patron = IMMORTAL_PATRONS[boonDef.patronId];
        spawnFloatingText(
          p.x,
          p.y - 88,
          `BOON CLAIMED: ${boonDef.name.toUpperCase()}`,
          patron.accentColor,
          1.2,
          patron.name
        );
      }

      // If another Boon/Astra is still queued, present the next choice immediately; otherwise advance if chamber is cleared
      const totalRemaining = sim.enemies.length + sim.pendingSpawns.length;
      if (sim.boonReadyCount > 0 && totalRemaining === 0 && sim.chamberClearTimer > 0) {
        const nextOffer = rollCelestialBoonOffer(sim.activeBoons);
        if (nextOffer.length > 0) {
          setBoonChoices(nextOffer);
          setBoonModalOpen(true);
          sim.modalPaused = true;
          return;
        } else {
          sim.boonReadyCount = 0;
          setBoonReadyCount(0);
        }
      }

      if (
        totalRemaining === 0 &&
        sim.chamberClearTimer > 0 &&
        sim.chamberIndex < CHAMBERS.length - 1
      ) {
        loadChamber(sim.chamberIndex + 1, false);
      }
    },
    [loadChamber, spawnFloatingText, spawnParticles, spawnShockwave]
  );

  const handleRerollBoons = useCallback(() => {
    const sim = simRef.current;
    if (sim.boonRerollsRemaining <= 0) return;
    sim.boonRerollsRemaining -= 1;
    setBoonRerolls(sim.boonRerollsRemaining);
    const offer = rollCelestialBoonOffer(sim.activeBoons);
    setBoonChoices(offer);
    soundEngine.playSpell('immobilize');
  }, []);

  // Preload all chamber backgrounds and character sprite sheets on mount
  const bgImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const chParam = Number(params.get('chamber'));
      if (params.get('autostart') === '1') {
        const startIdx =
          Number.isFinite(chParam) && chParam >= 1 && chParam <= CHAMBERS.length ? chParam - 1 : 0;
        requestAnimationFrame(() => startGameAtChamber(startIdx));
      } else {
        document.body.dataset.state = 'title';
      }
    }

    const loadBgWithRetry = (url: string, attempt = 0) => {
      if (bgImagesRef.current.has(url)) {
        const existing = bgImagesRef.current.get(url)!;
        if (existing.complete && existing.naturalWidth > 0) return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onerror = () => {
        if (attempt < 3) {
          window.setTimeout(() => loadBgWithRetry(url, attempt + 1), 700 * (attempt + 1));
        }
      };
      img.src = url;
      bgImagesRef.current.set(url, img);
    };

    CHAMBERS.forEach((c) => {
      loadBgWithRetry(c.backgroundUrl);
      if (c.unlockedBackgroundUrl) {
        loadBgWithRetry(c.unlockedBackgroundUrl);
      }
      if (c.phase2BackgroundUrl) {
        loadBgWithRetry(c.phase2BackgroundUrl);
      }
    });

    // Preload bespoke Kaliyuga single-pose character, boss, and enemy sprites
    const kaliyugaSingleSprites: string[] = [
      ...Object.values(GAME_ASSETS.rudra),
      ...Object.values(GAME_ASSETS.enemies),
      ...Object.values(GAME_ASSETS.dundubhi),
      ...Object.values(GAME_ASSETS.vrikodara),
    ];

    kaliyugaSingleSprites.forEach((url) => {
      loadAndProcessSprite(url, {
        removeBlackBg: true,
        stripCornerWatermark: true,
        frameCount: 1,
        mode: 'character',
        gridLayout: '1xN',
      });
    });

    // Preload 5 bespoke 3D architectural prop sprites with 'prop' mode to preserve full aspect ratio
    Object.values(GAME_ASSETS.kaliyugaProps).forEach((url) => {
      loadAndProcessSprite(url, {
        removeBlackBg: true,
        stripCornerWatermark: true,
        frameCount: 1,
        mode: 'prop',
        gridLayout: '1xN',
      });
    });

    // Preload 4-Frame 4x1 Enemy Sprite Sheets (Combining Previous + Newly Uploaded 4x1 Sheets!)
    const fourFrameEnemySheets: string[] = [
      GAME_ASSETS.enemySheets.sharabhaHoundSheet4x1,
      GAME_ASSETS.enemySheets.pretaBowmanSheet4x1,
      GAME_ASSETS.enemySheets.rakshasaMaceSheet4x1,
      GAME_ASSETS.enemySheets.vrikaStalkerSheet4x1,
      GAME_ASSETS.enemySheets.agniSpearmanSheet4x1,
      GAME_ASSETS.enemySheets.magmaGolemSheet4x1,
      GAME_ASSETS.enemySheets.furnaceColossusSheet4x1,
    ];
    fourFrameEnemySheets.forEach((url) => {
      loadAndProcessSprite(url, {
        removeBlackBg: true,
        stripCornerWatermark: true,
        frameCount: 4,
        mode: 'character',
        gridLayout: '1xN',
      });
    });

    // Preload 2x2 Kaliyuga Cosmic 4-Armed Avatar Sheet
    loadAndProcessSprite(GAME_ASSETS.enemySheets.kaliyugaAvatarSheet2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'character',
      gridLayout: '2x2',
    });

    // Preload 4x1 Animated Roaring Agni Brazier Flame Flipbook
    loadAndProcessSprite(GAME_ASSETS.brazierFlame4x1, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'vfx',
      gridLayout: '1xN',
    });

    // Load ground telegraphs, weapon slashes, combat impacts, floor traps, exit gates, orbs & overhangs
    loadAndProcessSprite(GAME_ASSETS.groundDecals2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'vfx',
      gridLayout: '2x2',
    });
    loadAndProcessSprite(GAME_ASSETS.vfxSlash2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'vfx',
      gridLayout: '2x2',
    });
    loadAndProcessSprite(GAME_ASSETS.combatImpacts2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'vfx',
      gridLayout: '2x2',
    });
    loadAndProcessSprite(GAME_ASSETS.floorTraps2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'prop',
      gridLayout: '2x2',
    });
    loadAndProcessSprite(GAME_ASSETS.exitGateArchways2x1, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 2,
      mode: 'prop',
      gridLayout: '1xN',
    });
    loadAndProcessSprite(GAME_ASSETS.gateOverlays2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'vfx',
      gridLayout: '2x2',
    });
    loadAndProcessSprite(GAME_ASSETS.rewardOrbs2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'vfx',
      gridLayout: '2x2',
    });
    loadAndProcessSprite(GAME_ASSETS.foregroundOverhangsA2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'prop',
      gridLayout: '2x2',
    });
    loadAndProcessSprite(GAME_ASSETS.foregroundOverhangsB2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'prop',
      gridLayout: '2x2',
    });

    // Expose frozen read-only diagnostic hook when not in strict production lock
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      (
        window as unknown as {
          __KALIYUGA_TEST__?: {
            startGameAtChamber: (idx: number) => void;
            getSnapshot: () => unknown;
          };
        }
      ).__KALIYUGA_TEST__ = Object.freeze({
        startGameAtChamber,
        getSnapshot: () =>
          Object.freeze({
            state: simRef.current.state,
            chamberIndex: simRef.current.chamberIndex,
            player: Object.freeze({ ...simRef.current.player }),
            wukongGoldFrames: getProcessedSpriteSync(GAME_ASSETS.rudra.idle)?.frames ?? null,
            wukongActionFrames: getProcessedSpriteSync(GAME_ASSETS.rudra.slash1)?.frames ?? null,
            propsFrames: getProcessedSpriteSync(GAME_ASSETS.kaliyugaProps.kurukshetraPillar)?.frames ?? null,
            intactProps: simRef.current.props.filter((pr) => !pr.destroyed).length,
            totalProps: simRef.current.props.length,
            enemies: simRef.current.enemies.map((e) =>
              Object.freeze({
                name: e.name,
                hp: e.hp,
                posture: e.posture,
                aiState: e.aiState,
                attackKind: e.attackKind,
                phase: e.phase,
              })
            ),
          }),
      });
    }

    return () => {
      soundEngine.stopMusic();
    };
  }, [startGameAtChamber]);

  // Action triggers (callable from keyboard, mouse, or HUD buttons)
  const triggerGourdHeal = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing') return;
    if (p.gourdSips <= 0) {
      spawnFloatingText(p.x, p.y - 70, 'AMRITA KALASHA EMPTY!', '#ff6b78', 0.9);
      return;
    }
    p.gourdSips -= 1;
    const boonMods = computeBoonModifiers(sim.activeBoons);
    const healRatio = 0.42 * (1 + boonMods.gourdInstantHealRatio);
    const heal = Math.round(p.maxHp * healRatio);
    p.hp = Math.min(p.maxHp, p.hp + heal);
    p.action = 'gourd';
    p.actionTimer = 0.42;
    p.actionDuration = 0.42;
    soundEngine.playSpell('gourd');
    spawnShockwave(p.x, p.y, 85, '#ffd86b', 0.35);
    spawnParticles(p.x, p.y - 30, 22, '#ffd86b', 130, 4.5, -60);
    spawnFloatingText(p.x, p.y - 75, `+${heal} HP · AMRITA KALASHA`, '#ffd86b', 1.1);
  }, [spawnFloatingText, spawnParticles, spawnShockwave]);

  const triggerSwitchStance = useCallback(
    (targetStance?: StaffStance) => {
      const sim = simRef.current;
      const p = sim.player;
      const next = targetStance ?? getNextStaffStance(p.stance);
      p.stance = next;
      const cfg = STANCE_CONFIGS[next];
      spawnShockwave(p.x, p.y, 64, '#f2c45a', 0.28);
      spawnParticles(p.x, p.y - 25, 10, '#f2c45a', 95, 3.5, 40);
      spawnFloatingText(p.x, p.y - 72, `${cfg.chineseName} · ${cfg.englishName.toUpperCase()}`, '#f2c45a', 1.0);
    },
    [spawnFloatingText, spawnParticles, spawnShockwave]
  );

  const triggerSwitchWeapon = useCallback(
    (weapon: WeaponId) => {
      const sim = simRef.current;
      const p = sim.player;
      p.weapon = weapon;
      const cfg = WEAPON_CONFIGS[weapon];
      spawnShockwave(p.x, p.y, 68, cfg.accentColor, 0.28);
      spawnParticles(p.x, p.y - 25, 10, cfg.accentColor, 95, 3.5, 40);
      spawnFloatingText(p.x, p.y - 72, `${cfg.chineseName} · ${cfg.englishName}`, cfg.accentColor, 0.95);
    },
    [spawnFloatingText, spawnParticles, spawnShockwave]
  );

  const triggerImmobilizeSpell = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing' || p.immobilizeCd > 0) return;
    const boonMods = computeBoonModifiers(sim.activeBoons);
    p.immobilizeCd = Number((7.5 * boonMods.spellCooldownMultiplier).toFixed(2));
    p.action = 'astra';
    p.actionTimer = 0.42;
    p.actionDuration = 0.42;
    soundEngine.playSpell('immobilize');
    spawnShockwave(p.x, p.y, 195, '#ff5e36', 0.40);

    // Fire Hades-Style Agneyastra Blood-Shard Cast Projectile toward cursor or nearest enemy!
    let aimX = sim.input.pointerX;
    let aimY = sim.input.pointerY;
    let nearestDist = 9999;
    sim.enemies.forEach((e) => {
      if (e.aiState === 'ko') return;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < nearestDist && d < 520) {
        nearestDist = d;
        aimX = e.x;
        aimY = e.y - 20;
      }
    });
    const castAngle = Math.atan2(aimY - p.y, aimX - p.x);
    p.facing = Math.cos(castAngle) >= 0 ? 1 : -1;
    const stats = computeDerivedPlayerStats(sim.ranks);

    const castProj = sim.projectiles.find((pr) => !pr.active);
    if (castProj) {
      castProj.active = true;
      castProj.x = p.x + Math.cos(castAngle) * 28;
      castProj.y = p.y - 24 + Math.sin(castAngle) * 18;
      castProj.vx = Math.cos(castAngle) * 640;
      castProj.vy = Math.sin(castAngle) * 640;
      castProj.radius = 15;
      castProj.damage = Math.round(92 * stats.damageMultiplier * boonMods.damageMultiplier);
      castProj.color = '#ff2a4b';
      castProj.life = 1.8;
      castProj.deflected = true;
      castProj.isPlayerCast = true;
    }

    let hitCount = 0;
    sim.enemies.forEach((e) => {
      if (e.aiState === 'ko') return;
      const dist = Math.hypot(e.x - p.x, e.y - p.y);
      if (dist <= 390) {
        const astraDmg = Math.round(78 * stats.damageMultiplier * boonMods.damageMultiplier);
        e.hp = Math.max(0, e.hp - astraDmg);
        e.immobilizedTimer = e.isBoss ? 3.2 : 4.2;
        e.scorchTimer = Math.max(e.scorchTimer, 3.5);
        e.lodgedCasts = Math.min(3, (e.lodgedCasts || 0) + 1);
        e.hitFlashTimer = 0.10;
        hitCount++;
        spawnShockwave(e.x, e.y, 96, '#ff2a4b', 0.38);
        spawnParticles(e.x, e.y - 40, 24, '#ff5e36', 165, 4.8, 20);
        spawnFloatingText(
          e.x,
          e.y - 85,
          `BLOOD-SHARD LODGED -${astraDmg}! (+${Math.round(boonMods.castLodgedDamageBonus * 100)}% DMG TAKEN)`,
          '#ffd45e',
          1.12
        );
      }
    });

    if (hitCount === 0) {
      spawnFloatingText(p.x, p.y - 75, 'AGNEYASTRA · BLOOD-SHARD CAST!', '#ff5e36', 0.98);
    }
  }, [spawnFloatingText, spawnParticles, spawnShockwave]);

  const triggerRockSolidParry = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing' || p.parryCd > 0) return;
    const boonMods = computeBoonModifiers(sim.activeBoons);
    p.parryCd = Number((6.5 * boonMods.spellCooldownMultiplier).toFixed(2));
    p.action = 'parry';
    p.actionTimer = 0.65;
    p.actionDuration = 0.65;
    p.invulnTimer = Math.max(p.invulnTimer, 0.65);
    soundEngine.playSpell('parry');
    spawnShockwave(p.x, p.y, 96, '#f5ebd6', 0.32);
    spawnParticles(p.x, p.y - 30, 18, '#e8d8b8', 110, 4, 80);
    spawnFloatingText(p.x, p.y - 75, 'KALARIPAYATTU · IRON DEFLECT!', '#f5ebd6', 1.05);
  }, [spawnFloatingText, spawnParticles, spawnShockwave]);

  const triggerPluckOfManyClones = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing' || p.clonesCd > 0) return;
    const boonMods = computeBoonModifiers(sim.activeBoons);
    p.clonesCd = Number((14.0 * boonMods.spellCooldownMultiplier).toFixed(2));
    soundEngine.playSpell('clones');
    spawnShockwave(p.x, p.y, 130, '#ffcf66', 0.38);

    const offsets = [
      { dx: -52, dy: -24 },
      { dx: 52, dy: 24 },
    ];
    offsets.forEach((off, idx) => {
      sim.clones.push({
        id: Date.now() + idx,
        x: p.x + off.dx,
        y: p.y + off.dy,
        facing: p.facing,
        life: 12.0,
        maxLife: 12.0,
        attackCooldown: 0.25 + idx * 0.2,
        animTime: idx * 1.5,
      });
      spawnAfterimage(
        GAME_ASSETS.rudra.slash1,
        0,
        p.x + off.dx,
        p.y + off.dy,
        92,
        p.facing,
        0,
        'gold',
        0.32
      );
      spawnParticles(p.x + off.dx, p.y + off.dy - 20, 20, '#ffcf66', 140, 4.5, 40);
    });
    spawnFloatingText(p.x, p.y - 82, 'MAYA ASTRA · ASHEN PHANTOMS!', '#ffcf66', 1.15);
  }, [spawnAfterimage, spawnFloatingText, spawnParticles, spawnShockwave]);

  // v7 Section 5 & 31: One-Button [E] Look System (pauses nothing in combat; cuts music to room tone; awards Ashen Karma; records Look flag)
  const triggerLookOrMirage = useCallback(() => {
    const sim = simRef.current;
    if (sim.state !== 'playing') return;

    if (sim.activeLookObject) {
      sim.activeLookObject = null;
      setActiveLookModal(null);
      return;
    }

    if (sim.nearestLookObject) {
      const lookObj = sim.nearestLookObject;
      sim.activeLookObject = lookObj;
      setActiveLookModal(lookObj);
      soundEngine.playLookRoomTone();
      soundEngine.playSuvarnaLullaby();

      const alreadyInspected = sim.storyFlags.looks.includes(lookObj.id);
      if (!alreadyInspected) {
        const nextLooks = [...sim.storyFlags.looks, lookObj.id];
        updateStoryFlags({ looks: nextLooks });
        sim.ashenKarma += lookObj.karmaReward;
        sim.karmaRunDelta += lookObj.karmaReward;
        setAshenKarma(sim.ashenKarma);
        try {
          window.localStorage.setItem(
            'kaliyuga_save_v1',
            JSON.stringify({ ashenKarma: sim.ashenKarma, ranks: sim.ranks })
          );
        } catch {}
        spawnFloatingText(
          sim.player.x,
          sim.player.y - 92,
          `[LOOK] ${lookObj.title.toUpperCase()} (+${lookObj.karmaReward} KARMA)`,
          '#ffd86b',
          1.18,
          `LOOKS RECORDED: ${nextLooks.length}/6`
        );
      } else {
        spawnFloatingText(
          sim.player.x,
          sim.player.y - 88,
          `[LOOK] ${lookObj.title.toUpperCase()}`,
          '#f3e5ab',
          1.05
        );
      }
      return;
    }

    triggerPluckOfManyClones();
  }, [spawnFloatingText, triggerPluckOfManyClones, updateStoryFlags]);

  const triggerRedTidesTransform = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing' || p.transformCd > 0) return;
    const boonMods = computeBoonModifiers(sim.activeBoons);
    p.transformCd = Number((18.0 * boonMods.spellCooldownMultiplier).toFixed(2));
    p.transformTimer = 10.0;
    p.invulnTimer = Math.max(p.invulnTimer, 0.8);
    sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.45);
    sim.cameraZoom = BASE_CAMERA_ZOOM + 0.06;
    // v7 Section 13 & 27: Using Rudra-Kopa Rage dims Savitri's Lantern on the boat
    updateStoryFlags({ rageUses: sim.storyFlags.rageUses + 1 });
    soundEngine.playSpell('transform');
    spawnShockwave(p.x, p.y, 195, '#ff5924', 0.45);
    spawnParticles(p.x, p.y - 30, 32, '#ff5924', 210, 5.5, 60);
    spawnFloatingText(p.x, p.y - 88, 'RUDRA-KOPA AWAKENED! · LANTERN FLAME FLICKERS', '#ff6a33', 1.15);
  }, [spawnFloatingText, spawnParticles, spawnShockwave, updateStoryFlags]);

  const triggerExecuteBrokenTarget = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing') return;

    const brokenEnemy = sim.enemies.find(
      (e) => e.aiState !== 'ko' && e.postureBrokenTimer > 0
    );
    if (!brokenEnemy) return;

    // Spawn golden dash afterimages along the teleport-lunge path
    for (let step = 0; step < 3; step++) {
      const t = step / 3;
      spawnAfterimage(
        GAME_ASSETS.rudra.slam,
        0,
        p.x + (brokenEnemy.x - p.x) * t,
        p.y + (brokenEnemy.y - p.y) * t,
        96,
        brokenEnemy.x >= p.x ? 1 : -1,
        10 * Math.sin(t * Math.PI),
        'gold',
        0.26 + step * 0.05
      );
    }

    // Teleport-lunge next to the Posture-Broken target and deliver fatal Execute
    p.facing = brokenEnemy.x >= p.x ? 1 : -1;
    p.x = brokenEnemy.x - p.facing * 48;
    p.y = brokenEnemy.y + 6;
    p.action = 'execute';
    p.actionTimer = 0.36;
    p.actionDuration = 0.36;
    // Extended Invulnerability Frames (1.15s) so Rudra can NEVER take swarm damage during or right after an Execute!
    p.invulnTimer = Math.max(p.invulnTimer, 1.15);
    p.scaleX = 1.05;
    p.scaleY = 0.96;
    p.slashAngle = p.facing === 1 ? 0 : Math.PI;
    p.slashArcAlpha = 1.0;
    p.weaponSwingProgress = 0.0;

    const stats = computeDerivedPlayerStats(sim.ranks);
    const execDmg = Math.round((brokenEnemy.isBoss ? 360 : 290) * stats.damageMultiplier);
    brokenEnemy.hp = Math.max(0, brokenEnemy.hp - execDmg);
    brokenEnemy.postureBrokenTimer = 0;
    brokenEnemy.posture = brokenEnemy.maxPosture;
    brokenEnemy.hitFlashTimer = 0.14;
    brokenEnemy.scaleX = 1.06;
    brokenEnemy.scaleY = 0.94;

    // Radial Prana Shockwave: staggers & knocks back all nearby enemies within 225px and vaporizes incoming projectiles!
    sim.enemies.forEach((other) => {
      if (other === brokenEnemy || other.aiState === 'ko') return;
      const distToExec = Math.hypot(other.x - brokenEnemy.x, other.y - brokenEnemy.y);
      if (distToExec <= 225) {
        const pushAngle = Math.atan2(other.y - brokenEnemy.y, other.x - brokenEnemy.x);
        const pushMag = other.isBoss ? 110 : 240;
        other.vx += Math.cos(pushAngle) * pushMag;
        other.vy += Math.sin(pushAngle) * pushMag;
        other.hitFlashTimer = 0.1;
        if (!other.isBoss) {
          other.aiState = 'recover';
          other.aiTimer = Math.max(other.aiTimer, 0.85);
        }
      }
    });
    sim.projectiles.forEach((proj) => {
      if (proj.active && Math.hypot(proj.x - brokenEnemy.x, proj.y - brokenEnemy.y) <= 230) {
        proj.active = false;
      }
    });

    sim.hitstopTimer = 0.075;
    sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.72);
    sim.cameraZoom = BASE_CAMERA_ZOOM + 0.055;
    sim.screenFlashAlpha = 0.22;
    sim.screenFlashColor = '#ff3824';
    sim.comboCount += 3;
    sim.comboResetTimer = 4.5;
    sim.score += 450;

    // Stamp molten cone slash decal at execution site
    sim.craters.push({
      x: brokenEnemy.x,
      y: brokenEnemy.y + 6,
      radius: 78,
      alpha: 0.92,
      decalFrame: 1,
      angle: p.slashAngle,
    });
    if (sim.craters.length > 10) sim.craters.shift();

    // Grant +1 Focus Orb and heal 28 HP on Execute
    p.hp = Math.min(p.maxHp, p.hp + 28);
    if (p.focusOrbs < 4) {
      p.focusOrbs = Math.min(4, p.focusOrbs + 1);
    }

    soundEngine.playHit('execute');
    spawnShockwave(brokenEnemy.x, brokenEnemy.y, 225, '#ff4d3b', 0.44);
    spawnParticles(brokenEnemy.x, brokenEnemy.y - 35, 36, '#ff3b24', 240, 5.5, 160);
    spawnParticles(brokenEnemy.x, brokenEnemy.y - 35, 20, '#ffd86b', 200, 4.5, 100);
    spawnFloatingText(
      brokenEnemy.x,
      brokenEnemy.y - 96,
      `EXECUTE -${execDmg}`,
      '#ff4d3b',
      1.25
    );
  }, [spawnAfterimage, spawnFloatingText, spawnParticles, spawnShockwave]);

  const triggerStanceHeavyUnleash = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing') return;
    if (p.action === 'heavy_unleash' && p.actionTimer > 0.1) {
      sim.input.bufferedAction = 'heavy';
      sim.input.bufferTimer = 0.16;
      return;
    }

    const boonMods = computeBoonModifiers(sim.activeBoons);
    const orbsUsed = p.focusOrbs;
    p.focusOrbs = 0;
    p.focusProgress = 0;
    p.action = 'heavy_unleash';
    p.actionDuration = 0.44;
    p.actionTimer = 0.44;
    p.scaleX = 0.94;
    p.scaleY = 1.07;
    p.weaponSwingProgress = 0.0;

    if (p.stance === 'pillar') {
      p.elevationY = 38;
      p.invulnTimer = Math.max(p.invulnTimer, 0.42);
    }

    const dx = sim.input.pointerX - p.x;
    const dy = sim.input.pointerY - p.y;
    if (Math.abs(dx) > 4) p.facing = dx >= 0 ? 1 : -1;
    p.slashAngle = Math.atan2(dy, dx);
    p.slashArcAlpha = 1.0;

    // Lunge slightly toward cursor
    const dist = Math.hypot(dx, dy) || 1;
    const lungeDist = p.stance === 'thrust' ? 84 : p.stance === 'smash' ? 54 : 18;
    p.vx = (dx / dist) * lungeDist * 4.5;
    p.vy = (dy / dist) * lungeDist * 4.5;

    spawnAfterimage(
      GAME_ASSETS.rudra.slam,
      0,
      p.x,
      p.y,
      96,
      p.facing,
      p.elevationY,
      'gold',
      0.32
    );
    spawnShockwave(p.x + p.facing * 38, p.y, 130 + orbsUsed * 22, '#ffaa33', 0.38);
    sim.cameraZoom = BASE_CAMERA_ZOOM + 0.045;

    const stanceCfg = STANCE_CONFIGS[p.stance];
    const isResolute = sim.enemies.some(
      (e) =>
        e.aiState === 'windup' &&
        Math.hypot(e.x - p.x, e.y - p.y) <= stanceCfg.rangePx + 45
    );

    const dmg = calculateStanceHeavyDamage({
      stance: p.stance,
      focusOrbsConsumed: orbsUsed,
      weapon: p.weapon,
      ranks: sim.ranks,
      isResoluteCounter: isResolute,
    });

    if (orbsUsed > 0 && dmg.healAmount > 0) {
      p.hp = Math.min(p.maxHp, p.hp + dmg.healAmount);
    }

    // Ao Guang Boon: Dragon King's Vortex pulls enemies within 260px inward!
    if (boonMods.heavyVortexPull) {
      const vortexCenterX = p.x + Math.cos(p.slashAngle) * 52;
      const vortexCenterY = p.y + Math.sin(p.slashAngle) * 32;
      spawnShockwave(vortexCenterX, vortexCenterY, 220, '#38bdf8', 0.42);
      sim.enemies.forEach((e) => {
        if (e.aiState === 'ko') return;
        const vDist = Math.hypot(e.x - vortexCenterX, e.y - vortexCenterY);
        if (vDist <= 265 && vDist > 24) {
          const pullFactor = e.isBoss ? 0.35 : 0.65;
          e.x += (vortexCenterX - e.x) * pullFactor;
          e.y += (vortexCenterY - e.y) * pullFactor;
        }
      });
    }

    // Stamp hand-painted ground decal (Frame 1: Molten Gold Cone Crack for Smash/Thrust, Frame 2: Stone Spike Ring for Pillar)
    sim.craters.push({
      x: p.x + Math.cos(p.slashAngle) * (p.stance === 'thrust' ? 74 : 42),
      y: p.y + Math.sin(p.slashAngle) * 28 + 8,
      radius: 64 + orbsUsed * 14,
      alpha: 0.94,
      decalFrame: p.stance === 'pillar' ? 2 : 1,
      angle: p.slashAngle,
    });
    if (sim.craters.length > 10) sim.craters.shift();

    // v7 Section 9 & 29: Rakshasa Crushing Stance (Smash Stance heavy attacks send a forward line of molten slag fissures!)
    if (p.stance === 'smash') {
      const fissureLen = sim.storyFlags.rakshasaStanceUnlocked ? 250 : 175;
      sim.slagFissures.push({
        x1: p.x + Math.cos(p.slashAngle) * 28,
        y1: p.y + Math.sin(p.slashAngle) * 20,
        x2: p.x + Math.cos(p.slashAngle) * fissureLen,
        y2: p.y + Math.sin(p.slashAngle) * fissureLen * 0.78,
        width: sim.storyFlags.rakshasaStanceUnlocked ? 34 : 24,
        life: 3.5,
        maxLife: 3.5,
      });
    }

    // Shatter destructible courtyard props in heavy stance range
    damagePropsNearPoint(p.x + p.facing * 36, p.y, stanceCfg.rangePx, 120);

    soundEngine.playSwing('heavy');
    let hitAny = false;

    sim.enemies.forEach((e) => {
      if (e.aiState === 'ko') return;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d <= stanceCfg.rangePx + (e.isBoss ? 48 : 28)) {
        hitAny = true;
        const backstab = isShadowStrikeBackstab({
          playerX: p.x,
          enemyX: e.x,
          enemyFacing: e.facing,
        });
        const backstabMult = backstab ? boonMods.backstabMultiplier : 1.0;
        const dundubhiArmorMult =
          e.type === 'xuemo' && !e.armorCracked ? 0.55 : 1.0;
        const lodgedCastMult = 1 + (e.lodgedCasts || 0) * boonMods.castLodgedDamageBonus;
        const mult =
          (p.transformTimer > 0 ? 1.3 : 1.0) *
          boonMods.heavyBonusMultiplier *
          backstabMult *
          dundubhiArmorMult *
          lodgedCastMult;
        const hpLoss = Math.round(dmg.hpDamage * mult * (1 + boonMods.echoStrikeRatio));
        const posLoss = Math.round(dmg.postureDamage * mult * boonMods.postureDamageMultiplier);

        // Heavy Unleash shatters active Enemy Guard / Vajra Shields!
        const brokeGuard = e.parryStanceTimer > 0 || e.trait === 'vajra_shield';
        e.parryStanceTimer = 0;

        e.hp = Math.max(0, e.hp - hpLoss);
        e.hitFlashTimer = 0.09;
        e.scaleX = 1.05;
        e.scaleY = 0.95;

        if (boonMods.scorchDps > 0) {
          e.scorchTimer = 3.0;
        }

        // Knockback impulse
        const kAngle = Math.atan2(e.y - p.y, e.x - p.x);
        const kb = e.isBoss ? 75 : 175;
        e.vx += Math.cos(kAngle) * kb;
        e.vy += Math.sin(kAngle) * kb;

        const posResult = applyPostureDamage({
          currentPosture: e.posture,
          maxPosture: e.maxPosture,
          postureDamage: brokeGuard ? Math.round(posLoss * 1.45) : posLoss,
          alreadyBroken: e.postureBrokenTimer > 0,
        });
        e.posture = posResult.nextPosture;
        if (posResult.triggeredBreak) {
          e.postureBrokenTimer = 4.5;
          e.aiState = 'recover';
          e.aiTimer = 4.5;
          spawnShockwave(e.x, e.y, 145, '#ff4d3b', 0.42);
          spawnFloatingText(
            e.x,
            e.y - 88,
            'POSTURE BROKEN! [F] EXECUTE',
            '#ff4d3b',
            1.22
          );
        }

        spawnParticles(e.x, e.y - 26, 26, '#ff9838', 220, 4.8, 150);
        spawnFloatingText(
          e.x,
          e.y - 58,
          isResolute ? `COUNTER ${hpLoss}!` : brokeGuard ? `GUARD CRUSH ${hpLoss}!` : `${hpLoss}!`,
          '#ffd86b',
          1.18,
          e.type === 'xuemo' && !e.armorCracked ? 'BRONZE ARMOR! BAIT INTO PILLAR' : undefined
        );
      }
    });

    if (hitAny) {
      soundEngine.playHit('heavy');
      sim.hitstopTimer = 0.06;
      sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.52);
      sim.comboCount += 2;
      sim.comboResetTimer = 4.2;
      sim.score += 180 * Math.max(1, orbsUsed);
    } else {
      spawnParticles(
        p.x + p.facing * 48,
        p.y,
        14,
        '#f2c45a',
        130,
        4,
        120
      );
    }
  }, [damagePropsNearPoint, spawnAfterimage, spawnFloatingText, spawnParticles, spawnShockwave]);

  const triggerLightAttack = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing') return;
    if (p.action === 'light_attack' && p.actionTimer > 0.06) {
      sim.input.bufferedAction = 'light';
      sim.input.bufferTimer = 0.16;
      return;
    }

    const boonMods = computeBoonModifiers(sim.activeBoons);
    const isDashStrike = p.action === 'dodge' || p.dashStrikeWindowTimer > 0;
    p.dashStrikeWindowTimer = 0;

    if (p.comboWindowTimer > 0) {
      p.comboStep = ((p.comboStep % 4) + 1) as 1 | 2 | 3 | 4;
    } else {
      p.comboStep = 1;
    }

    const weaponCfg = WEAPON_CONFIGS[p.weapon];
    const baseDur = (p.comboStep === 4 ? 0.26 : 0.17) / weaponCfg.attackSpeedMultiplier;
    p.action = 'light_attack';
    p.actionDuration = baseDur;
    p.actionTimer = baseDur;
    p.comboWindowTimer = 0.85;
    p.scaleX = isDashStrike ? 1.12 : p.comboStep === 4 ? 1.06 : 1.03;
    p.scaleY = isDashStrike ? 0.91 : p.comboStep === 4 ? 0.95 : 0.98;
    p.weaponSwingProgress = 0.0;

    // Face nearest enemy or cursor
    let targetX = sim.input.pointerX;
    let targetY = sim.input.pointerY;
    let nearestDist = 9999;
    sim.enemies.forEach((e) => {
      if (e.aiState === 'ko') return;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < nearestDist && d < 280) {
        nearestDist = d;
        targetX = e.x;
        targetY = e.y;
      }
    });

    const dx = targetX - p.x;
    const dy = targetY - p.y;
    if (Math.abs(dx) > 3) p.facing = dx >= 0 ? 1 : -1;
    p.slashAngle = Math.atan2(dy, dx);
    p.slashArcAlpha = 0.95;

    const dist = Math.hypot(dx, dy) || 1;
    const lungeImpulse = isDashStrike ? 225 : 95;
    p.vx += (dx / dist) * lungeImpulse;
    p.vy += (dy / dist) * lungeImpulse;

    // Damage destructible courtyard props in reach
    const effectiveReach = weaponCfg.reachPx + (isDashStrike ? 28 : 0);
    damagePropsNearPoint(
      p.x + p.facing * 28,
      p.y,
      effectiveReach + 18,
      p.comboStep === 4 || isDashStrike ? 55 : 32
    );

    if (p.comboStep === 4 || isDashStrike) {
      spawnAfterimage(
        GAME_ASSETS.rudra.slash2,
        0,
        p.x,
        p.y,
        96,
        p.facing,
        0,
        isDashStrike ? 'jade' : 'gold',
        0.24
      );
      spawnShockwave(
        p.x + p.facing * 32,
        p.y,
        isDashStrike ? 108 : 92,
        isDashStrike ? '#63f2ff' : weaponCfg.accentColor,
        0.3
      );
      sim.cameraZoom = BASE_CAMERA_ZOOM + 0.024;
    }

    soundEngine.playSwing(p.comboStep === 4 || isDashStrike ? 'heavy' : 'light');

    let hitAny = false;
    sim.enemies.forEach((e) => {
      if (e.aiState === 'ko') return;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d <= effectiveReach + (e.isBoss ? 44 : 24)) {
        hitAny = true;
        const dmg = calculateLightHitDamage({
          comboStep: p.comboStep,
          weapon: p.weapon,
          ranks: sim.ranks,
          isImmobilizedTarget: e.immobilizedTimer > 0,
        });
        const backstab = isShadowStrikeBackstab({
          playerX: p.x,
          enemyX: e.x,
          enemyFacing: e.facing,
        });

        // Smart Enemy & Boss Frontal Parry / Shield Deflection Mechanic!
        const canEnemyParry =
          !backstab &&
          !isDashStrike &&
          p.comboStep < 4 &&
          e.postureBrokenTimer <= 0 &&
          e.immobilizedTimer <= 0 &&
          (e.parryStanceTimer > 0 ||
            (e.trait === 'vajra_shield' && e.aiState === 'chase') ||
            (e.isBoss && e.aiState === 'chase' && Math.random() < 0.24));

        if (canEnemyParry) {
          soundEngine.playSpell('parry');
          e.parryStanceTimer = 0.55;
          e.hitFlashTimer = 0.08;
          const recoilAngle = Math.atan2(p.y - e.y, p.x - e.x);
          p.vx += Math.cos(recoilAngle) * 190;
          p.vy += Math.sin(recoilAngle) * 150;
          sim.hitstopTimer = 0.05;
          sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.3);
          spawnShockwave((p.x + e.x) * 0.5, (p.y + e.y) * 0.5, 86, '#ffd86b', 0.28);
          spawnParticles((p.x + e.x) * 0.5, (p.y + e.y) * 0.5 - 24, 20, '#ffd86b', 210, 4.2, 90);
          spawnFloatingText(
            e.x,
            e.y - 72,
            e.isBoss ? 'BOSS PARRIED! · COUNTER INCOMING!' : 'GUARD PARRIED! · DASH BEHIND OR HEAVY [RMB]',
            '#ffd86b',
            1.08
          );
          if (e.aiState === 'chase' || e.aiState === 'idle') {
            e.aiState = 'windup';
            e.windupDuration = e.isBoss ? 0.42 : 0.46;
            e.aiTimer = e.windupDuration;
            e.telegraphX = e.x;
            e.telegraphY = e.y;
            e.aimAngle = Math.atan2(p.y - e.y, p.x - e.x);
            e.facing = p.x >= e.x ? 1 : -1;
            e.attackKind = 'cone';
            e.telegraphRadius = e.isBoss ? 175 : 132;
          }
          return;
        }

        const isCrit =
          p.comboStep === 4 ||
          isDashStrike ||
          (boonMods.critChance > 0 && Math.random() < boonMods.critChance);
        const dundubhiArmorMult =
          e.type === 'xuemo' && !e.armorCracked ? 0.55 : 1.0;
        const lodgedCastMult = 1 + (e.lodgedCasts || 0) * boonMods.castLodgedDamageBonus;
        const mult =
          (p.transformTimer > 0 ? 1.3 : 1.0) *
          (isDashStrike ? boonMods.dashStrikeMultiplier : 1.0) *
          (backstab ? boonMods.backstabMultiplier : 1.0) *
          (isCrit && p.comboStep !== 4 ? boonMods.critMultiplier : 1.0) *
          (1 + boonMods.echoStrikeRatio) *
          dundubhiArmorMult *
          lodgedCastMult;
        const hpLoss = Math.round(dmg.hpDamage * mult);
        const posLoss = Math.round(dmg.postureDamage * mult * boonMods.postureDamageMultiplier);

        e.hp = Math.max(0, e.hp - hpLoss);
        e.hitFlashTimer = 0.055;
        e.scaleX = 1.04;
        e.scaleY = 0.96;

        // Nezha Boon: Samadhi Scorch DoT
        if (boonMods.scorchDps > 0) {
          e.scorchTimer = 3.0;
        }

        // Erlang Shen Boon: Sky-Splitting Chain Lightning
        if (boonMods.chainLightningDamage > 0) {
          let prevX = e.x;
          let prevY = e.y - 32;
          let bounceCount = 0;
          sim.enemies.forEach((other) => {
            if (other.id === e.id || other.aiState === 'ko' || bounceCount >= 2) return;
            if (Math.hypot(other.x - e.x, other.y - e.y) <= 240) {
              bounceCount++;
              other.hp = Math.max(0, other.hp - boonMods.chainLightningDamage);
              other.hitFlashTimer = 0.06;
              sim.lightningArcs.push({
                x1: prevX,
                y1: prevY,
                x2: other.x,
                y2: other.y - 32,
                life: 0.24,
                maxLife: 0.24,
                color: '#7dd3fc',
              });
              spawnFloatingText(
                other.x,
                other.y - 68,
                `CHAIN LIGHTNING -${boonMods.chainLightningDamage}`,
                '#7dd3fc',
                0.88
              );
              prevX = other.x;
              prevY = other.y - 32;
            }
          });
        }

        const kAngle = Math.atan2(e.y - p.y, e.x - p.x);
        const kb = (p.comboStep === 4 || isDashStrike ? 115 : 42) * (e.isBoss ? 0.35 : 1.0);
        e.vx += Math.cos(kAngle) * kb;
        e.vy += Math.sin(kAngle) * kb;

        const posResult = applyPostureDamage({
          currentPosture: e.posture,
          maxPosture: e.maxPosture,
          postureDamage: posLoss,
          alreadyBroken: e.postureBrokenTimer > 0,
        });
        e.posture = posResult.nextPosture;
        if (posResult.triggeredBreak) {
          e.postureBrokenTimer = 4.5;
          e.aiState = 'recover';
          e.aiTimer = 4.5;
          spawnShockwave(e.x, e.y, 135, '#ff4d3b', 0.4);
          spawnFloatingText(
            e.x,
            e.y - 84,
            'POSTURE BROKEN! [F] EXECUTE',
            '#ff4d3b',
            1.2
          );
        }

        // Accumulate Focus
        p.focusProgress += dmg.focusDelta * (isDashStrike ? 1.35 : 1.0);
        while (p.focusProgress >= 1.0 && p.focusOrbs < 4) {
          p.focusProgress -= 1.0;
          p.focusOrbs += 1;
        }
        if (p.focusOrbs >= 4) p.focusProgress = 1.0;

        spawnParticles(
          e.x,
          e.y - 24,
          p.comboStep === 4 || isDashStrike ? 18 : 9,
          isDashStrike ? '#63f2ff' : weaponCfg.accentColor,
          165,
          3.8,
          140
        );
        spawnFloatingText(
          e.x,
          e.y - 52,
          isCrit || isDashStrike ? `${hpLoss}!` : `${hpLoss}`,
          isDashStrike
            ? '#63f2ff'
            : backstab
            ? '#c084fc'
            : isCrit
            ? '#ffd86b'
            : '#f5ebd6',
          isDashStrike || backstab || isCrit ? 1.12 : 0.92
        );
      }
    });

    if (hitAny) {
      soundEngine.playHit(p.comboStep === 4 || isDashStrike ? 'crit' : 'light');
      if (p.comboStep === 4 || isDashStrike) {
        sim.hitstopTimer = 0.04;
        sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.28);
      }
      sim.comboCount += 1;
      sim.comboResetTimer = 3.8;
      sim.score += p.comboStep === 4 || isDashStrike ? 80 : 35;
    }
  }, [damagePropsNearPoint, spawnAfterimage, spawnFloatingText, spawnParticles, spawnShockwave]);

  const triggerCloudStepDodge = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing') return;
    if (p.action === 'dodge' && p.actionTimer > 0.1) return;

    const boonMods = computeBoonModifiers(sim.activeBoons);

    // 2-Charge Dash Stamina Discipline (initializes recharge timer on first consumed charge)
    const dashRes = consumeDashStamina({
      currentCharges: p.dashCharges,
      maxCharges: p.maxDashCharges,
      currentRechargeTimer: p.dashRechargeTimer,
    });
    if (!dashRes.canDash) {
      spawnFloatingText(p.x, p.y - 76, 'QI DEPLETED · DASH RECHARGING!', '#9adce8', 0.9);
      return;
    }
    p.dashCharges = dashRes.nextCharges;
    p.dashRechargeTimer = dashRes.nextRechargeTimer;
    p.dashStrikeWindowTimer = 0.34;

    // Check if an enemy is mid-windup or attack nearby for Perfect Cloud Step!
    const perfectWindow = sim.enemies.some(
      (e) =>
        (e.aiState === 'windup' || e.aiState === 'attack') &&
        Math.hypot(e.x - p.x, e.y - p.y) <= e.telegraphRadius + 95
    );

    // Record dash origin for the Jade-Gold Lightning Warp Streak
    p.dashStartX = p.x;
    p.dashStartY = p.y;
    p.dashStreakAlpha = 1.0;

    // Leave behind Phantom Step decoy & jade afterimage trail
    sim.decoy.active = true;
    sim.decoy.x = p.x;
    sim.decoy.y = p.y;
    sim.decoy.timer = 1.45;
    spawnAfterimage(GAME_ASSETS.rudra.run, 0, p.x, p.y, 96, p.facing, 0, 'jade', 0.34);
    spawnShockwave(
      p.x,
      p.y,
      boonMods.dashFireNovaDamage > 0 ? 125 : 88,
      boonMods.dashFireNovaDamage > 0 ? '#ff6a2b' : '#5ce6ff',
      0.34
    );
    sim.cameraZoom = BASE_CAMERA_ZOOM + 0.022;

    // Nezha Boon: Wind-Fire Wheel Dash Nova
    if (boonMods.dashFireNovaDamage > 0) {
      spawnParticles(p.x, p.y - 20, 22, '#ff6a2b', 190, 4.5, 40);
      sim.enemies.forEach((e) => {
        if (e.aiState === 'ko') return;
        if (Math.hypot(e.x - p.x, e.y - p.y) <= 135) {
          e.hp = Math.max(0, e.hp - boonMods.dashFireNovaDamage);
          e.hitFlashTimer = 0.07;
          e.scorchTimer = Math.max(e.scorchTimer, 2.5);
          spawnFloatingText(
            e.x,
            e.y - 56,
            `${boonMods.dashFireNovaDamage}`,
            '#ff6a2b',
            0.95
          );
        }
      });
    }

    // Guanyin Boon: Jade Willow Deflection reflects nearby enemy projectiles!
    if (boonMods.deflectProjectilesOnDash) {
      sim.projectiles.forEach((proj) => {
        if (!proj.active || proj.deflected) return;
        if (Math.hypot(proj.x - p.x, proj.y - p.y) <= 135) {
          proj.deflected = true;
          proj.vx *= -1.45;
          proj.vy *= -1.45;
          proj.damage = Math.round(proj.damage * 2.5);
          proj.color = '#3ee0a8';
          proj.life = 2.4;
          spawnFloatingText(proj.x, proj.y - 28, 'DEFLECT!', '#3ee0a8', 1.0);
        }
      });
    }

    p.action = 'dodge';
    p.actionDuration = 0.22;
    p.actionTimer = 0.22;
    p.invulnTimer = 0.45;
    p.scaleX = 1.12;
    p.scaleY = 0.90;

    // 1. Prioritize held WASD / Arrow direction
    let moveX = 0;
    let moveY = 0;
    const held = sim.input.keysHeld;
    if (held.has('KeyA') || held.has('ArrowLeft')) moveX -= 1;
    if (held.has('KeyD') || held.has('ArrowRight')) moveX += 1;
    if (held.has('KeyW') || held.has('ArrowUp')) moveY -= 1;
    if (held.has('KeyS') || held.has('ArrowDown')) moveY += 1;

    if (moveX !== 0 || moveY !== 0) {
      const d = Math.hypot(moveX, moveY) || 1;
      moveX /= d;
      moveY /= d;
      p.lastMoveDirX = moveX;
      p.lastMoveDirY = moveY;
    } else if (
      sim.input.pointerActive &&
      Math.hypot(sim.input.pointerX - p.x, sim.input.pointerY - p.y) > 32
    ) {
      // 2. Otherwise dash toward active mouse cursor
      const dx = sim.input.pointerX - p.x;
      const dy = sim.input.pointerY - p.y;
      const d = Math.hypot(dx, dy) || 1;
      moveX = dx / d;
      moveY = dy / d;
    } else {
      // 3. Otherwise dash along last movement direction or current facing vector
      const d = Math.hypot(p.lastMoveDirX, p.lastMoveDirY);
      if (d > 0.1) {
        moveX = p.lastMoveDirX / d;
        moveY = p.lastMoveDirY / d;
      } else {
        moveX = p.facing;
        moveY = 0;
      }
    }

    p.facing = moveX >= 0 ? 1 : -1;
    p.vx = moveX * 940;
    p.vy = moveY * 760;

    // Crowd-parting wind burst: push back nearby enemies and shatter nearby courtyard props
    damagePropsNearPoint(p.x + moveX * 54, p.y + moveY * 42, 85, 85);

    sim.enemies.forEach((e) => {
      if (e.aiState === 'ko') return;
      const edx = e.x - p.x;
      const edy = e.y - p.y;
      const edist = Math.hypot(edx, edy) || 1;
      if (edist < 125) {
        const pushStrength = e.isBoss ? 140 : 290;
        e.vx += (edx / edist) * pushStrength;
        e.vy += (edy / edist) * pushStrength * 0.82;
        const posRes = applyPostureDamage({
          currentPosture: e.posture,
          maxPosture: e.maxPosture,
          postureDamage: 22,
          alreadyBroken: e.postureBrokenTimer > 0,
        });
        e.posture = posRes.nextPosture;
        if (posRes.triggeredBreak) {
          e.postureBrokenTimer = 4.5;
          e.aiState = 'recover';
          e.aiTimer = 4.5;
        }
      }
    });

    soundEngine.playSpell('dodge');
    spawnParticles(sim.decoy.x, sim.decoy.y - 24, 22, '#5ce6ff', 175, 4.2, 20);
    spawnParticles(sim.decoy.x, sim.decoy.y - 24, 12, '#ffd86b', 145, 3.6, 10);

    if (perfectWindow) {
      // Refund 1 Dash Charge + Grant +1 Focus Orb on Perfect Cloud Step!
      p.dashCharges = Math.min(p.maxDashCharges, p.dashCharges + 1);
      if (p.focusOrbs < 4) {
        p.focusOrbs = Math.min(4, p.focusOrbs + 1);
      }
      if (boonMods.perfectDodgeHeal > 0) {
        p.hp = Math.min(p.maxHp, p.hp + boonMods.perfectDodgeHeal);
      }
      sim.score += 120;
      sim.hitstopTimer = 0.04;
      sim.screenFlashAlpha = 0.18;
      sim.screenFlashColor = '#5ce6ff';
      spawnFloatingText(
        p.x,
        p.y - 76,
        'PERFECT DODGE!',
        '#63f2ff',
        1.12
      );
    }
  }, [damagePropsNearPoint, spawnAfterimage, spawnFloatingText, spawnParticles, spawnShockwave]);

  // Global keyboard & window focus listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const sim = simRef.current;

      if (sim.state === 'title') {
        if ((e.code === 'Enter' || e.code === 'Space') && !shrineOpen && !storyOpen) {
          e.preventDefault();
          startGameAtChamber(0);
        }
        return;
      }

      if (boonModalOpen) {
        if (e.code === 'Digit1' && boonChoices[0]) {
          e.preventDefault();
          handleSelectBoon(boonChoices[0].id);
        } else if (e.code === 'Digit2' && boonChoices[1]) {
          e.preventDefault();
          handleSelectBoon(boonChoices[1].id);
        } else if (e.code === 'Digit3' && boonChoices[2]) {
          e.preventDefault();
          handleSelectBoon(boonChoices[2].id);
        } else if (e.code === 'KeyR') {
          e.preventDefault();
          handleRerollBoons();
        } else if (e.code === 'Escape') {
          e.preventDefault();
          setBoonModalOpen(false);
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (shrineOpen) {
          setShrineOpen(false);
          return;
        }
        if (storyOpen) {
          setStoryOpen(false);
          return;
        }
        if (sim.state === 'playing') {
          sim.state = 'paused';
          document.body.dataset.state = 'paused';
          setGameState('paused');
          setOutcomeMode('paused');
          sim.input.keysHeld.clear();
        } else if (sim.state === 'paused') {
          sim.state = 'playing';
          document.body.dataset.state = 'playing';
          setGameState('playing');
          setOutcomeMode('none');
        }
        return;
      }

      if (e.code === 'KeyM') {
        setMuted((prev) => {
          const next = !prev;
          soundEngine.setMuted(next);
          return next;
        });
        return;
      }

      if (e.code === 'KeyG') {
        cycleGraphicsTier();
        return;
      }

      if (sim.state !== 'playing') return;

      if (!sim.input.keysHeld.has(e.code)) {
        sim.input.justPressed.add(e.code);
      }
      sim.input.keysHeld.add(e.code);

      if (e.code === 'KeyB') {
        e.preventDefault();
        openBoonAltar();
      } else if (e.code === 'Tab') {
        e.preventDefault();
        triggerSwitchStance();
      } else if (e.code === 'Digit1') {
        triggerSwitchWeapon('twin_blades');
      } else if (e.code === 'Digit2') {
        triggerSwitchWeapon('jingu_bang');
      } else if (e.code === 'Digit3') {
        triggerSwitchWeapon('dragon_glaive');
      } else if (e.code === 'KeyR') {
        triggerGourdHeal();
      } else if (e.code === 'KeyV') {
        triggerStanceHeavyUnleash();
      } else if (e.code === 'KeyF') {
        triggerExecuteBrokenTarget();
      } else if (e.code === 'KeyQ') {
        triggerImmobilizeSpell();
      } else if (e.code === 'KeyT') {
        triggerRockSolidParry();
      } else if (e.code === 'KeyE') {
        triggerLookOrMirage();
      } else if (e.code === 'KeyZ') {
        triggerRedTidesTransform();
      } else if (
        e.code === 'Space' ||
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight' ||
        e.code === 'KeyK'
      ) {
        e.preventDefault();
        triggerCloudStepDodge();
      } else if (e.code === 'KeyJ') {
        triggerLightAttack();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      simRef.current.input.keysHeld.delete(e.code);
    };

    const onBlur = () => {
      simRef.current.input.keysHeld.clear();
      simRef.current.input.justPressed.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [
    boonModalOpen,
    boonChoices,
    cycleGraphicsTier,
    handleSelectBoon,
    handleRerollBoons,
    openBoonAltar,
    shrineOpen,
    storyOpen,
    startGameAtChamber,
    triggerSwitchStance,
    triggerSwitchWeapon,
    triggerGourdHeal,
    triggerStanceHeavyUnleash,
    triggerExecuteBrokenTarget,
    triggerImmobilizeSpell,
    triggerRockSolidParry,
    triggerLookOrMirage,
    triggerRedTidesTransform,
    triggerCloudStepDodge,
    triggerLightAttack,
  ]);

  // Helper to draw a tightly-cropped sprite frame at its true 1:1 aspect ratio with directional silhouette shadows, velocity lean & optional rim light
  const drawSpriteFrame = (
    ctx: CanvasRenderingContext2D,
    asset: ProcessedSpriteAsset | undefined,
    frameIndex: number,
    _totalFrames: number,
    worldX: number,
    worldY: number,
    targetHeight: number,
    _unusedWidth: number,
    facing: 1 | -1,
    scaleX: number,
    scaleY: number,
    hitFlash: boolean,
    elevationY: number = 0,
    shadowRadius: number = 32,
    rimTint: 'none' | 'gold' | 'jade' = 'none',
    skewX: number = 0,
    lightSourceX?: number
  ) => {
    // 1. Dual-layer Ground Contact Shadow (wide ambient occlusion + tight dark boot contact core)
    const elevAtten = Math.max(0.35, 1 - elevationY / 130);
    ctx.save();
    ctx.translate(worldX, worldY);
    ctx.scale(1, 0.42);
    const outerR = shadowRadius * 1.18 * elevAtten;
    const sGrad = ctx.createRadialGradient(0, 0, outerR * 0.08, 0, 0, outerR);
    sGrad.addColorStop(0, `rgba(0, 0, 0, ${(0.66 * elevAtten).toFixed(2)})`);
    sGrad.addColorStop(0.45, `rgba(0, 0, 0, ${(0.36 * elevAtten).toFixed(2)})`);
    sGrad.addColorStop(0.78, `rgba(0, 0, 0, ${(0.14 * elevAtten).toFixed(2)})`);
    sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sGrad;
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (!asset || asset.frames.length === 0) {
      return;
    }

    const safeIdx = Math.max(0, Math.min(asset.frames.length - 1, frameIndex));
    const frame = asset.frames[safeIdx];
    const baseH = asset.baseFrameHeight || frame.sh;

    // Preserve exact native aspect ratio of the cropped pose relative to standing height
    const pixelScale = targetHeight / baseH;
    const drawW = frame.sw * pixelScale;
    const drawH = frame.sh * pixelScale;

    // 1.5. Projected Directional Floor Shadow Silhouette (skewed away from nearest brazier light source)
    if (asset.shadowCanvas) {
      const skewDir =
        lightSourceX !== undefined
          ? Math.max(-0.55, Math.min(0.55, (worldX - lightSourceX) / 480))
          : -0.28 * facing;
      ctx.save();
      ctx.translate(worldX, worldY + 2);
      ctx.transform(1, 0, skewDir, 0.36, 0, 0);
      ctx.scale(facing * scaleX, 1);
      ctx.globalAlpha = 0.42 * elevAtten;
      ctx.drawImage(
        asset.shadowCanvas,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
        -drawW * 0.5,
        -drawH + 5,
        drawW,
        drawH
      );
      ctx.restore();
    }

    ctx.save();
    ctx.translate(worldX, worldY - elevationY);
    if (Math.abs(skewX) > 0.001) {
      ctx.transform(1, 0, skewX, 1, 0, 0);
    }
    ctx.scale(facing * scaleX, scaleY);

    // Optional celestial backlight rim silhouette
    if (rimTint !== 'none' && !hitFlash) {
      const rimCanvas = rimTint === 'jade' ? asset.jadeCanvas : asset.goldCanvas;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.38;
      ctx.drawImage(
        rimCanvas,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
        -drawW * 0.5 - 2,
        -drawH + 3,
        drawW + 4,
        drawH + 2
      );
      ctx.restore();
    }

    const sourceCanvas = hitFlash ? asset.flashCanvas : asset.cleanCanvas;
    ctx.drawImage(
      sourceCanvas,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      -drawW * 0.5,
      -drawH + 5,
      drawW,
      drawH
    );
    ctx.restore();
  };

  // Main 60fps High-DPI Canvas Simulation & Render Loop (mounted once)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const vw = window.innerWidth || 1440;
      const vh = window.innerHeight || 900;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      simRef.current.viewportW = vw;
      simRef.current.viewportH = vh;
      simRef.current.worldW = Math.round(vw * WORLD_SCALE);
      simRef.current.worldH = Math.round(vh * WORLD_SCALE);
      simRef.current.dpr = dpr;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let rafId = 0;
    let lastTime = performance.now();
    let hudSyncAccum = 0;

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      const sim = simRef.current;
      const cw = sim.viewportW || 1440;
      const ch = sim.viewportH || 900;
      const worldW = sim.worldW || Math.round(cw * WORLD_SCALE);
      const worldH = sim.worldH || Math.round(ch * WORLD_SCALE);
      const dpr = sim.dpr || 1;
      const chamberSpec: ChamberSpec = CHAMBERS[sim.chamberIndex] || CHAMBERS[0];

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';

      // FPS counter
      sim.frameCounter += 1;
      sim.fpsAccum += rawDt;
      if (sim.fpsAccum >= 0.5) {
        sim.fps = Math.min(60, Math.max(30, Math.round(sim.frameCounter / sim.fpsAccum)));
        sim.frameCounter = 0;
        sim.fpsAccum = 0;
      }

      // Hitstop, slow-mo, camera zoom, and screen shake decay in real dt
      if (sim.hitstopTimer > 0) {
        sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
      }
      if (sim.slowMoTimer > 0) {
        sim.slowMoTimer = Math.max(0, sim.slowMoTimer - dt);
      }
      if (sim.cameraShakeTrauma > 0) {
        sim.cameraShakeTrauma = Math.max(0, sim.cameraShakeTrauma - dt * 1.9);
      }
      if (sim.screenFlashAlpha > 0) {
        sim.screenFlashAlpha = Math.max(0, sim.screenFlashAlpha - dt * 2.4);
      }
      if (sim.gateWipeTimer > 0) {
        sim.gateWipeTimer = Math.max(0, sim.gateWipeTimer - dt);
      }
      if (sim.chasmVaultCalloutCd > 0) {
        sim.chasmVaultCalloutCd = Math.max(0, sim.chasmVaultCalloutCd - dt);
      }
      // Dynamic 16% Camera Zoom-Out & Shared Framing during Sovereign Boss / Mini-Boss Encounters!
      const activeBoss = sim.enemies.find((e) => e.isBoss && e.aiState !== 'ko' && e.hp > 0);
      const targetBaseZoom =
        activeBoss || chamberSpec.isBossChamber ? BASE_CAMERA_ZOOM * 0.84 : BASE_CAMERA_ZOOM;
      sim.cameraZoom += (targetBaseZoom - sim.cameraZoom) * (1 - Math.exp(-5.5 * dt));

      // Smooth Spring-Damped Hades Tracking Camera with Boss Midpoint Bias & Zoom-Safe Bounds
      const zoom = sim.cameraZoom || targetBaseZoom;
      const halfVisW = (cw * 0.5) / zoom;
      const halfVisH = (ch * 0.5) / zoom;
      const minCamX = Math.max(0, halfVisW - cw * 0.5);
      const maxCamX = Math.max(minCamX, worldW - halfVisW - cw * 0.5);
      const minCamY = Math.max(0, halfVisH - ch * 0.5);
      const maxCamY = Math.max(minCamY, worldH - halfVisH - ch * 0.5);

      const camFocusX = activeBoss
        ? sim.player.x * 0.78 + activeBoss.x * 0.22
        : sim.player.x + sim.player.facing * 42 + sim.player.vx * 0.11;
      const camFocusY = activeBoss
        ? sim.player.y * 0.76 + activeBoss.y * 0.24 - 32
        : sim.player.y - 26 + sim.player.vy * 0.11;

      const targetCamX = Math.max(minCamX, Math.min(maxCamX, camFocusX - cw * 0.5));
      const targetCamY = Math.max(minCamY, Math.min(maxCamY, camFocusY - ch * 0.5));
      const camLerp = 1 - Math.exp(-7.8 * dt);
      sim.camX += (targetCamX - sim.camX) * camLerp;
      sim.camY += (targetCamY - sim.camY) * camLerp;

      // Project screen pointer to world coordinates accounting for cameraZoom around viewport center
      sim.input.pointerX = (sim.input.pointerScreenX - cw * 0.5) / zoom + cw * 0.5 + sim.camX;
      sim.input.pointerY = (sim.input.pointerScreenY - ch * 0.5) / zoom + ch * 0.5 + sim.camY;

      const timeScale = sim.slowMoTimer > 0 ? 0.28 : 1.0;
      const simDt =
        sim.state === 'playing' && !sim.modalPaused && sim.hitstopTimer <= 0 ? dt * timeScale : 0;

      const minX = worldW * 0.08;
      const maxX = worldW * 0.92;
      const minY = worldH * 0.15;
      const maxY = worldH * 0.87;

      if (simDt > 0) {
        const p = sim.player;

        // Chamber intro banner timer
        if (sim.chamberBannerTimer > 0) {
          sim.chamberBannerTimer = Math.max(0, sim.chamberBannerTimer - simDt);
        }
        if (sim.bossPhaseBanner && sim.bossPhaseBanner.timer > 0) {
          sim.bossPhaseBanner.timer = Math.max(0, sim.bossPhaseBanner.timer - simDt);
          if (sim.bossPhaseBanner.timer <= 0) {
            sim.bossPhaseBanner = null;
          }
        }

        // Delayed enemy wave spawns & glowing summoning rifts in world coordinates
        for (let i = sim.pendingSpawns.length - 1; i >= 0; i--) {
          sim.pendingSpawns[i].timer -= simDt;
          if (sim.pendingSpawns[i].timer <= 0) {
            const sp = sim.pendingSpawns[i];
            sim.enemies.push(createEnemyFromSpec(sp.type, sp.x, sp.y, worldW, worldH, sp.trait));
            spawnParticles(sp.x * worldW, sp.y * worldH, 18, '#ff7b29', 130, 4, 50);
            spawnShockwave(sp.x * worldW, sp.y * worldH, 68, '#ff9d42', 0.34);
            sim.pendingSpawns.splice(i, 1);
          }
        }
        for (let i = sim.summoningRifts.length - 1; i >= 0; i--) {
          sim.summoningRifts[i].timer -= simDt;
          if (sim.summoningRifts[i].timer <= 0) {
            const rift = sim.summoningRifts[i];
            sim.enemies.push(createEnemyFromSpec(rift.type, rift.x / worldW, rift.y / worldH, worldW, worldH, rift.trait));
            spawnParticles(rift.x, rift.y - 16, 26, '#ff4d29', 165, 4.5, 70);
            spawnShockwave(rift.x, rift.y, 92, '#ffd86b', 0.38);
            soundEngine.playTelegraph();
            sim.summoningRifts.splice(i, 1);
          }
        }

        // Cooldowns & timers
        p.immobilizeCd = Math.max(0, p.immobilizeCd - simDt);
        p.parryCd = Math.max(0, p.parryCd - simDt);
        p.clonesCd = Math.max(0, p.clonesCd - simDt);
        p.transformCd = Math.max(0, p.transformCd - simDt);
        p.transformTimer = Math.max(0, p.transformTimer - simDt);
        p.invulnTimer = Math.max(0, p.invulnTimer - simDt);
        p.hitFlashTimer = Math.max(0, p.hitFlashTimer - simDt);
        p.comboWindowTimer = Math.max(0, p.comboWindowTimer - simDt);
        p.dashStrikeWindowTimer = Math.max(0, p.dashStrikeWindowTimer - simDt);
        p.slashArcAlpha = Math.max(0, p.slashArcAlpha - simDt * 3.1);
        p.dashStreakAlpha = Math.max(0, p.dashStreakAlpha - simDt * 3.2);
        p.weaponSwingProgress = Math.min(1, p.weaponSwingProgress + simDt * 5.2);

        // Input buffer decay & auto-execution when returning to idle
        if (sim.input.bufferTimer > 0) {
          sim.input.bufferTimer = Math.max(0, sim.input.bufferTimer - simDt);
          if (sim.input.bufferTimer <= 0) {
            sim.input.bufferedAction = null;
          }
        }

        // 2-Charge Dash Stamina Recharge (1.15s per charge)
        if (p.dashCharges < p.maxDashCharges) {
          p.dashRechargeTimer -= simDt;
          if (p.dashRechargeTimer <= 0) {
            p.dashCharges += 1;
            p.dashRechargeTimer = p.dashCharges < p.maxDashCharges ? 1.15 : 0;
          }
        }

        // Update destructible courtyard props timers & soft collision with player
        for (let i = 0; i < sim.props.length; i++) {
          const prop = sim.props[i];
          if (prop.destroyed) continue;
          prop.hitFlashTimer = Math.max(0, prop.hitFlashTimer - simDt);
          prop.shakeTimer = Math.max(0, prop.shakeTimer - simDt);

          // If Wukong dashes directly through a prop at high speed, shatter it!
          const propRadius = 26;
          const pdx = p.x - prop.x;
          const pdy = (p.y - prop.y) * 1.35;
          const pDist = Math.hypot(pdx, pdy);
          if (pDist < propRadius + 18) {
            if (p.action === 'dodge' || p.action === 'heavy_unleash' || p.action === 'execute') {
              damagePropsNearPoint(prop.x, prop.y, propRadius + 12, 999);
            } else {
              const safeD = pDist || 1;
              const push = (propRadius + 18 - pDist) * 10 * simDt;
              p.x += (pdx / safeD) * push;
              p.y += ((p.y - prop.y) / safeD) * push;
            }
          }
        }

        // Continuous motion afterimage trail during Dodge, Heavy Unleash, Execute, or Rudra Tandava
        if (
          p.action === 'dodge' ||
          p.action === 'heavy_unleash' ||
          p.action === 'execute' ||
          (p.transformTimer > 0 && Math.hypot(p.vx, p.vy) > 95)
        ) {
          sim.afterimageSpawnAccum += simDt;
          const interval = p.action === 'dodge' ? 0.025 : 0.05;
          if (sim.afterimageSpawnAccum >= interval) {
            sim.afterimageSpawnAccum = 0;
            const aiSpriteUrl =
              p.action === 'heavy_unleash' || p.action === 'execute'
                ? GAME_ASSETS.rudra.slam
                : p.action === 'dodge'
                ? GAME_ASSETS.rudra.run
                : GAME_ASSETS.rudra.slash1;
            spawnAfterimage(
              aiSpriteUrl,
              0,
              p.x,
              p.y,
              96,
              p.facing,
              p.elevationY,
              p.action === 'dodge' ? 'jade' : 'gold',
              0.28
            );
          }
        } else {
          sim.afterimageSpawnAccum = 0;
        }

        if (sim.comboResetTimer > 0) {
          sim.comboResetTimer -= simDt;
          if (sim.comboResetTimer <= 0) sim.comboCount = 0;
        }

        // Smooth squash-and-stretch recovery
        const dampFactor = 1 - Math.exp(-14 * simDt);
        p.scaleX += (1 - p.scaleX) * dampFactor;
        p.scaleY += (1 - p.scaleY) * dampFactor;
        p.displayHp += (p.hp - p.displayHp) * (1 - Math.exp(-5.5 * simDt));
        sim.enemies.forEach((e) => {
          e.displayHp += (e.hp - e.displayHp) * (1 - Math.exp(-5.5 * simDt));
        });

        if (p.action !== 'idle') {
          p.actionTimer -= simDt;
          if (p.actionTimer <= 0) {
            p.action = 'idle';
            p.elevationY = 0;
            if (sim.input.bufferedAction !== null && sim.input.bufferTimer > 0) {
              const nextAct = sim.input.bufferedAction;
              sim.input.bufferedAction = null;
              sim.input.bufferTimer = 0;
              if (nextAct === 'light') triggerLightAttack();
              else if (nextAct === 'heavy') triggerStanceHeavyUnleash();
              else if (nextAct === 'dodge') triggerCloudStepDodge();
            }
          }
        } else {
          p.elevationY += (0 - p.elevationY) * dampFactor;
        }

        // Passive Focus charge in Pillar stance or during combat
        if (p.focusOrbs < 4) {
          p.focusProgress += simDt * 0.06;
          if (p.focusProgress >= 1.0) {
            p.focusProgress -= 1.0;
            p.focusOrbs += 1;
          }
        }

        // Player WASD / Arrow + PC/Console Gamepad 360° Analog Movement & Combat Buttons
        const held = sim.input.keysHeld;
        let moveX = 0;
        let moveY = 0;
        if (held.has('KeyA') || held.has('ArrowLeft')) moveX -= 1;
        if (held.has('KeyD') || held.has('ArrowRight')) moveX += 1;
        if (held.has('KeyW') || held.has('ArrowUp')) moveY -= 1;
        if (held.has('KeyS') || held.has('ArrowDown')) moveY += 1;

        // Poll connected PC / Console Gamepad (Xbox, DualSense, Switch Pro)
        if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
          const pads = navigator.getGamepads();
          const pad = pads?.[0] || pads?.[1] || pads?.[2] || pads?.[3];
          if (pad && pad.connected) {
            const deadzone = 0.18;
            const lx = pad.axes[0] || 0;
            const ly = pad.axes[1] || 0;
            if (Math.hypot(lx, ly) > deadzone) {
              moveX = lx;
              moveY = ly;
            }
            // Right stick 360-degree aim
            const rx = pad.axes[2] || 0;
            const ry = pad.axes[3] || 0;
            if (Math.hypot(rx, ry) > 0.25) {
              sim.input.pointerX = p.x + rx * 220;
              sim.input.pointerY = p.y + ry * 220;
              sim.input.pointerActive = true;
            }

            const prevBtns = gamepadPrevButtonsRef.current;
            const isJustPressed = (idx: number) => {
              const cur = Boolean(pad.buttons[idx]?.pressed);
              const was = Boolean(prevBtns[idx]);
              prevBtns[idx] = cur;
              return cur && !was;
            };

            if (isJustPressed(0)) {
              // A / Cross -> Phantom Step Dash
              triggerCloudStepDodge();
              triggerGamepadRumble(0.25, 0.35, 65);
            }
            if (isJustPressed(2)) {
              // X / Square -> 4-Hit Parashu Great-Axe Combo
              triggerLightAttack();
              triggerGamepadRumble(0.35, 0.45, 70);
            }
            if (isJustPressed(3)) {
              // Y / Triangle -> Tapas Heavy Unleash
              triggerStanceHeavyUnleash();
              triggerGamepadRumble(0.65, 0.85, 130);
            }
            if (isJustPressed(1)) {
              // B / Circle -> Execute Broken Target or Agneyastra Bow
              const hasBroken = sim.enemies.some(
                (e) => e.aiState !== 'ko' && e.postureBrokenTimer > 0
              );
              if (hasBroken) {
                triggerExecuteBrokenTarget();
                triggerGamepadRumble(0.8, 1.0, 160);
              } else {
                triggerImmobilizeSpell();
                triggerGamepadRumble(0.4, 0.5, 90);
              }
            }
            if (isJustPressed(4)) {
              // LB / L1 -> Kalaripayattu Parry
              triggerRockSolidParry();
              triggerGamepadRumble(0.5, 0.65, 90);
            }
            if (isJustPressed(5)) {
              // RB / R1 -> Switch Stance
              triggerSwitchStance();
            }
            if (isJustPressed(6)) {
              // LT / L2 -> Amrita Kalasha Heal
              triggerGourdHeal();
            }
            if (isJustPressed(7)) {
              // RT / R2 -> Rudra Tandava / Maya Mirage
              if (p.transformCd <= 0) {
                triggerRedTidesTransform();
              } else {
                triggerPluckOfManyClones();
              }
              triggerGamepadRumble(0.7, 0.9, 140);
            }
            if (isJustPressed(14)) triggerSwitchWeapon('twin_blades');
            if (isJustPressed(12)) triggerSwitchWeapon('jingu_bang');
            if (isJustPressed(15)) triggerSwitchWeapon('dragon_glaive');
          }
        }

        if (moveX !== 0 || moveY !== 0) {
          const len = Math.hypot(moveX, moveY) || 1;
          moveX /= len;
          moveY /= len;
          p.lastMoveDirX = moveX;
          p.lastMoveDirY = moveY;
          const speed = p.transformTimer > 0 ? 335 : 285;
          if (p.action === 'idle' || p.action === 'light_attack') {
            const mult = p.action === 'light_attack' ? 0.5 : 1.0;
            p.vx += (moveX * speed * mult - p.vx) * (1 - Math.exp(-12 * simDt));
            p.vy += (moveY * speed * 0.82 * mult - p.vy) * (1 - Math.exp(-12 * simDt));
            if (p.action === 'idle') {
              p.facing = moveX >= 0 ? 1 : -1;
            }
          } else if (p.action === 'dodge') {
            // Allow subtle mid-dash steering while keeping high-velocity Cloud Step burst!
            p.vx *= Math.exp(-2.1 * simDt);
            p.vy *= Math.exp(-2.1 * simDt);
          }
        } else if (p.action === 'idle') {
          p.vx *= Math.exp(-12 * simDt);
          p.vy *= Math.exp(-12 * simDt);
        } else if (p.action === 'dodge') {
          p.vx *= Math.exp(-2.1 * simDt);
          p.vy *= Math.exp(-2.1 * simDt);
        } else {
          p.vx *= Math.exp(-7 * simDt);
          p.vy *= Math.exp(-7 * simDt);
        }

        p.x += p.vx * simDt;
        p.y += p.vy * simDt;
        p.walkDistance += Math.hypot(p.vx, p.vy) * simDt;

        // Spring-damped secondary physics for Wukong's Pheasant-Feather Crown Plumes & Crimson Sash
        const targetPlumeX = -p.facing * 26 - p.vx * 0.085;
        const targetPlumeY = -12 - p.vy * 0.065 + Math.sin(now * 0.011) * 5;
        const plumeLerp = 1 - Math.exp(-14 * simDt);
        p.plumeLagX += (targetPlumeX - p.plumeLagX) * plumeLerp;
        p.plumeLagY += (targetPlumeY - p.plumeLagY) * plumeLerp;

        // Gait-synced stone-dust & ash footstep puffs so Wukong feels physically grounded on the courtyard flagstones
        if (p.walkDistance - p.lastFootstepDist >= 32 && p.elevationY < 5) {
          p.lastFootstepDist = p.walkDistance;
          spawnParticles(p.x - p.facing * 10, p.y + 3, 3, '#c8b89e', 42, 3.2, -18);
        }

        // Constrain Rudra to 2:1 Isometric Chamber Platform Polygon & Interior Chasm Channels
        const playerConstraint = constrainActorToChamber(
          p.x,
          p.y,
          p.vx,
          p.vy,
          worldW,
          worldH,
          sim.chamberIndex,
          p.action === 'dodge' || p.elevationY > 12,
          false,
          20
        );
        p.x = playerConstraint.x;
        p.y = playerConstraint.y;
        p.vx = playerConstraint.vx;
        p.vy = playerConstraint.vy;
        if (playerConstraint.vaultedChasm && sim.chasmVaultCalloutCd <= 0) {
          sim.chasmVaultCalloutCd = 1.2;
          spawnParticles(p.x, p.y - 10, 10, '#52ffd8', 110, 3.4, -20);
          spawnFloatingText(p.x, p.y - 72, 'CHASM VAULT!', '#52ffd8', 0.96);
        }

        // Cloud Step Decoy update & explosion
        if (sim.decoy.active) {
          sim.decoy.timer -= simDt;
          if (sim.decoy.timer <= 0) {
            sim.decoy.active = false;
            spawnParticles(sim.decoy.x, sim.decoy.y - 25, 24, '#5ce6ff', 180, 4.5, 80);
            damagePropsNearPoint(sim.decoy.x, sim.decoy.y, 135, 55);
            sim.enemies.forEach((e) => {
              if (e.aiState === 'ko') return;
              if (Math.hypot(e.x - sim.decoy.x, e.y - sim.decoy.y) <= 135) {
                e.hp = Math.max(0, e.hp - 55);
                const posRes = applyPostureDamage({
                  currentPosture: e.posture,
                  maxPosture: e.maxPosture,
                  postureDamage: 85,
                  alreadyBroken: e.postureBrokenTimer > 0,
                });
                e.posture = posRes.nextPosture;
                if (posRes.triggeredBreak) {
                  e.postureBrokenTimer = 4.5;
                  e.aiState = 'recover';
                  e.aiTimer = 4.5;
                }
                e.hitFlashTimer = 0.08;
                spawnFloatingText(e.x, e.y - 60, 'DECOY BLAST -55', '#5ce6ff', 1.0);
              }
            });
          }
        }

        // Update Monkey Clones (身外身法)
        for (let i = sim.clones.length - 1; i >= 0; i--) {
          const c = sim.clones[i];
          c.life -= simDt;
          c.animTime += simDt * 7;
          c.attackCooldown -= simDt;
          if (c.life <= 0) {
            spawnParticles(c.x, c.y - 20, 12, '#ffcf66', 100, 3.5, 40);
            sim.clones.splice(i, 1);
            continue;
          }

          // Seek nearest living enemy
          let target: EnemyEntity | null = null;
          let bestDist = 9999;
          for (const e of sim.enemies) {
            if (e.aiState === 'ko') continue;
            const d = Math.hypot(e.x - c.x, e.y - c.y);
            if (d < bestDist) {
              bestDist = d;
              target = e;
            }
          }

          if (target) {
            const dx = target.x - c.x;
            const dy = target.y - c.y;
            c.facing = dx >= 0 ? 1 : -1;
            if (bestDist > 58) {
              c.x += (dx / bestDist) * 235 * simDt;
              c.y += (dy / bestDist) * 198 * simDt;
            } else if (c.attackCooldown <= 0) {
              c.attackCooldown = 0.65;
              const stats = computeDerivedPlayerStats(sim.ranks);
              const cloneDmg = Math.round(26 * stats.damageMultiplier);
              target.hp = Math.max(0, target.hp - cloneDmg);
              const posRes = applyPostureDamage({
                currentPosture: target.posture,
                maxPosture: target.maxPosture,
                postureDamage: 38,
                alreadyBroken: target.postureBrokenTimer > 0,
              });
              target.posture = posRes.nextPosture;
              if (posRes.triggeredBreak) {
                target.postureBrokenTimer = 4.5;
                target.aiState = 'recover';
                target.aiTimer = 4.5;
              }
              target.hitFlashTimer = 0.045;
              spawnParticles(target.x, target.y - 22, 6, '#ffcf66', 120, 3, 100);
              spawnFloatingText(target.x, target.y - 46, `-${cloneDmg}`, '#ffcf66', 0.85);
            }
          }
        }

        // Update Projectiles (Fire Monk & XueMo Blood Lotus Orbs + Deflected Projectiles)
        for (let i = 0; i < sim.projectiles.length; i++) {
          const proj = sim.projectiles[i];
          if (!proj.active) continue;
          proj.x += proj.vx * simDt;
          proj.y += proj.vy * simDt;
          proj.life -= simDt;
          if (proj.life <= 0) {
            proj.active = false;
            continue;
          }

          if (proj.deflected) {
            // Deflected projectiles & Player Agneyastra Blood-Shard Casts strike enemies!
            for (const e of sim.enemies) {
              if (e.aiState === 'ko') continue;
              if (Math.hypot(proj.x - e.x, proj.y - (e.y - 24)) <= proj.radius + 32) {
                proj.active = false;
                e.hp = Math.max(0, e.hp - proj.damage);
                e.hitFlashTimer = 0.09;
                if (proj.isPlayerCast) {
                  e.lodgedCasts = Math.min(3, (e.lodgedCasts || 0) + 1);
                  e.scorchTimer = Math.max(e.scorchTimer, 3.0);
                  spawnShockwave(e.x, e.y, 82, '#ff2a4b', 0.32);
                  spawnParticles(e.x, e.y - 24, 18, '#ff2a4b', 175, 4.4, 80);
                  spawnFloatingText(
                    e.x,
                    e.y - 66,
                    `BLOOD-SHARD LODGED -${proj.damage}!`,
                    '#ff6a42',
                    1.1
                  );
                } else {
                  spawnParticles(e.x, e.y - 24, 14, '#3ee0a8', 150, 4, 80);
                  spawnFloatingText(e.x, e.y - 62, `REFLECTED -${proj.damage}`, '#3ee0a8', 1.05);
                }
                break;
              }
            }
            continue;
          }

          const distToPlayer = Math.hypot(proj.x - p.x, proj.y - (p.y - 20));
          if (distToPlayer <= proj.radius + 20) {
            proj.active = false;
            if (p.action === 'parry') {
              soundEngine.playSpell('parry');
              if (p.focusOrbs < 4) p.focusOrbs += 1;
              spawnParticles(p.x, p.y - 26, 14, '#ffd86b', 150, 4, 60);
              spawnFloatingText(p.x, p.y - 68, 'DEFLECTED! +1 FOCUS', '#ffd86b', 1.05);
            } else if (p.invulnTimer <= 0) {
              p.hp = Math.max(0, p.hp - proj.damage);
              p.hitFlashTimer = 0.08;
              sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.25);
              soundEngine.playHit('light');
              spawnParticles(p.x, p.y - 22, 12, '#ff3b24', 140, 4, 120);
              spawnFloatingText(p.x, p.y - 56, `-${proj.damage}`, '#ff5252', 1.0);
            }
          }
        }

        // Crowd Attack Token Cap (at most 2 enemies in windup/attack simultaneously)
        let activeAttackers = sim.enemies.filter(
          (e) => e.aiState === 'windup' || e.aiState === 'attack'
        ).length;

        // Update Enemies & Sovereign Bosses
        const stats = computeDerivedPlayerStats(sim.ranks);
        const boonMods = computeBoonModifiers(sim.activeBoons);

        for (let i = sim.enemies.length - 1; i >= 0; i--) {
          const e = sim.enemies[i];
          e.animTime += simDt;
          e.hitFlashTimer = Math.max(0, e.hitFlashTimer - simDt);
          e.slashArcAlpha = Math.max(0, e.slashArcAlpha - simDt * 3.8);
          e.parryStanceTimer = Math.max(0, (e.parryStanceTimer || 0) - simDt);
          const targetGrowth = e.isBoss ? (e.phase === 3 ? 1.42 : e.phase === 2 ? 1.25 : 1.0) : 1.0;
          e.growthScale = (e.growthScale || 1.0) + (targetGrowth - (e.growthScale || 1.0)) * (1 - Math.exp(-3.5 * simDt));
          e.scaleX += (1 - e.scaleX) * dampFactor;
          e.scaleY += (1 - e.scaleY) * dampFactor;
          e.displayHp += (e.hp - e.displayHp) * (1 - Math.exp(-8 * simDt));
          e.vx *= Math.exp(-8 * simDt);
          e.vy *= Math.exp(-8 * simDt);

          // Samadhi Scorch DoT tick (Nezha Boon)
          if (e.scorchTimer > 0 && e.aiState !== 'ko') {
            e.scorchTimer = Math.max(0, e.scorchTimer - simDt);
            e.scorchTickAccum += simDt;
            if (e.scorchTickAccum >= 0.45 && boonMods.scorchDps > 0) {
              e.scorchTickAccum -= 0.45;
              const burnDmg = Math.max(4, Math.round(boonMods.scorchDps * 0.45));
              e.hp = Math.max(0, e.hp - burnDmg);
              spawnParticles(e.x, e.y - 28, 4, '#ff6a2b', 65, 3.0, -40);
              spawnFloatingText(e.x, e.y - 44, `SCORCH -${burnDmg}`, '#ff7849', 0.82);
            }
          }

          const nextEx = e.x + e.vx * simDt;
          const nextEy = e.y + e.vy * simDt;
          const enemySpeedBeforeClamp = Math.hypot(e.vx, e.vy);

          const enemyConstraint = constrainActorToChamber(
            nextEx,
            nextEy,
            e.vx,
            e.vy,
            worldW,
            worldH,
            sim.chamberIndex,
            false,
            e.isBoss,
            e.isBoss ? 28 : 20
          );

          // Hades-Style Isometric Wall / Chasm-Ledge Slam Stagger when knocked into perimeter!
          if (
            (enemyConstraint.hitOuterWall || enemyConstraint.hitChasmEdge) &&
            enemySpeedBeforeClamp > 85 &&
            e.hitFlashTimer > 0
          ) {
            const slamDmg = e.isBoss ? 55 : 45;
            e.hp = Math.max(0, e.hp - slamDmg);
            const posRes = applyPostureDamage({
              currentPosture: e.posture,
              maxPosture: e.maxPosture,
              postureDamage: 82,
              alreadyBroken: e.postureBrokenTimer > 0,
            });
            e.posture = posRes.nextPosture;
            if (posRes.triggeredBreak) {
              e.postureBrokenTimer = 4.5;
              e.aiState = 'recover';
              e.aiTimer = 4.5;
            }
            e.vx = enemyConstraint.normalX * 65;
            e.vy = enemyConstraint.normalY * 65;
            sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.36);
            spawnShockwave(enemyConstraint.x, enemyConstraint.y, 88, '#ffd86b', 0.34);
            spawnParticles(enemyConstraint.x, enemyConstraint.y - 20, 20, '#ffd86b', 175, 4.4, 130);
            spawnFloatingText(
              enemyConstraint.x,
              enemyConstraint.y - 68,
              `POBI · WALL SLAM! -${slamDmg}`,
              '#ffd86b',
              1.18
            );
          } else {
            e.vx = enemyConstraint.vx;
            e.vy = enemyConstraint.vy;
          }

          e.x = enemyConstraint.x;
          e.y = enemyConstraint.y;

          // Check Death -> KO transition
          if (e.hp <= 0 && e.aiState !== 'ko') {
            e.aiState = 'ko';
            e.koTimer = 0.42;
            const baseKarma = e.isBoss ? 290 : e.type === 'furnace_titan' ? 62 : 34;
            const gainedKarma = Math.round(baseKarma * stats.karmaMultiplier);
            sim.ashenKarma += gainedKarma;
            sim.karmaRunDelta += gainedKarma;
            sim.score += e.isBoss ? 2500 : 280;
            soundEngine.playHit('heavy');

            // Trigger dramatic Hades Final-Blow Slow-Motion if Boss or last foe in chamber!
            const remainingAlive = sim.enemies.filter((foe) => foe.aiState !== 'ko' && foe.hp > 0).length;
            if (e.isBoss || (remainingAlive === 0 && sim.pendingSpawns.length === 0)) {
              sim.slowMoTimer = 0.36;
              sim.cameraZoom = BASE_CAMERA_ZOOM + 0.06;
              spawnShockwave(e.x, e.y, 185, '#ffd86b', 0.48);
            }

            spawnParticles(e.x, e.y - 26, e.isBoss ? 48 : 26, '#ff7b29', 220, 5, 140);
            spawnFloatingText(
              e.x,
              e.y - 68,
              `+${gainedKarma} KARMA`,
              '#3ee0a8',
              e.isBoss ? 1.3 : 1.05,
              e.isBoss ? 'SOVEREIGN VANQUISHED!' : undefined
            );
            continue;
          }

          if (e.aiState === 'ko') {
            e.koTimer -= simDt;
            e.scaleX = 1.25;
            e.scaleY = Math.max(0.15, e.koTimer / 0.42);
            if (e.koTimer <= 0) {
              sim.enemies.splice(i, 1);
            }
            continue;
          }

          // Boss Phase Transition Check (Vrikodara shatters his iron armor in Phase 2!)
          if (e.isBoss) {
            const nextPhase = computeBossPhase(e.hp, e.maxHp);
            if (nextPhase > e.phase) {
              e.phase = nextPhase;
              e.posture = e.maxPosture;
              e.immobilizedTimer = 0;
              sim.slowMoTimer = 0.32;
              sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.65);
              sim.screenFlashAlpha = 0.25;
              sim.screenFlashColor = '#ff521b';
              soundEngine.playGong('chamber');
              spawnShockwave(e.x, e.y, 195, '#ff5924', 0.45);
              sim.craters.push({
                x: e.x,
                y: e.y + 6,
                radius: 115,
                alpha: 0.92,
                decalFrame: e.type === 'xuemo' ? 0 : 3,
                angle: 0,
              });
              spawnParticles(e.x, e.y - 38, 42, '#ff5924', 240, 5.5, 80);
              spawnFloatingText(
                e.x,
                e.y - 95,
                e.type === 'vrikodara' && e.phase === 2
                  ? 'IRON ARMOR SHATTERED · COLOSSAL STATURE UNSEALED (1.25x)!'
                  : e.phase === 3
                  ? 'PHASE 3/3 · APOCALYPTIC TITAN TRANSFORMATION (1.42x)!'
                  : `PHASE ${e.phase}/3 · RAKSHASA WRATH AWAKENED!`,
                '#ff6a33',
                1.32
              );
              sim.bossPhaseBanner =
                e.type === 'vrikodara'
                  ? e.phase === 2
                    ? {
                        timer: 4.0,
                        title: 'VRIKODARA · PHASE II AWAKENING (1.25x STATURE)',
                        speaker: 'SANJAYA · PALIMPSEST OF KURUKSHETRA',
                        strikethrough: '“The righteous general fought with noble restraint...”',
                        correction:
                          'VRIKODARA: “MY IRON SHELL CRACKS! FEED THE ABDOMINAL FURNACE WITH ASH AND BONE!”',
                      }
                    : {
                        timer: 4.2,
                        title: 'VRIKODARA · PHASE III APOCALYPSE (1.42x TITAN)',
                        speaker: 'VRIKODARA · SOVEREIGN OF THE INFERNAL MAW',
                        strikethrough: '“And heaven blessed the victors of the eighteen days...”',
                        correction:
                          '“DRINK THE VAITARANI, RUDRA! TEN THOUSAND CHARIOTS BURN INSIDE MY RIBS!”',
                      }
                  : e.phase === 2
                  ? {
                      timer: 3.8,
                      title: 'DUNDUBHI · PHASE II BLOOD-DRUM RESONANCE (1.25x)',
                      speaker: 'DUNDUBHI · CHOLA BRONZE WAR-DEMON',
                      strikethrough: '“The temple bells rang in peaceful devotion...”',
                      correction:
                        '“BEAT THE RIBS OF THE SLAIN! BAIT MY HORNS INTO THESE PILLARS IF YOU DARE!”',
                    }
                  : {
                      timer: 4.0,
                      title: 'DUNDUBHI · PHASE III CATACLYSMIC STAMPEDE (1.42x)',
                      speaker: 'DUNDUBHI · WRATH OF THE BLEEDING CROWN',
                      strikethrough: '“The bull of dharma knelt before the altar...”',
                      correction:
                        '“NO PILLAR CAN HOLD ME NOW! EVERY STEP SHATTERS THE MANDALA!”',
                    };
              if (e.type === 'vrikodara' && e.phase >= 2) {
                sim.slagFissures.push({
                  x1: e.x - 240,
                  y1: e.y - 70,
                  x2: e.x + 240,
                  y2: e.y + 70,
                  width: 38,
                  life: 7.5,
                  maxLife: 7.5,
                });
              }
            }
          }

          if (e.tuskLodgedTimer && e.tuskLodgedTimer > 0) {
            e.tuskLodgedTimer = Math.max(0, e.tuskLodgedTimer - simDt);
          }
          if (e.vacuumActiveTimer && e.vacuumActiveTimer > 0) {
            e.vacuumActiveTimer = Math.max(0, e.vacuumActiveTimer - simDt);
          }

          if (e.postureBrokenTimer > 0) {
            e.vx = 0;
            e.vy = 0;
            e.postureBrokenTimer -= simDt;
            if (e.postureBrokenTimer <= 0) {
              e.posture = Math.round(e.maxPosture * 0.65);
              e.aiState = 'chase';
            }
            continue;
          }

          if (e.immobilizedTimer > 0) {
            e.vx = 0;
            e.vy = 0;
            e.immobilizedTimer -= simDt;
            continue;
          }

          // Target either active Cloud Step decoy or Player
          const targetX = sim.decoy.active ? sim.decoy.x : p.x;
          const targetY = sim.decoy.active ? sim.decoy.y : p.y;
          const dx = targetX - e.x;
          const dy = targetY - e.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (e.aiState !== 'windup' && e.aiState !== 'attack') {
            e.facing = dx >= 0 ? 1 : -1;
            // Smooth 360-degree yaw tracking toward Rudra during idle, chase, and recover so 3D bosses never snap or face stale directions
            const desiredAngle = Math.atan2(dy, dx);
            let angleDiff = desiredAngle - e.aimAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            e.aimAngle += angleDiff * Math.min(1, (e.isBoss ? 7.5 : 6.0) * simDt);
          }

          if (e.aiState === 'idle' || e.aiState === 'chase') {
            e.aiTimer -= simDt;
            const prevEx = e.x;
            const prevEy = e.y;

            // Distinct movement policies per enemy archetype
            if (e.type === 'wolf_guai') {
              const perpX = -dy / dist;
              const perpY = dx / dist;
              const moveSpd = 166;
              if (dist > 74) {
                e.x += ((dx / dist) * 0.85 + perpX * 0.35) * moveSpd * simDt;
                e.y += ((dy / dist) * 0.85 + perpY * 0.35) * moveSpd * 0.82 * simDt;
              }
            } else if (e.type === 'fire_monk') {
              const moveSpd = 124;
              if (dist > 195) {
                e.x += (dx / dist) * moveSpd * simDt;
                e.y += (dy / dist) * moveSpd * 0.82 * simDt;
              } else if (dist < 115) {
                e.x -= (dx / dist) * moveSpd * 0.7 * simDt;
                e.y -= (dy / dist) * moveSpd * 0.7 * simDt;
              }
            } else if (e.type === 'stone_golem' || e.type === 'furnace_titan') {
              const moveSpd = e.type === 'furnace_titan' ? 102 : 92;
              if (dist > 96) {
                e.x += (dx / dist) * moveSpd * simDt;
                e.y += (dy / dist) * moveSpd * 0.82 * simDt;
              }
            } else if (e.isBoss) {
              const bossSpd = (e.type === 'vrikodara' ? 168 : 142) * (1 + (e.phase - 1) * 0.16);
              if (dist > 118) {
                e.x += (dx / dist) * bossSpd * simDt;
                e.y += (dy / dist) * bossSpd * 0.82 * simDt;
              }
            }

            if (simDt > 0.0001) {
              e.vx = (e.x - prevEx) / simDt;
              e.vy = (e.y - prevEy) / simDt;
            } else {
              e.vx = 0;
              e.vy = 0;
            }
            const movedSpeed = Math.hypot(e.vx, e.vy);
            e.aiState = movedSpeed > 14 ? 'chase' : 'idle';

            // Active Parry / Guard Stance: Armored enemies & bosses raise their guard when Rudra approaches or attacks!
            const canGuard = e.isBoss || e.type === 'stone_golem' || e.type === 'furnace_titan' || e.trait === 'vajra_shield';
            if (canGuard && dist < 175 && p.action === 'light_attack' && e.parryStanceTimer <= 0 && Math.random() < (e.isBoss ? 0.08 : 0.045)) {
              e.parryStanceTimer = e.isBoss ? 1.15 : 0.95;
              spawnFloatingText(e.x, e.y - 78, 'IRON GUARD RAISED!', '#ffd86b', 0.95);
            }

            const triggerDist =
              e.type === 'fire_monk' ? 285 : e.isBoss ? 265 : e.type === 'wolf_guai' ? 175 : 155;

            if (e.aiTimer <= 0 && dist <= triggerDist && (activeAttackers < 2 || e.isBoss)) {
              activeAttackers++;
              e.aiState = 'windup';
              e.parryStanceTimer = 0;
              // 6 distinct attack patterns for Bosses so they never spam 2-3 moves!
              e.attackPattern = (e.attackPattern + 1) % (e.isBoss ? 6 : 3);
              const windupDur = e.isBoss
                ? Math.max(0.38, 0.64 - (e.phase - 1) * 0.08)
                : e.type === 'wolf_guai'
                ? 0.48
                : 0.58;
              e.aiTimer = windupDur;
              e.windupDuration = windupDur;
              e.telegraphX = e.x;
              e.telegraphY = e.y;
              // Predictive velocity-lead targeting so enemies aim where Rudra is moving!
              const leadX = targetX + p.vx * 0.22;
              const leadY = targetY + p.vy * 0.22;
              e.aimAngle = Math.atan2(leadY - e.y, leadX - e.x);
              e.facing = leadX - e.x >= 0 ? 1 : -1;

              // Assign Hades-Style Geometric Telegraph Shapes & Boss 6-Move Combos
              if (e.type === 'wolf_guai') {
                if (e.attackPattern === 1 && dist > 75) {
                  e.attackKind = 'corridor';
                  const cLen = 235;
                  e.corridorEndX = Math.max(minX, Math.min(maxX, e.x + Math.cos(e.aimAngle) * cLen));
                  e.corridorEndY = Math.max(minY, Math.min(maxY, e.y + Math.sin(e.aimAngle) * cLen));
                } else {
                  e.attackKind = 'cone';
                  e.telegraphRadius = 118;
                }
                e.comboHitsRemaining = e.trait === 'rakshasa_frenzy' ? 1 : 0;
              } else if (e.type === 'fire_monk') {
                e.attackKind = 'cone';
                e.telegraphRadius = 135;
                e.comboHitsRemaining = 0;
              } else if (e.type === 'stone_golem' || e.type === 'furnace_titan') {
                if (e.attackPattern === 2) {
                  e.attackKind = 'shockwave';
                  e.telegraphRadius = e.type === 'furnace_titan' ? 175 : 150;
                } else {
                  e.attackKind = 'cone';
                  e.telegraphRadius = e.type === 'furnace_titan' ? 155 : 138;
                }
                e.comboHitsRemaining = e.type === 'furnace_titan' ? 1 : 0;
              } else if (e.isBoss) {
                const scaleMult = e.growthScale || 1;
                if (e.attackPattern === 0 || e.attackPattern === 3) {
                  e.attackKind = 'cone';
                  e.telegraphRadius = Math.round((e.type === 'vrikodara' ? 185 : 175) * scaleMult);
                  e.comboHitsRemaining = e.phase >= 3 ? 2 : e.phase === 2 ? 1 : 0;
                } else if (e.attackPattern === 1 || e.attackPattern === 4) {
                  e.attackKind = 'corridor';
                  const cLen = Math.round((e.type === 'vrikodara' ? 340 : 300) * scaleMult);
                  e.corridorEndX = Math.max(minX, Math.min(maxX, e.x + Math.cos(e.aimAngle) * cLen));
                  e.corridorEndY = Math.max(minY, Math.min(maxY, e.y + Math.sin(e.aimAngle) * cLen));
                  e.comboHitsRemaining = e.phase >= 2 ? 1 : 0;
                } else {
                  e.attackKind = 'shockwave';
                  e.telegraphRadius = Math.round((e.type === 'vrikodara' ? 210 : 195) * scaleMult);
                  e.comboHitsRemaining = e.attackPattern === 5 && e.phase >= 2 ? 1 : 0;
                }
              }

              soundEngine.playTelegraph();
            }
          } else if (e.aiState === 'windup') {
            e.vx = 0;
            e.vy = 0;
            e.aiTimer -= simDt;
            e.scaleX = 1.04;
            e.scaleY = 0.95;

            // Continuous Predictive Player Tracking during the first 68% of windup!
            // Enemies are no longer blind: they actively pivot toward Rudra's movement until the final lock-in!
            const windupElapsedRatio = 1 - e.aiTimer / Math.max(0.05, e.windupDuration);
            if (windupElapsedRatio < 0.68) {
              const leadX = targetX + p.vx * 0.24;
              const leadY = targetY + p.vy * 0.24;
              const desiredAngle = Math.atan2(leadY - e.y, leadX - e.x);
              let angleDiff = desiredAngle - e.aimAngle;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              const trackSpeed = e.isBoss ? 5.8 : 4.6;
              e.aimAngle += angleDiff * Math.min(1, trackSpeed * simDt);
              e.facing = Math.cos(e.aimAngle) >= 0 ? 1 : -1;
              if (e.attackKind === 'corridor') {
                const cLen = e.isBoss ? 320 * (e.growthScale || 1) : 230;
                e.corridorEndX = Math.max(minX, Math.min(maxX, e.telegraphX + Math.cos(e.aimAngle) * cLen));
                e.corridorEndY = Math.max(minY, Math.min(maxY, e.telegraphY + Math.sin(e.aimAngle) * cLen));
              }
            }

            // Vrikodara Abdominal Furnace Vacuum Maw: pulls Rudra inward during shockwave windup!
            if (e.type === 'vrikodara' && e.attackKind === 'shockwave' && dist > 48 && dist < 360) {
              e.vacuumActiveTimer = 0.25;
              const pullStrength = (e.phase >= 2 ? 138 : 98) * simDt;
              const invD = 1 / Math.max(1, dist);
              p.x = Math.max(minX, Math.min(maxX, p.x + (e.x - p.x) * invD * pullStrength));
              p.y = Math.max(minY, Math.min(maxY, p.y + (e.y - p.y) * invD * pullStrength));
              if (Math.random() < 0.35) {
                spawnParticles(p.x, p.y - 18, 1, '#ff7b24', 65, 2.5, 0);
              }
            }

            if (e.aiTimer <= 0) {
              e.aiState = 'attack';
              e.aiTimer = e.isBoss ? 0.40 : 0.24;
              e.scaleX = 1.14;
              e.scaleY = 0.88;
              e.slashArcAlpha = 1.0;

              // Execute Enemy/Boss Attack with distinct multi-projectile patterns!
              if (e.type === 'fire_monk' && dist > 110) {
                const spreadCount = e.trait === 'agni_aura' ? 3 : 1;
                for (let s = 0; s < spreadCount; s++) {
                  const proj = sim.projectiles.find((pr) => !pr.active);
                  if (proj) {
                    const spreadAngle = e.aimAngle + (s - Math.floor(spreadCount / 2)) * 0.22;
                    proj.active = true;
                    proj.x = e.x;
                    proj.y = e.y - 24;
                    proj.vx = Math.cos(spreadAngle) * 340;
                    proj.vy = Math.sin(spreadAngle) * 340;
                    proj.radius = 10.5;
                    proj.damage = 24;
                    proj.color = '#ff5224';
                    proj.life = 2.6;
                    proj.deflected = false;
                  }
                }
              } else if (e.type === 'xuemo' && (e.attackPattern === 1 || e.attackPattern === 4)) {
                // Dundubhi beats his bronze war-drum chest and spawns ring of Sonic War-Drum Crescent Waves
                soundEngine.playDundubhiWarDrum();
                const orbCount = e.phase >= 2 ? 10 : 7;
                for (let k = 0; k < orbCount; k++) {
                  const pr = sim.projectiles.find((item) => !item.active);
                  if (pr) {
                    const ang = (k / orbCount) * Math.PI * 2 + e.animTime;
                    pr.active = true;
                    pr.x = e.x + Math.cos(ang) * 44;
                    pr.y = e.y - 24 + Math.sin(ang) * 32;
                    pr.vx = Math.cos(ang) * 235;
                    pr.vy = Math.sin(ang) * 195;
                    pr.radius = 12;
                    pr.damage = 28;
                    pr.color = '#ffbe3b';
                    pr.life = 3.2;
                    pr.deflected = false;
                  }
                }
              } else if (e.type === 'vrikodara' && e.phase >= 2 && (e.attackPattern === 2 || e.attackPattern === 5)) {
                // Vrikodara Phase 2/3 unleashes a 5-way Trident Fire-Lance Fan!
                const fanCount = e.phase === 3 ? 7 : 5;
                for (let k = 0; k < fanCount; k++) {
                  const pr = sim.projectiles.find((item) => !item.active);
                  if (pr) {
                    const ang = e.aimAngle + (k - Math.floor(fanCount / 2)) * 0.24;
                    pr.active = true;
                    pr.x = e.x + Math.cos(ang) * 48;
                    pr.y = e.y - 28 + Math.sin(ang) * 32;
                    pr.vx = Math.cos(ang) * 310;
                    pr.vy = Math.sin(ang) * 280;
                    pr.radius = 12.5;
                    pr.damage = 32;
                    pr.color = '#ff3824';
                    pr.life = 2.8;
                    pr.deflected = false;
                  }
                }
              }

              // Geometric Hit Detection using pure unit-tested rules!
              let playerHit = false;
              let isGroundQuake = false;
              const isElevatedImmune = p.stance === 'pillar' && p.elevationY > 10;

              if (e.attackKind === 'corridor') {
                // Dash enemy along the corridor!
                const originX = e.telegraphX;
                const originY = e.telegraphY;
                const halfW = e.isBoss ? 52 : 38;
                playerHit = isPointInDashCorridor({
                  px: p.x,
                  py: p.y,
                  startX: originX,
                  startY: originY,
                  endX: e.corridorEndX,
                  endY: e.corridorEndY,
                  halfWidth: halfW,
                });
                e.x = Math.max(minX, Math.min(maxX, e.corridorEndX));
                e.y = Math.max(minY, Math.min(maxY, e.corridorEndY));

                // Check Dundubhi Pillar-Baiting Tusk-Lodge & Armor Crack Mechanic (v7 Section 9)!
                if (e.type === 'xuemo') {
                  let hitPillar = false;
                  for (const pr of sim.props) {
                    if (!pr.destroyed && pr.type === 'dragon_pillar') {
                      const hitCorridor = isPointInDashCorridor({
                        px: pr.x,
                        py: pr.y,
                        startX: originX,
                        startY: originY,
                        endX: e.x,
                        endY: e.y,
                        halfWidth: 74,
                      });
                      if (hitCorridor || Math.hypot(pr.x - e.x, pr.y - e.y) < 95) {
                        pr.hp = 0;
                        pr.destroyed = true;
                        pr.hitFlashTimer = 0.25;
                        hitPillar = true;
                        spawnParticles(pr.x, pr.y - 36, 32, '#d4a548', 240, 5.5, 95);
                      }
                    }
                  }
                  const intactPillarsLeft = sim.props.some(
                    (pr) => !pr.destroyed && pr.type === 'dragon_pillar'
                  );
                  const hitArenaWall =
                    !intactPillarsLeft &&
                    (e.x <= minX + 12 || e.x >= maxX - 12 || e.y <= minY + 12 || e.y >= maxY - 12);

                  if (hitPillar || (hitArenaWall && !e.armorCracked)) {
                    e.armorCracked = true;
                    const pillarDmg = 280;
                    e.hp = Math.max(1, e.hp - pillarDmg);
                    e.posture = 0;
                    e.tuskLodgedTimer = 3.0;
                    e.postureBrokenTimer = 3.0;
                    e.comboHitsRemaining = 0;
                    e.aiState = 'recover';
                    e.aiTimer = 3.0;
                    e.hitFlashTimer = 0.3;
                    sim.hitstopTimer = 0.11;
                    sim.cameraShakeTrauma = 1.0;
                    soundEngine.playHit('heavy');
                    spawnShockwave(e.x, e.y, 165, '#ff6a2b', 0.48);
                    spawnParticles(e.x, e.y - 32, 42, '#ff9233', 260, 6, 110);
                    spawnFloatingText(
                      e.x,
                      e.y - 96,
                      `TUSKS LODGED FOR 3.0s! WAR-DRUM ARMOR CRACKED (-${pillarDmg})`,
                      '#ffd86b',
                      1.38,
                      'STRIKE THE BRONZE DRUM OR PRESS [F] TO EXECUTE'
                    );
                  }
                }

                damagePropsNearPoint(e.x, e.y, 85, 95);
                sim.craters.push({
                  x: e.x,
                  y: e.y + 4,
                  radius: e.isBoss ? 86 : 58,
                  alpha: 0.88,
                  decalFrame: e.type === 'xuemo' ? 0 : 3,
                  angle: e.aimAngle,
                });
                if (sim.craters.length > 10) sim.craters.shift();
              } else if (e.attackKind === 'shockwave') {
                isGroundQuake = true;
                playerHit = isPointInShockwaveRing({
                  px: p.x,
                  py: p.y,
                  centerX: e.x,
                  centerY: e.y,
                  outerRadius: e.telegraphRadius,
                  elevatedImmune: false, // Checked below so we can show the elevated callout!
                });
                damagePropsNearPoint(e.x, e.y, e.telegraphRadius, 120);
                spawnShockwave(
                  e.x,
                  e.y,
                  e.telegraphRadius * 1.05,
                  e.type === 'xuemo' ? '#ff384c' : '#ff9233',
                  0.42
                );
                // v7 Section 9: Vrikodara Phase 2 vomits molten slag that cools into glowing fissures splitting the arena!
                if (e.type === 'vrikodara' && e.phase >= 2) {
                  sim.slagFissures.push({
                    x1: e.x,
                    y1: e.y,
                    x2: e.x + Math.cos(e.aimAngle) * 280,
                    y2: e.y + Math.sin(e.aimAngle) * 210,
                    width: 34,
                    life: 6.5,
                    maxLife: 6.5,
                  });
                }
                sim.craters.push({
                  x: e.x,
                  y: e.y + 6,
                  radius: e.telegraphRadius * 0.72,
                  alpha: 0.92,
                  decalFrame: e.type === 'xuemo' ? 0 : 2,
                  angle: 0,
                });
                if (sim.craters.length > 10) sim.craters.shift();
              } else {
                // Directional Frontal Cone Cleave ('cone')
                const halfArc = e.isBoss ? Math.PI * 0.42 : Math.PI * 0.36;
                playerHit = isPointInConeTelegraph({
                  px: p.x,
                  py: p.y,
                  originX: e.x,
                  originY: e.y,
                  aimAngle: e.aimAngle,
                  radius: e.telegraphRadius,
                  halfAngleRad: halfArc,
                });
                // Forward lunge step on cleave
                e.x = Math.max(minX, Math.min(maxX, e.x + Math.cos(e.aimAngle) * 28));
                e.y = Math.max(minY, Math.min(maxY, e.y + Math.sin(e.aimAngle) * 22));
                damagePropsNearPoint(
                  e.x + Math.cos(e.aimAngle) * 65,
                  e.y + Math.sin(e.aimAngle) * 45,
                  75,
                  80
                );
                if (e.isBoss || e.type === 'furnace_titan' || e.type === 'stone_golem') {
                  sim.craters.push({
                    x: e.x + Math.cos(e.aimAngle) * 56,
                    y: e.y + Math.sin(e.aimAngle) * 34 + 6,
                    radius: e.isBoss ? 84 : 64,
                    alpha: 0.86,
                    decalFrame: e.type === 'vrikodara' ? 3 : 1,
                    angle: e.aimAngle,
                  });
                  if (sim.craters.length > 10) sim.craters.shift();
                }
              }

              spawnParticles(
                e.x,
                e.y - 14,
                e.isBoss ? 28 : 16,
                e.isBoss ? '#ff3d2e' : '#ff8a36',
                185,
                4.5,
                120
              );

              if (playerHit) {
                // Check if Pillar Stance elevates above ground quake
                if (isGroundQuake && isElevatedImmune) {
                  spawnFloatingText(
                    p.x,
                    p.y - 72,
                    'PILLAR STANCE · ELEVATED ABOVE QUAKE!',
                    '#ffd86b',
                    1.08
                  );
                } else if (p.action === 'parry') {
                  // Rock Solid Deflection! Cancels remaining boss combo hits!
                  soundEngine.playSpell('parry');
                  e.posture = Math.max(0, e.posture - Math.round(340 * boonMods.postureDamageMultiplier));
                  e.hitFlashTimer = 0.14;
                  e.comboHitsRemaining = 0;
                  e.aiState = 'recover';
                  e.aiTimer = 1.65;
                  if (p.focusOrbs < 4) p.focusOrbs += 1;
                  sim.hitstopTimer = 0.075;
                  sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.48);
                  spawnShockwave(p.x, p.y, 110, '#ffd86b', 0.32);
                  spawnParticles(p.x, p.y - 26, 28, '#ffd86b', 220, 5, 80);
                  spawnFloatingText(
                    p.x,
                    p.y - 76,
                    'ROCK SOLID · PARRY STAGGER! +1 FOCUS',
                    '#ffd86b',
                    1.22
                  );
                  if (e.posture <= 0) {
                    e.postureBrokenTimer = 4.5;
                    spawnFloatingText(
                      e.x,
                      e.y - 84,
                      'POSTURE BROKEN! [F] EXECUTE',
                      '#ff4d3b',
                      1.22
                    );
                  }
                } else if (p.invulnTimer <= 0) {
                  const rawDmg = e.isBoss ? 34 + e.phase * 5 : e.type === 'furnace_titan' ? 28 : 20;
                  p.hp = Math.max(0, p.hp - rawDmg);
                  p.hitFlashTimer = 0.09;
                  sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.38);
                  soundEngine.playHit('heavy');
                  spawnParticles(p.x, p.y - 22, 16, '#ff3824', 165, 4.5, 130);
                  spawnFloatingText(p.x, p.y - 62, `-${rawDmg} HP`, '#ff5252', 1.1);
                }
              }
            }
          } else if (e.aiState === 'attack') {
            e.vx = 0;
            e.vy = 0;
            e.aiTimer -= simDt;
            if (e.aiTimer <= 0) {
              // Boss Multi-Hit Combo Chain in Phase 2 & Phase 3!
              if (e.comboHitsRemaining > 0 && e.hp > 0) {
                e.comboHitsRemaining -= 1;
                e.aiState = 'windup';
                const chainDur = 0.35;
                e.aiTimer = chainDur;
                e.windupDuration = chainDur;
                e.telegraphX = e.x;
                e.telegraphY = e.y;
                e.aimAngle = Math.atan2(targetY - e.y, targetX - e.x);
                e.facing = targetX - e.x >= 0 ? 1 : -1;
                e.attackKind = e.comboHitsRemaining === 0 && e.phase === 3 ? 'shockwave' : 'cone';
                e.telegraphRadius = 170;
                soundEngine.playTelegraph();
              } else {
                e.aiState = 'recover';
                e.aiTimer = e.isBoss ? 0.9 : 1.1;
              }
            }
          } else if (e.aiState === 'recover') {
            e.vx = 0;
            e.vy = 0;
            e.aiTimer -= simDt;
            if (e.aiTimer <= 0) {
              e.aiState = 'chase';
              e.aiTimer = e.isBoss ? 0.68 : 0.98;
            }
          }
        }

        // Enemy-to-Enemy & Enemy-to-Player Separation (prevents enemies stacking on top of Wukong)
        for (let i = 0; i < sim.enemies.length; i++) {
          const a = sim.enemies[i];
          if (a.aiState === 'ko') continue;

          // Keep a clean martial-arts personal-space ring around the Destined One
          const pdx = a.x - p.x;
          const pdy = (a.y - p.y) * 1.35;
          const pDist = Math.hypot(pdx, pdy);
          const minPlayerSep = a.isBoss ? 64 : 52;
          if (pDist < minPlayerSep) {
            const safeDist = pDist || 1;
            const nx = pDist > 0.1 ? pdx / safeDist : a.facing * -1;
            const ny = pDist > 0.1 ? (a.y - p.y) / safeDist : 0.35;
            const push = (minPlayerSep - pDist) * 8.5 * simDt;
            a.x = Math.max(minX, Math.min(maxX, a.x + nx * push));
            a.y = Math.max(minY, Math.min(maxY, a.y + ny * push));
          }

          // Spread enemies apart from each other so they encircle rather than overlap
          for (let j = i + 1; j < sim.enemies.length; j++) {
            const b = sim.enemies[j];
            if (b.aiState === 'ko') continue;
            const edx = b.x - a.x;
            const edy = (b.y - a.y) * 1.35;
            const eDist = Math.hypot(edx, edy);
            const minEnemySep = 62;
            if (eDist < minEnemySep) {
              const safeEDist = eDist || 1;
              const enx = eDist > 0.1 ? edx / safeEDist : 1;
              const eny = eDist > 0.1 ? (b.y - a.y) / safeEDist : 0.4;
              const epush = (minEnemySep - eDist) * 4.5 * simDt;
              a.x = Math.max(minX, Math.min(maxX, a.x - enx * epush));
              a.y = Math.max(minY, Math.min(maxY, a.y - eny * epush));
              b.x = Math.max(minX, Math.min(maxX, b.x + enx * epush));
              b.y = Math.max(minY, Math.min(maxY, b.y + eny * epush));
            }
          }
        }

        // Check Player Defeat or Life-Saving Strand Revive
        if (p.hp <= 0) {
          if (p.extraLives > 0) {
            p.extraLives -= 1;
            p.hp = Math.round(p.maxHp * 0.7);
            p.displayHp = p.hp;
            p.invulnTimer = 2.0;
            soundEngine.playSpell('clones');
            spawnParticles(p.x, p.y - 26, 36, '#ffd86b', 220, 5, 40);
            spawnFloatingText(
              p.x,
              p.y - 82,
              'MRITYUNJAYA MANTRA · DEATHLESS REVIVE!',
              '#ffd86b',
              1.3
            );
          } else {
            // v7 Section 5 & 28: On death, Rudra wakes on the boards of Savitri's Boat with her dimmer lantern
            const nextDeaths = sim.storyFlags.deaths + 1;
            const nextFlags: StoryMemoryFlags = {
              ...sim.storyFlags,
              deaths: nextDeaths,
            };
            sim.storyFlags = nextFlags;
            saveStoryMemoryFlags(nextFlags);
            setStoryFlags(nextFlags);
            setAshenKarma(sim.ashenKarma);
            try {
              window.localStorage.setItem(
                'kaliyuga_save_v1',
                JSON.stringify({ ashenKarma: sim.ashenKarma, ranks: sim.ranks })
              );
            } catch {}
            soundEngine.playGong('defeat');
            setSliceStage('vaitarani_hub');
          }
        }

        // Check Multi-Wave Summoning Rifts & Chamber Clear Progression
        const activeInWave = sim.enemies.filter((e) => e.aiState !== 'ko').length + sim.pendingSpawns.length + sim.summoningRifts.length;
        if (activeInWave === 0 && sim.waveQueue.length > 0 && sim.state === 'playing') {
          sim.currentWave += 1;
          const nextWaveSpecs = sim.waveQueue.filter((w) => w.wave === sim.currentWave);
          sim.waveQueue = sim.waveQueue.filter((w) => w.wave !== sim.currentWave);
          for (const sp of nextWaveSpecs) {
            sim.summoningRifts.push({
              x: sp.x * worldW,
              y: sp.y * worldH,
              timer: 1.15 + sp.delay,
              maxTimer: 1.15 + sp.delay,
              type: sp.type,
              trait: sp.trait,
            });
          }
          soundEngine.playGong('chamber');
          spawnFloatingText(
            p.x,
            p.y - 95,
            `WAVE ${sim.currentWave}/${sim.maxWave} · ASURA REINFORCEMENTS SUMMONED!`,
            '#ff7b29',
            1.22
          );
        }

        const totalRemaining =
          sim.enemies.length + sim.pendingSpawns.length + sim.summoningRifts.length + sim.waveQueue.length;
        if (totalRemaining === 0 && sim.state === 'playing') {
          if (sim.chamberClearTimer === 0) {
            sim.chamberClearTimer = 0.01;
            const clearBonus = chamberSpec.isBossChamber ? 180 : 65;
            sim.ashenKarma += clearBonus;
            sim.karmaRunDelta += clearBonus;
            sim.score += chamberSpec.isBossChamber ? 1500 : 500;
            setAshenKarma(sim.ashenKarma);
            try {
              window.localStorage.setItem(
                'kaliyuga_save_v1',
                JSON.stringify({ ashenKarma: sim.ashenKarma, ranks: sim.ranks })
              );
            } catch {}

            // Grant +1 Celestial Boon Offer on every Chamber Clear before the final Boss!
            if (sim.chamberIndex < CHAMBERS.length - 1) {
              sim.boonReadyCount += 1;
              setBoonReadyCount(sim.boonReadyCount);
            }

            if (sim.chamberIndex === 3) {
              spawnFloatingText(
                p.x,
                p.y - 105,
                'DUNDUBHI VANQUISHED · WAR-DRUM SILENCED!',
                '#ffd86b',
                1.35,
                'SAVITRI KNEELS BY THE BRONZE DRUM SKIN...'
              );
              if (!sim.storyFlags.dundubhiCleared) {
                setSliceStage('dundubhi_aftermath');
              }
            } else if (sim.chamberIndex < CHAMBERS.length - 1) {
              spawnFloatingText(
                p.x,
                p.y - 105,
                `CHAMBER ${sim.chamberIndex + 1}/${CHAMBERS.length} CLEARED! +${clearBonus} KARMA`,
                '#3ee0a8',
                1.25,
                'WALK INTO LEFT GATE (ASURA BOON) OR RIGHT GATE (AMRITA + MAX HP)'
              );
            }
          } else {
            sim.chamberClearTimer += simDt;
            const chGeom = getChamberGeometry(sim.chamberIndex);
            const leftGateX = worldW * chGeom.leftGate.x;
            const leftGateY = worldH * chGeom.leftGate.y;
            const rightGateX = worldW * chGeom.rightGate.x;
            const rightGateY = worldH * chGeom.rightGate.y;
            const enteredLeftGate = Math.hypot(p.x - leftGateX, p.y - leftGateY) < 104;
            const enteredRightGate = Math.hypot(p.x - rightGateX, p.y - rightGateY) < 104;

            if (sim.chamberIndex === CHAMBERS.length - 1) {
              if (sim.chamberClearTimer >= 1.1) {
                setAshenKarma(sim.ashenKarma);
                soundEngine.playGong('victory');
                setSliceStage('shard1_memory');
              }
            } else if (enteredRightGate) {
              // Player chose Right Gate: Amrita Kalasha Max HP +30 & +95 Karma Cache!
              p.maxHp += 30;
              p.hp = Math.min(p.maxHp, p.hp + 90);
              p.displayHp = p.hp;
              sim.ashenKarma += 95;
              sim.karmaRunDelta += 95;
              setAshenKarma(sim.ashenKarma);
              sim.boonReadyCount = 0;
              setBoonReadyCount(0);
              soundEngine.playSpell('gourd');
              loadChamber(sim.chamberIndex + 1, false);
            } else if (
              sim.boonReadyCount > 0 &&
              (enteredLeftGate || sim.chamberClearTimer >= 3.2)
            ) {
              // Player chose Left Gate (or timer elapsed): Present Hades Celestial Boon Altar!
              const offer = rollCelestialBoonOffer(sim.activeBoons);
              if (offer.length > 0) {
                setBoonChoices(offer);
                setBoonModalOpen(true);
                sim.modalPaused = true;
              } else {
                sim.boonReadyCount = 0;
                setBoonReadyCount(0);
                loadChamber(sim.chamberIndex + 1, false);
              }
            } else if (sim.chamberClearTimer >= 4.2) {
              loadChamber(sim.chamberIndex + 1, false);
            }
          }
        }
      }

      // Decay Chain Lightning Arcs
      for (let i = sim.lightningArcs.length - 1; i >= 0; i--) {
        sim.lightningArcs[i].life -= dt;
        if (sim.lightningArcs[i].life <= 0) {
          sim.lightningArcs.splice(i, 1);
        }
      }

      // Update Particles, Afterimages, Shockwaves, Craters, Weather Motes & Floating Texts in real dt
      for (let i = 0; i < sim.particles.length; i++) {
        const pt = sim.particles[i];
        if (!pt.active) continue;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += pt.gravity * dt;
        pt.life -= dt;
        pt.alpha = Math.max(0, pt.life / pt.maxLife);
        if (pt.life <= 0) pt.active = false;
      }

      for (let i = 0; i < sim.afterimages.length; i++) {
        const ai = sim.afterimages[i];
        if (!ai.active) continue;
        ai.life -= dt;
        if (ai.life <= 0) ai.active = false;
      }

      for (let i = 0; i < sim.shockwaves.length; i++) {
        const sw = sim.shockwaves[i];
        if (!sw.active) continue;
        sw.life -= dt;
        const progress = 1 - Math.max(0, sw.life / sw.maxLife);
        sw.radius = sw.maxRadius * (0.18 + 0.82 * (1 - Math.pow(1 - progress, 2.4)));
        if (sw.life <= 0) sw.active = false;
      }

      for (let i = 0; i < sim.craters.length; i++) {
        sim.craters[i].alpha = Math.max(0.22, sim.craters[i].alpha - dt * 0.045);
      }

      for (let i = 0; i < sim.ambientMotes.length; i++) {
        const m = sim.ambientMotes[i];
        m.phase += dt * 1.9;
        m.x += (m.vx + Math.sin(m.phase) * 9) * dt;
        m.y += m.vy * dt;
        if (m.y < -20) {
          m.y = ch + 20;
          m.x = Math.random() * cw;
        } else if (m.y > ch + 20) {
          m.y = -20;
          m.x = Math.random() * cw;
        }
        if (m.x < -20) m.x = cw + 20;
        if (m.x > cw + 20) m.x = -20;
      }

      for (let i = 0; i < sim.floatingTexts.length; i++) {
        const ft = sim.floatingTexts[i];
        if (!ft.active) continue;
        ft.x += ft.vx * dt;
        ft.y += ft.vy * dt;
        ft.vy += 95 * dt; // Subtle arc gravity so numbers pop up and arc cleanly
        ft.life -= dt;
        if (ft.life <= 0) ft.active = false;
      }

      // Decay Molten Slag Fissures (Vrikodara Phase 2 & Rakshasa Crushing Stance)
      for (let i = sim.slagFissures.length - 1; i >= 0; i--) {
        sim.slagFissures[i].life -= dt;
        if (sim.slagFissures[i].life <= 0) {
          sim.slagFissures.splice(i, 1);
        }
      }

      // ========================================================================
      // RENDER 2.5D ISOMETRIC WORLD & ACTORS (AAA HADES-GRADE CAMERA PIPELINE)
      // ========================================================================
      ctx.save();
      // Step 1: Render Deep Parallax Underworld Abyss (0.38x camera parallax lava/blood chasm & sunken pillars)
      renderParallaxAbyss(ctx, cw, ch, sim.camX, sim.camY, now, sim.chamberIndex);

      // Apply dynamic camera zoom & decaying trauma^2 camera shake around viewport center
      ctx.translate(cw * 0.5, ch * 0.5);
      if (Math.abs(sim.cameraZoom - 1) > 0.0005) {
        ctx.scale(sim.cameraZoom, sim.cameraZoom);
      }
      if (sim.cameraShakeTrauma > 0) {
        const shake = sim.cameraShakeTrauma * sim.cameraShakeTrauma * 18;
        ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      }
      ctx.translate(-cw * 0.5, -ch * 0.5);

      // ======================================================================
      // WORLD-SPACE CAMERA PASS (-sim.camX, -sim.camY over 1.54x Spacious Arena)
      // ======================================================================
      ctx.save();
      ctx.translate(-sim.camX, -sim.camY);

      const isChamberCleared =
        sim.chamberClearTimer > 0 &&
        sim.enemies.length === 0 &&
        sim.pendingSpawns.length === 0 &&
        sim.waveQueue.length === 0 &&
        sim.summoningRifts.length === 0;
      const nextSpec = CHAMBERS[sim.chamberIndex + 1];

      // Dynamic Chamber Background State Swap:
      // 1) Chamber VII swaps from Locked (u58tfju58tfju58t...) -> Unlocked (8jz0rn8jz0rn8jz0...) on clear!
      // 2) Final Boss Chamber VIII swaps from Naga Sanctum (25mxvb...) -> Cosmic Blood-Eclipse (9sbc7m...) in Phase 2/3!
      let activeBgUrl = chamberSpec.backgroundUrl;
      if (isChamberCleared && chamberSpec.unlockedBackgroundUrl) {
        activeBgUrl = chamberSpec.unlockedBackgroundUrl;
      } else if (
        activeBoss &&
        activeBoss.type === 'vrikodara' &&
        activeBoss.phase >= 2 &&
        chamberSpec.phase2BackgroundUrl
      ) {
        activeBgUrl = chamberSpec.phase2BackgroundUrl;
      }
      const bgImg =
        bgImagesRef.current.get(activeBgUrl) || bgImagesRef.current.get(chamberSpec.backgroundUrl);

      const decalsAsset = getProcessedSpriteSync(GAME_ASSETS.groundDecals2x2);
      const impactsAsset = getProcessedSpriteSync(GAME_ASSETS.combatImpacts2x2);
      const brazierFlameAsset = getProcessedSpriteSync(GAME_ASSETS.brazierFlame4x1);
      const flicker = 0.88 + Math.sin(now * 0.008) * 0.08 + Math.cos(now * 0.019) * 0.04;
      const primaryLightX = (chamberSpec.braziers[0]?.x ?? 0.5) * worldW;

      // Step 2: Render Hand-Painted 16:9 Isometric Arena, Exit Gate Archways, Reward Orbs & Surface Craters
      renderIsometricChamberPlatform(
        ctx,
        worldW,
        worldH,
        bgImg,
        chamberSpec.floorTint,
        sim.chamberIndex,
        now,
        isChamberCleared,
        Boolean(nextSpec?.isBossChamber),
        () => {
          // Subtle Atmospheric Edge Vignette to frame the hand-painted chamber
          ctx.save();
          const chamberGrade = ctx.createRadialGradient(
            worldW * 0.5,
            worldH * 0.52,
            worldW * 0.22,
            worldW * 0.5,
            worldH * 0.52,
            worldW * 0.62
          );
          chamberGrade.addColorStop(0, 'rgba(0, 0, 0, 0)');
          chamberGrade.addColorStop(0.75, 'rgba(6, 4, 5, 0.18)');
          chamberGrade.addColorStop(1, 'rgba(3, 2, 4, 0.58)');
          ctx.fillStyle = chamberGrade;
          ctx.fillRect(0, 0, worldW, worldH);
          ctx.restore();

          // 1.8. Draw Persistent Hand-Painted Shattered Molten Lava Craters (Frame 3 of combatImpacts2x2)
          for (let i = 0; i < sim.craters.length; i++) {
            const cr = sim.craters[i];
            ctx.save();
            ctx.translate(cr.x, cr.y);
            ctx.scale(1, 0.62);
            ctx.rotate(cr.angle || 0);
            ctx.globalAlpha = cr.alpha;

            if (impactsAsset && impactsAsset.frames.length >= 4) {
              const craterFrame = impactsAsset.frames[3]; // Bottom-Right: Shattered Obsidian Molten Lava Crater
              const drawSize = cr.radius * 2.35;
              ctx.drawImage(
                impactsAsset.cleanCanvas,
                craterFrame.sx,
                craterFrame.sy,
                craterFrame.sw,
                craterFrame.sh,
                -drawSize * 0.5,
                -drawSize * 0.5,
                drawSize,
                drawSize
              );
            }
            ctx.restore();
          }
        }
      );

      // Step 2.2: Interactive Hand-Painted 4-Stage Floor Traps (zhy8c6zhy8c6zhy8_5d2df495.png)
      updateAndRenderPressureTraps(
        ctx,
        sim.traps,
        simDt,
        now,
        sim.player,
        sim.enemies,
        {
          onTrapTriggered: (tx, ty) => {
            soundEngine.playTelegraph();
            spawnParticles(tx, ty - 8, 8, '#ffe14d', 90, 3.2, -30);
          },
          onTrapErupt: (trap, hitPlayer, enemiesHitCount) => {
            soundEngine.playHit('heavy');
            sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.32);
            const trapColor = trap.kind === 'agni_vent' ? '#ff6a18' : '#38e8ff';
            spawnShockwave(trap.x, trap.y, 112, trapColor, 0.36);
            spawnParticles(trap.x, trap.y - 24, 26, trapColor, 210, 4.6, 120);
            if (enemiesHitCount > 0) {
              spawnFloatingText(
                trap.x,
                trap.y - 72,
                trap.kind === 'agni_vent'
                  ? 'AGNI LOTUS VENT! -145'
                  : 'IRON SPIKE TRAP! -145',
                '#ffd86b',
                1.18
              );
            } else if (hitPlayer) {
              spawnFloatingText(sim.player.x, sim.player.y - 68, 'TRAP ERUPTION -24', '#ff5252', 1.05);
            }
          },
        }
      );

      // Step 2.3: Render v7 Act I [E] Look Artifact & Boss Mythic Mechanics (Molten Slag Fissures, Tusk Lodge, Furnace Vacuum)
      sim.nearestLookObject = renderAndFindChamberLookObject(
        ctx,
        chamberSpec.id,
        sim.player.x,
        sim.player.y,
        now * 0.001,
        sim.storyFlags.looks,
        false
      );
      renderBossMythicMechanics(
        ctx,
        now * 0.001,
        activeBoss
          ? {
              type: activeBoss.type,
              x: activeBoss.x,
              y: activeBoss.y,
              phase: activeBoss.phase,
              tuskLodgedTimer: activeBoss.tuskLodgedTimer,
              vacuumActiveTimer: activeBoss.vacuumActiveTimer,
            }
          : null,
        sim.slagFissures
      );

      // Step 2.4: Meru Engine v2.0 UE5 Lumen Global Illumination (GI) Ground Bounce Pass
      if (sim.graphicsSettings.lumenGiBounce) {
        const giEmitters: LumenLightEmitter[] = [];
        for (let bIdx = 0; bIdx < chamberSpec.braziers.length; bIdx++) {
          const b = chamberSpec.braziers[bIdx];
          giEmitters.push({
            x: b.x * worldW,
            y: b.y * worldH + 14,
            radius: b.radius * 1.45,
            color: b.color,
            intensity: 0.55,
          });
        }
        // Player Savitri Lantern & Focus Aura GI bounce
        const lanternCfg = getLanternLightState(sim.storyFlags);
        giEmitters.push({
          x: sim.player.x,
          y: sim.player.y + 8,
          radius: sim.player.transformTimer > 0 ? 195 : 135,
          color: sim.player.transformTimer > 0 ? '#ff5924' : lanternCfg.hex || '#ffaa44',
          intensity: sim.player.transformTimer > 0 ? 0.72 : 0.42,
        });
        // Active Boss Abdominal Furnace / Bronze Drum GI bounce
        if (activeBoss) {
          giEmitters.push({
            x: activeBoss.x,
            y: activeBoss.y + 12,
            radius: activeBoss.phase >= 2 ? 220 : 165,
            color: activeBoss.type === 'vrikodara' ? '#ff4a1c' : '#ffb838',
            intensity: activeBoss.phase >= 2 ? 0.68 : 0.48,
          });
        }
        renderWorldSpaceLumenGI(ctx, sim.graphicsSettings, giEmitters, now * 0.001);
      }

      // 2. Living Background Animation: 4-Frame Hand-Painted Roaring Agni Brazier Flame Flipbook (vqynauvqynauvqyn_da9af05e.png)
      ctx.save();
      chamberSpec.braziers.forEach((b, bIdx) => {
        const bx = b.x * worldW;
        const by = b.y * worldH;
        const r = b.radius * 1.35 * flicker;

        // Warm additive floor light pool around each brazier
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createRadialGradient(bx, by, 4, bx, by, r);
        grad.addColorStop(0, b.color + '78');
        grad.addColorStop(0.45, b.color + '28');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 12 FPS 4-Frame Hand-Painted Roaring Agni Flame Flipbook
        if (brazierFlameAsset && brazierFlameAsset.frames.length > 0) {
          const flameIdx =
            (Math.floor(now * 0.012) + bIdx) % brazierFlameAsset.frames.length;
          const ff = brazierFlameAsset.frames[flameIdx];
          const flameH = 128 * (0.94 + Math.sin(now * 0.015 + bIdx) * 0.06);
          const flameW = (ff.sw / Math.max(1, ff.sh)) * flameH;
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.translate(bx, by);
          ctx.drawImage(
            brazierFlameAsset.cleanCanvas,
            ff.sx,
            ff.sy,
            ff.sw,
            ff.sh,
            -flameW * 0.5,
            -flameH * 0.84,
            flameW,
            flameH
          );
          ctx.restore();
        }
      });

      // Draw Active Hades Multi-Wave Summoning Pentagram Rifts using Hand-Painted Ground Decal Frame 3 (o86abro86abro86a_6a82a5ae.png)
      for (const rift of sim.summoningRifts) {
        const prog = 1 - Math.max(0, rift.timer / Math.max(0.1, rift.maxTimer));
        const riftSize = 148 * (0.45 + prog * 0.65);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.translate(rift.x, rift.y);
        ctx.scale(1, 0.58);
        ctx.rotate(now * 0.0035);
        ctx.globalAlpha = Math.min(1, 0.35 + prog * 0.65);

        if (decalsAsset && decalsAsset.frames.length >= 4) {
          const rf = decalsAsset.frames[3]; // Bottom-Right: Swirling Magenta-Crimson Summoning Pentagram Rift
          ctx.drawImage(
            decalsAsset.cleanCanvas,
            rf.sx,
            rf.sy,
            rf.sw,
            rf.sh,
            -riftSize * 0.5,
            -riftSize * 0.5,
            riftSize,
            riftSize
          );
        }
        ctx.restore();
      }
      ctx.restore();

      // 2.5. Draw Expanding Ground Shockwave Rings (Isometric Perspective)
      for (let i = 0; i < sim.shockwaves.length; i++) {
        const sw = sim.shockwaves[i];
        if (!sw.active) continue;
        const alpha = Math.max(0, sw.life / sw.maxLife);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 2.8 * (0.4 + alpha * 0.8);
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.ellipse(sw.x, sw.y, sw.radius, sw.radius * 0.52, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 3. Draw 100% Hand-Painted Isometric Ground Telegraph Runes (o86abro86abro86a_6a82a5ae.png 2x2 Sheet)
      // Frame 0 (Top-Left): Circular Sri Yantra Shockwave Mandala
      // Frame 1 (Top-Right): Wide Crescent Fan Cleave Telegraph Rune
      // Frame 2 (Bottom-Left): Tapered Vermilion-Gold Spear-Charge Chevron Lane
      sim.enemies.forEach((e) => {
        if (e.aiState === 'windup' && decalsAsset && decalsAsset.frames.length >= 3) {
          const totalDur = Math.max(0.15, e.windupDuration || 0.6);
          const progress = Math.max(0, Math.min(1, 1 - e.aiTimer / totalDur));
          const isImminent = e.aiTimer <= 0.22;

          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = Math.min(1, 0.45 + progress * 0.55);

          if (e.attackKind === 'corridor') {
            // Frame 2 (Bottom-Left): Tapered Vermilion-Gold Spear-Charge Chevron Lane
            const laneFrame = decalsAsset.frames[2];
            const len =
              Math.hypot(e.corridorEndX - e.telegraphX, e.corridorEndY - e.telegraphY) || 240;
            const laneWidth = (e.isBoss ? 128 : 92) * (0.82 + progress * 0.22);

            ctx.translate(e.telegraphX, e.telegraphY);
            ctx.rotate(e.aimAngle);
            ctx.drawImage(
              isImminent ? decalsAsset.goldCanvas : decalsAsset.cleanCanvas,
              laneFrame.sx,
              laneFrame.sy,
              laneFrame.sw,
              laneFrame.sh,
              0,
              -laneWidth * 0.5,
              len * (0.35 + progress * 0.65),
              laneWidth
            );
          } else if (e.attackKind === 'shockwave') {
            // Frame 0 (Top-Left): Circular Crimson-Gold Sri Yantra Shockwave Mandala
            const mandalaFrame = decalsAsset.frames[0];
            const r = e.telegraphRadius * (0.45 + progress * 0.60);
            ctx.translate(e.x, e.y);
            ctx.scale(1, 0.58);
            ctx.rotate(now * 0.0018);
            ctx.drawImage(
              isImminent ? decalsAsset.goldCanvas : decalsAsset.cleanCanvas,
              mandalaFrame.sx,
              mandalaFrame.sy,
              mandalaFrame.sw,
              mandalaFrame.sh,
              -r,
              -r,
              r * 2,
              r * 2
            );
          } else {
            // Frame 1 (Top-Right): Wide Crescent Fan Cleave Telegraph Rune
            const coneFrame = decalsAsset.frames[1];
            const coneSize = e.telegraphRadius * 1.65 * (0.55 + progress * 0.45);
            ctx.translate(e.x, e.y);
            ctx.scale(1, 0.62);
            ctx.rotate(e.aimAngle);
            ctx.drawImage(
              isImminent ? decalsAsset.goldCanvas : decalsAsset.cleanCanvas,
              coneFrame.sx,
              coneFrame.sy,
              coneFrame.sw,
              coneFrame.sh,
              -coneSize * 0.18,
              -coneSize * 0.5,
              coneSize,
              coneSize
            );
          }
          ctx.restore();
        }

        // Golden Posture-Broken Execute Ring
        if (e.postureBrokenTimer > 0 && e.aiState !== 'ko') {
          ctx.save();
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = '#ffd86b';
          ctx.lineWidth = 2.2;
          ctx.shadowColor = '#ffae29';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.ellipse(e.x, e.y, 38, 20, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      });

      const wukongAsset = getProcessedSpriteSync(GAME_ASSETS.rudra.idle);

      // 3.5. Draw Luminous Motion Afterimages ONLY when 3D model is not yet active (prevents 2D greatsword sprite ghosts overlapping 3D Rudra!)
      if (!rudra3dRef.current?.isReady) {
        for (let i = 0; i < sim.afterimages.length; i++) {
          const ai = sim.afterimages[i];
          if (!ai.active) continue;
          const aiAsset = getProcessedSpriteSync(ai.assetUrl) || wukongAsset;
          if (!aiAsset || aiAsset.frames.length === 0) continue;

          const alpha = Math.max(0, ai.life / ai.maxLife) * 0.56;
          const safeIdx = Math.max(0, Math.min(aiAsset.frames.length - 1, ai.frameIndex));
          const frame = aiAsset.frames[safeIdx];
          const baseH = aiAsset.baseFrameHeight || frame.sh;
          const pixelScale = ai.targetHeight / baseH;
          const drawW = frame.sw * pixelScale;
          const drawH = frame.sh * pixelScale;
          const tintCanvas =
            ai.tint === 'jade'
              ? aiAsset.jadeCanvas
              : ai.tint === 'gold'
              ? aiAsset.goldCanvas
              : aiAsset.flashCanvas;

          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = alpha;
          ctx.translate(ai.x, ai.y - ai.elevationY);
          ctx.scale(ai.facing, 1);
          ctx.drawImage(
            tintCanvas,
            frame.sx,
            frame.sy,
            frame.sw,
            frame.sh,
            -drawW * 0.5,
            -drawH + 5,
            drawW,
            drawH
          );
          ctx.restore();
        }
      }

      // 4. Depth-Sort all 2.5D Actors (Destructible Props, Enemies, Clones, Decoy, Rudra) by Y coordinate
      type RenderActor =
        | { kind: 'player'; y: number }
        | { kind: 'enemy'; y: number; enemy: EnemyEntity }
        | { kind: 'clone'; y: number; clone: CloneEntity }
        | { kind: 'decoy'; y: number }
        | { kind: 'prop'; y: number; prop: DestructiblePropEntity };

      const actors: RenderActor[] = [{ kind: 'player', y: sim.player.y }];
      sim.enemies.forEach((e) => actors.push({ kind: 'enemy', y: e.y, enemy: e }));
      sim.clones.forEach((c) => actors.push({ kind: 'clone', y: c.y, clone: c }));
      sim.props.forEach((pr) => {
        // Render intact props AND shattered Kurukshetra Yupa Pillar rubble!
        if (!pr.destroyed || pr.type === 'dragon_pillar') {
          actors.push({ kind: 'prop', y: pr.y, prop: pr });
        }
      });
      if (sim.decoy.active) {
        actors.push({ kind: 'decoy', y: sim.decoy.y });
      }
      actors.sort((a, b) => a.y - b.y);

      actors.forEach((act) => {
        if (act.kind === 'prop') {
          const pr = act.prop;
          const propUrl =
            pr.type === 'dragon_pillar'
              ? pr.destroyed
                ? GAME_ASSETS.kaliyugaProps.pillarRubble
                : GAME_ASSETS.kaliyugaProps.kurukshetraPillar
              : pr.type === 'incense_cauldron'
              ? GAME_ASSETS.kaliyugaProps.brahmashiraShrine
              : pr.type === 'weapon_rack'
              ? GAME_ASSETS.kaliyugaProps.brokenChariot
              : GAME_ASSETS.kaliyugaProps.vaitaraniBoat;
          const singlePropAsset = getProcessedSpriteSync(propUrl);

          const targetH =
            pr.type === 'dragon_pillar'
              ? pr.destroyed
                ? 78
                : 118
              : pr.type === 'pagoda_lantern'
              ? 104
              : pr.type === 'weapon_rack'
              ? 110
              : 102;
          const shakeX = pr.shakeTimer > 0 ? (Math.random() - 0.5) * 7 : 0;

          // Warm ambient point-light for Brahmashira Homa Shrine & Vaitarani Ferry Boat Lantern
          if (!pr.destroyed && (pr.type === 'incense_cauldron' || pr.type === 'pagoda_lantern')) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.translate(pr.x, pr.y - 22);
            const gRadius = pr.type === 'incense_cauldron' ? 64 : 52;
            const pGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, gRadius);
            pGrad.addColorStop(0, 'rgba(255, 152, 42, 0.34)');
            pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.arc(0, 0, gRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          drawSpriteFrame(
            ctx,
            singlePropAsset,
            0,
            1,
            pr.x + shakeX,
            pr.y,
            targetH,
            targetH,
            1,
            1,
            1,
            pr.hitFlashTimer > 0,
            0,
            pr.destroyed ? 34 : 30,
            'none',
            0,
            primaryLightX
          );

          // Subtle HP bar if damaged and not yet destroyed
          if (!pr.destroyed && pr.hp < pr.maxHp) {
            const bw = 38;
            const bx = pr.x - bw * 0.5;
            const by = pr.y - targetH - 6;
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(bx - 1, by - 1, bw + 2, 4.5);
            ctx.fillStyle = '#f2c45a';
            ctx.fillRect(bx, by, bw * Math.max(0, pr.hp / pr.maxHp), 2.5);
          }
        } else if (act.kind === 'decoy') {
          const decoyAsset = getProcessedSpriteSync(GAME_ASSETS.rudra.idle);
          ctx.save();
          ctx.globalAlpha = 0.68;
          drawSpriteFrame(
            ctx,
            decoyAsset,
            0,
            1,
            sim.decoy.x,
            sim.decoy.y,
            88,
            88,
            sim.player.facing,
            1,
            1,
            true,
            0,
            24,
            'jade',
            0,
            primaryLightX
          );
          ctx.restore();
        } else if (act.kind === 'clone') {
          const c = act.clone;
          const clonePoseUrl =
            Math.floor(c.animTime) % 2 === 0
              ? GAME_ASSETS.rudra.slash1
              : GAME_ASSETS.rudra.run;
          const cloneAsset = getProcessedSpriteSync(clonePoseUrl);
          ctx.save();
          ctx.globalAlpha = 0.90;
          drawSpriteFrame(
            ctx,
            cloneAsset,
            0,
            1,
            c.x,
            c.y,
            88,
            88,
            c.facing,
            1,
            1,
            false,
            0,
            22,
            'gold',
            0,
            primaryLightX
          );
          ctx.restore();
        } else if (act.kind === 'enemy') {
          const e = act.enemy;
          const isFlash = e.hitFlashTimer > 0;
          const bob =
            e.aiState === 'chase' ? Math.abs(Math.sin(e.animTime * 8)) * 3.2 : 0;
          const bossRim = e.isBoss && (e.phase >= 2 || e.aiState === 'windup') ? 'gold' : 'none';
          const enemySkewX =
            e.aiState === 'attack'
              ? e.facing * 0.14
              : e.aiState === 'windup'
              ? -e.facing * 0.08
              : 0;

          // Subtle ground point-light under Bosses & Ember-Arrow Archers
          if (e.isBoss || e.type === 'fire_monk' || e.type === 'furnace_titan') {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.translate(e.x, e.y);
            ctx.scale(1, 0.5);
            const glowR = e.isBoss ? 74 : 44;
            const eGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, glowR);
            eGrad.addColorStop(0, e.isBoss ? 'rgba(255, 82, 42, 0.28)' : 'rgba(255, 130, 40, 0.22)');
            eGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = eGrad;
            ctx.beginPath();
            ctx.arc(0, 0, glowR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          if (e.type === 'xuemo' || e.type === 'vrikodara') {
            // REAL-TIME 60FPS 3D BOSS RENDERER FOR DUNDUBHI & VRIKODARA (with Phase Height Growth & 11 Animations)!
            const boss3d = boss3dRef.current;
            const bossType = e.type === 'xuemo' ? 'dundubhi' : 'vrikodara';
            const growthMult = e.growthScale || 1.0;
            const renderedBoss3D =
              boss3d &&
              boss3d.updateAndRender({
                kind: bossType,
                dt: simDt > 0 ? simDt : dt,
                vx: e.vx,
                vy: e.vy,
                facing: e.facing,
                aimAngle: e.aimAngle,
                aiState: e.aiState,
                attackKind: e.attackKind,
                attackPattern: e.attackPattern,
                windupProgress:
                  e.aiState === 'windup'
                    ? Math.min(1, Math.max(0, 1 - e.aiTimer / Math.max(0.01, e.windupDuration)))
                    : 0,
                phase: e.phase,
                armorCracked: Boolean(e.armorCracked),
                isPostureBroken: e.postureBrokenTimer > 0,
                isHitFlash: isFlash,
                isParrying: e.parryStanceTimer > 0,
              });

            // Dundubhi Bronze War-Drum Armor Ring indicator on the arena floor
            if (e.type === 'xuemo' && e.aiState !== 'ko') {
              ctx.save();
              ctx.translate(e.x, e.y);
              ctx.scale(1, 0.48);
              ctx.strokeStyle = e.armorCracked ? '#ff5522' : '#d4a548';
              ctx.lineWidth = e.armorCracked ? 2.2 : 3.2;
              if (e.armorCracked) {
                ctx.setLineDash([8, 6]);
              }
              ctx.beginPath();
              ctx.arc(0, 0, 56 * growthMult, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }

            if (renderedBoss3D && boss3d) {
              drawSpriteFrame(
                ctx,
                undefined,
                0,
                1,
                e.x,
                e.y,
                148 * growthMult,
                0,
                e.facing,
                e.scaleX,
                e.scaleY,
                false,
                bob,
                46 * growthMult
              );

              const baseSize = e.type === 'vrikodara' ? 244 : 224;
              const drawSize = Math.round(baseSize * growthMult);
              const anchorX = -drawSize * 0.5;
              const anchorY = -drawSize * 0.78;

              ctx.save();
              // Render 3D WebGL Boss Canvas at true ground coordinates without 2D bob, shear, or squash-and-stretch distortion
              ctx.translate(e.x, e.y);
              ctx.drawImage(boss3d.canvas, anchorX, anchorY, drawSize, drawSize);
              if (isFlash) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.38;
                ctx.drawImage(boss3d.canvas, anchorX, anchorY, drawSize, drawSize);
              }
              ctx.restore();
            } else if (e.type === 'xuemo') {
              const dundubhiUrl =
                e.aiState === 'attack' && e.attackKind === 'corridor'
                  ? GAME_ASSETS.dundubhi.charge
                  : e.aiState === 'windup' || (e.aiState === 'attack' && e.attackKind === 'shockwave')
                  ? GAME_ASSETS.dundubhi.roar
                  : GAME_ASSETS.dundubhi.idle;
              const dundubhiAsset = getProcessedSpriteSync(dundubhiUrl);
              drawSpriteFrame(
                ctx,
                dundubhiAsset,
                0,
                1,
                e.x,
                e.y,
                Math.round(154 * growthMult),
                Math.round(154 * growthMult),
                e.facing,
                e.scaleX,
                e.scaleY,
                isFlash,
                bob,
                44 * growthMult,
                bossRim,
                enemySkewX,
                primaryLightX
              );
            } else {
              let vrikodaraUrl: string = GAME_ASSETS.vrikodara.p1Idle;
              if (e.postureBrokenTimer > 0 || e.aiState === 'ko') {
                vrikodaraUrl = GAME_ASSETS.vrikodara.p2Kneel;
              } else if (e.phase === 1) {
                if (e.aiState === 'windup') {
                  vrikodaraUrl = GAME_ASSETS.vrikodara.p1Windup;
                } else if (e.aiState === 'attack') {
                  vrikodaraUrl = GAME_ASSETS.vrikodara.p1Slam;
                } else {
                  vrikodaraUrl = GAME_ASSETS.vrikodara.p1Idle;
                }
              } else {
                if (e.aiState === 'windup' || e.aiState === 'attack') {
                  vrikodaraUrl = GAME_ASSETS.vrikodara.p2Sweep;
                } else {
                  vrikodaraUrl = GAME_ASSETS.vrikodara.p2Idle;
                }
              }
              const vrikodaraAsset = getProcessedSpriteSync(vrikodaraUrl);
              drawSpriteFrame(
                ctx,
                vrikodaraAsset,
                0,
                1,
                e.x,
                e.y,
                Math.round(164 * growthMult),
                Math.round(164 * growthMult),
                e.facing,
                e.scaleX,
                e.scaleY,
                isFlash,
                bob,
                46 * growthMult,
                bossRim,
                enemySkewX,
                primaryLightX
              );
            }
          } else {
            // Combined 7-Sheet Enemy Roster (Both Previous Fan-Favorite 4x1 Sheets + Newly Uploaded 4x1 & 2x2 Sheets!)
            let sheetUrl: string = GAME_ASSETS.enemySheets.magmaGolemSheet4x1;
            if (e.type === 'wolf_guai') {
              sheetUrl =
                e.id % 2 === 0 || e.trait === 'rakshasa_frenzy'
                  ? GAME_ASSETS.enemySheets.sharabhaHoundSheet4x1
                  : GAME_ASSETS.enemySheets.vrikaStalkerSheet4x1;
            } else if (e.type === 'fire_monk') {
              sheetUrl =
                e.id % 2 === 0 || sim.chamberIndex >= 1
                  ? GAME_ASSETS.enemySheets.pretaBowmanSheet4x1
                  : GAME_ASSETS.enemySheets.agniSpearmanSheet4x1;
            } else if (e.type === 'furnace_titan') {
              sheetUrl =
                sim.chamberIndex >= 4 && e.trait === 'vajra_shield'
                  ? GAME_ASSETS.enemySheets.kaliyugaAvatarSheet2x2
                  : GAME_ASSETS.enemySheets.rakshasaMaceSheet4x1;
            } else {
              sheetUrl =
                e.id % 2 === 0
                  ? GAME_ASSETS.enemySheets.magmaGolemSheet4x1
                  : GAME_ASSETS.enemySheets.rakshasaMaceSheet4x1;
            }

            const sheetAsset = getProcessedSpriteSync(sheetUrl);
            const animFrame =
              e.aiState === 'attack'
                ? 3
                : e.aiState === 'windup'
                ? 2
                : Math.floor(e.animTime * 6.5) % 4;

            const targetH =
              e.type === 'furnace_titan'
                ? 124
                : e.type === 'stone_golem'
                ? 104
                : e.type === 'fire_monk'
                ? 96
                : 88;

            // Elite Trait Floor Aura Ring (Vajra Shield / Agni Aura / Rakshasa Frenzy)
            if (e.trait && e.aiState !== 'ko') {
              ctx.save();
              ctx.translate(e.x, e.y);
              ctx.scale(1, 0.5);
              ctx.strokeStyle =
                e.trait === 'vajra_shield'
                  ? '#5ce6ff'
                  : e.trait === 'agni_aura'
                  ? '#ff6a2b'
                  : '#d946ef';
              ctx.lineWidth = 2.4;
              ctx.setLineDash([6, 4]);
              ctx.beginPath();
              ctx.arc(0, 0, 36, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }

            // REAL-TIME 60FPS 3D ENEMY SQUADRON RENDERER (Ash-Stalker, Dhanur-Preta, Vetala Guard, Furnace Colossus)
            const enemy3d = enemy3dRef.current;
            const renderedEnemy3D =
              enemy3d &&
              enemy3d.renderEnemy({
                id: e.id,
                kind: e.type,
                trait: e.trait,
                animTime: e.animTime,
                vx: e.vx,
                vy: e.vy,
                facing: e.facing,
                aimAngle: e.aimAngle,
                aiState: e.aiState,
                windupProgress:
                  e.aiState === 'windup'
                    ? Math.min(1, Math.max(0, 1 - e.aiTimer / Math.max(0.01, e.windupDuration)))
                    : 0,
                isPostureBroken: e.postureBrokenTimer > 0,
                isHitFlash: isFlash,
                isParrying: e.parryStanceTimer > 0,
              });

            if (renderedEnemy3D && enemy3d) {
              // Draw ground contact shadow first
              drawSpriteFrame(
                ctx,
                undefined,
                0,
                1,
                e.x,
                e.y,
                targetH,
                0,
                e.facing,
                e.scaleX,
                e.scaleY,
                false,
                bob,
                targetH * 0.3
              );

              const drawSize =
                e.type === 'furnace_titan'
                  ? 196
                  : e.type === 'stone_golem'
                  ? 172
                  : e.type === 'fire_monk'
                  ? 158
                  : 150;
              const anchorX = -drawSize * 0.5;
              const anchorY = -drawSize * 0.78;

              ctx.save();
              ctx.translate(e.x, e.y);
              ctx.drawImage(enemy3d.canvas, anchorX, anchorY, drawSize, drawSize);
              if (isFlash) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.42;
                ctx.drawImage(enemy3d.canvas, anchorX, anchorY, drawSize, drawSize);
              }
              ctx.restore();
            } else {
              drawSpriteFrame(
                ctx,
                sheetAsset,
                animFrame,
                4,
                e.x,
                e.y,
                targetH,
                targetH,
                e.facing,
                e.scaleX,
                e.scaleY,
                isFlash,
                bob,
                targetH * 0.28,
                e.trait === 'vajra_shield' ? 'jade' : e.trait === 'agni_aura' ? 'gold' : 'none',
                enemySkewX,
                primaryLightX
              );
            }
          }

          // Active Frontal Parry / Guard Shield Arc when enemy is ready to deflect frontal spam!
          if (e.parryStanceTimer > 0 && e.aiState !== 'ko') {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.translate(e.x + e.facing * 24, e.y - (e.isBoss ? 58 : 38));
            ctx.strokeStyle = '#ffd86b';
            ctx.shadowColor = '#ffaa00';
            ctx.shadowBlur = 14;
            ctx.lineWidth = 3.6;
            ctx.beginPath();
            const gAng = e.facing >= 0 ? 0 : Math.PI;
            ctx.arc(0, 0, e.isBoss ? 44 : 28, gAng - 0.95, gAng + 0.95);
            ctx.stroke();
            ctx.restore();
          }

          // Hades-Style Lodged Agneyastra Blood-Shard Crystals orbiting struck enemy!
          if ((e.lodgedCasts || 0) > 0 && e.aiState !== 'ko') {
            const count = e.lodgedCasts || 0;
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            for (let cIdx = 0; cIdx < count; cIdx++) {
              const orbitAng = now * 0.0055 + (cIdx * Math.PI * 2) / count;
              const ox = e.x + Math.cos(orbitAng) * (e.isBoss ? 42 : 28);
              const oy = e.y - (e.isBoss ? 56 : 38) + Math.sin(orbitAng) * 14;
              ctx.fillStyle = '#ff2a4b';
              ctx.strokeStyle = '#ffe14d';
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              ctx.moveTo(ox, oy - 9);
              ctx.lineTo(ox + 6, oy);
              ctx.lineTo(ox, oy + 9);
              ctx.lineTo(ox - 6, oy);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }
            ctx.restore();
          }

          // Hand-Painted Enemy Attack Slash Smear (kwhb8qkwhb8qkwhb_adfa1bcf.png Frame 0)
          const slashVfxAsset = getProcessedSpriteSync(GAME_ASSETS.vfxSlash2x2);
          if (
            e.slashArcAlpha > 0.05 &&
            e.attackKind === 'cone' &&
            slashVfxAsset &&
            slashVfxAsset.frames.length > 0
          ) {
            const sf = slashVfxAsset.frames[0];
            const slashSize = e.telegraphRadius * 1.45;
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = e.slashArcAlpha * 0.92;
            ctx.translate(e.x, e.y - 36);
            ctx.scale(1, 0.68);
            ctx.rotate(e.aimAngle);
            ctx.drawImage(
              slashVfxAsset.cleanCanvas,
              sf.sx,
              sf.sy,
              sf.sw,
              sf.sh,
              -slashSize * 0.25,
              -slashSize * 0.5,
              slashSize,
              slashSize
            );
            ctx.restore();
          }

          // Hand-Painted Starburst Glint (combatImpacts2x2 Frame 1) in final 0.24s of windup!
          if (
            e.aiState === 'windup' &&
            e.aiTimer <= 0.24 &&
            impactsAsset &&
            impactsAsset.frames.length >= 2
          ) {
            const sf = impactsAsset.frames[1];
            const gx = e.x + e.facing * 22;
            const gy = e.y - (e.isBoss ? 72 : 48);
            const glintSize = (e.isBoss ? 68 : 48) * (0.9 + Math.sin(now * 0.05) * 0.2);
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.translate(gx, gy);
            ctx.drawImage(
              impactsAsset.cleanCanvas,
              sf.sx,
              sf.sy,
              sf.sw,
              sf.sh,
              -glintSize * 0.5,
              -glintSize * 0.5,
              glintSize,
              glintSize
            );
            ctx.restore();
          }

          // Agneyastra Golden Mandala Bind Ring
          if (e.immobilizedTimer > 0 && decalsAsset && decalsAsset.frames.length > 0) {
            const mf = decalsAsset.frames[0];
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.translate(e.x, e.y - 36);
            ctx.rotate(now * 0.003);
            ctx.drawImage(
              decalsAsset.goldCanvas,
              mf.sx,
              mf.sy,
              mf.sw,
              mf.sh,
              -36,
              -36,
              72,
              72
            );
            ctx.restore();
          }

          // Sleek borderless 2px ink-sliver ONLY when a regular enemy has taken damage (hidden at 100% HP!)
          if (
            !e.isBoss &&
            e.aiState !== 'ko' &&
            (e.hp < e.maxHp || e.posture < e.maxPosture * 0.98)
          ) {
            const bw = 38;
            const bx = e.x - bw * 0.5;
            const by = e.y - (e.type === 'stone_golem' || e.type === 'furnace_titan' ? 106 : 86);
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(bx, by, bw, 4.2);
            ctx.fillStyle = 'rgba(255, 232, 168, 0.80)';
            ctx.fillRect(bx, by, bw * Math.max(0, e.displayHp / e.maxHp), 2.4);
            ctx.fillStyle = '#e0313c';
            ctx.fillRect(bx, by, bw * Math.max(0, e.hp / e.maxHp), 2.4);
            ctx.fillStyle = '#f2c45a';
            ctx.fillRect(bx, by + 2.8, bw * Math.max(0, e.posture / e.maxPosture), 1.4);
          }
        } else if (act.kind === 'player') {
          const p = sim.player;
          const speedMag = Math.hypot(p.vx, p.vy);
          const isMoving = speedMag > 18;
          const stridePhase = p.walkDistance * 0.068;
          const walkBob = isMoving ? Math.abs(Math.sin(stridePhase)) * 4.2 : 0;

          // Select among Rudra's 9 Bespoke Full-Body Action Poses!
          let activeRudraUrl: string = GAME_ASSETS.rudra.idle;
          if (p.hp <= 0 || (p.hp / p.maxHp < 0.22 && p.action === 'idle' && !isMoving)) {
            activeRudraUrl = GAME_ASSETS.rudra.kneel;
          } else if (p.action === 'parry') {
            activeRudraUrl = GAME_ASSETS.rudra.parry;
          } else if (p.action === 'astra') {
            activeRudraUrl = GAME_ASSETS.rudra.astra;
          } else if (p.action === 'gourd') {
            activeRudraUrl = GAME_ASSETS.rudra.heal;
          } else if (p.action === 'heavy_unleash' || p.action === 'execute' || p.elevationY > 18) {
            activeRudraUrl = GAME_ASSETS.rudra.slam;
          } else if (p.action === 'light_attack') {
            activeRudraUrl =
              p.comboStep === 2 || p.comboStep === 4
                ? GAME_ASSETS.rudra.slash2
                : GAME_ASSETS.rudra.slash1;
          } else if (p.action === 'dodge' || isMoving) {
            activeRudraUrl =
              p.action === 'dodge' || Math.floor(p.walkDistance * 0.035) % 2 === 0
                ? GAME_ASSETS.rudra.run
                : GAME_ASSETS.rudra.idle;
          } else {
            activeRudraUrl = GAME_ASSETS.rudra.idle;
          }

          const activeWukongSheet = getProcessedSpriteSync(activeRudraUrl) || wukongAsset;
          const frame = 0;

          // 2.5D Velocity Lean / Shear so Wukong physically leans into sprints, lunges & attacks
          const velocitySkewX = Math.max(-0.22, Math.min(0.22, (p.vx / 285) * 0.16));

          // 1. Hand-Painted Cyan Soul-Fire & Crimson Blood-Smoke Dash Burst (2n0p172n0p172n0p_4fba9427.png Frame 0)
          if (
            p.dashStreakAlpha > 0.02 &&
            impactsAsset &&
            impactsAsset.frames.length > 0
          ) {
            const dashFrame = impactsAsset.frames[0]; // Top-Left: Cyan Soul-Fire & Crimson Blood-Smoke Dash Burst
            const sx = p.dashStartX;
            const sy = p.dashStartY - 28;
            const ex = p.x;
            const ey = p.y - 28;
            const dashAng = Math.atan2(ey - sy, ex - sx);
            const dashLen = Math.hypot(ex - sx, ey - sy);

            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = p.dashStreakAlpha * 0.95;

            // Origin burst cloud
            const burstSize = 115 * (0.65 + p.dashStreakAlpha * 0.45);
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(dashAng);
            ctx.drawImage(
              impactsAsset.cleanCanvas,
              dashFrame.sx,
              dashFrame.sy,
              dashFrame.sw,
              dashFrame.sh,
              -burstSize * 0.5,
              -burstSize * 0.5,
              burstSize,
              burstSize
            );
            ctx.restore();

            // Mid-path stretched soul-fire wake
            if (dashLen > 24) {
              ctx.save();
              ctx.translate((sx + ex) * 0.5, (sy + ey) * 0.5);
              ctx.rotate(dashAng);
              ctx.drawImage(
                impactsAsset.cleanCanvas,
                dashFrame.sx,
                dashFrame.sy,
                dashFrame.sw,
                dashFrame.sh,
                -dashLen * 0.6,
                -46,
                dashLen * 1.2,
                92
              );
              ctx.restore();
            }
            ctx.restore();
          }

          // 2. Sacred Golden Lotus Hero Foot Ring + Integrated Jade Dash Stamina Crescents (No Overhead Box!)
          ctx.save();
          ctx.translate(p.x, p.y);
          const ringPulse = 0.82 + Math.sin(now * 0.006) * 0.14;
          const isDashing = p.action === 'dodge';
          const ringColor = isDashing ? '#5ce6ff' : '#ffd86b';

          // Soft golden ground spotlight under the Destined One
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.scale(1, 0.52);
          const hGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 44);
          hGrad.addColorStop(
            0,
            isDashing ? 'rgba(92, 230, 255, 0.42)' : 'rgba(255, 206, 84, 0.36)'
          );
          hGrad.addColorStop(0.6, 'rgba(255, 165, 45, 0.14)');
          hGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = hGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 44, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Outer solid Imperial Gold / Jade Hero Ring (compact agile Hades Zagreus scale)
          ctx.strokeStyle = ringColor;
          ctx.lineWidth = 1.8;
          ctx.shadowColor = ringColor;
          ctx.shadowBlur = 8;
          ctx.globalAlpha = ringPulse;
          ctx.beginPath();
          ctx.ellipse(0, 0, 19, 10, 0, 0, Math.PI * 2);
          ctx.stroke();

          // 2 Integrated Cyan-Jade Dash Stamina Crescent Arcs hugging the foot-ring flanks
          for (let d = 0; d < p.maxDashCharges; d++) {
            const hasCharge = d < p.dashCharges;
            const arcStart = d === 0 ? Math.PI * 0.68 : -Math.PI * 0.32;
            const arcEnd = d === 0 ? Math.PI * 1.32 : Math.PI * 0.32;
            ctx.strokeStyle = hasCharge ? '#63f2ff' : 'rgba(99, 242, 255, 0.18)';
            ctx.lineWidth = hasCharge ? 2.2 : 1.3;
            ctx.beginPath();
            ctx.ellipse(0, 0, 23, 12.5, 0, arcStart, arcEnd);
            ctx.stroke();
          }

          // Directional Facing Chevron on the perimeter of the foot ring
          const dirAngle = Math.atan2(p.lastMoveDirY * 0.55, p.lastMoveDirX || p.facing);
          const tipX = Math.cos(dirAngle) * 25;
          const tipY = Math.sin(dirAngle) * 13.5;
          ctx.fillStyle = '#fff3b8';
          ctx.beginPath();
          ctx.arc(tipX, tipY, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // 3. Rudra Tandava Transformation Aura
          if (p.transformTimer > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(p.x, p.y - 32, 5, p.x, p.y - 32, 46);
            grad.addColorStop(0, 'rgba(255, 115, 35, 0.52)');
            grad.addColorStop(0.55, 'rgba(255, 60, 15, 0.22)');
            grad.addColorStop(1, 'rgba(255, 40, 10, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y - 32, 46, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // 4. Kalaripayattu Parry Golden Dharma Shield
          if (p.action === 'parry') {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.strokeStyle = '#ffe27a';
            ctx.lineWidth = 2.4;
            ctx.shadowColor = '#ffae29';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(p.x, p.y - 32, 34, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          // 5. Pillar Stance Golden Column when elevated
          if (p.elevationY > 5) {
            ctx.save();
            ctx.strokeStyle = '#ffd86b';
            ctx.lineWidth = 5.5;
            ctx.shadowColor = '#ffaa2b';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y + 2);
            ctx.lineTo(p.x, p.y - p.elevationY - 10);
            ctx.stroke();
            ctx.restore();
          }

          // 5.5. 60FPS Real-Time 3D Animated Rudra + Bloodforged Parashu Great-Axe Render (Hades Isometric Camera Angle)
          const playerRim = p.action === 'dodge' ? 'jade' : 'gold';
          const isHighSpeedLunge =
            p.action === 'dodge' || (p.action !== 'idle' && speedMag > 360);

          const rudra3d = rudra3dRef.current;
          const rendered3D =
            rudra3d &&
            rudra3d.updateAndRender({
              dt: simDt > 0 ? simDt : dt,
              vx: p.vx,
              vy: p.vy,
              facingX: p.lastMoveDirX || p.facing,
              facingY: p.lastMoveDirY,
              slashAngle: p.slashAngle,
              isAttacking: p.action === 'light_attack',
              isHeavyAttack: p.action === 'heavy_unleash' || p.action === 'execute',
              comboStep: p.comboStep,
              attackProgress: p.weaponSwingProgress,
              isDodging: p.action === 'dodge',
              isParrying: p.action === 'parry',
              isCasting: p.action === 'astra',
              isHealing: p.action === 'gourd',
              isHurt: p.hitFlashTimer > 0,
              isDefeated: p.hp <= 0,
              stance: p.stance,
              focusOrbs: p.focusOrbs,
              elevationY: p.elevationY,
            });

          if (rendered3D && rudra3d) {
            // Ground contact shadow
            drawSpriteFrame(
              ctx,
              undefined,
              0,
              1,
              p.x,
              p.y,
              64,
              0,
              p.facing,
              p.scaleX,
              p.scaleY,
              false,
              p.elevationY,
              20
            );

            const drawSize = 148;
            const anchorX = -drawSize * 0.5;
            const anchorY = -drawSize * 0.74;

            // Single clean Phantom Step dash trail echo ONLY during active dodge (never during attacks!)
            if (p.action === 'dodge') {
              ctx.save();
              ctx.globalCompositeOperation = 'screen';
              ctx.globalAlpha = 0.28;
              ctx.translate(
                p.x - p.vx * 0.022,
                p.y - p.vy * 0.022 - p.elevationY
              );
              ctx.scale(p.scaleX, p.scaleY);
              ctx.drawImage(rudra3d.canvas, anchorX, anchorY, drawSize, drawSize);
              ctx.restore();
            }

            ctx.save();
            ctx.translate(p.x, p.y - p.elevationY);
            ctx.scale(p.scaleX, p.scaleY);

            // Single-pass direct WebGL canvas composite for locked 60FPS performance
            ctx.drawImage(rudra3d.canvas, anchorX, anchorY, drawSize, drawSize);

            if (p.hitFlashTimer > 0 || p.action === 'dodge') {
              ctx.save();
              ctx.globalCompositeOperation = 'screen';
              ctx.globalAlpha = p.hitFlashTimer > 0 ? 0.45 : 0.22;
              ctx.drawImage(rudra3d.canvas, anchorX, anchorY, drawSize, drawSize);
              ctx.restore();
            }

            ctx.restore();
          } else if (
            isMoving &&
            (p.action === 'idle' || p.action === 'light_attack') &&
            !isHighSpeedLunge &&
            activeWukongSheet &&
            activeWukongSheet.frames.length > 0
          ) {
            // Fallback 2D Sprite while 3D FBX finishes initial load
            const safeIdx = Math.max(0, Math.min(activeWukongSheet.frames.length - 1, frame));
            const sFrame = activeWukongSheet.frames[safeIdx];
            const baseH = activeWukongSheet.baseFrameHeight || sFrame.sh;
            const pixelScale = 108 / baseH;
            const drawW = sFrame.sw * pixelScale;
            const drawH = sFrame.sh * pixelScale;
            const splitRatio = 0.62;
            const topSh = Math.round(sFrame.sh * splitRatio);
            const botSh = sFrame.sh - topSh;
            const topDh = drawH * splitRatio;
            const botDh = drawH - topDh;

            const strideSwing = Math.sin(stridePhase) * 7.5;
            const backLegLift = Math.max(0, -Math.cos(stridePhase)) * 5.5;
            const frontLegLift = Math.max(0, Math.cos(stridePhase)) * 6.5;

            drawSpriteFrame(
              ctx,
              undefined,
              0,
              1,
              p.x,
              p.y,
              88,
              0,
              p.facing,
              p.scaleX,
              p.scaleY,
              false,
              p.elevationY,
              25
            );

            const srcCanvas =
              p.hitFlashTimer > 0 ? activeWukongSheet.flashCanvas : activeWukongSheet.cleanCanvas;

            ctx.save();
            ctx.translate(p.x, p.y - p.elevationY);
            if (Math.abs(velocitySkewX) > 0.001) {
              ctx.transform(1, 0, velocitySkewX, 1, 0, 0);
            }
            ctx.scale(p.facing * p.scaleX, p.scaleY);

            ctx.save();
            ctx.globalAlpha = 0.82;
            ctx.translate(-strideSwing, -backLegLift);
            ctx.drawImage(
              srcCanvas,
              sFrame.sx,
              sFrame.sy + topSh,
              sFrame.sw,
              botSh,
              -drawW * 0.5,
              -botDh + 5,
              drawW,
              botDh
            );
            ctx.restore();

            ctx.save();
            ctx.translate(strideSwing, -frontLegLift);
            ctx.drawImage(
              srcCanvas,
              sFrame.sx,
              sFrame.sy + topSh,
              sFrame.sw,
              botSh,
              -drawW * 0.5,
              -botDh + 5,
              drawW,
              botDh
            );
            ctx.restore();

            ctx.save();
            ctx.translate(0, -walkBob);
            ctx.drawImage(
              srcCanvas,
              sFrame.sx,
              sFrame.sy,
              sFrame.sw,
              topSh,
              -drawW * 0.5,
              -drawH + 5,
              drawW,
              topDh + 2
            );
            ctx.restore();

            ctx.restore();
          } else {
            drawSpriteFrame(
              ctx,
              activeWukongSheet,
              frame,
              1,
              p.x,
              p.y,
              108,
              108,
              p.facing,
              p.scaleX,
              p.scaleY,
              p.hitFlashTimer > 0 || p.action === 'dodge',
              p.elevationY + walkBob,
              30,
              playerRim,
              velocitySkewX,
              primaryLightX
            );
          }

          // 7. 100% Hand-Painted Weapon Slash Smear Engine (kwhb8qkwhb8qkwhb_adfa1bcf.png 2x2 Sheet)
          // Frame 0 (Top-Left): Wide Crescent Fire Cleave
          // Frame 1 (Top-Right): Crackling Golden Lightning Backhand Slash
          // Frame 2 (Bottom-Left): 360° Circular Whirlwind Fire Cyclone Ring
          // Frame 3 (Bottom-Right): Heavy Guillotine Slam Wave with Molten Rock Burst
          const slashSheet = getProcessedSpriteSync(GAME_ASSETS.vfxSlash2x2);
          if (p.slashArcAlpha > 0.01 && slashSheet && slashSheet.frames.length >= 4) {
            const isHeavy = p.action === 'heavy_unleash' || p.action === 'execute';
            const isSpin = !isHeavy && p.comboStep === 3;
            const isFinisher = isHeavy || p.comboStep === 4;

            const slashFrameIdx = isFinisher ? 3 : isSpin ? 2 : p.comboStep === 2 ? 1 : 0;
            const sf = slashSheet.frames[slashFrameIdx] || slashSheet.frames[0];
            const smearRadius = isHeavy ? 225 : isFinisher ? 198 : isSpin ? 188 : 168;

            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = Math.min(1, p.slashArcAlpha * 1.05);
            ctx.translate(p.x, p.y - 28 - p.elevationY);
            ctx.scale(1, 0.68);
            ctx.rotate(
              p.slashAngle + (isSpin ? p.weaponSwingProgress * Math.PI * 1.6 : 0)
            );
            if (!isHeavy && p.comboStep === 2) {
              ctx.scale(1, -1);
            }

            ctx.drawImage(
              slashSheet.cleanCanvas,
              sf.sx,
              sf.sy,
              sf.sw,
              sf.sh,
              isSpin ? -smearRadius * 0.5 : -smearRadius * 0.28,
              -smearRadius * 0.5,
              smearRadius,
              smearRadius
            );

            // Hand-Painted Starburst Weapon Hit-Spark (combatImpacts2x2 Frame 1) at the leading tip of the cleave
            if (impactsAsset && impactsAsset.frames.length >= 2) {
              const sparkFrame = impactsAsset.frames[1];
              const sparkSize = isFinisher ? 84 : 62;
              const tipX = smearRadius * 0.46;
              ctx.drawImage(
                impactsAsset.cleanCanvas,
                sparkFrame.sx,
                sparkFrame.sy,
                sparkFrame.sw,
                sparkFrame.sh,
                tipX - sparkSize * 0.5,
                -sparkSize * 0.5,
                sparkSize,
                sparkSize
              );
            }
            ctx.restore();
          }
        }
      });

      // 6.5. Anti-Occlusion X-Ray Hero Pass & Overhead Sovereign Hero Crest (Guarantees Rudra is NEVER hidden!)
      {
        const p = sim.player;
        const isMoving = Math.hypot(p.vx, p.vy) > 18;
        const walkBob = isMoving ? Math.abs(Math.sin(p.walkDistance * 0.055)) * 3.8 : 0;
        const isOccludedByActor =
          sim.enemies.some(
            (e) =>
              e.aiState !== 'ko' &&
              e.y >= p.y - 8 &&
              Math.hypot(e.x - p.x, (e.y - p.y) * 1.2) < 76
          ) ||
          sim.props.some(
            (pr) =>
              !pr.destroyed &&
              pr.y >= p.y - 6 &&
              Math.hypot(pr.x - p.x, (pr.y - p.y) * 1.2) < 64
          );

        const rudra3d = rudra3dRef.current;
        if (isOccludedByActor && rudra3d && rudra3d.isReady) {
          const drawSize = 148;
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = 0.56;
          ctx.translate(p.x, p.y - p.elevationY);
          ctx.scale(p.scaleX, p.scaleY);
          ctx.shadowColor = p.action === 'dodge' ? '#52ffd8' : '#ffd86b';
          ctx.shadowBlur = 12;
          ctx.drawImage(rudra3d.canvas, -drawSize * 0.5, -drawSize * 0.74, drawSize, drawSize);
          ctx.restore();
        }

        // Only show a subtle, borderless 2px emerald vitality sliver if Rudra is below 85% HP.
        if (p.hp < p.maxHp * 0.85) {
          const markerY = p.y - 104 - p.elevationY - walkBob;
          const barW = 42;
          const barX = p.x - barW * 0.5;
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
          ctx.fillRect(barX, markerY, barW, 2.5);
          ctx.fillStyle = '#35d49c';
          ctx.fillRect(barX, markerY, barW * Math.max(0, p.hp / p.maxHp), 2.5);
          ctx.restore();
        }
      }

      // 7. Draw 100% Hand-Painted Blazing Agni-Trishula Comet Projectiles (2n0p172n0p172n0p_4fba9427.png Frame 2)
      sim.projectiles.forEach((pr) => {
        if (!pr.active) return;
        const pAngle = Math.atan2(pr.vy, pr.vx);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        // Floor glow under flying Agni-Trishula comet
        const floorGlow = ctx.createRadialGradient(
          pr.x,
          pr.y + 18,
          2,
          pr.x,
          pr.y + 18,
          pr.radius * 2.8
        );
        floorGlow.addColorStop(
          0,
          pr.deflected ? 'rgba(56, 232, 255, 0.55)' : 'rgba(255, 68, 36, 0.55)'
        );
        floorGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = floorGlow;
        ctx.beginPath();
        ctx.ellipse(pr.x, pr.y + 18, pr.radius * 2.8, pr.radius * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(pr.x, pr.y);
        ctx.rotate(pAngle);

        if (impactsAsset && impactsAsset.frames.length >= 3) {
          const projFrame = impactsAsset.frames[2]; // Bottom-Left: Blazing Agni-Trishula Comet Projectile
          const projW = pr.radius * 7.2;
          const projH = pr.radius * 4.2;
          ctx.drawImage(
            pr.deflected ? impactsAsset.jadeCanvas : impactsAsset.cleanCanvas,
            projFrame.sx,
            projFrame.sy,
            projFrame.sw,
            projFrame.sh,
            -projW * 0.55,
            -projH * 0.5,
            projW,
            projH
          );
        }
        ctx.restore();
      });

      // 8. Draw Pooled Combat Sparks & Ground Dust
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < sim.particles.length; i++) {
        const pt = sim.particles[i];
        if (!pt.active) continue;
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 8.5. Draw Sky-Splitting Chain Lightning Arcs (Erlang Shen Boon)
      if (sim.lightningArcs.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < sim.lightningArcs.length; i++) {
          const arc = sim.lightningArcs[i];
          const alpha = Math.max(0, arc.life / arc.maxLife);
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = arc.color;
          ctx.shadowColor = arc.color;
          ctx.shadowBlur = 14;
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.moveTo(arc.x1, arc.y1);
          const midX = (arc.x1 + arc.x2) * 0.5 + (Math.random() - 0.5) * 26;
          const midY = (arc.y1 + arc.y2) * 0.5 + (Math.random() - 0.5) * 26;
          ctx.lineTo(midX, midY);
          ctx.lineTo(arc.x2, arc.y2);
          ctx.stroke();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(arc.x1, arc.y1);
          ctx.lineTo(midX, midY);
          ctx.lineTo(arc.x2, arc.y2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 9. Draw World-Space Floating Combat Text & Callout Banners
      sim.floatingTexts.forEach((ft) => {
        if (!ft.active) return;
        ctx.save();
        ctx.globalAlpha = Math.min(1, ft.life * 1.6);
        ctx.textAlign = 'center';
        ctx.font = `bold ${Math.round(13 * ft.scale)}px 'Plus Jakarta Sans', 'Noto Sans SC', sans-serif`;
        ctx.strokeStyle = 'rgba(0,0,0,0.92)';
        ctx.lineWidth = 3.5;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);

        if (ft.subtext) {
          ctx.font = "600 10px 'Plus Jakarta Sans', 'Noto Sans SC', sans-serif";
          ctx.strokeText(ft.subtext, ft.x, ft.y + 15);
          ctx.fillStyle = '#e5dac5';
          ctx.fillText(ft.subtext, ft.x, ft.y + 15);
        }
        ctx.restore();
      });

      // End World-Space Camera Pass
      ctx.restore();
      // End Camera Zoom & Shake Pass so Screen-Space Overlays cover 100% of Viewport (0..cw, 0..ch)
      ctx.restore();

      // ======================================================================
      // SCREEN-SPACE ATMOSPHERIC GOD-RAYS, WEATHER MOTES & CINEMATIC OVERLAYS
      // ======================================================================
      ctx.save();

      // 9.7. Foreground 1.24x Parallax Temple Overhangs & Hades Diamond Chamber Wipe Transition
      renderForegroundParallaxAndWipe(
        ctx,
        cw,
        ch,
        sim.camX,
        sim.camY,
        sim.gateWipeTimer > 0 ? 1 - sim.gateWipeTimer / 0.44 : 0
      );

      // 9.75. Savitri's 3-State Lantern Lighting & Kurukshetra Ash Storm Shader (Meru Engine)
      const lanternState = getLanternLightState(sim.storyFlags).state;
      renderLanternAtmosphereAndAshStorm(
        ctx,
        cw,
        ch,
        now * 0.001,
        lanternState,
        cw * 0.5,
        ch * 0.5,
        false,
        sim.activeLookObject,
        chamberSpec.id <= 4 ? 0.45 : 0.22
      );

      // 9.78. Meru Engine v2.0 UE5 Post-Processing Stack (Volumetric Height Fog, HDR Bloom, Impact Chromatic Aberration, 35mm Film Grain)
      renderUE5PostProcessingPass(
        ctx,
        cw,
        ch,
        now * 0.001,
        sim.graphicsSettings,
        lanternState,
        sim.cameraShakeTrauma,
        sim.player.transformTimer > 0,
        Boolean(activeBoss && activeBoss.phase >= 2)
      );

      // 9.8. Atmospheric Diagonal Volumetric God-Rays & Chamber Weather Motes
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const rayPulse = 0.045 + Math.sin(now * 0.0012) * 0.015;
      const rayGrad = ctx.createLinearGradient(cw * 0.15, 0, cw * 0.68, ch * 0.85);
      rayGrad.addColorStop(
        0,
        sim.chamberIndex >= 3
          ? `rgba(255, 195, 110, ${rayPulse.toFixed(3)})`
          : `rgba(255, 150, 75, ${rayPulse.toFixed(3)})`
      );
      rayGrad.addColorStop(0.6, 'rgba(255, 160, 80, 0.015)');
      rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(cw * 0.08, 0);
      ctx.lineTo(cw * 0.46, 0);
      ctx.lineTo(cw * 0.86, ch);
      ctx.lineTo(cw * 0.36, ch);
      ctx.closePath();
      ctx.fill();

      // Foreground drifting chamber weather motes (embers / ash / snow / crimson mist)
      const moteBaseColor = chamberSpec.braziers[0]?.color || '#ffca6b';
      for (let i = 0; i < sim.ambientMotes.length; i++) {
        const m = sim.ambientMotes[i];
        ctx.globalAlpha = m.alpha * (0.65 + Math.sin(m.phase) * 0.35);
        ctx.fillStyle = m.isLeaf ? '#ff8b3d' : moteBaseColor;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 10. Sleek Borderless Top-Center Cinematic Chamber Inscription & Sanjaya Palimpsest Dialogue (ZERO RECTANGLE BOX!)
      if (sim.chamberBannerTimer > 0 && sim.state === 'playing') {
        const bannerAlpha = Math.min(1, sim.chamberBannerTimer * 1.2);
        ctx.save();
        ctx.globalAlpha = bannerAlpha;
        const by = ch * 0.10;

        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 14;

        ctx.fillStyle = '#e0b354';
        ctx.font = "600 11px 'Cinzel', Georgia, serif";
        ctx.fillText(
          chamberSpec.isBossChamber ? chamberSpec.chapterTitle.toUpperCase() : chamberSpec.chineseSubtitle,
          cw * 0.5,
          by
        );

        ctx.fillStyle = '#f9e79f';
        ctx.font = "bold 24px 'Cinzel', Georgia, serif";
        ctx.fillText(
          chamberSpec.isBossChamber ? chamberSpec.chineseSubtitle : chamberSpec.name,
          cw * 0.5,
          by + 26
        );

        // Tapered golden calligraphy brush-divider (no box!)
        const lineGrad = ctx.createLinearGradient(cw * 0.34, 0, cw * 0.66, 0);
        lineGrad.addColorStop(0, 'rgba(212, 165, 72, 0)');
        lineGrad.addColorStop(0.5, 'rgba(242, 196, 90, 0.78)');
        lineGrad.addColorStop(1, 'rgba(212, 165, 72, 0)');
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cw * 0.34, by + 35);
        ctx.lineTo(cw * 0.66, by + 35);
        ctx.stroke();

        // Narrative Voice / Sanjaya Strikethrough Palimpsest Subtitle
        const strikeTxt = chamberSpec.sanjayaStrikethrough || chamberSpec.strikethroughLie;
        const corrTxt = chamberSpec.sanjayaCorrection || chamberSpec.sanjayaQuote;
        if (chamberSpec.dialogueSpeaker || strikeTxt || corrTxt) {
          ctx.font = "bold 10px 'Plus Jakarta Sans', sans-serif";
          ctx.fillStyle = '#ff8a66';
          ctx.fillText(
            chamberSpec.dialogueSpeaker || 'SANJAYA · PALIMPSEST OF KURUKSHETRA',
            cw * 0.5,
            by + 52
          );

          if (strikeTxt && corrTxt) {
            ctx.font = "italic 12px 'Plus Jakarta Sans', sans-serif";
            ctx.fillStyle = '#9c8f80';
            ctx.fillText(strikeTxt, cw * 0.5, by + 69);
            const tw = ctx.measureText(strikeTxt).width;
            ctx.strokeStyle = '#ff3848';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(cw * 0.5 - tw * 0.52, by + 65);
            ctx.lineTo(cw * 0.5 + tw * 0.52, by + 65);
            ctx.stroke();

            ctx.font = "600 12.5px 'Plus Jakarta Sans', sans-serif";
            ctx.fillStyle = '#ffd86b';
            ctx.fillText(corrTxt, cw * 0.5, by + 87);
          } else if (chamberSpec.dialogueLine || corrTxt) {
            ctx.font = "italic 12.5px 'Plus Jakarta Sans', sans-serif";
            ctx.fillStyle = '#f2e8d5';
            ctx.fillText((chamberSpec.dialogueLine || corrTxt)!, cw * 0.5, by + 70);
          }
        }

        ctx.restore();
      } else if (sim.bossPhaseBanner && sim.bossPhaseBanner.timer > 0 && sim.state === 'playing') {
        const bp = sim.bossPhaseBanner;
        const bpAlpha = Math.min(1, bp.timer * 1.25);
        ctx.save();
        ctx.globalAlpha = bpAlpha;
        const by = ch * 0.11;

        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.96)';
        ctx.shadowBlur = 16;

        ctx.fillStyle = '#ff6a33';
        ctx.font = "bold 11px 'Cinzel', Georgia, serif";
        ctx.fillText(bp.speaker, cw * 0.5, by);

        ctx.fillStyle = '#ffd86b';
        ctx.font = "bold 20px 'Cinzel', Georgia, serif";
        ctx.fillText(bp.title, cw * 0.5, by + 23);

        ctx.font = "italic 12px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = '#a69888';
        ctx.fillText(bp.strikethrough, cw * 0.5, by + 44);
        const stw = ctx.measureText(bp.strikethrough).width;
        ctx.strokeStyle = '#ff3848';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cw * 0.5 - stw * 0.52, by + 40);
        ctx.lineTo(cw * 0.5 + stw * 0.52, by + 40);
        ctx.stroke();

        ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = '#fff0d4';
        ctx.fillText(bp.correction, cw * 0.5, by + 64);

        ctx.restore();
      }

      // 11. Subtle Cinematic Peripheral Vignette + Low-HP Crimson Pulse + Impact Flash
      ctx.save();
      const isLowHp = sim.player.hp > 0 && sim.player.hp / sim.player.maxHp < 0.32;
      const vGrad = ctx.createRadialGradient(
        cw * 0.5,
        ch * 0.5,
        cw * 0.32,
        cw * 0.5,
        ch * 0.5,
        cw * 0.72
      );
      vGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vGrad.addColorStop(
        1,
        isLowHp ? 'rgba(185, 20, 20, 0.42)' : 'rgba(4, 3, 6, 0.46)'
      );
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, cw, ch);

      if (sim.screenFlashAlpha > 0) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = sim.screenFlashAlpha;
        ctx.fillStyle = sim.screenFlashColor;
        ctx.fillRect(0, 0, cw, ch);
      }
      ctx.restore();

      ctx.restore();

      // Throttled HUD sync (~10Hz) so React overlays stay crisp without 60Hz re-renders
      hudSyncAccum += rawDt;
      if (hudSyncAccum >= 0.09) {
        hudSyncAccum = 0;
        const p = sim.player;
        const bossEntity = sim.enemies.find((e) => e.isBoss && e.aiState !== 'ko') || null;
        const hasBroken = sim.enemies.some(
          (e) => e.aiState !== 'ko' && e.postureBrokenTimer > 0
        );

        setHud({
          chamberId: chamberSpec.id,
          chamberName: chamberSpec.name,
          foesRemaining:
            sim.enemies.filter((e) => e.aiState !== 'ko').length +
            sim.pendingSpawns.length +
            sim.summoningRifts.length +
            sim.waveQueue.length,
          score: sim.score,
          comboCount: sim.comboCount,
          ashenKarma: sim.ashenKarma,
          karmaRunDelta: sim.karmaRunDelta,
          fps: sim.fps,
          playerHp: Math.max(0, Math.round(p.hp)),
          playerDisplayHp: Math.max(0, Math.round(p.displayHp)),
          playerMaxHp: p.maxHp,
          focusOrbs: p.focusOrbs,
          focusProgress: p.focusProgress,
          stance: p.stance,
          weapon: p.weapon,
          gourdSips: p.gourdSips,
          maxGourdSips: p.maxGourdSips,
          dashCharges: p.dashCharges,
          maxDashCharges: p.maxDashCharges,
          immobilizeCd: p.immobilizeCd,
          parryCd: p.parryCd,
          clonesCd: p.clonesCd,
          transformCd: p.transformCd,
          transformActiveTimer: p.transformTimer,
          hasBrokenTarget: hasBroken,
          boss: bossEntity
            ? {
                active: true,
                name: bossEntity.name,
                chineseTitle: bossEntity.chineseTitle,
                hp: Math.max(0, Math.round(bossEntity.hp)),
                displayHp: Math.max(0, Math.round(bossEntity.displayHp)),
                maxHp: bossEntity.maxHp,
                posture: Math.max(0, Math.round(bossEntity.posture)),
                maxPosture: bossEntity.maxPosture,
                phase: bossEntity.phase,
                armorCracked:
                  bossEntity.type === 'xuemo' ? Boolean(bossEntity.armorCracked) : undefined,
              }
            : null,
        });
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [
    createEnemyFromSpec,
    damagePropsNearPoint,
    loadChamber,
    spawnAfterimage,
    spawnFloatingText,
    spawnParticles,
    spawnShockwave,
    triggerCloudStepDodge,
    triggerExecuteBrokenTarget,
    triggerGamepadRumble,
    triggerGourdHeal,
    triggerImmobilizeSpell,
    triggerLightAttack,
    triggerPluckOfManyClones,
    triggerRedTidesTransform,
    triggerRockSolidParry,
    triggerStanceHeavyUnleash,
    triggerSwitchStance,
    triggerSwitchWeapon,
  ]);

  // Sync modalPaused ref so opening Shrine, Story Codex, Boon Altar, Controls popover, or v7 Narrative Overlay freezes active combat
  useEffect(() => {
    simRef.current.modalPaused =
      shrineOpen || storyOpen || controlsOpen || boonModalOpen || sliceStage !== 'combat_arena';
  }, [shrineOpen, storyOpen, controlsOpen, boonModalOpen, sliceStage]);

  // Handle purchasing Keeper's Shrine Upgrades (applies stat deltas without granting free full-heal exploit on unrelated upgrades)
  const handlePurchaseUpgrade = useCallback((id: UpgradeId) => {
    const sim = simRef.current;
    const prevDerived = computeDerivedPlayerStats(sim.ranks);
    const res = purchaseShrineUpgrade(id, sim.ranks, sim.ashenKarma);
    if (!res.purchased) return;

    sim.ranks = res.ranks;
    sim.ashenKarma = res.availableKarma;
    const derived = computeDerivedPlayerStats(sim.ranks);
    const boonMods = computeBoonModifiers(sim.activeBoons);
    const hpDelta = Math.max(0, derived.maxHp - prevDerived.maxHp);
    const sipsDelta = Math.max(0, derived.maxGourdSips - prevDerived.maxGourdSips);
    const livesDelta = Math.max(0, derived.extraLives - prevDerived.extraLives);

    const nextMaxSips = derived.maxGourdSips + boonMods.gourdBonusMaxSips;
    sim.player.maxHp = derived.maxHp;
    sim.player.hp = Math.min(derived.maxHp, sim.player.hp + hpDelta);
    sim.player.displayHp = sim.player.hp;
    sim.player.maxGourdSips = nextMaxSips;
    sim.player.gourdSips = Math.min(nextMaxSips, sim.player.gourdSips + sipsDelta);
    sim.player.extraLives += livesDelta;
    sim.player.focusOrbs = Math.max(sim.player.focusOrbs, derived.startingFocusOrbs);

    setShrineRanks({ ...sim.ranks });
    setAshenKarma(sim.ashenKarma);
    try {
      window.localStorage.setItem(
        'kaliyuga_save_v1',
        JSON.stringify({ ashenKarma: sim.ashenKarma, ranks: sim.ranks })
      );
    } catch {}
    soundEngine.playSpell('gourd');
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#090807] select-none">
      {/* Isolated 2.5D Isometric Canvas Container */}
      <canvas
        ref={canvasRef}
        data-testid="kaliyuga-canvas"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const sx = e.clientX - rect.left;
          const sy = e.clientY - rect.top;
          const sim = simRef.current;
          const cw = sim.viewportW || 1440;
          const ch = sim.viewportH || 900;
          const zoom = sim.cameraZoom || BASE_CAMERA_ZOOM;
          sim.input.pointerScreenX = sx;
          sim.input.pointerScreenY = sy;
          sim.input.pointerX = (sx - cw * 0.5) / zoom + cw * 0.5 + sim.camX;
          sim.input.pointerY = (sy - ch * 0.5) / zoom + ch * 0.5 + sim.camY;
          sim.input.pointerActive = true;
        }}
        onMouseDown={(e) => {
          if (simRef.current.state !== 'playing') return;
          if (e.button === 2) {
            e.preventDefault();
            triggerStanceHeavyUnleash();
          } else if (e.button === 0) {
            triggerLightAttack();
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        className="block w-full h-full cursor-crosshair"
      />

      {/* Title Screen Stage */}
      {gameState === 'title' && (
        <TitleScreen
          ashenKarma={ashenKarma}
          preloadProgress={preloadProgress}
          selectedWeapon={hud.weapon}
          onSelectWeapon={(w) => {
            triggerSwitchWeapon(w);
            setHud((prev) => ({ ...prev, weapon: w }));
          }}
          onStartOdyssey={() => startGameAtChamber(0)}
          onOpenShrine={() => setShrineOpen(true)}
          onOpenStory={() => setStoryOpen(true)}
          onOpenPrologue={() => {
            simRef.current.state = 'playing';
            document.body.dataset.state = 'playing';
            setGameState('playing');
            setSliceStage('prologue_scrolls');
          }}
        />
      )}

      {/* World-Matched Low-Occlusion Perimeter HUD (>= 85% clear viewport) */}
      {gameState !== 'title' && (
        <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 md:p-4">
          {/* TOP PERIMETER BAR (single sleek row even on 1280px–1440px viewports with Boss + Boons active) */}
          <div className="flex items-start justify-between gap-1.5 w-full">
            <div className="flex items-start gap-1.5 min-w-0 flex-wrap">
              {/* Top-Left Chamber & Score Readout */}
              <div className="pointer-events-auto bg-[#0d0c10]/92 border border-[#c89d46]/45 px-2.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.85)] shrink-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <div>
                    <div className="text-[8px] tracking-[0.16em] text-[#d4a548] uppercase">
                      CHAMBER
                    </div>
                    <div className="font-mono-num text-[11px] font-bold text-[#f2c45a]">
                      {hud.chamberId}/{CHAMBERS.length}
                    </div>
                  </div>
                  <div className="h-4 w-[1px] bg-[#c89d46]/30" />
                  <div className="font-display text-[11px] xl:text-xs font-bold tracking-[0.04em] text-[#f7efe0]">
                    {hud.chamberName}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[9px] xl:text-[10px] font-mono-num text-[#b8ac98]">
                  <span>
                    FOES: <strong className="text-[#f2c45a]">{hud.foesRemaining}</strong>
                  </span>
                  <span>
                    SCORE: <strong className="text-[#f7efe0]">{hud.score}</strong>
                  </span>
                  {hud.comboCount > 1 && (
                    <span className="text-[#ff6a2b] font-bold">
                      {hud.comboCount} HIT!
                    </span>
                  )}
                </div>
              </div>

              {/* Savitri's Boat Hub & 3-State Lantern Status Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setSliceStage('vaitarani_hub');
                }}
                className="pointer-events-auto text-left bg-[#0d0c10]/92 hover:bg-[#191720] border border-[#c89d46]/45 px-2.5 py-1.5 transition-colors cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.85)] shrink-0"
              >
                <div className="text-[8px] tracking-[0.14em] text-[#d4a548] uppercase">
                  SAVITRI’S BOAT · LANTERN: {getLanternLightState(storyFlags).state.toUpperCase()}
                </div>
                <div className="text-[10px] font-mono-num text-[#f7efe0]">
                  LOOKS: <strong className="text-[#f2c45a]">{storyFlags.looks.length}/6</strong> · SHARDS: <strong className="text-[#3ee0a8]">{storyFlags.shardsRecovered}/7</strong>
                </div>
              </button>

              {/* Meru Engine v2.0 UE5 Lumen & Post-Processing Quality Tier Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  cycleGraphicsTier();
                }}
                className="pointer-events-auto text-left bg-[#0d0c10]/92 hover:bg-[#191720] border border-[#3ee0a8]/45 px-2.5 py-1.5 transition-colors cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.85)] shrink-0"
              >
                <div className="text-[8px] tracking-[0.14em] text-[#3ee0a8] uppercase">
                  [G] MERU UE5 ENGINE · {graphicsSettings.tier.toUpperCase()}
                </div>
                <div className="text-[10px] font-mono-num text-[#f7efe0]">
                  LUMEN GI: <strong className="text-[#f2c45a]">{graphicsSettings.lumenGiBounce ? 'ON' : 'OFF'}</strong> · IBL + BLOOM · <strong className="text-[#3ee0a8]">{hud.fps} FPS</strong>
                </div>
              </button>

              {/* Homa Fire Shrine Button */}
              <button
                type="button"
                data-testid="hud-shrine-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShrineOpen(true);
                }}
                className="pointer-events-auto text-left bg-[#0d0c10]/92 hover:bg-[#191720] border border-[#c89d46]/45 px-2.5 xl:px-3 py-1.5 transition-colors cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.85)] shrink-0"
              >
                <div className="text-[9px] tracking-[0.14em] text-[#b8ac98] uppercase">
                  HOMA FIRE SHRINE · AGNI KUND
                </div>
                <div className="font-mono-num text-xs xl:text-sm font-bold text-[#f2c45a]">
                  {hud.ashenKarma}{' '}
                  <span className="text-[11px] text-[#3ee0a8]">(+{hud.karmaRunDelta})</span>
                </div>
              </button>

              {/* Deva Altar Button & Active Astra Badges */}
              {boonReadyCount > 0 && (
                <button
                  type="button"
                  data-testid="hud-boon-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    openBoonAltar();
                  }}
                  className="pointer-events-auto text-left bg-[#1f170b]/95 hover:bg-[#2c200e] border-2 border-[#f2c45a] px-2.5 py-1.5 transition-colors cursor-pointer shadow-[0_0_24px_rgba(242,196,90,0.45)] shrink-0"
                >
                  <div className="text-[8px] tracking-[0.16em] text-[#ffd86b] uppercase font-bold">
                    DEVA ALTAR READY
                  </div>
                  <div className="font-display text-[11px] font-bold text-[#f7efe0]">
                    [B] CLAIM ASTRA ({boonReadyCount})
                  </div>
                </button>
              )}

              {/* Hades-Style Dual Reward Exit Gate Selector when Chamber is Cleared */}
              {hud.foesRemaining === 0 && hud.chamberId < CHAMBERS.length && !boonModalOpen && (
                <div className="pointer-events-auto flex items-center gap-1.5 bg-[#120e0a]/95 border border-[#f2c45a]/80 px-2.5 py-1 shadow-[0_0_28px_rgba(242,196,90,0.35)] shrink-0">
                  <span className="text-[9px] font-display font-bold tracking-wider text-[#ffd86b] uppercase mr-1">
                    CHOOSE EXIT GATE:
                  </span>
                  <button
                    type="button"
                    data-testid="exit-gate-left-btn"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      openBoonAltar();
                    }}
                    className="px-2 py-1 bg-[#261a0b] hover:bg-[#38260f] border border-[#f2c45a] text-[10px] font-bold text-[#ffd86b] cursor-pointer transition-colors"
                  >
                    ⬅ LEFT GATE: DEVA BOON
                  </button>
                  <button
                    type="button"
                    data-testid="exit-gate-right-btn"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      const sim = simRef.current;
                      const p = sim.player;
                      p.maxHp += 30;
                      p.hp = Math.min(p.maxHp, p.hp + 90);
                      p.displayHp = p.hp;
                      sim.ashenKarma += 95;
                      sim.karmaRunDelta += 95;
                      setAshenKarma(sim.ashenKarma);
                      sim.boonReadyCount = 0;
                      setBoonReadyCount(0);
                      soundEngine.playSpell('gourd');
                      loadChamber(sim.chamberIndex + 1, false);
                    }}
                    className="px-2 py-1 bg-[#0e241d] hover:bg-[#15362b] border border-[#3ee0a8] text-[10px] font-bold text-[#3ee0a8] cursor-pointer transition-colors"
                  >
                    ➡ RIGHT GATE: +30 MAX HP &amp; +95 KARMA
                  </button>
                </div>
              )}

              {ownedBoons.length > 0 && (
                <div className="pointer-events-auto hidden xl:flex items-center gap-1 bg-[#0d0c10]/90 border border-[#c89d46]/35 px-2 py-1 shrink-0">
                  <span className="text-[8px] tracking-widest text-[#a99e8b] uppercase mr-0.5">
                    ASTRAS:
                  </span>
                  {ownedBoons.map((bId) => {
                    const bDef = CELESTIAL_BOONS.find((b) => b.id === bId);
                    if (!bDef) return null;
                    const patron = IMMORTAL_PATRONS[bDef.patronId];
                    return (
                      <span
                        key={bId}
                        title={`${bDef.name}: ${bDef.summary}`}
                        style={{
                          borderColor: patron.accentColor,
                          color: patron.accentColor,
                        }}
                        className="px-1.5 py-0.5 text-[9px] font-mono-num font-bold border bg-black/60"
                      >
                        {bDef.name.split(' ')[0]}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Center Sovereign Boss Bar when fighting Dundubhi or Vrikodara */}
              {hud.boss && (
                <div className="pointer-events-auto bg-[#120d11]/95 border border-[#b83240]/70 px-3 py-1.5 min-w-[205px] xl:min-w-[240px] shadow-[0_12px_32px_rgba(0,0,0,0.9)] shrink-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div>
                      <div className="font-display text-xs font-bold tracking-wider text-[#f7efe0]">
                        {hud.boss.name}
                      </div>
                      <div className="text-[9px] text-[#e0b354]">{hud.boss.chineseTitle}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {hud.boss.armorCracked !== undefined && (
                        <div
                          className={`px-1.5 py-0.5 border text-[8px] font-mono-num uppercase ${
                            hud.boss.armorCracked
                              ? 'bg-[#331a12] border-[#ff6a2b] text-[#ffd86b]'
                              : 'bg-[#241d10] border-[#d4a548]/70 text-[#f2c45a]'
                          }`}
                        >
                          {hud.boss.armorCracked ? 'ARMOR CRACKED!' : 'BRONZE ARMOR · BAIT PILLAR'}
                        </div>
                      )}
                      <div className="px-1.5 py-0.5 bg-[#331218] border border-[#b83240]/60 text-[9px] font-mono-num text-[#ff8a94] uppercase">
                        PHASE {hud.boss.phase}/3
                      </div>
                    </div>
                  </div>

                  {/* Boss HP Bar with delayed white-gold damage trail */}
                  <div className="relative w-full h-2 bg-[#261317] border border-[#59222b] overflow-hidden mb-1">
                    <div
                      className="absolute inset-y-0 left-0 bg-[#ffe596]/85 transition-all duration-300"
                      style={{
                        width: `${Math.max(0, Math.min(100, (hud.boss.displayHp / hud.boss.maxHp) * 100))}%`,
                      }}
                    />
                    <div
                      className="relative h-full bg-gradient-to-r from-[#b82532] via-[#e03846] to-[#ff5e6c] transition-all duration-100"
                      style={{
                        width: `${Math.max(0, Math.min(100, (hud.boss.hp / hud.boss.maxHp) * 100))}%`,
                      }}
                    />
                  </div>

                  {/* Boss Posture Bar */}
                  <div className="flex items-center justify-between gap-1.5 text-[9px] font-mono-num">
                    <span className="text-[#c89d46] uppercase">POSTURE</span>
                    <div className="flex-1 h-1.5 bg-[#241f16] overflow-hidden">
                      <div
                        className="h-full bg-[#f2c45a] transition-all duration-150"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(100, (hud.boss.posture / hud.boss.maxPosture) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-[#f5ebd6]">
                      {hud.boss.posture}/{hud.boss.maxPosture}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Top-Right Utility Controls */}
            <div className="pointer-events-auto flex items-center gap-1 relative shrink-0">
              <div className="px-2 py-1.5 bg-[#0b1815]/90 border border-[#2a8f6c]/55 text-[10px] font-mono-num text-[#3ee0a8] whitespace-nowrap">
                {hud.fps} FPS
              </div>

              <button
                type="button"
                tabIndex={-1}
                data-testid="hud-story-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setStoryOpen(true);
                }}
                className="px-2.5 py-1.5 bg-[#0d0c10]/92 hover:bg-[#1b1922] border border-[#c89d46]/35 text-[11px] text-[#f2c45a] font-medium cursor-pointer whitespace-nowrap"
              >
                LORE CODEX
              </button>

              <button
                type="button"
                tabIndex={-1}
                data-testid="hud-controls-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setControlsOpen((prev) => !prev);
                }}
                className="px-2.5 py-1.5 bg-[#0d0c10]/92 hover:bg-[#1b1922] border border-[#c89d46]/35 text-[11px] text-[#e5dac5] font-medium cursor-pointer whitespace-nowrap"
              >
                CONTROLS ▾
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Toggle Fullscreen"
                onClick={(e) => {
                  e.currentTarget.blur();
                  toggleFullscreen();
                }}
                className="w-8 h-8 flex items-center justify-center bg-[#0d0c10]/92 hover:bg-[#1b1922] border border-[#c89d46]/35 text-[#f2c45a] cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Toggle Background Music"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setMusicOn(soundEngine.toggleMusic());
                }}
                className={`w-8 h-8 flex items-center justify-center border cursor-pointer ${
                  musicOn
                    ? 'bg-[#0d0c10]/92 border-[#c89d46]/45 text-[#f2c45a]'
                    : 'bg-[#0d0c10]/92 border-[#595246]/35 text-[#7a7162]'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setMuted((prev) => {
                    const next = !prev;
                    soundEngine.setMuted(next);
                    return next;
                  });
                }}
                className={`w-8 h-8 flex items-center justify-center border cursor-pointer ${
                  !muted
                    ? 'bg-[#0d0c10]/92 border-[#c89d46]/45 text-[#f2c45a]'
                    : 'bg-[#261215]/92 border-[#a83240]/60 text-[#ff6b78]'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  {!muted ? (
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
                  ) : (
                    <path d="M23 9l-6 6M17 9l6 6" />
                  )}
                </svg>
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Pause Game"
                onClick={(e) => {
                  e.currentTarget.blur();
                  const sim = simRef.current;
                  if (sim.state === 'playing') {
                    sim.state = 'paused';
                    document.body.dataset.state = 'paused';
                    setGameState('paused');
                    setOutcomeMode('paused');
                  }
                }}
                className="w-8 h-8 flex items-center justify-center bg-[#0d0c10]/92 hover:bg-[#1b1922] border border-[#c89d46]/45 text-[#f2c45a] cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              </button>

              {/* Controls & Chamber Quick-Select Popover */}
              {controlsOpen && (
                <div className="absolute right-0 top-11 w-80 bg-[#0e0d12] border border-[#c89d46]/65 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.95)] z-50 text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#c89d46]/25 pb-2">
                    <span className="font-display font-bold text-[#f2c45a] uppercase tracking-wider">
                      Combat Controls &amp; Chambers
                    </span>
                    <button
                      type="button"
                      onClick={() => setControlsOpen(false)}
                      className="text-[#a99e8b] hover:text-white cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-[#d6cab6] font-mono-num">
                    <span>WASD / Left Stick</span>
                    <span className="text-right text-[#f2c45a]">360° Move Rudra</span>
                    <span>LMB / [J] / [X/□]</span>
                    <span className="text-right text-[#f2c45a]">4-Hit Parashu Combo</span>
                    <span>RMB / [V] / [Y/△]</span>
                    <span className="text-right text-[#f2c45a]">Tapas Heavy Unleash</span>
                    <span>[Space] / [A/✕]</span>
                    <span className="text-right text-[#f2c45a]">Phantom Step Dash</span>
                    <span>[Tab] / [RB]</span>
                    <span className="text-right text-[#f2c45a]">Switch Stance</span>
                    <span>[1][2][3] / D-Pad</span>
                    <span className="text-right text-[#f2c45a]">Switch Parashu Aspect</span>
                    <span>[Q] / [T/LB] / [E]</span>
                    <span className="text-right text-[#f2c45a]">Agni Bow / Parry / Maya</span>
                    <span>[R/LT] / [F/B]</span>
                    <span className="text-right text-[#f2c45a]">Amrita Kalasha / Execute</span>
                  </div>
                  <div className="pt-2 border-t border-[#c89d46]/25">
                    <div className="text-[10px] tracking-widest text-[#a99e8b] uppercase mb-1.5">
                      Jump to Chamber:
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {CHAMBERS.map((chSpec, idx) => (
                        <button
                          key={chSpec.id}
                          type="button"
                          onClick={() => {
                            loadChamber(idx, false);
                            setControlsOpen(false);
                          }}
                          className={`py-1.5 px-2 text-[10px] font-mono-num border cursor-pointer ${
                            hud.chamberId === chSpec.id
                              ? 'bg-[#d4a548] text-[#090807] border-[#f5dca0] font-bold'
                              : 'bg-[#17151d] text-[#d6cab6] border-[#c89d46]/30 hover:border-[#c89d46]'
                          }`}
                        >
                          CH {chSpec.id} {chSpec.isBossChamber ? '[BOSS]' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM PERIMETER DOCK (single horizontal row matching ref_5s.jpg 1:1) */}
          <div className="flex items-end justify-between gap-1.5 w-full">
            {/* Bottom-Left: Rudra Vitality, Tapas Focus Orbs, Stance, Amrita Kalasha, Unleash & Execute */}
            <div className="pointer-events-auto flex items-stretch gap-1 xl:gap-1.5 bg-[#0b0a0e]/94 border border-[#c89d46]/45 p-1.5 xl:p-2 shadow-[0_12px_36px_rgba(0,0,0,0.92)] shrink-0">
              {/* Rudra HP & Tapas Focus Diamonds */}
              <div className="flex flex-col justify-between min-w-[124px] xl:min-w-[150px] pr-1">
                <div className="flex items-center justify-between text-[10px] xl:text-[11px] mb-1">
                  <span className="font-bold tracking-wider text-[#f7efe0]">RUDRA · ASH-BOUND</span>
                  <span className="font-mono-num font-bold text-[#3ee0a8]">
                    {hud.playerHp}/{hud.playerMaxHp}
                  </span>
                </div>

                {/* Vitality Bar with delayed white-gold damage trail */}
                <div className="relative w-full h-2 bg-[#1b2420] border border-[#2f5244] overflow-hidden mb-2">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#ffe596]/85 transition-all duration-300"
                    style={{
                      width: `${Math.max(0, Math.min(100, (hud.playerDisplayHp / hud.playerMaxHp) * 100))}%`,
                    }}
                  />
                  <div
                    className="relative h-full bg-gradient-to-r from-[#229e74] via-[#35d49c] to-[#68f5c4] transition-all duration-100"
                    style={{
                      width: `${Math.max(0, Math.min(100, (hud.playerHp / hud.playerMaxHp) * 100))}%`,
                    }}
                  />
                </div>

                {/* Focus Orbs (4 Golden Diamonds + Charge bar) */}
                <div className="flex items-center gap-1.5 xl:gap-2">
                  <span className="text-[9px] xl:text-[10px] tracking-[0.14em] text-[#c89d46] uppercase">
                    TAPAS
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2, 3].map((orbIdx) => {
                      const active = hud.focusOrbs > orbIdx;
                      return (
                        <div
                          key={orbIdx}
                          className={`w-3 h-3 xl:w-3.5 xl:h-3.5 rotate-45 border transition-colors ${
                            active
                              ? 'bg-[#f5c451] border-[#fff2b2] shadow-[0_0_8px_rgba(245,196,81,0.85)]'
                              : 'bg-[#1a181e] border-[#594e36]'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <div className="w-8 xl:w-10 h-1.5 bg-[#211e18] overflow-hidden ml-0.5">
                    <div
                      className="h-full bg-[#e3b55a]"
                      style={{ width: `${Math.round(hud.focusProgress * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Stance [TAB] 3-Column Selector */}
              <div className="flex flex-col justify-between pl-1.5 xl:pl-2 border-l border-[#c89d46]/25">
                <div className="text-[9px] tracking-[0.14em] text-[#9c917e] uppercase mb-1">
                  STANCE [TAB]
                </div>
                <div className="flex items-center gap-1">
                  {(['smash', 'pillar', 'thrust'] as StaffStance[]).map((st) => {
                    const cfg = STANCE_CONFIGS[st];
                    const active = hud.stance === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          triggerSwitchStance(st);
                        }}
                        className={`px-2 xl:px-2.5 py-1 xl:py-1.5 text-[10px] xl:text-[11px] leading-tight font-bold border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#241d11] text-[#f5c451] border-[#f5c451]'
                            : 'bg-[#141318] text-[#6e6659] border-[#2c2933] hover:text-[#b5a995]'
                        }`}
                      >
                        <span className="block text-center leading-[1.15]">
                          {cfg.chineseName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* [R] Amrita Kalasha Button */}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  triggerGourdHeal();
                }}
                className="px-2 xl:px-3 py-1 xl:py-1.5 bg-[#0e1f1b] hover:bg-[#152e28] border border-[#2d8a6e]/70 text-left transition-colors cursor-pointer min-w-[62px] xl:min-w-[74px]"
              >
                <div className="text-[9px] xl:text-[10px] font-mono-num text-[#3ee0a8]">[R] KALASHA</div>
                <div className="text-[11px] xl:text-xs font-bold font-mono-num text-[#f7efe0]">
                  {hud.gourdSips}/{hud.maxGourdSips}
                </div>
                <div className="text-[9px] xl:text-[10px] text-[#a9c7bc]">Amrita</div>
              </button>

              {/* [SPACE] Phantom Step Dash Button with 2-Charge Stamina Pips */}
              <button
                type="button"
                tabIndex={-1}
                data-testid="hud-dash-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  triggerCloudStepDodge();
                }}
                className="px-2 xl:px-3 py-1 xl:py-1.5 bg-[#0c1d24] hover:bg-[#132f3a] border border-[#45c7e8]/75 text-left transition-colors cursor-pointer min-w-[72px] xl:min-w-[86px]"
              >
                <div className="flex items-center justify-between gap-1 text-[9px] xl:text-[10px] font-mono-num text-[#63f2ff]">
                  <span>[SPACE] STEP</span>
                </div>
                <div className="text-[11px] xl:text-xs font-bold tracking-wider text-[#f7efe0]">
                  DASH ({hud.dashCharges}/{hud.maxDashCharges})
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {[0, 1].map((pipIdx) => (
                    <span
                      key={pipIdx}
                      className={`h-1.5 flex-1 transition-colors ${
                        hud.dashCharges > pipIdx
                          ? 'bg-[#5ce6ff] shadow-[0_0_6px_rgba(92,230,255,0.85)]'
                          : 'bg-[#1a333d]'
                      }`}
                    />
                  ))}
                </div>
              </button>

              {/* [V/RMB] Stance Unleash Button */}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  triggerStanceHeavyUnleash();
                }}
                className="px-2.5 xl:px-3.5 py-1 xl:py-1.5 bg-[#211a0e] hover:bg-[#302514] border border-[#d4a548]/80 text-left transition-colors cursor-pointer min-w-[88px] xl:min-w-[105px]"
              >
                <div className="text-[9px] xl:text-[10px] font-mono-num text-[#f2c45a]">
                  [V/RMB] {STANCE_CONFIGS[hud.stance].chineseName}
                </div>
                <div className="text-[11px] xl:text-xs font-bold tracking-wider text-[#f7efe0]">UNLEASH</div>
                <div className="text-[10px] xl:text-[11px] font-mono-num text-[#f2c45a]">({hud.focusOrbs})</div>
              </button>

              {/* Conditional [F] BROKEN! EXECUTE Button */}
              {hud.hasBrokenTarget && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    triggerExecuteBrokenTarget();
                  }}
                  className="px-2.5 xl:px-3.5 py-1 xl:py-1.5 bg-[#361117] hover:bg-[#4d1820] border border-[#ff4d5e] text-left transition-colors cursor-pointer min-w-[80px] xl:min-w-[96px]"
                >
                  <div className="text-[9px] xl:text-[10px] font-mono-num text-[#ff8a94]">[F] BROKEN!</div>
                  <div className="text-[11px] xl:text-xs font-bold text-[#ff6b78]">LETHAL</div>
                  <div className="text-[10px] xl:text-[11px] font-bold tracking-wider text-[#ffd86b]">
                    EXECUTE
                  </div>
                </button>
              )}
            </div>

            {/* Bottom-Right: Weapons [1][2][3] & Spells [Q][T][E][Z] Deck */}
            <div className="pointer-events-auto flex items-end gap-1 shrink-0">
              {(['twin_blades', 'jingu_bang', 'dragon_glaive'] as WeaponId[]).map((wId) => {
                const wCfg = WEAPON_CONFIGS[wId];
                const active = hud.weapon === wId;
                return (
                  <button
                    key={wId}
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      triggerSwitchWeapon(wId);
                    }}
                    className={`px-1.5 xl:px-2.5 py-1 xl:py-1.5 text-left border transition-colors cursor-pointer min-w-[54px] xl:min-w-[64px] ${
                      active
                        ? 'bg-[#211a0e] border-[#f2c45a] text-[#f7efe0]'
                        : 'bg-[#0d0c10]/94 border-[#3a3542] text-[#9c917e] hover:border-[#c89d46]/50'
                    }`}
                  >
                    <div className="text-[9px] xl:text-[10px] font-mono-num text-[#d4a548]">
                      [{wCfg.key}] {wCfg.chineseName.split(' ')[0]}
                    </div>
                    <div className="text-[10px] xl:text-[11px] font-bold text-[#f7efe0] mt-0.5">{wCfg.shortLabel}</div>
                  </button>
                );
              })}

              {/* [Q] Agneyastra Fire Bow */}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  triggerImmobilizeSpell();
                }}
                className={`px-1.5 xl:px-2.5 py-1 xl:py-1.5 text-left border transition-colors cursor-pointer min-w-[52px] xl:min-w-[64px] ${
                  hud.immobilizeCd <= 0
                    ? 'bg-[#17140d]/94 border-[#d4a548]/70 text-[#f7efe0] hover:bg-[#262013]'
                    : 'bg-[#0d0c10]/90 border-[#2f2b36] text-[#6e6659]'
                }`}
              >
                <div className="text-[9px] xl:text-[10px] font-mono-num text-[#d4a548]">[Q] AGNI</div>
                <div className="text-[9px] xl:text-[10px] text-[#c89d46]">ASTRA</div>
                <div className="text-[10px] xl:text-[11px] font-bold font-mono-num mt-0.5">
                  {hud.immobilizeCd <= 0 ? 'BOW' : `${hud.immobilizeCd.toFixed(1)}s`}
                </div>
              </button>

              {/* [T] Kalaripayattu Parry */}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  triggerRockSolidParry();
                }}
                className={`px-1.5 xl:px-2.5 py-1 xl:py-1.5 text-left border transition-colors cursor-pointer min-w-[52px] xl:min-w-[64px] ${
                  hud.parryCd <= 0
                    ? 'bg-[#17140d]/94 border-[#d4a548]/70 text-[#f7efe0] hover:bg-[#262013]'
                    : 'bg-[#0d0c10]/90 border-[#2f2b36] text-[#6e6659]'
                }`}
              >
                <div className="text-[9px] xl:text-[10px] font-mono-num text-[#d4a548]">[T] KALARI</div>
                <div className="text-[9px] xl:text-[10px] text-[#c89d46]">GUARD</div>
                <div className="text-[10px] xl:text-[11px] font-bold font-mono-num mt-0.5">
                  {hud.parryCd <= 0 ? 'PARRY' : `${hud.parryCd.toFixed(1)}s`}
                </div>
              </button>

              {/* [E] Look / Maya Phantoms */}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  triggerLookOrMirage();
                }}
                className={`px-1.5 xl:px-2.5 py-1 xl:py-1.5 text-left border transition-colors cursor-pointer min-w-[52px] xl:min-w-[64px] ${
                  hud.clonesCd <= 0
                    ? 'bg-[#17140d]/94 border-[#d4a548]/70 text-[#f7efe0] hover:bg-[#262013]'
                    : 'bg-[#0d0c10]/90 border-[#2f2b36] text-[#6e6659]'
                }`}
              >
                <div className="text-[9px] xl:text-[10px] font-mono-num text-[#d4a548]">[E] LOOK</div>
                <div className="text-[9px] xl:text-[10px] text-[#c89d46]">OR MAYA</div>
                <div className="text-[10px] xl:text-[11px] font-bold font-mono-num mt-0.5">
                  {hud.clonesCd <= 0 ? 'READY' : `${hud.clonesCd.toFixed(1)}s`}
                </div>
              </button>

              {/* [Z] Rudra Tandava */}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  triggerRedTidesTransform();
                }}
                className={`px-1.5 xl:px-2.5 py-1 xl:py-1.5 text-left border transition-colors cursor-pointer min-w-[52px] xl:min-w-[64px] ${
                  hud.transformActiveTimer > 0
                    ? 'bg-[#36160d] border-[#ff6a33] text-[#ffd86b]'
                    : hud.transformCd <= 0
                    ? 'bg-[#1f120d]/94 border-[#c85a32]/75 text-[#f7efe0] hover:bg-[#2e1a12]'
                    : 'bg-[#0d0c10]/90 border-[#2f2b36] text-[#6e6659]'
                }`}
              >
                <div className="text-[9px] xl:text-[10px] font-mono-num text-[#ff7b47]">[Z] RUDRA</div>
                <div className="text-[9px] xl:text-[10px] text-[#ff9466]">TANDAVA</div>
                <div className="text-[10px] xl:text-[11px] font-bold font-mono-num mt-0.5">
                  {hud.transformActiveTimer > 0
                    ? `${hud.transformActiveTimer.toFixed(1)}s`
                    : hud.transformCd <= 0
                    ? 'WRATH'
                    : `${hud.transformCd.toFixed(1)}s`}
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* v7 Story & Game Design Document Narrative Overlay (Prologue, Ash Hill, Savitri's Boat Hub, [E] Look, Shard #1, Ferry I, Endings) */}
      <NarrativeOverlay
        stage={sliceStage}
        storyFlags={storyFlags}
        activeLookModal={activeLookModal}
        onCloseLookModal={() => {
          simRef.current.activeLookObject = null;
          setActiveLookModal(null);
        }}
        onAdvanceStage={(nextStage, updatedFlags) => {
          if (updatedFlags) {
            updateStoryFlags(updatedFlags);
            if (updatedFlags.looks && !storyFlags.looks.includes('lantern_ledger_page') && updatedFlags.looks.includes('lantern_ledger_page')) {
              soundEngine.playLookRoomTone();
              soundEngine.playSuvarnaLullaby();
              simRef.current.ashenKarma += 65;
              setAshenKarma(simRef.current.ashenKarma);
            }
          }
          setSliceStage(nextStage);
        }}
        onOpenShrine={() => setShrineOpen(true)}
        onStartAct1Run={(startChamberIndex = 0) => {
          setSliceStage('combat_arena');
          startGameAtChamber(startChamberIndex);
        }}
      />

      {/* Hades-Style Celestial Boon Selection Modal */}
      <BoonModal
        isOpen={boonModalOpen}
        choices={boonChoices}
        ownedBoons={ownedBoons}
        rerollsRemaining={boonRerolls}
        chamberId={hud.chamberId}
        onSelectBoon={handleSelectBoon}
        onRerollChoices={handleRerollBoons}
      />

      {/* Keeper's Shrine Sanctuary Modal */}
      <KeepersShrineModal
        isOpen={shrineOpen}
        ranks={shrineRanks}
        availableKarma={ashenKarma}
        onPurchase={handlePurchaseUpgrade}
        onStartChamber={(chIdx) => startGameAtChamber(chIdx)}
        onClose={() => setShrineOpen(false)}
      />

      {/* Story & Build Compendium Modal */}
      <StoryCodexModal
        isOpen={storyOpen}
        onClose={() => setStoryOpen(false)}
        onApplyBuildPreset={(preset) => {
          triggerSwitchStance(preset.stance);
          triggerSwitchWeapon(preset.weapon);
        }}
      />

      {/* Pause / Victory / Defeat Status Modal */}
      <OutcomeModal
        mode={outcomeMode}
        chamberId={hud.chamberId}
        chamberName={hud.chamberName}
        finalScore={hud.score}
        karmaEarnedThisRun={hud.karmaRunDelta}
        totalKarma={hud.ashenKarma}
        onResume={() => {
          simRef.current.state = 'playing';
          document.body.dataset.state = 'playing';
          setGameState('playing');
          setOutcomeMode('none');
        }}
        onPlayAgain={() => startGameAtChamber(0)}
        onOpenShrine={() => setShrineOpen(true)}
        onReturnTitle={() => {
          simRef.current.state = 'title';
          document.body.dataset.state = 'title';
          setGameState('title');
          setOutcomeMode('none');
        }}
      />
    </main>
  );
}
