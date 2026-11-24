import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ENEMY_MODEL_SLOTS, createProceduralIronBucklerGroup } from './enemy3dRenderer';
import {
  buildBossPrewarmParamsList,
  resolveBossPbrMaterialConfig,
} from './boss3dRenderer';
import {
  applyHadesCelShadingToHierarchy,
  computeSpriteSheetFrameKey,
} from './hadesSpriteBaker';
import {
  LITE_SKINNED_BIN_MAP,
  buildGroupFromSkinnedBinBuffer,
  getLiteSkinnedBinUrl,
  serializeGroupToSkinnedBinBuffer,
} from './meshSimplifier';
import {
  RudraRenderInput,
  resolveRudraAnimStateAndClock,
} from './rudra3dRenderer';
import {
  PARASHU_FLIPBOOK_ROWS,
  PARRY_SPARKS_FLIPBOOK_ROWS,
  PHASE2_VFX_SHEETS,
  computeLightningArcFlipbookSegments,
  resolveParticleFlipbookSpec,
} from './vfxFlipbook';

describe('P1 Rendering, 3D Rigging & Performance Defect Fixes', () => {
  it('P1-1: removes Molten_Oni_Aegis silhouette theft from shield_gladiator and builds a 3-part Iron Buckler', () => {
    const shieldSlot = ENEMY_MODEL_SLOTS.shield_gladiator;
    assert.equal(shieldSlot.hasLeftShield, false);
    assert.equal(shieldSlot.leftBucklerKind, 'iron_buckler');

    const buckler = createProceduralIronBucklerGroup();
    assert.equal(buckler.name, 'IronBucklerGroup');
    let meshCount = 0;
    const metalnessValues: number[] = [];
    buckler.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        meshCount += 1;
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        metalnessValues.push(mat.metalness);
      }
    });
    assert.equal(meshCount, 3, 'Iron Buckler must be a 3-part composite mesh (plate, rim, boss dome)');
    assert.ok(metalnessValues.every((m) => m >= 0.7), 'Iron/bronze buckler materials should be metallic');
  });

  it('P1-2: binds normal, roughness, and metalness maps with 1.0 scalar multipliers and preserves them in Hades cel-shading', () => {
    const dummyMap = new THREE.Texture();
    const dummyNorm = new THREE.Texture();
    const dummyRough = new THREE.Texture();
    const dummyMetal = new THREE.Texture();

    const cfg = resolveBossPbrMaterialConfig({
      map: dummyMap,
      normalMap: dummyNorm,
      roughnessMap: dummyRough,
      metalnessMap: dummyMetal,
      fallbackRoughness: 0.72,
      fallbackMetalness: 0.24,
    });

    assert.equal(cfg.map, dummyMap);
    assert.equal(cfg.normalMap, dummyNorm);
    assert.equal(cfg.roughnessMap, dummyRough);
    assert.equal(cfg.metalnessMap, dummyMetal);
    assert.equal(cfg.roughness, 1.0);
    assert.equal(cfg.metalness, 1.0);
    assert.equal(cfg.envMapIntensity, 0.35);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial(cfg)
    );
    const group = new THREE.Group();
    group.add(mesh);
    applyHadesCelShadingToHierarchy(group);

    const shadedMat = mesh.material as THREE.MeshStandardMaterial;
    assert.equal(shadedMat.roughness, 1.0);
    assert.equal(shadedMat.metalness, 1.0);
    assert.equal(shadedMat.envMapIntensity, 0.35);
  });

  it('P1-3: computeSpriteSheetFrameKey differentiates hit-flash vs normal frames', () => {
    const normal = computeSpriteSheetFrameKey({
      id: 'semi_boss',
      animName: 'idle',
      animTime: 0.25,
      clipDuration: 1.0,
      yawRad: 0,
      isAttacking: false,
      isHurt: false,
      isParrying: false,
      phase: 1,
    });
    const flash = computeSpriteSheetFrameKey({
      id: 'semi_boss',
      animName: 'idle',
      animTime: 0.25,
      clipDuration: 1.0,
      yawRad: 0,
      isAttacking: false,
      isHurt: true,
      isParrying: false,
      phase: 1,
    });
    assert.notEqual(normal.frameKey, flash.frameKey);
    assert.ok(flash.frameKey.includes('H'));
  });

  it('P1-4: buildBossPrewarmParamsList bypasses software WebGL throttling across all 8 prewarm frames', () => {
    const paramsList = buildBossPrewarmParamsList('dundubhi');
    assert.equal(paramsList.length, 8);
    assert.ok(paramsList.every((p) => p.bypassSoftwareThrottle === true));
    assert.ok(paramsList.every((p) => p.dt >= 0.03));
    const states = new Set(paramsList.map((p) => p.aiState));
    assert.deepEqual(Array.from(states).sort(), ['attack', 'chase', 'idle', 'windup']);
  });

  it('P1-5: LITE_SKINNED_BIN_MAP resolves pre-baked weapon binaries and .skinned.bin round-trips static & skinned meshes', () => {
    assert.ok(Object.keys(LITE_SKINNED_BIN_MAP).length >= 2);
    assert.equal(
      getLiteSkinnedBinUrl(
        '/new_3d_assets/3D Models/Weapons/Minotaur_War_Axe_20261111/Meshy_AI_Minotaur_War_Axe_20261111_texture.fbx'
      ),
      '/models_lite/minotaur_axe.mesh.bin'
    );
    assert.equal(
      getLiteSkinnedBinUrl(
        '/new_3d_assets/3D Models/Weapons/Bloodforged_Trident_Axe_20261025/Meshy_AI_Bloodforged_Trident_Axe_20261025_texture.fbx'
      ),
      '/models_lite/trident_axe.mesh.bin'
    );

    const staticGroup = new THREE.Group();
    const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial());
    staticGroup.add(boxMesh);
    const staticBuf = serializeGroupToSkinnedBinBuffer(staticGroup);
    assert.ok(staticBuf instanceof ArrayBuffer && staticBuf.byteLength > 64);
    const rebuiltStatic = buildGroupFromSkinnedBinBuffer(staticBuf);
    let rebuiltVerts = 0;
    rebuiltStatic.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        rebuiltVerts += (c as THREE.Mesh).geometry.attributes.position.count;
      }
    });
    assert.equal(rebuiltVerts, 36);
  });

  it('P1-6: resolveRudraAnimStateAndClock uses normalized [0..1) progress for dash, block, hurt, and cast', () => {
    const baseInput: RudraRenderInput = {
      dt: 0.016,
      vx: 0,
      vy: 0,
      facingX: 1,
      facingY: 0,
      slashAngle: 0,
      isAttacking: false,
      isHeavyAttack: false,
      comboStep: 1,
      attackProgress: 0,
      isDodging: false,
      isParrying: false,
      isCasting: false,
      isHealing: false,
      isHurt: false,
      isDefeated: false,
      stance: 'ash_form',
      focusOrbs: 0,
      elevationY: 0,
    };

    // High global uptime (142.8s) must NOT cause dash/block/hurt/cast to start mid-clip
    const dashStart = resolveRudraAnimStateAndClock(
      { ...baseInput, isDodging: true, stateProgress: 0.05 },
      0.008,
      142.8
    );
    assert.equal(dashStart.state, 'dash');
    assert.equal(dashStart.usesNormalizedProgress, true);
    assert.equal(dashStart.animClock, 0.05);

    const parryMid = resolveRudraAnimStateAndClock(
      { ...baseInput, isParrying: true, stateProgress: 0.5 },
      0.31,
      142.8
    );
    assert.equal(parryMid.state, 'block');
    assert.equal(parryMid.usesNormalizedProgress, true);
    assert.equal(parryMid.animClock, 0.5);

    const hurtFallback = resolveRudraAnimStateAndClock(
      { ...baseInput, isHurt: true },
      0.0,
      142.8
    );
    assert.equal(hurtFallback.state, 'hurt');
    assert.equal(hurtFallback.usesNormalizedProgress, true);
    assert.equal(hurtFallback.animClock, 0);

    const idleLoop = resolveRudraAnimStateAndClock(baseInput, 0.4, 142.8);
    assert.equal(idleLoop.state, 'idle');
    assert.equal(idleLoop.usesNormalizedProgress, false);
    assert.equal(idleLoop.animClock, 142.8);
  });

  it('P1-7: maps all particle archetypes and lightning arcs to Phase 2 additive flipbooks', () => {
    const blood = resolveParticleFlipbookSpec('blood_splatter');
    assert.equal(blood.sheetSpec.id, PHASE2_VFX_SHEETS.parryAndHitSparks4x2.id);
    assert.equal(blood.row, PARRY_SPARKS_FLIPBOOK_ROWS.DIRECTIONAL_HIT_SPLATTER);
    assert.ok(blood.maxSizePx <= 18);

    const spark = resolveParticleFlipbookSpec('bronze_spark');
    assert.equal(spark.sheetSpec.id, PHASE2_VFX_SHEETS.parryAndHitSparks4x2.id);
    assert.equal(spark.row, PARRY_SPARKS_FLIPBOOK_ROWS.VEDIC_PARRY_FLASH);
    assert.equal(spark.colOffset, 3);
    assert.equal(spark.singleCol, true);

    const spell = resolveParticleFlipbookSpec('magic_spell');
    assert.equal(spell.sheetSpec.id, PHASE2_VFX_SHEETS.parryAndHitSparks4x2.id);
    assert.equal(spell.singleCol, true);

    const ember = resolveParticleFlipbookSpec('ember_dust');
    assert.equal(ember.sheetSpec.id, PHASE2_VFX_SHEETS.parryAndHitSparks4x2.id);
    assert.equal(ember.singleCol, true);

    const segments = computeLightningArcFlipbookSegments({
      x1: 100,
      y1: 200,
      x2: 340,
      y2: 260,
      lifeRatio: 0.75,
      seed: 3,
    });
    assert.ok(segments.length >= 3);
    assert.equal(segments[0].sheetSpec.id, PHASE2_VFX_SHEETS.parashuSlashes3x3.id);
    assert.equal(segments[0].row, PARASHU_FLIPBOOK_ROWS.DOWNWARD_CRUSH_FISSURE);
    assert.equal(
      segments[segments.length - 1].sheetSpec.id,
      PHASE2_VFX_SHEETS.parryAndHitSparks4x2.id
    );
    assert.equal(
      segments[segments.length - 1].row,
      PARRY_SPARKS_FLIPBOOK_ROWS.DIRECTIONAL_HIT_SPLATTER
    );
  });
});
