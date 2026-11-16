import * as THREE from 'three';
import {
  FlipbookEffectPool,
  KALIYUGA_VFX_SHEETS,
} from './vfxFlipbook3d';

export type AstraElement = 'agni' | 'vajra' | 'vayu';
export type RibbonTheme = AstraElement | 'boss';

export interface RibbonSample {
  baseX: number;
  baseY: number;
  baseZ: number;
  tipX: number;
  tipY: number;
  tipZ: number;
  age: number;
}

export interface RibbonPalette {
  coreColor: THREE.Color;
  midColor: THREE.Color;
  outerColor: THREE.Color;
  inkColor: THREE.Color;
  jaggedness: number;
}

export const RIBBON_PALETTES: Record<RibbonTheme, RibbonPalette> = {
  agni: {
    coreColor: new THREE.Color('#fffbe0'),
    midColor: new THREE.Color('#ff6a18'),
    outerColor: new THREE.Color('#c91418'),
    inkColor: new THREE.Color('#090205'),
    jaggedness: 0.36,
  },
  vajra: {
    coreColor: new THREE.Color('#ffffff'),
    midColor: new THREE.Color('#fde047'),
    outerColor: new THREE.Color('#0284c7'),
    inkColor: new THREE.Color('#040d1d'),
    jaggedness: 0.56,
  },
  vayu: {
    coreColor: new THREE.Color('#f0fdf8'),
    midColor: new THREE.Color('#34d399'),
    outerColor: new THREE.Color('#047857'),
    inkColor: new THREE.Color('#031510'),
    jaggedness: 0.28,
  },
  boss: {
    coreColor: new THREE.Color('#ffe8ee'),
    midColor: new THREE.Color('#ef1838'),
    outerColor: new THREE.Color('#800718'),
    inkColor: new THREE.Color('#050102'),
    jaggedness: 0.48,
  },
};

function themeToElementKind(theme: RibbonTheme): number {
  switch (theme) {
    case 'agni':
      return 0;
    case 'vajra':
      return 1;
    case 'vayu':
      return 2;
    case 'boss':
      return 3;
  }
}

