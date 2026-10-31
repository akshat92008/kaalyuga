// Central Asset Manifest & 8-Chamber 30-Minute Vertical Slice Progression for Kaliyuga: The Bleeding Crown
import { WEAPON_CONFIGS, WeaponId } from './rules';
export { WEAPON_CONFIGS };
export type { WeaponId };

export type PropType = 'incense_cauldron' | 'pagoda_lantern' | 'weapon_rack' | 'dragon_pillar';
export type EnemyTrait = 'vajra_shield' | 'agni_aura' | 'rakshasa_frenzy';

export interface ChamberBrazier {
  x: number;
  y: number;
  color: string;
  radius: number;
}

export interface ChamberPropSpec {
  type: PropType;
  x: number;
  y: number;
}

export interface ChamberSpawnSpec {
  type: 'wolf_guai' | 'fire_monk' | 'stone_golem' | 'furnace_titan' | 'xuemo' | 'vrikodara';
  x: number;
  y: number;
  delay?: number;
  wave?: 1 | 2 | 3;
  trait?: EnemyTrait;
}

export interface ChamberSpec {
  id: number;
  chapterTitle: string;
  name: string;
  chineseSubtitle: string;
  sanjayaQuote: string;
  strikethroughLie?: string;
  backgroundUrl: string;
  unlockedBackgroundUrl?: string;
  phase2BackgroundUrl?: string;
  floorTint: string;
  isBossChamber: boolean;
  envEffect: 'blood_river' | 'lava_fissures' | 'sacred_mist' | 'eclipse_wind';
  braziers: ChamberBrazier[];
  props: ChamberPropSpec[];
  spawns: ChamberSpawnSpec[];
}

