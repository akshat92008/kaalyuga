import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BDA_POOL_CAPS,
  createBloodDemonArtPool,
  resolveEnemyBloodDemonArtKind,
  spawnHinokamiSlashArc,
  spawnExplodingBloodSeed,
  spawnTengenClashSparks,
  stepBloodDemonArtPool,
  triggerEnemyBloodDemonArtAttack,
  triggerImpactInversionFlash,
} from './bloodDemonArts';

describe('Demon Slayer Blood Demon Art VFX Engine', () => {
  it('assigns distinct Blood Demon Arts across every regular enemy, new warden, semi-boss, and boss', () => {
    const archetypes = [
      'charnel_ghoul',
      'ashen_oracle',
      'ironmaw_gladiator',
      'bloodmaw_brute',
      'semi_boss_bloodforge',
      'preta_bowman',
      'ash_cyclone_warden',
      'molten_titan_warden',
      'eternal_wheel_warden',
      'dundubhi',
      'vrikodara',
    ];

    const kinds = new Set<string>();
    const names = new Set<string>();
    for (const enemyType of archetypes) {
      const profile = resolveEnemyBloodDemonArtKind(enemyType);
      kinds.add(profile.kind);
      names.add(profile.artName);
      assert.ok(profile.artName.length > 4);
      assert.ok(profile.primaryHex.startsWith('#'));
      assert.ok(profile.inkHex.startsWith('#'));
    }

    assert.equal(kinds.size, archetypes.length, 'Every enemy archetype must map to a unique Blood Demon Art');
    assert.equal(names.size, archetypes.length, 'Every enemy archetype must have a unique Blood Demon Art title');
  });

  it('pre-allocates fixed-capacity pools and bounds allocations even under heavy burst spawning', () => {
    const pool = createBloodDemonArtPool();
    assert.equal(pool.slashArcs.length, BDA_POOL_CAPS.slashArcs);
    assert.equal(pool.clashSparks.length, BDA_POOL_CAPS.clashSparks);
    assert.equal(pool.bloodSeeds.length, BDA_POOL_CAPS.bloodSeeds);

    const palettes = ['hinokami', 'sun', 'water', 'wind', 'thunder'] as const;
    for (let i = 0; i < 80; i++) {
      spawnHinokamiSlashArc(pool, {
        x: 640 + i,
        y: 360,
        angle: i * 0.2,
        palette: palettes[i % palettes.length],
      });
    }
    assert.equal(pool.slashArcs.length, BDA_POOL_CAPS.slashArcs);

    spawnTengenClashSparks(pool, 640, 360, 20, 340);
    const activeSparks = pool.clashSparks.filter((s) => s.active).length;
    assert.equal(activeSparks, 20);
  });

  it('triggers delayed Exploding Blood Seed detonations and expires 2-frame Impact Inversion flashes deterministically', () => {
    const pool = createBloodDemonArtPool();
    spawnExplodingBloodSeed(pool, {
      x: 500,
      y: 420,
      radius: 58,
      damage: 42,
      ownerSide: 'player',
      delaySec: 0.45,
    });
    triggerImpactInversionFlash(pool, 500, 420, 0.048);

    const earlyDetonations = stepBloodDemonArtPool(pool, 0.2);
    assert.equal(earlyDetonations.length, 0);
    assert.ok(pool.impactInversionTimer === 0); // 0.2s > 0.048s so flash has completed

    const fired = stepBloodDemonArtPool(pool, 0.3);
    assert.equal(fired.length, 1);
    assert.equal(fired[0].x, 500);
    assert.equal(fired[0].y, 420);
    assert.equal(fired[0].damage, 42);
    assert.equal(fired[0].ownerSide, 'player');
  });

  it('spawns signature Blood Demon Art geometry for each new enemy warden & boss', () => {
    const pool = createBloodDemonArtPool();

    triggerEnemyBloodDemonArtAttack(pool, {
      enemyType: 'ash_cyclone_warden',
      x: 400,
      y: 300,
      targetX: 600,
      targetY: 320,
      aimAngle: 0,
      radius: 100,
    });
    assert.ok(pool.cycloneArms.some((c) => c.active));

    triggerEnemyBloodDemonArtAttack(pool, {
      enemyType: 'eternal_wheel_warden',
      x: 400,
      y: 300,
      targetX: 600,
      targetY: 320,
      aimAngle: 0,
      radius: 100,
    });
    assert.ok(pool.chakramRings.some((c) => c.active));

    triggerEnemyBloodDemonArtAttack(pool, {
      enemyType: 'molten_titan_warden',
      x: 400,
      y: 300,
      targetX: 600,
      targetY: 320,
      aimAngle: 0,
      radius: 100,
    });
    assert.ok(pool.magmaGeysers.some((g) => g.active));

    triggerEnemyBloodDemonArtAttack(pool, {
      enemyType: 'dundubhi',
      x: 400,
      y: 300,
      targetX: 600,
      targetY: 320,
      aimAngle: 0,
      radius: 130,
      phase: 2,
    });
    assert.ok(pool.sonicMandalas.some((m) => m.active));
  });
});
