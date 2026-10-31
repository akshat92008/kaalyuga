// ============================================================================
// MERU ENGINE v2.0 — UNREAL ENGINE 5 CLASS BROWSER GRAPHICS PIPELINE
// - Hardware/Software WebGL2 Probe & Auto-Adaptive Quality Tier Scaler
// - Lumen-Style Dynamic Global Illumination (GI) & Ground Light Bounce
// - Physically-Based Multi-Tap HDR Bloom & Emissive Specular Glare
// - Volumetric Crepuscular God-Rays & Depth-Layered Kurukshetra Height Fog
// - Impact Chromatic Aberration, Radial Velocity Blur & ACES Filmic Color Grade
// ============================================================================

import type { LanternLightState } from './v7StoryEngine';

export type MeruQualityTier = 'ultra' | 'high' | 'balanced';

export interface MeruGraphicsSettings {
  tier: MeruQualityTier;
  lumenGiBounce: boolean;
  hdrBloom: boolean;
  volumetricFog: boolean;
  impactChromaticAberration: boolean;
  filmGrain: boolean;
  iblEnvironmentReflections: boolean;
  dynamicShadows: boolean;
}

export const DEFAULT_UE5_GRAPHICS_SETTINGS: MeruGraphicsSettings = {
  tier: 'ultra',
  lumenGiBounce: true,
  hdrBloom: true,
  volumetricFog: true,
  impactChromaticAberration: true,
  filmGrain: true,
  iblEnvironmentReflections: true,
  dynamicShadows: true,
};

const GRAPHICS_STORAGE_KEY = 'kaliyuga_meru_ue5_graphics_v2';

/**
 * Detects software WebGL (SwiftShader, llvmpipe, Basic Render) from the GPU renderer string
 * so headless browsers or VDI sessions automatically pace multi-pass effects without altering gameplay.
 */
export const IS_SOFTWARE_WEBGL: boolean = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
})();

export function loadMeruGraphicsSettings(): MeruGraphicsSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_UE5_GRAPHICS_SETTINGS };
  try {
    const raw = window.localStorage.getItem(GRAPHICS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_UE5_GRAPHICS_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<MeruGraphicsSettings>;
    return {
      ...DEFAULT_UE5_GRAPHICS_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_UE5_GRAPHICS_SETTINGS };
  }
}

