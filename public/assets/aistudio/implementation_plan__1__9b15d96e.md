# Kaliyuga: The Bleeding Crown — Master Vertical Slice Implementation Plan

This master plan synthesizes all six canonical project documents—**The Full Story & Game Design (v7 Bible)**, **The Complete Vertical Slice Gameplay Design**, **The Consolidated Creative Vision & Repository Audit**, and the three **Supergiant *Hades* Development, Combat & VFX Case Studies**—with a line-by-line audit of the current codebase to deliver a release-grade, 60 FPS 2.5D isometric action roguelite vertical slice.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> All core gameplay, narrative, and production decisions from your documents and Phase 1 clarifications are locked into this plan:

- **Confirmed Decision 1 — The Five Creative Pillars Protected in Code**: Every system serves **(1) LOOK** (one-button optional inspection with room-tone silence that plants narrative seeds and changes the ending), **(2) Every Boss Mirrors Rudra** (Dundubhi’s safety drum, Vrikodara’s starving forgiveness), **(3) Visible Power Costs** (death and rage dim Savitri’s lantern across 3 light states; Ashen Karma is the currency of guilt), **(4) Restraint** (stamina/posture discipline, the Narayanastra cease-attack trial, and unpunished silence on the Ferry), and **(5) Accountability** (Sanjaya’s live on-screen strikethrough corrections).
- **Confirmed Decision 2 — Unified `Q / E / R` Astras × 3 Stances (9 Variants) + Valmiki Ramayana *Upasamhara* Withdrawal**: Replace prototype Wukong/AC spells (clones, time-rewind, blink) with **Agneyastra (`Q`)**, **Vayavyastra (`E`)**, and **Vajrastra (`R`)**, powered by a single combat-earned **Astra Invocation Meter (0–100)** and supporting second-press early **Withdrawal (`Upasamhara`)**.
- **Confirmed Decision 3 — Hybrid 2.5D Visual Pipeline (*Hades* Production Discipline)**: **3D Rudra** (integrated via an ink-contour & shadow-mass shader pass) + **2D Hand-Painted Regular Enemies** (15 sprite sheets normalized to uniform stature) + **3D/2D Bosses (Dundubhi & Vrikodara)** fighting across **5-Layer Hand-Painted 2.5D Isometric Chambers**.
- **Confirmed Decision 4 — Two-Stage Execution Priority**: **Stage A** perfects **Chamber 1 (*Vaitarani Ferry Ghat*) + Savitri’s Boat Hub** until 5 minutes of core combat feels unmistakably *Hades*-grade; **Stage B** completes the full **30–60 minute Act I Vertical Slice** (5-Scroll Prologue → 4-Scene Playable Opening → Boat Hub → Branching Charnel Plains Chambers + Narayanastra Trial → Dundubhi → Vrikodara → Shard #1 Memory & Correction #1 → Ferry I Crossing).

---

## 1. Comprehensive Codebase Audit & Structural Refactor Strategy

Our audit of the current repository confirms that ~60–75% of the raw mechanics exist, but several structural bottlenecks and prototype leftovers prevent it from feeling like a cohesive commercial release:

| Audit Finding | Current Codebase State | Why It Blocks Release Quality | Planned Engineering Fix |
| :--- | :--- | :--- | :--- |
| **1. Monolithic Arena Component** | `KaliyugaArena.tsx` is **9,846 lines** handling input, physics, AI, 3D/2D rendering, audio, narrative, and HUD in one file. | Difficult to tune frame-accurate input buffering, hit-stop, and chamber state transitions without side effects. | Refactor into clean, decoupled domain engines: `rudraCombatEngine`, `astraInvocationEngine`, `enemyCoordinatorAI`, `chamberStateMachine`, `vfxEventController`, and `cleanHudOverlay`. |
| **2. Legacy Wukong / Prototype Identifiers** | Code still uses `jingu_bang`, `twin_blades`, `dragon_glaive`, `wolf_guai`, `fire_monk`, `stone_golem`, `xuemo`, `nezha_*`, `erlang_*`, `guanyin_*`. | Breaks project identity and causes confusion between weapon aspects, stances, and enemy archetypes. | Rename all internal/external identifiers to canonical **Kaliyuga v7** terms (`broken_gada`, `charnel_grunt`, `spear_wraith`, `guardian`, `rakshasa_brute`, `dundubhi`, `vrikodara`, `raktabeeja_*`, `shumbha_*`). |
| **3. Overlapping Resource & Spell Clutter** | 8+ meters on screen (Focus Orbs, Dash Charges, Immobilize, Clones, Transform, Kala-Rewind, Shadow Blink, Party Companion Link, DMC Style Rank). | Violates Section 10 & Section 33 ("four main resources: Health, Stamina, Astra Energy, Ashen Karma + Savitri’s Lantern"). | Strip out clones, rewind, blink, party companions, and DMC style ranks. Unify around **Health**, **Stamina**, **Astra Energy**, **Ashen Karma**, and **Savitri’s Corner Lantern**. |
| **4. 3D Rudra vs. 2D World Integration** | Rudra renders from a 3D FBX buffer while enemies use 2D sprite sheets and floors use 2D paintings. | Without unified ink outlines, tonal grading, and `0.58Y` contact shadows, 3D and 2D elements look like separate layers. | Apply a **Mignola Ink-Edge & Rim-Light Canvas Pass** to Rudra’s 3D render buffer and enforce identical dual-layer foot occlusion shadows (`scaleY = 0.58`) across all 3D and 2D actors. |
| **5. Uncoordinated Enemy Swarming** | Enemies independently pathfind and attack at the same time; shield-bearers don't block frontal light swings. | Creates unreadable overlapping telegraphs and fails to teach distinct combat lessons. | Implement the **4-Role Enemy Architecture** + **Group Attack Slot Coordinator** (`1 Melee + 1 Ranged + 1 Heavy` active attack token limit) + horizontal flank-slot pathfinding. |
| **6. Heavy Asset Load & Memory Footprint** | Multiple large textures, FBX models, and 15 high-res sprite sheets load eagerly. | Causes initial browser load stalls and memory pressure. | Lazy-load boss 3D rigs and late-chamber backgrounds per stage, downscale multi-row sheets with nearest-neighbor precision, and cap particle/decal pools for locked **60 FPS at 1080p**. |

---

## 2. Applying Supergiant’s *Hades* Production Architecture to *Kaliyuga*

### 2.1 Five-Layer Handcrafted Chamber Architecture (Eduardo Gorinstein Pipeline)
Rather than random procedural room generation, each chamber uses an authored 5-layer spatial composition where gameplay geometry is locked first and dressed with layered artwork:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                5-LAYER 2.5D ISOMETRIC CHAMBER RENDERING PIPELINE                  │
├───────────────────────────────────────────────────────────────────────────────────┤
│ LAYER 5: FOREGROUND PARALLAX & SAVITRI LANTERN VIGNETTE                           │
│   • Top/corner temple chains, shattered archways (1.12x parallax shift)           │
│   • Savitri's Lantern color temperature grading (Warm Ochre / Dim Amber / Cool)   │
├───────────────────────────────────────────────────────────────────────────────────┤
│ LAYER 4: EVENT-DRIVEN COMBAT VFX (4-Tier Readability Hierarchy)                   │
│   • P0 Highest: Enemy Telegraphs (Gold Parry Starburst / Crimson Unparryable Zone)│
│   • P1 High:    Directional Ink-Gold Slash Trails, White-Hot Hit Flash, Hit-Stop  │
│   • P2 Medium:  Astra Invocations (Agneyastra Fire, Vayavyastra Wind, Vajra Bolt) │
│   • P3 Low:     Subtle drifting Kurukshetra ash motes & brazier embers            │
├───────────────────────────────────────────────────────────────────────────────────┤
│ LAYER 3: Y-SORTED ACTORS & INTERACTIVE ARENA PROPS (Sorted by footY)              │
│   • 3D Rudra (with Mignola Ink-Contour & Brow Scar Glow)                          │
│   • 2D Regular Enemies (4 Roles in Horizontal Left/Right Flank Slots)             │
│   • 3D/2D Bosses (Dundubhi & Vrikodara)                                           │
│   • Destructible Chola Pillars, Braziers, Urns, and [F] Look Story Artifacts      │
├───────────────────────────────────────────────────────────────────────────────────┤
│ LAYER 2: ORTHOGRAPHIC 2.5D FLOOR PROJECTION (ISO_Y_SCALE = 0.58)                  │
│   • Dual-layer Foot Contact Shadows (Soft Ambient Ellipse + Hard Heel Occlusion)  │
│   • Perspective-squashed (0.58y) Presence Rings, Molten Slag Fissures & Traps     │
├───────────────────────────────────────────────────────────────────────────────────┤
│ LAYER 1: HAND-PAINTED 2D CHAMBER ART & COLLISION POLYGON                          │
│   • Ash-black, bone-white, sindoor-red, and antique-bronze painted temple stone   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Four-Tier Visual Hierarchy & Color Separation (Josh Barnett VFX Principles)
To guarantee that fights remain 100% legible even during intense multi-enemy waves:
1. **Backgrounds Stay Dark & Desaturated (60% Canvas)**: Ash-grey (`#161316`), charred basalt (`#0c090b`), muted ochre stone, and deep shadows.
2. **Structural UI & Props Use Antique Bronze & Bone (30% Surface)**: Chola brass (`#c89d46`), bone parchment (`#f5ebd6`), and iron silhouettes.
3. **High-Contrast Bright Colors Reserved Strictly for Gameplay Cues (10% Accent)**:
   - **Parryable Enemy Attack**: Bright **White-Gold 4-Point Star Glint (`#fff3a1`)** on the enemy’s weapon tip during windup (`Stage 1: Preparation` → `Stage 2: Brightening Imminent Flash` → `Stage 3: Active Strike`).
   - **Unparryable Heavy / Boss Attack**: High-contrast **Sindoor Crimson-White Border (`#ff2a3a`)** on the `0.58Y` floor zone.
   - **Astra Elemental Signatures**:
     - **Agneyastra (`Q`)**: Searing Saffron-Crimson Fire (`#ff5e2b`) + black ink smoke curls.
     - **Vayavyastra (`E`)**: Razor Jade-Teal Wind Crescents (`#3ee0a8`) + dust vortex.
     - **Vajrastra (`R`)**: Angular Bone-White & Indra-Cyan Lightning Arcs (`#5ce6ff`).

### 2.3 Event-Driven VFX & 3-Tier Impact Feedback Loop
Every combat effect is triggered by authoritative gameplay state transitions (never blindly tied to animation frames if an attack misses):
- **`PlayerAttackStarted`**: Renders stance-specific directional ink-and-bronze weapon ribbon (`thin fast curve` for Thrust, `wide 270° crescent` for Pillar, `heavy broad smear` for Smash).
- **`PlayerAttackHit` (3 Impact Levels)**:
  - *Level 1 (Light Hit)*: `28ms` micro hit-stop, bone-white contact spark, `±3px` target recoil jitter, crisp blade-flesh audio transient.
  - *Level 2 (Heavy / Combo Finisher)*: `58ms` hit-stop, crimson-gold directional burst, ground dust puff, `0.35` controlled camera impulse.
  - *Level 3 (Perfect Parry / Posture Break / Execution)*: `95ms` dramatic freeze, expanding Chola-bronze shock ring, high-contrast silhouette flash, and resonant temple gong / metallic clang.

### 2.4 Adaptive Indian Mythological Audio Engine (Darren Korb Principles)
- **Exploration / Pre-Wave**: Low tanpura drone, wind across ash, and distant temple bells.
- **Active Combat Waves**: Layered percussion (`mridangam` / `ghatam` / war-drums) fades in dynamically and escalates on Wave 2.
- **Chamber Cleared**: Percussion cuts instantaneously on the final blow’s slow-motion kill-cam, leaving a resonant bronze bell decay.
- **`[F]` Look Moments (v7 Section 35 Rule)**: **All music fades to complete silence** while inspecting a Look object—only room tone (wind/water) plays so the observation carries weight.
- **Savitri’s Ferry Hub**: Only a soft tanpura drone and black water lapping against timber.
- **Suvarna’s Lullaby**: A quiet solo melodic motif that hums faintly when approaching Shard #1 or reading Nachiketa’s ledger leaf.

---

## 3. Complete Gameplay & Narrative Systems Specification

### 3.1 Rudra’s Controls, Stamina, Parrying, Posture & 3 Stances
- **Remappable Control Scheme (Default PC + First-Class Gamepad)**:
  - `WASD` / `Left Stick`: 8-directional movement with responsive input buffering after dashes and attacks.
  - `Left Click` / `X (Square)`: **Light Attack** (0 Stamina cost; 3-hit combo chain; transitions cleanly into Heavy or Dodge).
  - `Right Click` / `Y (Triangle)`: **Heavy Attack** (Tap for posture-breaking strike; **Hold to Charge** for armored shield-shatter and molten fissure waves when Rakshasa Stance is unlocked).
  - `Space` / `RT (R2)`: **Dodge** (`25 Stamina` cost; `0.24s` invulnerability frames; directional dash-through; links into **Dash-Strike**).
  - `Shift` (or `MMB`) / `LB (L1)`: **Parry / Guard** (`0.26s` Perfect Parry window before impact deflects 100% damage, unbalances the enemy, deals heavy posture damage, and grants `+28 Astra Energy`; mistimed early press holds a Standard Guard that blocks 70% damage at a Stamina cost).
  - `1 / 2 / 3` or `Tab` / `RB (R1)`: **Cycle Stance** (`Smash` ⇄ `Pillar` ⇄ `Thrust`).
  - `Q / E / R` / `D-Pad / Face Combo`: **Invoke Astra 1 (`Agneyastra`), Astra 2 (`Vayavyastra`), Astra 3 (`Vajrastra`)**—or press again to **Withdraw (`Upasamhara`)**.
  - `F` / `A (Cross)`: **Context Action** — **Execute** a Staggered (Posture-Broken) enemy, **Look** at a story object (pauses nothing in combat!), or **Interact** with rewards/hub stations.
  - `H` (or `C`): **Amrita Kalasha Sip** (limited healing charges; restored only at Soul Chambers or upgraded at the Shrine).
  - `Esc`: **Pause / Combat Guide / Settings** (includes **"Story Difficulty"** toggle with +40% Health and wider Dodge/Parry windows per v7 Section 33).

- **Dual Enemy Bars: Health & Posture (`Section 2.7`)**:
  - Every enemy and boss has a **Health Bar** (crimson) and a **Posture Bar** (gold/amber) directly beneath it.
  - Posture fills/breaks via **Heavy Attacks**, **Perfect Parries**, **Striking an Enemy During Recovery**, and **Vajrastra**.
  - When Posture reaches its limit, the enemy enters a **Staggered State** with a glowing **`[F] EXECUTE`** prompt for a high-damage cinematic finisher.

### 3.2 The Three Stances & Nine Astra × Stance Interactions (`Sections 3 & 4`)

| Stance Identity | Light & Heavy Combat Behavior | `[Q] Agneyastra` (Fire / Area) | `[E] Vayavyastra` (Wind / Control) | `[R] Vajrastra` (Lightning / Precision) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Smash Stance** (*Break the Enemy*) | Slow, crushing overhead blows (`1.45×` Posture damage). **Breaks Guardian shields** and interrupts Rakshasa Brutes. | **Explosive Fire Impact**: Meteoric Gada slam creating a 4s burning crater. | **Outward Shockwave**: Radial gale blasting enemies back and interrupting windups. | **Thunder Ground Strike**: Sky-bolt slam shattering all nearby armor & posture. |
| **2. Pillar Stance** (*Control the Fight*) | Wide `300°` sweeping arcs & vaulting heavy slam (immune to ground quakes). **Strongest Parry counterattack**. | **Circular Fire Eruption**: 360° ring of sacred fire scorching surrounding groups. | **Defensive Wind Ring**: 5s orbiting cyclone that deflects projectiles & pushes foes. | **Defensive Lightning Counter**: Instant radial arc that stuns all close attackers. |
| **3. Thrust Stance** (*Precision & Speed*) | Fast, long-reach linear lunges (`245px`). **1.35× bonus damage against enemies in Recovery**. | **Forward Fire Wave**: Narrow, long-range blazing fissure piercing a line of foes. | **Forward Wind Blast**: High-velocity gust corridor that pulls enemies into a line. | **Focused Piercing Strike**: Pinpoint thunder-javelin dealing massive single-target boss posture damage. |

- **Astra Energy Generation & Withdrawal (`Upasamhara`)**:
  - **Energy Gains**: Light Hit `+4`, Heavy Hit `+12`, Perfect Dodge `+14`, Perfect Parry `+28`, Posture Execution `+30`, Taking Damage `+0`. Energy persists across chambers within a run.
  - **Withdrawal (`Upasamhara`)**: While a persistent Astra zone (*Burning Ground* or *Defensive Wind Ring*) is active, pressing `Q` or `E` a second time withdraws the divine weapon early—detonating a clean parting burst and refunding `+10 Astra Energy`.

### 3.3 Four Functional Enemy Archetypes & Group Coordination (`Section 5`)
All 15 uploaded sprite sheets are mapped into four distinct tactical problems governed by the **Group Attack Coordinator**:
1. **Charnel Grunt (Basic Melee — *Vetala Revenants*)**: *Ghoul, Undead Warrior, Naga Warrior*.
   - Approaches horizontal flank slots; fast 2-hit combos; interrupted by Rudra’s light attacks; teaches spacing and Pillar Stance crowd control.
2. **Spear Wraith (Ranged — *Preta Harassers*)**: *Bronze Spearman, Undead Archer, Hooded Mage*.
   - Keeps distance near arena edges; repositions when approached; projects a bright linear warning before firing; vulnerable during reload recovery; teaches Thrust Stance gap-closing and Vayavyastra projectile deflection.
3. **Guardian (Defensive — *Chola Shield-Bearers*)**: *Fantasy Knight, Horned Minotaur Warrior, Horned Warrior*.
   - Actively **blocks frontal Light Attacks** with a raised shield (producing bronze sparks and 0 damage). Must be cracked with **Smash Stance Heavy Attacks**, **Perfect Parries**, **Vajrastra**, or **Backstab Dodges**.
4. **Rakshasa Brute (Heavy — *Siege Enforcers*)**: *Ogre Warrior, Demonic Ogre, Molten Golem, Kabandha Monster, Undead Monster*.
   - High Health and Posture; uninterruptible hyper-armor during crimson area slams; long `1.25s` recovery windows that teach patience and heavy punish timing.

### 3.4 Complete Vertical Slice Story & Encounter Flow (`v7 Section 21` + `Gameplay Spec Sections 6–14`)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│               COMPLETE ACT I VERTICAL SLICE PROGRESSION FLOW                      │
└───────────────────────────────────────────────────────────────────────────────────┘
  [1. PROLOGUE: FIVE PAINTED SCROLLS] (Dark Gold & Ash Brushwork + Sanjaya V.O.)
      ├── Scroll I:   The Churning (Samudra Manthan, Mohini, Rahu)
      ├── Scroll II:  The Child & The Mani (Suvarna's Soul Anchor)
      ├── Scroll III: The Two Brothers (Nachiketa & the Bandaged Sparrow)
      ├── Scroll IV:  The Lesson ("A weapon does not ask. It strikes.")
      └── Scroll V:   The Fall of the Father (Shukracharya's Sanjivani Bargain)
                              │
                              ▼
  [2. PLAYABLE OPENING: THE NIGHT OF ASH (~3 Minutes, Skippable on Replay)]
      ├── Scene A: The Rampage at Heaven's Gate (Pure power, no posture bar)
      ├── Scene B: The Flashback Hill (Look prompt disabled; the hill is a wall)
      ├── Scene C: Unwinnable Duel vs. The Preserver (Kaala-Chakra falls BEFORE
      │            the Preserver's hand moves; "Rudra. Go and look." Mani shatters)
      └── Scene D: Black Screen → Savitri's Lantern ("Get up. You owe a lot of people.")
                              │
                              ▼
  [3. HUB: SAVITRI'S BOAT ON THE VAITARANI] (3 Lantern Light States: Warm / Dim / Cool)
      ├── Inspect Folded Ledger Page in Lantern Base ([F] Look Seed #0)
      ├── Homa Shrine (6 Permanent Ashen Karma Upgrades) & Astra Selection Pedestal
      ├── Previous Run Summary Board & Sanjaya's Chronicle / Look Journal
      └── Step onto the Charnel Plains Gangplank
                              │
                              ▼
  [4. ACT I: THE CHARNEL PLAINS — BRANCHING CHAMBERS]
      ├── Chamber 1: Vaitarani Ferry Ghat (Grunts + Spear Wraiths + Look: Tally-Leaves)
      ├── Branching Choice (2–3 Exits): [Combat Chamber] | [Soul Healing] | [Shrine]
      ├── Chamber 2: Chariot Pyre (Add Guardians + Look: Child's Clay Lamp & Sparrow)
      ├── Branching Choice: [Elite Chamber] | [Astra Chamber] | [Narayanastra Trial]
      ├── Chamber 3: Mandapa Threshold (Coordinated 4-Role Wave + Look: Vetala Drum Armor)
      ├── Chamber 4: MINI-BOSS — DUNDUBHI (2 Phases + 4 Destructible Pillars + Spiral Mark)
      ├── Chamber 5–7: Inner Charnel Gauntlet (Rakshasa Brutes + Optional Trial + Healing)
      └── Chamber 8: WARDEN BOSS — VRIKODARA (2 Phases: Vacuum Pull, Molten Slag, Consume)
                              │
                              ▼
  [5. ACT I CLIMAX & RETURN]
      ├── Claim Shard #1 → Healer's Tent Memory ("That could be any camp." / "It could.")
      ├── Sanjaya Live Strikethrough Correction #1: ~~the fortress of killers~~ → a camp
      ├── Power Unlocked: Rakshasa Crushing Stance (Smash Heavy sends molten fissures)
      └── Ferry I Crossing: Savitri's Sparrow Story (3 Choices: Silence / Ask Ila / Apologize)
          └── Returns to Savitri's Boat Hub (Progress Saved, Ready for Next Run)
```

---

## 4. Eight-Phase Engineering Roadmap

1. **Phase 1 — Modular Refactor & Rudra Core Combat Stabilization**:
   - Extract combat, Astra, AI, and HUD logic out of `KaliyugaArena.tsx` into clean modules; rename all Wukong identifiers to canonical Kaliyuga names.
   - Lock the Section 2.1 input map (`WASD`, `LMB`, `RMB` Hold-Charge, `Space` Stamina Dodge, `Shift` Parry/Guard, `1/2/3` Stance Switch, `F` Execute/Look/Interact) with input buffering and 3 distinct Stance combat profiles.
2. **Phase 2 — 4-Role Enemy AI, Shield Blocking & Group Coordinator**:
   - Wire *Charnel Grunt*, *Spear Wraith*, *Guardian* (with active frontal light-attack shield deflection), and *Rakshasa Brute* behaviors, horizontal flank-slot positioning, and the 3-token Group Attack Coordinator.
3. **Phase 3 — Unified Astra System (`Q / E / R` × 3 Stances + Withdrawal)**:
   - Implement the 0–100 combat-fed Astra Invocation Meter, all 9 Stance × Astra manifestations for `Agneyastra`, `Vayavyastra`, and `Vajrastra`, and second-press **Astra Withdrawal (`Upasamhara`)**.
4. **Phase 4 — Chamber State Machine, Branching Doors, `[F]` Look & Narayanastra Trial**:
   - Enforce `Entering → Active → Wave Complete → Cleared → Rewarded → Exit Open`, physical reward altar collection, 2–3 branching room doors (`Combat`, `Elite`, `Astra`, `Shrine`, `Soul`, `Narayanastra Trial`), and room-tone silence during `[F]` Look inspections.
5. **Phase 5 — Dundubhi Mini-Boss Polish (2 Phases + Interactive Pillars)**:
   - Refine Dundubhi’s 2-phase moveset (*Head Charge*, *Ground Slam*, *Horn Sweep*, *Stomp*, *Rage Charge*), 4 destructible Kurukshetra pillars with trajectory lock cues, 3-second tusk-lodge stun window, drumbeat skeleton summons, and Savitri’s post-fight spiral-mark dialogue.
6. **Phase 6 — Vrikodara Warden Boss Polish (2 Phases + Consume + Shard #1)**:
   - Refine Vrikodara’s 2-phase moveset (*Furnace Breath*, *Devouring Pull*, *Ground Eruption*, *Pillar Strike*, *Ash Burst*, and interruptible *Consume*), followed by the **Shard #1 Healer’s Tent Memory**, **Sanjaya Correction #1**, and **Rakshasa Crushing Stance** unlock.
7. **Phase 7 — Playable Savitri’s Boat Hub, Ferry I, Boons & Versioned Save System**:
   - Build the playable 2.5D Vaitarani Boat Hub (`chamberId = 0`) with Savitri’s 3-state Lantern, Run Summary board, Homa Shrine, Astra Pedestal, Look Journal, the **4-Scene Playable Opening** (Heaven’s Gate Rampage → Flashback Hill → Unwinnable Preserver Duel → Lantern Awakening), and **Ferry I Crossing**.
8. **Phase 8 — HUD Unification, Event-Driven VFX Polish & 60 FPS Release Audit**:
   - Replace multi-meter HUD clutter with the clean 4-resource HUD (`Health`, `Stamina`, `Astra Energy`, `Ashen Karma` + corner **Savitri Lantern** + `Q/E/R` Astra dock), add the 4 Status Effects (`Burning`, `Soaked`, `Staggered`, `Marked`), and verify 60 FPS production build performance.

---

## 5. Complete Asset Audit & What Assets We Need From You

### 5.1 Assets Already Present in the Repository (Ready to Use)
- **Player & Boss 3D Rigs**: Rudra (`Meshy_AI_Ashen_Warborn_biped`), Dundubhi (`Meshy_AI_Runebound_Minotaur_Warlord`), Vrikodara (`Meshy_AI_Crimson_Skull_Warlord_biped` + `Bloodforged_Trident`).
- **15 Multi-Row 2D Enemy & Boss Sprite Sheets**: All 15 green-screen sprite sheets uploaded in `/public/assets/aistudio/` are calibrated and mapped across the 4 enemy roles and 2 bosses.
- **10 Hand-Painted 2.5D Chamber Arenas, 5 Prologue Scroll Paintings, 1 Shard #1 Healer’s Tent Painting, 7 Character Portraits, 6 Orchestral/Vedic Metal Tracks, and Destructible Pillar/Boat Props**.

### 5.2 Specific Assets You Can Provide to Reach 100% Final Commercial Polish
> [!NOTE]
> **Every single feature in this plan will work immediately using our procedural canvas/WebGL shaders, existing 3D/2D assets, and Web Audio synthesis.** However, to match the exact visual and audio fidelity described in your **v7 Bible (Sections 34–35)** and **Consolidated Vision (Sections 4.3–4.5)**, here is the complete checklist of bespoke assets you can supply:

1. **Updated 3D Rudra GLB/FBX Model + Parashu / Broken Gada Mesh (Matching Section 4.3 & 4.4 Spec)**:
   - *Why*: Your spec defines Rudra with **ash-covered bronze skin, a hollow scarred forehead wound (no gem), white Vibhuti chest markings, an oxidized Chola-bronze left pauldron, a dark crimson dhoti above the knees**, and the **Broken Iron Gada stamped with the spiral mark** (or **Crescent Parashu**). Providing this final `.glb` / `.fbx` (or a matching 8-direction / side-view 2D sprite sheet if you prefer 2D Rudra) will lock his canonical silhouette.
2. **Bespoke 3D or High-Res 2D Boss Assets for Dundubhi & Vrikodara (Matching Section 4.5 Spec)**:
   - **Dundubhi**: Bronze buffalo demon with low crescent horns, temple chains, iron nose ring with smoke, and a **bronze war-drum built into his chest stamped with the coiled spiral mark**.
   - **Vrikodara**: Starving, ash-grey Rakshasa with exposed ribs, burn scars, white hair, a **glowing abdominal furnace**, and a **chained broken temple pillar** (no chest crystal).
3. **Two Opening Sequence Environment Backdrops (`16:9` Hand-Painted 2.5D)**:
   - **Scene 1 — Burning Gate of Amaravati / Heaven’s Rampage**: White marble and gold split by white Brahmashira fire.
   - **Scene 2 — The Night of Ash Hilltop**: Looking down 200 paces at the dark Shishira citadel with a hundred tiny clay-lamp windows and washing lines.
4. **Savitri’s Boat Hub Full Environment Painting (`16:9` Isometric)**:
   - A dedicated dark, atmospheric painting of **Savitri’s weathered timber ferry moored in the black Vaitarani mist**, with space on deck for the Homa Brazier, Astra Pedestal, Chronicle Scroll Table, and Savitri’s Lantern at the prow.
5. **Suvarna’s Lullaby & Traditional Instrument Audio Stems (`.mp3` / `.ogg`)**:
   - **Suvarna’s Lullaby**: A 20–30 second solo female hum or *sarangi* melody (used in Shard #1, the Mani’s hum, and Ferry crossings).
   - **Dundubhi’s War-Drum Stem**: A rhythmic temple drum loop (`dundubhi` / `chenda`) that plays when Dundubhi charges and recurs slowed-down in the Furnace.
   - **Voiceover Clips (Optional)**: Recorded lines for **Savitri**, **Rudra**, **Sanjaya**, **Vrikodara**, and **The Preserver’s** single line (*“Rudra. Go and look.”*).
6. **Three Astra HUD Icons (`128×128` Transparent PNGs)**:
   - Ink-and-gold icons for **Agneyastra** (Fire), **Vayavyastra** (Wind), and **Vajrastra** (Thunderbolt).
