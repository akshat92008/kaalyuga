// ============================================================================
// KALIYUGA: PHASE 2 — UNIFIED ADDITIVE FLIPBOOK & ISOMETRIC TELEGRAPH RENDERER
// - Draws grid cells (cols x rows) using globalCompositeOperation = 'lighter'
//   so pure #000000 black is 100% transparent with zero rectangular boxes.
// - Applies an automatic 4% bottom-right cell corner mask during sheet slicing
//   so Gemini corner sparkles never render in-game.
// - Ties frame progression directly to modernCombat.ts Startup / Active / Recovery
//   timestamps so Parashu slashes and finishers never desync from hitboxes.
// ============================================================================

import { GAME_ASSETS } from './assets';
import {
  ActionFramePhase,
  CombatActionKind,
  computeActionFramePhase,
} from './modernCombat';
import type { ParashuFinisherVariant } from './combatPipeline';
import type { StaffStance } from './rules';

export const CORNER_WATERMARK_MASK_RATIO = 0.04; // 4% bottom-right cell corner mask

export interface FlipbookCornerMaskRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FlipbookGridCellBounds {
  col: number;
  row: number;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  cornerMask: FlipbookCornerMaskRect;
}

export interface FlipbookSheetSpec {
  id:
    | 'parashuSlashes3x3'
    | 'parryAndHitSparks4x2'
    | 'isometricTelegraphs2x2'
    | 'dundubhiShockwaveAndShatter4x2'
    | 'vrikodaraVacuumAndSlag4x2'
    | 'kurukshetraPillarStates3x1'
    | 'lohitShardAndBoonOrbs2x2';
  url: string;
  cols: number;
  rows: number;
}

export const PHASE2_VFX_SHEETS: Record<FlipbookSheetSpec['id'], FlipbookSheetSpec> = {
  parashuSlashes3x3: {
    id: 'parashuSlashes3x3',
    url: GAME_ASSETS.vfxFlipbooks.parashuSlashes3x3,
    cols: 3,
    rows: 3,
  },
  parryAndHitSparks4x2: {
    id: 'parryAndHitSparks4x2',
    url: GAME_ASSETS.vfxFlipbooks.parryAndHitSparks4x2,
    cols: 4,
    rows: 2,
  },
  isometricTelegraphs2x2: {
    id: 'isometricTelegraphs2x2',
    url: GAME_ASSETS.vfxFlipbooks.isometricTelegraphs2x2,
    cols: 2,
    rows: 2,
  },
  dundubhiShockwaveAndShatter4x2: {
    id: 'dundubhiShockwaveAndShatter4x2',
    url: GAME_ASSETS.vfxFlipbooks.dundubhiShockwaveAndShatter4x2,
    cols: 4,
    rows: 2,
  },
  vrikodaraVacuumAndSlag4x2: {
    id: 'vrikodaraVacuumAndSlag4x2',
    url: GAME_ASSETS.vfxFlipbooks.vrikodaraVacuumAndSlag4x2,
    cols: 4,
    rows: 2,
  },
  kurukshetraPillarStates3x1: {
    id: 'kurukshetraPillarStates3x1',
    url: GAME_ASSETS.vfxFlipbooks.kurukshetraPillarStates3x1,
    cols: 3,
    rows: 1,
  },
  lohitShardAndBoonOrbs2x2: {
    id: 'lohitShardAndBoonOrbs2x2',
    url: GAME_ASSETS.vfxFlipbooks.lohitShardAndBoonOrbs2x2,
    cols: 2,
    rows: 2,
  },
};

// Semantic row & cell constants for Phase 2 sheets
export const PARASHU_FLIPBOOK_ROWS = {
  LIGHT_CRESCENT_SWEEP: 0, // Row 1 (0-indexed): Light Crescent Sweeps (3 frames)
  LIGHT_CRESCENT_SWEEPS: 0,
  DOWNWARD_CRUSH_FISSURE: 1, // Row 2 (0-indexed): downward_crush Overhead Fissure (3 frames)
  SPIN_360_WHIRLWIND: 2, // Row 3 (0-indexed): spin_360_cleave Whirlwind Ring (3 frames)
  SPIN_360_WHIRLWIND_RING: 2,
} as const;

export const PARRY_SPARKS_FLIPBOOK_ROWS = {
  VEDIC_PARRY_FLASH: 0, // Row 1 (0-indexed): Gold-white Vedic parry flash burst on deflect
  DIRECTIONAL_HIT_SPLATTER: 1, // Row 2 (0-indexed): Directional crimson/Prana hit-splatter
} as const;

export const ISOMETRIC_TELEGRAPH_CELLS = {
  BOSS_CIRCULAR_SLAM_MANDALA: { col: 0, row: 0 }, // Top-Left
  CIRCULAR_SLAM_MANDALA: { col: 0, row: 0 },
  DIRECTIONAL_CHEVRON_RUNWAY: { col: 1, row: 0 }, // Top-Right
  ORACLE_CURSE_LOTUS_SIGIL: { col: 0, row: 1 }, // Bottom-Left
  CLEAVE_BREATH_CONE_WARNING: { col: 1, row: 1 }, // Bottom-Right
  CLEAVE_BREATH_CONE: { col: 1, row: 1 },
} as const;

