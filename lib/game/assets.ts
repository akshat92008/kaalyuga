export type PropType = 'incense_cauldron' | 'pagoda_lantern' | 'weapon_rack' | 'dragon_pillar';

export interface ChamberPropSpec {
  type: PropType;
  x: number;
  y: number;
}

export interface ChamberSpec {
  id: number;
  chapter: number;
  chapterTitle: string;
  chineseSubtitle: string;
  name: string;
  subtitle: string;
  backgroundUrl: string;
  ambientHue: string;
  lanternColor: string;
  floorTint: string;
  isBossChamber: boolean;
  bossId?: 'xuemo' | 'tiger_vanguard';
  braziers: Array<{ x: number; y: number; color: string; radius: number }>;
  props: ChamberPropSpec[];
  spawns: Array<{
    type: 'wolf_guai' | 'fire_monk' | 'stone_golem' | 'furnace_titan' | 'xuemo' | 'tiger_vanguard';
    x: number;
    y: number;
    delay?: number;
  }>;
}

export const GAME_ASSETS = {
  titleBackdrop: '/assets/aistudio/Gemini_Generated_Image_ey07c4ey07c4ey07_1de21fb8.png',
  shrineBackdrop: '/assets/aistudio/Gemini_Generated_Image_vjfugjvjfugjvjfu_d880974a.png',
  wukongHeroCutout: '/assets/aistudio/Ashen_Warrior_with_Weathered_Sword_d61d6072.png',
  wukongPortrait: '/assets/aistudio/Wounded_Warrior_with_Bloodied_Greatsword_43996349.png',
  divineTrio: '/assets/aistudio/Gemini_Generated_Image_1zhpc51zhpc51zhp_b2abd8b8.jpeg',
  weaponsArt: '/assets/aistudio/Mythic_Trishula_War_Axe_6e39d1d1.png',
  parashuAxeArt: '/assets/aistudio/Mythic_Trishula_War_Axe_6e39d1d1.png',
  models: {
    rudraBipedFbx:
      '/models/Meshy_AI_Ashen_Warborn_biped/Meshy_AI_Ashen_Warborn_biped_Meshy_Merged_Animations.fbx',
    parashuAxeFbx:
      '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.fbx',
  },
  spellsVfxSheet: '/assets/aistudio/Gemini_Generated_Image_smm68fsmm68fsmm6_cc64e922.png',
  magmaCraterDecal: '/assets/aistudio/Gemini_Generated_Image_42ht5k42ht5k42ht_d2fecf3a.png',
  fireSlashVfx: '/assets/aistudio/Gemini_Generated_Image_a51igxa51igxa51i_b0633fb2.png',
  groundDecals2x2: '/assets/aistudio/Gemini_Generated_Image_96efot96efot96ef_92a05ba5.png',
  courtyardProps2x2: '/assets/aistudio/Gemini_Generated_Image_9j4sbw9j4sbw9j4s_cba93b51.png',
  wukongAction2x2: '/assets/aistudio/Gemini_Generated_Image_f9tq97f9tq97f9tq_cf95a1d1.png',

  // ============================================================================
  // KALIYUGA: THE BLEEDING CROWN — BESPOKE CHAPTER 1 VERTICAL SLICE ASSETS (32)
  // ============================================================================
  rudra: {
    idle: '/assets/aistudio/Ashen_Warrior_with_Weathered_Sword_d61d6072.png',
    run: '/assets/aistudio/Fierce_Warrior_s_Leaping_Strike_0fc5a149.png',
    slash1: '/assets/aistudio/Bloodied_Warrior_s_Greatblade_Slash_e905f195.png',
    slash2: '/assets/aistudio/Ashen_Warrior_with_Bloodied_Greatsword_a86e8491.png',
    slam: '/assets/aistudio/Fierce_Warrior_s_Downward_Strike_a4598509.png',
    parry: '/assets/aistudio/Bloodied_Greatsword_Warrior_in_a_Defensive_Stance_137c9bf8.png',
    astra: '/assets/aistudio/Flaming_Archer_of_the_White_Realm_8f79ff3f.png',
    heal: '/assets/aistudio/Ash-Bound_Warrior_s_Golden_Draught_4475748f.png',
    kneel: '/assets/aistudio/Battle-Worn_Warrior_Kneeling_on_His_Sword_55ca9257.png',
    portrait: '/assets/aistudio/Wounded_Warrior_with_Bloodied_Greatsword_43996349.png',
  },
  enemies: {
    ashSoldierIdle: '/assets/aistudio/Undead_Hoplite_with_Shield_and_Spear_efb9ec93.png',
    ashSoldierAttack: '/assets/aistudio/Skeletal_Spartan_Warrior_s_Final_Charge_13bdab13.png',
    ashArcherIdle: '/assets/aistudio/Tattered_Bronze_Masked_Undead_Archer_d55f2765.png',
    ashArcherDraw: '/assets/aistudio/Ember-Tipped_Masked_Archer_e5272586.png',
    pyreHoundLeap: '/assets/aistudio/Embermaw_Hellhound_in_Mid_Pounce_715176d8.png',
  },
  dundubhi: {
    idle: '/assets/aistudio/Verdigris_Bull_Demon_with_Bell_Mace_51bd3b26.png',
    roar: '/assets/aistudio/Roaring_Bronze_Bell_Minotaur_0d97e19d.png',
    charge: '/assets/aistudio/Charging_Minotaur_War-Beast_3b2464b3.png',
  },
  vrikodara: {
    p1Idle: '/assets/aistudio/Chainbound_Colossus_with_Temple_Pillar_40bd9fc3.png',
    p1Windup: '/assets/aistudio/Molten_Oni_Warlord_s_Colossal_Smash_c47d103f.png',
    p1Slam: '/assets/aistudio/Oni_Warlord_Shattering_a_Stone_Pillar_66380889.png',
    p2Idle: '/assets/aistudio/Wounded_Titan_Clinging_to_Ruin_f7c846b6.png',
    p2Sweep: '/assets/aistudio/Grim_Berserker_Swinging_Stone_Club_41477911.png',
    p2Kneel: '/assets/aistudio/Defeated_Giant_Beside_a_Broken_Pillar_c0a6156e.png',
  },
  kaliyugaProps: {
    kurukshetraPillar: '/assets/aistudio/Gemini_Generated_Image_9st0qa9st0qa9st0_64c7f4c4.png',
    pillarRubble: '/assets/aistudio/Gemini_Generated_Image_xp9eibxp9eibxp9e_197206c9.png',
    brokenChariot: '/assets/aistudio/Gemini_Generated_Image_w6hzmyw6hzmyw6hz_4319bd25.png',
    vaitaraniBoat: '/assets/aistudio/Gemini_Generated_Image_x8gt5lx8gt5lx8gt_225a8aa8.png',
    brahmashiraShrine: '/assets/aistudio/Gemini_Generated_Image_rc1gsbrc1gsbrc1g_d88016ca.png',
  },
  arenas: {
    vaitaraniRiver: '/assets/aistudio/Gemini_Generated_Image_vjfugjvjfugjvjfu_d880974a.png',
    charnelPlains: '/assets/aistudio/Gemini_Generated_Image_ey07c4ey07c4ey07_1de21fb8.png',
    shishiraCamp: '/assets/aistudio/Gemini_Generated_Image_acbxb7acbxb7acbx_9e34bd2e.png',
  },

  sprites: {
    wukongGold: '/assets/aistudio/Ashen_Warrior_with_Weathered_Sword_d61d6072.png',
    wukongBlue: '/assets/aistudio/Fierce_Warrior_s_Leaping_Strike_0fc5a149.png',
    wolfGuai: '/assets/aistudio/Embermaw_Hellhound_in_Mid_Pounce_715176d8.png',
    fireMonk: '/assets/aistudio/Tattered_Bronze_Masked_Undead_Archer_d55f2765.png',
    stoneGolem: '/assets/aistudio/Undead_Hoplite_with_Shield_and_Spear_efb9ec93.png',
    furnaceTitan: '/assets/aistudio/Verdigris_Bull_Demon_with_Bell_Mace_51bd3b26.png',
    xuemoPhases: '/assets/aistudio/Verdigris_Bull_Demon_with_Bell_Mace_51bd3b26.png',
    xuemoPhase3: '/assets/aistudio/Roaring_Bronze_Bell_Minotaur_0d97e19d.png',
    tigerSheet: '/assets/aistudio/Chainbound_Colossus_with_Temple_Pillar_40bd9fc3.png',
    tigerSlash: '/assets/aistudio/Oni_Warlord_Shattering_a_Stone_Pillar_66380889.png',
    tigerRoar: '/assets/aistudio/Molten_Oni_Warlord_s_Colossal_Smash_c47d103f.png',
  },
} as const;