export function catmullRomValue(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/**
 * Pure vertex & UV generator building a sleek Catmull-Rom 3D triangle-strip ribbon
 * locked tightly to the weapon crescent blade edge (base -> tip).
 * Tail tapers razor-sharp to a needle point at u=0.
 */
export function buildSlashRibbonStrip(
  samples: RibbonSample[],
  maxAge: number,
  subdivisions: number,
  outPositions: Float32Array,
  outUvs: Float32Array,
  bladeFlareScale = 1.04
): number {
  if (samples.length < 2) return 0;
  const subs = Math.max(1, subdivisions);
  const segCount = (samples.length - 1) * subs + 1;
  const maxVerts = Math.floor(outPositions.length / 6);
  const pointCount = Math.min(segCount, maxVerts);

  for (let i = 0; i < pointCount; i++) {
    const exactT = (i / Math.max(1, pointCount - 1)) * (samples.length - 1);
    const idx = Math.min(samples.length - 2, Math.floor(exactT));
    const localT = exactT - idx;

    const s0 = samples[Math.max(0, idx - 1)];
    const s1 = samples[idx];
    const s2 = samples[Math.min(samples.length - 1, idx + 1)];
    const s3 = samples[Math.min(samples.length - 1, idx + 2)];

    const bx = catmullRomValue(s0.baseX, s1.baseX, s2.baseX, s3.baseX, localT);
    const by = catmullRomValue(s0.baseY, s1.baseY, s2.baseY, s3.baseY, localT);
    const bz = catmullRomValue(s0.baseZ, s1.baseZ, s2.baseZ, s3.baseZ, localT);

    const tx = catmullRomValue(s0.tipX, s1.tipX, s2.tipX, s3.tipX, localT);
    const ty = catmullRomValue(s0.tipY, s1.tipY, s2.tipY, s3.tipY, localT);
    const tz = catmullRomValue(s0.tipZ, s1.tipZ, s2.tipZ, s3.tipZ, localT);

    const age = s1.age + (s2.age - s1.age) * localT;
    const life = Math.max(0, Math.min(1, 1 - age / Math.max(0.01, maxAge)));

    // U runs 0 (oldest tail) -> 1 (leading Parashu edge)
    const u = i / Math.max(1, pointCount - 1);
    // Needle-sharp crescent profile: swells crisply forward and whips into a needle tail
    const arcEnvelope = Math.sin(Math.pow(u, 0.7) * Math.PI * 0.9);
    const widthFactor = Math.max(0.03, arcEnvelope * (0.24 + 0.76 * life));

    const dx = tx - bx;
    const dy = ty - by;
    const dz = tz - bz;

    const outerX = bx + dx * bladeFlareScale;
    const outerY = Math.max(0.16, by + dy * bladeFlareScale);
    const outerZ = bz + dz * bladeFlareScale;

    const spanT = 1.0 - widthFactor * 0.96;
    const innerX = bx + (outerX - bx) * spanT;
    const innerY = Math.max(0.14, by + (outerY - by) * spanT);
    const innerZ = bz + (outerZ - bz) * spanT;

    const pOff = i * 6;
    outPositions[pOff + 0] = innerX;
    outPositions[pOff + 1] = innerY;
    outPositions[pOff + 2] = innerZ;
    outPositions[pOff + 3] = outerX;
    outPositions[pOff + 4] = outerY;
    outPositions[pOff + 5] = outerZ;

    const uOff = i * 4;
    outUvs[uOff + 0] = u;
    outUvs[uOff + 1] = 0;
    outUvs[uOff + 2] = u;
    outUvs[uOff + 3] = 1;
  }

  return pointCount;
}

export type RibbonPassMode = 'core' | 'inkUnder' | 'glowShell';

export function createSlashRibbonMaterial(
  theme: RibbonTheme = 'agni',
  mode: RibbonPassMode = 'core'
): THREE.ShaderMaterial {
  const pal = RIBBON_PALETTES[theme];
  const elemKind = themeToElementKind(theme);

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uCoreColor: { value: pal.coreColor.clone() },
      uMidColor: { value: pal.midColor.clone() },
      uOuterColor: { value: pal.outerColor.clone() },
      uInkColor: { value: pal.inkColor.clone() },
      uJagged: { value: pal.jaggedness },
      uElementKind: { value: elemKind },
      uPassMode: { value: mode === 'inkUnder' ? 1.0 : mode === 'glowShell' ? 2.0 : 0.0 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPassMode;
      uniform float uElementKind;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float tailMask = (1.0 - uv.y) * smoothstep(0.0, 0.35, uv.x);
        // Distinct elemental vertex kinematics:
        // Agni = smooth rising flame curl; Vajra = sharp jagged electric crackle;
        // Vayu = sweeping laminar wind flutter; Boss = heavy Blood-Demon-Art pulse
        float wave = 0.0;
        if (uElementKind > 0.5 && uElementKind < 1.5) {
          float zig = abs(fract(uv.x * 16.0 - uTime * 20.0) * 2.0 - 1.0) - 0.5;
          wave = zig * 0.14 * tailMask;
        } else if (uElementKind > 1.5 && uElementKind < 2.5) {
          wave = sin(uv.x * 14.0 - uTime * 18.0) * 0.08 * tailMask;
        } else {
          wave = sin(uv.x * 20.0 - uTime * 22.0) * 0.055 * tailMask;
        }
        pos.y += wave + (uPassMode == 1.0 ? -0.014 : uPassMode == 2.0 ? 0.012 : 0.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uCoreColor;
      uniform vec3 uMidColor;
      uniform vec3 uOuterColor;
      uniform vec3 uInkColor;
      uniform float uJagged;
      uniform float uElementKind;
      uniform float uPassMode;
      varying vec2 vUv;

      float hash21(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 34.5);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
          mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        float u = vUv.x;
        float v = vUv.y;

        // Clean calligraphy taper at head & needle tip
        float uMask = smoothstep(0.0, 0.22, u) * (1.0 - smoothstep(0.95, 1.0, u) * 0.35);

        // Element-specific anime brush geometry
        float curveShape = 0.0;
        float internalPattern = 0.0;

        if (uElementKind < 0.5) {
          // 0 = AGNI (Flame Breathing): hooked S-scroll flame tongues + crisp inner fire veins
          float hook = sin(u * 16.0 - uTime * 11.0 + v * 4.2) * 0.5 + 0.5;
          float flow1 = noise(vec2(u * 11.0 - uTime * 11.0, v * 3.2));
          float flameLick = pow(sin(u * 14.0 - uTime * 9.0) * 0.5 + 0.5, 1.35);
          curveShape = flow1 * 0.48 + flameLick * 0.32 + hook * 0.20;
          internalPattern = smoothstep(0.46, 0.56, flow1 * 0.55 + v * 0.45);
        } else if (uElementKind < 1.5) {
          // 1 = VAJRA (Thunder Breathing): sharp multi-branch lightning bolts & white-cyan forks
          float zig = abs(fract(u * 19.0 - uTime * 15.0) * 2.0 - 1.0);
          float fork = abs(fract(u * 9.5 + uTime * 11.0 + v * 0.7) * 2.0 - 1.0);
          curveShape = zig * 0.72 + fork * 0.28;
          float boltLine = 1.0 - smoothstep(0.04, 0.14, abs(v - (0.60 + (zig - 0.5) * 0.36)));
          float forkLine = 1.0 - smoothstep(0.03, 0.11, abs(v - (0.36 + (fork - 0.5) * 0.28)));
          internalPattern = max(boltLine, forkLine * 0.85);
        } else if (uElementKind < 2.5) {
          // 2 = VAYU (Wind Breathing): razor coiled wind crescents & helical streaks
          float sweep = sin(u * 11.0 - uTime * 12.0 + v * 6.5) * 0.5 + 0.5;
          float wisp = noise(vec2(u * 9.0 - uTime * 10.0, v * 2.5));
          curveShape = sweep * 0.52 + wisp * 0.48;
          float ribLine = smoothstep(0.74, 0.88, sin((v - u * 0.38) * 19.0 + uTime * 10.0) * 0.5 + 0.5);
          internalPattern = ribLine;
        } else {
          // 3 = BLOOD DEMON ART (Nezuko / Gyutaro): pure-black #050102 ink voids carved inside blazing crimson ribbons
          float slashWave = noise(vec2(u * 13.0 - uTime * 9.5, v * 4.2));
          float tear = sin(u * 17.0 - uTime * 8.0 + v * 5.2) * 0.5 + 0.5;
          curveShape = slashWave * 0.56 + tear * 0.44;
          internalPattern = smoothstep(0.44, 0.56, abs(slashWave - 0.5) * 1.9 + tear * 0.25);
        }

        // Layer 1: Bold Sumi-e calligraphy ink backing stroke framing the outer edges
        if (uPassMode > 0.5 && uPassMode < 1.5) {
          float inkEdge = 0.04 + (curveShape - 0.45) * (uJagged * 1.48 + 0.16) + (1.0 - u) * 0.24;
          float inkAlpha = smoothstep(inkEdge, inkEdge + 0.055, v) * (1.0 - smoothstep(0.978, 1.0, v)) * uMask * uOpacity * 0.96;
          if (inkAlpha < 0.08 || uOpacity < 0.02) discard;
          gl_FragColor = vec4(uInkColor, clamp(inkAlpha, 0.0, 0.96));
          return;
        }

        // Layer 2: Soft additive anime bloom halo wrapping the bright core
        if (uPassMode > 1.5) {
          float glowBand = smoothstep(0.24, 0.82, v) * (1.0 - smoothstep(0.96, 1.0, v));
          float glowAlpha = glowBand * (0.78 + 0.22 * curveShape) * uMask * uOpacity * 0.46;
          if (glowAlpha < 0.03 || uOpacity < 0.02) discard;
          vec3 glowCol = mix(uOuterColor, uMidColor, v) * 1.28;
          gl_FragColor = vec4(glowCol, glowAlpha);
          return;
        }

        // Layer 0: Crisp Cel-Stepped Anime Slash Core with HDR white-hot edge (>1.1 triggers selective UnrealBloomPass)
        float erodeEdge = 0.15 + (curveShape - 0.48) * (uJagged * 1.44) + (1.0 - u) * 0.22;
        float alpha = smoothstep(erodeEdge, erodeEdge + 0.055, v) * (1.0 - smoothstep(0.965, 1.0, v)) * uMask * uOpacity;
        if (alpha < 0.06 || uOpacity < 0.02) discard;

        float bandMid = smoothstep(0.36, 0.43, v + (curveShape - 0.5) * 0.22);
        float bandCore = smoothstep(0.75, 0.82, v + (curveShape - 0.5) * 0.09) * (1.0 - smoothstep(0.945, 0.99, v));
        float inkRim = clamp(
          smoothstep(0.932, 0.968, v) * 0.94 +
          (1.0 - smoothstep(erodeEdge + 0.01, erodeEdge + 0.085, v)) * 0.95,
          0.0,
          1.0
        );

        vec3 bodyCol = mix(uOuterColor, uMidColor, bandMid);
        if (uElementKind > 0.5 && uElementKind < 1.5) {
          bodyCol = mix(bodyCol, uCoreColor * 1.52, internalPattern * 0.92);
        } else if (uElementKind > 1.5 && uElementKind < 2.5) {
          bodyCol = mix(bodyCol, uCoreColor * 1.28, internalPattern * 0.62);
        } else if (uElementKind > 2.5) {
          // Pure-black interior ink voids inside crimson Blood Demon Art
          bodyCol = mix(bodyCol, uInkColor, internalPattern * 0.92);
        } else {
          bodyCol = mix(bodyCol, mix(uMidColor, uCoreColor, 0.55), internalPattern * 0.42);
        }

        vec3 col = mix(bodyCol, uInkColor, inkRim * 0.94);
        col = mix(col, uCoreColor * 1.46, bandCore * (0.82 + 0.18 * u));
        gl_FragColor = vec4(col, clamp(alpha * 0.98, 0.0, 0.98));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: mode === 'glowShell' ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

export type SwingKind = 'attack1' | 'attack2' | 'attack3' | 'heavy' | 'cast';

export interface ParametricSwingSpec {
  startOffset: number;
  endOffset: number;
  trailSpan: number;
  innerRadius: number;
  outerRadius: number;
  centerY: number;
  tiltPitch: number;
  tiltRoll: number;
  waveAmp: number;
}

const SWING_SPECS: Record<SwingKind, ParametricSwingSpec> = {
  attack1: {
    startOffset: -1.15,
    endOffset: 1.25,
    trailSpan: 1.65,
    innerRadius: 0.68,
    outerRadius: 1.32,
    centerY: 1.15,
    tiltPitch: 0.2,
    tiltRoll: -0.32,
    waveAmp: 0.03,
  },
  attack2: {
    startOffset: 1.22,
    endOffset: -1.18,
    trailSpan: 1.65,
    innerRadius: 0.68,
    outerRadius: 1.34,
    centerY: 1.22,
    tiltPitch: -0.18,
    tiltRoll: 0.34,
    waveAmp: 0.03,
  },
  attack3: {
    startOffset: -1.65,
    endOffset: 1.75,
    trailSpan: 2.3,
    innerRadius: 0.72,
    outerRadius: 1.56,
    centerY: 1.12,
    tiltPitch: 0.14,
    tiltRoll: -0.24,
    waveAmp: 0.04,
  },
  heavy: {
    startOffset: -1.45,
    endOffset: 1.45,
    trailSpan: 2.0,
    innerRadius: 0.74,
    outerRadius: 1.64,
    centerY: 1.24,
    tiltPitch: 0.62,
    tiltRoll: 0.15,
    waveAmp: 0.04,
  },
  cast: {
    startOffset: -Math.PI * 0.35,
    endOffset: Math.PI * 1.95,
    trailSpan: Math.PI * 1.56,
    innerRadius: 0.72,
    outerRadius: 1.52,
    centerY: 1.02,
    tiltPitch: 0.12,
    tiltRoll: 0.08,
    waveAmp: 0.05,
  },
};

export function generateParametricSwingSamples(
  kind: SwingKind,
  originX: number,
  originZ: number,
  facingYaw: number,
  normProgress: number,
  reachBonus: number,
  maxAge: number,
  sampleCount = 18
): { samples: RibbonSample[]; opacity: number } {
  const spec = SWING_SPECS[kind];
  const clampedP = Math.max(0, Math.min(1, normProgress));
  const sweepT = Math.min(1, clampedP / 0.72);
  const easedSweep = 1 - Math.pow(1 - sweepT, 2.35);
  const sweepDelta = spec.endOffset - spec.startOffset;
  const dir = sweepDelta >= 0 ? 1 : -1;
  const headLocal = spec.startOffset + sweepDelta * easedSweep;

  const fadeT = clampedP > 0.72 ? (clampedP - 0.72) / 0.24 : 0;
  const opacity = Math.max(0, Math.min(1, 1 - fadeT * 0.92));

  const visibleSpan =
    spec.trailSpan * (0.35 + 0.65 * Math.min(1, sweepT * 1.45)) * (1 - fadeT * 0.42);
  const tailLocal = headLocal - dir * visibleSpan;

  const innerR = spec.innerRadius + reachBonus * 0.25;
  const outerR = spec.outerRadius + reachBonus * 0.48;
  const sinYaw = Math.sin(facingYaw);
  const cosYaw = Math.cos(facingYaw);

  const count = Math.max(4, sampleCount);
  const samples: RibbonSample[] = [];

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const localAng = tailLocal + (headLocal - tailLocal) * t;
    const lx = Math.sin(localAng);
    const lz = Math.cos(localAng);
    const arcWave = Math.sin(t * Math.PI * 2.5) * spec.waveAmp;

    const bxLocal = lx * innerR;
    const bzLocal = lz * innerR;
    const byLocal =
      spec.centerY + lx * spec.tiltRoll * innerR + lz * spec.tiltPitch * innerR * 0.45 + arcWave;

    const txLocal = lx * outerR;
    const tzLocal = lz * outerR;
    const tyLocal =
      spec.centerY + lx * spec.tiltRoll * outerR + lz * spec.tiltPitch * outerR * 0.45 + arcWave * 1.25;

    const baseX = originX + bxLocal * cosYaw + bzLocal * sinYaw;
    const baseZ = originZ - bxLocal * sinYaw + bzLocal * cosYaw;
    const tipX = originX + txLocal * cosYaw + tzLocal * sinYaw;
    const tipZ = originZ - txLocal * sinYaw + tzLocal * cosYaw;

    samples.push({
      baseX,
      baseY: Math.max(0.28, byLocal),
      baseZ,
      tipX,
      tipY: Math.max(0.35, tyLocal),
      tipZ,
      age: (1 - t) * maxAge * 0.54,
    });
  }

  return { samples, opacity };
}

export class SlashRibbonController {
  public readonly mesh: THREE.Mesh;
  private readonly inkMesh: THREE.Mesh;
  private readonly glowMesh: THREE.Mesh;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly inkMaterial: THREE.ShaderMaterial;
  private readonly glowMaterial: THREE.ShaderMaterial;
  private readonly maxSamples = 32;
  private readonly subdivisions = 3;
  private readonly maxStripPoints: number;
  private readonly positions: Float32Array;
  private readonly uvs: Float32Array;
  private readonly samples: RibbonSample[] = [];
  private readonly maxAge = 0.25;
  private theme: RibbonTheme = 'agni';

  constructor(theme: RibbonTheme = 'agni') {
    this.theme = theme;
    this.maxStripPoints = (this.maxSamples - 1) * this.subdivisions + 1;
    this.positions = new Float32Array(this.maxStripPoints * 2 * 3);
    this.uvs = new Float32Array(this.maxStripPoints * 2 * 2);

    const indices: number[] = [];
    for (let i = 0; i < this.maxStripPoints - 1; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2));
    this.geometry.setIndex(indices);
    this.geometry.setDrawRange(0, 0);

    this.material = createSlashRibbonMaterial(theme, 'core');
    this.inkMaterial = createSlashRibbonMaterial(theme, 'inkUnder');
    this.glowMaterial = createSlashRibbonMaterial(theme, 'glowShell');

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 20;

    this.inkMesh = new THREE.Mesh(this.geometry, this.inkMaterial);
    this.inkMesh.frustumCulled = false;
    this.inkMesh.renderOrder = 18;
    this.inkMesh.scale.set(1.03, 1.0, 1.03);
    this.mesh.add(this.inkMesh);

    this.glowMesh = new THREE.Mesh(this.geometry, this.glowMaterial);
    this.glowMesh.frustumCulled = false;
    this.glowMesh.renderOrder = 19;
    this.glowMesh.scale.set(1.06, 1.04, 1.06);
    this.mesh.add(this.glowMesh);
  }

  public get hasActive(): boolean {
    return this.mesh.visible || this.samples.length > 0;
  }

  public setTheme(theme: RibbonTheme) {
    if (this.theme === theme) return;
    this.theme = theme;
    const pal = RIBBON_PALETTES[theme];
    const kind = themeToElementKind(theme);
    const mats = [this.material, this.inkMaterial, this.glowMaterial];
    for (const m of mats) {
      m.uniforms.uCoreColor.value.copy(pal.coreColor);
      m.uniforms.uMidColor.value.copy(pal.midColor);
      m.uniforms.uOuterColor.value.copy(pal.outerColor);
      m.uniforms.uInkColor.value.copy(pal.inkColor);
      m.uniforms.uJagged.value = pal.jaggedness;
      m.uniforms.uElementKind.value = kind;
    }
  }

  public clear() {
    this.samples.length = 0;
    this.mesh.visible = false;
    this.geometry.setDrawRange(0, 0);
  }

  public ageSamples(dt: number) {
    if (dt <= 0) return;
    for (let i = this.samples.length - 1; i >= 0; i--) {
      this.samples[i].age += dt;
      if (this.samples[i].age >= this.maxAge) {
        this.samples.splice(i, 1);
      }
    }
  }

  public pushSample(baseWorld: THREE.Vector3, tipWorld: THREE.Vector3, initialAge = 0) {
    const prev = this.samples[this.samples.length - 1];
    if (prev) {
      const moved =
        Math.abs(prev.tipX - tipWorld.x) +
        Math.abs(prev.tipY - tipWorld.y) +
        Math.abs(prev.tipZ - tipWorld.z);
      if (moved < 0.024) return;
    }
    this.samples.push({
      baseX: baseWorld.x,
      baseY: baseWorld.y,
      baseZ: baseWorld.z,
      tipX: tipWorld.x,
      tipY: tipWorld.y,
      tipZ: tipWorld.z,
      age: initialAge,
    });
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  private syncUniforms(elapsedTime: number, opacity: number) {
    this.material.uniforms.uTime.value = elapsedTime;
    this.material.uniforms.uOpacity.value = opacity;
    this.inkMaterial.uniforms.uTime.value = elapsedTime;
    this.inkMaterial.uniforms.uOpacity.value = opacity;
    this.glowMaterial.uniforms.uTime.value = elapsedTime;
    this.glowMaterial.uniforms.uOpacity.value = opacity;
  }

  public commit(elapsedTime: number, isEmitting: boolean, flareScale = 1.12) {
    if (this.samples.length < 2) {
      this.mesh.visible = false;
      this.geometry.setDrawRange(0, 0);
      return;
    }
    const pointCount = buildSlashRibbonStrip(
      this.samples,
      this.maxAge,
      this.subdivisions,
      this.positions,
      this.uvs,
      flareScale
    );
    const triIndexCount = Math.max(0, (pointCount - 1) * 6);
    this.geometry.setDrawRange(0, triIndexCount);
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.uv as THREE.BufferAttribute).needsUpdate = true;

    const newestAge = this.samples[this.samples.length - 1].age;
    const opacity = isEmitting ? 1.0 : Math.max(0, 1 - newestAge / this.maxAge);
    this.syncUniforms(elapsedTime, opacity);
    this.mesh.visible = triIndexCount > 0;
  }

  public updateParametricSwing(
    elapsedTime: number,
    isActive: boolean,
    kind: SwingKind,
    originX: number,
    originZ: number,
    facingYaw: number,
    normProgress: number,
    reachBonus = 0
  ) {
    if (!isActive) {
      this.clear();
      return;
    }
    const { samples, opacity } = generateParametricSwingSamples(
      kind,
      originX,
      originZ,
      facingYaw,
      normProgress,
      reachBonus,
      this.maxAge,
      20
    );
    if (opacity <= 0.02 || samples.length < 2) {
      this.clear();
      return;
    }
    const pointCount = buildSlashRibbonStrip(
      samples,
      this.maxAge,
      this.subdivisions,
      this.positions,
      this.uvs,
      1.08
    );
    const triIndexCount = Math.max(0, (pointCount - 1) * 6);
    this.geometry.setDrawRange(0, triIndexCount);
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.uv as THREE.BufferAttribute).needsUpdate = true;
    this.syncUniforms(elapsedTime, opacity);
    this.mesh.visible = triIndexCount > 0;
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.inkMaterial.dispose();
    this.glowMaterial.dispose();
  }
}

function createYantraMandalaTexture(primaryHex: string, secondaryHex: string): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  ctx.clearRect(0, 0, size, size);

  ctx.strokeStyle = primaryHex;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 114, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 98, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = secondaryHex;
  ctx.lineWidth = 3;
  for (let rot = 0; rot < 2; rot++) {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + (rot * Math.PI) / 4;
      const px = cx + Math.cos(a) * 96;
      const py = cy + Math.sin(a) * 96;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 44, cy + Math.sin(a) * 44);
    ctx.lineTo(cx + Math.cos(a) * 112, cy + Math.sin(a) * 112);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Multi-ring helical Demon Slayer cyclone spawned around Rudra during [Q]/[E]/[R] Astra Cast & Finishers,
 * pairing 3 tilted swirling elemental ribbons + glowing Yantra mandala ring + jagged lightning bolts / orbiting petals.
 */
export class AstraCycloneVfx {
  public readonly group = new THREE.Group();
  private readonly ribbons: SlashRibbonController[] = [];
  private readonly angles = [0.24, -0.36, 0.5];
  private readonly yawOffsets = [0, 2.1, 4.2];
  private readonly radiiScale = [0, 0.22, 0.42];
  private readonly mandalaMesh: THREE.Mesh;
  private readonly mandalaMat: THREE.MeshBasicMaterial;
  private readonly petalGroup = new THREE.Group();
  private readonly petals: THREE.Mesh[] = [];
  private readonly petalMat: THREE.MeshBasicMaterial;
  private readonly boltLines: THREE.LineSegments;
  private readonly boltMat: THREE.LineBasicMaterial;
  private readonly boltPositions = new Float32Array(6 * 12 * 3);
  private currentTheme: RibbonTheme = 'agni';

  constructor() {
    for (let i = 0; i < 3; i++) {
      const ctrl = new SlashRibbonController('agni');
      ctrl.mesh.renderOrder = 19 + i;
      this.ribbons.push(ctrl);
      this.group.add(ctrl.mesh);
    }

    const mandalaTex =
      typeof document !== 'undefined'
        ? createYantraMandalaTexture('#fff4cc', '#ff8c2a')
        : null;
    this.mandalaMat = new THREE.MeshBasicMaterial({
      map: mandalaTex,
      color: 0xff9f40,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.mandalaMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), this.mandalaMat);
    this.mandalaMesh.rotation.x = -Math.PI * 0.5;
    this.mandalaMesh.position.y = 0.032;
    this.mandalaMesh.renderOrder = 15;
    this.group.add(this.mandalaMesh);

    this.petalMat = new THREE.MeshBasicMaterial({
      color: 0xffe49e,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const petalGeo = new THREE.TorusGeometry(0.36, 0.036, 4, 12, Math.PI * 0.72);
    petalGeo.rotateX(Math.PI * 0.5);
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Mesh(petalGeo, this.petalMat);
      p.renderOrder = 22;
      this.petals.push(p);
      this.petalGroup.add(p);
    }
    this.group.add(this.petalGroup);

    const boltGeo = new THREE.BufferGeometry();
    boltGeo.setAttribute('position', new THREE.BufferAttribute(this.boltPositions, 3));
    this.boltMat = new THREE.LineBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    this.boltLines = new THREE.LineSegments(boltGeo, this.boltMat);
    this.boltLines.frustumCulled = false;
    this.boltLines.renderOrder = 23;
    this.boltLines.visible = false;
    this.group.add(this.boltLines);

    this.group.visible = false;
  }

  public get hasActive(): boolean {
    return this.group.visible;
  }

  public setTheme(theme: RibbonTheme) {
    this.currentTheme = theme;
    for (const r of this.ribbons) r.setTheme(theme);
    const pal = RIBBON_PALETTES[theme];
    this.mandalaMat.color.copy(pal.midColor);
    this.petalMat.color.copy(pal.coreColor);
    this.boltMat.color.copy(pal.coreColor);
  }

  public update(
    elapsedTime: number,
    isActive: boolean,
    originX: number,
    originZ: number,
    facingYaw: number,
    normProgress: number,
    reachBonus = 0
  ) {
    if (!isActive) {
      this.group.visible = false;
      for (const r of this.ribbons) r.clear();
      return;
    }
    this.group.visible = true;
    const envelope = Math.sin(Math.max(0, Math.min(1, normProgress)) * Math.PI);

    for (let i = 0; i < this.ribbons.length; i++) {
      const ctrl = this.ribbons[i];
      const spin = facingYaw + this.yawOffsets[i] + normProgress * (3.8 + i * 1.15);
      ctrl.updateParametricSwing(
        elapsedTime + i * 0.13,
        true,
        'cast',
        originX,
        originZ,
        spin,
        Math.min(0.95, normProgress * (0.85 + i * 0.08)),
        reachBonus + this.radiiScale[i]
      );
      ctrl.mesh.rotation.set(
        this.angles[i] * Math.cos(spin),
        0,
        this.angles[i] * Math.sin(spin)
      );
      ctrl.mesh.position.y = (i - 1) * 0.16;
    }

    this.mandalaMesh.position.set(originX, 0.032, originZ);
    this.mandalaMesh.rotation.z = elapsedTime * 2.4;
    this.mandalaMesh.scale.setScalar(0.88 + envelope * 0.48 + reachBonus * 0.12);
    this.mandalaMat.opacity = envelope * 0.84;

    this.petalGroup.position.set(originX, 0.18, originZ);
    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];
      const ang = (i / this.petals.length) * Math.PI * 2 + elapsedTime * 5.8;
      const rad = 1.45 + Math.sin(elapsedTime * 8 + i) * 0.4 + reachBonus * 0.35;
      p.position.set(Math.cos(ang) * rad, 0.28 + ((i % 4) * 0.32 + Math.sin(elapsedTime * 9 + i) * 0.18), Math.sin(ang) * rad);
      p.rotation.set(0.18 * Math.sin(ang), -ang + Math.PI * 0.5, 0.25);
      const sc = 0.65 + envelope * 0.72;
      p.scale.set(sc, sc, sc);
    }
    this.petalMat.opacity = envelope * 0.92;

    if (this.currentTheme === 'vajra') {
      this.boltLines.visible = true;
      this.boltMat.opacity = envelope * 0.98;
      let ptr = 0;
      for (let b = 0; b < 6; b++) {
        const baseAng = (b / 6) * Math.PI * 2 + Math.floor(elapsedTime * 24) * 0.55;
        let px = originX + Math.cos(baseAng) * 0.55;
        let py = 1.05;
        let pz = originZ + Math.sin(baseAng) * 0.55;
        for (let seg = 0; seg < 6; seg++) {
          const tNext = (seg + 1) / 6;
          const rNext = 0.55 + tNext * (2.25 + reachBonus * 0.4);
          const jitter = Math.sin(elapsedTime * 60 + b * 9 + seg * 13) * 0.42;
          const nx = originX + Math.cos(baseAng + jitter * 0.35) * rNext;
          const ny = 1.05 - tNext * 0.72 + Math.cos(elapsedTime * 50 + seg * 7 + b) * 0.25;
          const nz = originZ + Math.sin(baseAng + jitter * 0.35) * rNext;
          this.boltPositions[ptr++] = px;
          this.boltPositions[ptr++] = py;
          this.boltPositions[ptr++] = pz;
          this.boltPositions[ptr++] = nx;
          this.boltPositions[ptr++] = ny;
          this.boltPositions[ptr++] = nz;
          px = nx;
          py = ny;
          pz = nz;
        }
      }
      (this.boltLines.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    } else {
      this.boltLines.visible = false;
    }
  }

  public dispose() {
    for (const r of this.ribbons) r.dispose();
    this.mandalaMesh.geometry.dispose();
    this.mandalaMat.map?.dispose();
    this.mandalaMat.dispose();
    if (this.petals[0]) this.petals[0].geometry.dispose();
    this.petalMat.dispose();
    this.boltLines.geometry.dispose();
    this.boltMat.dispose();
  }
}

function buildSculptedCrescentWaveGeometry(segments = 24): THREE.BufferGeometry {
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const ang = (u - 0.5) * Math.PI * 0.78;
    const envelope = Math.sin(u * Math.PI);
    const outerR = 1.05;
    const innerR = outerR - (0.08 + 0.52 * Math.pow(envelope, 0.85));
    const sx = Math.sin(ang);
    const cz = Math.cos(ang);
    const yLift = envelope * 0.16;

    const pOff = i * 6;
    positions[pOff + 0] = sx * innerR;
    positions[pOff + 1] = yLift * 0.4;
    positions[pOff + 2] = cz * innerR;
    positions[pOff + 3] = sx * outerR;
    positions[pOff + 4] = yLift;
    positions[pOff + 5] = cz * outerR;

    const uOff = i * 4;
    uvs[uOff + 0] = u;
    uvs[uOff + 1] = 0;
    uvs[uOff + 2] = u;
    uvs[uOff + 3] = 1;

    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

/**
 * Forward-traveling 3-prong Demon Slayer Crescent Wave Shader Mesh (replaces stiff Torus tubes)
 * with hooked flame/lightning/wind silhouettes, pure-black Sumi-e edges, and HDR white-hot edge.
 */
export class HeavyWaveVfx {
  public readonly group = new THREE.Group();
  private readonly sharedGeo: THREE.BufferGeometry;
  private readonly waves: Array<{
    mesh: THREE.Mesh;
    mat: THREE.ShaderMaterial;
    x: number;
    z: number;
    vx: number;
    vz: number;
    yaw: number;
    age: number;
    maxAge: number;
    active: boolean;
  }> = [];

  constructor() {
    this.sharedGeo = buildSculptedCrescentWaveGeometry(24);
    for (let i = 0; i < 6; i++) {
      const mat = createSlashRibbonMaterial('agni', 'core');
      const mesh = new THREE.Mesh(this.sharedGeo, mat);
      mesh.renderOrder = 21;
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.waves.push({
        mesh,
        mat,
        x: 0,
        z: 0,
        vx: 0,
        vz: 0,
        yaw: 0,
        age: 0,
        maxAge: 0.42,
        active: false,
      });
    }
  }

  public get hasActive(): boolean {
    return this.waves.some((w) => w.active);
  }

  public triggerTripleWave(
    x: number,
    z: number,
    yaw: number,
    element: AstraElement,
    speed = 11.5
  ) {
    const pal = RIBBON_PALETTES[element];
    const kind = themeToElementKind(element);
    const spread = [-0.28, 0, 0.28];
    for (let s = 0; s < spread.length; s++) {
      const slot = this.waves.find((w) => !w.active) || this.waves[s];
      const ang = yaw + spread[s];
      slot.active = true;
      slot.age = 0;
      slot.maxAge = s === 1 ? 0.46 : 0.38;
      slot.x = x + Math.sin(ang) * 0.72;
      slot.z = z + Math.cos(ang) * 0.72;
      slot.vx = Math.sin(ang) * speed;
      slot.vz = Math.cos(ang) * speed;
      slot.yaw = ang;
      slot.mat.uniforms.uCoreColor.value.copy(pal.coreColor);
      slot.mat.uniforms.uMidColor.value.copy(pal.midColor);
      slot.mat.uniforms.uOuterColor.value.copy(pal.outerColor);
      slot.mat.uniforms.uInkColor.value.copy(pal.inkColor);
      slot.mat.uniforms.uJagged.value = pal.jaggedness;
      slot.mat.uniforms.uElementKind.value = kind;
      slot.mat.uniforms.uOpacity.value = 1;
      slot.mesh.visible = true;
      slot.mesh.position.set(slot.x, 0.62 + (s === 1 ? 0.14 : 0), slot.z);
      slot.mesh.rotation.set(s === 1 ? 0.14 : 0.34 * Math.sign(spread[s]), ang, 0);
      slot.mesh.scale.setScalar(0.95);
    }
  }

  public update(dt: number) {
    for (const w of this.waves) {
      if (!w.active) continue;
      w.age += dt;
      if (w.age >= w.maxAge) {
        w.active = false;
        w.mesh.visible = false;
        continue;
      }
      const p = w.age / w.maxAge;
      const life = 1 - p;
      w.x += w.vx * dt * (1 - p * 0.32);
      w.z += w.vz * dt * (1 - p * 0.32);
      w.mesh.position.set(w.x, 0.56 + p * 0.24, w.z);
      w.mesh.scale.set(1.05 + p * 0.95, 0.95 + p * 0.45, 1.05 + p * 0.95);
      w.mat.uniforms.uTime.value = w.age * 1.4;
      w.mat.uniforms.uOpacity.value = Math.min(1, life * 1.25);
    }
  }

  public clear() {
    for (const w of this.waves) {
      w.active = false;
      w.mesh.visible = false;
    }
  }

  public dispose() {
    this.sharedGeo.dispose();
    for (const w of this.waves) {
      w.mat.dispose();
    }
  }
}

/**
 * Pooled afterimage silhouettes for Demon Slayer high-speed dashes & Vajra Thunderclap.
 */
export class DashEchoPool {
  public readonly group = new THREE.Group();
  private readonly echoes: Array<{
    group: THREE.Group;
    mat: THREE.MeshBasicMaterial;
    ringMat: THREE.MeshBasicMaterial;
    age: number;
    maxAge: number;
    active: boolean;
  }> = [];

  constructor() {
    const bodyGeo = new THREE.CapsuleGeometry(0.28, 0.72, 4, 8);
    const ringGeo = new THREE.RingGeometry(0.32, 0.58, 16);
    ringGeo.rotateX(-Math.PI * 0.5);

    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff8c2a,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffe49e,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, mat);
      bodyMesh.position.y = 0.74;
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.04;
      g.add(bodyMesh, ringMesh);
      g.visible = false;
      this.group.add(g);
      this.echoes.push({
        group: g,
        mat,
        ringMat,
        age: 0,
        maxAge: 0.24,
        active: false,
      });
    }
  }

  public get hasActive(): boolean {
    return this.echoes.some((e) => e.active);
  }

  public spawn(x: number, z: number, yaw: number, element: AstraElement) {
    const pal = RIBBON_PALETTES[element];
    const slot = this.echoes.find((e) => !e.active) || this.echoes[0];
    slot.active = true;
    slot.age = 0;
    slot.maxAge = 0.22;
    slot.mat.color.copy(pal.midColor);
    slot.ringMat.color.copy(pal.coreColor);
    slot.group.position.set(x, 0, z);
    slot.group.rotation.y = yaw;
    slot.group.scale.set(0.95, 1.0, 0.95);
    slot.group.visible = true;
  }

  public update(dt: number) {
    for (const e of this.echoes) {
      if (!e.active) continue;
      e.age += dt;
      if (e.age >= e.maxAge) {
        e.active = false;
        e.group.visible = false;
        continue;
      }
      const life = 1 - e.age / e.maxAge;
      e.mat.opacity = life * 0.42;
      e.ringMat.opacity = life * 0.65;
      e.group.scale.set(0.95 + (1 - life) * 0.35, 1.0 - (1 - life) * 0.14, 0.95 + (1 - life) * 0.35);
    }
  }

  public clear() {
    for (const e of this.echoes) {
      e.active = false;
      e.group.visible = false;
    }
  }

  public dispose() {
    const first = this.echoes[0];
    if (first) {
      first.group.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          (o as THREE.Mesh).geometry.dispose();
        }
      });
    }
    for (const e of this.echoes) {
      e.mat.dispose();
      e.ringMat.dispose();
    }
  }
}

