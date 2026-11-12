import * as THREE from 'three';

export type HadesPaletteProfile = 'rudra_bronze' | 'dundubhi_chola' | 'vrikodara_crimson';

export interface RgbPixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/**
 * Pure pixel-level color grading function that preserves the authentic original
 * hues of Rudra, Dundubhi, and Vrikodara while removing washed-out grey flatness
 * via natural S-curve contrast, crisp dark ink crevices, and true pigment saturation
 * (without any artificial orange/copper "oiled" color override).
 */
export function gradePixelToHadesPalette(
  r: number,
  g: number,
  b: number,
  a: number,
  profile: HadesPaletteProfile
): RgbPixel {
  if (a === 0) return { r, g, b, a };

  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const chroma = maxC - minC;

  // 1. Deep ink shadow crevices (muscle & armor outlines baked into texture)
  if (luma < 36) {
    return {
      r: clampByte(r * 0.62),
      g: clampByte(g * 0.60),
      b: clampByte(b * 0.64),
      a,
    };
  }

  // 2. Sacred Vibhuti ash markings, bone trim & bright highlights
  if (luma > 202 && chroma < 38) {
    return {
      r: clampByte(Math.min(255, r * 1.12 + 12)),
      g: clampByte(Math.min(255, g * 1.12 + 12)),
      b: clampByte(Math.min(255, b * 1.10 + 10)),
      a,
    };
  }

  // 3. Crimson dhoti / blood-ribbon / warlord crimson accents
  if (r - g > 22 && r > 70) {
    return {
      r: clampByte(r * 1.24 + 10),
      g: clampByte(g * 0.84),
      b: clampByte(b * 0.84),
      a,
    };
  }

  // 4. Preserve original hue of skin, hide, and armor while applying crisp S-curve contrast
  // and natural saturation boost so it never looks washed-out grey OR artificially oiled orange.
  const contrastFactor = profile === 'rudra_bronze' ? 1.16 : 1.18;
  const satBoost = profile === 'rudra_bronze' ? 1.24 : 1.26;
  const targetLuma = 122 + (luma - 122) * contrastFactor;

  const dr = (r - luma) * satBoost;
  const dg = (g - luma) * satBoost;
  const db = (b - luma) * satBoost;

  return {
    r: clampByte(targetLuma + dr),
    g: clampByte(targetLuma + dg),
    b: clampByte(targetLuma + db),
    a,
  };
}

/**
 * Applies `gradePixelToHadesPalette` to a loaded Three.js texture once at load time,
 * returning a crisp `THREE.CanvasTexture` with natural original colors and dark ink crevices.
 */
export function regradeTextureToHadesPalette(
  tex: THREE.Texture | null,
  profile: HadesPaletteProfile
): THREE.Texture | null {
  if (!tex || typeof document === 'undefined') return tex;
  const img = tex.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined;
  if (!img || !('width' in img) || !('height' in img) || img.width <= 0 || img.height <= 0) {
    return tex;
  }

  try {
    const workCanvas = document.createElement('canvas');
    const w = Math.min(1024, img.width);
    const h = Math.min(1024, img.height);
    workCanvas.width = w;
    workCanvas.height = h;
    const ctx = workCanvas.getContext('2d');
    if (!ctx) return tex;

    ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const graded = gradePixelToHadesPalette(
        data[i],
        data[i + 1],
        data[i + 2],
        data[i + 3],
        profile
      );
      data[i] = graded.r;
      data[i + 1] = graded.g;
      data[i + 2] = graded.b;
      data[i + 3] = graded.a;
    }

    ctx.putImageData(imgData, 0, 0);
    const gradedTex = new THREE.CanvasTexture(workCanvas);
    gradedTex.colorSpace = THREE.SRGBColorSpace;
    gradedTex.flipY = tex.flipY;
    gradedTex.wrapS = tex.wrapS;
    gradedTex.wrapT = tex.wrapT;
    gradedTex.needsUpdate = true;
    return gradedTex;
  } catch {
    return tex;
  }
}

/**
 * Quantizes continuous animation time and 360° yaw into responsive Hades 2D sprite-sheet steps
 * (30 FPS for locomotion, 60 FPS for strikes, and 36 isometric directions for silky-smooth turns).
 */
