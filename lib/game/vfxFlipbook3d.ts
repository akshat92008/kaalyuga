import * as THREE from 'three';

export interface FlipbookSheetDef {
  url: string;
  cols: number;
  rows: number;
  inset?: number;
}

export const KALIYUGA_VFX_SHEETS = {
  bloodSlash8x1: {
    url: '/kaalyuga/vfx/clean_blood_slash_8x1.png',
    cols: 8,
    rows: 1,
    inset: 0.025,
  },
  bloodSplatter4x2: {
    url: '/kaalyuga/vfx/clean_blood_splatter_4x2.png',
    cols: 4,
    rows: 2,
    inset: 0.04,
  },
  shockwave4x2: {
    url: '/kaalyuga/vfx/clean_shockwave_4x2.png',
    cols: 4,
    rows: 2,
    inset: 0.02,
  },
  moltenSlag4x2: {
    url: '/kaalyuga/vfx/clean_molten_slag_4x2.png',
    cols: 4,
    rows: 2,
    inset: 0.02,
  },
  moltenBurst4x2: {
    url: '/kaalyuga/vfx/clean_molten_burst_4x2.png',
    cols: 4,
    rows: 2,
    inset: 0.04,
  },
  stoneFragments4x2: {
    url: '/kaalyuga/vfx/clean_stone_fragments_4x2.png',
    cols: 4,
    rows: 2,
    inset: 0.02,
  },
  chargeDust8x1: {
    url: '/kaalyuga/vfx/clean_charge_dust_8x1.png',
    cols: 8,
    rows: 1,
    inset: 0.03,
  },
  parrySparks4x2: {
    url: '/kaalyuga/vfx/clean_parry_sparks_4x2.png',
    cols: 4,
    rows: 2,
    inset: 0.02,
  },
  damageHit8x1: {
    url: '/kaalyuga/vfx/clean_damage_hit_8x1.png',
    cols: 8,
    rows: 1,
    inset: 0.03,
  },
  parashuSlashes3x3: {
    url: '/kaalyuga/vfx/clean_parashu_slashes_3x3.png',
    cols: 3,
    rows: 3,
    inset: 0.025,
  },
} as const satisfies Record<string, FlipbookSheetDef>;

export const KALIYUGA_TELEGRAPH_URLS = {
  slam: '/kaalyuga/vfx/telegraph_slam.png',
  roar: '/kaalyuga/vfx/telegraph_roar.png',
  charge: '/kaalyuga/vfx/telegraph_charge.png',
  cone: '/kaalyuga/vfx/telegraph_cone.png',
} as const;

export interface FlipbookUvRect {
  offsetX: number;
  offsetY: number;
  repeatX: number;
  repeatY: number;
}

/**
 * Computes Three.js UV rect (offsetX, offsetY, repeatX, repeatY) for cell `(col, row)`
 * where `row = 0` is the TOP row of the PNG (flipY = true).
 */
export function computeFlipbookUvRect(
  col: number,
  row: number,
  cols: number,
  rows: number,
  inset = 0.02
): FlipbookUvRect {
  const safeCols = Math.max(1, Math.floor(cols));
  const safeRows = Math.max(1, Math.floor(rows));
  const c = Math.max(0, Math.min(safeCols - 1, Math.floor(col)));
  const r = Math.max(0, Math.min(safeRows - 1, Math.floor(row)));
  const cellW = 1 / safeCols;
  const cellH = 1 / safeRows;
  const padX = cellW * Math.max(0, Math.min(0.2, inset));
  const padY = cellH * Math.max(0, Math.min(0.2, inset));
  return {
    offsetX: c * cellW + padX,
    offsetY: 1 - (r + 1) * cellH + padY,
    repeatX: cellW - padX * 2,
    repeatY: cellH - padY * 2,
  };
}

/**
 * Maps normalized progress `[0, 1]` to a discrete `[0, frameCount - 1]` cell index.
 */
export function computeFlipbookFrame(progress: number, frameCount: number): number {
  const count = Math.max(1, Math.floor(frameCount));
  const p = Math.max(0, Math.min(0.9999, progress));
  return Math.floor(p * count);
}

const textureCache = new Map<string, THREE.Texture>();
let cachedLoader: THREE.TextureLoader | null = null;

