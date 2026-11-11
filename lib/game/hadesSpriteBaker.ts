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
   * Stylizes the rendered 3D `webglCanvas` into a crisp 2D Hades sprite on `targetCanvas`
   * with:
   *  1. Clean 8-way dark obsidian comic ink contour (`#0d080b`)
   *  2. Crisp original colors without warm yellow-orange rim smears or oiled specular wash
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
    if (!outCtx || !this.inkCtx) return;

    const s = this.size;
    const outlinePx = Math.min(1.65, options.outlinePx ?? 1.5);

    // 1. Prepare solid dark-ink silhouette stamp
    this.inkCtx.clearRect(0, 0, s, s);
    this.inkCtx.globalCompositeOperation = 'source-over';
    this.inkCtx.drawImage(webglCanvas, 0, 0, s, s);
    this.inkCtx.globalCompositeOperation = 'source-in';
    this.inkCtx.fillStyle = '#0d080b';
    this.inkCtx.fillRect(0, 0, s, s);

    // 2. Composite onto output 2D Sprite Canvas
    outCtx.clearRect(0, 0, s, s);
    outCtx.save();

    // Pass A: Crisp 8-direction dark ink outer contour
    const diag = outlinePx * 0.72;
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

    // Pass B: Crisp character body preserving original hues
    outCtx.filter = options.isHurt
      ? 'contrast(1.22) saturate(1.18) brightness(1.35)'
      : 'contrast(1.08) saturate(1.10) brightness(1.02)';
    outCtx.drawImage(webglCanvas, 0, 0, s, s);
    outCtx.filter = 'none';

    outCtx.restore();
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