export function computeSpriteSheetFrameKey(params: {
  id: string;
  animName: string;
  animTime: number;
  yawRad: number;
  isAttacking: boolean;
  isHurt: boolean;
  isParrying: boolean;
  phase?: number;
}): {
  frameKey: string;
  quantizedYaw: number;
  quantizedTimeStep: number;
} {
  const fps = params.isAttacking ? 60 : 30;
  const quantizedTimeStep = Math.floor(Math.max(0, params.animTime) * fps);

  const dirSteps = 36;
  const twoPi = Math.PI * 2;
  const normYaw = ((params.yawRad % twoPi) + twoPi) % twoPi;
  const yawIdx = Math.round((normYaw / twoPi) * dirSteps) % dirSteps;
  const quantizedYaw = (yawIdx / dirSteps) * twoPi;

  const flags = `${params.isAttacking ? 'A' : ''}${params.isHurt ? 'H' : ''}${
    params.isParrying ? 'P' : ''
  }${params.phase ?? 1}`;

  const frameKey = `${params.id}:${params.animName}:t${quantizedTimeStep}:d${yawIdx}:${flags}`;
  return {
    frameKey,
    quantizedYaw,
    quantizedTimeStep,
  };
}

/**
 * Converts raw 3D WebGL character renders into Hades-grade 2D ink-outlined
 * sprite frames while preserving authentic original colors without artificial warm/oiled blowout.
 */
export class Hades2DSpriteBaker {
  private readonly size: number;
  private readonly inkCanvas: HTMLCanvasElement;
  private readonly inkCtx: CanvasRenderingContext2D | null;
  private readonly cache = new Map<string, HTMLCanvasElement>();
  private readonly maxCacheFrames: number;
  private lastFrameKey = '';

  constructor(size: number, maxCacheFrames = 96) {
    this.size = size;
    this.maxCacheFrames = maxCacheFrames;

    this.inkCanvas = document.createElement('canvas');
    this.inkCanvas.width = size;
    this.inkCanvas.height = size;
    this.inkCtx = this.inkCanvas.getContext('2d');
  }

  public hasCachedFrame(frameKey: string): boolean {
    return this.cache.has(frameKey);
  }

  public drawCachedFrame(frameKey: string, targetCanvas: HTMLCanvasElement): boolean {
    if (frameKey === this.lastFrameKey) {
      return true;
    }
    const cached = this.cache.get(frameKey);
    if (!cached) return false;

    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return false;
    ctx.clearRect(0, 0, this.size, this.size);
    ctx.drawImage(cached, 0, 0);
    this.lastFrameKey = frameKey;
    return true;
  }

