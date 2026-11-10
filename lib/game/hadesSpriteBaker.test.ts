import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  gradePixelToHadesPalette,
  computeSpriteSheetFrameKey,
} from './hadesSpriteBaker';

describe('Hades 2D Sprite Sheet Baker & Texture Re-Grader', () => {
  it('regrades Rudra pale neutral grey skin into gleaming oiled bronze (warm R > G > B)', () => {
    const paleSkin = gradePixelToHadesPalette(128, 128, 128, 255, 'rudra_bronze');
    assert.ok(
      paleSkin.r > paleSkin.g && paleSkin.g > paleSkin.b,
      `Expected warm bronze R > G > B, got (${paleSkin.r}, ${paleSkin.g}, ${paleSkin.b})`
    );
    assert.ok(
      paleSkin.r - paleSkin.b >= 70,
      `Expected strong warm bronze separation R - B >= 70, got ${paleSkin.r - paleSkin.b}`
    );
  });

  it('preserves bright Vibhuti sacred ash stripes as luminous gold-ivory', () => {
    const vibhuti = gradePixelToHadesPalette(220, 218, 215, 255, 'rudra_bronze');
    assert.ok(vibhuti.r >= 240 && vibhuti.g >= 225, 'Vibhuti markings should remain bright gold-ivory');
  });

  it('intensifies Rudra and Vrikodara crimson armor/cloth into deep blood-crimson', () => {
    const dhoti = gradePixelToHadesPalette(150, 42, 40, 255, 'rudra_bronze');
    assert.ok(dhoti.r >= 195 && dhoti.g <= 35, 'Crimson cloth should be deeply saturated');

    const vrikPlate = gradePixelToHadesPalette(160, 50, 48, 255, 'vrikodara_crimson');
    assert.ok(vrikPlate.r >= 200 && vrikPlate.g <= 40, 'Vrikodara plate should be rich crimson');
  });

  it('quantizes animation time on twos (15 FPS idle/run, 24 FPS attack) and 24 isometric directions', () => {
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
      animTime: 0.05,
      yawRad: 0.04,
      isAttacking: false,
      isHurt: false,
      isParrying: false,
    });
    assert.equal(
      idleA.frameKey,
      idleB.frameKey,
      'Sub-step times within the same 15 FPS frame and direction bucket should share a sprite-sheet frame key'
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
    assert.equal(strikeFrame.quantizedTimeStep, 2);
  });
});