export const GAME_ASSETS = {
  // Full-bleed Title Screen Key Art
  titleBackdrop: '/assets/aistudio/Gemini_Generated_Image_5y993f5y993f5y99_b0ca23a4.png',

  // Real-Time 3D FBX Models, Skeletal Animations & PBR Textures for Rudra, Dundubhi & Vrikodara
  models3d: {
    dundubhiFbx:
      '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture.fbx',
    dundubhiAnims: {
      idle: '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_idle.fbx',
      walk: '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_run.fbx',
      run: '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_run.fbx',
      swipe: '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_swiping.fbx',
      slash: '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_swiping.fbx',
      jumpAttack:
        '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_jump_attack.fbx',
      kick: '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_jump_attack.fbx',
      roar: '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_roaring.fbx',
      hit: '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_idle.fbx',
      death: '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_idle.fbx',
    },
    dundubhiTex: {
      baseColor:
        '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture.png',
      normal:
        '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_normal.png',
      metallic:
        '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_metallic.png',
      roughness:
        '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_roughness.png',
      weaponBaseColor:
        '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png',
    },
    vrikodaraFbx:
      '/models/Meshy_AI_Meshy_AI_Infernal_Maw_biped/Meshy_AI_Meshy_AI_Infernal_Maw_biped_Animation_Running_withSkin.fbx',
    vrikodaraTex: {
      baseColor:
        '/models/Meshy_AI_Infernal_Maw_Sovereign_20261025_texture_fbx/Meshy_AI_Infernal_Maw_Sovereign_20261025_texture.png',
      diffuse:
        '/models/Meshy_AI_Infernal_Maw_Sovereign_20261025_texture_fbx/Meshy_AI_Infernal_Maw_Sovereign_20261025_texture.png',
      normal:
        '/models/Meshy_AI_Infernal_Maw_Sovereign_20261025_texture_fbx/Meshy_AI_Infernal_Maw_Sovereign_20261025_texture_normal.png',
      metallic:
        '/models/Meshy_AI_Infernal_Maw_Sovereign_20261025_texture_fbx/Meshy_AI_Infernal_Maw_Sovereign_20261025_texture_metallic.png',
      roughness:
        '/models/Meshy_AI_Infernal_Maw_Sovereign_20261025_texture_fbx/Meshy_AI_Infernal_Maw_Sovereign_20261025_texture_roughness.png',
      specular:
        '/models/Meshy_AI_Infernal_Maw_Sovereign_20261025_texture_fbx/Meshy_AI_Infernal_Maw_Sovereign_20261025_texture_metallic.png',
    },
    tridentFbx:
      '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.fbx',
    tridentTex: {
      baseColor:
        '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png',
      metallic:
        '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_metallic.png',
      normal:
        '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_normal.png',
      roughness:
        '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_roughness.png',
    },
    rudraMergedFbx:
      '/models/Meshy_AI_Ashen_Warborn_biped/Meshy_AI_Ashen_Warborn_biped_Meshy_Merged_Animations.fbx',
    bloodboundTitanFbx:
      '/models/Meshy_AI_Bloodbound_Titan_1025042731_texture_fbx/Meshy_AI_Bloodbound_Titan_1025042731_texture.fbx',
    bloodboundWarlordFbx:
      '/models/Meshy_AI_Bloodbound_Warlord_1025041901_texture_fbx/Meshy_AI_Bloodbound_Warlord_1025041901_texture.fbx',
  },

  // Newly Uploaded + Previous Hand-Painted 16:9 Isometric Chamber Arenas
  chambers: {
    vaitaraniGhat: '/assets/aistudio/Gemini_Generated_Image_c0fyyc0fyyc0fyyc_4d7dcd20.png',
    raktabijaCourtyard: '/assets/aistudio/Gemini_Generated_Image_bmq158bmq158bmq1_a3eaf68a.png',
    chariotBonefield: '/assets/aistudio/Gemini_Generated_Image_ey07c4ey07c4ey07_1de21fb8.png',
    warDrumColonnade: '/assets/aistudio/Gemini_Generated_Image_vjfugjvjfugjvjfu_d880974a.png',
    soulFireSanctum: '/assets/aistudio/Gemini_Generated_Image_lcvwbvlcvwbvlcvw_f51e31fc.png',
    gopuramCauseway: '/assets/aistudio/Gemini_Generated_Image_tbakuftbakuftbak_c9baa1f3.png',
    asuraLavaLocked: '/assets/aistudio/Gemini_Generated_Image_u58tfju58tfju58t_2d5d830a.png',
    asuraLavaUnlocked: '/assets/aistudio/Gemini_Generated_Image_8jz0rn8jz0rn8jz0_9c7ece82.png',
    bossSanctumPhase1: '/assets/aistudio/Gemini_Generated_Image_25mxvb25mxvb25mx_d4637a39.png',
    bossSanctumPhase2Eclipse: '/assets/aistudio/Gemini_Generated_Image_9sbc7m9sbc7m9sbc_0cf239b7.png',
  },

  // Hand-Painted VFX, Telegraphs, Slash Smears, Traps, Gates, Braziers & Overhangs (21 New Uploads)
  vfxSlash2x2: '/assets/aistudio/Gemini_Generated_Image_kwhb8qkwhb8qkwhb_adfa1bcf.png',
  groundDecals2x2: '/assets/aistudio/Gemini_Generated_Image_o86abro86abro86a_6a82a5ae.png',
  combatImpacts2x2: '/assets/aistudio/Gemini_Generated_Image_2n0p172n0p172n0p_4fba9427.png',
  floorTraps2x2: '/assets/aistudio/Gemini_Generated_Image_zhy8c6zhy8c6zhy8_5d2df495.png',
  brazierFlame4x1: '/assets/aistudio/Gemini_Generated_Image_vqynauvqynauvqyn_da9af05e.png',
  exitGateArchways2x1: '/assets/aistudio/Gemini_Generated_Image_gcf89kgcf89kgcf8_26c0ebb5.png',
  gateOverlays2x2: '/assets/aistudio/Gemini_Generated_Image_5bgscc5bgscc5bgs_07c760f9.png',
  rewardOrbs2x2: '/assets/aistudio/Gemini_Generated_Image_e4v7n9e4v7n9e4v7_05a48632.png',
  foregroundOverhangsA2x2: '/assets/aistudio/Gemini_Generated_Image_glxj9tglxj9tglxj_b076ead2.png',
  foregroundOverhangsB2x2: '/assets/aistudio/Gemini_Generated_Image_9eap7c9eap7c9eap_6d0dfd02.png',

  // 4-Frame & 2x2 Enemy Sprite Sheets (Combining Best Previous + New Uploads)
  enemySheets: {
    // New 4x1 & 2x2 Enemy Sheets
    sharabhaHoundSheet4x1: '/assets/aistudio/Gemini_Generated_Image_8u43ce8u43ce8u43_e8ea70fa.png',
    pretaBowmanSheet4x1: '/assets/aistudio/Gemini_Generated_Image_6669w66669w66669_7106b7d0.png',
    rakshasaMaceSheet4x1: '/assets/aistudio/Gemini_Generated_Image_uyv1euuyv1euuyv1_ae2bf117.png',
    kaliyugaAvatarSheet2x2: '/assets/aistudio/Gemini_Generated_Image_el5r51el5r51el5r_5da30179.png',
    // Previous High-Quality 4x1 Enemy Sheets
    vrikaStalkerSheet4x1: '/assets/aistudio/Gemini_Generated_Image_vw8zcgvw8zcgvw8z_043bf070.png',
    agniSpearmanSheet4x1: '/assets/aistudio/Gemini_Generated_Image_wixy9mwixy9mwixy_470e5e55.png',
    magmaGolemSheet4x1: '/assets/aistudio/Gemini_Generated_Image_v7t1y5v7t1y5v7t1_9158f9e8.png',
    furnaceColossusSheet4x1: '/assets/aistudio/Gemini_Generated_Image_uyv1euuyv1euuyv1_ae2bf117.png',
  },

  // 2.5D Y-Sorted Destructible Courtyard Props (Pure Black Background Set)
  kaliyugaProps: {
    kurukshetraPillar: '/assets/aistudio/Gemini_Generated_Image_9st0qa9st0qa9st0_64c7f4c4.png',
    pillarRubble: '/assets/aistudio/Gemini_Generated_Image_xp9eibxp9eibxp9e_197206c9.png',
    brahmashiraShrine: '/assets/aistudio/Gemini_Generated_Image_0s5bd90s5bd90s5b_eb1b75fb.png',
    brokenChariot: '/assets/aistudio/Gemini_Generated_Image_34fd4734fd4734fd_8d8139ae.png',
    vaitaraniBoat: '/assets/aistudio/Gemini_Generated_Image_m3h1j5m3h1j5m3h1_22a5a080.png',
  },

  // Fallback 2D Character Poses (Used only during initial 3D FBX load)
  rudra: {
    idle: '/assets/aistudio/Gemini_Generated_Image_f33z69f33z69f33z_23b04634.png',
    run: '/assets/aistudio/Gemini_Generated_Image_9w9v119w9v119w9v_27b7999c.png',
    slash1: '/assets/aistudio/Gemini_Generated_Image_8v7p198v7p198v7p_0f1b9b42.png',
    slash2: '/assets/aistudio/Gemini_Generated_Image_r1a3c2r1a3c2r1a3_b0b216b2.png',
    slam: '/assets/aistudio/Gemini_Generated_Image_x44z9mx44z9mx44z_9694f3a8.png',
    parry: '/assets/aistudio/Gemini_Generated_Image_f33z69f33z69f33z_23b04634.png',
    astra: '/assets/aistudio/Gemini_Generated_Image_8v7p198v7p198v7p_0f1b9b42.png',
    heal: '/assets/aistudio/Gemini_Generated_Image_f33z69f33z69f33z_23b04634.png',
    kneel: '/assets/aistudio/Gemini_Generated_Image_f33z69f33z69f33z_23b04634.png',
  },
  enemies: {
    vrikaIdle: '/assets/aistudio/Gemini_Generated_Image_vw8zcgvw8zcgvw8z_043bf070.png',
  },
  dundubhi: {
    idle: '/assets/aistudio/Gemini_Generated_Image_h0q899h0q899h0q8_c1f988fb.png',
    charge: '/assets/aistudio/Gemini_Generated_Image_h0q899h0q899h0q8_c1f988fb.png',
    roar: '/assets/aistudio/Gemini_Generated_Image_h0q899h0q899h0q8_c1f988fb.png',
  },
  vrikodara: {
    p1Idle: '/assets/aistudio/Gemini_Generated_Image_el5r51el5r51el5r_5da30179.png',
    p1Windup: '/assets/aistudio/Gemini_Generated_Image_el5r51el5r51el5r_5da30179.png',
    p1Slam: '/assets/aistudio/Gemini_Generated_Image_el5r51el5r51el5r_5da30179.png',
    p2Idle: '/assets/aistudio/Gemini_Generated_Image_el5r51el5r51el5r_5da30179.png',
    p2Sweep: '/assets/aistudio/Gemini_Generated_Image_el5r51el5r51el5r_5da30179.png',
    p2Kneel: '/assets/aistudio/Gemini_Generated_Image_el5r51el5r51el5r_5da30179.png',
  },
} as const;