  /**
   * Stylizes the rendered 3D `webglCanvas` into a true 2D Hades hand-painted sprite on `targetCanvas`
   * with:
   *  1. Zero 3D plastic/metallic shine (specular glare suppression + 5-band cel shading quantization)
   *  2. Interior comic-ink crease lines detected from luminance gradients
   *  3. Warm golden-amber upper-edge rim highlight + 2px dark obsidian comic ink outer contour (#0b070d)
   */
  public bakeSpriteFrame(
    webglCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    options: {
      frameKey: string;
      rimColor?: string;
      outlinePx?: number;
      isHurt?: boolean;
      cacheFrame?: boolean;
    }
  ): void {
    const outCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
    if (!outCtx || !this.inkCtx) return;

    const s = this.size;

    // 1. Draw raw WebGL render into inkCanvas and read pixels for 2D Cel-Shader + Ink Outline pass
    this.inkCtx.clearRect(0, 0, s, s);
    this.inkCtx.globalCompositeOperation = 'source-over';
    this.inkCtx.drawImage(webglCanvas, 0, 0, s, s);
    const srcImg = this.inkCtx.getImageData(0, 0, s, s);
    const sData = srcImg.data;

    const outImg = outCtx.createImageData(s, s);
    const dData = outImg.data;
    const total = s * s;
    const fgMask = new Uint8Array(total);
    const lumaBuf = new Float32Array(total);

    for (let p = 0; p < total; p++) {
      const idx = p * 4;
      const a = sData[idx + 3];
      if (a > 40) {
        fgMask[p] = 1;
        lumaBuf[p] = 0.299 * sData[idx] + 0.587 * sData[idx + 1] + 0.114 * sData[idx + 2];
      }
    }

    // 2. Shade interior character pixels with flat-matte cel quantization + interior ink creases + warm rim
    for (let y = 2; y < s - 2; y++) {
      const rOff = y * s;
      for (let x = 2; x < s - 2; x++) {
        const p = rOff + x;
        const idx = p * 4;
        if (fgMask[p] === 1) {
          if (options.isHurt) {
            dData[idx] = 255;
            dData[idx + 1] = 242;
            dData[idx + 2] = 205;
            dData[idx + 3] = 255;
            continue;
          }

          let r = sData[idx];
          let g = sData[idx + 1];
          let b = sData[idx + 2];
          const rawLuma = lumaBuf[p];

          // Suppress 3D specular glare hotspots (>195 luma) so armor/skin never shines like plastic or oil
          const matteLuma =
            rawLuma > 190 ? 190 + (rawLuma - 190) * 0.25 : rawLuma;
          // Lift muddy darks & quantize into 2D hand-painted cel bands (blend 55% smooth + 45% posterized cel)
          const liftedLuma = Math.pow(Math.max(0, Math.min(1, matteLuma / 255)), 0.78) * 245;
          const celBand = Math.round(liftedLuma / 38) * 38;
          const finalLuma = liftedLuma * 0.58 + celBand * 0.42;
          const lumaScale = rawLuma > 4 ? finalLuma / rawLuma : 1.25;

          r = clampByte(r * lumaScale);
          g = clampByte(g * lumaScale);
          b = clampByte(b * lumaScale);

          // Boost true pigment vibrancy so 3D-baked sprites match the rich 2D hand-painted palette
          const newL = 0.299 * r + 0.587 * g + 0.114 * b;
          const sat = 1.28;
          r = clampByte(newL + (r - newL) * sat + 5);
          g = clampByte(newL + (g - newL) * sat + 2);
          b = clampByte(newL + (b - newL) * sat);

          // Interior comic-ink crease detection (Sobel gradient across muscle/armor plates)
          const gx = Math.abs(lumaBuf[p + 1] - lumaBuf[p - 1]);
          const gy = Math.abs(lumaBuf[p + s] - lumaBuf[p - s]);
          const grad = gx + gy;

          // Upper/side silhouette rim test
          const isRim =
            fgMask[p - s] === 0 ||
            fgMask[p - 1] === 0 ||
            fgMask[p + 1] === 0;

          if (isRim) {
            // Crisp 2D warm golden-amber rim highlight
            r = clampByte(r * 0.58 + 255 * 0.42);
            g = clampByte(g * 0.58 + 226 * 0.42);
            b = clampByte(b * 0.58 + 136 * 0.42);
          } else if (grad > 54 && fgMask[p - 1] === 1 && fgMask[p + 1] === 1 && fgMask[p - s] === 1 && fgMask[p + s] === 1) {
            // Crisp dark interior comic ink line
            const inkMix = Math.min(0.72, (grad - 54) / 70);
            r = clampByte(r * (1 - inkMix) + 16 * inkMix);
            g = clampByte(g * (1 - inkMix) + 10 * inkMix);
            b = clampByte(b * (1 - inkMix) + 18 * inkMix);
          }

          dData[idx] = r;
          dData[idx + 1] = g;
          dData[idx + 2] = b;
          dData[idx + 3] = 255;
        } else {
          // Exterior 2px Hades dark-ink outline (#0b070d)
          const n1 =
            fgMask[p - 1] === 1 ||
            fgMask[p + 1] === 1 ||
            fgMask[p - s] === 1 ||
            fgMask[p + s] === 1 ||
            fgMask[p - s - 1] === 1 ||
            fgMask[p - s + 1] === 1 ||
            fgMask[p + s - 1] === 1 ||
            fgMask[p + s + 1] === 1;
          if (n1) {
            dData[idx] = 11;
            dData[idx + 1] = 7;
            dData[idx + 2] = 13;
            dData[idx + 3] = 255;
            continue;
          }
          const n2 =
            fgMask[p - 2] === 1 ||
            fgMask[p + 2] === 1 ||
            fgMask[p - s * 2] === 1 ||
            fgMask[p + s * 2] === 1;
          if (n2) {
            dData[idx] = 24;
            dData[idx + 1] = 14;
            dData[idx + 2] = 20;
            dData[idx + 3] = 215;
          }
        }
      }
    }

    outCtx.putImageData(outImg, 0, 0);
    this.lastFrameKey = options.frameKey;

    if (options.cacheFrame !== false && !options.isHurt) {
      if (this.cache.has(options.frameKey)) {
        this.cache.delete(options.frameKey);
      } else if (this.cache.size >= this.maxCacheFrames) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) this.cache.delete(oldestKey);
      }
      const snapshot = document.createElement('canvas');
      snapshot.width = s;
      snapshot.height = s;
      const snapCtx = snapshot.getContext('2d');
      if (snapCtx) {
        snapCtx.drawImage(targetCanvas, 0, 0);
        this.cache.set(options.frameKey, snapshot);
      }
    }
  }
}

/**
 * Applies Hades-grade stylized matte material adjustments and warm rim-lighting to a 3D hierarchy
 * so baked 2D sprites have crisp contrast, zero plastic/oiled specular blowout, and vibrant colors.
 */