export const DUNDUBHI_FLIPBOOK_ROWS = {
  SONIC_BRONZE_RINGS: 0, // Row 1: Concentric bronze sonic rings
  PILLAR_SANDSTONE_SHATTER: 1, // Row 2: Sandstone shard explosion on pillar crash
} as const;

export const VRIKODARA_FLIPBOOK_ROWS = {
  FURNACE_GRAVITATIONAL_VORTEX: 0, // Row 1: Gravitational vortex on Vrikodara's furnace chest
  MOLTEN_SLAG_GEYSERS: 1, // Row 2: Erupting molten slag geysers
} as const;

export interface FlipbookGridCellBoundsWithAliases extends FlipbookGridCellBounds {
  watermarkMaskX: number;
  watermarkMaskY: number;
  watermarkMaskW: number;
  watermarkMaskH: number;
}

/**
 * Computes the exact pixel slice bounds for a cell `(col, row)` in a `cols x rows` flipbook sheet,
 * along with the automatic 4% bottom-right corner mask rectangle to strip Gemini corner sparkles.
 */
export function computeFlipbookGridCell(
  sheetWidth: number,
  sheetHeight: number,
  cols: number,
  rows: number,
  col: number,
  row: number,
  cornerMaskRatio: number = CORNER_WATERMARK_MASK_RATIO
): FlipbookGridCellBoundsWithAliases {
  const safeCols = Math.max(1, Math.floor(cols));
  const safeRows = Math.max(1, Math.floor(rows));
  const clampedCol = Math.max(0, Math.min(safeCols - 1, Math.floor(col)));
  const clampedRow = Math.max(0, Math.min(safeRows - 1, Math.floor(row)));

  const rawCellW = sheetWidth / safeCols;
  const rawCellH = sheetHeight / safeRows;

  // Apply a 1.5% inner cell padding so adjacent cells never bleed across grid seams when rotated
  const padX = Math.floor(rawCellW * 0.015);
  const padY = Math.floor(rawCellH * 0.015);

  const sx = Math.round(clampedCol * rawCellW) + padX;
  const sy = Math.round(clampedRow * rawCellH) + padY;
  const sw = Math.max(1, Math.round(rawCellW) - padX * 2);
  const sh = Math.max(1, Math.round(rawCellH) - padY * 2);

  const ratio = Math.max(0.01, Math.min(0.25, cornerMaskRatio));
  const maskW = Math.max(1, Math.ceil(sw * ratio));
  const maskH = Math.max(1, Math.ceil(sh * ratio));
  const maskX = sx + sw - maskW;
  const maskY = sy + sh - maskH;

  return {
    col: clampedCol,
    row: clampedRow,
    sx,
    sy,
    sw,
    sh,
    cornerMask: {
      x: maskX,
      y: maskY,
      w: maskW,
      h: maskH,
    },
    watermarkMaskX: maskX,
    watermarkMaskY: maskY,
    watermarkMaskW: maskW,
    watermarkMaskH: maskH,
  };
}

export interface CombatSyncedFlipbookFrame {
  visible: boolean;
  phase: ActionFramePhase;
  frameIndex: number;
  frameCol: number;
  normalizedProgress: number;
  phaseProgress: number;
  alpha: number;
}

/**
 * Ties flipbook frame progression directly to `modernCombat.ts` Startup / Active / Recovery
 * timestamps so weapon slashes and finishers never desync from active hitboxes.
 */
