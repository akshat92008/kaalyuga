import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mountRudraAlternateWeapons } from './rudraWeaponModels';
import { resolveRudraDesiredState } from './rudra3dRenderer';
import {
  ArenaBladeSample,
  BakedBladePose,
  WEAPON_SWING_MOTION,
  classifyBladeTrailStep,
  cancelActiveStrike,
  claimEnemyHitForStrike,
  createActiveStrikeState,
  projectBakedBladePoseToArena,
  resolveWeaponSwingClipProgress,
  sampleCombatBodyPose,
  transformArenaBladeSample,
  stepActiveStrikeWindow,
  writeSweptBladeRibbonBuffers,
} from './bladeTrailSampler';

test('projectBakedBladePoseToArena maps normalized Parashu sprite coordinates accurately into arena space', () => {
  const pose: BakedBladePose = {
    rootU: 0.5,
    rootV: 0.5,
    tipU: 0.85,
    tipV: 0.25,
    depthZ: -0.42,
    valid: true,
  };
  const rect = { drawX: 100, drawY: 200, drawW: 140, drawH: 140 };
  const sample = projectBakedBladePoseToArena(pose, rect, {
    playerX: 170,
    playerY: 310,
    slashAngle: 0,
    progress: 0.4,
  });

  assert.equal(sample.rootX, 170);
  assert.equal(sample.rootY, 270);
  assert.equal(sample.tipX, 219);
  assert.equal(sample.tipY, 235);
  assert.equal(sample.depthZ, -0.42);
  assert.ok(sample.bladeLengthPx > 50);
});

test('projectBakedBladePoseToArena falls back cleanly without NaN when 3D pose is unavailable', () => {
  const sample = projectBakedBladePoseToArena(
    null,
    { drawX: 0, drawY: 0, drawW: 0, drawH: 0 },
    {
      playerX: 400,
      playerY: 300,
      slashAngle: 0.4,
      progress: 0.5,
      direction: 1,
      reachPx: 68,
    }
  );
  assert.ok(Number.isFinite(sample.rootX));
  assert.ok(Number.isFinite(sample.tipX));
  assert.ok(sample.bladeLengthPx >= 20);
});

test('writeSweptBladeRibbonBuffers builds smooth Catmull-Rom curved geometry and splits Back/Front depth cleanly', () => {
  const samples: ArenaBladeSample[] = [
    { rootX: 100, rootY: 120, tipX: 70, tipY: 70, midX: 85, midY: 95, depthZ: -0.6, angleRad: -2.1, bladeLengthPx: 58, progress: 0.2, ageSec: 0.12 },
    { rootX: 112, rootY: 112, tipX: 120, tipY: 50, midX: 116, midY: 81, depthZ: -0.25, angleRad: -1.4, bladeLengthPx: 62, progress: 0.38, ageSec: 0.08 },
    { rootX: 125, rootY: 118, tipX: 175, tipY: 88, midX: 150, midY: 103, depthZ: 0.35, angleRad: -0.5, bladeLengthPx: 58, progress: 0.56, ageSec: 0.04 },
    { rootX: 130, rootY: 132, tipX: 182, tipY: 148, midX: 156, midY: 140, depthZ: 0.72, angleRad: 0.3, bladeLengthPx: 54, progress: 0.72, ageSec: 0 },
  ];

  const maxSpine = 48;
  const pos = new Float32Array(maxSpine * 2 * 3);
  const uv = new Float32Array(maxSpine * 2 * 2);
  const depths = new Float32Array(maxSpine * 2);
  const idx = new Uint16Array(maxSpine * 6);

  const full = writeSweptBladeRibbonBuffers(samples, pos, uv, depths, idx, {
    subdivisions: 4,
    widthBoostPx: 44,
    depthFilter: 'all',
    maxSpineSamples: maxSpine,
  });
  assert.equal(full.spineCount, 13);
  assert.equal(full.vertexCount, 26);
  assert.equal(full.indexCount, 12 * 6);
  assert.equal(full.hasBackSegments, true);
  assert.equal(full.hasFrontSegments, true);
  const lastTip = (full.vertexCount - 1) * 3;
  assert.equal(pos[lastTip], samples.at(-1)?.tipX);
  assert.equal(pos[lastTip + 1], -(samples.at(-1)?.tipY ?? 0));
  for (let i = 0; i < full.vertexCount * 3; i++) {
    assert.ok(Number.isFinite(pos[i]), `Position index ${i} must be finite`);
  }

  const backOnly = writeSweptBladeRibbonBuffers(samples, pos, uv, depths, idx, {
    subdivisions: 4,
    widthBoostPx: 44,
    depthFilter: 'back',
    maxSpineSamples: maxSpine,
  });
  const frontOnly = writeSweptBladeRibbonBuffers(samples, pos, uv, depths, idx, {
    subdivisions: 4,
    widthBoostPx: 44,
    depthFilter: 'front',
    maxSpineSamples: maxSpine,
  });

  assert.ok(backOnly.indexCount > 0, 'Back pass should contain behind-Rudra triangles');
  assert.ok(frontOnly.indexCount > 0, 'Front pass should contain in-front-of-Rudra triangles');
  assert.ok(backOnly.indexCount < full.indexCount);
  assert.ok(frontOnly.indexCount < full.indexCount);
});