export const CHAMBERS: ChamberSpec[] = [
  {
    id: 1,
    chapter: 1,
    chapterTitle: 'Chapter I: Kurukshetra — The Bleeding Crown',
    chineseSubtitle: 'ACT I · SHORES OF THE VAITARANI RIVER',
    name: 'VAITARANI FERRY LANDING',
    subtitle: 'Savitri’s Blood-River Dock · First Wave of the Restless Dead',
    backgroundUrl: '/assets/aistudio/Gemini_Generated_Image_vjfugjvjfugjvjfu_d880974a.png',
    ambientHue: '#ff7b29',
    lanternColor: '#ff521b',
    floorTint: 'rgba(255, 110, 35, 0.08)',
    isBossChamber: false,
    braziers: [
      { x: 0.22, y: 0.37, color: '#ff7b24', radius: 165 },
      { x: 0.46, y: 0.21, color: '#ff8528', radius: 155 },
      { x: 0.71, y: 0.81, color: '#ff661a', radius: 170 },
      { x: 0.89, y: 0.59, color: '#ff7b24', radius: 150 },
    ],
    props: [
      { type: 'incense_cauldron', x: 0.27, y: 0.40 },
      { type: 'pagoda_lantern', x: 0.32, y: 0.68 },
      { type: 'dragon_pillar', x: 0.48, y: 0.33 },
      { type: 'dragon_pillar', x: 0.70, y: 0.62 },
      { type: 'weapon_rack', x: 0.62, y: 0.36 },
    ],
    spawns: [
      { type: 'wolf_guai', x: 0.54, y: 0.44 },
      { type: 'stone_golem', x: 0.62, y: 0.58 },
      { type: 'wolf_guai', x: 0.68, y: 0.46, delay: 2.2 },
      { type: 'stone_golem', x: 0.58, y: 0.66, delay: 3.4 },
    ],
  },
  {
    id: 2,
    chapter: 1,
    chapterTitle: 'Chapter I: Kurukshetra — The Bleeding Crown',
    chineseSubtitle: 'ACT I · REED-BANKS OF THE ASHEN TIDE',
    name: 'DROWNED CHARIOT SHALLOWS',
    subtitle: 'Sunken War-Banners · Bone-Archer Crossfire',
    backgroundUrl: '/assets/aistudio/Gemini_Generated_Image_vjfugjvjfugjvjfu_d880974a.png',
    ambientHue: '#ff6e24',
    lanternColor: '#ff521b',
    floorTint: 'rgba(235, 95, 35, 0.08)',
    isBossChamber: false,
    braziers: [
      { x: 0.24, y: 0.32, color: '#ff7b24', radius: 160 },
      { x: 0.76, y: 0.28, color: '#ff8528', radius: 165 },
      { x: 0.72, y: 0.78, color: '#ff661a', radius: 165 },
    ],
    props: [
      { type: 'weapon_rack', x: 0.30, y: 0.38 },
      { type: 'dragon_pillar', x: 0.50, y: 0.32 },
      { type: 'pagoda_lantern', x: 0.34, y: 0.70 },
      { type: 'dragon_pillar', x: 0.70, y: 0.66 },
    ],
    spawns: [
      { type: 'stone_golem', x: 0.52, y: 0.48 },
      { type: 'fire_monk', x: 0.72, y: 0.38 },
      { type: 'wolf_guai', x: 0.60, y: 0.64 },
      { type: 'fire_monk', x: 0.74, y: 0.66, delay: 3.2 },
      { type: 'stone_golem', x: 0.58, y: 0.52, delay: 4.5 },
    ],
  },
  {
    id: 3,
    chapter: 1,
    chapterTitle: 'Chapter I: Kurukshetra — The Bleeding Crown',
    chineseSubtitle: 'ACT I · THE CORPSE-MIST RAVINE',
    name: 'FOG OF BROKEN VOWS',
    subtitle: 'Sarama Hellhound Pack · Savitri’s Lantern Trail',
    backgroundUrl: '/assets/aistudio/Gemini_Generated_Image_ey07c4ey07c4ey07_1de21fb8.png',
    ambientHue: '#ff6829',
    lanternColor: '#ff521b',
    floorTint: 'rgba(215, 95, 35, 0.09)',
    isBossChamber: false,
    braziers: [
      { x: 0.59, y: 0.20, color: '#ff6d1f', radius: 165 },
      { x: 0.89, y: 0.44, color: '#ff7d26', radius: 160 },
      { x: 0.79, y: 0.86, color: '#ff5a1a', radius: 170 },
    ],
    props: [
      { type: 'pagoda_lantern', x: 0.28, y: 0.38 },
      { type: 'dragon_pillar', x: 0.48, y: 0.31 },
      { type: 'weapon_rack', x: 0.69, y: 0.36 },
      { type: 'incense_cauldron', x: 0.31, y: 0.69 },
      { type: 'dragon_pillar', x: 0.72, y: 0.70 },
    ],
    spawns: [
      { type: 'wolf_guai', x: 0.50, y: 0.42 },
      { type: 'wolf_guai', x: 0.56, y: 0.64 },
      { type: 'fire_monk', x: 0.72, y: 0.48 },
      { type: 'stone_golem', x: 0.62, y: 0.52, delay: 3.5 },
      { type: 'wolf_guai', x: 0.68, y: 0.38, delay: 4.8 },
      { type: 'fire_monk', x: 0.75, y: 0.66, delay: 5.5 },
    ],
  },
  {
    id: 4,
    chapter: 1,
    chapterTitle: 'Chapter I: Kurukshetra — The Bleeding Crown',
    chineseSubtitle: 'ACT I · THE CHARNEL PLAINS OF KURUKSHETRA',
    name: 'ELEPHANT GRAVEYARD TRENCHES',
    subtitle: 'Bleached Tusk Barricades · Kuru Phalanx & Bell Juggernaut',
    backgroundUrl: '/assets/aistudio/Gemini_Generated_Image_ey07c4ey07c4ey07_1de21fb8.png',
    ambientHue: '#ff5e22',
    lanternColor: '#ff521b',
    floorTint: 'rgba(225, 85, 30, 0.09)',
    isBossChamber: false,
    braziers: [
      { x: 0.55, y: 0.22, color: '#ff6d1f', radius: 165 },
      { x: 0.86, y: 0.46, color: '#ff7d26', radius: 160 },
      { x: 0.76, y: 0.84, color: '#ff5a1a', radius: 170 },
    ],
    props: [
      { type: 'weapon_rack', x: 0.29, y: 0.36 },
      { type: 'dragon_pillar', x: 0.49, y: 0.32 },
      { type: 'dragon_pillar', x: 0.69, y: 0.36 },
      { type: 'incense_cauldron', x: 0.32, y: 0.70 },
      { type: 'dragon_pillar', x: 0.71, y: 0.70 },
    ],
    spawns: [
      { type: 'stone_golem', x: 0.52, y: 0.46 },
      { type: 'stone_golem', x: 0.54, y: 0.62 },
      { type: 'fire_monk', x: 0.72, y: 0.42 },
      { type: 'furnace_titan', x: 0.64, y: 0.52, delay: 3.0 },
      { type: 'wolf_guai', x: 0.68, y: 0.66, delay: 4.5 },
    ],
  },
  {
    id: 5,
    chapter: 1,
    chapterTitle: 'Chapter I Mini-Boss · The War-Drum Behemoth',
    chineseSubtitle: 'DUNDUBHI · BAIT HIS CHARGE INTO PILLARS TO CRACK ARMOR!',
    name: 'COURTYARD OF THE WAR-DRUM',
    subtitle: '3D Mini-Boss Encounter · Bait Charge Into Basalt Pillars to Shatter His Drum-Chest',
    backgroundUrl: '/assets/aistudio/Gemini_Generated_Image_ey07c4ey07c4ey07_1de21fb8.png',
    ambientHue: '#ff4219',
    lanternColor: '#ff6a1a',
    floorTint: 'rgba(235, 75, 25, 0.11)',
    isBossChamber: true,
    bossId: 'xuemo',
    braziers: [
      { x: 0.59, y: 0.20, color: '#ff6d1f', radius: 175 },
      { x: 0.89, y: 0.44, color: '#ff7d26', radius: 175 },
      { x: 0.79, y: 0.86, color: '#ff6d1f', radius: 175 },
      { x: 0.25, y: 0.75, color: '#ff551a', radius: 155 },
    ],
    props: [
      { type: 'dragon_pillar', x: 0.32, y: 0.36 },
      { type: 'dragon_pillar', x: 0.68, y: 0.36 },
      { type: 'dragon_pillar', x: 0.32, y: 0.70 },
      { type: 'dragon_pillar', x: 0.68, y: 0.70 },
      { type: 'incense_cauldron', x: 0.50, y: 0.26 },
    ],
    spawns: [
      { type: 'xuemo', x: 0.58, y: 0.50 },
    ],
  },
  {
    id: 6,
    chapter: 1,
    chapterTitle: 'Chapter I: Edge of the Scorched Tents',
    chineseSubtitle: 'ACT II · OUTER PERIMETER OF SHISHIRA',
    name: 'ASH-CHOKED MEDICINAL GROVE',
    subtitle: 'Where the Brahmashira Sky-Fire First Touched Earth',
    backgroundUrl: '/assets/aistudio/Gemini_Generated_Image_acbxb7acbxb7acbx_9e34bd2e.png',
    ambientHue: '#ff9636',
    lanternColor: '#ff8024',
    floorTint: 'rgba(255, 130, 45, 0.09)',
    isBossChamber: false,
    braziers: [
      { x: 0.50, y: 0.16, color: '#ffbe44', radius: 210 },
      { x: 0.22, y: 0.38, color: '#ff8024', radius: 165 },
      { x: 0.82, y: 0.44, color: '#ff6d1f', radius: 175 },
    ],
    props: [
      { type: 'incense_cauldron', x: 0.30, y: 0.42 },
      { type: 'pagoda_lantern', x: 0.48, y: 0.34 },
      { type: 'weapon_rack', x: 0.66, y: 0.38 },
      { type: 'dragon_pillar', x: 0.68, y: 0.68 },
    ],
    spawns: [
      { type: 'wolf_guai', x: 0.52, y: 0.45 },
      { type: 'fire_monk', x: 0.68, y: 0.42 },
      { type: 'stone_golem', x: 0.58, y: 0.62 },
      { type: 'wolf_guai', x: 0.64, y: 0.66, delay: 3.0 },
      { type: 'stone_golem', x: 0.72, y: 0.52, delay: 4.2 },
    ],
  },
  {
    id: 7,
    chapter: 1,
    chapterTitle: 'Chapter I: Memory of the Night of Ash',
    chineseSubtitle: 'ACT II · SHISHIRA HEALER CAMP IN FLAMES',
    name: 'BURNING SHISHIRA ENCAMPMENT',
    subtitle: 'Overturned Herb Tables & Bandage Tents · Multi-Wave Ambush',
    backgroundUrl: '/assets/aistudio/Gemini_Generated_Image_acbxb7acbxb7acbx_9e34bd2e.png',
    ambientHue: '#ff9636',
    lanternColor: '#ff8024',
    floorTint: 'rgba(255, 130, 45, 0.10)',
    isBossChamber: false,
    braziers: [
      { x: 0.50, y: 0.16, color: '#ffbe44', radius: 220 },
      { x: 0.22, y: 0.38, color: '#ff8024', radius: 165 },
      { x: 0.82, y: 0.44, color: '#ff6d1f', radius: 175 },
      { x: 0.88, y: 0.76, color: '#ff8024', radius: 165 },
    ],
    props: [
      { type: 'weapon_rack', x: 0.31, y: 0.40 },
      { type: 'dragon_pillar', x: 0.52, y: 0.34 },
      { type: 'incense_cauldron', x: 0.34, y: 0.71 },
      { type: 'weapon_rack', x: 0.68, y: 0.72 },
    ],
    spawns: [
      { type: 'fire_monk', x: 0.58, y: 0.44 },
      { type: 'fire_monk', x: 0.68, y: 0.64 },
      { type: 'wolf_guai', x: 0.48, y: 0.62 },
      { type: 'stone_golem', x: 0.60, y: 0.52, delay: 2.8 },
      { type: 'furnace_titan', x: 0.70, y: 0.50, delay: 4.5 },
      { type: 'wolf_guai', x: 0.54, y: 0.38, delay: 5.2 },
    ],
  },
  {
    id: 8,
    chapter: 1,
    chapterTitle: 'Chapter I: The Unlit Oil Lamp',
    chineseSubtitle: 'ACT II · INNER WARD OF THE HEALERS',
    name: 'COURTYARD OF SILENT CRADLES',
    subtitle: 'Charred Stretchers & Broken Shields · Elite Vanguard Siege',
    backgroundUrl: '/assets/aistudio/Gemini_Generated_Image_acbxb7acbxb7acbx_9e34bd2e.png',
    ambientHue: '#ff8429',
    lanternColor: '#ff701f',
    floorTint: 'rgba(245, 110, 40, 0.10)',
    isBossChamber: false,
    braziers: [
      { x: 0.48, y: 0.18, color: '#ffbe44', radius: 210 },
      { x: 0.25, y: 0.42, color: '#ff8024', radius: 165 },
      { x: 0.80, y: 0.74, color: '#ff6d1f', radius: 175 },
    ],
    props: [
      { type: 'pagoda_lantern', x: 0.30, y: 0.38 },
      { type: 'dragon_pillar', x: 0.50, y: 0.33 },
      { type: 'dragon_pillar', x: 0.70, y: 0.38 },
      { type: 'incense_cauldron', x: 0.50, y: 0.72 },
    ],
    spawns: [
      { type: 'stone_golem', x: 0.52, y: 0.44 },
      { type: 'furnace_titan', x: 0.64, y: 0.54 },
      { type: 'fire_monk', x: 0.74, y: 0.40 },
      { type: 'stone_golem', x: 0.58, y: 0.66, delay: 3.2 },
      { type: 'fire_monk', x: 0.72, y: 0.68, delay: 4.4 },
      { type: 'wolf_guai', x: 0.48, y: 0.58, delay: 5.4 },
    ],
  },
  {
    id: 9,
    chapter: 1,
    chapterTitle: 'Chapter I: Ascent to the Slag-Forge',
    chineseSubtitle: 'ACT III · STEPS OF MELTED BRONZE',
    name: 'CAULDRON CAUSEWAY',
    subtitle: 'Rivers of Molten Iron · Heavy Asura Garrison',
    backgroundUrl: '/assets/aistudio/Gemini_Generated_Image_vjfugjvjfugjvjfu_d880974a.png',
    ambientHue: '#ff5524',
    lanternColor: '#ff3b1c',
    floorTint: 'rgba(255, 75, 35, 0.10)',
    isBossChamber: false,
    braziers: [
      { x: 0.22, y: 0.37, color: '#ff6422', radius: 165 },
      { x: 0.50, y: 0.26, color: '#ff6422', radius: 165 },
      { x: 0.74, y: 0.80, color: '#ff6422', radius: 170 },
    ],
    props: [
      { type: 'dragon_pillar', x: 0.30, y: 0.36 },
      { type: 'incense_cauldron', x: 0.50, y: 0.32 },
      { type: 'dragon_pillar', x: 0.70, y: 0.36 },
      { type: 'weapon_rack', x: 0.32, y: 0.70 },
      { type: 'dragon_pillar', x: 0.70, y: 0.70 },
    ],
    spawns: [
      { type: 'furnace_titan', x: 0.56, y: 0.48 },
      { type: 'fire_monk', x: 0.72, y: 0.38 },
      { type: 'fire_monk', x: 0.72, y: 0.66 },
      { type: 'stone_golem', x: 0.52, y: 0.64, delay: 3.0 },
      { type: 'furnace_titan', x: 0.66, y: 0.52, delay: 4.8 },
    ],
  },
  {
    id: 10,
    chapter: 1,
    chapterTitle: 'Chapter I: Gates of the Iron Sanctuary',
    chineseSubtitle: 'ACT III · DEFILED TEMPLE STEPS',
    name: 'SANCTUARY OF BROKEN OATHS',
    subtitle: 'Outer Threshold of Vrikodara’s Cave Refuge · Three-Wave Gauntlet',
    backgroundUrl: '/assets/aistudio/Gemini_Generated_Image_vjfugjvjfugjvjfu_d880974a.png',
    ambientHue: '#ff4726',
    lanternColor: '#ff2b1c',
    floorTint: 'rgba(255, 65, 35, 0.10)',
    isBossChamber: false,
    braziers: [
      { x: 0.22, y: 0.37, color: '#ff6422', radius: 160 },
      { x: 0.50, y: 0.28, color: '#ff6422', radius: 155 },
      { x: 0.71, y: 0.81, color: '#ff6422', radius: 165 },
      { x: 0.88, y: 0.58, color: '#ff6422', radius: 150 },
    ],
    props: [
      { type: 'dragon_pillar', x: 0.28, y: 0.37 },
      { type: 'incense_cauldron', x: 0.49, y: 0.32 },
      { type: 'dragon_pillar', x: 0.72, y: 0.37 },
      { type: 'weapon_rack', x: 0.29, y: 0.71 },
      { type: 'pagoda_lantern', x: 0.73, y: 0.72 },
    ],
    spawns: [
      { type: 'stone_golem', x: 0.54, y: 0.46 },
      { type: 'stone_golem', x: 0.56, y: 0.66 },
      { type: 'fire_monk', x: 0.72, y: 0.56 },
      { type: 'wolf_guai', x: 0.46, y: 0.44, delay: 2.6 },
      { type: 'furnace_titan', x: 0.64, y: 0.42, delay: 4.2 },
      { type: 'furnace_titan', x: 0.66, y: 0.64, delay: 6.0 },
    ],
  },
  {
    id: 11,
    chapter: 1,
    chapterTitle: 'Chapter I: The Starving Gatehouse',
    chineseSubtitle: 'ACT III · ANTECHAMBER OF THE IRON RAKSHASA',
    name: 'HALL OF CHAINED PILLARS',
    subtitle: 'Final Royal Guard Phalanx Before the Sovereign’s Seat',
    backgroundUrl: '/assets/aistudio/Gemini_Generated_Image_ey07c4ey07c4ey07_1de21fb8.png',
    ambientHue: '#ff3b1f',
    lanternColor: '#ff4d1a',
    floorTint: 'rgba(230, 50, 25, 0.11)',
    isBossChamber: false,
    braziers: [
      { x: 0.58, y: 0.20, color: '#ff6d1f', radius: 175 },
      { x: 0.88, y: 0.44, color: '#ff7d26', radius: 175 },
      { x: 0.78, y: 0.84, color: '#ff551a', radius: 170 },
    ],
    props: [
      { type: 'dragon_pillar', x: 0.30, y: 0.35 },
      { type: 'dragon_pillar', x: 0.70, y: 0.35 },
      { type: 'incense_cauldron', x: 0.50, y: 0.50 },
      { type: 'dragon_pillar', x: 0.30, y: 0.72 },
      { type: 'dragon_pillar', x: 0.70, y: 0.72 },
    ],
    spawns: [
      { type: 'furnace_titan', x: 0.56, y: 0.44 },
      { type: 'stone_golem', x: 0.52, y: 0.64 },
      { type: 'fire_monk', x: 0.74, y: 0.42 },
      { type: 'fire_monk', x: 0.74, y: 0.66 },
      { type: 'wolf_guai', x: 0.62, y: 0.38, delay: 3.2 },
      { type: 'furnace_titan', x: 0.66, y: 0.56, delay: 5.0 },
    ],
  },
  {
    id: 12,
    chapter: 1,
    chapterTitle: 'Chapter I Sovereign · Seat of Insatiable Hunger',
    chineseSubtitle: 'VRIKODARA · THE IRON RAKSHASA (3D SOVEREIGN)',
    name: 'THE IRON SANCTUARY',
    subtitle: 'Phase 1: Chained Pillars & Vacuum Maw · Phase 2: Molten Slag Overdrive',
    backgroundUrl: '/assets/aistudio/Gemini_Generated_Image_ey07c4ey07c4ey07_1de21fb8.png',
    ambientHue: '#ff8a36',
    lanternColor: '#ff9838',
    floorTint: 'rgba(210, 45, 25, 0.12)',
    isBossChamber: true,
    bossId: 'tiger_vanguard',
    braziers: [
      { x: 0.59, y: 0.20, color: '#ffaa44', radius: 175 },
      { x: 0.89, y: 0.44, color: '#ffaa44', radius: 175 },
      { x: 0.79, y: 0.86, color: '#ff8024', radius: 165 },
      { x: 0.24, y: 0.76, color: '#ff8024', radius: 155 },
    ],
    props: [
      { type: 'dragon_pillar', x: 0.28, y: 0.36 },
      { type: 'incense_cauldron', x: 0.71, y: 0.35 },
      { type: 'dragon_pillar', x: 0.28, y: 0.71 },
      { type: 'dragon_pillar', x: 0.72, y: 0.71 },
    ],
    spawns: [
      { type: 'tiger_vanguard', x: 0.58, y: 0.50 },
    ],
  },
];