export function computeCombatSyncedFlipbookFrame(
  actionOrParams:
    | CombatActionKind
    | {
        action: CombatActionKind;
        actionTimerSec: number;
        actionDurationSec: number;
        cols?: number;
      },
  remainingSecArg?: number,
  totalDurationSecArg?: number,
  numFramesArg: number = 3
): CombatSyncedFlipbookFrame {
  const action: CombatActionKind =
    typeof actionOrParams === 'object' ? actionOrParams.action : actionOrParams;
  const remainingSec =
    typeof actionOrParams === 'object'
      ? actionOrParams.actionTimerSec
      : (remainingSecArg ?? 0);
  const totalDurationSec =
    typeof actionOrParams === 'object'
      ? actionOrParams.actionDurationSec
      : (totalDurationSecArg ?? 0);
  const numFrames =
    typeof actionOrParams === 'object' ? (actionOrParams.cols ?? 3) : numFramesArg;

  const safeFrames = Math.max(1, Math.floor(numFrames));
  const info = computeActionFramePhase(action, remainingSec, totalDurationSec);

  if (info.phase === 'idle' || totalDurationSec <= 0 || remainingSec <= 0) {
    return {
      visible: false,
      phase: 'idle',
      frameIndex: 0,
      frameCol: 0,
      normalizedProgress: 1,
      phaseProgress: 1,
      alpha: 0,
    };
  }

  let startupEndRatio = 0.22;
  let activeEndRatio = 0.68;
  if (action === 'heavy_unleash' || action === 'execute') {
    startupEndRatio = 0.26;
    activeEndRatio = 0.70;
  } else if (action === 'parry') {
    startupEndRatio = 0.08;
    activeEndRatio = 0.58;
  } else if (action === 'astra') {
    startupEndRatio = 0.20;
    activeEndRatio = 0.65;
  }

  const prog = info.normalizedProgress;

  if (info.phase === 'startup') {
    const phaseProg = Math.max(0, Math.min(1, prog / Math.max(0.01, startupEndRatio)));
    return {
      visible: phaseProg >= 0.15,
      phase: 'startup',
      frameIndex: 0,
      frameCol: 0,
      normalizedProgress: prog,
      phaseProgress: Number(phaseProg.toFixed(4)),
      alpha: Number((0.45 + phaseProg * 0.45).toFixed(4)),
    };
  }

  if (info.phase === 'active') {
    const activeSpan = Math.max(0.01, activeEndRatio - startupEndRatio);
    const phaseProg = Math.max(0, Math.min(0.9999, (prog - startupEndRatio) / activeSpan));
    const frameIndex =
      safeFrames >= 3
        ? Math.min(safeFrames - 2, 1 + Math.floor(phaseProg * Math.max(1, safeFrames - 2)))
        : Math.min(safeFrames - 1, Math.floor(phaseProg * safeFrames));
    return {
      visible: true,
      phase: 'active',
      frameIndex,
      frameCol: frameIndex,
      normalizedProgress: prog,
      phaseProgress: Number(phaseProg.toFixed(4)),
      alpha: 1.0,
    };
  }

  // 'recovery'
  const recSpan = Math.max(0.01, 1 - activeEndRatio);
  const phaseProg = Math.max(0, Math.min(1, (prog - activeEndRatio) / recSpan));
  const alpha = Math.max(0, (1 - phaseProg) * 0.78);
  const lastCol = safeFrames - 1;
  return {
    visible: alpha > 0.04,
    phase: 'recovery',
    frameIndex: lastCol,
    frameCol: lastCol,
    normalizedProgress: prog,
    phaseProgress: Number(phaseProg.toFixed(4)),
    alpha: Number(alpha.toFixed(4)),
  };
}

export interface ParashuSlashFlipbookRenderPlan {
  visible: boolean;
  sheetSpec: FlipbookSheetSpec;
  sheetUrl: string;
  cols: number;
  rows: number;
  primaryRow: number;
  secondaryRow: number | null;
  frameIndex: number;
  frameSync: CombatSyncedFlipbookFrame;
  phase: ActionFramePhase;
  alpha: number;
  rotationRad: number;
  scaleMultiplier: number;
  scaleX: number;
  scaleY: number;
  offsetForwardPx: number;
  drawSizePx: number;
}

/**
 * Resolves Rudra's Parashu slash or finisher action into the exact 3x3 (`sqvx4f...png`)
 * flipbook row, frame index, and transform:
 * - Row 0: Light Crescent Sweeps
 * - Row 1: `downward_crush` Overhead Fissure
 * - Row 2: `spin_360_cleave` Whirlwind Ring
 * - `impaling_lunge`: Rotated Row 0 + Row 1 streak oriented along `slashAngle`
 */
