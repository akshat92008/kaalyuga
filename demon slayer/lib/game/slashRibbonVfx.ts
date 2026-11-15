import * as THREE from 'three';
import type { AstraElement } from './rules';

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
    midColor: new THREE.Color('#ff8c1a'),
    outerColor: new THREE.Color('#e11d48'),
    inkColor: new THREE.Color('#450a0a'),
    jaggedness: 0.32,
  },
  vajra: {
    coreColor: new THREE.Color('#f0f9ff'),
    midColor: new THREE.Color('#38bdf8'),
    outerColor: new THREE.Color('#fde047'),
    inkColor: new THREE.Color('#0c4a6e'),
    jaggedness: 0.44,
  },
  vayu: {
    coreColor: new THREE.Color('#ecfdf5'),
    midColor: new THREE.Color('#34d399'),
    outerColor: new THREE.Color('#059669'),
    inkColor: new THREE.Color('#064e3b'),
    jaggedness: 0.28,
  },
  boss: {
    coreColor: new THREE.Color('#ffe4e6'),
    midColor: new THREE.Color('#ef4444'),
    outerColor: new THREE.Color('#991b1b'),
    inkColor: new THREE.Color('#450a0a'),
    jaggedness: 0.3,
  },
};

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
 * locked accurately to the real Parashu blade base -> tip span.
 * Tail tapers razor-sharp to the outer blade edge at u=0.
 */
export function buildSlashRibbonStrip(
  samples: RibbonSample[],
  maxAge: number,
  subdivisions: number,
  outPositions: Float32Array,
  outUvs: Float32Array,
  bladeFlareScale = 1.15
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
    // Razor-sharp calligraphic taper: inner edge pulls toward tip at tail (u->0)
    const widthFactor = Math.pow(Math.sin(Math.min(1, u * 1.08) * Math.PI * 0.5), 0.7) * (0.35 + 0.65 * life);

    const dx = tx - bx;
    const dy = ty - by;
    const dz = tz - bz;

    // Outer tip stays locked directly to the real blade edge (+ tiny crisp extension)
    const outerX = bx + dx * bladeFlareScale;
    const outerY = by + dy * bladeFlareScale;
    const outerZ = bz + dz * bladeFlareScale;

    // Inner edge sweeps in from outer tip according to widthFactor so tail forms a needle-sharp tip
    const spanT = 1.0 - widthFactor * 0.92;
    const innerX = bx + (outerX - bx) * spanT;
    const innerY = by + (outerY - by) * spanT;
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
    outUvs[uOff + 1] = 0; // trailing inner edge
    outUvs[uOff + 2] = u;
    outUvs[uOff + 3] = 1; // razor leading outer blade edge
  }

  return pointCount;
}

