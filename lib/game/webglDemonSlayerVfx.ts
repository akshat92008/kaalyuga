import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { isSoftwareWebGLRenderer } from './hadesSpriteBaker';

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

interface RibbonPaletteColors {
  core: THREE.Color;
  mid: THREE.Color;
  edge: THREE.Color;
  ink: THREE.Color;
  glow: THREE.Color;
}

const RIBBON_PALETTES: Record<DemonSlayerVfxPalette, RibbonPaletteColors> = {
  hinokami: {
    core: new THREE.Color('#fffce6'),
    mid: new THREE.Color('#ffaa14'),
    edge: new THREE.Color('#eb1e00'),
    ink: new THREE.Color('#140604'),
    glow: new THREE.Color('#ff6a00'),
  },
  sun: {
    core: new THREE.Color('#ffffff'),
    mid: new THREE.Color('#ffd633'),
    edge: new THREE.Color('#ff3300'),
    ink: new THREE.Color('#120604'),
    glow: new THREE.Color('#ff7b00'),
  },
  water: {
    core: new THREE.Color('#ffffff'),
    mid: new THREE.Color('#38e8ff'),
    edge: new THREE.Color('#005ce6'),
    ink: new THREE.Color('#040d21'),
    glow: new THREE.Color('#1ca8ff'),
  },
  thunder: {
    core: new THREE.Color('#ffffff'),
    mid: new THREE.Color('#ffe94d'),
    edge: new THREE.Color('#38e8ff'),
    ink: new THREE.Color('#120e04'),
    glow: new THREE.Color('#ffd426'),
  },
  wind: {
    core: new THREE.Color('#eefff7'),
    mid: new THREE.Color('#26f78d'),
    edge: new THREE.Color('#047857'),
    ink: new THREE.Color('#04120c'),
    glow: new THREE.Color('#10b981'),
  },
  blood: {
    core: new THREE.Color('#ffe4ec'),
    mid: new THREE.Color('#ff1744'),
    edge: new THREE.Color('#88001f'),
    ink: new THREE.Color('#0d0205'),
    glow: new THREE.Color('#ff1f5a'),
  },
  void: {
    core: new THREE.Color('#ffd6f5'),
    mid: new THREE.Color('#e11d74'),
    edge: new THREE.Color('#4b0c3b'),
    ink: new THREE.Color('#0a0208'),
    glow: new THREE.Color('#ff2478'),
  },
  magma: {
    core: new THREE.Color('#fff4c4'),
    mid: new THREE.Color('#ff6a18'),
    edge: new THREE.Color('#a31808'),
    ink: new THREE.Color('#120705'),
    glow: new THREE.Color('#ff4818'),
  },
  bronze: {
    core: new THREE.Color('#ffffff'),
    mid: new THREE.Color('#38e8ff'),
    edge: new THREE.Color('#0284c7'),
    ink: new THREE.Color('#04101f'),
    glow: new THREE.Color('#00d4ff'),
  },
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
    const jitter = 0.72 + ((Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453) % 1 + 1) * 0.28;
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
 * branching off the interior elbow vertices of a primary lightning bolt.
 */
export function computeThunderForkedBranches(
  mainPts: ZigzagPoint2D[],
  seed = 1
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
    const branchAngle = baseAngle + side * (0.48 + h * 0.56);
    const branchLen = totalLen * (0.28 + h * 0.24);
    const endX = origin.x + Math.cos(branchAngle) * branchLen;
    const endY = origin.y + Math.sin(branchAngle) * branchLen;
    branches.push(
      computeThunderZigzagVertices(origin.x, origin.y, endX, endY, 3, 18 + h * 14, seed + i * 7)
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

  // Compute cumulative arc length for smooth UV progression along bolt travel
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

    // Dramatic Zenitsu whip taper: punchy electric root -> crisp spear tip
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
 * Builds a sharp multi-point anime comic starburst polygon (e.g. 8-point Zenitsu lightning bounce burst).
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
    // Alternate long cardinal spikes & medium diagonal spikes for authentic anime comic impact energy
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

export function selectDemonSlayerPaletteForStance(stance: string): DemonSlayerVfxPalette {
  if (stance === 'pillar') return 'wind';
  if (stance === 'thrust') return 'thunder';
  if (stance === 'water' || stance === 'varuna') return 'water';
  return 'hinokami';
}

const RIBBON_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Authentic Ufotable / Demon Slayer 3-band stepped FBM cel shader with:
// - Mode 0: Hinokami / Sun / Blood ragged flame licks + pitch-black Sumi-e ink border
// - Mode 1: Ukiyo-e Hokusai parallel indigo/cyan wave stripes + curled white seafoam crests
// - Mode 2: Zenitsu sharp geometric lightning zigzag ridges + HDR white-gold core
// - Mode 3: Sanemi layered emerald razor gale blades + dark ink streaks
const RIBBON_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uLife;
  uniform vec3 uCoreColor;
  uniform vec3 uMidColor;
  uniform vec3 uEdgeColor;
  uniform vec3 uInkColor;
  uniform float uOpacity;
  uniform float uInkBorder;
  uniform float uMode;
  uniform float uHdrBoost;

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

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 3; i++) {
      v += a * noise2(p);
      p = p * 2.08 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float u = vUv.x;
    float v = vUv.y;

    float arcTaper = smoothstep(0.0, 0.14, u) * smoothstep(1.0, 0.72, u);
    float distFromCenter = abs(v - 0.5) * 2.0;

    float flowSpeed = uMode > 1.5 && uMode < 2.5 ? 8.2 : 4.8;
    float n = fbm(vec2(u * 9.5 - uTime * flowSpeed, v * 4.5 + uTime * 1.4));
    float n2 = fbm(vec2(u * 18.0 - uTime * (flowSpeed * 1.45), v * 7.5 - uTime * 2.1));

    float tongueBias = (uMode > 1.5 && uMode < 2.5) ? 0.96 : (uMode > 0.5 && uMode < 1.5) ? 0.70 : 0.88;
    float licks = (n * 0.62 + n2 * 0.38 - 0.40) * tongueBias;
    float waveCurl = sin(u * 15.0 - uTime * 9.5) * 0.12 * (1.0 - u * 0.6);
    float bodyDist = distFromCenter - (licks + waveCurl) * (0.50 + 0.50 * (1.0 - u * 0.22));
    float radiusMask = arcTaper * (1.0 - uLife * 0.26);

    float outerAlpha = smoothstep(radiusMask + 0.08, radiusMask - 0.08, bodyDist);
    if (outerAlpha <= 0.02) discard;

    // Keep saturation rich and anime-crisp (never clip entire ribbon to solid white!)
    float coreGain = clamp(uHdrBoost, 1.0, 1.38);
    vec3 col;
    if (uMode > 0.5 && uMode < 1.5) {
      // Ukiyo-e Hokusai parallel wave stripes + curled cel-shaded white seafoam crests
      float stripeWave = sin((v * 6.2 + n * 1.05 - u * 2.4 - uTime * 2.2) * 6.28318);
      float stripeStep = smoothstep(-0.18, 0.18, stripeWave);
      float deepBand = smoothstep(0.12, 0.52, abs(v - 0.5) * 2.0);
      float foamCrest = smoothstep(0.58, 0.80, n2 + (1.0 - distFromCenter) * 0.24);
      col = mix(uMidColor, uEdgeColor, deepBand * 0.72);
      col = mix(col * 0.72, uMidColor * 1.12, stripeStep);
      col = mix(col, uCoreColor * coreGain, foamCrest * 0.88);
    } else if (uMode > 1.5 && uMode < 2.5) {
      // Zenitsu sharp geometric lightning zigzag core
      float zig = abs(fract(u * 16.0 - uTime * 14.0) * 2.0 - 1.0);
      float boltCore = 1.0 - smoothstep(0.05, 0.16, abs(v - (0.5 + (zig - 0.5) * 0.40)));
      float midBand = smoothstep(radiusMask * 0.80, radiusMask * 0.34, bodyDist);
      col = mix(uEdgeColor * 1.05, uMidColor * 1.12, midBand);
      col = mix(col, uCoreColor * coreGain, max(boltCore, smoothstep(radiusMask * 0.22, radiusMask * 0.05, bodyDist)));
    } else if (uMode > 2.5) {
      // Sanemi layered emerald razor gale blades
      float bladeStripes = smoothstep(0.48, 0.72, sin((v * 5.0 - u * 1.8) * 6.28318 + uTime * 7.5) * 0.5 + 0.5);
      float coreBand = smoothstep(radiusMask * 0.26, radiusMask * 0.06, bodyDist);
      col = mix(uEdgeColor, uMidColor * 1.15, max(bladeStripes * 0.82, smoothstep(radiusMask * 0.82, radiusMask * 0.38, bodyDist)));
      col = mix(col, uCoreColor * coreGain, coreBand);
    } else {
      // Hinokami Kagura / Rengoku 4-band stepped fire cel shader (deep vermilion -> blazing amber -> narrow golden-white spine!)
      float outerRed = smoothstep(radiusMask * 0.94, radiusMask * 0.58, bodyDist + (n - 0.5) * 0.16);
      float midGold = smoothstep(radiusMask * 0.64, radiusMask * 0.28, bodyDist + (n2 - 0.5) * 0.14);
      float spineHot = smoothstep(radiusMask * 0.26, radiusMask * 0.07, bodyDist + (n2 - 0.5) * 0.08);
      col = mix(uEdgeColor * 0.85, uEdgeColor * 1.12, outerRed);
      col = mix(col, uMidColor * 1.10, midGold);
      col = mix(col, uCoreColor * coreGain, spineHot);
    }

    // Crisp pitch-black Sumi-e calligraphy rim on outer edge
    if (uInkBorder > 0.5) {
      float rimZone = smoothstep(radiusMask - 0.11, radiusMask + 0.02, bodyDist);
      col = mix(col, uInkColor, rimZone * 0.94);
    }

    float dissolve = smoothstep(uLife * 0.86 - 0.08, uLife * 0.86 + 0.16, n * 0.74 + u * 0.26);
    float finalAlpha = outerAlpha * dissolve * (1.0 - smoothstep(0.68, 1.0, uLife)) * uOpacity;
    if (finalAlpha <= 0.01) discard;

    gl_FragColor = vec4(col * finalAlpha, finalAlpha);
  }
`;

// Dedicated Ukiyo-e Hokusai Painterly Watercolor Water Dragon Shader (Prussian indigo, slate-cerulean, rice-paper seafoam & Sumi-e ink)
const WATER_DRAGON_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uLife;
  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    float u = vUv.x;
    float v = vUv.y;

    // Flowing Ukiyo-e brush striations + overlapping semicircular dragon scales
    float waveFlow = u * 16.0 - uTime * 5.8;
    float scaleX = fract(waveFlow);
    float scaleY = fract(v * 6.5 + floor(waveFlow) * 0.5);
    float scaleArc = length(vec2(scaleX - 0.5, scaleY - 0.5));
    float scaleRim = smoothstep(0.37, 0.49, scaleArc);

    float brushRipple = sin((v * 7.0 + sin(u * 11.0 - uTime * 4.2) * 0.32) * 6.28318);
    float washMask = smoothstep(-0.35, 0.45, brushRipple);
    float paperGrain = (hash21(floor(vec2(u * 90.0, v * 40.0))) - 0.5) * 0.06;

    // Painterly Hokusai woodblock palette (replaces garish flat neon cyan/royal blue)
    vec3 deepPrussian = vec3(0.04, 0.12, 0.29);
    vec3 ukiyoSlateBlue = vec3(0.09, 0.34, 0.57);
    vec3 ceruleanMist = vec3(0.34, 0.72, 0.85);
    vec3 ricePaperFoam = vec3(0.93, 0.96, 0.98);
    vec3 sumiInk = vec3(0.02, 0.04, 0.10);

    vec3 col = mix(deepPrussian, ukiyoSlateBlue, washMask);
    // Soft cerulean watercolor crest along dorsal ridge
    float dorsal = 1.0 - smoothstep(0.08, 0.44, abs(v - 0.5));
    col = mix(col, ceruleanMist, dorsal * 0.68 + (1.0 - scaleRim) * 0.22);
    // Crisp Sumi-e ink scale contours
    col = mix(col, sumiInk, scaleRim * 0.52);
    // Lace-like rice-paper seafoam curls along wave edges
    float foamLace = smoothstep(0.72, 0.93, sin(u * 30.0 - uTime * 8.0 + v * 5.0) * 0.5 + 0.5) * smoothstep(0.26, 0.46, abs(v - 0.5));
    col = mix(col, ricePaperFoam, foamLace * 0.82);
    col += paperGrain;

    float alpha = (1.0 - smoothstep(0.72, 1.0, uLife)) * smoothstep(0.0, 0.08, u) * 0.95;
    if (alpha <= 0.01) discard;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

// Sculpted Fresnel Ink-Rimmed Painterly Shader for Water Dragon Head, Mane Crest & Pearl Antlers
const WATER_DRAGON_HEAD_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vViewNormal;
  void main() {
    vUv = uv;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const WATER_DRAGON_HEAD_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uLife;
  uniform vec3 uBaseColor;
  uniform vec3 uMidColor;
  uniform vec3 uHighlightColor;
  varying vec2 vUv;
  varying vec3 vViewNormal;

  void main() {
    vec3 n = normalize(vViewNormal);
    float ndotv = clamp(abs(n.z), 0.0, 1.0);
    float fresnelInk = smoothstep(0.26, 0.05, ndotv);
    float ridgeLight = smoothstep(0.12, 0.82, n.y * 0.5 + 0.5);
    float waterStreak = sin(vUv.y * 16.0 - uTime * 7.5 + vUv.x * 8.0) * 0.5 + 0.5;
    float foamCrest = smoothstep(0.56, 0.92, ridgeLight * 0.62 + waterStreak * 0.48);

    vec3 col = mix(uBaseColor, uMidColor, clamp(ridgeLight * 0.72 + waterStreak * 0.34, 0.0, 1.0));
    col = mix(col, uHighlightColor, foamCrest * 0.82);
    // Crisp Ukiyo-e Prussian-sumi brush contour strictly along outer silhouette edges
    vec3 sumiInk = vec3(0.03, 0.09, 0.22);
    col = mix(col, sumiInk, fresnelInk * 0.62);

    float fade = 1.0 - smoothstep(0.68, 1.0, uLife);
    float alpha = fade * 0.96;
    if (alpha <= 0.01) discard;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

// Akaza Destructive Death: Compass Needle 12-Point Snowflake Mandala Floor Shader (luminous cyan, zero white clip!)
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

    // 12-fold snowflake compass symmetry
    float sector = 6.2831853 / 12.0;
    float localA = mod(rotA + sector * 0.5, sector) - sector * 0.5;
    float symX = r * cos(localA);
    float symY = abs(r * sin(localA));

    float mainSpoke = (1.0 - smoothstep(0.008, 0.020, symY)) * step(0.18, symX) * step(symX, 0.93);
    float spokeGlow = (1.0 - smoothstep(0.015, 0.055, symY)) * step(0.16, symX) * step(symX, 0.95);
    float barb1 = (1.0 - smoothstep(0.007, 0.018, abs(symY - (symX - 0.36) * 0.58))) * step(0.36, symX) * step(symX, 0.66);
    float barb2 = (1.0 - smoothstep(0.007, 0.018, abs(symY - (0.84 - symX) * 0.54))) * step(0.54, symX) * step(symX, 0.85);

    // Nested geometric hexagons
    float hexAngle = mod(rotB + 3.14159265 / 6.0, 3.14159265 / 3.0) - 3.14159265 / 6.0;
    float hexR = cos(hexAngle) * r;
    float outerHex = 1.0 - smoothstep(0.009, 0.024, abs(hexR - 0.78));
    float innerHex = 1.0 - smoothstep(0.009, 0.022, abs(hexR - 0.44));

    // Concentric compass circles
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

// Feathered Volumetric Light Mist Column Shader (silky Akaza rising glow — zero boxy rectangles!)
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

interface ActiveWebglRibbon {
  group: THREE.Group;
  inkMesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  coreMesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  glowMesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
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

interface ActiveWebglSpark {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  worldX: number;
  worldY: number;
  vx: number;
  vy: number;
  vz: number;
  z: number;
  life: number;
  maxLife: number;
}

interface ActiveSolarWheel {
  group: THREE.Group;
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
  group: THREE.Group;
  bodyMat: THREE.ShaderMaterial;
  fadeMats: THREE.MeshBasicMaterial[];
  geos: THREE.BufferGeometry[];
  worldX: number;
  worldY: number;
  angle: number;
  speed: number;
  life: number;
  maxLife: number;
}

// Bespoke Ufotable Zenitsu Thunder Breathing Procedural GLSL Plasma Lightning Shader:
// Crisp pitch-black Sumi-e serrated border + Electric Cyan corona + Blazing Thunder Gold mid + White-Gold plasma core
const THUNDER_BOLT_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uLife;
  uniform float uSeed;
  uniform float uOpacity;
  uniform float uIsHalo;
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
    // Progressive lightning whip-travel from origin (vUv.x=0) to impact tip (vUv.x=1)
    float headReveal = smoothstep(0.0, 0.14, uLife);
    float tailDissolve = smoothstep(0.54, 1.0, uLife);
    if (vUv.x > headReveal + 0.04) discard;

    // High-frequency quantized anime snap-crackle displacement (steps at ~18fps like hand-drawn sakuga)
    float snapTime = floor(uTime * 18.0 + uSeed * 3.1);
    float jag1 = (thNoise(vec2(vUv.x * 16.0 - snapTime * 0.7, uSeed * 5.0)) - 0.5) * 0.34;
    float jag2 = (thNoise(vec2(vUv.x * 38.0 + snapTime * 1.3, uSeed * 9.0)) - 0.5) * 0.16;
    float center = 0.5 + jag1 + jag2;
    float dist = abs(vUv.y - center) * 2.0;

    // Electric surge pulse racing along the bolt
    float surge = 0.78 + 0.22 * sin(vUv.x * 24.0 - uTime * 46.0 + uSeed * 6.0);
    // Crisp crackling decay holes near end of life
    float crackleMask = thNoise(vec2(vUv.x * 22.0 + uSeed, snapTime * 0.9));
    float widthScale = (1.0 - tailDissolve * 0.58) * (0.85 + 0.15 * sin(vUv.x * 3.14159));

    if (uIsHalo > 0.5) {
      float halo = exp(-dist * dist * 4.2) * (1.0 - tailDissolve) * surge;
      vec3 haloCol = mix(uCyanColor, uGoldColor, smoothstep(0.55, 0.12, dist));
      float alpha = halo * uOpacity * 0.58;
      if (alpha < 0.02) discard;
      gl_FragColor = vec4(haloCol * 1.35, alpha);
      return;
    }

    // Eroding electric sparks at end of bolt life
    if (tailDissolve > 0.05 && crackleMask < tailDissolve * 0.72) discard;

    float outerBound = 0.88 * widthScale;
    if (dist > outerBound) discard;

    // 4-Band Stepped Ufotable Zenitsu Thunder Composition:
    // Band 1: Pitch-black Sumi-e jagged ink border
    // Band 2: Vivid Electric Cyan edge corona
    // Band 3: Blazing Zenitsu Thunder Gold mid-band
    // Band 4: Blistering White-Gold core filament
    float inkEdge = smoothstep(outerBound, outerBound - 0.14, dist);
    float cyanBand = smoothstep(outerBound - 0.12, outerBound - 0.24, dist);
    float goldBand = smoothstep(0.56 * widthScale, 0.36 * widthScale, dist);
    float coreBand = smoothstep(0.24 * widthScale, 0.09 * widthScale, dist);

    vec3 col = uInkColor;
    col = mix(col, uCyanColor * 1.25, cyanBand);
    col = mix(col, uGoldColor * (1.18 * surge), goldBand);
    col = mix(col, uCoreColor * 1.32, coreBand);

    float fadeOut = 1.0 - smoothstep(0.72, 1.0, uLife);
    float tipFade = smoothstep(0.0, 0.04, vUv.x) * (1.0 - smoothstep(0.95, 1.0, vUv.x));
    float alpha = clamp(inkEdge * 0.98 * fadeOut * (0.35 + 0.65 * tipFade) * uOpacity, 0.0, 1.0);
    if (alpha < 0.03) discard;

    gl_FragColor = vec4(col, alpha);
  }
`;

interface ActiveThunderZigzag {
  group: THREE.Group;
  shaderMats: THREE.ShaderMaterial[];
  mats: THREE.MeshBasicMaterial[];
  starGroups: THREE.Group[];
  geos: THREE.BufferGeometry[];
  worldX: number;
  worldY: number;
  life: number;
  maxLife: number;
}

interface ActiveWindGale {
  group: THREE.Group;
  ribbonMats: THREE.ShaderMaterial[];
  shardMeshes: Array<{
    mesh: THREE.Mesh;
    vx: number;
    vy: number;
    spin: number;
  }>;
  geos: THREE.BufferGeometry[];
  shardMats: THREE.MeshBasicMaterial[];
  worldX: number;
  worldY: number;
  angle: number;
  life: number;
  maxLife: number;
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
  segments = 28
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const startA = -arcSpan * 0.5 * direction;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startA + arcSpan * t * direction;
    const rCenter = radius * (0.86 + Math.sin(t * Math.PI * 0.75) * 0.22);
    const taper = Math.sin(Math.pow(t, 0.72) * Math.PI);
    const halfW = width * 0.5 * (0.16 + taper * 0.92);

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const zLift = Math.sin(t * Math.PI) * (width * 0.42);

    const ix = cosA * Math.max(8, rCenter - halfW);
    const iy = sinA * Math.max(8, rCenter - halfW);
    const ox = cosA * (rCenter + halfW);
    const oy = sinA * (rCenter + halfW);

    positions.push(ix, iy, zLift * 0.6);
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

/** Painterly flame tongues taper to a fine, curling point rather than another glowing circle. */
function buildTaperedFlameTongueGeometry(length: number, width: number, segments = 11): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const halfWidth = width * Math.pow(1 - t, 0.68) * (0.5 + 0.55 * Math.sin(t * Math.PI));
    const curveY = Math.sin(t * Math.PI * 1.35) * length * 0.12 + t * t * length * 0.11;
    const lift = Math.sin(t * Math.PI) * length * 0.10;
    positions.push(t * length, curveY - halfWidth, lift);
    positions.push(t * length, curveY + halfWidth, lift + 0.3);
    uvs.push(t, 0, t, 1);
    if (i < segments) {
      const b = i * 2;
      indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Builds a variable-radius tapered serpentine Eastern Dragon body mesh (whip tail -> muscular torso -> neck!)
 */
function buildTaperedDragonBodyGeometry(
  curve: THREE.CatmullRomCurve3,
  tubularSegments: number,
  maxRadius: number,
  radialSegments = 8
): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const P = new THREE.Vector3();
  const v = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i++) {
    const u = i / tubularSegments;
    curve.getPointAt(u, P);
    // Graceful serpentine taper: sharp whip tail (u=0) -> muscular mid-coil -> sculpted neck (u=1)
    const taper = Math.pow(Math.sin(Math.min(1, u * 0.88 + 0.08) * Math.PI * 0.72), 0.78);
    const radius = Math.max(2.2, maxRadius * (0.14 + taper * 0.92));

    const N = frames.normals[i];
    const B = frames.binormals[i];
    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      const sin = Math.sin(theta);
      const cos = -Math.cos(theta);
      v.set(
        P.x + radius * (cos * N.x + sin * B.x),
        P.y + radius * (cos * N.y + sin * B.y),
        P.z + radius * (cos * N.z + sin * B.z)
      );
      positions.push(v.x, v.y, v.z);
      uvs.push(u, j / radialSegments);
    }
  }

  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j;
      const b = (i + 1) * (radialSegments + 1) + j;
      const c = (i + 1) * (radialSegments + 1) + (j + 1);
      const d = i * (radialSegments + 1) + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createRibbonMaterial(
  pal: RibbonPaletteColors,
  mode: number,
  opacity: number,
  inkBorder: boolean,
  blending: THREE.Blending,
  hdrBoost = 1.65
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLife: { value: 0 },
      uCoreColor: { value: pal.core.clone() },
      uMidColor: { value: pal.mid.clone() },
      uEdgeColor: { value: pal.edge.clone() },
      uInkColor: { value: pal.ink.clone() },
      uOpacity: { value: opacity },
      uInkBorder: { value: inkBorder ? 1.0 : 0.0 },
      uMode: { value: mode },
      uHdrBoost: { value: hdrBoost },
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

function paletteModeIndex(palette: DemonSlayerVfxPalette): number {
  if (palette === 'water' || palette === 'bronze') return 1.0;
  if (palette === 'thunder') return 2.0;
  if (palette === 'wind') return 3.0;
  return 0.0;
}

export class WebglDemonSlayerVfxOverlay {
  public readonly canvas: HTMLCanvasElement;
  public readonly floorCanvas: HTMLCanvasElement;
  public readonly bloomCanvas: HTMLCanvasElement;
  public hasBloomFrame = false;

  private renderer: THREE.WebGLRenderer | null = null;
  private bloomComposer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private bloomCtx: CanvasRenderingContext2D | null = null;
  private floorCtx: CanvasRenderingContext2D | null = null;

  private scene: THREE.Scene;
  private floorScene: THREE.Scene;
  private camera: THREE.OrthographicCamera;

  private ribbons: ActiveWebglRibbon[] = [];
  private cyclones: ActiveWebglCyclone[] = [];
  private sparks: ActiveWebglSpark[] = [];
  private solarWheels: ActiveSolarWheel[] = [];
  private waterDragons: ActiveWaterDragon[] = [];
  private thunderBolts: ActiveThunderZigzag[] = [];
  private windGales: ActiveWindGale[] = [];
  private mandalas: ActiveCompassMandala[] = [];
  private bloodCages: ActiveBloodCage[] = [];
  private starbursts: ActiveStarburst[] = [];
  private shockwaveRings: ActiveShockwaveRing[] = [];

  private sparkGeo: THREE.PlaneGeometry;
  private elapsed = 0;
  private width = 1440;
  private height = 900;
  private isSoftwareGl = false;
  private disposed = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1440;
    this.canvas.height = 900;
    this.floorCanvas = document.createElement('canvas');
    this.floorCanvas.width = 1440;
    this.floorCanvas.height = 900;
    this.floorCtx = this.floorCanvas.getContext('2d');
    this.bloomCanvas = document.createElement('canvas');
    this.bloomCanvas.width = 720;
    this.bloomCanvas.height = 450;
    this.bloomCtx = this.bloomCanvas.getContext('2d');

    this.scene = new THREE.Scene();
    this.floorScene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-720, 720, 450, -450, -900, 900);
    this.camera.position.z = 500;
    this.sparkGeo = new THREE.PlaneGeometry(1, 1);

    try {
      this.isSoftwareGl = isSoftwareWebGLRenderer();
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: !this.isSoftwareGl,
        powerPreference: 'high-performance',
        premultipliedAlpha: true,
      });
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.12;

      // Selective HDR UnrealBloomPass on GPU devices (skipped on software WebGL so CPU never stalls)
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
          0.68, // strength
          0.42, // radius
          0.95 // selective HDR threshold (only brightest elemental spines bloom!)
        );
        this.bloomComposer.addPass(this.bloomPass);
      }

      this.resize(1440, 900);
    } catch {
      this.renderer = null;
    }
  }

  public resize(vw: number, vh: number): void {
    const safeW = Math.max(320, Math.round(vw));
    const safeH = Math.max(240, Math.round(vh));
    if (safeW === this.width && safeH === this.height) return;
    this.width = safeW;
    this.height = safeH;
    this.floorCanvas.width = safeW;
    this.floorCanvas.height = safeH;
    this.camera.left = -safeW * 0.5;
    this.camera.right = safeW * 0.5;
    this.camera.top = safeH * 0.5;
    this.camera.bottom = -safeH * 0.5;
    this.camera.updateProjectionMatrix();

    if (this.renderer) {
      const pr = this.isSoftwareGl ? 0.65 : Math.min(window.devicePixelRatio || 1, 1.35);
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
  }): void {
    if (!this.renderer || this.disposed) return;
    // Strict visual clarity cap: never stack 20+ ribbons into noisy soup
    if (this.ribbons.length >= 6) {
      const oldest = this.ribbons.shift();
      if (oldest) this.disposeRibbon(oldest);
    }

    const palette = opts.palette ?? 'hinokami';
    const pal = RIBBON_PALETTES[palette];
    const mode = paletteModeIndex(palette);
    const radius = opts.radius ?? 160;
    const width = opts.width ?? 62;
    const arcSpan = opts.arcSpan ?? 2.75;
    const direction = opts.direction ?? 1;

    const inkGeo = buildCurvedRibbonGeometry(radius, width * 1.18, arcSpan, direction, 26);
    const coreGeo = buildCurvedRibbonGeometry(radius, width, arcSpan, direction, 26);
    const glowGeo = buildCurvedRibbonGeometry(radius, width * 1.78, arcSpan, direction, 24);

    const inkMat = createRibbonMaterial(pal, mode, 0.88, true, THREE.NormalBlending, 0.35);
    inkMat.uniforms.uCoreColor.value.copy(pal.ink);
    inkMat.uniforms.uMidColor.value.copy(pal.ink);
    inkMat.uniforms.uEdgeColor.value.copy(pal.ink);

    const coreMat = createRibbonMaterial(pal, mode, 0.98, true, THREE.NormalBlending, 1.85);
    const glowMat = createRibbonMaterial(pal, mode, 0.72, false, THREE.AdditiveBlending, 2.05);

    const inkMesh = new THREE.Mesh(inkGeo, inkMat);
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    inkMesh.position.z = -2;
    glowMesh.position.z = 3;

    const group = new THREE.Group();
    group.add(inkMesh, coreMesh, glowMesh);
    this.scene.add(group);

    this.ribbons.push({
      group,
      inkMesh,
      coreMesh,
      glowMesh,
      worldX: opts.x,
      worldY: opts.y,
      baseRotZ: -opts.angle,
      tiltX: opts.tiltX ?? 0.62,
      tiltY: opts.tiltY ?? (direction === 1 ? -0.18 : 0.18),
      spinRate: opts.spinRate ?? direction * 1.45,
      life: 0,
      maxLife: opts.duration ?? 0.34,
      scale: 1,
    });
  }

  /**
   * Hinokami Kagura / Rengoku Flame Breathing: Dual Counter-Rotating 3D Solar Flame Wheels!
   */
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

    const pal = RIBBON_PALETTES[opts.palette ?? 'hinokami'];
    const radius = opts.radius ?? 195;
    const group = new THREE.Group();
    const mats: THREE.ShaderMaterial[] = [];
    const geos: THREE.BufferGeometry[] = [];

    for (let i = 0; i < 2; i++) {
      const dir: 1 | -1 = i === 0 ? 1 : -1;
      // Offset two OPEN, tapered arcs; full 360-degree neon donuts conceal the
      // axe and read as generic rings rather than living fire brushstrokes.
      const r = radius * (i === 0 ? 1.0 : 0.79);
      const w = i === 0 ? 49 : 32;
      const openArc = Math.PI * (i === 0 ? 1.59 : 1.26);
      const geo = buildCurvedRibbonGeometry(r, w, openArc, dir, 34);
      const inkGeo = buildCurvedRibbonGeometry(r, w * 1.16, openArc + 0.04, dir, 30);

      const inkMat = createRibbonMaterial(pal, 0, 0.90, true, THREE.NormalBlending, 0.25);
      inkMat.uniforms.uCoreColor.value.copy(pal.ink);
      inkMat.uniforms.uMidColor.value.copy(pal.ink);
      inkMat.uniforms.uEdgeColor.value.copy(pal.ink);

      const flameMat = createRibbonMaterial(pal, 0, 0.98, true, THREE.NormalBlending, 2.15);
      const glowMat = createRibbonMaterial(pal, 0, 0.68, false, THREE.AdditiveBlending, 2.3);

      const sub = new THREE.Group();
      const inkMesh = new THREE.Mesh(inkGeo, inkMat);
      inkMesh.position.z = -3;
      const flameMesh = new THREE.Mesh(geo, flameMat);
      const glowMesh = new THREE.Mesh(geo, glowMat);
      glowMesh.position.z = 3;
      sub.add(inkMesh, flameMesh, glowMesh);
      sub.rotation.set(i === 0 ? 0.56 : 0.92, i === 0 ? -0.22 : 0.26, i * 1.3);
      group.add(sub);

      geos.push(geo, inkGeo);
      mats.push(inkMat, flameMat, glowMat);
    }

    // Thirteen staggered, tapered ink-edged flame tongues break the formerly
    // symmetric donut into a brush-painted inferno without growing the
    // fullscreen VFX budget; shared geometry/materials remain GPU-light.
    // Shared geometry/materials avoid unbounded GPU cost on the M3 Air.
    const tongueGeo = buildTaperedFlameTongueGeometry(radius * 0.49, radius * 0.086, 11);
    geos.push(tongueGeo);
    const tongueInk = createRibbonMaterial(pal, 0, 0.74, true, THREE.NormalBlending, 0.80);
    tongueInk.uniforms.uCoreColor.value.copy(pal.ink);
    tongueInk.uniforms.uMidColor.value.copy(pal.ink);
    tongueInk.uniforms.uEdgeColor.value.copy(pal.ink);
    const tongueFire = createRibbonMaterial(pal, 0, 0.95, true, THREE.NormalBlending, 1.45);
    mats.push(tongueInk, tongueFire);
    for (let d = 0; d < 13; d++) {
      const a = (d / 13) * Math.PI * 2 + (d % 3) * 0.09;
      const orbit = radius * (0.66 + (d % 4) * 0.087);
      const tongue = new THREE.Group();
      tongue.position.set(Math.cos(a) * orbit, Math.sin(a) * orbit * 0.86, 8 + (d % 2) * 3);
      tongue.rotation.z = a + ((d % 4) - 1.5) * 0.19;
      const ink = new THREE.Mesh(tongueGeo, tongueInk);
      ink.position.z = -1.5;
      ink.scale.set(1.06, 1.25, 1);
      const core = new THREE.Mesh(tongueGeo, tongueFire);
      core.scale.set(0.94 + (d % 3) * 0.09, 0.90, 1);
      tongue.add(ink, core);
      group.add(tongue);
    }

    this.scene.add(group);
    this.solarWheels.push({
      group,
      mats,
      geos,
      worldX: opts.x,
      worldY: opts.y,
      baseAngle: -(opts.angle ?? 0),
      spinRate: 4.8,
      life: 0,
      maxLife: opts.duration ?? 0.52,
    });
  }

  /**
   * Varuna — Tenth Form Constant Flux: Sculpted 3D Coiled Water Dragon with Hokusai Wave Shader,
   * Sumi-e Navy Ink Hull, Horned Dragon Head, Glowing Cyan Eyes & Flowing Whiskers!
   */
  public spawnWaterDragon(opts: {
    x: number;
    y: number;
    angle: number;
    radius?: number;
    duration?: number;
  }): void {
    if (!this.renderer || this.disposed) return;
    if (this.waterDragons.length >= 4) {
      const oldest = this.waterDragons.shift();
      if (oldest) this.disposeWaterDragon(oldest);
    }

    const pal = RIBBON_PALETTES.water;
    const baseR = opts.radius ?? 145;
    const group = new THREE.Group();
    const geos: THREE.BufferGeometry[] = [];
    const fadeMats: THREE.MeshBasicMaterial[] = [];

    // Tapered serpentine 3D coiled Eastern Water Dragon spine
    const pts: THREE.Vector3[] = [];
    const steps = 36;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const theta = t * Math.PI * 2.18 - Math.PI * 0.55;
      const rad = baseR * (0.56 + t * 0.62);
      const x = Math.cos(theta) * rad;
      const y = Math.sin(theta) * rad * 0.66 + Math.sin(t * Math.PI) * 52;
      const z = Math.sin(t * Math.PI * 2.4) * 38 + t * 28;
      pts.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeo = buildTaperedDragonBodyGeometry(curve, 52, 23, 8);
    const inkGeo = buildTaperedDragonBodyGeometry(curve, 40, 27.5, 8);
    geos.push(tubeGeo, inkGeo);

    const inkMat = new THREE.MeshBasicMaterial({
      color: 0x040b1d,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
    });
    fadeMats.push(inkMat);

    // Dedicated Hokusai Dragon Scale & Parallel Wave Striation Shader (rich cobalt/cyan, never blown-out white!)
    const bodyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uLife: { value: 0 },
      },
      vertexShader: RIBBON_VERTEX_SHADER,
      fragmentShader: WATER_DRAGON_FRAGMENT_SHADER,
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const inkBody = new THREE.Mesh(inkGeo, inkMat);
    inkBody.position.z = -2;
    const dragonBody = new THREE.Mesh(tubeGeo, bodyMat);
    group.add(inkBody, dragonBody);

    // Companion swirling Hokusai woodblock wave crest ribbons embracing the coiled dragon
    const waveSplashGeo = buildCurvedRibbonGeometry(baseR * 1.12, 42, Math.PI * 1.65, 1, 30);
    geos.push(waveSplashGeo);
    const waveSplashMat = createRibbonMaterial(pal, 1.0, 0.92, true, THREE.NormalBlending, 1.15);
    const waveSplashMesh = new THREE.Mesh(waveSplashGeo, waveSplashMat);
    waveSplashMesh.rotation.set(0.55, -0.18, 0.35);
    waveSplashMesh.position.z = -4;
    group.add(waveSplashMesh);
    // Keep shader updated via bodyMat? Use fadeMats/custom cleanup: attach waveSplashMat to fadeMats via cast or dispose cleanly
    fadeMats.push(waveSplashMat as unknown as THREE.MeshBasicMaterial);

    // Sculpted Painterly Ukiyo-e Eastern Dragon Head (Organic Fresnel Watercolor Snout + Open Jaw + Swept Wave Mane + Curved Pearl Antlers + Ribbon Whiskers + Trailing Ink Droplets)
    const headPos = pts[pts.length - 1];
    const headTan = curve.getTangent(1).normalize();
    const headGroup = new THREE.Group();
    headGroup.position.copy(headPos);
    headGroup.rotation.z = Math.atan2(headTan.y, headTan.x);

    const makeHeadWatercolorMat = (baseHex: string, midHex: string, hiHex: string) =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uLife: { value: 0 },
          uBaseColor: { value: new THREE.Color(baseHex) },
          uMidColor: { value: new THREE.Color(midHex) },
          uHighlightColor: { value: new THREE.Color(hiHex) },
        },
        vertexShader: WATER_DRAGON_HEAD_VERTEX_SHADER,
        fragmentShader: WATER_DRAGON_HEAD_FRAGMENT_SHADER,
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

    const snoutMat = makeHeadWatercolorMat('#15558c', '#3db8e0', '#f4fdff');
    const jawMat = makeHeadWatercolorMat('#0e3c6b', '#2689ba', '#b8f2ff');
    const maneMat = makeHeadWatercolorMat('#165a8f', '#52c8e8', '#f7feff');
    const antlerMat = makeHeadWatercolorMat('#5d809c', '#bae0ec', '#fff9eb');

    const headInkMat = new THREE.MeshBasicMaterial({
      color: 0x0b2c52,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });
    const eyeGeo = new THREE.SphereGeometry(4.2, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffffff'),
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
    });
    const dropletMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#9eeeff'),
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
    });

    // Organic sculpted snout & jaw using curved tapered TubeGeometry splines (no flat geometric cones!)
    const snoutCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-18, 4, 2),
      new THREE.Vector3(6, 11, 5),
      new THREE.Vector3(30, 8, 4),
      new THREE.Vector3(44, 13, 2),
    ]);
    const upperJawGeo = buildTaperedDragonBodyGeometry(snoutCurve, 18, 17.5, 8);

    const lowerJawCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-12, -6, 1),
      new THREE.Vector3(8, -14, 2),
      new THREE.Vector3(30, -18, 1),
    ]);
    const lowerJawGeo = buildTaperedDragonBodyGeometry(lowerJawCurve, 14, 11.5, 7);

    // Sweeping Ukiyo-e seafoam wave-mane plumes behind the brow
    const maneCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2, 16, 6),
      new THREE.Vector3(-22, 26, 9),
      new THREE.Vector3(-46, 18, 4),
    ]);
    const crestGeo = buildTaperedDragonBodyGeometry(maneCurve, 14, 13, 7);

    geos.push(upperJawGeo, lowerJawGeo, crestGeo, eyeGeo);
    fadeMats.push(
      snoutMat as unknown as THREE.MeshBasicMaterial,
      jawMat as unknown as THREE.MeshBasicMaterial,
      maneMat as unknown as THREE.MeshBasicMaterial,
      antlerMat as unknown as THREE.MeshBasicMaterial,
      headInkMat,
      eyeMat,
      dropletMat
    );

    const upperJaw = new THREE.Mesh(upperJawGeo, snoutMat);
    const lowerJaw = new THREE.Mesh(lowerJawGeo, jawMat);
    const browCrest = new THREE.Mesh(crestGeo, maneMat);
    headGroup.add(upperJaw, lowerJaw, browCrest);

    for (const side of [-1, 1]) {
      // Swept curved sea-pearl dragon antlers
      const hornCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-10, side * 12, 8),
        new THREE.Vector3(-24, side * 26, 14),
        new THREE.Vector3(-44, side * 34, 10),
      ]);
      const hornGeo = buildTaperedDragonBodyGeometry(hornCurve, 10, 4.4, 6);
      geos.push(hornGeo);
      headGroup.add(new THREE.Mesh(hornGeo, antlerMat));

      // Luminous seafoam eyes with deep indigo brow socket
      const eyeInk = new THREE.Mesh(eyeGeo, headInkMat);
      eyeInk.position.set(12, side * 9, 12.5);
      eyeInk.scale.setScalar(1.26);
      headGroup.add(eyeInk);

      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(12, side * 9, 14);
      headGroup.add(eye);

      // Flowing undulating calligraphic ribbon whiskers
      const wPts = [
        new THREE.Vector3(32, side * 6, 5),
        new THREE.Vector3(14, side * 32, 14),
        new THREE.Vector3(-18, side * 24, 9),
        new THREE.Vector3(-52, side * 44, 2),
      ];
      const wGeo = buildTaperedDragonBodyGeometry(new THREE.CatmullRomCurve3(wPts), 14, 2.8, 5);
      geos.push(wGeo);
      headGroup.add(new THREE.Mesh(wGeo, maneMat));
    }

    // Soft translucent seafoam spray droplets trailing around the coiled crest
    const dropGeo = new THREE.SphereGeometry(3.8, 6, 6);
    geos.push(dropGeo);
    const dropletOffsets = [
      [26, 26, 8],
      [-6, -28, 6],
      [-34, 30, 5],
      [40, -10, 7],
      [-48, -22, 4],
    ];
    for (const [dx, dy, dz] of dropletOffsets) {
      const dHalo = new THREE.Mesh(dropGeo, headInkMat);
      dHalo.position.set(dx, dy, dz - 0.5);
      dHalo.scale.set(1.18, 1.18, 1.18);
      const dCore = new THREE.Mesh(dropGeo, dropletMat);
      dCore.position.set(dx, dy, dz);
      dCore.scale.set(0.88, 0.88, 0.88);
      headGroup.add(dHalo, dCore);
    }

    group.add(headGroup);
    this.scene.add(group);

    this.waterDragons.push({
      group,
      bodyMat,
      fadeMats,
      geos,
      worldX: opts.x,
      worldY: opts.y,
      angle: opts.angle,
      speed: 220,
      life: 0,
      maxLife: opts.duration ?? 0.68,
    });

    // Accompanying water spray spark burst
    this.spawnSparkBurst({
      x: opts.x,
      y: opts.y,
      count: 22,
      speed: 440,
      palette: 'water',
    });
  }

  /**
   * Zenitsu Thunderclap & Flash: Razor Geometric Zigzag Lightning Bolts + Starburst Bounce Nodes!
   * Rebuilt Zenitsu Thunder Breathing (Thunderclap & Flash — Godspeed):
   * Procedural GLSL plasma lightning ribbons with miter-joined whip taper, 3-5 forked
   * crackling sub-arcs, sculpted 8-point ink-outlined comic starburst bounce nodes,
   * electric cyan/gold corona, pitch-black Sumi-e ink borders, and floor ionization rings!
   */
  public spawnThunderZigzag(opts: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    palette?: DemonSlayerVfxPalette;
    duration?: number;
    width?: number;
    withFloorRing?: boolean;
  }): void {
    if (!this.renderer || this.disposed) return;
    if (this.thunderBolts.length >= 6) {
      const oldest = this.thunderBolts.shift();
      if (oldest) this.disposeThunder(oldest);
    }

    const pal = RIBBON_PALETTES[opts.palette ?? 'thunder'];
    const dx = opts.x2 - opts.x1;
    const dy = -(opts.y2 - opts.y1);
    const boltDist = Math.max(60, Math.hypot(dx, dy));
    const seed = this.elapsed * 19 + this.thunderBolts.length * 3.7 + 1.3;
    const mainPts = computeThunderZigzagVertices(
      0,
      0,
      dx,
      dy,
      boltDist > 220 ? 6 : 5,
      Math.min(58, Math.max(28, boltDist * 0.18)),
      seed
    );
    const branches = computeThunderForkedBranches(mainPts, seed);

    const group = new THREE.Group();
    const shaderMats: THREE.ShaderMaterial[] = [];
    const mats: THREE.MeshBasicMaterial[] = [];
    const starGroups: THREE.Group[] = [];
    const geos: THREE.BufferGeometry[] = [];
    const boltW = opts.width ?? 26;

    const createBoltShaderMat = (
      isHalo: boolean,
      subSeed: number,
      opacity: number
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
          uCoreColor: { value: new THREE.Color('#fffef2') },
          uGoldColor: { value: pal.mid.clone() },
          uCyanColor: { value: pal.edge.clone() },
          uInkColor: { value: pal.ink.clone() },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: isHalo ? THREE.AdditiveBlending : THREE.NormalBlending,
      });

    // Layer 1: Primary tapered GLSL plasma bolt trunk + electric glow halo
    const mainHaloGeo = buildTaperedThunderRibbonGeometry(mainPts, boltW * 2.15, boltW * 0.85, 17);
    const mainCoreGeo = buildTaperedThunderRibbonGeometry(mainPts, boltW * 1.15, boltW * 0.42, 21);
    const mainHaloMat = createBoltShaderMat(true, seed, 0.88);
    const mainCoreMat = createBoltShaderMat(false, seed, 1.0);
    geos.push(mainHaloGeo, mainCoreGeo);
    shaderMats.push(mainHaloMat, mainCoreMat);
    group.add(new THREE.Mesh(mainHaloGeo, mainHaloMat), new THREE.Mesh(mainCoreGeo, mainCoreMat));

    // Layer 2: Forked secondary crackling sub-arcs peeling off main Zenitsu elbow bends
    branches.forEach((bPts, idx) => {
      const bWidth = Math.max(8, boltW * (0.52 - idx * 0.04));
      const bHaloGeo = buildTaperedThunderRibbonGeometry(bPts, bWidth * 1.85, 3.2, 18);
      const bCoreGeo = buildTaperedThunderRibbonGeometry(bPts, bWidth, 2.2, 22);
      const bHaloMat = createBoltShaderMat(true, seed + 11.4 * (idx + 1), 0.72);
      const bCoreMat = createBoltShaderMat(false, seed + 11.4 * (idx + 1), 0.94);
      geos.push(bHaloGeo, bCoreGeo);
      shaderMats.push(bHaloMat, bCoreMat);
      group.add(new THREE.Mesh(bHaloGeo, bHaloMat), new THREE.Mesh(bCoreGeo, bCoreMat));
    });

    // Layer 3: Sculpted 8-point ink-outlined anime comic starburst bounce nodes at elbows & impact tip
    const inkStarGeo = buildStarburstPolygonGeometry(8, boltW * 1.48, boltW * 0.44);
    const cyanStarGeo = buildStarburstPolygonGeometry(8, boltW * 1.24, boltW * 0.34);
    const coreStarGeo = buildStarburstPolygonGeometry(8, boltW * 0.78, boltW * 0.22);
    geos.push(inkStarGeo, cyanStarGeo, coreStarGeo);

    const starInkMat = new THREE.MeshBasicMaterial({
      color: pal.ink,
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const starCyanMat = new THREE.MeshBasicMaterial({
      color: pal.edge.clone().lerp(pal.mid, 0.35),
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const starCoreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#fffef0'),
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    mats.push(starInkMat, starCyanMat, starCoreMat);

    const nodeIndices = [
      Math.max(1, Math.floor(mainPts.length * 0.34)),
      Math.max(2, Math.floor(mainPts.length * 0.68)),
      mainPts.length - 1,
    ];
    const uniqueNodeIndices = Array.from(new Set(nodeIndices)).filter(
      (idx) => idx > 0 && idx < mainPts.length
    );

    for (const idx of uniqueNodeIndices) {
      const pt = mainPts[idx];
      const isImpactTip = idx === mainPts.length - 1;
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(pt.x, pt.y, 24);
      const baseScale = isImpactTip ? 1.25 : 0.76;
      nodeGroup.scale.setScalar(baseScale);
      nodeGroup.rotation.z = idx * 0.62;

      const inkM = new THREE.Mesh(inkStarGeo, starInkMat);
      inkM.position.z = -1;
      const cyanM = new THREE.Mesh(cyanStarGeo, starCyanMat);
      cyanM.position.z = 0;
      const coreM = new THREE.Mesh(coreStarGeo, starCoreMat);
      coreM.position.z = 1;
      nodeGroup.add(inkM, cyanM, coreM);
      group.add(nodeGroup);
      starGroups.push(nodeGroup);
    }

    // Layer 4: Crackling floor ionization ring at impact point for weighty grounded presence
    if (opts.withFloorRing !== false) {
      this.spawnShockwaveRing({
        x: opts.x2,
        y: opts.y2 + 12,
        radius: Math.max(76, Math.min(138, boltDist * 0.36)),
        palette: 'thunder',
        duration: 0.38,
      });
    }

    this.scene.add(group);
    this.thunderBolts.push({
      group,
      shaderMats,
      mats,
      starGroups,
      geos,
      worldX: opts.x1,
      worldY: opts.y1,
      life: 0,
      maxLife: opts.duration ?? 0.56,
    });
  }

  /**
   * Subtle 4-point anime blade-edge startup glint on Rudra's Parashu axe head during windup
   * so anticipation feels crisp without spawning premature slash arcs.
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
      color: pal.mid.clone().multiplyScalar(1.45),
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
      color: pal.core.clone().multiplyScalar(1.8),
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

  /**
   * Sanemi Wind Breathing: Layered Emerald Razor Gale Crescents + Flying Pitch-Black Sumi-e Ink Shards!
   */
  public spawnWindGaleCrescents(opts: {
    x: number;
    y: number;
    angle: number;
    radius?: number;
    duration?: number;
  }): void {
    if (!this.renderer || this.disposed) return;
    if (this.windGales.length >= 2) {
      const oldest = this.windGales.shift();
      if (oldest) this.disposeWindGale(oldest);
    }

    const pal = RIBBON_PALETTES.wind;
    const radius = opts.radius ?? 190;
    const group = new THREE.Group();
    const ribbonMats: THREE.ShaderMaterial[] = [];
    const geos: THREE.BufferGeometry[] = [];
    const shardMats: THREE.MeshBasicMaterial[] = [];
    const shardMeshes: ActiveWindGale['shardMeshes'] = [];

    for (let i = 0; i < 3; i++) {
      const r = radius * (0.72 + i * 0.22);
      const w = 54 + i * 16;
      const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
      const geo = buildCurvedRibbonGeometry(r, w, 2.65 + i * 0.28, dir, 26);
      const mat = createRibbonMaterial(pal, 3.0, 0.96 - i * 0.08, true, THREE.NormalBlending, 1.85);
      const glowMat = createRibbonMaterial(pal, 3.0, 0.62, false, THREE.AdditiveBlending, 2.0);

      const m = new THREE.Mesh(geo, mat);
      m.rotation.set(0.55 + i * 0.18, (i - 1) * 0.28, -opts.angle + (i - 1) * 0.45);
      const gm = new THREE.Mesh(geo, glowMat);
      gm.rotation.copy(m.rotation);
      gm.position.z = 3;
      group.add(m, gm);

      geos.push(geo);
      ribbonMats.push(mat, glowMat);
    }

    // Subtle brush-ink wisps support the green blades without opaque black triangles
    // obscuring Rudra, weapon contact, or enemies.
    const shardGeo = new THREE.BufferGeometry();
    shardGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 13, 0, -4.5, -9, 0, 7, -4, 0], 3)
    );
    geos.push(shardGeo);
    const inkShardMat = new THREE.MeshBasicMaterial({
      color: 0x10271f,
      transparent: true,
      opacity: 0.66,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    shardMats.push(inkShardMat);

    for (let s = 0; s < 9; s++) {
      const a = -opts.angle + (s / 9) * Math.PI * 2;
      const dist = radius * (0.35 + (s % 4) * 0.18);
      const mesh = new THREE.Mesh(shardGeo, inkShardMat);
      mesh.position.set(Math.cos(a) * dist, Math.sin(a) * dist * 0.7, 18);
      const sc = 0.48 + (s % 3) * 0.16;
      mesh.scale.set(sc * 1.12, sc, 1);
      mesh.rotation.z = a;
      group.add(mesh);
      shardMeshes.push({
        mesh,
        vx: Math.cos(a) * (220 + (s % 4) * 55),
        vy: Math.sin(a) * (160 + (s % 4) * 40),
        spin: (s % 2 === 0 ? 1 : -1) * (5.2 + s * 0.32),
      });
    }

    this.scene.add(group);
    this.windGales.push({
      group,
      ribbonMats,
      shardMeshes,
      geos,
      shardMats,
      worldX: opts.x,
      worldY: opts.y,
      angle: opts.angle,
      life: 0,
      maxLife: opts.duration ?? 0.68,
    });
  }

  /**
   * Akaza Destructive Death: Compass Needle — 12-Point Glowing Snowflake Floor Mandala + Vertical Light Columns!
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
    floorDisc.scale.set(1, 0.58, 1); // Isometric floor perspective
    floorDisc.position.z = -12;
    group.add(floorDisc);

    // 6 soft-feathered rising volumetric Akaza light mist columns (zero hard rectangular edges!)
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

    // Add to floorScene so Bosses & Rudra stand ON TOP of the glowing Akaza mandala!
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
   * Rui Lower Five: 3D Crisscrossing Crimson Blood Thread Cage snapping taut across the arena!
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
      color: pal.mid.clone().multiplyScalar(2.1),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coreMat = new THREE.MeshBasicMaterial({
      color: pal.core.clone().multiplyScalar(2.2),
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
   * 6-Point Anime Weapon Clash & Perfect Parry Starburst!
   */
  public spawnClashStarburst(opts: {
    x: number;
    y: number;
    scale?: number;
    palette?: DemonSlayerVfxPalette;
    duration?: number;
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
    const rot = 0.24 + (this.elapsed * 3.1) % 0.7;

    // 1. Pitch-black Sumi-e outer ink silhouette (crisp ufotable anime comic starburst)
    const inkGeo = buildStarburstPolygonGeometry(8, 62, 13);
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

    // 2. Vibrant elemental mid-corona starburst
    const midGeo = buildStarburstPolygonGeometry(8, 54, 11);
    const midMat = new THREE.MeshBasicMaterial({
      color: pal.mid.clone().multiplyScalar(1.6),
      transparent: true,
      opacity: 0.96,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const midMesh = new THREE.Mesh(midGeo, midMat);
    midMesh.rotation.z = rot;
    midMesh.position.z = 25;

    // 3. Blistering white-hot inner needle core
    const coreGeo = buildStarburstPolygonGeometry(8, 36, 8);
    const coreMat = new THREE.MeshBasicMaterial({
      color: pal.core.clone().multiplyScalar(1.85),
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.rotation.z = rot;
    coreMesh.position.z = 26;

    group.add(inkMesh, midMesh, coreMesh);
    mats.push(inkMat, midMat, coreMat);
    geos.push(inkGeo, midGeo, coreGeo);

    this.scene.add(group);
    this.starbursts.push({
      group,
      mats,
      geos,
      worldX: opts.x,
      worldY: opts.y,
      maxScale: opts.scale ?? 1.15,
      life: 0,
      maxLife: opts.duration ?? 0.24,
    });
  }

  /**
   * From-scratch Ufotable Sumi-e Cel Ground Shockwave Ring (replaces legacy PNG flipbook shockwaves!)
   */
  public spawnShockwaveRing(opts: {
    x: number;
    y: number;
    radius?: number;
    palette?: DemonSlayerVfxPalette;
    duration?: number;
  }): void {
    if (!this.renderer || this.disposed) return;
    if (this.shockwaveRings.length >= 12) {
      const oldest = this.shockwaveRings.shift();
      if (oldest) this.disposeShockwaveRing(oldest);
    }
    const palette = opts.palette ?? 'hinokami';
    const pal = RIBBON_PALETTES[palette];
    const mode = paletteModeIndex(palette);
    const radius = opts.radius ?? 140;

    const inkGeo = buildCurvedRibbonGeometry(radius, 34, Math.PI * 1.98, 1, 28);
    const coreGeo = buildCurvedRibbonGeometry(radius, 24, Math.PI * 1.98, 1, 28);
    const inkMat = createRibbonMaterial(pal, mode, 0.88, true, THREE.NormalBlending, 0.25);
    inkMat.uniforms.uCoreColor.value.copy(pal.ink);
    inkMat.uniforms.uMidColor.value.copy(pal.ink);
    inkMat.uniforms.uEdgeColor.value.copy(pal.ink);
    const coreMat = createRibbonMaterial(pal, mode, 0.96, true, THREE.NormalBlending, 1.95);

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
      maxLife: opts.duration ?? 0.36,
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
    if (this.cyclones.length >= 8) {
      const oldest = this.cyclones.shift();
      if (oldest) this.disposeCyclone(oldest);
    }

    const palette = opts.palette ?? 'wind';
    const pal = RIBBON_PALETTES[palette];
    const mode = paletteModeIndex(palette);
    const maxRadius = opts.radius ?? 210;
    const count = Math.max(2, Math.min(4, opts.ringCount ?? 3));

    const group = new THREE.Group();
    const rings: ActiveWebglCyclone['rings'] = [];
    for (let i = 0; i < count; i++) {
      const torus = new THREE.TorusGeometry(maxRadius * (0.58 + i * 0.22), 20 + i * 6, 8, 36);
      const mat = createRibbonMaterial(pal, mode, 0.92 - i * 0.1, i === 0, THREE.AdditiveBlending, 1.9);
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
      maxLife: opts.duration ?? 0.56,
      maxRadius,
    });
  }

  public spawnSparkBurst(opts: {
    x: number;
    y: number;
    count?: number;
    speed?: number;
    palette?: DemonSlayerVfxPalette;
  }): void {
    if (!this.renderer || this.disposed) return;
    const pal = RIBBON_PALETTES[opts.palette ?? 'hinokami'];
    const count = Math.min(28, opts.count ?? 14);
    for (let i = 0; i < count; i++) {
      if (this.sparks.length >= 110) {
        const oldest = this.sparks.shift();
        if (oldest) {
          this.scene.remove(oldest.mesh);
          oldest.mesh.material.dispose();
        }
      }
      const ang = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const spd = (opts.speed ?? 380) * (0.55 + Math.random() * 0.85);
      const mat = new THREE.MeshBasicMaterial({
        color: (i % 3 === 0 ? pal.core : pal.mid).clone().multiplyScalar(1.9),
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.scale.set(22 + Math.random() * 18, 4.2, 1);
      mesh.rotation.z = -ang;
      this.scene.add(mesh);
      this.sparks.push({
        mesh,
        worldX: opts.x,
        worldY: opts.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.72,
        vz: 90 + Math.random() * 140,
        z: 10,
        life: 0,
        maxLife: 0.22 + Math.random() * 0.22,
      });
    }
  }

  public hasActiveFloorEffects(): boolean {
    return this.mandalas.length > 0 || this.shockwaveRings.length > 0;
  }

  public hasActiveForegroundEffects(): boolean {
    return (
      this.ribbons.length > 0 ||
      this.cyclones.length > 0 ||
      this.sparks.length > 0 ||
      this.solarWheels.length > 0 ||
      this.waterDragons.length > 0 ||
      this.thunderBolts.length > 0 ||
      this.windGales.length > 0 ||
      this.bloodCages.length > 0 ||
      this.starbursts.length > 0
    );
  }

  public hasActiveEffects(): boolean {
    return this.hasActiveFloorEffects() || this.hasActiveForegroundEffects();
  }

  /**
   * Returns a subtle cinema contrast dim factor [0..0.18] while a Major Breathing Ultimate
   * (Solar Flame Wheel, Water Dragon, Wind Gale, or Thunderclap) peaks so the element pops cleanly.
   */
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

  /**
   * Renders Floor-Layer VFX (Akaza 12-Point Snowflake Compass Mandalas & Sumi-e Ground Shockwave Rings)
   * into `this.floorCanvas` BEFORE characters/bosses are drawn so actors stand ON TOP of the floor VFX!
   */
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

    // Akaza 12-Point Compass Needle Floor Mandalas
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

    // Sumi-e Cel Ground Shockwave Rings
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

      for (const m of [r.inkMesh, r.coreMesh, r.glowMesh]) {
        m.material.uniforms.uTime.value = this.elapsed;
        m.material.uniforms.uLife.value = norm;
      }
    }

    // 2. Hinokami Dual Solar Flame Wheels
    for (let i = this.solarWheels.length - 1; i >= 0; i--) {
      const w = this.solarWheels[i];
      w.life += dt;
      const norm = w.life / Math.max(0.01, w.maxLife);
      if (norm >= 1) {
        this.disposeSolarWheel(w);
        this.solarWheels.splice(i, 1);
        continue;
      }
      const expand = zoom * (0.76 + Math.sin(Math.min(1, norm * 1.2) * Math.PI * 0.5) * 0.42);
      w.group.position.set(toScreenX(w.worldX), toScreenY(w.worldY), 22);
      w.group.scale.set(expand, expand * 0.84, expand);
      w.group.rotation.z = w.baseAngle - w.spinRate * w.life;
      if (w.group.children[1]) {
        w.group.children[1].rotation.z += w.spinRate * 1.4 * dt;
      }
      for (const m of w.mats) {
        m.uniforms.uTime.value = this.elapsed;
        m.uniforms.uLife.value = norm;
      }
    }

    // 3. 3D Coiled Water Dragon
    for (let i = this.waterDragons.length - 1; i >= 0; i--) {
      const d = this.waterDragons[i];
      d.life += dt;
      const norm = d.life / Math.max(0.01, d.maxLife);
      if (norm >= 1) {
        this.disposeWaterDragon(d);
        this.waterDragons.splice(i, 1);
        continue;
      }
      d.worldX += Math.cos(d.angle) * d.speed * dt * (1 - norm * 0.45);
      d.worldY += Math.sin(d.angle) * d.speed * dt * 0.72 * (1 - norm * 0.45);
      const grow = zoom * (0.68 + Math.sin(Math.min(1, norm * 1.35) * Math.PI * 0.5) * 0.48);
      d.group.position.set(toScreenX(d.worldX), toScreenY(d.worldY), 24);
      d.group.scale.set(grow, grow, grow);
      d.group.rotation.z = -d.angle + norm * 1.9;
      d.group.rotation.x = 0.26 * Math.sin(norm * Math.PI);
      d.bodyMat.uniforms.uTime.value = this.elapsed * 1.4;
      d.bodyMat.uniforms.uLife.value = norm;
      const fade = 1 - Math.max(0, (norm - 0.65) / 0.35);
      for (const fm of d.fadeMats) {
        if (fm instanceof THREE.ShaderMaterial && fm.uniforms?.uTime && fm.uniforms?.uLife) {
          fm.uniforms.uTime.value = this.elapsed * 1.4;
          fm.uniforms.uLife.value = norm;
        } else {
          fm.opacity = fade * 0.96;
        }
      }
    }

    // 4. Rebuilt Zenitsu GLSL Plasma Thunderclap Bolts + Forked Arcs + Sculpted Starbursts
    for (let i = this.thunderBolts.length - 1; i >= 0; i--) {
      const b = this.thunderBolts[i];
      b.life += dt;
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
      const starPop = Math.sin(Math.min(1, norm * 2.1) * Math.PI * 0.5) * (1 - Math.max(0, (norm - 0.55) / 0.45));
      const flicker = 0.84 + Math.sin(this.elapsed * 58 + i * 5) * 0.16;
      const starFade = Math.max(0, starPop * flicker);
      for (const sg of b.starGroups) {
        sg.rotation.z += dt * 4.2;
      }
      for (const m of b.mats) {
        m.opacity = starFade;
      }
    }

    // 5. Sanemi Wind Gale Crescents + Sumi-e Ink Shards
    for (let i = this.windGales.length - 1; i >= 0; i--) {
      const g = this.windGales[i];
      g.life += dt;
      const norm = g.life / Math.max(0.01, g.maxLife);
      if (norm >= 1) {
        this.disposeWindGale(g);
        this.windGales.splice(i, 1);
        continue;
      }
      const expand = zoom * (0.72 + norm * 0.45);
      g.group.position.set(toScreenX(g.worldX), toScreenY(g.worldY), 20);
      g.group.scale.set(expand, expand, expand);
      for (const rm of g.ribbonMats) {
        rm.uniforms.uTime.value = this.elapsed * 1.3;
        rm.uniforms.uLife.value = norm;
      }
      for (const sh of g.shardMeshes) {
        sh.mesh.position.x += sh.vx * dt;
        sh.mesh.position.y += sh.vy * dt;
        sh.mesh.rotation.z += sh.spin * dt;
      }
      const shardFade = 1 - Math.max(0, (norm - 0.55) / 0.45);
      for (const sm of g.shardMats) {
        sm.opacity = shardFade * 0.94;
      }
    }

    // 7. Rui 3D Crimson Blood Thread Cages
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

    // 8. 6-Point Weapon Clash Starbursts
    for (let i = this.starbursts.length - 1; i >= 0; i--) {
      const st = this.starbursts[i];
      st.life += dt;
      const norm = st.life / Math.max(0.01, st.maxLife);
      if (norm >= 1) {
        this.disposeStarburst(st);
        this.starbursts.splice(i, 1);
        continue;
      }
      const sc = zoom * st.maxScale * (0.35 + Math.sin(norm * Math.PI * 0.65) * 0.95);
      st.group.position.set(toScreenX(st.worldX), toScreenY(st.worldY), 32);
      st.group.scale.set(sc, sc, 1);
      st.group.rotation.z = norm * 0.85;
      const fade = 1 - norm * norm;
      for (const mat of st.mats) {
        mat.opacity = Math.max(0, fade);
      }
    }

    // 9. Cyclones
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

    // 10. Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.life += dt;
      const norm = sp.life / Math.max(0.01, sp.maxLife);
      if (norm >= 1) {
        this.scene.remove(sp.mesh);
        sp.mesh.material.dispose();
        this.sparks.splice(i, 1);
        continue;
      }
      sp.worldX += sp.vx * dt;
      sp.worldY += sp.vy * dt;
      sp.z += sp.vz * dt;
      sp.vz -= 420 * dt;
      sp.vx *= Math.max(0, 1 - dt * 3.8);
      sp.vy *= Math.max(0, 1 - dt * 3.8);

      sp.mesh.position.set(toScreenX(sp.worldX), toScreenY(sp.worldY - sp.z * 0.3), 30);
      sp.mesh.scale.x = Math.max(8, (26 - norm * 18) * zoom);
      sp.mesh.scale.y = Math.max(1.5, (4.4 - norm * 2.5) * zoom);
      sp.mesh.material.opacity = Math.max(0, 1 - norm * norm);
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

    // Pass B (All devices): Crisp alpha-transparent Sumi-e ink + cel VFX render
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    return true;
  }

  private disposeRibbon(r: ActiveWebglRibbon): void {
    this.scene.remove(r.group);
    r.inkMesh.geometry.dispose();
    r.inkMesh.material.dispose();
    r.coreMesh.geometry.dispose();
    r.coreMesh.material.dispose();
    r.glowMesh.geometry.dispose();
    r.glowMesh.material.dispose();
  }

  private disposeCyclone(c: ActiveWebglCyclone): void {
    this.scene.remove(c.group);
    for (const ring of c.rings) {
      ring.mesh.geometry.dispose();
      ring.mesh.material.dispose();
    }
  }

  private disposeSolarWheel(w: ActiveSolarWheel): void {
    this.scene.remove(w.group);
    w.geos.forEach((g) => g.dispose());
    w.mats.forEach((m) => m.dispose());
  }

  private disposeWaterDragon(d: ActiveWaterDragon): void {
    this.scene.remove(d.group);
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
    this.scene.remove(g.group);
    g.geos.forEach((geo) => geo.dispose());
    g.ribbonMats.forEach((m) => m.dispose());
    g.shardMats.forEach((m) => m.dispose());
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

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
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
    while (this.sparks.length) {
      const s = this.sparks.pop();
      if (s) {
        this.scene.remove(s.mesh);
        s.mesh.material.dispose();
      }
    }
    this.sparkGeo.dispose();
    this.bloomPass?.dispose();
    this.bloomComposer?.dispose();
    this.bloomComposer = null;
    this.renderer?.dispose();
    this.renderer = null;
  }
}