export function resolveParashuSlashFlipbookPlan(params: {
  action: CombatActionKind;
  comboStep: number;
  finisherVariant?: ParashuFinisherVariant | null;
  stance?: StaffStance;
  slashAngle?: number;
  slashAngleRad?: number;
  remainingSec?: number;
  actionTimerSec?: number;
  totalDurationSec?: number;
  actionDurationSec?: number;
}): ParashuSlashFlipbookRenderPlan | null {
  if (
    params.action !== 'light_attack' &&
    params.action !== 'heavy_unleash' &&
    params.action !== 'execute'
  ) {
    return null;
  }

  const remainingSec = params.actionTimerSec ?? params.remainingSec ?? 0;
  const totalDurationSec = params.actionDurationSec ?? params.totalDurationSec ?? 0;
  const slashAngle = params.slashAngleRad ?? params.slashAngle ?? 0;
  const stance = params.stance ?? 'smash';

  const effectiveAction: CombatActionKind =
    params.action === 'execute' ? 'heavy_unleash' : params.action;
  const frameSync = computeCombatSyncedFlipbookFrame(
    effectiveAction,
    remainingSec,
    totalDurationSec,
    3
  );

  if (!frameSync.visible || frameSync.phase === 'idle') {
    return null;
  }

  const isHeavyOrExecute =
    params.action === 'heavy_unleash' || params.action === 'execute';
  const variant = params.finisherVariant ?? null;

  // 1. Spin 360 Cleave Finisher OR Pillar Heavy OR Combo Step 3 Whirlwind
  if (
    variant === 'spin_360_cleave' ||
    (isHeavyOrExecute && stance === 'pillar' && !variant) ||
    (!isHeavyOrExecute && params.comboStep === 3 && !variant)
  ) {
    return {
      visible: frameSync.visible,
      sheetSpec: PHASE2_VFX_SHEETS.parashuSlashes3x3,
      sheetUrl: PHASE2_VFX_SHEETS.parashuSlashes3x3.url,
      cols: 3,
      rows: 3,
      primaryRow: PARASHU_FLIPBOOK_ROWS.SPIN_360_WHIRLWIND,
      secondaryRow: null,
      frameIndex: frameSync.frameIndex,
      frameSync,
      phase: frameSync.phase,
      alpha: frameSync.alpha,
      rotationRad: slashAngle + frameSync.normalizedProgress * Math.PI * 1.35,
      scaleMultiplier: 1.24,
      scaleX: 1.08,
      scaleY: 0.68, // Isometric ground foreshortening for 360° whirlwind ring
      offsetForwardPx: 14,
      drawSizePx: isHeavyOrExecute || variant ? 186 : 148,
    };
  }

  // 2. Impaling Lunge Finisher OR Thrust Heavy (Rotated Row 0/1 Streak)
  if (
    variant === 'impaling_lunge' ||
    (isHeavyOrExecute && stance === 'thrust' && !variant)
  ) {
    return {
      visible: frameSync.visible,
      sheetSpec: PHASE2_VFX_SHEETS.parashuSlashes3x3,
      sheetUrl: PHASE2_VFX_SHEETS.parashuSlashes3x3.url,
      cols: 3,
      rows: 3,
      primaryRow: PARASHU_FLIPBOOK_ROWS.DOWNWARD_CRUSH_FISSURE,
      secondaryRow: PARASHU_FLIPBOOK_ROWS.LIGHT_CRESCENT_SWEEP,
      frameIndex: frameSync.frameIndex,
      frameSync,
      phase: frameSync.phase,
      alpha: frameSync.alpha,
      rotationRad: slashAngle,
      scaleMultiplier: 1.22,
      scaleX: 1.42, // Elongated armor-piercing lunge streak
      scaleY: 0.56,
      offsetForwardPx: 54,
      drawSizePx: 176,
    };
  }

  // 3. Downward Crush Finisher OR Smash Heavy Overhead Fissure
  if (
    variant === 'downward_crush' ||
    isHeavyOrExecute ||
    params.comboStep === 4
  ) {
    return {
      visible: frameSync.visible,
      sheetSpec: PHASE2_VFX_SHEETS.parashuSlashes3x3,
      sheetUrl: PHASE2_VFX_SHEETS.parashuSlashes3x3.url,
      cols: 3,
      rows: 3,
      primaryRow: PARASHU_FLIPBOOK_ROWS.DOWNWARD_CRUSH_FISSURE,
      secondaryRow: null,
      frameIndex: frameSync.frameIndex,
      frameSync,
      phase: frameSync.phase,
      alpha: frameSync.alpha,
      rotationRad: slashAngle,
      scaleMultiplier: 1.28,
      scaleX: 1.16,
      scaleY: 0.78,
      offsetForwardPx: 42,
      drawSizePx: 172,
    };
  }

  // 4. Standard Light Crescent Sweeps (Row 0, comboStep 1 & 2)
  const reverseFlip = params.comboStep === 2 ? -1 : 1;
  return {
    visible: frameSync.visible,
    sheetSpec: PHASE2_VFX_SHEETS.parashuSlashes3x3,
    sheetUrl: PHASE2_VFX_SHEETS.parashuSlashes3x3.url,
    cols: 3,
    rows: 3,
    primaryRow: PARASHU_FLIPBOOK_ROWS.LIGHT_CRESCENT_SWEEP,
    secondaryRow: null,
    frameIndex: frameSync.frameIndex,
    frameSync,
    phase: frameSync.phase,
    alpha: frameSync.alpha,
    rotationRad: slashAngle,
    scaleMultiplier: 1.0,
    scaleX: 1.0,
    scaleY: 0.76 * reverseFlip,
    offsetForwardPx: 30,
    drawSizePx: 136,
  };
}

// ============================================================================
// OFFSCREEN SHEET CACHE WITH AUTOMATIC 4% CORNER MASK & #000000 BLACK KEYING
// ============================================================================

interface CachedFlipbookSheet {
  url: string;
  cols: number;
  rows: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  ready: boolean;
}

const flipbookSheetCache = new Map<string, CachedFlipbookSheet>();

/**
 * Slices and processes a loaded flipbook image onto an offscreen canvas:
 * 1. Masks the bottom-right 4% corner of every cell (plus 6% of the full sheet's bottom-right corner)
 *    so Gemini corner sparkles never appear in-game.
 * 2. Clamps near-black compression noise (< 22 luminance) to pure `#000000` (`rgba(0,0,0,0)`)
 *    so `globalCompositeOperation = 'lighter'` renders 100% transparent backgrounds with zero box edges.
 */
