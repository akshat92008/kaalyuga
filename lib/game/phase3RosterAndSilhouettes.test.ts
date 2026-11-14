import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_CAMERA_ZOOM,
  BOSS_SCALE_AUTHORITY,
  SILHOUETTE_ROLE_PRESETS,
  getSilhouetteSpecForRole,
} from './hadesSpriteBaker';
import { CHAMBERS, GAME_ASSETS } from './assets';
import { ENEMY_MODEL_SLOTS, selectSlotKeyFromInput } from './enemy3dRenderer';

describe('Phase 3 — Wide-Camera (0.96) Silhouette Readability & 3D Character Roster Wiring', () => {
  it('enforces fixed BASE_CAMERA_ZOOM = 0.96 and distinct role rim-light & outline presets', () => {
    assert.equal(BASE_CAMERA_ZOOM, 0.96);

    const rudraSpec = getSilhouetteSpecForRole('rudra');
    assert.equal(rudraSpec.rimHex, '#ffb347');
    assert.equal(rudraSpec.outlineColor, '#120806');

    const enemySteelSpec = getSilhouetteSpecForRole('regular_enemy');
    assert.equal(enemySteelSpec.rimHex, '#94a3b8');

    const enemyCrimsonSpec = getSilhouetteSpecForRole('regular_enemy_crimson');
    assert.equal(enemyCrimsonSpec.rimHex, '#ef4444');

    const bossSpec = getSilhouetteSpecForRole('boss');
    assert.equal(bossSpec.rimHex, '#ff5a1f');
    assert.ok(bossSpec.outlineThickness >= 2.2);

    assert.equal(BOSS_SCALE_AUTHORITY.semi_boss, 1.35);
    assert.equal(BOSS_SCALE_AUTHORITY.dundubhi, 1.45);
    assert.equal(BOSS_SCALE_AUTHORITY.vrikodara, 1.55);
    assert.ok(SILHOUETTE_ROLE_PRESETS.rudra.rimHex === '#ffb347');
  });

  it('wires Dundubhi to Bellhorn_Warlord + Creature Pack (4) with mutant dying.fbx (zero mutant_idle death placeholders)', () => {
    const models = GAME_ASSETS.models3d;
    assert.ok(
      models.dundubhiFbx.includes('Creature Pack (4)/Meshy_AI_Bellhorn_Warlord_20261114_generate.fbx'),
      'Dundubhi base skeleton must come from Creature Pack (4)/Meshy_AI_Bellhorn_Warlord_20261114_generate.fbx'
    );
    assert.ok(
      models.dundubhiTextureFbx.includes('3D Models/Bellhorn_Warlord/'),
      'Dundubhi PBR textures must come from 3D Models/Bellhorn_Warlord/'
    );
    assert.ok(models.dundubhiAnims.idle.includes('mutant breathing idle.fbx'));
    assert.ok(models.dundubhiAnims.run.includes('mutant run.fbx'));
    assert.ok(models.dundubhiAnims.charge.includes('mutant run.fbx'));
    assert.ok(models.dundubhiAnims.gore.includes('mutant swiping.fbx'));
    assert.ok(models.dundubhiAnims.slam.includes('mutant jump attack.fbx'));
    assert.ok(models.dundubhiAnims.roar.includes('mutant roaring.fbx'));
    assert.ok(models.dundubhiAnims.stagger.includes('mutant flexing muscles.fbx'));
    assert.ok(
      models.dundubhiAnims.death.includes('mutant dying.fbx') &&
        !models.dundubhiAnims.death.includes('mutant idle'),
      'Dundubhi death clip must be mutant dying.fbx with zero mutant_idle placeholders'
    );
  });

  it('wires Semi-Boss Sword & Shield to Horned_Warlord_of_the_Bloodforge_v2 + Pro Sword and Shield Pack + Molten_Oni_Aegis & Crescent_Reaver', () => {
    const semiBoss = GAME_ASSETS.models3d.semiBossBloodforge;
    assert.ok(
      semiBoss.riggedFbx.includes(
        'Pro Sword and Shield Pack/Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_generate.fbx'
      )
    );
    assert.ok(
      semiBoss.textureFbx.includes(
        'Horned_Warlord_of_the_Bloodforge_v2/Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_texture_fbx'
      )
    );
    assert.ok(semiBoss.anims.slash1.includes('sword and shield slash.fbx'));
    assert.ok(semiBoss.anims.slash2.includes('sword and shield slash (2).fbx'));
    assert.ok(semiBoss.anims.slash3.includes('sword and shield slash (3).fbx'));
    assert.ok(semiBoss.anims.slash4.includes('sword and shield slash (4).fbx'));
    assert.ok(semiBoss.anims.slash5.includes('sword and shield slash (5).fbx'));
    assert.ok(semiBoss.anims.attack1.includes('sword and shield attack.fbx'));
    assert.ok(semiBoss.anims.attack4.includes('sword and shield attack (4).fbx'));
    assert.ok(semiBoss.anims.block.includes('sword and shield block.fbx'));
    assert.ok(semiBoss.anims.blockIdle.includes('sword and shield block idle.fbx'));
    assert.ok(semiBoss.anims.impact.includes('sword and shield impact.fbx'));
    assert.ok(semiBoss.anims.powerUp.includes('sword and shield power up.fbx'));
    assert.ok(semiBoss.anims.death.includes('sword and shield death.fbx'));
    assert.ok(semiBoss.shieldFbx.includes('Molten_Oni_Aegis'));
    assert.ok(semiBoss.swordFbx.includes('Crescent_Reaver'));
  });

  it('wires Vrikodara to Crimson_Skull_Warlord_v2 + Pro Melee Axe Pack (5) + Embermaw_Mace (Phase 1) & Bloodforged_Trident_Axe (Phase 2)', () => {
    const models = GAME_ASSETS.models3d;
    assert.ok(
      models.vrikodaraFbx.includes(
        'Pro Melee Axe Pack (5)/Meshy_AI_Crimson_Skull_Warlord_20261030_generate.fbx'
      )
    );
    assert.ok(
      models.vrikodaraTextureFbx.includes('Crimson_Skull_Warlord_20261030_texture_fbx')
    );
    assert.ok(models.vrikodaraAnims.downwardSmash.includes('standing melee attack downward.fbx'));
    assert.ok(models.vrikodaraAnims.cleave360.includes('standing melee attack 360 high.fbx'));
    assert.ok(models.vrikodaraAnims.battlecry.includes('standing taunt battlecry.fbx'));
    assert.ok(models.vrikodaraAnims.chestThump.includes('standing taunt chest thump.fbx'));
    assert.ok(models.vrikodaraAnims.reactGut.includes('standing react large gut.fbx'));
    assert.ok(models.vrikodaraAnims.block.includes('standing block'));
    assert.ok(models.vrikodaraAnims.death.toLowerCase().includes('standing react death backward.fbx'));
    assert.ok(models.embermawMaceFbx.includes('Embermaw_Mace'));
    assert.ok(models.tridentFbx.includes('Bloodforged_Trident'));
  });

  it('de-duplicates Crimson_Skull_Warlord from regular mob spawns so Vrikodara owns that silhouette exclusively', () => {
    const slotKeys = Object.keys(ENEMY_MODEL_SLOTS) as Array<keyof typeof ENEMY_MODEL_SLOTS>;
    assert.equal(slotKeys.length, 6);
    for (const key of slotKeys) {
      const slot = ENEMY_MODEL_SLOTS[key];
      assert.ok(
        !slot.generateFbxUrl.includes('Crimson_Skull_Warlord') &&
          !slot.textureFbxUrl.includes('Crimson_Skull_Warlord'),
        `Regular enemy slot ${key} must not use Vrikodara's Crimson_Skull_Warlord model`
      );
      assert.ok(
        !slot.generateFbxUrl.includes('Bellhorn_Warlord') &&
          !slot.textureFbxUrl.includes('Bellhorn_Warlord'),
        `Regular enemy slot ${key} must not use Dundubhi's Bellhorn_Warlord model`
      );
    }

    assert.equal(selectSlotKeyFromInput('ironmaw_gladiator', 0, 'shield_gladiator'), 'shield_gladiator');
    assert.equal(selectSlotKeyFromInput('ironmaw_gladiator', 1, 'axe_guardian'), 'axe_guardian');
    assert.equal(selectSlotKeyFromInput('bloodmaw_brute', 0, 'club_brute'), 'club_brute');
    assert.equal(selectSlotKeyFromInput('bloodmaw_brute', 1, 'horned_warbringer'), 'horned_warbringer');
  });

  it('strips all Wukong leftover IDs across CHAMBERS and assets.ts', () => {
    const forbiddenIds = new Set([
      'wolf_guai',
      'fire_monk',
      'stone_golem',
      'furnace_titan',
      'xuemo',
      'dragon_pillar',
      'pagoda_lantern',
      'incense_cauldron',
    ]);

    for (const ch of CHAMBERS) {
      assert.ok(
        typeof ch.sanskritSubtitle === 'string' && ch.sanskritSubtitle.length > 0,
        `Chamber ${ch.id} must define sanskritSubtitle`
      );
      assert.equal(
        'chineseSubtitle' in ch,
        false,
        `Chamber ${ch.id} must not contain chineseSubtitle`
      );
      for (const sp of ch.spawns) {
        assert.equal(
          forbiddenIds.has(sp.type),
          false,
          `Chamber ${ch.id} spawn must not use legacy Wukong ID ${sp.type}`
        );
      }
      for (const pr of ch.props || []) {
        assert.equal(
          forbiddenIds.has(pr.type),
          false,
          `Chamber ${ch.id} prop must not use legacy Wukong ID ${pr.type}`
        );
      }
    }
  });
});