export function getSharedVfxTexture(
  url: string,
  onLoad?: (tex: THREE.Texture) => void,
  onError?: () => void
): THREE.Texture | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  const existing = textureCache.get(url);
  if (existing) {
    const img = existing.image as { width?: number } | undefined;
    if (img && (img.width ?? 0) > 0) {
      onLoad?.(existing);
    }
    return existing;
  }
  if (!cachedLoader) {
    cachedLoader = new THREE.TextureLoader();
  }
  const tex = cachedLoader.load(
    url,
    (loaded) => {
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.wrapS = THREE.ClampToEdgeWrapping;
      loaded.wrapT = THREE.ClampToEdgeWrapping;
      loaded.needsUpdate = true;
      onLoad?.(loaded);
    },
    undefined,
    () => {
      textureCache.delete(url);
      onError?.();
    }
  );
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(url, tex);
  return tex;
}

export function createFlipbookShaderMaterial(
  sheet: FlipbookSheetDef,
  options?: {
    tintHex?: number;
    additive?: boolean;
    emissiveBoost?: number;
    renderOrder?: number;
  }
): THREE.ShaderMaterial {
  const rect = computeFlipbookUvRect(0, 0, sheet.cols, sheet.rows, sheet.inset ?? 0.025);
  const tint = new THREE.Color(options?.tintHex ?? 0xffffff);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: null },
      uHasMap: { value: 0 },
      uUvRect: { value: new THREE.Vector4(rect.offsetX, rect.offsetY, rect.repeatX, rect.repeatY) },
      uTint: { value: tint },
      uOpacity: { value: 0 },
      uEmissiveBoost: { value: options?.emissiveBoost ?? 1.15 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uHasMap;
      uniform vec4 uUvRect;
      uniform vec3 uTint;
      uniform float uOpacity;
      uniform float uEmissiveBoost;
      varying vec2 vUv;
      void main() {
        if (uHasMap < 0.5 || uOpacity <= 0.01) discard;
        vec2 sampleUv = uUvRect.xy + vUv * uUvRect.zw;
        vec4 tex = texture2D(uMap, sampleUv);
        float alpha = tex.a * uOpacity;
        if (alpha < 0.04) discard;
        vec3 col = clamp(tex.rgb * uTint * uEmissiveBoost, 0.0, 1.8);
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.98));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: options?.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });

  const tex = getSharedVfxTexture(
    sheet.url,
    (loaded) => {
      mat.uniforms.uMap.value = loaded;
      mat.uniforms.uHasMap.value = 1;
    },
    () => {
      mat.uniforms.uHasMap.value = 0;
    }
  );
  const loadedImg = tex?.image as { width?: number } | undefined;
  if (tex && loadedImg && (loadedImg.width ?? 0) > 0) {
    mat.uniforms.uMap.value = tex;
    mat.uniforms.uHasMap.value = 1;
  }

  return mat;
}

export interface FlipbookInstanceConfig {
  x: number;
  y: number;
  z: number;
  vx?: number;
  vy?: number;
  vz?: number;
  sizeStart: number;
  sizeEnd: number;
  duration: number;
  mode: 'billboard' | 'ground' | 'oriented';
  yaw?: number;
  pitch?: number;
  roll?: number;
  row?: number;
  startCol?: number;
  frameCount?: number;
  tintHex?: number;
  alpha?: number;
  spinSpeed?: number;
}

interface PooledFlipbookSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  duration: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  sizeStart: number;
  sizeEnd: number;
  mode: 'billboard' | 'ground' | 'oriented';
  yaw: number;
  pitch: number;
  roll: number;
  row: number;
  startCol: number;
  frameCount: number;
  alpha: number;
  spinSpeed: number;
}

const CAMERA_ANCHOR = new THREE.Vector3(15.0, 14.3, 15.0);

/**
 * Zero-GC pooled Three.js Sprite-Sheet Flipbook Renderer.
 * Renders authentic hand-drawn Demon Slayer VFX frames across billboard, ground, or angled 3D planes.
 */
export class FlipbookEffectPool {
  public readonly group = new THREE.Group();
  private readonly sheet: FlipbookSheetDef;
  private readonly geometry: THREE.PlaneGeometry;
  private readonly slots: PooledFlipbookSlot[] = [];
  private cursor = 0;