function buildMaskedAdditiveCanvas(
  img: HTMLImageElement,
  cols: number,
  rows: number
): HTMLCanvasElement {
  const w = Math.max(1, img.naturalWidth || img.width);
  const h = Math.max(1, img.naturalHeight || img.height);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(img, 0, 0, w, h);

  // 1. Clear the 4% bottom-right corner of every cell in the grid
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = computeFlipbookGridCell(w, h, cols, rows, c, r, CORNER_WATERMARK_MASK_RATIO);
      ctx.clearRect(
        cell.cornerMask.x,
        cell.cornerMask.y,
        cell.cornerMask.w,
        cell.cornerMask.h
      );
    }
  }

  // Also clear a 6.5% bottom-right watermark zone on the overall sheet
  const sheetMaskW = Math.ceil(w * 0.065);
  const sheetMaskH = Math.ceil(h * 0.065);
  ctx.clearRect(w - sheetMaskW, h - sheetMaskH, sheetMaskW, sheetMaskH);

  // 2. Auto-detect whether this sheet has a baked neutral-grey checkerboard (JPG VFX sheets) vs #000000 black background
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const cellW = w / Math.max(1, cols);
    const cellH = h / Math.max(1, rows);

    let brightNeutralCornerCount = 0;
    const sampleMaxX = Math.min(w, 32);
    const sampleMaxY = Math.min(h, 32);
    for (let sy = 0; sy < sampleMaxY; sy += 2) {
      for (let sx = 0; sx < sampleMaxX; sx += 2) {
        const sIdx = (sy * w + sx) * 4;
        const sr = data[sIdx];
        const sg = data[sIdx + 1];
        const sb = data[sIdx + 2];
        const sMax = Math.max(sr, sg, sb);
        const sMin = Math.min(sr, sg, sb);
        if (sMax > 28 && sMax <= 226 && sMax - sMin <= 22) {
          brightNeutralCornerCount++;
        }
      }
    }
    const hasBakedCheckerboard = brightNeutralCornerCount >= 16;

    if (hasBakedCheckerboard) {
      // Border-seeded BFS floodfill per sheet border + cell grid seams to strip neutral grey checkerboards cleanly
      const totalPx = w * h;
      const visited = new Uint8Array(totalPx);
      const queue = new Int32Array(totalPx);
      let head = 0;
      let tail = 0;

      const isBgNeutral = (idx4: number): boolean => {
        if (data[idx4 + 3] === 0) return true;
        const r = data[idx4];
        const g = data[idx4 + 1];
        const b = data[idx4 + 2];
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        return maxC <= 226 && maxC - minC <= 24;
      };

      const trySeed = (px: number, py: number) => {
        if (px < 0 || px >= w || py < 0 || py >= h) return;
        const p = py * w + px;
        if (visited[p]) return;
        if (isBgNeutral(p * 4)) {
          visited[p] = 1;
          queue[tail++] = p;
        }
      };

      for (let x = 0; x < w; x++) {
        trySeed(x, 0);
        trySeed(x, h - 1);
      }
      for (let y = 0; y < h; y++) {
        trySeed(0, y);
        trySeed(w - 1, y);
      }
      for (let c = 1; c < cols; c++) {
        const sx = Math.round(c * cellW);
        for (let y = 0; y < h; y++) trySeed(sx, y);
      }
      for (let r = 1; r < rows; r++) {
        const sy = Math.round(r * cellH);
        for (let x = 0; x < w; x++) trySeed(x, sy);
      }

      while (head < tail) {
        const curr = queue[head++];
        const cx = curr % w;
        const cy = (curr - cx) / w;
        const idx4 = curr * 4;
        data[idx4] = 0;
        data[idx4 + 1] = 0;
        data[idx4 + 2] = 0;
        data[idx4 + 3] = 0;

        if (cx > 0) trySeed(cx - 1, cy);
        if (cx + 1 < w) trySeed(cx + 1, cy);
        if (cy > 0) trySeed(cx, cy - 1);
        if (cy + 1 < h) trySeed(cx, cy + 1);
      }

      // Clear enclosed checkerboard pockets (e.g. inside closed shockwave rings) without touching dark rock outlines (<34) or colored VFX
      for (let p = 0; p < totalPx; p++) {
        if (visited[p]) continue;
        const idx4 = p * 4;
        const r = data[idx4];
        const g = data[idx4 + 1];
        const b = data[idx4 + 2];
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        if (maxC >= 34 && maxC <= 224 && maxC - minC <= 16) {
          data[idx4] = 0;
          data[idx4 + 1] = 0;
          data[idx4 + 2] = 0;
          data[idx4 + 3] = 0;
          visited[p] = 1;
        }
      }

      // Soften 1-2px neutral edge halo next to cleared checkerboard pixels
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const p = y * w + x;
          if (visited[p]) continue;
          const idx4 = p * 4;
          const r = data[idx4];
          const g = data[idx4 + 1];
          const b = data[idx4 + 2];
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          if (maxC - minC <= 26 && maxC <= 130) {
            if (
              visited[p - 1] ||
              visited[p + 1] ||
              visited[p - w] ||
              visited[p + w]
            ) {
              data[idx4] = Math.round(r * 0.25);
              data[idx4 + 1] = Math.round(g * 0.25);
              data[idx4 + 2] = Math.round(b * 0.25);
              data[idx4 + 3] = Math.round(data[idx4 + 3] * 0.35);
            }
          }
        }
      }
    } else {
      // Clean near-black background pixels so additive/screen blending has zero grey box halo
      for (let y = 0; y < h; y++) {
        const localY = (y % cellH) / cellH;
        const edgeFadeY =
          localY < 0.03 ? localY / 0.03 : localY > 0.97 ? (1 - localY) / 0.03 : 1;
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const maxCh = Math.max(r, g, b);

          if (maxCh <= 24) {
            data[idx] = 0;
            data[idx + 1] = 0;
            data[idx + 2] = 0;
            data[idx + 3] = 0;
            continue;
          }

          const localX = (x % cellW) / cellW;
          const edgeFadeX =
            localX < 0.03 ? localX / 0.03 : localX > 0.97 ? (1 - localX) / 0.03 : 1;
          const borderAtten = Math.min(edgeFadeX, edgeFadeY);

          const knee = maxCh < 56 ? (maxCh - 24) / 32 : 1;
          const factor = knee * borderAtten;
          if (factor < 0.999) {
            data[idx] = Math.round(r * factor);
            data[idx + 1] = Math.round(g * factor);
            data[idx + 2] = Math.round(b * factor);
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Ignore CORS/security exceptions in non-browser test environments
  }

  return canvas;
}

export function getOrLoadFlipbookSheet(
  url: string,
  cols: number,
  rows: number
): CachedFlipbookSheet | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  const key = `${url}::${cols}x${rows}`;
  const existing = flipbookSheetCache.get(key);
  if (existing) {
    return existing.ready ? existing : null;
  }

  const placeholderCanvas = document.createElement('canvas');
  placeholderCanvas.width = 1;
  placeholderCanvas.height = 1;
  const entry: CachedFlipbookSheet = {
    url,
    cols,
    rows,
    canvas: placeholderCanvas,
    width: 1,
    height: 1,
    ready: false,
  };
  flipbookSheetCache.set(key, entry);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const processed = buildMaskedAdditiveCanvas(img, cols, rows);
    entry.canvas = processed;
    entry.width = processed.width;
    entry.height = processed.height;
    entry.ready = true;
  };
  img.src = url;
  return null;
}