test('ActiveStrikeSyncState prevents Frame-0 damage, deduplicates hits per attackSerial, and aborts cleanly on cancel', () => {
  const strike = createActiveStrikeState({
    attackSerial: 42,
    tier: 'heavy',
    element: 'agni',
    stance: 'smash',
    comboStep: 1,
    slashAngle: 0,
  });

  // Startup frames (0.0 -> 0.25): zero hits, zero primary VFX
  const s0 = stepActiveStrikeWindow(strike, 0.0);
  assert.equal(s0.phase, 'startup');
  assert.equal(s0.shouldEvaluateHits, false);
  assert.equal(s0.shouldStartPrimaryVfx, false);
  assert.equal(s0.shouldSampleBladeTrail, false);

  // Active contact frame (0.28): fires primary VFX once & enables hits
  const s1 = stepActiveStrikeWindow(strike, 0.28);
  assert.equal(s1.phase, 'active');
  assert.equal(s1.shouldStartPrimaryVfx, true);
  assert.equal(s1.shouldEvaluateHits, true);
  assert.equal(s1.shouldSampleBladeTrail, true);

  // Single-hit deduplication for enemy #7
  assert.equal(claimEnemyHitForStrike(strike, 7), true);
  assert.equal(claimEnemyHitForStrike(strike, 7), false);
  assert.equal(claimEnemyHitForStrike(strike, 9), true);

  // Second active frame (0.45): primary VFX does NOT re-trigger, trail keeps sampling
  const s2 = stepActiveStrikeWindow(strike, 0.45);
  assert.equal(s2.phase, 'active');
  assert.equal(s2.shouldStartPrimaryVfx, false);
  assert.equal(s2.shouldSampleBladeTrail, true);

  // Mid-swing dodge interrupt cancels immediately
  cancelActiveStrike(strike);
  const s3 = stepActiveStrikeWindow(strike, 0.52);
  assert.equal(s3.phase, 'cancelled');
  assert.equal(s3.shouldEvaluateHits, false);
  assert.equal(s3.shouldSampleBladeTrail, false);
  assert.equal(s3.shouldFinalizeTrail, true);
  assert.equal(claimEnemyHitForStrike(strike, 12), false);
});

test('each weapon reaches contact and follow-through with continuous forward motion', () => {
  for (const weapon of ['khanda_dual', 'parashu', 'trishula_great'] as const) {
    const motion = WEAPON_SWING_MOTION[weapon];
    for (const heavy of [false, true]) {
      const start = heavy ? 0.28 : 0.25;
      const end = heavy ? 0.72 : 0.68;
      const clip = (progress: number) => resolveWeaponSwingClipProgress(progress, weapon, heavy, start, end);
      assert.equal(clip(start), heavy ? motion.heavyContact : motion.lightContact);
      assert.equal(clip(end), motion.followThrough);
      assert.equal(clip(0), 0);
      assert.equal(clip(1), 1);
      for (let sample = 1; sample <= 100; sample++) assert.ok(clip(sample / 100) > clip((sample - 1) / 100));
      const epsilon = 0.0001;
      for (const point of [start, end]) {
        const speedIn = (clip(point) - clip(point - epsilon)) / epsilon;
        const speedOut = (clip(point + epsilon) - clip(point)) / epsilon;
        assert.ok(Math.abs(speedIn - speedOut) < 0.01);
      }
    }
  }
});

