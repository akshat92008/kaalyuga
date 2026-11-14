import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  SHARED_STUDIO_OUTLINE_COLOR,
  SHARED_STUDIO_OUTLINE_THICKNESS,
  gradePixelToHadesPalette,
  computeSpriteSheetFrameKey,
  computeArenaFloorGradeSpec,
  setupSharedStudioLightingRig,
} from './hadesSpriteBaker';
import { getChamberGeometry, constrainActorToChamber } from './chamberGeometry';
import { simplifyBufferGeometry } from './meshSimplifier';
import { selectSlotKeyFromInput } from './enemy3dRenderer';

describe('Hades 2D Sprite Sheet Baker & Texture Re-Grader', () => {
  it('preserves neutral skin/hide hues with S-curve contrast without artificial orange blowout', () => {
    const neutralSkin = gradePixelToHadesPalette(128, 128, 128, 255, 'rudra_bronze');
    assert.equal(
      neutralSkin.r,
      neutralSkin.g,
      `Neutral grey should remain balanced without orange tint, got (${neutralSkin.r}, ${neutralSkin.g}, ${neutralSkin.b})`
    );
    assert.ok(
      neutralSkin.r > 128,
      `Midtones above 122 should receive crisp S-curve contrast lift, got ${neutralSkin.r}`
    );
  });

  it('preserves bright Vibhuti sacred ash stripes as luminous gold-ivory', () => {
    const vibhuti = gradePixelToHadesPalette(220, 218, 215, 255, 'rudra_bronze');
    assert.ok(vibhuti.r >= 240 && vibhuti.g >= 225, 'Vibhuti markings should remain bright gold-ivory');
  });

  it('intensifies Rudra and Vrikodara crimson armor/cloth into deep blood-crimson', () => {
    const dhoti = gradePixelToHadesPalette(150, 42, 40, 255, 'rudra_bronze');
    assert.ok(dhoti.r >= 195 && dhoti.g <= 36, 'Crimson cloth should be deeply saturated');

    const vrikPlate = gradePixelToHadesPalette(160, 50, 48, 255, 'vrikodara_crimson');
    assert.ok(vrikPlate.r >= 200 && vrikPlate.g <= 42, 'Vrikodara plate should be rich crimson');
  });

  it('quantizes animation time at 30 FPS idle/run, 60 FPS attack, and 36 isometric directions', () => {
    const idleA = computeSpriteSheetFrameKey({
      id: 'rudra',
      animName: 'Combat_Idle',
      animTime: 0.01,
      yawRad: 0.02,
      isAttacking: false,
      isHurt: false,
      isParrying: false,
    });
    const idleB = computeSpriteSheetFrameKey({
      id: 'rudra',
      animName: 'Combat_Idle',
      animTime: 0.02,
      yawRad: 0.04,
      isAttacking: false,
      isHurt: false,
      isParrying: false,
    });
    assert.equal(
      idleA.frameKey,
      idleB.frameKey,
      'Sub-step times within the same 30 FPS frame and direction bucket should share a sprite-sheet frame key'
    );

    const strikeFrame = computeSpriteSheetFrameKey({
      id: 'rudra',
      animName: 'Attack',
      animTime: 0.1,
      yawRad: Math.PI / 2,
      isAttacking: true,
      isHurt: false,
      isParrying: false,
    });
    assert.equal(strikeFrame.quantizedTimeStep, 6);
  });

  it('clamps all chamber polygons below the sky/wall ceiling so Rudra never walks or attacks in the sky', () => {
    for (let chamberIdx = 0; chamberIdx < 8; chamberIdx++) {
      const geom = getChamberGeometry(chamberIdx);
      for (const pt of geom.outerPolygon) {
        assert.ok(
          pt.y >= 0.32,
          `Chamber ${chamberIdx} polygon vertex y=${pt.y} must stay grounded (>= 0.32)`
        );
      }
      const clampedSkyAttempt = constrainActorToChamber(500, 50, 0, -100, 1000, 1000, chamberIdx, false, false, 18);
      assert.ok(
        clampedSkyAttempt.y >= 320,
        `Clamped sky target in chamber ${chamberIdx} should stay on the stone floor (>= 320), got ${clampedSkyAttempt.y}`
      );
    }
  });

  it('preserves 1:1 UV and skeletal skin attributes during 56x56x56 decimation', () => {
    const sphere = new THREE.SphereGeometry(1, 96, 96).toNonIndexed();
    const simplified = simplifyBufferGeometry(sphere, 56, 1000);
    assert.ok(simplified.getAttribute('uv'), 'Simplified geometry must preserve 1:1 UV coordinates');
    assert.ok(
      simplified.getAttribute('position').count < sphere.getAttribute('position').count,
      '56x56x56 decimation should reduce high-poly vertex count while preserving UVs'
    );
  });

  it('maps all 8 distinct 3D enemy models across enemy types and chamber variants', () => {
    assert.equal(selectSlotKeyFromInput('wolf_guai', 0), 'grunt_ghoul');
    assert.equal(selectSlotKeyFromInput('fire_monk', 0), 'witch_oracle');
    assert.equal(selectSlotKeyFromInput('stone_golem', 0), 'club_brute');
    assert.equal(selectSlotKeyFromInput('stone_golem', 1), 'axe_guardian');
    assert.equal(selectSlotKeyFromInput('stone_golem', 2), 'shield_gladiator');
    assert.equal(selectSlotKeyFromInput('stone_golem', 3, 'skull_warlord'), 'skullclad_warden');
    assert.equal(selectSlotKeyFromInput('furnace_titan', 0), 'bomber_guardian');
    assert.equal(selectSlotKeyFromInput('furnace_titan', 1), 'horned_warbringer');
  });

  it('Stage B: unifies studio lighting rig, outline thickness (#120806, 2.0px), and dark-ash/ember floor grade', () => {
    assert.equal(SHARED_STUDIO_OUTLINE_COLOR, '#120806');
    assert.equal(SHARED_STUDIO_OUTLINE_THICKNESS, 2.0);

    const scene = new THREE.Scene();
    const rig = setupSharedStudioLightingRig(scene, 1.0);
    assert.equal(scene.children.length, 4);
    assert.ok(rig.keyLight.intensity > rig.fillLight.intensity);
    assert.ok(rig.rimLight.intensity > 1.0);

    const ch0Grade = computeArenaFloorGradeSpec(0);
    const ch4Grade = computeArenaFloorGradeSpec(4);
    assert.ok(ch0Grade.multiplyInner.startsWith('rgba('));
    assert.ok(ch4Grade.ashTintOverlay.startsWith('rgba('));
  });
});
