// High-fidelity offscreen Sprite Sheet Border-Seeded Floodfill Matte Extractor,
// Green-Screen Multi-Row Chroma-Key Segmenter, Solid-Interior Preservation & Hades-Style Inked Contour Outliner

export interface SpriteFrameBounds {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Horizontal center-of-mass offset from sx (in source pixels) so weapon lunges don't shift the body */
  anchorX?: number;
}

export interface ProcessedSpriteAsset {
  cleanCanvas: HTMLCanvasElement;
  flashCanvas: HTMLCanvasElement;
  goldCanvas: HTMLCanvasElement;
  jadeCanvas: HTMLCanvasElement;
  shadowCanvas: HTMLCanvasElement;
  width: number;
  height: number;
  frames: SpriteFrameBounds[];
  rows?: SpriteFrameBounds[][];
  baseFrameHeight: number;
}

const processedCache = new Map<string, ProcessedSpriteAsset>();
const loadingPromises = new Map<string, Promise<ProcessedSpriteAsset | null>>();

export const KNOWN_MULTIROW_UUIDS = [
  'Bronze_Spearman_Sprite_Sheet',
  'Ghoul_Animation_Sprite_Sheet',
  'Fantasy_Knight_Combat_Sprite_Sheet',
  'Monster_Sprite_Animation_Sheet',
  'Hooded_Mage_Animation_Sprite_Sheet',
  'Naga_Warrior_Animation_Sprite_Sheet',
  'Ogre_Warrior_Animation_Sprite_Sheet',
  'Demonic_Ogre_Warrior_Sprite_Sheet',
  'Molten_Golem_Animation_Sprite_Sheet',
  'Undead_Monster_Animation_Spritesheet',
  'Undead_Warrior_Sprite_Sheet',
  'Undead_Archer_Animation_Sprite_Sheet',
  'Minotaur_Warrior_Sprite_Animation_Sheet-4',
  'Minotaur_Warrior_Animation_Sprite_Sheet-1',
  'Horned_Minotaur_Warrior_Sprite_Sheet-2',
  'Horned_Warrior_Animation_Sprite_Sheet-3',
  'Demonic_King_Action_Sprite_Sheet',
];

const KNOWN_2X2_UUIDS = [
  'CB33122A-A9C1-4A00-8F0C-6B65EE5BF3AE', // Vedic Combat VFX 2x2
  'CB79B07D-70B4-4A9F-A5B1-C7C3743DDBCF', // Vrikodara Phase 1 2x2
  '59C244F9-D856-485F-8D8A-2408B379DEA1', // Naga Serpent-King 2x2
  '35922E13-6015-481F-8ABF-723988E0F89C', // Dundubhi Phase 1A 2x2
  '565576C2-F6B7-4179-94FD-2534E706355F', // Dundubhi Phase 1B 2x2
  '0A23068F-ECD7-4091-98B2-E98569B6AE85', // Vrikodara Phase 2 2x2
  '6841C243-65F8-4AF9-BE1C-7B3823597403', // Dundubhi Phase 2 2x2
  'el5r51el5r51el5r_5da30179', // Kaliyuga Cosmic Avatar 2x2
  'kwhb8qkwhb8qkwhb',
  'o86abro86abro86a',
  '2n0p172n0p172n0p',
  'zhy8c6zhy8c6zhy8',
  '5bgscc5bgscc5bgs',
  'e4v7n9e4v7n9e4v7',
  'glxj9tglxj9tglxj',
  '9eap7c9eap7c9eap',
  'smm68fsmm68fsmm6',
  '96efot96efot96ef',
  'u7yyaau7yyaau7yy',
];

const KNOWN_4X1_UUIDS = [
  'EEC0C930-2E86-45A2-A02B-0953ACE3362E', // Aghori Ash-Sorcerer 1x4
  '0BF73362-5404-4715-B6EB-8509CBCF9B51', // Savitri Companion 1x4
  'DD93700A-4C55-47C2-B081-115AAF6D0B03', // Urumi Whip-Blade Assassin 1x4
  '1359D234-AC6C-4877-90EA-DC9626625207', // Sanjaya Companion 1x4
  '8u43ce8u43ce8u43',
  '6669w66669w66669',
  'uyv1euuyv1euuyv1',
  'vw8zcgvw8zcgvw8z',
  'wixy9mwixy9mwixy',
  'v7t1y5v7t1y5v7t1',
  'by91e1by91e1by91',
  'vqynauvqynauvqyn',
];

export function isMultiRowSpriteUrl(url: string): boolean {
  return KNOWN_MULTIROW_UUIDS.some((token) => url.includes(token));
}

/**
 * Selects the appropriate animation frame from a segmented multi-row green-screen sprite sheet
 * based on row count (3, 4, 5, 6, 7, or 8 rows) and enemy animation state.
 */
