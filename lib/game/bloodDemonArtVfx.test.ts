import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  resolveBloodDemonArtProfile,
  BossBloodMandalaRenderer,
  GruntBloodArtPool,
  SumiInkSplashPool,
  GroundFractureAndBouldersPool,
} from './bloodDemonArtVfx';
import { computePillarOcclusionOpacity } from './pillar3dMesh';
import { HeavyWaveVfx, DundubhiBloodDemonArtVfx } from './slashRibbonVfx';

describe('Differentiated 2-Tier Blood Demon Art, 3D Pillars & Ground VFX', () => {
  it('resolveBloodDemonArtProfile separates Tier 1 grunts from Tier 2 bosses distinctly', () => {
    const ghoul = resolveBloodDemonArtProfile({
      actorType: 'charnel_ghoul',
      phase: 1,
      aiState: 'attack',
    });
    const brute = resolveBloodDemonArtProfile({
      actorType: 'bloodmaw_brute',
      phase: 1,
      aiState: 'windup',
    });
    const dundubhiP1 = resolveBloodDemonArtProfile({
      actorType: 'dundubhi',
      phase: 1,
      aiState: 'windup',
    });
    const vrikodaraP2 = resolveBloodDemonArtProfile({
      actorType: 'vrikodara',
      phase: 2,
      aiState: 'attack',
    });

    assert.equal(ghoul.tier, 'grunt');
    assert.equal(ghoul.beamCount, 0);
    assert.ok(ghoul.mandalaRadiusWorld <= 0.85);
    assert.ok(ghoul.bounceStrength <= 0.32);

    assert.equal(brute.tier, 'grunt');
    assert.equal(brute.beamCount, 0);
    assert.ok(brute.mandalaRadiusWorld <= 0.85);

    assert.equal(dundubhiP1.tier, 'boss');
    assert.ok(dundubhiP1.beamCount >= 6 && dundubhiP1.beamCount <= 10);
    assert.ok(dundubhiP1.mandalaRadiusWorld >= 2.3);
    assert.ok(dundubhiP1.bounceStrength >= 0.45);

    assert.equal(vrikodaraP2.tier, 'boss');
    assert.ok(vrikodaraP2.beamCount >= 8);
    assert.ok(vrikodaraP2.mandalaRadiusWorld >= 3.2);
    assert.ok(vrikodaraP2.bounceStrength >= 0.65);
  });

  it('computePillarOcclusionOpacity fades intact 3D pillars cleanly when Rudra walks behind them', () => {
    // Rudra far away -> full opacity
    assert.equal(computePillarOcclusionOpacity(10, 10, 0, 0, 0), 1.0);
    // Rudra behind intact/cracked pillar (rudraZ < pillarZ and close in X) -> reduced opacity
    const occluded = computePillarOcclusionOpacity(5, 8, 5, 6.2, 0);
    assert.ok(occluded < 0.7 && occluded >= 0.35);
    // Shattered rubble stump (stage 2) never occludes
    assert.equal(computePillarOcclusionOpacity(5, 8, 5, 6.2, 2), 1.0);
  });

  it('pools and disposes Tier 1, Tier 2, Sumi-e ink, ground fracture, and heavy wave VFX without throwing', () => {
    const scene = new THREE.Scene();
    const bossMandala = new BossBloodMandalaRenderer();
    const gruntArt = new GruntBloodArtPool(8, 6);
    const ink = new SumiInkSplashPool(6);
    const ground = new GroundFractureAndBouldersPool();
    const heavy = new HeavyWaveVfx(scene);
    const bloodArt = new DundubhiBloodDemonArtVfx(scene);
    scene.add(bossMandala.group, gruntArt.group, ink.group, ground.group);
    const camPos = new THREE.Vector3(0, 18, 18);

    const gruntProf = resolveBloodDemonArtProfile({
      actorType: 'ironmaw_gladiator',
      phase: 1,
      aiState: 'attack',
    });
    const bossProf = resolveBloodDemonArtProfile({
      actorType: 'dundubhi',
      phase: 2,
      aiState: 'windup',
    });

    gruntArt.beginFrame();
    gruntArt.applyGruntSeal(0, 0.5, 1, 1, gruntProf);
    gruntArt.triggerGruntBloodSlash(1, 1, 0, gruntProf);
    gruntArt.update(0.016, 0.5);
    assert.equal(gruntArt.hasActive, true);

    bossMandala.update({
      active: true,
      elapsedSec: 0.5,
      x: 4,
      z: 4,
      yaw: 0.4,
      profile: bossProf,
      isAttackOrWindup: true,
      attackProgress01: 0.4,
      cameraPos: camPos,
    });
    assert.equal(bossMandala.hasActive, true);

    ink.spawn(2, 1.0, 2, 0xff3b52, 1.8, camPos);
    ink.update(0.016, camPos);
    assert.equal(ink.hasActive, true);

    ground.triggerImpact(3, 3, 'agni', 2.4, 8);
    ground.update(0.016);
    assert.equal(ground.hasActive, true);

    heavy.triggerTripleWave(0, 0, 0.4, 'vajra', 12);
    heavy.update(0.016);
    bloodArt.spawnFlyingBloodSickles(2, 2, 0, 2, true);
    bloodArt.update(0.016, 0.5, 2, 2, 0, false, false, false, false, true, camPos);

    bossMandala.dispose();
    gruntArt.dispose();
    ink.dispose();
    ground.dispose();
    heavy.dispose();
    bloodArt.dispose();
  });
});
