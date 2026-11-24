import * as THREE from 'three';
import { ELEMENTAL_CREST_GLSL } from './elementalCrestShaders';
import { AGNI_PAINTERLY_GLSL } from './agniPainterlyShaders';
import { sampleElementalStroke, type ElementalStroke } from './elementalStrokeGeometry';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { isSoftwareWebGLRenderer } from './hadesSpriteBaker';
import {
  getOrCreatePainterlyVfxAtlas,
  PainterlyVfxAtlas,
} from './painterlyVfxAtlas';
import {
  ArenaBladeSample,
  classifyBladeTrailStep,
  writeSweptBladeRibbonBuffers,
} from './bladeTrailSampler';

export type DemonSlayerVfxPalette =
  | 'hinokami'
  | 'sun'
  | 'water'
  | 'thunder'
  | 'wind'
  | 'blood'
  | 'void'
  | 'magma'
  | 'bronze';

export type VfxQualityPreset = 'performance' | 'balanced' | 'cinematic';

export type ElementalParticleKind =
  | 'spark_needle'
  | 'water_droplet'
  | 'rock_shard'
  | 'wind_shard'
  | 'soot_flake'
  | 'dust_mote';

export interface VfxTelemetrySnapshot {
  qualityPreset: VfxQualityPreset;
  isSoftwareGl: boolean;
  activeRibbons: number;
  activeBladeTrails: number;
  activeParticles: number;
  maxParticles: number;
  activeFloorEffects: number;
  activeBackEffects: number;
  drawCalls: number;
}

interface RibbonPaletteColors {
  core: THREE.Color;
  mid: THREE.Color;
  edge: THREE.Color;
  deep: THREE.Color;
  ink: THREE.Color;
  glow: THREE.Color;
}

const RIBBON_PALETTES: Record<DemonSlayerVfxPalette, RibbonPaletteColors> = {
  hinokami: {
    core: new THREE.Color('#fffbe0'),
    mid: new THREE.Color('#ffaa12'),
    edge: new THREE.Color('#ee2800'),
    deep: new THREE.Color('#7a0c02'),
    ink: new THREE.Color('#120605'),
    glow: new THREE.Color('#ff6c08'),
  },
  sun: {
    core: new THREE.Color('#ffffff'),
    mid: new THREE.Color('#ffd633'),
    edge: new THREE.Color('#f53200'),
    deep: new THREE.Color('#801000'),
    ink: new THREE.Color('#100604'),
    glow: new THREE.Color('#ff7b00'),
  },
  water: {
    core: new THREE.Color('#ffffff'),
    mid: new THREE.Color('#42f2ff'),
    edge: new THREE.Color('#0a74e6'),
    deep: new THREE.Color('#042a63'),
    ink: new THREE.Color('#030b1e'),
    glow: new THREE.Color('#20ccff'),
  },
  thunder: {
    core: new THREE.Color('#ffffff'),
    mid: new THREE.Color('#ffea3d'),
    edge: new THREE.Color('#38e8ff'),
    deep: new THREE.Color('#d98800'),
    ink: new THREE.Color('#100c04'),
    glow: new THREE.Color('#ffd824'),
  },
  wind: {
    core: new THREE.Color('#ecfff6'),
    mid: new THREE.Color('#22f58a'),
    edge: new THREE.Color('#068c5c'),
    deep: new THREE.Color('#043f2d'),
    ink: new THREE.Color('#05120c'),
    glow: new THREE.Color('#12c97a'),
  },
  blood: {
    core: new THREE.Color('#ffe4ec'),
    mid: new THREE.Color('#ff1744'),
    edge: new THREE.Color('#88001f'),
    deep: new THREE.Color('#3d000f'),
    ink: new THREE.Color('#0d0205'),
    glow: new THREE.Color('#ff1f5a'),
  },
  void: {
    core: new THREE.Color('#ffd6f5'),
    mid: new THREE.Color('#e11d74'),
    edge: new THREE.Color('#4b0c3b'),
    deep: new THREE.Color('#21051a'),
    ink: new THREE.Color('#0a0208'),
    glow: new THREE.Color('#ff2478'),
  },
  magma: {
    core: new THREE.Color('#fff4c4'),
    mid: new THREE.Color('#ff6a18'),
    edge: new THREE.Color('#a31808'),
    deep: new THREE.Color('#4a0b04'),
    ink: new THREE.Color('#120705'),
    glow: new THREE.Color('#ff4818'),
  },
  bronze: {
    core: new THREE.Color('#ffffff'),
    mid: new THREE.Color('#38e8ff'),
    edge: new THREE.Color('#0284c7'),
    deep: new THREE.Color('#06284d'),
    ink: new THREE.Color('#04101f'),
    glow: new THREE.Color('#00d4ff'),
  },
};

const QUALITY_PARTICLE_CAP: Record<VfxQualityPreset, number> = {
  performance: 96,
  balanced: 180,
  cinematic: 260,
};

const QUALITY_PIXEL_RATIO: Record<VfxQualityPreset, number> = {
  performance: 0.9,
  balanced: 1.15,
  cinematic: 1.4,
};

export interface ZigzagPoint2D {
  x: number;
  y: number;
}

/**
 * Pure deterministic generator for Zenitsu-style angular geometric Thunderclap zigzag vertices.
 */
export function computeThunderZigzagVertices(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  segments = 5,
  amplitude = 46,
  seed = 1
): ZigzagPoint2D[] {
  const safeSegs = Math.max(2, Math.min(12, Math.round(segments)));
  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / dist;
  const ny = dx / dist;

  const pts: ZigzagPoint2D[] = [{ x: startX, y: startY }];
  for (let i = 1; i < safeSegs; i++) {
    const t = i / safeSegs;
    const sign = i % 2 === 0 ? 1 : -1;
    const jitter = 0.72 + (((Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453) % 1) + 1) * 0.28;
    const offset = sign * amplitude * jitter * Math.sin(t * Math.PI);
    pts.push({
      x: startX + dx * t + nx * offset,
      y: startY + dy * t + ny * offset,
    });
  }
  pts.push({ x: endX, y: endY });
  return pts;
}

/**
 * Pure deterministic generator for 3-5 forked secondary Zenitsu crackling lightning arcs
 * strictly anchored at the exact `(x, y)` interior elbow vertices of the primary lightning bolt.
 */
export function computeThunderForkedBranches(
  mainPts: ZigzagPoint2D[],
  seed = 1,
  focused = false,
): ZigzagPoint2D[][] {
  if (mainPts.length < 3) return [];
  const branches: ZigzagPoint2D[][] = [];
  const first = mainPts[0];
  const last = mainPts[mainPts.length - 1];
  const totalLen = Math.max(40, Math.hypot(last.x - first.x, last.y - first.y));

  for (let i = 1; i < mainPts.length - 1; i++) {
    const origin = mainPts[i];
    const prev = mainPts[i - 1];
    const next = mainPts[i + 1];
    const baseAngle = Math.atan2(next.y - prev.y, next.x - prev.x);
    const side = i % 2 === 0 ? 1 : -1;
    const h = Math.abs(Math.sin(i * 31.7 + seed * 17.3));
    const branchAngle = baseAngle + side * (focused ? 0.27 + h * 0.38 : 0.46 + h * 0.52);
    const branchLen = totalLen * (focused ? 0.15 + h * 0.14 : 0.26 + h * 0.22);
    const endX = origin.x + Math.cos(branchAngle) * branchLen;
    const endY = origin.y + Math.sin(branchAngle) * branchLen;
    branches.push(
      computeThunderZigzagVertices(
        origin.x, origin.y, endX, endY, 3, focused ? 5 + h * 8 : 16 + h * 14, seed + i * 7,
      )
    );
  }
  return branches;
}

/**
 * Builds a single continuous miter-joined tapered lightning ribbon along a polyline
 * (eliminates disconnected box seams and gives clean whip-tapered anime plasma flow).
 */