function resolveRenderableFlipbookSource(
  url: string,
  cols: number,
  rows: number,
  col: number,
  row: number
): { url: string; cols: number; rows: number; col: number; row: number } {
  // kogf7y is a grey-background Minotaur Warrior concept sheet mis-assigned to dundubhiShockwaveAndShatter4x2;
  // route its two semantic rows cleanly to the real 4x2 Expanding Shockwave & Flying Stone Fragments sheets.
  if (url === GAME_ASSETS.vfxFlipbooks.dundubhiShockwaveAndShatter4x2) {
    if (row === DUNDUBHI_FLIPBOOK_ROWS.PILLAR_SANDSTONE_SHATTER) {
      return {
        url: GAME_ASSETS.vfxFlipbooks.stoneFragments4x2,
        cols: 4,
        rows: 2,
        col: Math.max(0, Math.min(3, col)),
        row: 0,
      };
    }
    return {
      url: GAME_ASSETS.vfxFlipbooks.expandingShockwave,
      cols: 4,
      rows: 2,
      col: Math.max(0, Math.min(3, col)),
      row: 0,
    };
  }
  return { url, cols, rows, col, row };
}

/**
 * Preloads all Phase 2 hand-painted VFX & telegraph flipbook sheets into the cache
 * (routing dundubhiShockwaveAndShatter4x2 to the real shockwave & stone-fragment 4x2 sheets).
 */
export function preloadPhase2VfxSheets(): void {
  if (typeof window === 'undefined') return;
  Object.values(PHASE2_VFX_SHEETS).forEach((spec) => {
    if (spec.id === 'dundubhiShockwaveAndShatter4x2') {
      getOrLoadFlipbookSheet(GAME_ASSETS.vfxFlipbooks.expandingShockwave, 4, 2);
      getOrLoadFlipbookSheet(GAME_ASSETS.vfxFlipbooks.stoneFragments4x2, 4, 2);
      return;
    }
    getOrLoadFlipbookSheet(spec.url, spec.cols, spec.rows);
  });
}

export interface DrawAdditiveFlipbookCellParams {
  sheetSpec?: FlipbookSheetSpec;
  sheetUrl?: string;
  cols?: number;
  rows?: number;
  col: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height?: number;
  rotationRad?: number;
  scaleX?: number;
  scaleY?: number;
  alpha?: number;
  anchorX?: number; // [0..1], default 0.5 (center)
  anchorY?: number; // [0..1], default 0.5 (center)
}

/**
 * Draws a single cell `(col, row)` from a `#000000` black-background flipbook sheet using
 * controlled `'screen'` blending + a soft dark-ink radial under-shadow (`'source-over'` at low alpha)
 * so `#000000` remains 100% transparent while Parashu arcs and Agneyastra craters stay rich
 * crimson-vermilion (#ff4d24) and burnt saffron-gold (#ffb833) instead of blowing out to #FFFFFF.
 */