/**
 * Pooled sparks, impact embers, and Anime X-Flare Clash system (Zero GC per frame).
 */
export class PooledSparkSystem {
  public readonly group = new THREE.Group();
  private readonly sparks: Array<{
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    vx: number;
    vy: number;
    vz: number;
    age: number;
    maxAge: number;
    active: boolean;
  }> = [];
  private readonly clashGroup = new THREE.Group();
  private readonly clashMeshes: THREE.Mesh[] = [];
  private readonly clashMats: THREE.MeshBasicMaterial[] = [];
  private clashAge = 1;
  private clashDuration = 0.22;

  constructor(poolSize = 48) {
    const geo = new THREE.OctahedronGeometry(0.06, 0);
    for (let i = 0; i < poolSize; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd166,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.renderOrder = 21;
      this.group.add(mesh);
      this.sparks.push({
        mesh,
        mat,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        maxAge: 0.4,
        active: false,
      });
    }

    const starPlane = new THREE.PlaneGeometry(2.8, 0.18);
    const starCore = new THREE.RingGeometry(0.18, 0.92, 24);
    const geometries = [starPlane, starPlane, starCore];
    const rots = [Math.PI * 0.25, -Math.PI * 0.25, 0];
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i === 2 ? 0xffd166 : 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const m = new THREE.Mesh(geometries[i], mat);
      m.rotation.z = rots[i];
      m.renderOrder = 25;
      this.clashMeshes.push(m);
      this.clashMats.push(mat);
      this.clashGroup.add(m);
    }
    this.clashGroup.visible = false;
    this.group.add(this.clashGroup);
  }

  public get hasActive(): boolean {
    return this.clashGroup.visible || this.sparks.some((s) => s.active);
  }

  public triggerClashFlare(x: number, y: number, z: number, colorHex = 0xffe484, cameraPos?: THREE.Vector3) {
    this.clashAge = 0;
    this.clashDuration = 0.22;
    this.clashGroup.visible = true;
    this.clashGroup.position.set(x, y, z);
    this.clashGroup.lookAt(cameraPos ? cameraPos.x : 15, cameraPos ? cameraPos.y : 14.3, cameraPos ? cameraPos.z : 15);
    this.clashGroup.scale.setScalar(0.5);
    this.clashMats[2].color.setHex(colorHex);
    this.spawnBurst(x, y, z, colorHex, 20, 7.6);
  }

  public spawnBurst(
    x: number,
    y: number,
    z: number,
    colorHex: number,
    count = 14,
    speed = 5.5
  ) {
    let spawned = 0;
    for (let i = 0; i < this.sparks.length && spawned < count; i++) {
      const s = this.sparks[i];
      if (s.active) continue;
      s.active = true;
      s.age = 0;
      s.maxAge = 0.2 + Math.random() * 0.22;
      const theta = Math.random() * Math.PI * 2;
      const spd = speed * (0.45 + Math.random() * 0.75);
      s.vx = Math.cos(theta) * spd;
      s.vy = 1.6 + Math.random() * speed * 0.65;
      s.vz = Math.sin(theta) * spd;
      s.mesh.position.set(x, y, z);
      s.mesh.scale.setScalar(0.85 + Math.random() * 0.9);
      s.mat.color.setHex(colorHex);
      s.mat.opacity = 1;
      s.mesh.visible = true;
      spawned++;
    }
  }

  public update(dt: number, cameraPos?: THREE.Vector3) {
    for (const s of this.sparks) {
      if (!s.active) continue;
      s.age += dt;
      if (s.age >= s.maxAge) {
        s.active = false;
        s.mesh.visible = false;
        continue;
      }
      s.vy -= 14.5 * dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y = Math.max(0.05, s.mesh.position.y + s.vy * dt);
      s.mesh.position.z += s.vz * dt;
      const life = 1 - s.age / s.maxAge;
      s.mat.opacity = life;
      s.mesh.scale.setScalar(0.45 + life * 0.95);
    }

    if (this.clashGroup.visible) {
      this.clashAge += dt;
      if (this.clashAge >= this.clashDuration) {
        this.clashGroup.visible = false;
      } else {
        if (cameraPos) {
          this.clashGroup.lookAt(cameraPos);
        }
        const p = this.clashAge / this.clashDuration;
        const sc = 0.55 + p * 1.45;
        this.clashGroup.scale.setScalar(sc);
        const op = Math.max(0, 1 - p * p);
        for (const m of this.clashMats) m.opacity = op;
      }
    }
  }

  public clear() {
    for (const s of this.sparks) {
      s.active = false;
      s.mesh.visible = false;
    }
    this.clashGroup.visible = false;
  }

  public dispose() {
    if (this.sparks[0]) this.sparks[0].mesh.geometry.dispose();
    for (const s of this.sparks) s.mat.dispose();
    for (const m of this.clashMeshes) m.geometry.dispose();
    for (const mat of this.clashMats) mat.dispose();
  }
}

