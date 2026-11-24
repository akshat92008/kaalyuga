// Hades-Style Isometric Chamber Collision Boundaries, Asset-Driven Exit Gates, Reward Orbs, Floor Traps & Foreground Parallax
import { GAME_ASSETS } from './assets';
import { computeArenaFloorGradeSpec } from './hadesSpriteBaker';
import { getChamberBiomeProfile } from './kalaBhairavaSusanoo';
import { getProcessedSpriteSync } from './spriteProcessor';

export interface NormPoint {
  x: number;
  y: number;
}

export interface ChamberTrapSpec {
  id: string;
  kind: 'agni_vent' | 'chakram_slicer';
  x: number;
  y: number;
  radius: number;
}

export interface ChamberTrapRuntime {
  id: string;
  kind: 'agni_vent' | 'chakram_slicer';
  x: number;
  y: number;
  radius: number;
  state: 'idle' | 'priming' | 'erupting' | 'cooldown';
  timer: number;
}

export interface ChamberGeometrySpec {
  outerPolygon: NormPoint[];
  chasmIslands: NormPoint[][];
  leftGate: { x: number; y: number; angle: number };
  rightGate: { x: number; y: number; angle: number };
  traps: ChamberTrapSpec[];
}

// Calibrated expansive walkable stone platform polygons matching the 8 hand-painted 16:9 isometric arenas
// Top terrace vertices encompass both Left & Right Sanctuary Exit Gates so Rudra can walk straight into either door!
const CHAMBER_GEOMETRIES: ChamberGeometrySpec[] = [
  // Chamber 1: Vaitarani River Ghat (Grounded Stone Platform — Never Enters Sky/Walls)
  {
    outerPolygon: [
      { x: 0.22, y: 0.35 },
      { x: 0.50, y: 0.33 },
      { x: 0.78, y: 0.35 },
      { x: 0.89, y: 0.48 },
      { x: 0.86, y: 0.74 },
      { x: 0.50, y: 0.90 },
      { x: 0.14, y: 0.74 },
      { x: 0.11, y: 0.48 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.37, y: 0.36, angle: -0.35 },
    rightGate: { x: 0.63, y: 0.36, angle: 0.35 },
    traps: [],
  },
  // Chamber 2: Raktabija Blood-Kunda Courtyard (Wide Octagonal Courtyard)
  {
    outerPolygon: [
      { x: 0.22, y: 0.35 },
      { x: 0.78, y: 0.35 },
      { x: 0.89, y: 0.46 },
      { x: 0.89, y: 0.74 },
      { x: 0.72, y: 0.90 },
      { x: 0.28, y: 0.90 },
      { x: 0.11, y: 0.74 },
      { x: 0.11, y: 0.46 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.37, y: 0.36, angle: -0.35 },
    rightGate: { x: 0.63, y: 0.36, angle: 0.35 },
    traps: [],
  },
  // Chamber 3: Kurukshetra Chariot Bonefield
  {
    outerPolygon: [
      { x: 0.22, y: 0.35 },
      { x: 0.78, y: 0.35 },
      { x: 0.89, y: 0.46 },
      { x: 0.87, y: 0.78 },
      { x: 0.70, y: 0.90 },
      { x: 0.30, y: 0.90 },
      { x: 0.13, y: 0.78 },
      { x: 0.11, y: 0.46 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.37, y: 0.36, angle: -0.35 },
    rightGate: { x: 0.63, y: 0.36, angle: 0.35 },
    traps: [],
  },
  // Chamber 4: Mandapa of the War-Drum (Dundubhi Mid-Boss)
  {
    outerPolygon: [
      { x: 0.22, y: 0.35 },
      { x: 0.78, y: 0.35 },
      { x: 0.90, y: 0.48 },
      { x: 0.87, y: 0.80 },
      { x: 0.72, y: 0.90 },
      { x: 0.28, y: 0.90 },
      { x: 0.13, y: 0.80 },
      { x: 0.10, y: 0.48 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.38, y: 0.36, angle: -0.32 },
    rightGate: { x: 0.62, y: 0.36, angle: 0.32 },
    traps: [],
  },
  // Chamber 5: Bhairava Soul-Fire Sanctum
  {
    outerPolygon: [
      { x: 0.22, y: 0.35 },
      { x: 0.78, y: 0.35 },
      { x: 0.89, y: 0.46 },
      { x: 0.87, y: 0.78 },
      { x: 0.70, y: 0.90 },
      { x: 0.30, y: 0.90 },
      { x: 0.13, y: 0.78 },
      { x: 0.11, y: 0.46 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.37, y: 0.36, angle: -0.35 },
    rightGate: { x: 0.63, y: 0.36, angle: 0.35 },
    traps: [],
  },
  // Chamber 6: Shattered Gopuram Causeway
  {
    outerPolygon: [
      { x: 0.22, y: 0.35 },
      { x: 0.78, y: 0.35 },
      { x: 0.89, y: 0.46 },
      { x: 0.87, y: 0.78 },
      { x: 0.70, y: 0.90 },
      { x: 0.30, y: 0.90 },
      { x: 0.13, y: 0.78 },
      { x: 0.11, y: 0.46 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.37, y: 0.36, angle: -0.35 },
    rightGate: { x: 0.63, y: 0.36, angle: 0.35 },
    traps: [],
  },
  // Chamber 7: Sealed Gate of Jatharagni (Asura Lava Sanctum Locked -> Unlocked)
  {
    outerPolygon: [
      { x: 0.22, y: 0.35 },
      { x: 0.78, y: 0.35 },
      { x: 0.88, y: 0.48 },
      { x: 0.85, y: 0.80 },
      { x: 0.68, y: 0.90 },
      { x: 0.32, y: 0.90 },
      { x: 0.15, y: 0.80 },
      { x: 0.12, y: 0.48 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.40, y: 0.36, angle: 0 },
    rightGate: { x: 0.60, y: 0.36, angle: 0 },
    traps: [],
  },
  // Chamber 8: Sanctum of the Infernal Maw (Final Boss Vrikodara: Circular Naga / Eclipse Platform)
  {
    outerPolygon: [
      { x: 0.24, y: 0.35 },
      { x: 0.50, y: 0.33 },
      { x: 0.76, y: 0.35 },
      { x: 0.89, y: 0.48 },
      { x: 0.84, y: 0.78 },
      { x: 0.50, y: 0.90 },
      { x: 0.16, y: 0.78 },
      { x: 0.11, y: 0.48 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.38, y: 0.36, angle: -0.32 },
    rightGate: { x: 0.62, y: 0.36, angle: 0.32 },
    traps: [],
  },
];

export function getChamberGeometry(chamberIndex: number): ChamberGeometrySpec {
  const idx = Math.max(0, Math.min(CHAMBER_GEOMETRIES.length - 1, chamberIndex));
  return CHAMBER_GEOMETRIES[idx];
}

export function createChamberTrapsRuntime(
  chamberIndex: number,
  worldW: number,
  worldH: number
): ChamberTrapRuntime[] {
  const geom = getChamberGeometry(chamberIndex);
  return geom.traps.map((t) => ({
    id: t.id,
    kind: t.kind,
    x: t.x * worldW,
    y: t.y * worldH,
    radius: Math.round(t.radius * 1.18),
    state: 'idle',
    timer: 0,
  }));
}

function isPointInPolygon(px: number, py: number, poly: NormPoint[], w: number, h: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x * w;
    const yi = poly[i].y * h;
    const xj = poly[j].x * w;
    const yj = poly[j].y * h;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 0.00001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function closestPointOnPolygon(
  px: number,
  py: number,
  poly: NormPoint[],
  w: number,
  h: number
): { x: number; y: number; nx: number; ny: number } {
  let bestX = px;
  let bestY = py;
  let bestDistSq = Infinity;
  let bestNx = 0;
  let bestNy = -1;

  const cx = w * 0.5;
  const cy = h * 0.52;

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ax = a.x * w;
    const ay = a.y * h;
    const bx = b.x * w;
    const by = b.y * h;
    const abx = bx - ax;
    const aby = by - ay;
    const abLenSq = abx * abx + aby * aby || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / abLenSq));
    const qx = ax + abx * t;
    const qy = ay + aby * t;
    const dx = px - qx;
    const dy = py - qy;
    const dSq = dx * dx + dy * dy;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestX = qx;
      bestY = qy;
      const toCenterLen = Math.hypot(cx - qx, cy - qy) || 1;
      bestNx = (cx - qx) / toCenterLen;
      bestNy = (cy - qy) / toCenterLen;
    }
  }
  return { x: bestX, y: bestY, nx: bestNx, ny: bestNy };
}

export function constrainActorToChamber(
  nextX: number,
  nextY: number,
  vx: number,
  vy: number,
  worldW: number,
  worldH: number,
  chamberIndex: number,
  _isDodging: boolean,
  _isBoss: boolean,
  marginPx: number = 12
): {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hitOuterWall: boolean;
  hitChasmEdge: boolean;
  vaultedChasm: boolean;
  normalX: number;
  normalY: number;
} {
  const geom = getChamberGeometry(chamberIndex);

  // Allow unobstructed entry into the Left & Right Sanctuary Exit Gate alcoves!
  const lGx = geom.leftGate.x * worldW;
  const lGy = geom.leftGate.y * worldH;
  const rGx = geom.rightGate.x * worldW;
  const rGy = geom.rightGate.y * worldH;
  const nearGateAlcove =
    Math.hypot(nextX - lGx, nextY - lGy) < 82 || Math.hypot(nextX - rGx, nextY - rGy) < 82;
  if (nearGateAlcove) {
    return {
      x: Math.max(worldW * 0.14, Math.min(worldW * 0.86, nextX)),
      y: Math.max(worldH * 0.32, Math.min(worldH * 0.88, nextY)),
      vx,
      vy,
      hitOuterWall: false,
      hitChasmEdge: false,
      vaultedChasm: false,
      normalX: 0,
      normalY: -1,
    };
  }

  const insideOuter = isPointInPolygon(nextX, nextY, geom.outerPolygon, worldW, worldH);

  if (!insideOuter) {
    const closest = closestPointOnPolygon(nextX, nextY, geom.outerPolygon, worldW, worldH);
    const clampedX = closest.x + closest.nx * marginPx;
    const clampedY = closest.y + closest.ny * marginPx;
    const dot = vx * closest.nx + vy * closest.ny;
    const outVx = dot < 0 ? vx - closest.nx * dot : vx;
    const outVy = dot < 0 ? vy - closest.ny * dot : vy;
    return {
      x: clampedX,
      y: clampedY,
      vx: outVx,
      vy: outVy,
      hitOuterWall: true,
      hitChasmEdge: false,
      vaultedChasm: false,
      normalX: closest.nx,
      normalY: closest.ny,
    };
  }

  return {
    x: nextX,
    y: nextY,
    vx,
    vy,
    hitOuterWall: false,
    hitChasmEdge: false,
    vaultedChasm: false,
    normalX: 0,
    normalY: -1,
  };
}

// Deep Obsidian Underworld Backdrop (Seamless Hades-style void behind chamber bounds)
export function renderParallaxAbyss(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  _camX: number,
  _camY: number,
  _now: number,
  chamberIndex: number
) {
  ctx.save();
  const abyssGrad = ctx.createLinearGradient(0, 0, 0, ch);
  if (chamberIndex >= 6) {
    abyssGrad.addColorStop(0, '#090306');
    abyssGrad.addColorStop(0.55, '#120407');
    abyssGrad.addColorStop(1, '#1c0605');
  } else {
    abyssGrad.addColorStop(0, '#050407');
    abyssGrad.addColorStop(0.55, '#0b0608');
    abyssGrad.addColorStop(1, '#140807');
  }
  ctx.fillStyle = abyssGrad;
  ctx.fillRect(0, 0, cw, ch);
  ctx.restore();
}

// Singleton 60 FPS Arena Video Pool (Only 1 active GPU-accelerated decoder at a time, zero double-blit)
const arenaVideoPool = new Map<string, HTMLVideoElement>();
let currentPlayingVideoUrl: string | null = null;
const arenaVideoPlayPending = new Set<string>();
let videoGestureUnlockBound = false;

function bindVideoGestureUnlock(): void {
  if (videoGestureUnlockBound || typeof window === 'undefined') return;
  videoGestureUnlockBound = true;
  const resumeActiveVideo = () => {
    if (!currentPlayingVideoUrl) return;
    const active = arenaVideoPool.get(currentPlayingVideoUrl);
    if (active && active.paused) {
      active.play().catch(() => {});
    }
  };
  window.addEventListener('pointerdown', resumeActiveVideo, { passive: true });
  window.addEventListener('keydown', resumeActiveVideo, { passive: true });
}

export function prewarmArenaVideo(videoUrl: string | undefined): void {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !videoUrl) {
    return;
  }
  bindVideoGestureUnlock();
  if (arenaVideoPool.has(videoUrl)) return;
  const video = document.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = encodeURI(videoUrl);
  const tryStart = () => {
    if (currentPlayingVideoUrl === videoUrl && video.paused) {
      video.play().catch(() => {});
    }
  };
  video.addEventListener('loadeddata', tryStart);
  video.addEventListener('canplay', tryStart);
  video.load();
  arenaVideoPool.set(videoUrl, video);
}

export function getOrStartArenaVideo(videoUrl: string | undefined, paused: boolean = false): HTMLVideoElement | null {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !videoUrl) {
    return null;
  }
  bindVideoGestureUnlock();
  let video = arenaVideoPool.get(videoUrl);
  if (!video) {
    video = document.createElement('video');
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = encodeURI(videoUrl);
    const targetVid = video;
    const tryStart = () => {
      if (currentPlayingVideoUrl === videoUrl && targetVid.paused) {
        targetVid.play().catch(() => {});
      }
    };
    targetVid.addEventListener('loadeddata', tryStart);
    targetVid.addEventListener('canplay', tryStart);
    targetVid.load();
    arenaVideoPool.set(videoUrl, video);
  }

  // Pause all other chamber videos so devices only decode 1 active arena MP4
  if (currentPlayingVideoUrl !== videoUrl) {
    arenaVideoPool.forEach((otherVid, url) => {
      if (url !== videoUrl && !otherVid.paused) {
        try {
          otherVid.pause();
        } catch {}
      }
    });
    currentPlayingVideoUrl = videoUrl;
  }

  if (paused) {
    if (!video.paused) {
      try {
        video.pause();
      } catch {}
    }
  } else if (video.paused && !arenaVideoPlayPending.has(videoUrl)) {
    arenaVideoPlayPending.add(videoUrl);
    video
      .play()
      .catch(() => {})
      .finally(() => {
        arenaVideoPlayPending.delete(videoUrl);
      });
  }

  return video;
}

// Render Seamless Vast 2.5D Hand-Painted Isometric Sanctuary + HD Animated Video Arena + Surface Craters + Exit Gates
export function renderIsometricChamberPlatform(
  ctx: CanvasRenderingContext2D,
  worldW: number,
  worldH: number,
  bgImg: HTMLImageElement | undefined,
  _floorTint: string,
  chamberIndex: number,
  now: number,
  isChamberCleared: boolean,
  isNextChamberBoss: boolean,
  renderSurfaceDetailsCallback: () => void,
  activeVideoUrl?: string,
  disableVideoBg: boolean = false
) {
  ctx.save();

  const geom = getChamberGeometry(chamberIndex);
  const biome = getChamberBiomeProfile(chamberIndex);
  const resolvedVideoUrl = !disableVideoBg ? activeVideoUrl : undefined;
  const activeVideo = resolvedVideoUrl ? getOrStartArenaVideo(resolvedVideoUrl, false) : null;
  // Render decoded MP4 frame 0 immediately instead of waiting for currentTime > 0.01
  const isVideoReady =
    Boolean(activeVideo) &&
    activeVideo!.readyState >= 2 &&
    activeVideo!.videoWidth > 0 &&
    activeVideo!.videoHeight > 0;
  const isBgImgReady = Boolean(bgImg && bgImg.complete && bgImg.naturalWidth > 0);

  // 1. Paint per-chamber 60-30-10 sanctuary backdrop base + static art underneath so there is NEVER a blank frame
  const floorGrad = ctx.createRadialGradient(
    worldW * 0.5,
    worldH * 0.52,
    worldW * 0.08,
    worldW * 0.5,
    worldH * 0.52,
    worldW * 0.68
  );
  floorGrad.addColorStop(0, biome.baseCenterHex);
  floorGrad.addColorStop(0.55, biome.baseMidHex);
  floorGrad.addColorStop(1, biome.baseEdgeHex);
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, 0, worldW, worldH);

  if (isBgImgReady && bgImg) {
    ctx.drawImage(bgImg, 0, 0, worldW, worldH);
  }

  if (isVideoReady && activeVideo) {
    ctx.drawImage(activeVideo, 0, 0, worldW, worldH);
  }

  if (!isBgImgReady && !isVideoReady) {
    // Walkable Sanctuary Platform Stone Polygon while high-res media finishes streaming
    ctx.save();
    ctx.beginPath();
    geom.outerPolygon.forEach((pt, idx) => {
      const px = pt.x * worldW;
      const py = pt.y * worldH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = biome.baseMidHex;
    ctx.fill();
    ctx.strokeStyle = biome.rimAccentHex;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  // 1.5. Distinct Per-Chamber 60-30-10 Atmospheric Grading & Horizon Mist:
  // Gives each of the 8 Act I chambers a recognizable chromatic mood while keeping cel VFX crisp
  ctx.save();
  const moodGrad = ctx.createRadialGradient(
    worldW * 0.5,
    worldH * 0.52,
    worldW * 0.1,
    worldW * 0.5,
    worldH * 0.52,
    worldW * 0.7
  );
  moodGrad.addColorStop(0, biome.moodCenterRgba);
  moodGrad.addColorStop(0.55, biome.moodMidRgba);
  moodGrad.addColorStop(1, biome.moodEdgeRgba);
  ctx.fillStyle = moodGrad;
  ctx.fillRect(0, 0, worldW, worldH);

  // Subtle top-horizon atmospheric sheen keyed to each biome
  const horizonGrad = ctx.createLinearGradient(0, 0, 0, worldH * 0.42);
  horizonGrad.addColorStop(0, biome.horizonGlowRgba);
  horizonGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = horizonGrad;
  ctx.fillRect(0, 0, worldW, worldH * 0.42);

  // Subtle crisp isometric courtyard flagstone masonry & center arena combat seal
  ctx.save();
  ctx.beginPath();
  geom.outerPolygon.forEach((pt, idx) => {
    const px = pt.x * worldW;
    const py = pt.y * worldH;
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.clip();

  const cx = worldW * 0.5;
  const cy = worldH * 0.54;
  ctx.strokeStyle = biome.flagstoneStrokeRgba;
  ctx.lineWidth = 1.2;
  const tileStep = 76;
  for (let i = -14; i <= 14; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * tileStep - 640, cy - 360);
    ctx.lineTo(cx + i * tileStep + 640, cy + 360);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + i * tileStep + 640, cy - 360);
    ctx.lineTo(cx + i * tileStep - 640, cy + 360);
    ctx.stroke();
  }

  // Carved Center Courtyard Ring & Octagonal Seal
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.56);
  ctx.strokeStyle = chamberIndex >= 5 ? 'rgba(255, 160, 92, 0.18)' : 'rgba(186, 220, 255, 0.16)';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(0, 0, 220, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = chamberIndex >= 5 ? 'rgba(255, 92, 56, 0.12)' : 'rgba(120, 178, 255, 0.11)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 152, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.restore();

  // 1.6. Always layer 2D Anime Demon Slayer atmospheric effects (sunbeams, wind streaks, brazier blooms, wisteria petals & Hinokami sparks)
  renderProceduralArenaAtmosphere(ctx, worldW, worldH, chamberIndex, now);

  // 2. Surface decals, craters, and ambient details
  renderSurfaceDetailsCallback();

  // ============================================================================
  // 4. MONUMENTAL ISOMETRIC "GATE TO ANOTHER PATH" ARCHWAYS, CAUSEWAYS & REWARD ORBS
  // ============================================================================
  const gatesAsset = getProcessedSpriteSync(GAME_ASSETS.exitGateArchways2x1);
  const gateOverlaysAsset = getProcessedSpriteSync(GAME_ASSETS.gateOverlays2x2);
  const rewardOrbsAsset = getProcessedSpriteSync(GAME_ASSETS.rewardOrbs2x2);

  if (chamberIndex < 7) {
    const gates = [
      {
        pos: geom.leftGate,
        orbFrame: isNextChamberBoss ? 3 : 0,
        label: isNextChamberBoss ? 'PATH OF THE SOVEREIGN' : 'PATH OF DEVA BOONS',
        subLabel: isNextChamberBoss ? 'BOSS SANCTUM AHEAD' : 'DIVINE ASTRAS & BLESSINGS',
        accent: isNextChamberBoss ? '#b81d2a' : '#ffd86b',
        angle: -0.34,
      },
      {
        pos: geom.rightGate,
        orbFrame: isNextChamberBoss ? 2 : 1,
        label: isNextChamberBoss ? 'PATH OF THE SHRINE' : 'PATH OF AMRITA',
        subLabel: isNextChamberBoss ? 'SANCTUARY + RESTORE' : 'SACRED NECTAR +35 HP',
        accent: isNextChamberBoss ? '#d4a548' : '#f2c45a',
        angle: 0.34,
      },
    ];

    gates.forEach((g, gIdx) => {
      const gx = g.pos.x * worldW;
      const gy = g.pos.y * worldH;
      const pulse = 0.85 + Math.sin(now * 0.005 + gIdx * 1.6) * 0.15;

      // 4.1. Flush Recessed Isometric Floor Portal & Vedic Yantra Threshold (Feathered blend into stone floor, never a hard black disc!)
      ctx.save();
      ctx.translate(gx, gy + 4);
      ctx.scale(1, 0.52);

      // Soft feathered stone-carved threshold shadow instead of hard opaque black circle
      const outerR = isChamberCleared ? 78 : 66;
      const baseFeather = ctx.createRadialGradient(0, 0, outerR * 0.15, 0, 0, outerR + 14);
      baseFeather.addColorStop(0, 'rgba(18, 11, 9, 0.42)');
      baseFeather.addColorStop(0.68, 'rgba(18, 11, 9, 0.18)');
      baseFeather.addColorStop(1, 'rgba(18, 11, 9, 0)');
      ctx.fillStyle = baseFeather;
      ctx.beginPath();
      ctx.arc(0, 0, outerR + 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isChamberCleared ? g.accent + 'cc' : 'rgba(198, 146, 84, 0.38)';
      ctx.lineWidth = isChamberCleared ? 2.6 : 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, outerR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = isChamberCleared ? '#fff0c8aa' : 'rgba(160, 88, 54, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, outerR * 0.74, 0, Math.PI * 2);
      ctx.stroke();

      // 8-point Vedic Ashtadala Lotus / Yantra spokes carved flat into the floor
      const rot = isChamberCleared ? now * 0.0008 * (gIdx === 0 ? 1 : -1) : 0;
      ctx.save();
      ctx.rotate(rot);
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        ctx.strokeStyle = isChamberCleared ? g.accent + 'cc' : 'rgba(210, 95, 55, 0.35)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (outerR * 0.28), Math.sin(a) * (outerR * 0.28));
        ctx.lineTo(Math.cos(a) * (outerR * 0.94), Math.sin(a) * (outerR * 0.94));
        ctx.stroke();
      }
      ctx.restore();

      // Inner glowing portal well
      const gatePool = ctx.createRadialGradient(0, 0, 6, 0, 0, outerR);
      gatePool.addColorStop(0, isChamberCleared ? g.accent + 'cc' : 'rgba(255, 68, 36, 0.45)');
      gatePool.addColorStop(0.58, isChamberCleared ? g.accent + '44' : 'rgba(180, 42, 24, 0.18)');
      gatePool.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gatePool;
      ctx.beginPath();
      ctx.arc(0, 0, outerR, 0, Math.PI * 2);
      ctx.fill();

      // Project gate overlay rune flat onto the isometric floor plane
      if (gateOverlaysAsset && gateOverlaysAsset.frames.length >= 2) {
        const overlayIdx = isChamberCleared ? 1 : 0;
        const f = gateOverlaysAsset.frames[overlayIdx] || gateOverlaysAsset.frames[0];
        const ovSize = outerR * 1.65;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = isChamberCleared ? 0.85 * pulse : 0.65;
        ctx.drawImage(
          gateOverlaysAsset.cleanCanvas,
          f.sx,
          f.sy,
          f.sw,
          f.sh,
          -ovSize * 0.5,
          -ovSize * 0.5,
          ovSize,
          ovSize
        );
        ctx.restore();
      }
      ctx.restore();

      // 4.15. 2x1 Vedic Chained Gate Archway (d647kw...png: Frame 0 = Chained & Padlocked, Frame 1 = Shattered Chains & Open Crimson Portal)
      if (gatesAsset && gatesAsset.frames.length >= 2) {
        const gateFrameIdx = isChamberCleared ? 1 : 0;
        const gf = gatesAsset.frames[gateFrameIdx] || gatesAsset.frames[0];
        const archH = 114;
        const archW = (gf.sw / Math.max(1, gf.sh)) * archH;
        ctx.save();
        ctx.translate(gx, gy + 10);
        if (gIdx === 1) {
          ctx.scale(-1, 1);
        }
        ctx.drawImage(
          gatesAsset.cleanCanvas,
          gf.sx,
          gf.sy,
          gf.sw,
          gf.sh,
          -archW * 0.5,
          -archH * 0.86,
          archW,
          archH
        );
        ctx.restore();
      }

      // 4.2. Grounded Next-Path Reward Sigil & Path Inscription (Appears once the chamber is cleared so nothing floats in the air during combat!)
      if (isChamberCleared && rewardOrbsAsset && rewardOrbsAsset.frames.length > 0) {
        const orbIdx = Math.min(rewardOrbsAsset.frames.length - 1, g.orbFrame);
        const of = rewardOrbsAsset.frames[orbIdx];
        const bobY = Math.sin(now * 0.004 + g.orbFrame * 1.7) * 4;
        const orbSize = 52;

        ctx.save();
        ctx.translate(gx, gy - 22 + bobY);
        ctx.globalAlpha = isChamberCleared ? 1.0 : 0.84;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const oGlow = ctx.createRadialGradient(0, 0, 4, 0, 0, orbSize * 0.95);
        oGlow.addColorStop(0, g.accent + 'bb');
        oGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = oGlow;
        ctx.beginPath();
        ctx.arc(0, 0, orbSize * 0.95, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.drawImage(
          rewardOrbsAsset.cleanCanvas,
          of.sx,
          of.sy,
          of.sw,
          of.sh,
          -orbSize * 0.5,
          -orbSize * 0.5,
          orbSize,
          orbSize
        );

        ctx.font = "bold 12px 'Cinzel', Georgia, serif";
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.95)';
        ctx.lineWidth = 3.5;
        const titleText = isChamberCleared ? `UNSEALED · ${g.label}` : `SEALED · ${g.label}`;
        ctx.strokeText(titleText, 0, orbSize * 0.54 + 12);
        ctx.fillStyle = isChamberCleared ? g.accent : '#d8b48a';
        ctx.fillText(titleText, 0, orbSize * 0.54 + 12);

        if (isChamberCleared) {
          ctx.font = "600 10px 'Plus Jakarta Sans', sans-serif";
          ctx.strokeText(g.subLabel, 0, orbSize * 0.54 + 26);
          ctx.fillStyle = '#f5ebd6';
          ctx.fillText(g.subLabel, 0, orbSize * 0.54 + 26);
        }
        ctx.restore();
      }
    });
  }

  ctx.restore();
}

// 100% Asset-Driven 4-Stage Isometric Floor Traps (zhy8c6zhy8c6zhy8_5d2df495.png 2x2 Sheet)
// Top-Left (0): Dormant Stone Plate | Top-Right (1): Priming Molten Plate
// Bottom-Left (2): Erupted Bloodied Iron Spikes | Bottom-Right (3): Roaring Agni Lotus Fire Plume
export function updateAndRenderPressureTraps(
  ctx: CanvasRenderingContext2D,
  traps: ChamberTrapRuntime[],
  dt: number,
  now: number,
  player: { x: number; y: number; hp: number; invulnTimer: number; hitFlashTimer: number; elevationY: number },
  enemies: Array<{
    x: number;
    y: number;
    hp: number;
    posture: number;
    maxPosture: number;
    postureBrokenTimer: number;
    hitFlashTimer: number;
    aiState: string;
    scorchTimer: number;
  }>,
  callbacks: {
    onTrapTriggered: (x: number, y: number) => void;
    onTrapErupt: (trap: ChamberTrapRuntime, hitPlayer: boolean, enemiesHitCount: number) => void;
  }
) {
  const trapsAsset = getProcessedSpriteSync(GAME_ASSETS.floorTraps2x2);

  for (let i = 0; i < traps.length; i++) {
    const trap = traps[i];

    if (trap.state === 'idle') {
      const playerOnPlate =
        player.elevationY < 10 &&
        Math.hypot(player.x - trap.x, (player.y - trap.y) * 1.35) <= trap.radius * 0.85;
      const enemyOnPlate = enemies.some(
        (e) =>
          e.aiState !== 'ko' &&
          Math.hypot(e.x - trap.x, (e.y - trap.y) * 1.35) <= trap.radius * 0.85
      );
      if (playerOnPlate || enemyOnPlate) {
        trap.state = 'priming';
        trap.timer = 0.52;
        callbacks.onTrapTriggered(trap.x, trap.y);
      }
    } else if (trap.state === 'priming') {
      trap.timer -= dt;
      if (trap.timer <= 0) {
        trap.state = 'erupting';
        trap.timer = 0.65;

        let hitPlayer = false;
        if (
          player.invulnTimer <= 0 &&
          player.elevationY < 12 &&
          Math.hypot(player.x - trap.x, (player.y - trap.y) * 1.3) <= trap.radius * 1.15
        ) {
          player.hp = Math.max(0, player.hp - 24);
          player.hitFlashTimer = 0.12;
          hitPlayer = true;
        }

        let enemiesHitCount = 0;
        enemies.forEach((e) => {
          if (e.aiState === 'ko') return;
          if (Math.hypot(e.x - trap.x, (e.y - trap.y) * 1.3) <= trap.radius * 1.25) {
            e.hp = Math.max(0, e.hp - 145);
            e.hitFlashTimer = 0.14;
            if (trap.kind === 'agni_vent') {
              e.scorchTimer = Math.max(e.scorchTimer, 4.0);
            }
            e.posture = Math.max(0, e.posture - 160);
            if (e.posture <= 0 && e.postureBrokenTimer <= 0) {
              e.postureBrokenTimer = 4.0;
              e.aiState = 'recover';
            }
            enemiesHitCount++;
          }
        });

        callbacks.onTrapErupt(trap, hitPlayer, enemiesHitCount);
      }
    } else if (trap.state === 'erupting') {
      trap.timer -= dt;
      if (trap.timer <= 0) {
        trap.state = 'cooldown';
        trap.timer = 2.6;
      }
    } else if (trap.state === 'cooldown') {
      trap.timer -= dt;
      if (trap.timer <= 0) {
        trap.state = 'idle';
      }
    }

    // Render using the hand-painted 2x2 Isometric Floor Trap Sprite Sheet (zhy8c6zhy8c6zhy8_5d2df495.png)
    if (trapsAsset && trapsAsset.frames.length >= 4) {
      let frameIdx = 0;
      if (trap.state === 'priming') {
        frameIdx = 1; // Armed glowing molten-cracked plate
      } else if (trap.state === 'erupting') {
        frameIdx = trap.kind === 'chakram_slicer' ? 2 : 3; // 2: Erupted Iron Spikes, 3: Roaring Agni Lotus Plume
      } else {
        frameIdx = 0; // Dormant plate
      }

      const f = trapsAsset.frames[frameIdx] || trapsAsset.frames[0];
      const baseSize = trap.radius * 2.35;
      const drawW = baseSize;
      const drawH = (f.sh / Math.max(1, f.sw)) * drawW;

      ctx.save();
      ctx.translate(trap.x, trap.y);

      if (trap.state === 'priming') {
        const pulse = 0.85 + Math.sin(now * 0.035) * 0.15;
        ctx.scale(pulse, pulse);
      }

      ctx.drawImage(
        trapsAsset.cleanCanvas,
        f.sx,
        f.sy,
        f.sw,
        f.sh,
        -drawW * 0.5,
        trap.state === 'erupting' && frameIdx === 3 ? -drawH * 0.72 : -drawH * 0.55,
        drawW,
        drawH
      );
      ctx.restore();
    }
  }
}

// Foreground Drifting 2D Anime Wisteria Petals + Chamber Transition Wipe
export function renderForegroundParallaxAndWipe(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  camX: number,
  camY: number,
  wipeProgress: number
) {
  // Subtle perimeter 2D anime drifting petals & sunlit dust motes (kept near viewport edges so combat center stays 100% clear)
  const t = performance.now() * 0.001;
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const laneSide = i % 2 === 0 ? 0.06 + (i * 0.03) : 0.94 - (i * 0.025);
    const px =
      ((laneSide * cw - camX * 0.12 + t * (16 + i * 3) + Math.sin(t * 1.1 + i * 2.1) * 18) % cw + cw) %
      cw;
    const py =
      (((i * 0.17 + 0.08) * ch - camY * 0.08 + t * (14 + i * 2.5)) % ch + ch) % ch;
    const rot = t * 1.4 + i * 1.3;
    const alpha = 0.32 + 0.14 * Math.sin(t * 2.1 + i);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = i % 3 === 0 ? '#ffd6a5' : '#e9d5ff';
    ctx.strokeStyle = '#120806';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(0, -4.5);
    ctx.quadraticCurveTo(3.8, -1.0, 0, 4.5);
    ctx.quadraticCurveTo(-3.8, -1.0, 0, -4.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // Smooth Hades Diamond Iris Chamber Transition Wipe
  if (wipeProgress > 0 && wipeProgress < 1) {
    const alpha = Math.sin((1 - wipeProgress) * Math.PI);
    ctx.save();
    ctx.fillStyle = `rgba(5, 3, 4, ${(alpha * 0.85).toFixed(3)})`;
    ctx.fillRect(0, 0, cw, ch);
    ctx.restore();
  }
}

/**
 * 2D Anime / Demon Slayer (Ufotable) Procedural Arena Atmosphere:
 * Renders diagonal volumetric temple light shafts (komorebi), warm cel brazier blooms,
 * swept 2D anime wind-gust ribbons, ink-rimmed Wisteria petals, and diamond Hinokami embers.
 */
export function renderProceduralArenaAtmosphere(
  ctx: CanvasRenderingContext2D,
  worldW: number,
  worldH: number,
  chamberIndex: number,
  nowMs: number
) {
  const t = nowMs * 0.001;
  ctx.save();

  // 1. Diagonal Ufotable Volumetric Moonlight / Blood-Eclipse Shafts (Komorebi)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const beamColorTop =
    chamberIndex >= 5
      ? 'rgba(255, 138, 72, 0.18)'
      : 'rgba(168, 214, 255, 0.16)';
  const beamColorMid =
    chamberIndex >= 5
      ? 'rgba(255, 92, 42, 0.07)'
      : 'rgba(98, 156, 255, 0.055)';

  for (let s = 0; s < 4; s++) {
    const sway = Math.sin(t * 0.45 + s * 1.7) * 20;
    const xTop = worldW * (0.14 + s * 0.23) + sway;
    const topW = 54 + (s % 2) * 26;
    const xBot = xTop + worldW * 0.2;
    const botW = topW * 1.95;

    const beamGrad = ctx.createLinearGradient(xTop, 0, xBot, worldH * 0.84);
    beamGrad.addColorStop(0, beamColorTop);
    beamGrad.addColorStop(0.55, beamColorMid);
    beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(xTop, 0);
    ctx.lineTo(xTop + topW, 0);
    ctx.lineTo(xBot + botW, worldH * 0.86);
    ctx.lineTo(xBot, worldH * 0.86);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 2. Crisp Obsidian Water / Lava Reflection Shimmer
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle =
    chamberIndex >= 4
      ? 'rgba(255, 128, 56, 0.14)'
      : 'rgba(148, 206, 255, 0.14)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 6; i++) {
    const bandY = worldH * (0.26 + i * 0.11) + Math.sin(t * 1.2 + i * 1.4) * 5;
    const bandX = worldW * (i % 2 === 0 ? 0.11 : 0.83) + Math.cos(t * 0.85 + i) * 12;
    ctx.beginPath();
    ctx.ellipse(bandX, bandY, 62 + (i % 3) * 18, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Layered 2D Anime Brazier Flame Blooms on Sanctuary Courtyard
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let b = 0; b < 4; b++) {
    const bx = worldW * (b % 2 === 0 ? 0.23 : 0.77);
    const by = worldH * (b < 2 ? 0.41 : 0.72);
    const flicker =
      0.88 +
      Math.sin(t * 6.0 + b * 2.1) * 0.09 +
      Math.cos(t * 12.8 + b * 1.3) * 0.05;
    const radius = 165 * flicker;
    const poolGrad = ctx.createRadialGradient(bx, by, 6, bx, by, radius);
    poolGrad.addColorStop(0, `rgba(255, 188, 92, ${(0.22 * flicker).toFixed(3)})`);
    poolGrad.addColorStop(0.45, `rgba(255, 92, 32, ${(0.11 * flicker).toFixed(3)})`);
    poolGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = poolGrad;
    ctx.beginPath();
    ctx.arc(bx, by, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 4. Swept 2D Anime Wind-Gust Ribbons & Twilight Mist Gliding Across Courtyard
  ctx.save();
  for (let w = 0; w < 6; w++) {
    const speed = 135 + w * 28;
    const spanW = 155 + (w % 3) * 48;
    const baseProgress = ((t * speed + w * 310 + chamberIndex * 97) % (worldW + 320)) - 160;
    const wy = worldH * (0.22 + w * 0.125) + Math.sin(t * 1.8 + w * 1.5) * 14;
    const arcLift = Math.cos(t * 1.6 + w) * 14;
    const streakAlpha = 0.14 + 0.07 * Math.sin(t * 2.4 + w);

    ctx.strokeStyle =
      chamberIndex >= 5
        ? `rgba(255, 210, 175, ${streakAlpha.toFixed(3)})`
        : `rgba(205, 234, 255, ${streakAlpha.toFixed(3)})`;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseProgress, wy);
    ctx.quadraticCurveTo(
      baseProgress + spanW * 0.5,
      wy - 16 + arcLift,
      baseProgress + spanW,
      wy - 4
    );
    ctx.stroke();
  }
  ctx.restore();

  // 5. Ink-Rimmed Wisteria / Sanctuary Petals & Tapered Diamond Embers (Zero Allocations)
  ctx.save();
  for (let m = 0; m < 18; m++) {
    const seedX = (m * 173 + chamberIndex * 41) % 1000;
    const seedY = (m * 293 + chamberIndex * 67) % 1000;
    const isPetal = m % 2 === 0;
    const px =
      ((seedX * 0.001 * worldW + t * (isPetal ? 22 : 16) + Math.sin(t * 1.4 + m) * 20) %
        worldW +
        worldW) %
      worldW;
    const py =
      ((seedY * 0.001 * worldH + (isPetal ? t * 14 : -t * 26)) % worldH + worldH) % worldH;
    const alpha = 0.42 + 0.24 * Math.sin(t * 3.0 + m * 1.7);

    ctx.save();
    ctx.translate(px, py);
    ctx.globalAlpha = alpha;
    if (isPetal) {
      ctx.rotate(t * 1.7 + m * 1.1);
      ctx.fillStyle =
        chamberIndex >= 5 ? '#fed7aa' : m % 4 === 0 ? '#ffd6a5' : '#e9d5ff';
      ctx.strokeStyle = '#120806';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, -4.6);
      ctx.quadraticCurveTo(3.8, -0.8, 0, 4.6);
      ctx.quadraticCurveTo(-3.8, -0.8, 0, -4.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.rotate(Math.sin(t * 2.2 + m) * 0.35);
      ctx.fillStyle = m % 3 === 0 ? '#fff3b0' : '#fb923c';
      ctx.strokeStyle = '#120806';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(0, -4.2);
      ctx.lineTo(2.4, 0);
      ctx.lineTo(0, 4.2);
      ctx.lineTo(-2.4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();

  ctx.restore();
}

