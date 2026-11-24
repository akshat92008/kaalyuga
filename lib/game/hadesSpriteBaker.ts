import * as THREE from 'three';
import { attachSumiInkOutlines, liftTextureToAnimeVibrancy } from './demonSlayerShader';

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
    const w = Math.min(512, img.width);
    const h = Math.min(512, img.height);
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
 * Quantizes continuous animation time and 360° yaw into bounded cyclic Hades 2D sprite-sheet steps
 * so every character animation loop hits the GPU-baked frame cache after 1 cycle with zero stutter.
 */
export function computeSpriteSheetFrameKey(params: {
  id: string;
  animName: string;
  animTime: number;
  clipDuration?: number;
  yawRad: number;
  isAttacking: boolean;
  isHurt: boolean;
  isParrying: boolean;
  phase?: number;
  yawDirections?: number;
  stepsPerClip?: number;
}): {
  frameKey: string;
  quantizedYaw: number;
  quantizedTimeStep: number;
} {
  const dur = Math.max(0.2, params.clipDuration ?? 1.0);
  const steps = Math.max(6, params.stepsPerClip ?? (params.isAttacking ? 60 : 30));
  const normPhase = ((Math.max(0, params.animTime) % dur) / dur);
  const quantizedTimeStep = Math.min(steps - 1, Math.floor(normPhase * steps));

  const dirSteps = Math.max(8, params.yawDirections ?? 36);
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
   * with crisp #120806 silhouette outline and clean color-true sRGB diffuse rendering.
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
    if (!outCtx) return;

    const baked = bake2DSpriteFrameFromCanvas(webglCanvas, options.frameKey, {
      outlineColor: '#120806',
      outlineThickness: options.outlinePx ?? 2,
      hitFlash: Boolean(options.isHurt),
      cacheFrame: options.cacheFrame,
    });
    outCtx.clearRect(0, 0, this.size, this.size);
    outCtx.drawImage(baked, 0, 0, this.size, this.size);
    this.lastFrameKey = options.frameKey;
  }
}

export const BASE_CAMERA_ZOOM = 0.96;
export const SHARED_STUDIO_OUTLINE_COLOR = '#120806';
export const SHARED_STUDIO_OUTLINE_THICKNESS = 2.0;

export type SilhouetteRole = 'rudra' | 'regular_enemy' | 'regular_enemy_crimson' | 'boss';

export interface SilhouetteRoleSpec {
  role: SilhouetteRole;
  rimHex: string;
  rimRgba: string;
  outlineColor: string;
  outlineThickness: number;
  scaleAuthorityMin: number;
  scaleAuthorityMax: number;
  footContactRingHex: string | null;
}

export const SILHOUETTE_ROLE_PRESETS: Record<SilhouetteRole, SilhouetteRoleSpec> = {
  rudra: {
    role: 'rudra',
    rimHex: '#ffe4b8',
    rimRgba: 'rgba(255, 228, 184, 0.34)',
    outlineColor: SHARED_STUDIO_OUTLINE_COLOR,
    outlineThickness: 2.2,
    scaleAuthorityMin: 1.0,
    scaleAuthorityMax: 1.0,
    footContactRingHex: '#eab308',
  },
  regular_enemy: {
    role: 'regular_enemy',
    rimHex: '#ffe6be',
    rimRgba: 'rgba(255, 230, 190, 0.34)',
    outlineColor: '#080509',
    outlineThickness: 2.35,
    scaleAuthorityMin: 1.0,
    scaleAuthorityMax: 1.12,
    footContactRingHex: null,
  },
  regular_enemy_crimson: {
    role: 'regular_enemy_crimson',
    rimHex: '#fde68a',
    rimRgba: 'rgba(253, 230, 138, 0.38)',
    outlineColor: '#080509',
    outlineThickness: 2.55,
    scaleAuthorityMin: 1.0,
    scaleAuthorityMax: 1.12,
    footContactRingHex: null,
  },
  boss: {
    role: 'boss',
    rimHex: '#ffe2ad',
    rimRgba: 'rgba(255, 226, 173, 0.40)',
    outlineColor: '#080509',
    outlineThickness: 2.55,
    scaleAuthorityMin: 1.75,
    scaleAuthorityMax: 2.35,
    footContactRingHex: '#f59e0b',
  },
};

export const BOSS_SCALE_AUTHORITY = {
  semi_boss: 1.75,
  dundubhi: 2.15,
  vrikodara: 2.35,
} as const;

export function getSilhouetteSpecForRole(role: SilhouetteRole): SilhouetteRoleSpec {
  return SILHOUETTE_ROLE_PRESETS[role];
}

export interface SharedStudioRigLights {
  ambient: THREE.HemisphereLight | THREE.AmbientLight;
  keyLight: THREE.DirectionalLight;
  fillLight: THREE.DirectionalLight;
  rimLight: THREE.DirectionalLight;
}