export function drawAdditiveFlipbookCell(
  ctx: CanvasRenderingContext2D,
  params: DrawAdditiveFlipbookCellParams
): boolean {
  const alpha = params.alpha ?? 0.78;
  if (alpha <= 0.01) return false;

  const rawUrl = params.sheetSpec ? params.sheetSpec.url : (params.sheetUrl ?? '');
  const rawCols = params.sheetSpec ? params.sheetSpec.cols : (params.cols ?? 1);
  const rawRows = params.sheetSpec ? params.sheetSpec.rows : (params.rows ?? 1);
  if (!rawUrl) return false;

  const resolved = resolveRenderableFlipbookSource(
    rawUrl,
    rawCols,
    rawRows,
    params.col,
    params.row
  );

  const sheet = getOrLoadFlipbookSheet(resolved.url, resolved.cols, resolved.rows);
  if (!sheet || !sheet.ready) return false;

  const cell = computeFlipbookGridCell(
    sheet.width,
    sheet.height,
    resolved.cols,
    resolved.rows,
    resolved.col,
    resolved.row,
    CORNER_WATERMARK_MASK_RATIO
  );

  const drawW = Math.max(4, params.width);
  const drawH = Math.max(4, params.height ?? (cell.sh / Math.max(1, cell.sw)) * drawW);
  const ax = params.anchorX ?? 0.5;
  const ay = params.anchorY ?? 0.5;
  const cappedAlpha = Math.max(0, Math.min(0.88, alpha));

  ctx.save();
  ctx.translate(params.x, params.y);
  if (params.scaleX !== undefined || params.scaleY !== undefined) {
    ctx.scale(params.scaleX ?? 1, params.scaleY ?? 1);
  }
  if (params.rotationRad) {
    ctx.rotate(params.rotationRad);
  }

  // 1. Crisp Sumi-e dark-ink contrast backing so anime slashes & shockwaves pop against sunlit stone
  if (drawW >= 36) {
    const shadowR = Math.max(drawW, drawH) * 0.44;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(0.34, cappedAlpha * 0.36);
    const underGrad = ctx.createRadialGradient(0, 0, shadowR * 0.08, 0, 0, shadowR);
    underGrad.addColorStop(0, 'rgba(18, 8, 6, 0.78)');
    underGrad.addColorStop(0.58, 'rgba(28, 10, 8, 0.42)');
    underGrad.addColorStop(1, 'rgba(18, 8, 6, 0)');
    ctx.fillStyle = underGrad;
    ctx.beginPath();
    ctx.arc(0, 0, shadowR, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Primary 'screen' pass: #000000 is 100% transparent, preserving rich anime pigments
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = cappedAlpha;
  ctx.drawImage(
    sheet.canvas,
    cell.sx,
    cell.sy,
    cell.sw,
    cell.sh,
    -drawW * ax,
    -drawH * ay,
    drawW,
    drawH
  );

  // 3. Secondary 'lighter' anime core punch so slashes & hit bursts have crisp Ufotable luminance
  if (cappedAlpha > 0.22 && drawW >= 28) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.42, cappedAlpha * 0.38);
    ctx.drawImage(
      sheet.canvas,
      cell.sx,
      cell.sy,
      cell.sw,
      cell.sh,
      -drawW * ax * 0.94,
      -drawH * ay * 0.94,
      drawW * 0.94,
      drawH * 0.94
    );
  }
  ctx.restore();
  return true;
}

/**
 * Convenience helper to render an animated frame from a specific row (`rowIndex` / `row`) of a multi-row
 * `#000000` flipbook sheet given normalized progress `[0..1]`.
 */
export function drawAdditiveFlipbookRowProgress(
  ctx: CanvasRenderingContext2D,
  params: {
    sheetSpec?: FlipbookSheetSpec;
    sheetUrl?: string;
    cols?: number;
    rows?: number;
    rowIndex?: number;
    row?: number;
    progress?: number;
    progress01?: number;
    x: number;
    y: number;
    size?: number;
    width?: number;
    height?: number;
    rotationRad?: number;
    scaleX?: number;
    scaleY?: number;
    alpha?: number;
    anchorX?: number;
    anchorY?: number;
  }
): boolean {
  const cols = params.sheetSpec ? params.sheetSpec.cols : (params.cols ?? 4);
  const rows = params.sheetSpec ? params.sheetSpec.rows : (params.rows ?? 2);
  const row = params.row ?? params.rowIndex ?? 0;
  const rawProg = params.progress01 ?? params.progress ?? 0;
  const clampedProg = Math.max(0, Math.min(0.9999, rawProg));
  const colIndex = Math.min(cols - 1, Math.floor(clampedProg * cols));
  const w = params.width ?? params.size ?? 128;
  return drawAdditiveFlipbookCell(ctx, {
    sheetSpec: params.sheetSpec,
    sheetUrl: params.sheetUrl,
    cols,
    rows,
    col: colIndex,
    row,
    x: params.x,
    y: params.y,
    width: w,
    height: params.height,
    rotationRad: params.rotationRad,
    scaleX: params.scaleX,
    scaleY: params.scaleY,
    alpha: params.alpha,
    anchorX: params.anchorX,
    anchorY: params.anchorY,
  });
}

export type ParticleFlipbookArchetype =
  | 'blood_splatter'
  | 'ember_dust'
  | 'magic_spell'
  | 'bronze_spark';

export interface ParticleFlipbookMapping {
  sheetSpec: FlipbookSheetSpec;
  row: number;
  colOffset: number;
  singleCol: boolean;
  alignToVelocity: boolean;
  baseScale: number;
  maxAlpha: number;
  maxSizePx: number;
}