export function createSlashRibbonMaterial(theme: RibbonTheme = 'agni'): THREE.ShaderMaterial {
  const pal = RIBBON_PALETTES[theme];
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uCoreColor: { value: pal.coreColor.clone() },
      uMidColor: { value: pal.midColor.clone() },
      uOuterColor: { value: pal.outerColor.clone() },
      uInkColor: { value: pal.inkColor.clone() },
      uJagged: { value: pal.jaggedness },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uCoreColor;
      uniform vec3 uMidColor;
      uniform vec3 uOuterColor;
      uniform float uJagged;
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

        // Animated anime flame/lightning tongues tearing away from the blade path
        float n1 = noise(vec2(u * 14.0 - uTime * 11.0, v * 4.5));
        float n2 = noise(vec2(u * 32.0 - uTime * 18.0, v * 11.0));
        float flicker = n1 * 0.62 + n2 * 0.38;

        // Crisp fade along tail (u = 0..0.35) and leading blade tip feather (u = 0.96..1.0)
        float uMask = smoothstep(0.0, 0.32, u) * (1.0 - smoothstep(0.97, 1.0, u) * 0.25);

        // Blade edge sits cleanly at v = 0.88..0.98; inner elemental flames erode inward (v -> 0)
        float coreBand = smoothstep(0.68, 0.88, v) * (1.0 - smoothstep(0.95, 1.0, v));
        float midField = smoothstep(0.18 + (flicker - 0.5) * uJagged * 1.15, 0.72, v);
        float wispNoise = smoothstep(0.45, 0.85, flicker) * smoothstep(0.05, 0.45, v) * (1.0 - v);

        float field = clamp(coreBand * 1.25 + midField * 0.78 + wispNoise * 0.52, 0.0, 1.0) * uMask;
        if (field < 0.06 || uOpacity < 0.02) {
          discard;
        }

        // Vivid stepped Ufotable elemental palette (no murky grey/black mud)
        vec3 col = mix(uOuterColor * 1.35, uMidColor * 1.55, smoothstep(0.15, 0.55, field));
        col = mix(col, uCoreColor * 1.9, smoothstep(0.72, 0.92, v) * uMask);

        float alpha = clamp(field * uOpacity * 1.15, 0.0, 0.95);
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
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
    trailSpan: 1.75,
    innerRadius: 0.82,
    outerRadius: 1.78,
    centerY: 1.28,
    tiltPitch: 0.2,
    tiltRoll: -0.32,
    waveAmp: 0.04,
  },
  attack2: {
    startOffset: 1.22,
    endOffset: -1.18,
    trailSpan: 1.75,
    innerRadius: 0.82,
    outerRadius: 1.82,
    centerY: 1.32,
    tiltPitch: -0.18,
    tiltRoll: 0.34,
    waveAmp: 0.04,
  },
  attack3: {
    startOffset: -1.55,
    endOffset: 1.65,
    trailSpan: 2.25,
    innerRadius: 0.88,
    outerRadius: 2.05,
    centerY: 1.22,
    tiltPitch: 0.14,
    tiltRoll: -0.2,
    waveAmp: 0.05,
  },
  heavy: {
    startOffset: -1.35,
    endOffset: 1.35,
    trailSpan: 2.05,
    innerRadius: 0.82,
    outerRadius: 2.15,
    centerY: 1.36,
    tiltPitch: 0.62,
    tiltRoll: 0.14,
    waveAmp: 0.04,
  },
  cast: {
    startOffset: -Math.PI * 0.4,
    endOffset: Math.PI * 1.9,
    trailSpan: Math.PI * 1.55,
    innerRadius: 1.05,
    outerRadius: 2.45,
    centerY: 1.18,
    tiltPitch: 0.06,
    tiltRoll: 0.08,
    waveAmp: 0.08,
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

  const innerR = spec.innerRadius;
  const outerR = spec.outerRadius + reachBonus * 0.65;
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
      baseY: Math.max(0.25, byLocal),
      baseZ,
      tipX,
      tipY: Math.max(0.32, tyLocal),
      tipZ,
      age: (1 - t) * maxAge * 0.58,
    });
  }

  return { samples, opacity };
}

export class SlashRibbonController {
  public readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly maxSamples = 32;
  private readonly subdivisions = 3;
  private readonly maxStripPoints: number;
  private readonly positions: Float32Array;
  private readonly uvs: Float32Array;
  private readonly samples: RibbonSample[] = [];
  private readonly maxAge = 0.22;
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

