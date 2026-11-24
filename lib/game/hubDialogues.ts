// ============================================================================
// VAITARANI HUB TEXT-BASED NPC DIALOGUE SYSTEM (SAVITRI & LOHAKARA)
// Pure dialogue trees with branching RPG choices, lore, combat omens,
// voice bark triggers, and direct Forge / Ferry Crossing actions.
// ============================================================================

export type HubNpcId = 'savitri' | 'lohakara';

export type HubDialogueAction =
  | 'next'
  | 'close'
  | 'open_forge'
  | 'enter_charnel_plains';

export interface HubDialogueChoice {
  id: string;
  label: string;
  sublabel?: string;
  action: HubDialogueAction;
  nextNodeId?: string;
}

export interface HubDialogueNode {
  id: string;
  npcId: HubNpcId;
  speakerName: string;
  speakerTitle: string;
  sanskritTag: string;
  accentHex: string;
  portraitUrl: string;
  voiceBarkKey?: 'savitri_hub' | 'smith_welcome' | 'smith_temper';
  text: string;
  choices: HubDialogueChoice[];
}

const SAVITRI_PORTRAIT = '/assets/aistudio/Gemini_Generated_Image_3ay6rk3ay6rk3ay6.png';
const LOHAKARA_PORTRAIT = '/assets/aistudio/Gemini_Generated_Image_d647kwd647kwd647.png';