export function getMultiRowFrameBounds(
  asset: ProcessedSpriteAsset | undefined | null,
  animState: 'idle' | 'walk' | 'windup' | 'attack' | 'special' | 'hurt' | 'death',
  animTime: number,
  stateProgress: number = 0
): SpriteFrameBounds | null {
  if (!asset) return null;
  const rows = asset.rows;
  if (!rows || rows.length === 0) {
    if (asset.frames.length === 0) return null;
    const idx = Math.floor(Math.abs(animTime * 7)) % asset.frames.length;
    return asset.frames[idx] || asset.frames[0];
  }

  const numRows = rows.length;
  let targetRowIdx = 0;
  let subSliceStart = 0;
  let subSliceEnd = 999;

  if (numRows === 3) {
    // 3-row layout (e.g. Bronze Spearman, Monster/Kabandha):
    // Row 0: Idle (first 4) + Walk (remaining 5)
    // Row 1: Hurt (first 2) + Death (remaining) OR Attack (for Monster)
    // Row 2: Attack thrust/combo (for Bronze Spearman) OR Hurt+Death (for Monster)
    const row1Count = rows[1]?.length || 0;
    const row2Count = rows[2]?.length || 0;
    const isSpearmanLayout = row1Count >= 7 && row2Count <= 7;
    if (animState === 'idle') {
      targetRowIdx = 0;
      subSliceStart = 0;
      subSliceEnd = 4;
    } else if (animState === 'walk') {
      targetRowIdx = 0;
      subSliceStart = Math.min(4, Math.max(0, (rows[0]?.length || 1) - 1));
      subSliceEnd = 999;
    } else if (animState === 'windup') {
      targetRowIdx = isSpearmanLayout ? 2 : 1;
      subSliceStart = 0;
      subSliceEnd = 2;
    } else if (animState === 'attack' || animState === 'special') {
      targetRowIdx = isSpearmanLayout ? 2 : 1;
      subSliceStart = 1;
      subSliceEnd = 999;
    } else if (animState === 'hurt') {
      targetRowIdx = isSpearmanLayout ? 1 : 2;
      subSliceStart = 0;
      subSliceEnd = 2;
    } else if (animState === 'death') {
      targetRowIdx = isSpearmanLayout ? 1 : 2;
      subSliceStart = 2;
      subSliceEnd = 999;
    }
  } else if (numRows === 4) {
    // 4-row layout (e.g. Fantasy Knight, Hooded Mage, Ogre Warrior, Demonic Ogre, Molten Golem, Undead Monster, Undead Warrior, Undead Archer):
    const row0Len = rows[0]?.length || 0;
    if (animState === 'idle') {
      targetRowIdx = 0;
      subSliceStart = 0;
      subSliceEnd = row0Len >= 7 ? 4 : row0Len;
    } else if (animState === 'walk') {
      if (row0Len >= 7) {
        targetRowIdx = 0;
        subSliceStart = 4;
      } else {
        targetRowIdx = 1;
      }
    } else if (animState === 'windup') {
      targetRowIdx = 2;
      subSliceStart = 0;
      subSliceEnd = 3;
    } else if (animState === 'attack') {
      targetRowIdx = 2;
      subSliceStart = 2;
      subSliceEnd = 999;
    } else if (animState === 'special') {
      targetRowIdx = 2;
      subSliceStart = 0;
      subSliceEnd = 999;
    } else if (animState === 'hurt') {
      targetRowIdx = 3;
      subSliceStart = 0;
      subSliceEnd = 3;
    } else if (animState === 'death') {
      targetRowIdx = 3;
      subSliceStart = Math.min(3, Math.max(0, (rows[3]?.length || 1) - 3));
      subSliceEnd = 999;
    }
  } else if (numRows === 5) {
    // 5-row layout (e.g. Naga Warrior, Demonic King Boss):
    const row0Len = rows[0]?.length || 0;
    if (animState === 'idle') {
      targetRowIdx = 0;
      subSliceStart = 0;
      subSliceEnd = row0Len >= 7 ? 4 : row0Len;
    } else if (animState === 'walk') {
      if (row0Len >= 7) {
        targetRowIdx = 0;
        subSliceStart = 4;
      } else {
        targetRowIdx = 1;
      }
    } else if (animState === 'windup') {
      targetRowIdx = 2;
      subSliceStart = 0;
      subSliceEnd = 2;
    } else if (animState === 'attack') {
      targetRowIdx = 2;
      subSliceStart = 1;
      subSliceEnd = 999;
    } else if (animState === 'special') {
      targetRowIdx = 3;
    } else if (animState === 'hurt') {
      targetRowIdx = 4;
      subSliceStart = 0;
      subSliceEnd = 2;
    } else if (animState === 'death') {
      targetRowIdx = 4;
      subSliceStart = Math.min(2, Math.max(0, (rows[4]?.length || 1) - 3));
      subSliceEnd = 999;
    }
  } else if (numRows === 6) {
    // 6-row layout (e.g. Ghoul):
    // Row 1: Stalk/Walk, Row 3: Claw Slash, Row 4: Acid Cast, Row 5: Hurt + Death
    if (animState === 'idle') {
      targetRowIdx = 1;
      subSliceStart = 0;
      subSliceEnd = 3;
    } else if (animState === 'walk') {
      targetRowIdx = 1;
      subSliceStart = 0;
      subSliceEnd = 999;
    } else if (animState === 'windup') {
      targetRowIdx = 3;
      subSliceStart = 0;
      subSliceEnd = 3;
    } else if (animState === 'attack') {
      targetRowIdx = 3;
      subSliceStart = 2;
      subSliceEnd = 999;
    } else if (animState === 'special') {
      targetRowIdx = 4;
    } else if (animState === 'hurt') {
      targetRowIdx = 5;
      subSliceStart = 0;
      subSliceEnd = 2;
    } else if (animState === 'death') {
      targetRowIdx = 5;
      subSliceStart = 2;
    }
  } else {
    // 7 or 8 rows (e.g. Minotaur Warrior / Horned Warrior Dundubhi Boss):
    if (animState === 'idle') {
      targetRowIdx = 0;
    } else if (animState === 'walk') {
      targetRowIdx = 1;
    } else if (animState === 'windup') {
      targetRowIdx = Math.min(numRows - 2, 3);
      subSliceStart = 0;
      subSliceEnd = 3;
    } else if (animState === 'attack') {
      targetRowIdx = Math.min(numRows - 2, 3);
      subSliceStart = 1;
      subSliceEnd = 999;
    } else if (animState === 'special') {
      targetRowIdx = Math.min(numRows - 2, 4);
    } else if (animState === 'hurt') {
      targetRowIdx = Math.max(0, numRows - 2);
      subSliceStart = 0;
      subSliceEnd = 2;
    } else if (animState === 'death') {
      targetRowIdx = numRows - 1;
    }
  }

  const chosenRow = rows[Math.min(numRows - 1, Math.max(0, targetRowIdx))] || rows[0];
  if (!chosenRow || chosenRow.length === 0) {
    return asset.frames[0] || null;
  }

  const slice = chosenRow.slice(
    Math.min(subSliceStart, chosenRow.length - 1),
    Math.min(chosenRow.length, Math.max(subSliceStart + 1, subSliceEnd))
  );
  const activeFrames = slice.length > 0 ? slice : chosenRow;

  if (animState === 'attack' || animState === 'special' || animState === 'death' || animState === 'windup') {
    if (stateProgress > 0) {
      const clampedProg = Math.max(0, Math.min(0.999, stateProgress));
      const idx = Math.min(
        activeFrames.length - 1,
        Math.max(0, Math.floor(clampedProg * activeFrames.length))
      );
      return activeFrames[idx];
    }
  }

  // Ping-pong idle animation for breathing smoothness; linear cycle for walk/combat
  if (animState === 'idle' && activeFrames.length >= 3) {
    const cycleLen = activeFrames.length * 2 - 2;
    const rawStep = Math.floor(Math.abs(animTime * 6.0)) % cycleLen;
    const idx = rawStep < activeFrames.length ? rawStep : cycleLen - rawStep;
    return activeFrames[idx] || activeFrames[0];
  }

  const fps = animState === 'walk' ? 9.5 : 10.5;
  const idx = Math.floor(Math.abs(animTime * fps)) % activeFrames.length;
  return activeFrames[idx] || activeFrames[0];
}

