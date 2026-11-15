import * as THREE from 'three';
import type { AstraElement } from './rules';
import {
  FlipbookEffectPool,
  KALIYUGA_TELEGRAPH_URLS,
  KALIYUGA_VFX_SHEETS,
  getSharedVfxTexture,
} from './vfxFlipbook';

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
    coreColor: new THREE.Color('#fff9d6'),
    midColor: new THREE.Color('#ff7b1c'),
    outerColor: new THREE.Color('#c81e1e'),
    inkColor: new THREE.Color('#180507'),
    jaggedness: 0.34,
  },
  vajra: {
    coreColor: new THREE.Color('#fefce8'),
    midColor: new THREE.Color('#fde047'),
    outerColor: new THREE.Color('#0ea5e9'),
    inkColor: new THREE.Color('#061124'),
    jaggedness: 0.54,
  },
  vayu: {
    coreColor: new THREE.Color('#ecfdf5'),
    midColor: new THREE.Color('#34d399'),
    outerColor: new THREE.Color('#047857'),
    inkColor: new THREE.Color('#041c15'),
    jaggedness: 0.26,
  },
  boss: {
    coreColor: new THREE.Color('#ffe4e8'),
    midColor: new THREE.Color('#ef233c'),
    outerColor: new THREE.Color('#7a0918'),
    inkColor: new THREE.Color('#100205'),
    jaggedness: 0.42,
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

        // Element-specific anime brush geometry (NO muddy speckled holes inside the blade!)
        float curveShape = 0.0;
        float internalPattern = 0.0;

        if (uElementKind < 0.5) {
          // 0 = AGNI (Hinokami Kagura): smooth sweeping flame tongues + curled S-scrolls
          float flow1 = noise(vec2(u * 12.0 - uTime * 11.0, v * 3.0));
          float flow2 = sin(u * 26.0 - uTime * 16.0 + v * 5.0) * 0.5 + 0.5;
          float flameLick = pow(sin(u * 15.0 - uTime * 9.0) * 0.5 + 0.5, 1.4);
          curveShape = flow1 * 0.55 + flameLick * 0.30 + flow2 * 0.15;
          internalPattern = smoothstep(0.42, 0.58, flow1 * 0.65 + v * 0.45);
        } else if (uElementKind < 1.5) {
          // 1 = VAJRA (Thunder Breathing): sharp zig-zag bolts & electric branch forks
          float zig = abs(fract(u * 18.0 - uTime * 15.0) * 2.0 - 1.0);
          float crackle = abs(noise(vec2(u * 28.0 - uTime * 22.0, v * 6.0)) - 0.5) * 2.0;
          curveShape = zig * 0.68 + crackle * 0.32;
          float boltLine = 1.0 - smoothstep(0.05, 0.19, abs(v - (0.58 + (zig - 0.5) * 0.34)));
          internalPattern = boltLine;
        } else if (uElementKind < 2.5) {
          // 2 = VAYU (Wind Breathing): sleek long calligraphy wind crescents & helical streaks
          float sweep = sin(u * 10.0 - uTime * 12.0 + v * 6.2) * 0.5 + 0.5;
          float wisp = noise(vec2(u * 9.0 - uTime * 10.0, v * 2.5));
          curveShape = sweep * 0.5 + wisp * 0.5;
          float ribLine = smoothstep(0.76, 0.92, sin((v - u * 0.35) * 18.0 + uTime * 10.0) * 0.5 + 0.5);
          internalPattern = ribLine;
        } else {
          // 3 = BOSS (Blood Demon Art / Kekkijutsu): sharp serrated crimson arcs with black blood-ink tendrils
          float slashWave = noise(vec2(u * 14.0 - uTime * 13.0, v * 4.5));
          float tooth = abs(fract(u * 13.0 - uTime * 5.0) * 2.0 - 1.0);
          curveShape = slashWave * 0.6 + tooth * 0.4;
          internalPattern = smoothstep(0.54, 0.64, abs(slashWave - 0.5) * 2.0 + (1.0 - v) * 0.22);
        }

        // Layer 1: Clean Sumi-e calligraphy ink backing stroke framing the outer edges
        if (uPassMode > 0.5 && uPassMode < 1.5) {
          float inkEdge = 0.06 + (curveShape - 0.45) * (uJagged * 1.45 + 0.14) + (1.0 - u) * 0.26;
          float inkAlpha = smoothstep(inkEdge, inkEdge + 0.06, v) * (1.0 - smoothstep(0.975, 1.0, v)) * uMask * uOpacity * 0.95;
          if (inkAlpha < 0.08 || uOpacity < 0.02) discard;
          gl_FragColor = vec4(uInkColor, clamp(inkAlpha, 0.0, 0.96));
          return;
        }

        // Layer 2: Soft additive anime glow halo wrapping the bright core
        if (uPassMode > 1.5) {
          float glowBand = smoothstep(0.22, 0.78, v) * (1.0 - smoothstep(0.96, 1.0, v));
          float glowAlpha = glowBand * (0.78 + 0.22 * curveShape) * uMask * uOpacity * 0.48;
          if (glowAlpha < 0.03 || uOpacity < 0.02) discard;
          vec3 glowCol = mix(uOuterColor, uMidColor, v) * 1.25;
          gl_FragColor = vec4(glowCol, glowAlpha);
          return;
        }

        // Layer 0: Silky Cel-Stepped Anime Slash Core
        float erodeEdge = 0.16 + (curveShape - 0.48) * (uJagged * 1.42) + (1.0 - u) * 0.24;
        float alpha = smoothstep(erodeEdge, erodeEdge + 0.06, v) * (1.0 - smoothstep(0.965, 1.0, v)) * uMask * uOpacity;
        if (alpha < 0.06 || uOpacity < 0.02) discard;

        // Crisp 3-tone anime step bands
        float bandMid = smoothstep(0.38, 0.46, v + (curveShape - 0.5) * 0.22);
        float bandCore = smoothstep(0.76, 0.84, v + (curveShape - 0.5) * 0.10) * (1.0 - smoothstep(0.94, 0.99, v));
        float inkRim = clamp(
          smoothstep(0.935, 0.968, v) * 0.92 +
          (1.0 - smoothstep(erodeEdge + 0.01, erodeEdge + 0.085, v)) * 0.94,
          0.0,
          1.0
        );

        vec3 bodyCol = mix(uOuterColor, uMidColor, bandMid);

        if (uElementKind > 0.5 && uElementKind < 1.5) {
          // Vajra electric white-gold core bolt racing down the slash
          bodyCol = mix(bodyCol, uCoreColor * 1.35, internalPattern * 0.9);
        } else if (uElementKind > 1.5 && uElementKind < 2.5) {
          // Vayu crisp wind-streak ribs
          bodyCol = mix(bodyCol, uCoreColor * 1.18, internalPattern * 0.55);
        } else if (uElementKind > 2.5) {
          // Blood Demon Art: dark calligraphic blood-ink ribbons weaving smoothly inside crimson
          bodyCol = mix(bodyCol, uInkColor, internalPattern * 0.84);
        } else {
          // Agni: warm golden inner heat glow before core snap
          bodyCol = mix(bodyCol, mix(uMidColor, uCoreColor, 0.45), internalPattern * 0.35);
        }

        vec3 col = mix(bodyCol, uInkColor, inkRim * 0.92);
        col = mix(col, uCoreColor * 1.30, bandCore * (0.78 + 0.22 * u));

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
    innerRadius: 1.15,
    outerRadius: 1.72,
    centerY: 1.26,
    tiltPitch: 0.2,
    tiltRoll: -0.32,
    waveAmp: 0.03,
  },
  attack2: {
    startOffset: 1.22,
    endOffset: -1.18,
    trailSpan: 1.65,
    innerRadius: 1.15,
    outerRadius: 1.74,
    centerY: 1.32,
    tiltPitch: -0.18,
    tiltRoll: 0.34,
    waveAmp: 0.03,
  },
  attack3: {
    startOffset: -1.65,
    endOffset: 1.75,
    trailSpan: 2.3,
    innerRadius: 1.16,
    outerRadius: 2.15,
    centerY: 1.2,
    tiltPitch: 0.14,
    tiltRoll: -0.24,
    waveAmp: 0.05,
  },
  heavy: {
    startOffset: -1.45,
    endOffset: 1.45,
    trailSpan: 2.0,
    innerRadius: 1.15,
    outerRadius: 2.22,
    centerY: 1.34,
    tiltPitch: 0.62,
    tiltRoll: 0.15,
    waveAmp: 0.04,
  },
  cast: {
    startOffset: -Math.PI * 0.35,
    endOffset: Math.PI * 1.95,
    trailSpan: Math.PI * 1.56,
    innerRadius: 1.38,
    outerRadius: 2.34,
    centerY: 1.08,
    tiltPitch: 0.12,
    tiltRoll: 0.08,
    waveAmp: 0.06,
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
    this.mesh.renderOrder = 18;
    this.mesh.visible = false;

    this.inkMesh = new THREE.Mesh(this.geometry, this.inkMaterial);
    this.inkMesh.frustumCulled = false;
    this.inkMesh.renderOrder = 16;

    this.glowMesh = new THREE.Mesh(this.geometry, this.glowMaterial);
    this.glowMesh.frustumCulled = false;
    this.glowMesh.renderOrder = 17;

    this.mesh.add(this.inkMesh, this.glowMesh);
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

  // Outer sacred ring
  ctx.beginPath();
  ctx.arc(cx, cy, 114, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 98, 0, Math.PI * 2);
  ctx.stroke();

  // 8-pointed interlocking Shatkona / Lotus geometry
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

  // Inner solar/thunder chakra spokes
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
 * Multi-ring helical Demon Slayer cyclone spawned around Rudra during [Q] Astra Cast & Finishers,
 * pairing 3 tilted swirling elemental ribbons + glowing Yantra mandala ring + jagged lightning bolts / orbiting petals.
 */
export class AstraCycloneVfx {
  public readonly group = new THREE.Group();
  private readonly ribbons: SlashRibbonController[] = [];
  private readonly angles = [0.24, -0.36, 0.5];
  private readonly yawOffsets = [0, 2.1, 4.2];
  private readonly radiiScale = [0, 0.36, 0.68];
  private readonly mandalaMesh: THREE.Mesh;
  private readonly mandalaMat: THREE.MeshBasicMaterial;
  private readonly petalGroup = new THREE.Group();
  private readonly petals: THREE.Mesh[] = [];
  private readonly petalMat: THREE.MeshBasicMaterial;
  private readonly boltLines: THREE.LineSegments;
  private readonly boltMat: THREE.LineBasicMaterial;
  private readonly boltPositions = new Float32Array(6 * 12 * 3); // 6 bolts * 6 segments * 2 verts
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
    this.mandalaMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), this.mandalaMat);
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
    // Graceful horizontal curved crescent wisps tangent to the cyclone swirl (no spiky cones)
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
        elapsedTime + i * 0.27,
        true,
        'cast',
        originX,
        originZ,
        spin,
        normProgress,
        reachBonus + this.radiiScale[i]
      );
      ctrl.mesh.rotation.set(this.angles[i] * 0.4, 0, this.angles[i] * -0.35);
      ctrl.mesh.position.y = i * 0.24 - 0.08;
    }

    // Sacred Yantra mandala spinning beneath Rudra's feet
    this.mandalaMesh.position.set(originX, 0.032, originZ);
    this.mandalaMesh.rotation.z = elapsedTime * 2.8;
    this.mandalaMesh.scale.setScalar(0.75 + envelope * 0.45);
    this.mandalaMat.opacity = envelope * 0.85;

    // 8 curved tangential wisps orbiting horizontally inside the swirl ring
    this.petalMat.opacity = envelope * 0.88;
    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];
      const ang = (i / this.petals.length) * Math.PI * 2 + elapsedTime * 7.2;
      const rad = 1.24 + (i % 3) * 0.28 + reachBonus * 0.25;
      p.position.set(
        originX + Math.cos(ang) * rad,
        0.42 + (i % 3) * 0.26 + Math.sin(elapsedTime * 9 + i) * 0.08,
        originZ + Math.sin(ang) * rad
      );
      p.rotation.set(0.18 * (i % 2 === 0 ? 1 : -1), -ang, 0.14);
      p.scale.setScalar(0.74 + envelope * 0.45);
    }

    // Sharp jagged electric bolts snapping outward during Vajra
    if (this.currentTheme === 'vajra') {
      this.boltLines.visible = true;
      this.boltMat.opacity = envelope * 0.95;
      let ptr = 0;
      for (let b = 0; b < 6; b++) {
        const baseAng = (b / 6) * Math.PI * 2 + Math.floor(elapsedTime * 24) * 0.7;
        let px = originX;
        let py = 1.05;
        let pz = originZ;
        for (let seg = 0; seg < 6; seg++) {
          const tNext = (seg + 1) / 6;
          const rNext = tNext * (3.1 + reachBonus * 0.4);
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

/**
 * Forward-traveling 3-prong Elemental Wave crescents for Rudra's [K] Heavy Strike & attack3 finishers.
 */
export class HeavyWaveVfx {
  public readonly group = new THREE.Group();
  private readonly waves: Array<{
    group: THREE.Group;
    coreMesh: THREE.Mesh;
    inkMesh: THREE.Mesh;
    coreMat: THREE.MeshBasicMaterial;
    inkMat: THREE.MeshBasicMaterial;
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
    const coreGeo = new THREE.TorusGeometry(0.95, 0.11, 6, 20, Math.PI * 0.72);
    coreGeo.rotateX(Math.PI * 0.5);
    coreGeo.rotateY(-Math.PI * 0.36);

    const inkGeo = new THREE.TorusGeometry(0.98, 0.16, 6, 20, Math.PI * 0.76);
    inkGeo.rotateX(Math.PI * 0.5);
    inkGeo.rotateY(-Math.PI * 0.38);

    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xff8c2a,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const inkMat = new THREE.MeshBasicMaterial({
        color: 0x160508,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const inkMesh = new THREE.Mesh(inkGeo, inkMat);
      inkMesh.renderOrder = 16;
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.renderOrder = 18;
      g.add(inkMesh, coreMesh);
      g.visible = false;
      this.group.add(g);
      this.waves.push({
        group: g,
        coreMesh,
        inkMesh,
        coreMat,
        inkMat,
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

  public triggerTripleWave(
    x: number,
    z: number,
    yaw: number,
    element: AstraElement,
    speed = 11.5
  ) {
    const pal = RIBBON_PALETTES[element];
    const spread = [-0.28, 0, 0.28];
    for (let s = 0; s < spread.length; s++) {
      const slot = this.waves.find((w) => !w.active) || this.waves[s];
      const ang = yaw + spread[s];
      slot.active = true;
      slot.age = 0;
      slot.maxAge = s === 1 ? 0.44 : 0.36;
      slot.x = x + Math.sin(ang) * 0.8;
      slot.z = z + Math.cos(ang) * 0.8;
      slot.vx = Math.sin(ang) * speed;
      slot.vz = Math.cos(ang) * speed;
      slot.yaw = ang;
      slot.coreMat.color.copy(s === 1 ? pal.coreColor : pal.midColor);
      slot.inkMat.color.copy(pal.inkColor);
      slot.group.visible = true;
      slot.group.position.set(slot.x, 0.55 + (s === 1 ? 0.15 : 0), slot.z);
      slot.group.rotation.set(s === 1 ? 0.12 : 0.28 * Math.sign(spread[s]), ang, 0);
      slot.group.scale.setScalar(0.85);
    }
  }

  public update(dt: number) {
    for (const w of this.waves) {
      if (!w.active) continue;
      w.age += dt;
      if (w.age >= w.maxAge) {
        w.active = false;
        w.group.visible = false;
        continue;
      }
      const p = w.age / w.maxAge;
      const life = 1 - p;
      w.x += w.vx * dt * (1 - p * 0.35);
      w.z += w.vz * dt * (1 - p * 0.35);
      w.group.position.set(w.x, 0.52 + p * 0.22, w.z);
      w.group.scale.set(0.95 + p * 0.85, 0.85 + p * 0.45, 0.95 + p * 0.85);
      w.coreMat.opacity = life * 0.92;
      w.inkMat.opacity = life * 0.85;
    }
  }

  public dispose() {
    if (this.waves[0]) {
      this.waves[0].coreMesh.geometry.dispose();
      this.waves[0].inkMesh.geometry.dispose();
    }
    for (const w of this.waves) {
      w.coreMat.dispose();
      w.inkMat.dispose();
    }
  }
}

/**
 * Dundubhi's Blood Demon Art (Kekkijutsu: Crimson Bronze Asura) VFX Suite:
 * 1. Hand-inked Asura Skull/Lotus Demon Aura + swirling ground blood vortex beneath hooves
 * 2. Flying Demon Slayer Crimson-Ink Blood Crescents (`clean_blood_slash_8x1.png`) + splatters (`clean_blood_splatter_4x2.png`)
 * 3. Erupting Molten Magma/Blood Geyser Pillars (`clean_molten_slag_4x2.png` Row 1) + bursts (`clean_molten_burst_4x2.png`)
 * 4. Hand-painted Sonic Shockwave Rings (`clean_shockwave_4x2.png`), Fissure Cracks (`clean_parashu_slashes_3x3.png`),
 *    Sandstone Debris (`clean_stone_fragments_4x2.png`), Charge Hoof Dust (`clean_charge_dust_8x1.png`), and Horn Wake Ribbons
 */
export class DundubhiBloodDemonArtVfx {
  public readonly group = new THREE.Group();
  private readonly auraHalo: THREE.Mesh;
  private readonly auraMat: THREE.MeshBasicMaterial;
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

  constructor() {
    const auraTex = getSharedVfxTexture(KALIYUGA_TELEGRAPH_URLS.roar);
    this.auraMat = new THREE.MeshBasicMaterial({
      map: auraTex,
      color: 0xff2b4c,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    this.auraHalo = new THREE.Mesh(new THREE.PlaneGeometry(3.25, 3.25), this.auraMat);
    this.auraHalo.renderOrder = 15;
    this.auraHalo.visible = false;
    // Kept as group.children[0] for crisp behind-horn Kekkijutsu seal & test invariants
    this.group.add(this.auraHalo);

    this.hornTrailLeft = new SlashRibbonController('boss');
    this.hornTrailRight = new SlashRibbonController('boss');
    this.group.add(this.hornTrailLeft.mesh, this.hornTrailRight.mesh);

    // Ground swirling crimson vortex beneath hooves during windup & Phase 2 enrage
    this.groundVortexPool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.moltenSlag4x2, 3, {
      additive: false,
      emissiveBoost: 1.24,
      renderOrder: 13,
    });

    // Hand-inked Demon Slayer flying crimson crescent slashes (8-frame sheet)
    this.bloodCrescentPool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.bloodSlash8x1, 8, {
      additive: false,
      emissiveBoost: 1.32,
      renderOrder: 19,
    });

    // Crimson splatter splashes accompanying slashes & eruptions
    this.bloodSplatterPool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.bloodSplatter4x2, 12, {
      additive: false,
      emissiveBoost: 1.18,
      renderOrder: 18,
    });

    // Vertical erupting molten blood-stone geysers (moltenSlag Row 1 anchored at ground level)
    this.slagGeyserPool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.moltenSlag4x2, 14, {
      additive: false,
      emissiveBoost: 1.26,
      renderOrder: 17,
      anchorBottom: true,
    });

    // Central maroon-saffron blast on slams, roars & pillar shatters
    this.moltenBurstPool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.moltenBurst4x2, 5, {
      additive: false,
      emissiveBoost: 1.25,
      renderOrder: 18,
      anchorBottom: true,
    });

    // Ground-projected crimson-gold sonic shockwave rings
    this.shockwavePool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.shockwave4x2, 6, {
      additive: false,
      emissiveBoost: 1.3,
      renderOrder: 16,
    });

    // Heavy vertical slam & ground crack smear (parashuSlashes3x3 Row 1)
    this.fissureCrackPool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.parashuSlashes3x3, 4, {
      additive: false,
      emissiveBoost: 1.26,
      renderOrder: 19,
    });

    // Shattered temple sandstone shards on slams & pillar collapse
    this.stoneDebrisPool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.stoneFragments4x2, 8, {
      additive: false,
      emissiveBoost: 1.08,
      renderOrder: 18,
    });

    // Painterly dust & ash plumes kicked up during bull-rush charge and ground slams
    this.chargeDustPool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.chargeDust8x1, 10, {
      additive: false,
      emissiveBoost: 1.08,
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

      // Row 1 of moltenSlag4x2 = vertical erupting molten/blood-stone geysers
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

    // Core dark-crimson explosion eruption right at ground zero
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
      // Heavy vertical slam strike & ground fissure overlay (parashuSlashes3x3 Row 1)
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

    // Radial painterly ash & dust clouds
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
    isDead: boolean
  ) {
    // 1. Hand-inked Asura Skull/Lotus Demon Aura Halo behind Dundubhi's horns + ground swirling vortex
    const auraLevel = isDead ? 0 : enraged ? 0.98 : isWindingUp ? 0.92 : 0.58;
    if (auraLevel > 0.02) {
      this.auraHalo.visible = true;
      const backX = bossX - Math.sin(bossYaw) * 0.56;
      const backZ = bossZ - Math.cos(bossYaw) * 0.56;
      this.auraHalo.position.set(backX, 1.62, backZ);
      this.auraHalo.lookAt(15, 14.3, 15);
      this.auraHalo.rotateZ(elapsedTime * (enraged ? 1.85 : 0.95));
      const pulse = 0.94 + Math.sin(elapsedTime * 7.2) * 0.08;
      this.auraHalo.scale.setScalar((enraged ? 1.26 : isWindingUp ? 1.14 : 0.96) * pulse);
      this.auraMat.color.setHex(enraged ? 0xff2c52 : isWindingUp ? 0xff5240 : 0xf43658);
      this.auraMat.opacity = auraLevel * 0.92;

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

    // 2. Twin Horn Blood-Ink Wake Ribbons + Hoof Dust Plumes during bull-rush charge
    this.hornTrailLeft.ageSamples(dt);
    this.hornTrailRight.ageSamples(dt);
    if (isCharging && !isDead) {
      const perpX = Math.cos(bossYaw) * 0.42;
      const perpZ = -Math.sin(bossYaw) * 0.42;
      const lBase = new THREE.Vector3(bossX + perpX, 1.18, bossZ + perpZ);
      const lTip = new THREE.Vector3(bossX + perpX * 1.45, 1.80, bossZ + perpZ * 1.45);
      const rBase = new THREE.Vector3(bossX - perpX, 1.18, bossZ - perpZ);
      const rTip = new THREE.Vector3(bossX - perpX * 1.45, 1.80, bossZ - perpZ * 1.45);
      this.hornTrailLeft.pushSample(lBase, lTip, 0);
      this.hornTrailRight.pushSample(rBase, rTip, 0);

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

    // 3. Advance all Demon Slayer sprite-sheet flipbook pools
    this.groundVortexPool.update(dt);
    this.bloodCrescentPool.update(dt);
    this.bloodSplatterPool.update(dt);
    this.slagGeyserPool.update(dt);
    this.moltenBurstPool.update(dt);
    this.shockwavePool.update(dt);
    this.fissureCrackPool.update(dt);
    this.stoneDebrisPool.update(dt);
    this.chargeDustPool.update(dt);
  }

  public clearAll() {
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

/**
 * Zero-GC pooled Dash Afterimage ghosts + elemental lightning/flame dash streak rendered during Space-bar Dash.
 */
export class DashEchoPool {
  public readonly group = new THREE.Group();
  private readonly ghosts: Array<{
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    age: number;
    maxAge: number;
    active: boolean;
  }> = [];
  private cursor = 0;

  constructor() {
    // Razor-thin flattened anime speed-streak spears (no floating capsule pills)
    const geo = new THREE.ConeGeometry(0.11, 1.55, 3);
    geo.rotateX(Math.PI * 0.5);
    geo.scale(1.0, 0.24, 1.0);
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff9f40,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.renderOrder = 15;
      this.group.add(mesh);
      this.ghosts.push({ mesh, mat, age: 0, maxAge: 0.22, active: false });
    }
  }

  public spawn(x: number, z: number, yaw: number, element: AstraElement) {
    const slot = this.ghosts[this.cursor];
    this.cursor = (this.cursor + 1) % this.ghosts.length;
    slot.active = true;
    slot.age = 0;
    slot.mesh.visible = true;
    const jitter = (this.cursor % 2 === 0 ? 1 : -1) * 0.28;
    slot.mesh.position.set(x + Math.cos(yaw) * jitter, 0.65 + (this.cursor % 3) * 0.2, z - Math.sin(yaw) * jitter);
    slot.mesh.rotation.set(0, yaw + Math.PI, 0);
    slot.mesh.scale.set(1.0, 1.0, 1.15);
    const hex =
      element === 'agni' ? 0xff7b1c : element === 'vajra' ? 0xfacc15 : 0x34d399;
    slot.mat.color.setHex(hex);
    slot.mat.opacity = 0.78;
  }

  public update(dt: number) {
    for (const g of this.ghosts) {
      if (!g.active) continue;
      g.age += dt;
      if (g.age >= g.maxAge) {
        g.active = false;
        g.mesh.visible = false;
        continue;
      }
      const life = 1 - g.age / g.maxAge;
      g.mat.opacity = life * 0.74;
      g.mesh.scale.set(0.8 + life * 0.35, 1.0, 0.7 + life * 0.65);
    }
  }

  public dispose() {
    if (this.ghosts[0]) this.ghosts[0].mesh.geometry.dispose();
    for (const g of this.ghosts) g.mat.dispose();
  }
}

interface SparkInstance {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  maxAge: number;
  scale: number;
  color: THREE.Color;
}

/**
 * Zero-GC pooled InstancedMesh spark, hand-drawn Demon Slayer hit/parry flipbook sparks, and Parry Clash flare system.
 */
export class PooledSparkSystem {
  public readonly mesh: THREE.InstancedMesh;
  public readonly clashGroup = new THREE.Group();
  public readonly fxGroup = new THREE.Group();
  private readonly clashMeshA: THREE.Mesh;
  private readonly clashMeshB: THREE.Mesh;
  private readonly clashRing: THREE.Mesh;
  private readonly clashMat: THREE.MeshBasicMaterial;
  private readonly clashRingMat: THREE.MeshBasicMaterial;
  private readonly hitBurstPool: FlipbookEffectPool;
  private readonly parryFlashPool: FlipbookEffectPool;
  private clashAge = 99;
  private readonly clashDuration = 0.24;

  private readonly capacity = 160;
  private readonly pool: SparkInstance[] = [];
  private cursor = 0;
  private readonly dummy = new THREE.Object3D();
  private readonly lookTarget = new THREE.Vector3();

  constructor() {
    const geo = new THREE.ConeGeometry(0.022, 0.30, 4);
    geo.rotateX(Math.PI * 0.5);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, this.capacity);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 21;

    this.hitBurstPool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.damageHit8x1, 6, {
      additive: false,
      emissiveBoost: 1.32,
      renderOrder: 22,
    });
    this.parryFlashPool = new FlipbookEffectPool(KALIYUGA_VFX_SHEETS.parrySparks4x2, 6, {
      additive: true,
      emissiveBoost: 1.42,
      renderOrder: 23,
    });
    this.fxGroup.add(this.hitBurstPool.group, this.parryFlashPool.group);

    // Cross X-Flare star burst + Shock Ring for Perfect Parries & Crit Finishers
    this.clashMat = new THREE.MeshBasicMaterial({
      color: 0xfff3a8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const flareGeo = new THREE.PlaneGeometry(0.24, 2.8);
    this.clashMeshA = new THREE.Mesh(flareGeo, this.clashMat);
    this.clashMeshB = new THREE.Mesh(flareGeo, this.clashMat);
    this.clashMeshA.rotation.z = Math.PI * 0.25;
    this.clashMeshB.rotation.z = -Math.PI * 0.25;

    this.clashRingMat = new THREE.MeshBasicMaterial({
      color: 0xffe4a0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    this.clashRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.85, 24), this.clashRingMat);

    this.clashGroup.add(this.clashMeshA, this.clashMeshB, this.clashRing);
    this.clashMeshA.visible = false;
    this.clashMeshB.visible = false;
    this.clashRing.visible = false;
    this.clashGroup.visible = false;
    this.clashGroup.renderOrder = 22;

    const zeroMat = new THREE.Matrix4().makeScale(0, 0, 0);
    const white = new THREE.Color(0xffffff);
    for (let i = 0; i < this.capacity; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: -10,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        maxAge: 0.35,
        scale: 1,
        color: white.clone(),
      });
      this.mesh.setMatrixAt(i, zeroMat);
      this.mesh.setColorAt(i, white);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  public triggerClashFlare(x: number, y: number, z: number, colorHex = 0xfff0a0) {
    this.clashGroup.position.set(x, y, z);
    this.clashGroup.lookAt(15, 14.3, 15);
    this.clashGroup.visible = true;
    this.clashAge = 0;

    this.parryFlashPool.spawn({
      x,
      y,
      z,
      sizeStart: 1.9,
      sizeEnd: 3.35,
      duration: 0.34,
      mode: 'billboard',
      row: 0,
      frameCount: 4,
      tintHex: colorHex,
      alpha: 0.96,
    });
    this.hitBurstPool.spawn({
      x,
      y,
      z,
      sizeStart: 1.45,
      sizeEnd: 2.75,
      duration: 0.3,
      mode: 'billboard',
      roll: (Math.random() - 0.5) * 0.8,
      frameCount: 8,
      tintHex: colorHex,
      alpha: 0.94,
    });
  }

  public emitBurst(
    originX: number,
    originY: number,
    originZ: number,
    count: number,
    theme: RibbonTheme | 'parry',
    speed = 9.5
  ) {
    if (count >= 12) {
      if (theme === 'parry') {
        this.parryFlashPool.spawn({
          x: originX,
          y: originY,
          z: originZ,
          sizeStart: 1.5,
          sizeEnd: 2.75,
          duration: 0.32,
          mode: 'billboard',
          row: 0,
          frameCount: 4,
          tintHex: 0xffe49e,
          alpha: 0.94,
        });
      } else if (theme === 'boss') {
        this.parryFlashPool.spawn({
          x: originX,
          y: originY,
          z: originZ,
          sizeStart: 1.45,
          sizeEnd: 2.65,
          duration: 0.34,
          mode: 'billboard',
          row: 1,
          frameCount: 4,
          tintHex: 0xff2b48,
          alpha: 0.92,
        });
      } else {
        this.hitBurstPool.spawn({
          x: originX,
          y: originY,
          z: originZ,
          sizeStart: 1.35,
          sizeEnd: 2.45,
          duration: 0.3,
          mode: 'billboard',
          roll: (Math.random() - 0.5) * 1.4,
          frameCount: 8,
          tintHex:
            theme === 'agni' ? 0xff9238 : theme === 'vajra' ? 0xfacc15 : 0x34d399,
          alpha: 0.92,
        });
      }
    }

    const c1 =
      theme === 'parry'
        ? new THREE.Color('#fffbeb')
        : RIBBON_PALETTES[theme].coreColor;
    const c2 =
      theme === 'parry'
        ? new THREE.Color('#f59e0b')
        : RIBBON_PALETTES[theme].midColor;
    const c3 =
      theme === 'parry'
        ? new THREE.Color('#140806')
        : RIBBON_PALETTES[theme].inkColor;

    for (let k = 0; k < count; k++) {
      const slot = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % this.capacity;

      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.1) * Math.PI * 0.45;
      const spd = speed * (0.65 + Math.random() * 1.1);
      slot.active = true;
      slot.x = originX + (Math.random() - 0.5) * 0.32;
      slot.y = originY + (Math.random() - 0.5) * 0.25;
      slot.z = originZ + (Math.random() - 0.5) * 0.32;
      slot.vx = Math.cos(theta) * Math.cos(phi) * spd;
      slot.vy = Math.abs(Math.sin(phi)) * spd * 0.55 + 0.65;
      slot.vz = Math.sin(theta) * Math.cos(phi) * spd;
      slot.age = 0;
      slot.maxAge = 0.2 + Math.random() * 0.22;
      slot.scale = 0.65 + Math.random() * 0.85;
      slot.color.copy(k % 4 === 0 ? c3 : k % 2 === 0 ? c1 : c2);
    }
  }

  public update(dt: number) {
    this.hitBurstPool.update(dt);
    this.parryFlashPool.update(dt);

    if (this.clashGroup.visible) {
      this.clashAge += dt;
      if (this.clashAge >= this.clashDuration) {
        this.clashGroup.visible = false;
      } else {
        const p = this.clashAge / this.clashDuration;
        this.clashMat.opacity = (1 - p) * 0.96;
        this.clashRingMat.opacity = (1 - p) * 0.85;
        this.clashGroup.scale.set(1.0 + p * 0.95, 1.0 - p * 0.4, 1.0);
        this.clashRing.scale.setScalar(0.5 + p * 2.2);
      }
    }

    let anyDirty = false;
    for (let i = 0; i < this.capacity; i++) {
      const s = this.pool[i];
      if (!s.active) continue;
      anyDirty = true;
      s.age += dt;
      if (s.age >= s.maxAge) {
        s.active = false;
        this.dummy.position.set(0, -20, 0);
        this.dummy.scale.setScalar(0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      s.vy -= 14.0 * dt;
      s.x += s.vx * dt;
      s.y = Math.max(0.08, s.y + s.vy * dt);
      s.z += s.vz * dt;

      const life = 1 - s.age / s.maxAge;
      this.dummy.position.set(s.x, s.y, s.z);
      this.lookTarget.set(s.x + s.vx, s.y + s.vy, s.z + s.vz);
      this.dummy.lookAt(this.lookTarget);
      this.dummy.scale.set(s.scale * life, s.scale * life, s.scale * (0.8 + life * 1.75));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, s.color);
    }

    if (anyDirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
  }

  public dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.clashMeshA.geometry.dispose();
    this.clashRing.geometry.dispose();
    this.clashMat.dispose();
    this.clashRingMat.dispose();
    this.hitBurstPool.dispose();
    this.parryFlashPool.dispose();
  }
}