test('blade trail accepts motion and breaks across a teleported weapon', () => {
  const sample = projectBakedBladePoseToArena(null, { drawX: 0, drawY: 0, drawW: 0, drawH: 0 },
    { playerX: 400, playerY: 300, slashAngle: 0, progress: 0.5 });
  assert.equal(classifyBladeTrailStep(sample, sample), 'duplicate');
  assert.equal(classifyBladeTrailStep(sample, { ...sample, tipX: sample.tipX + 12 }), 'sweep');
  assert.equal(classifyBladeTrailStep(sample, { ...sample, rootY: sample.rootY - 70 }), 'break');
});

test('regular heavy swings choose a weapon-specific clip while execution keeps its authored pose', () => {
  const heavy = {
    isHurt: false, isDefeated: false, isParrying: false, isCasting: false, isDodging: false,
    isHeavyAttack: true, isAttacking: false, comboStep: 1, vx: 0, vy: 0,
  };
  const clips = { attack2: true, attack3: true, heavy: true, cast: true };
  const window = { activeStart: 0.28, activeEnd: 0.72 };
  assert.equal(resolveRudraDesiredState({ ...heavy, weaponSwing: { ...window, weapon: 'khanda_dual' } }, clips), 'attack2');
  assert.equal(resolveRudraDesiredState({ ...heavy, weaponSwing: { ...window, weapon: 'parashu' } }, clips), 'heavy');
  assert.equal(resolveRudraDesiredState({ ...heavy, weaponSwing: { ...window, weapon: 'trishula_great' } }, clips), 'attack3');
  assert.equal(resolveRudraDesiredState({ ...heavy, finisherVariant: 'spin_360_cleave' }, clips), 'cast');
});

test('weapon anticipation and follow-through preserve the foot pivot and transform blade anchors', () => {
  const contact = 0.36;
  const windup = sampleCombatBodyPose(0.18, contact, 0, 'parashu', true);
  const finish = sampleCombatBodyPose(0.56, contact, 0, 'parashu', true);
  const left = sampleCombatBodyPose(0.56, contact, Math.PI, 'parashu', true);
  const thrust = sampleCombatBodyPose(0.56, contact, 0, 'trishula_great', true);
  assert.ok(windup.lean < 0 && windup.scaleY < 1);
  assert.ok(finish.lean > 0 && left.lean === -finish.lean);
  assert.ok(finish.scaleX < 1 && thrust.scaleX > 1);
  assert.ok(Math.abs(sampleCombatBodyPose(1, contact, 0, 'parashu', true).lean) < 1e-10);

  const sample = { rootX: 50, rootY: 60, tipX: 80, tipY: 60, midX: 65, midY: 60,
    angleRad: 0, bladeLengthPx: 30, depthZ: 0, progress: 0, ageSec: 0 };
  const transformed = transformArenaBladeSample(sample, 50, 60, { lean: Math.PI / 2, scaleX: 2, scaleY: 1 });
  assert.equal(transformed.rootX, 50);
  assert.equal(transformed.rootY, 60);
  assert.ok(Math.abs(transformed.tipX - 50) < 1e-10);
  assert.equal(transformed.tipY, 120);
  assert.equal(transformed.bladeLengthPx, 60);
});

test('Khanda and Trishula mount distinct cutting edges in Rudra’s normalized rig', () => {
  const right = new THREE.Group();
  const left = new THREE.Group();
  right.scale.setScalar(0.012);
  left.scale.setScalar(0.012);
  const { khanda, trishula } = mountRudraAlternateWeapons(right, left);
  assert.equal(khanda.group.parent, right);
  assert.equal(khanda.offHand?.parent, left);
  assert.equal(trishula.group.parent, right);
  const world = new THREE.Vector3();
  assert.ok(Math.abs(khanda.tip.getWorldPosition(world).x - 0.88) < 1e-6);
  assert.ok(Math.abs(trishula.tip.getWorldPosition(world).x - 1.34) < 1e-6);
  assert.ok(trishula.root.getWorldPosition(world).x > khanda.root.getWorldPosition(new THREE.Vector3()).x);
  assert.ok(trishula.group.children.filter(node => node instanceof THREE.Mesh).length >
    khanda.group.children.filter(node => node instanceof THREE.Mesh).length);
});
