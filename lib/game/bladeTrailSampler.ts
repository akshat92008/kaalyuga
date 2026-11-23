// ============================================================================
// PHASE 1 — PARASHU BLADE-POSE PROJECTION, CATMULL-ROM SWEPT RIBBON BUILDER
// & EXACT ACTIVE-FRAME COMBAT HIT SYNCHRONIZATION
// Pure, zero-DOM math module verified by node:test unit tests.
// ============================================================================

export type BaseElementId = 'agni' | 'varuna' | 'vayu' | 'vajra';

/**
 * Normalized 2D projection of Rudra's animated 3D Parashu blade captured directly
 * from `mixamorigRightHand -> weaponSocket` inside `Rudra3DRenderer`.
 */
export interface BakedBladePose {
  /** Normalized horizontal coordinate [0..1] of Parashu axe neck in Rudra's sprite box */
  rootU: number;
  /** Normalized vertical coordinate [0..1] (0 = top, 1 = bottom) of Parashu axe neck */
  rootV: number;
  /** Normalized horizontal coordinate [0..1] of Parashu outer crescent blade tip */
  tipU: number;
  /** Normalized vertical coordinate [0..1] of Parashu outer crescent blade tip */
  tipV: number;
  /**
   * Camera-space depth relative to Rudra's torso root:
   * `< 0` means the Parashu is sweeping BEHIND Rudra; `>= 0` means IN FRONT of Rudra.
   */
  depthZ: number;
  /** True when projected from the actual rigged 3D weaponSocket */
  valid: boolean;
}

export interface ArenaBladeSample {
  rootX: number;
  rootY: number;
  tipX: number;
  tipY: number;
  midX: number;
  midY: number;
  depthZ: number;
  angleRad: number;
  bladeLengthPx: number;
  /** Timestamp or normalized progress [0..1] when captured */
  progress: number;
  /** Age in seconds since sample capture */
  ageSec: number;
}

export interface SpriteDrawRect {
  drawX: number;
  drawY: number;
  drawW: number;
  drawH: number;
}

/**
 * Projects a cached `BakedBladePose` from Rudra's baked studio sprite rectangle into
 * exact world/arena coordinates used by `KaliyugaArena` and `WebglDemonSlayerVfxOverlay`.
 */
export function projectBakedBladePoseToArena(
  pose: BakedBladePose | null | undefined,
  rect: SpriteDrawRect,
  fallback: {
    playerX: number;
    playerY: number;
    slashAngle: number;
    progress: number;
    direction?: 1 | -1;
    reachPx?: number;
  }
): ArenaBladeSample {
  if (
    pose &&
    pose.valid &&
    Number.isFinite(pose.rootU) &&
    Number.isFinite(pose.rootV) &&
    Number.isFinite(pose.tipU) &&
    Number.isFinite(pose.tipV) &&
    rect.drawW > 1 &&
    rect.drawH > 1
  ) {
    const rootX = rect.drawX + pose.rootU * rect.drawW;
    const rootY = rect.drawY + pose.rootV * rect.drawH;
    const tipX = rect.drawX + pose.tipU * rect.drawW;
    const tipY = rect.drawY + pose.tipV * rect.drawH;
    const dx = tipX - rootX;
    const dy = tipY - rootY;
    const rawLen = Math.hypot(dx, dy);

    // Ensure non-degenerate blade length even when the Parashu points straight toward camera
    const safeLen = Math.max(18, rawLen);
    const angleRad = rawLen > 1 ? Math.atan2(dy, dx) : fallback.slashAngle;
    const finalTipX = rawLen >= 18 ? tipX : rootX + Math.cos(angleRad) * safeLen;
    const finalTipY = rawLen >= 18 ? tipY : rootY + Math.sin(angleRad) * safeLen;

    return {
      rootX,
      rootY,
      tipX: finalTipX,
      tipY: finalTipY,
      midX: (rootX + finalTipX) * 0.5,
      midY: (rootY + finalTipY) * 0.5,
      depthZ: Number.isFinite(pose.depthZ) ? pose.depthZ : 0.1,
      angleRad,
      bladeLengthPx: safeLen,
      progress: fallback.progress,
      ageSec: 0,
    };
  }

  // Deterministic weapon-arc fallback (used only while Rudra's FBX is still streaming in)
  const dir = fallback.direction ?? 1;
  const reach = fallback.reachPx ?? 64;
  const clampedP = Math.max(0, Math.min(1, fallback.progress));
  const sweepArc = Math.PI * 1.15;
  const currentAngle = fallback.slashAngle + dir * (-sweepArc * 0.52 + clampedP * sweepArc);
  const cosA = Math.cos(currentAngle);
  const sinA = Math.sin(currentAngle);
  const rootX = fallback.playerX + cosA * (reach * 0.36);
  const rootY = fallback.playerY - 34 + sinA * (reach * 0.24);
  const tipX = fallback.playerX + cosA * (reach * 1.25);
  const tipY = fallback.playerY - 34 + sinA * (reach * 0.82);
  // Sweeping above player center = behind torso (< 0), sweeping below = in front (>= 0)
  const depthZ = sinA * 0.65;

  return {
    rootX,
    rootY,
    tipX,
    tipY,
    midX: (rootX + tipX) * 0.5,
    midY: (rootY + tipY) * 0.5,
    depthZ,
    angleRad: currentAngle,
    bladeLengthPx: Math.max(20, Math.hypot(tipX - rootX, tipY - rootY)),
    progress: clampedP,
    ageSec: 0,
  };
}

