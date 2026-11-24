import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CORNER_WATERMARK_MASK_RATIO,
  DUNDUBHI_FLIPBOOK_ROWS,
  ISOMETRIC_TELEGRAPH_CELLS,
  PARASHU_FLIPBOOK_ROWS,
  PARRY_SPARKS_FLIPBOOK_ROWS,
  PHASE2_VFX_SHEETS,
  VRIKODARA_FLIPBOOK_ROWS,
  computeCombatSyncedFlipbookFrame,
  computeFlipbookGridCell,
  resolveParashuSlashFlipbookPlan,
} from './vfxFlipbook';
import { resolveEnemyAndBossTelegraphFlipbookPlan } from './enemyArchetypesAndTelegraphs';

describe('Phase 2 — Real Hand-Painted VFX & Telegraph Pipeline (Zero Code Effects)', () => {
  it('wires all 5 Phase 2 additive flipbook sheets with clean ASCII /vfx/ URLs and exact grid dimensions', () => {
    assert.equal(
      PHASE2_VFX_SHEETS.parashuSlashes3x3.url,
      '/vfx/Gemini_Generated_Image_sqvx4fsqvx4fsqvx.png'
    );
    assert.equal(PHASE2_VFX_SHEETS.parashuSlashes3x3.cols, 3);
    assert.equal(PHASE2_VFX_SHEETS.parashuSlashes3x3.rows, 3);

    assert.equal(
      PHASE2_VFX_SHEETS.parryAndHitSparks4x2.url,
      '/vfx/Gemini_Generated_Image_cvl1pecvl1pecvl1.png'
    );
    assert.equal(PHASE2_VFX_SHEETS.parryAndHitSparks4x2.cols, 4);
    assert.equal(PHASE2_VFX_SHEETS.parryAndHitSparks4x2.rows, 2);

    assert.equal(
      PHASE2_VFX_SHEETS.isometricTelegraphs2x2.url,
      '/vfx/Gemini_Generated_Image_jjxeuujjxeuujjxe.png'
    );
    assert.equal(PHASE2_VFX_SHEETS.isometricTelegraphs2x2.cols, 2);
    assert.equal(PHASE2_VFX_SHEETS.isometricTelegraphs2x2.rows, 2);

    assert.equal(
      PHASE2_VFX_SHEETS.dundubhiShockwaveAndShatter4x2.url,
      '/vfx/Gemini_Generated_Image_kogf7ykogf7ykogf.png'
    );
    assert.equal(PHASE2_VFX_SHEETS.dundubhiShockwaveAndShatter4x2.cols, 4);
    assert.equal(PHASE2_VFX_SHEETS.dundubhiShockwaveAndShatter4x2.rows, 2);

    assert.equal(
      PHASE2_VFX_SHEETS.vrikodaraVacuumAndSlag4x2.url,
      '/vfx/Gemini_Generated_Image_us4plhus4plhus4p.png'
    );
    assert.equal(PHASE2_VFX_SHEETS.vrikodaraVacuumAndSlag4x2.cols, 4);
    assert.equal(PHASE2_VFX_SHEETS.vrikodaraVacuumAndSlag4x2.rows, 2);
  });

  it('computes grid cell slicing with an automatic 4% bottom-right cell corner watermark mask', () => {
    assert.equal(CORNER_WATERMARK_MASK_RATIO, 0.04);
    const cell = computeFlipbookGridCell(2752, 1536, 2, 2, 1, 1);
    assert.ok(cell.sw > 1300 && cell.sw <= 1376);
    assert.ok(cell.sh > 720 && cell.sh <= 768);

    // 4% bottom-right corner mask inside the cell
    const expectedMaskW = Math.ceil(cell.sw * 0.04);
    const expectedMaskH = Math.ceil(cell.sh * 0.04);
    assert.equal(cell.watermarkMaskW, expectedMaskW);
    assert.equal(cell.watermarkMaskH, expectedMaskH);
    assert.equal(cell.watermarkMaskX, cell.sx + cell.sw - expectedMaskW);
    assert.equal(cell.watermarkMaskY, cell.sy + cell.sh - expectedMaskH);
  });

  it('ties flipbook frame progression directly to modernCombat.ts Startup / Active / Recovery timestamps', () => {
    // Startup phase (beginning of 0.40s light attack -> remaining 0.36s -> progress 0.10 <= 0.22)
    const startupSync = computeCombatSyncedFlipbookFrame({
      action: 'light_attack',
      actionTimerSec: 0.36,
      actionDurationSec: 0.4,
      cols: 3,
    });
    assert.equal(startupSync.phase, 'startup');
    assert.equal(startupSync.frameCol, 0);

    // Active hitbox window (mid-swing -> remaining 0.22s of 0.40s -> progress 0.45 in [0.22..0.68])
    const activeSync = computeCombatSyncedFlipbookFrame({
      action: 'light_attack',
      actionTimerSec: 0.22,
      actionDurationSec: 0.4,
      cols: 3,
    });
    assert.equal(activeSync.phase, 'active');
    assert.equal(activeSync.frameCol, 1);
    assert.equal(activeSync.alpha, 1.0);

    // Recovery window (end of swing -> remaining 0.06s of 0.40s -> progress 0.85 > 0.68)
    const recoverySync = computeCombatSyncedFlipbookFrame({
      action: 'light_attack',
      actionTimerSec: 0.06,
      actionDurationSec: 0.4,
      cols: 3,
    });
    assert.equal(recoverySync.phase, 'recovery');
    assert.equal(recoverySync.frameCol, 2);
  });

  it('maps Parashu Slashes & 3 Finishers (sqvx4f, 3x3) to Row 0 Crescent, Row 1 downward_crush, Row 2 spin_360_cleave, and rotated Row 1+0 impaling_lunge', () => {
    const lightPlan = resolveParashuSlashFlipbookPlan({
      action: 'light_attack',
      actionTimerSec: 0.11,
      actionDurationSec: 0.18,
      comboStep: 1,
      finisherVariant: null,
      slashAngleRad: 0.5,
    });
    assert.ok(lightPlan);
    assert.equal(lightPlan.primaryRow, PARASHU_FLIPBOOK_ROWS.LIGHT_CRESCENT_SWEEPS);
    assert.equal(lightPlan.secondaryRow, null);

    const crushPlan = resolveParashuSlashFlipbookPlan({
      action: 'execute',
      actionTimerSec: 0.22,
      actionDurationSec: 0.4,
      comboStep: 4,
      finisherVariant: 'downward_crush',
      slashAngleRad: 1.2,
    });
    assert.ok(crushPlan);
    assert.equal(crushPlan.primaryRow, PARASHU_FLIPBOOK_ROWS.DOWNWARD_CRUSH_FISSURE);
    assert.equal(crushPlan.secondaryRow, null);

    const spinPlan = resolveParashuSlashFlipbookPlan({
      action: 'light_attack',
      actionTimerSec: 0.18,
      actionDurationSec: 0.35,
      comboStep: 4,
      finisherVariant: 'spin_360_cleave',
      slashAngleRad: 0,
    });
    assert.ok(spinPlan);
    assert.equal(spinPlan.primaryRow, PARASHU_FLIPBOOK_ROWS.SPIN_360_WHIRLWIND_RING);

    const lungePlan = resolveParashuSlashFlipbookPlan({
      action: 'execute',
      actionTimerSec: 0.2,
      actionDurationSec: 0.38,
      comboStep: 4,
      finisherVariant: 'impaling_lunge',
      slashAngleRad: -0.75,
    });
    assert.ok(lungePlan);
    assert.equal(lungePlan.primaryRow, PARASHU_FLIPBOOK_ROWS.DOWNWARD_CRUSH_FISSURE);
    assert.equal(lungePlan.secondaryRow, PARASHU_FLIPBOOK_ROWS.LIGHT_CRESCENT_SWEEPS);
    assert.equal(lungePlan.rotationRad, -0.75);
  });

  it('wires 2x2 Isometric Telegraphs (jjxeuu) and Boss Signature Flipbooks (kogf7y, us4plh) onto Layer 3 floor plane', () => {
    // 1. Charnel Ghoul -> Top-Right Directional Chevron Runway
    const ghoulStamps = resolveEnemyAndBossTelegraphFlipbookPlan(
      {
        type: 'wolf_guai',
        isBoss: false,
        x: 400,
        y: 400,
        radius: 22,
        aiState: 'windup',
        aiTimer: 0.19,
        windupDuration: 0.38,
        attackAngle: 0.4,
        attackKind: 'corridor',
        pounceTargetX: 580,
        pounceTargetY: 460,
      },
      1000
    );
    assert.ok(ghoulStamps.length > 0);
    assert.equal(ghoulStamps[0].sheetUrl, PHASE2_VFX_SHEETS.isometricTelegraphs2x2.url);
    assert.equal(ghoulStamps[0].col, ISOMETRIC_TELEGRAPH_CELLS.DIRECTIONAL_CHEVRON_RUNWAY.col);
    assert.equal(ghoulStamps[0].row, ISOMETRIC_TELEGRAPH_CELLS.DIRECTIONAL_CHEVRON_RUNWAY.row);

    // 2. Ashen Oracle -> Bottom-Left Curse Lotus Sigil
    const oracleStamps = resolveEnemyAndBossTelegraphFlipbookPlan(
      {
        type: 'fire_monk',
        isBoss: false,
        x: 500,
        y: 360,
        radius: 22,
        aiState: 'windup',
        aiTimer: 0.32,
        windupDuration: 0.65,
        attackAngle: 1.1,
        attackKind: 'aoe',
        yantraTargetX: 640,
        yantraTargetY: 420,
        yantraRadius: 88,
      },
      1000
    );
    assert.ok(oracleStamps.length > 0);
    assert.equal(oracleStamps[0].sheetUrl, PHASE2_VFX_SHEETS.isometricTelegraphs2x2.url);
    assert.equal(oracleStamps[0].col, ISOMETRIC_TELEGRAPH_CELLS.ORACLE_CURSE_LOTUS_SIGIL.col);
    assert.equal(oracleStamps[0].row, ISOMETRIC_TELEGRAPH_CELLS.ORACLE_CURSE_LOTUS_SIGIL.row);

    // 3. Ironmaw Gladiator -> Top-Left Circular Slam Mandala
    const gladiatorStamps = resolveEnemyAndBossTelegraphFlipbookPlan(
      {
        type: 'stone_golem',
        isBoss: false,
        x: 620,
        y: 480,
        radius: 26,
        aiState: 'windup',
        aiTimer: 0.25,
        windupDuration: 0.55,
        attackAngle: 0,
        attackKind: 'cone',
      },
      1000
    );
    assert.ok(gladiatorStamps.length > 0);
    assert.equal(gladiatorStamps[0].sheetUrl, PHASE2_VFX_SHEETS.isometricTelegraphs2x2.url);
    assert.equal(gladiatorStamps[0].col, ISOMETRIC_TELEGRAPH_CELLS.CIRCULAR_SLAM_MANDALA.col);
    assert.equal(gladiatorStamps[0].row, ISOMETRIC_TELEGRAPH_CELLS.CIRCULAR_SLAM_MANDALA.row);

    // 4. Dundubhi Sonic Drum -> kogf7y Row 0 Concentric Bronze Sonic Rings
    const dundubhiSonicStamps = resolveEnemyAndBossTelegraphFlipbookPlan(
      {
        type: 'xuemo',
        isBoss: true,
        x: 700,
        y: 500,
        radius: 36,
        aiState: 'windup',
        aiTimer: 0.28,
        windupDuration: 0.56,
        attackAngle: Math.PI,
        attackKind: 'aoe',
      },
      1000
    );
    assert.ok(dundubhiSonicStamps.length >= 2);
    const sonicRingStamp = dundubhiSonicStamps.find(
      (s) => s.sheetUrl === PHASE2_VFX_SHEETS.dundubhiShockwaveAndShatter4x2.url
    );
    assert.ok(sonicRingStamp);
    assert.equal(sonicRingStamp.row, DUNDUBHI_FLIPBOOK_ROWS.SONIC_BRONZE_RINGS);

    // 5. Vrikodara Furnace Vacuum -> us4plh Row 0 Gravitational Vortex
    const vrikodaraVacuumStamps = resolveEnemyAndBossTelegraphFlipbookPlan(
      {
        type: 'furnace_titan',
        isBoss: true,
        x: 720,
        y: 480,
        radius: 38,
        aiState: 'windup',
        aiTimer: 0.26,
        windupDuration: 0.52,
        attackAngle: 0,
        attackKind: 'aoe',
        activeBossMoveId: 'agni_furnace_inhale',
      },
      1000
    );
    const vortexStamp = vrikodaraVacuumStamps.find(
      (s) => s.sheetUrl === PHASE2_VFX_SHEETS.vrikodaraVacuumAndSlag4x2.url
    );
    assert.ok(vortexStamp);
    assert.equal(vortexStamp.row, VRIKODARA_FLIPBOOK_ROWS.FURNACE_GRAVITATIONAL_VORTEX);

    // 6. Vrikodara Molten Slag Eruption -> us4plh Row 1 Molten Slag Geysers + jjxeuu Bottom-Right Cone
    const vrikodaraSlagStamps = resolveEnemyAndBossTelegraphFlipbookPlan(
      {
        type: 'furnace_titan',
        isBoss: true,
        x: 720,
        y: 480,
        radius: 38,
        aiState: 'windup',
        aiTimer: 0.2,
        windupDuration: 0.5,
        attackAngle: 0.8,
        attackKind: 'cone',
        activeBossMoveId: 'vaitarani_slag_eruption',
      },
      1000
    );
    const slagStamp = vrikodaraSlagStamps.find(
      (s) => s.sheetUrl === PHASE2_VFX_SHEETS.vrikodaraVacuumAndSlag4x2.url
    );
    assert.ok(slagStamp);
    assert.equal(slagStamp.row, VRIKODARA_FLIPBOOK_ROWS.MOLTEN_SLAG_GEYSERS);

    // Verify Parry & Hit Sparks row constants
    assert.equal(PARRY_SPARKS_FLIPBOOK_ROWS.VEDIC_PARRY_FLASH, 0);
    assert.equal(PARRY_SPARKS_FLIPBOOK_ROWS.DIRECTIONAL_HIT_SPLATTER, 1);
  });
});
