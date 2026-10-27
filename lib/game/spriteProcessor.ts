// High-fidelity offscreen Sprite Sheet Border-Seeded Floodfill Matte Extractor,
// Solid-Interior Preservation, Hades-Style Inked Contour Outliner & Pose Segmenter

export interface SpriteFrameBounds {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
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
  baseFrameHeight: number;
}

const processedCache = new Map<string, ProcessedSpriteAsset>();
const loadingPromises = new Map<string, Promise<ProcessedSpriteAsset | null>>();

export function getProcessedSpriteSync(url: string): ProcessedSpriteAsset | undefined {
  return processedCache.get(url);
}

// Maximum offscreen dimension cap (768px preserves >2x Retina sharpness for 88-128px sprites while cutting pixel count & RAM by 92%)
const MAX_SPRITE_SHEET_DIM = 768;

let nextProcessSlotTime = 0;

export function loadAndProcessSprite(
  url: string,
  options: {
    removeBlackBg?: boolean;
    stripCornerWatermark?: boolean;
    frameCount?: number;
    mode?: 'character' | 'vfx' | 'prop';
    gridLayout?: '1xN' | '2x2';
  } = {
    removeBlackBg: true,
    stripCornerWatermark: true,
    frameCount: 4,
    mode: 'character',
    gridLayout: '1xN',
  },
  retryCount: number = 0
): Promise<ProcessedSpriteAsset | null> {
  if (processedCache.has(url)) {
    return Promise.resolve(processedCache.get(url)!);
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
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const now = performance.now();
      const delay = Math.max(0, Math.min(24, nextProcessSlotTime - now));
      nextProcessSlotTime = Math.max(now, nextProcessSlotTime) + 2;
      window.setTimeout(() => {
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
          const maxDim = expectedFrames === 1 && !is2x2Grid ? 256 : MAX_SPRITE_SHEET_DIM;
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
        const stripCorner = options.stripCornerWatermark !== false;
        const isVfxMode = options.mode === 'vfx';
        const isPropMode = options.mode === 'prop';

        const totalPixels = w * h;
        // bgMask: 0 = character foreground (100% opaque), 1 = background (transparent)
        const bgMask = new Uint8Array(totalPixels);

        if (removeBlack && !isVfxMode) {
          // 1. Sample corner pixels to automatically detect MAGENTA (#FF00FF), WHITE (#FFFFFF), or BLACK (#000000) backdrop
          const cornerSamples: Array<[number, number]> = [
            [2, 2],
            [w - 3, 2],
            [2, h - 3],
            [Math.floor(w * 0.5), 2],
            [2, Math.floor(h * 0.5)],
            [w - 3, Math.floor(h * 0.5)],
          ];

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
              if (r > 175 && b > 165 && g < 110 && r - g > 80 && b - g > 70) {
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
                // Props often have pale-gray/ash ground vignettes around the base; strip neutral light-gray exterior cleanly
                return (minC >= 165 && sat <= 34) || (luma >= 175 && sat <= 36) || (colorDist < 68 && luma > 170);
              }
              // White/near-white studio backdrop flood-fill: stops immediately at dark Mignola sumi-ink outlines or colored pixels
              return (minC >= 218 && sat <= 24) || (luma >= 224 && sat <= 28) || (colorDist < 42 && luma > 212);
            }
            return (maxC < 34 && luma < 28) || (colorDist < 38 && luma < 32);
          };

          // 2. Border-Seeded 8-Connected BFS Floodfill so ONLY exterior background is removed
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

          // Seed top & bottom borders
          for (let x = 0; x < w; x++) {
            enqueueIfCandidate(x, 0);
            enqueueIfCandidate(x, 1);
            enqueueIfCandidate(x, h - 1);
            enqueueIfCandidate(x, h - 2);
          }
          // Seed left & right borders
          for (let y = 0; y < h; y++) {
            enqueueIfCandidate(0, y);
            enqueueIfCandidate(1, y);
            enqueueIfCandidate(w - 1, y);
            enqueueIfCandidate(w - 2, y);
          }
          // For 2x2 grids, also seed the central crosshairs so interior cells floodfill cleanly
          if (is2x2Grid) {
            const midX = Math.floor(w * 0.5);
            const midY = Math.floor(h * 0.5);
            for (let x = 0; x < w; x++) {
              enqueueIfCandidate(x, midY);
            }
            for (let y = 0; y < h; y++) {
              enqueueIfCandidate(midX, y);
            }
          }
          // Seed bottom-right corner watermark region unconditionally
          if (stripCorner) {
            const startX = Math.floor(w * 0.89);
            const startY = Math.floor(h * 0.87);
            for (let y = startY; y < h; y++) {
              for (let x = startX; x < w; x++) {
                enqueueIfCandidate(x, y, true);
              }
            }
          }

          // Run BFS floodfill from borders
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

          // 3. Detect enclosed uniform backdrop pockets (e.g. pure-white or pure-black gaps between legs, arms, chains, or bowstrings)
          // while strictly preserving all interior armor, bone, hair, and weapons.
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

            // Clear enclosed pocket if it's a uniform studio backdrop gap (e.g. between bowstring and bow or between legs)
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

          // 3.5. De-fringe bright white/gray or magenta anti-aliased halo pixels right on the outer edge
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

        const colOpaqueCount = new Int32Array(w);
        const rowOpaqueCount = new Int32Array(h);

        // 4. Build final character pixels (100% solid interior + Hades dark bronze contour + hit/rim/shadow silhouettes)
        for (let y = 0; y < h; y++) {
          const isBottomCornerY = stripCorner && y > h * 0.87;
          const rowOff = y * w;
          for (let x = 0; x < w; x++) {
            const p = rowOff + x;
            const idx = p * 4;
            let r = data[idx];
            let g = data[idx + 1];
            let b = data[idx + 2];
            let a = data[idx + 3];

            if (isBottomCornerY && x > w * 0.89) {
              data[idx + 3] = 0;
              continue;
            }

            const luma = 0.299 * r + 0.587 * g + 0.114 * b;

            if (isVfxMode) {
              // VFX additive/screen/decal sheet mode: smooth luminance alpha ramp
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
                // Check if this background pixel is immediately 4-adjacent to a character pixel
                // If so, render a crisp Hades-style dark obsidian-bronze inked contour pixel!
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
                // Character Foreground Pixel: GUARANTEE 100% SOLID OPACITY (zero interior holes!)
                a = 255;
                const sat = Math.max(r, g, b) - Math.min(r, g, b);
                if (isPropMode && luma > 125 && sat < 36) {
                  // Convert neutral pale-gray ground ash on props into rich dark Kurukshetra soil/bronze
                  r = Math.round(r * 0.38 + 24);
                  g = Math.round(g * 0.31 + 17);
                  b = Math.round(b * 0.24 + 12);
                  data[idx] = r;
                  data[idx + 1] = g;
                  data[idx + 2] = b;
                } else if (luma < 42) {
                  // Subtle shadow-detail lift so dark armor/fur/stripes look rich and painterly
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
              colOpaqueCount[x]++;
              rowOpaqueCount[y]++;
              const lumNorm = Math.min(1, luma / 220);

              // Warm ivory/white silhouette for 50ms impact hit flash
              fData[idx] = 255;
              fData[idx + 1] = 248;
              fData[idx + 2] = 225;
              fData[idx + 3] = a;

              // Imperial gold-amber luminance-mapped silhouette for Stance Unleash & Combo Afterimages
              gData[idx] = Math.round(215 + lumNorm * 40);
              gData[idx + 1] = Math.round(145 + lumNorm * 85);
              gData[idx + 2] = Math.round(35 + lumNorm * 65);
              gData[idx + 3] = a;

              // Celestial jade-cyan luminance-mapped silhouette for Cloud Step Dodge Afterimages
              jData[idx] = Math.round(45 + lumNorm * 110);
              jData[idx + 1] = Math.round(195 + lumNorm * 60);
              jData[idx + 2] = Math.round(180 + lumNorm * 75);
              jData[idx + 3] = a;

              // Deep obsidian-umbral silhouette for Hades directional floor cast shadows
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

          for (let y = yStart; y < yEnd; y++) {
            const rowOffset = y * w;
            for (let x = xStart; x < xEnd; x++) {
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
            return { sx, sy, sw, sh };
          }
          return {
            sx: xStart,
            sy: yStart,
            sw: Math.max(1, xEnd - xStart),
            sh: Math.max(1, yEnd - yStart),
          };
        };

        const frames: SpriteFrameBounds[] = [];

        if (is2x2Grid) {
          // Find natural vertical split near w / 2 and horizontal split near h / 2
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

          // Order: [0] Top-Left, [1] Top-Right, [2] Bottom-Left, [3] Bottom-Right
          frames.push(computeTightBoundsInBox(0, bestSplitX, 0, bestSplitY));
          frames.push(computeTightBoundsInBox(bestSplitX, w, 0, bestSplitY));
          frames.push(computeTightBoundsInBox(0, bestSplitX, bestSplitY, h));
          frames.push(computeTightBoundsInBox(bestSplitX, w, bestSplitY, h));
        } else {
          // 1xN horizontal strip segmentation
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

        const baseFrameHeight = frames[0]?.sh || h;

        const result: ProcessedSpriteAsset = {
          cleanCanvas,
          flashCanvas,
          goldCanvas,
          jadeCanvas,
          shadowCanvas,
          width: w,
          height: h,
          frames,
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
      }, delay);
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

