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

/**
 * Multi-part 3D Cel-Shaded Chola Stone Pillar (`Kurukshetra_Pillar`) replacing flat 2D stickers:
 * - Stage 0: Intact octagonal sandstone shaft, stepped plinth, Chola bronze collar rings & ornate capital
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
    const stoneMat = createDemonSlayerCelMaterial({
      map: null,
      tintHex: 0x7b6a58,
      emissiveHex: 0x1a1310,
      emissiveIntensity: 0.10,
      rimColorHex: 0xd4a548,
      rimStrength: 0.42,
      transparent: true,
      opacity: 1.0,
    });
    const darkStoneMat = createDemonSlayerCelMaterial({
      map: null,
      tintHex: 0x57483b,
      emissiveHex: 0x140e0c,
      emissiveIntensity: 0.08,
      rimColorHex: 0xb88635,
      rimStrength: 0.36,
      transparent: true,
      opacity: 1.0,
    });
    const bronzeMat = createDemonSlayerCelMaterial({
      map: null,
      tintHex: 0xc98b34,
      emissiveHex: 0x2b1506,
      emissiveIntensity: 0.16,
      rimColorHex: 0xffe49e,
      rimStrength: 0.65,
      transparent: true,
      opacity: 1.0,
    });
    const runeMat = new THREE.MeshBasicMaterial({
      color: 0xff8c2a,
      transparent: true,
      opacity: 0.65,
    });

    this.stoneMaterials.push(stoneMat, darkStoneMat);
    this.bronzeMaterials.push(bronzeMat);
    this.runeMaterials.push(runeMat);

    // 1. Base Plinth (shared across all stages)
    const plinthBottom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.76, 0.24, 8),
      darkStoneMat
    );
    plinthBottom.position.y = 0.12;
    const plinthTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56, 0.64, 0.18, 8),
      stoneMat
    );
    plinthTop.position.y = 0.32;
    this.group.add(plinthBottom, plinthTop);

    // 2. Intact / Cracked Lower Shaft
    const lowerShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.48, 0.92, 8),
      stoneMat
    );
    lowerShaft.position.y = 0.85;
    const midCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.51, 0.51, 0.14, 8),
      bronzeMat
    );
    midCollar.position.y = 1.28;
    const runeBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.46, 0.09, 8),
      runeMat
    );
    runeBand.position.y = 1.38;
    this.intactGroup.add(lowerShaft, midCollar, runeBand);

    // 3. Upper Shaft + Capital (tilts slightly on Stage 1 crack)
    const upperShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.40, 0.42, 0.86, 8),
      stoneMat
    );
    upperShaft.position.y = 0.46;
    const neckCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.43, 0.14, 8),
      bronzeMat
    );
    neckCollar.position.y = 0.94;
    const capital = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.48, 0.22, 8),
      darkStoneMat
    );
    capital.position.y = 1.12;
    this.crackedTopGroup.position.y = 1.40;
    this.crackedTopGroup.add(upperShaft, neckCollar, capital);
    this.intactGroup.add(this.crackedTopGroup);
    this.group.add(this.intactGroup);

    // 4. Stage 2 Shattered Stump + 3D Rubble Chunks
    const stumpCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.46, 0.42, 7),
      darkStoneMat
    );
    stumpCore.position.y = 0.54;
    stumpCore.rotation.z = 0.08;
    this.stumpGroup.add(stumpCore);
    const rubbleCoords = [
      [-0.54, 0.12, 0.34, 0.24],
      [0.52, 0.11, 0.28, 0.21],
      [-0.22, 0.10, -0.48, 0.19],
      [0.36, 0.12, -0.36, 0.22],
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

    this.outlineMeshes.push(...attachSumiInkOutlines(this.group, 0.0085, 0x070409));
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
        this.crackedTopGroup.rotation.set(0.06, 0.04, -0.09);
        this.crackedTopGroup.position.set(0.04, 1.36, 0);
      } else {
        this.crackedTopGroup.rotation.set(0, 0, 0);
        this.crackedTopGroup.position.set(0, 1.40, 0);
      }
    }

    const occOpacity =
      typeof input.rudraX === 'number' && typeof input.rudraZ === 'number'
        ? computePillarOcclusionOpacity(input.x, input.z, input.rudraX, input.rudraZ, stage)
        : 1.0;

    for (const sm of this.stoneMaterials) {
      sm.opacity = occOpacity;
      sm.emissive.setHex(input.hitFlash ? 0xffe082 : stage === 1 ? 0x421808 : 0x1a1310);
      sm.emissiveIntensity = input.hitFlash ? 0.36 : stage === 1 ? 0.24 : 0.10;
    }
    for (const bm of this.bronzeMaterials) {
      bm.opacity = occOpacity;
      bm.emissive.setHex(input.hitFlash ? 0xffe49e : 0x2b1506);
      bm.emissiveIntensity = input.hitFlash ? 0.38 : 0.16;
    }
    for (const om of this.outlineMeshes) {
      (om.material as THREE.MeshBasicMaterial).opacity = occOpacity;
    }
    for (const rm of this.runeMaterials) {
      const pulse = 0.55 + Math.sin(elapsedSec * (stage === 1 || input.bossEnraged ? 9.0 : 3.2)) * 0.25;
      rm.color.setHex(input.bossEnraged || stage === 1 ? 0xff422a : 0xffaa3b);
      rm.opacity = Math.min(occOpacity, stage === 1 ? 0.95 : pulse);
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