let sharedStudioWebGLRenderer: THREE.WebGLRenderer | null = null;
let cachedIsSoftwareWebGL: boolean | null = null;

/**
 * Detects CPU/software WebGL backends (SwiftShader, llvmpipe, Microsoft Basic Render)
 * so background atlas prewarming can yield gracefully and never stall the browser main thread.
 */
export function isSoftwareWebGLRenderer(): boolean {
  if (cachedIsSoftwareWebGL !== null) return cachedIsSoftwareWebGL;
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    if (sharedStudioWebGLRenderer) {
      gl = sharedStudioWebGLRenderer.getContext();
    } else {
      const probe = document.createElement('canvas');
      gl =
        (probe.getContext('webgl2') as WebGL2RenderingContext | null) ||
        (probe.getContext('webgl') as WebGLRenderingContext | null);
    }
    if (!gl) return false;
    let rendererStr = String(gl.getParameter(gl.RENDERER) || '');
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      const unmasked = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
      if (unmasked) rendererStr += ' ' + String(unmasked);
    }
    cachedIsSoftwareWebGL = /swiftshader|llvmpipe|software|microsoft basic render|angle \(google/i.test(
      rendererStr
    );
  } catch {
    cachedIsSoftwareWebGL = false;
  }
  return cachedIsSoftwareWebGL;
}

/**
 * Returns a single shared offscreen WebGLRenderer used across Rudra3DRenderer,
 * Enemy3DRenderer, and Boss3DRenderer so all 3D models share one WebGL context,
 * identical color-space/tone-mapping settings, and zero multi-context GPU overhead.
 */
export function getSharedStudioWebGLRenderer(size: number): THREE.WebGLRenderer | null {
  if (typeof window === 'undefined') return null;
  if (!sharedStudioWebGLRenderer) {
    try {
      sharedStudioWebGLRenderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
      sharedStudioWebGLRenderer.setPixelRatio(1);
      sharedStudioWebGLRenderer.outputColorSpace = THREE.SRGBColorSpace;
      sharedStudioWebGLRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      sharedStudioWebGLRenderer.toneMappingExposure = 1.24;
      sharedStudioWebGLRenderer.shadowMap.enabled = false;
      sharedStudioWebGLRenderer.setClearColor(0x000000, 0);
      cachedIsSoftwareWebGL = null;
      isSoftwareWebGLRenderer();
    } catch (e) {
      console.warn('[SharedStudioWebGLRenderer] WebGL initialization skipped:', e);
      sharedStudioWebGLRenderer = null;
      return null;
    }
  }
  const currentSize = new THREE.Vector2();
  sharedStudioWebGLRenderer.getSize(currentSize);
  if (currentSize.x !== size || currentSize.y !== size) {
    sharedStudioWebGLRenderer.setSize(size, size, false);
  }
  return sharedStudioWebGLRenderer;
}

/**
 * Attaches the Demon Slayer / KaalyugaStage Studio Key / Fill / Rim Lighting Rig to any
 * 3D character or boss scene so Rudra, Enemies, and Bosses share vivid anime cel-shading
 * and strong warm-vs-cool silhouette separation.
 */
export function setupSharedStudioLightingRig(
  scene: THREE.Scene,
  distanceScale = 1.0
): SharedStudioRigLights {
  const ambient = new THREE.HemisphereLight(0xdce6ff, 0x5c4a3e, 1.36);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.25);
  keyLight.position.set(3.0 * distanceScale, 5.2 * distanceScale, 4.0 * distanceScale);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xc2d4f2, 0.78);
  fillLight.position.set(-3.2 * distanceScale, 2.4 * distanceScale, 2.0 * distanceScale);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffe8c2, 1.05);
  rimLight.position.set(0.0, 3.6 * distanceScale, -3.8 * distanceScale);
  scene.add(rimLight);

  return { ambient, keyLight, fillLight, rimLight };
}

/**
 * Computes the cohesive dark-ash/ember floor color-grading stops for each chamber
 * so walkable stone floors stay in the 30-40% value range while characters and
 * crimson/gold telegraphs pop cleanly.
 */
