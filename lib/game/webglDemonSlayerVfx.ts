import * as THREE from 'three';
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

const RIBBON_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Authentic Ufotable / Demon Slayer 3-band stepped FBM cel shader with roaring flame/wave licks & crisp sumi-e edge
const RIBBON_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uLife;
  uniform vec3 uCoreColor;
  uniform vec3 uMidColor;
  uniform vec3 uEdgeColor;
  uniform vec3 uInkColor;
  uniform float uOpacity;
  uniform float uInkBorder;
  uniform float uMode; // 0 = fire/slash, 1 = water, 2 = lightning, 3 = wind

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

    // Taper smoothly at head and tail like a swept sword arc
    float arcTaper = smoothstep(0.0, 0.16, u) * smoothstep(1.0, 0.72, u);
    float distFromCenter = abs(v - 0.5) * 2.0;

    float flowSpeed = uMode > 1.5 && uMode < 2.5 ? 7.5 : 4.2;
    float n = fbm(vec2(u * 9.5 - uTime * flowSpeed, v * 4.5 + uTime * 1.4));
    float n2 = fbm(vec2(u * 18.0 - uTime * (flowSpeed * 1.45), v * 7.5 - uTime * 2.1));

    // Organic Demon Slayer edge licks (flames / Hokusai foam / jagged lightning / wind blades)
    float tongueBias = (uMode > 1.5 && uMode < 2.5) ? 0.92 : (uMode > 0.5 && uMode < 1.5) ? 0.68 : 0.86;
    float licks = (n * 0.62 + n2 * 0.38 - 0.40) * tongueBias;
    float waveCurl = sin(u * 14.0 - uTime * 9.0) * 0.12 * (1.0 - u);
    float bodyDist = distFromCenter - (licks + waveCurl) * (0.48 + 0.52 * (1.0 - u * 0.25));
    float radiusMask = arcTaper * (1.0 - uLife * 0.28);

    float outerAlpha = smoothstep(radiusMask + 0.10, radiusMask - 0.10, bodyDist);
    if (outerAlpha <= 0.02) discard;

    // Crisp 3-band Ufotable cel quantization (white-hot core -> vivid pigment -> crimson/indigo rim)
    float coreBand = smoothstep(radiusMask * 0.46, radiusMask * 0.16, bodyDist + (n2 - 0.5) * 0.14);
    float midBand = smoothstep(radiusMask * 0.82, radiusMask * 0.44, bodyDist + (n - 0.5) * 0.12);

    vec3 col = mix(uEdgeColor, uMidColor, midBand);
    col = mix(col, uCoreColor, coreBand);

    // Sharp Sumi-e ink rim on outer edge when uInkBorder > 0
    if (uInkBorder > 0.5) {
      float rimZone = smoothstep(radiusMask - 0.09, radiusMask + 0.03, bodyDist);
      col = mix(col, uInkColor, rimZone * 0.88);
    }

    // Dissolve tendrils near end of lifetime
    float dissolve = smoothstep(uLife * 0.86 - 0.08, uLife * 0.86 + 0.16, n * 0.74 + u * 0.26);
    float finalAlpha = outerAlpha * dissolve * (1.0 - smoothstep(0.68, 1.0, uLife)) * uOpacity;
    if (finalAlpha <= 0.01) discard;

    // Premultiply so both NormalBlending ink passes and AdditiveBlending glow passes fade cleanly
    gl_FragColor = vec4(col * finalAlpha, finalAlpha);
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
    // Slight organic spiral expansion toward tip
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

function createRibbonMaterial(
  pal: RibbonPaletteColors,
  mode: number,
  opacity: number,
  inkBorder: boolean,
  blending: THREE.Blending
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
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private ribbons: ActiveWebglRibbon[] = [];
  private cyclones: ActiveWebglCyclone[] = [];
  private sparks: ActiveWebglSpark[] = [];
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
    this.scene = new THREE.Scene();
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
      this.renderer.toneMappingExposure = 1.28;
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
    if (this.ribbons.length >= 22) {
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

    const inkMat = createRibbonMaterial(pal, mode, 0.85, true, THREE.NormalBlending);
    inkMat.uniforms.uCoreColor.value.copy(pal.ink);
    inkMat.uniforms.uMidColor.value.copy(pal.ink);
    inkMat.uniforms.uEdgeColor.value.copy(pal.ink);

    const coreMat = createRibbonMaterial(pal, mode, 0.98, true, THREE.NormalBlending);
    const glowMat = createRibbonMaterial(pal, mode, 0.72, false, THREE.AdditiveBlending);

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
      const mat = createRibbonMaterial(pal, mode, 0.92 - i * 0.1, i === 0, THREE.AdditiveBlending);
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
        color: i % 3 === 0 ? pal.core : pal.mid,
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

  public hasActiveEffects(): boolean {
    return this.ribbons.length > 0 || this.cyclones.length > 0 || this.sparks.length > 0;
  }

  public updateAndRender(
    dt: number,
    camX: number,
    camY: number,
    zoom: number,
    cw: number,
    ch: number
  ): boolean {
    if (!this.renderer || this.disposed) return false;
    this.resize(cw, ch);

    if (!this.hasActiveEffects()) {
      return false;
    }

    this.elapsed += dt;
    const toScreenX = (wx: number) => (wx - camX - cw * 0.5) * zoom;
    const toScreenY = (wy: number) => -((wy - camY - ch * 0.5) * zoom);

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
    while (this.sparks.length) {
      const s = this.sparks.pop();
      if (s) {
        this.scene.remove(s.mesh);
        s.mesh.material.dispose();
      }
    }
    this.sparkGeo.dispose();
    this.renderer?.dispose();
    this.renderer = null;
  }
}
