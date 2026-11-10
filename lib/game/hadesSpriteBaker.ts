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
 * Pure pixel-level color grading function that converts washed-out/pale 3D Meshy/Mixamo
 * textures into rich, high-contrast Hades-style hand-painted dark-mythology pigments:
 * - 'rudra_bronze': Transforms pale grey skin into gleaming oiled bronze/copper, boosts
 *   sacred Vibhuti ash stripes into luminous gold-ivory, deepens crimson dhoti, and inks dark creases.
 * - 'dundubhi_chola': Enriches Minotaur hide & armor into burnished Chola-bronze & fiery amber runes.
 * - 'vrikodara_crimson': Intensifies Crimson Skull Warlord's blood-lacquered plate & bone skull trim.
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

  if (profile === 'rudra_bronze') {
    // 1. Deep ink shadow crevices (muscle & armor outlines baked into texture)
    if (luma < 38) {
      return {
        r: clampByte(r * 0.72 + 6),
        g: clampByte(g * 0.52 + 2),
        b: clampByte(b * 0.48 + 2),
        a,
      };
    }

    // 2. Sacred Vibhuti ash markings & bright specular highlights
    if (luma > 196 && chroma < 42) {
      return {
        r: clampByte(Math.min(255, luma * 1.12 + 24)),
        g: clampByte(Math.min(246, luma * 1.04 + 12)),
        b: clampByte(Math.min(218, luma * 0.88)),
        a,
      };
    }

    // 3. Crimson dhoti / blood-ribbon cloth (high red dominance)
    if (r - g > 24 && r > 75) {
      return {
        r: clampByte(r * 1.32 + 14),
        g: clampByte(g * 0.68),
        b: clampByte(b * 0.64),
        a,
      };
    }

    // 4. Pale grey/ashen skin & muscle tones -> Gleaming Oiled Bronze / Burnished Copper
    // Boost warm red/amber channels and cut cold blue/grey washout
    const sCurve = Math.pow(Math.max(0, Math.min(1, (luma - 30) / 185)), 0.92);
    const bronzeLuma = 34 + sCurve * 192;
    return {
      r: clampByte(bronzeLuma * 1.34 + 18),
      g: clampByte(bronzeLuma * 0.89 + 4),
      b: clampByte(bronzeLuma * 0.54 - 8),
      a,
    };
  }

  if (profile === 'dundubhi_chola') {
    if (luma < 42) {
      return {
        r: clampByte(r * 0.68 + 4),
        g: clampByte(g * 0.54 + 2),
        b: clampByte(b * 0.46),
        a,
      };
    }
    // Fiery rune/horn highlights
    if (r - b > 36 && luma > 125) {
      return {
        r: clampByte(r * 1.28 + 16),
        g: clampByte(g * 1.08 + 6),
        b: clampByte(b * 0.68),
        a,
      };
    }
    // Warm Chola-bronze hide & armor plates
    return {
      r: clampByte(r * 1.24 + 12),
      g: clampByte(g * 1.01 + 4),
      b: clampByte(b * 0.74 - 4),
      a,
    };
  }

  // 'vrikodara_crimson'
  if (luma < 44) {
    return {
      r: clampByte(r * 0.68 + 6),
      g: clampByte(g * 0.48),
      b: clampByte(b * 0.48),
      a,
    };
  }
  if (r - g > 20) {
    // Blood-crimson warlord plate & glowing fissures
    return {
      r: clampByte(r * 1.30 + 16),
      g: clampByte(g * 0.74),
      b: clampByte(b * 0.68),
      a,
    };
  }
  // Bone skull & brass trim
  return {
    r: clampByte(r * 1.20 + 12),
    g: clampByte(g * 1.04 + 6),
    b: clampByte(b * 0.78),
    a,
  };
}

/**
 * Applies `gradePixelToHadesPalette` to a loaded Three.js texture once at load time,
 * returning a crisp `THREE.CanvasTexture` with vibrant Hades pigments and dark ink crevices.
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
    // Cap regrade resolution to 1024x1024 so startup processing takes < 12ms
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
 * Quantizes continuous animation time and 360° yaw into discrete Hades 2D sprite-sheet steps
 * ("animated on twos" at 15 FPS for locomotion, 24 FPS for strikes, and 24 isometric directions).
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
  const fps = params.isAttacking ? 24 : 15;
  const quantizedTimeStep = Math.floor(Math.max(0, params.animTime) * fps);

  const dirSteps = 24;
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
 * Converts raw 3D WebGL character renders into Hades-grade 2D cel-shaded, ink-outlined
 * sprite frames and caches them in an LRU Sprite Sheet Atlas so repeated frames draw at 0ms cost.
 */