  constructor(
    sheet: FlipbookSheetDef,
    capacity = 8,
    options?: {
      additive?: boolean;
      emissiveBoost?: number;
      renderOrder?: number;
      anchorBottom?: boolean;
    }
  ) {
    this.sheet = sheet;
    this.geometry = new THREE.PlaneGeometry(1, 1);
    if (options?.anchorBottom) {
      this.geometry.translate(0, 0.5, 0);
    }
    for (let i = 0; i < capacity; i++) {
      const mat = createFlipbookShaderMaterial(sheet, {
        additive: options?.additive,
        emissiveBoost: options?.emissiveBoost ?? 1.15,
      });
      const mesh = new THREE.Mesh(this.geometry, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = options?.renderOrder ?? 18;
      this.group.add(mesh);
      this.slots.push({
        mesh,
        mat,
        active: false,
        age: 0,
        duration: 0.45,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        sizeStart: 1,
        sizeEnd: 2,
        mode: 'billboard',
        yaw: 0,
        pitch: 0,
        roll: 0,
        row: 0,
        startCol: 0,
        frameCount: sheet.cols * sheet.rows,
        alpha: 0.95,
        spinSpeed: 0,
      });
    }
  }

  public get hasActive(): boolean {
    return this.slots.some((s) => s.active);
  }

  public spawn(cfg: FlipbookInstanceConfig) {
    const slot = this.slots.find((s) => !s.active) || this.slots[this.cursor];
    this.cursor = (this.cursor + 1) % this.slots.length;
    slot.active = true;
    slot.age = 0;
    slot.duration = Math.max(0.08, cfg.duration);
    slot.x = cfg.x;
    slot.y = cfg.y;
    slot.z = cfg.z;
    slot.vx = cfg.vx ?? 0;
    slot.vy = cfg.vy ?? 0;
    slot.vz = cfg.vz ?? 0;
    slot.sizeStart = cfg.sizeStart;
    slot.sizeEnd = cfg.sizeEnd;
    slot.mode = cfg.mode;
    slot.yaw = cfg.yaw ?? 0;
    slot.pitch = cfg.pitch ?? 0;
    slot.roll = cfg.roll ?? 0;
    slot.row = cfg.row ?? 0;
    slot.startCol = cfg.startCol ?? 0;
    slot.frameCount = cfg.frameCount ?? this.sheet.cols;
    slot.alpha = cfg.alpha ?? 0.95;
    slot.spinSpeed = cfg.spinSpeed ?? 0;
    slot.mat.uniforms.uTint.value.setHex(cfg.tintHex ?? 0xffffff);
    slot.mat.uniforms.uOpacity.value = slot.alpha;
    this.applySlotTransform(slot, 0);
    slot.mesh.visible = true;
  }

  private applySlotTransform(slot: PooledFlipbookSlot, p: number) {
    const size = slot.sizeStart + (slot.sizeEnd - slot.sizeStart) * p;
    slot.mesh.position.set(slot.x, slot.y, slot.z);
    slot.mesh.scale.set(size, size, 1);
    if (slot.mode === 'ground') {
      slot.mesh.rotation.order = 'YXZ';
      slot.mesh.rotation.set(-Math.PI * 0.5, slot.yaw + slot.spinSpeed * slot.age, 0);
    } else if (slot.mode === 'oriented') {
      slot.mesh.rotation.order = 'YXZ';
      slot.mesh.rotation.set(
        -Math.PI * 0.5 + slot.pitch,
        slot.yaw,
        slot.roll + slot.spinSpeed * slot.age
      );
    } else {
      slot.mesh.lookAt(CAMERA_ANCHOR);
      slot.mesh.rotateZ(slot.roll + slot.spinSpeed * slot.age);
    }
    const localFrame = computeFlipbookFrame(p, slot.frameCount);
    const totalCols = this.sheet.cols;
    const flatIdx = slot.startCol + localFrame;
    const col = flatIdx % totalCols;
    const row = Math.min(this.sheet.rows - 1, slot.row + Math.floor(flatIdx / totalCols));
    const rect = computeFlipbookUvRect(col, row, this.sheet.cols, this.sheet.rows, this.sheet.inset ?? 0.025);
    slot.mat.uniforms.uUvRect.value.set(rect.offsetX, rect.offsetY, rect.repeatX, rect.repeatY);
  }

  public update(dt: number, cameraPos?: THREE.Vector3) {
    if (cameraPos) CAMERA_ANCHOR.copy(cameraPos);
    for (const slot of this.slots) {
      if (!slot.active) continue;
      slot.age += dt;
      if (slot.age >= slot.duration) {
        slot.active = false;
        slot.mesh.visible = false;
        slot.mat.uniforms.uOpacity.value = 0;
        continue;
      }
      const p = slot.age / slot.duration;
      slot.x += slot.vx * dt;
      slot.y += slot.vy * dt;
      slot.z += slot.vz * dt;
      const fade = p < 0.14 ? p / 0.14 : Math.max(0, 1 - Math.pow((p - 0.14) / 0.86, 1.45));
      slot.mat.uniforms.uOpacity.value = slot.alpha * fade;
      this.applySlotTransform(slot, p);
    }
  }

  public clear() {
    for (const slot of this.slots) {
      slot.active = false;
      slot.mesh.visible = false;
      slot.mat.uniforms.uOpacity.value = 0;
    }
  }

  public dispose() {
    this.geometry.dispose();
    for (const slot of this.slots) {
      slot.mat.dispose();
    }
  }
}