export function getProcessedSpriteSync(url: string): ProcessedSpriteAsset | undefined {
  const cached = processedCache.get(url);
  if (cached) return cached;
  if (url && !loadingPromises.has(url) && typeof window !== 'undefined') {
    const isMultiRow = isMultiRowSpriteUrl(url);
    const is2x2 =
      !isMultiRow &&
      (url.includes('2x2') ||
        url.includes('avatar') ||
        KNOWN_2X2_UUIDS.some((token) => url.includes(token)));
    const is4x1 =
      !isMultiRow &&
      !is2x2 &&
      (url.includes('4x1') ||
        url.includes('enemy') ||
        url.includes('brazier') ||
        KNOWN_4X1_UUIDS.some((token) => url.includes(token)));
    const isVfx =
      url.includes('CB33122A-A9C1-4A00-8F0C-6B65EE5BF3AE') ||
      url.includes('vfx') ||
      url.includes('decal') ||
      url.includes('impact') ||
      url.includes('slash') ||
      url.includes('arrow') ||
      url.includes('kwhb8q') ||
      url.includes('o86abr') ||
      url.includes('2n0p17') ||
      url.includes('vqynau') ||
      url.includes('smm68f') ||
      url.includes('96efot') ||
      url.includes('42ht5k') ||
      url.includes('a51igx');
    loadAndProcessSprite(url, {
      removeBlackBg: true,
      stripCornerWatermark: !isMultiRow,
      frameCount: isMultiRow ? 16 : is2x2 || is4x1 ? 4 : url.includes('2x1') || url.includes('gcf89k') ? 2 : 1,
      mode: isVfx ? 'vfx' : 'character',
      gridLayout: isMultiRow ? 'multirow' : is2x2 ? '2x2' : '1xN',
    });
  }
  return undefined;
}

const MAX_SPRITE_SHEET_DIM = 1024;
const MAX_MULTIROW_SHEET_DIM = 2048;