export const HUB_DIALOGUE_NODES: Record<string, HubDialogueNode> = {
  savitri_root: {
    id: 'savitri_root',
    npcId: 'savitri',
    speakerName: 'Savitri',
    speakerTitle: 'Ferry-Keeper of the Vaitarani Shore',
    sanskritTag: 'सावित्री · KEEPER OF THE ASH LANTERN',
    accentHex: '#f2c45a',
    portraitUrl: SAVITRI_PORTRAIT,
    voiceBarkKey: 'savitri_hub',
    text: 'The ash tide slows when you carry a living vow, Rudra. Beyond the northern torana lie eight sealed halls of the Kurukshetra ossuary—and the war-drums of Dundubhi already shake the river stones.',
    choices: [
      {
        id: 'ask_chambers',
        label: 'What awaits beyond the Charnel Gate?',
        sublabel: 'Act I Omen & Boss Counsel',
        action: 'next',
        nextNodeId: 'savitri_omens',
      },
      {
        id: 'ask_susanoo',
        label: 'Speak of the Kala-Bhairava mantle & Water Flux.',
        sublabel: 'Combat Arts Guidance',
        action: 'next',
        nextNodeId: 'savitri_arts',
      },
      {
        id: 'cross_now',
        label: 'Row me across to the Charnel Plains.',
        sublabel: 'Begin Act I · Chamber I',
        action: 'enter_charnel_plains',
      },
      {
        id: 'leave_savitri',
        label: 'I will walk the shore a moment longer.',
        action: 'close',
      },
    ],
  },
  savitri_omens: {
    id: 'savitri_omens',
    npcId: 'savitri',
    speakerName: 'Savitri',
    speakerTitle: 'Ferry-Keeper of the Vaitarani Shore',
    sanskritTag: 'प्रथम अंक · ACT I OMEN',
    accentHex: '#f2c45a',
    portraitUrl: SAVITRI_PORTRAIT,
    text: 'In Chamber II stands the Bloodforge Temple Guardian behind his molten aegis. In Chamber IV, Dundubhi charges blindly—lure his bronze horns into the stone pillars to shatter his guard. And in Chamber VIII waits Vrikodara, whose iron belly drinks the air itself.',
    choices: [
      {
        id: 'back_savitri_1',
        label: 'Speak of the combat arts instead.',
        action: 'next',
        nextNodeId: 'savitri_arts',
      },
      {
        id: 'cross_after_omen',
        label: 'Then let the drums answer. Take me to Chamber I.',
        action: 'enter_charnel_plains',
      },
      {
        id: 'close_omen',
        label: 'I will remember the pillars.',
        action: 'close',
      },
    ],
  },
  savitri_arts: {
    id: 'savitri_arts',
    npcId: 'savitri',
    speakerName: 'Savitri',
    speakerTitle: 'Ferry-Keeper of the Vaitarani Shore',
    sanskritTag: 'अस्त्र विद्या · ASTRAL ARTS',
    accentHex: '#38bdf8',
    portraitUrl: SAVITRI_PORTRAIT,
    text: 'Unleash [4] Constant Flux to drag clustered rakshasas into a crushing tidal dragon—it finishes wounded foes instantly. Press [Q] Agni to split stone with solar pillars, and invoke [Z] Kala-Bhairava Susanoo when surrounded: walk calmly inside its armored flame while its giant spectral blows cleave the hall.',
    choices: [
      {
        id: 'go_forge_hint',
        label: 'Visit Lohakara at the Parashu Forge.',
        sublabel: 'Open Forge & Upgrades',
        action: 'open_forge',
      },
      {
        id: 'cross_after_arts',
        label: 'Cross to the Charnel Plains now.',
        action: 'enter_charnel_plains',
      },
      {
        id: 'close_arts',
        label: 'Thank you, Savitri.',
        action: 'close',
      },
    ],
  },

  lohakara_root: {
    id: 'lohakara_root',
    npcId: 'lohakara',
    speakerName: 'Lohakara',
    speakerTitle: 'Molten Forge Titan · Keeper of the Parashu',
    sanskritTag: 'लोहकार · MASTER OF BLOODFORGED BRONZE',
    accentHex: '#ff7a33',
    portraitUrl: LOHAKARA_PORTRAIT,
    voiceBarkKey: 'smith_welcome',
    text: 'Hah! Still breathing ash and iron, exile? Bring your Parashu to my anvil. Every rakshasa you cleave feeds Ashen Karma into the coals—let me hammer new edge, flame, and endurance into your axe before the horned warlords test it.',
    choices: [
      {
        id: 'open_forge_now',
        label: 'Temper my Parashu & choose chamber.',
        sublabel: 'Open Lohakara’s Forge & Upgrades',
        action: 'open_forge',
      },
      {
        id: 'ask_parashu_lore',
        label: 'Tell me about the Bloodforge warlords.',
        sublabel: 'Forge Lore & Tactics',
        action: 'next',
        nextNodeId: 'lohakara_lore',
      },
      {
        id: 'leave_smith',
        label: 'Not yet, smith. Keep the coals hot.',
        action: 'close',
      },
    ],
  },
  lohakara_lore: {
    id: 'lohakara_lore',
    npcId: 'lohakara',
    speakerName: 'Lohakara',
    speakerTitle: 'Molten Forge Titan · Keeper of the Parashu',
    sanskritTag: 'अग्नि कुण्ड · SMITH’S COUNSEL',
    accentHex: '#ff7a33',
    portraitUrl: LOHAKARA_PORTRAIT,
    voiceBarkKey: 'smith_temper',
    text: 'I forged half the shields those temple wardens hide behind—and I know every fracture in their bronze. Break their posture with [RMB] Heavy Cleaves or [Q] Agni solar eruptions, then punish while the metal glows red. Ready to temper steel?',
    choices: [
      {
        id: 'open_forge_after_lore',
        label: 'Hammer the blade—open the Forge.',
        sublabel: 'Upgrades & 8-Chamber Warp',
        action: 'open_forge',
      },
      {
        id: 'close_smith_lore',
        label: 'I’ll return with more Karma.',
        action: 'close',
      },
    ],
  },
};

export function getInitialDialogueNode(npcId: HubNpcId): HubDialogueNode {
  return npcId === 'savitri'
    ? HUB_DIALOGUE_NODES.savitri_root
    : HUB_DIALOGUE_NODES.lohakara_root;
}

export function resolveDialogueChoice(
  currentNode: HubDialogueNode,
  choiceId: string
): { action: HubDialogueAction; nextNode: HubDialogueNode | null } {
  const choice = currentNode.choices.find((c) => c.id === choiceId);
  if (!choice) {
    return { action: 'close', nextNode: null };
  }
  if (choice.action === 'next' && choice.nextNodeId && HUB_DIALOGUE_NODES[choice.nextNodeId]) {
    return {
      action: 'next',
      nextNode: HUB_DIALOGUE_NODES[choice.nextNodeId],
    };
  }
  return {
    action: choice.action,
    nextNode: null,
  };
}