/**
 * Maps each particle archetype in `particleAndAudioEngine.ts` to an authentic Phase 2
 * hand-painted `#000000` flipbook cell rendered via additive blending (`globalCompositeOperation = 'lighter'`).
 * Uses crisp spark/droplet cells (Col 3 / Row 1) at compact particle scale so bursts never stack into blown-out disks.
 */
export function resolveParticleFlipbookSpec(
  archetype: ParticleFlipbookArchetype
): ParticleFlipbookMapping {
  switch (archetype) {
    case 'blood_splatter':
      return {
        sheetSpec: PHASE2_VFX_SHEETS.parryAndHitSparks4x2,
        row: PARRY_SPARKS_FLIPBOOK_ROWS.DIRECTIONAL_HIT_SPLATTER,
        colOffset: 1,
        singleCol: false,
        alignToVelocity: true,
        baseScale: 2.35,
        maxAlpha: 0.72,
        maxSizePx: 18,
      };
    case 'bronze_spark':
      return {
        sheetSpec: PHASE2_VFX_SHEETS.parryAndHitSparks4x2,
        row: PARRY_SPARKS_FLIPBOOK_ROWS.VEDIC_PARRY_FLASH,
        colOffset: 3,
        singleCol: true,
        alignToVelocity: true,
        baseScale: 2.15,
        maxAlpha: 0.78,
        maxSizePx: 17,
      };
    case 'magic_spell':
      return {
        sheetSpec: PHASE2_VFX_SHEETS.parryAndHitSparks4x2,
        row: PARRY_SPARKS_FLIPBOOK_ROWS.VEDIC_PARRY_FLASH,
        colOffset: 3,
        singleCol: true,
        alignToVelocity: false,
        baseScale: 2.0,
        maxAlpha: 0.68,
        maxSizePx: 16,
      };
    case 'ember_dust':
    default:
      return {
        sheetSpec: PHASE2_VFX_SHEETS.parryAndHitSparks4x2,
        row: PARRY_SPARKS_FLIPBOOK_ROWS.DIRECTIONAL_HIT_SPLATTER,
        colOffset: 3,
        singleCol: true,
        alignToVelocity: true,
        baseScale: 1.85,
        maxAlpha: 0.62,
        maxSizePx: 14,
      };
  }
}

export interface LightningArcFlipbookSegment {
  sheetSpec: FlipbookSheetSpec;
  col: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationRad: number;
  alpha: number;
}

/**
 * Builds chained additive flipbook stamps from `(x1, y1)` to `(x2, y2)` so chain-lightning
 * and Astra discharges render purely via hand-painted flipbooks rather than `ctx.stroke()`.
 */
export function computeLightningArcFlipbookSegments(params: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lifeRatio: number;
  seed?: number;
}): LightningArcFlipbookSegment[] {
  const dx = params.x2 - params.x1;
  const dy = params.y2 - params.y1;
  const dist = Math.hypot(dx, dy);
  const alpha = Math.max(0, Math.min(0.85, params.lifeRatio * 0.85));
  if (dist < 1 || alpha <= 0.01) return [];

  const baseAngle = Math.atan2(dy, dx);
  const segCount = Math.max(1, Math.min(5, Math.ceil(dist / 96)));
  const segLen = dist / segCount;
  const seed = params.seed ?? 0;
  const out: LightningArcFlipbookSegment[] = [];

  for (let i = 0; i < segCount; i++) {
    const midT = (i + 0.5) / segCount;
    const jitter = Math.sin((seed + 1) * 12.9898 + i * 7.23) * 0.14;
    out.push({
      sheetSpec: PHASE2_VFX_SHEETS.parashuSlashes3x3,
      col: (i + Math.floor((1 - params.lifeRatio) * 3)) % 3,
      row: PARASHU_FLIPBOOK_ROWS.DOWNWARD_CRUSH_FISSURE,
      x: params.x1 + dx * midT,
      y: params.y1 + dy * midT,
      width: Math.max(42, segLen * 1.25),
      height: Math.max(24, Math.min(48, segLen * 0.38)),
      rotationRad: baseAngle + jitter,
      alpha,
    });
  }

  out.push({
    sheetSpec: PHASE2_VFX_SHEETS.parryAndHitSparks4x2,
    col: 0,
    row: PARRY_SPARKS_FLIPBOOK_ROWS.DIRECTIONAL_HIT_SPLATTER,
    x: params.x2,
    y: params.y2,
    width: 34,
    height: 26,
    rotationRad: baseAngle,
    alpha: Math.min(0.75, alpha * 0.9),
  });

  return out;
}

/**
 * Renders a chain-lightning / Astra discharge arc using hand-painted additive flipbook segments.
 */
export function renderLightningArcFlipbooks(
  ctx: CanvasRenderingContext2D,
  params: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    lifeRatio: number;
    seed?: number;
  }
): void {
  const segments = computeLightningArcFlipbookSegments(params);
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    drawAdditiveFlipbookCell(ctx, {
      sheetSpec: seg.sheetSpec,
      col: seg.col,
      row: seg.row,
      x: seg.x,
      y: seg.y,
      width: seg.width,
      height: seg.height,
      rotationRad: seg.rotationRad,
      alpha: seg.alpha,
    });
  }
}

