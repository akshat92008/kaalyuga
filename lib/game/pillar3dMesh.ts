import * as THREE from 'three';
import { attachSumiInkOutlines, createDemonSlayerCelMaterial } from './demonSlayerShader';

export interface Pillar3DStateInput {
  x: number;
  z: number;
  stage: 0 | 1 | 2;
  destroyed: boolean;
  hitFlash: boolean;
  bossEnraged: boolean;
  shakeOffsetX?: number;
  rudraX?: number;
  rudraZ?: number;
}

/**
 * Computes whether Rudra is standing directly behind a 3D Chola Pillar so we can smoothly
 * fade the pillar's opacity instead of hiding the player.
 */
export function computePillarOcclusionOpacity(
  pillarX: number,
  pillarZ: number,
  rudraX: number,
  rudraZ: number,
  stage: 0 | 1 | 2
): number {
  if (stage >= 2) return 1.0;
  if (rudraZ < pillarZ && Math.abs(rudraX - pillarX) < 1.32 && pillarZ - rudraZ < 2.6) {
    return 0.38;
  }
  return 1.0;
}

let sharedCholaStoneTexture: THREE.CanvasTexture | null = null;

function getCholaTempleStoneTexture(): THREE.CanvasTexture | null {
  if (sharedCholaStoneTexture) return sharedCholaStoneTexture;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  // Hand-painted Anime Chola Basalt-Sandstone base matching the dark temple floor
  ctx.fillStyle = '#4a3d33';
  ctx.fillRect(0, 0, 256, 256);

  // Vertical carved temple column fluting bands + Sumi-e ink grooves
  for (let x = 0; x < 256; x += 32) {
    ctx.fillStyle = '#635244';
    ctx.fillRect(x + 4, 0, 12, 256);
    ctx.fillStyle = '#332922';
    ctx.fillRect(x + 18, 0, 10, 256);
    ctx.fillStyle = '#0d0705';
    ctx.fillRect(x, 0, 4, 256);
  }

  // Horizontal carved Chola temple friezes & sindoor-crimson sacred bands
  const bandYs = [36, 118, 196];
  for (const by of bandYs) {
    ctx.fillStyle = '#0d0705';
    ctx.fillRect(0, by - 4, 256, 24);
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(0, by, 256, 16);
    ctx.fillStyle = '#b45309';
    for (let x = 8; x < 256; x += 32) {
      ctx.fillRect(x, by + 4, 16, 8);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  sharedCholaStoneTexture = tex;
  return tex;
}

/**
 * Multi-part 3D Cel-Shaded Chola Temple Stone Pillar (`Kurukshetra_Pillar`) replacing flat 2D stickers:
 * - Stage 0: Carved stepped square *Padma-bhadra* plinth, fluted Chola temple shaft, ornate bronze & sindoor-crimson collars, and corbeled capital brackets
 * - Stage 1: Cracked leaning top + glowing molten rune fissure veins + fallen chip chunks
 * - Stage 2: Shattered beveled stump + scattered 3D cel-shaded rubble blocks
 */
export class Pillar3DMeshInstance {
  public readonly group = new THREE.Group();
  private readonly intactGroup = new THREE.Group();
  private readonly crackedTopGroup = new THREE.Group();
  private readonly stumpGroup = new THREE.Group();
  private readonly stoneMaterials: THREE.MeshToonMaterial[] = [];
  private readonly bronzeMaterials: THREE.MeshToonMaterial[] = [];
  private readonly runeMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly outlineMeshes: THREE.Mesh[] = [];

  constructor() {
    const stoneTex = getCholaTempleStoneTexture();
    const stoneMat = createDemonSlayerCelMaterial({
      map: stoneTex,
      tintHex: 0x8a7560,
      emissiveHex: 0x160d0a,
      emissiveIntensity: 0.10,
      rimColorHex: 0xd99b38,
      rimStrength: 0.48,
      transparent: true,
      opacity: 1.0,
    });
    const darkStoneMat = createDemonSlayerCelMaterial({
      map: stoneTex,
      tintHex: 0x5c4b3c,
      emissiveHex: 0x120a08,
      emissiveIntensity: 0.08,
      rimColorHex: 0xb47b28,
      rimStrength: 0.42,
      transparent: true,
      opacity: 1.0,
    });
    const bronzeMat = createDemonSlayerCelMaterial({
      map: null,
      tintHex: 0xb47b28,
      emissiveHex: 0x261204,
      emissiveIntensity: 0.14,
      rimColorHex: 0xfde047,
      rimStrength: 0.58,
      transparent: true,
      opacity: 1.0,
    });
    const runeMat = new THREE.MeshBasicMaterial({
      color: 0xea580c,
      transparent: true,
      opacity: 0.78,
    });

    this.stoneMaterials.push(stoneMat, darkStoneMat);
    this.bronzeMaterials.push(bronzeMat);
    this.runeMaterials.push(runeMat);

    // 1. Stepped Square *Padma-bhadra* Temple Plinth Base (shared across all stages)
    const plinthBottom = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.24, 1.42),
      darkStoneMat
    );
    plinthBottom.position.y = 0.12;
    const plinthMid = new THREE.Mesh(
      new THREE.BoxGeometry(1.16, 0.20, 1.16),
      stoneMat
    );
    plinthMid.position.y = 0.34;
    const plinthCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.66, 0.14, 8),
      bronzeMat
    );
    plinthCollar.position.y = 0.50;
    this.group.add(plinthBottom, plinthMid, plinthCollar);

    // 2. Intact / Cracked Lower Fluted Chola Shaft
    const lowerShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.52, 1.05, 12),
      stoneMat
    );
    lowerShaft.position.y = 1.06;
    const midBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.98, 0.22, 0.98),
      darkStoneMat
    );
    midBlock.position.y = 1.54;
    const midCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56, 0.56, 0.14, 12),
      bronzeMat
    );
    midCollar.position.y = 1.72;
    const runeBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.52, 0.10, 12),
      runeMat
    );
    runeBand.position.y = 1.84;
    this.intactGroup.add(lowerShaft, midBlock, midCollar, runeBand);

    // 3. Upper Shaft + Corbeled Chola Temple Capital (tilts visibly on Stage 1 crack)
    const upperShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.46, 0.92, 12),
      stoneMat
    );
    upperShaft.position.y = 0.48;
    const neckCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.46, 0.16, 12),
      bronzeMat
    );
    neckCollar.position.y = 1.00;
    const capitalAbacus = new THREE.Mesh(
      new THREE.BoxGeometry(1.28, 0.24, 1.28),
      darkStoneMat
    );
    capitalAbacus.position.y = 1.20;
    const capitalCrossBracket = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 0.16, 0.54),
      stoneMat
    );
    capitalCrossBracket.position.y = 1.38;
    this.crackedTopGroup.position.y = 1.88;
    this.crackedTopGroup.add(upperShaft, neckCollar, capitalAbacus, capitalCrossBracket);
    this.intactGroup.add(this.crackedTopGroup);
    this.group.add(this.intactGroup);

    // 4. Stage 2 Shattered Stump + 3D Rubble Chunks
    const stumpCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.50, 0.48, 7),
      darkStoneMat
    );
    stumpCore.position.y = 0.72;
    stumpCore.rotation.z = 0.10;
    this.stumpGroup.add(stumpCore);
    const rubbleCoords = [
      [-0.62, 0.14, 0.38, 0.28],
      [0.58, 0.13, 0.32, 0.24],
      [-0.26, 0.12, -0.54, 0.22],
      [0.42, 0.14, -0.42, 0.26],
    ];
    const rubbleGeo = new THREE.DodecahedronGeometry(1, 0);
    for (const [rx, ry, rz, rs] of rubbleCoords) {
      const chunk = new THREE.Mesh(rubbleGeo, stoneMat);
      chunk.position.set(rx, ry, rz);
      chunk.scale.set(rs, rs * 0.72, rs * 1.15);
      chunk.rotation.set(rx * 2.1, rz * 1.7, 0.4);
      this.stumpGroup.add(chunk);
    }
    this.stumpGroup.visible = false;
    this.group.add(this.stumpGroup);

    this.outlineMeshes.push(...attachSumiInkOutlines(this.group, 0.011, 0x060208));
    for (const om of this.outlineMeshes) {
      const m = om.material as THREE.MeshBasicMaterial;
      m.transparent = true;
    }
  }

  public sync(input: Pillar3DStateInput, elapsedSec: number) {
    const stage: 0 | 1 | 2 = input.destroyed || input.stage >= 2 ? 2 : input.stage;
    this.group.position.set(input.x + (input.shakeOffsetX ?? 0), 0, input.z);

    if (stage >= 2) {
      this.intactGroup.visible = false;
      this.stumpGroup.visible = true;
    } else {
      this.intactGroup.visible = true;
      this.stumpGroup.visible = false;
      if (stage === 1) {
        this.crackedTopGroup.rotation.set(0.08, 0.05, -0.11);
        this.crackedTopGroup.position.set(0.05, 1.82, 0);
      } else {
        this.crackedTopGroup.rotation.set(0, 0, 0);
        this.crackedTopGroup.position.set(0, 1.88, 0);
      }
    }

    const occOpacity =
      typeof input.rudraX === 'number' && typeof input.rudraZ === 'number'
        ? computePillarOcclusionOpacity(input.x, input.z, input.rudraX, input.rudraZ, stage)
        : 1.0;

    for (const sm of this.stoneMaterials) {
      sm.opacity = occOpacity;
      sm.emissive.setHex(input.hitFlash ? 0xffe082 : stage === 1 ? 0x421808 : 0x261812);
      sm.emissiveIntensity = input.hitFlash ? 0.38 : stage === 1 ? 0.26 : 0.16;
    }
    for (const bm of this.bronzeMaterials) {
      bm.opacity = occOpacity;
      bm.emissive.setHex(input.hitFlash ? 0xffe49e : 0x422006);
      bm.emissiveIntensity = input.hitFlash ? 0.42 : 0.24;
    }
    for (const om of this.outlineMeshes) {
      (om.material as THREE.MeshBasicMaterial).opacity = occOpacity;
    }
    for (const rm of this.runeMaterials) {
      const pulse = 0.65 + Math.sin(elapsedSec * (stage === 1 || input.bossEnraged ? 9.0 : 3.2)) * 0.25;
      rm.color.setHex(input.bossEnraged || stage === 1 ? 0xff3b22 : 0xffaa3b);
      rm.opacity = Math.min(occOpacity, stage === 1 ? 0.96 : pulse);
    }
  }

  public dispose() {
    const geos = new Set<THREE.BufferGeometry>();
    this.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        geos.add((o as THREE.Mesh).geometry);
      }
    });
    geos.forEach((g) => g.dispose());
    for (const m of this.stoneMaterials) m.dispose();
    for (const m of this.bronzeMaterials) m.dispose();
    for (const m of this.runeMaterials) m.dispose();
    for (const om of this.outlineMeshes) (om.material as THREE.Material).dispose();
  }
}

export class Pillar3DPool {
  public readonly group = new THREE.Group();
  private readonly pool: Pillar3DMeshInstance[] = [];

  constructor(maxPillars = 6) {
    for (let i = 0; i < maxPillars; i++) {
      const p = new Pillar3DMeshInstance();
      p.group.visible = false;
      this.pool.push(p);
      this.group.add(p.group);
    }
  }

  public syncAll(pillars: Pillar3DStateInput[], elapsedSec: number) {
    for (let i = 0; i < this.pool.length; i++) {
      const inst = this.pool[i];
      if (i < pillars.length) {
        inst.group.visible = true;
        inst.sync(pillars[i], elapsedSec);
      } else {
        inst.group.visible = false;
      }
    }
  }

  public clear() {
    for (const p of this.pool) p.group.visible = false;
  }

  public dispose() {
    for (const p of this.pool) p.dispose();
  }
}