export function buildTaperedThunderRibbonGeometry(
  pts: ZigzagPoint2D[],
  startWidth: number,
  endWidth: number,
  zOffset = 18
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  if (pts.length < 2) {
    const empty = new THREE.BufferGeometry();
    empty.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    empty.setAttribute('uv', new THREE.Float32BufferAttribute([], 2));
    return empty;
  }

  const cumLen: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    cumLen.push(cumLen[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  const totalLen = Math.max(1, cumLen[cumLen.length - 1]);

  for (let i = 0; i < pts.length; i++) {
    const u = cumLen[i] / totalLen;
    const cur = pts[i];
    let nx = 0;
    let ny = 1;
    let miterScale = 1;

    if (i === 0) {
      const dx = pts[1].x - cur.x;
      const dy = pts[1].y - cur.y;
      const len = Math.max(0.001, Math.hypot(dx, dy));
      nx = -dy / len;
      ny = dx / len;
    } else if (i === pts.length - 1) {
      const dx = cur.x - pts[i - 1].x;
      const dy = cur.y - pts[i - 1].y;
      const len = Math.max(0.001, Math.hypot(dx, dy));
      nx = -dy / len;
      ny = dx / len;
    } else {
      const d1x = cur.x - pts[i - 1].x;
      const d1y = cur.y - pts[i - 1].y;
      const l1 = Math.max(0.001, Math.hypot(d1x, d1y));
      const n1x = -d1y / l1;
      const n1y = d1x / l1;

      const d2x = pts[i + 1].x - cur.x;
      const d2y = pts[i + 1].y - cur.y;
      const l2 = Math.max(0.001, Math.hypot(d2x, d2y));
      const n2x = -d2y / l2;
      const n2y = d2x / l2;

      const mx = n1x + n2x;
      const my = n1y + n2y;
      const mLen = Math.hypot(mx, my);
      if (mLen > 0.05) {
        nx = mx / mLen;
        ny = my / mLen;
        const dot = Math.max(0.45, nx * n1x + ny * n1y);
        miterScale = Math.min(1.65, 1 / dot);
      } else {
        nx = n1x;
        ny = n1y;
      }
    }

    const widthCurve = startWidth + (endWidth - startWidth) * Math.pow(u, 0.82);
    const halfW = Math.max(1.5, widthCurve * 0.5) * miterScale;

    positions.push(cur.x - nx * halfW, cur.y - ny * halfW, zOffset);
    positions.push(cur.x + nx * halfW, cur.y + ny * halfW, zOffset);
    uvs.push(u, 0);
    uvs.push(u, 1);

    if (i < pts.length - 1) {
      const b = i * 2;
      indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a sharp multi-point anime comic starburst polygon (e.g. 8- or 12-point clash burst).
 */
export function buildStarburstPolygonGeometry(
  points = 8,
  outerRadius = 42,
  innerRadius = 11
): THREE.BufferGeometry {
  const safePts = Math.max(4, Math.min(16, Math.round(points)));
  const positions: number[] = [0, 0, 0];
  const indices: number[] = [];

  for (let i = 0; i < safePts * 2; i++) {
    const a = (i / (safePts * 2)) * Math.PI * 2;
    const isOuter = i % 2 === 0;
    const spikeMul = isOuter ? (i % 4 === 0 ? 1.18 : 0.84) : 1.0;
    const r = (isOuter ? outerRadius : innerRadius) * spikeMul;
    positions.push(Math.cos(a) * r, Math.sin(a) * r, 0);
  }

  const ringCount = safePts * 2;
  for (let i = 0; i < ringCount; i++) {
    const cur = i + 1;
    const next = ((i + 1) % ringCount) + 1;
    indices.push(0, cur, next);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a razor-sharp 4-vertex tapered diamond lens-flare needle (<===>)
 * with pinpoint tips and zero blunt rectangular box ends!
 */
export function buildTaperedDiamondLensFlareGeometry(
  length: number,
  thickness: number
): THREE.BufferGeometry {
  const hl = length * 0.5;
  const ht = thickness * 0.5;
  const positions = new Float32Array([
    -hl, 0, 0,
    0, -ht, 0,
    hl, 0, 0,
    0, ht, 0,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.computeVertexNormals();
  return geo;
}

export function selectDemonSlayerPaletteForStance(stance: string): DemonSlayerVfxPalette {
  if (stance === 'pillar') return 'wind';
  if (stance === 'thrust') return 'thunder';
  if (stance === 'water' || stance === 'varuna') return 'water';
  return 'hinokami';
}

// ============================================================================
// PHASE 1 — UFOTABLE / DEMON SLAYER PAINTERLY BRUSHWORK + SUMI-E INK SHADER
// Samples our procedural painterly brushwork atlas and traces crisp pitch-black
// Sumi-e ink outlines around EVERY curling flame tongue, Hokusai foam claw, and
// razor emerald wind-blade silhouette!
// ============================================================================

const RIBBON_VERTEX_SHADER = /* glsl */ `
  uniform float uLife;
  uniform float uCrestStyle;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 strokePosition = position;
    float u = uv.x;
    float section = sin(u * 3.14159265);
    if (uCrestStyle > 0.5 && uCrestStyle < 1.5) {
      float roll = sin(u * 11.7 - uLife * 9.0);
      float crestDistance = (u - 0.69 - uLife * 0.14) * 4.2;
      float shoulder = exp(-crestDistance * crestDistance);
      float surge = 1.0 - smoothstep(0.40, 0.91, uLife);
      strokePosition.y += section * (12.0 * roll + 33.0 * shoulder * surge) * mix(0.56, 1.25, uv.y);
      strokePosition.x += section * roll * 8.5 * uv.y;
    } else if (uCrestStyle > 1.5 && uCrestStyle < 2.5) {
      float flex = section * sin(u * 5.4 - uLife * 7.8) * (1.0 - uLife);
      strokePosition.x += flex * mix(16.0, 9.0, uv.y);
      strokePosition.y += flex * 8.0;
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(strokePosition, 1.0);
  }
`;

const RIBBON_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uLife;
  uniform vec3 uCoreColor;
  uniform vec3 uMidColor;
  uniform vec3 uEdgeColor;
  uniform vec3 uDeepColor;
  uniform vec3 uInkColor;
  uniform float uOpacity;
  uniform float uInkBorder;
  uniform float uMode;
  uniform float uHdrBoost;
  uniform float uUseAtlas;
  uniform float uUvRepeat;
  uniform float uScrollSpeed;
  uniform float uAgniPass;
  uniform float uCrestStyle;
  uniform float uOpenStrike;
  uniform float uLiveBladeTrail;
  uniform sampler2D uAtlasTex;
  uniform sampler2D uDivineInkAtlas;
  uniform float uDivineInkEnabled;
  uniform float uDivineInkStart;

  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  ${AGNI_PAINTERLY_GLSL}
  ${ELEMENTAL_CREST_GLSL}

  void main() {
    float u = vUv.x;
    float v = vUv.y;
    // Experimental source artwork on the existing swept weapon mesh. Never create a separate ring.
    if (uDivineInkEnabled > 0.5 && uLiveBladeTrail > 0.5 && uMode < 0.5) {
      float frame = clamp(floor(max(0.0, uTime - uDivineInkStart) * 30.0), 0.0, 11.0);
      float col = mod(frame, 4.0);
      float row = floor(frame / 4.0);
      // Atlas: 4 x 3 cells, 508 x 128 content, two transparent pixels of padding.
      vec2 px = vec2(col * 512.0 + 2.5 + clamp(u, 0.0, 1.0) * 507.0,
        row * 132.0 + 2.5 + (1.0 - clamp(v, 0.0, 1.0)) * 127.0);
      vec4 art = texture2D(uDivineInkAtlas, vec2(px.x / 2048.0, 1.0 - px.y / 396.0));
      float taper = smoothstep(0.0, 0.16, u) * (1.0 - smoothstep(0.97, 1.0, u));
      float alpha = art.a * taper * (1.0 - smoothstep(0.0, 1.0, uLife)) * uOpacity;
      gl_FragColor = vec4(art.rgb * alpha, alpha);
      return;
    }
    if (uOpenStrike > 0.5) {
      gl_FragColor = paintOpenStrike(u, v);
      return;
    }
    if (uAgniPass > 0.5) {
      gl_FragColor = paintAgni(u, v);
      return;
    }

    if (uCrestStyle > 0.5) {
      gl_FragColor = paintElementalCrest(u, v);
      return;
    }

    // Calligraphic head & tail silhouette envelope along ribbon arc
    float headMask = smoothstep(0.0, 0.12, u) * smoothstep(1.0, 0.84, u);
    // Tail-to-tip brush-grain erosion as uLife advances
    float grain = noise2(vec2(u * 14.0 - uTime * 3.2, v * 6.0));
    float dissolveGate = uLife * 0.92;
    float erosion = smoothstep(dissolveGate - 0.16, dissolveGate + 0.12, u * 0.72 + grain * 0.34);
    float lifeFade = (1.0 - smoothstep(0.74, 1.0, uLife)) * erosion;
    if (lifeFade <= 0.015) discard;

    // Selective HDR gain strictly reserved for the narrow white-hot cutting spine
    float spineHdr = clamp(uHdrBoost, 1.0, 1.85);

    if (uUseAtlas > 0.5) {
      // Sample painterly brushwork atlas with seamless scrolling along ribbon U
      float scrollU = u * uUvRepeat - uTime * uScrollSpeed;
      // Subtle organic fluid sway on V so tongues & wave crests breathe alive
      float swayAmp = (uMode > 1.5 && uMode < 2.5) ? 0.0 : 0.025;
      float sampleV = clamp(v + sin(u * 10.0 - uTime * 7.0) * swayAmp, 0.01, 0.99);
      vec2 suv = vec2(scrollU, sampleV);
      vec4 tex = texture2D(uAtlasTex, suv);

      // Silhouette-traced pitch-black Sumi-e ink outline via 4-neighbor alpha gradient!
      vec2 px = vec2(0.0085, 0.016);
      float aL = texture2D(uAtlasTex, suv + vec2(-px.x, 0.0)).a;
      float aR = texture2D(uAtlasTex, suv + vec2(px.x, 0.0)).a;
      float aU = texture2D(uAtlasTex, vec2(suv.x, clamp(suv.y + px.y, 0.0, 1.0))).a;
      float aD = texture2D(uAtlasTex, vec2(suv.x, clamp(suv.y - px.y, 0.0, 1.0))).a;
      float maxNeighborA = max(max(aL, aR), max(aU, aD));
      float minNeighborA = min(min(aL, aR), min(aU, aD));

      float bodyAlpha = smoothstep(0.32, 0.56, tex.a) * headMask;
      float outerOutline = smoothstep(0.36, 0.62, maxNeighborA) * (1.0 - bodyAlpha) * headMask;
      float innerRim = bodyAlpha * (1.0 - smoothstep(0.38, 0.62, minNeighborA));
      float silhouetteInk = clamp(outerOutline + innerRim * 0.78, 0.0, 1.0) * uInkBorder;

      float totalAlpha = max(bodyAlpha, silhouetteInk) * lifeFade * uOpacity;
      if (uMode > 2.5) totalAlpha *= 0.64 + 0.36 * smoothstep(0.37, 0.8, tex.b);
      if (uMode > 0.5 && uMode < 1.5) totalAlpha *= 0.76 + 0.24 * smoothstep(0.36, 0.67, tex.b);
      if (totalAlpha <= 0.02) discard;

      vec3 col = uEdgeColor;

      if (uMode > 0.5 && uMode < 1.5) {
        // VARUNA — Ukiyo-e Hokusai Woodblock Waves + Carved Striations + Clawed White Seafoam!
        float striation = tex.g;
        float foamClaw = smoothstep(0.45, 0.72, tex.b);
        float deepStep = step(0.32, striation);
        float brightStep = step(0.70, striation);
        col = mix(uDeepColor, uEdgeColor, deepStep);
        col = mix(col, uMidColor * 1.10, brightStep);
        // Sculpted clawed seafoam crests pop crisp rice-paper white with selective HDR sheen
        col = mix(col, uCoreColor * min(spineHdr, 1.24), foamClaw);
        // Subtle crisp navy woodblock ink crease right beneath the seafoam claws
        float foamCrease = smoothstep(0.22, 0.44, tex.b) * (1.0 - foamClaw);
        col = mix(col, uInkColor, foamCrease * 0.68 * uInkBorder);
      } else if (uMode > 1.5 && uMode < 2.5) {
        // VAJRA — Zenitsu Angular Faceted Lightning (zero soft blur!)
        float boltCore = smoothstep(0.84, 0.96, tex.g);
        float goldBand = smoothstep(0.42, 0.68, tex.g);
        float cyanSpark = smoothstep(0.55, 0.80, tex.b);
        col = mix(uDeepColor, uMidColor * 1.15, goldBand);
        col = mix(col, uEdgeColor * 1.22, cyanSpark * (1.0 - boltCore));
        col = mix(col, uCoreColor * spineHdr, boltCore);
      } else if (uMode > 2.5) {
        // VAYU — Sanemi Triple-Layered Razor Emerald Wind Blades + Pitch-Black Sumi-e Tear-Streaks!
        float bladeTone = tex.g;
        float inkTear = smoothstep(0.48, 0.74, tex.b);
        float midBlade = step(0.46, bladeTone);
        float razorCore = smoothstep(0.86, 0.96, bladeTone);
        col = mix(uDeepColor, uEdgeColor * 1.12, midBlade);
        col = mix(col, uMidColor * 1.18, smoothstep(0.68, 0.82, bladeTone));
        col = mix(col, uCoreColor * spineHdr, razorCore);
        // Aggressive pitch-black sumi-e tear-streaks ripping directly through the wind!
        col = mix(col, uInkColor, inkTear * 0.94);
      } else {
        // AGNI — Hinokami Kagura / Rengoku 4-Step Cel Fire + Dark Charcoal Smoke Hollows!
        float heat = tex.g;
        float smokeHollow = smoothstep(0.42, 0.74, tex.b);
        float vermilion = smoothstep(0.18, 0.34, heat);
        float amberGold = smoothstep(0.56, 0.72, heat);
        float whiteHotSpine = smoothstep(0.86, 0.96, heat);
        col = mix(uDeepColor, uEdgeColor * 1.12, vermilion);
        col = mix(col, uMidColor * 1.14, amberGold);
        col = mix(col, uCoreColor * spineHdr, whiteHotSpine);
        // Iconic Ufotable dark charcoal smoke pockets inside curling flame eddies!
        vec3 charcoalHollow = vec3(0.11, 0.05, 0.05);
        col = mix(col, charcoalHollow, smokeHollow * 0.88 * (1.0 - whiteHotSpine));
      }

      // Apply razor-sharp Sumi-e calligraphy contour strictly on silhouette edges
      col = mix(col, uInkColor, silhouetteInk * 0.96);

      gl_FragColor = vec4(col * totalAlpha, totalAlpha);
      return;
    }

    // Procedural fallback path (used by shockwave/ink layers without atlas)
    float distFromCenter = abs(v - 0.5) * 2.0;
    float radiusMask = headMask * (1.0 - uLife * 0.24);
    float outerAlpha = smoothstep(radiusMask + 0.08, radiusMask - 0.08, distFromCenter);
    if (outerAlpha <= 0.02) discard;
    vec3 col = mix(uEdgeColor, uMidColor, smoothstep(0.75, 0.32, distFromCenter));
    col = mix(col, uCoreColor * spineHdr, smoothstep(0.26, 0.06, distFromCenter));
    if (uInkBorder > 0.5) {
      float rim = smoothstep(radiusMask - 0.14, radiusMask + 0.02, distFromCenter);
      col = mix(col, uInkColor, rim * 0.94);
    }
    float finalAlpha = outerAlpha * lifeFade * uOpacity;
    gl_FragColor = vec4(col * finalAlpha, finalAlpha);
  }
`;

// Ground Light Bounce & Elemental Floor Fracture Shader (integrates VFX into the MP4 arena floor!)
const GROUND_BOUNCE_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uLife;
  uniform float uMode; // 0=Agni scorch/ember pool, 1=Varuna caustic ripple, 2=Vajra lightning cracks, 3=Vayu dust gale ring
  uniform vec3 uCoreColor;
  uniform vec3 uMidColor;
  uniform vec3 uInkColor;
  uniform float uIntensity;
  varying vec2 vUv;

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    if (r > 1.0) discard;
    float ang = atan(p.y, p.x);

    float fadeIn = smoothstep(0.0, 0.12, uLife);
    float fadeOut = 1.0 - smoothstep(0.45, 1.0, uLife);
    float env = fadeIn * fadeOut * uIntensity;
    if (env <= 0.01) discard;

    // Soft ambient elemental floor bounce pool
    float bouncePool = pow(clamp(1.0 - r, 0.0, 1.0), 1.9) * 0.52;
    vec3 col = uMidColor;
    float detail = 0.0;

    if (uMode > 1.5 && uMode < 2.5) {
      // VAJRA — Sharp angular radiating lightning cracks burned across the stone floor!
      float sector = 6.2831853 / 8.0;
      float localA = mod(ang + sector * 0.5, sector) - sector * 0.5;
      float jag = sin(r * 22.0 + floor((ang + 3.14159) / sector) * 4.7) * 0.045;
      float crack = (1.0 - smoothstep(0.012, 0.036, abs(r * sin(localA) + jag))) * step(0.10, r) * (1.0 - smoothstep(0.75, 0.98, r));
      float centerFlash = exp(-r * r * 7.0);
      detail = max(crack * 0.95, centerFlash * 0.72);
      col = mix(uMidColor * 1.15, uCoreColor * 1.32, smoothstep(0.35, 0.85, detail));
    } else if (uMode > 0.5 && uMode < 1.5) {
      // VARUNA — Concentric Hokusai water caustic ripples
      float ring1 = 1.0 - smoothstep(0.02, 0.07, abs(r - (0.34 + uLife * 0.42)));
      float ring2 = 1.0 - smoothstep(0.02, 0.06, abs(r - (0.18 + uLife * 0.34)));
      float ripple = sin(ang * 8.0 - uTime * 7.0 + r * 14.0) * 0.5 + 0.5;
      detail = max(ring1 * (0.65 + ripple * 0.35), ring2 * 0.75);
      col = mix(uMidColor, uCoreColor * 1.15, detail * 0.78);
    } else if (uMode > 2.5) {
      // VAYU — Sweeping emerald wind shear ring + carved ground dust arcs
      float ring = (1.0 - smoothstep(0.03, 0.11, abs(r - (0.38 + uLife * 0.44))));
      float slashGap = smoothstep(0.25, 0.65, sin(ang * 5.0 + uTime * 9.0) * 0.5 + 0.5);
      detail = ring * slashGap * 0.88;
      col = mix(uMidColor, uCoreColor * 1.15, detail * 0.7);
    } else {
      // AGNI — Glowing ember scorch ring + radial heat cracks
      float ring = 1.0 - smoothstep(0.04, 0.14, abs(r - (0.32 + uLife * 0.38)));
      float heatWaves = sin(ang * 7.0 - uTime * 6.0) * 0.5 + 0.5;
      detail = ring * (0.55 + heatWaves * 0.45);
      col = mix(uMidColor * 1.08, uCoreColor * 1.2, detail * 0.65);
    }

    float alpha = clamp((bouncePool + detail * 0.72) * env, 0.0, 0.86);
    if (alpha <= 0.015) discard;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

// Akaza Destructive Death: Compass Needle 12-Point Snowflake Mandala Floor Shader
const COMPASS_MANDALA_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uLife;
  uniform vec3 uPrimaryColor;
  uniform vec3 uEdgeColor;
  uniform vec3 uCoreColor;
  varying vec2 vUv;

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    if (r > 0.99) discard;

    float ang = atan(p.y, p.x);
    float rotA = ang + uTime * 0.42;
    float rotB = ang - uTime * 0.26;

    float sector = 6.2831853 / 12.0;
    float localA = mod(rotA + sector * 0.5, sector) - sector * 0.5;
    float symX = r * cos(localA);
    float symY = abs(r * sin(localA));

    float mainSpoke = (1.0 - smoothstep(0.008, 0.020, symY)) * step(0.18, symX) * step(symX, 0.93);
    float spokeGlow = (1.0 - smoothstep(0.015, 0.055, symY)) * step(0.16, symX) * step(symX, 0.95);
    float barb1 = (1.0 - smoothstep(0.007, 0.018, abs(symY - (symX - 0.36) * 0.58))) * step(0.36, symX) * step(symX, 0.66);
    float barb2 = (1.0 - smoothstep(0.007, 0.018, abs(symY - (0.84 - symX) * 0.54))) * step(0.54, symX) * step(symX, 0.85);

    float hexAngle = mod(rotB + 3.14159265 / 6.0, 3.14159265 / 3.0) - 3.14159265 / 6.0;
    float hexR = cos(hexAngle) * r;
    float outerHex = 1.0 - smoothstep(0.009, 0.024, abs(hexR - 0.78));
    float innerHex = 1.0 - smoothstep(0.009, 0.022, abs(hexR - 0.44));

    float outerRing = 1.0 - smoothstep(0.010, 0.026, abs(r - 0.90));
    float midRing = 1.0 - smoothstep(0.008, 0.020, abs(r - 0.56));
    float hubRing = 1.0 - smoothstep(0.012, 0.030, abs(r - 0.20));

    float sharpLines = clamp(
      max(
        max(mainSpoke, max(barb1 * 0.92, barb2 * 0.92)),
        max(max(outerHex, innerHex * 0.92), max(outerRing, max(midRing, hubRing)))
      ),
      0.0,
      1.0
    );

    float radialAura = pow(clamp(1.0 - r, 0.0, 1.0), 1.4) * 0.34 + spokeGlow * 0.28;
    float fadeIn = smoothstep(0.0, 0.14, uLife);
    float fadeOut = 1.0 - smoothstep(0.74, 1.0, uLife);
    float pulse = 0.88 + 0.12 * sin(uTime * 6.5 - r * 9.0);
    float alpha = clamp((sharpLines * 0.92 + radialAura) * fadeIn * fadeOut * pulse, 0.0, 0.92);
    if (alpha <= 0.015) discard;

    vec3 col = mix(uEdgeColor * 1.15, uPrimaryColor * 1.18, clamp(radialAura * 1.6 + sharpLines * 0.7, 0.0, 1.0));
    col = mix(col, uCoreColor * 1.15, smoothstep(0.62, 0.98, sharpLines));
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

// Feathered Volumetric Light Mist Column Shader
const VOLUMETRIC_BEAM_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    float xDist = abs(vUv.x - 0.5) * 2.0;
    float horizFade = pow(clamp(1.0 - xDist, 0.0, 1.0), 2.4);
    float vertFade = smoothstep(0.0, 0.16, vUv.y) * pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.9);
    float shimmer = 0.82 + 0.18 * sin(vUv.y * 12.0 - uTime * 5.0 + vUv.x * 4.0);
    float alpha = horizFade * vertFade * shimmer * uOpacity;
    if (alpha <= 0.008) discard;
    vec3 col = mix(uColor, vec3(0.88, 0.98, 1.0), horizFade * 0.35);
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

// Bespoke Ufotable Zenitsu Thunder Breathing Procedural GLSL Plasma Lightning Shader
// Zero disconnected gap at origin (vUv.x=0 stays full-width welded to parent elbow!)
const THUNDER_BOLT_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uLife;
  uniform float uSeed;
  uniform float uOpacity;
  uniform float uIsHalo;
  uniform float uIsBranch;
  uniform float uBranchDelay;
  uniform vec3 uCoreColor;
  uniform vec3 uGoldColor;
  uniform vec3 uCyanColor;
  uniform vec3 uInkColor;
  varying vec2 vUv;

  float thHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float thNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = thHash(i);
    float b = thHash(i + vec2(1.0, 0.0));
    float c = thHash(i + vec2(0.0, 1.0));
    float d = thHash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    if (uLife < uBranchDelay) discard;
    float headReveal = smoothstep(uBranchDelay, uBranchDelay + 0.18, uLife);
    float tailDissolve = smoothstep(0.36, 0.96, uLife);
    float reveal = 1.0 - smoothstep(headReveal - 0.07, headReveal + 0.04, vUv.x);

    // Quantized 18fps sakuga lightning flicker, pinned strictly to 0 at branch root (vUv.x=0)
    // so forked branches NEVER pull away from their parent elbow vertex!
    float snapTime = floor(uTime * 18.0 + uSeed * 3.1);
    float pinRoot = uIsBranch > 0.5 ? smoothstep(0.0, 0.22, vUv.x) : smoothstep(0.0, 0.08, vUv.x);
    float jag1 = (thNoise(vec2(vUv.x * 14.0 - snapTime * 0.7, uSeed * 5.0)) - 0.5) * 0.24 * pinRoot;
    float jag2 = (thNoise(vec2(vUv.x * 34.0 + snapTime * 1.3, uSeed * 9.0)) - 0.5) * 0.11 * pinRoot;
    float center = 0.5 + jag1 + jag2;
    float dist = abs(vUv.y - center) * 2.0;

    float surge = 0.84 + 0.16 * sin(vUv.x * 24.0 - uTime * 46.0 + uSeed * 6.0);
    float crackleMask = thNoise(vec2(vUv.x * 22.0 + uSeed, snapTime * 0.9));
    float widthScale = (1.0 - tailDissolve * 0.50);

    if (uIsHalo > 0.5) {
      float halo = exp(-dist * dist * 3.8) * (1.0 - tailDissolve) * surge;
      vec3 haloCol = mix(uCyanColor, uGoldColor, (1.0 - smoothstep(0.14, 0.52, dist)));
      float alpha = halo * uOpacity * 0.55 * reveal;
      if (alpha < 0.02) discard;
      gl_FragColor = vec4(haloCol * 1.35 * alpha, alpha);
      return;
    }

    if (tailDissolve > 0.08 && crackleMask < tailDissolve * 0.65) discard;

    float outerBound = 0.92 * widthScale;
    if (dist > outerBound) discard;

    // Crisp 4-Band Stepped Zenitsu Thunder Composition:
    // Pitch-black Sumi-e serrated contour -> Electric Cyan edge -> Zenitsu Gold -> White-hot plasma core
    float inkEdge = (1.0 - smoothstep(outerBound - 0.12, outerBound, dist));
    float cyanBand = (1.0 - smoothstep(outerBound - 0.26, outerBound - 0.14, dist));
    float goldBand = (1.0 - smoothstep(0.42 * widthScale, 0.62 * widthScale, dist));
    float coreBand = (1.0 - smoothstep(0.11 * widthScale, 0.28 * widthScale, dist));

    vec3 col = uInkColor;
    col = mix(col, uCyanColor * 1.24, cyanBand);
    col = mix(col, uGoldColor * (1.20 * surge), goldBand);
    col = mix(col, uCoreColor * 1.38, coreBand);

    float fadeOut = 1.0 - smoothstep(0.72, 1.0, uLife);
    // Branches stay 100% solid at root (vUv.x=0) so they weld seamlessly into parent elbow!
    float rootFade = uIsBranch > 0.5 ? 1.0 : smoothstep(0.0, 0.03, vUv.x);
    float tipFade = 1.0 - smoothstep(0.94, 1.0, vUv.x);
    float alpha = clamp(reveal * inkEdge * 0.99 * fadeOut * (0.45 + 0.55 * rootFade * tipFade) * uOpacity, 0.0, 1.0);
    if (alpha < 0.03) discard;

    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

// Pooled InstancedMesh Particle Shader (samples 2x2 impactSprites atlas:
// (0,0) 12-pt Starburst, (1,0) Ink Water Droplet, (0,1) Razor Speed-Spark Needle, (1,1) Shattered Rock Shard)
const INSTANCED_PARTICLE_VERTEX_SHADER = /* glsl */ `
  attribute vec2 aCellOffset;
  attribute vec3 aColor;
  attribute float aAlpha;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vUv = uv * 0.5 + aCellOffset;
    vColor = aColor;
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const INSTANCED_PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uSpriteAtlas;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    if (vAlpha <= 0.01) discard;
    vec4 tex = texture2D(uSpriteAtlas, vUv);
    float alpha = tex.a * vAlpha;
    if (alpha <= 0.02) discard;
    // Preserve dark painted Sumi-e ink outlines embedded in sprite atlas while tinting bright core!
    float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    vec3 col = mix(tex.rgb, tex.rgb * vColor, smoothstep(0.18, 0.55, luma));
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

// ============================================================================
// INTERNAL DATA STRUCTURES
// ============================================================================

interface ActiveWebglRibbon {
  group: THREE.Group;
  backGroup?: THREE.Group;
  coreMesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  agniSpine?: ReturnType<typeof createAgniOpticalMesh>;
  glowMesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  backMesh?: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  worldX: number;
  worldY: number;
  baseRotZ: number;
  tiltX: number;
  tiltY: number;
  spinRate: number;
  life: number;
  maxLife: number;
  scale: number;
}

interface PooledBladeTrail {
  id: string | null;
  active: boolean;
  ending: boolean;
  palette: DemonSlayerVfxPalette;
  widthBoostPx: number;
  fadeElapsed: number;
  fadeDuration: number;
  samples: ArenaBladeSample[];
  maxSpine: number;
  // Back pass (behind Rudra, depthZ < 0)
  backGeo: THREE.BufferGeometry;
  backPos: Float32Array;
  backUv: Float32Array;
  backDepth: Float32Array;
  backIdx: Uint16Array;
  backMat: THREE.ShaderMaterial;
  backMesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  // Front pass (in front of Rudra, depthZ >= 0)
  frontGeo: THREE.BufferGeometry;
  frontPos: Float32Array;
  frontUv: Float32Array;
  frontDepth: Float32Array;
  frontIdx: Uint16Array;
  frontMat: THREE.ShaderMaterial;
  frontMesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  tipTravelSinceEmission: number;
  // World-to-screen transform parent
  backGroup: THREE.Group;
  frontGroup: THREE.Group;
}

interface ActiveWebglCyclone {
  group: THREE.Group;
  rings: Array<{
    mesh: THREE.Mesh<THREE.TorusGeometry, THREE.ShaderMaterial>;
    spinX: number;
    spinY: number;
    spinZ: number;
  }>;
  worldX: number;
  worldY: number;
  life: number;
  maxLife: number;
  maxRadius: number;
}

interface PooledParticleSlot {
  active: boolean;
  kind: ElementalParticleKind;
  worldX: number;
  worldY: number;
  vx: number;
  vy: number;
  z: number;
  vz: number;
  gravity: number;
  drag: number;
  rot: number;
  rotSpeed: number;
  scaleX: number;
  scaleY: number;
  alignToVelocity: boolean;
  r: number;
  g: number;
  b: number;
  life: number;
  maxLife: number;
}

interface ActiveSolarWheel {
  frontGroup: THREE.Group;
  backGroup: THREE.Group;
  mats: THREE.ShaderMaterial[];
  geos: THREE.BufferGeometry[];
  worldX: number;
  worldY: number;
  baseAngle: number;
  spinRate: number;
  life: number;
  maxLife: number;
}

interface ActiveWaterDragon {
  frontGroup: THREE.Group;
  backGroup: THREE.Group;
  bodyMat: THREE.ShaderMaterial;
  fadeMats: THREE.Material[];
  geos: THREE.BufferGeometry[];
  worldX: number;
  worldY: number;
  angle: number;
  speed: number;
  life: number;
  maxLife: number;
  reach: number;
  wakeStep: number;
  fromBlade: boolean;
}

interface ActiveThunderZigzag {
  group: THREE.Group;
  shaderMats: THREE.ShaderMaterial[];
  mats: THREE.MeshBasicMaterial[];
  starGroups: THREE.Group[];
  geos: THREE.BufferGeometry[];
  worldX: number;
  worldY: number;
  life: number;
  releaseDebris?: () => void;
  maxLife: number;
}

interface ActiveWindGale {
  sweep: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  angle: number;
  worldX: number;
  worldY: number;
  life: number;
  maxLife: number;
  reach: number;
  wakeStep: number;
  fromBlade: boolean;
}

interface ActiveCompassMandala {
  group: THREE.Group;
  mandalaMat: THREE.ShaderMaterial;
  beamMat: THREE.ShaderMaterial;
  geos: THREE.BufferGeometry[];
  worldX: number;
  worldY: number;
  radius: number;
  life: number;
  maxLife: number;
}

interface ActiveGroundBounce {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  worldX: number;
  worldY: number;
  radius: number;
  life: number;
  maxLife: number;
}

interface ActiveBloodCage {
  group: THREE.Group;
  mats: THREE.MeshBasicMaterial[];
  geos: THREE.BufferGeometry[];
  worldX: number;
  worldY: number;
  life: number;
  maxLife: number;
}

interface ActiveStarburst {
  group: THREE.Group;
  mats: THREE.MeshBasicMaterial[];
  geos?: THREE.BufferGeometry[];
  worldX: number;
  worldY: number;
  maxScale: number;
  life: number;
  maxLife: number;
}

interface ActiveShockwaveRing {
  group: THREE.Group;
  inkMat: THREE.ShaderMaterial;
  coreMat: THREE.ShaderMaterial;
  geos: THREE.BufferGeometry[];
  worldX: number;
  worldY: number;
  life: number;
  maxLife: number;
}

function buildCurvedRibbonGeometry(
  radius: number,
  width: number,
  arcSpan: number,
  direction: 1 | -1,
  segments = 30,
  launchPull = 0,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const startA = -arcSpan * 0.5 * direction;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startA + arcSpan * t * direction;
    const rCenter = radius * (0.86 + Math.sin(t * Math.PI * 0.78) * 0.22 - launchPull * Math.pow(1 - t, 2.9));
    const taper = Math.sin(Math.pow(t, 0.72) * Math.PI);
    const halfW = width * 0.5 * (0.18 + taper * 0.92);

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const zLift = Math.sin(t * Math.PI) * (width * 0.34);

    const ix = cosA * Math.max(8, rCenter - halfW);
    const iy = sinA * Math.max(8, rCenter - halfW);
    const ox = cosA * (rCenter + halfW);
    const oy = sinA * (rCenter + halfW);

    positions.push(ix, iy, zLift * 0.5);
    positions.push(ox, oy, zLift);
    uvs.push(t, 0);
    uvs.push(t, 1);

    if (i < segments) {
      const b = i * 2;
      indices.push(b, b + 1, b + 2);
      indices.push(b + 1, b + 3, b + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildElementalStrokeGeometry(
  element: ElementalStroke,
  reach: number,
  lane: number,
  fromBlade = false,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uv: number[] = [];
  const indices: number[] = [];
  const steps = 36;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const center = sampleElementalStroke(element, t, reach, lane, fromBlade);
    const before = sampleElementalStroke(element, Math.max(0, t - 0.01), reach, lane, fromBlade);
    const after = sampleElementalStroke(element, Math.min(1, t + 0.01), reach, lane, fromBlade);
    const tangentX = after.x - before.x;
    const tangentY = after.y - before.y;
    const normalScale = center.width * 0.5 / Math.max(0.001, Math.hypot(tangentX, tangentY));
    const nx = -tangentY * normalScale;
    const ny = tangentX * normalScale;
    positions.push(center.x - nx, center.y - ny, 0, center.x + nx, center.y + ny, 0);
    uv.push(t, 0, t, 1);
    if (i < steps) {
      const vertex = i * 2;
      indices.push(vertex, vertex + 1, vertex + 2, vertex + 1, vertex + 3, vertex + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  return geo;
}

function paletteModeIndex(palette: DemonSlayerVfxPalette): number {
  if (palette === 'water' || palette === 'bronze') return 1.0;
  if (palette === 'thunder') return 2.0;
  if (palette === 'wind') return 3.0;
  return 0.0;
}

function pickAtlasTextureForPalette(
  atlas: PainterlyVfxAtlas | null,
  palette: DemonSlayerVfxPalette
): THREE.Texture | null {
  if (!atlas) return null;
  const mode = paletteModeIndex(palette);
  if (mode === 1.0) return atlas.waterWaveSheet;
  if (mode === 2.0) return atlas.lightningSheet;
  if (mode === 3.0) return atlas.windBladeSheet;
  return atlas.flameSheet;
}

function createRibbonMaterial(
  pal: RibbonPaletteColors,
  mode: number,
  opacity: number,
  inkBorder: boolean,
  blending: THREE.Blending,
  hdrBoost = 1.32,
  atlasTex: THREE.Texture | null = null,
  uvRepeat = 1.4,
  scrollSpeed = 1.35
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLife: { value: 0 },
      uCoreColor: { value: pal.core.clone() },
      uMidColor: { value: pal.mid.clone() },
      uEdgeColor: { value: pal.edge.clone() },
      uDeepColor: { value: pal.deep.clone() },
      uInkColor: { value: pal.ink.clone() },
      uOpacity: { value: opacity },
      uInkBorder: { value: inkBorder ? 1.0 : 0.0 },
      uMode: { value: mode },
      uHdrBoost: { value: hdrBoost },
      uUseAtlas: { value: atlasTex ? 1.0 : 0.0 },
      uUvRepeat: { value: uvRepeat },
      uScrollSpeed: { value: scrollSpeed },
      uAgniPass: { value: 0 },
      uCrestStyle: { value: 0 },
      uOpenStrike: { value: 0 },
      uLiveBladeTrail: { value: 0 },
      uDivineInkAtlas: { value: null },
      uDivineInkEnabled: { value: 0 },
      uDivineInkStart: { value: 0 },
      uAtlasTex: { value: atlasTex },
    },
    vertexShader: RIBBON_VERTEX_SHADER,
    fragmentShader: RIBBON_FRAGMENT_SHADER,
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending,
  });
}

function createAgniOpticalMesh(
  geometry: THREE.BufferGeometry,
  body: THREE.ShaderMaterial,
  pass: 2 | 3
): THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> {
  const material = new THREE.ShaderMaterial({
    uniforms: { ...body.uniforms, uAgniPass: { value: pass } },
    vertexShader: body.vertexShader,
    fragmentShader: body.fragmentShader,
    blending: THREE.AdditiveBlending,
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = pass === 2 ? -1 : 1;
  mesh.frustumCulled = false;
  return mesh;
}

function particleCellOffset(kind: ElementalParticleKind): [number, number] {
  // Remember Three.js CanvasTexture flipY = true:
  // Canvas top half (y 0..256) maps to UV v in [0.5..1.0], bottom half maps to v in [0.0..0.5]
  switch (kind) {
    case 'water_droplet':
      return [0.5, 0.5]; // Top-Right cell (1,0)
    case 'spark_needle':
      return [0.0, 0.0]; // Bot-Left cell (0,1)
    case 'rock_shard':
    case 'wind_shard':
    case 'soot_flake':
    case 'dust_mote':
      return [0.5, 0.0]; // Bot-Right cell (1,1)
    default:
      return [0.0, 0.0];
  }
}

// ============================================================================
// MAIN WEBGL DEMON SLAYER VFX OVERLAY (PHASE 1 UPGRADED)
// 4-Pass Architecture: FloorCanvas -> BackCanvas -> Actors -> FrontCanvas + BloomCanvas
// ============================================================================

export class WebglDemonSlayerVfxOverlay {
  public readonly canvas: HTMLCanvasElement;
  public readonly backCanvas: HTMLCanvasElement;
  public readonly floorCanvas: HTMLCanvasElement;
  public readonly bloomCanvas: HTMLCanvasElement;
  public hasBloomFrame = false;

  public get available(): boolean {
    return this.renderer !== null && !this.disposed;
  }

  private renderer: THREE.WebGLRenderer | null = null;
  private bloomComposer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private bloomCtx: CanvasRenderingContext2D | null = null;
  private floorCtx: CanvasRenderingContext2D | null = null;
  private backCtx: CanvasRenderingContext2D | null = null;
  private atlas: PainterlyVfxAtlas | null = null;

  private scene: THREE.Scene;
  private backScene: THREE.Scene;
  private floorScene: THREE.Scene;
  private camera: THREE.OrthographicCamera;

  private ribbons: ActiveWebglRibbon[] = [];
  private bladeTrailPool: PooledBladeTrail[] = [];
  private cyclones: ActiveWebglCyclone[] = [];
  private solarWheels: ActiveSolarWheel[] = [];
  private waterDragons: ActiveWaterDragon[] = [];
  private thunderBolts: ActiveThunderZigzag[] = [];
  private windGales: ActiveWindGale[] = [];
  private mandalas: ActiveCompassMandala[] = [];
  private groundBounces: ActiveGroundBounce[] = [];
  private bloodCages: ActiveBloodCage[] = [];
  private starbursts: ActiveStarburst[] = [];
  private shockwaveRings: ActiveShockwaveRing[] = [];

  // Shared Geometries & Pooled InstancedMesh Particle System (Zero per-spark GC!)
  private groundBounceGeo: THREE.PlaneGeometry;
  private particleCapacity = 260;
  private particleSlots: PooledParticleSlot[] = [];
  private particleInstancedMesh: THREE.InstancedMesh | null = null;
  private particleCellAttr: THREE.InstancedBufferAttribute | null = null;
  private particleColorAttr: THREE.InstancedBufferAttribute | null = null;
  private particleAlphaAttr: THREE.InstancedBufferAttribute | null = null;
  private particleMat: THREE.ShaderMaterial | null = null;
  private particleGeo: THREE.PlaneGeometry | null = null;
  private dummyMatrix = new THREE.Matrix4();
  private dummyPos = new THREE.Vector3();
  private dummyQuat = new THREE.Quaternion();
  private dummyScale = new THREE.Vector3();
  private dummyEuler = new THREE.Euler();

  private qualityPreset: VfxQualityPreset = 'balanced';
  private elapsed = 0;
  private divineInkAtlas: THREE.Texture | null = null;
  private width = 1440;
  private height = 900;
  private isSoftwareGl = false;
  private disposed = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1440;
    this.canvas.height = 900;
    this.backCanvas = document.createElement('canvas');
    this.backCanvas.width = 1440;
    this.backCanvas.height = 900;
    this.backCtx = this.backCanvas.getContext('2d');
    this.floorCanvas = document.createElement('canvas');
    this.floorCanvas.width = 1440;
    this.floorCanvas.height = 900;
    this.floorCtx = this.floorCanvas.getContext('2d');
    this.bloomCanvas = document.createElement('canvas');
    this.bloomCanvas.width = 720;
    this.bloomCanvas.height = 450;
    this.bloomCtx = this.bloomCanvas.getContext('2d');

    this.scene = new THREE.Scene();
    this.backScene = new THREE.Scene();
    this.floorScene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-720, 720, 450, -450, -900, 900);
    this.camera.position.z = 500;
    this.groundBounceGeo = new THREE.PlaneGeometry(2, 2);

    try {
      this.isSoftwareGl = isSoftwareWebGLRenderer();
      this.qualityPreset = this.isSoftwareGl ? 'performance' : 'balanced';
      this.atlas = getOrCreatePainterlyVfxAtlas();
      // Explicit opt-in: unchanged default gameplay, no download unless requested.
      if (new URLSearchParams(window.location.search).get('divineInk') === '1') {
        new THREE.TextureLoader().load('/vfx/divine-ink/agni-ribbon-atlas.png', (tex) => {
          if (this.disposed || tex.image.width !== 2048 || tex.image.height !== 396) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.NoColorSpace;
          tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.minFilter = tex.magFilter = THREE.LinearFilter;
          tex.generateMipmaps = false;
          tex.needsUpdate = true;
          this.divineInkAtlas = tex;
        }, undefined, () => { /* Missing prototype texture: retain procedural VFX. */ });
      }

      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: !this.isSoftwareGl,
        powerPreference: 'high-performance',
        premultipliedAlpha: true,
      });
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.08;

      // Selective HDR UnrealBloomPass on GPU devices (threshold 1.04 so ONLY white-hot cores bloom!)
      if (!this.isSoftwareGl) {
        const halfW = 720;
        const halfH = 450;
        const rt = new THREE.WebGLRenderTarget(halfW, halfH, {
          type: THREE.HalfFloatType,
        });
        this.bloomComposer = new EffectComposer(this.renderer, rt);
        const renderPass = new RenderPass(this.scene, this.camera);
        renderPass.clear = true;
        this.bloomComposer.addPass(renderPass);
        this.bloomPass = new UnrealBloomPass(
          new THREE.Vector2(halfW, halfH),
          0.78, // luminous 8K Ufotable HDR selective glow on white-hot cores
          0.48, // rich optical halation radius
          1.02  // HDR-only threshold: black sumi-e outlines & mid-tones stay razor-sharp!
        );
        this.bloomComposer.addPass(this.bloomPass);
      }

      this.initBladeTrailPool();
      this.initInstancedParticlePool();
      this.resize(1440, 900);
    } catch {
      this.renderer = null;
    }
  }

  private initBladeTrailPool(): void {
    const slotCount = 8;
    const maxSpine = 64;
    const maxVerts = maxSpine * 2;
    const maxIndices = (maxSpine - 1) * 6;
    const defaultPal = RIBBON_PALETTES.hinokami;
    const defaultTex = pickAtlasTextureForPalette(this.atlas, 'hinokami');

    for (let i = 0; i < slotCount; i++) {
      const backPos = new Float32Array(maxVerts * 3);
      const backUv = new Float32Array(maxVerts * 2);
      const backDepth = new Float32Array(maxVerts);
      const backIdx = new Uint16Array(maxIndices);
      const backGeo = new THREE.BufferGeometry();
      backGeo.setAttribute('position', new THREE.BufferAttribute(backPos, 3));
      backGeo.setAttribute('uv', new THREE.BufferAttribute(backUv, 2));
      backGeo.setIndex(new THREE.BufferAttribute(backIdx, 1));
      backGeo.setDrawRange(0, 0);

      const frontPos = new Float32Array(maxVerts * 3);
      const frontUv = new Float32Array(maxVerts * 2);
      const frontDepth = new Float32Array(maxVerts);
      const frontIdx = new Uint16Array(maxIndices);
      const frontGeo = new THREE.BufferGeometry();
      frontGeo.setAttribute('position', new THREE.BufferAttribute(frontPos, 3));
      frontGeo.setAttribute('uv', new THREE.BufferAttribute(frontUv, 2));
      frontGeo.setIndex(new THREE.BufferAttribute(frontIdx, 1));
      frontGeo.setDrawRange(0, 0);

      const backMat = createRibbonMaterial(
        defaultPal,
        0,
        0.96,
        true,
        THREE.NormalBlending,
        1.26,
        defaultTex,
        1.35,
        1.65
      );
      const frontMat = createRibbonMaterial(
        defaultPal,
        0,
        0.98,
        true,
        THREE.NormalBlending,
        1.38,
        defaultTex,
        1.35,
        1.65
      );

      const backMesh = new THREE.Mesh(backGeo, backMat);
      backMesh.frustumCulled = false;
      const frontMesh = new THREE.Mesh(frontGeo, frontMat);
      frontMesh.frustumCulled = false;

      const backGroup = new THREE.Group();
      backGroup.visible = false;
      backGroup.add(backMesh);
      this.backScene.add(backGroup);

      const frontGroup = new THREE.Group();
      frontGroup.visible = false;
      frontGroup.add(frontMesh);
      this.scene.add(frontGroup);

      this.bladeTrailPool.push({
        tipTravelSinceEmission: 0,
        id: null,
        active: false,
        ending: false,
        palette: 'hinokami',
        widthBoostPx: 54,
        fadeElapsed: 0,
        fadeDuration: 0.24,
        samples: [],
        maxSpine,
        backGeo,
        backPos,
        backUv,
        backDepth,
        backIdx,
        backMat,
        backMesh,
        frontGeo,
        frontPos,
        frontUv,
        frontDepth,
        frontIdx,
        frontMat,
        frontMesh,
        backGroup,
        frontGroup,
      });
    }
  }

  private initInstancedParticlePool(): void {
    const cap = this.particleCapacity;
    this.particleGeo = new THREE.PlaneGeometry(1, 1);

    const cellData = new Float32Array(cap * 2);
    const colorData = new Float32Array(cap * 3);
    const alphaData = new Float32Array(cap);

    this.particleCellAttr = new THREE.InstancedBufferAttribute(cellData, 2);
    this.particleColorAttr = new THREE.InstancedBufferAttribute(colorData, 3);
    this.particleAlphaAttr = new THREE.InstancedBufferAttribute(alphaData, 1);

    this.particleGeo.setAttribute('aCellOffset', this.particleCellAttr);
    this.particleGeo.setAttribute('aColor', this.particleColorAttr);
    this.particleGeo.setAttribute('aAlpha', this.particleAlphaAttr);

    this.particleMat = new THREE.ShaderMaterial({
      uniforms: {
        uSpriteAtlas: { value: this.atlas?.impactSprites ?? null },
      },
      vertexShader: INSTANCED_PARTICLE_VERTEX_SHADER,
      fragmentShader: INSTANCED_PARTICLE_FRAGMENT_SHADER,
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.particleInstancedMesh = new THREE.InstancedMesh(this.particleGeo, this.particleMat, cap);
    this.particleInstancedMesh.frustumCulled = false;
    this.particleInstancedMesh.count = 0;
    this.particleInstancedMesh.position.z = 31;
    this.scene.add(this.particleInstancedMesh);

    this.particleSlots = [];
    for (let i = 0; i < cap; i++) {
      this.particleSlots.push({
        active: false,
        kind: 'spark_needle',
        worldX: 0,
        worldY: 0,
        vx: 0,
        vy: 0,
        z: 0,
        vz: 0,
        gravity: 440,
        drag: 3.4,
        rot: 0,
        rotSpeed: 0,
        scaleX: 20,
        scaleY: 8,
        alignToVelocity: true,
        r: 1,
        g: 1,
        b: 1,
        life: 0,
        maxLife: 0.3,
      });
    }
  }

  public setQualityPreset(preset: VfxQualityPreset): void {
    this.qualityPreset = preset;
    if (this.renderer) {
      const pr = this.isSoftwareGl
        ? 0.75
        : Math.min(window.devicePixelRatio || 1, QUALITY_PIXEL_RATIO[preset]);
      this.renderer.setPixelRatio(pr);
      this.renderer.setSize(this.width, this.height, false);
    }
  }

  public getQualityPreset(): VfxQualityPreset {
    return this.qualityPreset;
  }

  public getTelemetry(): VfxTelemetrySnapshot {
    let activeParticles = 0;
    for (let i = 0; i < this.particleSlots.length; i++) {
      if (this.particleSlots[i].active) activeParticles++;
    }
    let activeBladeTrails = 0;
    for (let i = 0; i < this.bladeTrailPool.length; i++) {
      if (this.bladeTrailPool[i].active) activeBladeTrails++;
    }
    return {
      qualityPreset: this.qualityPreset,
      isSoftwareGl: this.isSoftwareGl,
      activeRibbons: this.ribbons.length,
      activeBladeTrails,
      activeParticles,
      maxParticles: QUALITY_PARTICLE_CAP[this.qualityPreset],
      activeFloorEffects:
        this.mandalas.length + this.shockwaveRings.length + this.groundBounces.length,
      activeBackEffects:
        activeBladeTrails +
        this.solarWheels.length +
        this.waterDragons.length +
        this.windGales.length,
      drawCalls: this.renderer?.info.render.calls ?? 0,
    };
  }

  public resize(vw: number, vh: number): void {
    const safeW = Math.max(320, Math.round(vw));
    const safeH = Math.max(240, Math.round(vh));
    if (safeW === this.width && safeH === this.height) return;
    this.width = safeW;
    this.height = safeH;
    const auxScale = this.isSoftwareGl ? 0.75 : 1;
    this.backCanvas.width = Math.max(160, Math.round(safeW * auxScale));
    this.backCanvas.height = Math.max(120, Math.round(safeH * auxScale));
    this.floorCanvas.width = Math.max(160, Math.round(safeW * auxScale));
    this.floorCanvas.height = Math.max(120, Math.round(safeH * auxScale));
    this.camera.left = -safeW * 0.5;
    this.camera.right = safeW * 0.5;
    this.camera.top = safeH * 0.5;
    this.camera.bottom = -safeH * 0.5;
    this.camera.updateProjectionMatrix();

    if (this.renderer) {
      const pr = this.isSoftwareGl
        ? 0.75
        : Math.min(window.devicePixelRatio || 1, QUALITY_PIXEL_RATIO[this.qualityPreset]);
      this.renderer.setPixelRatio(pr);
      this.renderer.setSize(safeW, safeH, false);
    }
    if (this.bloomComposer && this.bloomPass) {
      const bw = Math.max(160, Math.floor(safeW * 0.5));
      const bh = Math.max(120, Math.floor(safeH * 0.5));
      this.bloomCanvas.width = bw;
      this.bloomCanvas.height = bh;
      this.bloomComposer.setSize(bw, bh);
      this.bloomPass.resolution.set(bw, bh);
    }
  }

  // ============================================================================
  // LIVE POOLED PARASHU BLADE-TRAIL RIBBON API (TRUE 3D BLADE TRACKING!)
  // ============================================================================

  public beginBladeTrail(
    id: string,
    opts: {
      palette: DemonSlayerVfxPalette;
      widthBoostPx?: number;
      fadeDuration?: number;
      opacity?: number;
    }
  ): void {
    if (!this.renderer || this.disposed) return;

    let slot = this.bladeTrailPool.find((s) => s.id === id);
    if (!slot) {
      slot = this.bladeTrailPool.find((s) => !s.active);
    }
    if (!slot) {
      // Recycle oldest fading trail
      slot = this.bladeTrailPool.reduce((prev, cur) =>
        cur.fadeElapsed > prev.fadeElapsed ? cur : prev
      );
    }

    const pal = RIBBON_PALETTES[opts.palette];
    const mode = paletteModeIndex(opts.palette);
    const tex = pickAtlasTextureForPalette(this.atlas, opts.palette);
    const uvRepeat = mode === 2 ? 2.2 : mode === 3 ? 1.55 : 1.35;
    const scrollSpeed = mode === 2 ? 3.8 : mode === 3 ? 2.4 : 1.75;

    const configureMat = (mat: THREE.ShaderMaterial, op: number, hdr: number) => {
      mat.uniforms.uCoreColor.value.copy(pal.core);
      mat.uniforms.uMidColor.value.copy(pal.mid);
      mat.uniforms.uEdgeColor.value.copy(pal.edge);
      mat.uniforms.uDeepColor.value.copy(pal.deep);
      mat.uniforms.uInkColor.value.copy(pal.ink);
      mat.uniforms.uMode.value = mode;
      mat.uniforms.uInkBorder.value = mode === 1 || mode === 3 ? 0 : 1;
      mat.uniforms.uOpacity.value = op;
      mat.uniforms.uHdrBoost.value = hdr;
      mat.uniforms.uAtlasTex.value = tex;
      mat.uniforms.uUseAtlas.value = tex ? 1.0 : 0.0;
      mat.uniforms.uUvRepeat.value = uvRepeat;
      mat.uniforms.uScrollSpeed.value = scrollSpeed;
      mat.uniforms.uLife.value = 0;
    };

    for (const mat of [slot.backMat, slot.frontMat]) {
      mat.uniforms.uOpenStrike.value = 1;
      mat.uniforms.uLiveBladeTrail.value = 1;
      mat.uniforms.uDivineInkAtlas.value = this.divineInkAtlas;
      mat.uniforms.uDivineInkEnabled.value = this.divineInkAtlas &&
        (opts.palette === 'hinokami' || opts.palette === 'sun') ? 1 : 0;
      mat.uniforms.uDivineInkStart.value = this.elapsed;
    }

    const baseOp = opts.opacity ?? 0.98;
    configureMat(slot.backMat, baseOp * 0.94, 1.24);
    configureMat(slot.frontMat, baseOp, 1.38);

    slot.id = id;
    slot.active = true;
    slot.ending = false;
    slot.palette = opts.palette;
    slot.widthBoostPx = opts.widthBoostPx ?? 58;
    slot.fadeElapsed = 0;
    slot.tipTravelSinceEmission = 0;
    slot.fadeDuration = opts.fadeDuration ?? 0.24;
    slot.samples.length = 0;
    slot.backGeo.setDrawRange(0, 0);
    slot.frontGeo.setDrawRange(0, 0);
    slot.backGroup.visible = true;
    slot.frontGroup.visible = true;
  }

  public pushBladeTrailSample(id: string, sample: ArenaBladeSample): boolean {
    if (!this.renderer || this.disposed) return false;
    const slot = this.bladeTrailPool.find((entry) => entry.active && entry.id === id);
    if (!slot || slot.ending) return false;

    const previous = slot.samples.at(-1);
    const step = previous ? classifyBladeTrailStep(previous, sample) : 'break';
    if (step === 'duplicate') return false;
    if (step === 'break') {
      slot.samples.length = 0;
      slot.tipTravelSinceEmission = 0;
    }

    slot.samples.push({ ...sample });
    if (slot.samples.length > 22) slot.samples.shift();
    this.rebuildBladeTrailSlotGeometry(slot);
    if (!previous || step !== 'sweep') return true;

    const dx = sample.tipX - previous.tipX;
    const dy = sample.tipY - previous.tipY;
    slot.tipTravelSinceEmission += Math.hypot(dx, dy);
    if (slot.tipTravelSinceEmission >= 24) {
      slot.tipTravelSinceEmission %= 24;
      this.spawnElementalParticles({
        x: sample.tipX,
        y: sample.tipY,
        angle: Math.atan2(dy, dx),
        spread: 0.58,
        count: 3,
        speed: 168,
        palette: slot.palette,
        kind: slot.palette === 'water' ? 'water_droplet' :
          slot.palette === 'wind' ? 'wind_shard' : 'spark_needle',
      });
    }
    return true;
  }

  public endBladeTrail(id: string, immediateCut = false): void {
    const slot = this.bladeTrailPool.find((s) => s.active && s.id === id);
    if (!slot) return;
    slot.ending = true;
    if (immediateCut) {
      // Instant clean cutoff on dodge / stagger / parry / death (zero phantom trails!)
      slot.fadeDuration = 0.055;
      slot.fadeElapsed = Math.min(slot.fadeElapsed, 0.01);
    }
  }

  private rebuildBladeTrailSlotGeometry(slot: PooledBladeTrail): void {
    if (slot.samples.length < 2) {
      slot.backGeo.setDrawRange(0, 0);
      slot.frontGeo.setDrawRange(0, 0);
      return;
    }

    const backRes = writeSweptBladeRibbonBuffers(
      slot.samples,
      slot.backPos,
      slot.backUv,
      slot.backDepth,
      slot.backIdx,
      {
        subdivisions: 4,
        widthBoostPx: slot.widthBoostPx,
        rootInsetPx: 8,
        depthFilter: 'back',
        maxSpineSamples: slot.maxSpine,
      }
    );
    (slot.backGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (slot.backGeo.getAttribute('uv') as THREE.BufferAttribute).needsUpdate = true;
    if (slot.backGeo.index) slot.backGeo.index.needsUpdate = true;
    slot.backGeo.setDrawRange(0, backRes.indexCount);

    const frontRes = writeSweptBladeRibbonBuffers(
      slot.samples,
      slot.frontPos,
      slot.frontUv,
      slot.frontDepth,
      slot.frontIdx,
      {
        subdivisions: 4,
        widthBoostPx: slot.widthBoostPx,
        rootInsetPx: 8,
        depthFilter: 'front',
        maxSpineSamples: slot.maxSpine,
      }
    );
    (slot.frontGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (slot.frontGeo.getAttribute('uv') as THREE.BufferAttribute).needsUpdate = true;
    if (slot.frontGeo.index) slot.frontGeo.index.needsUpdate = true;
    slot.frontGeo.setDrawRange(0, frontRes.indexCount);
  }

  // ============================================================================
  // GROUND LIGHT BOUNCE & ELEMENTAL FLOOR INTEGRATION (MP4 ARENA INTEGRATION!)
  // ============================================================================

  public spawnGroundLightBounce(opts: {
    x: number;
    y: number;
    radius?: number;
    palette?: DemonSlayerVfxPalette;
    duration?: number;
    intensity?: number;
  }): void {
    if (!this.renderer || this.disposed) return;
    if (this.groundBounces.length >= 10) {
      const oldest = this.groundBounces.shift();
      if (oldest) {
        this.floorScene.remove(oldest.mesh);
        oldest.mesh.material.dispose();
      }
    }

    const palette = opts.palette ?? 'hinokami';
    const pal = RIBBON_PALETTES[palette];
    const mode = paletteModeIndex(palette);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: this.elapsed },
        uLife: { value: 0 },
        uMode: { value: mode },
        uCoreColor: { value: pal.core.clone() },
        uMidColor: { value: pal.glow.clone() },
        uInkColor: { value: pal.ink.clone() },
        uIntensity: { value: opts.intensity ?? 0.92 },
      },
      vertexShader: RIBBON_VERTEX_SHADER,
      fragmentShader: GROUND_BOUNCE_FRAGMENT_SHADER,
      transparent: true,
      premultipliedAlpha: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(this.groundBounceGeo, mat);
    mesh.position.z = -14;
    this.floorScene.add(mesh);

    this.groundBounces.push({
      mesh,
      worldX: opts.x,
      worldY: opts.y,
      radius: opts.radius ?? 155,
      life: 0,
      maxLife: opts.duration ?? 0.42,
    });
  }

  // ============================================================================
  // CORE ELEMENTAL SLASH RIBBON (NOW PAINTERLY ATLAS-DRIVEN WITH SILHOUETTE INK!)
  // ============================================================================

  public spawnSlashRibbon(opts: {
    x: number;
    y: number;
    angle: number;
    radius?: number;
    width?: number;
    arcSpan?: number;
    direction?: 1 | -1;
    palette?: DemonSlayerVfxPalette;
    duration?: number;
    tiltX?: number;
    tiltY?: number;
    spinRate?: number;
    withBackWrap?: boolean;
    painterlyAgni?: boolean;
    launchPull?: number;
    spectralGuardian?: boolean;
    openStrike?: boolean;
    opacity?: number;
  }): void {
    if (!this.renderer || this.disposed) return;
    if (this.ribbons.length >= 6) {
      const oldest = this.ribbons.shift();
      if (oldest) this.disposeRibbon(oldest);
    }

    const palette = opts.palette ?? 'hinokami';
    const pal = RIBBON_PALETTES[palette];
    const mode = paletteModeIndex(palette);
    const atlasTex = pickAtlasTextureForPalette(this.atlas, palette);
    const radius = opts.radius ?? 162;
    const width = opts.width ?? 74;
    const arcSpan = opts.openStrike ? Math.min(opts.arcSpan ?? 2.3, 2.75) : opts.arcSpan ?? 2.75;
    const direction = opts.direction ?? 1;

    const coreGeo = opts.spectralGuardian ? buildElementalStrokeGeometry('guardian', radius, 0)
      : buildCurvedRibbonGeometry(radius, width, arcSpan, direction, 30, opts.launchPull);
    const glowGeo = opts.openStrike ? coreGeo : opts.spectralGuardian
      ? buildElementalStrokeGeometry('guardian', radius, 1)
      : buildCurvedRibbonGeometry(radius, width * 1.38, arcSpan, direction, 30, opts.launchPull);

    const uvRepeat = mode === 2 ? 2.1 : mode === 3 ? 1.55 : 1.35;
    const scrollSpeed = mode === 2 ? 3.5 : 1.75;

    const coreMat = createRibbonMaterial(
      pal,
      mode,
      opts.opacity ?? 0.99,
      true,
      THREE.NormalBlending,
      1.36,
      atlasTex,
      uvRepeat,
      scrollSpeed
    );
    const glowMat = createRibbonMaterial(
      pal,
      mode,
      0.42,
      false,
      THREE.AdditiveBlending,
      1.42,
      atlasTex,
      uvRepeat,
      scrollSpeed
    );

    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.z = 2;

    const group = new THREE.Group();
    group.add(coreMesh, glowMesh);
    let agniSpine: ActiveWebglRibbon['agniSpine'];
    if (opts.openStrike) {
      coreMat.uniforms.uOpenStrike.value = 1;
      glowMesh.visible = false;
    }
    if (opts.spectralGuardian) {
      coreMat.uniforms.uCrestStyle.value = 3;
      glowMesh.visible = false;
    }
    if (opts.painterlyAgni) {
      coreMat.uniforms.uAgniPass.value = 1;
      glowMat.uniforms.uAgniPass.value = 2;
      glowMat.uniforms.uOpacity.value = 0.88;
      glowMesh.renderOrder = -1;
      glowMesh.position.z = 0;
      agniSpine = createAgniOpticalMesh(coreGeo, coreMat, 3);
      group.add(agniSpine);
    }
    this.scene.add(group);

    let backGroup: THREE.Group | undefined;
    let backMesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | undefined;
    if (opts.withBackWrap) {
      const backGeo = buildCurvedRibbonGeometry(radius * 0.94, width * 0.88, arcSpan * 0.72, -direction as 1 | -1, 24);
      const backMat = createRibbonMaterial(
        pal,
        mode,
        0.92,
        true,
        THREE.NormalBlending,
        1.18,
        atlasTex,
        uvRepeat,
        scrollSpeed
      );
      if (opts.painterlyAgni) backMat.uniforms.uAgniPass.value = 1;
      backMesh = new THREE.Mesh(backGeo, backMat);
      backGroup = new THREE.Group();
      backGroup.add(backMesh);
      this.backScene.add(backGroup);
    }

    this.ribbons.push({
      group,
      backGroup,
      coreMesh,
      agniSpine,
      glowMesh,
      backMesh,
      worldX: opts.x,
      worldY: opts.y,
      baseRotZ: -opts.angle,
      tiltX: opts.tiltX ?? 0.56,
      tiltY: opts.tiltY ?? (direction === 1 ? -0.16 : 0.16),
      spinRate: opts.spinRate ?? direction * 1.45,
      life: 0,
      maxLife: opts.duration ?? 0.36,
      scale: 1,
    });
  }

  // ============================================================================
  // ELEMENT 1: AGNI — HINOKAMI KAGURA / RENGOKU CONTINUOUS CALLIGRAPHIC FIRE RIVER
  // Completely replaces the old 13 floating chili-pepper blobs with wide, curling
  // painterly flame ribbons wrapping BEHIND & IN FRONT of Rudra + ground bounce!
  // ============================================================================

  public spawnAgniCrescent(opts: {
    x: number;
    y: number;
    angle: number;
    radius: number;
    duration: number;
    cast?: boolean;
    fromBlade?: boolean;
  }): void {
    const palette = 'hinokami';
    const reach = THREE.MathUtils.clamp(opts.radius, 128, opts.cast ? 220 : 187);
    this.spawnSlashRibbon({
      ...opts,
      radius: reach * 0.87,
      width: opts.cast ? 118 : 96,
      arcSpan: opts.cast ? 2.94 : 2.41,
      withBackWrap: opts.cast,
      tiltX: 0.38,
      tiltY: -0.15,
      spinRate: opts.fromBlade ? 0.42 : 0.7,
      launchPull: opts.fromBlade ? 0.48 : undefined,
      palette,
      painterlyAgni: true,
    });
    const tipX = opts.x + Math.cos(opts.angle) * reach * 0.62;
    const tipY = opts.y + Math.sin(opts.angle) * reach * 0.62;
    this.spawnGroundLightBounce({
      x: tipX, y: tipY + 22, radius: reach * 0.76,
      duration: 1.2, intensity: opts.cast ? 1.05 : 0.75, palette,
    });
    this.spawnElementalParticles({
      x: tipX, y: tipY, angle: opts.angle, spread: 1.75,
      count: 28, speed: opts.cast ? 340 : 260, kind: 'spark_needle', palette,
    });
    this.spawnElementalParticles({
      x: tipX, y: tipY, angle: opts.angle - 0.44, spread: 2.15,
      count: 12, speed: 124, kind: 'soot_flake', palette,
    });
  }

  public spawnSolarFlameWheel(opts: {
    x: number;
    y: number;
    angle?: number;
    radius?: number;
    palette?: DemonSlayerVfxPalette;
    duration?: number;
  }): void {
    if (!this.renderer || this.disposed) return;
    if (this.solarWheels.length >= 2) {
      const oldest = this.solarWheels.shift();
      if (oldest) this.disposeSolarWheel(oldest);
    }

    const palette = opts.palette ?? 'hinokami';
    const pal = RIBBON_PALETTES[palette];
    const flameTex = pickAtlasTextureForPalette(this.atlas, palette);
    const radius = (opts.radius ?? 225) * 1.24;
    const frontGroup = new THREE.Group();
    const backGroup = new THREE.Group();
    const mats: THREE.ShaderMaterial[] = [];
    const geos: THREE.BufferGeometry[] = [];

    // 1. Back-wrapping wide Hinokami combustion wave curling BEHIND Rudra's torso!
    const backGeo = buildCurvedRibbonGeometry(radius * 1.08, 118, Math.PI * 1.48, -1, 38);
    const backMat = createRibbonMaterial(
      pal,
      0,
      0.97,
      true,
      THREE.NormalBlending,
      1.48,
      flameTex,
      1.75,
      1.95
    );
    const backMesh = new THREE.Mesh(backGeo, backMat);
    backMesh.rotation.set(0.54, 0.22, Math.PI * 0.72);
    backGroup.add(backMesh);
    geos.push(backGeo);
    mats.push(backMat);

    // 2. Primary hero sweeping Hinokami fire-river ribbon (thick painterly S-curls + charcoal hollows + HDR core!)
    const heroGeo = buildCurvedRibbonGeometry(radius * 1.06, 134, Math.PI * 1.64, 1, 42);
    const heroMat = createRibbonMaterial(
      pal,
      0,
      0.99,
      true,
      THREE.NormalBlending,
      1.72,
      flameTex,
      1.85,
      2.2
    );
    const heroGlowMat = createRibbonMaterial(
      pal,
      0,
      0.56,
      false,
      THREE.AdditiveBlending,
      1.78,
      flameTex,
      1.85,
      2.2
    );
    const heroSub = new THREE.Group();
    const heroMesh = new THREE.Mesh(heroGeo, heroMat);
    const heroGlow = new THREE.Mesh(heroGeo, heroGlowMat);
    heroGlow.position.z = 3;
    heroGlow.scale.set(1.06, 1.06, 1);
    heroSub.add(heroMesh, heroGlow);
    heroSub.rotation.set(0.50, -0.18, 0.14);
    frontGroup.add(heroSub);
    geos.push(heroGeo);
    mats.push(heroMat, heroGlowMat);

    // 3. Secondary inner rising fire-crest crescent (staggered angle & depth for volumetric anime mass!)
    const innerGeo = buildCurvedRibbonGeometry(radius * 0.76, 92, Math.PI * 1.32, -1, 34);
    const innerMat = createRibbonMaterial(
      pal,
      0,
      0.97,
      true,
      THREE.NormalBlending,
      1.64,
      flameTex,
      1.45,
      2.45
    );
    const innerSub = new THREE.Group();
    innerSub.add(new THREE.Mesh(innerGeo, innerMat));
    innerSub.rotation.set(0.68, 0.28, -0.82);
    innerSub.position.z = 7;
    frontGroup.add(innerSub);
    geos.push(innerGeo);
    mats.push(innerMat);

    this.backScene.add(backGroup);
    this.scene.add(frontGroup);

    this.solarWheels.push({
      frontGroup,
      backGroup,
      mats,
      geos,
      worldX: opts.x,
      worldY: opts.y,
      baseAngle: -(opts.angle ?? 0),
      spinRate: 3.6,
      life: 0,
      maxLife: opts.duration ?? 0.62,
    });

    // Blazing HDR Hinokami ground light bounce illuminating the dark stone floor under Rudra!
    this.spawnGroundLightBounce({
      x: opts.x,
      y: opts.y + 24,
      radius: radius * 1.42,
      palette,
      duration: (opts.duration ?? 0.62) * 0.92,
      intensity: 1.25,
    });

    // Dark charcoal orbiting soot chunks (Tanjiro vs Rui / Rengoku vs Akaza contrast!)
    this.spawnElementalParticles({
      x: opts.x,
      y: opts.y,
      count: 22,
      speed: 360,
      palette,
      kind: 'soot_flake',
    });

    // Long razor-tapered blazing golden-orange ember streaks ripping across the frame!
    this.spawnElementalParticles({
      x: opts.x,
      y: opts.y,
      count: 32,
      speed: 620,
      palette,
      kind: 'spark_needle',
    });
  }

  // ============================================================================
  // ELEMENT 2: VARUNA — UKIYO-E HOKUSAI WATER DRAGON + CLAWED SEAFOAM WAKE + DROPLETS
  // ============================================================================

  public spawnWaterDragon(opts: {
    x: number;
    y: number;
    angle: number;
    radius?: number;
    duration?: number;
    fromBlade?: boolean;
  }): void {
    if (!this.renderer || this.disposed) return;
    if (this.waterDragons.length >= 4) {
      const oldest = this.waterDragons.shift();
      if (oldest) this.disposeWaterDragon(oldest);
    }

    const pal = RIBBON_PALETTES.water;
    const reach = THREE.MathUtils.clamp((opts.radius ?? 190) * 1.28, 138, 318);
    const frontGroup = new THREE.Group();
    const backGroup = new THREE.Group();
    const geos: THREE.BufferGeometry[] = [];
    const fadeMats: THREE.Material[] = [];
    const bodyMat = createRibbonMaterial(pal, 1, 0.98, false, THREE.NormalBlending);
    bodyMat.uniforms.uCrestStyle.value = 1;

    for (let lane = 0; lane < 3; lane++) {
      const geo = buildElementalStrokeGeometry('water', reach, lane, opts.fromBlade);
      const mat = lane === 0 ? bodyMat :
        createRibbonMaterial(pal, 1, lane === 1 ? 0.66 : 0.48, false, THREE.NormalBlending);
      mat.uniforms.uCrestStyle.value = 1;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = lane === 0 ? 1 : 0;
      (lane === 2 ? backGroup : frontGroup).add(mesh);
      geos.push(geo);
      if (lane !== 0) fadeMats.push(mat);
    }

    this.backScene.add(backGroup);
    this.scene.add(frontGroup);

    this.waterDragons.push({
      frontGroup,
      backGroup,
      bodyMat,
      fadeMats,
      geos,
      worldX: opts.x,
      worldY: opts.y,
      angle: opts.angle,
      speed: 135,
      reach, wakeStep: 0, fromBlade: opts.fromBlade ?? false,
      life: 0,
      maxLife: opts.duration ?? 0.74,
    });

  }

  private emitElementalWake(
    effect: ActiveWaterDragon | ActiveWindGale,
    element: 'water' | 'wind',
    progress: number,
    scale: number,
    travel = 0,
  ): void {
    const water = element === 'water';
    // Each patch is emitted once when the visible crest reaches that part of the curve.
    while (effect.wakeStep < 5 && progress >= 0.07 + effect.wakeStep * 0.062) {
      const step = effect.wakeStep++;
      const along = 0.24 + step * 0.16;
      const stroke = sampleElementalStroke(element, along, effect.reach, 0, effect.fromBlade);
      const next = sampleElementalStroke(element, along + 0.02, effect.reach, 0, effect.fromBlade);
      const cos = Math.cos(effect.angle);
      const sin = Math.sin(effect.angle);
      const x = effect.worldX + cos * travel + (stroke.x * cos + stroke.y * sin) * scale;
      const y = effect.worldY + sin * travel + (stroke.x * sin - stroke.y * cos) * scale;
      const tangent = effect.angle + Math.atan2(stroke.y - next.y, next.x - stroke.x);
      this.spawnElementalParticles({
        x, y: y + (water ? 6 : 26),
        angle: tangent + (water ? -0.36 : 0.48),
        spread: water ? 1.28 : 0.88,
        count: water ? 8 : 9,
        speed: water ? 155 + step * 23 : 88 + step * 15,
        palette: element,
        kind: water ? 'water_droplet' : 'dust_mote',
      });
      if (water && (step === 1 || step === 4)) {
        this.spawnGroundLightBounce({
          x, y: y + 21, radius: 62 + step * 8, palette: 'water',
          duration: 0.39, intensity: 0.35 + step * 0.060,
        });
      }
    }
  }

  // ============================================================================
  // ELEMENT 4: VAJRA — ZENITSU CONNECTED BRANCHING LIGHTNING + SHATTERED STONE DEBRIS
  // Zero floating twigs: every branch welds directly into its parent elbow with
  // a bright overlapping flash cap + cracked electric floor veins!
  // ============================================================================

  public spawnVajraCharge(x: number, y: number, angle: number): void {
    this.spawnGroundLightBounce({
      x, y: y + 15, radius: 73, palette: 'thunder', duration: 0.27, intensity: 0.78,
    });
    this.spawnElementalParticles({
      x, y, angle, spread: 2.5, count: 9, speed: 78, palette: 'thunder', kind: 'rock_shard',
    });
    this.spawnThunderZigzag({
      x1: x - Math.cos(angle) * 22, y1: y - Math.sin(angle) * 15,
      x2: x + Math.cos(angle) * 31, y2: y + Math.sin(angle) * 20 - 17,
      duration: 0.13, width: 8, focused: true, withFloorRing: false,
    });
  }

  public spawnThunderZigzag(opts: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    palette?: DemonSlayerVfxPalette;
    duration?: number;
    width?: number;
    withFloorRing?: boolean;
    focused?: boolean;
    delay?: number;
  }): void {
    if (!this.renderer || this.disposed) return;
    if (this.thunderBolts.length >= 6) {
      const oldest = this.thunderBolts.shift();
      if (oldest) this.disposeThunder(oldest);
    }

    const pal = RIBBON_PALETTES[opts.palette ?? 'thunder'];
    const dx = opts.x2 - opts.x1;
    const dy = -(opts.y2 - opts.y1);
    const boltDist = Math.max(80, Math.hypot(dx, dy));
    const seed = this.elapsed * 19 + this.thunderBolts.length * 3.7 + 1.3;
    const mainPts = computeThunderZigzagVertices(
      0,
      0,
      dx,
      dy,
      boltDist > 220 ? 6 : 5,
      opts.focused ? Math.min(23, boltDist * 0.075) : Math.min(62, Math.max(30, boltDist * 0.19)),
      seed
    );
    const forks = computeThunderForkedBranches(mainPts, seed, opts.focused);
    const branches = opts.focused ? forks.filter((_, i) => i % 2 === 0) : forks;

    const group = new THREE.Group();
    const shaderMats: THREE.ShaderMaterial[] = [];
    const mats: THREE.MeshBasicMaterial[] = [];
    const starGroups: THREE.Group[] = [];
    const geos: THREE.BufferGeometry[] = [];
    const boltW = opts.focused ? THREE.MathUtils.clamp(opts.width ?? 14, 8, 18) : Math.max(24, opts.width ?? 32);

    const createBoltShaderMat = (
      isHalo: boolean,
      isBranch: boolean,
      subSeed: number,
      opacity: number,
      branchDelay = 0
    ): THREE.ShaderMaterial =>
      new THREE.ShaderMaterial({
        vertexShader: RIBBON_VERTEX_SHADER,
        fragmentShader: THUNDER_BOLT_FRAGMENT_SHADER,
        uniforms: {
          uTime: { value: this.elapsed },
          uLife: { value: 0 },
          uSeed: { value: subSeed },
          uOpacity: { value: opacity },
          uIsHalo: { value: isHalo ? 1.0 : 0.0 },
          uIsBranch: { value: isBranch ? 1.0 : 0.0 },
          uBranchDelay: { value: branchDelay },
          uCoreColor: { value: new THREE.Color('#ffffff') },
          uGoldColor: { value: pal.mid.clone() },
          uCyanColor: { value: pal.edge.clone() },
          uInkColor: { value: pal.ink.clone() },
        },
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: isHalo ? THREE.AdditiveBlending : THREE.NormalBlending,
      });

    // Layer 1: Bold primary whip-tapered angular Zenitsu plasma bolt trunk + outer corona
    const mainHaloGeo = buildTaperedThunderRibbonGeometry(mainPts, boltW * 2.35, boltW * 0.95, 17);
    const mainCoreGeo = buildTaperedThunderRibbonGeometry(mainPts, boltW * 1.38, boltW * 0.56, 21);
    const mainHaloMat = createBoltShaderMat(true, false, seed, 0.85);
    const mainCoreMat = createBoltShaderMat(false, false, seed, 1.0);
    geos.push(mainHaloGeo, mainCoreGeo);
    shaderMats.push(mainHaloMat, mainCoreMat);
    group.add(new THREE.Mesh(mainHaloGeo, mainHaloMat), new THREE.Mesh(mainCoreGeo, mainCoreMat));

    // Layer 2: Strictly CONNECTED forked crackling sub-arcs welded onto each interior elbow vertex!
    branches.forEach((bPts, idx) => {
      const bWidth = Math.max(opts.focused ? 3 : 13, boltW * ((opts.focused ? 0.45 : 0.68) - idx * 0.04));
      const bHaloGeo = buildTaperedThunderRibbonGeometry(bPts, bWidth * 2.1, opts.focused ? 2.4 : 5.0, 18);
      const bCoreGeo = buildTaperedThunderRibbonGeometry(bPts, bWidth, opts.focused ? 1.2 : 3.2, 22);
      const branchRoot = mainPts.findIndex((point) => point.x === bPts[0].x && point.y === bPts[0].y);
      const branchDelay = 0.025 + 0.14 * Math.max(0, branchRoot) / (mainPts.length - 1);
      const bHaloMat = createBoltShaderMat(true, true, seed + 11.4 * (idx + 1), 0.63, branchDelay);
      const bCoreMat = createBoltShaderMat(false, true, seed + 11.4 * (idx + 1), 0.88, branchDelay);
      geos.push(bHaloGeo, bCoreGeo);
      shaderMats.push(bHaloMat, bCoreMat);
      group.add(new THREE.Mesh(bHaloGeo, bHaloMat), new THREE.Mesh(bCoreGeo, bCoreMat));
    });

    // Layer 2b: Hairline secondary plasma whip arc shadowing the main trunk for 8K Zenitsu crackle density
    const hairlinePts = computeThunderZigzagVertices(
      0,
      0,
      dx,
      dy,
      7,
      opts.focused ? Math.min(36, boltDist * 0.12) : Math.min(76, Math.max(38, boltDist * 0.24)),
      seed + 29.7
    );
    const hairlineGeo = buildTaperedThunderRibbonGeometry(hairlinePts, boltW * 0.42, boltW * 0.16, 23);
    const hairlineMat = createBoltShaderMat(false, false, seed + 29.7, 0.94);
    geos.push(hairlineGeo);
    shaderMats.push(hairlineMat);
    group.add(new THREE.Mesh(hairlineGeo, hairlineMat));

    // Layer 3: Sleek Tapered Diamond Anamorphic Plasma Cross-Flares ONLY at origin & impact tip
    // (zero blunt square ends or chunky clipart stars!)
    const flareBeamH = buildTaperedDiamondLensFlareGeometry(boltW * 5.6, boltW * 0.34);
    const flareBeamV = buildTaperedDiamondLensFlareGeometry(boltW * 3.0, boltW * 0.24);
    const flareGlowH = buildTaperedDiamondLensFlareGeometry(boltW * 6.8, boltW * 0.92);
    geos.push(flareBeamH, flareBeamV, flareGlowH);

    const flareGlowMat = new THREE.MeshBasicMaterial({
      color: pal.mid.clone().lerp(pal.edge, 0.35).multiplyScalar(1.6),
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const flareCoreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffffff').multiplyScalar(1.75),
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    mats.push(flareGlowMat, flareCoreMat);

    const boltAngle = Math.atan2(dy, dx);
    for (const idx of opts.focused ? [mainPts.length - 1] : [0, mainPts.length - 1]) {
      const pt = mainPts[idx];
      const isImpactTip = idx === mainPts.length - 1;
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(pt.x, pt.y, 24);
      nodeGroup.scale.setScalar(isImpactTip ? 1.48 : 0.85);
      nodeGroup.rotation.z = boltAngle + (isImpactTip ? 0.18 : -0.12);

      const gH = new THREE.Mesh(flareGlowH, flareGlowMat);
      gH.position.z = 0;
      const cH = new THREE.Mesh(flareBeamH, flareCoreMat);
      cH.position.z = 1;
      const cV = new THREE.Mesh(flareBeamV, flareCoreMat);
      cV.rotation.z = Math.PI * 0.5;
      cV.position.z = 1;
      nodeGroup.add(gH, cH, cV);
      group.add(nodeGroup);
      starGroups.push(nodeGroup);
    }

    const releaseDebris = opts.withFloorRing === false ? undefined : () => {
      this.spawnGroundLightBounce({
        x: opts.x2,
        y: opts.y2 + 12,
        radius: opts.focused ? 105 : Math.max(150, Math.min(250, boltDist * 0.62)),
        palette: 'thunder',
        duration: 0.54,
        intensity: 1.35,
      });
      this.spawnElementalParticles({
        x: opts.x2,
        y: opts.y2,
        count: 18,
        speed: opts.focused ? 235 : 480,
        palette: 'thunder',
        kind: 'rock_shard',
      });
      this.spawnElementalParticles({
        x: opts.x2,
        y: opts.y2 - 8,
        count: 26,
        speed: 620,
        palette: 'thunder',
        kind: 'spark_needle',
      });
    };
    const delay = Math.max(0, opts.delay ?? 0);
    group.visible = delay === 0;
    if (delay === 0) releaseDebris?.();

    this.scene.add(group);
    this.thunderBolts.push({
      group,
      shaderMats,
      mats,
      starGroups,
      geos,
      worldX: opts.x1,
      worldY: opts.y1,
      life: -delay,
      releaseDebris: delay > 0 ? releaseDebris : undefined,
      maxLife: opts.duration ?? 0.56,
    });
  }

  /**
   * Subtle 4-point anime blade-edge startup glint on Rudra's Parashu axe head during windup
   */
  public spawnBladeGlint(opts: {
    x: number;
    y: number;
    palette?: DemonSlayerVfxPalette;
    scale?: number;
  }): void {
    if (!this.renderer || this.disposed) return;
    if (this.starbursts.length >= 6) {
      const oldest = this.starbursts.shift();
      if (oldest) this.disposeStarburst(oldest);
    }
    const pal = RIBBON_PALETTES[opts.palette ?? 'sun'];
    const group = new THREE.Group();
    const mats: THREE.MeshBasicMaterial[] = [];
    const geos: THREE.BufferGeometry[] = [];

    const outerGeo = buildStarburstPolygonGeometry(4, 34, 4.5);
    const outerMat = new THREE.MeshBasicMaterial({
      color: pal.mid.clone().multiplyScalar(1.35),
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.rotation.z = 0.22;
    outerMesh.position.z = 26;

    const coreGeo = buildStarburstPolygonGeometry(4, 22, 3.2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: pal.core.clone().multiplyScalar(1.5),
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.rotation.z = 0.22;
    coreMesh.position.z = 27;

    group.add(outerMesh, coreMesh);
    mats.push(outerMat, coreMat);
    geos.push(outerGeo, coreGeo);

    this.scene.add(group);
    this.starbursts.push({
      group,
      mats,
      geos,
      worldX: opts.x,
      worldY: opts.y,
      maxScale: opts.scale ?? 0.68,
      life: 0,
      maxLife: 0.15,
    });
  }

  public spawnWindGaleSweep(opts: {
    x: number;
    y: number;
    angle: number;
    radius?: number;
    duration?: number;
    fromBlade?: boolean;
  }): void {
    if (!this.renderer || this.disposed) return;
    if (this.windGales.length >= 2) {
      const oldest = this.windGales.shift();
      if (oldest) this.disposeWindGale(oldest);
    }

    const reach = THREE.MathUtils.clamp((opts.radius ?? 230) * 0.92, 116, 256);
    const geometry = buildElementalStrokeGeometry('wind', reach, 0, opts.fromBlade);
    const material = createRibbonMaterial(RIBBON_PALETTES.wind, 3, 0.98, false, THREE.NormalBlending);
    material.uniforms.uCrestStyle.value = 2;
    const sweep = new THREE.Mesh(geometry, material);
    sweep.rotation.z = -opts.angle;
    this.scene.add(sweep);
    this.windGales.push({
      sweep, angle: opts.angle, worldX: opts.x, worldY: opts.y, reach, wakeStep: 0, fromBlade: opts.fromBlade ?? false,
      life: 0, maxLife: opts.duration ?? 0.62,
    });

    const x = opts.x + Math.cos(opts.angle) * reach * 0.66;
    const y = opts.y + Math.sin(opts.angle) * reach * 0.66;
    this.spawnGroundLightBounce({
      x, y: y + 20, radius: 90, palette: 'wind', duration: 0.43, intensity: 0.46,
    });
  }

  /**
   * Akaza Destructive Death: Compass Needle — 12-Point Glowing Snowflake Floor Mandala + Light Columns
   */
  public spawnCompassMandala(opts: {
    x: number;
    y: number;
    radius?: number;
    palette?: DemonSlayerVfxPalette;
    duration?: number;
  }): void {
    if (!this.renderer || this.disposed) return;
    if (this.mandalas.length >= 4) {
      const oldest = this.mandalas.shift();
      if (oldest) this.disposeMandala(oldest);
    }

    const pal = RIBBON_PALETTES[opts.palette ?? 'bronze'];
    const radius = opts.radius ?? 230;
    const group = new THREE.Group();
    const geos: THREE.BufferGeometry[] = [];

    const mandalaMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uLife: { value: 0 },
        uPrimaryColor: { value: pal.mid.clone() },
        uEdgeColor: { value: pal.edge.clone() },
        uCoreColor: { value: pal.core.clone() },
      },
      vertexShader: RIBBON_VERTEX_SHADER,
      fragmentShader: COMPASS_MANDALA_FRAGMENT_SHADER,
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const planeGeo = new THREE.PlaneGeometry(radius * 2, radius * 2);
    geos.push(planeGeo);
    const floorDisc = new THREE.Mesh(planeGeo, mandalaMat);
    floorDisc.scale.set(1, 0.58, 1);
    floorDisc.position.z = -12;
    group.add(floorDisc);

    const beamGeo = new THREE.PlaneGeometry(54, radius * 1.05);
    geos.push(beamGeo);
    const beamMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.45 },
        uColor: { value: pal.mid.clone() },
      },
      vertexShader: RIBBON_VERTEX_SHADER,
      fragmentShader: VOLUMETRIC_BEAM_FRAGMENT_SHADER,
      transparent: true,
      premultipliedAlpha: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(
        Math.cos(a) * radius * 0.66,
        Math.sin(a) * radius * 0.66 * 0.58 + radius * 0.44,
        -6
      );
      group.add(beam);
    }

    this.floorScene.add(group);
    this.mandalas.push({
      group,
      mandalaMat,
      beamMat,
      geos,
      worldX: opts.x,
      worldY: opts.y,
      radius,
      life: 0,
      maxLife: opts.duration ?? 1.45,
    });
  }

  /**
   * Rui Lower Five: 3D Crisscrossing Crimson Blood Thread Cage
   */
  public spawnBloodThreadCage(opts: {
    x: number;
    y: number;
    radius?: number;
    palette?: DemonSlayerVfxPalette;
    duration?: number;
    threadCount?: number;
  }): void {
    if (!this.renderer || this.disposed) return;
    if (this.bloodCages.length >= 4) {
      const oldest = this.bloodCages.shift();
      if (oldest) this.disposeBloodCage(oldest);
    }

    const pal = RIBBON_PALETTES[opts.palette ?? 'blood'];
    const radius = opts.radius ?? 230;
    const count = Math.max(8, Math.min(18, opts.threadCount ?? 14));
    const group = new THREE.Group();
    const mats: THREE.MeshBasicMaterial[] = [];
    const geos: THREE.BufferGeometry[] = [];

    const inkMat = new THREE.MeshBasicMaterial({
      color: pal.ink,
      transparent: true,
      opacity: 0.90,
      depthWrite: false,
    });
    const threadMat = new THREE.MeshBasicMaterial({
      color: pal.mid.clone().multiplyScalar(1.85),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coreMat = new THREE.MeshBasicMaterial({
      color: pal.core.clone().multiplyScalar(1.9),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    mats.push(inkMat, threadMat, coreMat);

    for (let i = 0; i < count; i++) {
      const a1 = (i / count) * Math.PI * 2 + 0.15;
      const a2 = a1 + Math.PI * (0.62 + (i % 3) * 0.24);
      const x1 = Math.cos(a1) * radius;
      const y1 = Math.sin(a1) * radius * 0.68;
      const x2 = Math.cos(a2) * radius;
      const y2 = Math.sin(a2) * radius * 0.68;
      const len = Math.max(24, Math.hypot(x2 - x1, y2 - y1));
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const mx = (x1 + x2) * 0.5;
      const my = (y1 + y2) * 0.5;

      const inkGeo = new THREE.PlaneGeometry(len, 7.5);
      const lineGeo = new THREE.PlaneGeometry(len, 4.2);
      const hotGeo = new THREE.PlaneGeometry(len, 1.8);
      geos.push(inkGeo, lineGeo, hotGeo);

      const mInk = new THREE.Mesh(inkGeo, inkMat);
      mInk.position.set(mx, my, 8);
      mInk.rotation.z = ang;

      const mLine = new THREE.Mesh(lineGeo, threadMat);
      mLine.position.set(mx, my, 10);
      mLine.rotation.z = ang;

      const mHot = new THREE.Mesh(hotGeo, coreMat);
      mHot.position.set(mx, my, 12);
      mHot.rotation.z = ang;

      group.add(mInk, mLine, mHot);
    }

    this.scene.add(group);
    this.bloodCages.push({
      group,
      mats,
      geos,
      worldX: opts.x,
      worldY: opts.y,
      life: 0,
      maxLife: opts.duration ?? 0.92,
    });
  }

  /**
   * Ufotable Anamorphic Weapon-Clash & Perfect Parry Cross-Flare!
   * Sleek razor lens needles + pitch-black sumi-e diamond core (zero clipart asterisk!).
   */
  public spawnClashStarburst(opts: {
    x: number;
    y: number;
    scale?: number;
    palette?: DemonSlayerVfxPalette;
    duration?: number;
    angle?: number;
  }): void {
    if (!this.renderer || this.disposed) return;
    if (this.starbursts.length >= 10) {
      const oldest = this.starbursts.shift();
      if (oldest) this.disposeStarburst(oldest);
    }

    const pal = RIBBON_PALETTES[opts.palette ?? 'sun'];
    const group = new THREE.Group();
    const mats: THREE.MeshBasicMaterial[] = [];
    const geos: THREE.BufferGeometry[] = [];
    const rot = opts.angle === undefined ? -0.18 : -opts.angle + 0.18;

    // 1. Crisp pitch-black Sumi-e 4-point diamond ink core
    const inkGeo = buildStarburstPolygonGeometry(4, 52, 8);
    const inkMat = new THREE.MeshBasicMaterial({
      color: 0x09080f,
      transparent: true,
      opacity: 0.94,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const inkMesh = new THREE.Mesh(inkGeo, inkMat);
    inkMesh.rotation.z = rot;
    inkMesh.position.z = 24;

    // 2. Wide tapered diamond anamorphic horizontal & counter-diagonal saturated elemental flare needles
    const beamHGeo = buildTaperedDiamondLensFlareGeometry(250, 22);
    const beamDGeo = buildTaperedDiamondLensFlareGeometry(156, 14);
    const midMat = new THREE.MeshBasicMaterial({
      color: pal.mid.clone().multiplyScalar(1.65),
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beamH = new THREE.Mesh(beamHGeo, midMat);
    beamH.rotation.z = rot;
    beamH.position.z = 25;
    const beamD = new THREE.Mesh(beamDGeo, midMat);
    beamD.rotation.z = rot + 1.18;
    beamD.position.z = 25;

    // 3. Blinding white-hot razor diamond needle core (pinpoint tips!)
    const coreHGeo = buildTaperedDiamondLensFlareGeometry(216, 7);
    const coreVGeo = buildTaperedDiamondLensFlareGeometry(118, 6);
    const coreMat = new THREE.MeshBasicMaterial({
      color: pal.core.clone().multiplyScalar(1.85),
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const coreH = new THREE.Mesh(coreHGeo, coreMat);
    coreH.rotation.z = rot;
    coreH.position.z = 26;
    const coreV = new THREE.Mesh(coreVGeo, coreMat);
    coreV.rotation.z = rot + 1.18;
    coreV.position.z = 26;

    group.add(inkMesh, beamH, beamD, coreH, coreV);
    mats.push(inkMat, midMat, coreMat);
    geos.push(inkGeo, beamHGeo, beamDGeo, coreHGeo, coreVGeo);

    this.scene.add(group);
    this.starbursts.push({
      group,
      mats,
      geos,
      worldX: opts.x,
      worldY: opts.y,
      maxScale: opts.scale ?? 1.28,
      life: 0,
      maxLife: opts.duration ?? 0.24,
    });
  }

  /**
   * Two-Sided Boss Warfare: Gyutaro-style Crimson-and-Black Serrated Blood Demon Art Sickles!
   */
  public spawnBloodDemonSlash(opts: {
    x: number;
    y: number;
    angle: number;
    radius?: number;
    duration?: number;
  }): void {
    if (!this.renderer || this.disposed) return;
    const radius = opts.radius ?? 235;
    const dur = opts.duration ?? 0.48;
    this.spawnSlashRibbon({
      x: opts.x,
      y: opts.y - 22,
      angle: opts.angle,
      radius,
      width: 98,
      arcSpan: 2.95,
      direction: 1,
      palette: 'blood',
      duration: dur,
      withBackWrap: true,
    });
    this.spawnSlashRibbon({
      x: opts.x,
      y: opts.y - 16,
      angle: opts.angle + 0.35,
      radius: radius * 0.84,
      width: 72,
      arcSpan: 2.45,
      direction: -1,
      palette: 'void',
      duration: dur * 0.9,
      withBackWrap: false,
    });
    this.spawnGroundLightBounce({
      x: opts.x,
      y: opts.y + 12,
      radius: radius * 1.3,
      palette: 'blood',
      duration: dur * 1.15,
      intensity: 1.22,
    });
    this.spawnElementalParticles({
      x: opts.x,
      y: opts.y - 18,
      count: 24,
      speed: 560,
      palette: 'blood',
      kind: 'spark_needle',
    });
  }

  /**
   * Two-Sided Boss Warfare: Akaza-style Destructive Death Electric-Cyan Shockwave Burst!
   */
  public spawnAkazaShockwavePulse(opts: {
    x: number;
    y: number;
    radius?: number;
    duration?: number;
  }): void {
    if (!this.renderer || this.disposed) return;
    const radius = opts.radius ?? 240;
    const dur = opts.duration ?? 0.46;
    this.spawnShockwaveRing({
      x: opts.x,
      y: opts.y + 8,
      radius,
      palette: 'bronze',
      duration: dur,
    });
    this.spawnClashStarburst({
      x: opts.x,
      y: opts.y - 24,
      scale: 1.5,
      palette: 'bronze',
      duration: 0.28,
    });
    this.spawnGroundLightBounce({
      x: opts.x,
      y: opts.y + 12,
      radius: radius * 1.38,
      palette: 'bronze',
      duration: dur * 1.2,
      intensity: 1.32,
    });
    this.spawnElementalParticles({
      x: opts.x,
      y: opts.y - 18,
      count: 26,
      speed: 600,
      palette: 'bronze',
      kind: 'spark_needle',
    });
  }

  /**
   * Ufotable Sumi-e Cel Ground Shockwave Ring + Companion Ground Light Bounce!
   */
  public spawnShockwaveRing(opts: {
    x: number;
    y: number;
    radius?: number;
    palette?: DemonSlayerVfxPalette;
    duration?: number;
  }): void {
    if (!this.renderer || this.disposed) return;
    if (this.shockwaveRings.length >= 10) {
      const oldest = this.shockwaveRings.shift();
      if (oldest) this.disposeShockwaveRing(oldest);
    }
    const palette = opts.palette ?? 'hinokami';
    const pal = RIBBON_PALETTES[palette];
    const mode = paletteModeIndex(palette);
    const atlasTex = pickAtlasTextureForPalette(this.atlas, palette);
    const radius = opts.radius ?? 145;

    // Always pair with elemental ground light bounce so the arena floor lights up!
    this.spawnGroundLightBounce({
      x: opts.x,
      y: opts.y,
      radius: radius * 1.18,
      palette,
      duration: (opts.duration ?? 0.38) * 1.15,
      intensity: 0.85,
    });

    const inkGeo = buildCurvedRibbonGeometry(radius, 36, Math.PI * 1.96, 1, 30);
    const coreGeo = buildCurvedRibbonGeometry(radius, 28, Math.PI * 1.96, 1, 30);
    const inkMat = createRibbonMaterial(pal, mode, 0.82, true, THREE.NormalBlending, 0.25, null);
    inkMat.uniforms.uCoreColor.value.copy(pal.ink);
    inkMat.uniforms.uMidColor.value.copy(pal.ink);
    inkMat.uniforms.uEdgeColor.value.copy(pal.ink);
    const coreMat = createRibbonMaterial(
      pal,
      mode,
      0.96,
      true,
      THREE.NormalBlending,
      1.32,
      atlasTex,
      2.0,
      1.6
    );

    const group = new THREE.Group();
    const inkMesh = new THREE.Mesh(inkGeo, inkMat);
    inkMesh.position.z = -2;
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(inkMesh, coreMesh);
    this.floorScene.add(group);

    this.shockwaveRings.push({
      group,
      inkMat,
      coreMat,
      geos: [inkGeo, coreGeo],
      worldX: opts.x,
      worldY: opts.y,
      life: 0,
      maxLife: opts.duration ?? 0.38,
    });
  }

  public spawnCycloneVortex(opts: {
    x: number;
    y: number;
    radius?: number;
    palette?: DemonSlayerVfxPalette;
    duration?: number;
    ringCount?: number;
  }): void {
    if (!this.renderer || this.disposed) return;
    if (this.cyclones.length >= 6) {
      const oldest = this.cyclones.shift();
      if (oldest) this.disposeCyclone(oldest);
    }

    const palette = opts.palette ?? 'wind';
    const pal = RIBBON_PALETTES[palette];
    const mode = paletteModeIndex(palette);
    const atlasTex = pickAtlasTextureForPalette(this.atlas, palette);
    const maxRadius = opts.radius ?? 215;
    const count = Math.max(2, Math.min(4, opts.ringCount ?? 3));

    const group = new THREE.Group();
    const rings: ActiveWebglCyclone['rings'] = [];
    for (let i = 0; i < count; i++) {
      const torus = new THREE.TorusGeometry(maxRadius * (0.58 + i * 0.22), 24 + i * 7, 8, 36);
      const mat = createRibbonMaterial(
        pal,
        mode,
        0.94 - i * 0.08,
        true,
        THREE.NormalBlending,
        1.32,
        atlasTex,
        2.0,
        2.2
      );
      const mesh = new THREE.Mesh(torus, mat);
      mesh.rotation.set(0.88 + i * 0.18, (i - 1) * 0.35, i * 1.1);
      group.add(mesh);
      rings.push({
        mesh,
        spinX: (i % 2 === 0 ? 1 : -1) * 1.4,
        spinY: (i - 1) * 1.8,
        spinZ: (i % 2 === 0 ? 1 : -1) * (5.2 + i * 1.6),
      });
    }
    this.scene.add(group);

    this.cyclones.push({
      group,
      rings,
      worldX: opts.x,
      worldY: opts.y,
      life: 0,
      maxLife: opts.duration ?? 0.58,
      maxRadius,
    });
  }

  // ============================================================================
  // POOLED INSTANCED ELEMENTAL PARTICLES (ZERO PER-SPARK ALLOCATIONS!)
  // ============================================================================

  public spawnElementalParticles(opts: {
    x: number;
    y: number;
    count?: number;
    speed?: number;
    palette?: DemonSlayerVfxPalette;
    kind?: ElementalParticleKind;
    angle?: number;
    spread?: number;
  }): void {
    if (!this.renderer || this.disposed || this.particleSlots.length === 0) return;

    const palette = opts.palette ?? 'hinokami';
    const pal = RIBBON_PALETTES[palette];
    const kind: ElementalParticleKind =
      opts.kind ??
      (palette === 'water'
        ? 'water_droplet'
        : palette === 'wind'
          ? 'wind_shard'
          : 'spark_needle');
    const maxCap = QUALITY_PARTICLE_CAP[this.qualityPreset];
    const desired = Math.min(34, Math.max(1, Math.round(opts.count ?? 14)));
    const baseSpeed = opts.speed ?? 400;

    let spawned = 0;
    for (let i = 0; i < maxCap && spawned < desired; i++) {
      const slot = this.particleSlots[i];
      if (slot.active) continue;

      const ang =
        opts.angle !== undefined
          ? opts.angle + (Math.random() - 0.5) * (opts.spread ?? 1.4)
          : (spawned / desired) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const spd = baseSpeed * (0.52 + Math.random() * 0.88);

      slot.active = true;
      slot.kind = kind;
      slot.worldX = opts.x + (Math.random() - 0.5) * 14;
      slot.worldY = opts.y + (Math.random() - 0.5) * 10;
      slot.vx = Math.cos(ang) * spd;
      slot.vy = Math.sin(ang) * spd * 0.72;
      slot.z = 10 + Math.random() * 14;
      slot.vz =
        kind === 'rock_shard'
          ? 180 + Math.random() * 200
          : kind === 'soot_flake'
            ? 85 + Math.random() * 140
            : 100 + Math.random() * 160;
      slot.gravity =
        kind === 'rock_shard'
          ? 680
          : kind === 'water_droplet'
            ? 520
            : kind === 'soot_flake'
              ? 65
              : 240;
      slot.drag = kind === 'rock_shard' ? 1.8 : kind === 'soot_flake' ? 2.1 : 2.8;
      slot.rot = -ang;
      slot.rotSpeed =
        kind === 'rock_shard' || kind === 'wind_shard' || kind === 'soot_flake'
          ? (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 8)
          : 0;
      slot.alignToVelocity = kind === 'spark_needle' || kind === 'water_droplet';
      slot.life = 0;

      if (kind === 'water_droplet') {
        const s = 14 + Math.random() * 13;
        slot.scaleX = s;
        slot.scaleY = s * 1.28;
        slot.maxLife = 0.36 + Math.random() * 0.26;
        const c = spawned % 2 === 0 ? pal.core : pal.mid;
        slot.r = c.r * 1.15;
        slot.g = c.g * 1.15;
        slot.b = c.b * 1.15;
      } else if (kind === 'soot_flake') {
        const s = 12 + Math.random() * 16;
        slot.scaleX = s * 1.22;
        slot.scaleY = s * 0.72;
        slot.maxLife = 0.52 + Math.random() * 0.36;
        // Dark volcanic charcoal soot flakes contrasting against blazing Hinokami flames!
        slot.r = 0.11;
        slot.g = 0.06;
        slot.b = 0.06;
      } else if (kind === 'rock_shard') {
        const s = 14 + Math.random() * 15;
        slot.scaleX = s;
        slot.scaleY = s * 0.84;
        slot.maxLife = 0.40 + Math.random() * 0.26;
        // Slate stone shards with subtle golden-electric rim tint
        slot.r = 0.85;
        slot.g = 0.82;
        slot.b = 0.74;
      } else if (kind === 'dust_mote') {
        const wind = opts.palette === 'wind';
        const size = (wind ? 11 : 7) + Math.random() * 9;
        slot.scaleX = size * (wind ? 1.85 : 1.50);
        slot.scaleY = size * 0.58;
        slot.vz = 28 + Math.random() * 55;
        slot.gravity = 120;
        slot.drag = 3.8;
        slot.rotSpeed = (Math.random() - 0.5) * 5;
        slot.maxLife = (wind ? 0.46 : 0.31) + Math.random() * 0.24;
        slot.r = wind ? 0.72 : 0.44;
        slot.g = wind ? 0.76 : 0.53;
        slot.b = wind ? 0.53 : 0.37;
      } else if (kind === 'wind_shard') {
        const s = 18 + Math.random() * 14;
        slot.scaleX = s * 1.45;
        slot.scaleY = s * 0.58;
        slot.maxLife = 0.32 + Math.random() * 0.22;
        // Pitch-black sumi-e & dark jade wind tear shards!
        slot.r = spawned % 3 === 0 ? 0.16 : 0.06;
        slot.g = spawned % 3 === 0 ? 0.96 : 0.14;
        slot.b = spawned % 3 === 0 ? 0.55 : 0.10;
      } else {
        // Long high-velocity Ufotable horizontal/radial blazing ember streak needle!
        slot.scaleX = 40 + Math.random() * 38;
        slot.scaleY = 6.5 + Math.random() * 3.0;
        slot.maxLife = 0.24 + Math.random() * 0.24;
        const c = spawned % 3 === 0 ? pal.core : pal.mid;
        slot.r = c.r * 1.45;
        slot.g = c.g * 1.45;
        slot.b = c.b * 1.45;
      }

      spawned++;
    }
  }

  public spawnSparkBurst(opts: {
    x: number;
    y: number;
    count?: number;
    speed?: number;
    palette?: DemonSlayerVfxPalette;
  }): void {
    const palette = opts.palette ?? 'hinokami';
    const kind: ElementalParticleKind =
      palette === 'water' ? 'water_droplet' : 'spark_needle';
    this.spawnElementalParticles({
      x: opts.x,
      y: opts.y,
      count: opts.count ?? 14,
      speed: opts.speed ?? 410,
      palette,
      kind,
    });
  }

  public hasActiveFloorEffects(): boolean {
    return (
      this.mandalas.length > 0 ||
      this.shockwaveRings.length > 0 ||
      this.groundBounces.length > 0
    );
  }

  public hasActiveBackEffects(): boolean {
    if (
      this.solarWheels.length > 0 ||
      this.waterDragons.length > 0
    ) {
      return true;
    }
    for (let i = 0; i < this.bladeTrailPool.length; i++) {
      if (this.bladeTrailPool[i].active) return true;
    }
    for (let i = 0; i < this.ribbons.length; i++) {
      if (this.ribbons[i].backGroup) return true;
    }
    return false;
  }

  public hasActiveForegroundEffects(): boolean {
    if (
      this.ribbons.length > 0 ||
      this.cyclones.length > 0 ||
      this.solarWheels.length > 0 ||
      this.waterDragons.length > 0 ||
      this.thunderBolts.length > 0 ||
      this.windGales.length > 0 ||
      this.bloodCages.length > 0 ||
      this.starbursts.length > 0
    ) {
      return true;
    }
    for (let i = 0; i < this.bladeTrailPool.length; i++) {
      if (this.bladeTrailPool[i].active) return true;
    }
    for (let i = 0; i < this.particleSlots.length; i++) {
      if (this.particleSlots[i].active) return true;
    }
    return false;
  }

  public hasActiveEffects(): boolean {
    return (
      this.hasActiveFloorEffects() ||
      this.hasActiveBackEffects() ||
      this.hasActiveForegroundEffects()
    );
  }

  public getUltimateSpotlightAlpha(): number {
    let peak = 0;
    const scoreList = (items: Array<{ life: number; maxLife: number }>, weight: number) => {
      for (const it of items) {
        const norm = it.life / Math.max(0.01, it.maxLife);
        const env = Math.sin(Math.min(1, norm) * Math.PI);
        peak = Math.max(peak, env * weight);
      }
    };
    scoreList(this.solarWheels, 0.17);
    scoreList(this.waterDragons, 0.16);
    scoreList(this.windGales, 0.15);
    scoreList(this.thunderBolts, 0.18);
    return Math.min(0.18, peak);
  }

  // ============================================================================
  // PASS 1: FLOOR LAYER (DRAWN ON TOP OF MP4 ARENA, UNDERNEATH ALL ACTORS)
  // ============================================================================

  public updateAndRenderFloorPass(
    dt: number,
    camX: number,
    camY: number,
    zoom: number,
    cw: number,
    ch: number
  ): boolean {
    if (!this.renderer || !this.floorCtx || this.disposed) return false;
    this.resize(cw, ch);
    if (!this.hasActiveFloorEffects()) return false;

    const floorTime = this.elapsed + dt;
    const toScreenX = (wx: number) => (wx - camX - cw * 0.5) * zoom;
    const toScreenY = (wy: number) => -((wy - camY - ch * 0.5) * zoom);

    // 1. Elemental Ground Light Bounce Pools & Cracks
    for (let i = this.groundBounces.length - 1; i >= 0; i--) {
      const gb = this.groundBounces[i];
      gb.life += dt;
      const norm = gb.life / Math.max(0.01, gb.maxLife);
      if (norm >= 1) {
        this.floorScene.remove(gb.mesh);
        gb.mesh.material.dispose();
        this.groundBounces.splice(i, 1);
        continue;
      }
      const expand = zoom * gb.radius * (0.72 + Math.sin(Math.min(1, norm * 1.4) * Math.PI * 0.5) * 0.36);
      gb.mesh.position.set(toScreenX(gb.worldX), toScreenY(gb.worldY), -14);
      gb.mesh.scale.set(expand, expand * 0.56, 1);
      gb.mesh.material.uniforms.uTime.value = floorTime;
      gb.mesh.material.uniforms.uLife.value = norm;
    }

    // 2. Akaza 12-Point Compass Needle Floor Mandalas
    for (let i = this.mandalas.length - 1; i >= 0; i--) {
      const m = this.mandalas[i];
      m.life += dt;
      const norm = m.life / Math.max(0.01, m.maxLife);
      if (norm >= 1) {
        this.disposeMandala(m);
        this.mandalas.splice(i, 1);
        continue;
      }
      const pop = zoom * (0.48 + Math.min(1, norm * 6.5) * 0.52);
      m.group.position.set(toScreenX(m.worldX), toScreenY(m.worldY), -10);
      m.group.scale.set(pop, pop, pop);
      m.mandalaMat.uniforms.uTime.value = floorTime;
      m.mandalaMat.uniforms.uLife.value = norm;
      const fadeIn = Math.min(1, norm * 7);
      const fadeOut = 1 - Math.max(0, (norm - 0.72) / 0.28);
      m.beamMat.uniforms.uTime.value = floorTime;
      m.beamMat.uniforms.uOpacity.value = 0.52 * fadeIn * fadeOut;
    }

    // 3. Sumi-e Cel Ground Shockwave Rings
    for (let i = this.shockwaveRings.length - 1; i >= 0; i--) {
      const sr = this.shockwaveRings[i];
      sr.life += dt;
      const norm = sr.life / Math.max(0.01, sr.maxLife);
      if (norm >= 1) {
        this.disposeShockwaveRing(sr);
        this.shockwaveRings.splice(i, 1);
        continue;
      }
      const expand = zoom * (0.28 + Math.sin(norm * Math.PI * 0.5) * 0.85);
      sr.group.position.set(toScreenX(sr.worldX), toScreenY(sr.worldY), -4);
      sr.group.scale.set(expand, expand * 0.58, expand);
      sr.group.rotation.z = norm * 0.65;
      sr.inkMat.uniforms.uTime.value = floorTime;
      sr.inkMat.uniforms.uLife.value = norm;
      sr.coreMat.uniforms.uTime.value = floorTime;
      sr.coreMat.uniforms.uLife.value = norm;
    }

    if (!this.hasActiveFloorEffects()) return false;

    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear();
    this.renderer.render(this.floorScene, this.camera);
    this.floorCtx.clearRect(0, 0, this.floorCanvas.width, this.floorCanvas.height);
    this.floorCtx.drawImage(this.canvas, 0, 0, this.floorCanvas.width, this.floorCanvas.height);
    return true;
  }

  // ============================================================================
  // PASS 2: BACK-DEPTH LAYER (DRAWN IMMEDIATELY BEFORE RUDRA SO RIBBONS WRAP BEHIND HIM!)
  // ============================================================================

  public updateAndRenderBackPass(
    camX: number,
    camY: number,
    zoom: number,
    cw: number,
    ch: number
  ): boolean {
    if (!this.renderer || !this.backCtx || this.disposed) return false;
    this.resize(cw, ch);
    if (!this.hasActiveBackEffects()) return false;

    const toScreenX = (wx: number) => (wx - camX - cw * 0.5) * zoom;
    const toScreenY = (wy: number) => -((wy - camY - ch * 0.5) * zoom);
    const originX = (-camX - cw * 0.5) * zoom;
    const originY = -((-camY - ch * 0.5) * zoom);

    // Position pooled blade trails (world coordinates stored directly in vertices!)
    for (let i = 0; i < this.bladeTrailPool.length; i++) {
      const slot = this.bladeTrailPool[i];
      if (!slot.active) continue;
      slot.backGroup.position.set(originX, originY, -6);
      slot.backGroup.scale.set(zoom, zoom, 1);
      slot.backMat.uniforms.uTime.value = this.elapsed;
    }

    // Position back-wrapping sweeps of ribbons, Agni wheels, Varuna wakes, Vayu gales
    for (let i = 0; i < this.ribbons.length; i++) {
      const r = this.ribbons[i];
      if (!r.backGroup) continue;
      const norm = r.life / Math.max(0.01, r.maxLife);
      const s = zoom * (0.9 + norm * 0.24) * r.scale;
      r.backGroup.position.set(toScreenX(r.worldX), toScreenY(r.worldY), -8);
      r.backGroup.scale.set(s, s, s);
      r.backGroup.rotation.set(r.tiltX, r.tiltY, r.baseRotZ - r.spinRate * r.life);
    }

    for (let i = 0; i < this.solarWheels.length; i++) {
      const w = this.solarWheels[i];
      const norm = w.life / Math.max(0.01, w.maxLife);
      const expand = zoom * (0.78 + Math.sin(Math.min(1, norm * 1.25) * Math.PI * 0.5) * 0.42);
      w.backGroup.position.set(toScreenX(w.worldX), toScreenY(w.worldY), -8);
      w.backGroup.scale.set(expand, expand * 0.84, expand);
      w.backGroup.rotation.z = w.baseAngle + w.spinRate * 0.65 * w.life;
    }

    for (let i = 0; i < this.waterDragons.length; i++) {
      const d = this.waterDragons[i];
      const norm = d.life / Math.max(0.01, d.maxLife);
      const grow = zoom * (0.72 + Math.sin(Math.min(1, norm * 1.35) * Math.PI * 0.5) * 0.46);
      d.backGroup.position.set(toScreenX(d.worldX), toScreenY(d.worldY), -8);
      d.backGroup.scale.set(grow, grow, grow);
      d.backGroup.rotation.z = -d.angle;
    }

    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear();
    this.renderer.render(this.backScene, this.camera);
    this.backCtx.clearRect(0, 0, this.backCanvas.width, this.backCanvas.height);
    this.backCtx.drawImage(this.canvas, 0, 0, this.backCanvas.width, this.backCanvas.height);
    return true;
  }

  // ============================================================================
  // PASS 3 & 4: FRONT-DEPTH LAYER + SELECTIVE HDR BLOOM (DRAWN AFTER ACTORS)
  // ============================================================================

  public updateAndRender(
    dt: number,
    camX: number,
    camY: number,
    zoom: number,
    cw: number,
    ch: number
  ): boolean {
    this.hasBloomFrame = false;
    if (!this.renderer || this.disposed) return false;
    this.resize(cw, ch);

    if (!this.hasActiveForegroundEffects()) {
      return false;
    }

    this.elapsed += dt;
    const toScreenX = (wx: number) => (wx - camX - cw * 0.5) * zoom;
    const toScreenY = (wy: number) => -((wy - camY - ch * 0.5) * zoom);
    const originX = (-camX - cw * 0.5) * zoom;
    const originY = -((-camY - ch * 0.5) * zoom);

    // 0. Live Pooled Swept Blade-Trail Ribbons
    for (let i = 0; i < this.bladeTrailPool.length; i++) {
      const slot = this.bladeTrailPool[i];
      if (!slot.active) continue;

      if (slot.ending) {
        slot.fadeElapsed += dt;
      } else {
        // Age old samples slightly during long sweeps so tail flows forward organically
        for (let s = 0; s < slot.samples.length; s++) {
          slot.samples[s].ageSec += dt;
        }
        while (slot.samples.length > 4 && slot.samples[0].ageSec > 0.24) {
          slot.samples.shift();
          this.rebuildBladeTrailSlotGeometry(slot);
        }
      }

      const norm = slot.ending ? slot.fadeElapsed / Math.max(0.02, slot.fadeDuration) : 0;
      if (norm >= 1) {
        slot.active = false;
        slot.id = null;
        slot.ending = false;
        slot.samples.length = 0;
        slot.backGeo.setDrawRange(0, 0);
        slot.frontGeo.setDrawRange(0, 0);
        slot.backGroup.visible = false;
        slot.frontGroup.visible = false;
        continue;
      }

      slot.frontGroup.position.set(originX, originY, 22);
      slot.frontGroup.scale.set(zoom, zoom, 1);
      slot.frontMat.uniforms.uTime.value = this.elapsed;
      slot.frontMat.uniforms.uLife.value = norm;
      slot.backMat.uniforms.uTime.value = this.elapsed;
      slot.backMat.uniforms.uLife.value = norm;
    }

    // 1. Slash Ribbons
    for (let i = this.ribbons.length - 1; i >= 0; i--) {
      const r = this.ribbons[i];
      r.life += dt;
      const norm = r.life / Math.max(0.01, r.maxLife);
      if (norm >= 1) {
        this.disposeRibbon(r);
        this.ribbons.splice(i, 1);
        continue;
      }

      const sx = toScreenX(r.worldX);
      const sy = toScreenY(r.worldY);
      const s = zoom * (0.9 + norm * 0.24) * r.scale;
      r.group.position.set(sx, sy, 20);
      r.group.scale.set(s, s, s);
      r.group.rotation.set(r.tiltX, r.tiltY, r.baseRotZ - r.spinRate * r.life);

      for (const m of [r.coreMesh, r.glowMesh, r.backMesh]) {
        if (!m) continue;
        m.material.uniforms.uTime.value = this.elapsed;
        m.material.uniforms.uLife.value = norm;
      }
    }

    // 2. Agni Hinokami Continuous Calligraphic Fire Vortex
    for (let i = this.solarWheels.length - 1; i >= 0; i--) {
      const w = this.solarWheels[i];
      w.life += dt;
      const norm = w.life / Math.max(0.01, w.maxLife);
      if (norm >= 1) {
        this.disposeSolarWheel(w);
        this.solarWheels.splice(i, 1);
        continue;
      }
      const expand = zoom * (0.78 + Math.sin(Math.min(1, norm * 1.25) * Math.PI * 0.5) * 0.42);
      w.frontGroup.position.set(toScreenX(w.worldX), toScreenY(w.worldY), 22);
      w.frontGroup.scale.set(expand, expand * 0.84, expand);
      w.frontGroup.rotation.z = w.baseAngle - w.spinRate * w.life;
      if (w.frontGroup.children[1]) {
        w.frontGroup.children[1].rotation.z += w.spinRate * 1.35 * dt;
      }
      for (const m of w.mats) {
        m.uniforms.uTime.value = this.elapsed;
        m.uniforms.uLife.value = norm;
      }
    }

    // 3. Varuna Sculpted 3D Water Dragon + Hokusai Clawed Wave Wake
    for (let i = this.waterDragons.length - 1; i >= 0; i--) {
      const d = this.waterDragons[i];
      d.life += dt;
      const norm = d.life / Math.max(0.01, d.maxLife);
      if (norm >= 1) {
        this.disposeWaterDragon(d);
        this.waterDragons.splice(i, 1);
        continue;
      }
      const drift = d.fromBlade ? THREE.MathUtils.smoothstep(norm, 0.29, 0.83) : 1;
      const distance = d.speed * dt * (1 - norm * 0.45) * drift;
      d.worldX += Math.cos(d.angle) * distance;
      d.worldY += Math.sin(d.angle) * distance * 0.72;
      const grow = zoom * (0.72 + Math.sin(Math.min(1, norm * 1.35) * Math.PI * 0.5) * 0.46);
      d.frontGroup.position.set(toScreenX(d.worldX), toScreenY(d.worldY), 24);
      d.frontGroup.scale.set(grow, grow, grow);
      d.frontGroup.rotation.z = -d.angle;
      d.frontGroup.rotation.x = 0.24 * Math.sin(norm * Math.PI);
      this.emitElementalWake(d, 'water', norm, grow / zoom);
      d.bodyMat.uniforms.uTime.value = this.elapsed * 1.4;
      d.bodyMat.uniforms.uLife.value = norm;
      const fade = 1 - Math.max(0, (norm - 0.65) / 0.35);
      for (const fm of d.fadeMats) {
        if (fm instanceof THREE.ShaderMaterial && fm.uniforms?.uTime && fm.uniforms?.uLife) {
          fm.uniforms.uTime.value = this.elapsed * 1.4;
          fm.uniforms.uLife.value = norm;
        } else if ('opacity' in fm) {
          (fm as THREE.MeshBasicMaterial).opacity = fade * 0.96;
        }
      }
    }

    // 4. Vajra Connected Branching Lightning Bolts + 12-Pt Elbow Starbursts
    for (let i = this.thunderBolts.length - 1; i >= 0; i--) {
      const b = this.thunderBolts[i];
      b.life += dt;
      if (b.life < 0) continue;
      if (!b.group.visible) {
        b.group.visible = true;
        b.releaseDebris?.();
        b.releaseDebris = undefined;
      }
      const norm = b.life / Math.max(0.01, b.maxLife);
      if (norm >= 1) {
        this.disposeThunder(b);
        this.thunderBolts.splice(i, 1);
        continue;
      }
      b.group.position.set(toScreenX(b.worldX), toScreenY(b.worldY), 26);
      b.group.scale.set(zoom, zoom, zoom);
      for (const sm of b.shaderMats) {
        sm.uniforms.uTime.value = this.elapsed;
        sm.uniforms.uLife.value = norm;
      }
      const starPop =
        Math.sin(Math.min(1, norm * 2.2) * Math.PI * 0.5) *
        (1 - Math.max(0, (norm - 0.55) / 0.45));
      const flicker = 0.86 + Math.sin(this.elapsed * 58 + i * 5) * 0.14;
      const starFade = Math.max(0, starPop * flicker);
      for (const sg of b.starGroups) {
        sg.rotation.z += dt * 4.2;
      }
      for (const m of b.mats) {
        m.opacity = starFade;
      }
    }

    // Carry the whole Vayu stroke outward as one shape.
    for (let i = this.windGales.length - 1; i >= 0; i--) {
      const g = this.windGales[i];
      g.life += dt;
      const norm = g.life / Math.max(0.01, g.maxLife);
      if (norm >= 1) {
        this.disposeWindGale(g);
        this.windGales.splice(i, 1);
        continue;
      }
      const travel = norm * (2 - norm);
      const expand = zoom * (0.84 + travel * 0.22);
      const distance = g.fromBlade ? THREE.MathUtils.smoothstep(norm, 0.28, 0.93) * 30 : travel * 45;
      g.sweep.position.set(
        toScreenX(g.worldX + Math.cos(g.angle) * distance),
        toScreenY(g.worldY + Math.sin(g.angle) * distance),
        20,
      );
      g.sweep.scale.set(expand, expand, expand);
      this.emitElementalWake(g, 'wind', norm, expand / zoom, distance);
      g.sweep.material.uniforms.uTime.value = this.elapsed;
      g.sweep.material.uniforms.uLife.value = norm;
    }

    // 6. Blood Thread Cages
    for (let i = this.bloodCages.length - 1; i >= 0; i--) {
      const c = this.bloodCages[i];
      c.life += dt;
      const norm = c.life / Math.max(0.01, c.maxLife);
      if (norm >= 1) {
        this.disposeBloodCage(c);
        this.bloodCages.splice(i, 1);
        continue;
      }
      const snap = zoom * (0.74 + Math.min(1, norm * 8) * 0.28);
      c.group.position.set(toScreenX(c.worldX), toScreenY(c.worldY), 16);
      c.group.scale.set(snap, snap, snap);
      const fade = 1 - Math.max(0, (norm - 0.65) / 0.35);
      for (const mat of c.mats) {
        mat.opacity = fade * 0.94;
      }
    }

    // 7. 12-Point Weapon Clash & Perfect Parry Starbursts
    for (let i = this.starbursts.length - 1; i >= 0; i--) {
      const st = this.starbursts[i];
      st.life += dt;
      const norm = st.life / Math.max(0.01, st.maxLife);
      if (norm >= 1) {
        this.disposeStarburst(st);
        this.starbursts.splice(i, 1);
        continue;
      }
      const sc = zoom * st.maxScale * (0.38 + Math.sin(norm * Math.PI * 0.65) * 0.96);
      st.group.position.set(toScreenX(st.worldX), toScreenY(st.worldY), 32);
      st.group.scale.set(sc, sc, 1);
      st.group.rotation.z = norm * 0.78;
      const fade = 1 - norm * norm;
      for (const mat of st.mats) {
        mat.opacity = Math.max(0, fade);
      }
    }

    // 8. Cyclones
    for (let i = this.cyclones.length - 1; i >= 0; i--) {
      const c = this.cyclones[i];
      c.life += dt;
      const norm = c.life / Math.max(0.01, c.maxLife);
      if (norm >= 1) {
        this.disposeCyclone(c);
        this.cyclones.splice(i, 1);
        continue;
      }

      const sx = toScreenX(c.worldX);
      const sy = toScreenY(c.worldY);
      const expand = (0.58 + Math.sin(Math.min(1, norm * 1.15) * Math.PI * 0.5) * 0.55) * zoom;
      c.group.position.set(sx, sy, 15);
      c.group.scale.set(expand, expand * 0.72, expand);

      for (const ring of c.rings) {
        ring.mesh.rotation.x += ring.spinX * dt;
        ring.mesh.rotation.y += ring.spinY * dt;
        ring.mesh.rotation.z += ring.spinZ * dt;
        ring.mesh.material.uniforms.uTime.value = this.elapsed;
        ring.mesh.material.uniforms.uLife.value = norm;
      }
    }

    // 9. Pooled InstancedMesh Elemental Particles (1 draw call for all sparks, droplets, rock/wind shards!)
    if (
      this.particleInstancedMesh &&
      this.particleCellAttr &&
      this.particleColorAttr &&
      this.particleAlphaAttr
    ) {
      let instanceIdx = 0;
      const maxCap = QUALITY_PARTICLE_CAP[this.qualityPreset];
      for (let i = 0; i < maxCap; i++) {
        const p = this.particleSlots[i];
        if (!p.active) continue;
        p.life += dt;
        const norm = p.life / Math.max(0.01, p.maxLife);
        if (norm >= 1) {
          p.active = false;
          continue;
        }
        p.worldX += p.vx * dt;
        p.worldY += p.vy * dt;
        p.z += p.vz * dt;
        p.vz -= p.gravity * dt;
        const dragMul = Math.max(0, 1 - dt * p.drag);
        p.vx *= dragMul;
        p.vy *= dragMul;
        if (p.alignToVelocity) {
          p.rot = Math.atan2(-(p.vy - p.vz * 0.25), p.vx);
          if (p.kind === 'water_droplet') p.rot -= Math.PI * 0.5;
        } else {
          p.rot += p.rotSpeed * dt;
        }

        const shrink = p.kind === 'spark_needle' ? 1 - norm * 0.55 : 1 - norm * 0.35;
        this.dummyPos.set(toScreenX(p.worldX), toScreenY(p.worldY - p.z * 0.3), 0);
        this.dummyEuler.set(0, 0, p.rot);
        this.dummyQuat.setFromEuler(this.dummyEuler);
        this.dummyScale.set(p.scaleX * shrink * zoom, p.scaleY * shrink * zoom, 1);
        this.dummyMatrix.compose(this.dummyPos, this.dummyQuat, this.dummyScale);
        this.particleInstancedMesh.setMatrixAt(instanceIdx, this.dummyMatrix);

        const [cellU, cellV] = particleCellOffset(p.kind);
        this.particleCellAttr.setXY(instanceIdx, cellU, cellV);
        this.particleColorAttr.setXYZ(instanceIdx, p.r, p.g, p.b);
        this.particleAlphaAttr.setX(instanceIdx, Math.max(0, 1 - norm * norm));
        instanceIdx++;
      }

      this.particleInstancedMesh.count = instanceIdx;
      if (instanceIdx > 0) {
        this.particleInstancedMesh.instanceMatrix.needsUpdate = true;
        this.particleCellAttr.needsUpdate = true;
        this.particleColorAttr.needsUpdate = true;
        this.particleAlphaAttr.needsUpdate = true;
      }
    }

    // Pass A (GPU-only): Selective HDR UnrealBloomPass into offscreen additive bloomCanvas
    if (!this.isSoftwareGl && this.bloomComposer && this.bloomCtx) {
      this.renderer.setClearColor(0x000000, 1);
      this.bloomComposer.render();
      this.bloomCtx.clearRect(0, 0, this.bloomCanvas.width, this.bloomCanvas.height);
      this.bloomCtx.drawImage(
        this.canvas,
        0,
        0,
        this.bloomCanvas.width,
        this.bloomCanvas.height
      );
      this.hasBloomFrame = true;
    }

    // Pass B (All devices): Crisp alpha-transparent painterly cel + Sumi-e ink VFX render
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    return true;
  }

  private disposeRibbon(r: ActiveWebglRibbon): void {
    this.scene.remove(r.group);
    r.coreMesh.geometry.dispose();
    r.coreMesh.material.dispose();
    r.agniSpine?.material.dispose();
    if (r.glowMesh.geometry !== r.coreMesh.geometry) r.glowMesh.geometry.dispose();
    r.glowMesh.material.dispose();
    if (r.backGroup && r.backMesh) {
      this.backScene.remove(r.backGroup);
      r.backMesh.geometry.dispose();
      r.backMesh.material.dispose();
    }
  }

  private disposeCyclone(c: ActiveWebglCyclone): void {
    this.scene.remove(c.group);
    for (const ring of c.rings) {
      ring.mesh.geometry.dispose();
      ring.mesh.material.dispose();
    }
  }

  private disposeSolarWheel(w: ActiveSolarWheel): void {
    this.scene.remove(w.frontGroup);
    this.backScene.remove(w.backGroup);
    w.geos.forEach((g) => g.dispose());
    w.mats.forEach((m) => m.dispose());
  }

  private disposeWaterDragon(d: ActiveWaterDragon): void {
    this.scene.remove(d.frontGroup);
    this.backScene.remove(d.backGroup);
    d.geos.forEach((g) => g.dispose());
    d.bodyMat.dispose();
    d.fadeMats.forEach((m) => m.dispose());
  }

  private disposeThunder(b: ActiveThunderZigzag): void {
    this.scene.remove(b.group);
    b.geos.forEach((g) => g.dispose());
    b.shaderMats.forEach((m) => m.dispose());
    b.mats.forEach((m) => m.dispose());
  }

  private disposeWindGale(g: ActiveWindGale): void {
    this.scene.remove(g.sweep);
    g.sweep.geometry.dispose();
    g.sweep.material.dispose();
  }

  private disposeMandala(m: ActiveCompassMandala): void {
    this.floorScene.remove(m.group);
    m.geos.forEach((g) => g.dispose());
    m.mandalaMat.dispose();
    m.beamMat.dispose();
  }

  private disposeBloodCage(c: ActiveBloodCage): void {
    this.scene.remove(c.group);
    c.geos.forEach((g) => g.dispose());
    c.mats.forEach((m) => m.dispose());
  }

  private disposeStarburst(st: ActiveStarburst): void {
    this.scene.remove(st.group);
    st.geos?.forEach((g) => g.dispose());
    st.mats.forEach((m) => m.dispose());
  }

  private disposeShockwaveRing(sr: ActiveShockwaveRing): void {
    this.floorScene.remove(sr.group);
    sr.geos.forEach((g) => g.dispose());
    sr.inkMat.dispose();
    sr.coreMat.dispose();
  }

  public clearActiveEffects(): void {
    for (const slot of this.bladeTrailPool) {
      slot.active = false;
      slot.id = null;
      slot.ending = false;
      slot.samples.length = 0;
      slot.backGeo.setDrawRange(0, 0);
      slot.frontGeo.setDrawRange(0, 0);
      slot.backGroup.visible = false;
      slot.frontGroup.visible = false;
    }
    while (this.ribbons.length) {
      const r = this.ribbons.pop();
      if (r) this.disposeRibbon(r);
    }
    while (this.cyclones.length) {
      const c = this.cyclones.pop();
      if (c) this.disposeCyclone(c);
    }
    while (this.solarWheels.length) {
      const w = this.solarWheels.pop();
      if (w) this.disposeSolarWheel(w);
    }
    while (this.waterDragons.length) {
      const d = this.waterDragons.pop();
      if (d) this.disposeWaterDragon(d);
    }
    while (this.thunderBolts.length) {
      const b = this.thunderBolts.pop();
      if (b) this.disposeThunder(b);
    }
    while (this.windGales.length) {
      const g = this.windGales.pop();
      if (g) this.disposeWindGale(g);
    }
    while (this.mandalas.length) {
      const m = this.mandalas.pop();
      if (m) this.disposeMandala(m);
    }
    while (this.groundBounces.length) {
      const gb = this.groundBounces.pop();
      if (gb) {
        this.floorScene.remove(gb.mesh);
        gb.mesh.material.dispose();
      }
    }
    while (this.bloodCages.length) {
      const c = this.bloodCages.pop();
      if (c) this.disposeBloodCage(c);
    }
    while (this.starbursts.length) {
      const st = this.starbursts.pop();
      if (st) this.disposeStarburst(st);
    }
    while (this.shockwaveRings.length) {
      const sr = this.shockwaveRings.pop();
      if (sr) this.disposeShockwaveRing(sr);
    }
    for (const p of this.particleSlots) {
      p.active = false;
    }
    if (this.particleInstancedMesh) {
      this.particleInstancedMesh.count = 0;
    }
    this.hasBloomFrame = false;
    this.backCtx?.clearRect(0, 0, this.backCanvas.width, this.backCanvas.height);
    this.floorCtx?.clearRect(0, 0, this.floorCanvas.width, this.floorCanvas.height);
    this.bloomCtx?.clearRect(0, 0, this.bloomCanvas.width, this.bloomCanvas.height);
    this.renderer?.clear();
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.divineInkAtlas?.dispose();
    this.divineInkAtlas = null;
    this.clearActiveEffects();
    for (const slot of this.bladeTrailPool) {
      this.backScene.remove(slot.backGroup);
      this.scene.remove(slot.frontGroup);
      slot.backGeo.dispose();
      slot.backMat.dispose();
      slot.frontGeo.dispose();
      slot.frontMat.dispose();
    }
    this.bladeTrailPool = [];
    if (this.particleInstancedMesh) {
      this.scene.remove(this.particleInstancedMesh);
      this.particleInstancedMesh.dispose();
      this.particleInstancedMesh = null;
    }
    this.particleGeo?.dispose();
    this.particleMat?.dispose();
    this.groundBounceGeo.dispose();
    this.bloomPass?.dispose();
    this.bloomComposer?.dispose();
    this.bloomComposer = null;
    this.renderer?.dispose();
    this.renderer = null;
  }
}