export function computeArenaFloorGradeSpec(chamberIndex: number): {
  multiplyInner: string;
  multiplyMid: string;
  multiplyOuter: string;
  ashVeilColor: string;
  ashTintOverlay: string;
  vignetteCenter: string;
  vignetteInner: string;
  vignetteMid: string;
  vignetteEdge: string;
  vignetteOuter: string;
} {
  const isBrightSandstone = chamberIndex === 0 || chamberIndex === 2 || chamberIndex === 5;
  const ashColor = isBrightSandstone ? 'rgba(18, 13, 15, 0.28)' : 'rgba(14, 10, 12, 0.22)';
  const vigInner = isBrightSandstone ? 'rgba(16, 9, 11, 0.20)' : 'rgba(12, 7, 9, 0.14)';
  const vigOuter = 'rgba(6, 3, 5, 0.72)';
  return {
    multiplyInner: isBrightSandstone ? 'rgba(116, 90, 74, 0.94)' : 'rgba(136, 108, 92, 0.94)',
    multiplyMid: isBrightSandstone ? 'rgba(78, 56, 46, 0.96)' : 'rgba(92, 68, 58, 0.96)',
    multiplyOuter: 'rgba(34, 20, 18, 0.98)',
    ashVeilColor: ashColor,
    ashTintOverlay: ashColor,
    vignetteCenter: vigInner,
    vignetteInner: vigInner,
    vignetteMid: 'rgba(12, 6, 8, 0.38)',
    vignetteEdge: vigOuter,
    vignetteOuter: vigOuter,
  };
}

/**
 * Applies Ufotable / Demon Slayer cel-step shading, wide Fresnel rim-light,
 * self-lit emissiveMap warmth, and anime gamma vibrancy lift (`pow(c, 0.70) * 1.34` + `1.38x` saturation)
 * while strictly preserving PBR normal/roughness/metalness 1.0 scalar bindings on MeshStandardMaterial.
 */
export function applyHadesCelShadingToHierarchy(
  root: THREE.Object3D,
  options?: {
    rimColor?: number;
    rimIntensity?: number;
    emissiveTint?: number;
    emissiveStrength?: number;
    attachInkOutline?: boolean;
    outlineRatio?: number;
  }
): void {
  const rimHex = options?.rimColor ?? 0xffe4b8;
  const rimStr = Math.min(0.42, Math.max(0.18, options?.rimIntensity ?? 0.30));
  const emissiveHex = options?.emissiveTint ?? 0x262220;
  const emissiveStr = Math.min(0.30, Math.max(0.18, options?.emissiveStrength ?? 0.24));

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh || child.userData?.isInkOutline) return;
    const mesh = child as THREE.Mesh;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    const updated = mats.map((m) => {
      if (!m) return m;
      const std = m as THREE.MeshStandardMaterial & THREE.MeshToonMaterial;
      if ('roughness' in std) {
        std.roughness = std.roughnessMap ? 1.0 : 0.84;
      }
      if ('metalness' in std) {
        std.metalness = std.metalnessMap ? 1.0 : 0.08;
      }
      if ('envMapIntensity' in std) {
        std.envMapIntensity = std.metalnessMap ? 0.35 : 0.0;
      }

      if (std.map && !std.map.userData?.animeLifted && typeof document !== 'undefined') {
        const lifted = liftTextureToAnimeVibrancy(std.map, 1.18, 1.12);
        if (lifted) {
          lifted.userData.animeLifted = true;
          std.map = lifted;
        }
      }

      if ('emissive' in std && std.emissive) {
        std.emissive.setHex(emissiveHex);
        std.emissiveIntensity = emissiveStr;
        if (std.map) {
          std.emissiveMap = std.map;
        }
      }

      if (std.userData?.celUniforms) {
        std.userData.celUniforms.uRimColor.value.setHex(rimHex);
        std.userData.celUniforms.uRimStrength.value = rimStr;
      } else if (!std.userData.celHooked) {
        const celUniforms = {
          uRimColor: { value: new THREE.Color(rimHex) },
          uRimStrength: { value: rimStr },
          uRimPower: { value: 3.1 },
          uFlashColor: { value: new THREE.Color(0xfff3d1) },
          uFlashMix: { value: 0.0 },
        };
        std.userData.celUniforms = celUniforms;
        std.userData.celHooked = true;
        std.onBeforeCompile = (shader) => {
          shader.uniforms.uRimColor = celUniforms.uRimColor;
          shader.uniforms.uRimStrength = celUniforms.uRimStrength;
          shader.uniforms.uRimPower = celUniforms.uRimPower;
          shader.uniforms.uFlashColor = celUniforms.uFlashColor;
          shader.uniforms.uFlashMix = celUniforms.uFlashMix;

          shader.fragmentShader =
            `
            uniform vec3 uRimColor;
            uniform float uRimStrength;
            uniform float uRimPower;
            uniform vec3 uFlashColor;
            uniform float uFlashMix;
            ` +
            shader.fragmentShader
              .replace(
                '#include <metalnessmap_fragment>',
                `
                #include <metalnessmap_fragment>
                metalnessFactor = min(metalnessFactor, 0.08);
                `
              )
              .replace(
                '#include <lights_fragment_end>',
                `
                #include <lights_fragment_end>
                float celLum = dot(reflectedLight.directDiffuse, vec3(0.299, 0.587, 0.114));
                float celTargetLum = celLum > 0.42 ? 1.04 : (celLum > 0.16 ? 0.82 : 0.60);
                vec3 celChroma = reflectedLight.directDiffuse / max(celLum, 0.04);
                vec3 celQuant = celLum > 0.004 ? celChroma * min(celTargetLum, celLum * 1.18 + 0.24) : vec3(0.0);
                reflectedLight.directDiffuse = mix(
                  reflectedLight.directDiffuse,
                  celQuant,
                  0.92
                );
                `
              )
              .replace(
                '#include <dithering_fragment>',
                `
                vec3 celViewDir = normalize(vViewPosition);
                float celNdotV = clamp(dot(normalize(vNormal), celViewDir), 0.0, 1.0);
                float celRimRaw = pow(1.0 - celNdotV, uRimPower);
                float celRimStep = smoothstep(0.56, 0.78, celRimRaw);
                gl_FragColor.rgb = gl_FragColor.rgb * 1.04 + uRimColor * celRimStep * uRimStrength;
                gl_FragColor.rgb = mix(gl_FragColor.rgb, uFlashColor, clamp(uFlashMix * (0.45 + 0.55 * celRimStep), 0.0, 0.85));
                #include <dithering_fragment>
                `
              );
        };
        std.customProgramCacheKey = () => 'kaliyuga-ufotable-cel-std-v6';
      }

      std.needsUpdate = true;
      return std;
    });

    mesh.material = Array.isArray(mesh.material) ? updated : updated[0];
  });

  if (
    options?.attachInkOutline === true &&
    !isSoftwareWebGLRenderer() &&
    !root.userData?.inkOutlinesAttached
  ) {
    root.userData.inkOutlinesAttached = true;
    attachSumiInkOutlines(root, options?.outlineRatio ?? 0.005, 0x080509);
  }
}