export function applyHadesCelShadingToHierarchy(
  root: THREE.Object3D,
  _options?: {
    rimColor?: number;
    rimIntensity?: number;
  }
): void {
  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    const updated = mats.map((m) => {
      if (!m) return m;
      const std = m as THREE.MeshStandardMaterial;
      if ('roughness' in std) {
        std.roughness = 0.88;
      }
      if ('metalness' in std) {
        std.metalness = 0.06;
      }
      if ('emissive' in std && std.emissive) {
        std.emissive.setHex(0x000000);
        std.emissiveIntensity = 0.0;
      }
      std.needsUpdate = true;
      return std;
    });

    mesh.material = Array.isArray(mesh.material) ? updated : updated[0];
  });
}

const sharedFrameCache = new Map<string, HTMLCanvasElement>();
let sharedSilhouetteCanvas: HTMLCanvasElement | null = null;
let sharedSilhouetteCtx: CanvasRenderingContext2D | null = null;

function getSharedSilhouetteCanvas(w: number, h: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
} {
  if (!sharedSilhouetteCanvas) {
    sharedSilhouetteCanvas = document.createElement('canvas');
    sharedSilhouetteCtx = sharedSilhouetteCanvas.getContext('2d');
  }
  if (sharedSilhouetteCanvas.width !== w || sharedSilhouetteCanvas.height !== h) {
    sharedSilhouetteCanvas.width = w;
    sharedSilhouetteCanvas.height = h;
  } else if (sharedSilhouetteCtx) {
    sharedSilhouetteCtx.clearRect(0, 0, w, h);
  }
  return { canvas: sharedSilhouetteCanvas, ctx: sharedSilhouetteCtx };
}

/**
 * Fast GPU-accelerated 2D Sprite Baker that converts a rendered 3D WebGL frame into a crisp
 * Hades-style 2D sprite with dark comic-ink silhouette outlines, warm upper rim highlight,
 * and optional 3-frame white hit-flash.
 */
export function bake2DSpriteFrameFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  cacheKey: string,
  options?: {
    outlineColor?: string;
    outlineThickness?: number;
    hitFlash?: boolean;
    cacheFrame?: boolean;
  }
): HTMLCanvasElement {
  if (options?.cacheFrame !== false && sharedFrameCache.has(cacheKey)) {
    return sharedFrameCache.get(cacheKey)!;
  }

  const w = sourceCanvas.width || 256;
  const h = sourceCanvas.height || 256;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  const thickness = options?.outlineThickness ?? 2;
  const outlineColor = options?.outlineColor ?? '#120907';

  // 1. Draw crisp 2D silhouette outline using GPU-composited directional offsets on reused scratch canvas
  const { canvas: silhouetteCanvas, ctx: sCtx } = getSharedSilhouetteCanvas(w, h);
  if (sCtx) {
    sCtx.globalCompositeOperation = 'source-over';
    sCtx.drawImage(sourceCanvas, 0, 0, w, h);
    sCtx.globalCompositeOperation = 'source-in';
    sCtx.fillStyle = outlineColor;
    sCtx.fillRect(0, 0, w, h);

    const offsets = [
      [-thickness, 0],
      [thickness, 0],
      [0, -thickness],
      [0, thickness],
      [-thickness * 0.7, -thickness * 0.7],
      [thickness * 0.7, -thickness * 0.7],
      [-thickness * 0.7, thickness * 0.7],
      [thickness * 0.7, thickness * 0.7],
    ];
    for (let i = 0; i < offsets.length; i++) {
      ctx.drawImage(silhouetteCanvas, offsets[i][0], offsets[i][1], w, h);
    }

    // Subtle upper-left warm rim highlight so characters pop against dark & bright arenas
    sCtx.globalCompositeOperation = 'source-in';
    sCtx.fillStyle = 'rgba(255, 200, 110, 0.38)';
    sCtx.fillRect(0, 0, w, h);
    ctx.drawImage(silhouetteCanvas, -1.2, -1.2, w, h);
  }

  // 2. Draw crisp character sprite over the dark ink outline
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(sourceCanvas, 0, 0, w, h);

  // 3. Apply 3-frame Hades white hit-flash when struck
  if (options?.hitFlash) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255, 248, 225, 0.82)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  if (options?.cacheFrame !== false) {
    if (sharedFrameCache.size > 2400) {
      const oldest = sharedFrameCache.keys().next().value;
      if (oldest) sharedFrameCache.delete(oldest);
    }
    sharedFrameCache.set(cacheKey, outCanvas);
  }

  return outCanvas;
}