/**
 * Dundubhi's Blood Demon Art (Kekkijutsu: Crimson Bronze Asura) VFX Suite:
 * 1. Hand-inked Asura Skull/Lotus Demon Aura + swirling ground blood vortex
 * 2. Flying Demon Slayer Crimson-Ink Blood Crescents & splatters
 * 3. Erupting Molten Magma/Blood Geyser Pillars & bursts
 * 4. Hand-painted Sonic Shockwave Rings, Fissure Cracks, Sandstone Debris, Charge Dust & Horn Wake Ribbons
 */
function createAsuraHaloShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color(0xff2b4c) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float r = length(vUv);
        if (r > 0.99 || uOpacity < 0.02) discard;
        float ang = atan(vUv.y, vUv.x);
        float outerRing = 1.0 - smoothstep(0.018, 0.055, abs(r - 0.82));
        float innerRing = 1.0 - smoothstep(0.015, 0.045, abs(r - 0.58));
        float spoke = pow(abs(cos(ang * 4.0 + uTime * 0.8)), 10.0) * smoothstep(0.35, 0.78, r) * (1.0 - smoothstep(0.84, 0.96, r));
        float lotus = 1.0 - smoothstep(0.016, 0.048, abs(r - (0.68 + 0.08 * sin(ang * 6.0 - uTime * 1.4))));
        float mask = clamp(outerRing + innerRing + spoke * 0.75 + lotus * 0.82, 0.0, 1.0);
        if (mask < 0.05) discard;
        vec3 col = mix(vec3(0.04, 0.01, 0.02), uColor * 1.28, mask);
        col += vec3(1.0, 0.88, 0.90) * innerRing * 0.45;
        gl_FragColor = vec4(col, mask * uOpacity * 0.86);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export class DundubhiBloodDemonArtVfx {
  public readonly group = new THREE.Group();
  private readonly auraHalo: THREE.Mesh;
  private readonly auraMat: THREE.ShaderMaterial;
  private readonly hornTrailLeft: SlashRibbonController;
  private readonly hornTrailRight: SlashRibbonController;
  private readonly groundVortexPool: FlipbookEffectPool;
  private readonly bloodCrescentPool: FlipbookEffectPool;
  private readonly bloodSplatterPool: FlipbookEffectPool;
  private readonly slagGeyserPool: FlipbookEffectPool;
  private readonly moltenBurstPool: FlipbookEffectPool;
  private readonly shockwavePool: FlipbookEffectPool;
  private readonly fissureCrackPool: FlipbookEffectPool;
  private readonly stoneDebrisPool: FlipbookEffectPool;
  private readonly chargeDustPool: FlipbookEffectPool;
  private vortexCooldown = 0;
  private chargeDustCooldown = 0;
  private readonly scratchLBase = new THREE.Vector3();
  private readonly scratchLTip = new THREE.Vector3();
  private readonly scratchRBase = new THREE.Vector3();
  private readonly scratchRTip = new THREE.Vector3();

  constructor() {
    this.auraMat = createAsuraHaloShaderMaterial();
    this.auraHalo = new THREE.Mesh(new THREE.PlaneGeometry(3.25, 3.25), this.auraMat);
    this.auraHalo.renderOrder = 15;
    this.auraHalo.visible = false;
    this.group.add(this.auraHalo);

    this.hornTrailLeft = new SlashRibbonController('boss');
    this.hornTrailRight = new SlashRibbonController('boss');
    this.group.add(this.hornTrailLeft.mesh, this.hornTrailRight.mesh);

    this.groundVortexPool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.moltenSlag4x2, 3, {
      additive: false,
      emissiveBoost: 1.24,
      renderOrder: 13,
    });
    this.bloodCrescentPool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.bloodSlash8x1, 8, {
      additive: false,
      emissiveBoost: 1.32,
      renderOrder: 19,
    });
    this.bloodSplatterPool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.bloodSplatter4x2, 12, {
      additive: false,
      emissiveBoost: 1.18,
      renderOrder: 18,
    });
    this.slagGeyserPool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.moltenSlag4x2, 14, {
      additive: false,
      emissiveBoost: 1.26,
      renderOrder: 17,
      anchorBottom: true,
    });
    this.moltenBurstPool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.moltenBurst4x2, 5, {
      additive: false,
      emissiveBoost: 1.25,
      renderOrder: 18,
      anchorBottom: true,
    });
    this.shockwavePool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.shockwave4x2, 5, {
      additive: false,
      emissiveBoost: 1.22,
      renderOrder: 14,
    });
    this.fissureCrackPool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.parashuSlashes3x3, 4, {
      additive: false,
      emissiveBoost: 1.18,
      renderOrder: 14,
    });
    this.stoneDebrisPool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.stoneFragments4x2, 4, {
      additive: false,
      emissiveBoost: 1.05,
      renderOrder: 18,
    });
    this.chargeDustPool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.chargeDust8x1, 10, {
      additive: false,
      emissiveBoost: 1.05,
      renderOrder: 15,
      anchorBottom: true,
    });

    this.group.add(
      this.groundVortexPool.group,
      this.bloodCrescentPool.group,
      this.bloodSplatterPool.group,
      this.slagGeyserPool.group,
      this.moltenBurstPool.group,
      this.shockwavePool.group,
      this.fissureCrackPool.group,
      this.stoneDebrisPool.group,
      this.chargeDustPool.group
    );
  }

  public get hasActive(): boolean {
    return (
      this.auraHalo.visible ||
      this.hornTrailLeft.hasActive ||
      this.hornTrailRight.hasActive ||
      this.groundVortexPool.hasActive ||
      this.bloodCrescentPool.hasActive ||
      this.bloodSplatterPool.hasActive ||
      this.slagGeyserPool.hasActive ||
      this.moltenBurstPool.hasActive ||
      this.shockwavePool.hasActive ||
      this.fissureCrackPool.hasActive ||
      this.stoneDebrisPool.hasActive ||
      this.chargeDustPool.hasActive
    );
  }

  public spawnFlyingBloodSickles(x: number, z: number, yaw: number, count = 2, enraged = false) {
    const spread = count >= 3 ? [-0.42, 0, 0.42] : [-0.25, 0.25];
    const spd = enraged ? 13.8 : 11.2;
    for (let i = 0; i < spread.length; i++) {
      const ang = yaw + spread[i];
      const spawnX = x + Math.sin(ang) * 1.1;
      const spawnZ = z + Math.cos(ang) * 1.1;
      const vx = Math.sin(ang) * spd;
      const vz = Math.cos(ang) * spd;
      const rollTilt = (i % 2 === 0 ? 1 : -1) * 0.36;

      this.bloodCrescentPool.spawn({
        x: spawnX,
        y: 0.96 + (i === 1 ? 0.12 : 0),
        z: spawnZ,
        vx,
        vy: -0.14,
        vz,
        sizeStart: enraged ? 2.05 : 1.75,
        sizeEnd: enraged ? 3.25 : 2.65,
        duration: 0.56,
        mode: 'oriented',
        yaw: ang,
        pitch: 0.44,
        roll: rollTilt,
        row: 0,
        frameCount: 8,
        tintHex: enraged ? 0xff3b52 : 0xff6258,
        alpha: 0.96,
        spinSpeed: 0.55 * Math.sign(rollTilt || 1),
      });

      this.bloodSplatterPool.spawn({
        x: spawnX + Math.sin(ang) * 0.38,
        y: 0.92,
        z: spawnZ + Math.cos(ang) * 0.38,
        vx: vx * 0.28,
        vy: 0.3,
        vz: vz * 0.28,
        sizeStart: 1.05,
        sizeEnd: 1.9,
        duration: 0.42,
        mode: 'billboard',
        roll: (i - 0.5) * 0.7,
        frameCount: 8,
        tintHex: enraged ? 0xff1e3a : 0xff3b4e,
        alpha: 0.92,
      });
    }
  }

  public spawnBloodSpikeBurst(x: number, z: number, radius = 2.4, enraged = false) {
    const geyserCount = enraged ? 9 : 7;
    for (let i = 0; i < geyserCount; i++) {
      const ang = (i / geyserCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.24;
      const dist = radius * (0.45 + Math.random() * 0.55);
      const gx = x + Math.cos(ang) * dist;
      const gz = z + Math.sin(ang) * dist;

      this.slagGeyserPool.spawn({
        x: gx,
        y: 0.02,
        z: gz,
        sizeStart: enraged ? 1.55 : 1.25,
        sizeEnd: enraged ? 2.85 : 2.35,
        duration: 0.56 + Math.random() * 0.14,
        mode: 'billboard',
        row: 1,
        startCol: i % 2,
        frameCount: 4,
        tintHex: i % 2 === 0 ? (enraged ? 0xff1e3a : 0xff4234) : 0xff6b35,
        alpha: 0.95,
      });

      if (i % 2 === 0) {
        this.bloodSplatterPool.spawn({
          x: gx,
          y: 0.65,
          z: gz,
          vx: Math.cos(ang) * 1.4,
          vy: 0.95,
          vz: Math.sin(ang) * 1.4,
          sizeStart: 1.25,
          sizeEnd: 2.45,
          duration: 0.48,
          mode: 'billboard',
          roll: ang,
          frameCount: 8,
          tintHex: 0xff2244,
          alpha: 0.88,
        });
      }
    }

    this.moltenBurstPool.spawn({
      x,
      y: 0.04,
      z,
      sizeStart: radius * 0.72,
      sizeEnd: radius * 1.48,
      duration: 0.52,
      mode: 'billboard',
      frameCount: 8,
      tintHex: enraged ? 0xff2a48 : 0xff5a32,
      alpha: 0.95,
    });
  }

  public spawnShockwaveImpact(
    x: number,
    z: number,
    radius: number,
    kind: 'slam' | 'roar' | 'pillar_break',
    enraged = false
  ) {
    this.shockwavePool.spawn({
      x,
      y: 0.05,
      z,
      sizeStart: Math.max(1.8, radius * 0.45),
      sizeEnd: radius * 2.2,
      duration: kind === 'roar' ? 0.62 : 0.48,
      mode: 'ground',
      yaw: Math.random() * Math.PI * 2,
      frameCount: 8,
      tintHex: enraged || kind === 'roar' ? 0xff2846 : 0xff5e28,
      alpha: 0.96,
      spinSpeed: kind === 'roar' ? 1.4 : 0.65,
    });

    if (kind === 'slam' || kind === 'pillar_break') {
      this.fissureCrackPool.spawn({
        x,
        y: 0.06,
        z,
        sizeStart: radius * 0.85,
        sizeEnd: radius * 1.65,
        duration: 0.46,
        mode: 'ground',
        yaw: Math.random() * Math.PI * 2,
        row: 1,
        frameCount: 3,
        tintHex: 0xff4632,
        alpha: 0.94,
      });
      this.stoneDebrisPool.spawn({
        x,
        y: 0.85,
        z,
        vy: 0.95,
        sizeStart: radius * 0.65,
        sizeEnd: radius * 1.4,
        duration: 0.56,
        mode: 'billboard',
        frameCount: 8,
        tintHex: 0xffe4cc,
        alpha: 0.94,
      });
    }

    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + 0.4;
      this.chargeDustPool.spawn({
        x: x + Math.cos(ang) * radius * 0.35,
        y: 0.03,
        z: z + Math.sin(ang) * radius * 0.35,
        vx: Math.cos(ang) * 2.4,
        vy: 0.25,
        vz: Math.sin(ang) * 2.4,
        sizeStart: 1.5,
        sizeEnd: 2.9,
        duration: 0.52,
        mode: 'billboard',
        frameCount: 8,
        tintHex: enraged ? 0xff8a7a : 0xffc69e,
        alpha: 0.82,
      });
    }
  }

  public update(
    dt: number,
    elapsedTime: number,
    bossX: number,
    bossZ: number,
    bossYaw: number,
    enraged: boolean,
    isWindingUp: boolean,
    isCharging: boolean,
    isDead: boolean,
    showAura = true,
    cameraPos?: THREE.Vector3
  ) {
    const auraLevel = !showAura || isDead ? 0 : enraged ? 0.98 : isWindingUp ? 0.92 : 0.44;
    if (auraLevel > 0.02) {
      this.auraHalo.visible = true;
      const backX = bossX - Math.sin(bossYaw) * 0.56;
      const backZ = bossZ - Math.cos(bossYaw) * 0.56;
      this.auraHalo.position.set(backX, 1.62, backZ);
      this.auraHalo.lookAt(
        cameraPos ? cameraPos.x : 15,
        cameraPos ? cameraPos.y : 14.3,
        cameraPos ? cameraPos.z : 15
      );
      this.auraHalo.rotateZ(elapsedTime * (enraged ? 1.85 : 0.95));
      const pulse = 0.94 + Math.sin(elapsedTime * 7.2) * 0.08;
      this.auraHalo.scale.setScalar((enraged ? 1.26 : isWindingUp ? 1.14 : 0.92) * pulse);
      this.auraMat.uniforms.uTime.value = elapsedTime;
      this.auraMat.uniforms.uColor.value.setHex(enraged ? 0xff2c52 : isWindingUp ? 0xff5240 : 0xf43658);
      this.auraMat.uniforms.uOpacity.value = auraLevel * 0.92;

      if (enraged || isWindingUp) {
        this.vortexCooldown -= dt;
        if (this.vortexCooldown <= 0) {
          this.vortexCooldown = isWindingUp ? 0.3 : 0.46;
          this.groundVortexPool.spawn({
            x: bossX,
            y: 0.038,
            z: bossZ,
            sizeStart: enraged ? 2.6 : 2.2,
            sizeEnd: enraged ? 3.9 : 3.25,
            duration: 0.55,
            mode: 'ground',
            yaw: elapsedTime * 1.4,
            row: 0,
            frameCount: 4,
            tintHex: enraged ? 0xff2848 : 0xff5238,
            alpha: isWindingUp ? 0.88 : 0.68,
            spinSpeed: 2.2,
          });
        }
      }
    } else {
      this.auraHalo.visible = false;
    }

    this.hornTrailLeft.ageSamples(dt);
    this.hornTrailRight.ageSamples(dt);
    if (isCharging && !isDead) {
      const perpX = Math.cos(bossYaw) * 0.42;
      const perpZ = -Math.sin(bossYaw) * 0.42;
      this.scratchLBase.set(bossX + perpX, 1.18, bossZ + perpZ);
      this.scratchLTip.set(bossX + perpX * 1.45, 1.8, bossZ + perpZ * 1.45);
      this.scratchRBase.set(bossX - perpX, 1.18, bossZ - perpZ);
      this.scratchRTip.set(bossX - perpX * 1.45, 1.8, bossZ - perpZ * 1.45);
      this.hornTrailLeft.pushSample(this.scratchLBase, this.scratchLTip, 0);
      this.hornTrailRight.pushSample(this.scratchRBase, this.scratchRTip, 0);

      this.chargeDustCooldown -= dt;
      if (this.chargeDustCooldown <= 0) {
        this.chargeDustCooldown = 0.07;
        const backDirX = -Math.sin(bossYaw);
        const backDirZ = -Math.cos(bossYaw);
        this.chargeDustPool.spawn({
          x: bossX + backDirX * 0.8 + (Math.random() - 0.5) * 0.7,
          y: 0.03,
          z: bossZ + backDirZ * 0.8 + (Math.random() - 0.5) * 0.7,
          vx: backDirX * 2.2,
          vy: 0.3,
          vz: backDirZ * 2.2,
          sizeStart: 1.25,
          sizeEnd: 2.6,
          duration: 0.45,
          mode: 'billboard',
          frameCount: 8,
          tintHex: enraged ? 0xff7a6a : 0xffcca3,
          alpha: 0.86,
        });
      }
    }
    this.hornTrailLeft.commit(elapsedTime, isCharging && !isDead, 1.05);
    this.hornTrailRight.commit(elapsedTime, isCharging && !isDead, 1.05);

    this.groundVortexPool.update(dt, cameraPos);
    this.bloodCrescentPool.update(dt, cameraPos);
    this.bloodSplatterPool.update(dt, cameraPos);
    this.slagGeyserPool.update(dt, cameraPos);
    this.moltenBurstPool.update(dt, cameraPos);
    this.shockwavePool.update(dt, cameraPos);
    this.fissureCrackPool.update(dt, cameraPos);
    this.stoneDebrisPool.update(dt, cameraPos);
    this.chargeDustPool.update(dt, cameraPos);
  }

  public clearAll() {
    this.auraHalo.visible = false;
    this.hornTrailLeft.clear();
    this.hornTrailRight.clear();
    this.groundVortexPool.clear();
    this.bloodCrescentPool.clear();
    this.bloodSplatterPool.clear();
    this.slagGeyserPool.clear();
    this.moltenBurstPool.clear();
    this.shockwavePool.clear();
    this.fissureCrackPool.clear();
    this.stoneDebrisPool.clear();
    this.chargeDustPool.clear();
  }

  public dispose() {
    this.auraHalo.geometry.dispose();
    this.auraMat.dispose();
    this.hornTrailLeft.dispose();
    this.hornTrailRight.dispose();
    this.groundVortexPool.dispose();
    this.bloodCrescentPool.dispose();
    this.bloodSplatterPool.dispose();
    this.slagGeyserPool.dispose();
    this.moltenBurstPool.dispose();
    this.shockwavePool.dispose();
    this.fissureCrackPool.dispose();
    this.stoneDebrisPool.dispose();
    this.chargeDustPool.dispose();
  }
}