export class Hades2DSpriteBaker {
  private readonly size: number;
  private readonly inkCanvas: HTMLCanvasElement;
  private readonly inkCtx: CanvasRenderingContext2D | null;
  private readonly rimCanvas: HTMLCanvasElement;
  private readonly rimCtx: CanvasRenderingContext2D | null;
  private readonly cache = new Map<string, HTMLCanvasElement>();
  private readonly maxCacheFrames: number;
  private lastFrameKey = '';

  constructor(size: number, maxCacheFrames = 72) {
    this.size = size;
    this.maxCacheFrames = maxCacheFrames;

    this.inkCanvas = document.createElement('canvas');
    this.inkCanvas.width = size;
    this.inkCanvas.height = size;
    this.inkCtx = this.inkCanvas.getContext('2d');

    this.rimCanvas = document.createElement('canvas');
    this.rimCanvas.width = size;
    this.rimCanvas.height = size;
    this.rimCtx = this.rimCanvas.getContext('2d');
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
   * Stylizes the rendered 3D `webglCanvas` into a crisp 2D Hades sprite on `targetCanvas`
   * with:
   *  1. Bold 8-way dark charcoal-obsidian comic ink outline (`#120806`)
   *  2. Directional golden-amber / crimson rim-light edge highlight
   *  3. Boosted cel-shaded contrast & pigment saturation
   *  4. Grounded bottom-contact shadow gradient so feet blend into 2D stone floors
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
    const outCtx = targetCanvas.getContext('2d');
    if (!outCtx || !this.inkCtx || !this.rimCtx) return;

    const s = this.size;
    const outlinePx = options.outlinePx ?? 2.2;
    const rimColor = options.isHurt ? '#fff2d6' : options.rimColor ?? '#ffbe55';

    // 1. Prepare solid dark-ink silhouette stamp
    this.inkCtx.clearRect(0, 0, s, s);
    this.inkCtx.globalCompositeOperation = 'source-over';
    this.inkCtx.drawImage(webglCanvas, 0, 0, s, s);
    this.inkCtx.globalCompositeOperation = 'source-in';
    this.inkCtx.fillStyle = '#120806';
    this.inkCtx.fillRect(0, 0, s, s);

    // 2. Prepare directional warm firelight rim stamp
    this.rimCtx.clearRect(0, 0, s, s);
    this.rimCtx.globalCompositeOperation = 'source-over';
    this.rimCtx.drawImage(webglCanvas, 0, 0, s, s);
    this.rimCtx.globalCompositeOperation = 'source-in';
    this.rimCtx.fillStyle = rimColor;
    this.rimCtx.fillRect(0, 0, s, s);

    // 3. Composite onto output 2D Sprite Canvas
    outCtx.clearRect(0, 0, s, s);
    outCtx.save();

    // Pass A: 8-direction dark ink outer contour
    const diag = outlinePx * 0.74;
    const offsets: readonly [number, number][] = [
      [-outlinePx, 0],
      [outlinePx, 0],
      [0, -outlinePx],
      [0, outlinePx],
      [-diag, -diag],
      [diag, -diag],
      [-diag, diag],
      [diag, diag],
    ];
    for (const [dx, dy] of offsets) {
      outCtx.drawImage(this.inkCanvas, dx, dy);
    }

    // Pass B: Upper-left golden firelight rim highlight
    outCtx.globalAlpha = 0.88;
    outCtx.drawImage(this.rimCanvas, -1.35, -1.35);
    outCtx.globalAlpha = 1.0;

    // Pass C: High-contrast cel-shaded character body
    outCtx.filter = options.isHurt
      ? 'contrast(1.35) saturate(1.45) brightness(1.32)'
      : 'contrast(1.24) saturate(1.38) brightness(1.07)';
    outCtx.drawImage(webglCanvas, 0, 0, s, s);
    outCtx.filter = 'none';

    // Pass D: Subtle grounded foot-shadow gradient across lower 14% of sprite
    outCtx.globalCompositeOperation = 'source-atop';
    const footGrad = outCtx.createLinearGradient(0, s * 0.78, 0, s * 0.96);
    footGrad.addColorStop(0, 'rgba(18, 8, 6, 0)');
    footGrad.addColorStop(1, 'rgba(18, 8, 6, 0.42)');
    outCtx.fillStyle = footGrad;
    outCtx.fillRect(0, s * 0.78, s, s * 0.22);

    outCtx.restore();
    this.lastFrameKey = options.frameKey;

    // Cache into LRU Sprite Sheet Atlas if enabled
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