export function loadAndProcessSprite(
  url: string,
  options: {
    removeBlackBg?: boolean;
    stripCornerWatermark?: boolean;
    frameCount?: number;
    mode?: 'character' | 'vfx' | 'prop';
    gridLayout?: '1xN' | '2x2' | 'multirow';
  } = {
    removeBlackBg: true,
    stripCornerWatermark: true,
    frameCount: 4,
    mode: 'character',
    gridLayout: '1xN',
  },
  retryCount: number = 0
): Promise<ProcessedSpriteAsset | null> {
  const isMultiRow = options.gridLayout === 'multirow' || isMultiRowSpriteUrl(url);
  const reqFrames = Math.max(1, options.frameCount ?? 1);
  if (processedCache.has(url)) {
    const existing = processedCache.get(url)!;
    if (isMultiRow ? (existing.rows && existing.rows.length > 0) : existing.frames.length >= reqFrames) {
      return Promise.resolve(existing);
    }
    processedCache.delete(url);
  }
  if (loadingPromises.has(url)) {
    return loadingPromises.get(url)!;
  }

  const promise = new Promise<ProcessedSpriteAsset | null>((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    if (/^https?:\/\//i.test(url)) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      try {
        const rawW = img.naturalWidth || img.width;
        const rawH = img.naturalHeight || img.height;
        if (rawW <= 0 || rawH <= 0) {
          loadingPromises.delete(url);
          resolve(null);
          return;
        }
        const expectedFrames = Math.max(1, options.frameCount ?? 1);
        const is2x2Grid = options.gridLayout === '2x2';
        const maxDim = isMultiRow
          ? MAX_MULTIROW_SHEET_DIM
          : expectedFrames === 1 && !is2x2Grid
            ? 256
            : MAX_SPRITE_SHEET_DIM;
        const scale = Math.min(1, maxDim / Math.max(rawW, rawH));
        const w = Math.max(16, Math.round(rawW * scale));
        const h = Math.max(16, Math.round(rawH * scale));

        const cleanCanvas = document.createElement('canvas');
        cleanCanvas.width = w;
        cleanCanvas.height = h;
        const ctx = cleanCanvas.getContext('2d', { willReadFrequently: true });

        const flashCanvas = document.createElement('canvas');
        flashCanvas.width = w;
        flashCanvas.height = h;
        const flashCtx = flashCanvas.getContext('2d');

        const goldCanvas = document.createElement('canvas');
        goldCanvas.width = w;
        goldCanvas.height = h;
        const goldCtx = goldCanvas.getContext('2d');

        const jadeCanvas = document.createElement('canvas');
        jadeCanvas.width = w;
        jadeCanvas.height = h;
        const jadeCtx = jadeCanvas.getContext('2d');

        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = w;
        shadowCanvas.height = h;
        const shadowCtx = shadowCanvas.getContext('2d');

        if (!ctx || !flashCtx || !goldCtx || !jadeCtx || !shadowCtx) {
          loadingPromises.delete(url);
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const flashImgData = flashCtx.createImageData(w, h);
        const fData = flashImgData.data;

        const goldImgData = goldCtx.createImageData(w, h);
        const gData = goldImgData.data;

        const jadeImgData = jadeCtx.createImageData(w, h);
        const jData = jadeImgData.data;

        const shadowImgData = shadowCtx.createImageData(w, h);
        const sData = shadowImgData.data;

        const removeBlack = options.removeBlackBg !== false;
        const stripCorner = options.stripCornerWatermark !== false && !isMultiRow;
        const isVfxMode = options.mode === 'vfx';
        const isPropMode = options.mode === 'prop';

        const totalPixels = w * h;
        // bgMask: 0 = character foreground (100% opaque), 1 = background (transparent)
        const bgMask = new Uint8Array(totalPixels);

        if (removeBlack && !isVfxMode) {
          // 1. Sample corner pixels to detect GREEN (#00FF00), MAGENTA (#FF00FF), WHITE (#FFFFFF), or BLACK (#000000) backdrop
          const cornerSamples: Array<[number, number]> = [
            [2, 2],
            [w - 3, 2],
            [2, h - 3],
            [w - 3, h - 3],
            [Math.floor(w * 0.5), 2],
            [2, Math.floor(h * 0.5)],
            [w - 3, Math.floor(h * 0.5)],
          ];

          let greenCornerCount = 0;
          let lightCornerCount = 0;
          let darkCornerCount = 0;
          let magentaCornerCount = 0;
          let sumR = 0;
          let sumG = 0;
          let sumB = 0;
          let sampleCount = 0;

          for (const [cx, cy] of cornerSamples) {
            if (cx >= 0 && cx < w && cy >= 0 && cy < h) {
              const cIdx = (cy * w + cx) * 4;
              const r = data[cIdx];
              const g = data[cIdx + 1];
              const b = data[cIdx + 2];
              const luma = 0.299 * r + 0.587 * g + 0.114 * b;
              if (g > 145 && r < 115 && b < 115 && g - r > 50 && g - b > 50) {
                greenCornerCount++;
                sumR += r;
                sumG += g;
                sumB += b;
                sampleCount++;
              } else if (r > 175 && b > 165 && g < 110 && r - g > 80 && b - g > 70) {
                magentaCornerCount++;
                sumR += r;
                sumG += g;
                sumB += b;
                sampleCount++;
              } else if (luma > 210) {
                lightCornerCount++;
                sumR += r;
                sumG += g;
                sumB += b;
                sampleCount++;
              } else if (Math.max(r, g, b) < 48) {
                darkCornerCount++;
                sumR += r;
                sumG += g;
                sumB += b;
                sampleCount++;
              }
            }
          }

          const isGreenBg =
            isMultiRow ||
            (greenCornerCount >= 2 &&
              greenCornerCount >= lightCornerCount &&
              greenCornerCount >= darkCornerCount);

          if (isGreenBg) {
            // Fast single-pass chroma-key for green-screen multi-row sprite sheets
            for (let p = 0; p < totalPixels; p++) {
              const idx = p * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const a = data[idx + 3];
              if (
                a < 20 ||
                (g > 135 && g - r > 42 && g - b > 42 && r < 135 && b < 135) ||
                (g > 180 && g - r > 32 && g - b > 32)
              ) {
                bgMask[p] = 1;
              }
            }

            // Also strip any full-width horizontal or full-height vertical white/dark divider lines in multi-row sheets
            for (let y = 0; y < h; y++) {
              let rowNonBg = 0;
              let rowBrightWhite = 0;
              const rowOff = y * w;
              for (let x = 0; x < w; x++) {
                const p = rowOff + x;
                if (bgMask[p] === 0) {
                  rowNonBg++;
                  const idx = p * 4;
                  if (data[idx] > 215 && data[idx + 1] > 215 && data[idx + 2] > 215) {
                    rowBrightWhite++;
                  }
                }
              }
              if (rowBrightWhite > w * 0.42 || rowNonBg > w * 0.82) {
                for (let x = 0; x < w; x++) {
                  bgMask[rowOff + x] = 1;
                }
              }
            }
            for (let x = 0; x < w; x++) {
              let colNonBg = 0;
              let colBrightWhite = 0;
              for (let y = 0; y < h; y++) {
                const p = y * w + x;
                if (bgMask[p] === 0) {
                  colNonBg++;
                  const idx = p * 4;
                  if (data[idx] > 215 && data[idx + 1] > 215 && data[idx + 2] > 215) {
                    colBrightWhite++;
                  }
                }
              }
              if (colBrightWhite > h * 0.42 || colNonBg > h * 0.85) {
                for (let y = 0; y < h; y++) {
                  bgMask[y * w + x] = 1;
                }
              }
            }

            // Despill & defringe green halo on character border pixels
            for (let pass = 0; pass < 2; pass++) {
              for (let y = 1; y < h - 1; y++) {
                const rowOff = y * w;
                for (let x = 1; x < w - 1; x++) {
                  const p = rowOff + x;
                  if (bgMask[p] !== 0) continue;
                  const touchesBg =
                    bgMask[p - 1] === 1 ||
                    bgMask[p + 1] === 1 ||
                    bgMask[p - w] === 1 ||
                    bgMask[p + w] === 1;
                  if (touchesBg) {
                    const idx = p * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    if (g > 110 && g - r > 28 && g - b > 28) {
                      bgMask[p] = 1;
                    } else if (g > Math.max(r, b)) {
                      // Neutralize green edge spill
                      data[idx + 1] = Math.round((r + b) * 0.5);
                    }
                  }
                }
              }
            }
          } else {
            const isMagentaBg =
              magentaCornerCount >= 2 &&
              magentaCornerCount >= lightCornerCount &&
              magentaCornerCount >= darkCornerCount;
            const isLightBg =
              !isMagentaBg && lightCornerCount >= darkCornerCount && lightCornerCount > 0;
            let bgR = isMagentaBg ? 255 : isLightBg ? 255 : 6;
            let bgG = isMagentaBg ? 0 : isLightBg ? 255 : 6;
            let bgB = isMagentaBg ? 255 : isLightBg ? 255 : 8;
            if (sampleCount > 0) {
              bgR = sumR / sampleCount;
              bgG = sumG / sampleCount;
              bgB = sumB / sampleCount;
            }

            const isExteriorBgCandidate = (pIdx: number): boolean => {
              const idx = pIdx * 4;
              const a = data[idx + 3];
              if (a < 20) return true;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const maxC = Math.max(r, g, b);
              const minC = Math.min(r, g, b);
              const sat = maxC - minC;
              const luma = 0.299 * r + 0.587 * g + 0.114 * b;
              const colorDist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);

              if (isMagentaBg) {
                return (
                  (r > 150 && b > 140 && g < 120 && r - g > 65 && b - g > 55) ||
                  colorDist < 85
                );
              }
              if (isLightBg) {
                if (isPropMode) {
                  return (minC >= 165 && sat <= 34) || (luma >= 175 && sat <= 36) || (colorDist < 68 && luma > 170);
                }
                return (minC >= 218 && sat <= 24) || (luma >= 224 && sat <= 28) || (colorDist < 42 && luma > 212);
              }
              return (maxC < 46 && luma < 40) || (colorDist < 48 && luma < 42);
            };

            // 2. Border-Seeded 8-Connected BFS Floodfill
            const queue = new Int32Array(totalPixels);
            let qHead = 0;
            let qTail = 0;

            const enqueueIfCandidate = (x: number, y: number, forceWatermark: boolean = false) => {
              const p = y * w + x;
              if (bgMask[p] !== 0) return;
              if (forceWatermark || isExteriorBgCandidate(p)) {
                bgMask[p] = 1;
                queue[qTail++] = p;
              }
            };

            for (let x = 0; x < w; x++) {
              enqueueIfCandidate(x, 0);
              enqueueIfCandidate(x, 1);
              enqueueIfCandidate(x, h - 1);
              enqueueIfCandidate(x, h - 2);
            }
            for (let y = 0; y < h; y++) {
              enqueueIfCandidate(0, y);
              enqueueIfCandidate(1, y);
              enqueueIfCandidate(w - 1, y);
              enqueueIfCandidate(w - 2, y);
            }
            if (is2x2Grid) {
              const midX = Math.floor(w * 0.5);
              const midY = Math.floor(h * 0.5);
              for (let x = 0; x < w; x++) {
                enqueueIfCandidate(x, midY);
              }
              for (let y = 0; y < h; y++) {
                enqueueIfCandidate(midX, y);
              }
            } else if (expectedFrames > 1) {
              for (let k = 1; k < expectedFrames; k++) {
                const seamX = Math.floor((k * w) / expectedFrames);
                for (let y = 0; y < h; y++) {
                  enqueueIfCandidate(seamX, y);
                  if (seamX > 0) enqueueIfCandidate(seamX - 1, y);
                  if (seamX < w - 1) enqueueIfCandidate(seamX + 1, y);
                }
              }
            }
            if (stripCorner) {
              const startX = Math.floor(w * 0.88);
              const startY = Math.floor(h * 0.84);
              for (let y = startY; y < h; y++) {
                for (let x = startX; x < w; x++) {
                  enqueueIfCandidate(x, y, true);
                }
              }
            }

            while (qHead < qTail) {
              const curr = queue[qHead++];
              const cx = curr % w;
              const cy = (curr - cx) / w;

              for (let dy = -1; dy <= 1; dy++) {
                const ny = cy + dy;
                if (ny < 0 || ny >= h) continue;
                const rowOff = ny * w;
                for (let dx = -1; dx <= 1; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  const nx = cx + dx;
                  if (nx < 0 || nx >= w) continue;
                  const np = rowOff + nx;
                  if (bgMask[np] === 0 && isExteriorBgCandidate(np)) {
                    bgMask[np] = 1;
                    queue[qTail++] = np;
                  }
                }
              }
            }

            const visitedPocket = new Uint8Array(totalPixels);
            const pocketQueue = new Int32Array(totalPixels);

            const isPureBackdropPocketPixel = (pIdx: number): boolean => {
              const idx = pIdx * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const maxC = Math.max(r, g, b);
              const minC = Math.min(r, g, b);
              if (isMagentaBg) {
                return r > 175 && b > 165 && g < 105 && r - g > 80 && b - g > 70;
              }
              if (isLightBg) {
                return minC >= 244 && maxC - minC <= 6;
              }
              return maxC <= 11 && maxC - minC <= 5;
            };

            for (let p = 0; p < totalPixels; p++) {
              if (bgMask[p] !== 0 || visitedPocket[p] !== 0) continue;
              if (!isPureBackdropPocketPixel(p)) continue;

              let pHead = 0;
              let pTail = 0;
              visitedPocket[p] = 1;
              pocketQueue[pTail++] = p;

              while (pHead < pTail) {
                const curr = pocketQueue[pHead++];
                const cx = curr % w;
                const cy = (curr - cx) / w;
                const neighbors = [
                  cy > 0 ? curr - w : -1,
                  cy < h - 1 ? curr + w : -1,
                  cx > 0 ? curr - 1 : -1,
                  cx < w - 1 ? curr + 1 : -1,
                ];
                for (let nIdx = 0; nIdx < 4; nIdx++) {
                  const np = neighbors[nIdx];
                  if (np >= 0 && bgMask[np] === 0 && visitedPocket[np] === 0 && isPureBackdropPocketPixel(np)) {
                    visitedPocket[np] = 1;
                    pocketQueue[pTail++] = np;
                  }
                }
              }

              const minPocketPixels =
                isLightBg || isMagentaBg
                  ? Math.max(8, Math.round(35 * scale * scale))
                  : Math.max(12, Math.round(95 * scale * scale));
              if (pTail >= minPocketPixels) {
                for (let k = 0; k < pTail; k++) {
                  bgMask[pocketQueue[k]] = 1;
                }
              }
            }

            if (isLightBg || isMagentaBg) {
              const defringePasses = isPropMode ? 3 : isMagentaBg ? 2 : 1;
              const lumaThresh = isPropMode ? 148 : 188;
              for (let pass = 0; pass < defringePasses; pass++) {
                for (let y = 1; y < h - 1; y++) {
                  const rowOff = y * w;
                  for (let x = 1; x < w - 1; x++) {
                    const p = rowOff + x;
                    if (bgMask[p] !== 0) continue;
                    const touchesBg =
                      bgMask[p - 1] === 1 ||
                      bgMask[p + 1] === 1 ||
                      bgMask[p - w] === 1 ||
                      bgMask[p + w] === 1;
                    if (touchesBg) {
                      const idx = p * 4;
                      const r = data[idx];
                      const g = data[idx + 1];
                      const b = data[idx + 2];
                      if (isMagentaBg) {
                        if (r > 130 && b > 120 && r - g > 42 && b - g > 36) {
                          bgMask[p] = 1;
                        }
                      } else {
                        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
                        const sat = Math.max(r, g, b) - Math.min(r, g, b);
                        if (luma > lumaThresh && sat < 38) {
                          bgMask[p] = 1;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }

        const colOpaqueCount = new Int32Array(w);
        const rowOpaqueCount = new Int32Array(h);

        // 4. Build final character pixels (100% solid interior + Hades dark bronze contour + hit/rim/shadow silhouettes)
        for (let y = 0; y < h; y++) {
          const isBottomCornerY = stripCorner && y > h * 0.84;
          const rowOff = y * w;
          for (let x = 0; x < w; x++) {
            const p = rowOff + x;
            const idx = p * 4;
            let r = data[idx];
            let g = data[idx + 1];
            let b = data[idx + 2];
            let a = data[idx + 3];

            if (isBottomCornerY && x > w * 0.88) {
              data[idx + 3] = 0;
              continue;
            }

            const luma = 0.299 * r + 0.587 * g + 0.114 * b;

            if (isVfxMode) {
              const maxChannel = Math.max(r, g, b);
              if (maxChannel < 20 && luma < 16) {
                data[idx + 3] = 0;
                continue;
              } else if (maxChannel < 64) {
                const factor = Math.max(0, Math.min(1, (maxChannel - 16) / 48));
                a = Math.round(a * factor);
                data[idx + 3] = a;
              }
            } else if (removeBlack) {
              if (bgMask[p] === 1) {
                const touchesChar =
                  (x > 0 && bgMask[p - 1] === 0) ||
                  (x < w - 1 && bgMask[p + 1] === 0) ||
                  (y > 0 && bgMask[p - w] === 0) ||
                  (y < h - 1 && bgMask[p + w] === 0);

                if (touchesChar) {
                  data[idx] = 18;
                  data[idx + 1] = 14;
                  data[idx + 2] = 11;
                  data[idx + 3] = 215;
                  a = 215;
                } else {
                  data[idx + 3] = 0;
                  continue;
                }
              } else {
                a = 255;
                const sat = Math.max(r, g, b) - Math.min(r, g, b);
                if (isPropMode && luma > 125 && sat < 36) {
                  r = Math.round(r * 0.38 + 24);
                  g = Math.round(g * 0.31 + 17);
                  b = Math.round(b * 0.24 + 12);
                  data[idx] = r;
                  data[idx + 1] = g;
                  data[idx + 2] = b;
                } else if (luma < 42) {
                  const lift = Math.round((42 - luma) * 0.28);
                  r = Math.min(255, r + lift + 3);
                  g = Math.min(255, g + lift + 1);
                  b = Math.min(255, b + lift);
                  data[idx] = r;
                  data[idx + 1] = g;
                  data[idx + 2] = b;
                }
                data[idx + 3] = 255;
              }
            }

            if (a > 24) {
              if (bgMask[p] === 0) {
                colOpaqueCount[x]++;
                rowOpaqueCount[y]++;
              }
              const lumNorm = Math.min(1, luma / 220);

              fData[idx] = 255;
              fData[idx + 1] = 248;
              fData[idx + 2] = 225;
              fData[idx + 3] = a;

              gData[idx] = Math.round(215 + lumNorm * 40);
              gData[idx + 1] = Math.round(145 + lumNorm * 85);
              gData[idx + 2] = Math.round(35 + lumNorm * 65);
              gData[idx + 3] = a;

              jData[idx] = Math.round(45 + lumNorm * 110);
              jData[idx + 1] = Math.round(195 + lumNorm * 60);
              jData[idx + 2] = Math.round(180 + lumNorm * 75);
              jData[idx + 3] = a;

              sData[idx] = 6;
              sData[idx + 1] = 5;
              sData[idx + 2] = 10;
              sData[idx + 3] = Math.round(a * 0.52);
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        flashCtx.putImageData(flashImgData, 0, 0);
        goldCtx.putImageData(goldImgData, 0, 0);
        jadeCtx.putImageData(jadeImgData, 0, 0);
        shadowCtx.putImageData(shadowImgData, 0, 0);

        const computeTightBoundsInBox = (
          xStart: number,
          xEnd: number,
          yStart: number,
          yEnd: number
        ): SpriteFrameBounds => {
          let minX = xEnd;
          let maxX = xStart;
          let minY = yEnd;
          let maxY = yStart;
          let found = false;

          const innerMarginX =
            !isMultiRow && expectedFrames > 1 ? Math.min(6, Math.round((xEnd - xStart) * 0.025)) : 0;
          const scanXStart = xStart + innerMarginX;
          const scanXEnd = Math.max(scanXStart + 1, xEnd - innerMarginX);

          for (let y = yStart; y < yEnd; y++) {
            const rowOffset = y * w;
            for (let x = scanXStart; x < scanXEnd; x++) {
              const alpha = data[(rowOffset + x) * 4 + 3];
              if (alpha > 36) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                found = true;
              }
            }
          }

          if (found && maxX > minX && maxY > minY) {
            const pad = 2;
            const sx = Math.max(xStart, minX - pad);
            const sy = Math.max(yStart, minY - pad);
            const sw = Math.min(xEnd - sx, maxX - minX + 1 + pad * 2);
            const sh = Math.min(yEnd - sy, maxY - minY + 1 + pad * 2);

            // Compute torso/legs horizontal center-of-mass (28%..88% of frame height)
            // so extended weapon tips (spears, maces, whips) don't shift the character's body center
            const bandY0 = Math.max(sy, Math.floor(sy + sh * 0.28));
            const bandY1 = Math.min(sy + sh, Math.ceil(sy + sh * 0.88));
            let weightedXSum = 0;
            let weightTotal = 0;
            for (let y = bandY0; y < bandY1; y++) {
              const rOff = y * w;
              for (let x = sx; x < sx + sw; x++) {
                if (bgMask[rOff + x] === 0) {
                  weightedXSum += x - sx;
                  weightTotal++;
                }
              }
            }
            const anchorX =
              weightTotal > 24
                ? Math.max(sw * 0.28, Math.min(sw * 0.72, weightedXSum / weightTotal))
                : sw * 0.5;

            return { sx, sy, sw, sh, anchorX };
          }
          const fallbackSw = Math.max(1, xEnd - xStart);
          return {
            sx: xStart,
            sy: yStart,
            sw: fallbackSw,
            sh: Math.max(1, yEnd - yStart),
            anchorX: fallbackSw * 0.5,
          };
        };

        const frames: SpriteFrameBounds[] = [];
        let segmentedRows: SpriteFrameBounds[][] | undefined = undefined;

        if (isMultiRow) {
          segmentedRows = [];
          // 1. Identify horizontal row bands where rowOpaqueCount[y] > 3
          const rawBands: Array<[number, number]> = [];
          let inBand = false;
          let bandStart = 0;
          const minBandHeight = Math.max(18, Math.round(h * 0.045));
          for (let y = 0; y < h; y++) {
            if (rowOpaqueCount[y] > 3) {
              if (!inBand) {
                inBand = true;
                bandStart = y;
              }
            } else if (inBand) {
              inBand = false;
              if (y - bandStart >= minBandHeight) {
                rawBands.push([bandStart, y]);
              }
            }
          }
          if (inBand && h - bandStart >= minBandHeight) {
            rawBands.push([bandStart, h]);
          }

          // Merge tiny vertical gaps (< 5px) within the same row
          const rowBands: Array<[number, number]> = [];
          for (const band of rawBands) {
            if (rowBands.length > 0 && band[0] - rowBands[rowBands.length - 1][1] < 5) {
              rowBands[rowBands.length - 1][1] = band[1];
            } else {
              rowBands.push([...band]);
            }
          }

          // Split any abnormally tall merged vertical band (> 1.85x median row height)
          if (rowBands.length >= 2) {
            const sortedBandH = rowBands.map((b) => b[1] - b[0]).sort((a, b) => a - b);
            const medBandH = sortedBandH[Math.floor(sortedBandH.length * 0.5)];
            const refinedBands: Array<[number, number]> = [];
            for (const [by0, by1] of rowBands) {
              const bh = by1 - by0;
              if (bh > medBandH * 1.75 && medBandH >= 24) {
                const subRows = Math.min(4, Math.max(2, Math.round(bh / medBandH)));
                let prevY = by0;
                for (let r = 1; r < subRows; r++) {
                  const nomY = Math.round(by0 + (r * bh) / subRows);
                  const radY = Math.max(6, Math.round(medBandH * 0.22));
                  let bestY = nomY;
                  let bestRowDensity = Number.MAX_SAFE_INTEGER;
                  for (
                    let sy = Math.max(prevY + 18, nomY - radY);
                    sy <= Math.min(by1 - 18, nomY + radY);
                    sy++
                  ) {
                    const d = rowOpaqueCount[sy - 1] + rowOpaqueCount[sy] * 2 + rowOpaqueCount[sy + 1];
                    if (d < bestRowDensity) {
                      bestRowDensity = d;
                      bestY = sy;
                    }
                  }
                  refinedBands.push([prevY, bestY]);
                  prevY = bestY;
                }
                refinedBands.push([prevY, by1]);
              } else {
                refinedBands.push([by0, by1]);
              }
            }
            rowBands.length = 0;
            rowBands.push(...refinedBands);
          }

          // 2. For each horizontal row band, find column islands
          for (const [ry0, ry1] of rowBands) {
            const rowH = ry1 - ry0;
            if (rowH < 18) continue;

            const colCount = new Int32Array(w);
            for (let y = ry0; y < ry1; y++) {
              const rOff = y * w;
              for (let x = 0; x < w; x++) {
                if (bgMask[rOff + x] === 0) {
                  colCount[x]++;
                }
              }
            }

            // Treat columns with <= 2 stray weapon-tip pixels as empty valleys so adjacent poses separate cleanly
            const minColPixels = Math.max(2, Math.floor(rowH * 0.025));
            const minColWidth = Math.max(12, Math.round(rowH * 0.14));
            const rawCols: Array<[number, number]> = [];
            let inCol = false;
            let colStart = 0;
            for (let x = 0; x < w; x++) {
              if (colCount[x] > minColPixels) {
                if (!inCol) {
                  inCol = true;
                  colStart = x;
                }
              } else if (inCol) {
                inCol = false;
                if (x - colStart >= minColWidth) {
                  rawCols.push([colStart, x]);
                }
              }
            }
            if (inCol && w - colStart >= minColWidth) {
              rawCols.push([colStart, w]);
            }

            // Merge tiny horizontal gaps (< 3px) only if the combined width remains within a single pose (< 1.15 * rowH)
            const mergedCols: Array<[number, number]> = [];
            for (const col of rawCols) {
              if (
                mergedCols.length > 0 &&
                col[0] - mergedCols[mergedCols.length - 1][1] <= 3 &&
                col[1] - mergedCols[mergedCols.length - 1][0] <= rowH * 1.15
              ) {
                mergedCols[mergedCols.length - 1][1] = col[1];
              } else {
                mergedCols.push([...col]);
              }
            }

            // Determine single-pose reference width (using lower-quartile / median of compact islands so merged pairs never bias it upward)
            const singlePoseWidths = mergedCols
              .map((c) => c[1] - c[0])
              .filter((cw) => cw >= rowH * 0.25 && cw <= rowH * 0.95)
              .sort((a, b) => a - b);
            const medianSingleW =
              singlePoseWidths.length > 0
                ? singlePoseWidths[Math.floor(singlePoseWidths.length * 0.45)]
                : Math.round(rowH * 0.68);
            const expectedFrameW = Math.max(
              22,
              Math.min(Math.round(rowH * 0.88), medianSingleW)
            );

            const rowFrames: SpriteFrameBounds[] = [];
            for (const [cx0, cx1] of mergedCols) {
              const spanW = cx1 - cx0;
              // Split any wide island where 2+ adjacent poses touched spears/claws/capes
              if (spanW > expectedFrameW * 1.34 || spanW > rowH * 1.12) {
                const subCount = Math.min(10, Math.max(2, Math.round(spanW / expectedFrameW)));
                let prevX = cx0;
                for (let k = 1; k < subCount; k++) {
                  const nomX = Math.round(cx0 + (k * spanW) / subCount);
                  const rad = Math.max(8, Math.round(spanW / (subCount * 2.8)));
                  let bestX = nomX;
                  let bestVal = Number.MAX_SAFE_INTEGER;
                  for (
                    let sx = Math.max(prevX + minColWidth, nomX - rad);
                    sx <= Math.min(cx1 - minColWidth, nomX + rad);
                    sx++
                  ) {
                    const v =
                      colCount[Math.max(0, sx - 2)] +
                      colCount[Math.max(0, sx - 1)] * 2 +
                      colCount[sx] * 3 +
                      colCount[Math.min(w - 1, sx + 1)] * 2 +
                      colCount[Math.min(w - 1, sx + 2)];
                    if (v < bestVal) {
                      bestVal = v;
                      bestX = sx;
                    }
                  }
                  const fb = computeTightBoundsInBox(prevX, bestX, ry0, ry1);
                  if (fb.sw >= 12 && fb.sh >= 16) rowFrames.push(fb);
                  prevX = bestX;
                }
                const lastFb = computeTightBoundsInBox(prevX, cx1, ry0, ry1);
                if (lastFb.sw >= 12 && lastFb.sh >= 16) rowFrames.push(lastFb);
              } else {
                const fb = computeTightBoundsInBox(cx0, cx1, ry0, ry1);
                if (fb.sw >= 12 && fb.sh >= 16) rowFrames.push(fb);
              }
            }

            if (rowFrames.length >= 2) {
              segmentedRows.push(rowFrames);
              for (const rf of rowFrames) {
                frames.push(rf);
              }
            }
          }
        } else if (is2x2Grid) {
          const nomX = Math.round(w * 0.5);
          const radX = Math.round(w * 0.08);
          let bestSplitX = nomX;
          let bestScoreX = Number.MAX_SAFE_INTEGER;
          for (let x = Math.max(16, nomX - radX); x <= Math.min(w - 16, nomX + radX); x++) {
            const density =
              (colOpaqueCount[x - 1] + colOpaqueCount[x] * 2 + colOpaqueCount[x + 1]) * 100 +
              Math.abs(x - nomX);
            if (density < bestScoreX) {
              bestScoreX = density;
              bestSplitX = x;
            }
          }

          const nomY = Math.round(h * 0.5);
          const radY = Math.round(h * 0.08);
          let bestSplitY = nomY;
          let bestScoreY = Number.MAX_SAFE_INTEGER;
          for (let y = Math.max(16, nomY - radY); y <= Math.min(h - 16, nomY + radY); y++) {
            const density =
              (rowOpaqueCount[y - 1] + rowOpaqueCount[y] * 2 + rowOpaqueCount[y + 1]) * 100 +
              Math.abs(y - nomY);
            if (density < bestScoreY) {
              bestScoreY = density;
              bestSplitY = y;
            }
          }

          frames.push(computeTightBoundsInBox(0, bestSplitX, 0, bestSplitY));
          frames.push(computeTightBoundsInBox(bestSplitX, w, 0, bestSplitY));
          frames.push(computeTightBoundsInBox(0, bestSplitX, bestSplitY, h));
          frames.push(computeTightBoundsInBox(bestSplitX, w, bestSplitY, h));
        } else {
          const splits: number[] = [0];
          for (let k = 1; k < expectedFrames; k++) {
            const nominalX = Math.round((k * w) / expectedFrames);
            const searchRadius = Math.round(w * 0.085);
            const minSearchX = Math.max(splits[k - 1] + 16, nominalX - searchRadius);
            const maxSearchX = Math.min(w - 16, nominalX + searchRadius);

            let bestX = nominalX;
            let bestScore = Number.MAX_SAFE_INTEGER;
            for (let x = minSearchX; x <= maxSearchX; x++) {
              const density =
                (colOpaqueCount[Math.max(0, x - 2)] +
                  colOpaqueCount[Math.max(0, x - 1)] +
                  colOpaqueCount[x] * 2 +
                  colOpaqueCount[Math.min(w - 1, x + 1)] +
                  colOpaqueCount[Math.min(w - 1, x + 2)]) *
                  100 +
                Math.abs(x - nominalX);
              if (density < bestScore) {
                bestScore = density;
                bestX = x;
              }
            }
            splits.push(bestX);
          }
          splits.push(w);

          for (let f = 0; f < expectedFrames; f++) {
            frames.push(computeTightBoundsInBox(splits[f], splits[f + 1], 0, h));
          }
        }

        if (frames.length === 0) {
          frames.push({ sx: 0, sy: 0, sw: w, sh: h });
        }

        const standingRefFrames =
          segmentedRows && segmentedRows.length >= 2
            ? [...segmentedRows[0], ...segmentedRows[1]]
            : segmentedRows && segmentedRows.length === 1
            ? segmentedRows[0]
            : frames;
        const maxSh = standingRefFrames.reduce((acc, f) => Math.max(acc, f.sh), 0);
        const baseFrameHeight = maxSh > 0 ? maxSh : frames[0]?.sh || h;

        const result: ProcessedSpriteAsset = {
          cleanCanvas,
          flashCanvas,
          goldCanvas,
          jadeCanvas,
          shadowCanvas,
          width: w,
          height: h,
          frames,
          rows: segmentedRows,
          baseFrameHeight,
        };
        processedCache.set(url, result);
        loadingPromises.delete(url);
        resolve(result);
      } catch (err) {
        console.error('SpriteProcessor error:', url, err);
        loadingPromises.delete(url);
        resolve(null);
      }
    };
    img.onerror = () => {
      loadingPromises.delete(url);
      if (retryCount < 3) {
        window.setTimeout(() => {
          loadAndProcessSprite(url, options, retryCount + 1).then(resolve);
        }, 650 * (retryCount + 1));
      } else {
        resolve(null);
      }
    };
    img.src = url;
  });

  loadingPromises.set(url, promise);
  return promise;
}