const sharedFrameCache = new Map<string, HTMLCanvasElement>();
let sharedSilhouetteCanvas: HTMLCanvasElement | null = null;
let sharedSilhouetteCtx: CanvasRenderingContext2D | null = null;

export function clearSharedSpriteFrameCache(): void {
  sharedFrameCache.clear();
}

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
 * Hades-style 2D sprite with unified #120806 dark comic-ink silhouette outlines, role-tuned directional
 * rim highlight (#ffb347 Rudra, #94a3b8/#ef4444 Regular Enemies, #ff5a1f Bosses/Semi-Boss),
 * and controlled warm amber-gold hit-flash sheen that preserves 3D armor detail.
 */
export function bake2DSpriteFrameFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  cacheKey: string,
  options?: {
    role?: SilhouetteRole;
    rimColor?: string;
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

  const rolePreset = options?.role ? SILHOUETTE_ROLE_PRESETS[options.role] : undefined;
  const thickness =
    options?.outlineThickness ?? rolePreset?.outlineThickness ?? SHARED_STUDIO_OUTLINE_THICKNESS;
  const outlineColor =
    options?.outlineColor ?? rolePreset?.outlineColor ?? SHARED_STUDIO_OUTLINE_COLOR;
  const rimHighlightStyle = options?.hitFlash
    ? 'rgba(255, 214, 112, 0.85)'
    : options?.rimColor ?? rolePreset?.rimRgba ?? SILHOUETTE_ROLE_PRESETS.rudra.rimRgba;
  const rimOffset = -0.95;

  // 1. Draw crisp 2D anime Sumi-e black ink outline using GPU-composited offsets (clean ink edge, zero red halo smear)
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
      [-thickness * 0.72, -thickness * 0.72],
      [thickness * 0.72, -thickness * 0.72],
      [-thickness * 0.72, thickness * 0.72],
      [thickness * 0.72, thickness * 0.72],
    ];
    for (let i = 0; i < offsets.length; i++) {
      ctx.drawImage(silhouetteCanvas, offsets[i][0], offsets[i][1], w, h);
    }

    // Subtle crisp 1px top-left anime edge highlight (never a glowing crimson/wine ring)
    sCtx.globalCompositeOperation = 'source-in';
    sCtx.fillStyle = rimHighlightStyle;
    sCtx.fillRect(0, 0, w, h);
    ctx.drawImage(silhouetteCanvas, rimOffset, rimOffset, w, h);
  }

  // 2. Draw crisp cel-shaded 2D anime sprite cleanly over the Sumi-e ink outline
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(sourceCanvas, 0, 0, w, h);

  // 3. Apply controlled warm amber-gold emissive sheen when struck (never opaque #FFFFFF chalk)
  if (options?.hitFlash) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255, 184, 71, 0.34)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  if (options?.cacheFrame !== false) {
    if (sharedFrameCache.size > 64) {
      const oldest = sharedFrameCache.keys().next().value;
      if (oldest) sharedFrameCache.delete(oldest);
    }
    sharedFrameCache.set(cacheKey, outCanvas);
  }

  return outCanvas;
}