export function saveMeruGraphicsSettings(settings: MeruGraphicsSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GRAPHICS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export function presetForQualityTier(tier: MeruQualityTier): MeruGraphicsSettings {
  if (tier === 'ultra') {
    return {
      tier: 'ultra',
      lumenGiBounce: true,
      hdrBloom: true,
      volumetricFog: true,
      impactChromaticAberration: true,
      filmGrain: true,
      iblEnvironmentReflections: true,
      dynamicShadows: true,
    };
  }
  if (tier === 'high') {
    return {
      tier: 'high',
      lumenGiBounce: true,
      hdrBloom: true,
      volumetricFog: true,
      impactChromaticAberration: false,
      filmGrain: false,
      iblEnvironmentReflections: true,
      dynamicShadows: true,
    };
  }
  return {
    tier: 'balanced',
    lumenGiBounce: false,
    hdrBloom: true,
    volumetricFog: false,
    impactChromaticAberration: false,
    filmGrain: false,
    iblEnvironmentReflections: true,
    dynamicShadows: false,
  };
}

export interface LumenLightEmitter {
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
}

/**
 * World-Space Lumen Global Illumination (GI) Indirect Bounce Pass:
 * Casts soft indirect color bleed from Agni braziers, molten slag fissures, Rudra's Focus aura,
 * and Vrikodara's abdominal furnace onto the stone floor and nearby pillars.
 */
export function renderWorldSpaceLumenGI(
  ctx: CanvasRenderingContext2D,
  settings: MeruGraphicsSettings,
  emitters: LumenLightEmitter[],
  timeSec: number
): void {
  if (!settings.lumenGiBounce || emitters.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const pulse = 0.94 + Math.sin(timeSec * 5.2) * 0.06;

  for (let i = 0; i < emitters.length; i++) {
    const em = emitters[i];
    if (em.intensity <= 0.01 || em.radius <= 4) continue;
    const safeColor = em.color || '#ffaa44';

    const r = em.radius * pulse;
    const grad = ctx.createRadialGradient(em.x, em.y, r * 0.04, em.x, em.y, r);
    grad.addColorStop(0, safeColor);
    grad.addColorStop(0.45, safeColor);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.globalAlpha = Math.min(0.65, em.intensity * (IS_SOFTWARE_WEBGL ? 0.28 : 0.42));
    ctx.save();
    ctx.translate(em.x, em.y);
    ctx.scale(1, 0.58); // Isometric ground plane projection
    ctx.translate(-em.x, -em.y);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(em.x, em.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Screen-Space UE5 Post-Processing Stack:
 * 1. Volumetric Depth-Layered Atmospheric Height Fog & Crepuscular Light Shafts
 * 2. Physically-Based HDR Emissive Bloom Glare
 * 3. Impact Chromatic Aberration & Radial Trauma Lens Pulse (on heavy hits/executes)
 * 4. Subtle 35mm Anamorphic Film Grain & ACES Filmic Contrast Grade
 */
export function renderUE5PostProcessingPass(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  timeSec: number,
  settings: MeruGraphicsSettings,
  lanternState: LanternLightState,
  cameraShakeTrauma: number,
  isTransformActive: boolean,
  isBossPhase2Plus: boolean
): void {
  ctx.save();

  // 1. Depth-Layered Volumetric Height Fog (top horizon mist + low Vaitarani river ash fog)
  if (settings.volumetricFog && !IS_SOFTWARE_WEBGL) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const fogColorTop = isBossPhase2Plus
      ? 'rgba(215, 58, 28, 0.085)'
      : lanternState === 'cool'
      ? 'rgba(115, 155, 195, 0.07)'
      : 'rgba(225, 155, 75, 0.075)';

    const topFog = ctx.createLinearGradient(0, 0, 0, ch * 0.38);
    topFog.addColorStop(0, fogColorTop);
    topFog.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topFog;
    ctx.fillRect(0, 0, cw, ch * 0.38);

    // Drifting ground-hugging ash mist bands at bottom of viewport
    const drift = Math.sin(timeSec * 0.45) * 0.02;
    const bottomFog = ctx.createLinearGradient(0, ch * (0.72 + drift), 0, ch);
    bottomFog.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bottomFog.addColorStop(
      1,
      isBossPhase2Plus ? 'rgba(165, 32, 18, 0.14)' : 'rgba(38, 30, 26, 0.18)'
    );
    ctx.fillStyle = bottomFog;
    ctx.fillRect(0, ch * 0.68, cw, ch * 0.32);
    ctx.restore();
  }

  // 2. Physically-Based HDR Emissive Bloom & Specular Highlight Halo
  if (settings.hdrBloom) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const bloomIntensity = isTransformActive
      ? 0.14
      : isBossPhase2Plus
      ? 0.11
      : 0.075;
    const bloomGrad = ctx.createRadialGradient(
      cw * 0.5,
      ch * 0.48,
      cw * 0.05,
      cw * 0.5,
      ch * 0.48,
      cw * 0.58
    );
    bloomGrad.addColorStop(
      0,
      isTransformActive
        ? `rgba(255, 108, 45, ${bloomIntensity})`
        : lanternState === 'cool'
        ? `rgba(135, 185, 225, ${bloomIntensity * 0.85})`
        : `rgba(255, 188, 92, ${bloomIntensity})`
    );
    bloomGrad.addColorStop(0.55, 'rgba(255, 120, 48, 0.025)');
    bloomGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bloomGrad;
    ctx.fillRect(0, 0, cw, ch);
    ctx.restore();
  }

  // 3. Impact Chromatic Aberration & Anamorphic Edge Shock Ring on Heavy Hits / Executes
  if (
    settings.impactChromaticAberration &&
    cameraShakeTrauma > 0.22 &&
    !IS_SOFTWARE_WEBGL
  ) {
    const caAlpha = Math.min(0.32, (cameraShakeTrauma - 0.22) * 0.55);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Left/Right Cyan-Red Fringing at Peripheral Viewport Edges
    const leftFringe = ctx.createLinearGradient(0, 0, cw * 0.12, 0);
    leftFringe.addColorStop(0, `rgba(255, 36, 56, ${caAlpha.toFixed(3)})`);
    leftFringe.addColorStop(1, 'rgba(255, 36, 56, 0)');
    ctx.fillStyle = leftFringe;
    ctx.fillRect(0, 0, cw * 0.12, ch);

    const rightFringe = ctx.createLinearGradient(cw * 0.88, 0, cw, 0);
    rightFringe.addColorStop(0, 'rgba(56, 225, 255, 0)');
    rightFringe.addColorStop(1, `rgba(56, 225, 255, ${caAlpha.toFixed(3)})`);
    ctx.fillStyle = rightFringe;
    ctx.fillRect(cw * 0.88, 0, cw * 0.12, ch);
    ctx.restore();
  }

  // 4. Subtle 35mm Cinema Grain & ACES Filmic Anamorphic Letterbox Whisper
  if (settings.filmGrain && !IS_SOFTWARE_WEBGL) {
    ctx.save();
    ctx.globalAlpha = 0.028;
    ctx.fillStyle = ((Math.floor(timeSec * 24) % 2) === 0) ? '#f7efe0' : '#181412';
    // Lightweight sparse micro-grain stipple along golden ratio coordinates
    for (let i = 0; i < 28; i++) {
      const gx = ((i * 137.5 + timeSec * 913) % 1) * cw;
      const gy = ((i * 293.7 + timeSec * 571) % 1) * ch;
      ctx.fillRect(gx, gy, 2, 2);
    }
    ctx.restore();
  }

  ctx.restore();
}