    this.material = createSlashRibbonMaterial(theme);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 18;
    this.mesh.visible = false;
  }

  public setTheme(theme: RibbonTheme) {
    if (this.theme === theme) return;
    this.theme = theme;
    const pal = RIBBON_PALETTES[theme];
    this.material.uniforms.uCoreColor.value.copy(pal.coreColor);
    this.material.uniforms.uMidColor.value.copy(pal.midColor);
    this.material.uniforms.uOuterColor.value.copy(pal.outerColor);
    this.material.uniforms.uInkColor.value.copy(pal.inkColor);
    this.material.uniforms.uJagged.value = pal.jaggedness;
  }

  public clear() {
    this.samples.length = 0;
    this.geometry.setDrawRange(0, 0);
    this.mesh.visible = false;
  }

  public ageSamples(dt: number) {
    for (let i = this.samples.length - 1; i >= 0; i--) {
      this.samples[i].age += dt;
      if (this.samples[i].age >= this.maxAge) {
        this.samples.splice(i, 1);
      }
    }
  }

  public pushSample(baseWorld: THREE.Vector3, tipWorld: THREE.Vector3, initialAge = 0) {
    // Skip duplicate identical sample if blade hasn't moved measurably
    const last = this.samples[this.samples.length - 1];
    if (last && initialAge === 0) {
      const moved =
        Math.hypot(tipWorld.x - last.tipX, tipWorld.y - last.tipY, tipWorld.z - last.tipZ);
      if (moved < 0.025) return;
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

  public commit(elapsedTime: number, isEmitting: boolean, flareScale = 1.15) {
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
    this.material.uniforms.uTime.value = elapsedTime;
    this.material.uniforms.uOpacity.value = isEmitting
      ? 1.0
      : Math.max(0, 1 - newestAge / this.maxAge);
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
      18
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

    this.material.uniforms.uTime.value = elapsedTime;
    this.material.uniforms.uOpacity.value = opacity;
    this.mesh.visible = triIndexCount > 0;
  }

  public update(
    dt: number,
    elapsedTime: number,
    isEmitting: boolean,
    baseWorld: THREE.Vector3,
    tipWorld: THREE.Vector3,
    flareScale = 1.15
  ) {
    this.ageSamples(dt);
    if (isEmitting) {
      this.pushSample(baseWorld, tipWorld, 0);
    }
    this.commit(elapsedTime, isEmitting, flareScale);
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
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
 * Zero-GC pooled InstancedMesh spark & Sumi-e brush droplet burst system.
 */
export class PooledSparkSystem {
  public readonly mesh: THREE.InstancedMesh;
  private readonly capacity = 96;
  private readonly pool: SparkInstance[] = [];
  private cursor = 0;
  private readonly dummy = new THREE.Object3D();
  private readonly lookTarget = new THREE.Vector3();

  constructor() {
    const geo = new THREE.ConeGeometry(0.045, 0.36, 4);
    geo.rotateX(Math.PI * 0.5);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, this.capacity);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 19;

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

  public emitBurst(
    originX: number,
    originY: number,
    originZ: number,
    count: number,
    theme: RibbonTheme | 'parry',
    speed = 8.5
  ) {
    const c1 =
      theme === 'parry'
        ? new THREE.Color('#fffbeb')
        : RIBBON_PALETTES[theme].coreColor;
    const c2 =
      theme === 'parry'
        ? new THREE.Color('#f59e0b')
        : RIBBON_PALETTES[theme].midColor;

    for (let k = 0; k < count; k++) {
      const slot = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % this.capacity;

      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.2) * Math.PI * 0.7;
      const spd = speed * (0.55 + Math.random() * 0.9);
      slot.active = true;
      slot.x = originX + (Math.random() - 0.5) * 0.25;
      slot.y = originY + (Math.random() - 0.5) * 0.25;
      slot.z = originZ + (Math.random() - 0.5) * 0.25;
      slot.vx = Math.cos(theta) * Math.cos(phi) * spd;
      slot.vy = Math.abs(Math.sin(phi)) * spd + 1.8;
      slot.vz = Math.sin(theta) * Math.cos(phi) * spd;
      slot.age = 0;
      slot.maxAge = 0.22 + Math.random() * 0.24;
      slot.scale = 0.65 + Math.random() * 0.95;
      slot.color.copy(k % 3 === 0 ? c1 : c2);
    }
  }

  public update(dt: number) {
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
      this.dummy.scale.set(s.scale * life, s.scale * life, s.scale * (0.6 + life * 1.4));
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
  }
}
