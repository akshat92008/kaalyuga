import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  buildSlashRibbonStrip,
  createSlashRibbonMaterial,
  generateParametricSwingSamples,
  type RibbonSample,
} from './slashRibbonVfx';
import {
  applyDemonSlayerCelShadingToHierarchy,
  createParashuAuraMaterial,
  getDemonSlayerToonGradient,
} from './demonSlayerShader';
import {
  ARENA_ISO_Y_RATIO,
  ARENA_THREE_SCALE_PX,
  arenaAngleToThreeYaw,
  arenaToThreeWorld,
  computeOrthoStageCameraSpec,
  stanceToAstraElement,
} from './demonSlayerVfxStage';

describe('Demon Slayer VFX, Cel Shading & Isometric Camera Sync', () => {
  it('buildSlashRibbonStrip generates smooth finite Catmull-Rom vertices and valid UVs', () => {
    const samples: RibbonSample[] = [
      { baseX: -1, baseY: 0.9, baseZ: 0.4, tipX: -2.2, tipY: 1.3, tipZ: 0.9, age: 0.12 },
      { baseX: 0, baseY: 1.0, baseZ: 1.0, tipX: 0, tipY: 1.4, tipZ: 2.4, age: 0.06 },
      { baseX: 1, baseY: 0.9, baseZ: 0.4, tipX: 2.2, tipY: 1.3, tipZ: 0.9, age: 0.0 },
    ];
    const outPositions = new Float32Array(25 * 6);
    const outUvs = new Float32Array(25 * 4);
    const ptCount = buildSlashRibbonStrip(samples, 0.25, 3, outPositions, outUvs, 1.08);

    assert.equal(ptCount, 7);
    assert.equal(outUvs[0], 0);
    assert.equal(outUvs[2], 0);
    assert.equal(outUvs[(ptCount - 1) * 4], 1);
    assert.equal(outUvs[(ptCount - 1) * 4 + 3], 1);
    for (let i = 0; i < ptCount * 6; i++) {
      assert.ok(Number.isFinite(outPositions[i]), `Position at ${i} must be finite`);
    }
  });

  it('createSlashRibbonMaterial assigns distinct elemental palettes and shader modes', () => {
    const agni = createSlashRibbonMaterial('agni', 'core');
    const vajra = createSlashRibbonMaterial('vajra', 'core');
    const vayu = createSlashRibbonMaterial('vayu', 'core');
    const boss = createSlashRibbonMaterial('boss', 'inkUnder');
    assert.equal(agni.uniforms.uElementKind.value, 0);
    assert.equal(vajra.uniforms.uElementKind.value, 1);
    assert.equal(vayu.uniforms.uElementKind.value, 2);
    assert.equal(boss.uniforms.uElementKind.value, 3);
    assert.equal(boss.uniforms.uPassMode.value, 1.0);
  });

  it('generateParametricSwingSamples spans full arc with reach bonus for Vayu', () => {
    const baseSwing = generateParametricSwingSamples('attack3', 0, 0, 0, 0.5, 0, 0.25, 16);
    const reachSwing = generateParametricSwingSamples('attack3', 0, 0, 0, 0.5, 1.0, 0.25, 16);
    assert.equal(baseSwing.samples.length, 16);
    assert.ok(baseSwing.opacity > 0.9);
    const baseR = Math.hypot(baseSwing.samples[8].tipX, baseSwing.samples[8].tipZ);
    const reachR = Math.hypot(reachSwing.samples[8].tipX, reachSwing.samples[8].tipZ);
    assert.ok(reachR > baseR + 0.35);
  });

  it('applyDemonSlayerCelShadingToHierarchy upgrades to 3-step MeshToonMaterial with Sumi-e BackSide outlines', () => {
    const grad = getDemonSlayerToonGradient();
    assert.equal(grad.image.width, 3);

    const group = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 1),
      new THREE.MeshStandardMaterial({ color: 0xcc6644 })
    );
    group.add(mesh);

    const styled = applyDemonSlayerCelShadingToHierarchy(group, {
      rimColorHex: 0xff6a22,
      rimStrength: 0.85,
    });
    assert.equal(styled.celMaterials.length, 1);
    assert.ok(mesh.material instanceof THREE.MeshToonMaterial);
    assert.equal(styled.outlineMeshes.length, 1);
    assert.equal(styled.outlineMeshes[0].userData.isInkOutline, true);
    assert.equal((styled.outlineMeshes[0].material as THREE.Material).side, THREE.BackSide);

    const aura = createParashuAuraMaterial(0x4ce8ff);
    assert.equal(aura.uniforms.uColor.value.getHex(), 0x4ce8ff);
  });

  it('arenaToThreeWorld & computeOrthoStageCameraSpec map arena coordinates cleanly 1:1', () => {
    assert.equal(stanceToAstraElement('smash'), 'agni');
    assert.equal(stanceToAstraElement('pillar'), 'vayu');
    assert.equal(stanceToAstraElement('thrust'), 'vajra');

    assert.ok(Math.abs(arenaAngleToThreeYaw(0) - Math.PI * 0.5) < 1e-6);
    assert.ok(Math.abs(arenaAngleToThreeYaw(Math.PI * 0.5)) < 1e-6);

    const pt = arenaToThreeWorld(1080, 540 * ARENA_ISO_Y_RATIO);
    assert.ok(Math.abs(pt.x - 20) < 1e-6);
    assert.ok(Math.abs(pt.z - 10) < 1e-6);

    const spec = computeOrthoStageCameraSpec(200, 100, 1440, 900, 0.96);
    assert.ok(Math.abs(spec.worldRect.w - spec.halfW * 2 * ARENA_THREE_SCALE_PX) < 1e-6);
    assert.ok(Math.abs(spec.worldRect.h - spec.halfH * 2 * ARENA_THREE_SCALE_PX) < 1e-6);
    // Exact center consistency
    const centerArena = arenaToThreeWorld(200 + 720, 100 + 450);
    assert.ok(Math.abs(spec.targetX - centerArena.x) < 1e-6);
    assert.ok(Math.abs(spec.targetZ - centerArena.z) < 1e-6);
  });
});