/**
 * Evaluates a 1D Catmull-Rom spline segment at parameter `t in [0..1]`.
 */
export function catmullRom1D(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

export interface RibbonGeometryWriteResult {
  vertexCount: number;
  indexCount: number;
  spineCount: number;
  hasBackSegments: boolean;
  hasFrontSegments: boolean;
}

export interface SweptBladeRibbonOptions {
  /** Number of Catmull-Rom subdivisions per raw sample interval (default 4) */
  subdivisions?: number;
  /** Outward radial width boost multiplier beyond physical Parashu head length (for dramatic anime scale) */
  widthBoostPx?: number;
  /** Optional inward pull toward hilt so the ribbon hugs the blade tightly */
  rootInsetPx?: number;
  /** World-to-WebGL Z offset scale for depth separation */
  depthScale?: number;
  /** Filter mode: 'all' | 'back' (depthZ < 0) | 'front' (depthZ >= 0) */
  depthFilter?: 'all' | 'back' | 'front';
  /** Maximum spline spine samples supported by the pre-allocated target buffers */
  maxSpineSamples: number;
}

/**
 * Writes a silky, Catmull-Rom smoothed, calligraphic tapered blade-trail ribbon directly into
 * pre-allocated `Float32Array` position + UV + depth buffers (zero GC allocations per frame).
 *
 * Coordinate convention matches `WebglDemonSlayerVfxOverlay`:
 * - X is world X (+right)
 * - Y is inverted screen/world Y (`-worldY`) so Three.js orthographic +Y points up
 */
export function writeSweptBladeRibbonBuffers(
  samples: readonly ArenaBladeSample[],
  outPositions: Float32Array,
  outUvs: Float32Array,
  outDepths: Float32Array,
  outIndices: Uint16Array,
  opts: SweptBladeRibbonOptions
): RibbonGeometryWriteResult {
  if (samples.length < 2) {
    return {
      vertexCount: 0,
      indexCount: 0,
      spineCount: 0,
      hasBackSegments: false,
      hasFrontSegments: false,
    };
  }

  const subdiv = Math.max(1, Math.min(8, Math.round(opts.subdivisions ?? 4)));
  const widthBoost = opts.widthBoostPx ?? 48;
  const rootInset = opts.rootInsetPx ?? 6;
  const depthScale = opts.depthScale ?? 14;
  const maxSpine = Math.max(4, opts.maxSpineSamples);

  const segCount = samples.length - 1;
  const rawTotal = segCount * subdiv + 1;
  const totalSpine = Math.min(maxSpine, rawTotal);

  let hasBack = false;
  let hasFront = false;

  for (let i = 0; i < totalSpine; i++) {
    const globalU = totalSpine > 1 ? i / (totalSpine - 1) : 0;
    const fIdx = globalU * segCount;
    const s1 = Math.min(segCount - 1, Math.floor(fIdx));
    const localT = fIdx - s1;

    const p0 = samples[Math.max(0, s1 - 1)];
    const p1 = samples[s1];
    const p2 = samples[Math.min(samples.length - 1, s1 + 1)];
    const p3 = samples[Math.min(samples.length - 1, s1 + 2)];

    let rx = catmullRom1D(p0.rootX, p1.rootX, p2.rootX, p3.rootX, localT);
    let ry = catmullRom1D(p0.rootY, p1.rootY, p2.rootY, p3.rootY, localT);
    let tx = catmullRom1D(p0.tipX, p1.tipX, p2.tipX, p3.tipX, localT);
    let ty = catmullRom1D(p0.tipY, p1.tipY, p2.tipY, p3.tipY, localT);
    const dz = catmullRom1D(p0.depthZ, p1.depthZ, p2.depthZ, p3.depthZ, localT);

    if (dz < 0) hasBack = true;
    else hasFront = true;

    // Direction from blade root to blade tip
    let dirX = tx - rx;
    let dirY = ty - ry;
    const len = Math.hypot(dirX, dirY);
    if (len > 0.001) {
      dirX /= len;
      dirY /= len;
    } else {
      dirX = Math.cos(p1.angleRad);
      dirY = Math.sin(p1.angleRad);
    }

    // Calligraphic Demon Slayer width envelope:
    // razor-pointed tail at u=0 -> wide sweeping crescent belly at u=0.68 -> sharp leading cutting tip at u=1.0
    const tailTaper = Math.pow(Math.sin(Math.min(1, globalU * 1.15) * Math.PI * 0.5), 0.72);
    const headTaper = 1.0 - Math.pow(Math.max(0, (globalU - 0.86) / 0.14), 2.0) * 0.38;
    const widthEnv = Math.max(0.08, tailTaper * headTaper);

    // Pull inner edge slightly inward, flare outer edge outward along the real blade vector!
    rx -= dirX * rootInset * widthEnv;
    ry -= dirY * rootInset * widthEnv;
    tx += dirX * widthBoost * widthEnv;
    ty += dirY * widthBoost * widthEnv;

    const vBase = i * 2;
    const pOff = vBase * 3;
    const uvOff = vBase * 2;

    const zPos = dz * depthScale;
    // Inner edge (v = 0, anchored to Parashu neck/root)
    outPositions[pOff] = rx;
    outPositions[pOff + 1] = -ry;
    outPositions[pOff + 2] = zPos;
    // Outer cutting edge (v = 1, extended along Parashu blade tip)
    outPositions[pOff + 3] = tx;
    outPositions[pOff + 4] = -ty;
    outPositions[pOff + 5] = zPos + 2.5;

    outUvs[uvOff] = globalU;
    outUvs[uvOff + 1] = 0;
    outUvs[uvOff + 2] = globalU;
    outUvs[uvOff + 3] = 1;

    outDepths[vBase] = dz;
    outDepths[vBase + 1] = dz;
  }

  // Emit triangles, optionally filtering by Back (< 0) or Front (>= 0) depth pass
  const filter = opts.depthFilter ?? 'all';
  let idxCursor = 0;
  for (let i = 0; i < totalSpine - 1; i++) {
    const b = i * 2;
    if (filter !== 'all') {
      const segDepth = (outDepths[b] + outDepths[b + 2]) * 0.5;
      if (filter === 'back' && segDepth >= 0.04) continue;
      if (filter === 'front' && segDepth < -0.04) continue;
    }
    outIndices[idxCursor++] = b;
    outIndices[idxCursor++] = b + 1;
    outIndices[idxCursor++] = b + 2;
    outIndices[idxCursor++] = b + 1;
    outIndices[idxCursor++] = b + 3;
    outIndices[idxCursor++] = b + 2;
  }

  return {
    vertexCount: totalSpine * 2,
    indexCount: idxCursor,
    spineCount: totalSpine,
    hasBackSegments: hasBack,
    hasFrontSegments: hasFront,
  };
}

// ============================================================================
// EXACT ACTIVE-FRAME COMBAT HIT SYNCHRONIZATION STATE MACHINE
// Eliminates Frame-0 Hit Desync in KaliyugaArena.tsx
// ============================================================================

export type StrikeTier = 'light' | 'combo4_finisher' | 'heavy' | 'varuna_burst';

export interface ActiveStrikeSyncState {
  attackSerial: number;
  tier: StrikeTier;
  element: BaseElementId;
  stance: 'smash' | 'pillar' | 'thrust';
  comboStep: number;
  slashAngle: number;
  activeStart: number;
  activeEnd: number;
  /** True once the primary cleave VFX has fired on entering active window */
  vfxStarted: boolean;
  /** True once at least one enemy hit or active sweep has been evaluated */
  impactAudioFired: boolean;
  /** Enemies already struck by this exact attackSerial (strict single-hit deduplication) */
  hitEnemyIds: Set<number>;
  /** Set true immediately on dodge, stagger, parry, or death */
  cancelled: boolean;
  /** True once progress passes activeEnd or strike is cancelled */
  completed: boolean;
}

export function createActiveStrikeState(params: {
  attackSerial: number;
  tier: StrikeTier;
  element: BaseElementId;
  stance: 'smash' | 'pillar' | 'thrust';
  comboStep: number;
  slashAngle: number;
  activeStart?: number;
  activeEnd?: number;
}): ActiveStrikeSyncState {
  const defaultStart =
    params.tier === 'heavy'
      ? 0.26
      : params.tier === 'combo4_finisher'
        ? 0.26
        : params.tier === 'varuna_burst'
          ? 0.18
          : 0.22;
  const defaultEnd =
    params.tier === 'heavy'
      ? 0.72
      : params.tier === 'combo4_finisher'
        ? 0.72
        : 0.68;

  return {
    attackSerial: params.attackSerial,
    tier: params.tier,
    element: params.element,
    stance: params.stance,
    comboStep: params.comboStep,
    slashAngle: params.slashAngle,
    activeStart: params.activeStart ?? defaultStart,
    activeEnd: params.activeEnd ?? defaultEnd,
    vfxStarted: false,
    impactAudioFired: false,
    hitEnemyIds: new Set<number>(),
    cancelled: false,
    completed: false,
  };
}

export interface StrikeWindowStepResult {
  phase: 'startup' | 'active' | 'recovery' | 'cancelled';
  shouldStartPrimaryVfx: boolean;
  shouldSampleBladeTrail: boolean;
  shouldEvaluateHits: boolean;
  shouldFinalizeTrail: boolean;
}

/**
 * Evaluates an `ActiveStrikeSyncState` at the current normalized `attackProgress [0..1]`.
 * Strictly enforces:
 * - No hits or blade-trail emission during startup windup (`progress < activeStart`)
 * - Trail sampling + hit resolution strictly inside `[activeStart, activeEnd]`
 * - Instant clean termination on cancellation or recovery entry
 */
export function stepActiveStrikeWindow(
  strike: ActiveStrikeSyncState,
  attackProgress: number
): StrikeWindowStepResult {
  if (strike.cancelled) {
    strike.completed = true;
    return {
      phase: 'cancelled',
      shouldStartPrimaryVfx: false,
      shouldSampleBladeTrail: false,
      shouldEvaluateHits: false,
      shouldFinalizeTrail: true,
    };
  }

  const prog = Number.isFinite(attackProgress) ? Math.max(0, Math.min(1, attackProgress)) : 0;

  if (prog < strike.activeStart) {
    return {
      phase: 'startup',
      shouldStartPrimaryVfx: false,
      shouldSampleBladeTrail: false,
      shouldEvaluateHits: false,
      shouldFinalizeTrail: false,
    };
  }

  if (prog <= strike.activeEnd) {
    const shouldStartPrimaryVfx = !strike.vfxStarted;
    if (shouldStartPrimaryVfx) {
      strike.vfxStarted = true;
    }
    return {
      phase: 'active',
      shouldStartPrimaryVfx,
      shouldSampleBladeTrail: true,
      shouldEvaluateHits: true,
      shouldFinalizeTrail: false,
    };
  }

  const shouldFinalizeTrail = !strike.completed;
  strike.completed = true;
  return {
    phase: 'recovery',
    shouldStartPrimaryVfx: false,
    shouldSampleBladeTrail: false,
    shouldEvaluateHits: false,
    shouldFinalizeTrail,
  };
}

/**
 * Claims an enemy ID for this attackSerial; returns `true` only on the first contact
 * so multi-frame active windows never double-hit the same target.
 */
export function claimEnemyHitForStrike(
  strike: ActiveStrikeSyncState,
  enemyId: number
): boolean {
  if (strike.cancelled || strike.completed) return false;
  if (strike.hitEnemyIds.has(enemyId)) return false;
  strike.hitEnemyIds.add(enemyId);
  return true;
}

/**
 * Immediately aborts an active strike on dodge, stagger, parry, or death.
 */
export function cancelActiveStrike(strike: ActiveStrikeSyncState | null): void {
  if (!strike) return;
  strike.cancelled = true;
  strike.completed = true;
}