export const CHAMBERS: ChamberSpec[] = [
  // ==========================================================================
  // CHAMBER I: VAITARANI RIVER GHAT (NEW HAND-PAINTED ARENA)
  // ==========================================================================
  {
    id: 1,
    chapterTitle: 'Act I · The Boiling Crossing',
    name: 'Vaitarani Ferry Ghat',
    chineseSubtitle: 'वैतरणी घाट · CHAMBER I OF VIII',
    strikethroughLie: '“The fallen heroes crossed into heaven upon golden lotus barges...”',
    sanjayaQuote:
      '“Lies! The Vaitarani boils with marrow and broken crowns. Sharabha hounds feast on the unburied.”',
    backgroundUrl: GAME_ASSETS.chambers.vaitaraniGhat,
    floorTint: 'rgba(22, 10, 12, 0.08)',
    isBossChamber: false,
    envEffect: 'blood_river',
    braziers: [
      { x: 0.24, y: 0.24, color: '#ff6a18', radius: 165 },
      { x: 0.76, y: 0.24, color: '#ff6a18', radius: 165 },
      { x: 0.20, y: 0.78, color: '#ff4218', radius: 175 },
      { x: 0.80, y: 0.78, color: '#ff4218', radius: 175 },
    ],
    props: [
      { type: 'incense_cauldron', x: 0.36, y: 0.42 },
      { type: 'pagoda_lantern', x: 0.64, y: 0.42 },
      { type: 'dragon_pillar', x: 0.50, y: 0.34 },
      { type: 'weapon_rack', x: 0.32, y: 0.68 },
    ],
    spawns: [
      // Wave 1: Sharabha Hellhounds + Vrika Stalkers + Agni Spearmen
      { type: 'wolf_guai', x: 0.56, y: 0.44, wave: 1 },
      { type: 'wolf_guai', x: 0.64, y: 0.58, wave: 1, delay: 0.3 },
      { type: 'fire_monk', x: 0.68, y: 0.48, wave: 1, delay: 0.6 },
      // Wave 2: Undead Preta Bowman + Armored Magma Golem
      { type: 'wolf_guai', x: 0.46, y: 0.38, wave: 2, trait: 'rakshasa_frenzy' },
      { type: 'fire_monk', x: 0.70, y: 0.42, wave: 2, delay: 0.3 },
      { type: 'stone_golem', x: 0.58, y: 0.62, wave: 2, delay: 0.5 },
    ],
  },

  // ==========================================================================
  // CHAMBER II: RAKTABIJA BLOOD-KUNDA COURTYARD (NEW HAND-PAINTED ARENA)
  // ==========================================================================
  {
    id: 2,
    chapterTitle: 'Act I · The Boiling Crossing',
    name: 'Raktabija Blood-Kunda',
    chineseSubtitle: 'रक्तबीज कुण्ड · CHAMBER II OF VIII',
    strikethroughLie: '“Sacred soma was poured into the temple cisterns at dawn...”',
    sanjayaQuote:
      '“Every drop spilled in this courtyard births another Preta bowman. Shatter the pillars to crush their ranks!”',
    backgroundUrl: GAME_ASSETS.chambers.raktabijaCourtyard,
    floorTint: 'rgba(24, 9, 12, 0.08)',
    isBossChamber: false,
    envEffect: 'blood_river',
    braziers: [
      { x: 0.25, y: 0.22, color: '#ff5218', radius: 170 },
      { x: 0.75, y: 0.22, color: '#ff5218', radius: 170 },
      { x: 0.22, y: 0.78, color: '#ff2a3a', radius: 180 },
      { x: 0.78, y: 0.78, color: '#ff2a3a', radius: 180 },
    ],
    props: [
      { type: 'dragon_pillar', x: 0.40, y: 0.42 },
      { type: 'dragon_pillar', x: 0.60, y: 0.42 },
      { type: 'incense_cauldron', x: 0.50, y: 0.64 },
      { type: 'weapon_rack', x: 0.68, y: 0.62 },
    ],
    spawns: [
      // Wave 1
      { type: 'fire_monk', x: 0.62, y: 0.40, wave: 1 },
      { type: 'fire_monk', x: 0.68, y: 0.58, wave: 1, delay: 0.3 },
      { type: 'stone_golem', x: 0.54, y: 0.52, wave: 1, delay: 0.4 },
      { type: 'wolf_guai', x: 0.48, y: 0.66, wave: 1, delay: 0.6 },
      // Wave 2
      { type: 'furnace_titan', x: 0.60, y: 0.48, wave: 2, trait: 'agni_aura' },
      { type: 'wolf_guai', x: 0.42, y: 0.40, wave: 2, delay: 0.3 },
      { type: 'fire_monk', x: 0.72, y: 0.52, wave: 2, delay: 0.5, trait: 'agni_aura' },
    ],
  },

  // ==========================================================================
  // CHAMBER III: KURUKSHETRA CHARIOT BONEFIELD (PREVIOUS FAN-FAVORITE ARENA)
  // ==========================================================================
  {
    id: 3,
    chapterTitle: 'Act I · The Boiling Crossing',
    name: 'Kurukshetra Chariot Pyre',
    chineseSubtitle: 'रथश्मशान · CHAMBER III OF VIII',
    strikethroughLie: '“Eighteen aksauhinis stood in gleaming golden formation...”',
    sanjayaQuote:
      '“The axles are fused with molten brass and bone. Rakshasa bruisers prowl the wreckage!”',
    backgroundUrl: GAME_ASSETS.chambers.chariotBonefield,
    floorTint: 'rgba(26, 12, 8, 0.08)',
    isBossChamber: false,
    envEffect: 'lava_fissures',
    braziers: [
      { x: 0.22, y: 0.26, color: '#ff7a18', radius: 175 },
      { x: 0.78, y: 0.26, color: '#ff7a18', radius: 175 },
      { x: 0.22, y: 0.76, color: '#ff5218', radius: 175 },
      { x: 0.78, y: 0.76, color: '#ff5218', radius: 175 },
    ],
    props: [
      { type: 'weapon_rack', x: 0.38, y: 0.40 },
      { type: 'incense_cauldron', x: 0.54, y: 0.46 },
      { type: 'dragon_pillar', x: 0.64, y: 0.38 },
      { type: 'pagoda_lantern', x: 0.44, y: 0.68 },
    ],
    spawns: [
      // Wave 1
      { type: 'stone_golem', x: 0.56, y: 0.46, wave: 1, trait: 'vajra_shield' },
      { type: 'wolf_guai', x: 0.64, y: 0.38, wave: 1, delay: 0.2 },
      { type: 'wolf_guai', x: 0.64, y: 0.62, wave: 1, delay: 0.4 },
      { type: 'fire_monk', x: 0.72, y: 0.50, wave: 1, delay: 0.6 },
      // Wave 2
      { type: 'furnace_titan', x: 0.58, y: 0.52, wave: 2 },
      { type: 'stone_golem', x: 0.46, y: 0.42, wave: 2, delay: 0.3 },
      { type: 'fire_monk', x: 0.70, y: 0.42, wave: 2, delay: 0.5, trait: 'agni_aura' },
    ],
  },

  // ==========================================================================
  // CHAMBER IV: ACT I MID-BOSS — 3D DUNDUBHI, THE WAR-DRUM BEHEMOTH
  // ==========================================================================
  {
    id: 4,
    chapterTitle: 'Act I Sovereign · The Bronze Behemoth',
    name: 'Mandapa of the War-Drum',
    chineseSubtitle: 'दुन्दुभि मण्डप · CHAMBER IV OF VIII (3D BOSS)',
    strikethroughLie: '“The temple bull bowed before the royal standard of Hastinapura...”',
    sanjayaQuote:
      '“Dundubhi’s Chola-bronze hide deflects raw steel! Bait his horn-charge into the Kurukshetra Pillars to crack his armor!”',
    backgroundUrl: GAME_ASSETS.chambers.warDrumColonnade,
    floorTint: 'rgba(24, 12, 8, 0.08)',
    isBossChamber: true,
    envEffect: 'lava_fissures',
    braziers: [
      { x: 0.20, y: 0.22, color: '#ff8a24', radius: 190 },
      { x: 0.80, y: 0.22, color: '#ff8a24', radius: 190 },
      { x: 0.20, y: 0.80, color: '#ff5218', radius: 190 },
      { x: 0.80, y: 0.80, color: '#ff5218', radius: 190 },
    ],
    props: [
      { type: 'dragon_pillar', x: 0.36, y: 0.38 },
      { type: 'dragon_pillar', x: 0.64, y: 0.38 },
      { type: 'dragon_pillar', x: 0.36, y: 0.68 },
      { type: 'dragon_pillar', x: 0.64, y: 0.68 },
      { type: 'incense_cauldron', x: 0.50, y: 0.28 },
    ],
    spawns: [{ type: 'xuemo', x: 0.64, y: 0.52, wave: 1 }],
  },

  // ==========================================================================
  // CHAMBER V: ASURA SOUL-FIRE SANCTUM (ACT II — CYAN SOUL-FIRE ARENA)
  // ==========================================================================
  {
    id: 5,
    chapterTitle: 'Act II · The Asura Inner Sanctum',
    name: 'Bhairava Soul-Fire Sanctum',
    chineseSubtitle: 'भैरव कुण्ड · CHAMBER V OF VIII',
    strikethroughLie: '“The sages meditated beside cool Himalayan springs...”',
    sanjayaQuote:
      '“Cold Bhairava soul-fire burns hotter than magma. Four-armed Kaliyuga Avatars guard the inner mandala!”',
    backgroundUrl: GAME_ASSETS.chambers.soulFireSanctum,
    floorTint: 'rgba(8, 22, 28, 0.08)',
    isBossChamber: false,
    envEffect: 'sacred_mist',
    braziers: [
      { x: 0.22, y: 0.24, color: '#38e8ff', radius: 180 },
      { x: 0.78, y: 0.24, color: '#38e8ff', radius: 180 },
      { x: 0.22, y: 0.78, color: '#ff6a18', radius: 175 },
      { x: 0.78, y: 0.78, color: '#ff6a18', radius: 175 },
    ],
    props: [
      { type: 'dragon_pillar', x: 0.42, y: 0.40 },
      { type: 'dragon_pillar', x: 0.58, y: 0.40 },
      { type: 'incense_cauldron', x: 0.50, y: 0.62 },
      { type: 'pagoda_lantern', x: 0.34, y: 0.64 },
    ],
    spawns: [
      // Wave 1: Kaliyuga Cosmic Avatar + Preta Bowmen + Sharabha Hounds
      { type: 'furnace_titan', x: 0.60, y: 0.48, wave: 1, trait: 'vajra_shield' },
      { type: 'fire_monk', x: 0.68, y: 0.38, wave: 1, delay: 0.25 },
      { type: 'fire_monk', x: 0.68, y: 0.62, wave: 1, delay: 0.45 },
      // Wave 2
      { type: 'stone_golem', x: 0.52, y: 0.44, wave: 2, trait: 'agni_aura' },
      { type: 'wolf_guai', x: 0.44, y: 0.60, wave: 2, delay: 0.2, trait: 'rakshasa_frenzy' },
      { type: 'wolf_guai', x: 0.66, y: 0.52, wave: 2, delay: 0.4, trait: 'rakshasa_frenzy' },
      { type: 'furnace_titan', x: 0.62, y: 0.50, wave: 2, delay: 0.6 },
    ],
  },

  // ==========================================================================
  // CHAMBER VI: SHATTERED GOPURAM CAUSEWAY (HIGH-INTENSITY TRAP GAUNTLET)
  // ==========================================================================
  {
    id: 6,
    chapterTitle: 'Act II · The Asura Inner Sanctum',
    name: 'Shattered Gopuram Causeway',
    chineseSubtitle: 'गोपुरम् सेतु · CHAMBER VI OF VIII',
    strikethroughLie: '“Pilgrims walked unharmed across the temple causeway...”',
    sanjayaQuote:
      '“Every flagstone is rigged with bloodied iron spikes and Agni lotus vents. Lure the Rakshasa bruisers onto the plates!”',
    backgroundUrl: GAME_ASSETS.chambers.gopuramCauseway,
    floorTint: 'rgba(24, 10, 10, 0.08)',
    isBossChamber: false,
    envEffect: 'lava_fissures',
    braziers: [
      { x: 0.24, y: 0.22, color: '#ff6a18', radius: 175 },
      { x: 0.76, y: 0.22, color: '#ff6a18', radius: 175 },
      { x: 0.24, y: 0.80, color: '#ff2a3a', radius: 175 },
      { x: 0.76, y: 0.80, color: '#ff2a3a', radius: 175 },
    ],
    props: [
      { type: 'incense_cauldron', x: 0.44, y: 0.44 },
      { type: 'incense_cauldron', x: 0.58, y: 0.58 },
      { type: 'dragon_pillar', x: 0.52, y: 0.36 },
      { type: 'weapon_rack', x: 0.36, y: 0.64 },
    ],
    spawns: [
      // Wave 1
      { type: 'stone_golem', x: 0.54, y: 0.44, wave: 1, trait: 'vajra_shield' },
      { type: 'stone_golem', x: 0.62, y: 0.58, wave: 1, delay: 0.3 },
      { type: 'fire_monk', x: 0.70, y: 0.46, wave: 1, delay: 0.5, trait: 'agni_aura' },
      // Wave 2
      { type: 'furnace_titan', x: 0.58, y: 0.50, wave: 2, trait: 'rakshasa_frenzy' },
      { type: 'wolf_guai', x: 0.46, y: 0.38, wave: 2, delay: 0.25, trait: 'rakshasa_frenzy' },
      { type: 'wolf_guai', x: 0.46, y: 0.66, wave: 2, delay: 0.45 },
      { type: 'fire_monk', x: 0.72, y: 0.54, wave: 2, delay: 0.6 },
    ],
  },

  // ==========================================================================
  // CHAMBER VII: ASURA LAVA SANCTUM (LOCKED -> UNLOCKED LIVE GATE TRANSITION!)
  // ==========================================================================
  {
    id: 7,
    chapterTitle: 'Act II · Threshold of the Sovereign',
    name: 'Sealed Gate of Jatharagni',
    chineseSubtitle: 'जाठराग्नि द्वार · CHAMBER VII OF VIII',
    strikethroughLie: '“The golden gates of the sanctum opened to welcome the peacemakers...”',
    sanjayaQuote:
      '“Golden chains and an Om padlock bind Vrikodara’s threshold! Slaughter the Royal Asura Guard to shatter the seal!”',
    backgroundUrl: GAME_ASSETS.chambers.asuraLavaLocked,
    unlockedBackgroundUrl: GAME_ASSETS.chambers.asuraLavaUnlocked,
    floorTint: 'rgba(26, 10, 8, 0.06)',
    isBossChamber: false,
    envEffect: 'lava_fissures',
    braziers: [
      { x: 0.20, y: 0.26, color: '#ff7a18', radius: 185 },
      { x: 0.80, y: 0.26, color: '#ff7a18', radius: 185 },
      { x: 0.18, y: 0.74, color: '#ff5218', radius: 185 },
      { x: 0.82, y: 0.74, color: '#ff5218', radius: 185 },
    ],
    props: [
      { type: 'dragon_pillar', x: 0.38, y: 0.42 },
      { type: 'dragon_pillar', x: 0.62, y: 0.42 },
      { type: 'incense_cauldron', x: 0.50, y: 0.54 },
      { type: 'pagoda_lantern', x: 0.38, y: 0.68 },
      { type: 'weapon_rack', x: 0.62, y: 0.68 },
    ],
    spawns: [
      // Wave 1
      { type: 'furnace_titan', x: 0.56, y: 0.46, wave: 1, trait: 'agni_aura' },
      { type: 'stone_golem', x: 0.64, y: 0.60, wave: 1, delay: 0.25, trait: 'vajra_shield' },
      { type: 'fire_monk', x: 0.70, y: 0.40, wave: 1, delay: 0.45 },
      // Wave 2
      { type: 'furnace_titan', x: 0.52, y: 0.44, wave: 2, trait: 'vajra_shield' },
      { type: 'furnace_titan', x: 0.64, y: 0.56, wave: 2, delay: 0.35, trait: 'rakshasa_frenzy' },
      { type: 'wolf_guai', x: 0.44, y: 0.58, wave: 2, delay: 0.5, trait: 'rakshasa_frenzy' },
      { type: 'fire_monk', x: 0.72, y: 0.50, wave: 2, delay: 0.65, trait: 'agni_aura' },
    ],
  },

  // ==========================================================================
  // CHAMBER VIII: FINAL BOSS — 3D VRIKODARA (PHASE 1 NAGA -> PHASE 2 ECLIPSE!)
  // ==========================================================================
  {
    id: 8,
    chapterTitle: 'Final Sovereign · The Bleeding Crown',
    name: 'Sanctum of the Infernal Maw',
    chineseSubtitle: 'वृकोदर गर्भगृह · CHAMBER VIII OF VIII (FINAL 3D BOSS)',
    strikethroughLie: '“And the righteous Pandava general laid down his mace in peace...”',
    sanjayaQuote:
      '“Behold Vrikodara! Ten thousand chariots burn inside his abdominal furnace—and when the blood-eclipse rises, his twin Tridents tear the cosmos!”',
    backgroundUrl: GAME_ASSETS.chambers.bossSanctumPhase1,
    phase2BackgroundUrl: GAME_ASSETS.chambers.bossSanctumPhase2Eclipse,
    floorTint: 'rgba(22, 6, 10, 0.06)',
    isBossChamber: true,
    envEffect: 'eclipse_wind',
    braziers: [
      { x: 0.20, y: 0.22, color: '#38e8ff', radius: 195 },
      { x: 0.80, y: 0.22, color: '#38e8ff', radius: 195 },
      { x: 0.16, y: 0.54, color: '#ff2a3a', radius: 195 },
      { x: 0.84, y: 0.54, color: '#ff2a3a', radius: 195 },
      { x: 0.24, y: 0.82, color: '#ff6a18', radius: 195 },
      { x: 0.76, y: 0.82, color: '#ff6a18', radius: 195 },
    ],
    props: [
      { type: 'dragon_pillar', x: 0.36, y: 0.36 },
      { type: 'dragon_pillar', x: 0.64, y: 0.36 },
      { type: 'dragon_pillar', x: 0.36, y: 0.68 },
      { type: 'dragon_pillar', x: 0.64, y: 0.68 },
      { type: 'incense_cauldron', x: 0.50, y: 0.30 },
    ],
    spawns: [{ type: 'vrikodara', x: 0.64, y: 0.52, wave: 1 }],
  },
];
